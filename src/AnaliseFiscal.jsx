import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmtR   = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtPct = v => `${parseFloat(v || 0).toFixed(1)}%`

// ─── TESES COM CRITÉRIOS DE ELEGIBILIDADE ───────────────────────────────────

const TESES = [
  {
    id: 't01', titulo: 'Exclusão do ICMS-ST da Base do Simples Nacional',
    regimes: ['Simples Nacional'], probabilidade: 90, risco: 'baixo',
    criterio: (e, regime) => regime === 'Simples Nacional' && e.some(x => x.tributo?.includes('ICMS')),
    base_legal: 'Art. 18, §4º, IV da LC 123/2006 — STJ REsp 1.894.462',
  },
  {
    id: 't02', titulo: 'Receitas Monofásicas Tributadas Indevidamente',
    regimes: ['Simples Nacional'], probabilidade: 85, risco: 'baixo',
    criterio: (e, regime) => regime === 'Simples Nacional',
    base_legal: 'Art. 18, §4º, IV da LC 123/2006 — Lei 10.147/2000',
  },
  {
    id: 't03', titulo: 'Fator R — Migração do Anexo V para III',
    regimes: ['Simples Nacional'], probabilidade: 75, risco: 'baixo',
    criterio: (e, regime) => regime === 'Simples Nacional',
    base_legal: 'Art. 18, §5º-K da LC 123/2006',
  },
  {
    id: 't04', titulo: 'Exclusão do ICMS da Base do PIS/COFINS (Tema 69)',
    regimes: ['Lucro Presumido', 'Lucro Real'], probabilidade: 95, risco: 'baixo',
    criterio: (e, regime) => ['Lucro Presumido', 'Lucro Real'].includes(regime) && e.some(x => x.tributo?.includes('PIS') || x.tributo?.includes('COFINS')),
    base_legal: 'STF RE 574.706 — Tema 69',
  },
  {
    id: 't05', titulo: 'Créditos PIS/COFINS Não Cumulativos não Aproveitados',
    regimes: ['Lucro Real'], probabilidade: 80, risco: 'baixo',
    criterio: (e, regime) => regime === 'Lucro Real' && e.some(x => x.tributo?.includes('PIS') || x.tributo?.includes('COFINS')),
    base_legal: 'Leis 10.637/2002 e 10.833/2003',
  },
  {
    id: 't06', titulo: 'JCP — Juros sobre Capital Próprio',
    regimes: ['Lucro Real'], probabilidade: 70, risco: 'baixo',
    criterio: (e, regime) => regime === 'Lucro Real',
    base_legal: 'Art. 9º da Lei 9.249/1995',
  },
  {
    id: 't07', titulo: 'IRPJ/CSLL — Base de Presunção Incorreta',
    regimes: ['Lucro Presumido'], probabilidade: 75, risco: 'baixo',
    criterio: (e, regime) => regime === 'Lucro Presumido' && e.some(x => x.tributo?.includes('IRPJ') || x.tributo?.includes('CSLL')),
    base_legal: 'Art. 15 da Lei 9.249/1995',
  },
  {
    id: 't08', titulo: 'Retenções na Fonte não Compensadas (IRRF)',
    regimes: ['Lucro Presumido', 'Lucro Real'], probabilidade: 85, risco: 'baixo',
    criterio: (e, regime) => ['Lucro Presumido', 'Lucro Real'].includes(regime),
    base_legal: 'Art. 74 da Lei 9.430/1996',
  },
  {
    id: 't09', titulo: 'INSS sobre Verbas Indenizatórias',
    regimes: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'], probabilidade: 80, risco: 'baixo',
    criterio: (e, regime) => e.some(x => x.tributo?.includes('INSS')),
    base_legal: 'STF RE 569.056 — STJ REsp 1.230.957',
  },
  {
    id: 't10', titulo: 'Exclusão do ISS da Base do PIS/COFINS',
    regimes: ['Lucro Presumido', 'Lucro Real'], probabilidade: 65, risco: 'medio',
    criterio: (e, regime) => ['Lucro Presumido', 'Lucro Real'].includes(regime) && e.some(x => x.tributo?.includes('ISS')),
    base_legal: 'STF Tema 69 — RE 592.616',
  },
]

