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
  type ActivityDto,
  type ActivityListQuery,
  type ActivityStatus,
  type ActivityType,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ActivitiesService } from './activities.service'
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto'

@Controller('contacts/activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.activitiesRead)
  list(
    @Query('contactId') contactId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('status') status?: ActivityStatus,
    @Query('activityType') activityType?: ActivityType,
  ): Promise<ActivityDto[]> {
    const query: ActivityListQuery = { contactId, opportunityId, status, activityType }
    return this.activities.list(query)
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.activitiesRead)
  get(@Param('id') id: string): Promise<ActivityDto> {
    return this.activities.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.activitiesWrite)
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthUser): Promise<ActivityDto> {
    return this.activities.create(dto, user.sub)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.activitiesWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ActivityDto> {
    return this.activities.update(id, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.activitiesWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.activities.remove(id)
  }
}
