import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

import { configuration } from '../../config/configuration'
import type { AuthUser } from '../decorators/current-user.decorator'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

// Global guard: verifies the access token (signature, expiry) and stashes the
// decoded principal on the request. Routes marked @Public() are skipped.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly accessSecret = configuration().jwt.accessSecret

  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const req = context.switchToHttp().getRequest<Request>()
    const token = bearer(req.headers.authorization)
    if (!token) throw new UnauthorizedException('missing bearer token')

    try {
      const payload = await this.jwt.verifyAsync<AuthUser & { type?: string }>(
        token,
        { secret: this.accessSecret },
      )
      if (payload.type && payload.type !== 'access') {
        throw new UnauthorizedException('wrong token type')
      }
      ;(req as Request & { user: AuthUser }).user = {
        sub: payload.sub,
        username: payload.username,
        roles: payload.roles ?? [],
      }
      return true
    } catch {
      throw new UnauthorizedException('invalid or expired token')
    }
  }
}

function bearer(header?: string): string {
  if (!header) return ''
  const prefix = 'Bearer '
  return header.toLowerCase().startsWith(prefix.toLowerCase())
    ? header.slice(prefix.length).trim()
    : ''
}
