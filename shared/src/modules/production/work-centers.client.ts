import type { AxiosInstance } from 'axios'

import type {
  CreateWorkCenterRequest,
  UpdateWorkCenterRequest,
  WorkCenterDto,
  WorkCenterListQuery,
} from './work-center.dto'
import type { IWorkCentersService } from './work-centers.service'

// Axios implementation → /api/production/work-centers.
export class WorkCentersApiClient implements IWorkCentersService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: WorkCenterListQuery): Promise<WorkCenterDto[]> {
    return (await this.http.get<WorkCenterDto[]>('/production/work-centers', { params: query })).data
  }
  async get(id: string): Promise<WorkCenterDto> {
    return (await this.http.get<WorkCenterDto>(`/production/work-centers/${id}`)).data
  }
  async create(input: CreateWorkCenterRequest): Promise<WorkCenterDto> {
    return (await this.http.post<WorkCenterDto>('/production/work-centers', input)).data
  }
  async update(id: string, input: UpdateWorkCenterRequest): Promise<WorkCenterDto> {
    return (await this.http.patch<WorkCenterDto>(`/production/work-centers/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/production/work-centers/${id}`)
  }
}
