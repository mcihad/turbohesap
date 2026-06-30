import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  EmployeeShiftAssignmentDto,
  EmployeeShiftDayDto,
  GenerateScheduleResult,
  ShiftAssignmentListQuery,
  ShiftDayListQuery,
  ShiftSummary,
} from '@turbohesap/shared'

import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { Employee } from './entities/employee.entity'
import { Shift } from './entities/shift.entity'
import { ShiftRotation } from './entities/shift-rotation.entity'
import { EmployeeShift } from './entities/employee-shift.entity'
import { EmployeeShiftDay } from './entities/employee-shift-day.entity'
import type {
  AssignEmployeeShiftDto,
  GenerateScheduleDto,
  SetShiftDayDto,
  UpdateEmployeeShiftDto,
} from './dto/shift-schedule.dto'
import {
  employeeNameMap,
  toAssignmentDto,
  toShiftDayDto,
  toShiftSummary,
} from './hr-pdks.mappers'
import { epochDay, rotationSlotIndex } from './hr-pdks.helpers'

const DAY_MS = 86_400_000
const parseDay = (s: string): Date => new Date(`${s.slice(0, 10)}T00:00:00.000Z`)
const fmtDay = (d: Date): string => d.toISOString().slice(0, 10)
const dayDiff = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / DAY_MS)

