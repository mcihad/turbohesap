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

import { OrgPermissions, type BranchDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'
import { BranchesService } from './branches.service'

// Authorization is enforced by the global PermissionsGuard via the
// @RequirePermissions decorators below (see app.module.ts).
@Controller('org/branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions(OrgPermissions.branchesRead)
  list(): Promise<BranchDto[]> {
    return this.branches.list()
  }

  @Get(':id')
  @RequirePermissions(OrgPermissions.branchesRead)
  get(@Param('id') id: string): Promise<BranchDto> {
    return this.branches.get(id)
  }

  @Post()
  @RequirePermissions(OrgPermissions.branchesWrite)
  create(@Body() dto: CreateBranchDto): Promise<BranchDto> {
    return this.branches.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(OrgPermissions.branchesWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchDto> {
    return this.branches.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(OrgPermissions.branchesWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.branches.remove(id)
  }
}
