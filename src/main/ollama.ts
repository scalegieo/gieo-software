import { GIEO_SECRETS } from './gieo-config'
import { compressMessagesForFreeTier } from './ollama-context'
import {
  OLLAMA_FREE_TIER,
  preflightOllamaRequest,
  recordOllamaUsage,
  getUsageSnapshot,
  type OllamaUsageState
} from './ollama-limits'
import {
  bootstrapOllama,
  refreshOllamaStatus,
  getOllamaBootState,
  cloudAuthHeaders,
  getActiveCloudApiKey,
  CLOUD_HOST,
  API_KEYS,
  type OllamaBootState
} from './ollama-bootstrap'

const CHAT_MODEL = GIEO_SECRETS.ollama.chatModel
const CHAT_FALLBACK = GIEO_SECRETS.ollama.chatModelFallback
const AGENT_MODEL = GIEO_SECRETS.ollama.agentModel

const ALLOWED_MODELS = new Set([
  CHAT_MODEL,
  CHAT_FALLBACK,
  AGENT_MODEL,
  'gemma4:31b',
  'gpt-oss:20b',
  'nemotron-3-nano:30b'
])

export interface OllamaChatUsage {
  promptTokens: number
  evalTokens: number
  totalTokens: number
}

export interface OllamaChatResult {
  content?: string
  error?: string
  errorCode?: string
  status?: number
  model?: string
  mode?: 'cloud'
  usage?: OllamaChatUsage
  usageState?: OllamaUsageState
  compressed?: boolean
  compressionNotice?: string
  throttled?: boolean
}

const AGENT_PARSE_SYSTEM = `FRIDAY CRM agent with LIVE data in next message. Reply RAW JSON only (no markdown).
Single action: {"action":"...", ...}  Multiple: [{"action":"..."},{"action":"..."}]

Actions:
- answer: {"action":"answer","reply":"..."} for read-only answers from LIVE data
- add_lead: name, company, phone?, email?, notes?, source?, budget?
- create_task: title, assignee?, client?, due_date?, priority?
- complete_task: task_id? or title?
- update_client: company or client_id, email?, phone?, notes?, name?
- update_scraped_lead: scraped_id? or company/name, phone?, email?, notes?, status?
- move_pipeline_lead: lead_id? or company/name, stage (new|contacted|meeting|won|lost)
- add_client: company, name?, mrr?, email?, phone?
- log_hours: company or client_id, hours, date?, notes?, category?
- add_note: company or client_id, notes or content, note_type? (internal|meeting)
- convert_lead: scraped_id? or company/name, mrr?
- search: query, scope? (all|clients|leads|tasks|scraped)
- get_client: company or client_id
- query_stats: no fields
- navigate: page (dashboard|tasks|crm|clients|leads|team|whiteboard)
- whiteboard_note: content or notes
- team_message: message
- none: if unclear

Use exact company names and ids from LIVE data. Prefer ids when available.`

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function ensureReady(): Promise<boolean> {
  const boot = getOllamaBootState()
  if (boot.ready) return true
  const next = await refreshOllamaStatus()
  return next.ready
}

async function cloudChatRequest(
  model: string,
  messages: { role: string; content: string }[],
  numPredict: number,
  usageKind: 'chat' | 'agent'
): Promise<OllamaChatResult> {
  if (!ALLOWED_MODELS.has(model)) {
    return { error: `Model ${model} not allowed on free tier`, errorCode: 'MODEL_BLOCKED' }
  }

  const pre = preflightOllamaRequest({ messages, numPredict })
  if (!pre.allowed) {
    return {
      error: pre.error,
      errorCode: pre.errorCode,
      usageState: getUsageSnapshot()
    }
  }

  const doFetch = async (apiKey: string): Promise<OllamaChatResult> => {
    const res = await fetch(`${CLOUD_HOST}/api/chat`, {
      method: 'POST',
      headers: cloudAuthHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(model.startsWith('gpt-oss') ? { think: 'low' } : {}),
        options: {
          num_predict: numPredict,
          temperature: 0.55,
          top_p: 0.92
        }
      }),
      signal: AbortSignal.timeout(120_000)
    })

    if (res.status === 429) {
      return { error: 'Ollama throttled (429)', status: 429, throttled: true }
    }

    if (res.status === 401 || res.status === 403) {
      return { error: 'Ollama API key rejected', status: res.status, errorCode: 'AUTH_FAILED' }
    }

    if (!res.ok) {
      const body = await res.text()
      let parsed: { error?: string } = {}
      try {
        parsed = JSON.parse(body) as { error?: string }
      } catch {
        /* plain text */
      }
      const msg = parsed.error || body || `Ollama error ${res.status}`
      const needsUpgrade = /subscription|upgrade|pro plan/i.test(msg)
      return {
        error: needsUpgrade
          ? 'That model needs Ollama Pro — FRIDAY uses free Level-1 models only.'
          : msg,
        status: res.status,
        errorCode: needsUpgrade ? 'SUBSCRIPTION_REQUIRED' : res.status === 429 ? 'THROTTLED' : undefined,
        throttled: res.status === 429
      }
    }

    const data = (await res.json()) as {
      message?: { content?: string }
      prompt_eval_count?: number
      eval_count?: number
    }

    const content = data.message?.content?.trim()
    if (!content) return { error: 'Empty response from Ollama Cloud' }

    const promptTokens = data.prompt_eval_count ?? Math.max(0, pre.estimated - numPredict)
    const evalTokens = data.eval_count ?? 0
    const totalTokens = promptTokens + evalTokens
    const usageState = recordOllamaUsage(totalTokens, usageKind)

    return {
      content,
      model,
      mode: 'cloud',
      usage: { promptTokens, evalTokens, totalTokens },
      usageState
    }
  }

  const tryKeys = async (): Promise<OllamaChatResult> => {
    const start = Math.max(0, (API_KEYS as readonly string[]).indexOf(getActiveCloudApiKey()))
    for (let i = 0; i < API_KEYS.length; i++) {
      const key = API_KEYS[(start + i) % API_KEYS.length]
      const result = await doFetch(key)
      if (result.errorCode !== 'AUTH_FAILED') return result
    }
    return { error: 'Ollama Cloud auth failed', errorCode: 'AUTH_FAILED' }
  }

  let result = await tryKeys()
  if (result.throttled) {
    await sleep(60_000)
    result = await tryKeys()
    if (result.throttled) {
      return {
        error: 'Ollama Free quota reached — resets every 5 hours & weekly. Try again soon.',
        errorCode: 'THROTTLED',
        throttled: true,
        usageState: getUsageSnapshot()
      }
    }
  }

  return result
}

