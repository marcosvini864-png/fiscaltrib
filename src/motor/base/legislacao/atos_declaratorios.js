/**
 * atos_declaratorios.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de Atos Declaratórios da Receita Federal do Brasil.
 *
 * Os Atos Declaratórios Interpretativos (ADI) e Atos Declaratórios
 * Executivos (ADE) são normas complementares emitidas pela RFB que:
 * — Interpretam oficialmente a legislação tributária
 * — Consolidam o entendimento da RFB sobre teses específicas
 * — Vinculam os auditores fiscais ao seu conteúdo
 * — Orientam o contribuinte sobre o posicionamento da Receita
 *
 * Tipos:
 * — ADI: Ato Declaratório Interpretativo — interpreta a lei
 * — ADE: Ato Declaratório Executivo — procedimentos operacionais
 * — ADRC: Ato Declaratório de Regime de Tributação Consolidado
 *
 * IMPORTANTE: ADIs têm força normativa e vinculam a RFB.
 * São fundamentais para avaliar o risco de uma tese tributária.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// TIPOS DE ATO DECLARATÓRIO
// ─────────────────────────────────────────────────────────────

export const TIPO_ATO = {
  ADI:  'ADI',   // Ato Declaratório Interpretativo
  ADE:  'ADE',   // Ato Declaratório Executivo
  ADRC: 'ADRC',  // Ato Declaratório de Regime Consolidado
}

// ─────────────────────────────────────────────────────────────
// POSICIONAMENTO DA RFB
// ─────────────────────────────────────────────────────────────

export const POSICIONAMENTO_RFB = {
  FAVORAVEL:    'FAVORAVEL',    // RFB reconhece o direito do contribuinte
  DESFAVORAVEL: 'DESFAVORAVEL', // RFB não reconhece — risco de autuação
  NEUTRO:       'NEUTRO',       // RFB esclarece sem tomar partido
  REVOGADO:     'REVOGADO',     // ato revogado — posição alterada
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE ATOS DECLARATÓRIOS
// ─────────────────────────────────────────────────────────────

export const ATOS_DECLARATORIOS = {

  // ── MONOFÁSICOS — PIS/COFINS ──────────────────────────────────────

  ADI_07_2002: {
    numero:          'ADI RFB 7/2002',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2002-10-22',
    ementa:          'Esclarece a aplicação do regime monofásico de PIS/COFINS para produtos farmacêuticos e de higiene pessoal.',
    vigente:         true,
    posicionamento:  POSICIONAMENTO_RFB.FAVORAVEL,
    motores:         ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Confirma que revendedores de produtos da Lei 10.147/2000 têm alíquota zero de PIS/COFINS.' },
      { artigo: 'Art. 2º', descricao: 'Define que o revendedor não pode apropriar créditos sobre esses produtos.' },
    ],
    aplicacaoFiscalTrib: 'Confirma oficialmente a alíquota zero para revendedores de monofásicos. Eleva o grau de confiança do Motor de Monofásicos.',
    impactoScore:    +15,
  },

  ADI_04_2007: {
    numero:          'ADI RFB 4/2007',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2007-03-19',
    ementa:          'Esclarece o tratamento tributário de PIS/COFINS aplicável às operações com produtos sujeitos à incidência monofásica nas vendas efetuadas por comerciantes atacadistas e varejistas.',
    vigente:         true,
    posicionamento:  POSICIONAMENTO_RFB.FAVORAVEL,
    motores:         ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Atacadistas e varejistas de produtos monofásicos têm alíquota zero de PIS/COFINS.' },
      { artigo: 'Art. 2º', descricao: 'Não há distinção entre atacadista e varejista — ambos têm alíquota zero.' },
    ],
    aplicacaoFiscalTrib: 'Confirma que tanto atacadistas quanto varejistas têm alíquota zero. Relevante para empresas que vendem tanto no atacado quanto no varejo.',
    impactoScore:    +10,
  },

  // ── EXCLUSÃO DO ICMS — TEMA 69 ────────────────────────────────────

  ADI_05_2018: {
    numero:          'ADI RFB 5/2018',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2018-07-13',
    ementa:          'Esclarece os efeitos da decisão do STF no RE 574.706 (Tema 69) sobre a exclusão do ICMS da base de cálculo do PIS/COFINS.',
    vigente:         true,
    posicionamento:  POSICIONAMENTO_RFB.DESFAVORAVEL,
    motores:         ['EXCLUSAO_ICMS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'RFB entende que apenas o ICMS efetivamente recolhido deve ser excluído — não o destacado na NF-e.' },
      { artigo: 'Art. 2º', descricao: 'Restringe a exclusão ao ICMS efetivamente pago ao estado.' },
    ],
    aplicacaoFiscalTrib: 'Posicionamento restritivo da RFB sobre o Tema 69. Motor de Exclusão ICMS registra este risco — contribuinte pode ser autuado se excluir o ICMS destacado.',
    impactoScore:    -10,
    obs: 'O STF decidiu em embargos que o ICMS a ser excluído é o destacado na NF-e — posicionamento contrário ao ADI. Verificar decisão dos embargos de declaração de 2021.',
    contradicao:     'STF (embargos 2021) decidiu pelo ICMS destacado — contrário ao ADI 5/2018.',
  },

  // ── SIMPLES NACIONAL — ICMS-ST ────────────────────────────────────

  ADI_09_2015: {
    numero:          'ADI RFB 9/2015',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2015-09-09',
    ementa:          'Esclarece o tratamento do ICMS retido por substituição tributária na base de cálculo do Simples Nacional.',
    vigente:         false,
    posicionamento:  POSICIONAMENTO_RFB.DESFAVORAVEL,
    substituidoPor:  'Resolução CGSN 140/2018',
    motores:         ['ICMS_ST'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'RFB entendia que o ICMS-ST integrava a receita bruta do Simples Nacional.' },
    ],
    aplicacaoFiscalTrib: 'Revogado — posição que prejudicava o contribuinte foi superada pelo STJ (REsp 1.624.297) e pela Resolução CGSN 140/2018.',
    impactoScore:    0,
    obs: 'Revogado — hoje o ICMS-ST não integra a base do Simples Nacional conforme STJ e CGSN.',
  },

  // ── CRÉDITOS PIS/COFINS — INSUMOS ────────────────────────────────

  ADI_04_2014: {
    numero:          'ADI RFB 4/2014',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2014-08-15',
    ementa:          'Esclarece o conceito de insumo para fins de apuração de créditos de PIS/COFINS no regime não cumulativo.',
    vigente:         false,
    posicionamento:  POSICIONAMENTO_RFB.DESFAVORAVEL,
    substituidoPor:  'REsp 1.221.170 STJ (Tema 779)',
    motores:         ['EXCLUSAO_ICMS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'RFB adotava conceito restritivo de insumo — apenas bens e serviços diretamente aplicados na produção.' },
    ],
    aplicacaoFiscalTrib: 'Revogado na prática pelo STJ (Tema 779) que adotou conceito amplo de insumo. Motor registra que a RFB pode questionar créditos amplos.',
    impactoScore:    -5,
    obs: 'O STJ (REsp 1.221.170 — Tema 779) superou este entendimento restritivo. Hoje prevalece o conceito de essencialidade e relevância.',
  },

  // ── FATOR R ───────────────────────────────────────────────────────

  ADI_25_2020: {
    numero:          'ADI RFB 25/2020',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2020-11-04',
    ementa:          'Esclarece o cálculo do Fator R para fins de enquadramento no Anexo III ou V do Simples Nacional.',
    vigente:         true,
    posicionamento:  POSICIONAMENTO_RFB.NEUTRO,
    motores:         ['FATOR_R'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Fator R = folha de salários dos últimos 12 meses / receita bruta dos últimos 12 meses.' },
      { artigo: 'Art. 2º', descricao: 'Fator R ≥ 28%: empresa enquadra no Anexo III (menor carga tributária).' },
      { artigo: 'Art. 3º', descricao: 'Fator R < 28%: empresa enquadra no Anexo V (maior carga tributária).' },
      { artigo: 'Art. 4º', descricao: 'Folha de salários inclui: salários, pró-labore, contribuição patronal INSS e FGTS.' },
    ],
    aplicacaoFiscalTrib: 'Define exatamente como calcular o Fator R. Motor de Fator R utiliza esta definição para calcular e recomendar migração de anexo.',
    impactoScore:    +5,
    formulaFatorR: {
      numerador:    'Folha de salários (últimos 12 meses)',
      denominador:  'Receita bruta (últimos 12 meses)',
      limiar:       0.28,
      resultado:    'Fator R ≥ 28% → Anexo III | Fator R < 28% → Anexo V',
    },
  },

  // ── DÍVIDA ATIVA — PRESCRIÇÃO INTERCORRENTE ───────────────────────

  ADI_02_2019: {
    numero:          'ADI RFB 2/2019',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2019-04-11',
    ementa:          'Esclarece a aplicação da prescrição intercorrente no processo de execução fiscal.',
    vigente:         true,
    posicionamento:  POSICIONAMENTO_RFB.NEUTRO,
    motores:         ['PRESCRICAO', 'DIVIDA_ATIVA'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Prescrição intercorrente ocorre após 5 anos de suspensão da execução fiscal por não localização de bens.' },
      { artigo: 'Art. 2º', descricao: 'Juiz deve intimar a Fazenda antes de declarar a prescrição intercorrente.' },
      { artigo: 'Art. 3º', descricao: 'Reconhecimento da prescrição intercorrente extingue a execução.' },
    ],
    aplicacaoFiscalTrib: 'Motor de Prescrição utiliza este ADI para identificar execuções onde a prescrição intercorrente pode ser arguida.',
    impactoScore:    +10,
  },

  // ── PER/DCOMP — COMPENSAÇÃO ───────────────────────────────────────

  ADE_07_2021: {
    numero:          'ADE COFINS 7/2021',
    tipo:            TIPO_ATO.ADE,
    orgao:           'RFB',
    data:            '2021-06-15',
    ementa:          'Estabelece procedimentos para transmissão de PER/DCOMP referente a créditos de PIS/COFINS no regime monofásico.',
    vigente:         true,
    posicionamento:  POSICIONAMENTO_RFB.NEUTRO,
    motores:         ['MONOFASICOS', 'EXCLUSAO_ICMS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Créditos de PIS/COFINS monofásicos devem ser informados com código específico no PER/DCOMP.' },
      { artigo: 'Art. 2º', descricao: 'Documentos necessários para instrução do pedido de restituição.' },
      { artigo: 'Art. 3º', descricao: 'Prazo de análise de 360 dias para créditos monofásicos.' },
    ],
    aplicacaoFiscalTrib: 'Procedimento operacional para recuperação de créditos monofásicos. Plano de ação do Motor de Monofásicos inclui os passos definidos neste ADE.',
    impactoScore:    0,
    codigoPERDCOMP: {
      monofasicos:    '70 — Ressarcimento de PIS/COFINS — Monofásico',
      exclusaoICMS:   '74 — Compensação de PIS/COFINS — Exclusão ICMS Base',
    },
  },

  // ── IRPJ/CSLL — JCP ──────────────────────────────────────────────

  ADI_02_2003: {
    numero:          'ADI RFB 2/2003',
    tipo:            TIPO_ATO.ADI,
    orgao:           'RFB',
    data:            '2003-03-14',
    ementa:          'Esclarece a apuração e dedutibilidade dos Juros sobre Capital Próprio (JCP) para fins de IRPJ e CSLL.',
    vigente:         true,
    posicionamento:  POSICIONAMENTO_RFB.NEUTRO,
    motores:         ['IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'JCP é calculado sobre o patrimônio líquido do exercício anterior pela TJLP.' },
      { artigo: 'Art. 2º', descricao: 'Limite de dedução: 50% do lucro líquido ou 50% dos lucros acumulados.' },
      { artigo: 'Art. 3º', descricao: 'JCP pago ao sócio sofre retenção de IRRF à alíquota de 15%.' },
    ],
    aplicacaoFiscalTrib: 'Define o cálculo do JCP. Motor de IRPJ/CSLL usa para calcular a dedução possível e o impacto no IRPJ e CSLL.',
    impactoScore:    +5,
    formulaJCP: {
      base:       'Patrimônio Líquido do exercício anterior',
      taxa:       'TJLP (Taxa de Juros de Longo Prazo)',
      limiteA:    '50% do lucro líquido do período',
      limiteB:    '50% dos lucros acumulados e reservas de lucros',
      irrf:       '15% sobre JCP pago ou creditado',
    },
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna um ato declaratório pelo seu identificador interno.
 * @param {string} id - ex: 'ADI_07_2002'
 * @returns {object|null}
 */
