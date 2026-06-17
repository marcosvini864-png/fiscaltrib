import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── PERGUNTAS POR REGIME ───────────────────────────────────────────────────

const PERGUNTAS = {
  simples: [
    { id: 's1',  criterio: 'Obrigações',       peso: 8,  texto: 'O PGDAS-D está sendo entregue mensalmente dentro do prazo?' },
    { id: 's2',  criterio: 'Obrigações',       peso: 7,  texto: 'A empresa está em dia com o pagamento do DAS?' },
    { id: 's3',  criterio: 'Obrigações',       peso: 6,  texto: 'A DEFIS (Declaração de Informações Socioeconômicas) está entregue?' },
    { id: 's4',  criterio: 'Enquadramento',    peso: 8,  texto: 'O anexo do Simples Nacional está correto para a atividade principal?' },
    { id: 's5',  criterio: 'Enquadramento',    peso: 7,  texto: 'O faturamento está dentro do sublimite estadual de ICMS/ISS?' },
    { id: 's6',  criterio: 'Enquadramento',    peso: 6,  texto: 'A empresa não exerce atividades vedadas ao Simples Nacional?' },
    { id: 's7',  criterio: 'Créditos',         peso: 8,  texto: 'Os créditos de ICMS nas entradas estão sendo aproveitados (quando permitido)?' },
    { id: 's8',  criterio: 'Créditos',         peso: 7,  texto: 'Foi verificada a possibilidade de crédito de IPI nas entradas?' },
    { id: 's9',  criterio: 'Créditos',         peso: 6,  texto: 'Os créditos de PIS/COFINS para o adquirente foram analisados?' },
    { id: 's10', criterio: 'Risco',            peso: 8,  texto: 'Não há divergências entre faturamento declarado e notas emitidas?' },
    { id: 's11', criterio: 'Risco',            peso: 7,  texto: 'A empresa não possui débitos inscritos em dívida ativa?' },
    { id: 's12', criterio: 'Risco',            peso: 6,  texto: 'Não há sócios com CPF irregular na Receita Federal?' },
    { id: 's13', criterio: 'Eficiência',       peso: 8,  texto: 'Foi feita análise comparativa entre Simples Nacional e Lucro Presumido?' },
    { id: 's14', criterio: 'Eficiência',       peso: 7,  texto: 'A distribuição de lucros está sendo feita corretamente (isenta de IR)?' },
    { id: 's15', criterio: 'Eficiência',       peso: 5,  texto: 'O pró-labore dos sócios está adequado para minimizar a carga tributária?' },
  ],
  presumido: [
    { id: 'p1',  criterio: 'Obrigações',       peso: 8,  texto: 'A DCTF está sendo entregue mensalmente dentro do prazo?' },
    { id: 'p2',  criterio: 'Obrigações',       peso: 7,  texto: 'A ECF (Escrituração Contábil Fiscal) está entregue no prazo?' },
    { id: 'p3',  criterio: 'Obrigações',       peso: 6,  texto: 'A ECD (Escrituração Contábil Digital) está sendo entregue corretamente?' },
    { id: 'p4',  criterio: 'Enquadramento',    peso: 8,  texto: 'A base de presunção de IRPJ/CSLL está correta para a atividade?' },
    { id: 'p5',  criterio: 'Enquadramento',    peso: 7,  texto: 'O faturamento anual está dentro do limite permitido (R$ 78 milhões)?' },
    { id: 'p6',  criterio: 'Enquadramento',    peso: 6,  texto: 'O regime cumulativo de PIS/COFINS (3,65%) está sendo aplicado corretamente?' },
    { id: 'p7',  criterio: 'Créditos',         peso: 8,  texto: 'As retenções na fonte (IRRF, CSLL, PIS, COFINS) estão sendo compensadas?' },
    { id: 'p8',  criterio: 'Créditos',         peso: 7,  texto: 'Os créditos de ICMS nas entradas estão sendo aproveitados corretamente?' },
    { id: 'p9',  criterio: 'Créditos',         peso: 6,  texto: 'Foi verificada a existência de créditos de IPI a recuperar?' },
    { id: 'p10', criterio: 'Risco',            peso: 8,  texto: 'Não há divergências entre DCTF e valores efetivamente pagos?' },
    { id: 'p11', criterio: 'Risco',            peso: 7,  texto: 'A empresa não possui débitos inscritos em dívida ativa?' },
    { id: 'p12', criterio: 'Risco',            peso: 6,  texto: 'As retenções sobre serviços (ISS, INSS) estão sendo calculadas corretamente?' },
    { id: 'p13', criterio: 'Eficiência',       peso: 8,  texto: 'Foi feita análise comparativa entre Lucro Presumido e Lucro Real?' },
    { id: 'p14', criterio: 'Eficiência',       peso: 7,  texto: 'A distribuição de lucros/dividendos está sendo otimizada?' },
    { id: 'p15', criterio: 'Eficiência',       peso: 5,  texto: 'O pró-labore dos sócios está adequado para minimizar encargos?' },
  ],
  real: [
    { id: 'r1',  criterio: 'Obrigações',       peso: 8,  texto: 'O LALUR e LACS estão sendo escriturados corretamente?' },
    { id: 'r2',  criterio: 'Obrigações',       peso: 7,  texto: 'A ECF e ECD estão sendo entregues dentro do prazo?' },
    { id: 'r3',  criterio: 'Obrigações',       peso: 6,  texto: 'O SPED Fiscal/Contribuições está sendo transmitido corretamente?' },
    { id: 'r4',  criterio: 'Enquadramento',    peso: 8,  texto: 'O IRPJ/CSLL está sendo apurado pelo regime correto (anual ou trimestral)?' },
    { id: 'r5',  criterio: 'Enquadramento',    peso: 7,  texto: 'As estimativas mensais de IRPJ/CSLL estão sendo calculadas corretamente?' },
    { id: 'r6',  criterio: 'Enquadramento',    peso: 6,  texto: 'As adições e exclusões do LALUR estão sendo aplicadas corretamente?' },
    { id: 'r7',  criterio: 'Créditos',         peso: 8,  texto: 'Os créditos de PIS/COFINS não cumulativos estão sendo aproveitados integralmente?' },
    { id: 'r8',  criterio: 'Créditos',         peso: 7,  texto: 'Os créditos de ICMS nas entradas estão sendo aproveitados corretamente?' },
    { id: 'r9',  criterio: 'Créditos',         peso: 6,  texto: 'Os prejuízos fiscais acumulados estão sendo compensados (limite 30%)?' },
    { id: 'r10', criterio: 'Risco',            peso: 8,  texto: 'Não há divergências entre ECF e SPED Contábil?' },
    { id: 'r11', criterio: 'Risco',            peso: 7,  texto: 'A empresa não possui débitos inscritos em dívida ativa ou parcelamentos em atraso?' },
    { id: 'r12', criterio: 'Risco',            peso: 6,  texto: 'Os preços de transferência (se aplicável) estão sendo calculados corretamente?' },
    { id: 'r13', criterio: 'Eficiência',       peso: 8,  texto: 'Existe planejamento tributário ativo para redução legal da carga tributária?' },
    { id: 'r14', criterio: 'Eficiência',       peso: 7,  texto: 'A JCP (Juros sobre Capital Próprio) está sendo utilizada como ferramenta de planejamento?' },
    { id: 'r15', criterio: 'Eficiência',       peso: 5,  texto: 'Os incentivos fiscais disponíveis (Lei do Bem, PAT, etc.) estão sendo aproveitados?' },
  ],
}

