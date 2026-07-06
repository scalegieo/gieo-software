import type { ScrapedLead } from '@/lib/types'

const STORAGE_KEY = 'gieo_scraped_leads'

export function loadScrapedLeads(): ScrapedLead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ScrapedLead[]
  } catch {
    return []
  }
}

export function saveScrapedLeads(leads: ScrapedLead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}
