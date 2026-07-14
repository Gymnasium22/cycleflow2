import { useTranslation } from 'react-i18next'
import { Star, Crown, FileText, Check, X, BarChart3, Tags, HeartHandshake, Sparkles } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { Spinner } from './Spinner'
import { PREMIUM_PRODUCTS, PRODUCTS } from '../lib/products'
import { usePremium } from '../hooks/usePremium'

/**
 * Premium / Stars paywall modal with Analytics-style preview.
 * @param {'premium'|'doctor_report'} mode
 */
export function PremiumPaywall({ isOpen, onClose, mode = 'premium' }) {
  const { t } = useTranslation()
  const { premium, daysLeft, purchasing, purchase, lastError, reportCredits } = usePremium()

  if (!isOpen) return null

  const features = [
    { icon: BarChart3, text: t('premium.features.analytics') },
    { icon: Tags, text: t('premium.features.customSymptoms') },
    { icon: HeartHandshake, text: t('premium.features.partner') },
    { icon: FileText, text: t('premium.features.pdf') },
    { icon: Sparkles, text: t('premium.features.insights') },
    { icon: Check, text: t('premium.features.history') },
  ]

  async function handleBuy(productId) {
    const status = await purchase(productId)
    if (status === 'paid') onClose?.()
  }

  return (
    <ModalPortal onEscape={onClose}>
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          aria-label={t('common.cancel')}
          onClick={onClose}
        />
        <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] shadow-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-md">
                <Crown size={22} aria-hidden />
              </div>
              <div>
                <h2 id="paywall-title" className="font-display text-lg font-semibold">
                  {mode === 'doctor_report' ? t('premium.doctorTitle') : t('premium.title')}
                </h2>
                <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                  {premium
                    ? t('premium.activeDays', { count: daysLeft })
                    : t('premium.payWithStars')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20"
              aria-label={t('common.cancel')}
            >
              <X size={18} />
            </button>
          </div>

          {mode !== 'doctor_report' && (
            <>
              {/* Mock Analytics unlock preview */}
              <div
                className="rounded-2xl p-4 text-white bg-gradient-to-br from-violet-500 to-rose-500 shadow-md relative overflow-hidden"
                aria-hidden
              >
                <p className="text-[10px] uppercase tracking-wide text-white/80 font-bold">{t('premium.previewBadge')}</p>
                <p className="font-display text-3xl font-semibold tabular-nums mt-1">28</p>
                <p className="text-xs text-white/85">{t('analytics.averageCycle')} · {t('analytics.days')}</p>
                <div className="mt-3 flex gap-1.5 items-end h-12">
                  {[40, 70, 55, 85, 60, 75, 90].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-white/35"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-white/90">{t('premium.previewCaption')}</p>
              </div>

              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    <f.icon size={16} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {mode === 'doctor_report' && (
            <p className="text-sm text-[var(--tg-theme-hint-color,#4b5563)]">
              {t('premium.doctorHint', { credits: reportCredits })}
            </p>
          )}

          <div className="space-y-2">
            {(mode === 'doctor_report' ? [PRODUCTS.doctor_report] : PREMIUM_PRODUCTS).map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={purchasing}
                onClick={() => handleBuy(p.id)}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--tg-theme-hint-color,#d1d5db)]/30 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] hover:elevation-1 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <div className="text-left min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    {p.id === 'doctor_report' ? <FileText size={14} /> : <Crown size={14} />}
                    {t(p.titleKey)}
                    {p.badge === 'test' && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-700 font-bold">
                        {t('premium.test')}
                      </span>
                    )}
                    {p.badge === 'popular' && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 font-bold">
                        {t('premium.popular')}
                      </span>
                    )}
                    {p.badge === 'value' && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 font-bold">
                        {t('premium.bestValue')}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] mt-0.5 line-clamp-2">
                    {t(p.descKey)}
                  </p>
                </div>
                <span className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-900 font-bold text-sm">
                  {purchasing ? <Spinner size={14} /> : <Star size={14} className="fill-amber-500 text-amber-500" />}
                  {p.stars}
                </span>
              </button>
            ))}
          </div>

          {lastError && (
            <p className="text-xs text-red-600 text-center">
              {t('premium.errors.generic')} ({lastError})
            </p>
          )}

          <p className="text-[11px] leading-snug text-center text-[var(--tg-theme-hint-color,#6b7280)]">
            {t('premium.starsHint')}
          </p>
        </div>
      </div>
    </ModalPortal>
  )
}
