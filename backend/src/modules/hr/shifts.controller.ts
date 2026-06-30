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

import { HrPermissions, type ShiftDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto'
import { ShiftListQueryDto } from './dto/hr-pdks-query.dto'
import { ShiftsService } from './shifts.service'

@Controller('hr/shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  @RequirePermissions(HrPermissions.shiftsRead)
  list(@Query() query: ShiftListQueryDto): Promise<ShiftDto[]> {
    return this.shifts.list(query)
  }

  @Get(':id')
  @RequirePermissions(HrPermissions.shiftsRead)
  get(@Param('id') id: string): Promise<ShiftDto> {
    return this.shifts.get(id)
  }

  @Post()
  @RequirePermissions(HrPermissions.shiftsWrite)
  create(@Body() dto: CreateShiftDto): Promise<ShiftDto> {
    return this.shifts.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.shiftsWrite)
  update(@Param('id') id: string, @Body() dto: UpdateShiftDto): Promise<ShiftDto> {
    return this.shifts.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.shiftsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.shifts.remove(id)
  }
}
