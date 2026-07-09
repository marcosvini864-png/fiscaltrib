/**
 * stj.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de decisões do Superior Tribunal de Justiça.
 *
 * O STJ é responsável pela uniformização da interpretação da
 * legislação federal infraconstitucional. Suas decisões em
 * recursos repetitivos vinculam todos os tribunais inferiores.
 *
 * Tipos de decisão relevantes:
 * — REsp Repetitivo: vincula todos os tribunais inferiores
 * — Súmula: orientação consolidada do tribunal
 * — EREsp: embargos de divergência — uniformização interna
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// TIPOS DE DECISÃO STJ
// ─────────────────────────────────────────────────────────────

export const TIPO_DECISAO_STJ = {
  RESP_REPETITIVO: 'RESP_REPETITIVO',  // recurso repetitivo — vinculante
  RESP:            'RESP',             // recurso especial
  SUMULA:          'SUMULA',           // súmula do STJ
  ERESP:           'ERESP',            // embargos de divergência
  AGRG:            'AGRG',             // agravo regimental
}

// ─────────────────────────────────────────────────────────────
// STATUS DA DECISÃO
// ─────────────────────────────────────────────────────────────

export const STATUS_DECISAO_STJ = {
  TRANSITADO_EM_JULGADO: 'TRANSITADO_EM_JULGADO',
  PENDENTE:              'PENDENTE',
  SUSPENSO:              'SUSPENSO',
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE DECISÕES DO STJ
// ─────────────────────────────────────────────────────────────

export const DECISOES_STJ = {

  // ── ICMS-ST — SIMPLES NACIONAL ────────────────────────────────────

  RESP_1624297: {
    processo:        'REsp 1.624.297/RS',
    tema:            'Recurso Repetitivo — ICMS-ST Simples Nacional',
    tipo:            TIPO_DECISAO_STJ.RESP_REPETITIVO,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2020-02-20',
    dataTransito:    '2020-05-15',
    relator:         'Min. Gurgel de Faria',
    vinculante:      true,
    motores:         ['ICMS_ST'],
    tese:            'O ICMS retido por substituição tributária não integra a receita bruta das empresas optantes pelo Simples Nacional para fins de apuração da base de cálculo desse regime.',
    fundamentacao:   'O ICMS-ST não representa receita própria do contribuinte substituído — é um valor cobrado por conta do Estado e repassado adiante. Logo não pode compor a base de cálculo do Simples Nacional.',
    periodoRetroativo: '5 anos contados do pedido administrativo ou ação judicial',
    aplicacaoFiscalTrib: 'Decisão central do Motor de ICMS-ST para Simples Nacional. Define o direito à exclusão do ICMS-ST da base do DAS com direito a 5 anos retroativos.',
    grauConfianca:   'ALTO',
    impactoScore:    +25,
    palavrasChave:   ['ICMS-ST', 'Simples Nacional', 'substituição tributária', 'base de cálculo', 'DAS'],
  },

  // ── MONOFÁSICOS — PIS/COFINS ──────────────────────────────────────

  RESP_1109034: {
    processo:        'REsp 1.109.034/SP',
    tema:            'Monofasia PIS/COFINS — Revendedor',
    tipo:            TIPO_DECISAO_STJ.RESP,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2009-09-22',
    dataTransito:    '2009-11-10',
    relator:         'Min. Luiz Fux',
    vinculante:      false,
    motores:         ['MONOFASICOS'],
    tese:            'O revendedor de produtos sujeitos ao regime monofásico de PIS/COFINS não pode ser onerado com alíquotas cheias — a tributação concentrada no fabricante implica alíquota zero para o revendedor.',
    fundamentacao:   'O regime monofásico concentra a tributação no fabricante ou importador. O revendedor, ao aplicar alíquotas cheias, realiza dupla tributação vedada pela legislação.',
    periodoRetroativo: '5 anos contados do pedido',
    aplicacaoFiscalTrib: 'Sustenta o direito à restituição do PIS/COFINS recolhido indevidamente pelo revendedor. Motor de Monofásicos cita como reforço à tese principal.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['monofásico', 'PIS', 'COFINS', 'revendedor', 'alíquota zero', 'dupla tributação'],
  },

  // ── CRÉDITOS PIS/COFINS — CONCEITO DE INSUMO ─────────────────────

  RESP_1221170: {
    processo:        'REsp 1.221.170/PR',
    tema:            'Tema 779 — Conceito de Insumo PIS/COFINS',
    tipo:            TIPO_DECISAO_STJ.RESP_REPETITIVO,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2018-02-22',
    dataTransito:    '2018-05-10',
    relator:         'Min. Napoleão Nunes Maia Filho',
    vinculante:      true,
    motores:         ['EXCLUSAO_ICMS'],
    tese:            'O conceito de insumo para fins de creditamento de PIS/COFINS deve ser definido pelo critério da essencialidade ou relevância do bem ou serviço para a atividade econômica desempenhada pelo contribuinte.',
    fundamentacao:   'O STJ rejeitou o conceito restritivo adotado pela RFB (apenas matérias-primas e embalagens) e o conceito ampliado (tudo que gera receita). Adotou critério intermediário: essencialidade ou relevância para a atividade.',
    criterios: [
      'Essencialidade: o item é indispensável à consecução da atividade-fim',
      'Relevância: o item participa importantemente do processo produtivo',
      'Análise caso a caso — não há lista taxativa',
    ],
    periodoRetroativo: '5 anos contados do pedido',
    aplicacaoFiscalTrib: 'Define conceito de insumo para créditos de PIS/COFINS no Lucro Real. Motor de Exclusão ICMS orienta empresas sobre quais itens geram crédito.',
    grauConfianca:   'ALTO',
    impactoScore:    +20,
    palavrasChave:   ['insumo', 'PIS', 'COFINS', 'crédito', 'essencialidade', 'relevância', 'Tema 779'],
  },

  // ── PRESCRIÇÃO INTERCORRENTE ──────────────────────────────────────

  RESP_1340553: {
    processo:        'REsp 1.340.553/RS',
    tema:            'Tema 566 — Prescrição Intercorrente na Execução Fiscal',
    tipo:            TIPO_DECISAO_STJ.RESP_REPETITIVO,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2018-02-12',
    dataTransito:    '2018-05-01',
    relator:         'Min. Mauro Campbell Marques',
    vinculante:      true,
    motores:         ['PRESCRICAO', 'DIVIDA_ATIVA'],
    tese:            'O prazo de 1 ano de suspensão previsto no art. 40 da LEF começa automaticamente na data da ciência da Fazenda sobre a não localização do devedor ou dos bens. Após este prazo, inicia-se automaticamente o prazo prescricional intercorrente de 5 anos.',
    fundamentacao:   'A prescrição intercorrente ocorre quando a execução fiscal fica paralisada por inércia da Fazenda. O STJ uniformizou que o prazo começa a correr automaticamente, sem necessidade de decisão judicial.',
    prazos: {
      suspensao:             '1 ano após não localização do devedor ou bens',
      prescricaoIntercorrente: '5 anos após o fim da suspensão',
      total:                 '6 anos de paralisação para ocorrer a prescrição intercorrente',
    },
    aplicacaoFiscalTrib: 'Motor de Prescrição calcula se há prescrição intercorrente na execução fiscal. Execuções paralisadas há mais de 6 anos podem ter a prescrição arguida.',
    grauConfianca:   'ALTO',
    impactoScore:    +20,
    palavrasChave:   ['prescrição intercorrente', 'execução fiscal', 'dívida ativa', 'Tema 566', 'art. 40 LEF'],
  },

  // ── DECADÊNCIA — LANÇAMENTO POR HOMOLOGAÇÃO ───────────────────────

  RESP_973733: {
    processo:        'REsp 973.733/SC',
    tema:            'Tema 163 — Decadência no Lançamento por Homologação',
    tipo:            TIPO_DECISAO_STJ.RESP_REPETITIVO,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2009-12-12',
    dataTransito:    '2010-02-20',
    relator:         'Min. Luiz Fux',
    vinculante:      true,
    motores:         ['DECADENCIA', 'DIVIDA_ATIVA'],
    tese:            'Para os tributos sujeitos a lançamento por homologação, o prazo decadencial é de 5 anos contados da ocorrência do fato gerador (art. 150, §4º do CTN), salvo nos casos de dolo, fraude ou simulação.',
    fundamentacao:   'O STJ uniformizou o prazo decadencial de 5 anos a partir do fato gerador para tributos declarados pelo contribuinte. A Fazenda tem 5 anos para revisar o lançamento após o pagamento ou declaração.',
    prazos: {
      regra:      '5 anos a partir do fato gerador (art. 150, §4º CTN)',
      excecao:    '5 anos a partir do primeiro dia do exercício seguinte (art. 173, I CTN) em caso de dolo, fraude ou simulação',
    },
    aplicacaoFiscalTrib: 'Motor de Decadência usa para verificar se autuações da RFB foram realizadas dentro do prazo. Autuações após 5 anos do fato gerador são decadentes.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['decadência', 'lançamento por homologação', 'prazo', 'fato gerador', 'Tema 163'],
  },

  // ── FATOR R — PRÓ-LABORE ─────────────────────────────────────────

  RESP_1900016: {
    processo:        'REsp 1.900.016/SP',
    tema:            'Fator R — Inclusão do Pró-labore',
    tipo:            TIPO_DECISAO_STJ.RESP,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2021-08-10',
    dataTransito:    '2021-10-15',
    relator:         'Min. Gurgel de Faria',
    vinculante:      false,
    motores:         ['FATOR_R'],
    tese:            'O pró-labore pago aos sócios administradores compõe a folha de salários para fins de cálculo do Fator R do Simples Nacional, desde que seja valor compatível com o serviço efetivamente prestado.',
    fundamentacao:   'O Fator R visa medir a relação entre a folha de pagamento (incluindo pró-labore) e a receita bruta. O pró-labore é remuneração pelo trabalho do sócio e integra legitimamente o numerador do Fator R.',
    alertaRisco:     'Pró-labore artificial ou desproporcional ao serviço prestado é considerado planejamento abusivo e pode ser desconsiderado pela RFB.',
    aplicacaoFiscalTrib: 'Confirma inclusão do pró-labore no Fator R. Motor de Fator R usa para calcular e orienta sobre os limites do planejamento.',
    grauConfianca:   'MEDIO',
    impactoScore:    +10,
    palavrasChave:   ['Fator R', 'pró-labore', 'Simples Nacional', 'folha de salários', 'Anexo III'],
  },

  // ── INSS — TERÇO DE FÉRIAS ────────────────────────────────────────

  RESP_1798665: {
    processo:        'REsp 1.798.665/SC',
    tema:            'Tema 985 — INSS sobre Terço Constitucional de Férias',
    tipo:            TIPO_DECISAO_STJ.RESP_REPETITIVO,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2019-12-11',
    dataTransito:    '2020-03-01',
    relator:         'Min. Assusete Magalhães',
    vinculante:      true,
    motores:         ['INSS'],
    tese:            'Não incide contribuição previdenciária patronal sobre o terço constitucional de férias, por ter natureza indenizatória.',
    fundamentacao:   'O terço constitucional de férias tem natureza indenizatória — compensa o trabalhador pelo descanso. Não representa acréscimo patrimonial decorrente do trabalho e não integra o salário de contribuição.',
    periodoRetroativo: '5 anos contados do pedido, observada a modulação do STF no RE 1.072.485',
    aplicacaoFiscalTrib: 'Confirma não incidência do INSS patronal sobre terço de férias. Motor de INSS identifica e calcula o crédito recuperável.',
    grauConfianca:   'ALTO',
    impactoScore:    +20,
    palavrasChave:   ['INSS', 'terço de férias', 'férias', 'indenizatório', 'salário de contribuição', 'Tema 985'],
  },

  // ── INSS — SALÁRIO-MATERNIDADE ────────────────────────────────────

  RESP_1322945: {
    processo:        'REsp 1.322.945/DF',
    tema:            'Tema 598 — INSS sobre Salário-Maternidade',
    tipo:            TIPO_DECISAO_STJ.RESP_REPETITIVO,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2012-06-27',
    dataTransito:    '2012-09-15',
    relator:         'Min. Napoleão Nunes Maia Filho',
    vinculante:      true,
    motores:         ['INSS'],
    tese:            'Incide contribuição previdenciária patronal sobre o salário-maternidade, pois tem natureza salarial.',
    fundamentacao:   'Diferentemente do aviso prévio indenizado e do terço de férias, o salário-maternidade tem natureza salarial — é remuneração pelo período de afastamento. Logo incide INSS patronal.',
    aplicacaoFiscalTrib: 'Atenção: decisão desfavorável ao contribuinte. Motor de INSS alerta que não há crédito a recuperar sobre salário-maternidade — incidência legítima do INSS.',
    grauConfianca:   'ALTO',
    impactoScore:    -5,
    palavrasChave:   ['INSS', 'salário-maternidade', 'contribuição previdenciária', 'natureza salarial', 'Tema 598'],
    obs:             'Desfavorável — salário-maternidade sofre INSS patronal legitimamente.',
  },

  // ── DÍVIDA ATIVA — REDIRECIONAMENTO PARA SÓCIOS ──────────────────

  RESP_1645333: {
    processo:        'REsp 1.645.333/SP',
    tema:            'Tema 981 — Redirecionamento da Execução Fiscal para Sócios',
    tipo:            TIPO_DECISAO_STJ.RESP_REPETITIVO,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2021-04-14',
    dataTransito:    '2021-07-01',
    relator:         'Min. Assusete Magalhães',
    vinculante:      true,
    motores:         ['DIVIDA_ATIVA'],
    tese:            'O redirecionamento da execução fiscal para o sócio-gerente exige prova de dissolução irregular da sociedade ou de ato de gestão com excesso de poderes, dolo ou violação da lei.',
    fundamentacao:   'A simples condição de sócio não é suficiente para o redirecionamento. É necessário demonstrar que o sócio praticou atos ilícitos ou que a empresa foi dissolvida irregularmente.',
    requisitosRedirecionamento: [
      'Dissolução irregular da sociedade (não localização no endereço fiscal)',
      'Ato do sócio com excesso de poderes',
      'Infração à lei — dolo comprovado',
      'Violação ao contrato social ou estatuto',
    ],
    aplicacaoFiscalTrib: 'Motor de Dívida Ativa usa para avaliar o risco de redirecionamento para sócios e orientar sobre medidas de proteção patrimonial.',
    grauConfianca:   'ALTO',
    impactoScore:    +10,
    palavrasChave:   ['dívida ativa', 'redirecionamento', 'sócio', 'execução fiscal', 'dissolução irregular', 'Tema 981'],
  },

  // ── SÚMULA 555 STJ — DECADÊNCIA ───────────────────────────────────

  SUMULA_555: {
    processo:        'Súmula 555 STJ',
    tema:            'Decadência — Tributos Sujeitos a Lançamento por Homologação',
    tipo:            TIPO_DECISAO_STJ.SUMULA,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2015-12-09',
    dataTransito:    '2015-12-09',
    relator:         'Corte Especial STJ',
    vinculante:      true,
    motores:         ['DECADENCIA', 'DIVIDA_ATIVA'],
    tese:            'Quando não houver declaração do débito, o prazo decadencial quinquenal para o Fisco constituir o crédito tributário conta-se exclusivamente na forma do art. 173, I do CTN, nos casos em que a legislação atribui ao sujeito passivo o dever de antecipar o pagamento sem prévio exame da autoridade administrativa.',
    aplicacaoFiscalTrib: 'Súmula sobre decadência. Motor de Decadência usa para calcular o prazo máximo que a RFB tem para autuação.',
    grauConfianca:   'ALTO',
    impactoScore:    +10,
    palavrasChave:   ['decadência', 'prazo', 'lançamento por homologação', 'Súmula 555', 'art. 173 CTN'],
  },

  // ── SÚMULA 560 STJ — PIS/COFINS ALÍQUOTA ZERO ────────────────────

  SUMULA_560: {
    processo:        'Súmula 560 STJ',
    tema:            'PIS/COFINS — Alíquota Zero — Regime Monofásico',
    tipo:            TIPO_DECISAO_STJ.SUMULA,
    status:          STATUS_DECISAO_STJ.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2015-12-09',
    dataTransito:    '2015-12-09',
    relator:         'Corte Especial STJ',
    vinculante:      true,
    motores:         ['MONOFASICOS'],
    tese:            'A exigência de lista negativa, positiva e neutra para fins de incidência de PIS/COFINS deve observar a legislação vigente à época dos fatos geradores.',
    aplicacaoFiscalTrib: 'Confirma que a análise de monofásicos deve usar a legislação vigente à época. Motor de Monofásicos verifica a lei aplicável em cada período analisado.',
    grauConfianca:   'ALTO',
    impactoScore:    +5,
    palavrasChave:   ['PIS', 'COFINS', 'monofásico', 'lista negativa', 'lista positiva', 'Súmula 560'],
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma decisão do STJ pelo identificador interno.
 * @param {string} id - ex: 'RESP_1624297'
 * @returns {object|null}
 */