const CORES_CRITERIO = {
  Obrigações: '#1e3a5f',
  Enquadramento: '#b48c3c',
  Créditos: '#16a34a',
  Risco: '#dc2626',
  Eficiência: '#7c3aed',
}

function getClassificacao(score) {
  if (score >= 80) return { label: 'Excelente', cor: '#16a34a', emoji: '🟢' }
  if (score >= 60) return { label: 'Regular',   cor: '#b48c3c', emoji: '🟡' }
  if (score >= 40) return { label: 'Atenção',   cor: '#f97316', emoji: '🟠' }
  return               { label: 'Crítico',    cor: '#dc2626', emoji: '🔴' }
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
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FiscalTrib — Score Fiscal', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Emitido em: ${hoje}`, 14, 22)

  doc.setTextColor(30, 58, 95)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`Cliente: ${cliente.razao_social}`, 14, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`CNPJ: ${cliente.cnpj || '—'}   Regime: ${cliente.regime || '—'}`, 14, 50)

  // Score principal
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(classificacao.cor)
  doc.text(`${score}`, 14, 72)
  doc.setFontSize(14)
  doc.text(`/ 100 — ${classificacao.label}`, 40, 72)

  // Por critério
  autoTable(doc, {
    startY: 82,
    head: [['Critério', 'Score', 'Avaliação']],
    body: criterios.map(c => [
      c.nome,
      `${c.score}/100`,
      c.score >= 80 ? 'Excelente' : c.score >= 60 ? 'Regular' : c.score >= 40 ? 'Atenção' : 'Crítico',
    ]),
    headStyles: { fillColor: [30, 58, 95] },
    styles: { fontSize: 10 },
  })

  // Melhorias
  const melhorias = perguntas.filter(p => respostas[p.id] !== 'sim')
  if (melhorias.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Pontos de Melhoria', 'Critério', 'Resposta']],
      body: melhorias.map(p => [
        p.texto,
        p.criterio,
        respostas[p.id] === 'parcial' ? 'Parcial' : 'Não',
      ]),
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 110 } },
    })
  }

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária | fiscaltrib.com.br', 14, 285)

  doc.save(`Score_Fiscal_${cliente.razao_social.replace(/\s/g, '_')}_${hoje.replace(/\//g, '-')}.pdf`)
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────

