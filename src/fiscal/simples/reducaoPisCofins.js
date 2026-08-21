import {
  normalizarParcelaReceitaQualificada,
  prepararMovimentacaoApuracao,
} from './movimentacao'

import {
  prepararAjusteConservadorNegativo,
} from './ajusteConservador'

import {
  apurarReceitaPisCofinsTratamentoEspecifico,
} from './pisCofins'
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

export {
  prepararReducaoConservadoraPisCofins,
  prepararCandidatasReducaoPisCofins,
  validarDistribuicaoReducaoPisCofins,
  aplicarDistribuicaoReducaoPisCofins,
}