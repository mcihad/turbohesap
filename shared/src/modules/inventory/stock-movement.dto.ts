// Stock movements (Stok Hareketleri) — a per-branch movement ledger with
// user-definable movement types. Each movement is a GİRİŞ (in) or ÇIKIŞ (out)
// of a quantity for a (product, variant?, branch) and adjusts on-hand stock.

export type MovementDirection = 'in' | 'out' // Giriş / Çıkış

// ── Movement type (unlimited, user-defined) ───────────────────────────────────
export interface StockMovementTypeDto {
  id: string
  name: string
  direction: MovementDirection
  isActive: boolean
  /** System-seeded type used by automatic postings (invoice etc.) — not deletable. */
  isSystem: boolean
  createdAt: string
  updatedAt: string
}
export interface CreateStockMovementTypeRequest {
  name: string
  direction: MovementDirection
  isActive?: boolean
}
export type UpdateStockMovementTypeRequest = Partial<CreateStockMovementTypeRequest>

// ── Movement (ledger entry) ───────────────────────────────────────────────────
export interface StockMovementDto {
  id: string
  productId: string
  variantId: string | null
  variantLabel: string | null
  branchId: string | null
  branchName: string | null
  movementTypeId: string
  movementTypeName: string
  direction: MovementDirection
  quantity: number
  unit: string
  date: string
  description: string | null
  /** Origin when posted automatically (e.g. 'invoices'). */
  sourceModule: string | null
  sourceId: string | null
  createdAt: string
}
export interface CreateStockMovementRequest {
  productId: string
  movementTypeId: string
  quantity: number
  branchId?: string | null
  variantId?: string | null
  date?: string
  description?: string | null
}
export interface StockMovementListQuery {
  productId?: string
  branchId?: string
  from?: string
  to?: string
}
