/**
 * icms_st.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de NCMs sujeitos ao regime de Substituição Tributária de ICMS.
 *
 * O ICMS-ST concentra a cobrança do imposto no fabricante ou importador,
 * que recolhe antecipadamente o ICMS das etapas seguintes da cadeia.
 * O revendedor não deve recolher ICMS próprio sobre esses produtos.
 *
 * Base legal: LC 87/1996, Convênios ICMS, Protocolos ICMS
 * Decisão STJ: REsp 1.624.297 — ICMS-ST fora da base do Simples Nacional
 *
 * ATENÇÃO: A lista de NCMs sujeitos ao ICMS-ST varia por estado (UF).
 * Esta tabela contém os NCMs com ST em âmbito nacional (Convênios).
 * Para análise estadual específica, consultar a legislação de cada UF.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DE ICMS-ST
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_ICMS_ST = {
  COMBUSTIVEIS:        'COMBUSTIVEIS',
  CIGARROS:            'CIGARROS',
  BEBIDAS:             'BEBIDAS',
  MEDICAMENTOS:        'MEDICAMENTOS',
  AUTOPECAS:           'AUTOPECAS',
  PNEUS:               'PNEUS',
  MATERIAL_CONSTRUCAO: 'MATERIAL_CONSTRUCAO',
  ELETROELETRONICOS:   'ELETROELETRONICOS',
  TINTAS:              'TINTAS',
  PERFUMARIA:          'PERFUMARIA',
  RACAO_ANIMAL:        'RACAO_ANIMAL',
  FERRAMENTAS:         'FERRAMENTAS',
  BICICLETAS:          'BICICLETAS',
  COLCHOES:            'COLCHOES',
  PRODUTOS_LIMPEZA:    'PRODUTOS_LIMPEZA',
}

// ─────────────────────────────────────────────────────────────
// CSTs QUE INDICAM SUBSTITUIÇÃO TRIBUTÁRIA
// ─────────────────────────────────────────────────────────────

export const CST_ICMS_ST = ['10', '30', '60', '70', '90']
export const CSOSN_ICMS_ST = ['201', '202', '203', '500', '900']

// ─────────────────────────────────────────────────────────────
// TABELA DE NCMs SUJEITOS AO ICMS-ST (âmbito nacional)
// ─────────────────────────────────────────────────────────────

export const TABELA_NCM_ICMS_ST = [

  // ── COMBUSTÍVEIS — Convênio ICMS 110/2007 ────────────────────────
  { ncm: '2710', descricao: 'Gasolina, diesel, QAV, óleos lubrificantes',  categoria: CATEGORIAS_ICMS_ST.COMBUSTIVEIS,  convenio: 'Convênio ICMS 110/2007', nacional: true },
  { ncm: '2711', descricao: 'GLP, gás natural',                             categoria: CATEGORIAS_ICMS_ST.COMBUSTIVEIS,  convenio: 'Convênio ICMS 110/2007', nacional: true },
  { ncm: '2207', descricao: 'Álcool etílico — etanol combustível',          categoria: CATEGORIAS_ICMS_ST.COMBUSTIVEIS,  convenio: 'Convênio ICMS 110/2007', nacional: true },

  // ── CIGARROS — Convênio ICMS 186/2010 ───────────────────────────
  { ncm: '2402', descricao: 'Charutos, cigarrilhas e cigarros',             categoria: CATEGORIAS_ICMS_ST.CIGARROS,       convenio: 'Convênio ICMS 186/2010', nacional: true },
  { ncm: '2403', descricao: 'Outros produtos de tabaco',                    categoria: CATEGORIAS_ICMS_ST.CIGARROS,       convenio: 'Convênio ICMS 186/2010', nacional: true },

  // ── BEBIDAS — Convênio ICMS 26/2021 ─────────────────────────────
  { ncm: '2201', descricao: 'Águas minerais e gaseificadas',                categoria: CATEGORIAS_ICMS_ST.BEBIDAS,        convenio: 'Convênio ICMS 26/2021',  nacional: true },
  { ncm: '2202', descricao: 'Refrigerantes e outras bebidas não alcoólicas',categoria: CATEGORIAS_ICMS_ST.BEBIDAS,        convenio: 'Convênio ICMS 26/2021',  nacional: true },
  { ncm: '2203', descricao: 'Cervejas de malte',                            categoria: CATEGORIAS_ICMS_ST.BEBIDAS,        convenio: 'Convênio ICMS 26/2021',  nacional: true },
  { ncm: '2204', descricao: 'Vinhos de uvas frescas',                       categoria: CATEGORIAS_ICMS_ST.BEBIDAS,        convenio: 'Convênio ICMS 26/2021',  nacional: true },
  { ncm: '2206', descricao: 'Sidras e outras bebidas fermentadas',          categoria: CATEGORIAS_ICMS_ST.BEBIDAS,        convenio: 'Convênio ICMS 26/2021',  nacional: true },
  { ncm: '2208', descricao: 'Aguardentes, uísques, rum, gin',               categoria: CATEGORIAS_ICMS_ST.BEBIDAS,        convenio: 'Convênio ICMS 26/2021',  nacional: true },

  // ── MEDICAMENTOS — Convênio ICMS 76/1994 ────────────────────────
  { ncm: '3003', descricao: 'Medicamentos não em doses',                    categoria: CATEGORIAS_ICMS_ST.MEDICAMENTOS,   convenio: 'Convênio ICMS 76/1994',  nacional: true },
  { ncm: '3004', descricao: 'Medicamentos em doses',                        categoria: CATEGORIAS_ICMS_ST.MEDICAMENTOS,   convenio: 'Convênio ICMS 76/1994',  nacional: true },
  { ncm: '3005', descricao: 'Pastas, gazes, ataduras',                      categoria: CATEGORIAS_ICMS_ST.MEDICAMENTOS,   convenio: 'Convênio ICMS 76/1994',  nacional: true },
  { ncm: '3006', descricao: 'Preparações farmacêuticas diversas',           categoria: CATEGORIAS_ICMS_ST.MEDICAMENTOS,   convenio: 'Convênio ICMS 76/1994',  nacional: true },

  // ── AUTOPEÇAS — Convênio ICMS 142/2018 ──────────────────────────
  { ncm: '4011', descricao: 'Pneus novos de borracha',                      categoria: CATEGORIAS_ICMS_ST.PNEUS,          convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '4012', descricao: 'Pneus recauchutados ou usados',                categoria: CATEGORIAS_ICMS_ST.PNEUS,          convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '4013', descricao: 'Câmaras de ar de borracha',                    categoria: CATEGORIAS_ICMS_ST.PNEUS,          convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8407', descricao: 'Motores de pistão para veículos',              categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8408', descricao: 'Motores diesel para veículos',                 categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8409', descricao: 'Partes para motores',                          categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8413', descricao: 'Bombas para líquidos',                         categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8421', descricao: 'Filtros para motores',                         categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8483', descricao: 'Virabrequins, rolamentos, engrenagens',        categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8511', descricao: 'Aparelhos elétricos de ignição',               categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8512', descricao: 'Equipamentos elétricos de iluminação',         categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },
  { ncm: '8708', descricao: 'Partes e acessórios para veículos',            categoria: CATEGORIAS_ICMS_ST.AUTOPECAS,      convenio: 'Convênio ICMS 142/2018', nacional: true },

  // ── TINTAS — Convênio ICMS 74/1994 ──────────────────────────────
  { ncm: '3208', descricao: 'Tintas e vernizes à base de polímeros',        categoria: CATEGORIAS_ICMS_ST.TINTAS,         convenio: 'Convênio ICMS 74/1994',  nacional: true },
  { ncm: '3209', descricao: 'Tintas e vernizes à base aquosa',              categoria: CATEGORIAS_ICMS_ST.TINTAS,         convenio: 'Convênio ICMS 74/1994',  nacional: true },
  { ncm: '3210', descricao: 'Outras tintas e vernizes',                     categoria: CATEGORIAS_ICMS_ST.TINTAS,         convenio: 'Convênio ICMS 74/1994',  nacional: true },
  { ncm: '3211', descricao: 'Pigmentos preparados, opacificantes',          categoria: CATEGORIAS_ICMS_ST.TINTAS,         convenio: 'Convênio ICMS 74/1994',  nacional: true },
  { ncm: '3212', descricao: 'Pigmentos em meio não aquoso',                 categoria: CATEGORIAS_ICMS_ST.TINTAS,         convenio: 'Convênio ICMS 74/1994',  nacional: true },

  // ── PERFUMARIA — Convênio ICMS 70/1997 ──────────────────────────
  { ncm: '3303', descricao: 'Perfumes e águas de colônia',                  categoria: CATEGORIAS_ICMS_ST.PERFUMARIA,     convenio: 'Convênio ICMS 70/1997',  nacional: true },
  { ncm: '3304', descricao: 'Produtos de beleza e maquiagem',               categoria: CATEGORIAS_ICMS_ST.PERFUMARIA,     convenio: 'Convênio ICMS 70/1997',  nacional: true },
  { ncm: '3305', descricao: 'Preparações capilares',                        categoria: CATEGORIAS_ICMS_ST.PERFUMARIA,     convenio: 'Convênio ICMS 70/1997',  nacional: true },
  { ncm: '3306', descricao: 'Preparações higiene bucal e dental',           categoria: CATEGORIAS_ICMS_ST.PERFUMARIA,     convenio: 'Convênio ICMS 70/1997',  nacional: true },
  { ncm: '3307', descricao: 'Desodorantes, sais de banho',                  categoria: CATEGORIAS_ICMS_ST.PERFUMARIA,     convenio: 'Convênio ICMS 70/1997',  nacional: true },

  // ── PRODUTOS DE LIMPEZA — Convênio ICMS 61/2021 ─────────────────
  { ncm: '3401', descricao: 'Sabões, produtos orgânicos tensoativos',       categoria: CATEGORIAS_ICMS_ST.PRODUTOS_LIMPEZA, convenio: 'Convênio ICMS 61/2021', nacional: true },
  { ncm: '3402', descricao: 'Agentes orgânicos de superfície, detergentes', categoria: CATEGORIAS_ICMS_ST.PRODUTOS_LIMPEZA, convenio: 'Convênio ICMS 61/2021', nacional: true },
  { ncm: '3405', descricao: 'Graxas, encáusticas, pastas de limpeza',      categoria: CATEGORIAS_ICMS_ST.PRODUTOS_LIMPEZA, convenio: 'Convênio ICMS 61/2021', nacional: true },

  // ── ELETROELETRÔNICOS — Convênio ICMS 135/2006 ──────────────────
  { ncm: '8471', descricao: 'Computadores e unidades de processamento',     categoria: CATEGORIAS_ICMS_ST.ELETROELETRONICOS, convenio: 'Convênio ICMS 135/2006', nacional: false, obs: 'Varia por UF' },
  { ncm: '8517', descricao: 'Telefones, smartphones',                       categoria: CATEGORIAS_ICMS_ST.ELETROELETRONICOS, convenio: 'Convênio ICMS 135/2006', nacional: false, obs: 'Varia por UF' },
  { ncm: '8528', descricao: 'Monitores, televisores',                       categoria: CATEGORIAS_ICMS_ST.ELETROELETRONICOS, convenio: 'Convênio ICMS 135/2006', nacional: false, obs: 'Varia por UF' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_NCM_ICMS_ST.map(item => [item.ncm, item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM está sujeito ao ICMS-ST.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isICMSST(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave] of _indice) {
    if (n.startsWith(chave)) return true
  }
  return false
}

/**
 * Retorna o registro completo de ICMS-ST de um NCM.
 * @param {string} ncm
 * @returns {object|null}
 */
