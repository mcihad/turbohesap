// Stok operasyon kontratları: rezervasyon, maliyet (AVCO) ve uygunluk (ATP).
// Hem mevcut sipariş/üretim modülleri hem de ileride e-ticaret modülü aynı
// kontratları tüketir.

export type ReservationStatus = 'active' | 'released' | 'consumed'

export interface StockReservationDto {
  id: string
  productId: string
  variantId: string | null
  branchId: string | null
  quantity: number
  status: ReservationStatus
  sourceModule: string
  sourceId: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ReserveStockRequest {
  productId: string
  variantId?: string | null
  branchId?: string | null
  quantity: number
  sourceModule: string
  sourceId: string
  expiresAt?: string | null
}

export interface ReservationListQuery {
  sourceModule?: string
  sourceId?: string
  productId?: string
  status?: ReservationStatus
}

// ── Cost (moving-average) ─────────────────────────────────────────────────────

export interface ProductCostDto {
  productId: string
  variantId: string | null
  branchId: string | null
  method: string
  unitCost: number
  currency: string
  asOf: string
}

// ── Availability / ATP ────────────────────────────────────────────────────────

export interface AvailabilityDto {
  productId: string
  variantId: string | null
  branchId: string | null
  onHand: number
  reserved: number
  /** onHand - reserved. */
  available: number
  /** Scheduled receipts within the horizon (open purchase + open manufacturing). */
  incoming: number
  /** available + incoming (within horizon). */
  atp: number
}

export interface AvailabilityQuery {
  productId: string
  variantId?: string | null
  branchId?: string | null
  horizonDays?: number
}
