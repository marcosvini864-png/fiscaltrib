/**
 * medicamentos.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de NCMs e regras tributárias para produtos farmacêuticos.
 *
 * Produtos farmacêuticos estão sujeitos a:
 * — Regime monofásico de PIS/COFINS (Lei 10.147/2000)
 * — Substituição Tributária de ICMS (Convênio ICMS 76/1994)
 * — Lista positiva, negativa e neutra (IN RFB 1.911/2019)
 * — CMED — Câmara de Regulação do Mercado de Medicamentos
 *
 * IMPORTANTE: Medicamentos têm tratamento diferenciado conforme:
 * — Constam na lista positiva (alíquota diferenciada)
 * — Constam na lista negativa (alíquota zero)
 * — Constam na lista neutra (regime geral)
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS FARMACÊUTICAS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_FARMACEUTICO = {
  MEDICAMENTO_REFERENCIA:  'MEDICAMENTO_REFERENCIA',   // marca — lista positiva
  MEDICAMENTO_GENERICO:    'MEDICAMENTO_GENERICO',     // genérico — lista negativa
  MEDICAMENTO_SIMILAR:     'MEDICAMENTO_SIMILAR',      // similar — lista positiva
  PRODUTO_HOSPITALAR:      'PRODUTO_HOSPITALAR',       // hospitalar — lista neutra
  ANTISORO_VACINA:         'ANTISORO_VACINA',          // imunobiológico
  SANGUE_DERIVADOS:        'SANGUE_DERIVADOS',         // hemoterápico
  MATERIAL_CURATIVO:       'MATERIAL_CURATIVO',        // curativos, ataduras
  PREPARACAO_FARMACEUTICA: 'PREPARACAO_FARMACEUTICA',  // outros farmacêuticos
  PRODUTO_VETERINARIO:     'PRODUTO_VETERINARIO',      // uso veterinário
  COSMÉTICO_FARMACEUTICO:  'COSMETICO_FARMACEUTICO',   // dermocosméticos
}

// ─────────────────────────────────────────────────────────────
// LISTAS DE MEDICAMENTOS (PIS/COFINS)
// ─────────────────────────────────────────────────────────────

export const LISTA_MEDICAMENTO = {
  POSITIVA: 'POSITIVA',   // alíquota diferenciada no fabricante
  NEGATIVA: 'NEGATIVA',   // alíquota zero — medicamentos genéricos
  NEUTRA:   'NEUTRA',     // regime geral de PIS/COFINS
}

// ─────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DE FARMACÊUTICOS
// ─────────────────────────────────────────────────────────────

export const TABELA_MEDICAMENTOS = [

  // ── CAPÍTULO 30 — PRODUTOS FARMACÊUTICOS ─────────────────────────

  { ncm: '3001',
    descricao: 'Glândulas e outros órgãos para usos opoterápicos — secos',
    categoria: CATEGORIAS_FARMACEUTICO.PREPARACAO_FARMACEUTICA,
    listaMedicamento: LISTA_MEDICAMENTO.NEUTRA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    baseLegal: 'Lei 10.147/2000',
    obs: 'Não consta na lista positiva/negativa — regime geral' },

  { ncm: '3002',
    descricao: 'Sangue humano, sangue animal, antisoros, vacinas e produtos semelhantes',
    categoria: CATEGORIAS_FARMACEUTICO.ANTISORO_VACINA,
    listaMedicamento: LISTA_MEDICAMENTO.NEGATIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: false,
    aliqPIS: 0, aliqCOFINS: 0,
    baseLegal: 'Lei 10.147/2000 Art. 1º — Lista Negativa',
    obs: 'Alíquota zero — imunobiológicos e hemoderivados' },

  { ncm: '3003',
    descricao: 'Medicamentos constituídos por produtos misturados — não em doses',
    categoria: CATEGORIAS_FARMACEUTICO.MEDICAMENTO_REFERENCIA,
    listaMedicamento: LISTA_MEDICAMENTO.POSITIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.10, aliqCOFINS: 9.90,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 76/1994',
    baseLegal: 'Lei 10.147/2000 Art. 1º — Lista Positiva',
    obs: 'Revendedor: alíquota zero de PIS/COFINS' },

  { ncm: '3004',
    descricao: 'Medicamentos constituídos por produtos misturados — em doses',
    categoria: CATEGORIAS_FARMACEUTICO.MEDICAMENTO_REFERENCIA,
    listaMedicamento: LISTA_MEDICAMENTO.POSITIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.10, aliqCOFINS: 9.90,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 76/1994',
    baseLegal: 'Lei 10.147/2000 Art. 1º — Lista Positiva',
    obs: 'Principal NCM de medicamentos. Revendedor: alíquota zero' },

  { ncm: '3005',
    descricao: 'Pastas, pós, sabões, sabonetes, gazes, ataduras, esparadrapos e similares',
    categoria: CATEGORIAS_FARMACEUTICO.MATERIAL_CURATIVO,
    listaMedicamento: LISTA_MEDICAMENTO.POSITIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.10, aliqCOFINS: 9.90,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 76/1994',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Material de curativo — revendedor: alíquota zero' },

  { ncm: '3006',
    descricao: 'Preparações farmacêuticas — reativos diagnóstico, cimentos dentários, etc.',
    categoria: CATEGORIAS_FARMACEUTICO.PREPARACAO_FARMACEUTICA,
    listaMedicamento: LISTA_MEDICAMENTO.POSITIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.10, aliqCOFINS: 9.90,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 76/1994',
    baseLegal: 'Lei 10.147/2000 Art. 1º',
    obs: 'Inclui preservativos, bolsas de sangue, géis, etc.' },

  // ── GENÉRICOS — LISTA NEGATIVA ────────────────────────────────────
  // Medicamentos genéricos têm alíquota zero tanto no fabricante
  // quanto no revendedor conforme Lei 10.147/2000 Lista Negativa.

  { ncm: '3003.90',
    descricao: 'Medicamentos genéricos — não em doses',
    categoria: CATEGORIAS_FARMACEUTICO.MEDICAMENTO_GENERICO,
    listaMedicamento: LISTA_MEDICAMENTO.NEGATIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 0, aliqCOFINS: 0,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 76/1994',
    baseLegal: 'Lei 10.147/2000 — Lista Negativa',
    obs: 'Alíquota zero em toda a cadeia — fabricante e revendedor' },

  { ncm: '3004.90',
    descricao: 'Medicamentos genéricos — em doses',
    categoria: CATEGORIAS_FARMACEUTICO.MEDICAMENTO_GENERICO,
    listaMedicamento: LISTA_MEDICAMENTO.NEGATIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 0, aliqCOFINS: 0,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 76/1994',
    baseLegal: 'Lei 10.147/2000 — Lista Negativa',
    obs: 'Alíquota zero em toda a cadeia — fabricante e revendedor' },

  // ── PRODUTOS HOSPITALARES ────────────────────────────────────────
  { ncm: '3822',
    descricao: 'Reativos de diagnóstico ou de laboratório',
    categoria: CATEGORIAS_FARMACEUTICO.PRODUTO_HOSPITALAR,
    listaMedicamento: LISTA_MEDICAMENTO.NEUTRA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    baseLegal: 'Lei 10.637/2002',
    obs: 'Regime geral — não consta nas listas especiais' },

  { ncm: '9018',
    descricao: 'Instrumentos e aparelhos para medicina, cirurgia, odontologia',
    categoria: CATEGORIAS_FARMACEUTICO.PRODUTO_HOSPITALAR,
    listaMedicamento: LISTA_MEDICAMENTO.NEUTRA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    baseLegal: 'Lei 10.637/2002',
    obs: 'Equipamentos médicos — regime geral' },

  { ncm: '9019',
    descricao: 'Aparelhos de mecanoterapia, massagem, psicotécnica',
    categoria: CATEGORIAS_FARMACEUTICO.PRODUTO_HOSPITALAR,
    listaMedicamento: LISTA_MEDICAMENTO.NEUTRA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    baseLegal: 'Lei 10.637/2002',
    obs: 'Equipamentos de reabilitação — regime geral' },

  { ncm: '9020',
    descricao: 'Outros aparelhos respiratórios e máscaras antigás',
    categoria: CATEGORIAS_FARMACEUTICO.PRODUTO_HOSPITALAR,
    listaMedicamento: LISTA_MEDICAMENTO.NEUTRA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    baseLegal: 'Lei 10.637/2002',
    obs: 'Equipamentos respiratórios — regime geral' },

  // ── COSMÉTICOS FARMACÊUTICOS ─────────────────────────────────────
  { ncm: '3304.99',
    descricao: 'Dermocosméticos com ação farmacêutica',
    categoria: CATEGORIAS_FARMACEUTICO.COSMÉTICO_FARMACEUTICO,
    listaMedicamento: LISTA_MEDICAMENTO.POSITIVA,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.20, aliqCOFINS: 10.30,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 76/1994',
    baseLegal: 'Lei 10.147/2000',
    obs: 'Classificados como cosméticos mas com ação farmacêutica' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_MEDICAMENTOS.map(item => [item.ncm, item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é produto farmacêutico.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isMedicamento(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  // capítulo 30 é o principal — mais outros específicos
  if (n.startsWith('30')) return true
  for (const [chave] of _indice) {
    if (n.startsWith(chave.replace(/\D/g, ''))) return true
  }
  return false
}

/**
 * Retorna o registro completo de um farmacêutico.
 * @param {string} ncm
 * @returns {object|null}
 */
