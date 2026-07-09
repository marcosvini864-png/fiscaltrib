/**
 * calculos.js — Base de Conhecimento Tributária — FiscalTrib
 * Funções matemáticas e financeiras compartilhadas pelos motores.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'
import { arredondar, somarValores } from './moedas.js'

// ─────────────────────────────────────────────────────────────
// CÁLCULOS DE ALÍQUOTAS
// ─────────────────────────────────────────────────────────────

/**
 * Aplica uma alíquota sobre uma base de cálculo.
 *
 * @param {number} base     - Base de cálculo
 * @param {number} aliquota - Alíquota em decimal (ex: 0.065 = 6,5%)
 * @returns {number}
 */
export function aplicarAliquota(base, aliquota) {
  if (!base || !aliquota || isNaN(base) || isNaN(aliquota)) return 0
  return arredondar(base * aliquota)
}

/**
 * Calcula a alíquota efetiva dado um valor e uma base.
 *
 * @param {number} valor
 * @param {number} base
 * @returns {number} alíquota em decimal
 */
export function calcularAliquotaEfetiva(valor, base) {
  if (!base || base === 0) return 0
  return arredondar(valor / base)
}

/**
 * Calcula a base de cálculo a partir de um valor e alíquota.
 *
 * @param {number} valor
 * @param {number} aliquota - em decimal
 * @returns {number}
 */
export function calcularBase(valor, aliquota) {
  if (!aliquota || aliquota === 0) return 0
  return arredondar(valor / aliquota)
}

/**
 * Calcula PIS e COFINS sobre uma base.
 *
 * @param {number} base
 * @param {number} aliqPIS    - em decimal
 * @param {number} aliqCOFINS - em decimal
 * @returns {{ pis, cofins, total }}
 */
export function calcularPISCOFINS(base, aliqPIS, aliqCOFINS) {
  const pis    = aplicarAliquota(base, aliqPIS)
  const cofins = aplicarAliquota(base, aliqCOFINS)
  return {
    base,
    aliqPIS,
    aliqCOFINS,
    pis,
    cofins,
    total: arredondar(pis + cofins),
  }
}

/**
 * Calcula a diferença entre o tributo pago e o devido.
 * Valor positivo = pagou a mais (crédito).
 * Valor negativo = pagou a menos (débito).
 *
 * @param {number} pago
 * @param {number} devido
 * @returns {{ diferenca, tipo, credito, debito }}
 */
