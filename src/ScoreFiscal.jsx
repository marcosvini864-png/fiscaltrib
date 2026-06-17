import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PERGUNTAS = {
  simples: [
    { id: 's1',  criterio: 'Obrigações',    peso: 8,  texto: 'O PGDAS-D está sendo entregue mensalmente dentro do prazo?' },
    { id: 's2',  criterio: 'Obrigações',    peso: 7,  texto: 'A empresa está em dia com o pagamento do DAS?' },
    { id: 's3',  criterio: 'Obrigações',    peso: 6,  texto: 'A DEFIS (Declaração de Informações Socioeconômicas) está entregue?' },
    { id: 's4',  criterio: 'Enquadramento', peso: 8,  texto: 'O anexo do Simples Nacional está correto para a atividade principal?' },
    { id: 's5',  criterio: 'Enquadramento', peso: 7,  texto: 'O faturamento está dentro do sublimite estadual de ICMS/ISS?' },
    { id: 's6',  criterio: 'Enquadramento', peso: 6,  texto: 'A empresa não exerce atividades vedadas ao Simples Nacional?' },
    { id: 's7',  criterio: 'Créditos',      peso: 8,  texto: 'Os créditos de ICMS nas entradas estão sendo aproveitados (quando permitido)?' },
    { id: 's8',  criterio: 'Créditos',      peso: 7,  texto: 'Foi verificada a possibilidade de crédito de IPI nas entradas?' },
    { id: 's9',  criterio: 'Créditos',      peso: 6,  texto: 'Os créditos de PIS/COFINS para o adquirente foram analisados?' },
    { id: 's10', criterio: 'Risco',         peso: 8,  texto: 'Não há divergências entre faturamento declarado e notas emitidas?' },
    { id: 's11', criterio: 'Risco',         peso: 7,  texto: 'A empresa não possui débitos inscritos em dívida ativa?' },
    { id: 's12', criterio: 'Risco',         peso: 6,  texto: 'Não há sócios com CPF irregular na Receita Federal?' },
    { id: 's13', criterio: 'Eficiência',    peso: 8,  texto: 'Foi feita análise comparativa entre Simples Nacional e Lucro Presumido?' },
    { id: 's14', criterio: 'Eficiência',    peso: 7,  texto: 'A distribuição de lucros está sendo feita corretamente (isenta de IR)?' },
    { id: 's15', criterio: 'Eficiência',    peso: 5,  texto: 'O pró-labore dos sócios está adequado para minimizar a carga tributária?' },
  ],
  presumido: [
    { id: 'p1',  criterio: 'Obrigações',    peso: 8,  texto: 'A DCTF está sendo entregue mensalmente dentro do prazo?' },
    { id: 'p2',  criterio: 'Obrigações',    peso: 7,  texto: 'A ECF (Escrituração Contábil Fiscal) está entregue no prazo?' },
    { id: 'p3',  criterio: 'Obrigações',    peso: 6,  texto: 'A ECD (Escrituração Contábil Digital) está sendo entregue corretamente?' },
    { id: 'p4',  criterio: 'Enquadramento', peso: 8,  texto: 'A base de presunção de IRPJ/CSLL está correta para a atividade?' },
    { id: 'p5',  criterio: 'Enquadramento', peso: 7,  texto: 'O faturamento anual está dentro do limite permitido (R$ 78 milhões)?' },
    { id: 'p6',  criterio: 'Enquadramento', peso: 6,  texto: 'O regime cumulativo de PIS/COFINS (3,65%) está sendo aplicado corretamente?' },
    { id: 'p7',  criterio: 'Créditos',      peso: 8,  texto: 'As retenções na fonte (IRRF, CSLL, PIS, COFINS) estão sendo compensadas?' },
    { id: 'p8',  criterio: 'Créditos',      peso: 7,  texto: 'Os créditos de ICMS nas entradas estão sendo aproveitados corretamente?' },
    { id: 'p9',  criterio: 'Créditos',      peso: 6,  texto: 'Foi verificada a existência de créditos de IPI a recuperar?' },
    { id: 'p10', criterio: 'Risco',         peso: 8,  texto: 'Não há divergências entre DCTF e valores efetivamente pagos?' },
    { id: 'p11', criterio: 'Risco',         peso: 7,  texto: 'A empresa não possui débitos inscritos em dívida ativa?' },
    { id: 'p12', criterio: 'Risco',         peso: 6,  texto: 'As retenções sobre serviços (ISS, INSS) estão sendo calculadas corretamente?' },
    { id: 'p13', criterio: 'Eficiência',    peso: 8,  texto: 'Foi feita análise comparativa entre Lucro Presumido e Lucro Real?' },
    { id: 'p14', criterio: 'Eficiência',    peso: 7,  texto: 'A distribuição de lucros/dividendos está sendo otimizada?' },
    { id: 'p15', criterio: 'Eficiência',    peso: 5,  texto: 'O pró-labore dos sócios está adequado para minimizar encargos?' },
  ],
  real: [
    { id: 'r1',  criterio: 'Obrigações',    peso: 8,  texto: 'O LALUR e LACS estão sendo escriturados corretamente?' },
    { id: 'r2',  criterio: 'Obrigações',    peso: 7,  texto: 'A ECF e ECD estão sendo entregues dentro do prazo?' },
    { id: 'r3',  criterio: 'Obrigações',    peso: 6,  texto: 'O SPED Fiscal/Contribuições está sendo transmitido corretamente?' },
    { id: 'r4',  criterio: 'Enquadramento', peso: 8,  texto: 'O IRPJ/CSLL está sendo apurado pelo regime correto (anual ou trimestral)?' },
    { id: 'r5',  criterio: 'Enquadramento', peso: 7,  texto: 'As estimativas mensais de IRPJ/CSLL estão sendo calculadas corretamente?' },
    { id: 'r6',  criterio: 'Enquadramento', peso: 6,  texto: 'As adições e exclusões do LALUR estão sendo aplicadas corretamente?' },
    { id: 'r7',  criterio: 'Créditos',      peso: 8,  texto: 'Os créditos de PIS/COFINS não cumulativos estão sendo aproveitados integralmente?' },
    { id: 'r8',  criterio: 'Créditos',      peso: 7,  texto: 'Os créditos de ICMS nas entradas estão sendo aproveitados corretamente?' },
    { id: 'r9',  criterio: 'Créditos',      peso: 6,  texto: 'Os prejuízos fiscais acumulados estão sendo compensados (limite 30%)?' },
    { id: 'r10', criterio: 'Risco',         peso: 8,  texto: 'Não há divergências entre ECF e SPED Contábil?' },
    { id: 'r11', criterio: 'Risco',         peso: 7,  texto: 'A empresa não possui débitos inscritos em dívida ativa ou parcelamentos em atraso?' },
    { id: 'r12', criterio: 'Risco',         peso: 6,  texto: 'Os preços de transferência (se aplicável) estão sendo calculados corretamente?' },
    { id: 'r13', criterio: 'Eficiência',    peso: 8,  texto: 'Existe planejamento tributário ativo para redução legal da carga tributária?' },
    { id: 'r14', criterio: 'Eficiência',    peso: 7,  texto: 'A JCP (Juros sobre Capital Próprio) está sendo utilizada como ferramenta de planejamento?' },
    { id: 'r15', criterio: 'Eficiência',    peso: 5,  texto: 'Os incentivos fiscais disponíveis (Lei do Bem, PAT, etc.) estão sendo aproveitados?' },
  ],
}

