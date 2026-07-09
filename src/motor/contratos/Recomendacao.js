/**
 * Recomendacao.js — FiscalTrib
 * Contrato para representação de recomendações no Motor de Inteligência Tributária.
 *
 * Toda análise concluída deve gerar ao menos uma recomendação.
 * As recomendações orientam o consultor e o cliente sobre as
 * próximas ações a tomar com base no resultado do motor.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

// ─────────────────────────────────────────────────────────────
// ENUMERAÇÕES
// ─────────────────────────────────────────────────────────────

export const TIPO_RECOMENDACAO = {
  RECUPERAR_CREDITO:       'RECUPERAR_CREDITO',        // iniciar processo de recuperação
  SOLICITAR_DOCUMENTOS:    'SOLICITAR_DOCUMENTOS',     // pedir documentos ao cliente
  REVISAR_NCM:             'REVISAR_NCM',              // revisar classificação fiscal
  REVISAR_CST:             'REVISAR_CST',              // revisar CST/CSOSN aplicado
  ANALISE_MANUAL:          'ANALISE_MANUAL',           // encaminhar para análise manual
  ADERIR_TRANSACAO:        'ADERIR_TRANSACAO',         // aderir à transação tributária PGFN
  MEDIDA_JUDICIAL:         'MEDIDA_JUDICIAL',          // ingressar com ação judicial
  COMPENSACAO_PERDCOMP:    'COMPENSACAO_PERDCOMP',     // transmitir PER/DCOMP
  RETIFICACAO:             'RETIFICACAO',              // retificar obrigação acessória
  PLANEJAMENTO_TRIBUTARIO: 'PLANEJAMENTO_TRIBUTARIO',  // oportunidade de planejamento
  MONITORAR:               'MONITORAR',                // acompanhar evolução do tema
  NENHUMA_ACAO:            'NENHUMA_ACAO',             // situação regular, sem ação necessária
}

export const PRIORIDADE = {
  URGENTE: 'URGENTE',   // prazo prescricional próximo ou risco alto
  ALTA:    'ALTA',      // oportunidade clara e segura
  MEDIA:   'MEDIA',     // oportunidade presente mas com ressalvas
  BAIXA:   'BAIXA',     // monitorar, sem urgência
}

export const RESPONSAVEL = {
  CONSULTOR:    'CONSULTOR',    // ação do consultor tributário
  CLIENTE:      'CLIENTE',      // ação do cliente/empresa
  AMBOS:        'AMBOS',        // ação conjunta
  AUTOMATICO:   'AUTOMATICO',   // o próprio sistema pode executar
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Cria uma Recomendacao vazia.
 * Todo motor deve usar esta função ao gerar recomendações.
 *
 * @param {string} tipo - Um dos valores de TIPO_RECOMENDACAO
 * @returns {object}
 */
export function criarRecomendacao(tipo) {
  return {

    // ─── Identificação ───────────────────────────────────────
    id:          gerarIdRecomendacao(),
    tipo,                        // TIPO_RECOMENDACAO
    prioridade:  PRIORIDADE.MEDIA,

    // ─── Conteúdo ────────────────────────────────────────────
    titulo:      '',             // título curto da recomendação
    descricao:   '',             // explicação completa em linguagem natural
    justificativa: '',           // por que esta recomendação foi gerada

    // ─── Execução ────────────────────────────────────────────
    responsavel:    RESPONSAVEL.CONSULTOR,
    prazoSugerido:  '',          // ex: '30 dias', 'Antes de AAAA-MM-DD'
    prazoLimite:    '',          // 'AAAA-MM-DD' — prazo prescricional ou legal

    // ─── Passos do plano de ação ─────────────────────────────
    passos: [
      // {
      //   ordem:      number,
      //   descricao:  string,
      //   responsavel: RESPONSAVEL,
      //   prazo:      string,
      //   observacao: string,
      // }
    ],

    // ─── Documentos necessários ──────────────────────────────
    documentosNecessarios: [],   // [string] — lista de documentos a coletar

    // ─── Impacto esperado ────────────────────────────────────
    impacto: {
      valorEstimado:    0,       // valor financeiro esperado da ação
      prazoRetorno:     '',      // ex: '60 a 90 dias'
      descricaoImpacto: '',      // impacto qualitativo da ação
    },

    // ─── Riscos da não execução ──────────────────────────────
    riscosNaoExecucao: '',       // o que acontece se não agir

    // ─── Observações ─────────────────────────────────────────
    observacoes: '',
  }
}

// ─────────────────────────────────────────────────────────────
// RECOMENDAÇÕES PRÉ-DEFINIDAS
// Prontas para uso pelos motores.
// ─────────────────────────────────────────────────────────────

/**
 * Recomendação padrão para recuperação de créditos monofásicos.
 */
