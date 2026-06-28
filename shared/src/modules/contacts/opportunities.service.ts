import type {
  CloseOpportunityRequest,
  CreateOpportunityRequest,
  MoveOpportunityRequest,
  OpportunityDto,
  OpportunityListQuery,
  UpdateOpportunityRequest,
} from './opportunity.dto'
import type { BulkOpportunityRequest, BulkResultDto } from './crm-fields.dto'

export interface IOpportunitiesService {
  list(query?: OpportunityListQuery): Promise<OpportunityDto[]>
  get(id: string): Promise<OpportunityDto>
  create(input: CreateOpportunityRequest): Promise<OpportunityDto>
  update(id: string, input: UpdateOpportunityRequest): Promise<OpportunityDto>
  /** Move to another stage (Kanban). */
  move(id: string, input: MoveOpportunityRequest): Promise<OpportunityDto>
  /** Close as won/lost with an optional reason. */
  close(id: string, input: CloseOpportunityRequest): Promise<OpportunityDto>
  /** Apply a bulk operation (assign owner / move) to many deals. */
  bulk(input: BulkOpportunityRequest): Promise<BulkResultDto>
  remove(id: string): Promise<void>
}
