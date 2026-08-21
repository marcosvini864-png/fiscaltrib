/**
 * ApuracaoSimples.jsx - e-FiscalTribe®
 * Apuracao do Simples Nacional - multi-empresa
 * Versao 1.1 - 13/08/2026
 * + Skeleton, ghost rows, seletor por pagina, lixeira por linha, excluir todos
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
  ghost: '#F1F5F9', ghostText: '#CBD5E1',
}

const fmtR   = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtPct = v => parseFloat(v || 0).toFixed(2).replace('.', ',') + '%'

// ============================================================
// MOTOR DO SIMPLES NACIONAL
// Fórmula oficial da alíquota efetiva — LC 123/2006, art. 18
// ============================================================

function calcularAliquotaEfetiva(rbt12, aliquotaNominal, parcelaDeduzir) {
	if (
  rbt12 === null ||
  rbt12 === undefined ||
  String(rbt12).trim() === ''
  ) {
  return null
  }
  
  const rbt12Informado = Number(rbt12)
  const receita12 = rbt12Informado === 0 ? 1 : rbt12Informado
  const aliquota = Number(aliquotaNominal)
  const deducao = Number(parcelaDeduzir)

  if (
    !Number.isFinite(receita12) ||
    !Number.isFinite(aliquota) ||
    !Number.isFinite(deducao) ||
    receita12 < 0
  ) {
    return null
  }

  return ((receita12 * aliquota) - deducao) / receita12
}

// ============================================================
// ANEXO I — COMÉRCIO
// Vigência utilizada para competências de 01/2018 a 12/2026
// LC 123/2006 — Anexo I
// ============================================================

const ANEXO_I_2018_2026 = [
  {
    faixa: 1,
    limiteAte: 180000,
    aliquotaNominal: 0.04,
    parcelaDeduzir: 0,
  },
  {
    faixa: 2,
    limiteAte: 360000,
    aliquotaNominal: 0.073,
    parcelaDeduzir: 5940,
  },
  {
    faixa: 3,
    limiteAte: 720000,
    aliquotaNominal: 0.095,
    parcelaDeduzir: 13860,
  },
  {
    faixa: 4,
    limiteAte: 1800000,
    aliquotaNominal: 0.107,
    parcelaDeduzir: 22500,
  },
  {
    faixa: 5,
    limiteAte: 3600000,
    aliquotaNominal: 0.143,
    parcelaDeduzir: 87300,
  },
  {
    faixa: 6,
    limiteAte: 4800000,
    aliquotaNominal: 0.19,
    parcelaDeduzir: 378000,
  },
]

function identificarFaixaAnexoI(rbt12) {
  // Dado ausente não pode ser interpretado como RBT12 zero.
  if (
    rbt12 === null ||
    rbt12 === undefined ||
    String(rbt12).trim() === ''
  ) {
    return null
  }

  const receita12 = Number(rbt12)

  if (
    !Number.isFinite(receita12) ||
    receita12 < 0 ||
    receita12 > 4800000
  ) {
    return null
  }

  return (
    ANEXO_I_2018_2026.find(
      faixa => receita12 <= faixa.limiteAte
    ) || null
  )
}

// ============================================================
// PARÂMETROS AUTOMÁTICOS DO ANEXO I
// RBT12 → faixa → alíquota nominal → PD → alíquota efetiva
// ============================================================

function calcularParametrosAnexoI(rbt12) {
  const faixa = identificarFaixaAnexoI(rbt12)

  if (!faixa) {
    return null
  }

  const aliquotaEfetiva = calcularAliquotaEfetiva(
    rbt12,
    faixa.aliquotaNominal,
    faixa.parcelaDeduzir
  )

  if (aliquotaEfetiva == null) {
    return null
  }

  return {
    anexo: 'I',
    faixa: faixa.faixa,
    rbt12: Number(rbt12),
    aliquotaNominal: faixa.aliquotaNominal,
    parcelaDeduzir: faixa.parcelaDeduzir,
    aliquotaEfetiva,
  }
}

// ============================================================
// DAS TEÓRICO-BASE
// Receita da competência × alíquota efetiva
// Ainda sem segregações ou tratamentos específicos
// ============================================================

function calcularDasTeoricoBase(receitaCompetencia, aliquotaEfetiva) {
  if (
    receitaCompetencia === null ||
    receitaCompetencia === undefined ||
    String(receitaCompetencia).trim() === ''
  ) {
    return null
  }

  const receita = Number(receitaCompetencia)
  const aliquota = Number(aliquotaEfetiva)

  if (
    !Number.isFinite(receita) ||
    !Number.isFinite(aliquota) ||
    receita < 0 ||
    aliquota < 0
  ) {
    return null
  }

  return receita * aliquota
}

// ============================================================
// APURAÇÃO-BASE — ANEXO I
// Consolida as etapas matemáticas já validadas
// ============================================================

function calcularApuracaoBaseAnexoI(
  rbt12,
  receitaCompetencia,
  receitaMonofasica
) {
  const parametros = calcularParametrosAnexoI(rbt12)

  if (!parametros) {
    return null
  }

  const segregacao = segregarReceitaPisCofinsMonofasica(
    receitaCompetencia,
    receitaMonofasica
  )

  if (!segregacao) {
    return null
  }

  const dasTeoricoBase = calcularDasTeoricoBase(
    segregacao.receitaTotal,
    parametros.aliquotaEfetiva
  )

  if (dasTeoricoBase == null) {
    return null
  }

  const aliquotasTributos = calcularAliquotasEfetivasPorTributo(
    parametros.faixa,
    parametros.aliquotaEfetiva
  )

  const valoresTributosTeoricosBase = aliquotasTributos
    ? calcularValoresTributosTeoricosBase(
        segregacao.receitaTotal,
        aliquotasTributos
      )
    : null

  return {
    ...parametros,
    ...segregacao,

    receitaCompetencia: segregacao.receitaTotal,
    dasTeoricoBase,

    reparticaoDisponivel: Boolean(
      aliquotasTributos &&
      valoresTributosTeoricosBase
    ),

    aliquotasTributos,
    valoresTributosTeoricosBase,
  }
}

// ============================================================
// REPARTIÇÃO DO ANEXO I — COMÉRCIO
// Percentuais oficiais de repartição do DAS
// Neste momento, faixas 1 a 5.
// Faixa 6 será tratada separadamente.
// ============================================================

const REPARTICAO_ANEXO_I = {
  1: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.415,
    icms: 0.34,
  },

  2: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.415,
    icms: 0.34,
  },

  3: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.42,
    icms: 0.335,
  },

  4: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.42,
    icms: 0.335,
  },

  5: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.42,
    icms: 0.335,
  },
}

// ============================================================
// ALÍQUOTAS EFETIVAS POR TRIBUTO — ANEXO I
// Alíquota efetiva × percentual de repartição da faixa
// ============================================================

function calcularAliquotasEfetivasPorTributo(faixa, aliquotaEfetiva) {
  const numeroFaixa = Number(faixa)
  const aliquota = Number(aliquotaEfetiva)

  const reparticao = REPARTICAO_ANEXO_I[numeroFaixa]

  if (
    !reparticao ||
    !Number.isFinite(aliquota) ||
    aliquota < 0
  ) {
    return null
  }

  return {
    irpj: aliquota * reparticao.irpj,
    csll: aliquota * reparticao.csll,
    cofins: aliquota * reparticao.cofins,
    pis: aliquota * reparticao.pis,
    cpp: aliquota * reparticao.cpp,
    icms: aliquota * reparticao.icms,
  }
}

// ============================================================
// VALORES TEÓRICOS POR TRIBUTO — ANEXO I
// Receita da competência × alíquota efetiva de cada tributo
// Ainda sem segregações específicas
// ============================================================

function calcularValoresTributosTeoricosBase(
  receitaCompetencia,
  aliquotasTributos
) {
  if (
    receitaCompetencia === null ||
    receitaCompetencia === undefined ||
    String(receitaCompetencia).trim() === '' ||
    !aliquotasTributos
  ) {
    return null
  }

  const receita = Number(receitaCompetencia)

  if (
    !Number.isFinite(receita) ||
    receita < 0
  ) {
    return null
  }

  const {
    irpj,
    csll,
    cofins,
    pis,
    cpp,
    icms,
  } = aliquotasTributos

  const aliquotas = [
    irpj,
    csll,
    cofins,
    pis,
    cpp,
    icms,
  ]

  if (
    aliquotas.some(
      valor =>
        !Number.isFinite(Number(valor)) ||
        Number(valor) < 0
    )
  ) {
    return null
  }

  return {
    irpj: receita * Number(irpj),
    csll: receita * Number(csll),
    cofins: receita * Number(cofins),
    pis: receita * Number(pis),
    cpp: receita * Number(cpp),
    icms: receita * Number(icms),
  }
}

// ============================================================
// PARCELA DE RECEITA QUALIFICADA
// Estrutura-base conforme o fluxo do Motor do Simples:
// estabelecimento → mercado → atividade → qualificações tributárias.
// PIS/COFINS e ICMS permanecem dimensões independentes.
// Ainda não realiza cálculo tributário.
// ============================================================

function normalizarParcelaReceitaQualificada(parcela) {
  if (
    !parcela ||
    typeof parcela !== 'object'
  ) {
    return null
  }

  const estabelecimento = String(
    parcela.estabelecimento ?? ''
  ).trim()

  const mercado = String(
    parcela.mercado ?? ''
  ).trim()

  const atividade = String(
    parcela.atividade ?? ''
  ).trim()

  const classificacaoPisCofins = String(
    parcela.classificacaoPisCofins ?? ''
  ).trim()

  const classificacaoIcms = String(
    parcela.classificacaoIcms ?? ''
  ).trim()

  const valor = Number(parcela.valor)

  if (
    !estabelecimento ||
    !mercado ||
    !atividade ||
    !classificacaoPisCofins ||
    !classificacaoIcms ||
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    return null
  }

  return {
    estabelecimento,
    mercado,
    atividade,
    classificacaoPisCofins,
    classificacaoIcms,
    valor,
  }
}

// ============================================================
// CONSOLIDAÇÃO DAS PARCELAS QUALIFICADAS
// Agrupa somente parcelas com a mesma combinação de:
// estabelecimento + mercado + atividade +
// classificação PIS/COFINS + classificação ICMS.
// Ainda não calcula tributos.
// ============================================================

function consolidarParcelasReceitaQualificada(parcelas) {
  if (!Array.isArray(parcelas)) {
    return null
  }

  const mapa = new Map()

  for (const parcelaOriginal of parcelas) {
    const parcela =
      normalizarParcelaReceitaQualificada(parcelaOriginal)

    // Item/parcela sem qualificação válida bloqueia a consolidação.
    if (!parcela) {
      return null
    }

    const chave = JSON.stringify([
      parcela.estabelecimento,
      parcela.mercado,
      parcela.atividade,
      parcela.classificacaoPisCofins,
      parcela.classificacaoIcms,
    ])

    const existente = mapa.get(chave)

    if (existente) {
      existente.valor += parcela.valor
    } else {
      mapa.set(chave, {
        ...parcela,
      })
    }
  }

  const parcelasConsolidadas =
    Array.from(mapa.values())

  const receitaTotal =
    parcelasConsolidadas.reduce(
      (total, parcela) => total + parcela.valor,
      0
    )

  return {
    parcelas: parcelasConsolidadas,
    receitaTotal,
  }
}

// ============================================================
// ESTRUTURA HIERÁRQUICA DA APURAÇÃO
// estabelecimento → mercado → atividade → parcelas qualificadas
// Espelha o detalhamento operacional do Motor do Simples.
// Ainda não calcula tributos.
// ============================================================

function organizarDetalhamentoApuracao(parcelas) {
  if (!Array.isArray(parcelas)) {
    return null
  }

  const mapaEstabelecimentos = new Map()

  for (const parcelaOriginal of parcelas) {
    const parcela =
      normalizarParcelaReceitaQualificada(parcelaOriginal)

    if (!parcela) {
      return null
    }

    if (!mapaEstabelecimentos.has(parcela.estabelecimento)) {
      mapaEstabelecimentos.set(parcela.estabelecimento, {
        estabelecimento: parcela.estabelecimento,
        receitaTotal: 0,
        mercados: new Map(),
      })
    }

    const estabelecimento =
      mapaEstabelecimentos.get(parcela.estabelecimento)

    estabelecimento.receitaTotal += parcela.valor

    if (!estabelecimento.mercados.has(parcela.mercado)) {
      estabelecimento.mercados.set(parcela.mercado, {
        mercado: parcela.mercado,
        receitaTotal: 0,
        atividades: new Map(),
      })
    }

    const mercado =
      estabelecimento.mercados.get(parcela.mercado)

    mercado.receitaTotal += parcela.valor

    if (!mercado.atividades.has(parcela.atividade)) {
      mercado.atividades.set(parcela.atividade, {
        atividade: parcela.atividade,
        receitaTotal: 0,
        parcelas: [],
      })
    }

    const atividade =
      mercado.atividades.get(parcela.atividade)

    atividade.receitaTotal += parcela.valor

    atividade.parcelas.push({
      classificacaoPisCofins:
        parcela.classificacaoPisCofins,

      classificacaoIcms:
        parcela.classificacaoIcms,

      valor:
        parcela.valor,
    })
  }

  return Array.from(mapaEstabelecimentos.values()).map(
    estabelecimento => ({
      estabelecimento:
        estabelecimento.estabelecimento,

      receitaTotal:
        estabelecimento.receitaTotal,

      mercados: Array.from(
        estabelecimento.mercados.values()
      ).map(mercado => ({
        mercado:
          mercado.mercado,

        receitaTotal:
          mercado.receitaTotal,

        atividades: Array.from(
          mercado.atividades.values()
        ),
      })),
    })
  )
}

// ============================================================
// RESUMO POR DIMENSÃO TRIBUTÁRIA
// Mantém PIS/COFINS e ICMS independentes.
// Não calcula tributos.
// ============================================================

function resumirReceitasPorDimensaoTributaria(parcelas) {
  if (!Array.isArray(parcelas)) {
    return null
  }

  const porPisCofins = new Map()
  const porIcms = new Map()

  let receitaTotal = 0

  for (const parcelaOriginal of parcelas) {
    const parcela =
      normalizarParcelaReceitaQualificada(parcelaOriginal)

    if (!parcela) {
      return null
    }

    receitaTotal += parcela.valor

    const totalPisCofins =
      porPisCofins.get(
        parcela.classificacaoPisCofins
      ) || 0

    porPisCofins.set(
      parcela.classificacaoPisCofins,
      totalPisCofins + parcela.valor
    )

    const totalIcms =
      porIcms.get(
        parcela.classificacaoIcms
      ) || 0

    porIcms.set(
      parcela.classificacaoIcms,
      totalIcms + parcela.valor
    )
  }

  return {
    receitaTotal,

    pisCofins: Array.from(
      porPisCofins.entries()
    ).map(([classificacao, valor]) => ({
      classificacao,
      valor,
    })),

    icms: Array.from(
      porIcms.entries()
    ).map(([classificacao, valor]) => ({
      classificacao,
      valor,
    })),
  }
}

// ============================================================
// PREPARAÇÃO DA MOVIMENTAÇÃO PARA APURAÇÃO
// Consolida e organiza a receita antes de qualquer cálculo.
// Segue o fluxo operacional do Motor do Simples:
// parcelas qualificadas → consolidação → detalhamento → resumo.
// Ainda não calcula DAS nem crédito.
// ============================================================

function prepararMovimentacaoApuracao(parcelas) {
  const consolidacao =
    consolidarParcelasReceitaQualificada(parcelas)

  if (!consolidacao) {
    return null
  }

  const detalhamento =
    organizarDetalhamentoApuracao(
      consolidacao.parcelas
    )

  if (!detalhamento) {
    return null
  }

  const resumoTributario =
    resumirReceitasPorDimensaoTributaria(
      consolidacao.parcelas
    )

  if (!resumoTributario) {
    return null
  }

  return {
    receitaTotal:
      consolidacao.receitaTotal,

    parcelas:
      consolidacao.parcelas,

    detalhamento,

    resumoTributario,
  }
}

// ============================================================
// CONCILIAÇÃO DE RECEITA — MOVIMENTAÇÃO × PGDAS ORIGINAL
// Primeiro portão do fluxo de conferência.
// Havendo divergência, nenhuma apuração de crédito deve seguir
// automaticamente.
// ============================================================

function conciliarReceitaApuradaComPgdas(
  receitaApurada,
  receitaDeclaradaPgdas
) {
  if (
    receitaApurada === null ||
    receitaApurada === undefined ||
    String(receitaApurada).trim() === '' ||
    receitaDeclaradaPgdas === null ||
    receitaDeclaradaPgdas === undefined ||
    String(receitaDeclaradaPgdas).trim() === ''
  ) {
    return null
  }

  const apurada = Number(receitaApurada)
  const declarada = Number(receitaDeclaradaPgdas)

  if (
    !Number.isFinite(apurada) ||
    !Number.isFinite(declarada) ||
    apurada < 0 ||
    declarada < 0
  ) {
    return null
  }

  // A comparação é monetária, em centavos.
  // Não é arredondamento de cálculo tributário.
  const apuradaCentavos =
    Math.round(apurada * 100)

  const declaradaCentavos =
    Math.round(declarada * 100)

  const diferencaCentavos =
    declaradaCentavos - apuradaCentavos

  const receitasCoincidem =
    diferencaCentavos === 0

  return {
    receitaApurada:
      apuradaCentavos / 100,

    receitaDeclaradaPgdas:
      declaradaCentavos / 100,

    diferenca:
      diferencaCentavos / 100,

    receitasCoincidem,

    status:
      receitasCoincidem
        ? 'conciliada'
        : 'divergente',

    requerDecisao:
      !receitasCoincidem,
  }
}

// ============================================================
// DECISÃO DIANTE DE DIVERGÊNCIA DE RECEITA
// Fluxo espelhado do e-Recuperador:
// 1) interromper;
// 2) manter divergência sem gerar resultado automático;
// 3) usar receita declarada e aplicar ajuste conservador.
// Nesta etapa ainda NÃO realiza o ajuste conservador.
// ============================================================

function resolverDivergenciaReceita(
  conciliacao,
  decisao = null
) {
  if (
    !conciliacao ||
    typeof conciliacao !== 'object'
  ) {
    return null
  }

  if (conciliacao.receitasCoincidem) {
    return {
      status: 'conciliada',
      decisao: 'seguir',
      interrompida: false,
      podeProsseguirApuracao: true,
      podeGerarResultadoAutomatico: true,
      requerAjusteConservador: false,
    }
  }

  const decisoesPermitidas = [
    'interromper',
    'manter_divergencia',
    'usar_receita_declarada',
  ]

  if (!decisoesPermitidas.includes(decisao)) {
    return {
      status: 'aguardando_decisao',
      decisao: null,
      interrompida: false,
      podeProsseguirApuracao: false,
      podeGerarResultadoAutomatico: false,
      requerAjusteConservador: false,
    }
  }

  if (decisao === 'interromper') {
    return {
      status: 'interrompida',
      decisao,
      interrompida: true,
      podeProsseguirApuracao: false,
      podeGerarResultadoAutomatico: false,
      requerAjusteConservador: false,
    }
  }

  if (decisao === 'manter_divergencia') {
    return {
      status: 'divergencia_mantida',
      decisao,
      interrompida: false,
      podeProsseguirApuracao: false,
      podeGerarResultadoAutomatico: false,
      requerAjusteConservador: false,
    }
  }

  return {
    status: 'ajuste_conservador_pendente',
    decisao: 'usar_receita_declarada',
    interrompida: false,
    podeProsseguirApuracao: false,
    podeGerarResultadoAutomatico: false,
    requerAjusteConservador: true,
  }
}

// ============================================================
// PLANO DE AJUSTE CONSERVADOR DA RECEITA
// Espelha a regra do e-Recuperador sem ainda redistribuir
// valores entre parcelas ou qualificações específicas.
//
// diferença = receita declarada PGDAS - receita apurada
//
// diferença positiva:
//   acrescenta às receitas integralmente tributadas.
//
// diferença negativa:
//   reduz receitas submetidas a tratamento específico
//   (ST / monofásico / antecipação com encerramento).
//
// A distribuição entre qualificações será tratada depois,
// somente quando houver regra segura para essa distribuição.
// ============================================================

function planejarAjusteConservadorReceita(conciliacao) {
  if (
    !conciliacao ||
    typeof conciliacao !== 'object'
  ) {
    return null
  }

  const diferenca = Number(conciliacao.diferenca)

  if (!Number.isFinite(diferenca)) {
    return null
  }

  if (diferenca === 0) {
    return {
      necessario: false,
      valorAjuste: 0,
      tipoAjuste: 'nenhum',

      adicionarReceitaIntegralmenteTributada: 0,
      reduzirReceitaComTratamentoEspecifico: 0,
    }
  }

  if (diferenca > 0) {
    return {
      necessario: true,
      valorAjuste: diferenca,
      tipoAjuste: 'adicionar_tributacao_integral',

      adicionarReceitaIntegralmenteTributada:
        diferenca,

      reduzirReceitaComTratamentoEspecifico:
        0,
    }
  }

  return {
    necessario: true,
    valorAjuste: Math.abs(diferenca),
    tipoAjuste: 'reduzir_tratamento_especifico',

    adicionarReceitaIntegralmenteTributada:
      0,

    reduzirReceitaComTratamentoEspecifico:
      Math.abs(diferenca),
  }
}

// ============================================================
// APLICAÇÃO DO AJUSTE CONSERVADOR POSITIVO
//
// Quando a receita declarada no PGDAS é MAIOR que a receita
// encontrada nos documentos, a diferença é considerada receita
// sem tratamento monofásico, sem ICMS-ST e sem antecipação com
// encerramento.
//
// O ajuste fica separado das parcelas documentais para manter
// rastreabilidade e não inventar estabelecimento/atividade.
// ============================================================

function aplicarAjusteConservadorPositivo(
  movimentacao,
  conciliacao,
  resolucao,
  plano
) {
  if (
    !movimentacao ||
    typeof movimentacao !== 'object' ||
    !conciliacao ||
    typeof conciliacao !== 'object' ||
    !resolucao ||
    typeof resolucao !== 'object' ||
    !plano ||
    typeof plano !== 'object'
  ) {
    return null
  }

  if (
    resolucao.decisao !== 'usar_receita_declarada' ||
    !resolucao.requerAjusteConservador
  ) {
    return null
  }

  if (
    plano.tipoAjuste !== 'adicionar_tributacao_integral'
  ) {
    return null
  }

  const receitaDocumentos =
    Number(movimentacao.receitaTotal)

  const receitaDeclarada =
    Number(conciliacao.receitaDeclaradaPgdas)

  const valorAjuste =
    Number(
      plano.adicionarReceitaIntegralmenteTributada
    )

  if (
    !Number.isFinite(receitaDocumentos) ||
    !Number.isFinite(receitaDeclarada) ||
    !Number.isFinite(valorAjuste) ||
    receitaDocumentos < 0 ||
    receitaDeclarada < 0 ||
    valorAjuste <= 0
  ) {
    return null
  }

  const receitaDocumentosCentavos =
    Math.round(receitaDocumentos * 100)

  const receitaDeclaradaCentavos =
    Math.round(receitaDeclarada * 100)

  const valorAjusteCentavos =
    Math.round(valorAjuste * 100)

  if (
    receitaDocumentosCentavos +
      valorAjusteCentavos !==
    receitaDeclaradaCentavos
  ) {
    return null
  }

  return {
    status: 'ajuste_conservador_aplicado',

    receitaTotalDocumentos:
      receitaDocumentosCentavos / 100,

    receitaTotalConsiderada:
      receitaDeclaradaCentavos / 100,

    ajusteConservador: {
      origem: 'conciliacao_pgdas',

      tipo:
        'adicao_tributacao_integral',

      valor:
        valorAjusteCentavos / 100,

      classificacaoPisCofins:
        'sem_monofasico',

      classificacaoIcms:
        'sem_st_sem_antecipacao_encerramento',
    },

    movimentacaoOriginal:
      movimentacao,
  }
}

// ============================================================
// PREPARAÇÃO DO AJUSTE CONSERVADOR NEGATIVO
//
// Quando a receita declarada no PGDAS é MENOR que a receita
// apurada pelos documentos, a diferença deve reduzir receitas
// submetidas a tratamento específico.
//
// Nesta etapa:
// - NÃO escolhe monofásico, ST ou antecipação;
// - NÃO distribui valores entre parcelas;
// - apenas verifica se existe receita beneficiada suficiente
//   para suportar a redução.
// ============================================================

function prepararAjusteConservadorNegativo(
  resolucao,
  plano,
  receitaTratamentoEspecificoDisponivel
) {
  if (
    !resolucao ||
    typeof resolucao !== 'object' ||
    !plano ||
    typeof plano !== 'object' ||
    receitaTratamentoEspecificoDisponivel === null ||
    receitaTratamentoEspecificoDisponivel === undefined ||
    String(receitaTratamentoEspecificoDisponivel).trim() === ''
  ) {
    return null
  }

  if (
    resolucao.decisao !== 'usar_receita_declarada' ||
    !resolucao.requerAjusteConservador
  ) {
    return null
  }

  if (
    plano.tipoAjuste !==
      'reduzir_tratamento_especifico'
  ) {
    return null
  }

  const valorAjuste =
    Number(
      plano.reduzirReceitaComTratamentoEspecifico
    )

  const receitaDisponivel =
    Number(
      receitaTratamentoEspecificoDisponivel
    )

  if (
    !Number.isFinite(valorAjuste) ||
    !Number.isFinite(receitaDisponivel) ||
    valorAjuste <= 0 ||
    receitaDisponivel < 0
  ) {
    return null
  }

  const valorAjusteCentavos =
    Math.round(valorAjuste * 100)

  const receitaDisponivelCentavos =
    Math.round(receitaDisponivel * 100)

  const capacidadeSuficiente =
    receitaDisponivelCentavos >=
    valorAjusteCentavos

  const saldoCentavos =
    receitaDisponivelCentavos -
    valorAjusteCentavos

  return {
    status:
      capacidadeSuficiente
        ? 'ajuste_negativo_aguardando_distribuicao'
        : 'ajuste_negativo_sem_capacidade',

    valorAjuste:
      valorAjusteCentavos / 100,

    receitaTratamentoEspecificoDisponivel:
      receitaDisponivelCentavos / 100,

    capacidadeSuficiente,

    saldoTratamentoEspecificoAposAjuste:
      capacidadeSuficiente
        ? saldoCentavos / 100
        : null,

    valorNaoAbsorvido:
      capacidadeSuficiente
        ? 0
        : Math.abs(saldoCentavos) / 100,

    requerDistribuicaoEntreQualificacoes:
      capacidadeSuficiente,

    podeProsseguirApuracao: false,
  }
}

// ============================================================
// POLÍTICA DO ESCOPO DA RECUPERAÇÃO
//
// No fluxo de recuperação de PIS/COFINS monofásico,
// o ICMS originalmente declarado deve ser preservado,
// salvo opção expressa em sentido contrário.
//
// Essa política impede que o ajuste conservador altere
// automaticamente dimensões tributárias fora do escopo.
// ============================================================

function definirPoliticaRecuperacaoPisCofins({
  alterarIcms = false,
} = {}) {
  return {
    tributosEmRecuperacao: [
      'pis',
      'cofins',
    ],

    preservarReceitaBrutaDeclarada: true,

    preservarIcmsDeclarado:
      !alterarIcms,

    alterarIcms:
      Boolean(alterarIcms),

    permiteAjustePisCofins:
      true,

    permiteAjusteIcms:
      Boolean(alterarIcms),
  }
}

// ============================================================
// RECEITAS COM TRATAMENTO ESPECÍFICO — PIS/COFINS
//
// Usa exclusivamente a dimensão classificacaoPisCofins.
// ICMS permanece independente e não participa deste cálculo.
//
// Classificações vigentes do FiscalTribe:
// - monofasico
// - st_pis_cofins
//
// Receita "tributado" não integra a capacidade de redução.
// ============================================================

const CLASSIFICACOES_PIS_COFINS_TRATAMENTO_ESPECIFICO =
  new Set([
    'monofasico',
    'st_pis_cofins',
  ])

function apurarReceitaPisCofinsTratamentoEspecifico(
  parcelas,
  politica
) {
  if (
    !Array.isArray(parcelas) ||
    !politica ||
    typeof politica !== 'object' ||
    !politica.permiteAjustePisCofins
  ) {
    return null
  }

  const parcelasElegiveis = []
  let receitaElegivelCentavos = 0

  for (const parcelaOriginal of parcelas) {
    const parcela =
      normalizarParcelaReceitaQualificada(
        parcelaOriginal
      )

    if (!parcela) {
      return null
    }

    if (
      !CLASSIFICACOES_PIS_COFINS_TRATAMENTO_ESPECIFICO
        .has(parcela.classificacaoPisCofins)
    ) {
      continue
    }

    const valorCentavos =
      Math.round(parcela.valor * 100)

    receitaElegivelCentavos +=
      valorCentavos

    parcelasElegiveis.push({
      ...parcela,
      valor:
        valorCentavos / 100,
    })
  }

  return {
    receitaTratamentoEspecificoDisponivel:
      receitaElegivelCentavos / 100,

    quantidadeParcelasElegiveis:
      parcelasElegiveis.length,

    parcelasElegiveis,
  }
}

// ============================================================
// PREPARAÇÃO INTEGRADA DO AJUSTE NEGATIVO — PIS/COFINS
//
// Liga:
// 1) parcelas classificadas;
// 2) política da recuperação;
// 3) plano conservador;
// 4) capacidade disponível.
//
// Ainda NÃO altera nenhuma parcela.
// ============================================================

function prepararReducaoConservadoraPisCofins(
  movimentacao,
  politica,
  resolucao,
  plano
) {
  if (
    !movimentacao ||
    typeof movimentacao !== 'object' ||
    !Array.isArray(movimentacao.parcelas)
  ) {
    return null
  }

  const receitaElegivel =
    apurarReceitaPisCofinsTratamentoEspecifico(
      movimentacao.parcelas,
      politica
    )

  if (!receitaElegivel) {
    return null
  }

  const preparacao =
    prepararAjusteConservadorNegativo(
      resolucao,
      plano,
      receitaElegivel
        .receitaTratamentoEspecificoDisponivel
    )

  if (!preparacao) {
    return null
  }

  return {
    ...preparacao,

    receitaPisCofinsElegivel:
      receitaElegivel
        .receitaTratamentoEspecificoDisponivel,

    quantidadeParcelasElegiveis:
      receitaElegivel
        .quantidadeParcelasElegiveis,

    parcelasElegiveis:
      receitaElegivel
        .parcelasElegiveis,
  }
}

// ============================================================
// CANDIDATAS À REDUÇÃO CONSERVADORA — PIS/COFINS
//
// Prepara as parcelas elegíveis para uma futura distribuição.
//
// NÃO escolhe critério de rateio.
// NÃO altera valores.
// NÃO toca na dimensão de ICMS.
// ============================================================

function prepararCandidatasReducaoPisCofins(
  preparacao
) {
  if (
    !preparacao ||
    typeof preparacao !== 'object' ||
    !Array.isArray(preparacao.parcelasElegiveis)
  ) {
    return null
  }

  const candidatas = []

  for (
    const parcelaOriginal
    of preparacao.parcelasElegiveis
  ) {
    const parcela =
      normalizarParcelaReceitaQualificada(
        parcelaOriginal
      )

    if (!parcela) {
      return null
    }

    const valorCentavos =
      Math.round(parcela.valor * 100)

    const chaveParcela =
      JSON.stringify([
        parcela.estabelecimento,
        parcela.mercado,
        parcela.atividade,
        parcela.classificacaoPisCofins,
        parcela.classificacaoIcms,
      ])

    candidatas.push({
      chaveParcela,

      estabelecimento:
        parcela.estabelecimento,

      mercado:
        parcela.mercado,

      atividade:
        parcela.atividade,

      classificacaoPisCofins:
        parcela.classificacaoPisCofins,

      classificacaoIcms:
        parcela.classificacaoIcms,

      valorDisponivel:
        valorCentavos / 100,

      reducaoMaxima:
        valorCentavos / 100,
    })
  }

  const capacidadeTotalCentavos =
    candidatas.reduce(
      (total, parcela) =>
        total +
        Math.round(
          parcela.valorDisponivel * 100
        ),
      0
    )

  return {
    valorReducaoNecessario:
      Number(preparacao.valorAjuste),

    capacidadeTotal:
      capacidadeTotalCentavos / 100,

    quantidadeCandidatas:
      candidatas.length,

    candidatas,

    distribuicaoAplicada: false,
  }
}

function validarDistribuicaoReducaoPisCofins(
  preparacaoCandidatas,
  distribuicao = []
) {
  const erros = []

  const candidatas = Array.isArray(preparacaoCandidatas?.candidatas)
    ? preparacaoCandidatas.candidatas
    : []

  const valorReducaoNecessario = Number(
    preparacaoCandidatas?.valorReducaoNecessario ?? 0
  )

  const paraCentavos = (valor) => {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) => valor / 100

  const valorReducaoNecessarioCentavos =
    paraCentavos(valorReducaoNecessario)

  if (
    valorReducaoNecessarioCentavos === null ||
    valorReducaoNecessarioCentavos < 0
  ) {
    erros.push(
      'O valor da redução necessária é inválido.'
    )
  }

  if (!Array.isArray(distribuicao)) {
    return {
      valida: false,
      valorReducaoNecessario,
      valorDistribuido: 0,
      saldoPendente: valorReducaoNecessario,
      quantidadeCandidatasUtilizadas: 0,
      distribuicao: [],
      erros: ['A distribuição informada é inválida.']
    }
  }

  const candidatasPorChave = new Map()

  for (const candidata of candidatas) {
    const chaveParcela = String(
      candidata?.chaveParcela ?? ''
    ).trim()

    if (!chaveParcela) {
      continue
    }

    candidatasPorChave.set(chaveParcela, candidata)
  }

  const chavesUtilizadas = new Set()
  const distribuicaoNormalizada = []

  let valorDistribuidoCentavos = 0

  for (const item of distribuicao) {
    const chaveParcela = String(
      item?.chaveParcela ?? ''
    ).trim()

    if (!chaveParcela) {
      erros.push(
        'Existe uma distribuição sem chaveParcela.'
      )
      continue
    }

    if (chavesUtilizadas.has(chaveParcela)) {
      erros.push(
        `A parcela ${chaveParcela} foi informada mais de uma vez na distribuição.`
      )
      continue
    }

    chavesUtilizadas.add(chaveParcela)

    const candidata = candidatasPorChave.get(chaveParcela)

    if (!candidata) {
      erros.push(
        `A parcela ${chaveParcela} não pertence às candidatas elegíveis para redução.`
      )
      continue
    }

    const valorReducaoCentavos =
      paraCentavos(item?.valorReducao)

    if (valorReducaoCentavos === null) {
      erros.push(
        `O valor de redução da parcela ${chaveParcela} é inválido.`
      )
      continue
    }

    if (valorReducaoCentavos < 0) {
      erros.push(
        `A redução da parcela ${chaveParcela} não pode ser negativa.`
      )
      continue
    }

    const reducaoMaximaCentavos =
      paraCentavos(
        candidata?.reducaoMaxima ??
        candidata?.valorDisponivel ??
        0
      ) ?? 0

    const valorDisponivelCentavos =
      paraCentavos(
        candidata?.valorDisponivel ?? 0
      ) ?? 0

    if (valorReducaoCentavos > reducaoMaximaCentavos) {
      erros.push(
        `A redução da parcela ${chaveParcela} ultrapassa a redução máxima permitida.`
      )
      continue
    }

    if (
      valorDisponivelCentavos -
      valorReducaoCentavos <
      0
    ) {
      erros.push(
        `A redução da parcela ${chaveParcela} deixaria seu valor abaixo de zero.`
      )
      continue
    }

    valorDistribuidoCentavos += valorReducaoCentavos

    distribuicaoNormalizada.push({
      chaveParcela,
      estabelecimento: candidata.estabelecimento,
      mercado: candidata.mercado,
      atividade: candidata.atividade,
      classificacaoPisCofins:
        candidata.classificacaoPisCofins,
      classificacaoIcms:
        candidata.classificacaoIcms,
      valorDisponivel:
        deCentavos(valorDisponivelCentavos),
      reducaoMaxima:
        deCentavos(reducaoMaximaCentavos),
      valorReducao:
        deCentavos(valorReducaoCentavos),
      valorAposReducao:
        deCentavos(
          valorDisponivelCentavos -
          valorReducaoCentavos
        )
    })
  }

  if (
    valorReducaoNecessarioCentavos !== null &&
    valorDistribuidoCentavos !==
      valorReducaoNecessarioCentavos
  ) {
    erros.push(
      'A soma das reduções deve ser exatamente igual ao valor da redução necessária.'
    )
  }

  const saldoPendenteCentavos =
    valorReducaoNecessarioCentavos === null
      ? 0
      : valorReducaoNecessarioCentavos -
        valorDistribuidoCentavos

  return {
    valida: erros.length === 0,
    valorReducaoNecessario:
      valorReducaoNecessarioCentavos === null
        ? valorReducaoNecessario
        : deCentavos(
            valorReducaoNecessarioCentavos
          ),
    valorDistribuido:
      deCentavos(valorDistribuidoCentavos),
    saldoPendente:
      deCentavos(saldoPendenteCentavos),
    quantidadeCandidatasUtilizadas:
      distribuicaoNormalizada.filter(
        (item) => item.valorReducao > 0
      ).length,
    distribuicao: distribuicaoNormalizada,
    erros
  }
}

function aplicarDistribuicaoReducaoPisCofins(
  movimentacao,
  validacaoDistribuicao
) {
  if (!validacaoDistribuicao?.valida) {
    return {
      aplicado: false,
      motivo: 'distribuicao_nao_validada',
      movimentacaoAjustada: movimentacao,
      valorAplicado: 0,
      quantidadeParcelasAjustadas: 0,
      ajustes: [],
      erros: [
        'A distribuição precisa estar validada antes de ser aplicada.'
      ]
    }
  }

  const parcelas = Array.isArray(movimentacao?.parcelas)
    ? movimentacao.parcelas
    : []

  const distribuicao = Array.isArray(
    validacaoDistribuicao?.distribuicao
  )
    ? validacaoDistribuicao.distribuicao
    : []

  const paraCentavos = (valor) => {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) => valor / 100

  const reducoesPorChave = new Map()

  for (const item of distribuicao) {
    const chaveParcela = String(
      item?.chaveParcela ?? ''
    ).trim()

    const valorReducaoCentavos =
      paraCentavos(item?.valorReducao)

    if (
      !chaveParcela ||
      valorReducaoCentavos === null ||
      valorReducaoCentavos <= 0
    ) {
      continue
    }

    reducoesPorChave.set(
      chaveParcela,
      valorReducaoCentavos
    )
  }

  const erros = []

  /*
   * Primeira passagem:
   * confirma que a distribuição validada continua
   * compatível com a movimentação atual.
   *
   * Isso evita aplicar uma validação antiga sobre
   * uma movimentação que tenha sido reprocessada.
   */
  const parcelasPorChave = new Map()

  for (const parcela of parcelas) {
    const chaveParcela = JSON.stringify([
      parcela.estabelecimento,
      parcela.mercado,
      parcela.atividade,
      parcela.classificacaoPisCofins,
      parcela.classificacaoIcms,
    ])

    parcelasPorChave.set(
      chaveParcela,
      parcela
    )
  }

  for (const [
    chaveParcela,
    valorReducaoCentavos
  ] of reducoesPorChave) {
    const parcela = parcelasPorChave.get(
      chaveParcela
    )

    if (!parcela) {
      erros.push(
        `A parcela ${chaveParcela} não existe mais na movimentação atual.`
      )
      continue
    }

    const valorOriginalCentavos =
      paraCentavos(parcela?.valor)

    if (valorOriginalCentavos === null) {
      erros.push(
        `O valor atual da parcela ${chaveParcela} é inválido.`
      )
      continue
    }

    if (
      valorReducaoCentavos >
      valorOriginalCentavos
    ) {
      erros.push(
        `A redução da parcela ${chaveParcela} ultrapassa o valor atualmente disponível.`
      )
    }
  }

  /*
   * Se a movimentação mudou depois da validação,
   * não aplica redução parcial.
   *
   * A movimentação original permanece intacta.
   */
  if (erros.length > 0) {
    return {
      aplicado: false,
      motivo: 'movimentacao_incompativel_com_validacao',
      movimentacaoAjustada: movimentacao,
      valorAplicado: 0,
      quantidadeParcelasAjustadas: 0,
      ajustes: [],
      erros
    }
  }

  let valorAplicadoCentavos = 0

  const ajustes = []

  const parcelasAjustadas = parcelas.map(
    (parcela) => {
      const chaveParcela = JSON.stringify([
        parcela.estabelecimento,
        parcela.mercado,
        parcela.atividade,
        parcela.classificacaoPisCofins,
        parcela.classificacaoIcms,
      ])

      const valorReducaoCentavos =
        reducoesPorChave.get(chaveParcela) ?? 0

      /*
       * Parcela não contemplada pela distribuição:
       * apenas copia, sem alteração.
       */
      if (valorReducaoCentavos <= 0) {
        return {
          ...parcela
        }
      }

      const valorOriginalCentavos =
        paraCentavos(parcela.valor) ?? 0

      const valorAjustadoCentavos =
        valorOriginalCentavos -
        valorReducaoCentavos

      valorAplicadoCentavos +=
        valorReducaoCentavos

      ajustes.push({
        chaveParcela,

        estabelecimento:
          parcela.estabelecimento,

        mercado:
          parcela.mercado,

        atividade:
          parcela.atividade,

        classificacaoPisCofins:
          parcela.classificacaoPisCofins,

        /*
         * ICMS é preservado.
         * Não é reclassificado nem alterado.
         */
        classificacaoIcms:
          parcela.classificacaoIcms,

        valorAntes:
          deCentavos(valorOriginalCentavos),

        valorReducao:
          deCentavos(valorReducaoCentavos),

        valorDepois:
          deCentavos(valorAjustadoCentavos)
      })

      return {
        ...parcela,

        /*
         * Somente o valor da parcela é reduzido.
         * Todas as dimensões permanecem intactas.
         */
        valor:
          deCentavos(valorAjustadoCentavos)
      }
    }
  )
  
  const movimentacaoReprocessada =
  prepararMovimentacaoApuracao(
    parcelasAjustadas
  )

