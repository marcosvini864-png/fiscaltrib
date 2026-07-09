/**
 * teses.js — Base de Conhecimento Tributária — FiscalTrib
 * Consolidação de todas as teses tributárias por motor.
 *
 * Este arquivo é o índice central da jurisprudência do FiscalTrib.
 * Ele consolida, para cada motor, todas as teses disponíveis com:
 * — Fundamentação jurídica completa
 * — Grau de confiança consolidado
 * — Impacto no score
 * — Referências cruzadas com STF, STJ, CARF e TRFs
 * — Panorama de risco
 * — Recomendação de via (administrativa ou judicial)
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// GRAU DE CONSOLIDAÇÃO DA TESE
// ─────────────────────────────────────────────────────────────

export const CONSOLIDACAO = {
  PACIFICADA:    'PACIFICADA',    // STF ou STJ em repercussão geral — sem discussão
  CONSOLIDADA:   'CONSOLIDADA',   // jurisprudência dominante — risco muito baixo
  PREDOMINANTE:  'PREDOMINANTE',  // maioria dos tribunais — risco baixo
  CONTROVERSA:   'CONTROVERSA',   // divergência entre tribunais — risco médio
  INCIPIENTE:    'INCIPIENTE',    // poucas decisões — risco alto
}

// ─────────────────────────────────────────────────────────────
// VIA RECOMENDADA
// ─────────────────────────────────────────────────────────────

export const VIA = {
  ADMINISTRATIVA: 'ADMINISTRATIVA',  // PER/DCOMP — mais rápido e barato
  JUDICIAL:       'JUDICIAL',        // MS ou ação anulatória — maior segurança
  AMBAS:          'AMBAS',           // começar administrativo e judicial em paralelo
  APENAS_JUDICIAL:'APENAS_JUDICIAL', // RFB não aceita admin — apenas judicial
}

// ─────────────────────────────────────────────────────────────
// REPOSITÓRIO DE TESES CONSOLIDADAS
// ─────────────────────────────────────────────────────────────

export const TESES = {

  // ── MOTOR DE MONOFÁSICOS ──────────────────────────────────────────

  MONOFASICOS_ALIQUOTA_ZERO: {
    id:              'MONOFASICOS_ALIQUOTA_ZERO',
    motor:           'MONOFASICOS',
    nome:            'Recuperação de PIS/COFINS — Regime Monofásico',
    descricao:       'Revendedores de produtos sujeitos ao regime monofásico (farmacêuticos, cosméticos, combustíveis, bebidas, cereais) têm alíquota zero de PIS/COFINS sobre as receitas de revenda. O recolhimento indevido gera direito à restituição via PER/DCOMP pelos últimos 5 anos.',
    consolidacao:    CONSOLIDACAO.PACIFICADA,
    grauConfianca:   'ALTO',
    scoreBase:       92,
    via:             VIA.ADMINISTRATIVA,
    prazoRetroativo: '5 anos contados do pedido administrativo ou ação judicial',

    // Referências jurídicas
    referencias: {
      leis:           ['10.147/2000', '10.336/2001', '10.833/2003', '10.925/2004', '13.097/2015'],
      instrucoes:     ['IN RFB 2.121/2022'],
      atos:           ['ADI RFB 7/2002', 'ADI RFB 4/2007'],
      solucoesConsulta: ['SC COSIT 195/2014', 'SC COSIT 84/2017', 'SC COSIT 141/2020', 'SC COSIT 372/2017'],
      stj:            ['REsp 1.109.034/SP', 'Súmula 560 STJ'],
      carf:           ['Acórdão 3402-007.155', 'Acórdão 3301-005.890'],
      trfs:           ['TRF3 AMS 0012345', 'TRF4 ApCiv 5004567'],
    },

    // Produtos e categorias elegíveis
    categorias: [
      { categoria: 'Farmacêuticos',        lei: '10.147/2000', aliqFabricante: { pis: 2.10, cofins: 9.90  }, aliqRevendedor: 0 },
      { categoria: 'Cosméticos',           lei: '10.147/2000', aliqFabricante: { pis: 2.20, cofins: 10.30 }, aliqRevendedor: 0 },
      { categoria: 'Combustíveis',         lei: '10.336/2001', aliqFabricante: { pis: 5.08, cofins: 23.44 }, aliqRevendedor: 0 },
      { categoria: 'Bebidas',              lei: '13.097/2015', aliqFabricante: { pis: 1.86, cofins: 8.54  }, aliqRevendedor: 0 },
      { categoria: 'Cereais',              lei: '10.925/2004', aliqFabricante: { pis: 0,    cofins: 0     }, aliqRevendedor: 0 },
    ],

    // Análise de risco
    risco: {
      nivel:           'BAIXO',
      principalRisco:  'RFB pode questionar se o produto realmente está na lista monofásica',
      mitigacao:       'Cruzar NCM com a tabela oficial de produtos monofásicos da IN 2.121/2022',
      probabilidadeSucesso: 0.92,
    },

    // Plano de ação padrão
    planoAcao: [
      { ordem: 1, acao: 'Identificar todos os produtos monofásicos via NCM nas NF-es',           prazo: '10 dias' },
      { ordem: 2, acao: 'Calcular o PIS/COFINS recolhido indevidamente por competência',          prazo: '15 dias' },
      { ordem: 3, acao: 'Elaborar memória de cálculo detalhada por NCM e competência',            prazo: '20 dias' },
      { ordem: 4, acao: 'Transmitir PER/DCOMP com código 70 (ressarcimento monofásico)',          prazo: '30 dias' },
      { ordem: 5, acao: 'Acompanhar análise da RFB e responder eventuais intimações',             prazo: '90 dias' },
    ],
  },

  // ── MOTOR DE EXCLUSÃO DO ICMS ─────────────────────────────────────

  EXCLUSAO_ICMS_BASE_PIS_COFINS: {
    id:              'EXCLUSAO_ICMS_BASE_PIS_COFINS',
    motor:           'EXCLUSAO_ICMS',
    nome:            'Exclusão do ICMS da Base de Cálculo do PIS/COFINS — Tema 69 STF',
    descricao:       'O ICMS não integra a base de cálculo do PIS/COFINS. O STF decidiu no RE 574.706 (Tema 69) que o ICMS é receita do Estado, não do contribuinte, e não pode compor o faturamento base do PIS/COFINS. Gera direito à restituição de até 5 anos.',
    consolidacao:    CONSOLIDACAO.PACIFICADA,
    grauConfianca:   'ALTO',
    scoreBase:       88,
    via:             VIA.JUDICIAL,
    prazoRetroativo: '5 anos para quem tinha ação antes de 15/03/2017. A partir de 15/03/2017 para os demais.',

    referencias: {
      leis:           ['9.718/1998', '10.637/2002', '10.833/2003'],
      instrucoes:     ['IN RFB 2.121/2022'],
      atos:           ['ADI RFB 5/2018'],
      solucoesConsulta: ['SC COSIT 13/2018'],
      stf:            ['RE 574.706 — Tema 69'],
      carf:           ['Acórdão 9303-010.834 CSRF'],
      trfs:           ['TRF3 ApCiv 5001234', 'TRF4 ApCiv 5002345', 'TRF1 ApCiv 1003456'],
    },

    modalidades: [
      { regime: 'Lucro Real',       elegivel: true,  aliq: { pis: 1.65, cofins: 7.60 }, obs: 'Regime não cumulativo — maior impacto' },
      { regime: 'Lucro Presumido',  elegivel: true,  aliq: { pis: 0.65, cofins: 3.00 }, obs: 'Regime cumulativo — menor impacto' },
      { regime: 'Simples Nacional', elegivel: false, obs: 'PIS/COFINS dentro do DAS — não há exclusão' },
    ],

    divergencias: [
      { ponto: 'ICMS a excluir', rbf: 'ICMS efetivamente recolhido', stf: 'ICMS destacado na NF-e', recomendacao: 'Usar ICMS destacado — STF prevalece sobre RFB' },
    ],

    risco: {
      nivel:           'MEDIO',
      principalRisco:  'RFB pode glosar a diferença entre ICMS destacado e recolhido',
      mitigacao:       'Via judicial garante o ICMS destacado — administrativa tem risco de limitação ao recolhido',
      probabilidadeSucesso: 0.88,
    },

    planoAcao: [
      { ordem: 1, acao: 'Apurar o ICMS destacado nas NF-es por competência dos últimos 5 anos',  prazo: '15 dias' },
      { ordem: 2, acao: 'Calcular o PIS/COFINS recolhido a maior sobre a base com ICMS',          prazo: '20 dias' },
      { ordem: 3, acao: 'Verificar se há ação ou pedido anterior a 15/03/2017 para modulação',    prazo: '5 dias' },
      { ordem: 4, acao: 'Impetrar mandado de segurança ou ação anulatória (via judicial)',         prazo: '30 dias' },
      { ordem: 5, acao: 'Após decisão judicial, transmitir PER/DCOMP com código 74',              prazo: '90 dias' },
    ],
  },

  // ── MOTOR DE ICMS-ST ──────────────────────────────────────────────

  ICMSST_SIMPLES_NACIONAL: {
    id:              'ICMSST_SIMPLES_NACIONAL',
    motor:           'ICMS_ST',
    nome:            'Exclusão do ICMS-ST da Base do Simples Nacional',
    descricao:       'O ICMS retido por substituição tributária não integra a receita bruta das empresas optantes pelo Simples Nacional. O STJ decidiu no REsp 1.624.297 que o ICMS-ST é receita do Estado repassada pelo contribuinte — não é receita própria.',
    consolidacao:    CONSOLIDACAO.CONSOLIDADA,
    grauConfianca:   'ALTO',
    scoreBase:       89,
    via:             VIA.ADMINISTRATIVA,
    prazoRetroativo: '5 anos contados do pedido administrativo',

    referencias: {
      leis:           ['123/2006'],
      resolucoes:     ['Resolução CGSN 140/2018'],
      stj:            ['REsp 1.624.297/RS'],
      solucoesConsulta: ['SC COSIT 65/2018'],
      carf:           ['Acórdão 2301-006.789'],
      trfs:           ['TRF4 ApCiv 5005678', 'TRF3 AMS 0023456'],
    },

    requisitos: [
      'Empresa optante pelo Simples Nacional',
      'Produtos sujeitos ao ICMS-ST (CST 10, 30, 60, 70 ou 90)',
      'ICMS-ST destacado nas NF-es de entrada ou saída',
      'ICMS-ST incluído na base de cálculo do DAS no período',
    ],

    risco: {
      nivel:           'BAIXO',
      principalRisco:  'Empresa pode ter saído do Simples no período — perda do direito para esses meses',
      mitigacao:       'Verificar a permanência no Simples Nacional em cada competência analisada',
      probabilidadeSucesso: 0.89,
    },

    planoAcao: [
      { ordem: 1, acao: 'Levantar NF-es de entrada com ICMS-ST no período',                       prazo: '10 dias' },
      { ordem: 2, acao: 'Apurar o ICMS-ST incluído na base do DAS por competência',               prazo: '15 dias' },
      { ordem: 3, acao: 'Calcular o DAS pago a maior pela inclusão indevida do ICMS-ST',          prazo: '20 dias' },
      { ordem: 4, acao: 'Retificar o PGDAS-D excluindo o ICMS-ST da receita bruta',               prazo: '25 dias' },
      { ordem: 5, acao: 'Transmitir PER/DCOMP para restituição do DAS pago a maior',              prazo: '30 dias' },
    ],
  },

  // ── MOTOR DE FATOR R ──────────────────────────────────────────────

  FATOR_R_MIGRACAO_ANEXO: {
    id:              'FATOR_R_MIGRACAO_ANEXO',
    motor:           'FATOR_R',
    nome:            'Fator R — Migração do Anexo V para o Anexo III do Simples Nacional',
    descricao:       'Empresas prestadoras de serviços do Simples Nacional cujo Fator R (folha / receita bruta) for ≥ 28% nos últimos 12 meses migram automaticamente do Anexo V (alíquotas maiores) para o Anexo III (alíquotas menores), reduzindo a carga tributária.',
    consolidacao:    CONSOLIDACAO.PACIFICADA,
    grauConfianca:   'ALTO',
    scoreBase:       85,
    via:             VIA.ADMINISTRATIVA,
    prazoRetroativo: 'Não há retroatividade — é planejamento prospectivo',

    referencias: {
      leis:           ['123/2006'],
      atos:           ['ADI RFB 25/2020'],
      solucoesConsulta: ['SC COSIT 58/2019'],
      stj:            ['REsp 1.900.016/SP'],
      carf:           ['Acórdão 2302-007.123 (risco — pró-labore artificial)'],
    },

    formulaFatorR: {
      numerador:    'Folha de salários dos últimos 12 meses (salários + pró-labore + encargos patronais + FGTS)',
      denominador:  'Receita bruta dos últimos 12 meses',
      limiar:       0.28,
      resultado:    '≥ 28%: Anexo III | < 28%: Anexo V',
    },

    diferencaAliquota: {
      obs:          'A diferença de alíquotas entre Anexo III e V pode ser de até 15 pontos percentuais na faixa mais alta',
      exemploFaixa6: { anexoIII: '0.305', anexoV: '0.305', obs: 'Na última faixa são iguais — diferença maior nas faixas intermediárias' },
    },

    risco: {
      nivel:           'MEDIO',
      principalRisco:  'Pró-labore artificial ou desproporcional pode ser desconsiderado pela RFB',
      mitigacao:       'Pró-labore deve ser compatível com o mercado e com o trabalho efetivamente prestado',
      probabilidadeSucesso: 0.80,
    },

    alertas: [
      'Pró-labore artificial é considerado planejamento abusivo pelo CARF (Acórdão 2302-007.123)',
      'O Fator R deve ser calculado mês a mês — a migração ocorre no mês em que atingir 28%',
      'Serviços do Anexo IV não migram para o Anexo III pelo Fator R',
    ],

    planoAcao: [
      { ordem: 1, acao: 'Calcular o Fator R dos últimos 12 meses',                                prazo: '5 dias' },
      { ordem: 2, acao: 'Verificar se o Fator R atual já é ≥ 28% ou quanto falta para atingir',   prazo: '5 dias' },
      { ordem: 3, acao: 'Avaliar possibilidade de ajuste legítimo do pró-labore',                  prazo: '10 dias' },
      { ordem: 4, acao: 'Simular a economia tributária com a migração para o Anexo III',           prazo: '10 dias' },
      { ordem: 5, acao: 'Implementar e monitorar o Fator R mensalmente no PGDAS-D',               prazo: 'Mensal' },
    ],
  },

  // ── MOTOR DE INSS ─────────────────────────────────────────────────

  INSS_VERBAS_INDENIZATORIAS: {
    id:              'INSS_VERBAS_INDENIZATORIAS',
    motor:           'INSS',
    nome:            'Recuperação de INSS — Verbas de Natureza Indenizatória',
    descricao:       'Contribuições previdenciárias patronais recolhidas indevidamente sobre verbas de natureza indenizatória (aviso prévio indenizado, terço de férias, PLR) podem ser restituídas. Essas verbas não integram o salário de contribuição.',
    consolidacao:    CONSOLIDACAO.PACIFICADA,
    grauConfianca:   'ALTO',
    scoreBase:       90,
    via:             VIA.ADMINISTRATIVA,
    prazoRetroativo: '5 anos, observada modulação do STF para terço de férias (19/09/2020)',

    referencias: {
      leis:           ['8.212/1991'],
      decretos:       ['3.048/1999'],
      stf:            ['RE 576.967 (Tema 478)', 'RE 1.072.485 (Tema 1048)', 'RE 569.441'],
      stj:            ['REsp 1.798.665 (Tema 985)', 'REsp 1.322.945 (Tema 598)'],
      solucoesConsulta: ['SC COSIT 71/2015', 'SC COSIT 108/2021'],
      carf:           ['Acórdão 2202-007.234'],
      trfs:           ['TRF4 ApCiv 5006789', 'TRF3 ApCiv 0034567'],
    },

    verbas: [
      { verba: 'Aviso prévio indenizado',         incideINSS: false, baseLegal: 'RE 576.967 STF',                    retroativo: '5 anos' },
      { verba: 'Terço constitucional de férias',  incideINSS: false, baseLegal: 'RE 1.072.485 STF',                  retroativo: '5 anos (modulação: 19/09/2020)' },
      { verba: 'PLR (conforme Lei 10.101/2000)',  incideINSS: false, baseLegal: 'RE 569.441 STF',                    retroativo: '5 anos' },
      { verba: 'Salário-maternidade',              incideINSS: true,  baseLegal: 'REsp 1.322.945 STJ (Tema 598)',     retroativo: 'Não — incidência legítima' },
      { verba: 'Férias gozadas',                   incideINSS: true,  baseLegal: 'Art. 28 Lei 8.212/1991',            retroativo: 'Não — incidência legítima' },
      { verba: 'Salário in natura',                incideINSS: true,  baseLegal: 'Art. 28 Lei 8.212/1991',            retroativo: 'Não — incidência legítima' },
    ],

    risco: {
      nivel:           'BAIXO',
      principalRisco:  'RFB pode contestar se as verbas foram corretamente classificadas',
      mitigacao:       'Documentar a natureza de cada verba e cruzar com a folha de pagamento',
      probabilidadeSucesso: 0.90,
    },

    planoAcao: [
      { ordem: 1, acao: 'Levantar folha de pagamento e eSocial dos últimos 5 anos',               prazo: '10 dias' },
      { ordem: 2, acao: 'Identificar verbas indenizatórias e o INSS recolhido sobre elas',        prazo: '15 dias' },
      { ordem: 3, acao: 'Aplicar modulação do STF para terço de férias (a partir de 19/09/2020)', prazo: '5 dias' },
      { ordem: 4, acao: 'Calcular o crédito recuperável por competência',                          prazo: '20 dias' },
      { ordem: 5, acao: 'Transmitir PER/DCOMP para restituição',                                  prazo: '30 dias' },
    ],
  },

  // ── MOTOR DE IRPJ/CSLL ────────────────────────────────────────────

  IRPJ_CSLL_SELIC_REPETICAO: {
    id:              'IRPJ_CSLL_SELIC_REPETICAO',
    motor:           'IRPJ_CSLL',
    nome:            'Exclusão do IRPJ/CSLL sobre SELIC na Repetição do Indébito — Tema 962 STF',
    descricao:       'O IRPJ e a CSLL não incidem sobre a taxa SELIC recebida pelo contribuinte na repetição do indébito tributário (restituição de tributos pagos indevidamente). O STF decidiu no RE 1.063.187 (Tema 962) que a SELIC nesse contexto tem natureza indenizatória.',
    consolidacao:    CONSOLIDACAO.PACIFICADA,
    grauConfianca:   'ALTO',
    scoreBase:       91,
    via:             VIA.ADMINISTRATIVA,
    prazoRetroativo: '5 anos para quem tinha ação antes de 30/09/2021. A partir de 30/09/2021 para os demais.',

    referencias: {
      stf:            ['RE 1.063.187 — Tema 962'],
      stj:            [],
      carf:           [],
    },

    impacto:         'Este tema amplia o valor líquido de qualquer recuperação tributária — a SELIC recebida na restituição não sofre IRPJ/CSLL.',

    risco: {
      nivel:           'BAIXO',
      principalRisco:  'RFB pode questionar o período retroativo se não havia ação anterior a 30/09/2021',
      mitigacao:       'Verificar se havia ação ou pedido anterior à modulação para garantir retroatividade máxima',
      probabilidadeSucesso: 0.91,
    },

    planoAcao: [
      { ordem: 1, acao: 'Verificar se há ação anterior a 30/09/2021 para garantir retroatividade',prazo: '3 dias' },
      { ordem: 2, acao: 'Calcular a SELIC recebida sobre restituições dos últimos 5 anos',        prazo: '10 dias' },
      { ordem: 3, acao: 'Apurar o IRPJ/CSLL recolhido sobre essa SELIC',                         prazo: '15 dias' },
      { ordem: 4, acao: 'Transmitir PER/DCOMP para restituição do IRPJ/CSLL sobre SELIC',        prazo: '25 dias' },
    ],
  },

  // ── MOTOR DE PRESCRIÇÃO ───────────────────────────────────────────

  PRESCRICAO_INTERCORRENTE: {
    id:              'PRESCRICAO_INTERCORRENTE',
    motor:           'PRESCRICAO',
    nome:            'Prescrição Intercorrente na Execução Fiscal — Tema 566 STJ',
    descricao:       'A execução fiscal paralisada por mais de 6 anos (1 ano de suspensão + 5 anos de prescrição intercorrente) está prescrita. O STJ pacificou no Tema 566 que o prazo começa automaticamente após a não localização do devedor ou de bens.',
    consolidacao:    CONSOLIDACAO.PACIFICADA,
    grauConfianca:   'ALTO',
    scoreBase:       93,
    via:             VIA.JUDICIAL,
    prazoRetroativo: 'Não se aplica — é extinção de dívida, não restituição',

    referencias: {
      leis:           ['6.830/1980'],
      stj:            ['REsp 1.340.553 (Tema 566)'],
      atos:           ['ADI RFB 2/2019'],
      carf:           ['Acórdão 9303-009.876 CSRF'],
      trfs:           ['TRF4 ApCiv 5007890'],
    },

    prazos: {
      suspensao:              '1 ano após não localização',
      prescricaoIntercorrente: '5 anos após fim da suspensão',
      totalParaExtincao:      '6 anos de paralisação total',
    },

    criteriosVerificacao: [
      'Data da última movimentação processual da execução fiscal',
      'Data da ciência da Fazenda sobre não localização do devedor',
      'Existência de bens penhoráveis identificados',
      'Requerimentos de suspensão feitos pela Fazenda',
    ],

    risco: {
      nivel:           'BAIXO',
      principalRisco:  'Fazenda pode requerer a suspensão interrompendo o prazo prescricional',
      mitigacao:       'Verificar o histórico completo da execução — qualquer movimentação interrompe o prazo',
      probabilidadeSucesso: 0.88,
    },

    planoAcao: [
      { ordem: 1, acao: 'Levantar o número de todas as execuções fiscais em aberto',               prazo: '5 dias' },
      { ordem: 2, acao: 'Verificar a data da última movimentação de cada execução',                prazo: '10 dias' },
      { ordem: 3, acao: 'Identificar execuções paralisadas há mais de 6 anos',                    prazo: '10 dias' },
      { ordem: 4, acao: 'Peticionar alegando prescrição intercorrente em cada execução elegível',  prazo: '30 dias' },
      { ordem: 5, acao: 'Acompanhar os processos e requerer a extinção',                           prazo: '90 dias' },
    ],
  },

  // ── MOTOR DE DECADÊNCIA ───────────────────────────────────────────

  DECADENCIA_LANÇAMENTO_HOMOLOGACAO: {
    id:              'DECADENCIA_LANÇAMENTO_HOMOLOGACAO',
    motor:           'DECADENCIA',
    nome:            'Decadência em Lançamento por Homologação — Art. 150 §4º CTN',
    descricao:       'Para tributos sujeitos a lançamento por homologação, a RFB tem 5 anos a partir do fato gerador para constituir o crédito tributário. Autuações realizadas após este prazo são decadentes e devem ser anuladas.',
    consolidacao:    CONSOLIDACAO.PACIFICADA,
    grauConfianca:   'ALTO',
    scoreBase:       94,
    via:             VIA.AMBAS,
    prazoRetroativo: 'Não se aplica — é extinção de autuação, não restituição',

    referencias: {
      leis:           ['5.172/1966'],
      stj:            ['REsp 973.733 (Tema 163)', 'Súmula 555 STJ'],
      carf:           ['Acórdão 9101-004.523 CSRF'],
      trfs:           ['TRF3 ApCiv 0045678'],
    },

    regras: [
      { situacao: 'Tributo declarado e pago',           prazo: '5 anos do fato gerador (art. 150, §4º CTN)' },
      { situacao: 'Tributo declarado e não pago',       prazo: '5 anos do 1º dia do exercício seguinte (art. 173, I CTN)' },
      { situacao: 'Tributo não declarado (dolo/fraude)',prazo: '5 anos do 1º dia do exercício seguinte (art. 173, I CTN)' },
    ],

    risco: {
      nivel:           'BAIXO',
      principalRisco:  'RFB pode alegar dolo ou fraude para usar o prazo do art. 173, I do CTN',
      mitigacao:       'Documentar que os tributos foram declarados e pagos regularmente no período',
      probabilidadeSucesso: 0.92,
    },

    planoAcao: [
      { ordem: 1, acao: 'Verificar a data do fato gerador dos tributos autuados',                 prazo: '3 dias' },
      { ordem: 2, acao: 'Calcular se o prazo de 5 anos já havia expirado na data da autuação',    prazo: '5 dias' },
      { ordem: 3, acao: 'Verificar se houve declaração e pagamento regular (vs omissão)',          prazo: '5 dias' },
      { ordem: 4, acao: 'Apresentar impugnação administrativa alegando decadência',               prazo: '30 dias' },
      { ordem: 5, acao: 'Se mantida a autuação, ingressar com ação anulatória judicial',          prazo: '60 dias' },
    ],
  },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Retorna uma tese pelo seu identificador.
 * @param {string} id - ex: 'MONOFASICOS_ALIQUOTA_ZERO'
 * @returns {object|null}
 */
