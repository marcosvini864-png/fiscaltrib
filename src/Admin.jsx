import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ADMIN_EMAIL = 'marcosvini864@gmail.com'
const RESEND_KEY  = 're_6KHHw617_KUbyRecQEHuoEmZBbVCwCvoD'

const planoColor = { essencial: '#3b82f6', avancado: '#8b5cf6', premium: '#f0b429' }
const planoLabel = { essencial: 'Essencial', avancado: 'Avançado', premium: 'Premium' }

function toCSV(rows) {
  if (!rows || rows.length === 0) return 'Sem dados'
  const headers = Object.keys(rows[0])
  const lines   = rows.map(r => headers.map(h => {
    const val = r[h] === null || r[h] === undefined ? '' : String(r[h])
    return `"${val.replace(/"/g, '""')}"`
  }).join(','))
  return [headers.join(','), ...lines].join('\n')
}

export default function Admin({ onVoltar }) {
  const [usuarios,      setUsuarios]      = useState([])
  const [load,          setLoad]          = useState(true)
  const [busca,         setBusca]         = useState('')
  const [filtro,        setFiltro]        = useState('todos')
  const [enviandoBkp,   setEnviandoBkp]   = useState(false)
  const [msgBkp,        setMsgBkp]        = useState('')

  useEffect(() => { carregarUsuarios() }, [])

  async function carregarUsuarios() {
    setLoad(true)
    const { data, error } = await supabase.from('usuarios').select('*').order('id', { ascending: false })
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
    if (!window.confirm('Enviar backup completo do banco para marcosvini864@gmail.com?')) return
    setEnviandoBkp(true)
    setMsgBkp('')
    try {
      const tabelas  = ['clientes','entradas','recuperacoes','assinaturas','usuarios','acompanhamentos','prazos_fiscais']
      const resumo   = []
      const csvParts = []
      const hoje     = new Date().toLocaleDateString('pt-BR')

      for (const tabela of tabelas) {
        const { data, error } = await supabase.from(tabela).select('*')
        const total = data?.length || 0
        resumo.push(`• ${tabela}: ${total} registro(s)${error ? ' ⚠️ ERRO' : ''}`)
        csvParts.push(`===== ${tabela.toUpperCase()} =====\n${toCSV(data || [])}`)
      }

      const csvCompleto = csvParts.join('\n\n')

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
          <div style="background:#0B1F4D;padding:24px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">📦 FiscalTrib — Backup Manual</h1>
            <p style="color:#7CC4FF;margin:8px 0 0;font-size:13px">Gerado em ${hoje} pelo Painel Admin</p>
          </div>
          <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
            <h2 style="color:#0B1F4D;font-size:16px;margin:0 0 12px">📊 Resumo</h2>
            <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #e2e8f0;font-family:monospace;font-size:13px;line-height:1.8">
              ${resumo.join('<br>')}
            </div>
            <h2 style="color:#0B1F4D;font-size:16px;margin:20px 0 12px">📄 Dados completos (CSV)</h2>
            <pre style="font-size:10px;color:#374151;background:#f1f5f9;padding:16px;border-radius:8px;overflow:auto;white-space:pre-wrap">${csvCompleto.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
          </div>
        </div>
      `

      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'FiscalTrib Backup <onboarding@resend.dev>',
          to:      [ADMIN_EMAIL],
          subject: `📦 FiscalTrib — Backup Manual — ${hoje}`,
          html,
        }),
      })

      const result = await res.json()
      if (res.ok) {
        setMsgBkp('✅ Backup enviado com sucesso para ' + ADMIN_EMAIL)
      } else {
        setMsgBkp('⚠️ Erro ao enviar: ' + JSON.stringify(result))
      }
    } catch (e) {
      setMsgBkp('❌ Erro: ' + e.message)
    } finally {
      setEnviandoBkp(false)
    }
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
}