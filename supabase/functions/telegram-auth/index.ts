import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

serve(async (req) => {
  const { initData } = await req.json()

  if (!initData) {
    return new Response(JSON.stringify({ error: 'initData is required' }), { status: 400 })
  }

  const botToken = Deno.env.get('BOT_TOKEN')
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), { status: 500 })
  }

  try {
    // 1. Parse and validate Telegram initData
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    params.delete('hash')

    const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b))
    const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n')

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
    const computedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (computedHash !== hash) {
      return new Response(JSON.stringify({ error: 'Invalid Telegram hash' }), { status: 403 })
    }

    const authDate = parseInt(params.get('auth_date') || '0', 10)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 3600) {
      return new Response(JSON.stringify({ error: 'initData expired' }), { status: 403 })
    }

    // 2. Parse user data
    const userData = JSON.parse(params.get('user') || '{}')
    const telegramId = userData.id
    const username = userData.username || null
    const firstName = userData.first_name || null
    const lastName = userData.last_name || null
    const languageCode = userData.language_code || 'ru'

    if (!telegramId) {
      return new Response(JSON.stringify({ error: 'User data missing' }), { status: 400 })
    }

    // 3. Generate deterministic user id and password
    const userUuid = await generateUuidFromString(`telegram:${telegramId}`)
    const password = await generatePassword(telegramId, botToken)
    const email = `${telegramId}@telegram.local`

    // 4. Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SB_URL') ?? '',
      Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
    )

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
        return new Response(JSON.stringify({ error: createError.message }), { status: 500 })
      }

      // Create profile
      await supabaseAdmin.from('profiles').insert({
        id: userUuid,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        last_name: lastName,
        language_code: languageCode,
      })

      // Create default settings
      await supabaseAdmin.from('settings').insert({
        user_id: userUuid,
      })
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

      await supabaseAdmin.from('profiles').update({
        username,
        first_name: firstName,
        last_name: lastName,
        language_code: languageCode,
        updated_at: new Date().toISOString(),
      }).eq('id', userUuid)
    }

    // 6. Sign in to get session tokens
    const supabaseClient = createClient(
      Deno.env.get('SB_URL') ?? '',
      Deno.env.get('SB_ANON_KEY') ?? ''
    )

    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !sessionData.session) {
      return new Response(JSON.stringify({ error: signInError?.message || 'Failed to create session' }), { status: 500 })
    }

    return new Response(
      JSON.stringify({
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
      }),
      { status: 200 }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
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
