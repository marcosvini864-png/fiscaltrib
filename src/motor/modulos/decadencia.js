/**
 * modulos/decadencia.js — FiscalTrib
 * Motor de Decadência Tributária.
 *
 * Teses:
 * 1. Decadência do lançamento — Fazenda perde o direito de lançar
 *    após 5 anos (art. 150 e 173 CTN)
 * 2. Decadência com dolo/fraude — prazo conta da ocorrência do fato
 *    gerador mesmo com dolo (art. 173, I CTN)
 * 3. Decadência do crédito homologado — 5 anos do fato gerador
 *    (art. 150, §4º CTN) para tributos sujeitos a homologação
 * 4. Decadência de auto de infração — AIIM lavrado após o prazo
 *
 * Base legal:
 * — Art. 150, §4º CTN — tributos sujeitos a homologação
 * — Art. 173, I CTN   — demais tributos
 * — RE 556.664 STF    — decadência e prescrição são matéria de LC
 * — Súmula 555 STJ    — prazo decadencial do ICMS
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

const PRAZO_DECADENCIA_ANOS = 5

const TRIBUTOS_HOMOLOGACAO = [
  'PIS', 'COFINS', 'IRPJ', 'CSLL', 'IPI', 'ICMS', 'ISS',
  'INSS', 'SIMPLES', 'CONTRIBUICAO_PREVIDENCIARIA',
]

const FUNDAMENTACAO = {
  teseJuridica: 'Decadência Tributária — Extinção do Direito de Lançar',
  resumo: 'O direito da Fazenda de constituir o crédito tributário decai em 5 anos. Para tributos sujeitos a lançamento por homologação (IRPJ, CSLL, PIS, COFINS, ICMS, ISS), o prazo conta do fato gerador. Para os demais, conta do primeiro dia do exercício seguinte. Auto de infração lavrado após esse prazo é nulo.',
  baseLegal: [
    { norma: 'Art. 150, §4º CTN', descricao: 'Decadência para tributos sujeitos a homologação — 5 anos do FG' },
    { norma: 'Art. 173, I CTN',   descricao: 'Decadência para demais tributos — 5 anos do exercício seguinte' },
    { norma: 'Art. 156, V CTN',   descricao: 'Decadência como causa de extinção do crédito tributário' },
    { norma: 'RE 556.664 STF',    descricao: 'Decadência e prescrição são matéria de lei complementar' },
    { norma: 'Súmula 555 STJ',    descricao: 'Prazo decadencial do ICMS lançado por homologação' },
  ],
  jurisprudencia: [
    'STF — RE 556.664 — decadência e prescrição apenas por LC',
    'STJ — Súmula 555 — decadência do ICMS sujeito a homologação',
    'STJ — REsp 973.733 (Tema 163) — contagem da decadência',
    'CARF — Acórdão 9202-010.098 — nulidade de AIIM lavrado fora do prazo',
  ],
  via: 'ADMINISTRATIVA_JUDICIAL',
  prazoRetroativo: 'Verificar data do fato gerador e do lançamento',
  riscoContestacao: 20,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

function calcularDataDecadencia(fato, tributo, dolo = false) {
  const d = new Date(fato)

  // Tributos por homologação — 5 anos do FG (art. 150 §4º)
  if (TRIBUTOS_HOMOLOGACAO.includes(tributo?.toUpperCase())) {
    d.setFullYear(d.getFullYear() + PRAZO_DECADENCIA_ANOS)
    return { data: d.toISOString().substring(0, 10), regra: 'Art. 150, §4º CTN — 5 anos do fato gerador' }
  }

  // Demais — primeiro dia do exercício seguinte + 5 anos (art. 173, I)
  const primeiroExercicioSeguinte = new Date(d.getFullYear() + 1, 0, 1)
  primeiroExercicioSeguinte.setFullYear(primeiroExercicioSeguinte.getFullYear() + PRAZO_DECADENCIA_ANOS)
  return {
    data:  primeiroExercicioSeguinte.toISOString().substring(0, 10),
    regra: 'Art. 173, I CTN — 5 anos do 1º dia do exercício seguinte ao FG',
  }
}

function formatarData(data) {
  if (!data) return 'não informada'
  return new Date(data).toLocaleDateString('pt-BR')
}

function anosEntre(d1, d2) {
  return (new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24 * 365.25)
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarDecadencia(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'DECADENCIA'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Decadência Tributária — Extinção do Direito de Lançar'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    // opcoes.lancamentos = [{ id, numero, tributo, valor,
    //                         dataFatoGerador, dataLancamento, dolo }]
    const lancamentos = opcoes.lancamentos || []

    if (lancamentos.length === 0) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Informe os lançamentos/autos em opcoes.lancamentos para análise de decadência.'
      return finalizarResultado(resultado, inicio)
    }

    const hoje = new Date().toISOString().substring(0, 10)

    resultado.diagnostico = {
      totalDocumentosAnalisados: lancamentos.length,
      totalItensAnalisados:      lancamentos.length,
      competenciasAnalisadas:    [],
      periodoInicio:             '',
      periodoFim:                hoje,
      situacoesEncontradas:      ['Lançamentos/autos analisados para decadência'],
      observacoes:               `${lancamentos.length} lançamento(s) submetido(s) à análise de decadência.`,
    }

    // ── 2. Analisa cada lançamento ──────────────────────────────
    const oportunidades = []
    let creditoTotal    = 0
    const analises      = []

    lancamentos.forEach((lanc, idx) => {
      const {
        id              = `LANC_${idx}`,
        numero          = `Auto ${idx + 1}`,
        tributo         = '',
        valor           = 0,
        dataFatoGerador = null,
        dataLancamento  = null,
        dolo            = false,
      } = lanc

      if (!dataFatoGerador) {
        analises.push({ id, numero, tributo, valor, erro: 'Data do fato gerador não informada', decadente: false })
        return
      }

      const { data: dataLimite, regra } = calcularDataDecadencia(dataFatoGerador, tributo, dolo)
      const decadente = dataLancamento ? dataLancamento > dataLimite : hoje > dataLimite
      const anosDecorridos = anosEntre(dataFatoGerador, dataLancamento || hoje)

      const analise = {
        id, numero, tributo, valor,
        dataFatoGerador, dataLancamento, dataLimite,
        regra, decadente, anosDecorridos,
        obs: decadente
          ? `DECADENTE — Fato gerador em ${formatarData(dataFatoGerador)}. Prazo expirou em ${formatarData(dataLimite)}. ${dataLancamento ? `Lançamento em ${formatarData(dataLancamento)} — TARDIO.` : 'Não houve lançamento tempestivo.'}`
          : `Em prazo — Fato gerador em ${formatarData(dataFatoGerador)}. Prazo decadencial: ${formatarData(dataLimite)}.`,
      }

      analises.push(analise)

      if (decadente) {
        creditoTotal += valor

        const scoreOp = scoreOportunidade({
          modulo, label: `Decadência — ${numero}`,
          qualidadeDados: dataLancamento ? 95 : 75,
          forcaJuridica: 90,
          volumeEvidencias: 80,
          valorCredito: Math.min(100, (valor / 50000) * 100),
          riscoContestacao: FUNDAMENTACAO.riscoContestacao,
        })

        oportunidades.push({
          id:            `DECAD_${id}_${Date.now()}`,
          tese:          `Decadência — ${tributo || 'tributo'} — ${numero}`,
          descricao:     `Auto/lançamento de ${tributo} (R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) lavrado/constituído após o prazo decadencial de 5 anos. ${analise.obs}`,
          score:         scoreOp,
          grauConfianca: dataLancamento ? GRAU_CONFIANCA.ALTO : GRAU_CONFIANCA.MEDIO,
          evidencias:    [],
          fundamentacao: FUNDAMENTACAO,
          calculos: {
            valorDivida:   valor,
            creditoTotal:  valor,
            economiaTotal: valor,
            creditoMensalMedio: valor / 12,
            creditoPor12Meses: valor,
            creditoPor60Meses: valor,
            analise,
            memoriaCalculo: [
              `Tributo: ${tributo || 'não informado'}`,
              `Fato gerador: ${formatarData(dataFatoGerador)}`,
              `Regra aplicada: ${regra}`,
              `Data limite decadencial: ${formatarData(dataLimite)}`,
              dataLancamento ? `Data do lançamento: ${formatarData(dataLancamento)} — ${decadente ? 'TARDIO' : 'TEMPESTIVO'}` : `Sem lançamento formal — prazo já expirou`,
            ],
          },
          recomendacao: {
            tipo:       'ACAO_IMEDIATA',
            prioridade: 'URGENTE',
            titulo:     `Arguir decadência — ${numero}`,
            descricao:  `Lançamento/auto decadente. Extinção do crédito de R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (art. 156, V, CTN).`,
            passos: [
              `Calcular precisamente a data do fato gerador (${formatarData(dataFatoGerador)}) e a data limite (${formatarData(dataLimite)})`,
              `Verificar a data do lançamento/auto de infração (${formatarData(dataLancamento)})`,
              'Protocolar impugnação administrativa arguindo decadência (art. 150/173 CTN)',
              'Se em execução fiscal, protocolar exceção de pré-executividade',
              'Requerer extinção do crédito com certidão negativa',
            ],
          },
        })
      }
    })

    // ── 3. Sem decadência ───────────────────────────────────────
    if (oportunidades.length === 0) {
      resultado.status        = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca = GRAU_CONFIANCA.MEDIO
      resultado.justificativaConfianca = 'Nenhum lançamento decadente identificado.'
      resultado.recomendacaoPrincipal = {
        tipo: 'MONITORAMENTO', prioridade: 'MEDIA',
        titulo: 'Monitorar prazos decadenciais',
        descricao: `${lancamentos.length} lançamento(s) analisado(s). Nenhum decadente. Verificar prazos.`,
        passos: analises.filter(a => !a.erro).map(a => `${a.numero} (${a.tributo}): prazo até ${formatarData(a.dataLimite)}`),
      }
      resultado.todasRecomendacoes = [resultado.recomendacaoPrincipal]
      resultado.calculos = { creditoEstimado: 0, economiaEstimada: 0, moeda: 'BRL', totalDocumentos: lancamentos.length }
      resultado.relatorio = {
        resumoExecutivo: `${lancamentos.length} lançamento(s) analisado(s). Nenhuma decadência identificada.`,
        conclusaoExecutiva: 'Sem decadência consumada. Monitorar prazos.',
      }
      return finalizarResultado(resultado, inicio, { regime: cliente.regime, totalLancamentos: lancamentos.length })
    }

    // ── 4. Consolida ────────────────────────────────────────────
    resultado.grauConfianca          = GRAU_CONFIANCA.ALTO
    resultado.justificativaConfianca = `${oportunidades.length} lançamento(s) decadente(s) identificado(s).`
    resultado.oportunidades          = oportunidades

    resultado.calculos = {
      valorAnalisado:    lancamentos.reduce((s, l) => s + (l.valor || 0), 0),
      baseCalculo:       creditoTotal,
      creditoEstimado:   creditoTotal,
      economiaEstimada:  creditoTotal,
      moeda:             'BRL',
      creditoPor12Meses: creditoTotal,
      creditoPor24Meses: creditoTotal,
      creditoPor36Meses: creditoTotal,
      creditoPor60Meses: creditoTotal,
      creditoMensalMedio: creditoTotal / 12,
      totalDocumentos:   lancamentos.length,
      totalCompetencias: 0,
      memoriaCalculo:    oportunidades.flatMap(o => o.calculos.memoriaCalculo),
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo:   85,
      completudeDocs:     lancamentos.every(l => l.dataFatoGerador && l.dataLancamento) ? 95 : 70,
      consistencia:       88,
      oportunidadesFound: Math.min(100, (oportunidades.length / lancamentos.length) * 100),
    })

    resultado.riscos = [
      { descricao: 'Fazenda pode alegar dolo/fraude para afastar a decadência', nivel: 'ALTO', mitigacao: 'Verificar se há indícios de dolo no auto de infração' },
      { descricao: 'Causa interruptiva do prazo pode ter ocorrido', nivel: 'MEDIO', mitigacao: 'Verificar histórico completo do processo administrativo' },
    ]

    resultado.recomendacaoPrincipal = oportunidades[0].recomendacao
    resultado.todasRecomendacoes    = oportunidades.map(o => o.recomendacao)

    resultado.relatorio = {
      resumoExecutivo:    `${oportunidades.length} lançamento(s) decadente(s) identificado(s). Total extinguível: R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      objetivoAnalise:    'Verificar se lançamentos/autos de infração foram constituídos tempestivamente ou estão atingidos pela decadência.',
      escopoAnalise:      `${lancamentos.length} lançamento(s) analisado(s). Data-base: ${formatarData(hoje)}.`,
      diagnosticoTecnico: oportunidades.map(o => o.descricao).join(' | '),
      oportunidadesTexto: `${oportunidades.length} decadência(s) — extinção de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      riscosTexto:        resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: `Art. 150 §4º e 173 CTN. RE 556.664 STF. Súmula 555 STJ.`,
      recomendacoesTexto: oportunidades.map(o => o.recomendacao.titulo).join(' | '),
      planoAcao:          oportunidades[0].recomendacao.passos,
      conclusaoExecutiva: `Arguir decadência imediatamente. R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} extinguíveis.`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id: 'DECAD_001', descricao: 'Tributos por homologação — art. 150 §4º CTN', resultado: `${analises.filter(a => TRIBUTOS_HOMOLOGACAO.includes(a.tributo?.toUpperCase())).length} verificados` },
        { id: 'DECAD_002', descricao: 'Demais tributos — art. 173, I CTN',           resultado: `${analises.filter(a => !TRIBUTOS_HOMOLOGACAO.includes(a.tributo?.toUpperCase())).length} verificados` },
        { id: 'DECAD_003', descricao: 'Lançamentos decadentes identificados',         resultado: `${oportunidades.length}` },
      ],
      documentosUtilizados: lancamentos.map(l => ({ tipo: 'AUTO_INFRACAO', identificador: l.numero || l.id, competencia: l.dataFatoGerador || '' })),
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, { regime: cliente.regime, totalLancamentos: lancamentos.length, decadentes: oportunidades.length })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de Decadência: ${erro.message}`)
  }
}

export default analisarDecadencia