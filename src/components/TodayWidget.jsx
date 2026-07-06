import { useTranslation } from 'react-i18next'
import { Pill, Settings2 } from 'lucide-react'
import { MedicationWidget } from './MedicationWidget'
import { DayNoteEditor } from './DayNoteEditor'
import { useMedications } from '../hooks/useMedications'
import { formatDate } from '../utils/cycle'

export function TodayWidget({ dateStr, locale, onManageMedications }) {
  const { t } = useTranslation()
  const { medications } = useMedications()

  return (
    <div className="rounded-3xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]/80 border border-[var(--tg-theme-hint-color,#d1d5db)]/15 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tg-theme-hint-color,#6b7280)]">
            {t('todayWidget.title')}
          </p>
          <p className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
            {formatDate(new Date(), locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={onManageMedications}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] hover:border-emerald-500/30 transition-colors"
        >
          <Pill size={14} className="text-emerald-500" />
          {t('todayWidget.manageMedications')}
          <Settings2 size={12} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
        </button>
      </div>

      <MedicationWidget />
      {medications.length === 0 && (
        <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] -mt-2">
          {t('todayWidget.noMedicationsHint')}
        </p>
      )}
      <DayNoteEditor date={dateStr} compact />
    </div>
  )
}