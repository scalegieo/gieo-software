import type { WhiteboardItem, WhiteboardConnection } from '@/lib/types'

const ITEMS_KEY = 'gieo_whiteboard_items'
const CONNS_KEY = 'gieo_whiteboard_connections'

export function loadWhiteboardItems(): WhiteboardItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY)
    return raw ? (JSON.parse(raw) as WhiteboardItem[]) : []
  } catch {
    return []
  }
}

export function saveWhiteboardItems(items: WhiteboardItem[]): void {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
}

export function loadWhiteboardConnections(): WhiteboardConnection[] {
  try {
    const raw = localStorage.getItem(CONNS_KEY)
    return raw ? (JSON.parse(raw) as WhiteboardConnection[]) : []
  } catch {
    return []
  }
}

export function saveWhiteboardConnections(conns: WhiteboardConnection[]): void {
  localStorage.setItem(CONNS_KEY, JSON.stringify(conns))
}
