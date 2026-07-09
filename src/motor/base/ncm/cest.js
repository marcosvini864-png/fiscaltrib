/**
 * cest.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de códigos CEST e sua relação com NCM e ICMS-ST.
 *
 * O CEST (Código Especificador da Substituição Tributária) foi
 * instituído pelo Convênio ICMS 92/2015 e é obrigatório nas NF-e
 * para produtos sujeitos ao regime de substituição tributária.
 *
 * Estrutura do CEST:
 * — 2 primeiros dígitos: segmento (ex: 01 = Autopeças)
 * — 3 dígitos seguintes: item do segmento
 * — 2 últimos dígitos: especificação do item
 * Exemplo: 01.001.00 = Autopeças — Pneus novos de borracha
 *
 * Base legal: Convênio ICMS 92/2015, Convênio ICMS 142/2018
 *
 * ATENÇÃO: A tabela completa de CEST possui milhares de itens.
 * Esta base contém os segmentos e itens mais relevantes para
 * os motores do FiscalTrib. Expandir conforme necessidade.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// SEGMENTOS CEST
// ─────────────────────────────────────────────────────────────

export const SEGMENTOS_CEST = {
  '01': 'Autopeças',
  '02': 'Bebidas alcoólicas, exceto cerveja e chope',
  '03': 'Cervejas, chopes, refrigerantes, águas e outras bebidas',
  '04': 'Cigarros e outros produtos derivados do fumo',
  '05': 'Cimentos',
  '06': 'Combustíveis e lubrificantes',
  '07': 'Energia elétrica',
  '08': 'Ferramentas',
  '09': 'Lâmpadas, reatores e starter',
  '10': 'Materiais de construção e congêneres',
  '11': 'Materiais de limpeza',
  '12': 'Materiais elétricos',
  '13': 'Medicamentos de uso humano e outros produtos farmacêuticos',
  '14': 'Papéis, plásticos, produtos cerâmicos e vidros',
  '15': 'Pneumáticos, câmaras de ar e protetores de borracha',
  '16': 'Produtos alimentícios',
  '17': 'Produtos de papelaria',
  '18': 'Produtos de perfumaria e de higiene pessoal e cosméticos',
  '19': 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos',
  '20': 'Rações para animais domésticos',
  '21': 'Sorvetes e preparados para fabricação de sorvetes em máquinas',
  '22': 'Tintas e vernizes',
  '23': 'Trigo e suas farinhas',
  '24': 'Veículos automotores',
  '25': 'Veículos de duas e três rodas motorizados',
  '26': 'Vídeos games e consoles',
  '27': 'Ferramentas',
  '28': 'Colchões, travesseiros e pilhas',
}

// ─────────────────────────────────────────────────────────────
// TABELA CEST — ITENS PRINCIPAIS POR SEGMENTO
// ─────────────────────────────────────────────────────────────

export const TABELA_CEST = [

  // ── SEGMENTO 01 — AUTOPEÇAS ──────────────────────────────────────
  { cest: '01.001.00', ncm: '4011.10', descricao: 'Pneus novos dos tipos utilizados em automóveis de passageiros', segmento: '01' },
  { cest: '01.002.00', ncm: '4011.20', descricao: 'Pneus novos dos tipos utilizados em ônibus ou caminhões', segmento: '01' },
  { cest: '01.003.00', ncm: '4011.40', descricao: 'Pneus novos dos tipos utilizados em motocicletas', segmento: '01' },
  { cest: '01.004.00', ncm: '4013.10', descricao: 'Câmaras de ar dos tipos utilizados em automóveis', segmento: '01' },
  { cest: '01.005.00', ncm: '8407',    descricao: 'Motores de pistão alternativo dos tipos utilizados em veículos', segmento: '01' },
  { cest: '01.006.00', ncm: '8408',    descricao: 'Motores de pistão de ignição por compressão (diesel)', segmento: '01' },
  { cest: '01.007.00', ncm: '8409',    descricao: 'Partes reconhecíveis para motores', segmento: '01' },
  { cest: '01.008.00', ncm: '8413',    descricao: 'Bombas para líquidos', segmento: '01' },
  { cest: '01.009.00', ncm: '8421',    descricao: 'Filtros de óleo, ar e combustível', segmento: '01' },
  { cest: '01.010.00', ncm: '8483',    descricao: 'Virabrequins, mancais, engrenagens e rolamentos', segmento: '01' },
  { cest: '01.011.00', ncm: '8511',    descricao: 'Velas de ignição, distribuidores e bobinas', segmento: '01' },
  { cest: '01.012.00', ncm: '8512',    descricao: 'Faróis, lanternas e limpadores de para-brisa', segmento: '01' },
  { cest: '01.013.00', ncm: '8708.10', descricao: 'Para-choques e seus componentes', segmento: '01' },
  { cest: '01.014.00', ncm: '8708.21', descricao: 'Cintos de segurança', segmento: '01' },
  { cest: '01.015.00', ncm: '8708.29', descricao: 'Outras partes e acessórios de carroceria', segmento: '01' },
  { cest: '01.016.00', ncm: '8708.30', descricao: 'Freios, pastilhas, discos e tambores', segmento: '01' },
  { cest: '01.017.00', ncm: '8708.40', descricao: 'Caixas de marchas', segmento: '01' },
  { cest: '01.018.00', ncm: '8708.50', descricao: 'Pontes traseiras com diferencial', segmento: '01' },
  { cest: '01.019.00', ncm: '8708.60', descricao: 'Eixos com diferencial', segmento: '01' },
  { cest: '01.020.00', ncm: '8708.70', descricao: 'Rodas de alumínio e aço', segmento: '01' },
  { cest: '01.021.00', ncm: '8708.80', descricao: 'Amortecedores de suspensão', segmento: '01' },
  { cest: '01.022.00', ncm: '8708.91', descricao: 'Radiadores e suas partes', segmento: '01' },
  { cest: '01.023.00', ncm: '8708.92', descricao: 'Silenciosos e tubos de escape', segmento: '01' },
  { cest: '01.024.00', ncm: '8708.99', descricao: 'Outras partes e acessórios para veículos', segmento: '01' },

  // ── SEGMENTO 03 — BEBIDAS ─────────────────────────────────────────
  { cest: '03.001.00', ncm: '2201',    descricao: 'Água mineral, gasosa ou não, e água potável', segmento: '03' },
  { cest: '03.002.00', ncm: '2202',    descricao: 'Refrigerantes e outras bebidas não alcoólicas', segmento: '03' },
  { cest: '03.003.00', ncm: '2202.91', descricao: 'Bebidas energéticas', segmento: '03' },
  { cest: '03.004.00', ncm: '2202.99', descricao: 'Bebidas isotônicas', segmento: '03' },
  { cest: '03.005.00', ncm: '2203',    descricao: 'Cervejas de malte', segmento: '03' },
  { cest: '03.006.00', ncm: '2203',    descricao: 'Chope', segmento: '03' },

  // ── SEGMENTO 06 — COMBUSTÍVEIS ───────────────────────────────────
  { cest: '06.001.00', ncm: '2710.12.59', descricao: 'Gasolina automotiva', segmento: '06' },
  { cest: '06.002.00', ncm: '2710.19.21', descricao: 'Óleo diesel', segmento: '06' },
  { cest: '06.003.00', ncm: '2711.12',    descricao: 'GLP — gás liquefeito de petróleo', segmento: '06' },
  { cest: '06.004.00', ncm: '2207.10.00', descricao: 'Álcool etílico — etanol combustível', segmento: '06' },
  { cest: '06.005.00', ncm: '2710.19.11', descricao: 'Querosene de aviação', segmento: '06' },
  { cest: '06.006.00', ncm: '2710.19.31', descricao: 'Óleos lubrificantes', segmento: '06' },

  // ── SEGMENTO 13 — MEDICAMENTOS ───────────────────────────────────
  { cest: '13.001.00', ncm: '3002', descricao: 'Antisoros, vacinas e produtos semelhantes', segmento: '13' },
  { cest: '13.002.00', ncm: '3003', descricao: 'Medicamentos não em doses — uso humano', segmento: '13' },
  { cest: '13.003.00', ncm: '3004', descricao: 'Medicamentos em doses — uso humano', segmento: '13' },
  { cest: '13.004.00', ncm: '3005', descricao: 'Pastas, gazes, ataduras e esparadrapos', segmento: '13' },
  { cest: '13.005.00', ncm: '3006', descricao: 'Preparações farmacêuticas diversas', segmento: '13' },

  // ── SEGMENTO 15 — PNEUMÁTICOS ────────────────────────────────────
  { cest: '15.001.00', ncm: '4011.10', descricao: 'Pneus novos para automóveis de passageiros', segmento: '15' },
  { cest: '15.002.00', ncm: '4011.20', descricao: 'Pneus novos para ônibus e caminhões', segmento: '15' },
  { cest: '15.003.00', ncm: '4011.40', descricao: 'Pneus novos para motocicletas', segmento: '15' },
  { cest: '15.004.00', ncm: '4011.50', descricao: 'Pneus novos para bicicletas', segmento: '15' },
  { cest: '15.005.00', ncm: '4012.11', descricao: 'Pneus recauchutados para automóveis', segmento: '15' },
  { cest: '15.006.00', ncm: '4012.12', descricao: 'Pneus recauchutados para ônibus e caminhões', segmento: '15' },
  { cest: '15.007.00', ncm: '4012.19', descricao: 'Outros pneus recauchutados', segmento: '15' },
  { cest: '15.008.00', ncm: '4012.90', descricao: 'Protetores e flaps', segmento: '15' },
  { cest: '15.009.00', ncm: '4013.10', descricao: 'Câmaras de ar para automóveis, ônibus e caminhões', segmento: '15' },
  { cest: '15.010.00', ncm: '4013.20', descricao: 'Câmaras de ar para bicicletas', segmento: '15' },
  { cest: '15.011.00', ncm: '4013.90', descricao: 'Outras câmaras de ar', segmento: '15' },

  // ── SEGMENTO 18 — PERFUMARIA E COSMÉTICOS ────────────────────────
  { cest: '18.001.00', ncm: '3303',    descricao: 'Perfumes e águas de colônia', segmento: '18' },
  { cest: '18.002.00', ncm: '3304.10', descricao: 'Produtos para maquiagem dos lábios', segmento: '18' },
  { cest: '18.003.00', ncm: '3304.20', descricao: 'Produtos para maquiagem dos olhos', segmento: '18' },
  { cest: '18.004.00', ncm: '3304.30', descricao: 'Preparações para manicure e pedicure', segmento: '18' },
  { cest: '18.005.00', ncm: '3304.91', descricao: 'Pós para maquiagem', segmento: '18' },
  { cest: '18.006.00', ncm: '3304.99', descricao: 'Outros produtos de beleza e cuidados da pele', segmento: '18' },
  { cest: '18.007.00', ncm: '3305.10', descricao: 'Xampus', segmento: '18' },
  { cest: '18.008.00', ncm: '3305.20', descricao: 'Preparações para ondulação ou alisamento dos cabelos', segmento: '18' },
  { cest: '18.009.00', ncm: '3305.30', descricao: 'Laquês para o cabelo', segmento: '18' },
  { cest: '18.010.00', ncm: '3305.90', descricao: 'Outras preparações capilares', segmento: '18' },
  { cest: '18.011.00', ncm: '3306.10', descricao: 'Dentifrícios', segmento: '18' },
  { cest: '18.012.00', ncm: '3306.20', descricao: 'Fio dental', segmento: '18' },
  { cest: '18.013.00', ncm: '3306.90', descricao: 'Enxaguantes bucais e outros', segmento: '18' },
  { cest: '18.014.00', ncm: '3307.10', descricao: 'Preparações para barbear', segmento: '18' },
  { cest: '18.015.00', ncm: '3307.20', descricao: 'Desodorantes corporais e antiperspirantes', segmento: '18' },
  { cest: '18.016.00', ncm: '3307.30', descricao: 'Sais perfumados e preparações para banhos', segmento: '18' },
  { cest: '18.017.00', ncm: '3307.90', descricao: 'Outros — depilatórios, géis de banho', segmento: '18' },

  // ── SEGMENTO 22 — TINTAS E VERNIZES ─────────────────────────────
  { cest: '22.001.00', ncm: '3208', descricao: 'Tintas e vernizes à base de polímeros', segmento: '22' },
  { cest: '22.002.00', ncm: '3209', descricao: 'Tintas e vernizes à base aquosa', segmento: '22' },
  { cest: '22.003.00', ncm: '3210', descricao: 'Outras tintas e vernizes', segmento: '22' },
  { cest: '22.004.00', ncm: '3211', descricao: 'Pigmentos preparados e opacificantes', segmento: '22' },
  { cest: '22.005.00', ncm: '3212', descricao: 'Pigmentos em meio não aquoso', segmento: '22' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICES DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

// índice por CEST
const _indiceCEST = new Map(
  TABELA_CEST.map(item => [item.cest, item])
)

// índice por NCM → múltiplos CEST possíveis
const _indiceNCM = new Map()
TABELA_CEST.forEach(item => {
  const ncm = item.ncm.replace(/\D/g, '')
  if (!_indiceNCM.has(ncm)) _indiceNCM.set(ncm, [])
  _indiceNCM.get(ncm).push(item)
})

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM possui CEST associado.
 * @param {string} ncm
 * @returns {boolean}
 */
