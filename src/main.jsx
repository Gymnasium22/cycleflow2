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
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Hello from Telegram!</h1>
      <p>Если вы это видите, базовый рендер работает.</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
