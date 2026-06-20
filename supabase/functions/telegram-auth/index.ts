// @ts-nocheck
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

function sortPairs(pairs: [string, string][]): [string, string][] {
  return [...pairs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

function getDecodedParams(initData: string): [string, string][] {
  const params = new URLSearchParams(initData)
  const result: [string, string][] = []
  params.forEach((value, key) => result.push([key, value]))
  return result
}

function getRawParams(initData: string): [string, string][] {
  if (!initData) return []
  return initData.split('&').map((pair) => {
    const idx = pair.indexOf('=')
    if (idx === -1) return [pair, '']
    return [pair.slice(0, idx), pair.slice(idx + 1)]
  })
}

async function computeHmac(dataCheckString: string, botToken: string): Promise<string> {
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

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function base64UrlToBuffer(input: string): Uint8Array {
  const padding = '='.repeat((4 - (input.length % 4)) % 4)
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + padding
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function validateThirdParty(
  initData: string,
  botId: number,
  useRaw: boolean,
  isTest: boolean
): Promise<{ valid: boolean; dataCheckString: string; error?: string }> {
  try {
    const params = useRaw ? getRawParams(initData) : getDecodedParams(initData)
    const hash = params.find(([k]) => k === 'hash')?.[1] || ''
    const signature = params.find(([k]) => k === 'signature')?.[1] || ''

    if (!signature) {
      return { valid: false, dataCheckString: '', error: 'No signature' }
    }

    const pairs = sortPairs(
      params.filter(([k]) => k !== 'hash' && k !== 'signature')
    )
    const dataCheckString = `${botId}:WebAppData\n${pairs.map(([k, v]) => `${k}=${v}`).join('\n')}`

    const publicKeyHex = isTest
      ? '40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec'
      : 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d'

    const publicKey = await crypto.subtle.importKey(
      'raw',
      hexToBuffer(publicKeyHex),
      { name: 'Ed25519' },
      false,
      ['verify']
    )

    const verified = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      base64UrlToBuffer(signature),
      new TextEncoder().encode(dataCheckString)
    )

    return { valid: verified, dataCheckString }
  } catch (err) {
    return { valid: false, dataCheckString: '', error: err.message }
  }
}

async function tryHashStrategies(
  initData: string,
  botToken: string
): Promise<{
  valid: boolean
  strategy: string
  hash: string
  attempts: { name: string; matched: boolean; computedHash: string; receivedHash: string; dataCheckString: string }[]
}> {
  const strategies = [
    { name: 'decoded', raw: false, exclude: [] },
    { name: 'raw', raw: true, exclude: [] },
    { name: 'decoded-no-signature', raw: false, exclude: ['signature'] },
    { name: 'raw-no-signature', raw: true, exclude: ['signature'] },
    { name: 'decoded-no-chat', raw: false, exclude: ['chat_instance', 'chat_type'] },
    { name: 'raw-no-chat', raw: true, exclude: ['chat_instance', 'chat_type'] },
    { name: 'decoded-no-sig-chat', raw: false, exclude: ['signature', 'chat_instance', 'chat_type'] },
    { name: 'raw-no-sig-chat', raw: true, exclude: ['signature', 'chat_instance', 'chat_type'] },
    { name: 'decoded-minimal', raw: false, exclude: [], only: ['auth_date', 'query_id', 'user'] },
    { name: 'raw-minimal', raw: true, exclude: [], only: ['auth_date', 'query_id', 'user'] },
  ]

  const attempts: { name: string; matched: boolean; computedHash: string; dataCheckString: string }[] = []
  let matchedStrategy = ''
  let matchedHash = ''

  for (const strategy of strategies) {
    const params = strategy.raw ? getRawParams(initData) : getDecodedParams(initData)
    const hashEntry = params.find(([k]) => k === 'hash')
    const receivedHash = hashEntry ? decodeURIComponent(hashEntry[1]) : ''

    let filtered = params.filter(([k]) => k !== 'hash' && !strategy.exclude.includes(k))
    if ('only' in strategy && strategy.only) {
      filtered = filtered.filter(([k]) => strategy.only.includes(k))
    }

    const pairs = sortPairs(filtered)
    const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n')
    const computedHash = await computeHmac(dataCheckString, botToken)
    const matched = computedHash === receivedHash

    attempts.push({ name: strategy.name, matched, computedHash, receivedHash, dataCheckString })

    if (matched) {
      matchedStrategy = strategy.name
      matchedHash = hash
      break
    }
  }

  return { valid: !!matchedStrategy, strategy: matchedStrategy, hash: matchedHash, attempts }
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

  const botId = parseInt(botToken.split(':')[0], 10)
  console.log('[telegram-auth] Bot token source:', Deno.env.get('TELEGRAM_BOT_TOKEN') ? 'TELEGRAM_BOT_TOKEN' : 'BOT_TOKEN')
  console.log('[telegram-auth] Bot ID:', botId)
  console.log('[telegram-auth] initData length:', initData.length)
  console.log('[telegram-auth] initData preview:', initData.slice(0, 300))

  try {
    // 1. Try hash-based validation with multiple strategies
    const hashResult = await tryHashStrategies(initData, botToken)
    console.log('[telegram-auth] Hash validation attempts:', hashResult.attempts.map((a) => ({ name: a.name, matched: a.matched })))

    let validationSource: 'hash' | 'signature' | null = null

    if (hashResult.valid) {
      validationSource = 'hash'
      console.log('[telegram-auth] Hash matched using strategy:', hashResult.strategy)
    } else if (botId) {
      // 2. Fallback to third-party signature validation
      console.log('[telegram-auth] Hash validation failed, trying third-party signature validation...')
      for (const useRaw of [false, true]) {
        for (const isTest of [false, true]) {
          const sigResult = await validateThirdParty(initData, botId, useRaw, isTest)
          console.log('[telegram-auth] Signature validation:', { useRaw, isTest, valid: sigResult.valid, error: sigResult.error })
          if (sigResult.valid) {
            validationSource = 'signature'
            break
          }
        }
        if (validationSource === 'signature') break
      }
    }

    if (!validationSource) {
      console.error('[telegram-auth] All validation strategies failed', {
        botTokenLength: botToken.length,
        botTokenPrefix: botToken.slice(0, 15),
        initDataLength: initData.length,
        initDataPreview: initData.slice(0, 500),
        attempts: hashResult.attempts,
      })
      return jsonResponse(
        {
          error: 'Invalid Telegram hash',
          debug: {
            botTokenLength: botToken.length,
            botTokenPrefix: botToken.slice(0, 15),
            initDataLength: initData.length,
            initDataPreview: initData.slice(0, 1000),
            attempts: hashResult.attempts.map((a) => ({
              name: a.name,
              matched: a.matched,
              computedHash: a.computedHash,
              receivedHash: a.receivedHash,
            })),
          },
        },
        403,
        origin
      )
    }

    // 3. Parse user data using decoded values
    const params = new URLSearchParams(initData)
    const authDate = parseInt(params.get('auth_date') || '0', 10)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 3600) {
      return jsonResponse({ error: 'initData expired' }, 403, origin)
    }

    const userData = JSON.parse(params.get('user') || '{}')
    const telegramId = userData.id
    const username = userData.username || null
    const firstName = userData.first_name || null
    const lastName = userData.last_name || null
    const languageCode = userData.language_code || 'ru'

    if (!telegramId) {
      return jsonResponse({ error: 'User data missing' }, 400, origin)
    }

    // 4. Generate deterministic user id and password
    const userUuid = await generateUuidFromString(`telegram:${telegramId}`)
    const password = await generatePassword(telegramId, botToken)
    const email = `${telegramId}@telegram.local`

    // 5. Admin client
    const supabaseUrl = Deno.env.get('SB_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 6. Create or update auth user
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

      await supabaseAdmin.from('profiles').upsert(
        {
          id: userUuid,
          telegram_id: telegramId,
          username,
          first_name: firstName,
          last_name: lastName,
          language_code: languageCode,
          onboarding_completed: false,
        },
        { onConflict: 'id' }
      )

      await supabaseAdmin.from('settings').upsert({ user_id: userUuid }, { onConflict: 'user_id' })
    } else {
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

      await supabaseAdmin.from('profiles').upsert(
        {
          id: userUuid,
          telegram_id: telegramId,
          username,
          first_name: firstName,
          last_name: lastName,
          language_code: languageCode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      await supabaseAdmin.from('settings').upsert({ user_id: userUuid }, { onConflict: 'user_id' })
    }

    // 7. Sign in to get session tokens
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SB_ANON_KEY') ?? '')

    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !sessionData.session) {
      return jsonResponse({ error: signInError?.message || 'Failed to create session' }, 500, origin)
    }

    return jsonResponse(
      {
        success: true,
        validationSource,
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
      },
      200,
      origin
    )
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
