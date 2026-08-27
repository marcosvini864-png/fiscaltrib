/**
 * ClassificacaoItens.jsx - e-FiscalTribe®
 * Versao 2.2 - 13/08/2026
 * + Skeleton e ghost rows
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

function resultadoMotorSalvo(item) {
  const classificacao = item?.class_pis_cofins_econsulta

  if (classificacao === 'monofasico') {
    return {
      class: 'monofasico',
      label: 'Monofasico',
      cor: 'orange',
    }
  }

  if (classificacao === 'tributado') {
    return {
      class: 'tributado',
      label: 'Tributado',
      cor: 'green',
    }
  }

  if (classificacao === 'st_pis_cofins') {
    return {
      class: 'st_pis_cofins',
      label: 'ST PIS/COFINS',
      cor: 'blue',
    }
  }

  if (item?.status_ncm === 'nao_encontrada') {
    return {
      class: 'nao_encontrada',
      label: 'NCM nao encontrada',
      cor: 'red',
    }
  }

  return {
    class: 'pendente',
    label: 'Pendente',
    cor: 'muted',
  }
}

function Badge({ tipo, label }) {
  const map = {
    monofasico:     { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    tributado:      { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    nao_encontrada: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    st_pis_cofins:  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    pendente:       { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  }
  const b = map[tipo] || map.pendente
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      <td style={{ padding: '10px 10px' }}><div style={{ width: 14, height: 14, borderRadius: 3, background: S.ghost }} /></td>
      {[80, 160, 90, 50, 80, 80, 60].map((w, i) => (
        <td key={i} style={{ padding: '10px 10px' }}>
          <div style={{ height: 13, width: w, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

const GHOST_ROWS = Array(8).fill(null).map((_, i) => ({
  ghost: true,
  id: `ghost-${i}`,
  codigo: `COD-${String(i + 1).padStart(4, '0')}`,
  descricao: 'Descricao do produto',
  ncm: '0000.00.00',
  cest: '—',
  class_pis_cofins_considerado: null,
  status_ncm: 'encontrada',
}))

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
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: S.muted }}>X</button>
        </div>
        <div style={{ fontSize: 12, color: S.muted, marginBottom: 16 }}>{itens.length} produto(s) selecionado(s)</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: S.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 16, border: `1px solid ${S.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Considerar receita?</span>
          <button onClick={() => setConsiderarReceita(v => !v)}
            style={{ background: considerarReceita ? S.blue : '#CBD5E1', border: 'none', borderRadius: 99, width: 40, height: 22, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, left: considerarReceita ? 20 : 3, width: 16, height: 16, background: S.white, borderRadius: '50%', transition: 'left 0.2s' }} />
          </button>
        </div>
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
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 8 }}>Periodo de vigencia</div>
          {periodos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <input type="month" value={p.data_inicio} onChange={e => updatePeriodo(i, 'data_inicio', e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <span style={{ fontSize: 11, color: S.muted }}>ate</span>
              <div style={{ flex: 1 }}>
                <input type="month" value={p.data_fim} onChange={e => updatePeriodo(i, 'data_fim', e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {periodos.length > 1 && (
                <button onClick={() => removePeriodo(i)} style={{ background: 'none', border: 'none', color: S.red, cursor: 'pointer', fontSize: 14 }}>X</button>
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
  const [selecionados, setSelecionados] = useState([])
  const [menuAberto, setMenuAberto] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [aprovando, setAprovando] = useState(false)
  const [confirmandoDemais, setConfirmandoDemais] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => { if (clienteId) carregar() }, [clienteId])

  async function carregar() {
    setLoading(true)

    try {
      const todos = []
      const tamanhoLote = 1000
      let inicio = 0

      while (true) {
        const fim = inicio + tamanhoLote - 1

        const { data, error } = await supabase
          .from('itens_fiscais')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('descricao', { ascending: true })
          .order('id', { ascending: true })
          .range(inicio, fim)

        if (error) throw error

        const lote = data || []
        todos.push(...lote)

        if (lote.length < tamanhoLote) break

        inicio += tamanhoLote
      }

      setItens(todos)
    } catch (e) {
      console.error('Erro ao carregar itens fiscais:', e)
      alert(
        'Erro ao carregar itens fiscais: ' +
        (e.message || 'falha desconhecida')
      )
      setItens([])
    } finally {
      setLoading(false)
    }
  }

  const totalNaoClassificados = itens.filter(i => !i.class_pis_cofins_considerado).length
  const totalClassificados    = itens.filter(i => !!i.class_pis_cofins_considerado).length
  const totalDuplicados       = itens.filter(i => i.duplicado).length

  const itensFiltrados = itens.filter(i => {
    if (filtro === 'classificados'     && !i.class_pis_cofins_considerado) return false
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
  const temDados     = itens.length > 0

  const todosSelecionados = itensPagina.length > 0 && !itensPagina[0]?.ghost && itensPagina.every(i => selecionados.includes(i.id))

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

  async function aprovarTodosMonofasicos() {
    const monofasicos = itens.filter(
  i =>
    i.class_pis_cofins_econsulta === 'monofasico' &&
    !i.class_pis_cofins_considerado
)
    if (monofasicos.length === 0) { alert('Nenhum item monofasico pendente de confirmacao.'); return }
    if (!window.confirm(`Confirmar ${monofasicos.length} itens como Monofasico?`)) return
    setAprovando(true)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      for (const item of monofasicos) {
        await supabase.from('itens_fiscais')
          .update({ class_pis_cofins_considerado: 'monofasico', considerar_receita: true, updated_at: new Date().toISOString() })
          .eq('id', item.id)
        await supabase.from('itens_classificacoes').insert({
          item_id: item.id, usuario_id: user.id,
          classificacao: 'monofasico', considerar_receita: true,
          fonte: 'motor_ncm', data_inicio: null, data_fim: null,
        })
      }
      await carregar()
      alert(`${monofasicos.length} itens aprovados como Monofasico!`)
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setAprovando(false) }
  }

  async function confirmarDemaisSugestoesEmLote() {
    const pendentes = itens.filter(item =>
      !item.class_pis_cofins_considerado &&
      (
        item.class_pis_cofins_econsulta === 'tributado' ||
        item.class_pis_cofins_econsulta === 'st_pis_cofins'
      )
    )

    if (pendentes.length === 0) {
      alert('Nenhuma outra sugestao do Motor pendente de confirmacao.')
      return
    }

    const totalTributados = pendentes.filter(
      item => item.class_pis_cofins_econsulta === 'tributado'
    ).length

    const totalSt = pendentes.filter(
      item => item.class_pis_cofins_econsulta === 'st_pis_cofins'
    ).length

    const mensagem =
      'Confirmar ' + pendentes.length + ' sugestoes do Motor NCM?' +
      '\n\nTributados: ' + totalTributados +
      '\nST PIS/COFINS: ' + totalSt +
      '\n\nOs itens monofasicos nao serao alterados por esta acao.'

    if (!window.confirm(mensagem)) return

    setConfirmandoDemais(true)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.id) {
        throw new Error('Usuario nao identificado.')
      }

      for (const item of pendentes) {
        const classificacaoMotor =
          item.class_pis_cofins_econsulta

        const considerarReceita =
          item.considerar_receita !== false

        const { error: erroItem } = await supabase
          .from('itens_fiscais')
          .update({
            class_pis_cofins_considerado:
              classificacaoMotor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)

        if (erroItem) throw erroItem

        const { error: erroHistorico } = await supabase
          .from('itens_classificacoes')
          .insert({
            item_id: item.id,
            usuario_id: user.id,
            classificacao: classificacaoMotor,
            considerar_receita: considerarReceita,
            fonte: 'motor_ncm',
            data_inicio: null,
            data_fim: null,
          })

        if (erroHistorico) throw erroHistorico
      }

      await carregar()

      alert(
        pendentes.length +
        ' sugestoes do Motor confirmadas com sucesso.'
      )
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setConfirmandoDemais(false)
    }
  }
  async function confirmarConforme() {
    if (selecionados.length === 0) return
    if (!window.confirm(`Confirmar ${selecionados.length} item(s) conforme Motor NCM?`)) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const itensSelecionados = itens.filter(i => selecionados.includes(i.id))
      for (const item of itensSelecionados) {
  const classificacaoMotor = item.class_pis_cofins_econsulta

  if (!classificacaoMotor) continue

  await supabase.from('itens_fiscais')
    .update({
      class_pis_cofins_considerado: classificacaoMotor,
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)

  await supabase.from('itens_classificacoes').insert({
    item_id: item.id,
    usuario_id: user.id,
    classificacao: classificacaoMotor,
    considerar_receita: item.considerar_receita !== false,
    fonte: 'motor_ncm',
    data_inicio: null,
    data_fim: null,
  })
}
      await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  async function salvarClassificacaoManual({
  classificacao,
  considerarReceita,
  periodos
}) {
  if (selecionados.length === 0) return

  const periodoInvalido = periodos.some(
    p =>
      p.data_inicio &&
      p.data_fim &&
      p.data_inicio > p.data_fim
  )

  if (periodoInvalido) {
    alert('A data inicial não pode ser posterior à data final.')
    return
  }

  setSalvando(true)

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const itensSelecionados = itens.filter(i =>
      selecionados.includes(i.id)
    )

    const agora = new Date()
    const mesAtual =
      `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

    const possuiVigenciaAtual = periodos.some(p => {
      const inicioValido =
        !p.data_inicio || p.data_inicio <= mesAtual

      const fimValido =
        !p.data_fim || p.data_fim >= mesAtual

      return inicioValido && fimValido
    })

    for (const item of itensSelecionados) {

      const atualizacaoItem = {
        updated_at: new Date().toISOString(),
      }

      if (possuiVigenciaAtual) {
        atualizacaoItem.class_pis_cofins_considerado = classificacao
        atualizacaoItem.considerar_receita = considerarReceita
      }

      const { error: erroItem } = await supabase
        .from('itens_fiscais')
        .update(atualizacaoItem)
        .eq('id', item.id)

      if (erroItem) throw erroItem

      for (const p of periodos) {
        const { error: erroHistorico } = await supabase
          .from('itens_classificacoes')
          .insert({
            item_id: item.id,
            usuario_id: user.id,
            classificacao,
            considerar_receita: considerarReceita,
            fonte: 'manual',
            data_inicio: p.data_inicio
              ? p.data_inicio + '-01'
              : null,
            data_fim: p.data_fim
              ? p.data_fim + '-01'
              : null,
          })

        if (erroHistorico) throw erroHistorico
      }
    }

    await carregar()
    setModalAberto(false)

  } catch (e) {
    alert('Erro: ' + e.message)
  } finally {
    setSalvando(false)
  }
}

async function removerClassificacao(item) {
  if (!item?.class_pis_cofins_considerado) return

  const classificacaoAnterior = item.class_pis_cofins_considerado

  if (!window.confirm(
    `Remover a classificação vigente "${classificacaoAnterior}" deste item?`
  )) return

  setSalvando(true)

  try {
    const agora = new Date()

    const mesAtual =
      `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`

    const { error: erroHistorico } = await supabase
      .from('itens_classificacoes')
      .update({
        data_fim: mesAtual,
      })
      .eq('item_id', item.id)
      .eq('classificacao', classificacaoAnterior)
      .is('data_fim', null)
      .or(`data_inicio.is.null,data_inicio.lte.${mesAtual}`)

    if (erroHistorico) throw erroHistorico

    const { error: erroItem } = await supabase
      .from('itens_fiscais')
      .update({
        class_pis_cofins_considerado: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (erroItem) throw erroItem

    setMenuAberto(null)
    await carregar()

  } catch (e) {
    alert('Erro ao remover classificação: ' + e.message)
  } finally {
    setSalvando(false)
  }
}

  async function excluirItem(id) {
    if (!window.confirm('Excluir este item do cadastro?')) return
    await supabase.from('itens_fiscais').delete().eq('id', id)
    setMenuAberto(null)
    await carregar()
  }

  async function excluirSelecionados() {
    if (selecionados.length === 0) return
    if (!window.confirm(`Excluir ${selecionados.length} item(s) permanentemente?`)) return
    setSalvando(true)
    try {
      await supabase.from('itens_fiscais').delete().in('id', selecionados)
      setSelecionados([])
      await carregar()
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
  const monofasicosPendentes = itens.filter(
  i =>
    i.class_pis_cofins_econsulta === 'monofasico' &&
    !i.class_pis_cofins_considerado
).length

  const demaisSugestoesPendentes = itens.filter(
    item =>
      !item.class_pis_cofins_considerado &&
      (
        item.class_pis_cofins_econsulta === 'tributado' ||
        item.class_pis_cofins_econsulta === 'st_pis_cofins'
      )
  ).length
  // Linhas a exibir: skeleton se loading, ghost se vazio, dados se tem
  const linhasExibir = loading ? null : (temDados ? itensPagina : GHOST_ROWS)

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

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
      </div>

      {(monofasicosPendentes > 0 || demaisSugestoesPendentes > 0) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >

          {monofasicosPendentes > 0 && (
            <div
              style={{
                width: 500,
                minHeight: 66,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: '#FFFFFF',
                border: '1px solid #D7DEE8',
                borderRadius: 10,
                padding: '8px 14px',
                boxShadow: '0 2px 6px rgba(15,23,42,0.05)',
              }}
            >
              <div style={{ textAlign: 'center', width: 52, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: '#0B1F4D',
                  }}
                >
                  {monofasicosPendentes}
                </div>

                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    marginTop: 4,
                  }}
                >
                  itens
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: 3,
                  }}
                >
                  Monofásicos aguardando confirmação
                </div>

                <div style={{ fontSize: 11, color: '#64748B' }}>
                  Classificação sugerida pelo Motor
                </div>
              </div>

              <button
                onClick={aprovarTodosMonofasicos}
                disabled={aprovando}
                style={{
                  width: 112,
                  height: 32,
                  flexShrink: 0,
                  background: '#0B1F4D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: aprovando ? 'not-allowed' : 'pointer',
                  opacity: aprovando ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {aprovando ? (
  <span
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      minWidth: 100,
      gap: 3,
    }}
  >
    <span>{"\u23F3"} Aprovando...</span>
    <progress
      aria-label="Aprova??o dos itens monof?sicos em andamento"
      style={{
        width: '100%',
        height: 5,
        display: 'block',
      }}
    />
  </span>
) : 'Aprovar em lote'}
              </button>
            </div>
          )}

          {demaisSugestoesPendentes > 0 && (
            <div
              style={{
                width: 500,
                minHeight: 66,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: '#FFFFFF',
                border: '1px solid #D7DEE8',
                borderRadius: 10,
                padding: '8px 14px',
                boxShadow: '0 2px 6px rgba(15,23,42,0.05)',
              }}
            >
              <div style={{ textAlign: 'center', width: 52, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: '#0B1F4D',
                  }}
                >
                  {demaisSugestoesPendentes}
                </div>

                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    marginTop: 4,
                  }}
                >
                  itens
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: 3,
                  }}
                >
                  Itens tributados e sujeitos à ST de PIS/Cofins aguardando confirmação
                </div>

                <div style={{ fontSize: 11, color: '#64748B' }}>
                  Classificação sugerida pelo Motor
                </div>
              </div>

              <button
                onClick={confirmarDemaisSugestoesEmLote}
                disabled={confirmandoDemais}
                style={{
                  width: 112,
                  height: 32,
                  flexShrink: 0,
                  background: '#0B1F4D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: confirmandoDemais ? 'not-allowed' : 'pointer',
                  opacity: confirmandoDemais ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {confirmandoDemais ? (
  <span
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      minWidth: 105,
      gap: 3,
    }}
  >
    <span>{"\u23F3"} Confirmando...</span>
    <progress
      aria-label="Confirma??o dos itens tributados/ST em andamento"
      style={{
        width: '100%',
        height: 5,
        display: 'block',
      }}
    />
  </span>
) : 'Confirmar em lote'}
              </button>
            </div>
          )}

        </div>
      )}
      {/* EMPRESA */}
      <div style={{ background: S.white, borderRadius: 8, border: `1px solid ${S.border}`, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: S.muted }}>Empresa selecionada:</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: S.navy }}>{cliente?.razao_social || '-'}</span>
        <span style={{ fontSize: 11, color: S.muted }}>({cliente?.regime || 'Simples Nacional'})</span>
      </div>

      {/* CONTADORES */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'nao_classificados', label: 'nao classificados', count: loading ? '—' : totalNaoClassificados,                                      cor: S.red,    bg: '#fef2f2', border: '#fecaca' },
          { id: 'classificados',     label: 'classificados',     count: loading ? '—' : totalClassificados,                                          cor: S.green,  bg: '#f0fdf4', border: '#86efac' },
          { id: 'duplicados',        label: 'duplicados',        count: loading ? '—' : totalDuplicados,                                             cor: S.blue,   bg: '#eff6ff', border: '#bfdbfe' },
          { id: 'nao_encontrada',    label: 'NCM nao encontrada',count: loading ? '—' : itens.filter(i => i.status_ncm === 'nao_encontrada').length, cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        ].map(c => (
          <button key={c.id}
            onClick={() => { if (!loading && temDados) { setFiltro(filtro === c.id ? 'todos' : c.id); setPagina(1) } }}
            style={{ padding: '8px 16px', background: filtro === c.id ? c.bg : S.white, border: `1px solid ${filtro === c.id ? c.border : S.border}`, borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer', color: filtro === c.id ? c.cor : S.muted, display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1 }}>
            <span style={{ background: filtro === c.id ? c.cor : S.muted, color: S.white, borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{c.count}</span>
            {c.label}
          </button>
        ))}
        {filtro !== 'todos' && !loading && (
          <button onClick={() => { setFiltro('todos'); setPagina(1) }}
            style={{ padding: '8px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 99, fontSize: 12, cursor: 'pointer', color: S.muted }}>
            X Limpar filtro
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
              <>
                <button onClick={confirmarConforme} disabled={salvando}
                  style={{ padding: '6px 14px', background: '#f0fdf4', color: S.green, border: `1px solid #86efac`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Confirmar conforme Motor NCM
                </button>
                <button onClick={() => setModalAberto(true)}
                  style={{ padding: '6px 14px', background: '#eff6ff', color: S.blue, border: `1px solid #bfdbfe`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Classificar manualmente
                </button>
                <button onClick={excluirSelecionados} disabled={salvando}
                  style={{ padding: '6px 14px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Excluir selecionados
                </button>
                <button onClick={() => setSelecionados([])}
                  style={{ padding: '6px 10px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
                  X
                </button>
              </>
            ) : (
              <>
                <button onClick={selecionarTodos} disabled={!temDados || loading}
                  style={{ padding: '6px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: temDados ? 'pointer' : 'not-allowed', color: S.muted, opacity: temDados ? 1 : 0.5 }}>
                  Selecionar todos ({temDados ? itensFiltrados.length : '—'})
                </button>
                <button onClick={() => carregar()}
                  style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
                  Atualizar
                </button>
              </>
            )}
          </div>
        </div>

        {/* BUSCA */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por descricao, NCM, codigo..."
            disabled={!temDados || loading}
            style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 280, opacity: temDados ? 1 : 0.5 }} />
          {busca && (
            <button onClick={() => { setBusca(''); setPagina(1) }}
              style={{ padding: '6px 10px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>X</button>
          )}
          <span style={{ fontSize: 12, color: S.muted, marginLeft: 'auto' }}>
            {loading ? 'Carregando...' : temDados ? `${itensFiltrados.length} item(s) encontrado(s)` : 'Importe NF-es para popular'}
          </span>
        </div>

        {/* CONTEUDO */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.thBg }}>
                <th style={{ padding: '8px 10px', color: S.thText, width: 36 }}>
                  <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} disabled={!temDados || loading} style={{ cursor: temDados ? 'pointer' : 'not-allowed' }} />
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>Codigo</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>Descricao</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>NCM</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>CEST</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: S.thText, fontWeight: 600, fontSize: 11, background: '#374151', borderLeft: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' }}>Motor NCM</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', color: S.thText, fontWeight: 600, fontSize: 11, background: '#1f2937', borderLeft: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' }}>Tributação Vigente</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(null).map((_, i) => <SkeletonRow key={i} />)
              ) : (
                linhasExibir.map((item, i) => {
                  const isGhost = item.ghost
                  const sel     = !isGhost && selecionados.includes(item.id)
                  const motor = resultadoMotorSalvo(item)
                  const temConf = !isGhost && !!item.class_pis_cofins_considerado
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${S.border}`, background: isGhost ? S.ghost : sel ? '#eff6ff' : i % 2 === 0 ? S.white : '#FAFAFA' }}>
                      <td style={{ padding: '8px 10px' }}>
                        {!isGhost && <input type="checkbox" checked={sel} onChange={() => toggleItem(item.id)} style={{ cursor: 'pointer' }} />}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: isGhost ? S.ghostText : S.navy, whiteSpace: 'nowrap' }}>{item.codigo || '-'}</td>
                      <td style={{ padding: '8px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isGhost ? S.ghostText : S.text }} title={item.descricao}>
                        {item.descricao || '-'}
                      </td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.muted, fontFamily: 'monospace', fontSize: 11 }}>
                        {isGhost ? item.ncm : (item.ncm || <span style={{ color: S.red }}>—</span>)}
                      </td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.muted, fontSize: 11 }}>{item.cest || '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                        {isGhost
                          ? <span style={{ background: S.ghost, color: S.ghostText, border: `1px solid ${S.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>—</span>
                          : <Badge tipo={motor.class} label={motor.label} />
                        }
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                        {isGhost
                          ? <span style={{ color: S.ghostText, fontSize: 13 }}>—</span>
                          : temConf
                            ? <Badge tipo={item.class_pis_cofins_considerado} label={
                                item.class_pis_cofins_considerado === 'monofasico'    ? 'Monofasico'    :
                                item.class_pis_cofins_considerado === 'tributado'     ? 'Tributado'     :
                                item.class_pis_cofins_considerado === 'st_pis_cofins' ? 'ST PIS/COFINS' :
                                item.class_pis_cofins_considerado
                              } />
                            : <span style={{ color: S.ghostText, fontSize: 13 }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '8px 10px', position: 'relative' }}>
                        {!isGhost && (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto === item.id ? null : item.id) }}
                              style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 4, cursor: 'pointer', padding: '2px 8px', fontSize: 13, color: S.muted }}>
                              ...
                            </button>
                            <button onClick={e => { e.stopPropagation(); excluirItem(item.id) }}
                              title="Excluir item"
                              style={{ background: 'none', border: `1px solid #fecaca`, borderRadius: 4, cursor: 'pointer', padding: '2px 7px', fontSize: 16, color: '#8B5E3C' }}>
                              🗑
                            </button>
                          </div>
                        )}
                        {!isGhost && menuAberto === item.id && (
                          <div style={{ position: 'absolute', right: 8, top: 30, background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 200 }}
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setSelecionados([item.id]); setMenuAberto(null); setTimeout(() => confirmarConforme(), 0) }}
                              style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                              Confirmar conforme Motor NCM
                            </button>
                            <button onClick={() => { setSelecionados([item.id]); setMenuAberto(null); setModalAberto(true) }}
                              style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                              Classificar manualmente
                            </button>
                            {temConf && (
                             <button
							 onClick={() => removerClassificacao(item)} 
                             style={{
                             display: 'block',
                             width: '100%',
                             padding: '8px 14px',
                             background: 'none',
                             border: 'none',
                             textAlign: 'left',
                             fontSize: 12,
                             cursor: 'pointer',
                             color: S.orange,
                             borderBottom: `1px solid ${S.border}`,
                             }}
                              >
                             Remover classificacao
                             </button>
                            )}
                            <button onClick={() => excluirItem(item.id)}
                              style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', color: S.red }}>
                              Excluir item
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RODAPE */}
        {!loading && !temDados && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${S.border}`, textAlign: 'center', fontSize: 12, color: S.ghostText }}>
            Importe NF-es na aba Monofasicos para popular a lista de itens
          </div>
        )}

        {/* PAGINACAO */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted, flexWrap: 'wrap', gap: 8 }}>
          <span>
            {loading ? 'Carregando...' : temDados ? `${itensFiltrados.length} itens — Pagina ${pagina} de ${totalPaginas}` : 'Nenhum item cadastrado'}
          </span>
          {temDados && !loading && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[['«', () => setPagina(1), pagina === 1],
                ['<', () => setPagina(p => Math.max(1, p - 1)), pagina === 1],
                ['>', () => setPagina(p => Math.min(totalPaginas, p + 1)), pagina === totalPaginas],
                ['»', () => setPagina(totalPaginas), pagina === totalPaginas],
              ].map(([l, fn, dis], i) => (
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
              <select value={porPagina} onChange={e => { const n = Number(e.target.value); setPorPagina(n); setPagina(1) }}
                style={{ marginLeft: 8, padding: '3px 8px', border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por pagina</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}