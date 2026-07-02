import type { AxiosInstance } from 'axios'

import type {
  FinishWorkOrderRequest,
  StartWorkOrderRequest,
  WorkOrderDto,
  WorkOrderListQuery,
} from './work-order.dto'
import type { IWorkOrdersService } from './work-orders.service'

export class WorkOrdersApiClient implements IWorkOrdersService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: WorkOrderListQuery): Promise<WorkOrderDto[]> {
    return (await this.http.get<WorkOrderDto[]>('/production/work-orders', { params: query })).data
  }
  async get(id: string): Promise<WorkOrderDto> {
    return (await this.http.get<WorkOrderDto>(`/production/work-orders/${id}`)).data
  }
  async start(id: string, input?: StartWorkOrderRequest): Promise<WorkOrderDto> {
    return (await this.http.post<WorkOrderDto>(`/production/work-orders/${id}/start`, input ?? {})).data
  }
  async pause(id: string): Promise<WorkOrderDto> {
    return (await this.http.post<WorkOrderDto>(`/production/work-orders/${id}/pause`, {})).data
  }
  async resume(id: string, input?: StartWorkOrderRequest): Promise<WorkOrderDto> {
    return (await this.http.post<WorkOrderDto>(`/production/work-orders/${id}/resume`, input ?? {})).data
  }
  async finish(id: string, input: FinishWorkOrderRequest): Promise<WorkOrderDto> {
    return (await this.http.post<WorkOrderDto>(`/production/work-orders/${id}/finish`, input)).data
  }
}
