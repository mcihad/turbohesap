import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

import type {
  CreateStockMovementRequest,
  CreateStockMovementTypeRequest,
  MovementDirection,
  UpdateStockMovementTypeRequest,
} from '@turbohesap/shared'

const DIRECTIONS: MovementDirection[] = ['in', 'out']

export class CreateStockMovementTypeDto implements CreateStockMovementTypeRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsIn(DIRECTIONS) direction!: MovementDirection
  @IsOptional() @IsBoolean() isActive?: boolean
}

export class UpdateStockMovementTypeDto implements UpdateStockMovementTypeRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsIn(DIRECTIONS) direction?: MovementDirection
  @IsOptional() @IsBoolean() isActive?: boolean
}

export class CreateStockMovementDto implements CreateStockMovementRequest {
  @IsString() @IsNotEmpty() productId!: string
  @IsString() @IsNotEmpty() movementTypeId!: string
  @IsNumber() @Min(0.0001) quantity!: number
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() variantId?: string | null
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsString() description?: string | null
}
