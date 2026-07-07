import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { Plus, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v||0)
const emptyForm = { nome:'', categoria:'', embalagem_nome:'', embalagem_qtd_atual:0, embalagem_minimo:1, custo_por_embalagem:0, unidades_por_embalagem:1, unidade_nome:'un', fornecedor:'' }

export default function Estoque() {
  const [itens, setItens] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('estoque').select('*').order('nome')
    setItens(data || [])
  }

  const filtrados = itens.filter(i => i.nome?.toLowerCase().includes(busca.toLowerCase()))
  const criticos = itens.filter(i => i.embalagem_qtd_atual <= i.embalagem_minimo)
  const totalValor = itens.reduce((s, i) => s + ((i.embalagem_qtd_atual||0) * (i.custo_por_embalagem||0)), 0)

  function openNew() { setForm(emptyForm); setEditId(null); setModal(true) }
  function openEdit(item) {
    setForm({ nome:item.nome||'', categoria:item.categoria||'', embalagem_nome:item.embalagem_nome||'', embalagem_qtd_atual:item.embalagem_qtd_atual||0, embalagem_minimo:item.embalagem_minimo||1, custo_por_embalagem:item.custo_por_embalagem||0, unidades_por_embalagem:item.unidades_por_embalagem||1, unidade_nome:item.unidade_nome||'un', fornecedor:item.fornecedor||'' })
    setEditId(item.id); setModal(true)
  }

  async function save() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'error')
    setSaving(true)
    const payload = { ...form, embalagem_qtd_atual: Number(form.embalagem_qtd_atual), embalagem_minimo: Number(form.embalagem_minimo), custo_por_embalagem: Number(form.custo_por_embalagem), unidades_por_embalagem: Number(form.unidades_por_embalagem) }
    if (editId) await supabase.from('estoque').update(payload).eq('id', editId)
    else await supabase.from('estoque').insert(payload)
    setSaving(false); setModal(false)
    showToast('Salvo ✓'); load()
  }

  async function ajustarQtd(id, delta) {
    const item = itens.find(i => i.id === id)
    if (!item) return
    const novaQtd = Math.max(0, (item.embalagem_qtd_atual || 0) + delta)
    await supabase.from('estoque').update({ embalagem_qtd_atual: novaQtd }).eq('id', id)
    load()
  }

  async function del() {
    setDeleting(true)
    await supabase.from('estoque').delete().eq('id', confirmDel)
    setDeleting(false); setConfirmDel(null)
    showToast('Excluído'); load()
  }

  const custo_unitario = item => item.unidades_por_embalagem > 0 ? item.custo_por_embalagem / item.unidades_por_embalagem : 0

  return (
    <div className="space-y-5">
      {criticos.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Itens em estoque crítico:</p>
            <p className="text-yellow-700 text-sm">{criticos.map(c => c.nome).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total itens</p>
          <p className="text-2xl font-bold text-purple-700">{itens.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Valor total</p>
          <p className="text-2xl font-bold text-purple-700">{fmt(totalValor)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Itens críticos</p>
          <p className={`text-2xl font-bold ${criticos.length > 0 ? 'text-red-500' : 'text-green-600'}`}>{criticos.length}</p>
        </div>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <input className="input max-w-xs" placeholder="Buscar item..." value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Novo Item</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map(item => {
          const critico = item.embalagem_qtd_atual <= item.embalagem_minimo
          const totalUnid = (item.embalagem_qtd_atual||0) * (item.unidades_por_embalagem||1)
          const valorTotal = (item.embalagem_qtd_atual||0) * (item.custo_por_embalagem||0)
          return (
            <div key={item.id} className={`card transition-shadow hover:shadow-md ${critico ? 'border-yellow-300 bg-yellow-50/50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Package size={16} className={critico ? 'text-yellow-500' : 'text-purple-400'} />
                    <p className="font-semibold text-purple-900">{item.nome}</p>
                  </div>
                  {item.categoria && <p className="text-xs text-gray-400 ml-6">{item.categoria}</p>}
                </div>
                {critico && <span className="badge bg-yellow-100 text-yellow-700 flex items-center gap-1"><AlertTriangle size={11}/>Crítico</span>}
              </div>

              <div className="bg-purple-50 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">{item.embalagem_nome || 'Embalagem'}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => ajustarQtd(item.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold hover:bg-purple-100">−</button>
                    <span className="font-bold text-purple-900 w-8 text-center">{item.embalagem_qtd_atual}</span>
                    <button onClick={() => ajustarQtd(item.id, +1)} className="w-7 h-7 rounded-lg bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold hover:bg-purple-100">+</button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Mín: {item.embalagem_minimo} · Total: {totalUnid.toFixed(1)} {item.unidade_nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <p className="text-gray-400">Custo/embalagem</p>
                  <p className="font-semibold text-purple-900">{fmt(item.custo_por_embalagem)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Custo unitário</p>
                  <p className="font-semibold text-purple-900">{fmt(custo_unitario(item))}/{item.unidade_nome}</p>
                </div>
                <div>
                  <p className="text-gray-400">Valor em estoque</p>
                  <p className="font-semibold text-purple-900">{fmt(valorTotal)}</p>
                </div>
                {item.fornecedor && <div>
                  <p className="text-gray-400">Fornecedor</p>
                  <p className="font-semibold text-purple-900 truncate">{item.fornecedor}</p>
                </div>}
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-purple-50">
                <button onClick={() => openEdit(item)} className="flex-1 btn-ghost py-1.5 text-xs justify-center"><Pencil size={13}/> Editar</button>
                <button onClick={() => setConfirmDel(item.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-400"><Trash2 size={15}/></button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Item' : 'Novo Item'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Nome *</label><input className="input" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} /></div>
          <div><label className="label">Categoria</label><input className="input" placeholder="ex: Ativo, Descartável" value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} /></div>
          <div><label className="label">Fornecedor</label><input className="input" value={form.fornecedor} onChange={e=>setForm(p=>({...p,fornecedor:e.target.value}))} /></div>
          <div><label className="label">Nome da embalagem</label><input className="input" placeholder="ex: Frasco 30ml" value={form.embalagem_nome} onChange={e=>setForm(p=>({...p,embalagem_nome:e.target.value}))} /></div>
          <div><label className="label">Qtd em estoque</label><input className="input" type="number" step="0.1" value={form.embalagem_qtd_atual} onChange={e=>setForm(p=>({...p,embalagem_qtd_atual:e.target.value}))} /></div>
          <div><label className="label">Qtd mínima</label><input className="input" type="number" step="0.1" value={form.embalagem_minimo} onChange={e=>setForm(p=>({...p,embalagem_minimo:e.target.value}))} /></div>
          <div><label className="label">Custo/embalagem (R$)</label><input className="input" type="number" step="0.01" value={form.custo_por_embalagem} onChange={e=>setForm(p=>({...p,custo_por_embalagem:e.target.value}))} /></div>
          <div><label className="label">Unidades/embalagem</label><input className="input" type="number" step="0.01" value={form.unidades_por_embalagem} onChange={e=>setForm(p=>({...p,unidades_por_embalagem:e.target.value}))} /></div>
          <div><label className="label">Unidade</label><input className="input" placeholder="ml, g, un" value={form.unidade_nome} onChange={e=>setForm(p=>({...p,unidade_nome:e.target.value}))} /></div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn-ghost flex-1 justify-center" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
        </div>
      </Modal>

      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={del}
        title="Excluir item do estoque" loading={deleting} />
    </div>
  )
}
