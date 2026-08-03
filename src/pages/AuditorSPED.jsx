/**
 * AuditorSPED.jsx — e-FiscalTribe
 * Auditor de SPED — Pente fino antes da entrega à Receita Federal.
 *
 * Funcionalidades:
 * — Importação de EFD-Contribuições, EFD-ICMS/IPI, ECD, ECF
 * — Análise linha a linha dos registros
 * — Identificação de inconsistências e erros de cálculo
 * — Relatório executivo com fundamentação legal
 * — Sugestão de correção por item
 * — Geração de arquivo SPED corrigido para erros de cálculo (com revisão)
 *
 * Versão: 1.2 — tema claro, alinhado ao design system do produto
 * Data: 2026-08-03
 */

import { useState, useRef } from 'react'
import { supabase } from '../supabase'

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const TIPOS_SPED = [
  { id: 'EFD_CONTRIB',  label: 'EFD-Contribuições',  descricao: 'PIS/COFINS — Blocos 0, A, C, D, F, M, 1, 9' },
  { id: 'EFD_ICMS_IPI', label: 'EFD-ICMS/IPI',      descricao: 'ICMS/IPI — Blocos 0, C, D, E, G, H, K, 1, 9' },
  { id: 'ECD',          label: 'ECD',                descricao: 'Escrituração Contábil Digital' },
  { id: 'ECF',          label: 'ECF',                descricao: 'Escrituração Contábil Fiscal — IRPJ/CSLL' },
]

const CATEGORIAS_ERRO = {
  CALCULO:       { label: 'Erro de Cálculo',          cor: '#DC2626' },
  CAMPO_VAZIO:   { label: 'Campo Obrigatório Vazio',  cor: '#EA580C' },
  INCONSISTENCIA:{ label: 'Inconsistência entre Blocos', cor: '#CA8A04' },
  ALIQUOTA:      { label: 'Alíquota Incorreta',       cor: '#7C3AED' },
  CFOP:          { label: 'CFOP Inválido/Incorreto',  cor: '#2563EB' },
  CST:           { label: 'CST Incorreto',            cor: '#0891B2' },
  TOTAL:         { label: 'Total Divergente',         cor: '#DB2777' },
  AVISO:         { label: 'Aviso / Atenção',          cor: '#64748B' },
}

const C = {
  bg:     '#F8FAFC',
  white:  '#FFFFFF',
  border: '#E2E8F0',
  text:   '#0F172A',
  muted:  '#64748B',
  blue:   '#2563EB',
  green:  '#16A34A',
  red:    '#DC2626',
}

// ─────────────────────────────────────────────────────────────
// PARSER SPED
// ─────────────────────────────────────────────────────────────

function parsearSPED(conteudo, tipo) {
  const linhas   = conteudo.split('\n').map(l => l.trim()).filter(Boolean)
  const registros = []

  linhas.forEach((linha, idx) => {
    if (!linha.startsWith('|')) return
    const campos = linha.split('|').filter((_, i) => i > 0 && i < linha.split('|').length - 1)
    if (campos.length === 0) return
    registros.push({
      numero:   idx + 1,
      registro: campos[0] || '',
      campos,
      linha,
    })
  })

  return registros
}

