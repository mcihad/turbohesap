import { Injectable } from '@nestjs/common'
import { JwtService, type JwtSignOptions } from '@nestjs/jwt'

import { configuration } from '../../config/configuration'
import { durationToSeconds } from '../../common/duration'

export interface AccessTokenPayload {
  sub: string
  username: string
  roles: string[]
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string
  jti: string
  type: 'refresh'
}

// TokenService signs and verifies the access + refresh JWTs. Access tokens carry
// the principal's roles/permissions for stateless authorization; refresh tokens
// carry only a `jti` that maps to a persisted, revocable row.
@Injectable()
export class TokenService {
  private readonly cfg = configuration().jwt

  constructor(private readonly jwt: JwtService) {}

  accessTtlSeconds(): number {
    return durationToSeconds(this.cfg.accessTtl)
  }

  refreshTtlSeconds(): number {
    return durationToSeconds(this.cfg.refreshTtl)
  }

  signAccessToken(
    payload: Omit<AccessTokenPayload, 'type'>,
  ): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: 'access' },
      this.signOpts(this.cfg.accessSecret, this.cfg.accessTtl),
    )
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: 'refresh' },
      this.signOpts(this.cfg.refreshSecret, this.cfg.refreshTtl),
    )
  }

  // expiresIn accepts a number (seconds) or an `ms`-style string ("15m", "7d").
  private signOpts(secret: string, expiresIn: string): JwtSignOptions {
    return { secret, expiresIn: expiresIn as JwtSignOptions['expiresIn'] }
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.cfg.refreshSecret,
    })
  }
}
