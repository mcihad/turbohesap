import { createFileRoute } from '@tanstack/react-router'

import { PipelineSettingsPage } from '@/modules/contacts/pages/pipeline-settings-page'

export const Route = createFileRoute('/_authed/contacts/pipelines/settings')({
  component: PipelineSettingsPage,
})
