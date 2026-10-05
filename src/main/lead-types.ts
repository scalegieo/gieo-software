export type ScrapeSource = 'google_maps' | 'yelp' | 'openstreetmap' | 'website'

export interface RawLead {
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
}

export interface WebsiteReport {
  url: string
  reachable: boolean
  status?: number
  error?: string
  title?: string
  description?: string
  emails: string[]
  phones: string[]
  socials: Record<string, string>
  tech: string[]
  quality: number
  qualityNotes: string[]
  loadMs?: number
  schema?: {
    name?: string
    telephone?: string
    email?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    category?: string
  }
}

export interface ScrapedLeadResult extends RawLead {
  source: ScrapeSource
  hasWebsite: boolean
  websiteQuality: number | null
  socialMedia: Record<string, string>
  techStack: string[]
  verification: LeadVerification & { qualityNotes?: string[] }
}

export interface ScrapeRequest {
  jobId: string
  source: ScrapeSource
  query: string
  location?: string
  maxResults: number
  urls?: string[]
  showBrowser?: boolean
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
