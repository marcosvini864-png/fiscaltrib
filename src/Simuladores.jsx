cd C:\fiscaltrib\src
code Simuladores.jsximport { useState } from 'react'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtP = v => parseFloat(v || 0).toFixed(1) + '%'

const C = {
  navy: '#0B1F4D', bg: '#F5F7FA', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', white: '#FFFFFF',
}

const ABAS = [
  { id: 'recuperacao', icon: '💰', label: 'Recuperação Tributária' },
  { id: 'economia',    icon: '⚖️', label: 'Economia Fiscal' },
  { id: 'transacao',   icon: '🤝', label: 'Transação Tributária' },
  { id: 'parcelamento',icon: '📋', label: 'Parcelamento' },
  { id: 'honorarios',  icon: '🏆', label: 'Honorários' },
]

function Card({ children, style }) {
  return <div style={{ background: C.white, borderRadius: 14, border: `2px solid ${C.border}`, padding: '24px 28px', ...style }}>{children}</div>
}

function ResultCard({ label, valor, cor = '#16a34a', sub }) {
  return (
    <div style={{ background: cor + '10', border: `2px solid ${cor}33`, borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: cor, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: cor }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }
const selectStyle = { ...inputStyle }
const btnCalc = { width: '100%', padding: '14px 0', background: C.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 8 }

// ─── SIMULADOR 1: RECUPERAÇÃO TRIBUTÁRIA ─────────────────────────────────────
function SimRecuperacao() {
  const [fat,    setFat]    = useState('')
  const [meses,  setMeses]  = useState('60')
  const [regime, setRegime] = useState('Simples Nacional')
  const [result, setResult] = useState(null)

  function calcular() {
    const f = parseFloat(fat) || 0
    const m = parseInt(meses) || 60
    if (!f) { alert('Informe o faturamento.'); return }

    let taxaMin, taxaMax, teses
    if (regime === 'Simples Nacional') {
      taxaMin = 0.02; taxaMax = 0.06
      teses = ['ICMS-ST indevido', 'PIS/COFINS monofásico', 'Segregação de receitas', 'Fator R']
    } else if (regime === 'Lucro Presumido') {
      taxaMin = 0.03; taxaMax = 0.08
      teses = ['PIS/COFINS não cumulativo', 'IRPJ/CSLL base reduzida', 'Exclusão ICMS base PIS/COFINS', 'INSS sobre verbas indenizatórias']
    } else {
      taxaMin = 0.04; taxaMax = 0.10
      teses = ['Créditos de insumos PIS/COFINS', 'IRPJ/CSLL — prejuízo fiscal', 'Exclusão ICMS base PIS/COFINS', 'CSLL — base de cálculo']
    }

    const faturamentoTotal = f * m
    const creditoMin = faturamentoTotal * taxaMin
    const creditoMax = faturamentoTotal * taxaMax
    const creditoMed = (creditoMin + creditoMax) / 2
    const mediaMensal = creditoMed / m

    setResult({ creditoMin, creditoMax, creditoMed, mediaMensal, faturamentoTotal, teses, taxaMin, taxaMax })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>💰 Dados para simulação</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Faturamento mensal médio (R$)">
            <input value={fat} onChange={e => setFat(e.target.value)} type="number" placeholder="Ex: 150000" style={inputStyle} />
          </Campo>
          <Campo label="Período analisado (meses)">
            <select value={meses} onChange={e => setMeses(e.target.value)} style={selectStyle}>
              <option value="12">12 meses (1 ano)</option>
              <option value="24">24 meses (2 anos)</option>
              <option value="36">36 meses (3 anos)</option>
              <option value="48">48 meses (4 anos)</option>
              <option value="60">60 meses (5 anos)</option>
            </select>
          </Campo>
          <Campo label="Regime tributário">
            <select value={regime} onChange={e => setRegime(e.target.value)} style={selectStyle}>
              <option>Simples Nacional</option>
              <option>Lucro Presumido</option>
              <option>Lucro Real</option>
            </select>
          </Campo>
          <button onClick={calcular} style={btnCalc}>⚡ Simular recuperação</button>
        </div>
      </Card>

      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ResultCard label="Estimativa mínima" valor={fmtR(result.creditoMin)} cor="#d97706" sub={fmtP(result.taxaMin * 100) + ' do faturamento'} />
            <ResultCard label="Estimativa máxima" valor={fmtR(result.creditoMax)} cor="#16a34a" sub={fmtP(result.taxaMax * 100) + ' do faturamento'} />
          </div>
          <ResultCard label="Potencial estimado (mediana)" valor={fmtR(result.creditoMed)} cor="#0B1F4D" sub={`Média mensal: ${fmtR(result.mediaMensal)}`} />
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10 }}>🎯 Teses aplicáveis ao {regime}</div>
            {result.teses.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13, color: C.text }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> {t}
              </div>
            ))}
          </Card>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#92400e' }}>
            ⚠️ Estimativa baseada em médias de mercado. Valores reais dependem de análise documental detalhada.
          </div>
        </div>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 300 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Preencha os dados e simule</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>O resultado aparecerá aqui</div>
        </Card>
      )}
    </div>
  )
}