const CORES = {
  Obrigações:    { bg: '#eff6ff', border: '#bfdbfe', texto: '#1e40af', dot: '#3b82f6' },
  Enquadramento: { bg: '#fffbeb', border: '#fde68a', texto: '#92400e', dot: '#f59e0b' },
  Créditos:      { bg: '#f0fdf4', border: '#bbf7d0', texto: '#166534', dot: '#16a34a' },
  Risco:         { bg: '#fff1f2', border: '#fecdd3', texto: '#9f1239', dot: '#dc2626' },
  Eficiência:    { bg: '#f5f3ff', border: '#ddd6fe', texto: '#5b21b6', dot: '#7c3aed' },
}

function getClassificacao(score) {
  if (score >= 80) return { label: 'Excelente', cor: '#16a34a', bg: '#f0fdf4', emoji: '🟢' }
  if (score >= 60) return { label: 'Regular',   cor: '#d97706', bg: '#fffbeb', emoji: '🟡' }
  if (score >= 40) return { label: 'Atenção',   cor: '#f97316', bg: '#fff7ed', emoji: '🟠' }
  return               { label: 'Crítico',    cor: '#dc2626', bg: '#fff1f2', emoji: '🔴' }
}

function calcularScore(respostas, perguntas) {
  const totalPeso = perguntas.reduce((acc, p) => acc + p.peso, 0)
  const pontos = perguntas.reduce((acc, p) => {
    if (respostas[p.id] === 'sim') return acc + p.peso
    if (respostas[p.id] === 'parcial') return acc + p.peso * 0.5
    return acc
  }, 0)
  return Math.round((pontos / totalPeso) * 100)
}

