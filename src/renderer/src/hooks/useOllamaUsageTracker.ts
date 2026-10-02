import { useState, useEffect, useCallback } from 'react'

export type UsageWarningLevel = 'ok' | 'low' | 'critical' | 'blocked'

export interface OllamaUsageSnapshot {
  dailyTokenCount: number
  dailyTokenLimit: number
  chatTokenCount: number
  agentTokenCount: number
  remaining: number
  remainingPercent: number
  usedPercent: number
  isLimitReached: boolean
  usageDateMst: string
  resetAtMst: string
  resetAtSession: string
  resetAtWeekly: string
  warningLevel: UsageWarningLevel
  requestsInLastMinute: number
}

const DEFAULT: OllamaUsageSnapshot = {
  dailyTokenCount: 0,
  dailyTokenLimit: 150_000,
  chatTokenCount: 0,
  agentTokenCount: 0,
  remaining: 150_000,
  remainingPercent: 100,
  usedPercent: 0,
  isLimitReached: false,
  usageDateMst: '',
  resetAtMst: '',
  resetAtSession: '',
  resetAtWeekly: '',
  warningLevel: 'ok',
  requestsInLastMinute: 0
}

export function useOllamaUsageTracker(active: boolean): {
  usage: OllamaUsageSnapshot
  refresh: () => Promise<void>
  applyUsageState: (state?: OllamaUsageSnapshot | null) => void
} {
  const [usage, setUsage] = useState<OllamaUsageSnapshot>(DEFAULT)

  const refresh = useCallback(async () => {
    if (!window.gieo?.getOllamaUsage) return
    const snap = await window.gieo.getOllamaUsage()
    if (snap) setUsage(snap as OllamaUsageSnapshot)
  }, [])

  const applyUsageState = useCallback((state?: OllamaUsageSnapshot | null) => {
    if (state) setUsage(state)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!active) return
    void refresh()
    const interval = setInterval(() => void refresh(), 5000)
    return () => clearInterval(interval)
  }, [active, refresh])

  return { usage, refresh, applyUsageState }
}
