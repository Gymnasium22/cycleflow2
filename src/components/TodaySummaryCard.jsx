import { useTranslation } from 'react-i18next'
import { Flame, Sparkles, ChevronRight } from 'lucide-react'
import { StreakBadge } from './StreakBadge'

/**
 * Free Home widget: phase + tip + streak + CTA to log wellbeing.
 */
export function TodaySummaryCard({
  phaseLabel,
  phaseHint,
  streak = 0,
  medStreak = 0,
  onLogWellbeing,
}) {
  const { t } = useTranslation()

  return (
    <section
      className="card-elevated p-4 space-y-3 border border-[var(--tg-theme-hint-color,#d1d5db)]/20"
      aria-label={t('todayCard.aria')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tg-theme-hint-color,#6b7280)]">
            {t('todayCard.title')}
          </p>
          <h2 className="font-display text-lg font-semibold text-[var(--tg-theme-text-color,#111827)] mt-0.5">
            {phaseLabel || t('todayCard.noPhase')}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StreakBadge streak={streak} />
          {medStreak > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-800 border border-emerald-500/25">
              <Sparkles size={12} aria-hidden />
              {t('todayCard.medStreak', { count: medStreak })}
            </span>
          )}
        </div>
      </div>

      {phaseHint && (
        <p className="text-sm leading-relaxed text-[var(--tg-theme-hint-color,#4b5563)] flex gap-2">
          <Flame size={16} className="shrink-0 mt-0.5 text-orange-500" aria-hidden />
          <span>{phaseHint}</span>
        </p>
      )}

      <button
        type="button"
        onClick={onLogWellbeing}
        className="w-full flex items-center justify-between gap-2 py-3 px-3.5 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/30 text-sm font-semibold text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/15 active:scale-[0.99] transition-all"
      >
        <span>{t('todayCard.cta')}</span>
        <ChevronRight size={18} className="text-[var(--tg-theme-hint-color,#6b7280)]" aria-hidden />
      </button>
    </section>
  )
}
