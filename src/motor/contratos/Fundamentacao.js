/**
 * Fundamentacao.js — FiscalTrib
 * Contrato para representação da fundamentação legal no Motor de Inteligência Tributária.
 *
 * Toda oportunidade identificada pelo motor deve ter sua fundamentação
 * legal registrada neste formato. Isso garante rastreabilidade jurídica
 * e padroniza a comunicação com o cliente e com autoridades fiscais.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

// ─────────────────────────────────────────────────────────────
// ENUMERAÇÕES
// ─────────────────────────────────────────────────────────────

export const TIPO_NORMA = {
  LEI_COMPLEMENTAR:  'LEI_COMPLEMENTAR',
  LEI_ORDINARIA:     'LEI_ORDINARIA',
  DECRETO:           'DECRETO',
  INSTRUCAO_NORMATIVA: 'INSTRUCAO_NORMATIVA',
  PORTARIA:          'PORTARIA',
  RESOLUCAO:         'RESOLUCAO',
  PARECER:           'PARECER',
  SUMULA:            'SUMULA',
  ACORDAO:           'ACORDAO',
  TESE_REPETITIVA:   'TESE_REPETITIVA',  // ex: Tema 69 STF
  SOLUCAO_CONSULTA:  'SOLUCAO_CONSULTA',
}

export const TRIBUNAL = {
  STF:   'STF',    // Supremo Tribunal Federal
  STJ:   'STJ',    // Superior Tribunal de Justiça
  CARF:  'CARF',   // Conselho Administrativo de Recursos Fiscais
  TRF1:  'TRF1',
  TRF2:  'TRF2',
  TRF3:  'TRF3',
  TRF4:  'TRF4',
  TRF5:  'TRF5',
  RFB:   'RFB',    // Receita Federal do Brasil (soluções de consulta)
  PGFN:  'PGFN',   // Procuradoria-Geral da Fazenda Nacional
}

export const FORCA_JURIDICA = {
  VINCULANTE:     'VINCULANTE',     // decisão de efeito vinculante (ex: RE com repercussão geral)
  PREDOMINANTE:   'PREDOMINANTE',   // jurisprudência majoritária
  FAVORAVEL:      'FAVORAVEL',      // decisões favoráveis mas não consolidadas
  CONTROVERSO:    'CONTROVERSO',    // tema ainda em discussão
  ADMINISTRATIVO: 'ADMINISTRATIVO', // entendimento administrativo (RFB, PGFN)
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Cria uma Fundamentacao vazia.
 * Todo motor deve usar esta função ao registrar o embasamento legal.
 *
 * @returns {object}
 */
export function criarFundamentacao() {
  return {

    // ─── Resumo ──────────────────────────────────────────────
    resumo:        '',   // explicação da fundamentação em linguagem simples
    tese:          '',   // nome da tese jurídica aplicada
    forcaJuridica: '',   // FORCA_JURIDICA

    // ─── Legislação ──────────────────────────────────────────
    legislacao: [
      // {
      //   tipo:       TIPO_NORMA,
      //   numero:     string,    // ex: '10.637/2002'
      //   artigo:     string,    // ex: 'Art. 3º'
      //   inciso:     string,    // ex: 'Inciso II'
      //   alinea:     string,
      //   paragrafo:  string,
      //   descricao:  string,    // o que esse dispositivo determina
      // }
    ],

    // ─── Jurisprudência ──────────────────────────────────────
    jurisprudencia: [
      // {
      //   tribunal:    TRIBUNAL,
      //   numero:      string,   // ex: 'RE 574.706'
      //   tema:        string,   // ex: 'Tema 69'
      //   data:        string,   // 'AAAA-MM-DD'
      //   ementa:      string,   // resumo da decisão
      //   aplicacao:   string,   // como se aplica ao caso concreto
      //   vinculante:  boolean,
      // }
    ],

    // ─── Soluções de consulta e pareceres ────────────────────
    solucoesConsulta: [
      // {
      //   orgao:     string,   // ex: 'RFB', 'PGFN'
      //   numero:    string,   // ex: 'SC COSIT nº 195/2014'
      //   data:      string,
      //   resumo:    string,
      // }
    ],

    // ─── Regras internas do motor ────────────────────────────
    // Documenta qual regra do motor identificou esta oportunidade.
    regraMotor: {
      id:          '',   // identificador da regra (ex: 'MONO_NCM_001')
      descricao:   '',   // o que a regra verifica
      criterios:   [],   // [string] — critérios aplicados
      versao:      '',   // versão da regra
    },

    // ─── Observações técnicas ────────────────────────────────
    observacoesTecnicas: '',   // notas relevantes para o consultor
    ressalvas:           '',   // limitações ou condições desta fundamentação
    dataVigencia:        '',   // desde quando esta fundamentação é válida
  }
}

// ─────────────────────────────────────────────────────────────
// FUNDAMENTAÇÕES PRÉ-DEFINIDAS
// Prontas para uso pelos motores — evita duplicação de código.
// ─────────────────────────────────────────────────────────────

/**
 * Fundamentação padrão para Receitas Monofásicas (PIS/COFINS).
 */
