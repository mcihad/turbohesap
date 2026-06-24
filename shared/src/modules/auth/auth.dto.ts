import type { CurrentUser } from '../iam/user.dto'

export interface LoginRequest {
  username: string
  password: string
}

// Token set returned on login/refresh. Lifetimes are in seconds (derived from
// the backend's JWT_*_TTL settings).
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  accessTokenExpiresIn: number
  refreshTokenExpiresIn: number
}

// Login also returns the authenticated user.
export interface LoginResponse extends AuthTokens {
  user: CurrentUser
}

export interface RefreshRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

// Re-confirm the current user's password (e.g. before a destructive action).
export interface VerifyPasswordRequest {
  password: string
}

export interface VerifyPasswordResponse {
  valid: boolean
}
