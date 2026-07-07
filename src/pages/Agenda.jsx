import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { showToast } from '../components/Toast'
import { Plus, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'

const STATUS = {
  agendado: { label:'Agendado', color:'bg-purple-100 text-purple-700', dot:'bg-purple-400' },
  confirmado: { label:'Confirmado', color:'bg-green-100 text-green-700', dot:'bg-green-400' },
  concluido: { label:'Concluído', color:'bg-purple-700 text-white', dot:'bg-purple-700' },
  faltou: { label:'Faltou', color:'bg-red-100 text-red-600', dot:'bg-red-400' },
  cancelado: { label:'Cancelado', color:'bg-gray-100 text-gray-500', dot:'bg-gray-300' },
}

const PAGAMENTOS = ['pix','cartao_credito','cartao_debito','dinheiro']
const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v||0)
const maskPhone = v => { const d=v.replace(/\D/g,'').slice(0,11); if(d.length<=2)return`(${d}`;if(d.length<=7)return`(${d.slice(0,2)}) ${d.slice(2)}`;return`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` }

const emptyForm = { cliente_id:'', cliente_nome:'', cliente_tel:'', procedimento_id:'', data:'', hora:'', duracao_min:60, valor:'', pagamento:'pix', obs:'' }

export default function Agenda() {
  const [hoje] = useState(new Date())
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [diaSel, setDiaSel] = useState(hoje.getDate())
  const [agendamentos, setAgendamentos] = useState([])
  const [procedimentos, setProcedimentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientes, setShowClientes] = useState(false)
  const [modoNovoCliente, setModoNovoCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState({ nome:'', telefone:'' })

  useEffect(() => { load() }, [mes])

  async function load() {
    const ini = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString()
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59).toISOString()
    const [{ data: ag }, { data: pr }, { data: cl }] = await Promise.all([
      supabase.from('agendamentos').select('*,clientes(nome,telefone),procedimentos(nome,valor_padrao)').gte('data_hora', ini).lte('data_hora', fim).order('data_hora'),
      supabase.from('procedimentos').select('*').order('nome'),
      supabase.from('clientes').select('id,nome,telefone').eq('ativa', true).order('nome'),
    ])
    setAgendamentos(ag || [])
    setProcedimentos(pr || [])
    setClientes(cl || [])
  }

  const diasComAg = [...new Set(agendamentos.map(a => new Date(a.data_hora).getDate()))]
  const agDia = agendamentos.filter(a => {
    const d = new Date(a.data_hora)
    return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth() && d.getDate() === diaSel
  })

  const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay()
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()

  function prevMes() { setMes(p => new Date(p.getFullYear(), p.getMonth()-1, 1)) }
  function nextMes() { setMes(p => new Date(p.getFullYear(), p.getMonth()+1, 1)) }

  function openNew() {
    const hoje2 = new Date()
    setForm({ ...emptyForm, data: hoje2.toISOString().split('T')[0], hora: `${String(hoje2.getHours()).padStart(2,'0')}:00` })
    setEditId(null); setBuscaCliente(''); setModoNovoCliente(false)
    setModal(true)
  }

  function selecionarProc(pid) {
    const proc = procedimentos.find(p => p.id === pid)
    setForm(f => ({ ...f, procedimento_id: pid, valor: proc?.valor_padrao || '', duracao_min: proc?.duracao_min || 60 }))
  }

  function selecionarCliente(c) {
    setForm(f => ({ ...f, cliente_id: c.id, cliente_nome: c.nome, cliente_tel: c.telefone || '' }))
    setBuscaCliente(c.nome); setShowClientes(false)
  }

  async function criarClienteInline() {
    if (!novoCliente.nome.trim()) return
    const { data } = await supabase.from('clientes').insert({ nome: novoCliente.nome, telefone: novoCliente.telefone, ativa: true }).select().single()
    if (data) { selecionarCliente(data); setModoNovoCliente(false); setNovoCliente({ nome:'', telefone:'' }) }
  }

  async function save() {
    if (!form.cliente_id || !form.procedimento_id || !form.data || !form.hora) {
      return showToast('Preencha cliente, procedimento, data e hora', 'error')
    }
    setSaving(true)
    const payload = {
      cliente_id: form.cliente_id,
      procedimento_id: form.procedimento_id,
      data_hora: new Date(`${form.data}T${form.hora}`).toISOString(),
      duracao_min: Number(form.duracao_min),
      valor: Number(form.valor) || 0,
      pagamento: form.pagamento,
      obs: form.obs,
      status: 'agendado',
    }
    if (editId) await supabase.from('agendamentos').update(payload).eq('id', editId)
    else await supabase.from('agendamentos').insert(payload)
    setSaving(false); setModal(false)
    showToast('Salvo ✓'); load()
  }

  async function mudarStatus(ag, novoStatus) {
    await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', ag.id)
    if (novoStatus === 'concluido') {
      await supabase.from('atendimentos').insert({
        cliente_id: ag.cliente_id,
        procedimento_id: ag.procedimento_id,
        agendamento_id: ag.id,
        data_hora: ag.data_hora,
        valor: ag.valor,
        pagamento: ag.pagamento,
        obs: ag.obs,
        sessao_numero: 1,
        sessao_total: 1,
      })
      showToast('Concluído e atendimento criado ✓')
    } else if (novoStatus === 'faltou') {
      const c = ag.clientes
      if (c?.telefone) window.open(`https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(`Oi ${c.nome?.split(' ')[0]}! Que pena que não pôde vir hoje. Vamos reagendar? 💜`)}`, '_blank')
      showToast('Reagendamento enviado')
    }
    load()
  }

  const clientesFiltrados = clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).slice(0, 8)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendário */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMes} className="p-1 hover:bg-purple-50 rounded-lg"><ChevronLeft size={18} className="text-purple-500"/></button>
          <p className="font-semibold text-purple-900 capitalize">
            {mes.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })}
          </p>
          <button onClick={nextMes} className="p-1 hover:bg-purple-50 rounded-lg"><ChevronRight size={18} className="text-purple-500"/></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
          {['D','S','T','Q','Q','S','S'].map((d,i) => <span key={i} className="text-gray-400 font-medium py-1">{d}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({length: primeiroDia}).map((_,i) => <div key={`e-${i}`} />)}
          {Array.from({length: diasMes}).map((_,i) => {
            const dia = i+1
            const temAg = diasComAg.includes(dia)
            const ehHoje = dia===hoje.getDate() && mes.getMonth()===hoje.getMonth() && mes.getFullYear()===hoje.getFullYear()
            const sel = dia === diaSel
            return (
              <button key={dia} onClick={() => setDiaSel(dia)}
                className={`w-full aspect-square rounded-xl text-sm relative transition-colors font-medium
                  ${sel ? 'bg-purple-700 text-white' : ehHoje ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50 text-gray-700'}`}>
                {dia}
                {temAg && !sel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow-400" />}
              </button>
            )
          })}
        </div>

        <button className="btn-primary w-full mt-4 justify-center" onClick={openNew}>
          <Plus size={16} /> Novo Agendamento
        </button>
      </div>

      {/* Linha do tempo */}
      <div className="lg:col-span-2 card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-purple-900">
            {new Date(mes.getFullYear(), mes.getMonth(), diaSel).toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })}
          </h3>
          <span className="badge bg-purple-100 text-purple-700">{agDia.length} agendamento{agDia.length!==1?'s':''}</span>
        </div>

        {agDia.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">📅</p>
            <p>Nenhum agendamento neste dia</p>
          </div>
        )}

        <div className="space-y-3">
          {agDia.map(ag => {
            const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
            const st = STATUS[ag.status] || STATUS.agendado
            return (
              <div key={ag.id} className="flex gap-4 items-start">
                <div className="text-right w-14 shrink-0">
                  <p className="text-sm font-bold text-purple-900">{hora}</p>
                  <p className="text-xs text-gray-400">{ag.duracao_min}min</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${st.dot}`} />
                  <div className="w-0.5 bg-purple-100 self-stretch mt-4 mx-0" />
                </div>
                <div className="flex-1 bg-purple-50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-purple-900">{ag.clientes?.nome}</p>
                      <p className="text-sm text-gray-500">{ag.procedimentos?.nome}</p>
                      <p className="text-sm font-medium text-green-700 mt-0.5">{fmt(ag.valor)} · {ag.pagamento?.replace('_',' ')}</p>
                    </div>
                    <span className={`badge ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {Object.keys(STATUS).filter(s => s !== ag.status).map(s => (
                      <button key={s} onClick={() => mudarStatus(ag, s)}
                        className="text-xs border border-purple-200 px-2 py-0.5 rounded-lg hover:bg-purple-100 text-purple-600">
                        → {STATUS[s].label}
                      </button>
                    ))}
                    {ag.clientes?.telefone && (
                      <a href={`https://wa.me/55${ag.clientes.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                        className="text-xs text-green-600 border border-green-200 px-2 py-0.5 rounded-lg hover:bg-green-50 flex items-center gap-1">
                        <MessageCircle size={11} /> WA
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal Agendamento */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Agendamento' : 'Novo Agendamento'} size="lg">
        <div className="space-y-4">
          {/* Cliente */}
          <div className="relative">
            <label className="label">Cliente *</label>
            {!modoNovoCliente ? (
              <>
                <input className="input" placeholder="Buscar cliente..." value={buscaCliente}
                  onChange={e => { setBuscaCliente(e.target.value); setShowClientes(true); setForm(f=>({...f,cliente_id:''})) }}
                  onFocus={() => setShowClientes(true)} />
                {showClientes && buscaCliente && (
                  <div className="absolute z-10 left-0 right-0 bg-white border border-purple-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {clientesFiltrados.map(c => (
                      <button key={c.id} className="w-full text-left px-4 py-2.5 hover:bg-purple-50 text-sm" onClick={() => selecionarCliente(c)}>
                        <span className="font-medium">{c.nome}</span> <span className="text-gray-400">· {c.telefone}</span>
                      </button>
                    ))}
                    <button className="w-full text-left px-4 py-2.5 hover:bg-purple-50 text-sm text-purple-600 border-t border-purple-100"
                      onClick={() => { setModoNovoCliente(true); setShowClientes(false) }}>
                      + Criar nova cliente: "{buscaCliente}"
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-purple-700">Nova cliente rápida</p>
                <input className="input" placeholder="Nome *" value={novoCliente.nome} onChange={e=>setNovoCliente(p=>({...p,nome:e.target.value}))} />
                <input className="input" placeholder="Telefone" value={novoCliente.telefone} onChange={e=>setNovoCliente(p=>({...p,telefone:maskPhone(e.target.value)}))} />
                <div className="flex gap-2">
                  <button className="btn-ghost py-1.5 text-xs" onClick={() => setModoNovoCliente(false)}>Cancelar</button>
                  <button className="btn-primary py-1.5 text-xs" onClick={criarClienteInline}>Criar e selecionar</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Procedimento *</label>
            <select className="input" value={form.procedimento_id} onChange={e => selecionarProc(e.target.value)}>
              <option value="">Selecionar...</option>
              {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data *</label>
              <input className="input" type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} />
            </div>
            <div>
              <label className="label">Hora *</label>
              <input className="input" type="time" value={form.hora} onChange={e=>setForm(f=>({...f,hora:e.target.value}))} />
            </div>
            <div>
              <label className="label">Duração (min)</label>
              <input className="input" type="number" value={form.duracao_min} onChange={e=>setForm(f=>({...f,duracao_min:e.target.value}))} />
            </div>
            <div>
              <label className="label">Valor</label>
              <input className="input" type="number" step="0.01" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} />
            </div>
          </div>

          <div>
            <label className="label">Pagamento</label>
            <select className="input" value={form.pagamento} onChange={e=>setForm(f=>({...f,pagamento:e.target.value}))}>
              {PAGAMENTOS.map(p => <option key={p} value={p}>{p.replace('_',' ')}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} />
          </div>

          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
