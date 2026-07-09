/**
 * regras/divida_ativa.js — Base de Conhecimento Tributária — FiscalTrib
 * Regras de negócio do Motor de Dívida Ativa.
 *
 * Este motor analisa débitos inscritos em dívida ativa da União e
 * identifica oportunidades de regularização, extinção ou redução
 * da dívida tributária do contribuinte.
 *
 * Funcionalidades:
 * 1. Análise de CDA — Certidão de Dívida Ativa
 * 2. Cálculo de juros SELIC e multas
 * 3. Simulação de transação tributária (descontos por CAPAG)
 * 4. Identificação de prescrição e decadência
 * 5. Análise de parcelamentos disponíveis
 * 6. Cálculo do CAPAG — Capacidade de Pagamento
 *
 * Base legal:
 * — CTN Art. 173 e 174 (decadência e prescrição)
 * — Lei 6.830/1980 — LEF (execução fiscal)
 * — Lei 13.988/2020 — Transação Tributária
 * — Portaria PGFN 6.757/2022 — Transação por Adesão
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE REGRAS
// ─────────────────────────────────────────────────────────────

// Taxa SELIC mensal aproximada (atualizar conforme BACEN)
export const SELIC_MENSAL_REFERENCIA = 0.01083  // ~13% ao ano / 12

// Multa de mora padrão
export const MULTA_MORA = 0.20       // 20% sobre o principal

// Encargo legal (execução fiscal)
export const ENCARGO_LEGAL = 0.20    // 20% sobre o principal + multa

// Prazo prescricional (CTN art. 174)
export const PRAZO_PRESCRICIONAL_ANOS = 5

// Prazo decadencial (CTN art. 173)
export const PRAZO_DECADENCIAL_ANOS = 5

// Prazo prescrição intercorrente (LEF art. 40 + Tema 566 STJ)
export const PRAZO_SUSPENSAO_LEF    = 1   // 1 ano de suspensão
export const PRAZO_PRESCRICAO_INTER = 5   // 5 anos após suspensão

// Desconto máximo por CAPAG (Portaria PGFN 6.757/2022)
export const DESCONTOS_CAPAG = {
  A: { desconto: 0,    entrada: 0.05, parcelas: 60  },
  B: { desconto: 0.30, entrada: 0.05, parcelas: 84  },
  C: { desconto: 0.50, entrada: 0.05, parcelas: 120 },
  D: { desconto: 0.65, entrada: 0.05, parcelas: 145 },
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE ANÁLISE DE CDA
// ─────────────────────────────────────────────────────────────

/**
 * Valida os dados de uma CDA para análise.
 *
 * @param {object} cda - Dados da CDA
 * @returns {{ valida: boolean, motivo: string }}
 */
export function validarCDA(cda) {
  if (!cda)                return { valida: false, motivo: 'CDA não informada' }
  if (!cda.numeroCDA)      return { valida: false, motivo: 'Número da CDA não informado' }
  if (!cda.dataInscricao)  return { valida: false, motivo: 'Data de inscrição não informada' }
  if (!cda.valorPrincipal || cda.valorPrincipal <= 0) {
    return { valida: false, motivo: 'Valor principal não informado ou zero' }
  }
  if (!cda.tributo)        return { valida: false, motivo: 'Tributo não identificado' }
  return { valida: true, motivo: '' }
}

/**
 * Calcula o valor atualizado de uma CDA com juros SELIC e multas.
 *
 * @param {object} cda - { valorPrincipal, dataInscricao, multa, juros }
 * @param {Date}   dataBase - Data de referência para o cálculo
 * @returns {object}
 */
