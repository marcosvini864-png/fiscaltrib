import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { MotorInteligenciaTributaria } from './motor/MotorInteligenciaTributaria'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const NCM_MONOFASICOS = [
  '2701','2702','2703','2704','2705','2706','2707','2708','2709','2710','2711','2712','2713','2714','2715',
  '3002','3003','3004','3005','3006',
  '3303','3304','3305','3306','3307',
  '2201','2202','2203','2204','2205','2206','2207','2208','2209','2210',
  '1001','1002','1003','1004','1005','1006','1007','1008',
  '7108','7109','7110','7111','7112',
]

const CST_ST = ['10','30','60','70','90']
const CFOP_SAIDA_TRIB = ['5101','5102','5103','5104','5105','5106','6101','6102','6103','6104','5401','5402','5403','5405','6401','6402','6403','6404']
const CFOP_SERVICO    = ['5301','5302','5303','5304','5305','5306','5307','5308','5309','5310','5311','5312','5313','5314','5315','5316','6301','6302']

function parseXMLNFe(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const get = tag => { const els = doc.getElementsByTagNameNS('*', tag); return els[0]?.textContent?.trim() || '' }
  const getAll = tag => Array.from(doc.getElementsByTagNameNS('*', tag))

  const dhEmi       = get('dhEmi') || get('dEmi')
  const competencia = dhEmi ? dhEmi.slice(0, 7) : ''
  const tpNF        = get('tpNF')
  const chNFe       = get('chNFe')
  const nNF         = get('nNF')
  const serie       = get('serie')
  const natOp       = get('natOp')
  const cnpjEmi     = get('CNPJ')

  const vNF     = parseFloat(get('vNF')      || 0)
  const vICMS   = parseFloat(get('vICMS')    || 0)
  const vPIS    = parseFloat(get('vPIS')     || 0)
  const vCOFINS = parseFloat(get('vCOFINS') || 0)
  const vISS    = parseFloat(get('vISS')     || get('vISSQN') || 0)
  const vST     = parseFloat(get('vST')      || 0)
  const vFrete  = parseFloat(get('vFrete')   || 0)
  const vDesc   = parseFloat(get('vDesc')    || 0)
  const vIPI    = parseFloat(get('vIPI')     || 0)

  const itens = []
  const dets = getAll('det')
  dets.forEach(det => {
    const getD = tag => Array.from(det.getElementsByTagNameNS('*', tag))[0]?.textContent?.trim() || ''

    const ncm   = getD('NCM')
    const cfop  = getD('CFOP')
    const cst   = getD('CST') || getD('CSOSN')
    const cest  = getD('CEST')
    const cProd = getD('cProd')
    const xProd = getD('xProd')
    const orig  = getD('orig')

    const qCom   = parseFloat(getD('qCom')   || 0)
    const vUnCom = parseFloat(getD('vUnCom') || 0)
    const vProd  = parseFloat(getD('vProd')  || 0)
    const vDescI = parseFloat(getD('vDesc')  || 0)

    const vBC    = parseFloat(getD('vBC')    || 0)
    const pICMS  = parseFloat(getD('pICMS')  || 0)
    const vItemICMS = parseFloat(getD('vICMS') || 0)

    const vBCST     = parseFloat(getD('vBCST')    || 0)
    const pICMSST   = parseFloat(getD('pICMSST')  || 0)
    const vItemST   = parseFloat(getD('vICMSST')  || getD('vST') || 0)

    const vItemIPI  = parseFloat(getD('vIPI')     || 0)

    const vBCPIS    = parseFloat(getD('vBCPIS')   || 0)
    const pPIS      = parseFloat(getD('pPIS')     || 0)
    const vItemPIS  = parseFloat(getD('vPIS')     || 0)

    const vBCCOFINS = parseFloat(getD('vBCCOFINS') || 0)
    const pCOFINS   = parseFloat(getD('pCOFINS')   || 0)
    const vItemCOFINS = parseFloat(getD('vCOFINS') || 0)

    if (ncm || cfop) itens.push({
      ncm, cfop, cst, cest, cProd, xProd, orig,
      qCom, vUnCom,
      vProd, vDesc: vDescI,
      vBC, pICMS, vItemICMS,
      vBCST, pICMSST, vItemST,
      vItemIPI,
      vBCPIS, pPIS, vItemPIS,
      vBCCOFINS, pCOFINS, vItemCOFINS,
    })
  })

  return {
    chNFe, nNF, serie,
    tpNF,
    competencia,
    cnpjEmi,
    natOp,
    vNF, vICMS, vPIS, vCOFINS, vISS, vST, vFrete, vDesc, vIPI,
    itens,
    valido: !!competencia && vNF > 0,
  }
}

const PERIODOS = [
  { label: '12 meses', meses: 12 },
  { label: '24 meses', meses: 24 },
  { label: '36 meses', meses: 36 },
  { label: '60 meses', meses: 60 },
]

function detectarOportunidades(nfes, regime) {
  const oportunidades = []
  let totalVNF = 0, totalVST = 0

  const nfesSaida = nfes.filter(n => n.tpNF === '1' || n.tpNF === '')
  const todosItens = nfesSaida.flatMap(n => n.itens || [])
  nfesSaida.forEach(n => { totalVNF += n.vNF; totalVST += n.vST })
  const meses = [...new Set(nfesSaida.map(n => n.competencia))].length || 1

  const itensMonofasicos = todosItens.filter(i => NCM_MONOFASICOS.some(ncm => i.ncm.startsWith(ncm)))
  if (itensMonofasicos.length > 0) {
    const valorMensal = itensMonofasicos.reduce((s, i) => s + i.vProd, 0) / meses
    const pisCofinsIndevido = itensMonofasicos.reduce((s, i) => s + i.vItemPIS + i.vItemCOFINS, 0) / meses || valorMensal * 0.0365
    oportunidades.push({ tese: 'Receitas Monofásicas', descricao: `${itensMonofasicos.length} produto(s) com NCM monofásico tributados indevidamente.`, ncms: [...new Set(itensMonofasicos.map(i => i.ncm))].slice(0, 5), produtos: itensMonofasicos.map(i => i.xProd).slice(0, 3), mediaMensal: pisCofinsIndevido, potencial: pisCofinsIndevido * 60, projecoes: PERIODOS.map(p => ({ ...p, valor: pisCofinsIndevido * p.meses })), meses, risco: 'baixo', cor: '#16a34a', icon: '💊' })
  }

  const itensST = todosItens.filter(i => CST_ST.includes(i.cst) && i.vItemST > 0)
  if (itensST.length > 0 || totalVST > 0) {
    const valorSTMensal = (itensST.reduce((s, i) => s + i.vItemST, 0) || totalVST) / meses
    oportunidades.push({ tese: regime === 'Simples Nacional' ? 'Exclusão ICMS-ST da Base do Simples' : 'Exclusão ICMS-ST da Base PIS/COFINS', descricao: `ICMS-ST identificado. Valor retido pode ser excluído da base de cálculo.`, ncms: [...new Set(itensST.map(i => i.ncm))].slice(0, 5), produtos: itensST.map(i => i.xProd).slice(0, 3), mediaMensal: valorSTMensal, potencial: valorSTMensal * 60, projecoes: PERIODOS.map(p => ({ ...p, valor: valorSTMensal * p.meses })), meses, risco: 'baixo', cor: '#2563eb', icon: '🏷️' })
  }

  const itensServico    = todosItens.filter(i => CFOP_SERVICO.some(c => i.cfop === c))
  const itensMercadoria = todosItens.filter(i => CFOP_SAIDA_TRIB.some(c => i.cfop === c))
  if (itensServico.length > 0 && itensMercadoria.length > 0 && regime === 'Simples Nacional') {
    const vlMensal = itensServico.reduce((s, i) => s + i.vProd, 0) / meses * 0.02
    oportunidades.push({ tese: 'Segregação de Receitas por Anexo', descricao: 'Mix de mercadorias e serviços detectado.', ncms: [], produtos: [], mediaMensal: vlMensal, potencial: vlMensal * 60, projecoes: PERIODOS.map(p => ({ ...p, valor: vlMensal * p.meses })), meses, risco: 'medio', cor: '#7c3aed', icon: '📊' })
  }

  if (regime === 'Simples Nacional' && itensServico.length > 0) {
    const vlMensal = (itensServico.reduce((s, i) => s + i.vProd, 0) || totalVNF) / meses * 0.05
    oportunidades.push({ tese: 'Fator R — Migração Anexo V para III', descricao: 'Empresa prestadora de serviços pode migrar para Anexo III via Fator R.', ncms: [], produtos: [], mediaMensal: vlMensal, potencial: vlMensal * 60, projecoes: PERIODOS.map(p => ({ ...p, valor: vlMensal * p.meses })), meses, risco: 'medio', cor: '#d97706', icon: '🔄' })
  }

  const itensPisAlto = todosItens.filter(i => i.pPIS > 1.65 || i.pCOFINS > 7.6)
  if (itensPisAlto.length > 0) {
    const excessoMensal = itensPisAlto.reduce((s, i) => s + Math.max(0, i.vItemPIS - i.vProd * 0.0165) + Math.max(0, i.vItemCOFINS - i.vProd * 0.076), 0) / meses
    if (excessoMensal > 0) oportunidades.push({ tese: 'PIS/COFINS — Alíquota Incorreta', descricao: `${itensPisAlto.length} produto(s) com alíquota acima do permitido.`, ncms: [...new Set(itensPisAlto.map(i => i.ncm))].slice(0, 5), produtos: itensPisAlto.map(i => i.xProd).slice(0, 3), mediaMensal: excessoMensal, potencial: excessoMensal * 60, projecoes: PERIODOS.map(p => ({ ...p, valor: excessoMensal * p.meses })), meses, risco: 'medio', cor: '#0d9488', icon: '📋' })
  }

  return oportunidades
}

