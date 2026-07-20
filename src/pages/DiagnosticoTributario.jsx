import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { parseXMLNFe, agruparPorCompetencia } from '../utils/parseXMLNFe'

const NCM_MONOFASICOS = {
  '27101259': 'Gasolina', '27101921': 'Óleo Diesel', '27111290': 'GLP',
  '30039099': 'Medicamento', '30049099': 'Medicamento',
  '33030010': 'Perfume', '33042090': 'Cosmético',
  '87089990': 'Autopeça', '87082990': 'Autopeça',
  '22021000': 'Bebida', '22030000': 'Cerveja',
  '40111000': 'Pneu', '40112000': 'Pneu',
}

const FUNDAMENTACAO = {
  MONOFASICO: 'Lei 10.147/2000, Lei 10.485/2002, Lei 9.718/1998 — Tributação concentrada na indústria. Distribuidor/varejista não deve recolher PIS/COFINS sobre a revenda.',
  SEGREGACAO_MONOFASICO: 'LC 123/2006 art. 18 §4º — Receitas com produtos monofásicos devem ser segregadas no PGDAS-D para redução do DAS.',
  EXCLUSAO_ICMS_TEMA69: 'STF RE 574.706 — Tema 69. O ICMS não compõe a base de cálculo do PIS e da COFINS. Recuperação retroativa de 5 anos.',
  ICMS_ST: 'IN RFB 1.911/2019 — ICMS-ST pago nas entradas gera crédito de PIS/COFINS no Lucro Real.',
  RETENCAO_INDEVIDA: 'LC 123/2006 art. 3º §4º — Empresas do Simples Nacional são imunes a retenções de PIS/COFINS/CSLL na fonte.',
}

