/**
 * carf.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de acórdãos do Conselho Administrativo de Recursos Fiscais.
 *
 * O CARF é o órgão colegiado de julgamento administrativo tributário
 * federal, vinculado ao Ministério da Fazenda. Julga recursos de
 * contribuintes contra autuações da Receita Federal.
 *
 * Estrutura do CARF:
 * — 3 Seções de Julgamento (1ª, 2ª e 3ª)
 * — Câmaras Superiores de Recursos Fiscais (CSRF)
 * — Turmas Ordinárias e Especiais
 *
 * Relevância para o FiscalTrib:
 * — Acórdãos do CARF mostram como a RFB interpreta a lei na prática
 * — Decisões favoráveis ao contribuinte orientam defesas administrativas
 * — Súmulas do CARF vinculam os auditores fiscais
 * — CSRF é a instância máxima administrativa — decisões têm peso especial
 *
 * IMPORTANTE: Acórdãos do CARF não vinculam o Poder Judiciário,
 * mas são fundamentais para análise de risco de autuação.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CÂMARAS E SEÇÕES DO CARF
// ─────────────────────────────────────────────────────────────

export const SECAO_CARF = {
  PRIMEIRA:  '1ª Seção',   // IRPJ, CSLL, contribuições sociais
  SEGUNDA:   '2ª Seção',   // PIS, COFINS, CIDE, contribuições previdenciárias
  TERCEIRA:  '3ª Seção',   // IPI, II, IE, IOF, IRPF
  CSRF:      'CSRF',       // Câmara Superior — instância máxima administrativa
}

// ─────────────────────────────────────────────────────────────
// RESULTADO DO ACÓRDÃO
// ─────────────────────────────────────────────────────────────

export const RESULTADO_CARF = {
  FAVORAVEL_CONTRIBUINTE:  'FAVORAVEL_CONTRIBUINTE',
  FAVORAVEL_FAZENDA:       'FAVORAVEL_FAZENDA',
  PARCIALMENTE_FAVORAVEL:  'PARCIALMENTE_FAVORAVEL',
  SUMULA_VINCULANTE:       'SUMULA_VINCULANTE',
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE ACÓRDÃOS DO CARF
// ─────────────────────────────────────────────────────────────

export const ACORDAOS_CARF = {

  // ── MONOFÁSICOS — PIS/COFINS ──────────────────────────────────────

  AC_3402_07155_2019: {
    numero:          'Acórdão 3402-007.155',
    secao:           SECAO_CARF.SEGUNDA,
    turma:           '4ª Câmara / 2ª Turma Ordinária',
    data:            '2019-08-20',
    resultado:       RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['MONOFASICOS'],
    ementa:          'Regime monofásico de PIS/COFINS. Revendedor atacadista de produtos farmacêuticos. Alíquota zero. Manutenção da decisão favorável ao contribuinte.',
    resumo:          'O CARF manteve a alíquota zero de PIS/COFINS para revendedor atacadista de produtos farmacêuticos sujeitos ao regime monofásico, reconhecendo o direito à restituição dos valores recolhidos indevidamente nos últimos 5 anos.',
    fundamentacao:   'Lei 10.147/2000 e ADI RFB 7/2002 — o revendedor não pode ser tributado com alíquotas cheias quando o fabricante já tributou na origem.',
    aplicacaoFiscalTrib: 'Confirma posicionamento favorável do CARF para monofásicos. Aumenta o grau de confiança do Motor de Monofásicos em análises administrativas.',
    grauConfianca:   'ALTO',
    impactoScore:    +10,
    palavrasChave:   ['monofásico', 'farmacêutico', 'atacadista', 'PIS', 'COFINS', 'alíquota zero'],
  },

  AC_3301_05890_2020: {
    numero:          'Acórdão 3301-005.890',
    secao:           SECAO_CARF.SEGUNDA,
    turma:           '3ª Câmara / 1ª Turma Ordinária',
    data:            '2020-03-11',
    resultado:       RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['MONOFASICOS'],
    ementa:          'Regime monofásico de PIS/COFINS. Distribuidora de bebidas. Alíquota zero. Lei 13.097/2015.',
    resumo:          'O CARF reconheceu o direito da distribuidora de bebidas à alíquota zero de PIS/COFINS sobre receitas de revenda de cervejas, refrigerantes e águas, afastando a autuação da RFB.',
    fundamentacao:   'Lei 13.097/2015, art. 14 — distribuidoras de bebidas frias têm alíquota zero de PIS/COFINS como revendedoras.',
    aplicacaoFiscalTrib: 'Reforça a tese de monofásicos para distribuidoras de bebidas. Motor de Monofásicos cita em defesas administrativas.',
    grauConfianca:   'ALTO',
    impactoScore:    +8,
    palavrasChave:   ['bebidas', 'distribuidora', 'cerveja', 'refrigerante', 'monofásico', 'alíquota zero'],
  },

  // ── EXCLUSÃO DO ICMS — TEMA 69 ────────────────────────────────────

  AC_9303_10834_2021: {
    numero:          'Acórdão 9303-010.834',
    secao:           SECAO_CARF.CSRF,
    turma:           'CSRF / 3ª Turma',
    data:            '2021-09-14',
    resultado:       RESULTADO_CARF.PARCIALMENTE_FAVORAVEL,
    motores:         ['EXCLUSAO_ICMS'],
    ementa:          'Exclusão do ICMS da base de cálculo do PIS/COFINS. Tema 69 STF. CSRF reconhece o direito mas limita ao ICMS efetivamente recolhido.',
    resumo:          'A CSRF reconheceu o direito à exclusão do ICMS da base de PIS/COFINS (Tema 69), mas seguindo o entendimento restritivo da RFB, limitou a exclusão ao ICMS efetivamente recolhido — não ao destacado na NF-e.',
    fundamentacao:   'RE 574.706 STF (Tema 69) combinado com ADI RFB 5/2018. CSRF adotou posição intermediária entre RFB e STF.',
    divergencia:     'O STF nos embargos de 2021 decidiu pelo ICMS destacado. O CARF ainda aplica o ICMS recolhido em alguns casos.',
    aplicacaoFiscalTrib: 'Motor de Exclusão ICMS registra a divergência CARF vs STF. Orienta contribuinte a buscar via judicial para garantir o ICMS destacado.',
    grauConfianca:   'MEDIO',
    impactoScore:    +5,
    palavrasChave:   ['ICMS', 'exclusão', 'PIS', 'COFINS', 'Tema 69', 'CSRF', 'recolhido', 'destacado'],
    obs:             'Risco de autuação se excluir ICMS destacado sem ação judicial. Recomenda-se via judicial para garantir o maior valor.',
  },

  // ── ICMS-ST — SIMPLES NACIONAL ────────────────────────────────────

  AC_2301_06789_2021: {
    numero:          'Acórdão 2301-006.789',
    secao:           SECAO_CARF.SEGUNDA,
    turma:           '3ª Câmara / 1ª Turma Ordinária',
    data:            '2021-05-18',
    resultado:       RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['ICMS_ST'],
    ementa:          'Simples Nacional. ICMS-ST. Exclusão da receita bruta. REsp 1.624.297 STJ. Restituição reconhecida.',
    resumo:          'O CARF reconheceu o direito do contribuinte optante pelo Simples Nacional à exclusão do ICMS-ST da receita bruta, com base no REsp 1.624.297 do STJ e na Resolução CGSN 140/2018.',
    fundamentacao:   'REsp 1.624.297/RS (STJ) e Resolução CGSN 140/2018 — ICMS-ST não integra a receita bruta do Simples Nacional.',
    periodoRetroativo: '5 anos contados do pedido administrativo',
    aplicacaoFiscalTrib: 'Confirma posicionamento favorável do CARF para ICMS-ST no Simples Nacional. Motor de ICMS-ST usa para orientar defesas administrativas.',
    grauConfianca:   'ALTO',
    impactoScore:    +12,
    palavrasChave:   ['ICMS-ST', 'Simples Nacional', 'receita bruta', 'exclusão', 'restituição'],
  },

  // ── INSS — VERBAS INDENIZATÓRIAS ─────────────────────────────────

  AC_2202_07234_2020: {
    numero:          'Acórdão 2202-007.234',
    secao:           SECAO_CARF.SEGUNDA,
    turma:           '2ª Câmara / 2ª Turma Ordinária',
    data:            '2020-09-10',
    resultado:       RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['INSS'],
    ementa:          'Contribuições previdenciárias. Aviso prévio indenizado e terço constitucional de férias. Natureza indenizatória. Não incidência de INSS.',
    resumo:          'O CARF afastou a autuação da RFB que cobrava INSS patronal sobre aviso prévio indenizado e terço constitucional de férias, reconhecendo a natureza indenizatória dessas verbas e o direito à restituição.',
    fundamentacao:   'RE 576.967 STF (Tema 478) e REsp 1.798.665 STJ (Tema 985) — verbas indenizatórias não integram o salário de contribuição.',
    periodoRetroativo: '5 anos contados do pedido, observada modulação do STF',
    aplicacaoFiscalTrib: 'Confirma posicionamento do CARF para verbas indenizatórias. Motor de INSS usa para orientar defesas e calcular créditos.',
    grauConfianca:   'ALTO',
    impactoScore:    +12,
    palavrasChave:   ['INSS', 'aviso prévio', 'terço de férias', 'indenizatório', 'não incidência', 'salário de contribuição'],
  },

  AC_2401_08912_2021: {
    numero:          'Acórdão 2401-008.912',
    secao:           SECAO_CARF.SEGUNDA,
    turma:           '4ª Câmara / 1ª Turma Ordinária',
    data:            '2021-07-22',
    resultado:       RESULTADO_CARF.FAVORAVEL_FAZENDA,
    motores:         ['INSS'],
    ementa:          'Contribuições previdenciárias. Salário-maternidade. Natureza salarial. Incidência de INSS confirmada.',
    resumo:          'O CARF manteve a autuação da RFB sobre o salário-maternidade, confirmando que tem natureza salarial e sofre incidência de INSS patronal, conforme Tema 598 do STJ.',
    fundamentacao:   'REsp 1.322.945/DF (Tema 598 STJ) — salário-maternidade tem natureza salarial e integra o salário de contribuição.',
    aplicacaoFiscalTrib: 'Atenção: decisão desfavorável ao contribuinte. Motor de INSS alerta que salário-maternidade sofre INSS legitimamente — não gera crédito.',
    grauConfianca:   'ALTO',
    impactoScore:    -8,
    palavrasChave:   ['INSS', 'salário-maternidade', 'natureza salarial', 'incidência', 'Tema 598'],
    obs:             'Desfavorável — não há crédito a recuperar sobre salário-maternidade.',
  },

  // ── IRPJ/CSLL — JCP ──────────────────────────────────────────────

  AC_1301_04567_2020: {
    numero:          'Acórdão 1301-004.567',
    secao:           SECAO_CARF.PRIMEIRA,
    turma:           '1ª Câmara / 1ª Turma Ordinária',
    data:            '2020-11-18',
    resultado:       RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['IRPJ_CSLL'],
    ementa:          'IRPJ e CSLL. Juros sobre Capital Próprio. Dedutibilidade. Limites do art. 9º da Lei 9.249/1995.',
    resumo:          'O CARF reconheceu o direito à dedução dos Juros sobre Capital Próprio dentro dos limites do art. 9º da Lei 9.249/1995, afastando a glosa feita pela RFB sobre o valor calculado com base no patrimônio líquido.',
    fundamentacao:   'Lei 9.249/1995, art. 9º e RIR/2018, art. 388 — JCP é dedutível até o limite de 50% do lucro líquido ou dos lucros acumulados.',
    aplicacaoFiscalTrib: 'Confirma dedutibilidade do JCP. Motor de IRPJ/CSLL usa para orientar o planejamento tributário com JCP.',
    grauConfianca:   'ALTO',
    impactoScore:    +10,
    palavrasChave:   ['JCP', 'Juros sobre Capital Próprio', 'IRPJ', 'CSLL', 'dedutibilidade'],
  },

  // ── DECADÊNCIA ────────────────────────────────────────────────────

  AC_9101_04523_2019: {
    numero:          'Acórdão 9101-004.523',
    secao:           SECAO_CARF.CSRF,
    turma:           'CSRF / 1ª Turma',
    data:            '2019-04-24',
    resultado:       RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['DECADENCIA', 'DIVIDA_ATIVA'],
    ementa:          'Decadência. Tributos sujeitos a lançamento por homologação. Prazo quinquenal contado do fato gerador. Art. 150, §4º do CTN.',
    resumo:          'A CSRF reconheceu a decadência do crédito tributário autuado após 5 anos do fato gerador, aplicando o art. 150, §4º do CTN para tributos declarados e pagos pelo contribuinte.',
    fundamentacao:   'CTN art. 150, §4º e Súmula 555 STJ — para tributos de lançamento por homologação com pagamento, o prazo decadencial começa na data do fato gerador.',
    aplicacaoFiscalTrib: 'Confirma posicionamento do CARF sobre decadência. Motor de Decadência usa como referência para identificar autuações fora do prazo.',
    grauConfianca:   'ALTO',
    impactoScore:    +15,
    palavrasChave:   ['decadência', 'prazo', 'fato gerador', 'lançamento por homologação', 'art. 150 CTN', 'CSRF'],
  },

  // ── PRESCRIÇÃO INTERCORRENTE ──────────────────────────────────────

  AC_9303_09876_2020: {
    numero:          'Acórdão 9303-009.876',
    secao:           SECAO_CARF.CSRF,
    turma:           'CSRF / 3ª Turma',
    data:            '2020-08-18',
    resultado:       RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE,
    motores:         ['PRESCRICAO', 'DIVIDA_ATIVA'],
    ementa:          'Prescrição intercorrente. Execução fiscal paralisada. Art. 40 da LEF. Prazo de 6 anos.',
    resumo:          'O CARF reconheceu a prescrição intercorrente em execução fiscal paralisada há mais de 6 anos, sem localização de bens ou devedor, aplicando o Tema 566 do STJ.',
    fundamentacao:   'LEF art. 40 e Tema 566 STJ (REsp 1.340.553) — 1 ano de suspensão mais 5 anos de prescrição intercorrente.',
    prazos: {
      suspensao:             '1 ano',
      prescricaoIntercorrente: '5 anos',
      total:                 '6 anos de paralisação',
    },
    aplicacaoFiscalTrib: 'Confirma prescrição intercorrente no CARF. Motor de Prescrição usa como referência para calcular execuções prescritas.',
    grauConfianca:   'ALTO',
    impactoScore:    +12,
    palavrasChave:   ['prescrição intercorrente', 'execução fiscal', 'paralisada', 'art. 40 LEF', 'Tema 566'],
  },

  // ── FATOR R ───────────────────────────────────────────────────────

  AC_2302_07123_2021: {
    numero:          'Acórdão 2302-007.123',
    secao:           SECAO_CARF.SEGUNDA,
    turma:           '3ª Câmara / 2ª Turma Ordinária',
    data:            '2021-03-09',
    resultado:       RESULTADO_CARF.FAVORAVEL_FAZENDA,
    motores:         ['FATOR_R'],
    ementa:          'Simples Nacional. Fator R. Pró-labore desproporcional. Planejamento tributário abusivo. Autuação mantida.',
    resumo:          'O CARF manteve a autuação da RFB sobre empresa que elevou artificialmente o pró-labore dos sócios para atingir o Fator R ≥ 28% e migrar para o Anexo III do Simples Nacional, sem correspondência com o trabalho efetivamente prestado.',
    fundamentacao:   'LC 123/2006 e ADI RFB 25/2020 — pró-labore deve ser compatível com o trabalho prestado. Valor artificial configura planejamento abusivo.',
    aplicacaoFiscalTrib: 'Alerta importante: Motor de Fator R orienta que pró-labore artificial é risco de autuação. O planejamento deve ser legítimo.',
    grauConfianca:   'ALTO',
    impactoScore:    -10,
    palavrasChave:   ['Fator R', 'pró-labore', 'planejamento abusivo', 'Simples Nacional', 'Anexo III', 'autuação'],
    obs:             'Decisão desfavorável — alerta sobre risco de pró-labore artificial para forçar o Fator R.',
  },

  // ── CRÉDITOS PIS/COFINS — INSUMOS ────────────────────────────────

  AC_3301_06234_2022: {
    numero:          'Acórdão 3301-006.234',
    secao:           SECAO_CARF.SEGUNDA,
    turma:           '3ª Câmara / 1ª Turma Ordinária',
    data:            '2022-02-16',
    resultado:       RESULTADO_CARF.PARCIALMENTE_FAVORAVEL,
    motores:         ['EXCLUSAO_ICMS'],
    ementa:          'PIS/COFINS não cumulativo. Crédito sobre insumos. Conceito de essencialidade e relevância. Tema 779 STJ.',
    resumo:          'O CARF reconheceu parcialmente os créditos de PIS/COFINS sobre insumos do contribuinte, aplicando o critério de essencialidade e relevância do Tema 779 do STJ. Foram aceitos: energia elétrica, manutenção de equipamentos e frete de aquisição. Rejeitados: uniformes e materiais de escritório.',
    fundamentacao:   'Tema 779 STJ (REsp 1.221.170) e SC COSIT 164/2021 — insumo é o bem ou serviço essencial ou relevante para a atividade.',
    creditosAceitos:  ['Energia elétrica', 'Manutenção de equipamentos produtivos', 'Frete na aquisição de matérias-primas', 'Embalagens do produto final'],
    creditosRejeitados: ['Uniformes administrativos', 'Material de escritório', 'Serviços de alimentação'],
    aplicacaoFiscalTrib: 'Orienta quais insumos o CARF aceita e rejeita. Motor de Exclusão ICMS usa para orientar empresas do Lucro Real sobre créditos seguros.',
    grauConfianca:   'MEDIO',
    impactoScore:    +8,
    palavrasChave:   ['insumo', 'PIS', 'COFINS', 'crédito', 'essencialidade', 'Tema 779', 'não cumulativo'],
  },
}

// ─────────────────────────────────────────────────────────────
// SÚMULAS DO CARF
// ─────────────────────────────────────────────────────────────

export const SUMULAS_CARF = {

  SUMULA_25: {
    numero:      'Súmula CARF 25',
    data:        '2012-01-01',
    vigente:     true,
    motores:     ['MONOFASICOS'],
    texto:       'A responsabilidade tributária do adquirente de fundo de comércio ou estabelecimento comercial, industrial ou profissional, prevista no artigo 133 do Código Tributário Nacional, abrange o imposto de renda das pessoas jurídicas e a contribuição social sobre o lucro líquido devidos pelo alienante.',
    aplicacaoFiscalTrib: 'Responsabilidade tributária em M&A. Motor de Dívida Ativa verifica em operações de aquisição de empresas.',
  },

  SUMULA_96: {
    numero:      'Súmula CARF 96',
    data:        '2017-01-01',
    vigente:     true,
    motores:     ['MONOFASICOS', 'EXCLUSAO_ICMS'],
    texto:       'A produção de efeitos da denúncia espontânea requer o pagamento integral do tributo e dos juros de mora, nos termos do art. 138 do CTN, não se aplicando para as obrigações acessórias autônomas e para os casos de parcelamento.',
    aplicacaoFiscalTrib: 'Denúncia espontânea afasta multa mas não juros. Motor de Transação usa para orientar contribuintes sobre regularização voluntária.',
  },

  SUMULA_143: {
    numero:      'Súmula CARF 143',
    data:        '2021-01-01',
    vigente:     true,
    motores:     ['DIVIDA_ATIVA', 'PRESCRICAO'],
    texto:       'A apresentação de impugnação tempestiva suspende a exigibilidade do crédito tributário e afasta a aplicação de multa de mora, nos termos dos artigos 151, III e 161 do CTN.',
    aplicacaoFiscalTrib: 'Impugnação suspende exigibilidade. Motor de Dívida Ativa orienta sobre prazos e efeitos da impugnação administrativa.',
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna um acórdão pelo identificador interno.
 * @param {string} id - ex: 'AC_3402_07155_2019'
 * @returns {object|null}
 */
