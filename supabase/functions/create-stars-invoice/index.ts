// @ts-nocheck
/**
 * create-stars-invoice
 * Creates a Telegram Stars (XTR) invoice link for the authenticated user.
 *
 * Auth (in order):
 * 1) Authorization: Bearer <supabase access_token>  — preferred
 * 2) Body.initData (Telegram WebApp) — fallback when JWT is missing/expired
 *
 * Body: { productId, initData? }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'
import { getProduct, buildInvoicePayload } from '../_shared/products.ts'

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
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

async function hmacHex(key: ArrayBuffer | Uint8Array, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Validate Telegram WebApp initData (same algorithm as telegram-auth). */
async function validateInitData(initData: string, botToken: string): Promise<{ ok: boolean; user?: any; error?: string }> {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return { ok: false, error: 'no_hash' }

    const pairs: string[] = []
    params.forEach((value, key) => {
      if (key !== 'hash') pairs.push(`${key}=${value}`)
    })
    pairs.sort()
    const dataCheckString = pairs.join('\n')

    const secretKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const secret = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken))
    const calculated = await hmacHex(secret, dataCheckString)

    if (calculated !== hash) {
      return { ok: false, error: 'bad_hash' }
    }

    const authDate = Number(params.get('auth_date') || 0)
    const now = Math.floor(Date.now() / 1000)
    // Allow 24h window (Telegram sessions can stay open)
    if (!authDate || now - authDate > 86400) {
      return { ok: false, error: 'init_data_expired' }
    }

    const userJson = params.get('user')
    if (!userJson) return { ok: false, error: 'no_user' }
    const user = JSON.parse(userJson)
    return { ok: true, user }
  } catch (e) {
    return { ok: false, error: e?.message || 'validate_failed' }
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  try {
    const botToken = (Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('BOT_TOKEN'))?.trim()
    const sbUrl = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SB_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY')

    if (!botToken || !sbUrl || !serviceKey) {
      console.error('[create-stars-invoice] Missing secrets', {
        bot: !!botToken,
        url: !!sbUrl,
        service: !!serviceKey,
        anon: !!anonKey,
      })
      return jsonResponse({ error: 'Server misconfigured' }, 500, origin)
    }

    const body = await req.json().catch(() => ({}))
    const productId = body?.productId
    const product = getProduct(productId)
    if (!product) {
      return jsonResponse({ error: 'Unknown product' }, 400, origin)
    }

    const admin = createClient(sbUrl, serviceKey)
    let userId: string | null = null
    let authVia = ''

    // --- 1) Supabase JWT ---
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

    if (jwt && jwt !== anonKey) {
      // Official way: validate JWT with service role client
      const { data: userData, error: userError } = await admin.auth.getUser(jwt)
      if (!userError && userData?.user?.id) {
        userId = userData.user.id
        authVia = 'jwt'
      } else {
        console.warn('[create-stars-invoice] getUser failed:', userError?.message || userError)
        // Fallback: anon client with Authorization header
        if (anonKey) {
          const userClient = createClient(sbUrl, anonKey, {
            global: { headers: { Authorization: `Bearer ${jwt}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          })
          const { data: d2, error: e2 } = await userClient.auth.getUser()
          if (!e2 && d2?.user?.id) {
            userId = d2.user.id
            authVia = 'jwt_anon'
          } else {
            console.warn('[create-stars-invoice] anon getUser failed:', e2?.message || e2)
          }
        }
      }
    }

    // --- 2) Telegram initData fallback ---
    if (!userId && body?.initData && typeof body.initData === 'string') {
      const validated = await validateInitData(body.initData, botToken)
      if (!validated.ok) {
        console.warn('[create-stars-invoice] initData invalid:', validated.error)
        return jsonResponse({ error: 'Invalid session', detail: validated.error }, 401, origin)
      }
      const telegramId = validated.user?.id
      if (!telegramId) {
        return jsonResponse({ error: 'Invalid session', detail: 'no_telegram_id' }, 401, origin)
      }
      const { data: profileByTg, error: tgErr } = await admin
        .from('profiles')
        .select('id')
        .eq('telegram_id', telegramId)
        .maybeSingle()
      if (tgErr || !profileByTg) {
        console.warn('[create-stars-invoice] profile by telegram_id missing', telegramId, tgErr)
        return jsonResponse({ error: 'Profile not found', detail: 'login_first' }, 404, origin)
      }
      userId = profileByTg.id
      authVia = 'initData'
    }

    if (!userId) {
      return jsonResponse(
        {
          error: 'Invalid session',
          detail: 'no_valid_jwt_or_initData',
          hint: 'Re-open the Mini App from Telegram so auth can refresh.',
        },
        401,
        origin
      )
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, telegram_id, premium_until')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return jsonResponse({ error: 'Profile not found' }, 404, origin)
    }

    const payload = buildInvoicePayload(product.id, userId)

    const { error: insertError } = await admin.from('star_payments').insert({
      user_id: userId,
      telegram_id: profile.telegram_id,
      product_id: product.id,
      stars_amount: product.stars,
      currency: 'XTR',
      invoice_payload: payload,
      status: 'pending',
    })
    if (insertError) {
      console.error('[create-stars-invoice] insert pending:', insertError)
    }

    // Stars (XTR): provider_token must be OMITTED (not empty string) — Bot API changelog.
    // payload max 128 bytes; prices must be exactly one item for XTR.
    const safePayload = payload.slice(0, 128)
    const invoiceBody: Record<string, unknown> = {
      title: product.title.slice(0, 32),
      description: product.description.slice(0, 255),
      payload: safePayload,
      currency: 'XTR',
      prices: [{ label: product.title.slice(0, 32), amount: Number(product.stars) }],
    }

    // Subscriptions: only attach if product requests it (Bot API: 2592000 = 30 days)
    if (product.kind === 'subscription' && product.subscriptionPeriod) {
      invoiceBody.subscription_period = product.subscriptionPeriod
    }

    let tgRes = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceBody),
    })
    let tgData = await tgRes.json()

    // If subscription invoices are not enabled for this bot, retry as one-time Stars charge
    if (
      !tgData.ok &&
      invoiceBody.subscription_period &&
      typeof tgData.description === 'string'
    ) {
      console.warn('[create-stars-invoice] subscription invoice failed, retry one-time', tgData)
      delete invoiceBody.subscription_period
      tgRes = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceBody),
      })
      tgData = await tgRes.json()
    }

    if (!tgData.ok || !tgData.result) {
      console.error('[create-stars-invoice] Telegram error:', tgData)
      return jsonResponse(
        {
          error: 'Failed to create invoice',
          details: tgData.description || 'Telegram API error',
          // Helps debug wrong-bot-token vs API validation without leaking the token
          hint: 'Invoice bot token must be the same bot as the Mini App (@my_cicle_bot).',
        },
        502,
        origin
      )
    }

    const invoiceLink = String(tgData.result).trim()
    console.log('[create-stars-invoice] ok', {
      userId,
      productId: product.id,
      authVia,
      linkPrefix: invoiceLink.slice(0, 32),
    })

    return jsonResponse(
      {
        invoiceLink,
        product: {
          id: product.id,
          title: product.title,
          stars: product.stars,
          kind: product.kind,
        },
      },
      200,
      origin
    )
  } catch (err) {
    console.error('[create-stars-invoice] Unexpected:', err)
    return jsonResponse({ error: err?.message || 'Internal error' }, 500, origin)
  }
})
