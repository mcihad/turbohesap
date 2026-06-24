import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

import type { Claims } from '../auth/auth.types'

// CurrentUser injects the verified access-token claims stashed by
// KeycloakAuthGuard. Only valid on routes guarded by it.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Claims => {
    const req = ctx.switchToHttp().getRequest<{ user: Claims }>()
    return req.user
  },
)
