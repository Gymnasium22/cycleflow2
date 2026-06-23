import { useState, useEffect } from 'react'
import { TelegramProvider } from './context/TelegramContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomeSkeleton } from './components/HomeSkeleton'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Calendar } from './pages/Calendar'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { History } from './pages/History'
import { Onboarding } from './pages/Onboarding'
import { DebugPanel, initDebugLogging } from './components/DebugPanel'
import { applyTheme } from './utils/theme'

const TABS = {
  home: <Home />,
  calendar: <Calendar />,
  history: <History />,
  analytics: <Analytics />,
  settings: <Settings />,
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('home')
  const [showReload, setShowReload] = useState(false)
  const { loading, profile, authTimedOut, error } = useAuth()

  // Show reload button if loading takes too long (before auth timeout kicks in)
  useEffect(() => {
    if (!loading) {
      setShowReload(false)
      return
    }
    const timer = setTimeout(() => setShowReload(true), 8000)
    return () => clearTimeout(timer)
  }, [loading])

  if (loading && !showReload) {
    return <HomeSkeleton />
  }

  if (loading && showReload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
        <HomeSkeleton />
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">
            {error || 'Загрузка занимает слишком много времени...'}
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('cicle_reload_attempted')
              window.location.reload()
            }}
            className="px-4 py-2 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] text-sm font-semibold hover:opacity-90"
          >
            Перезагрузить приложение
          </button>
        </div>
      </div>
    )
  }

  // Show onboarding for new users who haven't completed setup
  if (!profile || profile.onboarding_completed !== true) {
    return <Onboarding />
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {TABS[activeTab]}
    </Layout>
  )
}

function App() {
  initDebugLogging()

  useEffect(() => {
    const savedTheme = localStorage.getItem('cicle_theme') || 'sakura'
    applyTheme(savedTheme)
  }, [])

  return (
    <ErrorBoundary>
      <TelegramProvider>
        <AuthProvider>
          <AppContent />
          {!import.meta.env.PROD && <DebugPanel />}
        </AuthProvider>
      </TelegramProvider>
    </ErrorBoundary>
  )
}

export default App
