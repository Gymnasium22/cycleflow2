import { createRoot } from 'react-dom/client'
import { TelegramProvider } from './context/TelegramContext'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/Layout'

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
  return (
    <TelegramProvider>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </TelegramProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)
