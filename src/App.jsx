import { HashRouter, Routes, Route } from 'react-router-dom'
import { TelegramProvider } from './context/TelegramContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Loading } from './components/Loading'
import { Home } from './pages/Home'

function AppContent() {
  const { loading } = useAuth()

  if (loading) {
    return <Loading />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </HashRouter>
  )
}

function App() {
  return (
    <TelegramProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TelegramProvider>
  )
}

export default App
