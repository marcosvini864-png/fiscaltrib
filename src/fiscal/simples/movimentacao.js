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

export {
  normalizarParcelaReceitaQualificada,
  consolidarParcelasReceitaQualificada,
  organizarDetalhamentoApuracao,
  resumirReceitasPorDimensaoTributaria,
  prepararMovimentacaoApuracao,
}