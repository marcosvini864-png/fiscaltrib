import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtD = () => new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })

const NAVY  = [11, 31, 77]
const BLUE  = [22, 59, 140]
const GREEN = [34, 197, 94]
const GRAY  = [100, 116, 139]
const LIGHT = [245, 247, 250]
const WHITE = [255, 255, 255]

function gerarPDF({ cliente, oportunidades, score, planoAcao }) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W = 210, M = 20

  function addHeader(titulo, pagina) {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 28, 'F')
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255)
    doc.text('FiscalTrib', M, 12)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(124,196,255)
    doc.text('Inteligência Tributária', M, 18)
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255)
    doc.text(titulo, W/2, 12, { align:'center' })
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(124,196,255)
    doc.text(`Página ${pagina} de 4`, W/2, 18, { align:'center' })
    doc.setFontSize(8); doc.setTextColor(255,255,255)
    doc.text(fmtD(), W-M, 12, { align:'right' })
    doc.text(cliente?.razao_social || '', W-M, 18, { align:'right' })
  }

  function addFooter() {
    doc.setFillColor(...NAVY)
    doc.rect(0, 285, W, 12, 'F')
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(124,196,255)
    doc.text('FiscalTrib — Inteligência Tributária | fiscaltrib.com.br | (11) 5589-2614', W/2, 292, { align:'center' })
    doc.setTextColor(255,255,255)
    doc.text('⚠ Análise preliminar — não substitui revisão profissional habilitada.', W/2, 297, { align:'center' })
  }

  const totalPotencial = oportunidades.reduce((s,o) => s+(o.potencial||0), 0)
  const scoreCor = score>=80 ? [22,163,74] : score>=60 ? [217,119,6] : [220,38,38]
  const scoreLabel = score>=80 ? 'Boa saúde tributária' : score>=60 ? 'Atenção necessária' : 'Situação crítica'

  // ── PÁGINA 1 ──────────────────────────────────────────────────────────────
  addHeader('DIAGNÓSTICO EXECUTIVO', 1)

  doc.setFillColor(...LIGHT)
  doc.rect(0, 28, W, 18, 'F')
  doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
  doc.text('Diagnóstico Executivo', M, 40)
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
  doc.text('Relatório de oportunidades tributárias identificadas', M, 47)

  let y = 56

  doc.setFillColor(...WHITE)
  doc.setDrawColor(...BLUE); doc.setLineWidth(0.3)
  doc.roundedRect(M, y, W-M*2, 40, 3, 3, 'FD')
  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
  doc.text('DADOS DO CLIENTE', M+6, y+8)
  doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
  doc.text(cliente?.razao_social || '—', M+6, y+16)
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
  doc.text(`CNPJ: ${cliente?.cnpj || '—'}`, M+6, y+23)
  doc.text(`Regime: ${cliente?.regime || '—'}`, M+6, y+30)
  doc.text(`Período: ${cliente?.competencia_inicio || '—'} a ${cliente?.competencia_fim || '—'}`, M+6, y+37)
  y += 48

  doc.setFillColor(...NAVY)
  doc.roundedRect(M, y, W-M*2, 52, 3, 3, 'F')
  doc.setFillColor(...scoreCor)
  doc.circle(M+30, y+26, 18, 'F')
  doc.setFontSize(20); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255)
  doc.text(String(score), M+30, y+23, { align:'center' })
  doc.setFontSize(7); doc.setFont('helvetica','normal')
  doc.text('/100', M+30, y+30, { align:'center' })
  doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255)
  doc.text('Score Fiscal', M+55, y+18)
  doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(...scoreCor.map(c=>Math.min(255,c+80)))
  doc.text(scoreLabel, M+55, y+28)
  doc.setFontSize(9); doc.setTextColor(124,196,255)
  doc.text(`${oportunidades.length} oportunidade(s) identificada(s)`, M+55, y+37)
  doc.text(`Potencial total: ${fmtR(totalPotencial)}`, M+55, y+44)
  y += 60

  const kpis = [
    { label:'Oportunidades',  valor:String(oportunidades.length),                                              cor:BLUE        },
    { label:'Potencial 60m',  valor:fmtR(totalPotencial),                                                      cor:[22,163,74] },
    { label:'Risco Baixo',    valor:String(oportunidades.filter(o=>o.risco==='baixo').length),                 cor:[22,163,74] },
    { label:'Risco Médio',    valor:String(oportunidades.filter(o=>o.risco==='medio').length),                 cor:[217,119,6] },
  ]
  const kw = (W-M*2-12)/4
  kpis.forEach((k,i) => {
    const x = M+i*(kw+4)
    doc.setFillColor(...WHITE)
    doc.setDrawColor(230,232,240); doc.setLineWidth(0.2)
    doc.roundedRect(x, y, kw, 22, 2, 2, 'FD')
    doc.setFillColor(...k.cor)
    doc.rect(x, y, 3, 22, 'F')
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...k.cor)
    doc.text(k.valor, x+kw/2+2, y+10, { align:'center' })
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
    doc.text(k.label, x+kw/2+2, y+17, { align:'center' })
  })

  addFooter()

  // ── PÁGINA 2 ──────────────────────────────────────────────────────────────
  doc.addPage()
  addHeader('OPORTUNIDADES ENCONTRADAS', 2)

  doc.setFillColor(...LIGHT)
  doc.rect(0, 28, W, 14, 'F')
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
  doc.text('Oportunidades Tributárias Identificadas', M, 38)

  y = 50

  autoTable(doc, {
    startY: y, margin:{ left:M, right:M },
    head: [['Tese Tributária','Risco','12 meses','36 meses','60 meses ★']],
    body: oportunidades.map(o => [
      o.tese,
      o.risco==='baixo'?'🟢 Baixo':o.risco==='medio'?'🟡 Médio':'🔴 Alto',
      fmtR((o.mediaMensal||o.potencial/60)*12),
      fmtR((o.mediaMensal||o.potencial/60)*36),
      fmtR(o.potencial),
    ]),
    foot: [['TOTAL','',
      fmtR(oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60)*12,0)),
      fmtR(oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60)*36,0)),
      fmtR(totalPotencial),
    ]],
    headStyles:{ fillColor:NAVY, textColor:[255,255,255], fontStyle:'bold', fontSize:9 },
    footStyles:{ fillColor:BLUE, textColor:[255,255,255], fontStyle:'bold', fontSize:9 },
    bodyStyles:{ fontSize:9 },
    alternateRowStyles:{ fillColor:[248,250,252] },
    columnStyles:{ 0:{cellWidth:72}, 1:{cellWidth:22,halign:'center'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right',fontStyle:'bold',textColor:[22,163,74]} },
  })

  y = doc.lastAutoTable.finalY + 10

  oportunidades.forEach((op,i) => {
    if(y>240){ doc.addPage(); addHeader('OPORTUNIDADES ENCONTRADAS',2); y=36 }
    doc.setFillColor(...WHITE)
    doc.setDrawColor(230,232,240); doc.setLineWidth(0.2)
    doc.roundedRect(M, y, W-M*2, 28, 2, 2, 'FD')
    const barCor = op.risco==='baixo'?[22,163,74]:[217,119,6]
    doc.setFillColor(...barCor)
    doc.rect(M, y, 3, 28, 'F')
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
    doc.text(`${i+1}. ${op.tese}`, M+8, y+8)
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
    const desc = op.descricao?.length>90 ? op.descricao.slice(0,90)+'...' : op.descricao||''
    doc.text(desc, M+8, y+15)
    if(op.ncms?.length>0) doc.text(`NCMs: ${op.ncms.join(', ')}`, M+8, y+22)
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...barCor)
    doc.text(fmtR(op.potencial), W-M-4, y+13, { align:'right' })
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
    doc.text('60 meses', W-M-4, y+20, { align:'right' })
    y += 33
  })

  addFooter()

  // ── PÁGINA 3 ──────────────────────────────────────────────────────────────
  doc.addPage()
  addHeader('POTENCIAL TOTAL RECUPERÁVEL', 3)

  doc.setFillColor(...LIGHT)
  doc.rect(0, 28, W, 14, 'F')
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
  doc.text('Potencial Total Recuperável', M, 38)

  y = 50

  doc.setFillColor(...NAVY)
  doc.roundedRect(M, y, W-M*2, 55, 4, 4, 'F')
  doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(124,196,255)
  doc.text('POTENCIAL TOTAL ESTIMADO (60 MESES)', W/2, y+14, { align:'center' })
  doc.setFontSize(28); doc.setFont('helvetica','bold'); doc.setTextColor(...GREEN)
  doc.text(fmtR(totalPotencial), W/2, y+32, { align:'center' })
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(124,196,255)
  doc.text(`${oportunidades.length} teses · Regime ${cliente?.regime||''}`, W/2, y+42, { align:'center' })
  y += 65

  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
  doc.text('Projeção por período', M, y); y += 8

  const periodos = [12, 24, 36, 60]
  const pw = (W-M*2-periodos.length*4)/periodos.length
  periodos.forEach((p,i) => {
    const x  = M+i*(pw+4)
    const val = oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60)*p,0)
    const pct = totalPotencial>0 ? val/totalPotencial : 0
    if(i===3) { doc.setFillColor(...NAVY) } else { doc.setFillColor(...LIGHT) }
    doc.roundedRect(x, y, pw, 32, 3, 3, 'F')
    doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.setTextColor(...(i===3 ? [124,196,255] : GRAY))
    doc.text(`${p} meses`, x+pw/2, y+9, { align:'center' })
    doc.setFontSize(10); doc.setFont('helvetica','bold')
    doc.setTextColor(...(i===3 ? GREEN : NAVY))
    doc.text(fmtR(val), x+pw/2, y+19, { align:'center' })
    doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.setTextColor(...(i===3 ? [124,196,255] : GRAY))
    doc.text(`${Math.round(pct*100)}%`, x+pw/2, y+27, { align:'center' })
  })
  y += 42

  autoTable(doc, {
    startY: y, margin:{ left:M, right:M },
    head: [['Tese','Média Mensal','12m','24m','36m','60m']],
    body: oportunidades.map(o => {
      const mm = o.mediaMensal||o.potencial/60
      return [o.tese, fmtR(mm), fmtR(mm*12), fmtR(mm*24), fmtR(mm*36), fmtR(mm*60)]
    }),
    foot: [['TOTAL',
      fmtR(oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60),0)),
      fmtR(oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60)*12,0)),
      fmtR(oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60)*24,0)),
      fmtR(oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60)*36,0)),
      fmtR(totalPotencial),
    ]],
    headStyles:{ fillColor:NAVY, textColor:[255,255,255], fontStyle:'bold', fontSize:8 },
    footStyles:{ fillColor:BLUE, textColor:[255,255,255], fontStyle:'bold', fontSize:8 },
    bodyStyles:{ fontSize:8 },
    alternateRowStyles:{ fillColor:[248,250,252] },
    columnStyles:{ 0:{cellWidth:55}, 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right',fontStyle:'bold',textColor:[22,163,74]} },
  })

  addFooter()

  // ── PÁGINA 4 ──────────────────────────────────────────────────────────────
  doc.addPage()
  addHeader('PLANO DE AÇÃO', 4)

  doc.setFillColor(...LIGHT)
  doc.rect(0, 28, W, 14, 'F')
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
  doc.text('Plano de Ação Recomendado', M, 38)

  y = 52

  planoAcao.forEach((passo,i) => {
    if(y>255) return
    const corPasso = passo.risco==='baixo' ? [22,163,74] : passo.risco==='medio' ? [217,119,6] : BLUE
    doc.setFillColor(...WHITE)
    doc.setDrawColor(...corPasso); doc.setLineWidth(0.4)
    doc.roundedRect(M, y, W-M*2, 34, 3, 3, 'FD')
    doc.setFillColor(...corPasso)
    doc.circle(M+10, y+17, 7, 'F')
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255)
    doc.text(String(i+1), M+10, y+20, { align:'center' })
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...NAVY)
    doc.text(passo.titulo, M+22, y+11)
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
    doc.text(passo.descricao, M+22, y+19)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(...corPasso)
    doc.text(fmtR(passo.potencial), W-M-4, y+14, { align:'right' })
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY)
    doc.text('potencial 60m', W-M-4, y+21, { align:'right' })
    const prioridade = passo.risco==='baixo'?'⭐ Alta prioridade':'• Média prioridade'
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(...corPasso)
    doc.text(prioridade, M+22, y+27)
    y += 39
  })

  y += 6
  doc.setFillColor(...NAVY)
  doc.roundedRect(M, y, W-M*2, 38, 4, 4, 'F')
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(...GREEN)
  doc.text(`Total recuperável: ${fmtR(totalPotencial)}`, W/2, y+13, { align:'center' })
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(255,255,255)
  doc.text('Este relatório foi preparado exclusivamente para sua empresa.', W/2, y+22, { align:'center' })
  doc.text('Entre em contato para iniciar o processo de recuperação tributária.', W/2, y+29, { align:'center' })
  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(124,196,255)
  doc.text('fiscaltrib.com.br  |  (11) 5589-2614  |  (11) 99957-9822', W/2, y+36, { align:'center' })

  addFooter()

  const nomeArq = `FiscalTrib_${(cliente?.razao_social||'cliente').replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`
  doc.save(nomeArq)
}

