import { useEffect, useState, useRef } from 'react'
import { Bug, X, Copy, Trash2 } from 'lucide-react'

const MAX_LOGS = 100

let globalLogs = []
const listeners = new Set()

function notifyListeners() {
  listeners.forEach((fn) => fn([...globalLogs]))
}

function addLog(level, args) {
  try {
    const message = args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')

    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      level,
      message: message.slice(0, 500),
    }

    globalLogs = [entry, ...globalLogs].slice(0, MAX_LOGS)
    notifyListeners()
  } catch {
    // ignore
  }
}

export function initDebugLogging() {
  if (typeof window === 'undefined') return
  if (window.__debugLoggingInitialized) return

  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  console.log = function (...args) {
    originalLog.apply(console, args)
    addLog('log', args)
  }

  console.warn = function (...args) {
    originalWarn.apply(console, args)
    addLog('warn', args)
  }

  console.error = function (...args) {
    originalError.apply(console, args)
    addLog('error', args)
  }

  window.addEventListener('error', (event) => {
    addLog('error', ['Uncaught error:', event.message, event.filename, event.lineno])
  })

  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', ['Unhandled promise rejection:', event.reason])
  })

  window.__debugLoggingInitialized = true
}

export function useDebugLogs() {
  const [logs, setLogs] = useState([...globalLogs])

  useEffect(() => {
    listeners.add(setLogs)
    return () => listeners.delete(setLogs)
  }, [])

  return logs
}

export function DebugPanel() {
  const [open, setOpen] = useState(false)
  const logs = useDebugLogs()
  const scrollRef = useRef(null)

  useEffect(() => {
    initDebugLogging()
  }, [])

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [open, logs])

  function copyLogs() {
    const text = logs
      .map((log) => `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function clearLogs() {
    globalLogs = []
    notifyListeners()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-10 h-10 rounded-full bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] shadow-lg border border-[var(--tg-theme-hint-color,#d1d5db)]/30 flex items-center justify-center"
        title="Debug logs"
      >
        <Bug size={18} />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--tg-theme-hint-color,#d1d5db)]/20">
          <div className="flex items-center gap-2">
            <Bug size={18} className="text-rose-500" />
            <span className="font-semibold">Debug Logs</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyLogs} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20" title="Copy">
              <Copy size={16} />
            </button>
            <button onClick={clearLogs} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20" title="Clear">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {logs.length === 0 && (
            <p className="text-center text-[var(--tg-theme-hint-color,#6b7280)]">No logs yet</p>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className={`break-words ${
                log.level === 'error'
                  ? 'text-red-600'
                  : log.level === 'warn'
                  ? 'text-amber-600'
                  : 'text-[var(--tg-theme-text-color,#111827)]'
              }`}
            >
              <span className="opacity-50">[{log.time}]</span>{' '}
              <span className="font-bold uppercase">{log.level}</span>{' '}
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
