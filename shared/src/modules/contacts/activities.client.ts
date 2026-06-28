import type { AxiosInstance } from 'axios'

import type {
  ActivityDto,
  ActivityListQuery,
  CreateActivityRequest,
  UpdateActivityRequest,
} from './activity.dto'
import type { IActivitiesService } from './activities.service'

export class ActivitiesApiClient implements IActivitiesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: ActivityListQuery): Promise<ActivityDto[]> {
    return (await this.http.get<ActivityDto[]>('/contacts/activities', { params: query })).data
  }
  async get(id: string): Promise<ActivityDto> {
    return (await this.http.get<ActivityDto>(`/contacts/activities/${id}`)).data
  }
  async create(input: CreateActivityRequest): Promise<ActivityDto> {
    return (await this.http.post<ActivityDto>('/contacts/activities', input)).data
  }
  async update(id: string, input: UpdateActivityRequest): Promise<ActivityDto> {
    return (await this.http.patch<ActivityDto>(`/contacts/activities/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/contacts/activities/${id}`)
  }
}
