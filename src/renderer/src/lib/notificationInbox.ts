const STORAGE_KEY = 'gieo-notifications-last-read'

export function getNotificationsLastRead(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function markNotificationsRead(): void {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  } catch {
    /* ignore */
  }
}

export function isAfterLastRead(isoDate: string, lastRead: string): boolean {
  if (!lastRead) return true
  return new Date(isoDate).getTime() > new Date(lastRead).getTime()
}
