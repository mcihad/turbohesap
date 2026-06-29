import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ModuleStatsDto, StatPoint, StatsQuery } from '@turbohesap/shared'

import { CACHE_DRIVER, type CacheDriver } from '../../cache/cache.driver'
import { PosOrder } from '../pos/entities/pos-order.entity'
import { PosOrderLine } from '../pos/entities/pos-order-line.entity'
import { PosPayment } from '../pos/entities/pos-payment.entity'
import { PosRegister } from '../pos/entities/pos-register.entity'
import { Product } from '../inventory/entities/product.entity'
import {
  bucketKey,
  cacheKeyFor,
  num,
  reportsTtl,
  resolveRange,
  round2,
  type ResolvedRange,
} from './reports.util'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kart',
  account: 'Cari',
  other: 'Diğer',
}

@Injectable()
export class PosStatsService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cache: CacheDriver,
    @InjectRepository(PosOrder) private readonly orders: Repository<PosOrder>,
    @InjectRepository(PosOrderLine) private readonly lines: Repository<PosOrderLine>,
    @InjectRepository(PosPayment) private readonly payments: Repository<PosPayment>,
    @InjectRepository(PosRegister) private readonly registers: Repository<PosRegister>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async stats(query?: StatsQuery): Promise<ModuleStatsDto> {
    const r = resolveRange(query)
    return this.cache.wrap(cacheKeyFor('pos', r), reportsTtl(), () => this.compute(r))
  }

  private async compute(r: ResolvedRange): Promise<ModuleStatsDto> {
    const { from, to, granularity, branchId } = r

    // Base filter: paid orders within range (+ optional branch).
    const base = () => {
      const qb = this.orders
        .createQueryBuilder('o')
        .where("o.status = 'paid'")
        .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
      if (branchId) qb.andWhere('o.branchId = :branchId', { branchId })
      return qb
    }

    // KPIs.
    const totals = await base()
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .getRawOne<{ revenue: string; orders: string }>()
    const revenue = round2(num(totals?.revenue))
    const orderCount = num(totals?.orders)
    const avgBasket = orderCount > 0 ? round2(revenue / orderCount) : 0

    const returnsRow = await this.lines
      .createQueryBuilder('l')
      .innerJoin(PosOrder, 'o', 'o.id = l.orderId')
      .select('COALESCE(SUM(l.returnedQty), 0)', 'qty')
      .where("o.status = 'paid'")
      .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
      .andWhere(branchId ? 'o.branchId = :branchId' : '1=1', branchId ? { branchId } : {})
      .getRawOne<{ qty: string }>()

    // Trend — revenue per day, bucketed.
    const trendRows = await base()
      .select(`to_char(o."created_at", 'YYYY-MM-DD')`, 'period')
      .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'value')
      .groupBy('period')
      .getRawMany<{ period: string; value: string }>()
    const trendMap = new Map<string, StatPoint>()
    for (const row of trendRows) {
      const key = bucketKey(row.period, granularity)
      const p = trendMap.get(key) ?? { period: key, value: 0 }
      p.value = round2(p.value + num(row.value))
      trendMap.set(key, p)
    }
    const points = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period))

    // Breakdown — payment method.
    const methodRows = await this.payments
      .createQueryBuilder('p')
      .innerJoin(PosOrder, 'o', 'o.id = p.orderId')
      .select('p.method', 'method')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'value')
      .where("o.status = 'paid'")
      .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
      .andWhere(branchId ? 'o.branchId = :branchId' : '1=1', branchId ? { branchId } : {})
      .groupBy('p.method')
      .getRawMany<{ method: string; value: string }>()

    // Breakdown — register.
    const registerRows = await base()
      .select('o.registerId', 'registerId')
      .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'value')
      .groupBy('o.registerId')
      .getRawMany<{ registerId: string; value: string }>()
    const registerNames = await this.registerNameMap(registerRows.map((x) => x.registerId))

    // Breakdown — hour of day.
    const hourRows = await base()
      .select('EXTRACT(HOUR FROM o."created_at")', 'hour')
      .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'value')
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany<{ hour: string; value: string }>()

    // Top products by line revenue.
    const topRows = await this.lines
      .createQueryBuilder('l')
      .innerJoin(PosOrder, 'o', 'o.id = l.orderId')
      .select('l.productId', 'productId')
      .addSelect('COALESCE(SUM(l.lineTotal), 0)', 'value')
      .addSelect('COALESCE(SUM(l.qty), 0)', 'qty')
      .where("o.status = 'paid'")
      .andWhere('l.productId IS NOT NULL')
      .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
      .andWhere(branchId ? 'o.branchId = :branchId' : '1=1', branchId ? { branchId } : {})
      .groupBy('l.productId')
      .orderBy('value', 'DESC')
      .limit(10)
      .getRawMany<{ productId: string; value: string; qty: string }>()
    const productNames = await this.productNameMap(topRows.map((x) => x.productId))

    return {
      module: 'pos',
      from,
      to,
      granularity,
      currency: 'TRY',
      kpis: [
        { key: 'revenue', label: 'Ciro', value: revenue, unit: 'money', tone: 'primary' },
        { key: 'orderCount', label: 'Sipariş', value: orderCount, unit: 'count' },
        { key: 'avgBasket', label: 'Ortalama sepet', value: avgBasket, unit: 'money', tone: 'info' },
        { key: 'returns', label: 'İade adedi', value: round2(num(returnsRow?.qty)), unit: 'qty', tone: 'warning' },
      ],
      trend: { key: 'revenue', label: 'Ciro', unit: 'money', points },
      breakdowns: [
        {
          key: 'paymentMethod',
          label: 'Ödeme yöntemi',
          chart: 'donut',
          unit: 'money',
          data: methodRows.map((m) => ({
            name: PAYMENT_LABELS[m.method] ?? m.method,
            value: round2(num(m.value)),
          })),
        },
        {
          key: 'register',
          label: 'Kasa',
          chart: 'bar',
          unit: 'money',
          data: registerRows.map((m) => ({
            name: registerNames.get(m.registerId) ?? 'Bilinmeyen',
            value: round2(num(m.value)),
          })),
        },
        {
          key: 'hour',
          label: 'Saat dağılımı',
          chart: 'bar',
          unit: 'money',
          data: hourRows.map((m) => ({
            name: `${String(num(m.hour)).padStart(2, '0')}:00`,
            value: round2(num(m.value)),
          })),
        },
      ],
      topLists: [
        {
          key: 'topProducts',
          label: 'En çok satan ürünler',
          unit: 'money',
          rows: topRows.map((t) => ({
            id: t.productId,
            name: productNames.get(t.productId) ?? 'Bilinmeyen ürün',
            value: round2(num(t.value)),
            sub: `${round2(num(t.qty))} adet`,
          })),
        },
      ],
    }
  }

  private async registerNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map()
    const rows = await this.registers.find({ where: { id: In(unique) } })
    return new Map(rows.map((x) => [x.id, x.name]))
  }

  private async productNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map()
    const rows = await this.products.find({ where: { id: In(unique) } })
    return new Map(rows.map((x) => [x.id, x.name]))
  }
}
