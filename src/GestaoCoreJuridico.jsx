import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#E4E7EC', border:'#C8D0DC',
  text:'#1E293B', muted:'#64748B',
}

const arrToStr = a => Array.isArray(a) ? a.join(', ') : ''
const strToArr = s => (s||'').split(',').map(x=>x.trim()).filter(Boolean)

const btnPrimary={padding:'8px 16px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}
const btnOutline={padding:'8px 16px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}
const btnDanger ={padding:'6px 12px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:8,fontSize:12,cursor:'pointer'}
const inputStyle={padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}
const labelStyle={fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}

function Campo({ label, children }) {
  return <div style={{marginBottom:12}}><label style={labelStyle}>{label}</label>{children}</div>
}

function TabInterna({ tabs, active, onTab }) {
  return (
    <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
      {tabs.map((t,i)=>(
        <button key={i} onClick={()=>onTab(i)}
          style={{padding:'8px 16px',fontSize:13,fontWeight:active===i?600:400,color:active===i?C.navy:C.muted,background:'none',border:'none',borderBottom:`2px solid ${active===i?C.navy:'transparent'}`,marginBottom:-2,cursor:'pointer',whiteSpace:'nowrap'}}>
          {t}
        </button>
      ))}
    </div>
  )
}

// ── BASE JURÍDICA ──────────────────────────────────────────────────────────
const VAZIO_NORMA = { tipo_norma:'Lei', numero:'', titulo:'', orgao_emissor:'', data_vigencia:'', hierarquia_normativa:'lei', escopo:'', tipo_credito:'', assunto:'', palavras_chave:'', regra_pratica:'', texto_referencia:'', link_oficial:'', status:'vigente' }

function PainelBaseJuridica() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VAZIO_NORMA)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase.from('base_juridica').select('*').order('numero')
    if(data) setLista(data)
    setCarregando(false)
  }
  useEffect(()=>{ carregar() },[])

  const listaFiltrada = lista.filter(n => {
    if(!busca.trim()) return true
    const termo = busca.toLowerCase()
    return n.numero?.toLowerCase().includes(termo) ||
      n.titulo?.toLowerCase().includes(termo) ||
      (n.palavras_chave||[]).some(p=>p.toLowerCase().includes(termo)) ||
      (n.assunto||[]).some(a=>a.toLowerCase().includes(termo)) ||
      (n.tipo_credito||[]).some(t=>t.toLowerCase().includes(termo))
  })

  function novo() { setEditando('novo'); setForm(VAZIO_NORMA) }
  function editar(n) {
    setEditando(n.id)
    setForm({ ...n, escopo:arrToStr(n.escopo), tipo_credito:arrToStr(n.tipo_credito), assunto:arrToStr(n.assunto), palavras_chave:arrToStr(n.palavras_chave) })
  }
  async function salvar() {
    if(!form.numero||!form.titulo){ alert('Preencha pelo menos número e título.'); return }
    setSalvando(true)
    const payload = { ...form, escopo:strToArr(form.escopo), tipo_credito:strToArr(form.tipo_credito), assunto:strToArr(form.assunto), palavras_chave:strToArr(form.palavras_chave) }
    try {
      if(editando==='novo') { const { error } = await supabase.from('base_juridica').insert([payload]); if(error) throw error }
      else { const { error } = await supabase.from('base_juridica').update(payload).eq('id',editando); if(error) throw error }
      setEditando(null); await carregar()
    } catch(e){ alert('Erro ao salvar: '+e.message) }
    setSalvando(false)
  }
  async function excluir(id) {
    if(!window.confirm('Excluir esta norma? Relações, regras e teses vinculadas podem ser afetadas.')) return
    const { error } = await supabase.from('base_juridica').delete().eq('id',id)
    if(error) { alert('Erro ao excluir: '+error.message); return }
    await carregar()
  }

  if(editando) return (
    <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
      <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>{editando==='novo'?'+ Nova norma':'Editar norma'}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Campo label="Tipo de norma">
          <select value={form.tipo_norma} onChange={e=>setForm({...form,tipo_norma:e.target.value})} style={inputStyle}>
            {['Lei','Lei Complementar','Decreto','Portaria','Edital','Súmula','Súmula Vinculante','Tema Repetitivo','Repercussão Geral','IRDR','Parecer','Nota Técnica'].map(t=><option key={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo label="Número"><input value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} style={inputStyle} placeholder='Ex: 13.988/2020'/></Campo>
        <div style={{gridColumn:'1 / -1'}}><Campo label="Título"><input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} style={inputStyle}/></Campo></div>
        <Campo label="Órgão emissor"><input value={form.orgao_emissor} onChange={e=>setForm({...form,orgao_emissor:e.target.value})} style={inputStyle}/></Campo>
        <Campo label="Data de vigência"><input type="date" value={form.data_vigencia||''} onChange={e=>setForm({...form,data_vigencia:e.target.value})} style={inputStyle}/></Campo>
        <Campo label="Hierarquia normativa">
          <select value={form.hierarquia_normativa} onChange={e=>setForm({...form,hierarquia_normativa:e.target.value})} style={inputStyle}>
            {['constituicao','lei','tema_repetitivo','repercussao_geral','sumula_vinculante','sumula_stj','portaria','edital','parecer','nota_tecnica'].map(h=><option key={h}>{h}</option>)}
          </select>
        </Campo>
        <Campo label="Status">
          <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputStyle}>
            <option value="vigente">vigente</option><option value="revogada">revogada</option><option value="alterada">alterada</option>
          </select>
        </Campo>
        <Campo label="Escopo (separado por vírgula)"><input value={form.escopo} onChange={e=>setForm({...form,escopo:e.target.value})} style={inputStyle} placeholder="tributario, fiscal_acessorio"/></Campo>
        <Campo label="Tipo de crédito (separado por vírgula)"><input value={form.tipo_credito} onChange={e=>setForm({...form,tipo_credito:e.target.value})} style={inputStyle} placeholder="tributario_federal, previdenciario"/></Campo>
        <Campo label="Assunto (separado por vírgula)"><input value={form.assunto} onChange={e=>setForm({...form,assunto:e.target.value})} style={inputStyle} placeholder="prescricao, transacao"/></Campo>
        <Campo label="Palavras-chave (separado por vírgula)"><input value={form.palavras_chave} onChange={e=>setForm({...form,palavras_chave:e.target.value})} style={inputStyle}/></Campo>
        <div style={{gridColumn:'1 / -1'}}><Campo label="Regra prática (explicação em linguagem simples)"><textarea value={form.regra_pratica} onChange={e=>setForm({...form,regra_pratica:e.target.value})} style={{...inputStyle,minHeight:80,resize:'vertical'}}/></Campo></div>
        <div style={{gridColumn:'1 / -1'}}><Campo label="Texto de referência (resumo, não cópia literal)"><textarea value={form.texto_referencia} onChange={e=>setForm({...form,texto_referencia:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></Campo></div>
        <div style={{gridColumn:'1 / -1'}}><Campo label="Link oficial"><input value={form.link_oficial} onChange={e=>setForm({...form,link_oficial:e.target.value})} style={inputStyle}/></Campo></div>
      </div>
      <div style={{display:'flex',gap:10,marginTop:10}}>
        <button onClick={salvar} disabled={salvando} style={{...btnPrimary,opacity:salvando?0.7:1}}>{salvando?'Salvando...':'Salvar'}</button>
        <button onClick={()=>setEditando(null)} style={btnOutline}>Cancelar</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:14}}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por número, título, assunto ou palavra-chave..." style={inputStyle}/>
        <button onClick={novo} style={{...btnPrimary,flexShrink:0}}>+ Nova norma</button>
      </div>
      {carregando?<div style={{color:C.muted,padding:20}}>Carregando...</div>:listaFiltrada.length===0?(
        <div style={{textAlign:'center',padding:32,color:C.muted}}>Nenhuma norma encontrada.</div>
      ):listaFiltrada.map(n=>(
        <div key={n.id} style={{background:C.white,borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 18px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{n.tipo_norma} {n.numero}</div>
            <div style={{fontSize:13,color:C.text,marginTop:2}}>{n.titulo}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>{n.status} · {n.hierarquia_normativa} · assuntos: {arrToStr(n.assunto)||'—'}</div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <button onClick={()=>editar(n)} style={btnOutline}>Editar</button>
            <button onClick={()=>excluir(n.id)} style={btnDanger}>Excluir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── RELAÇÕES ENTRE NORMAS ───────────────────────────────────────────────────
function PainelRelacoes() {
  const [lista, setLista] = useState([])
  const [normas, setNormas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState({ norma_origem_id:'', norma_relacionada_id:'', tipo_relacao:'fundamenta' })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data: rel } = await supabase.from('base_juridica_relacoes').select('*, origem:norma_origem_id(numero,titulo), destino:norma_relacionada_id(numero,titulo)').order('created_at',{ascending:false})
    const { data: norm } = await supabase.from('base_juridica').select('id,numero,titulo').order('numero')
    if(rel) setLista(rel)
    if(norm) setNormas(norm)
    setCarregando(false)
  }
  useEffect(()=>{ carregar() },[])

  async function salvar() {
    if(!form.norma_origem_id||!form.norma_relacionada_id){ alert('Selecione as duas normas.'); return }
    setSalvando(true)
    const { error } = await supabase.from('base_juridica_relacoes').insert([form])
    if(error) alert('Erro: '+error.message)
    else { setCriando(false); setForm({ norma_origem_id:'', norma_relacionada_id:'', tipo_relacao:'fundamenta' }); await carregar() }
    setSalvando(false)
  }
  async function excluir(id) {
    if(!window.confirm('Excluir esta relação?')) return
    const { error } = await supabase.from('base_juridica_relacoes').delete().eq('id',id)
    if(error){ alert('Erro: '+error.message); return }
    await carregar()
  }

  // Agrupamento por norma de origem — base para futura visualização gráfica de relacionamentos
  const agrupado = {}
  lista.forEach(r=>{
    const chave = r.origem?.numero || '—'
    if(!agrupado[chave]) agrupado[chave] = []
    agrupado[chave].push(r)
  })

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        <button onClick={()=>setCriando(!criando)} style={btnPrimary}>{criando?'Fechar':'+ Nova relação'}</button>
      </div>
      {criando&&(
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            <Campo label="Norma de origem">
              <select value={form.norma_origem_id} onChange={e=>setForm({...form,norma_origem_id:e.target.value})} style={inputStyle}>
                <option value="">Selecione...</option>
                {normas.map(n=><option key={n.id} value={n.id}>{n.numero}</option>)}
              </select>
            </Campo>
            <Campo label="Tipo de relação">
              <select value={form.tipo_relacao} onChange={e=>setForm({...form,tipo_relacao:e.target.value})} style={inputStyle}>
                {['regulamenta','altera','fundamenta','complementa','revoga'].map(t=><option key={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label="Norma relacionada">
              <select value={form.norma_relacionada_id} onChange={e=>setForm({...form,norma_relacionada_id:e.target.value})} style={inputStyle}>
                <option value="">Selecione...</option>
                {normas.map(n=><option key={n.id} value={n.id}>{n.numero}</option>)}
              </select>
            </Campo>
          </div>
          <button onClick={salvar} disabled={salvando} style={{...btnPrimary,marginTop:10,opacity:salvando?0.7:1}}>{salvando?'Salvando...':'Salvar relação'}</button>
        </div>
      )}
      {carregando?<div style={{color:C.muted,padding:20}}>Carregando...</div>:lista.length===0?(
        <div style={{textAlign:'center',padding:32,color:C.muted}}>Nenhuma relação cadastrada ainda.</div>
      ):Object.entries(agrupado).map(([origem,relacoes])=>(
        <div key={origem} style={{background:C.white,borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 18px',marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>{origem}</div>
          {relacoes.map(r=>(
            <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderTop:`1px solid ${C.border}33`,fontSize:13}}>
              <span style={{color:C.text}}>↳ <span style={{color:'#1E40AF'}}>{r.tipo_relacao}</span> → {r.destino?.numero}</span>
              <button onClick={()=>excluir(r.id)} style={btnDanger}>Excluir</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── MOTOR DE REGRAS ──────────────────────────────────────────────────────────
const VAZIO_REGRA = { nome_regra:'', descricao:'', base_juridica_id:'', condicao:'{}', resultado:'', modulos_aplicaveis:'', status:'ativa' }

function PainelMotorRegras() {
  const [lista, setLista] = useState([])
  const [normas, setNormas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VAZIO_REGRA)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase.from('motor_regras').select('*, norma:base_juridica_id(numero,titulo)').order('nome_regra')
    const { data: norm } = await supabase.from('base_juridica').select('id,numero').order('numero')
    if(data) setLista(data)
    if(norm) setNormas(norm)
    setCarregando(false)
  }
  useEffect(()=>{ carregar() },[])

  function novo() { setEditando('novo'); setForm(VAZIO_REGRA) }
  function editar(r) {
    setEditando(r.id)
    setForm({ ...r, base_juridica_id:r.base_juridica_id||'', condicao:JSON.stringify(r.condicao||{},null,2), modulos_aplicaveis:arrToStr(r.modulos_aplicaveis) })
  }
  async function salvar() {
    if(!form.nome_regra){ alert('Informe o nome da regra.'); return }
    let condicaoObj
    try { condicaoObj = JSON.parse(form.condicao||'{}') } catch(e){ alert('A condição precisa ser um JSON válido.'); return }
    setSalvando(true)
    const payload = { nome_regra:form.nome_regra, descricao:form.descricao, base_juridica_id:form.base_juridica_id||null, condicao:condicaoObj, resultado:form.resultado, modulos_aplicaveis:strToArr(form.modulos_aplicaveis), status:form.status }
    try {
      if(editando==='novo') { const { error } = await supabase.from('motor_regras').insert([payload]); if(error) throw error }
      else { const { error } = await supabase.from('motor_regras').update(payload).eq('id',editando); if(error) throw error }
      setEditando(null); await carregar()
    } catch(e){ alert('Erro ao salvar: '+e.message) }
    setSalvando(false)
  }
  async function excluir(id) {
    if(!window.confirm('Excluir esta regra?')) return
    const { error } = await supabase.from('motor_regras').delete().eq('id',id)
    if(error){ alert('Erro: '+error.message); return }
    await carregar()
  }

  if(editando) return (
    <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
      <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>{editando==='novo'?'+ Nova regra':'Editar regra'}</div>
      <Campo label="Nome da regra"><input value={form.nome_regra} onChange={e=>setForm({...form,nome_regra:e.target.value})} style={inputStyle}/></Campo>
      <Campo label="Descrição"><textarea value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></Campo>
      <Campo label="Norma jurídica de base">
        <select value={form.base_juridica_id} onChange={e=>setForm({...form,base_juridica_id:e.target.value})} style={inputStyle}>
          <option value="">Nenhuma</option>
          {normas.map(n=><option key={n.id} value={n.id}>{n.numero}</option>)}
        </select>
      </Campo>
      <Campo label="Condição (JSON)"><textarea value={form.condicao} onChange={e=>setForm({...form,condicao:e.target.value})} style={{...inputStyle,minHeight:100,resize:'vertical',fontFamily:'monospace'}}/></Campo>
      <Campo label="Resultado / conclusão da regra"><textarea value={form.resultado} onChange={e=>setForm({...form,resultado:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></Campo>
      <Campo label="Módulos aplicáveis (separado por vírgula)"><input value={form.modulos_aplicaveis} onChange={e=>setForm({...form,modulos_aplicaveis:e.target.value})} style={inputStyle} placeholder="divida_ativa, recuperacao_tributaria"/></Campo>
      <Campo label="Status">
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputStyle}>
          <option value="ativa">ativa</option><option value="inativa">inativa</option>
        </select>
      </Campo>
      <div style={{display:'flex',gap:10,marginTop:10}}>
        <button onClick={salvar} disabled={salvando} style={{...btnPrimary,opacity:salvando?0.7:1}}>{salvando?'Salvando...':'Salvar'}</button>
        <button onClick={()=>setEditando(null)} style={btnOutline}>Cancelar</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        <button onClick={novo} style={btnPrimary}>+ Nova regra</button>
      </div>
      {carregando?<div style={{color:C.muted,padding:20}}>Carregando...</div>:lista.length===0?(
        <div style={{textAlign:'center',padding:32,color:C.muted}}>Nenhuma regra cadastrada ainda.</div>
      ):lista.map(r=>(
        <div key={r.id} style={{background:C.white,borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 18px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{r.nome_regra}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:4}}>Base: {r.norma?.numero||'—'} · Módulos: {arrToStr(r.modulos_aplicaveis)||'—'} · {r.status}</div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <button onClick={()=>editar(r)} style={btnOutline}>Editar</button>
            <button onClick={()=>excluir(r.id)} style={btnDanger}>Excluir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── BASE DE TESES ────────────────────────────────────────────────────────────
const VAZIO_TESE = { nome_tese:'', base_juridica_id:'', motor_regra_id:'', precedentes:'', requisitos:'', excecoes:'', estrategia_recomendada:'', documentos_necessarios:'', grau_sucesso:'', visivel_usuario_final:false }

function PainelTeses() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [normas, setNormas] = useState([])
  const [regras, setRegras] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VAZIO_TESE)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase.from('base_teses').select('*, norma:base_juridica_id(numero), regra:motor_regra_id(nome_regra)').order('nome_tese')
    const { data: norm } = await supabase.from('base_juridica').select('id,numero').order('numero')
    const { data: reg } = await supabase.from('motor_regras').select('id,nome_regra').order('nome_regra')
    if(data) setLista(data)
    if(norm) setNormas(norm)
    if(reg) setRegras(reg)
    setCarregando(false)
  }
  useEffect(()=>{ carregar() },[])

  const listaFiltrada = lista.filter(t => {
    if(!busca.trim()) return true
    const termo = busca.toLowerCase()
    return t.nome_tese?.toLowerCase().includes(termo) ||
      t.requisitos?.toLowerCase().includes(termo) ||
      t.estrategia_recomendada?.toLowerCase().includes(termo) ||
      t.precedentes?.toLowerCase().includes(termo)
  })

  function novo() { setEditando('novo'); setForm(VAZIO_TESE) }
  function editar(t) {
    setEditando(t.id)
    setForm({ ...t, base_juridica_id:t.base_juridica_id||'', motor_regra_id:t.motor_regra_id||'', documentos_necessarios:arrToStr(t.documentos_necessarios) })
  }
  async function salvar() {
    if(!form.nome_tese){ alert('Informe o nome da tese.'); return }
    setSalvando(true)
    const payload = { ...form, base_juridica_id:form.base_juridica_id||null, motor_regra_id:form.motor_regra_id||null, documentos_necessarios:strToArr(form.documentos_necessarios) }
    try {
      if(editando==='novo') { const { error } = await supabase.from('base_teses').insert([payload]); if(error) throw error }
      else { const { error } = await supabase.from('base_teses').update(payload).eq('id',editando); if(error) throw error }
      setEditando(null); await carregar()
    } catch(e){ alert('Erro ao salvar: '+e.message) }
    setSalvando(false)
  }
  async function excluir(id) {
    if(!window.confirm('Excluir esta tese?')) return
    const { error } = await supabase.from('base_teses').delete().eq('id',id)
    if(error){ alert('Erro: '+error.message); return }
    await carregar()
  }

  if(editando) return (
    <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
      <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>{editando==='novo'?'+ Nova tese':'Editar tese'}</div>
      <Campo label="Nome da tese"><input value={form.nome_tese} onChange={e=>setForm({...form,nome_tese:e.target.value})} style={inputStyle}/></Campo>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Campo label="Norma jurídica de base">
          <select value={form.base_juridica_id} onChange={e=>setForm({...form,base_juridica_id:e.target.value})} style={inputStyle}>
            <option value="">Nenhuma</option>
            {normas.map(n=><option key={n.id} value={n.id}>{n.numero}</option>)}
          </select>
        </Campo>
        <Campo label="Regra do motor vinculada">
          <select value={form.motor_regra_id} onChange={e=>setForm({...form,motor_regra_id:e.target.value})} style={inputStyle}>
            <option value="">Nenhuma</option>
            {regras.map(r=><option key={r.id} value={r.id}>{r.nome_regra}</option>)}
          </select>
        </Campo>
      </div>
      <Campo label="Precedentes"><textarea value={form.precedentes} onChange={e=>setForm({...form,precedentes:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></Campo>
      <Campo label="Requisitos"><textarea value={form.requisitos} onChange={e=>setForm({...form,requisitos:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></Campo>
      <Campo label="Exceções"><textarea value={form.excecoes} onChange={e=>setForm({...form,excecoes:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></Campo>
      <Campo label="Estratégia recomendada"><textarea value={form.estrategia_recomendada} onChange={e=>setForm({...form,estrategia_recomendada:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></Campo>
      <Campo label="Documentos necessários (separado por vírgula)"><input value={form.documentos_necessarios} onChange={e=>setForm({...form,documentos_necessarios:e.target.value})} style={inputStyle}/></Campo>
      <Campo label="Grau de sucesso (uso interno — não exibido ao cliente)"><input value={form.grau_sucesso||''} onChange={e=>setForm({...form,grau_sucesso:e.target.value})} style={inputStyle}/></Campo>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.text,marginTop:6,cursor:'pointer'}}>
        <input type="checkbox" checked={form.visivel_usuario_final} onChange={e=>setForm({...form,visivel_usuario_final:e.target.checked})} style={{accentColor:C.navy,width:14,height:14}}/>
        Visível ao usuário final
      </label>
      <div style={{display:'flex',gap:10,marginTop:14}}>
        <button onClick={salvar} disabled={salvando} style={{...btnPrimary,opacity:salvando?0.7:1}}>{salvando?'Salvando...':'Salvar'}</button>
        <button onClick={()=>setEditando(null)} style={btnOutline}>Cancelar</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:14}}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome, requisitos ou estratégia..." style={inputStyle}/>
        <button onClick={novo} style={{...btnPrimary,flexShrink:0}}>+ Nova tese</button>
      </div>
      {carregando?<div style={{color:C.muted,padding:20}}>Carregando...</div>:listaFiltrada.length===0?(
        <div style={{textAlign:'center',padding:32,color:C.muted}}>Nenhuma tese encontrada.</div>
      ):listaFiltrada.map(t=>(
        <div key={t.id} style={{background:C.white,borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 18px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{t.nome_tese}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:4}}>Norma: {t.norma?.numero||'—'} · Regra: {t.regra?.nome_regra||'—'} · {t.visivel_usuario_final?'visível ao cliente':'uso interno'}</div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <button onClick={()=>editar(t)} style={btnOutline}>Editar</button>
            <button onClick={()=>excluir(t.id)} style={btnDanger}>Excluir</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function GestaoCoreJuridico() {
  const [aba, setAba] = useState(0)
  const ABAS = ['📚 Base Jurídica','🔗 Relações entre Normas','⚙️ Motor de Regras','🧠 Base de Teses']

  return (
    <div style={{maxWidth:960,margin:'0 auto'}}>
      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:16,padding:'28px 32px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — NÚCLEO</div>
        <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,color:'#fff'}}>🧩 Core de Inteligência Fiscal e Tributária</h1>
        <p style={{fontSize:14,color:'#cbd5e1',margin:0}}>Painel administrativo da base jurídica, regras e teses reutilizadas por todos os módulos do FiscalTrib.</p>
      </div>
      <TabInterna tabs={ABAS} active={aba} onTab={setAba}/>
      {aba===0&&<PainelBaseJuridica/>}
      {aba===1&&<PainelRelacoes/>}
      {aba===2&&<PainelMotorRegras/>}
      {aba===3&&<PainelTeses/>}
    </div>
  )
}