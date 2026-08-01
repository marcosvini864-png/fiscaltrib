/**
 * MotorInteligenciaTributaria.js — e-FiscalTribe
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
 * Versão: 2.0
 * Data: 2026-07-30
 */

import { BaseTributaria }                         from './base/index.js'
import { criarResultado, resultadoErro,
         finalizarResultado, STATUS_ANALISE }      from './contratos/ResultadoPadrao.js'
import { gerarAssinaturaAnalise }                  from './base/versionamento/versoes.js'

// ── Módulos implementados ────────────────────────────────────
import { analisarMonofasicos }   from './modulos/monofasicos.js'
import { analisarExclusaoICMS }  from './modulos/exclusao_icms.js'
import { analisarICMSST }        from './modulos/icms_st.js'
import { analisarFatorR }        from './modulos/fator_r.js'
import { analisarINSS }          from './modulos/inss.js'
import { analisarIRPJCSLL }      from './modulos/irpj_csll.js'
import { analisarPrescricao }    from './modulos/prescricao.js'
import { analisarDecadencia }    from './modulos/decadencia.js'
import { analisarCAPAG }         from './modulos/capag.js'
import { analisarTransacao }     from './modulos/transacao.js'

// ── Módulo Dívida Ativa (orquestra CAPAG + PRESCRICAO + DECADENCIA + TRANSACAO)
import { analisarDividaAtiva }   from './modulos/divida_ativa.js'

// ─────────────────────────────────────────────────────────────
// REGISTRO DE MÓDULOS
// ─────────────────────────────────────────────────────────────

const MODULOS = {

  MONOFASICOS: {
    id:         'MONOFASICOS',
    nome:       'Motor de Monofásicos',
    versao:     '1.0',
    fn:         analisarMonofasicos,
    disponivel: true,
    descricao:  'Recuperação de PIS/COFINS — Regime Monofásico',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'CREDITO',
  },

  EXCLUSAO_ICMS: {
    id:         'EXCLUSAO_ICMS',
    nome:       'Motor de Exclusão ICMS/PIS-COFINS',
    versao:     '1.0',
    fn:         analisarExclusaoICMS,
    disponivel: true,
    descricao:  'Exclusão do ICMS da Base de PIS/COFINS — Tema 69 STF',
    regimes:    ['Lucro Presumido', 'Lucro Real'],
    categoria:  'CREDITO',
  },

  ICMS_ST: {
    id:         'ICMS_ST',
    nome:       'Motor de ICMS-ST',
    versao:     '1.0',
    fn:         analisarICMSST,
    disponivel: true,
    descricao:  'Exclusão do ICMS-ST da Base do PIS/COFINS e do Simples Nacional',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'CREDITO',
  },

  FATOR_R: {
    id:         'FATOR_R',
    nome:       'Motor do Fator R',
    versao:     '1.0',
    fn:         analisarFatorR,
    disponivel: true,
    descricao:  'Migração do Anexo V para o Anexo III do Simples Nacional',
    regimes:    ['Simples Nacional'],
    categoria:  'PLANEJAMENTO',
  },

  INSS: {
    id:         'INSS',
    nome:       'Motor de INSS',
    versao:     '1.0',
    fn:         analisarINSS,
    disponivel: true,
    descricao:  'Recuperação de INSS sobre Verbas Indenizatórias',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'CREDITO',
  },

  IRPJ_CSLL: {
    id:         'IRPJ_CSLL',
    nome:       'Motor de IRPJ/CSLL',
    versao:     '1.0',
    fn:         analisarIRPJCSLL,
    disponivel: true,
    descricao:  'JCP, Prejuízo Fiscal e SELIC na Repetição do Indébito',
    regimes:    ['Lucro Presumido', 'Lucro Real'],
    categoria:  'CREDITO',
  },

  PRESCRICAO: {
    id:         'PRESCRICAO',
    nome:       'Motor de Prescrição',
    versao:     '1.0',
    fn:         analisarPrescricao,
    disponivel: true,
    descricao:  'Prescrição Ordinária, Intercorrente e Redirecionamento',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'DIVIDA_ATIVA',
  },

  DECADENCIA: {
    id:         'DECADENCIA',
    nome:       'Motor de Decadência',
    versao:     '1.0',
    fn:         analisarDecadencia,
    disponivel: true,
    descricao:  'Decadência de Lançamentos e Autos de Infração',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'DIVIDA_ATIVA',
  },

  CAPAG: {
    id:         'CAPAG',
    nome:       'Motor de CAPAG',
    versao:     '1.0',
    fn:         analisarCAPAG,
    disponivel: true,
    descricao:  'Capacidade de Pagamento e Simulação de Transação',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'DIVIDA_ATIVA',
  },

  TRANSACAO: {
    id:         'TRANSACAO',
    nome:       'Motor de Transação Tributária',
    versao:     '1.0',
    fn:         analisarTransacao,
    disponivel: true,
    descricao:  'Simulação de Transação com a PGFN — Lei 13.988/2020',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'DIVIDA_ATIVA',
  },

  DIVIDA_ATIVA: {
    id:         'DIVIDA_ATIVA',
    nome:       'Motor de Dívida Ativa',
    versao:     '1.0',
    fn:         analisarDividaAtiva,
    disponivel: true,
    descricao:  'Análise completa de CDAs — Prescrição, Decadência, CAPAG e Transação',
    regimes:    ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
    categoria:  'DIVIDA_ATIVA',
  },
}

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DE MÓDULOS
// ─────────────────────────────────────────────────────────────

