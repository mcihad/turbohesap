import type { AxiosInstance } from 'axios'

import type {
  CompleteManufacturingOrderRequest,
  CreateFromDemandRequest,
  CreateManufacturingOrderRequest,
  ManufacturingOrderDto,
  ManufacturingOrderListQuery,
  UpdateManufacturingOrderRequest,
} from './manufacturing-order.dto'
import type { IManufacturingOrdersService } from './manufacturing-orders.service'

export class ManufacturingOrdersApiClient implements IManufacturingOrdersService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: ManufacturingOrderListQuery): Promise<ManufacturingOrderDto[]> {
    return (await this.http.get<ManufacturingOrderDto[]>('/production/orders', { params: query })).data
  }
  async get(id: string): Promise<ManufacturingOrderDto> {
    return (await this.http.get<ManufacturingOrderDto>(`/production/orders/${id}`)).data
  }
  async create(input: CreateManufacturingOrderRequest): Promise<ManufacturingOrderDto> {
    return (await this.http.post<ManufacturingOrderDto>('/production/orders', input)).data
  }
  async createFromDemand(input: CreateFromDemandRequest): Promise<ManufacturingOrderDto> {
    return (await this.http.post<ManufacturingOrderDto>('/production/orders/from-demand', input)).data
  }
  async update(id: string, input: UpdateManufacturingOrderRequest): Promise<ManufacturingOrderDto> {
    return (await this.http.patch<ManufacturingOrderDto>(`/production/orders/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/production/orders/${id}`)
  }
  async confirm(id: string): Promise<ManufacturingOrderDto> {
    return (await this.http.post<ManufacturingOrderDto>(`/production/orders/${id}/confirm`, {})).data
  }
  async complete(id: string, input: CompleteManufacturingOrderRequest): Promise<ManufacturingOrderDto> {
    return (await this.http.post<ManufacturingOrderDto>(`/production/orders/${id}/complete`, input)).data
  }
  async cancel(id: string): Promise<ManufacturingOrderDto> {
    return (await this.http.post<ManufacturingOrderDto>(`/production/orders/${id}/cancel`, {})).data
  }
}
