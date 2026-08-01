/**
 * modulos/divida_ativa.js — e-FiscalTribe
 * Motor de Dívida Ativa — Orquestrador de CDAs.
 *
 * Este módulo orquestra os sub-motores:
 * — PRESCRICAO  → verifica prescrição ordinária e intercorrente
 * — DECADENCIA  → verifica decadência dos lançamentos
 * — CAPAG       → calcula capacidade de pagamento
 * — TRANSACAO   → simula condições de negociação
 *
 * Entradas aceitas:
 * — CDAs importadas via ImportarCDA.jsx (Groq/Gemini)
 * — Relatório SISPAR
 * — Dados manuais via opcoes
 *
 * CONTRATO:
 * — Recebe: nfes (não usado aqui), cliente, opcoes, BaseTributaria
 * — opcoes.cdas = [{ numero, tributo, competencia, valor, dataInscricao,
 *                    dataAjuizamento, dataUltimaMovimentacao, situacao }]
 * — opcoes.financeiro = { totalDivida, faturamentoAnual, faturamentoMensal,
 *                          bensPenhoraveis, emRecuperacao }
 * — Retorna: ResultadoPadrao completo com análise consolidada
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

// Sub-motores
import { analisarPrescricao } from './prescricao.js'
import { analisarDecadencia } from './decadencia.js'
import { analisarCAPAG }      from './capag.js'
import { analisarTransacao }  from './transacao.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const FUNDAMENTACAO = {
  teseJuridica: 'Análise Integrada de Dívida Ativa — Prescrição, Decadência, CAPAG e Transação',
  resumo: 'Análise completa de CDAs inscritas em Dívida Ativa: verificação de prescrição e decadência para extinção de créditos indevidos, cálculo do CAPAG e simulação das melhores condições de transação com a PGFN.',
  baseLegal: [
    { norma: 'Art. 174 CTN',              descricao: 'Prescrição do crédito tributário' },
    { norma: 'Art. 150 e 173 CTN',        descricao: 'Decadência do lançamento tributário' },
    { norma: 'Art. 40 Lei 6.830/1980',    descricao: 'Prescrição intercorrente na execução fiscal' },
    { norma: 'Lei 13.988/2020',           descricao: 'Transação Tributária federal' },
    { norma: 'Portaria PGFN 6.757/2022', descricao: 'CAPAG e condições de transação' },
    { norma: 'Tema 566 STJ',              descricao: 'Marco inicial da prescrição intercorrente' },
    { norma: 'Tema 444 STJ',              descricao: 'Prescrição do redirecionamento aos sócios' },
  ],
  jurisprudencia: [
    'STF — RE 636.562 (Tema 390) — prescrição intercorrente constitucional',
    'STF — RE 556.664 — decadência e prescrição apenas por LC',
    'STJ — Tema 566 — prazo da prescrição intercorrente',
    'STJ — Tema 444 — prescrição do redirecionamento',
    'STJ — Súmula 314 — prescrição intercorrente na execução fiscal',
  ],
  via: 'ADMINISTRATIVA_JUDICIAL',
  prazoRetroativo: 'Verificar data de cada CDA',
  riscoContestacao: 20,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Converte CDA para formato esperado pelo Motor de Prescrição.
 */
function cdaParaDivida(cda, idx) {
  return {
    id:                     cda.numero || `CDA_${idx}`,
    numero:                 cda.numero || `CDA ${idx + 1}`,
    valor:                  parseFloat(cda.valorTotal || cda.valor || 0),
    dataConstituicao:       cda.dataInscricao || null,
    dataCitacao:            cda.dataAjuizamento || null,
    dataUltimaMovimentacao: cda.dataUltimaMovimentacao || null,
    redirecionado:          cda.redirecionado || false,
    dataRedirecionamento:   cda.dataRedirecionamento || null,
  }
}

/**
 * Converte CDA para formato esperado pelo Motor de Decadência.
 */
