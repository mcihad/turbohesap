import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type {
  FinishWorkOrderRequest,
  StartWorkOrderRequest,
  WorkOrderListQuery,
  WorkOrderStatus,
} from '@turbohesap/shared'

const WO_STATUSES: WorkOrderStatus[] = ['pending', 'ready', 'in_progress', 'paused', 'done', 'cancelled']

export class StartWorkOrderDto implements StartWorkOrderRequest {
  @IsOptional()
  @IsUUID()
  employeeId?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}

export class FinishWorkOrderDto implements FinishWorkOrderRequest {
  @IsNumber()
  @Min(0)
  producedQuantity!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number

  @IsOptional()
  @IsString()
  note?: string | null
}

export class WorkOrderListQueryDto implements WorkOrderListQuery {
  @IsOptional()
  @IsUUID()
  manufacturingOrderId?: string

  @IsOptional()
  @IsUUID()
  workCenterId?: string

  @IsOptional()
  @IsIn(WO_STATUSES)
  status?: WorkOrderStatus

  @IsOptional()
  @IsUUID()
  assignedEmployeeId?: string
}
