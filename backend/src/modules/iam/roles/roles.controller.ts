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

import { IamPermissions, type RoleDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CreateRoleDto } from './dto/create-role.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import { RolesService } from './roles.service'

// Authorization is enforced by the global PermissionsGuard via the
// @RequirePermissions decorators below (see app.module.ts).
@Controller('iam/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions(IamPermissions.rolesRead)
  list(): Promise<RoleDto[]> {
    return this.roles.list()
  }

  @Get(':id')
  @RequirePermissions(IamPermissions.rolesRead)
  get(@Param('id') id: string): Promise<RoleDto> {
    return this.roles.get(id)
  }

  @Post()
  @RequirePermissions(IamPermissions.rolesWrite)
  create(@Body() dto: CreateRoleDto): Promise<RoleDto> {
    return this.roles.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(IamPermissions.rolesWrite)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto): Promise<RoleDto> {
    return this.roles.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(IamPermissions.rolesWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.roles.remove(id)
  }
}
