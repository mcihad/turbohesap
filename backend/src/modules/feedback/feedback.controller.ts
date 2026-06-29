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
  FeedbackPermissions,
  type FeedbackDto,
  type FeedbackStatus,
  type FeedbackType,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { FeedbackService } from './feedback.service'
import { CreateFeedbackDto } from './dto/create-feedback.dto'
import { UpdateFeedbackDto } from './dto/update-feedback.dto'

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  @RequirePermissions(FeedbackPermissions.read)
  list(
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus,
    @Query('createdById') createdById?: string,
  ): Promise<FeedbackDto[]> {
    return this.feedback.list({ type, status, createdById })
  }

  @Get(':id')
  @RequirePermissions(FeedbackPermissions.read)
  get(@Param('id') id: string): Promise<FeedbackDto> {
    return this.feedback.get(id)
  }

  @Post()
  @RequirePermissions(FeedbackPermissions.create)
  create(@Body() dto: CreateFeedbackDto, @CurrentUser() user: AuthUser): Promise<FeedbackDto> {
    return this.feedback.create(dto, user.sub)
  }

  @Patch(':id')
  @RequirePermissions(FeedbackPermissions.manage)
  update(@Param('id') id: string, @Body() dto: UpdateFeedbackDto): Promise<FeedbackDto> {
    return this.feedback.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(FeedbackPermissions.manage)
  async remove(@Param('id') id: string): Promise<void> {
    await this.feedback.remove(id)
  }
}
