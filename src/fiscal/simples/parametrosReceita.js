import {
  criarChaveItemDocumental,
} from './receitaDocumental'

const TRATAMENTOS_RECEITA_DOCUMENTAL = new Set([
  'incluir',
  'excluir',
])

const TRATAMENTOS_DESCONTO_DOCUMENTAL = new Set([
  'manter_valor_produto',
  'reduzir_receita',
])

function normalizarCfopReceita(valor) {
  const cfop = String(valor ?? '')
    .replace(/\D/g, '')
    .trim()

  return /^\d{4}$/.test(cfop)
    ? cfop
    : null
}

function numeroMonetarioReceita(valor) {
  const numero = Number(valor ?? 0)

  return Number.isFinite(numero)
    ? numero
    : null
}

function agruparItensReceitaPorCfop(itens = []) {
  if (!Array.isArray(itens)) {
    return null
  }

  const mapa = new Map()
  const pendencias = []

  for (const item of itens) {
    const cfop = normalizarCfopReceita(
      item?.cfop
    )

    if (!cfop) {
      pendencias.push({
        tipo: 'cfop_ausente_ou_invalido',
        nf: item?.nf || null,
        codigo: item?.codigo || null,
        chaveNfe: item?.chave_nfe || null,
      })

      continue
    }

    const valorProduto =
      numeroMonetarioReceita(
        item?.valor_produto
      )

    const valorDesconto =
      numeroMonetarioReceita(
        item?.valor_desconto
      )

    if (
      valorProduto === null ||
      valorProduto < 0 ||
      valorDesconto === null ||
      valorDesconto < 0
    ) {
      pendencias.push({
        tipo: 'valor_documental_invalido',
        cfop,
        nf: item?.nf || null,
        codigo: item?.codigo || null,
      })

      continue
    }

    if (!mapa.has(cfop)) {
      mapa.set(cfop, {
        cfop,
        quantidadeItens: 0,
        valorProdutos: 0,
        valorDescontos: 0,
        tiposOperacao: new Set(),
        naturezasOperacao: new Set(),
      })
    }

    const grupo = mapa.get(cfop)

    grupo.quantidadeItens += 1
    grupo.valorProdutos += valorProduto
    grupo.valorDescontos += valorDesconto

    const tipoOperacao = String(
      item?.tipo_operacao ?? ''
    ).trim()

    if (tipoOperacao) {
      grupo.tiposOperacao.add(
        tipoOperacao
      )
    }

    const naturezaOperacao = String(
      item?.natureza_operacao ?? ''
    ).trim()

    if (naturezaOperacao) {
      grupo.naturezasOperacao.add(
        naturezaOperacao
      )
    }
  }

  return {
    grupos: Array.from(
      mapa.values()
    ).map(grupo => ({
      ...grupo,

      valorProdutos:
        Math.round(
          grupo.valorProdutos * 100
        ) / 100,

      valorDescontos:
        Math.round(
          grupo.valorDescontos * 100
        ) / 100,

      tiposOperacao:
        Array.from(grupo.tiposOperacao),

      naturezasOperacao:
        Array.from(
          grupo.naturezasOperacao
        ),
    })),

    pendencias,
  }
}

function normalizarParametroReceitaCfop(
  parametro
) {
  if (
    !parametro ||
    typeof parametro !== 'object'
  ) {
    return null
  }

  const cfop =
    normalizarCfopReceita(
      parametro.cfop
    )

  const tratamento = String(
    parametro.tratamento ?? ''
  ).trim()

  if (
    !cfop ||
    !TRATAMENTOS_RECEITA_DOCUMENTAL
      .has(tratamento)
  ) {
    return null
  }

  if (tratamento === 'excluir') {
    return {
      cfop,
      tratamento,
      tratamentoDesconto: null,
    }
  }

  const tratamentoDesconto = String(
    parametro.tratamentoDesconto ?? ''
  ).trim()

  if (
    !TRATAMENTOS_DESCONTO_DOCUMENTAL
      .has(tratamentoDesconto)
  ) {
    return null
  }

  return {
    cfop,
    tratamento,
    tratamentoDesconto,
  }
}

