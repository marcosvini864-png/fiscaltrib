/**
 * modulos/monofasicos.js — FiscalTrib
 * Motor Especializado de Monofásicos.
 *
 * Este módulo é chamado pelo MotorInteligenciaTributaria e implementa
 * a análise completa de recuperação de PIS/COFINS no regime monofásico.
 *
 * CONTRATO:
 * — Recebe: nfes (array), cliente (object), opcoes (object), base (BaseTributaria)
 * — Retorna: ResultadoPadrao completo
 *
 * REGRA: Este arquivo nunca importa de componentes React ou do parser.
 * Recebe dados já parseados e usa a BaseTributaria para decidir.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import {
  criarResultado,
  finalizarResultado,
  resultadoErro,
  STATUS_ANALISE,
  GRAU_CONFIANCA,
} from '../contratos/ResultadoPadrao.js'

import { criarEvidencia, evidenciaDaNFe } from '../contratos/Evidencia.js'
import { fundamentacaoMonofasicos }        from '../contratos/Fundamentacao.js'
import {
  recomendacaoMonofasicos,
  recomendacaoSolicitarDocumentos,
  recomendacaoNenhumaAcao,
  ordenarRecomendacoes,
} from '../contratos/Recomendacao.js'

import {
  scoreOportunidade,
  scoreMotor,
  classificarValor,
} from '../contratos/Score.js'

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL DO MÓDULO
// ─────────────────────────────────────────────────────────────

/**
 * Analisa um conjunto de NF-es e identifica oportunidades
 * de recuperação de PIS/COFINS no regime monofásico.
 *
 * @param {Array}  nfes          - NF-es parseadas pelo parseXMLNFe
 * @param {object} cliente       - { razao_social, cnpj, regime }
 * @param {object} opcoes        - { metodo, dataPedido, tinhaPedido }
 * @param {object} BaseTributaria - Base de Conhecimento injetada pelo Motor
 * @returns {object} ResultadoPadrao
 */
