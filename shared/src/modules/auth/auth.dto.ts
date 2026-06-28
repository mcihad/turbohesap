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

// ── POS PIN auth ──
// Open a terminal as a POS user with username + numeric PIN (returns a full JWT
// session, same shape as login).
export interface PosLoginRequest {
  username: string
  pin: string
}

// Switch the active cashier mid-shift using a PIN, authenticated by the existing
// device/terminal session — returns a new user session.
export interface PosSwitchRequest {
  pin: string
}

// Set/change a POS PIN. `currentPassword` required for self-service; admins use
// the IAM users endpoint (POST /iam/users/:id/pin) gated by pos.users.pin.
export interface SetPinRequest {
  pin: string
  currentPassword?: string
}
