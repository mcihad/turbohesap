import type { AuthTokens, CallbackResponse } from '../models/auth'

// IAuthService is the contract for the backend-mediated Keycloak flow. The
// browser/app never talks to Keycloak's token endpoint directly — the backend
// (which holds the client secret) does. Implementations live in ../clients.
export interface IAuthService {
  /**
   * Full-page redirect URL that starts the Keycloak login. The caller navigates
   * the browser here (it is not an XHR call).
   */
  loginUrl(redirect?: string): string

  /** Exchange the authorization code (+ state) for tokens. */
  exchangeCode(code: string, state: string): Promise<CallbackResponse>

  /** Swap a refresh token for a fresh token set. */
  refresh(refreshToken: string): Promise<AuthTokens>

  /**
   * Ask the backend for the Keycloak end-session URL (best effort). Returns the
   * URL the caller should navigate to in order to clear the Keycloak session.
   */
  logout(idToken: string, refreshToken: string): Promise<string>
}
