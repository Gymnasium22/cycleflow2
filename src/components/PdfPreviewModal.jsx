import { useTranslation } from 'react-i18next'
import { X, Share2, Download, ExternalLink } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { Spinner } from './Spinner'

/**
 * Reliable PDF delivery in Telegram Mini App:
 * show preview + explicit Share / Open actions (blob download is blocked in WebView).
 */
export function PdfPreviewModal({
  isOpen,
  onClose,
  blobUrl,
  filename,
  onShare,
  onOpen,
  sharing = false,
}) {
  const { t } = useTranslation()
  if (!isOpen || !blobUrl) return null

  return (
    <ModalPortal onEscape={onClose}>
      <div className="fixed inset-0 z-[120] flex flex-col bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--tg-theme-hint-color,#d1d5db)]/25 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate">{t('settings.pdfPreviewTitle')}</h2>
            <p className="text-[11px] text-[var(--tg-theme-hint-color,#6b7280)] truncate">{filename}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20"
            aria-label={t('common.cancel')}
          >
            <X size={20} />
          </button>
        </div>

        <p className="px-4 py-2 text-xs text-[var(--tg-theme-hint-color,#6b7280)] leading-relaxed shrink-0">
          {t('settings.pdfPreviewHint')}
        </p>

        <div className="flex-1 min-h-0 px-2 pb-2">
          <iframe
            title={filename || 'PDF'}
            src={blobUrl}
            className="w-full h-full rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/30 bg-white"
          />
        </div>

        <div className="shrink-0 p-4 space-y-2 border-t border-[var(--tg-theme-hint-color,#d1d5db)]/25 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onShare}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold disabled:opacity-60"
          >
            {sharing ? <Spinner size={18} /> : <Share2 size={18} />}
            {t('settings.pdfShare')}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[var(--tg-theme-hint-color,#d1d5db)]/30 font-semibold text-sm"
            >
              <ExternalLink size={16} />
              {t('settings.pdfOpen')}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[var(--tg-theme-hint-color,#d1d5db)]/30 font-semibold text-sm"
            >
              <Download size={16} />
              {t('settings.pdfSave')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
