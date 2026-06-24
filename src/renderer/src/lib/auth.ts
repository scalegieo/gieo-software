import type { Profile } from './types'

export interface GieoUser {
  username: string
  password: string
  profile: Profile
}

/** Username + password login — no email required in the UI */
export const GIEO_USERS: GieoUser[] = [
  {
    username: 'reda',
    password: 'gieo1',
    profile: { id: 'a1000001-0000-4000-8000-000000000001', role: 'admin', name: 'Reda' }
  },
  {
    username: 'yoni',
    password: 'gieo2',
    profile: { id: 'a1000002-0000-4000-8000-000000000002', role: 'media_buyer', name: 'Yoni' }
  },
  {
    username: 'yeab',
    password: 'gieo3',
    profile: { id: 'a1000003-0000-4000-8000-000000000003', role: 'sales', name: 'Yeab' }
  },
  {
    username: 'natu',
    password: 'gieo4',
    profile: { id: 'a1000004-0000-4000-8000-000000000004', role: 'ops', name: 'Natu' }
  },
  {
    username: 'lydia',
    password: 'gieo5',
    profile: { id: 'a1000005-0000-4000-8000-000000000005', role: 'creative', name: 'Lydia' }
  }
]

const SESSION_KEY = 'gieo_session'

export function validateCredentials(username: string, password: string): GieoUser | null {
  const normalized = username.trim().toLowerCase()
  const user = GIEO_USERS.find((u) => u.username === normalized && u.password === password)
  return user ?? null
}

export function saveSession(username: string): void {
  localStorage.setItem(SESSION_KEY, username.toLowerCase())
}

export function loadSession(): GieoUser | null {
  const username = localStorage.getItem(SESSION_KEY)
  if (!username) return null
  return GIEO_USERS.find((u) => u.username === username) ?? null
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
