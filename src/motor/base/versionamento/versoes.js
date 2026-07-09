/**
 * versoes.js — FiscalTrib
 * Registro oficial de versões da Base de Conhecimento Tributária.
 *
 * REGRA: Todo arquivo da base deve referenciar VERSAO_ATUAL.
 * Toda análise gerada pelo Motor deve registrar as versões abaixo.
 * Atualizações legislativas, de NCM ou de jurisprudência devem
 * gerar uma nova versão antes de serem incorporadas.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

// ─────────────────────────────────────────────────────────────
// VERSÃO ATUAL — referência principal do sistema
// ─────────────────────────────────────────────────────────────

export const VERSAO_ATUAL = {
  // Identificação
  codigo:              '2026.1',
  label:               'Base Tributária FiscalTrib 2026.1',
  descricao:           'Versão inicial da Base de Conhecimento Tributária. ' +
                       'Inclui NCMs monofásicos, legislação de PIS/COFINS, ' +
                       'jurisprudência do STF (Tema 69) e STJ, e regras do ' +
                       'Motor de Monofásicos.',

  // Datas
  lancadaEm:           '2026-07-08',
  legislacaoAte:       '2026-07-08',   // data da legislação mais recente considerada
  proximaRevisao:      '2026-12-31',   // data prevista para próxima atualização

  // Versões dos componentes nesta release
  componentes: {
    fiscaltrib:        '1.0.0',
    motorMonofasicos:  '1.0',
    motorICMSST:       null,   // ainda não implementado
    motorExclusaoICMS: null,
    motorFatorR:       null,
    motorINSS:         null,
    motorIRPJCSLL:     null,
    motorDividaAtiva:  null,
    motorPrescricao:   null,
    motorDecadencia:   null,
    motorCAPAG:        null,
    motorTransacao:    null,
  },

  // Cobertura da base nesta release
  cobertura: {
    ncmMonofasicos:    true,
    ncmICMSST:         false,
    ncmIPI:            false,
    ncmCEST:           false,
    legislacaoPIS:     true,
    legislacaoCOFINS:  true,
    legislacaoICMS:    false,
    legislacaoINSS:    false,
    legislacaoIRPJ:    false,
    jurisprudenciaSTF: true,
    jurisprudenciaSTJ: true,
    jurisprudenciaCARF: false,
    regrasMono:        true,
    regrasICMSST:      false,
    regrasFatorR:      false,
  },

  // Alterações nesta versão
  changelog: [
    {
      data:      '2026-07-08',
      tipo:      'CRIACAO',
      descricao: 'Criação da Base de Conhecimento Tributária. ' +
                 'Estrutura inicial com contratos, NCMs monofásicos, ' +
                 'legislação de PIS/COFINS e Motor de Monofásicos.',
    },
  ],
}

// ─────────────────────────────────────────────────────────────
// HISTÓRICO DE VERSÕES
// Registrar aqui toda versão já lançada, em ordem decrescente.
// ─────────────────────────────────────────────────────────────

export const HISTORICO_VERSOES = [
  VERSAO_ATUAL,
  // versões futuras serão adicionadas aqui acima de VERSAO_ATUAL
]

// ─────────────────────────────────────────────────────────────
// ASSINATURA DE ANÁLISE
// Gerada automaticamente em toda análise executada pelo Motor.
// Registrada no campo meta.assinatura do ResultadoPadrao.
// ─────────────────────────────────────────────────────────────

/**
 * Gera a assinatura de versão de uma análise.
 * Deve ser chamada no início de cada execução do Motor.
 *
 * @param {string} nomeMotor  - ex: 'Motor de Monofásicos'
 * @param {string} versaoMotor - ex: '1.0'
 * @returns {object}
 */
export function gerarAssinaturaAnalise(nomeMotor, versaoMotor) {
  return {
    // Identificação da análise
    realizadaEm:         new Date().toISOString(),
    realizadaEmFormatado: new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),

    // Versões utilizadas
    fiscaltrib:          VERSAO_ATUAL.componentes.fiscaltrib,
    baseTributaria:      VERSAO_ATUAL.codigo,
    motor:               nomeMotor,
    versaoMotor,
    legislacaoAte:       VERSAO_ATUAL.legislacaoAte,

    // Texto para exibição no relatório
    textoRelatorio:
      `Análise realizada em: ${new Date().toLocaleDateString('pt-BR')}\n` +
      `FiscalTrib: ${VERSAO_ATUAL.componentes.fiscaltrib}\n` +
      `Base Tributária: ${VERSAO_ATUAL.codigo}\n` +
      `${nomeMotor}: ${versaoMotor}\n` +
      `Legislação considerada até: ${VERSAO_ATUAL.legislacaoAte}`,
  }
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Retorna a versão atual da base.
 */
export function getVersaoAtual() {
  return VERSAO_ATUAL
}

/**
 * Verifica se um componente está disponível na versão atual.
 * @param {string} componente - chave de VERSAO_ATUAL.cobertura
 * @returns {boolean}
 */
export function componenteDisponivel(componente) {
  return VERSAO_ATUAL.cobertura[componente] === true
}

/**
 * Registra uma nova entrada no changelog da versão atual.
 * Usar durante desenvolvimento para documentar mudanças.
 *
 * @param {string} tipo - 'CRIACAO' | 'ATUALIZACAO' | 'CORRECAO' | 'DEPRECACAO'
 * @param {string} descricao
 */
export function registrarAlteracao(tipo, descricao) {
  VERSAO_ATUAL.changelog.push({
    data: new Date().toISOString().slice(0, 10),
    tipo,
    descricao,
  })
}