/**
 * portarias_pgfn.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de Portarias da Procuradoria-Geral da Fazenda Nacional.
 *
 * As Portarias da PGFN regulamentam:
 * — Transação tributária (individual e por adesão)
 * — Parcelamentos de dívida ativa
 * — Procedimentos de regularização fiscal
 * — Critérios de cobrança e inscrição em dívida ativa
 * — CAPAG — Capacidade de Pagamento do contribuinte
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE PORTARIAS PGFN
// ─────────────────────────────────────────────────────────────

export const PORTARIAS_PGFN = {

  // ── TRANSAÇÃO TRIBUTÁRIA — PORTARIA PRINCIPAL ─────────────────────

  PGFN_6757_2022: {
    numero:        'Portaria PGFN 6.757/2022',
    tipo:          'PORTARIA_PGFN',
    data:          '2022-07-29',
    ementa:        'Regulamenta os requisitos e as condições necessários à realização de transação resolutiva de litígio relativo à cobrança de créditos da Fazenda Nacional.',
    vigente:       true,
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA', 'CAPAG'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Modalidades de transação — por proposta individual e por adesão.' },
      { artigo: 'Art. 3º',  descricao: 'Concessões permitidas — descontos sobre multas, juros e encargos.' },
      { artigo: 'Art. 4º',  descricao: 'Limites de desconto conforme CAPAG do contribuinte.' },
      { artigo: 'Art. 8º',  descricao: 'Entrada mínima e número máximo de parcelas.' },
      { artigo: 'Art. 11º', descricao: 'Uso de créditos fiscais e precatórios para amortização.' },
      { artigo: 'Art. 14º', descricao: 'Rescisão da transação por inadimplemento.' },
      { artigo: 'Art. 18º', descricao: 'Vedações — débitos não passíveis de transação.' },
    ],
    aplicacaoFiscalTrib: 'Regulamenta a transação tributária com a PGFN. Motor de Transação utiliza esta portaria para calcular descontos e orientar adesão.',
    tabelaDescontos: [
      { capag: 'A', descricao: 'Capacidade de pagamento alta',    descontoMax: 0,   entradaMin: 0.05, parcelas: 60  },
      { capag: 'B', descricao: 'Capacidade de pagamento média',   descontoMax: 0.30, entradaMin: 0.05, parcelas: 84  },
      { capag: 'C', descricao: 'Capacidade de pagamento baixa',   descontoMax: 0.50, entradaMin: 0.05, parcelas: 120 },
      { capag: 'D', descricao: 'Capacidade de pagamento mínima',  descontoMax: 0.65, entradaMin: 0.05, parcelas: 145 },
    ],
    obs: 'Descontos aplicam-se sobre multas, juros e encargos. O principal do débito não é descontado.',
  },

  // ── TRANSAÇÃO POR ADESÃO — EDITAIS GERAIS ────────────────────────

  PGFN_1122_2023: {
    numero:        'Portaria PGFN 1.122/2023',
    tipo:          'PORTARIA_PGFN',
    data:          '2023-05-30',
    ementa:        'Estabelece procedimentos para a transação por proposta da PGFN — Transação Individual.',
    vigente:       true,
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Transação individual — para débitos acima de R$ 10 milhões.' },
      { artigo: 'Art. 5º', descricao: 'Documentação necessária para proposta de transação individual.' },
      { artigo: 'Art. 7º', descricao: 'Prazo de análise pela PGFN — 90 dias.' },
    ],
    aplicacaoFiscalTrib: 'Transação individual para grandes devedores. Utilizada pelo Motor de Transação para casos com débitos acima de R$ 10 milhões.',
    limiteDebito: 10000000,
  },

  // ── INSCRIÇÃO EM DÍVIDA ATIVA ─────────────────────────────────────

  PGFN_396_2016: {
    numero:        'Portaria PGFN 396/2016',
    tipo:          'PORTARIA_PGFN',
    data:          '2016-09-01',
    ementa:        'Regulamenta o procedimento administrativo de reconhecimento da legitimidade de crédito tributário objeto de contestação judicial ou administrativa.',
    vigente:       true,
    motores:       ['DIVIDA_ATIVA', 'PRESCRICAO'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Procedimento de dispensa de contestação pela PGFN em casos com jurisprudência consolidada.' },
      { artigo: 'Art. 3º', descricao: 'Lista de teses em que a PGFN não contesta — incluindo Tema 69 STF.' },
    ],
    aplicacaoFiscalTrib: 'Define quando a PGFN não contestará determinadas teses. Aumenta o grau de confiança do Motor de Exclusão ICMS (Tema 69).',
  },

  // ── CAPAG — CAPACIDADE DE PAGAMENTO ──────────────────────────────

  PGFN_33_2018: {
    numero:        'Portaria PGFN 33/2018',
    tipo:          'PORTARIA_PGFN',
    data:          '2018-02-08',
    ementa:        'Regulamenta o Cadastro Informativo dos Créditos não Quitados de Órgãos e Entidades Federais — CADIN e define os critérios de classificação da capacidade de pagamento do contribuinte (CAPAG).',
    vigente:       true,
    motores:       ['CAPAG', 'TRANSACAO', 'DIVIDA_ATIVA'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Define CAPAG como indicador de capacidade de pagamento do contribuinte.' },
      { artigo: 'Art. 5º',  descricao: 'Metodologia de cálculo do CAPAG — patrimônio, receita e dívida.' },
      { artigo: 'Art. 8º',  descricao: 'Classificação A, B, C ou D conforme capacidade de pagamento.' },
      { artigo: 'Art. 12º', descricao: 'Impacto do CAPAG nos descontos e condições da transação.' },
    ],
    aplicacaoFiscalTrib: 'Define metodologia do CAPAG. Motor de CAPAG utiliza esta portaria para calcular e classificar a capacidade de pagamento do contribuinte.',
    metodologiaCAP: {
      indicadores: [
        { nome: 'Endividamento',    peso: 0.40, descricao: 'Relação entre dívida inscrita e patrimônio líquido' },
        { nome: 'Liquidez',         peso: 0.30, descricao: 'Capacidade de pagamento no curto prazo' },
        { nome: 'Receita',          peso: 0.30, descricao: 'Evolução da receita nos últimos 12 meses' },
      ],
      classificacao: [
        { classe: 'A', pontuacao: '80 a 100', descricao: 'Alta capacidade — sem desconto na transação' },
        { classe: 'B', pontuacao: '60 a 79',  descricao: 'Média capacidade — desconto moderado' },
        { classe: 'C', pontuacao: '40 a 59',  descricao: 'Baixa capacidade — desconto significativo' },
        { classe: 'D', pontuacao: '0 a 39',   descricao: 'Mínima capacidade — desconto máximo de 65%' },
      ],
    },
  },

  // ── REGULARIDADE FISCAL ───────────────────────────────────────────

  PGFN_1347_2007: {
    numero:        'Portaria PGFN 1.347/2007',
    tipo:          'PORTARIA_PGFN',
    data:          '2007-09-14',
    ementa:        'Regulamenta a emissão da Certidão de Regularidade Fiscal perante a PGFN — CND e CPEND.',
    vigente:       true,
    motores:       ['DIVIDA_ATIVA', 'CAPAG'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'CND — Certidão Negativa de Débitos. Emitida quando não há débitos inscritos.' },
      { artigo: 'Art. 3º', descricao: 'CPEND — Certidão Positiva com Efeitos de Negativa. Débitos com exigibilidade suspensa.' },
      { artigo: 'Art. 5º', descricao: 'Validade das certidões — 180 dias.' },
    ],
    aplicacaoFiscalTrib: 'Define CND e CPEND. Motor de Dívida Ativa avalia a situação do contribuinte perante esses documentos.',
    tiposCertidao: [
      { sigla: 'CND',   nome: 'Certidão Negativa de Débitos',                  condicao: 'Sem débitos inscritos em dívida ativa',           validade: '180 dias' },
      { sigla: 'CPEND', nome: 'Certidão Positiva com Efeitos de Negativa',     condicao: 'Débitos com exigibilidade suspensa ou garantidos', validade: '180 dias' },
      { sigla: 'CPD',   nome: 'Certidão Positiva de Débitos',                  condicao: 'Débitos em cobrança sem suspensão',                validade: 'Não emitida' },
    ],
  },

  // ── COBRANÇA ADMINISTRATIVA ───────────────────────────────────────

  PGFN_948_2017: {
    numero:        'Portaria PGFN 948/2017',
    tipo:          'PORTARIA_PGFN',
    data:          '2017-08-15',
    ementa:        'Regulamenta o procedimento de cobrança administrativa de débitos inscritos em dívida ativa da União.',
    vigente:       true,
    motores:       ['DIVIDA_ATIVA', 'PRESCRICAO'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Cobrança administrativa antes do ajuizamento da execução fiscal.' },
      { artigo: 'Art. 3º', descricao: 'Notificação do devedor — prazo de 30 dias para regularização.' },
      { artigo: 'Art. 7º', descricao: 'Protesto extrajudicial de certidões de dívida ativa.' },
      { artigo: 'Art. 9º', descricao: 'Encaminhamento para execução fiscal após cobrança administrativa.' },
    ],
    aplicacaoFiscalTrib: 'Define o fluxo de cobrança da PGFN. Motor de Dívida Ativa utiliza para identificar em qual fase de cobrança o contribuinte se encontra.',
    fasesCobranca: [
      { ordem: 1, fase: 'Inscrição em Dívida Ativa',       prazo: 'Após esgotamento administrativo' },
      { ordem: 2, fase: 'Notificação administrativa',       prazo: '30 dias para regularização' },
      { ordem: 3, fase: 'Protesto extrajudicial',           prazo: 'Após notificação sem pagamento' },
      { ordem: 4, fase: 'Ajuizamento execução fiscal',      prazo: 'Decisão da PGFN' },
      { ordem: 5, fase: 'Citação do executado',             prazo: '5 dias para pagar ou nomear bens' },
      { ordem: 6, fase: 'Penhora e avaliação de bens',      prazo: 'Após não pagamento na citação' },
      { ordem: 7, fase: 'Leilão judicial',                  prazo: 'Após penhora e avaliação' },
    ],
  },

  // ── PARCELAMENTO ESPECIAL — PGFN ─────────────────────────────────

  PGFN_742_2021: {
    numero:        'Portaria PGFN 742/2021',
    tipo:          'PORTARIA_PGFN',
    data:          '2021-04-16',
    ementa:        'Estabelece o programa de parcelamento e transação especial para microempresas e empresas de pequeno porte — PERT-SN.',
    vigente:       true,
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Parcelamento especial para ME e EPP com débitos de Simples Nacional.' },
      { artigo: 'Art. 3º', descricao: 'Descontos de até 100% de multas e juros para débitos irrecuperáveis.' },
      { artigo: 'Art. 5º', descricao: 'Entrada mínima de 1% do valor total consolidado.' },
    ],
    aplicacaoFiscalTrib: 'Parcelamento especial para Simples Nacional. Motor de Transação verifica elegibilidade para este programa.',
    condicoes: {
      publicoAlvo:     'Microempresas e Empresas de Pequeno Porte optantes pelo Simples Nacional',
      descontoMaximo:  '100% de multas, juros e encargos para dívidas irrecuperáveis',
      entradaMinima:   '1% do valor total consolidado',
      parcelasMaximas: 145,
    },
  },

  // ── SUSPENSÃO DE EXIGIBILIDADE ────────────────────────────────────

  PGFN_2382_2021: {
    numero:        'Portaria PGFN 2.382/2021',
    tipo:          'PORTARIA_PGFN',
    data:          '2021-10-07',
    ementa:        'Regulamenta as hipóteses de suspensão da exigibilidade do crédito tributário inscrito em dívida ativa da União.',
    vigente:       true,
    motores:       ['DIVIDA_ATIVA', 'PRESCRICAO', 'TRANSACAO'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Hipóteses de suspensão — moratória, parcelamento, recursos, liminares.' },
      { artigo: 'Art. 3º', descricao: 'Efeito da suspensão — impede ajuizamento e permite emissão de CPEND.' },
      { artigo: 'Art. 5º', descricao: 'Suspensão por adesão à transação tributária.' },
    ],
    aplicacaoFiscalTrib: 'Define quando a exigibilidade é suspensa. Motor de Dívida Ativa usa para classificar a situação atual do débito do contribuinte.',
    hipotesesSuspensao: [
      'Moratória concedida por lei',
      'Depósito integral do valor em discussão',
      'Impugnação ou recurso administrativo',
      'Liminar em mandado de segurança',
      'Tutela antecipada em ação judicial',
      'Adesão à transação tributária',
      'Parcelamento deferido',
    ],
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma portaria pelo seu identificador interno.
 * @param {string} id - ex: 'PGFN_6757_2022'
 * @returns {object|null}
 */
