import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { AccessService } from '../../modules/iam/access.service'
import type { AuthUser } from '../decorators/current-user.decorator'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'

// Global authorization guard: requires the caller to hold ALL permissions
// declared with @RequirePermissions(...). Runs after JwtAuthGuard (req.user is
// set). Effective permissions are resolved from the DB (AccessService), not from
// the token — so the token stays small and role/permission changes apply at once.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!required || required.length === 0) return true

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>()
    if (!req.user) throw new ForbiddenException('insufficient permissions')

    const held = new Set(await this.access.permissionKeys(req.user.sub))
    const ok = required.every((p) => held.has(p))
    if (!ok) throw new ForbiddenException('insufficient permissions')
    return true
  }
}
