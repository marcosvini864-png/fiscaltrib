import { useState, useEffect } from 'react'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtP = v => parseFloat(v || 0).toFixed(1) + '%'

function parseMoeda(str) {
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0
}

function aplicarMascara(valor) {
  const apenasNumeros = String(valor).replace(/\D/g, '')
  if (!apenasNumeros) return ''
  const numero = Number(apenasNumeros) / 100
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const C = {
  navy: '#0B1F4D', bg: '#F5F7FA', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', white: '#FFFFFF',
  verde: '#16a34a', azul: '#2563eb', roxo: '#7c3aed',
  laranja: '#d97706', vermelho: '#dc2626',
}

const ABAS = [
  { id: 'regime',      icon: '⚖️', label: 'Regime + Reforma' },
  { id: 'recuperacao', icon: '💰', label: 'Recuperação Tributária' },
  { id: 'economia',    icon: '📊', label: 'Economia Fiscal' },
  { id: 'transacao',   icon: '🤝', label: 'Transação Tributária' },
  { id: 'parcelamento',icon: '📋', label: 'Parcelamento' },
  { id: 'honorarios',  icon: '🏆', label: 'Honorários' },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function Card({ children, style }) {
  return <div style={{ background: C.white, borderRadius: 14, border: `2px solid ${C.border}`, padding: '24px 28px', boxSizing: 'border-box', ...style }}>{children}</div>
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

function InputMoeda({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={e => onChange(aplicarMascara(e.target.value))} placeholder={placeholder || 'Ex: 100.000'} inputMode="numeric"
      style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
  )
}

const selectStyle = { padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }
const btnCalc = { width: '100%', padding: '14px 0', background: C.navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 8 }

// ─────────────────────────────────────────────────────────────
// TABELAS SIMPLES NACIONAL 2024
// ─────────────────────────────────────────────────────────────

const ANEXOS_SN = {
  I: [
    { ate: 180000,  aliq: 0.040, ded: 0 },
    { ate: 360000,  aliq: 0.073, ded: 5940 },
    { ate: 720000,  aliq: 0.095, ded: 13860 },
    { ate: 1800000, aliq: 0.107, ded: 22500 },
    { ate: 3600000, aliq: 0.143, ded: 87300 },
    { ate: 4800000, aliq: 0.190, ded: 378000 },
  ],
  III: [
    { ate: 180000,  aliq: 0.060, ded: 0 },
    { ate: 360000,  aliq: 0.112, ded: 9360 },
    { ate: 720000,  aliq: 0.135, ded: 17640 },
    { ate: 1800000, aliq: 0.160, ded: 35640 },
    { ate: 3600000, aliq: 0.210, ded: 125640 },
    { ate: 4800000, aliq: 0.330, ded: 648000 },
  ],
  V: [
    { ate: 180000,  aliq: 0.155, ded: 0 },
    { ate: 360000,  aliq: 0.180, ded: 4500 },
    { ate: 720000,  aliq: 0.195, ded: 9900 },
    { ate: 1800000, aliq: 0.205, ded: 17100 },
    { ate: 3600000, aliq: 0.230, ded: 62100 },
    { ate: 4800000, aliq: 0.305, ded: 540000 },
  ],
}

function calcAliqEfetivaSN(rbt12, anexo) {
  const tabela = ANEXOS_SN[anexo] || ANEXOS_SN.I
  const faixa  = tabela.find(f => rbt12 <= f.ate) || tabela[tabela.length - 1]
  if (rbt12 <= 0) return 0
  return ((rbt12 * faixa.aliq) - faixa.ded) / rbt12
}

// ─────────────────────────────────────────────────────────────
// REFORMA TRIBUTÁRIA — LC 214/2025
// ─────────────────────────────────────────────────────────────

const REFORMA = {
  CBS: { 2026: 0.009, 2027: 0.009, 2028: 0.088, 2029: 0.088, 2030: 0.088, 2031: 0.088, 2032: 0.088 },
  IBS: { 2026: 0.000, 2027: 0.010, 2028: 0.010, 2029: 0.177, 2030: 0.177, 2031: 0.177, 2032: 0.177 },
  PIS_COFINS_REDUCAO: { 2026: 1.0, 2027: 1.0, 2028: 0.0, 2029: 0.0, 2030: 0.0, 2031: 0.0, 2032: 0.0 },
  ICMS_ISS_REDUCAO:   { 2026: 1.0, 2027: 1.0, 2028: 1.0, 2029: 0.0, 2030: 0.0, 2031: 0.0, 2032: 0.0 },
}

const ANOS_PROJECAO = [2026, 2027, 2028, 2029, 2030, 2031, 2032]

// ─────────────────────────────────────────────────────────────
// SIMULADOR 1: REGIME + REFORMA TRIBUTÁRIA
// ─────────────────────────────────────────────────────────────

function SimRegimeReforma({ isMobile }) {
  const [receita,   setReceita]   = useState('')
  const [folha,     setFolha]     = useState('')
  const [margem,    setMargem]    = useState('20')
  const [atividade, setAtividade] = useState('comercio')
  const [anexoSN,   setAnexoSN]   = useState('I')
  const [result,    setResult]    = useState(null)
  const [abaRes,    setAbaRes]    = useState('hoje')

  function calcular() {
    const r = parseMoeda(receita)
    const f = parseMoeda(folha)
    const m = parseFloat(margem) || 20
    if (!r) { alert('Informe a receita mensal.'); return }
    const rMensal = r
    const rAnual  = r * 12
    const lucro   = r * (m / 100)
    const fatorR  = f > 0 ? f / r : 0
    const aliqEfSN  = calcAliqEfetivaSN(rAnual, anexoSN)
    const impostoSN = rMensal * aliqEfSN
    const pLP    = atividade === 'servicos' ? 0.32 : 0.08
    const biIRPJ = rMensal * pLP
    const biCSLL = rMensal * (atividade === 'servicos' ? 0.32 : 0.12)
    const irpj   = biIRPJ * 0.15 + Math.max(0, (biIRPJ * 3 - 60000) / 3) * 0.10
    const csll   = biCSLL * 0.09
    const pisLP  = rMensal * 0.0065
    const cofLP  = rMensal * 0.03
    const inssLP = f * 0.28
    const impostoLP = irpj + csll + pisLP + cofLP + inssLP
    const pisLR  = rMensal * 0.0165
    const cofLR  = rMensal * 0.076
    const csllLR = lucro * 0.09
    const irpjLR = lucro * 0.15 + Math.max(0, (lucro - 20000) * 0.10)
    const inssLR = f * 0.28
    const impostoLR = pisLR + cofLR + csllLR + irpjLR + inssLR
    const projecao = ANOS_PROJECAO.map(ano => {
      const cbsAliq = REFORMA.CBS[ano]
      const ibsAliq = REFORMA.IBS[ano]
      const redPF   = REFORMA.PIS_COFINS_REDUCAO[ano]
      const redICMS = REFORMA.ICMS_ISS_REDUCAO[ano]
      const cbs = rMensal * cbsAliq
      const ibs = rMensal * ibsAliq
      const snTransicao = impostoSN * (redPF * 0.3 + redICMS * 0.4 + 0.3)
      const snTotal = snTransicao + cbs * 0.3 + ibs * 0.3
      const pisCofinsTrans = (pisLP + cofLP) * redPF
      const icmsTrans = rMensal * 0.12 * redICMS
      const lpTotal = irpj + csll + inssLP + pisCofinsTrans + icmsTrans + cbs * (1 - redPF) + ibs * (1 - redICMS)
      const pisCofinsTrLR = (pisLR + cofLR) * redPF
      const lrTotal = csllLR + irpjLR + inssLR + pisCofinsTrLR + cbs * (1 - redPF) + ibs * (1 - redICMS)
      const melhor = Math.min(snTotal, lpTotal, lrTotal)
      const melhorLabel = snTotal === melhor ? 'Simples' : lpTotal === melhor ? 'L. Presumido' : 'L. Real'
      return { ano, cbs, ibs, snTotal, lpTotal, lrTotal, melhor, melhorLabel }
    })
    const melhorHoje  = Math.min(impostoSN, impostoLP, impostoLR)
    const melhorLabel = impostoSN === melhorHoje ? 'Simples Nacional' : impostoLP === melhorHoje ? 'Lucro Presumido' : 'Lucro Real'
    const piorHoje    = Math.max(impostoSN, impostoLP, impostoLR)
    setResult({ impostoSN, impostoLP, impostoLR, aliqEfSN, pLP, fatorR, melhorLabel, melhorHoje, economia: piorHoje - melhorHoje, projecao, rMensal, rAnual })
    setAbaRes('hoje')
  }

  const comparar = (val, todos) => {
    const min = Math.min(...todos); const max = Math.max(...todos)
    if (val === min) return { cor: C.verde,    label: '⭐ Melhor hoje' }
    if (val === max) return { cor: C.vermelho, label: '⚠️ Maior carga' }
    return { cor: C.laranja, label: '• Intermediário' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)', borderRadius: 14, padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 32 }}>🏛️</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Simulador com Reforma Tributária 2026–2032</div>
          <div style={{ fontSize: 12, color: '#c4b5fd' }}>Compara Simples Nacional, Lucro Presumido e Lucro Real com projeção CBS e IBS conforme LC 214/2025.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📋 Dados da empresa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Campo label="Receita mensal bruta (R$)"><InputMoeda value={receita} onChange={setReceita} placeholder="Ex: 150.000" /></Campo>
            <Campo label="Folha de pagamento mensal (R$)"><InputMoeda value={folha} onChange={setFolha} placeholder="Ex: 40.000" /></Campo>
            <Campo label="Margem líquida (%)">
              <input value={margem} onChange={e => setMargem(e.target.value)} type="number" placeholder="Ex: 20"
                style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
            </Campo>
            <Campo label="Atividade principal">
              <select value={atividade} onChange={e => setAtividade(e.target.value)} style={selectStyle}>
                <option value="comercio">Comércio</option>
                <option value="industria">Indústria</option>
                <option value="servicos">Serviços</option>
              </select>
            </Campo>
            <Campo label="Anexo do Simples Nacional">
              <select value={anexoSN} onChange={e => setAnexoSN(e.target.value)} style={selectStyle}>
                <option value="I">Anexo I — Comércio</option>
                <option value="III">Anexo III — Serviços (Fator R ≥ 28%)</option>
                <option value="V">Anexo V — Serviços (Fator R &lt; 28%)</option>
              </select>
            </Campo>
            <button onClick={calcular} style={btnCalc}>⚡ Simular regimes + Reforma</button>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#1e40af' }}>
              💡 Projeção CBS/IBS por ano (2026–2032) conforme LC 214/2025.
            </div>
          </div>
        </Card>
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 6, borderBottom: `2px solid ${C.border}` }}>
              {[{ id: 'hoje', label: '📊 Hoje' }, { id: 'reforma', label: '🏛️ Reforma 2026–2032' }].map(a => (
                <button key={a.id} onClick={() => setAbaRes(a.id)}
                  style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: abaRes === a.id ? `3px solid ${C.navy}` : '3px solid transparent', color: abaRes === a.id ? C.navy : C.muted, fontSize: 13, fontWeight: abaRes === a.id ? 700 : 400, cursor: 'pointer', marginBottom: -2 }}>
                  {a.label}
                </button>
              ))}
            </div>
            {abaRes === 'hoje' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {result.fatorR > 0 && (
                  <div style={{ background: result.fatorR >= 0.28 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${result.fatorR >= 0.28 ? '#86efac' : '#fde68a'}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: result.fatorR >= 0.28 ? '#166534' : '#92400e' }}>
                    <strong>Fator R: {(result.fatorR * 100).toFixed(1)}%</strong> — {result.fatorR >= 0.28 ? '✅ Elegível ao Anexo III' : '⚠️ Abaixo de 28% — Anexo V'}
                  </div>
                )}
                {[
                  { regime: 'Simples Nacional', valor: result.impostoSN, desc: `Alíquota efetiva: ${(result.aliqEfSN * 100).toFixed(2)}% — Anexo ${anexoSN}` },
                  { regime: 'Lucro Presumido',  valor: result.impostoLP, desc: `PIS+COFINS+IRPJ+CSLL+INSS — Presunção ${(result.pLP * 100).toFixed(0)}%` },
                  { regime: 'Lucro Real',       valor: result.impostoLR, desc: 'Regime não cumulativo — base no lucro real' },
                ].map((r, i) => {
                  const comp = comparar(r.valor, [result.impostoSN, result.impostoLP, result.impostoLR])
                  const pct  = result.rMensal > 0 ? (r.valor / result.rMensal * 100).toFixed(1) : '0'
                  return (
                    <div key={i} style={{ background: comp.cor + '10', border: `2px solid ${comp.cor}33`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{r.regime}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{r.desc}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: comp.cor, marginTop: 4 }}>{comp.label}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: comp.cor }}>{fmtR(r.valor)}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{pct}% da receita</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{fmtR(r.valor * 12)}/ano</div>
                      </div>
                    </div>
                  )
                })}
                <ResultCard label={`Economia optando pelo melhor — ${result.melhorLabel}`} valor={fmtR(result.economia)} cor={C.navy} sub={`${fmtR(result.economia * 12)} por ano`} />
              </div>
            )}
            {abaRes === 'reforma' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Carga tributária estimada por regime em cada ano (valores mensais):</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Ano','Simples','L. Presumido','L. Real','CBS','IBS','⭐ Melhor'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'center', color: C.muted, fontWeight: 700, borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.projecao.map((p, i) => {
                        const melhorVal = Math.min(p.snTotal, p.lpTotal, p.lrTotal)
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: C.navy, textAlign: 'center' }}>{p.ano}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: p.snTotal === melhorVal ? C.verde : C.text, fontWeight: p.snTotal === melhorVal ? 700 : 400 }}>{fmtR(p.snTotal)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: p.lpTotal === melhorVal ? C.verde : C.text, fontWeight: p.lpTotal === melhorVal ? 700 : 400 }}>{fmtR(p.lpTotal)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: p.lrTotal === melhorVal ? C.verde : C.text, fontWeight: p.lrTotal === melhorVal ? 700 : 400 }}>{fmtR(p.lrTotal)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: C.muted }}>{fmtR(p.cbs)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: C.muted }}>{fmtR(p.ibs)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <span style={{ background: C.verde + '20', color: C.verde, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{p.melhorLabel}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Card style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 14 }}>Evolução CBS + IBS (mensal)</div>
                  {result.projecao.map((p, i) => {
                    const max = Math.max(...result.projecao.map(x => x.cbs + x.ibs)) || 1
                    const pct = ((p.cbs + p.ibs) / max * 100).toFixed(0)
                    return (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 3 }}>
                          <span style={{ fontWeight: 600, color: C.text }}>{p.ano}</span>
                          <span>CBS: {fmtR(p.cbs)} | IBS: {fmtR(p.ibs)}</span>
                        </div>
                        <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', height: 8, width: pct + '%', borderRadius: 4 }} />
                        </div>
                      </div>
                    )
                  })}
                </Card>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#92400e' }}>
                  ⚠️ Projeção baseada nas alíquotas de referência da LC 214/2025. Alíquotas definitivas serão fixadas por resolução do Senado Federal.
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 400 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏛️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Compare regimes com impacto da Reforma</div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 260 }}>Preencha os dados e veja como a CBS e o IBS afetam cada regime de 2026 a 2032</div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SIMULADOR 2: RECUPERAÇÃO TRIBUTÁRIA
// ─────────────────────────────────────────────────────────────

