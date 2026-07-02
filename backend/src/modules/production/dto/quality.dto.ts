import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'

import type {
  QualityCheckListQuery,
  QualityCheckResult,
  QualityCheckType,
  RecordQualityCheckRequest,
} from '@turbohesap/shared'

const RESULTS: QualityCheckResult[] = ['pass', 'fail']
const TYPES: QualityCheckType[] = ['operation', 'final', 'incoming']

export class RecordQualityCheckDto implements RecordQualityCheckRequest {
  @IsUUID()
  manufacturingOrderId!: string

  @IsOptional()
  @IsUUID()
  workOrderId?: string | null

  @IsOptional()
  @IsUUID()
  operationId?: string | null

  @IsOptional()
  @IsIn(TYPES)
  checkType?: QualityCheckType

  @IsIn(RESULTS)
  result!: QualityCheckResult

  @IsOptional()
  @IsNumber()
  @Min(0)
  inspectedQuantity?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  passedQuantity?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number

  @IsOptional()
  @IsUUID()
  inspectorEmployeeId?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class QualityCheckListQueryDto implements QualityCheckListQuery {
  @IsOptional()
  @IsUUID()
  manufacturingOrderId?: string

  @IsOptional()
  @IsUUID()
  workOrderId?: string

  @IsOptional()
  @IsIn(RESULTS)
  result?: QualityCheckResult
}
