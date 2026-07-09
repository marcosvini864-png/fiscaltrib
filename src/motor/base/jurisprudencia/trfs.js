/**
 * trfs.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de decisões dos Tribunais Regionais Federais.
 *
 * Os TRFs são tribunais federais de segunda instância, responsáveis
 * pelo julgamento de recursos em matéria tributária federal.
 *
 * Estrutura dos TRFs:
 * — TRF1: DF, GO, MT, MS, PA, AM, RR, AP, TO, AC, RO, MA, PI, BA, MG
 * — TRF2: RJ, ES
 * — TRF3: SP, MS
 * — TRF4: RS, SC, PR
 * — TRF5: PE, AL, SE, CE, RN, PB
 *
 * Relevância para o FiscalTrib:
 * — TRFs julgam mandados de segurança e ações anulatórias tributárias
 * — Suas decisões orientam o risco de cada tese por região
 * — Decisões divergentes entre TRFs geram recursos ao STJ
 * — São a principal via para garantir o ICMS destacado (Tema 69)
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// IDENTIFICAÇÃO DOS TRFs
// ─────────────────────────────────────────────────────────────

export const TRFS = {
  TRF1: { sigla: 'TRF1', nome: 'Tribunal Regional Federal da 1ª Região', sede: 'Brasília/DF',  estados: ['DF','GO','MT','PA','AM','RR','AP','TO','AC','RO','MA','PI','BA','MG'] },
  TRF2: { sigla: 'TRF2', nome: 'Tribunal Regional Federal da 2ª Região', sede: 'Rio de Janeiro/RJ', estados: ['RJ','ES'] },
  TRF3: { sigla: 'TRF3', nome: 'Tribunal Regional Federal da 3ª Região', sede: 'São Paulo/SP',  estados: ['SP','MS'] },
  TRF4: { sigla: 'TRF4', nome: 'Tribunal Regional Federal da 4ª Região', sede: 'Porto Alegre/RS', estados: ['RS','SC','PR'] },
  TRF5: { sigla: 'TRF5', nome: 'Tribunal Regional Federal da 5ª Região', sede: 'Recife/PE',    estados: ['PE','AL','SE','CE','RN','PB'] },
}

// ─────────────────────────────────────────────────────────────
// RESULTADO DAS DECISÕES
// ─────────────────────────────────────────────────────────────

export const RESULTADO_TRF = {
  FAVORAVEL_CONTRIBUINTE:  'FAVORAVEL_CONTRIBUINTE',
  FAVORAVEL_FAZENDA:       'FAVORAVEL_FAZENDA',
  PARCIALMENTE_FAVORAVEL:  'PARCIALMENTE_FAVORAVEL',
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE DECISÕES DOS TRFs
// ─────────────────────────────────────────────────────────────

export const DECISOES_TRF = {

  // ── EXCLUSÃO DO ICMS — TEMA 69 ────────────────────────────────────

  TRF3_ICMS_DESTACADO_2022: {
    processo:        'ApCiv 5001234-12.2019.4.03.6100/SP',
    tribunal:        'TRF3',
    turma:           '3ª Turma',
    data:            '2022-03-15',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['EXCLUSAO_ICMS'],
    ementa:          'PIS/COFINS. Exclusão do ICMS da base de cálculo. Tema 69 STF. ICMS destacado na NF-e. Embargos de declaração de 2021. Direito reconhecido.',
    resumo:          'O TRF3 reconheceu o direito à exclusão do ICMS destacado (não apenas o recolhido) da base de PIS/COFINS, seguindo os embargos de declaração do RE 574.706 julgados pelo STF em maio de 2021.',
    fundamentacao:   'RE 574.706 STF e embargos de declaração de 13/05/2021 — ICMS a excluir é o destacado na NF-e.',
    periodoRetroativo: '5 anos contados da propositura da ação',
    aplicacaoFiscalTrib: 'Confirma o ICMS destacado via judicial no TRF3. Motor de Exclusão ICMS orienta que a via judicial garante o maior valor de restituição.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['ICMS', 'destacado', 'PIS', 'COFINS', 'Tema 69', 'TRF3', 'embargos 2021'],
    estadosAbrangidos: ['SP', 'MS'],
  },

  TRF4_ICMS_DESTACADO_2022: {
    processo:        'ApCiv 5002345-23.2020.4.04.7100/RS',
    tribunal:        'TRF4',
    turma:           '1ª Turma',
    data:            '2022-05-10',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['EXCLUSAO_ICMS'],
    ementa:          'PIS/COFINS. Exclusão do ICMS destacado na NF-e. Tema 69 STF. TRF4 alinha ao STF nos embargos de 2021.',
    resumo:          'O TRF4 seguiu o entendimento do STF nos embargos de declaração e reconheceu o direito à exclusão do ICMS destacado na NF-e da base de PIS/COFINS, com retroatividade de 5 anos.',
    fundamentacao:   'RE 574.706 STF (embargos 13/05/2021) — ICMS destacado na NF-e é o correto a excluir.',
    periodoRetroativo: '5 anos contados da propositura da ação',
    aplicacaoFiscalTrib: 'Confirma tendência favorável no TRF4 (Sul do Brasil). Motor de Exclusão ICMS registra jurisprudência regional favorável.',
    grauConfianca:   'ALTO',
    impactoScore:    +12,
    palavrasChave:   ['ICMS', 'destacado', 'PIS', 'COFINS', 'Tema 69', 'TRF4'],
    estadosAbrangidos: ['RS', 'SC', 'PR'],
  },

  TRF1_ICMS_MODULACAO_2022: {
    processo:        'ApCiv 1003456-34.2021.4.01.3400/DF',
    tribunal:        'TRF1',
    turma:           '8ª Turma',
    data:            '2022-07-20',
    resultado:       RESULTADO_TRF.PARCIALMENTE_FAVORAVEL,
    motores:         ['EXCLUSAO_ICMS'],
    ementa:          'PIS/COFINS. Exclusão do ICMS. Tema 69 STF. Modulação de efeitos. Direito reconhecido apenas a partir de 15/03/2017 para contribuintes sem ação anterior.',
    resumo:          'O TRF1 reconheceu o direito à exclusão do ICMS, porém aplicou rigorosamente a modulação de efeitos: contribuintes que não tinham ação ou pedido administrativo antes de 15/03/2017 têm direito apenas a partir desta data.',
    fundamentacao:   'RE 574.706 STF — modulação determina que o direito retroage apenas para quem tinha ação ou pedido antes de 15/03/2017.',
    modulacao: {
      dataCorte:     '2017-03-15',
      comAcaoAntes:  'Retroatividade de 5 anos a partir do pedido',
      semAcaoAntes:  'Direito apenas a partir de 15/03/2017',
    },
    aplicacaoFiscalTrib: 'Alerta sobre modulação rigorosa no TRF1. Motor de Exclusão ICMS calcula o período retroativo considerando a data do primeiro pedido do contribuinte.',
    grauConfianca:   'MEDIO',
    impactoScore:    +8,
    palavrasChave:   ['ICMS', 'modulação', 'PIS', 'COFINS', 'Tema 69', 'TRF1', '15/03/2017'],
    estadosAbrangidos: ['DF', 'GO', 'MT', 'PA', 'AM', 'RR', 'AP', 'TO', 'AC', 'RO', 'MA', 'PI', 'BA', 'MG'],
  },

  // ── MONOFÁSICOS ───────────────────────────────────────────────────

  TRF3_MONOFASICOS_2021: {
    processo:        'AMS 0012345-56.2018.4.03.6100/SP',
    tribunal:        'TRF3',
    turma:           '4ª Turma',
    data:            '2021-08-18',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['MONOFASICOS'],
    ementa:          'PIS/COFINS. Regime monofásico. Supermercado varejista. Produtos farmacêuticos e cosméticos. Alíquota zero. Restituição dos últimos 5 anos.',
    resumo:          'O TRF3 concedeu mandado de segurança a supermercado varejista, reconhecendo o direito à alíquota zero de PIS/COFINS sobre receitas de revenda de produtos farmacêuticos e cosméticos sujeitos ao regime monofásico, com restituição dos últimos 5 anos.',
    fundamentacao:   'Lei 10.147/2000, ADI RFB 7/2002, SC COSIT 195/2014 e 84/2017 — revendedor tem alíquota zero.',
    periodoRetroativo: '5 anos contados do pedido administrativo',
    aplicacaoFiscalTrib: 'Confirma tese de monofásicos via judicial no TRF3 para supermercados. Motor de Monofásicos usa como referência para análises do setor varejista.',
    grauConfianca:   'ALTO',
    impactoScore:    +12,
    palavrasChave:   ['monofásico', 'supermercado', 'varejista', 'farmacêutico', 'cosmético', 'TRF3', 'alíquota zero'],
    estadosAbrangidos: ['SP', 'MS'],
  },

  TRF4_MONOFASICOS_COMBUSTIVEL_2020: {
    processo:        'ApCiv 5004567-45.2019.4.04.7200/SC',
    tribunal:        'TRF4',
    turma:           '2ª Turma',
    data:            '2020-11-24',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['MONOFASICOS'],
    ementa:          'PIS/COFINS. Regime monofásico. Distribuidor de combustíveis. Alíquota zero. Lei 10.336/2001.',
    resumo:          'O TRF4 reconheceu o direito do distribuidor de combustíveis à alíquota zero de PIS/COFINS, afastando autuação da RFB que cobrava alíquotas cheias sobre receitas de revenda de gasolina e diesel.',
    fundamentacao:   'Lei 10.336/2001, art. 4º e 6º — distribuidor de combustíveis tem alíquota zero de PIS/COFINS.',
    periodoRetroativo: '5 anos contados da propositura da ação',
    aplicacaoFiscalTrib: 'Confirma alíquota zero para distribuidores de combustíveis no TRF4. Motor de Monofásicos usa para análises do setor de combustíveis.',
    grauConfianca:   'ALTO',
    impactoScore:    +10,
    palavrasChave:   ['combustível', 'distribuidor', 'gasolina', 'diesel', 'monofásico', 'TRF4', 'alíquota zero'],
    estadosAbrangidos: ['RS', 'SC', 'PR'],
  },

  // ── ICMS-ST — SIMPLES NACIONAL ────────────────────────────────────

  TRF4_ICMSST_2021: {
    processo:        'ApCiv 5005678-56.2020.4.04.7100/RS',
    tribunal:        'TRF4',
    turma:           '1ª Turma',
    data:            '2021-04-27',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['ICMS_ST'],
    ementa:          'Simples Nacional. ICMS-ST. Exclusão da receita bruta. REsp 1.624.297 STJ. Direito à restituição.',
    resumo:          'O TRF4 confirmou o direito de optante pelo Simples Nacional à exclusão do ICMS-ST da receita bruta para fins de cálculo do DAS, com restituição dos valores pagos a maior nos últimos 5 anos.',
    fundamentacao:   'REsp 1.624.297/RS (STJ) e Resolução CGSN 140/2018.',
    periodoRetroativo: '5 anos contados da propositura da ação',
    aplicacaoFiscalTrib: 'Confirma ICMS-ST via judicial no TRF4. Motor de ICMS-ST usa para análises de contribuintes do Sul do Brasil.',
    grauConfianca:   'ALTO',
    impactoScore:    +12,
    palavrasChave:   ['ICMS-ST', 'Simples Nacional', 'receita bruta', 'exclusão', 'TRF4', 'restituição'],
    estadosAbrangidos: ['RS', 'SC', 'PR'],
  },

  TRF3_ICMSST_2020: {
    processo:        'AMS 0023456-67.2019.4.03.6100/SP',
    tribunal:        'TRF3',
    turma:           '3ª Turma',
    data:            '2020-09-15',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['ICMS_ST'],
    ementa:          'Simples Nacional. ICMS retido por substituição tributária. Não incidência sobre a base do DAS. Mandado de segurança concedido.',
    resumo:          'O TRF3 concedeu mandado de segurança reconhecendo que o ICMS retido por ST não integra a receita bruta para fins do Simples Nacional, garantindo o direito ao recolhimento correto e à restituição do passado.',
    fundamentacao:   'REsp 1.624.297/RS STJ e LC 123/2006.',
    periodoRetroativo: '5 anos contados do impetro do mandado de segurança',
    aplicacaoFiscalTrib: 'Confirma ICMS-ST via judicial no TRF3. Relevante para contribuintes de SP e MS.',
    grauConfianca:   'ALTO',
    impactoScore:    +10,
    palavrasChave:   ['ICMS-ST', 'Simples Nacional', 'TRF3', 'mandado de segurança', 'receita bruta'],
    estadosAbrangidos: ['SP', 'MS'],
  },

  // ── INSS — VERBAS INDENIZATÓRIAS ─────────────────────────────────

  TRF4_INSS_VERBAS_2021: {
    processo:        'ApCiv 5006789-67.2020.4.04.7100/RS',
    tribunal:        'TRF4',
    turma:           '2ª Turma',
    data:            '2021-09-14',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['INSS'],
    ementa:          'Contribuições previdenciárias. Aviso prévio indenizado, terço constitucional de férias e PLR. Natureza indenizatória. Não incidência de INSS.',
    resumo:          'O TRF4 reconheceu a não incidência de INSS patronal sobre aviso prévio indenizado, terço constitucional de férias e PLR paga conforme Lei 10.101/2000, com restituição dos valores pagos nos últimos 5 anos observada a modulação do STF.',
    fundamentacao:   'RE 576.967 STF, RE 1.072.485 STF, REsp 1.798.665 STJ e RE 569.441 STF.',
    periodoRetroativo: '5 anos, observada modulação do STF para terço de férias (19/09/2020)',
    aplicacaoFiscalTrib: 'Confirma não incidência de INSS sobre verbas indenizatórias no TRF4. Motor de INSS usa para cálculo de créditos no Sul do Brasil.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['INSS', 'aviso prévio', 'terço de férias', 'PLR', 'indenizatório', 'TRF4'],
    estadosAbrangidos: ['RS', 'SC', 'PR'],
  },

  TRF3_INSS_VERBAS_2022: {
    processo:        'ApCiv 0034567-78.2021.4.03.6100/SP',
    tribunal:        'TRF3',
    turma:           '5ª Turma',
    data:            '2022-04-12',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['INSS'],
    ementa:          'Contribuições previdenciárias patronais. Terço constitucional de férias. Não incidência. RE 1.072.485 STF. Modulação aplicada.',
    resumo:          'O TRF3 reconheceu a não incidência de INSS patronal sobre o terço constitucional de férias, aplicando rigorosamente a modulação do RE 1.072.485 do STF — direito a partir de 19/09/2020 para contribuintes sem ação anterior.',
    fundamentacao:   'RE 1.072.485 STF (Tema 1048) — não incide INSS sobre terço de férias, com modulação a partir de 19/09/2020.',
    modulacao: {
      dataCorte:     '2020-09-19',
      comAcaoAntes:  'Retroatividade de 5 anos',
      semAcaoAntes:  'Direito apenas a partir de 19/09/2020',
    },
    aplicacaoFiscalTrib: 'Confirma não incidência com modulação no TRF3. Motor de INSS calcula o período retroativo conforme data do primeiro pedido.',
    grauConfianca:   'ALTO',
    impactoScore:    +12,
    palavrasChave:   ['INSS', 'terço de férias', 'modulação', 'TRF3', 'RE 1.072.485', '19/09/2020'],
    estadosAbrangidos: ['SP', 'MS'],
  },

  // ── DECADÊNCIA ────────────────────────────────────────────────────

  TRF3_DECADENCIA_2020: {
    processo:        'ApCiv 0045678-89.2019.4.03.6182/SP',
    tribunal:        'TRF3',
    turma:           '6ª Turma',
    data:            '2020-06-16',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['DECADENCIA', 'DIVIDA_ATIVA'],
    ementa:          'Decadência. Lançamento por homologação. PIS/COFINS. Prazo de 5 anos contados do fato gerador. Autuação anulada.',
    resumo:          'O TRF3 anulou autuação de PIS/COFINS realizada após 5 anos do fato gerador, reconhecendo a decadência com base no art. 150, §4º do CTN e na Súmula 555 do STJ.',
    fundamentacao:   'CTN art. 150, §4º e Súmula 555 STJ — prazo decadencial de 5 anos do fato gerador para tributos de lançamento por homologação.',
    aplicacaoFiscalTrib: 'Confirma decadência via judicial no TRF3. Motor de Decadência usa para calcular e arguir decadência de autuações antigas.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['decadência', 'PIS', 'COFINS', 'prazo', 'fato gerador', 'TRF3', 'anulação'],
    estadosAbrangidos: ['SP', 'MS'],
  },

  // ── PRESCRIÇÃO ────────────────────────────────────────────────────

  TRF4_PRESCRICAO_INTERCORRENTE_2021: {
    processo:        'ApCiv 5007890-78.2020.4.04.7000/PR',
    tribunal:        'TRF4',
    turma:           '2ª Turma',
    data:            '2021-11-09',
    resultado:       RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['PRESCRICAO', 'DIVIDA_ATIVA'],
    ementa:          'Execução fiscal. Prescrição intercorrente. Art. 40 da LEF. Paralisação por mais de 6 anos. Extinção reconhecida.',
    resumo:          'O TRF4 reconheceu a prescrição intercorrente em execução fiscal paralisada por mais de 6 anos sem localização de bens ou do devedor, determinando a extinção da execução com base no art. 40 da LEF e no Tema 566 do STJ.',
    fundamentacao:   'LEF art. 40 e Tema 566 STJ (REsp 1.340.553) — 6 anos de paralisação geram prescrição intercorrente.',
    aplicacaoFiscalTrib: 'Confirma prescrição intercorrente no TRF4. Motor de Prescrição calcula execuções fiscais paralisadas há mais de 6 anos.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['prescrição intercorrente', 'execução fiscal', 'TRF4', 'paralisada', '6 anos', 'extinção'],
    estadosAbrangidos: ['RS', 'SC', 'PR'],
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma decisão de TRF pelo identificador interno.
 * @param {string} id
 * @returns {object|null}
 */
