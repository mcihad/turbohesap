import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common'

import {
  ContactsPermissions,
  type AiScoreResult,
  type AiTextResult,
  type IntegrationConnectionDto,
  type SendMessageResult,
  type TestIntegrationResult,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { IntegrationsService } from './integrations.service'
import {
  AiDraftEmailDto,
  AiScoreDto,
  AiSummarizeDto,
  SendMessageDto,
  UpsertIntegrationDto,
  isIntegrationType,
} from './dto/integrations.dto'

@Controller('contacts/integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.integrationsRead)
  list(): Promise<IntegrationConnectionDto[]> {
    return this.integrations.list()
  }

  // AI + send are static sub-paths; declare before the ':type' routes.
  @Post('send')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  send(@Body() dto: SendMessageDto, @CurrentUser() user: AuthUser): Promise<SendMessageResult> {
    return this.integrations.send(dto, user.sub)
  }

  @Post('ai/draft-email')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  aiDraft(@Body() dto: AiDraftEmailDto, @CurrentUser() user: AuthUser): Promise<AiTextResult> {
    return this.integrations.aiDraftEmail(dto, user.sub)
  }

  @Post('ai/summarize')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  aiSummarize(@Body() dto: AiSummarizeDto): Promise<AiTextResult> {
    return this.integrations.aiSummarize(dto)
  }

  @Post('ai/score')
  @RequirePermissions(ContactsPermissions.opportunitiesRead)
  aiScore(@Body() dto: AiScoreDto): Promise<AiScoreResult> {
    return this.integrations.aiScore(dto)
  }

  @Get(':type')
  @RequirePermissions(ContactsPermissions.integrationsRead)
  get(@Param('type') type: string): Promise<IntegrationConnectionDto | null> {
    if (!isIntegrationType(type)) throw new BadRequestException('Geçersiz tip')
    return this.integrations.get(type)
  }

  @Put(':type')
  @RequirePermissions(ContactsPermissions.integrationsWrite)
  upsert(@Param('type') type: string, @Body() dto: UpsertIntegrationDto): Promise<IntegrationConnectionDto> {
    if (!isIntegrationType(type)) throw new BadRequestException('Geçersiz tip')
    return this.integrations.upsert({ ...dto, type })
  }

  @Delete(':type')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.integrationsWrite)
  async remove(@Param('type') type: string): Promise<void> {
    if (!isIntegrationType(type)) throw new BadRequestException('Geçersiz tip')
    await this.integrations.remove(type)
  }

  @Post(':type/test')
  @RequirePermissions(ContactsPermissions.integrationsWrite)
  test(@Param('type') type: string): Promise<TestIntegrationResult> {
    if (!isIntegrationType(type)) throw new BadRequestException('Geçersiz tip')
    return this.integrations.test(type)
  }
}