function parsePGDAS(xmlStr) {
  const parser = new DOMParser(); const doc = parser.parseFromString(xmlStr, 'application/xml')
  const competencia = doc.querySelector('periodoApuracao')?.textContent || doc.querySelector('competencia')?.textContent || ''
  const receitaBruta = parseFloat(doc.querySelector('receitaBrutaTotal')?.textContent || doc.querySelector('totalReceita')?.textContent || 0)
  const dasDevido = parseFloat(doc.querySelector('valorDevido')?.textContent || doc.querySelector('dasDevido')?.textContent || 0)
  const aliquota = parseFloat(doc.querySelector('aliquotaEfetiva')?.textContent || 0)
  return { competencia: competencia.slice(0, 7), receitaBruta, dasDevido, aliquota, valido: !!competencia && receitaBruta > 0 }
}

function parseDCTFWeb(xmlStr) {
  const parser = new DOMParser(); const doc = parser.parseFromString(xmlStr, 'application/xml')
  const get = tag => doc.querySelector(tag)?.textContent || ''
  const competencia = get('periodoApuracao') || get('competencia') || ''
  return { competencia: competencia.slice(0, 7), totalDebito: parseFloat(get('totalDebito') || 0), totalCredito: parseFloat(get('totalCredito') || 0), totalRecolher: parseFloat(get('totalRecolher') || 0), valido: !!competencia }
}

function parseSPED(txtStr, tipo) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const result = { tipo, competencia: '', totalEntradas: 0, totalSaidas: 0, totalICMS: 0, totalPIS: 0, totalCOFINS: 0, linhasLidas: linhas.length, valido: false }
  linhas.forEach(linha => {
    const c = linha.split('|').filter((_, i) => i > 0); const reg = c[0]
    if (reg === '0000') { const dtIni = c[2] || ''; result.competencia = dtIni ? `${dtIni.slice(4,8)}-${dtIni.slice(2,4)}` : ''; result.valido = true }
    if (reg === 'C100') { const vDoc = parseFloat(c[10] || 0); if (c[1]==='0') result.totalEntradas+=vDoc; else result.totalSaidas+=vDoc }
    if (reg === 'E110') result.totalICMS += parseFloat(c[12] || 0)
    if (reg === 'M200') result.totalPIS  += parseFloat(c[1]  || 0)
    if (reg === 'M600') result.totalCOFINS += parseFloat(c[1] || 0)
  })
  return result
}

function parseECDECF(txtStr, tipo) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const result = { tipo, competencia: '', totalReceita: 0, irpj: 0, csll: 0, linhasLidas: linhas.length, valido: false }
  linhas.forEach(linha => {
    const c = linha.split('|').filter((_, i) => i > 0); const reg = c[0]
    if (reg === '0000') { const dtIni = c[2] || ''; result.competencia = dtIni ? `${dtIni.slice(4,8)}-${dtIni.slice(2,4)}` : ''; result.valido = true }
    if (reg === 'P100') result.totalReceita += parseFloat(c[6] || 0)
    if (reg === 'P150') { result.irpj += parseFloat(c[3] || 0); result.csll += parseFloat(c[4] || 0) }
  })
  return result
}

function parseExtratoDebitos(txtStr) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const debitos = []; let totalDebito = 0
  linhas.forEach(linha => {
    const valorMatch = linha.match(/R?\$?\s*([\d.,]+)/)
    if (valorMatch) {
      const valor = parseFloat(valorMatch[1].replace(/\./g,'').replace(',','.')) || 0
      if (valor > 0 && valor < 999999999) {
        const tributo = linha.includes('IRPJ')?'IRPJ':linha.includes('CSLL')?'CSLL':linha.includes('PIS')?'PIS':linha.includes('COFINS')?'COFINS':linha.includes('INSS')?'INSS':linha.includes('DAS')?'DAS':'Tributo'
        debitos.push({ tributo, valor, situacao: 'Em aberto' }); totalDebito += valor
      }
    }
  })
  return { debitos, totalDebito, linhasLidas: linhas.length, valido: debitos.length > 0 }
}

function agruparNFePorCompetencia(nfes) {
  const map = {}
  nfes.forEach(nf => {
    if (!map[nf.competencia]) map[nf.competencia] = { competencia: nf.competencia, qtd: 0, vNF: 0, vICMS: 0, vPIS: 0, vCOFINS: 0, vST: 0 }
    const m = map[nf.competencia]
    m.qtd++; m.vNF+=nf.vNF; m.vICMS+=nf.vICMS; m.vPIS+=nf.vPIS; m.vCOFINS+=nf.vCOFINS; m.vST+=nf.vST
  })
  return Object.values(map).sort((a,b) => a.competencia.localeCompare(b.competencia))
}

async function salvarRelatorio({ usuarioId, clienteId, cliente, origem, nfes, oportunidades }) {
  const agrupadas       = agruparNFePorCompetencia(nfes)
  const competencias    = agrupadas.map(a => a.competencia).sort()
  const totalFaturamento = nfes.reduce((s, n) => s + n.vNF, 0)
  const totalICMS        = nfes.reduce((s, n) => s + n.vICMS, 0)
  const totalPIS         = nfes.reduce((s, n) => s + n.vPIS, 0)
  const totalCOFINS      = nfes.reduce((s, n) => s + n.vCOFINS, 0)
  const totalST          = nfes.reduce((s, n) => s + n.vST, 0)
  const totalImpostos    = totalICMS + totalPIS + totalCOFINS + totalST
  const potencialTotal   = oportunidades.reduce((s, o) => s + (o.potencial || o.calculos?.creditoTotal || 0), 0)
  const { error } = await supabase.from('relatorios_importacao').insert({
    usuario_id: usuarioId, cliente_id: clienteId, cliente_nome: cliente?.razao_social || '',
    cliente_cnpj: cliente?.cnpj || '', cliente_regime: cliente?.regime || '', origem,
    total_nfes: nfes.length, periodo_inicio: competencias[0] || '', periodo_fim: competencias[competencias.length - 1] || '',
    total_faturamento: totalFaturamento, total_impostos: totalImpostos,
    oportunidades_count: oportunidades.length, potencial_total: potencialTotal,
    dados_json: { nfes, oportunidades, agrupadas },
  })
  return error
}

async function salvarOportunidadesEmEntradas({ clienteId, usuarioId, resultadoMotor, competenciaInicioGeral, competenciaFimGeral, totalNfesGeral }) {
  const oportunidades = resultadoMotor?.consolidado?.oportunidades || []
  await supabase.from('entradas').delete().eq('cliente_id', clienteId)
  const periodoAtual = competenciaFimGeral || new Date().toISOString().slice(0, 7)

  function resumoEvidencias(evidencias, comp) {
    const lista = (evidencias || []).filter(e => !comp || e.competencia === comp || e.comp === comp)
    const fonte = lista.length > 0 ? lista : (evidencias || [])
    return fonte.slice(0, 5).map(e => e.descricao || e.resumo || e.observacao || e.texto || '').filter(Boolean).join(' | ')
  }

  function riscoDoGrau(grau) {
    if (grau === 'ALTO') return 'baixo'
    if (grau === 'MEDIO') return 'medio'
    return 'alto'
  }

  if (oportunidades.length === 0) {
    await supabase.from('entradas').upsert({
      cliente_id: clienteId,
      usuario_id: usuarioId,
      competencia: periodoAtual,
      tributo: 'NF-e importada',
      credito: 0,
      tipo_oportunidade: '',
      risco: 'baixo',
      periodo_inicio: competenciaInicioGeral || '',
      periodo_fim: competenciaFimGeral || '',
      nfes_analisadas: totalNfesGeral || 0,
    }, { onConflict: 'cliente_id,competencia,tributo' })
    return
  }

  for (const op of oportunidades) {
    const porCompetencia = op.calculos?.porCompetencia || []
    const risco = riscoDoGrau(op.grauConfianca)
    const tese = op.tese || 'Oportunidade identificada'

    if (!Array.isArray(porCompetencia) || porCompetencia.length === 0) {
      await supabase.from('entradas').upsert({
        cliente_id: clienteId,
        usuario_id: usuarioId,
        competencia: periodoAtual,
        tributo: tese,
        credito: op.calculos?.creditoTotal || 0,
        tipo_oportunidade: tese,
        risco,
        documentos: resumoEvidencias(op.evidencias),
        periodo_inicio: competenciaInicioGeral || '',
        periodo_fim: competenciaFimGeral || '',
        nfes_analisadas: totalNfesGeral || 0,
      }, { onConflict: 'cliente_id,competencia,tributo' })
      continue
    }

    for (const dadosComp of porCompetencia) {
      await supabase.from('entradas').upsert({
        cliente_id: clienteId,
        usuario_id: usuarioId,
        competencia: dadosComp.competencia,
        tributo: tese,
        credito: dadosComp.creditoTotal || 0,
        tipo_oportunidade: tese,
        risco,
        documentos: resumoEvidencias(op.evidencias, dadosComp.competencia),
        periodo_inicio: competenciaInicioGeral || '',
        periodo_fim: competenciaFimGeral || '',
        nfes_analisadas: dadosComp.qtdNFes || 0,
      }, { onConflict: 'cliente_id,competencia,tributo' })
    }
  }
}

