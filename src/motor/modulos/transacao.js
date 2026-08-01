/**
 * modulos/transacao.js — FiscalTrib
 * Motor de Transação Tributária com a PGFN.
 *
 * Modalidades:
 * 1. Transação por Adesão — editais periódicos PGFN
 * 2. Transação Individual — dívidas > R$ 10 milhões
 * 3. Transação Extraordinária — situações excepcionais
 * 4. Transação no Contencioso Administrativo — CARF/DRJ
 *
 * Simulação completa:
 * — Desconto sobre multas e juros conforme CAPAG
 * — Entrada mínima
 * — Parcelamento máximo
 * — SELIC como atualização das parcelas
 * — Impacto no fluxo de caixa
 *
 * Base legal:
 * — Lei 13.988/2020 — Transação Tributária
 * — Portaria PGFN 6.757/2022
 * — Portaria ME 247/2020 — Transação Extraordinária
 * — Art. 171 CTN
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

const SELIC_MENSAL = 0.0089  // aproximação agosto/2026

const MODALIDADES = {
  ADESAO: {
    id:          'ADESAO',
    nome:        'Transação por Adesão',
    descricao:   'Adesão a editais periódicos publicados pela PGFN no REGULARIZE',
    limiteMin:   0,
    limiteMax:   10_000_000,
    prazoMax:    120,
    disponivel:  true,
  },
  INDIVIDUAL: {
    id:          'INDIVIDUAL',
    nome:        'Transação Individual',
    descricao:   'Negociação direta com a PGFN para dívidas acima de R$ 10 milhões',
    limiteMin:   10_000_000,
    limiteMax:   Infinity,
    prazoMax:    120,
    disponivel:  true,
  },
  CONTENCIOSO: {
    id:          'CONTENCIOSO',
    nome:        'Transação no Contencioso Administrativo',
    descricao:   'Resolução de litígios no CARF ou DRJ mediante transação',
    limiteMin:   0,
    limiteMax:   Infinity,
    prazoMax:    72,
    disponivel:  true,
  },
  EXTRAORDINARIA: {
    id:          'EXTRAORDINARIA',
    nome:        'Transação Extraordinária',
    descricao:   'Situações excepcionais — calamidade, crise setorial',
    limiteMin:   0,
    limiteMax:   Infinity,
    prazoMax:    133,
    disponivel:  false,  // sob condições específicas
  },
}

const DESCONTOS_POR_CAPAG = {
  A: { multas: 0.20, juros: 0.20, entrada: 0.10 },
  B: { multas: 0.40, juros: 0.40, entrada: 0.10 },
  C: { multas: 0.50, juros: 0.50, entrada: 0.05 },
  D: { multas: 0.70, juros: 0.70, entrada: 0.00 },
}

const FUNDAMENTACAO = {
  teseJuridica: 'Transação Tributária — Negociação de Dívida Ativa com a PGFN',
  resumo: 'A Transação Tributária (Lei 13.988/2020) permite que contribuintes com dívidas na PGFN negociem descontos em multas e juros, parcelamento ampliado e outras condições especiais, com base no CAPAG e na modalidade de transação escolhida.',
  baseLegal: [
    { norma: 'Lei 13.988/2020',           descricao: 'Marco legal da Transação Tributária' },
    { norma: 'Art. 171 CTN',              descricao: 'Autorização constitucional para transação' },
    { norma: 'Portaria PGFN 6.757/2022', descricao: 'Regulamentação da transação individual e por adesão' },
    { norma: 'Portaria ME 247/2020',      descricao: 'Transação Extraordinária' },
    { norma: 'Lei 14.375/2022',           descricao: 'Ampliação dos descontos e modalidades de transação' },
  ],
  jurisprudencia: [
    'STF — ADI 6.357 — constitucionalidade da Transação Tributária',
    'CARF — Portaria CARF 10.956/2022 — transação no contencioso administrativo',
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: 'N/A — negociação prospectiva',
  riscoContestacao: 5,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Calcula a parcela com correção pela SELIC mensal.
 */
function calcularParcela(principal, nparcelas, taxaMensal = SELIC_MENSAL) {
  if (nparcelas <= 0) return 0
  if (taxaMensal === 0) return principal / nparcelas
  return (principal * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -nparcelas))
}

/**
 * Determina a modalidade mais adequada para a dívida.
 */
