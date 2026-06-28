// CRM analytics — aggregates for the sales dashboard: pipeline funnel, win rate,
// weighted forecast, sales cycle and an activity leaderboard. All money fields
// are plain numbers (backend stores numeric).

import type { StageType } from './pipeline.dto'

export interface CrmStageBucket {
  stageId: string
  name: string
  type: StageType
  color: string
  count: number
  value: number
  /** Probability-weighted value (Σ amount × probability/100) for open stages. */
  weighted: number
}

export interface CrmLossReasonBucket {
  reason: string
  count: number
  value: number
}

export interface CrmActivityLeader {
  ownerId: string | null
  ownerName: string
  total: number
  completed: number
}

export interface CrmDashboardDto {
  pipelineId: string | null
  /** Open deals (stage.type === 'open'). */
  openCount: number
  openValue: number
  /** Σ open amount × probability/100. */
  weightedForecast: number
  wonCount: number
  wonValue: number
  lostCount: number
  lostValue: number
  /** won / (won + lost) as a percentage (0 when none closed). */
  winRate: number
  /** Average days between create and close for won deals. */
  avgSalesCycleDays: number
  /** Per-stage breakdown across the whole pipeline (board columns). */
  byStage: CrmStageBucket[]
  /** Open-stage funnel only (ordered). */
  funnel: CrmStageBucket[]
  lossReasons: CrmLossReasonBucket[]
  activityLeaderboard: CrmActivityLeader[]
}

export interface CrmDashboardQuery {
  pipelineId?: string
  ownerId?: string
  /** Only the current user's deals/activities. */
  mine?: boolean
}