async function chatWithModelFallback(
  messages: { role: string; content: string }[],
  numPredict: number,
  preferAgent: boolean
): Promise<OllamaChatResult> {
  const primary = preferAgent ? AGENT_MODEL : CHAT_MODEL
  const usageKind = preferAgent ? 'agent' : 'chat'
  const chain = [...new Set([primary, CHAT_FALLBACK, 'nemotron-3-nano:30b'])]

  let result: OllamaChatResult = { error: 'No model available' }
  for (const model of chain) {
    result = await cloudChatRequest(model, messages, numPredict, usageKind)
    if (result.content) return result
    if (
      result.errorCode === 'DAILY_LIMIT' ||
      result.errorCode === 'INSUFFICIENT_TOKENS' ||
      result.errorCode === 'THROTTLED' ||
      result.errorCode === 'AUTH_FAILED'
    ) {
      return result
    }
  }
  return result
}

export { bootstrapOllama } from './ollama-bootstrap'

export async function getOllamaStatus(): Promise<OllamaBootState> {
  return refreshOllamaStatus()
}

export async function getOllamaAccount(): Promise<{ plan: string; email: string; name: string } | null> {
  return { plan: 'cloud', email: 'ollama.com', name: 'Ollama Cloud' }
}

export function getOllamaUsage(): OllamaUsageState {
  return getUsageSnapshot()
}

export async function ollamaChat(
  messages: { role: string; content: string }[]
): Promise<OllamaChatResult> {
  const ready = await ensureReady()
  if (!ready) {
    const boot = getOllamaBootState()
    return {
      error: boot.message || 'Ollama Cloud not ready.',
      errorCode: boot.error ?? 'CLOUD_OFFLINE'
    }
  }

  const { messages: compressed, compressed: wasCompressed, notice } = compressMessagesForFreeTier(
    messages,
    { preserveSystem: true }
  )

  const result = await chatWithModelFallback(
    compressed,
    OLLAMA_FREE_TIER.defaultOutputTokens,
    false
  )

  return {
    ...result,
    compressed: wasCompressed,
    compressionNotice: notice
  }
}

export async function ollamaParseAgent(
  userMessage: string,
  platformContext?: string
): Promise<OllamaChatResult> {
  const snap = getUsageSnapshot()
  if (snap.isLimitReached) {
    return {
      error: `Free tier limit exceeded. Reset at ${snap.resetAtMst}.`,
      errorCode: 'DAILY_LIMIT',
      usageState: snap
    }
  }

  const ready = await ensureReady()
  if (!ready) {
    const boot = getOllamaBootState()
    return { error: boot.message || 'Ollama Cloud not ready.', errorCode: boot.error ?? 'CLOUD_OFFLINE' }
  }

  const dataBlock = platformContext
    ? platformContext.slice(0, 14_000)
    : ''

  const messages = [
    { role: 'system', content: AGENT_PARSE_SYSTEM },
    ...(dataBlock ? [{ role: 'system', content: `=== LIVE CRM DATA ===\n${dataBlock}` }] : []),
    { role: 'user', content: userMessage }
  ]

  return chatWithModelFallback(messages, OLLAMA_FREE_TIER.agentOutputTokens, true)
}

export async function ollamaParseLead(userMessage: string): Promise<OllamaChatResult> {
  return ollamaParseAgent(userMessage, 'Lead Sheet')
}

export { GIEO_SECRETS, getUsageSnapshot, getOllamaBootState }