function analisarEFDContrib(registros) {
  const erros    = []
  const avisos   = []
  const resumo   = { totalRegistros: registros.length, blocos: {}, erros: 0, avisos: 0 }

  registros.forEach(r => {
    const bloco = r.registro?.[0] || '?'
    resumo.blocos[bloco] = (resumo.blocos[bloco] || 0) + 1
  })

  registros.forEach(r => {
    const reg    = r.registro
    const campos = r.campos

    if (reg === '0000') {
      if (!campos[3] || campos[3].length !== 14) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CAMPO_VAZIO', descricao: 'CNPJ inválido ou ausente no registro 0000', campo: 'Campo 4 (CNPJ)', correcao: 'Informar o CNPJ com 14 dígitos sem formatação', fundamentacao: 'Guia Prático EFD-Contribuições — Registro 0000' })
      }
      if (!campos[8]) {
        avisos.push({ linha: r.numero, registro: reg, categoria: 'AVISO', descricao: 'Indicador de situação especial não informado', campo: 'Campo 9 (IND_SIT_ESP)', correcao: 'Verificar se a empresa está em situação especial no período' })
      }
    }

    if (reg === 'C100') {
      const vNF   = parseFloat(campos[9]?.replace(',', '.') || 0)
      const vFrete= parseFloat(campos[11]?.replace(',', '.') || 0)
      const vSeg  = parseFloat(campos[12]?.replace(',', '.') || 0)
      const vOut  = parseFloat(campos[13]?.replace(',', '.') || 0)
      const vBC   = parseFloat(campos[14]?.replace(',', '.') || 0)

      if (!campos[4] || campos[4].length < 5) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CAMPO_VAZIO', descricao: 'Chave de acesso da NF-e ausente ou incompleta', campo: 'Campo 5 (CHV_NFE)', correcao: 'Informar a chave de acesso completa com 44 dígitos', fundamentacao: 'Guia Prático EFD-Contribuições — Registro C100' })
      }

      if (vNF > 0 && vBC > vNF + vFrete + vSeg + vOut + 1) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `Base de cálculo (${fmtVal(vBC)}) maior que o valor da NF-e + encargos (${fmtVal(vNF + vFrete + vSeg + vOut)})`, campo: 'Campo 15 (VL_BC_PIS/COFINS)', correcao: 'Recalcular a base de cálculo conforme art. 1º das Leis 10.637/2002 e 10.833/2003', fundamentacao: 'Lei 10.637/2002 art. 1º; Lei 10.833/2003 art. 1º' })
      }
    }

    if (reg === 'C170') {
      const cfop = campos[3] || ''
      const cst  = campos[8] || ''
      const aliqPIS   = parseFloat(campos[12]?.replace(',', '.') || 0)
      const aliqCOFINS= parseFloat(campos[16]?.replace(',', '.') || 0)

      if (cfop && (cfop.length !== 4 || isNaN(parseInt(cfop)))) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CFOP', descricao: `CFOP inválido: "${cfop}"`, campo: 'Campo 4 (CFOP)', correcao: 'Informar CFOP com 4 dígitos numéricos conforme tabela CFOP vigente', fundamentacao: 'Convênio S/N de 15/12/1970 — Tabela CFOP' })
      }

      const cstNum = parseInt(cst)
      if (cst && (isNaN(cstNum) || cst.length !== 2)) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CST', descricao: `CST inválido: "${cst}"`, campo: 'Campo 9 (CST_PIS)', correcao: 'Informar CST com 2 dígitos conforme Tabela de CST do Anexo I da IN RFB 2.121/2022', fundamentacao: 'IN RFB 2.121/2022 — Tabela CST PIS/COFINS' })
      }

      if (aliqPIS > 0 && aliqPIS !== 0.65 && aliqPIS !== 1.65 && aliqPIS !== 0 && cstNum <= 49) {
        avisos.push({ linha: r.numero, registro: reg, categoria: 'ALIQUOTA', descricao: `Alíquota de PIS incomum: ${aliqPIS}%. Padrão: 0,65% (cumulativo) ou 1,65% (não-cumulativo)`, campo: 'Campo 13 (ALIQ_PIS)', correcao: 'Verificar o regime de apuração (cumulativo/não-cumulativo) e aplicar a alíquota correta', fundamentacao: 'Lei 10.637/2002 art. 2º; Lei 10.833/2003 art. 2º' })
      }

      if (aliqCOFINS > 0 && aliqCOFINS !== 3 && aliqCOFINS !== 7.6 && aliqCOFINS !== 0 && cstNum <= 49) {
        avisos.push({ linha: r.numero, registro: reg, categoria: 'ALIQUOTA', descricao: `Alíquota de COFINS incomum: ${aliqCOFINS}%. Padrão: 3% (cumulativo) ou 7,6% (não-cumulativo)`, campo: 'Campo 17 (ALIQ_COFINS)', correcao: 'Verificar o regime de apuração e aplicar a alíquota correta', fundamentacao: 'Lei 10.833/2003 art. 2º' })
      }
    }

    if (reg === 'M200') {
      const vEntBC = parseFloat(campos[1]?.replace(',', '.') || 0)
      const vEntAl = parseFloat(campos[3]?.replace(',', '.') || 0)
      const vCred  = parseFloat(campos[5]?.replace(',', '.') || 0)

      if (vEntBC > 0 && vEntAl > 0) {
        const credEsperado = vEntBC * vEntAl / 100
        if (Math.abs(credEsperado - vCred) > 0.10) {
          erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `Crédito de PIS calculado (${fmtVal(vCred)}) diverge do esperado (${fmtVal(credEsperado)}) — diferença de ${fmtVal(Math.abs(credEsperado - vCred))}`, campo: 'Campo 6 (VL_CRED_PIS_TRIB_MI)', correcao: `Recalcular: Base (${fmtVal(vEntBC)}) × Alíquota (${vEntAl}%) = ${fmtVal(credEsperado)}`, fundamentacao: 'Lei 10.637/2002 art. 3º — apuração do crédito de PIS', campoIndex: 5, valorAtual: vCred, valorCorrigido: credEsperado, linhaOriginal: r.linha })
        }
      }
    }

    if (reg === 'M600') {
      const vEntBC = parseFloat(campos[1]?.replace(',', '.') || 0)
      const vEntAl = parseFloat(campos[3]?.replace(',', '.') || 0)
      const vCred  = parseFloat(campos[5]?.replace(',', '.') || 0)

      if (vEntBC > 0 && vEntAl > 0) {
        const credEsperado = vEntBC * vEntAl / 100
        if (Math.abs(credEsperado - vCred) > 0.10) {
          erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `Crédito de COFINS calculado (${fmtVal(vCred)}) diverge do esperado (${fmtVal(credEsperado)}) — diferença de ${fmtVal(Math.abs(credEsperado - vCred))}`, campo: 'Campo 6 (VL_CRED_COFINS_TRIB_MI)', correcao: `Recalcular: Base (${fmtVal(vEntBC)}) × Alíquota (${vEntAl}%) = ${fmtVal(credEsperado)}`, fundamentacao: 'Lei 10.833/2003 art. 3º — apuração do crédito de COFINS', campoIndex: 5, valorAtual: vCred, valorCorrigido: credEsperado, linhaOriginal: r.linha })
        }
      }
    }

    if (reg === '9001') {
      if (!campos[1] || campos[1] !== '1') {
        avisos.push({ linha: r.numero, registro: reg, categoria: 'AVISO', descricao: 'Indicador de movimento do bloco 9 diferente de "1"', campo: 'Campo 2 (IND_MOV)', correcao: 'Verificar se o bloco 9 possui registros válidos' })
      }
    }
  })

  resumo.erros  = erros.length
  resumo.avisos = avisos.length

  return { erros, avisos, resumo }
}

