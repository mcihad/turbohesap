// Display helpers for the feedback admin screens — labels (from shared) + badge
// tones for status/priority/type.

import {
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  type FeedbackPriority,
  type FeedbackStatus,
  type FeedbackType,
} from '@turbohesap/shared'

import type { BadgeTone } from '../../components'

export function feedbackTypeLabel(v: FeedbackType): string {
  return FEEDBACK_TYPE_LABELS[v] ?? v
}
export function feedbackStatusLabel(v: FeedbackStatus): string {
  return FEEDBACK_STATUS_LABELS[v] ?? v
}
export function feedbackPriorityLabel(v: FeedbackPriority): string {
  return FEEDBACK_PRIORITY_LABELS[v] ?? v
}

export function feedbackStatusTone(v: FeedbackStatus): BadgeTone {
  switch (v) {
    case 'new':
      return 'info'
    case 'in_progress':
      return 'warning'
    case 'done':
      return 'success'
    case 'rejected':
      return 'muted'
  }
}

export function feedbackPriorityTone(v: FeedbackPriority): BadgeTone {
  switch (v) {
    case 'high':
      return 'destructive'
    case 'normal':
      return 'default'
    case 'low':
      return 'muted'
  }
}

export function feedbackTypeIcon(v: FeedbackType): 'inbox' | 'star' | 'alert-triangle' | 'help-circle' {
  switch (v) {
    case 'request':
      return 'inbox'
    case 'suggestion':
      return 'star'
    case 'bug':
      return 'alert-triangle'
    case 'question':
      return 'help-circle'
  }
}
