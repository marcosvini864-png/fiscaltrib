import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import EspelhoRetificacaoPGDAS from './EspelhoRetificacaoPGDAS'

const S = {
  navy: '#0B1F4D',
  blue: '#2563EB',
  green: '#16a34a',
  red: '#dc2626',
  orange: '#ea580c',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1E293B',
  thBg: '#4B5563',
  thText: '#FFFFFF',
  ghost: '#F8FAFC',
}

const money = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const dateTime = value => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return String(value)
  }
}

const parseJson = value => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

const digits = value => String(value || '').replace(/\D/g, '')

const first = (...values) =>
  values.find(
    value =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
  )

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: {
      background: '#F8FAFC',
      color: '#475569',
      border: '1px solid #E2E8F0',
    },
    success: {
      background: '#F0FDF4',
      color: '#166534',
      border: '1px solid #BBF7D0',
    },
    warning: {
      background: '#FFF7ED',
      color: '#9A3412',
      border: '1px solid #FED7AA',
    },
    info: {
      background: '#EFF6FF',
      color: '#1D4ED8',
      border: '1px solid #BFDBFE',
    },
  }

  return (
    <span
      style={{
        ...(tones[tone] || tones.neutral),
        borderRadius: 99,
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function EmptyState({ children }) {
  return (
    <div
      style={{
        padding: '26px 18px',
        textAlign: 'center',
        color: S.muted,
        fontSize: 12,
        border: `1px dashed ${S.border}`,
        borderRadius: 9,
        background: '#FAFCFF',
      }}
    >
      {children}
    </div>
  )
}

function ActionButton({ children, onClick, primary = false, danger = false }) {
  const background = danger
    ? '#FFFFFF'
    : primary
      ? S.navy
      : '#FFFFFF'

  const color = danger
    ? S.red
    : primary
      ? '#FFFFFF'
      : S.text

  const border = danger
    ? '1px solid #FECACA'
    : primary
      ? `1px solid ${S.navy}`
      : `1px solid ${S.border}`

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 30,
        padding: '0 10px',
        border,
        background,
        color,
        borderRadius: 7,
        fontSize: 10.5,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function SectionTitle({ kicker, title, right }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: 0.8,
            color: S.blue,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {kicker}
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 750,
            color: S.navy,
          }}
        >
          {title}
        </div>
      </div>

      {right || null}
    </div>
  )
}

function Kpi({ label, value, helper }) {
  return (
    <div
      style={{
        background: S.white,
        border: `1px solid ${S.border}`,
        borderRadius: 11,
        padding: '9px 11px',
        minHeight: 68,
        boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          color: S.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 750,
          color: S.navy,
          marginTop: 5,
        }}
      >
        {value}
      </div>

      {helper ? (
        <div style={{ fontSize: 9.5, color: S.muted, marginTop: 2 }}>
          {helper}
        </div>
      ) : null}
    </div>
  )
}

function Campo({ label, value }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        border: `1px solid ${S.border}`,
        borderRadius: 8,
        background: '#FFFFFF',
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: S.muted,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.45,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: S.text,
          fontWeight: 650,
          marginTop: 3,
          overflowWrap: 'anywhere',
        }}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}

