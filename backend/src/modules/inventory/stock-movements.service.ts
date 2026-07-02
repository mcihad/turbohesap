import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, Repository } from 'typeorm'

import type {
  MovementDirection,
  StockMovementDto,
  StockMovementListQuery,
} from '@turbohesap/shared'

import { StockMovement } from './entities/stock-movement.entity'
import { StockMovementType } from './entities/stock-movement-type.entity'
import { ProductStock } from './entities/product-stock.entity'
import { Product } from './entities/product.entity'
import { Branch } from '../org/entities/branch.entity'
import type { CreateStockMovementDto } from './dto/stock-movement.dto'
import { CostService } from './cost.service'

export interface PostMovementParams {
  productId: string
  variantId?: string | null
  branchId?: string | null
  movementTypeId: string
  direction: MovementDirection
  quantity: number
  date: string
  description?: string | null
  sourceModule?: string | null
  sourceId?: string | null
  unit?: string
  /** Unit cost for valuation. On 'in' with a cost, feeds AVCO moving-average. */
  unitCost?: number | null
}

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>,
    @InjectRepository(StockMovementType) private readonly types: Repository<StockMovementType>,
    @InjectRepository(ProductStock) private readonly stocks: Repository<ProductStock>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly cost: CostService,
  ) {}

  async list(query?: StockMovementListQuery): Promise<StockMovementDto[]> {
    const qb = this.movements.createQueryBuilder('m')
    if (query?.productId) qb.andWhere('m.productId = :productId', { productId: query.productId })
    if (query?.branchId) qb.andWhere('m.branchId = :branchId', { branchId: query.branchId })
    if (query?.from) qb.andWhere('m.date >= :from', { from: query.from })
    if (query?.to) qb.andWhere('m.date <= :to', { to: query.to })
    qb.orderBy('m.date', 'DESC').addOrderBy('m.createdAt', 'DESC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []
    const typeIds = [...new Set(rows.map((r) => r.movementTypeId))]
    const branchIds = [...new Set(rows.map((r) => r.branchId).filter((x): x is string => !!x))]
    const [types, branches] = await Promise.all([
      this.types.find({ where: { id: In(typeIds) } }),
      branchIds.length ? this.branches.find({ where: { id: In(branchIds) } }) : Promise.resolve([]),
    ])
    const typeMap = new Map(types.map((t) => [t.id, t.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))
    return rows.map((m) => toMovementDto(m, typeMap.get(m.movementTypeId) ?? '', m.branchId ? branchMap.get(m.branchId) ?? null : null))
  }

  async create(dto: CreateStockMovementDto): Promise<StockMovementDto> {
    if (!(await this.products.findOne({ where: { id: dto.productId } }))) {
      throw new NotFoundException('Ürün bulunamadı')
    }
    const type = await this.types.findOne({ where: { id: dto.movementTypeId } })
    if (!type) throw new BadRequestException('Geçersiz hareket tipi')
    if ((dto.quantity ?? 0) <= 0) throw new BadRequestException('Miktar girilmelidir')
    if (dto.branchId && !(await this.branches.findOne({ where: { id: dto.branchId } }))) {
      throw new BadRequestException('Geçersiz şube')
    }

    const saved = await this.movements.manager.transaction((em) =>
      this.post(em, {
        productId: dto.productId,
        variantId: dto.variantId ?? null,
        branchId: dto.branchId ?? null,
        movementTypeId: type.id,
        direction: type.direction,
        quantity: dto.quantity,
        date: dto.date ?? new Date().toISOString().slice(0, 10),
        description: dto.description ?? null,
        unitCost: dto.unitCost ?? null,
      }),
    )
    const branch = saved.branchId ? await this.branches.findOne({ where: { id: saved.branchId } }) : null
    return toMovementDto(saved, type.name, branch?.name ?? null)
  }

  async remove(id: string): Promise<void> {
    const m = await this.movements.findOne({ where: { id } })
    if (!m) throw new NotFoundException('Hareket bulunamadı')
    await this.movements.manager.transaction(async (em) => {
      await this.adjustOnHand(em, m, m.direction === 'in' ? -m.quantity : m.quantity)
      await em.getRepository(StockMovement).delete({ id })
    })
  }

  // ── helpers reused by other modules (invoices) within a transaction ─────────
  /** Create a movement row and apply its on-hand effect (+ AVCO on costed inbound). */
  async post(em: EntityManager, params: PostMovementParams): Promise<StockMovement> {
    const repo = em.getRepository(StockMovement)
    const movement = repo.create({
      productId: params.productId,
      variantId: params.variantId ?? null,
      branchId: params.branchId ?? null,
      movementTypeId: params.movementTypeId,
      direction: params.direction,
      quantity: params.quantity,
      unit: params.unit ?? 'Adet',
      unitCost: params.unitCost ?? null,
      date: params.date,
      description: params.description ?? null,
      sourceModule: params.sourceModule ?? null,
      sourceId: params.sourceId ?? null,
    })
    const saved = await repo.save(movement)
    // Capture on-hand BEFORE the adjustment so the moving-average weights are right.
    const priorQty = await this.currentOnHand(em, saved.productId, saved.variantId, saved.branchId)
    await this.adjustOnHand(em, saved, saved.direction === 'in' ? saved.quantity : -saved.quantity)
    if (saved.direction === 'in' && params.unitCost != null) {
      await this.cost.applyMovingAverage(em, {
        productId: saved.productId,
        variantId: saved.variantId,
        branchId: saved.branchId,
        priorQty,
        inboundQty: saved.quantity,
        inboundUnitCost: params.unitCost,
      })
    }
    return saved
  }

  private async currentOnHand(
    em: EntityManager,
    productId: string,
    variantId: string | null,
    branchId: string | null,
  ): Promise<number> {
    const row = await em.getRepository(ProductStock).findOne({
      where: { productId, variantId: variantId ?? IsNull(), branchId: branchId ?? IsNull() },
    })
    return row?.quantity ?? 0
  }

  /** Reverse and delete all movements posted by a source document. */
  async reverseSource(em: EntityManager, sourceModule: string, sourceId: string): Promise<void> {
    const repo = em.getRepository(StockMovement)
    const rows = await repo.find({ where: { sourceModule, sourceId } })
    for (const m of rows) {
      await this.adjustOnHand(em, m, m.direction === 'in' ? -m.quantity : m.quantity)
    }
    if (rows.length) await repo.delete({ sourceModule, sourceId })
  }

  private async adjustOnHand(em: EntityManager, m: StockMovement, delta: number): Promise<void> {
    const repo = em.getRepository(ProductStock)
    let row = await repo.findOne({
      where: {
        productId: m.productId,
        variantId: m.variantId ?? IsNull(),
        branchId: m.branchId ?? IsNull(),
      },
    })
    if (!row) {
      row = repo.create({ productId: m.productId, variantId: m.variantId ?? null, branchId: m.branchId ?? null, quantity: 0 })
    }
    row.quantity += delta
    await repo.save(row)
  }
}

export function toMovementDto(m: StockMovement, typeName: string, branchName: string | null): StockMovementDto {
  return {
    id: m.id,
    productId: m.productId,
    variantId: m.variantId,
    variantLabel: null,
    branchId: m.branchId,
    branchName,
    movementTypeId: m.movementTypeId,
    movementTypeName: typeName,
    direction: m.direction,
    quantity: m.quantity,
    unit: m.unit,
    unitCost: m.unitCost,
    date: m.date,
    description: m.description,
    sourceModule: m.sourceModule,
    sourceId: m.sourceId,
    createdAt: m.createdAt.toISOString(),
  }
}
