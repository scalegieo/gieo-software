export interface Profile {
  id: string
  role: string
  name: string
}

export interface Lead {
  id: string
  name: string
  company: string
  stage: LeadStage
  value: number
  created_at: string
  onboarding_checklist?: OnboardingItem[]
}

export type LeadStage = 'new' | 'contacted' | 'meeting' | 'won' | 'lost'

export interface OnboardingItem {
  id: string
  label: string
  completed: boolean
}

export type BusinessId = 'gieo' | 'python'

export const BUSINESSES: { id: BusinessId; label: string }[] = [
  { id: 'gieo', label: 'GIEO' },
  { id: 'python', label: 'Python' }
]

export function clientBusiness(client: Pick<Client, 'business'>): BusinessId {
  return client.business === 'python' ? 'python' : 'gieo'
}

export interface Client {
  id: string
  lead_id: string | null
  mrr: number
  status: string
  name?: string
  company?: string
  business?: BusinessId
  created_at?: string
}

export interface MeetingNote {
  id: string
  date: string
  title: string
  notes: string
  attendees: string
}

export interface CallLog {
  id: string
  date: string
  duration_minutes: number
  notes: string
  outcome: 'connected' | 'voicemail' | 'no_answer' | 'scheduled' | 'follow_up'
}

export type TimeEntryCategory = 'strategy' | 'creative' | 'ads' | 'reporting' | 'calls' | 'other'

export interface TimeEntry {
  id: string
  date: string
  hours: number
  category: TimeEntryCategory
  billable: boolean
  notes: string
  team_member?: string
}

export interface RetainerSchedule {
  enabled: boolean
  billing_cycle: 'monthly' | 'quarterly'
  term_months: number
  monthly_amount_cents: number
  reminder_days_before: number
  contract_start: string | null
  next_billing_date: string | null
  last_billed_date: string | null
  contact_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  next_contact_date: string | null
  auto_renew: boolean
}

export interface ClientProfile {
  client_id: string
  primary_contact: string
  email: string
  phone: string
  website: string
  industry: string
  timezone: string
  services: string[]
  contract_start: string | null
  retainer_notes: string
  communication_preference: 'email' | 'phone' | 'slack' | 'whatsapp'
  next_follow_up: string | null
  internal_notes: string
  meeting_notes: MeetingNote[]
  call_logs: CallLog[]
  platform_logins: PlatformLogin[]
  project_status: 'active' | 'closing' | 'completed'
  close_checklist: OnboardingItem[]
  retainer_schedule: RetainerSchedule
  time_entries: TimeEntry[]
  updated_at: string
}

export type PlatformType = 'instagram' | 'meta_ads' | 'google_ads' | 'email' | 'tiktok' | 'shopify' | 'lovable' | 'other'

export interface PlatformLogin {
  id: string
  platform: PlatformType
  label: string
  username: string
  password: string
  url: string
  notes: string
}

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  instagram: 'Instagram',
  meta_ads: 'Meta Ads Manager',
  google_ads: 'Google Ads',
  email: 'Email / Gmail',
  tiktok: 'TikTok Ads',
  shopify: 'Shopify',
  lovable: 'Lovable',
  other: 'Other'
}

export interface ScrapedLead {
  id: string
  name: string
  company: string
  phone: string
  email: string
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'dead'
  notes: string
  scraped_at: string
}

export interface TeamMemberMetrics {
  lovable_sites: number
  ads_created: number
  ad_spend_managed: number
  software_shipped: number
}

export interface CelebrationState {
  title: string
  subtitle: string
}

export const SERVICE_OPTIONS = [
  'Meta Ads Management',
  'Google Ads',
  'Creative Production',
  'Landing Page / CRO',
  'Email Marketing',
  'SEO / Content',
  'Social Media Management',
  'Analytics & Reporting',
  'Brand Strategy',
  'TikTok Ads'
] as const

