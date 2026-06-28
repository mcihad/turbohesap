import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  type CrmActivityLeader,
  type CrmDashboardDto,
  type CrmDashboardQuery,
  type CrmLossReasonBucket,
  type CrmStageBucket,
} from '@turbohesap/shared'

import { Activity } from './entities/activity.entity'
import { Opportunity } from './entities/opportunity.entity'
import { Pipeline } from './entities/pipeline.entity'
import { PipelineStage } from './entities/pipeline-stage.entity'
import { User } from '../iam/entities/user.entity'
import { ownerNameMap } from './user-name.util'

const DAY_MS = 86_400_000

@Injectable()
export class CrmAnalyticsService {
  constructor(
    @InjectRepository(Opportunity) private readonly opportunities: Repository<Opportunity>,
    @InjectRepository(Pipeline) private readonly pipelines: Repository<Pipeline>,
    @InjectRepository(PipelineStage) private readonly stages: Repository<PipelineStage>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async dashboard(query?: CrmDashboardQuery, currentUserId?: string): Promise<CrmDashboardDto> {
    const pipeline =
      (query?.pipelineId
        ? await this.pipelines.findOne({ where: { id: query.pipelineId } })
        : null) ??
      (await this.pipelines.findOne({ where: { isDefault: true } })) ??
      (await this.pipelines.findOne({ where: {}, order: { sortOrder: 'ASC' } }))

    const empty: CrmDashboardDto = {
      pipelineId: pipeline?.id ?? null,
      openCount: 0,
      openValue: 0,
      weightedForecast: 0,
      wonCount: 0,
      wonValue: 0,
      lostCount: 0,
      lostValue: 0,
      winRate: 0,
      avgSalesCycleDays: 0,
      byStage: [],
      funnel: [],
      lossReasons: [],
      activityLeaderboard: [],
    }
    if (!pipeline) return empty

    const stages = await this.stages.find({
      where: { pipelineId: pipeline.id },
      order: { sortOrder: 'ASC' },
    })

    const where: Record<string, unknown> = { pipelineId: pipeline.id }
    const ownerId = query?.ownerId ?? (query?.mine ? currentUserId : undefined)
    if (ownerId) where.ownerId = ownerId
    const deals = await this.opportunities.find({ where })

    const byStage: CrmStageBucket[] = stages.map((s) => {
      const inStage = deals.filter((d) => d.stageId === s.id)
      const value = inStage.reduce((sum, d) => sum + d.amount, 0)
      const weighted = inStage.reduce((sum, d) => sum + (d.amount * d.probability) / 100, 0)
      return {
        stageId: s.id,
        name: s.name,
        type: s.type,
        color: s.color,
        count: inStage.length,
        value: round(value),
        weighted: round(weighted),
      }
    })

    const openBuckets = byStage.filter((b) => b.type === 'open')
    const openCount = openBuckets.reduce((s, b) => s + b.count, 0)
    const openValue = round(openBuckets.reduce((s, b) => s + b.value, 0))
    const weightedForecast = round(openBuckets.reduce((s, b) => s + b.weighted, 0))

    const won = deals.filter((d) => stageType(stages, d.stageId) === 'won')
    const lost = deals.filter((d) => stageType(stages, d.stageId) === 'lost')
    const wonValue = round(won.reduce((s, d) => s + d.amount, 0))
    const lostValue = round(lost.reduce((s, d) => s + d.amount, 0))
    const closed = won.length + lost.length
    const winRate = closed > 0 ? round((won.length / closed) * 100) : 0

    const cycles = won.map((d) => (d.updatedAt.getTime() - d.createdAt.getTime()) / DAY_MS)
    const avgSalesCycleDays = cycles.length
      ? Math.round(cycles.reduce((s, c) => s + c, 0) / cycles.length)
      : 0

    const lossMap = new Map<string, { count: number; value: number }>()
    for (const d of lost) {
      const key = d.lossReason?.trim() || 'Belirtilmedi'
      const cur = lossMap.get(key) ?? { count: 0, value: 0 }
      cur.count += 1
      cur.value += d.amount
      lossMap.set(key, cur)
    }
    const lossReasons: CrmLossReasonBucket[] = [...lossMap.entries()]
      .map(([reason, v]) => ({ reason, count: v.count, value: round(v.value) }))
      .sort((a, b) => b.count - a.count)

    return {
      pipelineId: pipeline.id,
      openCount,
      openValue,
      weightedForecast,
      wonCount: won.length,
      wonValue,
      lostCount: lost.length,
      lostValue,
      winRate,
      avgSalesCycleDays,
      byStage,
      funnel: openBuckets,
      lossReasons,
      activityLeaderboard: await this.leaderboard(ownerId),
    }
  }

  private async leaderboard(ownerId?: string): Promise<CrmActivityLeader[]> {
    const qb = this.activities
      .createQueryBuilder('a')
      .select('a.ownerId', 'ownerId')
      .addSelect('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE a.status = 'completed')", 'completed')
      .groupBy('a.ownerId')
    if (ownerId) qb.where('a.ownerId = :ownerId', { ownerId })
    const rows = await qb.getRawMany<{ ownerId: string | null; total: string; completed: string }>()
    const nameMap = await ownerNameMap(this.users, rows.map((r) => r.ownerId))
    return rows
      .map((r) => ({
        ownerId: r.ownerId,
        ownerName: r.ownerId ? nameMap.get(r.ownerId) ?? 'Bilinmiyor' : 'Atanmamış',
        total: Number(r.total),
        completed: Number(r.completed),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }
}

function stageType(stages: PipelineStage[], stageId: string | null): string {
  return stages.find((s) => s.id === stageId)?.type ?? 'open'
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
