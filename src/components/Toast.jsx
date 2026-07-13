import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'

const ToastContext = createContext(null)

/**
 * Global lightweight toast near the bottom edge (above tab bar).
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, { duration = 2200 } = {}) => {
    setToast({ message, id: Date.now() })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => () => window.clearTimeout(showToast._t), [showToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 z-[200] -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] max-w-[min(92vw,22rem)] pointer-events-none"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--tg-theme-text-color,#111827)] text-[var(--tg-theme-bg-color,#ffffff)] text-sm font-semibold shadow-xl shadow-black/25 animate-fade-in">
              <Check size={16} className="shrink-0 text-emerald-300" aria-hidden />
              <span className="truncate">{toast.message}</span>
            </div>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      showToast: (msg) => {
        console.info('[toast]', msg)
      },
    }
  }
  return ctx
}
