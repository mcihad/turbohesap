import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  AttendanceImportResultDto,
  AttendanceListQuery,
  AttendanceRecordDto,
  CheckinAreaSummary,
  CheckinResultDto,
} from '@turbohesap/shared'

import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { Employee } from './entities/employee.entity'
import { CheckinArea } from './entities/checkin-area.entity'
import { EmployeeCheckinArea } from './entities/employee-checkin-area.entity'
import { EmployeeCard } from './entities/employee-card.entity'
import { AttendanceRecord } from './entities/attendance-record.entity'
import type { CheckinDto, CreateAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto'
import type { AttendanceImportDto } from './dto/card.dto'
import { employeeNameMap, toAreaSummary, toAttendanceDto } from './hr-pdks.mappers'
import { deriveDedupKey, evaluateTimeWindows, localDowAndTime } from './hr-pdks.helpers'

interface AreaMatch {
  id: string
  name: string
  tol: number
  minacc: number
  require_inside: boolean
  allow_mock: boolean
  time_windows: { dow?: number[]; from: string; to: string }[]
  dist: number
  within: boolean
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(CheckinArea) private readonly areas: Repository<CheckinArea>,
    @InjectRepository(EmployeeCheckinArea) private readonly areaLinks: Repository<EmployeeCheckinArea>,
    @InjectRepository(EmployeeCard) private readonly cards: Repository<EmployeeCard>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  // ── mobile self check-in (geofence validation) ───────────────────────────────

  async checkin(user: AuthUser, dto: CheckinDto): Promise<CheckinResultDto> {
    const me = await this.employees.findOne({ where: { userId: user.sub, isActive: true } })
    if (!me) {
      throw new BadRequestException(
        'Giriş yapmak için kullanıcınızın bir personel kaydına bağlı olması gerekir',
      )
    }

    // Allowed areas: the employee's assigned areas, or ALL active areas if none.
    const assigned = (await this.areaLinks.find({ where: { employeeId: me.id } })).map((l) => l.areaId)
    const match = await this.nearestArea(dto.lng, dto.lat, assigned.length ? assigned : null)

    const flags: string[] = []
    let withinGeofence = false
    let withinTimeWindow = true
    let areaId: string | null = null
    let distance: number | null = null

    if (!match) {
      flags.push('no_area')
    } else {
      areaId = match.id
      distance = Math.round(match.dist * 100) / 100
      withinGeofence = match.within
      withinTimeWindow = this.isWithinWindows(match.time_windows)
      if (match.require_inside && !withinGeofence) flags.push('outside_area')
      if (!withinTimeWindow) flags.push('outside_window')
      if (dto.accuracyMeters != null && dto.accuracyMeters > match.minacc) flags.push('low_accuracy')
      if (dto.isMockLocation && !match.allow_mock) flags.push('mock_location')
    }

    const status = flags.length === 0 ? 'valid' : 'flagged'
    const record = this.records.create({
      employeeId: me.id,
      branchId: me.branchId,
      eventTime: new Date(),
      direction: dto.direction,
      method: 'mobile_gps',
      lat: dto.lat,
      lng: dto.lng,
      accuracyMeters: dto.accuracyMeters ?? null,
      geom: { type: 'Point', coordinates: [dto.lng, dto.lat] },
      areaId,
      distanceMeters: distance,
      withinGeofence,
      withinTimeWindow,
      isMockLocation: dto.isMockLocation ?? false,
      status,
      flagReason: flags.length ? flags.join(',') : null,
      cardNo: null,
      source: null,
      externalId: null,
      deviceInfo: dto.deviceInfo ?? null,
      shiftDayId: null,
      raw: null,
      createdById: user.sub,
      notes: dto.notes ?? null,
    })
    const saved = await this.records.save(record)
    const dtoOut = (await this.enrich([saved]))[0]
    return {
      record: dtoOut,
      accepted: status === 'valid',
      message: this.messageFor(status, flags, match?.name),
    }
  }

  // ── reads ────────────────────────────────────────────────────────────────────

  async list(query: AttendanceListQuery = {}): Promise<AttendanceRecordDto[]> {
    return this.enrich(await this.queryRecords(query))
  }

  async get(id: string): Promise<AttendanceRecordDto> {
    const r = await this.findOrFail(id)
    return (await this.enrich([r]))[0]
  }

  async mine(user: AuthUser, query: AttendanceListQuery = {}): Promise<AttendanceRecordDto[]> {
    const me = await this.employees.findOne({ where: { userId: user.sub, isActive: true } })
    if (!me) return []
    return this.enrich(await this.queryRecords({ ...query, employeeId: me.id }))
  }

  // ── manual entry ──────────────────────────────────────────────────────────────

  async create(dto: CreateAttendanceDto, user: AuthUser): Promise<AttendanceRecordDto> {
    const emp = await this.employees.findOne({ where: { id: dto.employeeId } })
    if (!emp) throw new NotFoundException('Personel bulunamadı')
    const hasGeo = dto.lat != null && dto.lng != null
    const record = this.records.create({
      employeeId: emp.id,
      branchId: emp.branchId,
      eventTime: new Date(dto.eventTime),
      direction: dto.direction,
      method: dto.method ?? 'manual',
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      accuracyMeters: null,
      geom: hasGeo ? { type: 'Point', coordinates: [dto.lng as number, dto.lat as number] } : null,
      areaId: dto.areaId ?? null,
      distanceMeters: null,
      withinGeofence: false,
      withinTimeWindow: false,
      isMockLocation: false,
      status: 'valid',
      flagReason: null,
      cardNo: null,
      source: null,
      externalId: null,
      deviceInfo: null,
      shiftDayId: null,
      raw: null,
      createdById: user.sub,
      notes: dto.notes ?? null,
    })
    return (await this.enrich([await this.records.save(record)]))[0]
  }

  async update(id: string, dto: UpdateAttendanceDto): Promise<AttendanceRecordDto> {
    const r = await this.findOrFail(id)
    if (dto.eventTime !== undefined) r.eventTime = new Date(dto.eventTime)
    if (dto.direction !== undefined) r.direction = dto.direction
    if (dto.method !== undefined) r.method = dto.method
    if (dto.lat !== undefined) r.lat = dto.lat ?? null
    if (dto.lng !== undefined) r.lng = dto.lng ?? null
    if (dto.areaId !== undefined) r.areaId = dto.areaId ?? null
    if (dto.notes !== undefined) r.notes = dto.notes ?? null
    if (r.lat != null && r.lng != null) r.geom = { type: 'Point', coordinates: [r.lng, r.lat] }
    return (await this.enrich([await this.records.save(r)]))[0]
  }

  async remove(id: string): Promise<void> {
    await this.records.remove(await this.findOrFail(id))
  }

  // ── card-access import (vendor-neutral standard) ──────────────────────────────

  async import(dto: AttendanceImportDto): Promise<AttendanceImportResultDto> {
    const result: AttendanceImportResultDto = {
      received: dto.events.length,
      inserted: 0,
      duplicates: 0,
      unmatched: 0,
      rejected: 0,
      errors: [],
    }
    if (dto.events.length === 0) return result

    // Normalize externalId per event, then pre-load existing ones for dedup.
    const normalized = dto.events.map((e) => ({
      event: e,
      externalId: (e.externalId && e.externalId.trim()) || this.deriveExternalId(e),
    }))
    const existing = new Set(
      (
        await this.records.find({
          where: { source: dto.source, externalId: In(normalized.map((n) => n.externalId)) },
          select: { externalId: true },
        })
      ).map((r) => r.externalId),
    )

    const seen = new Set<string>()
    const toInsert: AttendanceRecord[] = []
    for (let i = 0; i < normalized.length; i++) {
      const { event, externalId } = normalized[i]
      if (existing.has(externalId) || seen.has(externalId)) {
        result.duplicates++
        continue
      }
      seen.add(externalId)
      let eventTime: Date
      try {
        eventTime = new Date(event.eventTime)
        if (Number.isNaN(eventTime.getTime())) throw new Error('bad date')
      } catch {
        result.rejected++
        result.errors.push({ index: i, externalId, reason: 'Geçersiz eventTime' })
        continue
      }
      const employeeId = await this.resolveEmployee(event)
      if (!employeeId) result.unmatched++
      toInsert.push(
        this.records.create({
          employeeId,
          branchId: null,
          eventTime,
          direction: event.direction ?? 'unknown',
          method: 'card',
          lat: null,
          lng: null,
          accuracyMeters: null,
          geom: null,
          areaId: null,
          distanceMeters: null,
          withinGeofence: false,
          withinTimeWindow: false,
          isMockLocation: false,
          status: employeeId ? 'valid' : 'flagged',
          flagReason: employeeId ? null : 'unmatched_card',
          cardNo: event.cardNo ?? null,
          source: dto.source,
          externalId,
          deviceInfo: { deviceId: event.deviceId, terminalId: event.terminalId ?? null, readerId: event.readerId ?? null },
          shiftDayId: null,
          raw: event.raw ?? null,
          createdById: null,
          notes: null,
        }),
      )
    }
    if (toInsert.length) await this.records.save(toInsert)
    result.inserted = toInsert.length
    return result
  }

  // ── internals ──────────────────────────────────────────────────────────────

  // Nearest active area (within candidate set) to the point, with distance + within.
  private async nearestArea(
    lng: number,
    lat: number,
    candidateIds: string[] | null,
  ): Promise<AreaMatch | null> {
    const params: unknown[] = [lng, lat]
    let idFilter = ''
    if (candidateIds) {
      if (candidateIds.length === 0) return null
      params.push(candidateIds)
      idFilter = `AND a.id = ANY($3::uuid[])`
    }
    const rows = await this.areas.query(
      `SELECT a.id, a.name, a.tolerance_meters AS tol, a.min_accuracy_meters AS minacc,
              a.require_inside, a.allow_mock_location AS allow_mock, a.time_windows,
              ST_Distance(a.geom::geography, pt.g) AS dist,
              ST_DWithin(a.geom::geography, pt.g, a.tolerance_meters) AS within
       FROM hr_checkin_areas a,
            (SELECT ST_SetSRID(ST_MakePoint($1,$2),4326)::geography AS g) pt
       WHERE a.is_active = true AND a.geom IS NOT NULL ${idFilter}
       ORDER BY dist ASC
       LIMIT 1`,
      params,
    )
    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      name: r.name,
      tol: Number(r.tol),
      minacc: Number(r.minacc),
      require_inside: r.require_inside,
      allow_mock: r.allow_mock,
      time_windows: r.time_windows ?? [],
      dist: Number(r.dist),
      within: r.within,
    }
  }

  private isWithinWindows(windows: { dow?: number[]; from: string; to: string }[]): boolean {
    const { dow, hhmm } = localDowAndTime(new Date(), 'Europe/Istanbul')
    return evaluateTimeWindows(windows, dow, hhmm)
  }

  private messageFor(status: string, flags: string[], areaName?: string): string {
    if (status === 'valid') return areaName ? `${areaName} — giriş kabul edildi` : 'Giriş kabul edildi'
    const reasons: Record<string, string> = {
      no_area: 'Tanımlı bir giriş alanı bulunamadı',
      outside_area: 'Giriş alanının dışındasınız',
      outside_window: 'Geçerli giriş saat aralığında değilsiniz',
      low_accuracy: 'Konum doğruluğu yetersiz',
      mock_location: 'Sahte konum tespit edildi',
    }
    return flags.map((f) => reasons[f] ?? f).join('; ')
  }

  private deriveExternalId(e: { deviceId: string; cardNo?: string; eventTime: string; direction?: string }): string {
    return deriveDedupKey(e.deviceId, e.cardNo, e.eventTime, e.direction)
  }

  private async resolveEmployee(e: {
    cardNo?: string
    personnelId?: string
    employeeRef?: { byCardNo?: string; byExternalPersonnelId?: string; byTcKimlik?: string }
  }): Promise<string | null> {
    const ref = e.employeeRef
    // 1) explicit hints
    if (ref?.byCardNo) {
      const byHint = await this.byCardNo(ref.byCardNo)
      if (byHint) return byHint
    }
    if (ref?.byTcKimlik) {
      const emp = await this.employees.findOne({ where: { tcKimlikNo: ref.byTcKimlik }, select: { id: true } })
      if (emp) return emp.id
    }
    if (ref?.byExternalPersonnelId) {
      const card = await this.cards.findOne({ where: { externalPersonnelId: ref.byExternalPersonnelId }, select: { employeeId: true } })
      if (card) return card.employeeId
    }
    // 2) cardNo (employee.cardNo → employee_cards.cardNo)
    if (e.cardNo) {
      const byCard = await this.byCardNo(e.cardNo)
      if (byCard) return byCard
    }
    // 3) external personnel id
    if (e.personnelId) {
      const card = await this.cards.findOne({ where: { externalPersonnelId: e.personnelId }, select: { employeeId: true } })
      if (card) return card.employeeId
    }
    return null
  }

  private async byCardNo(cardNo: string): Promise<string | null> {
    const emp = await this.employees.findOne({ where: { cardNo }, select: { id: true } })
    if (emp) return emp.id
    const card = await this.cards.findOne({ where: { cardNo, isActive: true }, select: { employeeId: true } })
    return card?.employeeId ?? null
  }

  private async queryRecords(query: AttendanceListQuery): Promise<AttendanceRecord[]> {
    const qb = this.records.createQueryBuilder('r')
    if (query.employeeId) qb.andWhere('r.employeeId = :e', { e: query.employeeId })
    if (query.branchId) qb.andWhere('r.branchId = :b', { b: query.branchId })
    if (query.method) qb.andWhere('r.method = :m', { m: query.method })
    if (query.status) qb.andWhere('r.status = :s', { s: query.status })
    if (query.direction) qb.andWhere('r.direction = :d', { d: query.direction })
    if (query.from) qb.andWhere('r.eventTime >= :from', { from: new Date(query.from) })
    if (query.to) qb.andWhere('r.eventTime <= :to', { to: new Date(query.to) })
    qb.orderBy('r.eventTime', 'DESC').limit(1000)
    return qb.getMany()
  }

  private async enrich(rows: AttendanceRecord[]): Promise<AttendanceRecordDto[]> {
    const names = await employeeNameMap(this.employees, rows.map((r) => r.employeeId))
    const areaIds = [...new Set(rows.map((r) => r.areaId).filter((x): x is string => !!x))]
    const areaMap = new Map<string, CheckinAreaSummary>()
    if (areaIds.length) {
      const areas = await this.areas.find({ where: { id: In(areaIds) } })
      for (const a of areas) areaMap.set(a.id, toAreaSummary(a))
    }
    return rows.map((r) =>
      toAttendanceDto(
        r,
        r.employeeId ? names.get(r.employeeId) ?? null : null,
        r.areaId ? areaMap.get(r.areaId) ?? null : null,
      ),
    )
  }

  private async findOrFail(id: string): Promise<AttendanceRecord> {
    const r = await this.records.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Kayıt bulunamadı')
    return r
  }
}
