import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Layers } from 'lucide-react'

const fmtDate = s => s ? new Date(s+'T00:00:00').toLocaleDateString('pt-BR') : '—'
const emptyForm = { cliente_id:'', procedimento_id:'', total_sessoes:5, intervalo_dias:21, data_inicio:'', obs:'' }

export default function Sessoes() {
  const [sessoes, setSessoes] = useState([])
  const [clientes, setClientes] = useState([])
  const [procedimentos, setProcedimentos] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientes, setShowClientes] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [filtro, setFiltro] = useState('ativas')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: ss }, { data: cl }, { data: pr }] = await Promise.all([
      supabase.from('sessoes').select('*,clientes(nome,telefone),procedimentos(nome)').order('created_at', { ascending:false }),
      supabase.from('clientes').select('id,nome,telefone').eq('ativa',true).order('nome'),
      supabase.from('procedimentos').select('*').order('nome'),
    ])
    setSessoes(ss || [])
    setClientes(cl || [])
    setProcedimentos(pr || [])
  }

  const hoje = new Date()
  const filtradas = sessoes.filter(s => {
    if (filtro === 'ativas') return s.status === 'ativa'
    if (filtro === 'concluidas') return s.status === 'concluida'
    return true
  })

  function selecionarCliente(c) {
    setForm(f => ({ ...f, cliente_id: c.id }))
    setBuscaCliente(c.nome); setShowClientes(false)
  }

  async function save() {
    if (!form.cliente_id || !form.procedimento_id || !form.data_inicio) {
      return showToast('Preencha cliente, procedimento e data de início', 'error')
    }
    setSaving(true)
    const proxima = new Date(form.data_inicio)
    proxima.setDate(proxima.getDate() + Number(form.intervalo_dias))
    const payload = {
      cliente_id: form.cliente_id,
      procedimento_id: form.procedimento_id,
      total_sessoes: Number(form.total_sessoes),
      sessoes_feitas: 0,
      intervalo_dias: Number(form.intervalo_dias),
      data_inicio: form.data_inicio,
      data_proxima: proxima.toISOString().split('T')[0],
      obs: form.obs,
      status: 'ativa',
    }
    if (editId) await supabase.from('sessoes').update(payload).eq('id', editId)
    else await supabase.from('sessoes').insert(payload)
    setSaving(false); setModal(false)
    showToast('Salvo ✓'); load()
  }

  async function registrarSessao(sessao) {
    setRegistrando(sessao.id)
    const novaFeitas = (sessao.sessoes_feitas || 0) + 1
    const hoje2 = new Date().toISOString().split('T')[0]
    const proxima = new Date(); proxima.setDate(proxima.getDate() + (sessao.intervalo_dias || 21))
    const concluida = novaFeitas >= sessao.total_sessoes

    // Criar atendimento
    await supabase.from('atendimentos').insert({
      cliente_id: sessao.cliente_id,
      procedimento_id: sessao.procedimento_id,
      data_hora: new Date().toISOString(),
      sessao_numero: novaFeitas,
      sessao_total: sessao.total_sessoes,
      sessao_id: sessao.id,
    })

    await supabase.from('sessoes').update({
      sessoes_feitas: novaFeitas,
      data_ultima: hoje2,
      data_proxima: concluida ? null : proxima.toISOString().split('T')[0],
      status: concluida ? 'concluida' : 'ativa',
    }).eq('id', sessao.id)

    setRegistrando(null)
    showToast(concluida ? 'Protocolo concluído! ✓' : `Sessão ${novaFeitas} registrada ✓`)
    load()
  }

  async function del() {
    setDeleting(true)
    await supabase.from('sessoes').delete().eq('id', confirmDel)
    setDeleting(false); setConfirmDel(null)
    showToast('Excluído'); load()
  }

  const clientesFiltrados = clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).slice(0, 8)

  const isAtrasada = s => s.data_proxima && new Date(s.data_proxima) < hoje && s.status === 'ativa'

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-center justify-between flex-wrap">
        <div className="flex gap-1 bg-purple-100 rounded-xl p-1">
          {[['ativas','Ativas'],['concluidas','Concluídas'],['todas','Todas']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltro(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro===val ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-500 hover:text-purple-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setBuscaCliente(''); setModal(true) }}>
          <Plus size={16} /> Nova Ficha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtradas.map(s => {
          const atrasada = isAtrasada(s)
          const concluida = s.status === 'concluida'
          const proc = procedimentos.find(p => p.id === s.procedimento_id)
          return (
            <div key={s.id} className={`card space-y-3 ${atrasada ? 'border-yellow-300' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-purple-900">{s.clientes?.nome}</p>
                  <p className="text-sm text-gray-500">{s.procedimentos?.nome}</p>
                </div>
                <div className="flex items-center gap-1">
                  {atrasada && <span className="badge bg-yellow-100 text-yellow-700 flex items-center gap-1"><AlertTriangle size={10}/> Atrasado</span>}
                  {concluida && <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={10}/> Concluído</span>}
                </div>
              </div>

              {/* Dots visuais */}
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: s.total_sessoes }).map((_, i) => {
                  const feita = i < (s.sessoes_feitas||0)
                  const proxima = i === (s.sessoes_feitas||0) && !concluida
                  return (
                    <div key={i} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                      ${feita ? 'bg-purple-600 border-purple-600' : proxima ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300' : 'border-purple-200'}`}>
                      {feita && <CheckCircle size={12} className="text-white" />}
                      {proxima && <span className="text-purple-500 text-xs font-bold">{i+1}</span>}
                    </div>
                  )
                })}
              </div>

              {/* Barra progresso */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{s.sessoes_feitas}/{s.total_sessoes} sessões</span>
                  <span>{Math.round(((s.sessoes_feitas||0)/s.total_sessoes)*100)}%</span>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all"
                    style={{ width:`${((s.sessoes_feitas||0)/s.total_sessoes)*100}%` }} />
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-0.5">
                <p>Última: <b className="text-purple-700">{fmtDate(s.data_ultima)}</b></p>
                {s.data_proxima && <p>Próxima: <b className={atrasada?'text-yellow-600':'text-purple-700'}>{fmtDate(s.data_proxima)}</b></p>}
                <p>Intervalo: {s.intervalo_dias} dias</p>
              </div>

              {!concluida && (
                <button onClick={() => registrarSessao(s)} disabled={registrando === s.id}
                  className="btn-primary w-full justify-center text-sm py-2">
                  {registrando === s.id ? 'Registrando...' : `✓ Registrar sessão ${(s.sessoes_feitas||0)+1}`}
                </button>
              )}

              <div className="flex gap-2 pt-2 border-t border-purple-50">
                <button onClick={() => {
                  setForm({ cliente_id:s.cliente_id, procedimento_id:s.procedimento_id, total_sessoes:s.total_sessoes, intervalo_dias:s.intervalo_dias, data_inicio:s.data_inicio||'', obs:s.obs||'' })
                  setBuscaCliente(s.clientes?.nome||''); setEditId(s.id); setModal(true)
                }} className="flex-1 btn-ghost py-1.5 text-xs justify-center"><Pencil size={13}/> Editar</button>
                <button onClick={() => setConfirmDel(s.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-400"><Trash2 size={14}/></button>
              </div>
            </div>
          )
        })}
        {filtradas.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 card text-center py-16">
            <Layers size={40} className="mx-auto text-purple-200 mb-3" />
            <p className="text-gray-400">Nenhuma sessão encontrada</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Ficha' : 'Nova Ficha de Sessão'} size="md">
        <div className="space-y-4">
          <div className="relative">
            <label className="label">Cliente *</label>
            <input className="input" placeholder="Buscar cliente..." value={buscaCliente}
              onChange={e => { setBuscaCliente(e.target.value); setShowClientes(true) }}
              onFocus={() => setShowClientes(true)} />
            {showClientes && buscaCliente && (
              <div className="absolute z-10 left-0 right-0 bg-white border border-purple-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                {clientesFiltrados.map(c => (
                  <button key={c.id} className="w-full text-left px-4 py-2.5 hover:bg-purple-50 text-sm" onClick={() => selecionarCliente(c)}>
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Procedimento *</label>
            <select className="input" value={form.procedimento_id} onChange={e=>setForm(f=>({...f,procedimento_id:e.target.value}))}>
              <option value="">Selecionar...</option>
              {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Total sessões</label><input className="input" type="number" min="1" value={form.total_sessoes} onChange={e=>setForm(f=>({...f,total_sessoes:e.target.value}))} /></div>
            <div><label className="label">Intervalo (dias)</label><input className="input" type="number" min="1" value={form.intervalo_dias} onChange={e=>setForm(f=>({...f,intervalo_dias:e.target.value}))} /></div>
            <div><label className="label">1ª sessão</label><input className="input" type="date" value={form.data_inicio} onChange={e=>setForm(f=>({...f,data_inicio:e.target.value}))} /></div>
          </div>
          <div><label className="label">Observações</label><textarea className="input" rows={2} value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} /></div>
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={del}
        title="Excluir ficha de sessão" loading={deleting} />
    </div>
  )
}
