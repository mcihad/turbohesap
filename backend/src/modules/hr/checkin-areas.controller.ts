import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'

import { HrPermissions, type CheckinAreaDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateCheckinAreaDto,
  SetAreaEmployeesDto,
  UpdateCheckinAreaDto,
} from './dto/checkin-area.dto'
import { CheckinAreaListQueryDto } from './dto/hr-pdks-query.dto'
import { CheckinAreasService } from './checkin-areas.service'

@Controller('hr/checkin-areas')
export class CheckinAreasController {
  constructor(private readonly areas: CheckinAreasService) {}

  @Get()
  @RequirePermissions(HrPermissions.areasRead)
  list(@Query() query: CheckinAreaListQueryDto): Promise<CheckinAreaDto[]> {
    return this.areas.list(query)
  }

  @Get(':id')
  @RequirePermissions(HrPermissions.areasRead)
  get(@Param('id') id: string): Promise<CheckinAreaDto> {
    return this.areas.get(id)
  }

  @Get(':id/employees')
  @RequirePermissions(HrPermissions.areasRead)
  listEmployees(@Param('id') id: string): Promise<string[]> {
    return this.areas.listEmployees(id)
  }

  @Put(':id/employees')
  @RequirePermissions(HrPermissions.areasAssign)
  setEmployees(
    @Param('id') id: string,
    @Body() dto: SetAreaEmployeesDto,
  ): Promise<string[]> {
    return this.areas.setEmployees(id, dto)
  }

  @Post()
  @RequirePermissions(HrPermissions.areasWrite)
  create(@Body() dto: CreateCheckinAreaDto): Promise<CheckinAreaDto> {
    return this.areas.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.areasWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCheckinAreaDto,
  ): Promise<CheckinAreaDto> {
    return this.areas.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.areasWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.areas.remove(id)
  }
}
