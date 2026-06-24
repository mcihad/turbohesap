import type { AxiosInstance } from 'axios'

import type { Page } from '../../core/pagination'
import type { AuditLogDto, AuditLogQuery } from './audit-log.dto'
import type { IAuditLogsService } from './audit-logs.service'

// axios-backed implementation of IAuditLogsService → /api/iam/audit-logs.
export class AuditLogsApiClient implements IAuditLogsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query: AuditLogQuery = {}): Promise<Page<AuditLogDto>> {
    const { data } = await this.http.get<Page<AuditLogDto>>('/iam/audit-logs', {
      params: query,
    })
    return data
  }

  async get(id: string): Promise<AuditLogDto> {
    const { data } = await this.http.get<AuditLogDto>(`/iam/audit-logs/${id}`)
    return data
  }

  async forEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLogDto[]> {
    const { data } = await this.http.get<AuditLogDto[]>(
      `/iam/audit-logs/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    )
    return data
  }
}
