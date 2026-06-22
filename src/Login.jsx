import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin, onCadastro }) {
  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [erro,     setErro]     = useState('')
  const [load,     setLoad]     = useState(false)
  const [tela,     setTela]     = useState('login')
  const [emailRec, setEmailRec] = useState('')
  const [msgRec,   setMsgRec]   = useState('')
  const [loadRec,  setLoadRec]  = useState(false)

  const handleLogin = async () => {
    setErro('')
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
      <div style={{ minHeight:'100vh', background:'#1e3a5f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'#fff', borderRadius:16, padding:'20px 32px', width:380, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign:'center', marginBottom:6 }}>
            <img src="/Logo3.png" alt="e-FiscalTrib" style={{ height:64, objectFit:'contain' }} />
          </div>
          <h2 style={{ textAlign:'center', color:'#1e3a5f', fontSize:16, fontWeight:700, marginBottom:6 }}>🔑 Recuperar senha</h2>
          <p style={{ textAlign:'center', color:'#64748b', fontSize:12, marginBottom:16 }}>
            Digite seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
          {msg && (
            <div style={{ background:tipo==='ok'?'#f0fdf4':'#fff1f2', border:`1px solid ${tipo==='ok'?'#86efac':'#fecdd3'}`, borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:12, color:tipo==='ok'?'#16a34a':'#dc2626', fontWeight:500 }}>
              {tipo==='ok'?'✅ ':'⚠️ '}{msg}
            </div>
          )}
          <input
            style={{ width:'100%', padding:'8px 10px', marginBottom:12, border:'1px solid #ccc', borderRadius:8, boxSizing:'border-box', fontSize:13 }}
            type="email" placeholder="Seu e-mail cadastrado"
            value={emailRec} onChange={e=>setEmailRec(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleRecuperar()}
            disabled={tipo==='ok'}
          />
          {tipo !== 'ok' && (
            <button
              style={{ width:'100%', padding:10, background:'#1e3a5f', color:'#fff', border:'none', borderRadius:8, fontSize:14, cursor:'pointer', marginBottom:8, opacity:loadRec?0.7:1 }}
              onClick={handleRecuperar} disabled={loadRec}>
              {loadRec ? 'Enviando...' : '📧 Enviar link de recuperação'}
            </button>
          )}
          <button
            style={{ width:'100%', padding:10, background:'transparent', color:'#1e3a5f', border:'2px solid #1e3a5f', borderRadius:8, fontSize:13, cursor:'pointer' }}
            onClick={()=>{ setTela('login'); setMsgRec(''); setEmailRec('') }}>
            ← Voltar ao login
          </button>
        </div>
        <p style={{ color:'#9db8d8', fontSize:11, marginTop:16 }}>© 2026 e-FiscalTrib® — Todos os direitos reservados</p>
      </div>
    )
  }

  // ── TELA DE LOGIN ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#1e3a5f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'20px 32px', width:380, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>

        <div style={{ textAlign:'center', marginBottom:4 }}>
          <img src="/Logo3.png" alt="e-FiscalTrib" style={{ height:70, objectFit:'contain' }} />
        </div>

        <p style={{ textAlign:'center', color:'#64748b', fontSize:12, marginBottom:14 }}>
          Sistema de Diagnóstico e Recuperação Tributária
        </p>

        {erro && <p style={{ color:'red', marginBottom:8, fontSize:12 }}>{erro}</p>}

        <input
          style={{ width:'100%', padding:'8px 10px', marginBottom:8, border:'1px solid #ccc', borderRadius:8, boxSizing:'border-box', fontSize:13 }}
          type="email" placeholder="E-mail"
          value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={handleKeyDown}
        />
        <input
          style={{ width:'100%', padding:'8px 10px', marginBottom:6, border:'1px solid #ccc', borderRadius:8, boxSizing:'border-box', fontSize:13 }}
          type="password" placeholder="Senha"
          value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={handleKeyDown}
        />

        <div style={{ textAlign:'right', marginBottom:12 }}>
          <button onClick={()=>{ setTela('esqueci'); setEmailRec(email) }}
            style={{ background:'none', border:'none', color:'#1e3a5f', fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>
            Esqueci minha senha
          </button>
        </div>

        <button
          style={{ width:'100%', padding:10, background:'#1e3a5f', color:'#fff', border:'none', borderRadius:8, fontSize:14, cursor:'pointer', marginBottom:8, opacity:load?0.7:1 }}
          onClick={handleLogin} disabled={load}>
          {load ? 'Entrando...' : 'Entrar'}
        </button>

        <button
          style={{ width:'100%', padding:10, background:'transparent', color:'#1e3a5f', border:'2px solid #1e3a5f', borderRadius:8, fontSize:14, cursor:'pointer', marginBottom:14 }}
          onClick={onCadastro}>
          Criar nova conta
        </button>

        <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:12, textAlign:'center' }}>
          <p style={{ fontSize:12, color:'#64748b', marginBottom:6 }}>
            Já se cadastrou mas não conseguiu efetuar o pagamento?
          </p>
          <button
            style={{ width:'100%', padding:8, background:'#f0b429', color:'#0f172a', border:'none', borderRadius:8, fontSize:13, fontWeight:'bold', cursor:'pointer' }}
            onClick={handleLogin}>
            👉 Retomar meu pagamento
          </button>
          <p style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>
            Digite seu e-mail e senha acima e clique neste botão.
          </p>
        </div>

        <div style={{ borderTop:'1px solid #e2e8f0', marginTop:12, paddingTop:12, textAlign:'center' }}>
          <p style={{ fontSize:11, color:'#94a3b8', marginBottom:8 }}>Dúvidas? Fale conosco:</p>
          <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
            <a href="https://wa.me/5511999579822" target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:4, background:'#16a34a', color:'#fff', padding:'6px 10px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
              📲 (11) 99957-9822
            </a>
            <a href="mailto:contato@fiscaltrib.com.br"
              style={{ display:'flex', alignItems:'center', gap:4, background:'#eff6ff', color:'#1e3a5f', padding:'6px 10px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
              ✉️ contato@fiscaltrib.com.br
            </a>
          </div>
        </div>
      </div>
      <p style={{ color:'#9db8d8', fontSize:11, marginTop:12 }}>© 2026 e-FiscalTrib® — Todos os direitos reservados</p>
    </div>
  )
}