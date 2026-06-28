import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

import type {
  CloseOpportunityRequest,
  CreateOpportunityRequest,
  MoveOpportunityRequest,
  UpdateOpportunityRequest,
} from '@turbohesap/shared'

export class CreateOpportunityDto implements CreateOpportunityRequest {
  @IsString() @IsNotEmpty() contactId!: string
  @IsString() @IsNotEmpty() name!: string

  @IsOptional() @IsString() pipelineId?: string
  @IsOptional() @IsString() stageId?: string
  @IsOptional() @IsString() stage?: string
  @IsOptional() @IsString() contactPersonId?: string | null
  @IsOptional() @IsNumber() @Min(0) amount?: number
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number
  @IsOptional() @IsString() expectedCloseDate?: string | null
  @IsOptional() @IsString() source?: string | null
  @IsOptional() @IsString() ownerId?: string | null
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsObject() attributes?: Record<string, unknown>
}

export class UpdateOpportunityDto implements UpdateOpportunityRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsString() pipelineId?: string
  @IsOptional() @IsString() stageId?: string
  @IsOptional() @IsString() stage?: string
  @IsOptional() @IsString() contactPersonId?: string | null
  @IsOptional() @IsNumber() @Min(0) amount?: number
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number
  @IsOptional() @IsString() expectedCloseDate?: string | null
  @IsOptional() @IsString() source?: string | null
  @IsOptional() @IsString() ownerId?: string | null
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsObject() attributes?: Record<string, unknown>
}

export class MoveOpportunityDto implements MoveOpportunityRequest {
  @IsString() @IsNotEmpty() stageId!: string
}

export class CloseOpportunityDto implements CloseOpportunityRequest {
  @IsIn(['won', 'lost']) result!: 'won' | 'lost'
  @IsOptional() @IsString() reason?: string | null
}
