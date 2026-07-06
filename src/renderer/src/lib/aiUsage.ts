import { supabase } from './supabase'
import { CONFIG } from './config'

export interface AiUsageSnapshot {
  plan: string
  email?: string
  dailyRequests: number
  dailyRequestLimit: number
  dailyRequestsRemaining: number
  weeklyRequests: number
  weeklyRequestLimit: number
  weeklyRequestsRemaining: number
  dailyTokens: number
  dailyTokenLimit: number
  dailyTokensRemaining: number
  usageDate: string
  dailyRequestPct: number
  weeklyRequestPct: number
}

function limitsForPlan(plan: string): {
  dailyRequests: number
  weeklyRequests: number
  dailyTokens: number
} {
  const base = CONFIG.ollama.freeLimits
  const multiplier = plan === 'free' ? 1 : 50
  return {
    dailyRequests: base.dailyRequests * multiplier,
    weeklyRequests: base.weeklyRequests * multiplier,
    dailyTokens: base.dailyTokens * multiplier
  }
}

export function buildUsageSnapshot(input: {
  plan: string
  email?: string
  dailyRequests: number
  weeklyRequests: number
  dailyTokens: number
}): AiUsageSnapshot {
  const limits = limitsForPlan(input.plan)
  const dailyRequestPct = Math.min(100, (input.dailyRequests / limits.dailyRequests) * 100)
  const weeklyRequestPct = Math.min(100, (input.weeklyRequests / limits.weeklyRequests) * 100)

  return {
    plan: input.plan,
    email: input.email,
    dailyRequests: input.dailyRequests,
    dailyRequestLimit: limits.dailyRequests,
    dailyRequestsRemaining: Math.max(0, limits.dailyRequests - input.dailyRequests),
    weeklyRequests: input.weeklyRequests,
    weeklyRequestLimit: limits.weeklyRequests,
    weeklyRequestsRemaining: Math.max(0, limits.weeklyRequests - input.weeklyRequests),
    dailyTokens: input.dailyTokens,
    dailyTokenLimit: limits.dailyTokens,
    dailyTokensRemaining: Math.max(0, limits.dailyTokens - input.dailyTokens),
    usageDate: new Date().toISOString().slice(0, 10),
    dailyRequestPct,
    weeklyRequestPct
  }
}

export async function fetchTeamAiUsage(): Promise<{
  dailyRequests: number
  weeklyRequests: number
  dailyTokens: number
}> {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

  const { data: todayRow } = await supabase
    .from('ai_usage_daily')
    .select('request_count, token_count')
    .eq('usage_date', today)
    .maybeSingle()

  const { data: weekRows } = await supabase
    .from('ai_usage_daily')
    .select('request_count')
    .gte('usage_date', weekAgo)

  return {
    dailyRequests: todayRow?.request_count ?? 0,
    weeklyRequests: (weekRows ?? []).reduce((sum, row) => sum + (row.request_count ?? 0), 0),
    dailyTokens: todayRow?.token_count ?? 0
  }
}

export async function recordTeamAiUsage(tokens: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('ai_usage_daily')
    .select('request_count, token_count')
    .eq('usage_date', today)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('ai_usage_daily')
      .update({
        request_count: (existing.request_count ?? 0) + 1,
        token_count: (existing.token_count ?? 0) + tokens,
        updated_at: new Date().toISOString()
      })
      .eq('usage_date', today)
  } else {
    await supabase.from('ai_usage_daily').insert({
      usage_date: today,
      request_count: 1,
      token_count: tokens
    })
  }
}

export async function refreshAiUsageSnapshot(): Promise<AiUsageSnapshot | null> {
  if (!window.gieo?.getOllamaAccount) return null

  const [account, team] = await Promise.all([
    window.gieo.getOllamaAccount(),
    fetchTeamAiUsage()
  ])

  if (!account) return null

  return buildUsageSnapshot({
    plan: account.plan,
    email: account.email,
    dailyRequests: team.dailyRequests,
    weeklyRequests: team.weeklyRequests,
    dailyTokens: team.dailyTokens
  })
}
