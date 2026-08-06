/**
 * ApuracaoSimples.jsx - e-FiscalTribe®
 * Apuracao do Simples Nacional - multi-empresa
 * Versao 1.0 - 06/08/2026
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtPct = v => parseFloat(v || 0).toFixed(2).replace('.', ',') + '%'

function Badge({ label, tipo }) {
  const map = {
    aguardando:  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    transmitida: { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    em_atraso:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    original:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    retificadora:{ bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  }
  const b = map[tipo] || map['aguardando']
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

const VAZIO = {
  competencia: '', receita_apurada: '', imposto_apurado: '',
  aliquota_efetiva: '', tipo_declaracao: 'Original',
  status_apuracao: 'Aguardando', status_declaracao: 'Aguardando',
  data_transmissao: '', transmitido_por: ''
}

export default function ApuracaoSimples() {
  const [apuracoes, setApuracoes] = useState([])
  const [clientes, setClientes] = useState({})
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [detalhe, setDetalhe] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalNova, setModalNova] = useState(false)
  const [form, setForm] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [menuAberto, setMenuAberto] = useState(null)
  const POR_PAGINA = 10

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: aps }, { data: cls }] = await Promise.all([
      supabase.from('apuracoes_simples').select('*').order('competencia', { ascending: false }),
      supabase.from('clientes').select('id, razao_social, cnpj, regime')
    ])
    setApuracoes(aps || [])
    const mapa = {}
    ;(cls || []).forEach(c => { mapa[c.id] = c })
    setClientes(mapa)
    setLoading(false)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const payload = {
        ...form,
        receita_apurada: parseFloat(form.receita_apurada || 0),
        imposto_apurado: parseFloat(form.imposto_apurado || 0),
        aliquota_efetiva: parseFloat(form.aliquota_efetiva || 0),
      }
      if (modalEditar) {
        const { error } = await supabase.from('apuracoes_simples').update(payload).eq('id', modalEditar.id)
        if (error) throw error
      } else {
        if (!form.cliente_id) return alert('Selecione a empresa')
        const { error } = await supabase.from('apuracoes_simples').insert({ ...payload, created_at: new Date().toISOString() })
        if (error) throw error
      }
      setModalEditar(null)
      setModalNova(false)
      setForm(VAZIO)
      await carregar()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta apuração?')) return
    await supabase.from('apuracoes_simples').delete().eq('id', id)
    setMenuAberto(null)
    if (detalhe?.id === id) setDetalhe(null)
    await carregar()
  }

  function abrirEditar(a) {
    setForm({ ...a, receita_apurada: a.receita_apurada?.toString(), imposto_apurado: a.imposto_apurado?.toString(), aliquota_efetiva: a.aliquota_efetiva?.toString() })
    setModalEditar(a)
    setMenuAberto(null)
  }

  function statusTipo(s) {
    if (!s) return 'aguardando'
    if (s === 'Transmitida') return 'transmitida'
    if (s === 'Em atraso') return 'em_atraso'
    return 'aguardando'
  }

  const filtradas = apuracoes.filter(a => {
    if (filtroStatus !== 'todos' && a.status_apuracao?.toLowerCase().replace(' ', '_') !== filtroStatus) return false
    if (busca) {
      const b = busca.toLowerCase()
      const cl = clientes[a.cliente_id]
      return cl?.razao_social?.toLowerCase().includes(b) || a.competencia?.includes(b)
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const pagAtual = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function imprimir() {
    window.print()
  }

  // ── TELA DETALHE ──────────────────────────────────────────────
  if (detalhe) {
    const cl = clientes[detalhe.cliente_id]
    return (
      <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text, maxWidth: 800, margin: '0 auto' }}>
        {/* PRINT STYLE */}
        <style>{`@media print { .no-print { display: none !important; } }`}</style>

        {/* HEADER */}
        <div className="no-print" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
            Motor do Simples / Apuração / <strong style={{ color: S.text }}>Detalhe</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: S.navy, flex: 1 }}>
              Apuração — {detalhe.competencia}
            </div>
            <button onClick={() => abrirEditar(detalhe)}
              style={{ padding: '7px 14px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ✏️ Editar
            </button>
            <button onClick={imprimir}
              style={{ padding: '7px 14px', background: S.navy, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🖨️ Imprimir
            </button>
            <button onClick={() => setDetalhe(null)}
              style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
              ← Voltar
            </button>
          </div>
        </div>

        {/* RELATÓRIO EXECUTIVO */}
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          {/* CABEÇALHO RELATÓRIO */}
          <div style={{ background: S.navy, padding: '18px 24px' }}>
            <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
              e-FISCALTRIBE® — MOTOR DO SIMPLES NACIONAL
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: S.white }}>
              Relatório de Apuração — {detalhe.competencia}
            </div>
            <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>
              {cl?.razao_social} · {cl?.cnpj} · {cl?.regime}
            </div>
          </div>

          {/* DADOS PRINCIPAIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, borderBottom: `1px solid ${S.border}` }}>
            {[
              { label: 'Receita Apurada', value: fmtR(detalhe.receita_apurada), color: S.navy },
              { label: 'Imposto Apurado (DAS)', value: fmtR(detalhe.imposto_apurado), color: S.red },
              { label: 'Alíquota Efetiva', value: fmtPct(detalhe.aliquota_efetiva), color: S.blue },
            ].map((k, i) => (
              <div key={i} style={{ padding: '16px 24px', borderRight: i < 2 ? `1px solid ${S.border}` : 'none' }}>
                <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* DETALHES */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.navy, marginBottom: 12 }}>Informações da Declaração</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  { label: 'Competência', value: detalhe.competencia },
                  { label: 'Tipo de Declaração', value: detalhe.tipo_declaracao },
                  { label: 'Status da Apuração', value: <Badge label={detalhe.status_apuracao || 'Aguardando'} tipo={statusTipo(detalhe.status_apuracao)} /> },
                  { label: 'Status da Declaração', value: <Badge label={detalhe.status_declaracao || 'Aguardando'} tipo={statusTipo(detalhe.status_declaracao)} /> },
                  { label: 'Data de Transmissão', value: detalhe.data_transmissao || '—' },
                  { label: 'Transmitido por', value: detalhe.transmitido_por || '—' },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: '10px 0', color: S.muted, fontWeight: 600, width: '40%' }}>{r.label}</td>
                    <td style={{ padding: '10px 0', color: S.text }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ RELATÓRIO */}
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${S.border}`, background: S.bg, fontSize: 11, color: S.muted, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>e-FiscalTribe® — Motor de Inteligência Tributária</span>
            <span>Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── TELA LISTA ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Motor do Simples / <strong style={{ color: S.text }}>Apuração do Simples Nacional</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.navy, flex: 1 }}>Apuração do Simples Nacional</div>
          <button onClick={() => { setForm(VAZIO); setModalNova(true) }}
            style={{ padding: '7px 14px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Apuração
          </button>
        </div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Gerencie as apurações do Simples Nacional de todos os clientes.
        </div>
      </div>

      {/* TABELA */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>

        {/* BUSCA E FILTROS */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
              placeholder="Buscar empresa ou competência..."
              style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 240 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: S.muted }}>Status:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'aguardando', label: 'Aguardando' },
              { id: 'transmitida', label: 'Transmitida' },
              { id: 'em_atraso', label: 'Em atraso' },
            ].map(f => (
              <button key={f.id} onClick={() => { setFiltroStatus(f.id); setPagina(1) }}
                style={{ padding: '4px 10px', background: filtroStatus === f.id ? S.navy : 'none', color: filtroStatus === f.id ? S.white : S.muted, border: `1px solid ${filtroStatus === f.id ? S.navy : S.border}`, borderRadius: 99, fontSize: 11, fontWeight: filtroStatus === f.id ? 700 : 400, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhuma apuração encontrada</div>
            <div style={{ fontSize: 13, color: S.muted }}>Clique em "Nova Apuração" para começar</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.thBg }}>
                    {['Empresa', 'Competência', 'Receita Apurada', 'Imposto Apurado', 'Alíquota', 'Tipo', 'Status Apuração', 'Status Declaração', 'Transmissão', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagAtual.map((a, i) => {
                    const cl = clientes[a.cliente_id]
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: S.navy, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cl?.razao_social || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{a.competencia || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>{fmtR(a.receita_apurada)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: S.navy }}>{fmtR(a.imposto_apurado)}</td>
                        <td style={{ padding: '8px 12px' }}><Badge label={fmtPct(a.aliquota_efetiva)} tipo="original" /></td>
                        <td style={{ padding: '8px 12px', color: S.muted }}>{a.tipo_declaracao || '—'}</td>
                        <td style={{ padding: '8px 12px' }}><Badge label={a.status_apuracao || 'Aguardando'} tipo={statusTipo(a.status_apuracao)} /></td>
                        <td style={{ padding: '8px 12px' }}><Badge label={a.status_declaracao || 'Aguardando'} tipo={statusTipo(a.status_declaracao)} /></td>
                        <td style={{ padding: '8px 12px', color: S.muted, fontSize: 11 }}>{a.data_transmissao || '—'}</td>
                        <td style={{ padding: '8px 12px', position: 'relative' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setDetalhe(a)} title="Ver detalhe"
                              style={{ padding: '3px 8px', background: '#eff6ff', color: S.blue, border: `1px solid #bfdbfe`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                              👁
                            </button>
                            <button onClick={() => abrirEditar(a)} title="Editar"
                              style={{ padding: '3px 8px', background: '#f0fdf4', color: S.green, border: `1px solid #86efac`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                              ✏️
                            </button>
                            <button onClick={() => excluir(a.id)} title="Excluir"
                              style={{ padding: '3px 8px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINAÇÃO */}
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted, flexWrap: 'wrap', gap: 8 }}>
              <span>{filtradas.length} apuração(ões) — Página {pagina} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPagina(1)} disabled={pagina === 1}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? '#CBD5E1' : S.text }}>«</button>
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? '#CBD5E1' : S.text }}>‹</button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? '#CBD5E1' : S.text }}>›</button>
                <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? '#CBD5E1' : S.text }}>»</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL NOVA / EDITAR */}
      {(modalNova || modalEditar) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: S.white, borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.navy, marginBottom: 20 }}>
              {modalEditar ? 'Editar Apuração' : 'Nova Apuração'}
            </div>

            {/* EMPRESA (só na criação) */}
            {modalNova && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>Empresa *</div>
                <select value={form.cliente_id || ''} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Selecione...</option>
                  {Object.values(clientes).map(c => (
                    <option key={c.id} value={c.id}>{c.razao_social}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Competência (MM/AAAA) *', field: 'competencia', placeholder: '07/2026' },
                { label: 'Receita Apurada (R$)', field: 'receita_apurada', placeholder: '0,00' },
                { label: 'Imposto Apurado (R$)', field: 'imposto_apurado', placeholder: '0,00' },
                { label: 'Alíquota Efetiva (%)', field: 'aliquota_efetiva', placeholder: '0,00' },
                { label: 'Data Transmissão', field: 'data_transmissao', placeholder: 'DD/MM/AAAA' },
                { label: 'Transmitido por', field: 'transmitido_por', placeholder: 'Nome do contador' },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <input value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tipo Declaração', field: 'tipo_declaracao', opts: ['Original', 'Retificadora'] },
                { label: 'Status Apuração', field: 'status_apuracao', opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
                { label: 'Status Declaração', field: 'status_declaracao', opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <select value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setModalNova(false); setModalEditar(null); setForm(VAZIO) }}
                style={{ padding: '7px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '7px 16px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}