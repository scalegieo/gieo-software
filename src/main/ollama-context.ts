import { OLLAMA_FREE_TIER, estimateTokens } from './ollama-limits'

const COMPACT_TAIL =
  '\n\nVOICE: JARVIS-style — warm, human, plain text only (no ** or markdown). Use the logged-in user\'s first name naturally. GIEO data only — never other CRMs.'

/** Keep CRM system prompt; trim middle sections if over token budget */
function trimSystemPrompt(content: string, maxTokens: number): string {
  if (estimateTokens(content) <= maxTokens) return content

  const snapshotMatch = content.match(/=== SNAPSHOT ===[\s\S]*?(?=\n===|$)/)
  const userMatch = content.match(/=== USER ===[\s\S]*?(?=\n===|$)/)
  const snapshot = snapshotMatch?.[0] ?? ''
  const user = userMatch?.[0] ?? ''

  const header = content.split('=== SNAPSHOT ===')[0]?.trim() ?? content.slice(0, 400)
  const compact = `${header}\n\n${user}\n\n${snapshot}${COMPACT_TAIL}`

  if (estimateTokens(compact) <= maxTokens) return compact

  return `${header.slice(0, 800)}\n\n${snapshot.slice(0, 1200)}${COMPACT_TAIL}`
}

export function compressMessagesForFreeTier(
  messages: { role: string; content: string }[],
  options: { preserveSystem?: boolean; maxHistoryTokens?: number; maxSystemTokens?: number } = {}
): { messages: { role: string; content: string }[]; compressed: boolean; notice?: string } {
  const maxHistory = options.maxHistoryTokens ?? OLLAMA_FREE_TIER.historySummaryMaxTokens
  const maxSystem = options.maxSystemTokens ?? 6000
  const preserveSystem = options.preserveSystem !== false
  let compressed = false
  let notice: string | undefined

  const system = messages.find((m) => m.role === 'system')
  const nonSystem = messages.filter((m) => m.role !== 'system')
  const lastUser = [...nonSystem].reverse().find((m) => m.role === 'user')
  if (!lastUser) {
    return { messages, compressed: false }
  }

  const prior = nonSystem.filter((m) => m !== lastUser)
  let historyBlock = prior
    .slice(-4)
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join('\n')

  if (estimateTokens(historyBlock) > maxHistory) {
    historyBlock = prior
      .slice(-2)
      .map((m) => `${m.role}: ${m.content.slice(0, 100)}`)
      .join('\n')
    compressed = true
    notice = 'Context compressed to stretch your daily token budget.'
  }

  let systemContent = preserveSystem && system?.content
    ? trimSystemPrompt(system.content, maxSystem)
    : 'FRIDAY GIEO CRM assistant. Answer from provided data only.'

  if (preserveSystem && system?.content && systemContent !== system.content) {
    compressed = true
    notice = notice ?? 'CRM context trimmed to fit token budget.'
  }

  const assembled: { role: string; content: string }[] = [
    { role: 'system', content: systemContent }
  ]

  if (historyBlock.trim()) {
    assembled.push({
      role: 'user',
      content: `[Prior conversation summary]\n${historyBlock}\n\n[Current question]\n${lastUser.content}`
    })
  } else {
    assembled.push({ role: 'user', content: lastUser.content })
  }

  const totalEst =
    estimateTokens(assembled[0].content) + estimateTokens(assembled[assembled.length - 1].content)
  if (totalEst + OLLAMA_FREE_TIER.defaultOutputTokens > OLLAMA_FREE_TIER.contextWindowMax) {
    assembled[assembled.length - 1] = {
      role: 'user',
      content: lastUser.content.slice(0, 800)
    }
    compressed = true
    notice = 'Context compressed to stretch your daily token budget.'
  }

  return { messages: assembled, compressed, notice }
}
