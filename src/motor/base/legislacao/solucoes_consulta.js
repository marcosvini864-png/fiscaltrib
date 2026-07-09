/**
 * solucoes_consulta.js — Base de Conhecimento Tributária — FiscalTrib
 * Repositório de Soluções de Consulta da Receita Federal do Brasil.
 *
 * As Soluções de Consulta são respostas oficiais da RFB a dúvidas
 * específicas de contribuintes sobre a interpretação da legislação.
 *
 * Tipos:
 * — SC COSIT: Coordenação-Geral de Tributação — vincula toda a RFB
 * — SC DISIT: Divisão de Tributação — vincula apenas a região fiscal
 *
 * IMPORTANTE:
 * — SC COSIT vincula toda a Receita Federal
 * — Contribuinte que segue SC COSIT fica protegido de autuação
 * — SC pode ser vinculante mesmo para quem não fez a consulta
 *   desde que a situação fática seja idêntica
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// TIPOS DE SOLUÇÃO DE CONSULTA
// ─────────────────────────────────────────────────────────────

export const TIPO_SC = {
  COSIT:  'COSIT',   // Coordenação-Geral de Tributação — vincula toda RFB
  DISIT:  'DISIT',   // Divisão de Tributação — vincula apenas região fiscal
  SRRF:   'SRRF',    // Superintendência Regional da RFB
}

// ─────────────────────────────────────────────────────────────
// POSICIONAMENTO DA SC
// ─────────────────────────────────────────────────────────────

export const POSICIONAMENTO_SC = {
  FAVORAVEL:    'FAVORAVEL',    // RFB reconhece o direito do contribuinte
  DESFAVORAVEL: 'DESFAVORAVEL', // RFB nega o direito — risco de autuação
  CONDICIONADO: 'CONDICIONADO', // reconhece com condições específicas
  REVOGADO:     'REVOGADO',     // posição alterada por SC posterior
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE SOLUÇÕES DE CONSULTA
// ─────────────────────────────────────────────────────────────

export const SOLUCOES_CONSULTA = {

  // ── MONOFÁSICOS — PIS/COFINS ──────────────────────────────────────

  SC_COSIT_195_2014: {
    numero:         'SC COSIT 195/2014',
    tipo:           TIPO_SC.COSIT,
    data:           '2014-07-24',
    ementa:         'Regime monofásico de PIS/COFINS. Revendedor de produtos farmacêuticos. Alíquota zero. Vedação de créditos.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.FAVORAVEL,
    motores:        ['MONOFASICOS'],
    resumo:         'Confirma que o revendedor de produtos farmacêuticos sujeitos ao regime monofásico (Lei 10.147/2000) tem alíquota zero de PIS/COFINS e não pode apropriar créditos sobre esses produtos.',
    dispositivos: [
      { item: '1', descricao: 'Revendedor de farmacêuticos monofásicos — alíquota zero de PIS/COFINS.' },
      { item: '2', descricao: 'Vedação expressa de créditos para o revendedor.' },
      { item: '3', descricao: 'Alíquota zero aplica-se tanto ao PIS quanto à COFINS.' },
    ],
    aplicacaoFiscalTrib: 'Confirma o direito à alíquota zero. Motor de Monofásicos cita esta SC para sustentar a tese perante a RFB.',
    impactoConfianca: +15,
    palavrasChave:   ['monofásico', 'farmacêutico', 'alíquota zero', 'revendedor', 'PIS', 'COFINS'],
  },

  SC_COSIT_84_2017: {
    numero:         'SC COSIT 84/2017',
    tipo:           TIPO_SC.COSIT,
    data:           '2017-04-10',
    ementa:         'Regime monofásico de PIS/COFINS. Produtos de perfumaria e cosméticos. Comerciante varejista. Alíquota zero.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.FAVORAVEL,
    motores:        ['MONOFASICOS'],
    resumo:         'Confirma que o comerciante varejista de produtos de perfumaria e cosméticos (NCM 3303 a 3307) sujeitos ao regime monofásico tem alíquota zero de PIS/COFINS sobre as receitas de revenda.',
    dispositivos: [
      { item: '1', descricao: 'Varejista de cosméticos monofásicos — alíquota zero confirmada.' },
      { item: '2', descricao: 'Não importa o volume de vendas — a alíquota zero é geral.' },
    ],
    aplicacaoFiscalTrib: 'Confirma alíquota zero para cosméticos. Motor de Monofásicos usa para sustentar tese em autuações sobre NCMs 3303-3307.',
    impactoConfianca: +10,
    palavrasChave:   ['cosméticos', 'perfumaria', 'varejista', 'alíquota zero', 'monofásico'],
  },

  SC_COSIT_141_2020: {
    numero:         'SC COSIT 141/2020',
    tipo:           TIPO_SC.COSIT,
    data:           '2020-06-30',
    ementa:         'Regime monofásico de PIS/COFINS. Bebidas frias. Revendedor. Alíquota zero. Lei 13.097/2015.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.FAVORAVEL,
    motores:        ['MONOFASICOS'],
    resumo:         'Confirma que o revendedor de bebidas frias (cervejas, refrigerantes, águas) sujeitas ao regime monofásico da Lei 13.097/2015 tem alíquota zero de PIS/COFINS sobre as receitas de revenda.',
    dispositivos: [
      { item: '1', descricao: 'Revendedor de bebidas monofásicas — alíquota zero conforme Lei 13.097/2015.' },
      { item: '2', descricao: 'Inclui cervejas, refrigerantes, águas e outras bebidas do art. 14 da Lei 13.097/2015.' },
    ],
    aplicacaoFiscalTrib: 'Confirma alíquota zero para bebidas. Motor de Monofásicos usa para sustentar tese em análises de distribuidoras e redes varejistas.',
    impactoConfianca: +10,
    palavrasChave:   ['bebidas', 'cerveja', 'refrigerante', 'água mineral', 'alíquota zero', 'monofásico'],
  },

  SC_COSIT_372_2017: {
    numero:         'SC COSIT 372/2017',
    tipo:           TIPO_SC.COSIT,
    data:           '2017-08-11',
    ementa:         'Regime monofásico de PIS/COFINS. Combustíveis. Posto revendedor. Alíquota zero.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.FAVORAVEL,
    motores:        ['MONOFASICOS'],
    resumo:         'Confirma que postos revendedores de combustíveis têm alíquota zero de PIS/COFINS sobre as receitas de revenda de gasolina, diesel e etanol hidratado.',
    dispositivos: [
      { item: '1', descricao: 'Posto revendedor de combustíveis — alíquota zero de PIS/COFINS.' },
      { item: '2', descricao: 'Inclui gasolina, diesel, etanol hidratado e GLP.' },
    ],
    aplicacaoFiscalTrib: 'Confirma alíquota zero para postos de combustíveis. Motor de Monofásicos usa para análises de distribuidoras e postos.',
    impactoConfianca: +10,
    palavrasChave:   ['combustível', 'posto revendedor', 'gasolina', 'diesel', 'etanol', 'alíquota zero'],
  },

  // ── EXCLUSÃO DO ICMS — TEMA 69 ────────────────────────────────────

  SC_COSIT_13_2018: {
    numero:         'SC COSIT 13/2018',
    tipo:           TIPO_SC.COSIT,
    data:           '2018-10-31',
    ementa:         'Exclusão do ICMS da base de cálculo do PIS/COFINS. RE 574.706 STF (Tema 69). Procedimento de restituição.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.CONDICIONADO,
    motores:        ['EXCLUSAO_ICMS'],
    resumo:         'Regulamenta como excluir o ICMS da base de PIS/COFINS após o RE 574.706. A RFB entende que apenas o ICMS efetivamente recolhido (não o destacado) pode ser excluído. O STF diverge — decidiu pelo destacado nos embargos de 2021.',
    dispositivos: [
      { item: '1', descricao: 'ICMS a excluir: valor efetivamente recolhido aos estados, não o destacado na NF-e.' },
      { item: '2', descricao: 'Contribuinte deve apurar mês a mês o ICMS recolhido para fins de exclusão.' },
      { item: '3', descricao: 'PER/DCOMP com código específico para restituição.' },
    ],
    aplicacaoFiscalTrib: 'Posicionamento condicionado — RFB restringe ao ICMS recolhido. Motor de Exclusão ICMS registra o risco e orienta sobre a posição do STF (destacado) vs RFB (recolhido).',
    impactoConfianca: -5,
    riscoAutuacao:   'MEDIO',
    palavrasChave:   ['ICMS', 'exclusão', 'PIS', 'COFINS', 'base de cálculo', 'Tema 69', 'RE 574.706'],
    obs: 'Divergência entre RFB (recolhido) e STF nos embargos de 2021 (destacado). Recomenda-se usar o ICMS destacado e estar preparado para contestar administrativamente.',
  },

  // ── ICMS-ST — SIMPLES NACIONAL ────────────────────────────────────

  SC_COSIT_65_2018: {
    numero:         'SC COSIT 65/2018',
    tipo:           TIPO_SC.COSIT,
    data:           '2018-03-26',
    ementa:         'Simples Nacional. ICMS retido por substituição tributária. Exclusão da receita bruta. REsp 1.624.297 STJ.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.FAVORAVEL,
    motores:        ['ICMS_ST'],
    resumo:         'Confirma que o ICMS retido por substituição tributária não integra a receita bruta para fins de cálculo do Simples Nacional, conforme decisão do STJ no REsp 1.624.297.',
    dispositivos: [
      { item: '1', descricao: 'ICMS-ST não compõe a receita bruta do Simples Nacional.' },
      { item: '2', descricao: 'Contribuinte pode segregar as receitas excluindo o ICMS-ST no PGDAS-D.' },
      { item: '3', descricao: 'Direito à restituição retroativa dos últimos 5 anos.' },
    ],
    aplicacaoFiscalTrib: 'Confirma o direito à exclusão do ICMS-ST. Motor de ICMS-ST usa esta SC como fundamento principal para o Simples Nacional.',
    impactoConfianca: +20,
    palavrasChave:   ['ICMS-ST', 'Simples Nacional', 'receita bruta', 'exclusão', 'substituição tributária'],
  },

  // ── FATOR R ───────────────────────────────────────────────────────

  SC_COSIT_58_2019: {
    numero:         'SC COSIT 58/2019',
    tipo:           TIPO_SC.COSIT,
    data:           '2019-03-19',
    ementa:         'Simples Nacional. Fator R. Pró-labore. Folha de salários. Enquadramento Anexo III ou V.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.NEUTRO,
    motores:        ['FATOR_R'],
    resumo:         'Esclarece que o pró-labore pago aos sócios compõe a folha de salários para fins do Fator R, desde que seja um valor compatível com o trabalho efetivamente prestado.',
    dispositivos: [
      { item: '1', descricao: 'Pró-labore integra a folha de salários para cálculo do Fator R.' },
      { item: '2', descricao: 'Pró-labore deve ser compatível com o trabalho prestado — vedado valor artificial.' },
      { item: '3', descricao: 'Contribuição previdenciária sobre pró-labore também compõe a folha.' },
    ],
    aplicacaoFiscalTrib: 'Define que pró-labore entra no Fator R. Motor de Fator R inclui o pró-labore no cálculo e alerta sobre o risco de valor artificial.',
    impactoConfianca: +5,
    palavrasChave:   ['Fator R', 'pró-labore', 'folha de salários', 'Anexo III', 'Anexo V', 'Simples Nacional'],
    alertaRisco:     'Pró-labore artificial para forçar Fator R ≥ 28% configura planejamento abusivo — risco de autuação.',
  },

  // ── INSS — VERBAS INDENIZATÓRIAS ─────────────────────────────────

  SC_COSIT_71_2015: {
    numero:         'SC COSIT 71/2015',
    tipo:           TIPO_SC.COSIT,
    data:           '2015-04-09',
    ementa:         'Contribuições previdenciárias. Verbas de natureza indenizatória. Não incidência sobre aviso prévio indenizado.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.FAVORAVEL,
    motores:        ['INSS'],
    resumo:         'Confirma que o aviso prévio indenizado não integra o salário de contribuição para fins de INSS, com base na decisão do STF no RE 576.967 (Tema 478).',
    dispositivos: [
      { item: '1', descricao: 'Aviso prévio indenizado não sofre incidência de INSS.' },
      { item: '2', descricao: 'Apenas o aviso prévio trabalhado integra o salário de contribuição.' },
      { item: '3', descricao: 'Direito à restituição do INSS recolhido sobre aviso prévio indenizado.' },
    ],
    aplicacaoFiscalTrib: 'Confirma não incidência do INSS. Motor de INSS usa para identificar empresas que recolheram INSS sobre aviso prévio indenizado.',
    impactoConfianca: +15,
    palavrasChave:   ['INSS', 'aviso prévio', 'indenizado', 'salário de contribuição', 'verbas indenizatórias'],
  },

  SC_COSIT_108_2021: {
    numero:         'SC COSIT 108/2021',
    tipo:           TIPO_SC.COSIT,
    data:           '2021-05-17',
    ementa:         'Contribuições previdenciárias. PLR — Participação nos Lucros e Resultados. Não incidência.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.FAVORAVEL,
    motores:        ['INSS'],
    resumo:         'Confirma que a PLR paga conforme Lei 10.101/2000 não sofre incidência de contribuições previdenciárias, desde que observados os requisitos legais.',
    dispositivos: [
      { item: '1', descricao: 'PLR conforme Lei 10.101/2000 — não incide INSS.' },
      { item: '2', descricao: 'Requisitos: negociação com sindicato ou comissão de empregados, acordo por escrito, metas objetivas.' },
      { item: '3', descricao: 'PLR paga fora dos requisitos da Lei 10.101/2000 sofre INSS.' },
    ],
    aplicacaoFiscalTrib: 'Confirma isenção do INSS sobre PLR. Motor de INSS verifica se empresa paga PLR e se observa os requisitos legais.',
    impactoConfianca: +10,
    palavrasChave:   ['INSS', 'PLR', 'participação nos lucros', 'verbas indenizatórias', 'Lei 10.101/2000'],
    requisitosLei10101: [
      'Negociação com sindicato da categoria ou comissão de empregados',
      'Acordo por escrito com vigência de até 2 anos',
      'Metas e critérios objetivos e mensuráveis',
      'Pagamento em 2 parcelas no mínimo com intervalo de 1 trimestre',
      'Vedado o pagamento mensal',
    ],
  },

  // ── IRPJ/CSLL — JCP ──────────────────────────────────────────────

  SC_COSIT_23_2022: {
    numero:         'SC COSIT 23/2022',
    tipo:           TIPO_SC.COSIT,
    data:           '2022-02-14',
    ementa:         'IRPJ e CSLL. Juros sobre Capital Próprio. Dedutibilidade. Limitações. Base de cálculo.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.CONDICIONADO,
    motores:        ['IRPJ_CSLL'],
    resumo:         'Esclarece os limites de dedutibilidade do JCP: 50% do lucro líquido do período ou 50% dos lucros acumulados/reservas, aplicando o menor dos dois limites.',
    dispositivos: [
      { item: '1', descricao: 'JCP dedutível limitado ao menor valor entre: 50% do lucro líquido ou 50% dos lucros acumulados.' },
      { item: '2', descricao: 'TJLP vigente no período é a taxa aplicável ao cálculo do JCP.' },
      { item: '3', descricao: 'Retenção de IRRF de 15% na fonte sobre JCP pago ou creditado.' },
    ],
    aplicacaoFiscalTrib: 'Define limites do JCP. Motor de IRPJ/CSLL calcula o JCP dedutível respeitando os limites desta SC.',
    impactoConfianca: +5,
    palavrasChave:   ['JCP', 'Juros sobre Capital Próprio', 'IRPJ', 'CSLL', 'dedutibilidade', 'TJLP'],
  },

  // ── DÍVIDA ATIVA — PARCELAMENTO ───────────────────────────────────

  SC_COSIT_31_2020: {
    numero:         'SC COSIT 31/2020',
    tipo:           TIPO_SC.COSIT,
    data:           '2020-02-10',
    ementa:         'Parcelamento de débitos inscritos em dívida ativa. Efeitos sobre a prescrição. Suspensão da exigibilidade.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.NEUTRO,
    motores:        ['DIVIDA_ATIVA', 'PRESCRICAO', 'TRANSACAO'],
    resumo:         'Esclarece que o deferimento do parcelamento suspende a exigibilidade do crédito tributário e interrompe o prazo prescricional para cobrança.',
    dispositivos: [
      { item: '1', descricao: 'Parcelamento deferido suspende a exigibilidade — permite emissão de CPEND.' },
      { item: '2', descricao: 'Suspensão interrompe o prazo prescricional durante o período do parcelamento.' },
      { item: '3', descricao: 'Rescisão do parcelamento retoma o prazo prescricional.' },
    ],
    aplicacaoFiscalTrib: 'Define efeitos do parcelamento. Motores de Dívida Ativa e Prescrição usam para calcular prazos e orientar regularização.',
    impactoConfianca: 0,
    palavrasChave:   ['parcelamento', 'prescrição', 'dívida ativa', 'suspensão', 'exigibilidade'],
  },

  // ── PIS/COFINS — CRÉDITOS DE INSUMOS ─────────────────────────────

  SC_COSIT_164_2021: {
    numero:         'SC COSIT 164/2021',
    tipo:           TIPO_SC.COSIT,
    data:           '2021-07-26',
    ementa:         'PIS/COFINS não cumulativo. Conceito de insumo. Critério de essencialidade e relevância. REsp 1.221.170 STJ.',
    vigente:        true,
    posicionamento: POSICIONAMENTO_SC.CONDICIONADO,
    motores:        ['EXCLUSAO_ICMS'],
    resumo:         'Após o REsp 1.221.170 do STJ (Tema 779), a RFB passou a admitir o conceito ampliado de insumo para créditos de PIS/COFINS, baseado na essencialidade e relevância para a atividade produtiva.',
    dispositivos: [
      { item: '1', descricao: 'Insumo: bem ou serviço essencial ou relevante para a atividade da empresa.' },
      { item: '2', descricao: 'Análise caso a caso — não há lista fechada de insumos.' },
      { item: '3', descricao: 'Energia elétrica, serviços de limpeza, manutenção de equipamentos podem ser insumos.' },
    ],
    aplicacaoFiscalTrib: 'Define conceito amplo de insumo. Motor de Exclusão ICMS orienta empresas do Lucro Real sobre créditos de PIS/COFINS sobre insumos.',
    impactoConfianca: +8,
    palavrasChave:   ['insumo', 'PIS', 'COFINS', 'crédito', 'essencialidade', 'relevância', 'não cumulativo'],
    exemploInsumos:  [
      'Energia elétrica utilizada na produção',
      'Serviços de manutenção de máquinas e equipamentos',
      'Serviços de limpeza e conservação das instalações produtivas',
      'Fretes na aquisição de matérias-primas',
      'Embalagens utilizadas no produto final',
      'Serviços de vigilância das instalações produtivas',
    ],
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma SC pelo seu identificador interno.
 * @param {string} id - ex: 'SC_COSIT_195_2014'
 * @returns {object|null}
 */
