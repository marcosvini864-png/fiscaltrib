/**
 * DadosComplementares.jsx — e-FiscalTribe
 * Aba de dados complementares do cliente para o Motor de Inteligência Tributária.
 * Versão: 1.0 — 2026-08-02
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function parseMoeda(str) {
  return parseFloat(String(str || '0').replace(/\./g, '').replace(',', '.')) || 0
}

function aplicarMascara(valor) {
  const nums = String(valor).replace(/\D/g, '')
  if (!nums) return ''
  return (Number(nums) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const C = {
  navy:   '#0B1F4D',
  border: '#E2E8F0',
  text:   '#1E293B',
  muted:  '#64748B',
  white:  '#FFFFFF',
  verde:  '#16a34a',
  orange: '#ea580c',
  red:    '#dc2626',
  bg:     '#F8FAFC',
}

// ─────────────────────────────────────────────────────────────
// CAMPOS POR REGIME
// ─────────────────────────────────────────────────────────────

const CAMPOS_SIMPLES = [
  { key: 'folha_mensal',       label: 'Folha de pagamento mensal',        tipo: 'moeda',   obrigatorio: true,  modulos: ['FATOR_R','INSS'],        dica: 'Inclua pró-labore + salários + encargos' },
  { key: 'rbt12',              label: 'Receita bruta últimos 12 meses',   tipo: 'moeda',   obrigatorio: true,  modulos: ['FATOR_R','MONOFASICOS'],  dica: 'RBT12 utilizado para cálculo do Fator R e alíquota do Simples' },
  { key: 'faturamento_mensal', label: 'Faturamento mensal médio',         tipo: 'moeda',   obrigatorio: false, modulos: ['CAPAG'],                  dica: 'Média dos últimos 12 meses' },
  { key: 'anexo_simples',      label: 'Anexo do Simples Nacional',        tipo: 'select',  obrigatorio: true,  modulos: ['FATOR_R'],
    opcoes: [
      { value: 'I',   label: 'Anexo I — Comércio' },
      { value: 'III', label: 'Anexo III — Serviços (Fator R ≥ 28%)' },
      { value: 'V',   label: 'Anexo V — Serviços (Fator R < 28%)' },
    ]
  },
  { key: 'possui_prolabore',   label: 'Sócios recebem pró-labore?',       tipo: 'boolean', obrigatorio: false, modulos: ['FATOR_R'],                dica: 'Pró-labore compõe a folha para fins do Fator R' },
  { key: 'valor_prolabore',    label: 'Valor total do pró-labore mensal', tipo: 'moeda',   obrigatorio: false, modulos: ['FATOR_R'],                dica: 'Soma dos pró-labores de todos os sócios', dependeDe: { key: 'possui_prolabore', valor: true } },
]

const CAMPOS_LP = [
  { key: 'faturamento_anual',  label: 'Receita bruta anual',              tipo: 'moeda',   obrigatorio: true,  modulos: ['IRPJ_CSLL','CAPAG'],      dica: 'Faturamento total do último exercício' },
  { key: 'folha_mensal',       label: 'Folha de pagamento mensal',        tipo: 'moeda',   obrigatorio: false, modulos: ['INSS'],                   dica: 'Inclua todos os vínculos empregatícios' },
  { key: 'selic_recebida',     label: 'SELIC recebida em restituições',   tipo: 'moeda',   obrigatorio: false, modulos: ['IRPJ_CSLL'],              dica: 'Juros SELIC recebidos em restituições tributárias nos últimos 5 anos — Tema 962 STF' },
  { key: 'irpj_csll_pago',     label: 'IRPJ/CSLL pago no último ano',    tipo: 'moeda',   obrigatorio: false, modulos: ['IRPJ_CSLL'],              dica: 'Total de IRPJ + CSLL recolhido no exercício' },
  { key: 'faturamento_mensal', label: 'Faturamento mensal médio',         tipo: 'moeda',   obrigatorio: false, modulos: ['CAPAG'],                  dica: 'Para cálculo de CAPAG e transação tributária' },
]

const CAMPOS_LR = [
  { key: 'faturamento_anual',  label: 'Receita bruta anual',              tipo: 'moeda',   obrigatorio: true,  modulos: ['IRPJ_CSLL','CAPAG'],      dica: 'Faturamento total do último exercício' },
  { key: 'lucro_contabil',     label: 'Lucro contábil do exercício',      tipo: 'moeda',   obrigatorio: true,  modulos: ['IRPJ_CSLL'],              dica: 'Lucro antes do IRPJ e CSLL' },
  { key: 'patrimonio_liquido', label: 'Patrimônio líquido',               tipo: 'moeda',   obrigatorio: true,  modulos: ['IRPJ_CSLL'],              dica: 'Base para cálculo dos Juros sobre Capital Próprio (JCP)' },
  { key: 'prejuizo_acumulado', label: 'Prejuízo fiscal acumulado (LALUR)',tipo: 'moeda',   obrigatorio: false, modulos: ['IRPJ_CSLL'],              dica: 'Saldo de prejuízo fiscal a compensar (30% por período)' },
  { key: 'folha_mensal',       label: 'Folha de pagamento mensal',        tipo: 'moeda',   obrigatorio: false, modulos: ['INSS'],                   dica: 'Inclua todos os vínculos empregatícios' },
  { key: 'selic_recebida',     label: 'SELIC recebida em restituições',   tipo: 'moeda',   obrigatorio: false, modulos: ['IRPJ_CSLL'],              dica: 'Juros SELIC recebidos em restituições tributárias — Tema 962 STF' },
  { key: 'irpj_csll_pago',     label: 'IRPJ/CSLL pago no último ano',    tipo: 'moeda',   obrigatorio: false, modulos: ['IRPJ_CSLL'],              dica: 'Total de IRPJ + CSLL recolhido no exercício' },
  { key: 'faturamento_mensal', label: 'Faturamento mensal médio',         tipo: 'moeda',   obrigatorio: false, modulos: ['CAPAG'],                  dica: 'Para cálculo de CAPAG e transação tributária' },
]

const CAMPOS_DIVIDA = [
  { key: 'possui_divida_ativa',     label: 'Possui dívida ativa inscrita?',     tipo: 'boolean', obrigatorio: true,  modulos: ['DIVIDA_ATIVA'],    dica: 'Dívidas inscritas na PGFN / Dívida Ativa da União' },
  { key: 'valor_total_divida',      label: 'Valor total da dívida (consolidado)',tipo: 'moeda',  obrigatorio: false, modulos: ['CAPAG','TRANSACAO'], dica: 'Valor total consolidado de todas as CDAs',          dependeDe: { key: 'possui_divida_ativa', valor: true } },
  { key: 'valor_principal',         label: 'Valor do principal',                tipo: 'moeda',  obrigatorio: false, modulos: ['TRANSACAO'],         dica: 'Valor original sem multas e juros',                 dependeDe: { key: 'possui_divida_ativa', valor: true } },
  { key: 'valor_multas',            label: 'Valor das multas',                  tipo: 'moeda',  obrigatorio: false, modulos: ['TRANSACAO'],         dica: 'Total de multas de mora e de ofício',               dependeDe: { key: 'possui_divida_ativa', valor: true } },
  { key: 'valor_juros',             label: 'Valor dos juros',                   tipo: 'moeda',  obrigatorio: false, modulos: ['TRANSACAO'],         dica: 'Total de juros SELIC acumulados',                   dependeDe: { key: 'possui_divida_ativa', valor: true } },
  { key: 'capag',                   label: 'CAPAG (se conhecido)',               tipo: 'select', obrigatorio: false, modulos: ['CAPAG','TRANSACAO'],
    opcoes: [
      { value: 'A', label: 'A — Boa capacidade' },
      { value: 'B', label: 'B — Capacidade moderada' },
      { value: 'C', label: 'C — Capacidade reduzida' },
      { value: 'D', label: 'D — Sem capacidade' },
      { value: '',  label: 'Não sei — calcular automaticamente' },
    ],
    dependeDe: { key: 'possui_divida_ativa', valor: true }
  },
  { key: 'bens_penhoraveis',        label: 'Valor de bens penhoráveis',         tipo: 'moeda',  obrigatorio: false, modulos: ['CAPAG'],             dica: 'Imóveis, veículos, contas bancárias bloqueáveis',   dependeDe: { key: 'possui_divida_ativa', valor: true } },
  { key: 'faturamento_mensal_pgfn', label: 'Faturamento mensal (para PGFN)',    tipo: 'moeda',  obrigatorio: false, modulos: ['CAPAG','TRANSACAO'], dica: 'Usado pela PGFN para calcular o CAPAG',             dependeDe: { key: 'possui_divida_ativa', valor: true } },
  { key: 'em_recuperacao_judicial', label: 'Está em recuperação judicial?',     tipo: 'boolean',obrigatorio: false, modulos: ['CAPAG'],             dica: 'Impacta o CAPAG e as condições de transação',       dependeDe: { key: 'possui_divida_ativa', valor: true } },
]

const CAMPOS_INSS = [
  { key: 'possui_folha_inss', label: 'Possui dados de folha para análise de INSS?', tipo: 'boolean', obrigatorio: false, modulos: ['INSS'], dica: 'Permite identificar INSS recolhido indevidamente sobre verbas indenizatórias' },
]

const VERBAS_INSS = [
  { id: 'AVISO_PREVIO_IND',   nome: 'Aviso Prévio Indenizado',           base: 'RE 565.160 STF' },
  { id: 'FERIAS_PROP',        nome: 'Férias Proporcionais Indenizadas',  base: 'Súmula 310 STJ' },
  { id: 'TERCO_FERIAS',       nome: 'Terço Constitucional de Férias',    base: 'RE 1.072.485 STF' },
  { id: 'PLR',                nome: 'PLR',                               base: 'RE 593.068 STF' },
  { id: 'AUXILIO_ALIMENTACAO',nome: 'Auxílio-Alimentação (PAT)',          base: 'Lei 6.321/1976' },
  { id: 'AUXILIO_TRANSPORTE', nome: 'Vale-Transporte',                   base: 'Lei 7.418/1985' },
  { id: 'INDENIZACAO_DEMISSAO',nome: 'Indenização por Demissão',         base: 'Art. 28 §9º Lei 8.212/1991' },
]

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function DadosComplementares({ clienteId, cliente, onDadosSalvos }) {
  const regime = cliente?.regime || 'Simples Nacional'

  const [dados, setDados]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo]       = useState(false)
  const [erro, setErro]         = useState('')

  // CDAs
  const [cdas, setCdas]         = useState([])
  const [novaCDA, setNovaCDA]   = useState({ numero: '', tributo: '', valor: '', dataInscricao: '', dataCitacao: '', dataUltimaMovimentacao: '', redirecionado: false })

  // Folha INSS
  const [folhaINSS, setFolhaINSS] = useState([])
  const [novaFolha, setNovaFolha] = useState({ competencia: '', ...Object.fromEntries(VERBAS_INSS.map(v => [v.id, ''])) })

  // ── Carrega dados salvos ────────────────────────────────────
  useEffect(() => {
    if (clienteId) carregarDados()
  }, [clienteId])

  async function carregarDados() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes_dados_complementares')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    if (data) {
      setDados(data)
      setCdas(data.cdas || [])
      setFolhaINSS(data.folha_inss || [])
    } else {
      setDados({
        folha_mensal: 0, rbt12: 0, faturamento_mensal: 0, faturamento_anual: 0,
        lucro_contabil: 0, patrimonio_liquido: 0, prejuizo_acumulado: 0,
        selic_recebida: 0, irpj_csll_pago: 0, anexo_simples: 'I',
        possui_prolabore: false, valor_prolabore: 0,
        possui_divida_ativa: false, valor_total_divida: 0, valor_principal: 0,
        valor_multas: 0, valor_juros: 0, capag: 'C', bens_penhoraveis: 0,
        em_recuperacao_judicial: false, faturamento_mensal_pgfn: 0,
        cdas: [], possui_folha_inss: false, folha_inss: [],
      })
    }
    setLoading(false)
  }

  function setField(key, value) {
    setDados(prev => ({ ...prev, [key]: value }))
    setSalvo(false)
  }

  // ── Salvar ─────────────────────────────────────────────────
  async function salvar() {
    setSalvando(true); setErro(''); setSalvo(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        ...dados,
        cliente_id:   clienteId,
        usuario_id:   user.id,
        cdas,
        folha_inss:   folhaINSS,
        atualizado_em: new Date().toISOString(),
      }
      delete payload.id
      delete payload.preenchido_em
      delete payload.created_at

      const { error } = await supabase
        .from('clientes_dados_complementares')
        .upsert(payload, { onConflict: 'cliente_id' })

      if (error) throw error
      setSalvo(true)
      if (onDadosSalvos) onDadosSalvos({ ...payload, cdas, folha_inss: folhaINSS })
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  // ── CDAs ───────────────────────────────────────────────────
  function adicionarCDA() {
    if (!novaCDA.numero || !novaCDA.valor) return
    setCdas(prev => [...prev, {
      ...novaCDA,
      valor: parseMoeda(novaCDA.valor),
      valorTotal: parseMoeda(novaCDA.valor),
    }])
    setNovaCDA({ numero: '', tributo: '', valor: '', dataInscricao: '', dataCitacao: '', dataUltimaMovimentacao: '', redirecionado: false })
    setSalvo(false)
  }

  function removerCDA(idx) {
    setCdas(prev => prev.filter((_, i) => i !== idx))
    setSalvo(false)
  }

  // ── Folha INSS ─────────────────────────────────────────────
  function adicionarFolhaINSS() {
    if (!novaFolha.competencia) return
    const verbas = {}
    VERBAS_INSS.forEach(v => { verbas[v.id] = parseMoeda(novaFolha[v.id] || '0') })
    setFolhaINSS(prev => [...prev, { competencia: novaFolha.competencia, verbas }])
    setNovaFolha({ competencia: '', ...Object.fromEntries(VERBAS_INSS.map(v => [v.id, ''])) })
    setSalvo(false)
  }

  function removerFolhaINSS(idx) {
    setFolhaINSS(prev => prev.filter((_, i) => i !== idx))
    setSalvo(false)
  }

  // ── Status dos módulos ─────────────────────────────────────
  function statusModulo(modulo) {
    if (!dados) return { ok: false, label: '—' }
    switch (modulo) {
      case 'FATOR_R':
        if (regime !== 'Simples Nacional') return { ok: null, label: 'N/A' }
        return dados.folha_mensal > 0 && dados.rbt12 > 0
          ? { ok: true,  label: '✅ Pronto' }
          : { ok: false, label: '⚠️ Faltam dados' }
      case 'INSS':
        return folhaINSS.length > 0
          ? { ok: true,  label: '✅ Pronto' }
          : { ok: false, label: '⚠️ Faltam dados' }
      case 'IRPJ_CSLL':
        if (regime === 'Simples Nacional') return { ok: null, label: 'N/A' }
        return dados.faturamento_anual > 0
          ? { ok: true,  label: '✅ Pronto' }
          : { ok: false, label: '⚠️ Faltam dados' }
      case 'CAPAG':
        return dados.possui_divida_ativa && dados.valor_total_divida > 0
          ? { ok: true,  label: '✅ Pronto' }
          : dados.possui_divida_ativa
          ? { ok: false, label: '⚠️ Faltam dados' }
          : { ok: null,  label: 'Sem dívida ativa' }
      case 'TRANSACAO':
        return dados.possui_divida_ativa && dados.valor_total_divida > 0
          ? { ok: true,  label: '✅ Pronto' }
          : { ok: null,  label: 'Sem dívida ativa' }
      case 'PRESCRICAO':
      case 'DECADENCIA':
        return cdas.length > 0
          ? { ok: true,  label: '✅ Pronto' }
          : dados.possui_divida_ativa
          ? { ok: false, label: '⚠️ Cadastrar CDAs' }
          : { ok: null,  label: 'Sem dívida ativa' }
      default:
        return { ok: true, label: '✅' }
    }
  }

  // ── Helpers de renderização ────────────────────────────────
  function renderCampo(campo) {
    if (!dados) return null

    // Verifica dependência
    if (campo.dependeDe) {
      const dep = dados[campo.dependeDe.key]
      if (dep !== campo.dependeDe.valor) return null
    }

    const val = dados[campo.key]

    const inputStyle = {
      padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6,
      fontSize: 13, width: '100%', boxSizing: 'border-box', color: C.text,
    }

    return (
      <tr key={campo.key} style={{ borderBottom: `1px solid ${C.border}` }}>
        {/* Campo */}
        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: C.text, width: '35%', verticalAlign: 'middle' }}>
          {campo.label}
          {campo.obrigatorio && <span style={{ color: C.red, marginLeft: 4 }}>*</span>}
        </td>

        {/* Input */}
        <td style={{ padding: '8px 12px', width: '30%' }}>
          {campo.tipo === 'moeda' && (
            <input
              value={val > 0 ? aplicarMascara(String(Math.round(val * 100))) : ''}
              onChange={e => setField(campo.key, parseMoeda(e.target.value))}
              placeholder="0,00"
              inputMode="numeric"
              style={inputStyle}
            />
          )}
          {campo.tipo === 'boolean' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(opt => (
                <label key={String(opt.v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '6px 12px', border: `1.5px solid ${val === opt.v ? C.navy : C.border}`, borderRadius: 6, background: val === opt.v ? '#eff6ff' : C.white, fontWeight: val === opt.v ? 700 : 400, color: val === opt.v ? C.navy : C.muted }}>
                  <input type="radio" checked={val === opt.v} onChange={() => setField(campo.key, opt.v)} style={{ display: 'none' }} />
                  {opt.l}
                </label>
              ))}
            </div>
          )}
          {campo.tipo === 'select' && (
            <select value={val || ''} onChange={e => setField(campo.key, e.target.value)} style={inputStyle}>
              {campo.opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </td>

        {/* Dica */}
        <td style={{ padding: '8px 12px', fontSize: 11, color: C.muted, width: '20%', verticalAlign: 'middle' }}>
          {campo.dica}
        </td>

        {/* Módulos */}
        <td style={{ padding: '8px 12px', width: '15%', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {campo.modulos.map(m => {
              const st = statusModulo(m)
              return (
                <span key={m} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: st.ok === true ? '#f0fdf4' : st.ok === false ? '#fff7ed' : '#f1f5f9', color: st.ok === true ? C.verde : st.ok === false ? C.orange : C.muted, border: `1px solid ${st.ok === true ? '#86efac' : st.ok === false ? '#fed7aa' : C.border}` }}>
                  {m}
                </span>
              )
            })}
          </div>
        </td>
      </tr>
    )
  }

  function Secao({ titulo, campos, icone, cor }) {
    return (
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ background: cor + '10', borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icone}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: cor }}>{titulo}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 1 }}>Campo</th>
              <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 1 }}>Valor</th>
              <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 1 }}>Observação</th>
              <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 1 }}>Módulos</th>
            </tr>
          </thead>
          <tbody>
            {campos.map(c => renderCampo(c))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Status geral dos módulos ───────────────────────────────
  const MODULOS_STATUS = [
    { id: 'FATOR_R',    nome: 'Fator R',             regime: ['Simples Nacional'] },
    { id: 'INSS',       nome: 'INSS Indenizatórias', regime: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
    { id: 'IRPJ_CSLL',  nome: 'IRPJ/CSLL',           regime: ['Lucro Presumido','Lucro Real'] },
    { id: 'CAPAG',      nome: 'CAPAG',                regime: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
    { id: 'TRANSACAO',  nome: 'Transação',            regime: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
    { id: 'PRESCRICAO', nome: 'Prescrição',           regime: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
    { id: 'DECADENCIA', nome: 'Decadência',           regime: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
  ]

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Carregando dados complementares...
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>

      {/* Header */}
<div
  style={{
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '14px 18px',
    marginBottom: 16,
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      flexWrap: 'wrap',
    }}
  >
    <div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: C.text,
          marginBottom: 4,
        }}
      >
        Dados Complementares
      </div>

      <div
        style={{
          fontSize: 12,
          color: C.muted,
        }}
      >
        Informações adicionais utilizadas automaticamente pelos módulos de análise tributária.
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          background: '#F1F5F9',
          border: `1px solid ${C.border}`,
          fontSize: 11,
          fontWeight: 600,
          color: C.text,
        }}
      >
        {cliente?.razao_social || 'Cliente'}
      </span>

      <span
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          background: '#F8FAFC',
          border: `1px solid ${C.border}`,
          fontSize: 11,
          fontWeight: 600,
          color: C.muted,
        }}
      >
        {regime}
      </span>
    </div>
  </div>
