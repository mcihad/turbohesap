import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  AssetMaintenanceDto,
  AssetMaintenanceListQuery,
  AssetSummary,
} from '@turbohesap/shared'

import { Asset } from './entities/asset.entity'
import { AssetMaintenance } from './entities/asset-maintenance.entity'
import type {
  CreateAssetMaintenanceDto,
  UpdateAssetMaintenanceDto,
} from './dto/asset-maintenance.dto'
import { toAssetSummary, toMaintenanceDto } from './asset.mappers'

@Injectable()
export class AssetMaintenanceService {
  constructor(
    @InjectRepository(AssetMaintenance)
    private readonly records: Repository<AssetMaintenance>,
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
  ) {}

  async list(
    query: AssetMaintenanceListQuery = {},
  ): Promise<AssetMaintenanceDto[]> {
    const where: Record<string, unknown> = {}
    if (query.assetId) where.assetId = query.assetId
    if (query.type) where.type = query.type
    if (query.status) where.status = query.status
    const rows = await this.records.find({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
    })
    return this.enrich(rows)
  }

  async get(id: string): Promise<AssetMaintenanceDto> {
    const r = await this.findOrFail(id)
    return (await this.enrich([r]))[0]
  }

  async create(dto: CreateAssetMaintenanceDto): Promise<AssetMaintenanceDto> {
    const asset = await this.assetOrFail(dto.assetId)
    const created = this.records.create({
      assetId: asset.id,
      type: dto.type,
      status: dto.status ?? 'tamamlandi',
      date: dto.date,
      cost: dto.cost ?? 0,
      currency: dto.currency ?? 'TRY',
      vendorContactId: dto.vendorContactId ?? null,
      odometer: dto.odometer ?? null,
      description: dto.description ?? null,
      nextDueDate: dto.nextDueDate ?? null,
      nextDueOdometer: dto.nextDueOdometer ?? null,
      notes: dto.notes ?? null,
    })
    const saved = await this.records.save(created)
    return toMaintenanceDto(saved, toAssetSummary(asset))
  }

  async update(
    id: string,
    dto: UpdateAssetMaintenanceDto,
  ): Promise<AssetMaintenanceDto> {
    const r = await this.findOrFail(id)
    if (dto.type !== undefined) r.type = dto.type
    if (dto.status !== undefined) r.status = dto.status
    if (dto.date !== undefined) r.date = dto.date
    if (dto.cost !== undefined) r.cost = dto.cost ?? 0
    if (dto.currency !== undefined) r.currency = dto.currency ?? 'TRY'
    if (dto.vendorContactId !== undefined)
      r.vendorContactId = dto.vendorContactId ?? null
    if (dto.odometer !== undefined) r.odometer = dto.odometer ?? null
    if (dto.description !== undefined) r.description = dto.description ?? null
    if (dto.nextDueDate !== undefined) r.nextDueDate = dto.nextDueDate ?? null
    if (dto.nextDueOdometer !== undefined)
      r.nextDueOdometer = dto.nextDueOdometer ?? null
    if (dto.notes !== undefined) r.notes = dto.notes ?? null
    const saved = await this.records.save(r)
    return (await this.enrich([saved]))[0]
  }

  async remove(id: string): Promise<void> {
    const r = await this.findOrFail(id)
    await this.records.remove(r)
  }

  private async findOrFail(id: string): Promise<AssetMaintenance> {
    const r = await this.records.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Bakım kaydı bulunamadı')
    return r
  }

  private async assetOrFail(id: string): Promise<Asset> {
    const a = await this.assets.findOne({ where: { id } })
    if (!a) throw new NotFoundException('Demirbaş bulunamadı')
    return a
  }

  private async enrich(
    rows: AssetMaintenance[],
  ): Promise<AssetMaintenanceDto[]> {
    const summaries = await this.assetSummaries(rows.map((r) => r.assetId))
    return rows.map((r) => toMaintenanceDto(r, summaries.get(r.assetId) ?? null))
  }

  private async assetSummaries(
    ids: string[],
  ): Promise<Map<string, AssetSummary>> {
    const unique = [...new Set(ids)]
    const map = new Map<string, AssetSummary>()
    if (unique.length === 0) return map
    const rows = await this.assets.find({ where: { id: In(unique) } })
    for (const a of rows) map.set(a.id, toAssetSummary(a))
    return map
  }
}
