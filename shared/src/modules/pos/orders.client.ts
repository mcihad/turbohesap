import type { AxiosInstance } from 'axios'

import type {
  AddPosPaymentRequest,
  CreatePosOrderRequest,
  PosOrderDto,
  PosOrderListQuery,
  ReturnPosOrderRequest,
  SplitPosOrderRequest,
  UpdatePosOrderRequest,
  VoidPosOrderRequest,
} from './order.dto'
import type { IPosOrdersService } from './orders.service'

const base = '/pos/orders'

export class PosOrdersApiClient implements IPosOrdersService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: PosOrderListQuery): Promise<PosOrderDto[]> {
    return (await this.http.get<PosOrderDto[]>(base, { params: query })).data
  }
  async get(id: string): Promise<PosOrderDto> {
    return (await this.http.get<PosOrderDto>(`${base}/${id}`)).data
  }
  async create(input: CreatePosOrderRequest): Promise<PosOrderDto> {
    return (await this.http.post<PosOrderDto>(base, input)).data
  }
  async update(id: string, input: UpdatePosOrderRequest): Promise<PosOrderDto> {
    return (await this.http.patch<PosOrderDto>(`${base}/${id}`, input)).data
  }
  async addPayment(id: string, input: AddPosPaymentRequest): Promise<PosOrderDto> {
    return (await this.http.post<PosOrderDto>(`${base}/${id}/payments`, input)).data
  }
  async removePayment(id: string, paymentId: string): Promise<PosOrderDto> {
    return (await this.http.delete<PosOrderDto>(`${base}/${id}/payments/${paymentId}`)).data
  }
  async settle(id: string): Promise<PosOrderDto> {
    return (await this.http.post<PosOrderDto>(`${base}/${id}/settle`, {})).data
  }
  async split(id: string, input: SplitPosOrderRequest): Promise<PosOrderDto> {
    return (await this.http.post<PosOrderDto>(`${base}/${id}/split`, input)).data
  }
  async void(id: string, input: VoidPosOrderRequest): Promise<PosOrderDto> {
    return (await this.http.post<PosOrderDto>(`${base}/${id}/void`, input)).data
  }
  async returnLines(id: string, input: ReturnPosOrderRequest): Promise<PosOrderDto> {
    return (await this.http.post<PosOrderDto>(`${base}/${id}/return`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`${base}/${id}`)
  }
}
