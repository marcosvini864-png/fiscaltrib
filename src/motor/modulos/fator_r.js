/**
 * modulos/fator_r.js — FiscalTrib
 * Motor do Fator R — Simples Nacional.
 *
 * Tese: Quando a folha de salários representa 28%+ da receita bruta
 * dos últimos 12 meses, a empresa migra do Anexo V para o Anexo III,
 * com redução significativa da alíquota efetiva do Simples Nacional.
 *
 * Base legal:
 * — LC 123/2006, art. 18, §24
 * — Resolução CGSN 140/2018
 * — Tabela do Simples Nacional — Anexos III e V
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
// TABELAS DO SIMPLES NACIONAL (2024)
// ─────────────────────────────────────────────────────────────

const ANEXO_III = [
  { faixaAte: 180000,   aliquota: 0.060,  deducao: 0 },
  { faixaAte: 360000,   aliquota: 0.112,  deducao: 9360 },
  { faixaAte: 720000,   aliquota: 0.135,  deducao: 17640 },
  { faixaAte: 1800000,  aliquota: 0.16,   deducao: 35640 },
  { faixaAte: 3600000,  aliquota: 0.21,   deducao: 125640 },
  { faixaAte: 4800000,  aliquota: 0.33,   deducao: 648000 },
]

const ANEXO_V = [
  { faixaAte: 180000,   aliquota: 0.155,  deducao: 0 },
  { faixaAte: 360000,   aliquota: 0.18,   deducao: 4500 },
  { faixaAte: 720000,   aliquota: 0.195,  deducao: 9900 },
  { faixaAte: 1800000,  aliquota: 0.205,  deducao: 17100 },
  { faixaAte: 3600000,  aliquota: 0.23,   deducao: 62100 },
  { faixaAte: 4800000,  aliquota: 0.305,  deducao: 540000 },
]

const FUNDAMENTACAO = {
  teseJuridica: 'Fator R — Migração do Anexo V para o Anexo III do Simples Nacional',
  resumo: 'Empresas do Simples Nacional enquadradas no Anexo V cuja folha de salários (incluindo pró-labore) represente 28% ou mais da receita bruta dos últimos 12 meses devem ser tributadas pelo Anexo III, que possui alíquotas significativamente menores.',
  baseLegal: [
    { norma: 'LC 123/2006, art. 18, §24',      descricao: 'Definição e aplicação do Fator R' },
    { norma: 'Resolução CGSN 140/2018, art. 26', descricao: 'Regulamentação do Fator R' },
    { norma: 'Tabela Simples Nacional — Anexo III', descricao: 'Atividades de serviço com menor carga' },
    { norma: 'Tabela Simples Nacional — Anexo V',  descricao: 'Atividades de serviço com maior carga' },
  ],
  jurisprudencia: [
    'CARF — Acórdão 2301-006.881 — Aplicação do Fator R e enquadramento correto',
    'Solução de Consulta COSIT 80/2021 — Pró-labore compõe folha para fins do Fator R',
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: '5 anos (art. 168 CTN)',
  riscoContestacao: 10,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

function calcularAliquotaEfetiva(receita12Meses, tabela) {
  const faixa = tabela.find(f => receita12Meses <= f.faixaAte) || tabela[tabela.length - 1]
  return ((receita12Meses * faixa.aliquota) - faixa.deducao) / receita12Meses
}

function calcularDAS(receitaMes, receita12Meses, tabela) {
  const aliqEfetiva = calcularAliquotaEfetiva(receita12Meses, tabela)
  return receitaMes * aliqEfetiva
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarFatorR(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'FATOR_R'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Fator R — Migração Anexo V → Anexo III (Simples Nacional)'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    if (cliente?.regime !== 'Simples Nacional') {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Módulo Fator R aplicável apenas ao Simples Nacional.'
      return finalizarResultado(resultado, inicio)
    }

    // Dados de folha e receita precisam vir nas opcoes ou no cliente
    const { folhaMensal, receitaMensal, receita12Meses, anexoAtual } = opcoes

    if (!folhaMensal || !receitaMensal) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Informe a folha de salários mensal e a receita bruta mensal para calcular o Fator R.'
      return finalizarResultado(resultado, inicio)
    }

    // ── 2. Cálculo do Fator R ───────────────────────────────────
    const rec12 = receita12Meses || (receitaMensal * 12)
    const fatorR = folhaMensal / receitaMensal

    resultado.diagnostico = {
      totalDocumentosAnalisados: nfes?.length || 0,
      totalItensAnalisados:      0,
      competenciasAnalisadas:    [],
      periodoInicio:             '',
      periodoFim:                '',
      situacoesEncontradas:      [fatorR >= 0.28 ? 'Fator R ≥ 28% — Anexo III aplicável' : 'Fator R < 28% — Anexo V mantido'],
      observacoes: [
        `Folha mensal informada: R$ ${folhaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Receita bruta mensal: R$ ${receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Fator R calculado: ${(fatorR * 100).toFixed(2)}%`,
        `Limiar do Fator R: 28%`,
        fatorR >= 0.28 ? 'ELEGÍVEL: Empresa deve ser tributada pelo Anexo III' : 'NÃO ELEGÍVEL: Fator R insuficiente para migração ao Anexo III',
      ].join('. '),
    }

    // ── 3. Sem elegibilidade ────────────────────────────────────
    if (fatorR < 0.28 && !opcoes.forcarCalculo) {
      resultado.status        = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca = GRAU_CONFIANCA.ALTO
      resultado.justificativaConfianca = `Fator R de ${(fatorR * 100).toFixed(2)}% é inferior ao limiar de 28%.`
      resultado.recomendacaoPrincipal = {
        tipo: 'ORIENTACAO', prioridade: 'MEDIA',
        titulo: 'Fator R abaixo do limiar — Ação possível: aumentar folha',
        descricao: `Fator R atual: ${(fatorR * 100).toFixed(2)}%. Para migrar ao Anexo III, a folha precisa atingir 28% da receita bruta (R$ ${(receitaMensal * 0.28).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês).`,
        passos: [
          `Aumentar pró-labore ou salários até R$ ${(receitaMensal * 0.28).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`,
          'Verificar se há sócios sem pró-labore que poderiam receber remuneração',
          'Avaliar impacto do aumento da folha vs economia tributária no Anexo III',
        ],
      }
      resultado.todasRecomendacoes = [resultado.recomendacaoPrincipal]
      resultado.calculos = {
        fatorR, fatorRPercentual: fatorR * 100,
        folhaNecessaria: receitaMensal * 0.28,
        folhaAtual: folhaMensal,
        diferenca: (receitaMensal * 0.28) - folhaMensal,
        creditoEstimado: 0, economiaEstimada: 0,
      }
      resultado.relatorio = {
        resumoExecutivo: `Fator R atual de ${(fatorR * 100).toFixed(2)}% não atinge o limiar de 28% exigido para migração ao Anexo III.`,
        conclusaoExecutiva: `Para atingir o Fator R mínimo, a folha mensal deveria ser de R$ ${(receitaMensal * 0.28).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      }
      return finalizarResultado(resultado, inicio, { totalNFes: nfes?.length || 0, regime: cliente.regime })
    }

    // ── 4. Elegível — calcula economia ──────────────────────────
    const aliqAnexoV   = calcularAliquotaEfetiva(rec12, ANEXO_V)
    const aliqAnexoIII = calcularAliquotaEfetiva(rec12, ANEXO_III)

    const dasAnexoV    = calcularDAS(receitaMensal, rec12, ANEXO_V)
    const dasAnexoIII  = calcularDAS(receitaMensal, rec12, ANEXO_III)
    const economiaMensal = dasAnexoV - dasAnexoIII
    const economiaTotal  = economiaMensal > 0 ? economiaMensal : 0

    resultado.grauConfianca = GRAU_CONFIANCA.ALTO
    resultado.justificativaConfianca = `Fator R de ${(fatorR * 100).toFixed(2)}% — elegível para Anexo III.`

    const recomendacao = {
      tipo:       'ACAO_IMEDIATA',
      prioridade: 'ALTA',
      titulo:     'Migrar tributação do Anexo V para o Anexo III imediatamente',
      descricao:  `Economia mensal estimada de R$ ${economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pela aplicação do Fator R.`,
      passos: [
        'Recalcular o DAS dos últimos meses usando o Fator R correto (Anexo III)',
        'Verificar se o DAS foi pago com alíquota do Anexo V indevidamente',
        'Protocolar PERDCOMP para recuperação do indébito dos últimos 5 anos',
        'Orientar cliente a manter folha ≥ 28% da receita nos próximos meses',
        'Documentar o pró-labore e os salários mensalmente para comprovar o Fator R',
      ],
    }

    const scoreOp = scoreOportunidade({
      modulo, label: 'Fator R — Migração Anexo V → III',
      qualidadeDados: 80, forcaJuridica: 90,
      volumeEvidencias: 70,
      valorCredito: Math.min(100, (economiaTotal * 60 / 10000) * 100),
      riscoContestacao: FUNDAMENTACAO.riscoContestacao,
    })

    resultado.oportunidades = [{
      id:            `FATOR_R_${Date.now()}`,
      tese:          'Fator R — Migração Anexo V → Anexo III (Simples Nacional)',
      descricao:     `Fator R de ${(fatorR * 100).toFixed(2)}% — empresa elegível ao Anexo III. Alíquota efetiva cai de ${(aliqAnexoV * 100).toFixed(2)}% para ${(aliqAnexoIII * 100).toFixed(2)}%.`,
      score:         scoreOp,
      grauConfianca: GRAU_CONFIANCA.ALTO,
      evidencias:    [],
      fundamentacao: FUNDAMENTACAO,
      calculos: {
        fatorR, fatorRPercentual: fatorR * 100,
        aliquotaAnexoV:   aliqAnexoV,
        aliquotaAnexoIII: aliqAnexoIII,
        reducaoAliquota:  aliqAnexoV - aliqAnexoIII,
        dasAnexoV,
        dasAnexoIII,
        economiaMensal:   economiaTotal,
        creditoTotal:     economiaTotal,
        creditoPor12Meses: economiaTotal * 12,
        creditoPor60Meses: economiaTotal * 60,
        memoriaCalculo: [
          `1. Fator R = Folha (R$ ${folhaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) / Receita (R$ ${receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) = ${(fatorR * 100).toFixed(2)}%`,
          `2. Fator R ≥ 28% → Tributação pelo Anexo III`,
          `3. DAS pelo Anexo V: R$ ${dasAnexoV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `4. DAS pelo Anexo III: R$ ${dasAnexoIII.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `5. Economia mensal: R$ ${economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ],
      },
      recomendacao,
    }]

    resultado.calculos = {
      valorAnalisado:    receitaMensal,
      baseCalculo:       folhaMensal,
      creditoEstimado:   economiaTotal,
      economiaEstimada:  economiaTotal,
      moeda:             'BRL',
      creditoPor12Meses: economiaTotal * 12,
      creditoPor24Meses: economiaTotal * 24,
      creditoPor36Meses: economiaTotal * 36,
      creditoPor60Meses: economiaTotal * 60,
      creditoMensalMedio: economiaTotal,
      fatorR, fatorRPercentual: fatorR * 100,
      aliquotaAnexoV: aliqAnexoV,
      aliquotaAnexoIII: aliqAnexoIII,
      memoriaCalculo: resultado.oportunidades[0].calculos.memoriaCalculo,
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo: 80, completudeDocs: 80,
      consistencia: 85,
      oportunidadesFound: Math.min(100, (economiaTotal / 500) * 100),
    })

    resultado.riscos = [
      { descricao: 'Variação mensal da folha pode alterar o Fator R', nivel: 'MEDIO', mitigacao: 'Monitorar o Fator R mensalmente' },
      { descricao: 'Pró-labore abaixo do mínimo pode ser questionado pela RFB', nivel: 'BAIXO', mitigacao: 'Manter pró-labore compatível com o mercado' },
    ]

    resultado.recomendacaoPrincipal = recomendacao
    resultado.todasRecomendacoes    = [recomendacao]

    resultado.relatorio = {
      resumoExecutivo: `Fator R de ${(fatorR * 100).toFixed(2)}% — empresa elegível ao Anexo III do Simples Nacional. Economia estimada de R$ ${economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês (R$ ${(economiaTotal * 60).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em 60 meses).`,
      objetivoAnalise: 'Verificar o enquadramento correto no Simples Nacional via Fator R e identificar valores pagos a maior pela aplicação indevida do Anexo V.',
      escopoAnalise:   `Folha mensal: R$ ${folhaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Receita mensal: R$ ${receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      diagnosticoTecnico: `Fator R = ${(fatorR * 100).toFixed(2)}% ≥ 28% → Anexo III aplicável. Alíquota reduz de ${(aliqAnexoV * 100).toFixed(2)}% para ${(aliqAnexoIII * 100).toFixed(2)}%.`,
      oportunidadesTexto: `Economia de R$ ${economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês. Potencial retroativo de 5 anos.`,
      riscosTexto: resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: `${FUNDAMENTACAO.teseJuridica}. Base: ${FUNDAMENTACAO.baseLegal.map(b => b.norma).join('; ')}.`,
      recomendacoesTexto: recomendacao.descricao,
      planoAcao: recomendacao.passos,
      conclusaoExecutiva: `Economia mensal de R$ ${economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} identificada. Recomenda-se retificação imediata do PGDAS-D e protocolo de PER/DCOMP para os últimos 5 anos.`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: [
        { id: 'FATOR_R_001', descricao: 'Cálculo do Fator R',            resultado: `${(fatorR * 100).toFixed(2)}%` },
        { id: 'FATOR_R_002', descricao: 'Verificação de elegibilidade',  resultado: fatorR >= 0.28 ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL' },
        { id: 'FATOR_R_003', descricao: 'Cálculo da economia mensal',    resultado: `R$ ${economiaTotal.toFixed(2)}` },
      ],
      documentosUtilizados: [],
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA

    return finalizarResultado(resultado, inicio, {
      totalNFes: nfes?.length || 0, regime: cliente.regime,
      clienteCNPJ: cliente.cnpj || '', fatorR,
    })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor do Fator R: ${erro.message}`)
  }
}

export default analisarFatorR