import { useState } from 'react'
import { TelegramProvider } from './context/TelegramContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Loading } from './components/Loading'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Calendar } from './pages/Calendar'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { History } from './pages/History'
import { Onboarding } from './pages/Onboarding'
import { DebugPanel, initDebugLogging } from './components/DebugPanel'

const TABS = {
  home: <Home />,
  calendar: <Calendar />,
  history: <History />,
  analytics: <Analytics />,
  settings: <Settings />,
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('home')
  const { loading, profile } = useAuth()

  if (loading) {
    return <Loading />
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
