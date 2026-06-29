// In-app feedback (istek/talep/öneri/hata) — users submit a note + optional
// annotated screenshot from anywhere in the app; permitted users triage them
// through a status workflow. The screenshot is stored via the files module and
// referenced by `screenshotFileId`.

export type FeedbackType = 'request' | 'suggestion' | 'bug' | 'question'
export const FEEDBACK_TYPES: FeedbackType[] = ['request', 'suggestion', 'bug', 'question']
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  request: 'İstek / Talep',
  suggestion: 'Öneri',
  bug: 'Hata bildirimi',
  question: 'Soru',
}

export type FeedbackStatus = 'new' | 'in_progress' | 'done' | 'rejected'
export const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'in_progress', 'done', 'rejected']
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Yeni',
  in_progress: 'İnceleniyor',
  done: 'Tamamlandı',
  rejected: 'Reddedildi',
}

export type FeedbackPriority = 'low' | 'normal' | 'high'
export const FEEDBACK_PRIORITIES: FeedbackPriority[] = ['low', 'normal', 'high']
export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
}

export interface FeedbackDto {
  id: string
  type: FeedbackType
  title: string
  message: string
  status: FeedbackStatus
  priority: FeedbackPriority
  /** The app URL/route the feedback was sent from. */
  pageUrl: string | null
  /** Annotated screenshot file (files module), if attached. */
  screenshotFileId: string | null
  /** COMPUTED: public URL to the screenshot bytes (null when none). */
  screenshotUrl: string | null
  createdById: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface CreateFeedbackRequest {
  type: FeedbackType
  title?: string
  message: string
  pageUrl?: string | null
  /** Id of a previously uploaded screenshot file (api.files.upload). */
  screenshotFileId?: string | null
}

export interface UpdateFeedbackRequest {
  status?: FeedbackStatus
  priority?: FeedbackPriority
  type?: FeedbackType
  title?: string
  message?: string
}

export interface FeedbackListQuery {
  type?: FeedbackType
  status?: FeedbackStatus
  createdById?: string
  from?: string
  to?: string
}
