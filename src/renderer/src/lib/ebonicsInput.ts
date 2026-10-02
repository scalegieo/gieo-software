/** `/agent` = full CRM access (read + act). Plain text = read-only chat with same data. */
export function parseEbonicsInput(raw: string): { mode: 'chat' | 'agent'; body: string } {
  const trimmed = raw.trim()
  if (/^\/agent\b/i.test(trimmed)) {
    return { mode: 'agent', body: trimmed.replace(/^\/agent\s*/i, '').trim() }
  }
  return { mode: 'chat', body: trimmed }
}

export const AGENT_HELP = `FRIDAY agent mode — full CRM access.

Read (works in chat too):
• "What's our MRR?" · "Who has billing due?" · "List open tasks for Sulay"

Act (use /agent):
• /agent add lead Sarah at Acme, sarah@acme.com
• /agent assign task to Sulay: homepage mockups by Friday
• /agent move Acme Dental to meeting stage
• /agent log 2 hours for Acme — strategy call
• /agent search dental clients
• /agent get client Acme Corp
• /agent complete task homepage mockups
• /agent add note for Acme: wants new landing page
• /agent go to whiteboard

Normal chat (no /agent) still reads all CRM data — use /agent to change things.`
