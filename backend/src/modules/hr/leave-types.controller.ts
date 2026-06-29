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

import { HrPermissions, type LeaveTypeDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { LeaveTypesService } from './leave-types.service'
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave.dto'

@Controller('hr/leave-types')
export class LeaveTypesController {
  constructor(private readonly leaveTypes: LeaveTypesService) {}

  @Get()
  @RequirePermissions(HrPermissions.read)
  list(): Promise<LeaveTypeDto[]> {
    return this.leaveTypes.list()
  }

  @Post()
  @RequirePermissions(HrPermissions.write)
  create(@Body() dto: CreateLeaveTypeDto): Promise<LeaveTypeDto> {
    return this.leaveTypes.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto): Promise<LeaveTypeDto> {
    return this.leaveTypes.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.leaveTypes.remove(id)
  }
}
