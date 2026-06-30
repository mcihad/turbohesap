import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ShiftRotationDto, ShiftSummary } from '@turbohesap/shared'

import { Shift } from './entities/shift.entity'
import { ShiftRotation } from './entities/shift-rotation.entity'
import type {
  CreateShiftRotationDto,
  UpdateShiftRotationDto,
} from './dto/shift-rotation.dto'
import { toRotationDto, toShiftSummary } from './hr-pdks.mappers'

@Injectable()
export class ShiftRotationsService {
  constructor(
    @InjectRepository(ShiftRotation) private readonly rotations: Repository<ShiftRotation>,
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
  ) {}

  async list(): Promise<ShiftRotationDto[]> {
    const rows = await this.rotations.find({ order: { name: 'ASC' } })
    const summaries = await this.shiftSummaries(rows.flatMap((r) => (r.days ?? []).map((d) => d.shiftId)))
    return rows.map((r) => toRotationDto(r, this.pickShifts(r, summaries)))
  }

  async get(id: string): Promise<ShiftRotationDto> {
    const r = await this.findOrFail(id)
    const summaries = await this.shiftSummaries((r.days ?? []).map((d) => d.shiftId))
    return toRotationDto(r, this.pickShifts(r, summaries))
  }

  async create(dto: CreateShiftRotationDto): Promise<ShiftRotationDto> {
    const r = this.rotations.create({
      name: dto.name.trim(),
      cycleLengthDays: dto.cycleLengthDays,
      anchorDate: dto.anchorDate,
      days: dto.days ?? [],
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    })
    return this.get((await this.rotations.save(r)).id)
  }

  async update(id: string, dto: UpdateShiftRotationDto): Promise<ShiftRotationDto> {
    const r = await this.findOrFail(id)
    if (dto.name !== undefined) r.name = dto.name.trim()
    if (dto.cycleLengthDays !== undefined) r.cycleLengthDays = dto.cycleLengthDays
    if (dto.anchorDate !== undefined) r.anchorDate = dto.anchorDate
    if (dto.days !== undefined) r.days = dto.days
    if (dto.description !== undefined) r.description = dto.description ?? null
    if (dto.isActive !== undefined) r.isActive = dto.isActive
    await this.rotations.save(r)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    await this.rotations.remove(await this.findOrFail(id))
  }

  private pickShifts(r: ShiftRotation, all: Map<string, ShiftSummary>): ShiftSummary[] {
    const ids = [...new Set((r.days ?? []).map((d) => d.shiftId).filter((x): x is string => !!x))]
    return ids.map((id) => all.get(id)).filter((x): x is ShiftSummary => !!x)
  }

  private async shiftSummaries(ids: (string | null)[]): Promise<Map<string, ShiftSummary>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    const map = new Map<string, ShiftSummary>()
    if (unique.length === 0) return map
    const rows = await this.shifts.find({ where: { id: In(unique) } })
    for (const s of rows) map.set(s.id, toShiftSummary(s))
    return map
  }

  private async findOrFail(id: string): Promise<ShiftRotation> {
    const r = await this.rotations.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Rotasyon bulunamadı')
    return r
  }
}
