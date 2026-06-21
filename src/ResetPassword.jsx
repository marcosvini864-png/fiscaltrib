import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function ResetPassword() {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [sessaoOk, setSessaoOk] = useState(false)

  useEffect(() => {
    // URL formato: /#/reset-password#access_token=xxx&type=recovery
    // Pega tudo após o último #
    const fullUrl = window.location.href
    const lastHash = fullUrl.lastIndexOf('#')
    const fragment = lastHash >= 0 ? fullUrl.substring(lastHash + 1) : ''
    const params = new URLSearchParams(fragment)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    console.log("access_token:", accessToken, "| type:", type)

    if (accessToken && type === 'recovery') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        .then(({ error }) => {
          if (error) {
            console.error("setSession error:", error.message)
            setMsg('erro|Link inválido ou expirado. Solicite um novo link.')
          } else {
            setSessaoOk(true)
          }
        })
    } else {
      // Tenta token_hash (formato novo)
      const hash = window.location.hash
      const queryString = hash.includes('?') ? hash.split('?')[1] : ''
      const qParams = new URLSearchParams(queryString)
      const tokenHash = qParams.get('token_hash')

      if (tokenHash) {
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
          .then(({ error }) => {
            if (error) {
              setMsg('erro|Link inválido ou expirado. Solicite um novo link.')
            } else {
              setSessaoOk(true)
            }
          })
      } else {
        setMsg('erro|Link inválido. Solicite um novo link de recuperação.')
      }
    }
  }, [])

  const handleReset = async () => {
    if (!senha.trim()) { setMsg('erro|Digite a nova senha.'); return }
    if (senha.length < 6) { setMsg('erro|A senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmar) { setMsg('erro|As senhas não coincidem.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)

    if (error) {
      setMsg('erro|Erro: ' + error.message)
    } else {
      setPronto(true)
      setMsg('ok|Senha redefinida com sucesso! Redirecionando...')
      setTimeout(() => { window.location.href = '/' }, 3000)
    }
  }

  const [tipo, texto] = msg ? msg.split('|') : ['', '']

  return (
    <div style={{ minHeight: '100vh', background: '#0B1F4D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/Logo3.png" alt="FiscalTrib" style={{ height: 60, marginBottom: 12 }} />
          <h2 style={{ color: '#0B1F4D', margin: 0, fontSize: 22 }}>🔑 Nova senha</h2>
          <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>Digite e confirme sua nova senha</p>
        </div>

        {msg && (
          <div style={{
            background: tipo === 'ok' ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${tipo === 'ok' ? '#6ee7b7' : '#fca5a5'}`,
            color: tipo === 'ok' ? '#065f46' : '#991b1b',
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14
          }}>
            {tipo === 'ok' ? '✅' : '⚠️'} {texto}
          </div>
        )}

        {!sessaoOk && !msg && (
          <p style={{ textAlign: 'center', color: '#666' }}>⏳ Verificando link...</p>
        )}

        {!pronto && sessaoOk && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 6 }}>Nova senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 6 }}>Confirmar nova senha</label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repita a nova senha"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleReset} disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#0B1F4D', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 'bold', cursor: 'pointer' }}>
              {loading ? 'Salvando...' : '🔒 Salvar nova senha'}
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ color: '#0B1F4D', fontSize: 13, textDecoration: 'none' }}>← Voltar ao login</a>
        </div>
        <p style={{ color: '#9db8d8', fontSize: 11, marginTop: 20, textAlign: 'center' }}>© 2026 e-FiscalTrib® — Todos os direitos reservados</p>
      </div>
    </div>
  )
}