import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Laboratorio from './Laboratorio'

const ADMIN_EMAIL  = 'marcosvini864@gmail.com'
const SUPABASE_URL = 'https://ikodyhxukvclgzydvztu.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2R5aHh1a3ZjbGd6eWR2enR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTU1OTEsImV4cCI6MjA5Njg3MTU5MX0.X_02n8Hy0LaFoZQmLdGwjIA_LixYkMlxeVaMay4rRfg'

const planoColor = { essencial: '#3b82f6', avancado: '#8b5cf6', premium: '#f59e0b' }
const planoLabel = { essencial: 'Essencial', avancado: 'Avançado', premium: 'Premium' }

const MODULOS_EXT = [
  { id: 'dashboard',  label: '📊 Dashboard' },
  { id: 'kanban',     label: '🗂️ Kanban' },
  { id: 'chatbot',    label: '🎧 Chat Bot' },
  { id: 'campanhas',  label: '📣 Campanhas' },
  { id: 'importar',   label: '🔀 Importar' },
  { id: 'link_qr',    label: '🔗 Link/QR' },
  { id: 'lembretes',  label: '⏰ Lembretes' },
  { id: 'webhooks',   label: '⚙️ Webhooks' },
]

const MODULOS_SITE = [
  { id: 'painel',       label: '📊 Painel' },
  { id: 'clientes',     label: '👥 Clientes' },
  { id: 'analise',      label: '🔍 Análise Fiscal' },
  { id: 'recuperacao',  label: '💰 Recuperação' },
  { id: 'prazos',       label: '📅 Prazos' },
  { id: 'relatorios',   label: '📄 Relatórios' },
  { id: 'inteligencia', label: '🧠 Inteligência Tributária' },
  { id: 'divida',       label: '⚖️ Dívida Ativa' },
  { id: 'prospeccao',   label: '🎯 Prospecção' },
  { id: 'mensagens',    label: '⚡ Mensagens Rápidas' },
]

const C = {
  navy: '#0B1F4D', bg: '#E4E7EC', white: '#FFFFFF',
  border: '#C8D0DC', text: '#1E293B', muted: '#64748B',
}

function Toggle({ ativo, onClick, desabilitado }) {
  return (
    <button onClick={onClick} disabled={desabilitado}
      title={ativo ? 'Habilitado (clique para bloquear)' : 'Bloqueado (clique para habilitar)'}
      style={{
        width: 38, height: 20, borderRadius: 20, border: 'none',
        cursor: desabilitado ? 'default' : 'pointer',
        background: ativo ? '#16a34a' : '#cbd5e1',
        position: 'relative', transition: 'background 0.2s', padding: 0,
        opacity: desabilitado ? 0.5 : 1, flexShrink: 0,
      }}>
      <span style={{
        position: 'absolute', top: 2, left: ativo ? 20 : 2, width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
      }} />
    </button>
  )
}

