/**
 * ClassificacaoItens.jsx - e-FiscalTribe(r)
 * Classificacao de Itens - padrao visual e-Auditoria
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

// Classificacoes PIS/COFINS possiveis
const CLASS_PIS_COFINS = ['Tributado', 'Monofasico', 'Substituicao Tributaria', 'Aliquota Zero', 'Isento', 'Nao Tributado']
const CLASS_ICMS = ['Tributado', 'Substituicao Tributaria', 'Isento', 'Nao Tributado', 'Diferimento', 'Reducao de Base']

function badgeClass(tipo) {
  const map = {
    'Tributado':              { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    'Monofasico':             { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    'Substituicao Tributaria':{ bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    'Aliquota Zero':          { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
    'Isento':                 { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
    'Nao Tributado':          { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    'Cest invalido':          { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  }
  const b = map[tipo] || map['Isento']
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {tipo}
    </span>
  )
}

export default function ClassificacaoItens({ clienteId, cliente }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [selecionados, setSelecionados] = useState([])
  const [menuAberto, setMenuAberto] = useState(null)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const POR_PAGINA = 10

  useEffect(() => { if (clienteId) carregar() }, [clienteId])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('itens_fiscais')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('descricao')
    setItens(data || [])
    setLoading(false)
  }

  async function salvarClassificacao(item, campo, valor) {
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('itens_fiscais')
        .update({ [campo]: valor, updated_at: new Date().toISOString() })
        .eq('id', item.id)
      if (error) throw error
      setItens(prev => prev.map(i => i.id === item.id ? { ...i, [campo]: valor } : i))
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
      setEditando(null)
    }
  }

  async function classificarTodosEConsulta() {
    if (!window.confirm('Classificar todos os itens conforme e-Consulta (tabela NCM)?')) return
    setSalvando(true)
    try {
      for (const item of itens) {
        const classAuto = detectarClassificacao(item.ncm)
        await supabase.from('itens_fiscais').update({
          class_pis_cofins_considerado: classAuto.pis,
          class_icms_considerado: classAuto.icms,
          updated_at: new Date().toISOString()
        }).eq('id', item.id)
      }
      await carregar()
      alert('Itens classificados com sucesso!')
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  // Deteccao automatica por NCM
  function detectarClassificacao(ncm) {
    if (!ncm) return { pis: 'Tributado', icms: 'Tributado' }
    const n = ncm.replace(/\D/g, '')
    const monoPrefixos = ['2701','2702','2703','2704','2705','2706','2707','2708','2709','2710','2711',
      '3001','3002','3003','3004','3005','3006','3303','3304','3305','3306','3307','3401','9603','9619',
      '2201','2202','2203','2204','2205','2206','2207','2208','2209','2106',
      '8701','8702','8703','8704','8705','8706','4011','4012','4013']
    const isMonofasico = monoPrefixos.some(p => n.startsWith(p))
    if (isMonofasico) return { pis: 'Monofasico', icms: 'Tributado' }
    return { pis: 'Tributado', icms: 'Tributado' }
  }

  const itensFiltrados = itens.filter(i => {
    if (filtro === 'classificados' && !i.class_pis_cofins_considerado) return false
    if (filtro === 'nao_classificados' && i.class_pis_cofins_considerado) return false
    if (filtro === 'duplicados') return false
    if (busca) {
      const b = busca.toLowerCase()
      return i.descricao?.toLowerCase().includes(b) || i.ncm?.includes(b) || i.codigo?.includes(b)
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / POR_PAGINA))
  const itensPagina = itensFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const todosSelecionados = itensPagina.length > 0 && itensPagina.every((_, i) => selecionados.includes((pagina - 1) * POR_PAGINA + i))

  function toggleTodos() {
    if (todosSelecionados) {
      setSelecionados(prev => prev.filter(idx => idx < (pagina - 1) * POR_PAGINA || idx >= pagina * POR_PAGINA))
    } else {
      const novos = itensPagina.map((_, i) => (pagina - 1) * POR_PAGINA + i)
      setSelecionados(prev => [...new Set([...prev, ...novos])])
    }
  }

  function toggleItem(idx) {
    setSelecionados(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

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
          Motor do Simples / <strong style={{ color: S.text }}>Classificacao de Itens</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Classificacao de Itens</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Revise, ajuste e confirme a classificacao fiscal dos itens de PIS/COFINS e ICMS.
        </div>
      </div>

      {/* EMPRESA SELECIONADA */}
      <div style={{ background: S.white, borderRadius: 8, border: `1px solid ${S.border}`, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: S.muted }}>Empresa selecionada:</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: S.navy }}>{cliente?.razao_social || '-'}</span>
        <span style={{ fontSize: 11, color: S.muted }}>({cliente?.regime || '-'})</span>
      </div>

      {/* TABELA */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>

        {/* TOOLBAR */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Lista de Itens</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '6px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
              Editar itens em lote
            </button>
            <button onClick={classificarTodosEConsulta} disabled={salvando}
              style={{ padding: '6px 14px', background: '#f0fdf4', color: S.green, border: `1px solid #86efac`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Classificar conforme e-Consulta
            </button>
            <button style={{ padding: '6px 14px', background: '#eff6ff', color: S.blue, border: `1px solid #bfdbfe`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Classificar manualmente
            </button>
          </div>
        </div>

        {/* BUSCA E FILTROS */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
              placeholder="Buscar..."
              style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 200 }} />
            <button style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
              Busca Avancada
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: S.muted }}>Visualizado por:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'classificados', label: 'Classificados' },
              { id: 'nao_classificados', label: 'Nao classificados' },
              { id: 'duplicados', label: 'Duplicados' },
            ].map(f => (
              <button key={f.id} onClick={() => { setFiltro(f.id); setPagina(1) }}
                style={{ padding: '4px 10px', background: filtro === f.id ? S.navy : 'none', color: filtro === f.id ? S.white : S.muted, border: `1px solid ${filtro === f.id ? S.navy : S.border}`, borderRadius: 99, fontSize: 11, fontWeight: filtro === f.id ? 700 : 400, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA ITENS */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando itens...</div>
        ) : itensFiltrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhum item encontrado</div>
            <div style={{ fontSize: 13, color: S.muted }}>Importe NF-es para popular a lista de itens</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.thBg }}>
                    <th style={{ padding: '8px 10px', color: S.thText, width: 36 }}>
                      <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} style={{ cursor: 'pointer' }} />
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>Codigo do Item</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>Descricao</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>GTIN</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>NCM</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>EX</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>CEST</th>
                    <th colSpan={2} style={{ padding: '8px 10px', textAlign: 'center', color: S.thText, fontWeight: 600, fontSize: 11, background: '#374151', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                      Classificacao de PIS/COFINS
                    </th>
                    <th colSpan={2} style={{ padding: '8px 10px', textAlign: 'center', color: S.thText, fontWeight: 600, fontSize: 11, background: '#1f2937', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                      Classificacao de ICMS
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>Acoes</th>
                  </tr>
                  <tr style={{ background: '#374151' }}>
                    <th style={{ padding: '5px 10px' }}></th>
                    <th style={{ padding: '5px 10px' }}></th>
                    <th style={{ padding: '5px 10px' }}></th>
                    <th style={{ padding: '5px 10px' }}></th>
                    <th style={{ padding: '5px 10px' }}></th>
                    <th style={{ padding: '5px 10px' }}></th>
                    <th style={{ padding: '5px 10px' }}></th>
                    <th style={{ padding: '5px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>e-Consulta</th>
                    <th style={{ padding: '5px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600 }}>Considerado</th>
                    <th style={{ padding: '5px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>e-Consulta</th>
                    <th style={{ padding: '5px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600 }}>Considerado</th>
                    <th style={{ padding: '5px 10px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {itensPagina.map((item, i) => {
                    const idx = (pagina - 1) * POR_PAGINA + i
                    const sel = selecionados.includes(idx)
                    const classAuto = detectarClassificacao(item.ncm)
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: sel ? '#eff6ff' : i % 2 === 0 ? S.white : '#FAFAFA' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleItem(idx)} style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: S.navy }}>{item.codigo || '-'}</td>
                        <td style={{ padding: '8px 10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descricao || '-'}</td>
                        <td style={{ padding: '8px 10px', color: S.muted }}>{item.gtin || '-'}</td>
                        <td style={{ padding: '8px 10px', color: S.muted }}>{item.ncm || '-'}</td>
                        <td style={{ padding: '8px 10px', color: S.muted }}>{item.ex || '-'}</td>
                        <td style={{ padding: '8px 10px', color: S.muted, fontSize: 11 }}>{item.cest || 'Cest invalido para ncm n...'}</td>
                        <td style={{ padding: '8px 10px', borderLeft: '1px solid #f1f5f9' }}>
                          {badgeClass(classAuto.pis)}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {editando === `${item.id}_pis` ? (
                            <select autoFocus defaultValue={item.class_pis_cofins_considerado || classAuto.pis}
                              onChange={e => salvarClassificacao(item, 'class_pis_cofins_considerado', e.target.value)}
                              onBlur={() => setEditando(null)}
                              style={{ fontSize: 11, border: `1px solid ${S.blue}`, borderRadius: 4, padding: '2px 6px', outline: 'none' }}>
                              {CLASS_PIS_COFINS.map(c => <option key={c}>{c}</option>)}
                            </select>
                          ) : (
                            <span onClick={() => setEditando(`${item.id}_pis`)} style={{ cursor: 'pointer' }}>
                              {badgeClass(item.class_pis_cofins_considerado || classAuto.pis)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', borderLeft: '1px solid #f1f5f9' }}>
                          {badgeClass(classAuto.icms)}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {editando === `${item.id}_icms` ? (
                            <select autoFocus defaultValue={item.class_icms_considerado || classAuto.icms}
                              onChange={e => salvarClassificacao(item, 'class_icms_considerado', e.target.value)}
                              onBlur={() => setEditando(null)}
                              style={{ fontSize: 11, border: `1px solid ${S.blue}`, borderRadius: 4, padding: '2px 6px', outline: 'none' }}>
                              {CLASS_ICMS.map(c => <option key={c}>{c}</option>)}
                            </select>
                          ) : (
                            <span onClick={() => setEditando(`${item.id}_icms`)} style={{ cursor: 'pointer' }}>
                              {badgeClass(item.class_icms_considerado || classAuto.icms)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', position: 'relative' }}>
                          <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto === item.id ? null : item.id) }}
                            style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 8px', fontSize: 13, color: S.muted }}>
                            &#8801;
                          </button>
                          {menuAberto === item.id && (
                            <div style={{ position: 'absolute', right: 8, top: 30, background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 160 }}>
                              <button onClick={() => { setEditando(`${item.id}_pis`); setMenuAberto(null) }}
                                style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                                Classificar PIS/COFINS
                              </button>
                              <button onClick={() => { setEditando(`${item.id}_icms`); setMenuAberto(null) }}
                                style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer' }}>
                                Classificar ICMS
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINACAO */}
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted }}>
              <span>{itensFiltrados.length} itens - Pagina {pagina} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setPagina(1)} disabled={pagina === 1}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? '#CBD5E1' : S.text }}>«</button>
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? '#CBD5E1' : S.text }}>{'<'}</button>
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  const p = Math.max(1, Math.min(pagina - 2, totalPaginas - 4)) + i
                  return (
                    <button key={p} onClick={() => setPagina(p)}
                      style={{ padding: '4px 10px', border: `1px solid ${p === pagina ? S.navy : S.border}`, borderRadius: 4, background: p === pagina ? S.navy : 'none', color: p === pagina ? S.white : S.text, cursor: 'pointer', fontWeight: p === pagina ? 700 : 400 }}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? '#CBD5E1' : S.text }}>{'>'}</button>
                <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? '#CBD5E1' : S.text }}>»</button>
                <span style={{ marginLeft: 8 }}>10 por pagina</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}