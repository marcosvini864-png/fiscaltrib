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

export default function ApuracaoSimples() {
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

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => { carregar() }, [])

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

  async function carregarClassificacoesMotor(itemIds) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) return []

    const resultado = []
    const tamanhoLote = 200

    for (let i = 0; i < itemIds.length; i += tamanhoLote) {
      const lote = itemIds.slice(i, i + tamanhoLote)

      const { data, error } = await supabase
        .from('itens_classificacoes')
        .select('*')
        .in('item_id', lote)

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
      const { data: pgdasLista, error: erroPgdas } = await supabase
        .from('diagnosticos_pgdas')
        .select('*')
        .eq('cliente_id', motorClienteId)
        .order('created_at', { ascending: false })

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

      const { data: atividadesPgdas, error: erroAtividades } = await supabase
        .from('diagnosticos_pgdas_atividades')
        .select('*')
        .eq('diagnostico_id', pgdas.id)
        .order('ordem_atividade', { ascending: true })

      if (erroAtividades) throw erroAtividades

      const { data: itensDaCompetencia, error: erroItens } = await supabase
        .from('diagnostico_monofasico_itens')
        .select('*')
        .eq('cliente_id', motorClienteId)
        .eq('competencia', motorCompetencia)
        .order('ordem_item', { ascending: true })

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

      const { data: diagnosticoMono, error: erroDiagnosticoMono } = await supabase
        .from('diagnosticos_monofasicos')
        .select('*')
        .eq('id', diagnosticosIds[0])
        .single()

      if (erroDiagnosticoMono) throw erroDiagnosticoMono


      const { data: itensFiscais, error: erroCadastro } = await supabase
        .from('itens_fiscais')
        .select('*')
        .eq('cliente_id', motorClienteId)

      if (erroCadastro) throw erroCadastro

      const itemIds = (itensFiscais || [])
        .map(item => item.id)
        .filter(Boolean)

      const classificacoesHistoricas =
        await carregarClassificacoesMotor(itemIds)

      const confirmaReceita = window.confirm(
        'ATENCAO: o FiscalTribe ainda nao aplica automaticamente todas as regras de CFOP, devolucoes e descontos. ' +
        'Confirma que os itens desta competencia que NAO estao marcados como exclusao compoem a receita documental pelo valor do produto salvo no XML?'
      )

      if (!confirmaReceita) {
        setMotorCarregando(false)
        return
      }

      const decisoesReceitaDocumental =
        itensDocumentais
          .map(item => {
            const chaveItem = criarChaveItemDocumental(item)

            if (!chaveItem) return null

            if (item.considera_receita === false) {
              return {
                chaveItem,
                tipo: 'excluir',
                origem: 'marcacao_documental_existente',
                motivo:
                  item.motivo_nao_considerar_receita ||
                  'Item marcado para nao considerar receita',
              }
            }

            return {
              chaveItem,
              tipo: 'incluir',
              valor: Number(item.valor_produto || 0),
              origem: 'confirmacao_usuario_apuracao',
              motivo: 'Composicao documental confirmada na apuracao',
            }
          })
          .filter(Boolean)

      const base = prepararBaseApuracaoSimples({
        competencia: motorCompetencia,
        pgdas,
        atividadesPgdas: atividadesPgdas || [],
        itensDocumentais,
        itensFiscais: itensFiscais || [],
        classificacoesHistoricas,
        clienteCnpj: cliente.cnpj,
        alterarIcms: false,
        decisoesReceitaDocumental,
      })

      let conferencia = null

      if (base.prontaParaConferencia) {
        conferencia = executarApuracaoSimples({
          parcelas: base.parcelas,
          receitaDeclaradaPgdas: Number(pgdas.receita_bruta_total || 0),
          alterarIcms: false,
        })
      }

      setMotorAnalise({
        cliente,
        competencia: motorCompetencia,
        pgdas,
        diagnosticoMono,
        itensDocumentais,
        base,
        conferencia,
      })

      setModalMotor(false)
    } catch (e) {
      setMotorErro(e.message || 'Erro ao preparar a conferencia.')
    } finally {
      setMotorCarregando(false)
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

  // ── TELA DETALHE ──────────────────────────────────────────────
  if (detalhe) {
    const cl = clientes[detalhe.cliente_id]
    return (
      <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text, maxWidth: 800, margin: '0 auto' }}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="no-print" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
            Motor do Simples / Apuracao / <strong style={{ color: S.text }}>Detalhe</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: S.navy, flex: 1 }}>Apuracao — {detalhe.competencia}</div>
            <button onClick={() => abrirEditar(detalhe)}
              style={{ padding: '7px 14px', background: S.blue, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Editar
            </button>
            <button onClick={() => window.print()}
              style={{ padding: '7px 14px', background: S.navy, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Imprimir
            </button>
            <button onClick={() => setDetalhe(null)}
              style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: S.muted }}>
              Voltar
            </button>
          </div>
        </div>
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ background: S.navy, padding: '18px 24px' }}>
            <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>e-FISCALTRIBE — MOTOR DO SIMPLES NACIONAL</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: S.white }}>Relatorio de Apuracao — {detalhe.competencia}</div>
            <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>{cl?.razao_social} · {cl?.cnpj} · {cl?.regime}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, borderBottom: `1px solid ${S.border}` }}>
            {[
              { label: 'Receita Apurada',      value: fmtR(detalhe.receita_apurada),   color: S.navy },
              { label: 'Imposto Apurado (DAS)', value: fmtR(detalhe.imposto_apurado),   color: S.red  },
              { label: 'Aliquota Efetiva',      value: fmtPct(detalhe.aliquota_efetiva), color: S.blue },
            ].map((k, i) => (
              <div key={i} style={{ padding: '16px 24px', borderRight: i < 2 ? `1px solid ${S.border}` : 'none' }}>
                <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.navy, marginBottom: 12 }}>Informacoes da Declaracao</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  { label: 'Competencia',        value: detalhe.competencia },
                  { label: 'Tipo de Declaracao', value: detalhe.tipo_declaracao },
                  { label: 'Status da Apuracao', value: <Badge label={detalhe.status_apuracao || 'Aguardando'} tipo={statusTipo(detalhe.status_apuracao)} /> },
                  { label: 'Status da Declaracao', value: <Badge label={detalhe.status_declaracao || 'Aguardando'} tipo={statusTipo(detalhe.status_declaracao)} /> },
                  { label: 'Data de Transmissao', value: detalhe.data_transmissao || '—' },
                  { label: 'Transmitido por',     value: detalhe.transmitido_por || '—' },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: '10px 0', color: S.muted, fontWeight: 600, width: '40%' }}>{r.label}</td>
                    <td style={{ padding: '10px 0', color: S.text }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${S.border}`, background: S.bg, fontSize: 11, color: S.muted, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>e-FiscalTribe® — Motor de Inteligencia Tributaria</span>
            <span>Gerado em {new Date().toLocaleDateString('pt-BR')} as {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── TELA LISTA ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }}>
      <style>{'/* retrofit-tabela-apuracao */ .apuracao-table th,.apuracao-table td{border-right:1px solid #E7EDF4;} .apuracao-table th:last-child,.apuracao-table td:last-child{border-right:none;} .apuracao-table tbody td,.apuracao-table tbody td *{font-weight:400!important;}'}</style>

      {/* HEADER RETROFIT */}
      <div
        style={{
          background: S.white,
          border: '1px solid ' + S.border,
          borderRadius: 12,
          padding: '18px 20px',
          marginBottom: 14,
          boxShadow: '0 4px 18px rgba(15,23,42,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <div style={{ fontSize: 11, color: S.blue, fontWeight: 600, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 5 }}>
              Motor do Simples
            </div>

            <div style={{ fontSize: 22, fontWeight: 600, color: S.navy, lineHeight: 1.2 }}>
              Apuracao do Simples Nacional
            </div>

            <div style={{ fontSize: 12, color: S.muted, marginTop: 6, maxWidth: 720, lineHeight: 1.5 }}>
              Conferencia integrada de PGDAS-D, documentos fiscais, classificacao tributaria e apuracao do Simples Nacional.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {temDados && (
              <button
                onClick={excluirTodos}
                disabled={excluindo || filtradas.length === 0}
                style={{
                  padding: '8px 13px',
                  background: S.white,
                  border: '1px solid #FCA5A5',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: S.red,
                }}
              >
                {excluindo ? 'Excluindo...' : 'Excluir filtradas'}
              </button>
            )}

            <button
              onClick={() => {
                setMotorClienteId('')
                setMotorCompetencia('')
                setMotorErro('')
                setModalMotor(true)
              }}
              style={{
                padding: '8px 14px',
                background: S.green,
                color: S.white,
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(22,163,74,0.18)',
              }}
            >
              Conferir pelo Motor
            </button>

            <button
              onClick={() => { setForm(VAZIO); setModalNova(true) }}
              style={{
                padding: '8px 14px',
                background: S.blue,
                color: S.white,
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(37,99,235,0.18)',
              }}
            >
              + Nova Apuracao
            </button>
          </div>
        </div>
      </div>

      {/* KPIS EXECUTIVOS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          {
            label: 'Apuracoes cadastradas',
            valor: apuracoes.length,
            detalhe: 'Total registrado no sistema',
            cor: S.navy,
          },
          {
            label: 'Aguardando',
            valor: apuracoes.filter(a => a.status_apuracao === 'Aguardando').length,
            detalhe: 'Competencias pendentes',
            cor: S.orange,
          },
          {
            label: 'Transmitidas',
            valor: apuracoes.filter(a => a.status_apuracao === 'Transmitida').length,
            detalhe: 'Apuracoes concluidas',
            cor: S.green,
          },
          {
            label: 'Em atraso',
            valor: apuracoes.filter(a => a.status_apuracao === 'Em atraso').length,
            detalhe: 'Requerem atencao',
            cor: S.red,
          },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{
              background: S.white,
              border: '1px solid ' + S.border,
              borderRadius: 10,
              padding: '14px 16px',
              boxShadow: '0 3px 12px rgba(15,23,42,0.045)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: '100%',
                background: kpi.cor,
              }}
            />

            <div style={{ fontSize: 10, color: S.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {kpi.label}
            </div>

            <div style={{ fontSize: 25, fontWeight: 600, color: kpi.cor, marginTop: 5, lineHeight: 1 }}>
              {kpi.valor}
            </div>

            <div style={{ fontSize: 10, color: S.muted, marginTop: 6 }}>
              {kpi.detalhe}
            </div>
          </div>
        ))}
      </div>
      {motorAnalise && (
        <div style={{ background: S.white, border: '1px solid ' + S.border, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: S.muted, fontWeight: 700 }}>Resultado da conferencia do motor</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: S.navy, marginTop: 2 }}>
                {motorAnalise.cliente?.razao_social} — {motorAnalise.competencia}
              </div>
              <div style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>
                PGDAS: {motorAnalise.pgdas?.num_declaracao || motorAnalise.pgdas?.id}
                {' · '}Lote XML: {motorAnalise.diagnosticoMono?.nome_diagnostico || motorAnalise.diagnosticoMono?.id}
              </div>
            </div>

            <button
              onClick={() => setMotorAnalise(null)}
              style={{ border: '1px solid ' + S.border, background: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: S.muted }}
            >
              Fechar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            {[
              {
                label: 'Receita PGDAS',
                valor: fmtR(motorAnalise.pgdas?.receita_bruta_total),
                cor: S.navy,
              },
              {
                label: 'Receita documental',
                valor: fmtR(
                  (motorAnalise.base?.parcelas || []).reduce(
                    (s, parcela) => s + Number(parcela.valor || 0),
                    0
                  )
                ),
                cor: S.blue,
              },
              {
                label: 'Pendencias',
                valor: String(motorAnalise.base?.pendencias?.length || 0),
                cor: motorAnalise.base?.pendencias?.length ? S.orange : S.green,
              },
              {
                label: 'Status da conferencia',
                valor:
                  motorAnalise.conferencia?.status ||
                  (motorAnalise.base?.prontaParaConferencia
                    ? 'base_pronta'
                    : 'base_pendente'),
                cor:
                  motorAnalise.conferencia?.prontoParaCalculo
                    ? S.green
                    : S.orange,
              },
            ].map((k, i) => (
              <div key={i} style={{ border: '1px solid ' + S.border, borderRadius: 8, padding: '12px 14px', background: S.bg }}>
                <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 15, color: k.cor, fontWeight: 600, wordBreak: 'break-word' }}>{k.valor}</div>
              </div>
            ))}
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

          {motorAnalise.conferencia?.prontoParaCalculo && (
            <div style={{ marginTop: 14, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#166534', fontSize: 12, fontWeight: 700 }}>
              Conferencia concluida. A movimentacao esta liberada pelo motor para o calculo tributario.
            </div>
          )}
        </div>
      )}
      {/* TABELA */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>

        {/* BUSCA E FILTROS */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar empresa ou competencia..."
            style={{ padding: '6px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 240 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: S.muted }}>Status:</span>
            {[
              { id: 'todos',      label: 'Todos'      },
              { id: 'aguardando', label: 'Aguardando' },
              { id: 'transmitida',label: 'Transmitida'},
              { id: 'em_atraso',  label: 'Em atraso'  },
            ].map(f => (
              <button key={f.id} onClick={() => { setFiltroStatus(f.id); setPagina(1) }}
                style={{ padding: '4px 10px', background: filtroStatus === f.id ? S.navy : 'none', color: filtroStatus === f.id ? S.white : S.muted, border: `1px solid ${filtroStatus === f.id ? S.navy : S.border}`, borderRadius: 99, fontSize: 11, fontWeight: filtroStatus === f.id ? 700 : 400, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div style={{ overflowX: 'auto' }}>
          <table className='apuracao-table' style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.thBg }}>
                {['Empresa', 'Competencia', 'Receita Apurada', 'Imposto Apurado', 'Aliquota', 'Tipo', 'Status Apuracao', 'Status Declaracao', 'Transmissao', 'Acoes'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(null).map((_, i) => <SkeletonRow key={i} cols={10} />)
              ) : (
                linhasExibir.map((a, i) => {
                  const isGhost = a.ghost
                  const cl = !isGhost ? clientes[a.cliente_id] : null
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${S.border}`, background: isGhost ? S.ghost : i % 2 === 0 ? S.white : '#FAFAFA' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: isGhost ? S.ghostText : S.navy, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isGhost ? 'Nome da Empresa' : (cl?.razao_social || '—')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: isGhost ? S.ghostText : S.text }}>{a.competencia || '—'}</td>
                      <td style={{ padding: '8px 12px', color: isGhost ? S.ghostText : S.text }}>{isGhost ? 'R$ —' : fmtR(a.receita_apurada)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: isGhost ? S.ghostText : S.navy }}>{isGhost ? 'R$ —' : fmtR(a.imposto_apurado)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {isGhost
                          ? <span style={{ background: S.ghost, color: S.ghostText, border: `1px solid ${S.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>—%</span>
                          : <Badge label={fmtPct(a.aliquota_efetiva)} tipo="original" />
                        }
                      </td>
                      <td style={{ padding: '8px 12px', color: isGhost ? S.ghostText : S.muted }}>{a.tipo_declaracao || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {isGhost
                          ? <span style={{ background: S.ghost, color: S.ghostText, border: `1px solid ${S.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Aguardando</span>
                          : <Badge label={a.status_apuracao || 'Aguardando'} tipo={statusTipo(a.status_apuracao)} />
                        }
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {isGhost
                          ? <span style={{ background: S.ghost, color: S.ghostText, border: `1px solid ${S.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Aguardando</span>
                          : <Badge label={a.status_declaracao || 'Aguardando'} tipo={statusTipo(a.status_declaracao)} />
                        }
                      </td>
                      <td style={{ padding: '8px 12px', color: isGhost ? S.ghostText : S.muted, fontSize: 11 }}>{isGhost ? '—' : (a.data_transmissao || '—')}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {!isGhost && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setDetalhe(a)} title="Ver detalhe"
                              style={{ padding: '3px 8px', background: '#eff6ff', color: S.blue, border: `1px solid #bfdbfe`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              Ver
                            </button>
                            <button onClick={() => abrirEditar(a)} title="Editar"
                              style={{ padding: '3px 8px', background: '#f0fdf4', color: S.green, border: `1px solid #86efac`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              Editar
                            </button>
                            <button onClick={() => excluir(a.id)} title="Excluir"
                              style={{ padding: '3px 8px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              X
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RODAPE GHOST */}
        {!loading && !temDados && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${S.border}`, textAlign: 'center', fontSize: 12, color: S.ghostText }}>
            Clique em "+ Nova Apuracao" para comecar
          </div>
        )}

        {/* PAGINACAO */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted, flexWrap: 'wrap', gap: 8 }}>
          <span>
            {loading ? 'Carregando...' : temDados ? `${filtradas.length} apuracao(oes) — Pagina ${pagina} de ${totalPaginas}` : 'Nenhuma apuracao cadastrada'}
          </span>
          {temDados && !loading && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[['«', () => setPagina(1), pagina === 1],
                ['<', () => setPagina(p => Math.max(1, p - 1)), pagina === 1],
                ['>', () => setPagina(p => Math.min(totalPaginas, p + 1)), pagina === totalPaginas],
                ['»', () => setPagina(totalPaginas), pagina === totalPaginas],
              ].map(([l, fn, dis], i) => (
                <button key={i} onClick={fn} disabled={dis}
                  style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: dis ? 'not-allowed' : 'pointer', color: dis ? S.ghostText : S.text }}>
                  {l}
                </button>
              ))}
              <select value={porPagina} onChange={e => { const n = Number(e.target.value); setPorPagina(n); setPagina(1) }}
                style={{ marginLeft: 8, padding: '3px 8px', border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por pagina</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

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