export default function Admin({ onVoltar }) {
  const [usuarios,     setUsuarios]     = useState([])
  const [load,         setLoad]         = useState(true)
  const [busca,        setBusca]        = useState('')
  const [filtro,       setFiltro]       = useState('todos')
  const [enviandoBkp,  setEnviandoBkp]  = useState(false)
  const [msgBkp,       setMsgBkp]       = useState('')
  const [abaAtiva,     setAbaAtiva]     = useState('usuarios')

  const [bonEmail,   setBonEmail]   = useState('')
  const [bonPlano,   setBonPlano]   = useState('avancado')
  const [bonTipo,    setBonTipo]    = useState('prazo')
  const [bonDias,    setBonDias]    = useState('90')
  const [bonLoading, setBonLoading] = useState(false)
  const [bonMsg,     setBonMsg]     = useState('')

  const [sessoes,     setSessoes]     = useState([])
  const [loadSessoes, setLoadSessoes] = useState(false)
  const [abaDesenv,   setAbaDesenv]   = useState('laboratorio')
  const monitorRef = useRef(null)

  const [permissoes,    setPermissoes]    = useState({})
  const [loadPerm,      setLoadPerm]      = useState(true)
  const [buscaPerm,     setBuscaPerm]     = useState('')
  const [salvandoPerm,  setSalvandoPerm]  = useState(null)

  const [permissoesSite,   setPermissoesSite]   = useState({})
  const [loadPermSite,     setLoadPermSite]     = useState(true)
  const [buscaPermSite,    setBuscaPermSite]    = useState('')
  const [salvandoPermSite, setSalvandoPermSite] = useState(null)

  useEffect(() => { carregarUsuarios(); carregarPermissoes(); carregarPermissoesSite() }, [])

  useEffect(() => {
    if (abaAtiva === 'monitor') {
      carregarSessoes()
      monitorRef.current = setInterval(carregarSessoes, 15000)
    } else {
      if (monitorRef.current) clearInterval(monitorRef.current)
    }
    return () => { if (monitorRef.current) clearInterval(monitorRef.current) }
  }, [abaAtiva])

  async function carregarUsuarios() {
    setLoad(true)
    const { data } = await supabase.from('usuarios').select('*').order('id', { ascending: false })
    setUsuarios(data || [])
    setLoad(false)
  }

  async function carregarPermissoes() {
    setLoadPerm(true)
    const { data } = await supabase.from('extensao_permissoes').select('*')
    const mapa = {}
    ;(data || []).forEach(p => { mapa[p.usuario_id] = p })
    setPermissoes(mapa)
    setLoadPerm(false)
  }

  function permissaoDe(usuarioId, campo) {
    const linha = permissoes[usuarioId]
    if (!linha) return true
    return linha[campo] !== false
  }

  async function togglePermissao(usuarioId, campo) {
    const atual = permissoes[usuarioId] || {
      dashboard: true, kanban: true, chatbot: true, campanhas: true,
      importar: true, link_qr: true, lembretes: true, webhooks: true,
    }
    const novo = { ...atual, usuario_id: usuarioId, [campo]: !(atual[campo] !== false) }
    setSalvandoPerm(usuarioId + campo)
    setPermissoes(prev => ({ ...prev, [usuarioId]: novo }))
    await supabase.from('extensao_permissoes').upsert(novo, { onConflict: 'usuario_id' })
    setSalvandoPerm(null)
  }

  async function carregarPermissoesSite() {
    setLoadPermSite(true)
    const { data } = await supabase.from('modulos_permissoes').select('*')
    const mapa = {}
    ;(data || []).forEach(p => { mapa[p.usuario_id] = p })
    setPermissoesSite(mapa)
    setLoadPermSite(false)
  }

  function permissaoSiteDe(usuarioId, campo) {
    const linha = permissoesSite[usuarioId]
    if (!linha) return true
    return linha[campo] !== false
  }

  async function togglePermissaoSite(usuarioId, campo) {
    const atual = permissoesSite[usuarioId] || {
      painel: true, clientes: true, analise: true, recuperacao: true, prazos: true,
      relatorios: true, inteligencia: true, divida: true, prospeccao: true, mensagens: true,
    }
    const novo = { ...atual, usuario_id: usuarioId, [campo]: !(atual[campo] !== false) }
    setSalvandoPermSite(usuarioId + campo)
    setPermissoesSite(prev => ({ ...prev, [usuarioId]: novo }))
    await supabase.from('modulos_permissoes').upsert(novo, { onConflict: 'usuario_id' })
    setSalvandoPermSite(null)
  }

  async function carregarSessoes() {
    setLoadSessoes(true)
    const limite = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data } = await supabase.from('sessoes_ativas').select('*').gte('ultima_atividade', limite).order('ultima_atividade', { ascending: false })
    setSessoes(data || [])
    setLoadSessoes(false)
  }

  function tempoAtras(ts) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (diff < 60) return `${diff}s atrás`
    if (diff < 3600) return `${Math.floor(diff/60)}min atrás`
    return `${Math.floor(diff/3600)}h atrás`
  }

  async function toggleStatus(u) {
    const novoStatus = !u.ativo
    await supabase.from('usuarios').update({ ativo: novoStatus }).eq('id', u.id)
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: novoStatus } : x))
  }

  async function excluirUsuario(u) {
    if (!window.confirm(`Excluir ${u.nome_completo || u.email}? Esta ação não pode ser desfeita.`)) return
    await supabase.from('assinaturas').delete().eq('usuario_id', u.id)
    await supabase.from('entradas').delete().eq('usuario_id', u.id)
    await supabase.from('recuperacoes').delete().eq('usuario_id', u.id)
    await supabase.from('acompanhamentos').delete().eq('usuario_id', u.id)
    await supabase.from('prazos_fiscais').delete().eq('usuario_id', u.id)
    await supabase.from('clientes').delete().eq('usuario_id', u.id)
    await supabase.from('sessoes_ativas').delete().eq('usuario_id', u.id)
    await supabase.from('extensao_permissoes').delete().eq('usuario_id', u.id)
    await supabase.from('modulos_permissoes').delete().eq('usuario_id', u.id)
    await supabase.from('usuarios').delete().eq('id', u.id)
    await supabase.rpc('deletar_usuario', { uid: u.id })
    setUsuarios(prev => prev.filter(x => x.id !== u.id))
  }

  async function enviarBackup() {
    if (!window.confirm('Enviar backup completo do banco para ' + ADMIN_EMAIL + '?')) return
    setEnviandoBkp(true); setMsgBkp('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/backup-semanal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (res.ok && result.success) setMsgBkp('✅ Backup enviado com sucesso para ' + ADMIN_EMAIL)
      else setMsgBkp('⚠️ Erro: ' + JSON.stringify(result))
    } catch (e) { setMsgBkp('❌ Erro: ' + e.message) }
    finally { setEnviandoBkp(false) }
  }

  async function liberarAcesso() {
    if (!bonEmail.trim()) { setBonMsg('❌ Informe o e-mail do cliente.'); return }
    if (bonTipo === 'prazo' && (!bonDias || parseInt(bonDias) < 1)) { setBonMsg('❌ Informe um prazo válido.'); return }
    if (!window.confirm(`Liberar acesso ${bonTipo === 'permanente' ? 'permanente' : `por ${bonDias} dias`} no plano ${planoLabel[bonPlano]} para ${bonEmail}?`)) return
    setBonLoading(true); setBonMsg('')
    try {
      const { data: usuarioEncontrado, error: authError } = await supabase.from('usuarios').select('id, email').eq('email', bonEmail.trim().toLowerCase()).single()
      if (authError || !usuarioEncontrado) { setBonMsg('❌ Usuário não encontrado.'); setBonLoading(false); return }
      const { data: assExiste } = await supabase.from('assinaturas').select('id').eq('usuario_id', usuarioEncontrado.id).single()
      const payload = {
        usuario_id: usuarioEncontrado.id, plano: bonPlano, valor: 0, ativo: true,
        data_inicio: new Date().toISOString().split('T')[0],
        ...(bonTipo === 'prazo' ? { data_fim: new Date(Date.now() + parseInt(bonDias) * 86400000).toISOString().split('T')[0] } : { data_fim: null })
      }
      let error
      if (assExiste) { const { error: e } = await supabase.from('assinaturas').update(payload).eq('id', assExiste.id); error = e }
      else { const { error: e } = await supabase.from('assinaturas').insert([payload]); error = e }
      if (error) setBonMsg('❌ Erro: ' + error.message)
      else { setBonMsg(`✅ Acesso liberado para ${bonEmail}!`); setBonEmail(''); setBonDias('90') }
    } catch (e) { setBonMsg('❌ Erro: ' + e.message) }
    setBonLoading(false)
  }

  const lista = usuarios.filter(u => {
    const termo = busca.toLowerCase()
    const matchBusca = !busca || (u.nome_completo||'').toLowerCase().includes(termo) || (u.email||'').toLowerCase().includes(termo) || (u.cnpj||'').includes(termo)
    const matchFiltro = filtro==='todos' ? true : filtro==='bloqueado' ? !u.ativo : u.plano===filtro
    return matchBusca && matchFiltro
  })

  const listaPerm = usuarios.filter(u => {
    const termo = buscaPerm.toLowerCase()
    return !buscaPerm || (u.nome_completo||'').toLowerCase().includes(termo) || (u.email||'').toLowerCase().includes(termo)
  })

  const listaPermSite = usuarios.filter(u => {
    const termo = buscaPermSite.toLowerCase()
    return !buscaPermSite || (u.nome_completo||'').toLowerCase().includes(termo) || (u.email||'').toLowerCase().includes(termo)
  })

  const total=usuarios.length, ativos=usuarios.filter(u=>u.ativo).length, bloqueados=usuarios.filter(u=>!u.ativo).length
  const essencial=usuarios.filter(u=>u.plano==='essencial').length, avancado=usuarios.filter(u=>u.plano==='avancado').length, premium=usuarios.filter(u=>u.plano==='premium').length

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'24px',fontFamily:'Inter, system-ui, sans-serif'}}>

      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,background:C.white,borderRadius:12,padding:'16px 24px',border:`1px solid ${C.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
        <div>
          <h1 style={{color:C.navy,fontSize:20,fontWeight:700,margin:0}}>⚙️ Painel Admin — FiscalTrib</h1>
          <p style={{color:C.muted,fontSize:13,margin:'4px 0 0'}}>Área exclusiva do administrador</p>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={enviarBackup} disabled={enviandoBkp}
            style={{background:'#f59e0b',border:'none',color:C.white,padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700}}>
            {enviandoBkp?'⏳ Enviando...':'📦 Backup por e-mail'}
          </button>
          <button onClick={onVoltar}
            style={{background:'transparent',border:`1px solid ${C.border}`,color:C.muted,padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13}}>
            ← Voltar ao Sistema
          </button>
        </div>
      </div>

      {msgBkp && (
        <div style={{background:msgBkp.startsWith('✅')?'#f0fdf4':'#fff1f2',border:`1px solid ${msgBkp.startsWith('✅')?'#86efac':'#fecdd3'}`,borderRadius:10,padding:'12px 18px',marginBottom:20,fontSize:14,color:msgBkp.startsWith('✅')?'#16a34a':'#dc2626',fontWeight:600}}>
          {msgBkp}
        </div>
      )}

      {/* CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:12,marginBottom:24}}>
        {[
          {label:'Total de Usuários',valor:total,          cor:'#64748b'},
          {label:'Ativos',           valor:ativos,         cor:'#22c55e'},
          {label:'Bloqueados',       valor:bloqueados,     cor:'#ef4444'},
          {label:'Essencial',        valor:essencial,      cor:'#3b82f6'},
          {label:'Avançado',         valor:avancado,       cor:'#8b5cf6'},
          {label:'Premium',          valor:premium,        cor:'#f59e0b'},
          {label:'Online agora',     valor:sessoes.length, cor:'#10b981'},
        ].map((c,i)=>(
          <div key={i} style={{background:C.white,borderRadius:10,padding:16,display:'flex',flexDirection:'column',gap:4,borderTop:`3px solid ${c.cor}`,border:`1px solid ${C.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <span style={{fontSize:26,fontWeight:700,color:c.cor}}>{c.valor}</span>
            <span style={{color:C.muted,fontSize:12}}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* ABAS PRINCIPAIS */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[
          {key:'usuarios',    label:'👥 Usuários'},
          {key:'bonificacao', label:'🎁 Liberar Acesso Bonificado'},
          {key:'permissoessite', label:'🖥️ Permissões do Sistema'},
          {key:'permissoes',  label:'🧩 Permissões da Extensão'},
          {key:'monitor',     label:'👁️ Monitoramento em Tempo Real'},
          {key:'desenvolvimento', label:'🔬 Centro de Desenvolvimento'},
        ].map(a=>(
          <button key={a.key} onClick={()=>setAbaAtiva(a.key)}
            style={{padding:'7px 16px',borderRadius:20,border:`1px solid ${abaAtiva===a.key?C.navy:C.border}`,background:abaAtiva===a.key?C.navy:'transparent',color:abaAtiva===a.key?C.white:C.muted,cursor:'pointer',fontSize:13,fontWeight:abaAtiva===a.key?600:400}}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA PERMISSÕES DO SISTEMA (SITE) ── */}
      {abaAtiva === 'permissoessite' && (
        <div style={{background:C.white,borderRadius:12,padding:24,marginBottom:24,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:6}}>🖥️ Permissões do Sistema (fiscaltrib.com.br)</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:16}}>
            Controle quais módulos do site cada cliente enxerga. Ex: deixe só "Prospecção" ligado para vender apenas o CRM/Kanban, sem nenhum módulo tributário. Todos os módulos vêm habilitados por padrão.
          </div>
          <input
            style={{width:'100%',maxWidth:400,padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,marginBottom:16,boxSizing:'border-box'}}
            placeholder="🔍 Buscar cliente por nome ou e-mail..." value={buscaPermSite} onChange={e=>setBuscaPermSite(e.target.value)} />

          {(load || loadPermSite) ? (
            <p style={{color:C.muted,textAlign:'center',padding:40}}>Carregando...</p>
          ) : listaPermSite.length === 0 ? (
            <p style={{color:C.muted,textAlign:'center',padding:40}}>Nenhum cliente encontrado.</p>
          ) : (
            <div style={{overflowX:'auto',borderRadius:10,border:`1px solid ${C.border}`}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#F8FAFC'}}>
                    <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>Cliente</th>
                    {MODULOS_SITE.map(m => (
                      <th key={m.id} style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listaPermSite.map(u => (
                    <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 14px',whiteSpace:'nowrap'}}>
                        <div style={{fontWeight:600,color:C.text}}>{u.nome_completo || <em style={{color:C.muted}}>—</em>}</div>
                        <div style={{color:C.muted,fontSize:11}}>{u.email}</div>
                      </td>
                      {MODULOS_SITE.map(m => (
                        <td key={m.id} style={{padding:'10px 10px',textAlign:'center'}}>
                          <Toggle
                            ativo={permissaoSiteDe(u.id, m.id)}
                            desabilitado={salvandoPermSite === u.id + m.id}
                            onClick={() => togglePermissaoSite(u.id, m.id)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA PERMISSÕES DA EXTENSÃO ── */}
      {abaAtiva === 'permissoes' && (
        <div style={{background:C.white,borderRadius:12,padding:24,marginBottom:24,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:6}}>🧩 Permissões da Extensão do WhatsApp</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:16}}>
            Habilite ou bloqueie cada módulo da extensão individualmente por cliente. Todos os módulos vêm habilitados por padrão.
          </div>
          <input
            style={{width:'100%',maxWidth:400,padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,marginBottom:16,boxSizing:'border-box'}}
            placeholder="🔍 Buscar cliente por nome ou e-mail..." value={buscaPerm} onChange={e=>setBuscaPerm(e.target.value)} />

          {(load || loadPerm) ? (
            <p style={{color:C.muted,textAlign:'center',padding:40}}>Carregando...</p>
          ) : listaPerm.length === 0 ? (
            <p style={{color:C.muted,textAlign:'center',padding:40}}>Nenhum cliente encontrado.</p>
          ) : (
            <div style={{overflowX:'auto',borderRadius:10,border:`1px solid ${C.border}`}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#F8FAFC'}}>
                    <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>Cliente</th>
                    {MODULOS_EXT.map(m => (
                      <th key={m.id} style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listaPerm.map(u => (
                    <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 14px',whiteSpace:'nowrap'}}>
                        <div style={{fontWeight:600,color:C.text}}>{u.nome_completo || <em style={{color:C.muted}}>—</em>}</div>
                        <div style={{color:C.muted,fontSize:11}}>{u.email}</div>
                      </td>
                      {MODULOS_EXT.map(m => (
                        <td key={m.id} style={{padding:'10px 10px',textAlign:'center'}}>
                          <Toggle
                            ativo={permissaoDe(u.id, m.id)}
                            desabilitado={salvandoPerm === u.id + m.id}
                            onClick={() => togglePermissao(u.id, m.id)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA MONITORAMENTO ── */}
      {abaAtiva === 'monitor' && (
        <div style={{background:C.white,borderRadius:12,padding:24,marginBottom:24,border:`1px solid ${C.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:'#10b981',marginBottom:4}}>👁️ Usuários Online Agora</div>
              <div style={{fontSize:12,color:C.muted}}>Atualiza a cada 15 segundos. Online = atividade nos últimos 5 minutos.</div>
            </div>
            <button onClick={carregarSessoes} style={{background:'#10b981',border:'none',color:C.white,padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>
              🔄 Atualizar
            </button>
          </div>
          {loadSessoes ? (
            <div style={{textAlign:'center',padding:40,color:C.muted}}>⏳ Carregando...</div>
          ) : sessoes.length === 0 ? (
            <div style={{textAlign:'center',padding:40}}>
              <div style={{fontSize:32,marginBottom:12}}>😴</div>
              <div style={{color:C.muted,fontSize:14}}>Nenhum usuário online no momento.</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {sessoes.map((s2,i)=>(
                <div key={i} style={{background:C.bg,borderRadius:10,padding:'14px 18px',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px #10b981',flexShrink:0}}></div>
                    <div>
                      <div style={{color:C.text,fontWeight:600,fontSize:14}}>{s2.nome||'—'}</div>
                      <div style={{color:C.muted,fontSize:12}}>{s2.email}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    {s2.pagina_atual && (
                      <span style={{background:C.white,color:C.muted,padding:'3px 10px',borderRadius:20,fontSize:11,border:`1px solid ${C.border}`}}>
                        📍 {s2.pagina_atual}
                      </span>
                    )}
                    <span style={{color:'#10b981',fontSize:12,fontWeight:600}}>🟢 {tempoAtras(s2.ultima_atividade)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{marginTop:16,padding:'10px 14px',background:C.bg,borderRadius:8,fontSize:12,color:C.muted,border:`1px solid ${C.border}`}}>
            💡 Usuários aparecem como online por até 5 minutos após a última ação.
          </div>
        </div>
      )}

      {/* ── ABA BONIFICAÇÃO ── */}
      {abaAtiva === 'bonificacao' && (
        <div style={{background:C.white,borderRadius:12,padding:24,marginBottom:24,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:6}}>🎁 Liberar Acesso Bonificado</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:20}}>
            Dê acesso gratuito ao FiscalTrib para clientes de consultoria ou parceiros. O cliente deve criar a conta primeiro em fiscaltrib.com.br.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.muted,marginBottom:6}}>E-mail do cliente *</label>
              <input value={bonEmail} onChange={e=>setBonEmail(e.target.value)} placeholder="cliente@empresa.com.br"
                style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box'}} />
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.muted,marginBottom:6}}>Plano *</label>
              <select value={bonPlano} onChange={e=>setBonPlano(e.target.value)}
                style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box'}}>
                <option value="essencial">Essencial</option>
                <option value="avancado">Avançado</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:C.muted,marginBottom:6}}>Tipo de acesso *</label>
              <select value={bonTipo} onChange={e=>setBonTipo(e.target.value)}
                style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box'}}>
                <option value="prazo">Por prazo (dias)</option>
                <option value="permanente">Permanente</option>
              </select>
            </div>
            {bonTipo === 'prazo' && (
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:C.muted,marginBottom:6}}>Prazo (dias) *</label>
                <input value={bonDias} onChange={e=>setBonDias(e.target.value)} type="number" min="1" placeholder="Ex: 90"
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box'}} />
              </div>
            )}
          </div>
          {bonEmail && (
            <div style={{background:C.bg,borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:C.muted,border:`1px solid ${C.border}`}}>
              📋 <strong style={{color:C.text}}>Resumo:</strong> Plano <strong style={{color:planoColor[bonPlano]}}>{planoLabel[bonPlano]}</strong> {bonTipo==='permanente'?'permanentemente':`por ${bonDias} dias`} para <strong style={{color:C.text}}>{bonEmail}</strong> — <strong style={{color:'#16a34a'}}>R$ 0,00</strong>
            </div>
          )}
          <button onClick={liberarAcesso} disabled={bonLoading}
            style={{background:C.navy,border:'none',color:C.white,padding:'10px 24px',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600}}>
            {bonLoading?'⏳ Liberando...':'🎁 Liberar Acesso'}
          </button>
          {bonMsg && (
            <div style={{marginTop:16,padding:'12px 16px',borderRadius:8,fontSize:13,fontWeight:600,
              background:bonMsg.startsWith('✅')?'#f0fdf4':'#fff1f2',
              color:bonMsg.startsWith('✅')?'#16a34a':'#dc2626',
              border:`1px solid ${bonMsg.startsWith('✅')?'#86efac':'#fecdd3'}`}}>
              {bonMsg}
            </div>
          )}
        </div>
      )}

      {/* ── ABA USUÁRIOS ── */}
      {abaAtiva === 'usuarios' && <>
        <div style={{marginBottom:16}}>
          <input
            style={{width:'100%',padding:'10px 14px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:14,marginBottom:12,boxSizing:'border-box',background:C.white}}
            placeholder="🔍 Buscar por nome, e-mail ou CNPJ..." value={busca} onChange={e=>setBusca(e.target.value)} />
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {['todos','essencial','avancado','premium','bloqueado'].map(f=>(
              <button key={f}
                style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${filtro===f?C.navy:C.border}`,background:filtro===f?C.navy:'transparent',color:filtro===f?C.white:C.muted,cursor:'pointer',fontSize:13,fontWeight:filtro===f?600:400}}
                onClick={()=>setFiltro(f)}>
                {f==='todos'?'Todos':f==='bloqueado'?'🔒 Bloqueados':planoLabel[f]}
              </button>
            ))}
          </div>
        </div>
        {load ? (
          <p style={{color:C.muted,textAlign:'center',padding:40}}>Carregando usuários...</p>
        ) : lista.length === 0 ? (
          <p style={{color:C.muted,textAlign:'center',padding:40}}>Nenhum usuário encontrado.</p>
        ) : (
          <div style={{overflowX:'auto',borderRadius:12,border:`1px solid ${C.border}`,background:C.white}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['Nome','E-mail','Tipo','Plano','CNPJ/CPF','Cidade','Status','Ações'].map(h=>(
                    <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(u=>(
                  <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`,opacity:u.ativo===false?0.6:1}}
                    onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'12px 14px',color:C.text,fontWeight:500}}>{u.nome_completo||<em style={{color:C.muted}}>—</em>}</td>
                    <td style={{padding:'12px 14px',color:C.muted}}>{u.email}</td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{padding:'3px 8px',borderRadius:12,fontSize:12,background:'#F1F5F9',color:C.muted}}>
                        {u.tipo_perfil==='contador'?'👔':u.tipo_perfil==='advogado'?'⚖️':u.tipo_perfil==='pf'?'👤':'—'} {u.tipo_perfil||'—'}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      {u.plano?<span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:planoColor[u.plano]+'18',color:planoColor[u.plano],border:`1px solid ${planoColor[u.plano]}44`}}>{planoLabel[u.plano]||u.plano}</span>:'—'}
                    </td>
                    <td style={{padding:'12px 14px',color:C.muted,fontSize:12}}>{u.cnpj||u.cpf||'—'}</td>
                    <td style={{padding:'12px 14px',color:C.muted,fontSize:12}}>{u.cidade?`${u.cidade}/${u.estado}`:'—'}</td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:u.ativo!==false?'#dcfce7':'#fee2e2',color:u.ativo!==false?'#16a34a':'#dc2626'}}>
                        {u.ativo!==false?'✅ Ativo':'🔒 Bloqueado'}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',gap:6}}>
                        <button style={{border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:14,background:u.ativo!==false?'#fee2e2':'#dcfce7',color:u.ativo!==false?'#dc2626':'#16a34a'}}
                          onClick={()=>toggleStatus(u)} title={u.ativo!==false?'Bloquear':'Desbloquear'}>
                          {u.ativo!==false?'🔒':'🔓'}
                        </button>
                        <button style={{border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:14,background:'#fee2e2',color:'#dc2626'}}
                          onClick={()=>excluirUsuario(u)} title="Excluir">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>}

      {/* ── ABA CENTRO DE DESENVOLVIMENTO ── */}
      {abaAtiva === 'desenvolvimento' && (
        <div>
          {/* Header do Centro */}
          <div style={{background:'linear-gradient(135deg,#0B1F4D,#163B8C)',borderRadius:14,padding:'24px 28px',marginBottom:20,color:'#fff'}}>
            <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:6}}>FISCALTRIB — USO INTERNO</div>
            <h2 style={{fontSize:20,fontWeight:900,marginBottom:4,color:'#fff'}}>🔬 Centro de Desenvolvimento</h2>
            <p style={{fontSize:13,color:'#93c5fd',margin:0}}>Ferramentas internas de teste, homologação e desenvolvimento. Não visível aos usuários do sistema.</p>
          </div>

          {/* Sub-abas do Centro */}
          <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
            {[
              {key:'laboratorio', label:'🧪 Laboratório FiscalTrib'},
              {key:'cenarios',    label:'📚 Base de Cenários'},
              {key:'logs',        label:'📝 Logs de Homologação'},
              {key:'ferramentas', label:'🔧 Ferramentas'},
            ].map(a=>(
              <button key={a.key} onClick={()=>setAbaDesenv(a.key)}
                style={{padding:'8px 18px',borderRadius:20,border:`1px solid ${abaDesenv===a.key?'#0B1F4D':'#e2e8f0'}`,background:abaDesenv===a.key?'#0B1F4D':'#fff',color:abaDesenv===a.key?'#fff':'#64748b',cursor:'pointer',fontSize:13,fontWeight:abaDesenv===a.key?600:400}}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Laboratório */}
          {abaDesenv === 'laboratorio' && <Laboratorio />}

          {/* Base de Cenários */}
          {abaDesenv === 'cenarios' && (
            <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',padding:'28px',textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>📚</div>
              <div style={{fontSize:16,fontWeight:700,color:'#0B1F4D',marginBottom:8}}>Base de Cenários de Homologação</div>
              <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>
                Biblioteca de empresas fictícias completas para teste do FiscalTrib.<br/>
                Importe pelo Laboratório e os cenários ficam registrados aqui.
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,maxWidth:600,margin:'0 auto'}}>
                {[
                  {codigo:'FT-001',nome:'Comércio Varejista',regime:'Simples Nacional',status:'Em breve'},
                  {codigo:'FT-002',nome:'Prestadora de Serviços',regime:'Simples Nacional',status:'Em breve'},
                  {codigo:'FT-003',nome:'Indústria',regime:'Lucro Presumido',status:'Em breve'},
                  {codigo:'FT-004',nome:'Lucro Real',regime:'Lucro Real',status:'Em breve'},
                  {codigo:'FT-005',nome:'Casos com Erros',regime:'Simples Nacional',status:'Em breve'},
                ].map((c,i)=>(
                  <div key={i} style={{background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0',padding:'16px',textAlign:'left'}}>
                    <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,marginBottom:4}}>{c.codigo}</div>
                    <div style={{fontSize:13,fontWeight:700,color:'#0B1F4D',marginBottom:4}}>{c.nome}</div>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>{c.regime}</div>
                    <span style={{background:'#fef9c3',color:'#854d0e',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:700}}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          {abaDesenv === 'logs' && <LogsHomologacao />}

          {/* Ferramentas */}
          {abaDesenv === 'ferramentas' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[
                {icon:'🗑️',titulo:'Limpar banco de testes',desc:'Remove todos os dados importados pelo Laboratório sem afetar usuários reais.',cor:'#dc2626',btn:'Limpar',disabled:false},
                {icon:'📊',titulo:'Relatório de cobertura',desc:'Verifica quais módulos do FiscalTrib foram testados nos cenários importados.',cor:'#2563eb',btn:'Gerar',disabled:true},
                {icon:'🔄',titulo:'Sincronizar layouts CSV',desc:'Atualiza os layouts oficiais dos CSVs sem necessidade de alterar o código.',cor:'#7c3aed',btn:'Sincronizar',disabled:true},
                {icon:'📤',titulo:'Exportar todos os cenários',desc:'Exporta todos os cenários da base em formato ZIP com os CSVs separados.',cor:'#d97706',btn:'Exportar',disabled:true},
              ].map((f,i)=>(
                <div key={i} style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',padding:'20px 24px'}}>
                  <div style={{fontSize:28,marginBottom:10}}>{f.icon}</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#0B1F4D',marginBottom:6}}>{f.titulo}</div>
                  <div style={{fontSize:13,color:'#64748b',marginBottom:16,lineHeight:1.6}}>{f.desc}</div>
                  <button disabled={f.disabled}
                    style={{padding:'8px 20px',background:f.disabled?'#e2e8f0':f.cor,color:f.disabled?'#94a3b8':'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:f.disabled?'default':'pointer'}}>
                    {f.disabled?'Em breve':f.btn}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Logs de Homologação ──────────────────────────────────────────────
function LogsHomologacao() {
  const [logs, setLogs] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('log_importacao').select('*').eq('usuario_id', user.id).order('created_at', { ascending: false }).limit(100)
      setLogs(data || [])
      setCarregando(false)
    }
    carregar()
  }, [])

  if (carregando) return <div style={{textAlign:'center',padding:40,color:'#64748b'}}>⏳ Carregando logs...</div>

  if (logs.length === 0) return (
    <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',padding:48,textAlign:'center',color:'#94a3b8'}}>
      <div style={{fontSize:40,marginBottom:12}}>📝</div>
      <div style={{fontSize:15,fontWeight:600}}>Nenhum log registrado ainda</div>
      <div style={{fontSize:13,marginTop:8}}>Os logs aparecem após a primeira importação no Laboratório</div>
    </div>
  )

  const totalImportados = logs.reduce((s,l)=>s+(l.importados||0),0)
  const totalRejeitados = logs.reduce((s,l)=>s+(l.rejeitados||0),0)

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:'Total de logs',    valor:logs.length,                        cor:'#0B1F4D'},
          {label:'Total importados', valor:totalImportados.toLocaleString('pt-BR'), cor:'#16a34a'},
          {label:'Total rejeitados', valor:totalRejeitados.toLocaleString('pt-BR'), cor:'#dc2626'},
          {label:'Último import',    valor:logs[0]?new Date(logs[0].created_at).toLocaleDateString('pt-BR'):'—', cor:'#7c3aed'},
        ].map((c,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:10,border:'2px solid #e2e8f0',padding:'14px 16px'}}>
            <div style={{fontSize:18,fontWeight:800,color:c.cor}}>{c.valor}</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:3}}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #e2e8f0',fontSize:13,fontWeight:700,color:'#0B1F4D'}}>
          📝 Logs de homologação (últimos 100)
        </div>
        <div style={{maxHeight:500,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f8fafc',position:'sticky',top:0}}>
                {['Data/Hora','Arquivo','Tabela','Importados','Rejeitados','Tempo'].map(h=>(
                  <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:'#64748b',borderBottom:'1px solid #e2e8f0'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'9px 14px',color:'#64748b'}}>{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td style={{padding:'9px 14px',fontWeight:600,color:'#0B1F4D'}}>{l.arquivo}</td>
                  <td style={{padding:'9px 14px',color:'#64748b'}}>{l.tabela}</td>
                  <td style={{padding:'9px 14px',color:'#16a34a',fontWeight:700}}>{(l.importados||0).toLocaleString('pt-BR')}</td>
                  <td style={{padding:'9px 14px',color:l.rejeitados>0?'#dc2626':'#94a3b8',fontWeight:l.rejeitados>0?700:400}}>{(l.rejeitados||0).toLocaleString('pt-BR')}</td>
                  <td style={{padding:'9px 14px',color:'#64748b'}}>{l.tempo_ms?`${l.tempo_ms}ms`:'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}