import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type {
  ApplyPlanningRequest,
  CreateReorderRuleRequest,
  PlanningRunListQuery,
  PlanningRunStatus,
  ReorderRuleListQuery,
  RunPlanningRequest,
} from '@turbohesap/shared'

const RUN_STATUSES: PlanningRunStatus[] = ['draft', 'applied', 'cancelled']

export class CreateReorderRuleDto implements CreateReorderRuleRequest {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsNumber()
  @Min(0)
  minQty!: number

  @IsNumber()
  @Min(0)
  maxQty!: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateReorderRuleDto {
  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQty?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxQty?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class ReorderRuleListQueryDto implements ReorderRuleListQuery {
  @IsOptional()
  @IsUUID()
  productId?: string

  @IsOptional()
  @IsUUID()
  branchId?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class RunPlanningDto implements RunPlanningRequest {
  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @IsInt()
  @Min(1)
  horizonDays?: number

  @IsOptional()
  @IsBoolean()
  includeReorder?: boolean

  @IsOptional()
  @IsBoolean()
  includeSalesOrders?: boolean

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class ApplyPlanningDto implements ApplyPlanningRequest {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  suggestionIds?: string[]
}

export class PlanningRunListQueryDto implements PlanningRunListQuery {
  @IsOptional()
  @IsIn(RUN_STATUSES)
  status?: PlanningRunStatus
}
