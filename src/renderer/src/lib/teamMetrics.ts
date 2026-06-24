import type { TeamMemberMetrics } from '@/lib/types'
import { GIEO_USERS } from '@/lib/auth'

const STORAGE_KEY = 'gieo_team_metrics'

export function defaultTeamMetrics(): Record<string, TeamMemberMetrics> {
  const base: TeamMemberMetrics = {
    lovable_sites: 0,
    ads_created: 0,
    ad_spend_managed: 0,
    software_shipped: 0
  }
  return Object.fromEntries(GIEO_USERS.map((u) => [u.profile.id, { ...base }]))
}

export function loadTeamMetrics(): Record<string, TeamMemberMetrics> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const defaults = defaultTeamMetrics()
    if (!raw) return defaults
    return { ...defaults, ...JSON.parse(raw) as Record<string, TeamMemberMetrics> }
  } catch {
    return defaultTeamMetrics()
  }
}

export function saveTeamMetrics(metrics: Record<string, TeamMemberMetrics>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics))
}

export function seedDemoMetrics(): Record<string, TeamMemberMetrics> {
  return {
    'a1000001-0000-4000-8000-000000000001': { lovable_sites: 0, ads_created: 0, ad_spend_managed: 0, software_shipped: 4 },
    'a1000002-0000-4000-8000-000000000002': { lovable_sites: 0, ads_created: 0, ad_spend_managed: 1540000, software_shipped: 3 },
    'a1000003-0000-4000-8000-000000000003': { lovable_sites: 0, ads_created: 12, ad_spend_managed: 0, software_shipped: 0 },
    'a1000004-0000-4000-8000-000000000004': { lovable_sites: 7, ads_created: 0, ad_spend_managed: 0, software_shipped: 0 },
    'a1000005-0000-4000-8000-000000000005': { lovable_sites: 0, ads_created: 18, ad_spend_managed: 0, software_shipped: 0 }
  }
}
