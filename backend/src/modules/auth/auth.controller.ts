import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import type {
  AuthTokens,
  CurrentUser,
  LoginResponse,
  VerifyPasswordResponse,
} from '@turbohesap/shared'

import {
  type AuthUser,
  CurrentUser as Principal,
} from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { LogoutDto, RefreshDto } from './dto/token.dto'
import { VerifyPasswordDto } from './dto/verify-password.dto'
import { PosLoginDto, PosSwitchDto, SetPinDto } from './dto/pos-auth.dto'

// Local authentication endpoints under /api/auth. login/refresh/logout are
// public; /me requires a valid access token (global JwtAuthGuard).
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Tight limit to blunt brute-force attempts.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
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

  // POS terminal open with username + PIN.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @Post('pos-login')
  @HttpCode(200)
  posLogin(@Body() dto: PosLoginDto): Promise<LoginResponse> {
    return this.auth.posLogin(dto.username, dto.pin)
  }

  // Fast cashier switch mid-shift (authenticated device session) by PIN.
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('pos-switch')
  @HttpCode(200)
  posSwitch(@Body() dto: PosSwitchDto): Promise<LoginResponse> {
    return this.auth.posSwitch(dto.pin)
  }

  // Set/change the caller's own POS PIN.
  @Post('pos-pin')
  @HttpCode(204)
  async setPin(@Principal() user: AuthUser, @Body() dto: SetPinDto): Promise<void> {
    await this.auth.setPin(user.sub, dto.pin, dto.currentPassword)
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

  // Re-confirm the caller's password before a destructive action. Returns 200
  // with {valid} (not 401) so a wrong password isn't treated as a session error.
  @Post('verify-password')
  @HttpCode(200)
  verifyPassword(
    @Principal() user: AuthUser,
    @Body() dto: VerifyPasswordDto,
  ): Promise<VerifyPasswordResponse> {
    return this.auth.verifyPassword(user.sub, dto.password)
  }
}
