function conciliarReceitaApuradaComPgdas(
  receitaApurada,
  receitaDeclaradaPgdas
) {
  if (
    receitaApurada === null ||
    receitaApurada === undefined ||
    String(receitaApurada).trim() === '' ||
    receitaDeclaradaPgdas === null ||
    receitaDeclaradaPgdas === undefined ||
    String(receitaDeclaradaPgdas).trim() === ''
  ) {
    return null
  }

  const apurada = Number(receitaApurada)
  const declarada = Number(receitaDeclaradaPgdas)

  if (
    !Number.isFinite(apurada) ||
    !Number.isFinite(declarada) ||
    apurada < 0 ||
    declarada < 0
  ) {
    return null
  }

  // A comparação é monetária, em centavos.
  // Não é arredondamento de cálculo tributário.
  const apuradaCentavos =
    Math.round(apurada * 100)

  const declaradaCentavos =
    Math.round(declarada * 100)

  const diferencaCentavos =
    declaradaCentavos - apuradaCentavos

  const receitasCoincidem =
    diferencaCentavos === 0

  return {
    receitaApurada:
      apuradaCentavos / 100,

    receitaDeclaradaPgdas:
      declaradaCentavos / 100,

    diferenca:
      diferencaCentavos / 100,

    receitasCoincidem,

    status:
      receitasCoincidem
        ? 'conciliada'
        : 'divergente',

    requerDecisao:
      !receitasCoincidem,
  }
}

// ============================================================
// DECISÃO DIANTE DE DIVERGÊNCIA DE RECEITA
// Fluxo espelhado do e-Recuperador:
// 1) interromper;
// 2) manter divergência sem gerar resultado automático;
// 3) usar receita declarada e aplicar ajuste conservador.
// Nesta etapa ainda NÃO realiza o ajuste conservador.
// ============================================================

function resolverDivergenciaReceita(
  conciliacao,
  decisao = null
) {
  if (
    !conciliacao ||
    typeof conciliacao !== 'object'
  ) {
    return null
  }

  if (conciliacao.receitasCoincidem) {
    return {
      status: 'conciliada',
      decisao: 'seguir',
      interrompida: false,
      podeProsseguirApuracao: true,
      podeGerarResultadoAutomatico: true,
      requerAjusteConservador: false,
    }
  }

  const decisoesPermitidas = [
    'interromper',
    'manter_divergencia',
    'usar_receita_declarada',
  ]

  if (!decisoesPermitidas.includes(decisao)) {
    return {
      status: 'aguardando_decisao',
      decisao: null,
      interrompida: false,
      podeProsseguirApuracao: false,
      podeGerarResultadoAutomatico: false,
      requerAjusteConservador: false,
    }
  }

  if (decisao === 'interromper') {
    return {
      status: 'interrompida',
      decisao,
      interrompida: true,
      podeProsseguirApuracao: false,
      podeGerarResultadoAutomatico: false,
      requerAjusteConservador: false,
    }
  }

  if (decisao === 'manter_divergencia') {
    return {
      status: 'divergencia_mantida',
      decisao,
      interrompida: false,
      podeProsseguirApuracao: false,
      podeGerarResultadoAutomatico: false,
      requerAjusteConservador: false,
    }
  }

  return {
    status: 'ajuste_conservador_pendente',
    decisao: 'usar_receita_declarada',
    interrompida: false,
    podeProsseguirApuracao: false,
    podeGerarResultadoAutomatico: false,
    requerAjusteConservador: true,
  }
}

// ============================================================
// PLANO DE AJUSTE CONSERVADOR DA RECEITA
// Espelha a regra do e-Recuperador sem ainda redistribuir
// valores entre parcelas ou qualificações específicas.
//
// diferença = receita declarada PGDAS - receita apurada
//
// diferença positiva:
//   acrescenta às receitas integralmente tributadas.
//
// diferença negativa:
//   reduz receitas submetidas a tratamento específico
//   (ST / monofásico / antecipação com encerramento).
//
// A distribuição entre qualificações será tratada depois,
// somente quando houver regra segura para essa distribuição.
// ============================================================

export {
  conciliarReceitaApuradaComPgdas,
  resolverDivergenciaReceita,
}