export default function Relatorio({ active, ents }) {
  const [gerando,      setGerando]      = useState(false)
  const [recuperacoes, setRecuperacoes] = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { if(active?.id) carregarDados() }, [active?.id])

  async function carregarDados() {
    setLoading(true)
    const { data } = await supabase.from('recuperacoes').select('*').eq('cliente_id', active.id)
    setRecuperacoes(data||[])
    setLoading(false)
  }

  function montarOportunidades() {
    const ops = []
    ;(ents||[]).filter(e=>e.credito>0).forEach(e=>{
      ops.push({ tese:e.tipo_oportunidade||e.tributo||'Crédito identificado', descricao:`Competência ${e.competencia} · ${e.tributo}`, mediaMensal:e.credito, potencial:e.credito*60, risco:e.risco||'medio', ncms:[] })
    })
    recuperacoes.forEach(r=>{
      if(!ops.find(o=>o.tese===r.tese_aplicada)){
        ops.push({ tese:r.tese_aplicada||'Recuperação em andamento', descricao:`Processo · Status: ${r.status}`, mediaMensal:(r.potencial_recuperavel||0)/60, potencial:r.potencial_recuperavel||0, risco:r.risco||'medio', ncms:[] })
      }
    })
    return ops
  }

  function montarPlanoAcao(ops) {
    return ops.sort((a,b)=>{ const ord={baixo:0,medio:1,alto:2}; return ord[a.risco]-ord[b.risco] })
      .map((op,i)=>({ titulo:i===0?`Recuperar: ${op.tese}`:i===1?`Revisar: ${op.tese}`:`Ajustar: ${op.tese}`, descricao:op.descricao, potencial:op.potencial, risco:op.risco }))
  }

  function calcularScore(ops) {
    return Math.min(100,Math.max(20, 100 - ops.filter(o=>o.risco==='baixo').length*12 - ops.filter(o=>o.risco==='medio').length*6))
  }

  async function handleGerar() {
    setGerando(true)
    try {
      const oportunidades = montarOportunidades()
      const score         = calcularScore(oportunidades)
      const planoAcao     = montarPlanoAcao(oportunidades)
      gerarPDF({ cliente:active, oportunidades, score, planoAcao })
    } catch(e) { alert('Erro ao gerar PDF: '+e.message) }
    finally { setGerando(false) }
  }

  const oportunidades  = montarOportunidades()
  const totalPotencial = oportunidades.reduce((s,o)=>s+(o.potencial||0),0)
  const score          = calcularScore(oportunidades)
  const scoreCor       = score>=80?'#16a34a':score>=60?'#d97706':'#dc2626'
  const scoreLabel     = score>=80?'Boa saúde tributária':score>=60?'Atenção necessária':'Situação crítica'

  if(loading) return <div style={{padding:40,textAlign:'center',color:'#64748b'}}>Carregando dados...</div>

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>

      <div style={{background:'linear-gradient(135deg,#0B1F4D,#163B8C)',borderRadius:16,padding:'28px 32px',marginBottom:24,color:'#fff'}}>
        <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — RELATÓRIO EXECUTIVO</div>
        <h2 style={{fontSize:24,fontWeight:900,marginBottom:8,margin:'0 0 8px'}}>📄 Relatório Matador</h2>
        <p style={{fontSize:14,color:'#93c5fd',margin:0}}>PDF comercial de 4 páginas · Leve para o cliente e feche o contrato</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>

        <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:'#0B1F4D',padding:'10px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#7CC4FF'}}>PÁGINA 1 — DIAGNÓSTICO EXECUTIVO</div>
          </div>
          <div style={{padding:'16px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:12}}>
              <div style={{width:56,height:56,borderRadius:'50%',background:scoreCor,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
                <div style={{fontSize:18,fontWeight:900,color:'#fff',lineHeight:1}}>{score}</div>
                <div style={{fontSize:9,color:'#fff'}}>/100</div>
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'#0B1F4D'}}>Score Fiscal</div>
                <div style={{fontSize:13,color:scoreCor,fontWeight:600}}>{scoreLabel}</div>
                <div style={{fontSize:12,color:'#64748b'}}>{oportunidades.length} oportunidade(s)</div>
              </div>
            </div>
            <div style={{fontSize:12,color:'#64748b'}}><strong style={{color:'#0B1F4D'}}>{active?.razao_social}</strong><br/>{active?.cnpj} · {active?.regime}</div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:'#0B1F4D',padding:'10px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#7CC4FF'}}>PÁGINA 2 — OPORTUNIDADES</div>
          </div>
          <div style={{padding:'16px 20px'}}>
            {oportunidades.length===0
              ? <div style={{fontSize:13,color:'#94a3b8',textAlign:'center',padding:'12px 0'}}>Nenhuma oportunidade ainda</div>
              : oportunidades.slice(0,4).map((op,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f1f5f9',fontSize:13}}>
                  <span style={{color:'#1e293b',fontWeight:500}}>{op.risco==='baixo'?'🟢':'🟡'} {op.tese?.slice(0,30)}{op.tese?.length>30?'...':''}</span>
                  <span style={{fontWeight:700,color:'#16a34a'}}>{fmtR(op.potencial)}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:'#0B1F4D',padding:'10px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#7CC4FF'}}>PÁGINA 3 — POTENCIAL TOTAL</div>
          </div>
          <div style={{padding:'16px 20px',textAlign:'center'}}>
            <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>POTENCIAL (60 MESES)</div>
            <div style={{fontSize:28,fontWeight:900,color:'#16a34a',marginBottom:8}}>{fmtR(totalPotencial)}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {[12,24,36,60].map(p=>(
                <div key={p} style={{background:'#f8fafc',borderRadius:6,padding:'6px 4px',textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{p}m</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0B1F4D'}}>{fmtR(oportunidades.reduce((s,o)=>s+(o.mediaMensal||o.potencial/60)*p,0))}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:12,border:'2px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:'#0B1F4D',padding:'10px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#7CC4FF'}}>PÁGINA 4 — PLANO DE AÇÃO</div>
          </div>
          <div style={{padding:'16px 20px'}}>
            {montarPlanoAcao(oportunidades).slice(0,4).map((p,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'1px solid #f1f5f9',fontSize:13}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:p.risco==='baixo'?'#16a34a':'#d97706',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,flexShrink:0}}>{i+1}</div>
                <span style={{color:'#1e293b',flex:1}}>{p.titulo?.slice(0,35)}</span>
                <span style={{fontSize:12,fontWeight:700,color:'#16a34a'}}>{fmtR(p.potencial)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleGerar} disabled={gerando||oportunidades.length===0}
        style={{width:'100%',padding:'18px 0',background:oportunidades.length>0?'linear-gradient(135deg,#0B1F4D,#163B8C)':'#e2e8f0',color:oportunidades.length>0?'#fff':'#94a3b8',border:'none',borderRadius:12,fontSize:17,fontWeight:900,cursor:oportunidades.length>0?'pointer':'default',marginBottom:16}}>
        {gerando?'⏳ Gerando PDF...':oportunidades.length>0?`📄 Baixar Relatório Matador — ${fmtR(totalPotencial)}`:'⚠️ Adicione dados para gerar o relatório'}
      </button>

      {oportunidades.length===0 && (
        <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:10,padding:'14px 18px',fontSize:13,color:'#92400e',textAlign:'center'}}>
          💡 Importe XMLs ou adicione entradas manualmente para gerar o relatório.
        </div>
      )}
    </div>
  )
}