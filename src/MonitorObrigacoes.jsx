import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const OBRIGACOES = {
  'Simples Nacional': [
    { id: 'pgdas',  label: 'PGDAS-D',  vencimento: 20, descricao: 'Programa Gerador do Documento de Arrecadação do Simples Nacional' },
    { id: 'das',    label: 'DAS',      vencimento: 20, descricao: 'Documento de Arrecadação do Simples Nacional' },
    { id: 'defis',  label: 'DEFIS',    vencimento: 31, descricao: 'Declaração de Informações Socioeconômicas e Fiscais (anual - março)' },
  ],
  'Lucro Presumido': [
    { id: 'dctf',   label: 'DCTF',     vencimento: 15, descricao: 'Declaração de Débitos e Créditos Tributários Federais' },
    { id: 'ecf',    label: 'ECF',      vencimento: 31, descricao: 'Escrituração Contábil Fiscal (anual - julho)' },
    { id: 'ecd',    label: 'ECD',      vencimento: 31, descricao: 'Escrituração Contábil Digital (anual - maio)' },
    { id: 'sped_f', label: 'SPED F.',  vencimento: 15, descricao: 'SPED Fiscal — EFD ICMS/IPI' },
    { id: 'sped_c', label: 'SPED C.',  vencimento: 15, descricao: 'SPED Contribuições — EFD PIS/COFINS' },
  ],
  'Lucro Real': [
    { id: 'dctf',   label: 'DCTF',     vencimento: 15, descricao: 'Declaração de Débitos e Créditos Tributários Federais' },
    { id: 'ecf',    label: 'ECF',      vencimento: 31, descricao: 'Escrituração Contábil Fiscal (anual - julho)' },
    { id: 'ecd',    label: 'ECD',      vencimento: 31, descricao: 'Escrituração Contábil Digital (anual - maio)' },
    { id: 'sped_f', label: 'SPED F.',  vencimento: 15, descricao: 'SPED Fiscal — EFD ICMS/IPI' },
    { id: 'sped_c', label: 'SPED C.',  vencimento: 15, descricao: 'SPED Contribuições — EFD PIS/COFINS' },
    { id: 'lalur',  label: 'LALUR',    vencimento: 31, descricao: 'Livro de Apuração do Lucro Real' },
  ],
}

const OBRIGACOES_GERAIS = [
  { id: 'efdreinf', label: 'EFD-Reinf', vencimento: 15, descricao: 'Escrituração Fiscal Digital de Retenções e Outras Informações Fiscais' },
  { id: 'esocial',  label: 'eSocial',   vencimento: 7,  descricao: 'Sistema de Escrituração Digital das Obrigações Fiscais, Previdenciárias e Trabalhistas' },
  { id: 'dctfweb',  label: 'DCTFWeb',   vencimento: 15, descricao: 'Declaração de Débitos e Créditos Tributários Federais Previdenciários e de Outras Entidades e Fundos' },
]

const STATUS_STYLE = {
  entregue: { bg: '#f0fdf4', border: '#86efac', cor: '#16a34a', label: '✅ Entregue',  emoji: '✅' },
  pendente: { bg: '#fffbeb', border: '#fde68a', cor: '#d97706', label: '⏳ Pendente',  emoji: '⏳' },
  atraso:   { bg: '#fff1f2', border: '#fecdd3', cor: '#dc2626', label: '🔴 Em atraso', emoji: '🔴' },
}

function getMesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getObrigacoesCliente(regime) {
  const especificas = OBRIGACOES[regime] || []
  return [...especificas, ...OBRIGACOES_GERAIS]
}

