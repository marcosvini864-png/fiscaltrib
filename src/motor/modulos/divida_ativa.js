/**
 * modulos/divida_ativa.js — e-FiscalTribe
 * Motor de Dívida Ativa — Orquestrador de CDAs.
 *
 * REVISÃO 04/10/2026:
 * 1) normaliza CDAs vindas do ImportarCDA/Supabase;
 * 2) analisa prescrição/decadência ANTES da transação;
 * 3) envia para transação apenas as CDAs classificadas como ativas;
 * 4) soma principal, multa, juros e encargo reais das CDAs ativas;
 * 5) CAPAG não calcula mais desconto; desconto pertence ao motor Transação.
 */

import {
  criarResultado,
  finalizarResultado,
  resultadoErro,
  STATUS_ANALISE,
  GRAU_CONFIANCA,
} from '../contratos/ResultadoPadrao.js'

import { scoreOportunidade, scoreMotor } from '../contratos/Score.js'

import { analisarPrescricao } from './prescricao.js'
import { analisarDecadencia } from './decadencia.js'
import { analisarCAPAG } from './capag.js'
import { analisarTransacao } from './transacao.js'

const FUNDAMENTACAO = {
  teseJuridica: 'Análise Integrada de Dívida Ativa — Prescrição, Decadência, CAPAG e Transação',
  resumo: 'Analisa CDAs, prioriza hipóteses de extinção e somente depois encaminha o passivo remanescente para simulação de transação.',
  baseLegal: [
    { norma: 'Art. 174 CTN', descricao: 'Prescrição do crédito tributário' },
    { norma: 'Art. 150 e 173 CTN', descricao: 'Decadência' },
    { norma: 'Art. 40 Lei 6.830/1980', descricao: 'Prescrição intercorrente' },
    { norma: 'Lei 13.988/2020', descricao: 'Transação tributária federal' },
    { norma: 'Portaria PGFN 6.757/2022', descricao: 'Transação e capacidade de pagamento' },
    { norma: 'Tema 566 STJ', descricao: 'Prescrição intercorrente' },
    { norma: 'Tema 444 STJ', descricao: 'Prescrição do redirecionamento' },
  ],
  via: 'ADMINISTRATIVA_JUDICIAL',
  prazoRetroativo: 'Verificar cada CDA',
  riscoContestacao: 20,
}

const n = v => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').trim()
  if (!s) return 0
  if (s.includes(',') && s.includes('.')) return Number(s.replace(/\./g,'').replace(',','.')) || 0
  if (s.includes(',')) return Number(s.replace(',','.')) || 0
  return Number(s) || 0
}

const fmtVal = v => n(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })

function normalizarCDA(cda = {}, idx = 0) {
  return {
    ...cda,
    id: cda.id || cda.numero_cda || cda.numero || `CDA_${idx}`,
    numero: cda.numero || cda.numero_cda || `CDA ${idx + 1}`,
    tributo: cda.tributo || cda.tipo_debito || cda.tipoTributo || '',
    competencia: cda.competencia || cda.periodo_divida_inicio || '',
    valorTotal: n(cda.valorTotal ?? cda.valor_total ?? cda.valor),
    valorPrincipal: n(cda.valorPrincipal ?? cda.principal_atualizado ?? cda.valor_principal),
    valorMultas: n(cda.valorMultas ?? cda.multa ?? cda.valor_multas),
    valorJuros: n(cda.valorJuros ?? cda.juros ?? cda.valor_juros),
    valorEncargos: n(cda.valorEncargos ?? cda.encargo_legal ?? cda.valor_encargos),
    dataInscricao: cda.dataInscricao || cda.data_inscricao || null,
    dataFatoGerador: cda.dataFatoGerador || cda.data_fato_gerador || null,
    dataConstituicao: cda.dataConstituicao || cda.data_constituicao_definitiva || cda.dataInscricao || cda.data_inscricao || null,
    dataAjuizamento: cda.dataAjuizamento || cda.data_ajuizamento || null,
    dataCitacao: cda.dataCitacao || cda.data_citacao || null,
    dataUltimaMovimentacao: cda.dataUltimaMovimentacao || cda.data_ultima_movimentacao || null,
    redirecionado: !!cda.redirecionado,
    dataRedirecionamento: cda.dataRedirecionamento || cda.data_redirecionamento || null,
    possuiExecucaoFiscal: !!(cda.possui_execucao_fiscal || cda.data_ajuizamento || cda.dataAjuizamento),
    tipoDebito: cda.tipo_debito || cda.tipoDebito || '',
  }
}

