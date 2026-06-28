import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'

import {
  ContactsPermissions,
  type NotificationDto,
  type UnreadCountDto,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { NotificationsService } from './notifications.service'

@Controller('contacts/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.notificationsRead)
  list(
    @CurrentUser() user: AuthUser,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ): Promise<NotificationDto[]> {
    return this.notifications.list(user.sub, {
      unread: unread === 'true',
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Get('unread-count')
  @RequirePermissions(ContactsPermissions.notificationsRead)
  unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCountDto> {
    return this.notifications.unreadCount(user.sub)
  }

  @Patch(':id/read')
  @RequirePermissions(ContactsPermissions.notificationsRead)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<NotificationDto> {
    return this.notifications.markRead(user.sub, id)
  }

  @Post('read-all')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.notificationsRead)
  async markAllRead(@CurrentUser() user: AuthUser, @Body() _body: unknown): Promise<void> {
    await this.notifications.markAllRead(user.sub)
  }
}
