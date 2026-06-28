import { Controller, Get, Query } from '@nestjs/common'

import { ContactsPermissions, type CrmDashboardDto } from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CrmAnalyticsService } from './crm-analytics.service'

@Controller('contacts/crm')
export class CrmController {
  constructor(private readonly analytics: CrmAnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions(ContactsPermissions.opportunitiesRead)
  dashboard(
    @CurrentUser() user: AuthUser,
    @Query('pipelineId') pipelineId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('mine') mine?: string,
  ): Promise<CrmDashboardDto> {
    return this.analytics.dashboard({ pipelineId, ownerId, mine: mine === 'true' }, user.sub)
  }
}
