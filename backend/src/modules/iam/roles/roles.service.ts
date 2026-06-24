import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { RoleDto } from '@turbohesap/shared'

import { Permission } from '../entities/permission.entity'
import { Role } from '../entities/role.entity'
import { toRoleDto } from '../mappers'
import type { CreateRoleDto } from './dto/create-role.dto'
import type { UpdateRoleDto } from './dto/update-role.dto'

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
  ) {}

  async list(): Promise<RoleDto[]> {
    const roles = await this.roles.find({ order: { name: 'ASC' } })
    return roles.map(toRoleDto)
  }

  async get(id: string): Promise<RoleDto> {
    return toRoleDto(await this.findOrFail(id))
  }

  async create(dto: CreateRoleDto): Promise<RoleDto> {
    const exists = await this.roles.findOne({ where: { name: dto.name } })
    if (exists) throw new BadRequestException('role name already in use')

    const role = this.roles.create({
      name: dto.name,
      module: dto.module,
      description: dto.description ?? '',
      isSystem: false,
      permissions: await this.resolvePermissions(dto.permissionKeys),
    })
    const saved = await this.roles.save(role)
    return toRoleDto(await this.findOrFail(saved.id))
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDto> {
    const role = await this.findOrFail(id)
    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new ForbiddenException('cannot rename a system role')
    }
    if (dto.name !== undefined) role.name = dto.name
    if (dto.module !== undefined) role.module = dto.module
    if (dto.description !== undefined) role.description = dto.description
    if (dto.permissionKeys) {
      role.permissions = await this.resolvePermissions(dto.permissionKeys)
    }
    await this.roles.save(role)
    return toRoleDto(await this.findOrFail(id))
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOrFail(id)
    if (role.isSystem) throw new ForbiddenException('cannot delete a system role')
    await this.roles.remove(role)
  }

  private async findOrFail(id: string): Promise<Role> {
    const role = await this.roles.findOne({ where: { id } })
    if (!role) throw new NotFoundException('role not found')
    return role
  }

  private async resolvePermissions(keys?: string[]): Promise<Permission[]> {
    if (!keys || keys.length === 0) return []
    const perms = await this.permissions.find({ where: { key: In(keys) } })
    if (perms.length !== new Set(keys).size) {
      throw new BadRequestException('one or more permission keys are invalid')
    }
    return perms
  }
}
