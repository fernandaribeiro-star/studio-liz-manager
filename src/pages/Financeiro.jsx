import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { MiniBar } from '../components/MiniBar'
import { showToast } from '../components/Toast'
import { Plus, Trash2, Pencil, Copy, Target, TrendingUp } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v||0)
const TABS = ['Caixa','Gastos','Metas','Fechamento']

const emptyGasto = { descricao:'', valor:'', categoria_id:'', data: new Date().toISOString().split('T')[0], obs:'' }

export default function Financeiro() {
  const [tab, setTab] = useState('Caixa')
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0,7))
  const [atendimentos, setAtendimentos] = useState([])
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [config, setConfig] = useState({})
  const [modalGasto, setModalGasto] = useState(false)
  const [formGasto, setFormGasto] = useState(emptyGasto)
  const [editGastoId, setEditGastoId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [novaCateg, setNovaCateg] = useState('')
  const [modalCateg, setModalCateg] = useState(false)
  const [metaEdit, setMetaEdit] = useState(false)
  const [metaVal, setMetaVal] = useState('')
  const [metaAtend, setMetaAtend] = useState('')

  useEffect(() => { load() }, [mesSel])

  async function load() {
    const [ano, mes] = mesSel.split('-').map(Number)
    const ini = new Date(ano, mes-1, 1).toISOString()
    const fim = new Date(ano, mes, 0, 23, 59).toISOString()
    const [{ data: at }, { data: gs }, { data: cats }, { data: cfgs }] = await Promise.all([
      supabase.from('atendimentos').select('*,procedimentos(nome)').gte('data_hora', ini).lte('data_hora', fim),
      supabase.from('gastos').select('*,categorias_gasto(nome)').gte('data', ini.split('T')[0]).lte('data', fim.split('T')[0]).order('data', { ascending:false }),
      supabase.from('categorias_gasto').select('*').order('nome'),
      supabase.from('config').select('*'),
    ])
    setAtendimentos(at || [])
    setGastos(gs || [])
    setCategorias(cats || [])
    const cfg = {}
    ;(cfgs || []).forEach(c => { cfg[c.chave] = c.valor })
    setConfig(cfg)
    setMetaVal(cfg.meta_faturamento || '5000')
    setMetaAtend(cfg.meta_atendimentos_semana || '20')
  }

  const faturamento = atendimentos.reduce((s, a) => s + (a.valor||0), 0)
  const totalGastos = gastos.reduce((s, g) => s + (g.valor||0), 0)
  const lucro = faturamento - totalGastos
  const ticket = atendimentos.length > 0 ? faturamento / atendimentos.length : 0

  // Por semana
  const [ano, mes] = mesSel.split('-').map(Number)
  const semanas = [1,2,3,4].map(s => {
    const ini = (s-1)*7+1
    const fim = s*7
    const val = atendimentos.filter(a => {
      const d = new Date(a.data_hora).getDate()
      return d >= ini && d <= fim
    }).reduce((sum, a) => sum + (a.valor||0), 0)
    return { label: `Sem. ${s}`, value: val }
  })
  const maxSem = Math.max(...semanas.map(s => s.value), 1)

  // Por pagamento
  const pgtos = {}
  atendimentos.forEach(a => { pgtos[a.pagamento||'pix'] = (pgtos[a.pagamento||'pix']||0) + (a.valor||0) })

  // Por procedimento
  const porProc = {}
  atendimentos.forEach(a => {
    const n = a.procedimentos?.nome||'Outros'
    porProc[n] = (porProc[n]||0) + (a.valor||0)
  })

  // Por categoria gasto
  const porCat = {}
  gastos.forEach(g => { const n = g.categorias_gasto?.nome||'Sem categoria'; porCat[n] = (porCat[n]||0) + (g.valor||0) })

  async function saveGasto() {
    if (!formGasto.descricao || !formGasto.valor) return showToast('Preencha descrição e valor', 'error')
    setSaving(true)
    const payload = { ...formGasto, valor: Number(formGasto.valor) || 0, categoria_id: formGasto.categoria_id || null }
    if (editGastoId) await supabase.from('gastos').update(payload).eq('id', editGastoId)
    else await supabase.from('gastos').insert(payload)
    setSaving(false); setModalGasto(false)
    showToast('Salvo ✓'); load()
  }

  async function delGasto() {
    setDeleting(true)
    await supabase.from('gastos').delete().eq('id', confirmDel)
    setDeleting(false); setConfirmDel(null)
    showToast('Excluído'); load()
  }

  async function addCategoria() {
    if (!novaCateg.trim()) return
    await supabase.from('categorias_gasto').insert({ nome: novaCateg })
    setNovaCateg(''); showToast('Categoria criada ✓'); load()
  }

  async function saveMetas() {
    await supabase.from('config').upsert([
      { chave:'meta_faturamento', valor: metaVal },
      { chave:'meta_atendimentos_semana', valor: metaAtend }
    ], { onConflict:'chave' })
    setMetaEdit(false); showToast('Metas salvas ✓'); load()
  }

  const meta = Number(config.meta_faturamento||5000)
  const pctMeta = Math.min((faturamento/meta)*100, 100)
  const diasMes = new Date(ano, mes, 0).getDate()
  const diaAtual = Math.min(new Date().getDate(), diasMes)
  const projecao = diaAtual > 0 ? (faturamento / diaAtual) * diasMes : 0

  function copiarFechamento() {
    const txt = `📊 FECHAMENTO — ${new Date(ano, mes-1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}

💰 Faturamento: ${fmt(faturamento)}
📉 Gastos: ${fmt(totalGastos)}
✅ Lucro: ${fmt(lucro)}
🎯 Ticket médio: ${fmt(ticket)}
👩‍🦰 Atendimentos: ${atendimentos.length}

💳 Por pagamento:
${Object.entries(pgtos).map(([k,v]) => `   ${k.replace('_',' ')}: ${fmt(v)}`).join('\n')}

📦 Por procedimento:
${Object.entries(porProc).map(([k,v]) => `   ${k}: ${fmt(v)}`).join('\n')}

— Studio Liz 💜`
    navigator.clipboard.writeText(txt)
    showToast('Copiado para o clipboard ✓')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-purple-100 rounded-xl p-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab===t ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-500 hover:text-purple-700'}`}>
              {t}
            </button>
          ))}
        </div>
        <input className="input w-40" type="month" value={mesSel} onChange={e => setMesSel(e.target.value)} />
      </div>

      {/* CAIXA */}
      {tab === 'Caixa' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Faturamento', val: faturamento, c:'text-purple-700' },
              { label:'Gastos', val: totalGastos, c:'text-red-500' },
              { label:'Lucro', val: lucro, c: lucro>=0?'text-green-600':'text-red-500' },
              { label:'Ticket médio', val: ticket, c:'text-purple-700' },
            ].map(({ label, val, c }) => (
              <div key={label} className="card text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-xl font-bold mt-1 ${c}`}>{fmt(val)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card">
              <h3 className="font-semibold text-purple-900 mb-4">Por semana</h3>
              <div className="flex items-end gap-2 h-24">
                {semanas.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-purple-700 font-medium">{fmt(s.value).replace('R$','').trim().replace(',00','')}</span>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-purple-700 to-purple-400"
                      style={{ height: `${(s.value/maxSem)*60}px`, minHeight: 4 }} />
                    <span className="text-xs text-gray-400">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold text-purple-900">Por forma de pagamento</h3>
              {Object.entries(pgtos).map(([k, v]) => (
                <MiniBar key={k} label={k.replace('_',' ')} value={v} max={faturamento} format={fmt} />
              ))}
              {Object.keys(pgtos).length === 0 && <p className="text-sm text-gray-400">Sem dados</p>}
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold text-purple-900">Por procedimento</h3>
              {Object.entries(porProc).sort((a,b) => b[1]-a[1]).map(([k, v]) => (
                <MiniBar key={k} label={k} value={v} max={faturamento} format={fmt} />
              ))}
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold text-purple-900">Gastos por categoria</h3>
              {Object.entries(porCat).map(([k, v]) => (
                <MiniBar key={k} label={k} value={v} max={totalGastos} format={fmt} color="#EF4444" />
              ))}
              {Object.keys(porCat).length === 0 && <p className="text-sm text-gray-400">Sem gastos</p>}
            </div>
          </div>
        </div>
      )}

      {/* GASTOS */}
      {tab === 'Gastos' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => { setFormGasto({...emptyGasto, data: new Date().toISOString().split('T')[0]}); setEditGastoId(null); setModalGasto(true) }}>
              <Plus size={16} /> Novo Gasto
            </button>
            <button className="btn-ghost" onClick={() => setModalCateg(true)}>Gerenciar Categorias</button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Data</th>
                  <th className="text-left py-2 pr-4">Descrição</th>
                  <th className="text-left py-2 pr-4">Categoria</th>
                  <th className="text-left py-2 pr-4">Valor</th>
                  <th className="text-left py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {gastos.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum gasto no período</td></tr>}
                {gastos.map(g => (
                  <tr key={g.id} className="border-b border-purple-50 hover:bg-purple-50/40">
                    <td className="py-2.5 pr-4 text-gray-500">{new Date(g.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="py-2.5 pr-4 font-medium text-purple-900">{g.descricao}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{g.categorias_gasto?.nome || '—'}</td>
                    <td className="py-2.5 pr-4 text-red-600 font-semibold">{fmt(g.valor)}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => { setFormGasto({descricao:g.descricao, valor:g.valor, categoria_id:g.categoria_id||'', data:g.data, obs:g.obs||''}); setEditGastoId(g.id); setModalGasto(true) }}
                          className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500"><Pencil size={14}/></button>
                        <button onClick={() => setConfirmDel(g.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal gasto */}
          <Modal open={modalGasto} onClose={() => setModalGasto(false)} title={editGastoId ? 'Editar Gasto' : 'Novo Gasto'} size="sm">
            <div className="space-y-3">
              <div><label className="label">Descrição *</label><input className="input" value={formGasto.descricao} onChange={e=>setFormGasto(p=>({...p,descricao:e.target.value}))} /></div>
              <div><label className="label">Valor *</label><input className="input" type="number" step="0.01" value={formGasto.valor} onChange={e=>setFormGasto(p=>({...p,valor:e.target.value}))} /></div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={formGasto.categoria_id} onChange={e=>setFormGasto(p=>({...p,categoria_id:e.target.value}))}>
                  <option value="">Sem categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><label className="label">Data</label><input className="input" type="date" value={formGasto.data} onChange={e=>setFormGasto(p=>({...p,data:e.target.value}))} /></div>
              <div><label className="label">Obs</label><textarea className="input" rows={2} value={formGasto.obs} onChange={e=>setFormGasto(p=>({...p,obs:e.target.value}))} /></div>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1 justify-center" onClick={() => setModalGasto(false)}>Cancelar</button>
                <button className="btn-primary flex-1 justify-center" onClick={saveGasto} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
              </div>
            </div>
          </Modal>

          {/* Modal categorias */}
          <Modal open={modalCateg} onClose={() => setModalCateg(false)} title="Categorias de Gasto" size="sm">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Nova categoria..." value={novaCateg} onChange={e=>setNovaCateg(e.target.value)} />
                <button className="btn-primary px-3" onClick={addCategoria}><Plus size={15}/></button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {categorias.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-xl">
                    <span className="text-sm text-purple-900">{c.nome}</span>
                    <button onClick={async () => { await supabase.from('categorias_gasto').delete().eq('id',c.id); load() }}
                      className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* METAS */}
      {tab === 'Metas' && (
        <div className="space-y-5">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2"><Target size={18}/> Meta de faturamento</h3>
              {!metaEdit
                ? <button onClick={() => setMetaEdit(true)} className="btn-ghost py-1.5 text-xs"><Pencil size={13}/> Editar</button>
                : <div className="flex gap-2">
                    <button onClick={() => setMetaEdit(false)} className="btn-ghost py-1.5 text-xs">Cancelar</button>
                    <button onClick={saveMetas} className="btn-primary py-1.5 text-xs">Salvar</button>
                  </div>
              }
            </div>
            {metaEdit ? (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Meta faturamento (R$)</label><input className="input" type="number" value={metaVal} onChange={e=>setMetaVal(e.target.value)} /></div>
                <div><label className="label">Atendimentos/semana</label><input className="input" type="number" value={metaAtend} onChange={e=>setMetaAtend(e.target.value)} /></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progresso: <b className="text-purple-700">{fmt(faturamento)}</b> de <b>{fmt(meta)}</b></span>
                  <span className="font-bold text-purple-700">{pctMeta.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-4">
                  <div className="h-4 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all"
                    style={{ width: `${pctMeta}%` }} />
                </div>
                <div className="flex gap-6 text-sm text-gray-500 mt-2">
                  <span>Projeção mês: <b className={projecao >= meta ? 'text-green-600' : 'text-orange-500'}>{fmt(projecao)}</b></span>
                  <span>Falta: <b className="text-red-500">{fmt(Math.max(meta - faturamento, 0))}</b></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FECHAMENTO */}
      {tab === 'Fechamento' && (
        <div className="card space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-purple-900">Resumo do período</h3>
            <button onClick={copiarFechamento} className="btn-ghost py-1.5 text-xs"><Copy size={13}/> Copiar resumo</button>
          </div>
          {[
            { label:'Faturamento', val: faturamento, c:'text-purple-700' },
            { label:'Gastos', val: totalGastos, c:'text-red-500' },
            { label:'Lucro', val: lucro, c: lucro>=0?'text-green-600':'text-red-500' },
            { label:'Ticket médio', val: ticket, c:'text-purple-700' },
            { label:'Atendimentos', val: atendimentos.length, c:'text-purple-700', isMoney: false },
          ].map(({ label, val, c, isMoney=true }) => (
            <div key={label} className="flex justify-between items-center border-b border-purple-50 py-2">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`font-bold ${c}`}>{isMoney ? fmt(val) : val}</span>
            </div>
          ))}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Por pagamento</p>
            {Object.entries(pgtos).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1">
                <span className="text-gray-600 capitalize">{k.replace('_',' ')}</span>
                <span className="font-medium text-purple-700">{fmt(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={delGasto}
        title="Excluir gasto" loading={deleting} />
    </div>
  )
}
