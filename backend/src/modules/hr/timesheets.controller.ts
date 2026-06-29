import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common'

import { HrPermissions, type TimesheetDto, type TimesheetListQuery } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { TimesheetsService } from './timesheets.service'
import { UpsertTimesheetDto } from './dto/timesheet.dto'

@Controller('hr/timesheets')
export class TimesheetsController {
  constructor(private readonly timesheets: TimesheetsService) {}

  @Get()
  @RequirePermissions(HrPermissions.read)
  list(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<TimesheetDto[]> {
    const query: TimesheetListQuery = {
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      employeeId,
    }
    return this.timesheets.list(query)
  }

  @Put()
  @RequirePermissions(HrPermissions.write)
  upsert(@Body() dto: UpsertTimesheetDto): Promise<TimesheetDto> {
    return this.timesheets.upsert(dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.timesheets.remove(id)
  }
}