// ─── ANÁLISE DE DIVERGÊNCIAS ────────────────────────────────────────────────

function analisarDivergencias(entradas) {
  const divergencias = []

  // Agrupar por competência
  const porComp = {}
  entradas.forEach(e => {
    if (!porComp[e.competencia]) porComp[e.competencia] = []
    porComp[e.competencia].push(e)
  })

  Object.entries(porComp).forEach(([comp, ents]) => {
    const nfe    = ents.find(e => e.tributo === 'NF-e importada')
    const das    = ents.find(e => e.tributo === 'DAS')
    const pgdas  = ents.find(e => e.tributo === 'DAS' && e.receita_bruta > 0)
    const pis    = ents.find(e => e.tributo?.includes('PIS'))
    const cofins = ents.find(e => e.tributo?.includes('COFINS'))
    const icms   = ents.find(e => e.tributo?.includes('ICMS'))

    // Divergência 1: NF-e vs PGDAS
    if (nfe && pgdas) {
      const difFat = Math.abs(nfe.receita_bruta - pgdas.receita_bruta)
      const pct = pgdas.receita_bruta > 0 ? (difFat / pgdas.receita_bruta) * 100 : 0
      if (pct > 5) {
        divergencias.push({
          tipo: 'Divergência de Faturamento',
          competencia: comp,
          descricao: `Faturamento NF-e (${fmtR(nfe.receita_bruta)}) difere do PGDAS-D (${fmtR(pgdas.receita_bruta)}) em ${fmtPct(pct)}`,
          severidade: pct > 20 ? 'alta' : 'media',
          valor: difFat,
          acao: 'Revisar competência e corrigir PGDAS-D se necessário',
        })
      }
    }

    // Divergência 2: Tributo pago > devido
    ents.forEach(e => {
      if (e.tributo_pago > e.tributo_devido && e.tributo_devido > 0) {
        const excesso = e.tributo_pago - e.tributo_devido
        divergencias.push({
          tipo: 'Pagamento a Maior',
          competencia: comp,
          descricao: `${e.tributo}: pago ${fmtR(e.tributo_pago)} vs devido ${fmtR(e.tributo_devido)} — excesso de ${fmtR(excesso)}`,
          severidade: excesso > 1000 ? 'alta' : 'media',
          valor: excesso,
          acao: 'Verificar possibilidade de restituição ou compensação',
        })
      }
    })

    // Divergência 3: PIS/COFINS sem créditos
    if ((pis || cofins) && !icms) {
      const totalPisCofins = (pis?.tributo_pago || 0) + (cofins?.tributo_pago || 0)
      if (totalPisCofins > 0) {
        divergencias.push({
          tipo: 'Créditos PIS/COFINS não Aproveitados',
          competencia: comp,
          descricao: `PIS/COFINS pagos (${fmtR(totalPisCofins)}) sem registro de créditos de entrada`,
          severidade: 'media',
          valor: totalPisCofins * 0.3,
          acao: 'Verificar créditos de insumos, energia elétrica e demais entradas',
        })
      }
    }
  })

  return divergencias
}

// ─── ANÁLISE DE PRESCRIÇÃO ──────────────────────────────────────────────────