// ─── SIMULADOR 2: ECONOMIA FISCAL ────────────────────────────────────────────
function SimEconomia() {
  const [receita, setReceita] = useState('')
  const [folha,   setFolha]   = useState('')
  const [margem,  setMargem]  = useState('')
  const [result,  setResult]  = useState(null)

  function calcular() {
    const r = parseFloat(receita) || 0
    const f = parseFloat(folha)   || 0
    const m = parseFloat(margem)  || 20
    if (!r) { alert('Informe a receita.'); return }

    const lucro = r * (m / 100)

    // Simples Nacional (estimativa Anexo III serviços)
    let aliqSN = 6
    if (r * 12 > 180000)  aliqSN = 11.2
    if (r * 12 > 360000)  aliqSN = 13.5
    if (r * 12 > 720000)  aliqSN = 16.0
    if (r * 12 > 1800000) aliqSN = 21.0
    if (r * 12 > 3600000) aliqSN = 33.0
    const impostoSN = r * (aliqSN / 100)

    // Lucro Presumido
    const pis      = r * 0.0065
    const cofins   = r * 0.03
    const csll     = (r * 0.32) * 0.09
    const irpj     = (r * 0.32) * 0.15 + Math.max(0, (r * 0.32 * 3 - 60000)) * 0.10 / 3
    const inss     = f * 0.26
    const impostoLP = pis + cofins + csll + irpj + inss

    // Lucro Real
    const pisLR    = r * 0.0165
    const cofinsLR = r * 0.076
    const csllLR   = lucro * 0.09
    const irpjLR   = lucro * 0.15 + Math.max(0, lucro - 20000) * 0.10
    const impostoLR = pisLR + cofinsLR + csllLR + irpjLR + inss

    const melhor = Math.min(impostoSN, impostoLP, impostoLR)
    const pior   = Math.max(impostoSN, impostoLP, impostoLR)
    const economia = pior - melhor

    setResult({ impostoSN, impostoLP, impostoLR, melhor, economia, aliqSN, receita: r })
  }

  const comparar = (val, todos) => {
    const min = Math.min(...todos)
    const max = Math.max(...todos)
    if (val === min) return { cor: '#16a34a', label: '⭐ Melhor opção' }
    if (val === max) return { cor: '#dc2626', label: '⚠️ Maior carga' }
    return { cor: '#d97706', label: '• Intermediário' }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>⚖️ Dados da empresa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Receita mensal (R$)">
            <input value={receita} onChange={e => setReceita(e.target.value)} type="number" placeholder="Ex: 80000" style={inputStyle} />
          </Campo>
          <Campo label="Folha de pagamento mensal (R$)">
            <input value={folha} onChange={e => setFolha(e.target.value)} type="number" placeholder="Ex: 20000" style={inputStyle} />
          </Campo>
          <Campo label="Margem líquida estimada (%)">
            <input value={margem} onChange={e => setMargem(e.target.value)} type="number" placeholder="Ex: 20" style={inputStyle} />
          </Campo>
          <button onClick={calcular} style={btnCalc}>⚡ Comparar regimes</button>
        </div>
      </Card>

      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { regime: 'Simples Nacional', valor: result.impostoSN, desc: `Alíquota efetiva: ${fmtP(result.aliqSN)}` },
            { regime: 'Lucro Presumido',  valor: result.impostoLP, desc: 'PIS+COFINS+IRPJ+CSLL+INSS' },
            { regime: 'Lucro Real',       valor: result.impostoLR, desc: 'Regime não cumulativo' },
          ].map((r, i) => {
            const comp = comparar(r.valor, [result.impostoSN, result.impostoLP, result.impostoLR])
            return (
              <div key={i} style={{ background: comp.cor + '10', border: `2px solid ${comp.cor}33`, borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{r.regime}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{r.desc}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: comp.cor, marginTop: 4 }}>{comp.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: comp.cor }}>{fmtR(r.valor)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>carga mensal est.</div>
                </div>
              </div>
            )
          })}
          <ResultCard label="Economia potencial (melhor vs pior)" valor={fmtR(result.economia)} cor="#0B1F4D" sub={`${fmtR(result.economia * 12)} por ano`} />
        </div>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 300 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Compare os regimes tributários</div>
        </Card>
      )}
    </div>
  )
}

