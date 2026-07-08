import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { ArrowLeft, Camera, X, ZoomIn, Upload, Pencil, Save } from 'lucide-react'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDT = s => s ? new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
const fmtDate = s => s ? new Date(s+'T00:00:00').toLocaleDateString('pt-BR') : '—'
const iniciais = nome => nome?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || '?'

const TABS = ['Resumo','Histórico','Fotos','Anamnese']

const emptyAnamnese = {
  queixa_principal: '',
  historico_saude: '',
  doencas: '',
  cirurgias: '',
  medicamentos: '',
  alergias: '',
  gestacao: false,
  lactacao: false,
  contraindicacoes: '',
  habitos_vida: '',
  consumo_agua: '',
  alimentacao: '',
  tabagismo: false,
  alcool: '',
  objetivos: '',
  obs: '',
}

function parseAnamnese(raw) {
  if (!raw) return { ...emptyAnamnese }
  try {
    const parsed = JSON.parse(raw)
    return { ...emptyAnamnese, ...parsed }
  } catch {
    // legacy: plain text → put in obs
    return { ...emptyAnamnese, obs: raw }
  }
}

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
  const [anamnese, setAnamnese] = useState(emptyAnamnese)
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
    setAnamnese(parseAnamnese(c?.anamnese))
  }

  async function saveAnamnese() {
    setSaving(true)
    await supabase.from('clientes').update({ anamnese: JSON.stringify(anamnese) }).eq('id', id)
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

  const fotosGrupadas = fotos.reduce((acc, f) => {
    const d = new Date(f.created_at)
    const k = d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
    if (!acc[k]) acc[k] = []
    acc[k].push(f)
    return acc
  }, {})

  if (!cliente) return <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Carregando...</div>

  const S = ({ children }) => <span style={{ color: 'var(--muted)' }}>{children}</span>

  return (
    <div className="space-y-5">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm hover:underline" style={{ color: 'var(--primary)' }}>
        <ArrowLeft size={14} /> Voltar
      </Link>

      {/* Header */}
      <div className="card flex items-center gap-4">
        <div className="flex items-center justify-center text-white shrink-0"
          style={{ width: 64, height: 64, borderRadius: 3, background: 'var(--primary)', fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600 }}>
          {iniciais(cliente.nome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: 'var(--ink)' }}>{cliente.nome}</h2>
            {!cliente.ativa && <span className="badge" style={{ background: 'var(--border)', color: 'var(--muted)' }}>Inativa</span>}
          </div>
          <div className="flex flex-wrap gap-4 mt-1" style={{ fontSize: 13, color: 'var(--muted)' }}>
            {cliente.telefone && <span>{cliente.telefone}</span>}
            {cliente.email && <span>{cliente.email}</span>}
            {cliente.nascimento && <span>Nasc. {fmtDate(cliente.nascimento)}</span>}
            {cliente.instagram && <span>{cliente.instagram}</span>}
          </div>
        </div>
        {cliente.telefone && (
          <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="btn-ghost py-2" style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
            WhatsApp
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 w-fit" style={{ background: 'var(--primary-soft)', borderRadius: 3 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={{ borderRadius: 2, background: tab===t ? 'var(--surface)' : 'transparent', color: tab===t ? 'var(--primary)' : 'var(--muted)', boxShadow: tab===t ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Resumo */}
      {tab === 'Resumo' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total gasto', val: fmt(totalGasto) },
            { label: 'Atendimentos', val: atendimentos.length },
            { label: 'Último atend.', val: atendimentos[0] ? fmtDT(atendimentos[0].data_hora) : '—' },
            { label: 'Sessões ativas', val: sessoes.filter(s=>s.status==='ativa').length },
          ].map(({ label, val }) => (
            <div key={label} className="card text-center">
              <p className="label">{label}</p>
              <p className="stat-num mt-1" style={{ fontSize: 24 }}>{val}</p>
            </div>
          ))}
          {sessoes.length > 0 && (
            <div className="card md:col-span-4">
              <h3 className="section-title mb-3" style={{ fontSize: 16 }}>Sessões em andamento</h3>
              {sessoes.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{s.procedimentos?.nome}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.sessoes_feitas}/{s.total_sessoes} sessões · Próxima: {fmtDate(s.data_proxima)}</p>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({length: s.total_sessoes}).map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-full border-2"
                        style={{ background: i < s.sessoes_feitas ? 'var(--primary)' : 'transparent', borderColor: i < s.sessoes_feitas ? 'var(--primary)' : 'var(--border)' }} />
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
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Data','Procedimento','Valor','Pagamento','Sessão'].map(h => (
                  <th key={h} className="table-th text-left pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atendimentos.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--muted)' }}>Nenhum atendimento registrado</td></tr>
              )}
              {atendimentos.map(a => (
                <tr key={a.id} className="table-td-row">
                  <td className="table-td pr-4">{fmtDT(a.data_hora)}</td>
                  <td className="table-td pr-4 font-medium" style={{ color: 'var(--ink)' }}>{a.procedimentos?.nome}</td>
                  <td className="table-td pr-4 font-semibold" style={{ color: 'var(--success)' }}>{fmt(a.valor)}</td>
                  <td className="table-td pr-4 capitalize">{a.pagamento?.replace('_',' ')}</td>
                  <td className="table-td">
                    {a.sessao_total > 1
                      ? <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{a.sessao_numero}/{a.sessao_total}</span>
                      : '—'}
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
              <Camera size={40} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
              <p style={{ color: 'var(--muted)' }}>Nenhuma foto cadastrada</p>
            </div>
          )}

          {Object.entries(fotosGrupadas).map(([mes, fts]) => (
            <div key={mes}>
              <p className="label mb-2 capitalize">{mes}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {fts.map(f => (
                  <div key={f.id} className="relative group cursor-pointer overflow-hidden"
                    style={{ borderRadius: 3, border: '1px solid var(--border)' }}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="section-title">Ficha de Anamnese</p>
            {!editAnamnese
              ? <button className="btn-ghost py-1.5 text-xs" onClick={() => setEditAnamnese(true)}><Pencil size={13} /> Editar</button>
              : <div className="flex gap-2">
                  <button className="btn-ghost py-1.5 text-xs" onClick={() => { setEditAnamnese(false); setAnamnese(parseAnamnese(cliente.anamnese)) }}>Cancelar</button>
                  <button className="btn-primary py-1.5 text-xs" onClick={saveAnamnese} disabled={saving}>
                    <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
            }
          </div>

          {/* Seção: Queixa */}
          <AnaSection title="Queixa Principal">
            <AnaField label="Queixa / motivo do tratamento" edit={editAnamnese}
              value={anamnese.queixa_principal} onChange={v => setAnamnese(p => ({...p, queixa_principal: v}))} multiline />
          </AnaSection>

          {/* Seção: Histórico de saúde */}
          <AnaSection title="Histórico de Saúde">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnaField label="Doenças / diagnósticos" edit={editAnamnese}
                value={anamnese.doencas} onChange={v => setAnamnese(p => ({...p, doencas: v}))} multiline />
              <AnaField label="Cirurgias realizadas" edit={editAnamnese}
                value={anamnese.cirurgias} onChange={v => setAnamnese(p => ({...p, cirurgias: v}))} multiline />
              <AnaField label="Medicamentos em uso" edit={editAnamnese}
                value={anamnese.medicamentos} onChange={v => setAnamnese(p => ({...p, medicamentos: v}))} multiline />
              <AnaField label="Alergias" edit={editAnamnese}
                value={anamnese.alergias} onChange={v => setAnamnese(p => ({...p, alergias: v}))} multiline />
            </div>
            <div className="flex gap-6 mt-2">
              <AnaCheck label="Gestação" edit={editAnamnese}
                checked={anamnese.gestacao} onChange={v => setAnamnese(p => ({...p, gestacao: v}))} />
              <AnaCheck label="Lactação" edit={editAnamnese}
                checked={anamnese.lactacao} onChange={v => setAnamnese(p => ({...p, lactacao: v}))} />
              <AnaCheck label="Tabagismo" edit={editAnamnese}
                checked={anamnese.tabagismo} onChange={v => setAnamnese(p => ({...p, tabagismo: v}))} />
            </div>
          </AnaSection>

          {/* Seção: Contraindicações */}
          <AnaSection title="Contraindicações">
            <AnaField label="Contraindicações para procedimentos" edit={editAnamnese}
              value={anamnese.contraindicacoes} onChange={v => setAnamnese(p => ({...p, contraindicacoes: v}))} multiline />
          </AnaSection>

          {/* Seção: Hábitos */}
          <AnaSection title="Hábitos de Vida">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnaField label="Consumo de água (copos/dia)" edit={editAnamnese}
                value={anamnese.consumo_agua} onChange={v => setAnamnese(p => ({...p, consumo_agua: v}))} />
              <AnaField label="Hábitos alimentares" edit={editAnamnese}
                value={anamnese.alimentacao} onChange={v => setAnamnese(p => ({...p, alimentacao: v}))} />
              <AnaField label="Consumo de álcool" edit={editAnamnese}
                value={anamnese.alcool} onChange={v => setAnamnese(p => ({...p, alcool: v}))} />
              <AnaField label="Outros hábitos relevantes" edit={editAnamnese}
                value={anamnese.habitos_vida} onChange={v => setAnamnese(p => ({...p, habitos_vida: v}))} />
            </div>
          </AnaSection>

          {/* Seção: Objetivos */}
          <AnaSection title="Objetivos e Observações">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnaField label="Objetivos com o tratamento" edit={editAnamnese}
                value={anamnese.objetivos} onChange={v => setAnamnese(p => ({...p, objetivos: v}))} multiline />
              <AnaField label="Observações adicionais" edit={editAnamnese}
                value={anamnese.obs} onChange={v => setAnamnese(p => ({...p, obs: v}))} multiline />
            </div>
          </AnaSection>
        </div>
      )}

      {/* Modal foto */}
      <Modal open={modalFoto} onClose={() => setModalFoto(false)} title="Adicionar Foto" size="sm">
        {pendingFile && (
          <div className="mb-4">
            <img src={URL.createObjectURL(pendingFile)} className="w-full h-40 object-cover" style={{ borderRadius: 3 }} alt="preview" />
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
            <img src={lightbox.url} className="w-full" style={{ borderRadius: 3 }} alt={lightbox.legenda} />
            {(lightbox.legenda || lightbox.area_corporal) && (
              <div className="bg-black/60 text-white text-sm p-3 mt-1" style={{ borderRadius: '0 0 3px 3px' }}>
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

function AnaSection({ title, children }) {
  return (
    <div className="card space-y-4">
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</p>
      {children}
    </div>
  )
}

function AnaField({ label, value, onChange, edit, multiline }) {
  return (
    <div>
      <label className="label">{label}</label>
      {edit
        ? multiline
          ? <textarea className="input" rows={3} value={value} onChange={e => onChange(e.target.value)} />
          : <input className="input" value={value} onChange={e => onChange(e.target.value)} />
        : <p className="text-sm mt-0.5" style={{ color: value ? 'var(--ink-soft)' : 'var(--muted)', fontStyle: value ? 'normal' : 'italic', minHeight: 20 }}>
            {value || 'Não informado'}
          </p>
      }
    </div>
  )
}

function AnaCheck({ label, checked, onChange, edit }) {
  return (
    <div className="flex items-center gap-2">
      {edit
        ? <input type="checkbox" id={`chk-${label}`} checked={!!checked} onChange={e => onChange(e.target.checked)}
            className="w-4 h-4 accent-purple-700" />
        : <div className="w-4 h-4 flex items-center justify-center"
            style={{ background: checked ? 'var(--primary)' : 'var(--border)', borderRadius: 2 }}>
            {checked && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</span>}
          </div>
      }
      <label htmlFor={`chk-${label}`} className="text-sm" style={{ color: 'var(--ink-soft)' }}>{label}</label>
    </div>
  )
}