export function getSolucaoConsulta(id) {
  return SOLUCOES_CONSULTA[id] || null
}

/**
 * Retorna uma SC pelo seu número.
 * @param {string} numero - ex: 'SC COSIT 195/2014'
 * @returns {object|null}
 */
export function getSCPorNumero(numero) {
  return Object.values(SOLUCOES_CONSULTA).find(s => s.numero === numero) || null
}

/**
 * Retorna todas as SCs aplicáveis a um motor.
 * @param {string} motor
 * @returns {Array}
 */
export function getSCsPorMotor(motor) {
  return Object.values(SOLUCOES_CONSULTA).filter(s => s.motores?.includes(motor))
}

/**
 * Retorna apenas SCs favoráveis ao contribuinte.
 * @param {string} motor - opcional
 * @returns {Array}
 */
export function getSCsFavoraveis(motor = null) {
  return Object.values(SOLUCOES_CONSULTA).filter(s =>
    s.posicionamento === POSICIONAMENTO_SC.FAVORAVEL &&
    s.vigente &&
    (motor ? s.motores?.includes(motor) : true)
  )
}

/**
 * Retorna apenas SCs desfavoráveis ao contribuinte.
 * @param {string} motor - opcional
 * @returns {Array}
 */
export function getSCsDesfavoraveis(motor = null) {
  return Object.values(SOLUCOES_CONSULTA).filter(s =>
    s.posicionamento === POSICIONAMENTO_SC.DESFAVORAVEL &&
    s.vigente &&
    (motor ? s.motores?.includes(motor) : true)
  )
}

