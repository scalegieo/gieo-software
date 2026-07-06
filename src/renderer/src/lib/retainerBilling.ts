import type { Client, ClientProfile, RetainerSchedule } from './types'
import { formatCurrency } from './types'

export interface BillingReminder {
  clientId: string
  company: string
  dueDate: Date
  amountCents: number
  daysUntil: number
  isOverdue: boolean
  isReminderWindow: boolean
  termMonths: number
  message: string
}

export interface ContactReminder {
  clientId: string
  company: string
  dueDate: Date
  daysUntil: number
  frequency: string
}

export function getTotalHours(profile: ClientProfile): number {
  const entryHours = (profile.time_entries ?? []).reduce((sum, e) => sum + e.hours, 0)
  const callHours = profile.call_logs.reduce((sum, c) => sum + c.duration_minutes / 60, 0)
  return Math.round((entryHours + callHours) * 10) / 10
}

export function getBillableHours(profile: ClientProfile): number {
  return (profile.time_entries ?? [])
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.hours, 0)
}

export function getHoursThisMonth(profile: ClientProfile): number {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const inMonth = (profile.time_entries ?? []).filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() === month && d.getFullYear() === year
  })
  return Math.round(inMonth.reduce((sum, e) => sum + e.hours, 0) * 10) / 10
}

export function computeNextBillingDate(schedule: RetainerSchedule, from = new Date()): Date {
  if (!schedule.next_billing_date) {
    const d = new Date(from)
    d.setMonth(d.getMonth() + 1)
    return d
  }
  const next = new Date(schedule.next_billing_date)
  while (next < from) {
    if (schedule.billing_cycle === 'quarterly') {
      next.setMonth(next.getMonth() + 3)
    } else {
      next.setMonth(next.getMonth() + 1)
    }
  }
  return next
}

export function getBillingReminder(
  client: Client,
  profile: ClientProfile,
  now = new Date()
): BillingReminder | null {
  const schedule = profile.retainer_schedule
  if (!schedule?.enabled) return null

  const dueDate = computeNextBillingDate(schedule, now)
  const ms = dueDate.getTime() - now.getTime()
  const daysUntil = Math.ceil(ms / 86400000)
  const isOverdue = daysUntil < 0
  const isReminderWindow = daysUntil >= 0 && daysUntil <= schedule.reminder_days_before

  if (!isOverdue && !isReminderWindow) return null

  const amount = schedule.monthly_amount_cents || client.mrr
  const amountLabel = formatCurrency(amount)

  let message: string
  if (isOverdue) {
    message = `Overdue — bill ${amountLabel} for ${client.company ?? client.name}`
  } else if (daysUntil === 0) {
    message = `Bill today: ${amountLabel} (${schedule.term_months}-mo retainer)`
  } else {
    message = `Bill in ${daysUntil}d: ${amountLabel} · ${schedule.term_months}-month term`
  }

  return {
    clientId: client.id,
    company: client.company ?? client.name ?? 'Client',
    dueDate,
    amountCents: amount,
    daysUntil,
    isOverdue,
    isReminderWindow,
    termMonths: schedule.term_months,
    message
  }
}

export function getAllBillingReminders(
  clients: Client[],
  profiles: Record<string, ClientProfile>
): BillingReminder[] {
  return clients
    .map((c) => {
      const profile = profiles[c.id]
      if (!profile) return null
      return getBillingReminder(c, profile)
    })
    .filter((r): r is BillingReminder => r !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

export function getUpcomingBillings(
  clients: Client[],
  profiles: Record<string, ClientProfile>,
  withinDays = 30
): BillingReminder[] {
  const now = new Date()
  return clients
    .filter((c) => c.status === 'active')
    .map((c) => {
      const profile = profiles[c.id]
      if (!profile?.retainer_schedule?.enabled) return null
      const dueDate = computeNextBillingDate(profile.retainer_schedule, now)
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
      if (daysUntil > withinDays) return null
      const amount = profile.retainer_schedule.monthly_amount_cents || c.mrr
      return {
        clientId: c.id,
        company: c.company ?? c.name ?? 'Client',
        dueDate,
        amountCents: amount,
        daysUntil,
        isOverdue: daysUntil < 0,
        isReminderWindow: daysUntil <= (profile.retainer_schedule.reminder_days_before ?? 7),
        termMonths: profile.retainer_schedule.term_months,
        message: `Bill ${formatCurrency(amount)} · due in ${daysUntil}d`
      } satisfies BillingReminder
    })
    .filter((r): r is BillingReminder => r !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

export function advanceBillingDate(schedule: RetainerSchedule): RetainerSchedule {
  const next = computeNextBillingDate(schedule)
  const following = new Date(next)
  if (schedule.billing_cycle === 'quarterly') {
    following.setMonth(following.getMonth() + 3)
  } else {
    following.setMonth(following.getMonth() + 1)
  }
  return {
    ...schedule,
    last_billed_date: next.toISOString(),
    next_billing_date: following.toISOString()
  }
}

export function formatContactFrequency(freq: RetainerSchedule['contact_frequency']): string {
  const map: Record<RetainerSchedule['contact_frequency'], string> = {
    weekly: 'Every week',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly'
  }
  return map[freq] ?? freq
}

export function getAgencyHoursThisMonth(profiles: Record<string, ClientProfile>): number {
  return Math.round(
    Object.values(profiles).reduce((sum, p) => sum + getHoursThisMonth(p), 0) * 10
  ) / 10
}

export function getAgencyTotalHours(profiles: Record<string, ClientProfile>): number {
  return Math.round(
    Object.values(profiles).reduce((sum, p) => sum + getTotalHours(p), 0) * 10
  ) / 10
}
