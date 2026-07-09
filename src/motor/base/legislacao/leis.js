/**
 * leis.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de leis federais relevantes para os motores tributários.
 *
 * Cada lei contém:
 * — identificação completa
 * — ementa
 * — dispositivos relevantes para o FiscalTrib
 * — aplicação prática nos motores
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE LEIS
// ─────────────────────────────────────────────────────────────

export const LEIS = {

  // ── PIS/COFINS — REGIME CUMULATIVO ───────────────────────────────

  L9718_1998: {
    numero:        '9.718/1998',
    tipo:          'LEI_ORDINARIA',
    data:          '1998-11-27',
    ementa:        'Altera a legislação tributária federal. Define base de cálculo do PIS/COFINS no regime cumulativo.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'EXCLUSAO_ICMS', 'ICMS_ST'],
    dispositivos: [
      { artigo: 'Art. 2º',  descricao: 'Alíquotas de PIS (0,65%) e COFINS (3%) no regime cumulativo.' },
      { artigo: 'Art. 3º',  descricao: 'Define receita bruta como base de cálculo do PIS/COFINS.' },
      { artigo: 'Art. 4º',  descricao: 'Substituição tributária de PIS/COFINS para combustíveis.' },
    ],
    aplicacaoFiscalTrib: 'Base do regime cumulativo. Utilizada nos motores de Lucro Presumido e Simples Nacional para definir alíquotas e base de cálculo.',
  },

  // ── PIS — REGIME NÃO CUMULATIVO ──────────────────────────────────

  L10637_2002: {
    numero:        '10.637/2002',
    tipo:          'LEI_ORDINARIA',
    data:          '2002-12-30',
    ementa:        'Dispõe sobre a não cumulatividade na cobrança da contribuição para o PIS/Pasep.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'EXCLUSAO_ICMS', 'ICMS_ST'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Institui o regime não cumulativo do PIS — alíquota de 1,65%.' },
      { artigo: 'Art. 2º',  descricao: 'Define base de cálculo do PIS não cumulativo.' },
      { artigo: 'Art. 3º',  descricao: 'Lista os créditos permitidos no regime não cumulativo.' },
      { artigo: 'Art. 4º',  descricao: 'Produtos sujeitos ao regime monofásico de PIS.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento dos créditos de PIS no Lucro Real. Motor de Exclusão ICMS utiliza base de cálculo definida aqui.',
  },

  // ── COFINS — REGIME NÃO CUMULATIVO ───────────────────────────────

  L10833_2003: {
    numero:        '10.833/2003',
    tipo:          'LEI_ORDINARIA',
    data:          '2003-12-29',
    ementa:        'Altera a legislação tributária federal. Institui o regime não cumulativo da COFINS.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'EXCLUSAO_ICMS', 'ICMS_ST'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Institui o regime não cumulativo da COFINS — alíquota de 7,6%.' },
      { artigo: 'Art. 2º',  descricao: 'Define base de cálculo da COFINS não cumulativa.' },
      { artigo: 'Art. 3º',  descricao: 'Lista os créditos permitidos no regime não cumulativo.' },
      { artigo: 'Art. 4º',  descricao: 'Produtos sujeitos ao regime monofásico de COFINS.' },
    ],
    aplicacaoFiscalTrib: 'Principal lei do regime não cumulativo da COFINS. Utilizada pelos motores de Lucro Real e Exclusão ICMS.',
  },

  // ── MONOFÁSICOS — FARMACÊUTICOS E COSMÉTICOS ─────────────────────

  L10147_2000: {
    numero:        '10.147/2000',
    tipo:          'LEI_ORDINARIA',
    data:          '2000-12-21',
    ementa:        'Dispõe sobre a incidência do PIS/COFINS nas operações de venda dos produtos farmacêuticos e de higiene pessoal.',
    vigente:       true,
    motores:       ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Institui o regime monofásico de PIS/COFINS para produtos farmacêuticos (Lista Positiva) com alíquotas diferenciadas.' },
      { artigo: 'Art. 2º',  descricao: 'Alíquota zero de PIS/COFINS para revendedores de produtos farmacêuticos monofásicos.' },
      { artigo: 'Art. 3º',  descricao: 'Produtos da Lista Negativa — alíquota zero em toda a cadeia.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento central do Motor de Monofásicos para farmacêuticos e cosméticos. Define quem recolhe e qual alíquota.',
    listasVinculadas:    ['Lista Positiva', 'Lista Negativa', 'Lista Neutra'],
  },

  // ── MONOFÁSICOS — COMBUSTÍVEIS ────────────────────────────────────

  L10336_2001: {
    numero:        '10.336/2001',
    tipo:          'LEI_ORDINARIA',
    data:          '2001-12-19',
    ementa:        'Institui a Contribuição de Intervenção no Domínio Econômico (CIDE-Combustíveis) e dispõe sobre o regime monofásico de PIS/COFINS para combustíveis.',
    vigente:       true,
    motores:       ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 4º',  descricao: 'Institui o regime monofásico de PIS/COFINS para gasolina, diesel, GLP e QAV.' },
      { artigo: 'Art. 5º',  descricao: 'Define as alíquotas de PIS/COFINS por litro para combustíveis.' },
      { artigo: 'Art. 6º',  descricao: 'Alíquota zero para revendedores de combustíveis.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento do Motor de Monofásicos para combustíveis. Revendedores têm alíquota zero de PIS/COFINS.',
  },

  // ── MONOFÁSICOS — BEBIDAS ────────────────────────────────────────

  L13097_2015: {
    numero:        '13.097/2015',
    tipo:          'LEI_ORDINARIA',
    data:          '2015-01-19',
    ementa:        'Institui o regime de tributação monofásica para cervejas, refrigerantes, águas e outras bebidas.',
    vigente:       true,
    motores:       ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 14º', descricao: 'Institui o regime monofásico de PIS/COFINS para bebidas frias.' },
      { artigo: 'Art. 15º', descricao: 'Define alíquotas por litro para fabricantes de bebidas.' },
      { artigo: 'Art. 16º', descricao: 'Alíquota zero de PIS/COFINS para revendedores de bebidas.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento do Motor de Monofásicos para bebidas. Revendedores de cervejas, refrigerantes e águas têm alíquota zero.',
  },

  // ── MONOFÁSICOS — CEREAIS ─────────────────────────────────────────

  L10925_2004: {
    numero:        '10.925/2004',
    tipo:          'LEI_ORDINARIA',
    data:          '2004-07-23',
    ementa:        'Reduz as alíquotas do PIS/COFINS e da CSLL nas exportações de produtos de origem animal ou vegetal. Institui alíquota zero para cereais.',
    vigente:       true,
    motores:       ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Alíquota zero de PIS/COFINS para cereais (trigo, arroz, milho, soja e outros).' },
      { artigo: 'Art. 2º',  descricao: 'Alíquota zero para carnes, leite, ovos e outros alimentos básicos.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento da alíquota zero de PIS/COFINS para cereais. Utilizado no Motor de Monofásicos categoria CEREAIS.',
  },

  // ── SIMPLES NACIONAL ─────────────────────────────────────────────

  LC123_2006: {
    numero:        '123/2006',
    tipo:          'LEI_COMPLEMENTAR',
    data:          '2006-12-14',
    ementa:        'Institui o Estatuto Nacional da Microempresa e da Empresa de Pequeno Porte — Simples Nacional.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'ICMS_ST', 'FATOR_R'],
    dispositivos: [
      { artigo: 'Art. 2º',  descricao: 'Define microempresa e empresa de pequeno porte.' },
      { artigo: 'Art. 13º', descricao: 'Define tributos abrangidos pelo Simples Nacional e exclusões.' },
      { artigo: 'Art. 18º', descricao: 'Define os anexos e alíquotas progressivas do Simples.' },
      { artigo: 'Art. 18-A',descricao: 'MEI — Microempreendedor Individual.' },
      { artigo: 'Art. 23º', descricao: 'Vedação de crédito para adquirentes de optantes pelo Simples.' },
    ],
    aplicacaoFiscalTrib: 'Lei base do Simples Nacional. Utilizada pelos motores de Monofásicos, ICMS-ST e Fator R para identificar o regime e calcular benefícios.',
    anexos: [
      { numero: 'I',   descricao: 'Comércio — alíquotas de 4% a 19%' },
      { numero: 'II',  descricao: 'Indústria — alíquotas de 4,5% a 30%' },
      { numero: 'III', descricao: 'Serviços (menor carga) — 6% a 33%' },
      { numero: 'IV',  descricao: 'Serviços (construção civil) — 4,5% a 30%' },
      { numero: 'V',   descricao: 'Serviços (maior carga) — 15,5% a 30,5%' },
    ],
  },

  // ── ICMS-ST ──────────────────────────────────────────────────────

  LC87_1996: {
    numero:        '87/1996',
    tipo:          'LEI_COMPLEMENTAR',
    data:          '1996-09-13',
    ementa:        'Dispõe sobre o imposto dos Estados e do Distrito Federal sobre operações relativas à circulação de mercadorias — Lei Kandir.',
    vigente:       true,
    motores:       ['ICMS_ST', 'EXCLUSAO_ICMS'],
    dispositivos: [
      { artigo: 'Art. 6º',  descricao: 'Autoriza os estados a instituir a substituição tributária do ICMS.' },
      { artigo: 'Art. 8º',  descricao: 'Define a base de cálculo do ICMS-ST.' },
      { artigo: 'Art. 10º', descricao: 'Direito à restituição do ICMS-ST quando o fato gerador não se realizar.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento constitucional do ICMS-ST. Utilizada pelo Motor de ICMS-ST para validar o direito à restituição.',
  },

  // ── DÍVIDA ATIVA E PGFN ──────────────────────────────────────────

  L6830_1980: {
    numero:        '6.830/1980',
    tipo:          'LEI_ORDINARIA',
    data:          '1980-09-22',
    ementa:        'Lei de Execução Fiscal — dispõe sobre a cobrança judicial da dívida ativa da Fazenda Pública.',
    vigente:       true,
    motores:       ['DIVIDA_ATIVA', 'PRESCRICAO', 'DECADENCIA'],
    dispositivos: [
      { artigo: 'Art. 2º',  descricao: 'Define dívida ativa da Fazenda Pública.' },
      { artigo: 'Art. 8º',  descricao: 'Citação do executado — marco para contagem de prazo.' },
      { artigo: 'Art. 40º', descricao: 'Suspensão da execução — prescrição intercorrente.' },
    ],
    aplicacaoFiscalTrib: 'Lei base para análise de dívida ativa. Utilizada pelos motores de Dívida Ativa, Prescrição e Decadência.',
  },

  L13988_2020: {
    numero:        '13.988/2020',
    tipo:          'LEI_ORDINARIA',
    data:          '2020-04-14',
    ementa:        'Estabelece os requisitos e as condições para a realização de transação em matéria tributária — Lei da Transação Tributária.',
    vigente:       true,
    motores:       ['TRANSACAO', 'DIVIDA_ATIVA'],
    dispositivos: [
      { artigo: 'Art. 1º',  descricao: 'Autoriza a transação em matéria tributária.' },
      { artigo: 'Art. 10º', descricao: 'Modalidades de transação — individual e por adesão.' },
      { artigo: 'Art. 11º', descricao: 'Concessões permitidas — descontos, parcelamento, diferimento.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento legal do Motor de Transação Tributária. Autoriza descontos de até 65% em multas e juros.',
  },

  // ── CTN — PRESCRIÇÃO E DECADÊNCIA ────────────────────────────────

  CTN_L5172_1966: {
    numero:        '5.172/1966',
    tipo:          'LEI_ORDINARIA',
    data:          '1966-10-25',
    ementa:        'Código Tributário Nacional — CTN. Dispõe sobre o Sistema Tributário Nacional e institui normas gerais de direito tributário.',
    vigente:       true,
    motores:       ['PRESCRICAO', 'DECADENCIA', 'DIVIDA_ATIVA'],
    dispositivos: [
      { artigo: 'Art. 150º', descricao: 'Lançamento por homologação — regra geral para tributos declarados pelo contribuinte.' },
      { artigo: 'Art. 156º', descricao: 'Causas de extinção do crédito tributário.' },
      { artigo: 'Art. 168º', descricao: 'Prazo de 5 anos para restituição de tributo pago indevidamente.' },
      { artigo: 'Art. 173º', descricao: 'Prazo decadencial de 5 anos para constituição do crédito tributário.' },
      { artigo: 'Art. 174º', descricao: 'Prazo prescricional de 5 anos para cobrança do crédito tributário.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento dos motores de Prescrição e Decadência. Define os prazos de 5 anos para constituição, cobrança e restituição de tributos.',
  },

  // ── IRPJ E CSLL ──────────────────────────────────────────────────

  L9249_1995: {
    numero:        '9.249/1995',
    tipo:          'LEI_ORDINARIA',
    data:          '1995-12-26',
    ementa:        'Altera a legislação do IRPJ e da CSLL. Institui os Juros sobre Capital Próprio (JCP).',
    vigente:       true,
    motores:       ['IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Art. 9º',  descricao: 'Institui a dedutibilidade dos Juros sobre Capital Próprio (JCP) na base do IRPJ e CSLL.' },
      { artigo: 'Art. 15º', descricao: 'Percentuais de presunção do Lucro Presumido para IRPJ.' },
      { artigo: 'Art. 16º', descricao: 'Percentuais de presunção do Lucro Presumido para CSLL.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento do Motor de IRPJ/CSLL. Define percentuais de presunção e possibilidade de dedução de JCP.',
  },

  // ── INSS ─────────────────────────────────────────────────────────

  L8212_1991: {
    numero:        '8.212/1991',
    tipo:          'LEI_ORDINARIA',
    data:          '1991-07-24',
    ementa:        'Dispõe sobre a organização da Seguridade Social, institui Plano de Custeio e dá outras providências.',
    vigente:       true,
    motores:       ['INSS'],
    dispositivos: [
      { artigo: 'Art. 22º', descricao: 'Define contribuições previdenciárias do empregador sobre a folha.' },
      { artigo: 'Art. 28º', descricao: 'Define salário de contribuição — base de cálculo do INSS.' },
      { artigo: 'Art. 43º', descricao: 'Prazo decadencial para constituição de crédito previdenciário.' },
    ],
    aplicacaoFiscalTrib: 'Fundamento do Motor de INSS. Define o que compõe (e o que não compõe) o salário de contribuição.',
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma lei pelo seu identificador interno.
 * @param {string} id - ex: 'L10147_2000'
 * @returns {object|null}
 */
export function getLei(id) {
  return LEIS[id] || null
}

/**
 * Retorna uma lei pelo seu número.
 * @param {string} numero - ex: '10.147/2000'
 * @returns {object|null}
 */
export function getLeiPorNumero(numero) {
  return Object.values(LEIS).find(l => l.numero === numero) || null
}

/**
 * Retorna todas as leis aplicáveis a um motor.
 * @param {string} motor - ex: 'MONOFASICOS'
 * @returns {Array}
 */
export function getLeisPorMotor(motor) {
  return Object.values(LEIS).filter(l => l.motores?.includes(motor))
}

/**
 * Retorna todas as leis vigentes.
 * @returns {Array}
 */
export function getLeisVigentes() {
  return Object.values(LEIS).filter(l => l.vigente === true)
}

/**
 * Metadados deste repositório.
 */
export const META_LEIS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalLeis:    Object.keys(LEIS).length,
  atualizadaEm: '2026-07-08',
  observacao:   'Repositório contém as leis mais relevantes para os motores do FiscalTrib. ' +
                'Dispositivos listados são os diretamente aplicáveis — não é transcrição integral.',
}