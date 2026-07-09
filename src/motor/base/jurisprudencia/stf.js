/**
 * stf.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de decisões do Supremo Tribunal Federal.
 *
 * O STF é a instância máxima do Poder Judiciário brasileiro.
 * Suas decisões em repercussão geral vinculam todos os tribunais
 * e a administração pública federal, incluindo a RFB e a PGFN.
 *
 * Tipos de decisão relevantes:
 * — RE com Repercussão Geral: vincula todos os tribunais
 * — ADI/ADC: controle concentrado de constitucionalidade
 * — ADPF: arguição de descumprimento de preceito fundamental
 * — Súmula Vinculante: de observância obrigatória por todos
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// TIPOS DE DECISÃO STF
// ─────────────────────────────────────────────────────────────

export const TIPO_DECISAO_STF = {
  RE_REPERCUSSAO_GERAL: 'RE_REPERCUSSAO_GERAL',
  ADI:                  'ADI',
  ADC:                  'ADC',
  ADPF:                 'ADPF',
  SUMULA_VINCULANTE:    'SUMULA_VINCULANTE',
  SUMULA:               'SUMULA',
  MS:                   'MS',
}

// ─────────────────────────────────────────────────────────────
// STATUS DA DECISÃO
// ─────────────────────────────────────────────────────────────

export const STATUS_DECISAO_STF = {
  TRANSITADO_EM_JULGADO:  'TRANSITADO_EM_JULGADO',   // definitivo
  EMBARGOS_PENDENTES:     'EMBARGOS_PENDENTES',        // embargos em curso
  MODULACAO_PENDENTE:     'MODULACAO_PENDENTE',        // aguardando modulação
  PENDENTE:               'PENDENTE',                  // ainda em julgamento
  SUSPENSO:               'SUSPENSO',                  // suspenso por decisão
}

// ─────────────────────────────────────────────────────────────
// EFEITO TEMPORAL
// ─────────────────────────────────────────────────────────────

export const EFEITO_TEMPORAL = {
  EX_TUNC:           'EX_TUNC',          // retroativo — desde a origem
  EX_NUNC:           'EX_NUNC',          // prospectivo — a partir da decisão
  MODULADO:          'MODULADO',          // com modulação específica definida
  MODULACAO_PENDENTE:'MODULACAO_PENDENTE',// aguardando definição
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE DECISÕES DO STF
// ─────────────────────────────────────────────────────────────

export const DECISOES_STF = {

  // ── TEMA 69 — EXCLUSÃO DO ICMS DA BASE PIS/COFINS ────────────────

  RE_574706: {
    processo:        'RE 574.706',
    tema:            'Tema 69',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2017-03-15',
    dataTransito:    '2021-05-13',
    relator:         'Min. Cármen Lúcia',
    efeitoTemporal:  EFEITO_TEMPORAL.MODULADO,
    vinculante:      true,
    motores:         ['EXCLUSAO_ICMS'],
    tese:            'O ICMS não compõe a base de cálculo para a incidência do PIS e da COFINS.',
    modulacao: {
      dataCorte:     '2017-03-15',
      regra:         'Contribuintes que não tinham ação judicial ou pedido administrativo até 15/03/2017 só têm direito a partir desta data.',
      excecao:       'Quem tinha ação ou pedido administrativo antes de 15/03/2017 tem direito retroativo de 5 anos.',
    },
    embargosDeclaracao: {
      julgados:      true,
      data:          '2021-05-13',
      resultado:     'STF definiu que o ICMS a ser excluído é o ICMS destacado na NF-e, não o efetivamente recolhido.',
    },
    impactoFinanceiro: {
      estimativaRFB:    'R$ 250 bilhões (apenas regime não cumulativo)',
      prazoRecuperacao: '5 anos retroativos contados da data do pedido',
    },
    aplicacaoFiscalTrib: 'Decisão mais importante para o Motor de Exclusão ICMS. Define o direito de excluir o ICMS destacado da base de PIS/COFINS com direito a 5 anos retroativos.',
    grauConfianca:   'ALTO',
    impactoScore:    +30,
    palavrasChave:   ['ICMS', 'PIS', 'COFINS', 'base de cálculo', 'exclusão', 'Tema 69'],
  },

  // ── TEMA 478 — AVISO PRÉVIO INDENIZADO E INSS ────────────────────

  RE_576967: {
    processo:        'RE 576.967',
    tema:            'Tema 478',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2010-08-04',
    dataTransito:    '2010-10-15',
    relator:         'Min. Eros Grau',
    efeitoTemporal:  EFEITO_TEMPORAL.EX_TUNC,
    vinculante:      true,
    motores:         ['INSS'],
    tese:            'Não incide contribuição previdenciária sobre o valor pago a título de aviso prévio indenizado.',
    aplicacaoFiscalTrib: 'Fundamento do Motor de INSS para identificar empresas que recolheram INSS sobre aviso prévio indenizado indevidamente.',
    grauConfianca:   'ALTO',
    impactoScore:    +20,
    palavrasChave:   ['INSS', 'aviso prévio', 'indenizado', 'contribuição previdenciária'],
  },

  // ── TEMA 1048 — CONTRIBUIÇÃO PREVIDENCIÁRIA SOBRE TERÇO DE FÉRIAS

  RE_1072485: {
    processo:        'RE 1.072.485',
    tema:            'Tema 1048',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2020-09-19',
    dataTransito:    '2021-02-05',
    relator:         'Min. Marco Aurélio',
    efeitoTemporal:  EFEITO_TEMPORAL.MODULADO,
    vinculante:      true,
    motores:         ['INSS'],
    tese:            'É inconstitucional a incidência de contribuição previdenciária patronal sobre o terço constitucional de férias.',
    modulacao: {
      dataCorte:     '2020-09-19',
      regra:         'Para contribuintes sem ação ou pedido administrativo antes de 19/09/2020, direito apenas a partir desta data.',
      excecao:       'Quem tinha ação ou pedido antes de 19/09/2020 tem direito retroativo de 5 anos.',
    },
    aplicacaoFiscalTrib: 'Motor de INSS identifica empresas que recolheram INSS patronal sobre terço de férias — direito à restituição observada a modulação.',
    grauConfianca:   'ALTO',
    impactoScore:    +20,
    palavrasChave:   ['INSS', 'terço de férias', 'férias', 'contribuição previdenciária', 'inconstitucional'],
  },

  // ── TEMA 657 — CSLL E IRPJ SOBRE JUROS SELIC NA REPETIÇÃO ────────

  RE_1063187: {
    processo:        'RE 1.063.187',
    tema:            'Tema 962',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2021-09-24',
    dataTransito:    '2022-02-01',
    relator:         'Min. Dias Toffoli',
    efeitoTemporal:  EFEITO_TEMPORAL.MODULADO,
    vinculante:      true,
    motores:         ['IRPJ_CSLL', 'MONOFASICOS', 'EXCLUSAO_ICMS'],
    tese:            'É inconstitucional a incidência do IRPJ e da CSLL sobre os valores de SELIC recebidos na repetição do indébito tributário.',
    modulacao: {
      dataCorte:     '2021-09-24',
      regra:         'Para contribuintes sem ação ou pedido administrativo antes de 30/09/2021, direito apenas a partir desta data.',
      excecao:       'Quem tinha ação ou pedido antes de 30/09/2021 tem direito retroativo.',
    },
    aplicacaoFiscalTrib: 'Impacta todos os motores de recuperação de crédito. O IRPJ e CSLL sobre a SELIC recebida na restituição não é mais devido — aumenta o valor líquido da recuperação.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['IRPJ', 'CSLL', 'SELIC', 'repetição do indébito', 'restituição', 'Tema 962'],
  },

  // ── TEMA 339 — PIS/COFINS SOBRE RECEITAS FINANCEIRAS ─────────────

  RE_400479: {
    processo:        'RE 400.479',
    tema:            'Tema 339',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2009-10-07',
    dataTransito:    '2010-02-01',
    relator:         'Min. Cezar Peluso',
    efeitoTemporal:  EFEITO_TEMPORAL.EX_TUNC,
    vinculante:      true,
    motores:         ['EXCLUSAO_ICMS'],
    tese:            'A definição de faturamento para fins de PIS/COFINS restringe-se às receitas operacionais provenientes da venda de mercadorias e serviços.',
    aplicacaoFiscalTrib: 'Define o conceito de faturamento. Motor de Exclusão ICMS usa para delimitar a base de cálculo do PIS/COFINS no regime cumulativo.',
    grauConfianca:   'ALTO',
    impactoScore:    +10,
    palavrasChave:   ['PIS', 'COFINS', 'faturamento', 'receita', 'base de cálculo'],
  },

  // ── TEMA 201 — SIMPLES NACIONAL E SUBSTITUIÇÃO TRIBUTÁRIA ─────────

  RE_970821: {
    processo:        'RE 970.821',
    tema:            'Tema 201',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2019-02-06',
    dataTransito:    '2019-05-10',
    relator:         'Min. Edson Fachin',
    efeitoTemporal:  EFEITO_TEMPORAL.EX_NUNC,
    vinculante:      true,
    motores:         ['ICMS_ST'],
    tese:            'É constitucional a inclusão do ICMS-ST na base de cálculo do Simples Nacional quando o valor retido é repassado na cadeia de fornecimento.',
    aplicacaoFiscalTrib: 'Atenção: esta decisão é desfavorável ao contribuinte — STF entendeu que ICMS-ST pode compor o Simples em determinadas situações. O STJ (REsp 1.624.297) chegou a conclusão diferente. Motor de ICMS-ST registra a controvérsia.',
    grauConfianca:   'MEDIO',
    impactoScore:    -10,
    palavrasChave:   ['ICMS-ST', 'Simples Nacional', 'substituição tributária', 'base de cálculo'],
    obs:             'Controvérsia entre STF e STJ — verificar jurisprudência mais recente.',
  },

  // ── TEMA 745 — CONTRIBUIÇÃO PREVIDENCIÁRIA SOBRE PLR ─────────────

  RE_569441: {
    processo:        'RE 569.441',
    tema:            'Tema 201',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2008-10-02',
    dataTransito:    '2009-01-15',
    relator:         'Min. Menezes Direito',
    efeitoTemporal:  EFEITO_TEMPORAL.EX_TUNC,
    vinculante:      true,
    motores:         ['INSS'],
    tese:            'A participação nos lucros e resultados (PLR), quando paga nos termos da Lei 10.101/2000, não sofre incidência de contribuições previdenciárias.',
    aplicacaoFiscalTrib: 'Confirma isenção do INSS sobre PLR. Motor de INSS identifica empresas que recolheram INSS indevidamente sobre PLR.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['PLR', 'participação nos lucros', 'INSS', 'contribuição previdenciária'],
  },

  // ── TEMA 505 — CRÉDITO-PRÊMIO DE IPI ─────────────────────────────

  RE_561485: {
    processo:        'RE 561.485',
    tema:            'Tema 505',
    tipo:            TIPO_DECISAO_STF.RE_REPERCUSSAO_GERAL,
    status:          STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO,
    dataJulgamento:  '2008-10-24',
    dataTransito:    '2009-02-10',
    relator:         'Min. Gilmar Mendes',
    efeitoTemporal:  EFEITO_TEMPORAL.EX_TUNC,
    vinculante:      true,
    motores:         ['IRPJ_CSLL'],
    tese:            'O crédito-prêmio de IPI nas exportações foi extinto em 05/10/1990 com a promulgação da Constituição Federal de 1988.',
    aplicacaoFiscalTrib: 'Define extinção do crédito-prêmio de IPI. Motor de IRPJ/CSLL usa para alertar sobre tentativas de recuperação deste crédito já extinto.',
    grauConfianca:   'ALTO',
    impactoScore:    0,
    palavrasChave:   ['IPI', 'crédito-prêmio', 'exportação', 'extinção'],
    obs:             'Crédito extinto — alertar contribuintes que tentam recuperar este crédito indevidamente.',
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma decisão do STF pelo identificador interno.
 * @param {string} id - ex: 'RE_574706'
 * @returns {object|null}
 */
