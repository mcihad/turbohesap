import { createFileRoute } from '@tanstack/react-router'

import { FeedbackDetailPage } from '@/modules/feedback/pages/feedback-detail-page'

export const Route = createFileRoute('/_authed/feedback/$id')({
  component: FeedbackDetailPage,
})