if (!movimentacaoReprocessada) {
  return {
    aplicado: false,
    motivo: 'falha_reprocessamento_movimentacao',
    movimentacaoAjustada: movimentacao,
    valorAplicado: 0,
    quantidadeParcelasAjustadas: 0,
    ajustes: [],
    erros: [
      'Não foi possível reprocessar a movimentação após a aplicação da redução.'
    ]
  }
}

  return {
    aplicado: true,

    tipo:
      'reducao_conservadora_pis_cofins',

    distribuicaoAplicada: true,

    valorReducaoNecessario:
      Number(
        validacaoDistribuicao
          ?.valorReducaoNecessario ?? 0
      ),

    valorAplicado:
      deCentavos(valorAplicadoCentavos),

    quantidadeParcelasAjustadas:
      ajustes.length,

    ajustes,

    movimentacaoAjustada: {
    ...movimentacao,
    ...movimentacaoReprocessada
    },

    erros: []
  }
}

// ============================================================
// SEGREGAÇÃO — PIS/COFINS MONOFÁSICO
// Mantém a receita total e separa apenas a parcela monofásica.
// ICMS-ST será tratado em dimensão independente.
// ============================================================

function segregarReceitaPisCofinsMonofasica(
  receitaTotal,
  receitaMonofasica
) {
  if (
    receitaTotal === null ||
    receitaTotal === undefined ||
    String(receitaTotal).trim() === '' ||
    receitaMonofasica === null ||
    receitaMonofasica === undefined ||
    String(receitaMonofasica).trim() === ''
  ) {
    return null
  }

  const total = Number(receitaTotal)
  const monofasica = Number(receitaMonofasica)

  if (
    !Number.isFinite(total) ||
    !Number.isFinite(monofasica) ||
    total < 0 ||
    monofasica < 0 ||
    monofasica > total
  ) {
    return null
  }

  return {
    receitaTotal: total,
    receitaMonofasica: monofasica,
    receitaNormal: total - monofasica,
  }
}

