import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteFicha from './pages/ClienteFicha'
import Agenda from './pages/Agenda'
import Atendimentos from './pages/Atendimentos'
import Financeiro from './pages/Financeiro'
import Estoque from './pages/Estoque'
import Precificacao from './pages/Precificacao'
import Sessoes from './pages/Sessoes'
import Marketing from './pages/Marketing'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: 'var(--muted)' }}>Studio Liz</p>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteFicha />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="atendimentos" element={<Atendimentos />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="precificacao" element={<Precificacao />} />
          <Route path="sessoes" element={<Sessoes />} />
          <Route path="marketing" element={<Marketing />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
