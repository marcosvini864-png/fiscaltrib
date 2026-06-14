import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Cadastro from './Cadastro'
import Perfil from './Perfil'
import Dashboard from './Dashboard'
import Admin from './Admin'

const ADMIN_EMAIL = 'marcosvini864@gmail.com'

export default function App() {
  const [tela,     setTela]     = useState('login')
  const [usuario,  setUsuario]  = useState(null)
  const [nomeUser, setNomeUser] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) verificarPerfil(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) verificarPerfil(session.user)
      else { setUsuario(null); setTela('login') }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function verificarPerfil(user) {
    setUsuario(user)

    // Admin vai direto para o painel
    if (user.email === ADMIN_EMAIL) {
      setTela('admin')
      return
    }

    const { data } = await supabase
      .from('usuarios')
      .select('nome_completo, perfil_completo')
      .eq('email', user.email)
      .single()

    if (data?.perfil_completo && data?.nome_completo) {
      setNomeUser(data.nome_completo)
      setTela('dashboard')
    } else {
      setTela('perfil')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setTela('login')
    setUsuario(null)
    setNomeUser('')
  }

  if (tela === 'cadastro')  return <Cadastro onVoltar={() => setTela('login')} />
  if (tela === 'perfil')    return <Perfil usuario={usuario} onConcluido={(nome) => { setNomeUser(nome); setTela('dashboard') }} />
  if (tela === 'admin')     return <Admin onVoltar={() => setTela('dashboard')} onLogout={handleLogout} />
  if (tela === 'dashboard') return <Dashboard nomeUsuario={nomeUser} onLogout={handleLogout} onAdmin={usuario?.email === ADMIN_EMAIL ? () => setTela('admin') : null} />

  return <Login onLogin={() => {}} onCadastro={() => setTela('cadastro')} />
}