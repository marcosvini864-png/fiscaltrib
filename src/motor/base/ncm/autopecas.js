/**
 * autopecas.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela de NCMs e regras tributárias para autopeças e acessórios veiculares.
 *
 * Autopeças estão sujeitas a:
 * — Substituição Tributária de ICMS (Convênio ICMS 142/2018)
 * — IPI — Tabela TIPI Capítulos 40, 84, 85, 87
 * — PIS/COFINS — regime geral (não monofásico)
 * — Exceção: pneus e câmaras têm tratamento específico
 *
 * IMPORTANTE: Autopeças NÃO estão sujeitas ao regime monofásico
 * de PIS/COFINS. O principal benefício tributário para este setor
 * é a exclusão do ICMS-ST da base de PIS/COFINS (Tema 69 STF)
 * e a recuperação de créditos de IPI.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DE AUTOPEÇAS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS_AUTOPECA = {
  MOTOR:               'MOTOR',
  TRANSMISSAO:         'TRANSMISSAO',
  FREIOS:              'FREIOS',
  SUSPENSAO:           'SUSPENSAO',
  ELETRICA:            'ELETRICA',
  CARROCERIA:          'CARROCERIA',
  PNEUS_CAMARAS:       'PNEUS_CAMARAS',
  FILTROS:             'FILTROS',
  ILUMINACAO:          'ILUMINACAO',
  ESCAPAMENTO:         'ESCAPAMENTO',
  ARREFECIMENTO:       'ARREFECIMENTO',
  ACESSORIOS:          'ACESSORIOS',
  VIDROS:              'VIDROS',
  COMBUSTIVEL_SISTEMA: 'COMBUSTIVEL_SISTEMA',
}

// ─────────────────────────────────────────────────────────────
// TABELA PRINCIPAL DE AUTOPEÇAS
// ─────────────────────────────────────────────────────────────

export const TABELA_AUTOPECAS = [

  // ── PNEUS E CÂMARAS — NCM 40 ─────────────────────────────────────
  { ncm: '4011',
    descricao: 'Pneus novos de borracha',
    categoria: CATEGORIAS_AUTOPECA.PNEUS_CAMARAS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Pneus para automóveis, caminhões, motos e bicicletas.' },

  { ncm: '4011.10',
    descricao: 'Pneus novos para automóveis de passageiros',
    categoria: CATEGORIAS_AUTOPECA.PNEUS_CAMARAS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4011.20',
    descricao: 'Pneus novos para ônibus e caminhões',
    categoria: CATEGORIAS_AUTOPECA.PNEUS_CAMARAS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4011.40',
    descricao: 'Pneus novos para motocicletas',
    categoria: CATEGORIAS_AUTOPECA.PNEUS_CAMARAS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4012',
    descricao: 'Pneus recauchutados ou usados de borracha',
    categoria: CATEGORIAS_AUTOPECA.PNEUS_CAMARAS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '4013',
    descricao: 'Câmaras de ar de borracha',
    categoria: CATEGORIAS_AUTOPECA.PNEUS_CAMARAS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── MOTORES — NCM 84 ─────────────────────────────────────────────
  { ncm: '8407',
    descricao: 'Motores de pistão alternativo e rotativos — faísca',
    categoria: CATEGORIAS_AUTOPECA.MOTOR,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Motores a gasolina para veículos.' },

  { ncm: '8408',
    descricao: 'Motores de pistão de ignição por compressão — diesel',
    categoria: CATEGORIAS_AUTOPECA.MOTOR,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Motores diesel para veículos e máquinas.' },

  { ncm: '8409',
    descricao: 'Partes reconhecíveis para motores — pistões, bielas, virabrequins',
    categoria: CATEGORIAS_AUTOPECA.MOTOR,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── BOMBAS E FILTROS ─────────────────────────────────────────────
  { ncm: '8413',
    descricao: 'Bombas para líquidos — bomba d\'água, bomba de combustível',
    categoria: CATEGORIAS_AUTOPECA.ARREFECIMENTO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '8421',
    descricao: 'Aparelhos para filtrar — filtros de óleo, ar e combustível',
    categoria: CATEGORIAS_AUTOPECA.FILTROS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Filtros de óleo, ar, combustível e cabine.' },

  // ── TRANSMISSÃO ──────────────────────────────────────────────────
  { ncm: '8483',
    descricao: 'Árvores de transmissão, manivelas, mancais, engrenagens, redutores',
    categoria: CATEGORIAS_AUTOPECA.TRANSMISSAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Inclui rolamentos, virabrequins, volantes e polias.' },

  { ncm: '8708.40',
    descricao: 'Caixas de marchas — câmbio manual e automático',
    categoria: CATEGORIAS_AUTOPECA.TRANSMISSAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '8708.50',
    descricao: 'Pontes traseiras com diferencial e seus componentes',
    categoria: CATEGORIAS_AUTOPECA.TRANSMISSAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── ELÉTRICA — NCM 85 ────────────────────────────────────────────
  { ncm: '8511',
    descricao: 'Aparelhos e dispositivos elétricos de ignição — velas, distribuidores, bobinas',
    categoria: CATEGORIAS_AUTOPECA.ELETRICA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Velas de ignição, distribuidores, alternadores, motores de arranque.' },

  { ncm: '8512',
    descricao: 'Equipamentos elétricos de iluminação e sinalização — faróis, lanternas',
    categoria: CATEGORIAS_AUTOPECA.ILUMINACAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Faróis, lanternas, buzinas, limpadores de para-brisa.' },

  { ncm: '8544',
    descricao: 'Fios, cabos e outros condutores elétricos — chicote elétrico',
    categoria: CATEGORIAS_AUTOPECA.ELETRICA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── FREIOS ───────────────────────────────────────────────────────
  { ncm: '8708.30',
    descricao: 'Freios e servos-freios e suas partes — pastilhas, discos, tambores',
    categoria: CATEGORIAS_AUTOPECA.FREIOS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Pastilhas, lonas, discos, tambores, cilindros de freio.' },

  // ── SUSPENSÃO ────────────────────────────────────────────────────
  { ncm: '8708.80',
    descricao: 'Amortecedores de suspensão',
    categoria: CATEGORIAS_AUTOPECA.SUSPENSAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '8708.60',
    descricao: 'Eixos com diferencial, mesmo com outros órgãos de transmissão',
    categoria: CATEGORIAS_AUTOPECA.SUSPENSAO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── CARROCERIA E VIDROS ──────────────────────────────────────────
  { ncm: '8708.10',
    descricao: 'Para-choques e seus componentes',
    categoria: CATEGORIAS_AUTOPECA.CARROCERIA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '8708.21',
    descricao: 'Cintos de segurança',
    categoria: CATEGORIAS_AUTOPECA.CARROCERIA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '8708.29',
    descricao: 'Outras partes e acessórios de carroceria — airbags, capôs, portas',
    categoria: CATEGORIAS_AUTOPECA.CARROCERIA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '7007',
    descricao: 'Vidros de segurança — para-brisas, vidros laterais e traseiros',
    categoria: CATEGORIAS_AUTOPECA.VIDROS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  // ── SISTEMA DE COMBUSTÍVEL ───────────────────────────────────────
  { ncm: '8708.70',
    descricao: 'Rodas e respectivas partes e acessórios — rodas de alumínio e aço',
    categoria: CATEGORIAS_AUTOPECA.COMBUSTIVEL_SISTEMA,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '8708.91',
    descricao: 'Radiadores e suas partes',
    categoria: CATEGORIAS_AUTOPECA.ARREFECIMENTO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002' },

  { ncm: '8708.92',
    descricao: 'Silenciosos e tubos de escape',
    categoria: CATEGORIAS_AUTOPECA.ESCAPAMENTO,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'Escapamentos, catalisadores e silenciosos.' },

  { ncm: '8708.99',
    descricao: 'Outras partes e acessórios para veículos',
    categoria: CATEGORIAS_AUTOPECA.ACESSORIOS,
    monofasicoPIS: false, monofasicoCOFINS: false,
    icmsST: true,
    aliqPIS: 1.65, aliqCOFINS: 7.60,
    aliqIPI: 0,
    convenioICMS: 'Convênio ICMS 142/2018',
    baseLegal: 'Lei 10.485/2002',
    obs: 'NCM genérico para demais autopeças não classificadas.' },
]

// ─────────────────────────────────────────────────────────────
// ÍNDICE DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────

const _indice = new Map(
  TABELA_AUTOPECAS.map(item => [item.ncm.replace(/\D/g, ''), item])
)

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é autopeça.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isAutopeca(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave] of _indice) {
    if (n.startsWith(chave)) return true
  }
  return false
}

/**
 * Retorna o registro completo de uma autopeça.
 * @param {string} ncm
 * @returns {object|null}
 */
