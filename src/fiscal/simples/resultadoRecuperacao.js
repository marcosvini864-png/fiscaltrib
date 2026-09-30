function gerarResultadoRecuperacaoPisCofins({
  competencia = null,
  pgdasOriginalCompetencia = null,
  receitaDeclaradaRevendaPgdas,
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
	
	  const pgdasCompetenciaCentavos =
    pgdasOriginalCompetencia &&
    typeof pgdasOriginalCompetencia === 'object'
      ? {
          receitaBruta:
            paraCentavos(
              pgdasOriginalCompetencia.receitaBruta
            ),

          irpj:
            paraCentavos(
              pgdasOriginalCompetencia.irpj
            ),

          csll:
            paraCentavos(
              pgdasOriginalCompetencia.csll
            ),

          pis:
            paraCentavos(
              pgdasOriginalCompetencia.pis
            ),

          cofins:
            paraCentavos(
              pgdasOriginalCompetencia.cofins
            ),

          cpp:
            paraCentavos(
              pgdasOriginalCompetencia.cpp
            ),

          icms:
            paraCentavos(
              pgdasOriginalCompetencia.icms
            ),

          ipi:
            paraCentavos(
              pgdasOriginalCompetencia.ipi
            ),

          iss:
            paraCentavos(
              pgdasOriginalCompetencia.iss
            ),

          das:
            paraCentavos(
              pgdasOriginalCompetencia.das
            ),
        }
      : null

  /*
   * -------------------------------------------------
   * 1. RECEITA ORIGINAL DO PGDAS
   * -------------------------------------------------
   */

  const receitaDeclaradaCentavos =
    paraCentavos(
      receitaDeclaradaPgdas
    )
	
  const receitaDeclaradaRevendaCentavos =
    paraCentavos(
      receitaDeclaradaRevendaPgdas
    )

    if (
    receitaDeclaradaCentavos === null ||
    receitaDeclaradaRevendaCentavos === null
  ) {
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
    receitaDeclaradaRevendaCentavos !==
    receitaTotalCentavos
  ) {
    alertas.push({
      tipo:
        'receita_revenda_pgdas_diferente_receita_revenda_resultado',

      receitaDeclaradaRevendaPgdas:
        deCentavos(
          receitaDeclaradaRevendaCentavos
        ),

      receitaRevendaResultado:
        deCentavos(
          receitaTotalCentavos
        ),

      mensagem:
        'A receita de revenda considerada na apuração difere da receita de revenda declarada no PGDAS.'
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
  
    const competenciaConferidaCentavos =
    pgdasCompetenciaCentavos
      ? {
          receitaBruta:
            pgdasCompetenciaCentavos.receitaBruta,

          irpj:
            pgdasCompetenciaCentavos.irpj,

          csll:
            pgdasCompetenciaCentavos.csll,

          pis:
            pgdasCompetenciaCentavos.pis !== null
              ? pgdasCompetenciaCentavos.pis -
                creditoPisCentavos
              : null,

          cofins:
            pgdasCompetenciaCentavos.cofins !== null
              ? pgdasCompetenciaCentavos.cofins -
                creditoCofinsCentavos
              : null,

          cpp:
            pgdasCompetenciaCentavos.cpp,

          icms:
            pgdasCompetenciaCentavos.icms,

          ipi:
            pgdasCompetenciaCentavos.ipi,

          iss:
            pgdasCompetenciaCentavos.iss,

          das:
            pgdasCompetenciaCentavos.das !== null
              ? pgdasCompetenciaCentavos.das -
                creditoTotalCentavos
              : null,
        }
      : null
	  
	    if (
    !competenciaConferidaCentavos ||
    competenciaConferidaCentavos.receitaBruta === null ||
    competenciaConferidaCentavos.irpj === null ||
    competenciaConferidaCentavos.csll === null ||
    competenciaConferidaCentavos.pis === null ||
    competenciaConferidaCentavos.cofins === null ||
    competenciaConferidaCentavos.cpp === null ||
    competenciaConferidaCentavos.icms === null ||
    competenciaConferidaCentavos.ipi === null ||
    competenciaConferidaCentavos.iss === null ||
    competenciaConferidaCentavos.das === null ||
    competenciaConferidaCentavos.pis < 0 ||
    competenciaConferidaCentavos.cofins < 0 ||
    competenciaConferidaCentavos.das < 0
  ) {
    return {
      status:
        'resultado_inconsistente_recomposicao_competencia',

      resultadoGerado:
        false,

      podeGerarEspelhoPgdas:
        false
    }
  }
  
    const somaTributosOriginaisCentavos =
    pgdasCompetenciaCentavos.irpj +
    pgdasCompetenciaCentavos.csll +
    pgdasCompetenciaCentavos.pis +
    pgdasCompetenciaCentavos.cofins +
    pgdasCompetenciaCentavos.cpp +
    pgdasCompetenciaCentavos.icms +
    pgdasCompetenciaCentavos.ipi +
    pgdasCompetenciaCentavos.iss

  const somaTributosConferidosCentavos =
    competenciaConferidaCentavos.irpj +
    competenciaConferidaCentavos.csll +
    competenciaConferidaCentavos.pis +
    competenciaConferidaCentavos.cofins +
    competenciaConferidaCentavos.cpp +
    competenciaConferidaCentavos.icms +
    competenciaConferidaCentavos.ipi +
    competenciaConferidaCentavos.iss

  if (
    somaTributosOriginaisCentavos !==
      pgdasCompetenciaCentavos.das ||
    somaTributosConferidosCentavos !==
      competenciaConferidaCentavos.das
  ) {
    return {
      status:
        'resultado_inconsistente_fechamento_das_competencia',

      resultadoGerado:
        false,

      podeGerarEspelhoPgdas:
        false,

      conferenciaDas: {
        original: {
          das:
            deCentavos(
              pgdasCompetenciaCentavos.das
            ),

          somaTributos:
            deCentavos(
              somaTributosOriginaisCentavos
            )
        },

        conferido: {
          das:
            deCentavos(
              competenciaConferidaCentavos.das
            ),

          somaTributos:
            deCentavos(
              somaTributosConferidosCentavos
            )
        }
      }
    }
  }

  /*
   * -------------------------------------------------
   * 5. ICMS PRESERVADO
   * -------------------------------------------------
   */

    const valorIcmsCentavos =
    competenciaConferidaCentavos.icms

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
        competenciaConferidaCentavos.receitaBruta
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

      detalhamentoTratamentoEspecifico:
        basePisCofins
          .tratamentosEspecificos || {},

      /*
       * Snapshot operacional completo para o Espelho:
       * estabelecimento -> mercado -> atividade -> qualificações.
       */
      detalhamentoQualificado:
        Array.isArray(basePisCofins.detalhamentoQualificado)
          ? basePisCofins.detalhamentoQualificado
          : [],

      parcelasQualificadas:
        Array.isArray(basePisCofins.parcelasQualificadas)
          ? basePisCofins.parcelasQualificadas
          : [],
    },

    pis: {
     anteriormenteDeclarado:
        deCentavos(
          pgdasCompetenciaCentavos.pis
        ),

     novoValorApurado:
        deCentavos(
          competenciaConferidaCentavos.pis
        )
    },

    cofins: {
     anteriormenteDeclarado:
        deCentavos(
          pgdasCompetenciaCentavos.cofins
        ),

            novoValorApurado:
        deCentavos(
          competenciaConferidaCentavos.cofins
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
      Array.isArray(basePisCofins.detalhamentoQualificado) &&
      basePisCofins.detalhamentoQualificado.length > 0,

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
          competenciaConferidaCentavos.receitaBruta
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
  irpj:
    deCentavos(
      pgdasCompetenciaCentavos.irpj
    ),

  csll:
    deCentavos(
      pgdasCompetenciaCentavos.csll
    ),

  pis:
    deCentavos(
      pgdasCompetenciaCentavos.pis
    ),

  cofins:
    deCentavos(
      pgdasCompetenciaCentavos.cofins
    ),

  cpp:
    deCentavos(
      pgdasCompetenciaCentavos.cpp
    ),

  icms:
    deCentavos(
      pgdasCompetenciaCentavos.icms
    ),

  ipi:
    deCentavos(
      pgdasCompetenciaCentavos.ipi
    ),

  iss:
    deCentavos(
      pgdasCompetenciaCentavos.iss
    ),

  das:
    deCentavos(
      pgdasCompetenciaCentavos.das
    )
},

    /*
     * NOVA APURAÇÃO
     */

valoresConferidos: {
  irpj:
    deCentavos(
      competenciaConferidaCentavos.irpj
    ),

  csll:
    deCentavos(
      competenciaConferidaCentavos.csll
    ),

  pis:
    deCentavos(
      competenciaConferidaCentavos.pis
    ),

  cofins:
    deCentavos(
      competenciaConferidaCentavos.cofins
    ),

  cpp:
    deCentavos(
      competenciaConferidaCentavos.cpp
    ),

  icms:
    deCentavos(
      competenciaConferidaCentavos.icms
    ),

  ipi:
    deCentavos(
      competenciaConferidaCentavos.ipi
    ),

  iss:
    deCentavos(
      competenciaConferidaCentavos.iss
    ),

  das:
    deCentavos(
      competenciaConferidaCentavos.das
    )
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
