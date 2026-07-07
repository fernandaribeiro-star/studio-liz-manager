import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Clipboard, DollarSign,
  Package, Calculator, Layers, Megaphone, X, Sparkles
} from 'lucide-react'

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
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        sidebar-gradient fixed left-0 top-0 h-full w-60 z-30 flex flex-col
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-6 pt-8 pb-6">
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-yellow-300" />
            <div>
              <p className="text-white font-bold text-lg leading-none">Studio Liz</p>
              <p className="text-purple-300 text-xs">Gestão Estética</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-purple-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 pb-6 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-purple-200 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 pb-6">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-purple-200 text-xs">Studio Liz v1.0</p>
            <p className="text-purple-300 text-xs">Gestão completa 💜</p>
          </div>
        </div>
      </aside>
    </>
  )
}