/**
 * Calcula o impacto líquido das SCs no grau de confiança de um motor.
 * @param {string} motor
 * @returns {number}
 */
export function calcularImpactoSCsNaConfianca(motor) {
  const scs = getSCsPorMotor(motor).filter(s => s.vigente)
  return scs.reduce((soma, s) => soma + (s.impactoConfianca || 0), 0)
}

/**
 * Busca SCs por palavras-chave.
 * @param {string[]} palavras
 * @returns {Array}
 */
export function buscarSCsPorPalavrasChave(palavras) {
  return Object.values(SOLUCOES_CONSULTA).filter(s =>
    palavras.some(p =>
      s.palavrasChave?.some(k => k.toLowerCase().includes(p.toLowerCase()))
    )
  )
}

/**
 * Retorna os requisitos da Lei 10.101/2000 para PLR.
 * @returns {Array}
 */
export function getRequisitosPLR() {
  return SOLUCOES_CONSULTA.SC_COSIT_108_2021?.requisitosLei10101 || []
}

/**
 * Retorna exemplos de insumos reconhecidos pela RFB.
 * @returns {Array}
 */
export function getExemplosInsumos() {
  return SOLUCOES_CONSULTA.SC_COSIT_164_2021?.exemploInsumos || []
}

/**
 * Metadados deste repositório.
 */
export const META_SOLUCOES_CONSULTA = {
  versaoBase:    VERSAO_ATUAL.codigo,
  totalSCs:      Object.keys(SOLUCOES_CONSULTA).length,
  atualizadaEm:  '2026-07-08',
  observacao:    'SC COSIT vincula toda a RFB. Contribuinte que segue SC COSIT fica protegido de autuação. ' +
                 'SCs podem ser superadas por decisões judiciais posteriores do STF ou STJ. ' +
                 'Verificar regularmente novas SCs no portal da RFB (normas.receita.fazenda.gov.br).',
}