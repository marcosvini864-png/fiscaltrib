/**
 * AbaPGDAS.jsx - e-FiscalTribe®
 * Segregacao no PGDAS-D — Motor do Simples Nacional
 * Versao 2.1 - 07/08/2026
 * AnalisadorIA plugado no topo + botao grafite
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import AnalisadorIA from '../../AnalisadorIA'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleString('pt-BR') : '-'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#334155',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#0F172A', thBg: '#4B5563', thText: '#FFFFFF',
  ghost: '#F1F5F9', ghostText: '#64748B',
}

function Badge({ tipo }) {
  const map = {
    original:     { label: 'Original',      bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    retificadora: { label: 'Retificadora',  bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
    transmitida:  { label: 'Transmitida',   bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    pendente:     { label: 'Pendente',      bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    concluido:    { label: 'Concluido',     bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    erro:         { label: 'Erro',          bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  }
  const b = map[tipo] || map.pendente
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {b.label}
    </span>
  )
}

const FORM_VAZIO = {
  num_declaracao: '', num_recibo: '', autenticacao: '',
  periodo_apuracao: '', tipo_declaracao: 'Original',
  data_transmissao: '',
  rpa: '', rbt12: '', rba: '', rbaa: '',
  receita_revenda: '', receita_industrializacao: '', receita_servicos: '',
  receita_monofasica: '', receita_st: '', receita_imune: '',
  fator_r: '',
  das_total: '',
  irpj: '', csll: '', cofins: '', pis: '', inss_cpp: '', icms: '', ipi: '', iss: '',
  irpj_susp: '', csll_susp: '', cofins_susp: '', pis_susp: '', inss_susp: '', icms_susp: '', ipi_susp: '', iss_susp: '',
  observacoes: '',
}

const LINHAS_GHOST = Array(3).fill(null).map((_, i) => ({
  id: `ghost-${i}`,
  periodo_apuracao: 'MM/AAAA',
  tipo_declaracao: 'Original',
  rpa: 0, rbt12: 0, das_total: 0,
  receita_monofasica: 0,
  status: 'pendente',
  ghost: true,
}))

function InputMoeda({ label, value, onChange, placeholder = 'R$ 0,00', disabled }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{label}</div>
      <input
        value={value ? parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
        onChange={e => { const raw = e.target.value.replace(/\D/g, ''); onChange((parseInt(raw || '0') / 100).toFixed(2)) }}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: S.text, background: disabled ? S.bg : S.white }}
      />
    </div>
  )
}

function InputTexto({ label, value, onChange, placeholder, disabled }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{label}</div>
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: S.text, background: disabled ? S.bg : S.white }}
      />
    </div>
  )
}

export default function AbaPGDAS({ cliente, regime }) {
  const [aba, setAba] = useState('lancamento')
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagAberto, setDiagAberto] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [importando, setImportando] = useState(false)
  const inputImportRef = useRef(null)

  useEffect(() => { if (cliente?.id) carregarHistorico() }, [cliente?.id])

  async function importarArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setImportando(true)
    try {
      let textoExtraido = ''
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const { data: { session } } = await supabase.auth.getSession()
        const resp = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            model: 'gemini-3.5-flash',
            messages: [{ role: 'user', content: [
              { type: 'inline_data', inline_data: { mime_type: 'application/pdf', data: base64 } },
              { type: 'text', text: `Extraia os dados do PGDAS-D e retorne JSON com os campos: periodo_apuracao (MM/AAAA), tipo_declaracao, num_declaracao, num_recibo, autenticacao, data_transmissao, rpa, rbt12, rba, rbaa, receita_revenda, receita_industrializacao, receita_servicos, receita_monofasica, receita_st, receita_imune, fator_r, das_total, irpj, csll, cofins, pis, inss_cpp, icms, ipi, iss, irpj_susp, csll_susp, cofins_susp, pis_susp, inss_susp, icms_susp, ipi_susp, iss_susp. Valores numericos sem R$ sem pontos de milhar use ponto decimal. Retorne apenas o JSON.` }
            ]}]
          })
        })
        const data = await resp.json()
        textoExtraido = data?.resposta ?? data?.resultado ?? data?.content ?? ''
      } else {
        textoExtraido = await file.text()
      }
      const jsonMatch = textoExtraido.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setForm(prev => ({
          ...prev,
          periodo_apuracao:         parsed.periodo_apuracao?.toString()        || prev.periodo_apuracao,
          tipo_declaracao:          parsed.tipo_declaracao                      || prev.tipo_declaracao,
          num_declaracao:           parsed.num_declaracao?.toString()           || prev.num_declaracao,
          num_recibo:               parsed.num_recibo?.toString()               || prev.num_recibo,
          autenticacao:             parsed.autenticacao?.toString()             || prev.autenticacao,
          data_transmissao:         parsed.data_transmissao?.toString()         || prev.data_transmissao,
          rpa:                      parsed.rpa?.toString()                      || prev.rpa,
          rbt12:                    parsed.rbt12?.toString()                    || prev.rbt12,
          rba:                      parsed.rba?.toString()                      || prev.rba,
          rbaa:                     parsed.rbaa?.toString()                     || prev.rbaa,
          receita_revenda:          parsed.receita_revenda?.toString()          || prev.receita_revenda,
          receita_industrializacao: parsed.receita_industrializacao?.toString() || prev.receita_industrializacao,
          receita_servicos:         parsed.receita_servicos?.toString()         || prev.receita_servicos,
          receita_monofasica:       parsed.receita_monofasica?.toString()       || prev.receita_monofasica,
          receita_st:               parsed.receita_st?.toString()               || prev.receita_st,
          receita_imune:            parsed.receita_imune?.toString()            || prev.receita_imune,
          fator_r:                  parsed.fator_r?.toString()                  || prev.fator_r,
          das_total:                parsed.das_total?.toString()                || prev.das_total,
          irpj:                     parsed.irpj?.toString()                     || prev.irpj,
          csll:                     parsed.csll?.toString()                     || prev.csll,
          cofins:                   parsed.cofins?.toString()                   || prev.cofins,
          pis:                      parsed.pis?.toString()                      || prev.pis,
          inss_cpp:                 parsed.inss_cpp?.toString()                 || prev.inss_cpp,
          icms:                     parsed.icms?.toString()                     || prev.icms,
          ipi:                      parsed.ipi?.toString()                      || prev.ipi,
          iss:                      parsed.iss?.toString()                      || prev.iss,
          irpj_susp:                parsed.irpj_susp?.toString()                || prev.irpj_susp,
          csll_susp:                parsed.csll_susp?.toString()                || prev.csll_susp,
          cofins_susp:              parsed.cofins_susp?.toString()              || prev.cofins_susp,
          pis_susp:                 parsed.pis_susp?.toString()                 || prev.pis_susp,
          inss_susp:                parsed.inss_susp?.toString()                || prev.inss_susp,
          icms_susp:                parsed.icms_susp?.toString()                || prev.icms_susp,
          ipi_susp:                 parsed.ipi_susp?.toString()                 || prev.ipi_susp,
          iss_susp:                 parsed.iss_susp?.toString()                 || prev.iss_susp,
        }))
        alert('✅ Dados extraidos! Revise os campos antes de salvar.')
      } else {
        alert('Nao foi possivel extrair automaticamente. Preencha manualmente.')
      }
    } catch (err) {
      alert('Erro ao importar: ' + err.message)
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const { data } = await supabase.from('diagnosticos_pgdas').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  function setF(campo, valor) { setForm(prev => ({ ...prev, [campo]: valor })) }

  const rpa          = parseFloat(form.rpa || 0)
  const receita_mono = parseFloat(form.receita_monofasica || 0)
  const receita_st   = parseFloat(form.receita_st || 0)
  const receita_imu  = parseFloat(form.receita_imune || 0)
  const das_total    = parseFloat(form.das_total || 0)
  const irpj         = parseFloat(form.irpj || 0)
  const csll         = parseFloat(form.csll || 0)
  const cofins       = parseFloat(form.cofins || 0)
  const pis          = parseFloat(form.pis || 0)
  const inss         = parseFloat(form.inss_cpp || 0)
  const icms         = parseFloat(form.icms || 0)
  const ipi          = parseFloat(form.ipi || 0)
  const iss          = parseFloat(form.iss || 0)
  const totalTributos   = irpj + csll + cofins + pis + inss + icms + ipi + iss
  const baseCorreta     = rpa - receita_mono - receita_st - receita_imu
  const pctMono         = rpa > 0 ? (receita_mono / rpa * 100) : 0
  const aliquotaEfetiva = rpa > 0 ? (das_total / rpa * 100) : 0
  const diferencaRecuperavel = Math.max(0, das_total - (baseCorreta * (aliquotaEfetiva / 100)))

  async function salvar() {
    if (!form.periodo_apuracao) return alert('Informe o periodo de apuracao')
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('diagnosticos_pgdas').insert([{
        usuario_id: user.id, cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '', cliente_cnpj: cliente.cnpj || '', regime,
        competencia: form.periodo_apuracao,
        num_declaracao: form.num_declaracao, num_recibo: form.num_recibo,
        autenticacao: form.autenticacao, tipo_declaracao: form.tipo_declaracao,
        data_transmissao: form.data_transmissao,
        receita_bruta_total: rpa, rbt12: parseFloat(form.rbt12||0),
        rba: parseFloat(form.rba||0), rbaa: parseFloat(form.rbaa||0),
        receita_revenda: parseFloat(form.receita_revenda||0),
        receita_industrializacao: parseFloat(form.receita_industrializacao||0),
        receita_servicos: parseFloat(form.receita_servicos||0),
        receita_monofasica: receita_mono, receita_st, receita_imune: receita_imu,
        fator_r: form.fator_r,
        das_recolhido: das_total,
        das_correto: baseCorreta * (aliquotaEfetiva / 100),
        diferenca_recuperavel: diferencaRecuperavel,
        pct_monofasica: pctMono,
        irpj, csll, cofins, pis, inss_cpp: inss, icms, ipi, iss,
        total_tributos: totalTributos,
        irpj_susp: parseFloat(form.irpj_susp||0), csll_susp: parseFloat(form.csll_susp||0),
        cofins_susp: parseFloat(form.cofins_susp||0), pis_susp: parseFloat(form.pis_susp||0),
        inss_susp: parseFloat(form.inss_susp||0), icms_susp: parseFloat(form.icms_susp||0),
        ipi_susp: parseFloat(form.ipi_susp||0), iss_susp: parseFloat(form.iss_susp||0),
        observacoes: form.observacoes,
        credito_estimado: diferencaRecuperavel,
        status: 'concluido',
        created_at: new Date().toISOString(),
      }])
      if (error) throw error
      await carregarHistorico()
      setForm(FORM_VAZIO); setDiagAberto(null)
      alert('PGDAS-D salvo com sucesso!')
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSalvando(false) }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este PGDAS-D?')) return
    await supabase.from('diagnosticos_pgdas').delete().eq('id', id)
    if (diagAberto?.id === id) { setDiagAberto(null); setForm(FORM_VAZIO) }
    await carregarHistorico()
  }

  function abrirDiagnostico(diag) {
    setDiagAberto(diag)
    setForm({
      num_declaracao: diag.num_declaracao || '', num_recibo: diag.num_recibo || '',
      autenticacao: diag.autenticacao || '', periodo_apuracao: diag.competencia || '',
      tipo_declaracao: diag.tipo_declaracao || 'Original', data_transmissao: diag.data_transmissao || '',
      rpa: diag.receita_bruta_total?.toString() || '', rbt12: diag.rbt12?.toString() || '',
      rba: diag.rba?.toString() || '', rbaa: diag.rbaa?.toString() || '',
      receita_revenda: diag.receita_revenda?.toString() || '',
      receita_industrializacao: diag.receita_industrializacao?.toString() || '',
      receita_servicos: diag.receita_servicos?.toString() || '',
      receita_monofasica: diag.receita_monofasica?.toString() || '',
      receita_st: diag.receita_st?.toString() || '', receita_imune: diag.receita_imune?.toString() || '',
      fator_r: diag.fator_r || '', das_total: diag.das_recolhido?.toString() || '',
      irpj: diag.irpj?.toString() || '', csll: diag.csll?.toString() || '',
      cofins: diag.cofins?.toString() || '', pis: diag.pis?.toString() || '',
      inss_cpp: diag.inss_cpp?.toString() || '', icms: diag.icms?.toString() || '',
      ipi: diag.ipi?.toString() || '', iss: diag.iss?.toString() || '',
      irpj_susp: diag.irpj_susp?.toString() || '', csll_susp: diag.csll_susp?.toString() || '',
      cofins_susp: diag.cofins_susp?.toString() || '', pis_susp: diag.pis_susp?.toString() || '',
      inss_susp: diag.inss_susp?.toString() || '', icms_susp: diag.icms_susp?.toString() || '',
      ipi_susp: diag.ipi_susp?.toString() || '', iss_susp: diag.iss_susp?.toString() || '',
      observacoes: diag.observacoes || '',
    })
    setAba('lancamento')
  }

  function novoLancamento() { setForm(FORM_VAZIO); setDiagAberto(null) }

  const totalPaginas    = Math.max(1, Math.ceil(historico.length / porPagina))
  const historicoPagina = historico.length > 0
    ? historico.slice((pagina - 1) * porPagina, pagina * porPagina)
    : LINHAS_GHOST
  const temHistorico = historico.length > 0

  const kpisForm = [
    { label: 'Receita do Periodo (RPA)',  valor: rpa > 0 ? fmtR(rpa) : '—',                                                 cor: rpa > 0 ? S.navy : S.ghostText },
    { label: 'Receita Monofasica',         valor: receita_mono > 0 ? fmtR(receita_mono) : '—',                               cor: receita_mono > 0 ? S.orange : S.ghostText },
    { label: 'DAS Total Declarado',        valor: das_total > 0 ? fmtR(das_total) : '—',                                     cor: das_total > 0 ? S.red : S.ghostText },
    { label: 'Aliquota Efetiva',           valor: aliquotaEfetiva > 0 ? aliquotaEfetiva.toFixed(2).replace('.', ',')+'%':'—', cor: aliquotaEfetiva > 0 ? S.blue : S.ghostText },
    { label: '% Receita Monofasica',       valor: pctMono > 0 ? pctMono.toFixed(2).replace('.', ',')+'%' : '—',              cor: pctMono > 0 ? S.orange : S.ghostText },
    { label: 'Diferenca Recuperavel',      valor: diferencaRecuperavel > 0 ? fmtR(diferencaRecuperavel) : '—',               cor: diferencaRecuperavel > 0 ? S.green : S.ghostText },
  ]

  // Dados para AnalisadorIA
  const dadosIA = rpa > 0 ? {
    periodo: form.periodo_apuracao,
    receitaBrutaPeriodo: rpa,
    receitaMonofasica: receita_mono,
    receitaST: receita_st,
    receitaImune: receita_imu,
    baseCorreta,
    dasDeclarado: das_total,
    dasCorreto: baseCorreta * (aliquotaEfetiva / 100),
    diferencaRecuperavel,
    aliquotaEfetiva,
    pctMonofasica: pctMono,
    fatorR: form.fator_r,
    tributos: { irpj, csll, cofins, pis, inss, icms, ipi, iss },
    regime,
    baseLegal: 'LC 123/2006 art. 18 §4 — Segregacao de receitas monofasicas no PGDAS-D',
  } : historico.length > 0 ? {
    totalDeclaracoes: historico.length,
    totalDAS: historico.reduce((s,d)=>s+(d.das_recolhido||0),0),
    totalMonofasico: historico.reduce((s,d)=>s+(d.receita_monofasica||0),0),
    creditoTotal: historico.reduce((s,d)=>s+(d.credito_estimado||0),0),
    regime,
  } : null

  const secao = (titulo, conteudo) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: S.navy, borderBottom: `2px solid ${S.navy}`, paddingBottom: 6, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {titulo}
      </div>
      {conteudo}
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }}>

      {/* HEADER */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
            Motor do Simples / <strong style={{ color: S.text }}>PGDAS-D</strong>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>PGDAS-D — Simples Nacional</div>
          <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
            Lance os dados completos do PGDAS-D por competencia para analise de segregacao e recuperacao de creditos.
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px', minWidth: 260, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: S.navy, marginBottom: 4 }}>📎 Importar PGDAS-D</div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>
            Aceita: <strong style={{ color: S.text }}>.pdf .xml .txt</strong>
          </div>
          <input ref={inputImportRef} type="file" accept=".pdf,.xml,.txt,.zip,.rar,.DEC,.rec,.RE,.DIA,.prf" onChange={importarArquivo} style={{ display: 'none' }} />
          <button onClick={() => inputImportRef.current?.click()} disabled={importando}
            style={{ width: '100%', padding: '8px 0', background: importando ? '#CBD5E1' : '#4B5563', color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: importando ? 'not-allowed' : 'pointer' }}>
            {importando ? '⏳ Extraindo dados...' : '⬆ Importar e Preencher'}
          </button>
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${S.border}`, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'lancamento', label: 'Lancamento' },
          { id: 'historico',  label: `Historico (${historico.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba===a.id?700:400, color: aba===a.id?S.navy:S.muted, background: 'none', border: 'none', borderBottom: `2px solid ${aba===a.id?S.navy:'transparent'}`, marginBottom: -2, cursor: 'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA LANCAMENTO */}
      {aba === 'lancamento' && (
        <>
          {/* ANALISADOR IA */}
          <AnalisadorIA
            contexto="PGDAS-D — Segregacao de Receitas Simples Nacional"
            dados={dadosIA}
            cliente={cliente}
            regime={regime}
          />

          {diagAberto && (
            <div style={{ background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13, color: '#2563eb' }}>
                Visualizando PGDAS-D salvo em <strong>{fmtData(diagAberto.created_at)}</strong> — Competencia: <strong>{diagAberto.competencia}</strong>
              </div>
              <button onClick={novoLancamento} style={{ background: 'none', border: `1px solid #bfdbfe`, borderRadius: 6, color: '#2563eb', cursor: 'pointer', fontSize: 12, padding: '4px 10px' }}>
                Novo Lancamento
              </button>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            {kpisForm.map((k, i) => (
              <div key={i} style={{ background: S.white, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>{k.label}</div>
                {k.valor === '—' && <div style={{ fontSize: 10, color: S.ghostText, marginTop: 2 }}>Aguardando lancamento</div>}
              </div>
            ))}
          </div>

          {/* FORMULARIO */}
          <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, background: '#f0f9ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: S.navy }}>Lancamento do PGDAS-D</div>
                <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>Preencha os campos conforme o documento impresso do PGDAS-D.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {diagAberto && <Badge tipo={diagAberto.tipo_declaracao?.toLowerCase() === 'retificadora' ? 'retificadora' : 'original'} />}
              </div>
            </div>

            <div style={{ padding: 20 }}>

              {secao('1. Identificacao da Declaracao', (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <InputTexto label="Periodo de Apuracao *" value={form.periodo_apuracao} onChange={v => setF('periodo_apuracao', v)} placeholder="MM/AAAA" disabled={!!diagAberto} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>Tipo de Declaracao</div>
                    <select value={form.tipo_declaracao} onChange={e => setF('tipo_declaracao', e.target.value)} disabled={!!diagAberto}
                      style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: S.text }}>
                      <option>Original</option>
                      <option>Retificadora</option>
                    </select>
                  </div>
                  <InputTexto label="No. da Declaracao" value={form.num_declaracao} onChange={v => setF('num_declaracao', v)} placeholder="01562151202605001" disabled={!!diagAberto} />
                  <InputTexto label="Numero do Recibo" value={form.num_recibo} onChange={v => setF('num_recibo', v)} placeholder="01.07.26166.0014697-9" disabled={!!diagAberto} />
                  <InputTexto label="Autenticacao" value={form.autenticacao} onChange={v => setF('autenticacao', v)} placeholder="01127.56631.21558.51216" disabled={!!diagAberto} />
                  <InputTexto label="Data de Transmissao" value={form.data_transmissao} onChange={v => setF('data_transmissao', v)} placeholder="DD/MM/AAAA HH:MM:SS" disabled={!!diagAberto} />
                </div>
              ))}

              {secao('2.1 Discriminativo de Receitas', (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <InputMoeda label="RPA — Receita Bruta do Periodo *" value={form.rpa} onChange={v => setF('rpa', v)} disabled={!!diagAberto} />
                  <InputMoeda label="RBT12 — Receita 12 Meses Anteriores" value={form.rbt12} onChange={v => setF('rbt12', v)} disabled={!!diagAberto} />
                  <InputMoeda label="RBA — Receita Ano-Calendario Corrente" value={form.rba} onChange={v => setF('rba', v)} disabled={!!diagAberto} />
                  <InputMoeda label="RBAA — Receita Ano-Calendario Anterior" value={form.rbaa} onChange={v => setF('rbaa', v)} disabled={!!diagAberto} />
                </div>
              ))}

              {secao('2.7 Receitas por Atividade', (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <InputMoeda label="Receita Revenda de Mercadorias" value={form.receita_revenda} onChange={v => setF('receita_revenda', v)} disabled={!!diagAberto} />
                  <InputMoeda label="Receita Industrializacao" value={form.receita_industrializacao} onChange={v => setF('receita_industrializacao', v)} disabled={!!diagAberto} />
                  <InputMoeda label="Receita Prestacao de Servicos" value={form.receita_servicos} onChange={v => setF('receita_servicos', v)} disabled={!!diagAberto} />
                </div>
              ))}

              {secao('Segregacao de Receitas', (
                <>
                  <div style={{ background: '#fff7ed', border: `1px solid #fed7aa`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
                    ⚠️ Informe as receitas que devem ser segregadas da base de calculo do DAS. Monofasicos, ST e imunes reduzem o DAS devido.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <InputMoeda label="Receita Monofasica (PIS/COFINS)" value={form.receita_monofasica} onChange={v => setF('receita_monofasica', v)} disabled={!!diagAberto} />
                    <InputMoeda label="Receita c/ Substituicao Tributaria" value={form.receita_st} onChange={v => setF('receita_st', v)} disabled={!!diagAberto} />
                    <InputMoeda label="Receita Imune / Isenta" value={form.receita_imune} onChange={v => setF('receita_imune', v)} disabled={!!diagAberto} />
                  </div>
                  {rpa > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
                      {[
                        { label: 'Base Tributavel Correta',  valor: fmtR(baseCorreta),                                    cor: S.navy  },
                        { label: '% Receita Monofasica',     valor: pctMono.toFixed(2).replace('.', ',')+'%',             cor: S.orange },
                        { label: 'Reducao de Base Possivel', valor: fmtR(receita_mono + receita_st + receita_imu),        cor: S.green },
                      ].map((k, i) => (
                        <div key={i} style={{ background: S.bg, borderRadius: 6, padding: '10px 14px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                          <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ))}

              {secao('2.4 Fator R', (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <InputTexto label="Fator R (conforme PGDAS-D)" value={form.fator_r} onChange={v => setF('fator_r', v)} placeholder="Ex: 0,2800 ou Nao se aplica" disabled={!!diagAberto} />
                </div>
              ))}

              {secao('2.6 Resumo da Declaracao', (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <InputMoeda label="Valor Total do DAS (Debito Declarado) *" value={form.das_total} onChange={v => setF('das_total', v)} disabled={!!diagAberto} />
                </div>
              ))}

              {secao('2.7 Total do Debito por Tributo (R$)', (
                <>
                  <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>Total do Debito Declarado (exigivel + suspenso)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'IRPJ', key: 'irpj' }, { label: 'CSLL', key: 'csll' },
                      { label: 'COFINS', key: 'cofins' }, { label: 'PIS/Pasep', key: 'pis' },
                      { label: 'INSS/CPP', key: 'inss_cpp' }, { label: 'ICMS', key: 'icms' },
                      { label: 'IPI', key: 'ipi' }, { label: 'ISS', key: 'iss' },
                    ].map(({ label, key }) => (
                      <InputMoeda key={key} label={label} value={form[key]} onChange={v => setF(key, v)} disabled={!!diagAberto} />
                    ))}
                  </div>
                  {totalTributos > 0 && (
                    <div style={{ background: S.bg, borderRadius: 6, padding: '10px 14px', border: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: S.muted }}>Total calculado (soma dos tributos):</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: S.navy }}>{fmtR(totalTributos)}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>Total do Debito com Exigibilidade Suspensa (R$)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {[
                      { label: 'IRPJ Susp.', key: 'irpj_susp' }, { label: 'CSLL Susp.', key: 'csll_susp' },
                      { label: 'COFINS Susp.', key: 'cofins_susp' }, { label: 'PIS Susp.', key: 'pis_susp' },
                      { label: 'INSS Susp.', key: 'inss_susp' }, { label: 'ICMS Susp.', key: 'icms_susp' },
                      { label: 'IPI Susp.', key: 'ipi_susp' }, { label: 'ISS Susp.', key: 'iss_susp' },
                    ].map(({ label, key }) => (
                      <InputMoeda key={key} label={label} value={form[key]} onChange={v => setF(key, v)} disabled={!!diagAberto} />
                    ))}
                  </div>
                </>
              ))}

              {secao('Observacoes', (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>Observacoes</div>
                  <textarea value={form.observacoes || ''} onChange={e => setF('observacoes', e.target.value)}
                    disabled={!!diagAberto}
                    placeholder="Anotacoes sobre esta declaracao, pendencias, etc."
                    rows={3}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', color: S.text, background: diagAberto ? S.bg : S.white }} />
                </div>
              ))}

              {!diagAberto && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={salvar} disabled={salvando}
                    style={{ padding: '9px 24px', background: S.navy, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                    {salvando ? 'Salvando...' : 'Salvar PGDAS-D'}
                  </button>
                  <button onClick={() => setForm(FORM_VAZIO)}
                    style={{ padding: '9px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ABA HISTORICO */}
      {aba === 'historico' && (
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>Historico de PGDAS-D Lancados</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={carregarHistorico} style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>Atualizar</button>
              <button onClick={() => { setAba('lancamento'); novoLancamento() }}
                style={{ padding: '6px 14px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Novo Lancamento
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: 16, borderBottom: `1px solid ${S.border}` }}>
            {[
              { label: 'Declaracoes lancadas', valor: temHistorico ? historico.length : '—',                                                         cor: temHistorico ? S.navy   : S.ghostText },
              { label: 'Total DAS declarado',  valor: temHistorico ? fmtR(historico.reduce((s,d)=>s+(d.das_recolhido||0),0)) : 'R$ —,——',           cor: temHistorico ? S.red    : S.ghostText },
              { label: 'Total monofasico',     valor: temHistorico ? fmtR(historico.reduce((s,d)=>s+(d.receita_monofasica||0),0)) : 'R$ —,——',      cor: temHistorico ? S.orange : S.ghostText },
              { label: 'Credito estimado',     valor: temHistorico ? fmtR(historico.reduce((s,d)=>s+(d.credito_estimado||0),0)) : 'R$ —,——',        cor: temHistorico ? S.green  : S.ghostText },
            ].map((k, i) => (
              <div key={i} style={{ background: S.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: i===0?20:14, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
                {!temHistorico && <div style={{ fontSize: 10, color: S.ghostText, marginTop: 2 }}>Aguardando lancamento</div>}
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: S.thBg }}>
                  {['Competencia','Tipo','No. Declaracao','RPA','Rec. Monofasica','DAS Total','IRPJ','CSLL','COFINS','PIS','INSS','ICMS','ISS','Credito Est.','Status','Acoes'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historicoPagina.map((diag, i) => {
                  const isGhost = diag.ghost
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: isGhost ? S.ghost : i%2===0 ? S.white : '#FAFAFA' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: isGhost ? S.ghostText : S.navy, whiteSpace: 'nowrap' }}>{diag.periodo_apuracao || diag.competencia || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>{isGhost ? <span style={{ color: S.ghostText }}>Original</span> : <Badge tipo={diag.tipo_declaracao?.toLowerCase()==='retificadora'?'retificadora':'original'} />}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.muted, fontSize: 11 }}>{isGhost ? '—' : (diag.num_declaracao || '—')}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? 'R$ —,——' : fmtR(diag.receita_bruta_total)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.orange, fontWeight: isGhost?400:600 }}>{isGhost ? 'R$ —,——' : fmtR(diag.receita_monofasica)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.red, fontWeight: isGhost?400:700 }}>{isGhost ? 'R$ —,——' : fmtR(diag.das_recolhido)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? '—' : fmtR(diag.irpj)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? '—' : fmtR(diag.csll)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? '—' : fmtR(diag.cofins)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? '—' : fmtR(diag.pis)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? '—' : fmtR(diag.inss_cpp)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? '—' : fmtR(diag.icms)}</td>
                      <td style={{ padding: '8px 10px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? '—' : fmtR(diag.iss)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: isGhost ? S.ghostText : S.green }}>{isGhost ? 'R$ —,——' : fmtR(diag.credito_estimado)}</td>
                      <td style={{ padding: '8px 10px' }}>{isGhost ? <span style={{ color: S.ghostText }}>—</span> : <Badge tipo={diag.status||'concluido'} />}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {!isGhost && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => { abrirDiagnostico(diag); setAba('lancamento') }}
                              style={{ padding: '4px 10px', background: S.navy, color: S.white, border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Abrir</button>
                            <button onClick={() => excluir(diag.id)}
                              style={{ padding: '4px 10px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>🗑</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!temHistorico && (
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${S.border}`, textAlign: 'center', fontSize: 12, color: S.ghostText }}>
              Lance o primeiro PGDAS-D clicando em "Novo Lancamento"
            </div>
          )}

          <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted, flexWrap: 'wrap', gap: 8 }}>
            <span>{temHistorico ? `${historico.length} declaracao(es) — Pagina ${pagina} de ${totalPaginas}` : 'Aguardando lancamentos'}</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[['«',()=>setPagina(1),pagina===1||!temHistorico],['<',()=>setPagina(p=>Math.max(1,p-1)),pagina===1||!temHistorico],['>',()=>setPagina(p=>Math.min(totalPaginas,p+1)),pagina===totalPaginas||!temHistorico],['»',()=>setPagina(totalPaginas),pagina===totalPaginas||!temHistorico]].map(([l,fn,dis],i)=>(
                <button key={i} onClick={fn} disabled={dis} style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: dis?'not-allowed':'pointer', color: dis?'#CBD5E1':S.text }}>{l}</button>
              ))}
              <select value={porPagina} onChange={e=>{setPorPagina(Number(e.target.value));setPagina(1)}}
                style={{ marginLeft: 8, padding: '3px 8px', border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {[10,25,50,100].map(n=><option key={n} value={n}>{n} por pagina</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}