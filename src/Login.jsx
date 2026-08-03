import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const cssResponsivo = `
  html, body, #root {
    height: 100%;
    margin: 0;
  }
  .ft-page {
    height: 100vh;
    overflow: hidden;
    background: #FAFBFC;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', sans-serif;
  }
  .ft-header {
    background: #fff;
    border-bottom: 1px solid #EEF1F4;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 16px;
    flex-shrink: 0;
  }
  .ft-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 72px;
    padding: 20px 24px;
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    min-height: 0;
    overflow: hidden;
  }
  .ft-left {
    flex: 1;
    max-width: 520px;
  }
  .ft-right {
    flex-shrink: 0;
  }
  .ft-login-card {
    background: #fff;
    border-radius: 20px;
    padding: 36px 36px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 50px rgba(15,23,42,0.10);
    box-sizing: border-box;
    border: 1px solid #F1F5F9;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
  }
  .ft-login-input {
    width: 100%;
    padding: 13px 14px;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    box-sizing: border-box;
    font-size: 14px;
    color: #1e293b;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ft-login-input:focus {
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
  }
  .ft-btn-principal {
    width: 100%;
    padding: 14px;
    background: #2563EB;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(37,99,235,0.32);
    transition: background 0.15s, transform 0.1s;
  }
  .ft-btn-principal:hover:not(:disabled) {
    background: #1D4ED8;
    transform: translateY(-1px);
  }
  .ft-btn-outline {
    width: 100%;
    padding: 13px;
    background: #F8FAFC;
    color: #334155;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .ft-btn-outline:hover {
    background: #F1F5F9;
    border-color: #CBD5E1;
  }
  .ft-recurso-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
  }
  .ft-recurso-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: #EFF4FF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
  }
  @media (max-width: 900px) {
    .ft-page {
      height: auto;
      overflow: auto;
      min-height: 100vh;
    }
    .ft-body {
      flex-direction: column;
      gap: 36px;
      padding: 28px 20px;
      overflow: visible;
    }
    .ft-left {
      max-width: 100%;
      text-align: center;
    }
    .ft-left .ft-recurso-item {
      justify-content: center;
    }
    .ft-login-card {
      max-height: none;
      overflow: visible;
    }
  }
  @media (max-width: 767px) {
    .ft-login-card {
      padding: 22px 18px;
      border-radius: 12px;
    }
  }
`

const RECURSOS = [
  { icon: '🔍', label: 'Diagnóstico Tributário Inteligente' },
  { icon: '💰', label: 'Recuperação Tributária' },
  { icon: '⚠️', label: 'Inteligência da Dívida Ativa' },
  { icon: '📡', label: 'Radar Tributário 24h' },
  { icon: '🧮', label: 'Simuladores Tributários' },
  { icon: '📊', label: 'Relatórios Executivos' },
]

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
      <div className="ft-page">
        <div className="ft-header">
          <img src="/Logo6.png" alt="FiscalTribe" style={{ height: 62, borderRadius: 8 }} />
        </div>

        <div className="ft-body" style={{ justifyContent: 'center' }}>
          <div className="ft-login-card">

            <h2 style={{ textAlign: 'center', color: '#0F172A', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
              Recuperar senha
            </h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 20 }}>
              Digite seu e-mail e enviaremos um link para criar uma nova senha.
            </p>

            {msgRec && (
              <div style={{
                background: tipo === 'ok' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${tipo === 'ok' ? '#BBF7D0' : '#FECACA'}`,
                borderRadius: 8, padding: '10px 12px', marginBottom: 14,
                fontSize: 13, color: tipo === 'ok' ? '#16A34A' : '#DC2626', fontWeight: 500
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
                {loadRec ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            )}

            <button
              className="ft-btn-outline"
              onClick={() => { setTela('login'); setMsgRec(''); setEmailRec('') }}
            >
              ← Voltar ao login
            </button>
          </div>
        </div>

        <p style={st.rodape}>© 2026 e-FiscalTribe® — Todos os direitos reservados</p>
      </div>
    )
  }

  // ── TELA DE LOGIN ────────────────────────────────────────────────────────
  return (
    <div className="ft-page">
      <div className="ft-header">
        <img src="/Logo6.png" alt="FiscalTribe" style={{ height: 62, borderRadius: 8 }} />
      </div>

      <div className="ft-body">

        {/* Coluna esquerda — proposta de valor + recursos */}
        <div className="ft-left">
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', marginBottom: 12, lineHeight: 1.25, letterSpacing: '-0.5px' }}>
            Descubra créditos tributários que sua empresa está deixando de recuperar
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', marginBottom: 32, lineHeight: 1.6, fontWeight: 400 }}>
            O FiscalTribe transforma seus documentos fiscais em oportunidades reais de recuperação — com inteligência tributária que encontra o que sua empresa pagou a mais.
          </p>

          <div>
            {RECURSOS.map((r, i) => (
              <div key={i} className="ft-recurso-item">
                <div className="ft-recurso-icon">{r.icon}</div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna direita — login */}
        <div className="ft-right">
          <div className="ft-login-card">

            <h2 style={{ textAlign: 'center', color: '#0F172A', fontSize: 23, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.3px' }}>
              Acesse sua conta
            </h2>
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, marginBottom: 26 }}>
              Digite seus dados de acesso
            </p>

            {/* Erro */}
            {erro && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#DC2626' }}>
                {erro}
              </div>
            )}

            {/* E-mail */}
            <div style={{ marginBottom: 12 }}>
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
            <div style={{ marginBottom: 6 }}>
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
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 0, opacity: 0.6 }}
                >
                  {mostrarSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Esqueci */}
            <div style={{ textAlign: 'right', marginBottom: 22 }}>
              <button
                onClick={() => { setTela('esqueci'); setEmailRec(email) }}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Botão entrar */}
            <button
              className="ft-btn-principal"
              style={{ marginBottom: 12, opacity: load ? 0.7 : 1 }}
              onClick={handleLogin}
              disabled={load}
            >
              {load ? 'Entrando...' : 'Entrar'}
            </button>

            {/* Criar conta */}
            <button
              className="ft-btn-outline"
              style={{ marginBottom: 18 }}
              onClick={onCadastro}
            >
              Criar nova conta
            </button>

            {/* Retomar pagamento — discreto */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <button
                onClick={handleLogin}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Já se cadastrou mas não concluiu o pagamento? Clique aqui após entrar
              </button>
            </div>

            {/* Contatos */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, textAlign: 'center' }}>
              <a href="mailto:contato@fiscaltrib.com.br"
                style={{ fontSize: 12, color: '#64748B', textDecoration: 'none' }}>
                contato@fiscaltrib.com.br
              </a>
            </div>

          </div>
        </div>

      </div>

      <p style={st.rodape}>© 2026 e-FiscalTribe® — Todos os direitos reservados</p>
    </div>
  )
}

const st = {
  label: {
    display: 'block',
    color: '#475569',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 4,
  },
  rodape: {
    color: '#CBD5E1',
    fontSize: 11,
    padding: '8px 0 12px',
    textAlign: 'center',
    flexShrink: 0,
  },
}