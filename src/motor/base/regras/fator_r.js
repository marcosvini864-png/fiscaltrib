/**
 * regras/fator_r.js — Base de Conhecimento Tributária — FiscalTrib
 * Regras de negócio do Motor do Fator R.
 *
 * O Fator R é a relação entre a folha de salários e a receita bruta
 * dos últimos 12 meses de uma empresa prestadora de serviços optante
 * pelo Simples Nacional.
 *
 * Quando o Fator R ≥ 28%:
 * — Empresa enquadra no Anexo III (alíquotas menores)
 *
 * Quando o Fator R < 28%:
 * — Empresa enquadra no Anexo V (alíquotas maiores)
 *
 * Base legal:
 * — LC 123/2006, Art. 18
 * — Resolução CGSN 140/2018
 * — ADI RFB 25/2020
 * — SC COSIT 58/2019
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE REGRAS
// ─────────────────────────────────────────────────────────────

// Limiar do Fator R para migração de anexo
export const LIMIAR_FATOR_R = 0.28  // 28%

// Tabelas de alíquotas do Simples Nacional 2024
// Fonte: LC 123/2006 Anexo III e V (vigentes)
export const TABELA_ANEXO_III = [
  { faixaMin: 0,          faixaMax: 180000,    aliq: 0.060,  deducao: 0       },
  { faixaMin: 180000.01,  faixaMax: 360000,    aliq: 0.112,  deducao: 9360    },
  { faixaMin: 360000.01,  faixaMax: 720000,    aliq: 0.135,  deducao: 17640   },
  { faixaMin: 720000.01,  faixaMax: 1800000,   aliq: 0.160,  deducao: 35640   },
  { faixaMin: 1800000.01, faixaMax: 3600000,   aliq: 0.210,  deducao: 125640  },
  { faixaMin: 3600000.01, faixaMax: 4800000,   aliq: 0.330,  deducao: 648000  },
]

export const TABELA_ANEXO_V = [
  { faixaMin: 0,          faixaMax: 180000,    aliq: 0.155,  deducao: 0       },
  { faixaMin: 180000.01,  faixaMax: 360000,    aliq: 0.180,  deducao: 4500    },
  { faixaMin: 360000.01,  faixaMax: 720000,    aliq: 0.195,  deducao: 9900    },
  { faixaMin: 720000.01,  faixaMax: 1800000,   aliq: 0.205,  deducao: 17100   },
  { faixaMin: 1800000.01, faixaMax: 3600000,   aliq: 0.230,  deducao: 62100   },
  { faixaMin: 3600000.01, faixaMax: 4800000,   aliq: 0.305,  deducao: 540000  },
]

// Serviços que NÃO migram pelo Fator R (permanecem no Anexo IV)
export const SERVICOS_ANEXO_IV_FIXO = [
  'Construção de imóveis e obras de engenharia em geral',
  'Serviço de vigilância, limpeza ou conservação',
  'Serviços advocatícios',
]

// ─────────────────────────────────────────────────────────────
// REGRAS DE ELEGIBILIDADE
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se o regime é elegível para análise do Fator R.
 *
 * @param {string} regime
 * @returns {{ elegivel: boolean, motivo: string }}
 */
