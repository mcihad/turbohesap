import { IsNotEmpty, IsString } from 'class-validator'

import type { VerifyPasswordRequest } from '@turbohesap/shared'

export class VerifyPasswordDto implements VerifyPasswordRequest {
  @IsString()
  @IsNotEmpty()
  password!: string
}
