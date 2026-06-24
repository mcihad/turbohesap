import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

// Roles marks a route as requiring at least one of the given roles (checked
// against realm roles and this module's client roles). With no roles it just
// requires a valid token. Use together with KeycloakAuthGuard:
//
//   @UseGuards(KeycloakAuthGuard)
//   @Roles('admin')
//   @Get('reports')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
