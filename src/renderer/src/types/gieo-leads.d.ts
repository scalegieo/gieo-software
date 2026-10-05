import type {
  AiResult,
  CallScriptTone,
  CallScriptType,
  GeneratedCallScript,
  LeadAnalysis,
  LeadVerification,
  ScrapeProgressEvent
} from '@/lib/leadIntel'

export interface ScrapeStartRequest {
  jobId: string
  source: 'google_maps' | 'yelp' | 'openstreetmap' | 'website'
  query: string
  location?: string
  maxResults: number
  urls?: string[]
  showBrowser?: boolean
}

export interface BusinessProfilePayload {
  id: string
  name: string
  pitch: string
  idealCustomer: string
  services: { name: string; priceRange: string }[]
}

declare global {
  interface Window {
    gieoLeads?: {
      startScrape: (req: ScrapeStartRequest) => Promise<{ started: boolean }>
      cancelScrape: (jobId: string) => Promise<{ success: boolean }>
      onScrapeProgress: (cb: (event: ScrapeProgressEvent) => void) => () => void
      reverify: (lead: Record<string, unknown>) => Promise<{
        verification: LeadVerification
        site: {
          reachable: boolean
          quality: number
          socials: Record<string, string>
          tech: string[]
          emails: string[]
          phones: string[]
        } | null
      }>
      analyze: (lead: Record<string, unknown>, profile: BusinessProfilePayload) => Promise<AiResult<LeadAnalysis>>
      callScript: (
        lead: Record<string, unknown>,
        profile: BusinessProfilePayload,
        analysis: { summary?: string | null; services?: { name: string; reason: string; pitchAngle: string }[]; weaknesses?: string[] } | null,
        opts: { scriptType: CallScriptType; tone: CallScriptTone; offering: string; companyName: string; callerName: string }
      ) => Promise<AiResult<GeneratedCallScript>>
    }
  }
}

export {}
