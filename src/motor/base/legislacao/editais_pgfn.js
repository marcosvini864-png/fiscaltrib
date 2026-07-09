/**
 * editais_pgfn.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de Editais de Transação Tributária da PGFN.
 *
 * Os Editais de Transação por Adesão são publicados periodicamente
 * pela PGFN e permitem que contribuintes com débitos inscritos em
 * dívida ativa adiram a condições especiais de pagamento com
 * descontos sobre multas, juros e encargos legais.
 *
 * Tipos de edital:
 * — Edital Geral: aberto a todos os contribuintes com dívida ativa
 * — Edital Temático: foca em determinado setor ou tipo de débito
 * — Edital de Pequeno Valor: para débitos até determinado limite
 * — Edital de Dívida Irrecuperável: para contribuintes em situação crítica
 *
 * ATENÇÃO: Editais têm prazo de adesão. Sempre verificar no portal
 * da PGFN (pgfn.fazenda.gov.br) se o edital ainda está vigente.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// TIPOS DE EDITAL
// ─────────────────────────────────────────────────────────────

export const TIPO_EDITAL = {
  GERAL:             'GERAL',
  TEMATICO:          'TEMATICO',
  PEQUENO_VALOR:     'PEQUENO_VALOR',
  IRRECUPERAVEL:     'IRRECUPERAVEL',
  ESPECIAL:          'ESPECIAL',
  CONTENCIOSO:       'CONTENCIOSO',
}

// ─────────────────────────────────────────────────────────────
// STATUS DO EDITAL
// ─────────────────────────────────────────────────────────────

export const STATUS_EDITAL = {
  VIGENTE:   'VIGENTE',    // prazo de adesão aberto
  ENCERRADO: 'ENCERRADO',  // prazo encerrado
  SUSPENSO:  'SUSPENSO',   // temporariamente suspenso
  PREVISTO:  'PREVISTO',   // anunciado mas ainda não publicado
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE EDITAIS
// ─────────────────────────────────────────────────────────────

export const EDITAIS_PGFN = {

  // ── EDITAL TRANSAÇÃO EXCEPCIONAL — COVID ─────────────────────────

  EDITAL_09_2020: {
    numero:        'Edital PGFN 9/2020',
    tipo:          TIPO_EDITAL.ESPECIAL,
    status:        STATUS_EDITAL.ENCERRADO,
    dataPublicacao: '2020-06-23',
    dataEncerramento: '2020-09-30',
    ementa:        'Transação Excepcional no âmbito da PGFN — medida emergencial em razão dos efeitos da pandemia de Covid-19.',
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    publicoAlvo:   'Contribuintes com débitos inscritos em dívida ativa afetados pela pandemia.',
    condicoes: {
      descontoMaximo:  '100% de multas, juros e encargos para dívidas irrecuperáveis',
      entradaMinima:   '1% do valor total em 3 parcelas mensais e sucessivas',
      parcelasMaximas: 133,
      limiteDebito:    null,
    },
    aplicacaoFiscalTrib: 'Edital encerrado — referência histórica. Motor de Transação cita como exemplo de condições especiais obtidas no passado.',
    obs: 'Encerrado. Verificar editais vigentes no portal PGFN.',
  },

  // ── EDITAL CONTENCIOSO DE PEQUENO VALOR ──────────────────────────

  EDITAL_16_2021: {
    numero:        'Edital PGFN 16/2021',
    tipo:          TIPO_EDITAL.PEQUENO_VALOR,
    status:        STATUS_EDITAL.ENCERRADO,
    dataPublicacao: '2021-10-27',
    dataEncerramento: '2021-12-31',
    ementa:        'Transação por adesão no contencioso tributário de pequeno valor — débitos de até 60 salários mínimos.',
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    publicoAlvo:   'Contribuintes com débitos inscritos de até 60 salários mínimos.',
    condicoes: {
      descontoMaximo:  '50% sobre o valor total do débito',
      entradaMinima:   null,
      parcelasMaximas: 60,
      limiteDebito:    60,
      unidadeLimite:   'salários mínimos',
    },
    aplicacaoFiscalTrib: 'Referência para pequenos devedores. Motor de Transação verifica disponibilidade de edital similar vigente.',
    obs: 'Encerrado. Débitos de pequeno valor frequentemente têm editais específicos — verificar portal PGFN.',
  },

  // ── EDITAL TRANSAÇÃO GERAL — 2022 ────────────────────────────────

  EDITAL_10_2022: {
    numero:        'Edital PGFN 10/2022',
    tipo:          TIPO_EDITAL.GERAL,
    status:        STATUS_EDITAL.ENCERRADO,
    dataPublicacao: '2022-07-29',
    dataEncerramento: '2022-10-28',
    ementa:        'Transação por adesão para débitos inscritos em dívida ativa da União — condições gerais.',
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA', 'CAPAG'],
    publicoAlvo:   'Todos os contribuintes com débitos inscritos em dívida ativa da União.',
    condicoes: {
      descontoMaximo:  '65% para contribuintes com CAPAG D',
      entradaMinima:   '5% do valor consolidado sem desconto',
      parcelasMaximas: 145,
      limiteDebito:    null,
    },
    tabelaCondicoes: [
      { capag: 'A', desconto: '0%',  entrada: '5%', parcelas: 60  },
      { capag: 'B', desconto: '30%', entrada: '5%', parcelas: 84  },
      { capag: 'C', desconto: '50%', entrada: '5%', parcelas: 120 },
      { capag: 'D', desconto: '65%', entrada: '5%', parcelas: 145 },
    ],
    aplicacaoFiscalTrib: 'Modelo padrão dos editais gerais. Motor de Transação usa esta estrutura como referência para calcular condições de adesão.',
    obs: 'Encerrado. Editais gerais são publicados periodicamente — verificar portal PGFN.',
  },

  // ── EDITAL CONTENCIOSO ADMINISTRATIVO — 2023 ─────────────────────

  EDITAL_04_2023: {
    numero:        'Edital PGFN 4/2023',
    tipo:          TIPO_EDITAL.CONTENCIOSO,
    status:        STATUS_EDITAL.ENCERRADO,
    dataPublicacao: '2023-03-31',
    dataEncerramento: '2023-06-30',
    ementa:        'Transação no contencioso tributário de relevante e disseminada controvérsia jurídica — teses tributárias em discussão.',
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    publicoAlvo:   'Contribuintes com débitos relacionados a teses tributárias com jurisprudência desfavorável consolidada.',
    condicoes: {
      descontoMaximo:  '65% sobre multas e juros',
      entradaMinima:   '5% do valor consolidado',
      parcelasMaximas: 120,
      limiteDebito:    null,
    },
    tesesToransacionadas: [
      'CSLL — Inconstitucionalidade da alíquota majorada para instituições financeiras',
      'PIS/COFINS — Base de cálculo ampliada (Lei 9.718/1998)',
      'IRPJ/CSLL — Tributação de lucros no exterior',
    ],
    aplicacaoFiscalTrib: 'Transação de contencioso. Motor de Transação identifica teses passíveis de transação e orienta contribuinte sobre adesão.',
    obs: 'Encerrado. Novos editais de contencioso são publicados conforme surgem teses com jurisprudência desfavorável.',
  },

  // ── EDITAL DÍVIDA IRRECUPERÁVEL — REFERÊNCIA ─────────────────────

  EDITAL_IRRECUPERAVEL_REF: {
    numero:        'Edital PGFN — Dívida Irrecuperável (Referência)',
    tipo:          TIPO_EDITAL.IRRECUPERAVEL,
    status:        STATUS_EDITAL.ENCERRADO,
    dataPublicacao: '2022-01-01',
    dataEncerramento: '2022-12-31',
    ementa:        'Transação por adesão para contribuintes com débitos classificados como irrecuperáveis ou de difícil recuperação pela PGFN.',
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA', 'CAPAG'],
    publicoAlvo:   'Contribuintes com CAPAG D ou débitos classificados como irrecuperáveis.',
    condicoes: {
      descontoMaximo:  '100% sobre multas, juros e encargos',
      entradaMinima:   '1% do valor total em até 3 parcelas',
      parcelasMaximas: 145,
      limiteDebito:    null,
    },
    criteriosIrrecuperavel: [
      'Devedor em recuperação judicial ou falência',
      'Devedor com CAPAG D',
      'Débito com exigibilidade suspensa há mais de 10 anos',
      'Devedor pessoa física sem patrimônio identificado',
      'Microempresa ou EPP com receita inferior ao débito',
    ],
    aplicacaoFiscalTrib: 'Motor de CAPAG utiliza estes critérios para classificar o contribuinte e identificar elegibilidade ao desconto máximo.',
    obs: 'Editais de dívida irrecuperável são publicados periodicamente. Verificar portal PGFN para edital vigente.',
  },

  // ── EDITAL SIMPLES NACIONAL — REFERÊNCIA ─────────────────────────

  EDITAL_SN_REF: {
    numero:        'Edital PGFN — Simples Nacional (Referência)',
    tipo:          TIPO_EDITAL.TEMATICO,
    status:        STATUS_EDITAL.ENCERRADO,
    dataPublicacao: '2021-04-16',
    dataEncerramento: '2021-10-29',
    ementa:        'Transação por adesão para débitos inscritos em dívida ativa do Simples Nacional.',
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    publicoAlvo:   'Microempresas e Empresas de Pequeno Porte com débitos do Simples Nacional inscritos em dívida ativa.',
    condicoes: {
      descontoMaximo:  '100% sobre multas, juros e encargos para dívidas irrecuperáveis',
      entradaMinima:   '1% do valor total em 3 parcelas',
      parcelasMaximas: 55,
      limiteDebito:    null,
    },
    aplicacaoFiscalTrib: 'Referência para optantes do Simples Nacional. Motor de Transação verifica disponibilidade de edital similar para o regime.',
    obs: 'Encerrado. ME e EPP frequentemente têm editais temáticos — verificar portal PGFN.',
  },

  // ── EDITAL VIGENTE — PLACEHOLDER ─────────────────────────────────
  // Este registro deve ser atualizado sempre que um novo edital for publicado.

  EDITAL_VIGENTE_2026: {
    numero:        'Edital PGFN 2026 — A verificar',
    tipo:          TIPO_EDITAL.GERAL,
    status:        STATUS_EDITAL.PREVISTO,
    dataPublicacao: null,
    dataEncerramento: null,
    ementa:        'Edital de transação por adesão para 2026 — verificar publicação no portal PGFN.',
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    publicoAlvo:   'Todos os contribuintes com débitos inscritos em dívida ativa da União.',
    condicoes:     null,
    aplicacaoFiscalTrib: 'Placeholder para o edital vigente de 2026. Atualizar quando publicado.',
    urlVerificacao: 'https://www.pgfn.fazenda.gov.br/transacao',
    obs: 'ATUALIZAR: Verificar e substituir pelas condições do edital vigente publicado em 2026.',
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna um edital pelo seu identificador interno.
 * @param {string} id - ex: 'EDITAL_10_2022'
 * @returns {object|null}
 */
