import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const fmtR    = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtComp = c => { if(!c) return '—'; const[a,m]=c.split('-'); const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${meses[parseInt(m)-1]}/${a}` }

function calcularPrazo(competencia) {
  const [a,m] = competencia.split('-')
  const limite = new Date(parseInt(a)+5, parseInt(m)-1, 1)
  const hoje   = new Date()
  const dias   = Math.round((limite - hoje) / (1000*60*60*24))
  return { limite, dias }
}

function semaforo(dias) {
  if (dias <= 0)   return { cor:'#7f1d1d', bg:'#fef2f2', borda:'#fca5a5', label:'PRESCRITO',    icon:'💀', urgencia:4 }
  if (dias <= 90)  return { cor:'#dc2626', bg:'#fff1f2', borda:'#fca5a5', label:'URGENTE',      icon:'🔴', urgencia:3 }
  if (dias <= 180) return { cor:'#ea580c', bg:'#fff7ed', borda:'#fdba74', label:'CRÍTICO',      icon:'🟠', urgencia:2 }
  if (dias <= 365) return { cor:'#d97706', bg:'#fffbeb', borda:'#fde68a', label:'ATENÇÃO',      icon:'🟡', urgencia:1 }
  return               { cor:'#16a34a', bg:'#f0fdf4', borda:'#86efac', label:'CONFORTÁVEL', icon:'🟢', urgencia:0 }
}

export default function PrazosPrescricionais({ active }) {
  const [entradas,  setEntradas]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState('todos')
  const [ordenacao, setOrdenacao] = useState('urgencia')

  useEffect(() => { if(active?.id) carregarEntradas() }, [active?.id])

  async function carregarEntradas() {
    setLoading(true)
    const { data } = await supabase.from('entradas').select('*').eq('cliente_id', active.id)
    setEntradas(data || [])
    setLoading(false)
  }

  const comCredito = entradas
    .filter(e => e.credito > 0 && e.competencia)
    .map(e => {
      const { dias, limite } = calcularPrazo(e.competencia)
      const sem = semaforo(dias)
      return { ...e, dias, limite, sem }
    })

  const filtradas = comCredito.filter(e => {
    if (filtro === 'criticos')    return e.dias <= 180
    if (filtro === 'atencao')     return e.dias > 180 && e.dias <= 365
    if (filtro === 'confortavel') return e.dias > 365
    if (filtro === 'prescritos')  return e.dias <= 0
    return true
  })

  const ordenadas = [...filtradas].sort((a,b) => {
    if (ordenacao === 'urgencia')    return a.dias - b.dias
    if (ordenacao === 'valor')       return (b.credito||0) - (a.credito||0)
    return a.competencia.localeCompare(b.competencia)
  })

  const prescritos   = comCredito.filter(e => e.dias <= 0)
  const urgentes     = comCredito.filter(e => e.dias > 0   && e.dias <= 90)
  const criticos     = comCredito.filter(e => e.dias > 90  && e.dias <= 180)
  const atencao      = comCredito.filter(e => e.dias > 180 && e.dias <= 365)
  const confortaveis = comCredito.filter(e => e.dias > 365)

  const totalEmRisco = [...prescritos,...urgentes,...criticos].reduce((s,e)=>s+(e.credito||0),0)
  const totalAtencao = atencao.reduce((s,e)=>s+(e.credito||0),0)
  const totalSeguro  = confortaveis.reduce((s,e)=>s+(e.credito||0),0)

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#64748b'}}>Carregando prazos...</div>

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0B1F4D,#163B8C)',borderRadius:16,padding:'28px 32px',marginBottom:24,color:'#fff'}}>
        <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — CONTROLE PRESCRICIONAL</div>
        <h2 style={{fontSize:24,fontWeight:900,margin:'0 0 8px',color:'#fff'}}>⏳ Controle Prescricional</h2>
        <div style={{fontSize:14,color:'#93c5fd'}}>{active?.razao_social} · Prazo de 5 anos contados do pagamento indevido (art. 168 CTN)</div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
        {[
          {label:'Prescritos',    valor:prescritos.length,   cor:'#7f1d1d',bg:'#fef2f2',borda:'#fca5a5',icon:'💀'},
          {label:'Urgentes ≤90d', valor:urgentes.length,    cor:'#dc2626',bg:'#fff1f2',borda:'#fca5a5',icon:'🔴'},
          {label:'Críticos ≤180d',valor:criticos.length,    cor:'#ea580c',bg:'#fff7ed',borda:'#fdba74',icon:'🟠'},
          {label:'Atenção ≤365d', valor:atencao.length,     cor:'#d97706',bg:'#fffbeb',borda:'#fde68a',icon:'🟡'},
          {label:'Confortáveis',  valor:confortaveis.length, cor:'#16a34a',bg:'#f0fdf4',borda:'#86efac',icon:'🟢'},
        ].map((k,i)=>(
          <div key={i} style={{background:k.bg,border:`2px solid ${k.borda}`,borderRadius:12,padding:'16px 12px',textAlign:'center',cursor:'pointer'}}
            onClick={()=>setFiltro(i===0?'prescritos':i<=2?'criticos':i===3?'atencao':'confortavel')}>
            <div style={{fontSize:20,marginBottom:4}}>{k.icon}</div>
            <div style={{fontSize:24,fontWeight:900,color:k.cor}}>{k.valor}</div>
            <div style={{fontSize:11,color:k.cor,fontWeight:600,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Valores em risco */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        {[
          {label:'Em risco (≤180 dias)',   valor:totalEmRisco,cor:'#dc2626',bg:'#fff1f2',borda:'#fca5a5'},
          {label:'Requer atenção (≤365d)', valor:totalAtencao,cor:'#d97706',bg:'#fffbeb',borda:'#fde68a'},
          {label:'Prazo confortável',      valor:totalSeguro, cor:'#16a34a',bg:'#f0fdf4',borda:'#86efac'},
        ].map((k,i)=>(
          <div key={i} style={{background:k.bg,border:`2px solid ${k.borda}`,borderRadius:12,padding:'16px 20px'}}>
            <div style={{fontSize:11,color:k.cor,fontWeight:700,marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.cor}}>{fmtR(k.valor)}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[
            {id:'todos',       label:'Todos'},
            {id:'prescritos',  label:'💀 Prescritos'},
            {id:'criticos',    label:'🔴 Críticos (≤180d)'},
            {id:'atencao',     label:'🟡 Atenção (≤365d)'},
            {id:'confortavel', label:'🟢 Confortáveis'},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFiltro(f.id)}
              style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`2px solid ${filtro===f.id?'#0B1F4D':'#e2e8f0'}`,background:filtro===f.id?'#0B1F4D':'#fff',color:filtro===f.id?'#fff':'#374151'}}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={ordenacao} onChange={e=>setOrdenacao(e.target.value)}
          style={{padding:'6px 12px',border:'2px solid #e2e8f0',borderRadius:8,fontSize:12,color:'#374151',background:'#fff'}}>
          <option value="urgencia">Ordenar: Mais urgente</option>
          <option value="valor">Ordenar: Maior valor</option>
          <option value="competencia">Ordenar: Competência</option>
        </select>
      </div>

      {/* Lista */}
      {ordenadas.length === 0 ? (
        <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',padding:48,textAlign:'center',color:'#94a3b8'}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{fontSize:16,fontWeight:600,color:'#374151'}}>Nenhum prazo encontrado para este filtro</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {ordenadas.map((e,i)=>{
            const {sem,dias,limite} = e
            const barWidth = Math.max(0,Math.min(100,(dias/(365*5))*100))
            return (
              <div key={i} style={{background:sem.bg,border:`2px solid ${sem.borda}`,borderRadius:14,overflow:'hidden'}}>
                <div style={{height:4,background:'#e2e8f0'}}>
                  <div style={{height:4,background:sem.cor,width:`${barWidth}%`,transition:'width 0.5s'}} />
                </div>
                <div style={{padding:'16px 20px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <span style={{background:sem.cor,color:'#fff',fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:99,letterSpacing:0.5}}>
                          {sem.icon} {sem.label}
                        </span>
                        <span style={{fontSize:13,fontWeight:700,color:'#0B1F4D'}}>{fmtComp(e.competencia)} — {e.tributo}</span>
                      </div>
                      {e.tipo_oportunidade && <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>{e.tipo_oportunidade}</div>}
                      <div style={{display:'flex',gap:20,fontSize:12,flexWrap:'wrap'}}>
                        <div><span style={{color:'#94a3b8',fontWeight:600}}>Competência: </span><span style={{color:'#1e293b',fontWeight:700}}>{fmtComp(e.competencia)}</span></div>
                        <div><span style={{color:'#94a3b8',fontWeight:600}}>Prescreve em: </span><span style={{color:sem.cor,fontWeight:800}}>{dias<=0?'PRESCRITO':`${dias} dias`}</span></div>
                        <div><span style={{color:'#94a3b8',fontWeight:600}}>Data limite: </span><span style={{color:'#1e293b',fontWeight:700}}>{limite.toLocaleDateString('pt-BR')}</span></div>
                      </div>
                      {dias>0&&dias<=90 && <div style={{marginTop:10,background:'#dc2626',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontWeight:700}}>⚡ AÇÃO IMEDIATA: Menos de 90 dias! Inicie o processo agora.</div>}
                      {dias>90&&dias<=180 && <div style={{marginTop:10,background:'#ea580c',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontWeight:600}}>⚠️ CRÍTICO: Prazo inferior a 6 meses. Priorize este crédito.</div>}
                      {dias<=0 && <div style={{marginTop:10,background:'#7f1d1d',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontWeight:700}}>💀 PRESCRITO em {limite.toLocaleDateString('pt-BR')} — crédito não pode mais ser recuperado.</div>}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>Valor envolvido</div>
                      <div style={{fontSize:22,fontWeight:900,color:sem.cor}}>{fmtR(e.credito)}</div>
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>risco: {e.risco}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Resumo */}
      {ordenadas.length > 0 && (
        <div style={{background:'linear-gradient(135deg,#0B1F4D,#163B8C)',borderRadius:14,padding:'20px 28px',marginTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',color:'#fff'}}>
          <div>
            <div style={{fontSize:13,color:'#7CC4FF',fontWeight:700,marginBottom:4}}>TOTAL EM MONITORAMENTO</div>
            <div style={{fontSize:12,color:'#93c5fd'}}>{comCredito.length} competência(s) com crédito identificado</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'#7CC4FF',marginBottom:2}}>Valor total</div>
            <div style={{fontSize:26,fontWeight:900,color:'#4ade80'}}>{fmtR(comCredito.reduce((s,e)=>s+(e.credito||0),0))}</div>
          </div>
        </div>
      )}
    </div>
  )
}