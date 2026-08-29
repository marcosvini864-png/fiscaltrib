/**
 * AbaPGDAS.jsx - e-FiscalTribe®
 * PGDAS-D — Motor do Simples Nacional
 * Versao 4.0 - 18/08/2026
 *
 * Estrutura:
 * - Importacao integral do PGDAS-D
 * - Declaracao principal em diagnosticos_pgdas
 * - Atividades/segregacoes em diagnosticos_pgdas_atividades
 * - Historico com reabertura completa
 * - Sem calculo artificial de credito nesta etapa
 *
 * O credito recuperavel sera apurado posteriormente em "Apuracao do Simples",
 * cruzando PGDAS-D + documentos fiscais + classificacao de itens.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import DiagnosticoIAGerenciado from '../../DiagnosticoIAGerenciado'

const fmtR = v =>
  'R$ ' +
  Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const fmtData = v => (v ? new Date(v).toLocaleString('pt-BR') : '-')

const num = v => {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0

  const s = String(v).trim()

  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }

  const normalizado = s
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}

const str = v => (v === null || v === undefined ? '' : String(v))

const normalizarTipoDeclaracao = v => {
  const s = str(v)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (!s) return ''
  if (s.includes('retific')) return 'Retificadora'
  if (s.includes('original')) return 'Original'

  return ''
}

const bool = v => {
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  return ['true', '1', 'sim', 's', 'yes'].includes(s)
}

const S = {
  navy: '#0B1F4D',
  blue: '#2563EB',
  green: '#16a34a',
  red: '#dc2626',
  orange: '#ea580c',
  purple: '#7c3aed',
  muted: '#334155',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  text: '#0F172A',
  thBg: '#4B5563',
  thText: '#FFFFFF',
  ghost: '#F1F5F9',
  ghostText: '#64748B',
}

const FORM_VAZIO = {
  num_declaracao: '',
  num_recibo: '',
  autenticacao: '',
  periodo_apuracao: '',
  tipo_declaracao: 'Original',
  data_transmissao: '',

  rpa: '',
  rbt12: '',
  rba: '',
  rbaa: '',

  receita_revenda: '',
  receita_industrializacao: '',
  receita_servicos: '',
  receita_monofasica: '',
  receita_st: '',
  receita_imune: '',

  fator_r: '',
  das_total: '',

  irpj: '',
  csll: '',
  cofins: '',
  pis: '',
  inss_cpp: '',
  icms: '',
  ipi: '',
  iss: '',

  irpj_susp: '',
  csll_susp: '',
  cofins_susp: '',
  pis_susp: '',
  inss_susp: '',
  icms_susp: '',
  ipi_susp: '',
  iss_susp: '',

  observacoes: '',
}

const ATIVIDADE_VAZIA = {
  ordem: 1,
  descricao: '',
  anexo: '',
  tipo_atividade: '',
  receita: 0,
  receita_revenda: 0,
  receita_industrializacao: 0,
  receita_servicos: 0,
  mercado_interno: 0,
  mercado_externo: 0,

  icms_st: false,
  pis_cofins_monofasico: false,
  antecipacao_com_encerramento: false,
  iss_retido: false,
  imunidade: false,
  exportacao: false,

  irpj: 0,
  csll: 0,
  cofins: 0,
  pis: 0,
  inss_cpp: 0,
  icms: 0,
  ipi: 0,
  iss: 0,

  irpj_susp: 0,
  csll_susp: 0,
  cofins_susp: 0,
  pis_susp: 0,
  inss_susp: 0,
  icms_susp: 0,
  ipi_susp: 0,
  iss_susp: 0,

  valor_total_tributos: 0,
  texto_original: '',
}

const PROMPT_PGDAS = `
Analise integralmente este documento PGDAS-D.

Seu objetivo e TRANSCRITIVO e ESTRUTURADO:
extraia os dados existentes no documento sem inventar informacoes e sem consolidar
atividades diferentes em uma unica atividade.

Retorne SOMENTE JSON valido.
Nao use markdown.
Nao use bloco de codigo.
Nao escreva comentarios antes ou depois do JSON.

Use exatamente esta estrutura:

{
  "periodo_apuracao": "",
  "tipo_declaracao": "",
  "num_declaracao": "",
  "num_recibo": "",
  "autenticacao": "",
  "data_transmissao": "",

  "rpa": 0,
  "rbt12": 0,
  "rba": 0,
  "rbaa": 0,

  "receita_revenda": 0,
  "receita_industrializacao": 0,
  "receita_servicos": 0,
  "receita_monofasica": 0,
  "receita_st": 0,
  "receita_imune": 0,

  "fator_r": "",
  "das_total": 0,

  "irpj": 0,
  "csll": 0,
  "cofins": 0,
  "pis": 0,
  "inss_cpp": 0,
  "icms": 0,
  "ipi": 0,
  "iss": 0,

  "irpj_susp": 0,
  "csll_susp": 0,
  "cofins_susp": 0,
  "pis_susp": 0,
  "inss_susp": 0,
  "icms_susp": 0,
  "ipi_susp": 0,
  "iss_susp": 0,

  "atividades": [
    {
      "ordem": 1,
      "descricao": "",
      "anexo": "",
      "tipo_atividade": "",

      "receita": 0,
      "receita_revenda": 0,
      "receita_industrializacao": 0,
      "receita_servicos": 0,
      "mercado_interno": 0,
      "mercado_externo": 0,

      "icms_st": false,
      "pis_cofins_monofasico": false,
      "antecipacao_com_encerramento": false,
      "iss_retido": false,
      "imunidade": false,
      "exportacao": false,

      "irpj": 0,
      "csll": 0,
      "cofins": 0,
      "pis": 0,
      "inss_cpp": 0,
      "icms": 0,
      "ipi": 0,
      "iss": 0,

      "irpj_susp": 0,
      "csll_susp": 0,
      "cofins_susp": 0,
      "pis_susp": 0,
      "inss_susp": 0,
      "icms_susp": 0,
      "ipi_susp": 0,
      "iss_susp": 0,

      "valor_total_tributos": 0,
      "texto_original": ""
    }
  ]
}

REGRAS DE EXTRACAO:

1. Gere um objeto em "atividades" para CADA atividade/segregacao apresentada no PGDAS-D.
2. Nao una revenda, industrializacao e servicos em uma unica atividade se o documento os apresentar separadamente.
3. Nao confunda ICMS-ST com tributacao monofasica de PIS/COFINS.
4. "icms_st" so deve ser true quando o documento indicar substituicao tributaria de ICMS naquela atividade.
5. "pis_cofins_monofasico" so deve ser true quando o documento indicar tributacao monofasica de PIS/COFINS naquela atividade.
6. "antecipacao_com_encerramento" deve ser independente de ICMS-ST e de PIS/COFINS monofasico.
7. Preserve em "texto_original" a descricao relevante da atividade como aparece no documento.
8. Nao deduza tributacao monofasica apenas porque uma descricao generica menciona varias possibilidades de tributacao.
9. Quando houver linha explicita "Substituicao tributaria de: ICMS", isso nao significa automaticamente PIS/COFINS monofasico.
10. Valores inexistentes devem ser 0. Textos inexistentes devem ser "". Booleanos inexistentes devem ser false.
11. Valores monetarios devem ser numeros JSON, sem R$, sem separador de milhar e com ponto decimal.
12. Nao calcule credito tributario. Apenas extraia o PGDAS-D.
13. Sempre que o proprio documento permitir conferencia, mantenha os totais coerentes com as atividades.
`

function Badge({ tipo }) {
  const map = {
    original: {
      label: 'Original',
      bg: '#eff6ff',
      color: '#2563eb',
      border: '#bfdbfe',
    },
    retificadora: {
      label: 'Retificadora',
      bg: '#f5f3ff',
      color: '#7c3aed',
      border: '#ddd6fe',
    },
    concluido: {
      label: 'Concluido',
      bg: '#f0fdf4',
      color: '#16a34a',
      border: '#86efac',
    },
    pendente: {
      label: 'Pendente',
      bg: '#fff7ed',
      color: '#ea580c',
      border: '#fed7aa',
    },
    erro: {
      label: 'Erro',
      bg: '#fef2f2',
      color: '#dc2626',
      border: '#fecaca',
    },
  }

  const b = map[tipo] || map.pendente

  return (
    <span
      style={{
        background: b.bg,
        color: b.color,
        border: `1px solid ${b.border}`,
        borderRadius: 99,
        padding: '2px 10px',
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {b.label}
    </span>
  )
}

function Flag({ ativo, texto, cor = S.blue }) {
  if (!ativo) return null

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 99,
        background: `${cor}12`,
        color: cor,
        border: `1px solid ${cor}35`,
        fontSize: 10,
        fontWeight: 700,
        marginRight: 4,
        marginBottom: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {texto}
    </span>
  )
}

function InputMoeda({
  label,
  value,
  onChange,
  placeholder = 'R$ 0,00',
  disabled,
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: S.muted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <input
        value={
          value !== '' && value !== null && value !== undefined
            ? Number(value || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ''
        }
        onChange={e => {
          const raw = e.target.value.replace(/\D/g, '')
          onChange((parseInt(raw || '0', 10) / 100).toFixed(2))
        }}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '7px 10px',
          border: `1px solid ${S.border}`,
          borderRadius: 6,
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
          color: S.text,
          background: disabled ? S.bg : S.white,
        }}
      />
    </div>
  )
}

function InputTexto({ label, value, onChange, placeholder, disabled }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: S.muted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '7px 10px',
          border: `1px solid ${S.border}`,
          borderRadius: 6,
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
          color: S.text,
          background: disabled ? S.bg : S.white,
        }}
      />
    </div>
  )
}

function normalizarAtividade(a, index) {
  const tributos =
    num(a.irpj) +
    num(a.csll) +
    num(a.cofins) +
    num(a.pis) +
    num(a.inss_cpp) +
    num(a.icms) +
    num(a.ipi) +
    num(a.iss)

  return {
    ...ATIVIDADE_VAZIA,
    ordem: Number(a.ordem || index + 1),
    descricao: str(a.descricao),
    anexo: str(a.anexo),
    tipo_atividade: str(a.tipo_atividade),

    receita: num(a.receita),
    receita_revenda: num(a.receita_revenda),
    receita_industrializacao: num(a.receita_industrializacao),
    receita_servicos: num(a.receita_servicos),
    mercado_interno: num(a.mercado_interno),
    mercado_externo: num(a.mercado_externo),

    icms_st: bool(a.icms_st),
    pis_cofins_monofasico: bool(a.pis_cofins_monofasico),
    antecipacao_com_encerramento: bool(a.antecipacao_com_encerramento),
    iss_retido: bool(a.iss_retido),
    imunidade: bool(a.imunidade ?? a.imune),
    exportacao: bool(a.exportacao),

    irpj: num(a.irpj),
    csll: num(a.csll),
    cofins: num(a.cofins),
    pis: num(a.pis),
    inss_cpp: num(a.inss_cpp),
    icms: num(a.icms),
    ipi: num(a.ipi),
    iss: num(a.iss),

    irpj_susp: num(a.irpj_susp),
    csll_susp: num(a.csll_susp),
    cofins_susp: num(a.cofins_susp),
    pis_susp: num(a.pis_susp),
    inss_susp: num(a.inss_susp),
    icms_susp: num(a.icms_susp),
    ipi_susp: num(a.ipi_susp),
    iss_susp: num(a.iss_susp),

    valor_total_tributos:
      num(a.valor_total_tributos) > 0
        ? num(a.valor_total_tributos)
        : tributos,

    texto_original: str(a.texto_original || a.descricao_original),
  }
}

function mapAtividadeBanco(a) {
  return {
    ordem: Number(a.ordem_atividade || 0),
    descricao: a.descricao_original || '',
    anexo: a.anexo || '',
    tipo_atividade: a.tipo_atividade || '',

    receita: num(a.receita_bruta),

    icms_st: !!a.icms_st,
    pis_cofins_monofasico: !!a.pis_cofins_monofasico,
    antecipacao_com_encerramento: !!a.antecipacao_encerramento,
    iss_retido: !!a.iss_retido,
    imunidade: !!a.imune,
    exportacao: !!a.exportacao,

    irpj: num(a.irpj),
    csll: num(a.csll),
    cofins: num(a.cofins),
    pis: num(a.pis),
    inss_cpp: num(a.inss_cpp),
    icms: num(a.icms),
    ipi: num(a.ipi),
    iss: num(a.iss),

    irpj_susp: num(a.irpj_susp),
    csll_susp: num(a.csll_susp),
    cofins_susp: num(a.cofins_susp),
    pis_susp: num(a.pis_susp),
    inss_susp: num(a.inss_susp),
    icms_susp: num(a.icms_susp),
    ipi_susp: num(a.ipi_susp),
    iss_susp: num(a.iss_susp),

    valor_total_tributos: num(a.total_tributos),
    texto_original: a.descricao_original || '',
    dados_originais: a.dados_originais || null,
  }
}

export default function AbaPGDAS({ cliente, regime }) {
  const [aba, setAba] = useState('lancamento')
  const [form, setForm] = useState(FORM_VAZIO)
  const [atividades, setAtividades] = useState([])

  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  const [diagAberto, setDiagAberto] = useState(null)
  const [carregandoDiag, setCarregandoDiag] = useState(false)

  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const [importando, setImportando] = useState(false)
  
  const inputImportRef = useRef(null)

  useEffect(() => {
    if (cliente?.id) carregarHistorico()
  }, [cliente?.id])

  function setF(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function limparLancamento() {
    setForm(FORM_VAZIO)
    setAtividades([])
    setDiagAberto(null)
  }

  function novoLancamento() {
    limparLancamento()
    setAba('lancamento')
  }

  async function carregarHistorico() {
    if (!cliente?.id) return

    setLoadingHistorico(true)

    try {
      const { data, error } = await supabase
        .from('diagnosticos_pgdas')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setHistorico(data || [])
      setPagina(1)
    } catch (e) {
      console.error('Erro ao carregar historico PGDAS:', e)
    } finally {
      setLoadingHistorico(false)
    }
  }

  async function importarArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportando(true)

    try {
      let textoExtraido = ''

      if (file.name.toLowerCase().endsWith('.pdf')) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          throw new Error('Sessao expirada. Entre novamente no sistema.')
        }

        const resp = await fetch(
          'https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              model: 'gemini-3.5-flash',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'inline_data',
                      inline_data: {
                        mime_type: 'application/pdf',
                        data: base64,
                      },
                    },
                    {
                      type: 'text',
                      text: PROMPT_PGDAS,
                    },
                  ],
                },
              ],
            }),
          }
        )

        if (!resp.ok) {
          const detalhe = await resp.text()
          throw new Error(
            `Falha na extracao do PDF (${resp.status}). ${detalhe || ''}`.trim()
          )
        }

        const data = await resp.json()
        textoExtraido =
          data?.resposta ??
          data?.resultado ??
          data?.content ??
          data?.message ??
          ''
      } else {
        textoExtraido = await file.text()
      }

      if (typeof textoExtraido !== 'string') {
        textoExtraido = JSON.stringify(textoExtraido)
      }

      const jsonMatch = textoExtraido.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error(
          'A extracao terminou, mas nao retornou um JSON valido do PGDAS-D.'
        )
      }

      const parsed = JSON.parse(jsonMatch[0])

      const atividadesExtraidas = Array.isArray(parsed.atividades)
        ? parsed.atividades.map(normalizarAtividade)
        : []

      setAtividades(atividadesExtraidas)

      setForm(prev => ({
        ...prev,

        periodo_apuracao:
          str(parsed.periodo_apuracao) || prev.periodo_apuracao,
        tipo_declaracao:
        normalizarTipoDeclaracao(parsed.tipo_declaracao) || prev.tipo_declaracao,
        num_declaracao:
          str(parsed.num_declaracao) || prev.num_declaracao,
        num_recibo:
          str(parsed.num_recibo) || prev.num_recibo,
        autenticacao:
          str(parsed.autenticacao) || prev.autenticacao,
        data_transmissao:
          str(parsed.data_transmissao) || prev.data_transmissao,

        rpa: str(num(parsed.rpa)),
        rbt12: str(num(parsed.rbt12)),
        rba: str(num(parsed.rba)),
        rbaa: str(num(parsed.rbaa)),

        receita_revenda: str(num(parsed.receita_revenda)),
        receita_industrializacao: str(
          num(parsed.receita_industrializacao)
        ),
        receita_servicos: str(num(parsed.receita_servicos)),
        receita_monofasica: str(num(parsed.receita_monofasica)),
        receita_st: str(num(parsed.receita_st)),
        receita_imune: str(num(parsed.receita_imune)),

        fator_r: str(parsed.fator_r),

        das_total: str(num(parsed.das_total)),

        irpj: str(num(parsed.irpj)),
        csll: str(num(parsed.csll)),
        cofins: str(num(parsed.cofins)),
        pis: str(num(parsed.pis)),
        inss_cpp: str(num(parsed.inss_cpp)),
        icms: str(num(parsed.icms)),
        ipi: str(num(parsed.ipi)),
        iss: str(num(parsed.iss)),

        irpj_susp: str(num(parsed.irpj_susp)),
        csll_susp: str(num(parsed.csll_susp)),
        cofins_susp: str(num(parsed.cofins_susp)),
        pis_susp: str(num(parsed.pis_susp)),
        inss_susp: str(num(parsed.inss_susp)),
        icms_susp: str(num(parsed.icms_susp)),
        ipi_susp: str(num(parsed.ipi_susp)),
        iss_susp: str(num(parsed.iss_susp)),
      }))

      alert(
        `Dados extraidos com sucesso.\n\nAtividades identificadas: ${atividadesExtraidas.length}\n\nRevise os dados antes de salvar.`
      )
    } catch (err) {
      alert('Erro ao importar PGDAS-D: ' + err.message)
    } finally {
      setImportando(false)
      if (e.target) e.target.value = ''
    }
  }

  const rpa = num(form.rpa)
  const rbt12 = num(form.rbt12)
  const receitaMono = num(form.receita_monofasica)
  const receitaST = num(form.receita_st)
  const receitaImune = num(form.receita_imune)
  const dasTotal = num(form.das_total)

  const irpj = num(form.irpj)
  const csll = num(form.csll)
  const cofins = num(form.cofins)
  const pis = num(form.pis)
  const inss = num(form.inss_cpp)
  const icms = num(form.icms)
  const ipi = num(form.ipi)
  const iss = num(form.iss)

  const totalTributos =
    irpj + csll + cofins + pis + inss + icms + ipi + iss

  const totalReceitaAtividades = atividades.reduce(
    (s, a) => s + num(a.receita),
    0
  )

  const totalTributosAtividades = atividades.reduce(
    (s, a) => s + num(a.valor_total_tributos),
    0
  )

  const qtdICMSST = atividades.filter(a => a.icms_st).length
  const qtdMono = atividades.filter(a => a.pis_cofins_monofasico).length

  const divergenciaAtividades =
    rpa > 0 && totalReceitaAtividades > 0
      ? totalReceitaAtividades - rpa
      : 0

  async function salvar() {
    if (!cliente?.id) {
      return alert('Selecione um cliente antes de salvar.')
    }

    if (!form.periodo_apuracao) {
      return alert('Informe o periodo de apuracao.')
    }

    setSalvando(true)

    let diagnosticoCriado = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) throw new Error('Usuario nao autenticado.')

      const payloadPrincipal = {
        usuario_id: user.id,
        cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '',
        cliente_cnpj: cliente.cnpj || '',
        regime,

        competencia: form.periodo_apuracao,

        num_declaracao: form.num_declaracao || null,
        num_recibo: form.num_recibo || null,
        autenticacao: form.autenticacao || null,
        tipo_declaracao: form.tipo_declaracao || 'Original',
        data_transmissao: form.data_transmissao || null,

        receita_bruta_total: rpa,
        rbt12,
        rba: num(form.rba),
        rbaa: num(form.rbaa),

        receita_revenda: num(form.receita_revenda),
        receita_industrializacao: num(form.receita_industrializacao),
        receita_servicos: num(form.receita_servicos),

        receita_monofasica: receitaMono,
        receita_st: receitaST,
        receita_imune: receitaImune,

        fator_r: form.fator_r || null,

        das_recolhido: dasTotal,

        /*
         * Nesta tela registramos fielmente o PGDAS-D.
         * O valor "correto" e o credito serao calculados somente
         * no modulo Apuracao do Simples, apos conciliacao com XML/NF-e.
         */
        das_correto: dasTotal,
        diferenca_recuperavel: 0,
        credito_estimado: 0,

        pct_monofasica:
          rpa > 0 ? (receitaMono / rpa) * 100 : 0,

        irpj,
        csll,
        cofins,
        pis,
        inss_cpp: inss,
        icms,
        ipi,
        iss,

        total_tributos: totalTributos,

        irpj_susp: num(form.irpj_susp),
        csll_susp: num(form.csll_susp),
        cofins_susp: num(form.cofins_susp),
        pis_susp: num(form.pis_susp),
        inss_susp: num(form.inss_susp),
        icms_susp: num(form.icms_susp),
        ipi_susp: num(form.ipi_susp),
        iss_susp: num(form.iss_susp),

        observacoes: form.observacoes || null,

        status: 'concluido',
        created_at: new Date().toISOString(),
      }

      const {
        data: diag,
        error: erroPrincipal,
      } = await supabase
        .from('diagnosticos_pgdas')
        .insert([payloadPrincipal])
        .select('id')
        .single()

      if (erroPrincipal) throw erroPrincipal

      diagnosticoCriado = diag

      if (atividades.length > 0) {
        const atividadesBanco = atividades.map((a, index) => ({
          diagnostico_id: diag.id,
          usuario_id: user.id,
          cliente_id: cliente.id,
          competencia: form.periodo_apuracao,

          ordem_atividade: Number(a.ordem || index + 1),
          tipo_atividade: a.tipo_atividade || null,
          descricao_original:
            a.texto_original || a.descricao || null,
          anexo: a.anexo || null,

          receita_bruta: num(a.receita),

          icms_st: !!a.icms_st,
          pis_cofins_monofasico: !!a.pis_cofins_monofasico,
          antecipacao_encerramento:
            !!a.antecipacao_com_encerramento,
          iss_retido: !!a.iss_retido,
          imune: !!a.imunidade,
          exportacao: !!a.exportacao,

          irpj: num(a.irpj),
          csll: num(a.csll),
          cofins: num(a.cofins),
          pis: num(a.pis),
          inss_cpp: num(a.inss_cpp),
          icms: num(a.icms),
          ipi: num(a.ipi),
          iss: num(a.iss),

          irpj_susp: num(a.irpj_susp),
          csll_susp: num(a.csll_susp),
          cofins_susp: num(a.cofins_susp),
          pis_susp: num(a.pis_susp),
          inss_susp: num(a.inss_susp),
          icms_susp: num(a.icms_susp),
          ipi_susp: num(a.ipi_susp),
          iss_susp: num(a.iss_susp),

          total_tributos: num(a.valor_total_tributos),

          dados_originais: a,
        }))

        const TAMANHO_LOTE = 300

        for (
          let i = 0;
          i < atividadesBanco.length;
          i += TAMANHO_LOTE
        ) {
          const lote = atividadesBanco.slice(i, i + TAMANHO_LOTE)

          const { error: erroAtividades } = await supabase
            .from('diagnosticos_pgdas_atividades')
            .insert(lote)

          if (erroAtividades) throw erroAtividades
        }
      }

      await carregarHistorico()
      limparLancamento()

      alert(
        `PGDAS-D salvo com sucesso.\n\nAtividades gravadas: ${atividades.length}`
      )
    } catch (e) {
      if (diagnosticoCriado?.id) {
        await supabase
          .from('diagnosticos_pgdas')
          .delete()
          .eq('id', diagnosticoCriado.id)
      }

      alert('Erro ao salvar PGDAS-D: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este PGDAS-D?')) return

    try {
      const { error } = await supabase
        .from('diagnosticos_pgdas')
        .delete()
        .eq('id', id)

      if (error) throw error

      if (diagAberto?.id === id) {
        limparLancamento()
      }

      await carregarHistorico()
    } catch (e) {
      alert('Erro ao excluir PGDAS-D: ' + e.message)
    }
  }

  async function abrirDiagnostico(diag) {
    setCarregandoDiag(true)

    try {
      const { data: atividadesBanco, error } = await supabase
        .from('diagnosticos_pgdas_atividades')
        .select('*')
        .eq('diagnostico_id', diag.id)
        .order('ordem_atividade', { ascending: true })

      if (error) throw error

      const atividadesCarregadas = (atividadesBanco || []).map(
        mapAtividadeBanco
      )

      setDiagAberto(diag)
      setAtividades(atividadesCarregadas)

      setForm({
        num_declaracao: diag.num_declaracao || '',
        num_recibo: diag.num_recibo || '',
        autenticacao: diag.autenticacao || '',
        periodo_apuracao: diag.competencia || '',
        tipo_declaracao: diag.tipo_declaracao || 'Original',
        data_transmissao: diag.data_transmissao || '',

        rpa: str(diag.receita_bruta_total),
        rbt12: str(diag.rbt12),
        rba: str(diag.rba),
        rbaa: str(diag.rbaa),

        receita_revenda: str(diag.receita_revenda),
        receita_industrializacao: str(
          diag.receita_industrializacao
        ),
        receita_servicos: str(diag.receita_servicos),

        receita_monofasica: str(diag.receita_monofasica),
        receita_st: str(diag.receita_st),
        receita_imune: str(diag.receita_imune),

        fator_r: diag.fator_r || '',

        das_total: str(diag.das_recolhido),

        irpj: str(diag.irpj),
        csll: str(diag.csll),
        cofins: str(diag.cofins),
        pis: str(diag.pis),
        inss_cpp: str(diag.inss_cpp),
        icms: str(diag.icms),
        ipi: str(diag.ipi),
        iss: str(diag.iss),

        irpj_susp: str(diag.irpj_susp),
        csll_susp: str(diag.csll_susp),
        cofins_susp: str(diag.cofins_susp),
        pis_susp: str(diag.pis_susp),
        inss_susp: str(diag.inss_susp),
        icms_susp: str(diag.icms_susp),
        ipi_susp: str(diag.ipi_susp),
        iss_susp: str(diag.iss_susp),

        observacoes: diag.observacoes || '',
      })

      setAba('lancamento')
    } catch (e) {
      alert('Erro ao abrir PGDAS-D: ' + e.message)
    } finally {
      setCarregandoDiag(false)
    }
  }

  async function restaurarSnapshotAnalise(snapshot) {
    if (!snapshot?.declaracao) {
      throw new Error('O diagnóstico salvo não possui o snapshot completo do PGDAS-D.')
    }

    const declaracao = snapshot.declaracao || {}

    const atividadesRestauradas =
      Array.isArray(snapshot.atividades)
        ? snapshot.atividades.map((atividade, index) =>
            normalizarAtividade(atividade, index)
          )
        : []

    setForm({
      ...FORM_VAZIO,
      ...declaracao,
      periodo_apuracao:
        snapshot.competencia ||
        declaracao.periodo_apuracao ||
        '',
    })

    setAtividades(atividadesRestauradas)

    const referenciaId =
      snapshot.referencia_pgdas_id
        ? String(snapshot.referencia_pgdas_id)
        : null

    const pgdasOriginal = referenciaId
      ? historico.find(
          item => String(item.id) === referenciaId
        )
      : null

    setDiagAberto(pgdasOriginal || null)
    setAba('lancamento')
  }
  const totalPaginas = Math.max(
    1,
    Math.ceil(historico.length / porPagina)
  )

  const historicoPagina = historico.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina
  )

  const dadosIA =
    rpa > 0
      ? {
          periodo: form.periodo_apuracao,
          receitaBrutaPeriodo: rpa,
          rbt12,
          receitaMonofasica: receitaMono,
          receitaST,
          receitaImune,
          dasDeclarado: dasTotal,
          atividades: atividades.map(a => ({
            ordem: a.ordem,
            descricao: a.descricao,
            anexo: a.anexo,
            tipo_atividade: a.tipo_atividade,
            receita: a.receita,
            icms_st: a.icms_st,
            pis_cofins_monofasico: a.pis_cofins_monofasico,
            antecipacao_com_encerramento: a.antecipacao_com_encerramento,
            iss_retido: a.iss_retido,
            imunidade: a.imunidade,
            exportacao: a.exportacao,
            irpj: a.irpj,
            csll: a.csll,
            cofins: a.cofins,
            pis: a.pis,
            inss_cpp: a.inss_cpp,
            icms: a.icms,
            ipi: a.ipi,
            iss: a.iss,
            valor_total_tributos: a.valor_total_tributos,
          })),
          tributos: {
            irpj,
            csll,
            cofins,
            pis,
            inss,
            icms,
            ipi,
            iss,
          },
          regime,
          observacao:
            'Tela PGDAS-D registra a declaracao original. O credito e calculado posteriormente na Apuracao do Simples.',
        }
      : null

  const snapshotCompletoPGDAS = {
    versao_snapshot: 1,
    tipo: 'pgdas_d',

    cliente: {
      id: cliente?.id || null,
      razao_social: cliente?.razao_social || '',
      cnpj: cliente?.cnpj || '',
    },

    regime: regime || '',

    competencia:
      diagAberto?.competencia ||
      form.periodo_apuracao ||
      '',

    referencia_pgdas_id: diagAberto?.id || null,

    declaracao: {
      ...form,
    },

    atividades: atividades.map(a => ({
      ...a,
    })),

    resumo: {
      rpa,
      rbt12,
      rba: num(form.rba),
      rbaa: num(form.rbaa),

      receita_revenda: num(form.receita_revenda),
      receita_industrializacao: num(form.receita_industrializacao),
      receita_servicos: num(form.receita_servicos),
      receita_monofasica: receitaMono,
      receita_st: receitaST,
      receita_imune: receitaImune,

      fator_r: form.fator_r || '',
      das_total: dasTotal,

      total_tributos: totalTributos,
      total_receita_atividades: totalReceitaAtividades,
      total_tributos_atividades: totalTributosAtividades,
      divergencia_atividades: divergenciaAtividades,

      atividades_icms_st: qtdICMSST,
      atividades_monofasicas: qtdMono,
    },

    tributos: {
      irpj,
      csll,
      cofins,
      pis,
      inss_cpp: inss,
      icms,
      ipi,
      iss,
    },

    tributos_suspensos: {
      irpj: num(form.irpj_susp),
      csll: num(form.csll_susp),
      cofins: num(form.cofins_susp),
      pis: num(form.pis_susp),
      inss_cpp: num(form.inss_susp),
      icms: num(form.icms_susp),
      ipi: num(form.ipi_susp),
      iss: num(form.iss_susp),
    },

    conferencia: {
      rpa,
      soma_atividades: totalReceitaAtividades,
      diferenca: divergenciaAtividades,
      conferido:
        Math.abs(divergenciaAtividades) < 0.01,
    },

    observacoes: form.observacoes || '',

    dados_ia: dadosIA,
  }
  const secao = (titulo, conteudo, subtitulo = '') => (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          borderBottom: `2px solid ${S.navy}`,
          paddingBottom: 7,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: S.navy,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {titulo}
        </div>

        {subtitulo && (
          <div
            style={{
              fontSize: 11,
              color: S.muted,
              marginTop: 3,
            }}
          >
            {subtitulo}
          </div>
        )}
      </div>

      {conteudo}
    </div>
  )

  const kpis = [
    {
      label: 'Receita do Periodo (RPA)',
      valor: rpa > 0 ? fmtR(rpa) : '—',
      cor: rpa > 0 ? S.navy : S.ghostText,
    },
    {
      label: 'Atividades do PGDAS',
      valor: atividades.length > 0 ? atividades.length : '—',
      cor: atividades.length > 0 ? S.purple : S.ghostText,
    },
    {
      label: 'Receita das Atividades',
      valor:
        totalReceitaAtividades > 0
          ? fmtR(totalReceitaAtividades)
          : '—',
      cor:
        totalReceitaAtividades > 0 ? S.blue : S.ghostText,
    },
    {
      label: 'DAS Declarado',
      valor: dasTotal > 0 ? fmtR(dasTotal) : '—',
      cor: dasTotal > 0 ? S.red : S.ghostText,
    },
    {
      label: 'PIS + COFINS',
      valor: pis + cofins > 0 ? fmtR(pis + cofins) : '—',
      cor: pis + cofins > 0 ? S.orange : S.ghostText,
    },
    {
      label: 'Atividades ICMS-ST / Mono',
      valor:
        atividades.length > 0
          ? `${qtdICMSST} / ${qtdMono}`
          : '—',
      cor: atividades.length > 0 ? S.green : S.ghostText,
    },
  ]

  return (
    <div
      style={{
        fontFamily: 'Inter, Arial, sans-serif',
        color: S.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
	  <style>{`
  @keyframes pgdasSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pgdasProgress {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(320%); }
  }

  .pgdas-spinner {
    display: inline-block;
    animation: pgdasSpin 1s linear infinite;
  }

  .pgdas-progress-track {
    width: 100%;
    height: 4px;
    margin-top: 8px;
    background: #E2E8F0;
    border-radius: 999px;
    overflow: hidden;
  }

  .pgdas-progress-bar {
    width: 35%;
    height: 100%;
    background: #2563EB;
    border-radius: 999px;
    animation: pgdasProgress 1.2s ease-in-out infinite;
  }

  .tabela-pgdas-atividades th,
  .tabela-pgdas-atividades td {
    border-right: 1px solid #E2E8F0;
  }

  .tabela-pgdas-atividades th:last-child,
  .tabela-pgdas-atividades td:last-child {
    border-right: none;
  }

  .tabela-pgdas-atividades tbody tr {
    transition: background-color 0.12s ease;
  }

  .tabela-pgdas-atividades tbody tr:hover {
    background: #F8FAFC;
  }

  .tabela-pgdas-atividades thead th:nth-child(4),
  .tabela-pgdas-atividades tbody td:nth-child(4),
  .tabela-pgdas-atividades thead th:nth-child(n+6),
  .tabela-pgdas-atividades tbody td:nth-child(n+6) {
    text-align: right;
  }
`}</style>
        <div>
          <div
            style={{
              fontSize: 13,
              color: S.muted,
              marginBottom: 2,
            }}
          >
            Motor do Simples /{' '}
            <strong style={{ color: S.text }}>PGDAS-D</strong>
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: S.navy,
            }}
          >
            PGDAS-D — Declaracao e Atividades
          </div>

          <div
            style={{
              fontSize: 13,
              color: S.muted,
              marginTop: 4,
              maxWidth: 760,
            }}
          >
            Importe a declaracao completa e confira cada atividade,
            segregacao e tributo antes da conciliacao com os documentos fiscais.
          </div>
        </div>

        <div
          style={{
            background: S.white,
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            padding: '14px 18px',
            minWidth: 270,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: S.navy,
              marginBottom: 4,
            }}
          >
            📎 Importar PGDAS-D
          </div>

          <div
            style={{
              fontSize: 11,
              color: S.muted,
              marginBottom: 10,
            }}
          >
            Aceita: <strong style={{ color: S.text }}>.pdf .txt</strong>
          </div>

          <input
            ref={inputImportRef}
            type="file"
            accept=".pdf,.txt"
            onChange={importarArquivo}
            style={{ display: 'none' }}
          />

          <button
  onClick={() => inputImportRef.current?.click()}
  disabled={importando || !!diagAberto}
  style={{
    width: '100%',
    padding: '8px 0',
    background:
      importando || diagAberto ? '#CBD5E1' : '#4B5563',
    color:
      importando || diagAberto ? '#0F172A' : S.white,
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor:
      importando || diagAberto
        ? 'not-allowed'
        : 'pointer',
  }}
>
  {importando ? (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
      }}
    >
      <span className="pgdas-spinner">⏳</span>
      Extraindo declaracao...
    </span>
  ) : (
    '⬆ Importar e Preencher'
  )}
