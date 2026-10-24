import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#E4E7EC', border:'#C8D0DC',
  text:'#1E293B', muted:'#64748B',
}

const fmtR = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtVal = v => {
  const s = String(v||0)
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g,'').replace(',','.')) || 0
  if (s.includes(',')) return parseFloat(s.replace(',','.')) || 0
  return parseFloat(s) || 0
}
const fmtExibir = v => {
  const n = parseFloat(v) || 0
  if (n === 0) return ''
  return n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})
}

function normalizarDataSalvar(d) {
  if (!d) return null
  // já está no formato AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  // formato DD/MM/AAAA → converter
  const partes = d.split('/')
  if (partes.length === 3) {
    const convertida = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`
    if (/^\d{4}-\d{2}-\d{2}$/.test(convertida)) return convertida
  }
  return null
}

const CAMPOS_VAZIOS = {
  numero_cda:'', devedor:'', cnpj_devedor:'',
  pgfn_origem:'', livro_folha:'', processo_administrativo:'',
  documento_origem:'', orgao_origem:'', ufir_conversao:'',
  data_inscricao:'', data_calculo:'', data_referencia_valores:'',
  periodo_divida_inicio:'', periodo_divida_fim:'',
  data_fato_gerador:'', data_constituicao_definitiva:'',
  data_ajuizamento:'', data_citacao:'', data_ultima_movimentacao:'',
  valor_originario:'', principal_atualizado:'', juros:'', multa:'', encargo_legal:'', valor_total:'',
  total_sem_desconto:'', fundamento_legal:'',
  municipio:'', uf:'', tipo_debito:'previdenciario',
  modalidade_lancamento:'oficio',
  modalidade_transacao:'transacao_edital',
  desconto_valor:'', desconto_percentual:'',
  valor_entrada:'', qt_parcelas:'', valor_parcela:'',
  socio_1:'', socio_2:'', socio_3:'',
  possui_execucao_fiscal: false,
  numero_processo_execucao:'',
  trf_regiao:'',
  vara_execucao:'',
  observacoes:'',
  data_vencimento_original:'',
  inscricoes:[]
}

const TIPOS_DEBITO = [
  { key:'tributario_federal',   label:'Tributário Federal' },
  { key:'previdenciario',       label:'Previdenciário' },
  { key:'fgts',                 label:'FGTS' },
  { key:'simples_nacional',     label:'Simples Nacional' },
  { key:'multa_tributaria',     label:'Multa Tributária' },
  { key:'multa_trabalhista',    label:'Multa Trabalhista' },
  { key:'nao_tributario',       label:'Não Tributário' },
  { key:'outro',                label:'Outro' },
]

const MODALIDADES_LANCAMENTO = [
  { key:'oficio',      label:'De ofício / Declaração (art. 173 CTN)' },
  { key:'homologacao', label:'Por homologação (art. 150 CTN)' },
]

const TRF_REGIOES = [
  { key:'',     label:'— Selecione o TRF —' },
  { key:'TRF1', label:'TRF 1ª Região — DF, GO, MT, PA, AM, RO, AC, RR, AP, MA, PI, BA, MG, TO' },
  { key:'TRF2', label:'TRF 2ª Região — RJ, ES' },
  { key:'TRF3', label:'TRF 3ª Região — SP, MS' },
  { key:'TRF4', label:'TRF 4ª Região — RS, SC, PR' },
  { key:'TRF5', label:'TRF 5ª Região — PE, AL, SE, CE, RN, PB' },
  { key:'TRF6', label:'TRF 6ª Região — MG' },
]

let pdfjsLoadPromise = null

async function carregarPDFJS() {
  const PDFJS_VERSION = '3.11.174'

  if (window['pdfjs-dist/build/pdf']) {
    const pdfjsLib = window['pdfjs-dist/build/pdf']
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`
    return pdfjsLib
  }

  if (!pdfjsLoadPromise) {
    pdfjsLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  await pdfjsLoadPromise

  const pdfjsLib = window['pdfjs-dist/build/pdf']
  if (!pdfjsLib) throw new Error('PDF.js não foi carregado corretamente.')

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`

  return pdfjsLib
}

async function extrairTextoPDF(file, onProgress) {
  const inicio = performance.now()
  onProgress?.(10, 'Preparando o PDF...')

  const pdfjsLib = await carregarPDFJS()
  onProgress?.(15, 'Lendo o arquivo...')

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPaginas = Math.min(pdf.numPages, 20)

  // Mesmo padrão do PGDAS-D: PDF.js primeiro, até 20 páginas; Promise.all preserva a ordem final.
  let concluidas = 0
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1)

  const textos = await Promise.all(
    paginas.map(async numeroPagina => {
      const page = await pdf.getPage(numeroPagina)
      const textContent = await page.getTextContent()
      const texto = textContent.items.map(item => item.str).join(' ')

      concluidas += 1
      const pct = 15 + Math.round((concluidas / totalPaginas) * 30)
      onProgress?.(pct, `Lendo páginas... ${concluidas}/${totalPaginas}`)

      return texto.trim()
        ? `\n--- PÁGINA ${numeroPagina} ---\n${texto}`
        : ''
    })
  )

  const textoTotal = textos.join('')
  console.info(
    `[CDA] PDF.js: ${totalPaginas} página(s), ${textoTotal.trim().length} caracteres, ` +
    `${((performance.now() - inicio) / 1000).toFixed(2)}s`
  )

  return textoTotal
}

async function pdfParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const PROMPT_JSON = `Analise o texto abaixo de documentos da PGFN (CDA + Petição Inicial de Execução Fiscal + Discriminativo de Crédito) e retorne APENAS este JSON completo.

REGRAS CRÍTICAS DE EXTRAÇÃO:
1. "numero_cda" = campo "Nm.Inscrição Dívida Ativa" ou "Credito" (ex: 13.775.238-5) — NUNCA confundir com PGFN de Origem
2. "pgfn_origem" = campo "PGFN de Origem" ou "Tramitacao" (ex: 21.200.800)
3. "orgao_origem" = campo "Orgao de Origem" (ex: 21.200.010)
4. "documento_origem" = campo "Documento Original" (ex: DCGB - DCG BATCH)
5. "devedor" = nome completo do devedor/executado
6. "cnpj_devedor" = campo CGC, CNPJ ou Identificacao do devedor
7. TODOS os valores numéricos sem formatação (ex: 16227.82 não 16.227,82)
8. "data_inscricao" = campo "Data de Inscricao" — formato DD/MM/AAAA
9. "data_calculo" = campo "Data do Calculo" ou "Calculado em" — formato DD/MM/AAAA
10. "data_referencia_valores" = data para a qual os valores foram atualizados (ex: "01/2022")
11. "ufir_conversao" = procure na CDA e no Discriminativo de Crédito por "UFIR de conversão" (ou equivalente) e retorne exatamente o valor impresso (ex: 0.9108); nunca estime.
12. "periodo_divida_inicio" = primeiro mês/ano do período da dívida — formato MM/AAAA
13. "periodo_divida_fim" = último mês/ano do período da dívida — formato MM/AAAA
14. "data_fato_gerador" = primeiro período de competência do discriminativo — formato AAAA-MM-DD
15. "data_constituicao_definitiva" = data da inscrição em dívida ativa — formato AAAA-MM-DD
16. "data_ajuizamento" = data da petição inicial da execução fiscal — formato AAAA-MM-DD
17. "data_citacao" = data de citação do executado — formato AAAA-MM-DD
18. "modalidade_lancamento" = se mencionar "homologação" use "homologacao"; caso contrário use "oficio"
19. "tipo_debito" = Lei 8.212/91 = "previdenciario"; LC 123/2006 = "simples_nacional"; Lei 8.036/90 = "fgts"; outros = "tributario_federal"
20. "encargo_legal" = valor do encargo legal expressamente indicado na CDA/discriminativo; se não houver valor destacado, use 0 — NÃO estime
21. "fundamento_legal" = códigos F.Legal encontrados na CDA
22. "socio_1", "socio_2", "socio_3" = nomes de sócios/responsáveis solidários
23. "numero_processo_execucao" = número CNJ da execução fiscal, quando houver (ex: 0001234-56.2019.4.03.6100). Não confundir com processo administrativo.
24. "possui_execucao_fiscal" = true quando houver petição inicial, número de processo judicial, vara/juízo ou indicação inequívoca de execução fiscal; caso contrário false.
25. "trf_regiao" = TRF1, TRF2, TRF3, TRF4, TRF5 ou TRF6 quando identificável no processo.
26. "vara_execucao" = vara/juízo da execução fiscal exatamente como constar no documento.

JSON a retornar:
{
  "numero_cda": "",
  "devedor": "",
  "cnpj_devedor": "",
  "pgfn_origem": "",
  "orgao_origem": "",
  "documento_origem": "",
  "livro_folha": "",
  "processo_administrativo": "",
  "data_inscricao": "",
  "data_calculo": "",
  "data_referencia_valores": "",
  "ufir_conversao": "",
  "periodo_divida_inicio": "",
  "periodo_divida_fim": "",
  "data_fato_gerador": "",
  "data_constituicao_definitiva": "",
  "data_ajuizamento": "",
  "data_citacao": "",
  "data_ultima_movimentacao": "",
  "valor_originario": 0,
  "principal_atualizado": 0,
  "juros": 0,
  "multa": 0,
  "encargo_legal": 0,
  "valor_total": 0,
  "fundamento_legal": "",
  "municipio": "",
  "uf": "",
  "tipo_debito": "previdenciario",
  "modalidade_lancamento": "oficio",
  "possui_execucao_fiscal": false,
  "numero_processo_execucao": "",
  "trf_regiao": "",
  "vara_execucao": "",
  "socio_1": "",
  "socio_2": "",
  "socio_3": ""
}`


const PROMPT_INSCRICOES = `Analise o documento e retorne APENAS JSON válido neste formato:
{
  \"inscricoes\": [
    {
      \"numero\": \"\",
      \"tipo_credito\": \"tributario_federal\",
      \"periodo_inicio\": \"\",
      \"periodo_fim\": \"\",
      \"data_fato_gerador\": \"\",
      \"data_vencimento\": \"\",
      \"data_constituicao\": \"\",
      \"data_inscricao\": \"\",
      \"valor_originario\": 0,
      \"principal_atualizado\": 0,
      \"juros\": 0,
      \"multa\": 0,
      \"encargo_legal\": 0,
      \"valor\": 0,
      \"fundamento_legal\": \"\",
      \"modalidade_lancamento\": \"oficio\"
    }
  ]
}

REGRAS:
- Liste cada inscrição/crédito individual separadamente quando o documento trouxer créditos, competências ou inscrições distintas.
- Não invente dados. Campo não encontrado = string vazia ou 0.
- Preserve datas e valores próprios de cada crédito quando existirem.
- Use números sem formatação brasileira.
- Retorne somente o objeto JSON, sem markdown ou explicações.`

function obterUfirExtraida(dados = {}) {
  const candidatos = [
    dados.ufir_conversao,
    dados.ufir,
    dados.valor_ufir,
    dados.valorUfir,
    dados.ufirConversao,
    dados.fator_ufir,
    dados.fatorUfir,
  ]

  for (const valor of candidatos) {
    if (valor === null || valor === undefined) continue
    const texto = String(valor).trim()
    if (!texto) continue

    const normalizado = texto
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^0-9.\-]/g, '')

    if (normalizado && Number.isFinite(Number(normalizado))) {
      return normalizado
    }
  }

  return ''
}

function normalizarInscricoesExtraidas(dados = {}) {
  const lista = Array.isArray(dados.inscricoes) ? dados.inscricoes : []
  const tipoPadrao = dados.tipo_debito || 'tributario_federal'
  const fallback = {
    numero: dados.numero_cda || '',
    tipo_credito: tipoPadrao,
    periodo_inicio: dados.periodo_divida_inicio || '',
    periodo_fim: dados.periodo_divida_fim || '',
    data_fato_gerador: dados.data_fato_gerador || '',
    data_vencimento: dados.data_vencimento_original || '',
    data_constituicao: dados.data_constituicao_definitiva || dados.data_inscricao || '',
    data_inscricao: dados.data_inscricao || '',
    valor_originario: dados.valor_originario || 0,
    principal_atualizado: dados.principal_atualizado || 0,
    juros: dados.juros || 0,
    multa: dados.multa || 0,
    encargo_legal: dados.encargo_legal || 0,
    valor: dados.valor_total || 0,
    fundamento_legal: dados.fundamento_legal || '',
    modalidade_lancamento: dados.modalidade_lancamento || 'oficio',
  }

  const origem = lista.length ? lista : [fallback]
  return origem.map((ins, idx) => ({
    numero: String(ins?.numero || (idx === 0 ? dados.numero_cda : '') || '').trim(),
    tipo_credito: ins?.tipo_credito || tipoPadrao,
    periodo_inicio: ins?.periodo_inicio || ins?.periodo_divida_inicio || (idx === 0 ? dados.periodo_divida_inicio : '') || '',
    periodo_fim: ins?.periodo_fim || ins?.periodo_divida_fim || (idx === 0 ? dados.periodo_divida_fim : '') || '',
    data_fato_gerador: ins?.data_fato_gerador || (idx === 0 ? dados.data_fato_gerador : '') || '',
    data_vencimento: ins?.data_vencimento || ins?.data_vencimento_original || '',
    data_constituicao: ins?.data_constituicao || ins?.data_constituicao_definitiva || (idx === 0 ? (dados.data_constituicao_definitiva || dados.data_inscricao) : '') || '',
    data_inscricao: ins?.data_inscricao || (idx === 0 ? dados.data_inscricao : '') || '',
    valor_originario: Number(ins?.valor_originario || 0),
    principal_atualizado: Number(ins?.principal_atualizado || 0),
    juros: Number(ins?.juros || 0),
    multa: Number(ins?.multa || 0),
    encargo_legal: Number(ins?.encargo_legal || 0),
    valor: Number(ins?.valor ?? ins?.valor_total ?? 0),
    fundamento_legal: ins?.fundamento_legal || '',
    modalidade_lancamento: ins?.modalidade_lancamento || dados.modalidade_lancamento || 'oficio',
  }))
}

async function parsearJSON(resposta) {
  if (resposta && typeof resposta === 'object') return resposta
  const textoLimpo = String(resposta).replace(/```json/gi, '').replace(/```/g, '').trim()
  const ini = textoLimpo.indexOf('{')
  const fim = textoLimpo.lastIndexOf('}')
  if (ini === -1 || fim === -1 || fim <= ini) throw new Error('IA não retornou nenhum objeto JSON')
  try { return JSON.parse(textoLimpo.slice(ini, fim + 1)) }
  catch (e) { throw new Error('IA retornou JSON malformado: ' + e.message) }
}

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))

async function respostaIndicaQuotaEsgotada(resp) {
  if (!resp || resp.ok) return false
  try {
    const texto = (await resp.clone().text()).toLowerCase()
    return (
      texto.includes('exceeded your current quota') ||
      texto.includes('quota exceeded') ||
      texto.includes('resource_exhausted') ||
      texto.includes('check your plan and billing') ||
      texto.includes('current quota')
    )
  } catch {
    return false
  }
}

async function fetchComRetry(url, options, tentativas = 3) {
  let ultimaResposta = null

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resp = await fetch(url, options)
      ultimaResposta = resp

      if (resp.ok) return resp

      // Cota esgotada não melhora com retry. Para na primeira resposta.
      if (await respostaIndicaQuotaEsgotada(resp)) return resp

      const podeRepetir = [429, 500, 502, 503, 504].includes(resp.status)
      if (!podeRepetir || tentativa === tentativas) return resp

      await esperar(tentativa * 1500)
    } catch (erro) {
      if (tentativa === tentativas) throw erro
      await esperar(tentativa * 1500)
    }
  }

  return ultimaResposta
}

function traduzirErroIA(mensagem = '', status = 0) {
  const msg = String(mensagem || '').toLowerCase()

  if (
    msg.includes('exceeded your current quota') ||
    msg.includes('quota exceeded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('check your plan and billing') ||
    msg.includes('current quota')
  ) {
    return 'O limite de uso da inteligência artificial foi atingido no momento. Aguarde a liberação da cota e tente novamente mais tarde.'
  }

  if (
    msg.includes('high demand') ||
    msg.includes('experiencing high demand') ||
    msg.includes('try again later')
  ) {
    return 'O serviço de inteligência artificial está com alta demanda no momento. Aguarde alguns instantes e tente novamente.'
  }

  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'O serviço recebeu muitas solicitações em pouco tempo. Aguarde alguns instantes e tente novamente.'
  }

  if ([500, 502, 503, 504].includes(Number(status))) {
    return 'O serviço de inteligência artificial está temporariamente indisponível. Tente novamente em alguns instantes.'
  }

  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'A análise demorou mais do que o esperado e foi interrompida. Tente novamente.'
  }

  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('connection')
  ) {
    return 'Não foi possível conectar ao serviço de análise. Verifique sua conexão e tente novamente.'
  }

  return mensagem
    ? `Não foi possível concluir a análise: ${mensagem}`
    : 'Não foi possível concluir a análise da CDA. Tente novamente.'
}

async function chamarIA(session, body) {
  const inicio = performance.now()

  const resp = await fetchComRetry(
    'https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    }
  )

  const data = await resp.json()

  console.info(
    `[CDA] IA ${body?.model || 'modelo'}: ${((performance.now() - inicio) / 1000).toFixed(2)}s`
  )

  if (!resp.ok || data?.error) {
    const msg = typeof data?.error === 'string'
      ? data.error
      : data?.error?.message || `Erro HTTP ${resp.status}`

    const mensagemPtBr = traduzirErroIA(msg, resp.status)

    console.error('ERRO NA ANÁLISE DA CDA:', {
      status: resp.status,
      mensagem: mensagemPtBr,
      detalheTecnico: msg,
    })

    throw new Error(mensagemPtBr)
  }

  return data?.resposta ?? data?.resultado ?? data?.content ?? data?.message ?? ''
}

async function analisarTextoComIA(texto, session) {
  // 1) Extração principal: mantém exatamente o prompt legado que já estava homologado.
  const respostaBase = await chamarIA(session, {
    model: 'llama-3.3-70b-versatile',
    system: 'Você é um extrator especializado de dados de CDA da PGFN e Execução Fiscal brasileira. Retorne APENAS JSON válido, sem markdown, sem explicações.',
    messages: [{ role: 'user', content: `${PROMPT_JSON}\n\nTEXTO DOS DOCUMENTOS:\n${texto.slice(0, 20000)}` }]
  })
  const dados = await parsearJSON(respostaBase)

  // 2) Inscrições individualizadas em chamada separada. Se falhar, NÃO derruba a importação.
  try {
    const respostaInscricoes = await chamarIA(session, {
      model: 'llama-3.3-70b-versatile',
      system: 'Extraia inscrições/créditos individualizados de CDA. Retorne somente JSON válido.',
      messages: [{ role: 'user', content: `${PROMPT_INSCRICOES}\n\nTEXTO DOS DOCUMENTOS:\n${texto.slice(0, 20000)}` }]
    })
    const objInscricoes = await parsearJSON(respostaInscricoes)
    if (Array.isArray(objInscricoes?.inscricoes)) dados.inscricoes = objInscricoes.inscricoes
  } catch (e) {
    console.warn('[CDA] Extração individual das inscrições falhou; mantendo importação principal.', e?.message || e)
  }

  return dados
}

async function analisarPDFEscaneadoComGemini(file, session) {
  console.log('PDF escaneado — enviando PDF completo ao Gemini...')
  const base64 = await pdfParaBase64(file)
  const conteudoPdf = {
    type: 'inline_data',
    inline_data: { mime_type: 'application/pdf', data: base64 }
  }

  // 1) Extração principal com o prompt legado que já funcionava antes da V4.
  const respostaBase = await chamarIA(session, {
    model: 'gemini-3.5-flash',
    system: 'Você é um extrator especializado de dados de CDA da PGFN e Execução Fiscal brasileira. Retorne APENAS JSON válido, sem markdown, sem explicações.',
    messages: [{
      role: 'user',
      content: [conteudoPdf, { type: 'text', text: PROMPT_JSON }]
    }]
  })

  let dados
  try {
    dados = await parsearJSON(respostaBase)
  } catch (e) {
    console.error('[CDA] Resposta principal do Gemini sem JSON reconhecível:', String(respostaBase || '').slice(0, 800))
    throw e
  }

  // 2) Segunda leitura só para as inscrições. É opcional: se falhar, a CDA continua importando.
  try {
    const respostaInscricoes = await chamarIA(session, {
      model: 'gemini-3.5-flash',
      system: 'Extraia inscrições/créditos individualizados de CDA. Retorne somente JSON válido.',
      messages: [{
        role: 'user',
        content: [conteudoPdf, { type: 'text', text: PROMPT_INSCRICOES }]
      }]
    })
    const objInscricoes = await parsearJSON(respostaInscricoes)
    if (Array.isArray(objInscricoes?.inscricoes)) dados.inscricoes = objInscricoes.inscricoes
  } catch (e) {
    console.warn('[CDA] Extração individual das inscrições falhou; mantendo importação principal.', e?.message || e)
  }

  return dados
}

async function analisarComIA(file, onProgress) {
  const inicioTotal = performance.now()
  onProgress?.(5, 'Preparando importação...')

  // Ganha tempo fazendo autenticação e leitura do PDF simultaneamente.
  const sessaoPromise = supabase.auth.getSession()
  const textoPromise = extrairTextoPDF(file, onProgress)

  const [
    { data: { session } },
    texto,
  ] = await Promise.all([sessaoPromise, textoPromise])

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Entre novamente no sistema.')
  }

  const caracteres = texto?.trim().length || 0
  console.info(`[CDA] Texto pesquisável encontrado: ${caracteres} caracteres`)

  if (caracteres >= 50) {
    console.info('[CDA] MODO RÁPIDO: PDF.js + Groq textual')
    onProgress?.(55, 'Texto encontrado. Extraindo os dados da CDA...')
    const dados = await analisarTextoComIA(texto, session)
    onProgress?.(94, 'Dados recebidos. Organizando a CDA...')
    console.info(`[CDA] TEMPO TOTAL: ${((performance.now() - inicioTotal) / 1000).toFixed(2)}s`)
    return dados
  }

  // PDF sem camada de texto: este caminho é naturalmente mais lento,
  // pois exige análise visual do documento completo.
  console.info('[CDA] MODO VISUAL: PDF escaneado → Gemini')
  onProgress?.(52, 'PDF escaneado. Iniciando leitura visual...')
  const dados = await analisarPDFEscaneadoComGemini(file, session)
  onProgress?.(94, 'Leitura visual concluída. Organizando a CDA...')
  console.info(`[CDA] TEMPO TOTAL: ${((performance.now() - inicioTotal) / 1000).toFixed(2)}s`)
  return dados
}

function SeletorClienteInterno({ onSelecionar }) {
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data } = await supabase.from('clientes').select('id,razao_social,cnpj').eq('usuario_id', user.id).order('razao_social')
        if (data) setClientes(data)
      } catch(e) {}
      setCarregando(false)
    }
    carregar()
  }, [])

  function confirmar() {
    const c = clientes.find(x => x.id.toString() === clienteSelecionado)
    if (c) onSelecionar(c)
  }

  return (
    <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:10,padding:'16px 20px',marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:700,color:'#92400E',marginBottom:10}}>
        ⚠️ Nenhum cliente ativo — selecione o cliente para vincular esta CDA:
      </div>
      {carregando ? (
        <div style={{fontSize:13,color:C.muted}}>Carregando clientes...</div>
      ) : clientes.length === 0 ? (
        <div style={{fontSize:13,color:C.muted}}>Nenhum cliente cadastrado. Cadastre um cliente primeiro.</div>
      ) : (
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <select value={clienteSelecionado} onChange={e=>setClienteSelecionado(e.target.value)}
            style={{flex:1,minWidth:220,padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
            <option value=''>— Selecione o cliente —</option>
            {clientes.map(c=>(
              <option key={c.id} value={c.id.toString()}>{c.razao_social}{c.cnpj?' · '+c.cnpj:''}</option>
            ))}
          </select>
          <button onClick={confirmar} disabled={!clienteSelecionado}
            style={{padding:'8px 18px',background:clienteSelecionado?C.navy:'#94a3b8',color:'#fff',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:clienteSelecionado?'pointer':'not-allowed'}}>
            Confirmar
          </button>
        </div>
      )}
    </div>
  )
}

function imprimirCDA(campos, clienteEfetivo) {
  const w = window.open('', '_blank')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CDA ${campos.numero_cda}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;color:#1E293B;margin:20px}
    h2{font-size:12px;color:#0B1F4D;margin:14px 0 6px;border-bottom:1px solid #C8D0DC;padding-bottom:4px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:8px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 20px;margin-bottom:8px}
    .campo{margin-bottom:4px}
    .label{font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px}
    .valor{font-size:11px;color:#1E293B;font-weight:500}
    .valor-destaque{font-size:13px;font-weight:700;color:#0B1F4D}
    .header{background:#0B1F4D;color:#fff;padding:12px 16px;border-radius:6px;margin-bottom:16px}
    .aviso{background:#FFFBEB;border:1px solid #FCD34D;border-radius:4px;padding:8px 10px;font-size:10px;color:#92400E;margin-top:16px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#0B1F4D;color:#fff;padding:5px 8px;text-align:left}
    td{padding:5px 8px;border-bottom:1px solid #E2E8F0}
    @media print{body{margin:10px}}
  </style></head><body>
  <div class="header">
    <div style="font-size:9px;color:#93c5fd;letter-spacing:2px">FISCALTRIB — DÍVIDA ATIVA</div>
    <div style="font-size:16px;font-weight:900">📄 Certidão de Dívida Ativa — CDA</div>
    <div style="font-size:11px;color:#93c5fd;margin-top:4px">${clienteEfetivo?.razao_social||''} ${clienteEfetivo?.cnpj?'· '+clienteEfetivo.cnpj:''}</div>
  </div>

  <h2>🔖 Identificação</h2>
  <div class="grid">
    <div class="campo"><div class="label">Nº Inscrição Dívida Ativa</div><div class="valor-destaque">${campos.numero_cda||'—'}</div></div>
    <div class="campo"><div class="label">PGFN de Origem</div><div class="valor">${campos.pgfn_origem||'—'}</div></div>
    <div class="campo"><div class="label">Órgão de Origem</div><div class="valor">${campos.orgao_origem||'—'}</div></div>
    <div class="campo"><div class="label">Documento de Origem</div><div class="valor">${campos.documento_origem||'—'}</div></div>
    <div class="campo"><div class="label">Livro / Folha</div><div class="valor">${campos.livro_folha||'—'}</div></div>
    <div class="campo"><div class="label">Processo Administrativo</div><div class="valor">${campos.processo_administrativo||'—'}</div></div>
    <div class="campo"><div class="label">Data de Inscrição</div><div class="valor">${campos.data_inscricao||'—'}</div></div>
    <div class="campo"><div class="label">Data do Cálculo</div><div class="valor">${campos.data_calculo||'—'}</div></div>
    <div class="campo"><div class="label">Data Referência Valores</div><div class="valor">${campos.data_referencia_valores||'—'}</div></div>
    <div class="campo"><div class="label">UFIR de Conversão</div><div class="valor">${campos.ufir_conversao||'—'}</div></div>
  </div>

  <h2>👤 Devedor</h2>
  <div class="grid">
    <div class="campo"><div class="label">Razão Social / Nome</div><div class="valor">${campos.devedor||'—'}</div></div>
    <div class="campo"><div class="label">CNPJ / CPF</div><div class="valor">${campos.cnpj_devedor||'—'}</div></div>
    <div class="campo"><div class="label">Município</div><div class="valor">${campos.municipio||'—'}</div></div>
    <div class="campo"><div class="label">UF</div><div class="valor">${campos.uf||'—'}</div></div>
  </div>

  <h2>📅 Datas Jurídicas</h2>
  <div class="grid3">
    <div class="campo"><div class="label">Fato Gerador (1º período)</div><div class="valor">${campos.data_fato_gerador||'—'}</div></div>
    <div class="campo"><div class="label">Constituição Definitiva</div><div class="valor">${campos.data_constituicao_definitiva||'—'}</div></div>
    <div class="campo"><div class="label">Data de Inscrição DA</div><div class="valor">${campos.data_inscricao||'—'}</div></div>
    <div class="campo"><div class="label">Data do Ajuizamento</div><div class="valor">${campos.data_ajuizamento||'—'}</div></div>
    <div class="campo"><div class="label">Data da Citação</div><div class="valor">${campos.data_citacao||'—'}</div></div>
    <div class="campo"><div class="label">Modalidade Lançamento</div><div class="valor">${campos.modalidade_lancamento==='homologacao'?'Por homologação (art. 150 CTN)':'De ofício / Declaração (art. 173 CTN)'}</div></div>
  </div>

  <h2>💰 Período e Valores</h2>
  <div class="grid">
    <div class="campo"><div class="label">Período Início</div><div class="valor">${campos.periodo_divida_inicio||'—'}</div></div>
    <div class="campo"><div class="label">Período Fim</div><div class="valor">${campos.periodo_divida_fim||'—'}</div></div>
  </div>
  <table>
    <tr><th>Valor Originário</th><th>Princ. Atualizado</th><th>Juros</th><th>Multa</th><th>TOTAL</th></tr>
    <tr>
      <td>R$ ${campos.valor_originario||'0,00'}</td>
      <td>R$ ${campos.principal_atualizado||'0,00'}</td>
      <td>R$ ${campos.juros||'0,00'}</td>
      <td>R$ ${campos.multa||'0,00'}</td>
      <td style="font-weight:700;color:#0B1F4D">R$ ${campos.valor_total||'0,00'}</td>
    </tr>
  </table>

  <h2>⚖️ Dados para Transação</h2>
  <div class="grid">
    <div class="campo"><div class="label">Tipo de Débito</div><div class="valor">${campos.tipo_debito||'—'}</div></div>
    <div class="campo"><div class="label">Encargo Legal</div><div class="valor">R$ ${campos.encargo_legal||'0,00'}</div></div>
    <div class="campo"><div class="label">Encaminhamento</div><div class="valor">Simular no módulo Transação Tributária após salvar a CDA</div></div>
  </div>

  ${campos.possui_execucao_fiscal ? `
  <h2>⚖️ Execução Fiscal</h2>
  <div class="grid3">
    <div class="campo"><div class="label">Nº Processo</div><div class="valor">${campos.numero_processo_execucao||'—'}</div></div>
    <div class="campo"><div class="label">TRF</div><div class="valor">${campos.trf_regiao||'—'}</div></div>
    <div class="campo"><div class="label">Vara</div><div class="valor">${campos.vara_execucao||'—'}</div></div>
  </div>` : ''}

  ${(campos.socio_1||campos.socio_2||campos.socio_3) ? `
  <h2>👥 Sócios / Responsáveis</h2>
  <div class="grid3">
    ${campos.socio_1?`<div class="campo"><div class="label">Sócio 1</div><div class="valor">${campos.socio_1}</div></div>`:''}
    ${campos.socio_2?`<div class="campo"><div class="label">Sócio 2</div><div class="valor">${campos.socio_2}</div></div>`:''}
    ${campos.socio_3?`<div class="campo"><div class="label">Sócio 3</div><div class="valor">${campos.socio_3}</div></div>`:''}
  </div>` : ''}

  ${campos.fundamento_legal ? `<h2>📋 Fundamento Legal</h2><p style="font-size:10px;line-height:1.6">${campos.fundamento_legal}</p>` : ''}
  ${campos.observacoes ? `<h2>📝 Observações</h2><p style="font-size:10px;line-height:1.6">${campos.observacoes}</p>` : ''}

  <div class="aviso">⚠️ Documento gerado pelo FiscalTrib em ${new Date().toLocaleString('pt-BR')} · fiscaltrib.com.br</div>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`
  w.document.write(html)
  w.document.close()
}

