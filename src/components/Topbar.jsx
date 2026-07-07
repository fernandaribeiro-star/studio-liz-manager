import { Menu, Bell, Sparkles } from 'lucide-react'

export function Topbar({ onMenuClick, title }) {
  const now = new Date()
  const hora = now.getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <header className="h-16 bg-white border-b border-purple-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-purple-50 rounded-xl transition-colors"
        >
          <Menu size={20} className="text-purple-600" />
        </button>
        <div>
          <h1 className="font-semibold text-purple-900 text-base leading-none">{title}</h1>
          <p className="text-xs text-gray-400">{saudacao}! ✨</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-purple-50 rounded-xl transition-colors relative">
          <Bell size={18} className="text-purple-400" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
      </div>
    </header>
  )
}
