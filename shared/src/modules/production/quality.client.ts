import type { AxiosInstance } from 'axios'

import type {
  QualityCheckDto,
  QualityCheckListQuery,
  RecordQualityCheckRequest,
} from './quality.dto'
import type { IQualityChecksService } from './quality.service'

export class QualityChecksApiClient implements IQualityChecksService {
  constructor(private readonly http: AxiosInstance) {}
  async list(query?: QualityCheckListQuery): Promise<QualityCheckDto[]> {
    return (await this.http.get<QualityCheckDto[]>('/production/quality-checks', { params: query })).data
  }
  async get(id: string): Promise<QualityCheckDto> {
    return (await this.http.get<QualityCheckDto>(`/production/quality-checks/${id}`)).data
  }
  async record(input: RecordQualityCheckRequest): Promise<QualityCheckDto> {
    return (await this.http.post<QualityCheckDto>('/production/quality-checks', input)).data
  }
}
