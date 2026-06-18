import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// ─── NCMs MONOFÁSICOS (PIS/COFINS alíquota zero) ────────────────────────────
const NCM_MONOFASICOS = [
  '2701','2702','2703','2704','2705','2706','2707','2708','2709','2710','2711','2712','2713','2714','2715', // combustíveis
  '3002','3003','3004','3005','3006', // farmacêuticos
  '3303','3304','3305','3306','3307', // cosméticos/perfumaria
  '2201','2202','2203','2204','2205','2206','2207','2208','2209','2210', // bebidas
  '1001','1002','1003','1004','1005','1006','1007','1008', // cereais/trigo
  '7108','7109','7110','7111','7112', // metais preciosos
]

// ─── CSTs QUE INDICAM ST ────────────────────────────────────────────────────
const CST_ST = ['10','30','60','70','90']

// ─── CFOPs DE SAÍDA TRIBUTADA ────────────────────────────────────────────────
const CFOP_SAIDA_TRIB = ['5101','5102','5103','5104','5105','5106','6101','6102','6103','6104','5401','5402','5403','5405','6401','6402','6403','6404']
const CFOP_SERVICO    = ['5301','5302','5303','5304','5305','5306','5307','5308','5309','5310','5311','5312','5313','5314','5315','5316','6301','6302']

// ─── PARSER NF-e COMPLETO ───────────────────────────────────────────────────
function parseXMLNFe(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const get = tag => doc.querySelector(tag)?.textContent?.trim() || ''

  const dhEmi = get('dhEmi') || get('dEmi')
  const competencia = dhEmi ? dhEmi.slice(0, 7) : ''
  const vNF      = parseFloat(get('vNF')   || 0)
  const vICMS    = parseFloat(get('vICMS') || 0)
  const vPIS     = parseFloat(get('vPIS')  || 0)
  const vCOFINS  = parseFloat(get('vCOFINS') || 0)
  const vISS     = parseFloat(get('vISS')  || get('vISSQN') || 0)
  const vST      = parseFloat(get('vST')   || 0)
  const cnpjEmi  = get('CNPJ')
  const natOp    = get('natOp')

  // Itens/produtos
  const itens = []
  const dets = doc.querySelectorAll('det')
  dets.forEach(det => {
    const ncm   = det.querySelector('NCM')?.textContent?.trim() || ''
    const cfop  = det.querySelector('CFOP')?.textContent?.trim() || ''
    const cst   = det.querySelector('CST')?.textContent?.trim() || det.querySelector('CSOSN')?.textContent?.trim() || ''
    const xProd = det.querySelector('xProd')?.textContent?.trim() || ''
    const vProd = parseFloat(det.querySelector('vProd')?.textContent || 0)
    const vItemPIS    = parseFloat(det.querySelector('vPIS')?.textContent || 0)
    const vItemCOFINS = parseFloat(det.querySelector('vCOFINS')?.textContent || 0)
    const vItemICMS   = parseFloat(det.querySelector('vICMS')?.textContent || 0)
    const vItemST     = parseFloat(det.querySelector('vICMSST')?.textContent || det.querySelector('vST')?.textContent || 0)
    const pPIS        = parseFloat(det.querySelector('pPIS')?.textContent || 0)
    const pCOFINS     = parseFloat(det.querySelector('pCOFINS')?.textContent || 0)

    if (ncm || cfop) {
      itens.push({ ncm, cfop, cst, xProd, vProd, vItemPIS, vItemCOFINS, vItemICMS, vItemST, pPIS, pCOFINS })
    }
  })

  return { competencia, vNF, vICMS, vPIS, vCOFINS, vISS, vST, cnpjEmi, natOp, itens, valido: !!competencia && vNF > 0 }
}