export function getMedicamento(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const [chave, registro] of _indice) {
    if (n.startsWith(chave.replace(/\D/g, ''))) return registro
  }
  return null
}

/**
 * Retorna a lista do medicamento (positiva, negativa ou neutra).
 * @param {string} ncm
 * @returns {string|null}
 */
export function getListaMedicamento(ncm) {
  const registro = getMedicamento(ncm)
  return registro?.listaMedicamento || null
}

/**
 * Verifica se medicamento está na lista negativa (alíquota zero total).
 * @param {string} ncm
 * @returns {boolean}
 */
export function isListaNegativa(ncm) {
  return getListaMedicamento(ncm) === LISTA_MEDICAMENTO.NEGATIVA
}

/**
 * Verifica se medicamento está na lista positiva (monofásico).
 * @param {string} ncm
 * @returns {boolean}
 */
export function isListaPositiva(ncm) {
  return getListaMedicamento(ncm) === LISTA_MEDICAMENTO.POSITIVA
}

/**
 * Retorna as alíquotas aplicáveis ao revendedor.
 * Para lista positiva e negativa: zero.
 * Para lista neutra: alíquotas normais.
 * @param {string} ncm
 * @returns {{ aliqPIS: number, aliqCOFINS: number }}
 */
export function getAliquotasRevendedor(ncm) {
  const registro = getMedicamento(ncm)
  if (!registro) return { aliqPIS: 0.65, aliqCOFINS: 3.00 }
  if (registro.listaMedicamento === LISTA_MEDICAMENTO.NEUTRA) {
    return { aliqPIS: registro.aliqPIS, aliqCOFINS: registro.aliqCOFINS }
  }
  return { aliqPIS: 0, aliqCOFINS: 0 }
}

/**
 * Retorna medicamentos por categoria.
 * @param {string} categoria
 * @returns {Array}
 */
export function getMedicamentosPorCategoria(categoria) {
  return TABELA_MEDICAMENTOS.filter(item => item.categoria === categoria)
}

/**
 * Retorna todos os medicamentos sujeitos ao ICMS-ST.
 * @returns {Array}
 */
export function getMedicamentosComST() {
  return TABELA_MEDICAMENTOS.filter(item => item.icmsST === true)
}

/**
 * Metadados desta tabela.
 */
export const META_MEDICAMENTOS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalNCMs:    TABELA_MEDICAMENTOS.length,
  atualizadaEm: '2026-07-08',
  baseLegal: [
    'Lei 10.147/2000', 'Convênio ICMS 76/1994',
    'IN RFB 1.911/2019', 'IN RFB 2.121/2022',
  ],
  observacao: 'Listas positiva, negativa e neutra devem ser consultadas ' +
              'na tabela oficial da RFB. Esta base contém os NCMs principais. ' +
              'Para análise completa, cruzar com a tabela CMED.',
}