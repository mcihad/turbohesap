// Feedback permission keys. `create` gates the floating button + submit; `read`
// gates the management list/detail; `manage` gates status/priority changes + delete.
export const FeedbackPermissions = {
  create: 'feedback.create',
  read: 'feedback.read',
  manage: 'feedback.manage',
} as const

export type FeedbackPermission = (typeof FeedbackPermissions)[keyof typeof FeedbackPermissions]
