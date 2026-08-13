/**
 * ConciliacaoCFOP.jsx - e-FiscalTribe®
 * Sprint 3C — Tela de conciliacao de receita por CFOP
 * Versao 1.0 - 12/08/2026
 * Replica e supera o e-Recuperador
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#334155',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#0F172A', ghost: '#64748B',
}

function fmtR(v) {
  if (!v && v !== 0) return 'R$ —'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ConciliacaoCFOP({
  clienteId,
  competencia,
  receitaDeclarada,   // do PGDAS-D
  receitaApurada,     // dos XMLs
  cfopsXML,           // array { cfop, descricao, valor, valor_desconto }
  onInterromper,
  onManter,
  onProsseguir,       // passa receitaFinal para o calculo
  onFechar,
}) {
  const [cfopsEmpresa, setCfopsEmpresa] = useState([])
  const [loading, setLoading] = useState(true)
  const [consideraDesconto, setConsideraDesconto] = useState(true)
  const [consideraDevolucao, setConsideraDevolucao] = useState(true)
  const [receitaCalculada, setReceitaCalculada] = useState(receitaApurada || 0)

  // CFOPs dos XMLs separados em considera/nao_considera
  const [cfopsConsidera, setCfopsConsidera] = useState([])
  const [cfopsNaoConsidera, setCfopsNaoConsidera] = useState([])

  const diferenca = receitaDeclarada - receitaCalculada
  const totalDevolucao = cfopsXML
    ?.filter(c => ['5201','5202','5209','5210','6201','6202','6209','6210'].includes(c.cfop))
    ?.reduce((s, c) => s + (c.valor || 0), 0) || 0

  useEffect(() => {
    if (clienteId) carregarCFOPs()
  }, [clienteId])

  async function carregarCFOPs() {
    setLoading(true)
    const { data } = await supabase
      .from('empresa_cfops')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('cfop')
    setCfopsEmpresa(data || [])
    setLoading(false)
  }

  // Distribui os CFOPs dos XMLs entre as duas colunas conforme configuracao da empresa
  useEffect(() => {
    if (!cfopsEmpresa.length || !cfopsXML?.length) return

    const mapaConfig = {}
    cfopsEmpresa.forEach(c => { mapaConfig[c.cfop] = c })

    const considera = [], naoConsidera = []
    cfopsXML.forEach(item => {
      const config = mapaConfig[item.cfop]
      if (!config || config.considera_receita) {
        considera.push({ ...item, considera_receita: true })
      } else {
        naoConsidera.push({ ...item, considera_receita: false })
      }
    })

    setCfopsConsidera(considera)
    setCfopsNaoConsidera(naoConsidera)
  }, [cfopsEmpresa, cfopsXML])

  // Recalcula receita apurada quando muda considera/nao_considera ou toggles
  useEffect(() => {
    let total = cfopsConsidera.reduce((s, c) => {
      let v = c.valor || 0
      if (consideraDesconto) v -= (c.valor_desconto || 0)
      return s + v
    }, 0)
    if (consideraDevolucao) total -= totalDevolucao
    setReceitaCalculada(Math.max(0, total))
  }, [cfopsConsidera, consideraDesconto, consideraDevolucao, totalDevolucao])

  function moverParaNaoConsidera(cfop) {
    const item = cfopsConsidera.find(c => c.cfop === cfop)
    if (!item) return
    setCfopsConsidera(prev => prev.filter(c => c.cfop !== cfop))
    setCfopsNaoConsidera(prev => [...prev, { ...item, considera_receita: false }])
    // Atualiza no banco
    supabase.from('empresa_cfops')
      .update({ considera_receita: false })
      .eq('cliente_id', clienteId)
      .eq('cfop', cfop)
      .then(() => {})
  }

  function moverParaConsidera(cfop) {
    const item = cfopsNaoConsidera.find(c => c.cfop === cfop)
    if (!item) return
    setCfopsNaoConsidera(prev => prev.filter(c => c.cfop !== cfop))
    setCfopsConsidera(prev => [...prev, { ...item, considera_receita: true }])
    // Atualiza no banco
    supabase.from('empresa_cfops')
      .update({ considera_receita: true })
      .eq('cliente_id', clienteId)
      .eq('cfop', cfop)
      .then(() => {})
  }

  const totalConsidera = cfopsConsidera.reduce((s, c) => {
    let v = c.valor || 0
    if (consideraDesconto) v -= (c.valor_desconto || 0)
    return s + v
  }, 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: S.white, borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* HEADER */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: S.navy }}>Conciliacao de Receita por CFOP</div>
            <div style={{ fontSize: 12, color: S.ghost, marginTop: 2 }}>Competencia: <strong>{competencia}</strong></div>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: S.ghost }}>X</button>
        </div>

        {/* BANNER AVISO */}
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', margin: '12px 20px', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
          A receita total declarada no PGDAS-D esta diferente da receita total apurada pelo e-FiscalTribe. Ajuste os CFOPs abaixo para conciliar.
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 20px 12px' }}>
          {[
            { label: 'Receita Declarada (PGDAS-D)', valor: fmtR(receitaDeclarada), cor: S.navy },
            { label: 'Receita Apurada (XMLs)', valor: fmtR(receitaCalculada), cor: S.blue },
            { label: 'Diferenca', valor: fmtR(Math.abs(diferenca)), cor: Math.abs(diferenca) < 1 ? S.green : S.red, icone: Math.abs(diferenca) < 1 ? '=' : diferenca > 0 ? '-' : '+' },
          ].map((k, i) => (
            <div key={i} style={{ background: S.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: S.ghost, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: k.cor }}>{k.icone && <span style={{ marginRight: 4 }}>{k.icone}</span>}{k.valor}</div>
            </div>
          ))}
        </div>

        {/* TOGGLES */}
        <div style={{ display: 'flex', gap: 16, padding: '0 20px 12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Considerar desconto?', value: consideraDesconto, set: setConsideraDesconto },
            { label: `Considerar devolucao? ${fmtR(totalDevolucao)}`, value: consideraDevolucao, set: setConsideraDevolucao },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: S.bg, borderRadius: 8, padding: '8px 14px', border: `1px solid ${S.border}` }}>
              <span style={{ fontSize: 12, color: S.text, fontWeight: 500 }}>{t.label}</span>
              <button onClick={() => t.set(v => !v)}
                style={{ background: t.value ? S.blue : '#CBD5E1', border: 'none', borderRadius: 99, width: 36, height: 20, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: t.value ? 18 : 2, width: 16, height: 16, background: S.white, borderRadius: '50%', transition: 'left 0.2s' }} />
              </button>
            </div>
          ))}
        </div>

        {/* COLUNAS CFOP */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 12px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8 }}>

          {/* VERDE — CONSIDERA RECEITA */}
          <div style={{ border: `1px solid #86efac`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#f0fdf4', padding: '8px 12px', borderBottom: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.green }}>CONSIDERA RECEITA ({cfopsConsidera.length})</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.green }}>{fmtR(totalConsidera)}</span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 300 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    {['CFOP','Descricao','Valor','Desconto','Total'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: h === 'CFOP' ? 'left' : 'right', color: S.green, fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ width: 24 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(3).fill(null).map((_, i) => (
                      <tr key={i}><td colSpan={6} style={{ padding: '8px 12px' }}><div style={{ height: 12, background: '#E2E8F0', borderRadius: 4 }} /></td></tr>
                    ))
                  ) : cfopsConsidera.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: S.ghost, fontSize: 11 }}>Nenhum CFOP</td></tr>
                  ) : (
                    cfopsConsidera.map((c, i) => (
                      <tr key={c.cfop} style={{ borderBottom: `1px solid #f0fdf4`, background: i % 2 === 0 ? S.white : '#fafffe' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 700, color: S.green }}>{c.cfop}</td>
                        <td style={{ padding: '5px 8px', color: S.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.descricao}>{c.descricao || '—'}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: S.text }}>{fmtR(c.valor)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: S.ghost }}>{fmtR(c.valor_desconto)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{fmtR((c.valor || 0) - (consideraDesconto ? (c.valor_desconto || 0) : 0))}</td>
                        <td style={{ padding: '5px 8px' }}>
                          <button onClick={() => moverParaNaoConsidera(c.cfop)}
                            title="Mover para Nao Considera"
                            style={{ background: 'none', border: `1px solid #86efac`, borderRadius: 4, cursor: 'pointer', fontSize: 10, color: S.red, padding: '2px 5px', fontWeight: 700 }}>
                            X
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SETA CENTRAL */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.ghost, fontSize: 18, paddingTop: 40 }}>
            ↔
          </div>

          {/* VERMELHO — NAO CONSIDERA RECEITA */}
          <div style={{ border: `1px solid #fecaca`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#fef2f2', padding: '8px 12px', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.red }}>NAO CONSIDERA RECEITA ({cfopsNaoConsidera.length})</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.red }}>{fmtR(cfopsNaoConsidera.reduce((s, c) => s + (c.valor || 0), 0))}</span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 300 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th style={{ width: 24 }}></th>
                    {['CFOP','Descricao','Valor'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: h === 'CFOP' ? 'left' : 'right', color: S.red, fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(3).fill(null).map((_, i) => (
                      <tr key={i}><td colSpan={4} style={{ padding: '8px 12px' }}><div style={{ height: 12, background: '#E2E8F0', borderRadius: 4 }} /></td></tr>
                    ))
                  ) : cfopsNaoConsidera.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: S.ghost, fontSize: 11 }}>Nenhum CFOP</td></tr>
                  ) : (
                    cfopsNaoConsidera.map((c, i) => (
                      <tr key={c.cfop} style={{ borderBottom: `1px solid #fef2f2`, background: i % 2 === 0 ? S.white : '#fffafa' }}>
                        <td style={{ padding: '5px 8px' }}>
                          <button onClick={() => moverParaConsidera(c.cfop)}
                            title="Mover para Considera"
                            style={{ background: 'none', border: `1px solid #fecaca`, borderRadius: 4, cursor: 'pointer', fontSize: 10, color: S.green, padding: '2px 5px', fontWeight: 700 }}>
                            +
                          </button>
                        </td>
                        <td style={{ padding: '5px 8px', fontWeight: 700, color: S.red }}>{c.cfop}</td>
                        <td style={{ padding: '5px 8px', color: S.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.descricao}>{c.descricao || '—'}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: S.red }}>{fmtR(c.valor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BOTOES DE DECISAO */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${S.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={onInterromper}
            style={{ padding: '8px 16px', background: 'none', border: `2px solid ${S.red}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.red }}>
            Interromper apuracao
          </button>
          <button onClick={onManter}
            style={{ padding: '8px 16px', background: 'none', border: `2px solid ${S.orange}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.orange }}>
            Manter divergencia e gerar planilha
          </button>
          <button onClick={() => onProsseguir(receitaDeclarada)}
            style={{ padding: '8px 16px', background: 'none', border: `2px solid ${S.blue}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.blue }}>
            Prosseguir com receita declarada
          </button>
          <button onClick={() => onProsseguir(receitaCalculada)}
            style={{ padding: '8px 16px', background: S.green, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.white }}>
            Prosseguir com receita apurada
          </button>
        </div>
      </div>
    </div>
  )
}