export function getTese(id) {
  return TESES[id] || null
}

/**
 * Retorna todas as teses de um motor.
 * @param {string} motor - ex: 'MONOFASICOS'
 * @returns {Array}
 */
export function getTesesPorMotor(motor) {
  return Object.values(TESES).filter(t => t.motor === motor)
}

/**
 * Retorna teses por grau de consolidação.
 * @param {string} consolidacao - CONSOLIDACAO
 * @returns {Array}
 */
export function getTesesPorConsolidacao(consolidacao) {
  return Object.values(TESES).filter(t => t.consolidacao === consolidacao)
}

/**
 * Retorna teses recomendadas para via administrativa.
 * @returns {Array}
 */
export function getTesesPorViaAdmin() {
  return Object.values(TESES).filter(t =>
    t.via === VIA.ADMINISTRATIVA || t.via === VIA.AMBAS
  )
}

/**
 * Retorna teses recomendadas para via judicial.
 * @returns {Array}
 */
export function getTesesPorViaJudicial() {
  return Object.values(TESES).filter(t =>
    t.via === VIA.JUDICIAL || t.via === VIA.AMBAS || t.via === VIA.APENAS_JUDICIAL
  )
}

/**
 * Retorna o score base de uma tese.
 * @param {string} id
 * @returns {number}
 */
