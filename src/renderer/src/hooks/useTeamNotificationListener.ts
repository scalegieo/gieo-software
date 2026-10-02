import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { getProfileById } from '@/lib/auth'
import { mapDbMessage } from '@/lib/messages'
import { showDesktopNotification, areSystemNotificationsEnabled } from '@/lib/notifications'
import type { Message } from '@/lib/types'

/** Mac system notifications for team chat + activity while the app runs in background. */
export function useTeamNotificationListener(): void {
  const profile = useStore((s) => s.profile)
  const chatOpen = useStore((s) => s.chatOpen)

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('gieo-system-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (!areSystemNotificationsEnabled()) return

          const row = payload.new as Message
          if (row.user_id === profile.id) return

          const mapped = mapDbMessage({
            ...row,
            profiles: getProfileById(row.user_id) ?? null
          })

          const businessLabel = mapped.business === 'python' ? 'Python' : 'GIEO'

          if (mapped.message_type === 'system') {
            void showDesktopNotification(businessLabel, mapped.content)
            return
          }

          if (chatOpen) return

          const author = mapped.profile?.name ?? getProfileById(row.user_id)?.name ?? 'Team'
          void showDesktopNotification(
            `${author} · ${businessLabel} chat`,
            mapped.content.length > 120 ? `${mapped.content.slice(0, 117)}…` : mapped.content
          )
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile, chatOpen])
}
