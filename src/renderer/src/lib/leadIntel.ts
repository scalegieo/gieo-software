import type { BusinessId } from './types'
import { SERVICE_OPTIONS } from './types'

export type ScrapeSource = 'google_maps' | 'yelp' | 'openstreetmap' | 'website' | 'sheet' | 'manual'

export type IntelLeadStatus = 'new' | 'verified' | 'contacted' | 'interested' | 'converted' | 'dead'

export const INTEL_STATUSES: { id: IntelLeadStatus; label: string; variant: 'pending' | 'success' | 'warning' | 'secondary' | 'destructive' | 'default' }[] = [
  { id: 'new', label: 'New', variant: 'pending' },
  { id: 'verified', label: 'Verified', variant: 'success' },
  { id: 'contacted', label: 'Contacted', variant: 'warning' },
  { id: 'interested', label: 'Interested', variant: 'default' },
  { id: 'converted', label: 'Converted', variant: 'success' },
  { id: 'dead', label: 'Dead', variant: 'destructive' }
]

export const SOURCE_LABELS: Record<ScrapeSource, string> = {
  google_maps: 'Google Maps',
  yelp: 'Yelp',
  openstreetmap: 'OpenStreetMap',
  website: 'Website',
  sheet: 'Google Sheet',
  manual: 'Manual'
}

export interface VerificationCheck {
  key: string
  label: string
  pass: boolean
  detail: string
}

export interface LeadVerification {
  checks: VerificationCheck[]
  score: number
  checkedAt: string
  qualityNotes?: string[]
}

export interface ServiceRecommendation {
  name: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  estimatedValue: string
  pitchAngle: string
}

export interface ScoreBreakdown {
  budget: number
  need: number
  accessibility: number
  timing: number
  fit: number
}

export interface IntelInsights {
  strengths?: string[]
  weaknesses?: string[]
  onlinePresenceScore?: number
  estimatedRevenue?: string
  competitivePosition?: string
  urgency?: 'low' | 'medium' | 'high'
  urgencyReason?: string
  scoreBreakdown?: ScoreBreakdown
  aiConfidence?: number
  aiFlags?: string[]
  aiCorrections?: Record<string, string>
}

/** Row shape of `intel_leads` in Supabase. */
export interface IntelLead {
  id: string
  business: BusinessId
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  industry: string | null
  category: string | null
  employee_count: string | null
  description: string | null
  hours: string | null
  google_rating: number | null
  review_count: number | null
  social_media: Record<string, string>
  tech_stack: string[]
  website_quality: number | null
  has_website: boolean
  verification: LeadVerification | Record<string, never>
  ai_summary: string | null
  ai_services_needed: ServiceRecommendation[]
  ai_lead_score: number | null
  ai_score_reasoning: string | null
  ai_verified: boolean | null
  ai_insights: IntelInsights
  ai_analyzed_at: string | null
  status: IntelLeadStatus
  source: ScrapeSource
  tags: string[]
  notes: string
  scraper_job_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CallScriptRecord {
  id: string
  lead_id: string
  business: BusinessId
  title: string
  script_type: CallScriptType
  tone: CallScriptTone
  script: string
  talking_points: string[]
  objection_handlers: { objection: string; response: string }[]
  voicemail_script: string | null
  follow_up_email: string | null
  created_by: string | null
  created_at: string
}

export interface ScraperJob {
  id: string
  business: BusinessId
  source: ScrapeSource
  query: string
  location: string | null
  max_results: number
  status: 'running' | 'completed' | 'cancelled' | 'failed'
  progress: number
  total_found: number
  errors: string[]
  started_at: string
  completed_at: string | null
}

export type CallScriptType = 'cold_call' | 'follow_up' | 'discovery' | 'closing'
export type CallScriptTone = 'professional' | 'casual' | 'friendly' | 'urgent'

export const SCRIPT_TYPES: { id: CallScriptType; label: string }[] = [
  { id: 'cold_call', label: 'Cold Call' },
  { id: 'follow_up', label: 'Follow-Up' },
  { id: 'discovery', label: 'Discovery Call' },
  { id: 'closing', label: 'Closing' }
]

export const SCRIPT_TONES: { id: CallScriptTone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'urgent', label: 'Urgent' }
]

/** Scraped lead as delivered by the main-process scraper. */
export interface ScrapedLeadResult {
  businessName: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  category?: string
  rating?: number
  reviewCount?: number
  hours?: string
  description?: string
  sourceUrl?: string
  source: ScrapeSource
  hasWebsite: boolean
  websiteQuality: number | null
  socialMedia: Record<string, string>
  techStack: string[]
  verification: LeadVerification
}

export interface ScrapeProgressEvent {
  jobId: string
  status: 'running' | 'completed' | 'cancelled' | 'failed'
  phase: string
  progress: number
  totalFound: number
  lead?: ScrapedLeadResult
  error?: string
  errors?: string[]
}