function montarDecisoesReceitaPorParametros({
  itens = [],
  parametros = [],
} = {}) {
  if (
    !Array.isArray(itens) ||
    !Array.isArray(parametros)
  ) {
    return {
      pronto: false,
      decisoes: [],
      pendencias: [
        {
          tipo:
            'parametrizacao_receita_invalida',
        },
      ],
    }
  }

  const mapaParametros = new Map()
  const pendencias = []
  const decisoes = []

  for (const parametroOriginal of parametros) {
    const parametro =
      normalizarParametroReceitaCfop(
        parametroOriginal
      )

    if (!parametro) {
      pendencias.push({
        tipo:
          'parametro_cfop_invalido',
      })

      continue
    }

    if (
      mapaParametros.has(
        parametro.cfop
      )
    ) {
      pendencias.push({
        tipo:
          'parametro_cfop_duplicado',
        cfop:
          parametro.cfop,
      })

      continue
    }

    mapaParametros.set(
      parametro.cfop,
      parametro
    )
  }

  for (const item of itens) {
    const chaveItem =
      criarChaveItemDocumental(item)

    if (!chaveItem) {
      pendencias.push({
        tipo:
          'chave_item_documental_ausente',
        nf: item?.nf || null,
        codigo: item?.codigo || null,
      })

      continue
    }

    /*
     * Exclusão documental já existente
     * permanece respeitada.
     */
    if (
      item?.considera_receita === false
    ) {
      decisoes.push({
        chaveItem,
        tipo: 'excluir',
        origem:
          'marcacao_documental_existente',
        motivo:
          item?.motivo_nao_considerar_receita ||
          'Item marcado para não considerar receita',
      })

      continue
    }

    const cfop =
      normalizarCfopReceita(
        item?.cfop
      )

    if (!cfop) {
      pendencias.push({
        tipo:
          'cfop_ausente_ou_invalido',
        chaveItem,
        nf: item?.nf || null,
        codigo: item?.codigo || null,
      })

      continue
    }

    const parametro =
      mapaParametros.get(cfop)

    if (!parametro) {
      pendencias.push({
        tipo:
          'cfop_sem_parametrizacao',
        cfop,
        chaveItem,
        nf: item?.nf || null,
        codigo: item?.codigo || null,
      })

      continue
    }

    if (
      parametro.tratamento ===
      'excluir'
    ) {
      decisoes.push({
        chaveItem,
        tipo: 'excluir',
        origem:
          'parametrizacao_cfop',
        motivo:
          'CFOP parametrizado para não compor a receita documental',
      })

      continue
    }

    const valorProduto =
      numeroMonetarioReceita(
        item?.valor_produto
      )

    const valorDesconto =
      numeroMonetarioReceita(
        item?.valor_desconto
      )

    if (
      valorProduto === null ||
      valorProduto < 0 ||
      valorDesconto === null ||
      valorDesconto < 0
    ) {
      pendencias.push({
        tipo:
          'valor_documental_invalido',
        cfop,
        chaveItem,
        nf: item?.nf || null,
        codigo: item?.codigo || null,
      })

      continue
    }

    let valorReceita =
      valorProduto

    if (
      parametro.tratamentoDesconto ===
      'reduzir_receita'
    ) {
      valorReceita =
        valorProduto -
        valorDesconto
    }

    if (valorReceita < 0) {
      pendencias.push({
        tipo:
          'desconto_superior_valor_produto',
        cfop,
        chaveItem,
        nf: item?.nf || null,
        codigo: item?.codigo || null,
      })

      continue
    }

    decisoes.push({
      chaveItem,
      tipo: 'incluir',
      valor:
        Math.round(
          valorReceita * 100
        ) / 100,
      origem:
        'parametrizacao_cfop',
      motivo:
        'Composição da receita definida pela parametrização documental do CFOP',
    })
  }

  return {
    pronto:
      pendencias.length === 0,

    decisoes,

    pendencias,
  }
}

export {
  TRATAMENTOS_RECEITA_DOCUMENTAL,
  TRATAMENTOS_DESCONTO_DOCUMENTAL,
  normalizarCfopReceita,
  agruparItensReceitaPorCfop,
  normalizarParametroReceitaCfop,
  montarDecisoesReceitaPorParametros,
}