/**
 * ClassificacaoItens.jsx - e-FiscalTribe®
 * Versao 2.0 - 12/08/2026
 * Sprint 2 — Replicar e superar e-Recuperador
 * Novidades: contadores reais, Motor NCM vs Trib.Vigente separados,
 * modal com periodos, aprovacao em lote, paginacao configuravel
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
  ghost: '#F1F5F9', ghostText: '#94A3B8',
}

// Prefixos NCM monofasicos (mesmo Motor AbaMonofasicos)
const NCM_PREFIXOS_MONO = [
  '2701','2702','2703','2704','2705','2706','2707','2708','2709','2710','2711','2712','2713','2714','2715',
  '3001','3002','3003','3004','3005','3006',
  '3303','3304','3305','3306','3307','3401','9603','9619',
  '2201','2202','2203','2204','2205','2206','2207','2208','2209','2106',
  '8701','8702','8703','8704','8705','8706','8711',
  '4011','4012','4013',
  '8407','8408','8409','8413','8414','8415','8421','8431','8481','8482','8483','8484',
  '8501','8505','8507','8511','8512','8519','8527','8536','8539','8544','8708','8714','9032','9401',
]

function motorNCM(ncm) {
  if (!ncm) return { class: 'nao_encontrada', label: 'NCM nao encontrada', cor: 'red' }
  const n = ncm.replace(/\D/g, '')
  if (NCM_PREFIXOS_MONO.some(p => n.startsWith(p))) return { class: 'monofasico', label: 'Monofasico', cor: 'orange' }
  return { class: 'tributado', label: 'Tributado', cor: 'green' }
}

function Badge({ tipo, label }) {
  const map = {
    monofasico:    { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    tributado:     { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    nao_encontrada:{ bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    st_pis_cofins: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    pendente:      { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  }
  const b = map[tipo] || map.pendente
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// Modal de classificacao manual com suporte a periodos
function ModalClassificar({ itens, onSalvar, onFechar }) {
  const [considerarReceita, setConsiderarReceita] = useState(true)
  const [classificacao, setClassificacao] = useState('')
  const [periodos, setPeriodos] = useState([{ data_inicio: '', data_fim: '' }])
  const [salvando, setSalvando] = useState(false)

  function addPeriodo() { setPeriodos(prev => [...prev, { data_inicio: '', data_fim: '' }]) }
  function removePeriodo(i) { setPeriodos(prev => prev.filter((_, idx) => idx !== i)) }
  function updatePeriodo(i, campo, valor) {
    setPeriodos(prev => prev.map((p, idx) => idx === i ? { ...p, [campo]: valor } : p))
  }

  async function salvar() {
    if (!classificacao) { alert('Selecione uma classificacao'); return }
    setSalvando(true)
    await onSalvar({ classificacao, considerarReceita, periodos })
    setSalvando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div style={{ background: S.white, borderRadius: 12, padding: 24, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: S.navy }}>Classificar produtos</div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: S.muted }}>✕</button>
        </div>

        <div style={{ fontSize: 12, color: S.muted, marginBottom: 16 }}>
          {itens.length} produto(s) selecionado(s)
        </div>

        {/* Toggle considerar receita */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: S.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 16, border: `1px solid ${S.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Considerar receita?</span>
          <button onClick={() => setConsiderarReceita(v => !v)}
            style={{ background: considerarReceita ? S.blue : '#CBD5E1', border: 'none', borderRadius: 99, width: 40, height: 22, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, left: considerarReceita ? 20 : 3, width: 16, height: 16, background: S.white, borderRadius: '50%', transition: 'left 0.2s' }} />
          </button>
        </div>

        {/* Classificacao */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: S.muted, display: 'block', marginBottom: 6 }}>Classificacao *</label>
          <select value={classificacao} onChange={e => setClassificacao(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', color: classificacao ? S.text : S.muted }}>
            <option value="">Selecione...</option>
            <option value="monofasico">Monofasico</option>
            <option value="st_pis_cofins">ST PIS/COFINS</option>
            <option value="tributado">Tributado</option>
          </select>
        </div>

        {/* Periodos */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 8 }}>Periodo de vigencia</div>
          {periodos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <input type="month" value={p.data_inicio} onChange={e => updatePeriodo(i, 'data_inicio', e.target.value)}
                  placeholder="Inicio"
                  style={{ width: '100%', padding: '6px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <span style={{ fontSize: 11, color: S.muted }}>ate</span>
              <div style={{ flex: 1 }}>
                <input type="month" value={p.data_fim} onChange={e => updatePeriodo(i, 'data_fim', e.target.value)}
                  placeholder="Fim (vazio = vigente)"
                  style={{ width: '100%', padding: '6px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {periodos.length > 1 && (
                <button onClick={() => removePeriodo(i)} style={{ background: 'none', border: 'none', color: S.red, cursor: 'pointer', fontSize: 16 }}>🗑</button>
              )}
            </div>
          ))}
          <button onClick={addPeriodo}
            style={{ padding: '5px 12px', background: 'none', border: `1px dashed ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted, width: '100%' }}>
            + Adicionar periodo
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onFechar} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            style={{ padding: '8px 20px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Classificar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClassificacaoItens({ clienteId, cliente }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)
  const [selecionados, setSelecionados] = useState([]) // array de item.id
  const [menuAberto, setMenuAberto] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [aprovando, setAprovando] = useState(false)
  const [salvando, setSalvando] = useState(false)

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
    setSelecionados([])
  }

  // ── CONTADORES ──────────────────────────────────────────────────────────
  const totalNaoClassificados = itens.filter(i => !i.class_pis_cofins_considerado).length
  const totalClassificados    = itens.filter(i => !!i.class_pis_cofins_considerado).length
  const totalDuplicados       = itens.filter(i => i.duplicado).length

  // ── FILTRO + BUSCA ──────────────────────────────────────────────────────
  const itensFiltrados = itens.filter(i => {
    if (filtro === 'classificados'    && !i.class_pis_cofins_considerado) return false
    if (filtro === 'nao_classificados' && !!i.class_pis_cofins_considerado) return false
    if (filtro === 'duplicados'        && !i.duplicado) return false
    if (filtro === 'nao_encontrada'    && i.status_ncm !== 'nao_encontrada') return false
    if (busca) {
      const b = busca.toLowerCase()
      return (
        i.descricao?.toLowerCase().includes(b) ||
        i.ncm?.includes(b) ||
        i.codigo?.toLowerCase().includes(b) ||
        i.gtin?.includes(b)
      )
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / porPagina))
  const itensPagina  = itensFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina)

  // ── SELECAO ─────────────────────────────────────────────────────────────
  const todosSelecionados = itensPagina.length > 0 && itensPagina.every(i => selecionados.includes(i.id))

  function toggleTodos() {
    if (todosSelecionados) {
      const idsPagina = itensPagina.map(i => i.id)
      setSelecionados(prev => prev.filter(id => !idsPagina.includes(id)))
    } else {
      const idsPagina = itensPagina.map(i => i.id)
      setSelecionados(prev => [...new Set([...prev, ...idsPagina])])
    }
  }

  function toggleItem(id) {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function selecionarTodos() {
    setSelecionados(itensFiltrados.map(i => i.id))
  }

  // ── APROVAR TODOS MONOFASICOS (diferencial exclusivo) ───────────────────
  async function aprovarTodosMonofasicos() {
    const monofasicos = itens.filter(i => {
      const r = motorNCM(i.ncm)
      return r.class === 'monofasico' && !i.class_pis_cofins_considerado
    })
    if (monofasicos.length === 0) { alert('Nenhum item monofasico pendente de confirmacao.'); return }
    if (!window.confirm(`Confirmar ${monofasicos.length} itens como Monofasico?`)) return
    setAprovando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // Atualiza itens_fiscais
      for (const item of monofasicos) {
        await supabase.from('itens_fiscais')
          .update({ class_pis_cofins_considerado: 'monofasico', considerar_receita: true, updated_at: new Date().toISOString() })
          .eq('id', item.id)
        // Registra em itens_classificacoes
        await supabase.from('itens_classificacoes').insert({
          item_id: item.id, usuario_id: user.id,
          classificacao: 'monofasico', considerar_receita: true,
          fonte: 'motor_ncm', data_inicio: null, data_fim: null,
        })
      }
      await carregar()
      alert(`✅ ${monofasicos.length} itens aprovados como Monofasico!`)
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setAprovando(false) }
  }

  // ── CONFIRMAR CONFORME MOTOR NCM (itens selecionados) ──────────────────
  async function confirmarConforme() {
    if (selecionados.length === 0) return
    if (!window.confirm(`Confirmar ${selecionados.length} item(s) conforme Motor NCM?`)) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const itensSelecionados = itens.filter(i => selecionados.includes(i.id))
      for (const item of itensSelecionados) {
        const r = motorNCM(item.ncm)
        await supabase.from('itens_fiscais')
          .update({ class_pis_cofins_considerado: r.class, updated_at: new Date().toISOString() })
          .eq('id', item.id)
        await supabase.from('itens_classificacoes').insert({
          item_id: item.id, usuario_id: user.id,
          classificacao: r.class, considerar_receita: true,
          fonte: 'motor_ncm', data_inicio: null, data_fim: null,
        })
      }
      await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  // ── CLASSIFICAR MANUALMENTE (modal) ────────────────────────────────────
  async function salvarClassificacaoManual({ classificacao, considerarReceita, periodos }) {
    if (selecionados.length === 0) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const itensSelecionados = itens.filter(i => selecionados.includes(i.id))
      for (const item of itensSelecionados) {
        await supabase.from('itens_fiscais')
          .update({
            class_pis_cofins_considerado: classificacao,
            considerar_receita: considerarReceita,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
        // Insere um registro por periodo
        for (const p of periodos) {
          await supabase.from('itens_classificacoes').insert({
            item_id: item.id, usuario_id: user.id,
            classificacao, considerar_receita: considerarReceita,
            fonte: 'manual',
            data_inicio: p.data_inicio ? p.data_inicio + '-01' : null,
            data_fim: p.data_fim ? p.data_fim + '-01' : null,
          })
        }
      }
      await carregar()
      setModalAberto(false)
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  if (!clienteId) return (
    <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>🏢</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 8 }}>Selecione uma empresa</div>
      <div style={{ fontSize: 13 }}>Use o seletor de cliente no menu lateral</div>
    </div>
  )

  const itensSelecionadosObj = itens.filter(i => selecionados.includes(i.id))
  const monofasicosPendentes = itens.filter(i => motorNCM(i.ncm).class === 'monofasico' && !i.class_pis_cofins_considerado).length

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

      {/* MODAL */}
      {modalAberto && (
        <ModalClassificar
          itens={itensSelecionadosObj}
          onSalvar={salvarClassificacaoManual}
          onFechar={() => setModalAberto(false)}
        />
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
            Motor do Simples / <strong style={{ color: S.text }}>Classificacao de Itens</strong>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Classificacao de Itens</div>
          <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
            Revise, ajuste e confirme a classificacao fiscal dos itens de PIS/COFINS.
          </div>
        </div>
        {/* Botao diferencial exclusivo */}
        {monofasicosPendentes > 0 && (
          <button onClick={aprovarTodosMonofasicos} disabled={aprovando}
            style={{ padding: '9px 18px', background: '#fff7ed', color: '#ea580c', border: '2px solid #fed7aa', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: aprovando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚡ Aprovar {monofasicosPendentes} monofasico(s) em 1 clique
          </button>
        )}
      </div>

      {/* EMPRESA */}
      <div style={{ background: S.white, borderRadius: 8, border: `1px solid ${S.border}`, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: S.muted }}>Empresa selecionada:</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: S.navy }}>{cliente?.razao_social || '-'}</span>
        <span style={{ fontSize: 11, color: S.muted }}>({cliente?.regime || 'Simples Nacional'})</span>
      </div>

      {/* CONTADORES CLICAVEIS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'nao_classificados', label: 'nao classificados', count: totalNaoClassificados, cor: S.red,    bg: '#fef2f2', border: '#fecaca' },
          { id: 'classificados',     label: 'classificados',     count: totalClassificados,    cor: S.green,  bg: '#f0fdf4', border: '#86efac' },
          { id: 'duplicados',        label: 'duplicados',        count: totalDuplicados,        cor: S.blue,   bg: '#eff6ff', border: '#bfdbfe' },
          { id: 'nao_encontrada',    label: 'NCM nao encontrada',count: itens.filter(i=>i.status_ncm==='nao_encontrada').length, cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        ].map(c => (
          <button key={c.id}
            onClick={() => { setFiltro(filtro === c.id ? 'todos' : c.id); setPagina(1) }}
            style={{ padding: '8px 16px', background: filtro === c.id ? c.bg : S.white, border: `1px solid ${filtro === c.id ? c.border : S.border}`, borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: filtro === c.id ? c.cor : S.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: filtro === c.id ? c.cor : S.muted, color: S.white, borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{c.count}</span>
            {c.label}
          </button>
        ))}
        {filtro !== 'todos' && (
          <button onClick={() => { setFiltro('todos'); setPagina(1) }}
            style={{ padding: '8px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 99, fontSize: 12, cursor: 'pointer', color: S.muted }}>
            ✕ Limpar filtro
          </button>
        )}
      </div>

      {/* TABELA */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>

        {/* TOOLBAR */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Lista de Itens</div>
            {selecionados.length > 0 && (
              <span style={{ fontSize: 11, color: S.blue, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '2px 10px', fontWeight: 600 }}>
                {selecionados.length} selecionado(s)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selecionados.length > 0 ? (
              // Botoes de acao em lote (aparecem quando ha selecao)
              <>
                <button onClick={confirmarConforme} disabled={salvando}
                  style={{ padding: '6px 14px', background: '#f0fdf4', color: S.green, border: `1px solid #86efac`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Confirmar conforme Motor NCM
                </button>
                <button onClick={() => setModalAberto(true)}
                  style={{ padding: '6px 14px', background: '#eff6ff', color: S.blue, border: `1px solid #bfdbfe`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ✎ Classificar manualmente
                </button>
                <button onClick={() => setSelecionados([])}
                  style={{ padding: '6px 10px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
                  ✕
                </button>
              </>
            ) : (
              // Botoes padrao
              <>
                <button onClick={selecionarTodos}
                  style={{ padding: '6px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
                  Selecionar todos ({itensFiltrados.length})
                </button>
                <button onClick={() => carregar()}
                  style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
                  ↺ Atualizar
                </button>
              </>
            )}
          </div>
        </div>

        {/* BUSCA */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por descricao, NCM, codigo..."
            style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 280 }} />
          {busca && (
            <button onClick={() => { setBusca(''); setPagina(1) }}
              style={{ padding: '6px 10px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>✕</button>
          )}
          <span style={{ fontSize: 12, color: S.muted, marginLeft: 'auto' }}>
            {itensFiltrados.length} item(s) encontrado(s)
          </span>
        </div>

        {/* CONTEUDO */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando itens...</div>
        ) : itensFiltrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhum item encontrado</div>
            <div style={{ fontSize: 13, color: S.muted }}>
              {busca ? 'Tente uma busca diferente' : 'Importe NF-es para popular a lista de itens'}
            </div>
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
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>Codigo</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>Descricao</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>NCM</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>CEST</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: S.thText, fontWeight: 600, fontSize: 11, background: '#374151', borderLeft: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' }}>
                      Motor NCM
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: S.thText, fontWeight: 600, fontSize: 11, background: '#1f2937', borderLeft: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' }}>
                      Trib. Vigente
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {itensPagina.map((item, i) => {
                    const sel = selecionados.includes(item.id)
                    const motor = motorNCM(item.ncm)
                    const temConfirmacao = !!item.class_pis_cofins_considerado
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${S.border}`, background: sel ? '#eff6ff' : i % 2 === 0 ? S.white : '#FAFAFA' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleItem(item.id)} style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: S.navy, whiteSpace: 'nowrap' }}>{item.codigo || '-'}</td>
                        <td style={{ padding: '8px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.descricao}>
                          {item.descricao || '-'}
                        </td>
                        <td style={{ padding: '8px 10px', color: S.muted, fontFamily: 'monospace', fontSize: 11 }}>
                          {item.ncm || <span style={{ color: S.red }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 10px', color: S.muted, fontSize: 11 }}>{item.cest || '—'}</td>

                        {/* MOTOR NCM — sugestao automatica */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                          <Badge tipo={motor.class} label={motor.label} />
                        </td>

                        {/* TRIB. VIGENTE — confirmado pelo usuario */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                          {temConfirmacao ? (
                            <Badge tipo={item.class_pis_cofins_considerado} label={
                              item.class_pis_cofins_considerado === 'monofasico' ? 'Monofasico' :
                              item.class_pis_cofins_considerado === 'tributado'  ? 'Tributado'  :
                              item.class_pis_cofins_considerado === 'st_pis_cofins' ? 'ST PIS/COFINS' :
                              item.class_pis_cofins_considerado
                            } />
                          ) : (
                            <span style={{ color: S.ghostText, fontSize: 13 }}>—</span>
                          )}
                        </td>

                        {/* ACOES */}
                        <td style={{ padding: '8px 10px', position: 'relative' }}>
                          <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto === item.id ? null : item.id) }}
                            style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 8px', fontSize: 13, color: S.muted }}>
                            &#8943;
                          </button>
                          {menuAberto === item.id && (
                            <div style={{ position: 'absolute', right: 8, top: 30, background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 180 }}
                              onClick={e => e.stopPropagation()}>
                              <button onClick={() => {
                                setSelecionados([item.id])
                                setMenuAberto(null)
                                setTimeout(() => confirmarConforme(), 0)
                              }}
                                style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                                ✓ Confirmar conforme Motor NCM
                              </button>
                              <button onClick={() => {
                                setSelecionados([item.id])
                                setMenuAberto(null)
                                setModalAberto(true)
                              }}
                                style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                                ✎ Classificar manualmente
                              </button>
                              {item.class_pis_cofins_considerado && (
                                <button onClick={async () => {
                                  await supabase.from('itens_fiscais').update({ class_pis_cofins_considerado: null }).eq('id', item.id)
                                  setMenuAberto(null)
                                  await carregar()
                                }}
                                  style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', color: S.red }}>
                                  ✕ Remover classificacao
                                </button>
                              )}
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
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted, flexWrap: 'wrap', gap: 8 }}>
              <span>{itensFiltrados.length} itens — Pagina {pagina} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[['«', () => setPagina(1), pagina === 1], ['<', () => setPagina(p => Math.max(1, p - 1)), pagina === 1],
                  ['>', () => setPagina(p => Math.min(totalPaginas, p + 1)), pagina === totalPaginas],
                  ['»', () => setPagina(totalPaginas), pagina === totalPaginas]].map(([l, fn, dis], i) => (
                  <button key={i} onClick={fn} disabled={dis}
                    style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: dis ? 'not-allowed' : 'pointer', color: dis ? '#CBD5E1' : S.text }}>
                    {l}
                  </button>
                ))}
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  const p = Math.max(1, Math.min(pagina - 2, totalPaginas - 4)) + i
                  return (
                    <button key={p} onClick={() => setPagina(p)}
                      style={{ padding: '4px 10px', border: `1px solid ${p === pagina ? S.navy : S.border}`, borderRadius: 4, background: p === pagina ? S.navy : 'none', color: p === pagina ? S.white : S.text, cursor: 'pointer', fontWeight: p === pagina ? 700 : 400 }}>
                      {p}
                    </button>
                  )
                })}
                <select value={porPagina} onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1) }}
                  style={{ marginLeft: 8, padding: '3px 8px', border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por pagina</option>)}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}