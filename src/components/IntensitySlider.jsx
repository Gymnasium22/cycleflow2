import { useTelegram } from '../context/TelegramContext'

export function IntensitySlider({ value, onChange, labels }) {
  const { hapticFeedback } = useTelegram()
  const levels = [1, 2, 3]
  const pct = value ? ((value - 1) / 2) * 100 : 0

  function handleChange(level) {
    hapticFeedback.impact('light')
    onChange(level)
  }

  return (
    <div className="space-y-3">
      <div className="relative h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--phase-ovulation)] via-amber-300 to-[var(--phase-menstruation)] transition-all duration-300 ease-premium"
          style={{ width: value ? `${pct + 33}%` : '0%' }}
        />
        <input
          type="range"
          min={1}
          max={3}
          step={1}
          value={value || 1}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="intensity-slider absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between">
        {levels.map((level) => {
          const active = value === level
          const color = level === 1 ? 'text-[var(--phase-ovulation-deep)]' : level === 2 ? 'text-amber-600' : 'text-[var(--phase-menstruation-deep)]'
          return (
            <button
              key={level}
              type="button"
              onClick={() => handleChange(level)}
              className={`text-xs font-semibold transition-all duration-200 ${active ? color + ' scale-105' : 'text-[var(--text-muted)]'}`}
            >
              {labels[level - 1]}
            </button>
          )
        })}
      </div>
    </div>
  )
}