import {
  prepararMovimentacaoApuracao,
} from './movimentacao'

import {
  conciliarReceitaApuradaComPgdas,
  resolverDivergenciaReceita,
} from './conciliacaoPgdas'

import {
  planejarAjusteConservadorReceita,
  aplicarAjusteConservadorPositivo,
} from './ajusteConservador'

import {
  definirPoliticaRecuperacaoPisCofins,
} from './pisCofins'

import {
  prepararReducaoConservadoraPisCofins,
  prepararCandidatasReducaoPisCofins,
  validarDistribuicaoReducaoPisCofins,
  aplicarDistribuicaoReducaoPisCofins,
} from './reducaoPisCofins'
function executarApuracaoSimples({
  parcelas,
  receitaDeclaradaPgdas,
  decisaoDivergencia = null,
  alterarIcms = false,
  distribuicaoReducao = null,
} = {}) {
  /*
   * ORQUESTRADOR CENTRAL — ETAPA DE CONFERÊNCIA
   *
   * Espelha o fluxo operacional do e-Auditoria/e-Recuperador:
   *
   * documentos/classificação
   * → movimentação
   * → conciliação com PGDAS
   * → tratamento da divergência
   * → eventual ajuste conservador
   * → liberação da base para cálculo.
   *
   * Nesta versão ainda NÃO calcula DAS,
   * NÃO calcula crédito
   * e NÃO gera valores de retificação.
   */

  const movimentacao =
    prepararMovimentacaoApuracao(parcelas)

  if (!movimentacao) {
    return {
      status: 'movimentacao_invalida',
      etapa: 'preparacao_movimentacao',
      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,
      movimentacao: null,
      conciliacao: null,
      resolucao: null,
      erros: [
        'Não foi possível preparar a movimentação para apuração.'
      ]
    }
  }

  const conciliacao =
    conciliarReceitaApuradaComPgdas(
      movimentacao.receitaTotal,
      receitaDeclaradaPgdas
    )

  if (!conciliacao) {
    return {
      status: 'conciliacao_invalida',
      etapa: 'conciliacao_pgdas',
      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,
      movimentacao,
      conciliacao: null,
      resolucao: null,
      erros: [
        'Não foi possível conciliar a receita apurada com o PGDAS.'
      ]
    }
  }

  const resolucao =
    resolverDivergenciaReceita(
      conciliacao,
      decisaoDivergencia
    )

  if (!resolucao) {
    return {
      status: 'resolucao_invalida',
      etapa: 'tratamento_divergencia',
      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,
      movimentacao,
      conciliacao,
      resolucao: null,
      erros: [
        'Não foi possível resolver o estado da divergência.'
      ]
    }
  }

  /*
   * Receita documental = PGDAS.
   * Fluxo conciliado e liberado.
   */
  if (conciliacao.receitasCoincidem) {
    return {
      status: 'conferencia_concluida',
      etapa: 'pronto_para_calculo',

      prontoParaCalculo: true,
      podeGerarResultadoAutomatico: true,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        movimentacao,

      receitaTotalConsiderada:
        movimentacao.receitaTotal,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * e-Recuperador:
   * interrupção expressa.
   */
  if (resolucao.interrompida) {
    return {
      status: 'apuracao_interrompida',
      etapa: 'tratamento_divergencia',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        null,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * Divergência mantida:
   * permite detalhamento,
   * mas NÃO libera resultado automático.
   */
  if (
    resolucao.decisao ===
    'manter_divergencia'
  ) {
    return {
      status: 'divergencia_mantida',
      etapa: 'detalhamento_sem_resultado',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        movimentacao,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * Divergência ainda sem decisão.
   */
  if (
    resolucao.status ===
    'aguardando_decisao'
  ) {
    return {
      status: 'aguardando_decisao',
      etapa: 'tratamento_divergencia',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        null,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: []
    }
  }

  /*
   * A partir daqui só entra o caminho
   * conservador do e-Recuperador.
   */
  const plano =
    planejarAjusteConservadorReceita(
      conciliacao
    )

  if (!plano) {
    return {
      status: 'plano_ajuste_invalido',
      etapa: 'ajuste_conservador',

      prontoParaCalculo: false,
      podeGerarResultadoAutomatico: false,

      movimentacaoOriginal:
        movimentacao,

      conciliacao,
      resolucao,

      ajusteConservador:
        null,

      erros: [
        'Não foi possível preparar o plano de ajuste conservador.'
      ]
    }
  }

  /*
   * PGDAS > documentos:
   * diferença oferecida à tributação integral.
   */
  if (
    plano.tipoAjuste ===
    'adicionar_tributacao_integral'
  ) {
    const ajustePositivo =
      aplicarAjusteConservadorPositivo(
        movimentacao,
        conciliacao,
        resolucao,
        plano
      )

    if (!ajustePositivo) {
      return {
        status: 'ajuste_positivo_invalido',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,

        ajusteConservador:
          null,

        erros: [
          'Não foi possível aplicar o ajuste conservador positivo.'
        ]
      }
    }

    return {
      status: 'conferencia_concluida',
      etapa: 'pronto_para_calculo',

      prontoParaCalculo: true,
      podeGerarResultadoAutomatico: true,

      movimentacaoOriginal:
        movimentacao,

      /*
       * O ajuste positivo permanece separado
       * das parcelas documentais para preservar
       * a rastreabilidade.
       */
      movimentacaoConsiderada:
        movimentacao,

      receitaTotalConsiderada:
        ajustePositivo
          .receitaTotalConsiderada,

      conciliacao,
      resolucao,
      plano,

      ajusteConservador:
        ajustePositivo,

      erros: []
    }
  }

  /*
   * PGDAS < documentos:
   * redução conservadora das receitas
   * com tratamento específico de PIS/Cofins.
   */
  if (
    plano.tipoAjuste ===
    'reduzir_tratamento_especifico'
  ) {
    const politica =
      definirPoliticaRecuperacaoPisCofins({
        alterarIcms
      })

    const preparacaoReducao =
      prepararReducaoConservadoraPisCofins(
        movimentacao,
        politica,
        resolucao,
        plano
      )

    if (!preparacaoReducao) {
      return {
        status: 'preparacao_reducao_invalida',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        erros: [
          'Não foi possível preparar a redução conservadora.'
        ]
      }
    }

    if (
      !preparacaoReducao.capacidadeSuficiente
    ) {
      return {
        status: 'ajuste_negativo_sem_capacidade',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,

        erros: []
      }
    }

    const candidatas =
      prepararCandidatasReducaoPisCofins(
        preparacaoReducao
      )

    if (!candidatas) {
      return {
        status: 'candidatas_reducao_invalidas',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,

        erros: [
          'Não foi possível preparar as parcelas candidatas à redução.'
        ]
      }
    }

    /*
     * O e-Recuperador não documenta
     * prioridade automática entre as candidatas.
     *
     * Sem distribuição explícita,
     * o motor para aqui.
     */
    if (!Array.isArray(distribuicaoReducao)) {
      return {
        status: 'aguardando_distribuicao_reducao',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,
        candidatas,

        erros: []
      }
    }

    const validacaoDistribuicao =
      validarDistribuicaoReducaoPisCofins(
        candidatas,
        distribuicaoReducao
      )

    if (!validacaoDistribuicao.valida) {
      return {
        status: 'distribuicao_reducao_invalida',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,
        candidatas,
        validacaoDistribuicao,

        erros:
          validacaoDistribuicao.erros
      }
    }

    const aplicacaoReducao =
      aplicarDistribuicaoReducaoPisCofins(
        movimentacao,
        validacaoDistribuicao
      )

    if (!aplicacaoReducao.aplicado) {
      return {
        status: 'aplicacao_reducao_invalida',
        etapa: 'ajuste_conservador',

        prontoParaCalculo: false,
        podeGerarResultadoAutomatico: false,

        movimentacaoOriginal:
          movimentacao,

        conciliacao,
        resolucao,
        plano,
        politica,

        preparacaoReducao,
        candidatas,
        validacaoDistribuicao,
        aplicacaoReducao,

        erros:
          aplicacaoReducao.erros
      }
    }

    return {
      status: 'conferencia_concluida',
      etapa: 'pronto_para_calculo',

      prontoParaCalculo: true,
      podeGerarResultadoAutomatico: true,

      movimentacaoOriginal:
        movimentacao,

      movimentacaoConsiderada:
        aplicacaoReducao
          .movimentacaoAjustada,

      receitaTotalConsiderada:
        aplicacaoReducao
          .movimentacaoAjustada
          .receitaTotal,

      conciliacao,
      resolucao,
      plano,
      politica,

      ajusteConservador: {
        tipo:
          'reducao_conservadora_pis_cofins',

        preparacaoReducao,
        candidatas,
        validacaoDistribuicao,
        aplicacaoReducao,
      },

      erros: []
    }
  }

  return {
    status: 'tipo_ajuste_nao_suportado',
    etapa: 'ajuste_conservador',

    prontoParaCalculo: false,
    podeGerarResultadoAutomatico: false,

    movimentacaoOriginal:
      movimentacao,

    conciliacao,
    resolucao,
    plano,

    erros: [
      'O tipo de ajuste conservador não é suportado pelo motor.'
    ]
  }
}

export {
  executarApuracaoSimples,
}