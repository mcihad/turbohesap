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

import { PosPermissions, type PosRegisterDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { PosRegistersService } from './pos-registers.service'
import { CreatePosRegisterDto, UpdatePosRegisterDto } from './dto/pos.dto'

@Controller('pos/registers')
export class PosRegistersController {
  constructor(private readonly registers: PosRegistersService) {}

  @Get()
  @RequirePermissions(PosPermissions.registersRead)
  list(): Promise<PosRegisterDto[]> {
    return this.registers.list()
  }

  @Get(':id')
  @RequirePermissions(PosPermissions.registersRead)
  get(@Param('id') id: string): Promise<PosRegisterDto> {
    return this.registers.get(id)
  }

  @Post()
  @RequirePermissions(PosPermissions.registersWrite)
  create(@Body() dto: CreatePosRegisterDto): Promise<PosRegisterDto> {
    return this.registers.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(PosPermissions.registersWrite)
  update(@Param('id') id: string, @Body() dto: UpdatePosRegisterDto): Promise<PosRegisterDto> {
    return this.registers.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(PosPermissions.registersWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.registers.remove(id)
  }
}
