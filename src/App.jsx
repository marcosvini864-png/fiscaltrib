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

const ADMIN_EMAIL = 'marcosvini864@gmail.com'

export default function App() {
  const [tela,      setTela]      = useState('login')
  const [usuario,   setUsuario]   = useState(null)
  const [nomeUser,  setNomeUser]  = useState('')
  const [assinatura, setAssinatura] = useState(null)

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

    // Admin vai direto
    if (user.email === ADMIN_EMAIL) {
      setTela('admin')
      return
    }

    // Busca perfil
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('nome_completo, perfil_completo')
      .eq('email', user.email)
      .single()

    // Busca assinatura
    const { data: ass } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('usuario_id', user.id)
      .single()

    setAssinatura(ass)

    // Sem assinatura ativa → vai para Planos
    if (!ass || !ass.ativo) {
      setTela('planos')
      return
    }

    // Com assinatura ativa mas perfil incompleto → vai para Perfil
    if (!perfil?.perfil_completo || !perfil?.nome_completo) {
      setTela('perfil')
      return
    }

    // Tudo ok → Dashboard
    setNomeUser(perfil.nome_completo)
    setTela('dashboard')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setTela('login')
    setUsuario(null)
    setNomeUser('')
    setAssinatura(null)
  }

  // Tela 1 — Login
  if (tela === 'login')
    return <Login
      onLogin={(user) => verificarUsuario(user)}
      onCadastro={() => setTela('cadastro')}
    />

  // Tela 2 — Criar Conta
  if (tela === 'cadastro')
    return <Cadastro
      onVoltar={() => setTela('login')}
      onCadastrado={(user) => { setUsuario(user); setTela('planos') }}
    />

  // Tela 3 — Escolher Plano
  if (tela === 'planos')
    return <Planos
      user={usuario}
      assinatura={assinatura}
      onVoltar={null}
      onPagamentoIniciado={() => setTela('aguardando')}
    />

  // Tela 4/5 — Aguardando/Aprovado
  if (tela === 'aguardando')
    return <Aprovado
      onContinuar={() => setTela('tipoperfil')}
    />

  // Tela 6 — Tipo de Perfil
  if (tela === 'tipoperfil')
    return <TipoPerfil
      onEscolher={(tipo) => { setTela('perfil') }}
    />

  // Tela 7 — Completar Perfil
  if (tela === 'perfil')
    return <Perfil
      usuario={usuario}
      onConcluido={(nome) => { setNomeUser(nome); setTela('dashboard') }}
    />

  // Admin
  if (tela === 'admin')
    return <Admin
      onVoltar={() => setTela('dashboard')}
      onLogout={handleLogout}
    />

  // Tela 8 — Dashboard
  return <Dashboard
    nomeUsuario={usuario?.email === ADMIN_EMAIL ? 'Marcos Alexandre' : nomeUser}
    onLogout={handleLogout}
    onAdmin={usuario?.email === ADMIN_EMAIL ? () => setTela('admin') : null}
  />
}