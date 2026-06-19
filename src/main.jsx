import { createRoot } from 'react-dom/client'

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
  const info = {
    hasTelegram: typeof window.Telegram !== 'undefined',
    telegramKeys: window.Telegram ? Object.keys(window.Telegram) : [],
    hasWebApp: !!(window.Telegram && window.Telegram.WebApp),
    userAgent: navigator.userAgent,
  }

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Window debug</h1>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
