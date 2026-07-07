import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { ArrowLeft, Camera, X, ZoomIn, Upload, Pencil } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDT = s => s ? new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
const fmtDate = s => s ? new Date(s+'T00:00:00').toLocaleDateString('pt-BR') : '—'
const iniciais = nome => nome?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || '?'

const TABS = ['Resumo','Histórico','Fotos','Anamnese']

export default function ClienteFicha() {
  const { id } = useParams()
  const [cliente, setCliente] = useState(null)
  const [atendimentos, setAtendimentos] = useState([])
  const [fotos, setFotos] = useState([])
  const [sessoes, setSessoes] = useState([])
  const [tab, setTab] = useState('Resumo')
  const [lightbox, setLightbox] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [fotoForm, setFotoForm] = useState({ area_corporal:'', legenda:'' })
  const [modalFoto, setModalFoto] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [editAnamnese, setEditAnamnese] = useState(false)
  const [anamneseText, setAnamneseText] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    const [{ data: c }, { data: a }, { data: f }, { data: s }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('atendimentos').select('*,procedimentos(nome)').eq('cliente_id', id).order('data_hora', { ascending: false }),
      supabase.from('fotos_clientes').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
      supabase.from('sessoes').select('*,procedimentos(nome)').eq('cliente_id', id).order('created_at', { ascending: false }),
    ])
    setCliente(c)
    setAtendimentos(a || [])
    setFotos(f || [])
    setSessoes(s || [])
    setAnamneseText(c?.anamnese || '')
  }

  async function saveAnamnese() {
    setSaving(true)
    await supabase.from('clientes').update({ anamnese: anamneseText }).eq('id', id)
    setEditAnamnese(false); setSaving(false)
    showToast('Anamnese salva ✓'); load()
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setPendingFile(file)
    setFotoForm({ area_corporal:'', legenda:'' })
    setModalFoto(true)
  }

  async function uploadFoto() {
    if (!pendingFile) return
    setUploadLoading(true)
    const ext = pendingFile.name.split('.').pop()
    const path = `${id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('fotos-clientes').upload(path, pendingFile, { upsert: true })
    if (upErr) { showToast('Erro no upload', 'error'); setUploadLoading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('fotos-clientes').getPublicUrl(path)
    await supabase.from('fotos_clientes').insert({ cliente_id: id, url: publicUrl, ...fotoForm })
    setUploadLoading(false); setModalFoto(false); setPendingFile(null)
    showToast('Foto enviada ✓'); load()
  }

  const totalGasto = atendimentos.reduce((s, a) => s + (a.valor || 0), 0)

  // Agrupar fotos por mês/ano
  const fotosGrupadas = fotos.reduce((acc, f) => {
    const d = new Date(f.created_at)
    const k = d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
    if (!acc[k]) acc[k] = []
    acc[k].push(f)
    return acc
  }, {})

  if (!cliente) return <div className="text-center py-20 text-gray-400">Carregando...</div>

  return (
    <div className="space-y-5">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-purple-600 hover:underline text-sm">
        <ArrowLeft size={14} /> Voltar
      </Link>

      {/* Header */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {iniciais(cliente.nome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-purple-900">{cliente.nome}</h2>
            {!cliente.ativa && <span className="badge bg-gray-100 text-gray-500 text-xs">Inativa</span>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
            {cliente.telefone && <span>📱 {cliente.telefone}</span>}
            {cliente.email && <span>✉ {cliente.email}</span>}
            {cliente.nascimento && <span>🎂 {fmtDate(cliente.nascimento)}</span>}
            {cliente.instagram && <span>📷 {cliente.instagram}</span>}
          </div>
        </div>
        {cliente.telefone && (
          <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="btn-ghost py-2 text-green-600 border-green-200">
            WhatsApp
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-purple-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab===t ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-500 hover:text-purple-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Resumo */}
      {tab === 'Resumo' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total gasto</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{fmt(totalGasto)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Atendimentos</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{atendimentos.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Último atendimento</p>
            <p className="text-sm font-bold text-purple-700 mt-1">{atendimentos[0] ? fmtDT(atendimentos[0].data_hora) : '—'}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Sessões ativas</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{sessoes.filter(s=>s.status==='ativa').length}</p>
          </div>
          {sessoes.length > 0 && (
            <div className="card md:col-span-4">
              <h3 className="font-semibold text-purple-900 mb-3 text-sm">Sessões em andamento</h3>
              {sessoes.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-purple-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-purple-900">{s.procedimentos?.nome}</p>
                    <p className="text-xs text-gray-400">{s.sessoes_feitas}/{s.total_sessoes} sessões · Próxima: {fmtDate(s.data_proxima)}</p>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({length: s.total_sessoes}).map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full border-2 ${i < s.sessoes_feitas ? 'bg-purple-600 border-purple-600' : 'border-purple-200'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {tab === 'Histórico' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Data</th>
                <th className="text-left py-2 pr-4">Procedimento</th>
                <th className="text-left py-2 pr-4">Valor</th>
                <th className="text-left py-2 pr-4">Pagamento</th>
                <th className="text-left py-2">Sessão</th>
              </tr>
            </thead>
            <tbody>
              {atendimentos.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum atendimento registrado</td></tr>
              )}
              {atendimentos.map(a => (
                <tr key={a.id} className="border-b border-purple-50 hover:bg-purple-50/40">
                  <td className="py-2.5 pr-4 text-gray-500">{fmtDT(a.data_hora)}</td>
                  <td className="py-2.5 pr-4 font-medium text-purple-900">{a.procedimentos?.nome}</td>
                  <td className="py-2.5 pr-4 text-green-700 font-semibold">{fmt(a.valor)}</td>
                  <td className="py-2.5 pr-4 capitalize text-gray-500">{a.pagamento?.replace('_',' ')}</td>
                  <td className="py-2.5">
                    {a.sessao_total > 1 ? <span className="badge bg-purple-100 text-purple-700">{a.sessao_numero}/{a.sessao_total}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fotos */}
      {tab === 'Fotos' && (
        <div className="space-y-4">
          <button onClick={() => fileRef.current?.click()} className="btn-primary">
            <Camera size={16} /> Adicionar Foto
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          {Object.keys(fotosGrupadas).length === 0 && (
            <div className="card text-center py-12">
              <Camera size={40} className="mx-auto text-purple-200 mb-3" />
              <p className="text-gray-400">Nenhuma foto cadastrada</p>
            </div>
          )}

          {Object.entries(fotosGrupadas).map(([mes, fts]) => (
            <div key={mes}>
              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2 capitalize">{mes}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {fts.map(f => (
                  <div key={f.id} className="relative group cursor-pointer rounded-xl overflow-hidden border border-purple-100"
                    onClick={() => setLightbox(f)}>
                    <img src={f.url} alt={f.legenda||''} className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {f.area_corporal && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 truncate">{f.area_corporal}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Anamnese */}
      {tab === 'Anamnese' && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-purple-900">Anamnese</h3>
            {!editAnamnese && (
              <button onClick={() => setEditAnamnese(true)} className="btn-ghost py-1.5 text-xs">
                <Pencil size={13} /> Editar
              </button>
            )}
          </div>
          {editAnamnese ? (
            <div className="space-y-3">
              <textarea className="input" rows={8} value={anamneseText} onChange={e => setAnamneseText(e.target.value)}
                placeholder="Alergias, medicamentos, restrições, histórico médico..." />
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditAnamnese(false)}>Cancelar</button>
                <button className="btn-primary" onClick={saveAnamnese} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {anamneseText || <span className="text-gray-400 italic">Nenhuma informação registrada.</span>}
            </p>
          )}
        </div>
      )}

      {/* Modal foto */}
      <Modal open={modalFoto} onClose={() => setModalFoto(false)} title="Adicionar Foto" size="sm">
        {pendingFile && (
          <div className="mb-4">
            <img src={URL.createObjectURL(pendingFile)} className="w-full h-40 object-cover rounded-xl" alt="preview" />
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="label">Área Corporal</label>
            <input className="input" placeholder="ex: Rosto, Abdômen..." value={fotoForm.area_corporal}
              onChange={e => setFotoForm(p => ({...p, area_corporal: e.target.value}))} />
          </div>
          <div>
            <label className="label">Legenda</label>
            <input className="input" placeholder="Descrição opcional" value={fotoForm.legenda}
              onChange={e => setFotoForm(p => ({...p, legenda: e.target.value}))} />
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setModalFoto(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={uploadFoto} disabled={uploadLoading}>
              <Upload size={15} /> {uploadLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X size={28} />
          </button>
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} className="w-full rounded-xl" alt={lightbox.legenda} />
            {(lightbox.legenda || lightbox.area_corporal) && (
              <div className="bg-black/60 text-white text-sm p-3 rounded-b-xl mt-1">
                {lightbox.area_corporal && <b>{lightbox.area_corporal}</b>}
                {lightbox.legenda && <p>{lightbox.legenda}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
