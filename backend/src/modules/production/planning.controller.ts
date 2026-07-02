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
  ProductionPermissions,
  type PlanningRunDto,
  type ReorderRuleDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  ApplyPlanningDto,
  CreateReorderRuleDto,
  PlanningRunListQueryDto,
  ReorderRuleListQueryDto,
  RunPlanningDto,
  UpdateReorderRuleDto,
} from './dto/planning.dto'
import { ReorderRulesService } from './reorder-rules.service'
import { PlanningService } from './planning.service'

@Controller('production/reorder-rules')
export class ReorderRulesController {
  constructor(private readonly rules: ReorderRulesService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: ReorderRuleListQueryDto): Promise<ReorderRuleDto[]> {
    return this.rules.list(query)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.write)
  create(@Body() dto: CreateReorderRuleDto): Promise<ReorderRuleDto> {
    return this.rules.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ProductionPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateReorderRuleDto): Promise<ReorderRuleDto> {
    return this.rules.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ProductionPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.rules.remove(id)
  }
}

@Controller('production/planning-runs')
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: PlanningRunListQueryDto): Promise<PlanningRunDto[]> {
    return this.planning.list(query)
  }

  @Get(':id')
  @RequirePermissions(ProductionPermissions.read)
  get(@Param('id') id: string): Promise<PlanningRunDto> {
    return this.planning.get(id)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.planningRun)
  run(@Body() dto: RunPlanningDto): Promise<PlanningRunDto> {
    return this.planning.run(dto)
  }

  @Post(':id/apply')
  @RequirePermissions(ProductionPermissions.planningRun)
  apply(@Param('id') id: string, @Body() dto: ApplyPlanningDto): Promise<PlanningRunDto> {
    return this.planning.apply(id, dto)
  }

  @Post(':id/cancel')
  @RequirePermissions(ProductionPermissions.planningRun)
  cancel(@Param('id') id: string): Promise<PlanningRunDto> {
    return this.planning.cancel(id)
  }
}
