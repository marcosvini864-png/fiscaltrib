/**
 * regras/monofasicos.js — Base de Conhecimento Tributária — FiscalTrib
 * Regras de negócio do Motor de Monofásicos.
 *
 * Este arquivo contém as funções de decisão e cálculo utilizadas
 * pelo Motor de Monofásicos para identificar produtos monofásicos,
 * validar NF-es e calcular créditos recuperáveis.
 *
 * REGRA: Este arquivo NÃO importa do CentralImportacoes.
 * Recebe dados já parseados e retorna decisões e cálculos.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { isMonofasico, getCategoriaMonofasica, getNCMMonofasico } from '../ncm/monofasicos.js'
import { classificarNCM }                                          from '../ncm/categorias.js'
import { VERSAO_ATUAL }                                            from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE REGRAS
// ─────────────────────────────────────────────────────────────

export const ALIQUOTAS_REVENDEDOR = { pis: 0, cofins: 0 }

export const ALIQUOTAS_NORMAIS = {
  cumulativo:    { pis: 0.65, cofins: 3.00 },
  naoCumulativo: { pis: 1.65, cofins: 7.60 },
}

// Alíquotas que indicam cobrança indevida no revendedor
export const ALIQUOTAS_INDEVIDAS = [
  0.65, 1.65, 3.00, 7.60, 2.10, 9.90, 2.20, 10.30, 1.86, 8.54, 2.32, 10.68,
]

// ─────────────────────────────────────────────────────────────
// REGRAS DE IDENTIFICAÇÃO
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um item de NF-e é produto monofásico.
 * Critério principal: NCM consta na tabela de monofásicos.
 *
 * @param {object} item - Item parseado do XML de NF-e
 * @returns {boolean}
 */
export function isProdutoMonofasico(item) {
  if (!item?.ncm) return false
  return isMonofasico(item.ncm)
}

/**
 * Verifica se um item de NF-e tem PIS/COFINS cobrado indevidamente.
 * Produto monofásico + alíquota > 0 = cobrança indevida.
 *
 * @param {object} item - Item parseado do XML de NF-e
 * @returns {boolean}
 */
export function temCobrancaIndevida(item) {
  if (!isProdutoMonofasico(item)) return false
  const temPIS    = (item.pPIS    || 0) > 0
  const temCOFINS = (item.pCOFINS || 0) > 0
  const temValorPIS    = (item.vItemPIS    || 0) > 0
  const temValorCOFINS = (item.vItemCOFINS || 0) > 0
  return temPIS || temCOFINS || temValorPIS || temValorCOFINS
}

/**
 * Verifica se uma NF-e é de saída (tpNF = '1').
 * Apenas NF-es de saída geram crédito de monofásicos.
 *
 * @param {object} nfe - NF-e parseada
 * @returns {boolean}
 */
export function isNFeSaida(nfe) {
  // Se tpNF não estiver presente (parser antigo), assume saída
  if (!nfe?.tpNF) return true
  return nfe.tpNF === '1'
}

/**
 * Verifica se uma NF-e é válida para análise de monofásicos.
 *
 * @param {object} nfe - NF-e parseada
 * @returns {{ valida: boolean, motivo: string }}
 */