export const CATEGORIAS = {
  CREDITO:       { id: 'CREDITO',       nome: 'Recuperação de Créditos',   cor: '#00c896' },
  PLANEJAMENTO:  { id: 'PLANEJAMENTO',  nome: 'Planejamento Tributário',   cor: '#1a9fff' },
  DIVIDA_ATIVA:  { id: 'DIVIDA_ATIVA',  nome: 'Gestão de Dívida Ativa',   cor: '#a855f7' },
}

// ─────────────────────────────────────────────────────────────
// MOTOR DE INTELIGÊNCIA TRIBUTÁRIA
// ─────────────────────────────────────────────────────────────

export const MotorInteligenciaTributaria = {

  versao:    '2.0',
  nome:      'Motor de Inteligência Tributária — e-FiscalTribe',
  descricao: 'Orquestrador central dos motores tributários especializados.',

  // ─── Consulta de módulos ─────────────────────────────────────

  listarModulos() {
    return Object.values(MODULOS).map(m => ({
      id:         m.id,
      nome:       m.nome,
      versao:     m.versao,
      disponivel: m.disponivel,
      descricao:  m.descricao,
      regimes:    m.regimes,
      categoria:  m.categoria,
    }))
  },

  listarModulosDisponiveis() {
    return this.listarModulos().filter(m => m.disponivel)
  },

  listarPorCategoria(categoria) {
    return this.listarModulosDisponiveis().filter(m => m.categoria === categoria)
  },

  moduloDisponivel(id) {
    return MODULOS[id]?.disponivel === true
  },

  modulosParaRegime(regime) {
    return Object.values(MODULOS)
      .filter(m => m.disponivel && m.regimes.includes(regime))
      .map(m => ({ id: m.id, nome: m.nome, descricao: m.descricao, categoria: m.categoria }))
  },

  // ─── Análise por módulo específico ───────────────────────────

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
      const inicio    = Date.now()
      const resultado = await modulo.fn(nfes, cliente, opcoes, BaseTributaria)
      resultado.meta.assinatura = gerarAssinaturaAnalise(modulo.nome, modulo.versao)
      return finalizarResultado(resultado, inicio, {
        totalNFes:   nfes?.length  || 0,
        regime:      cliente?.regime || '',
        clienteCNPJ: cliente?.cnpj   || '',
      })
    } catch (erro) {
      return resultadoErro(idModulo, `Erro no módulo "${modulo.nome}": ${erro.message}`)
    }
  },

  // ─── Análise completa ────────────────────────────────────────

  async analisar(nfes, cliente, opcoes = {}) {
    const inicio = Date.now()

    // Determina quais módulos executar
    const modulosAlvo = opcoes.modulos
      ? opcoes.modulos.filter(id => MODULOS[id]?.disponivel)
      : Object.values(MODULOS)
          .filter(m => m.disponivel && m.regimes.includes(cliente?.regime || ''))
          .map(m => m.id)

    if (modulosAlvo.length === 0) {
      return {
        status:             'SEM_MODULOS',
        regime:             cliente?.regime,
        modulosExecutados:  [],
        resultados:         [],
        consolidado:        null,
        obs:                `Nenhum módulo disponível para o regime ${cliente?.regime || 'não informado'}.`,
      }
    }

    // Executa cada módulo
    const resultados = []
    for (const id of modulosAlvo) {
      const resultado = await this.analisarModulo(id, nfes, cliente, opcoes[id] || {})
      resultados.push(resultado)
    }

    const consolidado = this._consolidar(resultados, cliente)

    return {
      status:             'CONCLUIDO',
      duracaoMs:          Date.now() - inicio,
      cliente:            { nome: cliente?.razao_social, cnpj: cliente?.cnpj, regime: cliente?.regime },
      totalNFes:          nfes?.length || 0,
      modulosExecutados:  modulosAlvo,
      resultados,
      consolidado,
      assinatura:         gerarAssinaturaAnalise('Motor de Inteligência Tributária', '2.0'),
    }
  },

  // ─── Análise por categoria ───────────────────────────────────

  async analisarCategoria(categoria, nfes, cliente, opcoes = {}) {
    const modulosDaCategoria = Object.values(MODULOS)
      .filter(m => m.disponivel && m.categoria === categoria && m.regimes.includes(cliente?.regime || ''))
      .map(m => m.id)

    return this.analisar(nfes, cliente, { ...opcoes, modulos: modulosDaCategoria })
  },

  // ─── Consolidação ────────────────────────────────────────────

  _consolidar(resultados, cliente) {
    const concluidos = resultados.filter(r => r.status === STATUS_ANALISE.CONCLUIDA)
    const comErro    = resultados.filter(r => r.status === STATUS_ANALISE.ERRO)
    const semDados   = resultados.filter(r => r.status === STATUS_ANALISE.SEM_DADOS)

    const creditoTotal       = concluidos.reduce((s, r) => s + (r.calculos?.creditoEstimado || 0), 0)
    const todasOportunidades = concluidos.flatMap(r => r.oportunidades || [])

    const scores      = concluidos.map(r => r.score?.valor || 0).filter(s => s > 0)
    const scoreGlobal = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0

    const todasRecomendacoes = concluidos
      .flatMap(r => r.todasRecomendacoes || [])
      .sort((a, b) => {
        const ordem = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
        return (ordem[a.prioridade] || 99) - (ordem[b.prioridade] || 99)
      })

    const graus      = concluidos.map(r => r.grauConfianca).filter(Boolean)
    const grauGlobal = graus.every(g => g === 'ALTO')  ? 'ALTO'  :
                       graus.some(g => g === 'ALTO')   ? 'MEDIO' : 'BAIXO'

    // Agrupa oportunidades por categoria
    const porCategoria = {}
    concluidos.forEach(r => {
      const modulo  = MODULOS[r.modulo]
      const cat     = modulo?.categoria || 'OUTROS'
      if (!porCategoria[cat]) porCategoria[cat] = { credito: 0, oportunidades: [] }
      porCategoria[cat].credito       += r.calculos?.creditoEstimado || 0
      porCategoria[cat].oportunidades.push(...(r.oportunidades || []))
    })

    return {
      // Financeiro
      creditoTotal,
      creditoPor12Meses: concluidos.reduce((s, r) => s + (r.calculos?.creditoPor12Meses || 0), 0),
      creditoPor60Meses: concluidos.reduce((s, r) => s + (r.calculos?.creditoPor60Meses || 0), 0),

      // Oportunidades
      totalOportunidades:  todasOportunidades.length,
      oportunidades:       todasOportunidades,
      porCategoria,

      // Score e confiança
      scoreGlobal,
      grauConfiancaGlobal: grauGlobal,

      // Recomendações
      recomendacoes: todasRecomendacoes,

      // Status
      totalModulos:       resultados.length,
      modulosConcluidos:  concluidos.length,
      modulosComErro:     comErro.length,
      modulosSemDados:    semDados.length,

      // Resumo
      resumoExecutivo: creditoTotal > 0
        ? `Foram identificadas ${todasOportunidades.length} oportunidade(s) tributária(s) para ` +
          `${cliente?.razao_social || 'o cliente'} com potencial total de ` +
          `R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ` +
          `(score global: ${scoreGlobal}/100).`
        : `Nenhuma oportunidade tributária identificada para ` +
          `${cliente?.razao_social || 'o cliente'} com base nos documentos analisados.`,
    }
  },

  // ─── Base de Conhecimento ─────────────────────────────────────
  base: BaseTributaria,
}

export default MotorInteligenciaTributaria