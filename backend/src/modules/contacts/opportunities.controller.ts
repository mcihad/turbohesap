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
  ContactsPermissions,
  type BulkResultDto,
  type OpportunityDto,
  type OpportunityListQuery,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { OpportunitiesService } from './opportunities.service'
import {
  CloseOpportunityDto,
  CreateOpportunityDto,
  MoveOpportunityDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto'
import { BulkOpportunityDto } from './dto/crm-fields.dto'

@Controller('contacts/opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.opportunitiesRead)
  list(
    @CurrentUser() user: AuthUser,
    @Query('contactId') contactId?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
    @Query('stage') stage?: string,
    @Query('ownerId') ownerId?: string,
    @Query('mine') mine?: string,
    @Query('openOnly') openOnly?: string,
  ): Promise<OpportunityDto[]> {
    const query: OpportunityListQuery = {
      contactId,
      pipelineId,
      stageId,
      stage,
      ownerId,
      mine: mine === 'true',
      openOnly: openOnly === 'true',
    }
    return this.opportunities.list(query, user.sub)
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.opportunitiesRead)
  get(@Param('id') id: string): Promise<OpportunityDto> {
    return this.opportunities.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.opportunitiesWrite)
  create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: AuthUser): Promise<OpportunityDto> {
    return this.opportunities.create(dto, user.sub)
  }

  @Post('bulk')
  @RequirePermissions(ContactsPermissions.opportunitiesWrite)
  bulk(@Body() dto: BulkOpportunityDto): Promise<BulkResultDto> {
    return this.opportunities.bulk(dto)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.opportunitiesWrite)
  update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto): Promise<OpportunityDto> {
    return this.opportunities.update(id, dto)
  }

  @Patch(':id/stage')
  @RequirePermissions(ContactsPermissions.opportunitiesWrite)
  move(
    @Param('id') id: string,
    @Body() dto: MoveOpportunityDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OpportunityDto> {
    return this.opportunities.move(id, dto, user.sub)
  }

  @Post(':id/close')
  @RequirePermissions(ContactsPermissions.opportunitiesWrite)
  close(@Param('id') id: string, @Body() dto: CloseOpportunityDto): Promise<OpportunityDto> {
    return this.opportunities.close(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.opportunitiesWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.opportunities.remove(id)
  }
}