export function getAutopeca(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const len of [8, 6, 4]) {
    const prefixo = n.slice(0, len)
    for (const [chave, registro] of _indice) {
      if (chave === prefixo || chave.startsWith(prefixo) || prefixo.startsWith(chave)) {
        return registro
      }
    }
  }
  return null
}

/**
 * Verifica se a autopeça está sujeita ao ICMS-ST.
 * @param {string} ncm
 * @returns {boolean}
 */
export function isAutopecaComST(ncm) {
  const registro = getAutopeca(ncm)
  return registro?.icmsST === true
}

/**
 * Retorna autopeças por categoria.
 * @param {string} categoria
 * @returns {Array}
 */
export function getAutopecasPorCategoria(categoria) {
  return TABELA_AUTOPECAS.filter(item => item.categoria === categoria)
}

/**
 * Retorna todas as autopeças sujeitas ao ICMS-ST.
 * @returns {Array}
 */
export function getAutopecasComST() {
  return TABELA_AUTOPECAS.filter(item => item.icmsST === true)
}

/**
 * Retorna as alíquotas de PIS/COFINS para autopeças.
 * Autopeças NÃO são monofásicas — regime geral ou ST.
 * @param {string} ncm
 * @returns {{ aliqPIS: number, aliqCOFINS: number }}
 */
export function getAliquotasAutopeca(ncm) {
  const registro = getAutopeca(ncm)
  if (!registro) return { aliqPIS: 1.65, aliqCOFINS: 7.60 }
  return { aliqPIS: registro.aliqPIS, aliqCOFINS: registro.aliqCOFINS }
}

/**
 * Metadados desta tabela.
 */
export const META_AUTOPECAS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  totalNCMs:    TABELA_AUTOPECAS.length,
  atualizadaEm: '2026-07-08',
  baseLegal: [
    'Lei 10.485/2002', 'Convênio ICMS 142/2018',
    'IN RFB 2.121/2022',
  ],
  observacao: 'Autopeças NÃO são monofásicas de PIS/COFINS. ' +
              'Principal oportunidade: exclusão do ICMS-ST da base de PIS/COFINS (Tema 69). ' +
              'Créditos de IPI para industriais. Alíquotas de PIS/COFINS no regime não cumulativo.',
}