export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-10 px-4 space-y-3">
      {Icon && (
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]">
          <Icon size={32} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
        </div>
      )}
      <h3 className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{title}</h3>
      <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] max-w-xs mx-auto">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