// ============================================================
// TRATAMENTO MONOFÁSICO — PIS/COFINS
// PIS e Cofins incidem somente sobre a receita normal.
// Os demais tributos permanecem sobre a receita total.
// Ainda sem arredondamento monetário.
// ============================================================

function calcularTributosComTratamentoMonofasico(
  segregacao,
  aliquotasTributos
) {
  if (
    !segregacao ||
    !aliquotasTributos
  ) {
    return null
  }

  const total = Number(segregacao.receitaTotal)
  const normal = Number(segregacao.receitaNormal)
  const monofasica = Number(segregacao.receitaMonofasica)

  const aliquotaPis = Number(aliquotasTributos.pis)
  const aliquotaCofins = Number(aliquotasTributos.cofins)

  if (
    !Number.isFinite(total) ||
    !Number.isFinite(normal) ||
    !Number.isFinite(monofasica) ||
    !Number.isFinite(aliquotaPis) ||
    !Number.isFinite(aliquotaCofins) ||
    total < 0 ||
    normal < 0 ||
    monofasica < 0 ||
    aliquotaPis < 0 ||
    aliquotaCofins < 0
  ) {
    return null
  }

  const valoresBase = calcularValoresTributosTeoricosBase(
    total,
    aliquotasTributos
  )

  if (!valoresBase) {
    return null
  }

  const pisDesconsiderado =
    monofasica * aliquotaPis

  const cofinsDesconsiderado =
    monofasica * aliquotaCofins

  return {
    valoresTributos: {
      ...valoresBase,

      pis:
        normal * aliquotaPis,

      cofins:
        normal * aliquotaCofins,
    },

    valoresDesconsideradosMonofasico: {
      pis: pisDesconsiderado,
      cofins: cofinsDesconsiderado,
      total:
        pisDesconsiderado +
        cofinsDesconsiderado,
    },
  }
}

