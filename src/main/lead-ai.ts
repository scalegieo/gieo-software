import { ollamaStructured, type OllamaChatResult } from './ollama'

export interface BusinessProfileInput {
  id: string
  name: string
  pitch: string
  idealCustomer: string
  services: { name: string; priceRange: string }[]
}

export interface LeadInput {
  businessName: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  industry?: string | null
  category?: string | null
  description?: string | null
  googleRating?: number | null
  reviewCount?: number | null
  hours?: string | null
  socialMedia?: Record<string, string>
  techStack?: string[]
  websiteQuality?: number | null
  hasWebsite?: boolean
  verificationChecks?: { label: string; pass: boolean; detail: string }[]
  qualityNotes?: string[]
  notes?: string | null
}

export interface LeadAnalysis {
  verification: {
    verified: boolean
    confidence: number
    flags: string[]
    corrections: Partial<Record<'business_name' | 'phone' | 'email' | 'website' | 'city' | 'state' | 'industry', string>>
  }
  summary: string
  industry: string
  employeeEstimate: string
  strengths: string[]
  weaknesses: string[]
  onlinePresenceScore: number
  estimatedRevenue: string
  competitivePosition: string
  urgency: 'low' | 'medium' | 'high'
  urgencyReason: string
  services: { name: string; priority: 'high' | 'medium' | 'low'; reason: string; estimatedValue: string; pitchAngle: string }[]
  score: { total: number; budget: number; need: number; accessibility: number; timing: number; fit: number; reasoning: string }
}

export interface CallScriptOptions {
  scriptType: 'cold_call' | 'follow_up' | 'discovery' | 'closing'
  tone: 'professional' | 'casual' | 'friendly' | 'urgent'
  offering: string
  companyName: string
  callerName: string
}

export interface GeneratedCallScript {
  title: string
  opener: string
  intro: string
  valueProp: string
  questions: string[]
  pitch: string
  socialProof: string
  objections: { objection: string; response: string }[]
  close: string
  voicemail: string
  followUpEmail: { subject: string; body: string }
  talkingPoints: string[]
}

export type AiResult<T> = { data: T; error?: undefined; errorCode?: undefined } | { data?: undefined; error: string; errorCode?: string }

function parseJson<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = typeof n === 'number' ? n : parseFloat(String(n))
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
}
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v.trim() : fallback)
const strList = (v: unknown, max = 6): string[] =>
  Array.isArray(v) ? v.map((x) => str(typeof x === 'string' ? x : (x as { text?: string })?.text)).filter(Boolean).slice(0, max) : []
const level = <T extends string>(v: unknown, allowed: T[], fallback: T): T => {
  const s = str(v).toLowerCase() as T
  return allowed.includes(s) ? s : fallback
}

function friendlyError(result: OllamaChatResult): string {
  switch (result.errorCode) {
    case 'DAILY_LIMIT':
    case 'INSUFFICIENT_TOKENS':
      return `Free AI pool used up for now. ${result.error ?? ''}`.trim()
    case 'THROTTLED':
      return 'Ollama free quota is resting — try again in a few minutes.'
    case 'RATE_LIMIT':
      return 'Too many AI requests this minute — wait a moment.'
    case 'AUTH_FAILED':
      return 'AI service rejected the API key.'
    case 'CLOUD_OFFLINE':
      return 'Can’t reach the AI service — check your internet.'
    default:
      return result.error || 'AI request failed.'
  }
}

