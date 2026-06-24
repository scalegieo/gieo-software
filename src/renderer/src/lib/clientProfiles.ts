import type { ClientProfile } from './types'
import { createEmptyClientProfile } from './types'

const STORAGE_KEY = 'gieo_client_profiles'

export function loadClientProfiles(): Record<string, ClientProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ClientProfile>
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
  seed?: Partial<ClientProfile>
): ClientProfile {
  if (profiles[clientId]) return profiles[clientId]
  return { ...createEmptyClientProfile(clientId), ...seed }
}
