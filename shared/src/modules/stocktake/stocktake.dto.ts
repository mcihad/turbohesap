// Stok/Envanter Sayımı (stocktake). A count session snapshots expected on-hand
// (ProductStock for a branch), accumulates physical counts (via barcode scans or
// manual entry), then on approval posts the difference to inventory as
// "Sayım Fazlası" (in) / "Sayım Eksiği" (out) stock movements — setting on-hand =
// counted. Blind counts hide the expected qty from the counter; an approval step
// (a different person) gates posting (segregation of duties).

export type StockCountKind = 'full' | 'partial' | 'cycle'
export const STOCK_COUNT_KINDS: StockCountKind[] = ['full', 'partial', 'cycle']
export const STOCK_COUNT_KIND_LABELS: Record<StockCountKind, string> = {
  full: 'Tam Sayım',
  partial: 'Kısmi Sayım',
  cycle: 'Dönemsel (ABC)',
}

export type StockCountStatus = 'draft' | 'counting' | 'review' | 'approved' | 'cancelled'
export const STOCK_COUNT_STATUSES: StockCountStatus[] = ['draft', 'counting', 'review', 'approved', 'cancelled']
export const STOCK_COUNT_STATUS_LABELS: Record<StockCountStatus, string> = {
  draft: 'Taslak',
  counting: 'Sayımda',
  review: 'İncelemede',
  approved: 'İşlendi',
  cancelled: 'İptal',
}

export type CountReason = 'sayim_hatasi' | 'fire' | 'calinti' | 'kayit_hatasi' | 'sevk_hatasi' | 'bilinmiyor'
export const COUNT_REASONS: CountReason[] = ['sayim_hatasi', 'fire', 'calinti', 'kayit_hatasi', 'sevk_hatasi', 'bilinmiyor']
export const COUNT_REASON_LABELS: Record<CountReason, string> = {
  sayim_hatasi: 'Sayım hatası',
  fire: 'Fire / Zayi',
  calinti: 'Çalıntı / Kayıp',
  kayit_hatasi: 'Kayıt hatası',
  sevk_hatasi: 'Sevk / Mal kabul hatası',
  bilinmiyor: 'Bilinmiyor',
}

export type CountLineStatus = 'pending' | 'counted' | 'recount'

export interface StockCountLineDto {
  id: string
  countId: string
  productId: string
  variantId: string | null
  code: string
  name: string
  barcode: string
  unit: string
  /** System on-hand snapshot at session start (hidden in the UI when blind). */
  expectedQty: number
  countedQty: number
  /** COMPUTED: countedQty − expectedQty. */
  difference: number
  reasonCode: CountReason | null
  status: CountLineStatus
  /** Flagged for recount (variance exceeded the threshold). */
  recountRequested: boolean
  counterId: string | null
  lastCountedAt: string | null
  notes: string | null
}

export interface StockCountScanDto {
  id: string
  countId: string
  lineId: string
  qty: number
  scannedById: string
  createdAt: string
}

export interface StockCountDto {
  id: string
  kind: StockCountKind
  status: StockCountStatus
  branchId: string | null
  branchName: string | null
  /** When true, counters do not see expectedQty (reduces confirmation bias). */
  blind: boolean
  name: string
  plannedDate: string | null
  startedAt: string | null
  completedAt: string | null
  /** Variance % above which a line is flagged for recount. */
  recountThresholdPct: number
  scopeCategoryIds: string[]
  scopeProductIds: string[]
  /** ABC class for a cycle count ('A' | 'B' | 'C'); null otherwise. */
  abcClass: string | null
  createdById: string
  createdByName: string
  approvedById: string | null
  approvedByName: string | null
  // COMPUTED progress
  lineCount: number
  countedCount: number
  varianceCount: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ── requests ──
export interface CreateStockCountRequest {
  kind: StockCountKind
  branchId?: string | null
  blind?: boolean
  name?: string
  plannedDate?: string | null
  recountThresholdPct?: number
  /** Partial scope. */
  scopeCategoryIds?: string[]
  scopeProductIds?: string[]
  /** Cycle scope. */
  abcClass?: string | null
  /** Allow counting products not in the generated scope (auto-add on scan). */
  allowAddUnlisted?: boolean
  /** Include zero/uncounted lines as 0 on approve (treat unscanned as 0). */
  countUnscannedAsZero?: boolean
}

/** One counted observation. Resolve the line by id, by barcode, or by ids. */
export interface CountEntryInput {
  lineId?: string
  barcode?: string
  productId?: string
  variantId?: string | null
  qty: number
}
export interface SubmitCountEntriesRequest {
  entries: CountEntryInput[]
}

export interface SetCountLineRequest {
  countedQty?: number
  reasonCode?: CountReason | null
  notes?: string | null
}

export interface StockCountListQuery {
  status?: StockCountStatus
  kind?: StockCountKind
  branchId?: string
  from?: string
  to?: string
}
