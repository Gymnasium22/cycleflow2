import { useTranslation } from 'react-i18next'
import { CalendarDays, Droplets, Sparkles, ChevronRight } from 'lucide-react'
import { MedicationWidget } from './MedicationWidget'
import { DayNoteEditor } from './DayNoteEditor'
import { formatDate } from '../utils/cycle'
import { formatDaysUntilI18n } from '../utils/formatDaysUntil'
import { getCategoryLabel } from '../data/symptomCategories'

const phaseStyles = {
  menstruation: 'bg-rose-500/15 text-rose-700',
  follicular: 'bg-amber-500/15 text-amber-700',
  ovulation: 'bg-violet-500/15 text-violet-700',
  luteal: 'bg-teal-500/15 text-teal-700',
}

export function TodayWidget({
  dateStr,
  locale,
  phase,
  displayDay,
  displayDayLabel,
  daysUntilPeriod,
  daysUntilOvulation,
  symptoms = [],
  onOpenSymptomPicker,
}) {
  const { t, i18n } = useTranslation()

  return (
    <div className="rounded-3xl p-5 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]/80 border border-[var(--tg-theme-hint-color,#d1d5db)]/15 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tg-theme-hint-color,#6b7280)]">
            {t('todayWidget.title')}
          </p>
          <p className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)] mt-0.5">
            {formatDate(new Date(), locale)}
          </p>
        </div>
        {phase && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${phaseStyles[phase] || ''}`}>
            {t(`home.phase.${phase}`)}
          </span>
        )}
      </div>

      {displayDay != null && (
        <div className="flex items-center gap-4 text-sm">
          <div className="rounded-2xl px-4 py-2 bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20">
            <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{displayDayLabel}</p>
            <p className="text-2xl font-bold text-[var(--tg-theme-text-color,#111827)]">{displayDay}</p>
          </div>
          {(daysUntilPeriod != null || daysUntilOvulation != null) && (
            <div className="flex-1 space-y-1.5 min-w-0">
              {daysUntilPeriod != null && (
                <p className="text-xs text-[var(--tg-theme-text-color,#111827)] flex items-center gap-1.5 truncate">
                  <Droplets size={12} className="text-rose-500 shrink-0" />
                  <span className="truncate">{formatDaysUntilI18n(daysUntilPeriod)}</span>
                </p>
              )}
              {daysUntilOvulation != null && (
                <p className="text-xs text-[var(--tg-theme-text-color,#111827)] flex items-center gap-1.5 truncate">
                  <Sparkles size={12} className="text-violet-500 shrink-0" />
                  <span className="truncate">{formatDaysUntilI18n(daysUntilOvulation)}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <MedicationWidget />

      <DayNoteEditor date={dateStr} compact />

      <div className="space-y-2">
        <button
          type="button"
          onClick={onOpenSymptomPicker}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 hover:border-[var(--tg-theme-button-color,#e11d48)]/30 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-rose-500" />
            <span className="text-sm font-semibold">{t('symptoms.title')}</span>
            {symptoms.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--tg-theme-button-color,#e11d48)]/10 text-[var(--tg-theme-button-color,#e11d48)]">
                {symptoms.length}
              </span>
            )}
          </div>
          <ChevronRight size={16} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
        </button>

        {symptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {symptoms.slice(0, 4).map((s) => (
              <span
                key={s.id}
                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)]"
              >
                {getCategoryLabel(s.symptom_type, i18n.language)}
              </span>
            ))}
            {symptoms.length > 4 && (
              <span className="px-2 py-1 text-[10px] text-[var(--tg-theme-hint-color,#6b7280)]">
                +{symptoms.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}