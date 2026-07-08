import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TESES = [
  // ── SIMPLES NACIONAL ──
  {
    id: 't01', regime: ['Simples Nacional'],
    titulo: 'Exclusão do ICMS-ST da Base do Simples Nacional',
    descricao: 'Empresas optantes pelo Simples Nacional que operam com substituição tributária têm direito à exclusão do ICMS-ST da base de cálculo do DAS, evitando dupla tributação.',
    base_legal: 'Art. 18, §4º, IV da LC 123/2006 — STJ REsp 1.894.462',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't02', regime: ['Simples Nacional'],
    titulo: 'Receitas Monofásicas Tributadas Indevidamente',
    descricao: 'Empresas que comercializam produtos sujeitos à tributação monofásica (combustíveis, medicamentos, autopeças, etc.) não devem recolher PIS/COFINS novamente no Simples Nacional.',
    base_legal: 'Art. 18, §4º, IV da LC 123/2006 — Lei 10.147/2000',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't03', regime: ['Simples Nacional'],
    titulo: 'Segregação de Receitas por Anexo Incorreto',
    descricao: 'Empresas com múltiplas atividades enquadradas em anexos diferentes podem ter pago alíquota maior do que o devido por não segregar corretamente as receitas por CNAE.',
    base_legal: 'Art. 18, §§ 4º e 5º da LC 123/2006',
    risco: 'baixo',
    potencial: 'Médio',
    categoria: 'Enquadramento',
    regimes_excluidos: [],
  },
  {
    id: 't04', regime: ['Simples Nacional'],
    titulo: 'Fator R — Migração do Anexo V para o III',
    descricao: 'Empresas de serviços com folha de salários equivalente a 28% ou mais da receita bruta podem ser tributadas pelo Anexo III (menor alíquota) em vez do Anexo V.',
    base_legal: 'Art. 18, §5º-K da LC 123/2006',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Planejamento',
    regimes_excluidos: [],
  },
  {
    id: 't05', regime: ['Simples Nacional'],
    titulo: 'ISS Fixo para Profissional Autônomo',
    descricao: 'Profissionais liberais optantes pelo Simples podem ter direito ao recolhimento de ISS fixo municipal em vez da alíquota proporcional, reduzindo a carga tributária.',
    base_legal: 'Art. 9º do DL 406/1968 — LC 116/2003',
    risco: 'médio',
    potencial: 'Médio',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },

  // ── LUCRO PRESUMIDO ──
  {
    id: 't06', regime: ['Lucro Presumido'],
    titulo: 'PIS/COFINS — Insumos Tributados Indevidamente',
    descricao: 'Empresas do Lucro Presumido no regime cumulativo podem ter recolhido PIS/COFINS sobre receitas que deveriam ter alíquota zero ou isenção, como exportações e operações com imunidade.',
    base_legal: 'Leis 9.718/1998, 10.637/2002 e 10.833/2003',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't07', regime: ['Lucro Presumido'],
    titulo: 'IRPJ/CSLL — Base de Presunção Incorreta',
    descricao: 'A base de presunção do IRPJ/CSLL varia conforme a atividade (8%, 16% ou 32%). Empresas que aplicaram percentual maior do que o devido têm direito à restituição.',
    base_legal: 'Art. 15 da Lei 9.249/1995 — RIR/2018 Art. 591',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't08', regime: ['Lucro Presumido'],
    titulo: 'Retenções na Fonte não Compensadas (IRRF)',
    descricao: 'Valores retidos na fonte (IRRF, CSLL, PIS, COFINS) sobre serviços prestados podem ser compensados com tributos a pagar, reduzindo o desembolso ou gerando restituição.',
    base_legal: 'Art. 74 da Lei 9.430/1996 — IN RFB 2.055/2021',
    risco: 'baixo',
    potencial: 'Médio',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't09', regime: ['Lucro Presumido'],
    titulo: 'CSLL — Alíquota Diferenciada por Atividade',
    descricao: 'Instituições financeiras e seguradoras recolhem CSLL a 20%. Empresas de outros setores que pagaram alíquota maior por erro de enquadramento têm direito à restituição.',
    base_legal: 'Art. 3º da Lei 7.689/1988 — Lei 13.169/2015',
    risco: 'baixo',
    potencial: 'Médio',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't10', regime: ['Lucro Presumido'],
    titulo: 'Distribuição de Lucros sem Incidência de IR',
    descricao: 'Lucros apurados contabilmente acima do lucro presumido podem ser distribuídos aos sócios com isenção de IR, desde que haja escrituração contábil regular.',
    base_legal: 'Art. 10 da Lei 9.249/1995',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Planejamento',
    regimes_excluidos: [],
  },

  // ── LUCRO REAL ──
  {
    id: 't11', regime: ['Lucro Real'],
    titulo: 'Créditos de PIS/COFINS Não Cumulativos não Aproveitados',
    descricao: 'Empresas do Lucro Real têm direito a créditos de PIS/COFINS sobre insumos, energia elétrica, aluguéis, depreciação e outros. Créditos não aproveitados podem ser recuperados retroativamente.',
    base_legal: 'Leis 10.637/2002 e 10.833/2003 — STJ REsp 1.221.170',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't12', regime: ['Lucro Real'],
    titulo: 'JCP — Juros sobre Capital Próprio',
    descricao: 'A remuneração do capital próprio via JCP é dedutível da base do IRPJ e CSLL, reduzindo significativamente a carga tributária de empresas lucrativas.',
    base_legal: 'Art. 9º da Lei 9.249/1995 — IN RFB 1.700/2017',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Planejamento',
    regimes_excluidos: [],
  },
  {
    id: 't13', regime: ['Lucro Real'],
    titulo: 'Compensação de Prejuízos Fiscais (IRPJ/CSLL)',
    descricao: 'Prejuízos fiscais acumulados podem ser compensados com lucros futuros, limitado a 30% do lucro real por período. Muitas empresas não utilizam esse benefício adequadamente.',
    base_legal: 'Art. 509 do RIR/2018 — Art. 15 da Lei 9.065/1995',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Planejamento',
    regimes_excluidos: [],
  },
  {
    id: 't14', regime: ['Lucro Real'],
    titulo: 'Depreciação Acelerada de Ativos',
    descricao: 'Bens do ativo imobilizado usados em mais de um turno de trabalho têm direito à depreciação acelerada, reduzindo a base de cálculo do IRPJ e CSLL.',
    base_legal: 'Art. 312 do RIR/2018 — IN SRF 162/1998',
    risco: 'baixo',
    potencial: 'Médio',
    categoria: 'Planejamento',
    regimes_excluidos: [],
  },
  {
    id: 't15', regime: ['Lucro Real'],
    titulo: 'ICMS — Créditos de Entradas não Aproveitados',
    descricao: 'Créditos de ICMS sobre entradas de mercadorias e insumos não aproveitados ou estornados indevidamente podem ser recuperados mediante revisão dos registros fiscais.',
    base_legal: 'Art. 20 da LC 87/1996 (Lei Kandir)',
    risco: 'médio',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },

  // ── TODAS OS REGIMES ──
  {
    id: 't16', regime: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    titulo: 'INSS sobre Verbas Indenizatórias',
    descricao: 'Contribuições previdenciárias recolhidas indevidamente sobre verbas de natureza indenizatória (férias proporcionais, aviso prévio indenizado, etc.) podem ser recuperadas.',
    base_legal: 'STF RE 569.056 — STJ REsp 1.230.957',
    risco: 'baixo',
    potencial: 'Médio',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't17', regime: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    titulo: 'Exclusão do ISS da Base do PIS/COFINS',
    descricao: 'Seguindo o precedente da exclusão do ICMS (Tema 69/STF), empresas prestadoras de serviços podem excluir o ISS da base de cálculo do PIS e COFINS.',
    base_legal: 'STF Tema 69 — RE 592.616 (Tema 634)',
    risco: 'médio',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't18', regime: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    titulo: 'CSLL — Inconstitucionalidade de Alíquotas Majoradas',
    descricao: 'Majorações de alíquota da CSLL aplicadas sem observância da anterioridade nonagesimal geram direito à restituição dos valores recolhidos no período de vedação.',
    base_legal: 'Art. 150, III, "c" da CF/88 — STF ADI 2.010',
    risco: 'médio',
    potencial: 'Médio',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't19', regime: ['Lucro Presumido', 'Lucro Real'],
    titulo: 'Exclusão do ICMS da Base do PIS/COFINS (Tema 69)',
    descricao: 'Tese firmada pelo STF: o ICMS destacado na nota fiscal não integra a base de cálculo do PIS e COFINS. Uma das maiores teses tributárias da história, com bilhões em restituições.',
    base_legal: 'STF RE 574.706 — Tema 69 — modulação de efeitos a partir de 15/03/2017',
    risco: 'baixo',
    potencial: 'Alto',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
  {
    id: 't20', regime: ['Lucro Presumido', 'Lucro Real'],
    titulo: 'PIS/COFINS sobre Receitas Financeiras — Alíquota Zero',
    descricao: 'O Decreto 8.426/2015 restabeleceu alíquotas de PIS/COFINS sobre receitas financeiras. Empresas questionam a constitucionalidade dessa cobrança por violação à legalidade tributária.',
    base_legal: 'STF RE 1.043.313 — Tema 939',
    risco: 'médio',
    potencial: 'Médio',
    categoria: 'Crédito',
    regimes_excluidos: [],
  },
]

const CATEGORIAS = ['Todas', 'Crédito', 'Planejamento', 'Enquadramento']
const REGIMES_FILTRO = ['Todos', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']

const RISCO_STYLE = {
  baixo:  { bg: '#f0fdf4', border: '#86efac', texto: '#166534', label: '🟢 Baixo' },
  médio:  { bg: '#fffbeb', border: '#fde68a', texto: '#92400e', label: '🟡 Médio' },
  alto:   { bg: '#fff1f2', border: '#fecdd3', texto: '#9f1239', label: '🔴 Alto'  },
}

const POTENCIAL_STYLE = {
  Alto:   { cor: '#16a34a', bg: '#f0fdf4' },
  Médio:  { cor: '#d97706', bg: '#fffbeb' },
  Baixo:  { cor: '#dc2626', bg: '#fff1f2' },
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

function exportarPDF(teses, filtroRegime, filtroCategoria) {
  const doc = new jsPDF()
  const hoje = new Date().toLocaleDateString('pt-BR')

  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('FiscalTrib — Painel de Teses Tributárias', 14, 14)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`Emitido em: ${hoje} | Regime: ${filtroRegime} | Categoria: ${filtroCategoria}`, 14, 24)

  autoTable(doc, {
    startY: 40,
    head: [['Tese', 'Regime', 'Categoria', 'Risco', 'Potencial', 'Base Legal']],
    body: teses.map(t => [
      t.titulo,
      t.regime.join(', '),
      t.categoria,
      t.risco,
      t.potencial,
      t.base_legal,
    ]),
    headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 55 }, 5: { cellWidth: 45 } },
  })

  doc.setFontSize(8); doc.setTextColor(148, 163, 184)
  doc.text('FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária | fiscaltrib.com.br', 14, 285)
  doc.save(`Teses_Tributarias_${hoje.replace(/\//g, '-')}.pdf`)
}

