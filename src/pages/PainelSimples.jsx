/**
 * PainelSimples.jsx - e-FiscalTribe®
 * Painel de Controle — Motor do Simples Nacional
 * Versao 1.0 - 05/08/2026
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
    aguardando: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    transmitida: { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    em_atraso:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    pago:        { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    a_vencer:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    em_breve:    { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  }
  const b = map[tipo] || map['em_breve']
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

const ANEXOS = ['Anexo I — Comercio', 'Anexo II — Industria', 'Anexo III — Servicos', 'Anexo IV — Servicos', 'Anexo V — Servicos']

export default function PainelSimples({ clienteId, cliente }) {
  const [apuracoes, setApuracoes] = useState([])
  const [dadosComp, setDadosComp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [menuAberto, setMenuAberto] = useState(null)
  const [modalApuracao, setModalApuracao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novaApuracao, setNovaApuracao] = useState({
    competencia: '', receita_apurada: '', imposto_apurado: '',
    aliquota_efetiva: '', tipo_declaracao: 'Original',
    status_apuracao: 'Aguardando', status_declaracao: 'Aguardando',
    data_transmissao: '', transmitido_por: ''
  })
  const POR_PAGINA = 10

  useEffect(() => { if (clienteId) { carregar(); carregarDadosComp() } }, [clienteId])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('apuracoes_simples')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('competencia', { ascending: false })
    setApuracoes(data || [])
    setLoading(false)
  }

  async function carregarDadosComp() {
    const { data } = await supabase
      .from('dados_complementares')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()
    setDadosComp(data)
  }

  async function salvarApuracao() {
    if (!novaApuracao.competencia) return alert('Informe a competencia')
    setSalvando(true)
    try {
      const { error } = await supabase.from('apuracoes_simples').insert({
        ...novaApuracao,
        cliente_id: clienteId,
        receita_apurada: parseFloat(novaApuracao.receita_apurada || 0),
        imposto_apurado: parseFloat(novaApuracao.imposto_apurado || 0),
        aliquota_efetiva: parseFloat(novaApuracao.aliquota_efetiva || 0),
        created_at: new Date().toISOString()
      })
      if (error) throw error
      setModalApuracao(false)
      setNovaApuracao({ competencia: '', receita_apurada: '', imposto_apurado: '', aliquota_efetiva: '', tipo_declaracao: 'Original', status_apuracao: 'Aguardando', status_declaracao: 'Aguardando', data_transmissao: '', transmitido_por: '' })
      await carregar()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirApuracao(id) {
    if (!window.confirm('Excluir esta apuracao?')) return
    await supabase.from('apuracoes_simples').delete().eq('id', id)
    setMenuAberto(null)
    await carregar()
  }

  // KPIs calculados
  const totalApuracoes = apuracoes.length
  const aguardando = apuracoes.filter(a => a.status_apuracao === 'Aguardando').length
  const transmitidas = apuracoes.filter(a => a.status_declaracao === 'Transmitida').length
  const emAtraso = apuracoes.filter(a => a.status_apuracao === 'Em atraso').length
  const totalImposto = apuracoes.reduce((s, a) => s + parseFloat(a.imposto_apurado || 0), 0)
  const aliquotaMedia = apuracoes.length > 0
    ? apuracoes.reduce((s, a) => s + parseFloat(a.aliquota_efetiva || 0), 0) / apuracoes.length
    : 0

  // Fator R calculado dos dados complementares
  const folha = parseFloat(dadosComp?.folha_mensal || 0)
  const rbt12 = parseFloat(dadosComp?.receita_bruta_12m || 0)
  const fatorR = rbt12 > 0 ? ((folha * 12) / rbt12) : null
  const anexo = dadosComp?.anexo_simples || '-'

  const totalPaginas = Math.max(1, Math.ceil(apuracoes.length / POR_PAGINA))
  const apuracoesPagina = apuracoes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  if (!clienteId) return (
    <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>🏢</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 8 }}>Selecione uma empresa</div>
      <div style={{ fontSize: 13 }}>Use o seletor de cliente no menu lateral</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Motor do Simples / <strong style={{ color: S.text }}>Painel de Controle</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Painel de Controle</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Acompanhe apuracoes, declaracoes e pagamentos do Simples Nacional.
        </div>
      </div>

      {/* EMPRESA + FATOR R */}
      <div style={{ background: S.white, borderRadius: 8, border: `1px solid ${S.border}`, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: S.muted }}>Empresa:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: S.navy }}>{cliente?.razao_social || '-'}</span>
        </div>
        <div style={{ width: 1, height: 16, background: S.border }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: S.muted }}>Anexo:</span>
          <Badge label={anexo} tipo="a_vencer" />
        </div>
        <div style={{ width: 1, height: 16, background: S.border }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: S.muted }}>Fator R:</span>
          {fatorR !== null ? (
            <Badge
              label={fmtPct(fatorR * 100)}
              tipo={fatorR >= 0.28 ? 'transmitida' : 'em_atraso'}
            />
          ) : (
            <Badge label="Preencha Dados Complementares" tipo="aguardando" />
          )}
        </div>
        {fatorR !== null && (
          <span style={{ fontSize: 11, color: fatorR >= 0.28 ? S.green : S.red }}>
            {fatorR >= 0.28 ? '✓ Anexo III favoravel' : '⚠ Risco Anexo V'}
          </span>
        )}
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>

        {/* KPI 1 — Apuracoes */}
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>Apuracoes</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: S.navy, marginBottom: 10 }}>{totalApuracoes}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: S.green, flexShrink: 0 }} />
              <span style={{ color: S.muted }}>Transmitidas:</span>
              <span style={{ fontWeight: 700, color: S.text }}>{transmitidas}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: S.orange, flexShrink: 0 }} />
              <span style={{ color: S.muted }}>Aguardando:</span>
              <span style={{ fontWeight: 700, color: S.text }}>{aguardando}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: S.red, flexShrink: 0 }} />
              <span style={{ color: S.muted }}>Em atraso:</span>
              <span style={{ fontWeight: 700, color: S.text }}>{emAtraso}</span>
            </div>
          </div>
        </div>

        {/* KPI 2 — Imposto Apurado */}
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>Imposto Apurado</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: S.navy, marginBottom: 10 }}>{fmtR(totalImposto)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: S.blue, flexShrink: 0 }} />
              <span style={{ color: S.muted }}>Aliquota media:</span>
              <span style={{ fontWeight: 700, color: S.text }}>{fmtPct(aliquotaMedia)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: S.muted, flexShrink: 0 }} />
              <span style={{ color: S.muted }}>Competencias:</span>
              <span style={{ fontWeight: 700, color: S.text }}>{totalApuracoes} mes(es)</span>
            </div>
          </div>
        </div>

        {/* KPI 3 — Pagamentos (em breve) */}
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px 16px', opacity: 0.7 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
            Pagamentos <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>(em breve)</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#CBD5E1', marginBottom: 10 }}>—</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['Pagos', 'A vencer', 'Em atraso'].map(l => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />
                <span style={{ color: '#CBD5E1' }}>{l}: —</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABELA APURACOES */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>

        {/* TOOLBAR */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Apuracoes do Simples Nacional</div>
          <button onClick={() => setModalApuracao(true)}
            style={{ padding: '7px 14px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Apuracao
          </button>
        </div>

        {/* TABELA */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando...</div>
        ) : apuracoes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhuma apuracao lancada</div>
            <div style={{ fontSize: 13, color: S.muted }}>Clique em "Nova Apuracao" para comecar</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.thBg }}>
                    {['Competencia', 'Status Apuracao', 'Receita Apurada', 'Imposto Apurado', 'Aliquota Efetiva', 'Tipo Declaracao', 'Status Declaracao', 'Data Transmissao', 'Transmitido por', 'Acoes'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apuracoesPagina.map((a, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: S.navy }}>{a.competencia || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <Badge label={a.status_apuracao || 'Aguardando'} tipo={a.status_apuracao === 'Transmitida' ? 'transmitida' : a.status_apuracao === 'Em atraso' ? 'em_atraso' : 'aguardando'} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>{fmtR(a.receita_apurada)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: S.navy }}>{fmtR(a.imposto_apurado)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <Badge label={fmtPct(a.aliquota_efetiva)} tipo="a_vencer" />
                      </td>
                      <td style={{ padding: '8px 12px', color: S.muted }}>{a.tipo_declaracao || 'Original'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <Badge label={a.status_declaracao || 'Aguardando'} tipo={a.status_declaracao === 'Transmitida' ? 'transmitida' : a.status_declaracao === 'Em atraso' ? 'em_atraso' : 'aguardando'} />
                      </td>
                      <td style={{ padding: '8px 12px', color: S.muted }}>{a.data_transmissao || '—'}</td>
                      <td style={{ padding: '8px 12px', color: S.muted }}>{a.transmitido_por || '—'}</td>
                      <td style={{ padding: '8px 12px', position: 'relative' }}>
                        <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto === a.id ? null : a.id) }}
                          style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 8px', fontSize: 13, color: S.muted }}>
                          &#8801;
                        </button>
                        {menuAberto === a.id && (
                          <div style={{ position: 'absolute', right: 8, top: 30, background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 160 }}>
                            <button onClick={() => excluirApuracao(a.id)}
                              style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', color: S.red }}>
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINACAO */}
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted }}>
              <span>{apuracoes.length} apuracao(es) — Pagina {pagina} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPagina(1)} disabled={pagina === 1}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? '#CBD5E1' : S.text }}>«</button>
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? '#CBD5E1' : S.text }}>{'<'}</button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? '#CBD5E1' : S.text }}>{'>'}</button>
                <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? '#CBD5E1' : S.text }}>»</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL NOVA APURACAO */}
      {modalApuracao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: S.white, borderRadius: 12, padding: 24, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.navy, marginBottom: 20 }}>Nova Apuracao</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Competencia (MM/AAAA)', field: 'competencia', placeholder: '07/2026' },
                { label: 'Receita Apurada (R$)', field: 'receita_apurada', placeholder: '0,00' },
                { label: 'Imposto Apurado (R$)', field: 'imposto_apurado', placeholder: '0,00' },
                { label: 'Aliquota Efetiva (%)', field: 'aliquota_efetiva', placeholder: '0,00' },
                { label: 'Data Transmissao', field: 'data_transmissao', placeholder: 'DD/MM/AAAA' },
                { label: 'Transmitido por', field: 'transmitido_por', placeholder: 'Nome do contador' },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <input value={novaApuracao[f.field]} onChange={e => setNovaApuracao(p => ({ ...p, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tipo Declaracao', field: 'tipo_declaracao', opts: ['Original', 'Retificadora'] },
                { label: 'Status Apuracao', field: 'status_apuracao', opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
                { label: 'Status Declaracao', field: 'status_declaracao', opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <select value={novaApuracao[f.field]} onChange={e => setNovaApuracao(p => ({ ...p, [f.field]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModalApuracao(false)}
                style={{ padding: '7px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                Cancelar
              </button>
              <button onClick={salvarApuracao} disabled={salvando}
                style={{ padding: '7px 16px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : 'Salvar Apuracao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}