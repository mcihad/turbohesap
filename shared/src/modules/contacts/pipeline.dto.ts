// Sales pipelines & stages — user-definable deal stages (Pipedrive/Salesforce
// style). An Opportunity belongs to one Pipeline and sits in one of its Stages.
// A stage has a `type` (open|won|lost) that replaces the old hardcoded
// won/lost enum logic, a default win `probability`, a `rottingDays` staleness
// threshold and a display `color`.

export type StageType = 'open' | 'won' | 'lost'
export const STAGE_TYPES: StageType[] = ['open', 'won', 'lost']

export interface PipelineStageDto {
  id: string
  pipelineId: string
  name: string
  /** Stable slug (unique within a pipeline), e.g. "proposal". */
  key: string
  sortOrder: number
  /** Default win probability (%) applied to deals entering this stage. */
  probability: number
  type: StageType
  /** Days without activity before a deal in this stage is "rotting". 0 = off. */
  rottingDays: number
  /** Display color (hex), e.g. "#6366f1". */
  color: string
  createdAt: string
  updatedAt: string
}

export interface PipelineDto {
  id: string
  name: string
  description: string
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  stages: PipelineStageDto[]
  /** COMPUTED: open opportunities currently in this pipeline. */
  openOpportunityCount: number
  createdAt: string
  updatedAt: string
}

export interface CreatePipelineStageRequest {
  name: string
  key?: string
  sortOrder?: number
  probability?: number
  type?: StageType
  rottingDays?: number
  color?: string
}
export type UpdatePipelineStageRequest = Partial<CreatePipelineStageRequest>

export interface CreatePipelineRequest {
  name: string
  description?: string
  isDefault?: boolean
  isActive?: boolean
  sortOrder?: number
  /** Optional initial stages; when omitted a sensible default set is created. */
  stages?: CreatePipelineStageRequest[]
}
export type UpdatePipelineRequest = Partial<Omit<CreatePipelineRequest, 'stages'>>

/** Reorder a pipeline's stages by listing their ids in the desired order. */
export interface ReorderStagesRequest {
  stageIds: string[]
}
