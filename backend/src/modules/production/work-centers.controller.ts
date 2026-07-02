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

import { ProductionPermissions, type WorkCenterDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateWorkCenterDto,
  UpdateWorkCenterDto,
  WorkCenterListQueryDto,
} from './dto/work-center.dto'
import { WorkCentersService } from './work-centers.service'

@Controller('production/work-centers')
export class WorkCentersController {
  constructor(private readonly workCenters: WorkCentersService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: WorkCenterListQueryDto): Promise<WorkCenterDto[]> {
    return this.workCenters.list(query)
  }

  @Get(':id')
  @RequirePermissions(ProductionPermissions.read)
  get(@Param('id') id: string): Promise<WorkCenterDto> {
    return this.workCenters.get(id)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.write)
  create(@Body() dto: CreateWorkCenterDto): Promise<WorkCenterDto> {
    return this.workCenters.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ProductionPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateWorkCenterDto): Promise<WorkCenterDto> {
    return this.workCenters.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ProductionPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.workCenters.remove(id)
  }
}
