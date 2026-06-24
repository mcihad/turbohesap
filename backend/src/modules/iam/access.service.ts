import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { User } from './entities/user.entity'
import { permissionKeysOf } from './mappers'

// Resolves a user's effective permission keys from the database (via their roles)
// — the single source of truth for authorization. Used by the global
// PermissionsGuard (per protected request) and the /api/auth/permissions
// endpoint. Permissions are NOT carried in the access token, so role/permission
// changes take effect immediately and the token stays small.
@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async permissionKeys(userId: string): Promise<string[]> {
    // roles (eager) + role.permissions (eager) load with the user.
    const user = await this.users.findOne({ where: { id: userId } })
    return user ? permissionKeysOf(user) : []
  }
}
