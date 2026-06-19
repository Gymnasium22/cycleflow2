import { createContext, useContext, useEffect, useState } from 'react'

const TelegramContext = createContext(null)

export function TelegramProvider({ children }) {
  const [webApp, setWebApp] = useState(null)
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [themeParams, setThemeParams] = useState({})

  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (tg) {
      tg.ready()
      tg.expand()

      setWebApp(tg)
      setUser(tg.initDataUnsafe?.user || null)
      setThemeParams(tg.themeParams || {})

      const params = tg.themeParams
      if (params) {
        const root = document.documentElement
        if (params.bg_color) root.style.setProperty('--tg-theme-bg-color', params.bg_color)
        if (params.text_color) root.style.setProperty('--tg-theme-text-color', params.text_color)
        if (params.hint_color) root.style.setProperty('--tg-theme-hint-color', params.hint_color)
        if (params.link_color) root.style.setProperty('--tg-theme-link-color', params.link_color)
        if (params.button_color) root.style.setProperty('--tg-theme-button-color', params.button_color)
        if (params.button_text_color) root.style.setProperty('--tg-theme-button-text-color', params.button_text_color)
        if (params.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color)
      }

      setReady(true)
    } else {
      // Development fallback
      const savedLang = localStorage.getItem('i18nextLng')
      setUser({
        id: 123456,
        first_name: 'Test',
        username: 'test_user',
        language_code: savedLang || 'ru',
      })
      setReady(true)
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ webApp, user, ready, themeParams }}>
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider')
  }
  return context
}
