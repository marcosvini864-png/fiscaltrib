import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const fmtR    = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtData = v => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
const hoje    = () => new Date().toISOString().slice(0, 10)

const C = {
  navy: '#0B1F4D', bg: '#F5F7FA', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', white: '#FFFFFF',
}

// ─── OBRIGAÇÕES POR REGIME ───────────────────────────────────────────────────
const OBRIGACOES = {
  'Simples Nacional': [
    { nome: 'PGDAS-D',           dia: 20, descricao: 'Declaração mensal do Simples Nacional' },
    { nome: 'DEFIS',             dia: 31, mes: 3, descricao: 'Declaração de Informações Socioeconômicas e Fiscais (anual)' },
    { nome: 'DAS',               dia: 20, descricao: 'Documento de Arrecadação do Simples Nacional' },
    { nome: 'DIRF',              dia: 28, mes: 2, descricao: 'Declaração do Imposto de Renda Retido na Fonte (anual)' },
    { nome: 'EFD-Reinf',         dia: 15, descricao: 'Escrituração Fiscal Digital de Retenções' },
    { nome: 'eSocial',           dia: 7,  descricao: 'Obrigação trabalhista e previdenciária' },
  ],
  'Lucro Presumido': [
    { nome: 'DCTF Mensal',       dia: 15, descricao: 'Declaração de Débitos e Créditos Tributários Federais' },
    { nome: 'DCTFWeb',           dia: 15, descricao: 'DCTF via web para contribuições' },
    { nome: 'PIS/COFINS',        dia: 25, descricao: 'Apuração e pagamento mensal' },
    { nome: 'IRPJ Trimestral',   dia: 31, descricao: 'Imposto de Renda Pessoa Jurídica (trimestral)' },
    { nome: 'CSLL Trimestral',   dia: 31, descricao: 'Contribuição Social sobre o Lucro Líquido (trimestral)' },
    { nome: 'ECD',               dia: 31, mes: 5, descricao: 'Escrituração Contábil Digital (anual)' },
    { nome: 'ECF',               dia: 31, mes: 7, descricao: 'Escrituração Contábil Fiscal (anual)' },
    { nome: 'EFD Contribuições', dia: 10, descricao: 'SPED Contribuições mensal' },
    { nome: 'SPED Fiscal',       dia: 15, descricao: 'Escrituração Fiscal Digital mensal' },
    { nome: 'DIRF',              dia: 28, mes: 2, descricao: 'Declaração do IR Retido na Fonte (anual)' },
    { nome: 'EFD-Reinf',         dia: 15, descricao: 'Escrituração Fiscal Digital de Retenções' },
    { nome: 'eSocial',           dia: 7,  descricao: 'Obrigação trabalhista e previdenciária' },
  ],
  'Lucro Real': [
    { nome: 'DCTF Mensal',       dia: 15, descricao: 'Declaração de Débitos e Créditos Tributários Federais' },
    { nome: 'DCTFWeb',           dia: 15, descricao: 'DCTF via web para contribuições' },
    { nome: 'PIS/COFINS',        dia: 25, descricao: 'Apuração e pagamento mensal (não cumulativo)' },
    { nome: 'IRPJ Mensal/Trim',  dia: 31, descricao: 'Estimativa mensal ou apuração trimestral' },
    { nome: 'CSLL Mensal/Trim',  dia: 31, descricao: 'Contribuição Social mensal ou trimestral' },
    { nome: 'ECD',               dia: 31, mes: 5, descricao: 'Escrituração Contábil Digital (anual)' },
    { nome: 'ECF',               dia: 31, mes: 7, descricao: 'Escrituração Contábil Fiscal (anual)' },
    { nome: 'LALUR',             dia: 31, descricao: 'Livro de Apuração do Lucro Real' },
    { nome: 'EFD Contribuições', dia: 10, descricao: 'SPED Contribuições mensal' },
    { nome: 'SPED Fiscal',       dia: 15, descricao: 'Escrituração Fiscal Digital mensal' },
    { nome: 'DIRF',              dia: 28, mes: 2, descricao: 'Declaração do IR Retido na Fonte (anual)' },
    { nome: 'EFD-Reinf',         dia: 15, descricao: 'Escrituração Fiscal Digital de Retenções' },
    { nome: 'eSocial',           dia: 7,  descricao: 'Obrigação trabalhista e previdenciária' },
    { nome: 'PERDCOMP',          dia: 30, descricao: 'Pedido Eletrônico de Ressarcimento ou Restituição' },
  ],
}