// ─── MOTOR DE TESES AUTOMÁTICO ──────────────────────────────────────────────
function detectarOportunidades(nfes, regime) {
  const oportunidades = []
  let totalVNF = 0, totalVST = 0, totalVPIS = 0, totalVCOFINS = 0

  // Agrupa todos os itens
  const todosItens = nfes.flatMap(n => n.itens || [])
  nfes.forEach(n => { totalVNF += n.vNF; totalVST += n.vST; totalVPIS += n.vPIS; totalVCOFINS += n.vCOFINS })

  const meses = [...new Set(nfes.map(n => n.competencia))].length || 1

  // ── TESE 1: Receitas Monofásicas ──────────────────────────────────────────
  const itensMonofasicos = todosItens.filter(i => NCM_MONOFASICOS.some(ncm => i.ncm.startsWith(ncm)))
  if (itensMonofasicos.length > 0) {
    const valorMonofasico = itensMonofasicos.reduce((s, i) => s + i.vProd, 0)
    const pisCofinsIndevido = itensMonofasicos.reduce((s, i) => s + i.vItemPIS + i.vItemCOFINS, 0)
    const potencial = pisCofinsIndevido > 0 ? pisCofinsIndevido * meses : valorMonofasico * 0.0365 * meses
    const ncmsEncontrados = [...new Set(itensMonofasicos.map(i => i.ncm))].slice(0, 5)
    oportunidades.push({
      tese: 'Receitas Monofásicas',
      descricao: `${itensMonofasicos.length} produtos com NCM sujeito à alíquota zero de PIS/COFINS foram tributados indevidamente.`,
      ncms: ncmsEncontrados,
      produtos: itensMonofasicos.map(i => i.xProd).slice(0, 3),
      valorBase: valorMonofasico,
      potencial,
      meses,
      risco: 'baixo',
      cor: '#16a34a',
      icon: '💊',
    })
  }

  // ── TESE 2: ICMS-ST Indevido ──────────────────────────────────────────────
  const itensST = todosItens.filter(i => CST_ST.includes(i.cst) && i.vItemST > 0)
  if (itensST.length > 0 || totalVST > 0) {
    const valorST = itensST.reduce((s, i) => s + i.vItemST, 0) || totalVST
    const potencial = valorST * meses
    oportunidades.push({
      tese: regime === 'Simples Nacional' ? 'Exclusão ICMS-ST da Base do Simples' : 'Exclusão ICMS-ST da Base PIS/COFINS',
      descricao: `ICMS retido por Substituição Tributária identificado. No ${regime}, o ICMS-ST não compõe a base de cálculo e pode ser excluído.`,
      ncms: [...new Set(itensST.map(i => i.ncm))].slice(0, 5),
      produtos: itensST.map(i => i.xProd).slice(0, 3),
      valorBase: valorST,
      potencial,
      meses,
      risco: 'baixo',
      cor: '#2563eb',
      icon: '🏷️',
    })
  }

  // ── TESE 3: Segregação de Receitas ────────────────────────────────────────
  const itensServico = todosItens.filter(i => CFOP_SERVICO.some(c => i.cfop === c))
  const itensMercadoria = todosItens.filter(i => CFOP_SAIDA_TRIB.some(c => i.cfop === c))
  if (itensServico.length > 0 && itensMercadoria.length > 0 && regime === 'Simples Nacional') {
    const vlServicos = itensServico.reduce((s, i) => s + i.vProd, 0)
    const potencial = vlServicos * 0.02 * meses // estimativa de diferença de anexo
    oportunidades.push({
      tese: 'Segregação de Receitas por Anexo',
      descricao: `Empresa com mix de mercadorias e serviços. A segregação correta pode reduzir a alíquota efetiva do Simples Nacional.`,
      ncms: [],
      produtos: [],
      valorBase: vlServicos,
      potencial,
      meses,
      risco: 'medio',
      cor: '#7c3aed',
      icon: '📊',
    })
  }

  // ── TESE 4: Fator R ───────────────────────────────────────────────────────
  if (regime === 'Simples Nacional' && itensServico.length > 0) {
    const vlServicos = itensServico.reduce((s, i) => s + i.vProd, 0) || totalVNF
    const potencial = vlServicos * 0.05 * meses
    oportunidades.push({
      tese: 'Fator R — Migração Anexo V para III',
      descricao: `Empresa prestadora de serviços pode migrar do Anexo V para o Anexo III através do Fator R, reduzindo significativamente a carga tributária.`,
      ncms: [],
      produtos: [],
      valorBase: vlServicos,
      potencial,
      meses,
      risco: 'medio',
      cor: '#d97706',
      icon: '🔄',
    })
  }

  // ── TESE 5: PIS/COFINS tributados com alíquota incorreta ──────────────────
  const itensPisAlto = todosItens.filter(i => i.pPIS > 1.65 || i.pCOFINS > 7.6)
  if (itensPisAlto.length > 0) {
    const excesso = itensPisAlto.reduce((s, i) => {
      const pisExcesso    = Math.max(0, i.vItemPIS    - i.vProd * 0.0165)
      const cofinsExcesso = Math.max(0, i.vItemCOFINS - i.vProd * 0.076)
      return s + pisExcesso + cofinsExcesso
    }, 0)
    if (excesso > 0) {
      oportunidades.push({
        tese: 'PIS/COFINS — Alíquota Incorreta',
        descricao: `${itensPisAlto.length} produtos tributados com alíquota de PIS/COFINS acima do permitido pela legislação.`,
        ncms: [...new Set(itensPisAlto.map(i => i.ncm))].slice(0, 5),
        produtos: itensPisAlto.map(i => i.xProd).slice(0, 3),
        valorBase: excesso,
        potencial: excesso * meses,
        meses,
        risco: 'medio',
        cor: '#0d9488',
        icon: '📋',
      })
    }
  }

  return oportunidades
}

