import { useState, useEffect } from 'react'
import { Plus, Phone, Calendar, Trash2, Save, Key, CheckCircle2, Circle, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/store/useStore'
import {
  SERVICE_OPTIONS,
  CALL_OUTCOMES,
  PLATFORM_LABELS,
  type Client,
  type ClientProfile,
  type MeetingNote,
  type CallLog,
  type PlatformLogin,
  type PlatformType
} from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      {children}
    </div>
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}): JSX.Element {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 resize-none"
    />
  )
}

export function ClientProfilePanel({ client }: { client: Client }): JSX.Element {
  const { getClientProfile, updateClientProfile, startClientClose, toggleCloseChecklistItem, completeClientProject, clientProfiles } = useStore()
  const profile = getClientProfile(client.id)
  const [draft, setDraft] = useState<ClientProfile>(profile)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(getClientProfile(client.id))
  }, [client.id, getClientProfile, clientProfiles[client.id]?.updated_at, clientProfiles[client.id]?.project_status])

  const patch = (updates: Partial<ClientProfile>): void => {
    setDraft((prev) => ({ ...prev, ...updates }))
    setSaved(false)
  }

  const toggleService = (service: string): void => {
    const services = draft.services.includes(service)
      ? draft.services.filter((s) => s !== service)
      : [...draft.services, service]
    patch({ services })
  }

  const save = (): void => {
    updateClientProfile(client.id, draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addMeeting = (): void => {
    const note: MeetingNote = {
      id: `mtg-${Date.now()}`,
      date: new Date().toISOString(),
      title: 'New meeting',
      notes: '',
      attendees: ''
    }
    patch({ meeting_notes: [note, ...draft.meeting_notes] })
  }

  const updateMeeting = (id: string, updates: Partial<MeetingNote>): void => {
    patch({
      meeting_notes: draft.meeting_notes.map((m) => (m.id === id ? { ...m, ...updates } : m))
    })
  }

  const removeMeeting = (id: string): void => {
    patch({ meeting_notes: draft.meeting_notes.filter((m) => m.id !== id) })
  }

  const addCall = (): void => {
    const call: CallLog = {
      id: `call-${Date.now()}`,
      date: new Date().toISOString(),
      duration_minutes: 15,
      notes: '',
      outcome: 'connected'
    }
    patch({ call_logs: [call, ...draft.call_logs] })
  }

  const updateCall = (id: string, updates: Partial<CallLog>): void => {
    patch({
      call_logs: draft.call_logs.map((c) => (c.id === id ? { ...c, ...updates } : c))
    })
  }

  const removeCall = (id: string): void => {
    patch({ call_logs: draft.call_logs.filter((c) => c.id !== id) })
  }

  const logins = draft.platform_logins ?? []

  const addLogin = (): void => {
    const login: PlatformLogin = {
      id: `login-${Date.now()}`,
      platform: 'meta_ads',
      label: 'Meta Ads Manager',
      username: '',
      password: '',
      url: '',
      notes: ''
    }
    patch({ platform_logins: [...logins, login] })
  }

  const updateLogin = (id: string, updates: Partial<PlatformLogin>): void => {
    patch({ platform_logins: logins.map((l) => (l.id === id ? { ...l, ...updates } : l)) })
  }

  const removeLogin = (id: string): void => {
    patch({ platform_logins: logins.filter((l) => l.id !== id) })
  }

  const closeItems = draft.close_checklist ?? []
  const closeDone = closeItems.filter((i) => i.completed).length
  const canComplete = draft.project_status === 'closing' && closeItems.length > 0 && closeDone === closeItems.length

  return (
    <ScrollArea className="h-[min(520px,60vh)] pr-3">
      <div className="space-y-6 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Auto-created profile · last updated {formatDate(draft.updated_at)}</p>
          <Button size="sm" onClick={save} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saved ? 'Saved' : 'Save Profile'}
          </Button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Primary Contact">
            <Input
              value={draft.primary_contact || client.name || ''}
              onChange={(e) => patch({ primary_contact: e.target.value })}
              placeholder="Contact name"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="contact@company.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </Field>
          <Field label="Website">
            <Input
              value={draft.website}
              onChange={(e) => patch({ website: e.target.value })}
              placeholder="https://"
            />
          </Field>
          <Field label="Industry">
            <Input
              value={draft.industry}
              onChange={(e) => patch({ industry: e.target.value })}
              placeholder="e.g. SaaS, E-commerce"
            />
          </Field>
          <Field label="Timezone">
            <Input
              value={draft.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
              placeholder="America/New_York"
            />
          </Field>
          <Field label="Contract Start">
            <Input
              type="date"
              value={draft.contract_start?.slice(0, 10) ?? ''}
              onChange={(e) => patch({ contract_start: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </Field>
          <Field label="Next Follow-up">
            <Input
              type="date"
              value={draft.next_follow_up?.slice(0, 10) ?? ''}
              onChange={(e) => patch({ next_follow_up: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </Field>
        </section>

        <section>
          <p className="text-xs font-medium text-zinc-500 mb-2">Preferred Contact</p>
          <div className="flex flex-wrap gap-2">
            {(['email', 'phone', 'slack', 'whatsapp'] as const).map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => patch({ communication_preference: pref })}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs capitalize transition-colors',
                  draft.communication_preference === pref
                    ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {pref}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs font-medium text-zinc-500 mb-2">Services Requested</p>
          <div className="flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map((service) => (
              <button
                key={service}
                type="button"
                onClick={() => toggleService(service)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  draft.services.includes(service)
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                )}
              >
                {service}
              </button>
            ))}
          </div>
        </section>

        <Field label="Retainer Notes">
          <TextArea
            value={draft.retainer_notes}
            onChange={(v) => patch({ retainer_notes: v })}
            placeholder="Scope, deliverables, billing cycle..."
          />
        </Field>

        <Field label="Internal Notes">
          <TextArea
            value={draft.internal_notes}
            onChange={(v) => patch({ internal_notes: v })}
            placeholder="Team-only notes, red flags, upsell opportunities..."
          />
        </Field>

        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <h4 className="text-sm font-medium">Meeting Notes</h4>
              <Badge variant="secondary">{draft.meeting_notes.length}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={addMeeting} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {draft.meeting_notes.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center border border-dashed border-zinc-800 rounded-md">
                No meetings logged yet
              </p>
            ) : (
              draft.meeting_notes.map((mtg) => (
                <div key={mtg.id} className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      className="h-8 text-xs w-36"
                      value={mtg.date.slice(0, 10)}
                      onChange={(e) => updateMeeting(mtg.id, { date: new Date(e.target.value).toISOString() })}
                    />
                    <Input
                      className="h-8 text-xs flex-1"
                      value={mtg.title}
                      onChange={(e) => updateMeeting(mtg.id, { title: e.target.value })}
                      placeholder="Meeting title"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeMeeting(mtg.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                  <Input
                    className="h-8 text-xs"
                    value={mtg.attendees}
                    onChange={(e) => updateMeeting(mtg.id, { attendees: e.target.value })}
                    placeholder="Attendees"
                  />
                  <TextArea
                    value={mtg.notes}
                    onChange={(v) => updateMeeting(mtg.id, { notes: v })}
                    placeholder="Discussion notes, decisions, action items..."
                    rows={2}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-medium">Call Log</h4>
              <Badge variant="secondary">{draft.call_logs.length}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={addCall} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Log Call
            </Button>
          </div>
          <div className="space-y-3">
            {draft.call_logs.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center border border-dashed border-zinc-800 rounded-md">
                No calls logged yet
              </p>
            ) : (
              draft.call_logs.map((call) => (
                <div key={call.id} className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="datetime-local"
                      className="h-8 text-xs w-44"
                      value={call.date.slice(0, 16)}
                      onChange={(e) => updateCall(call.id, { date: new Date(e.target.value).toISOString() })}
                    />
                    <Input
                      type="number"
                      className="h-8 text-xs w-24"
                      value={call.duration_minutes}
                      onChange={(e) => updateCall(call.id, { duration_minutes: Number(e.target.value) })}
                      placeholder="min"
                    />
                    <select
                      value={call.outcome}
                      onChange={(e) => updateCall(call.id, { outcome: e.target.value as CallLog['outcome'] })}
                      className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300"
                    >
                      {CALL_OUTCOMES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => removeCall(call.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                  <TextArea
                    value={call.notes}
                    onChange={(v) => updateCall(call.id, { notes: v })}
                    placeholder="Call summary..."
                    rows={2}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-medium">Platform Logins</h4>
              <Badge variant="secondary">{logins.length}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={addLogin} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Add Login
            </Button>
          </div>
          <div className="space-y-3">
            {logins.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4 text-center border border-dashed border-zinc-800 rounded-md">
                Store Instagram, Meta Ads, email credentials per client
              </p>
            ) : (
              logins.map((login) => (
                <div key={login.id} className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={login.platform}
                      onChange={(e) => updateLogin(login.id, { platform: e.target.value as PlatformType, label: PLATFORM_LABELS[e.target.value as PlatformType] })}
                      className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300"
                    >
                      {(Object.keys(PLATFORM_LABELS) as PlatformType[]).map((p) => (
                        <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                      ))}
                    </select>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => removeLogin(login.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input className="h-8 text-xs" placeholder="Username / email" value={login.username} onChange={(e) => updateLogin(login.id, { username: e.target.value })} />
                    <Input className="h-8 text-xs" type="password" placeholder="Password" value={login.password} onChange={(e) => updateLogin(login.id, { password: e.target.value })} />
                  </div>
                  <Input className="h-8 text-xs" placeholder="URL (optional)" value={login.url} onChange={(e) => updateLogin(login.id, { url: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="Notes" value={login.notes} onChange={(e) => updateLogin(login.id, { notes: e.target.value })} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-medium">Close Project</h4>
              {draft.project_status === 'completed' && <Badge variant="success">Completed</Badge>}
            </div>
            {draft.project_status === 'active' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startClientClose(client.id)}>
                Start Close Process
              </Button>
            )}
          </div>
          {draft.project_status === 'closing' && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">{closeDone}/{closeItems.length} offboarding steps</p>
              {closeItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleCloseChecklistItem(client.id, item.id)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-800/50 text-sm"
                >
                  {item.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-zinc-600 shrink-0" />}
                  <span className={item.completed ? 'line-through text-zinc-500' : ''}>{item.label}</span>
                </button>
              ))}
              <Button className="w-full mt-2 gap-1" disabled={!canComplete} onClick={() => { save(); completeClientProject(client.id) }}>
                <PartyPopper className="h-4 w-4" />
                Finish Project & Celebrate
              </Button>
            </div>
          )}
        </section>
      </div>
    </ScrollArea>
  )
}
