import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator'

import {
  INTEGRATION_TYPES,
  MESSAGE_CHANNELS,
  type AiDraftEmailRequest,
  type AiScoreRequest,
  type AiSummarizeRequest,
  type IntegrationType,
  type MessageChannel,
  type SendMessageRequest,
  type UpsertIntegrationRequest,
} from '@turbohesap/shared'

export class UpsertIntegrationDto implements UpsertIntegrationRequest {
  @IsIn(INTEGRATION_TYPES) type!: IntegrationType
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsObject() config!: Record<string, string>
}

export class SendMessageDto implements SendMessageRequest {
  @IsIn(MESSAGE_CHANNELS) channel!: MessageChannel
  @IsString() to!: string
  @IsOptional() @IsString() subject?: string
  @IsString() body!: string
  @IsOptional() @IsString() contactId?: string | null
  @IsOptional() @IsString() opportunityId?: string | null
}

export class AiDraftEmailDto implements AiDraftEmailRequest {
  @IsString() prompt!: string
  @IsOptional() @IsString() contactId?: string | null
  @IsOptional() @IsIn(['formal', 'friendly', 'concise']) tone?: 'formal' | 'friendly' | 'concise'
}

export class AiSummarizeDto implements AiSummarizeRequest {
  @IsOptional() @IsString() opportunityId?: string | null
  @IsOptional() @IsString() text?: string
}

export class AiScoreDto implements AiScoreRequest {
  @IsString() opportunityId!: string
}

export function isIntegrationType(v: string): v is IntegrationType {
  return (INTEGRATION_TYPES as string[]).includes(v)
}
