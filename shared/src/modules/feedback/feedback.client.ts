import type { AxiosInstance } from 'axios'

import type {
  CreateFeedbackRequest,
  FeedbackDto,
  FeedbackListQuery,
  UpdateFeedbackRequest,
} from './feedback.dto'
import type { IFeedbackService } from './feedback.service'

const base = '/feedback'

export class FeedbackApiClient implements IFeedbackService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: FeedbackListQuery): Promise<FeedbackDto[]> {
    return (await this.http.get<FeedbackDto[]>(base, { params: query })).data
  }
  async get(id: string): Promise<FeedbackDto> {
    return (await this.http.get<FeedbackDto>(`${base}/${id}`)).data
  }
  async create(input: CreateFeedbackRequest): Promise<FeedbackDto> {
    return (await this.http.post<FeedbackDto>(base, input)).data
  }
  async update(id: string, input: UpdateFeedbackRequest): Promise<FeedbackDto> {
    return (await this.http.patch<FeedbackDto>(`${base}/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`${base}/${id}`)
  }
}
