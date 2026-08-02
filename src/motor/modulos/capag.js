/**
 * modulos/capag.js — FiscalTrib
 * Motor de CAPAG — Capacidade de Pagamento do Contribuinte.
 *
 * O CAPAG é calculado pela PGFN para definir o perfil do
 * contribuinte em dívida ativa e determinar as condições
 * de negociação na Transação Tributária (Lei 13.988/2020).
 *
 * Classificação:
 * — A: Boa capacidade → desconto menor, parcelas melhores
 * — B: Capacidade moderada → condições intermediárias
 * — C: Capacidade reduzida → descontos maiores
 * — D: Sem capacidade → máximo desconto (até 70% multas/juros)
 *
 * Base legal:
 * — Lei 13.988/2020 — Transação Tributária
 * — Portaria PGFN 6.757/2022 — CAPAG e critérios de transação
 * — Portaria PGFN 14.402/2020 — Transação Extraordinária
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
// TABELA CAPAG
// ─────────────────────────────────────────────────────────────

const FAIXAS_CAPAG = [
  {
    classificacao: 'A',
    label:         'Boa capacidade de pagamento',
    desconto:      { multas: 0.20, juros: 0.20, principal: 0 },
    entradaMin:    0.10,
    maxParcelas:   60,
    cor:           '#22c55e',
  },
  {
    classificacao: 'B',
    label:         'Capacidade moderada de pagamento',
    desconto:      { multas: 0.40, juros: 0.40, principal: 0 },
    entradaMin:    0.10,
    maxParcelas:   84,
    cor:           '#f59e0b',
  },
  {
    classificacao: 'C',
    label:         'Capacidade reduzida de pagamento',
    desconto:      { multas: 0.50, juros: 0.50, principal: 0 },
    entradaMin:    0.05,
    maxParcelas:   100,
    cor:           '#f97316',
  },
  {
    classificacao: 'D',
    label:         'Sem capacidade de pagamento',
    desconto:      { multas: 0.70, juros: 0.70, principal: 0 },
    entradaMin:    0,
    maxParcelas:   120,
    cor:           '#ef4444',
  },
]

const FUNDAMENTACAO = {
  teseJuridica: 'CAPAG — Capacidade de Pagamento para Transação com a PGFN',
  resumo: 'O CAPAG classifica o contribuinte de A a D conforme sua capacidade de pagamento. Quanto menor a capacidade, maiores os descontos disponíveis na Transação Tributária. A análise prévia do CAPAG permite negociar as melhores condições antes de aderir ao programa.',
  baseLegal: [
    { norma: 'Lei 13.988/2020',          descricao: 'Marco legal da Transação Tributária federal' },
    { norma: 'Portaria PGFN 6.757/2022', descricao: 'Critérios de CAPAG e condições de transação' },
    { norma: 'Portaria PGFN 14.402/2020', descricao: 'Transação Extraordinária — COVID' },
    { norma: 'Art. 171 CTN',             descricao: 'Autorização legal para transação tributária' },
  ],
  jurisprudencia: [
    'PGFN — Nota SEI 63/2020 — metodologia de cálculo do CAPAG',
    'CARF — Acórdão 1302-006.040 — validade da transação tributária',
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: 'N/A — prospecção de negociação',
  riscoContestacao: 5,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o CAPAG estimado com base nos dados financeiros.
 * Critérios simplificados (modelo da PGFN usa dados Receita + PGFN):
 * — Relação dívida/faturamento
 * — Histórico de adimplência
 * — Existência de bens penhoráveis
 */
function calcularCAPAG(dados) {
  const {
    totalDivida      = 0,
    faturamentoAnual = 0,
    inadimplente     = true,
    bensPenhoraveis  = 0,
    emRecuperacao    = false,
  } = dados

  let pontos = 100  // começa em 100 e vai reduzindo

  // Relação dívida/faturamento
  if (faturamentoAnual > 0) {
    const relacao = totalDivida / faturamentoAnual
    if (relacao > 5)        pontos -= 60
    else if (relacao > 3)   pontos -= 40
    else if (relacao > 1.5) pontos -= 25
    else if (relacao > 0.5) pontos -= 10
  } else {
    pontos -= 50  // sem faturamento = sem capacidade
  }

  // Inadimplência crônica
  if (inadimplente) pontos -= 15

  // Bens penhoráveis
  if (bensPenhoraveis > totalDivida * 0.5) pontos += 10
  else if (bensPenhoraveis === 0)           pontos -= 10

  // Recuperação judicial
  if (emRecuperacao) pontos -= 25

  pontos = Math.max(0, Math.min(100, pontos))

  if (pontos >= 75) return 'A'
  if (pontos >= 50) return 'B'
  if (pontos >= 25) return 'C'
  return 'D'
}

