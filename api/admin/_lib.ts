import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

export async function requireAdmin(req: Request) {
  if (!url || !serviceKey) return { error: json({ error: 'Server is not configured.' }, 500) }
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return { error: json({ error: 'Unauthorized' }, 401) }
  const token = auth.slice(7)
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return { error: json({ error: 'Unauthorized' }, 401) }
  const { data: role, error: roleError } = await admin.from('admin_roles').select('role,active').eq('user_id', user.id).maybeSingle()
  if (roleError || !role?.active) return { error: json({ error: 'Forbidden' }, 403) }
  return { admin, user, role: role.role }
}

export function requestId(req: Request) {
  return req.headers.get('x-request-id') || crypto.randomUUID()
}

export async function audit(ctx: { admin: ReturnType<typeof createClient>; userId: string; role: string; action: string; targetType?: string; targetId?: string; reason?: string; previousState?: unknown; newState?: unknown; requestId?: string }) {
  await ctx.admin.from('admin_audit_logs').insert({
    admin_user_id: ctx.userId,
    admin_role: ctx.role,
    action: ctx.action,
    target_type: ctx.targetType || null,
    target_id: ctx.targetId || null,
    reason: ctx.reason || null,
    previous_state: ctx.previousState || null,
    new_state: ctx.newState || null,
    request_id: ctx.requestId || null,
  })
}

export { json }
