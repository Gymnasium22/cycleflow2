import { useTranslation } from 'react-i18next'
import { Lightbulb, Crown, Lock } from 'lucide-react'

/**
 * Smart non-medical insights. Free: 1 tip. Premium: full list.
 */
export function InsightsCard({ insights = [], isPremium, onUnlock }) {
  const { t } = useTranslation()
  if (!insights.length) return null

  return (
    <section className="card-elevated p-4 space-y-3" aria-label={t('insights.title')}>
      <div className="flex items-center gap-2">
        <Lightbulb size={18} className="text-amber-500" aria-hidden />
        <h2 className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{t('insights.title')}</h2>
      </div>
      <ul className="space-y-2">
        {insights.map((item) => (
          <li
            key={item.id}
            className="text-sm leading-relaxed p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/25 text-[var(--tg-theme-text-color,#111827)]"
          >
            {t(item.key, item.params || {})}
          </li>
        ))}
      </ul>
      {!isPremium && (
        <button
          type="button"
          onClick={onUnlock}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-900 border border-amber-500/25"
        >
          <Lock size={14} aria-hidden />
          {t('insights.unlockMore')}
          <Crown size={14} className="text-amber-600" aria-hidden />
        </button>
      )}
      <p className="text-[11px] text-[var(--tg-theme-hint-color,#6b7280)]">{t('insights.disclaimer')}</p>
    </section>
  )
}
