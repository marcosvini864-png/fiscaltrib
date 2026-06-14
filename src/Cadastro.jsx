import { useState } from 'react'
import { supabase } from './supabase'

const planos = [
  { id: 'essencial', nome: 'Essencial', preco: 'R$ 119/mês', descricao: 'Até 50 clientes' },
  { id: 'avancado',  nome: 'Avançado',  preco: 'R$ 197/mês', descricao: 'Até 200 clientes' },
  { id: 'premium',  nome: 'Premium',   preco: 'R$ 297/mês', descricao: 'Clientes ilimitados' },
]

export default function Cadastro({ onVoltar }) {
  const [nome,  setNome]  = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [plano, setPlano] = useState('essencial')
  const [erro,  setErro]  = useState('')
  const [msg,   setMsg]   = useState('')
  const [load,  setLoad]  = useState(false)

  async function handleCadastro() {
    setErro('')
    setMsg('')

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
      // 1. Cria o usuário no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, plano } }
      })

      if (authError) throw authError

      // 2. Salva dados extras na tabela "usuarios"
      const userId = authData.user?.id
      if (userId) {
        const { error: dbError } = await supabase
          .from('usuarios')
          .insert([{ id: userId, nome, email, plano, ativo: true }])
        if (dbError) console.warn('Aviso tabela usuarios:', dbError.message)
      }

      setMsg('✅ Conta criada! Verifique seu e-mail para confirmar o cadastro.')
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

        <p style={styles.label}>Escolha seu plano:</p>
        <div style={styles.planos}>
          {planos.map(p => (
            <div
              key={p.id}
              style={{ ...styles.planoCard, ...(plano === p.id ? styles.planoSelecionado : {}) }}
              onClick={() => setPlano(p.id)}
            >
              <strong>{p.nome}</strong>
              <span style={styles.preco}>{p.preco}</span>
              <small>{p.descricao}</small>
            </div>
          ))}
        </div>

        {erro && <p style={styles.erro}>{erro}</p>}
        {msg  && <p style={styles.sucesso}>{msg}</p>}

        <button style={styles.btn} onClick={handleCadastro} disabled={load}>
          {load ? 'Criando conta...' : 'Criar Conta'}
        </button>

        <button style={styles.btnVoltar} onClick={onVoltar}>
          ← Voltar ao Login
        </button>
      </div>
    </div>
  )
}

const styles = {
  container:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:            { background: '#1e293b', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  titulo:          { color: '#f0b429', textAlign: 'center', marginBottom: '24px', fontSize: '22px' },
  input:           { width: '100%', padding: '12px', marginBottom: '14px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '15px', boxSizing: 'border-box' },
  label:           { color: '#94a3b8', marginBottom: '10px', fontSize: '14px' },
  planos:          { display: 'flex', gap: '10px', marginBottom: '20px' },
  planoCard:       { flex: 1, background: '#0f172a', border: '2px solid #334155', borderRadius: '8px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', color: '#e2e8f0', fontSize: '13px', textAlign: 'center' },
  planoSelecionado:{ borderColor: '#f0b429', background: '#1a1000' },
  preco:           { color: '#f0b429', fontWeight: 'bold', fontSize: '14px' },
  erro:            { color: '#f87171', fontSize: '13px', marginBottom: '10px' },
  sucesso:         { color: '#4ade80', fontSize: '13px', marginBottom: '10px' },
  btn:             { width: '100%', padding: '13px', background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '12px' },
  btnVoltar:       { width: '100%', padding: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
}
