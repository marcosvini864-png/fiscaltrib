import { useState } from 'react'
import { supabase } from './supabase'

function maskTel(v) {
  v = v.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}
function maskCNPJ(v) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
function maskCPF(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
function maskCEP(v) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{1,3})/, '$1-$2')
}

export default function Perfil({ usuario, tipoPerfil, onConcluido, onVoltar }) {
  const tipo = tipoPerfil || ''
  const [erro,     setErro]     = useState('')
  const [load,     setLoad]     = useState(false)

  // Campos comuns
  const [nome,     setNome]     = useState('')
  const [telefone, setTelefone] = useState('')
  const [cep,      setCep]      = useState('')
  const [rua,      setRua]      = useState('')
  const [numero,   setNumero]   = useState('')
  const [bairro,   setBairro]   = useState('')
  const [cidade,   setCidade]   = useState('')
  const [estado,   setEstado]   = useState('')

  // Contador
  const [escritorio, setEscritorio] = useState('')
  const [cnpj,       setCnpj]       = useState('')
  const [crc,        setCrc]        = useState('')

  // Advogado
  const [sociedade, setSociedade] = useState('')
  const [cnpjAdv,   setCnpjAdv]   = useState('')
  const [oab,       setOab]       = useState('')
  const [oabUF,     setOabUF]     = useState('')

  // PF / Empresário
  const [cpf,         setCpf]         = useState('')
  const [empresa,     setEmpresa]     = useState('')
  const [cnpjEmpresa, setCnpjEmpresa] = useState('')

  async function buscarCep(v) {
    const masked = maskCEP(v)
    setCep(masked)
    if (masked.replace(/\D/g, '').length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${masked.replace(/\D/g, '')}/json/`)
        const d = await r.json()
        if (!d.erro) {
          setRua(d.logradouro || '')
          setBairro(d.bairro || '')
          setCidade(d.localidade || '')
          setEstado(d.uf || '')
        }
      } catch {}
    }
  }

  async function handleSalvar() {
    setErro('')
    if (!nome.trim() || !telefone.trim()) {
      setErro('Preencha pelo menos nome e telefone.')
      return
    }
    setLoad(true)
    try {
      const dados = {
        tipo_perfil: tipo,
        nome_completo: nome,
        telefone,
        cep, rua, numero, bairro, cidade, estado,
        perfil_completo: true,
        ...(tipo === 'contador'   && { nome_escritorio: escritorio, cnpj, crc }),
        ...(tipo === 'advogado'   && { nome_sociedade: sociedade, cnpj: cnpjAdv, oab, oab_uf: oabUF }),
        ...(tipo === 'empresario' && { cpf, nome_empresa: empresa, cnpj: cnpjEmpresa }),
      }

      const { error } = await supabase
        .from('usuarios')
        .update(dados)
        .eq('email', usuario.email)

      if (error) throw error
      onConcluido(nome)
    } catch (e) {
      setErro(e.message || 'Erro ao salvar perfil.')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={{ ...s.card, maxWidth: '540px' }}>
        <h2 style={s.titulo}>Complete seu Perfil</h2>

        <p style={s.secao}>📋 Dados Pessoais</p>
        <input style={s.input} placeholder="Nome completo *" value={nome} onChange={e => setNome(e.target.value)} />
        <input style={s.input} placeholder="WhatsApp / Telefone * ex: (11) 99999-9999" value={telefone}
          onChange={e => setTelefone(maskTel(e.target.value))} />

        {tipo === 'contador' && <>
          <p style={s.secao}>🏢 Dados do Escritório</p>
          <input style={s.input} placeholder="Nome do escritório" value={escritorio} onChange={e => setEscritorio(e.target.value)} />
          <input style={s.input} placeholder="CNPJ ex: 00.000.000/0001-00" value={cnpj}
            onChange={e => setCnpj(maskCNPJ(e.target.value))} />
          <input style={s.input} placeholder="CRC ex: SP-123456/O-5" value={crc} onChange={e => setCrc(e.target.value)} />
        </>}

        {tipo === 'advogado' && <>
          <p style={s.secao}>⚖️ Dados Profissionais</p>
          <input style={s.input} placeholder="Nome da sociedade / escritório" value={sociedade} onChange={e => setSociedade(e.target.value)} />
          <input style={s.input} placeholder="CNPJ (opcional) ex: 00.000.000/0001-00" value={cnpjAdv}
            onChange={e => setCnpjAdv(maskCNPJ(e.target.value))} />
          <div style={s.row}>
            <input style={{ ...s.input, flex: 2 }} placeholder="Número OAB" value={oab} onChange={e => setOab(e.target.value)} />
            <input style={{ ...s.input, flex: 1 }} placeholder="UF ex: SP" value={oabUF} onChange={e => setOabUF(e.target.value)} maxLength={2} />
          </div>
        </>}

        {tipo === 'empresario' && <>
          <p style={s.secao}>👤 Dados Complementares</p>
          <input style={s.input} placeholder="CPF ex: 000.000.000-00" value={cpf}
            onChange={e => setCpf(maskCPF(e.target.value))} />
          <input style={s.input} placeholder="Nome da empresa (opcional)" value={empresa} onChange={e => setEmpresa(e.target.value)} />
          <input style={s.input} placeholder="CNPJ da empresa (opcional)" value={cnpjEmpresa}
            onChange={e => setCnpjEmpresa(maskCNPJ(e.target.value))} />
        </>}

        <p style={s.secao}>📍 Endereço</p>
        <input style={s.input} placeholder="CEP ex: 00000-000" value={cep} onChange={e => buscarCep(e.target.value)} />
        <input style={s.input} placeholder="Rua / Logradouro" value={rua} onChange={e => setRua(e.target.value)} />
        <div style={s.row}>
          <input style={{ ...s.input, flex: 1 }} placeholder="Número" value={numero} onChange={e => setNumero(e.target.value)} />
          <input style={{ ...s.input, flex: 2 }} placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
        </div>
        <div style={s.row}>
          <input style={{ ...s.input, flex: 2 }} placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
          <input style={{ ...s.input, flex: 1 }} placeholder="UF" value={estado} onChange={e => setEstado(e.target.value)} maxLength={2} />
        </div>

        {erro && <p style={s.erro}>{erro}</p>}

        <button style={s.btn} onClick={handleSalvar} disabled={load}>
          {load ? 'Salvando...' : '✅ Salvar e Entrar no Sistema'}
        </button>
        {onVoltar && (
          <button style={s.btnVoltar} onClick={onVoltar}>← Voltar</button>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:      { background: '#1e293b', borderRadius: '12px', padding: '36px', width: '100%', maxWidth: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  titulo:    { color: '#f0b429', textAlign: 'center', marginBottom: '8px', fontSize: '22px' },
  secao:     { color: '#f0b429', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', marginTop: '16px', borderBottom: '1px solid #334155', paddingBottom: '6px' },
  input:     { width: '100%', padding: '11px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box' },
  row:       { display: 'flex', gap: '10px' },
  erro:      { color: '#f87171', fontSize: '13px', marginBottom: '10px' },
  btn:       { width: '100%', padding: '13px', background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginBottom: '10px' },
  btnVoltar: { width: '100%', padding: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
}