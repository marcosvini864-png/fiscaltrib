/**
 * monofasicos.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela oficial de NCMs sujeitos ao regime monofásico de PIS/COFINS.
 *
 * IMPORTANTE: Este arquivo distingue três categorias distintas:
 *
 * 1. MONOFÁSICO COM CRÉDITO — tributação concentrada no fabricante,
 *    revendedor tem alíquota zero E direito à restituição do que
 *    pagou indevidamente. (Lei 10.147/2000, 10.336/2001, 13.097/2015)
 *
 * 2. ALÍQUOTA ZERO — produto isento ou com alíquota zero por política
 *    tributária, mas SEM regime monofásico. Revendedor simplesmente
 *    não recolhe — não há crédito a recuperar. (Lei 10.925/2004)
 *
 * 3. REGIME CONCENTRADO/DIFERENCIADO — tributação especial que pode
 *    ou não gerar crédito dependendo da situação. Requer análise
 *    específica com dados do PGDAS-D.
 *
 * Versão: 1.1
 * Data: 2026-07-13
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS
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
  BORRACHA:            'BORRACHA',
}

// Categorias com alíquota zero — NÃO geram crédito monofásico
export const CATEGORIAS_ALIQUOTA_ZERO = {
  CEREAIS:  'CEREAIS',
  OURO:     'OURO',
}

// ─────────────────────────────────────────────────────────────
// TABELA MONOFÁSICOS COM DIREITO A CRÉDITO
// Revendedor tem alíquota zero E pode recuperar o que pagou
// ─────────────────────────────────────────────────────────────

export const TABELA_NCM_MONOFASICOS = [

  // ── COMBUSTÍVEIS E LUBRIFICANTES ─────────────────────────────
  { ncm: '2701', descricao: 'Hulhas e coque de hulha',                    categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2702', descricao: 'Linhito',                                    categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2703', descricao: 'Turfa',                                      categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2704', descricao: 'Coque de carvão mineral',                   categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2705', descricao: 'Gás de carvão, gás de água',                categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2706', descricao: 'Alcatrões de hulha, linhito ou turfa',      categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2707', descricao: 'Óleos e outros produtos da destilação',     categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2708', descricao: 'Breu e coque de breu',                      categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2709', descricao: 'Óleos brutos de petróleo',                  categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º',  geraCredito: true },
  { ncm: '2710', descricao: 'Óleos de petróleo — gasolina, diesel, QAV', categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º',  geraCredito: true },
  { ncm: '2711', descricao: 'Gás natural, GLP, butano, propano',         categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º',  geraCredito: true },
  { ncm: '2712', descricao: 'Vaselina, parafina, ceras minerais',        categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2713', descricao: 'Coque de petróleo e resíduos',              categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2714', descricao: 'Betume de petróleo, asfalto',               categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2715', descricao: 'Misturas betuminosas',                      categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },

  // ── FARMACÊUTICOS ────────────────────────────────────────────
  { ncm: '3002', descricao: 'Sangue humano/animal, antisoros, vacinas',  categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3003', descricao: 'Medicamentos (não em doses)',                categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3004', descricao: 'Medicamentos (em doses)',                    categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3005', descricao: 'Pastas, gazes, ataduras, esparadrapos',     categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3006', descricao: 'Preparações farmacêuticas diversas',        categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90,  baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },

  // ── PERFUMES E COSMÉTICOS ────────────────────────────────────
  { ncm: '3303', descricao: 'Perfumes e águas de colônia',               categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3304', descricao: 'Produtos de beleza e maquiagem',            categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3305', descricao: 'Preparações capilares',                     categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3306', descricao: 'Preparações higiene bucal e dental',        categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3307', descricao: 'Preparações barba, desodorantes, sais banho',categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },

  // ── BEBIDAS ──────────────────────────────────────────────────
  { ncm: '2201', descricao: 'Águas, incluindo águas minerais',           categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2202', descricao: 'Águas, refrigerantes e outras bebidas',     categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2203', descricao: 'Cervejas de malte',                         categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 2.32, aliqCOFINS: 10.68, baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2204', descricao: 'Vinhos de uvas frescas',                    categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2205', descricao: 'Vermutes e outros vinhos',                  categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2206', descricao: 'Outras bebidas fermentadas',                categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2207', descricao: 'Álcool etílico não desnaturado',            categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2208', descricao: 'Aguardentes, uísques, rum, gin e outras',   categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2209', descricao: 'Vinagres e seus sucedâneos',                categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
  { ncm: '2210', descricao: 'Outras bebidas não alcoólicas',             categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14º', geraCredito: true },
]

// ─────────────────────────────────────────────────────────────
// TABELA DE ALÍQUOTA ZERO — NÃO GERAM CRÉDITO MONOFÁSICO
// Produtos com tributação zero mas SEM regime monofásico.
// Revendedor não recolhe, mas também não tem crédito a recuperar.
// ─────────────────────────────────────────────────────────────

export const TABELA_NCM_ALIQUOTA_ZERO = [
  // Cereais — Lei 10.925/2004
  { ncm: '1001', descricao: 'Trigo e mistura de trigo com centeio',      categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1002', descricao: 'Centeio',                                   categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1003', descricao: 'Cevada',                                    categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1004', descricao: 'Aveia',                                     categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1005', descricao: 'Milho',                                     categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1006', descricao: 'Arroz',                                     categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1007', descricao: 'Sorgo de grão',                             categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1008', descricao: 'Trigo sarraceno, painço, alpiste e outros', categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  // Ouro e metais preciosos — Lei 11.033/2004
  { ncm: '7108', descricao: 'Ouro — formas brutas',                      categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7109', descricao: 'Metais comuns folheados de ouro',           categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7110', descricao: 'Platina — formas brutas ou em pó',         categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7111', descricao: 'Metais comuns folheados de platina',       categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7112', descricao: 'Desperdícios e resíduos de metais preciosos',categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,   baseLegal: 'Lei 11.033/2004' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICES DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indiceMonofasicos  = new Map(TABELA_NCM_MONOFASICOS.map(item  => [item.ncm, item]))
const _indiceAliquotaZero = new Map(TABELA_NCM_ALIQUOTA_ZERO.map(item => [item.ncm, item]))

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é sujeito ao regime monofásico COM DIREITO A CRÉDITO.
 * Cereais e metais preciosos com alíquota zero NÃO retornam true aqui.
 */
