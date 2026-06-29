import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ModuleStatsDto, StatPoint, StatsQuery } from '@turbohesap/shared'

import { CACHE_DRIVER, type CacheDriver } from '../../cache/cache.driver'
import { Contact } from '../contacts/entities/contact.entity'
import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { Opportunity } from '../contacts/entities/opportunity.entity'
import { PipelineStage } from '../contacts/entities/pipeline-stage.entity'
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
export class ContactsStatsService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cache: CacheDriver,
    @InjectRepository(Opportunity) private readonly opportunities: Repository<Opportunity>,
    @InjectRepository(PipelineStage) private readonly stages: Repository<PipelineStage>,
    @InjectRepository(ContactTransaction) private readonly transactions: Repository<ContactTransaction>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  async stats(query?: StatsQuery): Promise<ModuleStatsDto> {
    const r = resolveRange(query)
    return this.cache.wrap(cacheKeyFor('contacts', r), reportsTtl(), () => this.compute(r))
  }

  private async compute(r: ResolvedRange): Promise<ModuleStatsDto> {
    const { from, to, granularity } = r
    // NOTE: opportunities have no branchId; CRM stats are org-wide (branchId
    // scoping is not applied). Deal won/lost classification derives from the
    // linked pipeline stage's `type` (stageId → crm_pipeline_stages.type).

    // Snapshot — current open pipeline (deals whose stage type is open or
    // unclassified). Value = Σ amount.
    const openRow = await this.opportunities
      .createQueryBuilder('o')
      .leftJoin(PipelineStage, 'ps', 'ps.id = o.stageId')
      .select('COUNT(o.id)', 'count')
      .addSelect('COALESCE(SUM(o.amount), 0)', 'value')
      .where("COALESCE(ps.type, 'open') = 'open'")
      .getRawOne<{ count: string; value: string }>()

    // Won / lost counts for deals created within the range.
    const wlRow = await this.opportunities
      .createQueryBuilder('o')
      .leftJoin(PipelineStage, 'ps', 'ps.id = o.stageId')
      .select("COALESCE(SUM(CASE WHEN ps.type = 'won' THEN 1 ELSE 0 END), 0)", 'won')
      .addSelect("COALESCE(SUM(CASE WHEN ps.type = 'lost' THEN 1 ELSE 0 END), 0)", 'lost')
      .where('o."created_at"::date BETWEEN :from AND :to', { from, to })
      .getRawOne<{ won: string; lost: string }>()

    // Trend — opportunities created over time.
    const trendRows = await this.opportunities
      .createQueryBuilder('o')
      .select(`to_char(o."created_at", 'YYYY-MM-DD')`, 'period')
      .addSelect('COUNT(o.id)', 'count')
      .where('o."created_at"::date BETWEEN :from AND :to', { from, to })
      .groupBy('period')
      .getRawMany<{ period: string; count: string }>()
    const trendMap = new Map<string, StatPoint>()
    for (const row of trendRows) {
      const key = bucketKey(row.period, granularity)
      const p = trendMap.get(key) ?? { period: key, value: 0 }
      p.value = round2((p.value ?? 0) + num(row.count))
      trendMap.set(key, p)
    }
    const points = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period))

    // Breakdown — open pipeline value by stage (with stage color).
    const stageRows = await this.opportunities
      .createQueryBuilder('o')
      .innerJoin(PipelineStage, 'ps', 'ps.id = o.stageId')
      .select('ps.name', 'name')
      .addSelect('ps.color', 'color')
      .addSelect('ps.sortOrder', 'sortOrder')
      .addSelect('COALESCE(SUM(o.amount), 0)', 'value')
      .where("ps.type = 'open'")
      .groupBy('ps.id')
      .addGroupBy('ps.name')
      .addGroupBy('ps.color')
      .addGroupBy('ps.sortOrder')
      .orderBy('ps.sortOrder', 'ASC')
      .getRawMany<{ name: string; color: string; sortOrder: number; value: string }>()

    const won = num(wlRow?.won)
    const lost = num(wlRow?.lost)

    // Top contacts by ledger balance (Σ debit − Σ credit).
    const balanceRows = await this.transactions
      .createQueryBuilder('t')
      .select('t.contactId', 'contactId')
      .addSelect('COALESCE(SUM(t.debit) - SUM(t.credit), 0)', 'balance')
      .groupBy('t.contactId')
      .orderBy('balance', 'DESC')
      .limit(10)
      .getRawMany<{ contactId: string; balance: string }>()
    const contactNames = await this.contactNameMap(balanceRows.map((x) => x.contactId))

    return {
      module: 'contacts',
      from,
      to,
      granularity,
      currency: 'TRY',
      kpis: [
        { key: 'openCount', label: 'Açık fırsat', value: num(openRow?.count), unit: 'count', tone: 'primary' },
        { key: 'openValue', label: 'Açık fırsat değeri', value: round2(num(openRow?.value)), unit: 'money', tone: 'info' },
        { key: 'won', label: 'Kazanılan', value: won, unit: 'count', tone: 'success' },
        { key: 'lost', label: 'Kaybedilen', value: lost, unit: 'count', tone: 'destructive' },
      ],
      trend: { key: 'opportunities', label: 'Oluşturulan fırsatlar', unit: 'count', points },
      breakdowns: [
        {
          key: 'stageValue',
          label: 'Aşamaya göre fırsat değeri',
          chart: 'bar',
          unit: 'money',
          data: stageRows.map((s) => ({ name: s.name, value: round2(num(s.value)), color: s.color })),
        },
        {
          key: 'wonLost',
          label: 'Kazanılan / Kaybedilen',
          chart: 'donut',
          unit: 'count',
          data: [
            { name: 'Kazanılan', value: won, color: '#22c55e' },
            { name: 'Kaybedilen', value: lost, color: '#ef4444' },
          ],
        },
      ],
      topLists: [
        {
          key: 'topBalances',
          label: 'En yüksek bakiyeli cariler',
          unit: 'money',
          rows: balanceRows.map((b) => ({
            id: b.contactId,
            name: contactNames.get(b.contactId) ?? 'Bilinmeyen cari',
            value: round2(num(b.balance)),
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
