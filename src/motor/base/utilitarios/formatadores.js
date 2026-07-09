/**
 * formatadores.js — Base de Conhecimento Tributária — FiscalTrib
 * Funções de formatação de textos para relatórios e interface.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL }                          from '../versionamento/versoes.js'
import { formatarMoeda, formatarPercentual }      from './moedas.js'
import { formatarData, formatarCompetencia, formatarPeriodo } from './datas.js'
import { formatarCNPJ, formatarNCM }              from './validacoes.js'

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE GRAU DE CONFIANÇA
// ─────────────────────────────────────────────────────────────

/**
 * Formata o grau de confiança para exibição.
 *
 * @param {string} grau - 'ALTO', 'MEDIO', 'BAIXO'
 * @returns {{ label: string, emoji: string, cor: string }}
 */
export function formatarGrauConfianca(grau) {
  const mapa = {
    ALTO:  { label: 'Alta Confiabilidade',  emoji: '🟢', cor: '#16a34a' },
    MEDIO: { label: 'Média Confiabilidade', emoji: '🟡', cor: '#d97706' },
    BAIXO: { label: 'Baixa Confiabilidade', emoji: '🔴', cor: '#dc2626' },
  }
  return mapa[grau] || { label: 'Não calculado', emoji: '⚪', cor: '#94a3b8' }
}

/**
 * Formata um score (0-100) para exibição.
 *
 * @param {number} score
 * @returns {{ label: string, emoji: string, cor: string, scoreFormatado: string }}
 */
export function formatarScore(score) {
  const s = Math.round(score || 0)
  const classificacao =
    s >= 90 ? { label: 'Excelente', emoji: '🟢', cor: '#16a34a' } :
    s >= 70 ? { label: 'Bom',       emoji: '🔵', cor: '#2563eb' } :
    s >= 50 ? { label: 'Regular',   emoji: '🟡', cor: '#d97706' } :
              { label: 'Crítico',   emoji: '🔴', cor: '#dc2626' }

  return {
    ...classificacao,
    score,
    scoreFormatado: `${s}/100`,
  }
}

/**
 * Formata o nível de risco para exibição.
 *
 * @param {string} risco - 'ALTO', 'MEDIO', 'BAIXO'
 * @returns {{ label: string, emoji: string, cor: string, corFundo: string }}
 */
export function formatarRisco(risco) {
  const mapa = {
    ALTO:  { label: 'Risco Alto',  emoji: '🔴', cor: '#dc2626', corFundo: '#fff1f2' },
    MEDIO: { label: 'Risco Médio', emoji: '🟡', cor: '#d97706', corFundo: '#fffbeb' },
    BAIXO: { label: 'Risco Baixo', emoji: '🟢', cor: '#16a34a', corFundo: '#f0fdf4' },
  }
  return mapa[risco] || { label: 'Não avaliado', emoji: '⚪', cor: '#94a3b8', corFundo: '#f8fafc' }
}

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE REGIME E STATUS
// ─────────────────────────────────────────────────────────────

/**
 * Formata o regime tributário com ícone.
 *
 * @param {string} regime
 * @returns {string}
 */
export function formatarRegime(regime) {
  const mapa = {
    'Simples Nacional': '🟦 Simples Nacional',
    'Lucro Presumido':  '🟧 Lucro Presumido',
    'Lucro Real':       '🟥 Lucro Real',
  }
  return mapa[regime] || regime || '—'
}

/**
 * Formata o status de uma análise.
 *
 * @param {string} status - STATUS_ANALISE
 * @returns {{ label: string, emoji: string, cor: string }}
 */
export function formatarStatusAnalise(status) {
  const mapa = {
    CONCLUIDA:          { label: 'Concluída',           emoji: '✅', cor: '#16a34a' },
    CONCLUIDA_PARCIAL:  { label: 'Concluída Parcial',   emoji: '🟡', cor: '#d97706' },
    SEM_DADOS:          { label: 'Sem Dados',           emoji: '⚪', cor: '#94a3b8' },
    ERRO:               { label: 'Erro na Análise',     emoji: '❌', cor: '#dc2626' },
  }
  return mapa[status] || { label: status || 'Indefinido', emoji: '⚪', cor: '#94a3b8' }
}

