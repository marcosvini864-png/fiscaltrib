import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#E4E7EC', border:'#C8D0DC',
  text:'#1E293B', muted:'#64748B',
}

const STATUS_CORES = {
  'Em andamento': '#FEF9C3|#854D0E',
  'Concluída':    '#DCFCE7|#166534',
  'Arquivada':    '#F1F5F9|#475569',
  'Urgente':      '#FEE2E2|#991B1B',
}

const TIPOS = ['Todos','Dívida Ativa','Análise Fiscal','Recuperação de Créditos','Prescrição','Outros']
const STATUS = ['Todos','Em andamento','Concluída','Arquivada','Urgente']

export default function MinhasAnalises({ onAbrirCliente }) {
  const [analises,    setAnalises]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [busca,       setBusca]       = useState('')
  const [filtroTipo,  setFiltroTipo]  = useState('Todos')
  const [filtroStatus,setFiltroStatus]= useState('Todos')
  const [ordenar,     setOrdenar]     = useState('data_desc')
  const [excluindo,   setExcluindo]   = useState(null)

  useEffect(()=>{ carregar() },[])

  async function carregar() {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('analises').select('*').eq('usuario_id', user.id)
      if(data) setAnalises(data)
    } catch(e){}
    setLoading(false)
  }

  async function excluir(id) {
    if(!window.confirm('Excluir esta análise permanentemente?')) return
    setExcluindo(id)
    await supabase.from('analises').delete().eq('id', id)
    setAnalises(prev => prev.filter(a => a.id !== id))
    setExcluindo(null)
  }

  async function duplicar(analise) {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const copia = {
        usuario_id: user.id,
        cliente_id: analise.cliente_id,
        razao_social: analise.razao_social + ' (cópia)',
        cnpj: analise.cnpj,
        tipo_analise: analise.tipo_analise,
        status: 'Em andamento',
        numero_cda: analise.numero_cda,
        numero_processo: analise.numero_processo,
        dados: analise.dados,
        versoes: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data } = await supabase.from('analises').insert([copia]).select()
      if(data?.[0]) setAnalises(prev => [data[0], ...prev])
      alert('✅ Análise duplicada com sucesso!')
    } catch(e) { alert('Erro ao duplicar: ' + e.message) }
  }

  async function atualizarStatus(id, status) {
    await supabase.from('analises').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setAnalises(prev => prev.map(a => a.id===id ? {...a, status} : a))
  }

  const filtradas = analises
    .filter(a => {
      const termo = busca.toLowerCase()
      if(termo && !( (a.razao_social||'').toLowerCase().includes(termo) || (a.cnpj||'').includes(termo) || (a.numero_cda||'').toLowerCase().includes(termo) || (a.numero_processo||'').toLowerCase().includes(termo) )) return false
      if(filtroTipo!=='Todos' && a.tipo_analise!==filtroTipo) return false
      if(filtroStatus!=='Todos' && a.status!==filtroStatus) return false
      return true
    })
    .sort((a,b) => {
      if(ordenar==='data_desc') return new Date(b.created_at)-new Date(a.created_at)
      if(ordenar==='data_asc')  return new Date(a.created_at)-new Date(b.created_at)
      if(ordenar==='nome')      return (a.razao_social||'').localeCompare(b.razao_social||'')
      return 0
    })

  const btnPrimary = {padding:'8px 16px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:500}
  const btnOutline = {padding:'8px 16px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:12,cursor:'pointer'}
  const btnDanger  = {padding:'4px 10px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:6,fontSize:12,cursor:'pointer'}

  const resumo = {
    total:      analises.length,
    andamento:  analises.filter(a=>a.status==='Em andamento').length,
    concluidas: analises.filter(a=>a.status==='Concluída').length,
    urgentes:   analises.filter(a=>a.status==='Urgente').length,
  }

  return (
    <div style={{maxWidth:1100,margin:'0 auto'}}>

      {/* HEADER */}
      <div style={{background:'linear-gradient(135deg,#0B1F4D,#163B8C)',borderRadius:16,padding:'28px 32px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — GESTÃO DE CASOS</div>
        <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,color:'#fff'}}>📂 Minhas Análises</h1>
        <p style={{fontSize:14,color:'#93c5fd',margin:0}}>Histórico completo · Gestão de casos tributários · Todas as análises preservadas</p>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          ['Total de análises', resumo.total,      '#2563EB'],
          ['Em andamento',      resumo.andamento,  '#D97706'],
          ['Concluídas',        resumo.concluidas, '#16A34A'],
          ['Urgentes',          resumo.urgentes,   '#DC2626'],
        ].map(([lb,val,cor])=>(
          <div key={lb} style={{background:C.white,borderRadius:12,padding:'16px 20px',border:`1px solid ${C.border}`,borderTop:`4px solid ${cor}`}}>
            <div style={{fontSize:24,fontWeight:700,color:cor}}>{val}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:4}}>{lb}</div>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 20px',marginBottom:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:10,alignItems:'center'}}>
          <input value={busca} onChange={e=>setBusca(e.target.value)}
            placeholder="🔍 Buscar por nome, CNPJ, CDA ou processo..."
            style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,width:'100%',boxSizing:'border-box'}}/>
          <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13}}>
            {TIPOS.map(t=><option key={t}>{t}</option>)}
          </select>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13}}>
            {STATUS.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={ordenar} onChange={e=>setOrdenar(e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13}}>
            <option value="data_desc">Mais recentes</option>
            <option value="data_asc">Mais antigas</option>
            <option value="nome">Nome A→Z</option>
          </select>
          <button onClick={()=>{setBusca('');setFiltroTipo('Todos');setFiltroStatus('Todos')}} style={{...btnOutline,whiteSpace:'nowrap'}}>Limpar</button>
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div style={{textAlign:'center',padding:48,color:C.muted}}>Carregando análises...</div>
      ) : filtradas.length===0 ? (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>📂</div>
          <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:8}}>{analises.length===0?'Nenhuma análise ainda':'Nenhum resultado encontrado'}</div>
          <div style={{fontSize:13,color:C.muted}}>{analises.length===0?'As análises realizadas nos módulos aparecerão aqui automaticamente.':'Tente ajustar os filtros de busca.'}</div>
        </div>
      ) : (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>
            {filtradas.length} análise(s) encontrada(s)
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'#F8FAFC'}}>
                {['Cliente','CNPJ','Tipo','Nº Processo / CDA','Status','Data','Versão','Ações'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(a=>{
                const [bg,cor] = (STATUS_CORES[a.status]||'#F1F5F9|#475569').split('|')
                const versoes = a.versoes||[]
                return (
                  <tr key={a.id} style={{borderBottom:`1px solid ${C.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{fontWeight:600,color:C.text}}>{a.razao_social||'—'}</div>
                    </td>
                    <td style={{padding:'12px 14px',color:C.muted,fontSize:12}}>{a.cnpj||'—'}</td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{a.tipo_analise||'—'}</span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12,color:C.muted}}>
                      {a.numero_processo&&<div>📋 {a.numero_processo}</div>}
                      {a.numero_cda&&<div>📄 {a.numero_cda}</div>}
                      {!a.numero_processo&&!a.numero_cda&&'—'}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <select value={a.status||'Em andamento'} onChange={e=>atualizarStatus(a.id,e.target.value)}
                        style={{background:bg,color:cor,border:`1px solid ${cor}22`,borderRadius:20,fontSize:11,fontWeight:600,padding:'3px 8px',cursor:'pointer'}}>
                        {STATUS.filter(s=>s!=='Todos').map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{padding:'12px 14px',color:C.muted,fontSize:12,whiteSpace:'nowrap'}}>
                      <div>{new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
                      {a.updated_at&&a.updated_at!==a.created_at&&<div style={{fontSize:10,color:C.muted}}>Atualizado: {new Date(a.updated_at).toLocaleDateString('pt-BR')}</div>}
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12,color:C.muted}}>
                      v{versoes.length+1}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button onClick={()=>duplicar(a)} style={{...btnOutline,padding:'4px 8px',fontSize:11}} title="Duplicar">📋</button>
                        <button onClick={()=>excluir(a.id)} disabled={excluindo===a.id} style={{...btnDanger,padding:'4px 8px',fontSize:11}} title="Excluir">🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}