import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { MessageCircle, Pencil, Plus, Trash2, Cake, Clock } from 'lucide-react'

const TABS = ['Aniversariantes','Retorno','Templates']
const fmtDate = s => s ? new Date(s+'T00:00:00').toLocaleDateString('pt-BR') : '—'
const diasSem = d => Math.floor((new Date() - new Date(d)) / 86400000)

function retornoColor(dias) {
  if (dias >= 90) return 'border-red-300 bg-red-50'
  if (dias >= 60) return 'border-orange-300 bg-orange-50'
  return 'border-yellow-200 bg-yellow-50'
}
function retornoBadge(dias) {
  if (dias >= 90) return 'bg-red-100 text-red-700'
  if (dias >= 60) return 'bg-orange-100 text-orange-700'
  return 'bg-yellow-100 text-yellow-700'
}

function substituirTemplate(msg, vars) {
  return msg.replace(/\{(\w+)\}/g, (_, k) => vars[k] || `{${k}}`)
}

export default function Marketing() {
  const [tab, setTab] = useState('Aniversariantes')
  const [clientes, setClientes] = useState([])
  const [templates, setTemplates] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [enviados, setEnviados] = useState({})
  const [modal, setModal] = useState(false)
  const [formTpl, setFormTpl] = useState({ nome:'', mensagem:'', tipo:'geral' })
  const [editTplId, setEditTplId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [modalUsar, setModalUsar] = useState(null) // { template, cliente }
  const [vars, setVars] = useState({})
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: cl }, { data: tpl }, { data: at }] = await Promise.all([
      supabase.from('clientes').select('*').eq('ativa', true).order('nome'),
      supabase.from('templates_marketing').select('*').order('nome'),
      supabase.from('atendimentos').select('cliente_id,data_hora').order('data_hora', { ascending:false }),
    ])
    setClientes(cl || [])
    setTemplates(tpl || [])
    setAtendimentos(at || [])
  }

  const hoje = new Date()

  // Último atendimento por cliente
  const ultimoAtend = {}
  ;(atendimentos || []).forEach(a => {
    if (!ultimoAtend[a.cliente_id]) ultimoAtend[a.cliente_id] = a.data_hora
  })

  // Aniversariantes do mês atual e próximo
  const aniversariantes = clientes.filter(c => {
    if (!c.nascimento) return false
    const n = new Date(c.nascimento + 'T00:00:00')
    const m = n.getMonth()
    return m === mesFiltro || m === (mesFiltro+1)%12
  }).map(c => {
    const n = new Date(c.nascimento + 'T00:00:00')
    return { ...c, _mesAniv: n.getMonth(), _diaAniv: n.getDate() }
  }).sort((a,b) => {
    if (a._mesAniv !== b._mesAniv) return a._mesAniv - b._mesAniv
    return a._diaAniv - b._diaAniv
  })

  // Retorno: clientes sem atendimento 30d+
  const semRetorno = clientes.map(c => {
    const ult = ultimoAtend[c.id]
    const dias = ult ? diasSem(ult) : 999
    return { ...c, dias }
  }).filter(c => c.dias >= 30).sort((a,b) => b.dias - a.dias)

  function whatsapp(tel, msg) {
    const num = '55' + (tel||'').replace(/\D/g,'')
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
    setEnviados(p => ({ ...p, [tel]: true }))
  }

  async function saveTpl() {
    if (!formTpl.nome || !formTpl.mensagem) return showToast('Preencha nome e mensagem', 'error')
    setSaving(true)
    if (editTplId) await supabase.from('templates_marketing').update(formTpl).eq('id', editTplId)
    else await supabase.from('templates_marketing').insert(formTpl)
    setSaving(false); setModal(false)
    showToast('Salvo ✓'); load()
  }

  async function delTpl() {
    setDeleting(true)
    await supabase.from('templates_marketing').delete().eq('id', confirmDel)
    setDeleting(false); setConfirmDel(null)
    showToast('Excluído'); load()
  }

  function abrirUsar(tpl, cliente) {
    setModalUsar({ tpl, cliente })
    setVars({ nome: cliente.nome?.split(' ')[0]||'', procedimento:'', data:'', horario:'' })
  }

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-purple-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab===t ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-500 hover:text-purple-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ANIVERSARIANTES */}
      {tab === 'Aniversariantes' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {meses.map((m, i) => (
              <button key={i} onClick={() => setMesFiltro(i)}
                className={`px-3 py-1 rounded-lg text-sm ${mesFiltro===i ? 'bg-purple-700 text-white' : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-50'}`}>
                {m}
              </button>
            ))}
          </div>
          {aniversariantes.length === 0 && (
            <div className="card text-center py-12"><Cake size={36} className="mx-auto text-purple-200 mb-2"/><p className="text-gray-400">Nenhum aniversariante nos meses selecionados</p></div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {aniversariantes.map(c => {
              const tplAniv = templates.find(t => t.tipo === 'aniversario')
              const msg = tplAniv ? substituirTemplate(tplAniv.mensagem, { nome: c.nome?.split(' ')[0]||'' }) : `Feliz aniversário, ${c.nome?.split(' ')[0]}! 🎉💜 — Studio Liz`
              const enviado = enviados[c.telefone]
              const mesNome = meses[c._mesAniv]
              return (
                <div key={c.id} className="card flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-purple-900">{c.nome}</p>
                      <span className="badge bg-pink-100 text-pink-600">{c._diaAniv}/{mesNome.slice(0,3)}</span>
                    </div>
                    <p className="text-sm text-gray-400">{c.telefone}</p>
                    {enviado && <span className="text-xs text-green-600 font-medium">✓ Enviado</span>}
                  </div>
                  {c.telefone && (
                    <button onClick={() => whatsapp(c.telefone, msg)}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-xl text-sm hover:bg-green-700 transition-colors">
                      <MessageCircle size={14}/> {enviado ? 'Reenviar' : 'Enviar'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* RETORNO */}
      {tab === 'Retorno' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Clientes sem atendimento há mais de 30 dias</p>
          {semRetorno.length === 0 && (
            <div className="card text-center py-12"><Clock size={36} className="mx-auto text-purple-200 mb-2"/><p className="text-gray-400">Todos os clientes têm retorno recente!</p></div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {semRetorno.map(c => {
              const tpl = templates.find(t => t.tipo === 'reativacao')
              const msg = tpl ? substituirTemplate(tpl.mensagem, { nome: c.nome?.split(' ')[0]||'' }) : `Oi ${c.nome?.split(' ')[0]}! Sentimos sua falta 🌷 — Studio Liz`
              const enviado = enviados[c.telefone]
              return (
                <div key={c.id} className={`card border flex items-center justify-between gap-3 ${retornoColor(c.dias)}`}>
                  <div>
                    <p className="font-semibold text-gray-800">{c.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${retornoBadge(c.dias)}`}>{c.dias}d sem retorno</span>
                      {c.telefone && <span className="text-xs text-gray-400">{c.telefone}</span>}
                    </div>
                    {enviado && <span className="text-xs text-green-600 font-medium">✓ Mensagem enviada</span>}
                  </div>
                  {c.telefone && (
                    <button onClick={() => whatsapp(c.telefone, msg)}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-xl text-sm hover:bg-green-700 shrink-0">
                      <MessageCircle size={14}/> Reativar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TEMPLATES */}
      {tab === 'Templates' && (
        <div className="space-y-4">
          <button className="btn-primary" onClick={() => { setFormTpl({ nome:'', mensagem:'', tipo:'geral' }); setEditTplId(null); setModal(true) }}>
            <Plus size={16}/> Novo Template
          </button>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700">
            Variáveis disponíveis: <code>{'{nome}'}</code> <code>{'{procedimento}'}</code> <code>{'{data}'}</code> <code>{'{horario}'}</code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tpl => (
              <div key={tpl.id} className="card space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-purple-900">{tpl.nome}</p>
                    <span className="badge bg-purple-100 text-purple-600 text-xs">{tpl.tipo}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setFormTpl({ nome:tpl.nome, mensagem:tpl.mensagem, tipo:tpl.tipo }); setEditTplId(tpl.id); setModal(true) }}
                      className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500"><Pencil size={13}/></button>
                    <button onClick={() => setConfirmDel(tpl.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={13}/></button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">{tpl.mensagem}</p>
                <div className="flex gap-2 flex-wrap">
                  {clientes.slice(0,3).map(c => (
                    <button key={c.id} onClick={() => abrirUsar(tpl, c)}
                      className="text-xs border border-purple-200 px-2 py-1 rounded-lg hover:bg-purple-50 text-purple-600">
                      Usar p/ {c.nome.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal template */}
      <Modal open={modal} onClose={() => setModal(false)} title={editTplId ? 'Editar Template' : 'Novo Template'} size="md">
        <div className="space-y-3">
          <div><label className="label">Nome</label><input className="input" value={formTpl.nome} onChange={e=>setFormTpl(p=>({...p,nome:e.target.value}))} /></div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={formTpl.tipo} onChange={e=>setFormTpl(p=>({...p,tipo:e.target.value}))}>
              {['geral','confirmacao','lembrete','aniversario','reativacao','pos_atendimento'].map(t => (
                <option key={t} value={t}>{t.replace('_',' ')}</option>
              ))}
            </select>
          </div>
          <div><label className="label">Mensagem</label><textarea className="input" rows={5} value={formTpl.mensagem} onChange={e=>setFormTpl(p=>({...p,mensagem:e.target.value}))} /></div>
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={saveTpl} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
          </div>
        </div>
      </Modal>

      {/* Modal usar template */}
      <Modal open={!!modalUsar} onClose={() => setModalUsar(null)} title="Usar template" size="sm">
        {modalUsar && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Personalize as variáveis para <b>{modalUsar.cliente.nome}</b>:</p>
            <div className="grid grid-cols-2 gap-2">
              {['procedimento','data','horario'].map(v => (
                <div key={v}><label className="label">{v}</label><input className="input" value={vars[v]||''} onChange={e=>setVars(p=>({...p,[v]:e.target.value}))} /></div>
              ))}
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-800 whitespace-pre-wrap">
              {substituirTemplate(modalUsar.tpl.mensagem, { ...vars, nome: modalUsar.cliente.nome?.split(' ')[0]||'' })}
            </div>
            {modalUsar.cliente.telefone && (
              <button onClick={() => {
                const msg = substituirTemplate(modalUsar.tpl.mensagem, { ...vars, nome: modalUsar.cliente.nome?.split(' ')[0]||'' })
                whatsapp(modalUsar.cliente.telefone, msg)
                setModalUsar(null)
              }} className="btn-primary w-full justify-center">
                <MessageCircle size={15}/> Enviar no WhatsApp
              </button>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={delTpl}
        title="Excluir template" loading={deleting} />
    </div>
  )
}