export function getEdital(id) {
  return EDITAIS_PGFN[id] || null
}

/**
 * Retorna todos os editais vigentes.
 * @returns {Array}
 */
export function getEditaisVigentes() {
  return Object.values(EDITAIS_PGFN).filter(e => e.status === STATUS_EDITAL.VIGENTE)
}

/**
 * Retorna todos os editais por tipo.
 * @param {string} tipo - TIPO_EDITAL
 * @returns {Array}
 */
export function getEditaisPorTipo(tipo) {
  return Object.values(EDITAIS_PGFN).filter(e => e.tipo === tipo)
}

/**
 * Retorna todos os editais aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getEditaisPorMotor(motor) {
  return Object.values(EDITAIS_PGFN).filter(e => e.motores?.includes(motor))
}

/**
 * Verifica se há edital vigente disponível.
 * @returns {boolean}
 */
export function temEditalVigente() {
  return getEditaisVigentes().length > 0
}

/**
 * Retorna as condições do edital mais recente vigente.
 * @returns {object|null}
 */
export function getCondicoesEditalVigente() {
  const vigentes = getEditaisVigentes()
  if (vigentes.length === 0) return null
  const mais_recente = vigentes.sort((a, b) =>
    new Date(b.dataPublicacao) - new Date(a.dataPublicacao)
  )[0]
  return mais_recente.condicoes || null
}

