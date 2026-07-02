import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

import type {
  CreateSubcontractDispatchRequest,
  ReceiveSubcontractDispatchRequest,
  SubcontractDispatchListQuery,
  SubcontractDispatchStatus,
} from '@turbohesap/shared'

const STATUSES: SubcontractDispatchStatus[] = ['draft', 'sent', 'received', 'cancelled']

class SubcontractLineInputDto {
  @IsUUID()
  componentProductId!: string

  @IsOptional()
  @IsUUID()
  componentVariantId?: string | null

  @IsNumber()
  @IsPositive()
  sentQuantity!: number

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class CreateSubcontractDispatchDto implements CreateSubcontractDispatchRequest {
  @IsUUID()
  manufacturingOrderId!: string

  @IsUUID()
  contactId!: string

  @IsOptional()
  @IsString()
  dispatchDate?: string

  @IsOptional()
  @IsString()
  expectedReturnDate?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceCost?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  notes?: string | null

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubcontractLineInputDto)
  lines?: SubcontractLineInputDto[]
}

class ReturnLineDto {
  @IsUUID()
  lineId!: string

  @IsNumber()
  @Min(0)
  returnedQuantity!: number
}

export class ReceiveSubcontractDispatchDto implements ReceiveSubcontractDispatchRequest {
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceCost?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnLineDto)
  returns?: ReturnLineDto[]

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class SubcontractDispatchListQueryDto implements SubcontractDispatchListQuery {
  @IsOptional()
  @IsUUID()
  manufacturingOrderId?: string

  @IsOptional()
  @IsUUID()
  contactId?: string

  @IsOptional()
  @IsIn(STATUSES)
  status?: SubcontractDispatchStatus
}

export class SubcontractStockQueryDto {
  @IsOptional()
  @IsUUID()
  contactId?: string
}