function Badge({ label, tipo }) {
  const map = {
    aguardando:   { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    transmitida:  { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    em_atraso:    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    original:     { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    retificadora: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  }
  const b = map[tipo] || map['aguardando']
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array(cols).fill(null).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <div style={{ height: 13, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

const GHOST_ROWS = Array(5).fill(null).map((_, i) => ({
  ghost: true,
  id: `ghost-${i}`,
  competencia: 'MM/AAAA',
  receita_apurada: 0,
  imposto_apurado: 0,
  aliquota_efetiva: 0,
  tipo_declaracao: 'Original',
  status_apuracao: 'Aguardando',
  status_declaracao: 'Aguardando',
  data_transmissao: '',
  cliente_id: null,
}))

const VAZIO = {
  competencia: '', receita_apurada: '', imposto_apurado: '',
  aliquota_efetiva: '', tipo_declaracao: 'Original',
  status_apuracao: 'Aguardando', status_declaracao: 'Aguardando',
  data_transmissao: '', transmitido_por: ''
}

export default function ApuracaoSimples() {
  const [apuracoes, setApuracoes]     = useState([])
  const [clientes, setClientes]       = useState({})
  const [loading, setLoading]         = useState(false)
  const [busca, setBusca]             = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [pagina, setPagina]           = useState(1)
  const [porPagina, setPorPagina]     = useState(10)
  const [detalhe, setDetalhe]         = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalNova, setModalNova]     = useState(false)
  const [form, setForm]               = useState(VAZIO)
  const [salvando, setSalvando]       = useState(false)
  const [excluindo, setExcluindo]     = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: aps }, { data: cls }] = await Promise.all([
      supabase.from('apuracoes_simples').select('*').order('competencia', { ascending: false }),
      supabase.from('clientes').select('id, razao_social, cnpj, regime')
    ])
    setApuracoes(aps || [])
    const mapa = {}
    ;(cls || []).forEach(c => { mapa[c.id] = c })
    setClientes(mapa)
    setLoading(false)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const payload = {
        ...form,
        receita_apurada:  parseFloat(form.receita_apurada  || 0),
        imposto_apurado:  parseFloat(form.imposto_apurado  || 0),
        aliquota_efetiva: parseFloat(form.aliquota_efetiva || 0),
      }
      if (modalEditar) {
        const { error } = await supabase.from('apuracoes_simples').update(payload).eq('id', modalEditar.id)
        if (error) throw error
      } else {
        if (!form.cliente_id) return alert('Selecione a empresa')
        const { error } = await supabase.from('apuracoes_simples').insert({ ...payload, created_at: new Date().toISOString() })
        if (error) throw error
      }
      setModalEditar(null); setModalNova(false); setForm(VAZIO)
      await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta apuracao?')) return
    await supabase.from('apuracoes_simples').delete().eq('id', id)
    if (detalhe?.id === id) setDetalhe(null)
    await carregar()
  }

  async function excluirTodos() {
    if (!window.confirm(`Excluir todas as ${filtradas.length} apuracoes filtradas? Esta acao nao pode ser desfeita.`)) return
    setExcluindo(true)
    try {
      const ids = filtradas.map(a => a.id)
      await supabase.from('apuracoes_simples').delete().in('id', ids)
      await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setExcluindo(false) }
  }

  function abrirEditar(a) {
    setForm({ ...a, receita_apurada: a.receita_apurada?.toString(), imposto_apurado: a.imposto_apurado?.toString(), aliquota_efetiva: a.aliquota_efetiva?.toString() })
    setModalEditar(a)
  }

  function statusTipo(s) {
    if (!s) return 'aguardando'
    if (s === 'Transmitida') return 'transmitida'
    if (s === 'Em atraso') return 'em_atraso'
    return 'aguardando'
  }

  const filtradas = apuracoes.filter(a => {
    if (filtroStatus !== 'todos' && a.status_apuracao?.toLowerCase().replace(' ', '_') !== filtroStatus) return false
    if (busca) {
      const b = busca.toLowerCase()
      const cl = clientes[a.cliente_id]
      return cl?.razao_social?.toLowerCase().includes(b) || a.competencia?.includes(b)
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
  const pagAtual     = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina)
  const temDados     = apuracoes.length > 0
  const linhasExibir = loading ? null : (temDados ? pagAtual : GHOST_ROWS)

  // ── TELA DETALHE ──────────────────────────────────────────────
  if (detalhe) {
    const cl = clientes[detalhe.cliente_id]
    return (
      <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text, maxWidth: 800, margin: '0 auto' }}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="no-print" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
            Motor do Simples / Apuracao / <strong style={{ color: S.text }}>Detalhe</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: S.navy, flex: 1 }}>Apuracao — {detalhe.competencia}</div>
            <button onClick={() => abrirEditar(detalhe)}
              style={{ padding: '7px 14px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Editar
            </button>
            <button onClick={() => window.print()}
              style={{ padding: '7px 14px', background: S.navy, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Imprimir
            </button>
            <button onClick={() => setDetalhe(null)}
              style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
              Voltar
            </button>
          </div>
        </div>
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ background: S.navy, padding: '18px 24px' }}>
            <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>e-FISCALTRIBE — MOTOR DO SIMPLES NACIONAL</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: S.white }}>Relatorio de Apuracao — {detalhe.competencia}</div>
            <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>{cl?.razao_social} · {cl?.cnpj} · {cl?.regime}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, borderBottom: `1px solid ${S.border}` }}>
            {[
              { label: 'Receita Apurada',      value: fmtR(detalhe.receita_apurada),   color: S.navy },
              { label: 'Imposto Apurado (DAS)', value: fmtR(detalhe.imposto_apurado),   color: S.red  },
              { label: 'Aliquota Efetiva',      value: fmtPct(detalhe.aliquota_efetiva), color: S.blue },
            ].map((k, i) => (
              <div key={i} style={{ padding: '16px 24px', borderRight: i < 2 ? `1px solid ${S.border}` : 'none' }}>
                <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.navy, marginBottom: 12 }}>Informacoes da Declaracao</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  { label: 'Competencia',        value: detalhe.competencia },
                  { label: 'Tipo de Declaracao', value: detalhe.tipo_declaracao },
                  { label: 'Status da Apuracao', value: <Badge label={detalhe.status_apuracao || 'Aguardando'} tipo={statusTipo(detalhe.status_apuracao)} /> },
                  { label: 'Status da Declaracao', value: <Badge label={detalhe.status_declaracao || 'Aguardando'} tipo={statusTipo(detalhe.status_declaracao)} /> },
                  { label: 'Data de Transmissao', value: detalhe.data_transmissao || '—' },
                  { label: 'Transmitido por',     value: detalhe.transmitido_por || '—' },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: '10px 0', color: S.muted, fontWeight: 600, width: '40%' }}>{r.label}</td>
                    <td style={{ padding: '10px 0', color: S.text }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${S.border}`, background: S.bg, fontSize: 11, color: S.muted, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>e-FiscalTribe® — Motor de Inteligencia Tributaria</span>
            <span>Gerado em {new Date().toLocaleDateString('pt-BR')} as {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── TELA LISTA ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Motor do Simples / <strong style={{ color: S.text }}>Apuracao do Simples Nacional</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.navy, flex: 1 }}>Apuracao do Simples Nacional</div>
          {temDados && (
            <button onClick={excluirTodos} disabled={excluindo || filtradas.length === 0}
              style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.red}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: S.red }}>
              {excluindo ? 'Excluindo...' : `Excluir todos (${filtradas.length})`}
            </button>
          )}
          <button onClick={() => { setForm(VAZIO); setModalNova(true) }}
            style={{ padding: '7px 14px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Apuracao
          </button>
        </div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Gerencie as apuracoes do Simples Nacional de todos os clientes.
        </div>
      </div>

      {/* TABELA */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>

        {/* BUSCA E FILTROS */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar empresa ou competencia..."
            style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 240 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: S.muted }}>Status:</span>
            {[
              { id: 'todos',      label: 'Todos'      },
              { id: 'aguardando', label: 'Aguardando' },
              { id: 'transmitida',label: 'Transmitida'},
              { id: 'em_atraso',  label: 'Em atraso'  },
            ].map(f => (
              <button key={f.id} onClick={() => { setFiltroStatus(f.id); setPagina(1) }}
                style={{ padding: '4px 10px', background: filtroStatus === f.id ? S.navy : 'none', color: filtroStatus === f.id ? S.white : S.muted, border: `1px solid ${filtroStatus === f.id ? S.navy : S.border}`, borderRadius: 99, fontSize: 11, fontWeight: filtroStatus === f.id ? 700 : 400, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.thBg }}>
                {['Empresa', 'Competencia', 'Receita Apurada', 'Imposto Apurado', 'Aliquota', 'Tipo', 'Status Apuracao', 'Status Declaracao', 'Transmissao', 'Acoes'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(null).map((_, i) => <SkeletonRow key={i} cols={10} />)
              ) : (
                linhasExibir.map((a, i) => {
                  const isGhost = a.ghost
                  const cl = !isGhost ? clientes[a.cliente_id] : null
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${S.border}`, background: isGhost ? S.ghost : i % 2 === 0 ? S.white : '#FAFAFA' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: isGhost ? S.ghostText : S.navy, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isGhost ? 'Nome da Empresa' : (cl?.razao_social || '—')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: isGhost ? S.ghostText : S.text }}>{a.competencia || '—'}</td>
                      <td style={{ padding: '8px 12px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? 'R$ —' : fmtR(a.receita_apurada)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: isGhost ? S.ghostText : S.navy }}>{isGhost ? 'R$ —' : fmtR(a.imposto_apurado)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {isGhost
                          ? <span style={{ background: S.ghost, color: S.ghostText, border: `1px solid ${S.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>—%</span>
                          : <Badge label={fmtPct(a.aliquota_efetiva)} tipo="original" />
                        }
                      </td>
                      <td style={{ padding: '8px 12px', color: isGhost ? S.ghostText : S.muted }}>{a.tipo_declaracao || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {isGhost
                          ? <span style={{ background: S.ghost, color: S.ghostText, border: `1px solid ${S.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Aguardando</span>
                          : <Badge label={a.status_apuracao || 'Aguardando'} tipo={statusTipo(a.status_apuracao)} />
                        }
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {isGhost
                          ? <span style={{ background: S.ghost, color: S.ghostText, border: `1px solid ${S.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Aguardando</span>
                          : <Badge label={a.status_declaracao || 'Aguardando'} tipo={statusTipo(a.status_declaracao)} />
                        }
                      </td>
                      <td style={{ padding: '8px 12px', color: isGhost ? S.ghostText : S.muted, fontSize: 11 }}>{isGhost ? '—' : (a.data_transmissao || '—')}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {!isGhost && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setDetalhe(a)} title="Ver detalhe"
                              style={{ padding: '3px 8px', background: '#eff6ff', color: S.blue, border: `1px solid #bfdbfe`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              Ver
                            </button>
                            <button onClick={() => abrirEditar(a)} title="Editar"
                              style={{ padding: '3px 8px', background: '#f0fdf4', color: S.green, border: `1px solid #86efac`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              Editar
                            </button>
                            <button onClick={() => excluir(a.id)} title="Excluir"
                              style={{ padding: '3px 8px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              X
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RODAPE GHOST */}
        {!loading && !temDados && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${S.border}`, textAlign: 'center', fontSize: 12, color: S.ghostText }}>
            Clique em "+ Nova Apuracao" para comecar
          </div>
        )}

        {/* PAGINACAO */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted, flexWrap: 'wrap', gap: 8 }}>
          <span>
            {loading ? 'Carregando...' : temDados ? `${filtradas.length} apuracao(oes) — Pagina ${pagina} de ${totalPaginas}` : 'Nenhuma apuracao cadastrada'}
          </span>
          {temDados && !loading && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[['«', () => setPagina(1), pagina === 1],
                ['<', () => setPagina(p => Math.max(1, p - 1)), pagina === 1],
                ['>', () => setPagina(p => Math.min(totalPaginas, p + 1)), pagina === totalPaginas],
                ['»', () => setPagina(totalPaginas), pagina === totalPaginas],
              ].map(([l, fn, dis], i) => (
                <button key={i} onClick={fn} disabled={dis}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: dis ? 'not-allowed' : 'pointer', color: dis ? S.ghostText : S.text }}>
                  {l}
                </button>
              ))}
              <select value={porPagina} onChange={e => { const n = Number(e.target.value); setPorPagina(n); setPagina(1) }}
                style={{ marginLeft: 8, padding: '3px 8px', border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por pagina</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVA / EDITAR */}
      {(modalNova || modalEditar) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: S.white, borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.navy, marginBottom: 20 }}>
              {modalEditar ? 'Editar Apuracao' : 'Nova Apuracao'}
            </div>
            {modalNova && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>Empresa *</div>
                <select value={form.cliente_id || ''} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Selecione...</option>
                  {Object.values(clientes).map(c => (
                    <option key={c.id} value={c.id}>{c.razao_social}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Competencia (MM/AAAA) *', field: 'competencia',      placeholder: '07/2026'          },
                { label: 'Receita Apurada (R$)',    field: 'receita_apurada',  placeholder: '0,00'             },
                { label: 'Imposto Apurado (R$)',    field: 'imposto_apurado',  placeholder: '0,00'             },
                { label: 'Aliquota Efetiva (%)',    field: 'aliquota_efetiva', placeholder: '0,00'             },
                { label: 'Data Transmissao',        field: 'data_transmissao', placeholder: 'DD/MM/AAAA'       },
                { label: 'Transmitido por',         field: 'transmitido_por',  placeholder: 'Nome do contador' },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <input value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tipo Declaracao',   field: 'tipo_declaracao',   opts: ['Original', 'Retificadora'] },
                { label: 'Status Apuracao',   field: 'status_apuracao',   opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
                { label: 'Status Declaracao', field: 'status_declaracao', opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <select value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setModalNova(false); setModalEditar(null); setForm(VAZIO) }}
                style={{ padding: '7px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '7px 16px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}