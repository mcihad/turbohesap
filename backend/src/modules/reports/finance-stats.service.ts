import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ModuleStatsDto, StatPoint, StatsQuery } from '@turbohesap/shared'

import { CACHE_DRIVER, type CacheDriver } from '../../cache/cache.driver'
import { BankAccount } from '../finance/entities/bank-account.entity'
import { CashAccount } from '../finance/entities/cash-account.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
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
export class FinanceStatsService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cache: CacheDriver,
    @InjectRepository(FinanceTransaction) private readonly transactions: Repository<FinanceTransaction>,
    @InjectRepository(CashAccount) private readonly cashAccounts: Repository<CashAccount>,
    @InjectRepository(BankAccount) private readonly bankAccounts: Repository<BankAccount>,
  ) {}

  async stats(query?: StatsQuery): Promise<ModuleStatsDto> {
    const r = resolveRange(query)
    return this.cache.wrap(cacheKeyFor('finance', r), reportsTtl(), () => this.compute(r))
  }

  private async compute(r: ResolvedRange): Promise<ModuleStatsDto> {
    const { from, to, granularity } = r
    // NOTE: finance_transactions has no branchId column; branch scoping is not
    // applied to finance stats (accounts carry branchId, transactions do not).

    // KPIs — income vs expense.
    const totals = await this.transactions
      .createQueryBuilder('ft')
      .select("COALESCE(SUM(CASE WHEN ft.type = 'in' THEN ft.amount ELSE 0 END), 0)", 'income')
      .addSelect("COALESCE(SUM(CASE WHEN ft.type = 'out' THEN ft.amount ELSE 0 END), 0)", 'expense')
      .where('ft.date::date BETWEEN :from AND :to', { from, to })
      .getRawOne<{ income: string; expense: string }>()
    const income = round2(num(totals?.income))
    const expense = round2(num(totals?.expense))

    // Trend — income (value) vs expense (value2) over time.
    const trendRows = await this.transactions
      .createQueryBuilder('ft')
      .select("to_char(ft.date, 'YYYY-MM-DD')", 'period')
      .addSelect("COALESCE(SUM(CASE WHEN ft.type = 'in' THEN ft.amount ELSE 0 END), 0)", 'income')
      .addSelect("COALESCE(SUM(CASE WHEN ft.type = 'out' THEN ft.amount ELSE 0 END), 0)", 'expense')
      .where('ft.date::date BETWEEN :from AND :to', { from, to })
      .groupBy('period')
      .getRawMany<{ period: string; income: string; expense: string }>()
    const trendMap = new Map<string, StatPoint>()
    for (const row of trendRows) {
      const key = bucketKey(row.period, granularity)
      const p = trendMap.get(key) ?? { period: key, value: 0, value2: 0 }
      p.value = round2((p.value ?? 0) + num(row.income))
      p.value2 = round2((p.value2 ?? 0) + num(row.expense))
      trendMap.set(key, p)
    }
    const points = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period))

    // Breakdown — cash vs bank volume.
    const channelRow = await this.transactions
      .createQueryBuilder('ft')
      .select('COALESCE(SUM(CASE WHEN ft.cashAccountId IS NOT NULL THEN ft.amount ELSE 0 END), 0)', 'cash')
      .addSelect('COALESCE(SUM(CASE WHEN ft.bankAccountId IS NOT NULL THEN ft.amount ELSE 0 END), 0)', 'bank')
      .where('ft.date::date BETWEEN :from AND :to', { from, to })
      .getRawOne<{ cash: string; bank: string }>()

    // Breakdown / top — per-account volume (cash + bank combined).
    const cashRows = await this.transactions
      .createQueryBuilder('ft')
      .select('ft.cashAccountId', 'accountId')
      .addSelect('COALESCE(SUM(ft.amount), 0)', 'value')
      .where('ft.cashAccountId IS NOT NULL')
      .andWhere('ft.date::date BETWEEN :from AND :to', { from, to })
      .groupBy('ft.cashAccountId')
      .getRawMany<{ accountId: string; value: string }>()
    const bankRows = await this.transactions
      .createQueryBuilder('ft')
      .select('ft.bankAccountId', 'accountId')
      .addSelect('COALESCE(SUM(ft.amount), 0)', 'value')
      .where('ft.bankAccountId IS NOT NULL')
      .andWhere('ft.date::date BETWEEN :from AND :to', { from, to })
      .groupBy('ft.bankAccountId')
      .getRawMany<{ accountId: string; value: string }>()

    const cashNames = await this.nameMap(this.cashAccounts, cashRows.map((x) => x.accountId))
    const bankNames = await this.nameMap(this.bankAccounts, bankRows.map((x) => x.accountId))
    const accounts = [
      ...cashRows.map((x) => ({ name: cashNames.get(x.accountId) ?? 'Kasa', value: round2(num(x.value)) })),
      ...bankRows.map((x) => ({ name: bankNames.get(x.accountId) ?? 'Banka', value: round2(num(x.value)) })),
    ].sort((a, b) => b.value - a.value)

    return {
      module: 'finance',
      from,
      to,
      granularity,
      currency: 'TRY',
      kpis: [
        { key: 'income', label: 'Gelir', value: income, unit: 'money', tone: 'success' },
        { key: 'expense', label: 'Gider', value: expense, unit: 'money', tone: 'destructive' },
        { key: 'net', label: 'Net', value: round2(income - expense), unit: 'money', tone: 'primary' },
      ],
      trend: { key: 'income', label: 'Gelir', unit: 'money', label2: 'Gider', points },
      breakdowns: [
        {
          key: 'cashVsBank',
          label: 'Kasa / Banka',
          chart: 'donut',
          unit: 'money',
          data: [
            { name: 'Kasa', value: round2(num(channelRow?.cash)) },
            { name: 'Banka', value: round2(num(channelRow?.bank)) },
          ],
        },
        {
          key: 'account',
          label: 'Hesaba göre hacim',
          chart: 'bar',
          unit: 'money',
          data: accounts.slice(0, 10),
        },
      ],
      topLists: [
        {
          key: 'topAccounts',
          label: 'En yüksek hacimli hesaplar',
          unit: 'money',
          rows: accounts.slice(0, 10).map((a) => ({ name: a.name, value: a.value })),
        },
      ],
    }
  }

  private async nameMap<T extends { id: string; name: string }>(
    repo: Repository<T>,
    ids: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map()
    const rows = await repo.find({ where: { id: In(unique) } as never })
    return new Map(rows.map((x) => [x.id, x.name]))
  }
}
