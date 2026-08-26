/**
 * ApuracaoSimples.jsx - e-FiscalTribe®
 * Apuracao do Simples Nacional - multi-empresa
 * Versao 1.1 - 13/08/2026
 * + Skeleton, ghost rows, seletor por pagina, lixeira por linha, excluir todos
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  calcularAliquotaEfetiva,
  ANEXO_I_2018_2026,
  identificarFaixaAnexoI,
  calcularParametrosAnexoI,
  calcularDasTeoricoBase,
  calcularApuracaoBaseAnexoI,
  REPARTICAO_ANEXO_I,
  calcularAliquotasEfetivasPorTributo,
  calcularValoresTributosTeoricosBase,
} from '../fiscal/simples/anexoI'
import {
  normalizarParcelaReceitaQualificada,
  consolidarParcelasReceitaQualificada,
  organizarDetalhamentoApuracao,
  resumirReceitasPorDimensaoTributaria,
  prepararMovimentacaoApuracao,
} from '../fiscal/simples/movimentacao'
import {
  conciliarReceitaApuradaComPgdas,
  resolverDivergenciaReceita,
} from '../fiscal/simples/conciliacaoPgdas'
import {
  planejarAjusteConservadorReceita,
  aplicarAjusteConservadorPositivo,
  prepararAjusteConservadorNegativo,
} from '../fiscal/simples/ajusteConservador'
import {
  definirPoliticaRecuperacaoPisCofins,
  CLASSIFICACOES_PIS_COFINS_TRATAMENTO_ESPECIFICO,
  apurarReceitaPisCofinsTratamentoEspecifico,
} from '../fiscal/simples/pisCofins'
import {
  prepararReducaoConservadoraPisCofins,
  prepararCandidatasReducaoPisCofins,
  validarDistribuicaoReducaoPisCofins,
  aplicarDistribuicaoReducaoPisCofins,
} from '../fiscal/simples/reducaoPisCofins'
import {
  executarApuracaoSimples,
} from '../fiscal/simples/orquestrador'
import {
  prepararBasePisCofinsConferida,
  calcularPisCofinsConferidosAnexoI,
} from '../fiscal/simples/apuracaoPisCofins'
import {
  calcularTributosFederaisConferidosAnexoI,
  prepararIcmsPreservadoPgdas,
  calcularDasConferidoAnexoI,
} from '../fiscal/simples/apuracaoDas'
import {
  compararPgdasOriginalComDasConferido,
  identificarCreditoMonofasicoPisCofins,
} from '../fiscal/simples/creditoPisCofins'
import {
  gerarResultadoRecuperacaoPisCofins,
} from '../fiscal/simples/resultadoRecuperacao'


import {
  prepararBaseApuracaoSimples,
} from '../fiscal/simples/baseApuracao'
import {
  criarChaveItemDocumental,
} from '../fiscal/simples/receitaDocumental'

import {
  agruparItensReceitaPorCfop,
  montarDecisoesReceitaPorParametros,
} from '../fiscal/simples/parametrosReceita'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
  ghost: '#F8FAFC', ghostText: '#94A3B8',
}

const fmtR   = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtPct = v => parseFloat(v || 0).toFixed(2).replace('.', ',') + '%'

// ============================================================
// MOTOR DO SIMPLES NACIONAL
// Fórmula oficial da alíquota efetiva — LC 123/2006, art. 18
// ============================================================


// ============================================================
// PARCELA DE RECEITA QUALIFICADA
// Estrutura-base conforme o fluxo do Motor do Simples:
// estabelecimento → mercado → atividade → qualificações tributárias.
// PIS/COFINS e ICMS permanecem dimensões independentes.
// Ainda não realiza cálculo tributário.
// ============================================================











function numeroCompetenciaMotor(valor) {
  const s = String(valor || '').trim()

  let m = s.match(/^(\d{1,2})\/(\d{4})$/)

  if (m) {
    const mes = Number(m[1])
    const ano = Number(m[2])
    if (mes >= 1 && mes <= 12) return ano * 100 + mes
  }

  m = s.match(/^(\d{4})-(\d{1,2})$/)

  if (m) {
    const ano = Number(m[1])
    const mes = Number(m[2])
    if (mes >= 1 && mes <= 12) return ano * 100 + mes
  }

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)

  if (m) {
    const mes = Number(m[2])
    const ano = Number(m[3])
    if (mes >= 1 && mes <= 12) return ano * 100 + mes
  }

  return null
}
function competenciaDentroPeriodoMotor(competencia, inicio, fim) {
  const c = numeroCompetenciaMotor(competencia)
  const i = numeroCompetenciaMotor(inicio)
  const f = numeroCompetenciaMotor(fim)

  if (!c || !i || !f) return false

  return c >= i && c <= f
}

function competenciaParaInputMes(valor) {
  const m = String(valor || '').trim().match(/^(\d{1,2})\/(\d{4})$/)
  if (!m) return ''

  return m[2] + '-' + String(m[1]).padStart(2, '0')
}

function inputMesParaCompetencia(valor) {
  const m = String(valor || '').trim().match(/^(\d{4})-(\d{2})$/)
  if (!m) return ''

  return m[2] + '/' + m[1]
}

function rotuloStatusMotor(status) {
  const s = String(status || '').trim()

  const mapa = {
    base_pronta: 'Base pronta para conferência',
    base_pendente: 'Base aguardando conferência',

    conferencia_concluida: 'Conferência concluída',

    base_pis_cofins_conferida:
      'Base PIS/COFINS conferida',

    pis_cofins_conferidos:
      'PIS e COFINS recalculados',

    tributos_federais_conferidos:
      'Tributos federais consolidados',

    icms_original_preservado:
      'ICMS original preservado',

    das_conferido:
      'DAS conferido',

    comparacao_concluida:
      'Comparação com o PGDAS concluída',

    pgdas_original_inconsistente:
      'PGDAS-D original inconsistente',

    das_conferido_inconsistente:
      'DAS conferido inconsistente',

    comparacao_incompleta:
      'Comparação incompleta',

    credito_monofasico_pis_cofins_identificado:
      'Crédito monofásico identificado',

    sem_credito_monofasico_pis_cofins:
      'Nenhum crédito monofásico identificado',

    resultado_recuperacao_pis_cofins_gerado:
      'Resultado da recuperação gerado',

    resultado_inconsistente_credito:
      'Resultado inconsistente',

    resultado_inconsistente_segregacao_receitas:
      'Segregação de receitas inconsistente',
  }

  if (mapa[s]) return mapa[s]

  if (!s) return 'Aguardando processamento'

  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letra => letra.toUpperCase())
}

function estiloStatusMotor(status) {
  const s = String(status || '').toLowerCase()

  if (
    s.includes('inconsistente') ||
    s.includes('erro') ||
    s.includes('bloqueado')
  ) {
    return {
      fundo: '#FEF2F2',
      texto: '#B91C1C',
      borda: '#FECACA',
    }
  }

  if (
    s.includes('aguard') ||
    s.includes('pendente') ||
    s.includes('diverg') ||
    s.includes('incompleta')
  ) {
    return {
      fundo: '#FFF7ED',
      texto: '#C2410C',
      borda: '#FED7AA',
    }
  }

  if (
    s.includes('conclu') ||
    s.includes('conferid') ||
    s.includes('gerado') ||
    s.includes('identificado') ||
    s.includes('preservado')
  ) {
    return {
      fundo: '#F0FDF4',
      texto: '#15803D',
      borda: '#BBF7D0',
    }
  }

  return {
    fundo: '#F8FAFC',
    texto: '#475569',
    borda: '#E2E8F0',
  }
}

function StatusMotor({ status }) {
  const visual = estiloStatusMotor(status)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 28,
        padding: '4px 10px',
        borderRadius: 999,
        background: visual.fundo,
        color: visual.texto,
        border: '1px solid ' + visual.borda,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.25,
      }}
    >
      {rotuloStatusMotor(status)}
    </span>
  )
}

function Badge({ label, tipo }) {
  const map = {
    aguardando:   { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    transmitida:  { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    em_atraso:    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    original:     { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    retificadora: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  }
  const b = map[tipo] || map['aguardando']
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array(cols).fill(null).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <div style={{ height: 13, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

const GHOST_ROWS = Array(5).fill(null).map((_, i) => ({
  ghost: true,
  id: `ghost-${i}`,
  competencia: 'MM/AAAA',
  receita_apurada: 0,
  imposto_apurado: 0,
  aliquota_efetiva: 0,
  tipo_declaracao: 'Original',
  status_apuracao: 'Aguardando',
  status_declaracao: 'Aguardando',
  data_transmissao: '',
  cliente_id: null,
}))

const VAZIO = {
  competencia: '', receita_apurada: '', imposto_apurado: '',
  aliquota_efetiva: '', tipo_declaracao: 'Original',
  status_apuracao: 'Aguardando', status_declaracao: 'Aguardando',
  data_transmissao: '', transmitido_por: ''
}

export default function ApuracaoSimples({
  onGerarEspelho,
}) {
  const [apuracoes, setApuracoes]     = useState([])
  const [clientes, setClientes]       = useState({})
  const [loading, setLoading]         = useState(false)
  const [busca, setBusca]             = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [pagina, setPagina]           = useState(1)
  const [porPagina, setPorPagina]     = useState(10)
  const [detalhe, setDetalhe]         = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalNova, setModalNova]     = useState(false)
  const [form, setForm]               = useState(VAZIO)
  const [salvando, setSalvando]       = useState(false)
  const [excluindo, setExcluindo]     = useState(false)
  const [modalMotor, setModalMotor] = useState(false)
  const [motorClienteId, setMotorClienteId] = useState('')
  const [motorCompetencia, setMotorCompetencia] = useState('')
  const [motorCarregando, setMotorCarregando] = useState(false)
  const [motorAnalise, setMotorAnalise] = useState(null)
  const [motorErro, setMotorErro] = useState('')
  const [modalParametrosReceita, setModalParametrosReceita] = useState(false)
  const [gruposCfopReceita, setGruposCfopReceita] = useState([])
  const [parametrosCfopReceita, setParametrosCfopReceita] = useState({})
  const [contextoMotorPendente, setContextoMotorPendente] = useState(null)
  const [parametrosReceitaErro, setParametrosReceitaErro] = useState('')

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => { carregar() }, [])

  function calcularResultadoTributarioMotor({
    conferencia,
    pgdas,
    competencia,
  } = {}) {
    if (
      !conferencia ||
      conferencia.prontoParaCalculo !== true ||
      !pgdas
    ) {
      return null
    }

    const basePisCofins =
      prepararBasePisCofinsConferida(
        conferencia
      )

    const rbt12 =
      Number(pgdas.rbt12)

    const pisCofins =
      basePisCofins
        ? calcularPisCofinsConferidosAnexoI({
            rbt12,
            basePisCofins,
          })
        : null

    const tributosFederais =
      basePisCofins
        ? calcularTributosFederaisConferidosAnexoI({
            rbt12,
            basePisCofins,
          })
        : null

    const politica =
      definirPoliticaRecuperacaoPisCofins({
        alterarIcms: false,
      })

    const icmsPreservado =
      prepararIcmsPreservadoPgdas({
        valorIcmsOriginalPgdas:
          pgdas.icms,
        politica,
      })

    const dasConferido =
      tributosFederais &&
      icmsPreservado?.podeComporDasConferido === true
        ? calcularDasConferidoAnexoI({
            tributosFederais,
            icmsPreservado,
          })
        : null

    const pgdasOriginal = {
      irpj: pgdas.irpj,
      csll: pgdas.csll,
      pis: pgdas.pis,
      cofins: pgdas.cofins,
      cpp: pgdas.inss_cpp,
      icms: pgdas.icms,
      das: pgdas.das_recolhido,
    }

    const comparacao =
      dasConferido
        ? compararPgdasOriginalComDasConferido({
            pgdasOriginal,
            dasConferido,
          })
        : null

    const creditoMonofasico =
      comparacao?.status === 'comparacao_concluida'
        ? identificarCreditoMonofasicoPisCofins({
            comparacao,
          })
        : null

    const resultado =
      creditoMonofasico
        ? gerarResultadoRecuperacaoPisCofins({
            competencia,
            receitaDeclaradaPgdas:
              Number(
                pgdas.receita_bruta_total || 0
              ),
            basePisCofins,
            dasConferido,
            comparacao,
            creditoMonofasico,
          })
        : null

    return {
      basePisCofins,
      pisCofins,
      tributosFederais,
      politica,
      icmsPreservado,
      dasConferido,
      comparacao,
      creditoMonofasico,
      resultado,
    }
  }

  function aplicarDecisaoDivergenciaMotor(decisao) {
    if (
      !motorAnalise ||
      !motorAnalise.base ||
      !Array.isArray(motorAnalise.base.parcelas) ||
      !motorAnalise.pgdas
    ) {
      return
    }

    const conferencia = executarApuracaoSimples({
      parcelas: motorAnalise.base.parcelas,

      receitaDeclaradaPgdas: Number(
        motorAnalise.pgdas?.receita_bruta_total || 0
      ),

      decisaoDivergencia: decisao,

      alterarIcms: false,
    })

    const calculoTributario =
      conferencia?.prontoParaCalculo === true
        ? calcularResultadoTributarioMotor({
            conferencia,
            pgdas: motorAnalise.pgdas,
            competencia: motorAnalise.competencia,
          })
        : null

    setMotorAnalise(atual =>
      atual
        ? {
            ...atual,
            conferencia,
            calculoTributario,
            decisaoDivergencia: decisao,
          }
        : atual
    )
  }

  async function carregar() {
    setLoading(true)
    const [{ data: aps }, { data: cls }] = await Promise.all([
      supabase.from('apuracoes_simples').select('*').order('competencia', { ascending: false }),
      supabase.from('clientes').select('id, razao_social, cnpj, regime')
    ])
    setApuracoes(aps || [])
    const mapa = {}
    ;(cls || []).forEach(c => { mapa[c.id] = c })
    setClientes(mapa)
    setLoading(false)
  }
  
  async function consultaMotorComTimeout(consulta, etapa, ms = 20000) {
  let timer

  try {
    return await Promise.race([
      consulta,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              'Tempo excedido ao ' + etapa +
              '. Verifique a conexão com o Supabase e tente novamente.'
            )
          )
        }, ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

  async function carregarClassificacoesMotor(itemIds) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) return []

    const resultado = []
    const tamanhoLote = 50

    for (let i = 0; i < itemIds.length; i += tamanhoLote) {
      const lote = itemIds.slice(i, i + tamanhoLote)

      const { data, error } = await consultaMotorComTimeout(
        supabase
          .from('itens_classificacoes')
          .select('*')
          .in('item_id', lote),
        'buscar as classificações dos itens'
      )

      if (error) throw error

      resultado.push(...(data || []))
    }

    return resultado
  }

  async function executarConferenciaMotor() {
    if (!motorClienteId) {
      return alert('Selecione a empresa.')
    }

    if (!numeroCompetenciaMotor(motorCompetencia)) {
      return alert('Informe a competencia no formato MM/AAAA.')
    }

    const cliente = clientes[motorClienteId]

    if (!cliente) {
      return alert('Empresa nao localizada.')
    }

    setMotorCarregando(true)
    setMotorErro('')
    setMotorAnalise(null)

    try {
      const { data: pgdasLista, error: erroPgdas } =
        await consultaMotorComTimeout(
          supabase
            .from('diagnosticos_pgdas')
            .select('*')
            .eq('cliente_id', motorClienteId)
            .order('created_at', { ascending: false }),
          'buscar o PGDAS-D'
        )

      if (erroPgdas) throw erroPgdas

      const competenciaMotorNumero =
        numeroCompetenciaMotor(motorCompetencia)

      const pgdasCompativeis = (pgdasLista || []).filter(diag =>
        numeroCompetenciaMotor(diag.competencia) ===
        competenciaMotorNumero
      )

      if (pgdasCompativeis.length === 0) {
        throw new Error('Nenhum PGDAS-D encontrado para esta competencia.')
      }

      if (pgdasCompativeis.length > 1) {
        throw new Error(
          'Existem ' + pgdasCompativeis.length +
          ' PGDAS-D para esta competencia. O sistema nao vai escolher um automaticamente.'
        )
      }

      const pgdas = pgdasCompativeis[0]

      const { data: atividadesPgdas, error: erroAtividades } =
        await consultaMotorComTimeout(
          supabase
            .from('diagnosticos_pgdas_atividades')
            .select('*')
            .eq('diagnostico_id', pgdas.id)
            .order('ordem_atividade', { ascending: true }),
          'buscar as atividades do PGDAS-D'
        )

      if (erroAtividades) throw erroAtividades

      const { data: itensDaCompetencia, error: erroItens } =
        await consultaMotorComTimeout(
          supabase
            .from('diagnostico_monofasico_itens')
            .select('*')
            .eq('cliente_id', motorClienteId)
            .eq('competencia', motorCompetencia)
            .order('ordem_item', { ascending: true }),
          'buscar os itens XML da competência'
        )

      if (erroItens) throw erroItens

      const itensDocumentais = itensDaCompetencia || []

      if (itensDocumentais.length === 0) {
        throw new Error(
          'Nenhum item XML salvo foi encontrado para esta empresa e competencia.'
        )
      }

      const diagnosticosIds = [
        ...new Set(
          itensDocumentais
            .map(item => item.diagnostico_id)
            .filter(Boolean)
        ),
      ]

      if (diagnosticosIds.length === 0) {
        throw new Error(
          'Os itens XML existem, mas nao possuem vinculo com um diagnostico salvo.'
        )
      }

      if (diagnosticosIds.length > 1) {
        throw new Error(
          'Existem ' + diagnosticosIds.length +
          ' diagnosticos XML com itens nesta competencia. O sistema nao vai escolher um automaticamente.'
        )
      }

      const { data: diagnosticoMono, error: erroDiagnosticoMono } =
        await consultaMotorComTimeout(
          supabase
            .from('diagnosticos_monofasicos')
            .select('*')
            .eq('id', diagnosticosIds[0])
            .single(),
          'buscar o diagnóstico monofásico'
        )

      if (erroDiagnosticoMono) throw erroDiagnosticoMono


      const itensFiscais = []
      const tamanhoLoteItensFiscais = 1000
      let inicioItensFiscais = 0

      while (true) {
        const fimItensFiscais =
          inicioItensFiscais + tamanhoLoteItensFiscais - 1

        const { data: loteItensFiscais, error: erroCadastro } =
          await consultaMotorComTimeout(
            supabase
              .from('itens_fiscais')
              .select('*')
              .eq('cliente_id', motorClienteId)
              .order('descricao', { ascending: true })
              .order('id', { ascending: true })
              .range(inicioItensFiscais, fimItensFiscais),
            'buscar o cadastro de itens fiscais'
          )

        if (erroCadastro) throw erroCadastro

        const lote = loteItensFiscais || []
        itensFiscais.push(...lote)

        if (lote.length < tamanhoLoteItensFiscais) break

        inicioItensFiscais += tamanhoLoteItensFiscais
      }

      const itemIds = (itensFiscais || [])
        .map(item => item.id)
        .filter(Boolean)

      const classificacoesHistoricas =
        await carregarClassificacoesMotor(itemIds)

      const itensParametrizaveis =
        itensDocumentais.filter(
          item => item?.considera_receita !== false
        )

      const agrupamentoReceita =
        agruparItensReceitaPorCfop(
          itensParametrizaveis
        )

      if (!agrupamentoReceita) {
        throw new Error(
          'Nao foi possivel agrupar os itens documentais por CFOP.'
        )
      }

      if (
        (agrupamentoReceita.pendencias || []).length > 0
      ) {
        const quantidade =
          agrupamentoReceita.pendencias.length

        throw new Error(
          'Existem ' +
          quantidade +
          ' item(ns) com CFOP ou valor documental invalido. ' +
          'A parametrizacao da receita foi bloqueada.'
        )
      }

      if (
        (agrupamentoReceita.grupos || []).length === 0
      ) {
        throw new Error(
          'Nao existem itens com CFOP disponiveis para parametrizacao da receita.'
        )
      }

      const parametrosIniciais = {}

      for (
        const grupo
        of agrupamentoReceita.grupos
      ) {
        parametrosIniciais[grupo.cfop] = {
          cfop: grupo.cfop,
          tratamento: '',
          tratamentoDesconto: '',
        }
      }

      setGruposCfopReceita(
        agrupamentoReceita.grupos
      )

      setParametrosCfopReceita(
        parametrosIniciais
      )

      setContextoMotorPendente({
        cliente,
        pgdas,

        atividadesPgdas:
          atividadesPgdas || [],

        diagnosticoMono,

        itensDocumentais,

        itensFiscais:
          itensFiscais || [],

        classificacoesHistoricas,
      })

      setParametrosReceitaErro('')
      setModalMotor(false)
      setModalParametrosReceita(true)
    } catch (e) {
      setMotorErro(e.message || 'Erro ao preparar a conferencia.')
    } finally {
      setMotorCarregando(false)
    }
  }

  async function continuarConferenciaComParametros() {
    const contexto =
      contextoMotorPendente

    if (!contexto) {
      setParametrosReceitaErro(
        'O contexto da conferencia nao esta mais disponivel.'
      )
      return
    }

    for (const grupo of gruposCfopReceita) {
      const parametro =
        parametrosCfopReceita[grupo.cfop]

      if (!parametro?.tratamento) {
        setParametrosReceitaErro(
          'Defina o tratamento do CFOP ' +
          grupo.cfop +
          '.'
        )
        return
      }

      if (
        parametro.tratamento === 'incluir' &&
        !parametro.tratamentoDesconto
      ) {
        setParametrosReceitaErro(
          'Defina o tratamento dos descontos do CFOP ' +
          grupo.cfop +
          '.'
        )
        return
      }
    }

    const parametros =
      gruposCfopReceita.map(
        grupo =>
          parametrosCfopReceita[
            grupo.cfop
          ]
      )

    setMotorCarregando(true)
    setParametrosReceitaErro('')

    try {
      const parametrizacao =
        montarDecisoesReceitaPorParametros({
          itens:
            contexto.itensDocumentais,

          parametros,
        })

      if (
        !parametrizacao ||
        !parametrizacao.pronto
      ) {
        const tipos =
          (
            parametrizacao?.pendencias ||
            []
          )
            .slice(0, 8)
            .map(p => p.tipo)
            .join(', ')

        throw new Error(
          'A parametrizacao documental possui pendencias' +
          (tipos ? ': ' + tipos : '.')
        )
      }

      const base =
        prepararBaseApuracaoSimples({
          competencia:
            motorCompetencia,

          pgdas:
            contexto.pgdas,

          atividadesPgdas:
            contexto.atividadesPgdas,

          itensDocumentais:
            contexto.itensDocumentais,

          itensFiscais:
            contexto.itensFiscais,

          classificacoesHistoricas:
            contexto.classificacoesHistoricas,

          clienteCnpj:
            contexto.cliente.cnpj,

          alterarIcms:
            false,

          decisoesReceitaDocumental:
            parametrizacao.decisoes,
        })

      let conferencia = null

      if (base.prontaParaConferencia) {
        conferencia =
          executarApuracaoSimples({
            parcelas:
              base.parcelas,

            receitaDeclaradaPgdas:
              Number(
                contexto.pgdas
                  .receita_bruta_total || 0
              ),

            alterarIcms:
              false,
          })
      }

      setMotorAnalise({
        cliente:
          contexto.cliente,

        competencia:
          motorCompetencia,

        pgdas:
          contexto.pgdas,

        diagnosticoMono:
          contexto.diagnosticoMono,

        itensDocumentais:
          contexto.itensDocumentais,

        base,
        conferencia,

        parametrizacaoReceita: {
          parametros,

          decisoes:
            parametrizacao.decisoes,
        },
      })

      setModalParametrosReceita(false)
      setContextoMotorPendente(null)
      setGruposCfopReceita([])
      setParametrosCfopReceita({})

    } catch (e) {
      setParametrosReceitaErro(
        e.message ||
        'Erro ao aplicar a parametrizacao da receita.'
      )
    } finally {
      setMotorCarregando(false)
    }
  }

  function numeroRelatorio(valor) {
    if (
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ''
    ) {
      return null
    }

    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : null
  }


  function escaparHtmlRelatorio(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }


  function abrirRelatorioStandalone(
    dados,
    { orientarPdf = false } = {}
  ) {
    if (!dados) {
      alert('Não há dados suficientes para gerar o relatório.')
      return
    }

    const janela = window.open(
      '',
      '_blank',
      'width=1200,height=850'
    )

    if (!janela) {
      alert(
        'O navegador bloqueou a janela do relatório. Permita pop-ups para o FiscalTribe e tente novamente.'
      )
      return
    }

    janela.opener = null

    const moeda = valor => {
      const numero = numeroRelatorio(valor)
      return numero === null ? '—' : fmtR(numero)
    }

    const percentual = valor => {
      const numero = numeroRelatorio(valor)
      if (numero === null) return '—'
      return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + '%'
    }

    const linha = (label, valor) => `
      <div class="linha">
        <span>${escaparHtmlRelatorio(label)}</span>
        <strong>${escaparHtmlRelatorio(valor)}</strong>
      </div>
    `

    const etapas = (dados.etapas || [])
      .map((etapa, i) => {
        const status = String(etapa.status || '')
        const problema = /inconsistente|erro|bloqueado/i.test(status)
        const aguardando = !status || /aguard|pendente|incompleta/i.test(status)
        const classe = problema
          ? 'etapa problema'
          : aguardando
            ? 'etapa aguardando'
            : 'etapa ok'

        return `
          <div class="${classe}">
            <div class="etapa-num">${String(i + 1).padStart(2, '0')}</div>
            <div>
              <strong>${escaparHtmlRelatorio(etapa.label)}</strong>
              <small>${escaparHtmlRelatorio(rotuloStatusMotor(status))}</small>
            </div>
          </div>
        `
      })
      .join('')

    const tributos = [
      ['IRPJ', dados.irpjConferido],
      ['CSLL', dados.csllConferido],
      ['PIS', dados.pisConferido],
      ['COFINS', dados.cofinsConferido],
      ['CPP', dados.cppConferido],
      ['ICMS', dados.icmsPreservado],
    ]
      .map(([nome, valor]) => `
        <td><span>${nome}</span><strong>${moeda(valor)}</strong></td>
      `)
      .join('')

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>FiscalTribe - Apuração ${escaparHtmlRelatorio(dados.competencia || '')}</title>
  <style>
    @page { size: A4 landscape; margin: 5mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #172033;
      font-family: Inter, Arial, sans-serif;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 10px;
    }
    .pagina { width: 100%; padding-bottom: 7mm; }
    .topo {
      background: #0B1F4D;
      color: #fff;
      padding: 11px 14px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: center;
    }
    .marca { font-size: 10px; letter-spacing: .8px; color: #93C5FD; font-weight: 800; }
    h1 { margin: 4px 0 0; font-size: 20px; }
    .empresa { margin-top: 4px; font-size:10px; color: #DBEAFE; }
    .competencia { text-align: right; }
    .competencia span { display:block; font-size:10px; text-transform: uppercase; color:#93C5FD; font-weight:700; }
    .competencia strong { display:block; margin-top:3px; font-size:18px; }
    .status { display:inline-block; margin-top:4px; padding:2px 7px; border-radius:999px; background:#DCFCE7; color:#166534; font-size:10px; font-weight:800; }
    .kpis { display:grid; grid-template-columns: repeat(6, 1fr); gap:6px; margin-top:6px; }
    .kpi { border:1px solid #DDE5EF; border-radius:7px; padding:6px 8px; min-height:48px; }
    .kpi span { display:block; color:#64748B; font-size:10px; font-weight:700; text-transform:uppercase; }
    .kpi strong { display:block; color:#0B1F4D; font-size:13px; margin-top:3px; }
    .secao { margin-top:6px; border:1px solid #DDE5EF; border-radius:8px; overflow:hidden; break-inside:avoid; page-break-inside:avoid; }
    .secao h2 { margin:0; padding:5px 8px; font-size:10px; color:#0B1F4D; border-bottom:1px solid #DDE5EF; background:#F8FAFC; }
    .etapas { display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; padding:5px; }
    .etapa { border:1px solid #DDE5EF; border-radius:6px; padding:5px; display:flex; gap:5px; align-items:flex-start; min-height:36px; }
    .etapa.ok { background:#F0FDF4; border-color:#BBF7D0; }
    .etapa.aguardando { background:#FFF7ED; border-color:#FED7AA; }
    .etapa.problema { background:#FEF2F2; border-color:#FECACA; }
    .etapa-num { width:17px; height:17px; border-radius:999px; border:1px solid #CBD5E1; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; background:#fff; flex:0 0 auto; }
    .etapa strong { display:block; font-size:10px; }
    .etapa small { display:block; margin-top:2px; font-size:10px; color:#64748B; }
    .duas { display:grid; grid-template-columns: 1fr 1fr; gap:6px; }
    .grade { display:grid; grid-template-columns: 1fr 1fr; }
    .linha { min-height:21px; display:flex; justify-content:space-between; gap:12px; align-items:center; padding:3px 7px; border-bottom:1px solid #EEF2F7; font-size:10px; }
    .linha span { color:#64748B; }
    .linha strong { color:#172033; text-align:right; }
    .tributos { width:100%; border-collapse:collapse; }
    .tributos td { width:16.66%; padding:5px; text-align:center; border-right:1px solid #E2E8F0; }
    .tributos td:last-child { border-right:none; }
    .tributos span { display:block; font-size:10px; color:#64748B; font-weight:700; }
    .tributos strong { display:block; font-size:10px; margin-top:2px; color:#0B1F4D; }
    .comparacao { width:100%; border-collapse:collapse; font-size:10px; }
    .comparacao th, .comparacao td { border-right:1px solid #E2E8F0; border-bottom:1px solid #E2E8F0; padding:4px 6px; text-align:right; }
    .comparacao th:first-child, .comparacao td:first-child { text-align:left; }
    .comparacao th { background:#F8FAFC; color:#0B1F4D; }
    .credito { color:#047857; font-weight:800; }
    .rodape { position:fixed; left:5mm; right:5mm; bottom:2mm; border-top:1px solid #E2E8F0; padding-top:3px; display:flex; justify-content:space-between; gap:10px; font-size:10px; color:#64748B; background:#fff; }
  </style>
</head>
<body>
  <div class="pagina">
    <div class="topo">
      <div>
        <div class="marca">E-FISCALTRIBE — MOTOR DO SIMPLES NACIONAL</div>
        <h1>Relatório de Apuração — ${escaparHtmlRelatorio(dados.competencia || '')}</h1>
        <div class="empresa">
          ${escaparHtmlRelatorio(dados.empresa || 'Empresa não identificada')}
          ${dados.cnpj ? ' · ' + escaparHtmlRelatorio(dados.cnpj) : ''}
          ${dados.regime ? ' · ' + escaparHtmlRelatorio(dados.regime) : ''}
        </div>
      </div>
      <div class="competencia">
        <span>Competência</span>
        <strong>${escaparHtmlRelatorio(dados.competencia || '—')}</strong>
        <div class="status">${escaparHtmlRelatorio(dados.statusApuracao || 'Concluída')}</div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><span>Receita considerada</span><strong>${moeda(dados.receitaConsiderada)}</strong></div>
      <div class="kpi"><span>DAS original</span><strong>${moeda(dados.dasOriginal)}</strong></div>
      <div class="kpi"><span>DAS conferido</span><strong>${moeda(dados.dasConferido)}</strong></div>
      <div class="kpi"><span>Crédito PIS</span><strong>${moeda(dados.creditoPis)}</strong></div>
      <div class="kpi"><span>Crédito COFINS</span><strong>${moeda(dados.creditoCofins)}</strong></div>
      <div class="kpi"><span>Crédito total</span><strong>${moeda(dados.creditoTotal)}</strong></div>
    </div>

    <div class="secao">
      <h2>Etapas da apuração</h2>
      <div class="etapas">${etapas}</div>
    </div>

    <div class="duas">
      <div class="secao">
        <h2>Receitas e parâmetros</h2>
        <div class="grade">
          <div>
            ${linha('Receita declarada PGDAS', moeda(dados.receitaDeclarada))}
            ${linha('Receita documental', moeda(dados.receitaDocumental))}
            ${linha('Tratamento específico PIS/COFINS', moeda(dados.receitaTratamento))}
            ${linha('Base tributada PIS/COFINS', moeda(dados.basePisCofins))}
            ${linha('Divergência identificada', moeda(dados.divergenciaReceita))}
          </div>
          <div>
            ${linha('RBT12', moeda(dados.rbt12))}
            ${linha('Anexo / faixa', `${dados.anexo || '—'} / ${dados.faixa || '—'}`)}
            ${linha('Alíquota nominal', percentual(dados.aliquotaNominalPercentual))}
            ${linha('Alíquota efetiva Anexo I', percentual(dados.aliquotaEfetivaPercentual))}
            ${linha('Carga efetiva do DAS', percentual(dados.cargaDasPercentual))}
          </div>
        </div>
      </div>

      <div class="secao">
        <h2>Identificação e decisão</h2>
        <div class="grade">
          <div>
            ${linha('PGDAS-D', dados.pgdasReferencia || '—')}
            ${linha('Lote XML', dados.loteXml || '—')}
            ${linha('Tipo de declaração', dados.tipoDeclaracao || 'Original')}
            ${linha('Status da declaração', dados.statusDeclaracao || 'Aguardando')}
          </div>
          <div>
            ${linha('Decisão da divergência', dados.decisaoDivergencia || '—')}
            ${linha('Situação da comparação', dados.situacaoComparacao || '—')}
            ${linha('Data de transmissão', dados.dataTransmissao || '—')}
            ${linha('Transmitido por', dados.transmitidoPor || '—')}
          </div>
        </div>
      </div>
    </div>

    <div class="secao">
      <h2>Tributos conferidos</h2>
      <table class="tributos"><tr>${tributos}</tr></table>
    </div>

    <div class="secao">
      <h2>Comparação PIS/COFINS — original × conferido</h2>
      <table class="comparacao">
        <thead>
          <tr><th>Tributo</th><th>PGDAS original</th><th>Conferido</th><th>Crédito identificado</th></tr>
        </thead>
        <tbody>
          <tr><td>PIS</td><td>${moeda(dados.pisOriginal)}</td><td>${moeda(dados.pisConferido)}</td><td class="credito">${moeda(dados.creditoPis)}</td></tr>
          <tr><td>COFINS</td><td>${moeda(dados.cofinsOriginal)}</td><td>${moeda(dados.cofinsConferido)}</td><td class="credito">${moeda(dados.creditoCofins)}</td></tr>
          <tr><td>DAS</td><td>${moeda(dados.dasOriginal)}</td><td>${moeda(dados.dasConferido)}</td><td class="credito">${moeda(dados.creditoTotal)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="rodape">
      <span>e-FiscalTribe® — Motor de Inteligência Tributária</span>
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
    </div>
  </div>
</body>
</html>`

    janela.document.open()
    janela.document.write(html)
    janela.document.close()

    setTimeout(() => {
      janela.focus()

      if (orientarPdf) {
        alert(
          'O relatório foi preparado sem menus nem elementos do sistema. Na janela de impressão, escolha “Salvar como PDF”.'
        )
      }

      janela.print()
    }, 450)
  }


  function montarDadosRelatorioMotor() {
    if (!motorAnalise) return null

    const calculo =
      motorAnalise.calculoTributario || {}
    const resultado =
      calculo.resultado || {}
    const das =
      calculo.dasConferido ||
      resultado.dasConferido ||
      {}
    const comparacao =
      calculo.comparacao ||
      resultado.comparacao ||
      {}
    const valores =
      das.valoresConferidos || {}

    const receitaDocumental =
      (motorAnalise.base?.parcelas || [])
        .reduce(
          (soma, parcela) =>
            soma + Number(parcela.valor || 0),
          0
        )

    const receitaConsiderada =
      numeroRelatorio(
        resultado.receita?.consideradaNaApuracao ??
        calculo.basePisCofins?.receitaTotalConsiderada ??
        motorAnalise.pgdas?.receita_bruta_total
      )

    const dasConferido =
      numeroRelatorio(
        resultado.valoresConferidos?.das ??
        valores.das
      )

    const aliquotaEfetiva =
      numeroRelatorio(
        das.aliquotaEfetiva ??
        calculo.pisCofins?.aliquotaEfetiva
      )

    const decisao =
      motorAnalise.decisaoDivergencia || null

    const rotuloDecisao = {
      interromper: 'Interromper apuração',
      manter_divergencia: 'Manter divergência',
      usar_receita_declarada: 'Usar receita declarada',
    }[decisao] || decisao || '—'

    return {
      empresa:
        motorAnalise.cliente?.razao_social,
      cnpj:
        motorAnalise.cliente?.cnpj,
      regime:
        motorAnalise.cliente?.regime ||
        'Simples Nacional',
      competencia:
        motorAnalise.competencia,
      statusApuracao:
        resultado.resultadoGerado
          ? 'Concluída'
          : rotuloStatusMotor(
              resultado.status ||
              comparacao.status ||
              motorAnalise.conferencia?.status
            ),
      statusDeclaracao:
        'Aguardando',
      tipoDeclaracao:
        motorAnalise.pgdas?.tipo_declaracao ||
        'Original',
      dataTransmissao: '—',
      transmitidoPor: '—',
      pgdasReferencia:
        motorAnalise.pgdas?.num_declaracao ||
        motorAnalise.pgdas?.id,
      loteXml:
        motorAnalise.diagnosticoMono?.nome_diagnostico ||
        motorAnalise.diagnosticoMono?.id,
      receitaDeclarada:
        numeroRelatorio(
          resultado.receita?.originalmenteDeclaradaPgdas ??
          motorAnalise.pgdas?.receita_bruta_total
        ),
      receitaDocumental:
        numeroRelatorio(receitaDocumental),
      receitaConsiderada,
      receitaTratamento:
        numeroRelatorio(
          resultado.receita?.tratamentoEspecificoPisCofins ??
          calculo.basePisCofins?.receitaTratamentoEspecifico
        ),
      basePisCofins:
        numeroRelatorio(
          resultado.receita?.integralmenteTributadaPisCofins ??
          calculo.basePisCofins?.receitaTributadaPisCofins
        ),
      divergenciaReceita:
        numeroRelatorio(
          Math.abs(
            Number(
              motorAnalise.conferencia?.conciliacao?.diferenca || 0
            )
          )
        ),
      rbt12:
        numeroRelatorio(
          das.rbt12 ??
          motorAnalise.pgdas?.rbt12
        ),
      anexo:
        das.anexo || 'Anexo I',
      faixa:
        das.faixa || null,
      aliquotaNominalPercentual:
        numeroRelatorio(das.aliquotaNominal) !== null
          ? Number(das.aliquotaNominal) * 100
          : null,
      aliquotaEfetivaPercentual:
        aliquotaEfetiva !== null
          ? aliquotaEfetiva * 100
          : null,
      cargaDasPercentual:
        receitaConsiderada && dasConferido !== null
          ? (dasConferido / receitaConsiderada) * 100
          : null,
      dasOriginal:
        numeroRelatorio(
          resultado.valoresOriginais?.das ??
          comparacao.dasOriginal ??
          motorAnalise.pgdas?.das_recolhido
        ),
      dasConferido,
      pisOriginal:
        numeroRelatorio(
          resultado.valoresOriginais?.pis ??
          comparacao.comparacaoTributos?.pis?.original
        ),
      pisConferido:
        numeroRelatorio(
          resultado.valoresConferidos?.pis ??
          valores.pis
        ),
      cofinsOriginal:
        numeroRelatorio(
          resultado.valoresOriginais?.cofins ??
          comparacao.comparacaoTributos?.cofins?.original
        ),
      cofinsConferido:
        numeroRelatorio(
          resultado.valoresConferidos?.cofins ??
          valores.cofins
        ),
      irpjConferido:
        numeroRelatorio(valores.irpj),
      csllConferido:
        numeroRelatorio(valores.csll),
      cppConferido:
        numeroRelatorio(valores.cpp),
      icmsPreservado:
        numeroRelatorio(valores.icms),
      creditoPis:
        numeroRelatorio(resultado.credito?.pis),
      creditoCofins:
        numeroRelatorio(resultado.credito?.cofins),
      creditoTotal:
        numeroRelatorio(resultado.credito?.total),
      decisaoDivergencia:
        rotuloDecisao,
      situacaoComparacao:
        comparacao.situacao || '—',
      etapas: [
        {
          label: 'Conferência da receita',
          status: motorAnalise.conferencia?.status,
        },
        {
          label: 'Base PIS/COFINS',
          status: calculo.basePisCofins?.status,
        },
        {
          label: 'PIS e COFINS',
          status: calculo.pisCofins?.status,
        },
        {
          label: 'Tributos federais',
          status: calculo.tributosFederais?.status,
        },
        {
          label: 'ICMS',
          status: calculo.icmsPreservado?.status,
        },
        {
          label: 'DAS conferido',
          status: calculo.dasConferido?.status,
        },
        {
          label: 'Comparação com PGDAS',
          status: calculo.comparacao?.status,
        },
        {
          label: 'Crédito monofásico',
          status: calculo.creditoMonofasico?.status,
        },
        {
          label: 'Resultado final',
          status: calculo.resultado?.status,
        },
      ],
    }
  }


  async function salvarResultadoMotor() {
    const calculo =
      motorAnalise?.calculoTributario
    const resultado =
      calculo?.resultado

    if (!resultado?.resultadoGerado) {
      alert(
        'O resultado da competência ainda não foi gerado.'
      )
      return
    }

    const clienteId =
      motorAnalise?.cliente?.id ||
      motorClienteId

    if (!clienteId) {
      alert('Empresa não identificada.')
      return
    }

    setSalvando(true)

    try {
      const base =
        calculo?.basePisCofins
      const das =
        calculo?.dasConferido

      const receitaDocumental =
        (motorAnalise.base?.parcelas || [])
          .reduce(
            (soma, parcela) =>
              soma + Number(parcela.valor || 0),
            0
          )

      const memoriaCalculo = {
        versao: 1,
        gerado_em:
          new Date().toISOString(),

        cliente: {
          id: clienteId,
          razao_social:
            motorAnalise.cliente?.razao_social || null,
          cnpj:
            motorAnalise.cliente?.cnpj || null,
          regime:
            motorAnalise.cliente?.regime ||
            'Simples Nacional',
        },

        competencia:
          motorAnalise.competencia,

        fontes: {
          pgdas: {
            id:
              motorAnalise.pgdas?.id || null,
            numero_declaracao:
              motorAnalise.pgdas?.num_declaracao || null,
            tipo_declaracao:
              motorAnalise.pgdas?.tipo_declaracao ||
              'Original',
            rbt12:
              Number(motorAnalise.pgdas?.rbt12 || 0),
            receita_bruta_total:
              Number(
                motorAnalise.pgdas?.receita_bruta_total || 0
              ),
            irpj:
              motorAnalise.pgdas?.irpj ?? null,
            csll:
              motorAnalise.pgdas?.csll ?? null,
            pis:
              motorAnalise.pgdas?.pis ?? null,
            cofins:
              motorAnalise.pgdas?.cofins ?? null,
            cpp:
              motorAnalise.pgdas?.inss_cpp ?? null,
            icms:
              motorAnalise.pgdas?.icms ?? null,
            das:
              motorAnalise.pgdas?.das_recolhido ?? null,
          },

          lote_xml: {
            id:
              motorAnalise.diagnosticoMono?.id || null,
            nome:
              motorAnalise.diagnosticoMono?.nome_diagnostico || null,
          },
        },

        conferencia: {
          status:
            motorAnalise.conferencia?.status || null,
          pronto_para_calculo:
            motorAnalise.conferencia?.prontoParaCalculo === true,
          receita_documental:
            receitaDocumental,
          receita_declarada_pgdas:
            Number(
              motorAnalise.pgdas?.receita_bruta_total || 0
            ),
          divergencia_receita:
            Math.abs(
              Number(
                motorAnalise.conferencia?.conciliacao?.diferenca || 0
              )
            ),
          conciliacao:
            motorAnalise.conferencia?.conciliacao || null,
          decisao_divergencia:
            motorAnalise.decisaoDivergencia || null,
        },

        parametrizacao_receita:
          motorAnalise.parametrizacaoReceita || null,

        calculo_tributario:
          calculo,
      }

      const existente =
        apuracoes.find(
          item =>
            String(item.cliente_id) ===
              String(clienteId) &&
            String(item.competencia) ===
              String(motorAnalise.competencia)
        )

      const payload = {
        cliente_id:
          clienteId,

        competencia:
          motorAnalise.competencia,

        receita_apurada:
          Number(
            resultado.receita?.consideradaNaApuracao ??
            base?.receitaTotalConsiderada ??
            motorAnalise.pgdas?.receita_bruta_total ??
            0
          ),

        imposto_apurado:
          Number(
            resultado.valoresConferidos?.das ??
            das?.valoresConferidos?.das ??
            0
          ),

        aliquota_efetiva:
          Number(
            das?.aliquotaEfetiva ??
            calculo?.pisCofins?.aliquotaEfetiva ??
            0
          ),

        tipo_declaracao:
          motorAnalise.pgdas?.tipo_declaracao ||
          'Original',

        status_apuracao:
          'Concluida',

        status_declaracao:
          'Aguardando',

        data_transmissao:
          '',

        transmitido_por:
          '',

        memoria_calculo:
          memoriaCalculo,
      }

      let salvo = null

      if (existente?.id) {
        const { data, error } =
          await supabase
            .from('apuracoes_simples')
            .update(payload)
            .eq('id', existente.id)
            .select('*')
            .single()

        if (error) throw error
        salvo = data
      } else {
        const { data, error } =
          await supabase
            .from('apuracoes_simples')
            .insert({
              ...payload,
              created_at:
                new Date().toISOString(),
            })
            .select('*')
            .single()

        if (error) throw error
        salvo = data
      }

      await carregar()

      if (salvo) {
        setDetalhe(salvo)
        setMotorAnalise(null)
      }

      alert(
        'Apuração e memória técnica salvas com sucesso.'
      )

    } catch (e) {
      const mensagem =
        e?.message ||
        'Erro desconhecido.'

      if (/memoria_calculo/i.test(mensagem)) {
        alert(
          'A coluna memoria_calculo ainda não existe em apuracoes_simples. Execute primeiro a migração SQL fornecida junto com este arquivo e tente novamente.'
        )
      } else {
        alert(
          'Erro ao salvar a apuração: ' +
          mensagem
        )
      }
    } finally {
      setSalvando(false)
    }
  }


  function abrirHistoricoResultadoMotor() {
    const competenciaAtual =
      motorAnalise?.competencia || ''

    setMotorAnalise(null)

    if (competenciaAtual) {
      setBusca(competenciaAtual)
      setPagina(1)
    }
  }


  function imprimirResultadoMotor() {
    const dados =
      montarDadosRelatorioMotor()

    abrirRelatorioStandalone(dados)
  }


  function exportarPdfResultadoMotor() {
    const dados =
      montarDadosRelatorioMotor()

    abrirRelatorioStandalone(
      dados,
      { orientarPdf: true }
    )
  }


  async function excluirResultadoMotor() {
    const clienteId =
      motorAnalise?.cliente?.id ||
      motorClienteId

    const existente =
      apuracoes.find(
        item =>
          String(item.cliente_id) ===
            String(clienteId) &&
          String(item.competencia) ===
            String(
              motorAnalise?.competencia
            )
      )

    if (!existente?.id) {
      alert(
        'Esta apuração ainda não foi salva no histórico.'
      )
      return
    }

    if (
      !window.confirm(
        'Excluir a apuração salva desta competência?'
      )
    ) {
      return
    }

    try {
      const { error } =
        await supabase
          .from('apuracoes_simples')
          .delete()
          .eq('id', existente.id)

      if (error) throw error

      await carregar()

      setMotorAnalise(null)

    } catch (e) {
      alert(
        'Erro ao excluir: ' +
        e.message
      )
    }
  }

  async function salvar() {
    setSalvando(true)
    try {
      const payload = {
        ...form,
        receita_apurada:  parseFloat(form.receita_apurada  || 0),
        imposto_apurado:  parseFloat(form.imposto_apurado  || 0),
        aliquota_efetiva: parseFloat(form.aliquota_efetiva || 0),
      }
      if (modalEditar) {
        const { error } = await supabase.from('apuracoes_simples').update(payload).eq('id', modalEditar.id)
        if (error) throw error
      } else {
        if (!form.cliente_id) return alert('Selecione a empresa')
        const { error } = await supabase.from('apuracoes_simples').insert({ ...payload, created_at: new Date().toISOString() })
        if (error) throw error
      }
      setModalEditar(null); setModalNova(false); setForm(VAZIO)
      await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setSalvando(false) }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta apuracao?')) return
    await supabase.from('apuracoes_simples').delete().eq('id', id)
    if (detalhe?.id === id) setDetalhe(null)
    await carregar()
  }

  async function excluirTodos() {
    if (!window.confirm(`Excluir todas as ${filtradas.length} apuracoes filtradas? Esta acao nao pode ser desfeita.`)) return
    setExcluindo(true)
    try {
      const ids = filtradas.map(a => a.id)
      await supabase.from('apuracoes_simples').delete().in('id', ids)
      await carregar()
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setExcluindo(false) }
  }

  function abrirEditar(a) {
    setForm({ ...a, receita_apurada: a.receita_apurada?.toString(), imposto_apurado: a.imposto_apurado?.toString(), aliquota_efetiva: a.aliquota_efetiva?.toString() })
    setModalEditar(a)
  }

  function statusTipo(s) {
    if (!s) return 'aguardando'
    if (s === 'Transmitida') return 'transmitida'
    if (s === 'Em atraso') return 'em_atraso'
    return 'aguardando'
  }

  const filtradas = apuracoes.filter(a => {
    if (filtroStatus !== 'todos' && a.status_apuracao?.toLowerCase().replace(' ', '_') !== filtroStatus) return false
    if (busca) {
      const b = busca.toLowerCase()
      const cl = clientes[a.cliente_id]
      return cl?.razao_social?.toLowerCase().includes(b) || a.competencia?.includes(b)
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
  const pagAtual     = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina)
  const temDados     = apuracoes.length > 0
  const linhasExibir = loading ? null : (temDados ? pagAtual : GHOST_ROWS)

  const mesesGrafico = Array.from({ length: 6 }, (_, indice) => {
    const data = new Date()
    data.setDate(1)
    data.setMonth(data.getMonth() - (5 - indice))

    const competencia =
      String(data.getMonth() + 1).padStart(2, '0') +
      '/' +
      data.getFullYear()

    const valor = apuracoes.filter(
      item => numeroCompetenciaMotor(item.competencia) === numeroCompetenciaMotor(competencia)
    ).length

    return {
      competencia,
      rotulo: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      valor,
    }
  })

  const maiorValorGrafico = Math.max(
    1,
    ...mesesGrafico.map(item => item.valor)
  )

  const statusDashboard = {
    concluidas: apuracoes.filter(a =>
      ['Concluida', 'Concluída', 'Transmitida'].includes(a.status_apuracao)
    ).length,
    aguardando: apuracoes.filter(a => a.status_apuracao === 'Aguardando').length,
    atencao: apuracoes.filter(a => a.status_apuracao === 'Em atraso').length,
  }

  const totalStatusDashboard = Math.max(
    1,
    statusDashboard.concluidas +
    statusDashboard.aguardando +
    statusDashboard.atencao
  )
  const pctConcluidas = (statusDashboard.concluidas / totalStatusDashboard) * 100
  const pctAguardando = (statusDashboard.aguardando / totalStatusDashboard) * 100

  // ── TELA DETALHE ──────────────────────────────────────────────
  if (detalhe) {
    const cl = clientes[detalhe.cliente_id]

    let memoriaDetalhe = {}

    if (
      detalhe.memoria_calculo &&
      typeof detalhe.memoria_calculo === 'object'
    ) {
      memoriaDetalhe =
        detalhe.memoria_calculo
    } else if (
      typeof detalhe.memoria_calculo === 'string'
    ) {
      try {
        memoriaDetalhe =
          JSON.parse(detalhe.memoria_calculo)
      } catch {
        memoriaDetalhe = {}
      }
    }

    const calculoDetalhe =
      memoriaDetalhe.calculo_tributario ||
      memoriaDetalhe.calculoTributario ||
      {}

    const resultadoDetalhe =
      calculoDetalhe.resultado ||
      {}

    const dasConferidoDetalhe =
      calculoDetalhe.dasConferido ||
      resultadoDetalhe.dasConferido ||
      {}

    const comparacaoDetalhe =
      calculoDetalhe.comparacao ||
      resultadoDetalhe.comparacao ||
      {}

    const valoresConferidosDetalhe =
      dasConferidoDetalhe.valoresConferidos ||
      {}

    const valorOpcionalDetalhe = (...valores) => {
      for (const valor of valores) {
        if (
          valor !== null &&
          valor !== undefined &&
          String(valor).trim() !== ''
        ) {
          const numero = Number(valor)
          if (Number.isFinite(numero)) return numero
        }
      }
      return null
    }

    const receitaDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.receita?.consideradaNaApuracao,
        detalhe.receita_apurada
      ) ?? 0

    const receitaDeclaradaDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.receita?.originalmenteDeclaradaPgdas,
        memoriaDetalhe.fontes?.pgdas?.receita_bruta_total,
        detalhe.receita_apurada
      )

    const dasDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.valoresConferidos?.das,
        valoresConferidosDetalhe.das,
        detalhe.imposto_apurado
      ) ?? 0

    const dasOriginalDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.valoresOriginais?.das,
        comparacaoDetalhe.dasOriginal,
        memoriaDetalhe.fontes?.pgdas?.das
      )

    const aliquotaRawDetalhe =
      valorOpcionalDetalhe(
        dasConferidoDetalhe.aliquotaEfetiva,
        calculoDetalhe.pisCofins?.aliquotaEfetiva,
        detalhe.aliquota_efetiva
      ) ?? 0

    const aliquotaPercentualDetalhe =
      Math.abs(aliquotaRawDetalhe) <= 1
        ? aliquotaRawDetalhe * 100
        : aliquotaRawDetalhe

    const percentualDasReceita =
      receitaDetalhe > 0
        ? (dasDetalhe / receitaDetalhe) * 100
        : 0

    const creditoPisDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.credito?.pis,
        detalhe.credito_pis,
        detalhe.creditoPis,
        detalhe.pis_credito
      )

    const creditoCofinsDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.credito?.cofins,
        detalhe.credito_cofins,
        detalhe.creditoCofins,
        detalhe.cofins_credito
      )

    const creditoTotalDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.credito?.total,
        detalhe.credito_total,
        detalhe.creditoTotal,
        detalhe.credito_recuperacao
      ) ?? (
        creditoPisDetalhe !== null ||
        creditoCofinsDetalhe !== null
          ? Number(creditoPisDetalhe || 0) +
            Number(creditoCofinsDetalhe || 0)
          : null
      )

    const receitaDocumentalDetalhe =
      valorOpcionalDetalhe(
        memoriaDetalhe.conferencia?.receita_documental,
        detalhe.receita_documental,
        detalhe.receitaDocumental
      )

    const receitaTratamentoDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.receita?.tratamentoEspecificoPisCofins,
        calculoDetalhe.basePisCofins?.receitaTratamentoEspecifico,
        detalhe.receita_tratamento_especifico,
        detalhe.receitaTratamentoEspecifico
      )

    const divergenciaDetalhe =
      valorOpcionalDetalhe(
        memoriaDetalhe.conferencia?.divergencia_receita,
        detalhe.divergencia_tratada,
        detalhe.divergencia_receita,
        detalhe.divergenciaReceita
      )

    const basePisCofinsDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.receita?.integralmenteTributadaPisCofins,
        calculoDetalhe.basePisCofins?.receitaTributadaPisCofins,
        detalhe.base_pis_cofins,
        detalhe.basePisCofins
      )

    const pisOriginalDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.valoresOriginais?.pis,
        comparacaoDetalhe.comparacaoTributos?.pis?.original
      )

    const pisRecalculadoDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.valoresConferidos?.pis,
        comparacaoDetalhe.comparacaoTributos?.pis?.conferido,
        valoresConferidosDetalhe.pis,
        detalhe.pis_recalculado,
        detalhe.pisRecalculado
      )

    const cofinsOriginalDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.valoresOriginais?.cofins,
        comparacaoDetalhe.comparacaoTributos?.cofins?.original
      )

    const cofinsRecalculadaDetalhe =
      valorOpcionalDetalhe(
        resultadoDetalhe.valoresConferidos?.cofins,
        comparacaoDetalhe.comparacaoTributos?.cofins?.conferido,
        valoresConferidosDetalhe.cofins,
        detalhe.cofins_recalculada,
        detalhe.cofinsRecalculada
      )

    const icmsPreservadoDetalhe =
      valorOpcionalDetalhe(
        valoresConferidosDetalhe.icms,
        calculoDetalhe.icmsPreservado?.valorIcms,
        detalhe.icms_preservado,
        detalhe.icmsPreservado
      )

    const irpjConferidoDetalhe =
      valorOpcionalDetalhe(
        valoresConferidosDetalhe.irpj
      )

    const csllConferidoDetalhe =
      valorOpcionalDetalhe(
        valoresConferidosDetalhe.csll
      )

    const cppConferidoDetalhe =
      valorOpcionalDetalhe(
        valoresConferidosDetalhe.cpp
      )

    const rbt12Detalhe =
      valorOpcionalDetalhe(
        dasConferidoDetalhe.rbt12,
        memoriaDetalhe.fontes?.pgdas?.rbt12
      )

    const aliquotaNominalDetalhe =
      valorOpcionalDetalhe(
        dasConferidoDetalhe.aliquotaNominal
      )

    const faixaDetalhe =
      dasConferidoDetalhe.faixa || null

    const anexoDetalhe =
      dasConferidoDetalhe.anexo ||
      (memoriaDetalhe.calculo_tributario ? 'Anexo I' : null)

    const pgdasReferenciaDetalhe =
      memoriaDetalhe.fontes?.pgdas?.numero_declaracao ||
      memoriaDetalhe.fontes?.pgdas?.id ||
      '—'

    const loteXmlDetalhe =
      memoriaDetalhe.fontes?.lote_xml?.nome ||
      memoriaDetalhe.fontes?.lote_xml?.id ||
      '—'

    const decisaoCodigoDetalhe =
      memoriaDetalhe.conferencia?.decisao_divergencia ||
      memoriaDetalhe.decisao_divergencia ||
      null

    const decisaoDetalhe = {
      interromper: 'Interromper apuração',
      manter_divergencia: 'Manter divergência',
      usar_receita_declarada: 'Usar receita declarada',
    }[decisaoCodigoDetalhe] ||
      decisaoCodigoDetalhe ||
      '—'

    const temMemoriaCompleta =
      Boolean(
        memoriaDetalhe.versao &&
        calculoDetalhe.resultado?.resultadoGerado === true
      )

    const kpisDetalhe = [
      {
        label: 'Receita apurada',
        valor: fmtR(receitaDetalhe),
        cor: '#15803D',
        fundo: '#F0FDF4',
        borda: '#BBF7D0',
        simbolo: 'R$',
      },
      {
        label: 'DAS conferido',
        valor: fmtR(dasDetalhe),
        cor: '#DC2626',
        fundo: '#FEF2F2',
        borda: '#FECACA',
        simbolo: 'DAS',
      },
      ...(creditoPisDetalhe !== null
        ? [{
            label: 'Crédito PIS',
            valor: fmtR(creditoPisDetalhe),
            cor: '#7C3AED',
            fundo: '#FAF5FF',
            borda: '#E9D5FF',
            simbolo: 'PIS',
          }]
        : []),
      ...(creditoCofinsDetalhe !== null
        ? [{
            label: 'Crédito COFINS',
            valor: fmtR(creditoCofinsDetalhe),
            cor: '#2563EB',
            fundo: '#EFF6FF',
            borda: '#BFDBFE',
            simbolo: 'COF',
          }]
        : []),
      ...(creditoTotalDetalhe !== null
        ? [{
            label: 'Crédito total',
            valor: fmtR(creditoTotalDetalhe),
            cor: '#0F766E',
            fundo: '#F0FDFA',
            borda: '#99F6E4',
            simbolo: 'Σ',
          }]
        : []),
      {
        label: 'Alíquota efetiva Anexo I',
        valor: aliquotaPercentualDetalhe.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + '%',
        cor: '#C2410C',
        fundo: '#FFF7ED',
        borda: '#FED7AA',
        simbolo: '%',
      },
    ]

    const statusApuracaoConcluida =
      ['Concluida', 'Concluída', 'Transmitida'].includes(
        detalhe.status_apuracao
      )

    const statusDeclaracaoTransmitida =
      detalhe.status_declaracao === 'Transmitida'

    const etapasDetalhe =
      temMemoriaCompleta
        ? [
            {
              numero: '01',
              label: 'Conferência da receita',
              concluida:
                Boolean(memoriaDetalhe.conferencia?.status),
            },
            {
              numero: '02',
              label: 'Base PIS/COFINS',
              concluida:
                calculoDetalhe.basePisCofins?.status ===
                'base_pis_cofins_conferida',
            },
            {
              numero: '03',
              label: 'PIS e COFINS',
              concluida:
                calculoDetalhe.pisCofins?.status ===
                'pis_cofins_conferidos',
            },
            {
              numero: '04',
              label: 'Tributos federais',
              concluida:
                calculoDetalhe.tributosFederais?.status ===
                'tributos_federais_conferidos',
            },
            {
              numero: '05',
              label: 'ICMS',
              concluida:
                calculoDetalhe.icmsPreservado?.status ===
                'icms_original_preservado',
            },
            {
              numero: '06',
              label: 'DAS conferido',
              concluida:
                calculoDetalhe.dasConferido?.status ===
                'das_conferido',
            },
            {
              numero: '07',
              label: 'Comparação com PGDAS',
              concluida:
                calculoDetalhe.comparacao?.status ===
                'comparacao_concluida',
            },
            {
              numero: '08',
              label: 'Crédito monofásico',
              concluida:
                [
                  'credito_monofasico_pis_cofins_identificado',
                  'sem_credito_monofasico_pis_cofins',
                ].includes(
                  calculoDetalhe.creditoMonofasico?.status
                ),
            },
            {
              numero: '09',
              label: 'Resultado final',
              concluida:
                calculoDetalhe.resultado?.resultadoGerado === true,
            },
          ]
        : [
            {
              numero: '01',
              label: 'Registro da competência',
              concluida: Boolean(detalhe.competencia),
            },
            {
              numero: '02',
              label: 'Receita consolidada',
              concluida: receitaDetalhe > 0,
            },
            {
              numero: '03',
              label: 'DAS apurado',
              concluida: dasDetalhe > 0,
            },
            {
              numero: '04',
              label: 'Apuração concluída',
              concluida: statusApuracaoConcluida,
            },
            {
              numero: '05',
              label: 'Declaração',
              concluida: statusDeclaracaoTransmitida,
            },
            {
              numero: '06',
              label: 'Transmissão',
              concluida: Boolean(detalhe.data_transmissao),
            },
          ]

    const dadosRelatorioDetalhe = {
      empresa:
        cl?.razao_social,
      cnpj:
        cl?.cnpj,
      regime:
        cl?.regime || 'Simples Nacional',
      competencia:
        detalhe.competencia,
      statusApuracao:
        detalhe.status_apuracao || 'Aguardando',
      statusDeclaracao:
        detalhe.status_declaracao || 'Aguardando',
      tipoDeclaracao:
        detalhe.tipo_declaracao || 'Original',
      dataTransmissao:
        detalhe.data_transmissao || '—',
      transmitidoPor:
        detalhe.transmitido_por || '—',
      pgdasReferencia:
        pgdasReferenciaDetalhe,
      loteXml:
        loteXmlDetalhe,
      receitaDeclarada:
        receitaDeclaradaDetalhe,
      receitaDocumental:
        receitaDocumentalDetalhe,
      receitaConsiderada:
        receitaDetalhe,
      receitaTratamento:
        receitaTratamentoDetalhe,
      basePisCofins:
        basePisCofinsDetalhe,
      divergenciaReceita:
        divergenciaDetalhe,
      rbt12:
        rbt12Detalhe,
      anexo:
        anexoDetalhe,
      faixa:
        faixaDetalhe,
      aliquotaNominalPercentual:
        aliquotaNominalDetalhe !== null
          ? aliquotaNominalDetalhe * 100
          : null,
      aliquotaEfetivaPercentual:
        aliquotaPercentualDetalhe,
      cargaDasPercentual:
        percentualDasReceita,
      dasOriginal:
        dasOriginalDetalhe,
      dasConferido:
        dasDetalhe,
      pisOriginal:
        pisOriginalDetalhe,
      pisConferido:
        pisRecalculadoDetalhe,
      cofinsOriginal:
        cofinsOriginalDetalhe,
      cofinsConferido:
        cofinsRecalculadaDetalhe,
      irpjConferido:
        irpjConferidoDetalhe,
      csllConferido:
        csllConferidoDetalhe,
      cppConferido:
        cppConferidoDetalhe,
      icmsPreservado:
        icmsPreservadoDetalhe,
      creditoPis:
        creditoPisDetalhe,
      creditoCofins:
        creditoCofinsDetalhe,
      creditoTotal:
        creditoTotalDetalhe,
      decisaoDivergencia:
        decisaoDetalhe,
      situacaoComparacao:
        comparacaoDetalhe.situacao || '—',
      etapas:
        temMemoriaCompleta
          ? [
              ['Conferência da receita', memoriaDetalhe.conferencia?.status],
              ['Base PIS/COFINS', calculoDetalhe.basePisCofins?.status],
              ['PIS e COFINS', calculoDetalhe.pisCofins?.status],
              ['Tributos federais', calculoDetalhe.tributosFederais?.status],
              ['ICMS', calculoDetalhe.icmsPreservado?.status],
              ['DAS conferido', calculoDetalhe.dasConferido?.status],
              ['Comparação com PGDAS', calculoDetalhe.comparacao?.status],
              ['Crédito monofásico', calculoDetalhe.creditoMonofasico?.status],
              ['Resultado final', calculoDetalhe.resultado?.status],
            ].map(([label, status]) => ({ label, status }))
          : etapasDetalhe.map(etapa => ({
              label: etapa.label,
              status: etapa.concluida ? 'concluido' : 'aguardando',
            })),
    }

    function imprimirDetalhe() {
      abrirRelatorioStandalone(
        dadosRelatorioDetalhe
      )
    }

    function exportarPdfDetalhe() {
      abrirRelatorioStandalone(
        dadosRelatorioDetalhe,
        { orientarPdf: true }
      )
    }

    return (
      <div
        style={{
          fontFamily: 'Inter, Arial, sans-serif',
          color: S.text,
          maxWidth: 1320,
          margin: '0 auto',
          paddingBottom: 18,
        }}
      >
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .detalhe-apuracao { max-width: none !important; }
            body { background: #fff !important; }
          }
        `}</style>

        <div className="no-print" style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: S.muted,
              marginBottom: 5,
            }}
          >
            Motor do Simples / Apuração /{' '}
            <strong style={{ color: S.text }}>Detalhe</strong>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 280 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: S.navy,
                  lineHeight: 1.1,
                }}
              >
                Apuração — {detalhe.competencia}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: S.muted,
                  marginTop: 5,
                }}
              >
                Consolidação do resultado da competência e situação da apuração do Simples Nacional.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 7,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => abrirEditar(detalhe)}
                style={{
                  minHeight: 34,
                  padding: '0 13px',
                  background: S.green,
                  color: S.white,
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Editar
              </button>

              <button
                onClick={() => setDetalhe(null)}
                style={{
                  minHeight: 34,
                  padding: '0 13px',
                  background: S.white,
                  color: S.text,
                  border: '1px solid ' + S.border,
                  borderRadius: 7,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Histórico
              </button>

              <button
                onClick={imprimirDetalhe}
                style={{
                  minHeight: 34,
                  padding: '0 13px',
                  background: S.white,
                  color: S.text,
                  border: '1px solid ' + S.border,
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Imprimir
              </button>

              <button
                onClick={exportarPdfDetalhe}
                style={{
                  minHeight: 34,
                  padding: '0 13px',
                  background: S.white,
                  color: S.blue,
                  border: '1px solid #BFDBFE',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Exportar PDF
              </button>
			  
			  <button
             onClick={() => {
             if (!detalhe?.memoria_calculo) {
             alert(
             'Esta apuração não possui memória técnica salva e não pode gerar o Espelho de Retificação.'
             )
             return
             }

             if (typeof onGerarEspelho === 'function') {
              onGerarEspelho(detalhe)
              }
              }}
              style={{
              minHeight: 34,
              padding: '0 13px',
              background: S.navy,
              color: S.white,
              border: 'none',
              borderRadius: 7,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              }}
              >
              Gerar Espelho de Retificação 
              </button>

              <button
                onClick={() => setDetalhe(null)}
                style={{
                  minHeight: 34,
                  padding: '0 13px',
                  background: S.white,
                  color: S.muted,
                  border: '1px solid ' + S.border,
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Voltar
              </button>
            </div>
          </div>
        </div>

        <div className="detalhe-apuracao">
          {/* IDENTIFICAÇÃO */}
          <div
            style={{
              background: S.white,
              border: '1px solid ' + S.border,
              borderRadius: 11,
              padding: '15px 17px',
              marginBottom: 11,
              boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.7fr) minmax(220px, .7fr) auto',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  background: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  color: S.blue,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 13,
                  flex: '0 0 auto',
                }}
              >
                FT
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: S.navy,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {cl?.razao_social || 'Empresa não identificada'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 7,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginTop: 5,
                    fontSize: 10,
                    color: S.muted,
                  }}
                >
                  <span>{cl?.cnpj || 'CNPJ não informado'}</span>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: '#F8FAFC',
                      border: '1px solid ' + S.border,
                      color: S.text,
                    }}
                  >
                    {cl?.regime || 'Simples Nacional'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 10,
                  color: S.muted,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: .4,
                }}
              >
                Competência
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: S.navy,
                  marginTop: 3,
                }}
              >
                {detalhe.competencia}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 6,
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <Badge
                label={detalhe.status_apuracao || 'Aguardando'}
                tipo={statusTipo(detalhe.status_apuracao)}
              />
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: S.blue,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                Registro salvo
              </span>
            </div>
          </div>

          {/* KPIS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(kpisDetalhe.length, 6)}, minmax(0, 1fr))`,
              gap: 8,
              marginBottom: 11,
            }}
          >
            {kpisDetalhe.map((kpi, i) => (
              <div
                key={i}
                style={{
                  minHeight: 72,
                  background: S.white,
                  border: '1px solid ' + S.border,
                  borderRadius: 9,
                  padding: '8px 9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                <div
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: 9,
                    flex: '0 0 31px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: kpi.fundo,
                    border: '1px solid ' + kpi.borda,
                    color: kpi.cor,
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {kpi.simbolo}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: S.muted,
                      fontWeight: 700,
                    }}
                  >
                    {kpi.label}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      color: kpi.cor,
                      fontWeight: 800,
                      marginTop: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {kpi.valor}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ETAPAS */}
          <div
            style={{
              background: S.white,
              border: '1px solid ' + S.border,
              borderRadius: 10,
              padding: '12px 14px 13px',
              marginBottom: 11,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: S.navy,
                marginBottom: 10,
              }}
            >
              Etapas do registro da apuração
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${etapasDetalhe.length}, minmax(0, 1fr))`,
                gap: 7,
              }}
            >
              {etapasDetalhe.map(etapa => (
                <div
                  key={etapa.numero}
                  style={{
                    minHeight: 58,
                    borderRadius: 8,
                    border:
                      '1px solid ' +
                      (etapa.concluida ? '#BBF7D0' : S.border),
                    background:
                      etapa.concluida ? '#F0FDF4' : '#F8FAFC',
                    padding: '8px 9px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 21,
                        height: 21,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 999,
                        border:
                          '1px solid ' +
                          (etapa.concluida ? '#86EFAC' : S.border),
                        background: S.white,
                        color: etapa.concluida ? '#15803D' : S.muted,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {etapa.numero}
                    </span>
                    <span
                      style={{
                        color: etapa.concluida ? '#16A34A' : S.ghostText,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {etapa.concluida ? '✓' : '•'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: S.navy,
                      lineHeight: 1.3,
                      marginTop: 6,
                    }}
                  >
                    {etapa.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DETALHES + MEMORIA */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, .95fr) minmax(0, 1.25fr)',
              gap: 10,
              marginBottom: 11,
            }}
          >
            <div
              style={{
                background: S.white,
                border: '1px solid ' + S.border,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid ' + S.border,
                  fontSize: 11,
                  fontWeight: 800,
                  color: S.navy,
                }}
              >
                Detalhes da apuração
              </div>

              <div style={{ padding: '3px 12px 7px' }}>
                {[
                  ['Competência', detalhe.competencia],
                  ['Tipo de declaração', detalhe.tipo_declaracao || 'Original'],
                  [
                    'Status da apuração',
                    <Badge
                      label={detalhe.status_apuracao || 'Aguardando'}
                      tipo={statusTipo(detalhe.status_apuracao)}
                    />,
                  ],
                  [
                    'Status da declaração',
                    <Badge
                      label={detalhe.status_declaracao || 'Aguardando'}
                      tipo={statusTipo(detalhe.status_declaracao)}
                    />,
                  ],
                  ['PGDAS-D', pgdasReferenciaDetalhe],
                  ['Lote XML', loteXmlDetalhe],
                  [
                    'RBT12',
                    rbt12Detalhe !== null
                      ? fmtR(rbt12Detalhe)
                      : '—',
                  ],
                  [
                    'Anexo / faixa',
                    anexoDetalhe || faixaDetalhe
                      ? `${anexoDetalhe || '—'} / ${faixaDetalhe || '—'}`
                      : '—',
                  ],
                  [
                    'Receita declarada no PGDAS',
                    receitaDeclaradaDetalhe !== null
                      ? fmtR(receitaDeclaradaDetalhe)
                      : '—',
                  ],
                  [
                    'Receita documental',
                    receitaDocumentalDetalhe !== null
                      ? fmtR(receitaDocumentalDetalhe)
                      : '—',
                  ],
                  [
                    'Tratamento específico PIS/COFINS',
                    receitaTratamentoDetalhe !== null
                      ? fmtR(receitaTratamentoDetalhe)
                      : '—',
                  ],
                  [
                    'Base tributada PIS/COFINS',
                    basePisCofinsDetalhe !== null
                      ? fmtR(basePisCofinsDetalhe)
                      : '—',
                  ],
                  [
                    'Divergência identificada',
                    divergenciaDetalhe !== null
                      ? fmtR(divergenciaDetalhe)
                      : '—',
                  ],
                  [
                    'DAS original',
                    dasOriginalDetalhe !== null
                      ? fmtR(dasOriginalDetalhe)
                      : '—',
                  ],
                  ['DAS conferido', fmtR(dasDetalhe)],
                  ['Decisão da divergência', decisaoDetalhe],
                ].map(([label, value], i) => (
                  <div
                    key={i}
                    style={{
                      minHeight: 33,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.15fr',
                      alignItems: 'center',
                      gap: 10,
                      borderBottom:
                        i < 15 ? '1px solid #EEF2F7' : 'none',
                      fontSize: 10,
                    }}
                  >
                    <div style={{ color: S.muted, fontWeight: 600 }}>
                      {label}
                    </div>
                    <div style={{ color: S.text, fontWeight: 600 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: S.white,
                border: '1px solid ' + S.border,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid ' + S.border,
                  fontSize: 11,
                  fontWeight: 800,
                  color: S.navy,
                }}
              >
                Memória de cálculo
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 7,
                  padding: 8,
                }}
              >
                {[
                  {
                    titulo: 'PIS — original × conferido',
                    cor: '#7C3AED',
                    linhas: [
                      [
                        'PGDAS original',
                        pisOriginalDetalhe !== null
                          ? fmtR(pisOriginalDetalhe)
                          : '—',
                      ],
                      [
                        'Valor conferido',
                        pisRecalculadoDetalhe !== null
                          ? fmtR(pisRecalculadoDetalhe)
                          : '—',
                      ],
                      [
                        'Crédito identificado',
                        creditoPisDetalhe !== null
                          ? fmtR(creditoPisDetalhe)
                          : '—',
                      ],
                    ],
                  },
                  {
                    titulo: 'COFINS — original × conferido',
                    cor: '#2563EB',
                    linhas: [
                      [
                        'PGDAS original',
                        cofinsOriginalDetalhe !== null
                          ? fmtR(cofinsOriginalDetalhe)
                          : '—',
                      ],
                      [
                        'Valor conferido',
                        cofinsRecalculadaDetalhe !== null
                          ? fmtR(cofinsRecalculadaDetalhe)
                          : '—',
                      ],
                      [
                        'Crédito identificado',
                        creditoCofinsDetalhe !== null
                          ? fmtR(creditoCofinsDetalhe)
                          : '—',
                      ],
                    ],
                  },
                  {
                    titulo: 'Resultado da competência',
                    cor: '#0F766E',
                    linhas: [
                      [
                        'DAS original',
                        dasOriginalDetalhe !== null
                          ? fmtR(dasOriginalDetalhe)
                          : '—',
                      ],
                      ['DAS conferido', fmtR(dasDetalhe)],
                      [
                        'Crédito PIS/COFINS',
                        creditoTotalDetalhe !== null
                          ? fmtR(creditoTotalDetalhe)
                          : '—',
                      ],
                      [
                        'Carga efetiva do DAS',
                        percentualDasReceita.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) + '%',
                      ],
                    ],
                  },
                ].map((bloco, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid ' + S.border,
                      borderRadius: 8,
                      padding: '9px 10px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: bloco.cor,
                        marginBottom: 6,
                      }}
                    >
                      {bloco.titulo}
                    </div>

                    {bloco.linhas.map(([label, value], j) => (
                      <div
                        key={j}
                        style={{
                          minHeight: 28,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          borderTop:
                            j > 0 ? '1px solid #EEF2F7' : 'none',
                          fontSize: 10,
                        }}
                      >
                        <span style={{ color: S.muted }}>{label}</span>
                        <strong
                          style={{
                            color: S.text,
                            textAlign: 'right',
                            fontWeight: 700,
                          }}
                        >
                          {value}
                        </strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div
                style={{
                  margin: '0 10px 10px',
                  padding: '9px 10px',
                  background: '#F8FAFC',
                  border: '1px solid ' + S.border,
                  borderRadius: 8,
                  fontSize: 10,
                  color: S.muted,
                  lineHeight: 1.45,
                }}
              >
                {temMemoriaCompleta
                  ? 'Memória técnica persistida com a apuração: receitas, parâmetros, comparação PGDAS × conferido, tributos e crédito identificado estão preservados neste registro.'
                  : 'Este é um registro antigo, salvo antes da memória técnica completa. Para preencher PIS/COFINS, bases e comparação sem estimativas, reabra a competência no Motor e salve novamente após aplicar a migração de memória.'}
              </div>
            </div>
          </div>

          {/* COMPOSICAO */}
          <div
            style={{
              background: S.white,
              border: '1px solid ' + S.border,
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid ' + S.border,
                fontSize: 11,
                fontWeight: 800,
                color: S.navy,
              }}
            >
              Composição do resultado
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: 1040,
                  borderCollapse: 'collapse',
                  fontSize: 10,
                }}
              >
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {[
                      'Indicador',
                      'Receita apurada',
                      'Base PIS/COFINS',
                      'PIS recalculado',
                      'COFINS recalculada',
                      'ICMS preservado',
                      'DAS original',
                      'DAS conferido',
                      'Resultado da recuperação',
                    ].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 9px',
                          textAlign: 'center',
                          color: S.navy,
                          fontWeight: 800,
                          borderRight: '1px solid ' + S.border,
                          borderBottom: '1px solid ' + S.border,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: '8px 9px',
                        fontWeight: 700,
                        color: S.text,
                        borderRight: '1px solid ' + S.border,
                        borderBottom: '1px solid ' + S.border,
                      }}
                    >
                      Valor
                    </td>

                    {[
                      fmtR(receitaDetalhe),
                      basePisCofinsDetalhe !== null
                        ? fmtR(basePisCofinsDetalhe)
                        : '—',
                      pisRecalculadoDetalhe !== null
                        ? fmtR(pisRecalculadoDetalhe)
                        : '—',
                      cofinsRecalculadaDetalhe !== null
                        ? fmtR(cofinsRecalculadaDetalhe)
                        : '—',
                      icmsPreservadoDetalhe !== null
                        ? fmtR(icmsPreservadoDetalhe)
                        : '—',
                      dasOriginalDetalhe !== null
                        ? fmtR(dasOriginalDetalhe)
                        : '—',
                      fmtR(dasDetalhe),
                      creditoTotalDetalhe !== null
                        ? fmtR(creditoTotalDetalhe)
                        : '—',
                    ].map((v, i) => (
                      <td
                        key={i}
                        style={{
                          padding: '8px 9px',
                          textAlign: 'center',
                          color:
                            i === 7 && creditoTotalDetalhe !== null
                              ? '#0F766E'
                              : S.text,
                          fontWeight:
                            i === 7 && creditoTotalDetalhe !== null
                              ? 800
                              : 600,
                          borderRight:
                            i < 7 ? '1px solid ' + S.border : 'none',
                          borderBottom: '1px solid ' + S.border,
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: '8px 9px',
                        fontWeight: 700,
                        color: S.text,
                        borderRight: '1px solid ' + S.border,
                      }}
                    >
                      Observação
                    </td>
                    {[
                      'Receita consolidada',
                      basePisCofinsDetalhe !== null ? 'Base persistida' : 'Não persistida',
                      pisRecalculadoDetalhe !== null ? 'PIS persistido' : 'Não persistido',
                      cofinsRecalculadaDetalhe !== null ? 'COFINS persistida' : 'Não persistida',
                      icmsPreservadoDetalhe !== null ? 'ICMS preservado do PGDAS' : 'Não persistido',
                      dasOriginalDetalhe !== null ? 'DAS informado no PGDAS' : 'Não persistido',
                      'DAS recalculado pelo Motor',
                      creditoTotalDetalhe !== null ? 'Crédito identificado' : 'Não persistido',
                    ].map((v, i) => (
                      <td
                        key={i}
                        style={{
                          padding: '8px 9px',
                          textAlign: 'center',
                          color: S.muted,
                          borderRight:
                            i < 7 ? '1px solid ' + S.border : 'none',
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              padding: '9px 12px',
              border: '1px solid ' + S.border,
              borderRadius: 8,
              background: '#FBFCFE',
              fontSize: 10,
              color: S.muted,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>e-FiscalTribe® — Motor de Inteligência Tributária</span>
            <span>
              Gerado em {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── TELA LISTA ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }}>
      <style>{'/* retrofit-tabela-apuracao */ .apuracao-table th,.apuracao-table td{border-right:1px solid #E7EDF4;} .apuracao-table th:last-child,.apuracao-table td:last-child{border-right:none;} .apuracao-table tbody td,.apuracao-table tbody td *{font-weight:400!important;}'}</style>

      {!motorAnalise && (
        <>
          {/* ABERTURA COMERCIAL — CENTRAL DE APURACAO */}
          <div
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FBFF 100%)',
              border: '1px solid ' + S.border,
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 10,
              boxShadow: '0 8px 28px rgba(15,23,42,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  minWidth: 320,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    color: S.blue,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    flex: '0 0 auto',
                  }}
                >
                  SN
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: S.blue,
                      fontWeight: 800,
                      letterSpacing: 0.9,
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Motor do Simples
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 750,
                      color: S.navy,
                      lineHeight: 1.15,
                    }}
                  >
                    Central de Apuração do Simples Nacional
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: S.muted,
                      marginTop: 6,
                      maxWidth: 780,
                      lineHeight: 1.5,
                    }}
                  >
                    Confira cada competência cruzando PGDAS-D, documentos fiscais e classificações tributárias antes de consolidar o resultado.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setMotorClienteId('')
                    setMotorCompetencia('')
                    setMotorErro('')
                    setModalMotor(true)
                  }}
                  style={{
                    minHeight: 38,
                    padding: '0 16px',
                    background: S.green,
                    color: S.white,
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(22,163,74,0.18)',
                  }}
                >
                  Conferir competência
                </button>

                <button
                  onClick={() => { setForm(VAZIO); setModalNova(true) }}
                  style={{
                    minHeight: 38,
                    padding: '0 16px',
                    background: S.white,
                    color: S.blue,
                    border: '1px solid #BFDBFE',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Nova apuração
                </button>
              </div>
            </div>
          </div>

          {/* INDICADORES EXECUTIVOS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 12,
            }}
          >
            {[
              {
                simbolo: '▣',
                label: 'Apurações cadastradas',
                valor: apuracoes.length,
                detalhe: 'Competências registradas',
                cor: S.blue,
                fundo: '#EFF6FF',
              },
              {
                simbolo: '◷',
                label: 'Aguardando',
                valor: apuracoes.filter(a => a.status_apuracao === 'Aguardando').length,
                detalhe: 'Pendentes de conclusão',
                cor: S.orange,
                fundo: '#FFF7ED',
              },
              {
                simbolo: '✓',
                label: 'Transmitidas',
                valor: apuracoes.filter(a => a.status_apuracao === 'Transmitida').length,
                detalhe: 'Apurações concluídas',
                cor: S.green,
                fundo: '#F0FDF4',
              },
              {
                simbolo: '!',
                label: 'Em atenção',
                valor: apuracoes.filter(a => a.status_apuracao === 'Em atraso').length,
                detalhe: 'Exigem revisão',
                cor: S.red,
                fundo: '#FEF2F2',
              },
            ].map((kpi, i) => (
              <div
                key={i}
                style={{
                  height: 66,
                  background: S.white,
                  border: '1px solid ' + S.border,
                  borderRadius: 11,
                  padding: '8px 11px',
                  boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                }}
              >
                <div
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: 10,
                    background: kpi.fundo,
                    color: kpi.cor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 800,
                    flex: '0 0 auto',
                  }}
                >
                  {kpi.simbolo}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: S.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: 18, color: S.navy, fontWeight: 800, lineHeight: 1.05, marginTop: 3 }}>
                    {kpi.valor}
                  </div>
                  <div style={{ fontSize: 10, color: S.muted, marginTop: 3 }}>
                    {kpi.detalhe}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FLUXO PRINCIPAL */}
          <div
            style={{
              background: S.white,
              border: '1px solid ' + S.border,
              borderRadius: 11,
              padding: '9px 12px',
              marginBottom: 10,
              boxShadow: '0 3px 12px rgba(15,23,42,0.035)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '205px 1fr',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: S.navy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.45 }}>
                  Fluxo da conferência
                </div>
                <div style={{ fontSize: 10, color: S.muted, marginTop: 3, lineHeight: 1.4 }}>
                  Da documentação ao resultado da competência
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                  gap: 7,
                }}
              >
                {[
                  ['01', 'PGDAS-D'],
                  ['02', 'Documentos fiscais'],
                  ['03', 'Classificação'],
                  ['04', 'Conferência'],
                  ['05', 'Resultado'],
                ].map(([numero, label], i) => (
                  <div
                    key={numero}
                    style={{
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid ' + S.border,
                      background: '#FBFCFE',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0 10px',
                    }}
                  >
                    <span
                      style={{
                        width: 23,
                        height: 23,
                        borderRadius: 999,
                        background: '#EFF6FF',
                        color: S.blue,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        flex: '0 0 auto',
                      }}
                    >
                      {numero}
                    </span>
                    <span style={{ fontSize: 10, color: S.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    {i < 4 && <span style={{ marginLeft: 'auto', color: S.ghostText }}>›</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
{motorAnalise && (
        <div style={{ background: S.white, border: '1px solid ' + S.border, borderRadius: 11, padding: 10, marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 14,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid ' + S.border,
            }}
          >
            <div style={{ flex: 1, minWidth: 280 }}>
              <div
                style={{
                  fontSize: 10,
                  color: S.blue,
                  fontWeight: 700,
                  letterSpacing: 0.7,
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}
              >
                Apuração da competência
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: S.navy,
                  lineHeight: 1.25,
                }}
              >
                {motorAnalise.cliente?.razao_social}
                <span
                  style={{
                    color: S.muted,
                    fontWeight: 500,
                  }}
                >
                  {' — '}
                  {motorAnalise.competencia}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginTop: 5,
                  color: S.muted,
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                <span>
                  <strong style={{ color: S.text }}>
                    PGDAS:
                  </strong>{' '}
                  {motorAnalise.pgdas?.num_declaracao ||
                    motorAnalise.pgdas?.id}
                </span>

                <span>
                  <strong style={{ color: S.text }}>
                    Lote XML:
                  </strong>{' '}
                  {motorAnalise.diagnosticoMono?.nome_diagnostico ||
                    motorAnalise.diagnosticoMono?.id}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={salvarResultadoMotor}
                disabled={
                  salvando ||
                  motorAnalise.calculoTributario?.resultado?.resultadoGerado !== true
                }
                title={
                  motorAnalise.calculoTributario?.resultado?.resultadoGerado === true
                    ? 'Salvar esta apuração'
                    : 'Disponível após a geração do resultado'
                }
                style={{
                  height: 28,
                  padding: '0 10px',
                  border: 'none',
                  borderRadius: 7,
                  background:
                    motorAnalise.calculoTributario?.resultado?.resultadoGerado === true
                      ? S.green
                      : '#CBD5E1',
                  color: S.white,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor:
                    salvando ||
                    motorAnalise.calculoTributario?.resultado?.resultadoGerado !== true
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>

              <button
                type="button"
                onClick={imprimirResultadoMotor}
                style={{
                  height: 28,
                  padding: '0 10px',
                  border: '1px solid ' + S.border,
                  borderRadius: 7,
                  background: S.white,
                  color: S.text,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Imprimir
              </button>

              <button
                type="button"
                onClick={excluirResultadoMotor}
                style={{
                  height: 28,
                  padding: '0 10px',
                  border: '1px solid #FCA5A5',
                  borderRadius: 7,
                  background: S.white,
                  color: S.red,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Excluir
              </button>

              <StatusMotor
                status={
                  motorAnalise.calculoTributario?.resultado?.status ||
                  motorAnalise.calculoTributario?.comparacao?.status ||
                  motorAnalise.conferencia?.status ||
                  (
                    motorAnalise.base?.prontaParaConferencia
                      ? 'base_pronta'
                      : 'base_pendente'
                  )
                }
              />

              <button
                onClick={() => setMotorAnalise(null)}
                style={{
                  height: 28,
                  border: '1px solid ' + S.border,
                  background: S.white,
                  borderRadius: 7,
                  padding: '0 9px',
                  cursor: 'pointer',
                  color: S.muted,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Fechar
              </button>
            </div>
          </div>


          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: S.navy,
              marginBottom: 6,
            }}
          >
            Resumo da conferência
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            {[
              {
                label: 'Receita PGDAS',
                valor: fmtR(
                  motorAnalise.pgdas?.receita_bruta_total
                ),
                detalhe: 'Receita declarada na competência',
              },

              {
                label: 'Receita documental',
                valor: fmtR(
                  (motorAnalise.base?.parcelas || []).reduce(
                    (s, parcela) =>
                      s + Number(parcela.valor || 0),
                    0
                  )
                ),
                detalhe: 'Movimentação encontrada nos documentos',
              },

              {
                label: 'Tratamento específico PIS/COFINS',
                valor:
                  motorAnalise.calculoTributario
                    ?.basePisCofins
                    ? fmtR(
                        motorAnalise.calculoTributario
                          .basePisCofins
                          .receitaTratamentoEspecifico
                      )
                    : '—',
                detalhe:
                  'Receita segregada pelo Motor',
              },

              {
                label: 'Divergência de receita',
                valor: fmtR(
                  Math.abs(
                    Number(
                      motorAnalise.pgdas
                        ?.receita_bruta_total || 0
                    ) -
                    (motorAnalise.base?.parcelas || [])
                      .reduce(
                        (s, parcela) =>
                          s + Number(parcela.valor || 0),
                        0
                      )
                  )
                ),
                detalhe:
                  motorAnalise.conferencia?.prontoParaCalculo
                    ? 'Divergência tratada na conferência'
                    : 'Aguardando tratamento',
              },
            ].map((k, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid ' + S.border,
                  borderRadius: 9,
                  padding: '5px 8px',
                  background: '#FBFCFE',
                  minHeight: 44,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: S.muted,
                    fontWeight: 700,
                    marginBottom: 3,
                    textTransform: 'uppercase',
                    letterSpacing: 0.25,
                  }}
                >
                  {k.label}
                </div>

                <div
                  style={{
                    fontSize: 16,
                    color: S.navy,
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {k.valor}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: S.muted,
                    marginTop: 2,
                    lineHeight: 1.35,
                  }}
                >
                  {k.detalhe}
                </div>
              </div>
            ))}
          </div>


          <div
            style={{
              marginTop: 6,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: S.muted,
              }}
            >
              Pendências da base:
            </span>

            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: '0 7px',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background:
                  (motorAnalise.base?.pendencias?.length || 0) > 0
                    ? '#FFF7ED'
                    : '#F0FDF4',
                color:
                  (motorAnalise.base?.pendencias?.length || 0) > 0
                    ? '#C2410C'
                    : '#15803D',
                border:
                  '1px solid ' +
                  (
                    (motorAnalise.base?.pendencias?.length || 0) > 0
                      ? '#FED7AA'
                      : '#BBF7D0'
                  ),
              }}
            >
              {motorAnalise.base?.pendencias?.length || 0}
            </span>
          </div>

          {(motorAnalise.base?.pendencias?.length || 0) > 0 && (
            <div style={{ marginTop: 14, padding: '10px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.orange, marginBottom: 6 }}>Pendencias da base</div>
              {(motorAnalise.base.pendencias || []).slice(0, 12).map((p, i) => (
                <div key={i} style={{ fontSize: 11, color: S.text, marginBottom: 3 }}>
                  {p.tipo}
                  {p.codigo ? ' · Produto ' + p.codigo : ''}
                  {p.nf ? ' · NF ' + p.nf : ''}
                </div>
              ))}
            </div>
          )}

          {motorAnalise.calculoTributario && (
            <div
              style={{
                marginTop: 7,
                padding: '8px 9px',
                background: S.white,
                border: '1px solid ' + S.border,
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: S.navy,
                  marginBottom: 6,
                }}
              >
                Etapas da apuração
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
                  gap: 6,
                }}
              >              {[
                {
                  numero: '01',
                  label: 'Conferência da receita',
                  status:
                    motorAnalise.conferencia?.status ||
                    (
                      motorAnalise.base?.prontaParaConferencia
                        ? 'base_pronta'
                        : 'base_pendente'
                    ),
                },
                {
                  numero: '02',
                  label: 'Base PIS/COFINS',
                  status:
                    motorAnalise.calculoTributario
                      ?.basePisCofins?.status,
                },
                {
                  numero: '03',
                  label: 'PIS e COFINS',
                  status:
                    motorAnalise.calculoTributario
                      ?.pisCofins?.status,
                },
                {
                  numero: '04',
                  label: 'Tributos federais',
                  status:
                    motorAnalise.calculoTributario
                      ?.tributosFederais?.status,
                },
                {
                  numero: '05',
                  label: 'ICMS',
                  status:
                    motorAnalise.calculoTributario
                      ?.icmsPreservado?.status,
                },
                {
                  numero: '06',
                  label: 'DAS conferido',
                  status:
                    motorAnalise.calculoTributario
                      ?.dasConferido?.status,
                },
                {
                  numero: '07',
                  label: 'Comparação com PGDAS',
                  status:
                    motorAnalise.calculoTributario
                      ?.comparacao?.status,
                },
                {
                  numero: '08',
                  label: 'Crédito monofásico',
                  status:
                    motorAnalise.calculoTributario
                      ?.creditoMonofasico?.status,
                },
                {
                  numero: '09',
                  label: 'Resultado final',
                  status:
                    motorAnalise.calculoTributario
                      ?.resultado?.status,
                },
              ].map((etapa) => {
                const visual =
                  estiloStatusMotor(etapa.status)

                const concluida =
                  String(visual.texto) === '#15803D'

                return (
                  <div
                    key={etapa.numero}
                    style={{
                      border:
                        '1px solid ' + visual.borda,
                      borderRadius: 9,
                      padding: '5px 6px',
                      background: visual.fundo,
                      minHeight: 48,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            display: 'inline-flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: 999,
                            border:
                              '1px solid ' +
                              visual.borda,
                            background: S.white,
                            color: visual.texto,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {etapa.numero}
                        </span>

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: visual.texto,
                          }}
                        >
                          {concluida ? '✓' : '•'}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: S.navy,
                          lineHeight: 1.25,
                        }}
                      >
                        {etapa.label}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10,
                        fontWeight: 600,
                        color: visual.texto,
                        lineHeight: 1.25,
                      }}
                    >
                      {rotuloStatusMotor(
                        etapa.status
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
              {motorAnalise.calculoTributario?.comparacao?.status === 'pgdas_original_inconsistente' && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: S.orange,
                      marginBottom: 10,
                    }}
                  >
                    PGDAS-D original inconsistente
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 10px',
                        background: S.white,
                        border: '1px solid ' + S.border,
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: S.muted,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        DAS informado no PGDAS
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: S.navy,
                          fontWeight: 700,
                        }}
                      >
                        {fmtR(
                          motorAnalise.calculoTributario
                            ?.comparacao
                            ?.dasOriginalInformado
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px 12px',
                        background: S.white,
                        border: '1px solid ' + S.border,
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: S.muted,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        Soma dos tributos do PGDAS
                      </div>

                      <div
                        style={{
                          fontSize: 15,
                          color: S.navy,
                          fontWeight: 700,
                        }}
                      >
                        {fmtR(
                          motorAnalise.calculoTributario
                            ?.comparacao
                            ?.somaTributosOriginais
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px 12px',
                        background: S.white,
                        border: '1px solid ' + S.border,
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: S.muted,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        Diferença interna
                      </div>

                      <div
                        style={{
                          fontSize: 15,
                          color: S.orange,
                          fontWeight: 700,
                        }}
                      >
                        {fmtR(
                          Math.abs(
                            Number(
                              motorAnalise.calculoTributario
                                ?.comparacao
                                ?.somaTributosOriginais || 0
                            ) -
                            Number(
                              motorAnalise.calculoTributario
                                ?.comparacao
                                ?.dasOriginalInformado || 0
                            )
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      color: S.text,
                      lineHeight: 1.5,
                    }}
                  >
                    A composição dos tributos do PGDAS-D original não fecha
                    com o DAS informado. O documento original foi preservado,
                    mas a identificação de crédito permanece bloqueada até a
                    validação da divergência.
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: S.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    Confira a origem da diferença no PGDAS-D da competência.
                    Nenhuma retificação, crédito ou ajuste é executado
                    automaticamente nesta etapa.
                  </div>
                </div>
              )}

            </div>
          )}

          {motorAnalise.conferencia?.status === 'aguardando_decisao' && (
            <div style={{ marginTop: 7 }}>
              {/* STATUS DO PROCESSO */}
              <div
                style={{
                  background: S.white,
                  border: '1px solid ' + S.border,
                  borderRadius: 10,
                  padding: '6px 8px',
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: S.navy, marginBottom: 6 }}>
                  Situação da conferência
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: 7,
                  }}
                >
                  {[
                    ['01', 'Documentos fiscais', 'Concluído', '#15803D', '#F0FDF4', '#BBF7D0'],
                    ['02', 'Classificação', 'Concluída', '#15803D', '#F0FDF4', '#BBF7D0'],
                    ['03', 'Receita', 'Conferida', '#15803D', '#F0FDF4', '#BBF7D0'],
                    ['04', 'Decisão', 'Em análise', '#C2410C', '#FFF7ED', '#FED7AA'],
                    ['05', 'Resultado', 'Aguardando', '#64748B', '#F8FAFC', '#E2E8F0'],
                  ].map(([numero, label, status, cor, fundo, borda]) => (
                    <div
                      key={numero}
                      style={{
                        minHeight: 40,
                        padding: '5px 7px',
                        borderRadius: 8,
                        border: '1px solid ' + borda,
                        background: fundo,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            background: S.white,
                            border: '1px solid ' + borda,
                            color: cor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 800,
                            flex: '0 0 auto',
                          }}
                        >
                          {numero}
                        </span>
                        <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, lineHeight: 1.2 }}>
                          {label}
                        </div>
                      </div>
                      <div style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: cor }}>
                        {status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PAINEL DE DECISAO */}
              <div
                style={{
                  background: 'linear-gradient(180deg, #FFFBF5 0%, #FFF7ED 100%)',
                  border: '1px solid #FDBA74',
                  borderRadius: 11,
                  padding: '7px 8px',
                  boxShadow: '0 5px 16px rgba(234,88,12,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 27,
                        height: 27,
                        borderRadius: 999,
                        background: '#FFF7ED',
                        border: '1px solid #FDBA74',
                        color: S.orange,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      !
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: S.orange }}>
                        Divergência de receita identificada
                      </div>
                      <div style={{ fontSize: 10, color: S.muted, marginTop: 3 }}>
                        A competência precisa de uma decisão antes de seguir para o cálculo tributário.
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '4px 9px',
                      borderRadius: 999,
                      background: '#FFF7ED',
                      border: '1px solid #FDBA74',
                      color: '#C2410C',
                      fontSize: 10,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Aguardando decisão
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {[
                    {
                      label: 'Receita declarada no PGDAS',
                      valor: fmtR(motorAnalise.conferencia?.conciliacao?.receitaDeclaradaPgdas),
                      cor: S.navy,
                    },
                    {
                      label: 'Receita apurada nos documentos',
                      valor: fmtR(motorAnalise.conferencia?.conciliacao?.receitaApurada),
                      cor: S.navy,
                    },
                    {
                      label: 'Diferença encontrada',
                      valor: fmtR(Math.abs(Number(motorAnalise.conferencia?.conciliacao?.diferenca || 0))),
                      cor: S.orange,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        minHeight: 54,
                        background: S.white,
                        border: '1px solid ' + (i === 2 ? '#FDBA74' : S.border),
                        borderRadius: 9,
                        padding: '7px 9px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{ fontSize: 10, color: S.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.35 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 16, color: item.cor, fontWeight: 800, marginTop: 4, lineHeight: 1 }}>
                        {item.valor}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, marginBottom: 6 }}>
                  Como esta competência deve prosseguir?
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      minHeight: 76,
                      background: S.white,
                      border: '1px solid ' + S.border,
                      borderRadius: 9,
                      padding: '8px 9px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: S.navy }}>01 · Interromper apuração</div>
                    <div style={{ fontSize: 10, color: S.muted, lineHeight: 1.35, marginTop: 4, flex: 1 }}>
                      Suspende a competência para revisão sem produzir resultado tributário.
                    </div>
                    <button
                      type="button"
                      onClick={() => aplicarDecisaoDivergenciaMotor('interromper')}
                      style={{
                        minHeight: 27,
                        background: S.white,
                        color: S.text,
                        border: '1px solid ' + S.border,
                        borderRadius: 7,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Interromper apuração
                    </button>
                  </div>

                  <div
                    style={{
                      minHeight: 76,
                      background: S.white,
                      border: '1px solid ' + S.border,
                      borderRadius: 9,
                      padding: '8px 9px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: S.navy }}>02 · Manter divergência</div>
                    <div style={{ fontSize: 10, color: S.muted, lineHeight: 1.35, marginTop: 4, flex: 1 }}>
                      Mantém a diferença registrada e encerra a decisão sem cálculo automático de crédito.
                    </div>
                    <button
                      type="button"
                      onClick={() => aplicarDecisaoDivergenciaMotor('manter_divergencia')}
                      style={{
                        minHeight: 27,
                        background: S.white,
                        color: S.text,
                        border: '1px solid ' + S.border,
                        borderRadius: 7,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Manter divergência
                    </button>
                  </div>

                  <div
                    style={{
                      minHeight: 76,
                      background: '#F0FDF4',
                      border: '1px solid #86EFAC',
                      borderRadius: 9,
                      padding: '8px 9px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#166534' }}>03 · Usar receita declarada</div>
                    <div style={{ fontSize: 10, color: '#3F6212', lineHeight: 1.45, marginTop: 6, flex: 1 }}>
                      Preserva a receita do PGDAS e leva a diferença documental para o tratamento conservador do Motor.
                    </div>
                    <button
                      type="button"
                      onClick={() => aplicarDecisaoDivergenciaMotor('usar_receita_declarada')}
                      style={{
                        marginTop: 8,
                        minHeight: 34,
                        background: S.green,
                        color: S.white,
                        border: 'none',
                        borderRadius: 7,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 3px 10px rgba(22,163,74,0.16)',
                      }}
                    >
                      Usar receita declarada e prosseguir
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px solid #FED7AA',
                    fontSize: 10,
                    color: S.muted,
                    lineHeight: 1.3,
                  }}
                >
                  A escolha registrada orienta o Motor nesta competência. Nenhuma retificação ou transmissão é feita automaticamente por esta tela.
                </div>
              </div>
            </div>
          )}

          {motorAnalise.calculoTributario
            ?.resultado?.resultadoGerado === true && (
            <div
              style={{
                marginTop: 8,
                border:
                  '1px solid ' + S.border,
                borderRadius: 10,
                background: S.white,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding:
                    '7px 10px 5px',
                  borderBottom:
                    '1px solid ' +
                    S.border,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: S.navy,
                  }}
                >
                  Resultado da competência
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: S.muted,
                    marginTop: 2,
                  }}
                >
                  Resumo do crédito apurado
                </div>
              </div>


              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                  padding: 10,
                }}
              >
                {[
                  {
                    label: 'Crédito PIS',
                    valor:
                      motorAnalise
                        .calculoTributario
                        .resultado
                        .credito?.pis,
                    fundo: '#EFF6FF',
                    borda: '#BFDBFE',
                    cor: '#2563EB',
                  },
                  {
                    label:
                      'Crédito COFINS',
                    valor:
                      motorAnalise
                        .calculoTributario
                        .resultado
                        .credito?.cofins,
                    fundo: '#FAF5FF',
                    borda: '#E9D5FF',
                    cor: '#7C3AED',
                  },
                  {
                    label:
                      'Crédito total',
                    valor:
                      motorAnalise
                        .calculoTributario
                        .resultado
                        .credito?.total,
                    fundo: '#F0FDF4',
                    borda: '#BBF7D0',
                    cor: '#15803D',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      minHeight: 56,
                      padding:
                        '8px 10px',
                      borderRadius: 9,
                      background:
                        item.fundo,
                      border:
                        '1px solid ' +
                        item.borda,
                      display: 'flex',
                      flexDirection:
                        'column',
                      justifyContent:
                        'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: S.muted,
                        textTransform:
                          'uppercase',
                        letterSpacing:
                          0.3,
                      }}
                    >
                      {item.label}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize:
                          i === 2
                            ? 19
                            : 17,
                        lineHeight: 1,
                        fontWeight: 800,
                        color: item.cor,
                      }}
                    >
                      {fmtR(
                        item.valor
                      )}
                    </div>
                  </div>
                ))}
              </div>


              <div
                style={{
                  margin:
                    '0 8px 8px',
                  padding:
                    '7px 9px',
                  borderRadius: 8,
                  background:
                    '#F8FAFC',
                  border:
                    '1px solid ' +
                    S.border,
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(240px, 1fr) minmax(300px, 1.3fr)',
                  gap: 18,
                  alignItems:
                    'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: S.navy,
                    }}
                  >
                    Memória e observações
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: S.green,
                      marginTop: 3,
                    }}
                  >
                    Conferência concluída com sucesso.
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: S.muted,
                      marginTop: 3,
                      lineHeight: 1.45,
                    }}
                  >
                    A movimentação foi analisada,
                    as divergências foram tratadas
                    e o resultado tributário da
                    competência foi gerado.
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: S.text,
                    lineHeight: 1.45,
                  }}
                >
                  <div>
                    ✓ Cadeia de conferência concluída.
                  </div>

                  <div>
                    ✓ Crédito de PIS/COFINS identificado.
                  </div>

                  <div>
                    ✓ Competência pronta para salvar e documentar.
                  </div>
                </div>
              </div>


              <div
                style={{
                  borderTop: '1px solid ' + S.border,
                  padding: '5px 8px',
                  display: 'flex',
                  gap: 6,
                  background: '#FBFCFE',
                }}
              >
                <button
                  onClick={abrirHistoricoResultadoMotor}
                  style={{
                    height: 27,
                    padding: '0 10px',
                    background: S.white,
                    color: S.text,
                    border: '1px solid ' + S.border,
                    borderRadius: 7,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Histórico
                </button>

                <button
                  onClick={exportarPdfResultadoMotor}
                  style={{
                    height: 27,
                    padding: '0 10px',
                    background: S.white,
                    color: S.blue,
                    border: '1px solid #BFDBFE',
                    borderRadius: 7,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Exportar PDF
                </button>
              </div>
            </div>
          )}


        </div>
      )}
      {/* COMPETENCIAS SALVAS / EMPTY STATE */}
      {!motorAnalise && (
        <>
          {/* PAINEL VISUAL — COMPOSICAO DA ABERTURA */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.75fr)',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                background: S.white,
                border: '1px solid ' + S.border,
                borderRadius: 11,
                padding: '12px 14px',
                boxShadow: '0 3px 12px rgba(15,23,42,0.035)',
                minHeight: 152,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: S.navy }}>Evolução das competências</div>
                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>Apurações registradas nos últimos 6 meses</div>
                </div>
                <span style={{ fontSize: 10, color: S.blue, background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 999, padding: '3px 7px', fontWeight: 700 }}>
                  {apuracoes.length} no total
                </span>
              </div>

              <div
                style={{
                  height: 88,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                  gap: 12,
                  alignItems: 'end',
                  marginTop: 8,
                  padding: '0 4px',
                }}
              >
                {mesesGrafico.map(item => (
                  <div key={item.competencia} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: item.valor > 0 ? S.navy : S.ghostText, fontWeight: 700 }}>
                      {item.valor}
                    </div>
                    <div style={{ width: '100%', maxWidth: 42, height: 56, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: '100%',
                          height: Math.max(item.valor > 0 ? 12 : 3, (item.valor / maiorValorGrafico) * 56),
                          borderRadius: '6px 6px 0 0',
                          background: item.valor > 0 ? 'linear-gradient(180deg,#60A5FA 0%,#2563EB 100%)' : '#CBD5E1',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: S.muted, fontWeight: 700 }}>
                      {item.rotulo}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: S.white,
                border: '1px solid ' + S.border,
                borderRadius: 11,
                padding: '12px 14px',
                boxShadow: '0 3px 12px rgba(15,23,42,0.035)',
                minHeight: 152,
                display: 'grid',
                gridTemplateColumns: '108px 1fr',
                gap: 13,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: apuracoes.length
                    ? `conic-gradient(${S.green} 0 ${pctConcluidas}%, ${S.orange} ${pctConcluidas}% ${pctConcluidas + pctAguardando}%, ${S.red} ${pctConcluidas + pctAguardando}% 100%)`
                    : '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: S.white,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: S.navy }}>{apuracoes.length}</div>
                  <div
                    style={{
                      fontSize: apuracoes.length === 0 ? 8.5 : 9,
                      color: S.muted,
                      textTransform: 'uppercase',
                      fontWeight: apuracoes.length === 0 ? 600 : 700,
                      letterSpacing: apuracoes.length === 0 ? -0.15 : 0,
                    }}
                  >
                    competências
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: S.navy }}>Situação operacional</div>
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  {[
                    ['Concluídas', statusDashboard.concluidas, S.green],
                    ['Aguardando', statusDashboard.aguardando, S.orange],
                    ['Em atenção', statusDashboard.atencao, S.red],
                  ].map(([label, valor, cor]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: cor, flex: '0 0 auto' }} />
                      <span style={{ color: S.muted, flex: 1 }}>{label}</span>
                      <strong style={{ color: S.navy }}>{valor}</strong>
                    </div>
                  ))}
                </div>

                {!temDados && (
                  <button
                    onClick={() => {
                      setMotorClienteId('')
                      setMotorCompetencia('')
                      setMotorErro('')
                      setModalMotor(true)
                    }}
                    style={{
                      width: '100%',
                      minHeight: 39,
                      marginTop: 10,
                      border: 'none',
                      borderRadius: 7,
                      background: S.green,
                      color: S.white,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Iniciar primeira conferência
                  </button>
                )}
              </div>
            </div>
          </div>

          {!loading && !temDados ? (
            <div
              style={{
                minHeight: 72,
                background: 'linear-gradient(90deg, #FFFFFF 0%, #F8FBFF 100%)',
                border: '1px solid ' + S.border,
                borderRadius: 11,
                padding: '12px 15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: '0 3px 12px rgba(15,23,42,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', border: '1px solid #DBEAFE', color: S.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                  ▣
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: S.navy }}>Nenhuma competência salva ainda</div>
                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>Quando a primeira conferência for concluída, o histórico operacional aparecerá aqui.</div>
                </div>
              </div>

              <button
                onClick={() => { setForm(VAZIO); setModalNova(true) }}
                style={{ minHeight: 30, padding: '0 11px', border: '1px solid ' + S.border, borderRadius: 7, background: S.white, color: S.text, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Nova apuração manual
              </button>
            </div>
          ) : (
            <div
              style={{
                background: S.white,
                borderRadius: 11,
                border: '1px solid ' + S.border,
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(15,23,42,0.035)',
              }}
            >
              <div
                style={{
                  padding: '11px 14px',
                  borderBottom: '1px solid ' + S.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: S.navy }}>Competências salvas</div>
                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>Histórico operacional da apuração do Simples Nacional</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setPagina(1) }}
                    placeholder="Buscar empresa ou competência..."
                    style={{
                      height: 31,
                      padding: '0 10px',
                      border: '1px solid ' + S.border,
                      borderRadius: 7,
                      fontSize: 11,
                      outline: 'none',
                      width: 225,
                    }}
                  />

                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'aguardando', label: 'Aguardando' },
                    { id: 'transmitida', label: 'Transmitida' },
                    { id: 'em_atraso', label: 'Em atraso' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => { setFiltroStatus(f.id); setPagina(1) }}
                      style={{
                        height: 29,
                        padding: '0 9px',
                        background: filtroStatus === f.id ? S.navy : S.white,
                        color: filtroStatus === f.id ? S.white : S.muted,
                        border: '1px solid ' + (filtroStatus === f.id ? S.navy : S.border),
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: filtroStatus === f.id ? 800 : 600,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="apuracao-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#475569' }}>
                      {['Empresa', 'Competência', 'Receita Apurada', 'Imposto Apurado', 'Alíquota', 'Tipo', 'Status Apuração', 'Status Declaração', 'Transmissão', 'Ações'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.white, fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array(5).fill(null).map((_, i) => <SkeletonRow key={i} cols={10} />)
                    ) : (
                      pagAtual.map((a, i) => {
                        const cl = clientes[a.cliente_id]
                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid ' + S.border, background: i % 2 === 0 ? S.white : '#FBFCFE' }}>
                            <td style={{ padding: '8px 10px', color: S.navy, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl?.razao_social || '—'}</td>
                            <td style={{ padding: '8px 10px', color: S.text }}>{a.competencia || '—'}</td>
                            <td style={{ padding: '8px 10px', color: S.text }}>{fmtR(a.receita_apurada)}</td>
                            <td style={{ padding: '8px 10px', color: S.navy }}>{fmtR(a.imposto_apurado)}</td>
                            <td style={{ padding: '8px 10px' }}><Badge label={fmtPct(a.aliquota_efetiva)} tipo="original" /></td>
                            <td style={{ padding: '8px 10px', color: S.muted }}>{a.tipo_declaracao || '—'}</td>
                            <td style={{ padding: '8px 10px' }}><Badge label={a.status_apuracao || 'Aguardando'} tipo={statusTipo(a.status_apuracao)} /></td>
                            <td style={{ padding: '8px 10px' }}><Badge label={a.status_declaracao || 'Aguardando'} tipo={statusTipo(a.status_declaracao)} /></td>
                            <td style={{ padding: '8px 10px', color: S.muted, fontSize: 10 }}>{a.data_transmissao || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => setDetalhe(a)} style={{ padding: '4px 7px', background: '#EFF6FF', color: S.blue, border: '1px solid #BFDBFE', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>Ver</button>
                                <button onClick={() => abrirEditar(a)} style={{ padding: '4px 7px', background: '#F0FDF4', color: S.green, border: '1px solid #86EFAC', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>Editar</button>
                                <button onClick={() => excluir(a.id)} style={{ padding: '4px 7px', background: '#FEF2F2', color: S.red, border: '1px solid #FECACA', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>Excluir</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  padding: '9px 14px',
                  borderTop: '1px solid ' + S.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: S.muted,
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span>{loading ? 'Carregando...' : `${filtradas.length} apuração(ões) — Página ${pagina} de ${totalPaginas}`}</span>

                {!loading && temDados && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[
                      ['«', () => setPagina(1), pagina === 1],
                      ['<', () => setPagina(p => Math.max(1, p - 1)), pagina === 1],
                      ['>', () => setPagina(p => Math.min(totalPaginas, p + 1)), pagina === totalPaginas],
                      ['»', () => setPagina(totalPaginas), pagina === totalPaginas],
                    ].map(([l, fn, dis], i) => (
                      <button
                        key={i}
                        onClick={fn}
                        disabled={dis}
                        style={{
                          minWidth: 28,
                          height: 27,
                          border: '1px solid ' + S.border,
                          borderRadius: 5,
                          background: S.white,
                          cursor: dis ? 'not-allowed' : 'pointer',
                          color: dis ? S.ghostText : S.text,
                        }}
                      >
                        {l}
                      </button>
                    ))}

                    <select
                      value={porPagina}
                      onChange={e => { const n = Number(e.target.value); setPorPagina(n); setPagina(1) }}
                      style={{ marginLeft: 5, height: 27, border: '1px solid ' + S.border, borderRadius: 5, fontSize: 10 }}
                    >
                      {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}/página</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {modalParametrosReceita && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: S.white,
              borderRadius: 12,
              width: '100%',
              maxWidth: 980,
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow:
                '0 20px 60px rgba(0,0,0,0.22)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderBottom:
                  '1px solid ' + S.border,
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: S.navy,
                }}
              >
                Parametrização da Receita Documental
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: S.muted,
                  marginTop: 5,
                  lineHeight: 1.5,
                }}
              >
                Defina como cada CFOP deve participar da receita da competência.
                O FiscalTribe não inclui ou exclui um CFOP sem parametrização.
              </div>
            </div>

            <div
              style={{
                padding: 16,
                overflowY: 'auto',
                flex: 1,
              }}
            >
              <div
                style={{
                  padding: '9px 11px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 7,
                  color: '#1e40af',
                  fontSize: 11,
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                Nesta etapa a parametrização vale somente para esta conferência.
                A persistência por empresa será feita no próximo passo.
              </div>

              <div
                style={{
                  overflowX: 'auto',
                  border:
                    '1px solid ' + S.border,
                  borderRadius: 8,
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: S.thBg,
                      }}
                    >
                      {[
                        'CFOP',
                        'Itens',
                        'Valor produtos',
                        'Descontos',
                        'Tratamento',
                        'Tratamento do desconto',
                      ].map(h => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 10px',
                            textAlign: 'left',
                            color: S.thText,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {gruposCfopReceita.map(
                      (grupo, index) => {
                        const parametro =
                          parametrosCfopReceita[
                            grupo.cfop
                          ] || {}

                        return (
                          <tr
                            key={grupo.cfop}
                            style={{
                              borderBottom:
                                '1px solid ' +
                                S.border,

                              background:
                                index % 2 === 0
                                  ? S.white
                                  : '#FAFAFA',
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  '9px 10px',
                                fontWeight: 600,
                                color: S.navy,
                              }}
                            >
                              {grupo.cfop}
                            </td>

                            <td
                              style={{
                                padding:
                                  '9px 10px',
                              }}
                            >
                              {grupo.quantidadeItens}
                            </td>

                            <td
                              style={{
                                padding:
                                  '9px 10px',
                              }}
                            >
                              {fmtR(
                                grupo.valorProdutos
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  '9px 10px',
                              }}
                            >
                              {fmtR(
                                grupo.valorDescontos
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  '7px 10px',
                              }}
                            >
                              <select
                                value={
                                  parametro.tratamento ||
                                  ''
                                }
                                onChange={e => {
                                  const tratamento =
                                    e.target.value

                                  setParametrosCfopReceita(
                                    anterior => ({
                                      ...anterior,

                                      [grupo.cfop]: {
                                        ...(
                                          anterior[
                                            grupo.cfop
                                          ] || {}
                                        ),

                                        cfop:
                                          grupo.cfop,

                                        tratamento,

                                        tratamentoDesconto:
                                          tratamento ===
                                          'incluir'
                                            ? (
                                                anterior[
                                                  grupo.cfop
                                                ]
                                                  ?.tratamentoDesconto ||
                                                ''
                                              )
                                            : '',
                                      },
                                    })
                                  )

                                  setParametrosReceitaErro(
                                    ''
                                  )
                                }}
                                style={{
                                  minWidth: 175,
                                  padding: '6px 8px',
                                  border:
                                    '1px solid ' +
                                    S.border,
                                  borderRadius: 6,
                                  fontSize: 12,
                                  background: S.white,
                                }}
                              >
                                <option value="">
                                  Selecione...
                                </option>

                                <option value="incluir">
                                  Considerar na receita
                                </option>

                                <option value="excluir">
                                  Não considerar
                                </option>
                              </select>
                            </td>

                            <td
                              style={{
                                padding:
                                  '7px 10px',
                              }}
                            >
                              <select
                                disabled={
                                  parametro.tratamento !==
                                  'incluir'
                                }
                                value={
                                  parametro
                                    .tratamentoDesconto ||
                                  ''
                                }
                                onChange={e => {
                                  const valor =
                                    e.target.value

                                  setParametrosCfopReceita(
                                    anterior => ({
                                      ...anterior,

                                      [grupo.cfop]: {
                                        ...(
                                          anterior[
                                            grupo.cfop
                                          ] || {}
                                        ),

                                        cfop:
                                          grupo.cfop,

                                        tratamento:
                                          'incluir',

                                        tratamentoDesconto:
                                          valor,
                                      },
                                    })
                                  )

                                  setParametrosReceitaErro(
                                    ''
                                  )
                                }}
                                style={{
                                  minWidth: 185,
                                  padding: '6px 8px',
                                  border:
                                    '1px solid ' +
                                    S.border,
                                  borderRadius: 6,
                                  fontSize: 12,

                                  background:
                                    parametro.tratamento ===
                                    'incluir'
                                      ? S.white
                                      : S.bg,

                                  cursor:
                                    parametro.tratamento ===
                                    'incluir'
                                      ? 'pointer'
                                      : 'not-allowed',
                                }}
                              >
                                <option value="">
                                  Selecione...
                                </option>

                                <option value="manter_valor_produto">
                                  Manter valor do produto
                                </option>

                                <option value="reduzir_receita">
                                  Deduzir desconto
                                </option>
                              </select>
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {parametrosReceitaErro && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '9px 11px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 7,
                    color: S.red,
                    fontSize: 12,
                  }}
                >
                  {parametrosReceitaErro}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '14px 18px',
                borderTop:
                  '1px solid ' +
                  S.border,

                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={() => {
                  setModalParametrosReceita(false)
                  setContextoMotorPendente(null)
                  setGruposCfopReceita([])
                  setParametrosCfopReceita({})
                  setParametrosReceitaErro('')
                }}
                disabled={motorCarregando}
                style={{
                  padding: '7px 15px',
                  border:
                    '1px solid ' +
                    S.border,
                  background: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  color: S.muted,
                }}
              >
                Cancelar
              </button>

              <button
                onClick={
                  continuarConferenciaComParametros
                }
                disabled={motorCarregando}
                style={{
                  padding: '7px 15px',
                  border: 'none',
                  background: S.green,
                  color: S.white,
                  borderRadius: 7,

                  cursor:
                    motorCarregando
                      ? 'not-allowed'
                      : 'pointer',

                  fontWeight: 700,
                }}
              >
                {motorCarregando
                  ? 'Conferindo...'
                  : 'Aplicar e conferir'}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalMotor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: S.white, borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: S.navy }}>Conferencia automatizada da base</div>
            <div style={{ fontSize: 12, color: S.muted, marginTop: 5, marginBottom: 18, lineHeight: 1.5 }}>
              O FiscalTribe vai cruzar PGDAS-D, lote XML e classificacao vigente antes de liberar a apuracao.
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, marginBottom: 4 }}>Empresa</div>
              <select
                value={motorClienteId}
                onChange={e => setMotorClienteId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + S.border, borderRadius: 6, fontSize: 13 }}
              >
                <option value=''>Selecione...</option>
                {Object.values(clientes).map(c => (
                  <option key={c.id} value={c.id}>{c.razao_social}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, marginBottom: 4 }}>Competencia</div>
              <input
                type='month'
                value={competenciaParaInputMes(motorCompetencia)}
                onChange={e => setMotorCompetencia(inputMesParaCompetencia(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + S.border, borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            {motorErro && (
              <div style={{ padding: '9px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, color: S.red, fontSize: 12, marginBottom: 12 }}>
                {motorErro}
              </div>
            )}

            <div style={{ padding: '9px 11px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, color: '#1e40af', fontSize: 11, lineHeight: 1.5, marginBottom: 16 }}>
              Se houver mais de um PGDAS ou mais de um lote XML para a mesma competencia, o sistema vai parar em vez de escolher sozinho.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setModalMotor(false)}
                disabled={motorCarregando}
                style={{ padding: '7px 15px', border: '1px solid ' + S.border, background: 'none', borderRadius: 7, cursor: 'pointer', color: S.muted }}
              >
                Cancelar
              </button>
              <button
                onClick={executarConferenciaMotor}
                disabled={motorCarregando}
                style={{ padding: '7px 15px', border: 'none', background: S.green, color: S.white, borderRadius: 7, cursor: motorCarregando ? 'not-allowed' : 'pointer', fontWeight: 700 }}
              >
                {motorCarregando ? 'Conferindo...' : 'Montar e conferir'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL NOVA / EDITAR */}
      {(modalNova || modalEditar) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: S.white, borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.navy, marginBottom: 20 }}>
              {modalEditar ? 'Editar Apuracao' : 'Nova Apuracao'}
            </div>
            {modalNova && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>Empresa *</div>
                <select value={form.cliente_id || ''} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Selecione...</option>
                  {Object.values(clientes).map(c => (
                    <option key={c.id} value={c.id}>{c.razao_social}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Competencia (MM/AAAA) *', field: 'competencia',      placeholder: '07/2026'          },
                { label: 'Receita Apurada (R$)',    field: 'receita_apurada',  placeholder: '0,00'             },
                { label: 'Imposto Apurado (R$)',    field: 'imposto_apurado',  placeholder: '0,00'             },
                { label: 'Aliquota Efetiva (%)',    field: 'aliquota_efetiva', placeholder: '0,00'             },
                { label: 'Data Transmissao',        field: 'data_transmissao', placeholder: 'DD/MM/AAAA'       },
                { label: 'Transmitido por',         field: 'transmitido_por',  placeholder: 'Nome do contador' },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <input value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tipo Declaracao',   field: 'tipo_declaracao',   opts: ['Original', 'Retificadora'] },
                { label: 'Status Apuracao',   field: 'status_apuracao',   opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
                { label: 'Status Declaracao', field: 'status_declaracao', opts: ['Aguardando', 'Transmitida', 'Em atraso'] },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{f.label}</div>
                  <select value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setModalNova(false); setModalEditar(null); setForm(VAZIO) }}
                style={{ padding: '7px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '7px 16px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}