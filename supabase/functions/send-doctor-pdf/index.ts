// @ts-nocheck
/**
 * send-doctor-pdf
 * Receives a PDF (base64) from the Mini App and delivers it to the user
 * via Telegram Bot API sendDocument (appears in the bot chat).
 *
 * Body JSON:
 *   { filename?: string, pdfBase64: string, caption?: string, initData?: string }
 *
 * Auth: Bearer access_token (preferred) or initData fallback like create-stars-invoice.
 */
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

const MAX_PDF_BYTES = 15 * 1024 * 1024 // Telegram bot limit is 50MB; keep safer cap

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
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
  })
}

function base64ToUint8Array(b64: string): Uint8Array {
  const cleaned = b64.replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '')
  const bin = atob(cleaned)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
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

async function validateInitData(initData: string, botToken: string) {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return { ok: false as const }
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
    if (calculated !== hash) return { ok: false as const }
    const userJson = params.get('user')
    if (!userJson) return { ok: false as const }
    return { ok: true as const, user: JSON.parse(userJson) }
  } catch {
    return { ok: false as const }
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
      return jsonResponse({ error: 'Server misconfigured' }, 500, origin)
    }

    const body = await req.json().catch(() => ({}))
    const pdfBase64 = body?.pdfBase64
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return jsonResponse({ error: 'pdfBase64 is required' }, 400, origin)
    }

    let filename = String(body?.filename || 'kolechko-doctor-report.pdf').replace(/[^\w.\-а-яА-ЯёЁ]+/gi, '_')
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf'
    const caption =
      body?.caption ||
      '📄 Отчёт для врача из Колечко.\nЭто не медицинский диагноз — покажите файл клиницисту.'

    const admin = createClient(sbUrl, serviceKey)
    let telegramId: number | null = null
    let userId: string | null = null

    // Auth via JWT
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (jwt && jwt !== anonKey) {
      const { data: userData, error: userError } = await admin.auth.getUser(jwt)
      if (!userError && userData?.user?.id) {
        userId = userData.user.id
        const { data: profile } = await admin
          .from('profiles')
          .select('id, telegram_id')
          .eq('id', userId)
          .maybeSingle()
        if (profile?.telegram_id) telegramId = Number(profile.telegram_id)
      }
    }

    // Auth via initData
    if (!telegramId && body?.initData && typeof body.initData === 'string') {
      const validated = await validateInitData(body.initData, botToken)
      if (validated.ok && validated.user?.id) {
        telegramId = Number(validated.user.id)
        const { data: profile } = await admin
          .from('profiles')
          .select('id, telegram_id')
          .eq('telegram_id', telegramId)
          .maybeSingle()
        if (profile?.id) userId = profile.id
      }
    }

    if (!telegramId) {
      return jsonResponse(
        {
          error: 'Unauthorized',
          hint: 'Open the Mini App from Telegram and try again.',
        },
        401,
        origin
      )
    }

    let bytes: Uint8Array
    try {
      bytes = base64ToUint8Array(pdfBase64)
    } catch {
      return jsonResponse({ error: 'Invalid base64 PDF' }, 400, origin)
    }

    if (bytes.byteLength < 100) {
      return jsonResponse({ error: 'PDF too small' }, 400, origin)
    }
    if (bytes.byteLength > MAX_PDF_BYTES) {
      return jsonResponse({ error: 'PDF too large' }, 413, origin)
    }

    // sendDocument via multipart
    const form = new FormData()
    form.append('chat_id', String(telegramId))
    form.append('caption', String(caption).slice(0, 1024))
    form.append(
      'document',
      new Blob([bytes], { type: 'application/pdf' }),
      filename
    )

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: form,
    })
    const tgData = await tgRes.json()

    if (!tgData.ok) {
      console.error('[send-doctor-pdf] Telegram error', tgData)
      const desc = tgData.description || 'sendDocument failed'
      // Common: user never pressed /start
      const needStart =
        /blocked|chat not found|user is deactivated|bot can't initiate/i.test(desc) ||
        tgData.error_code === 403
      return jsonResponse(
        {
          error: 'Telegram send failed',
          details: desc,
          needStart,
          hint: needStart
            ? 'Open @my_cicle_bot chat and press Start, then try again.'
            : 'Could not deliver the file to Telegram.',
        },
        502,
        origin
      )
    }

    console.log('[send-doctor-pdf] ok', { telegramId, userId, bytes: bytes.byteLength, filename })

    return jsonResponse(
      {
        ok: true,
        messageId: tgData.result?.message_id,
        chatId: telegramId,
        filename,
        bytes: bytes.byteLength,
      },
      200,
      origin
    )
  } catch (err) {
    console.error('[send-doctor-pdf] Unexpected', err)
    return jsonResponse({ error: err?.message || 'Internal error' }, 500, origin)
  }
})
