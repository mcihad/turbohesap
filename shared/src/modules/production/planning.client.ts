import type { AxiosInstance } from 'axios'

import type {
  ApplyPlanningRequest,
  CreateReorderRuleRequest,
  PlanningRunDto,
  PlanningRunListQuery,
  ReorderRuleDto,
  ReorderRuleListQuery,
  RunPlanningRequest,
  UpdateReorderRuleRequest,
} from './planning.dto'
import type { IPlanningService, IReorderRulesService } from './planning.service'

export class ReorderRulesApiClient implements IReorderRulesService {
  constructor(private readonly http: AxiosInstance) {}
  async list(query?: ReorderRuleListQuery): Promise<ReorderRuleDto[]> {
    return (await this.http.get<ReorderRuleDto[]>('/production/reorder-rules', { params: query })).data
  }
  async create(input: CreateReorderRuleRequest): Promise<ReorderRuleDto> {
    return (await this.http.post<ReorderRuleDto>('/production/reorder-rules', input)).data
  }
  async update(id: string, input: UpdateReorderRuleRequest): Promise<ReorderRuleDto> {
    return (await this.http.patch<ReorderRuleDto>(`/production/reorder-rules/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/production/reorder-rules/${id}`)
  }
}

export class PlanningApiClient implements IPlanningService {
  constructor(private readonly http: AxiosInstance) {}
  async list(query?: PlanningRunListQuery): Promise<PlanningRunDto[]> {
    return (await this.http.get<PlanningRunDto[]>('/production/planning-runs', { params: query })).data
  }
  async get(id: string): Promise<PlanningRunDto> {
    return (await this.http.get<PlanningRunDto>(`/production/planning-runs/${id}`)).data
  }
  async run(input?: RunPlanningRequest): Promise<PlanningRunDto> {
    return (await this.http.post<PlanningRunDto>('/production/planning-runs', input ?? {})).data
  }
  async apply(id: string, input?: ApplyPlanningRequest): Promise<PlanningRunDto> {
    return (await this.http.post<PlanningRunDto>(`/production/planning-runs/${id}/apply`, input ?? {})).data
  }
  async cancel(id: string): Promise<PlanningRunDto> {
    return (await this.http.post<PlanningRunDto>(`/production/planning-runs/${id}/cancel`, {})).data
  }
}
