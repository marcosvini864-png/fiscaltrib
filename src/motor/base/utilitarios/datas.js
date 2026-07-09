/**
 * datas.js — Base de Conhecimento Tributária — FiscalTrib
 * Utilitários de manipulação de datas e competências fiscais.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONVERSÕES E PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Converte uma string de competência 'AAAA-MM' para objeto Date.
 * Retorna o primeiro dia do mês.
 *
 * @param {string} competencia - 'AAAA-MM'
 * @returns {Date|null}
 */
export function competenciaParaData(competencia) {
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) return null
  return new Date(competencia + '-01T00:00:00')
}

/**
 * Converte uma Date para string de competência 'AAAA-MM'.
 *
 * @param {Date} data
 * @returns {string}
 */
export function dataParaCompetencia(data) {
  if (!data || !(data instanceof Date)) return ''
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

/**
 * Converte string de data 'AAAA-MM-DD' para Date.
 *
 * @param {string} dataStr
 * @returns {Date|null}
 */
export function stringParaData(dataStr) {
  if (!dataStr) return null
  const data = new Date(dataStr + 'T00:00:00')
  return isNaN(data.getTime()) ? null : data
}

/**
 * Extrai competência de uma data ISO (dhEmi do XML de NF-e).
 * Aceita formatos: '2024-03-15T10:30:00-03:00', '2024-03-15', '2024-03'
 *
 * @param {string} dataISO
 * @returns {string} 'AAAA-MM'
 */
export function extrairCompetencia(dataISO) {
  if (!dataISO) return ''
  return dataISO.slice(0, 7)
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS DE PERÍODO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o número de meses entre duas competências.
 *
 * @param {string} compInicio - 'AAAA-MM'
 * @param {string} compFim    - 'AAAA-MM'
 * @returns {number}
 */
export function mesesEntreCompetencias(compInicio, compFim) {
  if (!compInicio || !compFim) return 0
  const [anoI, mesI] = compInicio.split('-').map(Number)
  const [anoF, mesF] = compFim.split('-').map(Number)
  return Math.max(0, (anoF - anoI) * 12 + (mesF - mesI) + 1)
}

/**
 * Calcula o número de meses entre duas datas.
 *
 * @param {Date} inicio
 * @param {Date} fim
 * @returns {number}
 */
export function mesesEntreDataS(inicio, fim) {
  if (!inicio || !fim) return 0
  return Math.max(0,
    (fim.getFullYear() - inicio.getFullYear()) * 12 +
    (fim.getMonth()    - inicio.getMonth())
  )
}

/**
 * Gera um array de competências entre dois meses (inclusive).
 *
 * @param {string} compInicio - 'AAAA-MM'
 * @param {string} compFim    - 'AAAA-MM'
 * @returns {string[]}
 */
export function gerarListaCompetencias(compInicio, compFim) {
  if (!compInicio || !compFim) return []
  const resultado = []
  let atual = competenciaParaData(compInicio)
  const fim = competenciaParaData(compFim)
  if (!atual || !fim) return []

  while (atual <= fim) {
    resultado.push(dataParaCompetencia(atual))
    atual = new Date(atual.getFullYear(), atual.getMonth() + 1, 1)
  }
  return resultado
}

/**
 * Retorna as últimas N competências a partir de uma data base.
 *
 * @param {number} n        - Quantidade de meses
 * @param {Date}   dataBase - Data de referência (padrão: hoje)
 * @returns {string[]}
 */
export function ultimasNCompetencias(n = 12, dataBase = new Date()) {
  const resultado = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(dataBase.getFullYear(), dataBase.getMonth() - i, 1)
    resultado.push(dataParaCompetencia(d))
  }
  return resultado
}

/**
 * Retorna a competência do mês anterior.
 *
 * @param {string} competencia - 'AAAA-MM'
 * @returns {string}
 */
export function competenciaAnterior(competencia) {
  const data = competenciaParaData(competencia)
  if (!data) return ''
  return dataParaCompetencia(new Date(data.getFullYear(), data.getMonth() - 1, 1))
}

/**
 * Retorna a competência do mês seguinte.
 *
 * @param {string} competencia - 'AAAA-MM'
 * @returns {string}
 */
export function competenciaSeguinte(competencia) {
  const data = competenciaParaData(competencia)
  if (!data) return ''
  return dataParaCompetencia(new Date(data.getFullYear(), data.getMonth() + 1, 1))
}

// ─────────────────────────────────────────────────────────────
// PRAZOS PRESCRICIONAIS E DECADENCIAIS
// ─────────────────────────────────────────────────────────────

/**
 * Calcula a data limite prescricional de 5 anos.
 *
 * @param {string} dataInicio - 'AAAA-MM-DD' — data de início da contagem
 * @returns {{ dataLimite: string, diasRestantes: number, prescrito: boolean }}
 */
export function calcularPrazo5Anos(dataInicio) {
  if (!dataInicio) return { dataLimite: '', diasRestantes: 0, prescrito: true }

  const inicio = stringParaData(dataInicio)
  if (!inicio) return { dataLimite: '', diasRestantes: 0, prescrito: true }

  const limite = new Date(inicio)
  limite.setFullYear(limite.getFullYear() + 5)

  const hoje          = new Date()
  const diasRestantes = Math.floor((limite - hoje) / (1000 * 60 * 60 * 24))
  const prescrito     = hoje > limite

  return {
    dataLimite:      limite.toISOString().slice(0, 10),
    dataLimiteFormatada: limite.toLocaleDateString('pt-BR'),
    diasRestantes:   prescrito ? 0 : diasRestantes,
    mesesRestantes:  prescrito ? 0 : Math.floor(diasRestantes / 30),
    prescrito,
    status: prescrito         ? 'PRESCRITO' :
            diasRestantes <= 90  ? 'CRITICO' :
            diasRestantes <= 365 ? 'ATENCAO' : 'REGULAR',
  }
}

/**
 * Calcula a data 5 anos atrás a partir de uma data base.
 * Usado para determinar o período retroativo de recuperação.
 *
 * @param {Date} dataBase - Data de referência (padrão: hoje)
 * @returns {string} 'AAAA-MM-DD'
 */
export function dataInicio5Anos(dataBase = new Date()) {
  const inicio = new Date(dataBase)
  inicio.setFullYear(inicio.getFullYear() - 5)
  return inicio.toISOString().slice(0, 10)
}

/**
 * Retorna a competência de 5 anos atrás.
 *
 * @param {Date} dataBase
 * @returns {string} 'AAAA-MM'
 */
export function competenciaInicio5Anos(dataBase = new Date()) {
  const inicio = new Date(dataBase)
  inicio.setFullYear(inicio.getFullYear() - 5)
  return dataParaCompetencia(inicio)
}

// ─────────────────────────────────────────────────────────────
// FORMATAÇÃO DE DATAS
// ─────────────────────────────────────────────────────────────

/**
 * Formata uma data para o padrão brasileiro DD/MM/AAAA.
 *
 * @param {string|Date} data
 * @returns {string}
 */
export function formatarData(data) {
  if (!data) return '—'
  const d = data instanceof Date ? data : stringParaData(String(data).slice(0, 10))
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Formata uma competência 'AAAA-MM' para 'MM/AAAA'.
 *
 * @param {string} competencia
 * @returns {string}
 */
export function formatarCompetencia(competencia) {
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) return competencia || '—'
  const [ano, mes] = competencia.split('-')
  return `${mes}/${ano}`
}

/**
 * Formata um período de competências para exibição.
 *
 * @param {string} inicio - 'AAAA-MM'
 * @param {string} fim    - 'AAAA-MM'
 * @returns {string}
 */
export function formatarPeriodo(inicio, fim) {
  if (!inicio && !fim) return '—'
  if (!fim || inicio === fim) return formatarCompetencia(inicio)
  return `${formatarCompetencia(inicio)} a ${formatarCompetencia(fim)}`
}

/**
 * Retorna o nome do mês em português.
 *
 * @param {string} competencia - 'AAAA-MM'
 * @returns {string}
 */
export function nomeMes(competencia) {
  const data = competenciaParaData(competencia)
  if (!data) return ''
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÕES DE DATA
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se uma string é uma competência válida.
 *
 * @param {string} competencia
 * @returns {boolean}
 */
export function isCompetenciaValida(competencia) {
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) return false
  const [ano, mes] = competencia.split('-').map(Number)
  return ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12
}

/**
 * Verifica se uma competência está dentro de um período.
 *
 * @param {string} competencia
 * @param {string} inicio
 * @param {string} fim
 * @returns {boolean}
 */
export function competenciaEstaNoPeriodo(competencia, inicio, fim) {
  if (!competencia || !inicio || !fim) return false
  return competencia >= inicio && competencia <= fim
}

/**
 * Verifica se uma data está dentro dos últimos 5 anos.
 *
 * @param {string} competencia - 'AAAA-MM'
 * @returns {boolean}
 */
export function estaDentroDosPrazo5Anos(competencia) {
  const inicio = competenciaInicio5Anos()
  const atual  = dataParaCompetencia(new Date())
  return competencia >= inicio && competencia <= atual
}

/**
 * Metadados deste utilitário.
 */
export const META_DATAS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  atualizadaEm: '2026-07-08',
}