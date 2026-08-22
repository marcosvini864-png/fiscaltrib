const TIPOS_DECISAO_RECEITA_DOCUMENTAL = new Set([
  "incluir",
  "excluir",
  "reduzir",
])

function numeroDocumento(valor) {
  const numero = Number(valor ?? 0)

  return Number.isFinite(numero)
    ? numero
    : null
}

function extrairDadosReceitaDocumento(item) {
  if (!item || typeof item !== "object") {
    return null
  }

  const valorProduto = numeroDocumento(
    item.valor_produto
  )

  if (valorProduto === null || valorProduto < 0) {
    return null
  }

  return {
    nf: item.nf || null,
    chaveNfe: item.chave_nfe || null,
    numeroItem: item.numero_item_nfe || null,
    codigo: item.codigo || null,
    competencia: item.competencia || null,

    cfop: String(item.cfop ?? "").trim() || null,

    tipoOperacao:
      String(item.tipo_operacao ?? "").trim() || null,

    naturezaOperacao:
      String(item.natureza_operacao ?? "").trim() || null,

    valorProduto,

    valorDesconto:
      numeroDocumento(item.valor_desconto) ?? 0,

    valorFrete:
      numeroDocumento(item.valor_frete) ?? 0,

    valorSeguro:
      numeroDocumento(item.valor_seguro) ?? 0,

    valorOutrasDespesas:
      numeroDocumento(item.valor_outras_despesas) ?? 0,

    consideraReceitaOriginal:
      item.considera_receita ?? null,

    motivoOriginal:
      item.motivo_nao_considerar_receita || null,
  }
}

function normalizarDecisaoReceitaDocumental(decisao) {
  if (!decisao || typeof decisao !== "object") {
    return null
  }

  const tipo = String(decisao.tipo ?? "").trim()

  if (!TIPOS_DECISAO_RECEITA_DOCUMENTAL.has(tipo)) {
    return null
  }

  if (tipo === "excluir") {
    return {
      tipo,
      valor: 0,
      origem: decisao.origem || null,
      motivo: decisao.motivo || null,
    }
  }

  const valor = numeroDocumento(decisao.valor)

  if (valor === null || valor < 0) {
    return null
  }

  return {
    tipo,
    valor,
    origem: decisao.origem || null,
    motivo: decisao.motivo || null,
  }
}

function prepararReceitaDocumentalItem({
  item,
  decisao = null,
} = {}) {
  const dados = extrairDadosReceitaDocumento(item)

  if (!dados) {
    return {
      status: "documento_invalido",
      pronto: false,
      dados: null,
      decisao: null,
      movimento: null,
      pendencias: [
        { tipo: "documento_invalido" },
      ],
    }
  }

  const decisaoNormalizada =
    normalizarDecisaoReceitaDocumental(decisao)

  if (!decisaoNormalizada) {
    return {
      status: "aguardando_regra_receita_documental",
      pronto: false,
      dados,
      decisao: null,
      movimento: null,
      pendencias: [
        {
          tipo: "regra_receita_documental_pendente",
          cfop: dados.cfop,
          tipoOperacao: dados.tipoOperacao,
        },
      ],
    }
  }

  if (decisaoNormalizada.tipo === "excluir") {
    return {
      status: "documento_excluido_da_receita",
      pronto: true,
      dados,
      decisao: decisaoNormalizada,
      movimento: {
        tipo: "exclusao",
        valor: 0,
      },
      pendencias: [],
    }
  }

  if (decisaoNormalizada.tipo === "reduzir") {
    return {
      status: "documento_reducao_receita",
      pronto: true,
      dados,
      decisao: decisaoNormalizada,
      movimento: {
        tipo: "reducao",
        valor: decisaoNormalizada.valor,
      },
      pendencias: [],
    }
  }

  return {
    status: "documento_incluido_na_receita",
    pronto: true,
    dados,
    decisao: decisaoNormalizada,
    movimento: {
      tipo: "receita",
      valor: decisaoNormalizada.valor,
    },
    pendencias: [],
  }
}

function prepararReceitaDocumental(entradas) {
  if (!Array.isArray(entradas)) {
    return {
      itens: [],
      receitas: [],
      reducoes: [],
      excluidos: [],
      pendencias: [
        { tipo: "entradas_documentais_invalidas" },
      ],
      pronto: false,
    }
  }

  const itens = []
  const receitas = []
  const reducoes = []
  const excluidos = []
  const pendencias = []

  entradas.forEach((entrada, index) => {
    const resultado = prepararReceitaDocumentalItem({
      item: entrada?.item,
      decisao: entrada?.decisao || null,
    })

    itens.push(resultado)

    if (!resultado.pronto) {
      resultado.pendencias.forEach(pendencia => {
        pendencias.push({
          ...pendencia,
          index,
          nf: resultado.dados?.nf || null,
          chaveNfe: resultado.dados?.chaveNfe || null,
          codigo: resultado.dados?.codigo || null,
        })
      })

      return
    }

    if (resultado.movimento.tipo === "receita") {
      receitas.push(resultado)
      return
    }

    if (resultado.movimento.tipo === "reducao") {
      reducoes.push(resultado)
      return
    }

    excluidos.push(resultado)
  })

  const totalReceitas = receitas.reduce(
    (total, resultado) =>
      total + resultado.movimento.valor,
    0
  )

  const totalReducoes = reducoes.reduce(
    (total, resultado) =>
      total + resultado.movimento.valor,
    0
  )

  return {
    itens,
    receitas,
    reducoes,
    excluidos,
    pendencias,

    totalReceitas,
    totalReducoes,
    receitaLiquidaDocumental:
      totalReceitas - totalReducoes,

    pronto:
      pendencias.length === 0,
  }
}

export {
  TIPOS_DECISAO_RECEITA_DOCUMENTAL,
  extrairDadosReceitaDocumento,
  normalizarDecisaoReceitaDocumental,
  prepararReceitaDocumentalItem,
  prepararReceitaDocumental,
}
