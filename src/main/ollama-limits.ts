import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/** Tracked free pool for UI + soft cap (Ollama Cloud also enforces 5h / weekly GPU limits) */
export const OLLAMA_FREE_TIER = {
  dailyTokenCap: 150_000,
  sessionWindowMs: 5 * 60 * 60 * 1000,
  weeklyWindowMs: 7 * 24 * 60 * 60 * 1000,
  contextWindowMax: 8192,
  maxRequestsPerMinute: 8,
  defaultOutputTokens: 320,
  agentOutputTokens: 256,
  historySummaryMaxTokens: 220
} as const

export type UsageWarningLevel = 'ok' | 'low' | 'critical' | 'blocked'

export interface OllamaUsageState {
  dailyTokenCount: number
  dailyTokenLimit: number
  chatTokenCount: number
  agentTokenCount: number
  remaining: number
  remainingPercent: number
  usedPercent: number
  isLimitReached: boolean
  usageDateMst: string
  lastResetTimestamp: number
  resetAtMst: string
  resetAtSession: string
  resetAtWeekly: string
  warningLevel: UsageWarningLevel
  requestsInLastMinute: number
}

interface PersistedUsage {
  dailyTokenCount: number
  chatTokenCount: number
  agentTokenCount: number
  usageDateMst: string
  lastResetTimestamp: number
  sessionAnchorMs: number
  weeklyAnchorMs: number
  isLimitReached: boolean
  recentRequestTimestamps: number[]
}

let storePath = ''
let state: PersistedUsage = {
  dailyTokenCount: 0,
  chatTokenCount: 0,
  agentTokenCount: 0,
  usageDateMst: '',
  lastResetTimestamp: 0,
  sessionAnchorMs: Date.now(),
  weeklyAnchorMs: Date.now(),
  isLimitReached: false,
  recentRequestTimestamps: []
}

const TZ = 'America/Denver'

export function initOllamaLimits(userDataPath: string): void {
  storePath = join(userDataPath, 'ollama-usage.json')
  if (!existsSync(userDataPath)) mkdirSync(userDataPath, { recursive: true })
  loadState()
  maybeResetMstDay()
  maybeResetSessionWindow()
  maybeResetWeeklyWindow()
}

function getMstDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function formatMstTime(date: Date): string {
  return date.toLocaleString(undefined, {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

function getMstMidnightTomorrow(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)

  return new Date(Date.UTC(y, m - 1, d + 1, 7, 0, 0))
}

function getMstMidnightTomorrowLabel(): string {
  return formatMstTime(getMstMidnightTomorrow())
}

function getNextSessionResetLabel(): string {
  const next = new Date(state.sessionAnchorMs + OLLAMA_FREE_TIER.sessionWindowMs)
  return formatMstTime(next)
}

function getNextWeeklyResetLabel(): string {
  const next = new Date(state.weeklyAnchorMs + OLLAMA_FREE_TIER.weeklyWindowMs)
  return formatMstTime(next)
}

function normalizeState(raw: Partial<PersistedUsage>): PersistedUsage {
  const daily = raw.dailyTokenCount ?? 0
  let chat = raw.chatTokenCount ?? 0
  let agent = raw.agentTokenCount ?? 0
  if (daily > 0 && chat === 0 && agent === 0) chat = daily
  const now = Date.now()
  return {
    dailyTokenCount: daily,
    chatTokenCount: chat,
    agentTokenCount: agent,
    usageDateMst: raw.usageDateMst ?? getMstDateString(),
    lastResetTimestamp: raw.lastResetTimestamp ?? now,
    sessionAnchorMs: raw.sessionAnchorMs ?? now,
    weeklyAnchorMs: raw.weeklyAnchorMs ?? now,
    isLimitReached: raw.isLimitReached ?? false,
    recentRequestTimestamps: raw.recentRequestTimestamps ?? []
  }
}

function loadState(): void {
  if (!storePath || !existsSync(storePath)) {
    state = normalizeState({})
    saveState()
    return
  }
  try {
    state = normalizeState(JSON.parse(readFileSync(storePath, 'utf-8')) as Partial<PersistedUsage>)
  } catch {
    state = normalizeState({})
  }
}

function saveState(): void {
  if (!storePath) return
  writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf-8')
}

export function maybeResetMstDay(): void {
  const today = getMstDateString()
  if (state.usageDateMst !== today) {
    state = {
      ...state,
      dailyTokenCount: 0,
      chatTokenCount: 0,
      agentTokenCount: 0,
      usageDateMst: today,
      lastResetTimestamp: Date.now(),
      isLimitReached: false,
      recentRequestTimestamps: []
    }
    saveState()
  }
}

export function maybeResetSessionWindow(): void {
  const now = Date.now()
  if (now - state.sessionAnchorMs >= OLLAMA_FREE_TIER.sessionWindowMs) {
    state.sessionAnchorMs = now
    if (state.isLimitReached) state.isLimitReached = false
    saveState()
  }
}

export function maybeResetWeeklyWindow(): void {
  const now = Date.now()
  if (now - state.weeklyAnchorMs >= OLLAMA_FREE_TIER.weeklyWindowMs) {
    state.weeklyAnchorMs = now
    saveState()
  }
}

function refreshAllWindows(): void {
  maybeResetMstDay()
  maybeResetSessionWindow()
  maybeResetWeeklyWindow()
}

function warningLevel(remainingPercent: number, limitReached: boolean): UsageWarningLevel {
  if (limitReached || remainingPercent <= 0) return 'blocked'
  if (remainingPercent < 5) return 'critical'
  if (remainingPercent < 15) return 'low'
  return 'ok'
}

export function getUsageSnapshot(): OllamaUsageState {
  refreshAllWindows()

  const limit = OLLAMA_FREE_TIER.dailyTokenCap
  const remaining = Math.max(0, limit - state.dailyTokenCount)
  const remainingPercent = Math.round((remaining / limit) * 100)
  const usedPercent = Math.round((state.dailyTokenCount / limit) * 100)
  const limitReached = state.isLimitReached || remaining <= 0

  return {
    dailyTokenCount: state.dailyTokenCount,
    dailyTokenLimit: limit,
    chatTokenCount: state.chatTokenCount,
    agentTokenCount: state.agentTokenCount,
    remaining,
    remainingPercent,
    usedPercent,
    isLimitReached: limitReached,
    usageDateMst: state.usageDateMst,
    lastResetTimestamp: state.lastResetTimestamp,
    resetAtMst: getMstMidnightTomorrowLabel(),
    resetAtSession: getNextSessionResetLabel(),
    resetAtWeekly: getNextWeeklyResetLabel(),
    warningLevel: warningLevel(remainingPercent, limitReached),
    requestsInLastMinute: pruneRateWindow().length
  }
}

function pruneRateWindow(): number[] {
  const now = Date.now()
  state.recentRequestTimestamps = state.recentRequestTimestamps.filter((t) => now - t < 60_000)
  return state.recentRequestTimestamps
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 3.5))
}

