// @ts-nocheck
/**
 * telegram-webhook
 * Handles Bot API updates for Telegram Stars:
 * - pre_checkout_query → answerPreCheckoutQuery(ok: true)
 * - message.successful_payment → grant premium / report credits
 * - optional: start payload for referrals (deep link)
 *
 * Set webhook:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ref>.supabase.co/functions/v1/telegram-webhook
 *   &secret_token=<WEBHOOK_SECRET>
 *
 * Secrets: BOT_TOKEN, SB_URL, SB_SERVICE_ROLE_KEY, WEBHOOK_SECRET (optional but recommended)
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getProduct, parseInvoicePayload } from '../_shared/products.ts'

const REFERRAL_REWARD_DAYS = 7

async function tg(botToken: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

async function grantPurchase(admin: ReturnType<typeof createClient>, params: {
  userId: string
  productId: string
  stars: number
  chargeId: string
  providerChargeId?: string
  payload: string
  raw: unknown
  telegramId?: number
}) {
  const product = getProduct(params.productId)
  if (!product) {
    console.error('[webhook] Unknown product', params.productId)
    return { ok: false, error: 'unknown_product' }
  }

  // Idempotency: skip if charge already recorded as paid
  if (params.chargeId) {
    const { data: existing } = await admin
      .from('star_payments')
      .select('id, status')
      .eq('telegram_payment_charge_id', params.chargeId)
      .maybeSingle()
    if (existing?.status === 'paid') {
      return { ok: true, duplicate: true }
    }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, premium_until, doctor_report_credits, referred_by')
    .eq('id', params.userId)
    .single()

  if (!profile) {
    console.error('[webhook] Profile missing', params.userId)
    return { ok: false, error: 'no_profile' }
  }

  const updates: Record<string, unknown> = {}
  const now = new Date()

  if (product.premiumDays && product.premiumDays > 0) {
    const base =
      profile.premium_until && new Date(profile.premium_until) > now
        ? new Date(profile.premium_until)
        : now
    updates.premium_until = addDays(base, product.premiumDays).toISOString()
    updates.premium_plan = product.id
  }

  if (product.reportCredits && product.reportCredits > 0) {
    updates.doctor_report_credits = (profile.doctor_report_credits || 0) + product.reportCredits
  }

  if (Object.keys(updates).length > 0) {
    const { error: upErr } = await admin.from('profiles').update(updates).eq('id', params.userId)
    if (upErr) console.error('[webhook] profile update', upErr)
  }

  // Upsert payment row
  const paymentRow = {
    user_id: params.userId,
    telegram_id: params.telegramId ?? null,
    product_id: product.id,
    stars_amount: params.stars,
    currency: 'XTR',
    telegram_payment_charge_id: params.chargeId || null,
    provider_payment_charge_id: params.providerChargeId || null,
    invoice_payload: params.payload,
    status: 'paid',
    paid_at: now.toISOString(),
    raw_update: params.raw,
  }

  if (params.chargeId) {
    await admin.from('star_payments').upsert(paymentRow, {
      onConflict: 'telegram_payment_charge_id',
    })
  } else {
    await admin.from('star_payments').insert(paymentRow)
  }

  // Referral reward: first successful payment by referred user
  if (profile.referred_by) {
    const { data: ref } = await admin
      .from('referrals')
      .select('id, status, referrer_id, reward_days')
      .eq('referred_id', params.userId)
      .maybeSingle()

    if (ref && ref.status === 'pending') {
      const { data: referrer } = await admin
        .from('profiles')
        .select('id, premium_until, referral_premium_days')
        .eq('id', ref.referrer_id)
        .single()

      if (referrer) {
        const rewardDays = ref.reward_days || REFERRAL_REWARD_DAYS
        const base =
          referrer.premium_until && new Date(referrer.premium_until) > now
            ? new Date(referrer.premium_until)
            : now
        await admin
          .from('profiles')
          .update({
            premium_until: addDays(base, rewardDays).toISOString(),
            referral_premium_days: (referrer.referral_premium_days || 0) + rewardDays,
          })
          .eq('id', referrer.id)

        await admin
          .from('referrals')
          .update({ status: 'rewarded', rewarded_at: now.toISOString() })
          .eq('id', ref.id)
      }
    }
  }

  return { ok: true, updates }
}

serve(async (req) => {
  // Telegram may GET for health; allow POST only for updates
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, service: 'telegram-webhook' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Same secret name as the rest of the project
    const botToken = (Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('BOT_TOKEN'))?.trim()
    const sbUrl = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    // Optional: if set, Telegram must send the same value in X-Telegram-Bot-Api-Secret-Token
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')

    if (!botToken || !sbUrl || !serviceKey) {
      console.error('[webhook] Missing secrets')
      return new Response(JSON.stringify({ ok: false }), { status: 500 })
    }

    // Optional secret header verification (setWebhook secret_token)
    if (webhookSecret) {
      const header = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (header !== webhookSecret) {
        console.warn('[webhook] Invalid secret token')
        return new Response(JSON.stringify({ ok: false }), { status: 401 })
      }
    }

    const update = await req.json()
    const admin = createClient(sbUrl, serviceKey)

    // --- pre_checkout_query ---
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query
      const payload = parseInvoicePayload(q.invoice_payload || '')
      const product = payload ? getProduct(payload.productId) : null
      const ok = !!(product && q.currency === 'XTR')
      await tg(botToken, 'answerPreCheckoutQuery', {
        pre_checkout_query_id: q.id,
        ok,
        error_message: ok ? undefined : 'Invalid product or currency',
      })
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // --- successful_payment ---
    const payment = update.message?.successful_payment
    if (payment) {
      const parsed = parseInvoicePayload(payment.invoice_payload || '')
      if (!parsed) {
        console.error('[webhook] Bad payload', payment.invoice_payload)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await grantPurchase(admin, {
        userId: parsed.userId,
        productId: parsed.productId,
        stars: payment.total_amount,
        chargeId: payment.telegram_payment_charge_id,
        providerChargeId: payment.provider_payment_charge_id,
        payload: payment.invoice_payload,
        raw: update,
        telegramId: update.message?.from?.id,
      })

      // Optional thank-you message
      const chatId = update.message?.chat?.id
      if (chatId) {
        await tg(botToken, 'sendMessage', {
          chat_id: chatId,
          text: '⭐ Payment received — Premium is active in Kolechko. Open the Mini App to enjoy your benefits!',
        }).catch(() => {})
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // --- /start ref_CODE deep link ---
    const text: string = update.message?.text || ''
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/)
      const startParam = parts[1] || ''
      if (startParam.startsWith('ref_')) {
        const code = startParam.slice(4).toLowerCase()
        const telegramId = update.message?.from?.id
        if (telegramId && code) {
          const { data: referrer } = await admin
            .from('profiles')
            .select('id')
            .eq('referral_code', code)
            .maybeSingle()
          const { data: me } = await admin
            .from('profiles')
            .select('id, referred_by')
            .eq('telegram_id', telegramId)
            .maybeSingle()

          if (referrer && me && !me.referred_by && referrer.id !== me.id) {
            await admin.from('profiles').update({ referred_by: referrer.id }).eq('id', me.id)
            await admin.from('referrals').upsert(
              {
                referrer_id: referrer.id,
                referred_id: me.id,
                reward_days: REFERRAL_REWARD_DAYS,
                status: 'pending',
              },
              { onConflict: 'referred_id' }
            )
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[webhook] Error:', err)
    // Always 200 to Telegram to avoid retries storm on parse bugs — log for ops
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
