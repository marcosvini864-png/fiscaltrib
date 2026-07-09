/**
 * regras/irpj_csll.js — Base de Conhecimento Tributária — FiscalTrib
 * Regras de negócio do Motor de IRPJ e CSLL.
 *
 * Modalidades analisadas:
 * 1. Lucro Presumido — percentuais de presunção por atividade
 * 2. Lucro Real — prejuízo fiscal, base negativa de CSLL
 * 3. JCP — Juros sobre Capital Próprio (dedutibilidade)
 * 4. IRPJ/CSLL sobre SELIC na repetição do indébito (Tema 962 STF)
 *
 * Base legal:
 * — Lei 9.249/1995 (JCP e presunção LP)
 * — Lei 9.718/1998 (base de cálculo)
 * — RIR/2018 — Decreto 9.580/2018
 * — RE 1.063.187 STF (Tema 962 — SELIC)
 * — SC COSIT 23/2022 (JCP)
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE REGRAS
// ─────────────────────────────────────────────────────────────

// Alíquotas de IRPJ e CSLL
export const ALIQUOTAS_IRPJ_CSLL = {
  irpj:          0.15,    // 15% sobre o lucro
  irpjAdicional: 0.10,    // 10% sobre lucro > R$ 20.000/mês
  csll:          0.09,    // 9% sobre o lucro (geral)
  csllFinanceira:0.15,    // 15% para instituições financeiras
  limiteAdicional: 20000, // R$ 20.000/mês para adicional de IRPJ
}

// Percentuais de presunção Lucro Presumido — IRPJ
// Fonte: Lei 9.249/1995, Art. 15 e RIR/2018, Art. 215
export const PRESUNCAO_IRPJ = {
  revendaCombustiveis:     0.016,  // 1,6%
  vendaMercadorias:        0.08,   // 8%
  transporteCargas:        0.08,   // 8%
  prestacaoServicoHosp:   0.08,   // 8%
  atividadeImobiliaria:   0.08,   // 8%
  transportePassageiros:   0.16,   // 16%
  prestacaoServicosGeral: 0.32,   // 32%
  intermediacaoNegocios:  0.32,   // 32%
  administracaoBens:       0.32,   // 32%
  factoring:               0.32,   // 32%
}

// Percentuais de presunção Lucro Presumido — CSLL
// Fonte: Lei 9.249/1995, Art. 20 e Lei 10.684/2003
export const PRESUNCAO_CSLL = {
  revendaCombustiveis:     0.12,   // 12%
  vendaMercadorias:        0.12,   // 12%
  transporteCargas:        0.12,   // 12%
  prestacaoServicoHosp:   0.12,   // 12%
  atividadeImobiliaria:   0.12,   // 12%
  transportePassageiros:   0.12,   // 12%
  prestacaoServicosGeral: 0.32,   // 32%
  intermediacaoNegocios:  0.32,   // 32%
  administracaoBens:       0.32,   // 32%
  factoring:               0.32,   // 32%
}

// Data de corte modulação Tema 962 (SELIC)
export const DATA_CORTE_TEMA_962 = '2021-09-24'

// ─────────────────────────────────────────────────────────────
// REGRAS DE ELEGIBILIDADE
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se o regime é elegível para análise de IRPJ/CSLL.
 *
 * @param {string} regime
 * @returns {{ elegivel: boolean, motivo: string }}
 */