/**
 * Retorna os critérios para classificação como dívida irrecuperável.
 * @returns {Array}
 */
export function getCriteriosIrrecuperavel() {
  return EDITAIS_PGFN.EDITAL_IRRECUPERAVEL_REF?.criteriosIrrecuperavel || []
}

/**
 * Verifica se um contribuinte pode ser elegível ao edital
 * de dívida irrecuperável com base no CAPAG.
 * @param {string} capag - 'A', 'B', 'C' ou 'D'
 * @returns {boolean}
 */
export function isElegivelIrrecuperavel(capag) {
  return capag === 'D'
}

/**
 * Estima o desconto máximo disponível para um CAPAG.
 * Baseado no histórico de editais publicados.
 * @param {string} capag
 * @returns {{ descontoEstimado: number, fonte: string }}
 */
export function estimarDescontoPorCAP(capag) {
  const tabela = {
    A: { descontoEstimado: 0,    fonte: 'Histórico de editais — CAPAG A sem desconto' },
    B: { descontoEstimado: 0.30, fonte: 'Histórico de editais — CAPAG B até 30%' },
    C: { descontoEstimado: 0.50, fonte: 'Histórico de editais — CAPAG C até 50%' },
    D: { descontoEstimado: 0.65, fonte: 'Histórico de editais — CAPAG D até 65% (100% em editais especiais)' },
  }
  return tabela[capag] || { descontoEstimado: 0, fonte: 'CAPAG não identificado' }
}

/**
 * Metadados deste repositório.
 */
export const META_EDITAIS_PGFN = {
  versaoBase:     VERSAO_ATUAL.codigo,
  totalEditais:   Object.keys(EDITAIS_PGFN).length,
  editaisVigentes: getEditaisVigentes().length,
  atualizadaEm:   '2026-07-08',
  urlPortalPGFN:  'https://www.pgfn.fazenda.gov.br/transacao',
  observacao:     'Editais de transação têm prazo de adesão. ' +
                  'Sempre verificar no portal da PGFN se há edital vigente antes de orientar o contribuinte. ' +
                  'Atualizar EDITAL_VIGENTE_2026 quando novo edital for publicado.',
}