export function StatCard({ title, value, sub, icon: Icon, color = 'purple', trend }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    gold: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        {Icon && (
          <div className={`p-2 rounded-xl ${colors[color]}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-purple-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mês anterior
          </p>
        )}
      </div>
    </div>
  )
}
