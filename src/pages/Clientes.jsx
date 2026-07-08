import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { Plus, Search, MessageCircle, Pencil, Trash2, ChevronRight, Star } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const maskPhone = v => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

const cores = ['oklch(32% .07 325)','oklch(28% .07 310)','oklch(36% .08 335)','oklch(25% .06 320)','oklch(30% .09 300)','oklch(38% .06 345)']
const corAvatar = nome => cores[(nome?.charCodeAt(0) || 0) % cores.length]
const iniciais = nome => nome?.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || '?'

const emptyForm = { nome:'', telefone:'', email:'', nascimento:'', instagram:'', como_conheceu:'', obs:'', anamnese:'', ativa:true }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [filtro, setFiltro] = useState('Todas')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('clientes').select('*,atendimentos(valor,data_hora)').order('nome')
    setClientes(data || [])
  }

  const hoje = new Date()
  const filtrados = clientes.filter(c => {
    const match = c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca) || c.email?.toLowerCase().includes(busca.toLowerCase())
    if (!match) return false
    if (filtro === 'Ativas') return c.ativa
    if (filtro === 'Inativas') return !c.ativa
    if (filtro === 'Aniversariantes') {
      if (!c.nascimento) return false
      const n = new Date(c.nascimento + 'T00:00:00')
      return n.getMonth() === hoje.getMonth()
    }
    return true
  })

  function openNew() { setForm(emptyForm); setEditId(null); setModal(true) }
  function openEdit(c) {
    setForm({ nome: c.nome||'', telefone: c.telefone||'', email: c.email||'', nascimento: c.nascimento||'', instagram: c.instagram||'', como_conheceu: c.como_conheceu||'', obs: c.obs||'', anamnese: c.anamnese||'', ativa: c.ativa })
    setEditId(c.id); setModal(true)
  }

  async function save() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'error')
    setSaving(true)
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
    const { error } = editId
      ? await supabase.from('clientes').update(payload).eq('id', editId)
      : await supabase.from('clientes').insert(payload)
    setSaving(false)
    if (error) { showToast('Erro ao salvar', 'error'); return }
    setModal(false); showToast('Salvo ✓'); load()
  }

  async function del() {
    setDeleting(true)
    await supabase.from('clientes').delete().eq('id', confirmDel)
    setDeleting(false); setConfirmDel(null)
    showToast('Excluído'); load()
  }

  const totalGasto = c => (c.atendimentos || []).reduce((s, a) => s + (a.valor || 0), 0)
  const ultimoAtend = c => {
    const dts = (c.atendimentos || []).map(a => new Date(a.data_hora))
    if (!dts.length) return null
    return new Date(Math.max(...dts))
  }
  const isAniv = c => {
    if (!c.nascimento) return false
    const n = new Date(c.nascimento + 'T00:00:00')
    return n.getMonth() === hoje.getMonth() && n.getDate() === hoje.getDate()
  }
  const isVip = c => totalGasto(c) >= 1000
  const diasSemRetorno = c => {
    const u = ultimoAtend(c)
    if (!u) return 999
    return Math.floor((hoje - u) / 86400000)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todas','Ativas','Inativas','Aniversariantes'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${filtro===f ? 'bg-purple-700 text-white' : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nova Cliente</button>
      </div>

      <p className="text-sm text-gray-400">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map(c => (
          <div key={c.id} className="card hover:shadow-md transition-shadow group">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 flex items-center justify-center text-white shrink-0"
                style={{ background: corAvatar(c.nome), borderRadius: 2, fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600 }}>
                {iniciais(c.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-purple-900">{c.nome}</p>
                  {isVip(c) && <span className="badge flex items-center gap-0.5" style={{ background: 'oklch(93% .05 78)', color: 'var(--accent-dark)' }}><Star size={10} />VIP</span>}
                  {!c.ativa && <span className="badge" style={{ background: 'var(--border)', color: 'var(--muted)' }}>Inativa</span>}
                  {isAniv(c) && <span className="badge" style={{ background: 'oklch(94% .03 350)', color: 'oklch(50% .1 350)' }}>Aniversário</span>}
                </div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{c.telefone}</p>
                <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--muted)' }}>
                  <span>Total: <b style={{ color: 'var(--primary)' }}>{fmt(totalGasto(c))}</b></span>
                  <span>Último: <b style={{ color: 'var(--ink-soft)' }}>{ultimoAtend(c) ? ultimoAtend(c).toLocaleDateString('pt-BR') : '—'}</b></span>
                  {diasSemRetorno(c) > 30 && <span style={{ color: 'var(--danger)' }}>{diasSemRetorno(c)}d sem retorno</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <Link to={`/clientes/${c.id}`} className="btn-ghost py-1.5 text-xs flex-1 justify-center">
                Ver ficha <ChevronRight size={14} />
              </Link>
              <button onClick={() => window.open(`https://wa.me/55${c.telefone?.replace(/\D/g,'')}`, '_blank')}
                className="p-2 transition-colors" style={{ color: 'var(--success)', borderRadius: 2 }}>
                <MessageCircle size={16} />
              </button>
              <button onClick={() => openEdit(c)} className="p-2 transition-colors" style={{ color: 'var(--primary)', borderRadius: 2 }}>
                <Pencil size={16} />
              </button>
              <button onClick={() => setConfirmDel(c.id)} className="p-2 transition-colors" style={{ color: 'var(--danger)', borderRadius: 2 }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal cadastro */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente' : 'Nova Cliente'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => setForm(p => ({...p, nome: e.target.value}))} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={form.telefone} onChange={e => setForm(p => ({...p, telefone: maskPhone(e.target.value)}))} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
          </div>
          <div>
            <label className="label">Nascimento</label>
            <input className="input" type="date" value={form.nascimento} onChange={e => setForm(p => ({...p, nascimento: e.target.value}))} />
          </div>
          <div>
            <label className="label">Instagram</label>
            <input className="input" placeholder="@usuario" value={form.instagram} onChange={e => setForm(p => ({...p, instagram: e.target.value}))} />
          </div>
          <div>
            <label className="label">Como conheceu</label>
            <select className="input" value={form.como_conheceu} onChange={e => setForm(p => ({...p, como_conheceu: e.target.value}))}>
              <option value="">Selecionar...</option>
              {['Instagram','Facebook','Indicação','Google','Outro'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.ativa ? 'ativa' : 'inativa'} onChange={e => setForm(p => ({...p, ativa: e.target.value === 'ativa'}))}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.obs} onChange={e => setForm(p => ({...p, obs: e.target.value}))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Anamnese (alergias, medicamentos, restrições)</label>
            <textarea className="input" rows={3} value={form.anamnese} onChange={e => setForm(p => ({...p, anamnese: e.target.value}))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn-ghost flex-1 justify-center" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={del}
        title="Excluir cliente" message="Todos os dados desta cliente serão removidos." loading={deleting} />
    </div>
  )
}