/**
 * Formata o CAPAG para exibição.
 *
 * @param {string} classe - 'A', 'B', 'C', 'D'
 * @returns {{ label: string, emoji: string, cor: string, descricao: string }}
 */
export function formatarCAP(classe) {
  const mapa = {
    A: { label: 'CAPAG A', emoji: '🟢', cor: '#16a34a', descricao: 'Alta capacidade de pagamento'   },
    B: { label: 'CAPAG B', emoji: '🔵', cor: '#2563eb', descricao: 'Média capacidade de pagamento'  },
    C: { label: 'CAPAG C', emoji: '🟡', cor: '#d97706', descricao: 'Baixa capacidade de pagamento'  },
    D: { label: 'CAPAG D', emoji: '🔴', cor: '#dc2626', descricao: 'Mínima capacidade de pagamento' },
  }
  return mapa[classe] || { label: '—', emoji: '⚪', cor: '#94a3b8', descricao: 'Não calculado' }
}

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE TEXTOS DE RELATÓRIO
// ─────────────────────────────────────────────────────────────

/**
 * Gera o texto de resumo executivo padrão de uma análise.
 *
 * @param {object} params
 * @returns {string}
 */
export function gerarResumoExecutivo({
  clienteNome,
  clienteRegime,
  motorNome,
  totalOportunidades,
  creditoTotal,
  periodoInicio,
  periodoFim,
  grauConfianca,
}) {
  const periodo = formatarPeriodo(periodoInicio, periodoFim)
  const credito = formatarMoeda(creditoTotal)
  const conf    = formatarGrauConfianca(grauConfianca)

  if (totalOportunidades === 0) {
    return `A análise de ${motorNome} realizada para ${clienteNome} (${clienteRegime}) ` +
           `referente ao período ${periodo} não identificou oportunidades de recuperação tributária ` +
           `com base nos documentos fiscais importados. Recomenda-se análise manual complementar.`
  }

  return `A análise de ${motorNome} realizada para ${clienteNome} (${clienteRegime}) ` +
         `referente ao período ${periodo} identificou ${totalOportunidades} oportunidade(s) ` +
         `de recuperação tributária com potencial estimado de ${credito} em 60 meses. ` +
         `Grau de confiabilidade da análise: ${conf.label} ${conf.emoji}.`
}

/**
 * Gera o texto de objetivo da análise por motor.
 *
 * @param {string} motor
 * @param {string} regime
 * @returns {string}
 */
export function gerarObjetivoAnalise(motor, regime) {
  const objetivos = {
    MONOFASICOS:     `Identificar produtos sujeitos ao regime monofásico de PIS/COFINS ` +
                     `nas NF-es de saída e calcular o crédito recuperável pelo recolhimento indevido.`,
    EXCLUSAO_ICMS:   `Calcular o crédito de PIS/COFINS decorrente da exclusão do ICMS da base ` +
                     `de cálculo, conforme decisão do STF no RE 574.706 (Tema 69).`,
    ICMS_ST:         regime === 'Simples Nacional'
                     ? `Identificar o ICMS-ST retido por substituição tributária e calcular ` +
                       `o DAS pago a maior pela inclusão indevida do ICMS-ST na base de cálculo.`
                     : `Calcular o crédito de PIS/COFINS pela exclusão do ICMS-ST da base de cálculo.`,
    FATOR_R:         `Calcular o Fator R da empresa e verificar a elegibilidade para migração ` +
                     `do Anexo V para o Anexo III do Simples Nacional, reduzindo a carga tributária.`,
    INSS:            `Identificar contribuições previdenciárias recolhidas indevidamente sobre ` +
                     `verbas de natureza indenizatória (aviso prévio, terço de férias, PLR).`,
    IRPJ_CSLL:       `Analisar oportunidades de redução de IRPJ e CSLL, incluindo JCP, ` +
                     `aproveitamento de prejuízo fiscal e crédito sobre SELIC (Tema 962 STF).`,
    DIVIDA_ATIVA:    `Analisar os débitos inscritos em dívida ativa, identificar oportunidades de ` +
                     `extinção por prescrição ou decadência e simular condições de transação tributária.`,
    PRESCRICAO:      `Identificar créditos tributários e execuções fiscais alcançadas pela prescrição ` +
                     `ou prescrição intercorrente, visando a extinção ou redução dos débitos.`,
    DECADENCIA:      `Verificar se os lançamentos tributários foram realizados dentro do prazo ` +
                     `decadencial de 5 anos, identificando autuações passíveis de anulação.`,
    CAPAG:           `Calcular a Capacidade de Pagamento (CAPAG) do contribuinte e simular as ` +
                     `condições de desconto disponíveis na transação tributária com a PGFN.`,
    TRANSACAO:       `Identificar os débitos elegíveis para transação tributária e simular as ` +
                     `condições de pagamento com desconto conforme o CAPAG do contribuinte.`,
  }
  return objetivos[motor] || `Análise tributária — motor ${motor}.`
}

