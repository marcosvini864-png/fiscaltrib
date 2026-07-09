/**
 * regras/icms_st.js — Base de Conhecimento Tributária — FiscalTrib
 * Regras de negócio do Motor de ICMS-ST.
 *
 * Este arquivo contém as funções de decisão e cálculo utilizadas
 * pelo Motor de ICMS-ST para identificar produtos com substituição
 * tributária, validar NF-es e calcular créditos recuperáveis.
 *
 * Modalidades de recuperação:
 * 1. Simples Nacional: exclusão do ICMS-ST da base do DAS
 * 2. Lucro Presumido/Real: exclusão do ICMS-ST da base de PIS/COFINS
 *
 * Base legal:
 * — REsp 1.624.297/RS (STJ) — Simples Nacional
 * — RE 574.706 STF (Tema 69) — Lucro Presumido/Real
 * — Resolução CGSN 140/2018
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { isICMSST, cstIndicaST, getNCMICMSST } from '../ncm/icms_st.js'
import { temCEST }                              from '../ncm/cest.js'
import { VERSAO_ATUAL }                         from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE REGRAS
// ─────────────────────────────────────────────────────────────

// CSTs que indicam substituição tributária
export const CST_ST = ['10', '30', '60', '70', '90']
export const CSOSN_ST = ['201', '202', '203', '500', '900']

// Alíquotas de PIS/COFINS no regime cumulativo (LP)
export const ALIQ_CUMULATIVO = { pis: 0.65, cofins: 3.00 }

// Alíquotas de PIS/COFINS no regime não cumulativo (LR)
export const ALIQ_NAO_CUMULATIVO = { pis: 1.65, cofins: 7.60 }

// ─────────────────────────────────────────────────────────────
// REGRAS DE IDENTIFICAÇÃO
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um item de NF-e está sujeito ao ICMS-ST.
 * Usa múltiplos critérios em ordem de confiabilidade.
 *
 * @param {object} item - Item parseado do XML de NF-e
 * @returns {{ isST: boolean, criterio: string, confianca: string }}
 */
export function isItemST(item) {
  if (!item) return { isST: false, criterio: 'none', confianca: 'BAIXO' }

  // Critério 1 — CEST presente (mais confiável)
  if (item.cest && item.cest.length > 0) {
    return { isST: true, criterio: 'CEST', confianca: 'ALTO' }
  }

  // Critério 2 — CST indica ST
  if (item.cst && (CST_ST.includes(item.cst) || CSOSN_ST.includes(item.cst))) {
    return { isST: true, criterio: 'CST', confianca: 'ALTO' }
  }

  // Critério 3 — Valor de ICMS-ST destacado
  if ((item.vItemST || 0) > 0 || (item.vBCST || 0) > 0) {
    return { isST: true, criterio: 'VALOR_ST', confianca: 'ALTO' }
  }

  // Critério 4 — NCM consta na tabela de ICMS-ST
  if (item.ncm && isICMSST(item.ncm)) {
    return { isST: true, criterio: 'NCM', confianca: 'MEDIO' }
  }

  return { isST: false, criterio: 'none', confianca: 'BAIXO' }
}

/**
 * Verifica se uma NF-e é de saída.
 * @param {object} nfe
 * @returns {boolean}
 */
export function isNFeSaida(nfe) {
  if (!nfe?.tpNF) return true
  return nfe.tpNF === '1'
}

/**
 * Verifica se uma NF-e de entrada tem ICMS-ST.
 * Importante para Simples Nacional — NF-es de entrada com ST
 * geram o direito à exclusão da base do DAS.
 *
 * @param {object} nfe
 * @returns {boolean}
 */
export function isNFeEntradaComST(nfe) {
  if (!nfe) return false
  const isEntrada = nfe.tpNF === '0' || !nfe.tpNF
  if (!isEntrada) return false
  const temST = (nfe.vST || 0) > 0 || (nfe.itens || []).some(i => isItemST(i).isST)
  return temST
}

/**
 * Valida uma NF-e para análise de ICMS-ST.
 *
 * @param {object} nfe
 * @param {string} regime
 * @returns {{ valida: boolean, motivo: string }}
 */