function SimRecuperacao({ isMobile }) {
  const [fat,    setFat]    = useState('')
  const [meses,  setMeses]  = useState('60')
  const [regime, setRegime] = useState('Simples Nacional')
  const [result, setResult] = useState(null)

  function calcular() {
    const f = parseMoeda(fat)
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
    const creditoMin  = faturamentoTotal * taxaMin
    const creditoMax  = faturamentoTotal * taxaMax
    const creditoMed  = (creditoMin + creditoMax) / 2
    const mediaMensal = creditoMed / m
    setResult({ creditoMin, creditoMax, creditoMed, mediaMensal, teses, taxaMin, taxaMax })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>💰 Dados para simulação</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Faturamento mensal médio (R$)"><InputMoeda value={fat} onChange={setFat} placeholder="Ex: 150.000" /></Campo>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
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
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SIMULADOR 3: ECONOMIA FISCAL
// ─────────────────────────────────────────────────────────────

function SimEconomia({ isMobile }) {
  const [receita, setReceita] = useState('')
  const [folha,   setFolha]   = useState('')
  const [margem,  setMargem]  = useState('')
  const [result,  setResult]  = useState(null)

  function calcular() {
    const r = parseMoeda(receita)
    const f = parseMoeda(folha)
    const m = parseFloat(margem) || 20
    if (!r) { alert('Informe a receita.'); return }
    const lucro = r * (m / 100)
    let aliqSN = 6
    if (r * 12 > 180000)  aliqSN = 11.2
    if (r * 12 > 360000)  aliqSN = 13.5
    if (r * 12 > 720000)  aliqSN = 16.0
    if (r * 12 > 1800000) aliqSN = 21.0
    if (r * 12 > 3600000) aliqSN = 33.0
    const impostoSN = r * (aliqSN / 100)
    const pis = r * 0.0065; const cofins = r * 0.03
    const csll = (r * 0.32) * 0.09
    const irpj = (r * 0.32) * 0.15 + Math.max(0, (r * 0.32 * 3 - 60000)) * 0.10 / 3
    const inss = f * 0.26
    const impostoLP = pis + cofins + csll + irpj + inss
    const pisLR = r * 0.0165; const cofinsLR = r * 0.076
    const csllLR = lucro * 0.09
    const irpjLR = lucro * 0.15 + Math.max(0, lucro - 20000) * 0.10
    const impostoLR = pisLR + cofinsLR + csllLR + irpjLR + inss
    const pior = Math.max(impostoSN, impostoLP, impostoLR)
    const melhor = Math.min(impostoSN, impostoLP, impostoLR)
    setResult({ impostoSN, impostoLP, impostoLR, economia: pior - melhor, aliqSN })
  }

  const comparar = (val, todos) => {
    const min = Math.min(...todos); const max = Math.max(...todos)
    if (val === min) return { cor: '#16a34a', label: '⭐ Melhor opção' }
    if (val === max) return { cor: '#dc2626', label: '⚠️ Maior carga' }
    return { cor: '#d97706', label: '• Intermediário' }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📊 Dados da empresa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Receita mensal (R$)"><InputMoeda value={receita} onChange={setReceita} placeholder="Ex: 80.000" /></Campo>
          <Campo label="Folha de pagamento mensal (R$)"><InputMoeda value={folha} onChange={setFolha} placeholder="Ex: 20.000" /></Campo>
          <Campo label="Margem líquida estimada (%)">
            <input value={margem} onChange={e => setMargem(e.target.value)} type="number" placeholder="Ex: 20"
              style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
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
              <div key={i} style={{ background: comp.cor + '10', border: `2px solid ${comp.cor}33`, borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Compare os regimes tributários</div>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SIMULADOR 4: TRANSAÇÃO TRIBUTÁRIA — EDITAL PGFN 6/2026
// ─────────────────────────────────────────────────────────────

function SimTransacao({ isMobile }) {
  const [divida,     setDivida]     = useState('')
  const [natureza,   setNatureza]   = useState('tributaria')
  const [tipoPessoa, setTipoPessoa] = useState('pj_grande')
  const [modalidade, setModalidade] = useState('capag')
  const [capag,      setCapag]      = useState('C')
  const [nParcelas,  setNParcelas]  = useState('60')
  const [result,     setResult]     = useState(null)

  const EDITAL = {
    numero: '6/2026', publicacao: '01/06/2026', prazoAdesao: '30/09/2026',
    limiteDebito: 45000000, portal: 'regularize.pgfn.gov.br',
    inscricaoLimite: { pequeno_valor: '01/06/2025', demais: '03/03/2026' },
  }

  const NATUREZAS = {
    tributaria:     { label: '🔵 Tributária',    desc: 'IRPJ, CSLL, PIS, COFINS, IPI, IOF, ITR, CIDE etc.' },
    previdenciaria: { label: '🟢 Previdenciária', desc: 'INSS, contribuições sociais, FGTS inscrito na DAU.' },
    nao_tributaria: { label: '🟡 Não Tributária', desc: 'Multas administrativas, ressarcimentos, dívidas não fiscais.' },
  }

  const TIPOS_PESSOA = {
    pf:        { label: 'Pessoa Física' },
    mei:       { label: 'MEI' },
    me:        { label: 'Microempresa (ME)' },
    epp:       { label: 'Empresa de Pequeno Porte (EPP)' },
    pj_grande: { label: 'Pessoa Jurídica (demais)' },
    outros:    { label: 'Cooperativas / OSC / Santas Casas / IES' },
  }

  const isPP = ['pf', 'mei', 'me', 'epp', 'outros'].includes(tipoPessoa)

  const GRUPOS = [
    {
      label: '📋 Edital PGFN 6/2026 — Vigente até 30/09/2026',
      modalidades: {
        capag:          { label: 'Capacidade de Pagamento (CAPAG)',            descricao: 'Para contribuintes cuja capacidade financeira é insuficiente para quitar o passivo em até 5 anos.', inscricaoAte: EDITAL.inscricaoLimite.demais,        usaCapag: true,  fonte: 'Edital PGFN 6/2026 — Art. 3º' },
        dificil:        { label: 'Débitos de Difícil Recuperação/Irrecuperáveis', descricao: 'Entrada reduzida de 5% em até 12x. Desconto até 65% (70% pequeno porte). Saldo em até 108 parcelas.', inscricaoAte: EDITAL.inscricaoLimite.demais,  usaCapag: false, fonte: 'Edital PGFN 6/2026 — Art. 9º' },
        pequeno_valor:  { label: 'Transação de Pequeno Valor (até ~R$ 97 mil)', descricao: 'Para PF, MEI, ME e EPP com dívidas até 60 salários mínimos. Inscrições até 01/06/2025.',            inscricaoAte: EDITAL.inscricaoLimite.pequeno_valor, usaCapag: false, fonte: 'Edital PGFN 6/2026 — Art. 12º', apenasPorte: true },
        garantido:      { label: 'Débitos Garantidos (Seguro/Carta Fiança)',   descricao: 'Para inscrições garantidas judicialmente. Sem desconto — apenas condições diferenciadas de parcelamento.', inscricaoAte: EDITAL.inscricaoLimite.demais, usaCapag: false, fonte: 'Edital PGFN 6/2026 — Art. 15º' },
        desenrola_rural:{ label: 'Desenrola Rural — Edital PGFN 8/2026',      descricao: 'Exclusivo para agricultores familiares e cooperativas. Mesmas condições do Edital 6/2026.',             inscricaoAte: EDITAL.inscricaoLimite.demais,        usaCapag: false, fonte: 'Edital PGFN 8/2026' },
      },
    },
    {
      label: '🤝 Outras Modalidades de Transação',
      modalidades: {
        individual:  { label: 'Transação Individual (dívidas > R$ 10 milhões)', descricao: 'Negociação direta com a PGFN para dívidas acima de R$ 10 milhões. Proposta personalizada conforme CAPAG oficial.', inscricaoAte: 'Qualquer inscrição — sem prazo de edital', usaCapag: true,  fonte: 'Lei 13.988/2020 — Art. 10; Portaria PGFN 6.757/2022' },
        contencioso: { label: 'Transação no Contencioso (CARF/DRJ)',            descricao: 'Resolução de litígios no CARF ou DRJ. Prazo máximo de 72 meses. Implica desistência da discussão administrativa.',  inscricaoAte: 'Débitos em discussão no CARF ou DRJ',        usaCapag: false, fonte: 'Lei 13.988/2020 — Art. 16; Portaria CARF 10.956/2022' },
      },
    },
    {
      label: '📦 Parcelamento Ordinário',
      modalidades: {
        parcelamento_ordinario: { label: 'Parcelamento Ordinário (Lei 10.522/2002)',   descricao: 'Parcelamento simples em até 60 meses sem desconto. Não há redução de multas ou juros. Indicado para quem não se enquadra nos editais.', inscricaoAte: 'Sem restrição', usaCapag: false, fonte: 'Lei 10.522/2002 — Art. 10; IN RFB 1.891/2019' },
        parcelamento_especial:  { label: 'Parcelamento Especial / REFIS (histórico)', descricao: 'Parcelamentos de programas anteriores (REFIS, PAES, PAEX, PERT). Verificar saldo em aberto ou rescisão a regularizar.',               inscricaoAte: 'Verificar programa específico', usaCapag: false, fonte: 'Lei 9.964/2000 (REFIS); Lei 10.684/2003 (PAES); Lei 13.496/2017 (PERT)' },
      },
    },
  ]

  const TODAS_MODALIDADES = {}
  GRUPOS.forEach(g => Object.assign(TODAS_MODALIDADES, g.modalidades))

  function calcular() {
    const d = parseMoeda(divida)
    if (!d) { alert('Informe o valor da dívida.'); return }

    const estimPrincipal = d * 0.45
    const estimMultas    = d * 0.30
    const estimJuros     = d * 0.20
    const estimEncargos  = d * 0.05
    const acrescimos     = estimMultas + estimJuros + estimEncargos

    let descontoAcrescimos = 0
    let limiteDescTotal    = 0
    let maxParc            = 60
    let entradaPct         = 0.06
    let entradaParc        = isPP ? 12 : 6
    let obsCondicao        = ''

    switch (modalidade) {
      case 'capag':
        if (['C','D'].includes(capag)) {
          limiteDescTotal    = isPP ? 0.70 : 0.65
          descontoAcrescimos = Math.min(acrescimos, d * limiteDescTotal)
          maxParc            = 133
          obsCondicao        = `CAPAG ${capag} — desconto até 100% dos acréscimos, limitado a ${isPP ? '70' : '65'}% do total. Entrada 6% em até ${isPP ? 12 : 6}x. Saldo em até 133 parcelas.`
        } else {
          obsCondicao = `CAPAG ${capag} — sem desconto automático. Apenas prazo diferenciado. Verifique o CAPAG oficial no Portal Regularize.`
        }
        break
      case 'dificil':
        limiteDescTotal    = isPP ? 0.70 : 0.65
        descontoAcrescimos = Math.min(acrescimos, d * limiteDescTotal)
        maxParc            = isPP ? 133 : 108
        entradaPct         = 0.05
        entradaParc        = 12
        obsCondicao        = `Entrada 5% em até 12x. Saldo em até ${isPP ? 133 : 108} parcelas. Desconto até ${isPP ? '70' : '65'}% do valor total.`
        break
      case 'pequeno_valor': {
        const nP      = parseInt(nParcelas)
        const pctDesc = nP <= 1 ? 0.50 : nP <= 7 ? 0.50 : nP <= 12 ? 0.45 : nP <= 30 ? 0.40 : 0.30
        limiteDescTotal    = pctDesc
        descontoAcrescimos = Math.min(acrescimos, d * pctDesc)
        maxParc            = 55
        entradaPct         = 0.05
        entradaParc        = 5
        obsCondicao        = `Desconto de ${(pctDesc * 100).toFixed(0)}% — Escalonamento: 50% (até 7x) → 45% (até 12x) → 40% (até 30x) → 30% (até 55x).`
        break
      }
      case 'garantido':
        maxParc     = 60
        entradaPct  = 0.06
        entradaParc = 6
        obsCondicao = 'Sem desconto sobre o valor. Apenas condições diferenciadas de parcelamento conforme o edital.'
        break
      case 'desenrola_rural':
        limiteDescTotal    = isPP ? 0.70 : 0.65
        descontoAcrescimos = Math.min(acrescimos, d * limiteDescTotal)
        maxParc            = 133
        entradaPct         = 0.05
        entradaParc        = 12
        obsCondicao        = `Edital 8/2026 — exclusivo para agricultores e cooperativas familiares. Desconto até ${isPP ? '70' : '65'}% do total.`
        break
      case 'individual':
        if (['C','D'].includes(capag)) {
          limiteDescTotal    = isPP ? 0.70 : 0.65
          descontoAcrescimos = Math.min(acrescimos, d * limiteDescTotal)
        }
        maxParc     = 120
        entradaPct  = 0.06
        entradaParc = 6
        obsCondicao = `Transação Individual — negociação direta com a PGFN. Recomendado para dívidas acima de R$ 10 milhões. Desconto conforme CAPAG oficial. Proposta personalizada.`
        break
      case 'contencioso':
        limiteDescTotal    = 0.50
        descontoAcrescimos = Math.min(acrescimos, d * 0.50)
        maxParc            = 72
        entradaPct         = 0.05
        entradaParc        = 6
        obsCondicao        = 'Transação no Contencioso — CARF ou DRJ. Desconto de até 50% sobre acréscimos. Prazo máximo 72 meses. Implica desistência da discussão administrativa.'
        break
      case 'parcelamento_ordinario':
        maxParc     = 60
        entradaPct  = 0
        entradaParc = 0
        obsCondicao = 'Parcelamento simples em até 60 meses. Sem desconto sobre principal, multas ou juros. Indicado para quem não se enquadra nos editais de transação.'
        break
      case 'parcelamento_especial':
        maxParc     = 60
        entradaPct  = 0
        entradaParc = 0
        obsCondicao = 'Parcelamentos especiais históricos (REFIS, PAES, PAEX, PERT). Verificar programa específico e condições vigentes. Consultar saldo em aberto ou rescisão.'
        break
      default:
        break
    }

    const totalDesconto = descontoAcrescimos
    const saldoFinal    = d - totalDesconto
    const entrada       = saldoFinal * entradaPct
    const saldoParcelar = saldoFinal - entrada
    const nParc         = Math.min(parseInt(nParcelas) || 60, maxParc)
    const parcela       = nParc > 0 ? saldoParcelar / nParc : saldoParcelar

    setResult({
      d, estimPrincipal, estimMultas, estimJuros, estimEncargos, acrescimos,
      totalDesconto, saldoFinal, entrada, parcela,
      nParc, maxParc, entradaPct, entradaParc,
      pctDesconto:   d > 0 ? (totalDesconto / d * 100) : 0,
      obsCondicao,
      modLabel:      TODAS_MODALIDADES[modalidade]?.label,
      naturezaLabel: NATUREZAS[natureza]?.label,
      inscricaoAte:  TODAS_MODALIDADES[modalidade]?.inscricaoAte,
      fonte:         TODAS_MODALIDADES[modalidade]?.fonte,
    })
  }

  const modAtual = TODAS_MODALIDADES[modalidade]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #0369a1)', borderRadius: 14, padding: '14px 20px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#7dd3fc', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>EDITAL PGFN Nº {EDITAL.numero} — VIGENTE</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Transação Tributária — Dívida Ativa da União</div>
          <div style={{ fontSize: 12, color: '#bae6fd', marginTop: 4 }}>Publicado em {EDITAL.publicacao} · {EDITAL.portal}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#fde68a', fontWeight: 700, marginBottom: 2 }}>⏰ PRAZO EDITAL 6/2026</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fde68a' }}>30/09/2026</div>
          <div style={{ fontSize: 11, color: '#bae6fd' }}>até 19h — Portal Regularize</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>🤝 Dados para simulação</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Campo label="Natureza do débito *">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(NATUREZAS).map(([key, nat]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', border: `1.5px solid ${natureza === key ? C.navy : C.border}`, borderRadius: 8, cursor: 'pointer', background: natureza === key ? '#eff6ff' : '#fff' }}>
                    <input type="radio" value={key} checked={natureza === key} onChange={() => setNatureza(key)} style={{ marginTop: 2, accentColor: C.navy }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{nat.label}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{nat.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </Campo>

            <Campo label="Tipo de contribuinte *">
              <select value={tipoPessoa} onChange={e => setTipoPessoa(e.target.value)} style={selectStyle}>
                {Object.entries(TIPOS_PESSOA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {isPP && (
                <div style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '4px 8px', marginTop: 4 }}>
                  ✅ Pequeno porte — desconto ampliado (70%) e entrada em até 12x
                </div>
              )}
            </Campo>

            <Campo label="Valor total da dívida (R$) *">
              <InputMoeda value={divida} onChange={setDivida} placeholder="Ex: 500.000" />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Limite Edital 6/2026: R$ 45 milhões por sujeito passivo</div>
            </Campo>

            <Campo label="Modalidade *">
              <select value={modalidade} onChange={e => { setModalidade(e.target.value); setResult(null) }} style={selectStyle}>
                {GRUPOS.map(grupo => (
                  <optgroup key={grupo.label} label={grupo.label}>
                    {Object.entries(grupo.modalidades).map(([k, m]) => (
                      <option key={k} value={k} disabled={m.apenasPorte && !isPP}>
                        {m.label}{m.apenasPorte && !isPP ? ' (apenas pequeno porte)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {modAtual && (
                <div style={{ fontSize: 11, color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 10px', marginTop: 4 }}>
                  <strong>Elegível até:</strong> {modAtual.inscricaoAte}<br />
                  {modAtual.descricao}<br />
                  <span style={{ color: '#64748b' }}>📜 {modAtual.fonte}</span>
                </div>
              )}
            </Campo>

            {(modalidade === 'capag' || modalidade === 'individual') && (
              <Campo label="CAPAG *">
                <select value={capag} onChange={e => setCapag(e.target.value)} style={selectStyle}>
                  <option value="A">A — Boa capacidade (sem desconto automático)</option>
                  <option value="B">B — Capacidade moderada (sem desconto automático)</option>
                  <option value="C">C — Capacidade reduzida (desconto até {isPP ? '70' : '65'}%)</option>
                  <option value="D">D — Sem capacidade (desconto até {isPP ? '70' : '65'}%)</option>
                </select>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Verificar CAPAG oficial no Portal Regularize antes de negociar.</div>
              </Campo>
            )}

            <Campo label="Número de parcelas">
              <select value={nParcelas} onChange={e => setNParcelas(e.target.value)} style={selectStyle}>
                {[1,5,6,7,12,24,30,36,48,55,60,72,84,108,120,133].map(n => (
                  <option key={n} value={n}>{n === 1 ? 'À vista' : `${n} parcelas`}</option>
                ))}
              </select>
            </Campo>

            <button onClick={calcular} style={btnCalc}>⚡ Simular</button>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#92400e' }}>
              ⚠️ Simulação estimativa. Composição real da dívida e CAPAG oficial impactam os valores. Consulte o Portal Regularize e um especialista tributário.
            </div>
          </div>
        </Card>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#0B1F4D', borderRadius: 12, padding: '14px 18px', color: '#fff' }}>
              <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, marginBottom: 4 }}>SIMULAÇÃO DE TRANSAÇÃO / PARCELAMENTO</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{result.modLabel}</div>
              <div style={{ fontSize: 12, color: '#93c5fd' }}>{result.naturezaLabel} · {TIPOS_PESSOA[tipoPessoa]?.label}</div>
            </div>

            {result.obsCondicao && (
              <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
                📌 {result.obsCondicao}
                {result.inscricaoAte && <div style={{ marginTop: 4, color: '#64748b' }}>Inscrição elegível até: {result.inscricaoAte}</div>}
                {result.fonte && <div style={{ marginTop: 2, color: '#64748b' }}>📜 {result.fonte}</div>}
              </div>
            )}

            <Card style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10 }}>📊 Composição estimada da dívida</div>
              {[
                { label: 'Principal (est. 45%)', valor: result.estimPrincipal, cor: '#0B1F4D' },
                { label: 'Multas (est. 30%)',    valor: result.estimMultas,    cor: '#dc2626' },
                { label: 'Juros (est. 20%)',     valor: result.estimJuros,     cor: '#d97706' },
                { label: 'Encargos (est. 5%)',   valor: result.estimEncargos,  cor: '#7c3aed' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none', fontSize: 12 }}>
                  <span style={{ color: C.muted }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.cor }}>{fmtR(item.valor)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: C.muted, fontWeight: 600 }}>Total acréscimos legais</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmtR(result.acrescimos)}</span>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ResultCard label="Desconto estimado"   valor={fmtR(result.totalDesconto)} cor="#16a34a" sub={`${result.pctDesconto.toFixed(1)}% do valor`} />
              <ResultCard label="Saldo após desconto" valor={fmtR(result.saldoFinal)}    cor="#0B1F4D" />
              {result.entradaPct > 0 && (
                <ResultCard label={`Entrada (${(result.entradaPct * 100).toFixed(0)}%) em ${result.entradaParc}x`} valor={fmtR(result.entrada)} cor="#7c3aed" />
              )}
              <ResultCard label={`Parcela (${result.nParc}x)`} valor={fmtR(result.parcela)} cor="#d97706" sub={`Máx. ${result.maxParc} parcelas`} />
            </div>

            {(modalidade === 'capag' || modalidade === 'individual') && ['A','B'].includes(capag) && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                ⚠️ CAPAG {capag} — sem desconto automático. A PGFN oferece apenas prazo diferenciado. Verifique o CAPAG oficial no Regularize.
              </div>
            )}

            {['capag','dificil','pequeno_valor','garantido','desenrola_rural','individual'].includes(modalidade) && (
              <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#166534', fontWeight: 600, textAlign: 'center' }}>
                🌐 {['capag','dificil','pequeno_valor','garantido','desenrola_rural'].includes(modalidade) ? `Adesão pelo Regularize até ${EDITAL.prazoAdesao}` : 'Negociação contínua — sem prazo de edital'}<br />
                <span style={{ fontWeight: 400, color: '#16a34a' }}>{EDITAL.portal}</span>
              </div>
            )}

            {['parcelamento_ordinario','parcelamento_especial'].includes(modalidade) && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#475569' }}>
                ℹ️ Parcelamento sem desconto. Considere avaliar as modalidades de transação do Edital 6/2026 — podem oferecer condições mais vantajosas.
              </div>
            )}
          </div>
        ) : (
          <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 400 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Simule sua negociação</div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              Selecione a natureza do débito, tipo de contribuinte e modalidade desejada.
            </div>
            <div style={{ marginTop: 16, background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 14px', fontSize: 11, color: '#92400e', textAlign: 'center' }}>
              ⏰ Edital 6/2026 — prazo até <strong>30/09/2026 às 19h</strong>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SIMULADOR 5: PARCELAMENTO
// ─────────────────────────────────────────────────────────────

function SimParcelamento({ isMobile }) {
  const [valor,  setValor]  = useState('')
  const [taxa,   setTaxa]   = useState('1')
  const [qtd,    setQtd]    = useState('60')
  const [result, setResult] = useState(null)

  function calcular() {
    const pv = parseMoeda(valor); const i = parseFloat(taxa) / 100; const n = parseInt(qtd)
    if (!pv) { alert('Informe o valor.'); return }
    let parcela, totalPago, totalJuros
    if (i === 0) { parcela = pv / n; totalPago = pv; totalJuros = 0 }
    else { parcela = pv * (i * Math.pow(1+i,n)) / (Math.pow(1+i,n)-1); totalPago = parcela*n; totalJuros = totalPago-pv }
    const tabela = Array.from({ length: Math.min(n,12) }, (_, idx) => ({ mes: idx+1, parcela, juros: i>0 ? (pv-(parcela-pv*i)*(idx)/n)*i : 0 }))
    setResult({ parcela, totalPago, totalJuros, n, tabela })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📋 Dados do parcelamento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Valor total (R$)"><InputMoeda value={valor} onChange={setValor} placeholder="Ex: 120.000" /></Campo>
          <Campo label="Taxa de juros mensal (%)">
            <select value={taxa} onChange={e => setTaxa(e.target.value)} style={selectStyle}>
              <option value="0">0% (sem juros)</option>
              <option value="0.5">0,5% a.m.</option>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
            <ResultCard label="Valor da parcela" valor={fmtR(result.parcela)} cor="#0B1F4D" sub={`${result.n}x`} />
            <ResultCard label="Total pago"        valor={fmtR(result.totalPago)} cor="#7c3aed" />
            <ResultCard label="Total de juros"    valor={fmtR(result.totalJuros)} cor={result.totalJuros > 0 ? '#dc2626' : '#16a34a'} />
          </div>
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>Primeiras 12 parcelas</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f8fafc' }}>{['Mês','Parcela','Juros'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                <tbody>{result.tabela.map((row,i) => <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '7px 10px', color: C.muted }}>{row.mes}ª</td><td style={{ padding: '7px 10px', fontWeight: 700, color: C.navy }}>{fmtR(row.parcela)}</td><td style={{ padding: '7px 10px', color: row.juros > 0 ? '#dc2626' : C.muted }}>{fmtR(row.juros)}</td></tr>)}</tbody>
              </table>
            </div>
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

// ─────────────────────────────────────────────────────────────
// SIMULADOR 6: HONORÁRIOS
// ─────────────────────────────────────────────────────────────

function SimHonorarios({ isMobile }) {
  const [credito,    setCredito]    = useState('')
  const [pctFixo,    setPctFixo]    = useState('5')
  const [pctSucesso, setPctSucesso] = useState('20')
  const [prazoRec,   setPrazoRec]   = useState('12')
  const [result,     setResult]     = useState(null)

  function calcular() {
    const c = parseMoeda(credito); const pf = parseFloat(pctFixo)||0; const ps = parseFloat(pctSucesso)||0; const pr = parseInt(prazoRec)||12
    if (!c) { alert('Informe o crédito identificado.'); return }
    const honorarioFixo    = c*(pf/100)
    const honorarioSucesso = c*(ps/100)
    const receitaTotal     = honorarioFixo+honorarioSucesso
    const mensalidadeFixa  = honorarioFixo/pr
    setResult({ honorarioFixo, honorarioSucesso, receitaTotal, mensalidadeFixa, c, pf, ps, pr })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 20 }}>🏆 Dados dos honorários</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Crédito identificado (R$)"><InputMoeda value={credito} onChange={setCredito} placeholder="Ex: 300.000" /></Campo>
          <Campo label="Honorário fixo sobre crédito (%)">
            <select value={pctFixo} onChange={e => setPctFixo(e.target.value)} style={selectStyle}>{[2,3,5,7,10,12,15].map(p => <option key={p} value={p}>{p}%</option>)}</select>
          </Campo>
          <Campo label="Honorário de sucesso (%)">
            <select value={pctSucesso} onChange={e => setPctSucesso(e.target.value)} style={selectStyle}>{[10,15,20,25,30].map(p => <option key={p} value={p}>{p}%</option>)}</select>
          </Campo>
          <Campo label="Prazo de recuperação estimado (meses)">
            <select value={prazoRec} onChange={e => setPrazoRec(e.target.value)} style={selectStyle}>{[6,12,18,24,36].map(p => <option key={p} value={p}>{p} meses</option>)}</select>
          </Campo>
          <button onClick={calcular} style={btnCalc}>⚡ Calcular honorários</button>
        </div>
      </Card>
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <ResultCard label={`Honorário fixo (${result.pf}%)`}    valor={fmtR(result.honorarioFixo)}    cor="#2563eb" sub={`${fmtR(result.mensalidadeFixa)}/mês por ${result.pr} meses`} />
            <ResultCard label={`Honorário sucesso (${result.ps}%)`} valor={fmtR(result.honorarioSucesso)} cor="#7c3aed" sub="Pago após recuperação" />
          </div>
          <ResultCard label="Receita total prevista" valor={fmtR(result.receitaTotal)} cor="#16a34a" sub={`Sobre crédito de ${fmtR(result.c)}`} />
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>📊 Resumo do contrato</div>
            {[
              { label: 'Crédito identificado', valor: fmtR(result.c),               cor: '#0B1F4D' },
              { label: 'Honorário fixo total', valor: fmtR(result.honorarioFixo),    cor: '#2563eb' },
              { label: 'Honorário de sucesso', valor: fmtR(result.honorarioSucesso), cor: '#7c3aed' },
              { label: 'Mensalidade fixa',     valor: fmtR(result.mensalidadeFixa),  cor: '#d97706' },
              { label: 'Receita total',        valor: fmtR(result.receitaTotal),     cor: '#16a34a' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', fontSize: 13, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ color: C.muted }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.cor }}>{r.valor}</span>
              </div>
            ))}
          </Card>
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#166534', fontWeight: 600, textAlign: 'center' }}>
            💼 Proposta: honorário fixo de {fmtR(result.mensalidadeFixa)}/mês + {result.ps}% de sucesso
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

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function Simuladores() {
  const isMobile = useIsMobile()
  const [aba, setAba] = useState('regime')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px', boxSizing: 'border-box' }}>
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: isMobile ? '20px 20px' : '28px 32px', marginBottom: 24, color: '#fff', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>e-FISCALTRIBE — FERRAMENTAS COMERCIAIS</div>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>🧮 Simuladores Tributários</h1>
        <p style={{ fontSize: 14, color: '#93c5fd', maxWidth: 560 }}>Demonstre oportunidades e feche contratos com simulações rápidas e profissionais — incluindo Reforma Tributária 2026–2032 e Edital PGFN 6/2026.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding: '10px 16px', background: aba === a.id ? C.navy : C.white, color: aba === a.id ? '#fff' : C.text, border: `2px solid ${aba === a.id ? C.navy : C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {aba === 'regime'       && <SimRegimeReforma isMobile={isMobile} />}
      {aba === 'recuperacao'  && <SimRecuperacao   isMobile={isMobile} />}
      {aba === 'economia'     && <SimEconomia      isMobile={isMobile} />}
      {aba === 'transacao'    && <SimTransacao     isMobile={isMobile} />}
      {aba === 'parcelamento' && <SimParcelamento  isMobile={isMobile} />}
      {aba === 'honorarios'   && <SimHonorarios    isMobile={isMobile} />}
    </div>
  )
}