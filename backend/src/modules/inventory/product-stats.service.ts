import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  ProductStatsDto,
  ProductStatsPoint,
  ProductStatsQuery,
} from '@turbohesap/shared'

import { Product } from './entities/product.entity'
import { ProductStock } from './entities/product-stock.entity'
import { InvoiceLine } from '../invoices/entities/invoice-line.entity'
import { Invoice } from '../invoices/entities/invoice.entity'
import { PosOrderLine } from '../pos/entities/pos-order-line.entity'
import { PosOrder } from '../pos/entities/pos-order.entity'

interface RawBucket {
  period: string
  qty: string | number | null
  revenue: string | number | null
}

@Injectable()
export class ProductStatsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductStock) private readonly stocks: Repository<ProductStock>,
    @InjectRepository(InvoiceLine) private readonly invoiceLines: Repository<InvoiceLine>,
    @InjectRepository(PosOrderLine) private readonly posLines: Repository<PosOrderLine>,
  ) {}

  async stats(id: string, query?: ProductStatsQuery): Promise<ProductStatsDto> {
    if (!(await this.products.findOne({ where: { id } }))) {
      throw new NotFoundException('Ürün bulunamadı')
    }
    const to = (query?.to ?? new Date().toISOString().slice(0, 10)).slice(0, 10)
    const from = (query?.from ?? daysAgo(to, 84)).slice(0, 10)
    const granularity = query?.granularity ?? 'week'

    // Sales from issued sales invoices, bucketed by invoice date.
    const invRows: RawBucket[] = await this.invoiceLines
      .createQueryBuilder('il')
      .innerJoin(Invoice, 'i', 'i.id = il.invoiceId')
      .select('i.date', 'period')
      .addSelect('SUM(il.quantity)', 'qty')
      .addSelect('SUM(il.lineTotal)', 'revenue')
      .where('il.productId = :id', { id })
      .andWhere('i.type = :t', { t: 'sales' })
      .andWhere("i.status NOT IN ('draft', 'cancelled')")
      .andWhere('i.date BETWEEN :from AND :to', { from, to })
      .groupBy('i.date')
      .getRawMany()

    // Sales from paid POS orders, bucketed by order date.
    const posRows: RawBucket[] = await this.posLines
      .createQueryBuilder('pol')
      .innerJoin(PosOrder, 'o', 'o.id = pol.orderId')
      .select(`to_char(o."created_at", 'YYYY-MM-DD')`, 'period')
      .addSelect('SUM(pol.qty)', 'qty')
      .addSelect('SUM(pol.lineTotal)', 'revenue')
      .where('pol.productId = :id', { id })
      .andWhere("o.status = 'paid'")
      .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
      .groupBy('period')
      .getRawMany()

    const invQty = sumQty(invRows)
    const invRevenue = sumRevenue(invRows)
    const posQty = sumQty(posRows)
    const posRevenue = sumRevenue(posRows)

    const invoiceCount = await this.invoiceLines
      .createQueryBuilder('il')
      .innerJoin(Invoice, 'i', 'i.id = il.invoiceId')
      .select('COUNT(DISTINCT il.invoiceId)', 'c')
      .where('il.productId = :id', { id })
      .andWhere('i.type = :t', { t: 'sales' })
      .andWhere("i.status NOT IN ('draft', 'cancelled')")
      .andWhere('i.date BETWEEN :from AND :to', { from, to })
      .getRawOne<{ c: string }>()
    const posCount = await this.posLines
      .createQueryBuilder('pol')
      .innerJoin(PosOrder, 'o', 'o.id = pol.orderId')
      .select('COUNT(DISTINCT pol.orderId)', 'c')
      .where('pol.productId = :id', { id })
      .andWhere("o.status = 'paid'")
      .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
      .getRawOne<{ c: string }>()

    const onHandRow = await this.stocks
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.quantity), 0)', 'q')
      .where('s.productId = :id', { id })
      .getRawOne<{ q: string }>()

    // Merge both sources into one bucketed trend.
    const buckets = new Map<string, ProductStatsPoint>()
    for (const r of [...invRows, ...posRows]) {
      const key = bucketKey(String(r.period).slice(0, 10), granularity)
      const p = buckets.get(key) ?? { period: key, qty: 0, revenue: 0 }
      p.qty = round2(p.qty + num(r.qty))
      p.revenue = round2(p.revenue + num(r.revenue))
      buckets.set(key, p)
    }
    const trend = [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period))

    return {
      productId: id,
      from,
      to,
      granularity,
      totalQty: round2(invQty + posQty),
      totalRevenue: round2(invRevenue + posRevenue),
      orderCount: Number(invoiceCount?.c ?? 0) + Number(posCount?.c ?? 0),
      onHand: round2(num(onHandRow?.q)),
      trend,
      bySource: [
        { source: 'invoice', qty: round2(invQty), revenue: round2(invRevenue) },
        { source: 'pos', qty: round2(posQty), revenue: round2(posRevenue) },
      ],
    }
  }
}

function num(v: string | number | null | undefined): number {
  return v == null ? 0 : Number(v)
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
function sumQty(rows: RawBucket[]): number {
  return rows.reduce((s, r) => s + num(r.qty), 0)
}
function sumRevenue(rows: RawBucket[]): number {
  return rows.reduce((s, r) => s + num(r.revenue), 0)
}
function daysAgo(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}
// Bucket a yyyy-mm-dd date into day / ISO-week / month label.
function bucketKey(iso: string, g: 'day' | 'week' | 'month'): string {
  if (g === 'day') return iso
  if (g === 'month') return iso.slice(0, 7)
  const d = new Date(`${iso}T00:00:00Z`)
  // ISO week number.
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    )
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