export function getPortariaPGFN(id) {
  return PORTARIAS_PGFN[id] || null
}

/**
 * Retorna uma portaria pelo seu número.
 * @param {string} numero - ex: 'Portaria PGFN 6.757/2022'
 * @returns {object|null}
 */
export function getPortariaPorNumero(numero) {
  return Object.values(PORTARIAS_PGFN).find(p => p.numero === numero) || null
}

/**
 * Retorna todas as portarias aplicáveis a um motor.
 * @param {string} motor - ex: 'TRANSACAO'
 * @returns {Array}
 */
export function getPortariasPorMotor(motor) {
  return Object.values(PORTARIAS_PGFN).filter(p => p.motores?.includes(motor))
}

/**
 * Retorna a tabela de descontos da transação tributária por CAPAG.
 * @returns {Array}
 */
export function getTabelaDescontosTransacao() {
  return PORTARIAS_PGFN.PGFN_6757_2022?.tabelaDescontos || []
}

/**
 * Retorna o desconto máximo para um CAPAG específico.
 * @param {string} capag - 'A', 'B', 'C' ou 'D'
 * @returns {object|null}
 */
export function getDescontoPorCAP(capag) {
  const tabela = getTabelaDescontosTransacao()
  return tabela.find(t => t.capag === capag) || null
}

/**
 * Retorna as fases de cobrança da PGFN em ordem.
 * @returns {Array}
 */
export function getFasesCobranca() {
  return PORTARIAS_PGFN.PGFN_948_2017?.fasesCobranca || []
}

/**
 * Retorna as hipóteses de suspensão da exigibilidade.
 * @returns {Array}
 */
export function getHipotesesSuspensao() {
  return PORTARIAS_PGFN.PGFN_2382_2021?.hipotesesSuspensao || []
}

/**
 * Retorna os tipos de certidão fiscal disponíveis.
 * @returns {Array}
 */
export function getTiposCertidao() {
  return PORTARIAS_PGFN.PGFN_1347_2007?.tiposCertidao || []
}

/**
 * Metadados deste repositório.
 */
export const META_PORTARIAS_PGFN = {
  versaoBase:      VERSAO_ATUAL.codigo,
  totalPortarias:  Object.keys(PORTARIAS_PGFN).length,
  atualizadaEm:    '2026-07-08',
  observacao:      'Portarias PGFN são atualizadas com frequência. ' +
                   'Verificar portal da PGFN (pgfn.fazenda.gov.br) para versões mais recentes. ' +
                   'Editais de transação por adesão são publicados separadamente — ver editais_pgfn.js.',
}