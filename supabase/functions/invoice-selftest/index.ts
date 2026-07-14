// @ts-nocheck
/**
 * Temporary self-test: getMe + createInvoiceLink (1 Star).
 * Deploy with --no-verify-jwt. Safe enough: only creates a link, does not charge until paid.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const origin = req.headers.get('Origin') || '*'
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const botToken = (Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('BOT_TOKEN'))?.trim()
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'no bot token' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
  const me = await meRes.json()

  // Minimal Stars invoice (omit provider_token)
  const body = {
    title: 'Test Premium',
    description: 'Selftest one star invoice for Mini App',
    payload: `selftest_${Date.now()}`,
    currency: 'XTR',
    prices: [{ label: 'Test', amount: 1 }],
  }

  const invRes = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const inv = await invRes.json()

  const raw = inv?.result != null ? String(inv.result) : null
  const pathOk = raw
    ? /^https?:\/\/t\.me\/(\$|invoice\/)[A-Za-z0-9\-_=]+$/i.test(raw.trim().replace(/\/+$/, ''))
    : false

  // Also try form-urlencoded style (some gateways are picky)
  const form = new URLSearchParams()
  form.set('title', 'Test Premium 2')
  form.set('description', 'Selftest form body')
  form.set('payload', `selftest_form_${Date.now()}`)
  form.set('currency', 'XTR')
  form.set('prices', JSON.stringify([{ label: 'Test', amount: 1 }]))

  const inv2Res = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const inv2 = await inv2Res.json()

  return new Response(
    JSON.stringify(
      {
        me: me.ok
          ? { id: me.result.id, username: me.result.username, has_main_web_app: me.result.has_main_web_app }
          : me,
        jsonBodyInvoice: inv,
        formBodyInvoice: inv2,
        pathOkForJsonResult: pathOk,
        openInvoiceRegex:
          'pathname must be /^\\\\/(\\$|invoice\\\\/)([A-Za-z0-9\\\\-_=]+)$/ on host t.me',
      },
      null,
      2
    ),
    { headers: { ...cors, 'Content-Type': 'application/json' } }
  )
})