// ─── PARSERS EXISTENTES ──────────────────────────────────────────────────────
function parsePGDAS(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const competencia = doc.querySelector('periodoApuracao')?.textContent || doc.querySelector('competencia')?.textContent || ''
  const receitaBruta = parseFloat(doc.querySelector('receitaBrutaTotal')?.textContent || doc.querySelector('totalReceita')?.textContent || 0)
  const dasDevido = parseFloat(doc.querySelector('valorDevido')?.textContent || doc.querySelector('dasDevido')?.textContent || 0)
  const cnpj = doc.querySelector('cnpj')?.textContent || ''
  const razaoSocial = doc.querySelector('razaoSocial')?.textContent || ''
  const aliquota = parseFloat(doc.querySelector('aliquotaEfetiva')?.textContent || 0)
  return { competencia: competencia.slice(0, 7), receitaBruta, dasDevido, cnpj, razaoSocial, aliquota, valido: !!competencia && receitaBruta > 0 }
}

function parseDCTFWeb(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const get = tag => doc.querySelector(tag)?.textContent || ''
  const competencia = get('periodoApuracao') || get('competencia') || ''
  const totalDebito  = parseFloat(get('totalDebito')  || 0)
  const totalCredito = parseFloat(get('totalCredito') || 0)
  const totalRecolher = parseFloat(get('totalRecolher') || 0)
  return { competencia: competencia.slice(0, 7), totalDebito, totalCredito, totalRecolher, valido: !!competencia }
}

