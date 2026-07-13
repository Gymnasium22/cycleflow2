import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { ModalPortal } from './ModalPortal'

/**
 * In-app Privacy Policy / Terms of Service (GDPR-oriented templates).
 * Replace contact email and operator name before production launch if needed.
 */
export function LegalModal({ isOpen, doc = 'privacy', onClose }) {
  const { t } = useTranslation()
  if (!isOpen) return null

  const title = doc === 'terms' ? t('legal.terms') : t('legal.privacy')
  const paragraphs = t(doc === 'terms' ? 'legal.termsBody' : 'legal.privacyBody', {
    returnObjects: true,
  })
  const body = Array.isArray(paragraphs) ? paragraphs : [String(paragraphs)]

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label={t('common.cancel')} />
        <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between sticky top-0 bg-[var(--tg-theme-bg-color,#ffffff)] pb-2">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-[var(--tg-theme-hint-color,#374151)]">
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('legal.lastUpdated')}</p>
        </div>
      </div>
    </ModalPortal>
  )
}
