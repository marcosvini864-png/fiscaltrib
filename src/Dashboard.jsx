import Simuladores from './Simuladores'
import PrazosFiscais from './PrazosFiscais'
import { useState, useEffect, useRef } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { supabase } from './supabase'
import Relatorio from './Relatorio'
import ScoreFiscal from './ScoreFiscal'
import TesesTributarias from './TesesTributarias'
import GestaoRecuperacoes from './GestaoRecuperacoes'
import AnaliseFiscal from './AnaliseFiscal'
import PerdComp from './PerdComp'
import PrazosPrescricionais from './PrazosPrescricionais'
import CentralTributaria from './CentralTributaria'
import Admin from './Admin'
import Laboratorio from './Laboratorio'
import DiagnosticoDividaAtiva from './DiagnosticoDividaAtiva'
import ImportarCDA from './ImportarCDA'
import Prospeccao from './Prospeccao'
import MensagensRapidas from './MensagensRapidas'
import DiagnosticoTributario from './pages/DiagnosticoTributario'
import GestaoEmpresas from './pages/GestaoEmpresas'
import GrupoEmpresas from './pages/GrupoEmpresas'
import ClassificacaoItens from './pages/ClassificacaoItens'
import AuditorSPED from './pages/AuditorSPED'
import DadosComplementares from './pages/DadosComplementares'
import PainelSimples from './pages/PainelSimples'
import AbaMonofasicos from './pages/abas/AbaMonofasicos'
import AbaPGDAS from './pages/abas/AbaPGDAS'
import ApuracaoSimples from './pages/ApuracaoSimples'
import EspelhoRetificacaoPGDAS from './pages/EspelhoRetificacaoPGDAS'
import AbaRecuperacaoMonofasicos from './pages/AbaRecuperacaoMonofasicos'
import AbaICMSST from './pages/abas/AbaICMSST'
import ExclusaoICMS from './pages/ExclusaoICMS'
import PainelRecuperacao from './pages/PainelRecuperacao'
import ProntuarioEmpresa from './pages/ProntuarioEmpresa'
import CentralConsultas from './pages/CentralConsultas'
import ManualOperacao from './pages/ManualOperacao'
import ManualFlutuante from './pages/ManualFlutuante'

const REGIME_DOCS = {
  'Simples Nacional': ['Extratos do PGDAS-D','Recibos de transmissao PGDAS-D','DEFIS','DAS pagos','Relacao de receitas segregadas por anexo','Receitas com substituicao tributaria','Receitas monofasicas','Receitas com retencao','Receitas de exportacao','Notas fiscais de entrada','Notas fiscais de saida','XMLs de NF-e/NFS-e/NFC-e','Relatorio de faturamento mensal','Extrato do Simples Nacional','Consulta de debitos','Comprovantes de pagamento'],
  'Lucro Presumido': ['DCTF','ECF','ECD','SPED Fiscal','SPED Contribuicoes','Livro Caixa','NFs de entrada e saida','Comprovantes IRPJ','Comprovantes CSLL','Comprovantes PIS/COFINS','DARF originais','Relatorio de faturamento','Contratos de prestacao de servicos','Balancetes mensais','Consulta de debitos','Certidoes negativas'],
  'Lucro Real': ['ECF','ECD','SPED Fiscal','SPED Contribuicoes','LALUR','LACS','DCTF','NFs de entrada e saida','Controles de creditos PIS/COFINS','Relatorio de estoques','Ativos imobilizados','Contratos relevantes','Comprovantes de pagamentos','Balancetes mensais','Consulta de debitos','Certidoes negativas'],
}

const CLIENTE_VAZIO = {razao_social:'',cnpj:'',cnae_principal:'',cnaes_secundarios:'',inscricao_estadual:'',inscricao_municipal:'',municipio:'',uf:'',regime:'Simples Nacional',competencia_inicio:'',competencia_fim:'',responsavel_contabil:'',observacoes:''}

const maskCNPJ  = v => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2')
const maskIE    = v => v.replace(/[^0-9A-Za-z.\-\/]/g,'').slice(0,20)
const maskIM    = v => v.replace(/[^0-9.\-\/]/g,'').slice(0,15)
const maskCNAE  = v => { const n=v.replace(/\D/g,'').slice(0,7); if(n.length<=2) return n; if(n.length<=4) return n.slice(0,2)+'.'+n.slice(2); if(n.length<=6) return n.slice(0,2)+'.'+n.slice(2,4)+'-'+n.slice(4); return n.slice(0,2)+'.'+n.slice(2,4)+'-'+n.slice(4,5)+'-'+n.slice(5) }
const maskCNAES = v => { const parts=v.split(','); return parts.map((c,i)=>i<parts.length-1?maskCNAE(c.trim()):c.replace(/\D/g,'').slice(0,7)).join(', ') }
const fmtR      = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

const C = {
  bg: '#F8FAFC', white: '#FFFFFF', border: '#E2E8F0', text: '#0F172A',
  muted: '#64748B', blue: '#2563EB', green: '#16A34A', red: '#DC2626',
  navy: '#2563EB', sidebarBg: '#0F172A', sidebarText: '#94A3B8', sidebarActiveText: '#FFFFFF',
}

const MODULES = {
  painel:               { label:'Painel',                   tabs:[] },
  manual_operacao:      { label:'Manual de Operação',       tabs:[] },
  clientes:             { label:'Clientes',                 tabs:['Clientes','Novo cliente','Checklist de Documentos'] },
  gestao_empresas:      { label:'Gestao de Empresas',       tabs:[] },
  grupo_empresas:       { label:'Grupo de Empresas',        tabs:[] },
  scanner:              { label:'Scanner Tributário',       tabs:[] },
  diagnostico:              { label:'Diagnóstico Tributário',   tabs:['Importar','Monofásicos','ICMS Tema 69','ICMS-ST','Retenções','PGDAS-D'] },
  exclusao_icms:        { label:'Tema 69 — Exclusão ICMS',  tabs:[] },
  recuperacao_monofasico:{ label:'Monofásicos PIS/COFINS',  tabs:[] },
  icms_st_rec:          { label:'ICMS-ST Pago a Maior',     tabs:[] },
  divida:               { label:'Dívida Ativa',             tabs:[] },
  monofasicos:          { label:'Monofásicos',              tabs:[] },
  pgdas:                { label:'PGDAS-D',                  tabs:[] },
  painel_simples:       { label:'Painel de Controle',       tabs:[] },
  dados_complementares: { label:'Dados Complementares',     tabs:[] },
  classificacao_itens:  { label:'Classificação de Itens',   tabs:[] },
  apuracao_simples:     { label:'Apuração do Simples',      tabs:[] },
  central_consultas: { label:'Central de Consultas', tabs:[] },
  recuperacao:          { label:'Recuperacao',              tabs:['Gestao','PER/DCOMP'] },
  sped:                 { label:'Auditor de SPED',          tabs:[] },
  analise:              { label:'Analise Fiscal',           tabs:['Diagnostico','Analise IA','Teses Tributarias','Simuladores','Calculadoras'] },
  prazos:               { label:'Prazos',                   tabs:['Prescricionais','Prazos Fiscais'] },
  relatorios:           { label:'Relatorios',               tabs:['Relatorio Matador','Score Fiscal'] },
  inteligencia:         { label:'Inteligencia Tributaria',  tabs:['Central Tributaria','Reforma Tributaria'] },
  prospeccao:           { label:'Prospeccao',               tabs:[] },
  mensagens:            { label:'Mensagens Rapidas',        tabs:[] },
}

const RESTRICTED = {
  admin: { label:'Admin',                     icon:'⚙️' },
  dev:   { label:'Centro de Desenvolvimento', icon:'🔧' },
}