function exportarPDF(clientes, statusMap, mesRef) {
  const doc = new jsPDF('landscape')
  const hoje = new Date().toLocaleDateString('pt-BR')
  const [ano, mes] = mesRef.split('-')
  const mesLabel = new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 297, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('FiscalTrib — Monitor de Obrigações Fiscais', 14, 12)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`Competência: ${mesLabel} | Emitido em: ${hoje}`, 14, 22)

  const rows = []
  clientes.forEach(c => {
    const obs = getObrigacoesCliente(c.regime)
    obs.forEach(o => {
      const key = `${c.id}-${o.id}`
      const status = statusMap[key] || 'pendente'
      rows.push([c.razao_social, c.regime, o.label, `Dia ${o.vencimento}`, status === 'entregue' ? '✅ Entregue' : status === 'atraso' ? '🔴 Em atraso' : '⏳ Pendente'])
    })
  })

  autoTable(doc, {
    startY: 35,
    head: [['Cliente', 'Regime', 'Obrigação', 'Vencimento', 'Status']],
    body: rows,
    headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 4: { fontStyle: 'bold' } },
  })

  doc.setFontSize(8); doc.setTextColor(148, 163, 184)
  doc.text('FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária | fiscaltrib.com.br', 14, 200)
  doc.save(`Monitor_Obrigacoes_${mesRef}.pdf`)
}

