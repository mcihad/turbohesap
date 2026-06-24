import { createHash, randomBytes } from 'node:crypto'

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { AuthTokens } from '@kentos/shared'

import { configuration, issuerOf } from '../config/configuration'
import { loadManifest } from '../module/manifest'
import { StateStore } from './state.store'
import {
  type Discovery,
  type KeycloakTokens,
  toAuthTokens,
} from './auth.types'

// KeycloakService runs the confidential Authorization Code + PKCE flow against
// Keycloak. The client secret lives only here; the browser never sees it. The
// OIDC client_id is the module name (kentos.module.json "name").
@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name)
  private readonly issuer: string
  private readonly clientId: string
  private readonly clientSecret: string
  private discovery?: Discovery

  constructor(
    private readonly config: ConfigService,
    private readonly states: StateStore,
  ) {
    const cfg = configuration()
    this.issuer = issuerOf(cfg)
    this.clientId = loadManifest().name
    this.clientSecret = cfg.keycloak.clientSecret
  }

  /** Fetch and cache the OpenID configuration. */
  private async discover(): Promise<Discovery> {
    if (this.discovery) return this.discovery
    const url = `${this.issuer}/.well-known/openid-configuration`
    let res: Response
    try {
      res = await fetch(url)
    } catch (err) {
      this.logger.error(`discovery unreachable: ${String(err)}`)
      throw new ServiceUnavailableException('identity provider unavailable')
    }
    if (!res.ok) {
      throw new ServiceUnavailableException('identity provider unavailable')
    }
    this.discovery = (await res.json()) as Discovery
    return this.discovery
  }

  /**
   * Begin a login: record PKCE/state/nonce and return the Keycloak authorization
   * URL to redirect the browser to. postLogin is where the user lands after a
   * successful callback.
   */
  async authUrl(redirectUri: string, postLogin: string): Promise<string> {
    const d = await this.discover()

    const state = randomString(32)
    const verifier = randomString(48)
    const nonce = randomString(24)
    this.states.put(state, {
      verifier,
      nonce,
      redirect: postLogin,
      created: Date.now(),
    })

    const q = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid',
      state,
      nonce,
      code_challenge: pkceChallenge(verifier),
      code_challenge_method: 'S256',
    })
    return `${d.authorization_endpoint}?${q.toString()}`
  }

  /**
   * Complete a login: validate state, swap the code for tokens (client secret +
   * PKCE verifier), check the id_token nonce, return tokens + post-login
   * redirect.
   */
  async exchange(
    code: string,
    state: string,
    redirectUri: string,
  ): Promise<{ tokens: AuthTokens; redirect: string }> {
    const pending = this.states.take(state)
    if (!pending) {
      throw new BadRequestException('invalid or expired login state')
    }

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: pending.verifier,
    })

    const tokens = await this.tokenRequest(form)
    verifyNonce(tokens.id_token, pending.nonce)
    return { tokens: toAuthTokens(tokens), redirect: pending.redirect }
  }

  /** Swap a refresh token for a fresh token set. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    const tokens = await this.tokenRequest(form)
    return toAuthTokens(tokens)
  }

  /**
   * Revoke the session at Keycloak (best effort) and return the end-session URL
   * the browser should visit to clear the Keycloak cookie.
   */
  async logout(
    idToken: string,
    refreshToken: string,
    postLogout: string,
  ): Promise<string> {
    const d = await this.discover()

    if (refreshToken) {
      const form = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      })
      const logoutEndpoint = d.token_endpoint.replace('/token', '/logout')
      try {
        await fetch(logoutEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        })
      } catch {
        // best effort
      }
    }

    const q = new URLSearchParams({ client_id: this.clientId })
    if (idToken) q.set('id_token_hint', idToken)
    if (postLogout) q.set('post_logout_redirect_uri', postLogout)
    return `${d.end_session_endpoint}?${q.toString()}`
  }

  /** POST to the token endpoint with client authentication. */
  private async tokenRequest(form: URLSearchParams): Promise<KeycloakTokens> {
    const d = await this.discover()
    form.set('client_id', this.clientId)
    form.set('client_secret', this.clientSecret)

    const res = await fetch(d.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 2048)
      this.logger.warn(`token endpoint returned ${res.status}: ${body.trim()}`)
      throw new BadGatewayException('token exchange failed')
    }
    return (await res.json()) as KeycloakTokens
  }
}

/** n bytes of crypto-random data, base64url-encoded. */
function randomString(n: number): string {
  return randomBytes(n).toString('base64url')
}

/** Derive the S256 code_challenge from a verifier. */
function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

/**
 * Decode the id_token payload (without verifying the signature — it came
 * straight from Keycloak over a trusted server-to-server call) and check its
 * nonce matches the one we issued.
 */
function verifyNonce(idToken: string, want: string): void {
  const parts = idToken.split('.')
  if (parts.length !== 3) {
    throw new BadGatewayException('malformed id_token')
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    ) as { nonce?: string }
    if (payload.nonce !== want) {
      throw new BadGatewayException('id_token nonce mismatch')
    }
  } catch (err) {
    if (err instanceof BadGatewayException) throw err
    throw new BadGatewayException('cannot parse id_token')
  }
}
