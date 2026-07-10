import Simuladores from './Simuladores'
import PrazosFiscais from './PrazosFiscais'
import Acompanhamento from './Acompanhamento'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Relatorio from './Relatorio'
import Planos from './Planos'
import ScoreFiscal from './ScoreFiscal'
import TesesTributarias from './TesesTributarias'
import MonitorObrigacoes from './MonitorObrigacoes'
import CentralImportacoes from './CentralImportacoes'
import GestaoRecuperacoes from './GestaoRecuperacoes'
import AnaliseFiscal from './AnaliseFiscal'
import PerdComp from './PerdComp'
import PrazosPrescricionais from './PrazosPrescricionais'
import EntradaDados from './EntradaDados'
import CentralTributaria from './CentralTributaria'
import Admin from './Admin'
import Laboratorio from './Laboratorio'
import DiagnosticoDividaAtiva from './DiagnosticoDividaAtiva'
import Prospeccao from './Prospeccao'
import MensagensRapidas from './MensagensRapidas'

const REGIME_DOCS = {
  'Simples Nacional': ['Extratos do PGDAS-D','Recibos de transmissão PGDAS-D','DEFIS','DAS pagos','Relação de receitas segregadas por anexo','Receitas com substituição tributária','Receitas monofásicas','Receitas com retenção','Receitas de exportação','Notas fiscais de entrada','Notas fiscais de saída','XMLs de NF-e/NFS-e/NFC-e','Relatório de faturamento mensal','Extrato do Simples Nacional','Consulta de débitos','Comprovantes de pagamento'],
  'Lucro Presumido': ['DCTF','ECF','ECD','SPED Fiscal','SPED Contribuições','Livro Caixa','NFs de entrada e saída','Comprovantes IRPJ','Comprovantes CSLL','Comprovantes PIS/COFINS','DARF originais','Relatório de faturamento','Contratos de prestação de serviços','Balancetes mensais','Consulta de débitos','Certidões negativas'],
  'Lucro Real': ['ECF','ECD','SPED Fiscal','SPED Contribuições','LALUR','LACS','DCTF','NFs de entrada e saída','Controles de créditos PIS/COFINS','Relatório de estoques','Ativos imobilizados','Contratos relevantes','Comprovantes de pagamentos','Balancetes mensais','Consulta de débitos','Certidões negativas'],
}

const CLIENTE_VAZIO = {razao_social:'',cnpj:'',cnae_principal:'',cnaes_secundarios:'',inscricao_estadual:'',inscricao_municipal:'',municipio:'',uf:'',regime:'Simples Nacional',competencia_inicio:'',competencia_fim:'',responsavel_contabil:'',observacoes:''}

const maskCNPJ  = v => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2')
const maskIE    = v => v.replace(/[^0-9A-Za-z.\-\/]/g,'').slice(0,20)
const maskIM    = v => v.replace(/[^0-9.\-\/]/g,'').slice(0,15)
const maskCNAE  = v => { const n=v.replace(/\D/g,'').slice(0,7); if(n.length<=2) return n; if(n.length<=4) return n.slice(0,2)+'.'+n.slice(2); if(n.length<=6) return n.slice(0,2)+'.'+n.slice(2,4)+'-'+n.slice(4); return n.slice(0,2)+'.'+n.slice(2,4)+'-'+n.slice(4,5)+'-'+n.slice(5) }
const maskCNAES = v => { const parts=v.split(','); return parts.map((c,i)=>i<parts.length-1?maskCNAE(c.trim()):c.replace(/\D/g,'').slice(0,7)).join(', ') }
const fmtR      = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

const C = {
  navy:'#0B1F4D', navyHov:'#163B8C', navyAct:'#1A4499',
  green:'#22C55E', white:'#FFFFFF',
  bg:'#E4E7EC', border:'#C8D0DC',
  text:'#1E293B', muted:'#64748B',
  sidebar:'#FFFFFF', sidebarBorder:'#C8D0DC',
}

const MODULES = {
  painel:       { label:'Painel',                  icon:'📊', tabs:[] },
  clientes:     { label:'Clientes',                icon:'👥', tabs:['Clientes','Novo cliente','Upload XML','Importações','Checklist'] },
  analise:      { label:'Análise Fiscal',          icon:'🔍', tabs:['Diagnóstico','Análise IA','Teses Tributárias','Simuladores','Calculadoras'] },
  recuperacao:  { label:'Recuperação',             icon:'💰', tabs:['Gestão','PER/DCOMP','Acompanhamento'] },
  prazos:       { label:'Prazos',                  icon:'📅', tabs:['Prescricionais','Prazos Fiscais'] },
  relatorios:   { label:'Relatórios',              icon:'📄', tabs:['Relatório Matador','Score Fiscal'] },
  inteligencia: { label:'Inteligência Tributária', icon:'🧠', tabs:['Central Tributária','Reforma Tributária'] },
  divida:       { label:'Dívida Ativa',            icon:'⚖️', tabs:[] },
  prospeccao:   { label:'Prospecção',              icon:'🎯', tabs:[] },
  mensagens:    { label:'Mensagens Rápidas',       icon:'⚡', tabs:[] },
}