export function getDecisaoSTF(id) {
  return DECISOES_STF[id] || null
}

/**
 * Retorna uma decisão pelo número do processo.
 * @param {string} processo - ex: 'RE 574.706'
 * @returns {object|null}
 */
export function getDecisaoSTFPorProcesso(processo) {
  return Object.values(DECISOES_STF).find(d => d.processo === processo) || null
}

/**
 * Retorna uma decisão pelo número do tema.
 * @param {string} tema - ex: 'Tema 69'
 * @returns {object|null}
 */
export function getDecisaoSTFPorTema(tema) {
  return Object.values(DECISOES_STF).find(d => d.tema === tema) || null
}

/**
 * Retorna todas as decisões aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getDecisoesPorMotor(motor) {
  return Object.values(DECISOES_STF).filter(d => d.motores?.includes(motor))
}

/**
 * Retorna apenas decisões transitadas em julgado.
 * @returns {Array}
 */
export function getDecisoesTransitadas() {
  return Object.values(DECISOES_STF).filter(d =>
    d.status === STATUS_DECISAO_STF.TRANSITADO_EM_JULGADO
  )
}

/**
 * Retorna decisões com modulação de efeitos.
 * @returns {Array}
 */
export function getDecisoesComModulacao() {
  return Object.values(DECISOES_STF).filter(d =>
    d.efeitoTemporal === EFEITO_TEMPORAL.MODULADO && d.modulacao
  )
}

