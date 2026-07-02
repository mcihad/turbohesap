import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import { ProductionPermissions, type QualityCheckDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { QualityCheckListQueryDto, RecordQualityCheckDto } from './dto/quality.dto'
import { QualityChecksService } from './quality-checks.service'

@Controller('production/quality-checks')
export class QualityChecksController {
  constructor(private readonly quality: QualityChecksService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: QualityCheckListQueryDto): Promise<QualityCheckDto[]> {
    return this.quality.list(query)
  }

  @Get(':id')
  @RequirePermissions(ProductionPermissions.read)
  get(@Param('id') id: string): Promise<QualityCheckDto> {
    return this.quality.get(id)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.qualityManage)
  record(@Body() dto: RecordQualityCheckDto): Promise<QualityCheckDto> {
    return this.quality.record(dto)
  }
}