const MENU_SECOES = [
  {
    id: 'clientes_sec',
    titulo: 'CLIENTES',
    itens: [
      { label:'Clientes',           module:'clientes',        tab:0, icon:'👤' },
      { label:'Gestão de Empresas', module:'gestao_empresas', tab:0, icon:'🏢' },
      { label:'Grupo de Empresas',  module:'grupo_empresas',  tab:0, icon:'📁' },
    ],
  },
  {
    id: 'motor_simples',
    titulo: 'MOTOR DO SIMPLES',
    itens: [
      { label:'Importar e Analisar XML Monofásico', module:'monofasicos', tab:0, icon:'📥' },
      { label:'Importar PGDAS-D', module:'pgdas', tab:0, icon:'📄' },
      { label:'Painel de Controle',    module:'painel_simples',       tab:0, icon:'📊' },
      { label:'Dados Complementares',  module:'dados_complementares', tab:0, icon:'📋' },
      { label:'Classificação e Segregação', module:'classificacao_itens', tab:0, icon:'🏷️' },
      { label:'Apuração do Simples',   module:'apuracao_simples',     tab:0, icon:'📅' },
	  { label:'Central de Consultas', module:'central_consultas', tab:0, icon:'🔎' },
    ],
  },
  {
    id: 'diagnostico_tributario',
    titulo: 'DIAGNÓSTICO TRIBUTÁRIO',
    itens: [
      { label:'Scanner Tributário',       module:'scanner',                  tab:0, icon:'🔍' },
      { label:'Tema 69 — Exclusão ICMS',  module:'exclusao_icms',            tab:0, icon:'🧾' },
      { label:'ICMS-ST Pago a Maior',     module:'icms_st_rec',              tab:0, icon:'📄' },
      { label:'Dívida Ativa',             module:'divida',                   tab:0, icon:'⚠️' },
    ],
  },
  {
    id: 'recuperacao_creditos',
    titulo: 'RECUPERAÇÃO DE CRÉDITOS',
    itens: [
	  { label:'Monofásicos PIS/COFINS', module:'recuperacao_monofasico', tab:0, icon:'💰' },
      { label:'PER/DCOMP', module:'recuperacao', tab:1, icon:'🧾' },
    ],
  },
  {
    id: 'auditoria',
    titulo: 'AUDITORIA',
    itens: [
      { label:'Auditor de SPED', module:'sped', tab:0, icon:'🔎' },
    ],
  },
  {
    id: 'planejamento',
    titulo: 'PLANEJAMENTO',
    itens: [
      { label:'Análise Fiscal',          module:'analise',      tab:0, icon:'📈' },
      { label:'Teses Tributárias',       module:'analise',      tab:2, icon:'⚖️' },
      { label:'Simuladores',             module:'analise',      tab:3, icon:'🧮' },
      { label:'Calculadoras',            module:'analise',      tab:4, icon:'🔢' },
      { label:'Prazos Prescricionais',   module:'prazos',       tab:0, icon:'⏳' },
      { label:'Prazos Fiscais',          module:'prazos',       tab:1, icon:'📅' },
      { label:'Inteligência Tributária', module:'inteligencia', tab:0, icon:'🧠' },
      { label:'Reforma Tributária',      module:'inteligencia', tab:1, icon:'🏛️' },
    ],
  },
  {
    id: 'relatorios',
    titulo: 'RELATÓRIOS',
    itens: [
      { label:'Relatório Matador', module:'relatorios', tab:0, icon:'📊' },
      { label:'Score Fiscal',      module:'relatorios', tab:1, icon:'🎯' },
    ],
  },
  {
    id: 'comercial',
    titulo: 'COMERCIAL',
    itens: [
      { label:'CRM Comercial', module:'prospeccao', tab:0, icon:'🤝' },
      { label:'Comunicação',   module:'mensagens',  tab:0, icon:'💬' },
    ],
  },
]

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
          style={{ padding:'10px 14px', fontSize:12, fontWeight: activeTab===i ? 600 : 400, color: activeTab===i ? C.blue : C.muted, background:'none', border:'none', borderBottom: activeTab===i ? `2px solid ${C.blue}` : '2px solid transparent', marginBottom:-2, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s' }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

function Sidebar({ sidebarAtiva, onNavigate, clientes, activeId, onChangeCliente, isAdmin, isMobile, menuAberto, setMenuAberto, moduloPermitido = () => true }) {
  const [expandido, setExpandido] = useState(false)
  const [travada, setTravada] = useState(() => localStorage.getItem('fiscaltrib_sidebar_travada') === '1')
  useEffect(() => { localStorage.setItem('fiscaltrib_sidebar_travada', travada ? '1' : '0') }, [travada])

  function handleMouseEnter() { if (isMobile) return; setExpandido(true) }
  function handleMouseLeave() { if (isMobile || travada) return; setTimeout(() => setExpandido(false), 200) }
  function handleItem(item) { onNavigate(item.module, item.tab); if (isMobile) setMenuAberto(false) }
  function isItemAtivo(item) { return sidebarAtiva === (item.module + ':' + item.tab) }

  if (isMobile && !menuAberto) return null
  const aberta = isMobile ? true : (travada || expandido)
  const largura = isMobile ? 260 : (aberta ? 295 : 68)

  return (
    <>
      {isMobile && (
        <div onClick={() => setMenuAberto(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99 }} />
      )}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width:largura, minHeight:'100%', background:C.sidebarBg,
          borderRight:'1px solid #1E293B', display:'flex', flexDirection:'column',
          flexShrink:0, overflowY:'auto', overflowX:'hidden',
          transition: isMobile ? 'none' : 'width 0.2s ease',
          ...(isMobile ? { position:'fixed', top:0, left:0, height:'100vh', zIndex:100, boxShadow:'4px 0 20px rgba(0,0,0,0.3)' } : {})
        }}>

        {!isMobile && (
  <div
    style={{
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      gap:4,
      paddingTop:30,
      paddingBottom:6
    }}
  >
    <span
      style={{
        color:'rgba(255,255,255,0.62)',
        fontSize:10,
        fontWeight:400,
        whiteSpace:'nowrap'
      }}
    >
      Fechar
    </span>

    <button
      onClick={() => {
        setTravada(false)
        setExpandido(false)
      }}
      title="Recolher menu lateral"
      aria-label="Recolher menu lateral"
      style={{
        width:18,
        height:18,
        padding:0,
        background:'transparent',
        border:'none',
        color:'#FFFFFF',
        cursor:'pointer',
        fontSize:19,
        fontWeight:700,
        lineHeight:1,
        display:'flex',
        alignItems:'center',
        justifyContent:'center'
      }}
    >
      ‹
    </button>

    <div
      style={{
        width:26,
        height:5,
        background:'#22C55E',
        borderRadius:999,
        boxShadow:'0 0 4px rgba(34,197,94,0.65)'
      }}
    />

    <button
      onClick={() => {
        setTravada(true)
        setExpandido(true)
      }}
      title="Abrir e fixar menu lateral"
      aria-label="Abrir e fixar menu lateral"
      style={{
        width:18,
        height:18,
        padding:0,
        background:'transparent',
        border:'none',
        color:'#FFFFFF',
        cursor:'pointer',
        fontSize:19,
        fontWeight:700,
        lineHeight:1,
        display:'flex',
        alignItems:'center',
        justifyContent:'center'
      }}
    >
      ›
    </button>

    <span
      style={{
        color:'rgba(255,255,255,0.62)',
        fontSize:10,
        fontWeight:400,
        whiteSpace:'nowrap'
      }}
    >
      Abrir
    </span>
  </div>
)}

        {isMobile && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid #1E293B' }}>
            <img src="/Logo6.png" alt="e-FiscalTribe" style={{ height:28, borderRadius:6 }} />
            <button onClick={() => setMenuAberto(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#FFFFFF' }}>✕</button>
          </div>
        )}

        {aberta ? (
          <div style={{padding:'12px 14px 10px', borderBottom:'1px solid #1E293B'}}>
            <div style={{fontSize:10,fontWeight:700,color:C.sidebarText,letterSpacing:1,marginBottom:5,whiteSpace:'nowrap'}}>CLIENTE ATIVO</div>
            <select value={activeId?.toString()||''} onChange={e=>{onChangeCliente(e.target.value||null); if(isMobile) setMenuAberto(false)}}
              style={{width:'100%',padding:'6px 8px',border:'1px solid #334155',borderRadius:6,fontSize:12,color:'#FFFFFF',background:'#1E293B',cursor:'pointer'}}>
              <option value=''>-- Nenhum --</option>
              {clientes.map(c=><option key={c.id} value={c.id.toString()}>{c.razao_social}</option>)}
            </select>
          </div>
        ) : (
          <div style={{padding:'14px 0', display:'flex', justifyContent:'center', borderBottom:'1px solid #1E293B'}}>
            <span style={{fontSize:18}} title="Cliente ativo">👤</span>
          </div>
        )}

        <button onClick={() => { onNavigate('painel', 0); if(isMobile) setMenuAberto(false) }}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:12,
            padding: aberta ? '13px 16px' : '13px 0',
            justifyContent: aberta ? 'flex-start' : 'center',
            background: sidebarAtiva==='painel:0' ? '#1E293B' : 'none',
            border:'none', borderLeft: sidebarAtiva==='painel:0' ? `3px solid ${C.blue}` : '3px solid transparent',
            cursor:'pointer', color: sidebarAtiva==='painel:0' ? C.sidebarActiveText : C.sidebarText,
            fontSize:14, textAlign:'left', fontWeight: sidebarAtiva==='painel:0' ? 600 : 500,
          }}>
          <span style={{fontSize:18, flexShrink:0}}>📊</span>
          {aberta && <span style={{whiteSpace:'nowrap'}}>Painel</span>}
        </button>
		<button
  onClick={() => {
    onNavigate('manual_operacao', 0)
    if (isMobile) setMenuAberto(false)
  }}
  style={{
    width:'100%',
    display:'flex',
    alignItems:'center',
    gap:12,
    padding: aberta ? '13px 16px' : '13px 0',
    justifyContent: aberta ? 'flex-start' : 'center',
    background: sidebarAtiva==='manual_operacao:0' ? '#1E293B' : 'none',
    border:'none',
    borderLeft: sidebarAtiva==='manual_operacao:0'
      ? `3px solid ${C.blue}`
      : '3px solid transparent',
    cursor:'pointer',
    color: sidebarAtiva==='manual_operacao:0'
      ? C.sidebarActiveText
      : C.sidebarText,
    fontSize:14,
    textAlign:'left',
    fontWeight: sidebarAtiva==='manual_operacao:0' ? 600 : 500,
  }}
>
  <span style={{fontSize:18, flexShrink:0}}>📖</span>

  {aberta && (
    <span style={{whiteSpace:'nowrap'}}>
      Manual de Operação
    </span>
  )}
</button>

        <nav style={{flex:1, padding:'8px 0'}}>
          {MENU_SECOES.map(secao => {
  const itensVisiveis = secao.itens.filter(item => moduloPermitido(item.module))
  if (itensVisiveis.length === 0) return null
  return (
  <div key={secao.id} style={{marginBottom:10}}>
    {aberta && (
      <div style={{fontSize:12,fontWeight:700,color:'#FFFFFF',letterSpacing:1,padding:'6px 16px 4px',whiteSpace:'nowrap'}}>
        {secao.titulo}
      </div>
    )}
    {!aberta && <div style={{height:1, background:'#1E293B', margin:'6px 10px'}} />}
    {itensVisiveis.map((item, idx) => {
      const ativo = isItemAtivo(item)
      return (
        <button key={idx} onClick={() => handleItem(item)}
          title={!aberta ? item.label : undefined}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:12,
            padding: aberta ? '9px 16px' : '9px 0',
            justifyContent: aberta ? 'flex-start' : 'center',
            background: ativo ? '#1E293B' : 'none',
            border:'none', borderLeft: ativo ? `3px solid ${C.blue}` : '3px solid transparent',
            cursor:'pointer', textAlign:'left',
            color: ativo ? C.sidebarActiveText : C.sidebarText,
            fontSize:13, fontWeight: ativo ? 600 : 400, transition:'all 0.1s',
          }}>
          <span style={{fontSize:16, flexShrink:0, opacity: ativo ? 1 : 0.85}}>{item.icon}</span>
          {aberta && <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{item.label}</span>}
        </button>
      )
    })}
  </div>
  )
})}
              
          {isAdmin && <>
            <div style={{height:1, background:'#1E293B', margin:'8px 10px'}} />
            {aberta && <div style={{fontSize:12,fontWeight:700,color:'#FFFFFF',letterSpacing:1,padding:'4px 16px 4px',whiteSpace:'nowrap'}}>SISTEMA</div>}
            {Object.entries(RESTRICTED).map(([key, mod]) => (
              <button key={key} onClick={() => { onNavigate(key, 0); if(isMobile) setMenuAberto(false) }}
                title={!aberta ? mod.label : undefined}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding: aberta ? '10px 16px' : '10px 0',
                  justifyContent: aberta ? 'flex-start' : 'center',
                  background: sidebarAtiva===(key+':0') ? '#1E293B' : 'none',
                  border:'none', borderLeft: sidebarAtiva===(key+':0') ? `3px solid ${C.blue}` : '3px solid transparent',
                  cursor:'pointer', color: sidebarAtiva===(key+':0') ? C.sidebarActiveText : C.sidebarText,
                  fontSize:13, textAlign:'left', fontWeight: sidebarAtiva===(key+':0') ? 600 : 400,
                }}>
                <span style={{fontSize:16, flexShrink:0}}>{mod.icon}</span>
                {aberta && <span style={{whiteSpace:'nowrap'}}>{mod.label}</span>}
              </button>
            ))}
          </>}
        </nav>

        <div style={{padding: aberta ? '10px 16px' : '10px 0', textAlign: aberta ? 'left' : 'center', borderTop:'1px solid #1E293B',fontSize:11,color:'#475569',whiteSpace:'nowrap',overflow:'hidden'}}>
          {aberta ? 'e-FiscalTribe®' : '●'}
        </div>
      </aside>
    </>
  )
}

function MetricRing({ percent=0, color='#2563EB' }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0))
  return (
    <div style={{
      width:58,height:58,borderRadius:'50%',flexShrink:0,
      background:'#FFFFFF',border:`3px solid ${color}`,
      display:'grid',placeItems:'center'
    }}>
      <div style={{textAlign:'center',lineHeight:1}}>
        <div style={{fontSize:14,fontWeight:900,color}}>{pct}%</div>
        <div style={{fontSize:7.5,fontWeight:800,color:'#64748B',marginTop:4,letterSpacing:.45}}>ÍNDICE</div>
      </div>
    </div>
  )
}

function KpiCard({ icon, value, label, color, percent=0, subtitle='', onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        width:'100%',textAlign:'left',position:'relative',overflow:'hidden',
        background:'#FFFFFF',
        borderRadius:18,padding:'16px 17px',border:'1px solid #E6EDF5',
        boxShadow:hover?'0 10px 24px rgba(15,23,42,.07)':'0 6px 18px rgba(15,23,42,.045)',
        display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,minWidth:0,
        cursor:onClick?'pointer':'default',transform:hover&&onClick?'translateY(-1px)':'translateY(0)',
        transition:'all .18s ease',fontFamily:'inherit'
      }}
    >
      <div style={{display:'flex',alignItems:'center',gap:13,minWidth:0}}>
        <div style={{width:40,height:40,borderRadius:'50%',display:'grid',placeItems:'center',fontSize:16,background:color,color:'#FFFFFF',flexShrink:0}}>{icon}</div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:.25,marginBottom:4}}>{label}</div>
          <div style={{fontSize:22,fontWeight:900,color:C.text,lineHeight:1.05,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',letterSpacing:-.3}}>{value}</div>
          <div style={{fontSize:10.3,color:C.muted,marginTop:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{subtitle}</div>
          {onClick && <div style={{fontSize:9.3,color:hover?C.blue:'#64748B',marginTop:7,fontWeight:800}}>Ver detalhes →</div>}
        </div>
      </div>
      <MetricRing percent={percent} color={color} />
    </button>
  )
}

function ChartShell({ title, subtitle, icon, children, right, onClick, accent='#2563EB' }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onKeyDown={e=>{if(onClick&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onClick()}}}
      role={onClick?'button':undefined}
      tabIndex={onClick?0:undefined}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        position:'relative',overflow:'hidden',
        background:'linear-gradient(155deg,#FFFFFF 0%,#FBFDFF 100%)',
        border:`1px solid ${hover&&onClick ? accent+'45' : '#E6EDF5'}`,borderRadius:20,padding:'17px',
        boxShadow:hover&&onClick?`0 18px 42px ${accent}13`:'0 10px 28px rgba(15,23,42,.05)',minWidth:0,
        cursor:onClick?'pointer':'default',transform:hover&&onClick?'translateY(-2px)':'none',transition:'all .2s ease'
      }}
    >
      <div style={{position:'absolute',top:0,left:18,right:18,height:2,borderRadius:'0 0 8px 8px',background:`linear-gradient(90deg,transparent,${accent}40,transparent)`}} />
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:12}}>
        <div style={{display:'flex',gap:10,minWidth:0}}>
          <div style={{width:36,height:36,borderRadius:11,display:'grid',placeItems:'center',background:`${accent}10`,color:accent,fontSize:17,fontWeight:900,flexShrink:0,border:`1px solid ${accent}16`}}>{icon}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:900,color:C.text,letterSpacing:-.1}}>{title}</div>
            <div style={{fontSize:10.8,color:C.muted,marginTop:3}}>{subtitle}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          {right}
          {onClick && <span style={{fontSize:9.5,fontWeight:800,color:accent,background:`${accent}0C`,border:`1px solid ${accent}18`,padding:'5px 7px',borderRadius:8,whiteSpace:'nowrap'}}>Detalhes ↗</span>}
        </div>
      </div>
      {children}
    </div>
  )
}

