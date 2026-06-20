// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ALLOWED_ORIGINS = [
  'https://gymnasium22.github.io',
  'https://gymnasium22.github.io/cycleflow2',
  'https://gymnasium22.github.io/cycleflow2/',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsHeaders(origin: string | null) {
  const allowed = origin || ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
  })
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  console.log('[delete-all-data] Received request', {
    method: req.method,
    origin,
    hasAuth: !!req.headers.get('Authorization'),
    authPrefix: req.headers.get('Authorization')?.slice(0, 20),
  })

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = Deno.env.get('SB_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''

  // Get user auth from JWT
  const authHeader = req.headers.get('Authorization') || ''
  const accessToken = authHeader.replace('Bearer ', '').trim()
  const anonKey = Deno.env.get('SB_ANON_KEY') ?? ''

  console.log('[delete-all-data] Auth details:', {
    hasAuthHeader: !!authHeader,
    accessTokenPrefix: accessToken.slice(0, 20),
    anonKeyPrefix: anonKey.slice(0, 20),
  })

  const supabaseClient = createClient(supabaseUrl, anonKey)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(accessToken)

  console.log('[delete-all-data] getUser result:', { hasUser: !!user, error: userError?.message })

  if (userError || !user) {
    console.error('[delete-all-data] Unauthorized:', userError?.message, userError?.name, userError?.status)
    return jsonResponse(
      {
        error: 'Unauthorized',
        details: userError?.message || 'No active session',
        hint: 'SB_ANON_KEY configured: ' + !!anonKey,
      },
      401,
      origin
    )
  }

  const userId = user.id

  // Admin client for deletions that bypass RLS
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    console.log('[delete-all-data] Deleting all data for user:', userId)

    // Delete user data in correct order to respect foreign keys
    await supabaseAdmin.from('cycles').delete().eq('user_id', userId)
    await supabaseAdmin.from('symptoms').delete().eq('user_id', userId)
    await supabaseAdmin.from('settings').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // Delete auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('[delete-all-data] Auth delete error:', deleteAuthError)
      return jsonResponse({ error: deleteAuthError.message }, 500, origin)
    }

    console.log('[delete-all-data] Successfully deleted all data for user:', userId)
    return jsonResponse({ success: true }, 200, origin)
  } catch (err) {
    console.error('[delete-all-data] Error:', err)
    return jsonResponse({ error: err.message || 'Internal server error' }, 500, origin)
  }
})
