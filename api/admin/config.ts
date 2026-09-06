import { json } from './_lib'

export default function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) return json({ error: 'Supabase server configuration is missing.' }, 500)

  // The Supabase anon/publishable key is intentionally safe for browser use.
  // It is returned at runtime so no VITE_* environment variable is required.
  return json({ url, anonKey })
}
