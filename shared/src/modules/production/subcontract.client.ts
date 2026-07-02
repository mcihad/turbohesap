import type { AxiosInstance } from 'axios'

import type {
  CreateSubcontractDispatchRequest,
  ReceiveSubcontractDispatchRequest,
  SubcontractDispatchDto,
  SubcontractDispatchListQuery,
  SubcontractStockQuery,
  SubcontractStockRow,
} from './subcontract.dto'
import type { ISubcontractDispatchesService } from './subcontract.service'

export class SubcontractDispatchesApiClient implements ISubcontractDispatchesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: SubcontractDispatchListQuery): Promise<SubcontractDispatchDto[]> {
    return (await this.http.get<SubcontractDispatchDto[]>('/production/subcontract-dispatches', { params: query })).data
  }
  async get(id: string): Promise<SubcontractDispatchDto> {
    return (await this.http.get<SubcontractDispatchDto>(`/production/subcontract-dispatches/${id}`)).data
  }
  async create(input: CreateSubcontractDispatchRequest): Promise<SubcontractDispatchDto> {
    return (await this.http.post<SubcontractDispatchDto>('/production/subcontract-dispatches', input)).data
  }
  async send(id: string): Promise<SubcontractDispatchDto> {
    return (await this.http.post<SubcontractDispatchDto>(`/production/subcontract-dispatches/${id}/send`, {})).data
  }
  async receive(id: string, input: ReceiveSubcontractDispatchRequest): Promise<SubcontractDispatchDto> {
    return (await this.http.post<SubcontractDispatchDto>(`/production/subcontract-dispatches/${id}/receive`, input)).data
  }
  async cancel(id: string): Promise<SubcontractDispatchDto> {
    return (await this.http.post<SubcontractDispatchDto>(`/production/subcontract-dispatches/${id}/cancel`, {})).data
  }
  async stockAtSubcontractor(query?: SubcontractStockQuery): Promise<SubcontractStockRow[]> {
    return (await this.http.get<SubcontractStockRow[]>('/production/subcontract-stock', { params: query })).data
  }
}
