import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUS_PIPELINE = [
  { id: 'Diagnóstico Concluído', cor: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', emoji: '🔍' },
  { id: 'Em Preparação',         cor: '#f59e0b', bg: '#fffbeb', border: '#fde68a', emoji: '📋' },
  { id: 'PerdeComp Enviado',     cor: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', emoji: '📤' },
  { id: 'Em Análise',            cor: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', emoji: '🔎' },
  { id: 'Exigência Fiscal',      cor: '#f97316', bg: '#fff7ed', border: '#fed7aa', emoji: '⚠️' },
  { id: 'Homologado',            cor: '#10b981', bg: '#f0fdf4', border: '#86efac', emoji: '✅' },
  { id: 'Recuperado',            cor: '#16a34a', bg: '#dcfce7', border: '#4ade80', emoji: '💰' },
  { id: 'Encerrado',             cor: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', emoji: '🔒' },
]

const RISCO_STYLE = {
  baixo: { cor: '#16a34a', bg: '#f0fdf4', label: '🟢 Baixo' },
  medio: { cor: '#d97706', bg: '#fffbeb', label: '🟡 Médio' },
  alto:  { cor: '#dc2626', bg: '#fff1f2', label: '🔴 Alto'  },
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleDateString('pt-BR') : '—'

function exportarPDF(recuperacoes, clientes) {
  const doc = new jsPDF('landscape')
  const hoje = new Date().toLocaleDateString('pt-BR')

  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 297, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('FiscalTrib — Gestão de Recuperações Tributárias', 14, 12)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`Emitido em: ${hoje} | Total: ${recuperacoes.length} processos`, 14, 22)

  autoTable(doc, {
    startY: 35,
    head: [['Cliente', 'Competência', 'Tributo', 'Crédito', 'Potencial', 'Tese', 'Risco', 'Status', 'Identificado']],
    body: recuperacoes.map(r => [
      clientes.find(c => c.id === r.cliente_id)?.razao_social || '—',
      r.competencia || '—',
      r.tributo || '—',
      fmtR(r.valor_credito),
      fmtR(r.potencial_recuperavel),
      r.tese_aplicada || '—',
      r.risco || '—',
      r.status || '—',
      fmtData(r.data_identificacao),
    ]),
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 3 },
  })

  doc.setFontSize(8); doc.setTextColor(148, 163, 184)
  doc.text('FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária | fiscaltrib.com.br', 14, 200)
  doc.save(`Recuperacoes_${hoje.replace(/\//g, '-')}.pdf`)
}

export default function GestaoRecuperacoes() {
  const [recuperacoes, setRecuperacoes] = useState([])
  const [clientes,     setClientes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [filtroRisco,  setFiltroRisco]  = useState('Todos')
  const [view,         setView]         = useState('pipeline') // pipeline | lista
  const [editando,     setEditando]     = useState(null)
  const [salvando,     setSalvando]     = useState(false)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cli } = await supabase.from('clientes').select('id, razao_social, regime, cnpj').eq('usuario_id', user.id)
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
    if (novoStatus === 'PerdeComp Enviado') updates.data_protocolo = new Date().toISOString()
    if (novoStatus === 'Homologado')        updates.data_homologacao = new Date().toISOString()
    if (novoStatus === 'Recuperado')        updates.data_recuperacao = new Date().toISOString()

    const { error } = await supabase.from('recuperacoes').update(updates).eq('id', id)
    if (!error) setRecuperacoes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    setSalvando(null)
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(editando.id)
    const { error } = await supabase.from('recuperacoes').update({
      valor_homologado:      editando.valor_homologado,
      valor_recuperado:      editando.valor_recuperado,
      observacoes:           editando.observacoes,
      tese_aplicada:         editando.tese_aplicada,
      updated_at:            new Date().toISOString(),
    }).eq('id', editando.id)
    if (!error) {
      setRecuperacoes(prev => prev.map(r => r.id === editando.id ? { ...r, ...editando } : r))
      setEditando(null)
    }
    setSalvando(null)
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este processo?')) return
    await supabase.from('recuperacoes').delete().eq('id', id)
    setRecuperacoes(prev => prev.filter(r => r.id !== id))
  }

  const filtradas = recuperacoes.filter(r => {
    const matchStatus = filtroStatus === 'Todos' || r.status === filtroStatus
    const matchRisco  = filtroRisco  === 'Todos' || r.risco  === filtroRisco.toLowerCase()
    return matchStatus && matchRisco
  })

  // KPIs
  const totalCredito    = recuperacoes.reduce((s, r) => s + (r.valor_credito || 0), 0)
  const totalPotencial  = recuperacoes.reduce((s, r) => s + (r.potencial_recuperavel || 0), 0)
  const totalHomologado = recuperacoes.reduce((s, r) => s + (r.valor_homologado || 0), 0)
  const totalRecuperado = recuperacoes.reduce((s, r) => s + (r.valor_recuperado || 0), 0)
  const emAndamento     = recuperacoes.filter(r => !['Recuperado', 'Encerrado'].includes(r.status)).length
  const recuperados     = recuperacoes.filter(r => r.status === 'Recuperado').length

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#1e3a5f', fontSize: 16 }}>Carregando recuperações...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 50%, #16a34a 100%)', borderRadius: '0 0 24px 24px', padding: '36px 40px 40px', marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — GESTÃO TRIBUTÁRIA</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, color: '#fff' }}>💼 Gestão de Recuperações</h1>
          <p style={{ fontSize: 16, color: '#9db8d8', marginBottom: 28, lineHeight: 1.6, maxWidth: 560 }}>
            Acompanhe todos os processos de recuperação tributária em um único painel. Do diagnóstico ao recebimento.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { valor: fmtR(totalCredito),    label: 'Créditos identificados', cor: '#60a5fa' },
              { valor: fmtR(totalPotencial),  label: 'Potencial recuperável',  cor: '#4ade80' },
              { valor: fmtR(totalHomologado), label: 'Homologados',            cor: '#fbbf24' },
              { valor: fmtR(totalRecuperado), label: 'Efetivamente recuperado', cor: '#f472b6' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: c.cor, marginBottom: 4 }}>{c.valor}</div>
                <div style={{ fontSize: 11, color: '#9db8d8', fontWeight: 600 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '2px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {[['pipeline', '📊 Pipeline'], ['lista', '📋 Lista']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '8px 16px', background: view === v ? '#1e3a5f' : '#fff', color: view === v ? '#fff' : '#64748b', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>

          {/* Filtro status */}
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: '8px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#374151', background: '#f8fafc' }}>
            <option value="Todos">Todos os status</option>
            {STATUS_PIPELINE.map(s => <option key={s.id}>{s.id}</option>)}
          </select>

          {/* Filtro risco */}
          <select value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)}
            style={{ padding: '8px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#374151', background: '#f8fafc' }}>
            <option value="Todos">Todos os riscos</option>
            <option>Baixo</option><option>Médio</option><option>Alto</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center' }}>{filtradas.length} processo(s)</span>
          <button onClick={() => exportarPDF(filtradas, clientes)} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* VAZIO */}
      {recuperacoes.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💼</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhum processo de recuperação</div>
          <div style={{ fontSize: 14 }}>Importe arquivos na Central de Importações e clique em "Iniciar Processo de Recuperação"</div>
        </div>
      )}

      {/* VIEW PIPELINE */}
      {view === 'pipeline' && recuperacoes.length > 0 && (
        <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, minWidth: 900 }}>
            {STATUS_PIPELINE.map(st => {
              const itens = filtradas.filter(r => r.status === st.id)
              return (
                <div key={st.id} style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ background: st.bg, border: `2px solid ${st.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{st.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: st.cor, lineHeight: 1.3 }}>{st.id}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: st.cor, marginTop: 4 }}>{itens.length}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {itens.map(r => {
                      const cli = clientes.find(c => c.id === r.cliente_id)
                      const risco = RISCO_STYLE[r.risco] || RISCO_STYLE.baixo
                      return (
                        <div key={r.id} style={{ background: '#fff', border: `1px solid ${st.border}`, borderRadius: 10, padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4, lineHeight: 1.3 }}>{cli?.razao_social || '—'}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{r.tributo} · {r.competencia}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>{fmtR(r.valor_credito)}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, background: risco.bg, color: risco.cor, padding: '2px 6px', borderRadius: 99, fontWeight: 700 }}>{risco.label}</span>
                            <button onClick={() => setEditando(r)} style={{ fontSize: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>✏️</button>
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
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Cliente', 'Competência', 'Tributo', 'Crédito', 'Potencial', 'Tese', 'Risco', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(r => {
                const cli    = clientes.find(c => c.id === r.cliente_id)
                const st     = STATUS_PIPELINE.find(s => s.id === r.status) || STATUS_PIPELINE[0]
                const risco  = RISCO_STYLE[r.risco] || RISCO_STYLE.baixo
                const isSalv = salvando === r.id
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, maxWidth: 160 }}>
                      <div>{cli?.razao_social || '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{cli?.regime}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.competencia || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{r.tributo || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>{fmtR(r.valor_credito)}</td>
                    <td style={{ padding: '12px 16px', color: '#1e40af' }}>{fmtR(r.potencial_recuperavel)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 11, maxWidth: 140 }}>{r.tese_aplicada || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: risco.bg, color: risco.cor, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{risco.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={r.status} onChange={e => atualizarStatus(r.id, e.target.value)} disabled={isSalv}
                        style={{ padding: '6px 10px', border: `2px solid ${st.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: st.cor, background: st.bg, cursor: 'pointer' }}>
                        {STATUS_PIPELINE.map(s => <option key={s.id}>{s.id}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditando(r)} style={{ padding: '5px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✏️</button>
                        <button onClick={() => excluir(r.id)} style={{ padding: '5px 10px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL EDIÇÃO */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', marginBottom: 20 }}>✏️ Editar Processo</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Valor Homologado (R$)', key: 'valor_homologado' },
                { label: 'Valor Recuperado (R$)',  key: 'valor_recuperado' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input
                    type="number"
                    value={editando[key] || ''}
                    onChange={e => setEditando(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tese Aplicada</label>
              <input
                value={editando.tese_aplicada || ''}
                onChange={e => setEditando(prev => ({ ...prev, tese_aplicada: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Observações</label>
              <textarea
                value={editando.observacoes || ''}
                onChange={e => setEditando(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={4}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            {/* Datas */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#64748b' }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>📅 Datas do processo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>Identificação: <strong>{fmtData(editando.data_identificacao)}</strong></div>
                <div>Protocolo: <strong>{fmtData(editando.data_protocolo)}</strong></div>
                <div>Homologação: <strong>{fmtData(editando.data_homologacao)}</strong></div>
                <div>Recuperação: <strong>{fmtData(editando.data_recuperacao)}</strong></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setEditando(null)} style={{ padding: '12px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={!!salvando} style={{ flex: 1, padding: '12px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : '💾 Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}