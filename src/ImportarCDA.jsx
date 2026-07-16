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
  data_inscricao:'', periodo_divida_inicio:'', periodo_divida_fim:'',
  valor_originario:'', principal_atualizado:'', juros:'', multa:'', valor_total:'',
  total_sem_desconto:'', data_calculo:'', fundamento_legal:'',
  municipio:'', uf:'', tipo_debito:'previdenciario',
  modalidade_transacao:'transacao_edital',
  desconto_valor:'', desconto_percentual:'',
  valor_entrada:'', qt_parcelas:'', valor_parcela:'',
  socio_1:'', socio_2:'', socio_3:'',
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

const MODALIDADES = [
  { key:'transacao_excepcional', label:'Transação Excepcional',       desconto_multa:100, desconto_juros:100, entrada_pct:0,  parcelas_max:60 },
  { key:'transacao_individual',  label:'Transação Individual',        desconto_multa:50,  desconto_juros:50,  entrada_pct:5,  parcelas_max:84 },
  { key:'transacao_edital',      label:'Transação por Edital',        desconto_multa:50,  desconto_juros:50,  entrada_pct:5,  parcelas_max:60 },
  { key:'prdi',                  label:'PRDI',                        desconto_multa:70,  desconto_juros:70,  entrada_pct:0,  parcelas_max:84 },
  { key:'parcelamento_ordinario',label:'Parcelamento Ordinário',      desconto_multa:0,   desconto_juros:0,   entrada_pct:0,  parcelas_max:60 },
  { key:'njp',                   label:'Negócio Jurídico Processual', desconto_multa:40,  desconto_juros:40,  entrada_pct:10, parcelas_max:60 },
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
  for (let i = 1; i <= Math.min(pdf.numPages, 6); i++) {
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          system: 'Você é um leitor de documentos oficiais brasileiros. Transcreva todo o texto visível na imagem exatamente como aparece, sem interpretar ou resumir.',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `Transcreva todo o texto visível nesta página ${i+1} da CDA (Certidão de Dívida Ativa da PGFN):` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${paginas[i]}` } }
            ]
          }]
        })
      })
      const data = await resp.json()
      textoConsolidado += `\n--- PÁGINA ${i+1} ---\n` + (data.resposta || '')
    } catch(e) {
      console.error(`Erro página ${i+1}:`, e)
    }
  }

  const resp2 = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      system: 'Você é um extrator de dados de CDA da PGFN brasileira. Retorne APENAS JSON válido, sem markdown, sem explicações.',
      messages: [{
        role: 'user',
        content: `Analise o texto abaixo de uma CDA da PGFN e retorne APENAS este JSON.

ATENÇÃO — regras importantes:
- "numero_cda" = campo "Nm.Inscrição Dívida Ativa" (ex: 13.775.238-5) — NÃO confundir com PGFN de Origem
- "pgfn_origem" = campo "PGFN de Origem" (ex: 21.200.800)
- "devedor" = nome completo do devedor
- "cnpj_devedor" = campo CGC ou CNPJ do devedor
- valores numéricos sem formatação (ex: 16227.82)
- "data_inscricao" = formato DD/MM/AAAA
- "periodo_divida_inicio" e "periodo_divida_fim" = formato MM/AAAA

JSON a retornar:
{
  "numero_cda": "",
  "devedor": "",
  "cnpj_devedor": "",
  "pgfn_origem": "",
  "livro_folha": "",
  "processo_administrativo": "",
  "data_inscricao": "",
  "periodo_divida_inicio": "",
  "periodo_divida_fim": "",
  "valor_originario": 0,
  "principal_atualizado": 0,
  "juros": 0,
  "multa": 0,
  "valor_total": 0,
  "data_calculo": "",
  "fundamento_legal": "",
  "municipio": "",
  "uf": "",
  "tipo_debito": "previdenciario"
}

TEXTO DA CDA:
${textoConsolidado.slice(0, 8000)}`
      }]
    })
  })
  const data2 = await resp2.json()
  const resposta = data2.resposta || ''
  const jsonMatch = resposta.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('IA não retornou JSON válido')
  return JSON.parse(jsonMatch[0])
}

// ── Seletor de cliente interno ──
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
          <select
            value={clienteSelecionado}
            onChange={e => setClienteSelecionado(e.target.value)}
            style={{flex:1,minWidth:220,padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
            <option value=''>— Selecione o cliente —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id.toString()}>
                {c.razao_social}{c.cnpj ? ' · '+c.cnpj : ''}
              </option>
            ))}
          </select>
          <button
            onClick={confirmar}
            disabled={!clienteSelecionado}
            style={{padding:'8px 18px',background:clienteSelecionado?C.navy:'#94a3b8',color:'#fff',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:clienteSelecionado?'pointer':'not-allowed'}}>
            Confirmar
          </button>
        </div>
      )}
    </div>
  )
}

export default function ImportarCDA({ active, onSalvo }) {
  const [etapa, setEtapa] = useState('upload')
  const [arquivo, setArquivo] = useState(null)
  const [extraindo, setExtraindo] = useState(false)
  const [campos, setCampos] = useState({...CAMPOS_VAZIOS})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef()

  // ── cliente efetivo: prop active ou selecionado internamente ──
  const [clienteEfetivo, setClienteEfetivo] = useState(active?.id ? active : null)
  useEffect(() => { setClienteEfetivo(active?.id ? active : null) }, [active])

  async function handleArquivo(file) {
    if (!file || file.type !== 'application/pdf') {
      setErro('Selecione um arquivo PDF válido.')
      return
    }
    setArquivo(file)
    setErro('')
    setExtraindo(true)
    try {
      const paginas = await extrairPaginasPDF(file)
      const dados = await analisarComIA(paginas)
      const vTotal = parseFloat(dados.valor_total) || 0
      const modalidadeKey = dados.modalidade_transacao || 'transacao_edital'
      const negociacao = calcularNegociacao(vTotal, modalidadeKey)
      setCampos(prev => ({
        ...prev,
        ...dados,
        valor_originario:     fmtExibir(dados.valor_originario),
        principal_atualizado: fmtExibir(dados.principal_atualizado),
        juros:                fmtExibir(dados.juros),
        multa:                fmtExibir(dados.multa),
        valor_total:          fmtExibir(vTotal),
        total_sem_desconto:   vTotal,
        modalidade_transacao: modalidadeKey,
        ...negociacao,
      }))
      setEtapa('revisao')
    } catch(e) {
      setErro('Erro ao processar PDF: ' + e.message)
    }
    setExtraindo(false)
  }

  async function salvar() {
    if (!clienteEfetivo) {
      setErro('Selecione um cliente antes de salvar.')
      return
    }
    setSalvando(true)
    setErro('')
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
      }
      const { error } = await supabase.from('cdas').insert([payload])
      if (error) throw error
      setEtapa('sucesso')
      if (onSalvo) onSalvo()
    } catch(e) {
      setErro('Erro ao salvar: ' + e.message)
    }
    setSalvando(false)
  }

  function novaImportacao() {
    setEtapa('upload')
    setArquivo(null)
    setCampos({...CAMPOS_VAZIOS})
    setErro('')
  }

  const inp = (k, label, tipo='text') => (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input
        type={tipo}
        value={campos[k]||''}
        onChange={e=>setCampos(p=>({...p,[k]:e.target.value}))}
        style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,boxSizing:'border-box'}}
      />
    </div>
  )

  const sel = (k, label, opcoes) => (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <select
        value={campos[k]||''}
        onChange={e => {
          const val = e.target.value
          if (k === 'modalidade_transacao') {
            const vTotal = fmtVal(campos.valor_total)
            const negociacao = calcularNegociacao(vTotal, val)
            setCampos(p => ({ ...p, modalidade_transacao: val, ...negociacao }))
            return
          }
          setCampos(p => ({...p, [k]: val}))
        }}
        style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
        {opcoes.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  )

  const inpValor = (k, label) => (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input
        type="text"
        value={campos[k]||''}
        onChange={e=>setCampos(p=>({...p,[k]:e.target.value}))}
        onBlur={e=>{
          const n = fmtVal(e.target.value)
          if(n>0) setCampos(p=>({...p,[k]:fmtExibir(n)}))
        }}
        style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,boxSizing:'border-box'}}
      />
    </div>
  )

  return (
    <div style={{maxWidth:860,margin:'0 auto'}}>

      {/* Cabeçalho */}
      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:14,padding:'24px 28px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:6}}>FISCALTRIB — DÍVIDA ATIVA</div>
        <h2 style={{fontSize:20,fontWeight:900,margin:'0 0 6px',color:'#fff'}}>📄 Importar CDA via PDF</h2>
        <p style={{fontSize:13,color:'#cbd5e1',margin:0}}>Faça upload do PDF da Certidão de Dívida Ativa — a IA extrai os dados automaticamente</p>
        {clienteEfetivo && (
          <div style={{marginTop:12,background:'rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span>👤 <strong>{clienteEfetivo.razao_social}</strong>{clienteEfetivo.cnpj && <span style={{marginLeft:10,color:'#94a3b8'}}>{clienteEfetivo.cnpj}</span>}</span>
            {!active && (
              <button onClick={()=>setClienteEfetivo(null)} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:4,padding:'2px 8px',color:'#fff',fontSize:11,cursor:'pointer'}}>
                Trocar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Seletor interno quando não há cliente ativo */}
      {!clienteEfetivo && (
        <SeletorClienteInterno onSelecionar={c => setClienteEfetivo(c)} />
      )}

      {erro && (
        <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,color:'#991B1B'}}>
          ⚠️ {erro}
        </div>
      )}

      {etapa === 'upload' && (
        <div
          onClick={()=>inputRef.current?.click()}
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.navy}}
          onDragLeave={e=>{e.currentTarget.style.borderColor=C.border}}
          onDrop={e=>{e.preventDefault();handleArquivo(e.dataTransfer.files[0])}}
          style={{background:C.white,borderRadius:12,border:`2px dashed ${C.border}`,padding:'60px 32px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s'}}>
          <input ref={inputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>handleArquivo(e.target.files[0])}/>
          {extraindo ? (
            <>
              <div style={{fontSize:48,marginBottom:16}}>⏳</div>
              <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:8}}>Processando PDF...</div>
              <div style={{fontSize:13,color:C.muted}}>Convertendo páginas e analisando com IA Vision</div>
            </>
          ) : (
            <>
              <div style={{fontSize:48,marginBottom:16}}>📄</div>
              <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:8}}>Clique ou arraste o PDF da CDA aqui</div>
              <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Certidão de Dívida Ativa emitida pela PGFN</div>
              <div style={{display:'inline-block',background:C.navy,color:'#fff',padding:'10px 24px',borderRadius:8,fontSize:13,fontWeight:600}}>
                Selecionar PDF
              </div>
            </>
          )}
        </div>
      )}

      {etapa === 'revisao' && (
        <>
          <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#166534'}}>
            ✅ <strong>Dados extraídos com sucesso!</strong> Revise os campos abaixo e corrija se necessário antes de salvar.
          </div>

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>🔖 Identificação da CDA</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {inp('numero_cda','Nº Inscrição Dívida Ativa')}
              {inp('pgfn_origem','PGFN de Origem')}
              {inp('livro_folha','Livro / Folha')}
              {inp('processo_administrativo','Processo Administrativo')}
              {inp('data_inscricao','Data de Inscrição')}
              {inp('data_calculo','Data do Cálculo')}
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
              <input
                type="text"
                value={campos.valor_total||''}
                onChange={e=>setCampos(p=>({...p,valor_total:e.target.value,total_sem_desconto:e.target.value}))}
                onBlur={e=>{
                  const n = fmtVal(e.target.value)
                  if(n>0){
                    const fmt = fmtExibir(n)
                    const neg = calcularNegociacao(n, campos.modalidade_transacao)
                    setCampos(p=>({...p,valor_total:fmt,total_sem_desconto:n,...neg}))
                  }
                }}
                style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:15,fontWeight:700,width:180,textAlign:'right'}}
              />
            </div>
          </div>

          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>⚖️ Natureza e Negociação</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              {sel('tipo_debito','Tipo de Débito',TIPOS_DEBITO)}
              {sel('modalidade_transacao','Modalidade de Transação',MODALIDADES)}
            </div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'12px 16px',marginBottom:14,fontSize:12,color:C.muted}}>
              💡 Valores calculados automaticamente com base na modalidade selecionada (estimativa sobre multa 20% + juros 30% do total).
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
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>👥 Sócios / Responsáveis</div>
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
        </>
      )}

      {etapa === 'sucesso' && (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'48px 32px',textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:16}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,color:C.navy,marginBottom:8}}>CDA salva com sucesso!</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:24}}>
            {clienteEfetivo?.razao_social} — CDA {campos.numero_cda}<br/>
            Valor total: {fmtR(fmtVal(campos.valor_total))}
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button onClick={novaImportacao}
              style={{padding:'10px 24px',background:C.navy,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              📄 Importar outra CDA
            </button>
          </div>
        </div>
      )}
    </div>
  )
}