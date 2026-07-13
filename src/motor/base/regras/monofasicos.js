/**
 * regras/monofasicos.js — Base de Conhecimento Tributária — FiscalTrib
 * Versão: 1.1 — Corrige cálculo de crédito e separa identificação de apuração.
 * Data: 2026-07-13
 */

import { isMonofasico, isAliquotaZero, classificarNCMTributario, getCategoriaMonofasica, getNCMMonofasico } from '../ncm/monofasicos.js'
import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE REGRAS
// ─────────────────────────────────────────────────────────────

export const ALIQUOTAS_NORMAIS = {
  cumulativo:    { pis: 0.65, cofins: 3.00 },
  naoCumulativo: { pis: 1.65, cofins: 7.60 },
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE IDENTIFICAÇÃO
// ─────────────────────────────────────────────────────────────

export function isProdutoMonofasico(item) {
  if (!item?.ncm) return false
  return isMonofasico(item.ncm)
}

export function isProdutoAliquotaZero(item) {
  if (!item?.ncm) return false
  return isAliquotaZero(item.ncm)
}

export function isNFeSaida(nfe) {
  if (!nfe?.tpNF) return true
  return nfe.tpNF === '1'
}

export function validarNFe(nfe) {
  if (!nfe)               return { valida: false, motivo: 'NF-e nula ou indefinida' }
  if (!nfe.valido)        return { valida: false, motivo: 'NF-e inválida — campos obrigatórios ausentes' }
  if (!nfe.competencia)   return { valida: false, motivo: 'Competência não identificada' }
  if (nfe.vNF <= 0)       return { valida: false, motivo: 'Valor total da NF-e é zero' }
  if (!isNFeSaida(nfe))   return { valida: false, motivo: 'NF-e de entrada — não gera crédito de monofásicos' }
  if (!nfe.itens?.length) return { valida: false, motivo: 'NF-e sem itens identificados' }
  return { valida: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// REGRAS DE CÁLCULO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o crédito recuperável de um item monofásico.
 *
 * IMPORTANTE — Simples Nacional:
 * O PIS/COFINS está embutido no DAS. Os valores de vItemPIS e vItemCOFINS
 * nas NF-es de saída do Simples geralmente são zero ou irrelevantes.
 * O crédito real requer os dados do PGDAS-D (RBT12, alíquota efetiva,
 * repartição de PIS/COFINS, DAS pago e DAS recalculado).
 * Por isso, para Simples Nacional, retornamos oportunidade identificada
 * com crédito = 0 e flag pendente_pgdas = true.
 *
 * Para Lucro Presumido e Lucro Real, os valores de PIS/COFINS estão
 * destacados nas NF-es e podem ser usados diretamente.
 */
export function calcularCreditoItem(item, regime = 'Simples Nacional') {
  if (!isProdutoMonofasico(item)) {
    return { creditoPIS: 0, creditoCOFINS: 0, credito: 0, estimado: false, pendentePGDAS: false }
  }

  const vProd       = item.vProd       || 0
  const vItemPIS    = item.vItemPIS    || 0
  const vItemCOFINS = item.vItemCOFINS || 0

  // ── Simples Nacional ─────────────────────────────────────────
  // PIS/COFINS está dentro do DAS — não usar vItemPIS/vItemCOFINS da NF-e
  // pois esses valores são do regime normal, não do Simples.
  // Crédito real = diferença entre DAS pago e DAS recalculado sem receita monofásica.
  if (regime === 'Simples Nacional') {
    return {
      creditoPIS:      0,
      creditoCOFINS:   0,
      credito:         0,
      estimado:        false,
      pendentePGDAS:   true,
      receitaMonofasica: vProd,
      obs: 'Simples Nacional — crédito pendente de apuração com PGDAS-D. ' +
           'Necessário: RBT12, anexo, faixa, alíquota efetiva, repartição PIS/COFINS, DAS pago.',
    }
  }

  // ── Lucro Presumido / Lucro Real ─────────────────────────────
  // PIS/COFINS destacado na NF-e — usar vItemPIS e vItemCOFINS
  if (vItemPIS > 0 || vItemCOFINS > 0) {
    return {
      creditoPIS:    vItemPIS,
      creditoCOFINS: vItemCOFINS,
      credito:       vItemPIS + vItemCOFINS,
      estimado:      false,
      pendentePGDAS: false,
      receitaMonofasica: vProd,
    }
  }

  // Fallback — valores não destacados: estima pela alíquota do regime
  const aliq = regime === 'Lucro Real'
    ? ALIQUOTAS_NORMAIS.naoCumulativo
    : ALIQUOTAS_NORMAIS.cumulativo

  return {
    creditoPIS:    vProd * (aliq.pis    / 100),
    creditoCOFINS: vProd * (aliq.cofins / 100),
    credito:       vProd * ((aliq.pis + aliq.cofins) / 100),
    estimado:      true,
    pendentePGDAS: false,
    receitaMonofasica: vProd,
    obs: `Estimativa — alíquotas do ${regime} aplicadas ao vProd (valores não destacados na NF-e).`,
  }
}

export function calcularCreditoNFe(nfe, regime = 'Simples Nacional') {
  const validacao = validarNFe(nfe)
  if (!validacao.valida) {
    return { valido: false, motivo: validacao.motivo, credito: 0, receitaMonofasica: 0, itens: [] }
  }

  const itensMonofasicos = (nfe.itens || []).filter(isProdutoMonofasico)
  if (itensMonofasicos.length === 0) {
    return { valido: true, credito: 0, receitaMonofasica: 0, itens: [], obs: 'Nenhum item monofásico nesta NF-e' }
  }

  let creditoTotal       = 0
  let receitaMonofasica  = 0
  let temEstimativa      = false
  let temPendentePGDAS   = false

  const itensCalculados = itensMonofasicos.map(item => {
    const calc = calcularCreditoItem(item, regime)
    creditoTotal      += calc.credito
    receitaMonofasica += calc.receitaMonofasica || 0
    if (calc.estimado)      temEstimativa    = true
    if (calc.pendentePGDAS) temPendentePGDAS = true
    return {
      ncm:              item.ncm,
      xProd:            item.xProd,
      categoria:        getCategoriaMonofasica(item.ncm),
      vProd:            item.vProd,
      receitaMonofasica: calc.receitaMonofasica || 0,
      ...calc,
    }
  })

  return {
    valido:           true,
    chNFe:            nfe.chNFe,
    competencia:      nfe.competencia,
    totalItens:       nfe.itens.length,
    itensMonofasicos: itensMonofasicos.length,
    credito:          creditoTotal,
    receitaMonofasica,
    estimado:         temEstimativa,
    pendentePGDAS:    temPendentePGDAS,
    itens:            itensCalculados,
  }
}

export function consolidarCreditosPorCompetencia(nfes, regime = 'Simples Nacional') {
  const porCompetencia = {}
  let creditoTotal          = 0
  let receitaMonofasicaTotal = 0
  let totalItensMonofasicos  = 0
  let totalNFesComOportunidade = 0

  nfes.forEach(nfe => {
    const calc = calcularCreditoNFe(nfe, regime)
    if (!calc.valido) return
    if (calc.itensMonofasicos === 0) return

    const comp = nfe.competencia
    if (!porCompetencia[comp]) {
      porCompetencia[comp] = {
        competencia:       comp,
        qtdNFes:           0,
        totalItemosMono:   0,
        credito:           0,
        receitaMonofasica: 0,
        estimado:          false,
        pendentePGDAS:     false,
      }
    }

    porCompetencia[comp].qtdNFes++
    porCompetencia[comp].totalItemosMono   += calc.itensMonofasicos
    porCompetencia[comp].credito           += calc.credito
    porCompetencia[comp].receitaMonofasica += calc.receitaMonofasica
    if (calc.estimado)      porCompetencia[comp].estimado      = true
    if (calc.pendentePGDAS) porCompetencia[comp].pendentePGDAS = true

    creditoTotal           += calc.credito
    receitaMonofasicaTotal += calc.receitaMonofasica
    totalItensMonofasicos  += calc.itensMonofasicos
    totalNFesComOportunidade++
  })

  const competencias = Object.values(porCompetencia).sort((a, b) =>
    a.competencia.localeCompare(b.competencia)
  )
  const meses = competencias.length || 1
  const pendentePGDAS = competencias.some(c => c.pendentePGDAS)

  return {
    creditoTotal,
    receitaMonofasicaTotal,
    // Projeções só fazem sentido se há crédito apurado (não Simples pendente)
    creditoMensalMedio:  creditoTotal > 0 ? creditoTotal / meses : 0,
    creditoPor12Meses:   creditoTotal > 0 ? (creditoTotal / meses) * 12 : 0,
    creditoPor24Meses:   creditoTotal > 0 ? (creditoTotal / meses) * 24 : 0,
    creditoPor36Meses:   creditoTotal > 0 ? (creditoTotal / meses) * 36 : 0,
    creditoPor60Meses:   creditoTotal > 0 ? (creditoTotal / meses) * 60 : 0,
    totalNFes:               nfes.length,
    totalNFesComOportunidade,
    totalItensMonofasicos,
    totalCompetencias:       competencias.length,
    periodoInicio:           competencias[0]?.competencia || '',
    periodoFim:              competencias[competencias.length - 1]?.competencia || '',
    pendentePGDAS,
    // Array para o Motor (porCompetencia como array)
    porCompetencia: competencias,
  }
}

export function calcularGrauConfianca(consolidado, nfes) {
  let pontos = 100

  if (consolidado.pendentePGDAS) pontos -= 30

  const comEstimativa = consolidado.porCompetencia?.filter(c => c.estimado).length || 0
  if (comEstimativa > 0) pontos -= 20

  if (nfes.length < 10)  pontos -= 15
  if (nfes.length < 50)  pontos -= 10

  if ((consolidado.totalCompetencias || 0) < 3)  pontos -= 10
  if ((consolidado.totalCompetencias || 0) < 12) pontos -= 5

  const semTpNF = nfes.filter(n => !n.tpNF).length
  if (semTpNF > 0) pontos -= 10

  pontos = Math.max(0, Math.min(100, pontos))
  const grau = pontos >= 80 ? 'ALTO' : pontos >= 60 ? 'MEDIO' : 'BAIXO'

  const justificativa =
    consolidado.pendentePGDAS
      ? 'Oportunidade identificada — crédito pendente de apuração com dados do PGDAS-D/DAS.'
      : grau === 'ALTO'  ? 'Dados completos com valores de PIS/COFINS destacados e período representativo.'
      : grau === 'MEDIO' ? 'Dados parcialmente completos — alguns valores estimados ou período curto.'
      :                    'Dados insuficientes — muitos valores estimados ou base de NF-es pequena.'

  return { grau, justificativa, pontos }
}

export function calcularScore(consolidado, confianca) {
  let score = 92
  if (confianca.grau === 'MEDIO') score -= 8
  if (confianca.grau === 'BAIXO') score -= 20
  if (consolidado.pendentePGDAS)  score -= 15
  if (consolidado.totalItensMonofasicos < 5)  score -= 10
  if (consolidado.totalItensMonofasicos < 20) score -= 5
  if (consolidado.totalCompetencias < 6)  score -= 10
  if (consolidado.totalCompetencias < 12) score -= 5
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function gerarDiagnostico(nfes, regime = 'Simples Nacional') {
  const nfesSaida   = nfes.filter(isNFeSaida)
  const nfesEntrada = nfes.filter(n => !isNFeSaida(n))
  const todosItens  = nfesSaida.flatMap(n => n.itens || [])

  const itensMono       = todosItens.filter(isProdutoMonofasico)
  const itensAliqZero   = todosItens.filter(isProdutoAliquotaZero)
  const itensComuns     = todosItens.filter(i => !isProdutoMonofasico(i) && !isProdutoAliquotaZero(i))

  const ncmsUnicos  = [...new Set(itensMono.map(i => i.ncm))]
  const categorias  = [...new Set(itensMono.map(i => getCategoriaMonofasica(i.ncm)).filter(Boolean))]
  const competencias = [...new Set(nfesSaida.map(n => n.competencia))].sort()

  const receitaMonofasica = itensMono.reduce((s, i) => s + (i.vProd || 0), 0)
  const receitaAliqZero   = itensAliqZero.reduce((s, i) => s + (i.vProd || 0), 0)
  const receitaComum      = itensComuns.reduce((s, i) => s + (i.vProd || 0), 0)

  return {
    totalNFesAnalisadas:     nfes.length,
    totalNFesSaida:          nfesSaida.length,
    totalNFesEntrada:        nfesEntrada.length,
    totalItens:              todosItens.length,
    totalItensMonofasicos:   itensMono.length,
    totalItensAliquotaZero:  itensAliqZero.length,
    totalItensComuns:        itensComuns.length,
    receitaMonofasica,
    receitaAliqZero,
    receitaComum,
    ncmsIdentificados:       ncmsUnicos,
    categorias,
    competencias,
    periodoInicio:           competencias[0]  || '',
    periodoFim:              competencias[competencias.length - 1] || '',
    totalCompetencias:       competencias.length,
    regime,
    pendentePGDAS:           regime === 'Simples Nacional' && itensMono.length > 0,
    situacoesEncontradas: [
      itensMono.length > 0
        ? `${itensMono.length} item(ns) monofásico(s) identificado(s) — receita: R$ ${receitaMonofasica.toFixed(2)}`
        : 'Nenhum item monofásico identificado',
      itensAliqZero.length > 0
        ? `${itensAliqZero.length} item(ns) com alíquota zero (cereais/outros) — não geram crédito monofásico`
        : null,
      nfesEntrada.length > 0
        ? `${nfesEntrada.length} NF-e(s) de entrada descartadas`
        : null,
      regime === 'Simples Nacional' && itensMono.length > 0
        ? 'Simples Nacional — crédito pendente de apuração com PGDAS-D'
        : null,
    ].filter(Boolean),
  }
}

export const META_REGRAS_MONOFASICOS = {
  versaoBase:   VERSAO_ATUAL.codigo,
  versaoRegras: '1.1',
  atualizadaEm: '2026-07-13',
  totalRegras:  8,
  observacao:   'v1.1 — Separados alíquota zero de monofásico. Simples Nacional retorna oportunidade pendente de apuração com PGDAS-D.',
}