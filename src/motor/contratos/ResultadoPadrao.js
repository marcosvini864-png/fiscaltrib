/**
 * ResultadoPadrao.js — FiscalTrib
 * Contrato principal do Motor de Inteligência Tributária.
 *
 * REGRA: Todo motor deve retornar exatamente este objeto.
 * Nenhum motor pode adicionar campos fora deste contrato.
 * Evoluções devem ser versionadas aqui antes de implementadas.
 *
 * Versão: 1.1
 * Data: 2026-07-08
 */

// ─────────────────────────────────────────────────────────────
// ENUMERAÇÕES — valores permitidos para campos controlados
// ─────────────────────────────────────────────────────────────

export const STATUS_ANALISE = {
  CONCLUIDA:         'CONCLUIDA',
  CONCLUIDA_PARCIAL: 'CONCLUIDA_PARCIAL',
  SEM_DADOS:         'SEM_DADOS',
  ERRO:              'ERRO',
}

export const GRAU_CONFIANCA = {
  ALTO:  'ALTO',   // 🟢 dados completos, regra clara, evidência direta
  MEDIO: 'MEDIO',  // 🟡 dados parciais ou regra com exceções
  BAIXO: 'BAIXO',  // 🔴 estimativa, dados incompletos ou regra contestável
}

