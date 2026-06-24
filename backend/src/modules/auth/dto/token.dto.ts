import { IsNotEmpty, IsString } from 'class-validator'

import type { LogoutRequest, RefreshRequest } from '@turbohesap/shared'

export class RefreshDto implements RefreshRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}

export class LogoutDto implements LogoutRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}
