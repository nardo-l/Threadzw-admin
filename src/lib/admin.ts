import { supabase } from './supabase'

export type AdminRole = 'super_admin' | 'operations_admin' | 'support_admin'

export async function getSession() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function signIn(email: string, password: string) {
  const client = supabase
  if (!client) throw new Error('Supabase is not configured.')
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Admin authorization is intentionally NOT derived from user-editable metadata.
 * Production mutations must be enforced by the server/API against admin_roles.
 */
export async function callAdminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const client = supabase
  if (!client) throw new Error('Supabase is not configured.')
  const { data } = await client.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('You must be signed in.')

  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Admin API request failed')
  return body as T
}
