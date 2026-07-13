// @ts-nocheck
/**
 * create-stars-invoice
 * Authenticated endpoint: creates a Telegram Stars invoice link (currency XTR).
 *
 * Body: { productId: 'premium_1m' | 'premium_3m' | 'doctor_report' }
 * Returns: { invoiceLink, product }
 *
 * Secrets: BOT_TOKEN, SB_URL, SB_SERVICE_ROLE_KEY, SB_ANON_KEY
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
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

serve(async (req) => {
  const origin = req.headers.get('Origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  try {
    // Prefer TELEGRAM_BOT_TOKEN (same name as telegram-auth / send-notifications)
    const botToken = (Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('BOT_TOKEN'))?.trim()
    const sbUrl = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SB_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY')

    if (!botToken || !sbUrl || !serviceKey || !anonKey) {
      console.error('[create-stars-invoice] Missing secrets')
      return jsonResponse({ error: 'Server misconfigured' }, 500, origin)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401, origin)
    }

    const userClient = createClient(sbUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401, origin)
    }

    const body = await req.json().catch(() => ({}))
    const productId = body?.productId
    const product = getProduct(productId)
    if (!product) {
      return jsonResponse({ error: 'Unknown product', allowed: Object.keys({ premium_1m: 1, premium_3m: 1, doctor_report: 1 }) }, 400, origin)
    }

    const admin = createClient(sbUrl, serviceKey)
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, telegram_id, premium_until')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return jsonResponse({ error: 'Profile not found' }, 404, origin)
    }

    const payload = buildInvoicePayload(product.id, user.id)

    // Record pending payment for reconciliation
    const { error: insertError } = await admin.from('star_payments').insert({
      user_id: user.id,
      telegram_id: profile.telegram_id,
      product_id: product.id,
      stars_amount: product.stars,
      currency: 'XTR',
      invoice_payload: payload,
      status: 'pending',
    })
    if (insertError) {
      console.error('[create-stars-invoice] insert pending:', insertError)
      // Non-fatal — payment can still complete via webhook payload
    }

    const invoiceBody: Record<string, unknown> = {
      title: product.title.slice(0, 32),
      description: product.description.slice(0, 255),
      payload,
      provider_token: '', // required empty for Stars
      currency: 'XTR',
      prices: [{ label: product.title.slice(0, 32), amount: product.stars }],
    }

    if (product.kind === 'subscription' && product.subscriptionPeriod) {
      invoiceBody.subscription_period = product.subscriptionPeriod
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceBody),
    })
    const tgData = await tgRes.json()

    if (!tgData.ok || !tgData.result) {
      console.error('[create-stars-invoice] Telegram error:', tgData)
      return jsonResponse(
        {
          error: 'Failed to create invoice',
          details: tgData.description || 'Telegram API error',
        },
        502,
        origin
      )
    }

    return jsonResponse(
      {
        invoiceLink: tgData.result,
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
