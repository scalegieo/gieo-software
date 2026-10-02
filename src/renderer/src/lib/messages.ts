import type { Message, Profile } from '@/lib/types'
import { getProfileById } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface MessageInsert {
  user_id: string
  content: string
  task_id?: string | null
  message_type: 'user' | 'system'
  business?: string
}

/** Inserts a chat row; retries without `business` on databases that predate migration v7. */
export async function insertMessageRow(
  row: MessageInsert
): Promise<{ data: DbMessageRow | null; error: string | null }> {
  const run = (payload: Partial<MessageInsert>) =>
    supabase
      .from('messages')
      .insert(payload as never)
      .select('*, profiles(id, role, name)')
      .single()

  let { data, error } = await run(row)
  if (error && /business/i.test(error.message)) {
    const { business: _business, ...rest } = row
    ;({ data, error } = await run(rest))
  }
  if (error) {
    const msg = /foreign key|violates/i.test(error.message)
      ? 'Your login is missing from the database — run supabase/migration-v8.sql'
      : error.message
    return { data: null, error: msg }
  }
  return { data: data as unknown as DbMessageRow, error: null }
}

export type DbMessageRow = Message & {
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
