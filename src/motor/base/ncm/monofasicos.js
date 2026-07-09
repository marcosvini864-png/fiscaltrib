/**
 * monofasicos.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela oficial de NCMs sujeitos ao regime monofásico de PIS/COFINS.
 *
 * O regime monofásico concentra a tributação de PIS/COFINS no fabricante
 * ou importador, com alíquota zero para revendedores. Revendedores que
 * recolhem PIS/COFINS sobre esses produtos têm direito à restituição.
 *
 * Base legal: Leis 10.147/2000, 10.560/2002, 10.833/2003, 9.718/1998
 * IN RFB 2.121/2022
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS MONOFÁSICAS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_MONOFASICAS = {
  COMBUSTIVEIS:        'COMBUSTIVEIS',
  FARMACEUTICOS:       'FARMACEUTICOS',
  PERFUMES_COSMETICOS: 'PERFUMES_COSMETICOS',
  BEBIDAS:             'BEBIDAS',
  EMBALAGENS_BEBIDAS:  'EMBALAGENS_BEBIDAS',
  VEICULOS:            'VEICULOS',
  AUTOPECAS:           'AUTOPECAS',
  PNEUS_CAMARAS:       'PNEUS_CAMARAS',
  CEREAIS:             'CEREAIS',
  BORRACHA:            'BORRACHA',
}

// ─────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DE NCMs MONOFÁSICOS
// Formato: { ncm, descricao, categoria, baseLegal, aliqPIS, aliqCOFINS, obs }
// aliqPIS e aliqCOFINS = alíquota do fabricante (revendedor = 0%)
// ─────────────────────────────────────────────────────────────

export const TABELA_NCM_MONOFASICOS = [

  // ── COMBUSTÍVEIS E LUBRIFICANTES (Lei 9.718/1998 e 10.336/2001) ──
  { ncm: '2701', descricao: 'Hulhas e coque de hulha',                    categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2702', descricao: 'Linhito',                                     categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2703', descricao: 'Turfa',                                       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2704', descricao: 'Coque de carvão mineral',                    categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2705', descricao: 'Gás de carvão, gás de água',                 categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2706', descricao: 'Alcatrões de hulha, linhito ou turfa',       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2707', descricao: 'Óleos e outros produtos da destilação',      categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2708', descricao: 'Breu e coque de breu',                       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2709', descricao: 'Óleos brutos de petróleo',                   categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º' },
  { ncm: '2710', descricao: 'Óleos de petróleo — gasolina, diesel, QAV',  categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º' },
  { ncm: '2711', descricao: 'Gás natural, GLP, butano, propano',          categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º' },
  { ncm: '2712', descricao: 'Vaselina, parafina, ceras minerais',         categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2713', descricao: 'Coque de petróleo e resíduos',               categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2714', descricao: 'Betume de petróleo, asfalto',                categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },
  { ncm: '2715', descricao: 'Misturas betuminosas',                       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS,  aliqPIS: 5.08, aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º' },

  // ── FARMACÊUTICOS (Lei 10.147/2000) ──────────────────────────────
  { ncm: '3002', descricao: 'Sangue humano/animal, antisoros, vacinas',   categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3003', descricao: 'Medicamentos (não em doses)',                 categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3004', descricao: 'Medicamentos (em doses)',                     categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3005', descricao: 'Pastas, gazes, ataduras, esparadrapos',      categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3006', descricao: 'Preparações farmacêuticas diversas',         categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º' },

  // ── PERFUMES E COSMÉTICOS (Lei 10.147/2000) ──────────────────────
  { ncm: '3303', descricao: 'Perfumes e águas de colônia',                categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3304', descricao: 'Produtos de beleza e maquiagem',             categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3305', descricao: 'Preparações capilares',                      categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3306', descricao: 'Preparações higiene bucal e dental',         categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º' },
  { ncm: '3307', descricao: 'Preparações barba, desodorantes, sais banho',categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º' },

  // ── BEBIDAS (Lei 10.833/2003 e 13.097/2015) ──────────────────────
  { ncm: '2201', descricao: 'Águas, incluindo águas minerais',            categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2202', descricao: 'Águas, refrigerantes e outras bebidas',      categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2203', descricao: 'Cervejas de malte',                          categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 2.32, aliqCOFINS: 10.68, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2204', descricao: 'Vinhos de uvas frescas',                     categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2205', descricao: 'Vermutes e outros vinhos',                   categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2206', descricao: 'Outras bebidas fermentadas',                 categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2207', descricao: 'Álcool etílico não desnaturado',             categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2208', descricao: 'Aguardentes, uísques, rum, gin e outras',    categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2209', descricao: 'Vinagres e seus sucedâneos',                 categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },
  { ncm: '2210', descricao: 'Outras bebidas não alcoólicas',              categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14º' },

  // ── CEREAIS (Lei 10.925/2004) ─────────────────────────────────────
  { ncm: '1001', descricao: 'Trigo e mistura de trigo com centeio',       categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero — uso na alimentação humana' },
  { ncm: '1002', descricao: 'Centeio',                                    categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero' },
  { ncm: '1003', descricao: 'Cevada',                                     categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero' },
  { ncm: '1004', descricao: 'Aveia',                                      categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero' },
  { ncm: '1005', descricao: 'Milho',                                      categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero' },
  { ncm: '1006', descricao: 'Arroz',                                      categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero' },
  { ncm: '1007', descricao: 'Sorgo de grão',                              categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero' },
  { ncm: '1008', descricao: 'Trigo sarraceno, painço, alpiste e outros',  categoria: CATEGORIAS_MONOFASICAS.CEREAIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 10.925/2004 Art. 1º', obs: 'Alíquota zero' },

  // ── OURO (Lei 11.033/2004) ────────────────────────────────────────
  { ncm: '7108', descricao: 'Ouro — formas brutas',                       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 11.033/2004', obs: 'Alíquota zero' },
  { ncm: '7109', descricao: 'Metais comuns folheados ou chapeados de ouro',categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 11.033/2004', obs: 'Alíquota zero' },
  { ncm: '7110', descricao: 'Platina — formas brutas ou em pó',           categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 11.033/2004', obs: 'Alíquota zero' },
  { ncm: '7111', descricao: 'Metais comuns folheados de platina',         categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 11.033/2004', obs: 'Alíquota zero' },
  { ncm: '7112', descricao: 'Desperdícios e resíduos de metais preciosos',categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 0, aliqCOFINS: 0, baseLegal: 'Lei 11.033/2004', obs: 'Alíquota zero' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// Mapa NCM → registro completo para O(1) em vez de O(n)
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_NCM_MONOFASICOS.map(item => [item.ncm, item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é sujeito ao regime monofásico.
 * Aceita NCM completo (8 dígitos) ou prefixo (4 dígitos).
 *
 * @param {string} ncm
 * @returns {boolean}
 */
