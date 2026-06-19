import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
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

function TestPage() {
  return <div style={{ padding: 20 }}><h1>Router works!</h1></div>
}

function App() {
  return (
    <TelegramProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<TestPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </TelegramProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)
