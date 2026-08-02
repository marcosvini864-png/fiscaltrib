/**
 * modulos/inss.js — FiscalTrib
 * Motor de Recuperação de INSS sobre Verbas Indenizatórias.
 *
 * Tese: Contribuições previdenciárias recolhidas indevidamente sobre
 * verbas de natureza indenizatória (aviso prévio indenizado, férias
 * proporcionais, terço constitucional, PLR, auxílios etc.) devem ser
 * restituídas ou compensadas.
 *
 * Base legal:
 * — RE 593.068 STF (Tema 20) — PLR não integra salário-de-contribuição
 * — RE 565.160 STF — aviso prévio indenizado não é fato gerador de INSS
 * — Súmula 310 STJ — férias indenizadas não sofrem incidência de INSS
 * — Lei 8.212/1991, art. 28 — definição de salário-de-contribuição
 * — Decreto 3.048/1999 (Regulamento da Previdência Social)
 * — IN RFB 2.110/2022
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
// VERBAS INDENIZATÓRIAS — catálogo com base legal
// ─────────────────────────────────────────────────────────────

const VERBAS_INDENIZATORIAS = [
  {
    id:          'AVISO_PREVIO_IND',
    nome:        'Aviso Prévio Indenizado',
    aliquotaINSS: 0.20,
    baseLegal:   'RE 565.160 STF — aviso prévio indenizado não é fato gerador de INSS',
    risco:       'BAIXO',
    forçaJuridica: 95,
  },
  {
    id:          'FERIAS_PROP',
    nome:        'Férias Proporcionais Indenizadas',
    aliquotaINSS: 0.20,
    baseLegal:   'Súmula 310 STJ — férias indenizadas não sofrem incidência de INSS',
    risco:       'BAIXO',
    forçaJuridica: 95,
  },
  {
    id:          'TERCO_FERIAS',
    nome:        'Terço Constitucional de Férias',
    aliquotaINSS: 0.20,
    baseLegal:   'RE 1.072.485 STF (Tema 985) — terço de férias não integra base de INSS',
    risco:       'BAIXO',
    forçaJuridica: 92,
  },
  {
    id:          'PLR',
    nome:        'Participação nos Lucros e Resultados (PLR)',
    aliquotaINSS: 0.20,
    baseLegal:   'RE 593.068 STF (Tema 20) — PLR não integra salário-de-contribuição',
    risco:       'BAIXO',
    forçaJuridica: 95,
  },
  {
    id:          'AUXILIO_ALIMENTACAO',
    nome:        'Auxílio-Alimentação (PAT)',
    aliquotaINSS: 0.20,
    baseLegal:   'Lei 6.321/1976 — auxílio-alimentação via PAT tem natureza indenizatória',
    risco:       'MEDIO',
    forçaJuridica: 75,
  },
  {
    id:          'AUXILIO_TRANSPORTE',
    nome:        'Auxílio-Transporte / Vale-Transporte',
    aliquotaINSS: 0.20,
    baseLegal:   'Lei 7.418/1985 — vale-transporte não integra remuneração',
    risco:       'BAIXO',
    forçaJuridica: 90,
  },
  {
    id:          'INDENIZACAO_DEMISSAO',
    nome:        'Indenização por Demissão sem Justa Causa',
    aliquotaINSS: 0.20,
    baseLegal:   'Art. 28, §9º, "e", Lei 8.212/1991 — indenizações rescisórias excluídas',
    risco:       'BAIXO',
    forçaJuridica: 95,
  },
  {
    id:          'AUXILIO_DOENCA_15D',
    nome:        'Primeiros 15 dias de Afastamento por Doença',
    aliquotaINSS: 0.20,
    baseLegal:   'Art. 60 Lei 8.213/1991 — empresa paga mas não é salário-de-contribuição',
    risco:       'MEDIO',
    forçaJuridica: 70,
  },
]

const FUNDAMENTACAO = {
  teseJuridica: 'Recuperação de INSS Patronal sobre Verbas Indenizatórias',
  resumo: 'Contribuições previdenciárias (INSS patronal 20%) recolhidas sobre verbas de natureza indenizatória são indevidas. A restituição pode ser pleiteada administrativamente via PER/DCOMP pelos últimos 5 anos.',
  baseLegal: VERBAS_INDENIZATORIAS.map(v => ({ norma: v.baseLegal, descricao: v.nome })),
  jurisprudencia: [
    'STF — RE 565.160 — Aviso prévio indenizado',
    'STF — RE 593.068 (Tema 20) — PLR',
    'STF — RE 1.072.485 (Tema 985) — Terço de férias',
    'STJ — Súmula 310 — Férias indenizadas',
    'STJ — REsp 1.230.957 (Tema 478) — Terço de férias',
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: '5 anos (art. 168 CTN)',
  riscoContestacao: 15,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarINSS(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'INSS'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Recuperação de INSS sobre Verbas Indenizatórias'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    // INSS não depende de NF-e — depende de folha de pagamento
    // opcoes deve conter: { folha: [{ competencia, verbas: { AVISO_PREVIO_IND: valor, PLR: valor... } }] }
    const folha = opcoes.folha || []

    if (folha.length === 0) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Dados de folha de pagamento não informados. Informe as verbas por competência em opcoes.folha.'
      return finalizarResultado(resultado, inicio)
    }

    // ── 2. Diagnóstico ──────────────────────────────────────────
    const competencias = folha.map(f => f.competencia).sort()

    resultado.diagnostico = {
      totalDocumentosAnalisados: folha.length,
      totalItensAnalisados:      folha.reduce((s, f) => s + Object.keys(f.verbas || {}).length, 0),
      competenciasAnalisadas:    competencias,
      periodoInicio:             competencias[0] || '',
      periodoFim:                competencias[competencias.length - 1] || '',
      situacoesEncontradas:      ['Folha de pagamento analisada'],
      observacoes: [
        `${folha.length} competência(s) de folha analisadas`,
        `Verbas verificadas: ${VERBAS_INDENIZATORIAS.map(v => v.nome).join(', ')}`,
      ].join('. '),
    }

    // ── 3. Cálculo por competência e por verba ──────────────────
    let creditoTotal = 0
    const porCompetencia = {}
    const verbасEncontradas = new Set()

    folha.forEach(({ competencia, verbas = {} }) => {
      let creditoComp = 0
      const detalheVerbas = {}

      VERBAS_INDENIZATORIAS.forEach(verba => {
        const valor = parseFloat(verbas[verba.id] || 0)
        if (valor > 0) {
          const inssIndevido = valor * verba.aliquotaINSS
          creditoComp += inssIndevido
          detalheVerbas[verba.id] = {
            nome:         verba.nome,
            valorVerba:   valor,
            aliquota:     verba.aliquotaINSS,
            inssIndevido,
            baseLegal:    verba.baseLegal,
          }
          verbасEncontradas.add(verba.id)
        }
      })

      if (creditoComp > 0) {
        porCompetencia[competencia] = {
          competencia,
          creditoTotal: creditoComp,
          verbas:       detalheVerbas,
        }
        creditoTotal += creditoComp
      }
    })

    // ── 4. Sem oportunidade ─────────────────────────────────────
    if (creditoTotal === 0) {
      resultado.status        = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca = GRAU_CONFIANCA.ALTO
      resultado.justificativaConfianca = 'Nenhuma verba indenizatória com INSS identificada.'
      resultado.recomendacaoPrincipal = {
        tipo: 'NENHUMA_ACAO', prioridade: 'BAIXA',
        titulo: 'Sem INSS indevido identificado',
        descricao: 'Nenhuma verba indenizatória com INSS recolhido indevidamente foi identificada.',
        passos: [],
      }
      resultado.todasRecomendacoes = [resultado.recomendacaoPrincipal]
      resultado.relatorio = {
        resumoExecutivo: 'Nenhuma oportunidade de recuperação de INSS identificada.',
        conclusaoExecutiva: 'Folha de pagamento sem verbas indenizatórias com INSS indevido.',
      }
      return finalizarResultado(resultado, inicio, { regime: cliente.regime })
    }

    // ── 5. Grau de confiança ────────────────────────────────────
    const totalComp   = Object.keys(porCompetencia).length
    let grau, justificativa, pontos

    if (totalComp >= 12) {
      grau = GRAU_CONFIANCA.ALTO;  justificativa = 'Folha com 12+ competências — análise conclusiva.'; pontos = 90
    } else if (totalComp >= 6) {
      grau = GRAU_CONFIANCA.MEDIO; justificativa = 'Folha parcial — recomenda-se ampliar o período.';  pontos = 65
    } else {
      grau = GRAU_CONFIANCA.BAIXO; justificativa = 'Poucos meses de folha — análise preliminar.';      pontos = 35
    }

    resultado.grauConfianca          = grau
    resultado.justificativaConfianca = justificativa

    // ── 6. Score e oportunidade ─────────────────────────────────
    const creditoMensalMedio = creditoTotal / totalComp

    const scoreOp = scoreOportunidade({
      modulo, label: 'INSS sobre Verbas Indenizatórias',
      qualidadeDados: pontos, forcaJuridica: 90,
      volumeEvidencias: Math.min(100, (verbасEncontradas.size / 5) * 100),
      valorCredito: Math.min(100, (creditoTotal / 5000) * 100),
      riscoContestacao: FUNDAMENTACAO.riscoContestacao,
    })

    const recomendacao = {
      tipo:       'ACAO_IMEDIATA',
      prioridade: 'ALTA',
      titulo:     'Recuperar INSS indevidamente recolhido sobre verbas indenizatórias',
      descricao:  `Crédito estimado de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente a ${totalComp} competência(s). Verbas identificadas: ${[...verbасEncontradas].map(id => VERBAS_INDENIZATORIAS.find(v => v.id === id)?.nome).join(', ')}.`,
      passos: [
        'Levantar SEFIP/eSocial e folha de pagamento dos últimos 60 meses',
        'Identificar todas as verbas indenizatórias tributadas indevidamente',
        'Calcular o INSS indevidamente recolhido por competência',
        'Retificar GFIP/eSocial excluindo as verbas indenizatórias',
        'Protocolar PER/DCOMP para restituição ou compensação do crédito',
        'Monitorar decisão da RFB (prazo: 360 dias)',
      ],
    }

    resultado.oportunidades = [{
      id:            `INSS_${Date.now()}`,
      tese:          'INSS Patronal Indevido sobre Verbas Indenizatórias',
      descricao:     `${verbасEncontradas.size} tipo(s) de verba indenizatória identificados em ${totalComp} competência(s). INSS patronal de 20% recolhido indevidamente.`,
      score:         scoreOp,
      grauConfianca: grau,
      evidencias:    [],
      fundamentacao: FUNDAMENTACAO,
      calculos: {
        creditoTotal,
        creditoMensalMedio,
        creditoPor12Meses: creditoMensalMedio * 12,
        creditoPor24Meses: creditoMensalMedio * 24,
        creditoPor36Meses: creditoMensalMedio * 36,
        creditoPor60Meses: creditoMensalMedio * 60,
        porCompetencia,
        memoriaCalculo: [
          `1. ${verbасEncontradas.size} tipo(s) de verba indenizatória identificados`,
          `2. INSS patronal de 20% aplicado sobre cada verba`,
          `3. Total por competência calculado`,
          `4. Crédito total: R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `5. Média mensal: R$ ${creditoMensalMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ],
      },
      recomendacao,
    }]

    resultado.calculos = {
      valorAnalisado:    folha.reduce((s, f) => s + Object.values(f.verbas || {}).reduce((a, b) => a + b, 0), 0),
      baseCalculo:       creditoTotal / 0.20,
      creditoEstimado:   creditoTotal,
      economiaEstimada:  creditoTotal,
      moeda:             'BRL',
      creditoPor12Meses: creditoMensalMedio * 12,
      creditoPor24Meses: creditoMensalMedio * 24,
      creditoPor36Meses: creditoMensalMedio * 36,
      creditoPor60Meses: creditoMensalMedio * 60,
      creditoMensalMedio,
      porCompetencia,
      memoriaCalculo:    resultado.oportunidades[0].calculos.memoriaCalculo,
      totalDocumentos:   folha.length,
      totalCompetencias: totalComp,
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo:   Math.min(100, (totalComp / 12) * 100),
      completudeDocs:     pontos,
      consistencia:       85,
      oportunidadesFound: Math.min(100, (creditoTotal / 1000) * 10),
    })

    resultado.riscos = [
      { descricao: 'eSocial pode ter registros divergentes da folha informada', nivel: 'MEDIO', mitigacao: 'Cruzar folha com SEFIP/eSocial antes do PER/DCOMP' },
      grau === 'BAIXO' ? { descricao: 'Poucos meses analisados — crédito pode estar subestimado', nivel: 'ALTO', mitigacao: 'Ampliar para 60 meses' } : null,
    ].filter(Boolean)

    resultado.recomendacaoPrincipal = recomendacao
    resultado.todasRecomendacoes    = [recomendacao]

    resultado.relatorio = {
      resumoExecutivo:    `Identificado INSS indevido de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${totalComp} competência(s), referente a ${verbасEncontradas.size} tipo(s) de verba indenizatória.`,
      objetivoAnalise:    'Identificar contribuições previdenciárias recolhidas indevidamente sobre verbas de natureza indenizatória.',
      escopoAnalise:      `${folha.length} competência(s) de folha analisadas. Período: ${competencias[0]} a ${competencias[competencias.length - 1]}.`,
      diagnosticoTecnico: `Verbas identificadas: ${[...verbасEncontradas].map(id => VERBAS_INDENIZATORIAS.find(v => v.id === id)?.nome).join(', ')}. INSS patronal de 20% recolhido indevidamente sobre essas verbas.`,
      oportunidadesTexto: `Crédito mensal médio de R$ ${creditoMensalMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Potencial em 60 meses: R$ ${(creditoMensalMedio * 60).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      riscosTexto:        resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: `${FUNDAMENTACAO.teseJuridica}. Principais: RE 593.068 (PLR), RE 565.160 (aviso prévio), Súmula 310 STJ (férias).`,
      recomendacoesTexto: recomendacao.descricao,
      planoAcao:          recomendacao.passos,
      conclusaoExecutiva: `R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de INSS indevido identificado. Recomenda-se retificação imediata do eSocial e protocolo de PER/DCOMP.`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id: 'INSS_001', descricao: 'Identificação de verbas indenizatórias', resultado: `${verbасEncontradas.size} tipos encontrados` },
        { id: 'INSS_002', descricao: 'Cálculo do INSS indevido por competência', resultado: `R$ ${creditoTotal.toFixed(2)}` },
        { id: 'INSS_003', descricao: 'Grau de confiança', resultado: grau },
      ],
      documentosUtilizados: folha.map(f => ({ tipo: 'FOLHA_PAGAMENTO', identificador: f.competencia, competencia: f.competencia })),
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, { totalNFes: nfes?.length || 0, regime: cliente.regime, clienteCNPJ: cliente.cnpj || '' })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de INSS: ${erro.message}`)
  }
}

export default analisarINSS