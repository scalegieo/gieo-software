export type NotificationPermission = 'granted' | 'denied' | 'not-determined' | 'unsupported'

const ENABLED_KEY = 'gieo_system_notifications_enabled'

export function areSystemNotificationsEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) !== 'false'
}

export function setSystemNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function getSystemNotificationPermission(): Promise<NotificationPermission> {
  if (!window.gieo?.getNotificationPermission) return 'unsupported'
  const result = await window.gieo.getNotificationPermission()
  return result.permission
}

export async function requestSystemNotificationPermission(): Promise<NotificationPermission> {
  if (!window.gieo?.requestNotificationPermission) return 'unsupported'
  const result = await window.gieo.requestNotificationPermission()
  if (result.permission === 'granted') {
    setSystemNotificationsEnabled(true)
  }
  return result.permission
}

export async function openSystemNotificationSettings(): Promise<void> {
  await window.gieo?.openNotificationSettings?.()
}

export async function showDesktopNotification(title: string, body: string): Promise<void> {
  if (!areSystemNotificationsEnabled()) return

  if (window.gieo?.showNotification) {
    const result = await window.gieo.showNotification(title, body)
    if (result.success || result.skipped) return
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (!window.gieo?.showNotification) return false
  const result = await window.gieo.showNotification(
    'GIEO CRM',
    'Mac notifications are on — you’ll get alerts for tasks and team chat.'
  )
  return result.success === true
}
