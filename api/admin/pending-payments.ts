import type { VercelRequest, VercelResponse } from '@vercel/node'
import { audit, requireAdmin } from './_lib'

function toRequest(req: VercelRequest) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  return new Request(`https://${req.headers.host || 'localhost'}${req.url || '/api/admin/pending-payments'}`, { method: req.method, headers, body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {}) })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const incoming = toRequest(req)
  const result = await requireAdmin(incoming)
  if ('error' in result) { const r = result.error; res.status(r.status).send(await r.json()); return }
  const { admin, user, role } = result

  if (req.method === 'GET') {
    const { data, error } = await admin.from('shops')
      .select('id,name,slug,owner_id,account_status,plan,payment_status,payment_verification_status,payment_reference,payment_amount,payment_currency,payment_submitted_at,city')
      .eq('payment_verification_status', 'pending')
      .order('payment_submitted_at', { ascending: true })
    if (error) { res.status(500).json({ error: error.message }); return }

    const payments = await Promise.all((data || []).map(async shop => {
      const authUser = await admin.auth.admin.getUserById(shop.owner_id)
      return { ...shop, owner_email: authUser.data.user?.email || null }
    }))
    res.status(200).json({ success: true, payments })
    return
  }

  if (req.method === 'POST') {
    const shopId = String(req.body?.shopId || '')
    const action = String(req.body?.action || 'approve')
    if (!shopId || !['approve', 'reject'].includes(action)) { res.status(400).json({ error: 'shopId and a valid action are required' }); return }

    const { data: shop, error: shopError } = await admin.from('shops').select('*').eq('id', shopId).maybeSingle()
    if (shopError || !shop) { res.status(404).json({ error: 'Shop not found' }); return }

    const previousState = { account_status: shop.account_status, plan: shop.plan, payment_status: shop.payment_status, payment_verification_status: shop.payment_verification_status, product_limit: shop.product_limit, is_active: shop.is_active, storefront_published: shop.storefront_published }
    const now = new Date().toISOString()

    if (action === 'approve') {
      const { error } = await admin.from('shops').update({
        account_status: 'active', plan: 'premium', premium_status: 'active', product_limit: null,
        payment_required: false, payment_status: 'paid', payment_verification_status: 'approved',
        payment_verified_at: now, payment_verified_by: user.id, paid_at: now, subscription_status: 'active',
        is_active: true, storefront_published: true, published_at: now, updated_at: now
      }).eq('id', shopId)
      if (error) { res.status(500).json({ error: error.message }); return }

      const { error: subError } = await admin.from('subscriptions').update({ status: 'active', plan: 'premium', amount: 9, currency: 'USD', billing_cycle: 'none', subscription_started_at: now, current_period_start: now, current_period_end: null, updated_at: now }).eq('shop_id', shopId)
      if (subError) { res.status(500).json({ error: subError.message }); return }

      await admin.from('payment_events').insert({ shop_id: shopId, owner_id: shop.owner_id, provider: 'nardopay', event_type: 'manual_admin_approval', amount: 9, currency: 'USD', payload: { payment_reference: shop.payment_reference, approved_by: user.id, approved_at: now }, signature_verified: false, processed: true, processed_at: now })
      await audit({ admin, userId: user.id, role, action: 'payment.approve', targetType: 'shop', targetId: shopId, previousState, newState: { account_status: 'active', plan: 'premium', payment_status: 'paid', payment_verification_status: 'approved', product_limit: null, is_active: true, storefront_published: true } })
      res.status(200).json({ success: true, message: 'Payment approved and shop is live.' })
      return
    }

    const { error } = await admin.from('shops').update({ account_status: 'free', payment_status: 'unpaid', payment_verification_status: 'rejected', payment_verified_at: null, payment_verified_by: null, product_limit: 0, subscription_status: 'inactive', updated_at: now }).eq('id', shopId)
    if (error) { res.status(500).json({ error: error.message }); return }
    await audit({ admin, userId: user.id, role, action: 'payment.reject', targetType: 'shop', targetId: shopId, previousState, newState: { account_status: 'free', payment_status: 'unpaid', payment_verification_status: 'rejected', product_limit: 0 } })
    res.status(200).json({ success: true, message: 'Payment rejected.' })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
