import { useState, useEffect } from 'react'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const fmtP = v => parseFloat(v || 0).toFixed(1) + '%'
const fmtP4 = v => parseFloat(v || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4
}) + '%'

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
      <div style={{ background: '#F0F4FF', border: '2px solid #C7D7FF', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 28 }}>🏛️</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Simulador com Reforma Tributária 2026–2032</div>
          <div style={{ fontSize: 12, color: '#1e40af' }}>Compara Simples Nacional, Lucro Presumido e Lucro Real com projeção CBS e IBS conforme LC 214/2025.</div>
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
                {atividade === 'servicos' && result.fatorR > 0 && (
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
                {isMobile ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {result.projecao.map((p, i) => {
      const melhorVal = Math.min(p.snTotal, p.lpTotal, p.lrTotal)

      const ItemValor = ({ label, valor, destaque = false }) => (
        <div
          style={{
            background: destaque ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${destaque ? '#bbf7d0' : C.border}`,
            borderRadius: 8,
            padding: '9px 10px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              marginBottom: 3,
              fontWeight: 600,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: destaque ? 800 : 600,
              color: destaque ? C.verde : C.text,
              wordBreak: 'break-word',
            }}
          >
            {fmtR(valor)}
          </div>
        </div>
      )

      return (
        <div
          key={i}
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 12,
            background: C.white,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: C.navy,
              }}
            >
              {p.ano}
            </div>

            <span
              style={{
                background: C.verde + '20',
                color: C.verde,
                padding: '4px 8px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                textAlign: 'right',
              }}
            >
              ⭐ {p.melhorLabel}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <ItemValor
              label="Simples Nacional"
              valor={p.snTotal}
              destaque={p.snTotal === melhorVal}
            />

            <ItemValor
              label="Lucro Presumido"
              valor={p.lpTotal}
              destaque={p.lpTotal === melhorVal}
            />

            <ItemValor
              label="Lucro Real"
              valor={p.lrTotal}
              destaque={p.lrTotal === melhorVal}
            />

            <ItemValor label="CBS" valor={p.cbs} />

            <ItemValor label="IBS" valor={p.ibs} />
          </div>
        </div>
      )
    })}
  </div>
) : (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          {['Ano','Simples','L. Presumido','L. Real','CBS','IBS','⭐ Melhor'].map(h => (
            <th
              key={h}
              style={{
                padding: '8px 10px',
                textAlign: 'center',
                color: C.muted,
                fontWeight: 700,
                borderBottom: `2px solid ${C.border}`,
                whiteSpace: 'nowrap',
                fontSize: 11
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {result.projecao.map((p, i) => {
          const melhorVal = Math.min(p.snTotal, p.lpTotal, p.lrTotal)

          return (
            <tr
              key={i}
              style={{
                borderBottom: `1px solid ${C.border}`,
                background: i % 2 === 0 ? '#fff' : '#f8fafc'
              }}
            >
              <td style={{ padding: '8px 10px', fontWeight: 700, color: C.navy, textAlign: 'center' }}>
                {p.ano}
              </td>

              <td style={{ padding: '8px 10px', textAlign: 'center', color: p.snTotal === melhorVal ? C.verde : C.text, fontWeight: p.snTotal === melhorVal ? 700 : 400 }}>
                {fmtR(p.snTotal)}
              </td>

              <td style={{ padding: '8px 10px', textAlign: 'center', color: p.lpTotal === melhorVal ? C.verde : C.text, fontWeight: p.lpTotal === melhorVal ? 700 : 400 }}>
                {fmtR(p.lpTotal)}
              </td>

              <td style={{ padding: '8px 10px', textAlign: 'center', color: p.lrTotal === melhorVal ? C.verde : C.text, fontWeight: p.lrTotal === melhorVal ? 700 : 400 }}>
                {fmtR(p.lrTotal)}
              </td>

              <td style={{ padding: '8px 10px', textAlign: 'center', color: C.muted }}>
                {fmtR(p.cbs)}
              </td>

              <td style={{ padding: '8px 10px', textAlign: 'center', color: C.muted }}>
                {fmtR(p.ibs)}
              </td>

              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                <span
                  style={{
                    background: C.verde + '20',
                    color: C.verde,
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700
                  }}
                >
                  {p.melhorLabel}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)}
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
  const [rbt12, setRbt12] = useState('')
  const [receitaMono, setReceitaMono] = useState('')
  const [meses, setMeses] = useState('12')
  const [result, setResult] = useState(null)

  const faixasAnexoI = [
    {
      faixa: 1,
      limite: 180000,
      nominal: 0.04,
      deducao: 0,
      cofins: 0.1274,
      pis: 0.0276,
    },
    {
      faixa: 2,
      limite: 360000,
      nominal: 0.073,
      deducao: 5940,
      cofins: 0.1274,
      pis: 0.0276,
    },
    {
      faixa: 3,
      limite: 720000,
      nominal: 0.095,
      deducao: 13860,
      cofins: 0.1274,
      pis: 0.0276,
    },
    {
      faixa: 4,
      limite: 1800000,
      nominal: 0.107,
      deducao: 22500,
      cofins: 0.1274,
      pis: 0.0276,
    },
    {
      faixa: 5,
      limite: 3600000,
      nominal: 0.143,
      deducao: 87300,
      cofins: 0.1274,
      pis: 0.0276,
    },
    {
      faixa: 6,
      limite: 4800000,
      nominal: 0.19,
      deducao: 378000,
      cofins: 0.2827,
      pis: 0.0613,
    },
  ]

  function calcular() {
    const rbt = parseMoeda(rbt12)
    const mono = parseMoeda(receitaMono)
    const qtdMeses = parseInt(meses) || 1

    if (!rbt || rbt <= 0) {
      alert('Informe o RBT12 de referência.')
      return
    }

    if (rbt > 4800000) {
      alert('O RBT12 informado ultrapassa o limite de R$ 4,8 milhões do Simples Nacional.')
      return
    }

    if (!mono || mono <= 0) {
      alert('Informe a receita monofásica média mensal identificada.')
      return
    }

    const faixa = faixasAnexoI.find(f => rbt <= f.limite)

    if (!faixa) {
      alert('Não foi possível identificar a faixa do Anexo I.')
      return
    }

    const aliquotaEfetiva =
      ((rbt * faixa.nominal) - faixa.deducao) / rbt

    const percentualPisEfetivo =
      aliquotaEfetiva * faixa.pis

    const percentualCofinsEfetivo =
      aliquotaEfetiva * faixa.cofins

    const percentualRecuperavel =
      percentualPisEfetivo + percentualCofinsEfetivo

    const pisMensal =
      mono * percentualPisEfetivo

    const cofinsMensal =
      mono * percentualCofinsEfetivo

    const creditoMensal =
      pisMensal + cofinsMensal

    const receitaMonoPeriodo =
      mono * qtdMeses

    const pisPeriodo =
      pisMensal * qtdMeses

    const cofinsPeriodo =
      cofinsMensal * qtdMeses

    const creditoPeriodo =
      creditoMensal * qtdMeses

    setResult({
      faixa,
      rbt,
      mono,
      qtdMeses,
      aliquotaEfetiva,
      percentualPisEfetivo,
      percentualCofinsEfetivo,
      percentualRecuperavel,
      receitaMonoPeriodo,
      pisMensal,
      cofinsMensal,
      creditoMensal,
      pisPeriodo,
      cofinsPeriodo,
      creditoPeriodo,
    })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 24,
      }}
    >
      <Card>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.navy,
            marginBottom: 6,
          }}
        >
          💰 Recuperação — PIS/Cofins Monofásicos
        </div>

        <div
          style={{
            fontSize: 12,
            color: C.muted,
            lineHeight: 1.55,
            marginBottom: 18,
          }}
        >
          Triagem para comércio/revenda no Simples Nacional — Anexo I.
          Calcula a parcela de PIS e Cofins que teria integrado o DAS
          sobre receitas monofásicas não segregadas.
        </div>

        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 18,
            fontSize: 11,
            lineHeight: 1.5,
            color: '#1e40af',
          }}
        >
          <strong>Escopo:</strong> competências até 31/12/2026.
          Para cálculo definitivo, a apuração deve ser refeita
          competência por competência com os dados reais do PGDAS-D
          e das receitas monofásicas.
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <Campo label="RBT12 de referência (R$)">
            <InputMoeda
              value={rbt12}
              onChange={setRbt12}
              placeholder="Ex: 712.430,66"
            />
          </Campo>

          <Campo label="Receita monofásica média mensal (R$)">
            <InputMoeda
              value={receitaMono}
              onChange={setReceitaMono}
              placeholder="Ex: 25.000,00"
            />
          </Campo>

          <Campo label="Período estimado">
            <select
              value={meses}
              onChange={e => setMeses(e.target.value)}
              style={selectStyle}
            >
              <option value="1">1 competência</option>
              <option value="12">12 meses (1 ano)</option>
              <option value="24">24 meses (2 anos)</option>
              <option value="36">36 meses (3 anos)</option>
              <option value="48">48 meses (4 anos)</option>
              <option value="60">60 meses (5 anos)</option>
            </select>
          </Campo>

          <div
            style={{
              background: '#f8fafc',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 11,
              color: C.muted,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: C.text }}>
              Regime utilizado:
            </strong>
            <br />
            Simples Nacional — Anexo I — Comércio/Revenda
          </div>

          <button
            onClick={calcular}
            style={btnCalc}
          >
            ⚡ Calcular crédito estimado
          </button>
        </div>
      </Card>

      {result ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <ResultCard
            label="Crédito estimado no período"
            valor={fmtR(result.creditoPeriodo)}
            cor="#16a34a"
            sub={`${result.qtdMeses} competência(s) — média de ${fmtR(result.creditoMensal)}/mês`}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 12,
            }}
          >
            <ResultCard
              label="PIS estimado"
              valor={fmtR(result.pisPeriodo)}
              cor="#2563eb"
              sub={`${fmtP4(result.percentualPisEfetivo * 100)} sobre a receita monofásica`}
            />

            <ResultCard
              label="Cofins estimada"
              valor={fmtR(result.cofinsPeriodo)}
              cor="#7c3aed"
              sub={`${fmtP4(result.percentualCofinsEfetivo * 100)} sobre a receita monofásica`}
            />
          </div>

          <Card style={{ padding: isMobile ? 14 : '16px 20px' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: C.navy,
                marginBottom: 12,
              }}
            >
              🧮 Memória do cálculo
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: C.muted }}>RBT12</span>
                <strong>{fmtR(result.rbt)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: C.muted }}>Faixa do Anexo I</span>
                <strong>{result.faixa.faixa}ª faixa</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: C.muted }}>Alíquota nominal</span>
                <strong>{fmtP(result.faixa.nominal * 100)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: C.muted }}>Parcela a deduzir</span>
                <strong>{fmtR(result.faixa.deducao)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: C.muted }}>Alíquota efetiva do Simples</span>
                <strong>{fmtP4(result.aliquotaEfetiva * 100)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: C.muted }}>Participação PIS + Cofins</span>
                <strong>
                  {fmtP(
                    (result.faixa.pis + result.faixa.cofins) * 100
                  )}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: C.muted }}>Percentual efetivo PIS + Cofins</span>
                <strong style={{ color: '#16a34a' }}>
                  {fmtP4(result.percentualRecuperavel * 100)}
                </strong>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ color: C.muted }}>
                  Receita monofásica no período
                </span>
                <strong>{fmtR(result.receitaMonoPeriodo)}</strong>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ color: C.muted }}>
                  Crédito estimado
                </span>
                <strong style={{ color: '#16a34a' }}>
                  {fmtR(result.creditoPeriodo)}
                </strong>
              </div>
            </div>
          </Card>

          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '11px 14px',
              fontSize: 11,
              color: '#92400e',
              lineHeight: 1.55,
            }}
          >
            ⚠️ <strong>Estimativa de triagem.</strong> Para períodos com
            várias competências, este simulador mantém constantes o RBT12
            de referência e a receita monofásica média informada.
            O crédito definitivo deve ser recalculado mês a mês,
            considerando o RBT12, a classificação dos produtos,
            o PGDAS-D e o DAS efetivamente pago em cada competência.
          </div>

          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '11px 14px',
              fontSize: 11,
              color: '#166534',
              lineHeight: 1.55,
            }}
          >
            <strong>Próxima etapa no FiscalTribe:</strong> confirmar os
            produtos monofásicos nos XMLs, confrontar com o PGDAS-D,
            recalcular cada competência e gerar a memória de apuração
            para retificação e restituição/compensação do Simples Nacional.
          </div>
        </div>
      ) : (
        <Card
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: C.muted,
            minHeight: 300,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>

          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
            }}
          >
            Calcule uma oportunidade real
          </div>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              maxWidth: 260,
            }}
          >
            Informe o RBT12 e a receita de produtos monofásicos
            identificada para estimar a parcela de PIS/Cofins
            que pode ter sido recolhida indevidamente no DAS.
          </div>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SIMULADOR 3: ECONOMIA FISCAL
// ─────────────────────────────────────────────────────────────

function SimEconomia({ isMobile }) {
  const [atividade, setAtividade] = useState('comercio')
  const [trimestre, setTrimestre] = useState('4')
  const [receita, setReceita] = useState('')
  const [receitaTrimestre, setReceitaTrimestre] = useState('')
  const [rbt12, setRbt12] = useState('')
  const [fs12, setFs12] = useState('')
  const [folha, setFolha] = useState('')
  const [margem, setMargem] = useState('20')
  const [tributoLocal, setTributoLocal] = useState('')
  const [encargosFolha, setEncargosFolha] = useState('28')
  const [creditosLR, setCreditosLR] = useState('')
  const [result, setResult] = useState(null)

  const parsePercentual = valor => {
    const n = parseFloat(String(valor ?? '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

  function calcular() {
    const r = parseMoeda(receita)
    const rTrim = parseMoeda(receitaTrimestre)
    const rbt = parseMoeda(rbt12)
    const fs = parseMoeda(fs12)
    const f = parseMoeda(folha)
    const margemPct = parsePercentual(margem)
    const tributoLocalPct = parsePercentual(tributoLocal)
    const encargosPct = parsePercentual(encargosFolha)
    const creditosPisCofins = parseMoeda(creditosLR)

    if (!r || r <= 0) { alert('Informe a receita mensal de referência.'); return }
    if (!rTrim || rTrim <= 0) { alert('Informe a receita bruta do trimestre.'); return }
    if (!rbt || rbt <= 0) { alert('Informe o RBT12.'); return }
    if (rbt > 4800000) { alert('O RBT12 informado ultrapassa R$ 4,8 milhões. O Simples Nacional não será comparável neste escopo.'); return }
    if (atividade === 'servico_fator_r' && (!fs12 || fs12 === '')) { alert('Informe a FS12 para calcular o Fator R.'); return }
    if (tributoLocal === '') { alert('Informe a alíquota efetiva de ICMS/ISS fora do Simples. Use 0 se não houver no cenário.'); return }
    if (creditosLR === '') { alert('Informe os créditos mensais de PIS/Cofins no Lucro Real. Use 0,00 se não houver.'); return }
    if (margemPct < 0) { alert('A margem de lucro não pode ser negativa neste simulador.'); return }
    if (tributoLocalPct < 0 || encargosPct < 0) { alert('As alíquotas informadas não podem ser negativas.'); return }

    const fatorR = atividade === 'servico_fator_r' ? (rbt > 0 ? fs / rbt : 0) : null
    const anexoSN = atividade === 'comercio' ? 'I' : fatorR >= 0.28 ? 'III' : 'V'
    const aliqEfSN = calcAliqEfetivaSN(rbt, anexoSN)
    const simples = r * aliqEfSN

    const presIrpj = atividade === 'comercio' ? 0.08 : 0.32
    const presCsll = atividade === 'comercio' ? 0.12 : 0.32
    const limiteTrim = 1250000
    const receitaNormal = Math.min(rTrim, limiteTrim)
    const receitaExcedente = Math.max(0, rTrim - limiteTrim)

    const baseIrpjLP =
      (receitaNormal * presIrpj) +
      (receitaExcedente * presIrpj * 1.10)

    const aplicaAcrescimoCsll = trimestre !== '1'
    const baseCsllLP =
      (receitaNormal * presCsll) +
      (receitaExcedente * presCsll * (aplicaAcrescimoCsll ? 1.10 : 1))

    const irpjLPTrim =
      (baseIrpjLP * 0.15) +
      (Math.max(0, baseIrpjLP - 60000) * 0.10)

    const csllLPTrim = baseCsllLP * 0.09
    const irpjLPMensal = irpjLPTrim / 3
    const csllLPMensal = csllLPTrim / 3
    const pisCofinsLP = r * 0.0365
    const encargosPatronais = f * (encargosPct / 100)
    const icmsIss = r * (tributoLocalPct / 100)
    const presumido = irpjLPMensal + csllLPMensal + pisCofinsLP + encargosPatronais + icmsIss

    const lucroEstimado = r * (margemPct / 100)
    const irpjLR =
      (lucroEstimado * 0.15) +
      (Math.max(0, lucroEstimado - 20000) * 0.10)
    const csllLR = lucroEstimado * 0.09
    const pisCofinsDebitoLR = r * 0.0925
    const pisCofinsLR = Math.max(0, pisCofinsDebitoLR - creditosPisCofins)
    const real = irpjLR + csllLR + pisCofinsLR + encargosPatronais + icmsIss

    const cargas = [
      { regime: 'Simples Nacional', valor: simples },
      { regime: 'Lucro Presumido', valor: presumido },
      { regime: 'Lucro Real', valor: real },
    ]
    const menor = Math.min(...cargas.map(x => x.valor))
    const maior = Math.max(...cargas.map(x => x.valor))
    const menorRegime = cargas.find(x => x.valor === menor)?.regime || ''

    setResult({
      atividade,
      trimestre,
      r,
      rTrim,
      rbt,
      fs,
      f,
      fatorR,
      anexoSN,
      aliqEfSN,
      simples,
      presIrpj,
      presCsll,
      receitaNormal,
      receitaExcedente,
      baseIrpjLP,
      baseCsllLP,
      irpjLPMensal,
      csllLPMensal,
      pisCofinsLP,
      encargosPatronais,
      icmsIss,
      presumido,
      margemPct,
      lucroEstimado,
      irpjLR,
      csllLR,
      pisCofinsDebitoLR,
      creditosPisCofins,
      pisCofinsLR,
      real,
      menor,
      maior,
      menorRegime,
      diferenca: maior - menor,
      tributoLocalPct,
      encargosPct,
      aplicaAcrescimoCsll,
    })
  }

  const statusCarga = (valor, todos) => {
    const min = Math.min(...todos)
    const max = Math.max(...todos)
    if (valor === min) return { cor: C.verde, label: 'Menor carga estimada' }
    if (valor === max) return { cor: C.vermelho, label: 'Maior carga estimada' }
    return { cor: C.laranja, label: 'Carga intermediária' }
  }

  const LinhaMemoria = ({ label, valor, destaque = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '5px 0' }}>
      <span style={{ color: C.muted }}>{label}</span>
      <strong style={{ color: destaque ? C.verde : C.text, textAlign: 'right' }}>{valor}</strong>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ background: '#F0F4FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: isMobile ? 14 : '16px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 5 }}>📊 Economia Fiscal — Comparador 2026</div>
        <div style={{ fontSize: 12, lineHeight: 1.55, color: '#1e40af' }}>
          Compara cargas mensais estimadas de Simples Nacional, Lucro Presumido e Lucro Real com premissas explícitas. O resultado é uma triagem de planejamento, não uma indicação automática de regime.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
        <Card style={{ padding: isMobile ? 18 : '24px 28px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 18 }}>Dados do cenário</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <Campo label="Atividade principal">
              <select value={atividade} onChange={e => { setAtividade(e.target.value); setResult(null) }} style={selectStyle}>
                <option value="comercio">Comércio / revenda — Anexo I</option>
                <option value="servico_fator_r">Serviço sujeito ao Fator R — Anexo III ou V</option>
              </select>
            </Campo>

            <Campo label="Trimestre de 2026">
              <select value={trimestre} onChange={e => setTrimestre(e.target.value)} style={selectStyle}>
                <option value="1">1º trimestre</option>
                <option value="2">2º trimestre</option>
                <option value="3">3º trimestre</option>
                <option value="4">4º trimestre</option>
              </select>
            </Campo>

            <Campo label="Receita mensal de referência (R$)">
              <InputMoeda value={receita} onChange={setReceita} placeholder="Ex: 150.000,00" />
            </Campo>

            <Campo label="Receita bruta do trimestre (R$)">
              <InputMoeda value={receitaTrimestre} onChange={setReceitaTrimestre} placeholder="Ex: 450.000,00" />
            </Campo>

            <Campo label="RBT12 — 12 meses anteriores ao PA (R$)">
              <InputMoeda value={rbt12} onChange={setRbt12} placeholder="Ex: 1.800.000,00" />
            </Campo>

            {atividade === 'servico_fator_r' && (
              <Campo label="FS12 — folha + encargos dos 12 meses anteriores (R$)">
                <InputMoeda value={fs12} onChange={setFs12} placeholder="Ex: 540.000,00" />
              </Campo>
            )}

            <Campo label="Folha mensal atual (R$)">
              <InputMoeda value={folha} onChange={setFolha} placeholder="Ex: 40.000,00" />
            </Campo>

            <Campo label="Margem de lucro tributável estimada no Lucro Real (%)">
              <input
                value={margem}
                onChange={e => setMargem(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 20"
                style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }}
              />
            </Campo>

            <Campo label={atividade === 'comercio' ? 'ICMS efetivo fora do Simples (%)' : 'ISS efetivo fora do Simples (%)'}>
              <input
                value={tributoLocal}
                onChange={e => setTributoLocal(e.target.value)}
                inputMode="decimal"
                placeholder={atividade === 'comercio' ? 'Ex: 12' : 'Ex: 5'}
                style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }}
              />
            </Campo>

            <Campo label="Encargos patronais efetivos fora do Simples (%)">
              <input
                value={encargosFolha}
                onChange={e => setEncargosFolha(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 28"
                style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}>
                Ajuste conforme CPP, RAT/FAP, terceiros, FPAS e eventual regime específico da empresa. O valor inicial de 28% é apenas referência editável.
              </div>
            </Campo>

            <Campo label="Créditos mensais aproveitáveis de PIS/Cofins no Lucro Real (R$)">
              <InputMoeda value={creditosLR} onChange={setCreditosLR} placeholder="Informe 0,00 se não houver" />
            </Campo>

            <button onClick={calcular} style={btnCalc}>⚡ Comparar cenário 2026</button>
          </div>
        </Card>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ResultCard
              label="Menor carga estimada no cenário"
              valor={fmtR(result.menor)}
              cor={C.verde}
              sub={`${result.menorRegime} — comparação mensal`}
            />

            {[
              {
                regime: 'Simples Nacional',
                valor: result.simples,
                desc: `Anexo ${result.anexoSN} — alíquota efetiva ${fmtP4(result.aliqEfSN * 100)}`,
              },
              {
                regime: 'Lucro Presumido',
                valor: result.presumido,
                desc: 'IRPJ + CSLL + PIS/Cofins + encargos + ICMS/ISS informado',
              },
              {
                regime: 'Lucro Real',
                valor: result.real,
                desc: 'IRPJ + CSLL + PIS/Cofins líquidos de créditos + encargos + ICMS/ISS informado',
              },
            ].map((item, i) => {
              const comp = statusCarga(item.valor, [result.simples, result.presumido, result.real])
              return (
                <div key={i} style={{ background: comp.cor + '10', border: `2px solid ${comp.cor}33`, borderRadius: 12, padding: isMobile ? 14 : '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{item.regime}</div>
                      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.45, marginTop: 3 }}>{item.desc}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: comp.cor, marginTop: 6 }}>{comp.label}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: comp.cor }}>{fmtR(item.valor)}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>carga mensal estimada</div>
                    </div>
                  </div>
                </div>
              )
            })}

            <ResultCard
              label="Diferença entre maior e menor estimativa"
              valor={fmtR(result.diferenca)}
              cor={C.navy}
              sub={`${fmtR(result.diferenca * 12)} em 12 meses, se as premissas permanecerem constantes`}
            />

            {result.atividade === 'servico_fator_r' && (
              <Card style={{ padding: isMobile ? 14 : '16px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Fator R</div>
                <LinhaMemoria label="FS12" valor={fmtR(result.fs)} />
                <LinhaMemoria label="RBT12" valor={fmtR(result.rbt)} />
                <LinhaMemoria label="Fator R" valor={fmtP4(result.fatorR * 100)} />
                <LinhaMemoria label="Enquadramento usado" valor={`Anexo ${result.anexoSN}`} destaque />
              </Card>
            )}

            <Card style={{ padding: isMobile ? 14 : '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Memória — Lucro Presumido</div>
              <LinhaMemoria label="Receita do trimestre" valor={fmtR(result.rTrim)} />
              <LinhaMemoria label="Receita até R$ 1,25 mi" valor={fmtR(result.receitaNormal)} />
              <LinhaMemoria label="Receita excedente" valor={fmtR(result.receitaExcedente)} />
              <LinhaMemoria label="Presunção IRPJ normal" valor={fmtP(result.presIrpj * 100)} />
              <LinhaMemoria label="Presunção IRPJ no excedente" valor={fmtP(result.presIrpj * 110)} />
              <LinhaMemoria label="Presunção CSLL normal" valor={fmtP(result.presCsll * 100)} />
              <LinhaMemoria
                label="Presunção CSLL no excedente"
                valor={result.aplicaAcrescimoCsll ? fmtP(result.presCsll * 110) : `${fmtP(result.presCsll * 100)} — 1º tri/2026`}
              />
              <LinhaMemoria label="IRPJ mensal equivalente" valor={fmtR(result.irpjLPMensal)} />
              <LinhaMemoria label="CSLL mensal equivalente" valor={fmtR(result.csllLPMensal)} />
              <LinhaMemoria label="PIS/Cofins cumulativos" valor={fmtR(result.pisCofinsLP)} />
              <LinhaMemoria label="Encargos patronais informados" valor={fmtR(result.encargosPatronais)} />
              <LinhaMemoria label={result.atividade === 'comercio' ? 'ICMS informado' : 'ISS informado'} valor={fmtR(result.icmsIss)} />
              <LinhaMemoria label="Total mensal estimado" valor={fmtR(result.presumido)} destaque />
            </Card>

            <Card style={{ padding: isMobile ? 14 : '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Memória — Lucro Real</div>
              <LinhaMemoria label="Lucro tributável estimado" valor={`${fmtR(result.lucroEstimado)} (${fmtP(result.margemPct)})`} />
              <LinhaMemoria label="IRPJ estimado" valor={fmtR(result.irpjLR)} />
              <LinhaMemoria label="CSLL estimada" valor={fmtR(result.csllLR)} />
              <LinhaMemoria label="Débito PIS/Cofins a 9,25%" valor={fmtR(result.pisCofinsDebitoLR)} />
              <LinhaMemoria label="Créditos PIS/Cofins informados" valor={`− ${fmtR(result.creditosPisCofins)}`} />
              <LinhaMemoria label="PIS/Cofins líquidos estimados" valor={fmtR(result.pisCofinsLR)} />
              <LinhaMemoria label="Encargos patronais informados" valor={fmtR(result.encargosPatronais)} />
              <LinhaMemoria label={result.atividade === 'comercio' ? 'ICMS informado' : 'ISS informado'} valor={fmtR(result.icmsIss)} />
              <LinhaMemoria label="Total mensal estimado" valor={fmtR(result.real)} destaque />
            </Card>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '11px 14px', fontSize: 11, color: '#92400e', lineHeight: 1.55 }}>
              ⚠️ <strong>Triagem de planejamento 2026.</strong> O comparador pressupõe uma única atividade e não contempla, entre outros pontos, benefícios específicos, monofásicos, substituição tributária, sublimites, Anexo IV, CPRB, incentivos, adições/exclusões do Lucro Real, diferenças estaduais/municipais ou particularidades de créditos. A decisão de regime exige conferência contábil e fiscal completa.
            </div>
          </div>
        ) : (
          <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: C.muted, minHeight: 300, textAlign: 'center', padding: isMobile ? 18 : '24px 28px' }}>
            <div style={{ fontSize: 46, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Compare com premissas visíveis</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 300 }}>
              O FiscalTribe mostrará a memória de cada regime para que o resultado possa ser conferido e ajustado ao caso real.
            </div>
          </Card>
        )}
      </div>
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
    numero: '6/2026',
    publicacao: '01/06/2026',
    prazoAdesao: '30/09/2026',
    prazoAdesaoCompleto: '30/09/2026 às 19h',
    status: 'encerrado',
    limiteDebito: 45000000,
    portal: 'regularize.pgfn.gov.br',
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
      label: '📋 Edital PGFN 6/2026 — ENCERRADO — uso histórico/estimativo',
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
        parcelamento_ordinario: { label: 'Parcelamento Ordinário (Lei 10.522/2002)',   descricao: 'Parcelamento próprio da PGFN, fora do Edital 6/2026, em até 60 prestações e sem desconto. A elegibilidade e as condições finais devem ser confirmadas no Regularize.', inscricaoAte: 'Sem prazo de edital — verificar elegibilidade no Regularize', usaCapag: false, fonte: 'Lei 10.522/2002 — arts. 10 a 13; Portaria PGFN 448/2019' },
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
  const MODALIDADES_EDITAL_6 = ['capag', 'dificil', 'pequeno_valor', 'garantido']
  const isEdital6Encerrado = MODALIDADES_EDITAL_6.includes(modalidade)
  const isParcelamentoOrdinario = modalidade === 'parcelamento_ordinario'
  const isParcelamentoHistorico = modalidade === 'parcelamento_especial'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {isEdital6Encerrado ? (
        <>
          <div style={{ background: '#0B1F4D', borderRadius: 14, padding: isMobile ? '14px 18px' : '16px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, boxSizing: 'border-box' }}>
            <div>
              <div style={{ fontSize: 11, color: '#fde68a', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>EDITAL PGFN Nº {EDITAL.numero} — PRAZO ENCERRADO</div>
              <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: '#fff' }}>Transação Tributária — Dívida Ativa da União</div>
              <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>Publicado em {EDITAL.publicacao} · {EDITAL.portal}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#fecaca', fontWeight: 800, marginBottom: 2 }}>⛔ ADESÃO ENCERRADA</div>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: '#fecaca' }}>30/09/2026</div>
              <div style={{ fontSize: 11, color: '#93c5fd' }}>encerrado às 19h — horário de Brasília</div>
            </div>
          </div>

          <div style={{ background: '#fff7ed', border: '2px solid #fdba74', borderRadius: 12, padding: isMobile ? '12px 14px' : '13px 18px', color: '#9a3412', fontSize: 12, lineHeight: 1.55 }}>
            <strong>⚠️ Edital com prazo de adesão encerrado.</strong> Esta simulação permanece disponível exclusivamente para estudo e estimativa histórica das condições do Edital PGFN nº {EDITAL.numero}. O resultado não representa modalidade atualmente disponível para adesão. O FiscalTribe aguarda nova orientação oficial da PGFN ou publicação de novo edital aplicável; após validação, a nova regra poderá ser incorporada ao sistema.
          </div>
        </>
      ) : isParcelamentoOrdinario ? (
        <>
          <div style={{ background: '#0B1F4D', borderRadius: 14, padding: isMobile ? '14px 18px' : '16px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, boxSizing: 'border-box' }}>
            <div>
              <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>PARCELAMENTO ORDINÁRIO — LEI 10.522/2002</div>
              <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: '#fff' }}>Parcelamento de Dívida Ativa da União</div>
              <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>PGFN / Regularize · modalidade fora do Edital 6/2026</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#bbf7d0', fontWeight: 800, marginBottom: 2 }}>✓ NÃO VINCULADO AO PRAZO DO EDITAL</div>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: '#bbf7d0' }}>ATÉ 60 PRESTAÇÕES</div>
              <div style={{ fontSize: 11, color: '#93c5fd' }}>sem desconto na simulação</div>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 12, padding: isMobile ? '12px 14px' : '13px 18px', color: '#1e40af', fontSize: 12, lineHeight: 1.55 }}>
            <strong>ℹ️ Parcelamento Ordinário não integra o Edital PGFN nº 6/2026.</strong> Portanto, o encerramento do edital em 30/09/2026 não encerra esta modalidade. A simulação considera parcelamento sem desconto; elegibilidade, quantidade efetiva de prestações, valor mínimo e demais condições devem ser confirmados no Portal Regularize.
          </div>
        </>
      ) : (
        <div style={{ background: '#0B1F4D', borderRadius: 14, padding: isMobile ? '14px 18px' : '16px 24px', color: '#fff', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>NEGOCIAÇÃO PGFN — MODALIDADE ESPECÍFICA</div>
          <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: '#fff' }}>{modAtual?.label || 'Negociação de Dívida Ativa da União'}</div>
          <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>Verifique as condições e a disponibilidade atual no Portal Regularize.</div>
        </div>
      )}

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
              {isPP && ['capag', 'dificil'].includes(modalidade) && (
                <div style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '4px 8px', marginTop: 4 }}>
                  ✅ Pequeno porte — limite global de desconto pode chegar a 70%, conforme as regras e a modalidade aplicável
                </div>
              )}
            </Campo>

            <Campo label="Valor total da dívida (R$) *">
              <InputMoeda value={divida} onChange={setDivida} placeholder="Ex: 500.000" />
              {isEdital6Encerrado ? (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Referência histórica do Edital 6/2026: limite de R$ 45 milhões por sujeito passivo.</div>
              ) : isParcelamentoOrdinario ? (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>PGFN: até R$ 15 milhões, parcelamento sem garantia; acima desse valor, verificar exigência de garantia no Regularize.</div>
              ) : null}
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
            {isEdital6Encerrado ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#92400e' }}>
                ⚠️ Simulação estimativa/histórica de modalidade do Edital 6/2026 encerrado. Composição real da dívida e CAPAG oficial podem impactar os valores. Consulte o Portal Regularize para verificar modalidades atualmente disponíveis.
              </div>
            ) : isParcelamentoOrdinario ? (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#1e40af' }}>
                ℹ️ Simulação de Parcelamento Ordinário, fora do Edital 6/2026. Não há desconto aplicado. O valor final das prestações e a elegibilidade devem ser confirmados no Regularize.
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#475569' }}>
                ℹ️ Simulação indicativa. Confirme no Regularize a disponibilidade e as condições oficiais da modalidade selecionada.
              </div>
            )}
          </div>
        </Card>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#0B1F4D', borderRadius: 12, padding: '14px 18px', color: '#fff' }}>
              <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, marginBottom: 4 }}>{isParcelamentoOrdinario ? 'SIMULAÇÃO DE PARCELAMENTO ORDINÁRIO' : 'SIMULAÇÃO DE TRANSAÇÃO / NEGOCIAÇÃO'}</div>
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

            {isParcelamentoOrdinario ? (
              <Card style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10 }}>📊 Base da simulação</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 12 }}>
                  <span style={{ color: C.muted }}>Valor total informado</span>
                  <span style={{ fontWeight: 800, color: C.navy, textAlign: 'right' }}>{fmtR(result.d)}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: C.muted, lineHeight: 1.55 }}>
                  Para o Parcelamento Ordinário, o FiscalTribe não cria uma composição estimada entre principal, multas, juros e encargos, porque não há desconto aplicado nesta simulação.
                </div>
              </Card>
            ) : !isParcelamentoHistorico && (
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
            )}

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
              <div style={{ background: ['capag','dificil','pequeno_valor','garantido','desenrola_rural'].includes(modalidade) ? '#fff7ed' : '#f0fdf4', border: `2px solid ${['capag','dificil','pequeno_valor','garantido','desenrola_rural'].includes(modalidade) ? '#fdba74' : '#86efac'}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: ['capag','dificil','pequeno_valor','garantido','desenrola_rural'].includes(modalidade) ? '#9a3412' : '#166534', fontWeight: 600, textAlign: 'center' }}>
                {['capag','dificil','pequeno_valor','garantido','desenrola_rural'].includes(modalidade) ? (
                  <>
                    ⛔ Prazo de adesão encerrado em {EDITAL.prazoAdesaoCompleto}. Simulação mantida para estudo/estimativa histórica.<br />
                    <span style={{ fontWeight: 400, color: '#b45309' }}>Consulte o Regularize para modalidades atualmente disponíveis · {EDITAL.portal}</span>
                  </>
                ) : (
                  <>
                    🌐 Negociação contínua — sem prazo deste edital<br />
                    <span style={{ fontWeight: 400, color: '#16a34a' }}>{EDITAL.portal}</span>
                  </>
                )}
              </div>
            )}

            {isParcelamentoOrdinario && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#475569' }}>
                ℹ️ Parcelamento Ordinário fora do Edital PGFN 6/2026. Nesta simulação não há desconto: o saldo informado é distribuído pelo número de prestações selecionado, sem projetar a atualização futura das parcelas. Confirme as condições finais no Regularize.
              </div>
            )}

            {isParcelamentoHistorico && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#475569' }}>
                ℹ️ Parcelamento especial histórico. As condições dependem do programa específico; confirme saldo, situação e regras aplicáveis antes de utilizar a estimativa.
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
              ⛔ Edital 6/2026 — prazo encerrado em <strong>30/09/2026 às 19h</strong>. Simulação disponível para estudo histórico.
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
      <div style={{ background: '#0B1F4D', borderRadius: 14, padding: isMobile ? '16px 18px' : '18px 24px', marginBottom: 16, color: '#fff', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>e-FISCALTRIBE — FERRAMENTAS COMERCIAIS</div>
        <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Simuladores Tributários</div>
        <div style={{ fontSize: 13, color: '#93c5fd' }}>Demonstre oportunidades e feche contratos com simulações rápidas e profissionais — incluindo Reforma Tributária 2026–2032, transações PGFN e histórico de editais.</div>
      </div>

      {isMobile ? (
  <div style={{ marginBottom: 18 }}>
    <label
      htmlFor="simulador-mobile"
      style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 700,
        color: C.text,
        marginBottom: 6
      }}
    >
      Escolha o simulador
    </label>

    <select
      id="simulador-mobile"
      value={aba}
      onChange={(e) => setAba(e.target.value)}
      style={{
        width: '100%',
        height: 48,
        padding: '0 14px',
        background: C.white,
        color: C.text,
        border: `2px solid ${C.navy}`,
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 700,
        boxSizing: 'border-box',
        cursor: 'pointer'
      }}
    >
      {ABAS.map(a => (
        <option key={a.id} value={a.id}>
          {a.icon} {a.label}
        </option>
      ))}
    </select>
  </div>
) : (
  <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
    {ABAS.map(a => (
      <button
        key={a.id}
        onClick={() => setAba(a.id)}
        style={{
          padding: '10px 16px',
          background: aba === a.id ? C.navy : C.white,
          color: aba === a.id ? '#fff' : C.text,
          border: `2px solid ${aba === a.id ? C.navy : C.border}`,
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        {a.icon} {a.label}
      </button>
    ))}
  </div>
)}

      {aba === 'regime'       && <SimRegimeReforma isMobile={isMobile} />}
      {aba === 'recuperacao'  && <SimRecuperacao   isMobile={isMobile} />}
      {aba === 'economia'     && <SimEconomia      isMobile={isMobile} />}
      {aba === 'transacao'    && <SimTransacao     isMobile={isMobile} />}
      {aba === 'parcelamento' && <SimParcelamento  isMobile={isMobile} />}
      {aba === 'honorarios'   && <SimHonorarios    isMobile={isMobile} />}
    </div>
  )
}