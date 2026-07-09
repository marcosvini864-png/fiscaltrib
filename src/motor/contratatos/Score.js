/**
 * Score.js — FiscalTrib
 * Contrato para representação de scores no Motor de Inteligência Tributária.
 *
 * O sistema de scores do FiscalTrib opera em três níveis:
 *   1. Score por Oportunidade  — confiabilidade de cada tese identificada
 *   2. Score por Motor         — qualidade geral da análise de cada motor
 *   3. Score Global            — saúde tributária consolidada da empresa (PET)
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

// ─────────────────────────────────────────────────────────────
// ENUMERAÇÕES
// ─────────────────────────────────────────────────────────────

export const NIVEL_SCORE = {
  OPORTUNIDADE: 'OPORTUNIDADE',  // score de uma tese específica
  MOTOR:        'MOTOR',         // score consolidado de um motor
  GLOBAL:       'GLOBAL',        // score global da empresa (PET)
}

export const CLASSIFICACAO = {
  EXCELENTE: { label: 'Excelente', min: 90, max: 100, cor: '#16a34a', emoji: '🟢' },
  BOM:       { label: 'Bom',       min: 70, max: 89,  cor: '#2563eb', emoji: '🔵' },
  REGULAR:   { label: 'Regular',   min: 50, max: 69,  cor: '#d97706', emoji: '🟡' },
  CRITICO:   { label: 'Crítico',   min: 0,  max: 49,  cor: '#dc2626', emoji: '🔴' },
}

export const DIMENSAO = {
  // Dimensões usadas no score de oportunidade
  QUALIDADE_DADOS:     'QUALIDADE_DADOS',      // completude e confiabilidade dos dados
  FORCA_JURIDICA:      'FORCA_JURIDICA',        // força da fundamentação legal
  VOLUME_EVIDENCIAS:   'VOLUME_EVIDENCIAS',     // quantidade de evidências encontradas
  VALOR_CREDITO:       'VALOR_CREDITO',         // relevância financeira da oportunidade
  RISCO_CONTESTACAO:   'RISCO_CONTESTACAO',     // risco de a oportunidade ser contestada

  // Dimensões usadas no score do motor
  COBERTURA_PERIODO:   'COBERTURA_PERIODO',     // cobertura do período analisado
  COMPLETUDE_DOCS:     'COMPLETUDE_DOCS',        // completude dos documentos importados
  CONSISTENCIA:        'CONSISTENCIA',           // consistência entre os dados analisados
  OPORTUNIDADES_FOUND: 'OPORTUNIDADES_FOUND',   // quantidade de oportunidades encontradas

  // Dimensões usadas no score global
  SAUDE_TRIBUTARIA:    'SAUDE_TRIBUTARIA',       // situação tributária geral
  EXPOSICAO_FISCAL:    'EXPOSICAO_FISCAL',       // exposição a autuações e multas
  POTENCIAL_RECUPERACAO: 'POTENCIAL_RECUPERACAO', // potencial total de recuperação
  CONFORMIDADE:        'CONFORMIDADE',            // nível de conformidade fiscal
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Cria um Score vazio.
 *
 * @param {string} nivel - Um dos valores de NIVEL_SCORE
 * @param {string} modulo - Motor ou módulo que gerou este score
 * @returns {object}
 */
