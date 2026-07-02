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
  CompleteManufacturingOrderRequest,
  ConsumptionMode,
  CreateFromDemandRequest,
  CreateManufacturingOrderRequest,
  ManufacturingOrderListQuery,
  ProductionOrderStatus,
  ProductionOrderType,
  ProductionPriority,
  ProductionSourceMode,
} from '@turbohesap/shared'

const ORDER_TYPES: ProductionOrderType[] = ['standard', 'subcontract']
const SOURCE_MODES: ProductionSourceMode[] = ['mts', 'mto']
const CONSUMPTION_MODES: ConsumptionMode[] = ['backflush', 'manual']
const PRIORITIES: ProductionPriority[] = ['low', 'normal', 'high', 'urgent']
const STATUSES: ProductionOrderStatus[] = ['draft', 'confirmed', 'in_progress', 'done', 'cancelled']

export class CreateManufacturingOrderDto implements CreateManufacturingOrderRequest {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsUUID()
  bomId?: string | null

  @IsNumber()
  @IsPositive()
  plannedQuantity!: number

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsIn(ORDER_TYPES)
  type?: ProductionOrderType

  @IsOptional()
  @IsIn(SOURCE_MODES)
  sourceMode?: ProductionSourceMode

  @IsOptional()
  @IsUUID()
  salesOrderLineId?: string | null

  @IsOptional()
  @IsUUID()
  componentSourceBranchId?: string | null

  @IsOptional()
  @IsUUID()
  targetBranchId?: string | null

  @IsOptional()
  @IsUUID()
  wipBranchId?: string | null

  @IsOptional()
  @IsUUID()
  subcontractorContactId?: string | null

  @IsOptional()
  @IsIn(CONSUMPTION_MODES)
  consumptionMode?: ConsumptionMode

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: ProductionPriority

  @IsOptional()
  @IsString()
  plannedStartDate?: string | null

  @IsOptional()
  @IsString()
  plannedEndDate?: string | null

  @IsOptional()
  @IsString()
  dueDate?: string | null

  @IsOptional()
  @IsUUID()
  responsibleEmployeeId?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class UpdateManufacturingOrderDto {
  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsUUID()
  bomId?: string | null

  @IsOptional()
  @IsIn(ORDER_TYPES)
  type?: ProductionOrderType

  @IsOptional()
  @IsIn(SOURCE_MODES)
  sourceMode?: ProductionSourceMode

  @IsOptional()
  @IsUUID()
  salesOrderLineId?: string | null

  @IsOptional()
  @IsNumber()
  @IsPositive()
  plannedQuantity?: number

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: ProductionPriority

  @IsOptional()
  @IsUUID()
  componentSourceBranchId?: string | null

  @IsOptional()
  @IsUUID()
  targetBranchId?: string | null

  @IsOptional()
  @IsUUID()
  wipBranchId?: string | null

  @IsOptional()
  @IsUUID()
  subcontractorContactId?: string | null

  @IsOptional()
  @IsIn(CONSUMPTION_MODES)
  consumptionMode?: ConsumptionMode

  @IsOptional()
  @IsString()
  plannedStartDate?: string | null

  @IsOptional()
  @IsString()
  plannedEndDate?: string | null

  @IsOptional()
  @IsString()
  dueDate?: string | null

  @IsOptional()
  @IsUUID()
  responsibleEmployeeId?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class CreateFromDemandDto implements CreateFromDemandRequest {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsNumber()
  @IsPositive()
  quantity!: number

  @IsOptional()
  @IsUUID()
  salesOrderLineId?: string | null

  @IsOptional()
  @IsUUID()
  bomId?: string | null

  @IsOptional()
  @IsUUID()
  targetBranchId?: string | null

  @IsOptional()
  @IsUUID()
  componentSourceBranchId?: string | null

  @IsOptional()
  @IsString()
  dueDate?: string | null

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: ProductionPriority

  @IsOptional()
  @IsString()
  notes?: string | null
}

class ComponentConsumptionDto {
  @IsUUID()
  componentId!: string

  @IsNumber()
  @Min(0)
  consumedQuantity!: number
}

class ByproductOutputDto {
  @IsUUID()
  byproductId!: string

  @IsNumber()
  @Min(0)
  quantity!: number
}

export class CompleteManufacturingOrderDto implements CompleteManufacturingOrderRequest {
  @IsNumber()
  @IsPositive()
  producedQuantity!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  scrappedQuantity?: number

  @IsOptional()
  @IsString()
  date?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentConsumptionDto)
  componentConsumptions?: ComponentConsumptionDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ByproductOutputDto)
  byproductOutputs?: ByproductOutputDto[]

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class ManufacturingOrderListQueryDto implements ManufacturingOrderListQuery {
  @IsOptional()
  @IsIn(STATUSES)
  status?: ProductionOrderStatus

  @IsOptional()
  @IsUUID()
  productId?: string

  @IsOptional()
  @IsIn(ORDER_TYPES)
  type?: ProductionOrderType

  @IsOptional()
  @IsIn(SOURCE_MODES)
  sourceMode?: ProductionSourceMode

  @IsOptional()
  @IsUUID()
  branchId?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
