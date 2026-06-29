import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ModuleStatsDto, StatPoint, StatsQuery } from '@turbohesap/shared'

import { CACHE_DRIVER, type CacheDriver } from '../../cache/cache.driver'
import { PosOrder } from '../pos/entities/pos-order.entity'
import { SalesChannel } from '../sales/entities/sales-channel.entity'
import {
  bucketKey,
  cacheKeyFor,
  num,
  reportsTtl,
  resolveRange,
  round2,
  type ResolvedRange,
} from './reports.util'

// NOTE: of the revenue sources, only pos_orders carry a salesChannelId
// (invoices have no channel linkage), so channel revenue is derived from paid
// POS orders. Orders without a channel are grouped under "Atanmamış".
@Injectable()
export class SalesStatsService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cache: CacheDriver,
    @InjectRepository(PosOrder) private readonly orders: Repository<PosOrder>,
    @InjectRepository(SalesChannel) private readonly channels: Repository<SalesChannel>,
  ) {}

  async stats(query?: StatsQuery): Promise<ModuleStatsDto> {
    const r = resolveRange(query)
    return this.cache.wrap(cacheKeyFor('sales', r), reportsTtl(), () => this.compute(r))
  }

  private async compute(r: ResolvedRange): Promise<ModuleStatsDto> {
    const { from, to, granularity, branchId } = r

    const base = () => {
      const qb = this.orders
        .createQueryBuilder('o')
        .where("o.status = 'paid'")
        .andWhere('o."created_at"::date BETWEEN :from AND :to', { from, to })
      if (branchId) qb.andWhere('o.branchId = :branchId', { branchId })
      return qb
    }

    // Revenue by channel.
    const channelRows = await base()
      .select('o.salesChannelId', 'channelId')
      .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'value')
      .groupBy('o.salesChannelId')
      .getRawMany<{ channelId: string | null; value: string }>()
    const channelNames = await this.channelNameMap(
      channelRows.map((x) => x.channelId).filter((x): x is string => Boolean(x)),
    )
    const channels = channelRows
      .map((c) => ({
        id: c.channelId ?? undefined,
        name: c.channelId ? (channelNames.get(c.channelId) ?? 'Bilinmeyen kanal') : 'Atanmamış',
        value: round2(num(c.value)),
      }))
      .sort((a, b) => b.value - a.value)

    const totalRevenue = round2(channels.reduce((s, c) => s + c.value, 0))
    const channelCount = channelRows.filter((c) => c.channelId).length

    // Trend — channel revenue over time.
    const trendRows = await base()
      .select(`to_char(o."created_at", 'YYYY-MM-DD')`, 'period')
      .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'value')
      .groupBy('period')
      .getRawMany<{ period: string; value: string }>()
    const trendMap = new Map<string, StatPoint>()
    for (const row of trendRows) {
      const key = bucketKey(row.period, granularity)
      const p = trendMap.get(key) ?? { period: key, value: 0 }
      p.value = round2((p.value ?? 0) + num(row.value))
      trendMap.set(key, p)
    }
    const points = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period))

    return {
      module: 'sales',
      from,
      to,
      granularity,
      currency: 'TRY',
      kpis: [
        { key: 'revenue', label: 'Kanal cirosu', value: totalRevenue, unit: 'money', tone: 'primary' },
        { key: 'channelCount', label: 'Aktif kanal', value: channelCount, unit: 'count' },
      ],
      trend: { key: 'revenue', label: 'Ciro', unit: 'money', points },
      breakdowns: [
        {
          key: 'channel',
          label: 'Kanala göre ciro',
          chart: 'bar',
          unit: 'money',
          data: channels.map((c) => ({ name: c.name, value: c.value })),
        },
      ],
      topLists: [
        {
          key: 'topChannels',
          label: 'En çok ciro yapan kanallar',
          unit: 'money',
          rows: channels.slice(0, 10).map((c) => ({ id: c.id, name: c.name, value: c.value })),
        },
      ],
    }
  }

  private async channelNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map()
    const rows = await this.channels.find({ where: { id: In(unique) } })
    return new Map(rows.map((x) => [x.id, x.name]))
  }
}