const SITUACAO_STYLE = {
  'Entregue':           { cor: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '✅' },
  'Pendente':           { cor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '📋' },
  'Próximo do venc.':   { cor: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⚠️' },
  'Vencido':            { cor: '#dc2626', bg: '#fff1f2', border: '#fecdd3', icon: '🔴' },
  'Não se aplica':      { cor: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '➖' },
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function SituacaoBadge({ situacao }) {
  const s = SITUACAO_STYLE[situacao] || SITUACAO_STYLE['Pendente']
  return (
    <span style={{ background: s.bg, color: s.cor, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {s.icon} {situacao}
    </span>
  )
}

function calcularSituacaoAuto(vencimento) {
  if (!vencimento) return 'Pendente'
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date(vencimento + 'T00:00:00')
  const dias = Math.round((venc - hoje) / (1000*60*60*24))
  if (dias < 0)  return 'Vencido'
  if (dias <= 7) return 'Próximo do venc.'
  return 'Pendente'
}

export default function PrazosFiscais() {
  const [prazos,      setPrazos]      = useState([])
  const [clientes,    setClientes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('painel')
  const [filtroReg,   setFiltroReg]   = useState('Todos')
  const [filtroCli,   setFiltroCli]   = useState('Todos')
  const [filtroSit,   setFiltroSit]   = useState('Todos')
  const [mesAtual,    setMesAtual]    = useState(new Date().getMonth())
  const [anoAtual,    setAnoAtual]    = useState(new Date().getFullYear())
  const [form,        setForm]        = useState(null)
  const [salvando,    setSalvando]    = useState(false)
  const [gerandoAuto, setGerandoAuto] = useState(false)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: cli } = await supabase.from('clientes').select('id,razao_social,regime').eq('usuario_id', user.id).order('razao_social')
    setClientes(cli || [])
    const ids = (cli || []).map(c => c.id)
    if (ids.length > 0) {
      const { data: pr } = await supabase.from('prazos_fiscais').select('*').in('cliente_id', ids).order('vencimento', { ascending: true })
      setPrazos(pr || [])
    }
    setLoading(false)
  }

  async function gerarObrigacoesAuto(clienteId, regime, mesRef, anoRef) {
    setGerandoAuto(true)
    const obrigacoes = OBRIGACOES[regime] || []
    const inseridos = []
    for (const ob of obrigacoes) {
      const mes = ob.mes || (mesRef + 1)
      const ano = ob.mes ? anoRef : anoRef
      const dataVenc = `${ano}-${String(mes).padStart(2,'0')}-${String(ob.dia).padStart(2,'0')}`
      const competencia = `${anoRef}-${String(mesRef + 1).padStart(2,'0')}`
      const situacaoAuto = calcularSituacaoAuto(dataVenc)
      const { data } = await supabase.from('prazos_fiscais').insert([{
        cliente_id: clienteId,
        obrigacao: ob.nome,
        regime,
        competencia,
        vencimento: dataVenc,
        situacao: situacaoAuto,
        observacoes: ob.descricao,
      }]).select()
      if (data) inseridos.push(...data)
    }
    setPrazos(prev => [...prev, ...inseridos])
    setGerandoAuto(false)
    alert(`✅ ${inseridos.length} obrigações geradas para ${MESES[mesRef]}/${anoRef}!`)
  }

  async function salvarPrazo() {
    if (!form.cliente_id || !form.obrigacao || !form.vencimento) { alert('Preencha os campos obrigatórios.'); return }
    setSalvando(true)
    const situacaoAuto = form.situacao === 'Entregue' ? 'Entregue' : calcularSituacaoAuto(form.vencimento)
    const payload = { ...form, situacao: situacaoAuto, updated_at: new Date().toISOString() }
    if (form.id) {
      const { error } = await supabase.from('prazos_fiscais').update(payload).eq('id', form.id)
      if (!error) setPrazos(prev => prev.map(p => p.id === form.id ? { ...p, ...payload } : p))
      else alert('Erro: ' + error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('prazos_fiscais').insert([{ ...payload, usuario_id: user.id }]).select()
      if (!error && data) setPrazos(prev => [...prev, ...data])
      else alert('Erro: ' + error.message)
    }
    setSalvando(false)
    setForm(null)
  }

  async function marcarEntregue(id) {
    await supabase.from('prazos_fiscais').update({ situacao: 'Entregue', updated_at: new Date().toISOString() }).eq('id', id)
    setPrazos(prev => prev.map(p => p.id === id ? { ...p, situacao: 'Entregue' } : p))
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este prazo?')) return
    await supabase.from('prazos_fiscais').delete().eq('id', id)
    setPrazos(prev => prev.filter(p => p.id !== id))
  }

  // Filtros
  const filtrados = prazos.filter(p => {
    if (filtroReg !== 'Todos' && p.regime !== filtroReg) return false
    if (filtroCli !== 'Todos' && p.cliente_id !== filtroCli) return false
    if (filtroSit !== 'Todos' && p.situacao !== filtroSit) return false
    return true
  })

  // KPIs
  const emDia      = prazos.filter(p => p.situacao === 'Entregue').length
  const proximos   = prazos.filter(p => p.situacao === 'Próximo do venc.').length
  const vencidos   = prazos.filter(p => p.situacao === 'Vencido').length
  const pendentes  = prazos.filter(p => p.situacao === 'Pendente').length

  // Calendário — prazos do mês/ano selecionado
  const doMes = prazos.filter(p => {
    if (!p.vencimento) return false
    const d = new Date(p.vencimento + 'T00:00:00')
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
  }).sort((a, b) => a.vencimento.localeCompare(b.vencimento))

  const PRAZO_VAZIO = { cliente_id: '', obrigacao: '', regime: 'Simples Nacional', competencia: '', vencimento: '', situacao: 'Pendente', observacoes: '' }

  const inp = (val, key, ph, tp = 'text') => (
    <input value={val || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} type={tp}
      style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
  )

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: C.muted, fontSize: 16 }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — GESTÃO FISCAL</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>📅 Prazos Fiscais</h1>
        <p style={{ fontSize: 14, color: '#93c5fd', marginBottom: 24, maxWidth: 560 }}>
          Controle automático de vencimentos e obrigações fiscais por regime tributário.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {[
            { valor: emDia,    label: 'Entregues',           cor: '#4ade80' },
            { valor: proximos, label: 'Próximos do venc.',   cor: '#fbbf24' },
            { valor: vencidos, label: 'Vencidos',            cor: '#f87171' },
            { valor: pendentes,label: 'Pendentes',           cor: '#7CC4FF' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: c.cor, marginBottom: 4 }}>{c.valor}</div>
              <div style={{ fontSize: 11, color: '#93c5fd' }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ALERTAS */}
      {vencidos > 0 && (
        <div style={{ background: '#fff1f2', border: '2px solid #fecdd3', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🔴</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{vencidos} obrigação(ões) vencida(s)!</div>
            <div style={{ fontSize: 12, color: '#dc2626' }}>Regularize imediatamente para evitar multas e penalidades.</div>
          </div>
        </div>
      )}
      {proximos > 0 && (
        <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{proximos} obrigação(ões) vencendo em breve!</div>
            <div style={{ fontSize: 12, color: '#92400e' }}>Prazo em até 7 dias. Providencie a entrega.</div>
          </div>
        </div>
      )}

      {/* CONTROLES */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['painel','📊 Painel'],['calendario','📅 Calendário'],['lista','📋 Lista']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '8px 16px', background: view === v ? C.navy : C.white, color: view === v ? '#fff' : C.text, border: `2px solid ${view === v ? C.navy : C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {l}
            </button>
          ))}
          <select value={filtroReg} onChange={e => setFiltroReg(e.target.value)}
            style={{ padding: '8px 12px', border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="Todos">Todos os regimes</option>
            <option>Simples Nacional</option>
            <option>Lucro Presumido</option>
            <option>Lucro Real</option>
          </select>
          <select value={filtroCli} onChange={e => setFiltroCli(e.target.value)}
            style={{ padding: '8px 12px', border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="Todos">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
          </select>
          <select value={filtroSit} onChange={e => setFiltroSit(e.target.value)}
            style={{ padding: '8px 12px', border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="Todos">Todas as situações</option>
            {Object.keys(SITUACAO_STYLE).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => setForm({ ...PRAZO_VAZIO })}
          style={{ padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Novo prazo
        </button>
      </div>

      {/* VAZIO */}
      {prazos.length === 0 && (
        <div style={{ background: C.white, borderRadius: 14, border: `2px solid ${C.border}`, padding: 60, textAlign: 'center', color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Nenhum prazo cadastrado</div>
          <div style={{ fontSize: 14, marginBottom: 24 }}>Gere obrigações automaticamente ou cadastre manualmente</div>
          <button onClick={() => setForm({ ...PRAZO_VAZIO })}
            style={{ padding: '12px 28px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Novo prazo
          </button>
        </div>
      )}

      {/* PAINEL */}
      {view === 'painel' && prazos.length > 0 && (
        <div>
          {/* Por situação */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            {Object.entries(SITUACAO_STYLE).map(([sit, s]) => {
              const qtd = prazos.filter(p => p.situacao === sit).length
              return (
                <div key={sit} onClick={() => { setFiltroSit(sit); setView('lista') }}
                  style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.cor }}>{qtd}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.cor, marginTop: 4 }}>{sit}</div>
                </div>
              )
            })}
          </div>

          {/* Por regime */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
            {['Simples Nacional','Lucro Presumido','Lucro Real'].map(reg => {
              const regPrazos = prazos.filter(p => p.regime === reg)
              const entregues = regPrazos.filter(p => p.situacao === 'Entregue').length
              const venc      = regPrazos.filter(p => p.situacao === 'Vencido').length
              const prox      = regPrazos.filter(p => p.situacao === 'Próximo do venc.').length
              return (
                <div key={reg} style={{ background: C.white, borderRadius: 12, border: `2px solid ${C.border}`, padding: '18px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{reg}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, marginBottom: 8 }}>{regPrazos.length}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>obrigações cadastradas</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>✅ {entregues}</span>
                    {prox > 0 && <span style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>⚠️ {prox}</span>}
                    {venc > 0 && <span style={{ fontSize: 11, background: '#fff1f2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>🔴 {venc}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Gerador automático */}
          <div style={{ background: C.white, borderRadius: 12, border: `2px solid ${C.border}`, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4 }}>⚡ Gerar obrigações automaticamente</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Selecione um cliente e período para gerar todas as obrigações do regime automaticamente.</div>
            <GerarAuto clientes={clientes} onGerar={gerarObrigacoesAuto} gerando={gerandoAuto} />
          </div>
        </div>
      )}

      {/* CALENDÁRIO */}
      {view === 'calendario' && (
        <div>
          {/* Navegação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, justifyContent: 'center' }}>
            <button onClick={() => { if(mesAtual===0){setMesAtual(11);setAnoAtual(a=>a-1)}else setMesAtual(m=>m-1) }}
              style={{ padding: '8px 16px', background: C.white, border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>◀</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, minWidth: 180, textAlign: 'center' }}>{MESES[mesAtual]} / {anoAtual}</div>
            <button onClick={() => { if(mesAtual===11){setMesAtual(0);setAnoAtual(a=>a+1)}else setMesAtual(m=>m+1) }}
              style={{ padding: '8px 16px', background: C.white, border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>▶</button>
          </div>

          {doMes.length === 0 ? (
            <div style={{ background: C.white, borderRadius: 12, border: `2px solid ${C.border}`, padding: 40, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Nenhum prazo em {MESES[mesAtual]}/{anoAtual}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {doMes.map(p => {
                const cli = clientes.find(c => c.id === p.cliente_id)
                const s   = SITUACAO_STYLE[p.situacao] || SITUACAO_STYLE['Pendente']
                const d   = new Date(p.vencimento + 'T00:00:00')
                return (
                  <div key={p.id} style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: s.cor, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, fontWeight: 600 }}>{MESES[d.getMonth()].slice(0,3).toUpperCase()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{p.obrigacao}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{cli?.razao_social} · {p.regime}</div>
                      {p.observacoes && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.observacoes}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <SituacaoBadge situacao={p.situacao} />
                      {p.situacao !== 'Entregue' && (
                        <button onClick={() => marcarEntregue(p.id)}
                          style={{ padding: '4px 12px', background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                          ✅ Marcar entregue
                        </button>
                      )}
                    </div>
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
                {['Cliente','Obrigação','Regime','Competência','Vencimento','Situação','Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const cli = clientes.find(c => c.id === p.cliente_id)
                const s   = SITUACAO_STYLE[p.situacao] || SITUACAO_STYLE['Pendente']
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid #f1f5f9`, background: p.situacao === 'Vencido' ? '#fff8f8' : p.situacao === 'Próximo do venc.' ? '#fffdf0' : 'transparent' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: C.text }}>{cli?.razao_social || '—'}</td>
                    <td style={{ padding: '11px 14px', color: C.navy, fontWeight: 600 }}>{p.obrigacao}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{p.regime}</span>
                    </td>
                    <td style={{ padding: '11px 14px', color: C.muted }}>{p.competencia || '—'}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: s.cor }}>{fmtData(p.vencimento)}</td>
                    <td style={{ padding: '11px 14px' }}><SituacaoBadge situacao={p.situacao} /></td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.situacao !== 'Entregue' && (
                          <button onClick={() => marcarEntregue(p.id)} style={{ padding: '5px 10px', background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✅</button>
                        )}
                        <button onClick={() => setForm({ ...p })} style={{ padding: '5px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✏️</button>
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

      {/* MODAL FORM */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg, #0B1F4D, #163B8C)', borderRadius: '16px 16px 0 0', padding: '20px 28px', color: '#fff' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{form.id ? '✏️ Editar prazo' : '+ Novo prazo fiscal'}</div>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Cliente *</label>
                  <select value={form.cliente_id} onChange={e => {
                    const cli = clientes.find(c => c.id === e.target.value)
                    setForm(f => ({ ...f, cliente_id: e.target.value, regime: cli?.regime || f.regime }))
                  }} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                    <option value="">— Selecione —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Obrigação *</label>
                  <input value={form.obrigacao || ''} onChange={e => setForm(f => ({ ...f, obrigacao: e.target.value }))} placeholder="Ex: PGDAS-D, ECF..."
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} list="obrigacoes-list" />
                  <datalist id="obrigacoes-list">
                    {[...new Set(Object.values(OBRIGACOES).flat().map(o => o.nome))].map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Regime</label>
                  <select value={form.regime} onChange={e => setForm(f => ({ ...f, regime: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                    <option>Simples Nacional</option>
                    <option>Lucro Presumido</option>
                    <option>Lucro Real</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Competência</label>
                  {inp(form.competencia, 'competencia', '', 'month')}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Vencimento *</label>
                  {inp(form.vencimento, 'vencimento', '', 'date')}
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Situação</label>
                  <select value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                    {Object.keys(SITUACAO_STYLE).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Observações</label>
                <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2}
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setForm(null)} style={{ padding: '12px 24px', background: '#f8fafc', color: C.muted, border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={salvarPrazo} disabled={salvando} style={{ flex: 1, padding: '12px 0', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : '💾 Salvar prazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── GERADOR AUTOMÁTICO ───────────────────────────────────────────────────────
function GerarAuto({ clientes, onGerar, gerando }) {
  const [clienteId, setClienteId] = useState('')
  const [mes,       setMes]       = useState(new Date().getMonth())
  const [ano,       setAno]       = useState(new Date().getFullYear())

  const cli = clientes.find(c => c.id === clienteId)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Cliente</label>
        <select value={clienteId} onChange={e => setClienteId(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
          <option value="">— Selecione —</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Mês</label>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
          {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Ano</label>
        <select value={ano} onChange={e => setAno(parseInt(e.target.value))}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
          {[2024,2025,2026,2027].map(a => <option key={a}>{a}</option>)}
        </select>
      </div>
      <button onClick={() => { if(!clienteId){alert('Selecione um cliente.');return} onGerar(clienteId, cli?.regime || 'Simples Nacional', mes, ano) }}
        disabled={gerando || !clienteId}
        style={{ padding: '10px 18px', background: clienteId ? '#0B1F4D' : '#e2e8f0', color: clienteId ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: clienteId ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
        {gerando ? '⏳ Gerando...' : '⚡ Gerar'}
      </button>
    </div>
  )
}