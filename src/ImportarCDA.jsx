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

const CAMPOS_VAZIOS = {
  numero_cda:'', devedor:'', cnpj_devedor:'',
  pgfn_origem:'', livro_folha:'', processo_administrativo:'',
  documento_origem:'', orgao_origem:'', ufir_conversao:'',
  data_inscricao:'', data_calculo:'', data_referencia_valores:'',
  periodo_divida_inicio:'', periodo_divida_fim:'',
  data_fato_gerador:'', data_constituicao_definitiva:'',
  data_ajuizamento:'', data_citacao:'', data_ultima_movimentacao:'',
  valor_originario:'', principal_atualizado:'', juros:'', multa:'', valor_total:'',
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
  data_vencimento_original:''
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

const MODALIDADES = [
  { key:'transacao_excepcional', label:'Transação Excepcional',       desconto_multa:100, desconto_juros:100, entrada_pct:0,  parcelas_max:60 },
  { key:'transacao_individual',  label:'Transação Individual',        desconto_multa:50,  desconto_juros:50,  entrada_pct:5,  parcelas_max:84 },
  { key:'transacao_edital',      label:'Transação por Edital',        desconto_multa:50,  desconto_juros:50,  entrada_pct:5,  parcelas_max:60 },
  { key:'prdi',                  label:'PRDI',                        desconto_multa:70,  desconto_juros:70,  entrada_pct:0,  parcelas_max:84 },
  { key:'parcelamento_ordinario',label:'Parcelamento Ordinário',      desconto_multa:0,   desconto_juros:0,   entrada_pct:0,  parcelas_max:60 },
  { key:'njp',                   label:'Negócio Jurídico Processual', desconto_multa:40,  desconto_juros:40,  entrada_pct:10, parcelas_max:60 },
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

function calcularNegociacao(vTotal, modalidadeKey) {
  const mod = MODALIDADES.find(m => m.key === modalidadeKey) || MODALIDADES[2]
  const vMulta = vTotal * 0.20
  const vJuros = vTotal * 0.30
  const descMultaVal = vMulta * (mod.desconto_multa / 100)
  const descJurosVal = vJuros * (mod.desconto_juros / 100)
  const totalDesc = descMultaVal + descJurosVal
  const vFinal = vTotal - totalDesc
  const vEntrada = vFinal * (mod.entrada_pct / 100)
  const saldo = vFinal - vEntrada
  const vParcela = mod.parcelas_max > 1 ? saldo / (mod.parcelas_max - 1) : saldo
  return {
    desconto_valor: fmtExibir(totalDesc),
    desconto_percentual: mod.desconto_multa,
    valor_entrada: fmtExibir(vEntrada),
    qt_parcelas: mod.parcelas_max,
    valor_parcela: fmtExibir(vParcela),
  }
}

async function carregarPDFJS() {
  const PDFJS_VERSION = '3.11.174'
  if (!window['pdfjs-dist/build/pdf']) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  const pdfjsLib = window['pdfjs-dist/build/pdf']
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`
  return pdfjsLib
}

async function extrairTextoPDF(file) {
  const pdfjsLib = await carregarPDFJS()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let textoTotal = ''
  for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const texto = textContent.items.map(item => item.str).join(' ')
    if (texto.trim()) textoTotal += `\n--- PÁGINA ${i} ---\n${texto}`
  }
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
11. "ufir_conversao" = valor numérico da UFIR mencionado na CDA (ex: 0.9108)
12. "periodo_divida_inicio" = primeiro mês/ano do período da dívida — formato MM/AAAA
13. "periodo_divida_fim" = último mês/ano do período da dívida — formato MM/AAAA
14. "data_fato_gerador" = primeiro período de competência do discriminativo — formato AAAA-MM-DD
15. "data_constituicao_definitiva" = data da inscrição em dívida ativa — formato AAAA-MM-DD
16. "data_ajuizamento" = data da petição inicial da execução fiscal — formato AAAA-MM-DD
17. "data_citacao" = data de citação do executado — formato AAAA-MM-DD
18. "modalidade_lancamento" = se mencionar "homologação" use "homologacao"; caso contrário use "oficio"
19. "tipo_debito" = Lei 8.212/91 = "previdenciario"; LC 123/2006 = "simples_nacional"; Lei 8.036/90 = "fgts"; outros = "tributario_federal"
20. "fundamento_legal" = códigos F.Legal encontrados na CDA
21. "socio_1", "socio_2", "socio_3" = nomes de sócios/responsáveis solidários

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
  "valor_total": 0,
  "fundamento_legal": "",
  "municipio": "",
  "uf": "",
  "tipo_debito": "previdenciario",
  "modalidade_lancamento": "oficio",
  "socio_1": "",
  "socio_2": "",
  "socio_3": ""
}`

async function parsearJSON(resposta) {
  if (resposta && typeof resposta === 'object') return resposta
  const textoLimpo = String(resposta).replace(/```json/gi, '').replace(/```/g, '').trim()
  const ini = textoLimpo.indexOf('{')
  const fim = textoLimpo.lastIndexOf('}')
  if (ini === -1 || fim === -1 || fim <= ini) throw new Error('IA não retornou nenhum objeto JSON')
  try { return JSON.parse(textoLimpo.slice(ini, fim + 1)) }
  catch (e) { throw new Error('IA retornou JSON malformado: ' + e.message) }
}

async function chamarIA(session, body) {
  const resp = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify(body)
  })
  const data = await resp.json()
  if (!resp.ok || data?.error) {
    const msg = typeof data?.error === 'string' ? data.error : data?.error?.message || `Erro HTTP ${resp.status}`
    console.error('ERRO API:', data)
    throw new Error('Erro na IA: ' + msg)
  }
  console.log('RESPOSTA API:', data)
  return data?.resposta ?? data?.resultado ?? data?.content ?? ''
}

async function analisarTextoComIA(texto, session) {
  const resposta = await chamarIA(session, {
    model: 'llama-3.3-70b-versatile',
    system: 'Você é um extrator especializado de dados de CDA da PGFN e Execução Fiscal brasileira. Retorne APENAS JSON válido, sem markdown, sem explicações.',
    messages: [{ role: 'user', content: `${PROMPT_JSON}\n\nTEXTO DOS DOCUMENTOS:\n${texto.slice(0, 12000)}` }]
  })
  return parsearJSON(resposta)
}

async function analisarPDFEscaneadoComGemini(file, session) {
  console.log('PDF escaneado — enviando PDF completo ao Gemini...')
  const base64 = await pdfParaBase64(file)
  const resposta = await chamarIA(session, {
    model: 'gemini-3.5-flash',
    system: 'Você é um extrator especializado de dados de CDA da PGFN e Execução Fiscal brasileira. Retorne APENAS JSON válido, sem markdown, sem explicações.',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'inline_data',
          inline_data: {
            mime_type: 'application/pdf',
            data: base64
          }
        },
        {
          type: 'text',
          text: PROMPT_JSON
        }
      ]
    }]
  })
  return parsearJSON(resposta)
}