export default function TesesTributarias() {
  const isMobile = useIsMobile()
  const [filtroRegime,    setFiltroRegime]    = useState('Todos')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroRisco,     setFiltroRisco]     = useState('Todos')
  const [busca,           setBusca]           = useState('')
  const [expandida,       setExpandida]       = useState(null)

  const tesesFiltradas = TESES.filter(t => {
    const matchRegime    = filtroRegime === 'Todos' || t.regime.includes(filtroRegime)
    const matchCategoria = filtroCategoria === 'Todas' || t.categoria === filtroCategoria
    const matchRisco     = filtroRisco === 'Todos' || t.risco === filtroRisco.toLowerCase()
    const matchBusca     = !busca || t.titulo.toLowerCase().includes(busca.toLowerCase()) || t.descricao.toLowerCase().includes(busca.toLowerCase())
    return matchRegime && matchCategoria && matchRisco && matchBusca
  })

  const totalBaixoRisco = TESES.filter(t => t.risco === 'baixo').length
  const totalAlto       = TESES.filter(t => t.potencial === 'Alto').length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 40px', boxSizing: 'border-box' }}>

      {/* ── BANNER TOPO ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2444 60%, #1e3a5f 100%)', borderRadius: '0 0 24px 24px', padding: isMobile ? '24px 20px 28px' : '36px 40px 40px', marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>

        {/* Decoração de fundo */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — INTELIGÊNCIA TRIBUTÁRIA</div>
          <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, marginBottom: 8, lineHeight: 1.2, color: '#fff' }}>
            🏛️ Painel de Teses Tributárias
          </h1>
          <p style={{ fontSize: isMobile ? 14 : 16, color: '#9db8d8', marginBottom: isMobile ? 20 : 32, lineHeight: 1.6, maxWidth: 560 }}>
            Recupere o que é seu por direito. Teses jurídicas e tributárias validadas para identificar oportunidades de restituição e redução da carga tributária.
          </p>

          {/* Cards de indicadores */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16 }}>
            {[
              { valor: TESES.length,      label: 'Teses disponíveis',    cor: '#60a5fa' },
              { valor: totalBaixoRisco,   label: 'Baixo risco',          cor: '#4ade80' },
              { valor: totalAlto,         label: 'Alto potencial',        cor: '#fbbf24' },
              { valor: '5 anos',          label: 'Prazo prescricional',   cor: '#f472b6' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: isMobile ? '12px 14px' : '16px 20px', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0, boxSizing: 'border-box' }}>
                <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: c.cor, marginBottom: 4 }}>{c.valor}</div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#9db8d8', fontWeight: 600, lineHeight: 1.3 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: isMobile ? '18px 18px' : '24px 28px', marginBottom: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>

          {/* Busca */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', display: 'block', marginBottom: 8 }}>🔍 Buscar tese</label>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Digite o nome ou palavra-chave..."
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', color: '#374151' }}
            />
          </div>

          {/* Regime */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', display: 'block', marginBottom: 8 }}>📋 Regime</label>
            <select value={filtroRegime} onChange={e => setFiltroRegime(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc', boxSizing: 'border-box' }}>
              {REGIMES_FILTRO.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', display: 'block', marginBottom: 8 }}>🏷️ Categoria</label>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc', boxSizing: 'border-box' }}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Risco */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', display: 'block', marginBottom: 8 }}>⚡ Risco</label>
            <select value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc', boxSizing: 'border-box' }}>
              {['Todos', 'Baixo', 'Médio', 'Alto'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Resultado + exportar */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0, justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
            {tesesFiltradas.length} {tesesFiltradas.length === 1 ? 'tese encontrada' : 'teses encontradas'}
          </span>
          <button
            onClick={() => exportarPDF(tesesFiltradas, filtroRegime, filtroCategoria)}
            style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
          >
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* ── LISTA DE TESES ── */}
      {tesesFiltradas.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Nenhuma tese encontrada</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Tente ajustar os filtros</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tesesFiltradas.map(t => {
            const aberta = expandida === t.id
            const risco  = RISCO_STYLE[t.risco]
            const pot    = POTENCIAL_STYLE[t.potencial]

            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}>

                {/* Cabeçalho da tese */}
                <div
                  onClick={() => setExpandida(aberta ? null : t.id)}
                  style={{ padding: isMobile ? '16px 18px' : '20px 28px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges topo */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {t.regime.map(r => (
                        <span key={r} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>{r}</span>
                      ))}
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' }}>{t.categoria}</span>
                    </div>

                    <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: '#1e293b', marginBottom: 6, lineHeight: 1.4 }}>{t.titulo}</div>

                    {/* Badges risco e potencial */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: risco.bg, color: risco.texto, border: `1px solid ${risco.border}` }}>
                        {risco.label} risco
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: pot.bg, color: pot.cor, border: `1px solid ${pot.cor}33` }}>
                        💰 Potencial {t.potencial}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 20, color: '#94a3b8', flexShrink: 0, marginTop: 4 }}>
                    {aberta ? '▲' : '▼'}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {aberta && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: isMobile ? '18px 18px' : '24px 28px', background: '#fafafa' }}>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>📝 Descrição</div>
                      <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.8, margin: 0 }}>{t.descricao}</p>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>⚖️ Base Legal</div>
                      <p style={{ fontSize: 14, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>{t.base_legal}</p>
                    </div>

                    <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                      ⚠️ Esta tese é de caráter informativo. Consulte um advogado tributarista ou contador habilitado antes de ingressar com pedido de restituição.
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}