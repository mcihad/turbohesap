import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'

import {
  FEEDBACK_TYPES,
  type CreateFeedbackRequest,
  type FeedbackType,
} from '@turbohesap/shared'

export class CreateFeedbackDto implements CreateFeedbackRequest {
  @IsIn(FEEDBACK_TYPES) type!: FeedbackType
  @IsOptional() @IsString() title?: string
  @IsString() @IsNotEmpty() message!: string
  @IsOptional() @IsString() pageUrl?: string | null
  @IsOptional() @IsString() screenshotFileId?: string | null
}