function calcularPorCriterio(respostas, perguntas) {
  const criterios = {}
  perguntas.forEach(p => {
    if (!criterios[p.criterio]) criterios[p.criterio] = { total: 0, obtido: 0 }
    criterios[p.criterio].total += p.peso
    if (respostas[p.id] === 'sim') criterios[p.criterio].obtido += p.peso
    else if (respostas[p.id] === 'parcial') criterios[p.criterio].obtido += p.peso * 0.5
  })
  return Object.entries(criterios).map(([nome, v]) => ({
    nome,
    score: Math.round((v.obtido / v.total) * 100),
  }))
}

function exportarPDF(cliente, score, classificacao, criterios, respostas, perguntas) {
  const doc = new jsPDF()
  const hoje = new Date().toLocaleDateString('pt-BR')
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.text('FiscalTrib — Score Fiscal', 14, 14)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`Emitido em: ${hoje}`, 14, 24)
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text(`Cliente: ${cliente.razao_social}`, 14, 44)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100, 116, 139)
  doc.text(`CNPJ: ${cliente.cnpj || '—'}   Regime: ${cliente.regime || '—'}`, 14, 52)
  doc.setFontSize(40); doc.setFont('helvetica', 'bold'); doc.setTextColor(classificacao.cor)
  doc.text(`${score}`, 14, 76)
  doc.setFontSize(16); doc.text(`/ 100 — ${classificacao.label}`, 44, 76)
  autoTable(doc, {
    startY: 86,
    head: [['Critério', 'Score', 'Avaliação']],
    body: criterios.map(c => [c.nome, `${c.score}/100`, c.score >= 80 ? 'Excelente' : c.score >= 60 ? 'Regular' : c.score >= 40 ? 'Atenção' : 'Crítico']),
    headStyles: { fillColor: [30, 58, 95] }, styles: { fontSize: 10 },
  })
  const melhorias = perguntas.filter(p => respostas[p.id] !== 'sim')
  if (melhorias.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Pontos de Melhoria', 'Critério', 'Resposta']],
      body: melhorias.map(p => [p.texto, p.criterio, respostas[p.id] === 'parcial' ? 'Parcial' : 'Não']),
      headStyles: { fillColor: [220, 38, 38] }, styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 110 } },
    })
  }
  doc.setFontSize(8); doc.setTextColor(148, 163, 184)
  doc.text('FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária | fiscaltrib.com.br', 14, 285)
  doc.save(`Score_Fiscal_${cliente.razao_social.replace(/\s/g, '_')}_${hoje.replace(/\//g, '-')}.pdf`)
}