@Injectable()
export class ShiftScheduleService {
  constructor(
    @InjectRepository(EmployeeShift) private readonly assignments: Repository<EmployeeShift>,
    @InjectRepository(EmployeeShiftDay) private readonly days: Repository<EmployeeShiftDay>,
    @InjectRepository(ShiftRotation) private readonly rotations: Repository<ShiftRotation>,
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  // ── assignments ────────────────────────────────────────────────────────────

  async listAssignments(query: ShiftAssignmentListQuery = {}): Promise<EmployeeShiftAssignmentDto[]> {
    const where: Record<string, unknown> = {}
    if (query.employeeId) where.employeeId = query.employeeId
    if (query.rotationId) where.rotationId = query.rotationId
    const rows = await this.assignments.find({ where, order: { effectiveFrom: 'DESC' } })
    return this.enrichAssignments(rows)
  }

  async assign(dto: AssignEmployeeShiftDto): Promise<EmployeeShiftAssignmentDto> {
    if (!dto.rotationId && !dto.fixedShiftId) {
      throw new BadRequestException('Bir rotasyon veya sabit vardiya seçilmelidir')
    }
    await this.employeeOrFail(dto.employeeId)
    if (dto.rotationId) await this.rotationOrFail(dto.rotationId)
    if (dto.fixedShiftId) await this.shiftOrFail(dto.fixedShiftId)
    const a = this.assignments.create({
      employeeId: dto.employeeId,
      rotationId: dto.rotationId ?? null,
      rotationOffset: dto.rotationOffset ?? 0,
      fixedShiftId: dto.fixedShiftId ?? null,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? null,
    })
    return (await this.enrichAssignments([await this.assignments.save(a)]))[0]
  }

  async updateAssignment(id: string, dto: UpdateEmployeeShiftDto): Promise<EmployeeShiftAssignmentDto> {
    const a = await this.assignmentOrFail(id)
    if (dto.rotationId !== undefined) {
      if (dto.rotationId) await this.rotationOrFail(dto.rotationId)
      a.rotationId = dto.rotationId ?? null
    }
    if (dto.rotationOffset !== undefined) a.rotationOffset = dto.rotationOffset ?? 0
    if (dto.fixedShiftId !== undefined) {
      if (dto.fixedShiftId) await this.shiftOrFail(dto.fixedShiftId)
      a.fixedShiftId = dto.fixedShiftId ?? null
    }
    if (dto.effectiveFrom !== undefined) a.effectiveFrom = dto.effectiveFrom
    if (dto.effectiveTo !== undefined) a.effectiveTo = dto.effectiveTo ?? null
    return (await this.enrichAssignments([await this.assignments.save(a)]))[0]
  }

  async removeAssignment(id: string): Promise<void> {
    await this.assignments.remove(await this.assignmentOrFail(id))
  }

  // ── materialized calendar ──────────────────────────────────────────────────

  async generate(dto: GenerateScheduleDto): Promise<GenerateScheduleResult> {
    const from = parseDay(dto.from)
    const to = parseDay(dto.to)
    if (dayDiff(from, to) < 0) throw new BadRequestException('Geçersiz tarih aralığı')
    if (dayDiff(from, to) > 366) throw new BadRequestException('Aralık en fazla 366 gün olabilir')

    const employeeIds = dto.employeeIds?.length
      ? dto.employeeIds
      : [...new Set((await this.assignments.find({ select: { employeeId: true } })).map((a) => a.employeeId))]

    const rotationCache = new Map<string, ShiftRotation>()
    const result: GenerateScheduleResult = { created: 0, updated: 0, skipped: 0 }

    for (const employeeId of employeeIds) {
      const assigns = await this.assignments.find({
        where: { employeeId },
        order: { effectiveFrom: 'ASC' },
      })
      if (assigns.length === 0) continue

      const existing = await this.days.find({ where: { employeeId } })
      const byDate = new Map(existing.map((d) => [d.workDate, d]))

      for (let i = 0; i <= dayDiff(from, to); i++) {
        const day = new Date(from.getTime() + i * DAY_MS)
        const dateStr = fmtDay(day)
        const assignment = this.assignmentForDay(assigns, dateStr)
        if (!assignment) continue

        const shiftId = await this.resolveShiftId(assignment, day, rotationCache)
        const prev = byDate.get(dateStr)
        if (prev) {
          if (prev.source === 'manual' && !dto.overwriteManual) {
            result.skipped++
            continue
          }
          prev.shiftId = shiftId
          prev.source = 'rotation'
          prev.status = dto.publish ? 'published' : prev.status
          await this.days.save(prev)
          result.updated++
        } else {
          await this.days.save(
            this.days.create({
              employeeId,
              workDate: dateStr,
              shiftId,
              source: 'rotation',
              status: dto.publish ? 'published' : 'draft',
            }),
          )
          result.created++
        }
      }
    }
    return result
  }

  async listDays(query: ShiftDayListQuery = {}): Promise<EmployeeShiftDayDto[]> {
    return this.enrichDays(await this.queryDays(query))
  }

  async setDay(dto: SetShiftDayDto): Promise<EmployeeShiftDayDto> {
    await this.employeeOrFail(dto.employeeId)
    if (dto.shiftId) await this.shiftOrFail(dto.shiftId)
    let row = await this.days.findOne({ where: { employeeId: dto.employeeId, workDate: dto.workDate } })
    if (row) {
      row.shiftId = dto.shiftId
      row.source = 'manual'
      if (dto.status) row.status = dto.status
    } else {
      row = this.days.create({
        employeeId: dto.employeeId,
        workDate: dto.workDate,
        shiftId: dto.shiftId,
        source: 'manual',
        status: dto.status ?? 'published',
      })
    }
    return (await this.enrichDays([await this.days.save(row)]))[0]
  }

  async mine(user: AuthUser, from?: string, to?: string): Promise<EmployeeShiftDayDto[]> {
    const me = await this.employees.findOne({ where: { userId: user.sub, isActive: true } })
    if (!me) return []
    return this.enrichDays(await this.queryDays({ employeeId: me.id, from, to }))
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private assignmentForDay(assigns: EmployeeShift[], dateStr: string): EmployeeShift | null {
    // Latest-starting assignment whose [from,to] contains the day.
    let best: EmployeeShift | null = null
    for (const a of assigns) {
      if (a.effectiveFrom <= dateStr && (!a.effectiveTo || a.effectiveTo >= dateStr)) {
        if (!best || a.effectiveFrom > best.effectiveFrom) best = a
      }
    }
    return best
  }

  private async resolveShiftId(
    a: EmployeeShift,
    day: Date,
    cache: Map<string, ShiftRotation>,
  ): Promise<string | null> {
    if (a.rotationId) {
      let rot = cache.get(a.rotationId)
      if (!rot) {
        const found = await this.rotations.findOne({ where: { id: a.rotationId } })
        if (!found) return null
        rot = found
        cache.set(a.rotationId, rot)
      }
      const idx = rotationSlotIndex(
        epochDay(rot.anchorDate),
        Math.floor(day.getTime() / DAY_MS),
        a.rotationOffset,
        rot.cycleLengthDays,
      )
      const slot = (rot.days ?? []).find((d) => d.dayIndex === idx)
      return slot?.shiftId ?? null
    }
    return a.fixedShiftId ?? null
  }

  private async queryDays(query: ShiftDayListQuery): Promise<EmployeeShiftDay[]> {
    const qb = this.days.createQueryBuilder('d')
    if (query.employeeId) qb.andWhere('d.employeeId = :e', { e: query.employeeId })
    if (query.from) qb.andWhere('d.workDate >= :from', { from: query.from })
    if (query.to) qb.andWhere('d.workDate <= :to', { to: query.to })
    qb.orderBy('d.workDate', 'ASC')
    return qb.getMany()
  }

  private async enrichAssignments(rows: EmployeeShift[]): Promise<EmployeeShiftAssignmentDto[]> {
    const names = await employeeNameMap(this.employees, rows.map((r) => r.employeeId))
    const shiftIds = rows.map((r) => r.fixedShiftId).filter((x): x is string => !!x)
    const shiftMap = await this.shiftSummaries(shiftIds)
    const rotIds = [...new Set(rows.map((r) => r.rotationId).filter((x): x is string => !!x))]
    const rotMap = new Map<string, string>()
    if (rotIds.length) {
      const rots = await this.rotations.find({ where: { id: In(rotIds) }, select: { id: true, name: true } })
      for (const r of rots) rotMap.set(r.id, r.name)
    }
    return rows.map((r) =>
      toAssignmentDto(
        r,
        names.get(r.employeeId) ?? '—',
        r.rotationId ? rotMap.get(r.rotationId) ?? null : null,
        r.fixedShiftId ? shiftMap.get(r.fixedShiftId) ?? null : null,
      ),
    )
  }

  private async enrichDays(rows: EmployeeShiftDay[]): Promise<EmployeeShiftDayDto[]> {
    const names = await employeeNameMap(this.employees, rows.map((r) => r.employeeId))
    const shiftMap = await this.shiftSummaries(rows.map((r) => r.shiftId))
    return rows.map((r) =>
      toShiftDayDto(r, names.get(r.employeeId) ?? '—', r.shiftId ? shiftMap.get(r.shiftId) ?? null : null),
    )
  }

  private async shiftSummaries(ids: (string | null)[]): Promise<Map<string, ShiftSummary>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    const map = new Map<string, ShiftSummary>()
    if (unique.length === 0) return map
    const rows = await this.shifts.find({ where: { id: In(unique) } })
    for (const s of rows) map.set(s.id, toShiftSummary(s))
    return map
  }

  private async employeeOrFail(id: string): Promise<Employee> {
    const e = await this.employees.findOne({ where: { id } })
    if (!e) throw new NotFoundException('Personel bulunamadı')
    return e
  }
  private async rotationOrFail(id: string): Promise<ShiftRotation> {
    const r = await this.rotations.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Rotasyon bulunamadı')
    return r
  }
  private async shiftOrFail(id: string): Promise<Shift> {
    const s = await this.shifts.findOne({ where: { id } })
    if (!s) throw new NotFoundException('Vardiya bulunamadı')
    return s
  }
  private async assignmentOrFail(id: string): Promise<EmployeeShift> {
    const a = await this.assignments.findOne({ where: { id } })
    if (!a) throw new NotFoundException('Vardiya ataması bulunamadı')
    return a
  }
}
