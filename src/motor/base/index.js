/**
 * index.js — Base de Conhecimento Tributária — FiscalTrib
 * Ponto de entrada único da Base de Conhecimento Tributária.
 *
 * REGRA: Todo motor deve importar APENAS deste arquivo.
 * Nenhum motor deve importar diretamente de subpastas da base.
 *
 * Versão: 1.1
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL, gerarAssinaturaAnalise, componenteDisponivel } from './versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// IMPORTAÇÕES — NCM
// ─────────────────────────────────────────────────────────────

import {
  isMonofasico,
  getNCMMonofasico,
  getNCMsMonofasicos,
  getCategoriaMonofasica,
  getNCMsPorCategoria,
  getAliquotasMonofasico,
  CATEGORIAS_MONOFASICAS,
  META_TABELA_MONOFASICOS,
} from './ncm/monofasicos.js'

import {
  isICMSST,
  getNCMICMSST,
  cstIndicaST,
  getNCMsPorCategoriaICMSST,
  getNCMsSTNacional,
  CST_ICMS_ST,
  CSOSN_ICMS_ST,
  CATEGORIAS_ICMS_ST,
  META_TABELA_ICMS_ST,
} from './ncm/icms_st.js'

import {
  isCombustivel,
  getCombustivel,
  temCIDE,
  getCombustiveisPorCategoria,
  getCombustiveisComST,
  CATEGORIAS_COMBUSTIVEL,
  META_COMBUSTIVEIS,
} from './ncm/combustiveis.js'

import {
  isMedicamento,
  getMedicamento,
  getListaMedicamento,
  isListaNegativa,
  isListaPositiva,
  getAliquotasRevendedor,
  getMedicamentosPorCategoria,
  getMedicamentosComST,
  CATEGORIAS_FARMACEUTICO,
  LISTA_MEDICAMENTO,
  META_MEDICAMENTOS,
} from './ncm/medicamentos.js'

import {
  isBebida,
  getBebida,
  isBebidaMonofasica,
  isBebidaAlcoolica,
  getAliquotasRevendedorBebida,
  getBebidasPorCategoria,
  getBebidasComST,
  CATEGORIAS_BEBIDA,
  META_BEBIDAS,
} from './ncm/bebidas.js'

import {
  isCosmetico,
  getCosmetico,
  isCosmeticoMonofasico,
  getGrauANVISA,
  getAliquotasRevendedorCosmetico,
  getCosmeticosPorCategoria,
  getCosmeticosComST,
  CATEGORIAS_COSMETICO,
  META_COSMETICOS,
} from './ncm/cosmeticos.js'

import {
  isAutopeca,
  getAutopeca,
  isAutopecaComST,
  getAutopecasPorCategoria,
  getAutopecasComST,
  getAliquotasAutopeca,
  CATEGORIAS_AUTOPECA,
  META_AUTOPECAS,
} from './ncm/autopecas.js'

import {
  isPneu,
  getPneu,
  isPneuComST,
  isCamaraAr,
  isPneuAgricola,
  getPneusPorCategoria,
  getPneusComST,
  getAliquotasPneu,
  CATEGORIAS_PNEU,
  META_PNEUS,
} from './ncm/pneus.js'

import {
  temCEST,
  getCESTporNCM,
  getRegistroCEST,
  getSegmentoCEST,
  getItensPorSegmento,
  validarFormatoCEST,
  SEGMENTOS_CEST,
  META_CEST,
} from './ncm/cest.js'

import {
  classificarNCM,
  getDescricaoCapitulo,
  ncmPertenceCategoria,
  CATEGORIA_TRIBUTARIA,
  CAPITULOS_NCM,
  META_CATEGORIAS,
} from './ncm/categorias.js'

// ─────────────────────────────────────────────────────────────
// IMPORTAÇÕES — LEGISLAÇÃO
// ─────────────────────────────────────────────────────────────

import {
  getLei,
  getLeiPorNumero,
  getLeisPorMotor,
  getLeisVigentes,
  LEIS,
  META_LEIS,
} from './legislacao/leis.js'

import {
  getDecreto,
  getDecretoPorNumero,
  getDecretosPorMotor,
  getTabelaPresuncaoLP,
  getPresuncaoIRPJ,
  DECRETOS,
  META_DECRETOS,
} from './legislacao/decretos.js'

import {
  getIN,
  getINPorNumero,
  getINsPorMotor,
  getINsVigentes,
  getPrazosIN,
  INSTRUCOES_NORMATIVAS,
  META_INSTRUCOES_NORMATIVAS,
} from './legislacao/instrucoes_normativas.js'

import {
  getPortariaPGFN,
  getPortariaPorNumero,
  getPortariasPorMotor,
  getTabelaDescontosTransacao,
  getDescontoPorCAP,
  getFasesCobranca,
  getHipotesesSuspensao,
  getTiposCertidao,
  PORTARIAS_PGFN,
  META_PORTARIAS_PGFN,
} from './legislacao/portarias_pgfn.js'

import {
  getEdital,
  getEditaisVigentes,
  getEditaisPorTipo,
  getEditaisPorMotor,
  temEditalVigente,
  getCondicoesEditalVigente,
  getCriteriosIrrecuperavel,
  isElegivelIrrecuperavel,
  estimarDescontoPorCAP,
  EDITAIS_PGFN,
  META_EDITAIS_PGFN,
} from './legislacao/editais_pgfn.js'

import {
  getAtoDeclaratorio,
  getAtoPorNumero,
  getAtosPorMotor,
  getAtosFavoraveis,
  getAtosDesfavoraveis,
  calcularImpactoAtosNoScore,
  getFormulaFatorR,
  getFormulaJCP,
  getCodigosPERDCOMP,
  ATOS_DECLARATORIOS,
  META_ATOS_DECLARATORIOS,
} from './legislacao/atos_declaratorios.js'

import {
  getSolucaoConsulta,
  getSCPorNumero,
  getSCsPorMotor,
  getSCsFavoraveis,
  getSCsDesfavoraveis,
  calcularImpactoSCsNaConfianca,
  buscarSCsPorPalavrasChave,
  getRequisitosPLR,
  getExemplosInsumos,
  SOLUCOES_CONSULTA,
  META_SOLUCOES_CONSULTA,
} from './legislacao/solucoes_consulta.js'

// ─────────────────────────────────────────────────────────────
// IMPORTAÇÕES — JURISPRUDÊNCIA
// ─────────────────────────────────────────────────────────────

import {
  getDecisaoSTF,
  getDecisaoSTFPorProcesso,
  getDecisaoSTFPorTema,
  getDecisoesPorMotor,
  getDecisoesTransitadas,
  getDecisoesComModulacao,
  getDataCorteModulacao,
  calcularImpactoSTFNoScore,
  verificarDireitoRetroativo,
  DECISOES_STF,
  META_STF,
} from './jurisprudencia/stf.js'

import {
  getDecisaoSTJ,
  getDecisaoSTJPorProcesso,
  getDecisoesSTJPorMotor,
  getDecisoesVinculantes,
  getSumulasSTJ,
  calcularImpactoSTJNoScore,
  temRepetitivoSTJ,
  DECISOES_STJ,
  META_STJ,
} from './jurisprudencia/stj.js'

import {
  getAcordao,
  getAcordaosPorMotor,
  getAcordaosFavoraveis,
  getAcordaosDesfavoraveis,
  getAcordaosCSRF,
  getSumulasCARF,
  getSumulasCARFPorMotor,
  calcularImpactoCARFNoScore,
  gerarResumoRiscoCARF,
  ACORDAOS_CARF,
  SUMULAS_CARF,
  META_CARF,
} from './jurisprudencia/carf.js'

import {
  getDecisaoTRF,
  getDecisoesTRFPorMotor,
  getDecisoesPorTribunal,
  getDecisoesTRFFavoraveis,
  getTRFPorEstado,
  getDecisoesPorEstado,
  calcularImpactoTRFsNoScore,
  getPanoramaRegional,
  DECISOES_TRF,
  TRFS,
  META_TRFS,
} from './jurisprudencia/trfs.js'

import {
  getTese,
  getTesesPorMotor,
  getTesesPorConsolidacao,
  getTesesPorViaAdmin,
  getTesesPorViaJudicial,
  getScoreBaseTese,
  getPlanoAcao,
  getAnaliseRisco,
  getResumoTodasTeses,
  TESES,
  META_TESES,
} from './jurisprudencia/teses.js'

// ─────────────────────────────────────────────────────────────
// IMPORTAÇÕES — REGRAS
// ─────────────────────────────────────────────────────────────

import * as RegrasMonofasicos   from './regras/monofasicos.js'
import * as RegrasICMSST        from './regras/icms_st.js'
import * as RegrasExclusaoICMS  from './regras/exclusao_icms.js'
import * as RegrasFatorR        from './regras/fator_r.js'
import * as RegrasIRPJCSLL      from './regras/irpj_csll.js'
import * as RegrasDividaAtiva   from './regras/divida_ativa.js'

// ─────────────────────────────────────────────────────────────
// IMPORTAÇÕES — UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

import * as Datas        from './utilitarios/datas.js'
import * as Moedas       from './utilitarios/moedas.js'
import * as Calculos     from './utilitarios/calculos.js'
import * as Validacoes   from './utilitarios/validacoes.js'
import * as Formatadores from './utilitarios/formatadores.js'

// ─────────────────────────────────────────────────────────────
// BASE TRIBUTÁRIA — objeto principal exportado
// ─────────────────────────────────────────────────────────────

export const BaseTributaria = {

  // ─── Versão ────────────────────────────────────────────────
  versao:               VERSAO_ATUAL,
  getAssinatura:        (nomeMotor, versaoMotor) => gerarAssinaturaAnalise(nomeMotor, versaoMotor),
  componenteDisponivel,

  // ─── NCM ───────────────────────────────────────────────────
  ncm: {
    // Monofásicos
    isMonofasico,
    getNCMMonofasico,
    getNCMsMonofasicos,
    getCategoriaMonofasica,
    getNCMsPorCategoria,
    getAliquotasMonofasico,
    CATEGORIAS_MONOFASICAS,
    META_TABELA_MONOFASICOS,

    // ICMS-ST
    isICMSST,
    getNCMICMSST,
    cstIndicaST,
    getNCMsPorCategoriaICMSST,
    getNCMsSTNacional,
    CST_ICMS_ST,
    CSOSN_ICMS_ST,
    CATEGORIAS_ICMS_ST,

    // Combustíveis
    isCombustivel,
    getCombustivel,
    temCIDE,
    getCombustiveisPorCategoria,
    getCombustiveisComST,
    CATEGORIAS_COMBUSTIVEL,

    // Medicamentos
    isMedicamento,
    getMedicamento,
    getListaMedicamento,
    isListaNegativa,
    isListaPositiva,
    getAliquotasRevendedor,
    getMedicamentosPorCategoria,
    getMedicamentosComST,
    CATEGORIAS_FARMACEUTICO,
    LISTA_MEDICAMENTO,

    // Bebidas
    isBebida,
    getBebida,
    isBebidaMonofasica,
    isBebidaAlcoolica,
    getAliquotasRevendedorBebida,
    getBebidasPorCategoria,
    getBebidasComST,
    CATEGORIAS_BEBIDA,

    // Cosméticos
    isCosmetico,
    getCosmetico,
    isCosmeticoMonofasico,
    getGrauANVISA,
    getAliquotasRevendedorCosmetico,
    getCosmeticosPorCategoria,
    getCosmeticosComST,
    CATEGORIAS_COSMETICO,

    // Autopeças
    isAutopeca,
    getAutopeca,
    isAutopecaComST,
    getAutopecasPorCategoria,
    getAutopecasComST,
    getAliquotasAutopeca,
    CATEGORIAS_AUTOPECA,

    // Pneus
    isPneu,
    getPneu,
    isPneuComST,
    isCamaraAr,
    isPneuAgricola,
    getPneusPorCategoria,
    getPneusComST,
    getAliquotasPneu,
    CATEGORIAS_PNEU,

    // CEST
    temCEST,
    getCESTporNCM,
    getRegistroCEST,
    getSegmentoCEST,
    getItensPorSegmento,
    validarFormatoCEST,
    SEGMENTOS_CEST,

    // Categorias gerais
    classificarNCM,
    getDescricaoCapitulo,
    ncmPertenceCategoria,
    CATEGORIA_TRIBUTARIA,
    CAPITULOS_NCM,
  },

  // ─── Legislação ────────────────────────────────────────────
  legislacao: {
    // Leis
    getLei,
    getLeiPorNumero,
    getLeisPorMotor,
    getLeisVigentes,
    LEIS,

    // Decretos
    getDecreto,
    getDecretoPorNumero,
    getDecretosPorMotor,
    getTabelaPresuncaoLP,
    getPresuncaoIRPJ,
    DECRETOS,

    // Instruções Normativas
    getIN,
    getINPorNumero,
    getINsPorMotor,
    getINsVigentes,
    getPrazosIN,
    INSTRUCOES_NORMATIVAS,

    // Portarias PGFN
    getPortariaPGFN,
    getPortariaPorNumero,
    getPortariasPorMotor,
    getTabelaDescontosTransacao,
    getDescontoPorCAP,
    getFasesCobranca,
    getHipotesesSuspensao,
    getTiposCertidao,
    PORTARIAS_PGFN,

    // Editais PGFN
    getEdital,
    getEditaisVigentes,
    getEditaisPorTipo,
    getEditaisPorMotor,
    temEditalVigente,
    getCondicoesEditalVigente,
    getCriteriosIrrecuperavel,
    isElegivelIrrecuperavel,
    estimarDescontoPorCAP,
    EDITAIS_PGFN,

    // Atos Declaratórios
    getAtoDeclaratorio,
    getAtoPorNumero,
    getAtosPorMotor,
    getAtosFavoraveis,
    getAtosDesfavoraveis,
    calcularImpactoAtosNoScore,
    getFormulaFatorR,
    getFormulaJCP,
    getCodigosPERDCOMP,
    ATOS_DECLARATORIOS,

    // Soluções de Consulta
    getSolucaoConsulta,
    getSCPorNumero,
    getSCsPorMotor,
    getSCsFavoraveis,
    getSCsDesfavoraveis,
    calcularImpactoSCsNaConfianca,
    buscarSCsPorPalavrasChave,
    getRequisitosPLR,
    getExemplosInsumos,
    SOLUCOES_CONSULTA,
  },

  // ─── Jurisprudência ────────────────────────────────────────
  jurisprudencia: {
    // STF
    getDecisaoSTF,
    getDecisaoSTFPorProcesso,
    getDecisaoSTFPorTema,
    getDecisoesPorMotor,
    getDecisoesTransitadas,
    getDecisoesComModulacao,
    getDataCorteModulacao,
    calcularImpactoSTFNoScore,
    verificarDireitoRetroativo,
    DECISOES_STF,

    // STJ
    getDecisaoSTJ,
    getDecisaoSTJPorProcesso,
    getDecisoesSTJPorMotor,
    getDecisoesVinculantes,
    getSumulasSTJ,
    calcularImpactoSTJNoScore,
    temRepetitivoSTJ,
    DECISOES_STJ,

    // CARF
    getAcordao,
    getAcordaosPorMotor,
    getAcordaosFavoraveis,
    getAcordaosDesfavoraveis,
    getAcordaosCSRF,
    getSumulasCARF,
    getSumulasCARFPorMotor,
    calcularImpactoCARFNoScore,
    gerarResumoRiscoCARF,
    ACORDAOS_CARF,
    SUMULAS_CARF,

    // TRFs
    getDecisaoTRF,
    getDecisoesTRFPorMotor,
    getDecisoesPorTribunal,
    getDecisoesTRFFavoraveis,
    getTRFPorEstado,
    getDecisoesPorEstado,
    calcularImpactoTRFsNoScore,
    getPanoramaRegional,
    DECISOES_TRF,
    TRFS,

    // Teses consolidadas
    getTese,
    getTesesPorMotor,
    getTesesPorConsolidacao,
    getTesesPorViaAdmin,
    getTesesPorViaJudicial,
    getScoreBaseTese,
    getPlanoAcao,
    getAnaliseRisco,
    getResumoTodasTeses,
    TESES,
  },

  // ─── Regras ────────────────────────────────────────────────
  regras: {
    monofasicos:  RegrasMonofasicos,
    icmsST:       RegrasICMSST,
    exclusaoICMS: RegrasExclusaoICMS,
    fatorR:       RegrasFatorR,
    irpjCSLL:     RegrasIRPJCSLL,
    dividaAtiva:  RegrasDividaAtiva,
  },

  // ─── Utilitários ───────────────────────────────────────────
  utilitarios: {
    datas:        Datas,
    moedas:       Moedas,
    calculos:     Calculos,
    validacoes:   Validacoes,
    formatadores: Formatadores,
  },
}

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÃO PADRÃO
// ─────────────────────────────────────────────────────────────

export default BaseTributaria