import type { VercelRequest, VercelResponse } from '@vercel/node'
import { audit, json, requireAdmin, requestId } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await requireAdmin(new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/admin/dashboard'}`, { method: req.method, headers: Object.fromEntries(Object.entries(req.headers).filter(([,v]) => typeof v === 'string').map(([k,v]) => [k, v as string])) }))
  if ('error' in result) { const r = result.error; res.status(r.status).send(await r.json()); return }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  const { admin } = result
  const started = Date.now()
  const [profiles, shops, products, events, currentPayments, legacyPayments] = await Promise.all([
    admin.from('profiles').select('id,created_at', { count: 'exact', head: true }),
    admin.from('shops').select('id,is_active,plan,premium_status,created_at', { count: 'exact' }),
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('analytics_events').select('id,event_type', { count: 'exact', head: true }),
    admin.from('shop_payments').select('id,amount,status,created_at,paid_at,provider_transaction_id,shop_id').eq('amount', 9).order('created_at', { ascending: false }).limit(100),
    admin.from('shop_payments').select('id,amount,status,created_at,paid_at,provider_transaction_id,shop_id').neq('amount', 9).order('created_at', { ascending: false }).limit(100),
  ])
  const errors = [profiles,shops,products,events,currentPayments,legacyPayments].filter(x => x.error)
  if (errors.length) { res.status(500).json({ error: 'Dashboard query failed' }); return }
  const shopRows = shops.data || []
  const current = currentPayments.data || []
  const revenue = current.filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'success').reduce((s,p) => s + Number(p.amount || 0), 0)
  const resultBody = {
    metrics: {
      sellers: profiles.count || 0,
      shops: shops.count || 0,
      activeShops: shopRows.filter(s => s.is_active).length,
      products: products.count || 0,
      premium: shopRows.filter(s => s.plan === 'pro' || s.premium_status === 'active').length,
      free: shopRows.filter(s => !(s.plan === 'pro' || s.premium_status === 'active')).length,
      customerInterests: (events.count || 0),
      premiumRevenue: revenue,
    },
    payments: current.slice(0, 10),
    legacyPayments: legacyPayments.data || [],
    latencyMs: Date.now() - started,
    requestId: requestId(new Request('https://local')),
  }
  await audit({ admin, userId: result.user.id, role: result.role, action: 'dashboard.view', requestId: resultBody.requestId })
  res.status(200).json(resultBody)
}
