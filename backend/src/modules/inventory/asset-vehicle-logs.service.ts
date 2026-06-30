import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  AssetSummary,
  AssetVehicleLogDto,
  AssetVehicleLogListQuery,
} from '@turbohesap/shared'

import { Employee } from '../hr/entities/employee.entity'
import { Asset } from './entities/asset.entity'
import { AssetVehicleLog } from './entities/asset-vehicle-log.entity'
import type {
  CreateAssetVehicleLogDto,
  UpdateAssetVehicleLogDto,
} from './dto/asset-vehicle-log.dto'
import {
  employeeDisplayName,
  toAssetSummary,
  toVehicleLogDto,
} from './asset.mappers'

@Injectable()
export class AssetVehicleLogsService {
  constructor(
    @InjectRepository(AssetVehicleLog)
    private readonly logs: Repository<AssetVehicleLog>,
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  async list(
    query: AssetVehicleLogListQuery = {},
  ): Promise<AssetVehicleLogDto[]> {
    const where: Record<string, unknown> = {}
    if (query.assetId) where.assetId = query.assetId
    if (query.kind) where.kind = query.kind
    const rows = await this.logs.find({
      where,
      order: { date: 'DESC', odometer: 'DESC' },
    })
    return this.enrich(rows)
  }

  async get(id: string): Promise<AssetVehicleLogDto> {
    const r = await this.findOrFail(id)
    return (await this.enrich([r]))[0]
  }

  async create(dto: CreateAssetVehicleLogDto): Promise<AssetVehicleLogDto> {
    const asset = await this.assetOrFail(dto.assetId)
    let driverName: string | null = null
    if (dto.driverEmployeeId) {
      const e = await this.employees.findOne({
        where: { id: dto.driverEmployeeId },
      })
      driverName = e ? employeeDisplayName(e) : null
    }
    const created = this.logs.create({
      assetId: asset.id,
      kind: dto.kind,
      date: dto.date,
      odometer: dto.odometer,
      liters: dto.liters ?? null,
      unitPrice: dto.unitPrice ?? null,
      totalCost: dto.totalCost ?? null,
      currency: dto.currency ?? 'TRY',
      fuelTypeKey: dto.fuelTypeKey ?? null,
      isFull: dto.isFull ?? false,
      station: dto.station ?? null,
      driverEmployeeId: dto.driverEmployeeId ?? null,
      driverEmployeeName: driverName,
      notes: dto.notes ?? null,
    })
    const saved = await this.logs.save(created)
    await this.refreshOdometer(asset.id)
    return toVehicleLogDto(saved, toAssetSummary(asset))
  }

  async update(
    id: string,
    dto: UpdateAssetVehicleLogDto,
  ): Promise<AssetVehicleLogDto> {
    const r = await this.findOrFail(id)
    if (dto.kind !== undefined) r.kind = dto.kind
    if (dto.date !== undefined) r.date = dto.date
    if (dto.odometer !== undefined) r.odometer = dto.odometer
    if (dto.liters !== undefined) r.liters = dto.liters ?? null
    if (dto.unitPrice !== undefined) r.unitPrice = dto.unitPrice ?? null
    if (dto.totalCost !== undefined) r.totalCost = dto.totalCost ?? null
    if (dto.currency !== undefined) r.currency = dto.currency ?? 'TRY'
    if (dto.fuelTypeKey !== undefined) r.fuelTypeKey = dto.fuelTypeKey ?? null
    if (dto.isFull !== undefined) r.isFull = dto.isFull ?? false
    if (dto.station !== undefined) r.station = dto.station ?? null
    if (dto.driverEmployeeId !== undefined) {
      r.driverEmployeeId = dto.driverEmployeeId ?? null
      if (dto.driverEmployeeId) {
        const e = await this.employees.findOne({
          where: { id: dto.driverEmployeeId },
        })
        r.driverEmployeeName = e ? employeeDisplayName(e) : null
      } else {
        r.driverEmployeeName = null
      }
    }
    if (dto.notes !== undefined) r.notes = dto.notes ?? null
    const saved = await this.logs.save(r)
    await this.refreshOdometer(r.assetId)
    return (await this.enrich([saved]))[0]
  }

  async remove(id: string): Promise<void> {
    const r = await this.findOrFail(id)
    const assetId = r.assetId
    await this.logs.remove(r)
    await this.refreshOdometer(assetId)
  }

  // Re-derive the asset's currentOdometer as the max odometer across its logs.
  private async refreshOdometer(assetId: string): Promise<void> {
    const row = await this.logs
      .createQueryBuilder('l')
      .select('MAX(l.odometer)', 'max')
      .where('l.assetId = :assetId', { assetId })
      .getRawOne<{ max: string | null }>()
    const max = row?.max == null ? null : Number(row.max)
    await this.assets.update({ id: assetId }, { currentOdometer: max })
  }

  private async findOrFail(id: string): Promise<AssetVehicleLog> {
    const r = await this.logs.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Araç kaydı bulunamadı')
    return r
  }

  private async assetOrFail(id: string): Promise<Asset> {
    const a = await this.assets.findOne({ where: { id } })
    if (!a) throw new NotFoundException('Demirbaş bulunamadı')
    return a
  }

  private async enrich(
    rows: AssetVehicleLog[],
  ): Promise<AssetVehicleLogDto[]> {
    const summaries = await this.assetSummaries(rows.map((r) => r.assetId))
    return rows.map((r) => toVehicleLogDto(r, summaries.get(r.assetId) ?? null))
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