/**
 * Gera o texto de escopo da análise.
 *
 * @param {object} params
 * @returns {string}
 */
export function gerarEscopoAnalise({
  totalDocumentos,
  tipoDocumento,
  periodoInicio,
  periodoFim,
  regime,
  totalCompetencias,
}) {
  const periodo = formatarPeriodo(periodoInicio, periodoFim)
  return `Foram analisados ${totalDocumentos} ${tipoDocumento || 'documento(s) fiscal(is)'} ` +
         `referentes ao período ${periodo} (${totalCompetencias} competência(s)), ` +
         `considerando o regime tributário ${regime}.`
}

/**
 * Gera o texto de fundamentação legal resumida.
 *
 * @param {object} fundamentacao - objeto do contrato Fundamentacao.js
 * @returns {string}
 */
export function gerarFundamentacaoTexto(fundamentacao) {
  if (!fundamentacao) return 'Fundamentação não disponível.'

  const partes = []

  if (fundamentacao.resumo) {
    partes.push(fundamentacao.resumo)
  }

  if (fundamentacao.legislacao?.length > 0) {
    const leis = fundamentacao.legislacao.slice(0, 3).map(l => l.numero).join(', ')
    partes.push(`Base legal: ${leis}.`)
  }

  if (fundamentacao.jurisprudencia?.length > 0) {
    const juris = fundamentacao.jurisprudencia.slice(0, 2)
      .map(j => `${j.tribunal} — ${j.numero}`)
      .join('; ')
    partes.push(`Jurisprudência: ${juris}.`)
  }

  return partes.join(' ')
}

/**
 * Gera o texto de recomendações para o relatório.
 *
 * @param {Array} recomendacoes - Array do contrato Recomendacao.js
 * @returns {string}
 */
export function gerarRecomendacoesTexto(recomendacoes) {
  if (!recomendacoes || recomendacoes.length === 0) {
    return 'Nenhuma recomendação gerada para esta análise.'
  }

  return recomendacoes
    .slice(0, 5)
    .map((r, i) => `${i + 1}. ${r.titulo}: ${r.descricao}`)
    .join('\n')
}

/**
 * Gera o texto de conclusão executiva.
 *
 * @param {object} params
 * @returns {string}
 */