export default function ProntuarioEmpresa({
  cliente,
  onVoltar,
  onEditarCliente,
}) {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState('visao')
  const [apuracoes, setApuracoes] = useState([])
  const [espelhos, setEspelhos] = useState([])
  const [pgdas, setPgdas] = useState([])
  const [monofasicos, setMonofasicos] = useState([])
  const [itensCount, setItensCount] = useState(0)

  const [apuracaoAberta, setApuracaoAberta] = useState(null)
  const [memoriaAberta, setMemoriaAberta] = useState(null)
  const [espelhoAberto, setEspelhoAberto] = useState(null)
  const [historicoEspelhoAberto, setHistoricoEspelhoAberto] = useState(null)
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(null)
  const [registroAberto, setRegistroAberto] = useState(null)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id])

  async function carregar() {
    if (!cliente?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setErro('')

    try {
      const [
        apsResp,
        espResp,
        pgdasResp,
        monoResp,
        itensResp,
      ] = await Promise.all([
        supabase
          .from('apuracoes_simples')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('espelhos_retificacao_pgdas')
          .select('*')
          .eq('cliente_id', String(cliente.id))
          .order('created_at', { ascending: false }),

        supabase
          .from('diagnosticos_pgdas')
          .select('*')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('diagnosticos_monofasicos')
          .select('*')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('itens_fiscais')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', cliente.id),
      ])

      const respostas = [
        ['Apurações', apsResp],
        ['Espelhos', espResp],
        ['PGDAS-D', pgdasResp],
        ['Monofásicos', monoResp],
      ]

      for (const [nome, resp] of respostas) {
        if (resp?.error) {
          throw new Error(`${nome}: ${resp.error.message}`)
        }
      }

      const cnpjCliente = digits(cliente?.cnpj)
      const idCliente = String(cliente?.id || '')

      const apuracoesCliente = (apsResp.data || []).filter(item => {
        const memoriaItem = parseJson(item?.memoria_calculo)
        const idMemoria = String(memoriaItem?.cliente?.id || '')
        const cnpjMemoria = digits(memoriaItem?.cliente?.cnpj)
        const idRegistro = String(item?.cliente_id || '')

        return (
          (idCliente && idRegistro === idCliente) ||
          (idCliente && idMemoria === idCliente) ||
          (cnpjCliente && cnpjMemoria === cnpjCliente)
        )
      })

      setApuracoes(apuracoesCliente)
      setEspelhos(espResp.data || [])
      setPgdas(pgdasResp.data || [])
      setMonofasicos(monoResp.data || [])
      setItensCount(Number(itensResp?.count || 0))
    } catch (e) {
      setErro(e.message || 'Erro ao carregar o prontuário.')
    } finally {
      setLoading(false)
    }
  }

  const gruposEspelhos = useMemo(() => {
    const mapa = new Map()

    for (const item of espelhos) {
      const competencia = String(item?.competencia || 'Sem competência')
      const grupo = mapa.get(competencia) || {
        competencia,
        versoes: [],
      }

      grupo.versoes.push(item)
      mapa.set(competencia, grupo)
    }

    return [...mapa.values()]
      .map(grupo => {
        const versoes = [...grupo.versoes].sort((a, b) => {
          const dataB = new Date(b?.created_at || 0).getTime()
          const dataA = new Date(a?.created_at || 0).getTime()
          if (dataB !== dataA) return dataB - dataA
          return Number(b?.versao || 0) - Number(a?.versao || 0)
        })

        return {
          ...grupo,
          versoes,
          ultima: versoes[0] || null,
        }
      })
      .sort(
        (a, b) =>
          new Date(b?.ultima?.created_at || 0) -
          new Date(a?.ultima?.created_at || 0)
      )
  }, [espelhos])

  const apuracoesPreservadas = useMemo(() => {
    return gruposEspelhos
      .filter(grupo => {
        const item = grupo?.ultima
        if (!item) return false

        const existeApuracaoAtiva = apuracoes.some(
          ap =>
            String(ap?.id || '') ===
            String(item?.apuracao_id || '')
        )

        if (existeApuracaoAtiva) return false

        const snapshot = parseJson(item?.snapshot)
        return Boolean(
          snapshot?.memoria_calculo ||
          snapshot?.dados_exibidos
        )
      })
      .map(grupo => {
        const item = grupo.ultima
        const snapshot = parseJson(item?.snapshot)
        const memoria = parseJson(snapshot?.memoria_calculo)
        const dados = parseJson(snapshot?.dados_exibidos)

        return {
          id: `snapshot-${item?.apuracao_id || grupo.competencia}`,
          apuracao_id_original: item?.apuracao_id || null,
          cliente_id:
            item?.cliente_id ||
            memoria?.cliente?.id ||
            cliente?.id ||
            null,
          competencia:
            item?.competencia ||
            memoria?.competencia ||
            dados?.competencia ||
            grupo.competencia,
          memoria_calculo: memoria,
          receita_apurada: Number(
            first(
              dados?.receitaConsiderada,
              dados?.receitaOriginal,
              memoria?.calculo_tributario?.resultado?.receita
                ?.consideradaNaApuracao,
              0
            ) || 0
          ),
          imposto_apurado: Number(
            first(
              dados?.dasConferido,
              memoria?.calculo_tributario?.resultado
                ?.valoresConferidos?.das,
              0
            ) || 0
          ),
          aliquota_efetiva: Number(
            first(
              dados?.aliquotaEfetiva,
              memoria?.calculo_tributario?.dasConferido
                ?.aliquotaEfetiva,
              0
            ) || 0
          ),
          credito_total: Number(
            first(
              dados?.creditoTotal,
              memoria?.calculo_tributario?.resultado?.credito
                ?.total,
              memoria?.calculo_tributario?.resultado
                ?.creditoTotal,
              0
            ) || 0
          ),
          status_apuracao: 'Snapshot preservado',
          status: 'Snapshot preservado',
          created_at:
            item?.created_at ||
            snapshot?.gerado_em ||
            memoria?.gerado_em ||
            null,
          preservada_em_snapshot: true,
          grupo_espelho: grupo,
        }
      })
  }, [gruposEspelhos, apuracoes, cliente])

  const apuracoesConsultaveis = useMemo(
    () => [...apuracoes, ...apuracoesPreservadas],
    [apuracoes, apuracoesPreservadas]
  )

  const creditoDaApuracao = apuracao => {
    const memoria = parseJson(apuracao?.memoria_calculo)
    const calculo =
      memoria?.calculo_tributario ||
      memoria?.calculoTributario ||
      {}
    const resultado = calculo?.resultado || {}

    const pis = Number(
      first(
        resultado?.credito?.pis,
        resultado?.creditoPis,
        resultado?.credito_pis,
        apuracao?.credito_pis,
        0
      ) || 0
    )

    const cofins = Number(
      first(
        resultado?.credito?.cofins,
        resultado?.creditoCofins,
        resultado?.credito_cofins,
        apuracao?.credito_cofins,
        0
      ) || 0
    )

    const total = Number(
      first(
        resultado?.credito?.total,
        resultado?.creditoTotal,
        resultado?.credito_total,
        resultado?.creditos?.total,
        calculo?.creditoTotal,
        memoria?.credito_total,
        apuracao?.credito_total,
        pis + cofins
      ) || 0
    )

    return Number.isFinite(total) ? total : 0
  }

  const creditoTotal = useMemo(() => {
    return apuracoesConsultaveis.reduce(
      (soma, apuracao) =>
        soma + creditoDaApuracao(apuracao),
      0
    )
  }, [apuracoesConsultaveis])

  const timeline = useMemo(() => {
    const eventos = []

    apuracoesConsultaveis.forEach(item => {
      eventos.push({
        tipo: 'Apuração',
        data: item.created_at,
        competencia: item.competencia,
        titulo: `Apuração ${item.competencia || ''}`.trim(),
        detalhe:
          item.status_apuracao ||
          item.status ||
          'Registro de apuração salvo',
        tone: 'success',
      })
    })

    gruposEspelhos.forEach(grupo => {
      const item = grupo.ultima
      eventos.push({
        tipo: 'Espelho',
        data: item?.created_at,
        competencia: grupo.competencia,
        titulo: `Espelho ${grupo.competencia}`,
        detalhe: `${grupo.versoes.length} versão(ões) • última: v${item?.versao || 1} • ${item?.status || 'Rascunho'}`,
        tone:
          item?.status === 'Transmitida'
            ? 'success'
            : 'warning',
      })
    })

    const pgdasPorCompetencia = new Map()
    pgdas.forEach(item => {
      const competencia = String(item.competencia || item.periodo_apuracao || 'Sem competência')
      if (!pgdasPorCompetencia.has(competencia)) {
        pgdasPorCompetencia.set(competencia, item)
      }
    })

    ;[...pgdasPorCompetencia.values()].forEach(item => {
      eventos.push({
        tipo: 'PGDAS-D',
        data: item.created_at,
        competencia:
          item.competencia ||
          item.periodo_apuracao,
        titulo: `PGDAS-D ${
          item.competencia ||
          item.periodo_apuracao ||
          ''
        }`.trim(),
        detalhe:
          item.tipo_declaracao ||
          'Declaração salva',
        tone: 'info',
      })
    })

    monofasicos.forEach(item => {
      eventos.push({
        tipo: 'Monofásicos',
        data: item.created_at,
        competencia: item.competencia,
        titulo:
          item.nome_diagnostico ||
          `Diagnóstico monofásico ${item.competencia || ''}`.trim(),
        detalhe: 'Diagnóstico salvo',
        tone: 'neutral',
      })
    })

    return eventos
      .filter(item => item.data)
      .sort(
        (a, b) =>
          new Date(b.data || 0) - new Date(a.data || 0)
      )
      .slice(0, 30)
  }, [apuracoesConsultaveis, gruposEspelhos, pgdas, monofasicos])

  const tabs = [
    ['visao', 'Visão geral'],
    ['simples', 'Motor do Simples'],
    ['recuperacoes', 'Recuperações'],
    ['divida', 'Dívida Ativa'],
    ['diagnosticos', 'Diagnósticos'],
    ['documentos', 'Documentos'],
    ['historico', 'Histórico'],
  ]

  function abrirMemoria(apuracao) {
    setMemoriaAberta(parseJson(apuracao.memoria_calculo))
  }

  function abrirEspelho(grupo, versao = null) {
    const item = versao || grupo?.ultima
    if (!item) return

    const apuracaoVinculada =
      apuracoes.find(
        ap =>
          String(ap.id) ===
          String(item.apuracao_id)
      ) || {
        id: item.apuracao_id,
        cliente_id: item.cliente_id,
        competencia: item.competencia,
        memoria_calculo:
          parseJson(item?.snapshot)?.memoria_calculo || {},
      }

    setEspelhoAberto({
      apuracao: apuracaoVinculada,
      versaoInicial: item,
      versoes: grupo?.versoes || [item],
    })
    setHistoricoEspelhoAberto(null)
  }

  function imprimir() {
    window.print()
  }

  function exportarPdf() {
    const tituloAnterior = document.title
    document.title = `FiscalTribe - Prontuario - ${
      cliente?.razao_social || 'Empresa'
    }`

    window.print()

    setTimeout(() => {
      document.title = tituloAnterior
    }, 500)
  }

  if (espelhoAberto) {
    return (
      <EspelhoRetificacaoPGDAS
        apuracao={espelhoAberto.apuracao}
        versaoInicial={espelhoAberto.versaoInicial}
        versoesExternas={espelhoAberto.versoes}
        modoConsulta
        onVoltar={() => setEspelhoAberto(null)}
      />
    )
  }

  if (!cliente) {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState>
          Nenhuma empresa foi selecionada para abrir o prontuário.
        </EmptyState>
      </div>
    )
  }

  return (
    <div
      className="prontuario-print-root"
      style={{
        background: S.bg,
        minHeight: '100%',
        padding: 12,
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body * {
            visibility: hidden !important;
          }

          .prontuario-print-root,
          .prontuario-print-root * {
            visibility: visible !important;
          }

          .prontuario-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            background: #FFFFFF !important;
          }

          .prontuario-no-print {
            display: none !important;
          }

          .prontuario-card {
            break-inside: avoid-page;
            page-break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>

      <header
        className="prontuario-card"
        style={{
          background: S.white,
          border: `1px solid ${S.border}`,
          borderRadius: 11,
          padding: '12px 14px',
          boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: S.blue,
                fontSize: 19,
              }}
            >
              🗂️
            </div>

            <div>
              <div
                style={{
                  fontSize: 10,
                  color: S.blue,
                  fontWeight: 800,
                  letterSpacing: 0.9,
                  textTransform: 'uppercase',
                }}
              >
                FiscalTribe • Prontuário da Empresa
              </div>

              <h1
                style={{
                  margin: '3px 0 0',
                  fontSize: 20,
                  lineHeight: 1.15,
                  fontWeight: 750,
                  color: S.navy,
                }}
              >
                {cliente.razao_social ||
                  cliente.nome_fantasia ||
                  'Empresa'}
              </h1>

              <div
                style={{
                  color: S.muted,
                  fontSize: 10.5,
                  marginTop: 5,
                }}
              >
                CNPJ: {cliente.cnpj || '—'}
                {'  •  '}
                Regime: {cliente.regime || '—'}
              </div>
            </div>
          </div>

          <div
            className="prontuario-no-print"
            style={{
              display: 'flex',
              gap: 7,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <ActionButton onClick={carregar}>
              Atualizar
            </ActionButton>

            {typeof onEditarCliente === 'function' ? (
              <ActionButton
                onClick={() =>
                  onEditarCliente(cliente)
                }
              >
                Editar cadastro
              </ActionButton>
            ) : null}

            <ActionButton onClick={imprimir}>
              Imprimir
            </ActionButton>

            <ActionButton
              primary
              onClick={exportarPdf}
            >
              Exportar PDF
            </ActionButton>

            <ActionButton onClick={onVoltar}>
              ← Voltar
            </ActionButton>
          </div>
        </div>
      </header>

      {erro ? (
        <div
          style={{
            padding: '9px 11px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: S.red,
            fontSize: 11,
            marginBottom: 10,
          }}
        >
          {erro}
        </div>
      ) : null}

      <div
        className="prontuario-no-print"
        style={{
          background: S.white,
          border: `1px solid ${S.border}`,
          borderRadius: 10,
          padding: 5,
          marginBottom: 10,
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
        }}
      >
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setAba(key)}
            style={{
              border:
                aba === key
                  ? `1px solid ${S.navy}`
                  : '1px solid transparent',
              background:
                aba === key
                  ? S.navy
                  : 'transparent',
              color:
                aba === key
                  ? '#FFFFFF'
                  : S.text,
              borderRadius: 7,
              minHeight: 31,
              padding: '0 11px',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            padding: 28,
            textAlign: 'center',
            color: S.muted,
            fontSize: 12,
          }}
        >
          Carregando prontuário...
        </div>
      ) : null}

      {!loading && aba === 'visao' ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Kpi
              label="Apurações consultáveis"
              value={apuracoesConsultaveis.length}
              helper={`${apuracoes.length} ativa(s) • ${apuracoesPreservadas.length} preservada(s) em snapshot`}
            />
            <Kpi
              label="Espelhos"
              value={gruposEspelhos.length}
              helper={`${espelhos.length} versão(ões) preservada(s)`}
            />
            <Kpi
              label="PGDAS-D salvos"
              value={pgdas.length}
            />
            <Kpi
              label="Itens fiscais"
              value={itensCount}
            />
            <Kpi
              label="Crédito identificado"
              value={money(creditoTotal)}
            />
          </div>

          <section
            className="prontuario-card"
            style={styles.card}
          >
            <SectionTitle
              kicker="RESUMO"
              title="Atividade recente da empresa"
            />

            {timeline.length === 0 ? (
              <EmptyState>
                Ainda não existem registros operacionais para esta empresa.
              </EmptyState>
            ) : (
              <div style={{ display: 'grid', gap: 7 }}>
                {timeline.slice(0, 8).map((item, index) => (
                  <div
                    key={`${item.tipo}-${item.data}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      padding: '8px 9px',
                      border: `1px solid ${S.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: S.muted,
                      }}
                    >
                      {dateTime(item.data)}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: S.text,
                        }}
                      >
                        {item.titulo}
                      </div>

                      <div
                        style={{
                          fontSize: 9.5,
                          color: S.muted,
                          marginTop: 2,
                        }}
                      >
                        {item.detalhe}
                      </div>
                    </div>

                    <Badge tone={item.tone}>
                      {item.tipo}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {!loading && aba === 'simples' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <section
            className="prontuario-card"
            style={styles.card}
          >
            <SectionTitle
              kicker="MOTOR DO SIMPLES"
              title="Apurações, memória e resultado"
              right={
                <Badge tone="info">
                  {apuracoesConsultaveis.length} registro(s)
                </Badge>
              }
            />

            {apuracoesConsultaveis.length === 0 ? (
              <EmptyState>
                Nenhuma apuração consultável para esta empresa.
              </EmptyState>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Competência</th>
                      <th style={styles.th}>Receita apurada</th>
                      <th style={styles.th}>DAS conferido</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apuracoesConsultaveis.map(item => (
                      <tr key={item.id}>
                        <td style={styles.tdStrong}>
                          {item.competencia || '—'}
                        </td>
                        <td style={styles.tdRight}>
                          {money(item.receita_apurada)}
                        </td>
                        <td style={styles.tdRight}>
                          {money(item.imposto_apurado)}
                        </td>
                        <td style={styles.td}>
                          <Badge
                            tone={
                              String(
                                item.status_apuracao ||
                                ''
                              ).toLowerCase().includes(
                                'concl'
                              )
                                ? 'success'
                                : 'neutral'
                            }
                          >
                            {item.status_apuracao ||
                              item.status ||
                              'Salva'}
                          </Badge>
                        </td>
                        <td style={styles.td}>
                          {dateTime(item.created_at)}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <ActionButton
                              primary
                              onClick={() =>
                                setApuracaoAberta(item)
                              }
                            >
                              Abrir
                            </ActionButton>

                            <ActionButton
                              onClick={() =>
                                abrirMemoria(item)
                              }
                            >
                              Memória
                            </ActionButton>

                            <ActionButton
                              onClick={imprimir}
                            >
                              Imprimir
                            </ActionButton>

                            <ActionButton
                              onClick={exportarPdf}
                            >
                              PDF
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="prontuario-card"
            style={styles.card}
          >
            <SectionTitle
              kicker="RETIFICAÇÃO"
              title="Espelhos salvos"
              right={
                <Badge tone="info">
                  {gruposEspelhos.length} competência(s)
                </Badge>
              }
            />

            {gruposEspelhos.length === 0 ? (
              <EmptyState>
                Nenhum Espelho de Retificação salvo para esta empresa.
              </EmptyState>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Competência</th>
                      <th style={styles.th}>Última versão</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Responsável</th>
                      <th style={styles.th}>Protocolo</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruposEspelhos.map(grupo => {
                      const item = grupo.ultima
                      return (
                      <tr key={grupo.competencia}>
                        <td style={styles.tdStrong}>
                          {item.competencia || '—'}
                        </td>
                        <td style={styles.td}>
                          v{item?.versao || 1} • {grupo.versoes.length} versão(ões)
                        </td>
                        <td style={styles.td}>
                          <Badge
                            tone={
                              item?.status === 'Transmitida'
                                ? 'success'
                                : 'warning'
                            }
                          >
                            {item?.status || 'Rascunho'}
                          </Badge>
                        </td>
                        <td style={styles.td}>
                          {item?.responsavel || '—'}
                        </td>
                        <td style={styles.td}>
                          {item?.protocolo || '—'}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <ActionButton
                              primary
                              onClick={() =>
                                abrirEspelho(grupo)
                              }
                            >
                              Abrir
                            </ActionButton>

                            <ActionButton
                              onClick={() =>
                                setHistoricoEspelhoAberto(grupo)
                              }
                            >
                              Histórico
                            </ActionButton>

                            <ActionButton
                              onClick={imprimir}
                            >
                              Imprimir
                            </ActionButton>

                            <ActionButton
                              onClick={exportarPdf}
                            >
                              PDF
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="prontuario-card"
            style={styles.card}
          >
            <SectionTitle
              kicker="DOCUMENTOS DE ORIGEM"
              title="PGDAS-D"
              right={
                <Badge tone="neutral">
                  {pgdas.length} registro(s)
                </Badge>
              }
            />

            {pgdas.length === 0 ? (
              <EmptyState>
                Nenhum PGDAS-D salvo para esta empresa.
              </EmptyState>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Competência</th>
                      <th style={styles.th}>Declaração</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Receita</th>
                      <th style={styles.th}>DAS</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pgdas.map(item => (
                      <tr key={item.id}>
                        <td style={styles.tdStrong}>
                          {item.competencia ||
                            item.periodo_apuracao ||
                            '—'}
                        </td>
                        <td style={styles.td}>
                          {item.num_declaracao || '—'}
                        </td>
                        <td style={styles.td}>
                          {item.tipo_declaracao || '—'}
                        </td>
                        <td style={styles.tdRight}>
                          {money(
                            first(
                              item.receita_bruta_total,
                              item.rpa,
                              0
                            )
                          )}
                        </td>
                        <td style={styles.tdRight}>
                          {money(
                            first(
                              item.das_recolhido,
                              item.das_total,
                              0
                            )
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <ActionButton
                              primary
                              onClick={() =>
                                setRegistroAberto({
                                  titulo: 'PGDAS-D',
                                  registro: item,
                                })
                              }
                            >
                              Abrir
                            </ActionButton>
                            <ActionButton
                              onClick={imprimir}
                            >
                              Imprimir
                            </ActionButton>
                            <ActionButton
                              onClick={exportarPdf}
                            >
                              PDF
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {!loading && aba === 'recuperacoes' ? (
        <section
          className="prontuario-card"
          style={styles.card}
        >
          <SectionTitle
            kicker="RECUPERAÇÕES TRIBUTÁRIAS"
            title="Trabalhos e créditos da empresa"
          />

          <EmptyState>
            Estrutura do prontuário pronta. Na próxima integração,
            os módulos de recuperação serão vinculados aqui pelo
            cliente_id, sem duplicar dados.
          </EmptyState>
        </section>
      ) : null}

      {!loading && aba === 'divida' ? (
        <section
          className="prontuario-card"
          style={styles.card}
        >
          <SectionTitle
            kicker="REGULARIZAÇÃO"
            title="Dívida Ativa e negociações"
          />

          <EmptyState>
            Esta área receberá os débitos, transações,
            parcelamentos, regularizações e documentos de Dívida
            Ativa vinculados a esta empresa.
          </EmptyState>
        </section>
      ) : null}

      {!loading && aba === 'diagnosticos' ? (
        <section
          className="prontuario-card"
          style={styles.card}
        >
          <SectionTitle
            kicker="DIAGNÓSTICOS"
            title="Diagnósticos monofásicos e análises salvas"
          />

          {monofasicos.length === 0 ? (
            <EmptyState>
              Nenhum diagnóstico monofásico salvo.
            </EmptyState>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nome</th>
                    <th style={styles.th}>Competência</th>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {monofasicos.map(item => (
                    <tr key={item.id}>
                      <td style={styles.tdStrong}>
                        {item.nome_diagnostico ||
                          'Diagnóstico monofásico'}
                      </td>
                      <td style={styles.td}>
                        {item.competencia || '—'}
                      </td>
                      <td style={styles.td}>
                        {dateTime(item.created_at)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <ActionButton
                            primary
                            onClick={() =>
                              setDiagnosticoAberto(item)
                            }
                          >
                            Abrir
                          </ActionButton>
                          <ActionButton
                            onClick={imprimir}
                          >
                            Imprimir
                          </ActionButton>
                          <ActionButton
                            onClick={exportarPdf}
                          >
                            PDF
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {!loading && aba === 'documentos' ? (
        <section
          className="prontuario-card"
          style={styles.card}
        >
          <SectionTitle
            kicker="ARQUIVO TÉCNICO"
            title="Documentos e registros disponíveis"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 8,
            }}
          >
            <Kpi
              label="PGDAS-D"
              value={pgdas.length}
              helper="Documentos declaratórios"
            />
            <Kpi
              label="Apurações"
              value={apuracoesConsultaveis.length}
              helper={`${apuracoes.length} ativa(s) • ${apuracoesPreservadas.length} preservada(s)`}
            />
            <Kpi
              label="Espelhos"
              value={espelhos.length}
              helper="Versões preservadas"
            />
            <Kpi
              label="Diagnósticos"
              value={monofasicos.length}
              helper="Monofásicos salvos"
            />
          </div>
        </section>
      ) : null}

      {!loading && aba === 'historico' ? (
        <section
          className="prontuario-card"
          style={styles.card}
        >
          <SectionTitle
            kicker="LINHA DO TEMPO"
            title="Histórico da empresa no FiscalTribe"
          />

          {timeline.length === 0 ? (
            <EmptyState>
              Nenhuma atividade registrada ainda.
            </EmptyState>
          ) : (
            <div style={{ display: 'grid', gap: 7 }}>
              {timeline.map((item, index) => (
                <div
                  key={`${item.tipo}-${item.data}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr auto',
                    gap: 10,
                    alignItems: 'center',
                    borderLeft: `3px solid ${S.blue}`,
                    borderTop: `1px solid ${S.border}`,
                    borderRight: `1px solid ${S.border}`,
                    borderBottom: `1px solid ${S.border}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9.5,
                      color: S.muted,
                    }}
                  >
                    {dateTime(item.data)}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: S.text,
                      }}
                    >
                      {item.titulo}
                    </div>
                    <div
                      style={{
                        fontSize: 9.5,
                        color: S.muted,
                        marginTop: 2,
                      }}
                    >
                      {item.detalhe}
                    </div>
                  </div>

                  <Badge tone={item.tone}>
                    {item.tipo}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {historicoEspelhoAberto ? (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modal, maxWidth: 900 }}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalKicker}>HISTÓRICO DO ESPELHO</div>
                <div style={styles.modalTitle}>
                  Competência {historicoEspelhoAberto.competencia}
                </div>
              </div>
              <ActionButton onClick={() => setHistoricoEspelhoAberto(null)}>
                Fechar
              </ActionButton>
            </div>

            <div style={{ display: 'grid', gap: 7 }}>
              {historicoEspelhoAberto.versoes.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr auto',
                    gap: 10,
                    alignItems: 'center',
                    padding: '9px 10px',
                    border: `1px solid ${S.border}`,
                    borderRadius: 8,
                  }}
                >
                  <Badge tone={item.status === 'Transmitida' ? 'success' : 'warning'}>
                    v{item.versao || 1}
                  </Badge>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: S.text }}>
                      {item.status || 'Rascunho'} • {dateTime(item.created_at)}
                    </div>
                    <div style={{ fontSize: 9.5, color: S.muted, marginTop: 2 }}>
                      Responsável: {item.responsavel || '—'} • Protocolo: {item.protocolo || '—'}
                    </div>
                  </div>

                  <ActionButton
                    primary
                    onClick={() => abrirEspelho(historicoEspelhoAberto, item)}
                  >
                    Abrir
                  </ActionButton>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {diagnosticoAberto ? (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modal, maxWidth: 900 }}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalKicker}>DIAGNÓSTICO MONOFÁSICO</div>
                <div style={styles.modalTitle}>
                  {diagnosticoAberto.nome_diagnostico || 'Diagnóstico salvo'}
                </div>
              </div>
              <ActionButton onClick={() => setDiagnosticoAberto(null)}>
                Fechar
              </ActionButton>
            </div>

            {(() => {
              const arquivos = Array.isArray(diagnosticoAberto.arquivos_importados)
                ? diagnosticoAberto.arquivos_importados
                : parseJson(diagnosticoAberto.arquivos_importados)
              const listaArquivos = Array.isArray(arquivos) ? arquivos : []
              return (
                <>
                  <div style={styles.grid4}>
                    <Campo label="Empresa" value={diagnosticoAberto.cliente_nome || cliente.razao_social || '—'} />
                    <Campo label="CNPJ" value={diagnosticoAberto.cliente_cnpj || cliente.cnpj || '—'} />
                    <Campo label="Competência" value={diagnosticoAberto.competencia || '—'} />
                    <Campo label="Regime" value={diagnosticoAberto.regime || cliente.regime || '—'} />
                    <Campo label="Arquivos XML" value={listaArquivos.length || '—'} />
                    <Campo label="Total de itens" value={diagnosticoAberto.total_itens ?? diagnosticoAberto.qtd_itens ?? '—'} />
                    <Campo label="Data da importação" value={dateTime(diagnosticoAberto.data_importacao || diagnosticoAberto.created_at)} />
                    <Campo label="Responsável" value={diagnosticoAberto.importado_por || '—'} />
                  </div>

                  {listaArquivos.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: S.navy, marginBottom: 6 }}>
                        Arquivos importados
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {listaArquivos.slice(0, 30).map((arquivo, index) => (
                          <Badge key={`${arquivo?.nome || arquivo?.name || index}-${index}`} tone="neutral">
                            {arquivo?.nome || arquivo?.name || `Arquivo ${index + 1}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 12 }}>
              <ActionButton onClick={imprimir}>Imprimir</ActionButton>
              <ActionButton primary onClick={exportarPdf}>Exportar PDF</ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {apuracaoAberta ? (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalKicker}>
                  APURAÇÃO DO SIMPLES
                </div>
                <div style={styles.modalTitle}>
                  Competência {apuracaoAberta.competencia || '—'}
                </div>
              </div>
              <ActionButton
                onClick={() =>
                  setApuracaoAberta(null)
                }
              >
                Fechar
              </ActionButton>
            </div>

            <div style={styles.grid4}>
              <Campo
                label="Receita apurada"
                value={money(
                  apuracaoAberta.receita_apurada
                )}
              />
              <Campo
                label="DAS conferido"
                value={money(
                  apuracaoAberta.imposto_apurado
                )}
              />
              <Campo
                label="Alíquota efetiva"
                value={`${
                  Number(
                    apuracaoAberta.aliquota_efetiva || 0
                  ) <= 1
                    ? (
                        Number(
                          apuracaoAberta.aliquota_efetiva ||
                            0
                        ) * 100
                      ).toFixed(4)
                    : Number(
                        apuracaoAberta.aliquota_efetiva ||
                          0
                      ).toFixed(4)
                }%`}
              />
              <Campo
                label="Status"
                value={
                  apuracaoAberta.status_apuracao ||
                  apuracaoAberta.status ||
                  '—'
                }
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 7,
                marginTop: 12,
              }}
            >
              <ActionButton
                onClick={() =>
                  abrirMemoria(apuracaoAberta)
                }
              >
                Abrir memória técnica
              </ActionButton>
              <ActionButton onClick={imprimir}>
                Imprimir
              </ActionButton>
              <ActionButton
                primary
                onClick={exportarPdf}
              >
                Exportar PDF
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {memoriaAberta ? (
        <div style={styles.modalBackdrop}>
          <div
            style={{
              ...styles.modal,
              maxWidth: 980,
            }}
          >
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalKicker}>
                  MEMÓRIA TÉCNICA
                </div>
                <div style={styles.modalTitle}>
                  Memória de cálculo salva
                </div>
              </div>
              <ActionButton
                onClick={() =>
                  setMemoriaAberta(null)
                }
              >
                Fechar
              </ActionButton>
            </div>

            <div style={styles.grid4}>
              <Campo
                label="Empresa"
                value={
                  memoriaAberta?.cliente
                    ?.razao_social || '—'
                }
              />
              <Campo
                label="CNPJ"
                value={
                  memoriaAberta?.cliente?.cnpj || '—'
                }
              />
              <Campo
                label="Competência"
                value={
                  memoriaAberta?.competencia || '—'
                }
              />
              <Campo
                label="Gerada em"
                value={dateTime(
                  memoriaAberta?.gerado_em
                )}
              />
            </div>

            <pre
              style={{
                marginTop: 12,
                background: '#0F172A',
                color: '#E2E8F0',
                borderRadius: 9,
                padding: 12,
                fontSize: 10,
                lineHeight: 1.45,
                maxHeight: '52vh',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {JSON.stringify(
                memoriaAberta,
                null,
                2
              )}
            </pre>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 7,
                marginTop: 10,
              }}
            >
              <ActionButton onClick={imprimir}>
                Imprimir
              </ActionButton>
              <ActionButton
                primary
                onClick={exportarPdf}
              >
                Exportar PDF
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {registroAberto ? (
        <div style={styles.modalBackdrop}>
          <div
            style={{
              ...styles.modal,
              maxWidth: 920,
            }}
          >
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalKicker}>
                  REGISTRO SALVO
                </div>
                <div style={styles.modalTitle}>
                  {registroAberto.titulo}
                </div>
              </div>
              <ActionButton
                onClick={() =>
                  setRegistroAberto(null)
                }
              >
                Fechar
              </ActionButton>
            </div>

            <div style={styles.grid4}>
              {Object.entries(
                registroAberto.registro || {}
              )
                .filter(
                  ([key]) =>
                    ![
                      'texto_original',
                      'snapshot',
                      'memoria_calculo',
                    ].includes(key)
                )
                .slice(0, 20)
                .map(([key, value]) => (
                  <Campo
                    key={key}
                    label={key.replaceAll('_', ' ')}
                    value={
                      typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value ?? '—')
                    }
                  />
                ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 7,
                marginTop: 12,
              }}
            >
              <ActionButton onClick={imprimir}>
                Imprimir
              </ActionButton>
              <ActionButton
                primary
                onClick={exportarPdf}
              >
                Exportar PDF
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const styles = {
  card: {
    background: S.white,
    border: `1px solid ${S.border}`,
    borderRadius: 11,
    padding: '10px 12px',
    boxShadow: '0 3px 12px rgba(15,23,42,0.035)',
  },

  tableWrap: {
    overflowX: 'auto',
    border: `1px solid ${S.border}`,
    borderRadius: 8,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 10.5,
  },

  th: {
    background: S.thBg,
    color: S.thText,
    padding: '7px 8px',
    textAlign: 'left',
    fontSize: 9.5,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },

  td: {
    padding: '7px 8px',
    borderBottom: `1px solid ${S.border}`,
    color: S.text,
    verticalAlign: 'middle',
  },

  tdStrong: {
    padding: '7px 8px',
    borderBottom: `1px solid ${S.border}`,
    color: S.navy,
    fontWeight: 700,
    verticalAlign: 'middle',
  },

  tdRight: {
    padding: '7px 8px',
    borderBottom: `1px solid ${S.border}`,
    color: S.text,
    textAlign: 'right',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },

  actions: {
    display: 'flex',
    gap: 5,
    flexWrap: 'wrap',
  },

  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.42)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  modal: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    border: `1px solid ${S.border}`,
    boxShadow: '0 22px 60px rgba(15,23,42,0.22)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },

  modalKicker: {
    fontSize: 9.5,
    color: S.blue,
    fontWeight: 800,
    letterSpacing: 0.7,
  },

  modalTitle: {
    fontSize: 17,
    color: S.navy,
    fontWeight: 750,
    marginTop: 2,
  },

  grid4: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 7,
  },
}
