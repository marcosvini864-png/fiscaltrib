/**
 * regras/exclusao_icms.js — Base de Conhecimento Tributária — FiscalTrib
 * Regras de negócio do Motor de Exclusão do ICMS da Base de PIS/COFINS.
 *
 * Tese jurídica: RE 574.706 STF (Tema 69)
 * "O ICMS não compõe a base de cálculo para a incidência do PIS e da COFINS."
 *
 * Aplicável para:
 * — Lucro Presumido: alíquotas 0,65% (PIS) e 3% (COFINS) — regime cumulativo
 * — Lucro Real: alíquotas 1,65% (PIS) e 7,6% (COFINS) — regime não cumulativo
 * — NÃO se aplica ao Simples Nacional (PIS/COFINS dentro do DAS)
 *
 * Modulação dos efeitos:
 * — Contribuintes COM ação/pedido antes de 15/03/2017: retroatividade de 5 anos
 * — Contribuintes SEM ação/pedido antes de 15/03/2017: direito a partir de 15/03/2017
 *
 * Divergência RFB vs STF:
 * — RFB (ADI 5/2018 e SC COSIT 13/2018): ICMS efetivamente recolhido
 * — STF (embargos 13/05/2021): ICMS destacado na NF-e
 * — Recomendação FiscalTrib: ICMS destacado via judicial
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE REGRAS
// ─────────────────────────────────────────────────────────────

export const ALIQUOTAS_PIS_COFINS = {
  cumulativo: {
    regime:  'Lucro Presumido',
    pis:     0.65,
    cofins:  3.00,
    total:   3.65,
  },
  naoCumulativo: {
    regime:  'Lucro Real',
    pis:     1.65,
    cofins:  7.60,
    total:   9.25,
  },
}

// Data de corte da modulação do Tema 69
export const DATA_CORTE_MODULACAO = '2017-03-15'

// Regimes elegíveis
export const REGIMES_ELEGIVEIS = ['Lucro Presumido', 'Lucro Real']

// ─────────────────────────────────────────────────────────────
// REGRAS DE ELEGIBILIDADE
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se o regime tributário é elegível para a tese.
 * Simples Nacional NÃO é elegível — PIS/COFINS dentro do DAS.
 *
 * @param {string} regime
 * @returns {{ elegivel: boolean, motivo: string }}
 */
export function verificarElegibilidadeRegime(regime) {
  if (!regime) {
    return { elegivel: false, motivo: 'Regime tributário não informado' }
  }
  if (regime === 'Simples Nacional') {
    return {
      elegivel: false,
      motivo:   'Simples Nacional não é elegível — PIS/COFINS recolhido dentro do DAS. ' +
                'Para ICMS-ST no Simples, ver Motor de ICMS-ST.',
    }
  }
  if (!REGIMES_ELEGIVEIS.includes(regime)) {
    return { elegivel: false, motivo: `Regime "${regime}" não elegível para esta tese.` }
  }
  return { elegivel: true, motivo: '' }
}

/**
 * Calcula o período retroativo com base na modulação do STF.
 *
 * @param {string} dataPedido   - Data do pedido/ação no formato 'AAAA-MM-DD'
 * @param {boolean} tinhaPedido - Se tinha ação ou pedido antes de 15/03/2017
 * @returns {object}
 */
export function calcularPeriodoRetroativo(dataPedido, tinhaPedido = false) {
  const corte      = new Date(DATA_CORTE_MODULACAO)
  const pedido     = dataPedido ? new Date(dataPedido) : new Date()
  const cincoAnos  = new Date(pedido)
  cincoAnos.setFullYear(cincoAnos.getFullYear() - 5)

  if (tinhaPedido) {
    // Retroatividade de 5 anos a partir do pedido
    return {
      dataInicio:       cincoAnos.toISOString().slice(0, 10),
      dataFim:          dataPedido || new Date().toISOString().slice(0, 10),
      mesesRetroativos: calcularMesesEntre(cincoAnos, pedido),
      modulacaoAplicada: false,
      obs:              'Pedido anterior à modulação — retroatividade máxima de 5 anos.',
    }
  } else {
    // Direito apenas a partir de 15/03/2017
    const inicio = corte > cincoAnos ? corte : cincoAnos
    return {
      dataInicio:       inicio.toISOString().slice(0, 10),
      dataFim:          dataPedido || new Date().toISOString().slice(0, 10),
      mesesRetroativos: calcularMesesEntre(inicio, pedido),
      modulacaoAplicada: true,
      obs:              'Sem pedido anterior à modulação — direito a partir de 15/03/2017.',
    }
  }
}