export function temCEST(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave] of _indiceNCM) {
    if (n.startsWith(chave) || chave.startsWith(n)) return true
  }
  return false
}

/**
 * Retorna todos os registros CEST de um NCM.
 * Um NCM pode ter múltiplos CESTs (ex: pneus passeio vs caminhão).
 * @param {string} ncm
 * @returns {Array}
 */
export function getCESTporNCM(ncm) {
  if (!ncm) return []
  const n = ncm.replace(/\D/g, '')
  const resultado = []
  for (const [chave, itens] of _indiceNCM) {
    if (n.startsWith(chave) || chave.startsWith(n)) {
      resultado.push(...itens)
    }
  }
  return resultado
}

/**
 * Retorna o registro completo de um CEST.
 * @param {string} cest - ex: '01.001.00'
 * @returns {object|null}
 */
export function getRegistroCEST(cest) {
  if (!cest) return null
  return _indiceCEST.get(cest) || null
}

/**
 * Retorna o segmento de um CEST.
 * @param {string} cest - ex: '01.001.00'
 * @returns {string}
 */
export function getSegmentoCEST(cest) {
  if (!cest) return ''
  const segmento = cest.slice(0, 2)
  return SEGMENTOS_CEST[segmento] || 'Segmento não mapeado'
}

