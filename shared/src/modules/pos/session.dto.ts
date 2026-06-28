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
  /** COMPUTED: opening cash + Σ cash payments in this session. */
  expectedCash: number
  countedCash: number | null
  status: PosSessionStatus
  /** COMPUTED: Σ grandTotal of paid orders + order count. */
  salesTotal: number
  orderCount: number
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