export function getAtoDeclaratorio(id) {
  return ATOS_DECLARATORIOS[id] || null
}

/**
 * Retorna um ato pelo seu número.
 * @param {string} numero - ex: 'ADI RFB 7/2002'
 * @returns {object|null}
 */
export function getAtoPorNumero(numero) {
  return Object.values(ATOS_DECLARATORIOS).find(a => a.numero === numero) || null
}

/**
 * Retorna todos os atos aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getAtosPorMotor(motor) {
  return Object.values(ATOS_DECLARATORIOS).filter(a => a.motores?.includes(motor))
}

/**
 * Retorna apenas atos com posicionamento favorável ao contribuinte.
 * @returns {Array}
 */
export function getAtosFavoraveis() {
  return Object.values(ATOS_DECLARATORIOS).filter(a =>
    a.posicionamento === POSICIONAMENTO_RFB.FAVORAVEL && a.vigente
  )
}

/**
 * Retorna apenas atos com posicionamento desfavorável ao contribuinte.
 * Útil para avaliar riscos de autuação.
 * @returns {Array}
 */
export function getAtosDesfavoraveis() {
  return Object.values(ATOS_DECLARATORIOS).filter(a =>
    a.posicionamento === POSICIONAMENTO_RFB.DESFAVORAVEL && a.vigente
  )
}