export function recomendacaoMonofasicos(valorEstimado, competencias) {
  const r = criarRecomendacao(TIPO_RECOMENDACAO.RECUPERAR_CREDITO)
  r.prioridade    = PRIORIDADE.ALTA
  r.titulo        = 'Recuperar créditos de PIS/COFINS — Produtos Monofásicos'
  r.descricao     = 'Foram identificados produtos sujeitos ao regime monofásico ' +
                    'com PIS/COFINS recolhidos indevidamente. Recomenda-se iniciar ' +
                    'o processo de recuperação via PER/DCOMP junto à Receita Federal.'
  r.justificativa = 'Produtos com NCM monofásico têm alíquota zero de PIS/COFINS ' +
                    'na revenda. O recolhimento dentro do DAS ou com alíquota cheia ' +
                    'configura pagamento indevido recuperável nos últimos 5 anos.'
  r.responsavel   = RESPONSAVEL.CONSULTOR
  r.prazoSugerido = '30 dias'
  r.passos = [
    { ordem: 1, descricao: 'Levantar todos os XMLs de NF-e de saída do período', responsavel: RESPONSAVEL.CLIENTE, prazo: '10 dias' },
    { ordem: 2, descricao: 'Identificar e listar todos os produtos monofásicos com NCM e valores de PIS/COFINS', responsavel: RESPONSAVEL.CONSULTOR, prazo: '15 dias' },
    { ordem: 3, descricao: 'Calcular o crédito recuperável por competência', responsavel: RESPONSAVEL.CONSULTOR, prazo: '20 dias' },
    { ordem: 4, descricao: 'Elaborar e transmitir PER/DCOMP à Receita Federal', responsavel: RESPONSAVEL.CONSULTOR, prazo: '30 dias' },
    { ordem: 5, descricao: 'Acompanhar o processamento e responder eventuais intimações', responsavel: RESPONSAVEL.AMBOS, prazo: '90 dias' },
  ]
  r.documentosNecessarios = [
    'XMLs de NF-e de saída de todo o período analisado',
    'DAS pagos no período',
    'PGDAS-D de todo o período',
    'Contrato social atualizado',
    'Procuração para transmissão do PER/DCOMP',
  ]
  r.impacto = {
    valorEstimado,
    prazoRetorno:     '60 a 180 dias após transmissão do PER/DCOMP',
    descricaoImpacto: `Recuperação de créditos tributários de PIS/COFINS referentes a ${competencias} competências analisadas.`,
  }
  r.riscosNaoExecucao = 'Prescrição quinquenal: créditos mais antigos que 5 anos serão perdidos definitivamente.'
  return r
}

/**
 * Recomendação para solicitar documentos adicionais.
 */
export function recomendacaoSolicitarDocumentos(documentos, motivo) {
  const r = criarRecomendacao(TIPO_RECOMENDACAO.SOLICITAR_DOCUMENTOS)
  r.prioridade    = PRIORIDADE.ALTA
  r.titulo        = 'Solicitar documentação complementar'
  r.descricao     = `Para completar a análise, é necessário obter os seguintes documentos: ${documentos.join(', ')}.`
  r.justificativa = motivo
  r.responsavel   = RESPONSAVEL.CONSULTOR
  r.prazoSugerido = '15 dias'
  r.documentosNecessarios = documentos
  r.passos = [
    { ordem: 1, descricao: 'Contatar o cliente e solicitar os documentos listados', responsavel: RESPONSAVEL.CONSULTOR, prazo: '5 dias' },
    { ordem: 2, descricao: 'Receber e validar os documentos recebidos', responsavel: RESPONSAVEL.CONSULTOR, prazo: '15 dias' },
    { ordem: 3, descricao: 'Reprocessar a análise com os documentos completos', responsavel: RESPONSAVEL.AUTOMATICO, prazo: '15 dias' },
  ]
  r.riscosNaoExecucao = 'Análise incompleta pode subestimar o potencial de recuperação.'
  return r
}

/**
 * Recomendação quando nenhuma ação é necessária.
 */
export function recomendacaoNenhumaAcao(motivo) {
  const r = criarRecomendacao(TIPO_RECOMENDACAO.NENHUMA_ACAO)
  r.prioridade    = PRIORIDADE.BAIXA
  r.titulo        = 'Nenhuma ação necessária no momento'
  r.descricao     = 'A análise não identificou oportunidades de recuperação ou irregularidades relevantes.'
  r.justificativa = motivo
  r.responsavel   = RESPONSAVEL.CONSULTOR
  r.impacto = { valorEstimado: 0, prazoRetorno: '', descricaoImpacto: 'Situação tributária regular no escopo analisado.' }
  return r
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Gera um ID único para a recomendação.
 */
function gerarIdRecomendacao() {
  return `REC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

/**
 * Ordena recomendações por prioridade.
 * Útil para o motor organizar a lista antes de retornar.
 */
export function ordenarRecomendacoes(recomendacoes) {
  const ordem = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
  return [...recomendacoes].sort((a, b) => (ordem[a.prioridade] || 99) - (ordem[b.prioridade] || 99))
}