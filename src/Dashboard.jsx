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

const PAGE_LABELS = {
  painel:'Painel', clientes:'Clientes', diagnostico:'Diagnóstico',
  entrada:'Entrada de Dados', checklist:'Checklist', score:'Score Fiscal',
  analise:'IA Tributária', teses:'Teses', recuperacoes:'Recuperações',
  monitor:'Monitor de Obrigações', importacoes:'Importações',
  central:'Central Tributária', calculadoras:'Calculadoras',
  simuladores:'Simuladores', relatorio:'Relatório', perdcomp:'PER/DCOMP',
  prazos:'Controle Prescricional', acompanhamento:'Acompanhamento',
  prazosfiscais:'Prazos Fiscais', reforma:'Reforma Tributária',
}

const MENU = [
  { label:'Painel',                key:'painel',        icon:'📊' },
  { label:'Clientes',              key:'clientes',      icon:'👥' },
  { label:'Novo cliente',          key:'novo-cliente',  icon:'➕' },
  { label:'Checklist',             key:'checklist',     icon:'✅' },
  { label:'Entrada de Dados',      key:'entrada',       icon:'📝' },
  { label:'Diagnóstico',           key:'diagnostico',   icon:'🔍' },
  { label:'Prazos',                key:'prazos',        icon:'⏱️' },
  { label:'Relatório',             key:'relatorio',     icon:'📄' },
  { label:'Calculadoras',          key:'calculadoras',  icon:'🧮' },
  { label:'Simuladores',           key:'simuladores',   icon:'📈' },
  { label:'IA Tributária',         key:'analise',       icon:'🤖' },
  { label:'Teses',                 key:'teses',         icon:'⚖️' },
  { label:'Recuperações',          key:'recuperacoes',  icon:'💰' },
  { label:'PER/DCOMP',             key:'perdcomp',      icon:'📋' },
  { label:'Acompanhamento',        key:'acompanhamento',icon:'🔄' },
  { label:'Monitor de Obrigações', key:'monitor',       icon:'🗓️' },
  { label:'Prazos Fiscais',        key:'prazosfiscais', icon:'📅' },
  { label:'Importações',           key:'importacoes',   icon:'📥' },
  { label:'Score Fiscal',          key:'score',         icon:'🎯' },
  { label:'Central Tributária',    key:'central',       icon:'🏛️' },
]

