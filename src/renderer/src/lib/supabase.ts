import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CONFIG } from './config'
import type { Profile, Lead, Client, Financial, Campaign, Task, Message } from './types'

const supabaseUrl = CONFIG.supabase.url
const supabaseAnonKey = CONFIG.supabase.anonKey

export const isSupabaseConfigured = true

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Profile; Update: Partial<Profile> }
      leads: { Row: Lead; Insert: Omit<Lead, 'id' | 'created_at'>; Update: Partial<Lead> }
      clients: { Row: Client; Insert: Omit<Client, 'id'>; Update: Partial<Client> }
      financials: { Row: Financial; Insert: Omit<Financial, 'id'>; Update: Partial<Financial> }
      campaigns: { Row: Campaign; Insert: Omit<Campaign, 'id'>; Update: Partial<Campaign> }
      tasks: { Row: Task; Insert: Omit<Task, 'id'>; Update: Partial<Task> }
      messages: { Row: Message; Insert: Omit<Message, 'id' | 'created_at'>; Update: Partial<Message> }
    }
  }
}

let supabaseInstance: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    })
  }
  return supabaseInstance
}

export const supabase = getSupabase()