export const CLASSIFICACAO_SCORE = {
  EXCELENTE: 'Excelente',  // 90–100
  BOM:       'Bom',        // 70–89
  REGULAR:   'Regular',    // 50–69
  CRITICO:   'Crítico',    // 0–49
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL — criar resultado vazio
// ─────────────────────────────────────────────────────────────

/**
 * Cria um ResultadoPadrao vazio.
 * Todo motor deve partir deste objeto e preenchê-lo.
 * Nunca retornar um objeto criado manualmente fora desta função.
 *
 * @param {string} modulo - Identificador do motor (ex: 'MONOFASICOS')
 * @returns {object}
 */
export function criarResultado(modulo) {
  return {

    // ─── Identificação ─────────────────────────────────────────
    versao:          '1.1',
    modulo,                      // ex: 'MONOFASICOS', 'ICMS_ST', 'FATOR_R'
    descricaoModulo: '',         // ex: 'Recuperação de Monofásicos'

    // ─── Status ────────────────────────────────────────────────
    status: STATUS_ANALISE.SEM_DADOS,
    erro:   null,

    // ─── Diagnóstico ───────────────────────────────────────────
    diagnostico: {
      totalDocumentosAnalisados: 0,
      totalItensAnalisados:      0,
      competenciasAnalisadas:    [],   // ['2024-01', '2024-02', ...]
      periodoInicio:             '',   // 'AAAA-MM'
      periodoFim:                '',   // 'AAAA-MM'
      situacoesEncontradas:      [],   // descrições do que foi encontrado
      observacoes:               '',
    },

    // ─── Oportunidades ─────────────────────────────────────────
    // Cada item representa uma tese específica encontrada.
    oportunidades: [
      // {
      //   id:             string,
      //   tese:           string,
      //   descricao:      string,
      //   score:          { valor, classificacao, componentes },
      //   grauConfianca:  GRAU_CONFIANCA,
      //   evidencias:     [],        // ver Evidencia.js
      //   fundamentacao:  {},        // ver Fundamentacao.js
      //   calculos:       {},        // ver estrutura de calculos abaixo
      //   recomendacao:   {},        // ver Recomendacao.js
      // }
    ],

    // ─── Riscos ────────────────────────────────────────────────
    riscos: [
      // {
      //   descricao:  string,
      //   nivel:      'ALTO' | 'MEDIO' | 'BAIXO',
      //   mitigacao:  string,
      // }
    ],

    // ─── Cálculos consolidados ─────────────────────────────────
    calculos: {
      // Valores gerais
      valorAnalisado:        0,   // total analisado pelo motor
      baseCalculo:           0,   // base que originou o crédito/economia
      creditoEstimado:       0,   // crédito total estimado
      economiaEstimada:      0,   // economia futura estimada
      moeda:                 'BRL',

      // Projeções temporais
      creditoPor12Meses:     0,
      creditoPor24Meses:     0,
      creditoPor36Meses:     0,
      creditoPor60Meses:     0,
      creditoMensalMedio:    0,

      // Percentuais utilizados
      percentuaisAplicados:  [],  // [{ descricao, valor }]

      // Detalhamento por competência
      porCompetencia:        {},  // { 'AAAA-MM': { receita, baseCalculo, credito } }

      // Memória de cálculo
      memoriaCalculo:        [],  // passos do cálculo em linguagem natural

      // Totais
      totalDocumentos:       0,
      totalItens:            0,
      totalCompetencias:     0,

      // Observações
      observacoesTecnicas:   '',
    },

    // ─── Score por oportunidade ────────────────────────────────
    // Cada oportunidade terá seu próprio score (ver campo oportunidades acima).

    // ─── Score consolidado do motor ────────────────────────────
    score: {
      valor:         0,      // 0 a 100
      classificacao: '',     // CLASSIFICACAO_SCORE
      componentes:   [],     // [{ fator, peso, valor, observacao }]
      justificativa: '',     // explicação do score em linguagem natural
    },

    // ─── Grau de confiança consolidado ─────────────────────────
    grauConfianca:          GRAU_CONFIANCA.BAIXO,
    justificativaConfianca: '',

    // ─── Recomendações ─────────────────────────────────────────
    recomendacaoPrincipal: null,   // ver Recomendacao.js
    todasRecomendacoes:    [],

    // ─── Relatório Executivo ───────────────────────────────────
    relatorio: {
      resumoExecutivo:      '',   // parágrafo curto para o cliente
      objetivoAnalise:      '',   // o que o motor se propôs a analisar
      escopoAnalise:        '',   // período, documentos, regime analisados
      diagnosticoTecnico:   '',   // diagnóstico em linguagem natural
      oportunidadesTexto:   '',   // oportunidades encontradas explicadas
      riscosTexto:          '',   // riscos identificados explicados
      calculosTexto:        '',   // cálculos explicados em linguagem natural
      fundamentacaoTexto:   '',   // base legal resumida
      evidenciasTexto:      '',   // principais evidências em linguagem natural
      scoreTexto:           '',   // score e grau de confiança explicados
      recomendacoesTexto:   '',   // recomendações em linguagem natural
      planoAcao:            [],   // [{ ordem, acao, responsavel, prazo }]
      conclusaoExecutiva:   '',   // fechamento com posicionamento final
    },

    // ─── Trilha de Auditoria ───────────────────────────────────
    auditTrail: {
      motoresExecutados:    [],   // ['MONOFASICOS', 'ICMS_ST', ...]
      regrasAplicadas:      [],   // [{ id, descricao, resultado }]
      documentosUtilizados: [],   // [{ tipo, identificador, competencia }]
      legislacaoVersao:     '',   // versão da base legal utilizada
      execucoes:            [],   // [{ motor, inicioMs, fimMs, status }]
    },

    // ─── Metadados ─────────────────────────────────────────────
    meta: {
      executadoEm:          null,   // new Date().toISOString()
      duracaoMs:            0,
      versaoMotor:          '1.1',
      versaoContrato:       '1.1',
      parametrosEntrada:    {},     // resumo dos dados recebidos
      documentosAnalisados: 0,
      ambiente:             'producao',  // 'producao' | 'homologacao' | 'desenvolvimento'
    },
  }
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Finaliza um resultado preenchendo metadados de execução.
 * Deve ser chamado ao final de todo motor, antes de retornar.
 */
export function finalizarResultado(resultado, inicioMs, parametros = {}) {
  resultado.meta.executadoEm       = new Date().toISOString()
  resultado.meta.duracaoMs         = Date.now() - inicioMs
  resultado.meta.parametrosEntrada = parametros
  resultado.auditTrail.execucoes.push({
    motor:   resultado.modulo,
    inicioMs,
    fimMs:   Date.now(),
    status:  resultado.status,
  })
  return resultado
}

/**
 * Classifica um score numérico (0–100) em texto.
 */
export function classificarScore(valor) {
  if (valor >= 90) return CLASSIFICACAO_SCORE.EXCELENTE
  if (valor >= 70) return CLASSIFICACAO_SCORE.BOM
  if (valor >= 50) return CLASSIFICACAO_SCORE.REGULAR
  return CLASSIFICACAO_SCORE.CRITICO
}

/**
 * Marca um resultado como erro.
 */
export function resultadoErro(modulo, mensagem) {
  const r = criarResultado(modulo)
  r.status           = STATUS_ANALISE.ERRO
  r.erro             = mensagem
  r.meta.executadoEm = new Date().toISOString()
  return r
}