function analisarEFDICMS(registros) {
  const erros  = []
  const avisos = []
  const resumo = { totalRegistros: registros.length, blocos: {}, erros: 0, avisos: 0 }

  registros.forEach(r => {
    const bloco = r.registro?.[0] || '?'
    resumo.blocos[bloco] = (resumo.blocos[bloco] || 0) + 1
  })

  registros.forEach(r => {
    const reg    = r.registro
    const campos = r.campos

    if (reg === 'C100') {
      const vICMS = parseFloat(campos[13]?.replace(',', '.') || 0)
      const vBC   = parseFloat(campos[12]?.replace(',', '.') || 0)
      const aliq  = parseFloat(campos[14]?.replace(',', '.') || 0)

      if (vBC > 0 && aliq > 0) {
        const icmsEsperado = vBC * aliq / 100
        if (Math.abs(icmsEsperado - vICMS) > 0.10) {
          erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `ICMS calculado (${fmtVal(vICMS)}) diverge do esperado (${fmtVal(icmsEsperado)})`, campo: 'Campo 14 (VL_ICMS)', correcao: `Recalcular: BC (${fmtVal(vBC)}) × Alíquota (${aliq}%) = ${fmtVal(icmsEsperado)}`, fundamentacao: 'RICMS estadual — regras de cálculo do ICMS próprio', campoIndex: 13, valorAtual: vICMS, valorCorrigido: icmsEsperado, linhaOriginal: r.linha })
        }
      }

      if (!campos[4] || campos[4].length < 5) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CAMPO_VAZIO', descricao: 'Chave de acesso da NF-e ausente', campo: 'Campo 5 (CHV_DOC)', correcao: 'Informar a chave de acesso completa com 44 dígitos', fundamentacao: 'Ajuste SINIEF 07/2005 — NF-e' })
      }
    }

    if (reg === 'C170') {
      const cfop   = campos[3] || ''
      const vICMS  = parseFloat(campos[9]?.replace(',', '.') || 0)
      const vBC    = parseFloat(campos[8]?.replace(',', '.') || 0)
      const aliq   = parseFloat(campos[10]?.replace(',', '.') || 0)

      if (cfop && cfop.length !== 4) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CFOP', descricao: `CFOP inválido: "${cfop}"`, campo: 'Campo 4 (CFOP)', correcao: 'Informar CFOP com 4 dígitos numéricos', fundamentacao: 'Convênio S/N de 15/12/1970 — Tabela CFOP' })
      }

      if (vBC > 0 && aliq > 0) {
        const esperado = vBC * aliq / 100
        if (Math.abs(esperado - vICMS) > 0.05) {
          erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `ICMS do item divergente: calculado ${fmtVal(vICMS)}, esperado ${fmtVal(esperado)}`, campo: 'Campo 10 (VL_ICMS)', correcao: `BC (${fmtVal(vBC)}) × ${aliq}% = ${fmtVal(esperado)}`, fundamentacao: 'RICMS estadual — cálculo do ICMS por item', campoIndex: 9, valorAtual: vICMS, valorCorrigido: esperado, linhaOriginal: r.linha })
        }
      }

      const vBCST  = parseFloat(campos[11]?.replace(',', '.') || 0)
      const aliqST = parseFloat(campos[12]?.replace(',', '.') || 0)
      const vST    = parseFloat(campos[13]?.replace(',', '.') || 0)

      if (vBCST > 0 && aliqST > 0) {
        const stEsperado = vBCST * aliqST / 100
        if (Math.abs(stEsperado - vST) > 0.05) {
          erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `ICMS-ST divergente: calculado ${fmtVal(vST)}, esperado ${fmtVal(stEsperado)}`, campo: 'Campo 14 (VL_ICMS_ST)', correcao: `BC-ST (${fmtVal(vBCST)}) × ${aliqST}% = ${fmtVal(stEsperado)}`, fundamentacao: 'Convênio ICMS 52/2017 — ICMS-ST', campoIndex: 13, valorAtual: vST, valorCorrigido: stEsperado, linhaOriginal: r.linha })
        }
      }
    }

    if (reg === 'E110') {
      const vTotDeb = parseFloat(campos[1]?.replace(',', '.') || 0)
      const vTotCred= parseFloat(campos[6]?.replace(',', '.') || 0)
      const vSaldo  = parseFloat(campos[11]?.replace(',', '.') || 0)
      const saldoEsp= vTotDeb - vTotCred

      if (Math.abs(saldoEsp - vSaldo) > 0.10) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'TOTAL', descricao: `Saldo do ICMS (${fmtVal(vSaldo)}) diverge do calculado (${fmtVal(saldoEsp)}) — diferença de ${fmtVal(Math.abs(saldoEsp - vSaldo))}`, campo: 'Campo 12 (VL_SLD_APURADO)', correcao: `Débitos (${fmtVal(vTotDeb)}) − Créditos (${fmtVal(vTotCred)}) = ${fmtVal(saldoEsp)}`, fundamentacao: 'Guia Prático EFD-ICMS/IPI — Registro E110', campoIndex: 11, valorAtual: vSaldo, valorCorrigido: saldoEsp, linhaOriginal: r.linha })
      }
    }
  })

  resumo.erros  = erros.length
  resumo.avisos = avisos.length

  return { erros, avisos, resumo }
}