// ─── SIMULADOR 3: TRANSAÇÃO TRIBUTÁRIA ───────────────────────────────────────
function SimTransacao() {
  const [divida,    setDivida]    = useState('')
  const [capacidade,setCapacidade]= useState('')
  const [prazo,     setPrazo]     = useState('60')
  const [modalidade,setModalidade]= useState('PERT')
  const [result,    setResult]    = useState(null)

  function calcular() {
    const d = parseFloat(divida)     || 0
    const c = parseFloat(capacidade) || 0
    const p = parseInt(prazo)        || 60
    if (!d) { alert('Informe o valor da dívida.'); return }

    const descontos = {
      'PERT':          { multa: 0.50, juros: 0.25, desc: 'Programa Especial de Regularização Tributária' },
      'REFIS':         { multa: 0.60, juros: 0.25, desc: 'Refinanciamento de dívidas fiscais' },
      'Transação AT':  { multa: 0.65, juros: 0.50, desc: 'Transação com a Advocacia-Geral da União' },
      'Parcelamento':  { multa: 0.20, juros: 0.10, desc: 'Parcelamento ordinário — art. 96 Lei 9430/96' },
    }

    const desc   = descontos[modalidade]
    const multaOrig    = d * 0.75  // estimativa de multa e juros acumulados
    const reducaoMulta = multaOrig * desc.multa
    const reducaoJuros = multaOrig * desc.juros
    const totalReducao = reducaoMulta + reducaoJuros
    const saldoFinal   = d - totalReducao

    const entradaPct   = c > 0 ? Math.min(0.20, c / saldoFinal) : 0.05
    const entrada      = saldoFinal * entradaPct
    const saldoParc    = saldoFinal - entrada
    const parcela      = saldoParc / p
    const economiaTotal = totalReducao

    setResult({ saldoFinal, entrada, parcela, economiaTotal, totalReducao, reducaoMulta, reducaoJuros, desc: desc.desc, p })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>🤝 Dados da transação</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Valor total da dívida (R$)">
            <input value={divida} onChange={e => setDivida(e.target.value)} type="number" placeholder="Ex: 500000" style={inputStyle} />
          </Campo>
          <Campo label="Capacidade de pagamento mensal (R$)">
            <input value={capacidade} onChange={e => setCapacidade(e.target.value)} type="number" placeholder="Ex: 5000" style={inputStyle} />
          </Campo>
          <Campo label="Modalidade">
            <select value={modalidade} onChange={e => setModalidade(e.target.value)} style={selectStyle}>
              <option>PERT</option>
              <option>REFIS</option>
              <option>Transação AT</option>
              <option>Parcelamento</option>
            </select>
          </Campo>
          <Campo label="Prazo de pagamento (meses)">
            <select value={prazo} onChange={e => setPrazo(e.target.value)} style={selectStyle}>
              <option value="12">12 meses</option>
              <option value="24">24 meses</option>
              <option value="36">36 meses</option>
              <option value="48">48 meses</option>
              <option value="60">60 meses</option>
              <option value="84">84 meses</option>
              <option value="120">120 meses</option>
            </select>
          </Campo>
          <button onClick={calcular} style={btnCalc}>⚡ Simular transação</button>
        </div>
      </Card>

      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
            📌 {result.desc}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ResultCard label="Saldo após descontos" valor={fmtR(result.saldoFinal)} cor="#0B1F4D" />
            <ResultCard label="Economia total" valor={fmtR(result.economiaTotal)} cor="#16a34a" />
            <ResultCard label="Entrada estimada" valor={fmtR(result.entrada)} cor="#7c3aed" />
            <ResultCard label={`Parcela (${result.p}x)`} valor={fmtR(result.parcela)} cor="#d97706" />
          </div>
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Composição da economia</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: C.muted }}>Redução de multas</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmtR(result.reducaoMulta)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: C.muted }}>Redução de juros</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmtR(result.reducaoJuros)}</span>
            </div>
          </Card>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#92400e' }}>
            ⚠️ Simulação baseada em estimativas. Consulte um advogado tributarista para valores exatos.
          </div>
        </div>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 300 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Simule a transação tributária</div>
        </Card>
      )}
    </div>
  )
}

