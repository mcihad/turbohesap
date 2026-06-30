import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Branch } from '../org/entities/branch.entity'
import { RefreshToken } from '../auth/entities/refresh-token.entity'
import { AccessService } from './access.service'
import { AuditSubscriber } from './audit/audit.subscriber'
import { AuditLogsController } from './audit/audit-logs.controller'
import { AuditLogsService } from './audit/audit-logs.service'
import { AuditLog } from './entities/audit-log.entity'
import { ErrorLog } from './entities/error-log.entity'
import { Permission } from './entities/permission.entity'
import { Role } from './entities/role.entity'
import { User } from './entities/user.entity'
import { ErrorLogsController } from './errors/error-logs.controller'
import { ErrorLogsService } from './errors/error-logs.service'
import { PermissionsController } from './permissions/permissions.controller'
import { PermissionsService } from './permissions/permissions.service'
import { RolesController } from './roles/roles.controller'
import { RolesService } from './roles/roles.service'
import { SeedService } from './seed/seed.service'
import { UsersController } from './users/users.controller'
import { UsersService } from './users/users.service'

// IAM (identity & access management): users, roles, permissions, plus the
// cross-cutting audit + error-log mechanisms. Served under /api/iam/<resource>.
// Exports TypeOrmModule (repositories), AccessService (effective-permission
// resolution) and ErrorLogsService (used by the global exception filter).
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, AuditLog, ErrorLog, Branch, RefreshToken]),
  ],
  controllers: [
    UsersController,
    RolesController,
    PermissionsController,
    AuditLogsController,
    ErrorLogsController,
  ],
  providers: [
    UsersService,
    RolesService,
    PermissionsService,
    SeedService,
    AccessService,
    AuditLogsService,
    ErrorLogsService,
    AuditSubscriber,
  ],
  exports: [TypeOrmModule, AccessService, ErrorLogsService, UsersService],
})
export class IamModule {}
