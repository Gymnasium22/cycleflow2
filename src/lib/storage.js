// Storage adapter for Supabase Auth using localStorage.
// Telegram WebView sometimes clears localStorage on app restart, but it works
// reliably within a session and is fully synchronous (no hanging).

export const authStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // ignore
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}
