import { createFileRoute } from '@tanstack/react-router'

import { DocumentsPage } from '@/modules/documents/pages/documents-page'

export const Route = createFileRoute('/_authed/documents/documents/')({
  component: DocumentsPage,
})