const C = {
  navy: '#0B1F4D', white: '#FFFFFF', border: '#C8D0DC',
  text: '#1E293B', muted: '#64748B', green: '#16a34a',
  red: '#dc2626', bg: '#F4E7EC',
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

export default function DiagnosticoTributario({ clienteId, cliente, onNavegar }) {
  const [etapa, setEtapa] = useState('inicio')
  const [aba, setAba] = useState('novo') // novo | historico
  const [arquivos, setArquivos] = useState([])
  const [resultado, setResultado] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const inputRef = useRef(null)

  const regime = cliente?.regime || 'Simples Nacional'

  useEffect(() => {
    if (clienteId) carregarHistorico()
  }, [clienteId])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const { data } = await supabase
      .from('entradas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('competencia', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    setArquivos(prev => [...prev, ...files.map(f => ({
      file: f, nome: f.name,
      tipo: f.name.endsWith('.xml') ? 'xml' : f.name.endsWith('.csv') ? 'csv' : f.name.endsWith('.pdf') ? 'pdf' : 'outro',
    }))])
  }

  async function analisar() {
    if (arquivos.length === 0) return
    setEtapa('processando')
    setErro('')
    try {
      const notasXML = []
      for (const arq of arquivos) {
        if (arq.tipo === 'xml') {
          const texto = await arq.file.text()
          const xmls = texto.includes('<nfeProc')
            ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x + '</nfeProc>')
            : [texto]
          for (const xml of xmls) {
            try { const n = parseXMLNFe(xml); if (n.competencia) notasXML.push(n) }
            catch (e) { console.warn('XML inválido:', e) }
          }
        }
      }
      if (notasXML.length === 0) throw new Error('Nenhuma NF-e válida encontrada.')

      const competencias = agruparPorCompetencia(notasXML)
      const entradas = notasXML.filter(n => n.tipo === 'entrada')
      const saidas = notasXML.filter(n => n.tipo === 'saida')
      const itensEntrada = entradas.flatMap(n => n.itens)

      const monofasicos = []
      for (const item of itensEntrada) {
        const ncm8 = item.ncm?.substring(0, 8)
        const desc = NCM_MONOFASICOS[ncm8]
        if (desc) {
          if ((regime === 'Lucro Presumido' || regime === 'Lucro Real') && (item.vPIS > 0 || item.vCOFINS > 0)) {
            monofasicos.push({ ...item, descricao: desc, credito: item.vPIS + item.vCOFINS, tese: 'MONOFASICO' })
          }
          if (regime === 'Simples Nacional') {
            monofasicos.push({ ...item, descricao: desc, credito: 0, tese: 'SEGREGACAO_MONOFASICO' })
          }
        }
      }

      const exclusaoICMS = []
      if (regime === 'Lucro Presumido' || regime === 'Lucro Real') {
        for (const comp of competencias) {
          if (comp.totalICMS > 0) {
            const aliq = regime === 'Lucro Real' ? 0.0925 : 0.0365
            exclusaoICMS.push({ competencia: comp.competencia, vICMS: comp.totalICMS, credito: comp.totalICMS * aliq, tese: 'EXCLUSAO_ICMS_TEMA69' })
          }
        }
      }

      const icmsST = []
      if (regime === 'Lucro Real') {
        for (const item of itensEntrada) {
          if (item.vST > 0) icmsST.push({ ...item, credito: item.vST * 0.0925, tese: 'ICMS_ST' })
        }
      }

      const retencoes = []
      if (regime === 'Simples Nacional') {
        for (const nota of notasXML) {
          if ((nota.totalPIS > 0 || nota.totalCOFINS > 0) && nota.crt === '1') {
            retencoes.push({ nNF: nota.nNF, competencia: nota.competencia, credito: nota.totalPIS + nota.totalCOFINS, tese: 'RETENCAO_INDEVIDA' })
          }
        }
      }

      const totalCredito =
        monofasicos.reduce((s, o) => s + o.credito, 0) +
        exclusaoICMS.reduce((s, o) => s + o.credito, 0) +
        icmsST.reduce((s, o) => s + o.credito, 0) +
        retencoes.reduce((s, o) => s + o.credito, 0)

      const resumoCompetencias = competencias.map(comp => ({
        competencia: comp.competencia,
        receita_bruta: comp.totalProd,
        receita_tributada: comp.totalProd,
        receita_monofasica: comp.itens.filter(i => NCM_MONOFASICOS[i.ncm?.substring(0, 8)]).reduce((s, i) => s + i.vProd, 0),
        tributo_pago: comp.totalPIS + comp.totalCOFINS,
        tributo_devido: 0,
        credito: exclusaoICMS.filter(o => o.competencia === comp.competencia).reduce((s, o) => s + o.credito, 0),
        nfes_analisadas: comp.notas.length,
        periodo_inicio: comp.competencia + '-01',
        periodo_fim: comp.competencia + '-01',
      }))

      setResultado({ totalNotas: notasXML.length, entradas: entradas.length, saidas: saidas.length, competencias, resumoCompetencias, monofasicos, exclusaoICMS, icmsST, retencoes, totalCredito, dataAnalise: new Date().toISOString() })
      setEtapa('resultado')
    } catch (e) {
      setErro(e.message)
      setEtapa('inicio')
    }
  }

  async function salvar() {
    if (!resultado || !clienteId) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      for (const comp of resultado.resumoCompetencias) {
        const creditoComp =
          resultado.exclusaoICMS.filter(o => o.competencia === comp.competencia).reduce((s, o) => s + o.credito, 0) +
          (resultado.monofasicos.length > 0 ? comp.receita_monofasica * (regime === 'Lucro Real' ? 0.0925 : 0.0365) : 0)
        await supabase.from('entradas').upsert({
          cliente_id: clienteId, usuario_id: user.id,
          competencia: comp.competencia, tributo: 'PIS/COFINS',
          receita_bruta: comp.receita_bruta, receita_tributada: comp.receita_tributada,
          receita_monofasica: comp.receita_monofasica, tributo_pago: comp.tributo_pago,
          tributo_devido: comp.tributo_devido, credito: creditoComp,
          nfes_analisadas: comp.nfes_analisadas, periodo_inicio: comp.periodo_inicio,
          periodo_fim: comp.periodo_fim,
          tipo_oportunidade: resultado.monofasicos.length > 0 ? 'MONOFASICO' : resultado.exclusaoICMS.length > 0 ? 'EXCLUSAO_ICMS' : 'SEM_OPORTUNIDADE',
          risco: 'baixo',
          documentos: JSON.stringify({ nfes: resultado.totalNotas, teses: { monofasicos: resultado.monofasicos.length, exclusaoICMS: resultado.exclusaoICMS.length, icmsST: resultado.icmsST.length, retencoes: resultado.retencoes.length } }),
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      await carregarHistorico()
      setEtapa('inicio')
      setResultado(null)
      setArquivos([])
      setAba('historico')
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  function imprimirRelatorio(dados, entradas) {
    const totalCredito = entradas.reduce((s, e) => s + (e.credito || 0), 0)
    const totalReceita = entradas.reduce((s, e) => s + (e.receita_bruta || 0), 0)
    const totalPago = entradas.reduce((s, e) => s + (e.tributo_pago || 0), 0)
    const teses = [...new Set(entradas.map(e => e.tipo_oportunidade).filter(Boolean))]

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Fiscal — ${cliente?.razao_social}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1E293B; background: #fff; }
  .header { background: #0B1F4D; color: #fff; padding: 20px 28px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
  .header p { font-size: 11px; color: #93c5fd; }
  .label { font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .section { margin: 0 28px 20px; }
  .section-title { font-size: 12px; font-weight: 700; color: #0B1F4D; border-bottom: 2px solid #0B1F4D; padding-bottom: 4px; margin-bottom: 10px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .kpi-valor { font-size: 16px; font-weight: 800; color: #0B1F4D; }
  .kpi-label { font-size: 9px; color: #64748B; margin-top: 2px; }
  .potencial { background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 16px 20px; text-align: center; margin-bottom: 16px; }
  .potencial-valor { font-size: 28px; font-weight: 900; color: #16a34a; }
  .potencial-label { font-size: 10px; color: #64748B; margin-bottom: 4px; font-weight: 700; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  .tese-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
  .tese-nome { font-size: 12px; font-weight: 700; color: #0B1F4D; margin-bottom: 4px; }
  .tese-fund { font-size: 10px; color: #64748B; line-height: 1.5; }
  .footer { margin: 20px 28px 0; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
  .verde { color: #16a34a; font-weight: 700; }
  .aviso { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px 12px; font-size: 10px; color: #92400e; margin-bottom: 16px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4; }
  }
</style>
</head>
<body>

<div class="header">
  <div style="font-size:9px;color:#7CC4FF;font-weight:700;letter-spacing:2px;margin-bottom:6px">FISCALTRIB — RELATÓRIO DE DIAGNÓSTICO TRIBUTÁRIO</div>
  <h1>${cliente?.razao_social || '—'}</h1>
  <p>CNPJ: ${cliente?.cnpj || '—'} · Regime: ${regime} · ${cliente?.municipio || '—'}/${cliente?.uf || '—'}</p>
  <p style="margin-top:4px">Data do relatório: ${new Date().toLocaleDateString('pt-BR')} · Gerado pelo FiscalTrib</p>
</div>

<div class="section">
  <div class="section-title">1. RESUMO EXECUTIVO</div>
  <div class="potencial">
    <div class="potencial-label">POTENCIAL TOTAL DE RECUPERAÇÃO IDENTIFICADO</div>
    <div class="potencial-valor">${fmtR(totalCredito)}</div>
    <div style="font-size:10px;color:#64748B;margin-top:4px">Estimativa baseada nas NF-e analisadas · Sujeito a validação profissional</div>
  </div>
  <div class="grid-4">
    <div class="kpi"><div class="kpi-valor">${entradas.length}</div><div class="kpi-label">Competências analisadas</div></div>
    <div class="kpi"><div class="kpi-valor">${fmtR(totalReceita)}</div><div class="kpi-label">Receita bruta total</div></div>
    <div class="kpi"><div class="kpi-valor">${fmtR(totalPago)}</div><div class="kpi-label">Tributos pagos</div></div>
    <div class="kpi"><div class="kpi-valor">${teses.length}</div><div class="kpi-label">Teses identificadas</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">2. TESES TRIBUTÁRIAS IDENTIFICADAS</div>
  ${teses.map(tese => `
  <div class="tese-card">
    <div class="tese-nome">${tese === 'MONOFASICO' ? '💊 Monofásicos PIS/COFINS' : tese === 'SEGREGACAO_MONOFASICO' ? '💊 Segregação Monofásicos (Simples Nacional)' : tese === 'EXCLUSAO_ICMS' ? '⚖️ Exclusão ICMS da Base PIS/COFINS — STF Tema 69' : tese === 'ICMS_ST' ? '🔄 Crédito PIS/COFINS sobre ICMS-ST' : tese === 'RETENCAO_INDEVIDA' ? '🚫 Retenções Indevidas na Fonte' : tese}</div>
    <div class="tese-fund">${FUNDAMENTACAO[tese] || 'Fundamentação a detalhar.'}</div>
  </div>
  `).join('')}
  ${teses.length === 0 ? '<div style="color:#64748B;font-size:11px">Nenhuma tese identificada nos documentos analisados.</div>' : ''}
</div>

<div class="section">
  <div class="section-title">3. ANÁLISE POR COMPETÊNCIA</div>
  <table>
    <thead>
      <tr>
        <th>Competência</th>
        <th>NF-e</th>
        <th>Receita Bruta</th>
        <th>PIS/COFINS Pago</th>
        <th>Receita Monofásica</th>
        <th>Crédito Identificado</th>
        <th>Oportunidade</th>
      </tr>
    </thead>
    <tbody>
      ${entradas.map(e => `
      <tr>
        <td style="font-weight:600">${e.competencia || '—'}</td>
        <td>${e.nfes_analisadas || '—'}</td>
        <td>${fmtR(e.receita_bruta)}</td>
        <td>${fmtR(e.tributo_pago)}</td>
        <td class="${e.receita_monofasica > 0 ? 'verde' : ''}">${fmtR(e.receita_monofasica)}</td>
        <td class="${e.credito > 0 ? 'verde' : ''}">${fmtR(e.credito)}</td>
        <td>${e.tipo_oportunidade || '—'}</td>
      </tr>
      `).join('')}
      <tr style="background:#f0fdf4;font-weight:700">
        <td>TOTAL</td>
        <td>—</td>
        <td>${fmtR(totalReceita)}</td>
        <td>${fmtR(totalPago)}</td>
        <td>—</td>
        <td class="verde">${fmtR(totalCredito)}</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">4. PRÓXIMOS PASSOS RECOMENDADOS</div>
  <table>
    <thead><tr><th>#</th><th>Ação</th><th>Prazo</th><th>Responsável</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Validar NF-e identificadas com produtos monofásicos</td><td>15 dias</td><td>Contador</td></tr>
      <tr><td>2</td><td>Levantar recolhimentos de PIS/COFINS dos últimos 5 anos</td><td>30 dias</td><td>Contador</td></tr>
      <tr><td>3</td><td>Elaborar PER/DCOMP ou pedido de restituição</td><td>60 dias</td><td>Advogado Tributário</td></tr>
      <tr><td>4</td><td>Protocolar junto à Receita Federal</td><td>90 dias</td><td>Advogado Tributário</td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div class="aviso">⚠️ Este relatório é uma estimativa preliminar gerada pelo FiscalTrib com base nas informações fornecidas. Os valores apresentados não substituem análise profissional habilitada. Recomenda-se validação por contador e/ou advogado tributário antes de qualquer ação.</div>
</div>

<div class="footer">
  <span>FiscalTrib — Sistema de Inteligência Tributária · fiscaltrib.com.br</span>
  <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
</div>

<div style="position:fixed;top:12px;right:16px;z-index:999;display:flex;gap:8px">
  <button onclick="window.print()" style="padding:8px 16px;background:#0B1F4D;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
  <button onclick="window.close()" style="padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">✕ Fechar</button>
</div>
</body>
</html>`

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()
  }

  if (!clienteId) return (
    <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Selecione um cliente para iniciar o diagnóstico</div>
      <div style={{ fontSize: 13 }}>Use o seletor de cliente no menu lateral</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>FISCALTRIB — DIAGNÓSTICO TRIBUTÁRIO</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>🔎 {cliente?.razao_social}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{regime}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{cliente?.cnpj}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{cliente?.municipio}/{cliente?.uf}</span>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        {[['novo', '🔍 Novo Diagnóstico'], ['historico', `📋 Histórico (${historico.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba === id ? 700 : 400, color: aba === id ? C.navy : C.muted, background: 'none', border: 'none', borderBottom: `2px solid ${aba === id ? C.navy : 'transparent'}`, marginBottom: -2, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ABA NOVO DIAGNÓSTICO */}
      {aba === 'novo' && <>

        {etapa === 'inicio' && (
          <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>📂 Importar documentos fiscais</div>
            <div
              onDrop={onDrop} onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', marginBottom: 16 }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>Arraste ou clique para selecionar</div>
              <div style={{ fontSize: 13, color: C.muted }}>XML de NF-e · CSV · PDF (PGDAS, SPED)</div>
              <input ref={inputRef} type="file" multiple accept=".xml,.csv,.pdf" onChange={onDrop} style={{ display: 'none' }} />
            </div>

            {arquivos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {arquivos.map((arq, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{arq.tipo === 'xml' ? '📄' : arq.tipo === 'csv' ? '📊' : '📑'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{arq.nome}</span>
                      <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{arq.tipo.toUpperCase()}</span>
                    </div>
                    <button onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>⚠️ {erro}</div>}

            <button onClick={analisar} disabled={arquivos.length === 0}
              style={{ width: '100%', padding: 14, background: arquivos.length > 0 ? C.navy : C.border, color: C.white, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: arquivos.length > 0 ? 'pointer' : 'not-allowed', marginBottom: 20 }}>
              🔍 Iniciar Diagnóstico {arquivos.length > 0 ? `(${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''})` : ''}
            </button>

            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12, letterSpacing: 1 }}>TESES QUE SERÃO VERIFICADAS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                {[
                  { icon: '💊', tese: 'Monofásicos PIS/COFINS', regimes: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'] },
                  { icon: '⚖️', tese: 'Exclusão ICMS Tema 69', regimes: ['Lucro Presumido', 'Lucro Real'] },
                  { icon: '🔄', tese: 'Crédito ICMS-ST', regimes: ['Lucro Real'] },
                  { icon: '🚫', tese: 'Retenções Indevidas', regimes: ['Simples Nacional'] },
                ].map((t, i) => {
                  const aplicavel = t.regimes.includes(regime)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: aplicavel ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: `1px solid ${aplicavel ? '#86efac' : C.border}` }}>
                      <span>{t.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: aplicavel ? C.green : C.muted }}>{t.tese}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: aplicavel ? C.green : C.muted }}>{aplicavel ? '✓' : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {etapa === 'processando' && (
          <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Analisando documentos...</div>
            <div style={{ fontSize: 13, color: C.muted }}>Cruzando NCMs, competências e teses tributárias</div>
          </div>
        )}

        {etapa === 'resultado' && resultado && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'NF-e analisadas', valor: resultado.totalNotas, cor: '#2563eb' },
                { label: 'Entradas', valor: resultado.entradas, cor: '#16a34a' },
                { label: 'Saídas', valor: resultado.saidas, cor: '#7c3aed' },
                { label: 'Competências', valor: resultado.competencias.length, cor: '#0891b2' },
              ].map((k, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{k.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: resultado.totalCredito > 0 ? '#f0fdf4' : '#f8fafc', border: `2px solid ${resultado.totalCredito > 0 ? '#86efac' : C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>POTENCIAL TOTAL DE RECUPERAÇÃO</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: resultado.totalCredito > 0 ? C.green : C.muted }}>{fmtR(resultado.totalCredito)}</div>
              {resultado.totalCredito === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Nenhuma oportunidade identificada</div>}
            </div>

            {[
              { lista: resultado.monofasicos, titulo: '💊 Monofásicos PIS/COFINS', cor: '#7c3aed', campos: ['produto', 'ncm', 'vProd', 'credito'] },
              { lista: resultado.exclusaoICMS, titulo: '⚖️ Exclusão ICMS — STF Tema 69', cor: '#0891b2', campos: ['competencia', 'vICMS', 'credito'] },
              { lista: resultado.icmsST, titulo: '🔄 Crédito ICMS-ST', cor: '#ea580c', campos: ['produto', 'vST', 'credito'] },
              { lista: resultado.retencoes, titulo: '🚫 Retenções Indevidas', cor: '#dc2626', campos: ['nNF', 'competencia', 'credito'] },
            ].map((grupo, gi) => grupo.lista.length > 0 && (
              <div key={gi} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: grupo.cor, marginBottom: 8 }}>{grupo.titulo}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{FUNDAMENTACAO[resultado.monofasicos.length > 0 ? 'MONOFASICO' : grupo.lista[0]?.tese] || ''}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {grupo.campos.map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                          {h === 'produto' ? 'Produto' : h === 'ncm' ? 'NCM' : h === 'vProd' ? 'Valor' : h === 'credito' ? 'Crédito' : h === 'competencia' ? 'Competência' : h === 'vICMS' ? 'ICMS' : h === 'vST' ? 'ICMS-ST' : h === 'nNF' ? 'NF' : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.lista.slice(0, 10).map((o, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {grupo.campos.map(campo => (
                          <td key={campo} style={{ padding: '6px 10px', fontWeight: campo === 'credito' ? 700 : 400, color: campo === 'credito' ? C.green : C.text }}>
                            {campo === 'credito' || campo === 'vProd' || campo === 'vICMS' || campo === 'vST' ? fmtR(o[campo]) : o[campo] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, fontWeight: 700, color: grupo.cor }}>
                  Total: {fmtR(grupo.lista.reduce((s, o) => s + (o.credito || 0), 0))}
                </div>
              </div>
            ))}

            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>📅 Por Competência</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Competência', 'NF-e', 'Receita', 'PIS/COFINS Pago', 'Monofásico', 'Crédito'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.resumoCompetencias.map((comp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{comp.competencia}</td>
                      <td style={{ padding: '6px 10px' }}>{comp.nfes_analisadas}</td>
                      <td style={{ padding: '6px 10px' }}>{fmtR(comp.receita_bruta)}</td>
                      <td style={{ padding: '6px 10px' }}>{fmtR(comp.tributo_pago)}</td>
                      <td style={{ padding: '6px 10px', color: comp.receita_monofasica > 0 ? C.green : C.muted }}>{fmtR(comp.receita_monofasica)}</td>
                      <td style={{ padding: '6px 10px', color: comp.credito > 0 ? C.green : C.muted, fontWeight: comp.credito > 0 ? 700 : 400 }}>{fmtR(comp.credito)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>⚠️ {erro}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => imprimirRelatorio(resultado, resultado.resumoCompetencias)}
                style={{ flex: 1, padding: 12, background: '#f0fdf4', color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                🖨️ Imprimir Relatório
              </button>
              <button onClick={() => { setEtapa('inicio'); setResultado(null); setArquivos([]) }}
                style={{ flex: 1, padding: 12, background: C.white, color: C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ← Nova análise
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ flex: 2, padding: 12, background: C.navy, color: C.white, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : '✅ Salvar diagnóstico'}
              </button>
            </div>
          </>
        )}
      </>}
	  async function excluirEntrada(id) {
      if (!window.confirm('Excluir este registro do histórico?')) return
      await supabase.from('entradas').delete().eq('id', id)
      await carregarHistorico()
}

      {/* ABA HISTÓRICO */}
      {aba === 'historico' && (
        <div>
          {loadingHistorico ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Carregando histórico...</div>
          ) : historico.length === 0 ? (
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Nenhum diagnóstico salvo</div>
              <button onClick={() => setAba('novo')} style={{ padding: '10px 20px', background: C.navy, color: C.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Novo Diagnóstico
              </button>
            </div>
          ) : (
            <>
              {/* Resumo do histórico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Competências salvas', valor: historico.length, cor: '#2563eb' },
                  { label: 'Potencial total', valor: fmtR(historico.reduce((s, e) => s + (e.credito || 0), 0)), cor: C.green },
                  { label: 'Receita analisada', valor: fmtR(historico.reduce((s, e) => s + (e.receita_bruta || 0), 0)), cor: '#7c3aed' },
                ].map((k, i) => (
                  <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: i === 1 ? 16 : 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Botão imprimir relatório completo */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button
                  onClick={() => imprimirRelatorio(null, historico)}
                  style={{ padding: '10px 20px', background: '#f0fdf4', color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  🖨️ Imprimir Relatório Completo
                </button>
              </div>

              {/* Tabela histórico */}
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Competência', 'Tributo', 'Receita Bruta', 'Pago', 'Monofásico', 'Crédito', 'Oportunidade', 'Risco', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{e.competencia}</td>
                        <td style={{ padding: '8px 10px' }}>{e.tributo}</td>
                        <td style={{ padding: '8px 10px' }}>{fmtR(e.receita_bruta)}</td>
                        <td style={{ padding: '8px 10px' }}>{fmtR(e.tributo_pago)}</td>
                        <td style={{ padding: '8px 10px', color: e.receita_monofasica > 0 ? C.green : C.muted }}>{fmtR(e.receita_monofasica)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: e.credito > 0 ? C.green : C.muted }}>{fmtR(e.credito)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{e.tipo_oportunidade || '—'}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ background: e.risco === 'baixo' ? '#f0fdf4' : e.risco === 'medio' ? '#fefce8' : '#fef2f2', color: e.risco === 'baixo' ? C.green : e.risco === 'medio' ? '#ca8a04' : C.red, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{e.risco}</span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => imprimirRelatorio(null, [e])}
                         style={{ padding: '4px 10px', background: '#f0fdf4', color: C.green, border: `1px solid ${C.green}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                         🖨️
                         </button>
                         <button onClick={() => excluirEntrada(e.id)}
                         style={{ padding: '4px 10px', background: '#fef2f2', color: C.red, border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
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