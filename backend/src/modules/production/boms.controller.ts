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
import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator'

import {
  ProductionPermissions,
  type BomDto,
  type BomListQuery,
  type BomType,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateBomDto, UpdateBomDto } from './dto/bom.dto'
import { BomsService } from './boms.service'

class BomListQueryDto implements BomListQuery {
  @IsOptional() @IsString() productId?: string
  @IsOptional() @IsIn(['manufacture', 'phantom', 'subcontract']) type?: BomType
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  isActive?: boolean
  @IsOptional() @IsString() search?: string
}

@Controller('production/boms')
export class BomsController {
  constructor(private readonly boms: BomsService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: BomListQueryDto): Promise<BomDto[]> {
    return this.boms.list(query)
  }

  @Get(':id')
  @RequirePermissions(ProductionPermissions.read)
  get(@Param('id') id: string): Promise<BomDto> {
    return this.boms.get(id)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.write)
  create(@Body() dto: CreateBomDto): Promise<BomDto> {
    return this.boms.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ProductionPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateBomDto): Promise<BomDto> {
    return this.boms.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ProductionPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.boms.remove(id)
  }
}
