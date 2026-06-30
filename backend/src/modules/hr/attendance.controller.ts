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
  type AttendanceImportResultDto,
  type AttendanceRecordDto,
  type CheckinResultDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import {
  CheckinDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto'
import { AttendanceImportDto } from './dto/card.dto'
import { AttendanceListQueryDto } from './dto/hr-pdks-query.dto'
import { AttendanceService } from './attendance.service'

@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  // Mobile self check-in/out (static routes before :id).
  @Post('checkin')
  @RequirePermissions(HrPermissions.attendanceCheckin)
  checkin(
    @CurrentUser() user: AuthUser,
    @Body() dto: CheckinDto,
  ): Promise<CheckinResultDto> {
    return this.attendance.checkin(user, dto)
  }

  @Get('mine')
  @RequirePermissions(HrPermissions.attendanceCheckin)
  mine(
    @CurrentUser() user: AuthUser,
    @Query() query: AttendanceListQueryDto,
  ): Promise<AttendanceRecordDto[]> {
    return this.attendance.mine(user, query)
  }

  // Card-access batch import (vendor-neutral standard).
  @Post('import')
  @RequirePermissions(HrPermissions.cardsImport)
  import(@Body() dto: AttendanceImportDto): Promise<AttendanceImportResultDto> {
    return this.attendance.import(dto)
  }

  @Get()
  @RequirePermissions(HrPermissions.attendanceRead)
  list(@Query() query: AttendanceListQueryDto): Promise<AttendanceRecordDto[]> {
    return this.attendance.list(query)
  }

  @Get(':id')
  @RequirePermissions(HrPermissions.attendanceRead)
  get(@Param('id') id: string): Promise<AttendanceRecordDto> {
    return this.attendance.get(id)
  }

  @Post()
  @RequirePermissions(HrPermissions.attendanceManage)
  create(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AttendanceRecordDto> {
    return this.attendance.create(dto, user)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.attendanceManage)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ): Promise<AttendanceRecordDto> {
    return this.attendance.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.attendanceManage)
  async remove(@Param('id') id: string): Promise<void> {
    await this.attendance.remove(id)
  }
}
