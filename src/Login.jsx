import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const cssResponsivo = `
  .ft-login-card {
    background: #fff;
    border-radius: 16px;
    padding: 32px 40px;
    width: 100%;
    max-width: 460px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    box-sizing: border-box;
  }
  .ft-login-input {
    width: 100%;
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    box-sizing: border-box;
    font-size: 14px;
    color: #1e293b;
    outline: none;
    transition: border-color 0.2s;
  }
  .ft-login-input:focus {
    border-color: #1e3a5f;
  }
  .ft-btn-principal {
    width: 100%;
    padding: 5px;
    background: #1e3a5f;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }
  .ft-btn-principal:hover:not(:disabled) {
    background: #162d4a;
  }
  .ft-btn-outline {
    width: 100%;
    padding: 5px;
    background: transparent;
    color: #1e3a5f;
    border: 2px solid #1e3a5f;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .ft-btn-outline:hover {
    background: #1e3a5f;
    color: #fff;
  }
  .ft-contatos {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  @media (max-width: 767px) {
    .ft-login-card {
      padding: 24px 18px;
      border-radius: 12px;
    }
    .ft-contatos {
      flex-direction: column;
      align-items: center;
    }
    .ft-contatos a {
      width: 100%;
      justify-content: center;
    }
  }
`

export default function Login({ onLogin, onCadastro }) {
  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [erro,     setErro]     = useState('')
  const [load,     setLoad]     = useState(false)
  const [tela,     setTela]     = useState('login')
  const [emailRec, setEmailRec] = useState('')
  const [msgRec,   setMsgRec]   = useState('')
  const [loadRec,  setLoadRec]  = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    const id = 'ft-login-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = cssResponsivo
      document.head.appendChild(style)
    }
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  const handleLogin = async () => {
    setErro('')
    if (!email.trim() || !senha.trim()) { setErro('Preencha e-mail e senha.'); return }
    setLoad(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); setLoad(false); return }
    onLogin(data.user)
    setLoad(false)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleLogin() }

  const handleRecuperar = async () => {
    if (!emailRec.trim()) { setMsgRec('erro|Informe seu e-mail.'); return }
    setLoadRec(true)
    setMsgRec('')
    await supabase.auth.resetPasswordForEmail(emailRec.trim(), {
      redirectTo: 'https://fiscaltrib.com.br/#/reset-password',
    })
    setLoadRec(false)
    setMsgRec('ok|E-mail enviado! Verifique sua caixa de entrada.')
  }

  // ── TELA ESQUECI A SENHA ─────────────────────────────────────────────────
  if (tela === 'esqueci') {
    const [tipo, msg] = msgRec ? msgRec.split('|') : ['', '']
    return (
      <div style={st.pagina}>
        <div className="ft-login-card">

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src="/Logo5.png" alt="e-FiscalTribe" style={{ height: 56, maxWidth: '220px', objectFit: 'contain' }} />
          </div>

          <h2 style={{ textAlign: 'center', color: '#1e3a5f', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            🔑 Recuperar senha
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 16 }}>
            Digite seu e-mail e enviaremos um link para criar uma nova senha.
          </p>

          {msgRec && (
            <div style={{
              background: tipo === 'ok' ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${tipo === 'ok' ? '#86efac' : '#fecdd3'}`,
              borderRadius: 8, padding: '10px 12px', marginBottom: 12,
              fontSize: 13, color: tipo === 'ok' ? '#16a34a' : '#dc2626', fontWeight: 500
            }}>
              {tipo === 'ok' ? '✅ ' : '⚠️ '}{msg}
            </div>
          )}

          <input
            className="ft-login-input"
            style={{ marginBottom: 12 }}
            type="email"
            placeholder="Seu e-mail cadastrado"
            value={emailRec}
            onChange={e => setEmailRec(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRecuperar()}
            disabled={tipo === 'ok'}
          />

          {tipo !== 'ok' && (
            <button
              className="ft-btn-principal"
              style={{ marginBottom: 10, opacity: loadRec ? 0.7 : 1 }}
              onClick={handleRecuperar}
              disabled={loadRec}
            >
              {loadRec ? 'Enviando...' : '📧 Enviar link de recuperação'}
            </button>
          )}

          <button
            className="ft-btn-outline"
            onClick={() => { setTela('login'); setMsgRec(''); setEmailRec('') }}
          >
            ← Voltar ao login
          </button>
        </div>

        <p style={st.rodape}>© 2026 e-FiscalTribe® — Todos os direitos reservados</p>
      </div>
    )
  }

  // ── TELA DE LOGIN ────────────────────────────────────────────────────────
  return (
    <div style={st.pagina}>
      <div className="ft-login-card">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <img src="/Logo5.png" alt="e-FiscalTribe" style={{ height: 83, maxWidth: '300px', objectFit: 'contain' }} />
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>
            ⚠️ {erro}
          </div>
        )}

        {/* E-mail */}
        <div style={{ marginBottom: 10 }}>
          <label style={st.label}>E-mail</label>
          <input
            className="ft-login-input"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />
        </div>

        {/* Senha */}
        <div style={{ marginBottom: 4 }}>
          <label style={st.label}>Senha</label>
          <div style={{ position: 'relative' }}>
            <input
              className="ft-login-input"
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}
            >
              {mostrarSenha ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Esqueci */}
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <button
            onClick={() => { setTela('esqueci'); setEmailRec(email) }}
            style={{ background: 'none', border: 'none', color: '#1e3a5f', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            Esqueci minha senha
          </button>
        </div>

        {/* Botão entrar */}
        <button
          className="ft-btn-principal"
          style={{ marginBottom: 10, opacity: load ? 0.7 : 1 }}
          onClick={handleLogin}
          disabled={load}
        >
          {load ? 'Entrando...' : 'Entrar →'}
        </button>

        {/* Criar conta */}
        <button
          className="ft-btn-outline"
          style={{ marginBottom: 16 }}
          onClick={onCadastro}
        >
          Criar nova conta
        </button>

        {/* Retomar pagamento */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textAlign: 'center' }}>
            Já se cadastrou mas não conseguiu efetuar o pagamento?
          </p>
          <button
            style={{ width: '100%', padding: 5, background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            onClick={handleLogin}
          >
            👉 Retomar meu pagamento
          </button>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
            Digite seu e-mail e senha acima e clique neste botão.
          </p>
        </div>

        {/* Contatos */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textAlign: 'center' }}>Dúvidas? Fale conosco:</p>
          <div className="ft-contatos">
            <a href="https://wa.me/5511999579822" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              📲 (11) 99957-9822
            </a>
            <a href="mailto:contato@fiscaltrib.com.br"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1e3a5f', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              ✉️ contato@fiscaltrib.com.br
            </a>
          </div>
        </div>

      </div>

      <p style={st.rodape}>© 2026 e-FiscalTribe® — Todos os direitos reservados</p>
    </div>
  )
}

const st = {
  pagina: {
    minHeight: '100vh',
    background: '#1e3a5f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    fontFamily: "'Inter', sans-serif",
  },
  label: {
    display: 'block',
    color: '#475569',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 3,
  },
  rodape: {
    color: '#9db8d8',
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
}