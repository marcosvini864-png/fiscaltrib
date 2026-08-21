/**
 * ApuracaoSimples.jsx - e-FiscalTribe®
 * Apuracao do Simples Nacional - multi-empresa
 * Versao 1.1 - 13/08/2026
 * + Skeleton, ghost rows, seletor por pagina, lixeira por linha, excluir todos
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  calcularAliquotaEfetiva,
  ANEXO_I_2018_2026,
  identificarFaixaAnexoI,
  calcularParametrosAnexoI,
  calcularDasTeoricoBase,
  calcularApuracaoBaseAnexoI,
  REPARTICAO_ANEXO_I,
  calcularAliquotasEfetivasPorTributo,
  calcularValoresTributosTeoricosBase,
} from '../fiscal/simples/anexoI'

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

function executarApuracaoSimples({
  parcelas,
  receitaDeclaradaPgdas,
  decisaoDivergencia = null,
  alterarIcms = false,
  distribuicaoReducao = null,
} = {}) {
  /*
   * ORQUESTRADOR CENTRAL — ETAPA DE CONFERÊNCIA
   *
   * Espelha o fluxo operacional do e-Auditoria/e-Recuperador:
   *
   * documentos/classificação
   * → movimentação
   * → conciliação com PGDAS
   * → tratamento da divergência
   * → eventual ajuste conservador
   * → liberação da base para cálculo.
   *
   * Nesta versão ainda NÃO calcula DAS,
   * NÃO calcula crédito
   * e NÃO gera valores de retificação.
   */

  const movimentacao =
    prepararMovimentacaoApuracao(parcelas)

  if (!movimentacao) {
    return {
      status: 'movimentacao_invalida',
      etapa: 'preparacao_movimentacao',
      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,
      movimentacao: null,
      conciliacao: null,
      resolucao: null,
      erros: [
        'Não foi possível preparar a movimentação para apuração.'
      ]
    }
  }

  const conciliacao =
    conciliarReceitaApuradaComPgdas(
      movimentacao.receitaTotal,
      receitaDeclaradaPgdas
    )

  if (!conciliacao) {
    return {
      status: 'conciliacao_invalida',
      etapa: 'conciliacao_pgdas',
      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,
      movimentacao,
      conciliacao: null,
      resolucao: null,
      erros: [
        'Não foi possível conciliar a receita apurada com o PGDAS.'
      ]
    }
  }

  const resolucao =
    resolverDivergenciaReceita(
      conciliacao,
      decisaoDivergencia
    )

  if (!resolucao) {
    return {
      status: 'resolucao_invalida',
      etapa: 'tratamento_divergencia',
      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,
      movimentacao,
      conciliacao,
      resolucao: null,
      erros: [
        'Não foi possível resolver o estado da divergência.'
      ]
    }
  }

  /*
   * Receita documental = PGDAS.
   * Fluxo conciliado e liberado.
   */
  if (conciliacao.receitasCoincidem) {
    return {
      status: 'conferencia_concluida',
      etapa: 'pronto_para_calculo',

      prontoParaCalculo: true,
      podeGerarResultadoAutomatico: true,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        movimentacao,

      receitaTotalConsiderada:
        movimentacao.receitaTotal,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * e-Recuperador:
   * interrupção expressa.
   */
  if (resolucao.interrompida) {
    return {
      status: 'apuracao_interrompida',
      etapa: 'tratamento_divergencia',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        null,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * Divergência mantida:
   * permite detalhamento,
   * mas NÃO libera resultado automático.
   */
  if (
    resolucao.decisao ===
    'manter_divergencia'
  ) {
    return {
      status: 'divergencia_mantida',
      etapa: 'detalhamento_sem_resultado',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        movimentacao,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * Divergência ainda sem decisão.
   */
  if (
    resolucao.status ===
    'aguardando_decisao'
  ) {
    return {
      status: 'aguardando_decisao',
      etapa: 'tratamento_divergencia',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        null,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * A partir daqui só entra o caminho
   * conservador do e-Recuperador.
   */
  const plano =
    planejarAjusteConservadorReceita(
      conciliacao
    )

  if (!plano) {
    return {
      status: 'plano_ajuste_invalido',
      etapa: 'ajuste_conservador',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: [
        'Não foi possível preparar o plano de ajuste conservador.'
      ]
    }
  }

  /*
   * PGDAS > documentos:
   * diferença oferecida à tributação integral.
   */
  if (
    plano.tipoAjuste ===
    'adicionar_tributacao_integral'
  ) {
    const ajustePositivo =
      aplicarAjusteConservadorPositivo(
        movimentacao,
        conciliacao,
        resolucao,
        plano
      )

    if (!ajustePositivo) {
      return {
        status: 'ajuste_positivo_invalido',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,

        ajusteConservador:
          null,

        erros: [
          'Não foi possível aplicar o ajuste conservador positivo.'
        ]
      }
    }

    return {
      status: 'conferencia_concluida',
      etapa: 'pronto_para_calculo',

      prontoParaCalculo: true,
      podeGerarResultadoAutomatico: true,

      movimentacaoOriginal:
        movimentacao,

      /*
       * O ajuste positivo permanece separado
       * das parcelas documentais para preservar
       * a rastreabilidade.
       */
      movimentacaoConsiderada:
        movimentacao,

      receitaTotalConsiderada:
        ajustePositivo
          .receitaTotalConsiderada,

      conciliacao,
      resolucao,
      plano,

      ajusteConservador:
        ajustePositivo,

      erros: []
    }
  }

  /*
   * PGDAS < documentos:
   * redução conservadora das receitas
   * com tratamento específico de PIS/Cofins.
   */
  if (
    plano.tipoAjuste ===
    'reduzir_tratamento_especifico'
  ) {
    const politica =
      definirPoliticaRecuperacaoPisCofins({
        alterarIcms
      })

    const preparacaoReducao =
      prepararReducaoConservadoraPisCofins(
        movimentacao,
        politica,
        resolucao,
        plano
      )

    if (!preparacaoReducao) {
      return {
        status: 'preparacao_reducao_invalida',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        erros: [
          'Não foi possível preparar a redução conservadora.'
        ]
      }
    }

    if (
      !preparacaoReducao.capacidadeSuficiente
    ) {
      return {
        status: 'ajuste_negativo_sem_capacidade',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,

        erros: []
      }
    }

    const candidatas =
      prepararCandidatasReducaoPisCofins(
        preparacaoReducao
      )

    if (!candidatas) {
      return {
        status: 'candidatas_reducao_invalidas',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,

        erros: [
          'Não foi possível preparar as parcelas candidatas à redução.'
        ]
      }
    }

    /*
     * O e-Recuperador não documenta
     * prioridade automática entre as candidatas.
     *
     * Sem distribuição explícita,
     * o motor para aqui.
     */
    if (!Array.isArray(distribuicaoReducao)) {
      return {
        status: 'aguardando_distribuicao_reducao',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,
        candidatas,

        erros: []
      }
    }

    const validacaoDistribuicao =
      validarDistribuicaoReducaoPisCofins(
        candidatas,
        distribuicaoReducao
      )

    if (!validacaoDistribuicao.valida) {
      return {
        status: 'distribuicao_reducao_invalida',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,
        candidatas,
        validacaoDistribuicao,

        erros:
          validacaoDistribuicao.erros
      }
    }

    const aplicacaoReducao =
      aplicarDistribuicaoReducaoPisCofins(
        movimentacao,
        validacaoDistribuicao
      )

    if (!aplicacaoReducao.aplicado) {
      return {
        status: 'aplicacao_reducao_invalida',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,
        candidatas,
        validacaoDistribuicao,
        aplicacaoReducao,

        erros:
          aplicacaoReducao.erros
      }
    }

    return {
      status: 'conferencia_concluida',
      etapa: 'pronto_para_calculo',

      prontoParaCalculo: true,
      podeGerarResultadoAutomatico: true,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        aplicacaoReducao
          .movimentacaoAjustada,

      receitaTotalConsiderada:
        aplicacaoReducao
          .movimentacaoAjustada
          .receitaTotal,

      conciliacao,
      resolucao,
      plano,
      politica,

      ajusteConservador: {
        tipo:
          'reducao_conservadora_pis_cofins',

        preparacaoReducao,
        candidatas,
        validacaoDistribuicao,
        aplicacaoReducao,
      },

      erros: []
    }
  }

  return {
    status: 'tipo_ajuste_nao_suportado',
    etapa: 'ajuste_conservador',

    prontoParaCalculo: false,
    podeGerarResultadoAutomatico: false,

    movimentacaoOriginal:
      movimentacao,

    conciliacao,
    resolucao,
    plano,

    erros: [
      'O tipo de ajuste conservador não é suportado pelo motor.'
    ]
  }
}

function prepararBasePisCofinsConferida(
  resultadoConferencia
) {
  if (
    !resultadoConferencia ||
    typeof resultadoConferencia !== 'object' ||
    !resultadoConferencia.prontoParaCalculo
  ) {
    return null
  }

  const movimentacao =
    resultadoConferencia.movimentacaoConsiderada

  if (
    !movimentacao ||
    typeof movimentacao !== 'object' ||
    !movimentacao.resumoTributario
  ) {
    return null
  }

  const receitaTotalConsiderada =
    Number(
      resultadoConferencia.receitaTotalConsiderada
    )

  const receitaMovimentacao =
    Number(movimentacao.receitaTotal)

  if (
    !Number.isFinite(receitaTotalConsiderada) ||
    !Number.isFinite(receitaMovimentacao) ||
    receitaTotalConsiderada < 0 ||
    receitaMovimentacao < 0
  ) {
    return null
  }

  const resumoPisCofins =
    Array.isArray(
      movimentacao.resumoTributario.pisCofins
    )
      ? movimentacao.resumoTributario.pisCofins
      : []

  const paraCentavos = (valor) => {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) =>
    valor / 100

  const receitaTotalCentavos =
    paraCentavos(receitaTotalConsiderada)

  const receitaMovimentacaoCentavos =
    paraCentavos(receitaMovimentacao)

  const receitaResumoCentavos =
    paraCentavos(
      movimentacao.resumoTributario.receitaTotal
    )

  if (
    receitaTotalCentavos === null ||
    receitaMovimentacaoCentavos === null ||
    receitaResumoCentavos === null
  ) {
    return null
  }

  /*
   * Trava de consistência.
   * O resumo tributário precisa continuar
   * reconciliado com as parcelas da movimentação.
   */
  if (
    receitaMovimentacaoCentavos !==
    receitaResumoCentavos
  ) {
    return null
  }

  let tratamentoEspecificoCentavos = 0

  const tratamentosEspecificos = []

  for (const item of resumoPisCofins) {
    const classificacao = String(
      item?.classificacao ?? ''
    ).trim()

    const valorCentavos =
      paraCentavos(item?.valor)

    if (
      !classificacao ||
      valorCentavos === null ||
      valorCentavos < 0
    ) {
      return null
    }

    if (
      !CLASSIFICACOES_PIS_COFINS_TRATAMENTO_ESPECIFICO
        .has(classificacao)
    ) {
      continue
    }

    tratamentoEspecificoCentavos +=
      valorCentavos

    tratamentosEspecificos.push({
      classificacao,
      valor:
        deCentavos(valorCentavos)
    })
  }

  if (
    tratamentoEspecificoCentavos >
    receitaTotalCentavos
  ) {
    return null
  }

  /*
   * No ajuste positivo do e-Recuperador,
   * a diferença PGDAS > documentos é
   * integralmente tributada.
   *
   * Por isso ela aumenta a receita total
   * considerada, mas não aumenta a receita
   * com tratamento específico.
   */
  const ajusteIntegralCentavos =
    Math.max(
      receitaTotalCentavos -
      receitaMovimentacaoCentavos,
      0
    )

  const receitaTributadaCentavos =
    receitaTotalCentavos -
    tratamentoEspecificoCentavos

  return {
    status:
      'base_pis_cofins_conferida',

    receitaTotalConsiderada:
      deCentavos(receitaTotalCentavos),

    receitaMovimentacao:
      deCentavos(
        receitaMovimentacaoCentavos
      ),

    receitaTratamentoEspecifico:
      deCentavos(
        tratamentoEspecificoCentavos
      ),

    receitaTributadaPisCofins:
      deCentavos(
        receitaTributadaCentavos
      ),

    receitaAjusteIntegralmenteTributada:
      deCentavos(
        ajusteIntegralCentavos
      ),

    tratamentosEspecificos,

    classificacoesTratamentoEspecifico:
      Array.from(
        CLASSIFICACOES_PIS_COFINS_TRATAMENTO_ESPECIFICO
      ),

    /*
     * ICMS continua independente.
     * Nenhuma classificação de ICMS é
     * alterada nesta etapa.
     */
    icmsPreservado: true
  }
}

function calcularPisCofinsConferidosAnexoI({
  rbt12,
  basePisCofins
} = {}) {
  if (
    !basePisCofins ||
    typeof basePisCofins !== 'object' ||
    basePisCofins.status !==
      'base_pis_cofins_conferida'
  ) {
    return null
  }

  const parametros =
    calcularParametrosAnexoI(rbt12)

  if (!parametros) {
    return null
  }

  /*
   * Repartição oficial do PIS/Pasep e da Cofins
   * no Anexo I.
   *
   * Nesta etapa NÃO tratamos ICMS.
   * A 6ª faixa possui regra própria para ICMS
   * e será tratada separadamente.
   */
  const reparticaoPisCofinsPorFaixa = {
    1: {
      pis: 0.0276,
      cofins: 0.1274
    },

    2: {
      pis: 0.0276,
      cofins: 0.1274
    },

    3: {
      pis: 0.0276,
      cofins: 0.1274
    },

    4: {
      pis: 0.0276,
      cofins: 0.1274
    },

    5: {
      pis: 0.0276,
      cofins: 0.1274
    },

    6: {
      pis: 0.0613,
      cofins: 0.2827
    }
  }

  const reparticao =
    reparticaoPisCofinsPorFaixa[
      parametros.faixa
    ]

  if (!reparticao) {
    return null
  }

  const receitaTotal =
    Number(
      basePisCofins.receitaTotalConsiderada
    )

  const receitaTributada =
    Number(
      basePisCofins.receitaTributadaPisCofins
    )

  const receitaTratamentoEspecifico =
    Number(
      basePisCofins.receitaTratamentoEspecifico
    )

  if (
    !Number.isFinite(receitaTotal) ||
    !Number.isFinite(receitaTributada) ||
    !Number.isFinite(receitaTratamentoEspecifico) ||
    receitaTotal < 0 ||
    receitaTributada < 0 ||
    receitaTratamentoEspecifico < 0
  ) {
    return null
  }

  /*
   * Conferência monetária da composição da base.
   * Não é arredondamento tributário.
   */
  const totalCentavos =
    Math.round(receitaTotal * 100)

  const tributadaCentavos =
    Math.round(receitaTributada * 100)

  const tratamentoEspecificoCentavos =
    Math.round(
      receitaTratamentoEspecifico * 100
    )

  if (
    tributadaCentavos +
      tratamentoEspecificoCentavos !==
    totalCentavos
  ) {
    return null
  }

  const aliquotaEfetivaPis =
    parametros.aliquotaEfetiva *
    reparticao.pis

  const aliquotaEfetivaCofins =
    parametros.aliquotaEfetiva *
    reparticao.cofins

  /*
   * Valores teóricos se toda a receita
   * estivesse normalmente tributada.
   */
  const pisSemTratamento =
    receitaTotal * aliquotaEfetivaPis

  const cofinsSemTratamento =
    receitaTotal * aliquotaEfetivaCofins

  /*
   * Valores conferidos após considerar
   * as receitas com tratamento específico.
   */
  const pisConferido =
    receitaTributada * aliquotaEfetivaPis

  const cofinsConferido =
    receitaTributada *
    aliquotaEfetivaCofins

  const pisDesconsiderado =
    receitaTratamentoEspecifico *
    aliquotaEfetivaPis

  const cofinsDesconsiderado =
    receitaTratamentoEspecifico *
    aliquotaEfetivaCofins

  return {
    status:
      'pis_cofins_conferidos',

    anexo:
      parametros.anexo,

    faixa:
      parametros.faixa,

    rbt12:
      parametros.rbt12,

    aliquotaNominal:
      parametros.aliquotaNominal,

    parcelaDeduzir:
      parametros.parcelaDeduzir,

    aliquotaEfetiva:
      parametros.aliquotaEfetiva,

    base: {
      receitaTotal,
      receitaTributadaPisCofins:
        receitaTributada,
      receitaTratamentoEspecifico
    },

    percentualReparticao: {
      pis:
        reparticao.pis,
      cofins:
        reparticao.cofins
    },

    aliquotasEfetivas: {
      pis:
        aliquotaEfetivaPis,
      cofins:
        aliquotaEfetivaCofins
    },

    valoresSemTratamentoEspecifico: {
      pis:
        pisSemTratamento,

      cofins:
        cofinsSemTratamento,

      total:
        pisSemTratamento +
        cofinsSemTratamento
    },

    valoresConferidos: {
      pis:
        pisConferido,

      cofins:
        cofinsConferido,

      total:
        pisConferido +
        cofinsConferido
    },

    valoresDesconsideradosTratamentoEspecifico: {
      pis:
        pisDesconsiderado,

      cofins:
        cofinsDesconsiderado,

      total:
        pisDesconsiderado +
        cofinsDesconsiderado
    },

    /*
     * Não representa ainda crédito recuperável.
     * É apenas a diferença técnica de PIS/Cofins
     * decorrente do tratamento da receita.
     */
    creditoCalculado:
      false,

    icmsAlterado:
      false
  }
}

function calcularTributosFederaisConferidosAnexoI({
  rbt12,
  basePisCofins
} = {}) {
  if (
    !basePisCofins ||
    typeof basePisCofins !== 'object' ||
    basePisCofins.status !==
      'base_pis_cofins_conferida'
  ) {
    return null
  }

  const pisCofins =
    calcularPisCofinsConferidosAnexoI({
      rbt12,
      basePisCofins
    })

  if (!pisCofins) {
    return null
  }

  /*
   * Repartição federal do Anexo I.
   *
   * PIS/Cofins já foram tratados
   * separadamente sobre a base conferida.
   *
   * ICMS NÃO participa desta etapa.
   */
  const reparticaoFederalPorFaixa = {
    1: {
      irpj: 0.055,
      csll: 0.035,
      cpp: 0.415
    },

    2: {
      irpj: 0.055,
      csll: 0.035,
      cpp: 0.415
    },

    3: {
      irpj: 0.055,
      csll: 0.035,
      cpp: 0.42
    },

    4: {
      irpj: 0.055,
      csll: 0.035,
      cpp: 0.42
    },

    5: {
      irpj: 0.055,
      csll: 0.035,
      cpp: 0.42
    },

    6: {
      irpj: 0.135,
      csll: 0.10,
      cpp: 0.421
    }
  }

  const reparticao =
    reparticaoFederalPorFaixa[
      pisCofins.faixa
    ]

  if (!reparticao) {
    return null
  }

  const receitaTotal =
    Number(
      basePisCofins.receitaTotalConsiderada
    )

  const aliquotaEfetiva =
    Number(
      pisCofins.aliquotaEfetiva
    )

  if (
    !Number.isFinite(receitaTotal) ||
    !Number.isFinite(aliquotaEfetiva) ||
    receitaTotal < 0 ||
    aliquotaEfetiva < 0
  ) {
    return null
  }

  const aliquotaEfetivaIrpj =
    aliquotaEfetiva *
    reparticao.irpj

  const aliquotaEfetivaCsll =
    aliquotaEfetiva *
    reparticao.csll

  const aliquotaEfetivaCpp =
    aliquotaEfetiva *
    reparticao.cpp

  /*
   * IRPJ, CSLL e CPP permanecem
   * calculados sobre a receita total
   * considerada.
   *
   * O tratamento específico desta etapa
   * afeta somente PIS/Cofins.
   */
  const irpj =
    receitaTotal *
    aliquotaEfetivaIrpj

  const csll =
    receitaTotal *
    aliquotaEfetivaCsll

  const cpp =
    receitaTotal *
    aliquotaEfetivaCpp

  const pis =
    Number(
      pisCofins.valoresConferidos.pis
    )

  const cofins =
    Number(
      pisCofins.valoresConferidos.cofins
    )

  if (
    !Number.isFinite(pis) ||
    !Number.isFinite(cofins)
  ) {
    return null
  }

  const totalFederal =
    irpj +
    csll +
    pis +
    cofins +
    cpp

  return {
    status:
      'tributos_federais_conferidos',

    anexo:
      pisCofins.anexo,

    faixa:
      pisCofins.faixa,

    rbt12:
      pisCofins.rbt12,

    aliquotaNominal:
      pisCofins.aliquotaNominal,

    parcelaDeduzir:
      pisCofins.parcelaDeduzir,

    aliquotaEfetiva:
      pisCofins.aliquotaEfetiva,

    receitaTotalConsiderada:
      receitaTotal,

    percentualReparticao: {
      irpj:
        reparticao.irpj,

      csll:
        reparticao.csll,

      pis:
        pisCofins
          .percentualReparticao
          .pis,

      cofins:
        pisCofins
          .percentualReparticao
          .cofins,

      cpp:
        reparticao.cpp
    },

    aliquotasEfetivas: {
      irpj:
        aliquotaEfetivaIrpj,

      csll:
        aliquotaEfetivaCsll,

      pis:
        pisCofins
          .aliquotasEfetivas
          .pis,

      cofins:
        pisCofins
          .aliquotasEfetivas
          .cofins,

      cpp:
        aliquotaEfetivaCpp
    },

    valoresConferidos: {
      irpj,
      csll,
      pis,
      cofins,
      cpp,

      totalFederal
    },

    pisCofins,

    /*
     * Ainda NÃO é o DAS final.
     * Falta a dimensão do ICMS.
     */
    icmsIncluido:
      false,

    dasCompleto:
      false,

    creditoCalculado:
      false
  }
}

function prepararIcmsPreservadoPgdas({
  valorIcmsOriginalPgdas,
  politica = null
} = {}) {
  /*
   * DIMENSÃO DO ICMS — ESCOPO PIS/COFINS
   *
   * Espelha a política do e-Recuperador:
   * em uma recuperação de PIS/COFINS,
   * o ICMS originalmente declarado é preservado.
   *
   * Não recalcula ICMS.
   * Não infere sublimite pelo RBT12.
   * Não altera classificação de ICMS.
   */

  const politicaAplicada =
    politica ||
    definirPoliticaRecuperacaoPisCofins({
      alterarIcms: false
    })

  if (
    !politicaAplicada ||
    typeof politicaAplicada !== 'object'
  ) {
    return null
  }

  if (
    !politicaAplicada.preservarIcmsDeclarado ||
    politicaAplicada.alterarIcms
  ) {
    return {
      status:
        'icms_fora_do_escopo_de_preservacao',

      podeComporDasConferido:
        false,

      preservado:
        false,

      recalculado:
        false,

      alterado:
        false,

      valorIcms:
        null,

      politica:
        politicaAplicada
    }
  }

  /*
   * Ausência de ICMS no PGDAS não pode
   * ser interpretada automaticamente como zero.
   */
  if (
    valorIcmsOriginalPgdas === null ||
    valorIcmsOriginalPgdas === undefined ||
    String(valorIcmsOriginalPgdas).trim() === ''
  ) {
    return {
      status:
        'aguardando_icms_original_pgdas',

      podeComporDasConferido:
        false,

      preservado:
        false,

      recalculado:
        false,

      alterado:
        false,

      valorIcms:
        null,

      politica:
        politicaAplicada
    }
  }

  const valorIcms =
    Number(valorIcmsOriginalPgdas)

  if (
    !Number.isFinite(valorIcms) ||
    valorIcms < 0
  ) {
    return null
  }

  /*
   * Normalização monetária.
   * Valor zero é válido:
   * pode refletir situação originalmente
   * declarada no PGDAS.
   */
  const valorIcmsCentavos =
    Math.round(valorIcms * 100)

  return {
    status:
      'icms_original_preservado',

    origem:
      'pgdas_original',

    valorIcms:
      valorIcmsCentavos / 100,

    preservado:
      true,

    recalculado:
      false,

    alterado:
      false,

    /*
     * O motor não deduz situação de sublimite
     * apenas pelo RBT12.
     */
    sublimiteInferidoAutomaticamente:
      false,

    classificacaoIcmsAlterada:
      false,

    podeComporDasConferido:
      true,

    politica:
      politicaAplicada
  }
}

function calcularDasConferidoAnexoI({
  tributosFederais,
  icmsPreservado
} = {}) {
  /*
   * DAS CONFERIDO — ANEXO I
   *
   * Espelha o fluxo de conferência do
   * e-Auditoria/e-Recuperador:
   *
   * tributos federais conferidos
   * + ICMS original preservado
   * = DAS conferido.
   *
   * Ainda NÃO calcula crédito recuperável
   * e NÃO gera retificação.
   */

  if (
    !tributosFederais ||
    typeof tributosFederais !== 'object' ||
    tributosFederais.status !==
      'tributos_federais_conferidos'
  ) {
    return null
  }

  if (
    !icmsPreservado ||
    typeof icmsPreservado !== 'object'
  ) {
    return null
  }

  if (
    !icmsPreservado.podeComporDasConferido ||
    !icmsPreservado.preservado
  ) {
    return {
      status:
        'das_aguardando_icms',

      dasConferido:
        null,

      podeCompararComDasOriginal:
        false,

      creditoCalculado:
        false,

      tributosFederais,
      icmsPreservado
    }
  }

  const valores =
    tributosFederais.valoresConferidos

  if (
    !valores ||
    typeof valores !== 'object'
  ) {
    return null
  }

  const paraCentavos = (valor) => {
    const numero = Number(valor)

    if (
      !Number.isFinite(numero) ||
      numero < 0
    ) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) =>
    valor / 100

  const irpjCentavos =
    paraCentavos(valores.irpj)

  const csllCentavos =
    paraCentavos(valores.csll)

  const pisCentavos =
    paraCentavos(valores.pis)

  const cofinsCentavos =
    paraCentavos(valores.cofins)

  const cppCentavos =
    paraCentavos(valores.cpp)

  const icmsCentavos =
    paraCentavos(
      icmsPreservado.valorIcms
    )

  if (
    irpjCentavos === null ||
    csllCentavos === null ||
    pisCentavos === null ||
    cofinsCentavos === null ||
    cppCentavos === null ||
    icmsCentavos === null
  ) {
    return null
  }

  /*
   * O subtotal federal é recomposto a partir
   * dos valores monetários normalizados.
   *
   * Isso evita carregar diferenças residuais
   * de ponto flutuante para o DAS.
   */
  const totalFederalCentavos =
    irpjCentavos +
    csllCentavos +
    pisCentavos +
    cofinsCentavos +
    cppCentavos

  const dasConferidoCentavos =
    totalFederalCentavos +
    icmsCentavos

  return {
    status:
      'das_conferido',

    anexo:
      tributosFederais.anexo,

    faixa:
      tributosFederais.faixa,

    rbt12:
      tributosFederais.rbt12,

    aliquotaNominal:
      tributosFederais.aliquotaNominal,

    parcelaDeduzir:
      tributosFederais.parcelaDeduzir,

    aliquotaEfetiva:
      tributosFederais.aliquotaEfetiva,

    receitaTotalConsiderada:
      tributosFederais
        .receitaTotalConsiderada,

    valoresConferidos: {
      irpj:
        deCentavos(irpjCentavos),

      csll:
        deCentavos(csllCentavos),

      pis:
        deCentavos(pisCentavos),

      cofins:
        deCentavos(cofinsCentavos),

      cpp:
        deCentavos(cppCentavos),

      icms:
        deCentavos(icmsCentavos),

      totalFederal:
        deCentavos(
          totalFederalCentavos
        ),

      das:
        deCentavos(
          dasConferidoCentavos
        )
    },

    icms: {
      origem:
        icmsPreservado.origem,

      preservado:
        true,

      recalculado:
        false,

      valor:
        deCentavos(icmsCentavos)
    },

    tributosFederais,
    icmsPreservado,

    /*
     * A existência de um DAS conferido
     * ainda NÃO significa crédito.
     *
     * A próxima etapa será confrontá-lo
     * com o DAS original efetivamente apurado.
     */
    podeCompararComDasOriginal:
      true,

    comparacaoComDasOriginal:
      false,

    creditoCalculado:
      false
  }
}

function compararPgdasOriginalComDasConferido({
  pgdasOriginal,
  dasConferido
} = {}) {
  /*
   * COMPARAÇÃO DA APURAÇÃO
   *
   * Espelha a conferência do e-Auditoria/e-Recuperador:
   *
   * PGDAS original
   * ×
   * apuração conferida
   *
   * Nesta etapa:
   * - NÃO calcula crédito;
   * - NÃO afirma pagamento a maior;
   * - NÃO gera retificação;
   * - apenas identifica e demonstra diferenças.
   */

  if (
    !pgdasOriginal ||
    typeof pgdasOriginal !== 'object' ||
    !dasConferido ||
    typeof dasConferido !== 'object' ||
    dasConferido.status !== 'das_conferido'
  ) {
    return null
  }

  const conferidos =
    dasConferido.valoresConferidos

  if (
    !conferidos ||
    typeof conferidos !== 'object'
  ) {
    return null
  }

  const paraCentavos = (valor) => {
    if (
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ''
    ) {
      return null
    }

    const numero = Number(valor)

    if (
      !Number.isFinite(numero) ||
      numero < 0
    ) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) =>
    valor / 100

  const tributos = [
    'irpj',
    'csll',
    'pis',
    'cofins',
    'cpp',
    'icms'
  ]

  const comparacaoTributos = {}

  let totalOriginalCalculadoCentavos = 0
  let totalConferidoCalculadoCentavos = 0

  for (const tributo of tributos) {
    const originalCentavos =
      paraCentavos(
        pgdasOriginal[tributo]
      )

    const conferidoCentavos =
      paraCentavos(
        conferidos[tributo]
      )

    /*
     * Não interpreta ausência de informação
     * do PGDAS como zero.
     */
    if (
      originalCentavos === null ||
      conferidoCentavos === null
    ) {
      return {
        status:
          'comparacao_incompleta',

        podeConcluirDiferenca:
          false,

        tributoPendente:
          tributo,

        diferencaApuracaoCalculada:
          false,

        creditoCalculado:
          false
      }
    }

    const diferencaCentavos =
      originalCentavos -
      conferidoCentavos

    totalOriginalCalculadoCentavos +=
      originalCentavos

    totalConferidoCalculadoCentavos +=
      conferidoCentavos

    comparacaoTributos[tributo] = {
      original:
        deCentavos(originalCentavos),

      conferido:
        deCentavos(conferidoCentavos),

      diferenca:
        deCentavos(diferencaCentavos),

      situacao:
        diferencaCentavos === 0
          ? 'sem_diferenca'
          : diferencaCentavos > 0
            ? 'original_superior'
            : 'original_inferior'
    }
  }

  const dasOriginalInformadoCentavos =
    paraCentavos(pgdasOriginal.das)

  const dasConferidoCentavos =
    paraCentavos(conferidos.das)

  if (
    dasOriginalInformadoCentavos === null ||
    dasConferidoCentavos === null
  ) {
    return {
      status:
        'comparacao_incompleta',

      podeConcluirDiferenca:
        false,

      tributoPendente:
        'das',

      diferencaApuracaoCalculada:
        false,

      creditoCalculado:
        false
    }
  }

  /*
   * Trava de consistência do PGDAS original:
   * o total informado deve coincidir com a
   * composição dos tributos recebida.
   */
  if (
    totalOriginalCalculadoCentavos !==
    dasOriginalInformadoCentavos
  ) {
    return {
      status:
        'pgdas_original_inconsistente',

      podeConcluirDiferenca:
        false,

      dasOriginalInformado:
        deCentavos(
          dasOriginalInformadoCentavos
        ),

      somaTributosOriginais:
        deCentavos(
          totalOriginalCalculadoCentavos
        ),

      diferencaApuracaoCalculada:
        false,

      creditoCalculado:
        false
    }
  }

  /*
   * A composição conferida também precisa
   * fechar com o DAS conferido.
   */
  if (
    totalConferidoCalculadoCentavos !==
    dasConferidoCentavos
  ) {
    return {
      status:
        'das_conferido_inconsistente',

      podeConcluirDiferenca:
        false,

      dasConferidoInformado:
        deCentavos(
          dasConferidoCentavos
        ),

      somaTributosConferidos:
        deCentavos(
          totalConferidoCalculadoCentavos
        ),

      diferencaApuracaoCalculada:
        false,

      creditoCalculado:
        false
    }
  }

  const diferencaTotalCentavos =
    dasOriginalInformadoCentavos -
    dasConferidoCentavos

  const situacao =
    diferencaTotalCentavos === 0
      ? 'sem_diferenca'
      : diferencaTotalCentavos > 0
        ? 'apuracao_original_superior'
        : 'apuracao_original_inferior'

  return {
    status:
      'comparacao_concluida',

    podeConcluirDiferenca:
      true,

    situacao,

    dasOriginal:
      deCentavos(
        dasOriginalInformadoCentavos
      ),

    dasConferido:
      deCentavos(
        dasConferidoCentavos
      ),

    diferencaApuracao:
      deCentavos(
        diferencaTotalCentavos
      ),

    comparacaoTributos,

    /*
     * Diferença de apuração não é,
     * por si só, pagamento a maior.
     *
     * A etapa seguinte deverá verificar
     * o DAS efetivamente pago.
     */
    pagamentoVerificado:
      false,

    pagamentoAMaiorConfirmado:
      false,

    creditoCalculado:
      false,

    retificacaoGerada:
      false
  }
}

function identificarCreditoMonofasicoPisCofins({
  comparacao
} = {}) {
  /*
   * CRÉDITO MONOFÁSICO — PIS / COFINS
   *
   * Parte diretamente da comparação:
   *
   * PGDAS original
   * ×
   * apuração conferida
   *
   * Não exige comprovante de pagamento.
   *
   * Divergências em outros tributos
   * geram ALERTAS, mas não bloqueiam
   * a identificação do crédito de
   * PIS e COFINS.
   */

  if (
    !comparacao ||
    typeof comparacao !== 'object' ||
    comparacao.status !==
      'comparacao_concluida' ||
    comparacao.podeConcluirDiferenca !== true ||
    !comparacao.comparacaoTributos
  ) {
    return null
  }

  const tributos =
    comparacao.comparacaoTributos

  const paraCentavos = (valor) => {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) =>
    valor / 100

  const alertas = []

  /*
   * -------------------------------------------------
   * 1. ALERTAS DE TRIBUTOS FORA DA TESE
   * -------------------------------------------------
   *
   * Não bloqueiam a auditoria.
   */
  const tributosForaDaTese = [
    'irpj',
    'csll',
    'cpp',
    'icms'
  ]

  for (const tributo of tributosForaDaTese) {
    const dados =
      tributos[tributo]

    if (!dados) {
      continue
    }

    const diferencaCentavos =
      paraCentavos(
        dados.diferenca
      )

    if (
      diferencaCentavos !== null &&
      diferencaCentavos !== 0
    ) {
      alertas.push({
        tipo:
          'divergencia_fora_escopo_pis_cofins',

        tributo,

        original:
          dados.original,

        conferido:
          dados.conferido,

        diferenca:
          deCentavos(
            diferencaCentavos
          ),

        mensagem:
          `Foi identificada divergência em ${tributo.toUpperCase()} fora da tese de PIS/COFINS.`
      })
    }
  }

  /*
   * -------------------------------------------------
   * 2. PIS
   * -------------------------------------------------
   */

  const pis =
    tributos.pis

  if (!pis) {
    return null
  }

  const pisOriginalCentavos =
    paraCentavos(
      pis.original
    )

  const pisConferidoCentavos =
    paraCentavos(
      pis.conferido
    )

  const pisDiferencaCentavos =
    paraCentavos(
      pis.diferenca
    )

  if (
    pisOriginalCentavos === null ||
    pisConferidoCentavos === null ||
    pisDiferencaCentavos === null
  ) {
    return null
  }

  /*
   * Crédito somente quando:
   *
   * original > conferido.
   *
   * Se ocorrer o inverso,
   * não abatemos automaticamente
   * de outro tributo.
   */
  const creditoPisCentavos =
    Math.max(
      pisDiferencaCentavos,
      0
    )

  if (pisDiferencaCentavos < 0) {
    alertas.push({
      tipo:
        'pis_conferido_superior_original',

      tributo:
        'pis',

      original:
        deCentavos(
          pisOriginalCentavos
        ),

      conferido:
        deCentavos(
          pisConferidoCentavos
        ),

      diferenca:
        deCentavos(
          pisDiferencaCentavos
        ),

      mensagem:
        'O PIS conferido ficou superior ao PIS originalmente apurado.'
    })
  }

  /*
   * -------------------------------------------------
   * 3. COFINS
   * -------------------------------------------------
   */

  const cofins =
    tributos.cofins

  if (!cofins) {
    return null
  }

  const cofinsOriginalCentavos =
    paraCentavos(
      cofins.original
    )

  const cofinsConferidoCentavos =
    paraCentavos(
      cofins.conferido
    )

  const cofinsDiferencaCentavos =
    paraCentavos(
      cofins.diferenca
    )

  if (
    cofinsOriginalCentavos === null ||
    cofinsConferidoCentavos === null ||
    cofinsDiferencaCentavos === null
  ) {
    return null
  }

  const creditoCofinsCentavos =
    Math.max(
      cofinsDiferencaCentavos,
      0
    )

  if (cofinsDiferencaCentavos < 0) {
    alertas.push({
      tipo:
        'cofins_conferida_superior_original',

      tributo:
        'cofins',

      original:
        deCentavos(
          cofinsOriginalCentavos
        ),

      conferido:
        deCentavos(
          cofinsConferidoCentavos
        ),

      diferenca:
        deCentavos(
          cofinsDiferencaCentavos
        ),

      mensagem:
        'A COFINS conferida ficou superior à COFINS originalmente apurada.'
    })
  }

  /*
   * -------------------------------------------------
   * 4. CRÉDITO MONOFÁSICO TOTAL
   * -------------------------------------------------
   *
   * Não há compensação automática
   * entre diferença negativa de um tributo
   * e crédito positivo de outro.
   */

  const creditoTotalCentavos =
    creditoPisCentavos +
    creditoCofinsCentavos

  const creditoIdentificado =
    creditoTotalCentavos > 0

  /*
   * Diferença global do DAS é mantida
   * apenas como informação de auditoria.
   *
   * O crédito monofásico é formado
   * exclusivamente por PIS + COFINS.
   */
  const diferencaDasCentavos =
    paraCentavos(
      comparacao.diferencaApuracao
    )

  if (
    diferencaDasCentavos !== null &&
    diferencaDasCentavos !==
      creditoTotalCentavos
  ) {
    alertas.push({
      tipo:
        'diferenca_das_nao_corresponde_credito_pis_cofins',

      diferencaDas:
        deCentavos(
          diferencaDasCentavos
        ),

      creditoPisCofins:
        deCentavos(
          creditoTotalCentavos
        ),

      mensagem:
        'A diferença total do DAS não corresponde exclusivamente ao crédito de PIS/COFINS.'
    })
  }

  return {
    status:
      creditoIdentificado
        ? 'credito_monofasico_pis_cofins_identificado'
        : 'sem_credito_monofasico_pis_cofins',

    creditoIdentificado,

    creditoCalculado:
      true,

    valorCreditoMonofasico:
      deCentavos(
        creditoTotalCentavos
      ),

    valoresPorTributo: {
      pis: {
        original:
          deCentavos(
            pisOriginalCentavos
          ),

        conferido:
          deCentavos(
            pisConferidoCentavos
          ),

        diferenca:
          deCentavos(
            pisDiferencaCentavos
          ),

        credito:
          deCentavos(
            creditoPisCentavos
          )
      },

      cofins: {
        original:
          deCentavos(
            cofinsOriginalCentavos
          ),

        conferido:
          deCentavos(
            cofinsConferidoCentavos
          ),

        diferenca:
          deCentavos(
            cofinsDiferencaCentavos
          ),

        credito:
          deCentavos(
            creditoCofinsCentavos
          )
      }
    },

    das: {
      original:
        comparacao.dasOriginal,

      conferido:
        comparacao.dasConferido,

      diferenca:
        comparacao.diferencaApuracao
    },

    possuiAlertas:
      alertas.length > 0,

    alertas,

    /*
     * A auditoria não depende
     * de comprovação de pagamento.
     */
    comprovacaoPagamentoExigida:
      false,

    comparacao
  }
}

function gerarResultadoRecuperacaoPisCofins({
  competencia = null,
  receitaDeclaradaPgdas,
  basePisCofins,
  dasConferido,
  comparacao,
  creditoMonofasico
} = {}) {
  /*
   * RESULTADO DA APURAÇÃO — E-RECUPERADOR
   *
   * Consolida as informações necessárias para:
   *
   * - relatório de apuração;
   * - espelho para retificação do PGDAS;
   * - demonstração do crédito de PIS/COFINS;
   * - memória da segregação das receitas.
   *
   * Esta função NÃO:
   *
   * - transmite retificação;
   * - solicita restituição;
   * - calcula Selic;
   * - exige comprovante de pagamento.
   */

  if (
    !basePisCofins ||
    typeof basePisCofins !== 'object' ||
    basePisCofins.status !==
      'base_pis_cofins_conferida'
  ) {
    return null
  }

  if (
    !dasConferido ||
    typeof dasConferido !== 'object' ||
    dasConferido.status !==
      'das_conferido'
  ) {
    return null
  }

  if (
    !comparacao ||
    typeof comparacao !== 'object' ||
    comparacao.status !==
      'comparacao_concluida'
  ) {
    return null
  }

  if (
    !creditoMonofasico ||
    typeof creditoMonofasico !== 'object' ||
    ![
      'credito_monofasico_pis_cofins_identificado',
      'sem_credito_monofasico_pis_cofins'
    ].includes(
      creditoMonofasico.status
    )
  ) {
    return null
  }

  const paraCentavos = (valor) => {
    if (
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ''
    ) {
      return null
    }

    const numero = Number(valor)

    if (
      !Number.isFinite(numero) ||
      numero < 0
    ) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) =>
    valor / 100

  /*
   * -------------------------------------------------
   * 1. RECEITA ORIGINAL DO PGDAS
   * -------------------------------------------------
   */

  const receitaDeclaradaCentavos =
    paraCentavos(
      receitaDeclaradaPgdas
    )

  if (receitaDeclaradaCentavos === null) {
    return null
  }

  /*
   * -------------------------------------------------
   * 2. SEGREGAÇÃO CONFERIDA
   * -------------------------------------------------
   */

  const receitaTotalCentavos =
    paraCentavos(
      basePisCofins.receitaTotalConsiderada
    )

  const receitaTributadaCentavos =
    paraCentavos(
      basePisCofins.receitaTributadaPisCofins
    )

  const receitaTratamentoCentavos =
    paraCentavos(
      basePisCofins.receitaTratamentoEspecifico
    )

  if (
    receitaTotalCentavos === null ||
    receitaTributadaCentavos === null ||
    receitaTratamentoCentavos === null
  ) {
    return null
  }

  /*
   * TRAVA DE CONSISTÊNCIA
   *
   * Receita tributada
   * +
   * receita com tratamento específico
   * =
   * receita total considerada.
   */
  if (
    receitaTributadaCentavos +
      receitaTratamentoCentavos !==
    receitaTotalCentavos
  ) {
    return {
      status:
        'resultado_inconsistente_segregacao_receitas',

      resultadoGerado:
        false,

      podeGerarEspelhoPgdas:
        false,

      receitaTotal:
        deCentavos(
          receitaTotalCentavos
        ),

      somaSegregacao:
        deCentavos(
          receitaTributadaCentavos +
            receitaTratamentoCentavos
        )
    }
  }

  /*
   * O fluxo conservador do e-Recuperador
   * procura preservar a receita originalmente
   * declarada no PGDAS.
   *
   * Se os valores não coincidirem neste ponto,
   * registramos alerta no resultado.
   */
  const alertas = [
    ...(Array.isArray(
      creditoMonofasico.alertas
    )
      ? creditoMonofasico.alertas
      : [])
  ]

  if (
    receitaDeclaradaCentavos !==
    receitaTotalCentavos
  ) {
    alertas.push({
      tipo:
        'receita_pgdas_diferente_receita_resultado',

      receitaDeclaradaPgdas:
        deCentavos(
          receitaDeclaradaCentavos
        ),

      receitaResultado:
        deCentavos(
          receitaTotalCentavos
        ),

      mensagem:
        'A receita total considerada no resultado difere da receita originalmente declarada no PGDAS.'
    })
  }

  /*
   * -------------------------------------------------
   * 3. VALORES ORIGINAIS × CONFERIDOS
   * -------------------------------------------------
   */

  const tributos =
    comparacao.comparacaoTributos

  if (
    !tributos ||
    !tributos.pis ||
    !tributos.cofins
  ) {
    return null
  }

  const pisOriginalCentavos =
    paraCentavos(
      tributos.pis.original
    )

  const pisConferidoCentavos =
    paraCentavos(
      tributos.pis.conferido
    )

  const cofinsOriginalCentavos =
    paraCentavos(
      tributos.cofins.original
    )

  const cofinsConferidoCentavos =
    paraCentavos(
      tributos.cofins.conferido
    )

  if (
    pisOriginalCentavos === null ||
    pisConferidoCentavos === null ||
    cofinsOriginalCentavos === null ||
    cofinsConferidoCentavos === null
  ) {
    return null
  }

  /*
   * -------------------------------------------------
   * 4. CRÉDITO APURADO
   * -------------------------------------------------
   */

  const creditoPisCentavos =
    paraCentavos(
      creditoMonofasico
        .valoresPorTributo
        ?.pis
        ?.credito ?? 0
    )

  const creditoCofinsCentavos =
    paraCentavos(
      creditoMonofasico
        .valoresPorTributo
        ?.cofins
        ?.credito ?? 0
    )

  const creditoTotalCentavos =
    paraCentavos(
      creditoMonofasico
        .valorCreditoMonofasico ?? 0
    )

  if (
    creditoPisCentavos === null ||
    creditoCofinsCentavos === null ||
    creditoTotalCentavos === null
  ) {
    return null
  }

  if (
    creditoPisCentavos +
      creditoCofinsCentavos !==
    creditoTotalCentavos
  ) {
    return {
      status:
        'resultado_inconsistente_credito',

      resultadoGerado:
        false,

      podeGerarEspelhoPgdas:
        false
    }
  }

  /*
   * -------------------------------------------------
   * 5. ICMS PRESERVADO
   * -------------------------------------------------
   */

  const valorIcmsCentavos =
    paraCentavos(
      dasConferido
        .valoresConferidos
        ?.icms
    )

  if (valorIcmsCentavos === null) {
    return null
  }

  /*
   * -------------------------------------------------
   * 6. ESPELHO DO PGDAS
   * -------------------------------------------------
   *
   * Representa os números que servirão como
   * guia para a redistribuição das receitas
   * na retificação.
   *
   * O FiscalTribe não transmite o PGDAS
   * nesta função.
   */

  const espelhoPgdas = {
    competencia,

    receitaBrutaTotal:
      deCentavos(
        receitaTotalCentavos
      ),

    segregacaoReceitas: {
      integralmenteTributadaPisCofins:
        deCentavos(
          receitaTributadaCentavos
        ),

      tratamentoEspecificoPisCofins:
        deCentavos(
          receitaTratamentoCentavos
        ),

      /*
       * Mantemos também o detalhamento
       * produzido pelo motor para distinguir
       * monofásico, ST e demais classificações
       * conhecidas.
       */
      detalhamentoTratamentoEspecifico:
        basePisCofins
          .tratamentosEspecificos || {}
    },

    pis: {
      anteriormenteDeclarado:
        deCentavos(
          pisOriginalCentavos
        ),

      novoValorApurado:
        deCentavos(
          pisConferidoCentavos
        )
    },

    cofins: {
      anteriormenteDeclarado:
        deCentavos(
          cofinsOriginalCentavos
        ),

      novoValorApurado:
        deCentavos(
          cofinsConferidoCentavos
        )
    },

    icms: {
      valorPreservado:
        deCentavos(
          valorIcmsCentavos
        ),

      alterado:
        false
    },

    prontoComoGuiaRetificacao:
      true,

    retificacaoTransmitida:
      false
  }

  /*
   * -------------------------------------------------
   * 7. RESULTADO FINAL DA COMPETÊNCIA
   * -------------------------------------------------
   */

  return {
    status:
      'resultado_recuperacao_pis_cofins_gerado',

    resultadoGerado:
      true,

    competencia,

    /*
     * RECEITA
     */

    receita: {
      originalmenteDeclaradaPgdas:
        deCentavos(
          receitaDeclaradaCentavos
        ),

      consideradaNaApuracao:
        deCentavos(
          receitaTotalCentavos
        ),

      integralmenteTributadaPisCofins:
        deCentavos(
          receitaTributadaCentavos
        ),

      tratamentoEspecificoPisCofins:
        deCentavos(
          receitaTratamentoCentavos
        )
    },

    /*
     * APURAÇÃO ORIGINAL
     */

    valoresOriginais: {
      pis:
        deCentavos(
          pisOriginalCentavos
        ),

      cofins:
        deCentavos(
          cofinsOriginalCentavos
        ),

      das:
        comparacao.dasOriginal
    },

    /*
     * NOVA APURAÇÃO
     */

    valoresConferidos: {
      pis:
        deCentavos(
          pisConferidoCentavos
        ),

      cofins:
        deCentavos(
          cofinsConferidoCentavos
        ),

      das:
        comparacao.dasConferido
    },

    /*
     * CRÉDITO MONOFÁSICO
     */

    credito: {
      identificado:
        creditoMonofasico
          .creditoIdentificado === true,

      pis:
        deCentavos(
          creditoPisCentavos
        ),

      cofins:
        deCentavos(
          creditoCofinsCentavos
        ),

      total:
        deCentavos(
          creditoTotalCentavos
        )
    },

    /*
     * ESPELHO PARA RETIFICAÇÃO
     */

    espelhoPgdas,

    /*
     * ALERTAS DA AUDITORIA
     */

    possuiAlertas:
      alertas.length > 0,

    alertas,

    /*
     * RESULTADOS DISPONÍVEIS
     */

    relatorioApuracaoDisponivel:
      true,

    espelhoPgdasDisponivel:
      true,

    planilhaDetalhadaDisponivel:
      false,

    /*
     * O e-Recuperador fornece os dados
     * para o procedimento posterior.
     *
     * Não executamos aqui:
     */
    retificacaoTransmitida:
      false,

    pedidoRestituicaoGerado:
      false,

    selicCalculada:
      false,

    comprovacaoPagamentoExigida:
      false,

    /*
     * Mantemos as estruturas originais
     * para rastreabilidade da auditoria.
     */

    basePisCofins,
    dasConferido,
    comparacao,
    creditoMonofasico
  }
}

function analisarIndebitoPotencialPisCofins({
  verificacaoPagamento
} = {}) {
  /*
   * ANÁLISE DE INDÉBITO POTENCIAL
   * PIS / COFINS
   *
   * Pré-requisitos:
   *
   * 1. PGDAS original conferido;
   * 2. DAS correto calculado;
   * 3. diferença demonstrada;
   * 4. pagamento integral do DAS original confirmado.
   *
   * Esta função:
   * - NÃO atualiza pela Selic;
   * - NÃO gera pedido de restituição;
   * - NÃO gera compensação;
   * - NÃO gera retificação;
   * - NÃO chama o valor de crédito definitivo.
   */

  if (
    !verificacaoPagamento ||
    typeof verificacaoPagamento !== 'object' ||
    verificacaoPagamento.status !==
      'pagamento_original_confirmado' ||
    verificacaoPagamento.pagamentoConfirmado !== true ||
    verificacaoPagamento.pagamentoIntegral !== true ||
    verificacaoPagamento.podeAnalisarIndebito !== true
  ) {
    return null
  }

  const comparacao =
    verificacaoPagamento.comparacao

  if (
    !comparacao ||
    typeof comparacao !== 'object' ||
    comparacao.status !==
      'comparacao_concluida' ||
    !comparacao.comparacaoTributos
  ) {
    return null
  }

  const comparacaoTributos =
    comparacao.comparacaoTributos

  const paraCentavos = (valor) => {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) {
      return null
    }

    return Math.round(numero * 100)
  }

  const deCentavos = (valor) =>
    valor / 100

  /*
   * Nesta tese, somente PIS e COFINS
   * podem produzir indébito potencial
   * automaticamente.
   */
  const tributosDaTese = [
    'pis',
    'cofins'
  ]

  const tributosForaDaTese = [
    'irpj',
    'csll',
    'cpp',
    'icms'
  ]

  /*
   * TRAVA DE AUDITORIA
   *
   * Se outro tributo mudou, não presumimos
   * que a diferença pertence à recuperação
   * de PIS/COFINS.
   */
  const divergenciasForaDaTese = []

  for (const tributo of tributosForaDaTese) {
    const dados =
      comparacaoTributos[tributo]

    if (!dados) {
      return null
    }

    const diferencaCentavos =
      paraCentavos(dados.diferenca)

    if (diferencaCentavos === null) {
      return null
    }

    if (diferencaCentavos !== 0) {
      divergenciasForaDaTese.push({
        tributo,

        original:
          dados.original,

        conferido:
          dados.conferido,

        diferenca:
          deCentavos(
            diferencaCentavos
          )
      })
    }
  }

  if (
    divergenciasForaDaTese.length > 0
  ) {
    return {
      status:
        'divergencia_fora_escopo_pis_cofins',

      podeConcluirIndebito:
        false,

      exigeAnaliseManual:
        true,

      divergenciasForaDaTese,

      pagamentoConfirmado:
        true,

      creditoCalculado:
        false,

      retificacaoGerada:
        false
    }
  }

  const detalhamento = {}

  let totalIndebitoPotencialCentavos = 0

  let existeDiferencaNegativa = false

  for (const tributo of tributosDaTese) {
    const dados =
      comparacaoTributos[tributo]

    if (!dados) {
      return null
    }

    const originalCentavos =
      paraCentavos(dados.original)

    const conferidoCentavos =
      paraCentavos(dados.conferido)

    const diferencaCentavos =
      paraCentavos(dados.diferenca)

    if (
      originalCentavos === null ||
      conferidoCentavos === null ||
      diferencaCentavos === null
    ) {
      return null
    }

    /*
     * Diferença positiva:
     *
     * valor originalmente apurado
     * >
     * valor correto conferido.
     */
    const indebitoPotencialCentavos =
      Math.max(
        diferencaCentavos,
        0
      )

    if (diferencaCentavos < 0) {
      existeDiferencaNegativa = true
    }

    totalIndebitoPotencialCentavos +=
      indebitoPotencialCentavos

    detalhamento[tributo] = {
      original:
        deCentavos(
          originalCentavos
        ),

      conferido:
        deCentavos(
          conferidoCentavos
        ),

      diferenca:
        deCentavos(
          diferencaCentavos
        ),

      indebitoPotencial:
        deCentavos(
          indebitoPotencialCentavos
        ),

      situacao:
        diferencaCentavos === 0
          ? 'sem_diferenca'
          : diferencaCentavos > 0
            ? 'original_superior'
            : 'original_inferior'
    }
  }

  /*
   * Na recuperação monofásica esperada,
   * PIS e/ou COFINS devem reduzir.
   *
   * Se qualquer um deles aumentar,
   * o motor não compensa diferenças entre
   * tributos automaticamente.
   */
  if (existeDiferencaNegativa) {
    return {
      status:
        'composicao_pis_cofins_exige_analise',

      podeConcluirIndebito:
        false,

      exigeAnaliseManual:
        true,

      detalhamento,

      pagamentoConfirmado:
        true,

      creditoCalculado:
        false,

      retificacaoGerada:
        false
    }
  }

  if (
    totalIndebitoPotencialCentavos === 0
  ) {
    return {
      status:
        'sem_indebito_potencial_pis_cofins',

      podeConcluirIndebito:
        true,

      indebitoPotencialIdentificado:
        false,

      valorTotalIndebitoPotencial:
        0,

      detalhamento,

      pagamentoConfirmado:
        true,

      creditoCalculado:
        false,

      retificacaoGerada:
        false
    }
  }

  return {
    status:
      'indebito_potencial_pis_cofins_identificado',

    podeConcluirIndebito:
      true,

    indebitoPotencialIdentificado:
      true,

    valorTotalIndebitoPotencial:
      deCentavos(
        totalIndebitoPotencialCentavos
      ),

    valoresPorTributo: {
      pis:
        detalhamento.pis
          .indebitoPotencial,

      cofins:
        detalhamento.cofins
          .indebitoPotencial
    },

    detalhamento,

    dasOriginal:
      comparacao.dasOriginal,

    dasConferido:
      comparacao.dasConferido,

    pagamentoConfirmado:
      true,

    /*
     * O valor ainda é POTENCIAL.
     *
     * Antes de virar crédito apto à
     * restituição/compensação, ainda haverá
     * memória da retificação e validações.
     */
    creditoCalculado:
      false,

    creditoDefinitivo:
      false,

    retificacaoGerada:
      false,

    selicCalculada:
      false,

    verificacaoPagamento
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