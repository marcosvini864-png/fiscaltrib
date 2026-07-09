/**
 * categorias.js — Base de Conhecimento Tributária — FiscalTrib
 * Catálogo geral de categorias tributárias de NCM.
 *
 * Este arquivo centraliza todas as categorias reconhecidas pelo
 * FiscalTrib e fornece funções para classificar qualquer NCM
 * dentro do sistema tributário brasileiro.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'
import { isMonofasico, getCategoriaMonofasica } from './monofasicos.js'

// ─────────────────────────────────────────────────────────────
// CATEGORIAS TRIBUTÁRIAS GERAIS
// ─────────────────────────────────────────────────────────────

export const CATEGORIA_TRIBUTARIA = {
  // Regimes especiais de PIS/COFINS
  MONOFASICO:           'MONOFASICO',
  SUBSTITUICAO_TRIB:    'SUBSTITUICAO_TRIB',
  ALIQUOTA_ZERO:        'ALIQUOTA_ZERO',
  ISENTO:               'ISENTO',
  IMUNE:                'IMUNE',
  NAO_TRIBUTADO:        'NAO_TRIBUTADO',

  // Regimes gerais
  TRIBUTADO_NORMAL:     'TRIBUTADO_NORMAL',
  TRIBUTADO_ST:         'TRIBUTADO_ST',
  TRIBUTADO_IPI:        'TRIBUTADO_IPI',

  // Categorias econômicas
  COMBUSTIVEL:          'COMBUSTIVEL',
  FARMACEUTICO:         'FARMACEUTICO',
  COSMÉTICO:            'COSMETICO',
  BEBIDA:               'BEBIDA',
  CEREAL:               'CEREAL',
  VEICULO:              'VEICULO',
  AUTOPECA:             'AUTOPECA',
  PNEU:                 'PNEU',
  ELETRONICO:           'ELETRONICO',
  ALIMENTO:             'ALIMENTO',
  SERVICO:              'SERVICO',
  NAO_CLASSIFICADO:     'NAO_CLASSIFICADO',
}

// ─────────────────────────────────────────────────────────────
// CAPÍTULOS NCM — primeiros 2 dígitos
// Mapeamento dos capítulos da NCM para categoria econômica
// ─────────────────────────────────────────────────────────────

export const CAPITULOS_NCM = {
  '01': { descricao: 'Animais vivos',                          categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '02': { descricao: 'Carnes e miudezas comestíveis',          categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '03': { descricao: 'Peixes e crustáceos',                    categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '04': { descricao: 'Leite, laticínios, ovos, mel',           categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '05': { descricao: 'Outros produtos de origem animal',       categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '07': { descricao: 'Produtos hortícolas',                    categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '08': { descricao: 'Frutas, cascas de cítricos',             categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '09': { descricao: 'Café, chá, mate e especiarias',          categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '10': { descricao: 'Cereais',                                categoria: CATEGORIA_TRIBUTARIA.CEREAL },
  '11': { descricao: 'Produtos da indústria de moagem',        categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '15': { descricao: 'Gorduras e óleos animais ou vegetais',   categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '16': { descricao: 'Preparações de carne, peixe',            categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '17': { descricao: 'Açúcares e produtos de confeitaria',     categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '18': { descricao: 'Cacau e suas preparações',               categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '19': { descricao: 'Preparações à base de cereais',          categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '20': { descricao: 'Preparações de produtos hortícolas',     categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '21': { descricao: 'Preparações alimentícias diversas',      categoria: CATEGORIA_TRIBUTARIA.ALIMENTO },
  '22': { descricao: 'Bebidas, líquidos alcoólicos e vinagres',categoria: CATEGORIA_TRIBUTARIA.BEBIDA },
  '27': { descricao: 'Combustíveis minerais, óleos minerais',  categoria: CATEGORIA_TRIBUTARIA.COMBUSTIVEL },
  '30': { descricao: 'Produtos farmacêuticos',                 categoria: CATEGORIA_TRIBUTARIA.FARMACEUTICO },
  '33': { descricao: 'Óleos essenciais, cosméticos, perfumes', categoria: CATEGORIA_TRIBUTARIA.COSMÉTICO },
  '40': { descricao: 'Borracha e suas obras',                  categoria: CATEGORIA_TRIBUTARIA.PNEU },
  '61': { descricao: 'Vestuário e acessórios de malha',        categoria: CATEGORIA_TRIBUTARIA.NAO_CLASSIFICADO },
  '62': { descricao: 'Vestuário e acessórios exceto malha',    categoria: CATEGORIA_TRIBUTARIA.NAO_CLASSIFICADO },
  '71': { descricao: 'Pedras e metais preciosos',              categoria: CATEGORIA_TRIBUTARIA.NAO_CLASSIFICADO },
  '84': { descricao: 'Máquinas e aparelhos mecânicos',         categoria: CATEGORIA_TRIBUTARIA.ELETRONICO },
  '85': { descricao: 'Máquinas e aparelhos elétricos',         categoria: CATEGORIA_TRIBUTARIA.ELETRONICO },
  '87': { descricao: 'Veículos automóveis, tratores',          categoria: CATEGORIA_TRIBUTARIA.VEICULO },
  '88': { descricao: 'Aeronaves e veículos espaciais',         categoria: CATEGORIA_TRIBUTARIA.VEICULO },
  '89': { descricao: 'Embarcações',                            categoria: CATEGORIA_TRIBUTARIA.VEICULO },
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Classifica um NCM retornando todas as suas categorias tributárias.
 * Esta é a função principal deste arquivo — consultada pelos motores.
 *
 * @param {string} ncm
 * @returns {object}
 */
