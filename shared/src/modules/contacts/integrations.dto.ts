// CRM integrations — provider connections (email/Telegram/WhatsApp/SMS/AI),
// outbound messaging across channels, and AI assistance (Claude). Secrets in
// `config` are write-only: they are masked when read back.

export type IntegrationType = 'email' | 'telegram' | 'whatsapp' | 'sms' | 'ai'
export const INTEGRATION_TYPES: IntegrationType[] = ['email', 'telegram', 'whatsapp', 'sms', 'ai']

export interface IntegrationConnectionDto {
  id: string
  type: IntegrationType
  name: string
  isActive: boolean
  /** Non-secret config echoed back; secret values are masked ("••••"). */
  config: Record<string, string>
  /** Which config keys are set as secrets (so the UI can show "set"). */
  secretKeys: string[]
  createdAt: string
  updatedAt: string
}

export interface UpsertIntegrationRequest {
  type: IntegrationType
  name?: string
  isActive?: boolean
  /** Full config incl. secrets; merged into the stored config. */
  config: Record<string, string>
}

export interface TestIntegrationResult {
  ok: boolean
  message: string
}

// ── Outbound messaging ──
export type MessageChannel = 'email' | 'telegram' | 'whatsapp' | 'sms'
export const MESSAGE_CHANNELS: MessageChannel[] = ['email', 'telegram', 'whatsapp', 'sms']

export interface SendMessageRequest {
  channel: MessageChannel
  /** Recipient address: email | chatId | phone (E.164). */
  to: string
  subject?: string
  body: string
  /** Link/log this message as an Activity on this contact. */
  contactId?: string | null
  opportunityId?: string | null
}

export interface SendMessageResult {
  ok: boolean
  message: string
  providerMessageId?: string
}

// ── AI providers (pluggable) ──
export type AiProvider =
  | 'anthropic'
  | 'openai'
  | 'deepseek'
  | 'gemini'
  | 'minimax'
  | 'kimi'
  | 'glm'
  | 'qwen'
  | 'ollama'

export interface AiProviderInfo {
  value: AiProvider
  label: string
  /** Default model when none chosen. */
  defaultModel: string
  /** Default API base URL (OpenAI-compatible providers); empty for special APIs. */
  defaultBaseUrl: string
  /** Whether an API key is required (Ollama local = false). */
  needsApiKey: boolean
  /** Known model variants (the UI may also allow a custom value). */
  models: { value: string; label: string }[]
}

export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    value: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-sonnet-4-6',
    defaultBaseUrl: 'https://api.anthropic.com',
    needsApiKey: true,
    models: [
      { value: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
      { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    defaultBaseUrl: 'https://api.openai.com/v1',
    needsApiKey: true,
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'o3-mini', label: 'o3-mini' },
    ],
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    defaultModel: 'deepseek-v4-flash',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    needsApiKey: true,
    models: [
      { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
      { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
      { value: 'deepseek-chat', label: 'DeepSeek-V3 (chat)' },
      { value: 'deepseek-reasoner', label: 'DeepSeek-R1 (reasoner)' },
    ],
  },
  {
    value: 'gemini',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    needsApiKey: true,
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    value: 'minimax',
    label: 'MiniMax',
    defaultModel: 'MiniMax-Text-01',
    defaultBaseUrl: 'https://api.minimaxi.chat/v1',
    needsApiKey: true,
    models: [
      { value: 'MiniMax-Text-01', label: 'MiniMax-Text-01' },
      { value: 'abab6.5s-chat', label: 'abab6.5s' },
    ],
  },
  {
    value: 'kimi',
    label: 'Kimi (Moonshot)',
    defaultModel: 'moonshot-v1-32k',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    needsApiKey: true,
    models: [
      { value: 'kimi-k2-0711-preview', label: 'Kimi K2' },
      { value: 'moonshot-v1-8k', label: 'Moonshot v1 8k' },
      { value: 'moonshot-v1-32k', label: 'Moonshot v1 32k' },
      { value: 'moonshot-v1-128k', label: 'Moonshot v1 128k' },
    ],
  },
  {
    value: 'glm',
    label: 'Zhipu GLM',
    defaultModel: 'glm-4-plus',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    needsApiKey: true,
    models: [
      { value: 'glm-4-plus', label: 'GLM-4-Plus' },
      { value: 'glm-4-flash', label: 'GLM-4-Flash' },
      { value: 'glm-4', label: 'GLM-4' },
    ],
  },
  {
    value: 'qwen',
    label: 'Alibaba Qwen',
    defaultModel: 'qwen-plus',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    needsApiKey: true,
    models: [
      { value: 'qwen-max', label: 'Qwen-Max' },
      { value: 'qwen-plus', label: 'Qwen-Plus' },
      { value: 'qwen-turbo', label: 'Qwen-Turbo' },
      { value: 'qwen2.5-72b-instruct', label: 'Qwen2.5 72B' },
    ],
  },
  {
    value: 'ollama',
    label: 'Ollama (yerel)',
    defaultModel: 'llama3.1',
    defaultBaseUrl: 'http://localhost:11434/v1',
    needsApiKey: false,
    models: [
      { value: 'llama3.1', label: 'Llama 3.1' },
      { value: 'qwen2.5', label: 'Qwen2.5' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'gemma2', label: 'Gemma 2' },
    ],
  },
]

// ── AI (text generation) ──
export interface AiTextResult {
  text: string
}

export interface AiDraftEmailRequest {
  /** Free-form context, e.g. the deal/contact situation + goal. */
  prompt: string
  contactId?: string | null
  tone?: 'formal' | 'friendly' | 'concise'
}

export interface AiSummarizeRequest {
  /** Summarize this opportunity's activities (server gathers them). */
  opportunityId?: string | null
  /** Or summarize arbitrary text. */
  text?: string
}

export interface AiScoreResult {
  /** 0–100 conversion likelihood. */
  score: number
  rationale: string
  nextAction: string
}

export interface AiScoreRequest {
  opportunityId: string
}