async function analisarComIA(file) {
  const { data: { session } } = await supabase.auth.getSession()
  console.log('Tentando extração de texto direto...')
  const texto = await extrairTextoPDF(file)
  console.log('Caracteres extraídos pelo PDF.js:', texto?.trim().length || 0)
  if (texto && texto.trim().length >= 50) {
    console.log('PDF com texto pesquisável — usando Groq textual')
    return analisarTextoComIA(texto, session)
  }
  console.log('PDF escaneado — enviando PDF completo ao Gemini (1 chamada)')
  return analisarPDFEscaneadoComGemini(file, session)
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

  <h2>⚖️ Negociação</h2>
  <div class="grid">
    <div class="campo"><div class="label">Tipo de Débito</div><div class="valor">${campos.tipo_debito||'—'}</div></div>
    <div class="campo"><div class="label">Modalidade Transação</div><div class="valor">${campos.modalidade_transacao||'—'}</div></div>
    <div class="campo"><div class="label">Desconto R$</div><div class="valor">${campos.desconto_valor||'—'}</div></div>
    <div class="campo"><div class="label">Valor Entrada</div><div class="valor">${campos.valor_entrada||'—'}</div></div>
    <div class="campo"><div class="label">Qtd. Parcelas</div><div class="valor">${campos.qt_parcelas||'—'}</div></div>
    <div class="campo"><div class="label">Valor Parcela</div><div class="valor">${campos.valor_parcela||'—'}</div></div>
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
  const [campos, setCampos] = useState({...CAMPOS_VAZIOS})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [cdaSalvaId, setCdaSalvaId] = useState(null)
  const inputRef = useRef()

  const [clienteEfetivo, setClienteEfetivo] = useState(active?.id ? active : null)
  useEffect(() => { setClienteEfetivo(active?.id ? active : null) }, [active])

  async function handleArquivo(file) {
    if (!file || file.type !== 'application/pdf') { setErro('Selecione um arquivo PDF válido.'); return }
    setErro('')
    setExtraindo(true)
    try {
      const dados = await analisarComIA(file)
      const vTotal = parseFloat(dados.valor_total) || 0
      const modalidadeKey = dados.modalidade_transacao || 'transacao_edital'
      const negociacao = calcularNegociacao(vTotal, modalidadeKey)
      setCampos(prev => ({
        ...prev, ...dados,
        valor_originario:             fmtExibir(dados.valor_originario),
        principal_atualizado:         fmtExibir(dados.principal_atualizado),
        juros:                        fmtExibir(dados.juros),
        multa:                        fmtExibir(dados.multa),
        valor_total:                  fmtExibir(vTotal),
        total_sem_desconto:           vTotal,
        modalidade_transacao:         modalidadeKey,
        modalidade_lancamento:        dados.modalidade_lancamento || 'oficio',
        socio_1:                      dados.socio_1 || '',
        socio_2:                      dados.socio_2 || '',
        socio_3:                      dados.socio_3 || '',
        documento_origem:             dados.documento_origem || '',
        orgao_origem:                 dados.orgao_origem || '',
        ufir_conversao:               dados.ufir_conversao || '',
        data_referencia_valores:      dados.data_referencia_valores || '',
        data_fato_gerador:            dados.data_fato_gerador || '',
        data_constituicao_definitiva: dados.data_constituicao_definitiva || '',
        data_ajuizamento:             dados.data_ajuizamento || '',
        data_citacao:                 dados.data_citacao || '',
        data_ultima_movimentacao:     dados.data_ultima_movimentacao || '',
        ...negociacao,
      }))
      setEtapa('revisao')
    } catch(e) { setErro('Erro ao processar PDF: ' + e.message) }
    setExtraindo(false)
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
        data_fato_gerador: campos.data_fato_gerador || null,
        data_constituicao_definitiva: campos.data_constituicao_definitiva || null,
        data_ajuizamento: campos.data_ajuizamento || null,
        data_citacao: campos.data_citacao || null,
        data_ultima_movimentacao: campos.data_ultima_movimentacao || null,
        numero_processo_execucao: campos.numero_processo_execucao || '',
        trf_regiao: campos.trf_regiao || '',
        vara_execucao: campos.vara_execucao || '',
        ufir_conversao: campos.ufir_conversao || '',
        orgao_origem: campos.orgao_origem || '',
        documento_origem: campos.documento_origem || '',
        data_referencia_valores: campos.data_referencia_valores || '',
      }
      const { data, error } = await supabase.from('cdas').insert([payload]).select()
      if (error) throw error
      if (data?.[0]) setCdaSalvaId(data[0].id)
      setEtapa('sucesso')
      if (onSalvo) onSalvo()
    } catch(e) { setErro('Erro ao salvar: ' + e.message) }
    setSalvando(false)
  }

  function novaImportacao() {
    setEtapa('upload'); setCampos({...CAMPOS_VAZIOS}); setErro(''); setCdaSalvaId(null)
  }

  function irParaDiagnostico() {
    if (onDiagnostico) onDiagnostico({ campos, clienteEfetivo })
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
        if(k==='modalidade_transacao'){
          const neg=calcularNegociacao(fmtVal(campos.valor_total),val)
          setCampos(p=>({...p,modalidade_transacao:val,...neg})); return
        }
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

  const camposCriticosFaltando = [
    !campos.data_fato_gerador && 'Data do Fato Gerador',
    !campos.data_constituicao_definitiva && 'Data da Constituição Definitiva',
    !campos.data_inscricao && 'Data de Inscrição',
    !campos.data_ajuizamento && 'Data do Ajuizamento',
  ].filter(Boolean)

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>

      <div style={{background:'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)',borderRadius:16,padding:'24px 28px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:6}}>FISCALTRIB — DÍVIDA ATIVA</div>
        <div style={{fontSize:22,fontWeight:900,marginBottom:4,color:'#fff'}}>📄 Importar CDA via PDF</div>
        <div style={{fontSize:13,color:'#93c5fd'}}>Faça upload do PDF completo — CDA + Execução Fiscal + Discriminativo de Crédito para diagnóstico completo</div>
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
            <div>
              <div style={{marginBottom:16,display:'flex',justifyContent:'center'}}>
                <div style={{width:48,height:48,border:'5px solid #e2e8f0',borderTop:'5px solid #1e3a5f',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
              </div>
              <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:8}}>Processando PDF...</div>
              <div style={{fontSize:13,color:C.muted}}>Analisando CDA, Execução Fiscal e Discriminativo com IA Vision</div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:48,marginBottom:16}}>📄</div>
              <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:8}}>Clique ou arraste o PDF completo aqui</div>
              <div style={{fontSize:13,color:C.muted,marginBottom:8}}>CDA + Petição Inicial da Execução Fiscal + Discriminativo de Crédito</div>
              <div style={{fontSize:12,color:'#7C3AED',marginBottom:16,fontWeight:600}}>💡 Quanto mais páginas do processo, mais completo o diagnóstico</div>
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

          {camposCriticosFaltando.length > 0 && (
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#991B1B'}}>
              ⚠️ <strong>Campos críticos para diagnóstico não encontrados no PDF — preencha manualmente:</strong>
              <div style={{marginTop:6,display:'flex',gap:8,flexWrap:'wrap'}}>
                {camposCriticosFaltando.map(c=><span key={c} style={{background:'#FEE2E2',padding:'2px 8px',borderRadius:4,fontWeight:600}}>{c}</span>)}
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
                onBlur={e=>{const n=fmtVal(e.target.value);if(n>0){const neg=calcularNegociacao(n,campos.modalidade_transacao);setCampos(p=>({...p,valor_total:fmtExibir(n),total_sem_desconto:n,...neg}))}}}
                style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:15,fontWeight:700,width:180,textAlign:'right'}}/>
            </div>
          </div>

          <div style={{background:'#F0FDF4',borderRadius:12,border:'2px solid #16A34A',padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:'#15803D',marginBottom:4}}>🧮 Atualização Monetária — Bases PGFN</div>
            <div style={{fontSize:12,color:'#64748B',marginBottom:16}}>Cálculo automático com SELIC acumulada (RFB) + Multa 20% + Encargo legal 10% — mesmas bases utilizadas pela PGFN.</div>

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
                <div style={{fontSize:10,color:'#64748B'}}>Se marcado, aplica encargo legal de 10% (Decreto-Lei 1.025/69)</div>
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
              const vTotal = fmtVal(campos.valor_total)
              const selicPct = calcularSELIC(campos.data_vencimento_original)
              const multaPct = 20
              const encargoPct = campos.possui_execucao_fiscal ? 10 : 0

              const vMulta = vPrincipal * (multaPct / 100)
              const vSelic = selicPct != null ? vPrincipal * (selicPct / 100) : null
              const vEncargo = (vPrincipal + vMulta + (vSelic||0)) * (encargoPct / 100)
              const vAtualizado = vPrincipal + vMulta + (vSelic||0) + vEncargo

              const temDados = vPrincipal > 0

              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
                    {[
                      {label:'Principal / Atualizado',valor:fmtR(vPrincipal),cor:'#1E293B',base:'Art. 61 Lei 9.430/96'},
                      {label:`Multa de Mora (${multaPct}%)`,valor:temDados?fmtR(vMulta):'—',cor:'#D97706',base:'Art. 61 §1º Lei 9.430/96 — limite 20%'},
                      {label:`Juros SELIC${selicPct!=null?` (${selicPct.toFixed(2)}%)`:''}`,valor:temDados&&vSelic!=null?fmtR(vSelic):campos.data_vencimento_original?'Mês fora da tabela':'Informe data vencimento',cor:'#DC2626',base:'SELIC acumulada RFB — Lei 9.250/95 + Lei 9.430/96'},
                      {label:`Encargo Legal${encargoPct>0?` (${encargoPct}%)`:''}`,valor:encargoPct>0&&temDados?fmtR(vEncargo):'Sem execução fiscal',cor:'#7C3AED',base:'Decreto-Lei 1.025/69 — aplica-se após ajuizamento'},
                    ].map((k,i)=>(
                      <div key={i} style={{background:'#fff',borderRadius:8,padding:'10px 12px',border:'1px solid #E2E8F0'}}>
                        <div style={{fontSize:10,color:'#64748B',fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:0.4}}>{k.label}</div>
                        <div style={{fontSize:14,fontWeight:700,color:k.cor,marginBottom:3}}>{k.valor}</div>
                        <div style={{fontSize:9,color:'#94A3B8',lineHeight:1.4}}>{k.base}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#15803D',borderRadius:10,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:11,color:'#BBF7D0',fontWeight:700,marginBottom:2,textTransform:'uppercase',letterSpacing:0.5}}>Total Atualizado na Data de Hoje ({new Date().toLocaleDateString('pt-BR')})</div>
                      <div style={{fontSize:10,color:'#86EFAC'}}>
                        Principal + Multa 20% + SELIC acumulada{encargoPct>0?' + Encargo 10% (DL 1.025/69)':''}
                        {' · '}Bases: Lei 9.250/95, Lei 9.430/96{encargoPct>0?', DL 1.025/69':''}
                      </div>
                    </div>
                    <div style={{fontSize:22,fontWeight:900,color:'#fff'}}>
                      {temDados && vSelic != null ? fmtR(vAtualizado) : vTotal > 0 ? `≈ ${fmtR(vTotal)} (valor da CDA)` : '—'}
                    </div>
                  </div>
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
                    ⚠️ Cálculo estimado para fins de planejamento — valores oficiais devem ser obtidos via SICALC (Receita Federal) ou sistema PGFN.
                    A tabela SELIC utilizada é a publicada pela RFB (fonte: vriconsulting.com.br/indices/selic.php), atualizada até jul/2026.
                  </div>
                </div>
              )
            })()}
          </div>
		  <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>⚖️ Natureza e Negociação</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              {sel('tipo_debito','Tipo de Débito',TIPOS_DEBITO)}
              {sel('modalidade_transacao','Modalidade de Transação',MODALIDADES)}
            </div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'12px 16px',marginBottom:14,fontSize:12,color:C.muted}}>
              💡 Valores calculados automaticamente com base na modalidade selecionada.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
              {inpValor('desconto_valor','Desconto R$')}
              {inp('desconto_percentual','Desconto %','number')}
              {inpValor('valor_entrada','Valor Entrada')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {inp('qt_parcelas','Qtd. Parcelas','number')}
              {inpValor('valor_parcela','Valor Parcela')}
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

          <div style={{display:'flex',gap:12,marginBottom:32}}>
            <button onClick={salvar} disabled={salvando}
              style={{padding:'12px 28px',background:C.navy,color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',opacity:salvando?0.7:1}}>
              {salvando?'💾 Salvando...':'💾 Salvar CDA'}
            </button>
            <button onClick={novaImportacao}
              style={{padding:'12px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}}>
              📄 Nova importação
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
            <button onClick={novaImportacao}
              style={{padding:'12px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:'pointer'}}>
              📄 Importar outra
            </button>
          </div>
        </div>
      )}
    </div>
  )
}