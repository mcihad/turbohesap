// Fason (subcontracting) — bir Üretim Emrinin (type='subcontract') hammaddesini
// dışarıdaki bir fasoncuya (Contact, role supplier/both) gönderme ve mamulü geri
// alma sürecini izleyen sevk belgesi. Gönderilen malzeme bizim değerlememizde
// (valuation) kalır — fasoncudaki stok = gönderilen − iade. Fasoncu işçilik ücreti
// (serviceCost) Üretim Emrinin maliyet rollup'ına operasyon maliyeti olarak girer.

export type SubcontractDispatchStatus = 'draft' | 'sent' | 'received' | 'cancelled'

export const SUBCONTRACT_DISPATCH_STATUS_LABELS: Record<SubcontractDispatchStatus, string> = {
  draft: 'Taslak',
  sent: 'Sevk Edildi',
  received: 'Teslim Alındı',
  cancelled: 'İptal',
}

export interface SubcontractDispatchLineDto {
  id: string
  componentProductId: string
  componentVariantId: string | null
  componentName: string
  componentCode: string
  sentQuantity: number
  returnedQuantity: number
  /** sentQuantity - returnedQuantity (still at the subcontractor). */
  atSubcontractor: number
  unit: string
  sortOrder: number
}

export interface SubcontractDispatchDto {
  id: string
  dispatchNo: string
  manufacturingOrderId: string
  manufacturingOrderNo: string
  contactId: string
  contactName: string
  dispatchDate: string
  expectedReturnDate: string | null
  status: SubcontractDispatchStatus
  serviceCost: number
  currency: string
  notes: string | null
  lines: SubcontractDispatchLineDto[]
  createdAt: string
  updatedAt: string
}

export interface SubcontractDispatchSummary {
  id: string
  dispatchNo: string
  manufacturingOrderNo: string
  contactName: string
  status: SubcontractDispatchStatus
  dispatchDate: string
}

// Per-product stock currently held at a subcontractor (sum of open dispatches).
export interface SubcontractStockRow {
  contactId: string
  contactName: string
  componentProductId: string
  componentName: string
  componentCode: string
  sentQuantity: number
  returnedQuantity: number
  atSubcontractor: number
  unit: string
}

// ── Create / actions ─────────────────────────────────────────────────────────

export interface SubcontractDispatchLineInput {
  componentProductId: string
  componentVariantId?: string | null
  sentQuantity: number
  unit?: string
  sortOrder?: number
}

export interface CreateSubcontractDispatchRequest {
  manufacturingOrderId: string
  contactId: string
  dispatchDate?: string
  expectedReturnDate?: string | null
  serviceCost?: number
  currency?: string
  notes?: string | null
  /** Lines to send; when omitted, defaults to the MO's snapshot components. */
  lines?: SubcontractDispatchLineInput[]
}

export interface ReceiveSubcontractDispatchRequest {
  serviceCost?: number
  /** Per-line returned (unused) quantities. */
  returns?: Array<{ lineId: string; returnedQuantity: number }>
  notes?: string | null
}

export interface SubcontractDispatchListQuery {
  manufacturingOrderId?: string
  contactId?: string
  status?: SubcontractDispatchStatus
}

export interface SubcontractStockQuery {
  contactId?: string
}
