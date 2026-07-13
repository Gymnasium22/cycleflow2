/**
 * Copy text in Telegram Mini App / browsers (clipboard often blocked — fallback).
 */
export async function copyText(text) {
  const value = String(text || '')
  if (!value) return false

  // Modern API
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // fall through
  }

  // Legacy execCommand
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) return true
  } catch {
    // fall through
  }

  // Telegram WebApp helper (some clients)
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.readTextFromClipboard == null && typeof tg?.showPopup === 'function') {
      // No write API — show text so user can long-press copy
      return false
    }
  } catch {
    // ignore
  }

  return false
}

export function openTelegramShare(url, text) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || '')}`
  const tg = window.Telegram?.WebApp
  try {
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl)
      return true
    }
  } catch {
    // ignore
  }
  try {
    window.open(shareUrl, '_blank')
    return true
  } catch {
    return false
  }
}
