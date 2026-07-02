import type { AxiosInstance } from 'axios'

import type { Page } from '../../core/pagination'
import { encodeListQuery } from '../../core/list-query'
import type {
  CreateInvoiceRequest,
  InvoiceDto,
  InvoiceListQuery,
  UpdateInvoiceRequest,
} from './invoice.dto'
import type { CreateInvoicePaymentRequest, InvoicePaymentDto } from './invoice-payment.dto'
import type { IInvoicesService } from './invoices.service'

export class InvoicesApiClient implements IInvoicesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: InvoiceListQuery): Promise<InvoiceDto[]> {
    return (await this.http.get<InvoiceDto[]>('/invoices/invoices', { params: query })).data
  }
  async listPage(query?: InvoiceListQuery): Promise<Page<InvoiceDto>> {
    const params = {
      ...(query?.type ? { type: query.type } : {}),
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.contactId ? { contactId: query.contactId } : {}),
      ...(query?.from ? { from: query.from } : {}),
      ...(query?.to ? { to: query.to } : {}),
      ...encodeListQuery(query ?? {}),
    }
    return (await this.http.get<Page<InvoiceDto>>('/invoices/invoices/paged', { params })).data
  }
  async get(id: string): Promise<InvoiceDto> {
    return (await this.http.get<InvoiceDto>(`/invoices/invoices/${id}`)).data
  }
  async create(input: CreateInvoiceRequest): Promise<InvoiceDto> {
    return (await this.http.post<InvoiceDto>('/invoices/invoices', input)).data
  }
  async update(id: string, input: UpdateInvoiceRequest): Promise<InvoiceDto> {
    return (await this.http.patch<InvoiceDto>(`/invoices/invoices/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/invoices/invoices/${id}`)
  }
  async issue(id: string): Promise<InvoiceDto> {
    return (await this.http.post<InvoiceDto>(`/invoices/invoices/${id}/issue`, {})).data
  }
  async cancel(id: string): Promise<InvoiceDto> {
    return (await this.http.post<InvoiceDto>(`/invoices/invoices/${id}/cancel`, {})).data
  }
  async xml(id: string): Promise<string> {
    return (await this.http.get<string>(`/invoices/invoices/${id}/xml`, { responseType: 'text' })).data
  }
  async listPayments(invoiceId: string): Promise<InvoicePaymentDto[]> {
    return (await this.http.get<InvoicePaymentDto[]>(`/invoices/invoices/${invoiceId}/payments`)).data
  }
  async addPayment(invoiceId: string, input: CreateInvoicePaymentRequest): Promise<InvoiceDto> {
    return (await this.http.post<InvoiceDto>(`/invoices/invoices/${invoiceId}/payments`, input)).data
  }
  async removePayment(paymentId: string): Promise<void> {
    await this.http.delete(`/invoices/invoices/payments/${paymentId}`)
  }
}
