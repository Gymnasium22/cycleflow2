import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { TelegramProvider, useTelegram } from './context/TelegramContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomeSkeleton } from './components/HomeSkeleton'
import { AnalyticsSkeleton } from './components/AnalyticsSkeleton'
import { Layout } from './components/Layout'
import { DisclaimerModal } from './components/DisclaimerModal'
import { LegalModal } from './components/LegalModal'
import { Home } from './pages/Home'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { DebugPanel, initDebugLogging } from './components/DebugPanel'
import { ToastProvider } from './components/Toast'
import { PdfExportHost } from './components/PdfExportHost'
import { applyTheme, resolveStoredTheme, THEME_STORAGE_KEY } from './utils/theme'
import { readTelegramStartParam, parseStartParam } from './lib/botLinks'

const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))
const DISCLAIMER_LS_KEY = 'cicle_disclaimer_accepted'

function renderActiveTab(activeTab, setActiveTab) {
  switch (activeTab) {
    case 'home':
      return <Home onNavigateToCalendar={() => setActiveTab('calendar')} />
    case 'calendar':
      return <Calendar />
    case 'analytics':
      return (
        <Suspense fallback={<AnalyticsSkeleton />}>
          <Analytics />
        </Suspense>
      )
    case 'settings':
      return <Settings />
    default:
      return <Home onNavigateToCalendar={() => setActiveTab('calendar')} />
  }
}

function AppContent() {
  const { t } = useTranslation()
  // Persist tab so heavy work (PDF) cannot "kick" user back to Home silently
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('cicle_active_tab') || 'home'
    } catch {
      return 'home'
    }
  })
  const [showReload, setShowReload] = useState(false)
  const [legalDoc, setLegalDoc] = useState(null)
  const [acceptingDisclaimer, setAcceptingDisclaimer] = useState(false)
  const { loading, profile, authTimedOut, error, updateProfile } = useAuth()

  useEffect(() => {
    try {
      sessionStorage.setItem('cicle_active_tab', activeTab)
    } catch {
      // ignore
    }
  }, [activeTab])

  useEffect(() => {
    if (!loading) {
      setShowReload(false)
      return
    }
    const timer = setTimeout(() => setShowReload(true), 8000)
    return () => clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    function onLegal(e) {
      setLegalDoc(e.detail === 'terms' ? 'terms' : 'privacy')
    }
    window.addEventListener('cicle:open-legal', onLegal)
    return () => window.removeEventListener('cicle:open-legal', onLegal)
  }, [])

  const localDisclaimer = (() => {
    try {
      return localStorage.getItem(DISCLAIMER_LS_KEY) === '1'
    } catch {
      return false
    }
  })()

  const needsDisclaimer =
    !!profile &&
    profile.onboarding_completed === true &&
    !profile.disclaimer_accepted_at &&
    !localDisclaimer

  const handleAcceptDisclaimer = useCallback(async () => {
    setAcceptingDisclaimer(true)
    const ts = new Date().toISOString()
    try {
      localStorage.setItem(DISCLAIMER_LS_KEY, '1')
    } catch {
      // ignore
    }
    await updateProfile({ disclaimer_accepted_at: ts })
    setAcceptingDisclaimer(false)
  }, [updateProfile])

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
    return (
      <>
        <Onboarding />
        <LegalModal isOpen={!!legalDoc} doc={legalDoc || 'privacy'} onClose={() => setLegalDoc(null)} />
      </>
    )
  }

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderActiveTab(activeTab, setActiveTab)}
      </Layout>
      <PdfExportHost />
      <DisclaimerModal
        isOpen={needsDisclaimer}
        onAccept={handleAcceptDisclaimer}
        loading={acceptingDisclaimer}
      />
      <LegalModal isOpen={!!legalDoc} doc={legalDoc || 'privacy'} onClose={() => setLegalDoc(null)} />
    </>
  )
}

function ThemeInitializer() {
  const { webApp } = useTelegram()

  useEffect(() => {
    // Always honor user-saved theme (do NOT force "telegram" inside Mini App)
    const theme = resolveStoredTheme(!!webApp)
    applyTheme(theme)
    try {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        localStorage.setItem(THEME_STORAGE_KEY, theme)
      }
    } catch {
      // ignore
    }
  }, [webApp])

  return null
}

/** Capture ?startapp=ref_ / partner_ when friend opens the Mini App link */
function StartParamCapture() {
  const { webApp } = useTelegram()

  useEffect(() => {
    const param = readTelegramStartParam(webApp)
    if (!param) return
    const parsed = parseStartParam(param)
    try {
      if (parsed.type === 'ref' && parsed.value) {
        localStorage.setItem('cicle_pending_referral', parsed.value)
      }
      if (parsed.type === 'partner' && parsed.value) {
        localStorage.setItem('cicle_pending_partner', parsed.value)
      }
    } catch {
      // ignore
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
          <ToastProvider>
            <ThemeInitializer />
            <StartParamCapture />
            <AppContent />
            {!import.meta.env.PROD && <DebugPanel />}
          </ToastProvider>
        </AuthProvider>
      </TelegramProvider>
    </ErrorBoundary>
  )
}

export default App