export function fundamentacaoMonofasicos() {
  const f = criarFundamentacao()
  f.tese          = 'Exclusão de Receitas Monofásicas da Base do PIS/COFINS'
  f.forcaJuridica = FORCA_JURIDICA.VINCULANTE
  f.resumo        = 'Produtos sujeitos ao regime monofásico de PIS/COFINS ' +
                    '(combustíveis, farmacêuticos, bebidas, cosméticos, cereais) ' +
                    'têm alíquota zero na revenda. O recolhimento indevido gera ' +
                    'direito à restituição via PER/DCOMP pelos últimos 5 anos.'
  f.legislacao = [
    { tipo: TIPO_NORMA.LEI_ORDINARIA, numero: '10.147/2000', artigo: 'Art. 2º',
      descricao: 'Estabelece alíquota zero de PIS/COFINS para revendedores de produtos farmacêuticos e de higiene.' },
    { tipo: TIPO_NORMA.LEI_ORDINARIA, numero: '10.560/2002', artigo: 'Art. 4º',
      descricao: 'Alíquota zero de PIS/COFINS para revendedores de combustíveis.' },
    { tipo: TIPO_NORMA.LEI_ORDINARIA, numero: '10.833/2003', artigo: 'Art. 2º',
      descricao: 'Regime não cumulativo de COFINS e tratamento monofásico.' },
    { tipo: TIPO_NORMA.INSTRUCAO_NORMATIVA, numero: 'IN RFB 2.121/2022',
      descricao: 'Consolida as normas de PIS/COFINS, incluindo o regime monofásico.' },
  ]
  f.jurisprudencia = [
    { tribunal: TRIBUNAL.STJ, numero: 'REsp 1.109.034', tema: 'Monofasia PIS/COFINS',
      ementa: 'Contribuinte revendedor não pode ser onerado com alíquotas cheias de PIS/COFINS em produtos sujeitos ao regime monofásico.',
      aplicacao: 'Sustenta o direito à restituição do PIS/COFINS recolhido indevidamente na revenda.', vinculante: false },
  ]
  f.regraMotor = { id: 'MONO_NCM_001', descricao: 'Identificação de NCM monofásico nos itens da NF-e', versao: '1.0',
    criterios: ['NCM consta na tabela de produtos monofásicos', 'Nota é de saída (tpNF=1)', 'PIS/COFINS foram recolhidos'] }
  f.dataVigencia = '2000-01-01'
  return f
}

/**
 * Fundamentação padrão para Exclusão do ICMS da Base PIS/COFINS (Tema 69 STF).
 */
export function fundamentacaoTema69() {
  const f = criarFundamentacao()
  f.tese          = 'Exclusão do ICMS da Base de Cálculo do PIS/COFINS — Tema 69 STF'
  f.forcaJuridica = FORCA_JURIDICA.VINCULANTE
  f.resumo        = 'O STF decidiu (RE 574.706) que o ICMS não integra a base de ' +
                    'cálculo do PIS/COFINS, pois não representa faturamento. ' +
                    'Empresas têm direito aos créditos dos últimos 5 anos.'
  f.legislacao = [
    { tipo: TIPO_NORMA.LEI_COMPLEMENTAR, numero: '70/1991', artigo: 'Art. 2º',
      descricao: 'Define base de cálculo da COFINS como faturamento mensal.' },
    { tipo: TIPO_NORMA.LEI_ORDINARIA, numero: '9.718/1998', artigo: 'Art. 3º',
      descricao: 'Define receita bruta para fins de PIS/COFINS.' },
  ]
  f.jurisprudencia = [
    { tribunal: TRIBUNAL.STF, numero: 'RE 574.706', tema: 'Tema 69',
      data: '2017-03-15', vinculante: true,
      ementa: 'O ICMS não compõe a base de cálculo para fins de incidência do PIS e da COFINS.',
      aplicacao: 'Permite exclusão do ICMS destacado nas NF-es da base de PIS/COFINS e recuperação dos últimos 5 anos.' },
  ]
  f.regraMotor = { id: 'TEMA69_001', descricao: 'Identificação de ICMS destacado na base de PIS/COFINS', versao: '1.0',
    criterios: ['vBC > 0', 'vICMS > 0', 'Regime Lucro Presumido ou Lucro Real'] }
  f.dataVigencia = '2017-03-15'
  return f
}

/**
 * Fundamentação padrão para ICMS-ST na Base do Simples Nacional.
 */
export function fundamentacaoICMSST() {
  const f = criarFundamentacao()
  f.tese          = 'Exclusão do ICMS-ST da Base de Cálculo do Simples Nacional'
  f.forcaJuridica = FORCA_JURIDICA.VINCULANTE
  f.resumo        = 'O STJ decidiu que o ICMS retido por substituição tributária ' +
                    'não deve compor a base de cálculo do Simples Nacional, ' +
                    'gerando direito à restituição dos últimos 5 anos.'
  f.legislacao = [
    { tipo: TIPO_NORMA.LEI_COMPLEMENTAR, numero: '123/2006', artigo: 'Art. 2º e 13º',
      descricao: 'Define receita bruta e base de cálculo do Simples Nacional.' },
  ]
  f.jurisprudencia = [
    { tribunal: TRIBUNAL.STJ, numero: 'REsp 1.624.297', tema: 'ICMS-ST Simples Nacional',
      data: '2020-02-20', vinculante: false,
      ementa: 'O ICMS retido por substituição tributária não integra a receita bruta para fins de cálculo do Simples Nacional.',
      aplicacao: 'Sustenta exclusão do ICMS-ST da base do DAS e recuperação do indébito.' },
  ]
  f.regraMotor = { id: 'ICMSST_001', descricao: 'Identificação de ICMS-ST em notas de saída', versao: '1.0',
    criterios: ['CST em [10,30,60,70,90]', 'vItemST > 0', 'Regime Simples Nacional'] }
  f.dataVigencia = '2020-02-20'
  return f
}