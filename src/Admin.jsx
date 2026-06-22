import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ADMIN_EMAIL  = 'marcosvini864@gmail.com'
const SUPABASE_URL = 'https://ikodyhxukvclgzydvztu.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2R5aHh1a3ZjbGd6eWR2enR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTU1OTEsImV4cCI6MjA5Njg3MTU5MX0.X_02n8Hy0LaFoZQmLdGwjIA_LixYkMlxeVaMay4rRfg'

const planoColor = { essencial: '#3b82f6', avancado: '#8b5cf6', premium: '#f0b429' }
const planoLabel = { essencial: 'Essencial', avancado: 'Avançado', premium: 'Premium' }

export default function Admin({ onVoltar }) {
  const [usuarios,     setUsuarios]     = useState([])
  const [load,         setLoad]         = useState(true)
  const [busca,        setBusca]        = useState('')
  const [filtro,       setFiltro]       = useState('todos')
  const [enviandoBkp,  setEnviandoBkp]  = useState(false)
  const [msgBkp,       setMsgBkp]       = useState('')
  const [abaAtiva,     setAbaAtiva]     = useState('usuarios') // 'usuarios' | 'bonificacao'

  // Bonificação
  const [bonEmail,     setBonEmail]     = useState('')
  const [bonPlano,     setBonPlano]     = useState('avancado')
  const [bonTipo,      setBonTipo]      = useState('prazo') // 'prazo' | 'permanente'
  const [bonDias,      setBonDias]      = useState('90')
  const [bonLoading,   setBonLoading]   = useState(false)
  const [bonMsg,       setBonMsg]       = useState('')

  useEffect(() => { carregarUsuarios() }, [])

  async function carregarUsuarios() {
    setLoad(true)
    const { data } = await supabase.from('usuarios').select('*').order('id', { ascending: false })
    setUsuarios(data || [])
    setLoad(false)
  }

  async function toggleStatus(u) {
    const novoStatus = !u.ativo
    await supabase.from('usuarios').update({ ativo: novoStatus }).eq('id', u.id)
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: novoStatus } : x))
  }

  async function excluirUsuario(u) {
    if (!window.confirm(`Excluir ${u.nome_completo || u.email}? Esta ação não pode ser desfeita.`)) return
    await supabase.from('usuarios').delete().eq('id', u.id)
    setUsuarios(prev => prev.filter(x => x.id !== u.id))
  }

  async function enviarBackup() {
    if (!window.confirm('Enviar backup completo do banco para ' + ADMIN_EMAIL + '?')) return
    setEnviandoBkp(true)
    setMsgBkp('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/backup-semanal`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey':        SUPABASE_ANON,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        setMsgBkp('✅ Backup enviado com sucesso para ' + ADMIN_EMAIL)
      } else {
        setMsgBkp('⚠️ Erro: ' + JSON.stringify(result))
      }
    } catch (e) {
      setMsgBkp('❌ Erro: ' + e.message)
    } finally {
      setEnviandoBkp(false)
    }
  }

  async function liberarAcesso() {
    if (!bonEmail.trim()) { setBonMsg('❌ Informe o e-mail do cliente.'); return }
    if (bonTipo === 'prazo' && (!bonDias || parseInt(bonDias) < 1)) { setBonMsg('❌ Informe um prazo válido.'); return }
    if (!window.confirm(`Liberar acesso ${bonTipo === 'permanente' ? 'permanente' : `por ${bonDias} dias`} no plano ${planoLabel[bonPlano]} para ${bonEmail}?`)) return

    setBonLoading(true)
    setBonMsg('')

    try {
      // Buscar o usuário pelo e-mail na tabela auth.users via RPC ou direto
      const { data: authUsers, error: authError } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', bonEmail.trim().toLowerCase())
        .single()

      if (authError || !authUsers) {
        setBonMsg('❌ Usuário não encontrado. O cliente precisa criar a conta primeiro em fiscaltrib.com.br')
        setBonLoading(false)
        return
      }

      // Verificar se já tem assinatura
      const { data: assExiste } = await supabase
        .from('assinaturas')
        .select('id')
        .eq('usuario_id', authUsers.id)
        .single()

      const payload = {
        usuario_id:  authUsers.id,
        plano:       bonPlano,
        valor:       0,
        ativo:       true,
        data_inicio: new Date().toISOString().split('T')[0],
        ...(bonTipo === 'prazo' ? {
          data_fim: new Date(Date.now() + parseInt(bonDias) * 86400000).toISOString().split('T')[0]
        } : {})
      }

      let error
      if (assExiste) {
        // Atualizar assinatura existente
        const { error: updErr } = await supabase
          .from('assinaturas')
          .update(payload)
          .eq('id', assExiste.id)
        error = updErr
      } else {
        // Criar nova assinatura
        const { error: insErr } = await supabase
          .from('assinaturas')
          .insert([payload])
        error = insErr
      }

      if (error) {
        setBonMsg('❌ Erro ao liberar acesso: ' + error.message)
      } else {
        setBonMsg(`✅ Acesso ${bonTipo === 'permanente' ? 'permanente' : `por ${bonDias} dias`} liberado no plano ${planoLabel[bonPlano]} para ${bonEmail}!`)
        setBonEmail('')
        setBonDias('90')
      }
    } catch (e) {
      setBonMsg('❌ Erro: ' + e.message)
    }
    setBonLoading(false)
  }

  const lista = usuarios.filter(u => {
    const termo = busca.toLowerCase()
    const matchBusca = !busca ||
      (u.nome_completo || '').toLowerCase().includes(termo) ||
      (u.email || '').toLowerCase().includes(termo) ||
      (u.cnpj || '').includes(termo)
    const matchFiltro =
      filtro === 'todos' ? true :
      filtro === 'bloqueado' ? !u.ativo :
      u.plano === filtro
    return matchBusca && matchFiltro
  })

  const total      = usuarios.length
  const ativos     = usuarios.filter(u => u.ativo).length
  const bloqueados = usuarios.filter(u => !u.ativo).length
  const essencial  = usuarios.filter(u => u.plano === 'essencial').length
  const avancado   = usuarios.filter(u => u.plano === 'avancado').length
  const premium    = usuarios.filter(u => u.plano === 'premium').length

  return (
    <div style={s.container}>

      {/* HEADER */}
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>⚙️ Painel Admin — FiscalTrib</h1>
          <p style={s.sub}>Área exclusiva do administrador</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button style={s.btnBackup} onClick={enviarBackup} disabled={enviandoBkp}>
            {enviandoBkp ? '⏳ Enviando...' : '📦 Backup por e-mail'}
          </button>
          <button style={s.btnVoltar} onClick={onVoltar}>← Voltar ao Sistema</button>
        </div>
      </div>

      {/* MENSAGEM BACKUP */}
      {msgBkp && (
        <div style={{ background: msgBkp.startsWith('✅') ? '#f0fdf4' : '#fff1f2', border: `1px solid ${msgBkp.startsWith('✅') ? '#86efac' : '#fecdd3'}`, borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 14, color: msgBkp.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
          {msgBkp}
        </div>
      )}

      {/* CARDS RESUMO */}
      <div style={s.cards}>
        {[
          { label: 'Total de Usuários', valor: total,      cor: '#64748b' },
          { label: 'Ativos',            valor: ativos,     cor: '#22c55e' },
          { label: 'Bloqueados',        valor: bloqueados, cor: '#ef4444' },
          { label: 'Essencial',         valor: essencial,  cor: '#3b82f6' },
          { label: 'Avançado',          valor: avancado,   cor: '#8b5cf6' },
          { label: 'Premium',           valor: premium,    cor: '#f0b429' },
        ].map((c, i) => (
          <div key={i} style={{ ...s.card, borderTop: `3px solid ${c.cor}` }}>
            <span style={{ ...s.cardVal, color: c.cor }}>{c.valor}</span>
            <span style={s.cardLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setAbaAtiva('usuarios')}
          style={{ ...s.tab, ...(abaAtiva === 'usuarios' ? s.tabAtivo : {}) }}>
          👥 Usuários
        </button>
        <button onClick={() => setAbaAtiva('bonificacao')}
          style={{ ...s.tab, ...(abaAtiva === 'bonificacao' ? s.tabAtivo : {}) }}>
          🎁 Liberar Acesso Bonificado
        </button>
      </div>

      {/* ABA BONIFICAÇÃO */}
      {abaAtiva === 'bonificacao' && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 28, marginBottom: 24, border: '1px solid #334155' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f0b429', marginBottom: 6 }}>🎁 Liberar Acesso Bonificado</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
            Dê acesso gratuito ao FiscalTrib para clientes de consultoria ou parceiros. O cliente deve criar a conta primeiro em fiscaltrib.com.br.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>E-mail do cliente *</label>
              <input value={bonEmail} onChange={e => setBonEmail(e.target.value)}
                placeholder="cliente@empresa.com.br"
                style={s.input} />
            </div>
            <div>
              <label style={s.label}>Plano *</label>
              <select value={bonPlano} onChange={e => setBonPlano(e.target.value)} style={s.input}>
                <option value="essencial">Essencial</option>
                <option value="avancado">Avançado</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Tipo de acesso *</label>
              <select value={bonTipo} onChange={e => setBonTipo(e.target.value)} style={s.input}>
                <option value="prazo">Por prazo (dias)</option>
                <option value="permanente">Permanente (sem data de fim)</option>
              </select>
            </div>
            {bonTipo === 'prazo' && (
              <div>
                <label style={s.label}>Prazo (dias) *</label>
                <input value={bonDias} onChange={e => setBonDias(e.target.value)}
                  type="number" min="1" placeholder="Ex: 90"
                  style={s.input} />
              </div>
            )}
          </div>

          {/* Preview */}
          {bonEmail && (
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#94a3b8', border: '1px solid #334155' }}>
              📋 <strong style={{ color: '#e2e8f0' }}>Resumo:</strong> Liberar plano <strong style={{ color: planoColor[bonPlano] }}>{planoLabel[bonPlano]}</strong> {bonTipo === 'permanente' ? 'permanentemente' : `por ${bonDias} dias`} para <strong style={{ color: '#e2e8f0' }}>{bonEmail}</strong> — valor cobrado: <strong style={{ color: '#22c55e' }}>R$ 0,00</strong>
            </div>
          )}

          <button onClick={liberarAcesso} disabled={bonLoading}
            style={{ background: '#f0b429', border: 'none', color: '#0f172a', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            {bonLoading ? '⏳ Liberando...' : '🎁 Liberar Acesso'}
          </button>

          {bonMsg && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: bonMsg.startsWith('✅') ? '#f0fdf4' : '#fff1f2',
              color: bonMsg.startsWith('✅') ? '#16a34a' : '#dc2626',
              border: `1px solid ${bonMsg.startsWith('✅') ? '#86efac' : '#fecdd3'}` }}>
              {bonMsg}
            </div>
          )}
        </div>
      )}

      {/* ABA USUÁRIOS */}
      {abaAtiva === 'usuarios' && <>
        {/* FILTROS */}
        <div style={s.filtros}>
          <input style={s.busca} placeholder="🔍 Buscar por nome, e-mail ou CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} />
          <div style={s.tabs}>
            {['todos','essencial','avancado','premium','bloqueado'].map(f => (
              <button key={f} style={{ ...s.tab, ...(filtro === f ? s.tabAtivo : {}) }} onClick={() => setFiltro(f)}>
                {f === 'todos' ? 'Todos' : f === 'bloqueado' ? '🔒 Bloqueados' : planoLabel[f]}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        {load ? (
          <p style={s.loadTxt}>Carregando usuários...</p>
        ) : lista.length === 0 ? (
          <p style={s.loadTxt}>Nenhum usuário encontrado.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Nome','E-mail','Tipo','Plano','CNPJ/CPF','Cidade','Status','Ações'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(u => (
                  <tr key={u.id} style={{ ...s.tr, opacity: u.ativo === false ? 0.6 : 1 }}>
                    <td style={s.td}>{u.nome_completo || <em style={{color:'#64748b'}}>—</em>}</td>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}>
                      <span style={s.badge}>
                        {u.tipo_perfil === 'contador' ? '👔' : u.tipo_perfil === 'advogado' ? '⚖️' : u.tipo_perfil === 'pf' ? '👤' : '—'}
                        {' '}{u.tipo_perfil || '—'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {u.plano ? (
                        <span style={{ ...s.badge, background: planoColor[u.plano] + '22', color: planoColor[u.plano], border: `1px solid ${planoColor[u.plano]}` }}>
                          {planoLabel[u.plano] || u.plano}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={s.td}>{u.cnpj || u.cpf || '—'}</td>
                    <td style={s.td}>{u.cidade ? `${u.cidade}/${u.estado}` : '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: u.ativo !== false ? '#16a34a22' : '#ef444422', color: u.ativo !== false ? '#22c55e' : '#ef4444', border: `1px solid ${u.ativo !== false ? '#22c55e' : '#ef4444'}` }}>
                        {u.ativo !== false ? '✅ Ativo' : '🔒 Bloqueado'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.acoes}>
                        <button
                          style={{ ...s.btnAcao, background: u.ativo !== false ? '#ef444422' : '#16a34a22', color: u.ativo !== false ? '#ef4444' : '#22c55e' }}
                          onClick={() => toggleStatus(u)}
                          title={u.ativo !== false ? 'Bloquear' : 'Desbloquear'}
                        >
                          {u.ativo !== false ? '🔒' : '🔓'}
                        </button>
                        <button style={{ ...s.btnAcao, background: '#ef444422', color: '#ef4444' }} onClick={() => excluirUsuario(u)} title="Excluir">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>}
    </div>
  )
}

const s = {
  container:  { minHeight: '100vh', background: '#0f172a', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  titulo:     { color: '#f0b429', fontSize: '22px', fontWeight: 700, margin: 0 },
  sub:        { color: '#64748b', fontSize: '13px', margin: '4px 0 0' },
  btnVoltar:  { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  btnBackup:  { background: '#f0b429', border: 'none', color: '#0f172a', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
  cards:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' },
  card:       { background: '#1e293b', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  cardVal:    { fontSize: '28px', fontWeight: 700 },
  cardLabel:  { color: '#94a3b8', fontSize: '12px' },
  filtros:    { marginBottom: '16px' },
  busca:      { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' },
  tabs:       { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab:        { padding: '6px 14px', borderRadius: '20px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' },
  tabAtivo:   { background: '#f0b429', color: '#0f172a', border: '1px solid #f0b429', fontWeight: 600 },
  loadTxt:    { color: '#64748b', textAlign: 'center', padding: '40px' },
  tableWrap:  { overflowX: 'auto', borderRadius: '10px', border: '1px solid #1e293b' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:         { background: '#1e293b', color: '#94a3b8', padding: '12px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid #1e293b' },
  td:         { padding: '12px 14px', color: '#e2e8f0', verticalAlign: 'middle' },
  badge:      { padding: '3px 8px', borderRadius: '12px', fontSize: '12px', background: '#334155', color: '#94a3b8' },
  acoes:      { display: 'flex', gap: '6px' },
  btnAcao:    { border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '15px' },
  label:      { display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: 6 },
  input:      { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '13px', boxSizing: 'border-box' },
}