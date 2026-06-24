import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'

import type {
  AuthTokens,
  CallbackResponse,
  LogoutResponse,
} from '@kentos/shared'

import { configuration } from '../config/configuration'
import { KeycloakService } from './keycloak.service'

// AuthController mediates the Keycloak (OIDC) login flow. The browser never
// talks to Keycloak's token endpoint directly — this controller (holding the
// client secret) does. All routes are mounted under the global /api prefix.
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)
  private readonly redirectUri = configuration().keycloak.redirectUri

  constructor(private readonly keycloak: KeycloakService) {}

  /**
   * callbackUri is where Keycloak redirects after authentication. Configurable;
   * otherwise derived from the request's base URL so it works in dev and behind
   * a proxy alike.
   */
  private callbackUri(req: Request): string {
    if (this.redirectUri) return this.redirectUri
    return `${req.protocol}://${req.get('host')}/auth/callback`
  }

  // GET /api/auth/login?redirect=/dashboard — redirect the browser to Keycloak.
  @Get('login')
  async login(
    @Query('redirect') redirect: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const authUrl = await this.keycloak.authUrl(
      this.callbackUri(req),
      redirect || '/',
    )
    res.redirect(authUrl)
  }

  // POST /api/auth/callback { code, state } — exchange the code for tokens.
  @Post('callback')
  async callback(
    @Body() body: { code?: string; state?: string },
    @Req() req: Request,
  ): Promise<CallbackResponse> {
    if (!body?.code || !body?.state) {
      throw new BadRequestException('code and state are required')
    }
    const { tokens, redirect } = await this.keycloak.exchange(
      body.code,
      body.state,
      this.callbackUri(req),
    )
    return { ...tokens, redirect }
  }

  // POST /api/auth/refresh { refreshToken } — swap for a fresh token set.
  @Post('refresh')
  async refresh(
    @Body() body: { refreshToken?: string },
  ): Promise<AuthTokens> {
    if (!body?.refreshToken) {
      throw new BadRequestException('refreshToken is required')
    }
    return this.keycloak.refresh(body.refreshToken)
  }

  // POST /api/auth/logout { idToken, refreshToken } — return end-session URL.
  @Post('logout')
  async logout(
    @Body() body: { idToken?: string; refreshToken?: string },
    @Req() req: Request,
  ): Promise<LogoutResponse> {
    const postLogout = `${req.protocol}://${req.get('host')}/login`
    try {
      const logoutUrl = await this.keycloak.logout(
        body?.idToken ?? '',
        body?.refreshToken ?? '',
        postLogout,
      )
      return { logoutUrl }
    } catch (err) {
      // Even if the IdP is unreachable, let the client clear local state.
      this.logger.warn(`logout: end-session url unavailable: ${String(err)}`)
      return { logoutUrl: postLogout }
    }
  }
}