function analisarECD(registros) {
  const erros  = []
  const avisos = []
  const resumo = { totalRegistros: registros.length, blocos: {}, erros: 0, avisos: 0 }

  registros.forEach(r => {
    const bloco = r.registro?.[0] || '?'
    resumo.blocos[bloco] = (resumo.blocos[bloco] || 0) + 1
  })

  registros.forEach(r => {
    const reg    = r.registro
    const campos = r.campos

    if (reg === 'I050') {
      if (!campos[3]) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CAMPO_VAZIO', descricao: 'Código da conta ausente no plano de contas', campo: 'Campo 4 (COD_CTA)', correcao: 'Informar o código da conta contábil', fundamentacao: 'Guia Prático ECD — Registro I050' })
      }
      if (!campos[5]) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CAMPO_VAZIO', descricao: 'Nome da conta ausente no plano de contas', campo: 'Campo 6 (NOME_CTA)', correcao: 'Informar o nome completo da conta contábil', fundamentacao: 'Guia Prático ECD — Registro I050' })
      }
    }

    if (reg === 'I155') {
      const vDeb = parseFloat(campos[3]?.replace(',', '.') || 0)
      const vCred= parseFloat(campos[4]?.replace(',', '.') || 0)

      if (vDeb === 0 && vCred === 0) {
        avisos.push({ linha: r.numero, registro: reg, categoria: 'AVISO', descricao: 'Lançamento com valor zero (débito e crédito zerados)', campo: 'Campos 4 e 5 (VL_DEB / VL_CRED)', correcao: 'Verificar se o lançamento é válido ou deve ser excluído', fundamentacao: 'NBC TG 00 (R2) — Estrutura conceitual para relatórios financeiros' })
      }

      if (vDeb > 0 && vCred > 0) {
        avisos.push({ linha: r.numero, registro: reg, categoria: 'INCONSISTENCIA', descricao: 'Lançamento com débito E crédito preenchidos simultaneamente', campo: 'Campos 4 e 5 (VL_DEB / VL_CRED)', correcao: 'Cada linha de lançamento deve ter débito OU crédito, não ambos', fundamentacao: 'Resolução CFC 1.330/2011 — Plano de Contas' })
      }
    }
  })

  resumo.erros  = erros.length
  resumo.avisos = avisos.length

  return { erros, avisos, resumo }
}