// ─── SIMULADOR 4: PARCELAMENTO ────────────────────────────────────────────────
function SimParcelamento() {
  const [valor,  setValor]  = useState('')
  const [taxa,   setTaxa]   = useState('1')
  const [qtd,    setQtd]    = useState('60')
  const [result, setResult] = useState(null)

  function calcular() {
    const pv = parseFloat(valor) || 0
    const i  = parseFloat(taxa) / 100
    const n  = parseInt(qtd)
    if (!pv) { alert('Informe o valor.'); return }

    let parcela, totalPago, totalJuros
    if (i === 0) {
      parcela   = pv / n
      totalPago = pv
      totalJuros = 0
    } else {
      parcela   = pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
      totalPago = parcela * n
      totalJuros = totalPago - pv
    }

    const tabela = Array.from({ length: Math.min(n, 12) }, (_, idx) => {
      const mes = idx + 1
      const juros = (pv - (parcela - pv * i) * (mes - 1) / n) * i
      return { mes, parcela, juros: i > 0 ? juros : 0 }
    })

    setResult({ parcela, totalPago, totalJuros, n, tabela })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📋 Dados do parcelamento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Valor total (R$)">
            <input value={valor} onChange={e => setValor(e.target.value)} type="number" placeholder="Ex: 120000" style={inputStyle} />
          </Campo>
          <Campo label="Taxa de juros mensal (%)">
            <select value={taxa} onChange={e => setTaxa(e.target.value)} style={selectStyle}>
              <option value="0">0% (sem juros)</option>
              <option value="0.5">0,5% a.m. (SELIC baixa)</option>
              <option value="1">1% a.m.</option>
              <option value="1.5">1,5% a.m.</option>
              <option value="2">2% a.m.</option>
            </select>
          </Campo>
          <Campo label="Número de parcelas">
            <select value={qtd} onChange={e => setQtd(e.target.value)} style={selectStyle}>
              {[6,12,18,24,36,48,60,84,120].map(n => <option key={n} value={n}>{n}x</option>)}
            </select>
          </Campo>
          <button onClick={calcular} style={btnCalc}>⚡ Calcular parcelamento</button>
        </div>
      </Card>

      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <ResultCard label="Valor da parcela" valor={fmtR(result.parcela)} cor="#0B1F4D" sub={`${result.n}x`} />
            <ResultCard label="Total pago" valor={fmtR(result.totalPago)} cor="#7c3aed" />
            <ResultCard label="Total de juros" valor={fmtR(result.totalJuros)} cor={result.totalJuros > 0 ? '#dc2626' : '#16a34a'} />
          </div>
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>Primeiras 12 parcelas</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Mês','Parcela','Juros'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.tabela.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid #f1f5f9` }}>
                    <td style={{ padding: '7px 10px', color: C.muted }}>{row.mes}ª</td>
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: C.navy }}>{fmtR(row.parcela)}</td>
                    <td style={{ padding: '7px 10px', color: row.juros > 0 ? '#dc2626' : C.muted }}>{fmtR(row.juros)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 300 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Calcule o parcelamento</div>
        </Card>
      )}
    </div>
  )
}