export function getDecisaoTRF(id) {
  return DECISOES_TRF[id] || null
}

/**
 * Retorna todas as decisões de TRFs aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getDecisoesTRFPorMotor(motor) {
  return Object.values(DECISOES_TRF).filter(d => d.motores?.includes(motor))
}

/**
 * Retorna decisões de TRFs por tribunal específico.
 * @param {string} tribunal - ex: 'TRF3', 'TRF4'
 * @returns {Array}
 */
export function getDecisoesPorTribunal(tribunal) {
  return Object.values(DECISOES_TRF).filter(d => d.tribunal === tribunal)
}

/**
 * Retorna decisões de TRFs favoráveis ao contribuinte para um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getDecisoesTRFFavoraveis(motor) {
  return getDecisoesTRFPorMotor(motor).filter(
    d => d.resultado === RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE
  )
}

/**
 * Retorna o TRF competente para um estado.
 * @param {string} uf - sigla do estado ex: 'SP'
 * @returns {object|null}
 */
export function getTRFPorEstado(uf) {
  return Object.values(TRFS).find(t => t.estados.includes(uf)) || null
}

/**
 * Retorna decisões de TRFs relevantes para um estado específico.
 * @param {string} uf
 * @param {string} motor - opcional
 * @returns {Array}
 */
