import { HashRouter, Routes, Route } from 'react-router-dom'
import { TelegramProvider } from './context/TelegramContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Loading } from './components/Loading'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Calendar } from './pages/Calendar'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'

function AppContent() {
  const { loading } = useAuth()

  if (loading) {
    return <Loading />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <TelegramProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TelegramProvider>
    </ErrorBoundary>
  )
}

export default App
