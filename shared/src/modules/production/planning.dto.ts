// Planlama (MRP) — talep (açık satış siparişleri + min/max reorder + bağımlı talep)
// vs arz (stok − rezerve + açık üretim/satınalma) netleştirip öneri üretir:
// üretilebilir ürün → Üretim Emri (MO) önerisi, satın alınan → Satınalma önerisi.
// Öneriler onaylanınca (apply) taslak MO'lara dönüşür. Çok seviyeli BOM patlatma.

export type PlanningSuggestionType = 'manufacture' | 'purchase'
export type PlanningSuggestionReason = 'reorder' | 'sales_order' | 'dependent_demand'
export type PlanningRunStatus = 'draft' | 'applied' | 'cancelled'
export type PlanningSuggestionStatus = 'pending' | 'applied' | 'dismissed'

export const PLANNING_REASON_LABELS: Record<PlanningSuggestionReason, string> = {
  reorder: 'Min/Max Stok',
  sales_order: 'Satış Siparişi (MTO)',
  dependent_demand: 'Bağımlı Talep (BOM)',
}

// ── Reorder (min/max) rules ────────────────────────────────────────────────────

export interface ReorderRuleDto {
  id: string
  productId: string
  variantId: string | null
  productName: string
  productCode: string
  branchId: string | null
  minQty: number
  maxQty: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateReorderRuleRequest {
  productId: string
  variantId?: string | null
  branchId?: string | null
  minQty: number
  maxQty: number
  isActive?: boolean
}

export type UpdateReorderRuleRequest = Partial<Omit<CreateReorderRuleRequest, 'productId'>>

export interface ReorderRuleListQuery {
  productId?: string
  branchId?: string
  isActive?: boolean
}

// ── Planning run + suggestions ─────────────────────────────────────────────────

export interface PlanningSuggestionDto {
  id: string
  runId: string
  productId: string
  variantId: string | null
  productName: string
  productCode: string
  branchId: string | null
  suggestionType: PlanningSuggestionType
  reason: PlanningSuggestionReason
  requiredQuantity: number
  unit: string
  suggestedDate: string | null
  /** BOM explosion depth (0 = top-level demand). */
  level: number
  /** Origin ref: sales order line id / reorder rule id / parent product id. */
  sourceRef: string | null
  status: PlanningSuggestionStatus
  createdManufacturingOrderId: string | null
  createdAt: string
}

export interface PlanningRunDto {
  id: string
  runNo: string
  runDate: string
  status: PlanningRunStatus
  horizonDays: number
  branchId: string | null
  notes: string | null
  suggestions: PlanningSuggestionDto[]
  createdAt: string
  updatedAt: string
}

export interface PlanningRunSummary {
  id: string
  runNo: string
  runDate: string
  status: PlanningRunStatus
  suggestionCount: number
}

export interface RunPlanningRequest {
  branchId?: string | null
  horizonDays?: number
  includeReorder?: boolean
  includeSalesOrders?: boolean
  notes?: string | null
}

export interface ApplyPlanningRequest {
  /** Apply only these suggestions; when omitted, all pending manufacture suggestions. */
  suggestionIds?: string[]
}

export interface PlanningRunListQuery {
  status?: PlanningRunStatus
}
