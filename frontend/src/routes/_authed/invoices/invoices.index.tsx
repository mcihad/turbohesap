import { createFileRoute } from '@tanstack/react-router'

import { InvoicesPage } from '@/modules/invoices/pages/invoices-page'

export const Route = createFileRoute('/_authed/invoices/invoices/')({
  component: InvoicesPage,
})
