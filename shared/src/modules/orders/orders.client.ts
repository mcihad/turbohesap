import type { AxiosInstance } from 'axios'

import type {
  ConvertOrderRequest,
  CreateOrderDocumentRequest,
  OrderDocumentDto,
  OrderDocumentSummary,
  OrderListQuery,
  UpdateOrderDocumentRequest,
} from './order.dto'
import type { IOrdersService } from './orders.service'

const base = '/orders/documents'

export class OrdersApiClient implements IOrdersService {
  constructor(private readonly http: AxiosInstance) {}

  list = (query?: OrderListQuery): Promise<OrderDocumentSummary[]> =>
    this.http.get<OrderDocumentSummary[]>(base, { params: query }).then((r) => r.data)
  get = (id: string): Promise<OrderDocumentDto> =>
    this.http.get<OrderDocumentDto>(`${base}/${id}`).then((r) => r.data)
  create = (input: CreateOrderDocumentRequest): Promise<OrderDocumentDto> =>
    this.http.post<OrderDocumentDto>(base, input).then((r) => r.data)
  update = (id: string, input: UpdateOrderDocumentRequest): Promise<OrderDocumentDto> =>
    this.http.patch<OrderDocumentDto>(`${base}/${id}`, input).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`${base}/${id}`).then(() => undefined)
  confirm = (id: string): Promise<OrderDocumentDto> =>
    this.http.post<OrderDocumentDto>(`${base}/${id}/confirm`, {}).then((r) => r.data)
  convert = (id: string, input?: ConvertOrderRequest): Promise<OrderDocumentDto> =>
    this.http.post<OrderDocumentDto>(`${base}/${id}/convert`, input ?? {}).then((r) => r.data)
  cancel = (id: string): Promise<OrderDocumentDto> =>
    this.http.post<OrderDocumentDto>(`${base}/${id}/cancel`, {}).then((r) => r.data)
}