export function verificarElegibilidadeFatorR(regime) {
  if (!regime) {
    return { elegivel: false, motivo: 'Regime tributário não informado' }
  }
  if (regime !== 'Simples Nacional') {
    return {
      elegivel: false,
      motivo:   `Fator R aplica-se apenas ao Simples Nacional. Regime atual: ${regime}.`,
    }
  }
  return { elegivel: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CÁLCULO DO FATOR R
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o Fator R de um período.
 * Fator R = Folha de Salários (12m) / Receita Bruta (12m)
 *
 * @param {number} folhaSalarios  - Folha total dos últimos 12 meses
 * @param {number} receitaBruta   - Receita bruta dos últimos 12 meses
 * @returns {object}
 */
export function calcularFatorR(folhaSalarios, receitaBruta) {
  if (!folhaSalarios || !receitaBruta || receitaBruta <= 0) {
    return {
      fatorR:      0,
      percentual:  '0,00%',
      anexo:       'INDETERMINADO',
      migra:       false,
      valido:      false,
      motivo:      'Folha de salários ou receita bruta não informada',
    }
  }

  const fatorR    = folhaSalarios / receitaBruta
  const migra     = fatorR >= LIMIAR_FATOR_R
  const anexo     = migra ? 'III' : 'V'
  const percentual = (fatorR * 100).toFixed(2) + '%'
  const diferenca  = fatorR - LIMIAR_FATOR_R

  return {
    fatorR,
    percentual,
    anexo,
    migra,
    valido:          true,
    folhaSalarios,
    receitaBruta,
    limiar:          LIMIAR_FATOR_R,
    limiarPercentual:'28,00%',
    diferenca,
    diferencaPercentual: (diferenca * 100).toFixed(2) + '%',
    obs: migra
      ? `Fator R ${percentual} ≥ 28% → Enquadrado no Anexo III (menor carga)`
      : `Fator R ${percentual} < 28% → Enquadrado no Anexo V (maior carga). Falta ${Math.abs(diferenca * 100).toFixed(2)}% para atingir 28%.`,
  }
}

/**
 * Calcula o Fator R mês a mês com base nos dados do PGDAS.
 *
 * @param {Array} competencias - Array de { competencia, receitaBruta, folha }
 * @returns {Array} Fator R por competência (janela móvel de 12 meses)
 */
export function calcularFatorRPorCompetencia(competencias) {
  if (!competencias || competencias.length === 0) return []

  const ordenadas = [...competencias].sort((a, b) =>
    a.competencia.localeCompare(b.competencia)
  )

  return ordenadas.map((comp, idx) => {
    // Janela móvel de 12 meses (mês atual + 11 anteriores)
    const inicio    = Math.max(0, idx - 11)
    const janela    = ordenadas.slice(inicio, idx + 1)
    const folha12m  = janela.reduce((s, c) => s + (c.folha || 0), 0)
    const receita12m = janela.reduce((s, c) => s + (c.receitaBruta || 0), 0)

    const calc = calcularFatorR(folha12m, receita12m)
    return {
      competencia: comp.competencia,
      folhaMes:    comp.folha || 0,
      receitaMes:  comp.receitaBruta || 0,
      folha12m,
      receita12m,
      mesesNaJanela: janela.length,
      ...calc,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CÁLCULO DE ALÍQUOTA E ECONOMIA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula a alíquota efetiva do Simples Nacional para um anexo.
 *
 * @param {number} receitaBruta12m - Receita bruta acumulada dos últimos 12 meses
 * @param {string} anexo           - 'III' ou 'V'
 * @returns {object}
 */
export function calcularAliquotaEfetiva(receitaBruta12m, anexo = 'III') {
  const tabela = anexo === 'III' ? TABELA_ANEXO_III : TABELA_ANEXO_V

  const faixa = tabela.find(f =>
    receitaBruta12m >= f.faixaMin && receitaBruta12m <= f.faixaMax
  )

  if (!faixa) {
    return {
      aliquotaEfetiva: 0,
      faixa:           null,
      anexo,
      valido:          false,
      motivo:          'Receita bruta fora das faixas do Simples Nacional',
    }
  }

  // Fórmula: alíquota efetiva = (RBT12 × alíquota - dedução) / RBT12
  const aliquotaEfetiva = (receitaBruta12m * faixa.aliq - faixa.deducao) / receitaBruta12m

  return {
    aliquotaEfetiva,
    aliquotaEfetivaPercentual: (aliquotaEfetiva * 100).toFixed(4) + '%',
    aliquotaNominal:            faixa.aliq,
    deducao:                    faixa.deducao,
    faixaMin:                   faixa.faixaMin,
    faixaMax:                   faixa.faixaMax,
    anexo,
    receitaBruta12m,
    valido:                     true,
  }
}

/**
 * Calcula a economia tributária com a migração do Anexo V para o III.
 *
 * @param {number} receitaBrutaMensal  - Receita bruta do mês atual
 * @param {number} receitaBruta12m     - Receita bruta dos últimos 12 meses
 * @returns {object}
 */
export function calcularEconomiaMigracao(receitaBrutaMensal, receitaBruta12m) {
  if (receitaBrutaMensal <= 0 || receitaBruta12m <= 0) {
    return { economiaMensal: 0, economiaAnual: 0, valido: false }
  }

  const aliqAnexoIII = calcularAliquotaEfetiva(receitaBruta12m, 'III')
  const aliqAnexoV   = calcularAliquotaEfetiva(receitaBruta12m, 'V')

  if (!aliqAnexoIII.valido || !aliqAnexoV.valido) {
    return {
      economiaMensal: 0,
      economiaAnual:  0,
      valido:         false,
      motivo:         'Não foi possível calcular as alíquotas',
    }
  }

  const dasAnexoIII    = receitaBrutaMensal * aliqAnexoIII.aliquotaEfetiva
  const dasAnexoV      = receitaBrutaMensal * aliqAnexoV.aliquotaEfetiva
  const economiaMensal = dasAnexoV - dasAnexoIII
  const economiaAnual  = economiaMensal * 12

  return {
    dasAnexoIII,
    dasAnexoV,
    economiaMensal,
    economiaAnual,
    economiaPercentual:   aliqAnexoV.aliquotaEfetiva > 0
      ? ((economiaMensal / (receitaBrutaMensal * aliqAnexoV.aliquotaEfetiva)) * 100).toFixed(2) + '%'
      : '0%',
    aliquotaEfetivaIII:   aliqAnexoIII.aliquotaEfetivaPercentual,
    aliquotaEfetivaV:     aliqAnexoV.aliquotaEfetivaPercentual,
    diferencaAliquota:    ((aliqAnexoV.aliquotaEfetiva - aliqAnexoIII.aliquotaEfetiva) * 100).toFixed(4) + '%',
    receitaBrutaMensal,
    receitaBruta12m,
    valido:               true,
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SIMULAÇÃO DE FOLHA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula quanto a folha precisa aumentar para atingir o Fator R de 28%.
 *
 * @param {number} folhaAtual    - Folha atual dos últimos 12 meses
 * @param {number} receitaBruta12m - Receita bruta dos últimos 12 meses
 * @returns {object}
 */
export function calcularFolhaNecessaria(folhaAtual, receitaBruta12m) {
  if (receitaBruta12m <= 0) {
    return { folhaNecessaria: 0, aumentoNecessario: 0, valido: false }
  }

  const fatorRAtual     = folhaAtual / receitaBruta12m
  const folhaNecessaria = receitaBruta12m * LIMIAR_FATOR_R
  const aumentoNecessario = Math.max(0, folhaNecessaria - folhaAtual)
  const aumentoMensal     = aumentoNecessario / 12

  return {
    fatorRAtual,
    fatorRAtualPercentual:    (fatorRAtual * 100).toFixed(2) + '%',
    folhaAtual,
    folhaNecessaria,
    aumentoNecessario,
    aumentoMensal,
    jaMigra:                  fatorRAtual >= LIMIAR_FATOR_R,
    valido:                   true,
    obs: fatorRAtual >= LIMIAR_FATOR_R
      ? 'Empresa já está no Anexo III — Fator R ≥ 28%'
      : `Necessário aumentar a folha em R$ ${aumentoMensal.toFixed(2)}/mês para atingir 28%`,
  }
}

/**
 * Simula o Fator R com diferentes valores de pró-labore.
 *
 * @param {number} folhaAtualSemProLabore - Folha atual excluindo pró-labore
 * @param {number} receitaBruta12m        - Receita bruta 12 meses
 * @param {Array}  cenariosProlabore       - Array de valores de pró-labore a simular
 * @returns {Array}
 */
export function simularCenariosProLabore(
  folhaAtualSemProLabore,
  receitaBruta12m,
  cenariosProlabore = [1000, 2000, 3000, 5000, 8000, 10000]
) {
  return cenariosProlabore.map(prolaboreMensal => {
    const prolabore12m   = prolaboreMensal * 12
    const folhaTotal12m  = folhaAtualSemProLabore + prolabore12m
    const calc           = calcularFatorR(folhaTotal12m, receitaBruta12m)

    return {
      prolaboreMensal,
      prolabore12m,
      folhaTotal12m,
      fatorR:              calc.fatorR,
      percentual:          calc.percentual,
      migra:               calc.migra,
      anexo:               calc.anexo,
      alertaRisco:         prolaboreMensal > 20000
        ? 'ALTO — Pró-labore muito elevado pode ser questionado pela RFB como artificial'
        : prolaboreMensal > 10000
        ? 'MEDIO — Avaliar compatibilidade com o mercado'
        : 'BAIXO',
    }
  })
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE DIAGNÓSTICO
// ─────────────────────────────────────────────────────────────

/**
 * Gera o diagnóstico completo do Fator R.
 *
 * @param {object} params
 * @param {number} params.folhaSalarios12m   - Folha dos últimos 12 meses
 * @param {number} params.receitaBruta12m    - Receita dos últimos 12 meses
 * @param {number} params.receitaBrutaMensal - Receita do mês atual
 * @param {string} params.regime             - Regime tributário
 * @returns {object}
 */
export function gerarDiagnosticoFatorR({
  folhaSalarios12m,
  receitaBruta12m,
  receitaBrutaMensal,
  regime,
}) {
  const elegibilidade = verificarElegibilidadeFatorR(regime)
  const fatorR        = calcularFatorR(folhaSalarios12m, receitaBruta12m)
  const folhaNecessaria = calcularFolhaNecessaria(folhaSalarios12m, receitaBruta12m)

  let economia = null
  if (fatorR.migra) {
    economia = calcularEconomiaMigracao(receitaBrutaMensal, receitaBruta12m)
  }

  return {
    elegivel:           elegibilidade.elegivel,
    motivoInelegivel:   elegibilidade.motivo,
    fatorR:             fatorR.fatorR,
    fatorRPercentual:   fatorR.percentual,
    migraParaAnexoIII:  fatorR.migra,
    anexoAtual:         fatorR.migra ? 'III' : 'V',
    folhaSalarios12m,
    receitaBruta12m,
    receitaBrutaMensal,
    folhaNecessariaParaMigrar: folhaNecessaria.folhaNecessaria,
    aumentoMensalNecessario:   folhaNecessaria.aumentoMensal,
    economia,
    regime,
    situacoesEncontradas: [
      elegibilidade.elegivel
        ? `Empresa elegível — optante pelo Simples Nacional`
        : `Empresa NÃO elegível — ${elegibilidade.motivo}`,
      `Fator R atual: ${fatorR.percentual} (${fatorR.migra ? 'MIGRA para Anexo III' : 'permanece no Anexo V'})`,
      fatorR.migra
        ? `Economia estimada: R$ ${economia?.economiaMensal?.toFixed(2)}/mês`
        : `Necessário aumentar folha em R$ ${folhaNecessaria.aumentoMensal?.toFixed(2)}/mês para migrar`,
    ].filter(Boolean),
  }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE SCORE E CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o grau de confiança da análise do Fator R.
 *
 * @param {object} diagnostico - Resultado do diagnóstico
 * @returns {{ grau: string, justificativa: string, pontos: number }}
 */
export function calcularGrauConfiancaFatorR(diagnostico) {
  let pontos = 100

  // Sem dados de folha — não é possível calcular com precisão
  if (!diagnostico.folhaSalarios12m || diagnostico.folhaSalarios12m <= 0) {
    pontos -= 40
  }

  // Empresa já migra — alta confiança
  if (diagnostico.migraParaAnexoIII) {
    pontos += 5
  }

  // Fator R muito próximo do limiar — risco de alternância
  const diff = Math.abs(diagnostico.fatorR - LIMIAR_FATOR_R)
  if (diff < 0.02) pontos -= 15  // menos de 2% de margem

  // Regime não elegível
  if (!diagnostico.elegivel) pontos = 0

  pontos = Math.max(0, Math.min(100, pontos))
  const grau = pontos >= 80 ? 'ALTO' : pontos >= 60 ? 'MEDIO' : 'BAIXO'

  const justificativa =
    grau === 'ALTO'  ? 'Dados completos e Fator R bem definido acima ou abaixo de 28%.' :
    grau === 'MEDIO' ? 'Fator R próximo do limiar ou dados parciais — monitorar mensalmente.' :
                       'Dados insuficientes ou empresa inelegível para análise do Fator R.'

  return { grau, justificativa, pontos }
}

/**
 * Calcula o score do Motor de Fator R.
 *
 * @param {object} diagnostico
 * @param {object} confianca
 * @returns {number}
 */
export function calcularScoreFatorR(diagnostico, confianca) {
  let score = 85  // score base

  if (!diagnostico.elegivel)         score = 0
  if (confianca.grau === 'MEDIO')    score -= 8
  if (confianca.grau === 'BAIXO')    score -= 25
  if (!diagnostico.migraParaAnexoIII) score -= 15  // não migra — oportunidade limitada

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Metadados das regras do Fator R.
 */
export const META_REGRAS_FATOR_R = {
  versaoBase:   VERSAO_ATUAL.codigo,
  versaoRegras: '1.0',
  atualizadaEm: '2026-07-08',
  totalRegras:  8,
  observacao:   'Regras baseadas na LC 123/2006, Resolução CGSN 140/2018, ' +
                'ADI RFB 25/2020 e SC COSIT 58/2019. ' +
                'Tabelas de alíquotas vigentes em 2026 — verificar atualizações anuais.',
}