export function isMonofasico(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  // busca por prefixo de 4 dígitos
  for (const [chave] of _indice) {
    if (n.startsWith(chave)) return true
  }
  return false
}

/**
 * Retorna o registro completo de um NCM monofásico.
 * Retorna null se não encontrado.
 *
 * @param {string} ncm
 * @returns {object|null}
 */
export function getNCMMonofasico(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const [chave, registro] of _indice) {
    if (n.startsWith(chave)) return registro
  }
  return null
}

/**
 * Retorna todos os NCMs monofásicos.
 *
 * @returns {Array}
 */
export function getNCMsMonofasicos() {
  return TABELA_NCM_MONOFASICOS
}

/**
 * Retorna a categoria monofásica de um NCM.
 * Retorna null se não for monofásico.
 *
 * @param {string} ncm
 * @returns {string|null}
 */
export function getCategoriaMonofasica(ncm) {
  const registro = getNCMMonofasico(ncm)
  return registro ? registro.categoria : null
}

/**
 * Retorna todos os NCMs de uma categoria específica.
 *
 * @param {string} categoria - Um dos valores de CATEGORIAS_MONOFASICAS
 * @returns {Array}
 */
export function getNCMsPorCategoria(categoria) {
  return TABELA_NCM_MONOFASICOS.filter(item => item.categoria === categoria)
}

/**
 * Retorna as alíquotas de PIS/COFINS do fabricante para um NCM.
 * Revendedor sempre tem alíquota zero.
 *
 * @param {string} ncm
 * @returns {{ aliqPIS: number, aliqCOFINS: number }|null}
 */
export function getAliquotasMonofasico(ncm) {
  const registro = getNCMMonofasico(ncm)
  if (!registro) return null
  return { aliqPIS: registro.aliqPIS, aliqCOFINS: registro.aliqCOFINS }
}

/**
 * Metadados desta tabela para rastreabilidade.
 */
export const META_TABELA_MONOFASICOS = {
  versaoBase:     VERSAO_ATUAL.codigo,
  totalNCMs:      TABELA_NCM_MONOFASICOS.length,
  categorias:     Object.values(CATEGORIAS_MONOFASICAS),
  atualizadaEm:   '2026-07-08',
  baseLegalPrincipal: [
    'Lei 10.147/2000', 'Lei 10.560/2002', 'Lei 10.833/2003',
    'Lei 10.925/2004', 'Lei 13.097/2015', 'IN RFB 2.121/2022',
  ],
}