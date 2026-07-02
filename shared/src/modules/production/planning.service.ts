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

// Min/max reorder kuralları CRUD.
export interface IReorderRulesService {
  list(query?: ReorderRuleListQuery): Promise<ReorderRuleDto[]>
  create(input: CreateReorderRuleRequest): Promise<ReorderRuleDto>
  update(id: string, input: UpdateReorderRuleRequest): Promise<ReorderRuleDto>
  remove(id: string): Promise<void>
}

// MRP planlama koşusu: run = öneri üret, apply = önerileri taslak MO'ya çevir.
export interface IPlanningService {
  list(query?: PlanningRunListQuery): Promise<PlanningRunDto[]>
  get(id: string): Promise<PlanningRunDto>
  run(input?: RunPlanningRequest): Promise<PlanningRunDto>
  apply(id: string, input?: ApplyPlanningRequest): Promise<PlanningRunDto>
  cancel(id: string): Promise<PlanningRunDto>
}
