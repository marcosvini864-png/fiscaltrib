import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#E4E7EC', border:'#C8D0DC',
  text:'#1E293B', muted:'#64748B',
}

const fmtR = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

const CDA_VAZIA = { numero:'', data_constituicao:'', data_inscricao:'', valor:'', tributo:'', situacao:'Ativa' }

const MODALIDADES = [
  { key:'transacao_excepcional', label:'Transação Excepcional', desc:'Descontos de até 100% em multas, juros e encargos para contribuintes em situação de insuficiência de recursos.', desconto_multa:[50,100], desconto_juros:[50,100], entrada_min:0, parcelas_max:60, elegibilidade:'Comprovação de insuficiência de recursos (CAPAG D ou equivalente).' },
  { key:'transacao_individual', label:'Transação Individual', desc:'Negociação caso a caso com a PGFN para dívidas acima de R$ 10 milhões.', desconto_multa:[0,50], desconto_juros:[0,50], entrada_min:5, parcelas_max:84, elegibilidade:'Dívida ativa superior a R$ 10 milhões.' },
  { key:'transacao_edital', label:'Transação por Edital', desc:'Adesão a editais periódicos da PGFN com condições pré-estabelecidas.', desconto_multa:[0,50], desconto_juros:[0,50], entrada_min:5, parcelas_max:60, elegibilidade:'Dívida inscrita há mais de 1 ano, sem garantia integral.' },
  { key:'prdi', label:'PRDI', desc:'Programa de Regularização de Devedores Inscritos — condições especiais para contribuintes em recuperação judicial.', desconto_multa:[50,70], desconto_juros:[50,70], entrada_min:0, parcelas_max:84, elegibilidade:'Empresa em processo de recuperação judicial.' },
  { key:'parcelamento_ordinario', label:'Parcelamento Ordinário', desc:'Parcelamento em até 60 meses sem desconto sobre o valor principal.', desconto_multa:[0,0], desconto_juros:[0,0], entrada_min:0, parcelas_max:60, elegibilidade:'Qualquer contribuinte com dívida inscrita.' },
  { key:'njp', label:'Negócio Jurídico Processual', desc:'Acordo processual para execuções fiscais em curso, incluindo condições personalizadas.', desconto_multa:[0,40], desconto_juros:[0,40], entrada_min:10, parcelas_max:60, elegibilidade:'Execução fiscal em andamento com penhora ou garantia.' },
]

const TESES = [
  { id:'prescricao_quinquenal', label:'Prescrição quinquenal', risco:'baixo', desc:'Verificar se o crédito tributário foi constituído há mais de 5 anos sem ajuizamento da execução fiscal.', fundamento:'Art. 174 do CTN' },
  { id:'decadencia', label:'Decadência', risco:'baixo', desc:'Verificar se o lançamento ocorreu após 5 anos do fato gerador ou da notificação.', fundamento:'Art. 150 e 173 do CTN' },
  { id:'prescricao_intercorrente', label:'Prescrição intercorrente', risco:'medio', desc:'Verificar paralização do processo por mais de 5 anos sem impulso da Fazenda.', fundamento:'Art. 40 da Lei 6.830/80 — Súmula 314 STJ' },
  { id:'vicio_formal_cda', label:'Vício formal na CDA', risco:'medio', desc:'Verificar preenchimento incorreto, ausência de fundamentação legal ou irregularidades na inscrição.', fundamento:'Art. 202 do CTN — Art. 2º §5º da Lei 6.830/80' },
  { id:'multa_qualificada', label:'Redução de multa qualificada', risco:'medio', desc:'Questionar multas acima de 100% do tributo como confiscatórias.', fundamento:'Art. 150, IV CF — Súmula 833 STF' },
]

function ScoreDividaAtiva({ score }) {
  const cor = score >= 70 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626'
  const label = score >= 70 ? 'Alto potencial de regularização' : score >= 40 ? 'Potencial moderado' : 'Situação crítica'
  return (
    <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px'}}>
      <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:12,textTransform:'uppercase',letterSpacing:1}}>Score da Dívida Ativa</div>
      <div style={{display:'flex',alignItems:'center',gap:20}}>
        <div style={{position:'relative',width:80,height:80,flexShrink:0}}>
          <svg viewBox="0 0 80 80" style={{width:80,height:80,transform:'rotate(-90deg)'}}>
            <circle cx="40" cy="40" r="32" fill="none" stroke={C.border} strokeWidth="8"/>
            <circle cx="40" cy="40" r="32" fill="none" stroke={cor} strokeWidth="8" strokeDasharray={`${score*2.01} 201`} strokeLinecap="round"/>
          </svg>
          <div style={{position:'absolute',top:0,left:0,width:80,height:80,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:cor}}>{score}</div>
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:cor,marginBottom:4}}>{label}</div>
          <div style={{fontSize:12,color:C.muted}}>Baseado em risco jurídico, situação processual e potencial de negociação.</div>
        </div>
      </div>
    </div>
  )
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

