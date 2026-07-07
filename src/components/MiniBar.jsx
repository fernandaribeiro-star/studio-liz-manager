export function MiniBar({ label, value, max, color = '#6B46C1', format }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const formatted = format ? format(value) : value
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-purple-50 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold text-purple-900 w-20 text-right shrink-0">{formatted}</span>
    </div>
  )
}
