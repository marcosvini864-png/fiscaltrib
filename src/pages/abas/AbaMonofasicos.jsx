/**
 * AbaMonofasicos.jsx — e-FiscalTribe®
 * Padrão visual e-Auditoria — upload + tabela + PGDAS-D + histórico
 * Versão: 3.0 — 05/08/2026
 */

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { parseXMLNFe } from '../../utils/parseXMLNFe'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleString('pt-BR') : '—'
const FORMATOS_ACEITOS = '.xml,.txt,.zip,.rar,.pdf,.DEC,.rec,.RE,.DIA,.prf'

const NCM_PREFIXOS = [
  '2701','2702','2703','2704','2705','2706','2707','2708','2709','2710','2711','2712','2713','2714','2715',
  '3001','3002','3003','3004','3005','3006',
  '3303','3304','3305','3306','3307','3401','9603','9619',
  '2201','2202','2203','2204','2205','2206','2207','2208','2209','2106',
  '8701','8702','8703','8704','8705','8706','8711',
  '4011','4012','4013',
  '8407','8408','8409','8413','8414','8415','8421','8431','8481','8482','8483','8484',
  '8501','8505','8507','8511','8512','8519','8527','8536','8539','8544','8708','8714','9032','9401',
]

function isMonofasico(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  return NCM_PREFIXOS.some(p => n.startsWith(p))
}

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
}

