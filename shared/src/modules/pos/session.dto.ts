// POS session (vardiya) — an open/close shift on a register with opening &
// closing cash counts, powering X/Z reports.

export type PosSessionStatus = 'open' | 'closed'

export interface PosSessionDto {
  id: string
  registerId: string
  registerName: string
  branchId: string
  openedById: string
  openedByName: string
  openedAt: string
  openingCash: number
  closedAt: string | null
  closingCash: number | null
  closedById: string | null
  closedByName: string | null
  /** COMPUTED: opening cash + Σ cash payments in this session. */
  expectedCash: number
  countedCash: number | null
  status: PosSessionStatus
  /** COMPUTED: Σ grandTotal of paid orders + order count. */
  salesTotal: number
  /** COMPUTED: Σ card payments in this session. */
  cardTotal: number
  orderCount: number
  /** Aggregated finance postings created at close (vezne). Null while open —
   *  cash/card are NOT posted per-order; they post once on close. */
  cashFinanceTxId: string | null
  cardFinanceTxId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface OpenSessionRequest {
  registerId: string
  openingCash?: number
}

export interface CloseSessionRequest {
  countedCash?: number
  notes?: string | null
}

export interface SessionListQuery {
  registerId?: string
  status?: PosSessionStatus
  from?: string
  to?: string
}
