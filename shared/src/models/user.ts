// Identity DTO returned by GET /api/me — the verified caller (from the access
// token claims) plus the roles relevant to this module.

export interface CurrentUser {
  sub: string
  preferredUsername: string
  email: string
  name: string
  roles: string[]
}
