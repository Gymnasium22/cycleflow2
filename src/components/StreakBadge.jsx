import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'

/** Compact gamification badge for logging streak */
export function StreakBadge({ streak = 0, className = '' }) {
  const { t } = useTranslation()
  if (!streak || streak < 1) return null

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/12 text-orange-700 border border-orange-500/20 ${className}`}
      title={t('gamification.streakHint')}
    >
      <Flame size={14} className="text-orange-500" />
      <span>
        {t('gamification.streak', { count: streak })}
      </span>
    </div>
  )
}