export function calcularDiferenca(pago, devido) {
  const diferenca = arredondar(pago - devido)
  return {
    pago,
    devido,
    diferenca,
    tipo:    diferenca > 0 ? 'CREDITO' : diferenca < 0 ? 'DEBITO' : 'ZERADO',
    credito: diferenca > 0 ? diferenca : 0,
    debito:  diferenca < 0 ? Math.abs(diferenca) : 0,
  }
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS DE CRÉDITO E RECUPERAÇÃO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o crédito médio mensal de um mapa por competência.
 *
 * @param {object} porCompetencia - { 'AAAA-MM': { credito: number } }
 * @returns {number}
 */
export function calcularMediaMensalCredito(porCompetencia) {
  if (!porCompetencia) return 0
  const valores = Object.values(porCompetencia)
  if (valores.length === 0) return 0
  const total = valores.reduce((s, v) => s + (v.credito || 0), 0)
  return arredondar(total / valores.length)
}

/**
 * Gera as projeções padrão do FiscalTrib: 12, 24, 36 e 60 meses.
 *
 * @param {number} mediaMensal
 * @returns {object}
 */
export function gerarProjecoesCredito(mediaMensal) {
  if (!mediaMensal || isNaN(mediaMensal) || mediaMensal <= 0) {
    return {
      mediaMensal: 0,
      p12: 0, p24: 0, p36: 0, p60: 0,
      periodos: [],
    }
  }
  return {
    mediaMensal: arredondar(mediaMensal),
    p12:  arredondar(mediaMensal * 12),
    p24:  arredondar(mediaMensal * 24),
    p36:  arredondar(mediaMensal * 36),
    p60:  arredondar(mediaMensal * 60),
    periodos: [
      { label: '12 meses', meses: 12, valor: arredondar(mediaMensal * 12) },
      { label: '24 meses', meses: 24, valor: arredondar(mediaMensal * 24) },
      { label: '36 meses', meses: 36, valor: arredondar(mediaMensal * 36) },
      { label: '60 meses', meses: 60, valor: arredondar(mediaMensal * 60), destaque: true },
    ],
  }
}

/**
 * Consolida créditos de múltiplas competências em um resumo.
 *
 * @param {object} porCompetencia
 * @returns {object}
 */
export function consolidarCreditos(porCompetencia) {
  if (!porCompetencia || Object.keys(porCompetencia).length === 0) {
    return {
      total:       0,
      media:       0,
      minimo:      0,
      maximo:      0,
      competencias: 0,
      projecoes:   gerarProjecoesCredito(0),
    }
  }

  const valores     = Object.values(porCompetencia).map(v => v.credito || 0)
  const total       = somarValores(valores)
  const media       = arredondar(total / valores.length)
  const minimo      = arredondar(Math.min(...valores))
  const maximo      = arredondar(Math.max(...valores))

  return {
    total,
    media,
    minimo,
    maximo,
    competencias:  valores.length,
    projecoes:     gerarProjecoesCredito(media),
  }
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS DE SCORE
// ─────────────────────────────────────────────────────────────

/**
 * Calcula um score ponderado a partir de componentes.
 *
 * @param {Array} componentes - [{ valor: number, peso: number }]
 * @returns {number} score de 0 a 100
 */
export function calcularScorePonderado(componentes) {
  if (!componentes || componentes.length === 0) return 0

  const totalPeso = componentes.reduce((s, c) => s + (c.peso || 0), 0)
  if (totalPeso === 0) return 0

  const scoreBruto = componentes.reduce((s, c) => {
    const valor = Math.min(100, Math.max(0, c.valor || 0))
    const peso  = c.peso || 0
    return s + (valor * peso)
  }, 0)

  return Math.round(Math.min(100, Math.max(0, scoreBruto / totalPeso)))
}

/**
 * Ajusta um score base com bônus e penalidades.
 *
 * @param {number} scoreBase
 * @param {Array}  ajustes - [{ tipo: 'BONUS'|'PENALIDADE', valor: number, motivo: string }]
 * @returns {{ score: number, ajustesAplicados: Array }}
 */
export function ajustarScore(scoreBase, ajustes = []) {
  let score = scoreBase
  const ajustesAplicados = []

  ajustes.forEach(ajuste => {
    const anterior = score
    if (ajuste.tipo === 'BONUS') {
      score = Math.min(100, score + (ajuste.valor || 0))
    } else if (ajuste.tipo === 'PENALIDADE') {
      score = Math.max(0,   score - (ajuste.valor || 0))
    }
    if (score !== anterior) {
      ajustesAplicados.push({
        ...ajuste,
        anterior,
        posterior: score,
        delta:     score - anterior,
      })
    }
  })

  return {
    scoreBase,
    score:            Math.round(score),
    ajustesAplicados,
    totalAjustes:     ajustesAplicados.length,
  }
}

/**
 * Classifica um score de 0 a 100.
 *
 * @param {number} score
 * @returns {{ label: string, cor: string, emoji: string }}
 */
export function classificarScore(score) {
  if (score >= 90) return { label: 'Excelente', cor: '#16a34a', emoji: '🟢' }
  if (score >= 70) return { label: 'Bom',       cor: '#2563eb', emoji: '🔵' }
  if (score >= 50) return { label: 'Regular',   cor: '#d97706', emoji: '🟡' }
  return              { label: 'Crítico',   cor: '#dc2626', emoji: '🔴' }
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS DE GRAU DE CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Converte pontos (0-100) em grau de confiança.
 *
 * @param {number} pontos
 * @returns {{ grau: string, label: string, emoji: string }}
 */
export function pontosParaGrauConfianca(pontos) {
  if (pontos >= 80) return { grau: 'ALTO',  label: 'Alto',  emoji: '🟢' }
  if (pontos >= 60) return { grau: 'MEDIO', label: 'Médio', emoji: '🟡' }
  return              { grau: 'BAIXO', label: 'Baixo', emoji: '🔴' }
}

/**
 * Calcula o grau de confiança consolidado de múltiplos fatores.
 *
 * @param {Array} fatores - [{ pontos: number, peso: number, descricao: string }]
 * @returns {object}
 */
export function calcularGrauConfiancaConsolidado(fatores) {
  if (!fatores || fatores.length === 0) {
    return { grau: 'BAIXO', pontos: 0, justificativa: 'Sem dados para análise' }
  }

  const totalPeso  = fatores.reduce((s, f) => s + (f.peso || 1), 0)
  const pontosBrutos = fatores.reduce((s, f) => s + ((f.pontos || 0) * (f.peso || 1)), 0)
  const pontos     = Math.round(pontosBrutos / totalPeso)

  const { grau, label, emoji } = pontosParaGrauConfianca(pontos)

  const fracos = fatores.filter(f => (f.pontos || 0) < 60).map(f => f.descricao)
  const fortes = fatores.filter(f => (f.pontos || 0) >= 80).map(f => f.descricao)

  return {
    grau,
    label,
    emoji,
    pontos,
    fatores,
    pontosFortes:  fortes,
    pontosFracos:  fracos,
    justificativa: grau === 'ALTO'
      ? `Análise de alta confiabilidade: ${fortes.slice(0, 2).join(', ')}`
      : grau === 'MEDIO'
      ? `Confiabilidade média. Atenção: ${fracos.slice(0, 2).join(', ')}`
      : `Baixa confiabilidade: ${fracos.slice(0, 3).join(', ')}`,
  }
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS ESTATÍSTICOS
// ─────────────────────────────────────────────────────────────

/**
 * Calcula média, mínimo, máximo e desvio padrão de um array.
 *
 * @param {number[]} valores
 * @returns {object}
 */
export function calcularEstatisticas(valores) {
  if (!valores || valores.length === 0) {
    return { media: 0, minimo: 0, maximo: 0, desvioPadrao: 0, total: 0, count: 0 }
  }

  const count  = valores.length
  const total  = somarValores(valores)
  const media  = arredondar(total / count)
  const minimo = arredondar(Math.min(...valores))
  const maximo = arredondar(Math.max(...valores))

  // Desvio padrão
  const variancia = valores.reduce((s, v) => s + Math.pow(v - media, 2), 0) / count
  const desvioPadrao = arredondar(Math.sqrt(variancia))

  return { media, minimo, maximo, desvioPadrao, total, count }
}

/**
 * Calcula a tendência de uma série temporal de valores.
 *
 * @param {number[]} valores - Ordenados do mais antigo para o mais recente
 * @returns {{ tendencia: string, variacao: number, percentual: number }}
 */
export function calcularTendencia(valores) {
  if (!valores || valores.length < 2) {
    return { tendencia: 'INDEFINIDA', variacao: 0, percentual: 0 }
  }

  const primeiro = valores[0]
  const ultimo   = valores[valores.length - 1]
  const variacao = arredondar(ultimo - primeiro)
  const percentual = primeiro > 0 ? arredondar((variacao / primeiro) * 100) : 0

  const tendencia =
    percentual > 5  ? 'ALTA_FORTE'  :
    percentual > 0  ? 'ALTA_FRACA'  :
    percentual < -5 ? 'BAIXA_FORTE' :
    percentual < 0  ? 'BAIXA_FRACA' : 'ESTAVEL'

  return { tendencia, variacao, percentual }
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS DE SELIC
// ─────────────────────────────────────────────────────────────

/**
 * Calcula SELIC acumulada em um período.
 * Usa taxa mensal de referência quando não há tabela histórica.
 *
 * @param {number} principal
 * @param {number} meses
 * @param {number} taxaMensal - padrão ~1% ao mês
 * @returns {object}
 */
export function calcularSELICAcumulada(principal, meses, taxaMensal = 0.01083) {
  if (!principal || principal <= 0 || meses <= 0) {
    return { principal, juros: 0, total: 0, fator: 1 }
  }

  const fator  = Math.pow(1 + taxaMensal, meses)
  const total  = arredondar(principal * fator)
  const juros  = arredondar(total - principal)

  return {
    principal,
    taxaMensal,
    meses,
    fator:   arredondar(fator),
    juros,
    total,
    percentualJuros: arredondar(((fator - 1) * 100)),
  }
}

/**
 * Calcula o valor com SELIC para fins de PER/DCOMP.
 * A RFB aplica SELIC do mês seguinte ao pagamento até o mês anterior ao da compensação.
 *
 * @param {number} credito     - Valor do crédito original
 * @param {string} competencia - Competência do pagamento indevido 'AAAA-MM'
 * @param {Date}   dataBase    - Data da compensação
 * @param {number} taxaMensal
 * @returns {object}
 */
export function calcularCreditoComSELIC(credito, competencia, dataBase = new Date(), taxaMensal = 0.01083) {
  if (!credito || !competencia) return { credito, creditoComSELIC: credito, juros: 0 }

  const [ano, mes] = competencia.split('-').map(Number)
  // Mês seguinte ao pagamento
  const inicioSELIC = new Date(ano, mes, 1)  // mes já é 1-indexed, então mes = próximo mês
  // Mês anterior à compensação
  const fimSELIC = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1)

  const meses = Math.max(0,
    (fimSELIC.getFullYear() - inicioSELIC.getFullYear()) * 12 +
    (fimSELIC.getMonth()    - inicioSELIC.getMonth())
  )

  const calc = calcularSELICAcumulada(credito, meses, taxaMensal)

  return {
    credito,
    competencia,
    mesesSELIC:      meses,
    juros:           calc.juros,
    creditoComSELIC: calc.total,
    fatorSELIC:      calc.fator,
    obs:             `SELIC de ${meses} meses aplicada (mês seguinte ao pagamento até mês anterior à compensação)`,
  }
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS DE CARGA TRIBUTÁRIA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula a carga tributária total sobre a receita.
 *
 * @param {object} tributos - { icms, pis, cofins, iss, inss, irpj, csll, das }
 * @param {number} receita
 * @returns {object}
 */
export function calcularCargaTributaria(tributos, receita) {
  if (!receita || receita <= 0) {
    return { total: 0, percentual: 0, detalhamento: {} }
  }

  const detalhamento = {}
  let total = 0

  Object.entries(tributos).forEach(([tributo, valor]) => {
    const v = valor || 0
    total += v
    detalhamento[tributo] = {
      valor,
      percentual: arredondar((v / receita) * 100),
    }
  })

  return {
    total:      arredondar(total),
    percentual: arredondar((total / receita) * 100),
    receita,
    detalhamento,
  }
}

/**
 * Compara a carga tributária antes e depois de uma oportunidade.
 *
 * @param {number} cargaAntes
 * @param {number} cargaDepois
 * @param {number} receita
 * @returns {object}
 */
export function compararCargaTributaria(cargaAntes, cargaDepois, receita) {
  const economia       = arredondar(cargaAntes - cargaDepois)
  const percAntes      = receita > 0 ? arredondar((cargaAntes  / receita) * 100) : 0
  const percDepois     = receita > 0 ? arredondar((cargaDepois / receita) * 100) : 0
  const reducaoPerc    = arredondar(percAntes - percDepois)

  return {
    cargaAntes,
    cargaDepois,
    economia,
    percAntes,
    percDepois,
    reducaoPerc,
    reducaoAbsoluta:    economia,
    eficiencia:         cargaAntes > 0 ? arredondar((economia / cargaAntes) * 100) : 0,
  }
}

/**
 * Metadados deste utilitário.
 */
export const META_CALCULOS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  atualizadaEm: '2026-07-08',
  observacao:   'Funções de cálculo compartilhadas por todos os motores. ' +
                'Taxa SELIC de referência deve ser atualizada conforme BACEN.',
}