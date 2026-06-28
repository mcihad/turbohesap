import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'

import {
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  type ActivityPriority,
  type ActivityStatus,
  type ActivityType,
  type CreateActivityRequest,
  type UpdateActivityRequest,
} from '@turbohesap/shared'

export class CreateActivityDto implements CreateActivityRequest {
  @IsIn(ACTIVITY_TYPES) activityType!: ActivityType
  @IsString() @IsNotEmpty() subject!: string

  @IsOptional() @IsString() contactId?: string | null
  @IsOptional() @IsString() contactPersonId?: string | null
  @IsOptional() @IsString() opportunityId?: string | null
  @IsOptional() @IsString() description?: string | null
  @IsOptional() @IsIn(ACTIVITY_STATUSES) status?: ActivityStatus
  @IsOptional() @IsIn(ACTIVITY_PRIORITIES) priority?: ActivityPriority
  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() startAt?: string | null
  @IsOptional() @IsString() endAt?: string | null
  @IsOptional() @IsString() ownerId?: string | null
}

export class UpdateActivityDto implements UpdateActivityRequest {
  @IsOptional() @IsIn(ACTIVITY_TYPES) activityType?: ActivityType
  @IsOptional() @IsString() @IsNotEmpty() subject?: string
  @IsOptional() @IsString() contactId?: string | null
  @IsOptional() @IsString() contactPersonId?: string | null
  @IsOptional() @IsString() opportunityId?: string | null
  @IsOptional() @IsString() description?: string | null
  @IsOptional() @IsIn(ACTIVITY_STATUSES) status?: ActivityStatus
  @IsOptional() @IsIn(ACTIVITY_PRIORITIES) priority?: ActivityPriority
  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() startAt?: string | null
  @IsOptional() @IsString() endAt?: string | null
  @IsOptional() @IsString() ownerId?: string | null
}
