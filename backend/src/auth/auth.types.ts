import type { AuthTokens } from '@kentos/shared'

// KeycloakTokens mirrors the snake_case token endpoint response from Keycloak.
// All of OUR API output is camelCase (see toAuthTokens / @kentos/shared).
export interface KeycloakTokens {
  access_token: string
  id_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
  scope: string
}

/** Map Keycloak's snake_case tokens to the camelCase wire DTO. */
export function toAuthTokens(t: KeycloakTokens): AuthTokens {
  return {
    accessToken: t.access_token,
    idToken: t.id_token,
    refreshToken: t.refresh_token,
    tokenType: t.token_type,
    expiresIn: t.expires_in,
    refreshExpiresIn: t.refresh_expires_in,
    scope: t.scope,
  }
}

// Discovery is the subset of the OpenID configuration document we use.
export interface Discovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
}

// Claims is the subset of access-token claims we use for identity/authorization.
export interface Claims {
  sub: string
  preferred_username?: string
  email?: string
  name?: string
  azp?: string
  realm_access?: { roles?: string[] }
  resource_access?: Record<string, { roles?: string[] }>
}

/** Realm roles plus the given client's resource roles. */
export function rolesOf(claims: Claims, clientId: string): string[] {
  const realm = claims.realm_access?.roles ?? []
  const client = claims.resource_access?.[clientId]?.roles ?? []
  return Array.from(new Set([...realm, ...client]))
}

/** Whether the claims carry at least one of `want` (empty want = any token). */
export function hasAnyRole(
  claims: Claims,
  clientId: string,
  want: string[],
): boolean {
  if (want.length === 0) return true
  const have = new Set(rolesOf(claims, clientId))
  return want.some((w) => have.has(w))
}
