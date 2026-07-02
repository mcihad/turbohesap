import type { Page } from '../../core/pagination'
import type {
  CreateInvoiceRequest,
  InvoiceDto,
  InvoiceListQuery,
  UpdateInvoiceRequest,
} from './invoice.dto'
import type { CreateInvoicePaymentRequest, InvoicePaymentDto } from './invoice-payment.dto'

export interface IInvoicesService {
  list(query?: InvoiceListQuery): Promise<InvoiceDto[]>
  listPage(query?: InvoiceListQuery): Promise<Page<InvoiceDto>>
  get(id: string): Promise<InvoiceDto>
  create(input: CreateInvoiceRequest): Promise<InvoiceDto>
  update(id: string, input: UpdateInvoiceRequest): Promise<InvoiceDto>
  remove(id: string): Promise<void>
  /** Finalize a draft: assign a gapless number + post to the cari ledger (and stock). */
  issue(id: string): Promise<InvoiceDto>
  /** Reverse a posted invoice (keeps its number). */
  cancel(id: string): Promise<InvoiceDto>
  /** UBL-TR (GİB) e-Fatura/e-Arşiv XML for the invoice. */
  xml(id: string): Promise<string>
  /** Tahsilat/ödeme kayıtları. */
  listPayments(invoiceId: string): Promise<InvoicePaymentDto[]>
  /** Add a payment → posts to kasa/banka + cari ledger, updates paid/status. */
  addPayment(invoiceId: string, input: CreateInvoicePaymentRequest): Promise<InvoiceDto>
  /** Remove a payment → reverses the kasa/banka + cari postings. */
  removePayment(paymentId: string): Promise<void>
}
