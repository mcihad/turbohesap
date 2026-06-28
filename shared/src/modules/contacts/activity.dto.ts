// Activity (CRM Etkileşim) — the interaction log on a contact / opportunity, in
// the Salesforce Task+Event spirit. `contactPersonId` = the person it concerns
// ("who"), `opportunityId` = the deal it relates to ("what").

export type ActivityType = 'note' | 'call' | 'meeting' | 'email' | 'task'
export const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'meeting', 'email', 'task']

export type ActivityStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export const ACTIVITY_STATUSES: ActivityStatus[] = ['open', 'in_progress', 'completed', 'cancelled']

export type ActivityPriority = 'low' | 'normal' | 'high'
export const ACTIVITY_PRIORITIES: ActivityPriority[] = ['low', 'normal', 'high']

export interface ActivityDto {
  id: string
  contactId: string | null
  contactPersonId: string | null
  opportunityId: string | null
  activityType: ActivityType
  subject: string
  description: string | null
  status: ActivityStatus
  priority: ActivityPriority
  /** Görev son tarihi (for tasks). */
  dueDate: string | null
  /** Meeting window. */
  startAt: string | null
  endAt: string | null
  /** Sorumlu kullanıcı (userId). */
  ownerId: string | null
  /** User ids @mentioned in the description (parsed server-side). */
  mentions: string[]
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateActivityRequest {
  activityType: ActivityType
  subject: string
  contactId?: string | null
  contactPersonId?: string | null
  opportunityId?: string | null
  description?: string | null
  status?: ActivityStatus
  priority?: ActivityPriority
  dueDate?: string | null
  startAt?: string | null
  endAt?: string | null
  ownerId?: string | null
}
export type UpdateActivityRequest = Partial<CreateActivityRequest>

export interface ActivityListQuery {
  contactId?: string
  opportunityId?: string
  status?: ActivityStatus
  activityType?: ActivityType
}
