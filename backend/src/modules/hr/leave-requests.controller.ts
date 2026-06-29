import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import {
  HrPermissions,
  type LeaveRequestDto,
  type LeaveRequestListQuery,
  type LeaveStatus,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { LeaveRequestsService } from './leave-requests.service'
import { CreateLeaveRequestDto, UpdateLeaveRequestDto } from './dto/leave.dto'

@Controller('hr/leave-requests')
export class LeaveRequestsController {
  constructor(private readonly requests: LeaveRequestsService) {}

  @Get()
  @RequirePermissions(HrPermissions.read)
  list(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<LeaveRequestDto[]> {
    const query: LeaveRequestListQuery = { employeeId, status, from, to }
    return this.requests.list(query)
  }

  @Get(':id')
  @RequirePermissions(HrPermissions.read)
  get(@Param('id') id: string): Promise<LeaveRequestDto> {
    return this.requests.get(id)
  }

  @Post()
  @RequirePermissions(HrPermissions.write)
  create(@Body() dto: CreateLeaveRequestDto): Promise<LeaveRequestDto> {
    return this.requests.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateLeaveRequestDto): Promise<LeaveRequestDto> {
    return this.requests.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.requests.remove(id)
  }

  @Post(':id/approve')
  @RequirePermissions(HrPermissions.approve)
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<LeaveRequestDto> {
    return this.requests.approve(id, user.sub)
  }

  @Post(':id/reject')
  @RequirePermissions(HrPermissions.approve)
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<LeaveRequestDto> {
    return this.requests.reject(id, user.sub)
  }
}
