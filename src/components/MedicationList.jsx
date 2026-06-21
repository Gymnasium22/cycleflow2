import { useState } from 'react'
import { Plus, Pill, Clock, CalendarDays } from 'lucide-react'
import { MedicationModal } from './MedicationModal'

const DAY_LABELS = {
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

const COLOR_CLASSES = {
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
}

export function MedicationList({
  medications,
  isLoading,
  onSaveMedication,
  onDeleteMedication,
  onToggleReminder,
  onOpenHistory,
  lang,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMedication, setEditingMedication] = useState(null)

  function openAdd() {
    setEditingMedication(null)
    setModalOpen(true)
  }

  function openEdit(medication) {
    setEditingMedication(medication)
    setModalOpen(true)
  }

  async function handleSave(data) {
    await onSaveMedication(data)
    setModalOpen(false)
    setEditingMedication(null)
  }

  async function handleDelete() {
    if (!editingMedication) return
    await onDeleteMedication(editingMedication.id)
    setModalOpen(false)
    setEditingMedication(null)
  }

  const t = {
    ru: {
      title: 'Таблетки',
      add: 'Добавить таблетку',
      noMedications: 'Нет добавленных таблеток',
      history: 'История приёма',
      everyDay: 'каждый день',
      days: 'дн.',
    },
    en: {
      title: 'Medications',
      add: 'Add medication',
      noMedications: 'No medications added',
      history: 'Intake history',
      everyDay: 'every day',
      days: 'days',
    },
  }[lang]

  function formatDays(days, l) {
    if (days.length === 7) return t.everyDay
    return days.map((d) => DAY_LABELS[l][d]).join(', ')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{t.title}</span>
        <button
          onClick={() => onOpenHistory?.()}
          className="flex items-center gap-1 text-sm text-[var(--tg-theme-button-color,#e11d48)] font-medium hover:opacity-80"
        >
          <CalendarDays size={16} />
          {t.history}
        </button>
      </div>

      {medications.length === 0 ? (
        <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{t.noMedications}</p>
      ) : (
        <div className="space-y-2">
          {medications.map((medication) => (
            <button
              key={medication.id}
              onClick={() => openEdit(medication)}
              className="w-full text-left p-3 rounded-2xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${COLOR_CLASSES[medication.color] || COLOR_CLASSES.rose}`}>
                  <Pill size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--tg-theme-text-color,#111827)] truncate">
                    {medication.name}
                  </p>
                  {medication.dosage && (
                    <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{medication.dosage}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {(medication.reminders || []).map((reminder) => (
                  <div
                    key={reminder.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleReminder(reminder.id, !reminder.enabled)
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
                      reminder.enabled
                        ? 'bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)]'
                        : 'bg-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-hint-color,#6b7280)] line-through'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {reminder.time}
                    </span>
                    <span className="text-xs truncate max-w-[120px]">
                      {formatDays(reminder.days_of_week || [], lang)}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={openAdd}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[var(--tg-theme-hint-color,#d1d5db)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] disabled:opacity-60"
      >
        <Plus size={18} />
        {t.add}
      </button>

      <MedicationModal
        isOpen={modalOpen}
        medication={editingMedication}
        onClose={() => {
          setModalOpen(false)
          setEditingMedication(null)
        }}
        onSave={handleSave}
        onDelete={isLoading ? null : handleDelete}
        isLoading={isLoading}
        lang={lang}
      />
    </div>
  )
}
