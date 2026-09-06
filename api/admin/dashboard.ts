import type { VercelRequest, VercelResponse } from '@vercel/node'
import { audit, requireAdmin, requestId } from './_lib'

function toRequest(req: VercelRequest) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  return new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/admin/dashboard'}`, { method: req.method, headers })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  const incoming = toRequest(req)
  const result = await requireAdmin(incoming)
  if ('error' in result) { const r = result.error; res.status(r.status).send(await r.json()); return }

  const { admin } = result
  const started = Date.now()
  const rid = requestId(incoming)
  const [profiles, shops, products, interests, visits, currentPremium, legacyPayments] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('shops').select('id,is_active,plan,premium_status,created_at', { count: 'exact' }),
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'whatsapp_click'),
    admin.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'shop_visit'),
    admin.from('shop_payments').select('id,amount,status,created_at,paid_at,provider_transaction_id,shop_id,plan').eq('amount', 9).order('created_at', { ascending: false }).limit(100),
    admin.from('shop_payments').select('id,amount,status,created_at,paid_at,provider_transaction_id,shop_id,plan').neq('amount', 9).order('created_at', { ascending: false }).limit(100),
  ])

  const queries = [profiles, shops, products, interests, visits, currentPremium, legacyPayments]
  if (queries.some(x => x.error)) { res.status(500).json({ error: 'Dashboard query failed', requestId: rid }); return }

  const shopRows = shops.data || []
  const current = currentPremium.data || []
  const revenue = current.filter(p => ['paid', 'completed', 'success'].includes(String(p.status).toLowerCase())).reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const premiumCount = shopRows.filter(s => s.plan === 'pro' || s.premium_status === 'active').length

  const body = {
    metrics: {
      totalSellers: profiles.count || 0,
      activeShops: shopRows.filter(s => s.is_active).length,
      products: products.count || 0,
      premiumRevenue: revenue,
      premiumSellers: premiumCount,
      freeSellers: Math.max(0, (profiles.count || 0) - premiumCount),
      customerInterests: interests.count || 0,
      storefrontVisits: visits.count || 0,
    },
    payments: current.slice(0, 10),
    legacyPayments: legacyPayments.data || [],
    latencyMs: Date.now() - started,
    requestId: rid,
  }

  await audit({ admin, userId: result.user.id, role: result.role, action: 'dashboard.view', requestId: rid })
  res.status(200).json(body)
}
