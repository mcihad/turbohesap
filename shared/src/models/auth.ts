// Auth DTOs — the camelCase shapes exchanged with the backend's /api/auth/*
// endpoints. The backend mediates the Keycloak (OIDC) flow; the client never
// sees the client secret. These are the single source of truth for the auth
// contract, shared by the web frontend and the mobile app.

/** Token set returned by the backend after a successful login or refresh. */
export interface AuthTokens {
  accessToken: string
  idToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  refreshExpiresIn: number
  scope: string
}

/** Body for POST /api/auth/callback. */
export interface CallbackRequest {
  code: string
  state: string
}

/** Response of POST /api/auth/callback: tokens plus the post-login redirect. */
export interface CallbackResponse extends AuthTokens {
  redirect: string
}

/** Body for POST /api/auth/refresh. */
export interface RefreshRequest {
  refreshToken: string
}

/** Body for POST /api/auth/logout. */
export interface LogoutRequest {
  idToken: string
  refreshToken: string
}

/** Response of POST /api/auth/logout: the Keycloak end-session URL to visit. */
export interface LogoutResponse {
  logoutUrl: string
}
