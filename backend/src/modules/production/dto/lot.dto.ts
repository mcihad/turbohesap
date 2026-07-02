import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator'

import type { CreateLotRequest, LotKind, LotListQuery, RegisterLotRequest } from '@turbohesap/shared'

const KINDS: LotKind[] = ['lot', 'serial']

export class CreateLotDto implements CreateLotRequest {
  @IsUUID()
  productId!: string

  @IsString()
  lotNo!: string

  @IsOptional()
  @IsIn(KINDS)
  kind?: LotKind

  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class RegisterLotDto implements RegisterLotRequest {
  @IsUUID()
  manufacturingOrderId!: string

  @IsUUID()
  productId!: string

  @IsString()
  lotNo!: string

  @IsNumber()
  @IsPositive()
  quantity!: number

  @IsOptional()
  @IsIn(KINDS)
  kind?: LotKind

  @IsOptional()
  @IsUUID()
  variantId?: string | null
}

export class LotListQueryDto implements LotListQuery {
  @IsOptional()
  @IsUUID()
  productId?: string

  @IsOptional()
  @IsString()
  lotNo?: string
}
