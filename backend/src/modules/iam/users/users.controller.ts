import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'

import type { UserDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

// Authorization is enforced by the global PermissionsGuard via the
// @RequirePermissions decorators below (see app.module.ts).
@Controller('iam/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('iam.users.read')
  list(): Promise<UserDto[]> {
    return this.users.list()
  }

  @Get(':id')
  @RequirePermissions('iam.users.read')
  get(@Param('id') id: string): Promise<UserDto> {
    return this.users.get(id)
  }

  @Post()
  @RequirePermissions('iam.users.write')
  create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.users.create(dto)
  }

  @Patch(':id')
  @RequirePermissions('iam.users.write')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserDto> {
    return this.users.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('iam.users.write')
  async remove(@Param('id') id: string): Promise<void> {
    await this.users.remove(id)
  }
}
