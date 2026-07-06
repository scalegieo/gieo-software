import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { buildFullPlatformContext, storeSnapshotFromEngine } from '@/lib/aiContext'
import {
  tryLocalAction,
  parseEbonicsActions,
  executeEbonicsAction,
  executeEbonicsActions
} from '@/lib/ebonicsAgent'
import { parseEbonicsInput, AGENT_HELP } from '@/lib/ebonicsInput'
import { humanizeFridayReply, getFirstName } from '@/lib/fridayVoice'
import type { OllamaUsageSnapshot } from '@/hooks/useOllamaUsageTracker'

export interface EbonicsChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useEbonicsEngine(onUsageUpdate?: (u: OllamaUsageSnapshot) => void) {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useStore()

  const pageContext =
    location.pathname === '/leads'
      ? 'Lead Sheet'
      : location.pathname === '/clients'
        ? 'Clients'
        : location.pathname === '/crm'
          ? 'CRM Pipeline'
          : location.pathname === '/whiteboard'
            ? 'Whiteboard'
            : location.pathname === '/team'
              ? 'Team Stats'
              : location.pathname === '/tasks'
                ? 'Tasks'
                : 'Dashboard'

  const applyUsage = useCallback(
    (u?: OllamaUsageSnapshot | null) => {
      if (u && onUsageUpdate) onUsageUpdate(u)
    },
    [onUsageUpdate]
  )

  const firstName = getFirstName(store.profile)

  const platformContext = useCallback(() => {
    return buildFullPlatformContext(storeSnapshotFromEngine(store), pageContext)
  }, [store, pageContext])

  const callOllama = async (
    userMessage: string,
    history: EbonicsChatMessage[]
  ): Promise<string> => {
    if (!window.gieo) throw new Error('Desktop API unavailable')

    const priorMessages = history
      .filter((m, i) => m.role !== 'assistant' || i > 0)
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.content }))

    const result = await window.gieo.ollamaChat([
      { role: 'system', content: platformContext() },
      ...priorMessages,
      { role: 'user', content: userMessage }
    ])

    if (result.usageState) applyUsage(result.usageState)
    if (result.error) throw new Error(result.error)

    let reply = result.content ?? ''
    if (result.compressionNotice) reply = `${result.compressionNotice}\n\n${reply}`
    return humanizeFridayReply(reply, firstName)
  }

  const runAgentMode = async (body: string, history: EbonicsChatMessage[]): Promise<string> => {
    if (!body) return AGENT_HELP

    const usage = await window.gieo?.getOllamaUsage?.()
    if (usage?.isLimitReached) {
      return `Free tier limit exceeded. Reset at ${usage.resetAtMst}.`
    }

    const local = tryLocalAction(body)
    if (local) {
      const result = await executeEbonicsAction(store, local)
      if (result.navigateTo) navigate(result.navigateTo)
      return humanizeFridayReply(result.reply, firstName)
    }

    if (window.gieo?.ollamaParseAgent) {
      const ctx = platformContext()
      const result = await window.gieo.ollamaParseAgent(body, ctx)
      if (result.usageState) applyUsage(result.usageState)
      if (result.error) return result.error

      const actions = parseEbonicsActions(result.content ?? '')
      const actionable = actions.filter((a) => a.action !== 'none')

      if (actionable.length) {
        const exec = await executeEbonicsActions(store, actionable)
        if (exec.navigateTo) navigate(exec.navigateTo)
        return humanizeFridayReply(exec.reply, firstName)
      }

      const answerOnly = actions.find((a) => a.action === 'answer' && a.reply)
      if (answerOnly?.reply) return humanizeFridayReply(answerOnly.reply, firstName)
    }

    return callOllama(body, history)
  }

  const processMessage = async (raw: string, history: EbonicsChatMessage[]): Promise<string> => {
    const usage = await window.gieo?.getOllamaUsage?.()
    if (usage?.isLimitReached) {
      return `Daily Ollama free limit reached. FRIDAY resets at ${usage.resetAtMst}.`
    }

    const { mode, body } = parseEbonicsInput(raw)

    if (mode === 'agent') return runAgentMode(body, history)

    const local = tryLocalAction(body)
    if (local && local.action !== 'none') {
      const result = await executeEbonicsAction(store, local)
      if (result.navigateTo) navigate(result.navigateTo)
      return humanizeFridayReply(result.reply, firstName)
    }

    return callOllama(body, history)
  }

  return { processMessage, pageContext }
}
