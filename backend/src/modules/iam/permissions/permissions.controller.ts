import { Controller, Get } from '@nestjs/common'

import { IamPermissions, type PermissionDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PermissionsService } from './permissions.service'

// Authorization is enforced by the global PermissionsGuard via the
// @RequirePermissions decorator below (see app.module.ts).
@Controller('iam/permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @RequirePermissions(IamPermissions.permissionsRead)
  list(): Promise<PermissionDto[]> {
    return this.permissions.list()
  }
}
