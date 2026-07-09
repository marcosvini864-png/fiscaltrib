/**
 * bebidas.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de NCMs e regras tributárias para bebidas.
 *
 * Bebidas estão sujeitas a:
 * — Regime monofásico de PIS/COFINS (Lei 13.097/2015)
 * — Substituição Tributária de ICMS (Convênio ICMS 26/2021)
 * — IPI — Tabela TIPI Capítulo 22
 * — CIDE — apenas para bebidas alcoólicas em alguns casos
 *
 * IMPORTANTE: Cervejas, refrigerantes e águas têm alíquotas
 * específicas de PIS/COFINS por litro (não por valor).
 * A partir de 2023, o regime passou a ser por volume (ad rem).
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DE BEBIDAS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_BEBIDA = {
  AGUA_MINERAL:        'AGUA_MINERAL',
  REFRIGERANTE:        'REFRIGERANTE',
  CERVEJA:             'CERVEJA',
  VINHO:               'VINHO',
  BEBIDA_FERMENTADA:   'BEBIDA_FERMENTADA',
  BEBIDA_ALCOOLICA:    'BEBIDA_ALCOOLICA',
  ETANOL:              'ETANOL',
  VINAGRE:             'VINAGRE',
  BEBIDA_NAO_ALCOOLICA:'BEBIDA_NAO_ALCOOLICA',
  ISOTONICA:           'ISOTONICA',
  SUCO:                'SUCO',
}

// ─────────────────────────────────────────────────────────────
// REGIME DE TRIBUTAÇÃO PIS/COFINS BEBIDAS
// ─────────────────────────────────────────────────────────────

export const REGIME_BEBIDA = {
  AD_REM:      'AD_REM',       // alíquota por litro (R$/litro)
  AD_VALOREM:  'AD_VALOREM',   // alíquota percentual sobre o valor
  ALIQ_ZERO:   'ALIQ_ZERO',    // alíquota zero
  MONOFASICO:  'MONOFASICO',   // concentrado no fabricante
}

// ─────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DE BEBIDAS
// aliqPIS e aliqCOFINS em % sobre valor (ad valorem)
// aliqPISLitro e aliqCOFINSLitro em R$/litro (ad rem)
// ─────────────────────────────────────────────────────────────

export const TABELA_BEBIDAS = [

  // ── ÁGUAS — NCM 2201 ─────────────────────────────────────────────
  { ncm: '2201',
    descricao: 'Águas, incluindo águas minerais e gaseificadas, sem adição de açúcar',
    categoria: CATEGORIAS_BEBIDA.AGUA_MINERAL,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º',
    obs: 'Revendedor: alíquota zero. Fabricante recolhe pelo volume.' },

  // ── REFRIGERANTES E OUTRAS — NCM 2202 ────────────────────────────
  { ncm: '2202',
    descricao: 'Águas, incluindo águas minerais e gaseificadas, com adição de açúcar ou outros edulcorantes ou aromatizadas, e outras bebidas não alcoólicas',
    categoria: CATEGORIAS_BEBIDA.REFRIGERANTE,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º',
    obs: 'Inclui refrigerantes, isotônicos, energéticos e sucos industrializados.' },

  { ncm: '2202.10',
    descricao: 'Refrigerantes e bebidas gaseificadas com adição de açúcar',
    categoria: CATEGORIAS_BEBIDA.REFRIGERANTE,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º' },

  { ncm: '2202.91',
    descricao: 'Bebidas energéticas',
    categoria: CATEGORIAS_BEBIDA.REFRIGERANTE,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º',
    obs: 'Bebidas energéticas têm alíquota de IPI mais elevada.' },

  { ncm: '2202.99',
    descricao: 'Outras bebidas não alcoólicas — isotônicos, néctares, chás prontos',
    categoria: CATEGORIAS_BEBIDA.BEBIDA_NAO_ALCOOLICA,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º' },

  // ── CERVEJAS — NCM 2203 ──────────────────────────────────────────
  { ncm: '2203',
    descricao: 'Cervejas de malte',
    categoria: CATEGORIAS_BEBIDA.CERVEJA,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 2.32, aliqCOFINS: 10.68,
    aliqPISLitro: 0.0368, aliqCOFINSLitro: 0.1700,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º',
    obs: 'Inclui chope. Cervejas artesanais seguem o mesmo NCM.' },

  // ── VINHOS — NCM 2204 ────────────────────────────────────────────
  { ncm: '2204',
    descricao: 'Vinhos de uvas frescas, incluindo os vinhos enriquecidos com álcool',
    categoria: CATEGORIAS_BEBIDA.VINHO,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º' },

  { ncm: '2205',
    descricao: 'Vermutes e outros vinhos de uvas frescas aromatizados',
    categoria: CATEGORIAS_BEBIDA.VINHO,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º' },

  // ── BEBIDAS FERMENTADAS — NCM 2206 ──────────────────────────────
  { ncm: '2206',
    descricao: 'Outras bebidas fermentadas — sidra, hidromel, sakê',
    categoria: CATEGORIAS_BEBIDA.BEBIDA_FERMENTADA,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º' },

  // ── ÁLCOOL ETÍLICO — NCM 2207 ────────────────────────────────────
  { ncm: '2207',
    descricao: 'Álcool etílico não desnaturado com teor alcoólico ≥ 80% vol',
    categoria: CATEGORIAS_BEBIDA.ETANOL,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.50, aliqCOFINS: 6.90,
    aliqPISLitro: null, aliqCOFINSLitro: null,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 110/2007',
    baseLegal: 'Lei 13.097/2015 Art. 14º',
    obs: 'Etanol para uso combustível: ver combustiveis.js' },

  // ── AGUARDENTES E DESTILADOS — NCM 2208 ─────────────────────────
  { ncm: '2208',
    descricao: 'Álcool etílico não desnaturado < 80% vol — aguardentes, uísques, rum, gin, vodca',
    categoria: CATEGORIAS_BEBIDA.BEBIDA_ALCOOLICA,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º',
    obs: 'Inclui cachaça, pinga, conhaque, licores.' },

  { ncm: '2208.40',
    descricao: 'Rum e tafia',
    categoria: CATEGORIAS_BEBIDA.BEBIDA_ALCOOLICA,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º' },

  { ncm: '2208.70',
    descricao: 'Licores',
    categoria: CATEGORIAS_BEBIDA.BEBIDA_ALCOOLICA,
    regime: REGIME_BEBIDA.MONOFASICO,
    monofasicoPIS: true, monofasicoCOFINS: true,
    icmsST: true,
    aliqPIS: 1.86, aliqCOFINS: 8.54,
    aliqPISLitro: 0.0212, aliqCOFINSLitro: 0.0980,
    aliqRevendedor: { aliqPIS: 0, aliqCOFINS: 0 },
    convenioICMS: 'Convênio ICMS 26/2021',
    baseLegal: 'Lei 13.097/2015 Art. 14º' },

  // ── VINAGRES — NCM 2209 ──────────────────────────────────────────
  { ncm: '2209',
    descricao: 'Vinagres e seus sucedâneos obtidos a partir do ácido acético',
    categoria: CATEGORIAS_BEBIDA.VINAGRE,
    regime: REGIME_BEBIDA.AD_VALOREM,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: false,
    aliqPIS: 0.65, aliqCOFINS: 3.00,
    aliqRevendedor: { aliqPIS: 0.65, aliqCOFINS: 3.00 },
    baseLegal: 'Lei 9.718/1998',
    obs: 'Vinagre não está na lista monofásica — regime geral de PIS/COFINS.' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_BEBIDAS.map(item => [item.ncm, item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é bebida.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isBebida(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  if (n.startsWith('22')) return true
  return false
}

/**
 * Retorna o registro completo de uma bebida.
 * @param {string} ncm
 * @returns {object|null}
 */
