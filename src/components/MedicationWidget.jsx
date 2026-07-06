import { useMemo } from 'react'
import { Pill, Check, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMedications } from '../hooks/useMedications'
import { useMedicationLogs } from '../hooks/useMedicationLogs'
import { useTelegram } from '../context/TelegramContext'

const COLOR_CLASSES = {
  rose: 'bg-rose-500 text-white shadow-rose-500/20',
  violet: 'bg-violet-500 text-white shadow-violet-500/20',
  teal: 'bg-[var(--accent-secondary)] text-white shadow-[var(--accent-secondary)]/25',
  amber: 'bg-amber-500 text-white shadow-amber-500/20',
  blue: 'bg-blue-500 text-white shadow-blue-500/20',
  emerald: 'bg-[var(--accent-success-deep)] text-white shadow-[var(--accent-success)]/25',
}

export function MedicationWidget({ inverted = false }) {
  const { t } = useTranslation()
  const { hapticFeedback } = useTelegram()
  const { medications, loading: medsLoading } = useMedications()

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const { logs, markTaken, markPending, loading: logsLoading } = useMedicationLogs({
    startDate: todayStr,
    endDate: todayStr,
  })

  const dayOfWeek = useMemo(() => new Date().getDay(), [])

  const todayReminders = useMemo(() => {
    if (!medications) return []
    const list = []
    for (const med of medications) {
      if (!med.reminders) continue
      for (const rem of med.reminders) {
        if (rem.enabled && rem.days_of_week?.includes(dayOfWeek)) {
          list.push({ medication: med, reminder: rem })
        }
      }
    }
    return list.sort((a, b) => a.reminder.time.localeCompare(b.reminder.time))
  }, [medications, dayOfWeek])

  if (medsLoading || logsLoading || todayReminders.length === 0) {
    return null
  }

  async function handleToggle(reminderId, isTaken) {
    hapticFeedback.impact('medium')
    if (isTaken) {
      await markPending(reminderId, todayStr)
    } else {
      await markTaken(reminderId, todayStr)
    }
  }

  const cardClass = inverted
    ? 'bg-white/15 border-white/20'
    : 'bg-[var(--tg-theme-bg-color,#ffffff)] border-[var(--tg-theme-hint-color,#d1d5db)]/15 shadow-sm'
  const titleClass = inverted ? 'text-white/90' : 'text-[var(--tg-theme-text-color,#111827)]'
  const takenTextClass = inverted ? 'line-through text-white/50' : 'line-through text-[var(--tg-theme-hint-color,#6b7280)]'
  const activeTextClass = inverted ? 'text-white' : 'text-[var(--tg-theme-text-color,#111827)]'
  const hintClass = inverted ? 'text-white/60' : 'text-[var(--tg-theme-hint-color,#6b7280)]'

  return (
    <div className="space-y-2.5">
      <h3 className={`text-sm font-semibold flex items-center gap-2 ${titleClass}`}>
        <Pill size={16} className={inverted ? 'text-white/80' : 'text-[var(--accent-success-deep)]'} />
        {t('settings.medications.widgetTitle')}
      </h3>
      <div className="space-y-2">
        {todayReminders.map(({ medication, reminder }) => {
          const log = logs.find((l) => l.reminder_id === reminder.id)
          const isTaken = log?.status === 'taken'

          return (
            <div
              key={reminder.id}
              onClick={() => handleToggle(reminder.id, isTaken)}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${cardClass}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${COLOR_CLASSES[medication.color] || COLOR_CLASSES.rose}`}>
                  <Pill size={16} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isTaken ? takenTextClass : activeTextClass}`}>
                    {medication.name}
                  </p>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${hintClass}`}>
                    <Clock size={12} />
                    <span>{reminder.time}</span>
                    {medication.dosage && <span> · {medication.dosage}</span>}
                  </p>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all border ${
                  isTaken
                    ? 'btn-success-mark animate-bounce-in'
                    : 'border-[var(--tg-theme-hint-color,#d1d5db)] hover:border-[var(--accent-success)]'
                }`}
              >
                {isTaken && <Check size={14} strokeWidth={3} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}