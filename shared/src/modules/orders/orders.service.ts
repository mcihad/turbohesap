import type {
  ConvertOrderRequest,
  CreateOrderDocumentRequest,
  OrderDocumentDto,
  OrderDocumentSummary,
  OrderListQuery,
  UpdateOrderDocumentRequest,
} from './order.dto'

// Contract for the orders resource (/api/orders/documents). One unified document
// covers quote/order/delivery; `convert` walks the chain and produces a Fatura.
export interface IOrdersService {
  /** Lightweight summaries (no lines) for the list grids. */
  list(query?: OrderListQuery): Promise<OrderDocumentSummary[]>
  get(id: string): Promise<OrderDocumentDto>
  create(input: CreateOrderDocumentRequest): Promise<OrderDocumentDto>
  /** Draft-only edit. */
  update(id: string, input: UpdateOrderDocumentRequest): Promise<OrderDocumentDto>
  remove(id: string): Promise<void>
  /** Assign a gapless number; a delivery also ships (posts stock). */
  confirm(id: string): Promise<OrderDocumentDto>
  /** Convert to the next document (or an invoice); returns the SOURCE doc updated
   *  (its `targetDocId`/`invoiceId` now set). */
  convert(id: string, input?: ConvertOrderRequest): Promise<OrderDocumentDto>
  cancel(id: string): Promise<OrderDocumentDto>
}
