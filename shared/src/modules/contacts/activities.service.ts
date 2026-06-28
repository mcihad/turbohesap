import type {
  ActivityDto,
  ActivityListQuery,
  CreateActivityRequest,
  UpdateActivityRequest,
} from './activity.dto'

export interface IActivitiesService {
  list(query?: ActivityListQuery): Promise<ActivityDto[]>
  get(id: string): Promise<ActivityDto>
  create(input: CreateActivityRequest): Promise<ActivityDto>
  update(id: string, input: UpdateActivityRequest): Promise<ActivityDto>
  remove(id: string): Promise<void>
}
