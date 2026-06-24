import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import { hasAnyRole } from '../auth/auth.types'
import { TokenVerifier } from '../auth/token-verifier.service'
import { loadManifest } from '../module/manifest'
import { ROLES_KEY } from './roles.decorator'

// KeycloakAuthGuard requires a valid Keycloak access token (verified against the
// JWKS) and, when @Roles() is present, that the caller has at least one of them
// — checked against realm roles and this module's client roles.
@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private readonly clientId = loadManifest().name

  constructor(
    private readonly verifier: TokenVerifier,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>()
    const raw = bearerToken(req.headers.authorization)
    if (!raw) throw new UnauthorizedException('missing bearer token')

    const claims = await this.verifier.verify(raw)

    const required =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? []

    if (!hasAnyRole(claims, this.clientId, required)) {
      throw new ForbiddenException('insufficient role')
    }

    // Stash claims for @CurrentUser().
    ;(req as Request & { user: typeof claims }).user = claims
    return true
  }
}

/** Extract the token from an "Authorization: Bearer <token>" header. */
function bearerToken(header?: string): string {
  if (!header) return ''
  const prefix = 'Bearer '
  if (header.length > prefix.length && header.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
    return header.slice(prefix.length).trim()
  }
  return ''
}
