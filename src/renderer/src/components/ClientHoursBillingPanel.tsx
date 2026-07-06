import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, CalendarClock, Bell, DollarSign, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import {
  TIME_ENTRY_CATEGORIES,
  formatCurrency,
  type Client,
  type ClientProfile,
  type TimeEntry,
  type RetainerSchedule
} from '@/lib/types'
import {
  getTotalHours,
  getBillableHours,
  getHoursThisMonth,
  getBillingReminder,
  computeNextBillingDate,
  advanceBillingDate,
  formatContactFrequency
} from '@/lib/retainerBilling'
import { formatDate, cn } from '@/lib/utils'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-zinc-100 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export function ClientHoursBillingPanel({ client }: { client: Client }): JSX.Element {
  const { getClientProfile, updateClientProfile, clientProfiles, postSystemMessage, profile: loggedInUser } = useStore()
  const profile = getClientProfile(client.id)
  const [draft, setDraft] = useState<ClientProfile>(profile)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(getClientProfile(client.id))
  }, [client.id, getClientProfile, clientProfiles[client.id]?.updated_at])

  const patch = (updates: Partial<ClientProfile>): void => {
    setDraft((prev) => ({ ...prev, ...updates }))
    setSaved(false)
  }

  const patchSchedule = (updates: Partial<RetainerSchedule>): void => {
    patch({ retainer_schedule: { ...draft.retainer_schedule, ...updates } })
  }

  const save = (): void => {
    updateClientProfile(client.id, draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const markBilled = (): void => {
    const next = advanceBillingDate(draft.retainer_schedule)
    const updated = { ...draft, retainer_schedule: next }
    setDraft(updated)
    updateClientProfile(client.id, updated)
    postSystemMessage(
      `Billed ${client.company ?? client.name} ${formatCurrency(next.monthly_amount_cents || client.mrr)} — next due ${formatDate(next.next_billing_date ?? '')}`,
      true
    )
  }

  const addTimeEntry = (): void => {
    const entry: TimeEntry = {
      id: `time-${Date.now()}`,
      date: new Date().toISOString(),
      hours: 1,
      category: 'ads',
      billable: true,
      notes: '',
      team_member: loggedInUser?.name ?? ''
    }
    patch({ time_entries: [entry, ...(draft.time_entries ?? [])] })
  }

  const updateEntry = (id: string, updates: Partial<TimeEntry>): void => {
    patch({
      time_entries: (draft.time_entries ?? []).map((e) => (e.id === id ? { ...e, ...updates } : e))
    })
  }

  const removeEntry = (id: string): void => {
    patch({ time_entries: (draft.time_entries ?? []).filter((e) => e.id !== id) })
  }

  const reminder = getBillingReminder(client, draft)
  const nextBill = computeNextBillingDate(draft.retainer_schedule)
  const totalHours = getTotalHours(draft)
  const billableHours = getBillableHours(draft)
  const monthHours = getHoursThisMonth(draft)
  const schedule = draft.retainer_schedule

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Hours, retainer billing & contact schedule</p>
        <Button size="sm" onClick={save} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>

      {reminder && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3',
            reminder.isOverdue
              ? 'border-red-500/40 bg-red-500/10'
              : 'border-amber-500/40 bg-amber-500/10'
          )}
        >
          <Bell className={cn('h-4 w-4 shrink-0 mt-0.5', reminder.isOverdue ? 'text-red-400' : 'text-amber-400')} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100">{reminder.message}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {schedule.term_months}-month retainer · remind {schedule.reminder_days_before} days before ·{' '}
              {formatContactFrequency(schedule.contact_frequency)} contact
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={markBilled}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Mark billed
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total hours" value={`${totalHours}h`} sub="All time on account" />
        <StatCard label="This month" value={`${monthHours}h`} sub="Logged this month" />
        <StatCard label="Billable" value={`${Math.round(billableHours * 10) / 10}h`} sub="Billable entries" />
        <StatCard
          label="Monthly retainer"
          value={formatCurrency(schedule.monthly_amount_cents || client.mrr)}
          sub={`${schedule.term_months}-mo term`}
        />
      </div>

      <section className="rounded-lg border border-zinc-800 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-violet-400" />
          <h4 className="text-sm font-medium">Retainer & billing schedule</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Term length (months)</span>
            <Input
              type="number"
              min={1}
              max={24}
              className="h-8 text-sm"
              value={schedule.term_months}
              onChange={(e) => patchSchedule({ term_months: Number(e.target.value) || 1 })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Monthly bill amount ($)</span>
            <Input
              type="number"
              min={0}
              step={100}
              className="h-8 text-sm"
              value={(schedule.monthly_amount_cents || client.mrr) / 100}
              onChange={(e) =>
                patchSchedule({ monthly_amount_cents: Math.round(Number(e.target.value) * 100) })
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Remind before billing (days)</span>
            <Input
              type="number"
              min={1}
              max={30}
              className="h-8 text-sm"
              value={schedule.reminder_days_before}
              onChange={(e) => patchSchedule({ reminder_days_before: Number(e.target.value) || 7 })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Billing cycle</span>
            <select
              value={schedule.billing_cycle}
              onChange={(e) =>
                patchSchedule({ billing_cycle: e.target.value as RetainerSchedule['billing_cycle'] })
              }
              className="flex h-8 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Next billing date</span>
            <Input
              type="date"
              className="h-8 text-sm"
              value={schedule.next_billing_date?.slice(0, 10) ?? nextBill.toISOString().slice(0, 10)}
              onChange={(e) =>
                patchSchedule({
                  next_billing_date: e.target.value ? new Date(e.target.value).toISOString() : null
                })
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Client contact frequency</span>
            <select
              value={schedule.contact_frequency}
              onChange={(e) =>
                patchSchedule({
                  contact_frequency: e.target.value as RetainerSchedule['contact_frequency']
                })
              }
              className="flex h-8 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Next contact date</span>
            <Input
              type="date"
              className="h-8 text-sm"
              value={schedule.next_contact_date?.slice(0, 10) ?? ''}
              onChange={(e) =>
                patchSchedule({
                  next_contact_date: e.target.value ? new Date(e.target.value).toISOString() : null
                })
              }
            />
          </label>
          <label className="space-y-1 flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer pb-1">
              <input
                type="checkbox"
                checked={schedule.auto_renew}
                onChange={(e) => patchSchedule({ auto_renew: e.target.checked })}
                className="rounded border-zinc-600"
              />
              Auto-renew retainer
            </label>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-zinc-500 pt-1 border-t border-zinc-800">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Next bill: {formatDate(nextBill.toISOString())} · {formatCurrency(schedule.monthly_amount_cents || client.mrr)}
          </span>
          {schedule.last_billed_date && (
            <span>Last billed: {formatDate(schedule.last_billed_date)}</span>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" />
            <h4 className="text-sm font-medium">Time log</h4>
            <Badge variant="secondary">{(draft.time_entries ?? []).length} entries</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={addTimeEntry} className="gap-1 h-7 text-xs">
            <Plus className="h-3 w-3" /> Log hours
          </Button>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {(draft.time_entries ?? []).length === 0 ? (
            <p className="text-xs text-zinc-600 py-6 text-center border border-dashed border-zinc-800 rounded-md">
              No hours logged — track strategy, creative, ads, reporting time per client
            </p>
          ) : (
            (draft.time_entries ?? []).map((entry) => (
              <div key={entry.id} className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    type="date"
                    className="h-8 text-xs w-36"
                    value={entry.date.slice(0, 10)}
                    onChange={(e) =>
                      updateEntry(entry.id, { date: new Date(e.target.value).toISOString() })
                    }
                  />
                  <Input
                    type="number"
                    step={0.25}
                    min={0.25}
                    className="h-8 text-xs w-20"
                    value={entry.hours}
                    onChange={(e) => updateEntry(entry.id, { hours: Number(e.target.value) })}
                  />
                  <span className="text-xs text-zinc-500">hrs</span>
                  <select
                    value={entry.category}
                    onChange={(e) =>
                      updateEntry(entry.id, { category: e.target.value as TimeEntry['category'] })
                    }
                    className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs"
                  >
                    {TIME_ENTRY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="h-8 text-xs w-24"
                    placeholder="Team"
                    value={entry.team_member ?? ''}
                    onChange={(e) => updateEntry(entry.id, { team_member: e.target.value })}
                  />
                  <label className="flex items-center gap-1 text-xs text-zinc-400 ml-auto">
                    <input
                      type="checkbox"
                      checked={entry.billable}
                      onChange={(e) => updateEntry(entry.id, { billable: e.target.checked })}
                    />
                    Billable
                  </label>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => removeEntry(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
                <Input
                  className="h-8 text-xs"
                  placeholder="What was done?"
                  value={entry.notes}
                  onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