export default function ImportarCDA({ active, onSalvo, onDiagnostico, onVoltar }) {
  const [etapa, setEtapa] = useState('upload')
  const [extraindo, setExtraindo] = useState(false)
  const [progressoImportacao, setProgressoImportacao] = useState(0)
  const [faseImportacao, setFaseImportacao] = useState('')
  const [campos, setCampos] = useState({...CAMPOS_VAZIOS})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [cdaSalvaId, setCdaSalvaId] = useState(null)
  const [numeroCdaSessao, setNumeroCdaSessao] = useState(1)
  const inputRef = useRef()

  const [clienteEfetivo, setClienteEfetivo] = useState(active?.id ? active : null)
  useEffect(() => { setClienteEfetivo(active?.id ? active : null) }, [active])

  // Pré-aquece o mesmo leitor usado no PGDAS-D enquanto o usuário escolhe o arquivo.
  useEffect(() => {
    carregarPDFJS().catch(() => {})
    supabase.auth.getSession().catch(() => {})
  }, [])

  async function handleArquivo(file) {
    if (!file || file.type !== 'application/pdf') { setErro('Selecione um arquivo PDF válido.'); return }
    setErro('')
    setExtraindo(true)
    setProgressoImportacao(3)
    setFaseImportacao('Iniciando importação da CDA...')

    let progressoVisualTimer = null
    const atualizarProgresso = (pct, fase) => {
      setProgressoImportacao(atual => Math.max(atual, pct))
      if (fase) setFaseImportacao(fase)
    }

    try {
      // Enquanto a chamada de IA estiver aguardando resposta, a barra continua avançando
      // suavemente até 88%, sem fingir que o processamento já terminou.
      progressoVisualTimer = setInterval(() => {
        setProgressoImportacao(atual => {
          if (atual < 60) return atual
          if (atual >= 88) return atual
          return Math.min(88, atual + 1)
        })
      }, 650)

      const dados = await analisarComIA(file, atualizarProgresso)
      atualizarProgresso(96, 'Preenchendo os campos para conferência...')

      const vTotal = parseFloat(dados.valor_total) || 0
      const inscricoesExtraidas = normalizarInscricoesExtraidas(dados)
      const inscricaoInicial = inscricoesExtraidas.length ? [inscricoesExtraidas[0]] : []
      setCampos(prev => ({
        ...prev, ...dados,
        inscricoes: inscricaoInicial,
        valor_originario:             fmtExibir(dados.valor_originario),
        principal_atualizado:         fmtExibir(dados.principal_atualizado),
        juros:                        fmtExibir(dados.juros),
        multa:                        fmtExibir(dados.multa),
        encargo_legal:                fmtExibir(dados.encargo_legal),
        valor_total:                  fmtExibir(vTotal),
        total_sem_desconto:           vTotal,
        modalidade_transacao:         '',
        modalidade_lancamento:        dados.modalidade_lancamento || 'oficio',
        socio_1:                      dados.socio_1 || '',
        socio_2:                      dados.socio_2 || '',
        socio_3:                      dados.socio_3 || '',
        documento_origem:             dados.documento_origem || '',
        orgao_origem:                 dados.orgao_origem || '',
        ufir_conversao:               obterUfirExtraida(dados),
        data_referencia_valores:      dados.data_referencia_valores || '',
        data_fato_gerador:            dados.data_fato_gerador || '',
        data_constituicao_definitiva: dados.data_constituicao_definitiva || '',
        devedor:                      dados.devedor || prev.devedor || '',
        cnpj_devedor:                 dados.cnpj_devedor || prev.cnpj_devedor || '',
        data_ajuizamento:             dados.data_ajuizamento || prev.data_ajuizamento || '',
        data_citacao:                 dados.data_citacao || prev.data_citacao || '',
        data_ultima_movimentacao:     dados.data_ultima_movimentacao || prev.data_ultima_movimentacao || '',
        possui_execucao_fiscal:       !!(dados.possui_execucao_fiscal || dados.numero_processo_execucao || prev.possui_execucao_fiscal || prev.numero_processo_execucao),
        numero_processo_execucao:     dados.numero_processo_execucao || prev.numero_processo_execucao || '',
        trf_regiao:                   dados.trf_regiao || prev.trf_regiao || '',
        vara_execucao:                dados.vara_execucao || prev.vara_execucao || '',
      }))

      atualizarProgresso(100, 'Importação concluída!')
      setEtapa('revisao')
    } catch(e) {
      const mensagem = String(e?.message || 'Não foi possível concluir a importação.')
      setErro(mensagem)
      setFaseImportacao('Não foi possível concluir a importação. Tente novamente em alguns instantes.')
    } finally {
      if (progressoVisualTimer) clearInterval(progressoVisualTimer)
      setExtraindo(false)
    }
  }

  async function salvar() {
    if (!clienteEfetivo) { setErro('Selecione um cliente antes de salvar.'); return }
    setSalvando(true); setErro('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        usuario_id: user.id,
        cliente_id: clienteEfetivo?.id || null,
        numero_cda: campos.numero_cda,
        devedor: campos.devedor,
        cnpj_devedor: campos.cnpj_devedor,
        pgfn_origem: campos.pgfn_origem,
        livro_folha: campos.livro_folha,
        processo_administrativo: campos.processo_administrativo,
        data_inscricao: campos.data_inscricao || null,
        periodo_divida_inicio: campos.periodo_divida_inicio,
        periodo_divida_fim: campos.periodo_divida_fim,
        valor_originario: fmtVal(campos.valor_originario),
        principal_atualizado: fmtVal(campos.principal_atualizado),
        juros: fmtVal(campos.juros),
        multa: fmtVal(campos.multa),
        encargo_legal: fmtVal(campos.encargo_legal),
        valor_total: fmtVal(campos.valor_total),
        total_sem_desconto: fmtVal(campos.total_sem_desconto||campos.valor_total),
        desconto_valor: fmtVal(campos.desconto_valor),
        desconto_percentual: fmtVal(campos.desconto_percentual),
        valor_entrada: fmtVal(campos.valor_entrada),
        qt_parcelas: parseInt(campos.qt_parcelas)||0,
        valor_parcela: fmtVal(campos.valor_parcela),
        data_calculo: campos.data_calculo || null,
        fundamento_legal: campos.fundamento_legal,
        municipio: campos.municipio,
        uf: campos.uf,
        tipo_debito: campos.tipo_debito,
        modalidade_transacao: campos.modalidade_transacao,
        socio_1: campos.socio_1,
        socio_2: campos.socio_2,
        socio_3: campos.socio_3,
        observacoes: campos.observacoes,
        modalidade_lancamento: campos.modalidade_lancamento || 'oficio',
        data_fato_gerador: normalizarDataSalvar(campos.data_fato_gerador),
        data_constituicao_definitiva: normalizarDataSalvar(campos.data_constituicao_definitiva),
        data_ajuizamento: normalizarDataSalvar(campos.data_ajuizamento),
        data_citacao: normalizarDataSalvar(campos.data_citacao),
        data_ultima_movimentacao: normalizarDataSalvar(campos.data_ultima_movimentacao),
        numero_processo_execucao: campos.numero_processo_execucao || '',
        trf_regiao: campos.trf_regiao || '',
        vara_execucao: campos.vara_execucao || '',
        ufir_conversao: campos.ufir_conversao || '',
        orgao_origem: campos.orgao_origem || '',
        documento_origem: campos.documento_origem || '',
        data_referencia_valores: campos.data_referencia_valores || '',
        inscricoes_json: Array.isArray(campos.inscricoes) ? campos.inscricoes : [],
      }
      let { data, error } = await supabase.from('cdas').insert([payload]).select()
      // Compatibilidade: se a coluna inscricoes_json ainda não foi criada, salva a CDA normalmente
      // e orienta a execução da migration fornecida junto com esta versão.
      if (error && /inscricoes_json|column/i.test(String(error.message || ''))) {
        const { inscricoes_json, ...payloadLegado } = payload
        const tentativaLegada = await supabase.from('cdas').insert([payloadLegado]).select()
        data = tentativaLegada.data
        error = tentativaLegada.error
      }
      if (error) throw error
      if (data?.[0]) setCdaSalvaId(data[0].id)
      setEtapa('sucesso')
      if (onSalvo) onSalvo({ campos, clienteEfetivo, cdaSalva: data?.[0] || null })
    } catch(e) { setErro('Erro ao salvar: ' + e.message) }
    setSalvando(false)
  }

  function novaImportacao() {
    setEtapa('upload')
    setCampos({...CAMPOS_VAZIOS})
    setErro('')
    setCdaSalvaId(null)
    setNumeroCdaSessao(1)
    setProgressoImportacao(0)
    setFaseImportacao('')
  }

  function novaCDA() {
    // Abre uma nova CDA dentro do mesmo contribuinte/processo, mantendo apenas
    // os dados comuns. Todo o restante começa limpo para a nova certidão.
    const dadosComuns = {
      devedor: campos.devedor || '',
      cnpj_devedor: campos.cnpj_devedor || '',
      possui_execucao_fiscal: !!campos.possui_execucao_fiscal,
      numero_processo_execucao: campos.numero_processo_execucao || '',
      trf_regiao: campos.trf_regiao || '',
      vara_execucao: campos.vara_execucao || '',
      data_ajuizamento: campos.data_ajuizamento || '',
      data_citacao: campos.data_citacao || '',
      data_ultima_movimentacao: campos.data_ultima_movimentacao || '',
    }
    setCampos({ ...CAMPOS_VAZIOS, ...dadosComuns })
    setEtapa('upload')
    setErro('')
    setCdaSalvaId(null)
    setNumeroCdaSessao(n => n + 1)
    setProgressoImportacao(0)
    setFaseImportacao('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function irParaDiagnostico() {
    if (onDiagnostico) onDiagnostico({ campos, clienteEfetivo })
  }

  function atualizarInscricao(index, campo, valor) {
    setCampos(prev => {
      const lista = Array.isArray(prev.inscricoes) ? [...prev.inscricoes] : []
      lista[index] = { ...(lista[index] || {}), [campo]: valor }
      return { ...prev, inscricoes: lista }
    })
  }

  function adicionarInscricao() {
    setCampos(prev => ({
      ...prev,
      inscricoes: [
        ...(Array.isArray(prev.inscricoes) ? prev.inscricoes : []),
        {
          numero:'', tipo_credito:prev.tipo_debito || 'tributario_federal',
          periodo_inicio:'', periodo_fim:'', data_fato_gerador:'', data_vencimento:'',
          data_constituicao:'', data_inscricao:'', valor_originario:0, principal_atualizado:0,
          juros:0, multa:0, encargo_legal:0, valor:0, fundamento_legal:'', modalidade_lancamento:prev.modalidade_lancamento || 'oficio'
        }
      ]
    }))
  }

  function removerInscricao(index) {
    setCampos(prev => ({
      ...prev,
      inscricoes: (Array.isArray(prev.inscricoes) ? prev.inscricoes : []).filter((_, i) => i !== index)
    }))
  }

  const inp = (k, label, tipo='text') => (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input type={tipo} value={campos[k]||''}
        onChange={e=>setCampos(p=>({...p,[k]:e.target.value}))}
        style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,boxSizing:'border-box'}}/>
    </div>
  )

  const inpDate = (k, label) => (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input type="date" value={campos[k]||''}
        onChange={e=>setCampos(p=>({...p,[k]:e.target.value}))}
        style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,boxSizing:'border-box'}}/>
    </div>
  )

  const sel = (k, label, opcoes) => (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <select value={campos[k]||''} onChange={e=>{
        const val=e.target.value
        setCampos(p=>({...p,[k]:val}))
      }} style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
        {opcoes.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  )

  const inpValor = (k, label) => (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input type="text" value={campos[k]||''} onChange={e=>setCampos(p=>({...p,[k]:e.target.value}))}
        onBlur={e=>{const n=fmtVal(e.target.value);if(n>0)setCampos(p=>({...p,[k]:fmtExibir(n)}))}}
        style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,boxSizing:'border-box'}}/>
    </div>
  )

  const camposConfirmacaoManual = [
    !campos.data_fato_gerador && 'Data do Fato Gerador',
    !campos.data_constituicao_definitiva && 'Data da Constituição Definitiva',
    !campos.data_ajuizamento && 'Data do Ajuizamento',
  ].filter(Boolean)

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>

      <div style={{background:'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)',borderRadius:16,padding:'24px 28px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:6}}>FISCALTRIB — DÍVIDA ATIVA</div>
        <div style={{fontSize:22,fontWeight:900,marginBottom:4,color:'#fff'}}>📄 Importar CDA via PDF — CDA {numeroCdaSessao}</div>
        <div style={{fontSize:13,color:'#93c5fd'}}>Faça upload do PDF completo — CDA + Discriminativo de Crédito para diagnóstico completo</div>
        {clienteEfetivo && (
          <div style={{marginTop:12,background:'rgba(255,255,255,0.12)',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span><strong>{clienteEfetivo.razao_social}</strong>{clienteEfetivo.cnpj&&<span style={{marginLeft:10,color:'#93c5fd'}}>{clienteEfetivo.cnpj}</span>}</span>
            {!active && <button onClick={()=>setClienteEfetivo(null)} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:4,padding:'2px 8px',color:'#fff',fontSize:11,cursor:'pointer'}}>Trocar</button>}
          </div>
        )}
      </div>

      <div style={{marginBottom:12}}>
        <button onClick={()=>{ if(onVoltar) onVoltar() }}
          style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'none',border:'1.5px solid #C8D0DC',borderRadius:8,fontSize:13,cursor:'pointer',color:'#1E293B'}}>
          ← Voltar ao Diagnóstico
        </button>
      </div>

      {!clienteEfetivo && <SeletorClienteInterno onSelecionar={c=>setClienteEfetivo(c)}/>}
      {erro && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,color:'#991B1B'}}>⚠️ {erro}</div>}

      {etapa==='upload' && (
        <div onClick={()=>inputRef.current?.click()}
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.navy}}
          onDragLeave={e=>{e.currentTarget.style.borderColor=C.border}}
          onDrop={e=>{e.preventDefault();handleArquivo(e.dataTransfer.files[0])}}
          style={{background:C.white,borderRadius:12,border:`2px dashed ${C.border}`,padding:'60px 32px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s'}}>
          <input ref={inputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>handleArquivo(e.target.files[0])}/>
          {extraindo ? (
            <div style={{maxWidth:560,margin:'0 auto'}} onClick={e=>e.stopPropagation()}>
              <style>{`
                @keyframes cdaHourglassFlip {
                  0% { transform: rotate(0deg) scale(1); }
                  45% { transform: rotate(180deg) scale(1.08); }
                  55% { transform: rotate(180deg) scale(1.08); }
                  100% { transform: rotate(360deg) scale(1); }
                }
                @keyframes cdaProgressGlow {
                  0%, 100% { opacity: .65; }
                  50% { opacity: 1; }
                }
              `}</style>

              <div style={{
                width:48,height:48,margin:'0 auto 10px',
                display:'flex',alignItems:'center',justifyContent:'center',
                borderRadius:12,background:'#F8FAFC',
                border:'1px solid #D8DEE8',
                boxShadow:'0 4px 12px rgba(15,23,42,.06)'
              }}>
                <div style={{
                  fontSize:27,lineHeight:1,
                  animation:'cdaHourglassFlip 1.15s linear infinite',
                  transformOrigin:'center'
                }}>⏳</div>
              </div>

              <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:5}}>
                Importando e analisando a CDA
              </div>

              <div style={{fontSize:12,color:C.muted,minHeight:18,marginBottom:12}}>
                {faseImportacao || 'Preparando processamento...'}
              </div>

              <div style={{
                height:6,background:'#E2E8F0',borderRadius:999,
                overflow:'hidden'
              }}>
                <div style={{
                  width:`${progressoImportacao}%`,
                  height:'100%',
                  borderRadius:999,
                  background:'#2563EB',
                  transition:'width .25s ease',
                  animation:'cdaProgressGlow .9s ease-in-out infinite'
                }}/>
              </div>

              <div style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                marginTop:6,fontSize:10.5,color:'#64748B'
              }}>
                <span>CDA + Discriminativo de Crédito</span>
                <strong style={{fontSize:12,color:C.navy}}>{progressoImportacao}%</strong>
              </div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:48,marginBottom:16}}>📄</div>
              <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:8}}>Clique ou arraste o PDF completo aqui</div>
              <div style={{fontSize:13,color:C.muted,marginBottom:8}}>CDA + Discriminativo de Crédito</div>
              <div style={{fontSize:12,color:'#7C3AED',marginBottom:16,fontWeight:600}}>💡 Envie a CDA e o discriminativo completos para uma extração mais precisa</div>
              <div style={{display:'inline-block',background:C.navy,color:'#fff',padding:'10px 24px',borderRadius:8,fontSize:13,fontWeight:600}}>Selecionar PDF</div>
            </div>
          )}
        </div>
      )}

      {etapa==='revisao' && (
        <div>
          <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#166534'}}>
            ✅ <strong>Dados extraídos!</strong> Revise todos os campos — especialmente as datas jurídicas — antes de salvar.
          </div>

          {camposConfirmacaoManual.length > 0 && (
            <div style={{
              background:'#FFF9E8',
              border:'1px solid #F4C95D',
              borderRadius:10,
              padding:'14px 16px',
              marginBottom:16,
              fontSize:12,
              color:'#78350F'
            }}>
              <div style={{fontWeight:900,fontSize:13,marginBottom:5,color:'#92400E'}}>
                ⚠️ Complete {camposConfirmacaoManual.length === 1 ? '1 informação' : `${camposConfirmacaoManual.length} informações`} manualmente antes do diagnóstico
              </div>

              <div style={{lineHeight:1.6,color:'#92400E'}}>
                A importação automática foi concluída, mas
                {camposConfirmacaoManual.length === 1 ? ' o campo abaixo não pôde ser confirmado' : ' os campos abaixo não puderam ser confirmados'}
                {' '}com segurança no PDF. Consulte a CDA ou, quando necessário, os autos do processo e preencha
                {camposConfirmacaoManual.length === 1 ? ' essa informação' : ' essas informações'} antes de executar o diagnóstico.
              </div>

              <div style={{marginTop:9,display:'flex',gap:8,flexWrap:'wrap'}}>
                {camposConfirmacaoManual.map(c=>(
                  <span
                    key={c}
                    style={{
                      background:'#FFFFFF',
                      border:'1px solid #F4C95D',
                      padding:'4px 10px',
                      borderRadius:6,
                      fontWeight:800,
                      color:'#9A5A00'
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div style={{marginTop:9,fontSize:11,color:'#A16207'}}>
                Sem essa confirmação, algumas análises jurídicas podem ficar incompletas.
              </div>
            </div>
          )}

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>🔖 Identificação da CDA</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {inp('numero_cda','Nº Inscrição Dívida Ativa')}
              {inp('pgfn_origem','PGFN de Origem')}
              {inp('orgao_origem','Órgão de Origem')}
              {inp('documento_origem','Documento de Origem')}
              {inp('livro_folha','Livro / Folha')}
              {inp('processo_administrativo','Processo Administrativo')}
              {inp('data_inscricao','Data de Inscrição (DD/MM/AAAA)')}
              {inp('data_calculo','Data do Cálculo (DD/MM/AAAA)')}
              {inp('data_referencia_valores','Referência dos Valores (MM/AAAA)')}
              {inp('ufir_conversao','UFIR de Conversão')}
            </div>
          </div>

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>👤 Devedor</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {inp('devedor','Razão Social / Nome')}
              {inp('cnpj_devedor','CNPJ / CPF')}
              {inp('municipio','Município')}
              {inp('uf','UF')}
            </div>
          </div>

          <div style={{background:'#F8F5FF',borderRadius:12,border:'2px solid #7C3AED',padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:'#7C3AED',marginBottom:4}}>📅 Datas Jurídicas — Essenciais para o Diagnóstico</div>
            <div style={{fontSize:12,color:'#64748B',marginBottom:16}}>Sem essas datas o diagnóstico de decadência, prescrição e prescrição intercorrente ficará inconclusivo.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
              {inpDate('data_fato_gerador','Data do Fato Gerador (1º período)')}
              {inpDate('data_constituicao_definitiva','Data da Constituição Definitiva')}
              {inpDate('data_ajuizamento','Data do Ajuizamento')}
              {inpDate('data_citacao','Data da Citação Válida')}
              {inpDate('data_ultima_movimentacao','Última Movimentação Processual')}
              <div>
                <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>Modalidade do Lançamento</label>
                <select value={campos.modalidade_lancamento||'oficio'} onChange={e=>setCampos(p=>({...p,modalidade_lancamento:e.target.value}))}
                  style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
                  {MODALIDADES_LANCAMENTO.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{background:'#EDE9FE',borderRadius:8,padding:'10px 14px',fontSize:11,color:'#5B21B6'}}>
              💡 <strong>Dica:</strong> Período 11/2012 → fato gerador = 2012-11-01 · Inscrição 23/09/2017 = constituição definitiva · Ajuizamento = data da petição inicial
            </div>
          </div>

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>💰 Período e Valores</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              {inp('periodo_divida_inicio','Período Início (MM/AAAA)')}
              {inp('periodo_divida_fim','Período Fim (MM/AAAA)')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
              {inpValor('valor_originario','Valor Originário')}
              {inpValor('principal_atualizado','Princ. Atualizado')}
              {inpValor('juros','Juros')}
              {inpValor('multa','Multa')}
            </div>
            <div style={{marginTop:14,padding:'12px 16px',background:'#EFF6FF',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:700,color:C.navy}}>Valor Total da CDA</span>
              <input type="text" value={campos.valor_total||''}
                onChange={e=>setCampos(p=>({...p,valor_total:e.target.value,total_sem_desconto:e.target.value}))}
                onBlur={e=>{const n=fmtVal(e.target.value);if(n>0)setCampos(p=>({...p,valor_total:fmtExibir(n),total_sem_desconto:n}))}}
                style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:15,fontWeight:700,width:180,textAlign:'right'}}/>
            </div>
          </div>

          <div style={{background:'#F8FAFC',borderRadius:12,border:'2px solid #0B1F4D',padding:24,marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8}}>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:C.navy}}>🧾 Inscrições / créditos desta CDA</div>
                <div style={{fontSize:11,color:C.muted,marginTop:3}}>Cada inscrição será analisada separadamente para decadência e prescrição quando houver marcos próprios.</div>
              </div>
              <button type="button" onClick={adicionarInscricao} style={{padding:'7px 12px',background:C.navy,color:'#fff',border:'none',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Adicionar inscrição</button>
            </div>

            {(Array.isArray(campos.inscricoes) ? campos.inscricoes : []).map((ins, index) => (
              <div key={index} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:'14px 16px',marginTop:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:800,color:C.navy}}>Inscrição {index + 1}</div>
                  {(campos.inscricoes || []).length > 1 && <button type="button" onClick={()=>removerInscricao(index)} style={{padding:'4px 8px',background:'#FEF2F2',color:'#B91C1C',border:'1px solid #FECACA',borderRadius:6,fontSize:10,cursor:'pointer'}}>Remover</button>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,marginBottom:10}}>
                  <div><label style={{fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:3}}>NÚMERO</label><input value={ins.numero||''} onChange={e=>atualizarInscricao(index,'numero',e.target.value)} style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:3}}>TIPO</label><select value={ins.tipo_credito||campos.tipo_debito||'tributario_federal'} onChange={e=>atualizarInscricao(index,'tipo_credito',e.target.value)} style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12}}>{TIPOS_DEBITO.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:3}}>VALOR</label><input value={ins.valor||''} onChange={e=>atualizarInscricao(index,'valor',e.target.value)} style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,boxSizing:'border-box'}}/></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                  <div><label style={{fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:3}}>FATO GERADOR</label><input type="date" value={ins.data_fato_gerador||''} onChange={e=>atualizarInscricao(index,'data_fato_gerador',e.target.value)} style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:3}}>VENCIMENTO</label><input type="date" value={ins.data_vencimento||''} onChange={e=>atualizarInscricao(index,'data_vencimento',e.target.value)} style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:3}}>CONSTITUIÇÃO</label><input type="date" value={ins.data_constituicao||''} onChange={e=>atualizarInscricao(index,'data_constituicao',e.target.value)} style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:3}}>INSCRIÇÃO EM DA</label><input type="date" value={ins.data_inscricao||''} onChange={e=>atualizarInscricao(index,'data_inscricao',e.target.value)} style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,boxSizing:'border-box'}}/></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{background:'#F0FDF4',borderRadius:12,border:'2px solid #16A34A',padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:'#15803D',marginBottom:4}}>🧮 Atualização Monetária / Conferência — Bases PGFN</div>
            <div style={{fontSize:12,color:'#64748B',marginBottom:16}}>
              A tabela SELIC foi preservada para referência e planejamento. Multa, juros e encargo usados na análise devem ser os valores documentais da CDA/PGFN — o FiscalTribe não cria percentuais para completar a dívida.
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>Data de vencimento original</label>
                <input type="date" value={campos.data_vencimento_original||''}
                  onChange={e=>setCampos(p=>({...p,data_vencimento_original:e.target.value}))}
                  style={{width:'100%',padding:'7px 10px',border:'1px solid #C8D0DC',borderRadius:6,fontSize:13,boxSizing:'border-box'}}/>
                <div style={{fontSize:10,color:'#64748B',marginTop:3}}>Primeiro vencimento não pago — marco inicial dos juros SELIC (art. 61 Lei 9.430/96)</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#1E293B',cursor:'pointer',marginBottom:8}}>
                  <input type="checkbox" checked={campos.possui_execucao_fiscal||false}
                    onChange={e=>setCampos(p=>({...p,possui_execucao_fiscal:e.target.checked}))}
                    style={{accentColor:'#0B1F4D',width:15,height:15}}/>
                  Há execução fiscal ajuizada
                </label>
                <div style={{fontSize:10,color:'#64748B'}}>A informação de ajuizamento é mantida para o diagnóstico. O encargo não é criado automaticamente: use o valor que constar da CDA/discriminativo.</div>
              </div>
            </div>

            {(()=>{
              // ── Tabela SELIC RFB acumulada (fonte: RFB via VRi Consulting, atualizada jul/2026) ──
              const SELIC_ACUMULADA = {
                '1995':{'01':442.65,'02':439.02,'03':436.42,'04':432.16,'05':427.91,'06':423.87,'07':419.85,'08':416.01,'09':412.69,'10':409.60,'11':406.72,'12':403.94},
                '1996':{'01':401.36,'02':399.01,'03':396.79,'04':394.72,'05':392.71,'06':390.73,'07':388.80,'08':386.83,'09':384.93,'10':383.07,'11':381.27,'12':379.47},
                '1997':{'01':377.74,'02':376.07,'03':374.43,'04':372.77,'05':371.19,'06':369.58,'07':367.98,'08':366.39,'09':364.80,'10':363.13,'11':360.09,'12':357.12},
                '1998':{'01':354.45,'02':352.32,'03':350.12,'04':348.41,'05':346.78,'06':345.18,'07':343.48,'08':342.00,'09':339.51,'10':336.57,'11':333.94,'12':331.54},
                '1999':{'01':329.36,'02':326.98,'03':323.65,'04':321.30,'05':319.28,'06':317.61,'07':315.95,'08':314.38,'09':312.89,'10':311.51,'11':310.12,'12':308.52},
                '2000':{'01':307.06,'02':305.61,'03':304.16,'04':302.86,'05':301.37,'06':299.98,'07':298.67,'08':297.26,'09':296.04,'10':294.75,'11':293.53,'12':292.33},
                '2001':{'01':291.06,'02':290.04,'03':288.78,'04':287.59,'05':286.25,'06':284.98,'07':283.48,'08':281.88,'09':280.56,'10':279.03,'11':277.64,'12':276.25},
                '2002':{'01':274.72,'02':273.47,'03':272.10,'04':270.62,'05':269.21,'06':267.88,'07':266.34,'08':264.90,'09':263.52,'10':261.87,'11':260.33,'12':258.59},
                '2003':{'01':256.62,'02':254.79,'03':253.01,'04':251.14,'05':249.17,'06':247.31,'07':245.23,'08':243.46,'09':241.78,'10':240.14,'11':238.80,'12':237.43},
                '2004':{'01':236.16,'02':235.08,'03':233.70,'04':232.52,'05':231.29,'06':230.06,'07':228.77,'08':227.48,'09':226.23,'10':225.02,'11':223.77,'12':222.29},
                '2005':{'01':220.91,'02':219.69,'03':218.16,'04':216.75,'05':215.25,'06':213.66,'07':212.15,'08':210.49,'09':208.99,'10':207.58,'11':206.20,'12':204.73},
                '2006':{'01':203.30,'02':202.15,'03':200.73,'04':199.65,'05':198.37,'06':197.19,'07':196.02,'08':194.76,'09':193.70,'10':192.61,'11':191.59,'12':190.60},
                '2007':{'01':189.52,'02':188.65,'03':187.60,'04':186.66,'05':185.63,'06':184.72,'07':183.75,'08':182.76,'09':181.96,'10':181.03,'11':180.19,'12':179.35},
                '2008':{'01':178.42,'02':177.62,'03':176.78,'04':175.88,'05':175.00,'06':174.04,'07':172.97,'08':171.95,'09':170.85,'10':169.67,'11':168.65,'12':167.53},
                '2009':{'01':166.48,'02':165.62,'03':164.65,'04':163.81,'05':163.04,'06':162.28,'07':161.49,'08':160.80,'09':160.11,'10':159.42,'11':158.76,'12':158.03},
                '2010':{'01':157.37,'02':156.78,'03':156.02,'04':155.35,'05':154.60,'06':153.81,'07':152.95,'08':152.06,'09':151.21,'10':150.40,'11':149.59,'12':148.66},
                '2011':{'01':147.80,'02':146.96,'03':146.04,'04':145.20,'05':144.21,'06':143.25,'07':142.28,'08':141.21,'09':140.27,'10':139.39,'11':138.53,'12':137.62},
                '2012':{'01':136.73,'02':135.98,'03':135.16,'04':134.45,'05':133.71,'06':133.07,'07':132.39,'08':131.70,'09':131.16,'10':130.55,'11':130.00,'12':129.45},
                '2013':{'01':128.85,'02':128.36,'03':127.81,'04':127.20,'05':126.60,'06':125.99,'07':125.27,'08':124.56,'09':123.85,'10':123.04,'11':122.32,'12':121.53},
                '2014':{'01':120.68,'02':119.89,'03':119.12,'04':118.30,'05':117.43,'06':116.61,'07':115.66,'08':114.79,'09':113.88,'10':112.93,'11':112.09,'12':111.13},
                '2015':{'01':110.19,'02':109.37,'03':108.33,'04':107.38,'05':106.39,'06':105.32,'07':104.14,'08':103.03,'09':101.92,'10':100.81,'11':99.75,'12':98.59},
                '2016':{'01':97.53,'02':96.53,'03':95.37,'04':94.31,'05':93.20,'06':92.04,'07':90.93,'08':89.71,'09':88.60,'10':87.55,'11':86.51,'12':85.39},
                '2017':{'01':84.30,'02':83.43,'03':82.38,'04':81.59,'05':80.66,'06':79.85,'07':79.05,'08':78.25,'09':77.61,'10':76.97,'11':76.40,'12':75.86},
                '2018':{'01':75.28,'02':74.81,'03':74.28,'04':73.76,'05':73.24,'06':72.72,'07':72.18,'08':71.61,'09':71.14,'10':70.60,'11':70.11,'12':69.62},
                '2019':{'01':69.08,'02':68.59,'03':68.12,'04':67.60,'05':67.06,'06':66.59,'07':66.02,'08':65.52,'09':65.06,'10':64.58,'11':64.20,'12':63.83},
                '2020':{'01':63.45,'02':63.16,'03':62.82,'04':62.54,'05':62.30,'06':62.09,'07':61.90,'08':61.74,'09':61.58,'10':61.42,'11':61.27,'12':61.11},
                '2021':{'01':60.96,'02':60.83,'03':60.63,'04':60.42,'05':60.15,'06':59.84,'07':59.48,'08':59.05,'09':58.61,'10':58.12,'11':57.53,'12':56.76},
                '2022':{'01':56.03,'02':55.27,'03':54.34,'04':53.51,'05':52.48,'06':51.46,'07':50.43,'08':49.26,'09':48.19,'10':47.17,'11':46.15,'12':45.03},
                '2023':{'01':43.91,'02':42.99,'03':41.82,'04':40.90,'05':39.78,'06':38.71,'07':37.64,'08':36.50,'09':35.53,'10':34.53,'11':33.61,'12':32.72},
                '2024':{'01':31.75,'02':30.95,'03':30.12,'04':29.23,'05':28.40,'06':27.61,'07':26.70,'08':25.83,'09':24.99,'10':24.06,'11':23.27,'12':22.34},
                '2025':{'01':21.33,'02':20.34,'03':19.38,'04':18.32,'05':17.18,'06':16.08,'07':14.80,'08':13.64,'09':12.42,'10':11.14,'11':10.09,'12':8.87},
                '2026':{'01':7.71,'02':6.71,'03':5.50,'04':4.41,'05':3.34,'06':2.22,'07':1.00},
              }

              function calcularSELIC(dataVenc) {
                if (!dataVenc) return null
                const hoje = new Date()
                const anoHoje = String(hoje.getFullYear())
                const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0')
                const [anoVenc, mesVenc] = dataVenc.split('-')
                // SELIC acumulada = valor no mês do vencimento - valor no mês anterior ao pagamento
                // Fórmula RFB: acumulado(mesVenc) - acumulado(mesAnteriorAoPagamento) + 1% no mês do pagamento
                const selicVenc = SELIC_ACUMULADA[anoVenc]?.[mesVenc]
                const selicAtual = SELIC_ACUMULADA[anoHoje]?.[mesHoje]
                if (selicVenc == null || selicAtual == null) return null
                return selicVenc - selicAtual + 1.00 // +1% no mês do pagamento
              }

              const vPrincipal = fmtVal(campos.principal_atualizado || campos.valor_originario)
              const vMulta = fmtVal(campos.multa)
              const vJuros = fmtVal(campos.juros)
              const vEncargo = fmtVal(campos.encargo_legal)
              const vTotal = fmtVal(campos.valor_total)
              const selicPct = calcularSELIC(campos.data_vencimento_original)
              const vSelicReferencia = selicPct != null && vPrincipal > 0 ? vPrincipal * (selicPct / 100) : null
              const somaDocumental = vPrincipal + vMulta + vJuros + vEncargo
              const diferencaDocumental = vTotal > 0 ? vTotal - somaDocumental : 0

              const temDados = vPrincipal > 0

              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
                    {[
                      {label:'Principal / Atualizado',valor:temDados?fmtR(vPrincipal):'—',cor:'#1E293B',base:'Valor documental extraído da CDA'},
                      {label:'Multa constante da CDA',valor:vMulta>0?fmtR(vMulta):'—',cor:'#D97706',base:'Valor documental — não estimado'},
                      {label:'Juros constantes da CDA',valor:vJuros>0?fmtR(vJuros):'—',cor:'#DC2626',base:'Valor documental — não estimado'},
                      {label:'Encargo Legal',valor:vEncargo>0?fmtR(vEncargo):'—',cor:'#7C3AED',base:'Valor documental — não estimado'},
                    ].map((k,i)=>(
                      <div key={i} style={{background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid #E2E8F0'}}>
                        <div style={{fontSize:10,color:'#64748B',fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:0.4}}>{k.label}</div>
                        <div style={{fontSize:14,fontWeight:700,color:k.cor,marginBottom:3}}>{k.valor}</div>
                        <div style={{fontSize:9,color:'#94A3B8',lineHeight:1.4}}>{k.base}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    background:'#15803D',
                    borderRadius:10,
                    padding:'14px 18px',
                    display:'grid',
                    gridTemplateColumns:'minmax(0,1fr) auto',
                    alignItems:'center',
                    columnGap:24
                  }}>
                    <div style={{minWidth:0}}>
                      <div style={{
                        fontSize:11,
                        color:'#FFFFFF',
                        fontWeight:800,
                        marginBottom:4,
                        textTransform:'uppercase',
                        letterSpacing:0.5
                      }}>
                        Valor documental da CDA
                      </div>
                      <div style={{
                        fontSize:10.5,
                        color:'#FFFFFF',
                        lineHeight:1.55,
                        fontWeight:500
                      }}>
                        Principal + multa + juros + encargo conforme documento. A SELIC abaixo é apenas referência e não é somada automaticamente ao total.
                      </div>
                    </div>
                    <div style={{
                      fontSize:22,
                      lineHeight:1,
                      fontWeight:900,
                      color:'#FFFFFF',
                      whiteSpace:'nowrap',
                      minWidth:145,
                      textAlign:'right'
                    }}>
                      {vTotal > 0 ? fmtR(vTotal) : somaDocumental > 0 ? fmtR(somaDocumental) : '—'}
                    </div>
                  </div>
                  {vTotal > 0 && Math.abs(diferencaDocumental) > 0.02 && (
                    <div style={{marginTop:8,fontSize:11,color:'#92400E',background:'#FFFBEB',borderRadius:6,padding:'8px 12px'}}>
                      ⚠️ A soma dos componentes informados difere do total da CDA em {fmtR(diferencaDocumental)}. Pode existir rubrica/atualização não individualizada no PDF.
                    </div>
                  )}
                  {selicPct != null && vSelicReferencia != null && (
                    <div style={{marginTop:8,fontSize:11,color:'#1E40AF',background:'#EFF6FF',borderRadius:6,padding:'8px 12px'}}>
                      ℹ️ SELIC acumulada de referência desde a data informada: <strong>{selicPct.toFixed(2)}%</strong> (aprox. {fmtR(vSelicReferencia)} sobre o principal). Não incorporada automaticamente à dívida.
                    </div>
                  )}
                  {selicPct == null && campos.data_vencimento_original && (
                    <div style={{marginTop:8,fontSize:11,color:'#92400E',background:'#FFFBEB',borderRadius:6,padding:'8px 12px'}}>
                      ⚠️ Data de vencimento fora do intervalo da tabela SELIC disponível (fev/1995 a jul/2026). Informe uma data válida para cálculo automático.
                    </div>
                  )}
                  {!campos.data_vencimento_original && (
                    <div style={{marginTop:8,fontSize:11,color:'#1E40AF',background:'#EFF6FF',borderRadius:6,padding:'8px 12px'}}>
                      ℹ️ Informe a data de vencimento original para calcular os juros SELIC automaticamente.
                    </div>
                  )}
                  <div style={{marginTop:10,fontSize:10,color:'#94A3B8',lineHeight:1.6}}>
                    ⚠️ Referência para planejamento. Para transação, prevalecem os valores oficiais da CDA/REGULARIZE/SISPAR.
                    A tabela SELIC foi mantida do arquivo original e continua identificada como referência até jul/2026.
                  </div>
                </div>
              )
            })()}
          </div>
		  <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>⚖️ Natureza do Débito e Encaminhamento</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              {sel('tipo_debito','Tipo de Débito',TIPOS_DEBITO)}
              {inpValor('encargo_legal','Encargo legal constante da CDA (R$)')}
            </div>
            <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8,padding:'12px 16px',fontSize:12,color:'#1E40AF',lineHeight:1.55}}>
              💡 Esta tela registra e confere os dados documentais. A simulação de desconto, entrada e parcelas é feita no motor <strong>Transação Tributária</strong>, usando a CDA salva + CAPAG + regras/editais vigentes.
            </div>
          </div>

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>🏛️ Execução Fiscal</div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:C.text,cursor:'pointer',marginBottom:16}}>
              <input type="checkbox" checked={campos.possui_execucao_fiscal||false}
                onChange={e=>setCampos(p=>({...p,possui_execucao_fiscal:e.target.checked}))}
                style={{accentColor:C.navy,width:15,height:15}}/>
              Há execução fiscal ajuizada
            </label>
            {campos.possui_execucao_fiscal && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
                {inp('numero_processo_execucao','Nº do Processo')}
                <div>
                  <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>TRF / Região</label>
                  <select value={campos.trf_regiao||''} onChange={e=>setCampos(p=>({...p,trf_regiao:e.target.value}))}
                    style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
                    {TRF_REGIOES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                {inp('vara_execucao','Vara / Juízo')}
              </div>
            )}
          </div>

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:6}}>👥 Sócios / Responsáveis</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Extraídos automaticamente — corrija se necessário</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
              {inp('socio_1','Sócio 1')}
              {inp('socio_2','Sócio 2')}
              {inp('socio_3','Sócio 3')}
            </div>
          </div>

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:12}}>📋 Fundamento Legal / Observações</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>Fundamento Legal</label>
              <textarea value={campos.fundamento_legal||''} onChange={e=>setCampos(p=>({...p,fundamento_legal:e.target.value}))}
                style={{width:'100%',padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,minHeight:60,resize:'vertical',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>Observações</label>
              <textarea value={campos.observacoes||''} onChange={e=>setCampos(p=>({...p,observacoes:e.target.value}))}
                style={{width:'100%',padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,minHeight:60,resize:'vertical',boxSizing:'border-box'}}/>
            </div>
          </div>

          <div style={{display:'flex',gap:12,marginBottom:32,flexWrap:'wrap'}}>
            <button onClick={salvar} disabled={salvando}
              style={{padding:'12px 28px',background:C.navy,color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',opacity:salvando?0.7:1}}>
              {salvando?'💾 Salvando...':'💾 Salvar CDA'}
            </button>
            <button onClick={novaImportacao}
              style={{padding:'12px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}}>
              ↻ Novo processo / nova importação
            </button>
          </div>
        </div>
      )}

      {etapa==='sucesso' && (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'40px 32px',textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:16}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,color:C.navy,marginBottom:8}}>CDA salva com sucesso!</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:28}}>
            {clienteEfetivo?.razao_social} — CDA {campos.numero_cda}<br/>
            Valor total: {fmtR(fmtVal(campos.valor_total))}
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={irParaDiagnostico}
              style={{padding:'12px 24px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
              🧠 Ver Diagnóstico Jurídico
            </button>
            <button onClick={()=>imprimirCDA(campos,clienteEfetivo)}
              style={{padding:'12px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              🖨️ Imprimir CDA
            </button>
            <button onClick={novaCDA}
              style={{padding:'12px 22px',background:C.navy,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:800,cursor:'pointer'}}>
              ＋ Nova CDA
            </button>
            <button onClick={novaImportacao}
              style={{padding:'12px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:'pointer'}}>
              ↻ Novo processo / nova importação
            </button>
          </div>
        </div>
      )}
    </div>
  )
}