function determinarModalidade(totalDivida, emContencioso = false) {
  if (emContencioso) return MODALIDADES.CONTENCIOSO
  if (totalDivida >= MODALIDADES.INDIVIDUAL.limiteMin) return MODALIDADES.INDIVIDUAL
  return MODALIDADES.ADESAO
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarTransacao(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'TRANSACAO'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Simulação de Transação Tributária com a PGFN (Lei 13.988/2020)'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    const {
      totalDivida        = 0,
      valorPrincipal     = 0,
      valorMultas        = 0,
      valorJuros         = 0,
      capag              = 'C',      // CAPAG do CAPAG motor ou informado
      faturamentoMensal  = 0,
      emContencioso      = false,
      modalidadeForced   = null,
      nParcelasDesejadas = null,
    } = opcoes

    if (totalDivida === 0) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Informe o total da dívida em opcoes.totalDivida.'
      return finalizarResultado(resultado, inicio)
    }

    // ── 2. Determina composição da dívida ───────────────────────
    // Se não informou o detalhamento, estima a composição
    const principal = valorPrincipal || totalDivida * 0.45
    const multas    = valorMultas    || totalDivida * 0.30
    const juros     = valorJuros     || totalDivida * 0.25

    resultado.diagnostico = {
      totalDocumentosAnalisados: 1,
      totalItensAnalisados:      1,
      competenciasAnalisadas:    [],
      periodoInicio:             '',
      periodoFim:                '',
      situacoesEncontradas:      [`CAPAG ${capag} — Simulação de Transação`],
      observacoes: [
        `Total da dívida: R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Principal: R$ ${principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Multas: R$ ${multas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Juros: R$ ${juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `CAPAG: ${capag}`,
        `Em contencioso: ${emContencioso ? 'Sim' : 'Não'}`,
      ].join('. '),
    }

    // ── 3. Aplica descontos conforme CAPAG ──────────────────────
    const descCAPAG = DESCONTOS_POR_CAPAG[capag] || DESCONTOS_POR_CAPAG['C']

    const descontoMultas    = multas  * descCAPAG.multas
    const descontoJuros     = juros   * descCAPAG.juros
    const totalDesconto     = descontoMultas + descontoJuros
    const valorAposDesconto = totalDivida - totalDesconto
    const entradaMinima     = valorAposDesconto * descCAPAG.entrada

    // ── 4. Determina modalidade ─────────────────────────────────
    const modalidade = modalidadeForced
      ? MODALIDADES[modalidadeForced]
      : determinarModalidade(totalDivida, emContencioso)

    const maxParcelas = modalidade.prazoMax
    const nParcelas   = Math.min(nParcelasDesejadas || maxParcelas, maxParcelas)

    // ── 5. Simula planos de parcelamento ────────────────────────
    const valorParcelar    = valorAposDesconto - entradaMinima
    const parcelaSemJuros  = valorParcelar / nParcelas
    const parcelaComSelic  = calcularParcela(valorParcelar, nParcelas)

    // Simula 3 cenários de parcelas
    const cenarios = [
      { nparcelas: Math.min(24,  maxParcelas), label: '24 meses' },
      { nparcelas: Math.min(60,  maxParcelas), label: '60 meses' },
      { nparcelas: Math.min(120, maxParcelas), label: '120 meses' },
    ].map(c => ({
      ...c,
      parcela: calcularParcela(valorParcelar, c.nparcelas),
      totalPago: calcularParcela(valorParcelar, c.nparcelas) * c.nparcelas + entradaMinima,
    }))

    // ── 6. Verifica comprometimento da receita ──────────────────
    const comprometimento = faturamentoMensal > 0
      ? (parcelaSemJuros / faturamentoMensal) * 100
      : null

    resultado.grauConfianca          = GRAU_CONFIANCA.ALTO
    resultado.justificativaConfianca = `Simulação com base no CAPAG ${capag} e na ${modalidade.nome}.`

    const scoreOp = scoreOportunidade({
      modulo, label: `Transação ${modalidade.nome}`,
      qualidadeDados: 85, forcaJuridica: 95,
      volumeEvidencias: 80,
      valorCredito: Math.min(100, (totalDesconto / 20000) * 100),
      riscoContestacao: FUNDAMENTACAO.riscoContestacao,
    })

    const recomendacao = {
      tipo:       'ACAO_IMEDIATA',
      prioridade: 'ALTA',
      titulo:     `Aderir à ${modalidade.nome} — Desconto de R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      descricao:  `CAPAG ${capag}. Desconto total de ${((totalDesconto / totalDivida) * 100).toFixed(1)}% (R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Valor final: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até ${maxParcelas}x.`,
      passos: [
        'Acessar REGULARIZE (regularize.pgfn.gov.br) e verificar o CAPAG oficial',
        'Consultar os editais de transação vigentes e prazo de adesão',
        `Selecionar a modalidade: ${modalidade.nome}`,
        `Calcular a entrada: R$ ${entradaMinima.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${(descCAPAG.entrada * 100).toFixed(0)}% do valor após desconto)`,
        `Escolher o número de parcelas (máximo ${maxParcelas}x) com base no fluxo de caixa`,
        'Protocolar a proposta no REGULARIZE e aguardar homologação da PGFN',
        'Emitir certidão positiva com efeito de negativa após a adesão',
      ],
    }

    resultado.oportunidades = [{
      id:            `TRANSACAO_${Date.now()}`,
      tese:          `${modalidade.nome} — Lei 13.988/2020`,
      descricao:     `Dívida de R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (CAPAG ${capag}). Desconto estimado: R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${((totalDesconto / totalDivida) * 100).toFixed(1)}%). Valor final: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até ${maxParcelas}x.`,
      score:         scoreOp,
      grauConfianca: GRAU_CONFIANCA.ALTO,
      evidencias:    [],
      fundamentacao: FUNDAMENTACAO,
      calculos: {
        totalDivida, principal, multas, juros,
        capag, modalidade: modalidade.id,
        descontoMultas, descontoJuros, totalDesconto,
        valorAposDesconto, entradaMinima,
        parcelaSemJuros, parcelaComSelic,
        maxParcelas, nParcelas,
        cenarios,
        comprometimento,
        creditoTotal:      totalDesconto,
        creditoEstimado:   totalDesconto,
        economiaEstimada:  totalDesconto,
        creditoMensalMedio: totalDesconto / 60,
        creditoPor12Meses: totalDesconto,
        creditoPor60Meses: totalDesconto,
        memoriaCalculo: [
          `Dívida total: R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Composição estimada — Principal: R$ ${principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Multas: R$ ${multas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Juros: R$ ${juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `CAPAG ${capag} → Desconto multas: ${(descCAPAG.multas * 100).toFixed(0)}% | Desconto juros: ${(descCAPAG.juros * 100).toFixed(0)}%`,
          `Desconto total: R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Valor após desconto: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Entrada: R$ ${entradaMinima.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + ${nParcelas}x de R$ ${parcelaSemJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
      coberturaPeriodo: 80, completudeDocs: 85,
      consistencia: 90,
      oportunidadesFound: 85,
    })

    resultado.riscos = [
      { descricao: 'Descumprimento da transação rescinde o acordo automaticamente', nivel: 'ALTO', mitigacao: 'Garantir fluxo de caixa antes de aderir — simular impacto mensal' },
      { descricao: 'Editais de transação têm prazo — perder a janela pode custar meses', nivel: 'ALTO', mitigacao: 'Monitorar publicação de novos editais no REGULARIZE e DOU' },
      { descricao: 'CAPAG pode ser revisto pela PGFN', nivel: 'MEDIO', mitigacao: 'Confirmar o CAPAG oficial no REGULARIZE antes de protocolar' },
    ]

    resultado.recomendacaoPrincipal = recomendacao
    resultado.todasRecomendacoes    = [recomendacao]

    resultado.relatorio = {
      resumoExecutivo:    `${modalidade.nome} — CAPAG ${capag}. Desconto estimado de R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${((totalDesconto / totalDivida) * 100).toFixed(1)}%). Valor final: R$ ${valorAposDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em até ${maxParcelas}x de R$ ${parcelaSemJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      objetivoAnalise:    'Simular as condições de transação com a PGFN e identificar a modalidade mais vantajosa para o contribuinte.',
      escopoAnalise:      `Dívida: R$ ${totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. CAPAG: ${capag}. Modalidade: ${modalidade.nome}.`,
      diagnosticoTecnico: `Composição — Principal: ${((principal / totalDivida) * 100).toFixed(0)}% | Multas: ${((multas / totalDivida) * 100).toFixed(0)}% | Juros: ${((juros / totalDivida) * 100).toFixed(0)}%.`,
      oportunidadesTexto: `Desconto de ${((totalDesconto / totalDivida) * 100).toFixed(1)}% = R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Cenários: ${cenarios.map(c => `${c.label}: R$ ${c.parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`).join(' | ')}.`,
      riscosTexto:        resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: `Lei 13.988/2020. Portaria PGFN 6.757/2022. Art. 171 CTN.`,
      recomendacoesTexto: recomendacao.descricao,
      planoAcao:          recomendacao.passos,
      conclusaoExecutiva: `Economia de R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via ${modalidade.nome}. ${comprometimento ? `Comprometimento da receita: ${comprometimento.toFixed(1)}%/mês.` : ''} Recomenda-se adesão imediata ao edital vigente.`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id: 'TRANS_001', descricao: 'Determinação da modalidade',       resultado: modalidade.nome },
        { id: 'TRANS_002', descricao: 'Desconto em multas',               resultado: `${(descCAPAG.multas * 100).toFixed(0)}% = R$ ${descontoMultas.toFixed(2)}` },
        { id: 'TRANS_003', descricao: 'Desconto em juros',                resultado: `${(descCAPAG.juros * 100).toFixed(0)}% = R$ ${descontoJuros.toFixed(2)}` },
        { id: 'TRANS_004', descricao: 'Cálculo da parcela',               resultado: `R$ ${parcelaSemJuros.toFixed(2)}/mês em ${nParcelas}x` },
        { id: 'TRANS_005', descricao: 'Comprometimento da receita mensal', resultado: comprometimento ? `${comprometimento.toFixed(1)}%` : 'Não informado' },
      ],
      documentosUtilizados: [],
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, {
      regime: cliente.regime, capag, totalDivida,
      totalDesconto, modalidade: modalidade.id,
    })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de Transação: ${erro.message}`)
  }
}

export default analisarTransacao