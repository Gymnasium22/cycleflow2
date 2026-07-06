import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { MedicationList } from './MedicationList'
import { MedicationLog } from './MedicationLog'
import { ModalPortal } from './ModalPortal'

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
    <ModalPortal>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-full max-w-md max-h-[min(88vh,720px)] overflow-y-auto rounded-2xl bg-[var(--surface-elevated)] p-5 space-y-4 animate-slide-in-bottom elevation-3 border border-[var(--border-subtle)]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="medication-manage-title"
        >
          <div className="flex items-center justify-between">
            <h3 id="medication-manage-title" className="section-heading text-lg">
              {t('settings.medications.title')}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5"
              aria-label={t('common.cancel')}
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">{t('settings.medicationsHint')}</p>
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
    </ModalPortal>
  )
}