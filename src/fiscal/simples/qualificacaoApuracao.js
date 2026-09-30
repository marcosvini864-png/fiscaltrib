function normalizarCnpjApuracao(valor) {
  const numeros = String(valor ?? "").replace(/\D/g, "")

  return numeros.length === 14
    ? numeros
    : null
}

function raizCnpjApuracao(cnpj) {
  const normalizado = normalizarCnpjApuracao(cnpj)
  return normalizado ? normalizado.slice(0, 8) : null
}

function resolverEstabelecimentoDocumento({
  item,
  clienteCnpj,
} = {}) {
  const cliente = normalizarCnpjApuracao(clienteCnpj)

  if (!cliente) {
    return {
      status: 'cliente_cnpj_invalido',
      estabelecimento: null,
      papel: null,
      correspondencia: null,
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
      status: 'estabelecimento_ambiguo',
      estabelecimento: null,
      papel: null,
      correspondencia: 'cnpj_exato',
    }
  }

  if (clienteEhEmitente) {
    return {
      status: 'ok',
      estabelecimento: emitente,
      papel: 'emitente',
      correspondencia: 'cnpj_exato',
    }
  }

  if (clienteEhDestinatario) {
    return {
      status: 'ok',
      estabelecimento: destinatario,
      papel: 'destinatario',
      correspondencia: 'cnpj_exato',
    }
  }

  /*
   * Matriz/filial: se o cliente selecionado representa o mesmo grupo
   * empresarial (mesma raiz de 8 dígitos), preservamos no movimento o
   * CNPJ real do estabelecimento que aparece no documento.
   */
  const raizCliente = raizCnpjApuracao(cliente)
  const emitenteMesmaRaiz =
    Boolean(emitente) && raizCnpjApuracao(emitente) === raizCliente
  const destinatarioMesmaRaiz =
    Boolean(destinatario) && raizCnpjApuracao(destinatario) === raizCliente

  if (emitenteMesmaRaiz && destinatarioMesmaRaiz) {
    return {
      status: 'estabelecimento_ambiguo',
      estabelecimento: null,
      papel: null,
      correspondencia: 'raiz_cnpj',
    }
  }

  if (emitenteMesmaRaiz) {
    return {
      status: 'ok',
      estabelecimento: emitente,
      papel: 'emitente',
      correspondencia: 'raiz_cnpj',
    }
  }

  if (destinatarioMesmaRaiz) {
    return {
      status: 'ok',
      estabelecimento: destinatario,
      papel: 'destinatario',
      correspondencia: 'raiz_cnpj',
    }
  }

  return {
    status: 'estabelecimento_nao_identificado',
    estabelecimento: null,
    papel: null,
    correspondencia: null,
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

  // Se indDest foi informado, mas nao possui valor reconhecido,
  // nao sobrescrever a informacao com inferencia pelo CFOP.
  if (indicadorDestino) {
    return {
      status: "mercado_nao_identificado",
      mercado: null,
      indicadorDestino,
    }
  }

  // Fallback documental quando indDest esta ausente.
  // Grupos 1, 2, 5 e 6 pertencem ao mercado interno.
  // Grupos 3 e 7 representam operacoes com o exterior.
  const cfop = String(item?.cfop ?? "")
    .replace(/\D/g, "")
    .trim()

  const grupoCfop = cfop.charAt(0)

  if (["1", "2", "5", "6"].includes(grupoCfop)) {
    return {
      status: "ok",
      mercado: "mercado_interno",
      indicadorDestino: null,
    }
  }

  if (["3", "7"].includes(grupoCfop)) {
    return {
      status: "ok",
      mercado: "mercado_externo",
      indicadorDestino: null,
    }
  }

  return {
    status: "mercado_nao_identificado",
    mercado: null,
    indicadorDestino: null,
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
  naturezaAtividade,
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
  
  const naturezaAtividadeNormalizada = String(
  naturezaAtividade ?? ""
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
			
		  naturezaAtividade:
            naturezaAtividadeNormalizada || null,

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
	  naturezaAtividade:
      naturezaAtividadeNormalizada || null,
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
		
	  naturezaAtividade:
        entrada?.qualificacao?.naturezaAtividade,

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
  raizCnpjApuracao,
  resolverEstabelecimentoDocumento,
  resolverMercadoDocumento,
  resolverClassificacaoIcmsApuracao,
  qualificarItemApuracao,
  qualificarItensApuracao,
}