export function getDecisaoSTJ(id) {
  return DECISOES_STJ[id] || null
}

/**
 * Retorna uma decisão pelo número do processo.
 * @param {string} processo - ex: 'REsp 1.624.297/RS'
 * @returns {object|null}
 */
export function getDecisaoSTJPorProcesso(processo) {
  return Object.values(DECISOES_STJ).find(d => d.processo === processo) || null
}

/**
 * Retorna todas as decisões aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getDecisoesSTJPorMotor(motor) {
  return Object.values(DECISOES_STJ).filter(d => d.motores?.includes(motor))
}

/**
 * Retorna apenas decisões vinculantes (repetitivos e súmulas).
 * @returns {Array}
 */
export function getDecisoesVinculantes() {
  return Object.values(DECISOES_STJ).filter(d => d.vinculante === true)
}

/**
 * Retorna apenas súmulas do STJ.
 * @returns {Array}
 */
export function getSumulasSTJ() {
  return Object.values(DECISOES_STJ).filter(d => d.tipo === TIPO_DECISAO_STJ.SUMULA)
}

/**
 * Calcula o impacto líquido das decisões do STJ no score de um motor.
 * @param {string} motor
 * @returns {number}
 */
export function calcularImpactoSTJNoScore(motor) {
  const decisoes = getDecisoesSTJPorMotor(motor)
  return decisoes.reduce((soma, d) => soma + (d.impactoScore || 0), 0)
}

/**
 * Verifica se há decisão de repetitivo do STJ para um motor.
 * @param {string} motor
 * @returns {boolean}
 */
export function temRepetitivoSTJ(motor) {
  return getDecisoesSTJPorMotor(motor).some(
    d => d.tipo === TIPO_DECISAO_STJ.RESP_REPETITIVO && d.vinculante
  )
}

/**
 * Metadados deste repositório.
 */
export const META_STJ = {
  versaoBase:      VERSAO_ATUAL.codigo,
  totalDecisoes:   Object.keys(DECISOES_STJ).length,
  atualizadaEm:    '2026-07-08',
  observacao:      'Recursos repetitivos do STJ vinculam todos os tribunais inferiores. ' +
                   'Súmulas orientam mas não vinculam administrativamente como as do STF. ' +
                   'Verificar se há decisão do STF posterior que supere o entendimento do STJ.',
}