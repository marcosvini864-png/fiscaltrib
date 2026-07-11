/**
 * modulos/exclusao_icms.js — FiscalTrib
 * Motor Especializado de Exclusão do ICMS da Base de PIS/COFINS.
 *
 * Tese: RE 574.706 STF (Tema 69)
 * Aplicável: Lucro Presumido e Lucro Real
 *
 * Versão: 1.0
 * Data: 2026-07-11
 */

import {
  criarResultado,
  finalizarResultado,
  resultadoErro,
  STATUS_ANALISE,
  GRAU_CONFIANCA,
} from '../contratos/ResultadoPadrao.js'

import { evidenciaDaNFe } from '../contratos/Evidencia.js'

export async function analisarExclusaoICMS(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'EXCLUSAO_ICMS'
  const resultado = criarResultado(modulo)
  resultado.descricaoModulo = 'Exclusão do ICMS da Base de PIS/COFINS — Tema 69 STF'

  try {

    // ── 1. Validações iniciais ──────────────────────────────
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

    const regras = BaseTributaria.regras.exclusaoICMS

    // ── 2. Verifica elegibilidade do regime ─────────────────
    const elegibilidade = regras.verificarElegibilidadeRegime(cliente.regime)
    if (!elegibilidade.elegivel) {
      resultado.status            = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca     = GRAU_CONFIANCA.ALTO
      resultado.justificativaConfianca = elegibilidade.motivo
      resultado.oportunidades     = []
      resultado.relatorio.resumoExecutivo = elegibilidade.motivo
      resultado.relatorio.conclusaoExecutiva = elegibilidade.motivo
      return finalizarResultado(resultado, inicio, { totalNFes: nfes.length, regime: cliente.regime })
    }

    // ── 3. Diagnóstico ──────────────────────────────────────
    const metodo    = opcoes.metodo || 'DESTACADO'
    const modulacao = opcoes.modulacao || { tinhaPedido: false, dataPedido: null }

    const diagnostico = regras.gerarDiagnosticoExclusaoICMS(nfes, cliente.regime, modulacao)

    resultado.diagnostico = {
      totalDocumentosAnalisados: diagnostico.totalNFesAnalisadas,
      totalItensAnalisados:      diagnostico.totalNFesSaida,
      competenciasAnalisadas:    diagnostico.competencias,
      periodoInicio:             diagnostico.periodoInicio,
      periodoFim:                diagnostico.periodoFim,
      situacoesEncontradas:      diagnostico.situacoesEncontradas,
      observacoes: [
        `${diagnostico.totalNFesSaida} NF-e(s) de saída analisadas`,
        `${diagnostico.totalNFesComICMS} NF-e(s) com ICMS destacado`,
        `Total ICMS identificado: R$ ${diagnostico.totalICMSIdentificado.toFixed(2)}`,
        `Percentual ICMS sobre faturamento: ${diagnostico.percentualICMS}`,
        diagnostico.modulacao.obs,
      ].join('. '),
    }

    // ── 4. Verifica se há ICMS para excluir ─────────────────
    if (diagnostico.totalNFesComICMS === 0) {
      resultado.status            = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca     = GRAU_CONFIANCA.ALTO
      resultado.justificativaConfianca = 'Nenhuma NF-e com ICMS destacado identificada.'
      resultado.oportunidades     = []
      resultado.relatorio.resumoExecutivo = `Nenhuma NF-e com ICMS destacado identificada no período analisado.`
      resultado.relatorio.conclusaoExecutiva = 'Nenhuma oportunidade de exclusão do ICMS da base de PIS/COFINS identificada.'
      return finalizarResultado(resultado, inicio, { totalNFes: nfes.length, regime: cliente.regime })
    }

    // ── 5. Consolida créditos por competência ───────────────
    const consolidado = regras.consolidarCreditosExclusaoICMS(nfes, cliente.regime, metodo, modulacao)

    // ── 6. Grau de confiança ────────────────────────────────
    const confianca = regras.calcularGrauConfiancaExclusao(consolidado, metodo)
    resultado.grauConfianca          = confianca.grau
    resultado.justificativaConfianca = confianca.justificativa

    // ── 7. Evidências ────────────────────────────────────────
    const evidencias = []
    const nfesSaida  = nfes.filter(n => !n.tpNF || n.tpNF === '1')

    nfesSaida.forEach(nfe => {
      if ((nfe.vICMS || 0) <= 0) return
      const calc = regras.calcularCreditoNFeExclusao(nfe, cliente.regime, metodo)
      if (!calc.valido || calc.credito <= 0) return
      // Cria evidência no nível da NF-e (não item)
      const item = {
        ncm: '', cfop: '', cst: '', xProd: `ICMS destacado NF-e ${nfe.nNF || ''}`,
        vProd: nfe.vNF, vItemICMS: nfe.vICMS, vItemPIS: nfe.vPIS,
        vItemCOFINS: nfe.vCOFINS, vItemST: nfe.vST, vItemIPI: nfe.vIPI || 0,
        vBC: nfe.vICMS, pICMS: 0, vBCST: 0, pICMSST: 0,
        pPIS: 0, pCOFINS: 0, vBCPIS: 0, vBCCOFINS: 0,
      }
      const ev = evidenciaDaNFe(
        nfe, item,
        `ICMS de R$ ${nfe.vICMS.toFixed(2)} excluído da base de PIS/COFINS`,
        calc.credito
      )
      evidencias.push(ev)
    })

    // ── 8. Oportunidade ──────────────────────────────────────
    const scoreValor = regras.calcularScoreExclusaoICMS(consolidado, confianca)

    const aliq = cliente.regime === 'Lucro Real'
      ? { pis: 1.65, cofins: 7.60 }
      : { pis: 0.65, cofins: 3.00 }

    const oportunidade = {
      id:            `EXCL_ICMS_${Date.now()}`,
      tese:          'Exclusão do ICMS da Base de PIS/COFINS — Tema 69 STF',
      descricao:     `${diagnostico.totalNFesComICMS} NF-e(s) com ICMS destacado identificadas em ${consolidado.totalCompetencias} competência(s). ` +
                     `ICMS total excluível: R$ ${consolidado.totalICMSExcluido.toFixed(2)}. ` +
                     `Crédito de PIS (${aliq.pis}%) + COFINS (${aliq.cofins}%) sobre o ICMS excluído.`,
      score:         { valor: scoreValor, classificacao: scoreValor >= 80 ? 'Excelente' : scoreValor >= 60 ? 'Bom' : 'Regular', componentes: [] },
      grauConfianca: confianca.grau,
      evidencias:    evidencias.slice(0, 20),
      fundamentacao: {
        leis:        ['Lei 9.718/1998', 'LC 70/1991'],
        decisoes:    ['RE 574.706 STF (Tema 69)', 'Embargos de Declaração — 13/05/2021'],
        observacao:  metodo === 'DESTACADO'
          ? 'Usando ICMS destacado na NF-e — conforme entendimento do STF (maior valor).'
          : 'Usando ICMS recolhido — conforme entendimento da RFB (menor valor, menor risco de glosa).',
      },
      calculos: {
        totalICMSExcluido:   consolidado.totalICMSExcluido,
        baseCalculo:         consolidado.totalICMSExcluido,
        creditoTotal:        consolidado.creditoTotal,
        creditoMensalMedio:  consolidado.creditoMensalMedio,
        creditoPor12Meses:   consolidado.creditoPor12Meses,
        creditoPor24Meses:   consolidado.creditoPor24Meses,
        creditoPor36Meses:   consolidado.creditoPor36Meses,
        creditoPor60Meses:   consolidado.creditoPor60Meses,
        porCompetencia:      consolidado.porCompetencia,
        memoriaCalculo: [
          `1. Identificação de ${diagnostico.totalNFesComICMS} NF-e(s) de saída com ICMS destacado`,
          `2. Total de ICMS destacado: R$ ${consolidado.totalICMSExcluido.toFixed(2)}`,
          `3. Crédito PIS (${aliq.pis}%): R$ ${(consolidado.totalICMSExcluido * aliq.pis / 100).toFixed(2)}`,
          `4. Crédito COFINS (${aliq.cofins}%): R$ ${(consolidado.totalICMSExcluido * aliq.cofins / 100).toFixed(2)}`,
          `5. Crédito total: R$ ${consolidado.creditoTotal.toFixed(2)}`,
          `6. Média mensal: R$ ${consolidado.creditoMensalMedio.toFixed(2)}`,
          `7. Projeção 60 meses: R$ ${consolidado.creditoPor60Meses.toFixed(2)}`,
        ],
      },
      recomendacao: {
        titulo:      'Ingressar com pedido de restituição via PER/DCOMP ou ação judicial',
        prioridade:  'ALTA',
        via:         consolidado.periodo?.modulacaoAplicada ? 'ADMINISTRATIVA' : 'JUDICIAL',
        passos: [
          { ordem: 1, acao: 'Levantar todas as NF-es de saída do período retroativo', prazo: '30 dias' },
          { ordem: 2, acao: 'Apurar o ICMS destacado competência a competência', prazo: '15 dias' },
          { ordem: 3, acao: 'Calcular o crédito de PIS/COFINS sobre o ICMS excluído', prazo: '15 dias' },
          { ordem: 4, acao: 'Protocolar PER/DCOMP ou ajuizar ação de repetição do indébito', prazo: '30 dias' },
        ],
      },
    }

    resultado.oportunidades = [oportunidade]

    // ── 9. Cálculos consolidados ─────────────────────────────
    resultado.calculos = {
      valorAnalisado:      nfesSaida.reduce((s, n) => s + (n.vNF || 0), 0),
      baseCalculo:         consolidado.totalICMSExcluido,
      creditoEstimado:     consolidado.creditoTotal,
      economiaEstimada:    consolidado.creditoTotal,
      moeda:               'BRL',
      creditoPor12Meses:   consolidado.creditoPor12Meses,
      creditoPor24Meses:   consolidado.creditoPor24Meses,
      creditoPor36Meses:   consolidado.creditoPor36Meses,
      creditoPor60Meses:   consolidado.creditoPor60Meses,
      creditoMensalMedio:  consolidado.creditoMensalMedio,
      percentuaisAplicados: [
        { descricao: `PIS (${aliq.pis}%) sobre ICMS excluído`,    valor: aliq.pis },
        { descricao: `COFINS (${aliq.cofins}%) sobre ICMS excluído`, valor: aliq.cofins },
      ],
      porCompetencia:      consolidado.porCompetencia,
      memoriaCalculo:      oportunidade.calculos.memoriaCalculo,
      totalDocumentos:     nfes.length,
      totalItens:          diagnostico.totalNFesComICMS,
      totalCompetencias:   consolidado.totalCompetencias,
    }

    // ── 10. Score ────────────────────────────────────────────
    resultado.score = {
      valor:         scoreValor,
      classificacao: scoreValor >= 80 ? 'Excelente' : scoreValor >= 60 ? 'Bom' : 'Regular',
      componentes:   [],
      justificativa: `Score ${scoreValor}/100. Tese pacificada no STF (Tema 69). ${confianca.justificativa}`,
    }

    // ── 11. Riscos ───────────────────────────────────────────
    resultado.riscos = []
    if (metodo === 'RECOLHIDO') {
      resultado.riscos.push({
        descricao:  'Usando ICMS recolhido — RFB pode glosar diferença em relação ao destacado',
        nivel:      'MEDIO',
        mitigacao:  'Recomendado usar ICMS destacado via judicial para garantir maior valor',
      })
    }
    if (consolidado.periodo?.modulacaoAplicada) {
      resultado.riscos.push({
        descricao:  'Modulação aplicada — direito limitado a partir de 15/03/2017',
        nivel:      'BAIXO',
        mitigacao:  'Verificar se havia ação ou pedido anterior a 15/03/2017 para ampliar retroatividade',
      })
    }
    if (consolidado.totalCompetencias < 6) {
      resultado.riscos.push({
        descricao:  'Período analisado inferior a 6 meses — crédito pode estar subestimado',
        nivel:      'MEDIO',
        mitigacao:  'Importar NF-es de todo o período retroativo elegível',
      })
    }

    // ── 12. Relatório ────────────────────────────────────────
    const fmt = BaseTributaria.utilitarios.formatadores
    resultado.relatorio = {
      resumoExecutivo: `Identificada oportunidade de recuperação pela exclusão do ICMS da base de PIS/COFINS ` +
                       `(RE 574.706 — Tema 69 STF) para ${cliente.razao_social}. ` +
                       `Total de ICMS excluível: R$ ${consolidado.totalICMSExcluido.toFixed(2)}. ` +
                       `Crédito estimado: R$ ${consolidado.creditoTotal.toFixed(2)} ` +
                       `(projeção 60 meses: R$ ${consolidado.creditoPor60Meses.toFixed(2)}).`,
      objetivoAnalise:     `Identificar créditos de PIS/COFINS decorrentes da exclusão do ICMS da base de cálculo, conforme RE 574.706 STF (Tema 69), para empresa no regime de ${cliente.regime}.`,
      escopoAnalise:       `${diagnostico.totalNFesAnalisadas} NF-e(s) analisadas, período ${diagnostico.periodoInicio} a ${diagnostico.periodoFim}, ${diagnostico.totalCompetencias} competência(s).`,
      diagnosticoTecnico:  `${diagnostico.totalNFesComICMS} NF-e(s) com ICMS destacado identificadas. Total ICMS: R$ ${diagnostico.totalICMSIdentificado.toFixed(2)} (${diagnostico.percentualICMS} do faturamento). ${diagnostico.modulacao.obs}`,
      oportunidadesTexto:  `Exclusão do ICMS da base de PIS/COFINS — crédito estimado R$ ${consolidado.creditoMensalMedio.toFixed(2)}/mês, potencial 60 meses: R$ ${consolidado.creditoPor60Meses.toFixed(2)}.`,
      riscosTexto:         resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. ') || 'Nenhum risco relevante identificado.',
      fundamentacaoTexto:  'RE 574.706 STF (Tema 69): "O ICMS não compõe a base de cálculo para incidência do PIS e da COFINS." Embargos de declaração julgados em 13/05/2021 definiram uso do ICMS destacado.',
      conclusaoExecutiva:  `Recomenda-se ingresso imediato com PER/DCOMP ou ação judicial para recuperação de R$ ${consolidado.creditoTotal.toFixed(2)} em créditos de PIS/COFINS pela exclusão do ICMS (Tema 69 STF). Grau de confiança: ${confianca.grau}.`,
      planoAcao:           oportunidade.recomendacao.passos,
    }

    // ── 13. Status final ─────────────────────────────────────
    resultado.status = consolidado.creditoTotal > 0
      ? STATUS_ANALISE.CONCLUIDA
      : STATUS_ANALISE.CONCLUIDA_PARCIAL

    return finalizarResultado(resultado, inicio, {
      totalNFes:      nfes.length,
      regime:         cliente.regime,
      clienteCNPJ:    cliente.cnpj || '',
      totalComICMS:   diagnostico.totalNFesComICMS,
      creditoTotal:   consolidado.creditoTotal,
    })

  } catch (erro) {
    return resultadoErro(modulo, `Erro inesperado no Motor de Exclusão ICMS: ${erro.message}`)
  }
}

export default analisarExclusaoICMS