export function getAcordao(id) {
  return ACORDAOS_CARF[id] || null
}

/**
 * Retorna todos os acórdãos aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getAcordaosPorMotor(motor) {
  return Object.values(ACORDAOS_CARF).filter(a => a.motores?.includes(motor))
}

/**
 * Retorna acórdãos favoráveis ao contribuinte para um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getAcordaosFavoraveis(motor) {
  return getAcordaosPorMotor(motor).filter(
    a => a.resultado === RESULTADO_CARF.FAVORAVEL_CONTRIBUINTE
  )
}

/**
 * Retorna acórdãos desfavoráveis ao contribuinte para um motor.
 * Útil para análise de risco.
 * @param {string} motor
 * @returns {Array}
 */
export function getAcordaosDesfavoraveis(motor) {
  return getAcordaosPorMotor(motor).filter(
    a => a.resultado === RESULTADO_CARF.FAVORAVEL_FAZENDA
  )
}

/**
 * Retorna apenas acórdãos da CSRF (instância máxima administrativa).
 * @returns {Array}
 */
export function getAcordaosCSRF() {
  return Object.values(ACORDAOS_CARF).filter(a => a.secao === SECAO_CARF.CSRF)
}

/**
 * Retorna todas as súmulas do CARF.
 * @returns {Array}
 */