function cdaParaLancamento(cda, idx) {
  return {
    id:              cda.numero || `CDA_${idx}`,
    numero:          cda.numero || `CDA ${idx + 1}`,
    tributo:         cda.tributo || cda.tipoTributo || '',
    valor:           parseFloat(cda.valorTotal || cda.valor || 0),
    dataFatoGerador: cda.competencia
      ? `${cda.competencia}-01`
      : cda.dataFatoGerador || null,
    dataLancamento:  cda.dataInscricao || null,
    dolo:            cda.dolo || false,
  }
}

/**
 * Classifica a situação de cada CDA após a análise.
 */
function classificarCDA(cda, resultPrescricao, resultDecadencia) {
  const numCDA    = cda.numero
  const prescrita = resultPrescricao?.oportunidades?.some(o =>
    o.id?.includes(numCDA) || o.descricao?.includes(numCDA)
  )
  const decadente = resultDecadencia?.oportunidades?.some(o =>
    o.id?.includes(numCDA) || o.descricao?.includes(numCDA)
  )

  if (decadente)  return { status: 'DECADENTE',  label: '🔴 Decadente — lançamento inválido',          prioridade: 1 }
  if (prescrita)  return { status: 'PRESCRITA',  label: '🟠 Prescrita — crédito extinto',              prioridade: 2 }
  return           { status: 'ATIVA',    label: '🟡 Ativa — verificar transação',             prioridade: 3 }
}

/**
 * Formata valor monetário.
 */