/**
 * Retorna a data de corte da modulação para uma decisão.
 * @param {string} id
 * @returns {string|null}
 */
export function getDataCorteModulacao(id) {
  const d = getDecisaoSTF(id)
  return d?.modulacao?.dataCorte || null
}

/**
 * Calcula o impacto líquido das decisões do STF no score de um motor.
 * @param {string} motor
 * @returns {number}
 */
export function calcularImpactoSTFNoScore(motor) {
  const decisoes = getDecisoesPorMotor(motor)
  return decisoes.reduce((soma, d) => soma + (d.impactoScore || 0), 0)
}

/**
 * Verifica se o contribuinte tem direito retroativo dado uma data de corte.
 * @param {string} id - identificador da decisão
 * @param {string} dataPedido - data do pedido/ação no formato 'AAAA-MM-DD'
 * @returns {{ retroativo: boolean, desde: string, ate: string }}
 */
export function verificarDireitoRetroativo(id, dataPedido) {
  const decisao = getDecisaoSTF(id)
  if (!decisao?.modulacao) {
    return { retroativo: true, desde: '5 anos antes do pedido', ate: 'data do pedido' }
  }
  const corte    = new Date(decisao.modulacao.dataCorte)
  const pedido   = new Date(dataPedido)
  const cincoAnos = new Date(pedido)
  cincoAnos.setFullYear(cincoAnos.getFullYear() - 5)

  if (pedido < corte) {
    return {
      retroativo: true,
      desde:      cincoAnos.toISOString().slice(0, 10),
      ate:        dataPedido,
      obs:        'Pedido anterior à modulação — direito retroativo de 5 anos',
    }
  } else {
    return {
      retroativo: false,
      desde:      decisao.modulacao.dataCorte,
      ate:        dataPedido,
      obs:        `Pedido posterior à modulação — direito a partir de ${decisao.modulacao.dataCorte}`,
    }
  }
}

/**
 * Metadados deste repositório.
 */
export const META_STF = {
  versaoBase:      VERSAO_ATUAL.codigo,
  totalDecisoes:   Object.keys(DECISOES_STF).length,
  atualizadaEm:    '2026-07-08',
  observacao:      'Decisões do STF em repercussão geral vinculam todos os tribunais e a administração pública. ' +
                   'Verificar modulação de efeitos antes de calcular o período retroativo. ' +
                   'Embargos de declaração podem alterar o alcance da decisão original.',
}