function Badge({ tipo }) {
  const map = {
    monofasico:     { label: 'Monofásico',     bg: '#dcfce7', color: '#166534', border: '#86efac' },
    nao_monofasico: { label: 'Não monofásico', bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
    pendente:       { label: 'Pendente PGDAS', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    concluido:      { label: 'Concluído',      bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    erro:           { label: 'Erro',           bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    ignorado:       { label: 'Ignorado',       bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
  }
  const b = map[tipo] || map.nao_monofasico
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
      {b.label}
    </span>
  )
}

export default function AbaMonofasicos({ cliente, regime }) {
  const [aba, setAba] = useState('importar') // importar | historico
  const [arquivos, setArquivos] = useState([])
  const [processando, setProcessando] = useState(false)
  const [itens, setItens] = useState([])
  const [processados, setProcessados] = useState([])
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [pgdasForm, setPgdasForm] = useState({ receita_bruta_total: '', receita_monofasica: '', receita_st: '', das_recolhido: '', segregou: false })
  const [pgdasResult, setPgdasResult] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagAberto, setDiagAberto] = useState(null)
  const POR_PAGINA = 10
  const inputRef = useRef(null)

  useEffect(() => {
    if (cliente?.id) carregarHistorico()
  }, [cliente?.id])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const { data } = await supabase
      .from('diagnosticos_monofasicos')
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
      const { error } = await supabase.from('diagnosticos_monofasicos').insert([{
        usuario_id: user.id,
        cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '',
        cliente_cnpj: cliente.cnpj || '',
        regime,
        arquivos_importados: processados.map(p => ({ nome: p.nome, tamanho: p.tamanho, status: p.status, qtd_itens: p.qtdItens || 0 })),
        importado_por: user.email || '',
        total_itens: itens.length,
        total_monofasicos: itens.filter(i => i.monofasico).length,
        receita_total: itens.reduce((s, i) => s + i.vProd, 0),
        receita_monofasica: itens.filter(i => i.monofasico).reduce((s, i) => s + i.vProd, 0),
        periodo_inicio: periodos[0] || null,
        periodo_fim: periodos[periodos.length - 1] || null,
        pgdas_json: pgdasResult || null,
        credito_estimado: pgdasResult?.diferenca || itens.filter(i => i.monofasico).reduce((s, i) => s + i.credito, 0),
        itens_json: itens.slice(0, 500),
        status: 'concluido',
      }])
      if (error) throw error
      await carregarHistorico()
      alert('Diagnóstico salvo com sucesso!')
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirDiagnostico(id) {
    if (!window.confirm('Excluir este diagnóstico?')) return
    await supabase.from('diagnosticos_monofasicos').delete().eq('id', id)
    if (diagAberto?.id === id) setDiagAberto(null)
    await carregarHistorico()
  }

  function abrirDiagnostico(diag) {
    setDiagAberto(diag)
    setItens(diag.itens_json || [])
    setPgdasResult(diag.pgdas_json || null)
    setAba('importar')
  }

  function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    const novos = files.map(f => ({ file: f, nome: f.name, tamanho: (f.size / 1024).toFixed(0) + ' KB', status: 'pendente' }))
    setArquivos(prev => [...prev, ...novos])
  }

  async function processar() {
    if (arquivos.length === 0) return
    setProcessando(true)
    setErro('')
    setDiagAberto(null)
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
              if (!nfe.competencia) continue;
              (nfe.itens || []).forEach(item => {
                const mono = isMonofasico(item.ncm)
                todosItens.push({
                  nNF: nfe.nNF || '—',
                  competencia: nfe.competencia,
                  emitente: nfe.emitNome || '—',
                  ncm: item.ncm || '—',
                  descricao: item.xProd || '—',
                  vProd: item.vProd || 0,
                  vItemPIS: item.vItemPIS || 0,
                  vItemCOFINS: item.vItemCOFINS || 0,
                  monofasico: mono,
                  credito: mono && regime !== 'Simples Nacional' ? (item.vItemPIS || 0) + (item.vItemCOFINS || 0) : 0,
                  pendentePGDAS: mono && regime === 'Simples Nacional',
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

    if (regime === 'Simples Nacional') {
      const recMono = todosItens.filter(i => i.monofasico).reduce((s, i) => s + i.vProd, 0)
      const recTotal = todosItens.reduce((s, i) => s + i.vProd, 0)
      setPgdasForm(prev => ({ ...prev, receita_bruta_total: recTotal.toFixed(2), receita_monofasica: recMono.toFixed(2) }))
    }

    setProcessados(novosProcessados)
    setItens(todosItens)
    setPgdasResult(null)
    setProcessando(false)
    setPagina(1)
  }

  function calcularPGDAS() {
    const rb  = parseFloat(pgdasForm.receita_bruta_total || 0)
    const rm  = parseFloat(pgdasForm.receita_monofasica || 0)
    const rst = parseFloat(pgdasForm.receita_st || 0)
    const das = parseFloat(pgdasForm.das_recolhido || 0)
    const dasCorreto = (rb - rm - rst) * 0.06
    const diferenca  = Math.max(0, das - dasCorreto)
    setPgdasResult({ rb, rm, rst, das, dasCorreto, diferenca, segregou: pgdasForm.segregou })
  }

  const itensFiltrados = itens.filter(i => {
    if (filtro === 'monofasico' && !i.monofasico) return false
    if (filtro === 'nao_monofasico' && i.monofasico) return false
    if (busca) {
      const b = busca.toLowerCase()
      return i.descricao.toLowerCase().includes(b) || i.ncm.includes(b) || i.emitente.toLowerCase().includes(b) || i.nNF.includes(b)
    }
    return true
  })

  const totalPaginas = Math.ceil(itensFiltrados.length / POR_PAGINA)
  const itensPagina  = itensFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const totalMono    = itens.filter(i => i.monofasico).length
  const creditoTotal = regime === 'Simples Nacional' ? (pgdasResult?.diferenca || 0) : itens.filter(i => i.monofasico).reduce((s, i) => s + i.credito, 0)
  const receitaMono  = itens.filter(i => i.monofasico).reduce((s, i) => s + i.vProd, 0)
  const temResultado = itens.length > 0

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Início / Diagnóstico Tributário / <strong style={{ color: S.text }}>Monofásicos PIS/COFINS</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>💊 Monofásicos PIS/COFINS</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Identifique produtos sujeitos à tributação monofásica e calcule o crédito recuperável de PIS/COFINS.
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `2px solid ${S.border}` }}>
        {[
          { id: 'importar', label: '📥 Importar' },
          { id: 'historico', label: `📋 Histórico (${historico.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba === a.id ? 700 : 400, color: aba === a.id ? S.navy : S.muted, background: 'none', border: 'none', borderBottom: `2px solid ${aba === a.id ? S.navy : 'transparent'}`, marginBottom: -2, cursor: 'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA IMPORTAR ── */}
      {aba === 'importar' && (
        <>
          {/* Upload */}
          <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>Central de Importação de Arquivos</div>
              <div style={{ fontSize: 12, color: S.muted }}>Tamanho máximo suportado: 10 MB</div>
            </div>
            <div style={{ padding: 16 }}>
              <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
                style={{ border: `2px dashed ${S.border}`, borderRadius: 8, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: S.bg, marginBottom: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: S.text, marginBottom: 4 }}>Clique ou arraste e solte o seu arquivo nesta área para fazer o upload</div>
                <div style={{ fontSize: 12, color: S.muted, marginBottom: 8 }}>É permitido fazer o upload de no máximo dez arquivos por vez.</div>
                <div style={{ fontSize: 11, color: S.muted }}>
                  Somente é aceito arquivos que possuam uma das extensões abaixo:<br />
                  <span style={{ fontWeight: 600, color: S.navy }}>.txt · .xml · .zip · .rar · .DEC · .rec · .RE · .DIA · .prf · .pdf</span>
                </div>
                <input ref={inputRef} type="file" multiple accept={FORMATOS_ACEITOS} onChange={onDrop} style={{ display: 'none' }} />
              </div>

              {/* Lista arquivos */}
              {arquivos.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: S.thBg }}>
                        {['Arquivo', 'Tamanho', 'Data de Upload', 'Importado por', 'Progresso', 'Status', ''].map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {arquivos.map((arq, i) => {
                        const proc = processados.find(p => p.nome === arq.nome)
                        const status = proc?.status || 'pendente'
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{arq.nome}</td>
                            <td style={{ padding: '7px 10px', color: S.muted }}>{arq.tamanho}</td>
                            <td style={{ padding: '7px 10px', color: S.muted }}>{new Date().toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '7px 10px', color: S.muted }}>{cliente?.razao_social || '—'}</td>
                            <td style={{ padding: '7px 10px', width: 120 }}>
                              <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: status === 'concluido' ? '100%' : status === 'erro' ? '60%' : '0%', background: status === 'concluido' ? S.green : status === 'erro' ? S.red : S.blue, transition: 'width 0.5s', borderRadius: 3 }} />
                              </div>
                            </td>
                            <td style={{ padding: '7px 10px' }}><Badge tipo={status} /></td>
                            <td style={{ padding: '7px 10px' }}>
                              <button onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))}
                                style={{ background: 'none', border: 'none', color: S.muted, cursor: 'pointer' }}>✕</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {erro && <div style={{ background: '#fef2f2', border: `1px solid #fecaca`, borderRadius: 6, padding: '10px 14px', color: S.red, fontSize: 13, marginBottom: 12 }}>⚠️ {erro}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={processar} disabled={arquivos.length === 0 || processando}
                  style={{ padding: '8px 20px', background: arquivos.length > 0 && !processando ? S.blue : S.border, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: arquivos.length > 0 && !processando ? 'pointer' : 'not-allowed' }}>
                  {processando ? '⏳ Processando...' : '🔍 Analisar Arquivos'}
                </button>
                {arquivos.length > 0 && (
                  <button onClick={() => { setArquivos([]); setProcessados([]); setItens([]); setPgdasResult(null); setDiagAberto(null) }}
                    style={{ padding: '8px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                    Limpar tudo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RESULTADO */}
          {temResultado && (
            <>
              {/* Banner diagnóstico aberto */}
              {diagAberto && (
                <div style={{ background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#2563eb' }}>
                    📂 Visualizando diagnóstico salvo em <strong>{fmtData(diagAberto.created_at)}</strong>
                  </div>
                  <button onClick={() => { setDiagAberto(null); setItens([]); setProcessados([]); setArquivos([]) }}
                    style={{ background: 'none', border: 'none', color: S.muted, cursor: 'pointer', fontSize: 13 }}>✕ Fechar</button>
                </div>
              )}

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total de itens', valor: itens.length, cor: S.navy },
                  { label: 'Itens monofásicos', valor: totalMono, cor: S.orange },
                  { label: 'Receita monofásica', valor: fmtR(receitaMono), cor: S.orange },
                  { label: 'Potencial de recuperação', valor: fmtR(creditoTotal), cor: S.green },
                ].map((k, i) => (
                  <div key={i} style={{ background: S.white, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: i >= 2 ? 14 : 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabela */}
              <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
                      placeholder="🔍 Buscar..."
                      style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 200 }} />
                    <button style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
                      Busca Avançada &gt;
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: S.muted }}>Visualizado por:</span>
                    {[
                      { id: 'todos', label: `Todos (${itens.length})` },
                      { id: 'monofasico', label: `Monofásicos (${totalMono})` },
                      { id: 'nao_monofasico', label: `Não monofásicos (${itens.length - totalMono})` },
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
                        {['☐', 'NF', 'Competência', 'Emitente', 'Descrição', 'NCM', 'Valor', 'PIS', 'COFINS', 'Classificação', 'Ações'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itensPagina.map((item, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                          <td style={{ padding: '7px 10px' }}><input type="checkbox" /></td>
                          <td style={{ padding: '7px 10px', fontWeight: 600 }}>{item.nNF}</td>
                          <td style={{ padding: '7px 10px' }}>{item.competencia}</td>
                          <td style={{ padding: '7px 10px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.emitente}</td>
                          <td style={{ padding: '7px 10px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descricao}</td>
                          <td style={{ padding: '7px 10px', color: S.muted }}>{item.ncm}</td>
                          <td style={{ padding: '7px 10px' }}>{fmtR(item.vProd)}</td>
                          <td style={{ padding: '7px 10px', color: item.vItemPIS > 0 ? S.red : S.muted }}>{fmtR(item.vItemPIS)}</td>
                          <td style={{ padding: '7px 10px', color: item.vItemCOFINS > 0 ? S.red : S.muted }}>{fmtR(item.vItemCOFINS)}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <Badge tipo={item.monofasico ? (item.pendentePGDAS ? 'pendente' : 'monofasico') : 'nao_monofasico'} />
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: S.muted }}>≡</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted }}>
                  <span>{itensFiltrados.length} itens · Página {pagina} de {Math.max(1, totalPaginas}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => setPagina(1)} disabled={pagina === 1}
                      style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? S.muted : S.text }}>«</button>
                    <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                      style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? S.muted : S.text }}>‹</button>
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
                      style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? S.muted : S.text }}>›</button>
                    <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}
                      style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? S.muted : S.text }}>»</button>
                  </div>
                </div>
              </div>

              {/* PGDAS-D */}
              {regime === 'Simples Nacional' && totalMono > 0 && (
                <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, background: '#fff7ed', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>📋</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: S.orange }}>PGDAS-D — Calcular Crédito de Segregação</div>
                      <div style={{ fontSize: 12, color: S.muted }}>Para Simples Nacional, informe os dados do PGDAS-D para calcular o crédito recuperável.</div>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
                      {[
                        { label: '* Receita Bruta Total (R$)', key: 'receita_bruta_total' },
                        { label: '* Receita Monofásica (R$)', key: 'receita_monofasica' },
                        { label: 'Receita c/ Subst. Tributária (R$)', key: 'receita_st' },
                        { label: '* DAS Recolhido (R$)', key: 'das_recolhido' },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
                          <input type="number" value={pgdasForm[key]}
                            onChange={e => setPgdasForm(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="0,00"
                            style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                      <input type="checkbox" checked={pgdasForm.segregou}
                        onChange={e => setPgdasForm(prev => ({ ...prev, segregou: e.target.checked }))} />
                      Segregou receitas monofásicas corretamente no PGDAS-D
                    </label>
                    <button onClick={calcularPGDAS}
                      style={{ padding: '8px 20px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      ✅ Calcular Crédito
                    </button>

                    {pgdasResult && (
                      <div style={{ marginTop: 16, background: pgdasResult.diferenca > 0 ? '#f0fdf4' : S.bg, border: `1px solid ${pgdasResult.diferenca > 0 ? '#86efac' : S.border}`, borderRadius: 8, padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: pgdasResult.diferenca > 0 ? S.green : S.muted, marginBottom: 10 }}>
                          {pgdasResult.diferenca > 0 ? '✅ Oportunidade identificada!' : 'ℹ️ Nenhuma diferença encontrada'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                          {[
                            { label: 'Receita Bruta Total', valor: fmtR(pgdasResult.rb) },
                            { label: 'Receita Monofásica', valor: fmtR(pgdasResult.rm) },
                            { label: 'DAS Recolhido', valor: fmtR(pgdasResult.das) },
                            { label: 'DAS Correto Estimado', valor: fmtR(pgdasResult.dasCorreto) },
                            { label: 'Diferença Recuperável', valor: fmtR(pgdasResult.diferenca), destaque: true },
                            { label: 'Segregou Corretamente', valor: pgdasResult.segregou ? 'Sim' : 'Não' },
                          ].map((k, i) => (
                            <div key={i} style={{ background: S.white, borderRadius: 6, padding: '8px 12px', border: `1px solid ${S.border}` }}>
                              <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>{k.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: k.destaque ? S.green : S.text }}>{k.valor}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              {!diagAberto && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button onClick={salvarDiagnostico} disabled={salvando}
                    style={{ padding: '9px 20px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                    {salvando ? 'Salvando...' : '💾 Salvar Diagnóstico'}
                  </button>
                  <button onClick={() => { setItens([]); setArquivos([]); setProcessados([]); setPgdasResult(null) }}
                    style={{ padding: '9px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                    ← Nova análise
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>Histórico de Diagnósticos</div>
            <button onClick={carregarHistorico} style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
              🔄 Atualizar
            </button>
          </div>

          {loadingHistorico ? (
            <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando...</div>
          ) : historico.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: S.text, marginBottom: 8 }}>Nenhum diagnóstico salvo</div>
              <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Importe arquivos e salve o diagnóstico para aparecer aqui</div>
              <button onClick={() => setAba('importar')}
                style={{ padding: '8px 20px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Novo Diagnóstico
              </button>
            </div>
          ) : (
            <>
              {/* KPIs histórico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: 16, borderBottom: `1px solid ${S.border}` }}>
                {[
                  { label: 'Diagnósticos salvos', valor: historico.length, cor: S.navy },
                  { label: 'Potencial total', valor: fmtR(historico.reduce((s, d) => s + (d.credito_estimado || 0), 0)), cor: S.green },
                  { label: 'Total de itens analisados', valor: historico.reduce((s, d) => s + (d.total_itens || 0), 0), cor: S.orange },
                ].map((k, i) => (
                  <div key={i} style={{ background: S.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: i === 1 ? 14 : 20, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabela histórico */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: S.thBg }}>
                      {['Data', 'Período', 'Arquivos', 'Itens', 'Monofásicos', 'Receita Mono', 'Potencial', 'Status', 'Ações'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((diag, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtData(diag.created_at)}</td>
                        <td style={{ padding: '7px 10px' }}>{diag.periodo_inicio} {diag.periodo_fim && diag.periodo_fim !== diag.periodo_inicio ? `→ ${diag.periodo_fim}` : ''}</td>
                        <td style={{ padding: '7px 10px' }}>{(diag.arquivos_importados || []).length} arquivo(s)</td>
                        <td style={{ padding: '7px 10px' }}>{diag.total_itens}</td>
                        <td style={{ padding: '7px 10px', color: S.orange, fontWeight: 700 }}>{diag.total_monofasicos}</td>
                        <td style={{ padding: '7px 10px' }}>{fmtR(diag.receita_monofasica)}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: (diag.credito_estimado || 0) > 0 ? S.green : S.muted }}>{fmtR(diag.credito_estimado)}</td>
                        <td style={{ padding: '7px 10px' }}><Badge tipo={diag.status || 'concluido'} /></td>
                        <td style={{ padding: '7px 10px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => { abrirDiagnostico(diag); setAba('importar') }}
                              style={{ padding: '4px 10px', background: S.navy, color: S.white, border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              Abrir
                            </button>
                            <button onClick={() => excluirDiagnostico(diag.id)}
                              style={{ padding: '4px 10px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                              🗑️
                            </button>
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