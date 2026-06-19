import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const fmtR    = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleDateString('pt-BR') : '—'
const hoje    = () => new Date().toISOString().slice(0, 10)

const STATUS_LIST = [
  { id: 'Em análise',           cor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '🔍' },
  { id: 'Documentação pendente',cor: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '📋' },
  { id: 'Em levantamento',      cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '🔎' },
  { id: 'Em revisão',           cor: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '✏️' },
  { id: 'Em PER/DCOMP',         cor: '#f97316', bg: '#fff7ed', border: '#fed7aa', icon: '📤' },
  { id: 'Protocolado',          cor: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', icon: '📨' },
  { id: 'Em acompanhamento',    cor: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: '👁️' },
  { id: 'Concluído',            cor: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '✅' },
  { id: 'Arquivado',            cor: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '🗂️' },
]

const TIPOS = [
  'PIS/COFINS Monofásico',
  'ICMS-ST Indevido',
  'Segregação de Receitas',
  'Fator R',
  'IRPJ/CSLL Lucro Presumido',
  'Exclusão ICMS Base PIS/COFINS',
  'Créditos de Insumos',
  'Outro',
]

const C = {
  navy: '#0B1F4D', bg: '#F5F7FA', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', white: '#FFFFFF',
}

const PROCESSO_VAZIO = {
  numero_processo: '', tipo_recuperacao: '', responsavel: '',
  status: 'Em análise', data_abertura: hoje(),
  credito_identificado: '', credito_recuperado: '',
  observacoes: '', cliente_id: '',
}

function StatusBadge({ status }) {
  const s = STATUS_LIST.find(x => x.id === status) || STATUS_LIST[0]
  return (
    <span style={{ background: s.bg, color: s.cor, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {s.icon} {s.id}
    </span>
  )
}

export default function Acompanhamento() {
  const [processos,   setProcessos]   = useState([])
  const [clientes,    setClientes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('dashboard')
  const [filtroStatus,setFiltroStatus]= useState('Todos')
  const [detalhe,     setDetalhe]     = useState(null)
  const [form,        setForm]        = useState(null)
  const [salvando,    setSalvando]    = useState(false)

  // Pendência
  const [novaPend,    setNovaPend]    = useState({ descricao: '', responsavel: '', prazo: '' })
  // Timeline
  const [novoEvento,  setNovoEvento]  = useState('')

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cli } = await supabase.from('clientes').select('id,razao_social,regime').eq('usuario_id', user.id).order('razao_social')
    setClientes(cli || [])
    const ids = (cli || []).map(c => c.id)
    if (ids.length > 0) {
      const { data: proc } = await supabase.from('acompanhamentos').select('*').in('cliente_id', ids).order('created_at', { ascending: false })
      setProcessos(proc || [])
    }
    setLoading(false)
  }

  async function salvarProcesso() {
    if (!form.cliente_id) { alert('Selecione um cliente.'); return }
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      usuario_id: user.id,
      cliente_id: form.cliente_id,
      numero_processo: form.numero_processo,
      tipo_recuperacao: form.tipo_recuperacao,
      responsavel: form.responsavel,
      status: form.status,
      data_abertura: form.data_abertura,
      credito_identificado: parseFloat(form.credito_identificado) || 0,
      credito_recuperado: parseFloat(form.credito_recuperado) || 0,
      observacoes: form.observacoes,
      updated_at: new Date().toISOString(),
    }
    if (form.id) {
      const { error } = await supabase.from('acompanhamentos').update(payload).eq('id', form.id)
      if (!error) {
        setProcessos(prev => prev.map(p => p.id === form.id ? { ...p, ...payload } : p))
        setForm(null)
      } else alert('Erro: ' + error.message)
    } else {
      const timeline = [{ data: hoje(), evento: 'Processo aberto', auto: true }]
      const { data, error } = await supabase.from('acompanhamentos').insert([{ ...payload, pendencias: [], timeline }]).select()
      if (!error && data) { setProcessos(prev => [data[0], ...prev]); setForm(null) }
      else alert('Erro: ' + error.message)
    }
    setSalvando(false)
  }

  async function atualizarStatus(id, novoStatus) {
    const evento = { data: hoje(), evento: `Status alterado para: ${novoStatus}`, auto: true }
    const proc = processos.find(p => p.id === id)
    const timeline = [...(proc?.timeline || []), evento]
    await supabase.from('acompanhamentos').update({ status: novoStatus, timeline, updated_at: new Date().toISOString() }).eq('id', id)
    setProcessos(prev => prev.map(p => p.id === id ? { ...p, status: novoStatus, timeline } : p))
    if (detalhe?.id === id) setDetalhe(prev => ({ ...prev, status: novoStatus, timeline }))
  }

  async function adicionarEvento(id) {
    if (!novoEvento.trim()) return
    const proc = processos.find(p => p.id === id)
    const timeline = [...(proc?.timeline || []), { data: hoje(), evento: novoEvento.trim(), auto: false }]
    await supabase.from('acompanhamentos').update({ timeline, updated_at: new Date().toISOString() }).eq('id', id)
    setProcessos(prev => prev.map(p => p.id === id ? { ...p, timeline } : p))
    setDetalhe(prev => ({ ...prev, timeline }))
    setNovoEvento('')
  }

  async function adicionarPendencia(id) {
    if (!novaPend.descricao.trim()) return
    const proc = processos.find(p => p.id === id)
    const pendencias = [...(proc?.pendencias || []), { ...novaPend, id: Date.now(), resolvido: false }]
    await supabase.from('acompanhamentos').update({ pendencias, updated_at: new Date().toISOString() }).eq('id', id)
    setProcessos(prev => prev.map(p => p.id === id ? { ...p, pendencias } : p))
    setDetalhe(prev => ({ ...prev, pendencias }))
    setNovaPend({ descricao: '', responsavel: '', prazo: '' })
  }

  async function resolverPendencia(procId, pendId) {
    const proc = processos.find(p => p.id === procId)
    const pendencias = (proc?.pendencias || []).map(p => p.id === pendId ? { ...p, resolvido: true } : p)
    await supabase.from('acompanhamentos').update({ pendencias, updated_at: new Date().toISOString() }).eq('id', procId)
    setProcessos(prev => prev.map(p => p.id === procId ? { ...p, pendencias } : p))
    setDetalhe(prev => ({ ...prev, pendencias }))
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este processo?')) return
    await supabase.from('acompanhamentos').delete().eq('id', id)
    setProcessos(prev => prev.filter(p => p.id !== id))
    setDetalhe(null)
  }

  const filtrados = processos.filter(p => filtroStatus === 'Todos' || p.status === filtroStatus)

  // KPIs
  const emAndamento   = processos.filter(p => p.status !== 'Concluído' && p.status !== 'Arquivado').length
  const concluidos    = processos.filter(p => p.status === 'Concluído').length
  const comPendencia  = processos.filter(p => (p.pendencias || []).some(x => !x.resolvido)).length
  const totalCredito  = processos.reduce((s, p) => s + (p.credito_identificado || 0), 0)
  const totalRecup    = processos.reduce((s, p) => s + (p.credito_recuperado || 0), 0)

  const inp = (val, key, ph, tp = 'text') => (
    <input value={val} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} type={tp}
      style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
  )

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: C.muted, fontSize: 16 }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — GESTÃO OPERACIONAL</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>📁 Acompanhamento de Processos</h1>
        <p style={{ fontSize: 14, color: '#93c5fd', marginBottom: 24, maxWidth: 560 }}>
          Gerencie toda a jornada de recuperação tributária do diagnóstico até o crédito recuperado.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
          {[
            { valor: emAndamento,      label: 'Em andamento',        cor: '#7CC4FF' },
            { valor: concluidos,       label: 'Concluídos',          cor: '#4ade80' },
            { valor: comPendencia,     label: 'Com pendências',       cor: '#fbbf24' },
            { valor: fmtR(totalCredito), label: 'Créditos identificados', cor: '#7CC4FF' },
            { valor: fmtR(totalRecup), label: 'Efetivamente recuperado', cor: '#4ade80' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: i < 3 ? 24 : 14, fontWeight: 900, color: c.cor, marginBottom: 4 }}>{c.valor}</div>
              <div style={{ fontSize: 11, color: '#93c5fd' }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTROLES */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')}
            style={{ padding: '8px 16px', background: view === 'dashboard' ? C.navy : C.white, color: view === 'dashboard' ? '#fff' : C.text, border: `2px solid ${view === 'dashboard' ? C.navy : C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📊 Dashboard
          </button>
          <button onClick={() => setView('lista')}
            style={{ padding: '8px 16px', background: view === 'lista' ? C.navy : C.white, color: view === 'lista' ? '#fff' : C.text, border: `2px solid ${view === 'lista' ? C.navy : C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📋 Lista
          </button>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: '8px 14px', border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text }}>
            <option value="Todos">Todos os status</option>
            {STATUS_LIST.map(s => <option key={s.id}>{s.id}</option>)}
          </select>
        </div>
        <button onClick={() => setForm({ ...PROCESSO_VAZIO })}
          style={{ padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Novo processo
        </button>
      </div>

      {/* VAZIO */}
      {processos.length === 0 && (
        <div style={{ background: C.white, borderRadius: 14, border: `2px solid ${C.border}`, padding: 60, textAlign: 'center', color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Nenhum processo ainda</div>
          <div style={{ fontSize: 14, marginBottom: 24 }}>Crie o primeiro processo de acompanhamento</div>
          <button onClick={() => setForm({ ...PROCESSO_VAZIO })}
            style={{ padding: '12px 28px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Novo processo
          </button>
        </div>
      )}

      {/* DASHBOARD */}
      {view === 'dashboard' && processos.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {STATUS_LIST.map(s => {
              const qtd = processos.filter(p => p.status === s.id).length
              return (
                <div key={s.id} onClick={() => { setFiltroStatus(s.id); setView('lista') }}
                  style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.cor }}>{qtd}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.cor }}>{s.id}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Processos com pendência */}
          {comPendencia > 0 && (
            <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>⚠️ {comPendencia} processo(s) com pendências abertas</div>
              {processos.filter(p => (p.pendencias || []).some(x => !x.resolvido)).map(p => {
                const cli = clientes.find(c => c.id === p.cliente_id)
                const pends = (p.pendencias || []).filter(x => !x.resolvido)
                return (
                  <div key={p.id} onClick={() => setDetalhe(p)}
                    style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{cli?.razao_social} — {p.numero_processo}</div>
                    <div style={{ fontSize: 12, color: '#92400e' }}>{pends.length} pendência(s): {pends[0]?.descricao}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LISTA */}
      {view === 'lista' && filtrados.length > 0 && (
        <div style={{ background: C.white, borderRadius: 14, border: `2px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Nº Processo', 'Cliente', 'Tipo', 'Abertura', 'Responsável', 'Crédito', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const cli = clientes.find(c => c.id === p.cliente_id)
                const pends = (p.pendencias || []).filter(x => !x.resolvido).length
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid #f1f5f9` }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: C.navy }}>{p.numero_processo || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{cli?.razao_social || '—'}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{cli?.regime}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: C.muted }}>{p.tipo_recuperacao || '—'}</td>
                    <td style={{ padding: '12px 14px', color: C.muted }}>{fmtData(p.data_abertura)}</td>
                    <td style={{ padding: '12px 14px', color: C.text }}>{p.responsavel || '—'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#16a34a' }}>{fmtR(p.credito_identificado)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={p.status} />
                      {pends > 0 && <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, marginTop: 4 }}>⚠️ {pends} pendência(s)</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setDetalhe(p)} style={{ padding: '5px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>👁</button>
                        <button onClick={() => setForm({ ...p, credito_identificado: p.credito_identificado || '', credito_recuperado: p.credito_recuperado || '' })} style={{ padding: '5px 10px', background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => excluir(p.id)} style={{ padding: '5px 10px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL NOVO/EDITAR */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg, #0B1F4D, #163B8C)', borderRadius: '16px 16px 0 0', padding: '20px 28px', color: '#fff' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{form.id ? '✏️ Editar processo' : '+ Novo processo'}</div>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Cliente *</label>
                  <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                    <option value="">— Selecione —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Nº do Processo</label>
                  {inp(form.numero_processo, 'numero_processo', 'Ex: FT-2026-001')}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Tipo de recuperação</label>
                  <select value={form.tipo_recuperacao} onChange={e => setForm(f => ({ ...f, tipo_recuperacao: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                    <option value="">— Selecione —</option>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Responsável</label>
                  {inp(form.responsavel, 'responsavel', 'Nome do responsável')}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Data de abertura</label>
                  {inp(form.data_abertura, 'data_abertura', '', 'date')}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                    {STATUS_LIST.map(s => <option key={s.id}>{s.id}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Crédito identificado (R$)</label>
                  {inp(form.credito_identificado, 'credito_identificado', '0,00', 'number')}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Crédito recuperado (R$)</label>
                  {inp(form.credito_recuperado, 'credito_recuperado', '0,00', 'number')}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Observações</label>
                <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setForm(null)} style={{ padding: '12px 24px', background: '#f8fafc', color: C.muted, border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={salvarProcesso} disabled={salvando} style={{ flex: 1, padding: '12px 0', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : '💾 Salvar processo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE */}
      {detalhe && (() => {
        const cli  = clientes.find(c => c.id === detalhe.cliente_id)
        const proc = processos.find(p => p.id === detalhe.id) || detalhe
        const pends = (proc.pendencias || [])
        const timeline = (proc.timeline || [])
        const st = STATUS_LIST.find(s => s.id === proc.status) || STATUS_LIST[0]
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #0B1F4D, #163B8C)', borderRadius: '16px 16px 0 0', padding: '24px 28px', color: '#fff' }}>
                <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>PROCESSO {proc.numero_processo || '—'}</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>{cli?.razao_social}</div>
                <div style={{ fontSize: 13, color: '#93c5fd' }}>{proc.tipo_recuperacao} · Aberto em {fmtData(proc.data_abertura)} · {proc.responsavel}</div>
              </div>

              <div style={{ padding: '24px 28px' }}>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Crédito identificado', valor: fmtR(proc.credito_identificado), cor: '#16a34a' },
                    { label: 'Crédito recuperado',   valor: fmtR(proc.credito_recuperado),   cor: '#2563eb' },
                    { label: 'Pendências abertas',   valor: pends.filter(x => !x.resolvido).length, cor: '#d97706' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: k.cor }}>{k.valor}</div>
                    </div>
                  ))}
                </div>

                {/* Status */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Atualizar status</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUS_LIST.map(s => (
                      <button key={s.id} onClick={() => atualizarStatus(proc.id, s.id)}
                        style={{ padding: '7px 12px', background: proc.status === s.id ? s.cor : s.bg, color: proc.status === s.id ? '#fff' : s.cor, border: `2px solid ${s.border}`, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {s.icon} {s.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>📅 Timeline</div>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {timeline.length === 0
                      ? <div style={{ color: C.muted, fontSize: 13 }}>Nenhum evento registrado.</div>
                      : [...timeline].reverse().map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.auto ? C.navy : '#16a34a', marginTop: 4, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, color: C.muted }}>{ev.data}</div>
                            <div style={{ fontSize: 13, color: C.text, fontWeight: ev.auto ? 400 : 600 }}>{ev.evento}</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={novoEvento} onChange={e => setNovoEvento(e.target.value)} placeholder="Adicionar evento à timeline..."
                      style={{ flex: 1, padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }} />
                    <button onClick={() => adicionarEvento(proc.id)}
                      style={{ padding: '9px 16px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      + Adicionar
                    </button>
                  </div>
                </div>

                {/* Pendências */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>⚠️ Pendências</div>
                  {pends.length === 0
                    ? <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>Nenhuma pendência registrada.</div>
                    : pends.map((p, i) => (
                      <div key={i} style={{ background: p.resolvido ? '#f0fdf4' : '#fffbeb', border: `1px solid ${p.resolvido ? '#86efac' : '#fde68a'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: p.resolvido ? '#16a34a' : '#92400e' }}>{p.resolvido ? '✅' : '⏳'} {p.descricao}</div>
                          {p.responsavel && <div style={{ fontSize: 11, color: C.muted }}>Responsável: {p.responsavel}</div>}
                          {p.prazo && <div style={{ fontSize: 11, color: C.muted }}>Prazo: {fmtData(p.prazo)}</div>}
                        </div>
                        {!p.resolvido && (
                          <button onClick={() => resolverPendencia(proc.id, p.id)}
                            style={{ padding: '5px 12px', background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                            Resolver
                          </button>
                        )}
                      </div>
                    ))
                  }
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Nova pendência</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <input value={novaPend.descricao} onChange={e => setNovaPend(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição *"
                        style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }} />
                      <input value={novaPend.responsavel} onChange={e => setNovaPend(p => ({ ...p, responsavel: e.target.value }))} placeholder="Responsável"
                        style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }} />
                      <input type="date" value={novaPend.prazo} onChange={e => setNovaPend(p => ({ ...p, prazo: e.target.value }))}
                        style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <button onClick={() => adicionarPendencia(proc.id)}
                      style={{ padding: '8px 18px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      + Adicionar pendência
                    </button>
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDetalhe(null)} style={{ flex: 1, padding: '12px 0', background: '#f8fafc', color: C.muted, border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Fechar</button>
                  <button onClick={() => { setForm({ ...proc, credito_identificado: proc.credito_identificado || '', credito_recuperado: proc.credito_recuperado || '' }); setDetalhe(null) }}
                    style={{ flex: 1, padding: '12px 0', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✏️ Editar</button>
                  <button onClick={() => excluir(proc.id)}
                    style={{ padding: '12px 18px', background: '#fff1f2', color: '#dc2626', border: '2px solid #fecdd3', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}