export function getBebida(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  // busca do mais específico para o mais genérico
  for (const len of [6, 4, 2]) {
    const chave = n.slice(0, len)
    if (_indice.has(chave)) return _indice.get(chave)
    // busca por prefixo
    for (const [k, v] of _indice) {
      if (n.startsWith(k.replace(/\D/g, ''))) return v
    }
  }
  return null
}

/**
 * Verifica se a bebida é sujeita ao regime monofásico.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isBebidaMonofasica(ncm) {
  const registro = getBebida(ncm)
  return registro?.monofasicoPIS === true
}

/**
 * Verifica se a bebida é alcoólica.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isBebidaAlcoolica(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  return ['2203','2204','2205','2206','2207','2208'].some(p => n.startsWith(p))
}

/**
 * Retorna as alíquotas do revendedor para uma bebida.
 * Para bebidas monofásicas: zero.
 * @param {string} ncm
 * @returns {{ aliqPIS: number, aliqCOFINS: number }}
 */
export function getAliquotasRevendedorBebida(ncm) {
  const registro = getBebida(ncm)
  if (!registro) return { aliqPIS: 0.65, aliqCOFINS: 3.00 }
  return registro.aliqRevendedor || { aliqPIS: 0, aliqCOFINS: 0 }
}

/**
 * Retorna bebidas por categoria.
 * @param {string} categoria
 * @returns {Array}
 */
export function getBebidasPorCategoria(categoria) {
  return TABELA_BEBIDAS.filter(item => item.categoria === categoria)
}

/**
 * Retorna todas as bebidas sujeitas ao ICMS-ST.
 * @returns {Array}
 */
export function getBebidasComST() {
  return TABELA_BEBIDAS.filter(item => item.icmsST === true)
}

/**
 * Metadados desta tabela.
 */
export const META_BEBIDAS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalNCMs:    TABELA_BEBIDAS.length,
  atualizadaEm: '2026-07-08',
  baseLegal: [
    'Lei 13.097/2015', 'Convênio ICMS 26/2021',
    'IN RFB 2.121/2022', 'Dec. 8.442/2015',
  ],
  observacao: 'Alíquotas ad rem (por litro) vigentes conforme Dec. 8.442/2015. ' +
              'Revendedor tem alíquota zero para bebidas monofásicas. ' +
              'Alíquotas sujeitas a atualização anual pelo MAPA.',
}