export function getSumulasCARF() {
  return Object.values(SUMULAS_CARF)
}

/**
 * Retorna súmulas do CARF aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getSumulasCARFPorMotor(motor) {
  return Object.values(SUMULAS_CARF).filter(s => s.motores?.includes(motor))
}

/**
 * Calcula o impacto líquido dos acórdãos do CARF no score de um motor.
 * @param {string} motor
 * @returns {number}
 */
export function calcularImpactoCARFNoScore(motor) {
  const acordaos = getAcordaosPorMotor(motor)
  return acordaos.reduce((soma, a) => soma + (a.impactoScore || 0), 0)
}

/**
 * Gera um resumo de risco para um motor com base nos acórdãos.
 * @param {string} motor
 * @returns {object}
 */
export function gerarResumoRiscoCARF(motor) {
  const todos          = getAcordaosPorMotor(motor)
  const favoraveis     = getAcordaosFavoraveis(motor)
  const desfavoraveis  = getAcordaosDesfavoraveis(motor)
  const parciais       = todos.filter(a => a.resultado === RESULTADO_CARF.PARCIALMENTE_FAVORAVEL)
  const totalImpacto   = calcularImpactoCARFNoScore(motor)

  return {
    totalAcordaos:     todos.length,
    favoraveis:        favoraveis.length,
    desfavoraveis:     desfavoraveis.length,
    parciais:          parciais.length,
    taxaSucesso:       todos.length > 0 ? Math.round((favoraveis.length / todos.length) * 100) : 0,
    impactoLiquido:    totalImpacto,
    nivelRisco:        desfavoraveis.length === 0 ? 'BAIXO' :
                       desfavoraveis.length <= 2  ? 'MEDIO' : 'ALTO',
    alertas:           desfavoraveis.map(a => a.obs).filter(Boolean),
  }
}

/**
 * Metadados deste repositório.
 */
export const META_CARF = {
  versaoBase:      VERSAO_ATUAL.codigo,
  totalAcordaos:   Object.keys(ACORDAOS_CARF).length,
  totalSumulas:    Object.keys(SUMULAS_CARF).length,
  atualizadaEm:    '2026-07-08',
  observacao:      'Acórdãos do CARF não vinculam o Poder Judiciário mas orientam o posicionamento da RFB. ' +
                   'Acórdãos da CSRF têm maior peso por serem da instância máxima administrativa. ' +
                   'Verificar acórdãos mais recentes no portal do CARF (carf.fazenda.gov.br).',
}