import { useEffect } from 'react'

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  destructive = false,
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-6 space-y-4 animate-slide-in-bottom shadow-2xl">
        <h3 className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">{title}</h3>
        <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:opacity-75 transition-opacity"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl font-semibold text-white hover:opacity-90 transition-opacity ${
              destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--tg-theme-button-color,#e11d48)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
