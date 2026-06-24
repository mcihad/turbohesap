import type { AxiosInstance } from 'axios'

import type { Page } from '../../core/pagination'
import type {
  ErrorLogDto,
  ErrorLogQuery,
  ReportClientErrorRequest,
  UpdateErrorLogRequest,
} from './error-log.dto'
import type { IErrorLogsService } from './error-logs.service'

// axios-backed implementation of IErrorLogsService → /api/iam/error-logs.
export class ErrorLogsApiClient implements IErrorLogsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query: ErrorLogQuery = {}): Promise<Page<ErrorLogDto>> {
    const { data } = await this.http.get<Page<ErrorLogDto>>('/iam/error-logs', {
      params: query,
    })
    return data
  }

  async get(id: string): Promise<ErrorLogDto> {
    const { data } = await this.http.get<ErrorLogDto>(`/iam/error-logs/${id}`)
    return data
  }

  async update(
    id: string,
    input: UpdateErrorLogRequest,
  ): Promise<ErrorLogDto> {
    const { data } = await this.http.patch<ErrorLogDto>(
      `/iam/error-logs/${id}`,
      input,
    )
    return data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/iam/error-logs/${id}`)
  }

  async report(input: ReportClientErrorRequest): Promise<void> {
    await this.http.post('/iam/error-logs/client', input)
  }
}