export function classificarNCM(ncm) {
  if (!ncm) return _semClassificacao(ncm)

  const n       = ncm.replace(/\D/g, '')
  const capitulo = n.slice(0, 2)
  const capInfo  = CAPITULOS_NCM[capitulo] || null

  // Verificações em ordem de prioridade
  const mono     = isMonofasico(n)
  const catMono  = mono ? getCategoriaMonofasica(n) : null

  return {
    ncm:               n,
    capitulo,
    descricaoCapitulo: capInfo?.descricao || 'Não mapeado',
    categoriaEconomica: capInfo?.categoria || CATEGORIA_TRIBUTARIA.NAO_CLASSIFICADO,

    // Flags tributárias
    isMonofasico:      mono,
    categoriaMonofasica: catMono,
    isICMSST:          false,   // implementar em icms_st.js
    isCombustivel:     capitulo === '27',
    isFarmaceutico:    capitulo === '30',
    isCosmetico:       capitulo === '33',
    isBebida:          capitulo === '22',
    isCereal:          capitulo === '10',
    isVeiculo:         ['87', '88', '89'].includes(capitulo),
    isEletronico:      ['84', '85'].includes(capitulo),

    // Regime tributário identificado
    regimePIS:    mono ? 'MONOFASICO_ALIQUOTA_ZERO_REVENDEDOR' : 'TRIBUTACAO_NORMAL',
    regimeCOFINS: mono ? 'MONOFASICO_ALIQUOTA_ZERO_REVENDEDOR' : 'TRIBUTACAO_NORMAL',

    // Alertas para o motor
    alertas: _gerarAlertas(n, mono, capitulo),
  }
}

/**
 * Retorna a descrição do capítulo NCM.
 *
 * @param {string} ncm
 * @returns {string}
 */
export function getDescricaoCapitulo(ncm) {
  if (!ncm) return ''
  const capitulo = ncm.replace(/\D/g, '').slice(0, 2)
  return CAPITULOS_NCM[capitulo]?.descricao || 'Capítulo não mapeado'
}

/**
 * Verifica se um NCM pertence a uma categoria econômica.
 *
 * @param {string} ncm
 * @param {string} categoria - CATEGORIA_TRIBUTARIA
 * @returns {boolean}
 */
export function ncmPertenceCategoria(ncm, categoria) {
  const cls = classificarNCM(ncm)
  return cls.categoriaEconomica === categoria
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES INTERNAS
// ─────────────────────────────────────────────────────────────

function _semClassificacao(ncm) {
  return {
    ncm,
    capitulo:           '',
    descricaoCapitulo:  'NCM inválido ou não informado',
    categoriaEconomica: CATEGORIA_TRIBUTARIA.NAO_CLASSIFICADO,
    isMonofasico:       false,
    categoriaMonofasica: null,
    isICMSST:           false,
    isCombustivel:      false,
    isFarmaceutico:     false,
    isCosmetico:        false,
    isBebida:           false,
    isCereal:           false,
    isVeiculo:          false,
    isEletronico:       false,
    regimePIS:          'NAO_IDENTIFICADO',
    regimeCOFINS:       'NAO_IDENTIFICADO',
    alertas:            [],
  }
}

function _gerarAlertas(ncm, isMonofasicoFlag, capitulo) {
  const alertas = []
  if (isMonofasicoFlag) {
    alertas.push({
      tipo:      'MONOFASICO',
      nivel:     'INFO',
      mensagem:  'Produto sujeito ao regime monofásico. Revendedor tem alíquota zero de PIS/COFINS.',
    })
  }
  if (capitulo === '27') {
    alertas.push({
      tipo:      'COMBUSTIVEL',
      nivel:     'INFO',
      mensagem:  'Combustível sujeito a regras específicas de PIS/COFINS e ICMS.',
    })
  }
  return alertas
}

/**
 * Metadados deste arquivo.
 */
export const META_CATEGORIAS = {
  versaoBase:      VERSAO_ATUAL.codigo,
  totalCapitulos:  Object.keys(CAPITULOS_NCM).length,
  atualizadaEm:    '2026-07-08',
}