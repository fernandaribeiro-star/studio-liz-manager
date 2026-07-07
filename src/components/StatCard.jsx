export function StatCard({ title, value, sub, trend }) {
  return (
    <div className="card flex flex-col gap-3">
      <p className="label">{title}</p>
      <div>
        <p className="stat-num">{value}</p>
        {sub && <p className="mt-1" style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</p>}
        {trend !== undefined && (
          <p className="mt-1 text-xs font-medium" style={{ color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mês anterior
          </p>
        )}
      </div>
    </div>
  )
}
