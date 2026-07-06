import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { MedicationList } from './MedicationList'
import { MedicationLog } from './MedicationLog'

export function MedicationManageModal({
  isOpen,
  onClose,
  medications,
  isLoading,
  onSaveMedication,
  onDeleteMedication,
  onToggleReminder,
}) {
  const { t } = useTranslation()
  const [showHistory, setShowHistory] = useState(false)

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4">
        <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-5 space-y-4 animate-slide-in-bottom">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">
              {t('settings.medications.title')}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('settings.medicationsHint')}</p>
          <MedicationList
            medications={medications}
            isLoading={isLoading}
            onSaveMedication={onSaveMedication}
            onDeleteMedication={onDeleteMedication}
            onToggleReminder={onToggleReminder}
            onOpenHistory={() => setShowHistory(true)}
            showTitle={false}
          />
        </div>
      </div>
      <MedicationLog isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </>
  )
}