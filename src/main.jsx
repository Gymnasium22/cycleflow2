import { createRoot } from 'react-dom/client'
import { TelegramProvider, useTelegram } from './context/TelegramContext'
import { AuthProvider, useAuth } from './context/AuthContext'

window.onerror = function (message, source, lineno, colno, error) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: system-ui, sans-serif;">
        <h2>Ошибка: ${message}</h2>
        <p>${source}:${lineno}:${colno}</p>
        <pre style="white-space: pre-wrap;">${error?.stack || ''}</pre>
      </div>
    `
  }
}

function App() {
  const { webApp, user, ready } = useTelegram()
  const { session, profile, loading, error } = useAuth()

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>AuthProvider test</h1>
      <p>Telegram ready: {ready ? 'yes' : 'no'}</p>
      <p>WebApp: {webApp ? 'yes' : 'no'}</p>
      <p>User: {user ? (user.first_name || user.username) : 'no'}</p>
      <hr style={{ margin: '12px 0' }} />
      <p>Auth loading: {loading ? 'yes' : 'no'}</p>
      <p>Auth error: {error || 'no'}</p>
      <p>Session: {session ? 'yes' : 'no'}</p>
      <p>Profile: {profile ? 'yes' : 'no'}</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <TelegramProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </TelegramProvider>
)
