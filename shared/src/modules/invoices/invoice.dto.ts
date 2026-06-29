// Fatura (invoice) — Turkey-compliant sales/purchase invoices with KDV (VAT) and
// KDV tevkifatı (withholding). Money fields are plain `number` in the DTO (the
// backend stores them as `numeric`, see agy.md §7.1). Totals & the KDV özeti are
// COMPUTED — the single source of truth is `invoice.helpers.ts` (used by the
// backend authoritatively and by the clients for live entry-form totals).

export type InvoiceType = 'sales' | 'purchase' | 'return' // Satış / Alış / İade
export const INVOICE_TYPES: InvoiceType[] = ['sales', 'purchase', 'return']

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled'
export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'issued', 'paid', 'cancelled']

/** Resolved electronic-document kind (GİB). */
export type InvoiceEDocType = 'efatura' | 'earsiv' | 'none'

/** Tax nature (GİB Fatura Tipi). */
export type FaturaTipi =
  | 'SATIS'
  | 'IADE'
  | 'TEVKIFAT'
  | 'ISTISNA'
  | 'OZELMATRAH'
  | 'IHRACKAYITLI'
export const FATURA_TIPLERI: FaturaTipi[] = [
  'SATIS', 'IADE', 'TEVKIFAT', 'ISTISNA', 'OZELMATRAH', 'IHRACKAYITLI',
]

/** Workflow scenario (GİB Senaryo). */
export type Senaryo = 'TEMELFATURA' | 'TICARIFATURA' | 'EARSIVFATURA' | 'IHRACAT'
export const SENARYOLAR: Senaryo[] = ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'IHRACAT']

/** Current Turkish KDV rates (2025–2026): standard 20, reduced 10/1, exempt 0. */
export const VAT_RATES: number[] = [0, 1, 10, 20]

/** KDV tevkifat ratios (withheld fraction of the calculated VAT). */
export interface WithholdingRatio {
  code: string // '9/10'
  label: string // '9/10 (%90)'
  value: number // 0.9
}
export const WITHHOLDING_RATIOS: WithholdingRatio[] = [
  { code: '2/10', label: '2/10 (%20)', value: 0.2 },
  { code: '3/10', label: '3/10 (%30)', value: 0.3 },
  { code: '4/10', label: '4/10 (%40)', value: 0.4 },
  { code: '5/10', label: '5/10 (%50)', value: 0.5 },
  { code: '7/10', label: '7/10 (%70)', value: 0.7 },
  { code: '9/10', label: '9/10 (%90)', value: 0.9 },
  { code: '10/10', label: '10/10 (%100)', value: 1 },
]

// ── Lines ─────────────────────────────────────────────────────────────────────
export interface InvoiceLineDto {
  id: string
  invoiceId: string
  productId: string | null
  description: string
  quantity: number
  /** UBL unit code-ish ('Adet','Kg','Lt','Saat'…). */
  unit: string
  unitPrice: number
  /** Discount percent (0–100). */
  discountRate: number
  /** KDV oranı (%). */
  vatRate: number
  /** Tevkifat ratio code, e.g. '9/10', or null. */
  withholdingCode: string | null
  /** COMPUTED. */
  lineNet: number // matrah (gross − discount)
  lineVat: number // KDV
  lineWithholding: number // tevkifat edilen KDV
  lineTotal: number // net + KDV
  sortOrder: number
}

export interface InvoiceVatSummaryRow {
  rate: number
  base: number // matrah at this rate
  vat: number // KDV at this rate
}

// ── Invoice ───────────────────────────────────────────────────────────────────
export interface InvoiceDto {
  id: string
  type: InvoiceType
  series: string
  /** Gapless sequential, assigned on issue (empty while draft). */
  number: string
  ettn: string | null
  date: string
  dueDate: string | null
  contactId: string
  contact: { id: string; name: string } | null
  branchId: string | null
  currencyCode: string
  exchangeRate: number
  status: InvoiceStatus
  eDocType: InvoiceEDocType
  faturaTipi: FaturaTipi
  senaryo: Senaryo
  notes: string | null
  // computed totals
  subtotal: number // mal/hizmet toplamı (gross)
  discountTotal: number
  vatBase: number // KDV matrahı
  vatTotal: number // KDV toplamı
  withholdingTotal: number // tevkifat
  grandTotal: number // ödenecek (vatBase + vatTotal − withholding)
  vatSummary: InvoiceVatSummaryRow[]
  lines: InvoiceLineDto[]
  /** COMPUTED: Σ payments (tahsilat/ödeme). */
  paidTotal: number
  /** COMPUTED: grandTotal − paidTotal. */
  remainingTotal: number
  createdAt: string
  updatedAt: string
}

export interface InvoiceSummary {
  id: string
  type: InvoiceType
  series: string
  number: string
  date: string
  status: InvoiceStatus
  grandTotal: number
  currencyCode: string
}

// ── Requests ──────────────────────────────────────────────────────────────────
export interface CreateInvoiceLineInput {
  productId?: string | null
  description: string
  quantity: number
  unit?: string
  unitPrice: number
  discountRate?: number
  vatRate: number
  withholdingCode?: string | null
  sortOrder?: number
}

export interface CreateInvoiceRequest {
  type: InvoiceType
  date: string
  contactId: string
  lines: CreateInvoiceLineInput[]
  dueDate?: string | null
  branchId?: string | null
  currencyCode?: string
  exchangeRate?: number
  series?: string
  faturaTipi?: FaturaTipi
  senaryo?: Senaryo
  eDocType?: InvoiceEDocType
  notes?: string | null
  /** Create directly as 'draft' (default) or 'issued'. */
  status?: Extract<InvoiceStatus, 'draft' | 'issued'>
  /** When false, issuing this invoice does NOT post stock movements — used when
   *  the stock was already moved by a prior İrsaliye (delivery note) so the
   *  order→delivery→invoice chain never double-counts. Defaults to true. */
  postStock?: boolean
}

export type UpdateInvoiceRequest = Partial<CreateInvoiceRequest>

export interface InvoiceListQuery {
  type?: InvoiceType
  status?: InvoiceStatus
  contactId?: string
  from?: string
  to?: string
  search?: string
}
