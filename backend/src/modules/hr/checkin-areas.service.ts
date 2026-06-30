import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  CheckinAreaDto,
  CheckinAreaListQuery,
  CheckinTimeWindow,
  GeoJsonGeometry,
} from '@turbohesap/shared'

import { Employee } from './entities/employee.entity'
import { CheckinArea } from './entities/checkin-area.entity'
import { EmployeeCheckinArea } from './entities/employee-checkin-area.entity'
import type {
  CreateCheckinAreaDto,
  SetAreaEmployeesDto,
  UpdateCheckinAreaDto,
} from './dto/checkin-area.dto'
import { toAreaDto } from './hr-pdks.mappers'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

@Injectable()
export class CheckinAreasService {
  constructor(
    @InjectRepository(CheckinArea) private readonly areas: Repository<CheckinArea>,
    @InjectRepository(EmployeeCheckinArea) private readonly links: Repository<EmployeeCheckinArea>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  async list(query: CheckinAreaListQuery = {}): Promise<CheckinAreaDto[]> {
    const qb = this.areas.createQueryBuilder('a')
    if (query.branchId) qb.andWhere('a.branchId = :b', { b: query.branchId })
    if (query.isActive !== undefined) qb.andWhere('a.isActive = :ia', { ia: query.isActive })
    if (query.employeeId) {
      qb.innerJoin(EmployeeCheckinArea, 'l', 'l.area_id = a.id AND l.employee_id = :e', { e: query.employeeId })
    }
    qb.orderBy('a.name', 'ASC')
    const rows = await qb.getMany()
    const counts = await this.employeeCounts(rows.map((r) => r.id))
    return rows.map((r) => toAreaDto(r, counts.get(r.id) ?? 0))
  }

  async get(id: string): Promise<CheckinAreaDto> {
    const a = await this.findOrFail(id)
    return toAreaDto(a, await this.links.count({ where: { areaId: id } }))
  }

  async create(dto: CreateCheckinAreaDto): Promise<CheckinAreaDto> {
    this.validateGeom(dto.geom)
    this.validateWindows(dto.timeWindows)
    const a = this.areas.create({
      name: dto.name.trim(),
      code: dto.code ?? '',
      branchId: dto.branchId ?? null,
      geom: dto.geom ?? null,
      toleranceMeters: dto.toleranceMeters ?? 100,
      minAccuracyMeters: dto.minAccuracyMeters ?? 100,
      timeWindows: dto.timeWindows ?? [],
      attributes: dto.attributes ?? {},
      requireInside: dto.requireInside ?? true,
      allowMockLocation: dto.allowMockLocation ?? false,
      isActive: dto.isActive ?? true,
      notes: dto.notes ?? null,
    })
    return toAreaDto(await this.areas.save(a), 0)
  }

  async update(id: string, dto: UpdateCheckinAreaDto): Promise<CheckinAreaDto> {
    const a = await this.findOrFail(id)
    if (dto.geom !== undefined) {
      this.validateGeom(dto.geom)
      a.geom = dto.geom ?? null
    }
    if (dto.timeWindows !== undefined) {
      this.validateWindows(dto.timeWindows)
      a.timeWindows = dto.timeWindows
    }
    if (dto.name !== undefined) a.name = dto.name.trim()
    if (dto.code !== undefined) a.code = dto.code
    if (dto.branchId !== undefined) a.branchId = dto.branchId ?? null
    if (dto.toleranceMeters !== undefined) a.toleranceMeters = dto.toleranceMeters
    if (dto.minAccuracyMeters !== undefined) a.minAccuracyMeters = dto.minAccuracyMeters
    if (dto.attributes !== undefined) a.attributes = dto.attributes
    if (dto.requireInside !== undefined) a.requireInside = dto.requireInside
    if (dto.allowMockLocation !== undefined) a.allowMockLocation = dto.allowMockLocation
    if (dto.isActive !== undefined) a.isActive = dto.isActive
    if (dto.notes !== undefined) a.notes = dto.notes ?? null
    await this.areas.save(a)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id)
    await this.links.delete({ areaId: id })
    await this.areas.delete({ id })
  }

  async listEmployees(id: string): Promise<string[]> {
    await this.findOrFail(id)
    const rows = await this.links.find({ where: { areaId: id } })
    return rows.map((r) => r.employeeId)
  }

  async setEmployees(id: string, dto: SetAreaEmployeesDto): Promise<string[]> {
    await this.findOrFail(id)
    const ids = [...new Set(dto.employeeIds)]
    if (ids.length) {
      const found = await this.employees.count({ where: { id: In(ids) } })
      if (found !== ids.length) throw new BadRequestException('Geçersiz personel id')
    }
    await this.links.delete({ areaId: id })
    if (ids.length) {
      await this.links.save(ids.map((employeeId) => this.links.create({ areaId: id, employeeId })))
    }
    return ids
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private validateGeom(geom?: GeoJsonGeometry | null): void {
    if (!geom) return
    if (geom.type === 'Point') {
      if (!Array.isArray(geom.coordinates) || geom.coordinates.length !== 2) {
        throw new BadRequestException('Geçersiz Point geometrisi')
      }
    } else if (geom.type === 'Polygon') {
      if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
        throw new BadRequestException('Geçersiz Polygon geometrisi')
      }
    } else {
      throw new BadRequestException('geom yalnızca Point veya Polygon olabilir')
    }
  }

  private validateWindows(windows?: CheckinTimeWindow[]): void {
    for (const w of windows ?? []) {
      if (!HHMM.test(w.from) || !HHMM.test(w.to)) {
        throw new BadRequestException('Zaman aralıkları HH:MM olmalı')
      }
    }
  }

  private async employeeCounts(areaIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (areaIds.length === 0) return map
    const rows = await this.links
      .createQueryBuilder('l')
      .select('l.area_id', 'aid')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.area_id IN (:...ids)', { ids: areaIds })
      .groupBy('l.area_id')
      .getRawMany<{ aid: string; cnt: string }>()
    for (const r of rows) map.set(r.aid, Number(r.cnt))
    return map
  }

  private async findOrFail(id: string): Promise<CheckinArea> {
    const a = await this.areas.findOne({ where: { id } })
    if (!a) throw new NotFoundException('Giriş alanı bulunamadı')
    return a
  }
}