export default function ScoreFiscal() {
  const [clientes,   setClientes]   = useState([])
  const [clienteId,  setClienteId]  = useState('')
  const [cliente,    setCliente]    = useState(null)
  const [respostas,  setRespostas]  = useState({})
  const [etapa,      setEtapa]      = useState('selecao') // selecao | perguntas | resultado
  const [loading,    setLoading]    = useState(false)
  const [salvando,   setSalvando]   = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, razao_social, cnpj, regime').order('razao_social')
      .then(({ data }) => setClientes(data || []))
  }, [])

  function selecionarCliente(id) {
    const c = clientes.find(x => x.id === id)
    setCliente(c)
    setClienteId(id)
    setRespostas({})
    setEtapa('perguntas')
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
    const totalRespondidas = perguntas.filter(p => respostas[p.id]).length
    if (totalRespondidas < perguntas.length) {
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
        cliente_id: clienteId,
        score,
        classificacao: classificacao.label,
        respostas,
        regime: cliente.regime,
        created_at: new Date().toISOString(),
      }, { onConflict: 'cliente_id' })
      alert('Score salvo com sucesso!')
    } catch (e) {
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // ── TELA SELEÇÃO ──
  if (etapa === 'selecao') return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.titulo}>🎯 Score Fiscal</h2>
        <p style={s.sub}>Avalie a saúde tributária de cada cliente e gere um score de 0 a 100</p>
      </div>
      <div style={s.card}>
        <p style={s.label}>Selecione o cliente para avaliar:</p>
        <select style={s.select} value={clienteId} onChange={e => selecionarCliente(e.target.value)}>
          <option value="">— Escolha um cliente —</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.razao_social} ({c.regime || 'Regime não informado'})</option>
          ))}
        </select>
        {clientes.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Nenhum cliente cadastrado ainda.</p>
        )}
      </div>
    </div>
  )

  // ── TELA PERGUNTAS ──
  if (etapa === 'perguntas') {
    const perguntas = getPerguntas()
    const respondidas = perguntas.filter(p => respostas[p.id]).length
    const progresso = Math.round((respondidas / perguntas.length) * 100)
    const criterios = [...new Set(perguntas.map(p => p.criterio))]

    return (
      <div style={s.container}>
        <div style={s.header}>
          <h2 style={s.titulo}>🎯 Score Fiscal — {cliente.razao_social}</h2>
          <p style={s.sub}>Regime: {cliente.regime} &nbsp;|&nbsp; {respondidas}/{perguntas.length} perguntas respondidas</p>
          <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, marginTop: 12 }}>
            <div style={{ background: '#16a34a', borderRadius: 99, height: 8, width: `${progresso}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {criterios.map(criterio => (
          <div key={criterio} style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: CORES_CRITERIO[criterio] }} />
              <span style={{ fontWeight: 700, color: CORES_CRITERIO[criterio], fontSize: 14 }}>{criterio}</span>
            </div>
            {perguntas.filter(p => p.criterio === criterio).map((p, i) => (
              <div key={p.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < perguntas.filter(x => x.criterio === criterio).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <p style={{ fontSize: 13, color: '#374151', marginBottom: 10, lineHeight: 1.6 }}>
                  <strong style={{ color: '#64748b' }}>#{i + 1}</strong> {p.texto}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { valor: 'sim',     label: '✅ Sim',     bg: respostas[p.id] === 'sim'     ? '#16a34a' : '#f8fafc', cor: respostas[p.id] === 'sim'     ? '#fff' : '#374151' },
                    { valor: 'parcial', label: '⚠️ Parcial', bg: respostas[p.id] === 'parcial' ? '#f97316' : '#f8fafc', cor: respostas[p.id] === 'parcial' ? '#fff' : '#374151' },
                    { valor: 'nao',     label: '❌ Não',     bg: respostas[p.id] === 'nao'     ? '#dc2626' : '#f8fafc', cor: respostas[p.id] === 'nao'     ? '#fff' : '#374151' },
                  ].map(op => (
                    <button key={op.valor} onClick={() => responder(p.id, op.valor)} style={{
                      padding: '7px 14px', borderRadius: 6, border: '1px solid #e2e8f0',
                      background: op.bg, color: op.cor, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={() => setEtapa('selecao')} style={s.btnVoltar}>← Voltar</button>
          <button onClick={calcular} style={{ ...s.btn, flex: 1 }}>
            Calcular Score →
          </button>
        </div>
      </div>
    )
  }

  // ── TELA RESULTADO ──
  if (etapa === 'resultado') {
    const perguntas = getPerguntas()
    const score = calcularScore(respostas, perguntas)
    const classificacao = getClassificacao(score)
    const criterios = calcularPorCriterio(respostas, perguntas)
    const melhorias = perguntas.filter(p => respostas[p.id] !== 'sim')

    return (
      <div style={s.container}>
        <div style={s.header}>
          <h2 style={s.titulo}>🎯 Resultado — {cliente.razao_social}</h2>
          <p style={s.sub}>Regime: {cliente.regime}</p>
        </div>

        {/* Score principal */}
        <div style={{ ...s.card, textAlign: 'center', marginBottom: 16, border: `2px solid ${classificacao.cor}` }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>SCORE FISCAL</div>
          <div style={{ fontSize: 72, fontWeight: 900, color: classificacao.cor, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 16, color: '#64748b', marginBottom: 16 }}>de 100 pontos</div>

          {/* Barra de score */}
          <div style={{ background: '#e2e8f0', borderRadius: 99, height: 16, marginBottom: 12, position: 'relative' }}>
            <div style={{ background: classificacao.cor, borderRadius: 99, height: 16, width: `${score}%`, transition: 'width 0.5s' }} />
          </div>

          <div style={{ display: 'inline-block', background: classificacao.cor, color: '#fff', borderRadius: 99, padding: '6px 20px', fontSize: 15, fontWeight: 700 }}>
            {classificacao.emoji} {classificacao.label}
          </div>
        </div>

        {/* Por critério */}
        <div style={{ ...s.card, marginBottom: 16 }}>
          <p style={s.secao}>📊 Score por Critério</p>
          {criterios.map(c => {
            const cl = getClassificacao(c.score)
            return (
              <div key={c.nome} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: CORES_CRITERIO[c.nome], fontWeight: 700 }}>{c.nome}</span>
                  <span style={{ fontSize: 13, color: cl.cor, fontWeight: 700 }}>{c.score}/100</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8 }}>
                  <div style={{ background: cl.cor, borderRadius: 99, height: 8, width: `${c.score}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Pontos de melhoria */}
        {melhorias.length > 0 && (
          <div style={{ ...s.card, marginBottom: 16 }}>
            <p style={s.secao}>⚠️ Pontos de Melhoria ({melhorias.length})</p>
            {melhorias.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ background: respostas[p.id] === 'parcial' ? '#fff7ed' : '#fef2f2', border: `1px solid ${respostas[p.id] === 'parcial' ? '#fed7aa' : '#fecaca'}`, borderRadius: 6, padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontSize: 11, color: respostas[p.id] === 'parcial' ? '#f97316' : '#dc2626', fontWeight: 700, marginBottom: 2 }}>
                    {p.criterio} — {respostas[p.id] === 'parcial' ? '⚠️ Parcial' : '❌ Não'}
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{p.texto}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={() => setEtapa('perguntas')} style={s.btnVoltar}>← Editar</button>
          <button onClick={salvarScore} disabled={salvando} style={{ ...s.btn, background: '#1e3a5f', flex: 1 }}>
            {salvando ? 'Salvando...' : '💾 Salvar Score'}
          </button>
          <button onClick={() => exportarPDF(cliente, score, classificacao, criterios, respostas, perguntas)} style={{ ...s.btn, background: '#16a34a', flex: 1 }}>
            📄 Exportar PDF
          </button>
        </div>

        <button onClick={() => { setEtapa('selecao'); setRespostas({}); setCliente(null); setClienteId('') }}
          style={{ width: '100%', marginTop: 12, padding: '10px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          Avaliar outro cliente
        </button>
      </div>
    )
  }
}

const s = {
  container: { maxWidth: 780, margin: '0 auto', padding: '24px 16px' },
  header:    { marginBottom: 20 },
  titulo:    { fontSize: 22, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 },
  sub:       { fontSize: 13, color: '#64748b' },
  card:      { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  label:     { fontSize: 14, color: '#374151', fontWeight: 600, marginBottom: 10 },
  select:    { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, color: '#374151', background: '#f8fafc', cursor: 'pointer' },
  secao:     { fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' },
  btn:       { padding: '12px 0', background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnVoltar: { padding: '12px 20px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
}