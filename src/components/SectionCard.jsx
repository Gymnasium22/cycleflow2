export function SectionCard({ icon: Icon, iconClassName, title, children, className = '' }) {
  return (
    <div className={`card-elevated p-4 space-y-3 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color)]">
          {Icon && <Icon size={18} className={iconClassName || 'text-[var(--tg-theme-button-color)]'} strokeWidth={1.75} />}
          <span className="text-sm font-semibold tracking-tight">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}