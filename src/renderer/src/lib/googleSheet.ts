import type { ScrapedLead } from '@/lib/types'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function pickField(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const val = row[key]
    if (val?.trim()) return val.trim()
  }
  return ''
}

export function parseLeadSheetCsv(csv: string): Omit<ScrapedLead, 'id' | 'scraped_at'>[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const leads: Omit<ScrapedLead, 'id' | 'scraped_at'>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.every((c) => !c.trim())) continue

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? ''
    })

    const name = pickField(row, ['name', 'contact', 'contactname', 'fullname', 'lead', 'person'])
    const company = pickField(row, ['company', 'business', 'organization', 'org', 'website'])
    const phone = pickField(row, ['phone', 'phonenumber', 'mobile', 'tel', 'telephone'])
    const email = pickField(row, ['email', 'emailaddress', 'mail'])
    const notes = pickField(row, ['notes', 'note', 'description', 'comments', 'details'])
    const source = pickField(row, ['source', 'scraper', 'origin']) || 'Google Sheets Scraper'
    const statusRaw = pickField(row, ['status', 'stage']).toLowerCase()

    if (!name && !company && !phone && !email) continue

    const statusMap: Record<string, ScrapedLead['status']> = {
      new: 'new',
      contacted: 'contacted',
      called: 'contacted',
      qualified: 'qualified',
      converted: 'converted',
      client: 'converted',
      dead: 'dead',
      lost: 'dead'
    }

    leads.push({
      name: name || company || 'Unknown',
      company: company || name || '—',
      phone,
      email,
      source,
      notes,
      status: statusMap[statusRaw] ?? 'new'
    })
  }

  return leads
}
