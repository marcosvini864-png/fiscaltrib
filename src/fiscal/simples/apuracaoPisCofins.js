import {
  calcularParametrosAnexoI,
} from './anexoI'

import {
  CLASSIFICACOES_PIS_COFINS_TRATAMENTO_ESPECIFICO,
} from './pisCofins'
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

export {
  prepararBasePisCofinsConferida,
  calcularPisCofinsConferidosAnexoI,
}
