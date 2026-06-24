import { IsNotEmpty, IsString } from 'class-validator'

import type { LoginRequest } from '@turbohesap/shared'

export class LoginDto implements LoginRequest {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @IsNotEmpty()
  password!: string
}