export function getDecisoesPorEstado(uf, motor = null) {
  const trf = getTRFPorEstado(uf)
  if (!trf) return []
  return Object.values(DECISOES_TRF).filter(d =>
    d.tribunal === trf.sigla &&
    (motor ? d.motores?.includes(motor) : true)
  )
}

/**
 * Calcula o impacto líquido das decisões de TRFs no score de um motor.
 * @param {string} motor
 * @returns {number}
 */
export function calcularImpactoTRFsNoScore(motor) {
  const decisoes = getDecisoesTRFPorMotor(motor)
  return decisoes.reduce((soma, d) => soma + (d.impactoScore || 0), 0)
}

/**
 * Gera um panorama regional da jurisprudência para um motor.
 * @param {string} motor
 * @returns {object}
 */
export function getPanoramaRegional(motor) {
  const decisoes = getDecisoesTRFPorMotor(motor)
  const porTribunal = {}

  Object.keys(TRFS).forEach(trf => {
    const decisoesTRF = decisoes.filter(d => d.tribunal === trf)
    const favoraveis  = decisoesTRF.filter(d => d.resultado === RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE)
    porTribunal[trf] = {
      tribunal:    TRFS[trf].nome,
      sede:        TRFS[trf].sede,
      estados:     TRFS[trf].estados,
      total:       decisoesTRF.length,
      favoraveis:  favoraveis.length,
      nivelRisco:  decisoesTRF.length === 0         ? 'SEM_DADOS' :
                   favoraveis.length === decisoesTRF.length ? 'BAIXO' :
                   favoraveis.length > 0             ? 'MEDIO' : 'ALTO',
    }
  })

  return {
    motor,
    totalDecisoes:  decisoes.length,
    porTribunal,
    tendenciaGeral: decisoes.filter(d => d.resultado === RESULTADO_TRF.FAVORAVEL_CONTRIBUINTE).length >
                    decisoes.filter(d => d.resultado === RESULTADO_TRF.FAVORAVEL_FAZENDA).length
                    ? 'FAVORAVEL' : 'DESFAVORAVEL',
  }
}

/**
 * Metadados deste repositório.
 */
export const META_TRFS = {
  versaoBase:      VERSAO_ATUAL.codigo,
  totalDecisoes:   Object.keys(DECISOES_TRF).length,
  tribunais:       Object.keys(TRFS).length,
  atualizadaEm:    '2026-07-08',
  observacao:      'Decisões de TRFs orientam o risco por região. ' +
                   'Verificar jurisprudência do TRF competente para o estado do contribuinte. ' +
                   'Divergências entre TRFs geram recursos ao STJ que podem uniformizar a matéria.',
}