/**
 * MotorInteligenciaTributaria.js — FiscalTrib
 * Orquestrador central do Motor de Inteligência Tributária.
 *
 * ARQUITETURA:
 * Parser (dados) → BaseTributaria (conhecimento) → Motor (análise) → Resultado Padronizado
 *
 * REGRAS:
 * — O Motor nunca importa de CentralImportacoes ou qualquer componente React
 * — O Motor nunca conhece a interface do usuário
 * — O Motor recebe dados e devolve ResultadoPadrao
 * — Cada módulo especializado segue o mesmo contrato
 *
 * USO:
 *   import { analisarExclusaoICMS }  from './modulos/exclusao_icms.js'
 *   const resultado = await MotorInteligenciaTributaria.analisar(nfes, cliente)
 *   const mono      = await MotorInteligenciaTributaria.analisarModulo('MONOFASICOS', nfes, cliente)
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { BaseTributaria }                              from './base/index.js'
import { criarResultado, resultadoErro,
         finalizarResultado, STATUS_ANALISE }           from './contratos/ResultadoPadrao.js'
import { gerarAssinaturaAnalise }                       from './base/versionamento/versoes.js'

// Módulos especializados
import { analisarMonofasicos }   from './modulos/monofasicos.js'

// Módulos futuros — descomentar conforme implementados
// import { analisarICMSST }        from './modulos/icms_st.js'
// import { analisarExclusaoICMS }  from './modulos/exclusao_icms.js'
// import { analisarFatorR }        from './modulos/fator_r.js'
// import { analisarINSS }          from './modulos/inss.js'
// import { analisarIRPJCSLL }      from './modulos/irpj_csll.js'
// import { analisarDividaAtiva }   from './modulos/divida_ativa.js'
// import { analisarPrescricao }    from './modulos/prescricao.js'
// import { analisarDecadencia }    from './modulos/decadencia.js'
// import { analisarCAP }           from './modulos/capag.js'
// import { analisarTransacao }     from './modulos/transacao.js'

// ─────────────────────────────────────────────────────────────
// REGISTRO DE MÓDULOS DISPONÍVEIS
// ─────────────────────────────────────────────────────────────

/**
 * Mapa de módulos disponíveis no Motor.
 * Cada entrada: { id, nome, fn, disponivel }
 */
