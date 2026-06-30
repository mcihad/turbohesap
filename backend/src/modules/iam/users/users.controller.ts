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

import { IsOptional, IsString, MinLength } from 'class-validator'

import {
  IamPermissions,
  PosPermissions,
  type ResetPasswordRequest,
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

class ResetPasswordDto implements ResetPasswordRequest {
  @IsString() @MinLength(6) password!: string
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

  // Admin reset/renew of a user's password (revokes their sessions).
  @Post(':id/reset-password')
  @HttpCode(204)
  @RequirePermissions(IamPermissions.usersPassword)
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    await this.users.resetPassword(id, dto.password)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(IamPermissions.usersWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.users.remove(id)
  }
}