export function verificarElegibilidadeIRPJ(regime) {
  if (!regime) {
    return { elegivel: false, motivo: 'Regime tributário não informado' }
  }
  if (regime === 'Simples Nacional') {
    return {
      elegivel: false,
      motivo:   'Simples Nacional não recolhe IRPJ/CSLL separadamente — incluídos no DAS.',
    }
  }
  if (!['Lucro Presumido', 'Lucro Real'].includes(regime)) {
    return { elegivel: false, motivo: `Regime "${regime}" não reconhecido para IRPJ/CSLL.` }
  }
  return { elegivel: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DO LUCRO PRESUMIDO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o IRPJ no Lucro Presumido.
 *
 * @param {number} receitaBruta    - Receita bruta do período
 * @param {string} tipoAtividade   - Chave de PRESUNCAO_IRPJ
 * @param {number} meses           - Número de meses do período (1, 3 ou 12)
 * @returns {object}
 */
export function calcularIRPJLucroPresumido(receitaBruta, tipoAtividade = 'vendaMercadorias', meses = 3) {
  const percPresuncao = PRESUNCAO_IRPJ[tipoAtividade]
  if (!percPresuncao) {
    return { valido: false, motivo: `Tipo de atividade "${tipoAtividade}" não encontrado` }
  }

  const baseCalculo     = receitaBruta * percPresuncao
  const irpjNormal      = baseCalculo * ALIQUOTAS_IRPJ_CSLL.irpj
  const limiteAdicional = ALIQUOTAS_IRPJ_CSLL.limiteAdicional * meses
  const baseAdicional   = Math.max(0, baseCalculo - limiteAdicional)
  const irpjAdicional   = baseAdicional * ALIQUOTAS_IRPJ_CSLL.irpjAdicional
  const irpjTotal       = irpjNormal + irpjAdicional

  return {
    valido:           true,
    receitaBruta,
    tipoAtividade,
    percentualPresuncao: percPresuncao * 100,
    baseCalculo,
    irpjNormal,
    irpjAdicional,
    irpjTotal,
    aliquotaEfetiva:  receitaBruta > 0 ? (irpjTotal / receitaBruta) * 100 : 0,
    meses,
    obs: irpjAdicional > 0
      ? `Adicional de 10% sobre R$ ${baseAdicional.toFixed(2)} (excedente ao limite de R$ ${limiteAdicional.toFixed(2)})`
      : 'Sem adicional de IRPJ — base dentro do limite mensal',
  }
}

/**
 * Calcula a CSLL no Lucro Presumido.
 *
 * @param {number} receitaBruta  - Receita bruta do período
 * @param {string} tipoAtividade - Chave de PRESUNCAO_CSLL
 * @param {boolean} isFinanceira - Se é instituição financeira (alíquota 15%)
 * @returns {object}
 */
export function calcularCSLLLucroPresumido(receitaBruta, tipoAtividade = 'vendaMercadorias', isFinanceira = false) {
  const percPresuncao = PRESUNCAO_CSLL[tipoAtividade]
  if (!percPresuncao) {
    return { valido: false, motivo: `Tipo de atividade "${tipoAtividade}" não encontrado` }
  }

  const baseCalculo  = receitaBruta * percPresuncao
  const aliqCSLL     = isFinanceira ? ALIQUOTAS_IRPJ_CSLL.csllFinanceira : ALIQUOTAS_IRPJ_CSLL.csll
  const csllTotal    = baseCalculo * aliqCSLL

  return {
    valido:           true,
    receitaBruta,
    tipoAtividade,
    percentualPresuncao: percPresuncao * 100,
    baseCalculo,
    aliquotaCSLL:     aliqCSLL * 100,
    csllTotal,
    aliquotaEfetiva:  receitaBruta > 0 ? (csllTotal / receitaBruta) * 100 : 0,
    isFinanceira,
  }
}

/**
 * Calcula IRPJ e CSLL consolidados no Lucro Presumido.
 *
 * @param {number} receitaBruta
 * @param {string} tipoAtividade
 * @param {number} meses
 * @param {boolean} isFinanceira
 * @returns {object}
 */
export function calcularIRPJCSLLPresumido(receitaBruta, tipoAtividade = 'vendaMercadorias', meses = 3, isFinanceira = false) {
  const irpj = calcularIRPJLucroPresumido(receitaBruta, tipoAtividade, meses)
  const csll = calcularCSLLLucroPresumido(receitaBruta, tipoAtividade, isFinanceira)

  if (!irpj.valido || !csll.valido) {
    return { valido: false, motivo: irpj.motivo || csll.motivo }
  }

  const totalIRPJCSLL    = irpj.irpjTotal + csll.csllTotal
  const cargaTributaria  = receitaBruta > 0 ? (totalIRPJCSLL / receitaBruta) * 100 : 0

  return {
    valido:          true,
    receitaBruta,
    tipoAtividade,
    meses,
    irpj,
    csll,
    totalIRPJCSLL,
    cargaTributaria: cargaTributaria.toFixed(2) + '%',
    regime:          'Lucro Presumido',
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DO LUCRO REAL
// ─────────────────────────────────────────────────────────────

/**
 * Calcula IRPJ e CSLL no Lucro Real.
 *
 * @param {number} lucroLiquido   - Lucro líquido contábil do período
 * @param {number} ajustesPositivos - Adições ao lucro fiscal
 * @param {number} ajustesNegativos - Exclusões do lucro fiscal
 * @param {number} prejuizoFiscal   - Prejuízo fiscal acumulado a compensar
 * @param {number} baseNegativaCSLL - Base negativa de CSLL acumulada
 * @param {number} meses            - Meses do período
 * @param {boolean} isFinanceira
 * @returns {object}
 */
export function calcularIRPJCSLLLucroReal({
  lucroLiquido      = 0,
  ajustesPositivos  = 0,
  ajustesNegativos  = 0,
  prejuizoFiscal    = 0,
  baseNegativaCSLL  = 0,
  meses             = 3,
  isFinanceira      = false,
}) {
  // IRPJ — Lucro Real
  const lalur              = lucroLiquido + ajustesPositivos - ajustesNegativos
  const limiteCompensacao  = lalur * 0.30  // limite de 30% do lucro ajustado
  const prejuizoCompensado = Math.min(prejuizoFiscal, limiteCompensacao)
  const baseIRPJ           = Math.max(0, lalur - prejuizoCompensado)
  const irpjNormal         = baseIRPJ * ALIQUOTAS_IRPJ_CSLL.irpj
  const limiteAdicional    = ALIQUOTAS_IRPJ_CSLL.limiteAdicional * meses
  const baseAdicional      = Math.max(0, baseIRPJ - limiteAdicional)
  const irpjAdicional      = baseAdicional * ALIQUOTAS_IRPJ_CSLL.irpjAdicional
  const irpjTotal          = irpjNormal + irpjAdicional

  // CSLL — Lucro Real
  const aliqCSLL           = isFinanceira ? ALIQUOTAS_IRPJ_CSLL.csllFinanceira : ALIQUOTAS_IRPJ_CSLL.csll
  const baseCSLL           = lalur  // mesma base do LALUR para CSLL
  const limiteCompCSLL     = baseCSLL * 0.30
  const baseNegCompensada  = Math.min(baseNegativaCSLL, limiteCompCSLL)
  const baseCSLLFinal      = Math.max(0, baseCSLL - baseNegCompensada)
  const csllTotal          = baseCSLLFinal * aliqCSLL

  return {
    valido:              true,
    regime:              'Lucro Real',
    lucroLiquido,
    ajustesPositivos,
    ajustesNegativos,
    lalur,
    prejuizoFiscal,
    prejuizoCompensado,
    baseIRPJ,
    irpjNormal,
    irpjAdicional,
    irpjTotal,
    baseNegativaCSLL,
    baseNegCompensada,
    baseCSLLFinal,
    aliquotaCSLL:        aliqCSLL * 100,
    csllTotal,
    totalIRPJCSLL:       irpjTotal + csllTotal,
    meses,
    isFinanceira,
    saldoPrejuizoRestante:    Math.max(0, prejuizoFiscal - prejuizoCompensado),
    saldoBaseNegRestante:     Math.max(0, baseNegativaCSLL - baseNegCompensada),
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE JCP — JUROS SOBRE CAPITAL PRÓPRIO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula os Juros sobre Capital Próprio dedutíveis.
 *
 * @param {number} patrimonioLiquido  - PL do exercício anterior
 * @param {number} tjlpAnual          - TJLP anual em decimal (ex: 0.07 para 7%)
 * @param {number} lucroLiquidoPeriodo - Lucro líquido do período
 * @param {number} lucrosAcumulados    - Lucros acumulados e reservas
 * @returns {object}
 */
export function calcularJCP(patrimonioLiquido, tjlpAnual, lucroLiquidoPeriodo, lucrosAcumulados) {
  if (patrimonioLiquido <= 0 || tjlpAnual <= 0) {
    return { valido: false, motivo: 'Patrimônio líquido ou TJLP não informados', jcpDedutivel: 0 }
  }

  // JCP bruto = PL × TJLP
  const jcpBruto = patrimonioLiquido * tjlpAnual

  // Limites de dedução (aplica o menor)
  const limite1 = lucroLiquidoPeriodo * 0.50    // 50% do lucro líquido
  const limite2 = lucrosAcumulados   * 0.50    // 50% dos lucros acumulados
  const limite  = Math.min(limite1, limite2)

  const jcpDedutivel = Math.min(jcpBruto, limite)

  // Economia de IRPJ e CSLL com a dedução
  const economiaIRPJ = jcpDedutivel * ALIQUOTAS_IRPJ_CSLL.irpj
  const economiaCSLL = jcpDedutivel * ALIQUOTAS_IRPJ_CSLL.csll
  const economiaTotal = economiaIRPJ + economiaCSLL

  // IRRF sobre JCP pago (15%)
  const irrfRetido = jcpDedutivel * 0.15

  return {
    valido:            true,
    patrimonioLiquido,
    tjlpAnual:         tjlpAnual * 100,
    jcpBruto,
    limite1,
    limite2,
    limite,
    jcpDedutivel,
    economiaIRPJ,
    economiaCSLL,
    economiaTotal,
    economiaLiquida:   economiaTotal - irrfRetido,
    irrfRetido,
    aliquotaIRRF:      15,
    obs: jcpDedutivel < jcpBruto
      ? `JCP limitado pelo menor dos limites: R$ ${limite.toFixed(2)} (50% do ${limite1 < limite2 ? 'lucro líquido' : 'lucros acumulados'})`
      : `JCP dedutível integral: R$ ${jcpDedutivel.toFixed(2)}`,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DO TEMA 962 — IRPJ/CSLL SOBRE SELIC
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o crédito de IRPJ/CSLL sobre SELIC na repetição do indébito.
 * Tema 962 STF — RE 1.063.187.
 *
 * @param {number} valorSELICRecebida  - Total de SELIC recebida nas restituições
 * @param {boolean} tinhaPedido        - Se tinha ação/pedido antes de 30/09/2021
 * @param {string} dataPedido          - Data do pedido
 * @param {boolean} isFinanceira
 * @returns {object}
 */
export function calcularCreditoIRPJCSLLSELIC(
  valorSELICRecebida,
  tinhaPedido  = false,
  dataPedido   = null,
  isFinanceira = false
) {
  if (valorSELICRecebida <= 0) {
    return { valido: false, motivo: 'Valor de SELIC não informado', credito: 0 }
  }

  // Verifica modulação
  const corte  = new Date(DATA_CORTE_TEMA_962)
  const pedido = dataPedido ? new Date(dataPedido) : new Date()
  const modulacaoAplicada = !tinhaPedido && pedido >= corte

  // IRPJ sobre SELIC (que não deve ser cobrado)
  const irpjIndevido  = valorSELICRecebida * ALIQUOTAS_IRPJ_CSLL.irpj
  const csllIndevido  = valorSELICRecebida * (isFinanceira ? ALIQUOTAS_IRPJ_CSLL.csllFinanceira : ALIQUOTAS_IRPJ_CSLL.csll)
  const creditoTotal  = irpjIndevido + csllIndevido

  return {
    valido:              true,
    valorSELICRecebida,
    irpjIndevido,
    csllIndevido,
    creditoTotal,
    modulacaoAplicada,
    tinhaPedido,
    dataPedido,
    periodoRetroativo:   tinhaPedido ? '5 anos' : `A partir de ${DATA_CORTE_TEMA_962}`,
    baseLegal:           'RE 1.063.187 STF (Tema 962)',
    obs: modulacaoAplicada
      ? `Modulação aplicada — direito apenas a partir de ${DATA_CORTE_TEMA_962}`
      : 'Retroatividade de 5 anos — pedido anterior à modulação',
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE DIAGNÓSTICO
// ─────────────────────────────────────────────────────────────

/**
 * Gera o diagnóstico completo de IRPJ/CSLL.
 *
 * @param {object} params
 * @returns {object}
 */
export function gerarDiagnosticoIRPJCSLL({
  regime,
  receitaBruta,
  tipoAtividade,
  lucroLiquido,
  ajustesPositivos,
  ajustesNegativos,
  prejuizoFiscal,
  baseNegativaCSLL,
  patrimonioLiquido,
  tjlpAnual,
  lucrosAcumulados,
  valorSELICRecebida,
  meses            = 3,
  isFinanceira     = false,
}) {
  const elegibilidade = verificarElegibilidadeIRPJ(regime)

  let calculoBase = null
  if (elegibilidade.elegivel) {
    if (regime === 'Lucro Presumido') {
      calculoBase = calcularIRPJCSLLPresumido(receitaBruta, tipoAtividade, meses, isFinanceira)
    } else {
      calculoBase = calcularIRPJCSLLLucroReal({
        lucroLiquido, ajustesPositivos, ajustesNegativos,
        prejuizoFiscal, baseNegativaCSLL, meses, isFinanceira,
      })
    }
  }

  const jcp = patrimonioLiquido && tjlpAnual
    ? calcularJCP(patrimonioLiquido, tjlpAnual, lucroLiquido || 0, lucrosAcumulados || 0)
    : null

  const selic = valorSELICRecebida
    ? calcularCreditoIRPJCSLLSELIC(valorSELICRecebida, false, null, isFinanceira)
    : null

  const oportunidades = []
  if (jcp?.valido && jcp.economiaLiquida > 0) {
    oportunidades.push({
      tipo:        'JCP',
      descricao:   'Juros sobre Capital Próprio — dedução de IRPJ/CSLL',
      economia:    jcp.economiaLiquida,
      obs:         jcp.obs,
    })
  }
  if (selic?.valido && selic.creditoTotal > 0) {
    oportunidades.push({
      tipo:        'SELIC_TEMA_962',
      descricao:   'IRPJ/CSLL indevido sobre SELIC na repetição do indébito',
      credito:     selic.creditoTotal,
      obs:         selic.obs,
    })
  }
  if (calculoBase?.saldoPrejuizoRestante > 0) {
    oportunidades.push({
      tipo:        'PREJUIZO_FISCAL',
      descricao:   'Saldo de prejuízo fiscal para compensação futura',
      saldo:       calculoBase.saldoPrejuizoRestante,
      obs:         'Limite de compensação: 30% do lucro real por período',
    })
  }

  return {
    elegivel:          elegibilidade.elegivel,
    motivoInelegivel:  elegibilidade.motivo,
    regime,
    calculoBase,
    jcp,
    selic,
    oportunidades,
    totalOportunidades: oportunidades.length,
    situacoesEncontradas: [
      elegibilidade.elegivel
        ? `Regime ${regime} elegível para análise de IRPJ/CSLL`
        : `NÃO elegível — ${elegibilidade.motivo}`,
      jcp?.valido
        ? `JCP disponível: economia de R$ ${jcp.economiaLiquida?.toFixed(2)}`
        : 'JCP não calculado — dados de PL ou TJLP não informados',
      selic?.valido
        ? `Tema 962: crédito de R$ ${selic.creditoTotal?.toFixed(2)} de IRPJ/CSLL sobre SELIC`
        : 'Tema 962 não calculado — SELIC recebida não informada',
    ].filter(Boolean),
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SCORE E CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o grau de confiança da análise de IRPJ/CSLL.
 *
 * @param {object} diagnostico
 * @returns {{ grau: string, justificativa: string, pontos: number }}
 */
export function calcularGrauConfiancaIRPJCSLL(diagnostico) {
  let pontos = 100

  if (!diagnostico.elegivel) return { grau: 'BAIXO', justificativa: 'Regime inelegível', pontos: 0 }

  // Penaliza se não há cálculo base
  if (!diagnostico.calculoBase?.valido) pontos -= 30

  // Penaliza se nenhuma oportunidade identificada
  if (diagnostico.totalOportunidades === 0) pontos -= 20

  // Lucro Real tem mais dados disponíveis — maior confiança
  if (diagnostico.regime === 'Lucro Real' && diagnostico.calculoBase?.valido) pontos += 5

  pontos = Math.max(0, Math.min(100, pontos))
  const grau = pontos >= 80 ? 'ALTO' : pontos >= 60 ? 'MEDIO' : 'BAIXO'

  const justificativa =
    grau === 'ALTO'  ? 'Dados completos com cálculo base, JCP e Tema 962 analisados.' :
    grau === 'MEDIO' ? 'Análise parcial — alguns dados não disponíveis.' :
                       'Dados insuficientes para análise conclusiva de IRPJ/CSLL.'

  return { grau, justificativa, pontos }
}

/**
 * Calcula o score do Motor de IRPJ/CSLL.
 *
 * @param {object} diagnostico
 * @param {object} confianca
 * @returns {number}
 */
export function calcularScoreIRPJCSLL(diagnostico, confianca) {
  let score = 85

  if (!diagnostico.elegivel)          score = 0
  if (confianca.grau === 'MEDIO')     score -= 8
  if (confianca.grau === 'BAIXO')     score -= 25
  if (diagnostico.totalOportunidades === 0) score -= 20

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Metadados das regras de IRPJ/CSLL.
 */
export const META_REGRAS_IRPJ_CSLL = {
  versaoBase:   VERSAO_ATUAL.codigo,
  versaoRegras: '1.0',
  atualizadaEm: '2026-07-08',
  totalRegras:  8,
  observacao:   'Regras baseadas na Lei 9.249/1995, RIR/2018 (Decreto 9.580/2018), ' +
                'RE 1.063.187 STF (Tema 962) e SC COSIT 23/2022. ' +
                'TJLP deve ser atualizada conforme taxa divulgada pelo BNDES.',
}