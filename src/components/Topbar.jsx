import { Menu, Bell } from 'lucide-react'

export function Topbar({ onMenuClick, title }) {
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <header
      className="flex items-center justify-between px-6 lg:px-12 sticky top-0 z-10"
      style={{ height: 86, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="page-title">{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{saudacao}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <Bell size={18} />
        </button>
        <div
          className="flex items-center justify-center text-white text-sm font-semibold"
          style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', fontSize: 13, letterSpacing: '0.05em' }}
        >
          LZ
        </div>
      </div>
    </header>
  )
}
