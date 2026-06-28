import type {
  AddPosPaymentRequest,
  CreatePosOrderRequest,
  PosOrderDto,
  PosOrderListQuery,
  SplitPosOrderRequest,
  UpdatePosOrderRequest,
  VoidPosOrderRequest,
} from './order.dto'

export interface IPosOrdersService {
  list(query?: PosOrderListQuery): Promise<PosOrderDto[]>
  get(id: string): Promise<PosOrderDto>
  /** Idempotent on clientRef (offline-safe). */
  create(input: CreatePosOrderRequest): Promise<PosOrderDto>
  update(id: string, input: UpdatePosOrderRequest): Promise<PosOrderDto>
  /** Add a tender; auto-settles (posts stock+finance+cari) when fully paid. */
  addPayment(id: string, input: AddPosPaymentRequest): Promise<PosOrderDto>
  removePayment(id: string, paymentId: string): Promise<PosOrderDto>
  /** Force settle a fully-paid order (e.g. account/charge with 0 remaining). */
  settle(id: string): Promise<PosOrderDto>
  /** Split selected lines into a new child order; returns the new order. */
  split(id: string, input: SplitPosOrderRequest): Promise<PosOrderDto>
  /** Void (open) or refund (paid) — reverses stock/finance/cari. */
  void(id: string, input: VoidPosOrderRequest): Promise<PosOrderDto>
  remove(id: string): Promise<void>
}
