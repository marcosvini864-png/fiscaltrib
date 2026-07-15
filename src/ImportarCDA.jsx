import { useState, useRef } from 'react'
import { supabase } from './supabase'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#E4E7EC', border:'#C8D0DC',
  text:'#1E293B', muted:'#64748B',
}

const fmtR = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

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
  { key:'transacao_excepcional', label:'Transação Excepcional' },
  { key:'transacao_individual',  label:'Transação Individual' },
  { key:'transacao_edital',      label:'Transação por Edital' },
  { key:'prdi',                  label:'PRDI' },
  { key:'parcelamento_ordinario',label:'Parcelamento Ordinário' },
  { key:'njp',                   label:'Negócio Jurídico Processual' },
]

async function extrairTextoPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let texto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    texto += content.items.map(item => item.str).join(' ') + '\n'
  }
  return texto
}

async function analisarComIA(texto) {
  const prompt = `Você é um especialista em Certidões de Dívida Ativa (CDA) da PGFN brasileira.

Analise o texto abaixo extraído de uma CDA e retorne APENAS um JSON válido com os campos identificados.

TEXTO DA CDA:
${texto.slice(0, 4000)}

Retorne APENAS este JSON (sem explicações, sem markdown):
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
}`

  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      system: 'Você é um extrator de dados de CDA. Retorne APENAS JSON válido, sem markdown, sem explicações.',
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await resp.json()
  const resposta = data.resposta || ''
  const jsonMatch = resposta.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('IA não retornou JSON válido')
  return JSON.parse(jsonMatch[0])
}

export default function ImportarCDA({ onSalvo }) {
  const [etapa, setEtapa] = useState('upload') // upload | revisao | sucesso
  const [arquivo, setArquivo] = useState(null)
  const [extraindo, setExtraindo] = useState(false)
  const [campos, setCampos] = useState({...CAMPOS_VAZIOS})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef()

  async function handleArquivo(file) {
    if (!file || file.type !== 'application/pdf') {
      setErro('Selecione um arquivo PDF válido.')
      return
    }
    setArquivo(file)
    setErro('')
    setExtraindo(true)
    try {
      const texto = await extrairTextoPDF(file)
      const dados = await analisarComIA(texto)
      setCampos(prev => ({
        ...prev,
        ...dados,
        total_sem_desconto: dados.valor_total || 0,
      }))
      setEtapa('revisao')
    } catch(e) {
      setErro('Erro ao processar PDF: ' + e.message)
    }
    setExtraindo(false)
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        usuario_id: user.id,
        numero_cda: campos.numero_cda,
        devedor: campos.devedor,
        cnpj_devedor: campos.cnpj_devedor,
        pgfn_origem: campos.pgfn_origem,
        livro_folha: campos.livro_folha,
        processo_administrativo: campos.processo_administrativo,
        data_inscricao: campos.data_inscricao || null,
        periodo_divida_inicio: campos.periodo_divida_inicio,
        periodo_divida_fim: campos.periodo_divida_fim,
        valor_originario: parseFloat(campos.valor_originario)||0,
        principal_atualizado: parseFloat(campos.principal_atualizado)||0,
        juros: parseFloat(campos.juros)||0,
        multa: parseFloat(campos.multa)||0,
        valor_total: parseFloat(campos.valor_total)||0,
        total_sem_desconto: parseFloat(campos.total_sem_desconto||campos.valor_total)||0,
        desconto_valor: parseFloat(campos.desconto_valor)||0,
        desconto_percentual: parseFloat(campos.desconto_percentual)||0,
        valor_entrada: parseFloat(campos.valor_entrada)||0,
        qt_parcelas: parseInt(campos.qt_parcelas)||0,
        valor_parcela: parseFloat(campos.valor_parcela)||0,
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
        onChange={e=>setCampos(p=>({...p,[k]:e.target.value}))}
        style={{width:'100%',padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
        {opcoes.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{maxWidth:860,margin:'0 auto'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:14,padding:'24px 28px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:6}}>FISCALTRIB — DÍVIDA ATIVA</div>
        <h2 style={{fontSize:20,fontWeight:900,margin:'0 0 6px',color:'#fff'}}>📄 Importar CDA via PDF</h2>
        <p style={{fontSize:13,color:'#cbd5e1',margin:0}}>Faça upload do PDF da Certidão de Dívida Ativa — a IA extrai os dados automaticamente</p>
      </div>

      {erro && (
        <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,color:'#991B1B'}}>
          ⚠️ {erro}
        </div>
      )}

      {/* ETAPA 1 — Upload */}
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
              <div style={{fontSize:13,color:C.muted}}>Extraindo texto e analisando com IA tributária</div>
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

      {/* ETAPA 2 — Revisão */}
      {etapa === 'revisao' && (
        <>
          <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#166534'}}>
            ✅ <strong>Dados extraídos com sucesso!</strong> Revise os campos abaixo e corrija se necessário antes de salvar.
          </div>

          {/* Identificação */}
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

          {/* Devedor */}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>👤 Devedor</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {inp('devedor','Razão Social / Nome')}
              {inp('cnpj_devedor','CNPJ / CPF')}
              {inp('municipio','Município')}
              {inp('uf','UF')}
            </div>
          </div>

          {/* Período e valores */}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>💰 Período e Valores</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              {inp('periodo_divida_inicio','Período Início (AAAA-MM)')}
              {inp('periodo_divida_fim','Período Fim (AAAA-MM)')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
              {inp('valor_originario','Valor Originário','number')}
              {inp('principal_atualizado','Princ. Atualizado','number')}
              {inp('juros','Juros','number')}
              {inp('multa','Multa','number')}
            </div>
            <div style={{marginTop:14,padding:'12px 16px',background:'#EFF6FF',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:700,color:C.navy}}>Valor Total da CDA</span>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <input
                  type="number"
                  value={campos.valor_total||''}
                  onChange={e=>setCampos(p=>({...p,valor_total:e.target.value,total_sem_desconto:e.target.value}))}
                  style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:15,fontWeight:700,width:160,textAlign:'right'}}
                />
              </div>
            </div>
          </div>

          {/* Natureza e negociação */}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>⚖️ Natureza e Negociação</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              {sel('tipo_debito','Tipo de Débito',TIPOS_DEBITO)}
              {sel('modalidade_transacao','Modalidade de Transação',MODALIDADES)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
              {inp('desconto_valor','Desconto R$','number')}
              {inp('desconto_percentual','Desconto %','number')}
              {inp('valor_entrada','Valor Entrada','number')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {inp('qt_parcelas','Qtd. Parcelas','number')}
              {inp('valor_parcela','Valor Parcela','number')}
            </div>
          </div>

          {/* Sócios */}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>👥 Sócios / Responsáveis</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
              {inp('socio_1','Sócio 1')}
              {inp('socio_2','Sócio 2')}
              {inp('socio_3','Sócio 3')}
            </div>
          </div>

          {/* Fundamento legal */}
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

      {/* ETAPA 3 — Sucesso */}
      {etapa === 'sucesso' && (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'48px 32px',textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:16}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,color:C.navy,marginBottom:8}}>CDA salva com sucesso!</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:24}}>
            {campos.devedor} — CDA {campos.numero_cda}<br/>
            Valor total: {fmtR(campos.valor_total)}
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