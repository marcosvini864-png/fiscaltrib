/**
 * cosmeticos.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de NCMs e regras tributárias para perfumes, cosméticos e higiene pessoal.
 *
 * Produtos de perfumaria e cosméticos estão sujeitos a:
 * — Regime monofásico de PIS/COFINS (Lei 10.147/2000)
 * — Substituição Tributária de ICMS (Convênio ICMS 70/1997)
 * — IPI — Tabela TIPI Capítulo 33
 * — ANVISA — registro obrigatório conforme RDC 752/2022
 *
 * IMPORTANTE: Cosméticos são divididos em dois grupos pela ANVISA:
 * — Grau 1: baixo risco (notificação)
 * — Grau 2: maior risco (registro)
 * Essa classificação não altera o regime tributário mas é relevante
 * para fins de auditoria e análise de conformidade.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DE COSMÉTICOS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_COSMETICO = {
  PERFUME:              'PERFUME',
  MAQUIAGEM:            'MAQUIAGEM',
  CUIDADOS_PELE:        'CUIDADOS_PELE',
  CUIDADOS_CABELO:      'CUIDADOS_CABELO',
  HIGIENE_BUCAL:        'HIGIENE_BUCAL',
  HIGIENE_PESSOAL:      'HIGIENE_PESSOAL',
  DESODORANTE:          'DESODORANTE',
  PRODUTO_BARBEAR:      'PRODUTO_BARBEAR',
  PROTETOR_SOLAR:       'PROTETOR_SOLAR',
  COSMÉTICO_INFANTIL:   'COSMETICO_INFANTIL',
  COSMÉTICO_MASCULINO:  'COSMETICO_MASCULINO',
  TINTURA_CABELO:       'TINTURA_CABELO',
  PRODUTO_UNHAS:        'PRODUTO_UNHAS',
}

// ─────────────────────────────────────────────────────────────
// GRAU ANVISA
// ─────────────────────────────────────────────────────────────

export const GRAU_ANVISA = {
  GRAU_1: 'GRAU_1',   // baixo risco — notificação
  GRAU_2: 'GRAU_2',   // maior risco — registro
  NAO_SE_APLICA: 'NAO_SE_APLICA',
}

// ─────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DE COSMÉTICOS
// ─────────────────────────────────────────────────────────────

export const TABELA_COSMETICOS = [

  // ── NCM 3303 — PERFUMES E ÁGUAS DE COLÔNIA ───────────────────────
  { ncm: '3303',
    descricao: 'Perfumes e águas de colônia',
    categoria: CATEGORIAS_COSMETICO.PERFUME,
    grauANVISA: GRAU_ANVISA.GRAU_2,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Inclui perfumes masculinos, femininos e unissex. Revendedor: alíquota zero.' },

  { ncm: '3303.00.10',
    descricao: 'Perfumes (extratos)',
    categoria: CATEGORIAS_COSMETICO.PERFUME,
    grauANVISA: GRAU_ANVISA.GRAU_2,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3303.00.20',
    descricao: 'Águas de colônia',
    categoria: CATEGORIAS_COSMETICO.PERFUME,
    grauANVISA: GRAU_ANVISA.GRAU_2,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  // ── NCM 3304 — PRODUTOS DE BELEZA E MAQUIAGEM ────────────────────
  { ncm: '3304',
    descricao: 'Produtos de beleza ou de maquiagem e preparações para conservação ou cuidados da pele',
    categoria: CATEGORIAS_COSMETICO.MAQUIAGEM,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Inclui base, batom, blush, sombra, rímel, corretivo, iluminador.' },

  { ncm: '3304.10',
    descricao: 'Preparações para maquiagem dos lábios — batons, lip gloss',
    categoria: CATEGORIAS_COSMETICO.MAQUIAGEM,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3304.20',
    descricao: 'Preparações para maquiagem dos olhos — rímel, sombra, delineador',
    categoria: CATEGORIAS_COSMETICO.MAQUIAGEM,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3304.30',
    descricao: 'Preparações para manicure e pedicure — esmaltes, removedores',
    categoria: CATEGORIAS_COSMETICO.PRODUTO_UNHAS,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3304.91',
    descricao: 'Pós para maquiagem — pó compacto, pó solto, talco facial',
    categoria: CATEGORIAS_COSMETICO.MAQUIAGEM,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3304.99',
    descricao: 'Outros produtos de beleza — cremes, loções, protetores solares, tônicos',
    categoria: CATEGORIAS_COSMETICO.CUIDADOS_PELE,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Inclui protetores solares, cremes anti-idade, hidratantes.' },

  // ── NCM 3305 — PREPARAÇÕES CAPILARES ─────────────────────────────
  { ncm: '3305',
    descricao: 'Preparações capilares — shampoos, condicionadores, tinturas, fixadores',
    categoria: CATEGORIAS_COSMETICO.CUIDADOS_CABELO,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3305.10',
    descricao: 'Xampus (shampoos)',
    categoria: CATEGORIAS_COSMETICO.CUIDADOS_CABELO,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3305.20',
    descricao: 'Preparações para ondulação ou alisamento permanente dos cabelos',
    categoria: CATEGORIAS_COSMETICO.CUIDADOS_CABELO,
    grauANVISA: GRAU_ANVISA.GRAU_2,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Progressivas, relaxamentos e permanentes — Grau 2 ANVISA.' },

  { ncm: '3305.30',
    descricao: 'Laquês para o cabelo — sprays fixadores',
    categoria: CATEGORIAS_COSMETICO.CUIDADOS_CABELO,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3305.90',
    descricao: 'Outras preparações capilares — condicionadores, máscaras, finalizadores',
    categoria: CATEGORIAS_COSMETICO.CUIDADOS_CABELO,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  // ── NCM 3305 — TINTURAS DE CABELO ────────────────────────────────
  { ncm: '3305.90.00',
    descricao: 'Tinturas e colorações para cabelo',
    categoria: CATEGORIAS_COSMETICO.TINTURA_CABELO,
    grauANVISA: GRAU_ANVISA.GRAU_2,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Tinturas oxidativas são Grau 2 ANVISA — exigem registro.' },

  // ── NCM 3306 — HIGIENE BUCAL ──────────────────────────────────────
  { ncm: '3306',
    descricao: 'Preparações para higiene bucal ou dentária — dentifrícios, fios dentais, enxaguantes',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_BUCAL,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3306.10',
    descricao: 'Dentifrícios — cremes dentais, géis dentais',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_BUCAL,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3306.20',
    descricao: 'Fios utilizados para limpar os espaços interdentais — fio dental',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_BUCAL,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3306.90',
    descricao: 'Outros — enxaguantes bucais, branqueadores dentais',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_BUCAL,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  // ── NCM 3307 — OUTROS PRODUTOS DE HIGIENE ────────────────────────
  { ncm: '3307',
    descricao: 'Preparações para barba, desodorantes, sais de banho, depilatórios',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_PESSOAL,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3307.10',
    descricao: 'Preparações para barbear — antes, durante e após',
    categoria: CATEGORIAS_COSMETICO.PRODUTO_BARBEAR,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Inclui cremes de barbear, espumas, pós after-shave, loções.' },

  { ncm: '3307.20',
    descricao: 'Desodorantes corporais e antiperspirantes',
    categoria: CATEGORIAS_COSMETICO.DESODORANTE,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Roll-on, spray, creme e stick — todos neste NCM.' },

  { ncm: '3307.30',
    descricao: 'Sais perfumados e outras preparações para banhos',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_PESSOAL,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º' },

  { ncm: '3307.41',
    descricao: 'Agarbatti e outras preparações odoríferas — incensos',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_PESSOAL,
    grauANVISA: GRAU_ANVISA.NAO_SE_APLICA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    aliqRevendedor: { aliqPIS: 0.65, aliqCOFINS: 3.00 },
    aliqIPI: 0,
    baseLegal: 'Lei 9.718/1998',
    obs: 'Incensos não estão na lista monofásica — regime geral.' },

  { ncm: '3307.49',
    descricao: 'Outras preparações para perfumar ou desodorizar ambientes',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_PESSOAL,
    grauANVISA: GRAU_ANVISA.NAO_SE_APLICA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    aliqRevendedor: { aliqPIS: 0.65, aliqCOFINS: 3.00 },
    aliqIPI: 0,
    baseLegal: 'Lei 9.718/1998',
    obs: 'Aromatizadores de ambiente — regime geral de PIS/COFINS.' },

  { ncm: '3307.90',
    descricao: 'Outros — depilatórios, produtos para banho, higiene íntima',
    categoria: CATEGORIAS_COSMETICO.HIGIENE_PESSOAL,
    grauANVISA: GRAU_ANVISA.GRAU_1,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 70/1997',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Inclui depilatórios, géis de banho, sabonetes líquidos.' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_COSMETICOS.map(item => [item.ncm.replace(/\D/g, ''), item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é cosmético/perfumaria.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isCosmetico(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  return n.startsWith('3303') || n.startsWith('3304') ||
         n.startsWith('3305') || n.startsWith('3306') ||
         n.startsWith('3307')
}

/**
 * Retorna o registro completo de um cosmético.
 * @param {string} ncm
 * @returns {object|null}
 */
