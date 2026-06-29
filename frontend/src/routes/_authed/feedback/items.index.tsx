import { createFileRoute } from '@tanstack/react-router'

import { FeedbackListPage } from '@/modules/feedback/pages/feedback-list-page'

export const Route = createFileRoute('/_authed/feedback/items/')({
  component: FeedbackListPage,
})
