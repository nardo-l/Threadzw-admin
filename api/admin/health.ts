import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await requireAdmin(new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/admin/health'}`, { method: req.method, headers: Object.fromEntries(Object.entries(req.headers).filter(([,v]) => typeof v === 'string').map(([k,v]) => [k, v as string])) }))
  if ('error' in result) { const r = result.error; res.status(r.status).send(await r.json()); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  const started = Date.now()
  const { error } = await result.admin.from('profiles').select('id').limit(1)
  res.status(error ? 503 : 200).json({ status: error ? 'degraded' : 'healthy', supabase: { status: error ? 'error' : 'ok' }, latencyMs: Date.now() - started, checkedAt: new Date().toISOString() })
}
