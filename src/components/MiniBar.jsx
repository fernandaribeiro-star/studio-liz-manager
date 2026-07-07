export function MiniBar({ label, value, max, format }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const formatted = format ? format(value) : value
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-24 shrink-0 truncate" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="flex-1 h-1.5" style={{ background: 'var(--primary-soft)', borderRadius: 1 }}>
        <div
          className="h-1.5 transition-all duration-500"
          style={{ width: `${pct}%`, background: 'var(--primary)', borderRadius: 1 }}
        />
      </div>
      <span className="text-xs font-semibold w-20 text-right shrink-0" style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatted}</span>
    </div>
  )
}
