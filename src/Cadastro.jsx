import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// ── Força de senha ───────────────────────────────────────────────────────────
function avaliarSenha(senha) {
  const req = {
    minimo:    senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero:    /[0-9]/.test(senha),
    especial:  /[^A-Za-z0-9]/.test(senha),
  }
  const ok = Object.values(req).filter(Boolean).length
  const forca = ok === 5 ? 'forte' : ok >= 3 ? 'media' : 'fraca'
  return { req, forca }
}

const FORCA = {
  fraca: { label: 'Senha fraca',  cor: '#ef4444', barras: 1 },
  media: { label: 'Senha média',  cor: '#f59e0b', barras: 2 },
  forte: { label: 'Senha forte',  cor: '#22c55e', barras: 3 },
}

// ── CSS responsivo injetado ──────────────────────────────────────────────────
const cssResponsivo = `
  .ft-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 767px) {
    .ft-grid-2 {
      grid-template-columns: 1fr;
    }
    .ft-card {
      padding: 28px 20px !important;
      max-width: 100% !important;
    }
  }
  .ft-req-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 16px;
    margin-top: 6px;
  }
  @media (max-width: 767px) {
    .ft-req-grid {
      grid-template-columns: 1fr;
    }
  }
  .ft-input:focus {
    border-color: #3b82f6 !important;
    outline: none;
  }
  .ft-btn-primary:hover:not(:disabled) {
    background: #2563eb !important;
  }
  .ft-btn-secondary:hover {
    color: #e2e8f0 !important;
    border-color: #64748b !important;
  }
`

