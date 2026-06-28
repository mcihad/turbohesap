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

import { IsOptional, IsString } from 'class-validator'

import {
  IamPermissions,
  PosPermissions,
  type SetUserPinRequest,
  type UserDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

class SetUserPinDto implements SetUserPinRequest {
  @IsOptional() @IsString() pin!: string | null
}

// Authorization is enforced by the global PermissionsGuard via the
// @RequirePermissions decorators below (see app.module.ts).
@Controller('iam/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(IamPermissions.usersRead)
  list(): Promise<UserDto[]> {
    return this.users.list()
  }

  @Get(':id')
  @RequirePermissions(IamPermissions.usersRead)
  get(@Param('id') id: string): Promise<UserDto> {
    return this.users.get(id)
  }

  @Post()
  @RequirePermissions(IamPermissions.usersWrite)
  create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.users.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(IamPermissions.usersWrite)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserDto> {
    return this.users.update(id, dto)
  }

  @Post(':id/pin')
  @RequirePermissions(PosPermissions.usersPin)
  setPin(@Param('id') id: string, @Body() dto: SetUserPinDto): Promise<UserDto> {
    return this.users.setPin(id, dto.pin)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(IamPermissions.usersWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.users.remove(id)
  }
}
