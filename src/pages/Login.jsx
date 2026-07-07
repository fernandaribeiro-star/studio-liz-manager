import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="text-center mb-8">
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
            Studio Liz
          </p>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 6 }}>
            Gestão Estética
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <p className="section-title mb-6">Entrar</p>
          <form onSubmit={entrar} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <input
                className="input"
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
            </div>
            {erro && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{erro}</p>
            )}
            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
