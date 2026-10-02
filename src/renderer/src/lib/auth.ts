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
    username: 'sulay',
    password: 'gieo2',
    profile: { id: 'a1000006-0000-4000-8000-000000000006', role: 'member', name: 'Sulay' }
  },
  {
    username: 'ethan',
    password: 'gieo3',
    profile: { id: 'a1000007-0000-4000-8000-000000000007', role: 'member', name: 'Ethan' }
  },
  {
    username: 'jacob',
    password: 'gieo4',
    profile: { id: 'a1000008-0000-4000-8000-000000000008', role: 'member', name: 'Jacob' }
  },
  {
    username: 'dolev',
    password: 'gieo5',
    profile: { id: 'a1000009-0000-4000-8000-000000000009', role: 'member', name: 'Dolev' }
  },
  {
    username: 'shalom',
    password: 'gieo6',
    profile: { id: 'a1000010-0000-4000-8000-000000000010', role: 'member', name: 'Shalom' }
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

export function getProfileById(userId: string): Profile | undefined {
  return GIEO_USERS.find((u) => u.profile.id === userId)?.profile
}