function DashboardDetailModal({ detail, onClose, children }) {
  useEffect(() => {
    if (!detail) return
    const fechar = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [detail, onClose])
  if (!detail) return null
  const accent = detail.accent || '#2563EB'
  return (
    <div
      onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}
      style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(15,23,42,.48)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
    >
      <div style={{width:'min(920px,96vw)',maxHeight:'88vh',overflow:'hidden',background:'#fff',borderRadius:24,border:'1px solid rgba(255,255,255,.55)',boxShadow:'0 32px 90px rgba(15,23,42,.28)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'20px 22px 17px',borderBottom:'1px solid #E8EEF5',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,background:`linear-gradient(135deg,${accent}0C,#FFFFFF 55%)`}}>
          <div style={{display:'flex',gap:12,minWidth:0}}>
            <div style={{width:46,height:46,borderRadius:15,display:'grid',placeItems:'center',background:`${accent}16`,color:accent,fontWeight:900,fontSize:20,border:`1px solid ${accent}20`}}>{detail.icon || '↗'}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:18,fontWeight:900,color:C.text,letterSpacing:-.25}}>{detail.title}</div>
              <div style={{fontSize:11.5,color:C.muted,marginTop:4}}>{detail.subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:11,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontSize:18,cursor:'pointer',fontWeight:700}}>×</button>
        </div>
        <div style={{padding:22,overflowY:'auto',background:'#FBFCFE'}}>{children}</div>
      </div>
    </div>
  )
}

function DetailMetric({ label, value, accent='#2563EB', helper='' }) {
  return (
    <div style={{background:'#fff',border:'1px solid #E6EDF5',borderRadius:16,padding:'15px 16px',boxShadow:'0 6px 18px rgba(15,23,42,.035)'}}>
      <div style={{fontSize:10.5,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:.6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:accent,marginTop:6,letterSpacing:-.35}}>{value}</div>
      {helper && <div style={{fontSize:10.5,color:C.muted,marginTop:5}}>{helper}</div>}
    </div>
  )
}

