/**
 * instrucoes_normativas.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de Instruções Normativas da Receita Federal do Brasil.
 *
 * As INs da RFB regulamentam operacionalmente a legislação tributária,
 * definindo procedimentos, prazos, obrigações acessórias e interpretações
 * oficiais da Receita Federal sobre a aplicação das leis.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE INSTRUÇÕES NORMATIVAS
// ─────────────────────────────────────────────────────────────

export const INSTRUCOES_NORMATIVAS = {

  // ── PIS/COFINS — CONSOLIDAÇÃO GERAL ──────────────────────────────

  IN2121_2022: {
    numero:        'IN RFB 2.121/2022',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2022-12-15',
    ementa:        'Consolida as normas sobre a apuração, a cobrança, a fiscalização, a arrecadação e a administração da Contribuição para o PIS/Pasep e da COFINS.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'EXCLUSAO_ICMS', 'ICMS_ST'],
    dispositivos: [
      { artigo: 'Art. 1º',    descricao: 'Âmbito de aplicação — PIS/COFINS cumulativo e não cumulativo.' },
      { artigo: 'Art. 24º',   descricao: 'Produtos sujeitos ao regime monofásico de PIS/COFINS.' },
      { artigo: 'Art. 25º',   descricao: 'Alíquotas diferenciadas do regime monofásico por produto.' },
      { artigo: 'Art. 26º',   descricao: 'Alíquota zero para revendedores de produtos monofásicos.' },
      { artigo: 'Art. 119º',  descricao: 'Créditos de PIS/COFINS no regime não cumulativo.' },
      { artigo: 'Art. 170º',  descricao: 'PER/DCOMP — pedido de restituição e compensação.' },
      { artigo: 'Art. 558º',  descricao: 'Listas positiva, negativa e neutra de medicamentos.' },
    ],
    aplicacaoFiscalTrib: 'IN mais importante para os motores de PIS/COFINS. Consolida todas as regras operacionais do regime monofásico, créditos e restituições.',
    obs: 'Revogou diversas INs anteriores sobre PIS/COFINS. É a referência principal vigente.',
  },

  // ── PER/DCOMP ────────────────────────────────────────────────────

  IN2055_2021: {
    numero:        'IN RFB 2.055/2021',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2021-12-07',
    ementa:        'Dispõe sobre a restituição, a compensação, o ressarcimento e o reembolso de tributos administrados pela Secretaria Especial da Receita Federal do Brasil.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'EXCLUSAO_ICMS', 'ICMS_ST'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Disciplina PER/DCOMP — pedido eletrônico de restituição e compensação.' },
      { artigo: 'Art. 7º',  descricao: 'Prazo de 5 anos para pedido de restituição — art. 168 do CTN.' },
      { artigo: 'Art. 26º', descricao: 'Compensação de débitos com créditos reconhecidos.' },
      { artigo: 'Art. 74º', descricao: 'Vedações à compensação — débitos e créditos não compensáveis.' },
      { artigo: 'Art. 89º', descricao: 'Prazo para análise do PER/DCOMP pela RFB — 360 dias.' },
    ],
    aplicacaoFiscalTrib: 'Procedimento operacional para recuperação de créditos tributários. Todos os motores de recuperação utilizam esta IN para orientar o plano de ação.',
    prazosImportantes: [
      { descricao: 'Prazo para pedido de restituição',     prazo: '5 anos da data do pagamento indevido' },
      { descricao: 'Prazo para análise pela RFB',          prazo: '360 dias corridos' },
      { descricao: 'Prazo para recurso de indeferimento',  prazo: '30 dias da ciência' },
    ],
  },

  // ── SPED — OBRIGAÇÕES ACESSÓRIAS ─────────────────────────────────

  IN1774_2017: {
    numero:        'IN RFB 1.774/2017',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2017-12-22',
    ementa:        'Dispõe sobre a Escrituração Contábil Fiscal — ECF.',
    vigente:       true,
    motores:       ['IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Obrigatoriedade da ECF para pessoas jurídicas tributadas pelo IRPJ.' },
      { artigo: 'Art. 3º', descricao: 'Prazo de entrega da ECF — último dia útil de julho.' },
      { artigo: 'Art. 5º', descricao: 'Informações obrigatórias na ECF — IRPJ, CSLL, LALUR, LACS.' },
    ],
    aplicacaoFiscalTrib: 'Obrigação acessória do IRPJ/CSLL. Utilizada pelo Motor de IRPJ/CSLL para validação de dados importados via parser ECF.',
  },

  IN1420_2013: {
    numero:        'IN RFB 1.420/2013',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2013-12-19',
    ementa:        'Dispõe sobre a Escrituração Contábil Digital — ECD.',
    vigente:       true,
    motores:       ['IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Obrigatoriedade da ECD para pessoas jurídicas.' },
      { artigo: 'Art. 5º', descricao: 'Prazo de entrega da ECD — último dia útil de maio.' },
    ],
    aplicacaoFiscalTrib: 'Obrigação acessória contábil. Utilizada pelo Motor de IRPJ/CSLL para validação de dados importados via parser ECD.',
  },

  IN1252_2012: {
    numero:        'IN RFB 1.252/2012',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2012-03-01',
    ementa:        'Dispõe sobre a Escrituração Fiscal Digital da Contribuição para o PIS/Pasep e da COFINS — EFD-Contribuições.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'EXCLUSAO_ICMS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Obrigatoriedade da EFD-Contribuições.' },
      { artigo: 'Art. 5º', descricao: 'Prazo de entrega — até o 10º dia útil do 2º mês subsequente.' },
      { artigo: 'Art. 6º', descricao: 'Informações obrigatórias — PIS/COFINS por documento fiscal.' },
    ],
    aplicacaoFiscalTrib: 'Obrigação acessória de PIS/COFINS. O parser SPED Contribuições lê este arquivo para validar os créditos declarados.',
  },

  // ── DCTFWEB ───────────────────────────────────────────────────────

  IN1787_2018: {
    numero:        'IN RFB 1.787/2018',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2018-02-07',
    ementa:        'Dispõe sobre a Declaração de Débitos e Créditos Tributários Federais Previdenciários e de Outras Entidades e Fundos — DCTFWeb.',
    vigente:       true,
    motores:       ['INSS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Institui a DCTFWeb em substituição ao GFIP para apuração previdenciária.' },
      { artigo: 'Art. 7º', descricao: 'Prazo de entrega — até o dia 15 do mês seguinte.' },
      { artigo: 'Art. 9º', descricao: 'Retificação da DCTFWeb — prazos e condições.' },
    ],
    aplicacaoFiscalTrib: 'Obrigação acessória do INSS. O parser DCTFWeb lê este arquivo para validar contribuições previdenciárias declaradas.',
  },

  // ── ESOCIAL ───────────────────────────────────────────────────────

  IN2005_2021: {
    numero:        'IN RFB 2.005/2021',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2021-01-29',
    ementa:        'Dispõe sobre o Sistema de Escrituração Digital das Obrigações Fiscais, Previdenciárias e Trabalhistas — eSocial.',
    vigente:       true,
    motores:       ['INSS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Define o eSocial como escrituração digital unificada.' },
      { artigo: 'Art. 3º', descricao: 'Eventos do eSocial — tabelas, não periódicos e periódicos.' },
      { artigo: 'Art. 8º', descricao: 'Substituição do GFIP, CAGED, RAIS e outras obrigações.' },
    ],
    aplicacaoFiscalTrib: 'eSocial como fonte de dados do INSS. Utilizado pelo Motor de INSS para cruzar verbas declaradas com a legislação.',
  },

  // ── PGDAS-D ───────────────────────────────────────────────────────

  IN1670_2016: {
    numero:        'IN RFB 1.670/2016',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2016-11-09',
    ementa:        'Dispõe sobre o Programa Gerador do Documento de Arrecadação do Simples Nacional — PGDAS-D.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'ICMS_ST', 'FATOR_R'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'PGDAS-D como sistema de apuração do Simples Nacional.' },
      { artigo: 'Art. 5º', descricao: 'Segregação de receitas por anexo e atividade.' },
      { artigo: 'Art. 7º', descricao: 'Receitas sujeitas à substituição tributária — não compõem a base do DAS.' },
    ],
    aplicacaoFiscalTrib: 'Regulamenta o PGDAS-D. O parser PGDAS lê dados deste sistema para alimentar os motores de Monofásicos, ICMS-ST e Fator R.',
  },

  // ── NF-e ─────────────────────────────────────────────────────────

  IN1774_NFe: {
    numero:        'IN RFB 1.799/2018',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2018-03-01',
    ementa:        'Dispõe sobre a obrigatoriedade de informação do CEST nas notas fiscais eletrônicas — NF-e.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'ICMS_ST'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Obrigatoriedade do CEST na NF-e para produtos sujeitos ao ICMS-ST.' },
      { artigo: 'Art. 2º', descricao: 'Prazo de adequação para emitentes de NF-e.' },
    ],
    aplicacaoFiscalTrib: 'Valida a obrigatoriedade do CEST nas NF-es. O parser XML utiliza o CEST para identificar produtos sujeitos ao ICMS-ST.',
  },

  // ── REFIS / PARCELAMENTOS ────────────────────────────────────────

  IN1981_2020: {
    numero:        'IN RFB 1.981/2020',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2020-10-30',
    ementa:        'Dispõe sobre o parcelamento de débitos tributários federais na Receita Federal do Brasil.',
    vigente:       true,
    motores:       ['DIVIDA_ATIVA', 'TRANSACAO'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Modalidades de parcelamento de débitos federais.' },
      { artigo: 'Art. 3º', descricao: 'Parcelamento ordinário — até 60 meses.' },
      { artigo: 'Art. 5º', descricao: 'Parcelamento simplificado — até 60 meses sem documentos.' },
      { artigo: 'Art. 8º', descricao: 'Exclusão do parcelamento por falta de pagamento.' },
    ],
    aplicacaoFiscalTrib: 'Parcelamentos administrativos da RFB. Utilizado pelos motores de Dívida Ativa e Transação para orientar regularização.',
    modalidades: [
      { nome: 'Parcelamento Ordinário',     parcelas: 60,  juros: 'SELIC' },
      { nome: 'Parcelamento Simplificado',  parcelas: 60,  juros: 'SELIC' },
      { nome: 'Parcelamento Especial',      parcelas: 120, juros: 'SELIC', obs: 'Quando disponível' },
    ],
  },

  // ── EXCLUSÃO DO ICMS — OPERACIONALIZAÇÃO ─────────────────────────

  IN1911_2019: {
    numero:        'IN RFB 1.911/2019',
    tipo:          'INSTRUCAO_NORMATIVA',
    orgao:         'RFB',
    data:          '2019-10-11',
    ementa:        'Dispõe sobre normas de tributação relativas às contribuições para o PIS/Pasep e à COFINS — consolida as normas sobre créditos e exclusões.',
    vigente:       false,
    substituidaPor: 'IN RFB 2.121/2022',
    motores:       ['EXCLUSAO_ICMS', 'MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 27º', descricao: 'Exclusão do ICMS da base de cálculo do PIS/COFINS — operacionalização do Tema 69.' },
    ],
    aplicacaoFiscalTrib: 'Revogada pela IN 2.121/2022 mas referenciada em processos anteriores a 2022. O conteúdo foi absorvido pela IN 2.121/2022.',
    obs: 'IN revogada — usar IN 2.121/2022 para processos novos.',
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma IN pelo seu identificador interno.
 * @param {string} id - ex: 'IN2121_2022'
 * @returns {object|null}
 */
