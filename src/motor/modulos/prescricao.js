/**
 * modulos/prescricao.js — FiscalTrib
 * Motor de Prescrição e Prescrição Intercorrente.
 *
 * Teses:
 * 1. Prescrição ordinária — crédito tributário prescrito após 5 anos
 *    do despacho de citação (art. 174 CTN)
 * 2. Prescrição intercorrente — prescrição durante a execução fiscal
 *    por inércia da Fazenda (art. 40 Lei 6.830/1980 + Tema 566 STJ)
 * 3. Prescrição do redirecionamento — sócios só podem ser
 *    redirecionados em até 5 anos após a citação da PJ
 *    (Tema 444 STJ)
 *
 * Base legal:
 * — Art. 174 CTN — prescrição do crédito tributário
 * — Art. 40 Lei 6.830/1980 — prescrição intercorrente na execução fiscal
 * — RE 636.562 STF (Tema 390) — prescrição intercorrente constitucional
 * — Tema 566 STJ — prazo e marco inicial da prescrição intercorrente
 * — Tema 444 STJ — prescrição do redirecionamento
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

import { scoreOportunidade, scoreMotor } from '../contratos/Score.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const PRAZO_PRESCRICAO_ANOS      = 5
const PRAZO_INTERCORRENTE_ANOS   = 5
const PRAZO_REDIRECIONAMENTO_ANOS = 5

const FUNDAMENTACAO = {
  teseJuridica: 'Prescrição Tributária — Ordinária, Intercorrente e Redirecionamento',
  resumo: 'O crédito tributário prescreve em 5 anos. A prescrição intercorrente ocorre durante a execução fiscal quando a Fazenda permanece inerte por mais de 5 anos. O redirecionamento aos sócios também prescreve em 5 anos a partir da citação da pessoa jurídica.',
  baseLegal: [
    { norma: 'Art. 174 CTN',                     descricao: 'Prescrição do crédito tributário — 5 anos' },
    { norma: 'Art. 40 Lei 6.830/1980',            descricao: 'Prescrição intercorrente na execução fiscal' },
    { norma: 'RE 636.562 STF (Tema 390)',         descricao: 'Constitucionalidade da prescrição intercorrente' },
    { norma: 'Tema 566 STJ',                      descricao: 'Marco inicial e prazo da prescrição intercorrente' },
    { norma: 'Tema 444 STJ',                      descricao: 'Prescrição do redirecionamento aos sócios' },
    { norma: 'Súmula 106 STJ',                    descricao: 'Citação nos autos da execução fiscal' },
    { norma: 'LC 118/2005',                       descricao: 'Marco inicial da prescrição — extinção do crédito' },
  ],
  jurisprudencia: [
    'STF — RE 636.562 (Tema 390) — prescrição intercorrente é constitucional',
    'STJ — Tema 566 — prazo de 1 ano de suspensão + 5 anos de prescrição intercorrente',
    'STJ — Tema 444 — redirecionamento prescreve em 5 anos da citação da PJ',
    'STJ — Súmula 314 — prescrição intercorrente na execução fiscal',
  ],
  via: 'JUDICIAL',
  prazoRetroativo: 'Verificar data de ajuizamento e última movimentação',
  riscoContestacao: 25,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

function anosEntre(dataInicio, dataFim) {
  const d1 = new Date(dataInicio)
  const d2 = new Date(dataFim)
  return (d2 - d1) / (1000 * 60 * 60 * 24 * 365.25)
}

function adicionarAnos(data, anos) {
  const d = new Date(data)
  d.setFullYear(d.getFullYear() + anos)
  return d.toISOString().substring(0, 10)
}

function formatarData(data) {
  if (!data) return 'não informada'
  return new Date(data).toLocaleDateString('pt-BR')
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarPrescricao(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'PRESCRICAO'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Prescrição Tributária — Ordinária, Intercorrente e Redirecionamento'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    // opcoes.dividas = [{ id, numero, valor, dataConstituicao, dataCitacao,
    //                     dataUltimaMovimentacao, redirecionado, dataRedirecionamento }]
    const dividas = opcoes.dividas || []

    if (dividas.length === 0) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Informe as dívidas em opcoes.dividas para análise de prescrição.'
      return finalizarResultado(resultado, inicio)
    }

    const hoje = new Date().toISOString().substring(0, 10)

    resultado.diagnostico = {
      totalDocumentosAnalisados: dividas.length,
      totalItensAnalisados:      dividas.length,
      competenciasAnalisadas:    [],
      periodoInicio:             '',
      periodoFim:                hoje,
      situacoesEncontradas:      ['Dívidas fiscais analisadas para prescrição'],
      observacoes:               `${dividas.length} dívida(s) submetidas à análise de prescrição.`,
    }

    // ── 2. Analisa cada dívida ──────────────────────────────────
    const oportunidades  = []
    let creditoTotal     = 0
    const analises       = []

    dividas.forEach((divida, idx) => {
      const {
        id                    = `DIV_${idx}`,
        numero                = `Processo ${idx + 1}`,
        valor                 = 0,
        dataConstituicao      = null,
        dataCitacao           = null,
        dataUltimaMovimentacao = null,
        redirecionado         = false,
        dataRedirecionamento  = null,
      } = divida

      const analise = {
        id, numero, valor,
        prescricaoOrdinaria:    { prescrita: false, dataLimite: null, anosDecorridos: 0, obs: '' },
        prescricaoIntercorrente:{ prescrita: false, dataLimite: null, anosDecorridos: 0, obs: '' },
        prescricaoRedirecionamento: { prescrita: false, dataLimite: null, anosDecorridos: 0, obs: '' },
        algumaPrescrita: false,
        economiaTotal: 0,
      }

      // PRESCRIÇÃO ORDINÁRIA — 5 anos do despacho de citação (art. 174 CTN)
      if (dataCitacao) {
        const dataLimite  = adicionarAnos(dataCitacao, PRAZO_PRESCRICAO_ANOS)
        const anosDecorr  = anosEntre(dataCitacao, hoje)
        const prescrita   = anosDecorr >= PRAZO_PRESCRICAO_ANOS && !dataUltimaMovimentacao

        analise.prescricaoOrdinaria = {
          prescrita,
          dataLimite,
          anosDecorridos: anosDecorr,
          obs: prescrita
            ? `PRESCRITA — ${anosDecorr.toFixed(1)} anos desde a citação (${formatarData(dataCitacao)}) sem movimentação válida.`
            : `Em curso — ${anosDecorr.toFixed(1)} de ${PRAZO_PRESCRICAO_ANOS} anos. Vence em ${formatarData(dataLimite)}.`,
        }

        if (prescrita) {
          analise.algumaPrescrita = true
          analise.economiaTotal  += valor
        }
      } else if (dataConstituicao) {
        analise.prescricaoOrdinaria.obs = `Citação não informada. Data de constituição: ${formatarData(dataConstituicao)}. Verificar se já houve citação válida.`
      }

      // PRESCRIÇÃO INTERCORRENTE — 1 ano suspensão + 5 anos inércia (art. 40 LEF + Tema 566)
      if (dataUltimaMovimentacao) {
        const dataLimiteInter = adicionarAnos(dataUltimaMovimentacao, PRAZO_INTERCORRENTE_ANOS + 1)
        const anosDecorrInter = anosEntre(dataUltimaMovimentacao, hoje)
        const prescritaInter  = anosDecorrInter >= (PRAZO_INTERCORRENTE_ANOS + 1)

        analise.prescricaoIntercorrente = {
          prescrita:     prescritaInter,
          dataLimite:    dataLimiteInter,
          anosDecorridos: anosDecorrInter,
          obs: prescritaInter
            ? `INTERCORRENTE PRESCRITA — ${anosDecorrInter.toFixed(1)} anos desde a última movimentação (${formatarData(dataUltimaMovimentacao)}).`
            : `Em curso — ${anosDecorrInter.toFixed(1)} de ${PRAZO_INTERCORRENTE_ANOS + 1} anos. Vence em ${formatarData(dataLimiteInter)}.`,
        }

        if (prescritaInter && !analise.algumaPrescrita) {
          analise.algumaPrescrita = true
          analise.economiaTotal  += valor
        }
      }

      // PRESCRIÇÃO DO REDIRECIONAMENTO — 5 anos da citação da PJ (Tema 444 STJ)
      if (redirecionado && dataCitacao) {
        const dataLimiteRedir = adicionarAnos(dataCitacao, PRAZO_REDIRECIONAMENTO_ANOS)
        const anosDecorrRedir = anosEntre(dataCitacao, hoje)
        const prescritaRedir  = anosDecorrRedir >= PRAZO_REDIRECIONAMENTO_ANOS

        analise.prescricaoRedirecionamento = {
          prescrita:     prescritaRedir,
          dataLimite:    dataLimiteRedir,
          anosDecorridos: anosDecorrRedir,
          obs: prescritaRedir
            ? `REDIRECIONAMENTO PRESCRITO — ${anosDecorrRedir.toFixed(1)} anos desde a citação da PJ (${formatarData(dataCitacao)}). Sócios não podem ser executados.`
            : `Em curso — ${anosDecorrRedir.toFixed(1)} de ${PRAZO_REDIRECIONAMENTO_ANOS} anos. Vence em ${formatarData(dataLimiteRedir)}.`,
        }
      }

      analises.push(analise)

      // Gera oportunidade se há prescrição
      if (analise.algumaPrescrita) {
        creditoTotal += analise.economiaTotal

        const tiposPrescritos = [
          analise.prescricaoOrdinaria.prescrita     ? 'Prescrição Ordinária'     : null,
          analise.prescricaoIntercorrente.prescrita ? 'Prescrição Intercorrente' : null,
          analise.prescricaoRedirecionamento.prescrita ? 'Prescrição do Redirecionamento' : null,
        ].filter(Boolean)

        const scoreOp = scoreOportunidade({
          modulo, label: `Prescrição — ${numero}`,
          qualidadeDados: dataCitacao ? 85 : 55,
          forcaJuridica: 88,
          volumeEvidencias: 70,
          valorCredito: Math.min(100, (analise.economiaTotal / 50000) * 100),
          riscoContestacao: FUNDAMENTACAO.riscoContestacao,
        })

        oportunidades.push({
          id:            `PRESC_${id}_${Date.now()}`,
          tese:          `Prescrição Tributária — ${tiposPrescritos.join(' + ')}`,
          descricao:     `Dívida ${numero} (R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}): ${tiposPrescritos.join(' e ')} identificada(s).`,
          score:         scoreOp,
          grauConfianca: dataCitacao ? GRAU_CONFIANCA.ALTO : GRAU_CONFIANCA.MEDIO,
          evidencias:    [],
          fundamentacao: FUNDAMENTACAO,
          calculos: {
            valorDivida:   valor,
            creditoTotal:  analise.economiaTotal,
            economiaTotal: analise.economiaTotal,
            creditoMensalMedio: analise.economiaTotal / 12,
            creditoPor12Meses: analise.economiaTotal,
            creditoPor60Meses: analise.economiaTotal,
            analise,
            memoriaCalculo: [
              `Dívida: ${numero} — R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              analise.prescricaoOrdinaria.obs,
              analise.prescricaoIntercorrente.obs,
              analise.prescricaoRedirecionamento.obs,
            ].filter(Boolean),
          },
          recomendacao: {
            tipo:       'ACAO_IMEDIATA',
            prioridade: 'URGENTE',
            titulo:     `Arguir prescrição nos autos — ${numero}`,
            descricao:  `${tiposPrescritos.join(' e ')} identificada(s). Extinção do crédito de R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            passos: [
              'Levantar todos os autos da execução fiscal (petições, certidões, despachos)',
              'Identificar a data do despacho de citação e da última movimentação válida',
              'Calcular precisamente o prazo prescricional com base nas datas apuradas',
              'Protocolar petição de extinção por prescrição (art. 156, V, CTN)',
              'Requerer certidão negativa após extinção do crédito',
            ],
          },
        })
      }
    })

    // ── 3. Sem prescrição ───────────────────────────────────────
    if (oportunidades.length === 0) {
      resultado.status        = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca = GRAU_CONFIANCA.MEDIO
      resultado.justificativaConfianca = 'Nenhuma prescrição identificada nas dívidas analisadas.'
      resultado.recomendacaoPrincipal = {
        tipo: 'MONITORAMENTO', prioridade: 'MEDIA',
        titulo: 'Monitorar prazos prescricionais',
        descricao: `${analises.length} dívida(s) analisada(s). Nenhuma prescrição consumada. Monitorar as datas limite.`,
        passos: analises.map(a => {
          const prox = [
            a.prescricaoOrdinaria.dataLimite,
            a.prescricaoIntercorrente.dataLimite,
          ].filter(Boolean).sort()[0]
          return prox ? `${a.numero}: próximo vencimento em ${formatarData(prox)}` : `${a.numero}: verificar datas`
        }),
      }
      resultado.todasRecomendacoes = [resultado.recomendacaoPrincipal]
      resultado.calculos = { creditoEstimado: 0, economiaEstimada: 0, moeda: 'BRL', totalDocumentos: dividas.length }
      resultado.relatorio = {
        resumoExecutivo: `${dividas.length} dívida(s) analisada(s). Nenhuma prescrição identificada — monitorar prazos.`,
        conclusaoExecutiva: 'Sem prescrição consumada. Acompanhar o andamento processual.',
      }
      return finalizarResultado(resultado, inicio, { regime: cliente.regime, totalDividas: dividas.length })
    }

    // ── 4. Consolida ────────────────────────────────────────────
    resultado.grauConfianca          = GRAU_CONFIANCA.ALTO
    resultado.justificativaConfianca = `${oportunidades.length} prescrição(ões) identificada(s) com base nas datas informadas.`
    resultado.oportunidades          = oportunidades

    const creditoMensalMedio = creditoTotal / 12

    resultado.calculos = {
      valorAnalisado:    dividas.reduce((s, d) => s + (d.valor || 0), 0),
      baseCalculo:       creditoTotal,
      creditoEstimado:   creditoTotal,
      economiaEstimada:  creditoTotal,
      moeda:             'BRL',
      creditoPor12Meses: creditoTotal,
      creditoPor24Meses: creditoTotal,
      creditoPor36Meses: creditoTotal,
      creditoPor60Meses: creditoTotal,
      creditoMensalMedio,
      totalDocumentos:   dividas.length,
      totalCompetencias: 0,
      memoriaCalculo:    oportunidades.flatMap(o => o.calculos.memoriaCalculo),
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo:   80,
      completudeDocs:     dividas.every(d => d.dataCitacao) ? 90 : 60,
      consistencia:       85,
      oportunidadesFound: Math.min(100, (oportunidades.length / dividas.length) * 100),
    })

    resultado.riscos = [
      { descricao: 'Causa interruptiva não identificada pode invalidar a prescrição', nivel: 'ALTO', mitigacao: 'Verificar íntegra dos autos — petições e despachos de citação' },
      { descricao: 'Fazenda pode arguir causa suspensiva não informada', nivel: 'MEDIO', mitigacao: 'Levantar histórico completo do processo antes de protocolar' },
    ]

    resultado.recomendacaoPrincipal = oportunidades[0].recomendacao
    resultado.todasRecomendacoes    = oportunidades.map(o => o.recomendacao)

    resultado.relatorio = {
      resumoExecutivo:    `${oportunidades.length} prescrição(ões) identificada(s) em ${dividas.length} dívida(s) analisada(s). Total extinguível: R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      objetivoAnalise:    'Identificar créditos tributários prescritos — ordinária, intercorrente e redirecionamento.',
      escopoAnalise:      `${dividas.length} dívida(s) fiscal(is) analisada(s). Data-base: ${formatarData(hoje)}.`,
      diagnosticoTecnico: oportunidades.map(o => o.descricao).join(' | '),
      oportunidadesTexto: `${oportunidades.length} prescrição(ões) — potencial de extinção de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      riscosTexto:        resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: `Art. 174 CTN, Art. 40 LEF, Tema 566 STJ, Tema 444 STJ.`,
      recomendacoesTexto: oportunidades.map(o => o.recomendacao.titulo).join(' | '),
      planoAcao:          oportunidades[0].recomendacao.passos,
      conclusaoExecutiva: `Arguir extinção imediatamente. Crédito extinguível: R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id: 'PRESC_001', descricao: 'Prescrição ordinária — art. 174 CTN',        resultado: `${analises.filter(a => a.prescricaoOrdinaria.prescrita).length} prescrita(s)` },
        { id: 'PRESC_002', descricao: 'Prescrição intercorrente — art. 40 LEF',     resultado: `${analises.filter(a => a.prescricaoIntercorrente.prescrita).length} prescrita(s)` },
        { id: 'PRESC_003', descricao: 'Prescrição redirecionamento — Tema 444 STJ', resultado: `${analises.filter(a => a.prescricaoRedirecionamento.prescrita).length} prescrita(s)` },
      ],
      documentosUtilizados: dividas.map(d => ({ tipo: 'EXECUCAO_FISCAL', identificador: d.numero || d.id, competencia: '' })),
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, { regime: cliente.regime, totalDividas: dividas.length, prescricoes: oportunidades.length })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de Prescrição: ${erro.message}`)
  }
}

export default analisarPrescricao