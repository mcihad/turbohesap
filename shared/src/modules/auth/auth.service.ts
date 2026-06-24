import type { CurrentUser } from '../iam/user.dto'
import type { AuthTokens, LoginResponse } from './auth.dto'

// Contract for local (username/password) authentication backed by JWTs. The
// access token carries roles only; permissions are fetched separately (so the
// token stays small even with many permissions).
export interface IAuthService {
  login(username: string, password: string): Promise<LoginResponse>
  refresh(refreshToken: string): Promise<AuthTokens>
  logout(refreshToken: string): Promise<void>
  /** Current user identity + roles. */
  me(): Promise<CurrentUser>
  /** The current user's permission keys (resolved from roles, server-side). */
  permissions(): Promise<string[]>
}
