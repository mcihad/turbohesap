import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'

import type { AuthTokens, CurrentUser, LoginResponse } from '@turbohesap/shared'

import {
  type AuthUser,
  CurrentUser as Principal,
} from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { LogoutDto, RefreshDto } from './dto/token.dto'

// Local authentication endpoints under /api/auth. login/refresh/logout are
// public; /me requires a valid access token (global JwtAuthGuard).
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto.username, dto.password)
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<AuthTokens> {
    return this.auth.refresh(dto.refreshToken)
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.auth.logout(dto.refreshToken)
  }

  @Get('me')
  me(@Principal() user: AuthUser): Promise<CurrentUser> {
    return this.auth.me(user.sub)
  }

  // Separate from the token: the caller's effective permission keys, resolved
  // from their roles server-side. Keeps the access token small.
  @Get('permissions')
  permissions(@Principal() user: AuthUser): Promise<string[]> {
    return this.auth.permissions(user.sub)
  }
}