export function getNCMICMSST(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const [chave, registro] of _indice) {
    if (n.startsWith(chave)) return registro
  }
  return null
}

/**
 * Verifica se um CST ou CSOSN indica substituição tributária.
 * @param {string} cst
 * @returns {boolean}
 */
export function cstIndicaST(cst) {
  if (!cst) return false
  return CST_ICMS_ST.includes(cst) || CSOSN_ICMS_ST.includes(cst)
}

/**
 * Retorna todos os NCMs sujeitos ao ICMS-ST de uma categoria.
 * @param {string} categoria
 * @returns {Array}
 */
export function getNCMsPorCategoriaICMSST(categoria) {
  return TABELA_NCM_ICMS_ST.filter(item => item.categoria === categoria)
}

/**
 * Retorna apenas NCMs com ST nacional (todos os estados).
 * @returns {Array}
 */
export function getNCMsSTNacional() {
  return TABELA_NCM_ICMS_ST.filter(item => item.nacional === true)
}

/**
 * Metadados desta tabela.
 */
export const META_TABELA_ICMS_ST = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalNCMs:    TABELA_NCM_ICMS_ST.length,
  atualizadaEm: '2026-07-08',
  observacao:   'Lista de NCMs com ST em âmbito nacional. ST estadual específica requer consulta à legislação de cada UF.',
  baseLegal:    ['LC 87/1996', 'Convênio ICMS 110/2007', 'Convênio ICMS 142/2018', 'Convênio ICMS 26/2021'],
}