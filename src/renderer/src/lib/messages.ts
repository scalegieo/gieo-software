import type { Message, Profile } from '@/lib/types'
import { getProfileById } from '@/lib/auth'

type DbMessageRow = Message & {
  profiles?: Profile | Profile[] | null
}

export function mapDbMessage(row: DbMessageRow): Message {
  const joined = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const profile = joined ?? getProfileById(row.user_id)
  const { profiles: _profiles, ...rest } = row
  return {
    ...rest,
    message_type: row.message_type ?? 'user',
    profile
  }
}
