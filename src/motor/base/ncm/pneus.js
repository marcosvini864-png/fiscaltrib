/**
 * pneus.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de NCMs e regras tributárias para pneus e câmaras de ar.
 *
 * Pneus e câmaras estão sujeitos a:
 * — Substituição Tributária de ICMS (Convênio ICMS 142/2018)
 * — PIS/COFINS — regime geral não cumulativo (Lucro Real)
 *   ou cumulativo (Lucro Presumido/Simples Nacional)
 * — IPI — Tabela TIPI Capítulo 40
 * — RECAUCHUTAGEM: tratamento tributário diferenciado
 *
 * IMPORTANTE: Pneus NÃO estão sujeitos ao regime monofásico
 * de PIS/COFINS. O principal benefício tributário para este
 * setor é a exclusão do ICMS-ST da base de PIS/COFINS e
 * créditos de PIS/COFINS no regime não cumulativo.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DE PNEUS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_PNEU = {
  PNEU_PASSEIO:        'PNEU_PASSEIO',
  PNEU_CAMINHAO:       'PNEU_CAMINHAO',
  PNEU_MOTO:           'PNEU_MOTO',
  PNEU_BICICLETA:      'PNEU_BICICLETA',
  PNEU_AGRICOLA:       'PNEU_AGRICOLA',
  PNEU_INDUSTRIAL:     'PNEU_INDUSTRIAL',
  PNEU_AVIAO:          'PNEU_AVIAO',
  PNEU_RECAUCHUTADO:   'PNEU_RECAUCHUTADO',
  CAMARA_AR:           'CAMARA_AR',
  PROTETORES:          'PROTETORES',
}

// ─────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DE PNEUS E CÂMARAS
// ─────────────────────────────────────────────────────────────

export const TABELA_PNEUS = [

  // ── NCM 4011 — PNEUS NOVOS ───────────────────────────────────────
  { ncm: '4011',
    descricao: 'Pneus novos de borracha — todos os tipos',
    categoria: CATEGORIAS_PNEU.PNEU_PASSEIO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'NCM genérico para pneus novos — detalhar pelo subitem.' },

  { ncm: '4011.10',
    descricao: 'Pneus novos para automóveis de passageiros — incluindo veículos de uso misto e de corrida',
    categoria: CATEGORIAS_PNEU.PNEU_PASSEIO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4011.20',
    descricao: 'Pneus novos para ônibus e caminhões',
    categoria: CATEGORIAS_PNEU.PNEU_CAMINHAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4011.30',
    descricao: 'Pneus novos para aviões',
    categoria: CATEGORIAS_PNEU.PNEU_AVIAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    baseLegal: 'Lei 10.637/2002',
    obs: 'Pneus para aviação — não sujeitos ao ICMS-ST do Convênio 142/2018.' },

  { ncm: '4011.40',
    descricao: 'Pneus novos para motocicletas',
    categoria: CATEGORIAS_PNEU.PNEU_MOTO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4011.50',
    descricao: 'Pneus novos para bicicletas',
    categoria: CATEGORIAS_PNEU.PNEU_BICICLETA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 9.718/1998',
    obs: 'Pneus de bicicleta — alíquotas menores que os demais pneus.' },

  { ncm: '4011.61',
    descricao: 'Pneus novos para máquinas e veículos agrícolas — espinha de peixe',
    categoria: CATEGORIAS_PNEU.PNEU_AGRICOLA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0, aliqCOFINS: 0,
    aliqIPI: 0,
    baseLegal: 'Lei 10.925/2004',
    obs: 'Pneus agrícolas — alíquota zero de PIS/COFINS (uso na agropecuária).' },

  { ncm: '4011.62',
    descricao: 'Pneus novos para máquinas e veículos de construção ou industriais — aro ≤ 61cm',
    categoria: CATEGORIAS_PNEU.PNEU_INDUSTRIAL,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    baseLegal: 'Lei 10.637/2002',
    obs: 'Pneus industriais — regime geral sem ST nacional.' },

  { ncm: '4011.63',
    descricao: 'Pneus novos para máquinas e veículos de construção ou industriais — aro > 61cm',
    categoria: CATEGORIAS_PNEU.PNEU_INDUSTRIAL,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    baseLegal: 'Lei 10.637/2002' },

  { ncm: '4011.92',
    descricao: 'Outros pneus novos com espinha de peixe ou semelhante',
    categoria: CATEGORIAS_PNEU.PNEU_AGRICOLA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0, aliqCOFINS: 0,
    aliqIPI: 0,
    baseLegal: 'Lei 10.925/2004',
    obs: 'Similares a agrícolas — alíquota zero.' },

  { ncm: '4011.99',
    descricao: 'Outros pneus novos de borracha não classificados',
    categoria: CATEGORIAS_PNEU.PNEU_PASSEIO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── NCM 4012 — PNEUS RECAUCHUTADOS E USADOS ─────────────────────
  { ncm: '4012',
    descricao: 'Pneus recauchutados ou usados de borracha',
    categoria: CATEGORIAS_PNEU.PNEU_RECAUCHUTADO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Pneus recauchutados têm o mesmo tratamento tributário dos novos.' },

  { ncm: '4012.11',
    descricao: 'Pneus recauchutados para automóveis de passageiros',
    categoria: CATEGORIAS_PNEU.PNEU_RECAUCHUTADO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4012.12',
    descricao: 'Pneus recauchutados para ônibus e caminhões',
    categoria: CATEGORIAS_PNEU.PNEU_RECAUCHUTADO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4012.13',
    descricao: 'Pneus recauchutados para aviões',
    categoria: CATEGORIAS_PNEU.PNEU_AVIAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    baseLegal: 'Lei 10.637/2002' },

  { ncm: '4012.19',
    descricao: 'Outros pneus recauchutados',
    categoria: CATEGORIAS_PNEU.PNEU_RECAUCHUTADO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4012.20',
    descricao: 'Pneus usados de borracha',
    categoria: CATEGORIAS_PNEU.PNEU_RECAUCHUTADO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    baseLegal: 'Lei 9.718/1998',
    obs: 'Pneus usados — não sujeitos ao ICMS-ST.' },

  { ncm: '4012.90',
    descricao: 'Protetores, flaps e outros — bandas de rodagem removíveis',
    categoria: CATEGORIAS_PNEU.PROTETORES,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── NCM 4013 — CÂMARAS DE AR ─────────────────────────────────────
  { ncm: '4013',
    descricao: 'Câmaras de ar de borracha — todos os tipos',
    categoria: CATEGORIAS_PNEU.CAMARA_AR,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4013.10',
    descricao: 'Câmaras de ar para automóveis, ônibus e caminhões',
    categoria: CATEGORIAS_PNEU.CAMARA_AR,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4013.20',
    descricao: 'Câmaras de ar para bicicletas',
    categoria: CATEGORIAS_PNEU.CAMARA_AR,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 9.718/1998' },

  { ncm: '4013.90',
    descricao: 'Outras câmaras de ar — motos, agrícolas, industriais',
    categoria: CATEGORIAS_PNEU.CAMARA_AR,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_PNEUS.map(item => [item.ncm.replace(/\D/g, ''), item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é pneu ou câmara de ar.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isPneu(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  return n.startsWith('4011') || n.startsWith('4012') || n.startsWith('4013')
}

/**
 * Retorna o registro completo de um pneu ou câmara.
 * @param {string} ncm
 * @returns {object|null}
 */
