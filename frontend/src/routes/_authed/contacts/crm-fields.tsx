import { createFileRoute } from '@tanstack/react-router'

import { CrmFieldsSettingsPage } from '@/modules/contacts/pages/crm-fields-settings-page'

export const Route = createFileRoute('/_authed/contacts/crm-fields')({
  component: CrmFieldsSettingsPage,
})
