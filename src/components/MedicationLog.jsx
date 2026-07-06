import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronLeft, ChevronRight, Check, XCircle, Circle } from 'lucide-react'
import { Spinner } from './Spinner'
import { useMedicationLogs } from '../hooks/useMedicationLogs'

export function MedicationLog({ isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const startDate = useMemo(() => {
    return `${year}-${String(month + 1).padStart(2, '0')}-01`
  }, [year, month])

  const endDate = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }, [year, month])

  const { logs, loading, isLoading, markTaken, markSkipped, markPending, refetch } = useMedicationLogs({
    startDate,
    endDate,
  })

  useEffect(() => {
    if (isOpen) refetch()
  }, [isOpen, refetch, startDate, endDate])

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  if (!isOpen) return null

  const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-6 space-y-4 animate-slide-in-bottom">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">{t('settings.medications.history')}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{monthLabel}</span>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
            <ChevronRight size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size={24} />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-[var(--tg-theme-hint-color,#6b7280)] py-8">{t('settings.medications.emptyHistory')}</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const medicationName = log.medications?.name || ''
              const reminderTime = log.medication_reminders?.time || ''
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--tg-theme-text-color,#111827)] truncate">
                      {medicationName}
                    </p>
                    <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                      {log.scheduled_date} {reminderTime}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => markTaken(log.reminder_id, log.scheduled_date)}
                      disabled={isLoading}
                      className={`p-2 rounded-xl transition-colors ${
                        log.status === 'taken'
                          ? 'bg-green-500 text-white'
                          : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-hint-color,#6b7280)] hover:bg-green-50'
                      }`}
                      aria-label={t('settings.medications.taken')}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => markSkipped(log.reminder_id, log.scheduled_date)}
                      disabled={isLoading}
                      className={`p-2 rounded-xl transition-colors ${
                        log.status === 'skipped'
                          ? 'bg-red-500 text-white'
                          : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-hint-color,#6b7280)] hover:bg-red-50'
                      }`}
                      aria-label={t('settings.medications.skipped')}
                    >
                      <XCircle size={16} />
                    </button>
                    <button
                      onClick={() => markPending(log.reminder_id, log.scheduled_date)}
                      disabled={isLoading}
                      className={`p-2 rounded-xl transition-colors ${
                        log.status === 'pending'
                          ? 'bg-amber-500 text-white'
                          : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-hint-color,#6b7280)] hover:bg-amber-50'
                      }`}
                      aria-label={t('settings.medications.pending')}
                    >
                      <Circle size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}