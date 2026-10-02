import { useEffect, useRef, useState } from 'react'
import { Send, Hash, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { inBusiness } from '@/lib/workspace'
import { formatRelativeTime } from '@/lib/utils'
import type { Message } from '@/lib/types'

export function TeamChat(): JSX.Element {
  const { messages, profile, sendMessage, activeTaskId, activeBusiness, chatError, fetchMessages } =
    useStore()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'global' | 'task'>('global')
  const bottomRef = useRef<HTMLDivElement>(null)

  const filteredMessages = mode === 'task' && activeTaskId
    ? messages.filter((m) => m.task_id === activeTaskId)
    : messages.filter((m) => !m.task_id && inBusiness(activeBusiness, m))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages.length])

  useEffect(() => {
    void fetchMessages()
  }, [fetchMessages])

  const retry = (msg: Message): void => {
    useStore.setState({ messages: useStore.getState().messages.filter((m) => m.id !== msg.id) })
    void sendMessage(msg.content, msg.task_id ?? null)
  }

  const handleSend = async (): Promise<void> => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')
    await sendMessage(trimmed, mode === 'task' ? activeTaskId : null)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-zinc-200" />
          <span className="text-sm font-medium">Team Comms</span>
          <Badge variant="secondary" className="text-[10px]">Live · all users</Badge>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={mode === 'global' ? 'secondary' : 'ghost'}
            className="h-7 text-xs"
            onClick={() => setMode('global')}
          >
            Global
          </Button>
          <Button
            size="sm"
            variant={mode === 'task' ? 'secondary' : 'ghost'}
            className="h-7 text-xs"
            onClick={() => setMode('task')}
          >
            <Hash className="h-3 w-3 mr-0.5" />
            Task
          </Button>
        </div>
      </div>

      {mode === 'task' && (
        <div className="px-4 py-2 border-b border-zinc-800">
          {activeTaskId ? (
            <Badge variant="secondary" className="text-xs">
              Task thread active
            </Badge>
          ) : (
            <p className="text-xs text-zinc-500">Select a task to view task-specific comments</p>
          )}
        </div>
      )}

      {chatError && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-[11px] text-red-300">
          Chat isn't syncing: {chatError}
        </div>
      )}

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {filteredMessages.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-8">No messages yet. Start the conversation — all team members will see it.</p>
          ) : (
            filteredMessages.map((msg) =>
              msg.message_type === 'system' ? (
                <div key={msg.id} className="flex justify-center py-1">
                  <div className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[11px] text-zinc-400 text-center max-w-[90%]">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium">
                      {msg.profile?.name?.charAt(0) ?? 'U'}
                    </div>
                    <span className="text-xs font-medium text-zinc-300">
                      {msg.profile?.name ?? 'Team Member'}
                      {msg.user_id === profile?.id && (
                        <span className="text-zinc-600 ml-1">(you)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 pl-8 leading-relaxed">{msg.content}</p>
                  {msg.failed && (
                    <button
                      type="button"
                      className="pl-8 text-[10px] text-red-400 hover:text-red-300"
                      onClick={() => retry(msg)}
                    >
                      Not sent · tap to retry
                    </button>
                  )}
                </div>
              )
            )
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'task' ? 'Comment on task...' : 'Message the team...'}
            className="h-9 text-sm"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => void handleSend()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