export function getPneu(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const len of [6, 4]) {
    const prefixo = n.slice(0, len)
    for (const [chave, registro] of _indice) {
      if (chave === prefixo || prefixo.startsWith(chave)) return registro
    }
  }
  return null
}

/**
 * Verifica se o pneu está sujeito ao ICMS-ST.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isPneuComST(ncm) {
  const registro = getPneu(ncm)
  return registro?.icmsST === true
}

/**
 * Verifica se é câmara de ar.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isCamaraAr(ncm) {
  if (!ncm) return false
  return ncm.replace(/\D/g, '').startsWith('4013')
}

/**
 * Verifica se é pneu agrícola (alíquota zero PIS/COFINS).
 * @param {string} ncm
 * @returns {boolean}
 */
export function isPneuAgricola(ncm) {
  const registro = getPneu(ncm)
  return registro?.categoria === CATEGORIAS_PNEU.PNEU_AGRICOLA
}

/**
 * Retorna pneus por categoria.
 * @param {string} categoria
 * @returns {Array}
 */
export function getPneusPorCategoria(categoria) {
  return TABELA_PNEUS.filter(item => item.categoria === categoria)
}

/**
 * Retorna todos os pneus sujeitos ao ICMS-ST.
 * @returns {Array}
 */
export function getPneusComST() {
  return TABELA_PNEUS.filter(item => item.icmsST === true)
}

/**
 * Retorna as alíquotas de PIS/COFINS para pneus.
 * @param {string} ncm
 * @returns {{ aliqPIS: number, aliqCOFINS: number }}
 */
export function getAliquotasPneu(ncm) {
  const registro = getPneu(ncm)
  if (!registro) return { aliqPIS: 1.65, aliqCOFINS: 7.60 }
  return { aliqPIS: registro.aliqPIS, aliqCOFINS: registro.aliqCOFINS }
}

/**
 * Metadados desta tabela.
 */
export const META_PNEUS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalNCMs:    TABELA_PNEUS.length,
  atualizadaEm: '2026-07-08',
  baseLegal: [
    'Lei 10.485/2002', 'Convênio ICMS 142/2018',
    'Lei 10.925/2004', 'IN RFB 2.121/2022',
  ],
  observacao: 'Pneus NÃO são monofásicos de PIS/COFINS. ' +
              'Pneus agrícolas (4011.61 e 4011.92): alíquota zero. ' +
              'Principal oportunidade: exclusão do ICMS-ST da base de PIS/COFINS (Tema 69). ' +
              'Pneus usados (4012.20) não estão sujeitos ao ICMS-ST.',
}