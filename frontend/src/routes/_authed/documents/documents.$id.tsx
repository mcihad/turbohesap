import { createFileRoute } from '@tanstack/react-router'

import { DocumentDetailPage } from '@/modules/documents/pages/document-detail-page'

export const Route = createFileRoute('/_authed/documents/documents/$id')({
  component: DocumentDetailPage,
})