/**
 * Calcula o impacto líquido dos atos declaratórios no score de um motor.
 * @param {string} motor
 * @returns {number}
 */
export function calcularImpactoAtosNoScore(motor) {
  const atos = getAtosPorMotor(motor).filter(a => a.vigente)
  return atos.reduce((soma, a) => soma + (a.impactoScore || 0), 0)
}

/**
 * Retorna a fórmula do Fator R conforme ADI 25/2020.
 * @returns {object|null}
 */
export function getFormulaFatorR() {
  return ATOS_DECLARATORIOS.ADI_25_2020?.formulaFatorR || null
}

/**
 * Retorna a fórmula de JCP conforme ADI 2/2003.
 * @returns {object|null}
 */
export function getFormulaJCP() {
  return ATOS_DECLARATORIOS.ADI_02_2003?.formulaJCP || null
}

/**
 * Retorna os códigos de PER/DCOMP por tipo de crédito.
 * @returns {object|null}
 */
export function getCodigosPERDCOMP() {
  return ATOS_DECLARATORIOS.ADE_07_2021?.codigoPERDCOMP || null
}

/**
 * Metadados deste repositório.
 */
export const META_ATOS_DECLARATORIOS = {
  versaoBase:    VERSAO_ATUAL.codigo,
  totalAtos:     Object.keys(ATOS_DECLARATORIOS).length,
  atualizadaEm:  '2026-07-08',
  observacao:    'ADIs vinculam a RFB mas podem ser superados por decisões judiciais. ' +
                 'Sempre verificar se há jurisprudência do STF ou STJ contrária ao ADI. ' +
                 'ADIs revogados são mantidos para referência histórica e processos em curso.',
}