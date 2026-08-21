import {
  calcularPisCofinsConferidosAnexoI,
} from './apuracaoPisCofins'

import {
  definirPoliticaRecuperacaoPisCofins,
} from './pisCofins'
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

export {
  calcularTributosFederaisConferidosAnexoI,
  prepararIcmsPreservadoPgdas,
  calcularDasConferidoAnexoI,
}