export function calcularValorAtualizado(cda, dataBase = new Date()) {
  const validacao = validarCDA(cda)
  if (!validacao.valida) {
    return { valido: false, motivo: validacao.motivo, valorTotal: 0 }
  }

  const inscricao = new Date(cda.dataInscricao)
  const meses     = calcularMesesEntre(inscricao, dataBase)

  const principal = cda.valorPrincipal
  const multa     = cda.multa || principal * MULTA_MORA
  const baseJuros = principal + multa

  // Juros SELIC acumulados
  const jurosAcumulados = baseJuros * (SELIC_MENSAL_REFERENCIA * meses)

  // Encargo legal (se em execução fiscal)
  const encargoLegal = cda.emExecucao ? (principal + multa + jurosAcumulados) * ENCARGO_LEGAL : 0

  const valorTotal = principal + multa + jurosAcumulados + encargoLegal

  return {
    valido:           true,
    numeroCDA:        cda.numeroCDA,
    tributo:          cda.tributo,
    dataInscricao:    cda.dataInscricao,
    dataBase:         dataBase.toISOString().slice(0, 10),
    mesesDecorridos:  meses,
    principal,
    multa,
    jurosAcumulados,
    encargoLegal,
    valorTotal,
    composicao: {
      percentualPrincipal: (principal / valorTotal * 100).toFixed(2) + '%',
      percentualMulta:     (multa     / valorTotal * 100).toFixed(2) + '%',
      percentualJuros:     (jurosAcumulados / valorTotal * 100).toFixed(2) + '%',
      percentualEncargo:   (encargoLegal    / valorTotal * 100).toFixed(2) + '%',
    },
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE PRESCRIÇÃO E DECADÊNCIA
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se uma CDA está prescrita.
 * CTN Art. 174: prazo de 5 anos da constituição definitiva.
 *
 * @param {object} cda        - Dados da CDA
 * @param {object} execucao   - { ajuizada, dataAjuizamento, dataCitacao, ultimaMovimentacao }
 * @param {Date}   dataBase
 * @returns {object}
 */
export function verificarPrescricao(cda, execucao = {}, dataBase = new Date()) {
  if (!cda?.dataInscricao) {
    return { prescrita: false, motivo: 'Data de inscrição não informada', analise: 'INCONCLUSIVA' }
  }

  const inscricao = new Date(cda.dataInscricao)
  const prazoLimit = new Date(inscricao)
  prazoLimit.setFullYear(prazoLimit.getFullYear() + PRAZO_PRESCRICIONAL_ANOS)

  // Se não foi ajuizada — verifica prescrição da pretensão
  if (!execucao.ajuizada) {
    const prescrita = dataBase > prazoLimit
    const diasRestantes = Math.floor((prazoLimit - dataBase) / (1000 * 60 * 60 * 24))

    return {
      prescrita,
      tipo:            'PRESCRICAO_PRETENSAO',
      dataLimite:      prazoLimit.toISOString().slice(0, 10),
      diasRestantes:   prescrita ? 0 : diasRestantes,
      mesesDecorridos: calcularMesesEntre(inscricao, dataBase),
      analise:         prescrita ? 'PRESCRITA' : diasRestantes <= 365 ? 'CRITICA' : 'REGULAR',
      baseLegal:       'CTN Art. 174',
      obs: prescrita
        ? `CDA prescrita em ${prazoLimit.toLocaleDateString('pt-BR')} — arguir prescrição imediatamente`
        : `Prazo prescricional vence em ${prazoLimit.toLocaleDateString('pt-BR')}`,
    }
  }

  // Se ajuizada — verifica prescrição intercorrente (Tema 566 STJ)
  if (execucao.ultimaMovimentacao) {
    const ultimaMovim = new Date(execucao.ultimaMovimentacao)
    const fimSuspensao = new Date(ultimaMovim)
    fimSuspensao.setFullYear(fimSuspensao.getFullYear() + PRAZO_SUSPENSAO_LEF)
    const prescricaoInter = new Date(fimSuspensao)
    prescricaoInter.setFullYear(prescricaoInter.getFullYear() + PRAZO_PRESCRICAO_INTER)

    const mesesParalisada = calcularMesesEntre(ultimaMovim, dataBase)
    const prescrita       = dataBase > prescricaoInter

    return {
      prescrita,
      tipo:              'PRESCRICAO_INTERCORRENTE',
      dataUltimaMovim:   execucao.ultimaMovimentacao,
      mesesParalisada,
      dataFimSuspensao:  fimSuspensao.toISOString().slice(0, 10),
      dataPrescricaoInter: prescricaoInter.toISOString().slice(0, 10),
      analise:           prescrita ? 'PRESCRITA' : mesesParalisada > 60 ? 'CRITICA' : 'REGULAR',
      baseLegal:         'LEF Art. 40 + Tema 566 STJ',
      obs: prescrita
        ? `Prescrição intercorrente consumada — execução paralisada há ${mesesParalisada} meses`
        : `Execução paralisada há ${mesesParalisada} meses — ${72 - mesesParalisada} meses restantes para prescrição intercorrente`,
    }
  }

  return {
    prescrita:  false,
    tipo:       'EXECUCAO_ATIVA',
    analise:    'REGULAR',
    obs:        'Execução fiscal ativa com movimentação recente',
  }
}

/**
 * Verifica se o lançamento tributário é decadente.
 * CTN Art. 150, §4º: 5 anos do fato gerador para lançamento por homologação.
 *
 * @param {string} dataFatoGerador - 'AAAA-MM-DD'
 * @param {string} dataLancamento  - 'AAAA-MM-DD' (data do auto de infração)
 * @returns {object}
 */
export function verificarDecadencia(dataFatoGerador, dataLancamento) {
  if (!dataFatoGerador || !dataLancamento) {
    return { decadente: false, motivo: 'Datas não informadas', analise: 'INCONCLUSIVA' }
  }

  const fatoGerador = new Date(dataFatoGerador)
  const lancamento  = new Date(dataLancamento)
  const prazoLimit  = new Date(fatoGerador)
  prazoLimit.setFullYear(prazoLimit.getFullYear() + PRAZO_DECADENCIAL_ANOS)

  const decadente     = lancamento > prazoLimit
  const mesesDecorridos = calcularMesesEntre(fatoGerador, lancamento)

  return {
    decadente,
    dataFatoGerador,
    dataLancamento,
    dataLimite:      prazoLimit.toISOString().slice(0, 10),
    mesesDecorridos,
    analise:         decadente ? 'DECADENTE' : 'REGULAR',
    baseLegal:       'CTN Art. 150, §4º e Súmula 555 STJ',
    obs: decadente
      ? `Lançamento decadente — realizado ${mesesDecorridos} meses após o fato gerador (limite: 60 meses)`
      : `Lançamento dentro do prazo — ${mesesDecorridos} meses após o fato gerador`,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CAPAG
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o CAPAG do contribuinte.
 * Metodologia simplificada baseada na Portaria PGFN 33/2018.
 *
 * @param {object} params
 * @returns {object}
 */
export function calcularCAP({
  totalDivida,
  patrimonioLiquido,
  receitaBruta12m,
  ativoCirculante,
  passivoCirculante,
}) {
  if (!totalDivida || !patrimonioLiquido || !receitaBruta12m) {
    return {
      valido:  false,
      motivo:  'Dados insuficientes para calcular CAPAG',
      capag:   null,
      classe:  null,
    }
  }

  // Indicador 1 — Endividamento (peso 40%)
  // Relação dívida / patrimônio líquido
  const indEndividamento = patrimonioLiquido > 0
    ? Math.min(100, Math.max(0, 100 - (totalDivida / patrimonioLiquido) * 100))
    : 0

  // Indicador 2 — Liquidez (peso 30%)
  // Relação ativo circulante / passivo circulante
  const indLiquidez = ativoCirculante && passivoCirculante && passivoCirculante > 0
    ? Math.min(100, (ativoCirculante / passivoCirculante) * 50)
    : 50  // neutro se não informado

  // Indicador 3 — Capacidade de pagamento pela receita (peso 30%)
  // Relação dívida / receita bruta anual
  const indReceita = receitaBruta12m > 0
    ? Math.min(100, Math.max(0, 100 - (totalDivida / receitaBruta12m) * 100))
    : 0

  // Score ponderado
  const score = (
    indEndividamento * 0.40 +
    indLiquidez      * 0.30 +
    indReceita       * 0.30
  )

  // Classificação A, B, C ou D
  const classe =
    score >= 80 ? 'A' :
    score >= 60 ? 'B' :
    score >= 40 ? 'C' : 'D'

  const condicoes = DESCONTOS_CAPAG[classe]

  return {
    valido:           true,
    score:            Math.round(score),
    classe,
    indicadores: {
      endividamento:  Math.round(indEndividamento),
      liquidez:       Math.round(indLiquidez),
      receita:        Math.round(indReceita),
    },
    condicoesTransacao: {
      desconto:       condicoes.desconto * 100 + '%',
      entradaMinima:  condicoes.entrada  * 100 + '%',
      parcelasMaximas: condicoes.parcelas,
    },
    descricao: {
      A: 'Alta capacidade de pagamento — sem desconto na transação',
      B: 'Média capacidade — desconto de até 30%',
      C: 'Baixa capacidade — desconto de até 50%',
      D: 'Mínima capacidade — desconto de até 65% (100% em editais especiais)',
    }[classe],
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SIMULAÇÃO DE TRANSAÇÃO
// ─────────────────────────────────────────────────────────────

/**
 * Simula as condições de transação tributária para uma dívida.
 *
 * @param {number} valorTotal   - Valor total consolidado da dívida
 * @param {string} classe       - CAPAG: 'A', 'B', 'C' ou 'D'
 * @param {number} parcelas     - Número de parcelas desejado
 * @returns {object}
 */
export function simularTransacao(valorTotal, classe = 'C', parcelas = 60) {
  if (valorTotal <= 0) {
    return { valido: false, motivo: 'Valor total não informado', economiaEstimada: 0 }
  }

  const condicoes = DESCONTOS_CAPAG[classe]
  if (!condicoes) {
    return { valido: false, motivo: `CAPAG "${classe}" inválido` }
  }

  const parcelasEfetivas   = Math.min(parcelas, condicoes.parcelas)
  const desconto           = condicoes.desconto
  const valorComDesconto   = valorTotal * (1 - desconto)
  const entradaMinima      = valorComDesconto * condicoes.entrada
  const saldoParcelar      = valorComDesconto - entradaMinima
  const valorParcela       = parcelasEfetivas > 0 ? saldoParcelar / parcelasEfetivas : 0
  const economiaEstimada   = valorTotal - valorComDesconto

  return {
    valido:           true,
    valorOriginal:    valorTotal,
    classe,
    desconto:         desconto * 100 + '%',
    valorComDesconto,
    entradaMinima,
    saldoParcelar,
    parcelas:         parcelasEfetivas,
    valorParcela,
    economiaEstimada,
    economiaPercentual: (desconto * 100).toFixed(0) + '%',
    obs: `Transação classe ${classe}: ${desconto * 100}% de desconto, entrada de ${condicoes.entrada * 100}%, até ${condicoes.parcelas} parcelas`,
  }
}

/**
 * Simula todos os cenários de transação (classes A, B, C e D).
 *
 * @param {number} valorTotal
 * @param {number} parcelas
 * @returns {Array}
 */
export function simularTodosOsCenariosTransacao(valorTotal, parcelas = 60) {
  return ['A', 'B', 'C', 'D'].map(classe => simularTransacao(valorTotal, classe, parcelas))
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE PARCELAMENTO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula as condições de parcelamento ordinário (sem desconto).
 *
 * @param {number} valorTotal
 * @param {number} parcelas - até 60
 * @param {number} selicMensal
 * @returns {object}
 */
export function calcularParcelamento(valorTotal, parcelas = 60, selicMensal = SELIC_MENSAL_REFERENCIA) {
  if (valorTotal <= 0 || parcelas <= 0) {
    return { valido: false, motivo: 'Valor ou parcelas inválidos' }
  }

  const parcelasEfetivas = Math.min(parcelas, 60)

  // Parcela com juros SELIC (Price simplificado)
  const taxaMensal    = selicMensal
  const fator         = taxaMensal > 0
    ? (taxaMensal * Math.pow(1 + taxaMensal, parcelasEfetivas)) /
      (Math.pow(1 + taxaMensal, parcelasEfetivas) - 1)
    : 1 / parcelasEfetivas

  const valorParcela   = valorTotal * fator
  const totalPago      = valorParcela * parcelasEfetivas
  const jurosTotal     = totalPago - valorTotal

  return {
    valido:          true,
    valorTotal,
    parcelas:        parcelasEfetivas,
    selicMensal:     (selicMensal * 100).toFixed(4) + '%',
    valorParcela,
    totalPago,
    jurosTotal,
    acrescimoPercentual: (jurosTotal / valorTotal * 100).toFixed(2) + '%',
    obs:             `Parcelamento ordinário — até 60 meses com SELIC`,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE DIAGNÓSTICO
// ─────────────────────────────────────────────────────────────

/**
 * Gera o diagnóstico completo de dívida ativa para um contribuinte.
 *
 * @param {object} params
 * @returns {object}
 */
export function gerarDiagnosticoDividaAtiva({
  cdas             = [],
  execucoes        = [],
  patrimonioLiquido = 0,
  receitaBruta12m   = 0,
  ativoCirculante   = 0,
  passivoCirculante = 0,
}) {
  if (cdas.length === 0) {
    return {
      temDivida:         false,
      obs:               'Nenhuma CDA informada',
      oportunidades:     [],
      totalOportunidades: 0,
    }
  }

  // Calcula valor atualizado de cada CDA
  const cdasAnalisadas = cdas.map(cda => {
    const atualizado  = calcularValorAtualizado(cda)
    const execucao    = execucoes.find(e => e.numeroCDA === cda.numeroCDA) || {}
    const prescricao  = verificarPrescricao(cda, execucao)
    const decadencia  = cda.dataFatoGerador
      ? verificarDecadencia(cda.dataFatoGerador, cda.dataLancamento)
      : null

    return {
      ...atualizado,
      prescricao,
      decadencia,
      execucao,
    }
  })

  // Totais
  const totalDivida         = cdasAnalisadas.reduce((s, c) => s + (c.valorTotal || 0), 0)
  const totalPrincipal      = cdasAnalisadas.reduce((s, c) => s + (c.principal   || 0), 0)
  const cdasPrescritas      = cdasAnalisadas.filter(c => c.prescricao?.prescrita)
  const cdasDecadentes      = cdasAnalisadas.filter(c => c.decadencia?.decadente)
  const cdasCriticas        = cdasAnalisadas.filter(c => c.prescricao?.analise === 'CRITICA')

  // CAPAG
  const capag = calcularCAP({
    totalDivida,
    patrimonioLiquido,
    receitaBruta12m,
    ativoCirculante,
    passivoCirculante,
  })

  // Simulação de transação com o CAPAG calculado
  const transacao = capag.valido
    ? simularTransacao(totalDivida, capag.classe)
    : null

  // Oportunidades identificadas
  const oportunidades = []

  if (cdasPrescritas.length > 0) {
    oportunidades.push({
      tipo:        'PRESCRICAO',
      descricao:   `${cdasPrescritas.length} CDA(s) prescrita(s) — arguir extinção imediatamente`,
      impacto:     cdasPrescritas.reduce((s, c) => s + (c.valorTotal || 0), 0),
      urgencia:    'ALTA',
      acao:        'Peticionar extinção da execução fiscal por prescrição',
    })
  }

  if (cdasDecadentes.length > 0) {
    oportunidades.push({
      tipo:        'DECADENCIA',
      descricao:   `${cdasDecadentes.length} CDA(s) com lançamento decadente — anular o crédito`,
      impacto:     cdasDecadentes.reduce((s, c) => s + (c.valorTotal || 0), 0),
      urgencia:    'ALTA',
      acao:        'Impugnar administrativamente ou ingressar com ação anulatória',
    })
  }

  if (cdasCriticas.length > 0) {
    oportunidades.push({
      tipo:        'PRESCRICAO_IMINENTE',
      descricao:   `${cdasCriticas.length} CDA(s) com prescrição iminente (menos de 12 meses)`,
      impacto:     cdasCriticas.reduce((s, c) => s + (c.valorTotal || 0), 0),
      urgencia:    'CRITICA',
      acao:        'Monitorar prazo e peticionar extinção assim que consumada',
    })
  }

  if (transacao?.valido && transacao.economiaEstimada > 0) {
    oportunidades.push({
      tipo:        'TRANSACAO',
      descricao:   `Transação tributária disponível — desconto de ${transacao.economiaPercentual}`,
      impacto:     transacao.economiaEstimada,
      urgencia:    'MEDIA',
      acao:        `Aderir à transação — economia estimada de R$ ${transacao.economiaEstimada.toFixed(2)}`,
    })
  }

  return {
    temDivida:          true,
    totalCDAs:          cdas.length,
    totalDivida,
    totalPrincipal,
    cdasAnalisadas,
    cdasPrescritas:     cdasPrescritas.length,
    cdasDecadentes:     cdasDecadentes.length,
    cdasCriticas:       cdasCriticas.length,
    capag,
    transacao,
    oportunidades,
    totalOportunidades: oportunidades.length,
    situacoesEncontradas: [
      `${cdas.length} CDA(s) analisada(s) — total: R$ ${totalDivida.toFixed(2)}`,
      cdasPrescritas.length > 0
        ? `⚠️ ${cdasPrescritas.length} CDA(s) PRESCRITA(S) — extinguir imediatamente`
        : 'Nenhuma CDA prescrita identificada',
      cdasDecadentes.length > 0
        ? `⚠️ ${cdasDecadentes.length} CDA(s) com lançamento DECADENTE`
        : 'Nenhuma CDA decadente identificada',
      capag.valido
        ? `CAPAG ${capag.classe} — desconto máximo de ${transacao?.desconto || '0%'}`
        : 'CAPAG não calculado — dados patrimoniais não informados',
    ].filter(Boolean),
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SCORE E CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o grau de confiança da análise de dívida ativa.
 *
 * @param {object} diagnostico
 * @returns {{ grau: string, justificativa: string, pontos: number }}
 */
export function calcularGrauConfiancaDividaAtiva(diagnostico) {
  let pontos = 100

  if (!diagnostico.temDivida) return { grau: 'ALTO', justificativa: 'Sem dívida ativa', pontos: 100 }

  // Penaliza se CAPAG não calculado
  if (!diagnostico.capag?.valido) pontos -= 20

  // Penaliza se CDAs sem data de fato gerador (não dá para verificar decadência)
  const semFatoGerador = diagnostico.cdasAnalisadas?.filter(c => !c.decadencia).length || 0
  if (semFatoGerador > 0) pontos -= 10

  // Penaliza se execuções sem data de última movimentação (não dá para calcular prescrição intercorrente)
  const semMovimentacao = diagnostico.cdasAnalisadas?.filter(
    c => c.execucao?.ajuizada && !c.execucao?.ultimaMovimentacao
  ).length || 0
  if (semMovimentacao > 0) pontos -= 15

  // Bônus se há oportunidades claras identificadas
  if (diagnostico.cdasPrescritas > 0 || diagnostico.cdasDecadentes > 0) pontos += 5

  pontos = Math.max(0, Math.min(100, pontos))
  const grau = pontos >= 80 ? 'ALTO' : pontos >= 60 ? 'MEDIO' : 'BAIXO'

  const justificativa =
    grau === 'ALTO'  ? 'Dados completos — prescrição, decadência e CAPAG analisados.' :
    grau === 'MEDIO' ? 'Análise parcial — alguns dados de execução ou patrimoniais não informados.' :
                       'Dados insuficientes para análise conclusiva de dívida ativa.'

  return { grau, justificativa, pontos }
}

/**
 * Calcula o score do Motor de Dívida Ativa.
 *
 * @param {object} diagnostico
 * @param {object} confianca
 * @returns {number}
 */
export function calcularScoreDividaAtiva(diagnostico, confianca) {
  if (!diagnostico.temDivida) return 100  // sem dívida = saúde máxima

  let score = 50  // score base — dívida ativa reduz o score

  // Eleva score se há oportunidades identificadas
  if (diagnostico.cdasPrescritas > 0)  score += 20
  if (diagnostico.cdasDecadentes > 0) score += 15
  if (diagnostico.transacao?.valido)   score += 10

  // Reduz score se dívida é alta em relação ao patrimônio
  if (diagnostico.capag?.classe === 'D') score -= 10
  if (diagnostico.capag?.classe === 'C') score -= 5

  if (confianca.grau === 'MEDIO') score -= 5
  if (confianca.grau === 'BAIXO') score -= 15

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Calcula meses entre duas datas.
 */
function calcularMesesEntre(inicio, fim) {
  return Math.max(0,
    (fim.getFullYear() - inicio.getFullYear()) * 12 +
    (fim.getMonth()    - inicio.getMonth())
  )
}

/**
 * Metadados das regras de dívida ativa.
 */
export const META_REGRAS_DIVIDA_ATIVA = {
  versaoBase:   VERSAO_ATUAL.codigo,
  versaoRegras: '1.0',
  atualizadaEm: '2026-07-08',
  totalRegras:  10,
  observacao:   'Regras baseadas no CTN Art. 173/174, Lei 6.830/1980 (LEF), ' +
                'Lei 13.988/2020, Portaria PGFN 6.757/2022 e Tema 566 STJ. ' +
                'SELIC mensal de referência deve ser atualizada conforme BACEN.',
}