function getFaixaCAPAG(classificacao) {
  return FAIXAS_CAPAG.find(f => f.classificacao === classificacao) || FAIXAS_CAPAG[3]
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarCAPAG(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'CAPAG'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'CAPAG — Capacidade de Pagamento e Simulação de Transação'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    const {
      totalDivida      = 0,
      faturamentoAnual = 0,
      inadimplente     = true,
      bensPenhoraveis  = 0,
      emRecuperacao    = false,
      capagInformado   = null,  // se já tiver o CAPAG da PGFN
    } = opcoes

    if (totalDivida === 0) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Informe o total da dívida em opcoes.totalDivida para calcular o CAPAG.'
      return finalizarResultado(resultado, inicio)
    }

    // ── 2. Diagnóstico ──────────────────────────────────────────
    resultado.diagnostico = {
      totalDocumentosAnalisados: 1,
      totalItensAnalisados:      1,
      competenciasAnalisadas:    [],
      periodoInicio:             '',
      periodoFim:                '',
      situacoesEncontradas:      ['Perfil financeiro analisado para CAPAG'],
      observacoes: [
        `Total da dívida: R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Faturamento anual: R$ ${faturamentoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Relação dívida/faturamento: ${faturamentoAnual > 0 ? (totalDivida / faturamentoAnual).toFixed(2) : 'N/A'}`,
        `Em recuperação judicial: ${emRecuperacao ? 'Sim' : 'Não'}`,
      ].join('. '),
    }

    // ── 3. Calcula CAPAG ────────────────────────────────────────
    const capag = capagInformado || calcularCAPAG({ totalDivida, faturamentoAnual, inadimplente, bensPenhoraveis, emRecuperacao })
    const faixa = getFaixaCAPAG(capag)

    // ── 4. Simula condições de transação ────────────────────────
    const descontoMultas    = totalDivida * 0.30 * faixa.desconto.multas  // estimativa: 30% da dívida são multas
    const descontoJuros     = totalDivida * 0.25 * faixa.desconto.juros   // estimativa: 25% são juros
    const totalDesconto     = descontoMultas + descontoJuros
    const valorAposDesconto = totalDivida - totalDesconto
    const entradaMinima     = valorAposDesconto * faixa.entradaMin
    const parcelaMinima     = faixa.maxParcelas > 0
      ? (valorAposDesconto - entradaMinima) / faixa.maxParcelas
      : 0

    resultado.grauConfianca          = capagInformado ? GRAU_CONFIANCA.ALTO : GRAU_CONFIANCA.MEDIO
    resultado.justificativaConfianca = capagInformado
      ? 'CAPAG informado pela PGFN — análise precisa.'
      : 'CAPAG estimado com base nos dados financeiros fornecidos. Confirmar na plataforma REGULARIZE.'

    const scoreOp = scoreOportunidade({
      modulo, label: `CAPAG ${capag} — Transação Tributária`,
      qualidadeDados: capagInformado ? 95 : 65,
      forcaJuridica: 90,
      volumeEvidencias: 70,
      valorCredito: Math.min(100, (totalDesconto / 10000) * 100),
      riscoContestacao: FUNDAMENTACAO.riscoContestacao,
    })

    const recomendacao = {
      tipo:       capag === 'A' ? 'ORIENTACAO' : 'ACAO_IMEDIATA',
      prioridade: capag === 'D' ? 'URGENTE' : capag === 'C' ? 'ALTA' : 'MEDIA',
      titulo:     `CAPAG ${capag} — ${faixa.label} — Negociar transação com a PGFN`,
      descricao:  `Desconto estimado de R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${((totalDesconto / totalDivida) * 100).toFixed(1)}%). Valor após desconto: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      passos: [
        'Acessar a plataforma REGULARIZE (regularize.pgfn.gov.br) e verificar o CAPAG oficial',
        'Consultar os programas de transação vigentes (Edital PGFN/ME)',
        `Calcular proposta: entrada mínima de R$ ${entradaMinima.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + ${faixa.maxParcelas} parcelas de aprox. R$ ${parcelaMinima.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Levantar documentação: balanço, DRE, extratos bancários dos últimos 3 meses',
        'Protocolar proposta de transação individual se a dívida superar R$ 10 milhões',
        'Para dívidas menores, aderir ao edital de transação por adesão disponível no REGULARIZE',
      ],
    }

    resultado.oportunidades = [{
      id:            `CAPAG_${Date.now()}`,
      tese:          `CAPAG ${capag} — ${faixa.label}`,
      descricao:     `CAPAG ${capag}. Dívida total: R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Desconto estimado em multas/juros: R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${((totalDesconto / totalDivida) * 100).toFixed(1)}%). Valor final negociável: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até ${faixa.maxParcelas} parcelas.`,
      score:         scoreOp,
      grauConfianca: resultado.grauConfianca,
      evidencias:    [],
      fundamentacao: FUNDAMENTACAO,
      calculos: {
        totalDivida, capag, faixa,
        descontoMultas, descontoJuros,
        totalDesconto, valorAposDesconto,
        entradaMinima, parcelaMinima,
        creditoTotal:      totalDesconto,
        creditoEstimado:   totalDesconto,
        economiaEstimada:  totalDesconto,
        creditoMensalMedio: totalDesconto / 60,
        creditoPor12Meses: totalDesconto,
        creditoPor60Meses: totalDesconto,
        memoriaCalculo: [
          `Dívida total: R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `CAPAG estimado: ${capag} — ${faixa.label}`,
          `Desconto em multas (${(faixa.desconto.multas * 100).toFixed(0)}% de 30% da dívida): R$ ${descontoMultas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Desconto em juros (${(faixa.desconto.juros * 100).toFixed(0)}% de 25% da dívida): R$ ${descontoJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Total de desconto estimado: R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Valor final: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até ${faixa.maxParcelas}x`,
        ],
      },
      recomendacao,
    }]

    resultado.calculos = {
      valorAnalisado:    totalDivida,
      baseCalculo:       totalDivida,
      creditoEstimado:   totalDesconto,
      economiaEstimada:  totalDesconto,
      moeda:             'BRL',
      creditoPor12Meses: totalDesconto,
      creditoPor24Meses: totalDesconto,
      creditoPor36Meses: totalDesconto,
      creditoPor60Meses: totalDesconto,
      creditoMensalMedio: totalDesconto / 60,
      totalDocumentos:   1,
      totalCompetencias: 0,
      memoriaCalculo:    resultado.oportunidades[0].calculos.memoriaCalculo,
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo:   70,
      completudeDocs:     capagInformado ? 95 : 65,
      consistencia:       85,
      oportunidadesFound: 80,
    })

    resultado.riscos = [
      { descricao: 'CAPAG calculado internamente pode divergir do CAPAG oficial da PGFN', nivel: 'MEDIO', mitigacao: 'Confirmar o CAPAG no sistema REGULARIZE antes de negociar' },
      { descricao: 'Programas de transação têm prazo de adesão — verificar editais vigentes', nivel: 'ALTO', mitigacao: 'Monitorar publicação de novos editais no REGULARIZE e DOU' },
      { descricao: 'Descumprimento da transação rescinde o acordo e retoma a dívida integral', nivel: 'ALTO', mitigacao: 'Planejar o fluxo de caixa antes de aderir' },
    ]

    resultado.recomendacaoPrincipal = recomendacao
    resultado.todasRecomendacoes    = [recomendacao]

    resultado.relatorio = {
      resumoExecutivo:    `CAPAG ${capag} (${faixa.label}). Dívida de R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com desconto estimado de R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${((totalDesconto / totalDivida) * 100).toFixed(1)}%) via Transação Tributária.`,
      objetivoAnalise:    'Calcular o CAPAG do contribuinte e simular as condições de negociação da dívida ativa via Transação Tributária (Lei 13.988/2020).',
      escopoAnalise:      `Dívida total: R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Faturamento: R$ ${faturamentoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano.`,
      diagnosticoTecnico: `CAPAG ${capag}: ${faixa.label}. Descontos em multas (${(faixa.desconto.multas * 100).toFixed(0)}%) e juros (${(faixa.desconto.juros * 100).toFixed(0)}%).`,
      oportunidadesTexto: `Desconto de R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Valor após transação: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até ${faixa.maxParcelas}x.`,
      riscosTexto:        resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: `Lei 13.988/2020. Portaria PGFN 6.757/2022. Art. 171 CTN.`,
      recomendacoesTexto: recomendacao.descricao,
      planoAcao:          recomendacao.passos,
      conclusaoExecutiva: `CAPAG ${capag} — ${faixa.label}. Potencial de desconto de ${((totalDesconto / totalDivida) * 100).toFixed(1)}% (R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Recomenda-se negociar transação imediatamente.`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id: 'CAPAG_001', descricao: 'Cálculo do CAPAG',               resultado: `CAPAG ${capag}` },
        { id: 'CAPAG_002', descricao: 'Simulação de desconto em multas', resultado: `R$ ${descontoMultas.toFixed(2)}` },
        { id: 'CAPAG_003', descricao: 'Simulação de desconto em juros',  resultado: `R$ ${descontoJuros.toFixed(2)}` },
        { id: 'CAPAG_004', descricao: 'Valor final da transação',        resultado: `R$ ${valorAposDesconto.toFixed(2)}` },
      ],
      documentosUtilizados: [],
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, { regime: cliente.regime, capag, totalDivida, totalDesconto })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de CAPAG: ${erro.message}`)
  }
}

export default analisarCAPAG