const RESTRICTED = {
  admin: { label:'Admin',                    icon:'⚙️' },
  dev:   { label:'Centro de Desenvolvimento', icon:'🔬' },
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function TabBar({ tabs, activeTab, onTab }) {
  if (!tabs || tabs.length === 0) return null
  return (
    <div style={{ display:'flex', borderBottom:`2px solid ${C.border}`, background:C.white, padding:'0 12px', flexShrink:0, overflowX:'auto' }}>
      {tabs.map((tab, i) => (
        <button key={i} onClick={() => onTab(i)}
          style={{ padding:'10px 14px', fontSize:12, fontWeight: activeTab===i ? 600 : 400, color: activeTab===i ? C.navy : C.muted, background:'none', border:'none', borderBottom: activeTab===i ? `2px solid ${C.navy}` : '2px solid transparent', marginBottom:-2, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s' }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

function Sidebar({ module, onNavigate, clientes, activeId, onChangeCliente, isAdmin, isMobile, menuAberto, setMenuAberto, moduloPermitido = () => true }) {
  if (isMobile && !menuAberto) return null

  const modulosVisiveis = Object.entries(MODULES).filter(([key]) => isAdmin || moduloPermitido(key))

  return (
    <>
      {/* Overlay mobile */}
      {isMobile && (
        <div onClick={() => setMenuAberto(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99 }} />
      )}
      <aside style={{
        width: 220, minHeight:'100%', background:C.sidebar,
        borderRight:`1px solid ${C.sidebarBorder}`,
        display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto',
        ...(isMobile ? {
          position:'fixed', top:0, left:0, height:'100vh', zIndex:100,
          boxShadow:'4px 0 20px rgba(0,0,0,0.2)'
        } : {})
      }}>
        {isMobile && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:`1px solid ${C.sidebarBorder}` }}>
            <img src="/Logo3.png" alt="FiscalTrib" style={{ height:28 }} />
            <button onClick={() => setMenuAberto(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.muted }}>✕</button>
          </div>
        )}
        <div style={{padding:'12px 14px 10px', borderBottom:`1px solid ${C.sidebarBorder}`}}>
          <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:5}}>CLIENTE ATIVO</div>
          <select value={activeId?.toString()||''} onChange={e=>{onChangeCliente(e.target.value||null); if(isMobile) setMenuAberto(false)}}
            style={{width:'100%',padding:'5px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,color:C.text,background:C.white,cursor:'pointer'}}>
            <option value=''>— Nenhum —</option>
            {clientes.map(c=><option key={c.id} value={c.id.toString()}>{c.razao_social}</option>)}
          </select>
        </div>
        <nav style={{flex:1,padding:'6px 0'}}>
          {modulosVisiveis.length === 0 && (
            <div style={{padding:'16px 16px',fontSize:12,color:C.muted}}>Nenhum módulo liberado. Contate o suporte.</div>
          )}
          {modulosVisiveis.map(([key, mod]) => {
            const act = module === key
            return (
              <button key={key} onClick={() => { onNavigate(key); if(isMobile) setMenuAberto(false); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background: act?'#EFF6FF':'none', border:'none', borderLeft: act?`3px solid ${C.navy}`:'3px solid transparent', cursor:'pointer', color: act?C.navy:C.text, fontSize:13, textAlign:'left', fontWeight: act?600:400 }}>
                <span style={{fontSize:16,flexShrink:0}}>{mod.icon}</span>
                <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{mod.label}</span>
              </button>
            )
          })}
          {isAdmin && <>
            <div style={{height:1,background:C.sidebarBorder,margin:'6px 0'}}></div>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:1,padding:'4px 16px 2px'}}>RESTRITO</div>
            {Object.entries(RESTRICTED).map(([key, mod]) => {
              const act = module === key
              return (
                <button key={key} onClick={() => { onNavigate(key); if(isMobile) setMenuAberto(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background: act?'#FFF7ED':'none', border:'none', borderLeft: act?`3px solid #F59E0B`:'3px solid transparent', cursor:'pointer', color: act?'#92400E':C.muted, fontSize:13, textAlign:'left', fontWeight: act?600:400 }}>
                  <span style={{fontSize:16,flexShrink:0}}>{mod.icon}</span>
                  <span>{mod.label}</span>
                </button>
              )
            })}
          </>}
        </nav>
        <div style={{padding:'8px 14px',borderTop:`1px solid ${C.sidebarBorder}`,fontSize:10,color:C.muted}}>fiscaltrib.com.br</div>
      </aside>
    </>
  )
}

function KpiCard({ icon, value, label, color }) {
  return (
    <div style={{background:C.white,borderRadius:12,padding:'16px 20px',border:`1px solid ${C.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',display:'flex',alignItems:'center',gap:12}}>
      <div style={{fontSize:28,flexShrink:0}}>{icon}</div>
      <div>
        <div style={{fontSize:22,fontWeight:700,color,lineHeight:1}}>{value}</div>
        <div style={{fontSize:11,color:C.muted,marginTop:4}}>{label}</div>
      </div>
    </div>
  )
}

function PaginaReforma() {
  const [query,setQuery]=useState('')
  const [resposta,setResposta]=useState('')
  const [carregando,setCarregando]=useState(false)
  const [historico,setHistorico]=useState([])

  const SUGESTOES=['O que é a CBS e como substitui o PIS/COFINS?','Quais são as alíquotas do IBS em 2026?','Como funciona o período de transição da Reforma?','O que muda para empresas do Simples Nacional?','Como recuperar créditos de PIS/COFINS antes da CBS?','O que é o Imposto Seletivo e quem paga?','Qual o cronograma de extinção do ICMS?','Como fica o aproveitamento de créditos no Lucro Real?']

  async function buscar(pergunta) {
    const texto = pergunta || query
    if (!texto.trim()) return
    setCarregando(true); setResposta('')
    try {
      const { data, error } = await supabase.functions.invoke('consulta-ia', {
        body: { mensagem: `Você é um especialista em direito tributário brasileiro com foco na Reforma Tributária (EC 132/2023, LC 214/2025 e legislação complementar). Responda de forma clara, objetiva e com referências às leis quando possível. Pergunta: ${texto}` },
      })
      if (error) throw error
      setResposta(data?.resposta || data?.content || 'Sem resposta.')
      setHistorico(prev => [{ pergunta: texto, resposta: data?.resposta || data?.content || '' }, ...prev].slice(0, 5))
    } catch (e) { setResposta('Erro ao consultar IA: ' + e.message) }
    finally { setCarregando(false) }
  }

  return (
    <div style={{maxWidth:860,margin:'0 auto'}}>
      <div style={{background:'linear-gradient(135deg,#0B1F4D,#163B8C)',borderRadius:16,padding:'24px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — INTELIGÊNCIA TRIBUTÁRIA</div>
        <h1 style={{fontSize:20,fontWeight:900,marginBottom:8,color:'#fff'}}>⚠️ Reforma Tributária</h1>
        <p style={{fontSize:13,color:'#93c5fd',margin:0}}>Consulte leis, decretos e impactos da Reforma — CBS, IBS, IS e período de transição (2026–2032).</p>
      </div>
      <div style={{background:'#fff',borderRadius:14,border:'2px solid #e2e8f0',padding:'16px',marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>🤖 Pergunte sobre a Reforma Tributária</div>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&buscar()}
            placeholder="Ex: Como funciona a CBS?"
            style={{flex:1,minWidth:200,padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,color:C.text,outline:'none'}} />
          <button onClick={()=>buscar()} disabled={carregando}
            style={{padding:'10px 16px',background:C.navy,color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:carregando?'default':'pointer',opacity:carregando?0.7:1}}>
            {carregando?'⏳':'🔍 Buscar'}
          </button>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {SUGESTOES.map((s,i)=>(
            <button key={i} onClick={()=>{setQuery(s);buscar(s)}}
              style={{padding:'5px 10px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:20,fontSize:11,color:'#475569',cursor:'pointer',fontWeight:500}}>{s}</button>
          ))}
        </div>
        {carregando&&<div style={{marginTop:16,background:'#f8fafc',borderRadius:10,padding:'16px',display:'flex',alignItems:'center',gap:12}}><div style={{fontSize:18}}>⏳</div><div style={{fontSize:13,color:C.muted}}>Consultando...</div></div>}
        {resposta&&!carregando&&<div style={{marginTop:16,background:'#f0fdf4',border:'2px solid #86efac',borderRadius:10,padding:'16px'}}><div style={{fontSize:11,fontWeight:700,color:'#16a34a',marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>✅ Resposta</div><div style={{fontSize:13,color:C.text,lineHeight:1.8,whiteSpace:'pre-wrap'}}>{resposta}</div></div>}
      </div>
    </div>
  )
}

export default function Dashboard({ nomeUsuario, onLogout, onAdmin, isAdmin }) {
  const isMobile = useIsMobile()
  const [menuAberto, setMenuAberto] = useState(false)
  const [user,        setUser]        = useState(null)
  const [module, setModule] = useState(() => localStorage.getItem('fiscaltrib_module') || 'painel')
  useEffect(() => { localStorage.setItem('fiscaltrib_module', module) }, [module])
  const [activeTab,   setActiveTab]   = useState(0)
  const [clientes,    setClientes]    = useState([])
  const [entradas,    setEntradas]    = useState({})
  const [checklist,   setChecklist]   = useState({})
  const [activeId, setActiveId] = useState(() => localStorage.getItem('fiscaltrib_cliente') || null)
  useEffect(() => { if (activeId) localStorage.setItem('fiscaltrib_cliente', activeId) }, [activeId])
  const [calcTab,     setCalcTab]     = useState('fator-r')
  const [calcResult,  setCalcResult]  = useState('')
  const [novoCliente, setNovoCliente] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [salvando,    setSalvando]    = useState(false)

  const [cFolha,setCFolha]=useState(''); const [cRb,setCRb]=useState('')
  const [cRbt12,setCRbt12]=useState(''); const [cRmes,setCRmes]=useState('')
  const [cFat,setCFat]=useState(''); const [cMarg,setCMarg]=useState(''); const [cAtv,setCAtv]=useState('comercio')
  const [cRbt,setCRbt]=useState(''); const [cAtv2,setCAtv2]=useState('8'); const [cDtpag,setCDtpag]=useState('')

  const [permissoesModulos, setPermissoesModulos] = useState(null)

  useEffect(()=>{ carregarClientes(); if(!onAdmin) carregarPermissoesModulos() },[])

  useEffect(()=>{
    registrarPresenca()
    const interval = setInterval(registrarPresenca, 60000)
    return ()=>clearInterval(interval)
  },[])

  // Se o módulo atual for bloqueado pelas permissões, redireciona para o primeiro módulo liberado
  useEffect(() => {
    if (onAdmin) return
    if (!permissoesModulos) return
    if (module === 'admin' || module === 'dev') return
    if (permissoesModulos[module] === false) {
      const primeiroPermitido = Object.keys(MODULES).find(k => permissoesModulos[k] !== false)
      setModule(primeiroPermitido || 'painel')
      setActiveTab(0)
    }
  }, [permissoesModulos])

  async function carregarPermissoesModulos() {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('modulos_permissoes').select('*').eq('usuario_id', user.id).single()
    setPermissoesModulos(data || {})
  }

  function moduloPermitido(key) {
    if (onAdmin) return true
    if (!permissoesModulos) return true
    return permissoesModulos[key] !== false
  }

  async function registrarPresenca() {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) return
      const modLabel = MODULES[module]?.label || RESTRICTED[module]?.label || module
      await supabase.from('sessoes_ativas').upsert({
        usuario_id: user.id, email: user.email, nome: nomeUsuario || user.email,
        ultima_atividade: new Date().toISOString(), pagina_atual: modLabel,
      }, { onConflict: 'usuario_id' })
    } catch(e) {}
  }

  async function carregarClientes() {
    setLoading(true)
    const { data:{ user } } = await supabase.auth.getUser()
    setUser(user)
    const { data,error } = await supabase.from('clientes').select('*').eq('usuario_id',user.id).order('id',{ascending:false})
    if(!error&&data){
      setClientes(data)
      if(data.length>0 && !activeId) setActiveId(data[0].id.toString())
      const ids=data.map(c=>c.id)
      if(ids.length>0){
        const { data:ents }=await supabase.from('entradas').select('*').in('cliente_id',ids)
        if(ents){ const map={}; ents.forEach(e=>{if(!map[e.cliente_id])map[e.cliente_id]=[];map[e.cliente_id].push(e)}); setEntradas(map) }
      }
    }
    setLoading(false)
  }

  async function excluirCliente(c) {
    if (!window.confirm(`Excluir "${c.razao_social}" e todos os seus dados?`)) return
    await supabase.from('entradas').delete().eq('cliente_id', c.id)
    await supabase.from('recuperacoes').delete().eq('cliente_id', c.id)
    await supabase.from('acompanhamentos').delete().eq('cliente_id', c.id)
    await supabase.from('prazos_fiscais').delete().eq('cliente_id', c.id)
    await supabase.from('checklist').delete().eq('cliente_id', c.id)
    await supabase.from('scores_fiscais').delete().eq('cliente_id', c.id)
    await supabase.from('monitor_obrigacoes').delete().eq('cliente_id', c.id)
    await supabase.from('perdcomp').delete().eq('cliente_id', c.id)
    await supabase.from('exigencias_fiscais').delete().eq('cliente_id', c.id)
    await supabase.from('relatorios_importacao').delete().eq('cliente_id', c.id)
    const { error } = await supabase.from('clientes').delete().eq('id', c.id)
    if (error) { alert('Erro ao excluir cliente: ' + error.message); return }
    setClientes(prev => prev.filter(x => x.id !== c.id))
    const novaEntradas = { ...entradas }; delete novaEntradas[c.id]; setEntradas(novaEntradas)
  }

  async function salvarCliente() {
    if(!novoCliente) return
    setSalvando(true)
    const { data:{ user } } = await supabase.auth.getUser()
    const payload={razao_social:novoCliente.razao_social,nome_fantasia:novoCliente.nome_fantasia||'',cnpj:novoCliente.cnpj,cnae_principal:novoCliente.cnae_principal,cnaes_secundarios:novoCliente.cnaes_secundarios||'',inscricao_estadual:novoCliente.inscricao_estadual||'',inscricao_municipal:novoCliente.inscricao_municipal||'',municipio:novoCliente.municipio,uf:novoCliente.uf,regime:novoCliente.regime,competencia_inicio:novoCliente.competencia_inicio,competencia_fim:novoCliente.competencia_fim,responsavel_contabil:novoCliente.responsavel_contabil,observacoes:novoCliente.observacoes}
    if(novoCliente.id){
      const { error }=await supabase.from('clientes').update(payload).eq('id',novoCliente.id)
      if(!error) setClientes(clientes.map(c=>c.id===novoCliente.id?{...c,...novoCliente}:c))
      else alert('Erro: '+error.message)
    } else {
      const { data,error }=await supabase.from('clientes').insert([{...payload,usuario_id:user.id,status:'Em análise'}]).select()
      if(!error&&data){ setClientes([data[0],...clientes]); setActiveId(data[0].id.toString()); setEntradas({...entradas,[data[0].id]:[]}) }
      else alert('Erro: '+error.message)
    }
    setSalvando(false); navigateTo('clientes', 0)
  }

  function toggleCheck(idx) {
    const arr=checklist[activeId]||(REGIME_DOCS[active?.regime]||[]).map(()=>false)
    const novo=[...arr]; novo[idx]=!novo[idx]
    setChecklist({...checklist,[activeId]:novo})
  }

  function navigateTo(mod, tab=0) { setModule(mod); setActiveTab(tab) }
  function handleNavigate(key) { setModule(key); setActiveTab(0); if(key==='clientes') setNovoCliente(null) }
  function handleTab(i) { setActiveTab(i); if(module==='clientes' && i===1) setNovoCliente({...CLIENTE_VAZIO}) }

  async function preencherViaXML(file) {
    const text = await file.text()
    const doc = new DOMParser().parseFromString(text, 'application/xml')
    const emitEl = Array.from(doc.getElementsByTagNameNS('*', 'emit'))[0]
    const getEmit = tag => emitEl ? Array.from(emitEl.getElementsByTagNameNS('*', tag))[0]?.textContent?.trim() || '' : ''
    const cnpj=getEmit('CNPJ'); const nome=getEmit('xNome'); const fantasia=getEmit('xFant')
    const cnae=getEmit('CNAE'); const uf=getEmit('UF'); const municipio=getEmit('xMun')
    const ie=getEmit('IE'); const im=getEmit('IM'); const crt=getEmit('CRT')
    const regime = crt==='1'||crt==='2'?'Simples Nacional':'Lucro Presumido'
    const cnpjFmt = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
    setNovoCliente(prev=>({...prev,razao_social:nome,nome_fantasia:fantasia,cnpj:cnpjFmt,cnae_principal:maskCNAE(cnae),municipio,uf,inscricao_estadual:ie,inscricao_municipal:im,regime}))
  }

  const active     = clientes.find(c=>c.id.toString()===activeId)||null
  const ents       = entradas[activeId]||[]
  const totalPot   = ents.reduce((s,e)=>s+(e.credito||0),0)
  const totalGeral = clientes.reduce((s,c)=>{const ee=entradas[c.id]||[];return s+ee.reduce((a,e)=>a+(e.credito||0),0)},0)
  const totalOpp   = clientes.reduce((s,c)=>(entradas[c.id]||[]).length+s,0)
  const hoje       = new Date()
  const criticos   = clientes.reduce((s,c)=>s+(entradas[c.id]||[]).filter(e=>{const[a,m]=(e.competencia||'').split('-');const lim=new Date(parseInt(a)+5,parseInt(m)-1,1);return(lim-hoje)/(1000*60*60*24*365)<=1&&e.credito>0}).length,0)
  const docs       = REGIME_DOCS[active?.regime]||[]
  const checks     = checklist[activeId]||docs.map(()=>false)
  const done       = checks.filter(Boolean).length
  const pct        = docs.length?Math.round(done/docs.length*100):0

  const badge      = regime=>{ const colors={'Simples Nacional':'#dbeafe|#1e40af','Lucro Presumido':'#fef3c7|#92400e','Lucro Real':'#dcfce7|#166534'}; const[bg,color]=(colors[regime]||'#f1f5f9|#475569').split('|'); return <span style={{background:bg,color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>• {regime}</span> }
  const riskBadge  = r=>{ const c=r==='baixo'?'#dcfce7|#166534':r==='medio'?'#fef9c3|#854d0e':'#fee2e2|#991b1b'; const[bg,color]=c.split('|'); return <span style={{background:bg,color,padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>{r}</span> }
  const applyMask  = (k,v)=>{ if(k==='cnpj') return maskCNPJ(v); if(k==='cnae_principal') return maskCNAE(v); if(k==='cnaes_secundarios') return maskCNAES(v); if(k==='inscricao_estadual') return maskIE(v); if(k==='inscricao_municipal') return maskIM(v); return v }
  const inp        = (val,set,ph,tp='text')=><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={tp} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}} />
  const sel        = (val,set,opts)=><select value={val} onChange={e=>set(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%'}}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>

  function calcFatorR(){const f=parseFloat(cFolha)||0;const r=parseFloat(cRb)||1;const fr=f/r;setCalcResult(`Fator R: ${(fr*100).toFixed(2)}% — Anexo ${fr>=0.28?'III (menor carga)':'V (maior carga)'}\n${fr>=0.28?'✅ Enquadrado no Anexo III.':'⚠️ Anexo V — considere aumentar folha.'}`)}
  function calcDAS(){const rbt=parseFloat(cRbt12)||0;const rm=parseFloat(cRmes)||0;let aliq=4,ded=0;if(rbt>180000){aliq=7.3;ded=5940}if(rbt>360000){aliq=9.5;ded=13860}if(rbt>720000){aliq=10.7;ded=22500}if(rbt>1800000){aliq=14.3;ded=87300}if(rbt>3600000){aliq=19;ded=378000}const ef=Math.max(0,((rbt*(aliq/100))-ded)/rbt*100);setCalcResult(`DAS estimado: ${fmtR(rm*(ef/100))}\nAlíquota efetiva: ${ef.toFixed(2)}%`)}
  function calcRegime(){const f=parseFloat(cFat)||0;const m=parseFloat(cMarg)||0;const l=f*(m/100);const sn=f*0.12;const lp=(f*0.0365)+(f*(cAtv==='servicos'?0.32:0.08)*0.15)+(f*(cAtv==='servicos'?0.32:0.12)*0.09);const lr=(l*0.34)+(f*0.0365);setCalcResult(`Simples Nacional: ${fmtR(sn)} (${(sn/f*100).toFixed(1)}%)\nLucro Presumido: ${fmtR(lp)} (${(lp/f*100).toFixed(1)}%)\nLucro Real: ${fmtR(lr)} (${(lr/f*100).toFixed(1)}%)`)}
  function calcIRPJ(){const rb=parseFloat(cRbt)||0;const p=parseFloat(cAtv2)||8;const bi=rb*(p/100);const bc=rb*(p===32?32:p===16?16:12)/100;const irpj=bi*0.15+Math.max(0,(bi-60000)*0.10);const csll=bc*0.09;setCalcResult(`IRPJ: ${fmtR(irpj)}\nCSLL: ${fmtR(csll)}\nTotal: ${fmtR(irpj+csll)}`)}
  function calcPrescricao(){if(!cDtpag){setCalcResult('Informe a data.');return}const p=new Date(cDtpag);const l=new Date(p);l.setFullYear(l.getFullYear()+5);const dias=Math.round((l-hoje)/(1000*60*60*24));if(dias<0){setCalcResult(`⚠️ PRAZO PRESCRITO em ${l.toLocaleDateString('pt-BR')}!`)}else{setCalcResult(`Prazo limite: ${l.toLocaleDateString('pt-BR')}\nDias restantes: ${dias}\n${dias<=365?'⚠️ CRÍTICO — menos de 1 ano!':'✅ Prazo confortável.'}`)}}

  const btnPrimary={padding:'10px 16px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}
  const btnOutline={padding:'10px 16px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}
  const btnDanger ={padding:'4px 12px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:500}
  const btnVoltar ={ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', background:'none', border:`1.5px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer', marginBottom:16 }

  const currentTabs = MODULES[module]?.tabs || []
  const padding = isMobile ? '16px' : '24px 28px'

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,system-ui,sans-serif',fontSize:16,color:C.navy}}>Carregando...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',width:'100vw',overflow:'hidden',fontFamily:'Inter,system-ui,sans-serif'}}>

      {/* HEADER */}
      <div style={{background:C.navy,display:'flex',alignItems:'center',padding:'0 16px',height:52,flexShrink:0,gap:10}}>
        {isMobile && (
          <button onClick={() => setMenuAberto(true)} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:'4px 8px', flexShrink:0 }}>☰</button>
        )}
        <img src="/Logo3.png" alt="e-FiscalTrib" style={{height:30,objectFit:'contain',flexShrink:0}} />
        {!isMobile && <span style={{fontSize:12,color:'rgba(255,255,255,0.7)',flex:1}}>Sistema de diagnóstico e recuperação tributária</span>}
        <div style={{flex:1}} />
        {active && !isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.1)',padding:'4px 10px',borderRadius:20}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#F0B429',flexShrink:0}}></div>
            <span style={{fontSize:11,color:C.white,fontWeight:500,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{active.razao_social}</span>
          </div>
        )}
        {!isMobile && <span style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>👤 {nomeUsuario||'Usuário'}</span>}
        {onAdmin && !isMobile && <button onClick={onAdmin} style={{background:'#F59E0B',border:'none',color:C.white,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600}}>⚙️ Admin</button>}
        <button onClick={()=>onLogout()} style={{background:'none',border:'1px solid rgba(255,255,255,0.3)',color:'rgba(255,255,255,0.7)',padding:'4px 10px',borderRadius:6,cursor:'pointer',fontSize:12}}>Sair</button>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <Sidebar module={module} onNavigate={handleNavigate} clientes={clientes} activeId={activeId} onChangeCliente={setActiveId} isAdmin={!!onAdmin} isMobile={isMobile} menuAberto={menuAberto} setMenuAberto={setMenuAberto} moduloPermitido={moduloPermitido} />

        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <TabBar tabs={currentTabs} activeTab={activeTab} onTab={handleTab} />

          <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding,background:C.bg,minWidth:0}}>

            {/* ── PAINEL ── */}
            {module==='painel' && <>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text}}>Painel Geral</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>Visão consolidada dos casos em andamento.</div>
              </div>
              <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#92400E'}}>
                ⚠️ <strong>Aviso:</strong> Análise preliminar — não dispensa revisão profissional.
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:20}}>
                <KpiCard icon="👥" value={clientes.length}  label="Clientes"        color="#2563EB" />
                <KpiCard icon="🎯" value={totalOpp}         label="Oportunidades"   color="#7C3AED" />
                <KpiCard icon="💰" value={fmtR(totalGeral)} label="Potencial"       color="#16A34A" />
                <KpiCard icon="⏱️" value={criticos}         label="Críticos"        color="#DC2626" />
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:20}}>
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>🎯 Prospecção</div>
                    <div style={{fontSize:12,color:C.muted}}>Cockpit comercial e Kanban.</div>
                  </div>
                  <button onClick={()=>navigateTo('prospeccao')} style={{...btnOutline,padding:'6px 12px',fontSize:12,whiteSpace:'nowrap'}}>Abrir →</button>
                </div>
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>⚡ Mensagens Rápidas</div>
                    <div style={{fontSize:12,color:C.muted}}>Templates para WhatsApp.</div>
                  </div>
                  <button onClick={()=>navigateTo('mensagens')} style={{...btnOutline,padding:'6px 12px',fontSize:12,whiteSpace:'nowrap'}}>Abrir →</button>
                </div>
              </div>
              {clientes.length===0 ? (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:32,textAlign:'center'}}>
                  <div style={{fontSize:36,marginBottom:12}}>👥</div>
                  <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Nenhum cliente ainda</div>
                  <button onClick={()=>navigateTo('clientes',1)} style={btnPrimary}>+ Cadastrar primeiro cliente</button>
                </div>
              ) : (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
                  <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:14,fontWeight:600,color:C.text}}>Clientes</span>
                    <button onClick={()=>navigateTo('clientes',0)} style={{...btnOutline,padding:'5px 12px',fontSize:12}}>Ver todos</button>
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead><tr style={{background:'#F8FAFC'}}>{['Razão Social','CNPJ','Regime','Potencial',''].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                      <tbody>{clientes.map(c=>{const ee=entradas[c.id]||[];const tot=ee.reduce((s,e)=>s+(e.credito||0),0);return(
                        <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'10px 12px',fontWeight:600,color:C.text,whiteSpace:'nowrap'}}>{c.razao_social}</td>
                          <td style={{padding:'10px 12px',color:C.muted,fontSize:11,whiteSpace:'nowrap'}}>{c.cnpj}</td>
                          <td style={{padding:'10px 12px'}}>{badge(c.regime)}</td>
                          <td style={{padding:'10px 12px',color:'#16A34A',fontWeight:600,whiteSpace:'nowrap'}}>{fmtR(tot)}</td>
                          <td style={{padding:'10px 12px'}}><button onClick={()=>{setActiveId(c.id.toString());navigateTo('analise',0)}} style={{...btnOutline,padding:'4px 10px',fontSize:11}}>Analisar</button></td>
                        </tr>
                      )})}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </>}

            {/* ── CLIENTES ── */}
            {module==='clientes' && activeTab===0 && <>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
                <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text}}>Clientes cadastrados</div>
                <button onClick={()=>handleTab(1)} style={{...btnPrimary,padding:'7px 14px',fontSize:13}}>+ Novo</button>
              </div>
              {clientes.length===0 && <div style={{textAlign:'center',padding:40,color:C.muted}}>Nenhum cliente cadastrado ainda.</div>}
              {clientes.map(c=>{const ee=entradas[c.id]||[];const tot=ee.reduce((s,e)=>s+(e.credito||0),0);return(
                <div key={c.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px',marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>{c.razao_social}</div>
                      <div style={{fontSize:11,color:C.muted,marginBottom:6}}>{c.cnpj} · {c.municipio}/{c.uf}</div>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{badge(c.regime)}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:700,color:'#16A34A'}}>{fmtR(tot)}</div>
                      <div style={{fontSize:10,color:C.muted,marginBottom:8}}>potencial</div>
                      <div style={{display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                        <button onClick={()=>{setNovoCliente({...c});setActiveTab(1)}} style={{...btnOutline,padding:'4px 10px',fontSize:11}}>Editar</button>
                        <button onClick={()=>{setActiveId(c.id.toString());navigateTo('analise',0)}} style={{...btnPrimary,padding:'4px 10px',fontSize:11}}>Analisar</button>
                        <button onClick={()=>excluirCliente(c)} style={btnDanger}>🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </>}

            {module==='clientes' && activeTab===1 && novoCliente && <>
              <button onClick={()=>navigateTo('clientes',0)} style={btnVoltar}>← Voltar</button>
              <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text,marginBottom:20}}>{novoCliente.id?'Editar cliente':'Novo cliente'}</div>
              {!novoCliente.id && (
                <div style={{background:'#eff6ff',border:'2px dashed #bfdbfe',borderRadius:12,padding:'14px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e40af',marginBottom:4}}>⚡ Preencher via XML de NF-e</div>
                    <div style={{fontSize:12,color:C.muted}}>Importe um XML para preencher automaticamente</div>
                  </div>
                  <label style={{padding:'8px 16px',background:'#1e40af',color:'#fff',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                    📂 Importar XML
                    <input type="file" accept=".xml" style={{display:'none'}} onChange={async e=>{const file=e.target.files[0];if(!file)return;await preencherViaXML(file);e.target.value=''}} />
                  </label>
                </div>
              )}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.navy,marginBottom:14}}>📋 Identificação</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14}}>
                  {[['Razão Social *','razao_social'],['Nome Fantasia','nome_fantasia'],['CNPJ *','cnpj'],['CNAE Principal','cnae_principal'],['CNAEs Secundários','cnaes_secundarios'],['Inscrição Estadual','inscricao_estadual'],['Inscrição Municipal','inscricao_municipal'],['Município','municipio'],['UF','uf']].map(([lb,k])=>(
                    <div key={k} style={{display:'flex',flexDirection:'column',gap:5}}>
                      <label style={{fontSize:12,fontWeight:500,color:C.text}}>{lb}</label>
                      <input value={novoCliente[k]||''} onChange={e=>setNovoCliente({...novoCliente,[k]:applyMask(k,e.target.value)})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}} />
                    </div>
                  ))}
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    <label style={{fontSize:12,fontWeight:500,color:C.text}}>Regime tributário *</label>
                    <select value={novoCliente.regime||'Simples Nacional'} onChange={e=>setNovoCliente({...novoCliente,regime:e.target.value})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
                      <option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.navy,marginBottom:14}}>📅 Período de análise</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14}}>
                  {[['Competência inicial','competencia_inicio','month'],['Competência final','competencia_fim','month'],['Responsável contábil','responsavel_contabil','text'],['Observações','observacoes','text']].map(([lb,k,tp])=>(
                    <div key={k} style={{display:'flex',flexDirection:'column',gap:5}}>
                      <label style={{fontSize:12,fontWeight:500,color:C.text}}>{lb}</label>
                      <input type={tp} value={novoCliente[k]||''} onChange={e=>setNovoCliente({...novoCliente,[k]:e.target.value})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={salvarCliente} disabled={salvando} style={btnPrimary}>{salvando?'💾 Salvando...':'💾 Salvar'}</button>
                <button onClick={()=>setActiveTab(0)} style={btnOutline}>Cancelar</button>
              </div>
            </>}

            {module==='clientes' && activeTab===2 && <EntradaDados clienteId={activeId} cliente={active} onSalvo={()=>carregarClientes()} setPage={(destino) => {
              if (destino === 'lista') navigateTo('clientes', 0)
              else if (destino === 'diagnostico') navigateTo('analise', 0)
              else if (destino === 'importacoes') navigateTo('clientes', 3)
              else if (destino === 'relatorio') navigateTo('relatorios', 0)
            }} />}

            {module==='clientes' && activeTab===3 && <>
              <button onClick={()=>navigateTo('clientes',0)} style={btnVoltar}>← Voltar</button>
              <CentralImportacoes abaInicial="nfe" onDiagnostico={()=>navigateTo('analise',0)} onRelatorio={()=>navigateTo('relatorios',0)} onRecuperacao={()=>navigateTo('recuperacao',0)} />
            </>}

            {module==='clientes' && activeTab===4 && <>
              <button onClick={()=>navigateTo('clientes',0)} style={btnVoltar}>← Voltar</button>
              <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text,marginBottom:4}}>Checklist documental</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{active?.razao_social} · {active?.regime}</div>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
                <div style={{background:C.border,borderRadius:99,height:8,overflow:'hidden',marginBottom:6}}><div style={{background:C.green,height:8,borderRadius:99,width:pct+'%',transition:'width .3s'}}></div></div>
                <div style={{fontSize:12,color:C.muted}}>{done} de {docs.length} documentos — {pct}%</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:8,marginBottom:16}}>
                {docs.map((d,i)=>(
                  <div key={i} onClick={()=>toggleCheck(i)} style={{display:'flex',alignItems:'center',gap:8,background:checks[i]?'#F0FDF4':C.white,border:`1px solid ${checks[i]?'#86EFAC':C.border}`,borderRadius:8,padding:'10px 12px',cursor:'pointer',fontSize:12,color:checks[i]?'#166534':C.text}}>
                    <input type="checkbox" checked={checks[i]} onChange={()=>toggleCheck(i)} style={{accentColor:C.green,width:14,height:14}} />{d}
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button onClick={()=>navigateTo('clientes',2)} style={btnPrimary}>Avançar</button>
                <button onClick={()=>navigateTo('analise',0)} style={btnOutline}>Ir para diagnóstico</button>
              </div>
            </>}

            {/* ── ANÁLISE FISCAL ── */}
            {module==='analise' && activeTab===0 && <>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text}}>Diagnóstico tributário</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{active?.razao_social} · {active?.regime}</div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>navigateTo('relatorios',0)} style={{...btnOutline,padding:'6px 12px',fontSize:12}}>📄 Relatório</button>
                  <button onClick={()=>navigateTo('clientes',2)} style={{...btnOutline,padding:'6px 12px',fontSize:12}}>+ Dados</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {[[fmtR(totalPot),'Total potencial','#16A34A'],[ents.filter(e=>e.risco==='baixo'&&e.credito>0).length,'Confirmados','#0D9488'],[ents.filter(e=>e.risco==='medio'&&e.credito>0).length,'Possíveis','#D97706'],[ents.filter(e=>e.risco==='alto'&&e.credito>0).length,'A validar','#DC2626']].map(([v,lb,vc],i)=>(
                  <div key={i} style={{background:C.white,borderRadius:12,padding:16,borderTop:`4px solid ${vc}`}}>
                    <div style={{fontSize:i===0?16:22,fontWeight:700,color:vc,marginBottom:4}}>{v}</div>
                    <div style={{fontSize:11,color:C.muted}}>{lb}</div>
                  </div>
                ))}
              </div>
              {ents.filter(e=>e.credito>0).length>0 ? (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr style={{background:'#F8FAFC'}}>{['Competência','Tributo','Crédito','Risco'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.4,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                    <tbody>{ents.filter(e=>e.credito>0).map((e,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:'8px 12px',whiteSpace:'nowrap'}}>{e.competencia}</td>
                        <td style={{padding:'8px 12px'}}>{e.tributo}</td>
                        <td style={{padding:'8px 12px',fontWeight:600,color:'#16A34A',whiteSpace:'nowrap'}}>{fmtR(e.credito)}</td>
                        <td style={{padding:'8px 12px'}}>{riskBadge(e.risco)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : ents.length>0 ? (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:32,textAlign:'center'}}>
                  <div style={{fontSize:36,marginBottom:12}}>✅</div>
                  <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Nenhuma oportunidade de recuperação identificada</div>
                  <div style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.5,maxWidth:480,marginLeft:'auto',marginRight:'auto'}}>
                    O Motor analisou {ents.length} {ents.length===1?'item':'itens'} deste cliente e não encontrou produtos com tributação monofásica ou outras oportunidades no período importado.
                  </div>
                  <div style={{fontSize:12,color:C.muted}}>Isso costuma indicar que os produtos não se enquadram nas hipóteses de recuperação mapeadas — não é um erro do sistema.</div>
                </div>
              ) : (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:32,textAlign:'center'}}>
                  <div style={{fontSize:36,marginBottom:12}}>🔍</div>
                  <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Nenhuma oportunidade mapeada</div>
                  <button onClick={()=>navigateTo('clientes',2)} style={btnPrimary}>+ Adicionar dados fiscais</button>
                </div>
              )}
            </>}
            {module==='analise' && activeTab===1 && <AnaliseFiscal clienteAtivo={activeId} />}
            {module==='analise' && activeTab===2 && <TesesTributarias />}
            {module==='analise' && activeTab===3 && <Simuladores />}
            {module==='analise' && activeTab===4 && <>
              <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text,marginBottom:4}}>Calculadoras tributárias</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Estimativas para diagnóstico</div>
              <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:`2px solid ${C.border}`,overflowX:'auto'}}>
                {[['fator-r','🔺 Fator R'],['das','📋 DAS'],['regime','⚖️ Regime'],['irpj','💰 IRPJ'],['prescricao','⏰ Prescrição']].map(([id,lb])=>(
                  <div key={id} onClick={()=>{setCalcTab(id);setCalcResult('')}} style={{padding:'8px 14px',fontSize:12,fontWeight:calcTab===id?600:500,color:calcTab===id?C.navy:C.muted,cursor:'pointer',borderBottom:`2px solid ${calcTab===id?C.navy:'transparent'}`,marginBottom:-2,whiteSpace:'nowrap'}}>{lb}</div>
                ))}
              </div>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:20,maxWidth:580}}>
                {calcTab==='fator-r'    && <><div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:14}}>🔺 Fator R</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Folha 12 meses (R$)</label>{inp(cFolha,setCFolha,'Ex: 120000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Receita bruta 12 meses (R$)</label>{inp(cRb,setCRb,'Ex: 480000','number')}</div></div><button onClick={calcFatorR} style={btnPrimary}>Calcular →</button></>}
                {calcTab==='das'        && <><div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:14}}>📋 DAS Simples Nacional</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>RBT12 (R$)</label>{inp(cRbt12,setCRbt12,'Ex: 720000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Receita do mês (R$)</label>{inp(cRmes,setCRmes,'Ex: 60000','number')}</div></div><button onClick={calcDAS} style={btnPrimary}>Calcular →</button></>}
                {calcTab==='regime'     && <><div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:14}}>⚖️ Simulador de regime</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Faturamento anual (R$)</label>{inp(cFat,setCFat,'Ex: 1200000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Margem líquida (%)</label>{inp(cMarg,setCMarg,'Ex: 15','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Atividade</label>{sel(cAtv,setCAtv,[['comercio','Comércio'],['industria','Indústria'],['servicos','Serviços']])}</div></div><button onClick={calcRegime} style={btnPrimary}>Simular →</button></>}
                {calcTab==='irpj'       && <><div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:14}}>💰 IRPJ/CSLL</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Receita bruta trimestral (R$)</label>{inp(cRbt,setCRbt,'Ex: 300000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Atividade</label>{sel(cAtv2,setCAtv2,[['8','Comércio/Indústria (8%)'],['16','Transporte (16%)'],['32','Serviços (32%)']])}</div></div><button onClick={calcIRPJ} style={btnPrimary}>Calcular →</button></>}
                {calcTab==='prescricao' && <><div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:14}}>⏰ Prescrição</div><div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Data de pagamento indevido</label><input type="date" value={cDtpag} onChange={e=>setCDtpag(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}} /></div><button onClick={calcPrescricao} style={btnPrimary}>Calcular →</button></>}
                {calcResult && <div style={{marginTop:16,background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8,padding:'14px',fontSize:13,color:'#166534',whiteSpace:'pre-line'}}>{calcResult}</div>}
              </div>
            </>}

            {module==='recuperacao' && activeTab===0 && <GestaoRecuperacoes />}
            {module==='recuperacao' && activeTab===1 && <PerdComp />}
            {module==='recuperacao' && activeTab===2 && <Acompanhamento />}
            {module==='prazos' && activeTab===0 && <PrazosPrescricionais active={active} />}
            {module==='prazos' && activeTab===1 && <PrazosFiscais />}
            {module==='relatorios' && activeTab===0 && <Relatorio active={active} ents={ents} />}
            {module==='relatorios' && activeTab===1 && <ScoreFiscal />}
            {module==='inteligencia' && activeTab===0 && <CentralTributaria onVoltar={()=>navigateTo('painel')} />}
            {module==='inteligencia' && activeTab===1 && <PaginaReforma />}
            {module==='divida' && <DiagnosticoDividaAtiva active={active} />}
            {module==='prospeccao' && <Prospeccao onVoltar={()=>navigateTo('painel')} />}
            {module==='mensagens' && <MensagensRapidas onVoltar={()=>navigateTo('painel')} />}
            {module==='admin' && <Admin onVoltar={()=>navigateTo('painel')} />}
            {module==='dev' && <Laboratorio onVoltar={()=>navigateTo('painel')} />}

          </div>
        </div>
      </div>
    </div>
  )
}