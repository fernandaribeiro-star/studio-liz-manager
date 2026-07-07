import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { Plus, Search, Pencil, Trash2, Camera, X } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v||0)
const fmtDT = s => s ? new Date(s).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'
const maskPhone = v => { const d=v.replace(/\D/g,'').slice(0,11); if(d.length<=2)return`(${d}`;if(d.length<=7)return`(${d.slice(0,2)}) ${d.slice(2)}`;return`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` }

const emptyForm = { cliente_id:'', cliente_nome:'', procedimento_id:'', data_hora:'', valor:'', pagamento:'pix', sessao_numero:1, sessao_total:1, obs:'' }

export default function Atendimentos() {
  const [atendimentos, setAtendimentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [procedimentos, setProcedimentos] = useState([])
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0,7))
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientes, setShowClientes] = useState(false)
  const [fotos, setFotos] = useState([]) // files pendentes
  const [fotosExist, setFotosExist] = useState([])
  const fileRef = useRef()

  useEffect(() => { load() }, [mesSel])

  async function load() {
    const [ano, mes] = mesSel.split('-').map(Number)
    const ini = new Date(ano, mes-1, 1).toISOString()
    const fim = new Date(ano, mes, 0, 23, 59).toISOString()
    const [{ data: at }, { data: cl }, { data: pr }] = await Promise.all([
      supabase.from('atendimentos').select('*,clientes(nome,telefone),procedimentos(nome)').gte('data_hora', ini).lte('data_hora', fim).order('data_hora', { ascending: false }),
      supabase.from('clientes').select('id,nome,telefone').eq('ativa',true).order('nome'),
      supabase.from('procedimentos').select('*').order('nome'),
    ])
    setAtendimentos(at || [])
    setClientes(cl || [])
    setProcedimentos(pr || [])
  }

  const filtrados = atendimentos.filter(a =>
    a.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    a.procedimentos?.nome?.toLowerCase().includes(busca.toLowerCase())
  )

  const totalFaturado = filtrados.reduce((s, a) => s + (a.valor || 0), 0)

  function openNew() {
    const agora = new Date()
    const dt = `${agora.toISOString().split('T')[0]}T${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
    setForm({ ...emptyForm, data_hora: dt })
    setEditId(null); setBuscaCliente(''); setFotos([]); setFotosExist([])
    setModal(true)
  }

  async function openEdit(a) {
    const dh = new Date(a.data_hora)
    const dt = `${dh.toISOString().split('T')[0]}T${String(dh.getHours()).padStart(2,'0')}:${String(dh.getMinutes()).padStart(2,'0')}`
    setForm({ cliente_id:a.cliente_id, cliente_nome:a.clientes?.nome||'', procedimento_id:a.procedimento_id, data_hora:dt, valor:a.valor||'', pagamento:a.pagamento||'pix', sessao_numero:a.sessao_numero||1, sessao_total:a.sessao_total||1, obs:a.obs||'' })
    setEditId(a.id); setBuscaCliente(a.clientes?.nome||''); setFotos([])
    const { data: ft } = await supabase.from('fotos_clientes').select('*').eq('atendimento_id', a.id)
    setFotosExist(ft || [])
    setModal(true)
  }

  function selecionarCliente(c) {
    setForm(f => ({ ...f, cliente_id: c.id, cliente_nome: c.nome }))
    setBuscaCliente(c.nome); setShowClientes(false)
  }

  function selecionarProc(pid) {
    const p = procedimentos.find(p => p.id === pid)
    setForm(f => ({ ...f, procedimento_id: pid, valor: p?.valor_padrao || f.valor }))
  }

  async function save() {
    if (!form.cliente_id || !form.procedimento_id || !form.data_hora) {
      return showToast('Preencha cliente, procedimento e data', 'error')
    }
    setSaving(true)
    const payload = {
      cliente_id: form.cliente_id,
      procedimento_id: form.procedimento_id,
      data_hora: new Date(form.data_hora).toISOString(),
      valor: Number(form.valor) || 0,
      pagamento: form.pagamento,
      sessao_numero: Number(form.sessao_numero) || 1,
      sessao_total: Number(form.sessao_total) || 1,
      obs: form.obs,
    }

    let atendId = editId
    if (editId) {
      await supabase.from('atendimentos').update(payload).eq('id', editId)
    } else {
      const { data } = await supabase.from('atendimentos').insert(payload).select().single()
      atendId = data?.id
    }

    // Upload fotos
    if (atendId && fotos.length > 0) {
      for (const f of fotos) {
        const ext = f.name.split('.').pop()
        const path = `${form.cliente_id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('fotos-clientes').upload(path, f, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('fotos-clientes').getPublicUrl(path)
          await supabase.from('fotos_clientes').insert({ cliente_id: form.cliente_id, atendimento_id: atendId, url: publicUrl })
        }
      }
    }

    // Criar/atualizar sessão se totalSessoes > 1
    if (Number(form.sessao_total) > 1 && !editId) {
      const { data: sessaoExist } = await supabase.from('sessoes')
        .select('*').eq('cliente_id', form.cliente_id).eq('procedimento_id', form.procedimento_id).eq('status', 'ativa').single()
      if (sessaoExist) {
        const novaFeitas = Math.max(sessaoExist.sessoes_feitas + 1, Number(form.sessao_numero))
        await supabase.from('sessoes').update({
          sessoes_feitas: novaFeitas,
          data_ultima: new Date(form.data_hora).toISOString(),
          status: novaFeitas >= sessaoExist.total_sessoes ? 'concluida' : 'ativa',
        }).eq('id', sessaoExist.id)
      } else {
        await supabase.from('sessoes').insert({
          cliente_id: form.cliente_id,
          procedimento_id: form.procedimento_id,
          total_sessoes: Number(form.sessao_total),
          sessoes_feitas: 1,
          data_inicio: new Date(form.data_hora).toISOString().split('T')[0],
          data_ultima: new Date(form.data_hora).toISOString().split('T')[0],
          intervalo_dias: 30,
          status: 'ativa',
        })
      }
    }

    setSaving(false); setModal(false)
    showToast('Salvo ✓'); load()
  }

  async function del() {
    setDeleting(true)
    await supabase.from('atendimentos').delete().eq('id', confirmDel)
    setDeleting(false); setConfirmDel(null)
    showToast('Excluído'); load()
  }

  const clientesFiltrados = clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).slice(0, 8)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <input className="input w-40" type="month" value={mesSel} onChange={e => setMesSel(e.target.value)} />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 w-48" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Novo Atendimento</button>
      </div>

      <div className="card flex gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total faturado</p>
          <p className="text-2xl font-bold text-purple-700">{fmt(totalFaturado)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Atendimentos</p>
          <p className="text-2xl font-bold text-purple-700">{filtrados.length}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-purple-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 pr-4">Data</th>
              <th className="text-left py-2 pr-4">Cliente</th>
              <th className="text-left py-2 pr-4">Procedimento</th>
              <th className="text-left py-2 pr-4">Valor</th>
              <th className="text-left py-2 pr-4">Pgto</th>
              <th className="text-left py-2 pr-4">Sessão</th>
              <th className="text-left py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum atendimento no período</td></tr>
            )}
            {filtrados.map(a => (
              <tr key={a.id} className="border-b border-purple-50 hover:bg-purple-50/40">
                <td className="py-2.5 pr-4 text-gray-500">{fmtDT(a.data_hora)}</td>
                <td className="py-2.5 pr-4 font-medium text-purple-900">{a.clientes?.nome}</td>
                <td className="py-2.5 pr-4 text-gray-600">{a.procedimentos?.nome}</td>
                <td className="py-2.5 pr-4 font-semibold text-green-700">{fmt(a.valor)}</td>
                <td className="py-2.5 pr-4 text-gray-500 capitalize">{a.pagamento?.replace('_',' ')}</td>
                <td className="py-2.5 pr-4">
                  {a.sessao_total > 1 ? <span className="badge bg-purple-100 text-purple-700">{a.sessao_numero}/{a.sessao_total}</span> : '—'}
                </td>
                <td className="py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500"><Pencil size={14}/></button>
                    <button onClick={() => setConfirmDel(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Atendimento' : 'Novo Atendimento'} size="lg">
        <div className="space-y-4">
          <div className="relative">
            <label className="label">Cliente *</label>
            <input className="input" placeholder="Buscar cliente..." value={buscaCliente}
              onChange={e => { setBuscaCliente(e.target.value); setShowClientes(true); setForm(f=>({...f,cliente_id:''})) }}
              onFocus={() => setShowClientes(true)} />
            {showClientes && buscaCliente && clientesFiltrados.length > 0 && (
              <div className="absolute z-10 left-0 right-0 bg-white border border-purple-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {clientesFiltrados.map(c => (
                  <button key={c.id} className="w-full text-left px-4 py-2.5 hover:bg-purple-50 text-sm" onClick={() => selecionarCliente(c)}>
                    {c.nome} <span className="text-gray-400">· {c.telefone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Procedimento *</label>
            <select className="input" value={form.procedimento_id} onChange={e => selecionarProc(e.target.value)}>
              <option value="">Selecionar...</option>
              {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome} — {fmt(p.valor_padrao)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data e hora *</label>
              <input className="input" type="datetime-local" value={form.data_hora} onChange={e=>setForm(f=>({...f,data_hora:e.target.value}))} />
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input className="input" type="number" step="0.01" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} />
            </div>
            <div>
              <label className="label">Pagamento</label>
              <select className="input" value={form.pagamento} onChange={e=>setForm(f=>({...f,pagamento:e.target.value}))}>
                {['pix','cartao_credito','cartao_debito','dinheiro'].map(p=><option key={p} value={p}>{p.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Sessão N°</label>
                <input className="input" type="number" min="1" value={form.sessao_numero} onChange={e=>setForm(f=>({...f,sessao_numero:e.target.value}))} />
              </div>
              <div>
                <label className="label">Total</label>
                <input className="input" type="number" min="1" value={form.sessao_total} onChange={e=>setForm(f=>({...f,sessao_total:e.target.value}))} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} />
          </div>

          {/* Fotos */}
          <div>
            <label className="label">Fotos do atendimento</label>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost py-1.5 text-xs">
              <Camera size={14} /> Adicionar fotos
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => setFotos(prev => [...prev, ...Array.from(e.target.files)])} />
            {(fotos.length > 0 || fotosExist.length > 0) && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {fotosExist.map(f => <img key={f.id} src={f.url} className="w-16 h-16 object-cover rounded-xl border border-purple-100" alt="" />)}
                {fotos.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} className="w-16 h-16 object-cover rounded-xl border border-purple-200" alt="" />
                    <button className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      onClick={() => setFotos(p => p.filter((_,ii) => ii !== i))}><X size={10}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={del}
        title="Excluir atendimento" loading={deleting} />
    </div>
  )
}
