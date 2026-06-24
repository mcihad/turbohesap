import { SetMetadata } from '@nestjs/common'

export const PERMISSIONS_KEY = 'permissions'

// Requires the caller to hold ALL listed permissions (checked by
// PermissionsGuard against the access token). Use on protected routes:
//
//   @UseGuards(PermissionsGuard)
//   @RequirePermissions('iam.users.write')
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)
