import { useEffect } from 'react'
import { ModalPortal } from './ModalPortal'

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
    <ModalPortal>
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-elevated)] p-6 space-y-4 animate-slide-in-bottom elevation-3 border border-[var(--border-subtle)]">
        <h3 className="section-heading text-[var(--tg-theme-text-color)]">{title}</h3>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl glass-panel font-semibold hover:elevation-1 transition-all"
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
    </ModalPortal>
  )
}
