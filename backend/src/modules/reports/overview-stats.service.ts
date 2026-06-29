import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ModuleStatsDto, StatPoint, StatsQuery } from '@turbohesap/shared'

import { CACHE_DRIVER, type CacheDriver } from '../../cache/cache.driver'
import { Invoice } from '../invoices/entities/invoice.entity'
import { InvoiceLine } from '../invoices/entities/invoice-line.entity'
import { InvoicePayment } from '../invoices/entities/invoice-payment.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductStock } from '../inventory/entities/product-stock.entity'
import { PosOrder } from '../pos/entities/pos-order.entity'
import { PosOrderLine } from '../pos/entities/pos-order-line.entity'
import {
  bucketKey,
  cacheKeyFor,
  num,
  reportsTtl,
  resolveRange,
  round2,
  type ResolvedRange,
} from './reports.util'

const POSTED = ['issued', 'paid']

@Injectable()
export class OverviewStatsService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cache: CacheDriver,
    @InjectRepository(PosOrder) private readonly orders: Repository<PosOrder>,
    @InjectRepository(PosOrderLine) private readonly posLines: Repository<PosOrderLine>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(InvoiceLine) private readonly invoiceLines: Repository<InvoiceLine>,
    @InjectRepository(InvoicePayment) private readonly payments: Repository<InvoicePayment>,
    @InjectRepository(ProductStock) private readonly stocks: Repository<ProductStock>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async stats(query?: StatsQuery): Promise<ModuleStatsDto> {
    const r = resolveRange(query)
    return this.cache.wrap(cacheKeyFor('overview', r), reportsTtl(), () => this.compute(r))
  }

  private async compute(r: ResolvedRange): Promise<ModuleStatsDto> {
    const { from, to, granularity, branchId } = r
    const invBranch = branchId ? 'i.branchId = :branchId' : '1=1'
    const branchParams = branchId ? { branchId } : {}

    // POS revenue + order count.
    const posQb = this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'count')
      .where("o.status = 'paid'")
      .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
    if (branchId) posQb.andWhere('o.branchId = :branchId', { branchId })
    const posTotals = await posQb.getRawOne<{ revenue: string; count: string }>()

    // Sales-invoice revenue + invoice count.
    const invTotals = await this.invoices
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(i.id)', 'count')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere('i.date BETWEEN :from AND :to', { from, to })
      .andWhere(invBranch, branchParams)
      .getRawOne<{ revenue: string; count: string }>()

    const posRevenue = round2(num(posTotals?.revenue))
    const invRevenue = round2(num(invTotals?.revenue))

    // Current stock value (branch-aware).
    const stockQb = this.stocks
      .createQueryBuilder('s')
      .innerJoin(Product, 'p', 'p.id = s.productId')
      .select('COALESCE(SUM(s.quantity * COALESCE(p.salePrice, 0)), 0)', 'value')
    if (branchId) stockQb.where('s.branchId = :branchId', { branchId })
    const stockRow = await stockQb.getRawOne<{ value: string }>()

    // Receivables — posted sales grandTotal − recorded payments.
    const salesIssued = await this.invoices
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.grandTotal), 0)', 'total')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere(invBranch, branchParams)
      .getRawOne<{ total: string }>()
    const paidRow = await this.payments
      .createQueryBuilder('p')
      .innerJoin(Invoice, 'i', 'i.id = p.invoiceId')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere(invBranch, branchParams)
      .getRawOne<{ total: string }>()
    const receivables = round2(Math.max(0, num(salesIssued?.total) - num(paidRow?.total)))

    // Trend — combined revenue over time.
    const posTrend = await (() => {
      const qb = this.orders
        .createQueryBuilder('o')
        .select(`to_char(o."created_at", 'YYYY-MM-DD')`, 'period')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'value')
        .where("o.status = 'paid'")
        .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
        .groupBy('period')
      if (branchId) qb.andWhere('o.branchId = :branchId', { branchId })
      return qb.getRawMany<{ period: string; value: string }>()
    })()
    const invTrend = await this.invoices
      .createQueryBuilder('i')
      .select('i.date', 'period')
      .addSelect('COALESCE(SUM(i.grandTotal), 0)', 'value')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere('i.date BETWEEN :from AND :to', { from, to })
      .andWhere(invBranch, branchParams)
      .groupBy('i.date')
      .getRawMany<{ period: string; value: string }>()
    const trendMap = new Map<string, StatPoint>()
    for (const row of [...posTrend, ...invTrend]) {
      const key = bucketKey(String(row.period).slice(0, 10), granularity)
      const p = trendMap.get(key) ?? { period: key, value: 0 }
      p.value = round2(p.value + num(row.value))
      trendMap.set(key, p)
    }
    const points = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period))

    // Top products by revenue (POS lines + sales-invoice lines).
    const posTop = await (() => {
      const qb = this.posLines
        .createQueryBuilder('l')
        .innerJoin(PosOrder, 'o', 'o.id = l.orderId')
        .select('l.productId', 'productId')
        .addSelect('COALESCE(SUM(l.lineTotal), 0)', 'value')
        .where("o.status = 'paid'")
        .andWhere('l.productId IS NOT NULL')
        .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
        .groupBy('l.productId')
      if (branchId) qb.andWhere('o.branchId = :branchId', { branchId })
      return qb.getRawMany<{ productId: string; value: string }>()
    })()
    const invTop = await this.invoiceLines
      .createQueryBuilder('l')
      .innerJoin(Invoice, 'i', 'i.id = l.invoiceId')
      .select('l.productId', 'productId')
      .addSelect('COALESCE(SUM(l.lineTotal), 0)', 'value')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere('l.productId IS NOT NULL')
      .andWhere('i.date BETWEEN :from AND :to', { from, to })
      .andWhere(invBranch, branchParams)
      .groupBy('l.productId')
      .getRawMany<{ productId: string; value: string }>()
    const productRevenue = new Map<string, number>()
    for (const row of [...posTop, ...invTop]) {
      if (!row.productId) continue
      productRevenue.set(row.productId, (productRevenue.get(row.productId) ?? 0) + num(row.value))
    }
    const topEntries = [...productRevenue.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    const productNames = await this.productNameMap(topEntries.map(([id]) => id))

    return {
      module: 'overview',
      from,
      to,
      granularity,
      currency: 'TRY',
      kpis: [
        { key: 'revenue', label: 'Toplam ciro', value: round2(posRevenue + invRevenue), unit: 'money', tone: 'primary' },
        { key: 'orderCount', label: 'POS sipariş', value: num(posTotals?.count), unit: 'count' },
        { key: 'invoiceCount', label: 'Fatura', value: num(invTotals?.count), unit: 'count' },
        { key: 'stockValue', label: 'Stok değeri', value: round2(num(stockRow?.value)), unit: 'money', tone: 'info' },
        { key: 'receivables', label: 'Tahsilat bekleyen', value: receivables, unit: 'money', tone: 'warning' },
      ],
      trend: { key: 'revenue', label: 'Toplam ciro', unit: 'money', points },
      breakdowns: [
        {
          key: 'revenueSource',
          label: 'Ciro kaynağı',
          chart: 'donut',
          unit: 'money',
          data: [
            { name: 'POS', value: posRevenue },
            { name: 'Fatura', value: invRevenue },
          ],
        },
      ],
      topLists: [
        {
          key: 'topProducts',
          label: 'Cirosu en yüksek ürünler',
          unit: 'money',
          rows: topEntries.map(([id, value]) => ({
            id,
            name: productNames.get(id) ?? 'Bilinmeyen ürün',
            value: round2(value),
          })),
        },
      ],
    }
  }

  private async productNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map()
    const rows = await this.products.find({ where: { id: In(unique) } })
    return new Map(rows.map((x) => [x.id, x.name]))
  }
}