function analisarECF(registros) {
  const erros  = []
  const avisos = []
  const resumo = { totalRegistros: registros.length, blocos: {}, erros: 0, avisos: 0 }

  registros.forEach(r => {
    const bloco = r.registro?.[0] || '?'
    resumo.blocos[bloco] = (resumo.blocos[bloco] || 0) + 1
  })

  registros.forEach(r => {
    const reg    = r.registro
    const campos = r.campos

    if (reg === '0000') {
      const tipo = campos[3] || ''
      if (!['0', '1', '2', '3'].includes(tipo)) {
        avisos.push({ linha: r.numero, registro: reg, categoria: 'AVISO', descricao: `Tipo de escrituração incomum: "${tipo}"`, campo: 'Campo 4 (TIPO_ECF)', correcao: 'Verificar o tipo correto: 0=Original, 1=Retificadora, 2=Cancelamento, 3=Void', fundamentacao: 'Instrução Normativa RFB 2.004/2021 — ECF' })
      }

      if (!campos[7] || campos[7].length !== 14) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CAMPO_VAZIO', descricao: 'CNPJ inválido ou ausente no registro de abertura', campo: 'Campo 8 (CNPJ)', correcao: 'Informar o CNPJ com 14 dígitos sem formatação', fundamentacao: 'Instrução Normativa RFB 2.004/2021 — ECF' })
      }
    }

    if (reg === 'P100') {
      const vLucroLiq = parseFloat(campos[2]?.replace(',', '.') || 0)
      const vAdicoes  = parseFloat(campos[3]?.replace(',', '.') || 0)
      const vExclusoes= parseFloat(campos[4]?.replace(',', '.') || 0)
      const vLucroReal= parseFloat(campos[5]?.replace(',', '.') || 0)
      const esperado  = vLucroLiq + vAdicoes - vExclusoes

      if (Math.abs(esperado - vLucroReal) > 1) {
        erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `Lucro Real calculado (${fmtVal(vLucroReal)}) diverge do esperado (${fmtVal(esperado)}) — diferença de ${fmtVal(Math.abs(esperado - vLucroReal))}`, campo: 'Campo 6 (VL_LUC_REAL)', correcao: `Lucro Líquido (${fmtVal(vLucroLiq)}) + Adições (${fmtVal(vAdicoes)}) − Exclusões (${fmtVal(vExclusoes)}) = ${fmtVal(esperado)}`, fundamentacao: 'RIR/2018 art. 258 — apuração do Lucro Real', campoIndex: 5, valorAtual: vLucroReal, valorCorrigido: esperado, linhaOriginal: r.linha })
      }
    }

    if (reg === 'Y612') {
      const vBase = parseFloat(campos[1]?.replace(',', '.') || 0)
      const vIRPJ = parseFloat(campos[2]?.replace(',', '.') || 0)

      if (vBase > 0) {
        const irpjEsp = vBase * 0.15 + Math.max(0, (vBase - 240000) * 0.10)
        if (Math.abs(irpjEsp - vIRPJ) > 1) {
          erros.push({ linha: r.numero, registro: reg, categoria: 'CALCULO', descricao: `IRPJ calculado (${fmtVal(vIRPJ)}) diverge do esperado (${fmtVal(irpjEsp)}) considerando alíquota 15% + adicional 10%`, campo: 'Campo 3 (VL_IRPJ)', correcao: `Base (${fmtVal(vBase)}) × 15% + Adicional sobre excedente de R$ 240k = ${fmtVal(irpjEsp)}`, fundamentacao: 'RIR/2018 art. 622 — alíquota do IRPJ', campoIndex: 2, valorAtual: vIRPJ, valorCorrigido: irpjEsp, linhaOriginal: r.linha })
        }
      }
    }
  })

  resumo.erros  = erros.length
  resumo.avisos = avisos.length

  return { erros, avisos, resumo }
}

