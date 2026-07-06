import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Trash2, Clock } from 'lucide-react'
import { Spinner } from './Spinner'

const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0]

const COLORS = [
  { value: 'rose', class: 'bg-rose-500' },
  { value: 'violet', class: 'bg-violet-500' },
  { value: 'teal', class: 'bg-teal-500' },
  { value: 'amber', class: 'bg-amber-500' },
  { value: 'blue', class: 'bg-blue-500' },
  { value: 'emerald', class: 'bg-emerald-500' },
]

export function MedicationModal({
  isOpen,
  medication,
  onClose,
  onSave,
  onDelete,
  isLoading,
}) {
  const { t } = useTranslation()
  const dayLabels = t('settings.medications.weekdays', { returnObjects: true })
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [color, setColor] = useState(COLORS[0].value)
  const [reminders, setReminders] = useState([])

  const isEditing = !!medication

  useEffect(() => {
    if (!isOpen) return
    if (medication) {
      setName(medication.name || '')
      setDosage(medication.dosage || '')
      setColor(medication.color || COLORS[0].value)
      setReminders(
        (medication.reminders || []).map((r) => ({
          ...r,
          days_of_week: r.days_of_week || [],
        }))
      )
    } else {
      setName('')
      setDosage('')
      setColor(COLORS[0].value)
      setReminders([
        { id: null, time: '09:00', days_of_week: [1, 2, 3, 4, 5, 6, 0], enabled: true },
      ])
    }
  }, [isOpen, medication])

  function toggleDay(reminderIndex, day) {
    setReminders((prev) =>
      prev.map((r, i) => {
        if (i !== reminderIndex) return r
        const hasDay = r.days_of_week.includes(day)
        return {
          ...r,
          days_of_week: hasDay
            ? r.days_of_week.filter((d) => d !== day)
            : [...r.days_of_week, day].sort(),
        }
      })
    )
  }

  function updateReminderTime(index, time) {
    setReminders((prev) => prev.map((r, i) => (i === index ? { ...r, time } : r)))
  }

  function removeReminder(index) {
    setReminders((prev) => prev.filter((_, i) => i !== index))
  }

  function addReminder() {
    setReminders((prev) => [
      ...prev,
      { id: null, time: '09:00', days_of_week: [1, 2, 3, 4, 5, 6, 0], enabled: true },
    ])
  }

  async function handleSave() {
    if (!name.trim()) return
    await onSave({
      id: medication?.id,
      name: name.trim(),
      dosage: dosage.trim(),
      color,
      reminders,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-6 space-y-4 animate-slide-in-bottom">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">
            {isEditing ? t('settings.medications.edit') : t('settings.medications.add')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">{t('settings.medications.name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settings.medications.namePlaceholder')}
            className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">{t('settings.medications.dosage')}</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder={t('settings.medications.dosagePlaceholder')}
            className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">{t('settings.medications.color')}</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded-full ${c.class} ${color === c.value ? 'ring-2 ring-offset-2 ring-[var(--tg-theme-text-color,#111827)]' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">{t('settings.medications.reminders')}</label>
          {reminders.map((reminder, index) => (
            <div
              key={index}
              className="p-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)] flex items-center gap-1">
                  <Clock size={12} />
                  {t('settings.medications.time')}
                </label>
                <button
                  onClick={() => removeReminder(index)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <input
                type="time"
                value={reminder.time}
                onChange={(e) => updateReminderTime(index, e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-bg-color,#ffffff)] text-center"
              />

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">{t('settings.medications.days')}</label>
                <div className="flex justify-between">
                  {DAY_KEYS.map((dayKey) => {
                    const active = reminder.days_of_week.includes(dayKey)
                    return (
                      <button
                        key={dayKey}
                        onClick={() => toggleDay(index, dayKey)}
                        className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)]'
                            : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-hint-color,#6b7280)]'
                        }`}
                      >
                        {dayLabels[dayKey]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addReminder}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-[var(--tg-theme-hint-color,#d1d5db)] text-[var(--tg-theme-hint-color,#6b7280)] font-medium hover:bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
          >
            <Plus size={16} />
            {t('settings.medications.addReminder')}
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          {isEditing && onDelete && (
            <button
              onClick={onDelete}
              disabled={isLoading}
              className="py-3 px-4 rounded-2xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:opacity-75 disabled:opacity-60"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Spinner size={18} />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
