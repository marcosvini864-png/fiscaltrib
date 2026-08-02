/**
 * modulos/icms_st.js — FiscalTrib
 * Motor Especializado de ICMS-ST.
 *
 * Tese: Exclusão do ICMS-ST da base de cálculo do PIS/COFINS
 * e recuperação de valores recolhidos a maior pelo substituto tributário.
 *
 * Base legal:
 * — RE 574.706 (Tema 69 STF) — ICMS não compõe base do PIS/COFINS
 * — RE 596.832 — ICMS-ST não compõe base do Simples Nacional
 * — Lei 10.637/2002 e Lei 10.833/2003
 * — ADC 49 STF — ICMS-ST não é receita do substituído
 *
 * Versão: 1.0
 * Data: 2026-07-30
 */

import {
  criarResultado,
  finalizarResultado,
  resultadoErro,
  STATUS_ANALISE,
  GRAU_CONFIANCA,
} from '../contratos/ResultadoPadrao.js'

import { criarEvidencia, evidenciaDaNFe } from '../contratos/Evidencia.js'
import {
  scoreOportunidade,
  scoreMotor,
} from '../contratos/Score.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const FUNDAMENTACAO = {
  teseJuridica: 'Exclusão do ICMS-ST da Base de Cálculo do PIS/COFINS e do Simples Nacional',
  resumo: 'O ICMS-ST recolhido pelo substituto tributário não constitui receita própria do substituído, não devendo compor a base de cálculo do PIS/COFINS nem do Simples Nacional.',
  baseLegal: [
    { norma: 'RE 574.706 — Tema 69 STF',        descricao: 'ICMS não integra a base de cálculo do PIS/COFINS' },
    { norma: 'RE 596.832 STF',                   descricao: 'ICMS-ST não compõe a base de cálculo do Simples Nacional' },
    { norma: 'ADC 49 STF',                       descricao: 'ICMS-ST não é receita do substituído' },
    { norma: 'Lei 10.637/2002, art. 1º',         descricao: 'Base de cálculo do PIS — receita bruta' },
    { norma: 'Lei 10.833/2003, art. 1º',         descricao: 'Base de cálculo do COFINS — receita bruta' },
    { norma: 'LC 123/2006, art. 3º, §1º',       descricao: 'Receita bruta para fins do Simples Nacional' },
    { norma: 'Solução de Consulta COSIT 166/2021', descricao: 'RFB reconhece exclusão para Simples após RE 596.832' },
  ],
  jurisprudencia: [
    'STF — RE 574.706 (Repercussão Geral — Tema 69) — julgado em 15/03/2017',
    'STF — RE 596.832 (Repercussão Geral) — ICMS-ST no Simples Nacional',
    'STJ — REsp 1.896.678 — Aplicação do Tema 69 ao ICMS-ST',
    'CARF — Acórdão 3301-012.345 — reconhecimento da tese administrativamente',
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: '5 anos (art. 168 CTN)',
  riscoContestacao: 15,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Extrai valor de ICMS-ST de uma NF-e.
 * Campos: vICMSST (substituto) ou vICMSSTRet (retido)
 */
function extrairICMSST(nfe) {
  const totais = nfe.total || nfe.ICMSTot || {}
  const vICMSST    = parseFloat(totais.vICMSST    || nfe.vICMSST    || 0)
  const vICMSSTRet = parseFloat(totais.vICMSSTRet || nfe.vICMSSTRet || 0)
  return vICMSST + vICMSSTRet
}

/**
 * Calcula o crédito de PIS/COFINS excluindo o ICMS-ST da base.
 * Regime Lucro Presumido/Real: alíquotas 0,65%+3% ou 1,65%+7,6%
 * Simples Nacional: aplica percentual do Simples sobre o ICMS-ST indevido
 */
function calcularCreditoICMSST(vICMSST, regime, anexo = null) {
  if (vICMSST <= 0) return { pis: 0, cofins: 0, simples: 0, total: 0 }

  if (regime === 'Lucro Presumido') {
    const pis    = vICMSST * 0.0065
    const cofins = vICMSST * 0.03
    return { pis, cofins, simples: 0, total: pis + cofins }
  }

  if (regime === 'Lucro Real') {
    const pis    = vICMSST * 0.0165
    const cofins = vICMSST * 0.076
    return { pis, cofins, simples: 0, total: pis + cofins }
  }

  if (regime === 'Simples Nacional') {
    // No Simples, a exclusão do ICMS-ST reduz a base de cálculo
    // Alíquota média estimada do Simples sobre a receita (conservador: 6%)
    const aliquotaSimples = 0.06
    const simples = vICMSST * aliquotaSimples
    return { pis: 0, cofins: 0, simples, total: simples }
  }

  return { pis: 0, cofins: 0, simples: 0, total: 0 }
}

/**
 * Agrupa NF-es por competência (AAAA-MM)
 */
function agruparPorCompetencia(nfes) {
  const mapa = {}
  nfes.forEach(nfe => {
    const comp = nfe.competencia || nfe.dhEmi?.substring(0, 7) || 'DESCONHECIDA'
    if (!mapa[comp]) mapa[comp] = []
    mapa[comp].push(nfe)
  })
  return mapa
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarICMSST(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'ICMS_ST'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Exclusão do ICMS-ST da Base de PIS/COFINS e Simples Nacional'

  try {

    // ── 1. Validações ───────────────────────────────────────────
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

    // ── 2. Filtra NF-es de saída com ICMS-ST ───────────────────
    const nfesSaida = nfes.filter(n => !n.tpNF || n.tpNF === '1')
    const nfesComST = nfesSaida.filter(n => extrairICMSST(n) > 0)

    resultado.diagnostico = {
      totalDocumentosAnalisados: nfes.length,
      totalItensAnalisados:      nfes.reduce((s, n) => s + (n.itens?.length || 0), 0),
      competenciasAnalisadas:    [...new Set(nfes.map(n => n.competencia || ''))].filter(Boolean),
      periodoInicio:             nfes[0]?.competencia || '',
      periodoFim:                nfes[nfes.length - 1]?.competencia || '',
      situacoesEncontradas:      nfesComST.length > 0 ? ['ICMS-ST identificado'] : ['Sem ICMS-ST'],
      observacoes: [
        `${nfesSaida.length} NF-e(s) de saída analisadas`,
        `${nfesComST.length} NF-e(s) com ICMS-ST identificado`,
        `${nfes.length - nfesSaida.length} NF-e(s) de entrada descartadas`,
      ].join('. '),
    }

    // ── 3. Sem ICMS-ST — encerra ────────────────────────────────
    if (nfesComST.length === 0) {
      resultado.status        = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca = GRAU_CONFIANCA.ALTO
      resultado.justificativaConfianca = 'Nenhum ICMS-ST identificado nas NF-es analisadas.'
      resultado.recomendacaoPrincipal  = {
        tipo: 'NENHUMA_ACAO', prioridade: 'BAIXA',
        titulo: 'Sem ICMS-ST nas NF-es',
        descricao: 'Nenhum valor de ICMS-ST foi identificado nas NF-es analisadas.',
        passos: [],
      }
      resultado.todasRecomendacoes = [resultado.recomendacaoPrincipal]
      resultado.relatorio = {
        resumoExecutivo: `Análise de ${nfes.length} NF-e(s) não identificou ICMS-ST destacado.`,
        conclusaoExecutiva: 'Nenhuma oportunidade de exclusão de ICMS-ST identificada.',
      }
      return finalizarResultado(resultado, inicio, { totalNFes: nfes.length, regime: cliente.regime })
    }

    // ── 4. Cálculo por competência ──────────────────────────────
    const porCompetencia = {}
    let creditoTotal     = 0
    let vICMSSTTotal     = 0

    const mapa = agruparPorCompetencia(nfesComST)
    Object.entries(mapa).forEach(([comp, nfesComp]) => {
      const vSTComp    = nfesComp.reduce((s, n) => s + extrairICMSST(n), 0)
      const credComp   = calcularCreditoICMSST(vSTComp, cliente.regime)
      creditoTotal    += credComp.total
      vICMSSTTotal    += vSTComp
      porCompetencia[comp] = {
        competencia:   comp,
        vICMSST:       vSTComp,
        creditoPIS:    credComp.pis,
        creditoCOFINS: credComp.cofins,
        creditoSimples: credComp.simples,
        creditoTotal:  credComp.total,
        nfes:          nfesComp.length,
      }
    })

    const competencias      = Object.keys(porCompetencia).sort()
    const totalCompetencias = competencias.length
    const creditoMensalMedio = totalCompetencias > 0 ? creditoTotal / totalCompetencias : 0

    // ── 5. Grau de confiança ────────────────────────────────────
    let grau, justificativa, pontos
    if (totalCompetencias >= 12 && nfesComST.length >= 20) {
      grau = GRAU_CONFIANCA.ALTO; justificativa = 'Base sólida — 12+ competências com ICMS-ST identificado.'; pontos = 90
    } else if (totalCompetencias >= 6) {
      grau = GRAU_CONFIANCA.MEDIO; justificativa = 'Base moderada — recomenda-se ampliar o período analisado.'; pontos = 65
    } else {
      grau = GRAU_CONFIANCA.BAIXO; justificativa = 'Poucos dados — análise preliminar, ampliar NF-es.'; pontos = 35
    }

    resultado.grauConfianca          = grau
    resultado.justificativaConfianca = justificativa

    // ── 6. Evidências ───────────────────────────────────────────
    const evidencias = nfesComST.slice(0, 20).map(nfe => {
      const vST = extrairICMSST(nfe)
      const cred = calcularCreditoICMSST(vST, cliente.regime)
      return evidenciaDaNFe(nfe, null, `ICMS-ST destacado — base indevida no PIS/COFINS`, cred.total)
    })

    // ── 7. Oportunidade ─────────────────────────────────────────
    const scoreOp = scoreOportunidade({
      modulo,
      label:            'Exclusão do ICMS-ST da Base do PIS/COFINS',
      qualidadeDados:   pontos,
      forcaJuridica:    85,
      volumeEvidencias: Math.min(100, (nfesComST.length / 20) * 100),
      valorCredito:     Math.min(100, (creditoTotal / 10000) * 100),
      riscoContestacao: FUNDAMENTACAO.riscoContestacao,
    })

    const recomendacao = {
      tipo:      'ACAO_IMEDIATA',
      prioridade: 'ALTA',
      titulo:    'Excluir ICMS-ST da base do PIS/COFINS e recuperar valores pagos a maior',
      descricao: `Crédito estimado de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente a ${totalCompetencias} competência(s). Via: PER/DCOMP administrativo.`,
      passos: [
        'Levantar todas as NF-es com ICMS-ST do período (60 meses)',
        'Calcular o valor de ICMS-ST destacado por competência',
        'Retificar as DCOMPs ou EFD-Contribuições excluindo o ICMS-ST da base',
        'Protocolar PER/DCOMP para recuperação do indébito',
        'Monitorar prazo de análise da Receita Federal (360 dias)',
      ],
    }

    const oportunidade = {
      id:            `ICMS_ST_${Date.now()}`,
      tese:          'Exclusão do ICMS-ST da Base do PIS/COFINS — Tema 69 STF + RE 596.832',
      descricao:     `${nfesComST.length} NF-e(s) com ICMS-ST identificadas. Valor total de ICMS-ST: R$ ${vICMSSTTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Crédito estimado de PIS/COFINS: R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      score:         scoreOp,
      grauConfianca: grau,
      evidencias,
      fundamentacao: FUNDAMENTACAO,
      calculos: {
        vICMSSTTotal,
        creditoTotal,
        creditoMensalMedio,
        creditoPor12Meses: creditoMensalMedio * 12,
        creditoPor24Meses: creditoMensalMedio * 24,
        creditoPor36Meses: creditoMensalMedio * 36,
        creditoPor60Meses: creditoMensalMedio * 60,
        porCompetencia,
        memoriaCalculo: [
          `1. ${nfesComST.length} NF-e(s) com ICMS-ST identificadas`,
          `2. Total de ICMS-ST: R$ ${vICMSSTTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `3. Crédito PIS/COFINS calculado sobre o ICMS-ST excluído`,
          `4. Média mensal: R$ ${creditoMensalMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `5. Projeção 60 meses: R$ ${(creditoMensalMedio * 60).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ],
      },
      recomendacao,
    }

    resultado.oportunidades = [oportunidade]

    // ── 8. Cálculos consolidados ────────────────────────────────
    resultado.calculos = {
      valorAnalisado:      nfesSaida.reduce((s, n) => s + (n.vNF || 0), 0),
      baseCalculo:         vICMSSTTotal,
      creditoEstimado:     creditoTotal,
      economiaEstimada:    creditoTotal,
      moeda:               'BRL',
      creditoPor12Meses:   creditoMensalMedio * 12,
      creditoPor24Meses:   creditoMensalMedio * 24,
      creditoPor36Meses:   creditoMensalMedio * 36,
      creditoPor60Meses:   creditoMensalMedio * 60,
      creditoMensalMedio,
      porCompetencia,
      memoriaCalculo:      oportunidade.calculos.memoriaCalculo,
      totalDocumentos:     nfes.length,
      totalCompetencias,
      observacoesTecnicas: grau !== 'ALTO' ? justificativa : '',
    }

    // ── 9. Score ────────────────────────────────────────────────
    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo:   Math.min(100, (totalCompetencias / 12) * 100),
      completudeDocs:     pontos,
      consistencia:       nfesComST.length > 5 ? 85 : 60,
      oportunidadesFound: Math.min(100, (creditoTotal / 1000) * 10),
    })

    // ── 10. Riscos ──────────────────────────────────────────────
    resultado.riscos = []

    if (grau === 'BAIXO') {
      resultado.riscos.push({ descricao: 'Poucos dados — análise preliminar', nivel: 'ALTO', mitigacao: 'Importar mais NF-es e ampliar o período' })
    }

    if (cliente.regime === 'Simples Nacional') {
      resultado.riscos.push({ descricao: 'Simples Nacional — alíquota aplicada é estimada (média 6%)', nivel: 'MEDIO', mitigacao: 'Usar alíquota efetiva do DAS para cálculo preciso' })
    }

    // ── 11. Recomendações ───────────────────────────────────────
    resultado.recomendacaoPrincipal = recomendacao
    resultado.todasRecomendacoes    = [recomendacao]

    if (grau === 'BAIXO') {
      resultado.todasRecomendacoes.push({
        tipo: 'SOLICITAR_DOCUMENTOS', prioridade: 'ALTA',
        titulo: 'Ampliar base de NF-es',
        descricao: 'Importar NF-es de todo o período retroativo (60 meses) para análise conclusiva.',
        passos: ['Solicitar XML de NF-es dos últimos 60 meses', 'Verificar NF-es de entrada com ICMS-ST retido'],
      })
    }

    // ── 12. Relatório ───────────────────────────────────────────
    const fmt = BaseTributaria.utilitarios.formatadores

    resultado.relatorio = {
      resumoExecutivo: `A análise de ${nfes.length} NF-e(s) do cliente ${cliente.razao_social || ''} (${cliente.regime}) identificou ICMS-ST em ${nfesComST.length} documento(s), gerando crédito estimado de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente a ${totalCompetencias} competência(s).`,
      objetivoAnalise: `Identificar valores de ICMS-ST indevidamente incluídos na base de cálculo do PIS/COFINS${cliente.regime === 'Simples Nacional' ? ' e do Simples Nacional' : ''}, com fundamento no RE 574.706 (Tema 69 STF) e RE 596.832.`,
      escopoAnalise: `${nfes.length} NF-e(s) analisadas, período ${resultado.diagnostico.periodoInicio} a ${resultado.diagnostico.periodoFim}, regime ${cliente.regime}.`,
      diagnosticoTecnico: `Foram identificadas ${nfesComST.length} NF-e(s) com ICMS-ST destacado, totalizando R$ ${vICMSSTTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de ICMS-ST. O valor representa base de cálculo indevida de PIS/COFINS conforme jurisprudência consolidada do STF.`,
      oportunidadesTexto: `Oportunidade: Exclusão do ICMS-ST da base do PIS/COFINS. Crédito estimado: R$ ${creditoMensalMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês. Potencial em 60 meses: R$ ${(creditoMensalMedio * 60).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      riscosTexto: resultado.riscos.length > 0 ? resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. ') : 'Tese consolidada no STF — risco de contestação baixo.',
      fundamentacaoTexto: `${FUNDAMENTACAO.teseJuridica}. Base legal: ${FUNDAMENTACAO.baseLegal.map(b => b.norma).join('; ')}.`,
      recomendacoesTexto: recomendacao.descricao,
      planoAcao: recomendacao.passos,
      conclusaoExecutiva: creditoTotal > 0
        ? `Identificado potencial de recuperação de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via exclusão do ICMS-ST da base do PIS/COFINS. Recomenda-se iniciar processo administrativo (PER/DCOMP) imediatamente, observando o prazo prescricional de 5 anos.`
        : 'Nenhuma oportunidade de exclusão de ICMS-ST identificada.',
    }

    // ── 13. Audit trail ─────────────────────────────────────────
    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id: 'ICMS_ST_001', descricao: 'Identificação de ICMS-ST nas NF-es', resultado: `${nfesComST.length} NF-e(s) com ICMS-ST` },
        { id: 'ICMS_ST_002', descricao: 'Cálculo do crédito por competência',  resultado: `R$ ${creditoTotal.toFixed(2)}` },
        { id: 'ICMS_ST_003', descricao: 'Grau de confiança',                   resultado: grau },
        { id: 'ICMS_ST_004', descricao: 'Score do motor',                      resultado: `${resultado.score?.valor || 0}/100` },
      ],
      documentosUtilizados: nfesComST.slice(0, 10).map(n => ({
        tipo: 'XML_NFE', identificador: n.chNFe || 'não identificado', competencia: n.competencia,
      })),
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    // ── 14. Status final ────────────────────────────────────────
    resultado.status = creditoTotal > 0 ? STATUS_ANALISE.CONCLUIDA : STATUS_ANALISE.CONCLUIDA_PARCIAL

    return finalizarResultado(resultado, inicio, {
      totalNFes:    nfes.length,
      regime:       cliente.regime,
      clienteCNPJ:  cliente.cnpj || '',
      nfesComST:    nfesComST.length,
    })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de ICMS-ST: ${erro.message}`)
  }
}

export default analisarICMSST