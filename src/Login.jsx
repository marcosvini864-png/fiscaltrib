import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin, onCadastro }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro,  setErro]  = useState('')
  const [load,  setLoad]  = useState(false)

  const handleLogin = async () => {
    setErro('')
    setLoad(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); setLoad(false); return }
    onLogin(data.user)
    setLoad(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      {/* Card de login */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <img
            src="/logo2.png"
            alt="e-FiscalTrib"
            style={{ height: 80, objectFit: 'contain' }}
          />
        </div>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 24 }}>
          Sistema de Diagnóstico e Recuperação Tributária
        </p>

        {erro && <p style={{ color: 'red', marginBottom: 12, fontSize: 13 }}>{erro}</p>}

        <input
          style={{ width: '100%', padding: 10, marginBottom: 12, border: '1px solid #ccc', borderRadius: 8, boxSizing: 'border-box', fontSize: 14 }}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          style={{ width: '100%', padding: 10, marginBottom: 16, border: '1px solid #ccc', borderRadius: 8, boxSizing: 'border-box', fontSize: 14 }}
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          style={{ width: '100%', padding: 12, background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', marginBottom: 12, opacity: load ? 0.7 : 1 }}
          onClick={handleLogin}
          disabled={load}
        >
          {load ? 'Entrando...' : 'Entrar'}
        </button>

        <button
          style={{ width: '100%', padding: 12, background: 'transparent', color: '#1e3a5f', border: '2px solid #1e3a5f', borderRadius: 8, fontSize: 15, cursor: 'pointer', marginBottom: 24 }}
          onClick={onCadastro}
        >
          Criar nova conta
        </button>

        {/* Retomar pagamento */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
            Já se cadastrou mas não conseguiu efetuar o pagamento?
          </p>
          <button
            style={{ width: '100%', padding: 10, background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}
            onClick={handleLogin}
          >
            👉 Retomar meu pagamento
          </button>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Digite seu e-mail e senha acima e clique neste botão.
          </p>
        </div>

        {/* Contato */}
        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 20, paddingTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Dúvidas? Fale conosco:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <a
              href="https://wa.me/5511999579822"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
              📲 (11) 99957-9822
            </a>
            <a
              href="mailto:contato@fiscaltrib.com.br"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1e3a5f', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
              ✉️ contato@fiscaltrib.com.br
            </a>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <p style={{ color: '#9db8d8', fontSize: 11, marginTop: 20 }}>
        © 2026 e-FiscalTrib® — Todos os direitos reservados
      </p>
    </div>
  )
}