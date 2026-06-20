import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const ALLOWED_ORIGINS = [
  'https://gymnasium22.github.io',
  'https://gymnasium22.github.io/cycleflow2',
  'https://gymnasium22.github.io/cycleflow2/',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
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

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  console.log('[telegram-auth] Received auth request')

  let initData: string | undefined
  try {
    const body = await req.json()
    initData = body.initData
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin)
  }

  if (!initData) {
    return jsonResponse({ error: 'initData is required' }, 400, origin)
  }

  const botToken = (Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('BOT_TOKEN'))?.trim()
  if (!botToken) {
    return jsonResponse({ error: 'Bot token not configured' }, 500, origin)
  }
  console.log('[telegram-auth] Using bot token source:', Deno.env.get('TELEGRAM_BOT_TOKEN') ? 'TELEGRAM_BOT_TOKEN' : 'BOT_TOKEN')

  try {
    // 1. Parse and validate Telegram initData
    async function computeHmac(dataCheckString: string): Promise<string> {
      const secretKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(botToken),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const secret = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode('WebAppData'))
      const validationKey = await crypto.subtle.importKey(
        'raw',
        secret,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', validationKey, new TextEncoder().encode(dataCheckString))
      return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }

    function parseInitData(data: string, useRawValues: boolean) {
      const pairs = data.split('&')
      let hash: string | null = null
      const entries: [string, string][] = []

      for (const pair of pairs) {
        const eqIndex = pair.indexOf('=')
        if (eqIndex === -1) continue
        const key = pair.slice(0, eqIndex)
        const rawValue = pair.slice(eqIndex + 1)
        if (key === 'hash') {
          hash = decodeURIComponent(rawValue)
        } else {
          entries.push([key, useRawValues ? rawValue : decodeURIComponent(rawValue)])
        }
      }

      entries.sort(([a], [b]) => a.localeCompare(b))
      const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n')
      return { hash: hash || '', dataCheckString, entries }
    }

    // Try decoded values first (standard Telegram docs), then raw values as fallback
    let validation = parseInitData(initData, false)
    let computedHash = await computeHmac(validation.dataCheckString)

    console.log('[telegram-auth] Validation data (decoded):', {
      botTokenLength: botToken.length,
      hashLength: validation.hash.length,
      dataCheckStringLength: validation.dataCheckString.length,
      dataCheckStringPreview: validation.dataCheckString.slice(0, 200),
      entries: validation.entries.map(([k]) => k),
      computedHash,
    })

    if (computedHash !== validation.hash) {
      validation = parseInitData(initData, true)
      computedHash = await computeHmac(validation.dataCheckString)

      console.log('[telegram-auth] Validation data (raw):', {
        dataCheckStringLength: validation.dataCheckString.length,
        dataCheckStringPreview: validation.dataCheckString.slice(0, 200),
        entries: validation.entries.map(([k]) => k),
        computedHash,
      })
    }

    if (computedHash !== validation.hash) {
      console.error('[telegram-auth] Hash mismatch', { computedHash, hash: validation.hash })
      return jsonResponse({ error: 'Invalid Telegram hash' }, 403, origin)
    }

    // Re-parse with URLSearchParams for convenient access to user/auth_date
    const params = new URLSearchParams(initData)

    const authDate = parseInt(params.get('auth_date') || '0', 10)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 3600) {
      return jsonResponse({ error: 'initData expired' }, 403, origin)
    }

    // 2. Parse user data
    const userData = JSON.parse(params.get('user') || '{}')
    const telegramId = userData.id
    const username = userData.username || null
    const firstName = userData.first_name || null
    const lastName = userData.last_name || null
    const languageCode = userData.language_code || 'ru'

    if (!telegramId) {
      return jsonResponse({ error: 'User data missing' }, 400, origin)
    }

    // 3. Generate deterministic user id and password
    const userUuid = await generateUuidFromString(`telegram:${telegramId}`)
    const password = await generatePassword(telegramId, botToken)
    const email = `${telegramId}@telegram.local`

    // 4. Admin client
    const supabaseUrl = Deno.env.get('SB_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 5. Create or update auth user
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userUuid)

    if (!existingUser.user) {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        id: userUuid,
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          username,
          first_name: firstName,
          last_name: lastName,
          language_code: languageCode,
        },
      })

      if (createError) {
        return jsonResponse({ error: createError.message }, 500, origin)
      }

      // Create or upsert profile
      await supabaseAdmin.from('profiles').upsert({
        id: userUuid,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        last_name: lastName,
        language_code: languageCode,
        onboarding_completed: false,
      }, { onConflict: 'id' })

      // Create or upsert default settings
      await supabaseAdmin.from('settings').upsert({
        user_id: userUuid,
      }, { onConflict: 'user_id' })
    } else {
      // Update password and metadata
      await supabaseAdmin.auth.admin.updateUserById(userUuid, {
        password,
        user_metadata: {
          telegram_id: telegramId,
          username,
          first_name: firstName,
          last_name: lastName,
          language_code: languageCode,
        },
      })

      // Upsert profile (handles case where profile was missing)
      await supabaseAdmin.from('profiles').upsert({
        id: userUuid,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        last_name: lastName,
        language_code: languageCode,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      // Upsert settings
      await supabaseAdmin.from('settings').upsert({
        user_id: userUuid,
      }, { onConflict: 'user_id' })
    }

    // 6. Sign in to get session tokens
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SB_ANON_KEY') ?? ''
    )

    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !sessionData.session) {
      return jsonResponse({ error: signInError?.message || 'Failed to create session' }, 500, origin)
    }

    return jsonResponse({
      success: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
      },
      user: {
        id: userUuid,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        language_code: languageCode,
      },
    }, 200, origin)
  } catch (err) {
    console.error('Telegram auth error:', err)
    return jsonResponse({ error: err.message }, 500, origin)
  }
})

async function generateUuidFromString(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const array = new Uint8Array(hash)
  array[6] = (array[6] & 0x0f) | 0x40
  array[8] = (array[8] & 0x3f) | 0x80

  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

async function generatePassword(telegramId: number, botToken: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`password:${telegramId}`))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
