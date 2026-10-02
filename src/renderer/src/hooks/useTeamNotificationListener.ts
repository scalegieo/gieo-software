import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { getProfileById } from '@/lib/auth'
import { mapDbMessage } from '@/lib/messages'
import { showDesktopNotification, areSystemNotificationsEnabled } from '@/lib/notifications'
import type { Message } from '@/lib/types'

/** Live team chat sync + Mac system notifications, active for the whole session. */
export function useTeamNotificationListener(): void {
  const profileId = useStore((s) => s.profile?.id)
  const chatOpen = useStore((s) => s.chatOpen)
  const chatOpenRef = useRef(chatOpen)
  chatOpenRef.current = chatOpen

  useEffect(() => {
    if (!profileId) return

    const channel = supabase
      .channel('gieo-team-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as Message
          const mapped = mapDbMessage({
            ...row,
            profiles: getProfileById(row.user_id) ?? null
          })
          useStore.getState().addMessage(mapped)

          if (row.user_id === profileId || !areSystemNotificationsEnabled()) return

          const businessLabel = mapped.business === 'python' ? 'Python' : 'GIEO'

          if (mapped.message_type === 'system') {
            void showDesktopNotification(businessLabel, mapped.content)
            return
          }

          if (chatOpenRef.current && document.hasFocus()) return

          const author = mapped.profile?.name ?? 'Team'
          void showDesktopNotification(
            `${author} · ${businessLabel} chat`,
            mapped.content.length > 120 ? `${mapped.content.slice(0, 117)}…` : mapped.content
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void useStore.getState().fetchMessages()
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profileId])
}