export function getIN(id) {
  return INSTRUCOES_NORMATIVAS[id] || null
}

/**
 * Retorna uma IN pelo seu número.
 * @param {string} numero - ex: 'IN RFB 2.121/2022'
 * @returns {object|null}
 */
export function getINPorNumero(numero) {
  return Object.values(INSTRUCOES_NORMATIVAS).find(i => i.numero === numero) || null
}

/**
 * Retorna todas as INs aplicáveis a um motor.
 * @param {string} motor - ex: 'MONOFASICOS'
 * @returns {Array}
 */
export function getINsPorMotor(motor) {
  return Object.values(INSTRUCOES_NORMATIVAS).filter(i => i.motores?.includes(motor))
}

/**
 * Retorna apenas INs vigentes.
 * @returns {Array}
 */
export function getINsVigentes() {
  return Object.values(INSTRUCOES_NORMATIVAS).filter(i => i.vigente === true)
}

/**
 * Retorna os prazos importantes de uma IN.
 * @param {string} id
 * @returns {Array}
 */
export function getPrazosIN(id) {
  const in_ = getIN(id)
  return in_?.prazosImportantes || []
}

/**
 * Metadados deste repositório.
 */
export const META_INSTRUCOES_NORMATIVAS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalINs:     Object.keys(INSTRUCOES_NORMATIVAS).length,
  atualizadaEm: '2026-07-08',
  observacao:   'Repositório contém as INs mais relevantes para os motores do FiscalTrib. ' +
                'INs revogadas são mantidas para referência histórica e processos em curso.',
}