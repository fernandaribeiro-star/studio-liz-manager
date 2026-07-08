import { useEffect, useRef, useState } from 'react'
import { Menu, Bell, LogOut, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'

export function Topbar({ onMenuClick, title }) {
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const [logoUrl, setLogoUrl] = useState(null)
  const [hovering, setHovering] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('config').select('valor').eq('chave', 'logo_url').single()
      .then(({ data }) => { if (data?.valor) setLogoUrl(data.valor) })
  }, [])

  async function sair() {
    await supabase.auth.signOut()
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `studio/logo.${ext}`
    const { error } = await supabase.storage.from('fotos-clientes').upload(path, file, { upsert: true })
    if (error) { showToast('Erro ao enviar logo', 'error'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('fotos-clientes').getPublicUrl(path)
    await supabase.from('config').upsert({ chave: 'logo_url', valor: publicUrl }, { onConflict: 'chave' })
    setLogoUrl(publicUrl)
    setUploading(false)
    showToast('Logo atualizado ✓')
    e.target.value = ''
  }

  return (
    <header
      className="flex items-center justify-between px-6 lg:px-12 sticky top-0 z-10"
      style={{ height: 86, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded transition-colors" style={{ color: 'var(--muted)' }}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="page-title">{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{saudacao}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 transition-colors" style={{ color: 'var(--muted)' }}>
          <Bell size={18} />
        </button>
        <button
          onClick={sair}
          className="p-2 transition-colors"
          title="Sair"
          style={{ color: 'var(--muted)' }}
        >
          <LogOut size={18} />
        </button>

        <div
          className="relative flex items-center justify-center text-white text-sm font-semibold cursor-pointer overflow-hidden"
          style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', fontSize: 13 }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={() => fileRef.current?.click()}
          title="Clique para alterar o logo"
        >
          {logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>LZ</span>
          }
          {hovering && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
              {uploading ? <span style={{ fontSize: 8 }}>…</span> : <Camera size={14} />}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </div>
    </header>
  )
}
