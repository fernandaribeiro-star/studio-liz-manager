import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from './Toast'

const titles = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/agenda': 'Agenda',
  '/atendimentos': 'Atendimentos',
  '/financeiro': 'Financeiro',
  '/estoque': 'Estoque',
  '/precificacao': 'Precificação',
  '/sessoes': 'Sessões',
  '/marketing': 'Marketing',
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const getTitle = () => {
    const path = location.pathname
    if (path.startsWith('/clientes/')) return 'Ficha do Cliente'
    return titles[path] || 'Studio Liz'
  }

  return (
    <div className="flex min-h-screen bg-purple-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={getTitle()} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
