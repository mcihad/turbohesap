import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  LotDto,
  LotLinkDto,
  LotListQuery,
  LotRef,
  LotRole,
  LotTraceDto,
} from '@turbohesap/shared'

import { Product } from '../inventory/entities/product.entity'
import { ProductionOrder } from './entities/production-order.entity'
import { Lot } from './entities/lot.entity'
import { ManufacturingOrderLot } from './entities/manufacturing-order-lot.entity'
import type { CreateLotDto, RegisterLotDto } from './dto/lot.dto'

@Injectable()
export class LotsService {
  constructor(
    @InjectRepository(Lot) private readonly lots: Repository<Lot>,
    @InjectRepository(ManufacturingOrderLot) private readonly links: Repository<ManufacturingOrderLot>,
    @InjectRepository(ProductionOrder) private readonly orders: Repository<ProductionOrder>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async list(query: LotListQuery = {}): Promise<LotDto[]> {
    const where: Record<string, unknown> = {}
    if (query.productId) where.productId = query.productId
    if (query.lotNo) where.lotNo = query.lotNo
    const rows = await this.lots.find({ where, order: { createdAt: 'DESC' } })
    return this.toLotDtos(rows)
  }

  async create(dto: CreateLotDto): Promise<LotDto> {
    const lot = await this.findOrCreate(dto.productId, dto.lotNo, dto.kind ?? 'lot', dto.variantId ?? null, dto.notes ?? null)
    return (await this.toLotDtos([lot]))[0]
  }

  async registerConsumption(dto: RegisterLotDto): Promise<LotLinkDto> {
    return this.register(dto, 'consumed')
  }

  async registerOutput(dto: RegisterLotDto): Promise<LotLinkDto> {
    return this.register(dto, 'produced')
  }

  async linksForOrder(manufacturingOrderId: string): Promise<LotLinkDto[]> {
    const rows = await this.links.find({ where: { manufacturingOrderId }, order: { createdAt: 'ASC' } })
    return this.toLinkDtos(rows)
  }

  // İki yönlü şecere: bu lotu üreten emirlerin tükettiği lotlar + bu lotu tüketen
  // emirlerin ürettiği lotlar (geri çağırma).
  async trace(lotId: string): Promise<LotTraceDto> {
    const lot = await this.lots.findOne({ where: { id: lotId } })
    if (!lot) throw new NotFoundException('Lot bulunamadı')

    const direct = await this.links.find({ where: { lotId } })
    const producedMoIds = [...new Set(direct.filter((l) => l.role === 'produced').map((l) => l.manufacturingOrderId))]
    const consumedMoIds = [...new Set(direct.filter((l) => l.role === 'consumed').map((l) => l.manufacturingOrderId))]

    const allMoIds = [...new Set([...producedMoIds, ...consumedMoIds])]
    const related = allMoIds.length ? await this.links.find({ where: { manufacturingOrderId: In(allMoIds) } }) : []
    const lotIds = [...new Set(related.map((r) => r.lotId))]
    const lotRows = lotIds.length ? await this.lots.find({ where: { id: In(lotIds) } }) : []
    const lotMap = new Map(lotRows.map((l) => [l.id, l]))
    const productMap = await this.productNames([...new Set(lotRows.map((l) => l.productId))])
    const moMap = await this.moNos(allMoIds)

    const refsFor = (moId: string, role: LotRole): LotRef[] =>
      related
        .filter((r) => r.manufacturingOrderId === moId && r.role === role)
        .map((r) => {
          const l = lotMap.get(r.lotId)
          return {
            lotId: r.lotId,
            lotNo: l?.lotNo ?? '',
            productId: r.productId,
            productName: productMap.get(r.productId) ?? '',
            quantity: r.quantity,
          }
        })

    const [lotDto] = await this.toLotDtos([lot])
    return {
      lot: lotDto,
      producedFrom: producedMoIds.map((moId) => ({
        manufacturingOrderId: moId,
        manufacturingOrderNo: moMap.get(moId) ?? '',
        consumedLots: refsFor(moId, 'consumed'),
      })),
      consumedInto: consumedMoIds.map((moId) => ({
        manufacturingOrderId: moId,
        manufacturingOrderNo: moMap.get(moId) ?? '',
        producedLots: refsFor(moId, 'produced'),
      })),
    }
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async register(dto: RegisterLotDto, role: LotRole): Promise<LotLinkDto> {
    if (!(await this.orders.exists({ where: { id: dto.manufacturingOrderId } }))) {
      throw new NotFoundException('Üretim emri bulunamadı')
    }
    if (!(dto.quantity > 0)) throw new BadRequestException('Miktar 0’dan büyük olmalı')
    const lot = await this.findOrCreate(dto.productId, dto.lotNo, dto.kind ?? 'lot', dto.variantId ?? null, null)
    const link = await this.links.save(
      this.links.create({
        manufacturingOrderId: dto.manufacturingOrderId,
        lotId: lot.id,
        role,
        productId: dto.productId,
        quantity: dto.quantity,
      }),
    )
    return (await this.toLinkDtos([link]))[0]
  }

  private async findOrCreate(
    productId: string,
    lotNo: string,
    kind: 'lot' | 'serial',
    variantId: string | null,
    notes: string | null,
  ): Promise<Lot> {
    if (!(await this.products.exists({ where: { id: productId } }))) throw new NotFoundException('Ürün bulunamadı')
    const existing = await this.lots.findOne({ where: { productId, lotNo } })
    if (existing) return existing
    return this.lots.save(this.lots.create({ productId, lotNo, kind, variantId, notes }))
  }

  private async toLotDtos(rows: Lot[]): Promise<LotDto[]> {
    if (rows.length === 0) return []
    const names = await this.productNames([...new Set(rows.map((r) => r.productId))])
    return rows.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: names.get(l.productId) ?? '',
      variantId: l.variantId,
      lotNo: l.lotNo,
      kind: l.kind,
      notes: l.notes,
      createdAt: l.createdAt.toISOString(),
    }))
  }

  private async toLinkDtos(rows: ManufacturingOrderLot[]): Promise<LotLinkDto[]> {
    if (rows.length === 0) return []
    const lotRows = await this.lots.find({ where: { id: In([...new Set(rows.map((r) => r.lotId))]) } })
    const lotMap = new Map(lotRows.map((l) => [l.id, l]))
    const names = await this.productNames([...new Set(rows.map((r) => r.productId))])
    const moMap = await this.moNos([...new Set(rows.map((r) => r.manufacturingOrderId))])
    return rows.map((r) => ({
      id: r.id,
      manufacturingOrderId: r.manufacturingOrderId,
      manufacturingOrderNo: moMap.get(r.manufacturingOrderId) ?? '',
      lotId: r.lotId,
      lotNo: lotMap.get(r.lotId)?.lotNo ?? '',
      role: r.role,
      productId: r.productId,
      productName: names.get(r.productId) ?? '',
      quantity: r.quantity,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  private async productNames(ids: string[]): Promise<Map<string, string>> {
    const m = new Map<string, string>()
    if (ids.length === 0) return m
    const rows = await this.products.find({ where: { id: In(ids) }, select: { id: true, name: true } })
    for (const p of rows) m.set(p.id, p.name)
    return m
  }
  private async moNos(ids: string[]): Promise<Map<string, string>> {
    const m = new Map<string, string>()
    if (ids.length === 0) return m
    const rows = await this.orders.find({ where: { id: In(ids) }, select: { id: true, orderNo: true } })
    for (const o of rows) m.set(o.id, o.orderNo)
    return m
  }
}