export default function MonitorObrigacoes() {
  const [clientes,   setClientes]   = useState([])
  const [statusMap,  setStatusMap]  = useState({})
  const [mesRef,     setMesRef]     = useState(getMesAtual())
  const [filtro,     setFiltro]     = useState('Todos')
  const [loading,    setLoading]    = useState(true)
  const [salvando,   setSalvando]   = useState(null)

  useEffect(() => { carregarDados() }, [mesRef])

  async function carregarDados() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cli } = await supabase.from('clientes').select('id, razao_social, regime').eq('usuario_id', user.id).order('razao_social')
    setClientes(cli || [])

    const { data: obs } = await supabase.from('monitor_obrigacoes').select('*').eq('competencia', mesRef)
    const map = {}
    if (obs) obs.forEach(o => { map[`${o.cliente_id}-${o.obrigacao_id}`] = o.status })
    setStatusMap(map)
    setLoading(false)
  }

  async function alterarStatus(clienteId, obrigacaoId, novoStatus) {
    const key = `${clienteId}-${obrigacaoId}`
    setSalvando(key)
    const { error } = await supabase.from('monitor_obrigacoes').upsert({
      cliente_id: clienteId,
      obrigacao_id: obrigacaoId,
      competencia: mesRef,
      status: novoStatus,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cliente_id,obrigacao_id,competencia' })
    if (!error) setStatusMap(prev => ({ ...prev, [key]: novoStatus }))
    setSalvando(null)
  }

  function proximoStatus(atual) {
    if (!atual || atual === 'pendente') return 'entregue'
    if (atual === 'entregue') return 'atraso'
    return 'pendente'
  }

  const clientesFiltrados = clientes.filter(c => filtro === 'Todos' || c.regime === filtro)

  // Contadores gerais
  const totalObs = clientes.reduce((s, c) => s + getObrigacoesCliente(c.regime).length, 0)
  const totalEntregue = Object.values(statusMap).filter(v => v === 'entregue').length
  const totalAtraso   = Object.values(statusMap).filter(v => v === 'atraso').length
  const totalPendente = totalObs - totalEntregue - totalAtraso

  const [ano, mes] = mesRef.split('-')
  const mesLabel = new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#1e3a5f', fontSize: 16 }}>
      Carregando obrigações...
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* ── BANNER TOPO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 50%, #1e4976 100%)', borderRadius: '0 0 24px 24px', padding: '36px 40px 40px', marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 100, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — CONTROLE FISCAL</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, lineHeight: 1.2, color: '#fff' }}>
            📅 Monitor de Obrigações
          </h1>
          <p style={{ fontSize: 16, color: '#9db8d8', marginBottom: 28, lineHeight: 1.6, maxWidth: 520 }}>
            Acompanhe em tempo real todas as obrigações fiscais dos seus clientes. Nunca mais perca um prazo.
          </p>

          {/* Seletor de mês + indicadores */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 600, marginBottom: 6 }}>COMPETÊNCIA</div>
              <input
                type="month"
                value={mesRef}
                onChange={e => setMesRef(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { valor: totalEntregue, label: 'Entregues',  cor: '#4ade80' },
                { valor: totalPendente, label: 'Pendentes',  cor: '#fbbf24' },
                { valor: totalAtraso,   label: 'Em atraso',  cor: '#f87171' },
                { valor: totalObs,      label: 'Total',      cor: '#60a5fa' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: c.cor }}>{c.valor}</div>
                  <div style={{ fontSize: 11, color: '#9db8d8', fontWeight: 600, marginTop: 2 }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Todos', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real'].map(r => (
            <button key={r} onClick={() => setFiltro(r)} style={{
              padding: '8px 18px', borderRadius: 99, border: `2px solid ${filtro === r ? '#1e3a5f' : '#e2e8f0'}`,
              background: filtro === r ? '#1e3a5f' : '#f8fafc', color: filtro === r ? '#fff' : '#64748b',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>{r}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
          </span>
          <button onClick={() => exportarPDF(clientesFiltrados, statusMap, mesRef)}
            style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* ── LEGENDA ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_STYLE).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, background: v.bg, border: `1px solid ${v.border}`, borderRadius: 99, padding: '6px 14px' }}>
            <span style={{ fontSize: 13, color: v.cor, fontWeight: 700 }}>{v.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 99, padding: '6px 14px' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>💡 Clique no status para alternar</span>
        </div>
      </div>

      {/* ── CLIENTES ── */}
      {clientes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Nenhum cliente cadastrado</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Cadastre clientes para monitorar as obrigações</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {clientesFiltrados.map(c => {
            const obs = getObrigacoesCliente(c.regime)
            const especificas = OBRIGACOES[c.regime] || []
            const entregues = obs.filter(o => statusMap[`${c.id}-${o.id}`] === 'entregue').length
            const atrasadas = obs.filter(o => statusMap[`${c.id}-${o.id}`] === 'atraso').length
            const pct = Math.round((entregues / obs.length) * 100)

            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 16, border: `2px solid ${atrasadas > 0 ? '#fecdd3' : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>

                {/* Header do cliente */}
                <div style={{ padding: '18px 24px', background: atrasadas > 0 ? '#fff1f2' : '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{c.razao_social}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{c.regime} · {mesLabel}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {atrasadas > 0 && (
                      <span style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                        🔴 {atrasadas} em atraso
                      </span>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{entregues}/{obs.length} entregues</div>
                      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, width: 120 }}>
                        <div style={{ background: pct === 100 ? '#16a34a' : atrasadas > 0 ? '#dc2626' : '#d97706', borderRadius: 99, height: 8, width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Obrigações */}
                <div style={{ padding: '16px 24px' }}>

                  {/* Específicas do regime */}
                  {especificas.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 10 }}>
                        OBRIGAÇÕES DO {c.regime.toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {especificas.map(o => {
                          const key = `${c.id}-${o.id}`
                          const status = statusMap[key] || 'pendente'
                          const st = STATUS_STYLE[status]
                          const isSalvando = salvando === key
                          return (
                            <button
                              key={o.id}
                              onClick={() => alterarStatus(c.id, o.id, proximoStatus(status))}
                              disabled={isSalvando}
                              title={`${o.label} — ${o.descricao}\nVencimento: dia ${o.vencimento}`}
                              style={{
                                padding: '10px 18px', borderRadius: 10,
                                border: `2px solid ${st.border}`,
                                background: st.bg, color: st.cor,
                                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                opacity: isSalvando ? 0.6 : 1,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 90,
                              }}
                            >
                              <span style={{ fontSize: 16 }}>{st.emoji}</span>
                              <span>{o.label}</span>
                              <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>dia {o.vencimento}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gerais */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 10 }}>
                      OBRIGAÇÕES GERAIS
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {OBRIGACOES_GERAIS.map(o => {
                        const key = `${c.id}-${o.id}`
                        const status = statusMap[key] || 'pendente'
                        const st = STATUS_STYLE[status]
                        const isSalvando = salvando === key
                        return (
                          <button
                            key={o.id}
                            onClick={() => alterarStatus(c.id, o.id, proximoStatus(status))}
                            disabled={isSalvando}
                            title={`${o.label} — ${o.descricao}\nVencimento: dia ${o.vencimento}`}
                            style={{
                              padding: '10px 18px', borderRadius: 10,
                              border: `2px solid ${st.border}`,
                              background: st.bg, color: st.cor,
                              fontSize: 13, fontWeight: 700, cursor: 'pointer',
                              opacity: isSalvando ? 0.6 : 1,
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 90,
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{st.emoji}</span>
                            <span>{o.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>dia {o.vencimento}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}