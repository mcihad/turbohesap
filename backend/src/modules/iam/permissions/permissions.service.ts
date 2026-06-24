import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { PermissionDto } from '@turbohesap/shared'

import { Permission } from '../entities/permission.entity'

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
  ) {}

  async list(): Promise<PermissionDto[]> {
    const perms = await this.permissions.find({ order: { key: 'ASC' } })
    return perms.map((p) => ({
      key: p.key,
      description: p.description,
      group: p.group,
    }))
  }
}