const MODULOS = {
  MONOFASICOS: {
    id:          'MONOFASICOS',
    nome:        'Motor de Monofásicos',
    versao:      '1.0',
    fn:          analisarMonofasicos,
    disponivel:  true,
    descricao:   'Recuperação de PIS/COFINS — Regime Monofásico',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
  ICMS_ST: {
    id:          'ICMS_ST',
    nome:        'Motor de ICMS-ST',
    versao:      '1.0',
    fn:          null,   // implementar em modulos/icms_st.js
    disponivel:  false,
    descricao:   'Exclusão do ICMS-ST da Base do Simples Nacional ou PIS/COFINS',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
  EXCLUSAO_ICMS: {
     id:          'EXCLUSAO_ICMS',
     nome:        'Motor de Exclusão ICMS/PIS-COFINS',
     versao:      '1.0',
     fn:          null,
     disponivel:  false,
     descricao:   'Exclusão do ICMS da Base de PIS/COFINS — Tema 69 STF',
     regimes:     ['Lucro Presumido', 'Lucro Real'],
},
  FATOR_R: {
    id:          'FATOR_R',
    nome:        'Motor do Fator R',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'Migração do Anexo V para o Anexo III do Simples Nacional',
    regimes:     ['Simples Nacional'],
  },
  INSS: {
    id:          'INSS',
    nome:        'Motor de INSS',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'Recuperação de INSS sobre Verbas Indenizatórias',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
  IRPJ_CSLL: {
    id:          'IRPJ_CSLL',
    nome:        'Motor de IRPJ/CSLL',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'JCP, Prejuízo Fiscal e SELIC na Repetição do Indébito',
    regimes:     ['Lucro Presumido', 'Lucro Real'],
  },
  DIVIDA_ATIVA: {
    id:          'DIVIDA_ATIVA',
    nome:        'Motor de Dívida Ativa',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'Análise de CDAs, Transação Tributária e CAPAG',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
  PRESCRICAO: {
    id:          'PRESCRICAO',
    nome:        'Motor de Prescrição',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'Prescrição e Prescrição Intercorrente em Execuções Fiscais',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
  DECADENCIA: {
    id:          'DECADENCIA',
    nome:        'Motor de Decadência',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'Decadência de Lançamentos Tributários',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
  CAPAG: {
    id:          'CAPAG',
    nome:        'Motor de CAPAG',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'Cálculo da Capacidade de Pagamento do Contribuinte',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
  TRANSACAO: {
    id:          'TRANSACAO',
    nome:        'Motor de Transação Tributária',
    versao:      '1.0',
    fn:          null,
    disponivel:  false,
    descricao:   'Simulação de Transação com a PGFN',
    regimes:     ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
  },
}

// ─────────────────────────────────────────────────────────────
// MOTOR DE INTELIGÊNCIA TRIBUTÁRIA
// ─────────────────────────────────────────────────────────────

export const MotorInteligenciaTributaria = {

  // ─── Versão e metadados ──────────────────────────────────────
  versao:    '1.0',
  nome:      'Motor de Inteligência Tributária FiscalTrib',
  descricao: 'Orquestrador central dos motores tributários especializados.',

  // ─── Consulta de módulos ─────────────────────────────────────

  /**
   * Lista todos os módulos registrados.
   * @returns {Array}
   */
  listarModulos() {
    return Object.values(MODULOS).map(m => ({
      id:         m.id,
      nome:       m.nome,
      versao:     m.versao,
      disponivel: m.disponivel,
      descricao:  m.descricao,
      regimes:    m.regimes,
    }))
  },

  /**
   * Lista apenas os módulos disponíveis.
   * @returns {Array}
   */
  listarModulosDisponiveis() {
    return this.listarModulos().filter(m => m.disponivel)
  },

  /**
   * Verifica se um módulo está disponível.
   * @param {string} id
   * @returns {boolean}
   */
  moduloDisponivel(id) {
    return MODULOS[id]?.disponivel === true
  },

  /**
   * Retorna os módulos elegíveis para um regime tributário.
   * @param {string} regime
   * @returns {Array}
   */
  modulosParaRegime(regime) {
    return Object.values(MODULOS)
      .filter(m => m.disponivel && m.regimes.includes(regime))
      .map(m => ({ id: m.id, nome: m.nome, descricao: m.descricao }))
  },

  // ─── Análise por módulo específico ───────────────────────────

  /**
   * Executa um módulo específico do Motor.
   *
   * @param {string} idModulo - ex: 'MONOFASICOS'
   * @param {Array}  nfes     - NF-es parseadas pelo parseXMLNFe
   * @param {object} cliente  - { razao_social, cnpj, regime }
   * @param {object} opcoes   - Opções específicas do módulo
   * @returns {object} ResultadoPadrao
   */
  async analisarModulo(idModulo, nfes, cliente, opcoes = {}) {
    const modulo = MODULOS[idModulo]

    if (!modulo) {
      return resultadoErro(idModulo, `Módulo "${idModulo}" não encontrado no Motor.`)
    }

    if (!modulo.disponivel) {
      return resultadoErro(idModulo, `Módulo "${modulo.nome}" ainda não implementado.`)
    }

    if (!modulo.fn) {
      return resultadoErro(idModulo, `Função do módulo "${modulo.nome}" não registrada.`)
    }

    try {
      const inicio = Date.now()
      const resultado = await modulo.fn(nfes, cliente, opcoes, BaseTributaria)
      resultado.meta.assinatura = gerarAssinaturaAnalise(modulo.nome, modulo.versao)
      return finalizarResultado(resultado, inicio, {
        totalNFes:  nfes?.length || 0,
        regime:     cliente?.regime || '',
        clienteCNPJ: cliente?.cnpj || '',
      })
    } catch (erro) {
      return resultadoErro(idModulo, `Erro no módulo "${modulo.nome}": ${erro.message}`)
    }
  },

  // ─── Análise completa (todos os módulos disponíveis) ─────────

  /**
   * Executa todos os módulos disponíveis para um cliente.
   * Retorna um array de ResultadoPadrao, um por módulo.
   *
   * @param {Array}  nfes    - NF-es parseadas
   * @param {object} cliente - { razao_social, cnpj, regime }
   * @param {object} opcoes  - { modulos: ['MONOFASICOS', ...] } para limitar módulos
   * @returns {object} Resultado consolidado
   */
  async analisar(nfes, cliente, opcoes = {}) {
    const inicio = Date.now()

    // Determina quais módulos executar
    const modulosAlvo = opcoes.modulos
      ? opcoes.modulos.filter(id => MODULOS[id]?.disponivel)
      : Object.values(MODULOS).filter(m => m.disponivel && m.regimes.includes(cliente?.regime || '')).map(m => m.id)

    if (modulosAlvo.length === 0) {
      return {
        status:          'SEM_MODULOS',
        regime:          cliente?.regime,
        modulosExecutados: [],
        resultados:      [],
        consolidado:     null,
        obs:             `Nenhum módulo disponível para o regime ${cliente?.regime || 'não informado'}.`,
      }
    }

    // Executa cada módulo
    const resultados = []
    for (const id of modulosAlvo) {
      const resultado = await this.analisarModulo(id, nfes, cliente, opcoes[id] || {})
      resultados.push(resultado)
    }

    // Consolida os resultados
    const consolidado = this._consolidar(resultados, cliente)

    return {
      status:            'CONCLUIDO',
      duracaoMs:         Date.now() - inicio,
      cliente:           { nome: cliente?.razao_social, cnpj: cliente?.cnpj, regime: cliente?.regime },
      totalNFes:         nfes?.length || 0,
      modulosExecutados: modulosAlvo,
      resultados,
      consolidado,
      assinatura:        gerarAssinaturaAnalise('Motor de Inteligência Tributária', '1.0'),
    }
  },

  // ─── Consolidação dos resultados ─────────────────────────────

  /**
   * Consolida os resultados de múltiplos módulos em um resumo unificado.
   * Usado internamente pelo método analisar().
   *
   * @param {Array}  resultados - Array de ResultadoPadrao
   * @param {object} cliente
   * @returns {object}
   */
  _consolidar(resultados, cliente) {
    const concluidos   = resultados.filter(r => r.status === STATUS_ANALISE.CONCLUIDA)
    const comErro      = resultados.filter(r => r.status === STATUS_ANALISE.ERRO)
    const semDados     = resultados.filter(r => r.status === STATUS_ANALISE.SEM_DADOS)

    // Soma todos os créditos
    const creditoTotal = concluidos.reduce((s, r) =>
      s + (r.calculos?.creditoEstimado || 0), 0
    )

    // Coleta todas as oportunidades
    const todasOportunidades = concluidos.flatMap(r => r.oportunidades || [])

    // Score global — média dos scores dos módulos concluídos
    const scores     = concluidos.map(r => r.score?.valor || 0).filter(s => s > 0)
    const scoreGlobal = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0

    // Recomendações consolidadas — ordena por prioridade
    const todasRecomendacoes = concluidos
      .flatMap(r => r.todasRecomendacoes || [])
      .sort((a, b) => {
        const ordem = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
        return (ordem[a.prioridade] || 99) - (ordem[b.prioridade] || 99)
      })

    // Grau de confiança global
    const graus      = concluidos.map(r => r.grauConfianca).filter(Boolean)
    const grauGlobal = graus.every(g => g === 'ALTO')  ? 'ALTO'  :
                       graus.some(g => g === 'ALTO')   ? 'MEDIO' : 'BAIXO'

    return {
      // Resumo financeiro
      creditoTotal,
      creditoPor12Meses: concluidos.reduce((s, r) => s + (r.calculos?.creditoPor12Meses || 0), 0),
      creditoPor60Meses: concluidos.reduce((s, r) => s + (r.calculos?.creditoPor60Meses || 0), 0),

      // Oportunidades
      totalOportunidades:  todasOportunidades.length,
      oportunidades:       todasOportunidades,

      // Score e confiança
      scoreGlobal,
      grauConfiancaGlobal: grauGlobal,

      // Recomendações
      recomendacoes:       todasRecomendacoes,

      // Status dos módulos
      totalModulos:        resultados.length,
      modulosConcluidos:   concluidos.length,
      modulosComErro:      comErro.length,
      modulosSemDados:     semDados.length,

      // Texto executivo consolidado
      resumoExecutivo: creditoTotal > 0
        ? `Foram identificadas ${todasOportunidades.length} oportunidade(s) de recuperação ` +
          `tributária para ${cliente?.razao_social || 'o cliente'} com potencial total estimado ` +
          `de R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ` +
          `em 60 meses (score global: ${scoreGlobal}/100).`
        : `Nenhuma oportunidade de recuperação tributária identificada para ` +
          `${cliente?.razao_social || 'o cliente'} com base nos documentos analisados.`,
    }
  },

  // ─── Acesso à Base de Conhecimento ───────────────────────────

  /**
   * Expõe a Base de Conhecimento para consultas externas.
   * Módulos do FiscalTrib podem consultar a base via Motor.
   */
  base: BaseTributaria,
}

export default MotorInteligenciaTributaria