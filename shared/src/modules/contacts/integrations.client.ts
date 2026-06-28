import type { AxiosInstance } from 'axios'

import type {
  AiDraftEmailRequest,
  AiScoreRequest,
  AiScoreResult,
  AiSummarizeRequest,
  AiTextResult,
  IntegrationConnectionDto,
  IntegrationType,
  SendMessageRequest,
  SendMessageResult,
  TestIntegrationResult,
  UpsertIntegrationRequest,
} from './integrations.dto'
import type { IIntegrationsService } from './integrations.service'

const base = '/contacts/integrations'

export class IntegrationsApiClient implements IIntegrationsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<IntegrationConnectionDto[]> {
    return (await this.http.get<IntegrationConnectionDto[]>(base)).data
  }
  async get(type: IntegrationType): Promise<IntegrationConnectionDto | null> {
    return (await this.http.get<IntegrationConnectionDto | null>(`${base}/${type}`)).data
  }
  async upsert(input: UpsertIntegrationRequest): Promise<IntegrationConnectionDto> {
    return (await this.http.put<IntegrationConnectionDto>(`${base}/${input.type}`, input)).data
  }
  async remove(type: IntegrationType): Promise<void> {
    await this.http.delete(`${base}/${type}`)
  }
  async test(type: IntegrationType): Promise<TestIntegrationResult> {
    return (await this.http.post<TestIntegrationResult>(`${base}/${type}/test`, {})).data
  }
  async send(input: SendMessageRequest): Promise<SendMessageResult> {
    return (await this.http.post<SendMessageResult>(`${base}/send`, input)).data
  }
  async aiDraftEmail(input: AiDraftEmailRequest): Promise<AiTextResult> {
    return (await this.http.post<AiTextResult>(`${base}/ai/draft-email`, input)).data
  }
  async aiSummarize(input: AiSummarizeRequest): Promise<AiTextResult> {
    return (await this.http.post<AiTextResult>(`${base}/ai/summarize`, input)).data
  }
  async aiScore(input: AiScoreRequest): Promise<AiScoreResult> {
    return (await this.http.post<AiScoreResult>(`${base}/ai/score`, input)).data
  }
}
