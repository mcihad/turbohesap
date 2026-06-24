import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

// The authenticated principal extracted from the access token by JwtAuthGuard.
// The token carries roles only; effective permissions are resolved from the DB
// (AccessService) when needed, not read from here.
export interface AuthUser {
  sub: string
  username: string
  roles: string[]
}

// Injects the AuthUser stashed on the request by JwtAuthGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>()
    return req.user
  },
)
