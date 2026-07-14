/**
 * Telegram.WebApp.openInvoice only accepts:
 *   https://t.me/$SLUG
 *   https://t.me/invoice/SLUG
 *   (http also ok)
 * pathname must match exactly: /^\/(\$|invoice\/)([A-Za-z0-9\-_=]+)$/
 * (see telegram.org/js/telegram-web-app.js)
 */

const OPEN_INVOICE_RE = /^https?:\/\/t\.me\/(\$|invoice\/)([A-Za-z0-9\-_=]+)$/i

/**
 * Normalize createInvoiceLink result into a URL openInvoice will accept.
 * @returns {{ ok: boolean, url: string|null, slug: string|null, reason?: string }}
 */
export function normalizeInvoiceUrl(raw) {
  if (raw == null) return { ok: false, url: null, slug: null, reason: 'empty' }
  let s = String(raw).trim()
  // strip wrapping quotes
  s = s.replace(/^["']|["']$/g, '')
  // collapse whitespace
  s = s.replace(/\s+/g, '')

  // Already perfect
  if (OPEN_INVOICE_RE.test(s)) {
    const m = s.match(OPEN_INVOICE_RE)
    return { ok: true, url: s.replace(/^http:/i, 'https:'), slug: m[2], reason: undefined }
  }

  // URL with trailing slash or query/hash — strip and retry
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      if (u.hostname === 't.me' || u.hostname === 'telegram.me') {
        let path = u.pathname.replace(/\/+$/, '') // drop trailing slashes
        // path like /$SLUG or /invoice/SLUG
        let m = path.match(/^\/(\$)([A-Za-z0-9\-_=]+)$/)
        if (m) {
          const url = `https://t.me/$${m[2]}`
          return { ok: true, url, slug: m[2] }
        }
        m = path.match(/^\/invoice\/([A-Za-z0-9\-_=]+)$/i)
        if (m) {
          const url = `https://t.me/invoice/${m[1]}`
          return { ok: true, url, slug: m[1] }
        }
        // path is just / $ encoded oddly
        m = path.match(/^\/\$(.+)$/)
        if (m) {
          const slug = decodeURIComponent(m[1]).replace(/[^A-Za-z0-9\-_=]/g, '')
          if (slug) return { ok: true, url: `https://t.me/$${slug}`, slug }
        }
      }
    }
  } catch {
    // fall through
  }

  // Bare "$SLUG"
  if (/^\$[A-Za-z0-9\-_=]+$/.test(s)) {
    const slug = s.slice(1)
    return { ok: true, url: `https://t.me/$${slug}`, slug }
  }

  // Bare slug (no $)
  if (/^[A-Za-z0-9\-_=]{8,}$/.test(s)) {
    return { ok: true, url: `https://t.me/$${s}`, slug: s }
  }

  return {
    ok: false,
    url: null,
    slug: null,
    reason: `unrecognized_format:${s.slice(0, 60)}`,
  }
}

export function isValidOpenInvoiceUrl(url) {
  return OPEN_INVOICE_RE.test(String(url || '').trim())
}
