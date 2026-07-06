import { useState, useEffect, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { TelegramProvider, useTelegram } from './context/TelegramContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomeSkeleton } from './components/HomeSkeleton'
import { AnalyticsSkeleton } from './components/AnalyticsSkeleton'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { DebugPanel, initDebugLogging } from './components/DebugPanel'
import { applyTheme, getDefaultTheme } from './utils/theme'

const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))

const TABS = {
  home: <Home />,
  calendar: <Calendar />,
  analytics: (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <Analytics />
    </Suspense>
  ),
  settings: <Settings />,
}

function AppContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('home')
  const [showReload, setShowReload] = useState(false)
  const { loading, profile, authTimedOut, error } = useAuth()

  useEffect(() => {
    if (!loading) {
      setShowReload(false)
      return
    }
    const timer = setTimeout(() => setShowReload(true), 8000)
    return () => clearTimeout(timer)
  }, [loading])

  if (loading && !profile && !showReload) {
    return <HomeSkeleton />
  }

  if (loading && !profile && showReload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
        <HomeSkeleton />
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">
            {error || (authTimedOut ? t('app.loadingFailed') : t('app.loadingSlow'))}
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('cicle_reload_attempted')
              window.location.reload()
            }}
            className="px-4 py-2 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] text-sm font-semibold hover:opacity-90"
          >
            {t('app.reload')}
          </button>
        </div>
      </div>
    )
  }

  if (!profile || profile.onboarding_completed !== true) {
    return <Onboarding />
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {TABS[activeTab]}
    </Layout>
  )
}

function ThemeInitializer() {
  const { webApp } = useTelegram()

  useEffect(() => {
    const theme = getDefaultTheme(!!webApp)
    applyTheme(theme)
    if (!localStorage.getItem('cicle_theme')) {
      localStorage.setItem('cicle_theme', theme)
    }
  }, [webApp])

  return null
}

function App() {
  initDebugLogging()

  return (
    <ErrorBoundary>
      <TelegramProvider>
        <AuthProvider>
          <ThemeInitializer />
          <AppContent />
          {!import.meta.env.PROD && <DebugPanel />}
        </AuthProvider>
      </TelegramProvider>
    </ErrorBoundary>
  )
}

export default App