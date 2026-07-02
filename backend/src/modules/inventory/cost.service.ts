import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, IsNull, Repository } from 'typeorm'

import type { ProductCostDto } from '@turbohesap/shared'

import { ProductCost } from './entities/product-cost.entity'

export interface MovingAverageInput {
  productId: string
  variantId?: string | null
  branchId?: string | null
  /** On-hand quantity BEFORE this inbound (clamped to >= 0 internally). */
  priorQty: number
  inboundQty: number
  inboundUnitCost: number
}

// Ürün maliyeti (AVCO / hareketli ortalama). Her birim maliyetli 'in' hareketinde
// ortalama güncellenir: newAvg = (priorQty*oldAvg + inQty*inCost) / (priorQty+inQty).
// 'out' hareketleri mevcut ortalamadan değerlenir (ortalamayı değiştirmez) — bunu
// çağıran taraf getUnitCost ile alır.
@Injectable()
export class CostService {
  constructor(
    @InjectRepository(ProductCost) private readonly costs: Repository<ProductCost>,
  ) {}

  /** Current moving-average unit cost (0 if unknown). Pass `em` to read inside a txn. */
  async getUnitCost(
    productId: string,
    variantId?: string | null,
    branchId?: string | null,
    em?: EntityManager,
  ): Promise<number> {
    const repo = em ? em.getRepository(ProductCost) : this.costs
    const row = await repo.findOne({
      where: { productId, variantId: variantId ?? IsNull(), branchId: branchId ?? IsNull() },
    })
    return row?.avgCost ?? 0
  }

  async get(productId: string, variantId?: string | null, branchId?: string | null): Promise<ProductCostDto> {
    const row = await this.costs.findOne({
      where: { productId, variantId: variantId ?? IsNull(), branchId: branchId ?? IsNull() },
    })
    return {
      productId,
      variantId: variantId ?? null,
      branchId: branchId ?? null,
      method: row?.method ?? 'moving_avg',
      unitCost: row?.avgCost ?? 0,
      currency: row?.currency ?? 'TRY',
      asOf: (row?.updatedAt ?? new Date()).toISOString(),
    }
  }

  /** Apply a moving-average update for an inbound. Must run inside a transaction. */
  async applyMovingAverage(em: EntityManager, input: MovingAverageInput): Promise<number> {
    const repo = em.getRepository(ProductCost)
    let row = await repo.findOne({
      where: {
        productId: input.productId,
        variantId: input.variantId ?? IsNull(),
        branchId: input.branchId ?? IsNull(),
      },
    })
    if (!row) {
      row = repo.create({
        productId: input.productId,
        variantId: input.variantId ?? null,
        branchId: input.branchId ?? null,
        method: 'moving_avg',
        avgCost: 0,
        currency: 'TRY',
      })
    }
    const prior = Math.max(0, input.priorQty)
    const newQty = prior + input.inboundQty
    row.avgCost = newQty > 0 ? (prior * row.avgCost + input.inboundQty * input.inboundUnitCost) / newQty : input.inboundUnitCost
    await repo.save(row)
    return row.avgCost
  }
}
