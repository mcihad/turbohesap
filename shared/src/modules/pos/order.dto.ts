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
  /** Stock-consumption snapshot (frozen at sale time). When stockProductId is
   *  set and deductStock is true, settling the order deducts this product. */
  stockProductId: string | null
  stockVariantId: string | null
  consumeQty: number
  deductStock: boolean
  returnable: boolean
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
  /** True for a server-generated bundle component line (e.g. "+ 2 Ketçap").
   *  Bundle children are indented under their parent and not edited directly. */
  isBundleChild: boolean
  /** The parent line id this bundle child belongs to (null for normal lines). */
  bundleParentLineId: string | null
  /** When true this line can be returned to stock (geri giriş). */
  returnable: boolean
  /** Quantity already returned to stock for this line. */
  returnedQty: number
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
  /** Set by the cart for preview-only bundle children; the server ignores them
   *  (it re-expands bundle components authoritatively from the parent product). */
  isBundleChild?: boolean
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

/** Return specific (returnable) line units back to stock — "geri giriş".
 *  Used for unconsumed packaged items handed out with an order. Posts an
 *  inbound stock movement for each returned line; money refund is optional. */
export interface ReturnPosOrderLineInput {
  lineId: string
  qty: number
}
export interface ReturnPosOrderRequest {
  lines: ReturnPosOrderLineInput[]
  reason?: string | null
  /** When true, also refund the value of the returned lines (cash drawer). */
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
