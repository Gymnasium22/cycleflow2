import { createContext, useContext, useEffect, useState } from 'react'

const TelegramContext = createContext(null)

const TG_SCRIPT_URL = 'https://telegram.org/js/telegram-web-app.js'

function loadTelegramScript() {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${TG_SCRIPT_URL}"]`)) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = TG_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Telegram WebApp script'))
    document.head.appendChild(script)
  })
}

function waitForTelegramWebApp(timeout = 3000) {
  return new Promise((resolve) => {
    const start = Date.now()

    const check = () => {
      try {
        const tg = window.Telegram?.WebApp
        if (tg) {
          resolve(tg)
          return
        }
      } catch {
        // ignore
      }

      if (Date.now() - start > timeout) {
        resolve(null)
        return
      }
      setTimeout(check, 100)
    }

    check()
  })
}

export function TelegramProvider({ children }) {
  const [webApp, setWebApp] = useState(null)
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [themeParams, setThemeParams] = useState({})
  const [initData, setInitData] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        // Ensure the Telegram script is loaded (index.html also includes it)
        await loadTelegramScript()

        if (!isMounted) return

        const tg = await waitForTelegramWebApp()

        if (!isMounted) return

        if (tg) {
          console.log('[Telegram] WebApp detected', {
            initData: tg.initData ? 'present' : 'missing',
            initDataUnsafe: tg.initDataUnsafe ? 'present' : 'missing',
            version: tg.version,
            platform: tg.platform,
          })

          try {
            tg.ready()
            tg.expand()
          } catch (err) {
            console.warn('[Telegram] ready/expand error:', err)
          }

          setWebApp(tg)
          setInitData(tg.initData || null)
          const tgUser = tg.initDataUnsafe?.user || null
          console.log('[Telegram] User from initDataUnsafe:', tgUser)
          setUser(tgUser)
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

          tg.onEvent('themeChanged', () => {
            if (!isMounted) return
            const updated = tg.themeParams
            setThemeParams(updated)
            const root = document.documentElement
            if (updated.bg_color) root.style.setProperty('--tg-theme-bg-color', updated.bg_color)
            if (updated.text_color) root.style.setProperty('--tg-theme-text-color', updated.text_color)
            if (updated.hint_color) root.style.setProperty('--tg-theme-hint-color', updated.hint_color)
            if (updated.link_color) root.style.setProperty('--tg-theme-link-color', updated.link_color)
            if (updated.button_color) root.style.setProperty('--tg-theme-button-color', updated.button_color)
            if (updated.button_text_color) root.style.setProperty('--tg-theme-button-text-color', updated.button_text_color)
            if (updated.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', updated.secondary_bg_color)
          })
        } else {
          console.warn('[Telegram] WebApp not detected, running in fallback mode')
          try {
            const savedLang = localStorage.getItem('i18nextLng')
            setUser({
              id: 123456,
              first_name: 'Test',
              username: 'test_user',
              language_code: savedLang || 'ru',
            })
          } catch {
            setUser({
              id: 123456,
              first_name: 'Test',
              username: 'test_user',
              language_code: 'ru',
            })
          }
        }
      } catch (err) {
        console.error('[Telegram] Init error:', err)
        if (isMounted) {
          setError(err.message)
        }
      } finally {
        if (isMounted) {
          setReady(true)
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 bg-white text-black">
        <h2 className="text-xl font-bold mb-2">Ошибка Telegram WebApp</h2>
        <p className="text-sm text-gray-600 text-center">{error}</p>
      </div>
    )
  }

  const hapticFeedback = {
    impact: (style = 'light') => {
      try {
        webApp?.HapticFeedback?.impactOccurred(style)
      } catch {
        // ignore
      }
    },
    notification: (type = 'success') => {
      try {
        webApp?.HapticFeedback?.notificationOccurred(type)
      } catch {
        // ignore
      }
    },
  }

  return (
    <TelegramContext.Provider value={{ webApp, user, ready, themeParams, initData, hapticFeedback }}>
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
