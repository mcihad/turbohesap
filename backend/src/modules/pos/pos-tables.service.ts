import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  PosFloorDto,
  PosFloorLayoutDto,
  PosTableDto,
  PosTableWithStatus,
  TableListQuery,
} from '@turbohesap/shared'

import { PosFloor } from './entities/pos-floor.entity'
import { PosTable } from './entities/pos-table.entity'
import { PosOrder } from './entities/pos-order.entity'
import type {
  CreatePosFloorDto,
  CreatePosTableDto,
  UpdatePosFloorDto,
  UpdatePosTableDto,
} from './dto/pos-table.dto'

@Injectable()
export class PosTablesService {
  constructor(
    @InjectRepository(PosFloor) private readonly floors: Repository<PosFloor>,
    @InjectRepository(PosTable) private readonly tables: Repository<PosTable>,
    @InjectRepository(PosOrder) private readonly orders: Repository<PosOrder>,
  ) {}

  // ── floors ──
  async listFloors(branchId?: string): Promise<PosFloorDto[]> {
    const where = branchId ? { branchId } : {}
    const rows = await this.floors.find({ where, order: { sortOrder: 'ASC', name: 'ASC' } })
    return rows.map(toFloorDto)
  }
  async createFloor(dto: CreatePosFloorDto): Promise<PosFloorDto> {
    const saved = await this.floors.save(
      this.floors.create({
        name: dto.name.trim(),
        branchId: dto.branchId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    )
    return toFloorDto(saved)
  }
  async updateFloor(id: string, dto: UpdatePosFloorDto): Promise<PosFloorDto> {
    const f = await this.floorOrFail(id)
    if (dto.name !== undefined) f.name = dto.name.trim()
    if (dto.branchId !== undefined) f.branchId = dto.branchId
    if (dto.sortOrder !== undefined) f.sortOrder = dto.sortOrder
    if (dto.isActive !== undefined) f.isActive = dto.isActive
    return toFloorDto(await this.floors.save(f))
  }
  async removeFloor(id: string): Promise<void> {
    await this.floorOrFail(id)
    await this.tables.delete({ floorId: id })
    await this.floors.delete({ id })
  }

  // ── tables ──
  async listTables(query?: TableListQuery): Promise<PosTableDto[]> {
    const where: Record<string, unknown> = {}
    if (query?.branchId) where.branchId = query.branchId
    if (query?.floorId) where.floorId = query.floorId
    const rows = await this.tables.find({ where, order: { sortOrder: 'ASC', name: 'ASC' } })
    return rows.map(toTableDto)
  }
  async createTable(dto: CreatePosTableDto): Promise<PosTableDto> {
    const floor = await this.floorOrFail(dto.floorId)
    const saved = await this.tables.save(
      this.tables.create({
        floorId: floor.id,
        branchId: floor.branchId,
        name: dto.name.trim(),
        seats: dto.seats ?? 0,
        posX: dto.posX ?? 0,
        posY: dto.posY ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    )
    return toTableDto(saved)
  }
  async updateTable(id: string, dto: UpdatePosTableDto): Promise<PosTableDto> {
    const tbl = await this.tableOrFail(id)
    if (dto.floorId !== undefined) {
      const floor = await this.floorOrFail(dto.floorId)
      tbl.floorId = floor.id
      tbl.branchId = floor.branchId
    }
    if (dto.name !== undefined) tbl.name = dto.name.trim()
    if (dto.seats !== undefined) tbl.seats = dto.seats
    if (dto.posX !== undefined) tbl.posX = dto.posX
    if (dto.posY !== undefined) tbl.posY = dto.posY
    if (dto.sortOrder !== undefined) tbl.sortOrder = dto.sortOrder
    if (dto.isActive !== undefined) tbl.isActive = dto.isActive
    return toTableDto(await this.tables.save(tbl))
  }
  async removeTable(id: string): Promise<void> {
    await this.tableOrFail(id)
    await this.tables.delete({ id })
  }

  // ── floor map (tables + live occupancy) ──
  async layout(branchId?: string): Promise<PosFloorLayoutDto[]> {
    const floors = await this.floors.find({
      where: branchId ? { branchId, isActive: true } : { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
    if (floors.length === 0) return []
    const floorIds = floors.map((f) => f.id)
    const tables = await this.tables.find({
      where: { floorId: In(floorIds), isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
    const tableIds = tables.map((t) => t.id)
    // Open orders currently seated at these tables.
    const openOrders = tableIds.length
      ? await this.orders.find({ where: { tableId: In(tableIds), status: 'open' } })
      : []
    const byTable = new Map<string, PosOrder>()
    for (const o of openOrders) {
      if (o.tableId && !byTable.has(o.tableId)) byTable.set(o.tableId, o)
    }
    return floors.map((f) => ({
      id: f.id,
      name: f.name,
      branchId: f.branchId,
      sortOrder: f.sortOrder,
      tables: tables
        .filter((t) => t.floorId === f.id)
        .map((t): PosTableWithStatus => {
          const order = byTable.get(t.id) ?? null
          return {
            ...toTableDto(t),
            openOrderId: order?.id ?? null,
            openOrderNo: order?.orderNo ?? null,
            openTotal: order?.grandTotal ?? 0,
          }
        }),
    }))
  }

  private async floorOrFail(id: string): Promise<PosFloor> {
    const f = await this.floors.findOne({ where: { id } })
    if (!f) throw new NotFoundException('Kat bulunamadı')
    return f
  }
  private async tableOrFail(id: string): Promise<PosTable> {
    const t = await this.tables.findOne({ where: { id } })
    if (!t) throw new NotFoundException('Masa bulunamadı')
    return t
  }
}

function toFloorDto(f: PosFloor): PosFloorDto {
  return {
    id: f.id,
    name: f.name,
    branchId: f.branchId,
    sortOrder: f.sortOrder,
    isActive: f.isActive,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }
}

function toTableDto(t: PosTable): PosTableDto {
  return {
    id: t.id,
    floorId: t.floorId,
    branchId: t.branchId,
    name: t.name,
    seats: t.seats,
    posX: t.posX,
    posY: t.posY,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