/**
 * Calcula o número de meses entre duas datas.
 * @param {Date} inicio
 * @param {Date} fim
 * @returns {number}
 */
function calcularMesesEntre(inicio, fim) {
  return Math.max(0,
    (fim.getFullYear() - inicio.getFullYear()) * 12 +
    (fim.getMonth() - inicio.getMonth())
  )
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE IDENTIFICAÇÃO DO ICMS
// ─────────────────────────────────────────────────────────────

/**
 * Obtém o valor do ICMS a ser excluído de uma NF-e.
 * Segue o entendimento do STF (embargos 2021): ICMS destacado.
 *
 * @param {object} nfe    - NF-e parseada
 * @param {string} metodo - 'DESTACADO' (STF) ou 'RECOLHIDO' (RFB)
 * @returns {{ valorICMS: number, metodo: string, obs: string }}
 */
export function obterICMSParaExclusao(nfe, metodo = 'DESTACADO') {
  if (!nfe) return { valorICMS: 0, metodo, obs: 'NF-e inválida' }

  if (metodo === 'DESTACADO') {
    // STF: ICMS destacado na NF-e (total da nota)
    const valorICMS = nfe.vICMS || 0
    return {
      valorICMS,
      metodo:  'DESTACADO',
      fonte:   'vICMS da NF-e (tag <vICMS> do XML)',
      obs:     'Conforme STF nos embargos de declaração do RE 574.706 (13/05/2021).',
    }
  } else {
    // RFB: ICMS efetivamente recolhido (posição mais restritiva)
    // Sem o SPED Fiscal não é possível calcular com precisão — usa vICMS como proxy
    const valorICMS = nfe.vICMS || 0
    return {
      valorICMS,
      metodo:  'RECOLHIDO',
      fonte:   'Estimativa baseada em vICMS (recolhido real requer SPED Fiscal)',
      obs:     'Conforme ADI RFB 5/2018 e SC COSIT 13/2018 — posição mais restritiva da RFB.',
      riscoGlosa: 'MEDIO',
    }
  }
}

/**
 * Valida uma NF-e para análise de exclusão do ICMS.
 *
 * @param {object} nfe
 * @param {string} regime
 * @returns {{ valida: boolean, motivo: string }}
 */
export function validarNFeParaExclusao(nfe, regime) {
  if (!nfe)             return { valida: false, motivo: 'NF-e nula ou indefinida' }
  if (!nfe.valido)      return { valida: false, motivo: 'NF-e inválida' }
  if (!nfe.competencia) return { valida: false, motivo: 'Competência não identificada' }
  if (nfe.vNF <= 0)     return { valida: false, motivo: 'Valor total da NF-e é zero' }

  // Verifica se é NF-e de saída
  if (nfe.tpNF && nfe.tpNF !== '1') {
    return { valida: false, motivo: 'NF-e de entrada — não gera crédito de exclusão do ICMS' }
  }

  // Verifica se há ICMS destacado
  if ((nfe.vICMS || 0) <= 0) {
    return { valida: false, motivo: 'ICMS não destacado nesta NF-e' }
  }

  // Verifica elegibilidade do regime
  const elegibilidade = verificarElegibilidadeRegime(regime)
  if (!elegibilidade.elegivel) {
    return { valida: false, motivo: elegibilidade.motivo }
  }

  return { valida: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CÁLCULO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o crédito de PIS/COFINS pela exclusão do ICMS da base.
 *
 * @param {number} valorICMS - Valor do ICMS a excluir da base
 * @param {string} regime    - 'Lucro Presumido' ou 'Lucro Real'
 * @returns {object}
 */
export function calcularCreditoExclusaoICMS(valorICMS, regime = 'Lucro Presumido') {
  if (valorICMS <= 0) return { creditoPIS: 0, creditoCOFINS: 0, credito: 0 }

  const aliq = regime === 'Lucro Real'
    ? ALIQUOTAS_PIS_COFINS.naoCumulativo
    : ALIQUOTAS_PIS_COFINS.cumulativo

  const creditoPIS    = valorICMS * (aliq.pis    / 100)
  const creditoCOFINS = valorICMS * (aliq.cofins / 100)
  const credito       = creditoPIS + creditoCOFINS

  return {
    creditoPIS,
    creditoCOFINS,
    credito,
    aliqPIS:       aliq.pis,
    aliqCOFINS:    aliq.cofins,
    valorICMSBase: valorICMS,
    regime,
    obs: `Crédito = ICMS excluído × (PIS ${aliq.pis}% + COFINS ${aliq.cofins}%)`,
  }
}

/**
 * Calcula o crédito total de uma NF-e para exclusão do ICMS.
 *
 * @param {object} nfe    - NF-e parseada
 * @param {string} regime - Regime tributário
 * @param {string} metodo - 'DESTACADO' ou 'RECOLHIDO'
 * @returns {object}
 */
export function calcularCreditoNFeExclusao(nfe, regime = 'Lucro Presumido', metodo = 'DESTACADO') {
  const validacao = validarNFeParaExclusao(nfe, regime)
  if (!validacao.valida) {
    return { valido: false, motivo: validacao.motivo, credito: 0 }
  }

  const icmsInfo = obterICMSParaExclusao(nfe, metodo)
  if (icmsInfo.valorICMS <= 0) {
    return { valido: true, credito: 0, obs: 'Sem ICMS para excluir nesta NF-e' }
  }

  const calc = calcularCreditoExclusaoICMS(icmsInfo.valorICMS, regime)

  return {
    valido:      true,
    chNFe:       nfe.chNFe,
    competencia: nfe.competencia,
    vNF:         nfe.vNF,
    valorICMS:   icmsInfo.valorICMS,
    metodoICMS:  icmsInfo.metodo,
    regime,
    ...calc,
  }
}

/**
 * Consolida créditos de exclusão do ICMS por competência.
 *
 * @param {Array}  nfes        - Array de NF-es parseadas
 * @param {string} regime      - Regime tributário
 * @param {string} metodo      - 'DESTACADO' ou 'RECOLHIDO'
 * @param {object} modulacao   - { tinhaPedido, dataPedido }
 * @returns {object}
 */
export function consolidarCreditosExclusaoICMS(
  nfes,
  regime      = 'Lucro Presumido',
  metodo      = 'DESTACADO',
  modulacao   = { tinhaPedido: false, dataPedido: null }
) {
  // Calcula o período retroativo com base na modulação
  const periodo = calcularPeriodoRetroativo(modulacao.dataPedido, modulacao.tinhaPedido)

  // Filtra NF-es dentro do período retroativo
  const nfesFiltradas = nfes.filter(nfe => {
    if (!nfe.competencia) return false
    const compData = new Date(nfe.competencia + '-01')
    const inicio   = new Date(periodo.dataInicio)
    const fim      = new Date(periodo.dataFim)
    return compData >= inicio && compData <= fim
  })

  const porCompetencia = {}
  let creditoTotal      = 0
  let totalICMSExcluido = 0
  let totalNFesComICMS  = 0

  nfesFiltradas.forEach(nfe => {
    const calc = calcularCreditoNFeExclusao(nfe, regime, metodo)
    if (!calc.valido || calc.credito <= 0) return

    const comp = nfe.competencia
    if (!porCompetencia[comp]) {
      porCompetencia[comp] = {
        competencia:   comp,
        totalNFes:     0,
        totalICMS:     0,
        creditoPIS:    0,
        creditoCOFINS: 0,
        credito:       0,
      }
    }

    porCompetencia[comp].totalNFes++
    porCompetencia[comp].totalICMS     += calc.valorICMS || 0
    porCompetencia[comp].creditoPIS    += calc.creditoPIS || 0
    porCompetencia[comp].creditoCOFINS += calc.creditoCOFINS || 0
    porCompetencia[comp].credito       += calc.credito

    creditoTotal       += calc.credito
    totalICMSExcluido  += calc.valorICMS || 0
    totalNFesComICMS++
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
    totalICMSExcluido,
    totalNFes:           nfes.length,
    totalNFesFiltradas:  nfesFiltradas.length,
    totalNFesComICMS,
    totalCompetencias:   competencias.length,
    periodoInicio:       competencias[0]?.competencia || '',
    periodoFim:          competencias[competencias.length - 1]?.competencia || '',
    periodo,
    regime,
    metodo,
    porCompetencia,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE DIAGNÓSTICO
// ─────────────────────────────────────────────────────────────

/**
 * Gera o diagnóstico completo para exclusão do ICMS.
 *
 * @param {Array}  nfes      - Array de NF-es parseadas
 * @param {string} regime    - Regime tributário
 * @param {object} modulacao - { tinhaPedido, dataPedido }
 * @returns {object}
 */
export function gerarDiagnosticoExclusaoICMS(
  nfes,
  regime    = 'Lucro Presumido',
  modulacao = { tinhaPedido: false, dataPedido: null }
) {
  // Verifica elegibilidade
  const elegibilidade = verificarElegibilidadeRegime(regime)

  // NF-es de saída com ICMS
  const nfesSaida      = nfes.filter(n => !n.tpNF || n.tpNF === '1')
  const nfesComICMS    = nfesSaida.filter(n => (n.vICMS || 0) > 0)
  const competencias   = [...new Set(nfes.map(n => n.competencia))].sort()
  const periodo        = calcularPeriodoRetroativo(modulacao.dataPedido, modulacao.tinhaPedido)

  // Totais
  const totalVNF   = nfesComICMS.reduce((s, n) => s + (n.vNF   || 0), 0)
  const totalICMS  = nfesComICMS.reduce((s, n) => s + (n.vICMS || 0), 0)
  const percICMS   = totalVNF > 0 ? (totalICMS / totalVNF) * 100 : 0

  return {
    elegivel:              elegibilidade.elegivel,
    motivoInelegivel:      elegibilidade.motivo,
    totalNFesAnalisadas:   nfes.length,
    totalNFesSaida:        nfesSaida.length,
    totalNFesComICMS:      nfesComICMS.length,
    totalVNF,
    totalICMSIdentificado: totalICMS,
    percentualICMS:        percICMS.toFixed(2) + '%',
    competencias,
    periodoInicio:         competencias[0]  || '',
    periodoFim:            competencias[competencias.length - 1] || '',
    totalCompetencias:     competencias.length,
    modulacao:             periodo,
    regime,
    situacoesEncontradas: [
      elegibilidade.elegivel
        ? `Regime ${regime} é elegível para exclusão do ICMS da base de PIS/COFINS`
        : `Regime ${regime} NÃO é elegível — ${elegibilidade.motivo}`,
      nfesComICMS.length > 0
        ? `${nfesComICMS.length} NF-e(s) com ICMS destacado — total: R$ ${totalICMS.toFixed(2)}`
        : 'Nenhuma NF-e com ICMS destacado identificada',
      periodo.modulacaoAplicada
        ? `Modulação aplicada — direito a partir de ${DATA_CORTE_MODULACAO}`
        : `Retroatividade máxima — direito aos 5 anos anteriores ao pedido`,
    ].filter(Boolean),
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SCORE E CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o grau de confiança da análise de exclusão do ICMS.
 *
 * @param {object} consolidado
 * @param {string} metodo
 * @returns {{ grau: string, justificativa: string, pontos: number }}
 */
export function calcularGrauConfiancaExclusao(consolidado, metodo = 'DESTACADO') {
  let pontos = 100

  // Penaliza se usa método recolhido (risco de glosa)
  if (metodo === 'RECOLHIDO') pontos -= 10

  // Penaliza se período curto
  if (consolidado.totalCompetencias < 6)  pontos -= 10
  if (consolidado.totalCompetencias < 12) pontos -= 5

  // Penaliza se poucas NF-es com ICMS
  if (consolidado.totalNFesComICMS < 10) pontos -= 10

  // Penaliza se modulação foi aplicada (período menor)
  if (consolidado.periodo?.modulacaoAplicada) pontos -= 5

  pontos = Math.max(0, Math.min(100, pontos))
  const grau = pontos >= 80 ? 'ALTO' : pontos >= 60 ? 'MEDIO' : 'BAIXO'

  const justificativa =
    grau === 'ALTO'  ? 'ICMS destacado via judicial — máxima segurança jurídica (STF embargos 2021).' :
    grau === 'MEDIO' ? 'Análise completa mas com limitações de período ou volume de NF-es.' :
                       'Dados insuficientes para análise conclusiva.'

  return { grau, justificativa, pontos }
}

/**
 * Calcula o score do Motor de Exclusão ICMS.
 *
 * @param {object} consolidado
 * @param {object} confianca
 * @returns {number}
 */
export function calcularScoreExclusaoICMS(consolidado, confianca) {
  let score = 88  // score base

  // Via judicial é mais segura
  if (consolidado.metodo === 'DESTACADO') score += 2

  if (confianca.grau === 'MEDIO') score -= 8
  if (confianca.grau === 'BAIXO') score -= 20

  if (consolidado.totalNFesComICMS < 10) score -= 8
  if (consolidado.totalCompetencias < 6) score -= 8
  if (consolidado.periodo?.modulacaoAplicada) score -= 3

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Metadados das regras de exclusão do ICMS.
 */
export const META_REGRAS_EXCLUSAO_ICMS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  versaoRegras: '1.0',
  atualizadaEm: '2026-07-08',
  totalRegras:  9,
  observacao:   'Regras baseadas no RE 574.706 STF (Tema 69) e embargos de declaração (13/05/2021). ' +
                'Recomendado usar ICMS destacado via judicial para garantir o maior valor.',
}