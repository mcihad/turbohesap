// Per-product sales & stock analytics. Aggregates invoice lines + POS order
// lines for one product over a date range. Available even when the product does
// NOT track stock (a service/consumable still has a sales history).

export interface ProductStatsQuery {
  /** ISO date (yyyy-mm-dd) inclusive lower bound; defaults to ~12 weeks ago. */
  from?: string
  /** ISO date inclusive upper bound; defaults to today. */
  to?: string
  /** Time bucket for the trend series. */
  granularity?: 'day' | 'week' | 'month'
}

/** One time bucket of the sales trend. */
export interface ProductStatsPoint {
  /** Bucket label (e.g. "2026-06-29" or "2026-W26"). */
  period: string
  qty: number
  revenue: number
}

/** Sales split by source channel (invoices vs POS). */
export interface ProductStatsBySource {
  source: 'invoice' | 'pos'
  qty: number
  revenue: number
}

export interface ProductStatsDto {
  productId: string
  from: string
  to: string
  granularity: 'day' | 'week' | 'month'
  /** Σ quantity sold across both sources in the range. */
  totalQty: number
  /** Σ revenue (line totals) across both sources. */
  totalRevenue: number
  /** Number of distinct sale documents (invoices + orders). */
  orderCount: number
  /** Current on-hand (sum of stock rows); 0 when not tracked. */
  onHand: number
  trend: ProductStatsPoint[]
  bySource: ProductStatsBySource[]
}