</button>

{importando && (
  <div
    className="pgdas-progress-track"
    aria-label="Processando PGDAS-D"
  >
    <div className="pgdas-progress-bar" />
  </div>
)}
        </div>
      </div>

      {/* ABAS */}
      <div
        style={{
          display: 'flex',
          borderBottom: `2px solid ${S.border}`,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'lancamento', label: 'Declaracao' },
          {
            id: 'historico',
            label: `Historico PGDAS-D (${historico.length})`,
          },
        ].map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: aba === a.id ? 700 : 400,
              color: aba === a.id ? S.navy : S.muted,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${
                aba === a.id ? S.navy : 'transparent'
              }`,
              marginBottom: -2,
              cursor: 'pointer',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* DECLARACAO */}
      {aba === 'lancamento' && (
        <>
          <DiagnosticoIAGerenciado
            contexto={`PGDAS-D — Declaração e Atividades do Simples Nacional

Sua única função nesta análise é produzir um DIAGNÓSTICO DOCUMENTAL do PGDAS-D apresentado.

Analise exclusivamente os dados que constam no documento e nos dados fornecidos.

REGRAS:

- Descreva o período de apuração.
- Informe o RPA.
- Informe o RBT12 separadamente.
- RPA e RBT12 representam grandezas distintas. Não compare os dois como se devessem ser iguais.
- Descreva as atividades declaradas.
- Descreva as receitas e segregações efetivamente informadas.
- Descreva os tributos declarados e o DAS declarado.
- Informe valores com exigibilidade suspensa quando existirem.
- Pode apontar diferenças matemáticas objetivamente verificáveis dentro do próprio documento.
- Não atribua uma diferença a arredondamento sem evidência.
- Quando uma atividade estiver sem tributos individualizados, apenas registre esse fato documental. Não distribua nem rateie valores.
- Receita monofásica de PIS/COFINS e ICMS-ST são institutos distintos.
- Não conclua crédito tributário.
- Não conclua restituição ou compensação.
- Não conclua crédito de ICMS.
- Não proponha mudança de Anexo.
- Não proponha reenquadramento ou migração de regime.
- Não calcule economia tributária.
- Não homologue o DAS.
- Não cite número de lei, artigo, parágrafo, inciso ou solução de consulta.

