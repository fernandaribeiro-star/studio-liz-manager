import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/StatCard'
import { showToast } from '../components/Toast'
import { AlertTriangle, Cake, Package, MessageCircle, CheckCircle, Layers, Calendar } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtDT = s => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

function whatsapp(tel, msg = '') {
  window.open(`https://wa.me/55${(tel || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
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

    const { data: proximos } = await supabase.from('agendamentos')
      .select('*,clientes(nome),procedimentos(nome)')
      .gt('data_hora', agora.toISOString()).neq('status', 'cancelado').order('data_hora').limit(1)

    const semDias = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(agora); d.setDate(d.getDate() - i)
      const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
      const fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59).toISOString()
      const val = (atends || []).filter(a => a.data_hora >= ini && a.data_hora <= fim).reduce((s, a) => s + (a.valor || 0), 0)
      semDias.push({ label: d.toLocaleDateString('pt-BR', { weekday: 'short' }), value: val })
    }

    const limite30 = new Date(); limite30.setDate(limite30.getDate() - 30)
    const semRetorno = (todos || []).filter(c => {
      if (!c.atendimentos?.length) return true
      const ultimo = new Date(Math.max(...c.atendimentos.map(a => new Date(a.data_hora))))
      return ultimo < limite30
    }).slice(0, 5)

    const aniv = (todos || []).filter(c => {
      if (!c.nascimento) return false
      const nasc = new Date(c.nascimento + 'T00:00:00')
      const mes = nasc.getMonth()
      const dia = nasc.getDate()
      for (let i = 0; i <= 7; i++) {
        const d = new Date(agora)
        d.setDate(d.getDate() + i)
        if (d.getMonth() === mes && d.getDate() === dia) return true
      }
      return false
    })

    setData({
      faturamento, gastos: totalGastos, atendimentos: qtd,
      ticketMedio: qtd > 0 ? faturamento / qtd : 0,
      proxAgend: proximos?.[0] || null, hoje: agends || [], semDias,
      clientesSemRetorno: semRetorno, aniversariantes: aniv,
      estoquesCriticos: (estoque || []).filter(e => e.embalagem_qtd_atual <= e.embalagem_minimo),
      sessoesCriticas: (sessoes || []).filter(s => s.data_proxima && new Date(s.data_proxima) < agora),
    })
  }

  async function concluirAgendamento(id) {
    setLoadingSave(p => ({ ...p, [id]: true }))
    await supabase.from('agendamentos').update({ status: 'concluido' }).eq('id', id)
    showToast('Agendamento concluído')
    await load()
    setLoadingSave(p => ({ ...p, [id]: false }))
  }

  const maxBar = Math.max(...data.semDias.map(d => d.value), 1)
  const lucro = data.faturamento - data.gastos

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Faturamento" value={fmt(data.faturamento)} />
        <StatCard title="Gastos" value={fmt(data.gastos)} />
        <StatCard title="Lucro" value={fmt(lucro)} />
        <StatCard title="Ticket Médio" value={fmt(data.ticketMedio)} />
        <StatCard title="Atendimentos" value={data.atendimentos} />
        <StatCard title="Próx. Agendamento" value={data.proxAgend ? fmtDT(data.proxAgend.data_hora) : '—'} sub={data.proxAgend?.clientes?.nome} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <p className="section-title mb-5">Faturamento — últimos 7 dias</p>
          <div className="flex items-end gap-2 h-32">
            {data.semDias.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(d.value).replace('R$ ', '').replace(',00', '')}
                </span>
                <div
                  className="w-full transition-all duration-500"
                  style={{ height: `${(d.value / maxBar) * 80}px`, minHeight: 4, background: 'var(--primary)', borderRadius: '2px 2px 0 0' }}
                />
                <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <p className="section-title">Hoje</p>
            <span className="badge ml-auto" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{data.hoje.length}</span>
          </div>
          {data.hoje.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Nenhum agendamento hoje</p>}
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {data.hoje.map(ag => (
              <div key={ag.id} className="flex items-center justify-between p-3" style={{ background: 'var(--primary-soft)', borderRadius: 2 }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{ag.clientes?.nome}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {ag.procedimentos?.nome}
                  </p>
                </div>
                {ag.status !== 'concluido'
                  ? <button onClick={() => concluirAgendamento(ag.id)} disabled={loadingSave[ag.id]}
                      className="p-1.5 text-white transition-colors" style={{ background: 'var(--primary)', borderRadius: 2 }}>
                      <CheckCircle size={14} />
                    </button>
                  : <span className="badge" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Concluído</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card">
          <p className="label mb-3" style={{ color: 'var(--danger)' }}>Sem retorno 30d+</p>
          {data.clientesSemRetorno.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>Nenhum cliente inativo</p>}
          <div className="space-y-2">
            {data.clientesSemRetorno.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <Link to={`/clientes/${c.id}`} className="text-sm hover:underline truncate" style={{ color: 'var(--primary)' }}>{c.nome}</Link>
                <button onClick={() => whatsapp(c.telefone, `Oi ${c.nome.split(' ')[0]}! Sentimos sua falta. Bora agendar?`)}
                  className="p-1 transition-colors" style={{ color: 'var(--success)', borderRadius: 2 }}>
                  <MessageCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="label mb-3">Aniversariantes — próximos 7 dias</p>
          {data.aniversariantes.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>Nenhum aniversariante</p>}
          <div className="space-y-2">
            {data.aniversariantes.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.nome.split(' ')[0]}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{fmtDate(c.nascimento)}</p>
                </div>
                <button onClick={() => whatsapp(c.telefone, `Feliz aniversário, ${c.nome.split(' ')[0]}! — Studio Liz`)}
                  className="p-1 transition-colors" style={{ color: 'var(--success)', borderRadius: 2 }}>
                  <MessageCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="label mb-3" style={{ color: 'var(--danger)' }}>Estoque crítico</p>
          {data.estoquesCriticos.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>Estoque OK</p>}
          <div className="space-y-2">
            {data.estoquesCriticos.map(e => (
              <div key={e.id} className="flex justify-between items-center">
                <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>{e.nome}</p>
                <span className="badge" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{e.embalagem_qtd_atual} {e.embalagem_nome}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="label mb-3" style={{ color: 'var(--accent-dark)' }}>Sessões atrasadas</p>
          {data.sessoesCriticas.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>Todas em dia</p>}
          <div className="space-y-2">
            {data.sessoesCriticas.map(s => (
              <div key={s.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>{s.clientes?.nome?.split(' ')[0]}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.procedimentos?.nome}</p>
                </div>
                <button onClick={() => whatsapp(s.clientes?.telefone, `Oi ${s.clientes?.nome?.split(' ')[0]}! Sua sessão de ${s.procedimentos?.nome} está aguardando. Bora agendar?`)}
                  className="p-1 transition-colors" style={{ color: 'var(--success)', borderRadius: 2 }}>
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
