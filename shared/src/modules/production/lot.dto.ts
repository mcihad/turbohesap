// Parti/Seri (Lot/Serial) izlenebilirlik — hangi hammadde partisi hangi mamul
// partisinde kullanıldı. Üretim emrine 'consumed' (tüketilen) ve 'produced'
// (üretilen) lot bağları kaydedilir; trace ile ileri/geri şecere (genealogy) ve
// geri çağırma (recall) sorgusu yapılır.

export type LotKind = 'lot' | 'serial'
export type LotRole = 'consumed' | 'produced'

export interface LotDto {
  id: string
  productId: string
  productName: string
  variantId: string | null
  lotNo: string
  kind: LotKind
  notes: string | null
  createdAt: string
}

export interface LotRef {
  lotId: string
  lotNo: string
  productId: string
  productName: string
  quantity: number
}

export interface LotLinkDto {
  id: string
  manufacturingOrderId: string
  manufacturingOrderNo: string
  lotId: string
  lotNo: string
  role: LotRole
  productId: string
  productName: string
  quantity: number
  createdAt: string
}

// İki yönlü şecere: bu lotu üreten emirlerin tükettiği lotlar (upstream) ve bu
// lotu tüketen emirlerin ürettiği lotlar (downstream — recall).
export interface LotTraceDto {
  lot: LotDto
  producedFrom: Array<{ manufacturingOrderId: string; manufacturingOrderNo: string; consumedLots: LotRef[] }>
  consumedInto: Array<{ manufacturingOrderId: string; manufacturingOrderNo: string; producedLots: LotRef[] }>
}

// ── Requests ───────────────────────────────────────────────────────────────

export interface CreateLotRequest {
  productId: string
  lotNo: string
  kind?: LotKind
  variantId?: string | null
  notes?: string | null
}

// Register a consumed/produced lot against an MO (auto-creates the lot if new).
export interface RegisterLotRequest {
  manufacturingOrderId: string
  productId: string
  lotNo: string
  quantity: number
  kind?: LotKind
  variantId?: string | null
}

export interface LotListQuery {
  productId?: string
  lotNo?: string
}
