import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Cadastro from './Cadastro'
import Planos from './Planos'
import Aprovado from './Aprovado'
import TipoPerfil from './TipoPerfil'
import Perfil from './Perfil'
import Dashboard from './Dashboard'
import Admin from './Admin'
import ResetPassword from './ResetPassword'
import CookieBanner from './CookieBanner'

const ADMIN_EMAIL = 'marcosvini864@gmail.com'

export default function App() {
  const [tela,        setTela]        = useState('login')
  const [usuario,     setUsuario]     = useState(null)
  const [nomeUser,    setNomeUser]    = useState('')
  const [assinatura,  setAssinatura]  = useState(null)
  const [tipoPerfil,  setTipoPerfil]  = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) verificarUsuario(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) verificarUsuario(session.user)
      else { setUsuario(null); setTela('login') }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function verificarUsuario(user) {
    setUsuario(user)
    if (user.email === ADMIN_EMAIL) {
      setTela('admin')
      return
    }
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('nome_completo, perfil_completo, tipo_perfil')
      .eq('email', user.email)
      .single()

    const { data: ass } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('usuario_id', user.id)
      .single()

    setAssinatura(ass)

    if (!ass || !ass.ativo) {
      setTela('planos')
      return
    }
    if (!perfil?.tipo_perfil) {
      setTela('tipoperfil')
      return
    }
    if (!perfil?.perfil_completo || !perfil?.nome_completo) {
      setTipoPerfil(perfil.tipo_perfil)
      setTela('perfil')
      return
    }
    setNomeUser(perfil.nome_completo)
    setTipoPerfil(perfil.tipo_perfil)
    setTela('dashboard')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setTela('login')
    setUsuario(null)
    setNomeUser('')
    setAssinatura(null)
    setTipoPerfil('')
  }

  if (window.location.hash.includes('reset-password') || window.location.hash.includes('type=recovery'))
    return <ResetPassword />

  if (tela === 'login')
    return <>
      <Login
        onLogin={(user) => verificarUsuario(user)}
        onCadastro={() => setTela('cadastro')}
      />
      <CookieBanner />
    </>

  if (tela === 'cadastro')
    return <>
      <Cadastro
        onVoltar={() => setTela('login')}
        onCadastrado={(user) => { setUsuario(user); setTela('planos') }}
      />
      <CookieBanner />
    </>

  if (tela === 'planos')
    return <>
      <Planos
        user={usuario}
        assinatura={assinatura}
        onVoltar={null}
        onPagamentoIniciado={() => setTela('aguardando')}
        onSair={handleLogout}
      />
      <CookieBanner />
    </>

  if (tela === 'aguardando')
    return <Aprovado onContinuar={() => setTela('tipoperfil')} />

  if (tela === 'tipoperfil')
    return <TipoPerfil
      user={usuario}
      onEscolher={(tipo) => { setTipoPerfil(tipo); setTela('perfil') }}
    />

  if (tela === 'perfil')
    return <Perfil
      usuario={usuario}
      tipoPerfil={tipoPerfil}
      onVoltar={() => setTela('tipoperfil')}
      onConcluido={(nome) => { setNomeUser(nome); setTela('dashboard') }}
    />

  if (tela === 'admin')
    return <Admin
      onVoltar={() => setTela('dashboard')}
      onLogout={handleLogout}
    />

  return <>
    <Dashboard
      nomeUsuario={usuario?.email === ADMIN_EMAIL ? 'Marcos Alexandre' : nomeUser}
      onLogout={handleLogout}
      onAdmin={usuario?.email === ADMIN_EMAIL ? () => setTela('admin') : null}
    />
    <CookieBanner />
  </>
}