export function estimateMessagesTokens(messages: { role: string; content: string }[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0)
}

export function preflightOllamaRequest(input: {
  messages: { role: string; content: string }[]
  numPredict: number
}): { allowed: boolean; error?: string; errorCode?: string; estimated: number } {
  refreshAllWindows()

  if (state.isLimitReached || state.dailyTokenCount >= OLLAMA_FREE_TIER.dailyTokenCap) {
    const snap = getUsageSnapshot()
    return {
      allowed: false,
      error: `Free pool used up. Daily reset ${snap.resetAtMst}. Session refresh ${snap.resetAtSession}.`,
      errorCode: 'DAILY_LIMIT',
      estimated: 0
    }
  }

  const inputTokens = estimateMessagesTokens(input.messages)
  if (inputTokens + input.numPredict > OLLAMA_FREE_TIER.contextWindowMax) {
    return {
      allowed: false,
      error: `Request exceeds ${OLLAMA_FREE_TIER.contextWindowMax} token context window.`,
      errorCode: 'CONTEXT_OVERFLOW',
      estimated: inputTokens
    }
  }

  const estimated = inputTokens + input.numPredict
  const remaining = OLLAMA_FREE_TIER.dailyTokenCap - state.dailyTokenCount
  if (estimated > remaining) {
    return {
      allowed: false,
      error: `Estimated ${estimated} tokens but only ${remaining} remain today.`,
      errorCode: 'INSUFFICIENT_TOKENS',
      estimated
    }
  }

  const recent = pruneRateWindow()
  if (recent.length >= OLLAMA_FREE_TIER.maxRequestsPerMinute) {
    return {
      allowed: false,
      error: 'Rate limit: max 8 requests per minute on free tier.',
      errorCode: 'RATE_LIMIT',
      estimated
    }
  }

  return { allowed: true, estimated }
}

export function recordOllamaUsage(
  actualTokens: number,
  kind: 'chat' | 'agent' = 'chat'
): OllamaUsageState {
  refreshAllWindows()
  state.dailyTokenCount += actualTokens
  if (kind === 'agent') state.agentTokenCount += actualTokens
  else state.chatTokenCount += actualTokens
  state.recentRequestTimestamps.push(Date.now())
  state.isLimitReached = state.dailyTokenCount >= OLLAMA_FREE_TIER.dailyTokenCap
  saveState()
  return getUsageSnapshot()
}

export function buildLimitError(resetAt: string): string {
  return `Free tier limit exceeded. Reset at ${resetAt}.`
}
