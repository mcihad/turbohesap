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

export interface IIntegrationsService {
  list(): Promise<IntegrationConnectionDto[]>
  get(type: IntegrationType): Promise<IntegrationConnectionDto | null>
  upsert(input: UpsertIntegrationRequest): Promise<IntegrationConnectionDto>
  remove(type: IntegrationType): Promise<void>
  test(type: IntegrationType): Promise<TestIntegrationResult>
  // Outbound messaging
  send(input: SendMessageRequest): Promise<SendMessageResult>
  // AI (Claude)
  aiDraftEmail(input: AiDraftEmailRequest): Promise<AiTextResult>
  aiSummarize(input: AiSummarizeRequest): Promise<AiTextResult>
  aiScore(input: AiScoreRequest): Promise<AiScoreResult>
}
