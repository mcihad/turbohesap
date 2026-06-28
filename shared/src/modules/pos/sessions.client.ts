import type { AxiosInstance } from 'axios'

import type {
  CloseSessionRequest,
  OpenSessionRequest,
  PosSessionDto,
  SessionListQuery,
} from './session.dto'
import type { IPosSessionsService } from './sessions.service'

const base = '/pos/sessions'

export class PosSessionsApiClient implements IPosSessionsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: SessionListQuery): Promise<PosSessionDto[]> {
    return (await this.http.get<PosSessionDto[]>(base, { params: query })).data
  }
  async get(id: string): Promise<PosSessionDto> {
    return (await this.http.get<PosSessionDto>(`${base}/${id}`)).data
  }
  async current(registerId: string): Promise<PosSessionDto | null> {
    return (await this.http.get<PosSessionDto | null>(`${base}/current`, { params: { registerId } }))
      .data
  }
  async open(input: OpenSessionRequest): Promise<PosSessionDto> {
    return (await this.http.post<PosSessionDto>(base, input)).data
  }
  async close(id: string, input: CloseSessionRequest): Promise<PosSessionDto> {
    return (await this.http.post<PosSessionDto>(`${base}/${id}/close`, input)).data
  }
}