export default function ScoreFiscal() {
  const [clientes,   setClientes]   = useState([])
  const [clienteId,  setClienteId]  = useState('')
  const [cliente,    setCliente]    = useState(null)
  const [respostas,  setRespostas]  = useState({})
  const [etapa,      setEtapa]      = useState('selecao')
  const [salvando,   setSalvando]   = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, razao_social, cnpj, regime').order('razao_social')
      .then(({ data }) => setClientes(data || []))
  }, [])

  function selecionarCliente(id) {
    const c = clientes.find(x => x.id === id)
    setCliente(c); setClienteId(id); setRespostas({}); setEtapa('perguntas')
  }

  function getPerguntas() {
    if (!cliente) return []
    const r = (cliente.regime || '').toLowerCase()
    if (r.includes('simples')) return PERGUNTAS.simples
    if (r.includes('real'))    return PERGUNTAS.real
    return PERGUNTAS.presumido
  }

  function responder(id, valor) {
    setRespostas(prev => ({ ...prev, [id]: valor }))
  }

  function calcular() {
    const perguntas = getPerguntas()
    if (perguntas.filter(p => respostas[p.id]).length < perguntas.length) {
      alert('Responda todas as perguntas antes de calcular.')
      return
    }
    setEtapa('resultado')
  }

  async function salvarScore() {
    setSalvando(true)
    const perguntas = getPerguntas()
    const score = calcularScore(respostas, perguntas)
    const classificacao = getClassificacao(score)
    try {
      await supabase.from('scores_fiscais').upsert({
        cliente_id: clienteId, score, classificacao: classificacao.label,
        respostas, regime: cliente.regime, created_at: new Date().toISOString(),
      }, { onConflict: 'cliente_id' })
      alert('Score salvo com sucesso!')
    } catch { alert('Erro ao salvar. Tente novamente.') }
    finally { setSalvando(false) }
  }

  // ── SELEÇÃO ──
  if (etapa === 'selecao') return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>Score Fiscal</h2>
        <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6 }}>
          Avalie a saúde tributária de cada cliente e gere um score de 0 a 100 pontos com relatório completo.
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <label style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', display: 'block', marginBottom: 12 }}>
          Selecione o cliente para avaliar:
        </label>
        <select
          style={{ width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, color: '#374151', background: '#f8fafc', cursor: 'pointer' }}
          value={clienteId}
          onChange={e => selecionarCliente(e.target.value)}
        >
          <option value="">— Escolha um cliente —</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.razao_social} ({c.regime || 'Regime não informado'})</option>
          ))}
        </select>
        {clientes.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 16, textAlign: 'center' }}>Nenhum cliente cadastrado ainda.</p>
        )}
      </div>

      {/* Cards explicativos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 32 }}>
        {[
          { emoji: '📋', titulo: '15 perguntas', sub: 'Por regime tributário' },
          { emoji: '📊', titulo: 'Score 0-100', sub: 'Com classificação visual' },
          { emoji: '📄', titulo: 'Relatório PDF', sub: 'Para apresentar ao cliente' },
        ].map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{c.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f' }}>{c.titulo}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── PERGUNTAS ──
  if (etapa === 'perguntas') {
    const perguntas = getPerguntas()
    const respondidas = perguntas.filter(p => respostas[p.id]).length
    const progresso = Math.round((respondidas / perguntas.length) * 100)
    const criterios = [...new Set(perguntas.map(p => p.criterio))]

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ background: '#1e3a5f', borderRadius: 16, padding: '24px 28px', marginBottom: 28, color: '#fff' }}>
          <div style={{ fontSize: 13, color: '#9db8d8', marginBottom: 4 }}>AVALIAÇÃO TRIBUTÁRIA</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{cliente.razao_social}</div>
          <div style={{ fontSize: 14, color: '#9db8d8', marginBottom: 20 }}>Regime: {cliente.regime}</div>

          {/* Barra de progresso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 12 }}>
              <div style={{ background: '#4ade80', borderRadius: 99, height: 12, width: `${progresso}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', whiteSpace: 'nowrap' }}>
              {respondidas}/{perguntas.length} respondidas
            </div>
          </div>
        </div>

        {/* Perguntas por critério */}
        {criterios.map(criterio => {
          const cor = CORES[criterio]
          const pgs = perguntas.filter(p => p.criterio === criterio)
          const respondCriterio = pgs.filter(p => respostas[p.id]).length

          return (
            <div key={criterio} style={{ background: '#fff', borderRadius: 16, border: `2px solid ${cor.border}`, marginBottom: 24, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>

              {/* Cabeçalho do critério */}
              <div style={{ background: cor.bg, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${cor.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: cor.dot }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: cor.texto }}>{criterio}</span>
                </div>
                <span style={{ fontSize: 13, color: cor.texto, fontWeight: 600 }}>
                  {respondCriterio}/{pgs.length} respondidas
                </span>
              </div>

              {/* Perguntas */}
              <div style={{ padding: '8px 0' }}>
                {pgs.map((p, i) => (
                  <div key={p.id} style={{ padding: '20px 24px', borderBottom: i < pgs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 16, lineHeight: 1.7, fontWeight: 500 }}>
                      <span style={{ color: cor.dot, fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                      {p.texto}
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[
                        { valor: 'sim',     label: '✅ Sim',      bg: '#16a34a', bgSel: '#f0fdf4', border: '#86efac' },
                        { valor: 'parcial', label: '⚠️ Parcial',  bg: '#f97316', bgSel: '#fff7ed', border: '#fed7aa' },
                        { valor: 'nao',     label: '❌ Não',      bg: '#dc2626', bgSel: '#fff1f2', border: '#fecdd3' },
                      ].map(op => {
                        const sel = respostas[p.id] === op.valor
                        return (
                          <button
                            key={op.valor}
                            onClick={() => responder(p.id, op.valor)}
                            style={{
                              padding: '10px 22px',
                              borderRadius: 8,
                              border: `2px solid ${sel ? op.bg : '#e2e8f0'}`,
                              background: sel ? op.bg : '#f8fafc',
                              color: sel ? '#fff' : '#374151',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {op.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <button onClick={() => setEtapa('selecao')} style={{ padding: '14px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
            ← Voltar
          </button>
          <button onClick={calcular} style={{ flex: 1, padding: '14px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
            Calcular Score Fiscal →
          </button>
        </div>
      </div>
    )
  }

  // ── RESULTADO ──
  if (etapa === 'resultado') {
    const perguntas = getPerguntas()
    const score = calcularScore(respostas, perguntas)
    const classificacao = getClassificacao(score)
    const criterios = calcularPorCriterio(respostas, perguntas)
    const melhorias = perguntas.filter(p => respostas[p.id] !== 'sim')

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        {/* Score principal */}
        <div style={{ background: '#1e3a5f', borderRadius: 20, padding: '40px 36px', marginBottom: 28, color: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 13, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>SCORE FISCAL — {cliente.razao_social}</div>

          <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 1, color: classificacao.cor, marginBottom: 4 }}>{score}</div>
          <div style={{ fontSize: 20, color: '#9db8d8', marginBottom: 24 }}>de 100 pontos</div>

          {/* Barra grande */}
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 20, marginBottom: 20, maxWidth: 500, margin: '0 auto 24px' }}>
            <div style={{ background: classificacao.cor, borderRadius: 99, height: 20, width: `${score}%`, transition: 'width 0.8s ease' }} />
          </div>

          <div style={{ display: 'inline-block', background: classificacao.cor, color: '#fff', borderRadius: 99, padding: '10px 32px', fontSize: 18, fontWeight: 800 }}>
            {classificacao.emoji} {classificacao.label}
          </div>

          <div style={{ fontSize: 13, color: '#9db8d8', marginTop: 20 }}>
            Regime: {cliente.regime} &nbsp;|&nbsp; {perguntas.length} critérios avaliados
          </div>
        </div>

        {/* Score por critério */}
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: '28px', marginBottom: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1e3a5f', marginBottom: 24 }}>📊 Score por Critério</div>
          {criterios.map(c => {
            const cl = getClassificacao(c.score)
            const cor = CORES[c.nome]
            return (
              <div key={c.nome} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: cor?.dot }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: cor?.texto }}>{c.nome}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{cl.emoji} {cl.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: cl.cor }}>{c.score}/100</span>
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 99, height: 14 }}>
                  <div style={{ background: cl.cor, borderRadius: 99, height: 14, width: `${c.score}%`, transition: 'width 0.6s' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Pontos de melhoria */}
        {melhorias.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #fecdd3', padding: '28px', marginBottom: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#9f1239', marginBottom: 20 }}>
              ⚠️ Pontos de Melhoria — {melhorias.length} {melhorias.length === 1 ? 'item' : 'itens'}
            </div>
            {melhorias.map((p) => {
              const isParcial = respostas[p.id] === 'parcial'
              const cor = CORES[p.criterio]
              return (
                <div key={p.id} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor?.dot, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, background: isParcial ? '#fff7ed' : '#fff1f2', border: `1px solid ${isParcial ? '#fed7aa' : '#fecdd3'}`, borderRadius: 10, padding: '14px 18px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isParcial ? '#f97316' : '#dc2626', marginBottom: 6 }}>
                      {p.criterio} — {isParcial ? '⚠️ Parcial' : '❌ Não atendido'}
                    </div>
                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{p.texto}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setEtapa('perguntas')} style={{ padding: '14px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
            ← Editar
          </button>
          <button onClick={salvarScore} disabled={salvando} style={{ flex: 1, padding: '14px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : '💾 Salvar Score'}
          </button>
          <button onClick={() => exportarPDF(cliente, score, classificacao, criterios, respostas, perguntas)} style={{ flex: 1, padding: '14px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            📄 Exportar PDF
          </button>
        </div>

        <button onClick={() => { setEtapa('selecao'); setRespostas({}); setCliente(null); setClienteId('') }}
          style={{ width: '100%', marginTop: 16, padding: '12px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>
          Avaliar outro cliente
        </button>
      </div>
    )
  }
}