export function criarScore(nivel, modulo) {
  return {

    // ─── Identificação ───────────────────────────────────────
    nivel,           // NIVEL_SCORE
    modulo,          // ex: 'MONOFASICOS', 'GLOBAL', 'PET'
    label:           '',   // nome legível do que está sendo avaliado

    // ─── Valor ───────────────────────────────────────────────
    valor:           0,    // 0 a 100
    classificacao:   '',   // label de CLASSIFICACAO
    cor:             '',   // cor hex da classificação
    emoji:           '',   // emoji da classificação

    // ─── Componentes do score ────────────────────────────────
    // Cada componente contribui com um peso para o score final.
    componentes: [
      // {
      //   dimensao:    DIMENSAO,
      //   peso:        number,    // 0 a 1 — deve somar 1 entre todos
      //   valorBruto:  number,    // 0 a 100 antes do peso
      //   contribuicao: number,   // valorBruto * peso
      //   justificativa: string,
      // }
    ],

    // ─── Interpretação ───────────────────────────────────────
    justificativa:   '',   // explicação do score em linguagem natural
    pontosFracos:    [],   // [string] — o que reduziu o score
    pontosFortes:    [],   // [string] — o que elevou o score
    recomendacoes:   [],   // [string] — sugestões para melhorar o score

    // ─── Histórico (para score global) ───────────────────────
    historico: [],         // [{ data, valor, classificacao }] — evolução ao longo do tempo

    // ─── Metadados ───────────────────────────────────────────
    calculadoEm:     null,  // new Date().toISOString()
    versao:          '1.0',
  }
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES DE CÁLCULO
// ─────────────────────────────────────────────────────────────

/**
 * Classifica um valor numérico (0–100) retornando label, cor e emoji.
 */
export function classificarValor(valor) {
  if (valor >= 90) return { ...CLASSIFICACAO.EXCELENTE }
  if (valor >= 70) return { ...CLASSIFICACAO.BOM }
  if (valor >= 50) return { ...CLASSIFICACAO.REGULAR }
  return { ...CLASSIFICACAO.CRITICO }
}

/**
 * Calcula o score final a partir dos componentes.
 * Aplica os pesos e soma as contribuições.
 *
 * @param {object} score - Score com componentes preenchidos
 * @returns {object} score com valor e classificação calculados
 */
export function calcularScore(score) {
  if (!score.componentes || score.componentes.length === 0) return score

  const total = score.componentes.reduce((soma, c) => {
    c.contribuicao = (c.valorBruto || 0) * (c.peso || 0)
    return soma + c.contribuicao
  }, 0)

  score.valor         = Math.round(Math.min(100, Math.max(0, total)))
  const cls           = classificarValor(score.valor)
  score.classificacao = cls.label
  score.cor           = cls.cor
  score.emoji         = cls.emoji
  score.calculadoEm   = new Date().toISOString()
  return score
}

/**
 * Calcula o score de uma oportunidade específica.
 * Baseado em: qualidade dos dados, força jurídica, evidências e valor.
 *
 * @param {object} params
 * @returns {object} Score preenchido
 */
export function scoreOportunidade({
  modulo,
  label,
  qualidadeDados   = 0,   // 0–100
  forcaJuridica    = 0,   // 0–100
  volumeEvidencias = 0,   // 0–100
  valorCredito     = 0,   // 0–100
  riscoContestacao = 0,   // 0–100 (quanto maior, pior — será invertido)
}) {
  const score = criarScore(NIVEL_SCORE.OPORTUNIDADE, modulo)
  score.label = label

  score.componentes = [
    { dimensao: DIMENSAO.QUALIDADE_DADOS,   peso: 0.25, valorBruto: qualidadeDados,           justificativa: 'Completude e confiabilidade dos dados analisados' },
    { dimensao: DIMENSAO.FORCA_JURIDICA,    peso: 0.30, valorBruto: forcaJuridica,             justificativa: 'Força da fundamentação legal e jurisprudencial' },
    { dimensao: DIMENSAO.VOLUME_EVIDENCIAS, peso: 0.20, valorBruto: volumeEvidencias,          justificativa: 'Quantidade e qualidade das evidências encontradas' },
    { dimensao: DIMENSAO.VALOR_CREDITO,     peso: 0.15, valorBruto: valorCredito,              justificativa: 'Relevância financeira da oportunidade' },
    { dimensao: DIMENSAO.RISCO_CONTESTACAO, peso: 0.10, valorBruto: 100 - riscoContestacao,   justificativa: 'Inverso do risco de contestação pela Receita' },
  ]

  return calcularScore(score)
}

/**
 * Calcula o score consolidado de um motor.
 * Baseado em: cobertura do período, completude dos docs, consistência e oportunidades.
 *
 * @param {object} params
 * @returns {object} Score preenchido
 */
export function scoreMotor({
  modulo,
  coberturaPeriodo    = 0,   // 0–100
  completudeDocs      = 0,   // 0–100
  consistencia        = 0,   // 0–100
  oportunidadesFound  = 0,   // 0–100
}) {
  const score = criarScore(NIVEL_SCORE.MOTOR, modulo)
  score.label = `Score do Motor — ${modulo}`

  score.componentes = [
    { dimensao: DIMENSAO.COBERTURA_PERIODO,   peso: 0.30, valorBruto: coberturaPeriodo,   justificativa: 'Cobertura temporal dos documentos analisados' },
    { dimensao: DIMENSAO.COMPLETUDE_DOCS,     peso: 0.30, valorBruto: completudeDocs,     justificativa: 'Completude dos documentos importados' },
    { dimensao: DIMENSAO.CONSISTENCIA,        peso: 0.25, valorBruto: consistencia,       justificativa: 'Consistência entre os dados analisados' },
    { dimensao: DIMENSAO.OPORTUNIDADES_FOUND, peso: 0.15, valorBruto: oportunidadesFound, justificativa: 'Relevância das oportunidades encontradas' },
  ]

  return calcularScore(score)
}

/**
 * Calcula o score global da empresa (usado pelo PET).
 * Consolida os scores de todos os motores executados.
 *
 * @param {Array} scoresMotores - Array de scores de cada motor
 * @returns {object} Score global preenchido
 */
export function scoreGlobal(scoresMotores = []) {
  const score = criarScore(NIVEL_SCORE.GLOBAL, 'PET')
  score.label = 'Score Global FiscalTrib'

  if (scoresMotores.length === 0) return score

  const media = scoresMotores.reduce((s, m) => s + (m.valor || 0), 0) / scoresMotores.length
  score.valor         = Math.round(media)
  const cls           = classificarValor(score.valor)
  score.classificacao = cls.label
  score.cor           = cls.cor
  score.emoji         = cls.emoji
  score.calculadoEm   = new Date().toISOString()

  score.componentes = scoresMotores.map(m => ({
    dimensao:     m.modulo,
    peso:         1 / scoresMotores.length,
    valorBruto:   m.valor,
    contribuicao: m.valor / scoresMotores.length,
    justificativa: `Score do motor ${m.modulo}: ${m.valor} (${m.classificacao})`,
  }))

  return score
}