export function isMonofasico(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave] of _indiceMonofasicos) {
    if (n.startsWith(chave)) return true
  }
  return false
}

/**
 * Verifica se um NCM tem alíquota zero mas NÃO é monofásico.
 * Esses produtos não geram crédito — revendedor simplesmente não recolhe.
 */
export function isAliquotaZero(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave] of _indiceAliquotaZero) {
    if (n.startsWith(chave)) return true
  }
  return false
}

/**
 * Classifica um NCM em uma das três situações:
 * 'monofasico' | 'aliquota_zero' | 'comum'
 */
export function classificarNCMTributario(ncm) {
  if (isMonofasico(ncm))    return 'monofasico'
  if (isAliquotaZero(ncm))  return 'aliquota_zero'
  return 'comum'
}

/**
 * Retorna o registro completo de um NCM monofásico.
 */
export function getNCMMonofasico(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const [chave, registro] of _indiceMonofasicos) {
    if (n.startsWith(chave)) return registro
  }
  return null
}

/**
 * Retorna todos os NCMs monofásicos com direito a crédito.
 */
export function getNCMsMonofasicos() {
  return TABELA_NCM_MONOFASICOS
}

/**
 * Retorna a categoria monofásica de um NCM.
 */
export function getCategoriaMonofasica(ncm) {
  const registro = getNCMMonofasico(ncm)
  return registro ? registro.categoria : null
}

/**
 * Retorna todos os NCMs de uma categoria específica.
 */
export function getNCMsPorCategoria(categoria) {
  return TABELA_NCM_MONOFASICOS.filter(item => item.categoria === categoria)
}

/**
 * Retorna as alíquotas do fabricante para um NCM monofásico.
 */
export function getAliquotasMonofasico(ncm) {
  const registro = getNCMMonofasico(ncm)
  if (!registro) return null
  return { aliqPIS: registro.aliqPIS, aliqCOFINS: registro.aliqCOFINS }
}

/**
 * Metadados desta tabela.
 */
export const META_TABELA_MONOFASICOS = {
  versaoBase:         VERSAO_ATUAL.codigo,
  versaoTabela:       '1.1',
  totalMonofasicos:   TABELA_NCM_MONOFASICOS.length,
  totalAliquotaZero:  TABELA_NCM_ALIQUOTA_ZERO.length,
  categorias:         Object.values(CATEGORIAS_MONOFASICAS),
  atualizadaEm:       '2026-07-13',
  observacao:         'v1.1 — Separados NCMs com alíquota zero (cereais, ouro) dos monofásicos com direito a crédito.',
  baseLegalPrincipal: [
    'Lei 10.147/2000', 'Lei 10.336/2001', 'Lei 10.560/2002',
    'Lei 10.833/2003', 'Lei 10.925/2004', 'Lei 13.097/2015',
    'IN RFB 2.121/2022',
  ],
}