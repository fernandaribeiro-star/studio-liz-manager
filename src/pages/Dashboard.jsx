import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/StatCard'
import { MiniBar } from '../components/MiniBar'
import { showToast } from '../components/Toast'
import {
  DollarSign, TrendingDown, TrendingUp, Ticket,
  Users, Calendar, AlertTriangle, Cake, Package,
  MessageCircle, CheckCircle, Layers
} from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtDT = s => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

function whatsapp(tel, msg = '') {
  const num = '55' + (tel || '').replace(/\D/g, '')
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
}

export default function Dashboard() {
  const [data, setData] = useState({
    faturamento: 0, gastos: 0, atendimentos: 0, ticketMedio: 0,
    proxAgend: null, hoje: [], semDias: [], clientesSemRetorno: [],
    aniversariantes: [], estoquesCriticos: [], sessoesCriticas: []
  })
  const [loadingSave, setLoadingSave] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const agora = new Date()
    const mesIni = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
    const mesFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59).toISOString()
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
    const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59).toISOString()

    const [{ data: atends }, { data: gastos }, { data: agends }, { data: todos }, { data: estoque }, { data: sessoes }] = await Promise.all([
      supabase.from('atendimentos').select('valor,data_hora').gte('data_hora', mesIni).lte('data_hora', mesFim),
      supabase.from('gastos').select('valor').gte('data', mesIni.split('T')[0]).lte('data', mesFim.split('T')[0]),
      supabase.from('agendamentos').select('*,clientes(nome,telefone),procedimentos(nome)').gte('data_hora', inicioDia).lte('data_hora', fimDia).neq('status', 'cancelado').order('data_hora'),
      supabase.from('clientes').select('*,atendimentos(data_hora,valor)').eq('ativa', true),
      supabase.from('estoque').select('*'),
      supabase.from('sessoes').select('*,clientes(nome,telefone),procedimentos(nome)').eq('status', 'ativa'),
    ])

    const faturamento = (atends || []).reduce((s, a) => s + (a.valor || 0), 0)
    const totalGastos = (gastos || []).reduce((s, g) => s + (g.valor || 0), 0)
    const qtd = (atends || []).length
    const ticket = qtd > 0 ? faturamento / qtd : 0

    // Próximo agendamento geral
    const { data: proximos } = await supabase.from('agendamentos')
      .select('*,clientes(nome),procedimentos(nome)')
      .gt('data_hora', agora.toISOString())
      .neq('status', 'cancelado')
      .order('data_hora')
      .limit(1)

    // Semana - barras 7 dias
    const semDias = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(agora); d.setDate(d.getDate() - i)
      const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
      const fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59).toISOString()
      const val = (atends || []).filter(a => a.data_hora >= ini && a.data_hora <= fim).reduce((s, a) => s + (a.valor || 0), 0)
      semDias.push({ label: d.toLocaleDateString('pt-BR', { weekday: 'short' }), value: val })
    }

    // Clientes sem retorno 30d+
    const limite30 = new Date(); limite30.setDate(limite30.getDate() - 30)
    const semRetorno = (todos || []).filter(c => {
      if (!c.atendimentos?.length) return true
      const ultimo = new Date(Math.max(...c.atendimentos.map(a => new Date(a.data_hora))))
      return ultimo < limite30
    }).slice(0, 5)

    // Aniversariantes da semana
    const diaHoje = agora.getDay()
    const inicioSem = new Date(agora); inicioSem.setDate(agora.getDate() - diaHoje)
    const fimSem = new Date(agora); fimSem.setDate(agora.getDate() + (6 - diaHoje))
    const aniv = (todos || []).filter(c => {
      if (!c.nascimento) return false
      const nasc = new Date(c.nascimento + 'T00:00:00')
      const teste = new Date(agora.getFullYear(), nasc.getMonth(), nasc.getDate())
      return teste >= inicioSem && teste <= fimSem
    })

    // Estoque crítico
    const criticos = (estoque || []).filter(e => e.embalagem_qtd_atual <= e.embalagem_minimo)

    // Sessões com retorno atrasado
    const sessoesCrit = (sessoes || []).filter(s => {
      if (!s.data_proxima) return false
      return new Date(s.data_proxima) < agora
    })

    setData({
      faturamento, gastos: totalGastos, atendimentos: qtd, ticketMedio: ticket,
      proxAgend: proximos?.[0] || null,
      hoje: agends || [],
      semDias,
      clientesSemRetorno: semRetorno,
      aniversariantes: aniv,
      estoquesCriticos: criticos,
      sessoesCriticas: sessoesCrit,
    })
  }

  async function concluirAgendamento(id) {
    setLoadingSave(p => ({ ...p, [id]: true }))
    await supabase.from('agendamentos').update({ status: 'concluido' }).eq('id', id)
    showToast('Agendamento concluído ✓')
    await load()
    setLoadingSave(p => ({ ...p, [id]: false }))
  }

  const maxBar = Math.max(...data.semDias.map(d => d.value), 1)
  const lucro = data.faturamento - data.gastos

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Faturamento" value={fmt(data.faturamento)} icon={DollarSign} color="purple" />
        <StatCard title="Gastos" value={fmt(data.gastos)} icon={TrendingDown} color="red" />
        <StatCard title="Lucro" value={fmt(lucro)} icon={TrendingUp} color={lucro >= 0 ? 'green' : 'red'} />
        <StatCard title="Ticket Médio" value={fmt(data.ticketMedio)} icon={Ticket} color="gold" />
        <StatCard title="Atendimentos" value={data.atendimentos} icon={Users} color="blue" />
        <StatCard
          title="Próx. Agendamento"
          value={data.proxAgend ? fmtDT(data.proxAgend.data_hora) : '—'}
          sub={data.proxAgend?.clientes?.nome}
          icon={Calendar}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 7 dias */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-purple-900 mb-4">Faturamento — últimos 7 dias</h3>
          <div className="flex items-end gap-2 h-32">
            {data.semDias.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-purple-700 font-medium">{fmt(d.value).replace('R$ ', 'R$').replace(',00','')}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-purple-700 to-purple-400 transition-all duration-500"
                  style={{ height: `${(d.value / maxBar) * 80}px`, minHeight: 4 }}
                />
                <span className="text-xs text-gray-400 capitalize">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hoje */}
        <div className="card">
          <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-purple-500" /> Hoje
            <span className="ml-auto badge bg-purple-100 text-purple-700">{data.hoje.length}</span>
          </h3>
          {data.hoje.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhum agendamento hoje</p>}
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {data.hoje.map(ag => (
              <div key={ag.id} className="flex items-center justify-between p-2 bg-purple-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-purple-900">{ag.clientes?.nome}</p>
                  <p className="text-xs text-gray-400">{new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {ag.procedimentos?.nome}</p>
                </div>
                {ag.status !== 'concluido' && (
                  <button
                    onClick={() => concluirAgendamento(ag.id)}
                    disabled={loadingSave[ag.id]}
                    className="p-1.5 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors"
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
                {ag.status === 'concluido' && <span className="badge bg-green-100 text-green-700">✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Sem retorno */}
        <div className="card">
          <h3 className="font-semibold text-orange-600 mb-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} /> Sem retorno 30d+
          </h3>
          {data.clientesSemRetorno.length === 0 && <p className="text-xs text-gray-400">Nenhum cliente inativo</p>}
          <div className="space-y-2">
            {data.clientesSemRetorno.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <Link to={`/clientes/${c.id}`} className="text-sm text-purple-700 hover:underline truncate">{c.nome}</Link>
                <button onClick={() => whatsapp(c.telefone, `Oi ${c.nome.split(' ')[0]}! Sentimos sua falta 🌷 Bora agendar?`)}
                  className="p-1 hover:bg-green-50 rounded-lg text-green-600">
                  <MessageCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Aniversariantes */}
        <div className="card">
          <h3 className="font-semibold text-pink-600 mb-3 flex items-center gap-2 text-sm">
            <Cake size={15} /> Aniversariantes da semana
          </h3>
          {data.aniversariantes.length === 0 && <p className="text-xs text-gray-400">Nenhum aniversariante</p>}
          <div className="space-y-2">
            {data.aniversariantes.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">{c.nome.split(' ')[0]}</p>
                  <p className="text-xs text-gray-400">{fmtDate(c.nascimento)}</p>
                </div>
                <button onClick={() => whatsapp(c.telefone, `Feliz aniversário, ${c.nome.split(' ')[0]}! 🎉💜 — Studio Liz`)}
                  className="p-1 hover:bg-green-50 rounded-lg text-green-600">
                  <MessageCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Estoque crítico */}
        <div className="card">
          <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2 text-sm">
            <Package size={15} /> Estoque crítico
          </h3>
          {data.estoquesCriticos.length === 0 && <p className="text-xs text-gray-400">Estoque OK ✓</p>}
          <div className="space-y-2">
            {data.estoquesCriticos.map(e => (
              <div key={e.id} className="flex justify-between items-center">
                <p className="text-sm text-purple-900 truncate">{e.nome}</p>
                <span className="badge bg-red-100 text-red-700">{e.embalagem_qtd_atual} {e.embalagem_nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sessões atrasadas */}
        <div className="card">
          <h3 className="font-semibold text-yellow-600 mb-3 flex items-center gap-2 text-sm">
            <Layers size={15} /> Sessões atrasadas
          </h3>
          {data.sessoesCriticas.length === 0 && <p className="text-xs text-gray-400">Todas em dia ✓</p>}
          <div className="space-y-2">
            {data.sessoesCriticas.map(s => (
              <div key={s.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-purple-900">{s.clientes?.nome?.split(' ')[0]}</p>
                  <p className="text-xs text-gray-400">{s.procedimentos?.nome}</p>
                </div>
                <button onClick={() => whatsapp(s.clientes?.telefone, `Oi ${s.clientes?.nome?.split(' ')[0]}! Sua sessão de ${s.procedimentos?.nome} está aguardando. Bora agendar? 💜`)}
                  className="p-1 hover:bg-green-50 rounded-lg text-green-600">
                  <MessageCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