function cdaParaDivida(cda) {
  return {
    id: cda.numero,
    numero: cda.numero,
    valor: cda.valorTotal,
    dataConstituicao: cda.dataConstituicao,
    dataCitacao: cda.dataCitacao,
    dataAjuizamento: cda.dataAjuizamento,
    dataUltimaMovimentacao: cda.dataUltimaMovimentacao,
    redirecionado: cda.redirecionado,
    dataRedirecionamento: cda.dataRedirecionamento,
  }
}

function cdaParaLancamento(cda) {
  return {
    id: cda.numero,
    numero: cda.numero,
    tributo: cda.tributo,
    valor: cda.valorTotal,
    dataFatoGerador: cda.dataFatoGerador || (cda.competencia && /^\d{4}-\d{2}$/.test(cda.competencia) ? `${cda.competencia}-01` : null),
    dataLancamento: cda.dataConstituicao || cda.dataInscricao,
    dolo: !!cda.dolo,
  }
}

function encontrouCDA(resultado, numero) {
  if (!resultado || !numero) return false
  return resultado?.oportunidades?.some(o =>
    String(o.id || '').includes(numero) ||
    String(o.descricao || '').includes(numero) ||
    (o.calculos?.cdasAfetadas || []).some(c => String(c.numero || c.id || '').includes(numero))
  )
}

function classificarCDA(cda, resultPrescricao, resultDecadencia) {
  const decadente = encontrouCDA(resultDecadencia, cda.numero)
  const prescrita = encontrouCDA(resultPrescricao, cda.numero)

  if (decadente) return { status:'DECADENTE', label:'🔴 Decadente — revisar/extinguir antes de negociar', prioridade:1 }
  if (prescrita) return { status:'PRESCRITA', label:'🟠 Prescrita — revisar/extinguir antes de negociar', prioridade:2 }
  return { status:'ATIVA', label:'🟡 Ativa — apta a seguir para análise de transação', prioridade:3 }
}

function somarComposicao(cdas) {
  return cdas.reduce((acc,c) => {
    acc.total += c.valorTotal
    acc.principal += c.valorPrincipal
    acc.multas += c.valorMultas
    acc.juros += c.valorJuros
    acc.encargos += c.valorEncargos
    return acc
  }, { total:0, principal:0, multas:0, juros:0, encargos:0 })
}