export const CALL_OUTCOMES: { value: CallLog['outcome']; label: string }[] = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'scheduled', label: 'Meeting Scheduled' },
  { value: 'follow_up', label: 'Follow-up Needed' }
]

export const TIME_ENTRY_CATEGORIES: { value: TimeEntryCategory; label: string }[] = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'creative', label: 'Creative' },
  { value: 'ads', label: 'Ads / Media' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'calls', label: 'Calls / Meetings' },
  { value: 'other', label: 'Other' }
]

export function createDefaultRetainerSchedule(mrrCents = 0): RetainerSchedule {
  const next = new Date()
  next.setMonth(next.getMonth() + 1)
  next.setDate(1)
  return {
    enabled: true,
    billing_cycle: 'monthly',
    term_months: 3,
    monthly_amount_cents: mrrCents,
    reminder_days_before: 7,
    contract_start: new Date().toISOString(),
    next_billing_date: next.toISOString(),
    last_billed_date: null,
    contact_frequency: 'monthly',
    next_contact_date: new Date(Date.now() + 86400000 * 14).toISOString(),
    auto_renew: true
  }
}

export function createEmptyClientProfile(clientId: string, mrrCents = 0): ClientProfile {
  return {
    client_id: clientId,
    primary_contact: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    timezone: 'America/New_York',
    services: [],
    contract_start: null,
    retainer_notes: '',
    communication_preference: 'email',
    next_follow_up: null,
    internal_notes: '',
    meeting_notes: [],
    call_logs: [],
    platform_logins: [],
    project_status: 'active',
    close_checklist: [],
    retainer_schedule: createDefaultRetainerSchedule(mrrCents),
    time_entries: [],
    updated_at: new Date().toISOString()
  }
}

export interface Financial {
  id: string
  client_id: string
  invoice_path: string
  amount: number
  status: string
  stripe_invoice_id?: string | null
  hosted_invoice_url?: string | null
  created_at?: string
}

export interface Campaign {
  id: string
  client_id: string
  ad_url: string
  spend: number
  roas: number
  status: string
}

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  assignee_id: string | null
  client_id: string | null
  title: string
  due_date: string | null
  status: string
  priority?: TaskPriority
}

export interface WhiteboardConnection {
  id: string
  from_id: string
  to_id: string
  from_anchor: 'top' | 'right' | 'bottom' | 'left'
  to_anchor: 'top' | 'right' | 'bottom' | 'left'
}

export interface WhiteboardItem {
  id: string
  user_id: string
  type: 'note' | 'connector'
  x: number
  y: number
  width: number
  height: number
  content: string
  color: string
  target_id: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  task_id?: string | null
  message_type?: 'user' | 'system'
  profile?: Profile
}

export const LEAD_STAGES: { id: LeadStage; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'contacted', label: 'Contacted', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'meeting', label: 'Meeting', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'won', label: 'Won', color: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/30' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
]

export const DEFAULT_ONBOARDING: Omit<OnboardingItem, 'id'>[] = [
  { label: 'Send welcome email & contract', completed: false },
  { label: 'Collect brand assets & access credentials', completed: false },
  { label: 'Set up Meta Business Manager access', completed: false },
  { label: 'Configure ad account & pixel', completed: false },
  { label: 'Schedule kickoff call', completed: false },
  { label: 'Create client folder in GIEO_Data', completed: false }
]

export const DEFAULT_CLOSE_CHECKLIST: Omit<OnboardingItem, 'id'>[] = [
  { label: 'Send final performance report to client', completed: false },
  { label: 'Revoke platform access (Meta, Google, etc.)', completed: false },
  { label: 'Archive contracts to GIEO_Data/Archive', completed: false },
  { label: 'Process final invoice / offboarding payment', completed: false },
  { label: 'Internal retrospective notes', completed: false },
  { label: 'Update team performance metrics', completed: false }
]

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100)
}

export function formatCompactCurrency(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`
  return formatCurrency(cents)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