export async function analisarMonofasicos(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio  = Date.now()
  const modulo  = 'MONOFASICOS'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Recuperação de PIS/COFINS — Regime Monofásico'

  try {

    // ── 1. Validações iniciais ──────────────────────────────────
    if (!nfes || nfes.length === 0) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Nenhuma NF-e fornecida para análise.'
      return finalizarResultado(resultado, inicio)
    }

    if (!cliente?.regime) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Regime tributário do cliente não informado.'
      return finalizarResultado(resultado, inicio)
    }

    const regras = BaseTributaria.regras.monofasicos

    // ── 2. Diagnóstico ──────────────────────────────────────────
    const diagnostico = regras.gerarDiagnostico(nfes, cliente.regime)

    resultado.diagnostico = {
      totalDocumentosAnalisados: diagnostico.totalNFesAnalisadas,
      totalItensAnalisados:      diagnostico.totalItens,
      competenciasAnalisadas:    diagnostico.competencias,
      periodoInicio:             diagnostico.periodoInicio,
      periodoFim:                diagnostico.periodoFim,
      situacoesEncontradas:      diagnostico.situacoesEncontradas,
      observacoes: [
        `${diagnostico.totalNFesSaida} NF-e(s) de saída analisadas`,
        `${diagnostico.totalNFesEntrada} NF-e(s) de entrada descartadas`,
        `${diagnostico.totalItensMonofasicos} item(ns) monofásico(s) identificados`,
        `NCMs encontrados: ${diagnostico.ncmsIdentificados.join(', ') || 'nenhum'}`,
        `Categorias: ${diagnostico.categorias.join(', ') || 'nenhuma'}`,
      ].join('. '),
    }

    // ── 3. Verifica se há produtos monofásicos ──────────────────
    if (diagnostico.totalItensMonofasicos === 0) {
      resultado.status = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca = GRAU_CONFIANCA.ALTO
      resultado.justificativaConfianca = 'Análise concluída — nenhum produto monofásico identificado.'

      const rec = recomendacaoNenhumaAcao(
        'Nenhum produto sujeito ao regime monofásico de PIS/COFINS foi identificado nas NF-es analisadas.'
      )
      resultado.recomendacaoPrincipal = rec
      resultado.todasRecomendacoes    = [rec]

      resultado.relatorio.resumoExecutivo  = `A análise de ${diagnostico.totalNFesAnalisadas} NF-e(s) do período ${diagnostico.periodoInicio} a ${diagnostico.periodoFim} não identificou produtos sujeitos ao regime monofásico de PIS/COFINS.`
      resultado.relatorio.objetivoAnalise  = BaseTributaria.utilitarios.formatadores.gerarObjetivoAnalise(modulo, cliente.regime)
      resultado.relatorio.escopoAnalise    = BaseTributaria.utilitarios.formatadores.gerarEscopoAnalise({ totalDocumentos: diagnostico.totalNFesAnalisadas, tipoDocumento: 'NF-e', periodoInicio: diagnostico.periodoInicio, periodoFim: diagnostico.periodoFim, regime: cliente.regime, totalCompetencias: diagnostico.totalCompetencias })
      resultado.relatorio.conclusaoExecutiva = 'Nenhuma oportunidade de recuperação de PIS/COFINS monofásico identificada.'

      return finalizarResultado(resultado, inicio, { totalNFes: nfes.length, regime: cliente.regime })
    }

    // ── 4. Cálculo dos créditos ─────────────────────────────────
    const consolidado = regras.consolidarCreditosPorCompetencia(nfes, cliente.regime)

    // ── 5. Grau de confiança ────────────────────────────────────
    const confianca = regras.calcularGrauConfianca(consolidado, nfes)

    resultado.grauConfianca          = confianca.grau
    resultado.justificativaConfianca = confianca.justificativa

    // ── 6. Evidências ───────────────────────────────────────────
    const evidencias = []
    const nfesSaida  = nfes.filter(n => !n.tpNF || n.tpNF === '1')

    nfesSaida.forEach(nfe => {
      const itensMonofasicos = (nfe.itens || []).filter(i => regras.isProdutoMonofasico(i))
      itensMonofasicos.forEach(item => {
        const calc = regras.calcularCreditoItem(item, cliente.regime)
        if (calc.credito > 0) {
          const ev = evidenciaDaNFe(
            nfe,
            item,
            `Produto monofásico — ${BaseTributaria.ncm.getCategoriaMonofasica(item.ncm) || 'categoria não identificada'}`,
            calc.credito
          )
          evidencias.push(ev)
        }
      })
    })

    // ── 7. Oportunidade principal ───────────────────────────────
    const fundamentacao = fundamentacaoMonofasicos()

    // Score da oportunidade
    const scoreOp = scoreOportunidade({
      modulo,
      label:           'Recuperação de PIS/COFINS — Monofásicos',
      qualidadeDados:  confianca.pontos,
      forcaJuridica:   95,  // tese pacificada
      volumeEvidencias: Math.min(100, (evidencias.length / 10) * 100),
      valorCredito:    Math.min(100, (consolidado.creditoTotal / 10000) * 100),
      riscoContestacao: 5,  // risco muito baixo
    })

    // Recomendação da oportunidade
    const recomendacao = recomendacaoMonofasicos(
      consolidado.creditoTotal,
      consolidado.totalCompetencias
    )

    // Oportunidade construída
    const oportunidade = {
      id:            `MONO_${Date.now()}`,
      tese:          'Receitas Monofásicas — PIS/COFINS Alíquota Zero',
      descricao:     `${diagnostico.totalItensMonofasicos} produto(s) com NCM monofásico identificados em ${consolidado.totalCompetencias} competência(s). PIS/COFINS recolhido indevidamente — revendedor tem alíquota zero conforme Lei 10.147/2000.`,
      score:         scoreOp,
      grauConfianca: confianca.grau,
      evidencias:    evidencias.slice(0, 20),  // limita para performance
      fundamentacao,
      calculos: {
        receitaMonofasica:   nfesSaida.flatMap(n => n.itens || []).filter(i => regras.isProdutoMonofasico(i)).reduce((s, i) => s + (i.vProd || 0), 0),
        baseCalculo:         consolidado.creditoTotal,
        creditoMensalMedio:  consolidado.creditoMensalMedio,
        creditoTotal:        consolidado.creditoTotal,
        creditoPor12Meses:   consolidado.creditoPor12Meses,
        creditoPor24Meses:   consolidado.creditoPor24Meses,
        creditoPor36Meses:   consolidado.creditoPor36Meses,
        creditoPor60Meses:   consolidado.creditoPor60Meses,
        porCompetencia:      consolidado.porCompetencia,
        memoriaCalculo: [
          `1. Identificação de ${diagnostico.totalItensMonofasicos} itens com NCM monofásico nas NF-es de saída`,
          `2. Verificação das alíquotas de PIS/COFINS destacadas por item`,
          `3. Soma dos valores de PIS/COFINS recolhidos indevidamente por competência`,
          `4. Cálculo da média mensal: R$ ${consolidado.creditoMensalMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `5. Projeção para 60 meses: R$ ${consolidado.creditoPor60Meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ],
      },
      recomendacao,
    }

    resultado.oportunidades = [oportunidade]

    // ── 8. Cálculos consolidados ────────────────────────────────
    resultado.calculos = {
      valorAnalisado:       nfesSaida.reduce((s, n) => s + (n.vNF || 0), 0),
      baseCalculo:          consolidado.creditoTotal,
      creditoEstimado:      consolidado.creditoTotal,
      economiaEstimada:     consolidado.creditoTotal,
      moeda:                'BRL',
      creditoPor12Meses:    consolidado.creditoPor12Meses,
      creditoPor24Meses:    consolidado.creditoPor24Meses,
      creditoPor36Meses:    consolidado.creditoPor36Meses,
      creditoPor60Meses:    consolidado.creditoPor60Meses,
      creditoMensalMedio:   consolidado.creditoMensalMedio,
      percentuaisAplicados: [
        { descricao: 'Alíquota zero revendedor (PIS)',    valor: 0 },
        { descricao: 'Alíquota zero revendedor (COFINS)', valor: 0 },
      ],
      porCompetencia:       consolidado.porCompetencia,
      memoriaCalculo:       oportunidade.calculos.memoriaCalculo,
      totalDocumentos:      nfes.length,
      totalItens:           diagnostico.totalItens,
      totalCompetencias:    consolidado.totalCompetencias,
      observacoesTecnicas:  confianca.grau !== 'ALTO'
        ? `Análise com confiabilidade ${confianca.grau}: ${confianca.justificativa}`
        : '',
    }

    // ── 9. Score do motor ───────────────────────────────────────
    const scoreM = scoreMotor({
      modulo,
      coberturaPeriodo:   Math.min(100, (consolidado.totalCompetencias / 12) * 100),
      completudeDocs:     confianca.pontos,
      consistencia:       evidencias.length > 0 ? 90 : 50,
      oportunidadesFound: Math.min(100, (consolidado.creditoTotal / 1000) * 10),
    })

    resultado.score = scoreM

    // ── 10. Riscos ──────────────────────────────────────────────
    resultado.riscos = []

    if (confianca.grau === 'BAIXO') {
      resultado.riscos.push({
        descricao:  'Dados insuficientes — crédito pode estar subestimado ou superestimado',
        nivel:      'ALTO',
        mitigacao:  'Importar mais NF-es e verificar se os valores de PIS/COFINS estão destacados',
      })
    }

    if (!nfes.some(n => n.tpNF)) {
      resultado.riscos.push({
        descricao:  'Tipo das NF-es (entrada/saída) não disponível — NF-es de entrada podem ter sido incluídas',
        nivel:      'MEDIO',
        mitigacao:  'Atualizar o parser XML para capturar o campo tpNF',
      })
    }

    if (diagnostico.totalItensMonofasicos > 0 && consolidado.creditoTotal === 0) {
      resultado.riscos.push({
        descricao:  'Produtos monofásicos identificados mas sem valor de PIS/COFINS destacado nas NF-es',
        nivel:      'MEDIO',
        mitigacao:  'Verificar se o fornecedor destacou corretamente PIS/COFINS nas NF-es de compra',
      })
    }

    // ── 11. Recomendações ───────────────────────────────────────
    const recomendacoes = [recomendacao]

    // Se há dados insuficientes — solicita documentos adicionais
    if (confianca.grau === 'BAIXO' || diagnostico.totalNFesAnalisadas < 12) {
      recomendacoes.push(recomendacaoSolicitarDocumentos(
        ['XMLs de NF-e de saída de todo o período (mínimo 12 meses)', 'PGDAS-D do período', 'DAS pagos no período'],
        'A base de dados é insuficiente para uma análise conclusiva.'
      ))
    }

    resultado.recomendacaoPrincipal = recomendacoes[0]
    resultado.todasRecomendacoes    = ordenarRecomendacoes(recomendacoes)

    // ── 12. Relatório executivo ─────────────────────────────────
    const fmt = BaseTributaria.utilitarios.formatadores

    resultado.relatorio = {
      resumoExecutivo: fmt.gerarResumoExecutivo({
        clienteNome:       cliente.razao_social,
        clienteRegime:     cliente.regime,
        motorNome:         'Monofásicos PIS/COFINS',
        totalOportunidades: 1,
        creditoTotal:      consolidado.creditoTotal,
        periodoInicio:     consolidado.periodoInicio,
        periodoFim:        consolidado.periodoFim,
        grauConfianca:     confianca.grau,
      }),

      objetivoAnalise: fmt.gerarObjetivoAnalise(modulo, cliente.regime),

      escopoAnalise: fmt.gerarEscopoAnalise({
        totalDocumentos:  diagnostico.totalNFesAnalisadas,
        tipoDocumento:    'NF-e',
        periodoInicio:    consolidado.periodoInicio,
        periodoFim:       consolidado.periodoFim,
        regime:           cliente.regime,
        totalCompetencias: consolidado.totalCompetencias,
      }),

      diagnosticoTecnico: [
        `Foram identificados ${diagnostico.totalItensMonofasicos} item(ns) com NCM monofásico`,
        `em ${diagnostico.ncmsIdentificados.length} NCM(s) distintos: ${diagnostico.ncmsIdentificados.slice(0, 5).join(', ')}.`,
        `Categorias: ${diagnostico.categorias.join(', ')}.`,
        `${diagnostico.totalNFesEntrada} NF-e(s) de entrada foram descartadas — apenas saídas geram crédito.`,
      ].join(' '),

      oportunidadesTexto: [
        `Oportunidade identificada: Receitas Monofásicas — PIS/COFINS Alíquota Zero.`,
        `Crédito estimado: R$ ${consolidado.creditoMensalMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês.`,
        `Potencial em 60 meses: R$ ${consolidado.creditoPor60Meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      ].join(' '),

      riscosTexto: resultado.riscos.length > 0
        ? resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. ')
        : 'Nenhum risco relevante identificado.',

      calculosTexto: fmt.formatarCalculosTexto(resultado.calculos),

      fundamentacaoTexto: fmt.gerarFundamentacaoTexto(fundamentacao),

      evidenciasTexto: fmt.formatarEvidenciasResumo(evidencias, 5),

      scoreTexto: `Score do Motor de Monofásicos: ${scoreM.valor}/100 (${scoreM.classificacao}). ` +
                  `Grau de confiabilidade: ${confianca.grau}. ${confianca.justificativa}`,

      recomendacoesTexto: fmt.gerarRecomendacoesTexto(resultado.todasRecomendacoes),

      planoAcao: recomendacao.passos || [],

      conclusaoExecutiva: fmt.gerarConclusaoExecutiva({
        totalOportunidades: 1,
        creditoTotal:       consolidado.creditoTotal,
        grauConfianca:      confianca.grau,
        nivelRisco:         resultado.riscos.length > 0 ? resultado.riscos[0].nivel : 'BAIXO',
        via:                'ADMINISTRATIVA',
        prazoRetroativo:    '5 anos contados do pedido administrativo',
      }),
    }

    // ── 13. Trilha de auditoria ─────────────────────────────────
    resultado.auditTrail = {
      motoresExecutados:    [modulo],
      regrasAplicadas: [
        { id: 'MONO_NCM_001', descricao: 'Verificação de NCM monofásico via Base NCM',           resultado: `${diagnostico.totalItensMonofasicos} itens identificados` },
        { id: 'MONO_CALC_001', descricao: 'Cálculo do crédito por item e por competência',        resultado: `R$ ${consolidado.creditoTotal.toFixed(2)} total` },
        { id: 'MONO_CONF_001', descricao: 'Cálculo do grau de confiança',                         resultado: confianca.grau },
        { id: 'MONO_SCORE_001', descricao: 'Cálculo do score do motor',                           resultado: `${scoreM.valor}/100` },
      ],
      documentosUtilizados: nfes.slice(0, 10).map(n => ({
        tipo:         'XML_NFE',
        identificador: n.chNFe || n.arquivo || 'não identificado',
        competencia:  n.competencia,
      })),
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes:        [],
    }

    // ── 14. Status final ────────────────────────────────────────
    resultado.status = consolidado.creditoTotal > 0
      ? STATUS_ANALISE.CONCLUIDA
      : STATUS_ANALISE.CONCLUIDA_PARCIAL

    return finalizarResultado(resultado, inicio, {
      totalNFes:         nfes.length,
      regime:            cliente.regime,
      clienteCNPJ:       cliente.cnpj || '',
      totalMonofasicos:  diagnostico.totalItensMonofasicos,
    })

  } catch (erro) {
    return resultadoErro(modulo, `Erro inesperado no Motor de Monofásicos: ${erro.message}`)
  }
}

export default analisarMonofasicos