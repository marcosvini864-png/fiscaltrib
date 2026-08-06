/**
 * AbaICMSST.jsx - e-FiscalTribe®
 * Credito de ICMS-ST nas Entradas
 * Versao 1.0 - 06/08/2026
 */

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { parseXMLNFe } from '../../utils/parseXMLNFe'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleString('pt-BR') : '-'
const FORMATOS = '.xml,.txt,.zip,.rar,.pdf,.DEC,.rec,.RE,.DIA,.prf'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
}

function Badge({ tipo }) {
  const map = {
    com_st:      { label: 'Com ICMS-ST',   bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    sem_st:      { label: 'Sem ICMS-ST',   bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
    concluido:   { label: 'Concluido',     bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    erro:        { label: 'Erro',          bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    ignorado:    { label: 'Ignorado',      bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
    pendente_arq:{ label: 'Aguardando',    bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
  }
  const b = map[tipo] || map.sem_st
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
      {b.label}
    </span>
  )
}

export default function AbaICMSST({ cliente, regime }) {
  const [aba, setAba] = useState('importar')
  const [arquivos, setArquivos] = useState([])
  const [processando, setProcessando] = useState(false)
  const [itens, setItens] = useState([])
  const [processados, setProcessados] = useState([])
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [selecionados, setSelecionados] = useState([])
  const [menuAberto, setMenuAberto] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagAberto, setDiagAberto] = useState(null)
  const POR_PAGINA = 10
  const inputRef = useRef(null)

  useEffect(() => { if (cliente?.id) carregarHistorico() }, [cliente?.id])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const { data } = await supabase
      .from('diagnosticos_icms_st')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  async function salvarDiagnostico() {
    if (!itens.length || !cliente?.id) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const periodos = [...new Set(itens.map(i => i.competencia))].sort()
      const { error } = await supabase.from('diagnosticos_icms_st').insert([{
        usuario_id: user.id,
        cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '',
        cliente_cnpj: cliente.cnpj || '',
        regime,
        arquivos_importados: processados.map(p => ({ nome: p.nome, tamanho: p.tamanho, status: p.status })),
        importado_por: user.email || '',
        total_itens: itens.length,
        total_com_st: itens.filter(i => i.temST).length,
        vST_total: itens.reduce((s, i) => s + i.vST, 0),
        credito_estimado: itens.reduce((s, i) => s + i.credito, 0),
        periodo_inicio: periodos[0] || null,
        periodo_fim: periodos[periodos.length - 1] || null,
        itens_json: itens.slice(0, 500),
        status: 'concluido',
      }])
      if (error) throw error
      await carregarHistorico()
      alert('Diagnostico salvo com sucesso!')
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirDiagnostico(id) {
    if (!window.confirm('Excluir este diagnostico?')) return
    await supabase.from('diagnosticos_icms_st').delete().eq('id', id)
    if (diagAberto?.id === id) { setDiagAberto(null); setItens([]); setProcessados([]) }
    await carregarHistorico()
  }

  function abrirDiagnostico(diag) {
    setDiagAberto(diag); setItens(diag.itens_json || [])
    setAba('importar'); setPagina(1); setSelecionados([])
  }

  function novaAnalise() {
    setItens([]); setArquivos([]); setProcessados([])
    setDiagAberto(null); setSelecionados([]); setErro('')
  }

  function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    setArquivos(prev => [...prev, ...files.map(f => ({ file: f, nome: f.name, tamanho: (f.size/1024).toFixed(0)+' KB', status: 'pendente' }))])
  }

  async function processar() {
    if (arquivos.length === 0) return
    setProcessando(true); setErro(''); setDiagAberto(null); setSelecionados([])
    const novosProcessados = []
    const todosItens = []

    for (const arq of arquivos) {
      try {
        if (arq.nome.toLowerCase().endsWith('.xml')) {
          const texto = await arq.file.text()
          const xmls = texto.includes('<nfeProc')
            ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x + '</nfeProc>')
            : [texto]
          let qtd = 0
          for (const xml of xmls) {
            try {
              const nfe = parseXMLNFe(xml)
              if (!nfe.competencia) continue
              ;(nfe.itens || []).forEach(item => {
                const vST = parseFloat(item.vST || 0)
                const temST = vST > 0
                const credito = temST ? vST * 0.0365 : 0
                todosItens.push({
                  nNF: nfe.nNF || '-',
                  competencia: nfe.competencia,
                  emitente: nfe.emitNome || '-',
                  descricao: item.xProd || '-',
                  ncm: item.ncm || '-',
                  cfop: item.CFOP || '-',
                  cst: item.CST || item.CSOSN || '-',
                  vProd: item.vProd || 0,
                  vST,
                  temST,
                  credito,
                  arquivo: arq.nome,
                })
                qtd++
              })
            } catch {}
          }
          novosProcessados.push({ ...arq, status: 'concluido', qtdItens: qtd })
        } else {
          novosProcessados.push({ ...arq, status: 'ignorado', qtdItens: 0 })
        }
      } catch {
        novosProcessados.push({ ...arq, status: 'erro', qtdItens: 0 })
      }
    }

    setProcessados(novosProcessados); setItens(todosItens)
    setProcessando(false); setPagina(1)
  }

  const itensFiltrados = itens.filter(i => {
    if (filtro === 'com_st' && !i.temST) return false
    if (filtro === 'sem_st' &&  i.temST) return false
    if (busca) {
      const b = busca.toLowerCase()
      return i.descricao.toLowerCase().includes(b) || i.ncm.includes(b) || i.emitente.toLowerCase().includes(b) || i.nNF.includes(b)
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / POR_PAGINA))
  const itensPagina  = itensFiltrados.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA)
  const totalComST   = itens.filter(i => i.temST).length
  const vSTTotal     = itens.reduce((s, i) => s + i.vST, 0)
  const creditoTotal = itens.reduce((s, i) => s + i.credito, 0)
  const temResultado = itens.length > 0

  const todosSelecionados = itensPagina.length > 0 && itensPagina.every((_, i) => selecionados.includes((pagina-1)*POR_PAGINA+i))
  function toggleTodos() {
    if (todosSelecionados) setSelecionados(prev => prev.filter(idx => idx < (pagina-1)*POR_PAGINA || idx >= pagina*POR_PAGINA))
    else { const novos = itensPagina.map((_, i) => (pagina-1)*POR_PAGINA+i); setSelecionados(prev => [...new Set([...prev,...novos])]) }
  }
  function toggleItem(idx) { setSelecionados(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]) }

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Diagnostico Tributario / <strong style={{ color: S.text }}>Credito ICMS-ST</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Credito de ICMS-ST nas Entradas</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Identifique ICMS-ST pago nas entradas que gera credito de PIS/COFINS no Lucro Real. IN RFB 1.911/2019.
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `2px solid ${S.border}`, marginBottom: 20 }}>
        {[{ id: 'importar', label: 'Importar' }, { id: 'historico', label: `Historico (${historico.length})` }].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba === a.id ? 700 : 400, color: aba === a.id ? S.navy : S.muted, background: 'none', border: 'none', borderBottom: `2px solid ${aba === a.id ? S.navy : 'transparent'}`, marginBottom: -2, cursor: 'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'importar' && (
        <>
          <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Central de Importacao de Arquivos</div>
              <div style={{ fontSize: 12, color: S.muted }}>Tamanho maximo suportado: 10 MB</div>
            </div>
            <div style={{ padding: 16 }}>
              <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
                style={{ border: `2px dashed ${S.border}`, borderRadius: 8, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: S.bg, marginBottom: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Clique ou arraste e solte o seu arquivo nesta area</div>
                <div style={{ fontSize: 12, color: S.muted }}>Extensoes aceitas: <strong style={{ color: S.navy }}>.xml .txt .zip .rar .DEC .rec .RE .DIA .prf .pdf</strong></div>
                <input ref={inputRef} type="file" multiple accept={FORMATOS} onChange={onDrop} style={{ display: 'none' }} />
              </div>

              {arquivos.length > 0 && (
                <div style={{ marginBottom: 12, border: `1px solid ${S.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: S.thBg }}>
                        {['Arquivo', 'Tamanho', 'Progresso', 'Status', ''].map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {arquivos.map((arq, i) => {
                        const proc = processados.find(p => p.nome === arq.nome)
                        const status = proc?.status || 'pendente_arq'
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{arq.nome}</td>
                            <td style={{ padding: '7px 10px', color: S.muted }}>{arq.tamanho}</td>
                            <td style={{ padding: '7px 10px', width: 120 }}>
                              <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: status === 'concluido' ? '100%' : status === 'erro' ? '60%' : '0%', background: status === 'concluido' ? S.green : status === 'erro' ? S.red : S.blue, transition: 'width 0.5s', borderRadius: 3 }} />
                              </div>
                            </td>
                            <td style={{ padding: '7px 10px' }}><Badge tipo={status} /></td>
                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                              <button onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))}
                                style={{ background: '#fef2f2', border: `1px solid #fecaca`, borderRadius: 4, color: S.red, cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>Excluir</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {erro && <div style={{ background: '#fef2f2', border: `1px solid #fecaca`, borderRadius: 6, padding: '10px 14px', color: S.red, fontSize: 13, marginBottom: 12 }}>{erro}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={processar} disabled={arquivos.length === 0 || processando}
                  style={{ padding: '8px 20px', background: arquivos.length > 0 && !processando ? S.blue : '#CBD5E1', color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: arquivos.length > 0 && !processando ? 'pointer' : 'not-allowed' }}>
                  {processando ? 'Processando...' : 'Analisar Arquivos'}
                </button>
                {arquivos.length > 0 && (
                  <button onClick={novaAnalise} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>Limpar tudo</button>
                )}
              </div>
            </div>
          </div>

          {temResultado && (
            <>
              {diagAberto && (
                <div style={{ background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#2563eb' }}>Visualizando diagnostico salvo em <strong>{fmtData(diagAberto.created_at)}</strong></div>
                  <button onClick={novaAnalise} style={{ background: 'none', border: 'none', color: S.muted, cursor: 'pointer', fontSize: 13 }}>Fechar</button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total de itens',       valor: itens.length,     cor: S.navy   },
                  { label: 'Itens com ICMS-ST',    valor: totalComST,        cor: S.orange },
                  { label: 'ICMS-ST Total',         valor: fmtR(vSTTotal),   cor: S.red    },
                  { label: 'Credito PIS/COFINS',   valor: fmtR(creditoTotal),cor: S.green  },
                ].map((k, i) => (
                  <div key={i} style={{ background: S.white, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: i >= 2 ? 14 : 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }} placeholder="Buscar..."
                    style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 200 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: S.muted }}>Filtrar:</span>
                    {[
                      { id: 'todos',  label: `Todos (${itens.length})`       },
                      { id: 'com_st', label: `Com ST (${totalComST})`        },
                      { id: 'sem_st', label: `Sem ST (${itens.length - totalComST})` },
                    ].map(f => (
                      <button key={f.id} onClick={() => { setFiltro(f.id); setPagina(1) }}
                        style={{ padding: '4px 12px', background: filtro === f.id ? S.navy : 'none', color: filtro === f.id ? S.white : S.muted, border: `1px solid ${filtro === f.id ? S.navy : S.border}`, borderRadius: 99, fontSize: 11, fontWeight: filtro === f.id ? 700 : 400, cursor: 'pointer' }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: S.thBg }}>
                        <th style={{ padding: '8px 10px', color: S.thText }}>
                          <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} style={{ cursor: 'pointer' }} />
                        </th>
                        {['NF', 'Competencia', 'Emitente', 'Descricao', 'NCM', 'CFOP', 'CST', 'Valor Produto', 'ICMS-ST', 'Credito', 'Classificacao', 'Acoes'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itensPagina.map((item, i) => {
                        const idx = (pagina-1)*POR_PAGINA+i
                        const sel = selecionados.includes(idx)
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: sel ? '#eff6ff' : i % 2 === 0 ? S.white : '#FAFAFA' }}>
                            <td style={{ padding: '7px 10px' }}><input type="checkbox" checked={sel} onChange={() => toggleItem(idx)} style={{ cursor: 'pointer' }} /></td>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{item.nNF}</td>
                            <td style={{ padding: '7px 10px' }}>{item.competencia}</td>
                            <td style={{ padding: '7px 10px', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.emitente}</td>
                            <td style={{ padding: '7px 10px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descricao}</td>
                            <td style={{ padding: '7px 10px', color: S.muted }}>{item.ncm}</td>
                            <td style={{ padding: '7px 10px', color: S.muted }}>{item.cfop}</td>
                            <td style={{ padding: '7px 10px', color: S.muted }}>{item.cst}</td>
                            <td style={{ padding: '7px 10px' }}>{fmtR(item.vProd)}</td>
                            <td style={{ padding: '7px 10px', color: item.vST > 0 ? S.orange : S.muted, fontWeight: item.vST > 0 ? 700 : 400 }}>{fmtR(item.vST)}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: item.credito > 0 ? S.green : S.muted }}>{fmtR(item.credito)}</td>
                            <td style={{ padding: '7px 10px' }}><Badge tipo={item.temST ? 'com_st' : 'sem_st'} /></td>
                            <td style={{ padding: '7px 10px', position: 'relative' }}>
                              <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto===idx?null:idx) }}
                                style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 8px', fontSize: 13, color: S.muted }}>&#8943;</button>
                              {menuAberto === idx && (
                                <div style={{ position: 'absolute', right: 8, top: 30, background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 140 }}>
                                  <button onClick={() => { toggleItem(idx); setMenuAberto(null) }}
                                    style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', color: S.text }}>
                                    {sel ? 'Desselecionar' : 'Selecionar'}
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

                <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted, flexWrap: 'wrap', gap: 8 }}>
                  <span>{itensFiltrados.length} itens — Pagina {pagina} de {totalPaginas}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[['«',()=>setPagina(1),pagina===1],['<',()=>setPagina(p=>Math.max(1,p-1)),pagina===1],['>',()=>setPagina(p=>Math.min(totalPaginas,p+1)),pagina===totalPaginas],['»',()=>setPagina(totalPaginas),pagina===totalPaginas]].map(([l,fn,dis],i)=>(
                      <button key={i} onClick={fn} disabled={dis} style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: dis?'not-allowed':'pointer', color: dis?'#CBD5E1':S.text }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {!diagAberto && (
                  <button onClick={salvarDiagnostico} disabled={salvando}
                    style={{ padding: '9px 20px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                    {salvando ? 'Salvando...' : 'Salvar Diagnostico'}
                  </button>
                )}
                <button onClick={novaAnalise} style={{ padding: '9px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>Nova analise</button>
              </div>
            </>
          )}
        </>
      )}

      {aba === 'historico' && (
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Historico de Diagnosticos</div>
            <button onClick={carregarHistorico} style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>Atualizar</button>
          </div>
          {loadingHistorico ? (
            <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando...</div>
          ) : historico.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhum diagnostico salvo</div>
              <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Importe arquivos, analise e salve para aparecer aqui</div>
              <button onClick={() => setAba('importar')} style={{ padding: '8px 20px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Novo Diagnostico</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: 16, borderBottom: `1px solid ${S.border}` }}>
                {[
                  { label: 'Diagnosticos salvos', valor: historico.length, cor: S.navy },
                  { label: 'Credito total estimado', valor: fmtR(historico.reduce((s,d) => s+(d.credito_estimado||0),0)), cor: S.green },
                  { label: 'Total itens analisados', valor: historico.reduce((s,d) => s+(d.total_itens||0),0), cor: S.orange },
                ].map((k, i) => (
                  <div key={i} style={{ background: S.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: i===1?14:20, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: S.thBg }}>
                      {['Data', 'Periodo', 'Itens', 'Com ST', 'ICMS-ST Total', 'Credito Estimado', 'Status', 'Acoes'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((diag, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtData(diag.created_at)}</td>
                        <td style={{ padding: '7px 10px' }}>{diag.periodo_inicio}{diag.periodo_fim && diag.periodo_fim !== diag.periodo_inicio ? ` -> ${diag.periodo_fim}` : ''}</td>
                        <td style={{ padding: '7px 10px' }}>{diag.total_itens}</td>
                        <td style={{ padding: '7px 10px', color: S.orange, fontWeight: 700 }}>{diag.total_com_st}</td>
                        <td style={{ padding: '7px 10px' }}>{fmtR(diag.vST_total)}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: (diag.credito_estimado||0) > 0 ? S.green : S.muted }}>{fmtR(diag.credito_estimado)}</td>
                        <td style={{ padding: '7px 10px' }}><Badge tipo={diag.status || 'concluido'} /></td>
                        <td style={{ padding: '7px 10px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => abrirDiagnostico(diag)} style={{ padding: '4px 10px', background: S.navy, color: S.white, border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Abrir</button>
                            <button onClick={() => excluirDiagnostico(diag.id)} style={{ padding: '4px 10px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}