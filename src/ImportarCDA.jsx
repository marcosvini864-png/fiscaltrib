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
  observacoes:''
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

async function extrairPaginasPDF(file) {
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
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const paginas = []
  for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
    const page = await pdf.getPage(i)
    const scale = 2.0
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
    paginas.push(base64)
  }
  return paginas
}

async function analisarComIA(paginas) {
  const { data: { session } } = await supabase.auth.getSession()
  let textoConsolidado = ''

  for (let i = 0; i < paginas.length; i++) {
    try {
      const resp = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          system: 'Você é um leitor de documentos oficiais brasileiros. Transcreva todo o texto visível na imagem exatamente como aparece, sem interpretar ou resumir. Preserve todos os números, datas, valores e códigos exatamente como estão.',
          messages: [{ role: 'user', content: [
            { type: 'text', text: `Transcreva TODO o texto visível nesta página ${i+1} do documento da PGFN (CDA, Execução Fiscal ou Discriminativo de Crédito), preservando todos os valores, datas, competências e códigos:` },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${paginas[i]}` } }
          ]}]
        })
      })
      const data = await resp.json()
      textoConsolidado += `\n--- PÁGINA ${i+1} ---\n` + (data.resposta || '')
    } catch(e) { console.error(`Erro página ${i+1}:`, e) }
  }

  const resp2 = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      system: 'Você é um extrator especializado de dados de CDA da PGFN e Execução Fiscal brasileira. Retorne APENAS JSON válido, sem markdown, sem explicações.',
      messages: [{ role: 'user', content: `Analise o texto abaixo de documentos da PGFN (CDA + Petição Inicial de Execução Fiscal + Discriminativo de Crédito) e retorne APENAS este JSON completo.

REGRAS CRÍTICAS DE EXTRAÇÃO:
1. "numero_cda" = campo "Nm.Inscrição Dívida Ativa" ou "Credito" (ex: 13.775.238-5) — NUNCA confundir com PGFN de Origem
2. "pgfn_origem" = campo "PGFN de Origem" ou "Tramitacao" (ex: 21.200.800)
3. "orgao_origem" = campo "Orgao de Origem" (ex: 21.200.010)
4. "documento_origem" = campo "Documento Original" (ex: DCGB - DCG BATCH)
5. "devedor" = nome completo do devedor/executado
6. "cnpj_devedor" = campo CGC, CNPJ ou Identificacao do devedor
7. TODOS os valores numéricos sem formatação (ex: 16227.82 não 16.227,82)
8. "data_inscricao" = campo "Data de Inscricao" — formato DD/MM/AAAA
9. "data_calculo" = campo "Data do Calculo" ou "Data de Calculo dos Debitos" ou "Calculado em" — formato DD/MM/AAAA
10. "data_referencia_valores" = data para a qual os valores foram atualizados (ex: "01/2022")
11. "ufir_conversao" = valor numérico da UFIR mencionado na CDA para conversão de valores (ex: 0.9108) — procure por "UFIR" ou "Unidade Fiscal" no documento
12. "periodo_divida_inicio" = primeiro mês/ano do período da dívida — formato MM/AAAA
13. "periodo_divida_fim" = último mês/ano do período da dívida — formato MM/AAAA
14. "data_fato_gerador" = primeiro período de competência do discriminativo — formato AAAA-MM-DD (use dia 01)
15. "data_constituicao_definitiva" = data da inscrição em dívida ativa — formato AAAA-MM-DD
16. "data_ajuizamento" = data da petição inicial da execução fiscal ou data do protocolo — formato AAAA-MM-DD
17. "data_citacao" = data de citação do executado se mencionada — formato AAAA-MM-DD
18. "modalidade_lancamento" = se mencionar "SIMPLES" ou "homologação" use "homologacao"; caso contrário use "oficio"
19. "tipo_debito" = Lei 8.212/91 = "previdenciario"; LC 123/2006 = "simples_nacional"; Lei 8.036/90 = "fgts"; outros = "tributario_federal"
20. "fundamento_legal" = códigos F.Legal encontrados na CDA (ex: "041.00, 088.00, 089.00...")
21. "socio_1", "socio_2", "socio_3" = nomes de sócios/responsáveis solidários se mencionados

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
}

TEXTO DOS DOCUMENTOS:
${textoConsolidado.slice(0, 12000)}` }]
    })
  })
  const data2 = await resp2.json()
 const erroAPI = data2?.error
   if (!resp2.ok || erroAPI) {
   const mensagemAPI =
    typeof erroAPI === 'string'
      ? erroAPI
      : erroAPI?.message || `Erro HTTP ${resp2.status}`

  console.error('ERRO RETORNADO PELA API:', data2)

  throw new Error(
    mensagemAPI.includes('Request too large')
      ? 'O PDF gerou texto demais para a IA. Tente importar menos páginas ou um arquivo menor.'
      : 'Erro na IA: ' + mensagemAPI
  )
}
 const resposta =
  data2?.resposta ??
  data2?.resultado ??
  data2?.content ??
  ''

console.log('RESPOSTA COMPLETA DA API:', data2)
console.log('RESPOSTA IA:', resposta)

// Se a API já devolveu um objeto, não precisa converter novamente
if (resposta && typeof resposta === 'object') {
  return resposta
}

// Remove marcações ```json e ```
const textoLimpo = String(resposta)
  .replace(/```json/gi, '')
  .replace(/```/g, '')
  .trim()

// Localiza o objeto JSON dentro da resposta
const inicioJSON = textoLimpo.indexOf('{')
const fimJSON = textoLimpo.lastIndexOf('}')

if (
  inicioJSON === -1 ||
  fimJSON === -1 ||
  fimJSON <= inicioJSON
) {
  console.error('Resposta sem objeto JSON:', textoLimpo)
  throw new Error('IA não retornou nenhum objeto JSON')
}

const jsonTexto = textoLimpo.slice(inicioJSON, fimJSON + 1)

try {
  return JSON.parse(jsonTexto)
} catch (erroJSON) {
  console.error('JSON malformado recebido da IA:', jsonTexto)
  console.error('Erro do JSON.parse:', erroJSON)

  throw new Error(
    'IA retornou JSON malformado: ' + erroJSON.message
  )
}
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
      const paginas = await extrairPaginasPDF(file)
      const dados = await analisarComIA(paginas)
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

      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:14,padding:'24px 28px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:6}}>FISCALTRIB — DÍVIDA ATIVA</div>
        <h2 style={{fontSize:20,fontWeight:900,margin:'0 0 6px',color:'#fff'}}>📄 Importar CDA via PDF</h2>
        <p style={{fontSize:13,color:'#cbd5e1',margin:0}}>Faça upload do PDF completo — CDA + Execução Fiscal + Discriminativo de Crédito para diagnóstico completo</p>
        {clienteEfetivo && (
          <div style={{marginTop:12,background:'rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span>👤 <strong>{clienteEfetivo.razao_social}</strong>{clienteEfetivo.cnpj&&<span style={{marginLeft:10,color:'#94a3b8'}}>{clienteEfetivo.cnpj}</span>}</span>
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