function analisarPrescricao(entradas) {
  const hoje = new Date()
  const alertas = []

  entradas.filter(e => e.credito > 0).forEach(e => {
    if (!e.competencia) return
    const [a, m] = e.competencia.split('-')
    const lim  = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    const dias = Math.round((lim - hoje) / (1000 * 60 * 60 * 24))

    if (dias <= 365 && dias > 0) {
      alertas.push({
        competencia: e.competencia,
        tributo:     e.tributo,
        credito:     e.credito,
        dias,
        lim,
        urgencia: dias <= 90 ? 'critica' : dias <= 180 ? 'alta' : 'media',
      })
    } else if (dias <= 0) {
      alertas.push({
        competencia: e.competencia,
        tributo:     e.tributo,
        credito:     e.credito,
        dias,
        lim,
        urgencia: 'prescrita',
      })
    }
  })

  return alertas.sort((a, b) => a.dias - b.dias)
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────

export default function AnaliseFiscal() {
  const [clientes,      setClientes]      = useState([])
  const [clienteId,     setClienteId]     = useState('')
  const [entradas,      setEntradas]      = useState([])
  const [loading,       setLoading]       = useState(false)
  const [analisado,     setAnalisado]     = useState(false)
  const [divergencias,  setDivergencias]  = useState([])
  const [prescricoes,   setPrescricoes]   = useState([])
  const [tesesElegiveis, setTesesElegiveis] = useState([])
  const [abaAtiva,      setAbaAtiva]      = useState('divergencias')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('clientes').select('id, razao_social, regime, cnpj, cnae_principal').eq('usuario_id', user.id).order('razao_social')
        .then(({ data }) => setClientes(data || []))
    })
  }, [])

  const cliente = clientes.find(c => c.id === clienteId)

  async function analisar() {
    if (!clienteId) return
    setLoading(true)
    setAnalisado(false)

    const { data: ents } = await supabase.from('entradas').select('*').eq('cliente_id', clienteId)
    setEntradas(ents || [])

    // Análises
    const divs  = analisarDivergencias(ents || [])
    const presc = analisarPrescricao(ents || [])
    const teses = TESES.filter(t => t.criterio(ents || [], cliente?.regime || ''))
      .sort((a, b) => b.probabilidade - a.probabilidade)

    setDivergencias(divs)
    setPrescricoes(presc)
    setTesesElegiveis(teses)
    setAnalisado(true)
    setLoading(false)
  }

  function exportarPDF() {
    const doc  = new jsPDF()
    const hoje = new Date().toLocaleDateString('pt-BR')

    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, 210, 32, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('FiscalTrib — Análise Inteligente', 14, 14)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Cliente: ${cliente?.razao_social} | Emitido em: ${hoje}`, 14, 24)

    // Divergências
    if (divergencias.length > 0) {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95)
      doc.text('Divergências Identificadas', 14, 44)
      autoTable(doc, {
        startY: 48,
        head: [['Tipo', 'Competência', 'Descrição', 'Valor', 'Ação']],
        body: divergencias.map(d => [d.tipo, d.competencia, d.descricao, fmtR(d.valor), d.acao]),
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 8 },
        columnStyles: { 2: { cellWidth: 60 }, 4: { cellWidth: 45 } },
      })
    }

    // Teses
    if (tesesElegiveis.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY + 10 || 48,
        head: [['Tese', 'Probabilidade', 'Risco', 'Base Legal']],
        body: tesesElegiveis.map(t => [t.titulo, `${t.probabilidade}%`, t.risco, t.base_legal]),
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 8 },
      })
    }

    doc.setFontSize(8); doc.setTextColor(148, 163, 184)
    doc.text('FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária | fiscaltrib.com.br', 14, 285)
    doc.save(`Analise_Fiscal_${cliente?.razao_social?.replace(/\s/g, '_')}_${hoje.replace(/\//g, '-')}.pdf`)
  }

  // KPIs
  const totalDivergencias   = divergencias.length
  const valorDivergencias   = divergencias.reduce((s, d) => s + (d.valor || 0), 0)
  const prescCriticas        = prescricoes.filter(p => p.urgencia === 'critica').length
  const valorPrescritos      = prescricoes.filter(p => p.urgencia === 'prescrita').reduce((s, p) => s + p.credito, 0)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #1e3a5f 100%)', borderRadius: '0 0 24px 24px', padding: '36px 40px 40px', marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — INTELIGÊNCIA TRIBUTÁRIA</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, color: '#fff' }}>🔬 Análise Inteligente</h1>
          <p style={{ fontSize: 16, color: '#a5b4fc', marginBottom: 28, lineHeight: 1.6, maxWidth: 560 }}>
            Cruzamento automático de dados fiscais, identificação de divergências, alertas de prescrição e elegibilidade por tese tributária.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { valor: analisado ? totalDivergencias       : '—', label: 'Divergências encontradas', cor: '#f87171' },
              { valor: analisado ? fmtR(valorDivergencias) : '—', label: 'Valor das divergências',   cor: '#fbbf24' },
              { valor: analisado ? prescCriticas           : '—', label: 'Prazos críticos (90d)',     cor: '#f472b6' },
              { valor: analisado ? tesesElegiveis.length   : '—', label: 'Teses elegíveis',           cor: '#4ade80' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: c.cor, marginBottom: 4 }}>{c.valor}</div>
                <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SELETOR + BOTÃO */}
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', display: 'block', marginBottom: 10 }}>👤 Selecione o cliente para analisar:</label>
          <select value={clienteId} onChange={e => { setClienteId(e.target.value); setAnalisado(false) }}
            style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc' }}>
            <option value="">— Escolha um cliente —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} ({c.regime})</option>)}
          </select>
        </div>
        <button onClick={analisar} disabled={!clienteId || loading}
          style={{ padding: '12px 28px', background: clienteId ? '#3730a3' : '#e2e8f0', color: clienteId ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: clienteId ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
          {loading ? '⏳ Analisando...' : '🔬 Executar Análise'}
        </button>
        {analisado && (
          <button onClick={exportarPDF}
            style={{ padding: '12px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📄 Exportar PDF
          </button>
        )}
      </div>

      {/* RESULTADO */}
      {!analisado && !loading && (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Selecione um cliente e execute a análise</div>
          <div style={{ fontSize: 14 }}>O sistema vai cruzar todos os dados fiscais importados automaticamente</div>
        </div>
      )}

      {analisado && (
        <>
          {/* ABAS */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { id: 'divergencias', label: `⚠️ Divergências (${divergencias.length})`,    cor: '#dc2626' },
              { id: 'prescricao',   label: `⏳ Prescrição (${prescricoes.length})`,         cor: '#f97316' },
              { id: 'teses',        label: `📚 Teses Elegíveis (${tesesElegiveis.length})`, cor: '#7c3aed' },
            ].map(a => (
              <button key={a.id} onClick={() => setAbaAtiva(a.id)} style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                border: `2px solid ${abaAtiva === a.id ? a.cor : '#e2e8f0'}`,
                background: abaAtiva === a.id ? a.cor : '#fff',
                color: abaAtiva === a.id ? '#fff' : '#374151',
              }}>{a.label}</button>
            ))}
          </div>

          {/* ABA DIVERGÊNCIAS */}
          {abaAtiva === 'divergencias' && (
            <div>
              {divergencias.length === 0 ? (
                <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>Nenhuma divergência encontrada!</div>
                  <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>Os dados fiscais estão consistentes.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Resumo */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 8 }}>
                    {[
                      { label: 'Total divergências', valor: divergencias.length, cor: '#dc2626', bg: '#fff1f2' },
                      { label: 'Valor total', valor: fmtR(valorDivergencias), cor: '#d97706', bg: '#fffbeb' },
                      { label: 'Alta severidade', valor: divergencias.filter(d => d.severidade === 'alta').length, cor: '#dc2626', bg: '#fff1f2' },
                    ].map((c, i) => (
                      <div key={i} style={{ background: c.bg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${c.cor}33` }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: c.cor }}>{c.valor}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  {divergencias.map((d, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 14, border: `2px solid ${d.severidade === 'alta' ? '#fecdd3' : '#fde68a'}`, padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, background: d.severidade === 'alta' ? '#fff1f2' : '#fffbeb', color: d.severidade === 'alta' ? '#dc2626' : '#d97706', padding: '3px 10px', borderRadius: 99 }}>
                              {d.severidade === 'alta' ? '🔴 Alta severidade' : '🟡 Média severidade'}
                            </span>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Competência: {d.competencia}</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{d.tipo}</div>
                          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{d.descricao}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{fmtR(d.valor)}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>valor envolvido</div>
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e3a5f', fontWeight: 600 }}>
                        💡 Ação recomendada: {d.acao}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA PRESCRIÇÃO */}
          {abaAtiva === 'prescricao' && (
            <div>
              {prescricoes.length === 0 ? (
                <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>Nenhum prazo crítico!</div>
                  <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>Todas as competências estão dentro do prazo confortável.</div>
                </div>
              ) : (
                <div>
                  {valorPrescritos > 0 && (
                    <div style={{ background: '#fff1f2', border: '2px solid #fecdd3', borderRadius: 14, padding: '16px 24px', marginBottom: 20 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>⚠️ Atenção: {fmtR(valorPrescritos)} em créditos prescritos!</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Esses créditos não podem mais ser recuperados.</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {prescricoes.map((p, i) => {
                      const cores = {
                        critica:  { bg: '#fff1f2', border: '#fecdd3', cor: '#dc2626', label: '🔴 CRÍTICO — menos de 90 dias!' },
                        alta:     { bg: '#fff7ed', border: '#fed7aa', cor: '#f97316', label: '🟠 URGENTE — menos de 180 dias' },
                        media:    { bg: '#fffbeb', border: '#fde68a', cor: '#d97706', label: '🟡 ATENÇÃO — menos de 1 ano'    },
                        prescrita:{ bg: '#f8fafc', border: '#e2e8f0', cor: '#94a3b8', label: '⚫ PRESCRITO'                   },
                      }
                      const c = cores[p.urgencia] || cores.media
                      return (
                        <div key={i} style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 14, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: c.cor, marginBottom: 6 }}>{c.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{p.competencia} — {p.tributo}</div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>
                              Prazo: {p.lim.toLocaleDateString('pt-BR')} · {p.dias > 0 ? `${p.dias} dias restantes` : 'Prazo encerrado'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: c.cor }}>{fmtR(p.credito)}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>crédito em risco</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA TESES */}
          {abaAtiva === 'teses' && (
            <div>
              {tesesElegiveis.length === 0 ? (
                <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 16, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Nenhuma tese elegível identificada</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {tesesElegiveis.map((t, i) => {
                    const riscoCor = t.risco === 'baixo' ? { cor: '#16a34a', bg: '#f0fdf4', label: '🟢 Baixo risco' } : t.risco === 'medio' ? { cor: '#d97706', bg: '#fffbeb', label: '🟡 Médio risco' } : { cor: '#dc2626', bg: '#fff1f2', label: '🔴 Alto risco' }
                    return (
                      <div key={t.id} style={{ background: '#fff', borderRadius: 14, border: '2px solid #ddd6fe', padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: riscoCor.bg, color: riscoCor.cor, padding: '3px 10px', borderRadius: 99 }}>{riscoCor.label}</span>
                              {t.regimes.map(r => <span key={r} style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1e40af', padding: '3px 10px', borderRadius: 99 }}>{r}</span>)}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{t.titulo}</div>
                            <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>⚖️ {t.base_legal}</div>
                          </div>
                          <div style={{ textAlign: 'center', marginLeft: 20, flexShrink: 0 }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: t.probabilidade >= 80 ? '#16a34a' : t.probabilidade >= 60 ? '#d97706' : '#dc2626' }}>
                              {t.probabilidade}%
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>prob. êxito</div>
                            {/* Barra de probabilidade */}
                            <div style={{ width: 80, background: '#f1f5f9', borderRadius: 99, height: 6, marginTop: 6 }}>
                              <div style={{ background: t.probabilidade >= 80 ? '#16a34a' : t.probabilidade >= 60 ? '#d97706' : '#dc2626', borderRadius: 99, height: 6, width: `${t.probabilidade}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}