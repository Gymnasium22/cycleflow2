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

function getTelegramInfo() {
  const sources = [
    { name: 'window', obj: window.Telegram },
    { name: 'window.parent', obj: window.parent?.Telegram },
    { name: 'window.top', obj: window.top?.Telegram },
  ]

  return sources.map((s) => ({
    source: s.name,
    hasTelegram: typeof s.obj !== 'undefined',
    keys: s.obj ? Object.keys(s.obj) : [],
    hasWebApp: !!(s.obj && s.obj.WebApp),
    initData: s.obj?.WebApp?.initData || null,
  }))
}

function App() {
  const info = {
    sources: getTelegramInfo(),
    userAgent: navigator.userAgent,
    self: window.self === window.top ? 'top' : 'iframe',
  }

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Telegram sources debug</h1>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
