import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ModuleStatsDto, StatPoint, StatsQuery } from '@turbohesap/shared'

import { CACHE_DRIVER, type CacheDriver } from '../../cache/cache.driver'
import { Category } from '../inventory/entities/category.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductStock } from '../inventory/entities/product-stock.entity'
import { StockMovement } from '../inventory/entities/stock-movement.entity'
import {
  bucketKey,
  cacheKeyFor,
  num,
  reportsTtl,
  resolveRange,
  round2,
  type ResolvedRange,
} from './reports.util'

@Injectable()
export class InventoryStatsService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cache: CacheDriver,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductStock) private readonly stocks: Repository<ProductStock>,
    @InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
  ) {}

  async stats(query?: StatsQuery): Promise<ModuleStatsDto> {
    const r = resolveRange(query)
    return this.cache.wrap(cacheKeyFor('inventory', r), reportsTtl(), () => this.compute(r))
  }

  private async compute(r: ResolvedRange): Promise<ModuleStatsDto> {
    const { from, to, granularity, branchId } = r

    // Per-product on-hand totals (branch-aware) from product_stocks.
    const stockQb = this.stocks
      .createQueryBuilder('s')
      .select('s.productId', 'productId')
      .addSelect('COALESCE(SUM(s.quantity), 0)', 'qty')
      .groupBy('s.productId')
    if (branchId) stockQb.where('s.branchId = :branchId', { branchId })
    const stockRows = await stockQb.getRawMany<{ productId: string; qty: string }>()
    const onHand = new Map(stockRows.map((x) => [x.productId, num(x.qty)]))

    const products = await this.products.find()
    let stockValue = 0
    let lowStock = 0
    let outOfStock = 0
    const byCategory = new Map<string | null, number>()
    for (const p of products) {
      const qty = onHand.get(p.id) ?? 0
      const value = qty * num(p.salePrice)
      stockValue += value
      byCategory.set(p.categoryId, (byCategory.get(p.categoryId) ?? 0) + value)
      if (p.trackStock) {
        if (qty <= 0) outOfStock += 1
        else if (qty <= num(p.minQuantity)) lowStock += 1
      }
    }

    // Trend — stock movements in vs out over the range.
    const movQb = this.movements
      .createQueryBuilder('m')
      .select('m.date', 'period')
      .addSelect('m.direction', 'direction')
      .addSelect('COALESCE(SUM(m.quantity), 0)', 'qty')
      .where('m.date BETWEEN :from AND :to', { from, to })
      .groupBy('m.date')
      .addGroupBy('m.direction')
    if (branchId) movQb.andWhere('m.branchId = :branchId', { branchId })
    const movRows = await movQb.getRawMany<{ period: string; direction: string; qty: string }>()
    const trendMap = new Map<string, StatPoint>()
    for (const row of movRows) {
      const key = bucketKey(String(row.period).slice(0, 10), granularity)
      const p = trendMap.get(key) ?? { period: key, value: 0, value2: 0 }
      if (row.direction === 'in') p.value = round2((p.value ?? 0) + num(row.qty))
      else p.value2 = round2((p.value2 ?? 0) + num(row.qty))
      trendMap.set(key, p)
    }
    const points = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period))

    // Category names for the breakdown.
    const categoryNames = await this.categoryNameMap([...byCategory.keys()])
    const categoryData = [...byCategory.entries()]
      .map(([cid, value]) => ({
        name: cid ? (categoryNames.get(cid) ?? 'Bilinmeyen') : 'Kategorisiz',
        value: round2(value),
      }))
      .filter((x) => x.value !== 0)
      .sort((a, b) => b.value - a.value)

    // Top moved products by total movement quantity.
    const topQb = this.movements
      .createQueryBuilder('m')
      .select('m.productId', 'productId')
      .addSelect('COALESCE(SUM(m.quantity), 0)', 'qty')
      .where('m.date BETWEEN :from AND :to', { from, to })
      .groupBy('m.productId')
      .orderBy('qty', 'DESC')
      .limit(10)
    if (branchId) topQb.andWhere('m.branchId = :branchId', { branchId })
    const topRows = await topQb.getRawMany<{ productId: string; qty: string }>()
    const productNames = await this.productNameMap(topRows.map((x) => x.productId))

    return {
      module: 'inventory',
      from,
      to,
      granularity,
      currency: 'TRY',
      kpis: [
        { key: 'stockValue', label: 'Stok değeri', value: round2(stockValue), unit: 'money', tone: 'primary' },
        { key: 'productCount', label: 'Ürün sayısı', value: products.length, unit: 'count' },
        { key: 'lowStock', label: 'Kritik stok', value: lowStock, unit: 'count', tone: 'warning' },
        { key: 'outOfStock', label: 'Tükenen', value: outOfStock, unit: 'count', tone: 'destructive' },
      ],
      trend: { key: 'movements', label: 'Stok giriş', unit: 'qty', label2: 'Stok çıkış', points },
      breakdowns: [
        { key: 'category', label: 'Kategoriye göre stok değeri', chart: 'bar', unit: 'money', data: categoryData },
      ],
      topLists: [
        {
          key: 'mostMoved',
          label: 'En çok hareket gören ürünler',
          unit: 'qty',
          rows: topRows.map((t) => ({
            id: t.productId,
            name: productNames.get(t.productId) ?? 'Bilinmeyen ürün',
            value: round2(num(t.qty)),
          })),
        },
      ],
    }
  }

  private async categoryNameMap(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))]
    if (unique.length === 0) return new Map()
    const rows = await this.categories.find({ where: { id: In(unique) } })
    return new Map(rows.map((x) => [x.id, x.name]))
  }

  private async productNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map()
    const rows = await this.products.find({ where: { id: In(unique) } })
    return new Map(rows.map((x) => [x.id, x.name]))
  }
}
