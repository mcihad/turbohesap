import { createFileRoute } from '@tanstack/react-router'

import { IntegrationsSettingsPage } from '@/modules/contacts/pages/integrations-settings-page'

export const Route = createFileRoute('/_authed/contacts/integrations')({
  component: IntegrationsSettingsPage,
})