export function gerarConclusaoExecutiva({
  totalOportunidades,
  creditoTotal,
  grauConfianca,
  nivelRisco,
  via,
  prazoRetroativo,
}) {
  const credito = formatarMoeda(creditoTotal)
  const conf    = formatarGrauConfianca(grauConfianca)
  const risco   = formatarRisco(nivelRisco)
  const viaTexto = via === 'ADMINISTRATIVA'  ? 'administrativa (PER/DCOMP)'
                 : via === 'JUDICIAL'         ? 'judicial (mandado de segurança ou ação anulatória)'
                 : via === 'AMBAS'            ? 'administrativa e judicial em paralelo'
                 : via

  if (totalOportunidades === 0) {
    return `Com base nos documentos analisados, não foram identificadas oportunidades de ` +
           `recuperação tributária neste período. Recomenda-se revisar com documentos adicionais ` +
           `ou ampliar o período de análise.`
  }

  return `Com base na análise realizada com ${conf.label.toLowerCase()} ${conf.emoji}, ` +
         `foram identificadas ${totalOportunidades} oportunidade(s) com potencial estimado de ` +
         `${credito} referente ao período retroativo de ${prazoRetroativo}. ` +
         `Nível de risco: ${risco.label} ${risco.emoji}. ` +
         `Via recomendada: ${viaTexto}. ` +
         `Recomenda-se dar início ao processo de recuperação imediatamente para evitar a prescrição dos créditos.`
}

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE EVIDÊNCIAS
// ─────────────────────────────────────────────────────────────

/**
 * Formata uma evidência para exibição em relatório.
 *
 * @param {object} evidencia - objeto do contrato Evidencia.js
 * @returns {string}
 */
export function formatarEvidenciaTexto(evidencia) {
  if (!evidencia) return '—'

  const partes = []

  if (evidencia.documento?.numero) {
    partes.push(`NF-e nº ${evidencia.documento.numero}`)
  } else if (evidencia.documento?.chaveAcesso) {
    partes.push(`Chave: ...${evidencia.documento.chaveAcesso.slice(-8)}`)
  }

  if (evidencia.competencia) {
    partes.push(`Competência: ${formatarCompetencia(evidencia.competencia)}`)
  }

  if (evidencia.item?.ncm) {
    partes.push(`NCM: ${formatarNCM(evidencia.item.ncm)}`)
  }

  if (evidencia.item?.descricao) {
    partes.push(`Produto: ${evidencia.item.descricao}`)
  }

  if (evidencia.valores?.creditoIdentificado > 0) {
    partes.push(`Crédito: ${formatarMoeda(evidencia.valores.creditoIdentificado)}`)
  }

  return partes.join(' | ')
}

/**
 * Formata um array de evidências para exibição resumida.
 *
 * @param {Array}  evidencias
 * @param {number} limite - Máximo de evidências a exibir
 * @returns {string}
 */
export function formatarEvidenciasResumo(evidencias, limite = 5) {
  if (!evidencias || evidencias.length === 0) return 'Nenhuma evidência disponível.'

  const exibidas  = evidencias.slice(0, limite)
  const restantes = evidencias.length - exibidas.length

  const linhas = exibidas.map((ev, i) => `${i + 1}. ${formatarEvidenciaTexto(ev)}`)

  if (restantes > 0) {
    linhas.push(`... e mais ${restantes} evidência(s) não exibida(s).`)
  }

  return linhas.join('\n')
}

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE PLANO DE AÇÃO
// ─────────────────────────────────────────────────────────────

/**
 * Formata um plano de ação para texto de relatório.
 *
 * @param {Array} passos - [{ ordem, acao, responsavel, prazo }]
 * @returns {string}
 */
export function formatarPlanoAcaoTexto(passos) {
  if (!passos || passos.length === 0) return 'Plano de ação não disponível.'

  return passos
    .map(p => {
      const prazo = p.prazo ? ` (prazo: ${p.prazo})` : ''
      const resp  = p.responsavel ? ` [${p.responsavel}]` : ''
      return `${p.ordem}. ${p.acao}${prazo}${resp}`
    })
    .join('\n')
}

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE CÁLCULOS
// ─────────────────────────────────────────────────────────────

/**
 * Formata um objeto de cálculo consolidado para texto.
 *
 * @param {object} calculos - Do ResultadoPadrao
 * @returns {string}
 */
