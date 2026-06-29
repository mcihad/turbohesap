import { IsIn, IsOptional, IsString } from 'class-validator'

import {
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type FeedbackPriority,
  type FeedbackStatus,
  type FeedbackType,
  type UpdateFeedbackRequest,
} from '@turbohesap/shared'

export class UpdateFeedbackDto implements UpdateFeedbackRequest {
  @IsOptional() @IsIn(FEEDBACK_STATUSES) status?: FeedbackStatus
  @IsOptional() @IsIn(FEEDBACK_PRIORITIES) priority?: FeedbackPriority
  @IsOptional() @IsIn(FEEDBACK_TYPES) type?: FeedbackType
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() message?: string
}
