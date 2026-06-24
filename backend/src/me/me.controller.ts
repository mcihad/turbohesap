import { Controller, Get, UseGuards } from '@nestjs/common'

import type { CurrentUser as CurrentUserDto } from '@kentos/shared'

import { type Claims, rolesOf } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { KeycloakAuthGuard } from '../common/keycloak-auth.guard'
import { loadManifest } from '../module/manifest'

// MeController returns the verified caller. Guarded by KeycloakAuthGuard with no
// @Roles(), so any valid access token is accepted.
@Controller('me')
export class MeController {
  private readonly clientId = loadManifest().name

  @Get()
  @UseGuards(KeycloakAuthGuard)
  me(@CurrentUser() claims: Claims): CurrentUserDto {
    return {
      sub: claims.sub,
      preferredUsername: claims.preferred_username ?? '',
      email: claims.email ?? '',
      name: claims.name ?? '',
      roles: rolesOf(claims, this.clientId),
    }
  }
}
