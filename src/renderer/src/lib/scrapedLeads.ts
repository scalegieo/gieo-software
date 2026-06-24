import type { ScrapedLead } from '@/lib/types'

const STORAGE_KEY = 'gieo_scraped_leads'

export function loadScrapedLeads(): ScrapedLead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEMO_SCRAPED_LEADS
    const stored = JSON.parse(raw) as ScrapedLead[]
    return stored.length ? stored : DEMO_SCRAPED_LEADS
  } catch {
    return DEMO_SCRAPED_LEADS
  }
}

export function saveScrapedLeads(leads: ScrapedLead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}

const DEMO_SCRAPED_LEADS: ScrapedLead[] = [
  { id: 'scr-1', name: 'David Park', company: 'FitFuel Nutrition', phone: '+1 310 555 0142', email: 'david@fitfuel.co', source: 'Apollo Scraper', status: 'new', notes: 'DTC protein brand, running Meta ads', scraped_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'scr-2', name: 'Amira Hassan', company: 'GlowSkin Co', phone: '+1 646 555 0198', email: 'amira@glowskin.com', source: 'LinkedIn Scraper', status: 'new', notes: 'Skincare, $2M ARR, wants agency', scraped_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'scr-3', name: 'Chris Mueller', company: 'AutoParts Direct', phone: '+1 512 555 0167', email: '', source: 'Google Maps Scraper', status: 'contacted', notes: 'E-commerce auto parts', scraped_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'scr-4', name: 'Lisa Tran', company: 'Mindful Yoga App', phone: '+1 415 555 0133', email: 'lisa@mindfulyoga.app', source: 'Apollo Scraper', status: 'new', notes: 'Subscription app, needs TikTok ads', scraped_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: 'scr-5', name: 'Robert Klein', company: 'Klein Legal Group', phone: '+1 212 555 0177', email: 'robert@kleinlegal.com', source: 'Manual Import', status: 'new', notes: 'Personal injury law, high LTV leads', scraped_at: new Date(Date.now() - 3600000 * 5).toISOString() }
]
