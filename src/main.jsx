import { createRoot } from 'react-dom/client'
import { useState, useEffect } from 'react'

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

function getTelegramInfo() {
  const sources = [
    { name: 'window', obj: window.Telegram },
    { name: 'window.parent', obj: window.parent?.Telegram },
    { name: 'window.top', obj: window.top?.Telegram },
  ]

  return {
    sources: sources.map((s) => ({
      source: s.name,
      hasTelegram: typeof s.obj !== 'undefined',
      keys: s.obj ? Object.keys(s.obj) : [],
      hasWebApp: !!(s.obj && s.obj.WebApp),
    })),
    webviewProxy: typeof window.TelegramWebviewProxy !== 'undefined',
    webviewProxyKeys: window.TelegramWebviewProxy ? Object.keys(window.TelegramWebviewProxy) : [],
    userAgent: navigator.userAgent,
    self: window.self === window.top ? 'top' : 'iframe',
  }
}

function App() {
  const [info, setInfo] = useState(getTelegramInfo())

  useEffect(() => {
    const interval = setInterval(() => {
      setInfo(getTelegramInfo())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Telegram API debug</h1>
      <p style={{ fontSize: 12, color: '#666' }}>Обновляется каждую секунду. Подожди 3-5 секунд.</p>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
