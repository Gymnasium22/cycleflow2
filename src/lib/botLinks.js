/**
 * Telegram bot + Mini App links for this project.
 * Bot: @my_cicle_bot
 * Mini App Direct Link: https://t.me/my_cicle_bot/MyCycle
 */

export const BOT_USERNAME = (import.meta.env.VITE_BOT_USERNAME || 'my_cicle_bot').replace(/^@/, '')

/** Short name of the Mini App as configured in BotFather (after the bot username) */
export const MINI_APP_SLUG = (import.meta.env.VITE_MINI_APP_SLUG || 'MyCycle').replace(/^\//, '')

/** Opens the Mini App itself */
export function getMiniAppLink() {
  return `https://t.me/${BOT_USERNAME}/${MINI_APP_SLUG}`
}

/**
 * Shareable invite that opens Mini App with start_param (preferred).
 * startapp payload is available as Telegram.WebApp.initDataUnsafe.start_param
 */
export function getReferralMiniAppLink(code) {
  const c = String(code || '').trim()
  return `${getMiniAppLink()}?startapp=ref_${encodeURIComponent(c)}`
}

/** Classic bot deep-link (for users who open the bot chat first) */
export function getReferralBotStartLink(code) {
  const c = String(code || '').trim()
  return `https://t.me/${BOT_USERNAME}?start=ref_${encodeURIComponent(c)}`
}

export function getPartnerMiniAppLink(token) {
  const t = String(token || '').trim()
  return `${getMiniAppLink()}?startapp=partner_${encodeURIComponent(t)}`
}

/**
 * Read start_param from Telegram WebApp (from ?startapp=...).
 */
export function readTelegramStartParam(webApp) {
  try {
    const fromUnsafe = webApp?.initDataUnsafe?.start_param
    if (fromUnsafe) return String(fromUnsafe)
  } catch {
    // ignore
  }
  try {
    // Fallback: some clients put it only in URL after open
    const u = new URL(window.location.href)
    const q = u.searchParams.get('tgWebAppStartParam') || u.searchParams.get('startapp')
    if (q) return q
  } catch {
    // ignore
  }
  return null
}

export function parseStartParam(param) {
  if (!param || typeof param !== 'string') return { type: null, value: null }
  if (param.startsWith('ref_')) return { type: 'ref', value: param.slice(4) }
  if (param.startsWith('partner_')) return { type: 'partner', value: param.slice(8) }
  return { type: 'unknown', value: param }
}
