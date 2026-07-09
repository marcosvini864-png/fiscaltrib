/**
 * moedas.js — Base de Conhecimento Tributária — FiscalTrib
 * Utilitários de formatação e cálculo de valores monetários.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// FORMATAÇÃO
// ─────────────────────────────────────────────────────────────

/**
 * Formata um número como moeda brasileira (R$).
 *
 * @param {number} valor
 * @param {boolean} semSimbolo - Se true, retorna apenas o número formatado
 * @returns {string}
 */
export function formatarMoeda(valor, semSimbolo = false) {
  if (valor === null || valor === undefined || isNaN(valor)) return semSimbolo ? '0,00' : 'R$ 0,00'
  const formatado = Math.abs(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const sinal  = valor < 0 ? '-' : ''
  const prefixo = semSimbolo ? '' : 'R$ '
  return `${sinal}${prefixo}${formatado}`
}

/**
 * Formata um número como moeda compacta (K, M, B).
 * Útil para valores grandes em cards e resumos.
 *
 * @param {number} valor
 * @returns {string}
 */
export function formatarMoedaCompacta(valor) {
  if (!valor || isNaN(valor)) return 'R$ 0'
  const abs = Math.abs(valor)
  const sinal = valor < 0 ? '-' : ''

  if (abs >= 1_000_000_000) return `${sinal}R$ ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')}B`
  if (abs >= 1_000_000)     return `${sinal}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (abs >= 1_000)         return `${sinal}R$ ${(abs / 1_000).toFixed(1).replace('.', ',')}K`
  return formatarMoeda(valor)
}

/**
 * Formata um percentual.
 *
 * @param {number} valor        - Valor decimal (ex: 0.065 = 6,5%)
 * @param {number} casas        - Casas decimais
 * @param {boolean} jaEmPercent - Se true, o valor já está em % (ex: 6.5 = 6,5%)
 * @returns {string}
 */
export function formatarPercentual(valor, casas = 2, jaEmPercent = false) {
  if (valor === null || valor === undefined || isNaN(valor)) return '0,00%'
  const pct = jaEmPercent ? valor : valor * 100
  return pct.toFixed(casas).replace('.', ',') + '%'
}

/**
 * Formata um número com separadores de milhar.
 *
 * @param {number} valor
 * @param {number} casas
 * @returns {string}
 */
export function formatarNumero(valor, casas = 0) {
  if (valor === null || valor === undefined || isNaN(valor)) return '0'
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

// ─────────────────────────────────────────────────────────────
// PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Converte string de moeda brasileira para número.
 * Aceita: 'R$ 1.234,56', '1.234,56', '1234,56', '1234.56'
 *
 * @param {string} valor
 * @returns {number}
 */
export function parseMoeda(valor) {
  if (!valor) return 0
  if (typeof valor === 'number') return valor
  const str = String(valor)
    .replace(/R\$\s?/g, '')
    .replace(/\./g,  '')
    .replace(',',    '.')
    .trim()
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

/**
 * Converte string de percentual para decimal.
 * Aceita: '6,5%', '6.5%', '6,5', '0.065'
 *
 * @param {string} valor
 * @returns {number} decimal (ex: 0.065)
 */
export function parsePercentual(valor) {
  if (!valor) return 0
  if (typeof valor === 'number') return valor > 1 ? valor / 100 : valor
  const str = String(valor).replace('%', '').replace(',', '.').trim()
  const num = parseFloat(str)
  if (isNaN(num)) return 0
  return num > 1 ? num / 100 : num
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS MONETÁRIOS
// ─────────────────────────────────────────────────────────────

/**
 * Arredonda um valor para 2 casas decimais.
 * Evita problemas de floating point.
 *
 * @param {number} valor
 * @returns {number}
 */
export function arredondar(valor) {
  if (isNaN(valor)) return 0
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Soma um array de valores monetários com precisão.
 *
 * @param {number[]} valores
 * @returns {number}
 */
export function somarValores(valores) {
  if (!Array.isArray(valores)) return 0
  return arredondar(valores.reduce((s, v) => s + (parseFloat(v) || 0), 0))
}

/**
 * Calcula a variação percentual entre dois valores.
 *
 * @param {number} valorAnterior
 * @param {number} valorAtual
 * @returns {{ variacao: number, percentual: string, tendencia: string }}
 */
export function calcularVariacao(valorAnterior, valorAtual) {
  if (!valorAnterior || valorAnterior === 0) {
    return { variacao: 0, percentual: '—', tendencia: 'NEUTRO' }
  }
  const variacao   = valorAtual - valorAnterior
  const percentual = (variacao / Math.abs(valorAnterior)) * 100
  return {
    variacao,
    variaoFormatada:  formatarMoeda(variacao),
    percentual:       formatarPercentual(percentual, 2, true),
    tendencia:        variacao > 0 ? 'ALTA' : variacao < 0 ? 'BAIXA' : 'NEUTRO',
  }
}

/**
 * Calcula o percentual de um valor sobre um total.
 *
 * @param {number} parte
 * @param {number} total
 * @param {number} casas
 * @returns {number}
 */
export function calcularPercentualSobre(parte, total, casas = 2) {
  if (!total || total === 0) return 0
  return arredondar((parte / total) * 100)
}

/**
 * Calcula juros simples.
 *
 * @param {number} principal
 * @param {number} taxaMensal - Taxa mensal em decimal (ex: 0.01 = 1%)
 * @param {number} meses
 * @returns {{ juros: number, total: number }}
 */
export function calcularJurosSimples(principal, taxaMensal, meses) {
  const juros = arredondar(principal * taxaMensal * meses)
  return {
    principal,
    taxaMensal,
    meses,
    juros,
    total: arredondar(principal + juros),
  }
}

/**
 * Calcula juros compostos (SELIC acumulada).
 *
 * @param {number} principal
 * @param {number} taxaMensal - Taxa mensal em decimal
 * @param {number} meses
 * @returns {{ juros: number, total: number, fatorAcumulado: number }}
 */
export function calcularJurosCompostos(principal, taxaMensal, meses) {
  const fatorAcumulado = Math.pow(1 + taxaMensal, meses)
  const total          = arredondar(principal * fatorAcumulado)
  const juros          = arredondar(total - principal)
  return {
    principal,
    taxaMensal,
    meses,
    fatorAcumulado,
    juros,
    total,
  }
}

/**
 * Calcula o valor presente de um fluxo futuro.
 *
 * @param {number} valorFuturo
 * @param {number} taxaMensal
 * @param {number} meses
 * @returns {number}
 */
export function calcularValorPresente(valorFuturo, taxaMensal, meses) {
  if (taxaMensal <= 0) return valorFuturo
  return arredondar(valorFuturo / Math.pow(1 + taxaMensal, meses))
}

// ─────────────────────────────────────────────────────────────
// PROJEÇÕES TEMPORAIS
// ─────────────────────────────────────────────────────────────

/**
 * Gera projeções de crédito para múltiplos períodos.
 * Padrão do FiscalTrib: 12, 24, 36 e 60 meses.
 *
 * @param {number} mediaMensal - Valor médio mensal do crédito
 * @returns {object}
 */
export function gerarProjecoes(mediaMensal) {
  if (!mediaMensal || isNaN(mediaMensal)) {
    return { p12: 0, p24: 0, p36: 0, p60: 0 }
  }
  return {
    p12:  arredondar(mediaMensal * 12),
    p24:  arredondar(mediaMensal * 24),
    p36:  arredondar(mediaMensal * 36),
    p60:  arredondar(mediaMensal * 60),
    formatado: {
      p12:  formatarMoeda(mediaMensal * 12),
      p24:  formatarMoeda(mediaMensal * 24),
      p36:  formatarMoeda(mediaMensal * 36),
      p60:  formatarMoeda(mediaMensal * 60),
    },
  }
}

/**
 * Calcula a média mensal de um array de valores por competência.
 *
 * @param {object} porCompetencia - { 'AAAA-MM': { credito: number } }
 * @returns {number}
 */
export function calcularMediaMensal(porCompetencia) {
  if (!porCompetencia) return 0
  const valores = Object.values(porCompetencia)
  if (valores.length === 0) return 0
  const total = valores.reduce((s, v) => s + (v.credito || v.valor || 0), 0)
  return arredondar(total / valores.length)
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÕES MONETÁRIAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um valor é um número monetário válido.
 *
 * @param {any} valor
 * @returns {boolean}
 */
export function isValorValido(valor) {
  const num = typeof valor === 'string' ? parseMoeda(valor) : valor
  return typeof num === 'number' && !isNaN(num) && isFinite(num)
}

/**
 * Retorna zero se o valor for inválido.
 *
 * @param {any} valor
 * @returns {number}
 */
export function valorOuZero(valor) {
  const num = typeof valor === 'string' ? parseMoeda(valor) : parseFloat(valor)
  return isNaN(num) ? 0 : num
}

/**
 * Classifica um valor monetário por faixa.
 *
 * @param {number} valor
 * @returns {string}
 */
export function classificarValorPorFaixa(valor) {
  if (valor <= 0)           return 'ZERO'
  if (valor < 1000)         return 'PEQUENO'
  if (valor < 10000)        return 'MEDIO'
  if (valor < 100000)       return 'GRANDE'
  if (valor < 1000000)      return 'MUITO_GRANDE'
  return 'EXPRESSIVO'
}

/**
 * Metadados deste utilitário.
 */
export const META_MOEDAS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  atualizadaEm: '2026-07-08',
  moeda:        'BRL',
  locale:       'pt-BR',
}