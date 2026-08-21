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

export {
  gerarResultadoRecuperacaoPisCofins,
}
