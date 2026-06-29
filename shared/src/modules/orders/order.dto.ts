// Sipariş yönetimi — a single unified "order document" that covers the whole
// order-to-cash / procure-to-pay chain: Teklif (quote) → Sipariş (order) →
// İrsaliye (delivery) → Fatura (invoice). One entity discriminated by `kind`
// (+ `direction` sales/purchase), mirroring how invoices use `type`. Line +
// totals math is shared with invoices (`computeInvoiceTotals`). Cari/finance is
// posted ONLY by the invoice; the İrsaliye (delivery) is what moves stock.

import type { InvoiceVatSummaryRow } from '../invoices/invoice.dto'

export type OrderKind = 'quote' | 'order' | 'delivery'
export const ORDER_KINDS: OrderKind[] = ['quote', 'order', 'delivery']
export const ORDER_KIND_LABELS: Record<OrderKind, string> = {
  quote: 'Teklif',
  order: 'Sipariş',
  delivery: 'İrsaliye',
}

export type OrderDirection = 'sales' | 'purchase'
export const ORDER_DIRECTIONS: OrderDirection[] = ['sales', 'purchase']
export const ORDER_DIRECTION_LABELS: Record<OrderDirection, string> = {
  sales: 'Satış',
  purchase: 'Alış',
}

// Unified lifecycle. `confirm` moves draft → confirmed (quote/order) or shipped
// (delivery, which also posts stock); converting to an invoice marks the source
// `invoiced`. The conversion links (`sourceDocId`/`targetDocId`/`invoiceId`)
// convey chain progress alongside the status.
export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'invoiced' | 'cancelled'
export const ORDER_STATUSES: OrderStatus[] = ['draft', 'confirmed', 'shipped', 'invoiced', 'cancelled']
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Taslak',
  confirmed: 'Onaylandı',
  shipped: 'Sevk edildi',
  invoiced: 'Faturalandı',
  cancelled: 'İptal',
}

export interface OrderDocumentLineDto {
  id: string
  documentId: string
  productId: string | null
  variantId: string | null
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountRate: number
  vatRate: number
  withholdingCode: string | null
  /** COMPUTED line breakdown (shared invoice math). */
  lineNet: number
  lineVat: number
  lineWithholding: number
  lineTotal: number
  sortOrder: number
}

export interface OrderDocumentDto {
  id: string
  kind: OrderKind
  direction: OrderDirection
  status: OrderStatus
  /** Series + gapless number, assigned on confirm (empty while draft). */
  series: string
  number: string
  contactId: string
  contact: { id: string; name: string } | null
  branchId: string | null
  date: string
  /** Quote validity / order delivery-due / delivery date. */
  validUntil: string | null
  dueDate: string | null
  currencyCode: string
  exchangeRate: number
  notes: string | null
  // totals — same shape as invoices
  subtotal: number
  discountTotal: number
  vatBase: number
  vatTotal: number
  withholdingTotal: number
  grandTotal: number
  vatSummary: InvoiceVatSummaryRow[]
  // chain links
  /** The document this was converted FROM (null for first in chain). */
  sourceDocId: string | null
  /** The document this was converted TO (next in chain), if any. */
  targetDocId: string | null
  /** The Invoice produced from this document (Fatura), if any. */
  invoiceId: string | null
  lines: OrderDocumentLineDto[]
  createdAt: string
  updatedAt: string
}

/** Lightweight list row. */
export interface OrderDocumentSummary {
  id: string
  kind: OrderKind
  direction: OrderDirection
  status: OrderStatus
  series: string
  number: string
  contactId: string
  contactName: string
  date: string
  grandTotal: number
  currencyCode: string
  invoiceId: string | null
  createdAt: string
}

// ── requests ──
// Server resolves name/unitPrice/taxRate from `productId` (+ sales channel) when
// omitted; client values are overrides only.
export interface CreateOrderDocumentLineInput {
  productId?: string | null
  variantId?: string | null
  description?: string
  quantity: number
  unit?: string
  unitPrice?: number
  discountRate?: number
  vatRate?: number
  withholdingCode?: string | null
  sortOrder?: number
}

export interface CreateOrderDocumentRequest {
  kind: OrderKind
  direction: OrderDirection
  date: string
  contactId: string
  lines: CreateOrderDocumentLineInput[]
  branchId?: string | null
  validUntil?: string | null
  dueDate?: string | null
  currencyCode?: string
  exchangeRate?: number
  series?: string
  notes?: string | null
  /** When true, confirm immediately after create (assign number / ship). */
  confirm?: boolean
}

export type UpdateOrderDocumentRequest = Partial<Omit<CreateOrderDocumentRequest, 'kind' | 'direction' | 'confirm'>>

/** Convert a document to the next step. `toKind` defaults to the natural next
 *  (quote→order→delivery); pass `toKind:'invoice'` to produce a Fatura. */
export interface ConvertOrderRequest {
  toKind?: OrderKind | 'invoice'
}

export interface OrderListQuery {
  kind?: OrderKind
  direction?: OrderDirection
  status?: OrderStatus
  contactId?: string
  from?: string
  to?: string
  search?: string
}
