import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, ExternalLink } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { Spinner } from './Spinner'

/**
 * First-run medical disclaimer (US/EU compliance).
 * Not medical advice — user must accept to continue.
 */
export function DisclaimerModal({ isOpen, onAccept, loading = false }) {
  const { t } = useTranslation()
  const [checked, setChecked] = useState(false)

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] shadow-2xl p-6 space-y-4 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <ShieldAlert className="text-amber-600" size={26} />
            </div>
            <div>
              <h2 id="disclaimer-title" className="font-display text-xl font-semibold">
                {t('disclaimer.title')}
              </h2>
              <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                {t('disclaimer.subtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[var(--tg-theme-text-color,#111827)]">
            <p className="font-semibold text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              {t('disclaimer.notMedical')}
            </p>
            <p>{t('disclaimer.body')}</p>
            <ul className="list-disc pl-5 space-y-1 text-[var(--tg-theme-hint-color,#4b5563)]">
              <li>{t('disclaimer.point1')}</li>
              <li>{t('disclaimer.point2')}</li>
              <li>{t('disclaimer.point3')}</li>
            </ul>
            <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              {t('disclaimer.privacyNote')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="#privacy"
              onClick={(e) => {
                e.preventDefault()
                window.dispatchEvent(new CustomEvent('cicle:open-legal', { detail: 'privacy' }))
              }}
              className="inline-flex items-center gap-1 text-[var(--tg-theme-link-color,#2563eb)] font-medium"
            >
              {t('legal.privacy')}
              <ExternalLink size={12} />
            </a>
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault()
                window.dispatchEvent(new CustomEvent('cicle:open-legal', { detail: 'terms' }))
              }}
              className="inline-flex items-center gap-1 text-[var(--tg-theme-link-color,#2563eb)] font-medium"
            >
              {t('legal.terms')}
              <ExternalLink size={12} />
            </a>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/25 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[var(--tg-theme-button-color,#e11d48)]"
            />
            <span className="text-sm font-medium">{t('disclaimer.acceptCheckbox')}</span>
          </label>

          <button
            type="button"
            disabled={!checked || loading}
            onClick={onAccept}
            className="w-full py-3.5 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size={18} />}
            {t('disclaimer.continue')}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
