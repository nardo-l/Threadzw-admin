function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export function GET() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing = [
      !url ? 'SUPABASE_URL' : null,
      !anonKey ? 'SUPABASE_ANON_KEY' : null,
    ].filter((value): value is string => Boolean(value))

    return response({
      error: `Supabase configuration is missing: ${missing.join(', ')}.`,
      missing,
      runtime: 'vercel-node',
    }, 500)
  }

  return response({
    ok: true,
    url,
    anonKey,
  })
}

export function OPTIONS() {
  return response({ ok: true })
}