function leadBlock(lead: LeadInput): string {
  const lines = [
    `Business: ${lead.businessName}`,
    lead.category && `Category: ${lead.category}`,
    lead.industry && `Industry: ${lead.industry}`,
    lead.address && `Address: ${lead.address}`,
    !lead.address && (lead.city || lead.state) && `Location: ${[lead.city, lead.state].filter(Boolean).join(', ')}`,
    `Phone: ${lead.phone || 'none'}`,
    `Email: ${lead.email || 'none'}`,
    `Website: ${lead.website || 'NONE'}`,
    lead.websiteQuality != null && `Website quality: ${lead.websiteQuality}/100`,
    lead.qualityNotes?.length && `Website audit: ${lead.qualityNotes.join('; ')}`,
    lead.techStack?.length && `Tech on site: ${lead.techStack.join(', ')}`,
    `Social: ${Object.keys(lead.socialMedia ?? {}).join(', ') || 'none found'}`,
    lead.googleRating != null && `Rating: ${lead.googleRating}★ from ${lead.reviewCount ?? 0} reviews`,
    lead.hours && `Hours: ${lead.hours.slice(0, 160)}`,
    lead.description && `Description: ${lead.description.slice(0, 300)}`,
    lead.verificationChecks?.length &&
      `Automated checks: ${lead.verificationChecks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.label} (${c.detail})`).join('; ')}`,
    lead.notes && `Our notes: ${lead.notes.slice(0, 300)}`
  ]
  return lines.filter(Boolean).join('\n')
}

function profileBlock(profile: BusinessProfileInput): string {
  return [
    `We are ${profile.name}: ${profile.pitch}`,
    `Ideal customer: ${profile.idealCustomer}`,
    `Services we sell (only recommend from this list):`,
    ...profile.services.map((s) => `- ${s.name} (${s.priceRange})`)
  ].join('\n')
}

const ANALYSIS_SCHEMA = `{
 "verification": {"verified": true|false, "confidence": 0-100, "flags": ["red flags"], "corrections": {"phone"?: "", "email"?: "", "website"?: "", "business_name"?: "", "city"?: "", "state"?: "", "industry"?: ""}},
 "summary": "2-3 sentences about the business",
 "industry": "short industry label",
 "employee_estimate": "e.g. 1-10",
 "strengths": ["..."], "weaknesses": ["..."],
 "online_presence_score": 1-10,
 "estimated_revenue": "e.g. $500K-$1M/yr",
 "competitive_position": "1 sentence",
 "urgency": "low|medium|high", "urgency_reason": "1 sentence",
 "services": [{"name": "exact service from our list", "priority": "high|medium|low", "reason": "why THEY need it, cite evidence", "estimated_value": "$X-$Y/mo or one-time", "pitch_angle": "1 sentence hook"}],
 "score": {"budget": 0-20, "need": 0-20, "accessibility": 0-20, "timing": 0-20, "fit": 0-20, "reasoning": "1-2 sentences"}
}`

export async function analyzeLead(lead: LeadInput, profile: BusinessProfileInput): Promise<AiResult<LeadAnalysis>> {
  const messages = [
    {
      role: 'system',
      content: `You are a sharp B2B lead analyst for a sales team. Judge leads strictly from evidence given. Return ONLY JSON matching this schema:\n${ANALYSIS_SCHEMA}\nRules: verified=false if the business looks fake, closed, a directory/aggregator, or a franchise HQ instead of a local business. Only put a correction when evidence clearly shows the right value. Recommend 2-5 services, highest impact first. "fit" measures how well they match our ideal customer. Accessibility = how reachable a decision maker is (direct phone/email = high).`
    },
    { role: 'user', content: `${profileBlock(profile)}\n\n=== LEAD ===\n${leadBlock(lead)}` }
  ]

  const result = await ollamaStructured(messages, 1400)
  if (!result.content) return { error: friendlyError(result), errorCode: result.errorCode }

  const raw = parseJson<Record<string, unknown>>(result.content)
  if (!raw) return { error: 'AI returned an unreadable answer — try again.' }

  const v = (raw.verification ?? {}) as Record<string, unknown>
  const s = (raw.score ?? {}) as Record<string, unknown>
  const parts = {
    budget: clamp(s.budget, 0, 20, 10),
    need: clamp(s.need, 0, 20, 10),
    accessibility: clamp(s.accessibility, 0, 20, 10),
    timing: clamp(s.timing, 0, 20, 10),
    fit: clamp(s.fit, 0, 20, 10)
  }
  const allowed = new Set(profile.services.map((x) => x.name.toLowerCase()))
  const corrections = Object.fromEntries(
    Object.entries((v.corrections ?? {}) as Record<string, unknown>).filter(([, val]) => typeof val === 'string' && val.trim())
  ) as LeadAnalysis['verification']['corrections']

  return {
    data: {
      verification: {
        verified: v.verified !== false,
        confidence: clamp(v.confidence, 0, 100, 50),
        flags: strList(v.flags),
        corrections
      },
      summary: str(raw.summary),
      industry: str(raw.industry, lead.industry ?? lead.category ?? ''),
      employeeEstimate: str(raw.employee_estimate),
      strengths: strList(raw.strengths),
      weaknesses: strList(raw.weaknesses),
      onlinePresenceScore: clamp(raw.online_presence_score, 1, 10, 5),
      estimatedRevenue: str(raw.estimated_revenue, 'Unknown'),
      competitivePosition: str(raw.competitive_position),
      urgency: level(raw.urgency, ['low', 'medium', 'high'], 'medium'),
      urgencyReason: str(raw.urgency_reason),
      services: (Array.isArray(raw.services) ? raw.services : [])
        .map((x) => x as Record<string, unknown>)
        .filter((x) => str(x.name))
        .map((x) => ({
          name: str(x.name),
          priority: level(x.priority, ['high', 'medium', 'low'], 'medium'),
          reason: str(x.reason),
          estimatedValue: str(x.estimated_value),
          pitchAngle: str(x.pitch_angle)
        }))
        .sort((a, b) => Number(allowed.has(b.name.toLowerCase())) - Number(allowed.has(a.name.toLowerCase())))
        .slice(0, 6),
      score: {
        ...parts,
        total: parts.budget + parts.need + parts.accessibility + parts.timing + parts.fit,
        reasoning: str(s.reasoning)
      }
    }
  }
}

const SCRIPT_LABELS: Record<CallScriptOptions['scriptType'], string> = {
  cold_call: 'Cold Call',
  follow_up: 'Follow-Up Call',
  discovery: 'Discovery Call',
  closing: 'Closing Call'
}

const SCRIPT_SCHEMA = `{
 "opener": "pattern-interrupt opener personalized to THEIR business (2-3 sentences)",
 "intro": "quick intro of caller + company",
 "value_prop": "personalized value proposition",
 "questions": ["3 engagement questions"],
 "pitch": "main pitch body (4-6 sentences)",
 "social_proof": "social proof template with [CLIENT NAME] / [RESULT] placeholders",
 "objections": [{"objection": "Not interested", "response": "..."}, {"objection": "No budget", "response": "..."}, {"objection": "Bad timing", "response": "..."}, {"objection": "Just send me info", "response": "..."}, {"objection": "We already have someone", "response": "..."}],
 "close": "close attempt asking for a specific next step",
 "voicemail": "20-30 second voicemail",
 "follow_up_email": {"subject": "...", "body": "short email, plain text, sign off with caller name"},
 "talking_points": ["5 short bullet talking points"]
}`

export async function generateCallScript(
  lead: LeadInput,
  profile: BusinessProfileInput,
  analysis: { summary?: string | null; services?: { name: string; reason: string; pitchAngle: string }[]; weaknesses?: string[] } | null,
  opts: CallScriptOptions
): Promise<AiResult<GeneratedCallScript>> {
  const analysisText = analysis
    ? [
        analysis.summary && `Summary: ${analysis.summary}`,
        analysis.weaknesses?.length && `Weaknesses: ${analysis.weaknesses.join('; ')}`,
        analysis.services?.length &&
          `Services to pitch: ${analysis.services.slice(0, 3).map((s) => `${s.name} — ${s.reason} (angle: ${s.pitchAngle})`).join(' | ')}`
      ]
        .filter(Boolean)
        .join('\n')
    : 'No AI analysis yet.'

  const messages = [
    {
      role: 'system',
      content: `You write high-converting, natural-sounding sales call scripts. Use specifics from the lead data — never generic filler. Sound human, not salesy. Return ONLY JSON matching:\n${SCRIPT_SCHEMA}`
    },
    {
      role: 'user',
      content: `Script type: ${SCRIPT_LABELS[opts.scriptType]}\nTone: ${opts.tone}\nCaller: ${opts.callerName} from ${opts.companyName}\nWhat we sell: ${opts.offering}\n\n${profileBlock(profile)}\n\n=== LEAD ===\n${leadBlock(lead)}\n\n=== AI ANALYSIS ===\n${analysisText}`
    }
  ]

  const result = await ollamaStructured(messages, 2600)
  if (!result.content) return { error: friendlyError(result), errorCode: result.errorCode }
  const raw = parseJson<Record<string, unknown>>(result.content)
  if (!raw) return { error: 'AI returned an unreadable script — try again.' }

  const email = (raw.follow_up_email ?? {}) as Record<string, unknown>
  return {
    data: {
      title: `${SCRIPT_LABELS[opts.scriptType]} · ${lead.businessName}`,
      opener: str(raw.opener),
      intro: str(raw.intro),
      valueProp: str(raw.value_prop),
      questions: strList(raw.questions, 5),
      pitch: str(raw.pitch),
      socialProof: str(raw.social_proof),
      objections: (Array.isArray(raw.objections) ? raw.objections : [])
        .map((o) => o as Record<string, unknown>)
        .map((o) => ({ objection: str(o.objection), response: str(o.response) }))
        .filter((o) => o.objection && o.response),
      close: str(raw.close),
      voicemail: str(raw.voicemail),
      followUpEmail: { subject: str(email.subject), body: str(email.body) },
      talkingPoints: strList(raw.talking_points, 8)
    }
  }
}
