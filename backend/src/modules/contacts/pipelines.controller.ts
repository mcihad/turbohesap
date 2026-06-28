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

import {
  ContactsPermissions,
  type PipelineDto,
  type PipelineStageDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { PipelinesService } from './pipelines.service'
import {
  CreatePipelineDto,
  CreatePipelineStageDto,
  ReorderStagesDto,
  UpdatePipelineDto,
  UpdatePipelineStageDto,
} from './dto/pipeline.dto'

@Controller('contacts/pipelines')
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.pipelinesRead)
  list(): Promise<PipelineDto[]> {
    return this.pipelines.list()
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.pipelinesRead)
  get(@Param('id') id: string): Promise<PipelineDto> {
    return this.pipelines.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  create(@Body() dto: CreatePipelineDto): Promise<PipelineDto> {
    return this.pipelines.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  update(@Param('id') id: string, @Body() dto: UpdatePipelineDto): Promise<PipelineDto> {
    return this.pipelines.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.pipelines.remove(id)
  }

  @Post(':id/stages')
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  addStage(@Param('id') id: string, @Body() dto: CreatePipelineStageDto): Promise<PipelineStageDto> {
    return this.pipelines.addStage(id, dto)
  }

  // Reorder must be matched before the parameterized :stageId routes.
  @Patch(':id/stages/reorder')
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  reorder(@Param('id') id: string, @Body() dto: ReorderStagesDto): Promise<PipelineDto> {
    return this.pipelines.reorderStages(id, dto)
  }

  @Patch(':id/stages/:stageId')
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  updateStage(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdatePipelineStageDto,
  ): Promise<PipelineStageDto> {
    return this.pipelines.updateStage(id, stageId, dto)
  }

  @Delete(':id/stages/:stageId')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  async removeStage(@Param('id') id: string, @Param('stageId') stageId: string): Promise<void> {
    await this.pipelines.removeStage(id, stageId)
  }
}