// ─── SIMULADOR 5: HONORÁRIOS ──────────────────────────────────────────────────
function SimHonorarios() {
  const [credito,    setCredito]    = useState('')
  const [pctFixo,   setPctFixo]    = useState('5')
  const [pctSucesso,setPctSucesso] = useState('20')
  const [prazoRec,  setPrazoRec]   = useState('12')
  const [result,    setResult]     = useState(null)

  function calcular() {
    const c  = parseFloat(credito)     || 0
    const pf = parseFloat(pctFixo)     || 0
    const ps = parseFloat(pctSucesso)  || 0
    const pr = parseInt(prazoRec)      || 12
    if (!c) { alert('Informe o crédito identificado.'); return }

    const honorarioFixo    = c * (pf / 100)
    const honorarioSucesso = c * (ps / 100)
    const receitaTotal     = honorarioFixo + honorarioSucesso
    const mensalidadeFixa  = honorarioFixo / pr
    const receitaAnual     = receitaTotal

    setResult({ honorarioFixo, honorarioSucesso, receitaTotal, mensalidadeFixa, receitaAnual, c, pf, ps, pr })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>🏆 Dados dos honorários</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Crédito identificado (R$)">
            <input value={credito} onChange={e => setCredito(e.target.value)} type="number" placeholder="Ex: 300000" style={inputStyle} />
          </Campo>
          <Campo label="Honorário fixo sobre crédito (%)">
            <select value={pctFixo} onChange={e => setPctFixo(e.target.value)} style={selectStyle}>
              {[2,3,5,7,10,12,15].map(p => <option key={p} value={p}>{p}%</option>)}
            </select>
          </Campo>
          <Campo label="Honorário de sucesso (%)">
            <select value={pctSucesso} onChange={e => setPctSucesso(e.target.value)} style={selectStyle}>
              {[10,15,20,25,30].map(p => <option key={p} value={p}>{p}%</option>)}
            </select>
          </Campo>
          <Campo label="Prazo de recuperação estimado (meses)">
            <select value={prazoRec} onChange={e => setPrazoRec(e.target.value)} style={selectStyle}>
              {[6,12,18,24,36].map(p => <option key={p} value={p}>{p} meses</option>)}
            </select>
          </Campo>
          <button onClick={calcular} style={btnCalc}>⚡ Calcular honorários</button>
        </div>
      </Card>

      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ResultCard label={`Honorário fixo (${result.pf}%)`}    valor={fmtR(result.honorarioFixo)}    cor="#2563eb" sub={`${fmtR(result.mensalidadeFixa)}/mês por ${result.pr} meses`} />
            <ResultCard label={`Honorário sucesso (${result.ps}%)`} valor={fmtR(result.honorarioSucesso)} cor="#7c3aed" sub="Pago após recuperação" />
          </div>
          <ResultCard label="Receita total prevista" valor={fmtR(result.receitaTotal)} cor="#16a34a" sub={`Sobre crédito de ${fmtR(result.c)}`} />
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>📊 Resumo do contrato</div>
            {[
              { label: 'Crédito identificado',  valor: fmtR(result.c),                 cor: '#0B1F4D' },
              { label: 'Honorário fixo total',  valor: fmtR(result.honorarioFixo),      cor: '#2563eb' },
              { label: 'Honorário de sucesso',  valor: fmtR(result.honorarioSucesso),   cor: '#7c3aed' },
              { label: 'Mensalidade fixa',      valor: fmtR(result.mensalidadeFixa),    cor: '#d97706' },
              { label: 'Receita total',         valor: fmtR(result.receitaTotal),       cor: '#16a34a' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', fontSize: 13 }}>
                <span style={{ color: C.muted }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.cor }}>{r.valor}</span>
              </div>
            ))}
          </Card>
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#166534', fontWeight: 600, textAlign: 'center' }}>
            💼 Proposta comercial: honorário fixo de {fmtR(result.mensalidadeFixa)}/mês + {result.ps}% de sucesso
          </div>
        </div>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 300 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Calcule seus honorários</div>
        </Card>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Simuladores() {
  const [aba, setAba] = useState('recuperacao')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — FERRAMENTAS COMERCIAIS</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>🧮 Simuladores Tributários</h1>
        <p style={{ fontSize: 14, color: '#93c5fd', maxWidth: 560 }}>
          Demonstre oportunidades e feche contratos com simulações rápidas e profissionais.
        </p>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding: '10px 16px', background: aba === a.id ? C.navy : C.white, color: aba === a.id ? '#fff' : C.text, border: `2px solid ${aba === a.id ? C.navy : C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {aba === 'recuperacao'  && <SimRecuperacao />}
      {aba === 'economia'     && <SimEconomia />}
      {aba === 'transacao'    && <SimTransacao />}
      {aba === 'parcelamento' && <SimParcelamento />}
      {aba === 'honorarios'   && <SimHonorarios />}
    </div>
  )
}