</div>

      {/* Status dos módulos */}
<div
  style={{
    background: C.white,
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    padding: '10px 14px',
    marginBottom: 16,
  }}
>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}
  >
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.muted,
        marginRight: 4,
      }}
    >
      Status dos módulos
    </span>

    {MODULOS_STATUS
      .filter(m => m.regime.includes(regime))
      .map(m => {
        const st = statusModulo(m.id)

        return (
          <div
            key={m.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              borderRadius: 6,
              border: `1px solid ${
                st.ok === true
                  ? '#86efac'
                  : st.ok === false
                    ? '#fed7aa'
                    : C.border
              }`,
              background:
                st.ok === true
                  ? '#f0fdf4'
                  : st.ok === false
                    ? '#fff7ed'
                    : '#F8FAFC',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color:
                  st.ok === true
                    ? C.verde
                    : st.ok === false
                      ? C.orange
                      : C.muted,
              }}
            >
              {m.nome}
            </span>

            <span
              style={{
                fontSize: 10,
                color:
                  st.ok === true
                    ? C.verde
                    : st.ok === false
                      ? C.orange
                      : C.muted,
              }}
            >
              {st.label}
            </span>
          </div>
        )
      })}
  </div>
</div>

      {/* Seção por regime */}
      {regime === 'Simples Nacional' && (
        <Secao titulo="Simples Nacional" icone="🟩" cor="#16a34a" campos={CAMPOS_SIMPLES} />
      )}
      {regime === 'Lucro Presumido' && (
        <Secao titulo="Lucro Presumido" icone="🟦" cor="#2563eb" campos={CAMPOS_LP} />
      )}
      {regime === 'Lucro Real' && (
        <Secao titulo="Lucro Real" icone="🟪" cor="#7c3aed" campos={CAMPOS_LR} />
      )}

      {/* Dívida Ativa */}
      <Secao titulo="Dívida Ativa" icone="⚠️" cor="#dc2626" campos={CAMPOS_DIVIDA} />

      {/* CDAs */}
      {dados?.possui_divida_ativa && (
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ background: '#fef2f2', borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.red }}>CDAs — Certidões de Dívida Ativa</span>
            </div>
            <span style={{ fontSize: 12, color: C.muted }}>Usadas nos módulos PRESCRICAO e DECADENCIA</span>
          </div>

          {/* Lista de CDAs */}
          {cdas.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Número CDA','Tributo','Valor','Data Inscrição','Data Citação','Última Movimentação','Redirecionado',''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cdas.map((cda, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: C.navy }}>{cda.numero}</td>
                    <td style={{ padding: '8px 10px' }}>{cda.tributo || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: C.red }}>{fmtR(cda.valor)}</td>
                    <td style={{ padding: '8px 10px', color: C.muted }}>{cda.dataInscricao || '—'}</td>
                    <td style={{ padding: '8px 10px', color: C.muted }}>{cda.dataCitacao || '—'}</td>
                    <td style={{ padding: '8px 10px', color: C.muted }}>{cda.dataUltimaMovimentacao || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{cda.redirecionado ? '✅ Sim' : 'Não'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => removerCDA(idx)} style={{ padding: '3px 8px', background: '#fef2f2', color: C.red, border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Remover</button>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '8px 10px', fontSize: 12 }}>Total ({cdas.length} CDAs)</td>
                  <td style={{ padding: '8px 10px', color: C.red, fontWeight: 800 }}>{fmtR(cdas.reduce((s, c) => s + (c.valor || 0), 0))}</td>
                  <td colSpan={5} />
                </tr>
              </tbody>
            </table>
          )}

          {/* Formulário nova CDA */}
          <div style={{ padding: '14px 16px', background: '#fafafa', borderTop: cdas.length > 0 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>+ Adicionar CDA</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 10 }}>
              {[
                { key: 'numero',                 label: 'Número da CDA',          placeholder: 'Ex: 13.775.238-5' },
                { key: 'tributo',                label: 'Tributo',                placeholder: 'Ex: IRPJ, INSS, PIS' },
                { key: 'valor',                  label: 'Valor total (R$)',        placeholder: '0,00', moeda: true },
                { key: 'dataInscricao',          label: 'Data de inscrição',       placeholder: '', tipo: 'date' },
                { key: 'dataCitacao',            label: 'Data da citação',         placeholder: '', tipo: 'date' },
                { key: 'dataUltimaMovimentacao', label: 'Última movimentação',     placeholder: '', tipo: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 3 }}>{f.label}</div>
                  <input
                    type={f.tipo || 'text'}
                    value={novaCDA[f.key] || ''}
                    onChange={e => setNovaCDA(prev => ({ ...prev, [f.key]: f.moeda ? aplicarMascara(e.target.value.replace(/\D/g, '')) : e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={novaCDA.redirecionado} onChange={e => setNovaCDA(prev => ({ ...prev, redirecionado: e.target.checked }))} />
                Há redirecionamento para sócios
              </label>
            </div>
            <button onClick={adicionarCDA} disabled={!novaCDA.numero || !novaCDA.valor}
              style={{ padding: '8px 20px', background: !novaCDA.numero || !novaCDA.valor ? C.border : C.red, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: !novaCDA.numero || !novaCDA.valor ? 'not-allowed' : 'pointer' }}>
              + Adicionar CDA
            </button>
          </div>
        </div>
      )}

      {/* INSS — Verbas indenizatórias */}
      <Secao titulo="INSS — Verbas Indenizatórias" icone="👥" cor="#7c3aed" campos={CAMPOS_INSS} />

      {dados?.possui_folha_inss && (
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ background: '#f5f3ff', borderBottom: `1px solid ${C.border}`, padding: '12px 16px' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>📊 Folha de Pagamento — Verbas Indenizatórias por Competência</span>
          </div>

          {/* Lista de folhas */}
          {folhaINSS.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Competência</th>
                  {VERBAS_INSS.map(v => (
                    <th key={v.id} style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: C.muted, textAlign: 'right', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{v.nome.split(' ').slice(0,2).join(' ')}</th>
                  ))}
                  <th style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: C.muted, textAlign: 'center', borderBottom: `1px solid ${C.border}` }}></th>
                </tr>
              </thead>
              <tbody>
                {folhaINSS.map((f, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600, color: C.navy }}>{f.competencia}</td>
                    {VERBAS_INSS.map(v => (
                      <td key={v.id} style={{ padding: '7px 6px', textAlign: 'right', color: (f.verbas[v.id] || 0) > 0 ? '#7c3aed' : C.muted }}>
                        {(f.verbas[v.id] || 0) > 0 ? fmtR(f.verbas[v.id]) : '—'}
                      </td>
                    ))}
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      <button onClick={() => removerFolhaINSS(idx)} style={{ padding: '2px 8px', background: '#fef2f2', color: C.red, border: '1px solid #fecaca', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Formulário nova competência */}
          <div style={{ padding: '14px 16px', background: '#fafafa', borderTop: folhaINSS.length > 0 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>+ Adicionar competência</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 3 }}>Competência (AAAA-MM)</div>
                <input type="month" value={novaFolha.competencia}
                  onChange={e => setNovaFolha(prev => ({ ...prev, competencia: e.target.value }))}
                  style={{ padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
              </div>
              {VERBAS_INSS.map(v => (
                <div key={v.id}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 3 }}>{v.nome}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{v.base}</div>
                  <input
                    value={novaFolha[v.id] || ''}
                    onChange={e => setNovaFolha(prev => ({ ...prev, [v.id]: aplicarMascara(e.target.value.replace(/\D/g, '')) }))}
                    placeholder="0,00"
                    inputMode="numeric"
                    style={{ padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <button onClick={adicionarFolhaINSS} disabled={!novaFolha.competencia}
              style={{ padding: '8px 20px', background: !novaFolha.competencia ? C.border : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: !novaFolha.competencia ? 'not-allowed' : 'pointer' }}>
              + Adicionar competência
            </button>
          </div>
        </div>
      )}

      {/* Botão salvar */}
      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 12 }}>
          ⚠️ {erro}
        </div>
      )}

      <div
  style={{
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  }}
>
  <button
    onClick={salvar}
    disabled={salvando}
    style={{
      padding: '9px 18px',
      background: salvando ? C.border : C.navy,
      color: salvando ? C.text : C.white,
      border: 'none',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 700,
      cursor: salvando ? 'not-allowed' : 'pointer',
      minWidth: 210,
    }}
  >
    {salvando
      ? 'Salvando...'
      : '💾 Salvar Dados Complementares'}
  </button>

  {salvo && (
    <div
      style={{
        padding: '8px 12px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        color: C.verde,
      }}
    >
      ✓ Dados salvos
    </div>
  )}
</div>
          {erro && (
  <div
    style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      padding: '10px 14px',
      color: C.red,
      fontSize: 13,
      marginBottom: 12,
    }}
  >
    ⚠️ {erro}
  </div>
)}

      <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
        💡 Esses dados são usados automaticamente pelo Motor de Inteligência Tributária ao rodar o diagnóstico. Atualize sempre que houver mudanças nos dados financeiros do cliente.
      </div>

    </div>
  )
}