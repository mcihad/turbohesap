import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'

import type { UserDto } from '@turbohesap/shared'

import { Branch } from '../../org/entities/branch.entity'
import { Role } from '../entities/role.entity'
import { User } from '../entities/user.entity'
import { toUserDto } from '../mappers'
import type { CreateUserDto } from './dto/create-user.dto'
import type { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
  ) {}

  async list(): Promise<UserDto[]> {
    const users = await this.users.find({ order: { username: 'ASC' } })
    return users.map(toUserDto)
  }

  async get(id: string): Promise<UserDto> {
    return toUserDto(await this.findOrFail(id))
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    const exists = await this.users.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    })
    if (exists) throw new BadRequestException('username or email already in use')

    const user = this.users.create({
      username: dto.username,
      email: dto.email,
      passwordHash: hash(dto.password),
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
      isActive: dto.isActive ?? true,
      roles: await this.resolveRoles(dto.roleIds),
      branches: await this.resolveBranches(dto.branchIds),
    })
    const saved = await this.users.save(user)
    return toUserDto(await this.findOrFail(saved.id))
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const user = await this.findOrFail(id)
    if (dto.email !== undefined) user.email = dto.email
    if (dto.firstName !== undefined) user.firstName = dto.firstName
    if (dto.lastName !== undefined) user.lastName = dto.lastName
    if (dto.isActive !== undefined) user.isActive = dto.isActive
    if (dto.password) user.passwordHash = hash(dto.password)
    if (dto.roleIds) user.roles = await this.resolveRoles(dto.roleIds)
    if (dto.branchIds) user.branches = await this.resolveBranches(dto.branchIds)
    await this.users.save(user)
    return toUserDto(await this.findOrFail(id))
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOrFail(id)
    await this.users.remove(user)
  }

  private async findOrFail(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } })
    if (!user) throw new NotFoundException('user not found')
    return user
  }

  private async resolveRoles(ids?: string[]): Promise<Role[]> {
    if (!ids || ids.length === 0) return []
    const roles = await this.roles.find({ where: { id: In(ids) } })
    if (roles.length !== ids.length) {
      throw new BadRequestException('one or more roleIds are invalid')
    }
    return roles
  }

  private async resolveBranches(ids?: string[]): Promise<Branch[]> {
    if (!ids || ids.length === 0) return []
    const branches = await this.branches.find({ where: { id: In(ids) } })
    if (branches.length !== ids.length) {
      throw new BadRequestException('one or more branchIds are invalid')
    }
    return branches
  }
}

function hash(password: string): string {
  return bcrypt.hashSync(password, 10)
}
