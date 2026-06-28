import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

import type { PosLoginRequest, PosSwitchRequest, SetPinRequest } from '@turbohesap/shared'

export class PosLoginDto implements PosLoginRequest {
  @IsString() @IsNotEmpty() username!: string
  @IsString() @IsNotEmpty() pin!: string
}

export class PosSwitchDto implements PosSwitchRequest {
  @IsString() @IsNotEmpty() pin!: string
}

export class SetPinDto implements SetPinRequest {
  @IsString() @IsNotEmpty() pin!: string
  @IsOptional() @IsString() currentPassword?: string
}
