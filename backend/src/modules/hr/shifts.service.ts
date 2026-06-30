import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { ShiftDto, ShiftListQuery } from '@turbohesap/shared'

import { Shift } from './entities/shift.entity'
import type { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto'
import { toShiftDto } from './hr-pdks.mappers'

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
  ) {}

  async list(query: ShiftListQuery = {}): Promise<ShiftDto[]> {
    const where: Record<string, unknown> = {}
    if (query.branchId) where.branchId = query.branchId
    if (query.isActive !== undefined) where.isActive = query.isActive
    const rows = await this.shifts.find({ where, order: { startTime: 'ASC', name: 'ASC' } })
    return rows.map(toShiftDto)
  }

  async get(id: string): Promise<ShiftDto> {
    return toShiftDto(await this.findOrFail(id))
  }

  async create(dto: CreateShiftDto): Promise<ShiftDto> {
    const shift = this.shifts.create({
      name: dto.name.trim(),
      code: dto.code ?? '',
      startTime: dto.startTime,
      endTime: dto.endTime,
      crossesMidnight: dto.crossesMidnight ?? dto.endTime <= dto.startTime,
      expectedMinutes: dto.expectedMinutes ?? 0,
      lateGraceMin: dto.lateGraceMin ?? 0,
      earlyLeaveGraceMin: dto.earlyLeaveGraceMin ?? 0,
      earlyInClampMin: dto.earlyInClampMin ?? 0,
      color: dto.color ?? '#2563eb',
      isDayOff: dto.isDayOff ?? false,
      breaks: dto.breaks ?? [],
      branchId: dto.branchId ?? null,
      isActive: dto.isActive ?? true,
      notes: dto.notes ?? null,
    })
    return toShiftDto(await this.shifts.save(shift))
  }

  async update(id: string, dto: UpdateShiftDto): Promise<ShiftDto> {
    const s = await this.findOrFail(id)
    if (dto.name !== undefined) s.name = dto.name.trim()
    if (dto.code !== undefined) s.code = dto.code
    if (dto.startTime !== undefined) s.startTime = dto.startTime
    if (dto.endTime !== undefined) s.endTime = dto.endTime
    if (dto.crossesMidnight !== undefined) s.crossesMidnight = dto.crossesMidnight
    if (dto.expectedMinutes !== undefined) s.expectedMinutes = dto.expectedMinutes
    if (dto.lateGraceMin !== undefined) s.lateGraceMin = dto.lateGraceMin
    if (dto.earlyLeaveGraceMin !== undefined) s.earlyLeaveGraceMin = dto.earlyLeaveGraceMin
    if (dto.earlyInClampMin !== undefined) s.earlyInClampMin = dto.earlyInClampMin
    if (dto.color !== undefined) s.color = dto.color
    if (dto.isDayOff !== undefined) s.isDayOff = dto.isDayOff
    if (dto.breaks !== undefined) s.breaks = dto.breaks
    if (dto.branchId !== undefined) s.branchId = dto.branchId ?? null
    if (dto.isActive !== undefined) s.isActive = dto.isActive
    if (dto.notes !== undefined) s.notes = dto.notes ?? null
    return toShiftDto(await this.shifts.save(s))
  }

  async remove(id: string): Promise<void> {
    await this.shifts.remove(await this.findOrFail(id))
  }

  private async findOrFail(id: string): Promise<Shift> {
    const s = await this.shifts.findOne({ where: { id } })
    if (!s) throw new NotFoundException('Vardiya bulunamadı')
    return s
  }
}
