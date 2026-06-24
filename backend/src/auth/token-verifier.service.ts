import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { configuration, issuerOf } from '../config/configuration'
import type { Claims } from './auth.types'

// TokenVerifier validates raw access tokens (signature, issuer, expiry) against
// Keycloak's JWKS. Keycloak's `aud` is not the client id, so we do not check the
// audience (matching the Go backend's SkipClientIDCheck).
@Injectable()
export class TokenVerifier {
  private readonly logger = new Logger(TokenVerifier.name)
  private readonly issuer: string
  private jwks?: ReturnType<typeof createRemoteJWKSet>

  constructor() {
    this.issuer = issuerOf(configuration())
  }

  /** Lazily build the JWKS resolver from the discovery document. */
  private async getJwks(): Promise<ReturnType<typeof createRemoteJWKSet>> {
    if (this.jwks) return this.jwks
    const res = await fetch(`${this.issuer}/.well-known/openid-configuration`)
    if (!res.ok) {
      throw new UnauthorizedException('identity provider unavailable')
    }
    const disc = (await res.json()) as { jwks_uri: string }
    this.jwks = createRemoteJWKSet(new URL(disc.jwks_uri))
    return this.jwks
  }

  /** Verify a raw access token and return its claims, or throw 401. */
  async verify(raw: string): Promise<Claims> {
    try {
      const jwks = await this.getJwks()
      const { payload } = await jwtVerify(raw, jwks, { issuer: this.issuer })
      return payload as JWTPayload & Claims
    } catch (err) {
      this.logger.debug(`token verification failed: ${String(err)}`)
      throw new UnauthorizedException('invalid or expired token')
    }
  }
}
