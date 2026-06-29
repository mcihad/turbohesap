import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { feedbackModule } from '@/modules/feedback/module.config'
import { FeedbackDashboard } from '@/modules/feedback/components/feedback-dashboard'

export const Route = createFileRoute('/_authed/feedback/')({
  component: () => (
    <ModuleDashboard module={feedbackModule}>
      <FeedbackDashboard />
    </ModuleDashboard>
  ),
})
