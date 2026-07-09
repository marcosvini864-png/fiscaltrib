/**
 * decretos.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de decretos federais relevantes para os motores tributários.
 *
 * Decretos regulamentam as leis tributárias e definem:
 * — alíquotas específicas
 * — prazos e condições
 * — tabelas e anexos
 * — regras operacionais
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE DECRETOS
// ─────────────────────────────────────────────────────────────

export const DECRETOS = {

  // ── REGULAMENTO DO IMPOSTO DE RENDA — RIR ────────────────────────

  D9580_2018: {
    numero:        '9.580/2018',
    tipo:          'DECRETO',
    data:          '2018-11-22',
    ementa:        'Regulamenta a tributação, a fiscalização, a arrecadação e a administração do Imposto sobre a Renda e Proventos de Qualquer Natureza — RIR/2018.',
    vigente:       true,
    motores:       ['IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Art. 215º', descricao: 'Percentuais de presunção do Lucro Presumido para IRPJ por atividade.' },
      { artigo: 'Art. 217º', descricao: 'Base de cálculo estimada mensal para IRPJ no Lucro Real.' },
      { artigo: 'Art. 355º', descricao: 'Dedutibilidade de despesas operacionais no Lucro Real.' },
      { artigo: 'Art. 388º', descricao: 'Juros sobre Capital Próprio — dedutibilidade e limites.' },
      { artigo: 'Art. 619º', descricao: 'Compensação de prejuízo fiscal — limite de 30% por período.' },
    ],
    aplicacaoFiscalTrib: 'Regulamento principal do IRPJ. Utilizado pelo Motor de IRPJ/CSLL para cálculo de base, presunções e deduções.',
  },

  // ── REGULAMENTO DO IPI — RIPI ─────────────────────────────────────

  D7212_2010: {
    numero:        '7.212/2010',
    tipo:          'DECRETO',
    data:          '2010-06-15',
    ementa:        'Regulamenta a cobrança, fiscalização, arrecadação e administração do Imposto sobre Produtos Industrializados — IPI.',
    vigente:       true,
    motores:       ['IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Art. 3º',   descricao: 'Define produto industrializado para fins de IPI.' },
      { artigo: 'Art. 35º',  descricao: 'Define contribuinte do IPI.' },
      { artigo: 'Art. 226º', descricao: 'Créditos de IPI sobre matérias-primas e insumos.' },
      { artigo: 'Art. 254º', descricao: 'Manutenção de créditos de IPI nas exportações.' },
    ],
    aplicacaoFiscalTrib: 'Regulamento do IPI. Utilizado para análise de créditos de IPI no Lucro Real e Lucro Presumido.',
  },

  // ── COMBUSTÍVEIS — CIDE ───────────────────────────────────────────

  D5060_2004: {
    numero:        '5.060/2004',
    tipo:          'DECRETO',
    data:          '2004-05-04',
    ementa:        'Reduz a zero as alíquotas da CIDE incidentes sobre a importação e comercialização de álcool etílico combustível.',
    vigente:       true,
    motores:       ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Alíquota zero da CIDE para etanol combustível.' },
    ],
    aplicacaoFiscalTrib: 'Confirma alíquota zero de CIDE para etanol. Utilizado pelo Motor de Monofásicos na análise de combustíveis.',
  },

  D8442_2015: {
    numero:        '8.442/2015',
    tipo:          'DECRETO',
    data:          '2015-04-29',
    ementa:        'Regulamenta as alíquotas de PIS/COFINS incidentes sobre a receita bruta auferida na venda de bebidas frias — regime ad rem.',
    vigente:       true,
    motores:       ['MONOFASICOS'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Define alíquotas por litro (ad rem) de PIS/COFINS para bebidas.' },
      { artigo: 'Art. 2º', descricao: 'Tabela de alíquotas por tipo de bebida.' },
      { artigo: 'Art. 3º', descricao: 'Alíquota zero para revendedores de bebidas monofásicas.' },
    ],
    aplicacaoFiscalTrib: 'Define alíquotas ad rem de PIS/COFINS para bebidas. Utilizado no Motor de Monofásicos categoria BEBIDAS.',
    tabelaAliquotas: [
      { produto: 'Água mineral', aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980 },
      { produto: 'Refrigerante', aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980 },
      { produto: 'Cerveja',      aliqPISLitro: 0.0368, aliqCOFINSLitro: 0.1700 },
      { produto: 'Chope',        aliqPISLitro: 0.0368, aliqCOFINSLitro: 0.1700 },
    ],
  },

  // ── SIMPLES NACIONAL ─────────────────────────────────────────────

  D6038_2007: {
    numero:        '6.038/2007',
    tipo:          'DECRETO',
    data:          '2007-02-07',
    ementa:        'Institui o Comitê Gestor do Simples Nacional — CGSN.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'ICMS_ST', 'FATOR_R'],
    dispositivos: [
      { artigo: 'Art. 1º', descricao: 'Institui o CGSN responsável por regulamentar o Simples Nacional.' },
    ],
    aplicacaoFiscalTrib: 'Base institucional do Simples Nacional. As resoluções do CGSN têm força de lei para optantes.',
  },

  // ── PREVIDÊNCIA — INSS ────────────────────────────────────────────

  D3048_1999: {
    numero:        '3.048/1999',
    tipo:          'DECRETO',
    data:          '1999-05-06',
    ementa:        'Aprova o Regulamento da Previdência Social — RPS.',
    vigente:       true,
    motores:       ['INSS'],
    dispositivos: [
      { artigo: 'Art. 201º', descricao: 'Define salário de contribuição e verbas que o integram.' },
      { artigo: 'Art. 214º', descricao: 'Verbas que não integram o salário de contribuição — indenizatórias.' },
      { artigo: 'Art. 216º', descricao: 'Obrigações do empregador quanto às contribuições previdenciárias.' },
    ],
    aplicacaoFiscalTrib: 'Regulamento da Previdência Social. Utilizado pelo Motor de INSS para identificar verbas indenizatórias não sujeitas à contribuição.',
    verbasNaoSujeitasINSS: [
      'Férias indenizadas e respectivo adicional constitucional',
      'Aviso prévio indenizado',
      'Auxílio-doença (a partir do 16º dia)',
      'Indenização por dispensa sem justa causa',
      'FGTS',
      'Participação nos Lucros e Resultados (PLR)',
      'Vale-transporte',
      'Vale-refeição em ticket',
      'Diárias para viagem superiores a 50% do salário',
    ],
  },

  // ── EXECUÇÃO FISCAL E PGFN ───────────────────────────────────────

  D70235_1972: {
    numero:        '70.235/1972',
    tipo:          'DECRETO',
    data:          '1972-03-06',
    ementa:        'Dispõe sobre o processo administrativo fiscal no âmbito federal.',
    vigente:       true,
    motores:       ['DIVIDA_ATIVA', 'PRESCRICAO', 'DECADENCIA'],
    dispositivos: [
      { artigo: 'Art. 9º',  descricao: 'Impugnação do lançamento — suspende a exigibilidade.' },
      { artigo: 'Art. 16º', descricao: 'Prazo de 30 dias para impugnação administrativa.' },
      { artigo: 'Art. 25º', descricao: 'Competência do CARF para julgamento de recursos.' },
      { artigo: 'Art. 42º', descricao: 'Extinção do crédito tributário por pagamento.' },
    ],
    aplicacaoFiscalTrib: 'Processo administrativo fiscal. Utilizado pelos motores de Dívida Ativa e Prescrição para análise de prazos processuais.',
  },

  // ── TABELA TIPI ───────────────────────────────────────────────────

  D11158_2022: {
    numero:        '11.158/2022',
    tipo:          'DECRETO',
    data:          '2022-07-29',
    ementa:        'Aprova a Tabela de Incidência do Imposto sobre Produtos Industrializados — TIPI.',
    vigente:       true,
    motores:       ['MONOFASICOS', 'IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Tabela', descricao: 'Define alíquotas de IPI por NCM. NCMs com alíquota zero (NT) são isentos.' },
    ],
    aplicacaoFiscalTrib: 'TIPI vigente. Utilizada para verificar alíquotas de IPI por NCM nos motores de Monofásicos e IRPJ/CSLL.',
    obs: 'A TIPI é atualizada periodicamente por decreto. Verificar versão vigente na data da análise.',
  },

  // ── LUCRO PRESUMIDO ───────────────────────────────────────────────

  D9580_LP: {
    numero:        '9.580/2018 — Lucro Presumido',
    tipo:          'DECRETO',
    data:          '2018-11-22',
    ementa:        'Percentuais de presunção do Lucro Presumido para IRPJ e CSLL por atividade econômica.',
    vigente:       true,
    motores:       ['IRPJ_CSLL'],
    dispositivos: [
      { artigo: 'Art. 215º', descricao: 'Percentuais de presunção do IRPJ no Lucro Presumido.' },
    ],
    aplicacaoFiscalTrib: 'Define os percentuais de presunção aplicáveis no Lucro Presumido para cada atividade.',
    tabelaPresuncao: [
      { atividade: 'Revenda de combustíveis',                           irpj:  1.6, csll:  1.6 },
      { atividade: 'Venda de mercadorias e produtos',                   irpj:  8.0, csll: 12.0 },
      { atividade: 'Prestação de serviços em geral',                    irpj: 32.0, csll: 32.0 },
      { atividade: 'Prestação de serviços hospitalares',                irpj:  8.0, csll: 12.0 },
      { atividade: 'Transporte de cargas',                              irpj:  8.0, csll: 12.0 },
      { atividade: 'Transporte de passageiros',                         irpj: 16.0, csll: 12.0 },
      { atividade: 'Atividades imobiliárias',                           irpj:  8.0, csll: 12.0 },
      { atividade: 'Instituições financeiras',                          irpj: 16.0, csll: 12.0 },
      { atividade: 'Administração, locação e cessão de bens e direitos',irpj: 32.0, csll: 32.0 },
    ],
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna um decreto pelo seu identificador interno.
 * @param {string} id - ex: 'D9580_2018'
 * @returns {object|null}
 */
