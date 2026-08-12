/**
 * PainelRecuperacao.jsx - e-FiscalTribe®
 * Sprint 3 — Painel multi-empresa de Recuperação PIS/COFINS Monofásico
 * Versao 1.0 - 12/08/2026
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import AbaRecuperacaoMonofasicos from './AbaRecuperacaoMonofasicos'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#334155',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#0F172A', thBg: '#4B5563', thText: '#FFFFFF',
  ghost: '#64748B',
}

function fmtR(v) {
  if (!v && v !== 0) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('pt-BR')
}

function StatusBadge({ status }) {
  const map = {
    auditado:    { bg: '#f0fdf4', color: '#16a34a', border: '#86efac', label: 'Auditado' },
    pendente:    { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: 'Pendente' },
    divergencia: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Divergência' },
    processando: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Processando' },
  }
  const b = map[status] || map.pendente
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
      {b.label}
    </span>
  )
}

const GHOST = Array(4).fill(null)

export default function PainelRecuperacao() {
  const [resumos, setResumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [clienteAberto, setClienteAberto] = useState(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const { data: clts } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj, regime')
        .order('razao_social')

      const { data: diags } = await supabase
        .from('diagnosticos_monofasicos')
        .select('cliente_id, competencia, credito_estimado, status, created_at')
        .order('competencia', { ascending: false })

      const mapa = {}
      ;(clts || []).forEach(c => {
        mapa[c.id] = {
          ...c,
          competencias_cadastradas: 0,
          competencias_auditadas: 0,
          credito_apurado: 0,
          ultimo_processamento: null,
          status: 'pendente',
        }
      })

      ;(diags || []).forEach(d => {
        if (!mapa[d.cliente_id]) return
        const m = mapa[d.cliente_id]
        m.competencias_cadastradas++
        if (d.status === 'concluido' || d.status === 'auditado') {
          m.competencias_auditadas++
          m.credito_apurado += d.credito_estimado || 0
          m.status = 'auditado'
        }
        if (!m.ultimo_processamento || d.created_at > m.ultimo_processamento) {
          m.ultimo_processamento = d.created_at
        }
      })

      setResumos(Object.values(mapa))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const totalEmpresas     = resumos.length
  const empresasAuditadas = resumos.filter(r => r.status === 'auditado').length
  const creditoTotal      = resumos.reduce((s, r) => s + (r.credito_apurado || 0), 0)
  const competenciasTotal = resumos.reduce((s, r) => s + r.competencias_cadastradas, 0)

  const resumosFiltrados = resumos.filter(r => {
    if (!busca) return true
    const b = busca.toLowerCase()
    return r.razao_social?.toLowerCase().includes(b) || r.cnpj?.includes(b)
  })

  function exportarCSV() {
    setExportando(true)
    const headers = ['Empresa', 'CNPJ', 'Regime', 'Comp. Cadastradas', 'Comp. Auditadas', 'Crédito Apurado', 'Status']
    const rows = resumosFiltrados.map(r => [
      r.razao_social, r.cnpj, r.regime || 'Simples Nacional',
      r.competencias_cadastradas, r.competencias_auditadas,
      (r.credito_apurado || 0).toFixed(2), r.status
    ])
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `painel_recuperacao_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportando(false)
  }

  if (clienteAberto) {
    return (
      <div style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${S.border}` }}>
          <button onClick={() => { setClienteAberto(null); carregar() }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 13, cursor: 'pointer', color: S.muted, fontWeight: 500 }}>
            ← Voltar ao Painel
          </button>
          <span style={{ fontSize: 13, color: S.muted }}>Recuperação de Créditos /</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.navy }}>{clienteAberto.razao_social}</span>
        </div>
        <AbaRecuperacaoMonofasicos clientePre={clienteAberto} />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Recuperação de Créditos / <strong style={{ color: S.text }}>PIS/COFINS Monofásico</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Apuração de Crédito — PIS/COFINS</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Visão consolidada de todas as empresas com recuperação de PIS/COFINS monofásico.
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de Empresas',      valor: loading ? '—' : totalEmpresas,        cor: S.navy  },
          { label: 'Empresas Auditadas',      valor: loading ? '—' : empresasAuditadas,    cor: S.green },
          { label: 'Crédito Total Apurado',   valor: loading ? '—' : fmtR(creditoTotal),   cor: S.green },
          { label: 'Competências Analisadas', valor: loading ? '—' : competenciasTotal,    cor: S.blue  },
        ].map((k, i) => (
          <div key={i} style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
            {loading ? (
              <>
                <div style={{ height: 24, background: S.border, borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 12, background: '#F1F5F9', borderRadius: 4, width: '70%', margin: '0 auto' }} />
              </>
            ) : (
              <>
                <div style={{ fontSize: i === 2 ? 15 : 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>{k.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* TABELA */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>

        {/* TOOLBAR */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por Razão Social ou CNPJ..."
            style={{ padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 13, outline: 'none', width: 280 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={carregar}
              style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', color: S.muted }}>
              ↺ Atualizar
            </button>
            <button onClick={exportarCSV} disabled={exportando}
              style={{ padding: '7px 14px', background: S.green, color: S.white, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ⬇ Exportar CSV
            </button>
          </div>
        </div>

        {/* TABELA EMPRESAS */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.thBg }}>
                {['Empresa', 'CNPJ', 'Regime', 'Comp. Cadastradas', 'Comp. Auditadas', 'Crédito Apurado PIS/COFINS', 'Último Proc.', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: ['Comp. Cadastradas','Comp. Auditadas','Crédito Apurado PIS/COFINS'].includes(h) ? 'center' : 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                GHOST.map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                    {Array(9).fill(null).map((__, j) => (
                      <td key={j} style={{ padding: '10px 12px' }}>
                        <div style={{ height: 13, borderRadius: 4, background: '#F1F5F9', width: j === 0 ? '80%' : '50%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : resumosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: S.ghost }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nenhuma empresa encontrada</div>
                    <div style={{ fontSize: 13 }}>{busca ? 'Tente uma busca diferente' : 'Cadastre clientes para ver o painel'}</div>
                  </td>
                </tr>
              ) : (
                resumosFiltrados.map((r, i) => (
                  <tr key={r.id}
                    style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? S.white : '#FAFAFA'}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: S.navy, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.razao_social}
                    </td>
                    <td style={{ padding: '10px 12px', color: S.muted, fontFamily: 'monospace', fontSize: 11 }}>{r.cnpj}</td>
                    <td style={{ padding: '10px 12px', color: S.ghost, fontSize: 11 }}>{r.regime || 'Simples Nacional'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: r.competencias_cadastradas > 0 ? S.text : S.ghost, fontWeight: r.competencias_cadastradas > 0 ? 600 : 400 }}>
                      {r.competencias_cadastradas || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: r.competencias_auditadas > 0 ? S.green : S.ghost, fontWeight: r.competencias_auditadas > 0 ? 600 : 400 }}>
                      {r.competencias_auditadas > 0 ? `${r.competencias_auditadas}/${r.competencias_cadastradas}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: r.credito_apurado > 0 ? S.green : S.ghost, fontWeight: r.credito_apurado > 0 ? 700 : 400 }}>
                      {fmtR(r.credito_apurado)}
                    </td>
                    <td style={{ padding: '10px 12px', color: S.ghost, fontSize: 11, whiteSpace: 'nowrap' }}>
                      {fmtData(r.ultimo_processamento)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => setClienteAberto(r)}
                        style={{ padding: '5px 12px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        👁 Abrir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && resumosFiltrados.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, fontSize: 12, color: S.ghost }}>
            {resumosFiltrados.length} empresa(s) — {competenciasTotal} competência(s) analisada(s)
          </div>
        )}
      </div>
    </div>
  )
}