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

export {
  definirPoliticaRecuperacaoPisCofins,
  CLASSIFICACOES_PIS_COFINS_TRATAMENTO_ESPECIFICO,
  apurarReceitaPisCofinsTratamentoEspecifico,
}