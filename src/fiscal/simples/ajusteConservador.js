function planejarAjusteConservadorReceita(conciliacao) {
  if (
    !conciliacao ||
    typeof conciliacao !== 'object'
  ) {
    return null
  }

  const diferenca = Number(conciliacao.diferenca)

  if (!Number.isFinite(diferenca)) {
    return null
  }

  if (diferenca === 0) {
    return {
      necessario: false,
      valorAjuste: 0,
      tipoAjuste: 'nenhum',

      adicionarReceitaIntegralmenteTributada: 0,
      reduzirReceitaComTratamentoEspecifico: 0,
    }
  }

  if (diferenca > 0) {
    return {
      necessario: true,
      valorAjuste: diferenca,
      tipoAjuste: 'adicionar_tributacao_integral',

      adicionarReceitaIntegralmenteTributada:
        diferenca,

      reduzirReceitaComTratamentoEspecifico:
        0,
    }
  }

  return {
    necessario: true,
    valorAjuste: Math.abs(diferenca),
    tipoAjuste: 'reduzir_tratamento_especifico',

    adicionarReceitaIntegralmenteTributada:
      0,

    reduzirReceitaComTratamentoEspecifico:
      Math.abs(diferenca),
  }
}

// ============================================================
// APLICAÇÃO DO AJUSTE CONSERVADOR POSITIVO
//
// Quando a receita declarada no PGDAS é MAIOR que a receita
// encontrada nos documentos, a diferença é considerada receita
// sem tratamento monofásico, sem ICMS-ST e sem antecipação com
// encerramento.
//
// O ajuste fica separado das parcelas documentais para manter
// rastreabilidade e não inventar estabelecimento/atividade.
// ============================================================

function aplicarAjusteConservadorPositivo(
  movimentacao,
  conciliacao,
  resolucao,
  plano
) {
  if (
    !movimentacao ||
    typeof movimentacao !== 'object' ||
    !conciliacao ||
    typeof conciliacao !== 'object' ||
    !resolucao ||
    typeof resolucao !== 'object' ||
    !plano ||
    typeof plano !== 'object'
  ) {
    return null
  }

  if (
    resolucao.decisao !== 'usar_receita_declarada' ||
    !resolucao.requerAjusteConservador
  ) {
    return null
  }

  if (
    plano.tipoAjuste !== 'adicionar_tributacao_integral'
  ) {
    return null
  }

  const receitaDocumentos =
    Number(movimentacao.receitaTotal)

  const receitaDeclarada =
    Number(conciliacao.receitaDeclaradaPgdas)

  const valorAjuste =
    Number(
      plano.adicionarReceitaIntegralmenteTributada
    )

  if (
    !Number.isFinite(receitaDocumentos) ||
    !Number.isFinite(receitaDeclarada) ||
    !Number.isFinite(valorAjuste) ||
    receitaDocumentos < 0 ||
    receitaDeclarada < 0 ||
    valorAjuste <= 0
  ) {
    return null
  }

  const receitaDocumentosCentavos =
    Math.round(receitaDocumentos * 100)

  const receitaDeclaradaCentavos =
    Math.round(receitaDeclarada * 100)

  const valorAjusteCentavos =
    Math.round(valorAjuste * 100)

  if (
    receitaDocumentosCentavos +
      valorAjusteCentavos !==
    receitaDeclaradaCentavos
  ) {
    return null
  }

  return {
    status: 'ajuste_conservador_aplicado',

    receitaTotalDocumentos:
      receitaDocumentosCentavos / 100,

    receitaTotalConsiderada:
      receitaDeclaradaCentavos / 100,

    ajusteConservador: {
      origem: 'conciliacao_pgdas',

      tipo:
        'adicao_tributacao_integral',

      valor:
        valorAjusteCentavos / 100,

      classificacaoPisCofins:
        'sem_monofasico',

      classificacaoIcms:
        'sem_st_sem_antecipacao_encerramento',
    },

    movimentacaoOriginal:
      movimentacao,
  }
}

// ============================================================
// PREPARAÇÃO DO AJUSTE CONSERVADOR NEGATIVO
//
// Quando a receita declarada no PGDAS é MENOR que a receita
// apurada pelos documentos, a diferença deve reduzir receitas
// submetidas a tratamento específico.
//
// Nesta etapa:
// - NÃO escolhe monofásico, ST ou antecipação;
// - NÃO distribui valores entre parcelas;
// - apenas verifica se existe receita beneficiada suficiente
//   para suportar a redução.
// ============================================================

function prepararAjusteConservadorNegativo(
  resolucao,
  plano,
  receitaTratamentoEspecificoDisponivel
) {
  if (
    !resolucao ||
    typeof resolucao !== 'object' ||
    !plano ||
    typeof plano !== 'object' ||
    receitaTratamentoEspecificoDisponivel === null ||
    receitaTratamentoEspecificoDisponivel === undefined ||
    String(receitaTratamentoEspecificoDisponivel).trim() === ''
  ) {
    return null
  }

  if (
    resolucao.decisao !== 'usar_receita_declarada' ||
    !resolucao.requerAjusteConservador
  ) {
    return null
  }

  if (
    plano.tipoAjuste !==
      'reduzir_tratamento_especifico'
  ) {
    return null
  }

  const valorAjuste =
    Number(
      plano.reduzirReceitaComTratamentoEspecifico
    )

  const receitaDisponivel =
    Number(
      receitaTratamentoEspecificoDisponivel
    )

  if (
    !Number.isFinite(valorAjuste) ||
    !Number.isFinite(receitaDisponivel) ||
    valorAjuste <= 0 ||
    receitaDisponivel < 0
  ) {
    return null
  }

  const valorAjusteCentavos =
    Math.round(valorAjuste * 100)

  const receitaDisponivelCentavos =
    Math.round(receitaDisponivel * 100)

  const capacidadeSuficiente =
    receitaDisponivelCentavos >=
    valorAjusteCentavos

  const saldoCentavos =
    receitaDisponivelCentavos -
    valorAjusteCentavos

  return {
    status:
      capacidadeSuficiente
        ? 'ajuste_negativo_aguardando_distribuicao'
        : 'ajuste_negativo_sem_capacidade',

    valorAjuste:
      valorAjusteCentavos / 100,

    receitaTratamentoEspecificoDisponivel:
      receitaDisponivelCentavos / 100,

    capacidadeSuficiente,

    saldoTratamentoEspecificoAposAjuste:
      capacidadeSuficiente
        ? saldoCentavos / 100
        : null,

    valorNaoAbsorvido:
      capacidadeSuficiente
        ? 0
        : Math.abs(saldoCentavos) / 100,

    requerDistribuicaoEntreQualificacoes:
      capacidadeSuficiente,

    podeProsseguirApuracao: false,
  }
}

// ============================================================
// POLÍTICA DO ESCOPO DA RECUPERAÇÃO
//
// No fluxo de recuperação de PIS/COFINS monofásico,
// o ICMS originalmente declarado deve ser preservado,
// salvo opção expressa em sentido contrário.
//
// Essa política impede que o ajuste conservador altere
// automaticamente dimensões tributárias fora do escopo.
// ============================================================

export {
  planejarAjusteConservadorReceita,
  aplicarAjusteConservadorPositivo,
  prepararAjusteConservadorNegativo,
}