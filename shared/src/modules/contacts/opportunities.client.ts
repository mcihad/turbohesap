import type { AxiosInstance } from 'axios'

import type {
  CloseOpportunityRequest,
  CreateOpportunityRequest,
  MoveOpportunityRequest,
  OpportunityDto,
  OpportunityListQuery,
  UpdateOpportunityRequest,
} from './opportunity.dto'
import type { BulkOpportunityRequest, BulkResultDto } from './crm-fields.dto'
import type { IOpportunitiesService } from './opportunities.service'

export class OpportunitiesApiClient implements IOpportunitiesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: OpportunityListQuery): Promise<OpportunityDto[]> {
    return (await this.http.get<OpportunityDto[]>('/contacts/opportunities', { params: query })).data
  }
  async get(id: string): Promise<OpportunityDto> {
    return (await this.http.get<OpportunityDto>(`/contacts/opportunities/${id}`)).data
  }
  async create(input: CreateOpportunityRequest): Promise<OpportunityDto> {
    return (await this.http.post<OpportunityDto>('/contacts/opportunities', input)).data
  }
  async update(id: string, input: UpdateOpportunityRequest): Promise<OpportunityDto> {
    return (await this.http.patch<OpportunityDto>(`/contacts/opportunities/${id}`, input)).data
  }
  async move(id: string, input: MoveOpportunityRequest): Promise<OpportunityDto> {
    return (await this.http.patch<OpportunityDto>(`/contacts/opportunities/${id}/stage`, input)).data
  }
  async close(id: string, input: CloseOpportunityRequest): Promise<OpportunityDto> {
    return (await this.http.post<OpportunityDto>(`/contacts/opportunities/${id}/close`, input)).data
  }
  async bulk(input: BulkOpportunityRequest): Promise<BulkResultDto> {
    return (await this.http.post<BulkResultDto>('/contacts/opportunities/bulk', input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/contacts/opportunities/${id}`)
  }
}
