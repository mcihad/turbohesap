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

import { HrPermissions, type ShiftRotationDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateShiftRotationDto,
  UpdateShiftRotationDto,
} from './dto/shift-rotation.dto'
import { ShiftRotationsService } from './shift-rotations.service'

@Controller('hr/shift-rotations')
export class ShiftRotationsController {
  constructor(private readonly rotations: ShiftRotationsService) {}

  @Get()
  @RequirePermissions(HrPermissions.shiftsRead)
  list(): Promise<ShiftRotationDto[]> {
    return this.rotations.list()
  }

  @Get(':id')
  @RequirePermissions(HrPermissions.shiftsRead)
  get(@Param('id') id: string): Promise<ShiftRotationDto> {
    return this.rotations.get(id)
  }

  @Post()
  @RequirePermissions(HrPermissions.shiftsWrite)
  create(@Body() dto: CreateShiftRotationDto): Promise<ShiftRotationDto> {
    return this.rotations.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.shiftsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftRotationDto,
  ): Promise<ShiftRotationDto> {
    return this.rotations.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.shiftsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.rotations.remove(id)
  }
}
