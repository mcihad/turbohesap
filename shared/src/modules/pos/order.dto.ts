// POS order (sipariş/fiş) — the transactional heart. An order has lines (each
// with chosen modifiers) and many payments (split/multi-tender). On settle the
// server posts stock + finance + cari once, like the invoices module.

export type PosOrderStatus = 'open' | 'paid' | 'voided' | 'refunded' | 'parked'
export const POS_ORDER_STATUSES: PosOrderStatus[] = [
  'open',
  'paid',
  'voided',
  'refunded',
  'parked',
]

export type PosOrderType = 'dine_in' | 'takeaway' | 'delivery'
export const POS_ORDER_TYPES: PosOrderType[] = ['dine_in', 'takeaway', 'delivery']

export type PosPaymentMethod = 'cash' | 'card' | 'account' | 'other'
export const POS_PAYMENT_METHODS: PosPaymentMethod[] = ['cash', 'card', 'account', 'other']

export type KitchenStatus = 'new' | 'sent' | 'preparing' | 'ready' | 'served' | 'void'

export interface PosOrderLineModifierDto {
  id: string
  lineId: string
  groupNameSnapshot: string
  optionNameSnapshot: string
  priceDelta: number
  groupId: string | null
  optionId: string | null
}

export interface PosOrderLineDto {
  id: string
  orderId: string
  productId: string | null
  variantId: string | null
  /** Name snapshot at sale time (history never mutates). */
  name: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
  lineTotal: number
  kitchenStatus: KitchenStatus
  stationId: string | null
  notes: string | null
  modifiers: PosOrderLineModifierDto[]
}

export interface PosPaymentDto {
  id: string
  orderId: string
  method: PosPaymentMethod
  amount: number
  cashAccountId: string | null
  bankAccountId: string | null
  contactId: string | null
  accountName: string | null
  changeGiven: number
  createdAt: string
}

export interface PosOrderDto {
  id: string
  clientRef: string
  sessionId: string | null
  registerId: string
  branchId: string
  salesChannelId: string | null
  orderType: PosOrderType
  tableId: string | null
  contactId: string | null
  contact: { id: string; name: string } | null
  status: PosOrderStatus
  orderNo: string
  currencyCode: string
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  paidTotal: number
  /** COMPUTED: grandTotal − paidTotal (≥ 0). */
  remainingTotal: number
  changeDue: number
  taxInclusive: boolean
  notes: string | null
  parentOrderId: string | null
  lines: PosOrderLineDto[]
  payments: PosPaymentDto[]
  createdAt: string
  updatedAt: string
}

// ── requests ──
// Snapshot fields (groupName/optionName/priceDelta) are resolved server-side
// from `optionId`; send them only to override the catalog value.
export interface CreatePosOrderLineModifierInput {
  groupId?: string | null
  optionId?: string | null
  groupName?: string
  optionName?: string
  priceDelta?: number
}

// The server resolves name/unitPrice/taxRate from `productId` (and the
// register's sales channel) when omitted; send them only as an explicit
// override (requires the price-override permission). A line with no productId
// (an ad-hoc/open line) MUST provide name + unitPrice.
export interface CreatePosOrderLineInput {
  productId?: string | null
  variantId?: string | null
  name?: string
  qty: number
  unitPrice?: number
  discount?: number
  taxRate?: number
  notes?: string | null
  modifiers?: CreatePosOrderLineModifierInput[]
}

export interface CreatePosOrderRequest {
  /** Idempotency key (uuid) for offline-safe create. */
  clientRef?: string
  registerId: string
  sessionId?: string | null
  orderType?: PosOrderType
  contactId?: string | null
  tableId?: string | null
  notes?: string | null
  lines: CreatePosOrderLineInput[]
}
export type UpdatePosOrderRequest = Partial<Omit<CreatePosOrderRequest, 'clientRef' | 'registerId'>>

export interface AddPosPaymentRequest {
  method: PosPaymentMethod
  amount: number
  cashAccountId?: string | null
  bankAccountId?: string | null
  contactId?: string | null
  /** Cash tendered (to compute change); defaults to amount. */
  tendered?: number
  clientRef?: string
}

/** Move selected lines into a new child order (split by item → separate receipt). */
export interface SplitPosOrderRequest {
  lineIds: string[]
}

export interface VoidPosOrderRequest {
  reason?: string | null
  /** When true, reverse a previously settled (paid) order. */
  refund?: boolean
}

export interface PosOrderListQuery {
  registerId?: string
  sessionId?: string
  status?: PosOrderStatus
  contactId?: string
  from?: string
  to?: string
}
