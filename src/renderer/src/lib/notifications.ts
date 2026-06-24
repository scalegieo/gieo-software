export function showDesktopNotification(title: string, body: string): void {
  if (window.gieo?.showNotification) {
    void window.gieo.showNotification(title, body)
    return
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    void Notification.requestPermission().then((perm) => {
      if (perm === 'granted') new Notification(title, { body })
    })
  }
}
