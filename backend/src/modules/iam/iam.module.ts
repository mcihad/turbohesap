import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AccessService } from './access.service'
import { Permission } from './entities/permission.entity'
import { Role } from './entities/role.entity'
import { User } from './entities/user.entity'
import { PermissionsController } from './permissions/permissions.controller'
import { PermissionsService } from './permissions/permissions.service'
import { RolesController } from './roles/roles.controller'
import { RolesService } from './roles/roles.service'
import { SeedService } from './seed/seed.service'
import { UsersController } from './users/users.controller'
import { UsersService } from './users/users.service'

// IAM (identity & access management): users, roles, permissions. Served under
// /api/iam/<resource>. Exports TypeOrmModule (User repository) and AccessService
// (effective-permission resolution) for the global PermissionsGuard and auth.
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [UsersController, RolesController, PermissionsController],
  providers: [
    UsersService,
    RolesService,
    PermissionsService,
    SeedService,
    AccessService,
  ],
  exports: [TypeOrmModule, AccessService],
})
export class IamModule {}
