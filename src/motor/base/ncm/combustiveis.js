/**
 * combustiveis.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de NCMs e regras tributárias para combustíveis e lubrificantes.
 *
 * Combustíveis estão sujeitos simultaneamente a:
 * — Regime monofásico de PIS/COFINS (Lei 9.718/1998, Lei 10.336/2001)
 * — Substituição Tributária de ICMS (Convênio ICMS 110/2007)
 * — CIDE-Combustíveis (Lei 10.336/2001)
 * — Alíquotas específicas de IPI (Tabela TIPI)
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DE COMBUSTÍVEIS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_COMBUSTIVEL = {
  GASOLINA:          'GASOLINA',
  DIESEL:            'DIESEL',
  GLP:               'GLP',
  GAS_NATURAL:       'GAS_NATURAL',
  ETANOL:            'ETANOL',
  QUEROSENE:         'QUEROSENE',
  OLEO_LUBRIFICANTE: 'OLEO_LUBRIFICANTE',
  OLEO_BRUTO:        'OLEO_BRUTO',
  OUTROS:            'OUTROS',
}

// ─────────────────────────────────────────────────────────────
// TABELA DE COMBUSTÍVEIS
// ─────────────────────────────────────────────────────────────

export const TABELA_COMBUSTIVEIS = [

  // ── ÓLEOS BRUTOS ─────────────────────────────────────────────────
  { ncm: '2709', descricao: 'Óleos brutos de petróleo ou de minerais betuminosos',
    categoria: CATEGORIAS_COMBUSTIVEL.OLEO_BRUTO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: false,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 9.718/1998 Art. 4º' },

  // ── DERIVADOS DE PETRÓLEO ────────────────────────────────────────
  { ncm: '2710.12.59', descricao: 'Gasolina automotiva',
    categoria: CATEGORIAS_COMBUSTIVEL.GASOLINA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: true,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    aliqCIDE: 0.10,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 10.336/2001 Art. 4º',
    obs: 'CIDE: R$0,10/litro (gasolina pura) ou R$0,084/litro (gasolina C)' },

  { ncm: '2710.19.21', descricao: 'Óleo diesel',
    categoria: CATEGORIAS_COMBUSTIVEL.DIESEL,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: true,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    aliqCIDE: 0.05,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 10.336/2001 Art. 4º',
    obs: 'CIDE: R$0,05/litro' },

  { ncm: '2710.19.11', descricao: 'Querosene de aviação (QAV)',
    categoria: CATEGORIAS_COMBUSTIVEL.QUEROSENE,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: true,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    aliqCIDE: 0.05,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 10.336/2001 Art. 4º' },

  { ncm: '2710.19.31', descricao: 'Óleos lubrificantes',
    categoria: CATEGORIAS_COMBUSTIVEL.OLEO_LUBRIFICANTE,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: false,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 9.718/1998 Art. 4º' },

  // ── GÁS ──────────────────────────────────────────────────────────
  { ncm: '2711.12', descricao: 'Propano liquefeito (GLP)',
    categoria: CATEGORIAS_COMBUSTIVEL.GLP,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: true,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    aliqCIDE: 0.05,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 10.336/2001 Art. 4º' },

  { ncm: '2711.13', descricao: 'Butano liquefeito (GLP)',
    categoria: CATEGORIAS_COMBUSTIVEL.GLP,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: true,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    aliqCIDE: 0.05,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 10.336/2001 Art. 4º' },

  { ncm: '2711.21', descricao: 'Gás natural em estado gasoso',
    categoria: CATEGORIAS_COMBUSTIVEL.GAS_NATURAL,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: false,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 10.336/2001 Art. 4º' },

  // ── ETANOL ───────────────────────────────────────────────────────
  { ncm: '2207.10.00', descricao: 'Álcool etílico não desnaturado — etanol combustível',
    categoria: CATEGORIAS_COMBUSTIVEL.ETANOL,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true, cide: true,
    aliqPIS: 1.50, aliqCOFINS: 6.90,
    aliqCIDE: 0.00,
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 10.336/2001 Art. 4º',
    obs: 'CIDE com alíquota zero conforme Dec. 5.060/2004' },

  // ── OUTROS DERIVADOS ─────────────────────────────────────────────
  { ncm: '2712', descricao: 'Vaselina, parafina, ceras de petróleo',
    categoria: CATEGORIAS_COMBUSTIVEL.OUTROS,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: false, cide: false,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    baseLegal: 'Lei 9.718/1998 Art. 4º' },

  { ncm: '2713', descricao: 'Coque de petróleo e resíduos de óleos',
    categoria: CATEGORIAS_COMBUSTIVEL.OUTROS,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: false, cide: false,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    baseLegal: 'Lei 9.718/1998 Art. 4º' },

  { ncm: '2714', descricao: 'Betume de petróleo, asfalto natural',
    categoria: CATEGORIAS_COMBUSTIVEL.OUTROS,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: false, cide: false,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    baseLegal: 'Lei 9.718/1998 Art. 4º' },

  { ncm: '2715', descricao: 'Misturas betuminosas',
    categoria: CATEGORIAS_COMBUSTIVEL.OUTROS,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: false, cide: false,
    aliqPIS: 5.08, aliqCOFINS: 23.44,
    baseLegal: 'Lei 9.718/1998 Art. 4º' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_COMBUSTIVEIS.map(item => [item.ncm, item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é combustível.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isCombustivel(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave] of _indice) {
    if (n.startsWith(chave.replace(/\D/g, ''))) return true
  }
  return false
}

/**
 * Retorna o registro completo de um combustível.
 * @param {string} ncm
 * @returns {object|null}
 */
export function getCombustivel(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const [chave, registro] of _indice) {
    if (n.startsWith(chave.replace(/\D/g, ''))) return registro
  }
  return null
}

/**
 * Verifica se o combustível está sujeito à CIDE.
 * @param {string} ncm
 * @returns {boolean}
 */
export function temCIDE(ncm) {
  const registro = getCombustivel(ncm)
  return registro?.cide === true
}

/**
 * Retorna combustíveis por categoria.
 * @param {string} categoria
 * @returns {Array}
 */
export function getCombustiveisPorCategoria(categoria) {
  return TABELA_COMBUSTIVEIS.filter(item => item.categoria === categoria)
}

/**
 * Retorna todos os combustíveis sujeitos ao ICMS-ST.
 * @returns {Array}
 */
export function getCombustiveisComST() {
  return TABELA_COMBUSTIVEIS.filter(item => item.icmsST === true)
}

/**
 * Metadados desta tabela.
 */
export const META_COMBUSTIVEIS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalNCMs:    TABELA_COMBUSTIVEIS.length,
  atualizadaEm: '2026-07-08',
  baseLegal:    [
    'Lei 9.718/1998', 'Lei 10.336/2001',
    'Convênio ICMS 110/2007', 'Dec. 5.060/2004',
  ],
  observacao: 'Alíquotas de PIS/COFINS incidem sobre o fabricante/importador. ' +
              'Revendedor tem alíquota zero. CIDE incide sobre o produtor/importador.',
}