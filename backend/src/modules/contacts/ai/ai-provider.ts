// Pluggable AI provider layer. One `runAi()` entry point dispatches to the
// right vendor adapter based on the configured provider. Adding a new agent =
// add it to AI_PROVIDERS (shared) + (if not OpenAI-compatible) a branch here.

import { AI_PROVIDERS, type AiProvider } from '@turbohesap/shared'

export interface AiConfig {
  provider?: string
  apiKey?: string
  model?: string
  baseUrl?: string
}

// Optional env fallbacks per provider (so keys can live in the environment).
const ENV_KEYS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  gemini: 'GEMINI_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  kimi: 'MOONSHOT_API_KEY',
  glm: 'ZHIPU_API_KEY',
  qwen: 'DASHSCOPE_API_KEY',
  ollama: '',
}

function info(provider: AiProvider) {
  return AI_PROVIDERS.find((p) => p.value === provider) ?? AI_PROVIDERS[0]
}

export function resolveAi(config: AiConfig): {
  provider: AiProvider
  apiKey: string
  model: string
  baseUrl: string
  needsApiKey: boolean
} {
  const provider = (config.provider as AiProvider) || 'anthropic'
  const meta = info(provider)
  const envKey = ENV_KEYS[provider] ? process.env[ENV_KEYS[provider]] : undefined
  return {
    provider,
    apiKey: config.apiKey || envKey || '',
    model: config.model || meta.defaultModel,
    baseUrl: (config.baseUrl || meta.defaultBaseUrl).replace(/\/$/, ''),
    needsApiKey: meta.needsApiKey,
  }
}

/** Run a single-prompt completion against the configured provider. */
export async function runAi(config: AiConfig, prompt: string, maxTokens: number): Promise<string> {
  const r = resolveAi(config)
  if (r.needsApiKey && !r.apiKey) {
    throw new Error(`${r.provider} için API anahtarı yapılandırılmamış`)
  }
  // Reasoning models (e.g. deepseek-reasoner) spend the token budget on hidden
  // reasoning before emitting the answer — give them generous headroom so the
  // visible content isn't truncated to empty.
  const isReasoner = /reason|think|o\d|-r\d/i.test(r.model)
  let budget = isReasoner ? Math.max(maxTokens, 4000) : maxTokens

  // Some providers intermittently return an empty `content` (200 OK). Retry a
  // couple of times, escalating the token budget, before giving up.
  for (let attempt = 0; attempt < 3; attempt++) {
    let out: string
    switch (r.provider) {
      case 'anthropic':
        out = await anthropic(r, prompt, budget)
        break
      case 'gemini':
        out = await gemini(r, prompt, budget)
        break
      default:
        out = await openaiCompatible(r, prompt, budget)
    }
    if (out.trim()) return out
    budget = Math.min(budget * 2, 8000)
  }
  throw new Error(
    'AI boş yanıt döndürdü. Modeli kontrol edin (muhakeme/reasoner modelleri daha çok jeton ister) veya tekrar deneyin.',
  )
}

type Resolved = ReturnType<typeof resolveAi>

async function anthropic(r: Resolved, prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(`${r.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': r.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: r.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic hatası: ${res.status} ${await safeText(res)}`)
  const j = (await res.json()) as { content?: { text: string }[] }
  return j.content?.map((c) => c.text).join('') ?? ''
}

async function gemini(r: Resolved, prompt: string, maxTokens: number): Promise<string> {
  const url = `${r.baseUrl}/models/${r.model}:generateContent?key=${encodeURIComponent(r.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })
  if (!res.ok) throw new Error(`Gemini hatası: ${res.status} ${await safeText(res)}`)
  const j = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
}

// OpenAI-compatible /chat/completions (openai, deepseek, minimax, kimi, glm, qwen, ollama).
async function openaiCompatible(r: Resolved, prompt: string, maxTokens: number): Promise<string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (r.apiKey) headers.authorization = `Bearer ${r.apiKey}`
  const res = await fetch(`${r.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: r.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`${r.provider} hatası: ${res.status} ${await safeText(res)}`)
  const j = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  // Return ONLY the final answer (content). Never surface a reasoner's
  // `reasoning_content` (its private chain-of-thought) — that is not the message.
  return j.choices?.[0]?.message?.content ?? ''
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200)
  } catch {
    return ''
  }
}
