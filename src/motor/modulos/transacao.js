/**
 * modulos/transacao.js — e-FiscalTribe
 * Motor único de Transação Tributária / PGFN.
 *
 * REVISÃO 04/10/2026:
 * — usa composição REAL da CDA quando disponível;
 * — não presume 45% principal / 30% multa / 25% juros;
 * — CAPAG A/B não recebe desconto automático no Edital 6/2026;
 * — CAPAG C/D: desconto é potencial ("até"), limitado aos acréscimos e ao teto global;
 * — regras operacionais ficam centralizadas em regras_pgfn.js.
 */

import {
  criarResultado,
  finalizarResultado,
  resultadoErro,
  STATUS_ANALISE,
  GRAU_CONFIANCA,
} from '../contratos/ResultadoPadrao.js'

import { scoreOportunidade, scoreMotor } from '../contratos/Score.js'
import {
  PGFN_RULESET,
  calcularLimiteMaximoDesconto,
  regrasCapagEdital6,
  regrasDificilRecuperacao,
} from './regras_pgfn.js'

const FUNDAMENTACAO = {
  teseJuridica: 'Transação Tributária — Negociação de Dívida Ativa com a PGFN',
  resumo: 'Simulação indicativa com dados documentais da CDA e regras vigentes cadastradas no FiscalTribe. O resultado oficial deve ser confirmado no REGULARIZE/SISPAR.',
  baseLegal: [
    { norma: 'Lei 13.988/2020', descricao: 'Marco legal da transação tributária' },
    { norma: 'Lei 14.375/2022', descricao: 'Alterações dos limites e instrumentos de transação' },
    { norma: 'Portaria PGFN 6.757/2022', descricao: 'Regulamentação da transação na cobrança da União e FGTS' },
    { norma: 'Edital PGDAU 6/2026 + Edital PGDAU 10/2026', descricao: 'Modalidades por adesão vigentes em 04/10/2026' },
    { norma: 'Art. 171 CTN', descricao: 'Transação tributária' },
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: 'N/A',
  riscoContestacao: 5,
}

const MODALIDADES = {
  EDITAL_6_CAPAG: {
    id: 'EDITAL_6_CAPAG',
    nome: 'Edital 6/2026 — Capacidade de Pagamento',
    tipo: 'adesao',
  },
  EDITAL_6_DIFICIL: {
    id: 'EDITAL_6_DIFICIL',
    nome: 'Edital 6/2026 — Difícil Recuperação / Irrecuperável',
    tipo: 'adesao',
  },
  TIS: {
    id: 'TIS',
    nome: 'Transação Individual Simplificada',
    tipo: 'individual_simplificada',
  },
  INDIVIDUAL: {
    id: 'INDIVIDUAL',
    nome: 'Transação Individual',
    tipo: 'individual',
  },
  CONTENCIOSO: {
    id: 'CONTENCIOSO',
    nome: 'Transação no Contencioso',
    tipo: 'contencioso',
  },
}

function determinarModalidadePadrao(totalDivida, emContencioso = false) {
  if (emContencioso) return MODALIDADES.CONTENCIOSO
  if (totalDivida >= 10_000_000) return MODALIDADES.INDIVIDUAL
  if (totalDivida > 1_000_000 && totalDivida < 10_000_000) return MODALIDADES.TIS
  return MODALIDADES.EDITAL_6_CAPAG
}

function parcelaSemAtualizacao(saldo, n) {
  if (!n || n <= 0) return 0
  return saldo / n
}

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

export async function analisarTransacao(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio = Date.now()
  const modulo = 'TRANSACAO'
  const resultado = criarResultado(modulo)
  resultado.descricaoModulo = 'Transação Tributária PGFN — dados reais da CDA + regras vigentes'

  try {
    const {
      totalDivida = 0,
      valorPrincipal = 0,
      valorMultas = 0,
      valorJuros = 0,
      valorEncargos = 0,
      capag = null,
      capagOficial = false,
      faturamentoMensal = 0,
      emContencioso = false,
      dificilRecuperacao = false,
      modalidadeForced = null,
      nParcelasDesejadas = null,
      tipoPessoa = 'pj_demais',
      tipoDebito = '',
      emRecuperacaoJudicial = false,
      dataInscricao = null,
      cdas = [],
    } = opcoes

    if (!totalDivida) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro = 'Informe o total da dívida ou selecione CDA(s) cadastrada(s).'
      return finalizarResultado(resultado, inicio)
    }

    const principal = Number(valorPrincipal) || 0
    const multas = Number(valorMultas) || 0
    const juros = Number(valorJuros) || 0
    const encargos = Number(valorEncargos) || 0
    const acrescimos = multas + juros + encargos
    const composicaoCompleta = principal > 0 && acrescimos > 0

    const modalidade = modalidadeForced && MODALIDADES[modalidadeForced]
      ? MODALIDADES[modalidadeForced]
      : dificilRecuperacao
        ? MODALIDADES.EDITAL_6_DIFICIL
        : determinarModalidadePadrao(totalDivida, emContencioso)

    let entradaPct = 0
    let entradaParcelas = 0
    let maxParcelas = 0
    let limiteGlobalDescontoPct = 0
    let permiteDesconto = false
    let observacaoRegra = ''
    let regra = null

    if (modalidade.id === 'EDITAL_6_CAPAG') {
      regra = regrasCapagEdital6({ capag, tipoPessoa, tipoDebito, emRecuperacaoJudicial })
      entradaPct = regra.entradaPct
      entradaParcelas = regra.entradaParcelas
      maxParcelas = regra.saldoParcelasMax
      limiteGlobalDescontoPct = regra.limiteGlobalDescontoPct
      permiteDesconto = regra.permiteDesconto
      observacaoRegra = regra.observacao
    } else if (modalidade.id === 'EDITAL_6_DIFICIL') {
      regra = regrasDificilRecuperacao({ tipoPessoa, tipoDebito, emRecuperacaoJudicial })
      entradaPct = regra.entradaPct
      entradaParcelas = regra.entradaParcelas
      maxParcelas = regra.saldoParcelasMax
      limiteGlobalDescontoPct = regra.limiteGlobalDescontoPct
      permiteDesconto = true
      observacaoRegra = 'Difícil recuperação/irrecuperável: a elegibilidade depende dos critérios objetivos do Edital 6/2026; não basta selecionar a modalidade.'
    } else if (modalidade.id === 'TIS') {
      maxParcelas = 120
      limiteGlobalDescontoPct = ['pf','mei','me','epp'].includes(tipoPessoa) || emRecuperacaoJudicial ? 0.70 : 0.65
      permiteDesconto = ['C','D'].includes(String(capag || '').toUpperCase())
      observacaoRegra = 'Transação Individual Simplificada: proposta entre R$ 1 milhão e R$ 10 milhões. Condições são negociadas/propostas e dependem da capacidade de pagamento; não há desconto automático.'
    } else if (modalidade.id === 'INDIVIDUAL') {
      maxParcelas = 120
      limiteGlobalDescontoPct = ['pf','mei','me','epp'].includes(tipoPessoa) || emRecuperacaoJudicial ? 0.70 : 0.65
      permiteDesconto = ['C','D'].includes(String(capag || '').toUpperCase())
      observacaoRegra = 'Transação Individual: negociação personalizada. O FiscalTribe mostra limites e capacidade financeira, não substitui a proposta/homologação da PGFN.'
    } else {
      maxParcelas = 72
      observacaoRegra = 'Contencioso: as condições dependem do edital/tese específica. Não aplicar desconto genérico sem identificar o edital correspondente.'
    }

    let limite = {
      composicaoCompleta,
      acrescimosInformados: acrescimos,
      tetoSemPrincipal: Math.max(0, totalDivida - principal),
      tetoGlobal: totalDivida * limiteGlobalDescontoPct,
      descontoMaximoTeorico: 0,
    }

    if (permiteDesconto && limiteGlobalDescontoPct > 0 && composicaoCompleta) {
      limite = calcularLimiteMaximoDesconto({
        totalDivida,
        valorPrincipal: principal,
        valorMultas: multas,
        valorJuros: juros,
        valorEncargos: encargos,
        limiteGlobalPct: limiteGlobalDescontoPct,
      })
    }

    // "Até" não é promessa: usamos o teto como cenário máximo teórico.
    const descontoMaximoTeorico = permiteDesconto ? limite.descontoMaximoTeorico : 0
    const saldoCenarioMax = totalDivida - descontoMaximoTeorico
    const entrada = entradaPct > 0 ? totalDivida * entradaPct : 0
    const saldoAParcelar = Math.max(0, saldoCenarioMax - entrada)
    const nParcelas = Math.max(1, Math.min(Number(nParcelasDesejadas) || maxParcelas || 1, maxParcelas || 1))
    const parcelaBase = parcelaSemAtualizacao(saldoAParcelar, nParcelas)
    const comprometimento = faturamentoMensal > 0 ? (parcelaBase / faturamentoMensal) * 100 : null

    const faltas = []
    if (!composicaoCompleta && permiteDesconto) faltas.push('composição completa da CDA (principal, multa, juros e encargo)')
    if (['EDITAL_6_CAPAG','TIS','INDIVIDUAL'].includes(modalidade.id) && !capag) faltas.push('CAPAG')
    if (!tipoPessoa) faltas.push('tipo de contribuinte')

    resultado.diagnostico = {
      totalDocumentosAnalisados: cdas.length || 1,
      totalItensAnalisados: cdas.length || 1,
      competenciasAnalisadas: [],
      periodoInicio: '',
      periodoFim: '',
      situacoesEncontradas: [
        `${modalidade.nome}`,
        `Dívida analisada: R$ ${fmt(totalDivida)}`,
        composicaoCompleta ? 'Composição documental disponível' : 'Composição documental incompleta',
      ],
      observacoes: [
        `Principal: ${principal ? 'R$ '+fmt(principal) : 'não informado'}`,
        `Multas: ${multas ? 'R$ '+fmt(multas) : 'não informado'}`,
        `Juros: ${juros ? 'R$ '+fmt(juros) : 'não informado'}`,
        `Encargos: ${encargos ? 'R$ '+fmt(encargos) : 'não informado'}`,
        `CAPAG: ${capag || 'não informado'}${capag && !capagOficial ? ' (confirmar no REGULARIZE)' : ''}`,
        observacaoRegra,
      ].join('. '),
    }

    resultado.grauConfianca = faltas.length === 0 && (capagOficial || !['EDITAL_6_CAPAG','TIS','INDIVIDUAL'].includes(modalidade.id))
      ? GRAU_CONFIANCA.ALTO
      : GRAU_CONFIANCA.MEDIO

    resultado.justificativaConfianca = faltas.length
      ? `Simulação parcial. Falta confirmar: ${faltas.join(', ')}.`
      : 'Simulação baseada na composição documental informada e na regra cadastrada. O valor final oficial deve ser confirmado no REGULARIZE/SISPAR.'

    const scoreOp = scoreOportunidade({
      modulo,
      label: modalidade.nome,
      qualidadeDados: composicaoCompleta ? 90 : 55,
      forcaJuridica: 95,
      volumeEvidencias: cdas.length ? 90 : 60,
      valorCredito: descontoMaximoTeorico > 0 ? Math.min(100,(descontoMaximoTeorico/20000)*100) : 0,
      riscoContestacao: FUNDAMENTACAO.riscoContestacao,
    })

    const tituloDesconto = descontoMaximoTeorico > 0
      ? `Teto estimado de desconto: R$ ${fmt(descontoMaximoTeorico)}`
      : permiteDesconto && !composicaoCompleta
        ? 'Desconto em reais: a confirmar com a composição da CDA'
        : 'Sem desconto automático calculado'

    const recomendacao = {
      tipo: 'ORIENTACAO',
      prioridade: 'ALTA',
      titulo: `${modalidade.nome} — ${tituloDesconto}`,
      descricao: [
        observacaoRegra,
        descontoMaximoTeorico > 0
          ? `Cenário máximo teórico: redução de até R$ ${fmt(descontoMaximoTeorico)}, respeitando os acréscimos existentes e o teto global.`
          : '',
        faltas.length ? `Antes de fechar a simulação, confirmar: ${faltas.join(', ')}.` : '',
      ].filter(Boolean).join(' '),
      passos: [
        'Confirmar no REGULARIZE/SISPAR quais inscrições estão elegíveis',
        ...(capag ? [] : ['Consultar o CAPAG oficial']),
        ...(composicaoCompleta ? [] : ['Usar os valores reais da CDA/REGULARIZE: principal, multa, juros e encargo']),
        'Confirmar a modalidade/editais efetivamente disponíveis na data da adesão',
        'Simular no SISPAR e confrontar o resultado oficial com a memória do FiscalTribe',
      ],
    }

    resultado.oportunidades = [{
      id: `TRANSACAO_${Date.now()}`,
      tese: modalidade.nome,
      descricao: recomendacao.descricao,
      score: scoreOp,
      grauConfianca: resultado.grauConfianca,
      evidencias: cdas.map(c=>({ tipo:'CDA', identificador:c.numero || c.numero_cda || '' })),
      fundamentacao: FUNDAMENTACAO,
      calculos: {
        totalDivida,
        principal,
        multas,
        juros,
        encargos,
        acrescimos,
        capag,
        capagOficial,
        modalidade: modalidade.id,
        permiteDesconto,
        limiteGlobalDescontoPct,
        descontoMaximoTeorico,
        totalDesconto: descontoMaximoTeorico,
        valorAposDesconto: saldoCenarioMax,
        entrada,
        entradaPct,
        entradaParcelas,
        saldoAParcelar,
        parcelaSemJuros: parcelaBase,
        maxParcelas,
        nParcelas,
        comprometimento,
        composicaoCompleta,
        regra,
        creditoTotal: descontoMaximoTeorico,
        creditoEstimado: descontoMaximoTeorico,
        economiaEstimada: descontoMaximoTeorico,
        memoriaCalculo: [
          `Dívida total: R$ ${fmt(totalDivida)}`,
          principal ? `Principal documental: R$ ${fmt(principal)}` : 'Principal documental não informado',
          `Acréscimos documentais: R$ ${fmt(acrescimos)} (multas R$ ${fmt(multas)} + juros R$ ${fmt(juros)} + encargos R$ ${fmt(encargos)})`,
          limiteGlobalDescontoPct ? `Teto global da modalidade usado na triagem: ${(limiteGlobalDescontoPct*100).toFixed(0)}%` : 'Sem teto genérico aplicado',
          permiteDesconto && composicaoCompleta ? `Desconto máximo teórico: R$ ${fmt(descontoMaximoTeorico)}` : 'Desconto em reais não calculado automaticamente',
          entradaPct ? `Entrada nominal da modalidade: ${(entradaPct*100).toFixed(0)}% = R$ ${fmt(entrada)} (sem desconto na entrada)` : 'Condição de entrada depende da proposta/modalidade',
          maxParcelas ? `Prazo de referência: até ${maxParcelas} parcelas de saldo` : 'Prazo depende do edital/proposta',
          'Parcelas oficiais sofrem atualização prevista pela PGFN; o valor exibido sem atualização é referência de fluxo de caixa.',
        ],
      },
      recomendacao,
    }]

    resultado.calculos = {
      valorAnalisado: totalDivida,
      baseCalculo: totalDivida,
      creditoEstimado: descontoMaximoTeorico,
      economiaEstimada: descontoMaximoTeorico,
      moeda: 'BRL',
      totalDocumentos: cdas.length || 1,
      totalCompetencias: 0,
      descontoEstimado: descontoMaximoTeorico,
      valorAposTransacao: saldoCenarioMax,
      parcelaEstimada: parcelaBase,
      maxParcelas,
      memoriaCalculo: resultado.oportunidades[0].calculos.memoriaCalculo,
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo: 75,
      completudeDocs: composicaoCompleta ? 95 : 55,
      consistencia: faltas.length ? 65 : 90,
      oportunidadesFound: 80,
    })

    resultado.riscos = [
      {
        descricao: 'Desconto indicado como "até" não é direito automático ao teto máximo.',
        nivel: 'MEDIO',
        mitigacao: 'Confirmar o resultado oficial no SISPAR conforme CAPAG, recuperabilidade e modalidade.',
      },
      {
        descricao: 'Regras de editais podem ser alteradas, prorrogadas ou encerradas.',
        nivel: 'MEDIO',
        mitigacao: `Atualizar o catálogo PGFN. Versão atual do FiscalTribe: ${PGFN_RULESET.versao}.`,
      },
      {
        descricao: 'Negociar CDA prescrita/decadente sem análise jurídica prévia pode ser economicamente inadequado.',
        nivel: 'ALTO',
        mitigacao: 'Executar primeiro o diagnóstico de Dívida Ativa e enviar à transação somente CDAs ativas.',
      },
    ]

    resultado.recomendacaoPrincipal = recomendacao
    resultado.todasRecomendacoes = [recomendacao]
    resultado.relatorio = {
      resumoExecutivo: `${modalidade.nome}. Dívida: R$ ${fmt(totalDivida)}. ${tituloDesconto}.`,
      objetivoAnalise: 'Simular transação sem inventar composição da dívida.',
      escopoAnalise: `${cdas.length || 1} CDA(s)/conjunto analisado.`,
      diagnosticoTecnico: resultado.diagnostico.observacoes,
      oportunidadesTexto: recomendacao.descricao,
      riscosTexto: resultado.riscos.map(r=>`[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: 'Lei 13.988/2020; Lei 14.375/2022; Portaria PGFN 6.757/2022; Editais PGFN vigentes cadastrados.',
      recomendacoesTexto: recomendacao.descricao,
      planoAcao: recomendacao.passos,
      conclusaoExecutiva: descontoMaximoTeorico > 0
        ? `Há potencial de redução de até R$ ${fmt(descontoMaximoTeorico)} no cenário máximo teórico. Confirmar no SISPAR.`
        : 'Não foi criado desconto fictício. Complemente os dados e confirme a modalidade oficial.',
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id:'TRANS_001', descricao:'Modalidade de referência', resultado: modalidade.nome },
        { id:'TRANS_002', descricao:'Composição documental', resultado: composicaoCompleta ? 'Completa' : 'Incompleta' },
        { id:'TRANS_003', descricao:'Teto de desconto', resultado: descontoMaximoTeorico ? `R$ ${descontoMaximoTeorico.toFixed(2)}` : 'Não calculado/zero' },
        { id:'TRANS_004', descricao:'Versão de regras PGFN', resultado: PGFN_RULESET.versao },
      ],
      documentosUtilizados: cdas.map(c=>({ tipo:'CDA', identificador:c.numero || c.numero_cda || 'não identificado' })),
      legislacaoVersao: BaseTributaria?.versao?.codigo || 'N/I',
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, {
      regime: cliente?.regime || '',
      capag: capag || '',
      totalDivida,
      totalDesconto: descontoMaximoTeorico,
      modalidade: modalidade.id,
    })
  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de Transação: ${erro.message}`)
  }
}

export default analisarTransacao