export interface LeadAnalysis {
  verification: { verified: boolean; confidence: number; flags: string[]; corrections: Record<string, string> }
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
  services: ServiceRecommendation[]
  score: ScoreBreakdown & { total: number; reasoning: string }
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

export type AiResult<T> = { data?: T; error?: string; errorCode?: string }

// ---------------------------------------------------------------------------
// Business profiles — what each workspace sells and who it targets
// ---------------------------------------------------------------------------

export interface BusinessLeadProfile {
  id: BusinessId
  name: string
  pitch: string
  idealCustomer: string
  services: { name: string; priceRange: string }[]
  presets: string[]
  defaultOffering: string
}

const GIEO_PRICES: Record<(typeof SERVICE_OPTIONS)[number], string> = {
  'Meta Ads Management': '$1,500-$5,000/mo',
  'Google Ads': '$1,500-$4,000/mo',
  'Creative Production': '$1,000-$4,000/mo',
  'Landing Page / CRO': '$2,500-$8,000 one-time',
  'Email Marketing': '$800-$2,500/mo',
  'SEO / Content': '$1,200-$4,000/mo',
  'Social Media Management': '$1,000-$3,500/mo',
  'Analytics & Reporting': '$500-$1,500/mo',
  'Brand Strategy': '$3,000-$10,000 one-time',
  'TikTok Ads': '$1,500-$4,000/mo'
}

export const LEAD_PROFILES: Record<BusinessId, BusinessLeadProfile> = {
  gieo: {
    id: 'gieo',
    name: 'GIEO',
    pitch: 'a performance marketing agency that grows local and e-commerce businesses with paid ads, creative, and conversion-focused websites.',
    idealCustomer:
      'Established local service businesses, clinics, med spas, home services, e-commerce and DTC brands with real revenue ($300K+/yr) but weak ads, outdated websites, no tracking pixels, or poor social presence.',
    services: SERVICE_OPTIONS.map((name) => ({ name, priceRange: GIEO_PRICES[name] })),
    presets: [
      'med spas in Miami FL',
      'roofing contractors in Dallas TX',
      'dentists in Phoenix AZ',
      'HVAC companies in Atlanta GA',
      'personal injury lawyers in Houston TX',
      'boutique gyms in Los Angeles CA',
      'landscaping companies in Charlotte NC',
      'auto detailing in Las Vegas NV'
    ],
    defaultOffering: 'Paid ads (Meta, Google, TikTok), ad creative, and high-converting landing pages'
  },
  python: {
    id: 'python',
    name: 'Python',
    pitch: 'a real estate media agency that produces cinematic property walkthrough films, drone footage, and social content that sells listings faster.',
    idealCustomer:
      'Real estate agents, teams and brokerages with mid-to-luxury listings, home builders and developers launching projects, and short-term rental hosts — especially those using only plain photos, no video, or weak social media.',
    services: [
      { name: 'Cinematic Listing Walkthrough', priceRange: '$600-$2,500 per listing' },
      { name: 'Drone / Aerial Footage', priceRange: '$300-$900 per shoot' },
      { name: 'Social Reels & Short-Form Clips', priceRange: '$400-$1,500/mo' },
      { name: 'Agent / Brokerage Brand Video', priceRange: '$1,500-$5,000 one-time' },
      { name: 'Twilight / Luxury Showcase Shoot', priceRange: '$800-$3,000 per listing' },
      { name: 'New Development / Builder Promo Film', priceRange: '$3,000-$15,000 per project' },
      { name: 'Short-Term Rental Property Video', priceRange: '$500-$1,800 per property' },
      { name: 'Listing Photography', priceRange: '$200-$600 per listing' }
    ],
    presets: [
      'luxury real estate agents in Austin TX',
      'real estate brokerages in Scottsdale AZ',
      'home builders in Nashville TN',
      'realtors in Miami Beach FL',
      'property developers in Denver CO',
      'vacation rental management in Gatlinburg TN',
      'real estate teams in San Diego CA',
      'luxury homes realtors in Beverly Hills CA'
    ],
    defaultOffering: 'Cinematic listing walkthrough films, drone footage, and social reels for listings'
  }
}

export function profilePayload(business: BusinessId): {
  id: string
  name: string
  pitch: string
  idealCustomer: string
  services: { name: string; priceRange: string }[]
} {
  const p = LEAD_PROFILES[business]
  return { id: p.id, name: p.name, pitch: p.pitch, idealCustomer: p.idealCustomer, services: p.services }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Intel lead ids that already have a CRM pipeline card, matched by id or by company within the same business. */
export function pipelineLeadIds(
  intel: Pick<IntelLead, 'id' | 'business_name' | 'business'>[],
  pipeline: { id: string; company: string; business?: BusinessId }[]
): Set<string> {
  const ids = new Set(pipeline.map((l) => l.id))
  const companies = new Set(pipeline.map((l) => `${l.business ?? 'gieo'}:${l.company.trim().toLowerCase()}`))
  return new Set(
    intel
      .filter((l) => ids.has(l.id) || companies.has(`${l.business}:${l.business_name.trim().toLowerCase()}`))
      .map((l) => l.id)
  )
}

/** Low end of each high/medium-priority service estimate ("$1,500-$3,000/mo" → 1500), in cents. */
export function estimatedDealCents(lead: Pick<IntelLead, 'ai_services_needed'>): number {
  const services = lead.ai_services_needed.filter((s) => s.priority !== 'low')
  const dollars = services.reduce((sum, s) => {
    const match = s.estimatedValue?.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?/i)
    if (!match) return sum
    const n = parseFloat(match[1].replace(/,/g, '')) * (match[2] ? 1000 : 1)
    return Number.isFinite(n) ? sum + n : sum
  }, 0)
  return Math.round(dollars * 100)
}

export function scoreGrade(score: number | null | undefined): 'A' | 'B' | 'C' | 'D' | 'F' | '—' {
  if (score == null) return '—'
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

/** red → yellow → green → blue as the score climbs */
export function scoreColor(score: number | null | undefined): { text: string; bg: string; ring: string; hex: string } {
  if (score == null) return { text: 'text-zinc-500', bg: 'bg-zinc-800', ring: 'ring-zinc-700', hex: '#52525b' }
  if (score >= 85) return { text: 'text-sky-300', bg: 'bg-sky-500/20', ring: 'ring-sky-500/40', hex: '#38bdf8' }
  if (score >= 65) return { text: 'text-emerald-300', bg: 'bg-emerald-500/20', ring: 'ring-emerald-500/40', hex: '#34d399' }
  if (score >= 45) return { text: 'text-amber-300', bg: 'bg-amber-500/20', ring: 'ring-amber-500/40', hex: '#fbbf24' }
  return { text: 'text-red-300', bg: 'bg-red-500/20', ring: 'ring-red-500/40', hex: '#f87171' }
}

export function verificationState(lead: IntelLead): 'ai_verified' | 'flagged' | 'checks_passed' | 'unverified' {
  if (lead.ai_verified === true) return 'ai_verified'
  if (lead.ai_verified === false) return 'flagged'
  const v = lead.verification as LeadVerification
  if (v?.score != null && v.score >= 60) return 'checks_passed'
  return 'unverified'
}

export function leadToAiInput(lead: IntelLead): Record<string, unknown> {
  const v = lead.verification as LeadVerification
  return {
    businessName: lead.business_name,
    contactName: lead.contact_name,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    industry: lead.industry,
    category: lead.category,
    description: lead.description,
    googleRating: lead.google_rating,
    reviewCount: lead.review_count,
    hours: lead.hours,
    socialMedia: lead.social_media,
    techStack: lead.tech_stack,
    websiteQuality: lead.website_quality,
    hasWebsite: lead.has_website,
    verificationChecks: v?.checks?.map((c) => ({ label: c.label, pass: c.pass, detail: c.detail })),
    qualityNotes: v?.qualityNotes,
    notes: lead.notes
  }
}

export function scriptToText(s: GeneratedCallScript): string {
  return [
    `# ${s.title}`,
    '',
    '## Opener',
    s.opener,
    '',
    '## Intro',
    s.intro,
    '',
    '## Value proposition',
    s.valueProp,
    '',
    '## Engagement questions',
    ...s.questions.map((q, i) => `${i + 1}. ${q}`),
    '',
    '## Pitch',
    s.pitch,
    '',
    '## Social proof',
    s.socialProof,
    '',
    '## Objection handlers',
    ...s.objections.flatMap((o) => [`**"${o.objection}"**`, o.response, '']),
    '## Close',
    s.close,
    '',
    '## Voicemail',
    s.voicemail
  ].join('\n')
}

export function emailToText(s: { subject: string; body: string }): string {
  return `Subject: ${s.subject}\n\n${s.body}`
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? Object.values(v as object).join('; ') : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function leadsToCsv(leads: IntelLead[]): string {
  const cols: [string, (l: IntelLead) => unknown][] = [
    ['Business', (l) => l.business_name],
    ['Contact', (l) => l.contact_name],
    ['Phone', (l) => l.phone],
    ['Email', (l) => l.email],
    ['Website', (l) => l.website],
    ['Address', (l) => l.address],
    ['City', (l) => l.city],
    ['State', (l) => l.state],
    ['Zip', (l) => l.zip],
    ['Category', (l) => l.category],
    ['Industry', (l) => l.industry],
    ['Rating', (l) => l.google_rating],
    ['Reviews', (l) => l.review_count],
    ['Website quality', (l) => l.website_quality],
    ['AI score', (l) => l.ai_lead_score],
    ['Grade', (l) => (l.ai_lead_score == null ? '' : scoreGrade(l.ai_lead_score))],
    ['AI verified', (l) => (l.ai_verified == null ? '' : l.ai_verified ? 'yes' : 'flagged')],
    ['Top services', (l) => l.ai_services_needed.map((s) => s.name)],
    ['Summary', (l) => l.ai_summary],
    ['Status', (l) => l.status],
    ['Source', (l) => SOURCE_LABELS[l.source] ?? l.source],
    ['Tags', (l) => l.tags],
    ['Notes', (l) => l.notes],
    ['Social', (l) => l.social_media],
    ['Added', (l) => l.created_at]
  ]
  return [cols.map(([h]) => h).join(','), ...leads.map((l) => cols.map(([, get]) => csvCell(get(l))).join(','))].join('\n')
}