export function getDecreto(id) {
  return DECRETOS[id] || null
}

/**
 * Retorna um decreto pelo seu número.
 * @param {string} numero - ex: '9.580/2018'
 * @returns {object|null}
 */
export function getDecretoPorNumero(numero) {
  return Object.values(DECRETOS).find(d => d.numero === numero) || null
}

/**
 * Retorna todos os decretos aplicáveis a um motor.
 * @param {string} motor - ex: 'MONOFASICOS'
 * @returns {Array}
 */
export function getDecretosPorMotor(motor) {
  return Object.values(DECRETOS).filter(d => d.motores?.includes(motor))
}

/**
 * Retorna a tabela de presunção do Lucro Presumido.
 * @returns {Array}
 */
export function getTabelaPresuncaoLP() {
  return DECRETOS.D9580_LP?.tabelaPresuncao || []
}

/**
 * Retorna o percentual de presunção do IRPJ para uma atividade.
 * @param {string} atividade
 * @returns {object|null}
 */
export function getPresuncaoIRPJ(atividade) {
  const tabela = getTabelaPresuncaoLP()
  return tabela.find(t =>
    t.atividade.toLowerCase().includes(atividade.toLowerCase())
  ) || null
}

/**
 * Metadados deste repositório.
 */
export const META_DECRETOS = {
  versaoBase:     VERSAO_ATUAL.codigo,
  totalDecretos:  Object.keys(DECRETOS).length,
  atualizadaEm:   '2026-07-08',
  observacao:     'Repositório contém os decretos mais relevantes para os motores do FiscalTrib. ' +
                  'Alíquotas e tabelas sujeitas a atualização por novos decretos.',
}