/**
 * Retorna todos os itens de um segmento CEST.
 * @param {string} codigoSegmento - ex: '01', '13', '18'
 * @returns {Array}
 */
export function getItensPorSegmento(codigoSegmento) {
  return TABELA_CEST.filter(item => item.segmento === codigoSegmento)
}

/**
 * Valida se um código CEST tem formato correto.
 * Formato esperado: XX.XXX.XX
 * @param {string} cest
 * @returns {boolean}
 */
export function validarFormatoCEST(cest) {
  if (!cest) return false
  return /^\d{2}\.\d{3}\.\d{2}$/.test(cest)
}

/**
 * Metadados desta tabela.
 */
export const META_CEST = {
  versaoBase:       VERSAO_ATUAL.codigo,
  totalItens:       TABELA_CEST.length,
  totalSegmentos:   Object.keys(SEGMENTOS_CEST).length,
  segmentosAtivos:  [...new Set(TABELA_CEST.map(i => i.segmento))].length,
  atualizadaEm:     '2026-07-08',
  baseLegal: [
    'Convênio ICMS 92/2015',
    'Convênio ICMS 142/2018',
  ],
  observacao: 'Tabela parcial — contém os segmentos mais relevantes para o FiscalTrib. ' +
              'A tabela completa de CEST possui mais de 800 itens. ' +
              'Expandir conforme novos motores forem implementados.',
}