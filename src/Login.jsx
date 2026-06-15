import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin, onCadastro }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); return }
    onLogin(data.user)
  }

  return (
    <div style={{minHeight:'100vh',background:'#1e3a5f',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:16,padding:40,width:380,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <h1 style={{textAlign:'center',color:'#1e3a5f',marginBottom:24}}>FiscalTrib</h1>
        {erro && <p style={{color:'red',marginBottom:12}}>{erro}</p>}
        <input style={{width:'100%',padding:10,marginBottom:12,border:'1px solid #ccc',borderRadius:8,boxSizing:'border-box',fontSize:14}} type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} />
        <input style={{width:'100%',padding:10,marginBottom:16,border:'1px solid #ccc',borderRadius:8,boxSizing:'border-box',fontSize:14}} type="password" placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} />
        <button style={{width:'100%',padding:12,background:'#1e3a5f',color:'#fff',border:'none',borderRadius:8,fontSize:15,cursor:'pointer',marginBottom:12}} onClick={handleLogin}>Entrar</button>
        <button style={{width:'100%',padding:12,background:'transparent',color:'#1e3a5f',border:'2px solid #1e3a5f',borderRadius:8,fontSize:15,cursor:'pointer'}} onClick={onCadastro}>Criar nova conta</button>
      </div>
    </div>
  )
}