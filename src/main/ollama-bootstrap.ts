import { GIEO_SECRETS } from './gieo-config'

const CLOUD_HOST = GIEO_SECRETS.ollama.cloudHost
const CHAT_MODEL = GIEO_SECRETS.ollama.chatModel
const AGENT_MODEL = GIEO_SECRETS.ollama.agentModel
const API_KEYS = GIEO_SECRETS.ollama.apiKeys

export type OllamaBootPhase =
  | 'idle'
  | 'starting_server'
  | 'pulling_chat_model'
  | 'pulling_agent_model'
  | 'warming'
  | 'ready'
  | 'error'

export interface OllamaBootState {
  phase: OllamaBootPhase
  message: string
  ready: boolean
  modelLoaded: boolean
  chatModelLoaded: boolean
  agentModelLoaded: boolean
  warming: boolean
  mode: 'cloud'
  model: string
  error?: string
}

const READY: OllamaBootState = {
  phase: 'ready',
  message: 'FRIDAY ready',
  ready: true,
  modelLoaded: true,
  chatModelLoaded: true,
  agentModelLoaded: true,
  warming: false,
  mode: 'cloud',
  model: CHAT_MODEL
}

let bootState: OllamaBootState = {
  ...READY,
  phase: 'idle',
  message: 'Connecting…',
  ready: false,
  modelLoaded: false,
  chatModelLoaded: false,
  agentModelLoaded: false,
  warming: true
}

let bootstrapPromise: Promise<OllamaBootState> | null = null
let activeApiKeyIndex = 0

export function getOllamaBootState(): OllamaBootState {
  return bootState
}

export function getActiveCloudApiKey(): string {
  return API_KEYS[activeApiKeyIndex] ?? API_KEYS[0]
}

export function cloudAuthHeaders(key = getActiveCloudApiKey()): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`
  }
}

async function pingCloud(): Promise<boolean> {
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i]
    try {
      const res = await fetch(`${CLOUD_HOST}/api/tags`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(6000)
      })
      if (res.ok) {
        activeApiKeyIndex = i
        return true
      }
    } catch {
      /* try next key */
    }
  }
  return false
}

async function runBootstrap(): Promise<OllamaBootState> {
  bootState = {
    ...bootState,
    phase: 'starting_server',
    message: 'Connecting to Ollama Cloud…',
    warming: true,
    ready: false,
    error: undefined
  }

  const online = await pingCloud()
  if (!online) {
    bootState = {
      ...bootState,
      phase: 'error',
      message: 'Ollama Cloud unreachable — retrying…',
      error: 'CLOUD_OFFLINE',
      warming: true,
      ready: false,
      modelLoaded: false,
      chatModelLoaded: false,
      agentModelLoaded: false
    }
    return bootState
  }

  bootState = { ...READY }
  return bootState
}

export function resetOllamaBootState(): void {
  bootstrapPromise = null
}

/** Instant cloud connect on app open — no local Ollama */
export function autoBootOllamaOnLaunch(): void {
  resetOllamaBootState()
  void bootstrapOllama(true)
}

export function bootstrapOllama(force = false): Promise<OllamaBootState> {
  if (!force && bootState.ready) return Promise.resolve(bootState)
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = runBootstrap()
    .catch(() => {
      bootState = {
        ...bootState,
        phase: 'error',
        message: 'Cloud connection failed — retrying…',
        error: 'BOOT_FAILED',
        warming: true,
        ready: false
      }
      return bootState
    })
    .finally(() => {
      bootstrapPromise = null
    })

  return bootstrapPromise
}

export async function refreshOllamaStatus(): Promise<OllamaBootState> {
  if (bootstrapPromise) return bootstrapPromise

  const online = await pingCloud()
  if (online) {
    bootState = { ...READY }
    return bootState
  }

  if (!bootState.ready) return bootstrapOllama(true)
  return bootState
}

export { CLOUD_HOST, CHAT_MODEL, AGENT_MODEL, API_KEYS }