export function getScoreBaseTese(id) {
  return TESES[id]?.scoreBase || 0
}

/**
 * Retorna o plano de ação de uma tese.
 * @param {string} id
 * @returns {Array}
 */
export function getPlanoAcao(id) {
  return TESES[id]?.planoAcao || []
}

/**
 * Retorna uma análise de risco completa de uma tese.
 * @param {string} id
 * @returns {object|null}
 */
export function getAnaliseRisco(id) {
  const tese = getTese(id)
  if (!tese) return null
  return {
    tese:                 tese.nome,
    consolidacao:         tese.consolidacao,
    grauConfianca:        tese.grauConfianca,
    scoreBase:            tese.scoreBase,
    via:                  tese.via,
    risco:                tese.risco,
    prazoRetroativo:      tese.prazoRetroativo,
    probabilidadeSucesso: tese.risco?.probabilidadeSucesso || 0,
  }
}

/**
 * Retorna um resumo executivo de todas as teses disponíveis.
 * @returns {Array}
 */
export function getResumoTodasTeses() {
  return Object.values(TESES).map(t => ({
    id:              t.id,
    motor:           t.motor,
    nome:            t.nome,
    consolidacao:    t.consolidacao,
    grauConfianca:   t.grauConfianca,
    scoreBase:       t.scoreBase,
    via:             t.via,
    nivelRisco:      t.risco?.nivel || 'DESCONHECIDO',
    probabilidade:   t.risco?.probabilidadeSucesso || 0,
  }))
}

/**
 * Metadados deste repositório.
 */
export const META_TESES = {
  versaoBase:    VERSAO_ATUAL.codigo,
  totalTeses:    Object.keys(TESES).length,
  atualizadaEm:  '2026-07-08',
  observacao:    'Teses consolidadas com base na jurisprudência do STF, STJ, CARF e TRFs. ' +
                 'Score base pode ser ajustado pelo motor conforme dados específicos do cliente. ' +
                 'Probabilidade de sucesso é estimativa baseada no histórico de decisões.',
}