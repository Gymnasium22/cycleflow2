const THEME_CLASS_PREFIX = 'theme-'
export const AVAILABLE_THEMES = ['telegram', 'sakura', 'lavender', 'teal', 'midnight']

const TG_CSS_VARS = [
  '--tg-theme-bg-color',
  '--tg-theme-text-color',
  '--tg-theme-hint-color',
  '--tg-theme-link-color',
  '--tg-theme-button-color',
  '--tg-theme-button-text-color',
  '--tg-theme-secondary-bg-color',
]

export function clearTelegramCssOverrides() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const v of TG_CSS_VARS) {
    root.style.removeProperty(v)
  }
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const body = document.body
  for (const t of AVAILABLE_THEMES) {
    body.classList.remove(`${THEME_CLASS_PREFIX}${t}`)
  }

  if (theme === 'telegram') {
    clearTelegramCssOverrides()
    return
  }

  body.classList.add(`${THEME_CLASS_PREFIX}${theme}`)
}

export function getDefaultTheme(isTelegramWebApp) {
  if (isTelegramWebApp) return 'telegram'
  const saved = localStorage.getItem('cicle_theme')
  return saved && AVAILABLE_THEMES.includes(saved) ? saved : 'sakura'
}