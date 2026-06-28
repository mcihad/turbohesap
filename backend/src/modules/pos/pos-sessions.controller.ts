import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import {
  PosPermissions,
  type PosSessionDto,
  type PosSessionStatus,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { PosSessionsService } from './pos-sessions.service'
import { CloseSessionDto, OpenSessionDto } from './dto/pos.dto'

@Controller('pos/sessions')
export class PosSessionsController {
  constructor(private readonly sessions: PosSessionsService) {}

  @Get()
  @RequirePermissions(PosPermissions.sell)
  list(
    @Query('registerId') registerId?: string,
    @Query('status') status?: PosSessionStatus,
  ): Promise<PosSessionDto[]> {
    return this.sessions.list({ registerId, status })
  }

  @Get('current')
  @RequirePermissions(PosPermissions.sell)
  current(@Query('registerId') registerId: string): Promise<PosSessionDto | null> {
    return this.sessions.current(registerId)
  }

  @Get(':id')
  @RequirePermissions(PosPermissions.sell)
  get(@Param('id') id: string): Promise<PosSessionDto> {
    return this.sessions.get(id)
  }

  @Post()
  @RequirePermissions(PosPermissions.sessionOpen)
  open(@Body() dto: OpenSessionDto, @CurrentUser() user: AuthUser): Promise<PosSessionDto> {
    return this.sessions.open(dto, user.sub)
  }

  @Post(':id/close')
  @RequirePermissions(PosPermissions.sessionClose)
  close(@Param('id') id: string, @Body() dto: CloseSessionDto): Promise<PosSessionDto> {
    return this.sessions.close(id, dto)
  }
}