export function validarNFe(nfe) {
  if (!nfe)              return { valida: false, motivo: 'NF-e nula ou indefinida' }
  if (!nfe.valido)       return { valida: false, motivo: 'NF-e inválida — campos obrigatórios ausentes' }
  if (!nfe.competencia)  return { valida: false, motivo: 'Competência não identificada' }
  if (nfe.vNF <= 0)      return { valida: false, motivo: 'Valor total da NF-e é zero' }
  if (!isNFeSaida(nfe))  return { valida: false, motivo: 'NF-e de entrada — não gera crédito de monofásicos' }
  if (!nfe.itens?.length) return { valida: false, motivo: 'NF-e sem itens identificados' }
  return { valida: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CÁLCULO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o crédito recuperável de PIS/COFINS de um item monofásico.
 * O crédito é o valor efetivamente recolhido (vItemPIS + vItemCOFINS).
 * Se não houver valor destacado, estima com base na alíquota do fabricante.
 *
 * @param {object} item   - Item parseado do XML de NF-e
 * @param {string} regime - Regime tributário do contribuinte
 * @returns {{ creditoPIS: number, creditoCOFINS: number, credito: number, estimado: boolean }}
 */
export function calcularCreditoItem(item, regime = 'Simples Nacional') {
  if (!isProdutoMonofasico(item)) {
    return { creditoPIS: 0, creditoCOFINS: 0, credito: 0, estimado: false }
  }

  const vItemPIS    = item.vItemPIS    || 0
  const vItemCOFINS = item.vItemCOFINS || 0
  const vProd       = item.vProd       || 0

  // Se há valores destacados na NF-e — usa direto
  if (vItemPIS > 0 || vItemCOFINS > 0) {
    return {
      creditoPIS:    vItemPIS,
      creditoCOFINS: vItemCOFINS,
      credito:       vItemPIS + vItemCOFINS,
      estimado:      false,
    }
  }

  // Se não há valores — estima pelo regime
  // Simples Nacional: PIS/COFINS dentro do DAS — estima pela alíquota média
  if (regime === 'Simples Nacional') {
    const estimativa = vProd * 0.0365  // alíquota média monofásicos no Simples
    return {
      creditoPIS:    vProd * 0.0075,
      creditoCOFINS: vProd * 0.0290,
      credito:       estimativa,
      estimado:      true,
      obs:           'Estimativa — PIS/COFINS dentro do DAS. Confirmar com PGDAS-D.',
    }
  }

  // Lucro Presumido / Lucro Real — estima pela alíquota do regime cumulativo
  const aliq  = regime === 'Lucro Real' ? ALIQUOTAS_NORMAIS.naoCumulativo : ALIQUOTAS_NORMAIS.cumulativo
  return {
    creditoPIS:    vProd * (aliq.pis    / 100),
    creditoCOFINS: vProd * (aliq.cofins / 100),
    credito:       vProd * ((aliq.pis + aliq.cofins) / 100),
    estimado:      true,
    obs:           `Estimativa — alíquotas do ${regime} aplicadas ao vProd.`,
  }
}

/**
 * Calcula o crédito total de uma NF-e inteira.
 *
 * @param {object} nfe    - NF-e parseada com itens
 * @param {string} regime - Regime tributário
 * @returns {object}
 */
export function calcularCreditoNFe(nfe, regime = 'Simples Nacional') {
  const validacao = validarNFe(nfe)
  if (!validacao.valida) {
    return { valido: false, motivo: validacao.motivo, credito: 0, itens: [] }
  }

  const itensMonofasicos = (nfe.itens || []).filter(isProdutoMonofasico)
  if (itensMonofasicos.length === 0) {
    return { valido: true, credito: 0, itens: [], obs: 'Nenhum item monofásico nesta NF-e' }
  }

  let creditoTotal = 0
  let temEstimativa = false
  const itensCalculados = itensMonofasicos.map(item => {
    const calc = calcularCreditoItem(item, regime)
    creditoTotal += calc.credito
    if (calc.estimado) temEstimativa = true
    return {
      ncm:       item.ncm,
      xProd:     item.xProd,
      categoria: getCategoriaMonofasica(item.ncm),
      vProd:     item.vProd,
      ...calc,
    }
  })

  return {
    valido:        true,
    chNFe:         nfe.chNFe,
    competencia:   nfe.competencia,
    totalItens:    nfe.itens.length,
    itensMonofasicos: itensMonofasicos.length,
    credito:       creditoTotal,
    estimado:      temEstimativa,
    itens:         itensCalculados,
  }
}

/**
 * Consolida o crédito de um conjunto de NF-es por competência.
 *
 * @param {Array}  nfes   - Array de NF-es parseadas
 * @param {string} regime - Regime tributário
 * @returns {object}
 */
export function consolidarCreditosPorCompetencia(nfes, regime = 'Simples Nacional') {
  const porCompetencia = {}
  let creditoTotal = 0
  let totalItensMonofasicos = 0
  let totalNFesComCredito = 0

  nfes.forEach(nfe => {
    const calc = calcularCreditoNFe(nfe, regime)
    if (!calc.valido || calc.credito === 0) return

    const comp = nfe.competencia
    if (!porCompetencia[comp]) {
      porCompetencia[comp] = {
        competencia:      comp,
        totalNFes:        0,
        totalItemosMono:  0,
        credito:          0,
        estimado:         false,
      }
    }

    porCompetencia[comp].totalNFes++
    porCompetencia[comp].totalItemosMono += calc.itensMonofasicos
    porCompetencia[comp].credito         += calc.credito
    if (calc.estimado) porCompetencia[comp].estimado = true

    creditoTotal           += calc.credito
    totalItensMonofasicos  += calc.itensMonofasicos
    totalNFesComCredito++
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
    totalNFes:           nfes.length,
    totalNFesComCredito,
    totalItensMonofasicos,
    totalCompetencias:   competencias.length,
    periodoInicio:       competencias[0]?.competencia  || '',
    periodoFim:          competencias[competencias.length - 1]?.competencia || '',
    porCompetencia,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SCORE E CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o grau de confiança da análise de monofásicos.
 * Baseado na qualidade dos dados disponíveis.
 *
 * @param {object} consolidado - Resultado de consolidarCreditosPorCompetencia
 * @param {Array}  nfes        - NF-es analisadas
 * @returns {{ grau: string, justificativa: string, pontos: number }}
 */
export function calcularGrauConfianca(consolidado, nfes) {
  let pontos = 100

  // Penaliza se há estimativas (sem valores destacados na NF-e)
  if (consolidado.porCompetencia) {
    const comEstimativa = Object.values(consolidado.porCompetencia).filter(c => c.estimado).length
    if (comEstimativa > 0) pontos -= 20
  }

  // Penaliza se há poucas NF-es (base de dados pequena)
  if (nfes.length < 10)  pontos -= 15
  if (nfes.length < 50)  pontos -= 10

  // Penaliza se o período é curto
  if (consolidado.totalCompetencias < 3)  pontos -= 10
  if (consolidado.totalCompetencias < 12) pontos -= 5

  // Penaliza se tpNF não estava disponível (parser antigo)
  const semTpNF = nfes.filter(n => !n.tpNF).length
  if (semTpNF > 0) pontos -= 10

  pontos = Math.max(0, Math.min(100, pontos))

  const grau = pontos >= 80 ? 'ALTO' : pontos >= 60 ? 'MEDIO' : 'BAIXO'

  const justificativa =
    grau === 'ALTO'  ? 'Dados completos com valores de PIS/COFINS destacados nas NF-es e período representativo.' :
    grau === 'MEDIO' ? 'Dados parcialmente completos — alguns valores estimados ou período curto.' :
                       'Dados insuficientes — muitos valores estimados ou base de NF-es pequena.'

  return { grau, justificativa, pontos }
}

/**
 * Calcula o score do Motor de Monofásicos para um cliente.
 *
 * @param {object} consolidado - Resultado consolidado
 * @param {object} confianca   - Resultado de calcularGrauConfianca
 * @returns {number} score de 0 a 100
 */
export function calcularScore(consolidado, confianca) {
  let score = 92  // score base da tese (pacificada)

  // Ajusta pelo grau de confiança dos dados
  if (confianca.grau === 'MEDIO') score -= 8
  if (confianca.grau === 'BAIXO') score -= 20

  // Ajusta pelo volume de evidências
  if (consolidado.totalItensMonofasicos < 5)  score -= 10
  if (consolidado.totalItensMonofasicos < 20) score -= 5

  // Ajusta pelo período analisado
  if (consolidado.totalCompetencias < 6)  score -= 10
  if (consolidado.totalCompetencias < 12) score -= 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE DIAGNÓSTICO
// ─────────────────────────────────────────────────────────────

/**
 * Gera o diagnóstico completo de monofásicos para um conjunto de NF-es.
 *
 * @param {Array}  nfes   - Array de NF-es parseadas
 * @param {string} regime - Regime tributário do contribuinte
 * @returns {object}
 */
export function gerarDiagnostico(nfes, regime = 'Simples Nacional') {
  const nfesSaida  = nfes.filter(isNFeSaida)
  const nfesEntrada = nfes.filter(n => !isNFeSaida(n))

  // Todos os itens monofásicos encontrados
  const todosItens = nfesSaida.flatMap(n => n.itens || [])
  const itensMono  = todosItens.filter(isProdutoMonofasico)
  const ncmsUnicos = [...new Set(itensMono.map(i => i.ncm))]
  const categorias = [...new Set(itensMono.map(i => getCategoriaMonofasica(i.ncm)).filter(Boolean))]

  // Produtos com cobrança indevida
  const itensComCobranca = itensMono.filter(temCobrancaIndevida)

  // Competências analisadas
  const competencias = [...new Set(nfesSaida.map(n => n.competencia))].sort()

  return {
    totalNFesAnalisadas:     nfes.length,
    totalNFesSaida:          nfesSaida.length,
    totalNFesEntrada:        nfesEntrada.length,
    totalItens:              todosItens.length,
    totalItensMonofasicos:   itensMono.length,
    itensComCobrancaIndevida: itensComCobranca.length,
    ncmsIdentificados:       ncmsUnicos,
    categorias,
    competencias,
    periodoInicio:           competencias[0]  || '',
    periodoFim:              competencias[competencias.length - 1] || '',
    totalCompetencias:       competencias.length,
    regime,
    situacoesEncontradas: [
      itensMono.length > 0
        ? `${itensMono.length} item(ns) monofásico(s) identificado(s) em ${ncmsUnicos.length} NCM(s) distintos`
        : 'Nenhum item monofásico identificado',
      itensComCobranca.length > 0
        ? `${itensComCobranca.length} item(ns) com PIS/COFINS cobrado indevidamente`
        : 'Nenhuma cobrança indevida detectada com valores destacados',
      nfesEntrada.length > 0
        ? `${nfesEntrada.length} NF-e(s) de entrada descartadas (não geram crédito)`
        : 'Todas as NF-es são de saída',
    ].filter(Boolean),
  }
}

/**
 * Metadados das regras de monofásicos.
 */
export const META_REGRAS_MONOFASICOS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  versaoRegras: '1.0',
  atualizadaEm: '2026-07-08',
  totalRegras:  7,
  observacao:   'Regras baseadas na Lei 10.147/2000, Lei 10.336/2001, Lei 13.097/2015, ' +
                'IN RFB 2.121/2022, SC COSIT 195/2014 e jurisprudência do STJ e CARF.',
}