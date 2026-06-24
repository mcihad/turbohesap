import type { CurrentUser } from '../models/user'

// IMeService resolves the verified caller from GET /api/me. Requires a valid
// access token (attached by the http client).
export interface IMeService {
  getMe(): Promise<CurrentUser>
}