function DonutLegend({ data, total, money=false }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8,minWidth:0}}>
      {data.map(item => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,fontSize:10.5}}>
            <div style={{display:'flex',alignItems:'center',gap:7,minWidth:0}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:item.color,flexShrink:0}} />
              <span style={{color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</span>
            </div>
            <div style={{display:'flex',alignItems:'baseline',gap:5,whiteSpace:'nowrap'}}>
              <strong style={{fontSize:10.5,color:C.text}}>{money ? fmtR(item.value) : item.value}</strong>
              <span style={{color:C.muted,fontSize:9.5}}>{pct}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PaginaReforma() {
  const [query,setQuery]=useState('')
  const [resposta,setResposta]=useState('')
  const [carregando,setCarregando]=useState(false)
  const SUGESTOES=['O que e a CBS e como substitui o PIS/COFINS?','Quais sao as aliquotas do IBS em 2026?','Como funciona o periodo de transicao da Reforma?','O que muda para empresas do Simples Nacional?','Como recuperar creditos de PIS/COFINS antes da CBS?','O que e o Imposto Seletivo e quem paga?','Qual o cronograma de extincao do ICMS?','Como fica o aproveitamento de creditos no Lucro Real?']
  async function buscar(pergunta) {
    const texto = pergunta || query
    if (!texto.trim()) return
    setCarregando(true); setResposta('')
    try {
      const { data, error } = await supabase.functions.invoke('consulta-ia', {
        body: { mensagem: `Voce e um especialista em direito tributario brasileiro com foco na Reforma Tributaria (EC 132/2023, LC 214/2025 e legislacao complementar). Responda de forma clara, objetiva e com referencias as leis quando possivel. Pergunta: ${texto}` },
      })
      if (error) throw error
      setResposta(data?.resposta || data?.content || 'Sem resposta.')
    } catch (e) { setResposta('Erro ao consultar IA: ' + e.message) }
    finally { setCarregando(false) }
  }
  return (
    <div style={{maxWidth:860,margin:'0 auto'}}>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:16,padding:'24px',marginBottom:20}}>
        <div style={{fontSize:11,color:C.blue,fontWeight:700,letterSpacing:2,marginBottom:8}}>E-FISCALTRIBE — INTELIGENCIA TRIBUTARIA</div>
        <h1 style={{fontSize:20,fontWeight:700,marginBottom:8,color:C.text}}>Reforma Tributária</h1>
        <p style={{fontSize:13,color:C.muted,margin:0}}>Consulte leis, decretos e impactos da Reforma — CBS, IBS, IS e período de transição (2026-2032).</p>
      </div>
      <div style={{background:C.white,borderRadius:14,border:`1px solid ${C.border}`,padding:'16px',marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14}}>Pergunte sobre a Reforma Tributária</div>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&buscar()}
            placeholder="Ex: Como funciona a CBS?"
            style={{flex:1,minWidth:200,padding:'10px 14px',border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.text,outline:'none'}} />
          <button onClick={()=>buscar()} disabled={carregando}
            style={{padding:'10px 16px',background:C.blue,color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:carregando?'default':'pointer',opacity:carregando?0.7:1}}>
            {carregando?'Buscando...':'Buscar'}
          </button>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {SUGESTOES.map((s,i)=>(
            <button key={i} onClick={()=>{setQuery(s);buscar(s)}}
              style={{padding:'5px 10px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:20,fontSize:11,color:C.muted,cursor:'pointer',fontWeight:500}}>{s}</button>
          ))}
        </div>
        {carregando&&<div style={{marginTop:16,background:C.bg,borderRadius:10,padding:'16px'}}><div style={{fontSize:13,color:C.muted}}>Consultando...</div></div>}
        {resposta&&!carregando&&<div style={{marginTop:16,background:'#F0FDF4',border:'1px solid #86efac',borderRadius:10,padding:'16px'}}><div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Resposta</div><div style={{fontSize:13,color:C.text,lineHeight:1.8,whiteSpace:'pre-wrap'}}>{resposta}</div></div>}
      </div>

    </div>
  )
}
export default function Dashboard({ nomeUsuario, onLogout, onAdmin, isAdmin }) {
  const isMobile = useIsMobile()
  const [menuAberto, setMenuAberto] = useState(false)
  const [user, setUser] = useState(null)
  const [module, setModule] = useState('painel')
  useEffect(() => { localStorage.removeItem('fiscaltrib_module') }, [])
  useEffect(() => { localStorage.setItem('fiscaltrib_module', module) }, [module])
  const [activeTab, setActiveTab] = useState(0)
  const [sidebarAtiva, setSidebarAtiva] = useState('painel:0')
  const [manualFlutuanteModo, setManualFlutuanteModo] = useState('recolhido')
  const [clientes, setClientes] = useState([])
  const [entradas, setEntradas] = useState({})
  const [checklist, setChecklist] = useState({})
  const [activeId, setActiveId] = useState(() => localStorage.getItem('fiscaltrib_cliente') || null)
  useEffect(() => { if (activeId) localStorage.setItem('fiscaltrib_cliente', activeId) }, [activeId])
  const [calcTab, setCalcTab] = useState('fator-r')
  const [calcResult, setCalcResult] = useState('')
  const [novoCliente, setNovoCliente] = useState(null)
  const [modoNovoCliente, setModoNovoCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [cdaParaDiagnostico, setCdaParaDiagnostico] = useState(null)
  const [mostrarImportarCDA, setMostrarImportarCDA] = useState(false)
  const [apuracaoEspelho, setApuracaoEspelho] = useState(null)
  const [espelhoVersaoInicial, setEspelhoVersaoInicial] = useState(null)
  const [espelhoVersoesExternas, setEspelhoVersoesExternas] = useState(null)
  const [espelhoModoConsulta, setEspelhoModoConsulta] = useState(false)
  const [cFolha,setCFolha]=useState(''); const [cRb,setCRb]=useState('')
  const [cRbt12,setCRbt12]=useState(''); const [cRmes,setCRmes]=useState('')
  const [cFat,setCFat]=useState(''); const [cMarg,setCMarg]=useState(''); const [cAtv,setCAtv]=useState('comercio')
  const [cRbt,setCRbt]=useState(''); const [cAtv2,setCAtv2]=useState('8'); const [cDtpag,setCDtpag]=useState('')
  const [permissoesModulos, setPermissoesModulos] = useState(null)
  const contentRef = useRef(null)
  const [clienteProntuario, setClienteProntuario] = useState(null)
  const [origemProntuario, setOrigemProntuario] = useState('clientes')
  const [painelDetalhe, setPainelDetalhe] = useState(null)

  useEffect(() => {
  carregarClientes()
  carregarPermissoesModulos()
}, [])
  useEffect(()=>{
    registrarPresenca()
    const interval = setInterval(registrarPresenca, 60000)
    return ()=>clearInterval(interval)
  },[])
  useEffect(() => {
    if (!permissoesModulos) return
    if (module === 'admin' || module === 'dev' || module === 'painel') return
    if (permissoesModulos[module] === false) {
      const primeiroPermitido = Object.keys(MODULES).find(k => permissoesModulos[k] !== false)
      setModule(primeiroPermitido || 'painel')
      setActiveTab(0)
    }
  }, [permissoesModulos])

  async function carregarPermissoesModulos() {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('modulos_permissoes').select('*').eq('usuario_id', user.id).single()
    setPermissoesModulos(data || {})
  }
  function moduloPermitido(key) {
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
    }, { onConflict: 'usuario_id', ignoreDuplicates: false })
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
  if (
    !window.confirm(
      `Excluir "${c.razao_social}" e TODOS os dados vinculados a este cliente?\n\n` +
      `Serão excluídos XMLs, itens, classificações, PGDAS-D, apurações, ` +
      `espelhos, diagnósticos e demais registros do cliente.\n\n` +
      `Esta ação não pode ser desfeita.`
    )
  ) return

  try {
    const clienteId = c.id

    // =========================================================
    // 1. ITENS FISCAIS + HISTÓRICO DE CLASSIFICAÇÕES
    // =========================================================

    const idsItens = []
    const tamanhoLote = 1000
    let inicio = 0

    while (true) {
      const { data, error } = await supabase
        .from('itens_fiscais')
        .select('id')
        .eq('cliente_id', clienteId)
        .range(inicio, inicio + tamanhoLote - 1)

      if (error) throw new Error('Itens fiscais: ' + error.message)

      const lote = data || []

      idsItens.push(
        ...lote.map(item => item.id).filter(Boolean)
      )

      if (lote.length < tamanhoLote) break

      inicio += tamanhoLote
    }

    for (let i = 0; i < idsItens.length; i += 200) {
      const loteIds = idsItens.slice(i, i + 200)

      const { error } = await supabase
        .from('itens_classificacoes')
        .delete()
        .in('item_id', loteIds)

      if (error) {
        throw new Error(
          'Histórico de classificações: ' + error.message
        )
      }
    }

    const { error: erroItens } = await supabase
      .from('itens_fiscais')
      .delete()
      .eq('cliente_id', clienteId)

    if (erroItens) {
      throw new Error('Itens fiscais: ' + erroItens.message)
    }

    // =========================================================
    // 2. DIAGNÓSTICOS XML / MONOFÁSICOS
    // =========================================================

    const { error: erroItensMono } = await supabase
      .from('diagnostico_monofasico_itens')
      .delete()
      .eq('cliente_id', clienteId)

    if (erroItensMono) {
      throw new Error(
        'Itens dos diagnósticos XML: ' +
        erroItensMono.message
      )
    }

    const { error: erroMono } = await supabase
      .from('diagnosticos_monofasicos')
      .delete()
      .eq('cliente_id', clienteId)

    if (erroMono) {
      throw new Error(
        'Diagnósticos XML: ' + erroMono.message
      )
    }

    // =========================================================
    // 3. PGDAS-D
    // =========================================================

    const { data: pgdasCliente, error: erroBuscaPgdas } =
      await supabase
        .from('diagnosticos_pgdas')
        .select('id')
        .eq('cliente_id', clienteId)

    if (erroBuscaPgdas) {
      throw new Error(
        'PGDAS-D: ' + erroBuscaPgdas.message
      )
    }

    const idsPgdas = (pgdasCliente || [])
      .map(item => item.id)
      .filter(Boolean)

    for (let i = 0; i < idsPgdas.length; i += 200) {
      const loteIds = idsPgdas.slice(i, i + 200)

      const { error } = await supabase
        .from('diagnosticos_pgdas_atividades')
        .delete()
        .in('diagnostico_id', loteIds)

      if (error) {
        throw new Error(
          'Atividades do PGDAS-D: ' + error.message
        )
      }
    }

    const { error: erroPgdas } = await supabase
      .from('diagnosticos_pgdas')
      .delete()
      .eq('cliente_id', clienteId)

    if (erroPgdas) {
      throw new Error(
        'PGDAS-D: ' + erroPgdas.message
      )
    }

    // =========================================================
    // 4. ESPELHOS E APURAÇÕES
    // =========================================================

    const { error: erroEspelhos } = await supabase
      .from('espelhos_retificacao_pgdas')
      .delete()
      .eq('cliente_id', String(clienteId))

    if (erroEspelhos) {
      throw new Error(
        'Espelhos de retificação: ' +
        erroEspelhos.message
      )
    }

    const { error: erroApuracoes } = await supabase
      .from('apuracoes_simples')
      .delete()
      .eq('cliente_id', clienteId)

    if (erroApuracoes) {
      throw new Error(
        'Apurações do Simples: ' +
        erroApuracoes.message
      )
    }

    // =========================================================
    // 5. DEMAIS DADOS JÁ TRATADOS PELO SISTEMA
    // =========================================================

    await supabase.from('entradas').delete().eq('cliente_id', clienteId)
    await supabase.from('recuperacoes').delete().eq('cliente_id', clienteId)
    await supabase.from('acompanhamentos').delete().eq('cliente_id', clienteId)
    await supabase.from('prazos_fiscais').delete().eq('cliente_id', clienteId)
    await supabase.from('checklist').delete().eq('cliente_id', clienteId)
    await supabase.from('scores_fiscais').delete().eq('cliente_id', clienteId)
    await supabase.from('monitor_obrigacoes').delete().eq('cliente_id', clienteId)
    await supabase.from('perdcomp').delete().eq('cliente_id', clienteId)
    await supabase.from('exigencias_fiscais').delete().eq('cliente_id', clienteId)
    await supabase.from('relatorios_importacao').delete().eq('cliente_id', clienteId)

    // =========================================================
    // 6. CLIENTE — SEMPRE POR ÚLTIMO
    // =========================================================

    const { error: erroCliente } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clienteId)

    if (erroCliente) {
      throw new Error(
        'Cliente: ' + erroCliente.message
      )
    }

    setClientes(prev =>
      prev.filter(item => item.id !== clienteId)
    )

    setActiveId(prev =>
      String(prev) === String(clienteId)
        ? ''
        : prev
    )

    const novasEntradas = { ...entradas }
    delete novasEntradas[clienteId]
    setEntradas(novasEntradas)

    alert(
      `"${c.razao_social}" e os dados vinculados foram excluídos com sucesso.`
    )

  } catch (e) {
    console.error('Erro ao excluir cliente:', e)

    alert(
      'Não foi possível excluir o cliente.\n\n' +
      (e?.message || 'Erro desconhecido.')
    )
  }
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
      const { data,error }=await supabase.from('clientes').insert([{...payload,usuario_id:user.id,status:'Em analise'}]).select()
      if(!error&&data){ setClientes([data[0],...clientes]); setActiveId(data[0].id.toString()); setEntradas({...entradas,[data[0].id]:[]}) }
      else alert('Erro: '+error.message)
    }
    setSalvando(false); setModoNovoCliente(null); navigateTo('clientes', 0)
  }
  function toggleCheck(idx) {
    const arr=checklist[activeId]||(REGIME_DOCS[active?.regime]||[]).map(()=>false)
    const novo=[...arr]; novo[idx]=!novo[idx]
    setChecklist({...checklist,[activeId]:novo})
  }
  function navigateTo(mod, tab=0) { setModule(mod); setActiveTab(tab) }
  function handleNavigate(key, tab=0) {
    setModule(key); setActiveTab(tab)
    setSidebarAtiva(key + ':' + tab)
    if(key==='clientes') { setNovoCliente(null); setModoNovoCliente(null) }
  }

  function abrirEspelhoDaApuracao(apuracao) {
    setApuracaoEspelho(apuracao)
    setEspelhoVersaoInicial(null)
    setEspelhoVersoesExternas(null)
    setEspelhoModoConsulta(false)
  }

  function abrirEspelhoDoHistorico({ apuracao, versaoInicial, versoesExternas }) {
    setApuracaoEspelho(apuracao)
    setEspelhoVersaoInicial(versaoInicial || null)
    setEspelhoVersoesExternas(Array.isArray(versoesExternas) ? versoesExternas : null)
    setEspelhoModoConsulta(true)
  }

  function fecharEspelho() {
    setApuracaoEspelho(null)
    setEspelhoVersaoInicial(null)
    setEspelhoVersoesExternas(null)
    setEspelhoModoConsulta(false)
  }

  function handleTab(i) {
    setActiveTab(i)
    contentRef.current?.scrollTo(0, 0)
    if(module==='clientes' && i===1) { setNovoCliente(null); setModoNovoCliente(null) }
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
  const todasEntradas = clientes.flatMap(c => entradas[c.id] || [])
  const oportunidadesPositivas = todasEntradas.filter(e => Number(e.credito || 0) > 0).length
  const clientesAnalisados = clientes.filter(c => (entradas[c.id] || []).length > 0).length
  const clientesComPotencial = clientes.filter(c => (entradas[c.id] || []).some(e => Number(e.credito || 0) > 0)).length

  const pctClientes = clientes.length ? Math.round((clientesAnalisados / clientes.length) * 100) : 0
  const pctOportunidades = totalOpp ? Math.round((oportunidadesPositivas / totalOpp) * 100) : 0
  const pctPotencial = clientes.length ? Math.round((clientesComPotencial / clientes.length) * 100) : 0
  const pctCriticos = totalOpp ? Math.round((criticos / totalOpp) * 100) : 0

  const regimeColors = {
    'Simples Nacional':'#DC2626',
    'Lucro Presumido':'#EF4444',
    'Lucro Real':'#B91C1C',
    'Outros':'#F87171',
  }
  const regimeCounts = clientes.reduce((acc,c) => {
    const regime = c.regime || 'Outros'
    acc[regime] = (acc[regime] || 0) + 1
    return acc
  }, {})
  const regimeData = [
    {name:'Simples Nacional',value:regimeCounts['Simples Nacional'] || 0,color:regimeColors['Simples Nacional']},
    {name:'Lucro Presumido',value:regimeCounts['Lucro Presumido'] || 0,color:regimeColors['Lucro Presumido']},
    {name:'Lucro Real',value:regimeCounts['Lucro Real'] || 0,color:regimeColors['Lucro Real']},
    {name:'Outros',value:Object.entries(regimeCounts).filter(([k])=>!['Simples Nacional','Lucro Presumido','Lucro Real'].includes(k)).reduce((a,[,v])=>a+v,0),color:regimeColors.Outros},
  ]
  const regimeChartData = regimeData.some(x=>x.value>0) ? regimeData : [{name:'Sem clientes',value:1,color:'#FF0000'}]

  const potencialCategorias = {
    'PIS/COFINS': {value:0,color:'#EAB308'},
    'ICMS': {value:0,color:'#FACC15'},
    'IRPJ/CSLL': {value:0,color:'#FCD34D'},
    'Outros': {value:0,color:'#FDE68A'},
  }
  todasEntradas.forEach(e => {
    const trib = String(e.tributo || '').toUpperCase()
    const valor = Number(e.credito || 0)
    if (!valor) return
    if (trib.includes('PIS') || trib.includes('COFINS')) potencialCategorias['PIS/COFINS'].value += valor
    else if (trib.includes('ICMS')) potencialCategorias.ICMS.value += valor
    else if (trib.includes('IRPJ') || trib.includes('CSLL')) potencialCategorias['IRPJ/CSLL'].value += valor
    else potencialCategorias.Outros.value += valor
  })
  const potencialData = Object.entries(potencialCategorias).map(([name,v])=>({name,value:v.value,color:v.color}))
  const potencialChartData = potencialData.some(x=>x.value>0) ? potencialData : [{name:'Sem potencial',value:1,color:'#009C3B'}]

  const mesesEvolucao = Array.from({length:6},(_,i)=>{
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-5+i, 1)
    return {
      key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      mes:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),
      ano:String(d.getFullYear()).slice(-2),
      clientes:0,
    }
  })
  clientes.forEach(c=>{
    const raw = c.created_at || c.data_cadastro || c.createdAt
    if(!raw) return
    const d = new Date(raw)
    if(Number.isNaN(d.getTime())) return
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const alvo=mesesEvolucao.find(m=>m.key===key)
    if(alvo) alvo.clientes += 1
  })
  const dataHoje = hoje.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})
  const oportunidadesCriticas = clientes.flatMap(c => (entradas[c.id] || []).map(e => ({...e, cliente:c}))).filter(e => {
    const [a,m] = String(e.competencia || '').split('-')
    if (!a || !m || Number(e.credito || 0) <= 0) return false
    const lim = new Date(parseInt(a)+5, parseInt(m)-1, 1)
    return Number.isFinite(lim.getTime()) && (lim-hoje)/(1000*60*60*24*365) <= 1
  })
  const clientesOrdenadosPotencial = clientes.map(c => {
    const ee = entradas[c.id] || []
    return {...c, qtdOportunidades:ee.length, qtdPositivas:ee.filter(e=>Number(e.credito||0)>0).length, potencial:ee.reduce((s,e)=>s+(Number(e.credito)||0),0)}
  }).sort((a,b)=>b.potencial-a.potencial)

  function renderPainelDetalhe() {
    if (!painelDetalhe) return null
    const tipo = painelDetalhe.tipo
    const grid3 = {display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,minmax(0,1fr))',gap:12,marginBottom:18}
    const th = {padding:'9px 10px',textAlign:'left',fontSize:9.5,fontWeight:900,color:C.muted,textTransform:'uppercase',letterSpacing:.5,borderBottom:'1px solid #E6EDF5',whiteSpace:'nowrap'}
    const td = {padding:'10px',fontSize:11.5,color:C.text,borderBottom:'1px solid #EEF2F7',verticalAlign:'middle'}
    const tableWrap = {background:'#fff',border:'1px solid #E6EDF5',borderRadius:16,overflow:'auto'}

    if (tipo === 'clientes') return <>
      <div style={grid3}>
        <DetailMetric label="Clientes cadastrados" value={clientes.length} accent="#2563EB" />
        <DetailMetric label="Com análise" value={clientesAnalisados} accent="#0EA5E9" helper={`${pctClientes}% da carteira`} />
        <DetailMetric label="Com potencial" value={clientesComPotencial} accent="#10B981" helper={`${pctPotencial}% da carteira`} />
      </div>
      <div style={tableWrap}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Cliente','Regime','Oportunidades','Potencial',''].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>
        {clientesOrdenadosPotencial.map(c=><tr key={c.id}>
          <td style={{...td,fontWeight:800}}>{c.razao_social}<div style={{fontSize:9.5,color:C.muted,marginTop:2}}>{c.cnpj}</div></td>
          <td style={td}>{badge(c.regime)}</td><td style={td}>{c.qtdOportunidades}</td><td style={{...td,color:'#B45309',fontWeight:900}}>{fmtR(c.potencial)}</td>
          <td style={td}><button onClick={()=>{setActiveId(c.id.toString());setPainelDetalhe(null);navigateTo('analise',0)}} style={{padding:'6px 9px',borderRadius:8,border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1D4ED8',fontSize:10.5,fontWeight:800,cursor:'pointer'}}>Analisar →</button></td>
        </tr>)}
      </tbody></table></div>
    </>

    if (tipo === 'oportunidades') return <>
      <div style={grid3}>
        <DetailMetric label="Mapeadas" value={totalOpp} accent="#F59E0B" />
        <DetailMetric label="Com crédito" value={oportunidadesPositivas} accent="#10B981" helper={`${pctOportunidades}% das mapeadas`} />
        <DetailMetric label="Críticas" value={criticos} accent="#F43F5E" />
      </div>
      <div style={tableWrap}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Cliente','Competência','Tributo','Crédito','Risco'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>
        {clientes.flatMap(c=>(entradas[c.id]||[]).map(e=>({...e,cliente:c}))).slice(0,100).map((e,i)=><tr key={i}>
          <td style={{...td,fontWeight:700}}>{e.cliente?.razao_social || '—'}</td><td style={td}>{e.competencia || '—'}</td><td style={td}>{e.tributo || '—'}</td><td style={{...td,color:Number(e.credito||0)>0?'#059669':C.muted,fontWeight:800}}>{fmtR(e.credito)}</td><td style={td}>{riskBadge(e.risco)}</td>
        </tr>)}
      </tbody></table></div>
    </>

    if (tipo === 'potencial') return <>
      <div style={grid3}>
        <DetailMetric label="Potencial total" value={fmtR(totalGeral)} accent="#10B981" />
        <DetailMetric label="Clientes com potencial" value={clientesComPotencial} accent="#0EA5E9" />
        <DetailMetric label="Oportunidades positivas" value={oportunidadesPositivas} accent="#8B5CF6" />
      </div>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14}}>
        <div style={{...tableWrap,padding:16}}><div style={{fontSize:12.5,fontWeight:900,color:C.text,marginBottom:13}}>Por categoria tributária</div>{potencialData.map(x=>{
          const pctv=totalGeral>0?Math.round(x.value/totalGeral*100):0
          return <div key={x.name} style={{marginBottom:13}}><div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:5}}><span style={{fontWeight:800,color:C.text}}>{x.name}</span><span style={{color:C.muted}}>{fmtR(x.value)} · {pctv}%</span></div><div style={{height:7,borderRadius:99,background:'#EEF2F7',overflow:'hidden'}}><div style={{height:'100%',width:`${pctv}%`,background:x.color,borderRadius:99}} /></div></div>
        })}</div>
        <div style={tableWrap}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Cliente','Potencial'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{clientesOrdenadosPotencial.slice(0,12).map(c=><tr key={c.id}><td style={{...td,fontWeight:700}}>{c.razao_social}</td><td style={{...td,color:'#059669',fontWeight:900}}>{fmtR(c.potencial)}</td></tr>)}</tbody></table></div>
      </div>
    </>

    if (tipo === 'criticos') return <>
      <div style={grid3}>
        <DetailMetric label="Críticos" value={criticos} accent="#F43F5E" />
        <DetailMetric label="Participação" value={`${pctCriticos}%`} accent="#F97316" helper="sobre as oportunidades mapeadas" />
        <DetailMetric label="Potencial crítico" value={fmtR(oportunidadesCriticas.reduce((s,e)=>s+(Number(e.credito)||0),0))} accent="#DC2626" />
      </div>
      {oportunidadesCriticas.length===0 ? <div style={{padding:34,textAlign:'center',background:'#fff',border:'1px solid #E6EDF5',borderRadius:16,color:C.muted}}>Nenhuma oportunidade crítica no momento.</div> : <div style={tableWrap}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Cliente','Competência','Tributo','Crédito','Risco'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{oportunidadesCriticas.map((e,i)=><tr key={i}><td style={{...td,fontWeight:700}}>{e.cliente?.razao_social}</td><td style={td}>{e.competencia}</td><td style={td}>{e.tributo}</td><td style={{...td,color:'#DC2626',fontWeight:900}}>{fmtR(e.credito)}</td><td style={td}>{riskBadge(e.risco)}</td></tr>)}</tbody></table></div>}
    </>

    if (tipo === 'regimes') return <>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:18}}>{regimeData.map(x=><DetailMetric key={x.name} label={x.name} value={x.value} accent={x.color} helper={clientes.length?`${Math.round(x.value/clientes.length*100)}% da base`:'0% da base'} />)}</div>
      <div style={tableWrap}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Cliente','Regime','CNPJ','Município/UF'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{clientes.map(c=><tr key={c.id}><td style={{...td,fontWeight:800}}>{c.razao_social}</td><td style={td}>{badge(c.regime)}</td><td style={td}>{c.cnpj}</td><td style={td}>{[c.municipio,c.uf].filter(Boolean).join('/') || '—'}</td></tr>)}</tbody></table></div>
    </>

    if (tipo === 'evolucao') return <>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(6,1fr)',gap:10,marginBottom:18}}>{mesesEvolucao.map(m=><DetailMetric key={m.key} label={`${m.mes}/${m.ano}`} value={m.clientes} accent="#3B82F6" />)}</div>
      <div style={{background:'#fff',border:'1px solid #E6EDF5',borderRadius:18,padding:18,height:280}}><ResponsiveContainer width="100%" height="100%"><BarChart data={mesesEvolucao} margin={{top:10,right:12,left:-12,bottom:0}}><CartesianGrid stroke="#EEF2F7" vertical={false}/><XAxis dataKey="mes" tick={{fontSize:11,fill:'#64748B'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'#94A3B8'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #E2E8F0'}}/><Bar dataKey="clientes" fill="#3B82F6" radius={[9,9,0,0]} maxBarSize={46}/></BarChart></ResponsiveContainer></div>
    </>

    if (tipo === 'cliente') {
      const c = painelDetalhe.cliente
      const ee = entradas[c?.id] || []
      const pot = ee.reduce((s,e)=>s+(Number(e.credito)||0),0)
      return <>
        <div style={grid3}><DetailMetric label="Potencial" value={fmtR(pot)} accent="#10B981"/><DetailMetric label="Oportunidades" value={ee.length} accent="#F59E0B"/><DetailMetric label="Com crédito" value={ee.filter(e=>Number(e.credito||0)>0).length} accent="#2563EB"/></div>
        <div style={{background:'#fff',border:'1px solid #E6EDF5',borderRadius:16,padding:17,marginBottom:14,display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',gap:12,fontSize:11.5}}>
          {[['Razão social',c?.razao_social],['CNPJ',c?.cnpj],['Regime',c?.regime],['Município / UF',[c?.municipio,c?.uf].filter(Boolean).join('/')],['CNAE principal',c?.cnae_principal],['Responsável contábil',c?.responsavel_contabil]].map(([lb,v])=><div key={lb}><div style={{fontSize:9.5,fontWeight:900,color:C.muted,textTransform:'uppercase',letterSpacing:.5}}>{lb}</div><div style={{fontWeight:700,color:C.text,marginTop:4}}>{v||'—'}</div></div>)}
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}><button onClick={()=>{setActiveId(c.id.toString());setPainelDetalhe(null);navigateTo('clientes',0)}} style={btnOutline}>Abrir cadastro</button><button onClick={()=>{setActiveId(c.id.toString());setPainelDetalhe(null);navigateTo('analise',0)}} style={btnPrimary}>Abrir análise →</button></div>
      </>
    }
    return null
  }

  const docs       = REGIME_DOCS[active?.regime]||[]
  const checks     = checklist[activeId]||docs.map(()=>false)
  const done       = checks.filter(Boolean).length
  const pct        = docs.length?Math.round(done/docs.length*100):0

  const badge     = regime=>{ const colors={'Simples Nacional':'#dbeafe|#1e40af','Lucro Presumido':'#fef3c7|#92400e','Lucro Real':'#dcfce7|#166534'}; const[bg,color]=(colors[regime]||'#f1f5f9|#475569').split('|'); return <span style={{background:bg,color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{regime}</span> }
  const riskBadge = r=>{ const c=r==='baixo'?'#dcfce7|#166534':r==='medio'?'#fef9c3|#854d0e':'#fee2e2|#991b1b'; const[bg,color]=c.split('|'); return <span style={{background:bg,color,padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>{r}</span> }
  const applyMask = (k,v)=>{ if(k==='cnpj') return maskCNPJ(v); if(k==='cnae_principal') return maskCNAE(v); if(k==='cnaes_secundarios') return maskCNAES(v); if(k==='inscricao_estadual') return maskIE(v); if(k==='inscricao_municipal') return maskIM(v); return v }
  const inp       = (val,set,ph,tp='text')=><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={tp} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}} />
  const sel       = (val,set,opts)=><select value={val} onChange={e=>set(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%'}}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>

  function calcFatorR(){const f=parseFloat(cFolha)||0;const r=parseFloat(cRb)||1;const fr=f/r;setCalcResult(`Fator R: ${(fr*100).toFixed(2)}% -- Anexo ${fr>=0.28?'III (menor carga)':'V (maior carga)'}\n${fr>=0.28?'Enquadrado no Anexo III.':'Anexo V -- considere aumentar folha.'}`)}
  function calcDAS(){const rbt=parseFloat(cRbt12)||0;const rm=parseFloat(cRmes)||0;let aliq=4,ded=0;if(rbt>180000){aliq=7.3;ded=5940}if(rbt>360000){aliq=9.5;ded=13860}if(rbt>720000){aliq=10.7;ded=22500}if(rbt>1800000){aliq=14.3;ded=87300}if(rbt>3600000){aliq=19;ded=378000}const ef=Math.max(0,((rbt*(aliq/100))-ded)/rbt*100);setCalcResult(`DAS estimado: ${fmtR(rm*(ef/100))}\nAliquota efetiva: ${ef.toFixed(2)}%`)}
  function calcRegime(){const f=parseFloat(cFat)||0;const m=parseFloat(cMarg)||0;const l=f*(m/100);const sn=f*0.12;const lp=(f*0.0365)+(f*(cAtv==='servicos'?0.32:0.08)*0.15)+(f*(cAtv==='servicos'?0.32:0.12)*0.09);const lr=(l*0.34)+(f*0.0365);setCalcResult(`Simples Nacional: ${fmtR(sn)} (${(sn/f*100).toFixed(1)}%)\nLucro Presumido: ${fmtR(lp)} (${(lp/f*100).toFixed(1)}%)\nLucro Real: ${fmtR(lr)} (${(lr/f*100).toFixed(1)}%)`)}
  function calcIRPJ(){const rb=parseFloat(cRbt)||0;const p=parseFloat(cAtv2)||8;const bi=rb*(p/100);const bc=rb*(p===32?32:p===16?16:12)/100;const irpj=bi*0.15+Math.max(0,(bi-60000)*0.10);const csll=bc*0.09;setCalcResult(`IRPJ: ${fmtR(irpj)}\nCSLL: ${fmtR(csll)}\nTotal: ${fmtR(irpj+csll)}`)}
  function calcPrescricao(){if(!cDtpag){setCalcResult('Informe a data.');return}const p=new Date(cDtpag);const l=new Date(p);l.setFullYear(l.getFullYear()+5);const dias=Math.round((l-hoje)/(1000*60*60*24));if(dias<0){setCalcResult(`PRAZO PRESCRITO em ${l.toLocaleDateString('pt-BR')}!`)}else{setCalcResult(`Prazo limite: ${l.toLocaleDateString('pt-BR')}\nDias restantes: ${dias}\n${dias<=365?'CRITICO -- menos de 1 ano!':'Prazo confortavel.'}`)}}

  const btnPrimary={padding:'10px 16px',background:C.blue,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}
  const btnOutline={padding:'10px 16px',background:C.white,color:C.blue,border:`1.5px solid ${C.blue}`,borderRadius:8,fontSize:13,cursor:'pointer'}
  const btnDanger ={padding:'4px 12px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:500}
  const btnVoltar ={display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'none',border:`1.5px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer',marginBottom:16}

  const currentTabs = MODULES[module]?.tabs || []
  const padding = isMobile ? '16px' : '24px 28px'

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,system-ui,sans-serif',fontSize:16,color:C.blue}}>Carregando...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',width:'100vw',overflow:'hidden',fontFamily:'Inter,system-ui,sans-serif'}}>

      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',padding:'0 16px',height:62,gap:10}}>
          {isMobile && (
            <button onClick={() => setMenuAberto(true)} style={{background:'none',border:'none',color:C.text,fontSize:22,cursor:'pointer',padding:'4px 8px',flexShrink:0}}>Menu</button>
          )}
          <div style={{width:263,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <img src="/Logo6.png" alt="e-FiscalTribe" style={{height:54,objectFit:'contain',borderRadius:6}} />
          </div>

          {!isMobile && <span style={{fontSize:13,color:C.muted,flex:1,marginLeft:18}}>Plataforma de Diagnóstico, Inteligência e Recuperação Tributária</span>}

          {active && !isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:6,background:C.bg,padding:'4px 10px',borderRadius:20,border:`1px solid ${C.border}`}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:C.green,flexShrink:0}}></div>
          <span style={{fontSize:11,color:C.text,fontWeight:500,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{active.razao_social}</span>
          </div>
          )}
          {!isMobile && <span style={{fontSize:12,color:C.muted}}>Usuario: {nomeUsuario||'Usuario'}</span>}
          {onAdmin && !isMobile && <button onClick={onAdmin} style={{background:C.blue,border:'none',color:C.white,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600}}>Admin</button>}
          <button onClick={()=>onLogout()} style={{background:'none',border:`1px solid ${C.border}`,color:C.muted,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontSize:12}}>Sair</button>
        </div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <Sidebar
          sidebarAtiva={sidebarAtiva}
          onNavigate={handleNavigate}
          clientes={clientes}
          activeId={activeId}
          onChangeCliente={setActiveId}
          isAdmin={!!onAdmin}
          isMobile={isMobile}
          menuAberto={menuAberto}
          setMenuAberto={setMenuAberto}
          moduloPermitido={moduloPermitido}
        />
		<ManualFlutuante
        modo={manualFlutuanteModo}
        onModoChange={setManualFlutuanteModo}
        />

        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <TabBar tabs={currentTabs} activeTab={activeTab} onTab={handleTab} />

          <div ref={contentRef} style={{flex:1,overflowY:'auto',overflowX:'hidden',padding,background:C.bg,minWidth:0}}>

            {module==='painel' && <>
              <div style={{position:'relative',overflow:'hidden',background:'linear-gradient(135deg,#FFFFFF 0%,#FBFDFF 70%,#F8FBFF 100%)',border:'1px solid #E6EDF5',borderRadius:22,padding:isMobile?'17px':'18px 20px',marginBottom:14,boxShadow:'0 12px 34px rgba(15,23,42,.05)'}}>
                <div style={{position:'absolute',width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(37,99,235,.05),transparent 68%)',right:-70,top:-120,pointerEvents:'none'}} />
                <div style={{position:'absolute',width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,.04),transparent 68%)',right:150,bottom:-170,pointerEvents:'none'}} />
                <div style={{position:'relative',display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',gap:14,flexDirection:isMobile?'column':'row'}}>
                  <div>
                    <div style={{display:'inline-flex',alignItems:'center',gap:7,padding:'5px 9px',borderRadius:999,background:'#EFF6FF',border:'1px solid #DBEAFE',fontSize:9.5,fontWeight:900,color:'#2563EB',letterSpacing:.6,textTransform:'uppercase',marginBottom:8}}><span style={{width:6,height:6,borderRadius:'50%',background:'#10B981',boxShadow:'0 0 0 4px rgba(16,185,129,.10)'}}/>FiscalTribe Intelligence</div>
                    <div style={{fontSize:isMobile?21:28,fontWeight:900,color:C.text,letterSpacing:-.65}}>Painel Geral</div>
                    <div style={{fontSize:12.5,color:C.muted,marginTop:4}}>Visão executiva da carteira, oportunidades e potencial de recuperação.</div>
                  </div>
                  {!isMobile && (
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.86)',border:'1px solid #E6EDF5',borderRadius:13,padding:'9px 11px',boxShadow:'0 6px 18px rgba(15,23,42,.04)'}}><span style={{width:8,height:8,borderRadius:'50%',background:'#10B981',boxShadow:'0 0 0 4px rgba(16,185,129,.10)'}}/><div><div style={{fontSize:9.5,fontWeight:900,color:C.text}}>Dados sincronizados</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>Base conectada · Supabase</div></div></div>
                      <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.86)',border:'1px solid #E6EDF5',borderRadius:13,padding:'9px 12px',boxShadow:'0 6px 18px rgba(15,23,42,.04)'}}><span style={{fontSize:15,color:'#2563EB'}}>▣</span><div><div style={{fontSize:10,fontWeight:800,color:C.text,textTransform:'capitalize'}}>{dataHoje}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>Bem-vindo de volta!</div></div></div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:13,padding:'10px 14px',marginBottom:14,fontSize:11.5,color:'#9A3412',display:'flex',alignItems:'center',gap:9,boxShadow:'0 4px 14px rgba(15,23,42,.03)'}}>
                <span style={{width:25,height:25,borderRadius:8,display:'grid',placeItems:'center',background:'#FDE68A',color:'#B45309',fontWeight:900}}>!</span>
                <span><strong>Aviso:</strong> Análise preliminar — não dispensa revisão profissional.</span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(4,minmax(0,1fr))',gap:12,marginBottom:14}}>
                <KpiCard icon={<span style={{fontSize:18,fontWeight:900}}>◎</span>} value={clientes.length} label="Clientes" color="#16A34A" percent={pctClientes} subtitle="Carteira cadastrada" onClick={()=>setPainelDetalhe({tipo:'clientes',title:'Clientes da carteira',subtitle:'Visão detalhada dos clientes, análises e potencial.',accent:'#16A34A',icon:'◎'})} />
                <KpiCard icon={<span style={{fontSize:18,fontWeight:900}}>↗</span>} value={totalOpp} label="Oportunidades" color="#F97316" percent={pctOportunidades} subtitle="Mapeamentos identificados" onClick={()=>setPainelDetalhe({tipo:'oportunidades',title:'Oportunidades mapeadas',subtitle:'Detalhamento das oportunidades identificadas na carteira.',accent:'#F97316',icon:'↗'})} />
                <KpiCard icon={<span style={{fontSize:15,fontWeight:900}}>R$</span>} value={fmtR(totalGeral)} label="Potencial" color="#EAB308" percent={pctPotencial} subtitle="Valor potencial estimado" onClick={()=>setPainelDetalhe({tipo:'potencial',title:'Potencial de recuperação',subtitle:'Composição do valor estimado por categoria e cliente.',accent:'#EAB308',icon:'R$'})} />
                <KpiCard icon={<span style={{fontSize:20,fontWeight:900}}>!</span>} value={criticos} label="Críticos" color="#DC2626" percent={pctCriticos} subtitle="Oportunidades próximas do prazo" onClick={()=>setPainelDetalhe({tipo:'criticos',title:'Oportunidades críticas',subtitle:'Itens com crédito e prazo de recuperação mais sensível.',accent:'#DC2626',icon:'!'})} />
              </div>

              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'minmax(0,1fr) minmax(0,1fr) minmax(0,1.12fr)',gap:12,marginBottom:14}}>
                <ChartShell title="Distribuição da Base de Clientes" subtitle="Composição por regime tributário" icon="◔" accent="#EF4444" onClick={()=>setPainelDetalhe({tipo:'regimes',title:'Distribuição da base de clientes',subtitle:'Detalhamento da carteira por regime tributário.',accent:'#EF4444',icon:'◔'})}>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'145px minmax(0,1fr)',alignItems:'center',gap:12,minHeight:190}}>
                    <div style={{height:165,position:'relative'}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={regimeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={72} paddingAngle={2} cornerRadius={6} stroke="none">{regimeChartData.map((entry,i)=><Cell key={i} fill={entry.color} />)}</Pie><Tooltip formatter={(v,n)=>[v,n]} contentStyle={{borderRadius:12,border:`1px solid ${C.border}`,fontSize:11,boxShadow:'0 10px 26px rgba(15,23,42,.10)'}} /></PieChart>
                      </ResponsiveContainer>
                      <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',pointerEvents:'none'}}><div style={{textAlign:'center'}}><div style={{fontSize:25,fontWeight:900,color:C.text,lineHeight:1}}>{clientes.length}</div><div style={{fontSize:9.5,color:C.muted,marginTop:5,fontWeight:700}}>CLIENTES</div></div></div>
                    </div>
                    <DonutLegend data={regimeData} total={clientes.length} />
                  </div>
                </ChartShell>

                <ChartShell title="Potencial de Recuperação" subtitle="Estimativa por categoria tributária" icon="◕" accent="#16A34A" onClick={()=>setPainelDetalhe({tipo:'potencial',title:'Potencial de recuperação',subtitle:'Composição do valor estimado por categoria e cliente.',accent:'#EAB308',icon:'R$'})}>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'145px minmax(0,1fr)',alignItems:'center',gap:12,minHeight:190}}>
                    <div style={{height:165,position:'relative'}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={potencialChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={72} paddingAngle={2} cornerRadius={6} stroke="none">{potencialChartData.map((entry,i)=><Cell key={i} fill={entry.color} />)}</Pie><Tooltip formatter={(v,n)=>[fmtR(v),n]} contentStyle={{borderRadius:12,border:`1px solid ${C.border}`,fontSize:11,boxShadow:'0 10px 26px rgba(15,23,42,.10)'}} /></PieChart></ResponsiveContainer><div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',pointerEvents:'none'}}><div style={{textAlign:'center',maxWidth:100}}><div style={{fontSize:13,fontWeight:900,color:'#059669',lineHeight:1.2}}>{fmtR(totalGeral)}</div><div style={{fontSize:9.5,color:C.muted,marginTop:5,fontWeight:700}}>POTENCIAL</div></div></div></div>
                    <DonutLegend data={potencialData} total={totalGeral} money />
                  </div>
                </ChartShell>

                <ChartShell title="Evolução de Clientes" subtitle="Cadastros nos últimos 6 meses" icon="▥" accent="#3B82F6" onClick={()=>setPainelDetalhe({tipo:'evolucao',title:'Evolução de clientes',subtitle:'Cadastros realizados nos últimos seis meses.',accent:'#3B82F6',icon:'▥'})} right={<span style={{fontSize:9.5,color:C.muted,background:'#F8FAFC',border:`1px solid ${C.border}`,borderRadius:8,padding:'5px 7px'}}>6 meses</span>}>
                  <div style={{height:190,width:'100%'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={mesesEvolucao} margin={{top:10,right:3,left:-23,bottom:0}}><CartesianGrid stroke="#EEF2F7" vertical={false} /><XAxis dataKey="mes" tick={{fontSize:10,fill:'#94A3B8',fontWeight:600}} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{fontSize:9.5,fill:'#94A3B8'}} axisLine={false} tickLine={false} /><Tooltip cursor={{fill:'#F8FAFC'}} contentStyle={{borderRadius:12,border:`1px solid ${C.border}`,fontSize:11,boxShadow:'0 10px 26px rgba(15,23,42,.10)'}} formatter={(v)=>[v,'Clientes']} /><Bar dataKey="clientes" radius={[8,8,2,2]} maxBarSize={30}>{mesesEvolucao.map((_,i)=><Cell key={i} fill={i===mesesEvolucao.length-1?'#F97316':'#3B82F6'} />)}</Bar></BarChart></ResponsiveContainer></div>
                </ChartShell>
              </div>

              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:14}}>
                <div onClick={()=>navigateTo('prospeccao')} style={{background:'#FFFFFF',border:'1px solid #E6EDF5',borderRadius:18,padding:'15px 17px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,boxShadow:'0 8px 22px rgba(15,23,42,.04)',cursor:'pointer'}}><div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}><div style={{width:42,height:42,borderRadius:13,display:'grid',placeItems:'center',background:'#FFF7ED',color:'#EA580C',fontSize:19,fontWeight:900,border:'1px solid #FFEDD5'}}>↗</div><div><div style={{fontSize:13.5,fontWeight:900,color:C.text}}>CRM Comercial</div><div style={{fontSize:10.8,color:C.muted,marginTop:3}}>Cockpit comercial e Kanban.</div></div></div><span style={{padding:'7px 11px',borderRadius:9,background:'#F8FAFC',border:'1px solid #E2E8F0',color:C.text,fontSize:10.5,fontWeight:800}}>Abrir →</span></div>
                <div onClick={()=>navigateTo('mensagens')} style={{background:'#FFFFFF',border:'1px solid #E6EDF5',borderRadius:18,padding:'15px 17px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,boxShadow:'0 8px 22px rgba(15,23,42,.04)',cursor:'pointer'}}><div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}><div style={{width:42,height:42,borderRadius:13,display:'grid',placeItems:'center',background:'#EFF6FF',color:'#1D4ED8',fontSize:18,fontWeight:900,border:'1px solid #DBEAFE'}}>•••</div><div><div style={{fontSize:13.5,fontWeight:900,color:C.text}}>Comunicação</div><div style={{fontSize:10.8,color:C.muted,marginTop:3}}>Templates e ações para WhatsApp.</div></div></div><span style={{padding:'7px 11px',borderRadius:9,background:'#F8FAFC',border:'1px solid #E2E8F0',color:C.text,fontSize:10.5,fontWeight:800}}>Abrir →</span></div>
              </div>

              {clientes.length===0 ? (
                <div style={{background:C.white,borderRadius:18,border:'1px solid #E6EDF5',padding:36,textAlign:'center',boxShadow:'0 10px 28px rgba(15,23,42,.04)'}}><div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:8}}>Nenhum cliente ainda</div><button onClick={()=>navigateTo('clientes',1)} style={btnPrimary}>+ Cadastrar primeiro cliente</button></div>
              ) : (
                <div style={{background:C.white,borderRadius:20,border:'1px solid #E6EDF5',overflow:'hidden',boxShadow:'0 10px 28px rgba(15,23,42,.045)'}}>
                  <div style={{padding:'14px 16px',borderBottom:'1px solid #E6EDF5',display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(180deg,#FFFFFF,#FCFDFE)'}}><div><div style={{fontSize:13.5,fontWeight:900,color:C.text}}>Clientes</div><div style={{fontSize:9.8,color:C.muted,marginTop:2}}>Clique em uma linha para abrir o resumo do cliente.</div></div><button onClick={()=>navigateTo('clientes',0)} style={{background:'#EFF6FF',border:'1px solid #DBEAFE',color:C.blue,fontSize:10.5,fontWeight:800,cursor:'pointer',padding:'6px 9px',borderRadius:8}}>Ver todos →</button></div>
                  <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:11.5}}><thead><tr style={{background:'#F8FAFC'}}>{['Razão Social','CNPJ','Regime','Potencial','Ações'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9.5,fontWeight:900,color:C.muted,borderBottom:'1px solid #E6EDF5',textTransform:'uppercase',letterSpacing:.6,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{clientes.slice(0,6).map(c=>{const ee=entradas[c.id]||[];const tot=ee.reduce((s,e)=>s+(Number(e.credito)||0),0);return(
                    <tr key={c.id} onClick={()=>setPainelDetalhe({tipo:'cliente',cliente:c,title:c.razao_social,subtitle:'Resumo cadastral e tributário do cliente.',accent:'#16A34A',icon:'◎'})} style={{borderBottom:'1px solid #EEF2F7',cursor:'pointer'}}><td style={{padding:'12px',fontWeight:800,color:C.text,whiteSpace:'nowrap'}}>{c.razao_social}<div style={{fontSize:9.5,color:C.muted,fontWeight:500,marginTop:3}}>Clique para detalhar</div></td><td style={{padding:'12px',color:C.muted,fontSize:10.5,whiteSpace:'nowrap'}}>{c.cnpj}</td><td style={{padding:'12px'}}>{badge(c.regime)}</td><td style={{padding:'12px',color:'#059669',fontWeight:900,whiteSpace:'nowrap'}}>{fmtR(tot)}</td><td style={{padding:'12px'}}><button onClick={e=>{e.stopPropagation();setActiveId(c.id.toString());navigateTo('analise',0)}} style={{padding:'6px 10px',fontSize:10.5,borderRadius:8,border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1D4ED8',fontWeight:900,cursor:'pointer'}}>Analisar →</button></td></tr>
                  )})}</tbody></table></div>
                </div>
              )}
            </>}

            {module === 'manual_operacao' && <ManualOperacao />}
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
                      <div style={{fontSize:18,fontWeight:700,color:C.green}}>{fmtR(tot)}</div>
                      <div style={{fontSize:10,color:C.muted,marginBottom:8}}>potencial</div>
                      <div style={{display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                        <button onClick={()=>{setNovoCliente({...c});setModoNovoCliente('manual');setActiveTab(1)}} style={{...btnOutline,padding:'4px 10px',fontSize:11}}>Editar</button>
						<button
                        onClick={() => {
                        setActiveId(c.id.toString())
                        setClienteProntuario(c)
						setOrigemProntuario('clientes')
                        setModule('prontuario_empresa')
                        setActiveTab(0)
                        setSidebarAtiva('clientes:0')
                        }}
                        style={{
                        ...btnOutline,
                        padding: '4px 10px',
                        fontSize: 11,
                        }}
                        >
                        Prontuário
                        </button>
                        <button onClick={()=>{setActiveId(c.id.toString());navigateTo('analise',0)}} style={{...btnPrimary,padding:'4px 10px',fontSize:11}}>Analisar</button>
                        <button onClick={()=>excluirCliente(c)} style={btnDanger}>Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </>}

            {module==='clientes' && activeTab===1 && !modoNovoCliente && <>
              <button onClick={()=>navigateTo('clientes',0)} style={btnVoltar}>Voltar</button>
              <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text,marginBottom:8}}>Novo cliente</div>
              <div style={{fontSize:13,color:C.muted,marginBottom:24}}>Como você quer cadastrar este cliente?</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,maxWidth:720}}>
                <div onClick={()=>{setNovoCliente({...CLIENTE_VAZIO});setModoNovoCliente('manual')}}
                  style={{background:C.white,borderRadius:12,border:`1.5px solid ${C.border}`,padding:24,cursor:'pointer'}}>
                  <div style={{fontSize:32,marginBottom:12}}>✍️</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>Cadastro Manual</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Preencha os dados do cliente diretamente no formulário.</div>
                </div>
                <div onClick={()=>{setNovoCliente({...CLIENTE_VAZIO});setModoNovoCliente('xml')}}
                  style={{background:C.white,borderRadius:12,border:`1.5px solid ${C.border}`,padding:24,cursor:'pointer'}}>
                  <div style={{fontSize:32,marginBottom:12}}>📄</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>Cadastro com XML</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Importe um XML de NF-e e o sistema preenche automaticamente.</div>
                </div>
              </div>
            </>}

            {module==='clientes' && activeTab===1 && novoCliente && modoNovoCliente && <>
              <button onClick={()=>{ if(novoCliente.id){ navigateTo('clientes',0) } else { setModoNovoCliente(null) } }} style={btnVoltar}>Voltar</button>
              <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text,marginBottom:20}}>{novoCliente.id?'Editar cliente':'Novo cliente'}</div>
              {!novoCliente.id && modoNovoCliente==='xml' && (
                <div style={{background:'#eff6ff',border:'2px dashed #bfdbfe',borderRadius:12,padding:'14px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e40af',marginBottom:4}}>Cadastro com XML</div>
                    <div style={{fontSize:12,color:C.muted}}>Importe um XML para preencher automaticamente</div>
                  </div>
                  <label style={{padding:'8px 16px',background:'#1e40af',color:'#fff',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                    Importar XML
                    <input type="file" accept=".xml" style={{display:'none'}} onChange={async e=>{const file=e.target.files[0];if(!file)return;await preencherViaXML(file);e.target.value=''}} />
                  </label>
                </div>
              )}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.blue,marginBottom:14}}>Identificação</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14}}>
                  {[['Razao Social *','razao_social'],['Nome Fantasia','nome_fantasia'],['CNPJ *','cnpj'],['CNAE Principal','cnae_principal'],['CNAEs Secundarios','cnaes_secundarios'],['Inscricao Estadual','inscricao_estadual'],['Inscricao Municipal','inscricao_municipal'],['Municipio','municipio'],['UF','uf']].map(([lb,k])=>(
                    <div key={k} style={{display:'flex',flexDirection:'column',gap:5}}>
                      <label style={{fontSize:12,fontWeight:500,color:C.text}}>{lb}</label>
                      <input value={novoCliente[k]||''} onChange={e=>setNovoCliente({...novoCliente,[k]:applyMask(k,e.target.value)})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}} />
                    </div>
                  ))}
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    <label style={{fontSize:12,fontWeight:500,color:C.text}}>Regime tributario *</label>
                    <select value={novoCliente.regime||'Simples Nacional'} onChange={e=>setNovoCliente({...novoCliente,regime:e.target.value})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}}>
                      <option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.blue,marginBottom:14}}>Período de análise</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14}}>
                  {[['Competencia inicial','competencia_inicio','month'],['Competencia final','competencia_fim','month'],['Responsavel contabil','responsavel_contabil','text'],['Observacoes','observacoes','text']].map(([lb,k,tp])=>(
                    <div key={k} style={{display:'flex',flexDirection:'column',gap:5}}>
                      <label style={{fontSize:12,fontWeight:500,color:C.text}}>{lb}</label>
                      <input type={tp} value={novoCliente[k]||''} onChange={e=>setNovoCliente({...novoCliente,[k]:e.target.value})} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={salvarCliente} disabled={salvando} style={btnPrimary}>{salvando?'Salvando...':'Salvar'}</button>
                <button onClick={()=>{ if(novoCliente.id){ navigateTo('clientes',0) } else { setModoNovoCliente(null) } }} style={btnOutline}>Cancelar</button>
              </div>
            </>}

            {module==='clientes' && activeTab===2 && <>
              <button onClick={()=>navigateTo('clientes',0)} style={btnVoltar}>Voltar</button>
              <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text,marginBottom:4}}>Checklist de Documentos</div>
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
              <button onClick={()=>navigateTo('analise',0)} style={btnOutline}>Ir para diagnóstico</button>
            </>}
			
			{module === 'prontuario_empresa' && clienteProntuario && (
  <ProntuarioEmpresa
    cliente={clienteProntuario}
    onVoltar={() => {
  setClienteProntuario(null)

  if (origemProntuario === 'central_consultas') {
    setModule('central_consultas')
    setActiveTab(0)
    setSidebarAtiva('central_consultas:0')
  } else {
    setModule('clientes')
    setActiveTab(0)
    setSidebarAtiva('clientes:0')
  }
}}
    onEditarCliente={(cliente) => {
      setNovoCliente({ ...cliente })
      setModoNovoCliente('manual')
      setModule('clientes')
      setActiveTab(1)
      setSidebarAtiva('clientes:1')
    }}
  />
)}

            {module==='gestao_empresas' && (
              <GestaoEmpresas onSelecionarCliente={(emp)=>{ setActiveId(emp.id); navigateTo('diagnostico',0) }} />
            )}
            {module==='grupo_empresas' && <GrupoEmpresas />}

            {module==='scanner' && (
              <div style={{maxWidth:700,margin:'0 auto'}}>
                <div style={{background:'#0B1F4D',borderRadius:14,padding:'20px 24px',marginBottom:20,color:'#fff'}}>
                  <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:1.5,marginBottom:4}}>e-FISCALTRIBE — DIAGNÓSTICO TRIBUTÁRIO</div>
                  <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>🔍 Scanner Tributário</div>
                  <div style={{fontSize:13,color:'#93c5fd'}}>Varredura geral — identifica oportunidades de recuperação para o cliente ativo.</div>
                </div>
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:32,textAlign:'center'}}>
                  <div style={{fontSize:48,marginBottom:16}}>🔍</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>Módulo em construção</div>
                  <div style={{fontSize:13,color:C.muted,marginBottom:20}}>O Scanner Tributário fará uma varredura automática nos XMLs importados e identificará todas as oportunidades disponíveis.</div>
                  <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                    <button onClick={()=>navigateTo('exclusao_icms',0)} style={btnOutline}>Tema 69 — Exclusão ICMS</button>
                    <button onClick={()=>navigateTo('recuperacao_monofasico',0)} style={btnOutline}>Monofásicos PIS/COFINS</button>
                    <button onClick={()=>navigateTo('divida',0)} style={btnOutline}>Dívida Ativa</button>
                  </div>
                </div>
              </div>
            )}

            {module==='diagnostico' && (
            <DiagnosticoTributario
            clienteId={activeId}
            cliente={active}
            onNavegar={navigateTo}
            teseAtiva={activeTab===1?'monofasicos':activeTab===2?'icms_tema69':activeTab===3?'icms_st':activeTab===4?'retencoes':activeTab===5?'pgdas':'importar'}
            onMudarTese={(tese)=>{const mapa={importar:0,monofasicos:1,icms_tema69:2,icms_st:3,retencoes:4,pgdas:5};setActiveTab(mapa[tese]??0)}}
            />
            )}
            {module==='exclusao_icms' && <ExclusaoICMS cliente={active} />}
            {module==='recuperacao_monofasico' && <PainelRecuperacao />}
            {module==='icms_st_rec' && (
            <AbaICMSST cliente={active} regime={active?.regime} />
            )}
            {module==='divida' && (
              <DiagnosticoDividaAtiva
                active={active}
                cdaParaDiagnostico={cdaParaDiagnostico}
                onCdaConsumed={() => setCdaParaDiagnostico(null)}
                onImportarCDA={() => setMostrarImportarCDA(true)}
              />
            )}
            {mostrarImportarCDA && (
              <ImportarCDA
                active={active}
                onSalvo={()=>setMostrarImportarCDA(false)}
                onDiagnostico={({campos,clienteEfetivo})=>{ setCdaParaDiagnostico({campos,clienteEfetivo}); setMostrarImportarCDA(false) }}
                onVoltar={()=>setMostrarImportarCDA(false)}
              />
            )}

            {module==='monofasicos' && <AbaMonofasicos clienteId={activeId} cliente={active} regime={active?.regime} />}
            {module==='pgdas' && <AbaPGDAS cliente={active} regime={active?.regime} />}
            {module==='painel_simples' && <PainelSimples clienteId={activeId} cliente={active} />}
            {module==='dados_complementares' && (
              <DadosComplementares clienteId={activeId} cliente={active} onDadosSalvos={(dados)=>console.log('Dados salvos:',dados)} />
            )}
            {module==='classificacao_itens' && <ClassificacaoItens clienteId={activeId} cliente={active} />}
            {module==='apuracao_simples' && (
            apuracaoEspelho ? (
            <EspelhoRetificacaoPGDAS
            apuracao={apuracaoEspelho}
            onVoltar={fecharEspelho}
            versaoInicial={espelhoVersaoInicial}
            versoesExternas={espelhoVersoesExternas}
            modoConsulta={espelhoModoConsulta}
            />
            ) : (
            <ApuracaoSimples
            onGerarEspelho={abrirEspelhoDaApuracao}
            onAbrirEspelhoHistorico={abrirEspelhoDoHistorico}
            />
            )
            )}
			
{module === 'central_consultas' && (
  <CentralConsultas
    onAbrirProntuario={(cliente) => {
      if (!cliente) return
      setActiveId(cliente.id.toString())
      setClienteProntuario(cliente)
	  setOrigemProntuario('central_consultas')
      setModule('prontuario_empresa')
      setActiveTab(0)
      setSidebarAtiva('clientes:0')
    }}
    onAbrirOrigem={(tipo, registro, cliente) => {
      if (cliente?.id) {
        setActiveId(cliente.id.toString())
      }

      if (
        tipo === 'apuracoes' ||
        tipo === 'memorias' ||
        tipo === 'resultados' ||
        tipo === 'espelhos'
      ) {
        navigateTo('apuracao_simples', 0)
        return
      }

      if (tipo === 'pgdas') {
        navigateTo('pgdas', 0)
        return
      }

      if (tipo === 'diagnosticos') {
        navigateTo('monofasicos', 0)
      }
    }}
  />
)}

            {module==='recuperacao' && activeTab===0 && <GestaoRecuperacoes />}
            {module==='recuperacao' && activeTab===1 && <PerdComp />}

            {module==='sped' && <AuditorSPED cliente={active} onVoltar={()=>navigateTo('painel')} />}

            {module==='analise' && activeTab===0 && <>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:isMobile?18:22,fontWeight:700,color:C.text}}>Análise Fiscal</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{active?.razao_social} · {active?.regime}</div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>navigateTo('relatorios',0)} style={{...btnOutline,padding:'6px 12px',fontSize:12}}>Relatório</button>
                  <button onClick={()=>navigateTo('clientes',2)} style={{...btnOutline,padding:'6px 12px',fontSize:12}}>+ Dados</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {[[fmtR(totalPot),'Total potencial',C.green],[ents.filter(e=>e.risco==='baixo'&&e.credito>0).length,'Confirmados','#0D9488'],[ents.filter(e=>e.risco==='medio'&&e.credito>0).length,'Possiveis','#D97706'],[ents.filter(e=>e.risco==='alto'&&e.credito>0).length,'A validar',C.red]].map(([v,lb,vc],i)=>(
                  <div key={i} style={{background:C.white,borderRadius:12,padding:16,borderTop:`4px solid ${vc}`}}>
                    <div style={{fontSize:i===0?16:22,fontWeight:700,color:vc,marginBottom:4}}>{v}</div>
                    <div style={{fontSize:11,color:C.muted}}>{lb}</div>
                  </div>
                ))}
              </div>
              {ents.filter(e=>e.credito>0).length>0 ? (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr style={{background:C.bg}}>{['Competencia','Tributo','Credito','Risco'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.4,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                    <tbody>{ents.filter(e=>e.credito>0).map((e,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:'8px 12px',whiteSpace:'nowrap'}}>{e.competencia}</td>
                        <td style={{padding:'8px 12px'}}>{e.tributo}</td>
                        <td style={{padding:'8px 12px',fontWeight:600,color:C.green,whiteSpace:'nowrap'}}>{fmtR(e.credito)}</td>
                        <td style={{padding:'8px 12px'}}>{riskBadge(e.risco)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:32,textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Nenhuma oportunidade mapeada</div>
                  <button onClick={()=>navigateTo('clientes',2)} style={btnPrimary}>+ Adicionar dados fiscais</button>
                </div>
              )}
            </>}
            {module==='analise' && activeTab===1 && <AnaliseFiscal clienteAtivo={activeId} />}
            {module==='analise' && activeTab===2 && <TesesTributarias />}
            {module==='analise' && activeTab===3 && <Simuladores />}
            {module==='analise' && activeTab===4 && <>
              <div style={{background:'#0B1F4D',borderRadius:14,padding:isMobile?'16px 18px':'18px 24px',marginBottom:16,color:'#fff',boxSizing:'border-box'}}>
                <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:1.5,marginBottom:4}}>e-FISCALTRIBE — PLANEJAMENTO</div>
                <div style={{fontSize:isMobile?16:18,fontWeight:700,color:'#fff',marginBottom:4}}>Calculadoras Tributárias</div>
                <div style={{fontSize:13,color:'#93c5fd'}}>Estimativas rápidas para diagnóstico tributário.</div>
              </div>
              <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:`2px solid ${C.border}`,overflowX:'auto'}}>
                {[['fator-r','Fator R'],['das','DAS'],['regime','Regime'],['irpj','IRPJ'],['prescricao','Prescricao']].map(([id,lb])=>(
                  <div key={id} onClick={()=>{setCalcTab(id);setCalcResult('')}} style={{padding:'8px 14px',fontSize:12,fontWeight:calcTab===id?600:500,color:calcTab===id?C.blue:C.muted,cursor:'pointer',borderBottom:`2px solid ${calcTab===id?C.blue:'transparent'}`,marginBottom:-2,whiteSpace:'nowrap'}}>{lb}</div>
                ))}
              </div>
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:20,maxWidth:580}}>
                {calcTab==='fator-r'    && <><div style={{fontSize:14,fontWeight:600,color:C.blue,marginBottom:14}}>Fator R</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Folha 12 meses (R$)</label>{inp(cFolha,setCFolha,'Ex: 120000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Receita bruta 12 meses (R$)</label>{inp(cRb,setCRb,'Ex: 480000','number')}</div></div><button onClick={calcFatorR} style={btnPrimary}>Calcular</button></>}
                {calcTab==='das'        && <><div style={{fontSize:14,fontWeight:600,color:C.blue,marginBottom:14}}>DAS Simples Nacional</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>RBT12 (R$)</label>{inp(cRbt12,setCRbt12,'Ex: 720000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Receita do mes (R$)</label>{inp(cRmes,setCRmes,'Ex: 60000','number')}</div></div><button onClick={calcDAS} style={btnPrimary}>Calcular</button></>}
                {calcTab==='regime'     && <><div style={{fontSize:14,fontWeight:600,color:C.blue,marginBottom:14}}>Simulador de regime</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Faturamento anual (R$)</label>{inp(cFat,setCFat,'Ex: 1200000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Margem liquida (%)</label>{inp(cMarg,setCMarg,'Ex: 15','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Atividade</label>{sel(cAtv,setCAtv,[['comercio','Comercio'],['industria','Industria'],['servicos','Servicos']])}</div></div><button onClick={calcRegime} style={btnPrimary}>Simular</button></>}
                {calcTab==='irpj'       && <><div style={{fontSize:14,fontWeight:600,color:C.blue,marginBottom:14}}>IRPJ/CSLL</div><div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:14}}><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Receita bruta trimestral (R$)</label>{inp(cRbt,setCRbt,'Ex: 300000','number')}</div><div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Atividade</label>{sel(cAtv2,setCAtv2,[['8','Comercio/Industria (8%)'],['16','Transporte (16%)'],['32','Servicos (32%)']])}</div></div><button onClick={calcIRPJ} style={btnPrimary}>Calcular</button></>}
                {calcTab==='prescricao' && <><div style={{fontSize:14,fontWeight:600,color:C.blue,marginBottom:14}}>Prescricao</div><div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:5,color:C.text}}>Data de pagamento indevido</label><input type="date" value={cDtpag} onChange={e=>setCDtpag(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13}} /></div><button onClick={calcPrescricao} style={btnPrimary}>Calcular</button></>}
                {calcResult && <div style={{marginTop:16,background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8,padding:'14px',fontSize:13,color:'#166534',whiteSpace:'pre-line'}}>{calcResult}</div>}
              </div>
            </>}

            {module==='prazos' && activeTab===0 && <PrazosPrescricionais active={active} />}
            {module==='prazos' && activeTab===1 && <PrazosFiscais />}
            {module==='relatorios' && activeTab===0 && <Relatorio active={active} ents={ents} />}
            {module==='relatorios' && activeTab===1 && <ScoreFiscal />}
            {module==='inteligencia' && activeTab===0 && <CentralTributaria onVoltar={()=>navigateTo('painel')} />}
            {module==='inteligencia' && activeTab===1 && <PaginaReforma />}
            {module==='prospeccao' && <Prospeccao onVoltar={()=>navigateTo('painel')} />}
            {module==='mensagens' && <MensagensRapidas onVoltar={()=>navigateTo('painel')} />}
            {module==='admin' && <Admin onVoltar={()=>navigateTo('painel')} />}
            {module==='dev' && <Laboratorio onVoltar={()=>navigateTo('painel')} />}

          </div>
        </div>
      </div>

      <DashboardDetailModal detail={painelDetalhe} onClose={()=>setPainelDetalhe(null)}>
        {renderPainelDetalhe()}
      </DashboardDetailModal>
    </div>
  )
}