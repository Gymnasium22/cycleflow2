import { useTranslation } from 'react-i18next'

export function Loading() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-rose-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-rose-500 animate-spin" />
      </div>
      <p className="text-sm font-medium text-[var(--tg-theme-hint-color,#6b7280)]">{t('app.loading')}</p>
    </div>
  )
}
