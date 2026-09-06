import { createClient } from '@supabase/supabase-js'
import { json } from './_lib'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: Request) {
  if (!url || !serviceKey) return json({ error: 'Server is not configured.' }, 500)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  if (req.method === 'GET') {
    const { count, error } = await admin.from('admin_roles').select('user_id', { count: 'exact', head: true }).eq('active', true)
    if (error) return json({ error: 'Unable to check admin setup.' }, 500)
    return json({ available: (count ?? 0) === 0 })
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) return json({ error: 'Email and password are required.' }, 400)
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)

    const { count, error: countError } = await admin.from('admin_roles').select('user_id', { count: 'exact', head: true }).eq('active', true)
    if (countError) return json({ error: 'Unable to check admin bootstrap state.' }, 500)
    if ((count ?? 0) > 0) return json({ error: 'Admin setup is already complete. New admin signups are disabled.' }, 403)

    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (createError || !created.user) return json({ error: createError?.message || 'Unable to create admin account.' }, 400)

    const { data: claimed, error: claimError } = await admin.rpc('claim_first_admin', { p_user_id: created.user.id })
    if (claimError || !claimed) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Admin setup has already been claimed. New admin signups are disabled.' }, 409)
    }

    return json({ ok: true, message: 'Admin account created. You can now sign in.' }, 201)
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }
}
