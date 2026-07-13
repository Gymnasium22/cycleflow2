const THEME_CLASS_PREFIX = 'theme-'
export const AVAILABLE_THEMES = ['telegram', 'sakura', 'lavender', 'teal', 'midnight']
export const THEME_STORAGE_KEY = 'cicle_theme'

const TG_CSS_VARS = [
  '--tg-theme-bg-color',
  '--tg-theme-text-color',
  '--tg-theme-hint-color',
  '--tg-theme-link-color',
  '--tg-theme-button-color',
  '--tg-theme-button-text-color',
  '--tg-theme-secondary-bg-color',
]

/**
 * Resolve which theme to use on startup.
 * Always prefer an explicit user choice in localStorage over Telegram default.
 *
 * @param {boolean} isTelegramWebApp
 * @param {string|null} [stored] - override for tests
 */
export function resolveStoredTheme(isTelegramWebApp, stored = null) {
  let saved = stored
  if (saved === null && typeof localStorage !== 'undefined') {
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY)
    } catch {
      saved = null
    }
  }
  if (saved && AVAILABLE_THEMES.includes(saved)) {
    return saved
  }
  // First launch only: Telegram Mini App defaults to system look
  return isTelegramWebApp ? 'telegram' : 'sakura'
}

/** @deprecated use resolveStoredTheme — kept for call-site compatibility */
export function getDefaultTheme(isTelegramWebApp) {
  return resolveStoredTheme(isTelegramWebApp)
}

export function clearTelegramCssOverrides() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const v of TG_CSS_VARS) {
    root.style.removeProperty(v)
  }
}

/**
 * Apply Telegram themeParams only when user chose the "telegram" theme.
 * Inline CSS vars on <html> must not stick around for custom themes.
 */
export function applyTelegramThemeParams(params, preferredTheme) {
  if (!params) return
  const theme = preferredTheme || resolveStoredTheme(true)
  if (theme !== 'telegram') return

  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (params.bg_color) root.style.setProperty('--tg-theme-bg-color', params.bg_color)
  if (params.text_color) root.style.setProperty('--tg-theme-text-color', params.text_color)
  if (params.hint_color) root.style.setProperty('--tg-theme-hint-color', params.hint_color)
  if (params.link_color) root.style.setProperty('--tg-theme-link-color', params.link_color)
  if (params.button_color) root.style.setProperty('--tg-theme-button-color', params.button_color)
  if (params.button_text_color) root.style.setProperty('--tg-theme-button-text-color', params.button_text_color)
  if (params.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color)
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const next = AVAILABLE_THEMES.includes(theme) ? theme : 'sakura'
  const body = document.body
  for (const t of AVAILABLE_THEMES) {
    body.classList.remove(`${THEME_CLASS_PREFIX}${t}`)
  }

  if (next === 'telegram') {
    // Leave Telegram inline vars (if any); class not needed
    return
  }

  // Custom themes must not be overridden by Telegram inline CSS variables
  clearTelegramCssOverrides()
  body.classList.add(`${THEME_CLASS_PREFIX}${next}`)
}

export function persistTheme(theme) {
  const next = AVAILABLE_THEMES.includes(theme) ? theme : 'sakura'
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // ignore quota / private mode
  }
  applyTheme(next)
  return next
}
