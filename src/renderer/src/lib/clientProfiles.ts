import type { ClientProfile } from './types'
import { createEmptyClientProfile } from './types'

const STORAGE_KEY = 'gieo_client_profiles'

export function normalizeClientProfile(profile: ClientProfile, mrrCents = 0): ClientProfile {
  const base = createEmptyClientProfile(profile.client_id, mrrCents)
  return {
    ...base,
    ...profile,
    retainer_schedule: profile.retainer_schedule ?? base.retainer_schedule,
    time_entries: profile.time_entries ?? [],
    platform_logins: profile.platform_logins ?? [],
    meeting_notes: profile.meeting_notes ?? [],
    call_logs: profile.call_logs ?? [],
    close_checklist: profile.close_checklist ?? []
  }
}

export function loadClientProfiles(): Record<string, ClientProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ClientProfile>
    const normalized: Record<string, ClientProfile> = {}
    for (const [id, p] of Object.entries(parsed)) {
      normalized[id] = normalizeClientProfile(p)
    }
    return normalized
  } catch {
    return {}
  }
}

export function saveClientProfiles(profiles: Record<string, ClientProfile>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

export function getOrCreateProfile(
  profiles: Record<string, ClientProfile>,
  clientId: string,
  seed?: Partial<ClientProfile>,
  mrrCents = 0
): ClientProfile {
  if (profiles[clientId]) return normalizeClientProfile(profiles[clientId], mrrCents)
  return normalizeClientProfile({ ...createEmptyClientProfile(clientId, mrrCents), ...seed }, mrrCents)
}