FORMATO OBRIGATÓRIO:

## DIAGNÓSTICO DOCUMENTAL

Apresente somente o diagnóstico documental.

NÃO crie as seções:
OPORTUNIDADES
PONTOS PARA VALIDAÇÃO
PRÓXIMOS PASSOS
CRÉDITOS
RECUPERAÇÃO
ECONOMIA TRIBUTÁRIA

Essas etapas são controladas pelo próprio FiscalTribe.`}
            dados={dadosIA}
            snapshotCompleto={snapshotCompletoPGDAS}
            cliente={cliente}
            regime={regime}
            modelo="groq"
            modulo="pgdas_d"
            referenciaId={diagAberto?.id || null}
            competencia={
              diagAberto?.competencia ||
              form.periodo_apuracao ||
              ''
            }
            onVoltar={() => setAba('historico')}
            onRestaurarSnapshot={restaurarSnapshotAnalise}
            onLimparTudo={limparLancamento}
            onAbrirReferencia={async referenciaId => {
              const registro = historico.find(
                item =>
                  String(item.id) === String(referenciaId)
              )

              if (registro) {
                await abrirDiagnostico(registro)
              }
            }}
          />
          {diagAberto && (
            <div
              style={{
                background: '#eff6ff',
                border: `1px solid #bfdbfe`,
                borderRadius: 8,
                padding: '10px 16px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: '#2563eb',
                }}
              >
                Visualizando PGDAS-D salvo — Competencia:{' '}
                <strong>{diagAberto.competencia}</strong>
                {carregandoDiag && ' — carregando atividades...'}
              </div>

              <button
                onClick={novoLancamento}
                style={{
                  background: 'none',
                  border: `1px solid #bfdbfe`,
                  borderRadius: 6,
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '4px 10px',
                }}
              >
                Novo Lancamento
              </button>
            </div>
          )}

          {/* KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {kpis.map((k, i) => (
              <div
                key={i}
                style={{
                  background: S.white,
                  borderRadius: 8,
                  padding: '14px 16px',
                  border: `1px solid ${S.border}`,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: k.cor,
                  }}
                >
                  {k.valor}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: S.muted,
                    marginTop: 5,
                  }}
                >
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* CONFERENCIA */}
          {atividades.length > 0 && rpa > 0 && (
            <div
              style={{
                background:
                  Math.abs(divergenciaAtividades) < 0.01
                    ? '#f0fdf4'
                    : '#fff7ed',
                border: `1px solid ${
                  Math.abs(divergenciaAtividades) < 0.01
                    ? '#86efac'
                    : '#fed7aa'
                }`,
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 12,
                color:
                  Math.abs(divergenciaAtividades) < 0.01
                    ? '#166534'
                    : '#9a3412',
              }}
            >
              <strong>Conferencia das atividades:</strong>{' '}
              RPA {fmtR(rpa)} | Soma das atividades{' '}
              {fmtR(totalReceitaAtividades)} | Diferenca{' '}
              {fmtR(divergenciaAtividades)}.
              {Math.abs(divergenciaAtividades) >= 0.01 &&
                ' Revise o documento antes de salvar.'}
            </div>
          )}

          {/* FORMULARIO */}
          <div
            style={{
              background: S.white,
              borderRadius: 10,
              border: `1px solid ${S.border}`,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${S.border}`,
                background: '#f0f9ff',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: S.navy,
                }}
              >
                Dados da Declaracao PGDAS-D
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: S.muted,
                  marginTop: 2,
                }}
              >
                Os dados abaixo representam o PGDAS-D original. O credito nao
                e calculado nesta tela.
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {secao(
                '1. Identificacao da Declaracao',
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <InputTexto
                    label="Periodo de Apuracao *"
                    value={form.periodo_apuracao}
                    onChange={v => setF('periodo_apuracao', v)}
                    placeholder="MM/AAAA"
                    disabled={!!diagAberto}
                  />

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: S.muted,
                        marginBottom: 4,
                      }}
                    >
                      Tipo de Declaracao
                    </div>

                    <select
                      value={form.tipo_declaracao}
                      onChange={e =>
                        setF('tipo_declaracao', e.target.value)
                      }
                      disabled={!!diagAberto}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: `1px solid ${S.border}`,
                        borderRadius: 6,
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                        color: S.text,
                        background: diagAberto ? S.bg : S.white,
                      }}
                    >
                      <option>Original</option>
                      <option>Retificadora</option>
                    </select>
                  </div>

                  <InputTexto
                    label="No. da Declaracao"
                    value={form.num_declaracao}
                    onChange={v => setF('num_declaracao', v)}
                    disabled={!!diagAberto}
                  />

                  <InputTexto
                    label="Numero do Recibo"
                    value={form.num_recibo}
                    onChange={v => setF('num_recibo', v)}
                    disabled={!!diagAberto}
                  />

                  <InputTexto
                    label="Autenticacao"
                    value={form.autenticacao}
                    onChange={v => setF('autenticacao', v)}
                    disabled={!!diagAberto}
                  />

                  <InputTexto
                    label="Data de Transmissao"
                    value={form.data_transmissao}
                    onChange={v => setF('data_transmissao', v)}
                    disabled={!!diagAberto}
                  />
                </div>
              )}

              {secao(
                '2. Discriminativo de Receitas',
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <InputMoeda
                    label="RPA — Receita do Periodo *"
                    value={form.rpa}
                    onChange={v => setF('rpa', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="RBT12 — 12 Meses Anteriores"
                    value={form.rbt12}
                    onChange={v => setF('rbt12', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="RBA — Ano-Calendario Corrente"
                    value={form.rba}
                    onChange={v => setF('rba', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="RBAA — Ano-Calendario Anterior"
                    value={form.rbaa}
                    onChange={v => setF('rbaa', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="Revenda de Mercadorias"
                    value={form.receita_revenda}
                    onChange={v => setF('receita_revenda', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="Industrializacao"
                    value={form.receita_industrializacao}
                    onChange={v =>
                      setF('receita_industrializacao', v)
                    }
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="Prestacao de Servicos"
                    value={form.receita_servicos}
                    onChange={v => setF('receita_servicos', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="Receita Monofasica PIS/COFINS"
                    value={form.receita_monofasica}
                    onChange={v => setF('receita_monofasica', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="Receita com ICMS-ST"
                    value={form.receita_st}
                    onChange={v => setF('receita_st', v)}
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="Receita Imune"
                    value={form.receita_imune}
                    onChange={v => setF('receita_imune', v)}
                    disabled={!!diagAberto}
                  />
                </div>,
                'Nesta etapa os valores sao transcritos do PGDAS-D, sem recalculo.'
              )}

              {secao(
                '3. Fator R e DAS',
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <InputTexto
                    label="Fator R"
                    value={form.fator_r}
                    onChange={v => setF('fator_r', v)}
                    placeholder="Conforme PGDAS-D"
                    disabled={!!diagAberto}
                  />

                  <InputMoeda
                    label="DAS Total Declarado"
                    value={form.das_total}
                    onChange={v => setF('das_total', v)}
                    disabled={!!diagAberto}
                  />
                </div>
              )}

              {secao(
                '4. Total do Debito por Tributo',
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      ['IRPJ', 'irpj'],
                      ['CSLL', 'csll'],
                      ['COFINS', 'cofins'],
                      ['PIS/Pasep', 'pis'],
                      ['INSS/CPP', 'inss_cpp'],
                      ['ICMS', 'icms'],
                      ['IPI', 'ipi'],
                      ['ISS', 'iss'],
                    ].map(([label, key]) => (
                      <InputMoeda
                        key={key}
                        label={label}
                        value={form[key]}
                        onChange={v => setF(key, v)}
                        disabled={!!diagAberto}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      background: S.bg,
                      border: `1px solid ${S.border}`,
                      borderRadius: 7,
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: S.muted,
                        fontWeight: 600,
                      }}
                    >
                      Soma dos tributos informados
                    </span>

                    <strong style={{ color: S.navy }}>
                      {fmtR(totalTributos)}
                    </strong>
                  </div>
                </>
              )}

              {secao(
                '5. Debito com Exigibilidade Suspensa',
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                  }}
                >
                  {[
                    ['IRPJ Susp.', 'irpj_susp'],
                    ['CSLL Susp.', 'csll_susp'],
                    ['COFINS Susp.', 'cofins_susp'],
                    ['PIS Susp.', 'pis_susp'],
                    ['INSS Susp.', 'inss_susp'],
                    ['ICMS Susp.', 'icms_susp'],
                    ['IPI Susp.', 'ipi_susp'],
                    ['ISS Susp.', 'iss_susp'],
                  ].map(([label, key]) => (
                    <InputMoeda
                      key={key}
                      label={label}
                      value={form[key]}
                      onChange={v => setF(key, v)}
                      disabled={!!diagAberto}
                    />
                  ))}
                </div>
              )}

              {secao(
                `6. Atividades e Segregacoes (${atividades.length})`,
                atividades.length === 0 ? (
                  <div
                    style={{
                      background: S.bg,
                      border: `1px dashed ${S.border}`,
                      borderRadius: 8,
                      padding: 18,
                      textAlign: 'center',
                      color: S.ghostText,
                      fontSize: 12,
                    }}
                  >
                    Nenhuma atividade carregada. Importe o PDF completo para
                    preencher automaticamente esta estrutura.
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        overflowX: 'auto',
                        border: `1px solid ${S.border}`,
                        borderRadius: 8,
                      }}
                    >
                      <table
                     className="tabela-pgdas-atividades"
                     style={{
                     width: '100%',
                     borderCollapse: 'collapse',
                    fontSize: 11,
                    minWidth: 1100,
                    }}
                    >
                        <thead>
                          <tr style={{ background: S.thBg }}>
                            {[
                              '#',
                              'Atividade',
                              'Anexo',
                              'Receita',
                              'Tratamentos',
                              'IRPJ',
                              'CSLL',
                              'PIS',
                              'COFINS',
                              'CPP',
                              'ICMS',
                              'IPI',
                              'ISS',
                              'Total',
                            ].map(h => (
                              <th
                                key={h}
                                style={{
                             color: S.thText,
                             textAlign: 'left',
                             padding: '8px 9px',
                             fontWeight: 600,
                             whiteSpace: 'nowrap',
                             borderRight: '1px solid #64748B',
                             }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {atividades.map((a, index) => (
                            <tr
                              key={`${a.ordem}-${index}`}
                              style={{
                                borderBottom: `1px solid ${S.border}`,
                              }}
                            >
                              <td
                                style={{
                                  padding: '8px 9px',
                                  fontWeight: 700,
                                  color: S.navy,
                                }}
                              >
                                {a.ordem || index + 1}
                              </td>

                              <td
                                style={{
                                  padding: '8px 9px',
                                  minWidth: 260,
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: S.text,
                                  }}
                                >
                                  {a.descricao ||
                                    a.tipo_atividade ||
                                    'Atividade'}
                                </div>

                                {a.texto_original &&
                                  a.texto_original !== a.descricao && (
                                    <div
                                      style={{
                                        fontSize: 10,
                                        color: S.ghostText,
                                        marginTop: 3,
                                      }}
                                    >
                                      {a.texto_original}
                                    </div>
                                  )}
                              </td>

                              <td style={{ padding: '8px 9px' }}>
                                {a.anexo || '—'}
                              </td>

                              <td
                                style={{
                                  padding: '8px 9px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {fmtR(a.receita)}
                              </td>

                              <td
                                style={{
                                  padding: '8px 9px',
                                  minWidth: 190,
                                }}
                              >
                                <Flag
                                  ativo={a.icms_st}
                                  texto="ICMS-ST"
                                  cor={S.purple}
                                />
                                <Flag
                                  ativo={a.pis_cofins_monofasico}
                                  texto="PIS/COFINS Mono"
                                  cor={S.orange}
                                />
                                <Flag
                                  ativo={
                                    a.antecipacao_com_encerramento
                                  }
                                  texto="Antecipacao"
                                  cor={S.red}
                                />
                                <Flag
                                  ativo={a.iss_retido}
                                  texto="ISS Retido"
                                  cor={S.blue}
                                />
                                <Flag
                                  ativo={a.imunidade}
                                  texto="Imune"
                                  cor={S.green}
                                />
                                <Flag
                                  ativo={a.exportacao}
                                  texto="Exportacao"
                                  cor={S.green}
                                />

                                {!a.icms_st &&
                                  !a.pis_cofins_monofasico &&
                                  !a.antecipacao_com_encerramento &&
                                  !a.iss_retido &&
                                  !a.imunidade &&
                                  !a.exportacao && (
                                    <span
                                      style={{
                                        color: S.ghostText,
                                      }}
                                    >
                                      Normal
                                    </span>
                                  )}
                              </td>

                              {[
                                'irpj',
                                'csll',
                                'pis',
                                'cofins',
                                'inss_cpp',
                                'icms',
                                'ipi',
                                'iss',
                              ].map(campo => (
                                <td
                                  key={campo}
                                  style={{
                                    padding: '8px 9px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {fmtR(a[campo])}
                                </td>
                              ))}

                              <td
                                style={{
                                  padding: '8px 9px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  color: S.navy,
                                }}
                              >
                                {fmtR(a.valor_total_tributos)}
                              </td>
                            </tr>
                          ))}
                        </tbody>

                        <tfoot>
                          <tr style={{ background: S.bg }}>
                            <td
                              colSpan={3}
                              style={{
                                padding: '9px',
                                fontWeight: 700,
                                color: S.navy,
                              }}
                            >
                              Totais das atividades
                            </td>

                            <td
                              style={{
                                padding: '9px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {fmtR(totalReceitaAtividades)}
                            </td>

                            <td />

                            <td colSpan={8} />

                            <td
                              style={{
                                padding: '9px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {fmtR(totalTributosAtividades)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 11,
                        color: S.muted,
                      }}
                    >
                      ICMS-ST e PIS/COFINS monofasico sao tratados como
                      classificacoes independentes.
                    </div>
                  </>
                ),
                'Esta tabela reproduz a estrutura interna do PGDAS-D. Nao consolide atividades diferentes.'
              )}

              {secao(
                '7. Observacoes',
                <textarea
                  value={form.observacoes || ''}
                  onChange={e =>
                    setF('observacoes', e.target.value)
                  }
                  disabled={!!diagAberto}
                  placeholder="Anotacoes sobre a declaracao, inconsistencias ou pendencias."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: `1px solid ${S.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    color: S.text,
                    background: diagAberto ? S.bg : S.white,
                  }}
                />
              )}

              {!diagAberto && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={salvar}
                    disabled={salvando}
                    style={{
                      padding: '9px 24px',
                      background: S.navy,
                      color: S.white,
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: salvando
                        ? 'not-allowed'
                        : 'pointer',
                      opacity: salvando ? 0.7 : 1,
                    }}
                  >
                    {salvando
                      ? 'Salvando declaracao e atividades...'
                      : 'Salvar PGDAS-D'}
                  </button>

                  <button
                    onClick={limparLancamento}
                    style={{
                      padding: '9px 16px',
                      background: 'none',
                      border: `1px solid ${S.border}`,
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: 'pointer',
                      color: S.muted,
                    }}
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* HISTORICO */}
      {aba === 'historico' && (
        <div
          style={{
            background: S.white,
            borderRadius: 10,
            border: `1px solid ${S.border}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${S.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: S.text,
                }}
              >
                Historico de PGDAS-D
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: S.muted,
                  marginTop: 2,
                }}
              >
                Declaracoes originais e retificadoras registradas para o
                cliente.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={carregarHistorico}
                disabled={loadingHistorico}
                style={{
                  padding: '6px 12px',
                  background: 'none',
                  border: `1px solid ${S.border}`,
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: S.muted,
                }}
              >
                {loadingHistorico ? 'Carregando...' : 'Atualizar'}
              </button>

              <button
                onClick={novoLancamento}
                style={{
                  padding: '6px 14px',
                  background: S.blue,
                  color: S.white,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Novo Lancamento
              </button>
            </div>
          </div>
		  
		  <style>{`
  .pgdas-historico-table {
    border: 1px solid #E6EBF1;
  }

  .pgdas-historico-table th {
    border-right: 1px solid rgba(255,255,255,0.14);
    border-bottom: 1px solid #DDE4EC;
  }

  .pgdas-historico-table td {
    border-right: 1px solid #E8EDF3;
    border-bottom: 1px solid #E8EDF3;
  }

  .pgdas-historico-table th:last-child,
  .pgdas-historico-table td:last-child {
    border-right: none;
  }
`}</style>

          <div style={{ overflowX: 'auto' }}>
            <table
			className="pgdas-historico-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                minWidth: 1200,
              }}
            >
              <thead>
                <tr style={{ background: S.thBg }}>
                  {[
                    'Competencia',
                    'Tipo',
                    'Declaracao',
                    'RPA',
                    'RBT12',
                    'DAS',
                    'PIS',
                    'COFINS',
                    'ICMS',
                    'Total Tributos',
                    'Status',
                    'Criado em',
                    'Acoes',
                  ].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        color: S.thText,
                        fontWeight: 600,
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {historicoPagina.map((diag, i) => (
                  <tr
                    key={diag.id}
                    style={{
                      borderBottom: `1px solid ${S.border}`,
                      background:
                        i % 2 === 0 ? S.white : '#FAFAFA',
                    }}
                  >
                    <td
                      style={{
                        padding: '8px 10px',
                        fontWeight: 700,
                        color: S.navy,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {diag.competencia || '—'}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      <Badge
                        tipo={
                          diag.tipo_declaracao
                            ?.toLowerCase()
                            .includes('retific')
                            ? 'retificadora'
                            : 'original'
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding: '8px 10px',
                        color: S.muted,
                      }}
                    >
                      {diag.num_declaracao || '—'}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      {fmtR(diag.receita_bruta_total)}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      {fmtR(diag.rbt12)}
                    </td>

                    <td
                      style={{
                        padding: '8px 10px',
                        color: S.red,
                        fontWeight: 700,
                      }}
                    >
                      {fmtR(diag.das_recolhido)}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      {fmtR(diag.pis)}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      {fmtR(diag.cofins)}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      {fmtR(diag.icms)}
                    </td>

                    <td
                      style={{
                        padding: '8px 10px',
                        fontWeight: 600,
                      }}
                    >
                      {fmtR(diag.total_tributos)}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      <Badge tipo={diag.status || 'concluido'} />
                    </td>

                    <td
                      style={{
                        padding: '8px 10px',
                        color: S.muted,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtData(diag.created_at)}
                    </td>

                    <td style={{ padding: '8px 10px' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                        }}
                      >
                        <button
                          onClick={() => abrirDiagnostico(diag)}
                          disabled={carregandoDiag}
                          style={{
                            padding: '4px 10px',
                            background: S.navy,
                            color: S.white,
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Abrir
                        </button>

                        <button
                          onClick={() => excluir(diag.id)}
                          style={{
                            padding: '4px 10px',
                            background: '#fef2f2',
                            color: S.red,
                            border: `1px solid #fecaca`,
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loadingHistorico && historico.length === 0 && (
                  <tr>
                    <td
                      colSpan={13}
                      style={{
                        padding: 24,
                        textAlign: 'center',
                        color: S.ghostText,
                      }}
                    >
                      Nenhum PGDAS-D salvo para este cliente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {historico.length > 0 && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: `1px solid ${S.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                color: S.muted,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span>
                {historico.length} declaracao(es) — Pagina {pagina} de{' '}
                {totalPaginas}
              </span>

              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                <button
                  onClick={() => setPagina(1)}
                  disabled={pagina === 1}
                >
                  «
                </button>

                <button
                  onClick={() =>
                    setPagina(p => Math.max(1, p - 1))
                  }
                  disabled={pagina === 1}
                >
                  &lt;
                </button>

                <button
                  onClick={() =>
                    setPagina(p =>
                      Math.min(totalPaginas, p + 1)
                    )
                  }
                  disabled={pagina === totalPaginas}
                >
                  &gt;
                </button>

                <button
                  onClick={() => setPagina(totalPaginas)}
                  disabled={pagina === totalPaginas}
                >
                  »
                </button>

                <select
                  value={porPagina}
                  onChange={e => {
                    setPorPagina(Number(e.target.value))
                    setPagina(1)
                  }}
                  style={{
                    marginLeft: 8,
                    padding: '3px 8px',
                    border: `1px solid ${S.border}`,
                    borderRadius: 4,
                    fontSize: 12,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {[10, 25, 50, 100].map(n => (
                    <option key={n} value={n}>
                      {n} por pagina
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
  )
}