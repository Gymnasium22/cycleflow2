import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.jsx'

// Global error handler to show errors instead of white screen
window.onerror = function (message, source, lineno, colno, error) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: system-ui, sans-serif; color: #111;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">Ошибка приложения</h2>
        <p style="font-size: 14px; color: #666; margin-bottom: 8px;">${message}</p>
        <p style="font-size: 12px; color: #999;">${source}:${lineno}:${colno}</p>
        <pre style="font-size: 11px; background: #f3f4f6; padding: 10px; border-radius: 8px; overflow-wrap: break-word; margin-top: 12px;">${error?.stack || ''}</pre>
        <button onclick="window.location.reload()" style="margin-top: 16px; padding: 10px 20px; background: #e11d48; color: white; border: none; border-radius: 8px; font-weight: 600;">Перезагрузить</button>
      </div>
    `
  }
  return false
}

window.addEventListener('unhandledrejection', function (event) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: system-ui, sans-serif; color: #111;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">Асинхронная ошибка</h2>
        <p style="font-size: 14px; color: #666; margin-bottom: 8px;">${event.reason?.message || event.reason || 'Unknown error'}</p>
        <pre style="font-size: 11px; background: #f3f4f6; padding: 10px; border-radius: 8px; overflow-wrap: break-word; margin-top: 12px;">${event.reason?.stack || ''}</pre>
        <button onclick="window.location.reload()" style="margin-top: 16px; padding: 10px 20px; background: #e11d48; color: white; border: none; border-radius: 8px; font-weight: 600;">Перезагрузить</button>
      </div>
    `
  }
})

createRoot(document.getElementById('root')).render(<App />)