export async function analisarDividaAtiva(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio = Date.now()
  const modulo = 'DIVIDA_ATIVA'
  const resultado = criarResultado(modulo)
  resultado.descricaoModulo = 'Análise Integrada de Dívida Ativa — Prescrição, Decadência, CAPAG e Transação'

  try {
    const financeiro = opcoes.financeiro || {}
    const cdasEntrada = (opcoes.cdas || []).map(normalizarCDA)

    if (cdasEntrada.length === 0 && !financeiro.totalDivida) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro = 'Informe as CDAs ou o total da dívida.'
      return finalizarResultado(resultado, inicio)
    }

    const totalDividaDocumental = cdasEntrada.length
      ? cdasEntrada.reduce((s,c)=>s+c.valorTotal,0)
      : n(financeiro.totalDivida)

    resultado.diagnostico = {
      totalDocumentosAnalisados: cdasEntrada.length,
      totalItensAnalisados: cdasEntrada.length,
      competenciasAnalisadas: [...new Set(cdasEntrada.map(c=>c.competencia).filter(Boolean))],
      periodoInicio: '',
      periodoFim: '',
      situacoesEncontradas: [`${cdasEntrada.length} CDA(s) — total documental R$ ${fmtVal(totalDividaDocumental)}`],
      observacoes: 'Fluxo: primeiro prescrição/decadência; depois CAPAG; somente o saldo ativo segue para transação.',
    }

    // 1) Extinção primeiro.
    const [resultPrescricao, resultDecadencia] = await Promise.all([
      cdasEntrada.length
        ? analisarPrescricao([], cliente, { dividas: cdasEntrada.map(cdaParaDivida) }, BaseTributaria)
        : Promise.resolve(null),
      cdasEntrada.length
        ? analisarDecadencia([], cliente, { lancamentos: cdasEntrada.map(cdaParaLancamento) }, BaseTributaria)
        : Promise.resolve(null),
    ])

    const cdasClassificadas = cdasEntrada.map(cda => ({
      ...cda,
      classificacao: classificarCDA(cda, resultPrescricao, resultDecadencia),
      valor: cda.valorTotal,
    })).sort((a,b)=>a.classificacao.prioridade-b.classificacao.prioridade)

    const cdasDecadentes = cdasClassificadas.filter(c=>c.classificacao.status==='DECADENTE')
    const cdasPrescritas = cdasClassificadas.filter(c=>c.classificacao.status==='PRESCRITA')
    const cdasAtivas = cdasClassificadas.filter(c=>c.classificacao.status==='ATIVA')

    const valorDecadente = cdasDecadentes.reduce((s,c)=>s+c.valorTotal,0)
    const valorPrescrito = cdasPrescritas.reduce((s,c)=>s+c.valorTotal,0)
    const valorAtivo = cdasAtivas.length
      ? cdasAtivas.reduce((s,c)=>s+c.valorTotal,0)
      : (cdasEntrada.length ? 0 : totalDividaDocumental)
    const valorExtinguivel = valorDecadente + valorPrescrito

    const compAtiva = cdasAtivas.length
      ? somarComposicao(cdasAtivas)
      : {
          total: valorAtivo,
          principal: n(financeiro.valorPrincipal),
          multas: n(financeiro.valorMultas),
          juros: n(financeiro.valorJuros),
          encargos: n(financeiro.valorEncargos),
        }

    // 2) CAPAG e Transação só sobre o saldo ativo/remanescente.
    let resultCAPAG = null
    let resultTransacao = null

    if (valorAtivo > 0) {
      resultCAPAG = await analisarCAPAG([], cliente, {
        totalDivida: valorAtivo,
        faturamentoAnual: n(financeiro.faturamentoAnual),
        bensPenhoraveis: n(financeiro.bensPenhoraveis),
        emRecuperacao: !!financeiro.emRecuperacao,
        inadimplente: true,
        capagInformado: financeiro.capag || null,
      }, BaseTributaria)

      const capagEfetivo =
        financeiro.capag ||
        resultCAPAG?.calculos?.capag ||
        resultCAPAG?.oportunidades?.[0]?.calculos?.capag ||
        null

      resultTransacao = await analisarTransacao([], cliente, {
        totalDivida: valorAtivo,
        valorPrincipal: compAtiva.principal,
        valorMultas: compAtiva.multas,
        valorJuros: compAtiva.juros,
        valorEncargos: compAtiva.encargos,
        capag: capagEfetivo,
        capagOficial: !!financeiro.capag,
        faturamentoMensal: n(financeiro.faturamentoMensal),
        emContencioso: !!financeiro.emContencioso,
        dificilRecuperacao: !!financeiro.dificilRecuperacao,
        modalidadeForced: financeiro.modalidadeTransacao || null,
        nParcelasDesejadas: financeiro.nParcelasDesejadas || null,
        tipoPessoa: financeiro.tipoPessoa || cliente?.tipoPessoa || 'pj_demais',
        tipoDebito: financeiro.tipoDebito || cdasAtivas[0]?.tipoDebito || '',
        emRecuperacaoJudicial: !!financeiro.emRecuperacao,
        dataInscricao: cdasAtivas[0]?.dataInscricao || null,
        cdas: cdasAtivas,
      }, BaseTributaria)
    }

    const oportunidades = []
    let creditoTotal = 0

    if (resultDecadencia?.oportunidades?.length && valorDecadente > 0) {
      const credDecad = resultDecadencia.calculos?.creditoEstimado || valorDecadente
      creditoTotal += credDecad
      oportunidades.push({
        id:`DA_DECAD_${Date.now()}`,
        tese:'Decadência — revisar antes de negociar',
        descricao:`${cdasDecadentes.length} CDA(s) sinalizada(s) com potencial de decadência. Valor documental: R$ ${fmtVal(valorDecadente)}.`,
        score:scoreOportunidade({modulo,label:'Decadência',qualidadeDados:85,forcaJuridica:90,volumeEvidencias:75,valorCredito:Math.min(100,(credDecad/50000)*100),riscoContestacao:20}),
        grauConfianca:GRAU_CONFIANCA.ALTO,
        evidencias:[],
        fundamentacao:{ teseJuridica:'Decadência — CTN', baseLegal:FUNDAMENTACAO.baseLegal.slice(1,2) },
        calculos:{ creditoTotal:credDecad, creditoEstimado:credDecad, economiaTotal:credDecad, cdasAfetadas:cdasDecadentes.map(c=>({numero:c.numero,valor:c.valorTotal})) },
        recomendacao:{
          tipo:'ACAO_IMEDIATA', prioridade:'URGENTE',
          titulo:`Revisar decadência em ${cdasDecadentes.length} CDA(s)`,
          descricao:'Não negociar automaticamente uma CDA potencialmente extinguível.',
          passos:['Conferir fato gerador e constituição definitiva','Validar a hipótese legal aplicável','Definir a medida administrativa/judicial cabível antes da negociação'],
        },
      })
    }

    if (resultPrescricao?.oportunidades?.length && valorPrescrito > 0) {
      const credPresc = resultPrescricao.calculos?.creditoEstimado || valorPrescrito
      creditoTotal += credPresc
      oportunidades.push({
        id:`DA_PRESC_${Date.now()+1}`,
        tese:'Prescrição — revisar antes de negociar',
        descricao:`${cdasPrescritas.length} CDA(s) sinalizada(s) com potencial de prescrição. Valor documental: R$ ${fmtVal(valorPrescrito)}.`,
        score:scoreOportunidade({modulo,label:'Prescrição',qualidadeDados:80,forcaJuridica:88,volumeEvidencias:70,valorCredito:Math.min(100,(credPresc/50000)*100),riscoContestacao:25}),
        grauConfianca:GRAU_CONFIANCA.ALTO,
        evidencias:[],
        fundamentacao:{ teseJuridica:'Prescrição — CTN/LEF', baseLegal:[FUNDAMENTACAO.baseLegal[0],FUNDAMENTACAO.baseLegal[2]] },
        calculos:{ creditoTotal:credPresc, creditoEstimado:credPresc, economiaTotal:credPresc, cdasAfetadas:cdasPrescritas.map(c=>({numero:c.numero,valor:c.valorTotal})) },
        recomendacao:{
          tipo:'ACAO_IMEDIATA', prioridade:'URGENTE',
          titulo:`Revisar prescrição em ${cdasPrescritas.length} CDA(s)`,
          descricao:'Validar a íntegra do processo e causas suspensivas/interruptivas antes de negociar.',
          passos:['Consultar os autos','Conferir citação e movimentações','Validar prescrição ordinária/intercorrente e eventual redirecionamento'],
        },
      })
    }

    if (resultTransacao?.oportunidades?.length && valorAtivo > 0) {
      const opTrans = resultTransacao.oportunidades[0]
      const economiaTrans = n(opTrans.calculos?.creditoTotal)
      creditoTotal += economiaTrans
      oportunidades.push({
        ...opTrans,
        id:`DA_TRANS_${Date.now()+2}`,
        descricao:`${cdasAtivas.length || 1} CDA(s)/saldo ativo de R$ ${fmtVal(valorAtivo)} encaminhado para transação. ${opTrans.descricao || ''}`,
      })
    }

    const temDatasEssenciais = cdasEntrada.length === 0 || cdasEntrada.every(c =>
      c.dataConstituicao && (c.dataCitacao || c.dataAjuizamento || c.dataUltimaMovimentacao)
    )
    resultado.grauConfianca = temDatasEssenciais ? GRAU_CONFIANCA.ALTO : GRAU_CONFIANCA.MEDIO
    resultado.justificativaConfianca = temDatasEssenciais
      ? 'Dados jurídicos suficientes para triagem integrada; validar documentos originais antes de qualquer medida.'
      : 'Há datas jurídicas faltantes; prescrição/decadência podem ficar inconclusivas.'

    resultado.oportunidades = oportunidades

    const transCalc = resultTransacao?.calculos || resultTransacao?.oportunidades?.[0]?.calculos || {}
    const capagCalc = resultCAPAG?.calculos || resultCAPAG?.oportunidades?.[0]?.calculos || {}

    resultado.calculos = {
      valorAnalisado: totalDividaDocumental,
      baseCalculo: totalDividaDocumental,
      creditoEstimado: creditoTotal,
      economiaEstimada: creditoTotal,
      moeda:'BRL',
      totalDocumentos:cdasEntrada.length,
      totalCompetencias:resultado.diagnostico.competenciasAnalisadas.length,

      totalCDAs:cdasEntrada.length,
      cdasDecadentes:cdasDecadentes.length,
      cdasPrescritas:cdasPrescritas.length,
      cdasAtivas:cdasAtivas.length,
      valorDecadente,
      valorPrescrito,
      valorAtivo,
      valorExtinguivel,

      composicaoAtiva:{
        principal:compAtiva.principal,
        multas:compAtiva.multas,
        juros:compAtiva.juros,
        encargos:compAtiva.encargos,
        total:compAtiva.total,
      },

      capag:capagCalc.capag || '',
      descontoEstimado:n(transCalc.descontoEstimado ?? transCalc.totalDesconto),
      valorAposTransacao:n(transCalc.valorAposTransacao ?? transCalc.valorAposDesconto) || valorAtivo,
      parcelaEstimada:n(transCalc.parcelaEstimada ?? transCalc.parcelaSemJuros),
      maxParcelas:n(transCalc.maxParcelas),

      memoriaCalculo:[
        `Dívida documental total: R$ ${fmtVal(totalDividaDocumental)}`,
        `Potencialmente decadente: ${cdasDecadentes.length} — R$ ${fmtVal(valorDecadente)}`,
        `Potencialmente prescrita: ${cdasPrescritas.length} — R$ ${fmtVal(valorPrescrito)}`,
        `Saldo ativo encaminhado à transação: ${cdasAtivas.length || (valorAtivo>0?1:0)} — R$ ${fmtVal(valorAtivo)}`,
        `Composição ativa documental: principal R$ ${fmtVal(compAtiva.principal)}, multa R$ ${fmtVal(compAtiva.multas)}, juros R$ ${fmtVal(compAtiva.juros)}, encargos R$ ${fmtVal(compAtiva.encargos)}`,
        `Desconto potencial calculado pelo motor de Transação: R$ ${fmtVal(transCalc.descontoEstimado ?? transCalc.totalDesconto)}`,
      ],
      observacoesTecnicas: temDatasEssenciais ? '' : 'Completar datas jurídicas e confirmar a íntegra dos autos/REGULARIZE.',
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo: resultado.diagnostico.competenciasAnalisadas.length ? 80 : 60,
      completudeDocs: temDatasEssenciais ? 90 : 60,
      consistencia: oportunidades.length ? 88 : 65,
      oportunidadesFound: Math.min(100,(oportunidades.length/3)*100),
    })

    resultado.riscos = [
      {
        descricao:'Negociar antes de revisar prescrição/decadência pode consolidar uma estratégia economicamente desfavorável.',
        nivel:'ALTO',
        mitigacao:'Executar o diagnóstico jurídico antes da transação.',
      },
      {
        descricao:'Datas incompletas podem gerar falso positivo/negativo de prescrição.',
        nivel:temDatasEssenciais?'BAIXO':'ALTO',
        mitigacao:'Consultar a íntegra da execução fiscal e documentos da PGFN.',
      },
      {
        descricao:'A simulação de transação não substitui o resultado oficial do SISPAR.',
        nivel:'MEDIO',
        mitigacao:'Confrontar a proposta final no REGULARIZE antes da adesão.',
      },
    ]

    const recomendacoes = oportunidades
      .map(o=>o.recomendacao)
      .filter(Boolean)
      .sort((a,b)=>{
        const ordem={URGENTE:0,ALTA:1,MEDIA:2,BAIXA:3}
        return (ordem[a.prioridade] ?? 99) - (ordem[b.prioridade] ?? 99)
      })

    if (!recomendacoes.length) {
      recomendacoes.push({
        tipo:'ORIENTACAO', prioridade:'MEDIA',
        titulo:'Completar dados da Dívida Ativa',
        descricao:'Não há dados suficientes para concluir a estratégia.',
        passos:['Importar a CDA completa','Conferir datas jurídicas','Consultar CAPAG e modalidades no REGULARIZE'],
      })
    }

    resultado.recomendacaoPrincipal = recomendacoes[0]
    resultado.todasRecomendacoes = recomendacoes
    resultado.relatorio = {
      resumoExecutivo:`${cdasEntrada.length} CDA(s), total R$ ${fmtVal(totalDividaDocumental)}. Antes da transação: ${cdasDecadentes.length} sinalizada(s) por decadência e ${cdasPrescritas.length} por prescrição. Saldo ativo: R$ ${fmtVal(valorAtivo)}.`,
      objetivoAnalise:'Separar extinção e negociação, evitando que o FiscalTribe transacione automaticamente créditos que precisam ser revisados.',
      escopoAnalise:`${cdasEntrada.length} CDA(s); saldo ativo R$ ${fmtVal(valorAtivo)}.`,
      diagnosticoTecnico:[
        `Decadentes: ${cdasDecadentes.length} — R$ ${fmtVal(valorDecadente)}`,
        `Prescritas: ${cdasPrescritas.length} — R$ ${fmtVal(valorPrescrito)}`,
        `Ativas: ${cdasAtivas.length} — R$ ${fmtVal(valorAtivo)}`,
        `CAPAG: ${capagCalc.capag || 'não confirmado'}`,
        `Desconto potencial da transação: R$ ${fmtVal(transCalc.descontoEstimado ?? transCalc.totalDesconto)}`,
      ].join(' | '),
      oportunidadesTexto:oportunidades.length ? oportunidades.map(o=>o.tese).join(' | ') : 'Nenhuma oportunidade concluída.',
      riscosTexto:resultado.riscos.map(r=>`[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto:'Art. 174 CTN; arts. 150/173 CTN; art. 40 LEF; Lei 13.988/2020; Portaria PGFN 6.757/2022.',
      evidenciasTexto:cdasClassificadas.slice(0,10).map(c=>`${c.numero}: R$ ${fmtVal(c.valorTotal)} — ${c.classificacao.label}`).join('\n'),
      scoreTexto:`Score Motor Dívida Ativa: ${resultado.score?.valor || 0}/100. Grau de confiança: ${resultado.grauConfianca}.`,
      recomendacoesTexto:recomendacoes.map(r=>`[${r.prioridade}] ${r.titulo}`).join(' | '),
      planoAcao:[
        cdasDecadentes.length ? `1. Revisar decadência em ${cdasDecadentes.length} CDA(s)` : null,
        cdasPrescritas.length ? `2. Revisar prescrição em ${cdasPrescritas.length} CDA(s)` : null,
        valorAtivo > 0 ? `3. Simular transação somente sobre R$ ${fmtVal(valorAtivo)} de saldo ativo` : null,
        '4. Confirmar CAPAG oficial e resultado no REGULARIZE/SISPAR',
      ].filter(Boolean),
      conclusaoExecutiva: valorAtivo > 0
        ? `Após a triagem jurídica, R$ ${fmtVal(valorAtivo)} permanecem ativos para análise de negociação.`
        : 'Nenhum saldo foi encaminhado automaticamente à transação após a triagem.',
    }

    resultado.auditTrail = {
      motoresExecutados:['DIVIDA_ATIVA','PRESCRICAO','DECADENCIA',...(valorAtivo>0?['CAPAG','TRANSACAO']:[])],
      regrasAplicadas:[
        { id:'DA_001', descricao:'Normalização de CDAs', resultado:`${cdasEntrada.length} CDA(s)` },
        { id:'DA_002', descricao:'Prescrição/decadência antes da transação', resultado:`${cdasDecadentes.length} decadentes | ${cdasPrescritas.length} prescritas | ${cdasAtivas.length} ativas` },
        { id:'DA_003', descricao:'Transação somente do saldo ativo', resultado:`R$ ${valorAtivo.toFixed(2)}` },
        { id:'DA_004', descricao:'Composição documental enviada ao motor', resultado:`P ${compAtiva.principal.toFixed(2)} | M ${compAtiva.multas.toFixed(2)} | J ${compAtiva.juros.toFixed(2)} | E ${compAtiva.encargos.toFixed(2)}` },
      ],
      documentosUtilizados:cdasEntrada.map(c=>({tipo:'CDA',identificador:c.numero,competencia:c.competencia||''})),
      legislacaoVersao:BaseTributaria?.versao?.codigo || 'N/I',
      execucoes:[],
      subMotores:{ prescricao:resultPrescricao, decadencia:resultDecadencia, capag:resultCAPAG, transacao:resultTransacao },
    }

    resultado.status = oportunidades.length ? STATUS_ANALISE.CONCLUIDA : STATUS_ANALISE.CONCLUIDA_PARCIAL
    return finalizarResultado(resultado, inicio, {
      totalNFes:nfes?.length || 0,
      regime:cliente?.regime || '',
      clienteCNPJ:cliente?.cnpj || '',
      totalCDAs:cdasEntrada.length,
      valorTotal:totalDividaDocumental,
      valorExtinguivel,
      valorAtivo,
      oportunidades:oportunidades.length,
    })
  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de Dívida Ativa: ${erro.message}`)
  }
}

export default analisarDividaAtiva
