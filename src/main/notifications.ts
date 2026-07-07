import { Notification, BrowserWindow, shell } from 'electron'

export type GieoNotificationPermission = 'granted' | 'denied' | 'not-determined' | 'unsupported'

export function getNotificationPermission(): GieoNotificationPermission {
  if (!Notification.isSupported()) return 'unsupported'
  return Notification.permission as GieoNotificationPermission
}

export async function requestNotificationPermission(): Promise<GieoNotificationPermission> {
  if (!Notification.isSupported()) return 'unsupported'
  const result = await Notification.requestPermission()
  return result as GieoNotificationPermission
}

export function showSystemNotification(
  title: string,
  body: string,
  options?: { silent?: boolean }
): { success: boolean; error?: string; skipped?: boolean } {
  if (!Notification.isSupported()) {
    return { success: false, error: 'Notifications are not supported on this system.' }
  }

  if (Notification.permission !== 'granted') {
    return { success: false, skipped: true, error: 'Notification permission not granted.' }
  }

  try {
    const notification = new Notification({
      title,
      body,
      silent: options?.silent ?? false
    })

    notification.on('click', () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) return
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    })

    notification.show()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function openNotificationSettings(): void {
  if (process.platform === 'darwin') {
    void shell
      .openExternal(
        'x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=com.gieo.crm'
      )
      .catch(() => {
        void shell.openExternal('x-apple.systempreferences:com.apple.preference.notifications')
      })
    return
  }

  if (process.platform === 'win32') {
    void shell.openExternal('ms-settings:notifications')
  }
}
