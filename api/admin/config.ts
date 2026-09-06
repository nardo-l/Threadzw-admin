import { json } from './_lib'

export default function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing = [
      !url ? 'SUPABASE_URL' : null,
      !anonKey ? 'SUPABASE_ANON_KEY' : null,
    ].filter(Boolean)

    return json({
      error: `Supabase configuration is missing: ${missing.join(', ')}.`,
      missing,
    }, 500)
  }

  return json({ url, anonKey })
}
