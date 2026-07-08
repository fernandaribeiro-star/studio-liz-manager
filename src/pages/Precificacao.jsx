import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { Plus, Settings, Trash2, Pencil, Calculator } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v||0)

const emptyProc = { nome:'', duracao_min:60, valor_padrao:0 }

export default function Precificacao() {
  const [procedimentos, setProcedimentos] = useState([])
  const [estoque, setEstoque] = useState([])
  const [config, setConfig] = useState({ custo_diario:250, atend_dia:10, valor_hora:80 })
  const [insumos, setInsumos] = useState({}) // { proc_id: [{estoque_id, qtd_usada, nome, custo}] }
  const [modal, setModal] = useState(false)
  const [formProc, setFormProc] = useState(emptyProc)
  const [editProcId, setEditProcId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [modalConfig, setModalConfig] = useState(false)
  const [cfgEdit, setCfgEdit] = useState({})
  const [procSel, setProcSel] = useState(null)
  const [novoInsumo, setNovoInsumo] = useState({ estoque_id:'', qtd_usada:1 })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: pr }, { data: est }, { data: cfgs }, { data: ins }] = await Promise.all([
      supabase.from('procedimentos').select('*').order('nome'),
      supabase.from('estoque').select('*').order('nome'),
      supabase.from('config').select('*'),
      supabase.from('procedimento_insumos').select('*'),
    ])
    setProcedimentos(pr || [])
    setEstoque(est || [])
    const cfg = { custo_diario:250, atend_dia:10, valor_hora:80 }
    ;(cfgs||[]).forEach(c => { cfg[c.chave] = Number(c.valor) || 0 })
    setConfig(cfg)
    // Agrupar insumos por proc
    const insMap = {}
    ;(ins||[]).forEach(i => { if (!insMap[i.procedimento_id]) insMap[i.procedimento_id] = []; insMap[i.procedimento_id].push(i) })
    setInsumos(insMap)
  }

  function custoProc(proc) {
    const ins = insumos[proc.id] || []
    const custoInsumos = ins.reduce((s, i) => s + (i.custo_calculado||0), 0)
    const rateioAluguel = config.atend_dia > 0 ? config.custo_diario / config.atend_dia : 0
    const custoHora = (config.valor_hora / 60) * (proc.duracao_min || 60)
    return { custoInsumos, rateioAluguel, custoHora, total: custoInsumos + rateioAluguel + custoHora }
  }

  function precos(custo) {
    return {
      p50: custo > 0 ? custo / 0.5 : 0,
      p30: custo > 0 ? custo / 0.7 : 0,
      margem: proc => proc.valor_padrao > 0 ? ((proc.valor_padrao - custo) / proc.valor_padrao) * 100 : 0,
    }
  }

  async function saveProc() {
    if (!formProc.nome.trim()) return showToast('Nome obrigatório', 'error')
    setSaving(true)
    const payload = { ...formProc, duracao_min: Number(formProc.duracao_min)||60, valor_padrao: Number(formProc.valor_padrao)||0 }
    if (editProcId) await supabase.from('procedimentos').update(payload).eq('id', editProcId)
    else await supabase.from('procedimentos').insert(payload)
    setSaving(false); setModal(false)
    showToast('Salvo ✓'); load()
  }

  async function delProc() {
    setDeleting(true)
    await supabase.from('procedimentos').delete().eq('id', confirmDel)
    setDeleting(false); setConfirmDel(null)
    showToast('Excluído'); load()
  }

  async function saveConfig() {
    const entries = Object.entries(cfgEdit).map(([chave, valor]) => ({ chave, valor: String(valor) }))
    await supabase.from('config').upsert(entries, { onConflict:'chave' })
    setModalConfig(false); showToast('Config salva ✓'); load()
  }

  async function addInsumo() {
    if (!procSel || !novoInsumo.estoque_id) return
    const est = estoque.find(e => e.id === novoInsumo.estoque_id)
    const custo_unitario = est && est.unidades_por_embalagem > 0 ? est.custo_por_embalagem / est.unidades_por_embalagem : 0
    const custo_calculado = custo_unitario * Number(novoInsumo.qtd_usada)
    await supabase.from('procedimento_insumos').insert({
      procedimento_id: procSel.id,
      estoque_id: novoInsumo.estoque_id,
      nome: est?.nome,
      qtd_usada: Number(novoInsumo.qtd_usada),
      custo_calculado,
    })
    setNovoInsumo({ estoque_id:'', qtd_usada:1 })
    showToast('Insumo adicionado ✓'); load()
  }

  async function delInsumo(id) {
    await supabase.from('procedimento_insumos').delete().eq('id', id)
    load()
  }

  const margemColor = m => m >= 50 ? 'bg-green-500' : m >= 30 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-center justify-between">
        <h2 className="font-semibold text-purple-900">Precificação de Procedimentos</h2>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => { setCfgEdit({...config}); setModalConfig(true) }}><Settings size={15}/> Configurar</button>
          <button className="btn-primary" onClick={() => { setFormProc(emptyProc); setEditProcId(null); setModal(true) }}><Plus size={16}/> Novo</button>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700 flex flex-wrap gap-4">
        <span>Custo diário (coworking): <b>{fmt(config.custo_diario)}/dia</b></span>
        <span>Atend./dia: <b>{config.atend_dia}</b></span>
        <span>Valor hora: <b>{fmt(config.valor_hora)}/h</b></span>
        <span>Rateio por atend: <b>{fmt(config.atend_dia > 0 ? config.custo_diario / config.atend_dia : 0)}</b></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {procedimentos.map(proc => {
          const c = custoProc(proc)
          const p = precos(c.total)
          const margem = proc.valor_padrao > 0 ? ((proc.valor_padrao - c.total) / proc.valor_padrao) * 100 : 0
          const ins = insumos[proc.id] || []
          return (
            <div key={proc.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-purple-900">{proc.nome}</p>
                  <p className="text-xs text-gray-400">{proc.duracao_min}min</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setFormProc({nome:proc.nome,duracao_min:proc.duracao_min,valor_padrao:proc.valor_padrao}); setEditProcId(proc.id); setModal(true) }}
                    className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500"><Pencil size={13}/></button>
                  <button onClick={() => setConfirmDel(proc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={13}/></button>
                </div>
              </div>

              {/* Breakdown custo */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Insumos:</span><span>{fmt(c.custoInsumos)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Rateio coworking:</span><span>{fmt(c.rateioAluguel)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hora profissional:</span><span>{fmt(c.custoHora)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-sm"><span>Custo total:</span><span className="text-red-600">{fmt(c.total)}</span></div>
              </div>

              {/* Preço atual + margem */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Preço atual:</span>
                  <span className="font-bold text-purple-900">{fmt(proc.valor_padrao)}</span>
                </div>
                {proc.valor_padrao > 0 && (
                  <>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Margem</span>
                      <span className={`font-bold ${margem >= 50 ? 'text-green-600' : margem >= 30 ? 'text-yellow-600' : 'text-red-500'}`}>{margem.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${margemColor(margem)}`} style={{ width:`${Math.min(margem,100)}%` }} />
                    </div>
                  </>
                )}
              </div>

              {/* Sugestões */}
              {c.total > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-2 text-center">
                    <p className="text-xs text-green-700 font-medium">Para 50% margem</p>
                    <p className="font-bold text-green-700">{fmt(p.p50)}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2 text-center">
                    <p className="text-xs text-yellow-700 font-medium">Para 30% margem</p>
                    <p className="font-bold text-yellow-700">{fmt(p.p30)}</p>
                  </div>
                </div>
              )}

              {/* Insumos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Insumos</p>
                  <button onClick={() => setProcSel(procSel?.id === proc.id ? null : proc)} className="text-xs text-purple-600 hover:underline">+ add</button>
                </div>
                {ins.map(i => (
                  <div key={i.id} className="flex justify-between items-center text-xs text-gray-500 py-1 border-b border-gray-50">
                    <span>{i.nome} × {i.qtd_usada}</span>
                    <div className="flex items-center gap-1">
                      <span>{fmt(i.custo_calculado)}</span>
                      <button onClick={() => delInsumo(i.id)} className="text-red-400 hover:text-red-600"><Trash2 size={11}/></button>
                    </div>
                  </div>
                ))}
                {procSel?.id === proc.id && (
                  <div className="mt-2 bg-purple-50 rounded-xl p-2 space-y-2">
                    <select className="input text-xs py-1" value={novoInsumo.estoque_id} onChange={e=>setNovoInsumo(p=>({...p,estoque_id:e.target.value}))}>
                      <option value="">Selecionar insumo...</option>
                      {estoque.map(e => <option key={e.id} value={e.id}>{e.nome} ({fmt(e.custo_por_embalagem/Math.max(e.unidades_por_embalagem,1))}/{e.unidade_nome})</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input className="input text-xs py-1 w-24" type="number" step="0.01" placeholder="Qtd" value={novoInsumo.qtd_usada} onChange={e=>setNovoInsumo(p=>({...p,qtd_usada:e.target.value}))} />
                      <button onClick={addInsumo} className="btn-primary py-1 text-xs">Adicionar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal procedimento */}
      <Modal open={modal} onClose={() => setModal(false)} title={editProcId ? 'Editar Procedimento' : 'Novo Procedimento'} size="sm">
        <div className="space-y-3">
          <div><label className="label">Nome *</label><input className="input" value={formProc.nome} onChange={e=>setFormProc(p=>({...p,nome:e.target.value}))} /></div>
          <div><label className="label">Duração (min)</label><input className="input" type="number" value={formProc.duracao_min} onChange={e=>setFormProc(p=>({...p,duracao_min:e.target.value}))} /></div>
          <div><label className="label">Valor cobrado (R$)</label><input className="input" type="number" step="0.01" value={formProc.valor_padrao} onChange={e=>setFormProc(p=>({...p,valor_padrao:e.target.value}))} /></div>
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={saveProc} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
          </div>
        </div>
      </Modal>

      {/* Modal config */}
      <Modal open={modalConfig} onClose={() => setModalConfig(false)} title="Configurações globais" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Custo diário — coworking (R$)</label>
            <input className="input" type="number" value={cfgEdit.custo_diario||''} onChange={e=>setCfgEdit(p=>({...p,custo_diario:e.target.value}))} />
            <p className="text-xs text-gray-400 mt-1">Ex: R$ 250/dia ÷ 10 atend = R$ 25/atendimento</p>
          </div>
          <div><label className="label">Atendimentos no dia</label><input className="input" type="number" value={cfgEdit.atend_dia||''} onChange={e=>setCfgEdit(p=>({...p,atend_dia:e.target.value}))} /></div>
          <div><label className="label">Valor hora profissional (R$)</label><input className="input" type="number" value={cfgEdit.valor_hora||''} onChange={e=>setCfgEdit(p=>({...p,valor_hora:e.target.value}))} /></div>
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setModalConfig(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={saveConfig}>Salvar</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={delProc}
        title="Excluir procedimento" loading={deleting} />
    </div>
  )
}
