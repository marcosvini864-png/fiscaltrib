import { useState } from 'react'
import { supabase } from './supabase'

export default function Cadastro({ onVoltar, onCadastrado }) {
  const [nome,  setNome]  = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro,  setErro]  = useState('')
  const [load,  setLoad]  = useState(false)

  async function handleCadastro() {
    setErro('')

    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setErro('Preencha todos os campos.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoad(true)
    try {
      // Cria a conta
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } }
      })

      if (authError) throw authError

      // Faz login imediato após cadastro
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

      onCadastrado(loginData.user)

    } catch (e) {
      setErro(e.message || 'Erro ao criar conta.')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.titulo}>Criar Conta — FiscalTrib</h2>

        <input
          style={styles.input}
          placeholder="Seu nome completo"
          value={nome}
          onChange={e => setNome(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="E-mail"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Senha (mín. 6 caracteres)"
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
        />

        {erro && <p style={styles.erro}>{erro}</p>}

        <button style={styles.btn} onClick={handleCadastro} disabled={load}>
          {load ? 'Criando conta...' : 'Continuar →'}
        </button>

        <button style={styles.btnVoltar} onClick={onVoltar}>
          ← Voltar ao Login
        </button>
      </div>
    </div>
  )
}

const styles = {
  container:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:       { background: '#1e293b', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  titulo:     { color: '#f0b429', textAlign: 'center', marginBottom: '24px', fontSize: '22px' },
  input:      { width: '100%', padding: '12px', marginBottom: '14px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '15px', boxSizing: 'border-box' },
  erro:       { color: '#f87171', fontSize: '13px', marginBottom: '10px' },
  btn:        { width: '100%', padding: '13px', background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '12px' },
  btnVoltar:  { width: '100%', padding: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
}