function fmtVal(v) {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarDividaAtiva(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'DIVIDA_ATIVA'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Análise Integrada de Dívida Ativa — Prescrição, Decadência, CAPAG e Transação'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    const cdas       = opcoes.cdas       || []
    const financeiro = opcoes.financeiro || {}

    if (cdas.length === 0 && !financeiro.totalDivida) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Informe as CDAs em opcoes.cdas ou o total da dívida em opcoes.financeiro.totalDivida.'
      return finalizarResultado(resultado, inicio)
    }

    // ── 2. Diagnóstico inicial ──────────────────────────────────
    const totalDivida = financeiro.totalDivida
      || cdas.reduce((s, c) => s + parseFloat(c.valorTotal || c.valor || 0), 0)

    const competencias = [...new Set(cdas.map(c => c.competencia).filter(Boolean))].sort()

    resultado.diagnostico = {
      totalDocumentosAnalisados: cdas.length,
      totalItensAnalisados:      cdas.length,
      competenciasAnalisadas:    competencias,
      periodoInicio:             competencias[0]  || '',
      periodoFim:                competencias[competencias.length - 1] || '',
      situacoesEncontradas:      [`${cdas.length} CDA(s) identificadas — Dívida total: R$ ${fmtVal(totalDivida)}`],
      observacoes: [
        `${cdas.length} CDA(s) analisadas`,
        `Total da dívida: R$ ${fmtVal(totalDivida)}`,
        `Tributos: ${[...new Set(cdas.map(c => c.tributo).filter(Boolean))].join(', ') || 'não informados'}`,
        `Competências: ${competencias.join(', ') || 'não informadas'}`,
      ].join('. '),
    }

    // ── 3. Executa sub-motores em paralelo ──────────────────────
    const [
      resultPrescricao,
      resultDecadencia,
      resultCAPAG,
      resultTransacao,
    ] = await Promise.all([

      // PRESCRICAO
      cdas.length > 0
        ? analisarPrescricao([], cliente, {
            dividas: cdas.map(cdaParaDivida),
          }, BaseTributaria)
        : Promise.resolve(null),

      // DECADENCIA
      cdas.length > 0
        ? analisarDecadencia([], cliente, {
            lancamentos: cdas.map(cdaParaLancamento),
          }, BaseTributaria)
        : Promise.resolve(null),

      // CAPAG
      analisarCAPAG([], cliente, {
        totalDivida,
        faturamentoAnual:  financeiro.faturamentoAnual  || 0,
        bensPenhoraveis:   financeiro.bensPenhoraveis   || 0,
        emRecuperacao:     financeiro.emRecuperacao     || false,
        inadimplente:      true,
        capagInformado:    financeiro.capag             || null,
      }, BaseTributaria),

      // TRANSACAO
      analisarTransacao([], cliente, {
        totalDivida,
        valorPrincipal:    financeiro.valorPrincipal    || 0,
        valorMultas:       financeiro.valorMultas       || 0,
        valorJuros:        financeiro.valorJuros        || 0,
        capag:             financeiro.capag             || 'C',
        faturamentoMensal: financeiro.faturamentoMensal || 0,
        emContencioso:     financeiro.emContencioso     || false,
      }, BaseTributaria),
    ])

    // ── 4. Classifica cada CDA ──────────────────────────────────
    const cdasClassificadas = cdas.map((cda, idx) => ({
      ...cda,
      idx,
      classificacao: classificarCDA(cda, resultPrescricao, resultDecadencia),
      valor: parseFloat(cda.valorTotal || cda.valor || 0),
    })).sort((a, b) => a.classificacao.prioridade - b.classificacao.prioridade)

    const cdasDecadentes  = cdasClassificadas.filter(c => c.classificacao.status === 'DECADENTE')
    const cdasPrescritas  = cdasClassificadas.filter(c => c.classificacao.status === 'PRESCRITA')
    const cdasAtivas      = cdasClassificadas.filter(c => c.classificacao.status === 'ATIVA')

    const valorDecadente  = cdasDecadentes.reduce((s, c) => s + c.valor, 0)
    const valorPrescrito  = cdasPrescritas.reduce((s, c) => s + c.valor, 0)
    const valorAtivo      = cdasAtivas.reduce((s, c)    => s + c.valor, 0)
    const valorExtinguivel = valorDecadente + valorPrescrito

    // ── 5. Oportunidades consolidadas ───────────────────────────
    const oportunidades = []
    let creditoTotal    = 0

    // Oportunidade 1 — Extinção por decadência
    if (resultDecadencia?.oportunidades?.length > 0) {
      const credDecad = resultDecadencia.calculos?.creditoEstimado || valorDecadente
      creditoTotal += credDecad
      oportunidades.push({
        id:            `DA_DECAD_${Date.now()}`,
        tese:          'Decadência — Extinção de Lançamentos Inválidos',
        descricao:     `${cdasDecadentes.length} CDA(s) com lançamento após o prazo decadencial de 5 anos. Valor extinguível: R$ ${fmtVal(credDecad)}.`,
        score:         scoreOportunidade({ modulo, label: 'Decadência', qualidadeDados: 85, forcaJuridica: 90, volumeEvidencias: 75, valorCredito: Math.min(100, (credDecad / 50000) * 100), riscoContestacao: 20 }),
        grauConfianca: GRAU_CONFIANCA.ALTO,
        evidencias:    [],
        fundamentacao: { teseJuridica: 'Decadência — Art. 150/173 CTN', baseLegal: FUNDAMENTACAO.baseLegal.slice(1, 3) },
        calculos: {
          creditoTotal: credDecad, economiaTotal: credDecad,
          creditoEstimado: credDecad, creditoPor12Meses: credDecad,
          creditoPor60Meses: credDecad, creditoMensalMedio: credDecad / 12,
          cdasAfetadas: cdasDecadentes.map(c => ({ numero: c.numero, valor: c.valor, tributo: c.tributo })),
          memoriaCalculo: [
            `${cdasDecadentes.length} CDA(s) decadentes identificadas`,
            `Valor total extinguível: R$ ${fmtVal(credDecad)}`,
            `Base: Art. 150 §4º e Art. 173 CTN`,
          ],
        },
        recomendacao: {
          tipo: 'ACAO_IMEDIATA', prioridade: 'URGENTE',
          titulo: `Arguir decadência em ${cdasDecadentes.length} CDA(s)`,
          descricao: `Extinção imediata de R$ ${fmtVal(credDecad)} por decadência.`,
          passos: [
            'Verificar a data do fato gerador e do lançamento de cada CDA decadente',
            'Calcular precisamente o prazo decadencial (art. 150 §4º ou 173 CTN)',
            'Protocolar impugnação administrativa ou exceção de pré-executividade',
            'Requerer extinção do crédito e emissão de certidão negativa',
          ],
        },
      })
    }

    // Oportunidade 2 — Extinção por prescrição
    if (resultPrescricao?.oportunidades?.length > 0) {
      const credPresc = resultPrescricao.calculos?.creditoEstimado || valorPrescrito
      creditoTotal += credPresc
      oportunidades.push({
        id:            `DA_PRESC_${Date.now() + 1}`,
        tese:          'Prescrição — Extinção de Créditos Prescritos',
        descricao:     `${cdasPrescritas.length} CDA(s) com prescrição identificada. Valor extinguível: R$ ${fmtVal(credPresc)}.`,
        score:         scoreOportunidade({ modulo, label: 'Prescrição', qualidadeDados: 80, forcaJuridica: 88, volumeEvidencias: 70, valorCredito: Math.min(100, (credPresc / 50000) * 100), riscoContestacao: 25 }),
        grauConfianca: GRAU_CONFIANCA.ALTO,
        evidencias:    [],
        fundamentacao: { teseJuridica: 'Prescrição — Art. 174 CTN e Art. 40 LEF', baseLegal: FUNDAMENTACAO.baseLegal.slice(0, 2) },
        calculos: {
          creditoTotal: credPresc, economiaTotal: credPresc,
          creditoEstimado: credPresc, creditoPor12Meses: credPresc,
          creditoPor60Meses: credPresc, creditoMensalMedio: credPresc / 12,
          cdasAfetadas: cdasPrescritas.map(c => ({ numero: c.numero, valor: c.valor, tributo: c.tributo })),
          memoriaCalculo: [
            `${cdasPrescritas.length} CDA(s) prescritas identificadas`,
            `Valor total extinguível: R$ ${fmtVal(credPresc)}`,
            `Base: Art. 174 CTN — 5 anos do despacho de citação`,
          ],
        },
        recomendacao: {
          tipo: 'ACAO_IMEDIATA', prioridade: 'URGENTE',
          titulo: `Arguir prescrição em ${cdasPrescritas.length} CDA(s)`,
          descricao: `Extinção de R$ ${fmtVal(credPresc)} por prescrição.`,
          passos: [
            'Levantar os autos de cada execução fiscal (petições, citação, movimentações)',
            'Calcular o prazo prescricional com base na última movimentação válida',
            'Protocolar petição de extinção por prescrição (art. 156, V, CTN)',
            'Verificar se há prescrição do redirecionamento para sócios (Tema 444 STJ)',
            'Requerer certidão negativa após extinção',
          ],
        },
      })
    }

    // Oportunidade 3 — Transação para CDAs ativas
    if (resultTransacao?.oportunidades?.length > 0 && valorAtivo > 0) {
      const oportunidadeTransacao = resultTransacao.oportunidades[0]
      creditoTotal += oportunidadeTransacao.calculos?.creditoTotal || 0
      oportunidades.push({
        ...oportunidadeTransacao,
        id:       `DA_TRANS_${Date.now() + 2}`,
        descricao: `${cdasAtivas.length} CDA(s) ativa(s) com valor total de R$ ${fmtVal(valorAtivo)}. ${oportunidadeTransacao.descricao}`,
      })
    }

    // ── 6. Grau de confiança global ─────────────────────────────
    const temDatas = cdas.some(c => c.dataInscricao || c.dataAjuizamento)
    resultado.grauConfianca = temDatas ? GRAU_CONFIANCA.ALTO : GRAU_CONFIANCA.MEDIO
    resultado.justificativaConfianca = temDatas
      ? 'Datas das CDAs disponíveis — análise de prescrição e decadência confiável.'
      : 'Datas parciais — confirmar no sistema REGULARIZE/PGFN para análise precisa.'

    resultado.oportunidades = oportunidades

    // ── 7. Cálculos consolidados ────────────────────────────────
    const capagResult = resultCAPAG?.oportunidades?.[0]?.calculos
    const transResult = resultTransacao?.oportunidades?.[0]?.calculos

    resultado.calculos = {
      valorAnalisado:    totalDivida,
      baseCalculo:       totalDivida,
      creditoEstimado:   creditoTotal,
      economiaEstimada:  creditoTotal,
      moeda:             'BRL',
      creditoPor12Meses: creditoTotal,
      creditoPor24Meses: creditoTotal,
      creditoPor36Meses: creditoTotal,
      creditoPor60Meses: creditoTotal,
      creditoMensalMedio: creditoTotal / 12,
      totalDocumentos:   cdas.length,
      totalCompetencias: competencias.length,

      // Resumo das CDAs
      totalCDAs:         cdas.length,
      cdasDecadentes:    cdasDecadentes.length,
      cdasPrescritas:    cdasPrescritas.length,
      cdasAtivas:        cdasAtivas.length,
      valorDecadente,
      valorPrescrito,
      valorAtivo,
      valorExtinguivel,

      // CAPAG e transação
      capag:             financeiro.capag || resultCAPAG?.oportunidades?.[0]?.calculos?.capag || 'C',
      descontoEstimado:  capagResult?.totalDesconto || 0,
      valorAposTransacao: transResult?.valorAposDesconto || valorAtivo,
      parcelaEstimada:   transResult?.parcelaSemJuros   || 0,
      maxParcelas:       transResult?.maxParcelas        || 120,

      memoriaCalculo: [
        `Total da dívida: R$ ${fmtVal(totalDivida)}`,
        `CDAs decadentes: ${cdasDecadentes.length} — R$ ${fmtVal(valorDecadente)}`,
        `CDAs prescritas: ${cdasPrescritas.length} — R$ ${fmtVal(valorPrescrito)}`,
        `CDAs ativas para transação: ${cdasAtivas.length} — R$ ${fmtVal(valorAtivo)}`,
        `Desconto estimado na transação: R$ ${fmtVal(capagResult?.totalDesconto || 0)}`,
        `Crédito/economia total: R$ ${fmtVal(creditoTotal)}`,
      ],

      observacoesTecnicas: !temDatas
        ? 'Datas parciais — análise de prescrição e decadência estimada. Confirmar no REGULARIZE.'
        : '',
    }

    // ── 8. Score ────────────────────────────────────────────────
    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo:   competencias.length > 0 ? Math.min(100, (competencias.length / 12) * 100) : 50,
      completudeDocs:     temDatas ? 85 : 55,
      consistencia:       oportunidades.length > 0 ? 88 : 60,
      oportunidadesFound: Math.min(100, (oportunidades.length / 3) * 100),
    })

    // ── 9. Riscos ───────────────────────────────────────────────
    resultado.riscos = [
      {
        descricao: 'Datas de citação/movimentação não informadas podem prejudicar análise de prescrição',
        nivel:     temDatas ? 'BAIXO' : 'ALTO',
        mitigacao: 'Consultar os autos das execuções fiscais e o sistema REGULARIZE',
      },
      {
        descricao: 'Fazenda pode arguir causa interruptiva ou suspensiva não identificada',
        nivel:     'MEDIO',
        mitigacao: 'Verificar íntegra dos autos antes de protocolar arguição de prescrição/decadência',
      },
      {
        descricao: 'Descumprimento de transação rescinde o acordo e restaura a dívida integral',
        nivel:     'ALTO',
        mitigacao: 'Planejar o fluxo de caixa antes de aderir à transação',
      },
    ]

    // ── 10. Recomendações priorizadas ───────────────────────────
    const recomendacoes = oportunidades
      .map(o => o.recomendacao)
      .sort((a, b) => {
        const ordem = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
        return (ordem[a.prioridade] || 99) - (ordem[b.prioridade] || 99)
      })

    if (recomendacoes.length === 0) {
      recomendacoes.push({
        tipo:       'ORIENTACAO',
        prioridade: 'MEDIA',
        titulo:     'Verificar REGULARIZE e consultar datas das execuções',
        descricao:  'Sem dados suficientes para análise de prescrição/decadência. Consultar REGULARIZE.',
        passos: [
          'Acessar regularize.pgfn.gov.br e verificar situação das CDAs',
          'Levantar datas de citação e última movimentação de cada execução',
          'Importar relatório SISPAR para análise detalhada',
        ],
      })
    }

    resultado.recomendacaoPrincipal = recomendacoes[0]
    resultado.todasRecomendacoes    = recomendacoes

    // ── 11. Relatório executivo ─────────────────────────────────
    resultado.relatorio = {
      resumoExecutivo: [
        `Análise de ${cdas.length} CDA(s) — Dívida total: R$ ${fmtVal(totalDivida)}.`,
        cdasDecadentes.length > 0
          ? `${cdasDecadentes.length} CDA(s) decadente(s) — R$ ${fmtVal(valorDecadente)} extinguíveis por decadência.`
          : '',
        cdasPrescritas.length > 0
          ? `${cdasPrescritas.length} CDA(s) prescrita(s) — R$ ${fmtVal(valorPrescrito)} extinguíveis por prescrição.`
          : '',
        cdasAtivas.length > 0
          ? `${cdasAtivas.length} CDA(s) ativa(s) — R$ ${fmtVal(valorAtivo)} para negociação via transação.`
          : '',
      ].filter(Boolean).join(' '),

      objetivoAnalise: 'Identificar CDAs extintas por decadência ou prescrição, calcular o CAPAG e simular as melhores condições de transação com a PGFN para as dívidas remanescentes.',

      escopoAnalise: `${cdas.length} CDA(s) analisada(s). Tributos: ${[...new Set(cdas.map(c => c.tributo).filter(Boolean))].join(', ') || 'não informados'}. Dívida total: R$ ${fmtVal(totalDivida)}.`,

      diagnosticoTecnico: [
        `Decadentes: ${cdasDecadentes.length} CDA(s) — R$ ${fmtVal(valorDecadente)}`,
        `Prescritas: ${cdasPrescritas.length} CDA(s) — R$ ${fmtVal(valorPrescrito)}`,
        `Ativas: ${cdasAtivas.length} CDA(s) — R$ ${fmtVal(valorAtivo)}`,
        `CAPAG estimado: ${financeiro.capag || 'C'}`,
        `Desconto estimado na transação: R$ ${fmtVal(capagResult?.totalDesconto || 0)}`,
      ].join(' | '),

      oportunidadesTexto: oportunidades.length > 0
        ? oportunidades.map(o => `${o.tese}: R$ ${fmtVal(o.calculos?.creditoTotal || 0)}`).join(' | ')
        : 'Nenhuma oportunidade imediata identificada — verificar datas no REGULARIZE.',

      riscosTexto: resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),

      fundamentacaoTexto: 'Art. 174 CTN (prescrição), Art. 150/173 CTN (decadência), Art. 40 LEF (intercorrente), Lei 13.988/2020 (transação), Temas 566 e 444 STJ.',

      evidenciasTexto: cdasClassificadas.slice(0, 10).map(c =>
        `${c.numero || 'CDA'} (${c.tributo || '-'}): R$ ${fmtVal(c.valor)} — ${c.classificacao.label}`
      ).join('\n'),

      scoreTexto: `Score Motor Dívida Ativa: ${resultado.score?.valor || 0}/100. Grau de confiança: ${resultado.grauConfianca}. ${resultado.justificativaConfianca}`,

      recomendacoesTexto: recomendacoes.map(r => `[${r.prioridade}] ${r.titulo}`).join(' | '),

      planoAcao: [
        cdasDecadentes.length > 0
          ? `1. Arguir decadência em ${cdasDecadentes.length} CDA(s) — R$ ${fmtVal(valorDecadente)}`
          : null,
        cdasPrescritas.length > 0
          ? `2. Arguir prescrição em ${cdasPrescritas.length} CDA(s) — R$ ${fmtVal(valorPrescrito)}`
          : null,
        cdasAtivas.length > 0
          ? `3. Negociar transação para ${cdasAtivas.length} CDA(s) ativa(s) — R$ ${fmtVal(valorAtivo)}`
          : null,
        `4. Verificar CAPAG oficial no REGULARIZE`,
        `5. Monitorar editais de transação vigentes`,
      ].filter(Boolean),

      conclusaoExecutiva: creditoTotal > 0
        ? `Potencial total de R$ ${fmtVal(creditoTotal)} entre extinção por decadência/prescrição e economia via transação. Prioridade: arguir decadência e prescrição imediatamente antes de negociar.`
        : `Nenhuma extinção imediata identificada. Recomenda-se negociar transação tributária com base no CAPAG ${financeiro.capag || 'C'}.`,
    }

    // ── 12. Trilha de auditoria ─────────────────────────────────
    resultado.auditTrail = {
      motoresExecutados: ['DIVIDA_ATIVA', 'PRESCRICAO', 'DECADENCIA', 'CAPAG', 'TRANSACAO'],
      regrasAplicadas: [
        { id: 'DA_001', descricao: 'Classificação das CDAs',              resultado: `${cdasDecadentes.length} decadentes | ${cdasPrescritas.length} prescritas | ${cdasAtivas.length} ativas` },
        { id: 'DA_002', descricao: 'Motor de Prescrição executado',       resultado: resultPrescricao?.status || 'N/A' },
        { id: 'DA_003', descricao: 'Motor de Decadência executado',       resultado: resultDecadencia?.status || 'N/A' },
        { id: 'DA_004', descricao: 'Motor de CAPAG executado',            resultado: resultCAPAG?.status || 'N/A' },
        { id: 'DA_005', descricao: 'Motor de Transação executado',        resultado: resultTransacao?.status || 'N/A' },
        { id: 'DA_006', descricao: 'Valor total extinguível calculado',   resultado: `R$ ${fmtVal(valorExtinguivel)}` },
      ],
      documentosUtilizados: cdas.map(c => ({
        tipo:          'CDA',
        identificador: c.numero || 'não identificado',
        competencia:   c.competencia || '',
      })),
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],

      // Sub-resultados completos para debug
      subMotores: {
        prescricao: resultPrescricao,
        decadencia: resultDecadencia,
        capag:      resultCAPAG,
        transacao:  resultTransacao,
      },
    }

    // ── 13. Status final ────────────────────────────────────────
    resultado.status = oportunidades.length > 0
      ? STATUS_ANALISE.CONCLUIDA
      : STATUS_ANALISE.CONCLUIDA_PARCIAL

    return finalizarResultado(resultado, inicio, {
      totalNFes:         nfes?.length  || 0,
      regime:            cliente?.regime || '',
      clienteCNPJ:       cliente?.cnpj   || '',
      totalCDAs:         cdas.length,
      valorTotal:        totalDivida,
      valorExtinguivel,
      oportunidades:     oportunidades.length,
    })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de Dívida Ativa: ${erro.message}`)
  }
}

export default analisarDividaAtiva