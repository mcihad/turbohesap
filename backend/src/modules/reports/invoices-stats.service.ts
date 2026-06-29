import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ModuleStatsDto, StatPoint, StatsQuery } from '@turbohesap/shared'

import { CACHE_DRIVER, type CacheDriver } from '../../cache/cache.driver'
import { Contact } from '../contacts/entities/contact.entity'
import { Invoice } from '../invoices/entities/invoice.entity'
import { InvoicePayment } from '../invoices/entities/invoice-payment.entity'
import {
  bucketKey,
  cacheKeyFor,
  num,
  reportsTtl,
  resolveRange,
  round2,
  type ResolvedRange,
} from './reports.util'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  issued: 'Kesildi',
  paid: 'Ödendi',
  cancelled: 'İptal',
}
const TYPE_LABELS: Record<string, string> = {
  sales: 'Satış',
  purchase: 'Alış',
  return: 'İade',
}
// Statuses that count as real (posted) documents.
const POSTED = ['issued', 'paid']

@Injectable()
export class InvoicesStatsService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cache: CacheDriver,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(InvoicePayment) private readonly payments: Repository<InvoicePayment>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  async stats(query?: StatsQuery): Promise<ModuleStatsDto> {
    const r = resolveRange(query)
    return this.cache.wrap(cacheKeyFor('invoices', r), reportsTtl(), () => this.compute(r))
  }

  private async compute(r: ResolvedRange): Promise<ModuleStatsDto> {
    const { from, to, granularity, branchId } = r
    const branchClause = branchId ? 'i.branchId = :branchId' : '1=1'
    const branchParams = branchId ? { branchId } : {}

    // KPIs.
    const totals = await this.invoices
      .createQueryBuilder('i')
      .select("COALESCE(SUM(CASE WHEN i.type = 'sales' THEN i.grandTotal ELSE 0 END), 0)", 'sales')
      .addSelect("COALESCE(SUM(CASE WHEN i.type = 'purchase' THEN i.grandTotal ELSE 0 END), 0)", 'purchase')
      .addSelect("COALESCE(SUM(CASE WHEN i.type = 'sales' THEN i.vatTotal ELSE 0 END), 0)", 'vat')
      .where('i.date BETWEEN :from AND :to', { from, to })
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere(branchClause, branchParams)
      .getRawOne<{ sales: string; purchase: string; vat: string }>()

    // Receivables: posted sales grandTotal − recorded payments against them.
    const salesIssued = await this.invoices
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.grandTotal), 0)', 'total')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere(branchClause, branchParams)
      .getRawOne<{ total: string }>()
    const paidRow = await this.payments
      .createQueryBuilder('p')
      .innerJoin(Invoice, 'i', 'i.id = p.invoiceId')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere(branchClause, branchParams)
      .getRawOne<{ total: string }>()
    const receivables = round2(Math.max(0, num(salesIssued?.total) - num(paidRow?.total)))

    // Trend — sales (value) vs purchase (value2) over time.
    const trendRows = await this.invoices
      .createQueryBuilder('i')
      .select('i.date', 'period')
      .addSelect("COALESCE(SUM(CASE WHEN i.type = 'sales' THEN i.grandTotal ELSE 0 END), 0)", 'sales')
      .addSelect("COALESCE(SUM(CASE WHEN i.type = 'purchase' THEN i.grandTotal ELSE 0 END), 0)", 'purchase')
      .where('i.date BETWEEN :from AND :to', { from, to })
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere(branchClause, branchParams)
      .groupBy('i.date')
      .getRawMany<{ period: string; sales: string; purchase: string }>()
    const trendMap = new Map<string, StatPoint>()
    for (const row of trendRows) {
      const key = bucketKey(String(row.period).slice(0, 10), granularity)
      const p = trendMap.get(key) ?? { period: key, value: 0, value2: 0 }
      p.value = round2((p.value ?? 0) + num(row.sales))
      p.value2 = round2((p.value2 ?? 0) + num(row.purchase))
      trendMap.set(key, p)
    }
    const points = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period))

    // Breakdown — by status (count) within range, all statuses.
    const statusRows = await this.invoices
      .createQueryBuilder('i')
      .select('i.status', 'status')
      .addSelect('COUNT(i.id)', 'count')
      .where('i.date BETWEEN :from AND :to', { from, to })
      .andWhere(branchClause, branchParams)
      .groupBy('i.status')
      .getRawMany<{ status: string; count: string }>()

    // Breakdown — by type (grandTotal).
    const typeRows = await this.invoices
      .createQueryBuilder('i')
      .select('i.type', 'type')
      .addSelect('COALESCE(SUM(i.grandTotal), 0)', 'value')
      .where('i.date BETWEEN :from AND :to', { from, to })
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere(branchClause, branchParams)
      .groupBy('i.type')
      .getRawMany<{ type: string; value: string }>()

    // Top customers by sales.
    const topRows = await this.invoices
      .createQueryBuilder('i')
      .select('i.contactId', 'contactId')
      .addSelect('COALESCE(SUM(i.grandTotal), 0)', 'value')
      .where("i.type = 'sales'")
      .andWhere('i.status IN (:...posted)', { posted: POSTED })
      .andWhere('i.date BETWEEN :from AND :to', { from, to })
      .andWhere(branchClause, branchParams)
      .groupBy('i.contactId')
      .orderBy('value', 'DESC')
      .limit(10)
      .getRawMany<{ contactId: string; value: string }>()
    const contactNames = await this.contactNameMap(topRows.map((x) => x.contactId))

    return {
      module: 'invoices',
      from,
      to,
      granularity,
      currency: 'TRY',
      kpis: [
        { key: 'sales', label: 'Satış faturaları', value: round2(num(totals?.sales)), unit: 'money', tone: 'success' },
        { key: 'purchase', label: 'Alış faturaları', value: round2(num(totals?.purchase)), unit: 'money', tone: 'info' },
        { key: 'vat', label: 'KDV', value: round2(num(totals?.vat)), unit: 'money' },
        { key: 'receivables', label: 'Tahsilat bekleyen', value: receivables, unit: 'money', tone: 'warning' },
      ],
      trend: { key: 'sales', label: 'Satış', unit: 'money', label2: 'Alış', points },
      breakdowns: [
        {
          key: 'status',
          label: 'Duruma göre',
          chart: 'donut',
          unit: 'count',
          data: statusRows.map((s) => ({
            name: STATUS_LABELS[s.status] ?? s.status,
            value: num(s.count),
          })),
        },
        {
          key: 'type',
          label: 'Türe göre',
          chart: 'bar',
          unit: 'money',
          data: typeRows.map((t) => ({
            name: TYPE_LABELS[t.type] ?? t.type,
            value: round2(num(t.value)),
          })),
        },
      ],
      topLists: [
        {
          key: 'topCustomers',
          label: 'En çok satış yapılan cariler',
          unit: 'money',
          rows: topRows.map((t) => ({
            id: t.contactId,
            name: contactNames.get(t.contactId) ?? 'Bilinmeyen cari',
            value: round2(num(t.value)),
          })),
        },
      ],
    }
  }

  private async contactNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map()
    const rows = await this.contacts.find({ where: { id: In(unique) } })
    return new Map(rows.map((x) => [x.id, x.name]))
  }
}
