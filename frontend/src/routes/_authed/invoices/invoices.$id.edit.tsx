import { createFileRoute } from '@tanstack/react-router'

import { InvoiceEntryPage } from '@/modules/invoices/pages/invoice-entry-page'

export const Route = createFileRoute('/_authed/invoices/invoices/$id/edit')({
  component: InvoiceEntryPage,
})
