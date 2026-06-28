// In-app notifications — per-user alerts for CRM events (deal/contact assignment,
// activity due/overdue, @mention). Delivered by polling; marked read individually
// or in bulk.

export type NotificationType =
  | 'assignment' // a deal/contact/activity was assigned to you
  | 'activity_due' // an activity you own is due / overdue
  | 'mention' // you were @mentioned in a note
  | 'stage_change' // a deal you own changed stage

export const NOTIFICATION_TYPES: NotificationType[] = [
  'assignment',
  'activity_due',
  'mention',
  'stage_change',
]

export interface NotificationDto {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  /** Linked entity for deep-linking (e.g. 'Opportunity', '<id>'). */
  entityType: string | null
  entityId: string | null
  readAt: string | null
  createdAt: string
}

export interface NotificationListQuery {
  unread?: boolean
  limit?: number
}

export interface UnreadCountDto {
  count: number
}
