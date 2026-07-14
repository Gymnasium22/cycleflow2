import { useTranslation } from 'react-i18next'
import { FileText, Share2, Eye, X, CheckCircle2 } from 'lucide-react'
import { Spinner } from './Spinner'

/**
 * In-page PDF delivery card — always visible under the export button.
 * Works in Telegram Mini App where silent download is blocked.
 */
export function PdfReadyCard({
  filename,
  fileSizeLabel,
  onShare,
  onView,
  onDismiss,
  sharing = false,
  viewing = false,
}) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-2xl border-2 border-[var(--tg-theme-button-color,#e11d48)]/40 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] p-4 space-y-3 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="text-emerald-600" size={22} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[var(--tg-theme-text-color,#111827)]">
            {t('settings.pdfReadyTitle')}
          </p>
          <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] mt-0.5 break-all">
            {filename}
            {fileSizeLabel ? ` · ${fileSizeLabel}` : ''}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[var(--tg-theme-hint-color,#6b7280)]"
            aria-label={t('common.cancel')}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-[var(--tg-theme-text-color,#111827)] bg-[var(--tg-theme-bg-color,#fff)]/60 rounded-xl px-3 py-2 border border-[var(--tg-theme-hint-color,#d1d5db)]/20">
        {t('settings.pdfReadySteps')}
      </p>

      <button
        type="button"
        onClick={onShare}
        disabled={sharing}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold text-sm disabled:opacity-60 active:scale-[0.99]"
      >
        {sharing ? <Spinner size={18} /> : <Share2 size={18} aria-hidden />}
        {t('settings.pdfShare')}
      </button>

      <button
        type="button"
        onClick={onView}
        disabled={viewing}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[var(--tg-theme-hint-color,#d1d5db)]/35 font-semibold text-sm active:scale-[0.99]"
      >
        {viewing ? <Spinner size={18} /> : <Eye size={18} aria-hidden />}
        {t('settings.pdfView')}
      </button>

      <div className="flex items-center gap-2 text-[11px] text-[var(--tg-theme-hint-color,#6b7280)]">
        <FileText size={14} className="shrink-0" aria-hidden />
        <span>{t('settings.pdfShareHelp')}</span>
      </div>
    </div>
  )
}

export function formatBytes(n) {
  if (!n || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
