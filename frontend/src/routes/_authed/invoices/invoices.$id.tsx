import { createFileRoute } from '@tanstack/react-router'

import { InvoiceDetailPage } from '@/modules/invoices/pages/invoice-detail-page'

export const Route = createFileRoute('/_authed/invoices/invoices/$id')({
  component: InvoiceDetailPage,
})
