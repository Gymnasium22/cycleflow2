import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StickyNote } from 'lucide-react'
import { Spinner } from './Spinner'
import { useDayNotes } from '../hooks/useDayNotes'
import { useTelegram } from '../context/TelegramContext'

export function DayNoteEditor({ date, compact = false }) {
  const { t } = useTranslation()
  const { hapticFeedback } = useTelegram()
  const { note, loading, isSaving, saveNote } = useDayNotes(date)
  const [draft, setDraft] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!loading) setDraft(note || '')
  }, [note, loading, date])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  function handleChange(value) {
    setDraft(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (value.trim() !== (note || '').trim()) {
        await saveNote(value)
        hapticFeedback.notification('success')
      }
    }, 600)
  }

  async function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (draft.trim() !== (note || '').trim()) {
      await saveNote(draft)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <Spinner size={18} />
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-theme-text-color,#111827)]">
          <StickyNote size={16} className="text-amber-500" />
          {t('dayNotes.title')}
        </div>
        {isSaving && <Spinner size={14} />}
      </div>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={t('dayNotes.placeholder')}
        rows={compact ? 2 : 3}
        className="w-full px-3 py-2.5 rounded-xl text-sm border border-[var(--tg-theme-hint-color,#d1d5db)]/30 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] resize-none focus:outline-none focus:border-[var(--tg-theme-button-color,#e11d48)]"
      />
    </div>
  )
}