export default function Cadastro({ onVoltar, onCadastrado }) {
  const [nome,          setNome]          = useState('')
  const [email,         setEmail]         = useState('')
  const [senha,         setSenha]         = useState('')
  const [confirmar,     setConfirmar]     = useState('')
  const [mostrarSenha,  setMostrarSenha]  = useState(false)
  const [mostrarConf,   setMostrarConf]   = useState(false)
  const [termosAceitos, setTermosAceitos] = useState(false)
  const [privAceita,    setPrivAceita]    = useState(false)
  const [erros,         setErros]         = useState({})
  const [emailExiste,   setEmailExiste]   = useState(false)
  const [load,          setLoad]          = useState(false)

  const { req, forca } = avaliarSenha(senha)
  const fc = FORCA[forca]

  // Botão ativo somente quando tudo OK
  const senhasOk   = senha && confirmar && senha === confirmar && forca !== 'fraca'
  const botaoAtivo = senhasOk && termosAceitos && privAceita

  // Inject CSS
  useEffect(() => {
    const id = 'ft-cadastro-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = cssResponsivo
      document.head.appendChild(style)
    }
    return () => {
      const el = document.getElementById(id)
      if (el) el.remove()
    }
  }, [])

  // Aviso imediato de senhas diferentes
  useEffect(() => {
    if (confirmar && senha !== confirmar) {
      setErros(prev => ({ ...prev, confirmar: 'As senhas não coincidem.' }))
    } else {
      setErros(prev => { const e = { ...prev }; delete e.confirmar; return e })
    }
  }, [senha, confirmar])

  function limparErro(campo) {
    setErros(prev => { const e = { ...prev }; delete e[campo]; return e })
  }

  async function verificarEmail() {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return
    const { data } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    setEmailExiste(!!data)
    if (data) setErros(prev => ({ ...prev, email: 'Este e-mail já possui cadastro.' }))
  }

  function validar() {
    const e = {}
    if (!nome.trim())  e.nome  = 'Informe seu nome completo.'
    if (!email.trim()) e.email = 'Informe seu e-mail.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido.'
    if (emailExiste)   e.email = 'Este e-mail já possui cadastro.'
    if (!senha)        e.senha = 'Crie uma senha.'
    else if (forca === 'fraca') e.senha = 'A senha precisa ser pelo menos média.'
    if (!confirmar)    e.confirmar = 'Confirme sua senha.'
    else if (senha !== confirmar) e.confirmar = 'As senhas não coincidem.'
    if (!termosAceitos) e.termos     = 'Aceite os Termos de Uso para continuar.'
    if (!privAceita)    e.privacidade = 'Aceite a Política de Privacidade para continuar.'
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function handleCadastro() {
    if (!validar()) return
    setLoad(true)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      })
      if (authError) {
        if (authError.message.includes('already registered')) {
          setEmailExiste(true)
          setErros(prev => ({ ...prev, email: 'Este e-mail já possui cadastro.' }))
          return
        }
        throw authError
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })
      if (loginError) throw loginError

      const userId = loginData.user?.id
      if (userId) {
        const { error: dbError } = await supabase
          .from('usuarios')
          .insert([{ id: userId, nome, email, ativo: true }])
        if (dbError) console.warn('Aviso tabela usuarios:', dbError.message)
      }

      supabase.functions.invoke('email-boas-vindas', {
        body: { nome, email },
      }).catch(err => console.warn('Aviso e-mail boas-vindas:', err.message))

      onCadastrado(loginData.user)
    } catch (e) {
      setErros({ geral: e.message || 'Erro ao criar conta. Tente novamente.' })
    } finally {
      setLoad(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={st.container}>
      <div className="ft-card" style={st.card}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={st.logo}>
            <span style={{ color: '#3b82f6' }}>Fiscal</span><span style={{ color: '#60a5fa' }}>Tribe</span>
          </div>
          <p style={st.subtitulo}>Crie sua conta para começar sua análise tributária.</p>
        </div>

        {/* Erro geral */}
        {erros.geral && <div style={st.alertaGeral}>{erros.geral}</div>}

        {/* Linha 1: Nome + E-mail */}
        <div className="ft-grid-2">

          {/* Nome */}
          <div style={st.grupo}>
            <label style={st.label}>Nome completo</label>
            <input
              className="ft-input"
              style={{ ...st.input, ...(erros.nome ? st.inputErro : {}) }}
              placeholder="Seu nome completo"
              value={nome}
              onChange={e => { setNome(e.target.value); limparErro('nome') }}
              autoComplete="name"
            />
            {erros.nome && <span style={st.textoErro}>{erros.nome}</span>}
          </div>

          {/* E-mail */}
          <div style={st.grupo}>
            <label style={st.label}>E-mail</label>
            <input
              className="ft-input"
              style={{ ...st.input, ...(erros.email ? st.inputErro : {}) }}
              placeholder="seu@email.com"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailExiste(false); limparErro('email') }}
              onBlur={verificarEmail}
              autoComplete="email"
            />
            {erros.email && <span style={st.textoErro}>{erros.email}</span>}
            {emailExiste && (
              <div style={st.emailBox}>
                <span>Este e-mail já possui cadastro.</span>
                <div style={{ marginTop: 5, display: 'flex', gap: 12 }}>
                  <button onClick={onVoltar} style={st.linkAcao}>Fazer login</button>
                  <button onClick={onVoltar} style={st.linkAcao}>Recuperar senha</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Senha + Confirmar */}
        <div className="ft-grid-2">

          {/* Senha */}
          <div style={st.grupo}>
            <label style={st.label}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="ft-input"
                style={{ ...st.input, paddingRight: 44, ...(erros.senha ? st.inputErro : {}) }}
                placeholder="Crie uma senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => { setSenha(e.target.value); limparErro('senha') }}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setMostrarSenha(v => !v)} style={st.olho}>
                {mostrarSenha ? '🙈' : '👁️'}
              </button>
            </div>
            {erros.senha && <span style={st.textoErro}>{erros.senha}</span>}
          </div>

          {/* Confirmar senha */}
          <div style={st.grupo}>
            <label style={st.label}>Confirmar senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="ft-input"
                style={{ ...st.input, paddingRight: 44, ...(erros.confirmar ? st.inputErro : {}) }}
                placeholder="Repita a senha"
                type={mostrarConf ? 'text' : 'password'}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setMostrarConf(v => !v)} style={st.olho}>
                {mostrarConf ? '🙈' : '👁️'}
              </button>
            </div>
            {erros.confirmar && <span style={st.textoErro}>{erros.confirmar}</span>}
          </div>
        </div>

        {/* Medidor de força — largura total */}
        {senha && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              {[1,2,3].map(n => (
                <div key={n} style={{ ...st.barra, backgroundColor: n <= fc.barras ? fc.cor : '#334155' }} />
              ))}
              <span style={{ color: fc.cor, fontSize: 12, fontWeight: 600, marginLeft: 8, whiteSpace: 'nowrap' }}>
                {fc.label}
              </span>
            </div>
            {/* Requisitos em 2 colunas */}
            <div className="ft-req-grid">
              {[
                { ok: req.minimo,    txt: 'Mínimo de 8 caracteres' },
                { ok: req.maiuscula, txt: 'Uma letra maiúscula' },
                { ok: req.minuscula, txt: 'Uma letra minúscula' },
                { ok: req.numero,    txt: 'Um número' },
                { ok: req.especial,  txt: 'Um caractere especial (!@#$...)' },
              ].map(({ ok, txt }) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ok ? '#22c55e' : '#64748b' }}>
                  <span>{ok ? '✓' : '○'}</span>{txt}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Termos */}
        <div style={{ marginBottom: 6 }}>
          <label style={st.checkLabel}>
            <input
              type="checkbox"
              checked={termosAceitos}
              onChange={e => { setTermosAceitos(e.target.checked); limparErro('termos') }}
              style={{ marginRight: 8, accentColor: '#3b82f6' }}
            />
            Li e aceito os <span style={st.linkTexto}>Termos de Uso</span>
          </label>
          {erros.termos && <span style={st.textoErro}>{erros.termos}</span>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={st.checkLabel}>
            <input
              type="checkbox"
              checked={privAceita}
              onChange={e => { setPrivAceita(e.target.checked); limparErro('privacidade') }}
              style={{ marginRight: 8, accentColor: '#3b82f6' }}
            />
            Concordo com a <span style={st.linkTexto}>Política de Privacidade</span>
          </label>
          {erros.privacidade && <span style={st.textoErro}>{erros.privacidade}</span>}
        </div>

        {/* Segurança */}
        <p style={st.seguranca}>
          🔒 Seus dados são protegidos e utilizados somente para o funcionamento da plataforma.
        </p>

        {/* Botão principal */}
        <button
          className="ft-btn-primary"
          style={{ ...st.btn, opacity: (!botaoAtivo || load) ? 0.45 : 1, cursor: (!botaoAtivo || load) ? 'not-allowed' : 'pointer' }}
          onClick={handleCadastro}
          disabled={!botaoAtivo || load}
        >
          {load ? 'Criando conta…' : 'Criar minha conta →'}
        </button>

        {/* Navegação */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="ft-btn-secondary" style={st.btnVoltar} onClick={onVoltar}>
            ← Voltar ao Login
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const st = {
  container:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:       { background: '#1e293b', borderRadius: 16, padding: '32px 40px', width: '100%', maxWidth: 960, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  logo:       { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 },
  subtitulo:  { color: '#94a3b8', fontSize: 14, margin: 0 },
  grupo:      { marginBottom: 4 },
  label:      { display: 'block', color: '#cbd5e1', fontSize: 13, fontWeight: 600, marginBottom: 5 },
  input:      { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' },
  inputErro:  { borderColor: '#ef4444' },
  olho:       { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 },
  barra:      { height: 4, flex: 1, borderRadius: 2, transition: 'background-color 0.3s' },
  textoErro:  { display: 'block', color: '#ef4444', fontSize: 12, marginTop: 3 },
  alertaGeral:{ backgroundColor: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 },
  emailBox:   { backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: 12, color: '#93c5fd' },
  linkAcao:   { background: 'none', border: 'none', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 },
  checkLabel: { display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: 13, cursor: 'pointer' },
  linkTexto:  { color: '#60a5fa', marginLeft: 4 },
  seguranca:  { color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 14, lineHeight: 1.4 },
  btn:        { width: '100%', padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, marginBottom: 0, transition: 'background 0.2s' },
  btnVoltar:  { flex: 1, padding: 9, background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, transition: 'color 0.2s, border-color 0.2s' },
}