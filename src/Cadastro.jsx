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

// ── Componente ───────────────────────────────────────────────────────────────
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
    if (!termosAceitos) e.termos    = 'Aceite os Termos de Uso para continuar.'
    if (!privAceita)    e.privacidade = 'Aceite a Política de Privacidade para continuar.'
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function handleCadastro() {
    if (!validar()) return
    setLoad(true)
    try {
      // Cria a conta
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

      // Login imediato
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

      // E-mail de boas-vindas
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

  return (
    <div style={st.container}>
      <div style={st.card}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={st.logo}>
            <span style={{ color: '#3b82f6' }}>Fiscal</span><span style={{ color: '#60a5fa' }}>Tribe</span>
          </div>
          <p style={st.subtitulo}>Crie sua conta para começar sua análise tributária.</p>
        </div>

        {/* Erro geral */}
        {erros.geral && <div style={st.alertaGeral}>{erros.geral}</div>}

        {/* Nome */}
        <div style={st.grupo}>
          <label style={st.label}>Nome completo</label>
          <input
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
              <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
                <button onClick={onVoltar} style={st.linkAcao}>Fazer login</button>
                <button onClick={onVoltar} style={st.linkAcao}>Recuperar senha</button>
              </div>
            </div>
          )}
        </div>

        {/* Senha */}
        <div style={st.grupo}>
          <label style={st.label}>Senha</label>
          <div style={{ position: 'relative' }}>
            <input
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

          {/* Medidor */}
          {senha && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ ...st.barra, backgroundColor: n <= fc.barras ? fc.cor : '#334155' }} />
                ))}
                <span style={{ color: fc.cor, fontSize: 12, fontWeight: 600, marginLeft: 8 }}>{fc.label}</span>
              </div>
              <ul style={st.checklist}>
                {[
                  { ok: req.minimo,    txt: 'Mínimo de 8 caracteres' },
                  { ok: req.maiuscula, txt: 'Uma letra maiúscula' },
                  { ok: req.minuscula, txt: 'Uma letra minúscula' },
                  { ok: req.numero,    txt: 'Um número' },
                  { ok: req.especial,  txt: 'Um caractere especial (!@#$...)' },
                ].map(({ ok, txt }) => (
                  <li key={txt} style={{ color: ok ? '#22c55e' : '#64748b', display: 'flex', gap: 6 }}>
                    <span>{ok ? '✓' : '○'}</span>{txt}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {erros.senha && <span style={st.textoErro}>{erros.senha}</span>}
        </div>

        {/* Confirmar senha */}
        <div style={st.grupo}>
          <label style={st.label}>Confirmar senha</label>
          <div style={{ position: 'relative' }}>
            <input
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

        {/* Termos */}
        <div style={{ marginBottom: 8 }}>
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

        <div style={{ marginBottom: 20 }}>
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
          style={{ ...st.btn, opacity: load ? 0.7 : 1 }}
          onClick={handleCadastro}
          disabled={load}
        >
          {load ? 'Criando conta…' : 'Criar conta →'}
        </button>

        {/* Voltar */}
        <button style={st.btnVoltar} onClick={onVoltar}>
          ← Voltar ao Login
        </button>

      </div>
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const st = {
  container:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:       { background: '#1e293b', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  logo:       { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 },
  subtitulo:  { color: '#94a3b8', fontSize: 14, margin: 0 },
  grupo:      { marginBottom: 20 },
  label:      { display: 'block', color: '#cbd5e1', fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input:      { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  inputErro:  { borderColor: '#ef4444' },
  olho:       { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 },
  barra:      { height: 4, flex: 1, borderRadius: 2, transition: 'background-color 0.3s' },
  checklist:  { listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 },
  textoErro:  { display: 'block', color: '#ef4444', fontSize: 12, marginTop: 4 },
  alertaGeral:{ backgroundColor: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 20 },
  emailBox:   { backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13, color: '#93c5fd' },
  linkAcao:   { background: 'none', border: 'none', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 },
  checkLabel: { display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: 13, cursor: 'pointer' },
  linkTexto:  { color: '#60a5fa', marginLeft: 4 },
  seguranca:  { color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 20, lineHeight: 1.5 },
  btn:        { width: '100%', padding: 13, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 12 },
  btnVoltar:  { width: '100%', padding: 10, background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
}