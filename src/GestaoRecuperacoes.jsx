import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── PIPELINE DOS 6 STATUS ───────────────────────────────────────────────────
const STATUS_PIPELINE = [
  { id: 'Identificado',  emoji: '🔍', cor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', desc: 'Oportunidade identificada no diagnóstico' },
  { id: 'Em Análise',    emoji: '🔎', cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Análise técnica em andamento' },
  { id: 'Documentação',  emoji: '📋', cor: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Coletando documentos necessários' },
  { id: 'PER/DCOMP',     emoji: '📤', cor: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', desc: 'PER/DCOMP enviado à Receita Federal' },
  { id: 'Homologação',   emoji: '⏳', cor: '#f97316', bg: '#fff7ed', border: '#fed7aa', desc: 'Aguardando homologação da Receita' },
  { id: 'Recuperado',    emoji: '💰', cor: '#16a34a', bg: '#f0fdf4', border: '#86efac', desc: 'Crédito efetivamente recuperado' },
]

const RISCO_STYLE = {
  baixo: { cor: '#16a34a', bg: '#f0fdf4', label: '🟢 Baixo' },
  medio: { cor: '#d97706', bg: '#fffbeb', label: '🟡 Médio' },
  alto:  { cor: '#dc2626', bg: '#fff1f2', label: '🔴 Alto'  },
}

const fmtR    = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleDateString('pt-BR') : '—'

// ─── EXPORTAR PDF ────────────────────────────────────────────────────────────
function exportarPDF(recuperacoes, clientes) {
  const doc  = new jsPDF('landscape')
  const hoje = new Date().toLocaleDateString('pt-BR')
  doc.setFillColor(11, 31, 77); doc.rect(0, 0, 297, 28, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text('FiscalTrib — Gestão de Recuperações Tributárias', 14, 12)
  doc.setFontSize(10); doc.setFont('helvetica','normal')
  doc.text(`Emitido em: ${hoje} | Total: ${recuperacoes.length} processos`, 14, 22)
  autoTable(doc, {
    startY: 35,
    head: [['Cliente','Competência','Tributo','Crédito','Potencial','Tese','Risco','Status']],
    body: recuperacoes.map(r => [
      clientes.find(c => c.id === r.cliente_id)?.razao_social || '—',
      r.competencia || '—', r.tributo || '—',
      fmtR(r.valor_credito), fmtR(r.potencial_recuperavel),
      r.tese_aplicada || '—', r.risco || '—', r.status || '—',
    ]),
    headStyles: { fillColor: [11, 31, 77], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 3 },
  })
  doc.save(`Recuperacoes_${hoje.replace(/\//g,'-')}.pdf`)
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function GestaoRecuperacoes() {
  const [recuperacoes, setRecuperacoes] = useState([])
  const [clientes,     setClientes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [view,         setView]         = useState('pipeline')
  const [editando,     setEditando]     = useState(null)
  const [salvando,     setSalvando]     = useState(null)
  const [detalhe,      setDetalhe]      = useState(null)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cli } = await supabase.from('clientes').select('id,razao_social,regime,cnpj').eq('usuario_id', user.id)
    setClientes(cli || [])
    const ids = (cli || []).map(c => c.id)
    if (ids.length > 0) {
      const { data: rec } = await supabase.from('recuperacoes').select('*').in('cliente_id', ids).order('created_at', { ascending: false })
      setRecuperacoes(rec || [])
    }
    setLoading(false)
  }

  async function atualizarStatus(id, novoStatus) {
    setSalvando(id)
    const updates = { status: novoStatus, updated_at: new Date().toISOString() }
    if (novoStatus === 'PER/DCOMP')   updates.data_protocolo   = new Date().toISOString()
    if (novoStatus === 'Homologação') updates.data_homologacao  = new Date().toISOString()
    if (novoStatus === 'Recuperado')  updates.data_recuperacao  = new Date().toISOString()
    const { error } = await supabase.from('recuperacoes').update(updates).eq('id', id)
    if (!error) setRecuperacoes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    setSalvando(null)
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(editando.id)
    const { error } = await supabase.from('recuperacoes').update({
      valor_homologado: editando.valor_homologado,
      valor_recuperado: editando.valor_recuperado,
      observacoes:      editando.observacoes,
      tese_aplicada:    editando.tese_aplicada,
      updated_at:       new Date().toISOString(),
    }).eq('id', editando.id)
    if (!error) { setRecuperacoes(prev => prev.map(r => r.id === editando.id ? { ...r, ...editando } : r)); setEditando(null) }
    setSalvando(null)
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este processo?')) return
    await supabase.from('recuperacoes').delete().eq('id', id)
    setRecuperacoes(prev => prev.filter(r => r.id !== id))
  }

  const filtradas = recuperacoes.filter(r =>
    filtroStatus === 'Todos' || r.status === filtroStatus
  )

  // KPIs
  const totalCredito    = recuperacoes.reduce((s,r) => s+(r.valor_credito||0), 0)
  const totalPotencial  = recuperacoes.reduce((s,r) => s+(r.potencial_recuperavel||0), 0)
  const totalRecuperado = recuperacoes.reduce((s,r) => s+(r.valor_recuperado||0), 0)
  const emAndamento     = recuperacoes.filter(r => r.status !== 'Recuperado').length

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#0B1F4D', fontSize:16 }}>Carregando...</div>

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background:'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius:16, padding:'28px 32px', marginBottom:24, color:'#fff' }}>
        <div style={{ fontSize:11, color:'#7CC4FF', fontWeight:700, letterSpacing:2, marginBottom:8 }}>FISCALTRIB — PIPELINE DE RECUPERAÇÃO</div>
        <h1 style={{ fontSize:26, fontWeight:900, marginBottom:8, color:'#fff' }}>💼 Gestão de Recuperações</h1>
        <p style={{ fontSize:14, color:'#93c5fd', marginBottom:24, maxWidth:560 }}>
          Acompanhe cada processo do diagnóstico até o crédito recuperado.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          {[
            { valor:fmtR(totalCredito),    label:'Créditos identificados', cor:'#7CC4FF' },
            { valor:fmtR(totalPotencial),  label:'Potencial recuperável',  cor:'#4ade80' },
            { valor:String(emAndamento),   label:'Processos em andamento', cor:'#fbbf24' },
            { valor:fmtR(totalRecuperado), label:'Efetivamente recuperado', cor:'#f472b6' },
          ].map((c,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'16px 20px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize:18, fontWeight:900, color:c.cor, marginBottom:4 }}>{c.valor}</div>
              <div style={{ fontSize:11, color:'#93c5fd', fontWeight:600 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PIPELINE VISUAL — barra de progresso */}
      <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:'20px 24px', marginBottom:24 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0B1F4D', marginBottom:16 }}>📊 Visão geral do pipeline</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8 }}>
          {STATUS_PIPELINE.map((st, i) => {
            const qtd = recuperacoes.filter(r => r.status === st.id).length
            const val = recuperacoes.filter(r => r.status === st.id).reduce((s,r) => s+(r.potencial_recuperavel||0), 0)
            return (
              <div key={st.id} onClick={() => setFiltroStatus(st.id === filtroStatus ? 'Todos' : st.id)}
                style={{ background: filtroStatus === st.id ? st.bg : '#f8fafc', border:`2px solid ${filtroStatus===st.id?st.cor:'#e2e8f0'}`, borderRadius:12, padding:'14px 10px', textAlign:'center', cursor:'pointer', transition:'all 0.15s', position:'relative' }}>
                {/* Seta conectora */}
                {i < STATUS_PIPELINE.length - 1 && (
                  <div style={{ position:'absolute', right:-10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#cbd5e1', zIndex:1 }}>›</div>
                )}
                <div style={{ fontSize:22, marginBottom:6 }}>{st.emoji}</div>
                <div style={{ fontSize:10, fontWeight:800, color:st.cor, lineHeight:1.3, marginBottom:6 }}>{st.id}</div>
                <div style={{ fontSize:22, fontWeight:900, color:st.cor }}>{qtd}</div>
                {val > 0 && <div style={{ fontSize:10, color:'#64748b', marginTop:4 }}>{fmtR(val)}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* CONTROLES */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:8 }}>
          {[['pipeline','📊 Pipeline'],['lista','📋 Lista']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding:'8px 16px', background:view===v?'#0B1F4D':'#fff', color:view===v?'#fff':'#374151', border:`2px solid ${view===v?'#0B1F4D':'#e2e8f0'}`, borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {l}
            </button>
          ))}
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding:'8px 14px', border:'2px solid #e2e8f0', borderRadius:8, fontSize:13, color:'#374151' }}>
            <option value="Todos">Todos os status</option>
            {STATUS_PIPELINE.map(s => <option key={s.id}>{s.id}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:13, color:'#64748b' }}>{filtradas.length} processo(s)</span>
          <button onClick={() => exportarPDF(filtradas, clientes)}
            style={{ padding:'8px 18px', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* VAZIO */}
      {recuperacoes.length === 0 && (
        <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:48, textAlign:'center', color:'#94a3b8' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>💼</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8, color:'#374151' }}>Nenhum processo ainda</div>
          <div style={{ fontSize:14 }}>Importe XMLs e clique em "Iniciar Processo de Recuperação" no Raio-X</div>
        </div>
      )}

      {/* VIEW PIPELINE */}
      {view === 'pipeline' && recuperacoes.length > 0 && (
        <div style={{ overflowX:'auto', paddingBottom:16 }}>
          <div style={{ display:'flex', gap:14, minWidth:960 }}>
            {STATUS_PIPELINE.map(st => {
              const itens = filtradas.filter(r => r.status === st.id)
              return (
                <div key={st.id} style={{ flex:1, minWidth:155 }}>
                  {/* Header coluna */}
                  <div style={{ background:st.bg, border:`2px solid ${st.border}`, borderRadius:10, padding:'10px 12px', marginBottom:10, textAlign:'center' }}>
                    <div style={{ fontSize:18, marginBottom:2 }}>{st.emoji}</div>
                    <div style={{ fontSize:11, fontWeight:800, color:st.cor, lineHeight:1.3 }}>{st.id}</div>
                    <div style={{ fontSize:18, fontWeight:900, color:st.cor, marginTop:4 }}>{itens.length}</div>
                  </div>
                  {/* Cards */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {itens.map(r => {
                      const cli   = clientes.find(c => c.id === r.cliente_id)
                      const risco = RISCO_STYLE[r.risco] || RISCO_STYLE.baixo
                      return (
                        <div key={r.id} style={{ background:'#fff', border:`1.5px solid ${st.border}`, borderRadius:10, padding:'12px', boxShadow:'0 2px 6px rgba(0,0,0,0.05)', cursor:'pointer' }}
                          onClick={() => setDetalhe(r)}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#0B1F4D', marginBottom:4, lineHeight:1.3 }}>{cli?.razao_social || '—'}</div>
                          <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>{r.tributo} · {r.competencia}</div>
                          <div style={{ fontSize:13, fontWeight:900, color:'#16a34a', marginBottom:8 }}>{fmtR(r.valor_credito)}</div>
                          {/* Mini pipeline de status */}
                          <div style={{ display:'flex', gap:3, marginBottom:8 }}>
                            {STATUS_PIPELINE.map((s,i) => {
                              const idx    = STATUS_PIPELINE.findIndex(x => x.id === r.status)
                              const feito  = i <= idx
                              return <div key={s.id} style={{ flex:1, height:4, borderRadius:99, background:feito?st.cor:'#e2e8f0' }} title={s.id} />
                            })}
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:10, background:risco.bg, color:risco.cor, padding:'2px 7px', borderRadius:99, fontWeight:700 }}>{risco.label}</span>
                            <button onClick={e => { e.stopPropagation(); setEditando(r) }}
                              style={{ fontSize:10, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#64748b', padding:'3px 8px', borderRadius:6, cursor:'pointer' }}>✏️</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW LISTA */}
      {view === 'lista' && filtradas.length > 0 && (
        <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Cliente','Competência','Tributo','Crédito','Potencial','Tese','Risco','Status','Ações'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0', textTransform:'uppercase', letterSpacing:0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(r => {
                const cli   = clientes.find(c => c.id === r.cliente_id)
                const st    = STATUS_PIPELINE.find(s => s.id === r.status) || STATUS_PIPELINE[0]
                const risco = RISCO_STYLE[r.risco] || RISCO_STYLE.baixo
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'12px 14px', fontWeight:600 }}>
                      <div style={{ color:'#0B1F4D' }}>{cli?.razao_social || '—'}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{cli?.regime}</div>
                    </td>
                    <td style={{ padding:'12px 14px', color:'#64748b' }}>{r.competencia || '—'}</td>
                    <td style={{ padding:'12px 14px' }}>{r.tributo || '—'}</td>
                    <td style={{ padding:'12px 14px', fontWeight:700, color:'#16a34a' }}>{fmtR(r.valor_credito)}</td>
                    <td style={{ padding:'12px 14px', color:'#1e40af' }}>{fmtR(r.potencial_recuperavel)}</td>
                    <td style={{ padding:'12px 14px', fontSize:11, maxWidth:140 }}>{(r.tese_aplicada||'—').slice(0,35)}{r.tese_aplicada?.length>35?'...':''}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ background:risco.bg, color:risco.cor, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>{risco.label}</span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <select value={r.status} onChange={e => atualizarStatus(r.id, e.target.value)} disabled={salvando===r.id}
                        style={{ padding:'6px 10px', border:`2px solid ${st.border}`, borderRadius:8, fontSize:12, fontWeight:700, color:st.cor, background:st.bg, cursor:'pointer' }}>
                        {STATUS_PIPELINE.map(s => <option key={s.id}>{s.id}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setDetalhe(r)}  style={{ padding:'5px 10px', background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1e40af', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:600 }}>👁</button>
                        <button onClick={() => setEditando(r)} style={{ padding:'5px 10px', background:'#f0fdf4', border:'1px solid #86efac', color:'#16a34a', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:600 }}>✏️</button>
                        <button onClick={() => excluir(r.id)}  style={{ padding:'5px 10px', background:'#fff1f2', border:'1px solid #fecdd3', color:'#dc2626', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:600 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETALHE — clicou no card */}
      {detalhe && (() => {
        const cli = clientes.find(c => c.id === detalhe.cliente_id)
        const st  = STATUS_PIPELINE.find(s => s.id === detalhe.status) || STATUS_PIPELINE[0]
        const idx = STATUS_PIPELINE.findIndex(s => s.id === detalhe.status)
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto' }}>
              {/* Header */}
              <div style={{ background:'linear-gradient(135deg, #0B1F4D, #163B8C)', borderRadius:'16px 16px 0 0', padding:'24px 28px', color:'#fff' }}>
                <div style={{ fontSize:11, color:'#7CC4FF', fontWeight:700, letterSpacing:2, marginBottom:6 }}>PROCESSO DE RECUPERAÇÃO</div>
                <div style={{ fontSize:18, fontWeight:900, marginBottom:4 }}>{cli?.razao_social}</div>
                <div style={{ fontSize:13, color:'#93c5fd' }}>{detalhe.tributo} · {detalhe.competencia} · {cli?.regime}</div>
              </div>

              <div style={{ padding:'24px 28px' }}>

                {/* Pipeline de progresso */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0B1F4D', marginBottom:12 }}>Progresso do processo</div>
                  <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                    {STATUS_PIPELINE.map((s, i) => {
                      const feito   = i <= idx
                      const atual   = i === idx
                      return (
                        <div key={s.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
                          {/* Linha conectora */}
                          {i > 0 && <div style={{ position:'absolute', left:0, top:16, width:'50%', height:3, background: i<=idx?st.cor:'#e2e8f0' }} />}
                          {i < STATUS_PIPELINE.length-1 && <div style={{ position:'absolute', right:0, top:16, width:'50%', height:3, background: i<idx?st.cor:'#e2e8f0' }} />}
                          {/* Círculo */}
                          <div style={{ width:34, height:34, borderRadius:'50%', background:feito?st.cor:'#f1f5f9', border:`3px solid ${feito?st.cor:'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginBottom:6, position:'relative', zIndex:1, boxShadow:atual?`0 0 0 4px ${st.cor}33`:'' }}>
                            {feito ? (i === idx ? s.emoji : '✓') : <span style={{ fontSize:10, color:'#94a3b8' }}>{i+1}</span>}
                          </div>
                          <div style={{ fontSize:9, fontWeight:feito?700:500, color:feito?st.cor:'#94a3b8', textAlign:'center', lineHeight:1.2 }}>{s.id}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Valores */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                  {[
                    { label:'Crédito identificado', valor:fmtR(detalhe.valor_credito),        cor:'#16a34a' },
                    { label:'Potencial recuperável', valor:fmtR(detalhe.potencial_recuperavel), cor:'#2563eb' },
                    { label:'Recuperado',            valor:fmtR(detalhe.valor_recuperado),      cor:'#7c3aed' },
                  ].map((k,i) => (
                    <div key={i} style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>{k.label}</div>
                      <div style={{ fontSize:16, fontWeight:900, color:k.cor }}>{k.valor}</div>
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', marginBottom:20, fontSize:13 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, color:'#64748b' }}>
                    <div>Tese: <strong style={{ color:'#0B1F4D' }}>{detalhe.tese_aplicada || '—'}</strong></div>
                    <div>Risco: <strong>{detalhe.risco || '—'}</strong></div>
                    <div>Score: <strong>{detalhe.score_fiscal || '—'}</strong></div>
                    <div>Origem: <strong>{detalhe.origem || '—'}</strong></div>
                    <div>Identificado: <strong>{fmtData(detalhe.data_identificacao)}</strong></div>
                    <div>Protocolo: <strong>{fmtData(detalhe.data_protocolo)}</strong></div>
                    <div>Homologação: <strong>{fmtData(detalhe.data_homologacao)}</strong></div>
                    <div>Recuperação: <strong>{fmtData(detalhe.data_recuperacao)}</strong></div>
                  </div>
                  {detalhe.observacoes && <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #e2e8f0', color:'#374151' }}>{detalhe.observacoes}</div>}
                </div>

                {/* Avançar status */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0B1F4D', marginBottom:10 }}>Atualizar status</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {STATUS_PIPELINE.map((s, i) => (
                      <button key={s.id}
                        onClick={() => { atualizarStatus(detalhe.id, s.id); setDetalhe(prev => ({ ...prev, status: s.id })) }}
                        disabled={salvando === detalhe.id}
                        style={{ padding:'8px 14px', background:detalhe.status===s.id?s.cor:s.bg, color:detalhe.status===s.id?'#fff':s.cor, border:`2px solid ${s.border}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                        {s.emoji} {s.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setDetalhe(null)} style={{ flex:1, padding:'12px 0', background:'#f8fafc', color:'#64748b', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>Fechar</button>
                  <button onClick={() => { setEditando(detalhe); setDetalhe(null) }} style={{ flex:1, padding:'12px 0', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>✏️ Editar processo</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL EDIÇÃO */}
      {editando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'32px', width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#0B1F4D', marginBottom:20 }}>✏️ Editar processo</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              {[['Valor homologado (R$)','valor_homologado'],['Valor recuperado (R$)','valor_recuperado']].map(([lb,k]) => (
                <div key={k}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>{lb}</label>
                  <input type="number" value={editando[k]||''} onChange={e=>setEditando(p=>({...p,[k]:parseFloat(e.target.value)||0}))}
                    style={{ width:'100%', padding:'10px 14px', border:'2px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Tese aplicada</label>
              <input value={editando.tese_aplicada||''} onChange={e=>setEditando(p=>({...p,tese_aplicada:e.target.value}))}
                style={{ width:'100%', padding:'10px 14px', border:'2px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Observações</label>
              <textarea value={editando.observacoes||''} onChange={e=>setEditando(p=>({...p,observacoes:e.target.value}))} rows={4}
                style={{ width:'100%', padding:'10px 14px', border:'2px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={()=>setEditando(null)} style={{ padding:'12px 24px', background:'#f8fafc', color:'#64748b', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarEdicao} disabled={!!salvando} style={{ flex:1, padding:'12px 0', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor:'pointer' }}>
                {salvando?'Salvando...':'💾 Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}