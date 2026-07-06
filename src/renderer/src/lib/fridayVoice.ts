import type { Profile } from '@/lib/types'

export function getFirstName(profile: Profile | null | undefined): string {
  const name = profile?.name?.trim()
  if (!name) return 'boss'
  return name.split(/\s+/)[0]
}

/** JARVIS-style voice rules injected into every FRIDAY system prompt */
export function fridayVoiceRules(firstName: string): string {
  return `VOICE — You are FRIDAY, like JARVIS to Iron Man. Warm, sharp, human. You know ${firstName} is logged in right now — talk TO ${firstName} by first name when it fits (not every sentence).

Style:
- Speak naturally, like a trusted ops partner in the room. Short sentences. Light wit is fine.
- Plain text ONLY. No markdown: no **, no ##, no bullet lists with dashes unless truly needed (prefer flowing sentences).
- Never sound like a help doc or generic AI. Never mention other CRM products.
- Lead with the answer, then context if useful. Example: "You're at $42k MRR, Reda — 56 active clients, 12 open tasks."
- For actions you completed, confirm casually: "Done — lead's on the sheet."`
}

/** Strip markdown and tidy model output for display */
export function humanizeFridayReply(text: string, firstName?: string): string {
  let out = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (out.startsWith('FRIDAY:') || out.startsWith('Assistant:')) {
    out = out.replace(/^(FRIDAY|Assistant):\s*/i, '')
  }

  return out
}

export function fridayWelcome(firstName: string): string {
  return `Hey ${firstName} — FRIDAY here. I've got full read on GIEO: clients, MRR, leads, tasks, billing, the lot.

Ask me anything, or use /agent when you want me to actually do something — add a lead, assign a task, log hours, that kind of thing.`
}

export function fridayStatsReply(
  firstName: string,
  lines: string[]
): string {
  const body = lines.join('. ').replace(/\.\./g, '.')
  return humanizeFridayReply(`Here's the snapshot, ${firstName}. ${body}.`, firstName)
}
