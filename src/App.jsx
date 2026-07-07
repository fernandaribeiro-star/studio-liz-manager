import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
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
      </Routes>
    </BrowserRouter>
  )
}