function Sidebar({ page, onNavigate, clientes, activeId, onChangeCliente }) {
  return (
    <aside style={{ width:295, minHeight:'100%', background:C.sidebar, borderRight:`1px solid ${C.sidebarBorder}`, display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
      <div style={{padding:'14px 14px 10px', borderBottom:`1px solid ${C.sidebarBorder}`}}>
        <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:6}}>CLIENTE ATIVO</div>
        <select value={activeId?.toString()||''} onChange={e=>onChangeCliente(e.target.value||null)}
          style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,color:C.text,background:C.white,cursor:'pointer'}}>
          <option value=''>— Nenhum —</option>
          {clientes.map(c=><option key={c.id} value={c.id.toString()}>{c.razao_social}</option>)}
        </select>
      </div>
      <nav style={{flex:1,padding:'8px 0'}}>
        {MENU.map(item => {
          const act = page===item.key
          return (
            <button key={item.key} onClick={()=>onNavigate(item.key)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 16px', background: act?'#EFF6FF':'none', border:'none', borderLeft: act?`3px solid ${C.navy}`:'3px solid transparent', cursor:'pointer', color: act?C.navy:C.text, fontSize:13, textAlign:'left', fontWeight: act?600:400, transition:'background 0.15s' }}
              onMouseEnter={e=>{ if(!act) e.currentTarget.style.background='#F8FAFC' }}
              onMouseLeave={e=>{ if(!act) e.currentTarget.style.background='none' }}>
              <span style={{fontSize:15,flexShrink:0}}>{item.icon}</span>
              <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div style={{padding:'10px 14px',borderTop:`1px solid ${C.sidebarBorder}`,fontSize:10,color:C.muted}}>fiscaltrib.com.br</div>
    </aside>
  )
}

function KpiCard({ icon, value, label, color }) {
  return (
    <div style={{background:C.white,borderRadius:12,padding:'20px 24px',border:`1px solid ${C.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',display:'flex',alignItems:'center',gap:16}}>
      <div style={{fontSize:36,flexShrink:0}}>{icon}</div>
      <div>
        <div style={{fontSize:26,fontWeight:700,color,lineHeight:1}}>{value}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>{label}</div>
      </div>
    </div>
  )
}

function BtnVoltar({ onClick }) {
  return (
    <button onClick={onClick} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'none',border:`1.5px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer',marginBottom:20}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.navy;e.currentTarget.style.color=C.navy}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted}}>
      ← Voltar
    </button>
  )
}

function PaginaReforma({ onVoltar }) {
  const [query,      setQuery]      = useState('')
  const [resposta,   setResposta]   = useState('')
  const [carregando, setCarregando] = useState(false)
  const [historico,  setHistorico]  = useState([])

  const SUGESTOES = [
    'O que é a CBS e como substitui o PIS/COFINS?',
    'Quais são as alíquotas do IBS em 2026?',
    'Como funciona o período de transição da Reforma?',
    'O que muda para empresas do Simples Nacional?',
    'Como recuperar créditos de PIS/COFINS antes da CBS?',
    'O que é o Imposto Seletivo e quem paga?',
    'Qual o cronograma de extinção do ICMS?',
    'Como fica o aproveitamento de créditos no Lucro Real?',
  ]

  async function buscar(pergunta) {
    const texto = pergunta || query
    if (!texto.trim()) return
    setCarregando(true)
    setResposta('')
    try {
      const { data, error } = await supabase.functions.invoke('consulta-ia', {
        body: {
          mensagem: `Você é um especialista em direito tributário brasileiro com foco na Reforma Tributária (EC 132/2023, LC 214/2025 e legislação complementar). Responda de forma clara, objetiva e com referências às leis quando possível. Pergunta: ${texto}`,
        },
      })
      if (error) throw error
      setResposta(data?.resposta || data?.content || 'Sem resposta.')
      setHistorico(prev => [{ pergunta: texto, resposta: data?.resposta || data?.content || '' }, ...prev].slice(0, 5))
    } catch (e) {
      setResposta('Erro ao consultar IA: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div>
      <BtnVoltar onClick={onVoltar} />
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ background: 'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius: 16, padding: '32px 36px', color: '#fff', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — INTELIGÊNCIA TRIBUTÁRIA</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>⚠️ Reforma Tributária</h1>
          <p style={{ fontSize: 15, color: '#93c5fd', margin: 0 }}>Consulte leis, decretos e impactos da Reforma — CBS, IBS, IS e período de transição (2026–2032).</p>
        </div>

        {/* Busca IA */}
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', marginBottom: 16 }}>🤖 Pergunte sobre a Reforma Tributária</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ex: Como funciona a CBS? Qual o impacto no Simples Nacional?"
              style={{ flex: 1, padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none' }}
            />
            <button onClick={() => buscar()} disabled={carregando}
              style={{ padding: '12px 24px', background: '#0B1F4D', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: carregando ? 'default' : 'pointer', opacity: carregando ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {carregando ? '⏳ Consultando...' : '🔍 Buscar'}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUGESTOES.map((s, i) => (
              <button key={i} onClick={() => { setQuery(s); buscar(s) }}
                style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, fontSize: 12, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                {s}
              </button>
            ))}
          </div>

          {carregando && (
            <div style={{ marginTop: 20, background: '#f8fafc', borderRadius: 10, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 20 }}>⏳</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Consultando base de conhecimento tributário...</div>
            </div>
          )}

          {resposta && !carregando && (
            <div style={{ marginTop: 20, background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>✅ Resposta da IA Tributária</div>
              <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{resposta}</div>
            </div>
          )}
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '20px 28px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', marginBottom: 14 }}>🕓 Consultas anteriores</div>
            {historico.map((h, i) => (
              <div key={i} style={{ borderBottom: i < historico.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0B1F4D', marginBottom: 4 }}>❓ {h.pergunta}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{h.resposta}</div>
                <button onClick={() => { setQuery(h.pergunta); setResposta(h.resposta) }}
                  style={{ marginTop: 6, fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                  Ver resposta completa →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cards informativos */}
        {[
          { titulo: '📌 O que muda com a Reforma', cor: '#2563eb', itens: [
            'PIS e COFINS substituídos pela CBS (Contribuição sobre Bens e Serviços) — EC 132/2023.',
            'ICMS e ISS substituídos pelo IBS (Imposto sobre Bens e Serviços) — LC 214/2025.',
            'Criação do Imposto Seletivo (IS) sobre bens prejudiciais à saúde e ao meio ambiente.',
            'Período de transição entre 2026 e 2032 com coexistência dos sistemas.',
          ]},
          { titulo: '⏳ Impacto nos créditos em recuperação', cor: '#d97706', itens: [
            'Créditos de PIS/COFINS anteriores à reforma continuam recuperáveis via PER/DCOMP.',
            'Prazo prescricional de 5 anos se aplica normalmente aos créditos anteriores à CBS.',
            'Créditos de ICMS-ST continuam recuperáveis até a extinção do imposto em 2033.',
            'Empresas devem protocolar créditos ANTES da migração completa para evitar perda.',
          ]},
          { titulo: '📅 Cronograma da Transição', cor: '#7c3aed', itens: [
            '2026–2027: Alíquotas-teste CBS (0,9%) e IBS (0,1%) — coexistência com PIS/COFINS/ICMS/ISS.',
            '2029–2032: Redução gradual do ICMS e ISS com aumento proporcional do IBS.',
            '2033: Extinção completa de PIS, COFINS, ICMS e ISS — vigência plena de CBS e IBS.',
            'IPI mantido apenas para produtos sem similar nacional — proteção Zona Franca de Manaus.',
          ]},
          { titulo: '✅ O que fazer agora', cor: '#16a34a', itens: [
            'Levantar e protocolar créditos de PIS/COFINS e ICMS-ST o quanto antes.',
            'Revisar competências dos últimos 5 anos antes da vigência plena da CBS.',
            'Mapear impactos da não-cumulatividade do IBS para clientes do Lucro Real.',
            'Acompanhar regulamentação complementar — muitos detalhes ainda serão definidos.',
          ]},
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, border: `2px solid ${s.cor}22`, borderLeft: `5px solid ${s.cor}`, padding: '20px 24px', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.cor, marginBottom: 12 }}>{s.titulo}</div>
            {s.itens.map((item, j) => (
              <div key={j} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                <span style={{ color: s.cor, flexShrink: 0, fontWeight: 700 }}>→</span><span>{item}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', fontSize: 12, color: '#92400e', marginBottom: 24 }}>
          ⚠️ As informações acima são de caráter informativo e estão sujeitas a alterações conforme regulamentação complementar. Consulte sempre um especialista tributário.
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ nomeUsuario, onLogout, onAdmin }) {
  const [user,        setUser]        = useState(null)
  const [page,        setPage]        = useState('painel')
  const [clientes,    setClientes]    = useState([])
  const [entradas,    setEntradas]    = useState({})
  const [checklist,   setChecklist]   = useState({})
  const [activeId,    setActiveId]    = useState(null)
  const [calcTab,     setCalcTab]     = useState('fator-r')
  const [calcResult,  setCalcResult]  = useState('')
  const [novoCliente, setNovoCliente] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [salvando,    setSalvando]    = useState(false)
  const [abaImportacao, setAbaImportacao] = useState('nfe')

  const [cFolha,setCFolha]=useState(''); const [cRb,setCRb]=useState('')
  const [cRbt12,setCRbt12]=useState(''); const [cRmes,setCRmes]=useState('')
  const [cFat,setCFat]=useState(''); const [cMarg,setCMarg]=useState(''); const [cAtv,setCAtv]=useState('comercio')
  const [cRbt,setCRbt]=useState(''); const [cAtv2,setCAtv2]=useState('8'); const [cDtpag,setCDtpag]=useState('')

  useEffect(()=>{ carregarClientes() },[])

  useEffect(()=>{
    registrarPresenca()
    const interval = setInterval(registrarPresenca, 60000)
    return ()=>clearInterval(interval)
  },[page, nomeUsuario])

  async function registrarPresenca() {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('sessoes_ativas').upsert({
        usuario_id: user.id, email: user.email, nome: nomeUsuario || user.email,
        ultima_atividade: new Date().toISOString(), pagina_atual: PAGE_LABELS[page] || page,
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
      if(data.length>0) setActiveId(data[0].id.toString())
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
    await supabase.from('clientes').delete().eq('id', c.id)
    setClientes(prev => prev.filter(x => x.id !== c.id))
    const novaEntradas = { ...entradas }
    delete novaEntradas[c.id]
    setEntradas(novaEntradas)
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
    setSalvando(false); setPage('clientes')
  }

  function toggleCheck(idx) {
    const arr=checklist[activeId]||(REGIME_DOCS[active?.regime]||[]).map(()=>false)
    const novo=[...arr]; novo[idx]=!novo[idx]
    setChecklist({...checklist,[activeId]:novo})
  }

  function handleNavigate(key) {
    if(key==='novo-cliente'){ setNovoCliente({...CLIENTE_VAZIO}); setPage('novo-cliente') }
    else setPage(key)
  }

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

  const badge     = regime=>{ const colors={'Simples Nacional':'#dbeafe|#1e40af','Lucro Presumido':'#fef3c7|#92400e','Lucro Real':'#dcfce7|#166534'}; const[bg,color]=(colors[regime]||'#f1f5f9|#475569').split('|'); return <span style={{background:bg,color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>• {regime}</span> }
  const riskBadge = r=>{ const c=r==='baixo'?'#dcfce7|#166534':r==='medio'?'#fef9c3|#854d0e':'#fee2e2|#991b1b'; const[bg,color]=c.split('|'); return <span style={{background:bg,color,padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>{r}</span> }
  const applyMask = (k,v)=>{ if(k==='cnpj') return maskCNPJ(v); if(k==='cnae_principal') return maskCNAE(v); if(k==='cnaes_secundarios') return maskCNAES(v); if(k==='inscricao_estadual') return maskIE(v); if(k==='inscricao_municipal') return maskIM(v); return v }
  const inp       = (val,set,ph,tp='text')=><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={tp} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}} />
  const sel       = (val,set,opts)=><select value={val} onChange={e=>set(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%'}}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>

  function calcFatorR(){const f=parseFloat(cFolha)||0;const r=parseFloat(cRb)||1;const fr=f/r;setCalcResult(`Fator R: ${(fr*100).toFixed(2)}% — Anexo ${fr>=0.28?'III (menor carga)':'V (maior carga)'}\n${fr>=0.28?'✅ Enquadrado no Anexo III.':'⚠️ Anexo V — considere aumentar folha.'}`)}
  function calcDAS(){const rbt=parseFloat(cRbt12)||0;const rm=parseFloat(cRmes)||0;let aliq=4,ded=0;if(rbt>180000){aliq=7.3;ded=5940}if(rbt>360000){aliq=9.5;ded=13860}if(rbt>720000){aliq=10.7;ded=22500}if(rbt>1800000){aliq=14.3;ded=87300}if(rbt>3600000){aliq=19;ded=378000}const ef=Math.max(0,((rbt*(aliq/100))-ded)/rbt*100);setCalcResult(`DAS estimado: ${fmtR(rm*(ef/100))}\nAlíquota efetiva: ${ef.toFixed(2)}%`)}
  function calcRegime(){const f=parseFloat(cFat)||0;const m=parseFloat(cMarg)||0;const l=f*(m/100);const sn=f*0.12;const lp=(f*0.0365)+(f*(cAtv==='servicos'?0.32:0.08)*0.15)+(f*(cAtv==='servicos'?0.32:0.12)*0.09);const lr=(l*0.34)+(f*0.0365);setCalcResult(`Simples Nacional: ${fmtR(sn)} (${(sn/f*100).toFixed(1)}%)\nLucro Presumido: ${fmtR(lp)} (${(lp/f*100).toFixed(1)}%)\nLucro Real: ${fmtR(lr)} (${(lr/f*100).toFixed(1)}%)`)}
  function calcIRPJ(){const rb=parseFloat(cRbt)||0;const p=parseFloat(cAtv2)||8;const bi=rb*(p/100);const bc=rb*(p===32?32:p===16?16:12)/100;const irpj=bi*0.15+Math.max(0,(bi-60000)*0.10);const csll=bc*0.09;setCalcResult(`IRPJ: ${fmtR(irpj)}\nCSLL: ${fmtR(csll)}\nTotal: ${fmtR(irpj+csll)}`)}
  function calcPrescricao(){if(!cDtpag){setCalcResult('Informe a data.');return}const p=new Date(cDtpag);const l=new Date(p);l.setFullYear(l.getFullYear()+5);const dias=Math.round((l-hoje)/(1000*60*60*24));if(dias<0){setCalcResult(`⚠️ PRAZO PRESCRITO em ${l.toLocaleDateString('pt-BR')}!`)}else{setCalcResult(`Prazo limite: ${l.toLocaleDateString('pt-BR')}\nDias restantes: ${dias}\n${dias<=365?'⚠️ CRÍTICO — menos de 1 ano!':'✅ Prazo confortável.'}`)}}

  const btnPrimary={padding:'10px 20px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}
  const btnOutline={padding:'10px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}
  const btnDanger ={padding:'4px 12px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:500}

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,system-ui,sans-serif',fontSize:16,color:C.navy}}>Carregando...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',width:'100vw',overflow:'hidden',fontFamily:'Inter,system-ui,sans-serif'}}>

      <div style={{background:C.navy,display:'flex',alignItems:'center',padding:'0 20px',height:52,flexShrink:0,gap:12}}>
        <img src="/Logo3.png" alt="e-FiscalTrib" style={{height:34,objectFit:'contain',flexShrink:0}} />
        <span style={{fontSize:13,color:'rgba(255,255,255,0.7)',flex:1}}>Sistema de diagnóstico e recuperação tributária — FiscalTrib</span>
        {active && (
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.1)',padding:'4px 12px',borderRadius:20}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#F0B429',flexShrink:0}}></div>
            <span style={{fontSize:12,color:C.white,fontWeight:500}}>{active.razao_social}</span>
          </div>
        )}
        <span style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>👤 {nomeUsuario||'Usuário'}</span>
        {onAdmin && <button onClick={onAdmin} style={{background:'#F59E0B',border:'none',color:C.white,padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600}}>⚙️ Admin</button>}
        <button onClick={()=>onLogout()} style={{background:'none',border:'1px solid rgba(255,255,255,0.3)',color:'rgba(255,255,255,0.7)',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12}}>Sair</button>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <Sidebar page={page} onNavigate={handleNavigate} clientes={clientes} activeId={activeId} onChangeCliente={setActiveId} />

        <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'24px 28px',background:C.bg,minWidth:0}}>

          {page==='painel' && <>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:22,fontWeight:700,color:C.text}}>Painel Geral</div>
              <div style={{fontSize:13,color:C.muted,marginTop:2}}>Visão consolidada dos casos em andamento.</div>
            </div>
            <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'10px 16px',marginBottom:20,fontSize:12,color:'#92400E'}}>
              ⚠️ <strong>Aviso profissional obrigatório:</strong> Esta análise é preliminar e não dispensa revisão por contador, advogado tributarista ou consultor fiscal habilitado. Nenhuma declaração deve ser retificada e nenhum PER/DCOMP deve ser transmitido sem validação humana prévia. Créditos tributários exigem lastro documental completo.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
              <KpiCard icon="👥" value={clientes.length}  label="Clientes cadastrados"           color="#2563EB" />
              <KpiCard icon="🎯" value={totalOpp}         label="Oportunidades mapeadas"         color="#7C3AED" />
              <KpiCard icon="💰" value={fmtR(totalGeral)} label="Valor potencial recuperável"    color="#16A34A" />
              <KpiCard icon="⏱️" value={criticos}         label="Competências críticas (≤1 ano)" color="#DC2626" />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>🏛️ Central Tributária</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[['🏢','CNAE'],['📋','CFOP'],['🔢','CST'],['📄','CSOSN'],['⚖️','Teses']].map(([ic,lb])=>(
                      <button key={lb} onClick={()=>setPage('central')}
                        style={{background:'#F1F5F9',border:`1px solid ${C.border}`,color:C.text,padding:'3px 8px',borderRadius:6,fontSize:11,cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#E2E8F0'}
                        onMouseLeave={e=>e.currentTarget.style.background='#F1F5F9'}>
                        {ic} {lb}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={()=>setPage('central')} style={{background:C.navy,border:'none',color:C.white,padding:'6px 14px',borderRadius:8,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',fontWeight:500}}>Abrir →</button>
              </div>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>⚠️ Reforma Tributária</div>
                  <div style={{fontSize:12,color:C.muted}}>Impacto nas recuperações tributárias — CBS, IBS e período de transição.</div>
                </div>
                <button onClick={()=>setPage('reforma')} style={{background:C.navy,border:'none',color:C.white,padding:'6px 14px',borderRadius:8,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',fontWeight:500}}>Ver →</button>
              </div>
            </div>
            {clientes.length===0 ? (
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:48,textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>👥</div>
                <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:8}}>Nenhum cliente ainda</div>
                <button onClick={()=>handleNavigate('novo-cliente')} style={btnPrimary}>+ Cadastrar primeiro cliente</button>
              </div>
            ) : (
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
                <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:15,fontWeight:600,color:C.text}}>Clientes — visão rápida</span>
                  <button onClick={()=>setPage('clientes')} style={{...btnOutline,padding:'5px 14px',fontSize:12}}>Ver todos os clientes</button>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:'#F8FAFC'}}>{['Razão Social','CNPJ','Regime','Oportunidades','Potencial','Status',''].map(h=><th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>)}</tr></thead>
                  <tbody>{clientes.map(c=>{const ee=entradas[c.id]||[];const tot=ee.reduce((s,e)=>s+(e.credito||0),0);return(
                    <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'12px 16px',fontWeight:600,color:C.text}}>{c.razao_social}</td>
                      <td style={{padding:'12px 16px',color:C.muted,fontSize:12}}>{c.cnpj}</td>
                      <td style={{padding:'12px 16px'}}>{badge(c.regime)}</td>
                      <td style={{padding:'12px 16px',color:C.text}}>{ee.filter(e=>e.credito>0).length}</td>
                      <td style={{padding:'12px 16px',color:'#16A34A',fontWeight:600}}>{fmtR(tot)}</td>
                      <td style={{padding:'12px 16px'}}><span style={{background:'#DCFCE7',color:'#166534',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>• Oportunidade encontrada</span></td>
                      <td style={{padding:'12px 16px'}}><button onClick={()=>{setActiveId(c.id.toString());setPage('diagnostico')}} style={{...btnOutline,padding:'4px 12px',fontSize:12}}>Ver diagnóstico</button></td>
                    </tr>
                  )})}</tbody>
                </table>
              </div>
            )}
          </>}

          {page==='clientes' && <>
            <BtnVoltar onClick={()=>setPage('painel')} />
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:700,color:C.text}}>Clientes cadastrados</div>
              <button onClick={()=>handleNavigate('novo-cliente')} style={{...btnPrimary,padding:'7px 16px',fontSize:13}}>+ Novo cliente</button>
            </div>
            {clientes.length===0 && <div style={{textAlign:'center',padding:40,color:C.muted}}>Nenhum cliente cadastrado ainda.</div>}
            {clientes.map(c=>{const ee=entradas[c.id]||[];const tot=ee.reduce((s,e)=>s+(e.credito||0),0);return(
              <div key={c.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 20px',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:4}}>{c.razao_social}</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{c.cnpj} · {c.municipio}/{c.uf} · CNAE {c.cnae_principal}</div>
                    <div style={{display:'flex',gap:8}}>{badge(c.regime)}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:20,fontWeight:700,color:'#16A34A'}}>{fmtR(tot)}</div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:10}}>potencial recuperável</div>
                    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                      <button onClick={()=>{setNovoCliente({...c});setPage('novo-cliente')}} style={{...btnOutline,padding:'4px 12px',fontSize:12}}>Editar</button>
                      <button onClick={()=>{setActiveId(c.id.toString());setPage('diagnostico')}} style={{...btnPrimary,padding:'4px 12px',fontSize:12}}>Diagnóstico</button>
                      <button onClick={()=>excluirCliente(c)} style={btnDanger}>🗑️ Excluir</button>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </>}

          {page==='novo-cliente' && novoCliente && <>
            <BtnVoltar onClick={()=>setPage('clientes')} />
            <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:24}}>{novoCliente.id?'Editar cliente':'Novo cliente'}</div>
            {!novoCliente.id && (
              <div style={{background:'#eff6ff',border:'2px dashed #bfdbfe',borderRadius:12,padding:'20px 24px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#1e40af',marginBottom:4}}>⚡ Preencher via XML de NF-e</div>
                  <div style={{fontSize:13,color:'#64748b'}}>Importe um XML do cliente para preencher os dados automaticamente</div>
                </div>
                <label style={{padding:'10px 20px',background:'#1e40af',color:'#fff',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                  📂 Importar XML
                  <input type="file" accept=".xml" style={{display:'none'}} onChange={async e=>{const file=e.target.files[0];if(!file)return;await preencherViaXML(file);e.target.value=''}} />
                </label>
              </div>
            )}
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:16}}>📋 Identificação</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {[['Razão Social *','razao_social'],['Nome Fantasia','nome_fantasia'],['CNPJ *','cnpj'],['CNAE Principal','cnae_principal'],['CNAEs Secundários','cnaes_secundarios'],['Inscrição Estadual','inscricao_estadual'],['Inscrição Municipal','inscricao_municipal'],['Município','municipio'],['UF','uf']].map(([lb,k])=>(
                  <div key={k} style={{display:'flex',flexDirection:'column',gap:6}}>
                    <label style={{fontSize:13,fontWeight:500,color:C.text}}>{lb}</label>
                    <input value={novoCliente[k]||''} onChange={e=>setNovoCliente({...novoCliente,[k]:applyMask(k,e.target.value)})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}} />
                  </div>
                ))}
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontSize:13,fontWeight:500,color:C.text}}>Regime tributário *</label>
                  <select value={novoCliente.regime||'Simples Nacional'} onChange={e=>setNovoCliente({...novoCliente,regime:e.target.value})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
                    <option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:16}}>📅 Período de análise</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {[['Competência inicial','competencia_inicio','month'],['Competência final','competencia_fim','month'],['Responsável contábil','responsavel_contabil','text'],['Observações','observacoes','text']].map(([lb,k,tp])=>(
                  <div key={k} style={{display:'flex',flexDirection:'column',gap:6}}>
                    <label style={{fontSize:13,fontWeight:500,color:C.text}}>{lb}</label>
                    <input type={tp} value={novoCliente[k]||''} onChange={e=>setNovoCliente({...novoCliente,[k]:e.target.value})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:12}}>
              <button onClick={salvarCliente} disabled={salvando} style={btnPrimary}>{salvando?'💾 Salvando...':'💾 Salvar cliente'}</button>
              <button onClick={()=>setPage('clientes')} style={btnOutline}>Cancelar</button>
            </div>
          </>}

          {page==='checklist' && <>
            <BtnVoltar onClick={()=>setPage('clientes')} />
            <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Checklist documental</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{active?.razao_social} · {active?.regime}</div>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:16}}>
              <div style={{background:C.border,borderRadius:99,height:8,overflow:'hidden',marginBottom:6}}><div style={{background:C.green,height:8,borderRadius:99,width:pct+'%',transition:'width .3s'}}></div></div>
              <div style={{fontSize:12,color:C.muted}}>{done} de {docs.length} documentos — {pct}%</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
              {docs.map((d,i)=>(
                <div key={i} onClick={()=>toggleCheck(i)} style={{display:'flex',alignItems:'center',gap:10,background:checks[i]?'#F0FDF4':C.white,border:`1px solid ${checks[i]?'#86EFAC':C.border}`,borderRadius:8,padding:'10px 14px',cursor:'pointer',fontSize:13,color:checks[i]?'#166534':C.text}}>
                  <input type="checkbox" checked={checks[i]} onChange={()=>toggleCheck(i)} style={{accentColor:C.green,width:16,height:16}} />{d}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setPage('entrada')} style={btnPrimary}>Avançar para entrada de dados</button>
              <button onClick={()=>setPage('diagnostico')} style={btnOutline}>Ir para diagnóstico</button>
            </div>
          </>}

          {page==='entrada'        && <EntradaDados clienteId={activeId} cliente={active} onSalvo={()=>carregarClientes()} setPage={setPage} />}
          {page==='score'          && <><BtnVoltar onClick={()=>setPage('diagnostico')} /><ScoreFiscal /></>}
          {page==='analise'        && <><BtnVoltar onClick={()=>setPage('diagnostico')} /><AnaliseFiscal /></>}
          {page==='teses'          && <><BtnVoltar onClick={()=>setPage('painel')} /><TesesTributarias /></>}
          {page==='monitor'        && <><BtnVoltar onClick={()=>setPage('painel')} /><MonitorObrigacoes /></>}
          {page==='importacoes'    && <><BtnVoltar onClick={()=>setPage('painel')} /><CentralImportacoes abaInicial={abaImportacao} onDiagnostico={()=>setPage('diagnostico')} onRelatorio={()=>setPage('relatorio')} onRecuperacao={()=>setPage('recuperacoes')} /></>}
          {page==='recuperacoes'   && <><BtnVoltar onClick={()=>setPage('painel')} /><GestaoRecuperacoes /></>}
          {page==='perdcomp'       && <><BtnVoltar onClick={()=>setPage('recuperacoes')} /><PerdComp /></>}
          {page==='prazos'         && <><BtnVoltar onClick={()=>setPage('painel')} /><PrazosPrescricionais active={active} /></>}
          {page==='acompanhamento' && <><BtnVoltar onClick={()=>setPage('painel')} /><Acompanhamento /></>}
          {page==='prazosfiscais'  && <><BtnVoltar onClick={()=>setPage('painel')} /><PrazosFiscais /></>}
          {page==='simuladores'    && <><BtnVoltar onClick={()=>setPage('painel')} /><Simuladores /></>}
          {page==='relatorio'      && <><BtnVoltar onClick={()=>setPage('diagnostico')} /><Relatorio active={active} ents={ents} /></>}
          {page==='planos'         && <Planos user={user} assinatura={null} onVoltar={()=>setPage('painel')} />}
          {page==='central'        && <CentralTributaria onVoltar={()=>setPage('painel')} />}
          {page==='reforma'        && <PaginaReforma onVoltar={()=>setPage('painel')} />}

          {page==='diagnostico' && <>
            <BtnVoltar onClick={()=>setPage('clientes')} />
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <div style={{fontSize:22,fontWeight:700,color:C.text}}>Diagnóstico tributário</div>
                <div style={{fontSize:13,color:C.muted,marginTop:2}}>{active?.razao_social} · {active?.cnpj} · {active?.regime}</div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setPage('score')}     style={{...btnOutline,borderColor:'#7C3AED',color:'#7C3AED',padding:'6px 14px',fontSize:13}}>🎯 Score Fiscal</button>
                <button onClick={()=>setPage('relatorio')} style={{...btnOutline,padding:'6px 14px',fontSize:13}}>📄 Relatório</button>
                <button onClick={()=>setPage('entrada')}   style={{...btnOutline,padding:'6px 14px',fontSize:13}}>+ Dados</button>
              </div>
            </div>
            <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:12,color:'#92400E'}}>
              ⚠️ <strong>Aviso:</strong> Análise preliminar — não dispensa revisão profissional.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
              {[[fmtR(totalPot),'Total potencial recuperável','#16A34A'],[ents.filter(e=>e.risco==='baixo'&&e.credito>0).length,'Créditos confirmados','#0D9488'],[ents.filter(e=>e.risco==='medio'&&e.credito>0).length,'Possíveis créditos','#D97706'],[ents.filter(e=>e.risco==='alto'&&e.credito>0).length,'Hipóteses a validar','#DC2626']].map(([v,lb,vc],i)=>(
                <div key={i} style={{background:C.white,borderRadius:12,padding:20,borderTop:`4px solid ${vc}`}}>
                  <div style={{fontSize:i===0?18:24,fontWeight:700,color:vc,marginBottom:4}}>{v}</div>
                  <div style={{fontSize:12,color:C.muted}}>{lb}</div>
                </div>
              ))}
            </div>
            {ents.filter(e=>e.credito>0).length>0 && <>
              <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:12}}>Oportunidades mapeadas</div>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:'#F8FAFC'}}>{['Competência','Tributo','Tipo de oportunidade','Pago','Devido','Crédito','Risco'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.4}}>{h}</th>)}</tr></thead>
                  <tbody>{ents.filter(e=>e.credito>0).map((e,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 12px'}}>{e.competencia}</td>
                      <td style={{padding:'10px 12px'}}>{e.tributo}</td>
                      <td style={{padding:'10px 12px',fontSize:12,color:C.muted}}>{e.tipo_oportunidade}</td>
                      <td style={{padding:'10px 12px'}}>{fmtR(e.tributo_pago)}</td>
                      <td style={{padding:'10px 12px'}}>{fmtR(e.tributo_devido)}</td>
                      <td style={{padding:'10px 12px',fontWeight:600,color:'#16A34A'}}>{fmtR(e.credito)}</td>
                      <td style={{padding:'10px 12px'}}>{riskBadge(e.risco)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}
          </>}

          {page==='calculadoras' && <>
            <BtnVoltar onClick={()=>setPage('painel')} />
            <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:4}}>Calculadoras tributárias</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Estimativas para diagnóstico — valide sempre com profissional habilitado</div>
            <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
              {[['fator-r','🔺 Fator R'],['das','📋 DAS Simples'],['regime','⚖️ Regime'],['irpj','💰 IRPJ/CSLL'],['prescricao','⏰ Prescrição']].map(([id,lb])=>(
                <div key={id} onClick={()=>{setCalcTab(id);setCalcResult('')}} style={{padding:'8px 18px',fontSize:13,fontWeight:calcTab===id?600:500,color:calcTab===id?C.navy:C.muted,cursor:'pointer',borderBottom:`2px solid ${calcTab===id?C.navy:'transparent'}`,marginBottom:-2}}>{lb}</div>
              ))}
            </div>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:28,maxWidth:580}}>
              {calcTab==='fator-r'    && <><div style={{fontSize:15,fontWeight:600,color:C.navy,marginBottom:16}}>🔺 Fator R</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Folha 12 meses (R$)</label>{inp(cFolha,setCFolha,'Ex: 120000','number')}</div><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Receita bruta 12 meses (R$)</label>{inp(cRb,setCRb,'Ex: 480000','number')}</div></div><button onClick={calcFatorR} style={btnPrimary}>Calcular →</button></>}
              {calcTab==='das'        && <><div style={{fontSize:15,fontWeight:600,color:C.navy,marginBottom:16}}>📋 DAS Simples Nacional</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>RBT12 (R$)</label>{inp(cRbt12,setCRbt12,'Ex: 720000','number')}</div><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Receita do mês (R$)</label>{inp(cRmes,setCRmes,'Ex: 60000','number')}</div></div><button onClick={calcDAS} style={btnPrimary}>Calcular →</button></>}
              {calcTab==='regime'     && <><div style={{fontSize:15,fontWeight:600,color:C.navy,marginBottom:16}}>⚖️ Simulador de regime</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Faturamento anual (R$)</label>{inp(cFat,setCFat,'Ex: 1200000','number')}</div><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Margem líquida (%)</label>{inp(cMarg,setCMarg,'Ex: 15','number')}</div><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Atividade</label>{sel(cAtv,setCAtv,[['comercio','Comércio'],['industria','Indústria'],['servicos','Serviços']])}</div></div><button onClick={calcRegime} style={btnPrimary}>Simular →</button></>}
              {calcTab==='irpj'       && <><div style={{fontSize:15,fontWeight:600,color:C.navy,marginBottom:16}}>💰 IRPJ/CSLL — Lucro Presumido</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Receita bruta trimestral (R$)</label>{inp(cRbt,setCRbt,'Ex: 300000','number')}</div><div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Atividade</label>{sel(cAtv2,setCAtv2,[['8','Comércio/Indústria (8%)'],['16','Transporte (16%)'],['32','Serviços (32%)']])}</div></div><button onClick={calcIRPJ} style={btnPrimary}>Calcular →</button></>}
              {calcTab==='prescricao' && <><div style={{fontSize:15,fontWeight:600,color:C.navy,marginBottom:16}}>⏰ Prescrição</div><div style={{marginBottom:16}}><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Data de pagamento indevido</label><input type="date" value={cDtpag} onChange={e=>setCDtpag(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}} /></div><button onClick={calcPrescricao} style={btnPrimary}>Calcular →</button></>}
              {calcResult && <div style={{marginTop:20,background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8,padding:'14px 18px',fontSize:13,color:'#166534',whiteSpace:'pre-line'}}>{calcResult}</div>}
            </div>
          </>}

        </div>
      </div>
    </div>
  )
}