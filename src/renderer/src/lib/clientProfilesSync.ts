import type { Client, ClientProfile } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { loadClientProfiles, saveClientProfiles, normalizeClientProfile } from '@/lib/clientProfiles'

type RemoteProfileRow = {
  client_id: string
  profile_data: ClientProfile
  updated_at: string
}

export async function fetchRemoteClientProfiles(): Promise<RemoteProfileRow[]> {
  const { data, error } = await supabase.from('client_profiles').select('client_id, profile_data, updated_at')
  if (error) {
    console.warn('[GIEO] client_profiles fetch:', error.message)
    return []
  }
  return (data ?? []) as RemoteProfileRow[]
}

export function mergeClientProfiles(
  clients: Client[],
  local: Record<string, ClientProfile>,
  remote: RemoteProfileRow[]
): Record<string, ClientProfile> {
  const merged = { ...local }

  for (const row of remote) {
    const client = clients.find((c) => c.id === row.client_id)
    const mrr = client?.mrr ?? 0
    const remoteProfile = normalizeClientProfile(
      { ...row.profile_data, client_id: row.client_id },
      mrr
    )
    const localProfile = merged[row.client_id]
    const remoteTs = new Date(row.updated_at || remoteProfile.updated_at || 0).getTime()
    const localTs = new Date(localProfile?.updated_at || 0).getTime()

    if (!localProfile || remoteTs >= localTs) {
      merged[row.client_id] = remoteProfile
    }
  }

  saveClientProfiles(merged)
  return merged
}

export async function syncClientProfilesFromRemote(
  clients: Client[]
): Promise<Record<string, ClientProfile>> {
  const local = loadClientProfiles()
  const remote = await fetchRemoteClientProfiles()
  return mergeClientProfiles(clients, local, remote)
}

export async function upsertClientProfileRemote(
  clientId: string,
  profile: ClientProfile
): Promise<void> {
  const { error } = await supabase.from('client_profiles').upsert(
    {
      client_id: clientId,
      profile_data: profile,
      updated_at: profile.updated_at ?? new Date().toISOString()
    },
    { onConflict: 'client_id' }
  )
  if (error) {
    console.warn('[GIEO] client_profiles upsert:', error.message)
  }
}
