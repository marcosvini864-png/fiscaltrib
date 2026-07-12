/**
 * base/regras/exclusao_icms.js — FiscalTrib
 * Funções puras de cálculo e diagnóstico para Exclusão do ICMS da Base de PIS/COFINS.
 *
 * Tese: RE 574.706 STF (Tema 69)
 * Aplicável: Lucro Presumido e Lucro Real
 *
 * ATENÇÃO: Este arquivo é puro — apenas exporta funções de cálculo.
 * Não usa contratos (ResultadoPadrao, Evidencia). Não tem lógica de orquestração.
 *
 * Versão: 1.0
 * Data: 2026-07-11
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

export const ALIQUOTAS_PIS_COFINS = {
  'Lucro Presumido': { pis: 0.0065, cofins: 0.03  },
  'Lucro Real':      { pis: 0.0165, cofins: 0.076 },
}

export const DATA_CORTE_MODULACAO = '2017-03-15'

export const REGIMES_ELEGIVEIS = ['Lucro Presumido', 'Lucro Real']

// ─────────────────────────────────────────────────────────────
// 1. ELEGIBILIDADE
// ─────────────────────────────────────────────────────────────

export function verificarElegibilidadeRegime(regime) {
  if (!regime) {
    return {
      elegivel: false,
      motivo: 'Regime tributário não informado.',
    }
  }

  if (!REGIMES_ELEGIVEIS.includes(regime)) {
    return {
      elegivel: false,
      motivo: `Regime "${regime}" não é elegível para Exclusão do ICMS (Tema 69). ` +
              `Aplicável apenas ao Lucro Presumido e Lucro Real. ` +
              `Empresas do Simples Nacional apuram PIS/COFINS de forma diferenciada, ` +
              `sem base de cálculo separada para exclusão do ICMS.`,
    }
  }

  return {
    elegivel: true,
    motivo: `Regime ${regime} elegível para Exclusão do ICMS da base de PIS/COFINS (Tema 69 STF).`,
  }
}

// ─────────────────────────────────────────────────────────────
// 2. DIAGNÓSTICO GERAL
// ─────────────────────────────────────────────────────────────

export function gerarDiagnosticoExclusaoICMS(nfes, regime, modulacao = {}) {
  const nfesSaida = nfes.filter(n => !n.tpNF || n.tpNF === '1')
  const nfesComICMS = nfesSaida.filter(n => (n.vICMS || 0) > 0)

  const totalFaturamento = nfesSaida.reduce((s, n) => s + (n.vNF || 0), 0)
  const totalICMS = nfesComICMS.reduce((s, n) => s + (n.vICMS || 0), 0)

  // Competências únicas (YYYY-MM)
  const competenciasSet = new Set()
  nfesSaida.forEach(n => {
    if (n.dhEmi || n.dEmi) {
      const data = (n.dhEmi || n.dEmi).substring(0, 7)
      competenciasSet.add(data)
    }
  })
  const competencias = Array.from(competenciasSet).sort()

  // Período
  const periodoInicio = competencias[0] || ''
  const periodoFim    = competencias[competencias.length - 1] || ''

  // Modulação
  const tinhaPedido  = modulacao.tinhaPedido || false
  const dataPedido   = modulacao.dataPedido  || null
  const corte        = DATA_CORTE_MODULACAO
  let obsModulacao   = ''

  if (tinhaPedido && dataPedido && dataPedido <= corte) {
    obsModulacao = `Retroatividade integral — pedido anterior a ${corte}.`
  } else if (tinhaPedido && dataPedido && dataPedido > corte) {
    obsModulacao = `Retroatividade limitada — pedido após ${corte} (modulação STF).`
  } else {
    obsModulacao = `Sem pedido anterior a ${corte} — modulação pode limitar retroatividade. Verificar com advogado.`
  }

  const percentualICMS = totalFaturamento > 0
    ? ((totalICMS / totalFaturamento) * 100).toFixed(2) + '%'
    : '0.00%'

  return {
    totalNFesAnalisadas:    nfes.length,
    totalNFesSaida:         nfesSaida.length,
    totalNFesComICMS:       nfesComICMS.length,
    totalICMSIdentificado:  totalICMS,
    totalFaturamento,
    percentualICMS,
    competencias,
    totalCompetencias:      competencias.length,
    periodoInicio,
    periodoFim,
    modulacao: {
      tinhaPedido,
      dataPedido,
      obs: obsModulacao,
    },
    situacoesEncontradas: [
      `${nfesSaida.length} NF-e(s) de saída`,
      `${nfesComICMS.length} NF-e(s) com ICMS destacado`,
      `${nfesSaida.length - nfesComICMS.length} NF-e(s) sem ICMS`,
    ],
    versaoBase: VERSAO_ATUAL,
  }
}

// ─────────────────────────────────────────────────────────────
// 3. CÁLCULO POR NF-e
// ─────────────────────────────────────────────────────────────

export function calcularCreditoNFeExclusao(nfe, regime, metodo = 'DESTACADO') {
  const aliq = ALIQUOTAS_PIS_COFINS[regime]
  if (!aliq) {
    return { valido: false, credito: 0, motivo: 'Regime não elegível.' }
  }

  const vICMS = metodo === 'DESTACADO'
    ? (nfe.vICMS || 0)
    : (nfe.vICMSRecolhido || nfe.vICMS || 0)

  if (vICMS <= 0) {
    return { valido: false, credito: 0, motivo: 'ICMS zero ou não informado.' }
  }

  const creditoPIS    = vICMS * aliq.pis
  const creditoCOFINS = vICMS * aliq.cofins
  const creditoTotal  = creditoPIS + creditoCOFINS

  return {
    valido:        true,
    vICMS,
    creditoPIS,
    creditoCOFINS,
    creditoTotal:  creditoTotal,
    credito:       creditoTotal,
    aliquotaPIS:   aliq.pis,
    aliquotaCOFINS: aliq.cofins,
    metodo,
  }
}

// ─────────────────────────────────────────────────────────────
// 4. CONSOLIDAÇÃO POR COMPETÊNCIA
// ─────────────────────────────────────────────────────────────

export function consolidarCreditosExclusaoICMS(nfes, regime, metodo = 'DESTACADO', modulacao = {}) {
  const aliq = ALIQUOTAS_PIS_COFINS[regime]
  if (!aliq) {
    return {
      totalICMSExcluido: 0, creditoTotal: 0, creditoMensalMedio: 0,
      creditoPor12Meses: 0, creditoPor24Meses: 0,
      creditoPor36Meses: 0, creditoPor60Meses: 0,
      porCompetencia: [], totalCompetencias: 0,
    }
  }

  const nfesSaida = nfes.filter(n => !n.tpNF || n.tpNF === '1')

  // Data de corte por modulação
  const tinhaPedido = modulacao.tinhaPedido || false
  const dataPedido  = modulacao.dataPedido  || null
  const aplicarCorte = !tinhaPedido || (dataPedido && dataPedido > DATA_CORTE_MODULACAO)
  const dataCorteObj = aplicarCorte ? new Date(DATA_CORTE_MODULACAO) : null

  // Agrupamento por competência
  const mapa = {}

  nfesSaida.forEach(nfe => {
    const vICMS = metodo === 'DESTACADO'
      ? (nfe.vICMS || 0)
      : (nfe.vICMSRecolhido || nfe.vICMS || 0)

    if (vICMS <= 0) return

    const dataStr = nfe.dhEmi || nfe.dEmi || ''
    if (!dataStr) return

    // Filtro de modulação
    if (dataCorteObj) {
      const dataNFe = new Date(dataStr.substring(0, 10))
      if (dataNFe < dataCorteObj) return
    }

    const competencia = dataStr.substring(0, 7) // YYYY-MM

    if (!mapa[competencia]) {
      mapa[competencia] = {
        competencia,
        totalICMS:    0,
        creditoPIS:   0,
        creditoCOFINS: 0,
        creditoTotal: 0,
        qtdNFes:      0,
      }
    }

    const creditoPIS    = vICMS * aliq.pis
    const creditoCOFINS = vICMS * aliq.cofins

    mapa[competencia].totalICMS     += vICMS
    mapa[competencia].creditoPIS    += creditoPIS
    mapa[competencia].creditoCOFINS += creditoCOFINS
    mapa[competencia].creditoTotal  += creditoPIS + creditoCOFINS
    mapa[competencia].qtdNFes       += 1
  })

  const porCompetencia   = Object.values(mapa).sort((a, b) => a.competencia.localeCompare(b.competencia))
  const totalICMSExcluido = porCompetencia.reduce((s, c) => s + c.totalICMS, 0)
  const creditoTotal      = porCompetencia.reduce((s, c) => s + c.creditoTotal, 0)
  const totalCompetencias = porCompetencia.length

  const creditoMensalMedio = totalCompetencias > 0 ? creditoTotal / totalCompetencias : 0

  return {
    totalICMSExcluido,
    creditoTotal,
    creditoMensalMedio,
    creditoPor12Meses:  creditoMensalMedio * 12,
    creditoPor24Meses:  creditoMensalMedio * 24,
    creditoPor36Meses:  creditoMensalMedio * 36,
    creditoPor60Meses:  creditoMensalMedio * 60,
    porCompetencia,
    totalCompetencias,
    periodo: {
      inicio:            porCompetencia[0]?.competencia || '',
      fim:               porCompetencia[porCompetencia.length - 1]?.competencia || '',
      modulacaoAplicada: aplicarCorte,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// 5. GRAU DE CONFIANÇA
// ─────────────────────────────────────────────────────────────

export function calcularGrauConfiancaExclusao(consolidado, metodo = 'DESTACADO') {
  // Tese pacificada no STF — confiança sempre alta
  if (metodo === 'DESTACADO') {
    return {
      grau: 'ALTO',
      justificativa: 'Tese pacificada no STF (RE 574.706 — Tema 69). ' +
                     'ICMS destacado conforme entendimento do próprio STF nos embargos de 13/05/2021.',
    }
  }

  return {
    grau: 'MEDIO',
    justificativa: 'Usando ICMS recolhido — menor risco de glosa pela RFB, ' +
                   'mas valor recuperável inferior ao método do ICMS destacado.',
  }
}

// ─────────────────────────────────────────────────────────────
// 6. SCORE
// ─────────────────────────────────────────────────────────────

export function calcularScoreExclusaoICMS(consolidado, confianca) {
  let score = 0

  // Tese pacificada no STF: base alta
  score += 50

  // Grau de confiança
  if (confianca.grau === 'ALTO')  score += 20
  if (confianca.grau === 'MEDIO') score += 10

  // Volume de competências analisadas
  if (consolidado.totalCompetencias >= 24) score += 15
  else if (consolidado.totalCompetencias >= 12) score += 10
  else if (consolidado.totalCompetencias >= 6)  score += 5

  // Valor do crédito
  if (consolidado.creditoTotal >= 50000)  score += 15
  else if (consolidado.creditoTotal >= 10000) score += 10
  else if (consolidado.creditoTotal >= 1000)  score += 5

  return Math.min(score, 100)
}