export function formatarCalculosTexto(calculos) {
  if (!calculos) return 'Cálculos não disponíveis.'

  const partes = []

  if (calculos.creditoEstimado > 0) {
    partes.push(`Crédito estimado total: ${formatarMoeda(calculos.creditoEstimado)}`)
  }

  if (calculos.creditoMensalMedio > 0) {
    partes.push(`Média mensal: ${formatarMoeda(calculos.creditoMensalMedio)}`)
  }

  if (calculos.creditoPor12Meses > 0) {
    partes.push(`Projeção 12 meses: ${formatarMoeda(calculos.creditoPor12Meses)}`)
  }

  if (calculos.creditoPor60Meses > 0) {
    partes.push(`Projeção 60 meses: ${formatarMoeda(calculos.creditoPor60Meses)}`)
  }

  if (calculos.observacoesTecnicas) {
    partes.push(`Obs: ${calculos.observacoesTecnicas}`)
  }

  return partes.join('. ') + '.'
}

/**
 * Formata uma tabela de créditos por competência para texto.
 *
 * @param {object} porCompetencia
 * @param {number} limite
 * @returns {string}
 */
export function formatarTabelaCompetenciasTexto(porCompetencia, limite = 12) {
  if (!porCompetencia || Object.keys(porCompetencia).length === 0) {
    return 'Sem dados por competência.'
  }

  const entradas = Object.entries(porCompetencia)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limite)

  const linhas = entradas.map(([comp, dados]) => {
    const credito = formatarMoeda(dados.credito || 0)
    return `${formatarCompetencia(comp)}: ${credito}`
  })

  const restantes = Object.keys(porCompetencia).length - entradas.length
  if (restantes > 0) linhas.push(`... e mais ${restantes} competência(s).`)

  return linhas.join('\n')
}

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE ASSINATURA
// ─────────────────────────────────────────────────────────────

/**
 * Formata a assinatura de versão para exibição no relatório.
 *
 * @param {object} assinatura - Do gerarAssinaturaAnalise()
 * @returns {string}
 */
export function formatarAssinaturaRelatorio(assinatura) {
  if (!assinatura) return ''

  return [
    `Análise realizada em: ${assinatura.realizadoEmFormatado || formatarData(assinatura.realizadaEm)}`,
    `FiscalTrib: ${assinatura.fiscaltrib || '—'}`,
    `Base Tributária: ${assinatura.baseTributaria || '—'}`,
    `Motor: ${assinatura.motor || '—'} v${assinatura.versaoMotor || '—'}`,
    `Legislação considerada até: ${formatarData(assinatura.legislacaoAte)}`,
  ].join('\n')
}

/**
 * Formata os metadados de execução para exibição.
 *
 * @param {object} meta - Do ResultadoPadrao.meta
 * @returns {string}
 */
export function formatarMetadadosExecucao(meta) {
  if (!meta) return ''

  const partes = []
  if (meta.executadoEm)        partes.push(`Executado em: ${formatarData(meta.executadoEm)}`)
  if (meta.duracaoMs)          partes.push(`Tempo de processamento: ${meta.duracaoMs}ms`)
  if (meta.documentosAnalisados) partes.push(`Documentos analisados: ${meta.documentosAnalisados}`)
  if (meta.versaoMotor)        partes.push(`Versão do motor: ${meta.versaoMotor}`)
  if (meta.ambiente)           partes.push(`Ambiente: ${meta.ambiente}`)

  return partes.join(' | ')
}

// ─────────────────────────────────────────────────────────────
// FORMATADORES DE DADOS DO CLIENTE
// ─────────────────────────────────────────────────────────────

/**
 * Formata os dados do cliente para cabeçalho de relatório.
 *
 * @param {object} cliente - { razao_social, cnpj, regime }
 * @returns {string}
 */
export function formatarCabecalhoCliente(cliente) {
  if (!cliente) return '—'
  const partes = []
  if (cliente.razao_social) partes.push(cliente.razao_social)
  if (cliente.cnpj)         partes.push(`CNPJ: ${formatarCNPJ(cliente.cnpj)}`)
  if (cliente.regime)       partes.push(formatarRegime(cliente.regime))
  return partes.join(' | ')
}

/**
 * Metadados deste utilitário.
 */
export const META_FORMATADORES = {
  versaoBase:   VERSAO_ATUAL.codigo,
  atualizadaEm: '2026-07-08',
  locale:       'pt-BR',
  observacao:   'Formatadores compartilhados por todos os motores e módulos do FiscalTrib.',
}