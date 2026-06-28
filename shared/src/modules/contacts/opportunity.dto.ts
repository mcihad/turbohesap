// Opportunity (Satış Fırsatı) — the sales pipeline, in the Salesforce
// Opportunity spirit: a deal on a contact placed in a user-definable Pipeline
// Stage, with amount, probability and expected close. `isClosed`/`isWon` are
// derived from the stage's `type`. The legacy `OpportunityStage` enum below is
// retained only to seed the default pipeline and for backward-compatible labels.

import type { StageType } from './pipeline.dto'

export type OpportunityStage =
  | 'prospecting' // Ön görüşme
  | 'qualification' // Niteleme
  | 'proposal' // Teklif
  | 'negotiation' // Pazarlık
  | 'won' // Kazanıldı
  | 'lost' // Kaybedildi

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

/** Default win probability (%) per stage — used as a sensible default on create. */
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  prospecting: 10,
  qualification: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
}

export interface OpportunityDto {
  id: string
  contactId: string
  contact: { id: string; name: string } | null
  contactPersonId: string | null
  name: string
  // ── Pipeline placement (user-definable stages) ──
  pipelineId: string
  stageId: string
  /** Stage slug (the legacy `stage` value for the default pipeline). */
  stageKey: string
  stageName: string
  stageType: StageType
  stageColor: string
  /** Backward-compatible alias of `stageKey` (legacy consumers). */
  stage: string
  amount: number
  currencyCode: string
  /** Kazanma olasılığı (%). */
  probability: number
  /** Tahmini ciro = amount × probability/100 (computed). */
  expectedRevenue: number
  expectedCloseDate: string | null
  source: string | null
  ownerId: string | null
  owner: { id: string; name: string } | null
  notes: string | null
  /** Win/loss reasons captured when the deal is closed. */
  winReason: string | null
  lossReason: string | null
  /** Last activity timestamp on this deal (for staleness). */
  lastActivityAt: string | null
  /** COMPUTED: open deal with no activity within the stage's rottingDays. */
  isRotting: boolean
  /** COMPUTED: days since the deal entered the current stage. */
  daysInStage: number
  /** Custom field values (keyed by field def key). */
  attributes: Record<string, unknown>
  isClosed: boolean
  isWon: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateOpportunityRequest {
  contactId: string
  name: string
  /** Target pipeline; defaults to the default pipeline when omitted. */
  pipelineId?: string
  /** Target stage; defaults to the pipeline's first open stage when omitted. */
  stageId?: string
  /** Legacy: stage slug, resolved against the default pipeline if no stageId. */
  stage?: string
  contactPersonId?: string | null
  amount?: number
  currencyCode?: string
  probability?: number
  expectedCloseDate?: string | null
  source?: string | null
  ownerId?: string | null
  notes?: string | null
  attributes?: Record<string, unknown>
}
export type UpdateOpportunityRequest = Partial<Omit<CreateOpportunityRequest, 'contactId'>>

/** Move a deal to another stage (Kanban drag / stage picker). */
export interface MoveOpportunityRequest {
  stageId: string
}

/** Close a deal as won or lost, optionally capturing a reason. */
export interface CloseOpportunityRequest {
  result: 'won' | 'lost'
  reason?: string | null
}

export interface OpportunityListQuery {
  contactId?: string
  pipelineId?: string
  stageId?: string
  /** Legacy stage slug filter. */
  stage?: string
  ownerId?: string
  /** Only the current user's deals. */
  mine?: boolean
  openOnly?: boolean
}