export function getCosmetico(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  // busca do mais específico para o mais genérico
  for (const len of [8, 6, 4]) {
    const prefixo = n.slice(0, len)
    for (const [chave, registro] of _indice) {
      if (chave.startsWith(prefixo) || prefixo.startsWith(chave)) return registro
    }
  }
  return null
}

/**
 * Verifica se o cosmético é monofásico.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isCosmeticoMonofasico(ncm) {
  const registro = getCosmetico(ncm)
  return registro?.monofasicoPIS === true
}

/**
 * Retorna o grau ANVISA do produto.
 * @param {string} ncm
 * @returns {string|null}
 */
export function getGrauANVISA(ncm) {
  const registro = getCosmetico(ncm)
  return registro?.grauANVISA || null
}

/**
 * Retorna as alíquotas do revendedor.
 * Para monofásicos: zero. Para não monofásicos: regime geral.
 * @param {string} ncm
 * @returns {{ aliqPIS: number, aliqCOFINS: number }}
 */
export function getAliquotasRevendedorCosmetico(ncm) {
  const registro = getCosmetico(ncm)
  if (!registro) return { aliqPIS: 0.65, aliqCOFINS: 3.00 }
  return registro.aliqRevendedor || { aliqPIS: 0, aliqCOFINS: 0 }
}

/**
 * Retorna cosméticos por categoria.
 * @param {string} categoria
 * @returns {Array}
 */
export function getCosmeticosPorCategoria(categoria) {
  return TABELA_COSMETICOS.filter(item => item.categoria === categoria)
}

/**
 * Retorna todos os cosméticos sujeitos ao ICMS-ST.
 * @returns {Array}
 */
export function getCosmeticosComST() {
  return TABELA_COSMETICOS.filter(item => item.icmsST === true)
}

/**
 * Metadados desta tabela.
 */
export const META_COSMETICOS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalNCMs:    TABELA_COSMETICOS.length,
  atualizadaEm: '2026-07-08',
  baseLegal: [
    'Lei 10.147/2000', 'Convênio ICMS 70/1997',
    'IN RFB 2.121/2022', 'RDC ANVISA 752/2022',
  ],
  observacao: 'NCMs 3307.41 e 3307.49 (aromatizadores de ambiente) ' +
              'não estão na lista monofásica — regime geral de PIS/COFINS. ' +
              'Grau ANVISA não altera regime tributário mas é relevante para conformidade.',
}