export function validarNFeParaST(nfe, regime) {
  if (!nfe)             return { valida: false, motivo: 'NF-e nula ou indefinida' }
  if (!nfe.valido)      return { valida: false, motivo: 'NF-e inválida' }
  if (!nfe.competencia) return { valida: false, motivo: 'Competência não identificada' }
  if (nfe.vNF <= 0)     return { valida: false, motivo: 'Valor total da NF-e é zero' }

  // Para Simples Nacional: aceita entrada (ST nas compras)
  // Para LP/LR: aceita saída (ST nas vendas)
  if (regime === 'Simples Nacional') {
    const temSTNaEntrada = isNFeEntradaComST(nfe)
    const temSTNaSaida   = isNFeSaida(nfe) && (nfe.vST || 0) > 0
    if (!temSTNaEntrada && !temSTNaSaida) {
      return { valida: false, motivo: 'NF-e sem ICMS-ST identificado' }
    }
  } else {
    if (!isNFeSaida(nfe)) return { valida: false, motivo: 'NF-e de entrada — não aplicável para LP/LR' }
    if ((nfe.vST || 0) === 0 && !(nfe.itens || []).some(i => isItemST(i).isST)) {
      return { valida: false, motivo: 'NF-e sem ICMS-ST identificado' }
    }
  }

  return { valida: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CÁLCULO — SIMPLES NACIONAL
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o ICMS-ST de um item que deve ser excluído da base do DAS.
 *
 * @param {object} item - Item parseado
 * @returns {{ valorST: number, criterio: string }}
 */
export function calcularSTItemSimples(item) {
  const stInfo = isItemST(item)
  if (!stInfo.isST) return { valorST: 0, criterio: 'NAO_ST' }

  // Usa o valor de ST destacado na NF-e (mais preciso)
  if ((item.vItemST || 0) > 0) {
    return { valorST: item.vItemST, criterio: 'VALOR_DESTACADO' }
  }

  // Calcula pelo vBCST e pICMSST se disponíveis
  if ((item.vBCST || 0) > 0 && (item.pICMSST || 0) > 0) {
    const valorST = item.vBCST * (item.pICMSST / 100)
    return { valorST, criterio: 'CALCULADO_BC_ALIQ' }
  }

  // Sem dados suficientes para calcular
  return { valorST: 0, criterio: 'SEM_DADOS', obs: 'Necessário obter NF-e de entrada com ICMS-ST destacado' }
}

/**
 * Calcula o crédito recuperável no Simples Nacional por ICMS-ST.
 * O crédito é a redução do DAS pela exclusão do ICMS-ST da base.
 *
 * @param {number} valorST     - Valor do ICMS-ST identificado
 * @param {number} aliqEfetiva - Alíquota efetiva do DAS (%)
 * @returns {{ creditoDAS: number, obs: string }}
 */
export function calcularCreditoSimplesNacional(valorST, aliqEfetiva = 0.06) {
  if (valorST <= 0) return { creditoDAS: 0, obs: 'Sem ICMS-ST identificado' }

  // O crédito é a alíquota efetiva do DAS aplicada sobre o ICMS-ST excluído
  const creditoDAS = valorST * aliqEfetiva

  return {
    creditoDAS,
    valorSTExcluido: valorST,
    aliqEfetiva:     aliqEfetiva * 100,
    obs:             `DAS a menos = ICMS-ST excluído × alíquota efetiva do DAS`,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CÁLCULO — LUCRO PRESUMIDO E LUCRO REAL
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o crédito de PIS/COFINS pela exclusão do ICMS-ST da base.
 * Aplicável para Lucro Presumido e Lucro Real.
 *
 * @param {number} valorST - Valor do ICMS-ST a excluir da base
 * @param {string} regime  - 'Lucro Presumido' ou 'Lucro Real'
 * @returns {{ creditoPIS: number, creditoCOFINS: number, credito: number }}
 */
export function calcularCreditoLucro(valorST, regime = 'Lucro Presumido') {
  if (valorST <= 0) return { creditoPIS: 0, creditoCOFINS: 0, credito: 0 }

  const aliq = regime === 'Lucro Real' ? ALIQ_NAO_CUMULATIVO : ALIQ_CUMULATIVO

  const creditoPIS    = valorST * (aliq.pis    / 100)
  const creditoCOFINS = valorST * (aliq.cofins / 100)

  return {
    creditoPIS,
    creditoCOFINS,
    credito:     creditoPIS + creditoCOFINS,
    aliqPIS:     aliq.pis,
    aliqCOFINS:  aliq.cofins,
    valorSTBase: valorST,
    obs:         `PIS/COFINS calculado sobre o ICMS-ST excluído da base (${regime})`,
  }
}

/**
 * Calcula o crédito total de uma NF-e para ICMS-ST.
 *
 * @param {object} nfe    - NF-e parseada
 * @param {string} regime - Regime tributário
 * @returns {object}
 */
export function calcularCreditoNFeST(nfe, regime = 'Simples Nacional') {
  const validacao = validarNFeParaST(nfe, regime)
  if (!validacao.valida) {
    return { valido: false, motivo: validacao.motivo, credito: 0 }
  }

  // Valor total do ST da NF-e
  const totalST = nfe.vST || (nfe.itens || []).reduce((s, i) => {
    const calc = calcularSTItemSimples(i)
    return s + calc.valorST
  }, 0)

  if (totalST <= 0) {
    return { valido: true, credito: 0, obs: 'ICMS-ST não identificado nos itens' }
  }

  let resultado
  if (regime === 'Simples Nacional') {
    resultado = calcularCreditoSimplesNacional(totalST)
  } else {
    resultado = calcularCreditoLucro(totalST, regime)
  }

  return {
    valido:      true,
    chNFe:       nfe.chNFe,
    competencia: nfe.competencia,
    totalST,
    regime,
    ...resultado,
  }
}

/**
 * Consolida os créditos de ICMS-ST por competência.
 *
 * @param {Array}  nfes   - Array de NF-es parseadas
 * @param {string} regime - Regime tributário
 * @returns {object}
 */
export function consolidarCreditosSTporCompetencia(nfes, regime = 'Simples Nacional') {
  const porCompetencia = {}
  let creditoTotal = 0
  let totalSTIdentificado = 0
  let totalNFesComST = 0

  nfes.forEach(nfe => {
    const calc = calcularCreditoNFeST(nfe, regime)
    if (!calc.valido || calc.credito <= 0) return

    const comp = nfe.competencia
    if (!porCompetencia[comp]) {
      porCompetencia[comp] = {
        competencia: comp,
        totalNFes:   0,
        totalST:     0,
        credito:     0,
      }
    }

    porCompetencia[comp].totalNFes++
    porCompetencia[comp].totalST  += calc.totalST || 0
    porCompetencia[comp].credito  += calc.credito

    creditoTotal        += calc.credito
    totalSTIdentificado += calc.totalST || 0
    totalNFesComST++
  })

  const competencias = Object.values(porCompetencia).sort((a, b) =>
    a.competencia.localeCompare(b.competencia)
  )
  const meses = competencias.length || 1

  return {
    creditoTotal,
    creditoMensalMedio:  creditoTotal / meses,
    creditoPor12Meses:   (creditoTotal / meses) * 12,
    creditoPor24Meses:   (creditoTotal / meses) * 24,
    creditoPor36Meses:   (creditoTotal / meses) * 36,
    creditoPor60Meses:   (creditoTotal / meses) * 60,
    totalSTIdentificado,
    totalNFes:           nfes.length,
    totalNFesComST,
    totalCompetencias:   competencias.length,
    periodoInicio:       competencias[0]?.competencia || '',
    periodoFim:          competencias[competencias.length - 1]?.competencia || '',
    porCompetencia,
    regime,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE DIAGNÓSTICO
// ─────────────────────────────────────────────────────────────

/**
 * Gera o diagnóstico completo de ICMS-ST para um conjunto de NF-es.
 *
 * @param {Array}  nfes   - Array de NF-es parseadas
 * @param {string} regime - Regime tributário
 * @returns {object}
 */
export function gerarDiagnosticoST(nfes, regime = 'Simples Nacional') {
  const todosItens    = nfes.flatMap(n => n.itens || [])
  const itensComST    = todosItens.filter(i => isItemST(i).isST)
  const ncmsComST     = [...new Set(itensComST.map(i => i.ncm).filter(Boolean))]
  const competencias  = [...new Set(nfes.map(n => n.competencia))].sort()

  // Critérios de identificação usados
  const criteriosUsados = [...new Set(
    itensComST.map(i => isItemST(i).criterio)
  )]

  // NF-es com ST destacado
  const nfesComST = nfes.filter(n =>
    (n.vST || 0) > 0 || (n.itens || []).some(i => isItemST(i).isST)
  )

  return {
    totalNFesAnalisadas:  nfes.length,
    totalNFesComST:       nfesComST.length,
    totalItens:           todosItens.length,
    totalItensComST:      itensComST.length,
    ncmsComST,
    criteriosIdentificacao: criteriosUsados,
    competencias,
    periodoInicio:        competencias[0]  || '',
    periodoFim:           competencias[competencias.length - 1] || '',
    totalCompetencias:    competencias.length,
    regime,
    situacoesEncontradas: [
      itensComST.length > 0
        ? `${itensComST.length} item(ns) com ICMS-ST identificado(s) via ${criteriosUsados.join(', ')}`
        : 'Nenhum item com ICMS-ST identificado',
      nfesComST.length > 0
        ? `${nfesComST.length} NF-e(s) com ICMS-ST destacado`
        : 'Nenhuma NF-e com ICMS-ST destacado',
      regime === 'Simples Nacional'
        ? 'Modalidade: exclusão do ICMS-ST da base do DAS'
        : `Modalidade: exclusão do ICMS-ST da base de PIS/COFINS (${regime})`,
    ].filter(Boolean),
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SCORE E CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o grau de confiança da análise de ICMS-ST.
 *
 * @param {object} consolidado - Resultado consolidado
 * @param {Array}  nfes        - NF-es analisadas
 * @returns {{ grau: string, justificativa: string, pontos: number }}
 */
export function calcularGrauConfiancaST(consolidado, nfes) {
  let pontos = 100

  // Penaliza se o ST foi identificado apenas pelo NCM (menos confiável)
  const itensComST = nfes.flatMap(n => n.itens || []).filter(i => isItemST(i).isST)
  const apenasNCM  = itensComST.filter(i => isItemST(i).criterio === 'NCM').length
  if (apenasNCM > itensComST.length * 0.5) pontos -= 15

  // Penaliza se não há valor de ST destacado
  const semValorST = nfes.filter(n => (n.vST || 0) === 0).length
  if (semValorST > nfes.length * 0.5) pontos -= 20

  // Penaliza se período é curto
  if (consolidado.totalCompetencias < 3)  pontos -= 10
  if (consolidado.totalCompetencias < 12) pontos -= 5

  // Penaliza se poucas NF-es com ST
  if (consolidado.totalNFesComST < 5) pontos -= 10

  pontos = Math.max(0, Math.min(100, pontos))

  const grau = pontos >= 80 ? 'ALTO' : pontos >= 60 ? 'MEDIO' : 'BAIXO'

  const justificativa =
    grau === 'ALTO'  ? 'ICMS-ST identificado com CEST/CST/valor destacado e período representativo.' :
    grau === 'MEDIO' ? 'ICMS-ST identificado parcialmente — alguns itens apenas pelo NCM ou sem valor destacado.' :
                       'Identificação de ICMS-ST insuficiente — revisar documentos fiscais.'

  return { grau, justificativa, pontos }
}

/**
 * Calcula o score do Motor de ICMS-ST.
 *
 * @param {object} consolidado
 * @param {object} confianca
 * @returns {number}
 */
export function calcularScoreST(consolidado, confianca) {
  let score = 89  // score base da tese

  if (confianca.grau === 'MEDIO') score -= 8
  if (confianca.grau === 'BAIXO') score -= 20

  if (consolidado.totalNFesComST < 5)  score -= 10
  if (consolidado.totalCompetencias < 6) score -= 8

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Metadados das regras de ICMS-ST.
 */
export const META_REGRAS_ICMS_ST = {
  versaoBase:   VERSAO_ATUAL.codigo,
  versaoRegras: '1.0',
  atualizadaEm: '2026-07-08',
  totalRegras:  8,
  observacao:   'Regras baseadas no REsp 1.624.297/RS (STJ), RE 574.706 STF (Tema 69), ' +
                'Resolução CGSN 140/2018 e SC COSIT 65/2018.',
}