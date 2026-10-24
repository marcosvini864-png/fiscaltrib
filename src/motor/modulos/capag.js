/**
 * modulos/capag.js — e-FiscalTribe
 * Motor de CAPAG — Capacidade de Pagamento.
 *
 * REVISÃO 04/10/2026:
 * — CAPAG é diagnóstico/classificação, não calculadora de desconto.
 * — Não presume que 30% da dívida seja multa nem 25% seja juros.
 * — Quando houver CAPAG oficial do REGULARIZE, ele prevalece.
 * — CAPAG estimado serve apenas como triagem interna.
 */

import {
  criarResultado,
  finalizarResultado,
  resultadoErro,
  STATUS_ANALISE,
  GRAU_CONFIANCA,
} from '../contratos/ResultadoPadrao.js'

import { scoreOportunidade, scoreMotor } from '../contratos/Score.js'

const FAIXAS_CAPAG = [
  { classificacao: 'A', label: 'Boa capacidade de pagamento', cor: '#22c55e' },
  { classificacao: 'B', label: 'Capacidade de pagamento suficiente/intermediária', cor: '#f59e0b' },
  { classificacao: 'C', label: 'Capacidade de pagamento insuficiente', cor: '#f97316' },
  { classificacao: 'D', label: 'Sem capacidade de pagamento suficiente', cor: '#ef4444' },
]

