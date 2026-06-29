import { createFileRoute } from '@tanstack/react-router'

import type { OrderDirection, OrderKind } from '@turbohesap/shared'

import { OrderEntryPage } from '@/modules/orders/pages/order-entry-page'

// Presets when opening a new document from a list (kind/direction) or a cari.
export const Route = createFileRoute('/_authed/orders/new')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { kind?: OrderKind; direction?: OrderDirection; contactId?: string } => ({
    kind:
      search.kind === 'quote' || search.kind === 'order' || search.kind === 'delivery'
        ? (search.kind as OrderKind)
        : undefined,
    direction:
      search.direction === 'sales' || search.direction === 'purchase'
        ? (search.direction as OrderDirection)
        : undefined,
    contactId: typeof search.contactId === 'string' ? search.contactId : undefined,
  }),
  component: OrderEntryPage,
})
