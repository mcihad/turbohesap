import { createFileRoute } from '@tanstack/react-router'

import type { InvoiceType } from '@turbohesap/shared'

import { InvoiceEntryPage } from '@/modules/invoices/pages/invoice-entry-page'

// Optional presets when opening a new invoice from elsewhere (e.g. a cari's
// "Satış/Alış Faturası Ekle").
export const Route = createFileRoute('/_authed/invoices/invoices/new')({
  validateSearch: (search: Record<string, unknown>): { type?: InvoiceType; contactId?: string } => ({
    type: search.type === 'sales' || search.type === 'purchase' || search.type === 'return'
      ? (search.type as InvoiceType)
      : undefined,
    contactId: typeof search.contactId === 'string' ? search.contactId : undefined,
  }),
  component: InvoiceEntryPage,
})
