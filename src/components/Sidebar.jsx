import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, Clipboard, DollarSign, Package, Calculator, Layers, Megaphone, X } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/atendimentos', icon: Clipboard, label: 'Atendimentos' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/estoque', icon: Package, label: 'Estoque' },
  { to: '/precificacao', icon: Calculator, label: 'Precificação' },
  { to: '/sessoes', icon: Layers, label: 'Sessões' },
  { to: '/marketing', icon: Megaphone, label: 'Marketing' },
]

export function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed left-0 top-0 h-full w-60 z-30 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--sidebar)' }}
      >
        <div className="flex items-center justify-between px-6 pt-8 pb-7">
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 27, fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>
              Studio Liz
            </p>
            <p style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginTop: 3 }}>
              Gestão Estética
            </p>
          </div>
          <button onClick={onClose} className="lg:hidden" style={{ color: 'rgba(255,255,255,.5)' }}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 pb-6 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                marginBottom: 2,
                fontSize: 13.5,
                fontWeight: 500,
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                background: isActive ? 'rgba(255,255,255,.065)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,.52)',
                transition: 'all 0.15s',
                textDecoration: 'none',
              })}
              onMouseEnter={e => { if (!e.currentTarget.dataset.active) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.045)' } }}
              onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.color = 'rgba(255,255,255,.52)'; e.currentTarget.style.background = 'transparent' } }}
            >
              <Icon size={15} style={{ opacity: 0.75, flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 pb-6">
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', textAlign: 'center' }}>
            Studio Liz · Painel v2
          </p>
        </div>
      </aside>
    </>
  )
}
