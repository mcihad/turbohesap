import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { WorkCenterDto, WorkCenterListQuery } from '@turbohesap/shared'

import { WorkCenter } from './entities/work-center.entity'
import { BomOperation } from './entities/bom-operation.entity'
import type { CreateWorkCenterDto, UpdateWorkCenterDto } from './dto/work-center.dto'
import { toWorkCenterDto } from './production.mappers'

@Injectable()
export class WorkCentersService {
  constructor(
    @InjectRepository(WorkCenter) private readonly workCenters: Repository<WorkCenter>,
    @InjectRepository(BomOperation) private readonly operations: Repository<BomOperation>,
  ) {}

  async list(query: WorkCenterListQuery = {}): Promise<WorkCenterDto[]> {
    const where: Record<string, unknown> = {}
    if (query.branchId) where.branchId = query.branchId
    if (query.isActive !== undefined) where.isActive = query.isActive
    const rows = await this.workCenters.find({ where, order: { name: 'ASC' } })
    return rows.map(toWorkCenterDto)
  }

  async get(id: string): Promise<WorkCenterDto> {
    return toWorkCenterDto(await this.findOrFail(id))
  }

  async create(dto: CreateWorkCenterDto): Promise<WorkCenterDto> {
    const code = (dto.code ?? '').trim() || (await this.nextCode())
    if (await this.workCenters.exists({ where: { code } })) {
      throw new ConflictException('Bu iş merkezi kodu zaten kullanılıyor')
    }
    const wc = this.workCenters.create({
      code,
      name: dto.name.trim(),
      branchId: dto.branchId ?? null,
      costPerHour: dto.costPerHour ?? 0,
      setupCostPerHour: dto.setupCostPerHour ?? null,
      currency: dto.currency ?? 'TRY',
      capacityPerHour: dto.capacityPerHour ?? null,
      parallelCapacity: dto.parallelCapacity ?? 1,
      efficiencyRate: dto.efficiencyRate ?? 1,
      setupTimeMinutes: dto.setupTimeMinutes ?? 0,
      cleanupTimeMinutes: dto.cleanupTimeMinutes ?? 0,
      alternateWorkCenterId: dto.alternateWorkCenterId ?? null,
      costAccountCode: dto.costAccountCode ?? null,
      isActive: dto.isActive ?? true,
      notes: dto.notes ?? null,
    })
    return toWorkCenterDto(await this.workCenters.save(wc))
  }

  async update(id: string, dto: UpdateWorkCenterDto): Promise<WorkCenterDto> {
    const wc = await this.findOrFail(id)
    if (dto.code !== undefined) {
      const code = dto.code.trim()
      if (code && code !== wc.code && (await this.workCenters.exists({ where: { code } }))) {
        throw new ConflictException('Bu iş merkezi kodu zaten kullanılıyor')
      }
      if (code) wc.code = code
    }
    if (dto.name !== undefined) wc.name = dto.name.trim()
    if (dto.branchId !== undefined) wc.branchId = dto.branchId ?? null
    if (dto.costPerHour !== undefined) wc.costPerHour = dto.costPerHour
    if (dto.setupCostPerHour !== undefined) wc.setupCostPerHour = dto.setupCostPerHour ?? null
    if (dto.currency !== undefined) wc.currency = dto.currency
    if (dto.capacityPerHour !== undefined) wc.capacityPerHour = dto.capacityPerHour ?? null
    if (dto.parallelCapacity !== undefined) wc.parallelCapacity = dto.parallelCapacity
    if (dto.efficiencyRate !== undefined) wc.efficiencyRate = dto.efficiencyRate
    if (dto.setupTimeMinutes !== undefined) wc.setupTimeMinutes = dto.setupTimeMinutes
    if (dto.cleanupTimeMinutes !== undefined) wc.cleanupTimeMinutes = dto.cleanupTimeMinutes
    if (dto.alternateWorkCenterId !== undefined) wc.alternateWorkCenterId = dto.alternateWorkCenterId ?? null
    if (dto.costAccountCode !== undefined) wc.costAccountCode = dto.costAccountCode ?? null
    if (dto.isActive !== undefined) wc.isActive = dto.isActive
    if (dto.notes !== undefined) wc.notes = dto.notes ?? null
    return toWorkCenterDto(await this.workCenters.save(wc))
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id)
    if (await this.operations.exists({ where: { workCenterId: id } })) {
      throw new BadRequestException('Bu iş merkezi reçete operasyonlarında kullanılıyor, silinemez (pasife alın)')
    }
    await this.workCenters.delete({ id })
  }

  private async findOrFail(id: string): Promise<WorkCenter> {
    const wc = await this.workCenters.findOne({ where: { id } })
    if (!wc) throw new NotFoundException('İş merkezi bulunamadı')
    return wc
  }

  private async nextCode(): Promise<string> {
    const n = (await this.workCenters.count()) + 1
    return `WC-${String(n).padStart(3, '0')}`
  }
}
