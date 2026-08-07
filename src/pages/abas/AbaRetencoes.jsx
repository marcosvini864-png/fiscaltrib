/**
 * AbaRetencoes.jsx - e-FiscalTribe®
 * Retencoes Indevidas de PIS/COFINS/CSLL
 * Versao 2.2 - 06/08/2026
 * Card importar identico ao AbaICMSST
 */

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { parseXMLNFe } from '../../utils/parseXMLNFe'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleString('pt-BR') : '-'
const FORMATOS = '.xml,.txt,.zip,.rar,.pdf,.DEC,.rec,.RE,.DIA,.prf'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#334155',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#0F172A', thBg: '#4B5563', thText: '#FFFFFF',
  ghost: '#F1F5F9', ghostText: '#64748B',
}

function Badge({ tipo }) {
  const map = {
    indevida:     { label: 'Retencao Indevida', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    correta:      { label: 'Retencao Correta',  bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    sem_retencao: { label: 'Sem Retencao',      bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
    concluido:    { label: 'Concluido',         bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    erro:         { label: 'Erro',              bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    ignorado:     { label: 'Ignorado',          bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
    pendente_arq: { label: 'Aguardando',        bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
  }
  const b = map[tipo] || map.sem_retencao
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
      {b.label}
    </span>
  )
}

const LINHAS_GHOST = Array(5).fill(null).map((_, i) => ({
  nNF: `NF-000${i+1}`, competencia: 'MM/AAAA', emitente: 'Nome do Emitente',
  vNF: 0, vRetPIS: 0, vRetCOFINS: 0, vRetCSLL: 0, vRetencao: 0,
  temRetencao: false, indevida: false, ghost: true,
}))

export default function AbaRetencoes({ cliente, regime }) {
  const [aba, setAba] = useState('importar')
  const [arquivos, setArquivos] = useState([])
  const [processando, setProcessando] = useState(false)
  const [itens, setItens] = useState([])
  const [processados, setProcessados] = useState([])
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [selecionados, setSelecionados] = useState([])
  const [menuAberto, setMenuAberto] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagAberto, setDiagAberto] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { if (cliente?.id) carregarHistorico() }, [cliente?.id])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const { data } = await supabase.from('diagnosticos_retencoes').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  async function salvarDiagnostico() {
    if (!itens.length || !cliente?.id) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const periodos = [...new Set(itens.map(i => i.competencia))].sort()
      const { error } = await supabase.from('diagnosticos_retencoes').insert([{
        usuario_id: user.id, cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '', cliente_cnpj: cliente.cnpj || '', regime,
        arquivos_importados: processados.map(p => ({ nome: p.nome, tamanho: p.tamanho, status: p.status })),
        importado_por: user.email || '',
        total_nfes: itens.length,
        total_indevidas: itens.filter(i => i.indevida).length,
        valor_retencoes: itens.reduce((s, i) => s + i.vRetencao, 0),
        credito_estimado: itens.filter(i => i.indevida).reduce((s, i) => s + i.vRetencao, 0),
        periodo_inicio: periodos[0] || null,
        periodo_fim: periodos[periodos.length - 1] || null,
        itens_json: itens.slice(0, 500), status: 'concluido',
      }])
      if (error) throw error
      await carregarHistorico()
      alert('Diagnostico salvo com sucesso!')
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSalvando(false) }
  }

  async function excluirDiagnostico(id) {
    if (!window.confirm('Excluir este diagnostico?')) return
    await supabase.from('diagnosticos_retencoes').delete().eq('id', id)
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

  async function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    if (files.length === 0) return
    const novos = files.map(f => ({ file: f, nome: f.name, tamanho: (f.size/1024).toFixed(0)+' KB', status: 'pendente' }))
    const atualizados = [...arquivos, ...novos]
    setArquivos(atualizados)
    await processarArquivos(atualizados)
  }

  async function processarArquivos(listaArquivos) {
    if (!listaArquivos || listaArquivos.length === 0) return
    setProcessando(true); setErro(''); setDiagAberto(null); setSelecionados([])
    const novosProcessados = [], todosItens = []
    for (const arq of listaArquivos) {
      try {
        if (arq.nome.toLowerCase().endsWith('.xml')) {
          const texto = await arq.file.text()
          const xmls = texto.includes('<nfeProc') ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x+'</nfeProc>') : [texto]
          let qtd = 0
          for (const xml of xmls) {
            try {
              const nfe = parseXMLNFe(xml)
              if (!nfe.competencia) continue
              const vRetPIS    = parseFloat(nfe.vRetPIS    || 0)
              const vRetCOFINS = parseFloat(nfe.vRetCOFINS || 0)
              const vRetCSLL   = parseFloat(nfe.vRetCSLL   || 0)
              const vRetencao  = vRetPIS + vRetCOFINS + vRetCSLL
              const temRetencao = vRetencao > 0
              const indevida = temRetencao && regime === 'Simples Nacional'
              todosItens.push({
                nNF: nfe.nNF||'-', competencia: nfe.competencia, emitente: nfe.emitNome||'-',
                vNF: parseFloat(nfe.vNF||0), vRetPIS, vRetCOFINS, vRetCSLL, vRetencao, temRetencao, indevida, arquivo: arq.nome,
              })
              qtd++
            } catch {}
          }
          novosProcessados.push({ ...arq, status: 'concluido', qtdItens: qtd })
        } else {
          novosProcessados.push({ ...arq, status: 'ignorado', qtdItens: 0 })
        }
      } catch { novosProcessados.push({ ...arq, status: 'erro', qtdItens: 0 }) }
    }
    setProcessados(novosProcessados); setItens(todosItens); setProcessando(false); setPagina(1)
  }

  const temResultado = itens.length > 0
  const itensFiltrados = itens.filter(i => {
    if (filtro === 'indevida'     && !i.indevida)    return false
    if (filtro === 'sem_retencao' &&  i.temRetencao) return false
    if (busca) { const b = busca.toLowerCase(); return i.emitente.toLowerCase().includes(b) || i.nNF.includes(b) || i.competencia.includes(b) }
    return true
  })
  const totalPaginas   = Math.max(1, Math.ceil(itensFiltrados.length / porPagina))
  const itensPagina    = temResultado ? itensFiltrados.slice((pagina-1)*porPagina, pagina*porPagina) : LINHAS_GHOST
  const totalIndevidas = itens.filter(i => i.indevida).length
  const valorTotal     = itens.reduce((s, i) => s + i.vRetencao, 0)
  const creditoTotal   = itens.filter(i => i.indevida).reduce((s, i) => s + i.vRetencao, 0)
  const todosSelecionados = itensPagina.length > 0 && !itensPagina[0]?.ghost && itensPagina.every((_, i) => selecionados.includes((pagina-1)*porPagina+i))
  function toggleTodos() {
    if (todosSelecionados) setSelecionados(prev => prev.filter(idx => idx < (pagina-1)*porPagina || idx >= pagina*porPagina))
    else { const novos = itensPagina.map((_, i) => (pagina-1)*porPagina+i); setSelecionados(prev => [...new Set([...prev,...novos])]) }
  }
  function toggleItem(idx) { setSelecionados(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]) }

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

      {/* HEADER — identico ao AbaICMSST */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
            Diagnostico Tributario / <strong style={{ color: S.text }}>Retencoes Indevidas</strong>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Retencoes Indevidas de PIS/COFINS/CSLL</div>
          <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
            Empresas do Simples Nacional sao imunes a retencoes de PIS/COFINS/CSLL na fonte. LC 123/2006 art. 3 §4.
          </div>
        </div>
        {/* CARD IMPORTAR — identico ao AbaICMSST */}
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px', minWidth: 260, alignSelf: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: S.navy, marginBottom: 4 }}>📎 Importar NF-es</div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>
            Aceita: <strong style={{ color: S.text }}>.xml .txt .zip .rar .DEC .rec .RE .DIA .prf .pdf</strong>
          </div>
          <input ref={inputRef} type="file" multiple accept={FORMATOS} onChange={onDrop} style={{ display: 'none' }} />
          <button onClick={() => inputRef.current?.click()} disabled={processando}
            style={{ width: '75%', padding: '8px 0', background: processando ? '#CBD5E1' : S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: processando ? 'not-allowed' : 'pointer' }}>
            {processando ? '⏳ Processando...' : '⬆ Selecionar Arquivos'}
          </button>
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${S.border}`, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id:'importar', label:'Importar' }, { id:'historico', label:`Historico (${historico.length})` }].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding:'10px 20px', fontSize:13, fontWeight:aba===a.id?700:400, color:aba===a.id?S.navy:S.muted, background:'none', border:'none', borderBottom:`2px solid ${aba===a.id?S.navy:'transparent'}`, marginBottom:-2, cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA IMPORTAR */}
      {aba === 'importar' && (
        <>
          {diagAberto && (
            <div style={{ background:'#eff6ff', border:`1px solid #bfdbfe`, borderRadius:8, padding:'10px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:13, color:'#2563eb' }}>Visualizando diagnostico salvo em <strong>{fmtData(diagAberto.created_at)}</strong></div>
              <button onClick={novaAnalise} style={{ background:'none', border:'none', color:S.muted, cursor:'pointer', fontSize:13 }}>Fechar</button>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Total de NF-es',             valor: temResultado ? itens.length      : '—', cor: temResultado ? S.navy   : S.ghostText },
              { label:'Retencoes Indevidas',         valor: temResultado ? totalIndevidas    : '—', cor: temResultado ? S.red    : S.ghostText },
              { label:'Total Retencoes Encontradas', valor: temResultado ? fmtR(valorTotal)  : 'R$ —,——', cor: temResultado ? S.orange : S.ghostText },
              { label:'Valor Recuperavel',           valor: temResultado ? fmtR(creditoTotal): 'R$ —,——', cor: temResultado ? S.green  : S.ghostText },
            ].map((k,i) => (
              <div key={i} style={{ background:S.white, borderRadius:8, padding:'14px 16px', border:`1px solid ${S.border}`, textAlign:'center' }}>
                <div style={{ fontSize:i>=2?14:22, fontWeight:700, color:k.cor }}>{k.valor}</div>
                <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>{k.label}</div>
                {!temResultado && <div style={{ fontSize:10, color:S.ghostText, marginTop:4 }}>Aguardando importacao</div>}
              </div>
            ))}
          </div>

          {/* TABELA */}
          <div style={{ background:S.white, borderRadius:10, border:`1px solid ${S.border}`, marginBottom:16, overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:`1px solid ${S.border}`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'space-between' }}>
              <input value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1)}} placeholder="Buscar NF, emitente, competencia..."
                style={{ padding:'6px 12px', border:`1px solid ${S.border}`, borderRadius:6, fontSize:13, outline:'none', width:220 }} />
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12, color:S.muted }}>Filtrar:</span>
                {[
                  { id:'todos',        label:`Todos (${itens.length})`                                               },
                  { id:'indevida',     label:`Indevidas (${totalIndevidas})`                                         },
                  { id:'sem_retencao', label:`Sem Retencao (${itens.length - itens.filter(i=>i.temRetencao).length})` },
                ].map(f => (
                  <button key={f.id} onClick={()=>{setFiltro(f.id);setPagina(1)}}
                    style={{ padding:'4px 12px', background:filtro===f.id?S.navy:'none', color:filtro===f.id?S.white:S.muted, border:`1px solid ${filtro===f.id?S.navy:S.border}`, borderRadius:99, fontSize:11, fontWeight:filtro===f.id?700:400, cursor:'pointer' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:S.thBg }}>
                    <th style={{ padding:'8px 10px', color:S.thText }}>
                      <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} disabled={!temResultado} style={{ cursor:temResultado?'pointer':'not-allowed' }} />
                    </th>
                    {['NF','Competencia','Emitente','Valor NF','Ret. PIS','Ret. COFINS','Ret. CSLL','Total Retencao','Classificacao','Acoes'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:S.thText, fontWeight:600, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itensPagina.map((item,i) => {
                    const idx=(pagina-1)*porPagina+i
                    const sel=selecionados.includes(idx)
                    const isGhost=item.ghost
                    return (
                      <tr key={i} style={{ borderBottom:`1px solid ${S.border}`, background:isGhost?S.ghost:sel?'#eff6ff':i%2===0?S.white:'#FAFAFA' }}>
                        <td style={{ padding:'7px 10px' }}>
                          {!isGhost && <input type="checkbox" checked={sel} onChange={()=>toggleItem(idx)} style={{ cursor:'pointer' }} />}
                        </td>
                        <td style={{ padding:'7px 10px', fontWeight:600, color:isGhost?S.ghostText:S.navy }}>{item.nNF}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:S.text }}>{item.competencia}</td>
                        <td style={{ padding:'7px 10px', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isGhost?S.ghostText:S.text }}>{item.emitente}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:S.text }}>{isGhost?'R$ —,——':fmtR(item.vNF)}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:item.vRetPIS>0?S.red:S.muted }}>{isGhost?'R$ —,——':fmtR(item.vRetPIS)}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:item.vRetCOFINS>0?S.red:S.muted }}>{isGhost?'R$ —,——':fmtR(item.vRetCOFINS)}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:item.vRetCSLL>0?S.red:S.muted }}>{isGhost?'R$ —,——':fmtR(item.vRetCSLL)}</td>
                        <td style={{ padding:'7px 10px', fontWeight:700, color:isGhost?S.ghostText:item.vRetencao>0?S.red:S.muted }}>{isGhost?'R$ —,——':fmtR(item.vRetencao)}</td>
                        <td style={{ padding:'7px 10px' }}>
                          {isGhost
                            ? <span style={{ background:S.ghost, color:S.ghostText, border:`1px solid ${S.border}`, borderRadius:99, padding:'2px 10px', fontSize:10, fontWeight:700 }}>Classificacao</span>
                            : <Badge tipo={item.indevida?'indevida':item.temRetencao?'correta':'sem_retencao'} />
                          }
                        </td>
                        <td style={{ padding:'7px 10px', position:'relative' }}>
                          {!isGhost && (
                            <>
                              <button onClick={e=>{e.stopPropagation();setMenuAberto(menuAberto===idx?null:idx)}}
                                style={{ background:'none', border:`1px solid ${S.border}`, borderRadius:4, cursor:'pointer', padding:'2px 8px', fontSize:13, color:S.muted }}>&#8943;</button>
                              {menuAberto===idx && (
                                <div style={{ position:'absolute', right:8, top:30, background:S.white, border:`1px solid ${S.border}`, borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:100, minWidth:140 }}>
                                  <button onClick={()=>{toggleItem(idx);setMenuAberto(null)}}
                                    style={{ display:'block', width:'100%', padding:'8px 14px', background:'none', border:'none', textAlign:'left', fontSize:12, cursor:'pointer', color:S.text }}>
                                    {sel?'Desselecionar':'Selecionar'}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!temResultado && (
              <div style={{ padding:'16px 20px', borderTop:`1px solid ${S.border}`, textAlign:'center', fontSize:12, color:S.ghostText }}>
                Importe arquivos XML de NF-e para identificar retencoes indevidas de PIS/COFINS/CSLL
              </div>
            )}

            <div style={{ padding:'10px 16px', borderTop:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12, color:S.muted, flexWrap:'wrap', gap:8 }}>
              <span>{temResultado ? `${itensFiltrados.length} NF-es — Pagina ${pagina} de ${totalPaginas}` : 'Aguardando importacao'}</span>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                {[['«',()=>setPagina(1),pagina===1||!temResultado],['<',()=>setPagina(p=>Math.max(1,p-1)),pagina===1||!temResultado],['>',()=>setPagina(p=>Math.min(totalPaginas,p+1)),pagina===totalPaginas||!temResultado],['»',()=>setPagina(totalPaginas),pagina===totalPaginas||!temResultado]].map(([l,fn,dis],i)=>(
                  <button key={i} onClick={fn} disabled={dis} style={{ padding:'4px 8px', border:`1px solid ${S.border}`, borderRadius:4, background:'none', cursor:dis?'not-allowed':'pointer', color:dis?'#CBD5E1':S.text }}>{l}</button>
                ))}
                <select value={porPagina} onChange={e=>{setPorPagina(Number(e.target.value));setPagina(1)}}
                  style={{ marginLeft:8, padding:'3px 8px', border:`1px solid ${S.border}`, borderRadius:4, fontSize:12, outline:'none', cursor:'pointer' }}>
                  {[10,25,50,100].map(n=><option key={n} value={n}>{n} por pagina</option>)}
                </select>
              </div>
            </div>
          </div>

          {temResultado && (
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {!diagAberto && (
                <button onClick={salvarDiagnostico} disabled={salvando}
                  style={{ padding:'9px 20px', background:S.navy, color:S.white, border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:salvando?'not-allowed':'pointer', opacity:salvando?0.7:1 }}>
                  {salvando?'Salvando...':'Salvar Diagnostico'}
                </button>
              )}
              <button onClick={novaAnalise} style={{ padding:'9px 16px', background:'none', border:`1px solid ${S.border}`, borderRadius:6, fontSize:13, cursor:'pointer', color:S.muted }}>Nova analise</button>
            </div>
          )}
        </>
      )}

      {/* ABA HISTORICO */}
      {aba === 'historico' && (
        <div style={{ background:S.white, borderRadius:10, border:`1px solid ${S.border}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${S.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Historico de Diagnosticos</div>
            <button onClick={carregarHistorico} style={{ padding:'6px 12px', background:'none', border:`1px solid ${S.border}`, borderRadius:6, fontSize:12, cursor:'pointer', color:S.muted }}>Atualizar</button>
          </div>
          {loadingHistorico ? (
            <div style={{ padding:40, textAlign:'center', color:S.muted }}>Carregando...</div>
          ) : historico.length === 0 ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Nenhum diagnostico salvo</div>
              <div style={{ fontSize:13, color:S.muted, marginBottom:16 }}>Importe arquivos, analise e salve para aparecer aqui</div>
              <button onClick={()=>setAba('importar')} style={{ padding:'8px 20px', background:S.navy, color:S.white, border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' }}>Novo Diagnostico</button>
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, padding:16, borderBottom:`1px solid ${S.border}` }}>
                {[
                  { label:'Diagnosticos salvos',    valor:historico.length, cor:S.navy },
                  { label:'Valor total recuperavel', valor:fmtR(historico.reduce((s,d)=>s+(d.credito_estimado||0),0)), cor:S.green },
                  { label:'Total NF-es analisadas',  valor:historico.reduce((s,d)=>s+(d.total_nfes||0),0), cor:S.orange },
                ].map((k,i) => (
                  <div key={i} style={{ background:S.bg, borderRadius:8, padding:'12px 14px', border:`1px solid ${S.border}`, textAlign:'center' }}>
                    <div style={{ fontSize:i===1?14:20, fontWeight:700, color:k.cor }}>{k.valor}</div>
                    <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:S.thBg }}>
                      {['Data','Periodo','NF-es','Indevidas','Total Retencoes','Valor Recuperavel','Status','Acoes'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:S.thText, fontWeight:600, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((diag,i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${S.border}`, background:i%2===0?S.white:'#FAFAFA' }}>
                        <td style={{ padding:'7px 10px', whiteSpace:'nowrap' }}>{fmtData(diag.created_at)}</td>
                        <td style={{ padding:'7px 10px' }}>{diag.periodo_inicio}{diag.periodo_fim&&diag.periodo_fim!==diag.periodo_inicio?` -> ${diag.periodo_fim}`:''}</td>
                        <td style={{ padding:'7px 10px' }}>{diag.total_nfes}</td>
                        <td style={{ padding:'7px 10px', color:S.red, fontWeight:700 }}>{diag.total_indevidas}</td>
                        <td style={{ padding:'7px 10px' }}>{fmtR(diag.valor_retencoes)}</td>
                        <td style={{ padding:'7px 10px', fontWeight:700, color:(diag.credito_estimado||0)>0?S.green:S.muted }}>{fmtR(diag.credito_estimado)}</td>
                        <td style={{ padding:'7px 10px' }}><Badge tipo={diag.status||'concluido'} /></td>
                        <td style={{ padding:'7px 10px' }}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={()=>abrirDiagnostico(diag)} style={{ padding:'4px 10px', background:S.navy, color:S.white, border:'none', borderRadius:4, fontSize:11, fontWeight:600, cursor:'pointer' }}>Abrir</button>
                            <button onClick={()=>excluirDiagnostico(diag.id)} style={{ padding:'4px 10px', background:'#fef2f2', color:S.red, border:`1px solid #fecaca`, borderRadius:4, fontSize:11, cursor:'pointer' }}>Excluir</button>
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