export default function DiagnosticoDividaAtiva({ active }) {
  const [tela, setTela] = useState('historico') // 'historico' | 'form'
  const [aba, setAba] = useState(0)
  const [historico, setHistorico] = useState([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [registroId, setRegistroId] = useState(null)

  const [dados, setDados] = useState({
    cnpj: active?.cnpj || '',
    valor_total: '',
    orgao_credor: 'PGFN',
    processo_execucao: '',
    possui_parcelamento: false,
    possui_transacao_anterior: false,
    possui_garantia: false,
    possui_penhora: false,
    possui_bloqueio: false,
    possui_embargos: false,
    observacoes: '',
  })

  const [cdas, setCdas] = useState([{ ...CDA_VAZIA }])
  const [diagnostico, setDiagnostico] = useState(null)
  const [analisando, setAnalisando] = useState(false)
  const [sim, setSim] = useState({ valor:'', modalidade:'transacao_edital', desconto_multa:50, desconto_juros:50, parcelas:60, entrada_pct:5, multa_pct:20, juros_pct:30 })
  const [simResult, setSimResult] = useState(null)

  useEffect(() => { carregarHistorico() }, [active])

  async function carregarHistorico() {
    setLoadingHist(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      let query = supabase.from('divida_ativa').select('*').eq('usuario_id', user.id).order('created_at', { ascending: false })
      if (active?.id) query = query.eq('cliente_id', active.id)
      const { data } = await query
      if (data) setHistorico(data)
    } catch(e) {}
    setLoadingHist(false)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const payload = {
        usuario_id: user.id,
        cliente_id: active?.id || null,
        razao_social: active?.razao_social || '',
        cnpj: dados.cnpj,
        valor_total: dados.valor_total,
        orgao_credor: dados.orgao_credor,
        processo_execucao: dados.processo_execucao,
        possui_parcelamento: dados.possui_parcelamento,
        possui_transacao_anterior: dados.possui_transacao_anterior,
        possui_garantia: dados.possui_garantia,
        possui_penhora: dados.possui_penhora,
        possui_bloqueio: dados.possui_bloqueio,
        possui_embargos: dados.possui_embargos,
        observacoes: dados.observacoes,
        cdas: cdas,
        diagnostico: diagnostico,
        score: diagnostico?.score || null,
        updated_at: new Date().toISOString(),
      }
      if (registroId) {
        await supabase.from('divida_ativa').update(payload).eq('id', registroId)
      } else {
        const { data } = await supabase.from('divida_ativa').insert([payload]).select()
        if (data?.[0]) setRegistroId(data[0].id)
      }
      await carregarHistorico()
      alert('✅ Diagnóstico salvo com sucesso!')
    } catch(e) { alert('Erro ao salvar: ' + e.message) }
    setSalvando(false)
  }

  async function excluirRegistro(id) {
    if (!window.confirm('Excluir este diagnóstico?')) return
    await supabase.from('divida_ativa').delete().eq('id', id)
    await carregarHistorico()
  }

  function abrirRegistro(reg) {
    setDados({
      cnpj: reg.cnpj || '',
      valor_total: reg.valor_total || '',
      orgao_credor: reg.orgao_credor || 'PGFN',
      processo_execucao: reg.processo_execucao || '',
      possui_parcelamento: reg.possui_parcelamento || false,
      possui_transacao_anterior: reg.possui_transacao_anterior || false,
      possui_garantia: reg.possui_garantia || false,
      possui_penhora: reg.possui_penhora || false,
      possui_bloqueio: reg.possui_bloqueio || false,
      possui_embargos: reg.possui_embargos || false,
      observacoes: reg.observacoes || '',
    })
    setCdas(reg.cdas?.length > 0 ? reg.cdas : [{ ...CDA_VAZIA }])
    setDiagnostico(reg.diagnostico || null)
    setRegistroId(reg.id)
    setAba(0)
    setTela('form')
  }

  function novoRegistro() {
    setDados({ cnpj:active?.cnpj||'', valor_total:'', orgao_credor:'PGFN', processo_execucao:'', possui_parcelamento:false, possui_transacao_anterior:false, possui_garantia:false, possui_penhora:false, possui_bloqueio:false, possui_embargos:false, observacoes:'' })
    setCdas([{ ...CDA_VAZIA }])
    setDiagnostico(null)
    setRegistroId(null)
    setAba(0)
    setTela('form')
  }

  const btnPrimary = {padding:'10px 20px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}
  const btnOutline = {padding:'10px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}
  const btnDanger  = {padding:'4px 10px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:6,fontSize:12,cursor:'pointer'}

  const inp = (k,ph,tp='text') => {
    const handleChange = e => {
      let v = e.target.value
      if(k==='cnpj'){
        v = v.replace(/\D/g,'').slice(0,14)
        v = v.replace(/^(\d{2})(\d)/,'$1.$2')
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
        v = v.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3/$4')
        v = v.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/,'$1.$2.$3/$4-$5')
      }
      if(k==='processo_execucao'){
        v = v.replace(/\D/g,'').slice(0,20)
        v = v.replace(/^(\d{7})(\d)/,'$1-$2')
        v = v.replace(/^(\d{7})-(\d{2})(\d)/,'$1-$2.$3')
        v = v.replace(/^(\d{7})-(\d{2})\.(\d{4})(\d)/,'$1-$2.$3.$4')
        v = v.replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d{1})(\d)/,'$1-$2.$3.$4.$5')
      }
      setDados({...dados,[k]:v})
    }
    const handleBlur = e => {
      if(k==='valor_total'){
        const raw = e.target.value.replace(/\./g,'').replace(',','.')
        const n = parseFloat(raw)||0
        if(n>0) setDados(d=>({...d,valor_total:n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}))
      }
    }
    return <input value={dados[k]} onChange={handleChange} onBlur={handleBlur} placeholder={ph} type={tp} style={{padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}}/>
  }

  const chk = (k,lb) => (
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:C.text,cursor:'pointer'}}>
      <input type="checkbox" checked={dados[k]} onChange={e=>setDados({...dados,[k]:e.target.checked})} style={{accentColor:C.navy,width:15,height:15}}/>{lb}
    </label>
  )

  function addCDA() { setCdas([...cdas,{...CDA_VAZIA}]) }
  function removeCDA(i) { setCdas(cdas.filter((_,idx)=>idx!==i)) }
  function updateCDA(i,k,v) { const novo=[...cdas]; novo[i]={...novo[i],[k]:v}; setCdas(novo) }

  function calcularScore() {
    let score = 50
    const valor = parseFloat((dados.valor_total||'').replace(/\./g,'').replace(',','.'))||0
    const diasC = cdas[0]?.data_constituicao ? Math.floor((new Date()-new Date(cdas[0].data_constituicao))/(1000*60*60*24)) : 0
    const diasI = cdas[0]?.data_inscricao ? Math.floor((new Date()-new Date(cdas[0].data_inscricao))/(1000*60*60*24)) : 0
    if(diasC>1825) score+=20
    if(diasI>1825) score+=10
    if(!dados.possui_garantia) score+=10
    if(!dados.possui_penhora) score+=5
    if(dados.possui_embargos) score-=10
    if(valor<100000) score+=10
    else if(valor>10000000) score-=10
    return Math.min(100,Math.max(0,score))
  }

  function analisarDiagnostico() {
    setAnalisando(true)
    const valor = parseFloat((dados.valor_total||'').replace(/\./g,'').replace(',','.'))||0
    const diasC = cdas[0]?.data_constituicao ? Math.floor((new Date()-new Date(cdas[0].data_constituicao))/(1000*60*60*24)) : 0
    const diasI = cdas[0]?.data_inscricao ? Math.floor((new Date()-new Date(cdas[0].data_inscricao))/(1000*60*60*24)) : 0

    const teses = []
    if(diasC>1825) teses.push({...TESES.find(t=>t.id==='prescricao_quinquenal'),prioridade:'Alta'})
    if(diasI>1825) teses.push({...TESES.find(t=>t.id==='prescricao_intercorrente'),prioridade:'Alta'})
    teses.push({...TESES.find(t=>t.id==='decadencia'),prioridade:'Média'})
    teses.push({...TESES.find(t=>t.id==='vicio_formal_cda'),prioridade:'Média'})
    teses.push({...TESES.find(t=>t.id==='multa_qualificada'),prioridade:'Baixa'})

    const modalidades = []
    if(!dados.possui_garantia||!dados.possui_penhora) modalidades.push('transacao_edital')
    if(valor>10000000) modalidades.push('transacao_individual')
    modalidades.push('parcelamento_ordinario')
    if(dados.possui_penhora||dados.possui_embargos) modalidades.push('njp')

    const alertas = []
    if(diasC>1640) alertas.push({tipo:'danger',msg:'⚠️ Crédito constituído há mais de 4,5 anos — verificar prescrição com urgência.'})
    if(dados.possui_penhora) alertas.push({tipo:'danger',msg:'⚠️ Penhora ativa — risco de constrição de bens. Avaliar garantia alternativa.'})
    if(dados.possui_bloqueio) alertas.push({tipo:'danger',msg:'⚠️ Bloqueio BACENJUD ativo — solicitar substituição ou levantamento.'})
    if(!dados.possui_parcelamento&&valor>0) alertas.push({tipo:'warning',msg:'ℹ️ Nenhum parcelamento ativo — considere transação tributária.'})

    const planoAcao = []
    if(diasC>1640) planoAcao.push({prioridade:'🔴 Urgente',acao:'Analisar prescrição e decadência',beneficio:'Possível extinção do crédito',prazo:'Imediato'})
    if(dados.possui_penhora) planoAcao.push({prioridade:'🔴 Urgente',acao:'Avaliar substituição da penhora',beneficio:'Liberação de bens',prazo:'7 dias'})
    planoAcao.push({prioridade:'🟡 Importante',acao:'Verificar vícios formais da CDA',beneficio:'Possível nulidade da inscrição',prazo:'30 dias'})
    planoAcao.push({prioridade:'🟡 Importante',acao:'Simular transação tributária',beneficio:`Economia potencial de até ${fmtR(valor*0.5)}`,prazo:'15 dias'})
    planoAcao.push({prioridade:'🟢 Estratégico',acao:'Definir modalidade de regularização',beneficio:'Suspensão da exigibilidade',prazo:'30 dias'})

    setTimeout(()=>{
      setDiagnostico({teses,modalidades,alertas,planoAcao,score:calcularScore(),valor})
      setAnalisando(false)
      setAba(2)
    },1500)
  }

  function calcularSimulacao() {
    const valor = parseFloat(sim.valor)||0
    const multa = valor*(sim.multa_pct/100)
    const juros = valor*(sim.juros_pct/100)
    const descMulta = multa*(sim.desconto_multa/100)
    const descJuros = juros*(sim.desconto_juros/100)
    const totalDesconto = descMulta+descJuros
    const valorFinal = valor-totalDesconto
    const entrada = valorFinal*(sim.entrada_pct/100)
    const saldo = valorFinal-entrada
    const parcela = sim.parcelas>1?saldo/(sim.parcelas-1):saldo
    setSimResult({multa,juros,descMulta,descJuros,totalDesconto,valorFinal,entrada,parcela,economia:totalDesconto})
  }

  function gerarRelatorio() {
    if(!diagnostico){alert('Execute o diagnóstico antes de gerar o relatório.');return}
    const linhas = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║         FISCALTRIB — RELATÓRIO EXECUTIVO DÍVIDA ATIVA        ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',`Cliente: ${active?.razao_social||dados.cnpj}`,`CNPJ: ${dados.cnpj}`,`Data: ${new Date().toLocaleDateString('pt-BR')}`,
      '','─── RESUMO ────────────────────────────────────────────────────',
      `Valor total: ${dados.valor_total}`,`CDAs: ${cdas.length}`,`Score: ${diagnostico.score}/100`,`Órgão: ${dados.orgao_credor}`,
      '','─── CDAs ──────────────────────────────────────────────────────',
      ...cdas.map((c,i)=>`CDA ${i+1}: ${c.numero} | Constituição: ${c.data_constituicao} | Inscrição: ${c.data_inscricao} | Valor: ${c.valor} | Tributo: ${c.tributo} | Situação: ${c.situacao}`),
      '','─── ALERTAS ───────────────────────────────────────────────────',
      ...diagnostico.alertas.map(a=>`• ${a.msg}`),
      '','─── DIAGNÓSTICO ───────────────────────────────────────────────',
      ...diagnostico.teses.map(t=>`[${t.prioridade}] ${t.label} — ${t.fundamento}`),
      '','─── ESTRATÉGIAS ───────────────────────────────────────────────',
      ...diagnostico.modalidades.map(m=>{const mod=MODALIDADES.find(x=>x.key===m);return mod?`• ${mod.label}`:'' }),
      '','─── PLANO DE AÇÃO ─────────────────────────────────────────────',
      ...diagnostico.planoAcao.map(p=>`${p.prioridade} — ${p.acao} (${p.prazo})`),
      '','Gerado por FiscalTrib — fiscaltrib.com.br',
    ]
    const blob = new Blob([linhas.join('\n')],{type:'text/plain;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url;a.download=`Relatorio_DividaAtiva_${dados.cnpj||'cliente'}_${new Date().toISOString().slice(0,10)}.txt`
    a.click();URL.revokeObjectURL(url)
  }

  const ABAS = ['📋 Visão Geral','🔍 Dados da Dívida','🧠 Diagnóstico','⚡ Estratégias','📊 Simulador','📄 Relatório']

  // ── TELA HISTÓRICO ──
  if(tela==='historico') return (
    <div style={{maxWidth:960,margin:'0 auto'}}>
      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:16,padding:'28px 32px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — DIAGNÓSTICO</div>
        <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,color:'#fff'}}>⚖️ Diagnóstico da Dívida Ativa</h1>
        <p style={{fontSize:14,color:'#cbd5e1',margin:0}}>Análise inteligente · Estratégias de regularização · Simulador de transação tributária</p>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>📂 Diagnósticos salvos{active?` — ${active.razao_social}`:''}</div>
        <button onClick={novoRegistro} style={btnPrimary}>+ Novo diagnóstico</button>
      </div>
      {loadingHist ? (
        <div style={{textAlign:'center',padding:40,color:C.muted}}>Carregando...</div>
      ) : historico.length===0 ? (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>⚖️</div>
          <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:8}}>Nenhum diagnóstico ainda</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Clique em "Novo diagnóstico" para começar.</div>
          <button onClick={novoRegistro} style={btnPrimary}>+ Novo diagnóstico</button>
        </div>
      ) : (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'#F8FAFC'}}>
                {['Cliente','CNPJ','Valor Total','CDAs','Score','Data',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.map(reg=>(
                <tr key={reg.id} style={{borderBottom:`1px solid ${C.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 14px',fontWeight:600,color:C.text}}>{reg.razao_social||reg.cnpj}</td>
                  <td style={{padding:'12px 14px',color:C.muted,fontSize:12}}>{reg.cnpj}</td>
                  <td style={{padding:'12px 14px',color:'#DC2626',fontWeight:600}}>{reg.valor_total||'—'}</td>
                  <td style={{padding:'12px 14px',color:C.text}}>{reg.cdas?.length||0}</td>
                  <td style={{padding:'12px 14px'}}>
                    {reg.score ? <span style={{background:reg.score>=70?'#DCFCE7':reg.score>=40?'#FEF9C3':'#FEE2E2',color:reg.score>=70?'#166534':reg.score>=40?'#854D0E':'#991B1B',padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:700}}>{reg.score}/100</span> : '—'}
                  </td>
                  <td style={{padding:'12px 14px',color:C.muted,fontSize:12}}>{new Date(reg.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>abrirRegistro(reg)} style={{...btnOutline,padding:'4px 10px',fontSize:12}}>Abrir</button>
                      <button onClick={()=>excluirRegistro(reg.id)} style={btnDanger}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ── TELA FORMULÁRIO ──
  return (
    <div style={{maxWidth:960,margin:'0 auto'}}>
      {/* HEADER */}
      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:16,padding:'28px 32px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — DIAGNÓSTICO</div>
        <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,color:'#fff'}}>⚖️ Diagnóstico da Dívida Ativa</h1>
        <p style={{fontSize:14,color:'#cbd5e1',margin:0}}>Análise inteligente · Estratégias de regularização · Simulador de transação tributária</p>
        {active&&<div style={{marginTop:12,background:'rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 14px',display:'inline-flex',gap:16,fontSize:12,color:'#e2e8f0'}}>
          <span>👤 {active.razao_social}</span><span>·</span><span>{active.cnpj}</span><span>·</span><span>{active.regime}</span>
        </div>}
      </div>

      {/* BOTÕES TOPO */}
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <button onClick={()=>setTela('historico')} style={{...btnOutline,padding:'7px 16px',fontSize:13}}>← Voltar</button>
        <button onClick={salvar} disabled={salvando} style={{...btnPrimary,padding:'7px 16px',fontSize:13,opacity:salvando?0.7:1}}>
          {salvando?'💾 Salvando...':'💾 Salvar diagnóstico'}
        </button>
        {registroId && <span style={{fontSize:12,color:'#16A34A',alignSelf:'center'}}>✅ Salvo</span>}
      </div>

      <TabInterna tabs={ABAS} active={aba} onTab={setAba} />

      {/* ── ABA 0: VISÃO GERAL ── */}
      {aba===0&&<>
        {!diagnostico?(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'32px',textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:48,marginBottom:12}}>⚖️</div>
            <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:8}}>Nenhum diagnóstico realizado ainda</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Acesse a aba "Dados da Dívida" para inserir os dados e iniciar a análise.</div>
            <button onClick={()=>setAba(1)} style={btnPrimary}>Inserir dados da dívida →</button>
          </div>
        ):<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <ScoreDividaAtiva score={diagnostico.score}/>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px'}}>
              <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:12,textTransform:'uppercase',letterSpacing:1}}>Resumo</div>
              {[['Valor total',dados.valor_total||'—','#DC2626'],['CDAs',cdas.length,'#0B1F4D'],['Órgão',dados.orgao_credor,'#0B1F4D'],['Economia potencial',fmtR(diagnostico.valor*0.5),'#16A34A']].map(([lb,val,cor])=>(
                <div key={lb} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:13,color:C.muted}}>{lb}</span>
                  <span style={{fontSize:14,fontWeight:700,color:cor}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          {diagnostico.alertas.length>0&&<div style={{marginBottom:16}}>
            {diagnostico.alertas.map((a,i)=>(
              <div key={i} style={{background:a.tipo==='danger'?'#FEF2F2':'#FFFBEB',border:`1px solid ${a.tipo==='danger'?'#FECACA':'#FCD34D'}`,borderRadius:8,padding:'10px 16px',marginBottom:8,fontSize:13,color:a.tipo==='danger'?'#991B1B':'#92400E'}}>{a.msg}</div>
            ))}
          </div>}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px'}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>📋 Próximas ações</div>
            {diagnostico.planoAcao.map((p,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr 100px',gap:12,padding:'10px 0',borderBottom:i<diagnostico.planoAcao.length-1?`1px solid ${C.border}`:'none',alignItems:'center'}}>
                <span style={{fontSize:12,fontWeight:600}}>{p.prioridade}</span>
                <span style={{fontSize:13,color:C.text,fontWeight:500}}>{p.acao}</span>
                <span style={{fontSize:12,color:C.muted}}>{p.beneficio}</span>
                <span style={{fontSize:12,color:C.muted,textAlign:'right'}}>📅 {p.prazo}</span>
              </div>
            ))}
          </div>
        </>}
      </>}

      {/* ── ABA 1: DADOS DA DÍVIDA ── */}
      {aba===1&&<>
        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#1E40AF'}}>
          ℹ️ <strong>Modo manual ativo.</strong> Em versões futuras haverá consulta automática via API da PGFN/Regularize.
        </div>

        {/* DADOS GERAIS */}
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>📋 Dados Gerais</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>CNPJ</label>
              {inp('cnpj','00.000.000/0001-00')}
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Valor total da dívida (R$)</label>
              {inp('valor_total','Ex: 250.000,00')}
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Órgão credor</label>
              <select value={dados.orgao_credor} onChange={e=>setDados({...dados,orgao_credor:e.target.value})} style={{padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%'}}>
                <option>PGFN</option><option>Receita Federal</option><option>Estado</option><option>Município</option><option>Outro</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Processo de execução fiscal</label>
              {inp('processo_execucao','Ex: 0001234-56.2019.4.03.6100')}
            </div>
          </div>
        </div>

        {/* TABELA DE CDAs */}
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy}}>📄 CDAs — Certidões de Dívida Ativa</div>
            <button onClick={addCDA} style={{...btnPrimary,padding:'6px 14px',fontSize:12}}>+ Adicionar CDA</button>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'#F8FAFC'}}>
                  {['#','Número da CDA','Data Constituição','Data Inscrição','Valor (R$)','Tributo','Situação',''].map(h=>(
                    <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cdas.map((cda,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:'6px 10px',color:C.muted,fontWeight:600}}>{i+1}</td>
                    <td style={{padding:'4px 6px'}}><input value={cda.numero} onChange={e=>updateCDA(i,'numero',e.target.value)} placeholder="Ex: 80 4 00001234-9" style={{padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,width:160}}/></td>
                    <td style={{padding:'4px 6px'}}><input type="date" value={cda.data_constituicao} onChange={e=>updateCDA(i,'data_constituicao',e.target.value)} style={{padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:12}}/></td>
                    <td style={{padding:'4px 6px'}}><input type="date" value={cda.data_inscricao} onChange={e=>updateCDA(i,'data_inscricao',e.target.value)} style={{padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:12}}/></td>
                    <td style={{padding:'4px 6px'}}><input value={cda.valor} onChange={e=>updateCDA(i,'valor',e.target.value)} placeholder="Ex: 85.000,00" style={{padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,width:110}}/></td>
                    <td style={{padding:'4px 6px'}}><input value={cda.tributo} onChange={e=>updateCDA(i,'tributo',e.target.value)} placeholder="IRPJ, CSLL..." style={{padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,width:100}}/></td>
                    <td style={{padding:'4px 6px'}}>
                      <select value={cda.situacao} onChange={e=>updateCDA(i,'situacao',e.target.value)} style={{padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:12}}>
                        <option>Ativa</option><option>Garantida</option><option>Parcelada</option><option>Suspensa</option><option>Extinta</option>
                      </select>
                    </td>
                    <td style={{padding:'4px 6px'}}>
                      {cdas.length>1&&<button onClick={()=>removeCDA(i)} style={btnDanger}>🗑️</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SITUAÇÃO PROCESSUAL */}
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>⚖️ Situação Processual</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {chk('possui_parcelamento','Parcelamento ativo')}
            {chk('possui_transacao_anterior','Transação anterior')}
            {chk('possui_garantia','Garantia prestada')}
            {chk('possui_penhora','Penhora de bens')}
            {chk('possui_bloqueio','Bloqueio BACENJUD')}
            {chk('possui_embargos','Embargos à execução')}
          </div>
        </div>

        {/* OBSERVAÇÕES */}
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:12}}>📝 Observações</div>
          <textarea value={dados.observacoes} onChange={e=>setDados({...dados,observacoes:e.target.value})} placeholder="Informações complementares, histórico de negociações, garantias, etc."
            style={{width:'100%',padding:'10px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,minHeight:80,resize:'vertical',boxSizing:'border-box'}}/>
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={analisarDiagnostico} disabled={analisando} style={{...btnPrimary,opacity:analisando?0.7:1}}>
            {analisando?'🔄 Analisando...':'🧠 Executar diagnóstico inteligente →'}
          </button>
          <button onClick={salvar} disabled={salvando} style={{...btnOutline,opacity:salvando?0.7:1}}>
            {salvando?'Salvando...':'💾 Salvar'}
          </button>
        </div>
      </>}

      {/* ── ABA 2: DIAGNÓSTICO ── */}
      {aba===2&&<>
        {!diagnostico?(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'32px',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>🧠</div>
            <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Diagnóstico não realizado</div>
            <button onClick={()=>setAba(1)} style={btnPrimary}>Inserir dados →</button>
          </div>
        ):<>
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>⏱️ Análise de Prescrição por CDA</div>
            {cdas.map((cda,i)=>{
              const diasC = cda.data_constituicao?Math.floor((new Date()-new Date(cda.data_constituicao))/(1000*60*60*24)):0
              const diasI = cda.data_inscricao?Math.floor((new Date()-new Date(cda.data_inscricao))/(1000*60*60*24)):0
              const pctC = Math.min(100,(diasC/1825)*100)
              const pctI = Math.min(100,(diasI/1825)*100)
              const corC = pctC>=100?'#DC2626':pctC>=80?'#D97706':'#16A34A'
              const corI = pctI>=100?'#DC2626':pctI>=80?'#D97706':'#16A34A'
              return (
                <div key={i} style={{background:'#F8FAFC',borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 18px',marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:10}}>CDA {i+1}: {cda.numero||'—'} · {cda.tributo||'—'} · <span style={{color:'#DC2626'}}>{cda.valor||'—'}</span></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:11,color:C.muted}}>Prescrição quinquenal</span>
                        <span style={{fontSize:11,fontWeight:700,color:corC}}>{pctC>=100?'⚠️ VERIFICAR':pctC>=80?'⚠️ Atenção':'✅ OK'}</span>
                      </div>
                      <div style={{background:C.border,borderRadius:99,height:5,overflow:'hidden'}}>
                        <div style={{background:corC,height:5,borderRadius:99,width:pctC+'%'}}></div>
                      </div>
                      <div style={{fontSize:10,color:C.muted,marginTop:2}}>{diasC} dias desde constituição</div>
                    </div>
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:11,color:C.muted}}>Prescrição intercorrente</span>
                        <span style={{fontSize:11,fontWeight:700,color:corI}}>{pctI>=100?'⚠️ VERIFICAR':pctI>=80?'⚠️ Atenção':'✅ OK'}</span>
                      </div>
                      <div style={{background:C.border,borderRadius:99,height:5,overflow:'hidden'}}>
                        <div style={{background:corI,height:5,borderRadius:99,width:pctI+'%'}}></div>
                      </div>
                      <div style={{fontSize:10,color:C.muted,marginTop:2}}>{diasI} dias desde inscrição</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>⚖️ Teses e Oportunidades</div>
            {diagnostico.teses.map((t,i)=>{
              const cores={'baixo':'#DCFCE7|#166534','medio':'#FEF9C3|#854D0E','alto':'#FEE2E2|#991B1B'}
              const [bg,cor]=(cores[t.risco]||'#F1F5F9|#475569').split('|')
              return (
                <div key={i} style={{background:'#F8FAFC',borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 18px',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.text}}>{t.label}</span>
                    <span style={{background:bg,color:cor,padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>{t.risco}</span>
                    <span style={{marginLeft:'auto',fontSize:11,color:C.muted,fontWeight:600}}>Prioridade: {t.prioridade}</span>
                  </div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{t.desc}</div>
                  <div style={{fontSize:11,color:'#2563EB',fontWeight:600}}>📖 {t.fundamento}</div>
                </div>
              )
            })}
          </div>
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>🗂️ Situação Processual</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {[['Parcelamento ativo',dados.possui_parcelamento],['Transação anterior',dados.possui_transacao_anterior],['Garantia prestada',dados.possui_garantia],['Penhora de bens',dados.possui_penhora],['Bloqueio BACENJUD',dados.possui_bloqueio],['Embargos à execução',dados.possui_embargos]].map(([lb,val])=>(
                <div key={lb} style={{display:'flex',alignItems:'center',gap:8,background:val?'#FEF2F2':'#F0FDF4',border:`1px solid ${val?'#FECACA':'#86EFAC'}`,borderRadius:8,padding:'10px 14px'}}>
                  <span>{val?'🔴':'🟢'}</span>
                  <span style={{fontSize:12,color:C.text,fontWeight:500}}>{lb}</span>
                </div>
              ))}
            </div>
          </div>
        </>}
      </>}

      {/* ── ABA 3: ESTRATÉGIAS ── */}
      {aba===3&&<>
        <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#166534'}}>
          ✅ Modalidades baseadas nas regras vigentes da PGFN — Portaria 6.757/2022 e editais em vigor.
        </div>
        {MODALIDADES.map(m=>{
          const elegivel=!diagnostico||(diagnostico?.modalidades||[]).includes(m.key)
          return (
            <div key={m.key} style={{background:C.white,borderRadius:12,border:`1px solid ${elegivel?'#86EFAC':C.border}`,borderLeft:`5px solid ${elegivel?'#16A34A':'#C8D0DC'}`,padding:'18px 22px',marginBottom:12,opacity:elegivel?1:0.6}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:700,color:C.navy}}>{m.label}</span>
                {elegivel&&<span style={{background:'#DCFCE7',color:'#166534',padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>✓ Elegível</span>}
              </div>
              <div style={{fontSize:13,color:C.muted,marginBottom:10}}>{m.desc}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
                {[['Desconto multa',`${m.desconto_multa[0]}–${m.desconto_multa[1]}%`,'#7C3AED'],['Desconto juros',`${m.desconto_juros[0]}–${m.desconto_juros[1]}%`,'#0D9488'],['Entrada mínima',`${m.entrada_min}%`,'#D97706'],['Parcelas máx.',`${m.parcelas_max}x`,'#2563EB']].map(([lb,val,cor])=>(
                  <div key={lb} style={{background:'#F8FAFC',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                    <div style={{fontSize:14,fontWeight:700,color:cor}}>{val}</div>
                    <div style={{fontSize:10,color:C.muted}}>{lb}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:'#1E40AF',background:'#EFF6FF',borderRadius:6,padding:'6px 10px'}}>📋 {m.elegibilidade}</div>
            </div>
          )
        })}
      </>}

      {/* ── ABA 4: SIMULADOR ── */}
      {aba===4&&<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>⚙️ Parâmetros</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Valor total da dívida (R$)</label>
                <input value={sim.valor} onChange={e=>setSim({...sim,valor:e.target.value})} type="number" placeholder="Ex: 500000" style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Modalidade</label>
                <select value={sim.modalidade} onChange={e=>{const m=MODALIDADES.find(x=>x.key===e.target.value);setSim({...sim,modalidade:e.target.value,desconto_multa:m.desconto_multa[1],desconto_juros:m.desconto_juros[1],entrada_pct:m.entrada_min||5,parcelas:m.parcelas_max})}} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%'}}>
                  {MODALIDADES.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              {[['% da dívida que é multa','multa_pct',0,80],['% da dívida que são juros','juros_pct',0,80],['Desconto sobre multa (%)','desconto_multa',0,100],['Desconto sobre juros (%)','desconto_juros',0,100],['Entrada (% do valor final)','entrada_pct',0,30],['Número de parcelas','parcelas',1,120]].map(([lb,k,min,max])=>(
                <div key={k}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <label style={{fontSize:13,fontWeight:500,color:C.text}}>{lb}</label>
                    <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{sim[k]}{k==='parcelas'?'x':'%'}</span>
                  </div>
                  <input type="range" min={min} max={max} value={sim[k]} onChange={e=>setSim({...sim,[k]:parseInt(e.target.value)})} style={{width:'100%',accentColor:C.navy}}/>
                </div>
              ))}
              <button onClick={calcularSimulacao} style={btnPrimary}>📊 Simular →</button>
            </div>
          </div>
          <div>
            {!simResult?(
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'32px',textAlign:'center',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>📊</div>
                <div style={{fontSize:14,color:C.muted}}>Preencha os parâmetros e clique em Simular</div>
              </div>
            ):(
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
                <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>📊 Resultado</div>
                {[['Valor original',fmtR(parseFloat(sim.valor)||0),'#DC2626'],['Multa ('+sim.multa_pct+'%)',fmtR(simResult.multa),'#D97706'],['Juros ('+sim.juros_pct+'%)',fmtR(simResult.juros),'#D97706'],['Desconto multa','-'+fmtR(simResult.descMulta),'#16A34A'],['Desconto juros','-'+fmtR(simResult.descJuros),'#16A34A']].map(([lb,val,cor])=>(
                  <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <span style={{color:C.muted}}>{lb}</span><span style={{fontWeight:600,color:cor}}>{val}</span>
                  </div>
                ))}
                <div style={{background:'#F0FDF4',borderRadius:10,padding:'14px 16px',marginTop:14,marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>Valor final a pagar</span><span style={{fontSize:18,fontWeight:700,color:'#16A34A'}}>{fmtR(simResult.valorFinal)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Economia total</span><span style={{fontSize:14,fontWeight:700,color:'#16A34A'}}>{fmtR(simResult.economia)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Entrada ({sim.entrada_pct}%)</span><span style={{fontSize:13,fontWeight:600,color:C.navy}}>{fmtR(simResult.entrada)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:13,color:C.muted}}>{sim.parcelas>1?sim.parcelas-1:'1'} parcela(s) de</span><span style={{fontSize:13,fontWeight:600,color:C.navy}}>{fmtR(simResult.parcela)}</span></div>
                </div>
                <button onClick={()=>setAba(5)} style={{...btnOutline,width:'100%'}}>📄 Gerar relatório →</button>
              </div>
            )}
          </div>
        </div>
      </>}

      {/* ── ABA 5: RELATÓRIO ── */}
      {aba===5&&<>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'24px',marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:4}}>📄 Relatório Executivo — Dívida Ativa</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{new Date().toLocaleDateString('pt-BR')}</div>
          {!diagnostico?(
            <div style={{textAlign:'center',padding:'32px 0'}}>
              <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
              <div style={{fontSize:14,color:C.muted,marginBottom:16}}>Execute o diagnóstico antes de gerar o relatório.</div>
              <button onClick={()=>setAba(1)} style={btnPrimary}>Inserir dados →</button>
            </div>
          ):<>
            {[
              {titulo:'1. Resumo Executivo',cor:'#0B1F4D',conteudo:[`Cliente: ${active?.razao_social||dados.cnpj}`,`CNPJ: ${dados.cnpj}`,`Valor total: ${dados.valor_total}`,`CDAs: ${cdas.length} · Órgão: ${dados.orgao_credor}`,`Score: ${diagnostico.score}/100`,`Economia potencial: ${fmtR(diagnostico.valor*0.5)}`]},
              {titulo:'2. CDAs',cor:'#2563EB',conteudo:cdas.map((c,i)=>`CDA ${i+1}: ${c.numero||'—'} | ${c.tributo||'—'} | ${c.valor||'—'} | ${c.situacao}`)},
              {titulo:'3. Diagnóstico Técnico',cor:'#7C3AED',conteudo:diagnostico.teses.map(t=>`[${t.prioridade}] ${t.label} — ${t.fundamento}`)},
              {titulo:'4. Alertas',cor:'#DC2626',conteudo:diagnostico.alertas.length>0?diagnostico.alertas.map(a=>a.msg):['Nenhum alerta crítico.']},
              {titulo:'5. Estratégias',cor:'#16A34A',conteudo:diagnostico.modalidades.map(m=>{const mod=MODALIDADES.find(x=>x.key===m);return mod?`${mod.label}: até ${mod.desconto_multa[1]}% em multas`:''})},
              {titulo:'6. Plano de Ação',cor:'#D97706',conteudo:diagnostico.planoAcao.map(p=>`${p.prioridade} — ${p.acao} (${p.prazo})`)},
              {titulo:'7. Conclusão',cor:'#0B1F4D',conteudo:[`Score ${diagnostico.score}/100 — ${diagnostico.score>=70?'Alto potencial':diagnostico.score>=40?'Potencial moderado':'Situação crítica'}.`,'Recomenda-se análise jurídica complementar com advogado tributarista habilitado.']},
            ].map((s,i)=>(
              <div key={i} style={{borderLeft:`4px solid ${s.cor}`,paddingLeft:16,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:700,color:s.cor,marginBottom:8}}>{s.titulo}</div>
                {s.conteudo.map((c,j)=><div key={j} style={{fontSize:13,color:C.text,marginBottom:4}}>• {c}</div>)}
              </div>
            ))}
            <button onClick={gerarRelatorio} style={btnPrimary}>⬇️ Baixar relatório (.txt)</button>
          </>}
        </div>
      </>}
    </div>
  )
}