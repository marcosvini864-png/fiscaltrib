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

export {
  compararPgdasOriginalComDasConferido,
  identificarCreditoMonofasicoPisCofins,
}