function parseSPED(txtStr, tipo) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const result = { tipo, competencia: '', cnpj: '', totalEntradas: 0, totalSaidas: 0, totalICMS: 0, totalPIS: 0, totalCOFINS: 0, linhasLidas: linhas.length, valido: false }
  linhas.forEach(linha => {
    const c = linha.split('|').filter((_, i) => i > 0)
    const reg = c[0]
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
    const c = linha.split('|').filter((_, i) => i > 0)
    const reg = c[0]
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

// ─── RAIO-X TRIBUTÁRIO ───────────────────────────────────────────────────────
function RaioXTributario({ clienteId, cliente, entradas, origem, nfes, onIniciarRecuperacao, onDiagnostico, onRelatorio }) {
  const [criando, setCriando] = useState(false)
  const [criado,  setCriado]  = useState(false)
  const hoje = new Date()

  // Oportunidades detectadas automaticamente
  const oportunidades = nfes && nfes.length > 0
    ? detectarOportunidades(nfes, cliente?.regime || 'Simples Nacional')
    : []

  const totalPotencial = oportunidades.reduce((s, o) => s + o.potencial, 0)

  // Créditos das entradas
  const totalCreditos = entradas.reduce((s, e) => s + (e.credito || 0), 0)
  const potencialFinal = Math.max(totalPotencial, totalCreditos)

  // Prazos críticos
  const criticos = entradas.filter(e => {
    if (!e.competencia || e.credito <= 0) return false
    const [a, m] = e.competencia.split('-')
    const lim = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    const dias = Math.round((lim - hoje) / (1000 * 60 * 60 * 24))
    return dias <= 365 && dias > 0
  }).map(e => {
    const [a, m] = e.competencia.split('-')
    const lim = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    return { ...e, dias: Math.round((lim - hoje) / (1000 * 60 * 60 * 24)), lim }
  })

  // Score
  const score = Math.min(100, Math.max(20,
    100
    - oportunidades.filter(o => o.risco === 'baixo').length * 15
    - oportunidades.filter(o => o.risco === 'medio').length * 8
    - criticos.length * 5
  ))
  const scoreCor   = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  const scoreLabel = score >= 80 ? 'Boa saúde tributária' : score >= 60 ? 'Atenção necessária' : 'Situação crítica'

  async function iniciarRecuperacao() {
    setCriando(true)
    try {
      await supabase.from('recuperacoes').insert({
        cliente_id: clienteId,
        competencia: new Date().toISOString().slice(0, 7),
        tributo: oportunidades[0]?.tese || 'A definir',
        valor_credito: potencialFinal,
        potencial_recuperavel: potencialFinal,
        tese_aplicada: oportunidades.map(o => o.tese).join(', '),
        risco: oportunidades.some(o => o.risco === 'baixo') ? 'baixo' : 'medio',
        origem: origem || 'Raio-X XML',
        status: 'Identificado',
        score_fiscal: score,
        observacoes: `Raio-X automático. ${oportunidades.length} oportunidades detectadas via ${origem}.`,
      })
      setCriado(true)
      if (onIniciarRecuperacao) onIniciarRecuperacao()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setCriando(false) }
  }

  return (
    <div style={{ marginTop: 32 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — ANÁLISE AUTOMÁTICA</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>⚡ Raio-X Tributário</h2>
        <div style={{ fontSize: 14, color: '#93c5fd', marginBottom: 16 }}>
          Cliente: <strong style={{ color: '#fff' }}>{cliente?.razao_social}</strong> · Regime: <strong style={{ color: '#4ade80' }}>{cliente?.regime}</strong>
        </div>
        {/* Resumo rápido */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 8 }}>
          {[
            { label: 'NF-e analisadas',       valor: nfes?.length || 0,           cor: '#7CC4FF' },
            { label: 'Oportunidades',          valor: oportunidades.length,         cor: '#4ade80' },
            { label: 'Potencial estimado',     valor: fmtR(potencialFinal),         cor: '#fbbf24' },
            { label: 'Prazos críticos',        valor: criticos.length,              cor: criticos.length > 0 ? '#f87171' : '#4ade80' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c.cor }}>{c.valor}</div>
              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* OPORTUNIDADES DETECTADAS */}
      {oportunidades.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0B1F4D', marginBottom: 16 }}>
            🎯 {oportunidades.length} Oportunidade{oportunidades.length > 1 ? 's' : ''} Tributária{oportunidades.length > 1 ? 's' : ''} Encontrada{oportunidades.length > 1 ? 's' : ''}
          </div>
          {oportunidades.map((op, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, border: `2px solid ${op.cor}22`, borderLeft: `5px solid ${op.cor}`, padding: '20px 24px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0B1F4D', marginBottom: 4 }}>
                    {op.icon} {op.tese}
                    <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: op.risco === 'baixo' ? '#dcfce7' : '#fef9c3', color: op.risco === 'baixo' ? '#166534' : '#854d0e' }}>
                      risco {op.risco}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 600 }}>{op.descricao}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Potencial estimado</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: op.cor }}>{fmtR(op.potencial)}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{op.meses} mês(es) analisado(s)</div>
                </div>
              </div>
              {/* NCMs encontrados */}
              {op.ncms.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>NCMs:</span>
                  {op.ncms.map((n, j) => (
                    <span key={j} style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 6, color: '#374151', fontWeight: 600 }}>{n}</span>
                  ))}
                </div>
              )}
              {/* Produtos */}
              {op.produtos.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                  Ex: {op.produtos.join(' · ')}
                </div>
              )}
            </div>
          ))}

          {/* Total */}
          <div style={{ background: 'linear-gradient(135deg, #0B1F4D, #163B8C)', borderRadius: 14, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
            <div>
              <div style={{ fontSize: 13, color: '#7CC4FF', fontWeight: 700, marginBottom: 4 }}>POTENCIAL TOTAL IDENTIFICADO</div>
              <div style={{ fontSize: 12, color: '#93c5fd' }}>{oportunidades.length} teses · {nfes?.length || 0} NF-e analisadas</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#4ade80' }}>{fmtR(totalPotencial)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14, padding: '24px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>✅ Nenhuma irregularidade detectada</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Os XMLs analisados não indicam oportunidades tributárias evidentes. Continue monitorando.</div>
        </div>
      )}

      {/* Score + Prazos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Score */}
        <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${scoreCor}33`, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>📊 SCORE FISCAL</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: scoreCor, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>de 100 pontos</div>
          <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, marginBottom: 10 }}>
            <div style={{ background: scoreCor, borderRadius: 99, height: 8, width: `${score}%`, transition: 'width 1s' }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: scoreCor }}>{scoreLabel}</div>
        </div>

        {/* Prazos */}
        <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${criticos.length > 0 ? '#fecdd3' : '#e2e8f0'}`, padding: '24px' }}>
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

      {/* Ações */}
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0B1F4D', marginBottom: 16 }}>🎯 Próximas ações recomendadas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <button onClick={onDiagnostico} style={{ padding: '14px 20px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#1e40af', cursor: 'pointer', textAlign: 'left' }}>
            📋 Gerar diagnóstico completo
          </button>
          <button onClick={onRelatorio} style={{ padding: '14px 20px', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#166534', cursor: 'pointer', textAlign: 'left' }}>
            📄 Emitir relatório executivo
          </button>
        </div>
      </div>

      {/* Botão Iniciar Recuperação */}
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

// ─── ABAS ───────────────────────────────────────────────────────────────────
const ABAS = [
  { id:'nfe',     icon:'🧾', label:'XML NF-e em lote',   tipo:'xml'    },
  { id:'pgdas',   icon:'📋', label:'PGDAS-D',            tipo:'xml'    },
  { id:'das',     icon:'💳', label:'DAS Pagos',          tipo:'manual' },
  { id:'dctfweb', icon:'📑', label:'DCTFWeb',            tipo:'xml'    },
  { id:'sped_f',  icon:'📂', label:'SPED Fiscal',        tipo:'txt'    },
  { id:'sped_c',  icon:'📂', label:'SPED Contribuições', tipo:'txt'    },
  { id:'ecd',     icon:'📊', label:'ECD',                tipo:'txt'    },
  { id:'ecf',     icon:'📈', label:'ECF',                tipo:'txt'    },
  { id:'debitos', icon:'⚠️', label:'Extrato de Débitos', tipo:'txt'    },
]

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function CentralImportacoes({ abaInicial = 'nfe', onDiagnostico, onRelatorio, onRecuperacao }) {
  const [aba,       setAba]       = useState(abaInicial)
  const [clientes,  setClientes]  = useState([])
  const [clienteId, setClienteId] = useState('')
  const [entradas,  setEntradas]  = useState([])
  const [salvo,     setSalvo]     = useState(false)
  const [origem,    setOrigem]    = useState('Manual')
  const [nfesLidas, setNfesLidas] = useState([])

  useEffect(() => { setAba(abaInicial) }, [abaInicial])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('clientes').select('id,razao_social,regime,cnpj').eq('usuario_id', user.id).order('razao_social')
        .then(({ data }) => setClientes(data || []))
    })
  }, [])

  useEffect(() => { if (clienteId) carregarEntradas() }, [clienteId])

  async function carregarEntradas() {
    const { data } = await supabase.from('entradas').select('*').eq('cliente_id', clienteId)
    setEntradas(data || [])
  }

  function onSalvo(origemImp, nfes) {
    setSalvo(true)
    setOrigem(origemImp)
    if (nfes) setNfesLidas(nfes)
    carregarEntradas()
  }

  const cliente = clientes.find(c => c.id === clienteId)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '32px 36px', marginBottom: 28, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — AUTOMAÇÃO FISCAL</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>📥 Central de Importações</h1>
        <p style={{ fontSize: 15, color: '#93c5fd', marginBottom: 24, maxWidth: 560 }}>
          Importe arquivos fiscais e receba o <strong style={{ color: '#4ade80' }}>Raio-X Tributário Automático</strong> com as oportunidades do seu cliente.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {[{v:'NCM',l:'Monofásicos'},{v:'CST/CFOP',l:'Substituição Tributária'},{v:'Teses',l:'Motor automático'},{v:'⚡ Raio-X',l:'Potencial em R$'}].map((c,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#7CC4FF', marginBottom:4 }}>{c.v}</div>
              <div style={{ fontSize:11, color:'#93c5fd' }}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Seletor cliente */}
      <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:'20px 24px', marginBottom:20 }}>
        <label style={{ fontSize:14, fontWeight:700, color:'#0B1F4D', display:'block', marginBottom:10 }}>👤 Cliente para importação:</label>
        <select value={clienteId} onChange={e=>{ setClienteId(e.target.value); setSalvo(false); setNfesLidas([]) }}
          style={{ width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#374151', background:'#f8fafc' }}>
          <option value="">— Selecione um cliente —</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.razao_social} ({c.regime})</option>)}
        </select>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>{ setAba(a.id); setSalvo(false) }}
            style={{ padding:'9px 14px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', border:`2px solid ${aba===a.id?'#0B1F4D':'#e2e8f0'}`, background:aba===a.id?'#0B1F4D':'#fff', color:aba===a.id?'#fff':'#374151', display:'flex', alignItems:'center', gap:6 }}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {!clienteId ? (
        <div style={{ background:'#fff', borderRadius:16, border:'2px solid #e2e8f0', padding:48, textAlign:'center', color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👆</div>
          <div style={{ fontSize:16, fontWeight:600 }}>Selecione um cliente para começar</div>
          <div style={{ fontSize:14, marginTop:8 }}>Após a importação, o Raio-X Tributário será gerado automaticamente</div>
        </div>
      ) : (
        <>
          {aba==='nfe'     && <AbaXMLNFe    clienteId={clienteId} cliente={cliente} onSalvo={(nfes)=>onSalvo('XML NF-e', nfes)} />}
          {aba==='pgdas'   && <AbaPGDAS     clienteId={clienteId} cliente={cliente} onSalvo={()=>onSalvo('PGDAS-D')} />}
          {aba==='das'     && <AbaDAS       clienteId={clienteId}                   onSalvo={()=>onSalvo('DAS')} />}
          {aba==='dctfweb' && <AbaDCTFWeb   clienteId={clienteId} cliente={cliente} onSalvo={()=>onSalvo('DCTFWeb')} />}
          {aba==='sped_f'  && <AbaSPED      clienteId={clienteId} cliente={cliente} tipo="SPED Fiscal"        onSalvo={()=>onSalvo('SPED Fiscal')} />}
          {aba==='sped_c'  && <AbaSPED      clienteId={clienteId} cliente={cliente} tipo="SPED Contribuições" onSalvo={()=>onSalvo('SPED Contribuições')} />}
          {aba==='ecd'     && <AbaECDECF    clienteId={clienteId} cliente={cliente} tipo="ECD"               onSalvo={()=>onSalvo('ECD')} />}
          {aba==='ecf'     && <AbaECDECF    clienteId={clienteId} cliente={cliente} tipo="ECF"               onSalvo={()=>onSalvo('ECF')} />}
          {aba==='debitos' && <AbaDebitos   clienteId={clienteId} cliente={cliente}                          onSalvo={()=>onSalvo('Extrato Débitos')} />}

          {salvo && (
            <RaioXTributario
              clienteId={clienteId}
              cliente={cliente}
              entradas={entradas}
              nfes={nfesLidas}
              origem={origem}
              onIniciarRecuperacao={onRecuperacao}
              onDiagnostico={onDiagnostico}
              onRelatorio={onRelatorio}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── ABA NF-e (com extração completa) ───────────────────────────────────────
function AbaXMLNFe({ clienteId, cliente, onSalvo }) {
  const inputRef = useRef()
  const [nfes,     setNfes]     = useState([])
  const [erros,    setErros]    = useState([])
  const [salvando, setSalvando] = useState(false)
  const [salvo,    setSalvo]    = useState(false)
  const [dragOver, setDragOver] = useState(false)

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

  // Preview das oportunidades antes de salvar
  const oportunidadesPreview = nfes.length > 0
    ? detectarOportunidades(nfes, cliente?.regime || 'Simples Nacional')
    : []

  async function salvarEntradas() {
    setSalvando(true)
    try {
      for (const comp of agrupadas) {
        await supabase.from('entradas').upsert({
          cliente_id: clienteId, competencia: comp.competencia, tributo: 'NF-e importada',
          receita_bruta: comp.vNF, tributo_pago: comp.vICMS + comp.vPIS + comp.vCOFINS,
          tributo_devido: comp.vICMS + comp.vPIS + comp.vCOFINS, credito: 0,
          tipo_oportunidade: '', risco: 'baixo'
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true)
      if (onSalvo) onSalvo(nfes) // passa as NF-es para o Raio-X
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <div onDragOver={e=>{ e.preventDefault(); setDragOver(true) }} onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{ e.preventDefault(); setDragOver(false); processarArquivos(e.dataTransfer.files) }}
        onClick={()=>inputRef.current.click()}
        style={{ background:dragOver?'#eff6ff':'#f8fafc', border:`3px dashed ${dragOver?'#3b82f6':'#e2e8f0'}`, borderRadius:16, padding:'48px 32px', textAlign:'center', cursor:'pointer', marginBottom:24 }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🧾</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#0B1F4D', marginBottom:8 }}>Arraste os XMLs de NF-e aqui</div>
        <div style={{ fontSize:14, color:'#64748b', marginBottom:16 }}>Múltiplos arquivos · Leitura de NCM, CST, CFOP automática</div>
        <div style={{ display:'inline-block', padding:'10px 24px', background:'#0B1F4D', color:'#fff', borderRadius:8, fontSize:14, fontWeight:700 }}>📂 Selecionar XMLs</div>
        <input ref={inputRef} type="file" accept=".xml" multiple style={{ display:'none' }} onChange={e=>processarArquivos(e.target.files)} />
      </div>

      {erros.length > 0 && <ErroBanner erros={erros} />}

      {nfes.length > 0 && (
        <div>
          {/* Totais */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
            {[
              { label:'NF-e lidas',   valor:nfes.length,                                              cor:'#0B1F4D' },
              { label:'Faturamento',  valor:fmtR(nfes.reduce((s,n)=>s+n.vNF,0)),                     cor:'#16a34a' },
              { label:'ICMS+ST',      valor:fmtR(nfes.reduce((s,n)=>s+n.vICMS+n.vST,0)),             cor:'#d97706' },
              { label:'PIS+COFINS',   valor:fmtR(nfes.reduce((s,n)=>s+n.vPIS+n.vCOFINS,0)),         cor:'#7c3aed' },
            ].map((c,i)=>(
              <div key={i} style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:'16px 20px' }}>
                <div style={{ fontSize:18, fontWeight:800, color:c.cor }}>{c.valor}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Preview oportunidades */}
          {oportunidadesPreview.length > 0 && (
            <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#166534', marginBottom:12 }}>
                ⚡ {oportunidadesPreview.length} oportunidade(s) detectada(s) — Potencial: {fmtR(oportunidadesPreview.reduce((s,o)=>s+o.potencial,0))}
              </div>
              {oportunidadesPreview.map((op,i)=>(
                <div key={i} style={{ fontSize:13, color:'#166534', marginBottom:4, display:'flex', justifyContent:'space-between' }}>
                  <span>✓ {op.tese}</span>
                  <span style={{ fontWeight:700 }}>{fmtR(op.potencial)}</span>
                </div>
              ))}
            </div>
          )}

          {salvo
            ? <SalvoRaioX />
            : <BotoesAcao onLimpar={()=>{ setNfes([]); setErros([]) }} onSalvar={salvarEntradas} salvando={salvando} />
          }
        </div>
      )}
    </div>
  )
}

// ─── ABAS RESTANTES ──────────────────────────────────────────────────────────
function AbaPGDAS({ clienteId, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro,  setErro]  = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => { const r = parsePGDAS(e.target.result); if (r.valido) setDados(r); else setErro('XML não reconhecido como PGDAS-D.') }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      await supabase.from('entradas').upsert({ cliente_id:clienteId, competencia:dados.competencia, tributo:'DAS', receita_bruta:dados.receitaBruta, tributo_pago:dados.dasDevido, tributo_devido:dados.dasDevido, credito:0, tipo_oportunidade:'', risco:'baixo' }, { onConflict:'cliente_id,competencia,tributo' })
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="📋" titulo="Importar PGDAS-D em XML" sub="Arquivo XML exportado do portal do Simples Nacional" accept=".xml" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <GridCards items={[{label:'Competência',valor:dados.competencia},{label:'Receita Bruta',valor:fmtR(dados.receitaBruta)},{label:'DAS Devido',valor:fmtR(dados.dasDevido)},{label:'Alíquota',valor:dados.aliquota?`${dados.aliquota.toFixed(2)}%`:'—'}]} />
      <div style={{ marginTop:16 }}>{salvo?<SalvoRaioX />:<BotoesAcao onLimpar={()=>setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div>
    </div>}
  </AbaUpload>
}

function AbaDAS({ clienteId, onSalvo }) {
  const [linhas,   setLinhas]   = useState([{competencia:'',valor:'',situacao:'pago'}])
  const [salvando, setSalvando] = useState(false)
  const [salvo,    setSalvo]    = useState(false)
  const mask = v => { const n=v.replace(/\D/g,''); if(!n) return ''; return (parseFloat(n)/100).toLocaleString('pt-BR',{minimumFractionDigits:2}) }
  const upd  = (i,k,v) => setLinhas(p=>p.map((l,j)=>j===i?{...l,[k]:v}:l))

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
    <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:'24px 28px', marginBottom:20 }}>
      <div style={{ fontSize:15, fontWeight:700, color:'#0B1F4D', marginBottom:20 }}>💳 Registrar DAS Pagos</div>
      {linhas.map((l,i)=>(
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:12, marginBottom:10, alignItems:'center' }}>
          <input type="month" value={l.competencia} onChange={e=>upd(i,'competencia',e.target.value)} style={IS} />
          <input value={l.valor} onChange={e=>upd(i,'valor',mask(e.target.value))} placeholder="0,00" style={IS} />
          <select value={l.situacao} onChange={e=>upd(i,'situacao',e.target.value)} style={IS}>
            <option value="pago">✅ Pago</option><option value="pendente">⏳ Pendente</option><option value="atraso">🔴 Em atraso</option>
          </select>
          <button onClick={()=>setLinhas(p=>p.filter((_,j)=>j!==i))} style={{ padding:'10px 14px', background:'#fff1f2', border:'1px solid #fecdd3', color:'#dc2626', borderRadius:8, cursor:'pointer', fontWeight:700 }}>✕</button>
        </div>
      ))}
      <button onClick={()=>setLinhas(p=>[...p,{competencia:'',valor:'',situacao:'pago'}])} style={{ padding:'10px 20px', background:'#f8fafc', border:'2px dashed #e2e8f0', color:'#64748b', borderRadius:8, fontSize:14, cursor:'pointer', fontWeight:600, width:'100%', marginTop:8 }}>+ Adicionar competência</button>
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
        {dados.debitos.map((d,i)=><div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #fecdd3', fontSize:13 }}><span style={{ color:'#dc2626', fontWeight:600 }}>{d.tributo} — {d.situacao}</span><span style={{ fontWeight:800, color:'#dc2626' }}>{fmtR(d.valor)}</span></div>)}
      </div>
      {salvo?<SalvoRaioX />:<BotoesAcao onLimpar={()=>setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
    </div>}
  </AbaUpload>
}

// ─── AUXILIARES ──────────────────────────────────────────────────────────────
function AbaUpload({ icon, titulo, sub, accept, onFile, inputRef, erro, children }) {
  const [dragOver, setDragOver] = useState(false)
  return <div>
    <div onDragOver={e=>{ e.preventDefault(); setDragOver(true) }} onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{ e.preventDefault(); setDragOver(false); if(e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]) }}
      onClick={()=>inputRef.current.click()}
      style={{ background:dragOver?'#eff6ff':'#f8fafc', border:`3px dashed ${dragOver?'#3b82f6':'#e2e8f0'}`, borderRadius:16, padding:'40px 32px', textAlign:'center', cursor:'pointer', marginBottom:24 }}>
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
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
    {items.map((c,i)=><div key={i} style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px' }}>
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
  return <div style={{ display:'flex', gap:12 }}>
    <button onClick={onLimpar} style={BC}>🗑️ Limpar</button>
    <button onClick={onSalvar} disabled={salvando} style={{ ...BP, flex:1 }}>{salvando?'Salvando...':'💾 Salvar e gerar Raio-X'}</button>
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