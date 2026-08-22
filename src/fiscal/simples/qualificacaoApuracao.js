function normalizarCnpjApuracao(valor) {
  const numeros = String(valor ?? "").replace(/\D/g, "")

  return numeros.length === 14
    ? numeros
    : null
}

function resolverEstabelecimentoDocumento({
  item,
  clienteCnpj,
} = {}) {
  const cliente = normalizarCnpjApuracao(clienteCnpj)

  if (!cliente) {
    return {
      status: "cliente_cnpj_invalido",
      estabelecimento: null,
      papel: null,
    }
  }

  const emitente = normalizarCnpjApuracao(
    item?.emitente_cnpj
  )

  const destinatario = normalizarCnpjApuracao(
    item?.destinatario_cnpj
  )

  const clienteEhEmitente = emitente === cliente
  const clienteEhDestinatario = destinatario === cliente

  if (clienteEhEmitente && clienteEhDestinatario) {
    return {
      status: "estabelecimento_ambiguo",
      estabelecimento: null,
      papel: null,
    }
  }

  if (clienteEhEmitente) {
    return {
      status: "ok",
      estabelecimento: cliente,
      papel: "emitente",
    }
  }

  if (clienteEhDestinatario) {
    return {
      status: "ok",
      estabelecimento: cliente,
      papel: "destinatario",
    }
  }

  return {
    status: "estabelecimento_nao_identificado",
    estabelecimento: null,
    papel: null,
  }
}

function resolverMercadoDocumento(item) {
  const indicadorDestino = String(
    item?.indicador_destino ?? ""
  ).trim()

  if (indicadorDestino === "3") {
    return {
      status: "ok",
      mercado: "mercado_externo",
      indicadorDestino,
    }
  }

  if (
    indicadorDestino === "1" ||
    indicadorDestino === "2"
  ) {
    return {
      status: "ok",
      mercado: "mercado_interno",
      indicadorDestino,
    }
  }

  return {
    status: "mercado_nao_identificado",
    mercado: null,
    indicadorDestino: indicadorDestino || null,
  }
}

function resolverClassificacaoIcmsApuracao({
  alterarIcms = false,
  classificacaoIcmsInformada = null,
} = {}) {
  if (!alterarIcms) {
    return {
      status: "ok",
      classificacaoIcms: "preservado_pgdas",
      origem: "politica_preservacao_pgdas",
    }
  }

  const classificacao = String(
    classificacaoIcmsInformada ?? ""
  ).trim()

  if (!classificacao) {
    return {
      status: "classificacao_icms_pendente",
      classificacaoIcms: null,
      origem: null,
    }
  }

  return {
    status: "ok",
    classificacaoIcms: classificacao,
    origem: "informada",
  }
}

function qualificarItemApuracao({
  item,
  clienteCnpj,
  atividade,
  classificacaoPisCofins,
  alterarIcms = false,
  classificacaoIcmsInformada = null,
  valor = null,
} = {}) {
  const pendencias = []

  if (!item || typeof item !== "object") {
    return {
      pronta: false,
      parcela: null,
      pendencias: [
        {
          tipo: "item_documental_invalido",
        },
      ],
    }
  }

  const estabelecimento =
    resolverEstabelecimentoDocumento({
      item,
      clienteCnpj,
    })

  if (estabelecimento.status !== "ok") {
    pendencias.push({
      tipo: estabelecimento.status,
    })
  }

  const mercado = resolverMercadoDocumento(item)

  if (mercado.status !== "ok") {
    pendencias.push({
      tipo: mercado.status,
    })
  }

  const atividadeNormalizada = String(
    atividade ?? ""
  ).trim()

  if (!atividadeNormalizada) {
    pendencias.push({
      tipo: "atividade_nao_identificada",
    })
  }

  const pisCofins = String(
    classificacaoPisCofins ?? ""
  ).trim()

  if (!pisCofins) {
    pendencias.push({
      tipo: "classificacao_pis_cofins_pendente",
    })
  }

  const icms = resolverClassificacaoIcmsApuracao({
    alterarIcms,
    classificacaoIcmsInformada,
  })

  if (icms.status !== "ok") {
    pendencias.push({
      tipo: icms.status,
    })
  }

  const valorNumerico = Number(
    valor ?? item.valor_produto
  )

  if (
    !Number.isFinite(valorNumerico) ||
    valorNumerico < 0
  ) {
    pendencias.push({
      tipo: "valor_documental_invalido",
    })
  }

  const pronta = pendencias.length === 0

  return {
    pronta,

    parcela: pronta
      ? {
          estabelecimento:
            estabelecimento.estabelecimento,

          mercado:
            mercado.mercado,

          atividade:
            atividadeNormalizada,

          classificacaoPisCofins:
            pisCofins,

          classificacaoIcms:
            icms.classificacaoIcms,

          valor:
            valorNumerico,
        }
      : null,

    qualificacao: {
      estabelecimento,
      mercado,
      atividade: atividadeNormalizada || null,
      classificacaoPisCofins: pisCofins || null,
      icms,
      valor:
        Number.isFinite(valorNumerico)
          ? valorNumerico
          : null,
    },

    rastreabilidade: {
      nf: item.nf || null,
      chaveNfe: item.chave_nfe || null,
      codigo: item.codigo || null,
      competencia: item.competencia || null,
    },

    pendencias,
  }
}

function qualificarItensApuracao({
  itensPreparados = [],
  clienteCnpj,
  alterarIcms = false,
} = {}) {
  if (!Array.isArray(itensPreparados)) {
    return {
      itens: [],
      parcelas: [],
      pendencias: [
        {
          tipo: "itens_preparados_invalidos",
        },
      ],
      prontaParaConferencia: false,
    }
  }

  const itens = []
  const parcelas = []
  const pendencias = []

  itensPreparados.forEach((entrada, index) => {
    const item = entrada?.item || null

    const resultado = qualificarItemApuracao({
      item,
      clienteCnpj,

      atividade:
        entrada?.qualificacao?.atividade,

      classificacaoPisCofins:
        entrada?.classificacao?.classificacao ||
        entrada?.qualificacao
          ?.classificacaoPisCofins,

      alterarIcms,

      classificacaoIcmsInformada:
        entrada?.qualificacao
          ?.classificacaoIcms,

      valor:
        entrada?.qualificacao?.valor ??
        item?.valor_produto,
    })

    itens.push({
      entrada,
      resultado,
    })

    if (resultado.pronta) {
      parcelas.push(resultado.parcela)
      return
    }

    for (const pendencia of resultado.pendencias) {
      pendencias.push({
        ...pendencia,
        index,
        nf: item?.nf || null,
        codigo: item?.codigo || null,
        chaveNfe: item?.chave_nfe || null,
      })
    }
  })

  return {
    itens,
    parcelas,
    pendencias,
    prontaParaConferencia:
      pendencias.length === 0 &&
      parcelas.length > 0,
  }
}

export {
  normalizarCnpjApuracao,
  resolverEstabelecimentoDocumento,
  resolverMercadoDocumento,
  resolverClassificacaoIcmsApuracao,
  qualificarItemApuracao,
  qualificarItensApuracao,
}
