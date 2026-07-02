import type {
  CreateWorkCenterRequest,
  UpdateWorkCenterRequest,
  WorkCenterDto,
  WorkCenterListQuery,
} from './work-center.dto'

export interface IWorkCentersService {
  list(query?: WorkCenterListQuery): Promise<WorkCenterDto[]>
  get(id: string): Promise<WorkCenterDto>
  create(input: CreateWorkCenterRequest): Promise<WorkCenterDto>
  update(id: string, input: UpdateWorkCenterRequest): Promise<WorkCenterDto>
  remove(id: string): Promise<void>
}