function executarAnalise(registros, tipo) {
  switch (tipo) {
    case 'EFD_CONTRIB':  return analisarEFDContrib(registros)
    case 'EFD_ICMS_IPI': return analisarEFDICMS(registros)
    case 'ECD':          return analisarECD(registros)
    case 'ECF':          return analisarECF(registros)
    default:             return { erros: [], avisos: [], resumo: { totalRegistros: registros.length, blocos: {}, erros: 0, avisos: 0 } }
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtVal(v) {
  return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function gerarRelatorio(resultado, tipo, nomeArquivo, cliente) {
  const { erros, avisos, resumo } = resultado
  const tipoLabel = TIPOS_SPED.find(t => t.id === tipo)?.label || tipo
  const data      = new Date().toLocaleDateString('pt-BR')

  const linhas = [
    `═══════════════════════════════════════════════════════════`,
    `  RELATÓRIO DE AUDITORIA DE SPED — e-FiscalTribe`,
    `═══════════════════════════════════════════════════════════`,
    ``,
    `  Tipo:       ${tipoLabel}`,
    `  Arquivo:    ${nomeArquivo}`,
    `  Cliente:    ${cliente?.razao_social || 'Não informado'}`,
    `  CNPJ:       ${cliente?.cnpj || 'Não informado'}`,
    `  Regime:     ${cliente?.regime || 'Não informado'}`,
    `  Data:       ${data}`,
    ``,
    `───────────────────────────────────────────────────────────`,
    `  RESUMO`,
    `───────────────────────────────────────────────────────────`,
    `  Total de registros analisados: ${resumo.totalRegistros}`,
    `  Erros encontrados:             ${resumo.erros}`,
    `  Avisos encontrados:            ${resumo.avisos}`,
    ``,
    `  Registros por bloco:`,
    ...Object.entries(resumo.blocos).map(([b, n]) => `    Bloco ${b}: ${n} registro(s)`),
    ``,
  ]

  if (erros.length > 0) {
    linhas.push(`───────────────────────────────────────────────────────────`)
    linhas.push(`  ERROS (${erros.length})`)
    linhas.push(`───────────────────────────────────────────────────────────`)
    erros.forEach((e, i) => {
      linhas.push(``)
      linhas.push(`  [ERRO ${i + 1}] Linha ${e.linha} — Registro ${e.registro}`)
      linhas.push(`  Categoria:    ${CATEGORIAS_ERRO[e.categoria]?.label || e.categoria}`)
      linhas.push(`  Descrição:    ${e.descricao}`)
      linhas.push(`  Campo:        ${e.campo}`)
      linhas.push(`  Correção:     ${e.correcao}`)
      linhas.push(`  Fundamento:   ${e.fundamentacao}`)
    })
  }

  if (avisos.length > 0) {
    linhas.push(``)
    linhas.push(`───────────────────────────────────────────────────────────`)
    linhas.push(`  AVISOS (${avisos.length})`)
    linhas.push(`───────────────────────────────────────────────────────────`)
    avisos.forEach((a, i) => {
      linhas.push(``)
      linhas.push(`  [AVISO ${i + 1}] Linha ${a.linha} — Registro ${a.registro}`)
      linhas.push(`  Descrição:  ${a.descricao}`)
      linhas.push(`  Campo:      ${a.campo}`)
      linhas.push(`  Correção:   ${a.correcao}`)
    })
  }

  linhas.push(``)
  linhas.push(`═══════════════════════════════════════════════════════════`)
  linhas.push(`  e-FiscalTribe® — Zenthor Consultoria & BPO`)
  linhas.push(`  Relatório gerado em ${data}`)
  linhas.push(`═══════════════════════════════════════════════════════════`)

  return linhas.join('\n')
}

// ─────────────────────────────────────────────────────────────
// GERAÇÃO DE ARQUIVO SPED CORRIGIDO
// ─────────────────────────────────────────────────────────────

function gerarSPEDCorrigido(conteudoOriginal, itensAprovados) {
  const linhas = conteudoOriginal.split('\n')

  const linhasCorrigidas = linhas.map((linhaTexto) => {
    const itemDaLinha = itensAprovados.find(item => item.linhaOriginal === linhaTexto)
    if (!itemDaLinha) return linhaTexto

    const partes = linhaTexto.split('|')
    const indiceReal = itemDaLinha.campoIndex + 1
    if (partes[indiceReal] !== undefined) {
      const valorFormatado = itemDaLinha.valorCorrigido.toFixed(2).replace('.', ',')
      partes[indiceReal] = valorFormatado
    }
    return partes.join('|')
  })

  return linhasCorrigidas.join('\n')
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function AuditorSPED({ cliente, onVoltar }) {
  const [tipoSelecionado, setTipoSelecionado] = useState('EFD_CONTRIB')
  const [arquivo, setArquivo]     = useState(null)
  const [conteudo, setConteudo]   = useState('')
  const [analisando, setAnalisando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [filtro, setFiltro]       = useState('TODOS')
  const [busca, setBusca]         = useState('')
  const [abaSelecionada, setAbaSelecionada] = useState('erros')
  const [mostrarRevisao, setMostrarRevisao] = useState(false)
  const [itensRevisao, setItensRevisao] = useState([])
  const inputRef = useRef()

  async function carregarArquivo(file) {
    if (!file) return
    setArquivo(file)
    setResultado(null)
    const texto = await file.text()
    setConteudo(texto)
  }

  async function executar() {
    if (!conteudo) return
    setAnalisando(true)
    setResultado(null)

    await new Promise(r => setTimeout(r, 800))

    try {
      const registros  = parsearSPED(conteudo, tipoSelecionado)
      const analise    = executarAnalise(registros, tipoSelecionado)
      setResultado(analise)
    } catch (e) {
      setResultado({ erro: e.message })
    }

    setAnalisando(false)
  }

  function baixarRelatorio() {
    if (!resultado) return
    const texto = gerarRelatorio(resultado, tipoSelecionado, arquivo?.name || 'sped.txt', cliente)
    const blob  = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `auditoria_sped_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function abrirRevisaoCorrecao() {
    const errosCalculo = (resultado?.erros || []).filter(e => (e.categoria === 'CALCULO' || e.categoria === 'TOTAL') && e.valorCorrigido !== undefined)
    setItensRevisao(errosCalculo.map(e => ({ ...e, aprovado: true })))
    setMostrarRevisao(true)
  }

  function alternarAprovacao(idx) {
    setItensRevisao(prev => prev.map((item, i) => i === idx ? { ...item, aprovado: !item.aprovado } : item))
  }

  function confirmarCorrecao() {
    const aprovados = itensRevisao.filter(i => i.aprovado)
    if (aprovados.length === 0) { setMostrarRevisao(false); return }
    const textoCorrigido = gerarSPEDCorrigido(conteudo, aprovados)
    const blob = new Blob([textoCorrigido], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${(arquivo?.name || 'sped').replace('.txt', '')}_corrigido.txt`
    a.click()
    URL.revokeObjectURL(url)
    setMostrarRevisao(false)
  }

  const itensFiltrados = resultado ? [
    ...(abaSelecionada === 'erros'  ? resultado.erros  || [] : []),
    ...(abaSelecionada === 'avisos' ? resultado.avisos || [] : []),
  ].filter(item => {
    if (filtro !== 'TODOS' && item.categoria !== filtro) return false
    if (busca && !JSON.stringify(item).toLowerCase().includes(busca.toLowerCase())) return false
    return true
  }) : []

  const tipoAtual = TIPOS_SPED.find(t => t.id === tipoSelecionado)

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.text }}>

      {/* Cabeçalho simples — mesmo padrão do resto do produto */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Auditor de SPED</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
          Pente fino antes da entrega à Receita Federal. Importe o arquivo SPED e identifique erros, inconsistências e cálculos incorretos.
        </div>
        {cliente && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{cliente.razao_social}</span>
            <span style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted, padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>{cliente.regime}</span>
          </div>
        )}
      </div>

      {/* Seleção do tipo */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipo de SPED</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {TIPOS_SPED.map(tipo => (
            <button key={tipo.id} onClick={() => { setTipoSelecionado(tipo.id); setResultado(null) }}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: tipoSelecionado === tipo.id ? '#EFF4FF' : C.white,
                border: `1.5px solid ${tipoSelecionado === tipo.id ? C.blue : C.border}`,
                transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: tipoSelecionado === tipo.id ? C.blue : C.text, marginBottom: 4 }}>{tipo.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{tipo.descricao}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload do arquivo */}
      <div style={{ background: C.white, borderRadius: 12, border: `2px dashed ${arquivo ? C.blue : C.border}`, padding: 24, marginBottom: 16, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) carregarArquivo(f) }}>
        <input ref={inputRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) carregarArquivo(f); e.target.value = '' }} />
        {arquivo ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 4 }}>{arquivo.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{(arquivo.size / 1024).toFixed(1)} KB — Clique para trocar</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Arraste o arquivo SPED aqui ou clique para selecionar</div>
            <div style={{ fontSize: 12, color: C.muted }}>Formato: .txt — {tipoAtual?.descricao}</div>
          </>
        )}
      </div>

      {/* Botão analisar */}
      {arquivo && !resultado && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={executar} disabled={analisando}
            style={{ padding: '11px 28px', background: analisando ? C.border : C.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: analisando ? 'default' : 'pointer' }}>
            {analisando ? 'Analisando...' : 'Iniciar Auditoria'}
          </button>
        </div>
      )}

      {/* Resultado */}
      {resultado && !resultado.erro && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Registros analisados', valor: resultado.resumo.totalRegistros, cor: C.text },
              { label: 'Erros encontrados',    valor: resultado.resumo.erros,          cor: C.red },
              { label: 'Avisos',               valor: resultado.resumo.avisos,         cor: '#CA8A04' },
              { label: 'Blocos identificados', valor: Object.keys(resultado.resumo.blocos).length, cor: C.blue },
            ].map((kpi, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: kpi.cor }}>{kpi.valor}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Veredicto */}
          <div style={{ borderRadius: 12, padding: '16px 20px', marginBottom: 16, background: resultado.resumo.erros === 0 ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${resultado.resumo.erros === 0 ? '#86EFAC' : '#FECACA'}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: resultado.resumo.erros === 0 ? C.green : C.red, marginBottom: 4 }}>
              {resultado.resumo.erros === 0 ? 'SPED sem erros críticos identificados' : `${resultado.resumo.erros} erro(s) crítico(s) identificado(s) — não transmitir antes de corrigir`}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {resultado.resumo.erros === 0
                ? `${resultado.resumo.avisos > 0 ? `${resultado.resumo.avisos} aviso(s) de atenção encontrado(s). Revise antes de transmitir.` : 'Nenhum erro ou aviso identificado. SPED apto para transmissão.'}`
                : `Corrija os erros apontados antes de transmitir à Receita Federal para evitar multas e autuações.`}
            </div>
          </div>

          {/* Blocos encontrados */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Blocos identificados</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(resultado.resumo.blocos).map(([bloco, qtd]) => (
                <span key={bloco} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: '4px 12px', borderRadius: 20, fontSize: 12, color: C.text }}>
                  Bloco {bloco}: <strong style={{ color: C.blue }}>{qtd}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Abas erros/avisos */}
          {(resultado.erros.length > 0 || resultado.avisos.length > 0) && (
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>

              <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
                {[
                  { id: 'erros',  label: `Erros (${resultado.erros.length})` },
                  { id: 'avisos', label: `Avisos (${resultado.avisos.length})` },
                ].map(aba => (
                  <button key={aba.id} onClick={() => setAbaSelecionada(aba.id)}
                    style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: abaSelecionada === aba.id ? `2px solid ${C.blue}` : '2px solid transparent', color: abaSelecionada === aba.id ? C.blue : C.muted, fontSize: 13, fontWeight: abaSelecionada === aba.id ? 700 : 400, cursor: 'pointer', marginBottom: -1 }}>
                    {aba.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
                  style={{ padding: '6px 12px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, width: 180, outline: 'none' }} />
                <select value={filtro} onChange={e => setFiltro(e.target.value)}
                  style={{ padding: '6px 10px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, cursor: 'pointer' }}>
                  <option value="TODOS">Todas as categorias</option>
                  {Object.entries(CATEGORIAS_ERRO).map(([id, cat]) => (
                    <option key={id} value={id}>{cat.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: 'auto' }}>{itensFiltrados.length} item(s)</span>
              </div>

              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {itensFiltrados.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 13 }}>Nenhum item encontrado.</div>
                ) : (
                  itensFiltrados.map((item, idx) => {
                    const cat = CATEGORIAS_ERRO[item.categoria] || CATEGORIAS_ERRO.AVISO
                    return (
                      <div key={idx} style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${cat.cor}` }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ background: `${cat.cor}18`, color: cat.cor, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{cat.label}</span>
                          <span style={{ color: C.muted, fontSize: 11 }}>Linha {item.linha}</span>
                          <span style={{ background: C.bg, color: C.muted, padding: '2px 8px', borderRadius: 20, fontSize: 10 }}>Reg. {item.registro}</span>
                        </div>
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 6 }}>{item.descricao}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                          <span>Campo: </span>{item.campo}
                        </div>
                        <div style={{ fontSize: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
                          <span style={{ color: C.green, fontWeight: 700 }}>Correção: </span>
                          <span style={{ color: C.text }}>{item.correcao}</span>
                        </div>
                        {item.fundamentacao && (
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                            {item.fundamentacao}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={baixarRelatorio}
              style={{ padding: '10px 20px', background: C.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Baixar Relatório .txt
            </button>
            {resultado.erros.some(e => (e.categoria === 'CALCULO' || e.categoria === 'TOTAL') && e.valorCorrigido !== undefined) && (
              <button onClick={abrirRevisaoCorrecao}
                style={{ padding: '10px 20px', background: C.white, color: C.blue, border: `1.5px solid ${C.blue}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Gerar arquivo corrigido
              </button>
            )}
            <button onClick={() => { setResultado(null); setArquivo(null); setConteudo('') }}
              style={{ padding: '10px 20px', background: C.white, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Nova Análise
            </button>
          </div>
        </>
      )}

      {resultado?.erro && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: C.red, fontSize: 13 }}>
          <strong>Erro na análise:</strong> {resultado.erro}
        </div>
      )}

      {/* Modal de revisão de correções */}
      {mostrarRevisao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${C.border}` }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Revisar correções antes de gerar o arquivo</div>
              <div style={{ fontSize: 13, color: C.muted }}>
                Confira cada valor antes de aceitar. Desmarque os itens que não deseja corrigir automaticamente.
              </div>
            </div>

            <div style={{ padding: '16px 24px' }}>
              {itensRevisao.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>Nenhum erro de cálculo identificado.</div>
              ) : (
                itensRevisao.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: idx < itensRevisao.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <input type="checkbox" checked={item.aprovado} onChange={() => alternarAprovacao(idx)}
                      style={{ marginTop: 4, width: 16, height: 16, accentColor: C.blue, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Linha {item.linha} — Registro {item.registro} — {item.campo}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                        <span style={{ color: C.red, textDecoration: 'line-through' }}>{fmtVal(item.valorAtual)}</span>
                        <span style={{ color: C.muted }}>→</span>
                        <span style={{ color: C.green, fontWeight: 700 }}>{fmtVal(item.valorCorrigido)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setMostrarRevisao(false)}
                style={{ padding: '10px 18px', background: C.white, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarCorrecao} disabled={!itensRevisao.some(i => i.aprovado)}
                style={{ padding: '10px 18px', background: itensRevisao.some(i => i.aprovado) ? C.blue : C.border, color: itensRevisao.some(i => i.aprovado) ? '#fff' : C.muted, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: itensRevisao.some(i => i.aprovado) ? 'pointer' : 'not-allowed' }}>
                Aplicar {itensRevisao.filter(i => i.aprovado).length} correção(ões) e baixar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}