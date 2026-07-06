import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { GIEO_USERS } from '@/lib/auth'
import type { TaskPriority } from '@/lib/types'

export function CreateTaskDialog(): JSX.Element {
  const { createTask, clients } = useStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [clientId, setClientId] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = (): void => {
    setTitle('')
    setAssigneeId('')
    setPriority('medium')
    setDueDate('')
    setClientId('')
  }

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) return
    setSaving(true)
    await createTask({
      title: title.trim(),
      assignee_id: assigneeId || null,
      client_id: clientId || null,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      status: 'todo'
    })
    setSaving(false)
    reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs text-zinc-500">Task name</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finish homepage design" />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {GIEO_USERS.map((u) => (
                <option key={u.profile.id} value={u.profile.id}>
                  {u.profile.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Client (optional)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ?? c.name}
                </option>
              ))}
            </select>
          </div>
          <Button className="w-full" onClick={() => void handleSubmit()} disabled={saving || !title.trim()}>
            {saving ? 'Creating…' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
