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
}

const money = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const dateTime = value => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('pt-BR')
}

const digits = value => String(value || '').replace(/\D/g, '')

const parseJson = value => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

const first = (...values) =>
  values.find(v => v !== undefined && v !== null && String(v).trim() !== '')

function ActionButton({ children, onClick, primary = false, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 28,
        padding: '0 9px',
        border: danger
          ? `1px solid ${S.red}`
          : primary
            ? `1px solid ${S.navy}`
            : `1px solid ${S.border}`,
        background: disabled
          ? '#F8FAFC'
          : danger
            ? S.red
            : primary
              ? S.navy
              : '#FFFFFF',
        color: disabled
          ? '#94A3B8'
          : danger || primary
            ? '#FFFFFF'
            : S.text,
        borderRadius: 7,
        fontSize: 10,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' },
    success: { background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
    warning: { background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
    info: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
  }
  return (
    <span
      style={{
        ...(tones[tone] || tones.neutral),
        borderRadius: 99,
        padding: '3px 8px',
        fontSize: 9.5,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function Kpi({ label, value, helper }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      {helper ? <div style={styles.kpiHelper}>{helper}</div> : null}
    </div>
  )
}

function Campo({ label, value }) {
  return (
    <div style={styles.campo}>
      <div style={styles.campoLabel}>{label}</div>
      <div style={styles.campoValue}>{value ?? '—'}</div>
    </div>
  )
}

function EmptyState({ children }) {
  return <div style={styles.empty}>{children}</div>
}


function numberValue(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function percent(value) {
  const n = numberValue(value)
  if (!n) return '—'
  const pct = Math.abs(n) <= 1 ? n * 100 : n
  return pct.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }) + '%'
}

function SectionDetail({ title, children }) {
  return (
    <section style={styles.detailSection}>
      <div style={styles.detailSectionTitle}>{title}</div>
      {children}
    </section>
  )
}

function MoneyCampo({ label, value }) {
  return <Campo label={label} value={money(numberValue(value))} />
}

function getMemoriaFromItem(item) {
  if (!item) return {}
  if (item?.tipo === 'apuracoes' && item?.registro?.memoria_calculo) {
    return parseJson(item.registro.memoria_calculo)
  }
  if (item?.tipo === 'memorias') {
    return parseJson(item.registro)
  }
  return parseJson(item?.registro?.memoria_calculo)
}

function getDadosExibidosFromItem(item) {
  if (!item) return {}
  if (item?.registro?.dados_exibidos) return parseJson(item.registro.dados_exibidos)
  return {}
}

function getCalculoFromMemoria(memoria) {
  return memoria?.calculo_tributario || memoria?.calculoTributario || {}
}

function getResultadoFromMemoria(memoria) {
  const calculo = getCalculoFromMemoria(memoria)
  return calculo?.resultado || {}
}

function getDadosTributarios(item) {
  const memoria = getMemoriaFromItem(item)
  const dados = getDadosExibidosFromItem(item)
  const calculo = getCalculoFromMemoria(memoria)
  const resultado = getResultadoFromMemoria(memoria)
  const pgdas = memoria?.fontes?.pgdas || {}
  const loteXml = memoria?.fontes?.lote_xml || {}
  const conferencia = memoria?.conferencia || {}
  const parametrizacao = memoria?.parametrizacao_receita || {}

  const tributos = Array.isArray(dados?.tributos)
    ? dados.tributos
    : []

  return {
    memoria,
    dados,
    calculo,
    resultado,
    pgdas,
    loteXml,
    conferencia,
    parametrizacao,
    tributos,
  }
}

function TabelaTributosPreservados({ tributos }) {
  if (!Array.isArray(tributos) || tributos.length === 0) return null

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Tributo</th>
            <th style={styles.th}>Original</th>
            <th style={styles.th}>Conferido</th>
            <th style={styles.th}>Diferença</th>
            <th style={styles.th}>Tratamento</th>
          </tr>
        </thead>
        <tbody>
          {tributos.map((t, idx) => (
            <tr key={`${t?.codigo || 'tributo'}-${idx}`}>
              <td style={styles.tdStrong}>{t?.codigo || '—'}</td>
              <td style={styles.td}>{money(numberValue(t?.original))}</td>
              <td style={styles.td}>{money(numberValue(t?.conferido))}</td>
              <td style={styles.td}>{money(numberValue(t?.diferenca))}</td>
              <td style={styles.td}>
                {t?.preservado
                  ? 'Preservado'
                  : t?.foraEscopo
                    ? 'Fora do escopo'
                    : 'Conferido'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetalheApuracao({ item }) {
  const {
    dados,
    resultado,
    pgdas,
    loteXml,
    conferencia,
    parametrizacao,
    tributos,
  } = getDadosTributarios(item)

  const receitaOriginal = first(
    dados?.receitaOriginal,
    resultado?.receita?.originalmenteDeclaradaPgdas,
    pgdas?.receita_bruta_total,
    0
  )
  const receitaDocumental = first(
    dados?.receitaDocumental,
    resultado?.receita?.documental,
    conferencia?.receitaDocumental,
    0
  )
  const receitaConsiderada = first(
    dados?.receitaConsiderada,
    resultado?.receita?.consideradaNaApuracao,
    conferencia?.receitaConsiderada,
    receitaOriginal
  )
  const receitaTratamento = first(
    dados?.receitaTratamentoEspecifico,
    resultado?.receita?.tratamentoEspecificoPisCofins,
    0
  )

  return (
    <>
      <SectionDetail title="Documento de origem">
        <div style={styles.grid4}>
          <Campo
            label="PGDAS-D utilizado"
            value={first(
              dados?.pgdasIdentificacao,
              pgdas?.numero_declaracao,
              pgdas?.numeroDeclaracao,
              '—'
            )}
          />
          <Campo
            label="Lote XML"
            value={first(
              dados?.loteXml,
              loteXml?.nome,
              loteXml?.name,
              '—'
            )}
          />
          <MoneyCampo
            label="RBT12"
            value={first(dados?.rbt12, pgdas?.rbt12, 0)}
          />
          <Campo
            label="Alíquota efetiva"
            value={percent(first(dados?.aliquotaEfetiva, resultado?.aliquotaEfetiva, 0))}
          />
        </div>
      </SectionDetail>

      <SectionDetail title="Receitas da competência">
        <div style={styles.grid4}>
          <MoneyCampo label="Receita declarada no PGDAS" value={receitaOriginal} />
          <MoneyCampo label="Receita documental" value={receitaDocumental} />
          <MoneyCampo label="Receita considerada" value={receitaConsiderada} />
          <MoneyCampo label="Tratamento específico PIS/COFINS" value={receitaTratamento} />
        </div>
      </SectionDetail>

      <SectionDetail title="Resultado da conferência">
        <div style={styles.grid4}>
          <MoneyCampo
            label="DAS original"
            value={first(
              dados?.dasOriginal,
              resultado?.valoresOriginais?.das,
              pgdas?.das,
              0
            )}
          />
          <MoneyCampo
            label="DAS conferido"
            value={first(
              dados?.dasConferido,
              resultado?.valoresConferidos?.das,
              0
            )}
          />
          <MoneyCampo
            label="Crédito PIS"
            value={first(
              dados?.creditoPis,
              resultado?.credito?.pis,
              resultado?.credito_pis,
              0
            )}
          />
          <MoneyCampo
            label="Crédito COFINS"
            value={first(
              dados?.creditoCofins,
              resultado?.credito?.cofins,
              resultado?.credito_cofins,
              0
            )}
          />
          <MoneyCampo
            label="Crédito total"
            value={first(
              dados?.creditoTotal,
              resultado?.credito?.total,
              resultado?.creditoTotal,
              item?.credito,
              0
            )}
          />
          <Campo
            label="Decisão adotada"
            value={first(
              dados?.decisaoAdotada,
              parametrizacao?.decisao,
              conferencia?.decisao,
              '—'
            )}
          />
        </div>
      </SectionDetail>

      {tributos.length > 0 ? (
        <SectionDetail title="Tributos preservados e conferidos">
          <TabelaTributosPreservados tributos={tributos} />
        </SectionDetail>
      ) : null}

      <div style={styles.traceNote}>
        Consulta histórica baseada exclusivamente no snapshot salvo no Espelho.
        Nenhum valor tributário é recalculado nesta tela.
      </div>
    </>
  )
}

function DetalheMemoria({ item }) {
  const {
    memoria,
    resultado,
    pgdas,
    loteXml,
    conferencia,
    parametrizacao,
  } = getDadosTributarios(item)

  return (
    <>
      <SectionDetail title="Fontes preservadas">
        <div style={styles.grid4}>
          <Campo
            label="PGDAS-D"
            value={first(
              pgdas?.numero_declaracao,
              pgdas?.numeroDeclaracao,
              pgdas?.id,
              '—'
            )}
          />
          <MoneyCampo label="Receita declarada" value={first(pgdas?.receita_bruta_total, 0)} />
          <MoneyCampo label="RBT12" value={first(pgdas?.rbt12, 0)} />
          <MoneyCampo label="DAS original" value={first(pgdas?.das, 0)} />
          <Campo
            label="Lote XML"
            value={first(loteXml?.nome, loteXml?.name, loteXml?.id, '—')}
          />
          <Campo label="Versão da memória" value={first(memoria?.versao, '—')} />
          <Campo label="Gerada em" value={dateTime(memoria?.gerado_em)} />
        </div>
      </SectionDetail>

      <SectionDetail title="Conferência registrada">
        <div style={styles.grid4}>
          <Campo
            label="Status da conferência"
            value={first(
              conferencia?.status,
              resultado?.status,
              'Conferência preservada'
            )}
          />
          <Campo
            label="Decisão de receita"
            value={first(
              conferencia?.decisao,
              parametrizacao?.decisao,
              '—'
            )}
          />
          <MoneyCampo
            label="Receita considerada"
            value={first(
              resultado?.receita?.consideradaNaApuracao,
              conferencia?.receitaConsiderada,
              pgdas?.receita_bruta_total,
              0
            )}
          />
          <MoneyCampo
            label="Crédito total"
            value={first(
              resultado?.credito?.total,
              resultado?.creditoTotal,
              item?.credito,
              0
            )}
          />
        </div>
      </SectionDetail>

      <SectionDetail title="Rastreabilidade">
        <div style={styles.grid4}>
          <Campo label="Competência" value={first(memoria?.competencia, item?.competencia, '—')} />
          <Campo
            label="Empresa"
            value={first(
              memoria?.cliente?.razao_social,
              memoria?.cliente?.nome,
              item?.empresa,
              '—'
            )}
          />
          <Campo
            label="CNPJ"
            value={first(memoria?.cliente?.cnpj, item?.cnpj, '—')}
          />
          <Campo
            label="Origem histórica"
            value="Snapshot do Espelho de Retificação"
          />
        </div>
      </SectionDetail>

      <div style={styles.traceNote}>
        A memória técnica é apresentada de forma estruturada para consulta.
        O JSON interno permanece armazenado no banco, mas não é exposto na interface operacional.
      </div>
    </>
  )
}

function DetalheResultado({ item }) {
  const registro = parseJson(item?.registro)
  const credito = registro?.credito || {}

  const pis = first(
    credito?.pis,
    registro?.credito_pis,
    0
  )
  const cofins = first(
    credito?.cofins,
    registro?.credito_cofins,
    0
  )
  const total = first(
    credito?.total,
    registro?.creditoTotal,
    registro?.credito_total,
    item?.credito,
    numberValue(pis) + numberValue(cofins)
  )

  return (
    <>
      <SectionDetail title="Crédito identificado">
        <div style={styles.grid4}>
          <MoneyCampo label="PIS" value={pis} />
          <MoneyCampo label="COFINS" value={cofins} />
          <MoneyCampo label="Total" value={total} />
          <Campo label="Competência" value={item?.competencia || '—'} />
        </div>
      </SectionDetail>

      <SectionDetail title="Comparação salva">
        <div style={styles.grid4}>
          <MoneyCampo
            label="DAS original"
            value={first(
              registro?.dasOriginal,
              registro?.valoresOriginais?.das,
              0
            )}
          />
          <MoneyCampo
            label="DAS conferido"
            value={first(
              registro?.dasConferido,
              registro?.valoresConferidos?.das,
              0
            )}
          />
          <Campo
            label="Status do resultado"
            value={first(registro?.status, item?.status, 'Resultado preservado')}
          />
          <Campo
            label="Origem"
            value="Memória técnica preservada no Espelho"
          />
        </div>
      </SectionDetail>

      <div style={styles.traceNote}>
        Resultado histórico em modo somente leitura. Os valores exibidos são os mesmos
        preservados no snapshot da competência.
      </div>
    </>
  )
}

function DetalhePgdas({ item }) {
  const r = parseJson(item?.registro)

  return (
    <>
      <SectionDetail title="Dados do PGDAS-D">
        <div style={styles.grid4}>
          <Campo
            label="Declaração"
            value={first(r?.numero_declaracao, r?.numeroDeclaracao, r?.id, '—')}
          />
          <Campo
            label="Tipo"
            value={first(r?.tipo_declaracao, r?.tipoDeclaracao, item?.status, '—')}
          />
          <Campo label="Competência" value={item?.competencia || '—'} />
          <MoneyCampo
            label="Receita declarada"
            value={first(r?.receita_bruta_total, r?.receita_apurada, 0)}
          />
          <MoneyCampo label="RBT12" value={first(r?.rbt12, 0)} />
          <MoneyCampo
            label="DAS"
            value={first(r?.das_recolhido, r?.imposto_apurado, r?.das, 0)}
          />
          <MoneyCampo label="PIS" value={first(r?.pis, 0)} />
          <MoneyCampo label="COFINS" value={first(r?.cofins, 0)} />
          <MoneyCampo label="ICMS" value={first(r?.icms, 0)} />
        </div>
      </SectionDetail>
    </>
  )
}

function DetalheDiagnostico({ item }) {
  const r = parseJson(item?.registro)
  const arquivos = Array.isArray(r?.arquivos_importados)
    ? r.arquivos_importados
    : parseJson(r?.arquivos_importados)

  const qtdArquivos = Array.isArray(arquivos)
    ? arquivos.length
    : 0

  return (
    <>
      <SectionDetail title="Resumo do diagnóstico">
        <div style={styles.grid4}>
          <Campo label="Status" value={first(r?.status, item?.status, '—')} />
          <Campo label="Regime" value={first(r?.regime, '—')} />
          <Campo label="Competência" value={item?.competencia || '—'} />
          <Campo label="Arquivos importados" value={qtdArquivos || '—'} />
          <Campo label="Total de itens" value={first(r?.total_itens, r?.qtd_itens, '—')} />
          <Campo label="Data da importação" value={dateTime(first(r?.data_importacao, r?.created_at, item?.data))} />
          <Campo label="Responsável" value={first(r?.importado_por, r?.responsavel, '—')} />
        </div>
      </SectionDetail>
    </>
  )
}

function DetalheRegistroEstruturado({ item }) {
  if (!item) return null

  if (item.tipo === 'apuracoes') return <DetalheApuracao item={item} />
  if (item.tipo === 'memorias') return <DetalheMemoria item={item} />
  if (item.tipo === 'resultados') return <DetalheResultado item={item} />
  if (item.tipo === 'pgdas') return <DetalhePgdas item={item} />
  if (item.tipo === 'diagnosticos') return <DetalheDiagnostico item={item} />

  return (
    <div style={styles.traceNote}>
      Registro disponível para consulta histórica. Use “Ver origem” para acessar o módulo de origem.
    </div>
  )
}

export default function CentralConsultas({
  onAbrirProntuario,
  onAbrirOrigem,
}) {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [clientes, setClientes] = useState([])
  const [apuracoes, setApuracoes] = useState([])
  const [espelhos, setEspelhos] = useState([])
  const [pgdas, setPgdas] = useState([])
  const [monofasicos, setMonofasicos] = useState([])

  const [tipo, setTipo] = useState('todos')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [competenciaFiltro, setCompetenciaFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [busca, setBusca] = useState('')

  const [registroAberto, setRegistroAberto] = useState(null)
  const [historicoAberto, setHistoricoAberto] = useState(null)
  const [espelhoAberto, setEspelhoAberto] = useState(null)
  const [registroImpressao, setRegistroImpressao] = useState(null)
  const [selecionadosExclusao, setSelecionadosExclusao] = useState([])
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    setErro('')

    try {
      const [cliResp, apsResp, espResp, pgdasResp, monoResp] = await Promise.all([
        supabase.from('clientes').select('*').order('razao_social', { ascending: true }),
        supabase.from('apuracoes_simples').select('*').order('created_at', { ascending: false }),
        supabase.from('espelhos_retificacao_pgdas').select('*').order('created_at', { ascending: false }),
        supabase.from('diagnosticos_pgdas').select('*').order('created_at', { ascending: false }),
        supabase.from('diagnosticos_monofasicos').select('*').order('created_at', { ascending: false }),
      ])

      const respostas = [
        ['Clientes', cliResp],
        ['Apurações', apsResp],
        ['Espelhos', espResp],
        ['PGDAS-D', pgdasResp],
        ['Diagnósticos', monoResp],
      ]

      for (const [nome, resp] of respostas) {
        if (resp?.error) throw new Error(`${nome}: ${resp.error.message}`)
      }

      setClientes(cliResp.data || [])
      setApuracoes(apsResp.data || [])
      setEspelhos(espResp.data || [])
      setPgdas(pgdasResp.data || [])
      setMonofasicos(monoResp.data || [])
    } catch (e) {
      setErro(e?.message || 'Erro ao carregar a Central de Consultas.')
    } finally {
      setLoading(false)
    }
  }

  const clienteMap = useMemo(() => {
    const porId = new Map()
    const porCnpj = new Map()

    clientes.forEach(cliente => {
      porId.set(String(cliente.id), cliente)
      const cnpj = digits(cliente.cnpj)
      if (cnpj) porCnpj.set(cnpj, cliente)
    })

    return { porId, porCnpj }
  }, [clientes])

  function clienteDaApuracao(apuracao) {
    const direto = clienteMap.porId.get(String(apuracao?.cliente_id || ''))
    if (direto) return direto

    const memoria = parseJson(apuracao?.memoria_calculo)
    const porId = clienteMap.porId.get(String(memoria?.cliente?.id || ''))
    if (porId) return porId

    const cnpj = digits(memoria?.cliente?.cnpj)
    return cnpj ? clienteMap.porCnpj.get(cnpj) || null : null
  }

  function creditoDaApuracao(apuracao) {
    const memoria = parseJson(apuracao?.memoria_calculo)
    const calculo = memoria?.calculo_tributario || memoria?.calculoTributario || {}
    const resultado = calculo?.resultado || {}

    const pis = Number(first(resultado?.credito?.pis, resultado?.credito_pis, apuracao?.credito_pis, 0) || 0)
    const cofins = Number(first(resultado?.credito?.cofins, resultado?.credito_cofins, apuracao?.credito_cofins, 0) || 0)
    const total = Number(first(
      resultado?.credito?.total,
      resultado?.creditoTotal,
      resultado?.credito_total,
      resultado?.creditos?.total,
      apuracao?.credito_total,
      pis + cofins
    ) || 0)

    return Number.isFinite(total) ? total : 0
  }

  function snapshotDoEspelho(espelho) {
    return parseJson(espelho?.snapshot)
  }

  function memoriaDoEspelho(espelho) {
    const snapshot = snapshotDoEspelho(espelho)
    return parseJson(snapshot?.memoria_calculo)
  }

  function dadosDoEspelho(espelho) {
    const snapshot = snapshotDoEspelho(espelho)
    return parseJson(snapshot?.dados_exibidos)
  }

  function creditoDoEspelho(espelho) {
    const dados = dadosDoEspelho(espelho)
    const memoria = memoriaDoEspelho(espelho)
    const calculo = memoria?.calculo_tributario || memoria?.calculoTributario || {}
    const resultado = calculo?.resultado || {}

    const pis = Number(first(
      dados?.creditoPis,
      resultado?.credito?.pis,
      resultado?.credito_pis,
      0
    ) || 0)

    const cofins = Number(first(
      dados?.creditoCofins,
      resultado?.credito?.cofins,
      resultado?.credito_cofins,
      0
    ) || 0)

    const total = Number(first(
      dados?.creditoTotal,
      resultado?.credito?.total,
      resultado?.creditoTotal,
      resultado?.credito_total,
      resultado?.creditos?.total,
      pis + cofins
    ) || 0)

    return Number.isFinite(total) ? total : 0
  }

  const gruposEspelhos = useMemo(() => {
    const mapa = new Map()

    espelhos.forEach(item => {
      const chave = `${String(item?.cliente_id || '')}|${String(item?.competencia || 'Sem competência')}`
      const grupo = mapa.get(chave) || {
        chave,
        cliente_id: item?.cliente_id,
        competencia: item?.competencia || 'Sem competência',
        versoes: [],
      }
      grupo.versoes.push(item)
      mapa.set(chave, grupo)
    })

    return [...mapa.values()].map(grupo => {
      const versoes = [...grupo.versoes].sort((a, b) => {
        const dataB = new Date(b?.created_at || 0).getTime()
        const dataA = new Date(a?.created_at || 0).getTime()
        if (dataB !== dataA) return dataB - dataA
        return Number(b?.versao || 0) - Number(a?.versao || 0)
      })
      return { ...grupo, versoes, ultima: versoes[0] || null }
    })
  }, [espelhos])

  const snapshotsPreservados = useMemo(() => {
    return gruposEspelhos
      .filter(grupo => {
        const item = grupo?.ultima
        if (!item) return false

        const existeOrigem = apuracoes.some(
          ap => String(ap?.id || '') === String(item?.apuracao_id || '')
        )

        if (existeOrigem) return false

        const snapshot = snapshotDoEspelho(item)
        return Boolean(
          snapshot?.memoria_calculo ||
          snapshot?.dados_exibidos
        )
      })
      .map(grupo => {
        const item = grupo.ultima
        const memoria = memoriaDoEspelho(item)
        const dados = dadosDoEspelho(item)
        const cnpjSnapshot = digits(
          first(
            memoria?.cliente?.cnpj,
            dados?.cnpj,
            ''
          )
        )

        const cliente =
          clienteMap.porId.get(String(grupo?.cliente_id || '')) ||
          (cnpjSnapshot ? clienteMap.porCnpj.get(cnpjSnapshot) : null) ||
          null

        return {
          grupo,
          item,
          memoria,
          dados,
          cliente,
          credito: creditoDoEspelho(item),
        }
      })
  }, [gruposEspelhos, apuracoes, clienteMap])

  const registros = useMemo(() => {
    const lista = []

    apuracoes.forEach(item => {
      const cliente = clienteDaApuracao(item)
      const memoria = parseJson(item?.memoria_calculo)
      const credito = creditoDaApuracao(item)
      const base = {
        cliente,
        clienteId: cliente?.id || item?.cliente_id || memoria?.cliente?.id || '',
        empresa: cliente?.razao_social || memoria?.cliente?.razao_social || 'Empresa não identificada',
        cnpj: cliente?.cnpj || memoria?.cliente?.cnpj || '—',
        competencia: item?.competencia || memoria?.competencia || '—',
        data: item?.updated_at || item?.created_at,
        status: item?.status_apuracao || item?.status || 'Salva',
        origem: 'Apuração do Simples',
        apuracao: item,
      }

      lista.push({
        ...base,
        id: `apuracao-${item.id}`,
        tipo: 'apuracoes',
        tipoLabel: 'Apuração',
        titulo: `Apuração ${base.competencia}`,
        valor: Number(item?.imposto_apurado || 0),
        credito,
        registro: item,
      })

      if (item?.memoria_calculo) {
        lista.push({
          ...base,
          id: `memoria-${item.id}`,
          tipo: 'memorias',
          tipoLabel: 'Memória',
          titulo: `Memória técnica ${base.competencia}`,
          valor: 0,
          credito,
          registro: memoria,
        })

        lista.push({
          ...base,
          id: `resultado-${item.id}`,
          tipo: 'resultados',
          tipoLabel: 'Resultado',
          titulo: `Resultado ${base.competencia}`,
          valor: credito,
          credito,
          registro: memoria?.calculo_tributario?.resultado || memoria?.calculoTributario?.resultado || {},
        })
      }
    })

    snapshotsPreservados.forEach(snapshotPreservado => {
      const {
        grupo,
        item,
        memoria,
        dados,
        cliente,
        credito,
      } = snapshotPreservado

      const competencia =
        first(
          grupo?.competencia,
          memoria?.competencia,
          dados?.competencia,
          item?.competencia,
          '—'
        ) || '—'

      const empresa =
        first(
          cliente?.razao_social,
          memoria?.cliente?.razao_social,
          memoria?.cliente?.nome,
          dados?.empresa,
          'Empresa não identificada'
        ) || 'Empresa não identificada'

      const cnpj =
        first(
          cliente?.cnpj,
          memoria?.cliente?.cnpj,
          dados?.cnpj,
          '—'
        ) || '—'

      const basePreservada = {
        cliente,
        clienteId: cliente?.id || grupo?.cliente_id || memoria?.cliente?.id || '',
        empresa,
        cnpj,
        competencia,
        data: item?.updated_at || item?.created_at,
        status: 'Snapshot preservado',
        origem: 'Espelho de Retificação — snapshot preservado',
        credito,
        preservadoEmSnapshot: true,
        grupoEspelho: grupo,
      }

      lista.push({
        ...basePreservada,
        id: `apuracao-preservada-${grupo.chave}`,
        tipo: 'apuracoes',
        tipoLabel: 'Apuração preservada',
        titulo: `Apuração preservada ${competencia}`,
        valor: Number(first(dados?.dasConferido, dados?.dasOriginal, 0) || 0),
        registro: {
          apuracao_id_original: item?.apuracao_id || null,
          fonte: 'snapshot_espelho',
          dados_exibidos: dados,
          memoria_calculo: memoria,
        },
      })

      if (Object.keys(memoria || {}).length > 0) {
        lista.push({
          ...basePreservada,
          id: `memoria-preservada-${grupo.chave}`,
          tipo: 'memorias',
          tipoLabel: 'Memória preservada',
          titulo: `Memória técnica preservada ${competencia}`,
          valor: 0,
          registro: memoria,
        })
      }

      const resultado =
        memoria?.calculo_tributario?.resultado ||
        memoria?.calculoTributario?.resultado ||
        {
          credito: {
            pis: Number(dados?.creditoPis || 0),
            cofins: Number(dados?.creditoCofins || 0),
            total: credito,
          },
          dasOriginal: Number(dados?.dasOriginal || 0),
          dasConferido: Number(dados?.dasConferido || 0),
        }

      lista.push({
        ...basePreservada,
        id: `resultado-preservado-${grupo.chave}`,
        tipo: 'resultados',
        tipoLabel: 'Resultado preservado',
        titulo: `Resultado preservado ${competencia}`,
        valor: credito,
        registro: resultado,
      })
    })

    gruposEspelhos.forEach(grupo => {
      const item = grupo.ultima
      const memoriaSnapshot = memoriaDoEspelho(item)
      const dadosSnapshot = dadosDoEspelho(item)
      const cnpjSnapshot = digits(first(memoriaSnapshot?.cliente?.cnpj, dadosSnapshot?.cnpj, ''))
      const cliente =
        clienteMap.porId.get(String(grupo.cliente_id || '')) ||
        (cnpjSnapshot ? clienteMap.porCnpj.get(cnpjSnapshot) : null) ||
        null
      lista.push({
        id: `espelho-${grupo.chave}`,
        tipo: 'espelhos',
        tipoLabel: 'Espelho',
        titulo: `Espelho ${grupo.competencia}`,
        cliente,
        clienteId: cliente?.id || grupo.cliente_id || '',
        empresa: cliente?.razao_social || memoriaSnapshot?.cliente?.razao_social || dadosSnapshot?.empresa || 'Empresa não identificada',
        cnpj: cliente?.cnpj || memoriaSnapshot?.cliente?.cnpj || dadosSnapshot?.cnpj || '—',
        competencia: grupo.competencia,
        data: item?.updated_at || item?.created_at,
        status: item?.status || 'Rascunho',
        origem: 'Espelho de Retificação',
        valor: 0,
        credito: 0,
        registro: item,
        grupoEspelho: grupo,
      })
    })

    pgdas.forEach(item => {
      const cliente = clienteMap.porId.get(String(item?.cliente_id || '')) || null
      const competencia = item?.competencia || item?.periodo_apuracao || '—'
      lista.push({
        id: `pgdas-${item.id}`,
        tipo: 'pgdas',
        tipoLabel: 'PGDAS-D',
        titulo: `PGDAS-D ${competencia}`,
        cliente,
        clienteId: cliente?.id || item?.cliente_id || '',
        empresa: cliente?.razao_social || 'Empresa não identificada',
        cnpj: cliente?.cnpj || '—',
        competencia,
        data: item?.updated_at || item?.created_at,
        status: item?.tipo_declaracao || item?.status || 'Importado',
        origem: 'PGDAS-D',
        valor: Number(first(item?.das_recolhido, item?.das_total, item?.valor_das, 0) || 0),
        credito: 0,
        registro: item,
      })
    })

    monofasicos.forEach(item => {
      const cliente = clienteMap.porId.get(String(item?.cliente_id || '')) || null
      lista.push({
        id: `diagnostico-${item.id}`,
        tipo: 'diagnosticos',
        tipoLabel: 'Diagnóstico',
        titulo: item?.nome_diagnostico || `Diagnóstico monofásico ${item?.competencia || ''}`.trim(),
        cliente,
        clienteId: cliente?.id || item?.cliente_id || '',
        empresa: cliente?.razao_social || 'Empresa não identificada',
        cnpj: cliente?.cnpj || '—',
        competencia: item?.competencia || '—',
        data: item?.updated_at || item?.created_at,
        status: item?.status || 'Salvo',
        origem: 'Monofásicos',
        valor: Number(first(item?.valor_total, item?.receita_total, 0) || 0),
        credito: 0,
        registro: item,
      })
    })

    return lista.sort((a, b) => new Date(b?.data || 0).getTime() - new Date(a?.data || 0).getTime())
  }, [apuracoes, snapshotsPreservados, gruposEspelhos, pgdas, monofasicos, clienteMap])

  const statusOptions = useMemo(() => {
    return [...new Set(registros.map(r => String(r.status || '')).filter(Boolean))].sort()
  }, [registros])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const ini = dataInicial ? new Date(`${dataInicial}T00:00:00`) : null
    const fim = dataFinal ? new Date(`${dataFinal}T23:59:59`) : null

    return registros.filter(item => {
      if (tipo !== 'todos' && item.tipo !== tipo) return false
      if (clienteFiltro && String(item.clienteId) !== String(clienteFiltro)) return false
      if (competenciaFiltro && !String(item.competencia || '').toLowerCase().includes(competenciaFiltro.toLowerCase())) return false
      if (statusFiltro && String(item.status || '') !== statusFiltro) return false

      const dataItem = item.data ? new Date(item.data) : null
      if (ini && (!dataItem || dataItem < ini)) return false
      if (fim && (!dataItem || dataItem > fim)) return false

      if (termo) {
        const alvo = [item.empresa, item.cnpj, item.competencia, item.tipoLabel, item.status, item.titulo]
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }

      return true
    })
  }, [registros, tipo, clienteFiltro, competenciaFiltro, statusFiltro, dataInicial, dataFinal, busca])

  const empresasComRegistro = useMemo(() => new Set(registros.map(r => String(r.clienteId || '')).filter(Boolean)).size, [registros])
  const totalCredito = useMemo(() => {
    const creditoAtivo = apuracoes.reduce(
      (s, item) => s + creditoDaApuracao(item),
      0
    )

    const creditoPreservado = snapshotsPreservados.reduce(
      (s, item) => s + Number(item?.credito || 0),
      0
    )

    return creditoAtivo + creditoPreservado
  }, [apuracoes, snapshotsPreservados])

  const totalApuracoesConsultaveis =
    apuracoes.length + snapshotsPreservados.length

  function chaveExclusao(item) {
    if (!item) return ''

    if (item?.preservadoEmSnapshot && item?.grupoEspelho?.chave) {
      return `espelho:${item.grupoEspelho.chave}`
    }

    if (item?.tipo === 'espelhos' && item?.grupoEspelho?.chave) {
      return `espelho:${item.grupoEspelho.chave}`
    }

    if (['apuracoes', 'memorias', 'resultados'].includes(item?.tipo)) {
      const apuracaoId = first(
        item?.apuracao?.id,
        item?.tipo === 'apuracoes' ? item?.registro?.id : null,
        ''
      )
      return apuracaoId ? `apuracao:${apuracaoId}` : ''
    }

    if (item?.tipo === 'pgdas' && item?.registro?.id) {
      return `pgdas:${item.registro.id}`
    }

    if (item?.tipo === 'diagnosticos' && item?.registro?.id) {
      return `diagnostico:${item.registro.id}`
    }

    return ''
  }

  const chavesFiltradas = useMemo(
    () => [...new Set(filtrados.map(chaveExclusao).filter(Boolean))],
    [filtrados]
  )

  const todosFiltradosSelecionados =
    chavesFiltradas.length > 0 &&
    chavesFiltradas.every(chave => selecionadosExclusao.includes(chave))

  const quantidadeLinhasSelecionadas = registros.filter(item =>
    selecionadosExclusao.includes(chaveExclusao(item))
  ).length

  function alternarSelecao(item) {
    const chave = chaveExclusao(item)
    if (!chave) return

    setSelecionadosExclusao(atual =>
      atual.includes(chave)
        ? atual.filter(valor => valor !== chave)
        : [...atual, chave]
    )
  }

  function alternarTodosFiltrados() {
    setSelecionadosExclusao(atual => {
      if (todosFiltradosSelecionados) {
        return atual.filter(chave => !chavesFiltradas.includes(chave))
      }

      return [...new Set([...atual, ...chavesFiltradas])]
    })
  }

  async function executarExclusao(chaves) {
    const alvos = [...new Set(chaves.filter(Boolean))]
    if (alvos.length === 0) return

    setExcluindo(true)
    setErro('')

    try {
      for (const chave of alvos) {
        const separador = chave.indexOf(':')
        const tipoAlvo = chave.slice(0, separador)
        const identificador = chave.slice(separador + 1)

        if (tipoAlvo === 'espelho') {
          const grupo = gruposEspelhos.find(item => item.chave === identificador)
          const ids = (grupo?.versoes || []).map(item => item?.id).filter(Boolean)

          if (ids.length > 0) {
            const { error } = await supabase
              .from('espelhos_retificacao_pgdas')
              .delete()
              .in('id', ids)

            if (error) throw error
          }

          continue
        }

        if (tipoAlvo === 'apuracao') {
          const { error: erroEspelhos } = await supabase
            .from('espelhos_retificacao_pgdas')
            .delete()
            .eq('apuracao_id', String(identificador))

          if (erroEspelhos) throw erroEspelhos

          const { error: erroApuracao } = await supabase
            .from('apuracoes_simples')
            .delete()
            .eq('id', identificador)

          if (erroApuracao) throw erroApuracao
          continue
        }

        if (tipoAlvo === 'pgdas') {
          const { error } = await supabase
            .from('diagnosticos_pgdas')
            .delete()
            .eq('id', identificador)

          if (error) throw error
          continue
        }

        if (tipoAlvo === 'diagnostico') {
          const { error } = await supabase
            .from('diagnosticos_monofasicos')
            .delete()
            .eq('id', identificador)

          if (error) throw error
        }
      }

      setSelecionadosExclusao([])
      setRegistroAberto(null)
      setHistoricoAberto(null)
      await carregar()
    } catch (e) {
      const mensagem = e?.message || 'Erro ao excluir registro.'
      setErro(mensagem)
      alert('Erro ao excluir: ' + mensagem)
    } finally {
      setExcluindo(false)
    }
  }

  async function excluirRegistro(item) {
    const chave = chaveExclusao(item)
    if (!chave) {
      alert('Este registro não possui uma origem removível identificada.')
      return
    }

    const relacionados = registros.filter(
      registro => chaveExclusao(registro) === chave
    )

    const complemento = relacionados.length > 1
      ? `\n\nEste registro possui ${relacionados.length} visualizações vinculadas na Central, que serão removidas em conjunto.`
      : ''

    if (!window.confirm(
      `Excluir "${item?.tipoLabel || 'registro'}" da competência ${item?.competencia || '—'}?` +
      complemento +
      '\n\nEsta ação não pode ser desfeita.'
    )) return

    await executarExclusao([chave])
  }

  async function excluirSelecionados() {
    if (selecionadosExclusao.length === 0) return

    if (!window.confirm(
      `Excluir ${quantidadeLinhasSelecionadas} registro(s) consultável(is) selecionado(s)?` +
      '\n\nRegistros vinculados da mesma apuração ou do mesmo Espelho serão removidos em conjunto.' +
      '\n\nEsta ação não pode ser desfeita.'
    )) return

    await executarExclusao(selecionadosExclusao)
  }

  function limparFiltros() {
    setClienteFiltro('')
    setCompetenciaFiltro('')
    setStatusFiltro('')
    setDataInicial('')
    setDataFinal('')
    setBusca('')
  }

  function abrirRegistro(item) {
    if (item.tipo === 'espelhos') {
      abrirEspelho(item.grupoEspelho)
      return
    }
    setRegistroAberto(item)
  }

  function abrirEspelho(grupo, versao = null) {
    const item = versao || grupo?.ultima
    if (!item) return

    const apuracaoVinculada = apuracoes.find(ap => String(ap.id) === String(item.apuracao_id)) || {
      id: item.apuracao_id,
      cliente_id: item.cliente_id,
      competencia: item.competencia,
      memoria_calculo: item?.snapshot?.memoria_calculo || {},
    }

    setEspelhoAberto({
      apuracao: apuracaoVinculada,
      versaoInicial: item,
      versoes: grupo?.versoes || [item],
    })
    setHistoricoAberto(null)
  }

  function imprimirRegistro(item, pdf = false) {
    const tituloAnterior = document.title
    setRegistroImpressao(item)
    if (pdf) document.title = `FiscalTribe - ${item.tipoLabel} - ${item.empresa} - ${item.competencia}`

    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.title = tituloAnterior
        setRegistroImpressao(null)
      }, 300)
    }, 80)
  }

  function irProntuario(item) {
    if (typeof onAbrirProntuario === 'function' && item?.cliente) {
      onAbrirProntuario(item.cliente)
    }
  }

  function irOrigem(item) {
    if (item?.preservadoEmSnapshot && item?.grupoEspelho) {
      abrirEspelho(item.grupoEspelho)
      return
    }

    if (typeof onAbrirOrigem === 'function') {
      onAbrirOrigem(item.tipo, item.registro, item.cliente)
    }
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

  const tabs = [
    ['todos', 'Todos'],
    ['apuracoes', 'Apurações'],
    ['memorias', 'Memórias'],
    ['resultados', 'Resultados'],
    ['espelhos', 'Espelhos'],
    ['pgdas', 'PGDAS-D'],
    ['diagnosticos', 'Diagnósticos'],
  ]

  return (
    <div className="central-consultas-root" style={{ minHeight: '100%', background: S.bg, padding: '2px 0 18px' }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .central-print-record, .central-print-record * { visibility: visible !important; }
          .central-print-record {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
            padding: 18px !important;
          }
        }
      `}</style>

      <header style={styles.header}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <div style={styles.headerIcon}>CC</div>
          <div>
            <div style={styles.eyebrow}>FiscalTribe • Consulta global</div>
            <h1 style={styles.title}>Central de Consultas</h1>
            <div style={styles.subtitle}>
              Consulte artefatos salvos de toda a carteira sem refazer o fluxo operacional.
            </div>
          </div>
        </div>
        <ActionButton onClick={carregar}>Atualizar</ActionButton>
      </header>

      {erro ? <div style={styles.error}>{erro}</div> : null}

      {snapshotsPreservados.length > 0 ? (
        <div style={styles.warning}>
          {snapshotsPreservados.length} apuração(ões) de origem não está(ão) mais presente(s) em
          <strong> apuracoes_simples</strong>. A Central mantém a consulta pela memória técnica
          preservada no Espelho. Nenhum registro é recriado e nenhum tributo é recalculado.
        </div>
      ) : null}

      <div style={styles.kpis}>
        <Kpi label="Empresas com registros" value={empresasComRegistro} helper={`${clientes.length} cliente(s) cadastrado(s)`} />
        <Kpi
          label="Apurações consultáveis"
          value={totalApuracoesConsultaveis}
          helper={`${apuracoes.length} ativa(s) • ${snapshotsPreservados.length} preservada(s) em snapshot`}
        />
        <Kpi label="Crédito identificado" value={money(totalCredito)} helper="Registros ativos + resultados preservados em snapshot" />
        <Kpi label="Espelhos" value={gruposEspelhos.length} helper={`${espelhos.length} versão(ões) armazenada(s)`} />
        <Kpi label="Registros consultáveis" value={registros.length} helper="Todos os artefatos indexados" />
      </div>

      <div style={styles.tabs}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTipo(id)}
            style={{ ...styles.tab, ...(tipo === id ? styles.tabActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionKicker}>FILTROS</div>
            <div style={styles.sectionTitle}>Localizar registros</div>
          </div>
          <ActionButton onClick={limparFiltros}>Limpar filtros</ActionButton>
        </div>

        <div style={styles.filters}>
          <label style={styles.label}>
            Empresa
            <select value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={styles.input}>
              <option value="">Todas</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>{cliente.razao_social || cliente.nome_fantasia || `Cliente ${cliente.id}`}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Competência
            <input value={competenciaFiltro} onChange={e => setCompetenciaFiltro(e.target.value)} placeholder="MM/AAAA" style={styles.input} />
          </label>

          <label style={styles.label}>
            Status
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={styles.input}>
              <option value="">Todos</option>
              {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>

          <label style={styles.label}>
            De
            <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} style={styles.input} />
          </label>

          <label style={styles.label}>
            Até
            <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} style={styles.input} />
          </label>

          <label style={{ ...styles.label, gridColumn: 'span 2' }}>
            Busca
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Empresa, CNPJ, competência, tipo ou status" style={styles.input} />
          </label>
        </div>
      </section>

      <section style={{ ...styles.card, marginTop: 10 }}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionKicker}>RESULTADOS</div>
            <div style={styles.sectionTitle}>{filtrados.length} registro(s) encontrado(s)</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {selecionadosExclusao.length > 0 ? (
              <ActionButton danger onClick={excluirSelecionados} disabled={excluindo}>
                {excluindo ? 'Excluindo...' : `Excluir selecionados (${quantidadeLinhasSelecionadas})`}
              </ActionButton>
            ) : null}
            {loading
              ? <Badge tone="info">Carregando...</Badge>
              : <Badge tone="neutral">Consulta e gestão de registros</Badge>}
          </div>
        </div>

        {loading ? (
          <EmptyState>Carregando registros...</EmptyState>
        ) : filtrados.length === 0 ? (
          <EmptyState>Nenhum registro encontrado com os filtros informados.</EmptyState>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: 38, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={todosFiltradosSelecionados}
                      onChange={alternarTodosFiltrados}
                      aria-label="Selecionar todos os registros filtrados"
                    />
                  </th>
                  <th style={styles.th}>Empresa</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Competência</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Data</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Valor/Crédito</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(item => {
                  const chave = chaveExclusao(item)
                  const marcado = Boolean(chave && selecionadosExclusao.includes(chave))

                  return (
                    <tr key={item.id}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarSelecao(item)}
                          disabled={!chave || excluindo}
                          aria-label={`Selecionar ${item.tipoLabel} ${item.competencia}`}
                        />
                      </td>
                      <td style={styles.tdStrong}>
                        <div>{item.empresa}</div>
                        <div style={styles.subline}>{item.cnpj}</div>
                      </td>
                      <td style={styles.td}><Badge tone={item.tipo === 'espelhos' ? 'warning' : item.tipo === 'resultados' ? 'success' : 'info'}>{item.tipoLabel}</Badge></td>
                      <td style={styles.tdStrong}>{item.competencia}</td>
                      <td style={styles.td}>{item.status}</td>
                      <td style={styles.td}>{dateTime(item.data)}</td>
                      <td style={styles.tdRight}>
                        {item.tipo === 'resultados' || item.tipo === 'apuracoes' ? money(item.credito) : item.valor ? money(item.valor) : '—'}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <ActionButton primary onClick={() => abrirRegistro(item)}>Abrir</ActionButton>
                          {item.tipo === 'espelhos' ? <ActionButton onClick={() => setHistoricoAberto(item.grupoEspelho)}>Histórico</ActionButton> : null}
                          <ActionButton onClick={() => imprimirRegistro(item, false)}>Imprimir</ActionButton>
                          <ActionButton onClick={() => imprimirRegistro(item, true)}>PDF</ActionButton>
                          <ActionButton disabled={!item.cliente || typeof onAbrirProntuario !== 'function'} onClick={() => irProntuario(item)}>Prontuário</ActionButton>
                          <ActionButton disabled={typeof onAbrirOrigem !== 'function'} onClick={() => irOrigem(item)}>Ver origem</ActionButton>
                          <ActionButton danger disabled={!chave || excluindo} onClick={() => excluirRegistro(item)}>Excluir</ActionButton>
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

      {registroAberto ? (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.sectionKicker}>{registroAberto.tipoLabel.toUpperCase()}</div>
                <div style={styles.modalTitle}>{registroAberto.titulo}</div>
              </div>
              <ActionButton onClick={() => setRegistroAberto(null)}>Fechar</ActionButton>
            </div>

            <div style={styles.grid4}>
              <Campo label="Empresa" value={registroAberto.empresa} />
              <Campo label="CNPJ" value={registroAberto.cnpj} />
              <Campo label="Competência" value={registroAberto.competencia} />
              <Campo label="Status" value={registroAberto.status} />
              <Campo label="Origem" value={registroAberto.origem} />
              <Campo label="Data" value={dateTime(registroAberto.data)} />
              <Campo label="Crédito" value={money(registroAberto.credito)} />
              <Campo label="Identificador" value={String(registroAberto.registro?.id || '—')} />
            </div>

            <div style={{ marginTop: 12 }}>
              <DetalheRegistroEstruturado item={registroAberto} />
            </div>

            <div style={{ ...styles.actions, justifyContent: 'flex-end', marginTop: 10 }}>
              <ActionButton danger disabled={excluindo || !chaveExclusao(registroAberto)} onClick={() => excluirRegistro(registroAberto)}>Excluir</ActionButton>
              <ActionButton onClick={() => imprimirRegistro(registroAberto, false)}>Imprimir</ActionButton>
              <ActionButton primary onClick={() => imprimirRegistro(registroAberto, true)}>Exportar PDF</ActionButton>
              <ActionButton disabled={!registroAberto.cliente || typeof onAbrirProntuario !== 'function'} onClick={() => irProntuario(registroAberto)}>Prontuário</ActionButton>
              <ActionButton disabled={typeof onAbrirOrigem !== 'function'} onClick={() => irOrigem(registroAberto)}>Ver origem</ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {historicoAberto ? (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modal, maxWidth: 780 }}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.sectionKicker}>HISTÓRICO DE VERSÕES</div>
                <div style={styles.modalTitle}>Espelho {historicoAberto.competencia}</div>
              </div>
              <ActionButton onClick={() => setHistoricoAberto(null)}>Fechar</ActionButton>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Versão</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Responsável</th>
                    <th style={styles.th}>Protocolo</th>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoAberto.versoes.map(item => (
                    <tr key={item.id}>
                      <td style={styles.tdStrong}>v{item.versao || 1}</td>
                      <td style={styles.td}>{item.status || 'Rascunho'}</td>
                      <td style={styles.td}>{item.responsavel || '—'}</td>
                      <td style={styles.td}>{item.protocolo || '—'}</td>
                      <td style={styles.td}>{dateTime(item.created_at)}</td>
                      <td style={styles.td}><ActionButton primary onClick={() => abrirEspelho(historicoAberto, item)}>Abrir</ActionButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <div className="central-print-record" style={{ display: 'none' }}>
        {registroImpressao ? (
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: S.navy }}>FiscalTribe — {registroImpressao.tipoLabel}</h1>
            <h2 style={{ margin: '8px 0 16px', fontSize: 18 }}>{registroImpressao.titulo}</h2>
            <div style={styles.grid4}>
              <Campo label="Empresa" value={registroImpressao.empresa} />
              <Campo label="CNPJ" value={registroImpressao.cnpj} />
              <Campo label="Competência" value={registroImpressao.competencia} />
              <Campo label="Status" value={registroImpressao.status} />
              <Campo label="Origem" value={registroImpressao.origem} />
              <Campo label="Data" value={dateTime(registroImpressao.data)} />
              <Campo label="Crédito" value={money(registroImpressao.credito)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <DetalheRegistroEstruturado item={registroImpressao} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const styles = {
  header: {
    background: S.white,
    border: `1px solid ${S.border}`,
    borderRadius: 11,
    padding: '12px 14px',
    boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#EFF6FF',
    border: '1px solid #DBEAFE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: S.blue,
    fontSize: 13,
    fontWeight: 900,
  },
  eyebrow: { fontSize: 9.5, color: S.blue, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '3px 0 0', fontSize: 20, color: S.navy, lineHeight: 1.1 },
  subtitle: { marginTop: 5, fontSize: 10.5, color: S.muted },
  error: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 9, padding: '9px 11px', fontSize: 11, marginBottom: 10 },
  warning: { background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', borderRadius: 9, padding: '9px 11px', fontSize: 10.5, lineHeight: 1.45, marginBottom: 10 },
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 8, marginBottom: 10 },
  kpi: { background: S.white, border: `1px solid ${S.border}`, borderRadius: 11, padding: '9px 11px', minHeight: 66, boxShadow: '0 4px 14px rgba(15,23,42,0.04)' },
  kpiLabel: { fontSize: 9, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: 0.45 },
  kpiValue: { fontSize: 17, fontWeight: 750, color: S.navy, marginTop: 4 },
  kpiHelper: { fontSize: 9.2, color: S.muted, marginTop: 2 },
  tabs: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 },
  tab: { minHeight: 31, padding: '0 12px', border: `1px solid ${S.border}`, background: '#FFFFFF', color: S.muted, borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' },
  tabActive: { background: S.navy, color: '#FFFFFF', borderColor: S.navy },
  card: { background: S.white, border: `1px solid ${S.border}`, borderRadius: 11, padding: '11px 12px', boxShadow: '0 3px 12px rgba(15,23,42,0.035)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  sectionKicker: { fontSize: 9.2, fontWeight: 800, color: S.blue, letterSpacing: 0.75 },
  sectionTitle: { fontSize: 15, fontWeight: 750, color: S.navy, marginTop: 2 },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 9.5, fontWeight: 700, color: S.muted },
  input: { height: 32, border: `1px solid ${S.border}`, borderRadius: 7, padding: '0 9px', fontSize: 10.5, color: S.text, background: '#FFFFFF', outline: 'none' },
  tableWrap: { overflowX: 'auto', border: `1px solid ${S.border}`, borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 10.2 },
  th: { background: S.thBg, color: S.thText, padding: '7px 8px', textAlign: 'left', fontSize: 9.2, fontWeight: 700, whiteSpace: 'nowrap' },
  td: { padding: '7px 8px', borderBottom: `1px solid ${S.border}`, color: S.text, verticalAlign: 'middle' },
  tdStrong: { padding: '7px 8px', borderBottom: `1px solid ${S.border}`, color: S.navy, fontWeight: 700, verticalAlign: 'middle' },
  tdRight: { padding: '7px 8px', borderBottom: `1px solid ${S.border}`, color: S.text, textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  subline: { fontSize: 9, fontWeight: 500, color: S.muted, marginTop: 2 },
  actions: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  empty: { padding: '26px 18px', textAlign: 'center', color: S.muted, fontSize: 11.5, border: `1px dashed ${S.border}`, borderRadius: 9, background: '#FAFCFF' },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.42)', zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 920, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 12, padding: 15, border: `1px solid ${S.border}`, boxShadow: '0 22px 60px rgba(15,23,42,0.22)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  modalTitle: { fontSize: 17, color: S.navy, fontWeight: 750, marginTop: 2 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 7 },
  campo: { padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 8, background: '#FFFFFF' },
  campoLabel: { fontSize: 8.8, color: S.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 },
  campoValue: { fontSize: 11.3, color: S.text, fontWeight: 650, marginTop: 3, overflowWrap: 'anywhere' },
  pre: { marginTop: 12, background: '#0F172A', color: '#E2E8F0', borderRadius: 9, padding: 12, fontSize: 9.5, lineHeight: 1.45, maxHeight: '48vh', overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  detailSection: {
    marginTop: 10,
    padding: 10,
    border: `1px solid ${S.border}`,
    borderRadius: 9,
    background: '#FBFDFF',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
  detailSectionTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: S.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: 8,
  },
  traceNote: {
    marginTop: 10,
    padding: '8px 10px',
    border: `1px solid ${S.border}`,
    borderRadius: 8,
    background: '#F8FAFC',
    color: S.muted,
    fontSize: 9.8,
    lineHeight: 1.45,
  },
}