const FUNDAMENTACAO = {
  teseJuridica: 'CAPAG — Capacidade de Pagamento para Transação com a PGFN',
  resumo: 'A capacidade de pagamento é apurada pela PGFN e influencia as condições de determinadas modalidades de transação. O FiscalTribe pode fazer triagem estimativa, mas o CAPAG oficial consultado no REGULARIZE prevalece.',
  baseLegal: [
    { norma: 'Lei 13.988/2020', descricao: 'Marco legal da Transação Tributária federal' },
    { norma: 'Portaria PGFN 6.757/2022', descricao: 'Regulamentação da transação e capacidade de pagamento' },
    { norma: 'Art. 171 CTN', descricao: 'Transação tributária' },
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: 'N/A',
  riscoContestacao: 5,
}

function calcularCAPAGEstimado(dados) {
  const {
    totalDivida = 0,
    faturamentoAnual = 0,
    inadimplente = true,
    bensPenhoraveis = 0,
    emRecuperacao = false,
  } = dados

  let pontos = 100
  if (faturamentoAnual > 0) {
    const relacao = totalDivida / faturamentoAnual
    if (relacao > 5) pontos -= 60
    else if (relacao > 3) pontos -= 40
    else if (relacao > 1.5) pontos -= 25
    else if (relacao > 0.5) pontos -= 10
  } else {
    pontos -= 50
  }

  if (inadimplente) pontos -= 15
  if (bensPenhoraveis > totalDivida * 0.5) pontos += 10
  else if (bensPenhoraveis === 0) pontos -= 10
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

export async function analisarCAPAG(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio = Date.now()
  const modulo = 'CAPAG'
  const resultado = criarResultado(modulo)
  resultado.descricaoModulo = 'CAPAG — Capacidade de Pagamento para fins de transação'

  try {
    const {
      totalDivida = 0,
      faturamentoAnual = 0,
      inadimplente = true,
      bensPenhoraveis = 0,
      emRecuperacao = false,
      capagInformado = null,
    } = opcoes

    if (!totalDivida) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro = 'Informe o total da dívida para análise do CAPAG.'
      return finalizarResultado(resultado, inicio)
    }

    const oficial = ['A','B','C','D'].includes(String(capagInformado || '').toUpperCase())
    const capag = oficial
      ? String(capagInformado).toUpperCase()
      : calcularCAPAGEstimado({ totalDivida, faturamentoAnual, inadimplente, bensPenhoraveis, emRecuperacao })

    const faixa = getFaixaCAPAG(capag)

    resultado.diagnostico = {
      totalDocumentosAnalisados: 1,
      totalItensAnalisados: 1,
      competenciasAnalisadas: [],
      periodoInicio: '',
      periodoFim: '',
      situacoesEncontradas: [`CAPAG ${capag}${oficial ? ' — oficial/informado' : ' — estimativa de triagem'}`],
      observacoes: [
        `Dívida considerada: R$ ${totalDivida.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,
        faturamentoAnual > 0 ? `Faturamento anual informado: R$ ${faturamentoAnual.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'Faturamento anual não informado',
        `Classificação: ${capag} — ${faixa.label}`,
        oficial ? 'CAPAG informado pelo usuário/REGULARIZE' : 'CAPAG estimado pelo FiscalTribe — confirmar no REGULARIZE',
      ].join('. '),
    }

    resultado.grauConfianca = oficial ? GRAU_CONFIANCA.ALTO : GRAU_CONFIANCA.MEDIO
    resultado.justificativaConfianca = oficial
      ? 'CAPAG oficial/informado utilizado.'
      : 'Classificação estimada para triagem. A PGFN calcula o CAPAG oficial com sua própria metodologia e bases de dados.'

    const scoreOp = scoreOportunidade({
      modulo,
      label: `CAPAG ${capag}`,
      qualidadeDados: oficial ? 95 : 60,
      forcaJuridica: 90,
      volumeEvidencias: oficial ? 90 : 55,
      valorCredito: 0,
      riscoContestacao: FUNDAMENTACAO.riscoContestacao,
    })

    const recomendacao = {
      tipo: 'ORIENTACAO',
      prioridade: oficial ? 'MEDIA' : 'ALTA',
      titulo: oficial ? `CAPAG ${capag} confirmado` : `Confirmar CAPAG ${capag} estimado no REGULARIZE`,
      descricao: oficial
        ? 'Use esta classificação no motor de Transação Tributária; os benefícios dependem da modalidade/editais vigentes.'
        : 'O FiscalTribe não transforma CAPAG estimado em desconto financeiro. Confirme a classificação oficial antes de fechar uma negociação.',
      passos: [
        'Acessar REGULARIZE > Negociar Dívida > Capacidade de Pagamento',
        'Confirmar a classificação A, B, C ou D',
        'Se necessário, avaliar pedido de revisão da capacidade de pagamento',
        'Enviar o CAPAG confirmado ao simulador de Transação Tributária',
      ],
    }

    resultado.oportunidades = [{
      id: `CAPAG_${Date.now()}`,
      tese: `CAPAG ${capag} — ${faixa.label}`,
      descricao: recomendacao.descricao,
      score: scoreOp,
      grauConfianca: resultado.grauConfianca,
      evidencias: [],
      fundamentacao: FUNDAMENTACAO,
      calculos: {
        totalDivida,
        capag,
        faixa,
        capagOficial: oficial,
        // Mantidos como zero para impedir que módulos antigos confundam CAPAG com desconto.
        totalDesconto: 0,
        descontoMultas: 0,
        descontoJuros: 0,
        creditoTotal: 0,
        creditoEstimado: 0,
        economiaEstimada: 0,
        memoriaCalculo: [
          `Dívida analisada: R$ ${totalDivida.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,
          `CAPAG ${capag} — ${faixa.label}`,
          oficial ? 'Classificação oficial/informada.' : 'Classificação estimada; confirmar no REGULARIZE.',
          'Nenhum desconto foi calculado neste motor. O desconto pertence ao motor de Transação e depende da modalidade vigente e da composição real da dívida.',
        ],
      },
      recomendacao,
    }]

    resultado.calculos = {
      valorAnalisado: totalDivida,
      baseCalculo: totalDivida,
      creditoEstimado: 0,
      economiaEstimada: 0,
      moeda: 'BRL',
      totalDocumentos: 1,
      totalCompetencias: 0,
      capag,
      capagOficial: oficial,
      memoriaCalculo: resultado.oportunidades[0].calculos.memoriaCalculo,
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo: 70,
      completudeDocs: oficial ? 95 : 60,
      consistencia: oficial ? 95 : 70,
      oportunidadesFound: 70,
    })

    resultado.riscos = [{
      descricao: oficial ? 'CAPAG pode mudar conforme atualização das bases da PGFN.' : 'CAPAG estimado pode divergir da classificação oficial da PGFN.',
      nivel: oficial ? 'BAIXO' : 'ALTO',
      mitigacao: 'Confirmar no REGULARIZE imediatamente antes da negociação.',
    }]

    resultado.recomendacaoPrincipal = recomendacao
    resultado.todasRecomendacoes = [recomendacao]
    resultado.relatorio = {
      resumoExecutivo: `CAPAG ${capag} — ${faixa.label}. ${oficial ? 'Classificação oficial/informada.' : 'Estimativa de triagem.'}`,
      objetivoAnalise: 'Classificar a capacidade de pagamento sem criar descontos fictícios.',
      escopoAnalise: `Dívida analisada: R$ ${totalDivida.toLocaleString('pt-BR',{minimumFractionDigits:2})}.`,
      diagnosticoTecnico: resultado.diagnostico.observacoes,
      oportunidadesTexto: recomendacao.descricao,
      riscosTexto: resultado.riscos.map(r=>`[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: 'Lei 13.988/2020; Portaria PGFN 6.757/2022; art. 171 CTN.',
      recomendacoesTexto: recomendacao.descricao,
      planoAcao: recomendacao.passos,
      conclusaoExecutiva: `CAPAG ${capag}. O cálculo financeiro deve ser feito pelo motor de Transação com a composição real da CDA e regras vigentes.`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id:'CAPAG_001', descricao:'Classificação CAPAG', resultado:`${capag}${oficial?' oficial/informado':' estimado'}` },
        { id:'CAPAG_002', descricao:'Separação CAPAG x desconto', resultado:'Nenhum desconto financeiro calculado no motor CAPAG' },
      ],
      documentosUtilizados: [],
      legislacaoVersao: BaseTributaria?.versao?.codigo || 'N/I',
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, { regime: cliente?.regime || '', capag, totalDivida })
  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de CAPAG: ${erro.message}`)
  }
}

export default analisarCAPAG