function imprimirRelatorio(idElemento) {
  const conteudo = document.getElementById(idElemento)?.innerHTML
  if (!conteudo) return
  const janela = window.open('', '_blank', 'width=1000,height=800')
  janela.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Relatório de Importação Fiscal — FiscalTrib</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1e293b; padding: 32px 36px; }
      table { width: 100%; border-collapse: collapse; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
    </head><body>${conteudo}</body></html>`)
  janela.document.close()
  janela.focus()
  setTimeout(() => { janela.print() }, 600)
}

function RelatorioImportacao({ cliente, nfes, origem, oportunidades }) {
  const agrupadas     = agruparNFePorCompetencia(nfes)
  const competencias  = agrupadas.map(a => a.competencia)
  const periodoInicio = competencias[0] || '—'
  const periodoFim    = competencias[competencias.length - 1] || '—'
  const totalNF       = nfes.reduce((s, n) => s + n.vNF, 0)
  const totalICMS     = nfes.reduce((s, n) => s + n.vICMS, 0)
  const totalPIS      = nfes.reduce((s, n) => s + n.vPIS, 0)
  const totalCOFINS   = nfes.reduce((s, n) => s + n.vCOFINS, 0)
  const totalST       = nfes.reduce((s, n) => s + n.vST, 0)
  const totalImpostos = totalICMS + totalPIS + totalCOFINS + totalST
  const totalPotencial = oportunidades.reduce((s, o) => s + (o.potencial || o.calculos?.creditoTotal || 0), 0)
  const dataHoje  = new Date().toLocaleDateString('pt-BR')
  const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const regime    = cliente?.regime || 'Simples Nacional'

  const DIAGNOSTICO = {
    'Simples Nacional': {
      titulo: 'Condições para Recuperação de Crédito — Simples Nacional',
      intro: 'Empresas optantes pelo Simples Nacional podem recuperar créditos tributários nas seguintes situações:',
      condicoes: [
        { icon: '💊', titulo: 'Receitas Monofásicas', desc: 'Produtos com NCM específico (combustíveis, farmacêuticos, bebidas, cosméticos, cereais) sujeitos à alíquota zero de PIS/COFINS que foram recolhidos indevidamente dentro do DAS.' },
        { icon: '🏷️', titulo: 'ICMS-ST (Substituição Tributária)', desc: 'Valores retidos por substituição tributária que podem ser excluídos da base de cálculo do Simples Nacional, gerando crédito a recuperar conforme decisão do STJ.' },
        { icon: '📊', titulo: 'Segregação de Receitas por Anexo', desc: 'Empresas com mix de mercadorias e serviços podem reduzir a alíquota efetiva separando as receitas nos anexos corretos do Simples Nacional.' },
        { icon: '🔄', titulo: 'Fator R — Migração Anexo V para III', desc: 'Prestadores de serviços com folha de pagamento ≥ 28% da receita bruta dos últimos 12 meses podem migrar do Anexo V (maior carga) para o Anexo III (menor carga).' },
        { icon: '📋', titulo: 'PIS/COFINS — Alíquota Incorreta', desc: 'Produtos tributados pelo fornecedor com alíquota de PIS/COFINS acima do permitido, gerando pagamento indevido que pode ser recuperado via PER/DCOMP.' },
      ],
    },
    'Lucro Presumido': {
      titulo: 'Condições para Recuperação de Crédito — Lucro Presumido',
      intro: 'Empresas no Lucro Presumido podem recuperar créditos tributários nas seguintes situações:',
      condicoes: [
        { icon: '💰', titulo: 'Exclusão do ICMS da Base PIS/COFINS', desc: 'Conforme decisão do STF (Tema 69), o ICMS destacado nas notas fiscais não integra a base de cálculo do PIS e da COFINS, gerando crédito para os últimos 5 anos.' },
        { icon: '🏷️', titulo: 'ICMS-ST na Base PIS/COFINS', desc: 'O ICMS retido por substituição tributária também não deve compor a base de cálculo do PIS/COFINS, gerando direito a crédito.' },
        { icon: '📋', titulo: 'Alíquota Incorreta PIS/COFINS', desc: 'Produtos sujeitos à alíquota zero, isenção ou monofasia que foram tributados com alíquota cheia de PIS (0,65%) e COFINS (3%).' },
        { icon: '🏢', titulo: 'INSS sobre Verbas Indenizatórias', desc: 'Contribuições previdenciárias recolhidas sobre verbas de natureza indenizatória (férias, aviso prévio, auxílio-doença) que não integram o salário de contribuição.' },
        { icon: '📊', titulo: 'IRPJ/CSLL — Base de Cálculo Reduzida', desc: 'Receitas financeiras, ganhos de capital e outras receitas que não se enquadram na base presumida padrão podem ter alíquota diferenciada de IRPJ e CSLL.' },
        { icon: '🔄', titulo: 'Créditos de IPI sobre Insumos', desc: 'Indústrias no Lucro Presumido podem apropriar créditos de IPI sobre matérias-primas e insumos utilizados na produção.' },
      ],
    },
    'Lucro Real': {
      titulo: 'Condições para Recuperação de Crédito — Lucro Real',
      intro: 'Empresas no Lucro Real têm o maior conjunto de oportunidades para recuperação de créditos tributários:',
      condicoes: [
        { icon: '💰', titulo: 'Créditos de PIS/COFINS Não Cumulativo', desc: 'No regime não cumulativo, são permitidos créditos de PIS (1,65%) e COFINS (7,6%) sobre insumos, energia elétrica, aluguéis, depreciação de ativos e outros itens da legislação.' },
        { icon: '🏛️', titulo: 'Exclusão do ICMS da Base PIS/COFINS', desc: 'Conforme STF (Tema 69), o ICMS destacado nas NF-es não compõe a base de cálculo do PIS/COFINS — direito aos últimos 5 anos.' },
        { icon: '📊', titulo: 'Prejuízo Fiscal e Base Negativa CSLL', desc: 'Prejuízos fiscais acumulados podem ser compensados com lucros futuros (limitado a 30% por período), reduzindo IRPJ e CSLL a recolher.' },
        { icon: '🏢', titulo: 'INSS sobre Verbas Indenizatórias', desc: 'Contribuições previdenciárias recolhidas sobre férias, aviso prévio indenizado, PLR e outros itens de natureza indenizatória.' },
        { icon: '🔄', titulo: 'Créditos de IPI sobre Insumos e Exportação', desc: 'Créditos de IPI sobre matérias-primas, insumos e embalagens utilizados na produção, além de créditos sobre exportações.' },
        { icon: '📋', titulo: 'Ativos Diferidos e Depreciação Acelerada', desc: 'Revisão de taxas de depreciação de bens do ativo imobilizado, especialmente para bens com vida útil diferenciada ou utilizados em múltiplos turnos.' },
        { icon: '⚖️', titulo: 'JCP — Juros sobre Capital Próprio', desc: 'Dedutibilidade dos Juros sobre Capital Próprio calculados sobre o patrimônio líquido, reduzindo a base de IRPJ e CSLL.' },
      ],
    },
  }

  const diag = DIAGNOSTICO[regime] || DIAGNOSTICO['Simples Nacional']
  const tesasDetectadas = oportunidades.map(o => o.tese)

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', overflow: 'hidden', marginTop: 24 }}>
      <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>📋 Relatório de Importação</div>
        <button onClick={() => imprimirRelatorio('relatorio-importacao-conteudo')}
          style={{ padding: '8px 20px', background: '#0B1F4D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          🖨️ Imprimir
        </button>
      </div>
      <div id="relatorio-importacao-conteudo" style={{ padding: '32px 36px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #0B1F4D', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>FISCALTRIB — RELATÓRIO DE IMPORTAÇÃO</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0B1F4D', marginBottom: 4 }}>Relatório de Importação Fiscal</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Gerado em {dataHoje} às {horaAgora}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0B1F4D' }}>⚖️ e-FiscalTrib®</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Sistema de Recuperação Tributária</div>
          </div>
        </div>
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Dados do Cliente</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div><div style={{ fontSize: 11, color: '#64748b' }}>Razão Social</div><div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>{cliente?.razao_social || '—'}</div></div>
            <div><div style={{ fontSize: 11, color: '#64748b' }}>CNPJ</div><div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>{cliente?.cnpj || '—'}</div></div>
            <div><div style={{ fontSize: 11, color: '#64748b' }}>Regime Tributário</div><div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>{regime}</div></div>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', marginBottom: 12 }}>📥 Resumo da Importação</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Tipo de arquivo',   valor: origem,                             cor: '#0B1F4D' },
              { label: 'NF-e importadas',   valor: nfes.length,                        cor: '#2563eb' },
              { label: 'Período analisado', valor: `${periodoInicio} a ${periodoFim}`, cor: '#7c3aed' },
              { label: 'Competências',      valor: competencias.length,                cor: '#d97706' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0', minWidth: 0, boxSizing: 'border-box' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: c.cor }}>{c.valor}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', marginBottom: 12 }}>💰 Valores Fiscais Identificados</div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#0B1F4D', color: '#fff' }}>
                    {['Tributo','Valor Total','% sobre Faturamento'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tributo: 'Faturamento Total (NF-e)', valor: totalNF,       pct: 100,                                         bold: false },
                    { tributo: 'ICMS',                     valor: totalICMS,     pct: totalNF > 0 ? totalICMS/totalNF*100 : 0,     bold: false },
                    { tributo: 'PIS',                      valor: totalPIS,      pct: totalNF > 0 ? totalPIS/totalNF*100 : 0,      bold: false },
                    { tributo: 'COFINS',                   valor: totalCOFINS,   pct: totalNF > 0 ? totalCOFINS/totalNF*100 : 0,  bold: false },
                    { tributo: 'ICMS-ST',                  valor: totalST,       pct: totalNF > 0 ? totalST/totalNF*100 : 0,      bold: false },
                    { tributo: 'Total de Impostos',        valor: totalImpostos, pct: totalNF > 0 ? totalImpostos/totalNF*100 : 0, bold: true  },
                  ].map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: r.bold ? '#f0f9ff' : i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding: '10px 16px', fontWeight: r.bold ? 700 : 400, color: r.bold ? '#0B1F4D' : '#374151', whiteSpace: 'nowrap' }}>{r.tributo}</td>
                      <td style={{ padding: '10px 16px', fontWeight: r.bold ? 700 : 400, color: r.bold ? '#0B1F4D' : '#374151', whiteSpace: 'nowrap' }}>{fmtR(r.valor)}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{r.pct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {agrupadas.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', marginBottom: 12 }}>📅 Detalhamento por Competência</div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Competência','NF-e','Faturamento','ICMS','PIS','COFINS','ST'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agrupadas.map((a, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0B1F4D', whiteSpace: 'nowrap' }}>{a.competencia}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{a.qtd}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{fmtR(a.vNF)}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{fmtR(a.vICMS)}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{fmtR(a.vPIS)}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{fmtR(a.vCOFINS)}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{fmtR(a.vST)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', marginBottom: 4 }}>⚖️ {diag.titulo}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{diag.intro}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diag.condicoes.map((c, i) => {
              const detectada = tesasDetectadas.some(t => t.toLowerCase().includes(c.titulo.toLowerCase().split('—')[0].trim().toLowerCase()))
              return (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 16px', borderRadius: 8, border: `1px solid ${detectada ? '#86efac' : '#e2e8f0'}`, background: detectada ? '#f0fdf4' : '#f8fafc' }}>
                  <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{c.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: detectada ? '#16a34a' : '#0B1F4D' }}>{c.titulo}</span>
                      {detectada
                        ? <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 99 }}>✅ IDENTIFICADO</span>
                        : <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 99 }}>Não identificado neste período</span>
                      }
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{c.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', marginBottom: 12 }}>⚡ Resultado da Análise</div>
          {oportunidades.length > 0 ? (
            <div>
              <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
                  ✅ {oportunidades.length} oportunidade(s) identificada(s) — Potencial total: {fmtR(totalPotencial)}
                </div>
              </div>
              {oportunidades.map((op, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderRadius: 8, marginBottom: 8, border: `1px solid ${op.cor || '#e2e8f0'}33`, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: op.cor || '#0B1F4D' }}>{op.icon || '⚡'} {op.tese}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{op.descricao}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Potencial 60m</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: op.cor || '#0B1F4D' }}>{fmtR(op.potencial || op.calculos?.creditoPor60Meses || 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>⚠️ Nenhuma oportunidade detectada automaticamente neste período</div>
              <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.7 }}>Com base nas NF-es importadas, o sistema não identificou automaticamente as condições listadas acima.</div>
              <div style={{ fontSize: 13, color: '#92400e', marginTop: 8, fontWeight: 600 }}>Recomendamos análise manual complementar por consultor tributário habilitado.</div>
            </div>
          )}
        </div>
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>⚠️ Relatório preliminar — não substitui análise profissional habilitada.</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>FiscalTrib · contato@fiscaltrib.com.br · (11) 99957-9822</div>
        </div>
      </div>
    </div>
  )
}

function RaioXTributario({ clienteId, cliente, entradas, origem, nfes, onIniciarRecuperacao, onDiagnostico, onRelatorio }) {
  const [criando, setCriando] = useState(false)
  const [criado,  setCriado]  = useState(false)
  const hoje = new Date()

  const oportunidades  = nfes && nfes.length > 0 ? detectarOportunidades(nfes, cliente?.regime || 'Simples Nacional') : []
  const totalPotencial = oportunidades.reduce((s, o) => s + o.potencial, 0)
  const totalCreditos  = entradas.reduce((s, e) => s + (e.credito || 0), 0)
  const potencialFinal = Math.max(totalPotencial, totalCreditos)

  const criticos = entradas.filter(e => {
    if (!e.competencia || e.credito <= 0) return false
    const [a, m] = e.competencia.split('-')
    const lim  = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    const dias = Math.round((lim - hoje) / (1000 * 60 * 60 * 24))
    return dias <= 365 && dias > 0
  }).map(e => {
    const [a, m] = e.competencia.split('-')
    const lim = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    return { ...e, dias: Math.round((lim - hoje) / (1000 * 60 * 60 * 24)), lim }
  })

  const score      = Math.min(100, Math.max(20, 100 - oportunidades.filter(o => o.risco === 'baixo').length * 15 - oportunidades.filter(o => o.risco === 'medio').length * 8 - criticos.length * 5))
  const scoreCor   = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  const scoreLabel = score >= 80 ? 'Boa saúde tributária' : score >= 60 ? 'Atenção necessária' : 'Situação crítica'

  async function iniciarRecuperacao() {
    setCriando(true)
    try {
      await supabase.from('recuperacoes').upsert({
      cliente_id: clienteId, competencia: new Date().toISOString().slice(0, 7),
      tributo: oportunidades[0]?.tese || 'A definir', valor_credito: potencialFinal,
      potencial_recuperavel: potencialFinal, tese_aplicada: oportunidades.map(o => o.tese).join(', '),
      risco: oportunidades.some(o => o.risco === 'baixo') ? 'baixo' : 'medio',
      origem: origem || 'Raio-X XML', status: 'Identificado', score_fiscal: score,
      observacoes: `Raio-X automático. ${oportunidades.length} oportunidades detectadas via ${origem}.`,
}, { onConflict: 'cliente_id' })
      setCriado(true)
      if (onIniciarRecuperacao) onIniciarRecuperacao()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setCriando(false) }
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — ANÁLISE AUTOMÁTICA</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>⚡ Raio-X Tributário</h2>
        <div style={{ fontSize: 14, color: '#93c5fd', marginBottom: 16 }}>
          Cliente: <strong style={{ color: '#fff' }}>{cliente?.razao_social}</strong> · Regime: <strong style={{ color: '#4ade80' }}>{cliente?.regime}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginTop: 8 }}>
          {[
            { label: 'NF-e analisadas',   valor: nfes?.length || 0,    cor: '#7CC4FF' },
            { label: 'Oportunidades',      valor: oportunidades.length,  cor: '#4ade80' },
            { label: 'Potencial estimado', valor: fmtR(potencialFinal),  cor: '#fbbf24' },
            { label: 'Prazos críticos',    valor: criticos.length,       cor: criticos.length > 0 ? '#f87171' : '#4ade80' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', minWidth: 0, boxSizing: 'border-box' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c.cor }}>{c.valor}</div>
              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {oportunidades.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0B1F4D', marginBottom: 16 }}>
            🎯 {oportunidades.length} Oportunidade{oportunidades.length > 1 ? 's' : ''} Encontrada{oportunidades.length > 1 ? 's' : ''}
          </div>
          {oportunidades.map((op, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, border: `2px solid ${op.cor}22`, borderLeft: `5px solid ${op.cor}`, padding: '20px 24px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0B1F4D', marginBottom: 4 }}>
                    {op.icon} {op.tese}
                    <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: op.risco === 'baixo' ? '#dcfce7' : '#fef9c3', color: op.risco === 'baixo' ? '#166534' : '#854d0e' }}>
                      risco {op.risco}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 560 }}>{op.descricao}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Média mensal</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: op.cor }}>{fmtR(op.mediaMensal)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {op.projecoes.map((p, j) => (
                  <div key={j} style={{ flex: '1 1 110px', minWidth: 110, padding: '12px 16px', textAlign: 'center', background: j === 3 ? op.cor + '12' : '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{p.label}</div>
                    <div style={{ fontSize: j === 3 ? 18 : 15, fontWeight: j === 3 ? 900 : 700, color: j === 3 ? op.cor : '#1e293b' }}>{fmtR(p.valor)}</div>
                    {j === 3 && <div style={{ fontSize: 10, color: op.cor, fontWeight: 700, marginTop: 2 }}>★ POTENCIAL MÁXIMO</div>}
                  </div>
                ))}
              </div>
              {op.ncms?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>NCMs:</span>
                  {op.ncms.map((n, j) => <span key={j} style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 6, color: '#374151', fontWeight: 600 }}>{n}</span>)}
                </div>
              )}
              {op.produtos?.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>Ex: {op.produtos.join(' · ')}</div>}
            </div>
          ))}
          <div style={{ background: 'linear-gradient(135deg, #0B1F4D, #163B8C)', borderRadius: 14, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: '#7CC4FF', fontWeight: 700, marginBottom: 4 }}>POTENCIAL TOTAL IDENTIFICADO</div>
              <div style={{ fontSize: 12, color: '#93c5fd' }}>{oportunidades.length} teses · {nfes?.length || 0} NF-e analisadas</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#4ade80' }}>{fmtR(totalPotencial)}</div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14, padding: '24px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>✅ Nenhuma irregularidade detectada</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Os XMLs analisados não indicam oportunidades tributárias evidentes.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${scoreCor}33`, padding: '24px', textAlign: 'center', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>📊 SCORE FISCAL</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: scoreCor, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>de 100 pontos</div>
          <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, marginBottom: 10 }}>
            <div style={{ background: scoreCor, borderRadius: 99, height: 8, width: `${score}%`, transition: 'width 1s' }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: scoreCor }}>{scoreLabel}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${criticos.length > 0 ? '#fecdd3' : '#e2e8f0'}`, padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>⏳ PRAZOS PRESCRICIONAIS</div>
          {criticos.length === 0 ? (
            <div style={{ fontSize: 15, color: '#16a34a', fontWeight: 700, marginTop: 16 }}>✅ Nenhum prazo crítico nos próximos 12 meses</div>
          ) : (
            <>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#dc2626', marginBottom: 12 }}>{criticos.length} crítico(s)</div>
              {criticos.slice(0, 4).map((c, i) => (
                <div key={i} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>{c.competencia} — {c.tributo}</div>
                  <div style={{ color: '#64748b' }}>Vence em <strong>{c.dias} dias</strong> ({c.lim.toLocaleDateString('pt-BR')})</div>
                  <div style={{ color: '#16a34a', fontWeight: 600 }}>{fmtR(c.credito)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px', marginBottom: 20, boxSizing: 'border-box' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0B1F4D', marginBottom: 16 }}>🎯 Próximas ações recomendadas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <button onClick={onDiagnostico} style={{ padding: '14px 20px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#1e40af', cursor: 'pointer', textAlign: 'left' }}>📋 Gerar diagnóstico completo</button>
          <button onClick={onRelatorio}   style={{ padding: '14px 20px', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#166534', cursor: 'pointer', textAlign: 'left' }}>📄 Emitir relatório executivo</button>
        </div>
      </div>

      {!criado ? (
        <button onClick={iniciarRecuperacao} disabled={criando || potencialFinal === 0}
          style={{ width: '100%', padding: '18px 0', background: potencialFinal > 0 ? 'linear-gradient(135deg, #0B1F4D, #163B8C)' : '#e2e8f0', color: potencialFinal > 0 ? '#fff' : '#94a3b8', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 900, cursor: potencialFinal > 0 ? 'pointer' : 'default' }}>
          {criando ? '⏳ Criando processo...' : potencialFinal > 0 ? `🚀 Iniciar processo de recuperação — ${fmtR(potencialFinal)}` : '⚠️ Nenhum crédito identificado'}
        </button>
      ) : (
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>✅ Processo de recuperação criado!</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Acesse <strong>Recuperação → Recuperações</strong> para acompanhar.</div>
        </div>
      )}
    </div>
  )
}

const ABAS = [
  { id:'nfe',     icon:'🧾', label:'XML NF-e em lote'   },
  { id:'pgdas',   icon:'📋', label:'PGDAS-D'            },
  { id:'das',     icon:'💳', label:'DAS Pagos'          },
  { id:'dctfweb', icon:'📑', label:'DCTFWeb'            },
  { id:'sped_f',  icon:'📂', label:'SPED Fiscal'        },
  { id:'sped_c',  icon:'📂', label:'SPED Contribuições' },
  { id:'ecd',     icon:'📊', label:'ECD'                },
  { id:'ecf',     icon:'📈', label:'ECF'                },
  { id:'debitos', icon:'⚠️', label:'Extrato de Débitos' },
]

export default function CentralImportacoes({ abaInicial = 'nfe', onDiagnostico, onRelatorio, onRecuperacao }) {
  const [aba,              setAba]              = useState(abaInicial)
  const [clientes,         setClientes]         = useState([])
  const [clienteId,        setClienteId]        = useState('')
  const [entradas,         setEntradas]         = useState([])
  const [salvo,            setSalvo]            = useState(false)
  const [origem,           setOrigem]           = useState('Manual')
  const [nfesLidas,        setNfesLidas]        = useState([])
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)
  const [relatorios,       setRelatorios]       = useState([])
  const [relatorioAberto,  setRelatorioAberto]  = useState(null)
  const [carregando,       setCarregando]       = useState(false)
  const [usuarioId,        setUsuarioId]        = useState(null)

  useEffect(() => { setAba(abaInicial) }, [abaInicial])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUsuarioId(user.id)
      supabase.from('clientes').select('id,razao_social,regime,cnpj').eq('usuario_id', user.id).order('razao_social')
        .then(({ data }) => setClientes(data || []))
      carregarRelatorios(user.id)
    })
  }, [])

  async function carregarRelatorios(uid) {
    const { data } = await supabase
      .from('relatorios_importacao')
      .select('id,cliente_nome,cliente_regime,origem,total_nfes,periodo_inicio,periodo_fim,oportunidades_count,potencial_total,created_at')
      .eq('usuario_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    setRelatorios(data || [])
  }

  async function abrirRelatorio(id) {
    setCarregando(true)
    setRelatorioAberto(null)
    setSalvo(false)
    setMostrarRelatorio(false)
    const { data } = await supabase.from('relatorios_importacao').select('*').eq('id', id).single()
    if (data) setRelatorioAberto(data)
    setCarregando(false)
  }

  async function apagarRelatorio(id) {
    if (!confirm('Apagar este relatório? Esta ação não pode ser desfeita.')) return
    await supabase.from('relatorios_importacao').delete().eq('id', id)
    if (relatorioAberto?.id === id) setRelatorioAberto(null)
    if (usuarioId) carregarRelatorios(usuarioId)
  }

  useEffect(() => { if (clienteId) carregarEntradas() }, [clienteId])

  async function carregarEntradas() {
    const { data } = await supabase.from('entradas').select('*').eq('cliente_id', clienteId)
    setEntradas(data || [])
  }

  async function onSalvo(origemImp, nfes) {
    setSalvo(true)
    setOrigem(origemImp)
    setRelatorioAberto(null)
    const clienteAtual = clientes.find(c => c.id === clienteId)

    if (nfes && nfes.length > 0) {
      setNfesLidas(nfes)
      setMostrarRelatorio(true)
      if (usuarioId && clienteId) {
        const resultadoMotor = await MotorInteligenciaTributaria.analisar(nfes, clienteAtual)
        console.log('MOTOR RESULTADO:', JSON.stringify(resultadoMotor?.status), 'módulos:', resultadoMotor?.modulosExecutados, 'oportunidades:', resultadoMotor?.consolidado?.oportunidades?.length)
        console.log('DETALHES:', JSON.stringify(resultadoMotor?.resultados?.map(r => ({ modulo: r.modulo, status: r.status, credito: r.calculos?.creditoEstimado, erro: r.erro }))))
        const oportunidades = resultadoMotor.consolidado?.oportunidades || []
        await salvarRelatorio({ usuarioId, clienteId, cliente: clienteAtual, origem: origemImp, nfes, oportunidades })

        const agrupadas = agruparNFePorCompetencia(nfes)
        const competenciasOrdenadas = agrupadas.map(a => a.competencia).sort()
        await salvarOportunidadesEmEntradas({
          clienteId,
          usuarioId,
          resultadoMotor,
          competenciaInicioGeral: competenciasOrdenadas[0] || '',
          competenciaFimGeral: competenciasOrdenadas[competenciasOrdenadas.length - 1] || '',
          totalNfesGeral: nfes.length,
        })

        carregarRelatorios(usuarioId)
      }
    } else {
      if (usuarioId && clienteId) {
        await supabase.from('relatorios_importacao').insert({
          usuario_id: usuarioId,
          cliente_id: clienteId,
          cliente_nome: clienteAtual?.razao_social || '',
          cliente_cnpj: clienteAtual?.cnpj || '',
          cliente_regime: clienteAtual?.regime || '',
          origem: origemImp,
          total_nfes: 0,
          periodo_inicio: '',
          periodo_fim: '',
          total_faturamento: 0,
          total_impostos: 0,
          oportunidades_count: 0,
          potencial_total: 0,
          dados_json: { nfes: [], oportunidades: [], agrupadas: [] },
        })
        carregarRelatorios(usuarioId)
      }
    }
    carregarEntradas()
  }

  const cliente             = clientes.find(c => c.id === clienteId)
  const oportunidadesAtivas = nfesLidas.length > 0 ? detectarOportunidades(nfesLidas, cliente?.regime || 'Simples Nacional') : []
  const nfesHistorico          = relatorioAberto?.dados_json?.nfes         || []
  const oportunidadesHistorico = relatorioAberto?.dados_json?.oportunidades || []
  const clienteHistorico       = relatorioAberto ? { razao_social: relatorioAberto.cliente_nome, cnpj: relatorioAberto.cliente_cnpj, regime: relatorioAberto.cliente_regime } : null

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px 40px', boxSizing: 'border-box' }}>
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '32px 36px', marginBottom: 28, color: '#fff', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — AUTOMAÇÃO FISCAL</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>💼 Gestão de Recuperações</h1>
        <p style={{ fontSize: 15, color: '#93c5fd', marginBottom: 24, maxWidth: 560 }}>
          Importe arquivos fiscais e receba o <strong style={{ color: '#4ade80' }}>Raio-X Tributário Automático</strong> com as oportunidades do seu cliente.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14 }}>
          {[{ v:'NCM', l:'Monofásicos' },{ v:'CST/CFOP', l:'Substituição Tributária' },{ v:'Teses', l:'Motor automático' },{ v:'⚡ Raio-X', l:'Potencial em R$' }].map((c,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', border:'1px solid rgba(255,255,255,0.1)', minWidth: 0, boxSizing: 'border-box' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#7CC4FF', marginBottom:4 }}>{c.v}</div>
              <div style={{ fontSize:11, color:'#93c5fd' }}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>

      {relatorios.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 20, boxSizing: 'border-box' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', marginBottom: 14 }}>🗂️ Relatórios Anteriores</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {relatorios.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: relatorioAberto?.id === r.id ? '#eff6ff' : '#f8fafc', border: `1px solid ${relatorioAberto?.id === r.id ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.cliente_nome} <span style={{ fontWeight: 400, color: '#94a3b8' }}>· {r.origem}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {r.periodo_inicio} a {r.periodo_fim} · {r.total_nfes} NF-e · {r.oportunidades_count} oportunidade(s) · Potencial: {fmtR(r.potencial_total)}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{new Date(r.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <button onClick={() => abrirRelatorio(r.id)} disabled={carregando}
                  style={{ padding: '6px 14px', background: '#0B1F4D', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {carregando ? '⏳' : '📂 Abrir'}
                </button>
                <button onClick={() => apagarRelatorio(r.id)}
                  style={{ padding: '6px 10px', background: '#fff1f2', color: '#dc2626', border: '1px solid #fecdd3', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {relatorioAberto && nfesHistorico.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>📋 Exibindo relatório salvo — {relatorioAberto.cliente_nome}</div>
            <button onClick={() => setRelatorioAberto(null)}
              style={{ padding: '6px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
              ✕ Fechar
            </button>
          </div>
          <RelatorioImportacao cliente={clienteHistorico} nfes={nfesHistorico} origem={relatorioAberto.origem} oportunidades={oportunidadesHistorico} />
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 20, boxSizing: 'border-box' }}>
        <label style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', display: 'block', marginBottom: 10 }}>👤 Cliente para importação:</label>
        <select value={clienteId} onChange={e => { setClienteId(e.target.value); setSalvo(false); setNfesLidas([]); setMostrarRelatorio(false); setRelatorioAberto(null) }}
          style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc', boxSizing: 'border-box' }}>
          <option value="">— Selecione um cliente —</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} ({c.regime})</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setSalvo(false); setMostrarRelatorio(false) }}
            style={{ padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${aba===a.id?'#0B1F4D':'#e2e8f0'}`, background: aba===a.id?'#0B1F4D':'#fff', color: aba===a.id?'#fff':'#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {!clienteId ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um cliente para começar</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Após a importação, o Raio-X Tributário será gerado automaticamente</div>
        </div>
      ) : (
        <>
          {aba==='nfe'     && <AbaXMLNFe    clienteId={clienteId} cliente={cliente} onSalvo={(nfes) => onSalvo('XML NF-e', nfes)} />}
          {aba==='pgdas'   && <AbaPGDAS     clienteId={clienteId} cliente={cliente} onSalvo={() => onSalvo('PGDAS-D')} />}
          {aba==='das'     && <AbaDAS       clienteId={clienteId}                   onSalvo={() => onSalvo('DAS')} />}
          {aba==='dctfweb' && <AbaDCTFWeb   clienteId={clienteId} cliente={cliente} onSalvo={() => onSalvo('DCTFWeb')} />}
          {aba==='sped_f'  && <AbaSPED      clienteId={clienteId} cliente={cliente} tipo="SPED Fiscal"        onSalvo={() => onSalvo('SPED Fiscal')} />}
          {aba==='sped_c'  && <AbaSPED      clienteId={clienteId} cliente={cliente} tipo="SPED Contribuições" onSalvo={() => onSalvo('SPED Contribuições')} />}
          {aba==='ecd'     && <AbaECDECF    clienteId={clienteId} cliente={cliente} tipo="ECD"               onSalvo={() => onSalvo('ECD')} />}
          {aba==='ecf'     && <AbaECDECF    clienteId={clienteId} cliente={cliente} tipo="ECF"               onSalvo={() => onSalvo('ECF')} />}
          {aba==='debitos' && <AbaDebitos   clienteId={clienteId} cliente={cliente}                          onSalvo={() => onSalvo('Extrato Débitos')} />}

          {mostrarRelatorio && nfesLidas.length > 0 && (
            <RelatorioImportacao cliente={cliente} nfes={nfesLidas} origem={origem} oportunidades={oportunidadesAtivas} />
          )}

          {salvo && (
            <RaioXTributario
              clienteId={clienteId} cliente={cliente} entradas={entradas} nfes={nfesLidas} origem={origem}
              onIniciarRecuperacao={onRecuperacao} onDiagnostico={onDiagnostico} onRelatorio={onRelatorio}
            />
          )}
        </>
      )}
    </div>
  )
}

function AbaXMLNFe({ clienteId, cliente, onSalvo }) {
  const inputRef = useRef()
  const [nfes, setNfes] = useState([]); const [erros, setErros] = useState([]); const [salvando, setSalvando] = useState(false); const [salvo, setSalvo] = useState(false); const [dragOver, setDragOver] = useState(false)

  function processarArquivos(files) {
    setSalvo(false)
    const novos = [], novosErros = []
    let pendentes = files.length
    Array.from(files).forEach(f => {
      if (!f.name.endsWith('.xml')) { novosErros.push(`${f.name}: não é XML`); pendentes--; return }
      const reader = new FileReader()
      reader.onload = e => {
        const r = parseXMLNFe(e.target.result)
        if (r.valido) novos.push({ ...r, arquivo: f.name })
        else novosErros.push(`${f.name}: NF-e não reconhecida`)
        pendentes--
        if (!pendentes) { setNfes(p => [...p, ...novos]); setErros(p => [...p, ...novosErros]) }
      }
      reader.readAsText(f, 'UTF-8')
    })
  }

  const agrupadas = agruparNFePorCompetencia(nfes)
  const oportunidadesPreview = nfes.length > 0 ? detectarOportunidades(nfes, cliente?.regime || 'Simples Nacional') : []

  async function salvarEntradas() {
    setSalvando(true)
    try {
      setSalvo(true)
      if (onSalvo) onSalvo(nfes)
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <div onDragOver={e=>{ e.preventDefault(); setDragOver(true) }} onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{ e.preventDefault(); setDragOver(false); processarArquivos(e.dataTransfer.files) }}
        onClick={()=>inputRef.current.click()}
        style={{ background:dragOver?'#eff6ff':'#f8fafc', border:`3px dashed ${dragOver?'#3b82f6':'#e2e8f0'}`, borderRadius:16, padding:'48px 32px', textAlign:'center', cursor:'pointer', marginBottom:24, boxSizing: 'border-box' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🧾</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#0B1F4D', marginBottom:8 }}>Arraste os XMLs de NF-e aqui</div>
        <div style={{ fontSize:14, color:'#64748b', marginBottom:16 }}>Múltiplos arquivos · Leitura de NCM, CST, CFOP automática</div>
        <div style={{ display:'inline-block', padding:'10px 24px', background:'#0B1F4D', color:'#fff', borderRadius:8, fontSize:14, fontWeight:700 }}>📂 Selecionar XMLs</div>
        <input ref={inputRef} type="file" accept=".xml" multiple style={{ display:'none' }} onChange={e=>processarArquivos(e.target.files)} />
      </div>
      {erros.length > 0 && <ErroBanner erros={erros} />}
      {nfes.length > 0 && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:14, marginBottom:20 }}>
            {[
              { label:'NF-e lidas',  valor:nfes.length,                                      cor:'#0B1F4D' },
              { label:'Faturamento', valor:fmtR(nfes.reduce((s,n)=>s+n.vNF,0)),              cor:'#16a34a' },
              { label:'ICMS+ST',     valor:fmtR(nfes.reduce((s,n)=>s+n.vICMS+n.vST,0)),     cor:'#d97706' },
              { label:'PIS+COFINS',  valor:fmtR(nfes.reduce((s,n)=>s+n.vPIS+n.vCOFINS,0)), cor:'#7c3aed' },
            ].map((c,i)=>(
              <div key={i} style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:'16px 20px', minWidth: 0, boxSizing: 'border-box' }}>
                <div style={{ fontSize:18, fontWeight:800, color:c.cor }}>{c.valor}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{c.label}</div>
              </div>
            ))}
          </div>
          {oportunidadesPreview.length > 0 && (
            <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#166534', marginBottom:12 }}>
                ⚡ {oportunidadesPreview.length} oportunidade(s) — Potencial: {fmtR(oportunidadesPreview.reduce((s,o)=>s+o.potencial,0))}
              </div>
              {oportunidadesPreview.map((op,i)=>(
                <div key={i} style={{ fontSize:13, color:'#166534', marginBottom:4, display:'flex', justifyContent:'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <span>✓ {op.tese}</span><span style={{ fontWeight:700 }}>{fmtR(op.potencial)}</span>
                </div>
              ))}
            </div>
          )}
          {salvo ? <SalvoRaioX /> : <BotoesAcao onLimpar={()=>{ setNfes([]); setErros([]) }} onSalvar={salvarEntradas} salvando={salvando} />}
        </div>
      )}
    </div>
  )
}

function AbaPGDAS({ clienteId, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null); const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false); const [salvo, setSalvo] = useState(false)
  function processarArquivo(file) { setSalvo(false); setErro(''); const reader = new FileReader(); reader.onload = e => { const r = parsePGDAS(e.target.result); if (r.valido) setDados(r); else setErro('XML não reconhecido como PGDAS-D.') }; reader.readAsText(file, 'UTF-8') }
  async function salvarDados() { setSalvando(true); try { await supabase.from('entradas').upsert({ cliente_id:clienteId, competencia:dados.competencia, tributo:'DAS', receita_bruta:dados.receitaBruta, tributo_pago:dados.dasDevido, tributo_devido:dados.dasDevido, credito:0, tipo_oportunidade:'', risco:'baixo' }, { onConflict:'cliente_id,competencia,tributo' }); setSalvo(true); if (onSalvo) onSalvo() } catch { setErro('Erro ao salvar.') } finally { setSalvando(false) } }
  return <AbaUpload icon="📋" titulo="Importar PGDAS-D em XML" sub="Arquivo XML exportado do portal do Simples Nacional" accept=".xml" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div><GridCards items={[{label:'Competência',valor:dados.competencia},{label:'Receita Bruta',valor:fmtR(dados.receitaBruta)},{label:'DAS Devido',valor:fmtR(dados.dasDevido)},{label:'Alíquota',valor:dados.aliquota?`${dados.aliquota.toFixed(2)}%`:'—'}]} /><div style={{ marginTop:16 }}>{salvo?<SalvoRaioX />:<BotoesAcao onLimpar={()=>setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div></div>}
  </AbaUpload>
}

function AbaDAS({ clienteId, onSalvo }) {
  const [linhas, setLinhas] = useState([{competencia:'',valor:'',situacao:'pago'}])
  const [salvando, setSalvando] = useState(false); const [salvo, setSalvo] = useState(false)
  const mask = v => { const n=v.replace(/\D/g,''); if(!n) return ''; return (parseFloat(n)/100).toLocaleString('pt-BR',{minimumFractionDigits:2}) }
  const upd = (i,k,v) => setLinhas(p=>p.map((l,j)=>j===i?{...l,[k]:v}:l))
  async function salvar() {
    const val = linhas.filter(l=>l.competencia&&l.valor)
    if (!val.length) { alert('Preencha ao menos uma linha.'); return }
    setSalvando(true)
    try {
      for (const l of val) {
        const v = parseFloat(l.valor.replace(/\./g,'').replace(',','.')) || 0
        await supabase.from('entradas').upsert({ cliente_id:clienteId, competencia:l.competencia, tributo:'DAS', receita_bruta:0, tributo_pago:v, tributo_devido:v, credito:0, tipo_oportunidade:'', risco:'baixo' }, { onConflict:'cliente_id,competencia,tributo' })
      }
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }
  return <div>
    <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:'24px 28px', marginBottom:20, boxSizing: 'border-box' }}>
      <div style={{ fontSize:15, fontWeight:700, color:'#0B1F4D', marginBottom:20 }}>💳 Registrar DAS Pagos</div>
      {linhas.map((l,i)=>(
        <div key={i} style={{ display:'flex', flexWrap: 'wrap', gap:10, marginBottom:10, alignItems:'center' }}>
          <input type="month" value={l.competencia} onChange={e=>upd(i,'competencia',e.target.value)} style={{ ...IS, flex: '1 1 140px' }} />
          <input value={l.valor} onChange={e=>upd(i,'valor',mask(e.target.value))} placeholder="0,00" style={{ ...IS, flex: '1 1 140px' }} />
          <select value={l.situacao} onChange={e=>upd(i,'situacao',e.target.value)} style={{ ...IS, flex: '1 1 140px' }}>
            <option value="pago">✅ Pago</option><option value="pendente">⏳ Pendente</option><option value="atraso">🔴 Em atraso</option>
          </select>
          <button onClick={()=>setLinhas(p=>p.filter((_,j)=>j!==i))} style={{ padding:'10px 14px', background:'#fff1f2', border:'1px solid #fecdd3', color:'#dc2626', borderRadius:8, cursor:'pointer', fontWeight:700, flexShrink: 0 }}>✕</button>
        </div>
      ))}
      <button onClick={()=>setLinhas(p=>[...p,{competencia:'',valor:'',situacao:'pago'}])} style={{ padding:'10px 20px', background:'#f8fafc', border:'2px dashed #e2e8f0', color:'#64748b', borderRadius:8, fontSize:14, cursor:'pointer', fontWeight:600, width:'100%', marginTop:8, boxSizing: 'border-box' }}>+ Adicionar competência</button>
    </div>
    {salvo?<SalvoRaioX />:<button onClick={salvar} disabled={salvando} style={{ ...BP, width:'100%' }}>{salvando?'Salvando...':'💾 Salvar DAS'}</button>}
  </div>
}

function AbaDCTFWeb({ clienteId, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null); const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false); const [salvo, setSalvo] = useState(false)
  function processarArquivo(file) { setSalvo(false); setErro(''); const r = new FileReader(); r.onload = e => { const d = parseDCTFWeb(e.target.result); if (d.valido) setDados(d); else setErro('Arquivo não reconhecido como DCTFWeb.') }; r.readAsText(file,'UTF-8') }
  async function salvarDados() { setSalvando(true); try { await supabase.from('entradas').upsert({ cliente_id:clienteId, competencia:dados.competencia, tributo:'DCTFWeb', receita_bruta:0, tributo_pago:dados.totalRecolher, tributo_devido:dados.totalDebito, credito:Math.max(0,dados.totalCredito-dados.totalDebito), tipo_oportunidade:'', risco:'baixo' },{ onConflict:'cliente_id,competencia,tributo' }); setSalvo(true); if(onSalvo) onSalvo() } catch { setErro('Erro ao salvar.') } finally { setSalvando(false) } }
  return <AbaUpload icon="📑" titulo="Importar DCTFWeb" sub="Arquivo XML do e-CAC" accept=".xml" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div><GridCards items={[{label:'Competência',valor:dados.competencia},{label:'Total Débitos',valor:fmtR(dados.totalDebito)},{label:'Total Créditos',valor:fmtR(dados.totalCredito)},{label:'A Recolher',valor:fmtR(dados.totalRecolher)}]} /><div style={{marginTop:16}}>{salvo?<SalvoRaioX />:<BotoesAcao onLimpar={()=>setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div></div>}
  </AbaUpload>
}

function AbaSPED({ clienteId, tipo, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null); const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false); const [salvo, setSalvo] = useState(false)
  function processarArquivo(file) { setSalvo(false); setErro(''); const r=new FileReader(); r.onload=e=>{ const d=parseSPED(e.target.result,tipo); if(d.valido) setDados(d); else setErro(`Arquivo não reconhecido como ${tipo}.`) }; r.readAsText(file,'UTF-8') }
  async function salvarDados() { setSalvando(true); try { const tributo=tipo==='SPED Fiscal'?'ICMS':'PIS/COFINS'; const pago=tipo==='SPED Fiscal'?dados.totalICMS:dados.totalPIS+dados.totalCOFINS; await supabase.from('entradas').upsert({ cliente_id:clienteId, competencia:dados.competencia, tributo, receita_bruta:dados.totalSaidas, tributo_pago:pago, tributo_devido:pago, credito:0, tipo_oportunidade:'', risco:'baixo' },{onConflict:'cliente_id,competencia,tributo'}); setSalvo(true); if(onSalvo) onSalvo() } catch { setErro('Erro.') } finally { setSalvando(false) } }
  return <AbaUpload icon="📂" titulo={`Importar ${tipo}`} sub={`Arquivo TXT do ${tipo}`} accept=".txt" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div><GridCards items={[{label:'Competência',valor:dados.competencia||'—'},{label:'Linhas lidas',valor:dados.linhasLidas.toLocaleString()},{label:'Total Entradas',valor:fmtR(dados.totalEntradas)},{label:'Total Saídas',valor:fmtR(dados.totalSaidas)}]} /><div style={{marginTop:16}}>{salvo?<SalvoRaioX />:<BotoesAcao onLimpar={()=>setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div></div>}
  </AbaUpload>
}

function AbaECDECF({ clienteId, tipo, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null); const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false); const [salvo, setSalvo] = useState(false)
  function processarArquivo(file) { setSalvo(false); setErro(''); const r=new FileReader(); r.onload=e=>{ const d=parseECDECF(e.target.result,tipo); if(d.valido) setDados(d); else setErro(`Arquivo não reconhecido como ${tipo}.`) }; r.readAsText(file,'UTF-8') }
  async function salvarDados() { setSalvando(true); try { await supabase.from('entradas').upsert({ cliente_id:clienteId, competencia:dados.competencia, tributo:tipo==='ECF'?'IRPJ/CSLL':'ECD', receita_bruta:dados.totalReceita, tributo_pago:dados.irpj+dados.csll, tributo_devido:dados.irpj+dados.csll, credito:0, tipo_oportunidade:'', risco:'baixo' },{onConflict:'cliente_id,competencia,tributo'}); setSalvo(true); if(onSalvo) onSalvo() } catch { setErro('Erro.') } finally { setSalvando(false) } }
  return <AbaUpload icon={tipo==='ECF'?'📈':'📊'} titulo={`Importar ${tipo}`} sub={`Arquivo TXT do ${tipo}`} accept=".txt" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div><GridCards items={[{label:'Competência',valor:dados.competencia||'—'},{label:'Total Receita',valor:fmtR(dados.totalReceita)},{label:'IRPJ',valor:fmtR(dados.irpj)},{label:'CSLL',valor:fmtR(dados.csll)}]} /><div style={{marginTop:16}}>{salvo?<SalvoRaioX />:<BotoesAcao onLimpar={()=>setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div></div>}
  </AbaUpload>
}

function AbaDebitos({ clienteId, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null); const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false); const [salvo, setSalvo] = useState(false)
  function processarArquivo(file) { setSalvo(false); setErro(''); const r=new FileReader(); r.onload=e=>{ const d=parseExtratoDebitos(e.target.result); if(d.valido) setDados(d); else setErro('Nenhum débito identificado.') }; r.readAsText(file,'UTF-8') }
  async function salvarDados() { setSalvando(true); try { for(const d of dados.debitos){ await supabase.from('entradas').upsert({ cliente_id:clienteId, competencia:new Date().toISOString().slice(0,7), tributo:d.tributo, receita_bruta:0, tributo_pago:0, tributo_devido:d.valor, credito:0, tipo_oportunidade:'Débito em aberto', risco:'alto' },{onConflict:'cliente_id,competencia,tributo'}) } setSalvo(true); if(onSalvo) onSalvo() } catch { setErro('Erro.') } finally { setSalvando(false) } }
  return <AbaUpload icon="⚠️" titulo="Importar Extrato de Débitos" sub="Arquivo TXT ou CSV do e-CAC / PGFN" accept=".txt,.csv" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#dc2626', marginBottom:12 }}>⚠️ {dados.debitos.length} débito(s) — Total: {fmtR(dados.totalDebito)}</div>
        {dados.debitos.map((d,i)=><div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #fecdd3', fontSize:13, flexWrap: 'wrap', gap: 4 }}><span style={{ color:'#dc2626', fontWeight:600 }}>{d.tributo} — {d.situacao}</span><span style={{ fontWeight:800, color:'#dc2626' }}>{fmtR(d.valor)}</span></div>)}
      </div>
      {salvo?<SalvoRaioX />:<BotoesAcao onLimpar={()=>setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
    </div>}
  </AbaUpload>
}

function AbaUpload({ icon, titulo, sub, accept, onFile, inputRef, erro, children }) {
  const [dragOver, setDragOver] = useState(false)
  return <div>
    <div onDragOver={e=>{ e.preventDefault(); setDragOver(true) }} onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{ e.preventDefault(); setDragOver(false); if(e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]) }}
      onClick={()=>inputRef.current.click()}
      style={{ background:dragOver?'#eff6ff':'#f8fafc', border:`3px dashed ${dragOver?'#3b82f6':'#e2e8f0'}`, borderRadius:16, padding:'40px 32px', textAlign:'center', cursor:'pointer', marginBottom:24, boxSizing: 'border-box' }}>
      <div style={{ fontSize:44, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:17, fontWeight:800, color:'#0B1F4D', marginBottom:6 }}>{titulo}</div>
      <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>{sub}</div>
      <div style={{ display:'inline-block', padding:'10px 24px', background:'#0B1F4D', color:'#fff', borderRadius:8, fontSize:14, fontWeight:700 }}>📂 Selecionar arquivo</div>
      <input ref={inputRef} type="file" accept={accept} style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) onFile(e.target.files[0]) }} />
    </div>
    {erro && <ErroBanner erros={[erro]} />}
    {children}
  </div>
}

function GridCards({ items }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:14 }}>
    {items.map((c,i)=><div key={i} style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginBottom:4 }}>{c.label}</div>
      <div style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>{c.valor}</div>
    </div>)}
  </div>
}

function ErroBanner({ erros }) {
  return <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:12, padding:'14px 20px', marginBottom:20 }}>
    {erros.map((e,i)=><div key={i} style={{ fontSize:13, color:'#dc2626', marginBottom:4 }}>⚠️ {e}</div>)}
  </div>
}

function BotoesAcao({ onLimpar, onSalvar, salvando }) {
  return <div style={{ display:'flex', gap:12, flexWrap: 'wrap' }}>
    <button onClick={onLimpar} style={BC}>🗑️ Limpar</button>
    <button onClick={onSalvar} disabled={salvando} style={{ ...BP, flex:1, minWidth: 160 }}>{salvando?'Salvando...':'💾 Salvar e gerar Raio-X'}</button>
  </div>
}

function SalvoRaioX() {
  return <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:12, padding:'16px 24px', textAlign:'center', fontSize:15, fontWeight:700, color:'#16a34a' }}>
    ✅ Dados salvos! ⚡ Gerando Raio-X Tributário...
  </div>
}

const BP = { padding:'13px 0', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor:'pointer' }
const BC = { padding:'13px 24px', background:'#f8fafc', color:'#64748b', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }
const IS = { padding:'10px 14px', border:'2px solid #e2e8f0', borderRadius:8, fontSize:14, width:'100%', boxSizing:'border-box' }