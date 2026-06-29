// Feedback module — the triage surface for submitted feedback. Gated by
// feedback.read; its Panel tab IS the list (no extra resource tabs).

import { FeedbackPermissions } from '@turbohesap/shared'

import type { MobileModule } from '../types'

export const feedbackModule: MobileModule = {
  key: 'feedback',
  label: 'Geri Bildirim',
  icon: 'message-circle',
  home: 'feedback.list',
  permission: FeedbackPermissions.read,
  dashboardScreen: 'feedback.list',
  items: [],
}
