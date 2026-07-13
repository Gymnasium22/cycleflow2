import { createContext, useContext, useEffect, useState } from 'react'
import { applyTelegramThemeParams } from '../utils/theme'

const TelegramContext = createContext(null)

const TG_SCRIPT_URL = 'https://telegram.org/js/telegram-web-app.js'
// How long to poll for initData before giving up and proceeding (3s is enough for Telegram)
const INIT_DATA_TIMEOUT = 3000

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

function applyThemeParams(params) {
  // Only paint Telegram colors when user selected "Like Telegram"
  applyTelegramThemeParams(params)
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
    let pollInterval = null

    async function init() {
      try {
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
          const initialInitData = tg.initData?.length > 0 ? tg.initData : null
          const initialUser = tg.initDataUnsafe?.user || null
          setInitData(initialInitData)
          setUser(initialUser)
          setThemeParams(tg.themeParams || {})
          applyThemeParams(tg.themeParams)

          tg.onEvent('themeChanged', () => {
            if (!isMounted) return
            const updated = tg.themeParams
            setThemeParams(updated)
            const savedTheme = localStorage.getItem('cicle_theme') || 'telegram'
            if (savedTheme === 'telegram') {
              applyThemeParams(updated)
            }
          })

          if (initialInitData) {
            if (isMounted) setReady(true)
            return
          }

          // Telegram WebView sometimes provides initData with a short delay.
          // Poll for it, but keep the app in loading state until we get it or timeout.
          const pollStart = Date.now()
          pollInterval = setInterval(() => {
            if (!isMounted) {
              clearInterval(pollInterval)
              return
            }
            const updatedInitData = tg.initData?.length > 0 ? tg.initData : null
            if (updatedInitData) {
              clearInterval(pollInterval)
              console.log('[Telegram] initData appeared after polling')
              setInitData(updatedInitData)
              const updatedUser = tg.initDataUnsafe?.user || null
              if (updatedUser) setUser(updatedUser)
              setReady(true)
            } else if (Date.now() - pollStart > INIT_DATA_TIMEOUT) {
              clearInterval(pollInterval)
              console.warn('[Telegram] initData still missing after timeout')

              // Try a single clean reload once to get fresh initData
              if (!sessionStorage.getItem('cicle_reload_attempted')) {
                sessionStorage.setItem('cicle_reload_attempted', '1')
                console.log('[Telegram] Attempting reload to get fresh initData...')
                window.location.reload()
                return
              }

              // Already reloaded — proceed without initData (fallback/dev mode)
              console.warn('[Telegram] Already attempted reload, continuing in fallback mode')
              if (isMounted) setReady(true)
            }
          }, 100)
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
          if (isMounted) setReady(true)
        }
      } catch (err) {
        console.error('[Telegram] Init error:', err)
        if (isMounted) {
          setError(err.message)
          setReady(true)
        }
      }
    }

    init()

    return () => {
      isMounted = false
      if (pollInterval) clearInterval(pollInterval)
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
