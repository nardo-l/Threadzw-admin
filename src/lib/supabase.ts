import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export let supabase: SupabaseClient | null = null
let initialization: Promise<SupabaseClient> | null = null

export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  supabase = client
  return client
}

export function initializeSupabase(): Promise<SupabaseClient> {
  if (supabase) return Promise.resolve(supabase)
  if (initialization) return initialization

  initialization = fetch('/api/admin/config', { headers: { Accept: 'application/json' } })
    .then(async (response) => {
      const body = await response.json().catch(() => ({})) as { url?: string; anonKey?: string; error?: string }
      if (!response.ok || !body.url || !body.anonKey) {
        throw new Error(body.error || 'Unable to load Supabase configuration.')
      }
      return createSupabaseClient(body.url, body.anonKey)
    })
    .catch((error) => {
      initialization = null
      throw error
    })

  return initialization
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase has not been initialized yet.')
  return supabase
}
