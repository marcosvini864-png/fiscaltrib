import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmtR    = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleDateString('pt-BR') : '—'
const fmtDT   = v => v ? new Date(v).toLocaleString('pt-BR') : '—'

const STATUS_PIPELINE = [
  { id: 'Em Preparação',      emoji: '🟠', cor: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  { id: 'PER/DCOMP Enviado',  emoji: '🔵', cor: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'Em Análise Receita', emoji: '🟣', cor: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'Exigência Fiscal',   emoji: '🔴', cor: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
  { id: 'Homologado',         emoji: '🟢', cor: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  { id: 'Recuperado',         emoji: '💰', cor: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  { id: 'Encerrado',          emoji: '⚫', cor: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
]

const TIPOS_EXIGENCIA = [
  'Documentação complementar',
  'Comprovação do crédito',
  'Retificação de declaração',
  'Esclarecimentos adicionais',
  'Perícia fiscal',
  'Outros',
]

function diasParaVencer(prazo) {
  if (!prazo) return null
  return Math.round((new Date(prazo) - new Date()) / (1000 * 60 * 60 * 24))
}

function alertaExigencia(dias) {
  if (dias === null) return null
  if (dias <= 0)  return { cor: '#dc2626', bg: '#fff1f2', label: '🔴 PRAZO ENCERRADO' }
  if (dias <= 3)  return { cor: '#dc2626', bg: '#fff1f2', label: `🔴 CRÍTICO — ${dias} dias` }
  if (dias <= 7)  return { cor: '#f97316', bg: '#fff7ed', label: `🟠 URGENTE — ${dias} dias` }
  if (dias <= 15) return { cor: '#d97706', bg: '#fffbeb', label: `🟡 ATENÇÃO — ${dias} dias` }
  if (dias <= 30) return { cor: '#16a34a', bg: '#f0fdf4', label: `🟢 ${dias} dias restantes` }
  return { cor: '#64748b', bg: '#f8fafc', label: `${dias} dias restantes` }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function PerdComp() {
  const isMobile = useIsMobile()
  const [clientes,      setClientes]      = useState([])
  const [recuperacoes,  setRecuperacoes]  = useState([])
  const [perdcomps,     setPerdcomps]     = useState([])
  const [exigencias,    setExigencias]    = useState([])
  const [timeline,      setTimeline]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [aba,           setAba]           = useState('dashboard')
  const [modalNovo,     setModalNovo]     = useState(false)
  const [modalExig,     setModalExig]     = useState(null)
  const [detalhes,      setDetalhes]      = useState(null)
  const [salvando,      setSalvando]      = useState(false)

  // Form novo PER/DCOMP
  const [form, setForm] = useState({
    recuperacao_id: '', cliente_id: '', numero_perdcomp: '', competencia: '',
    tributo: '', valor_credito: 0, valor_protocolado: 0, tese_aplicada: '',
    status: 'Em Preparação', data_protocolo: '', observacoes: '',
  })

  // Form exigência
  const [formExig, setFormExig] = useState({
    perdcomp_id: '', cliente_id: '', data_exigencia: '', tipo_exigencia: '',
    prazo_resposta: '', responsavel: '', situacao: 'Pendente', resposta: '',
  })

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cli } = await supabase.from('clientes').select('id, razao_social, regime, cnpj').eq('usuario_id', user.id)
    setClientes(cli || [])

    const ids = (cli || []).map(c => c.id)
    if (ids.length > 0) {
      const { data: rec }  = await supabase.from('recuperacoes').select('*').in('cliente_id', ids).order('created_at', { ascending: false })
      const { data: perd } = await supabase.from('perdcomp').select('*').in('cliente_id', ids).order('created_at', { ascending: false })
      const { data: exig } = await supabase.from('exigencias_fiscais').select('*').in('cliente_id', ids).order('prazo_resposta', { ascending: true })
      const { data: time } = await supabase.from('timeline_recuperacao').select('*').order('data_evento', { ascending: false })

      setRecuperacoes(rec || [])
      setPerdcomps(perd || [])
      setExigencias(exig || [])
      setTimeline(time || [])
    }
    setLoading(false)
  }

  function preencherFormDeRecuperacao(recId) {
    const rec = recuperacoes.find(r => r.id === recId)
    if (!rec) return
    setForm(f => ({
      ...f,
      recuperacao_id:   rec.id,
      cliente_id:       rec.cliente_id,
      competencia:      rec.competencia || '',
      tributo:          rec.tributo || '',
      valor_credito:    rec.valor_credito || 0,
      valor_protocolado: rec.potencial_recuperavel || 0,
      tese_aplicada:    rec.tese_aplicada || '',
    }))
  }

  async function salvarPerdComp() {
    setSalvando(true)
    try {
      const payload = {
        ...form,
        valor_credito:     parseFloat(form.valor_credito) || 0,
        valor_protocolado: parseFloat(form.valor_protocolado) || 0,
        data_protocolo:    form.data_protocolo ? new Date(form.data_protocolo).toISOString() : null,
        updated_at:        new Date().toISOString(),
      }
      const { data, error } = await supabase.from('perdcomp').insert([payload]).select()
      if (error) throw error

      // Atualiza recuperação
      if (form.recuperacao_id) {
        await supabase.from('recuperacoes').update({
          status: 'PerdeComp Enviado',
          data_protocolo: payload.data_protocolo,
          updated_at: new Date().toISOString(),
        }).eq('id', form.recuperacao_id)

        // Timeline
        await supabase.from('timeline_recuperacao').insert([{
          recuperacao_id: form.recuperacao_id,
          perdcomp_id: data[0].id,
          evento: 'PER/DCOMP Criado',
          descricao: `Número: ${form.numero_perdcomp || 'Não informado'} | Valor: ${fmtR(form.valor_protocolado)}`,
          data_evento: new Date().toISOString(),
        }])
      }

      setPerdcomps(p => [data[0], ...p])
      setModalNovo(false)
      setForm({ recuperacao_id: '', cliente_id: '', numero_perdcomp: '', competencia: '', tributo: '', valor_credito: 0, valor_protocolado: 0, tese_aplicada: '', status: 'Em Preparação', data_protocolo: '', observacoes: '' })
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  async function atualizarStatus(id, novoStatus) {
    const updates = { status: novoStatus, updated_at: new Date().toISOString() }
    if (novoStatus === 'Homologado') updates.data_homologacao = new Date().toISOString()
    if (novoStatus === 'Recuperado') updates.data_recuperacao = new Date().toISOString()

    await supabase.from('perdcomp').update(updates).eq('id', id)
    setPerdcomps(p => p.map(x => x.id === id ? { ...x, ...updates } : x))

    // Timeline
    const perd = perdcomps.find(x => x.id === id)
    if (perd?.recuperacao_id) {
      await supabase.from('timeline_recuperacao').insert([{
        recuperacao_id: perd.recuperacao_id,
        perdcomp_id: id,
        evento: `Status atualizado: ${novoStatus}`,
        descricao: `PER/DCOMP ${perd.numero_perdcomp || id.slice(0, 8)} → ${novoStatus}`,
        data_evento: new Date().toISOString(),
      }])
    }
  }

  async function salvarExigencia() {
    setSalvando(true)
    try {
      const { data, error } = await supabase.from('exigencias_fiscais').insert([{
        ...formExig,
        data_exigencia: formExig.data_exigencia ? new Date(formExig.data_exigencia).toISOString() : null,
        prazo_resposta: formExig.prazo_resposta ? new Date(formExig.prazo_resposta).toISOString() : null,
      }]).select()
      if (error) throw error

      // Atualiza status do perdcomp
      await supabase.from('perdcomp').update({ status: 'Exigência Fiscal', updated_at: new Date().toISOString() }).eq('id', formExig.perdcomp_id)
      setPerdcomps(p => p.map(x => x.id === formExig.perdcomp_id ? { ...x, status: 'Exigência Fiscal' } : x))

      // Timeline
      const perd = perdcomps.find(x => x.id === formExig.perdcomp_id)
      if (perd?.recuperacao_id) {
        await supabase.from('timeline_recuperacao').insert([{
          recuperacao_id: perd.recuperacao_id,
          perdcomp_id: formExig.perdcomp_id,
          evento: 'Exigência Fiscal Recebida',
          descricao: `Tipo: ${formExig.tipo_exigencia} | Prazo: ${fmtData(formExig.prazo_resposta)}`,
          data_evento: new Date().toISOString(),
        }])
      }

      setExigencias(e => [...(data || []), ...e])
      setModalExig(null)
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  function exportarPDF() {
    const doc = new jsPDF('landscape')
    const hoje = new Date().toLocaleDateString('pt-BR')
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, 297, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('FiscalTrib — Relatório PER/DCOMP', 14, 12)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Emitido em: ${hoje} | Total: ${perdcomps.length} processos`, 14, 22)
    autoTable(doc, {
      startY: 35,
      head: [['Nº PER/DCOMP', 'Cliente', 'Tributo', 'Competência', 'Crédito', 'Protocolado', 'Status', 'Protocolo']],
      body: perdcomps.map(p => [
        p.numero_perdcomp || '—',
        clientes.find(c => c.id === p.cliente_id)?.razao_social || '—',
        p.tributo || '—', p.competencia || '—',
        fmtR(p.valor_credito), fmtR(p.valor_protocolado),
        p.status || '—', fmtData(p.data_protocolo),
      ]),
      headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 3 },
    })
    doc.setFontSize(8); doc.setTextColor(148, 163, 184)
    doc.text('FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária | fiscaltrib.com.br', 14, 200)
    doc.save(`PerdComp_${hoje.replace(/\//g, '-')}.pdf`)
  }

  // KPIs
  const totalProtocolado  = perdcomps.reduce((s, p) => s + (p.valor_protocolado || 0), 0)
  const totalHomologado   = perdcomps.reduce((s, p) => s + (p.valor_homologado || 0), 0)
  const totalRecuperado   = perdcomps.reduce((s, p) => s + (p.valor_recuperado || 0), 0)
  const totalGlosado      = perdcomps.reduce((s, p) => s + (p.valor_glosado || 0), 0)
  const emAndamento       = perdcomps.filter(p => !['Recuperado','Encerrado'].includes(p.status)).length
  const comExigencia      = perdcomps.filter(p => p.status === 'Exigência Fiscal').length
  const exigPendentes     = exigencias.filter(e => e.situacao === 'Pendente')

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#1e3a5f', fontSize: 16 }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px', boxSizing: 'border-box' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 60%, #0d9488 100%)', borderRadius: '0 0 24px 24px', padding: isMobile ? '24px 20px 28px' : '36px 40px 40px', marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — RECUPERAÇÃO TRIBUTÁRIA</div>
          <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, marginBottom: 8, color: '#fff' }}>📤 PER/DCOMP</h1>
          <p style={{ fontSize: isMobile ? 14 : 16, color: '#9db8d8', marginBottom: isMobile ? 20 : 28, lineHeight: 1.6, maxWidth: 560 }}>
            Gerencie todos os pedidos de restituição e compensação tributária. Do protocolo à recuperação financeira.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16 }}>
            {[
              { valor: fmtR(totalProtocolado), label: 'Valor protocolado',  cor: '#60a5fa' },
              { valor: fmtR(totalHomologado),  label: 'Valor homologado',   cor: '#4ade80' },
              { valor: fmtR(totalRecuperado),  label: 'Valor recuperado',   cor: '#fbbf24' },
              { valor: fmtR(totalGlosado),     label: 'Valor glosado',      cor: '#f87171' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: isMobile ? '12px 14px' : '16px 20px', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0, boxSizing: 'border-box' }}>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 900, color: c.cor, marginBottom: 4 }}>{c.valor}</div>
                <div style={{ fontSize: 11, color: '#9db8d8', fontWeight: 600 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ALERTAS DE EXIGÊNCIA */}
      {exigPendentes.length > 0 && (
        <div style={{ background: '#fff1f2', border: '2px solid #fecdd3', borderRadius: 14, padding: '16px 24px', marginBottom: 24, boxSizing: 'border-box' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626', marginBottom: 12 }}>
            🔴 {exigPendentes.length} exigência(s) pendente(s) — Verifique os prazos!
          </div>
          {exigPendentes.map(e => {
            const dias   = diasParaVencer(e.prazo_resposta)
            const alerta = alertaExigencia(dias)
            return (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #fecdd3', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#374151' }}>{e.tipo_exigencia} — Prazo: {fmtData(e.prazo_resposta)}</div>
                {alerta && <span style={{ fontSize: 12, fontWeight: 700, background: alerta.bg, color: alerta.cor, padding: '3px 10px', borderRadius: 99 }}>{alerta.label}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* ABAS + AÇÕES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'dashboard',  label: '📊 Dashboard'    },
            { id: 'processos',  label: `📋 Processos (${perdcomps.length})` },
            { id: 'exigencias', label: `⚠️ Exigências (${exigencias.length})` },
            { id: 'timeline',   label: '📅 Timeline'     },
          ].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: `2px solid ${aba === a.id ? '#1e3a5f' : '#e2e8f0'}`,
              background: aba === a.id ? '#1e3a5f' : '#fff',
              color: aba === a.id ? '#fff' : '#374151',
            }}>{a.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={exportarPDF} style={{ padding: '10px 18px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📄 PDF
          </button>
          <button onClick={() => setModalNovo(true)} style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            + Novo PER/DCOMP
          </button>
        </div>
      </div>

      {/* ABA DASHBOARD */}
      {aba === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 20, marginBottom: 24 }}>
            {[
              { label: 'Em andamento',     valor: emAndamento,                                              cor: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
              { label: 'Com exigência',    valor: comExigencia,                                             cor: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
              { label: 'Homologados',      valor: perdcomps.filter(p => p.status === 'Homologado').length,  cor: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
              { label: 'Recuperados',      valor: perdcomps.filter(p => p.status === 'Recuperado').length,  cor: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
              { label: 'Total processos',  valor: perdcomps.length,                                         cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
              { label: 'Exig. pendentes',  valor: exigPendentes.length,                                     cor: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
            ].map((c, i) => (
              <div key={i} style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 14, padding: isMobile ? '16px' : '24px', minWidth: 0, boxSizing: 'border-box' }}>
                <div style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, color: c.cor, marginBottom: 8 }}>{c.valor}</div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline visual */}
          <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px', marginBottom: 20, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e3a5f', marginBottom: 20 }}>Pipeline de Recuperação</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {STATUS_PIPELINE.map(st => {
                const qtd = perdcomps.filter(p => p.status === st.id).length
                return (
                  <div key={st.id} style={{ flex: 1, minWidth: 120, background: st.bg, border: `2px solid ${st.border}`, borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{st.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: st.cor, marginBottom: 8, lineHeight: 1.3 }}>{st.id}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: st.cor }}>{qtd}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ABA PROCESSOS */}
      {aba === 'processos' && (
        <div>
          {perdcomps.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Nenhum PER/DCOMP cadastrado</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Clique em "+ Novo PER/DCOMP" para começar</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {perdcomps.map(p => {
                const cli = clientes.find(c => c.id === p.cliente_id)
                const st  = STATUS_PIPELINE.find(s => s.id === p.status) || STATUS_PIPELINE[0]
                const exigP = exigencias.filter(e => e.perdcomp_id === p.id && e.situacao === 'Pendente')
                return (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: `2px solid ${st.border}`, padding: '20px 24px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#1e3a5f' }}>
                            {p.numero_perdcomp || `PER/DCOMP ${p.id.slice(0, 8).toUpperCase()}`}
                          </span>
                          <span style={{ fontSize: 11, background: st.bg, color: st.cor, padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>
                            {st.emoji} {st.id}
                          </span>
                          {exigP.length > 0 && <span style={{ fontSize: 11, background: '#fff1f2', color: '#dc2626', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>🔴 {exigP.length} exigência(s)</span>}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{cli?.razao_social || '—'}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                          {p.tributo} · {p.competencia} · Protocolo: {fmtData(p.data_protocolo)}
                        </div>
                        {p.tese_aplicada && <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>📚 {p.tese_aplicada}</div>}
                      </div>
                      <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Crédito identificado</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a', marginBottom: 4 }}>{fmtR(p.valor_credito)}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Protocolado</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6', marginBottom: 12 }}>{fmtR(p.valor_protocolado)}</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: isMobile ? 'flex-start' : 'flex-end', flexWrap: 'wrap' }}>
                          <select value={p.status} onChange={e => atualizarStatus(p.id, e.target.value)}
                            style={{ padding: '6px 10px', border: `2px solid ${st.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: st.cor, background: st.bg, cursor: 'pointer' }}>
                            {STATUS_PIPELINE.map(s => <option key={s.id}>{s.id}</option>)}
                          </select>
                          <button onClick={() => { setFormExig(f => ({ ...f, perdcomp_id: p.id, cliente_id: p.cliente_id })); setModalExig(true) }}
                            style={{ padding: '6px 12px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                            ⚠️ Exigência
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Indicadores financeiros */}
                    {(p.valor_homologado > 0 || p.valor_recuperado > 0 || p.valor_glosado > 0) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                        {[
                          { label: 'Homologado', valor: p.valor_homologado, cor: '#16a34a' },
                          { label: 'Recuperado', valor: p.valor_recuperado, cor: '#0d9488' },
                          { label: 'Glosado',    valor: p.valor_glosado,    cor: '#dc2626' },
                        ].map((x, i) => <div key={i} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{x.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: x.cor }}>{fmtR(x.valor)}</div>
                        </div>)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA EXIGÊNCIAS */}
      {aba === 'exigencias' && (
        <div>
          {exigencias.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Nenhuma exigência fiscal registrada</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {exigencias.map(e => {
                const dias   = diasParaVencer(e.prazo_resposta)
                const alerta = alertaExigencia(dias)
                const cli    = clientes.find(c => c.id === e.cliente_id)
                return (
                  <div key={e.id} style={{ background: '#fff', borderRadius: 14, border: `2px solid ${e.situacao === 'Pendente' ? '#fecdd3' : '#e2e8f0'}`, padding: '20px 24px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, background: e.situacao === 'Pendente' ? '#fff1f2' : '#f0fdf4', color: e.situacao === 'Pendente' ? '#dc2626' : '#16a34a', padding: '3px 10px', borderRadius: 99 }}>
                            {e.situacao === 'Pendente' ? '🔴 Pendente' : '✅ Respondida'}
                          </span>
                          {alerta && e.situacao === 'Pendente' && (
                            <span style={{ fontSize: 11, fontWeight: 700, background: alerta.bg, color: alerta.cor, padding: '3px 10px', borderRadius: 99 }}>{alerta.label}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{e.tipo_exigencia}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Cliente: {cli?.razao_social || '—'}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          Recebida: {fmtData(e.data_exigencia)} · Prazo: {fmtData(e.prazo_resposta)} · Responsável: {e.responsavel || '—'}
                        </div>
                        {e.resposta && <div style={{ marginTop: 8, fontSize: 13, color: '#374151', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>💬 {e.resposta}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA TIMELINE */}
      {aba === 'timeline' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e3a5f', marginBottom: 20 }}>📅 Timeline Completa</div>
          {timeline.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>Nenhum evento registrado ainda.</div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: '#e2e8f0' }} />
              {timeline.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 20, marginBottom: 24, position: 'relative' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, zIndex: 1 }}>
                    {i % 2 === 0 ? '📤' : '🔔'}
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '14px 18px', minWidth: 0, boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{t.evento}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{t.descricao}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDT(t.data_evento)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVO PER/DCOMP */}
      {modalNovo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', marginBottom: 20 }}>📤 Novo PER/DCOMP</div>

            {/* Preencher de recuperação */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Vincular a uma Recuperação (opcional)</label>
              <select value={form.recuperacao_id} onChange={e => preencherFormDeRecuperacao(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">— Selecione uma recuperação —</option>
                {recuperacoes.map(r => {
                  const cli = clientes.find(c => c.id === r.cliente_id)
                  return <option key={r.id} value={r.id}>{cli?.razao_social} · {r.tributo} · {r.competencia}</option>
                })}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Nº PER/DCOMP', key: 'numero_perdcomp', ph: 'Ex: 2026.000123456' },
                { label: 'Competência',   key: 'competencia',     ph: 'Ex: 2021-05' },
                { label: 'Tributo',       key: 'tributo',         ph: 'Ex: PIS/COFINS' },
                { label: 'Tese Aplicada', key: 'tese_aplicada',   ph: 'Ex: Tema 69 — STF' },
              ].map(({ label, key, ph }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                    style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
              {[
                { label: 'Valor do Crédito (R$)',     key: 'valor_credito'     },
                { label: 'Valor Protocolado (R$)',    key: 'valor_protocolado' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input type="number" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Data do Protocolo</label>
                <input type="date" value={form.data_protocolo || ''} onChange={e => setForm(f => ({ ...f, data_protocolo: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                  {STATUS_PIPELINE.map(s => <option key={s.id}>{s.id}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Observações</label>
              <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setModalNovo(false)} style={{ padding: '12px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarPerdComp} disabled={salvando} style={{ flex: 1, minWidth: 160, padding: '12px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : '💾 Salvar PER/DCOMP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXIGÊNCIA */}
      {modalExig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: 520, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginBottom: 20 }}>⚠️ Registrar Exigência Fiscal</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo de Exigência</label>
                <select value={formExig.tipo_exigencia} onChange={e => setFormExig(f => ({ ...f, tipo_exigencia: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                  <option value="">— Selecione —</option>
                  {TIPOS_EXIGENCIA.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Responsável</label>
                <input value={formExig.responsavel} onChange={e => setFormExig(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável"
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Data da Exigência</label>
                <input type="date" value={formExig.data_exigencia} onChange={e => setFormExig(f => ({ ...f, data_exigencia: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Prazo para Resposta</label>
                <input type="date" value={formExig.prazo_resposta} onChange={e => setFormExig(f => ({ ...f, prazo_resposta: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Observações / Resposta</label>
              <textarea value={formExig.resposta} onChange={e => setFormExig(f => ({ ...f, resposta: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setModalExig(null)} style={{ padding: '12px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarExigencia} disabled={salvando} style={{ flex: 1, minWidth: 160, padding: '12px 0', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : '⚠️ Registrar Exigência'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}