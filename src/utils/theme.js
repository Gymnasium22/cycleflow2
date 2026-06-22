const THEME_CLASS_PREFIX = 'theme-'
const AVAILABLE_THEMES = ['sakura', 'lavender', 'teal', 'midnight']

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const body = document.body
  for (const t of AVAILABLE_THEMES) {
    body.classList.remove(`${THEME_CLASS_PREFIX}${t}`)
  }
  body.classList.add(`${THEME_CLASS_PREFIX}${theme}`)
}
