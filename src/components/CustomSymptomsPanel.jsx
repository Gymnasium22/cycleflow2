import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Crown, Lock } from 'lucide-react'
import {
  loadCustomSymptoms,
  saveCustomSymptoms,
  createCustomSymptom,
  MAX_CUSTOM_SYMPTOMS_PREMIUM,
} from '../utils/customSymptoms'

/** Premium: user-defined wellbeing tags */
export function CustomSymptomsPanel({ isPremium, onNeedPremium }) {
  const { t } = useTranslation()
  const [list, setList] = useState(() => loadCustomSymptoms())
  const [label, setLabel] = useState('')

  function persist(next) {
    setList(next)
    saveCustomSymptoms(next)
  }

  function add() {
    if (!isPremium) {
      onNeedPremium?.()
      return
    }
    const trimmed = label.trim()
    if (!trimmed) return
    if (list.length >= MAX_CUSTOM_SYMPTOMS_PREMIUM) return
    persist([...list, createCustomSymptom({ label: trimmed })])
    setLabel('')
  }

  function remove(id) {
    persist(list.filter((s) => s.id !== id))
  }

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-amber-500" aria-hidden />
          <span className="font-semibold">{t('customSymptoms.title')}</span>
        </div>
        {!isPremium && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800">
            Premium
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('customSymptoms.hint')}</p>

      {!isPremium ? (
        <button
          type="button"
          onClick={onNeedPremium}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-amber-500/40 text-sm font-semibold text-amber-900 bg-amber-500/10"
        >
          <Lock size={16} />
          {t('customSymptoms.unlock')}
        </button>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('customSymptoms.placeholder')}
              maxLength={40}
              className="flex-1 px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/40 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-sm"
            />
            <button
              type="button"
              onClick={add}
              className="px-3 py-2 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#fff)]"
              aria-label={t('common.add')}
            >
              <Plus size={18} />
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {list.map((s) => (
              <li
                key={s.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/35 text-[var(--tg-theme-text-color,#111827)]"
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                <button type="button" onClick={() => remove(s.id)} className="text-red-500 p-0.5" aria-label={t('common.delete')}>
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
          {list.length === 0 && (
            <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('customSymptoms.empty')}</p>
          )}
        </>
      )}
    </div>
  )
}
