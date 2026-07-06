import type { ScrapedLead } from '@/lib/types'

export interface LeadAction {
  action: 'add_lead' | 'none'
  name?: string
  company?: string
  phone?: string
  email?: string
  notes?: string
  source?: string
}

const LEAD_INTENT =
  /\b(add|create|log|save|enter|put|new)\b[\s\S]{0,40}\b(lead|prospect|contact)\b|\b(lead|prospect)\b[\s\S]{0,20}\b(for|named|called|from)\b/i

export function looksLikeAddLead(message: string): boolean {
  const m = message.trim()
  if (LEAD_INTENT.test(m)) return true
  if (/\badd\b/i.test(m) && (/@|\d{3}|email|phone|\.com/i.test(m))) return true
  return false
}

export function parseLeadAction(raw: string): LeadAction | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = fenced ?? raw.match(/\{[\s\S]*"action"[\s\S]*\}/)?.[0]
  if (!candidate) return null

  try {
    const parsed = JSON.parse(candidate.trim()) as LeadAction
    if (parsed.action !== 'add_lead' && parsed.action !== 'none') return null
    return parsed
  } catch {
    return null
  }
}

export function leadActionToInput(action: LeadAction): Omit<ScrapedLead, 'id' | 'scraped_at'> | null {
  if (action.action !== 'add_lead') return null

  const name = (action.name ?? '').trim()
  const company = (action.company ?? '').trim()
  const phone = (action.phone ?? '').trim()
  const email = (action.email ?? '').trim()
  const notes = (action.notes ?? '').trim()

  if (!name && !company && !phone && !email) return null

  return {
    name: name || company || 'Unknown',
    company: company || name || '—',
    phone,
    email,
    notes,
    source: action.source?.trim() || 'GIEO AI',
    status: 'new'
  }
}

export function formatLeadAddedReply(action: LeadAction): string {
  const parts = [
    action.name && `Name: ${action.name}`,
    action.company && `Company: ${action.company}`,
    action.phone && `Phone: ${action.phone}`,
    action.email && `Email: ${action.email}`,
    action.notes && `Notes: ${action.notes}`
  ].filter(Boolean)

  return `Lead added to Lead Sheet.\n${parts.join('\n')}\n\nView it under Leads → CRM Leads tab.`
}
