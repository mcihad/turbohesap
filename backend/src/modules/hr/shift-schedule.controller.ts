import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common'

import {
  HrPermissions,
  type EmployeeShiftAssignmentDto,
  type EmployeeShiftDayDto,
  type GenerateScheduleResult,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import {
  AssignEmployeeShiftDto,
  GenerateScheduleDto,
  SetShiftDayDto,
  UpdateEmployeeShiftDto,
} from './dto/shift-schedule.dto'
import { ShiftAssignmentListQueryDto, ShiftDayListQueryDto } from './dto/hr-pdks-query.dto'
import { ShiftScheduleService } from './shift-schedule.service'

@Controller('hr/shift-schedule')
export class ShiftScheduleController {
  constructor(private readonly schedule: ShiftScheduleService) {}

  // Calling user's own materialized schedule (static — before any param routes).
  @Get('mine')
  @RequirePermissions(HrPermissions.attendanceCheckin)
  mine(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<EmployeeShiftDayDto[]> {
    return this.schedule.mine(user, from, to)
  }

  @Get('assignments')
  @RequirePermissions(HrPermissions.shiftsRead)
  listAssignments(
    @Query() query: ShiftAssignmentListQueryDto,
  ): Promise<EmployeeShiftAssignmentDto[]> {
    return this.schedule.listAssignments(query)
  }

  @Post('assignments')
  @RequirePermissions(HrPermissions.shiftsAssign)
  assign(@Body() dto: AssignEmployeeShiftDto): Promise<EmployeeShiftAssignmentDto> {
    return this.schedule.assign(dto)
  }

  @Patch('assignments/:id')
  @RequirePermissions(HrPermissions.shiftsAssign)
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeShiftDto,
  ): Promise<EmployeeShiftAssignmentDto> {
    return this.schedule.updateAssignment(id, dto)
  }

  @Delete('assignments/:id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.shiftsAssign)
  async removeAssignment(@Param('id') id: string): Promise<void> {
    await this.schedule.removeAssignment(id)
  }

  @Post('generate')
  @RequirePermissions(HrPermissions.shiftsAssign)
  generate(@Body() dto: GenerateScheduleDto): Promise<GenerateScheduleResult> {
    return this.schedule.generate(dto)
  }

  @Get('days')
  @RequirePermissions(HrPermissions.shiftsRead)
  listDays(@Query() query: ShiftDayListQueryDto): Promise<EmployeeShiftDayDto[]> {
    return this.schedule.listDays(query)
  }

  @Put('days')
  @RequirePermissions(HrPermissions.shiftsAssign)
  setDay(@Body() dto: SetShiftDayDto): Promise<EmployeeShiftDayDto> {
    return this.schedule.setDay(dto)
  }
}
