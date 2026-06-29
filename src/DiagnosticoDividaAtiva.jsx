import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#E4E7EC', border:'#C8D0DC',
  text:'#1E293B', muted:'#64748B',
}

const fmtR = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtData = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'
const diasEntre = (d1,d2) => d1&&d2 ? Math.floor((new Date(d2+'T00:00:00')-new Date(d1+'T00:00:00'))/(1000*60*60*24)) : null
const addAnos = (d,anos) => { if(!d) return null; const dt=new Date(d+'T00:00:00'); dt.setFullYear(dt.getFullYear()+anos); return dt.toISOString().slice(0,10) }
const hoje = new Date().toISOString().slice(0,10)

const TIPOS_CREDITO = [
  { key:'tributario_federal',    label:'Tributário Federal',              legislacao:'CTN + Lei 6.830/80',            prazo_dec:5, prazo_pres:5, exemplos:'IRPJ, CSLL, PIS, COFINS, IPI, IOF' },
  { key:'previdenciario',        label:'Previdenciário',                  legislacao:'Lei 8.212/91 + CTN',            prazo_dec:5, prazo_pres:5, exemplos:'INSS empresa, retenções, contribuições sociais' },
  { key:'fgts',                  label:'FGTS',                           legislacao:'Lei 8.036/90 + RE 709.212 STF', prazo_dec:5, prazo_pres:5, exemplos:'Depósitos FGTS não recolhidos' },
  { key:'simples_nacional',      label:'Simples Nacional',                legislacao:'LC 123/2006 + CTN',             prazo_dec:5, prazo_pres:5, exemplos:'DAS não pagos, diferenças apuradas' },
  { key:'multa_tributaria',      label:'Multa Tributária',                legislacao:'CTN + Lei 9.430/96',            prazo_dec:5, prazo_pres:5, exemplos:'Multa de ofício, multa isolada, multa acessória' },
  { key:'multa_trabalhista',     label:'Multa Trabalhista',               legislacao:'CLT + Lei 6.830/80',            prazo_dec:5, prazo_pres:5, exemplos:'Autuações da Inspeção do Trabalho' },
  { key:'multa_ambiental',       label:'Multa Ambiental',                legislacao:'Lei 9.605/98 + Decreto 6.514',  prazo_dec:5, prazo_pres:5, exemplos:'Autuações IBAMA, ICMBio e órgãos ambientais' },
  { key:'nao_tributario',        label:'Crédito Não Tributário',         legislacao:'Decreto 20.910/32 + Lei 6.830', prazo_dec:5, prazo_pres:5, exemplos:'Multas administrativas, ressarcimentos' },
  { key:'agencia_reguladora',    label:'Crédito de Agência Reguladora',  legislacao:'Lei específica da agência',     prazo_dec:5, prazo_pres:5, exemplos:'ANATEL, ANEEL, ANS, ANVISA, ANP' },
  { key:'autarquia',             label:'Crédito de Autarquia/Fundação',  legislacao:'Lei específica + Decreto 20.910',prazo_dec:5, prazo_pres:5, exemplos:'CREA, CRM, OAB, INMETRO' },
  { key:'outro',                 label:'Outro',                          legislacao:'Legislação específica',          prazo_dec:5, prazo_pres:5, exemplos:'Outros créditos da União' },
]

const TESES_POR_TIPO = {
  tributario_federal: ['Decadência (art. 173 ou 150 CTN)','Prescrição (art. 174 CTN)','Prescrição intercorrente (art. 40 Lei 6.830)','Nulidade da CDA (art. 202 CTN)','Juros SELIC inconstitucionais (RE 1.346.152)','Multa confiscatória (art. 150, IV CF)'],
  previdenciario:     ['Decadência (art. 173 CTN)','Prescrição (art. 174 CTN)','Lançamento de ofício — prazo especial','Contribuições sobre verbas indenizatórias','Nulidade da CDA por ausência de fundamentação'],
  fgts:               ['Prescrição trintenária vs. quinquenal (RE 709.212 STF)','Prescrição de atos anteriores a 13/11/2014','Nulidade da CDA por vício formal','Multa mora — limitação legal'],
  simples_nacional:   ['Decadência (LC 123/2006 + CTN)','Prescrição (art. 174 CTN)','Segregação de receitas — cálculo incorreto','Fator R — enquadramento indevido','Substituição tributária — recolhimento em duplicidade'],
  multa_tributaria:   ['Proporcionalidade — confisco (art. 150, IV CF)','Multa qualificada — dolo não comprovado','Retroatividade da lei mais benéfica (art. 106, II CTN)','Denúncia espontânea (art. 138 CTN)'],
  multa_trabalhista:  ['Prescrição quinquenal (Decreto 20.910/32)','Nulidade do auto de infração','Proporcionalidade da multa','Reincidência — vedação bis in idem'],
  multa_ambiental:    ['Prescrição quinquenal (Decreto 20.910/32 ou Lei 9.873/99)','Nulidade por vício formal','Proporcionalidade','Competência — conflito entre órgãos'],
  nao_tributario:     ['Prescrição quinquenal (Decreto 20.910/32)','Nulidade por ausência de processo administrativo','Decadência do direito de constituir o crédito','Ausência de liquidez e certeza'],
  agencia_reguladora: ['Prescrição quinquenal (Decreto 20.910/32)','Nulidade do processo administrativo','Proporcionalidade da sanção','Competência regulatória'],
  autarquia:          ['Prescrição quinquenal (Decreto 20.910/32)','Nulidade por vício formal','Ausência de título executivo válido','Inscrição em DA sem processo administrativo regular'],
  outro:              ['Prescrição aplicável','Nulidade formal','Proporcionalidade','Liquidez e certeza do crédito'],
}

const CDA_VAZIA = {
  numero:'', tipo_credito:'tributario_federal', tributo:'', valor:'', situacao:'Ativa',
  modalidade_lancamento:'oficio',
  data_fato_gerador:'', data_constituicao:'', data_inscricao:'',
  data_ajuizamento:'', data_citacao:'', data_ultima_movimentacao:'',
  possui_parcelamento:false, possui_suspensao:false, possui_garantia:false,
  possui_penhora:false, possui_embargos:false,
}

const MODALIDADES_PGFN = [
  { key:'transacao_excepcional', label:'Transação Excepcional',       desconto_multa:[50,100], desconto_juros:[50,100], entrada_min:0,  parcelas_max:60, elegibilidade:'CAPAG D ou insuficiência de recursos comprovada.' },
  { key:'transacao_individual',  label:'Transação Individual',        desconto_multa:[0,50],   desconto_juros:[0,50],   entrada_min:5,  parcelas_max:84, elegibilidade:'Dívida ativa superior a R$ 10 milhões.' },
  { key:'transacao_edital',      label:'Transação por Edital',        desconto_multa:[0,50],   desconto_juros:[0,50],   entrada_min:5,  parcelas_max:60, elegibilidade:'Dívida inscrita há mais de 1 ano, sem garantia integral.' },
  { key:'prdi',                  label:'PRDI',                        desconto_multa:[50,70],  desconto_juros:[50,70],  entrada_min:0,  parcelas_max:84, elegibilidade:'Empresa em recuperação judicial.' },
  { key:'parcelamento_ordinario',label:'Parcelamento Ordinário',      desconto_multa:[0,0],    desconto_juros:[0,0],    entrada_min:0,  parcelas_max:60, elegibilidade:'Qualquer contribuinte com dívida inscrita.' },
  { key:'njp',                   label:'Negócio Jurídico Processual', desconto_multa:[0,40],   desconto_juros:[0,40],   entrada_min:10, parcelas_max:60, elegibilidade:'Execução fiscal em andamento com penhora ou garantia.' },
]

function identificarCredito(cda) {
  const tipo = TIPOS_CREDITO.find(t=>t.key===cda.tipo_credito) || TIPOS_CREDITO[0]
  const teses = TESES_POR_TIPO[cda.tipo_credito] || TESES_POR_TIPO.outro
  return { tipo, teses }
}

function analisarDecadencia(cda) {
  const { tipo } = identificarCredito(cda)
  const { data_fato_gerador, data_constituicao, modalidade_lancamento } = cda
  if (!data_fato_gerador && !data_constituicao) {
    return { conclusao:'indefinida', titulo:'Decadência — Análise inconclusiva', cor:'#D97706',
      passos:[{label:'Problema',valor:'Dados insuficientes',obs:'Informe a data do fato gerador e da constituição definitiva.'}],
      justificativa:'Não foi possível concluir porque não foram informadas a data do fato gerador nem a data da constituição definitiva do crédito.' }
  }
  const artigo = modalidade_lancamento==='homologacao' ? 'art. 150, §4º do CTN' : 'art. 173, I do CTN'
  const limite = addAnos(data_fato_gerador, tipo.prazo_dec)
  const diasConst = diasEntre(data_fato_gerador, data_constituicao)
  const prazoExcedido = data_constituicao && limite && data_constituicao > limite
  const passos = [
    { label:'Natureza do crédito',          valor:tipo.label,              obs:`Legislação: ${tipo.legislacao}` },
    { label:'Modalidade do lançamento',     valor:modalidade_lancamento==='homologacao'?'Por homologação':'De ofício / Declaração', obs:artigo },
    { label:'Data do fato gerador',         valor:fmtData(data_fato_gerador), obs:'Marco inicial' },
    { label:'Prazo legal',                  valor:`${tipo.prazo_dec} anos`, obs:artigo },
    { label:'Data-limite para constituição',valor:fmtData(limite),          obs:'Após essa data, o crédito é decadente' },
    { label:'Data da constituição',         valor:fmtData(data_constituicao), obs:diasConst!==null?`${diasConst} dias após o fato gerador`:'Não informada' },
    { label:'Situação',                     valor:!data_constituicao?'Não verificável':prazoExcedido?'⚠️ FORA DO PRAZO':'✅ Dentro do prazo', obs:'' },
  ]
  if (!data_constituicao) return { conclusao:'indefinida', titulo:'Decadência — Análise inconclusiva', cor:'#D97706', passos, justificativa:'Não foi possível concluir a existência de decadência porque não foi informada a data da constituição definitiva do crédito.' }
  if (prazoExcedido) return { conclusao:'ha_decadencia', titulo:'⚠️ Há decadência', cor:'#DC2626', passos, justificativa:`O crédito (${tipo.label}) foi constituído em ${fmtData(data_constituicao)}, após o término do prazo decadencial de ${tipo.prazo_dec} anos previsto no ${artigo}, cujo limite era ${fmtData(limite)}. Não foi identificada qualquer causa legal que prorrogasse esse prazo.` }
  return { conclusao:'sem_decadencia', titulo:'✅ Não há decadência', cor:'#16A34A', passos, justificativa:`O lançamento (${tipo.label}) foi constituído em ${fmtData(data_constituicao)}, dentro do prazo previsto no ${artigo}. Entre o fato gerador e a constituição definitiva do crédito não transcorreu prazo superior ao permitido pela legislação.` }
}

function analisarPrescricao(cda) {
  const { tipo } = identificarCredito(cda)
  const { data_constituicao, data_ajuizamento, data_citacao, possui_parcelamento, possui_suspensao } = cda
  if (!data_constituicao) return { conclusao:'indefinida', titulo:'Prescrição — Análise inconclusiva', cor:'#D97706', passos:[{label:'Problema',valor:'Dados insuficientes',obs:'Informe a data da constituição definitiva do crédito.'}], justificativa:'Não foi possível concluir porque não foi informada a data da constituição definitiva do crédito.' }
  const limite = addAnos(data_constituicao, tipo.prazo_pres)
  const prescrito = !data_ajuizamento && !data_citacao && !possui_parcelamento && !possui_suspensao && hoje > limite
  const interrompidoCitacao = data_citacao && data_citacao <= limite
  const interrompidoAjuizamento = data_ajuizamento && data_ajuizamento <= limite
  const suspenso = possui_parcelamento || possui_suspensao
  const passos = [
    { label:'Natureza do crédito',       valor:tipo.label,              obs:`Legislação: ${tipo.legislacao}` },
    { label:'Constituição definitiva',   valor:fmtData(data_constituicao), obs:'Marco inicial da contagem (art. 174 CTN)' },
    { label:'Prazo legal',               valor:`${tipo.prazo_pres} anos`, obs:'Art. 174 CTN' },
    { label:'Data-limite',               valor:fmtData(limite),          obs:'Após essa data, sem interrupção, o crédito é prescrito' },
    { label:'Data do ajuizamento',       valor:fmtData(data_ajuizamento)||'Não localizado', obs:interrompidoAjuizamento?'✅ Interrompe a prescrição':'Não localizado dentro do prazo' },
    { label:'Data da citação válida',    valor:fmtData(data_citacao)||'Não localizada', obs:interrompidoCitacao?'✅ Interrompe (art. 174, pú., I)':'Não localizada' },
    { label:'Parcelamento',              valor:possui_parcelamento?'Sim':'Não', obs:possui_parcelamento?'✅ Suspende (art. 151, VI CTN)':'Não localizado' },
    { label:'Suspensão da exigibilidade',valor:possui_suspensao?'Sim':'Não', obs:possui_suspensao?'✅ Suspende o prazo':'Não localizada' },
    { label:'Situação atual',            valor:prescrito?'⚠️ CRÉDITO PRESCRITO':suspenso||interrompidoCitacao||interrompidoAjuizamento?'✅ Interrompido/Suspenso':'✅ Dentro do prazo', obs:'' },
  ]
  if (prescrito) return { conclusao:'ha_prescricao', titulo:'⚠️ Há prescrição', cor:'#DC2626', passos, justificativa:`Transcorreram mais de ${tipo.prazo_pres} anos entre a constituição definitiva (${fmtData(data_constituicao)}) e a data atual, sem citação válida, parcelamento ou causa de suspensão. Data-limite: ${fmtData(limite)}.` }
  if (interrompidoCitacao) return { conclusao:'sem_prescricao', titulo:'✅ Não há prescrição', cor:'#16A34A', passos, justificativa:`O prazo prescricional foi interrompido pela citação válida em ${fmtData(data_citacao)}, nos termos do art. 174, parágrafo único, I do CTN.` }
  if (suspenso) return { conclusao:'sem_prescricao', titulo:'✅ Não há prescrição', cor:'#16A34A', passos, justificativa:`O prazo prescricional encontra-se suspenso em razão de ${possui_parcelamento?'parcelamento ativo (art. 151, VI CTN)':'suspensão da exigibilidade identificada'}.` }
  if (!data_citacao && !data_ajuizamento) return { conclusao:'indefinida', titulo:'Prescrição — Análise inconclusiva', cor:'#D97706', passos, justificativa:'Não foi possível concluir porque não foram informadas a data da citação válida nem do ajuizamento da execução fiscal.' }
  return { conclusao:'sem_prescricao', titulo:'✅ Não há prescrição', cor:'#16A34A', passos, justificativa:`O crédito está dentro do prazo prescricional de ${tipo.prazo_pres} anos. Data-limite: ${fmtData(limite)}.` }
}

function analisarPrescricaoIntercorrente(cda) {
  const { data_ajuizamento, data_ultima_movimentacao, possui_embargos, possui_penhora } = cda
  if (!data_ajuizamento) return { conclusao:'indefinida', titulo:'Prescrição Intercorrente — Inconclusiva', cor:'#D97706', passos:[{label:'Problema',valor:'Dados insuficientes',obs:'Informe a data do ajuizamento da execução fiscal.'}], justificativa:'Não foi possível concluir porque não foi informada a data do ajuizamento da execução fiscal.' }
  const ref = data_ultima_movimentacao || data_ajuizamento
  const limite = addAnos(ref, 5)
  const diasParado = diasEntre(ref, hoje)
  const prescritoInt = !possui_embargos && !possui_penhora && hoje > limite
  const passos = [
    { label:'Data do ajuizamento',            valor:fmtData(data_ajuizamento), obs:'Início da execução fiscal' },
    { label:'Última movimentação processual', valor:fmtData(data_ultima_movimentacao)||'Não informada', obs:'Marco para contagem da paralisação' },
    { label:'Período de paralisação',         valor:diasParado!==null?`${diasParado} dias`:'Não calculável', obs:'Art. 40 da Lei 6.830/80 — Súmula 314 STJ' },
    { label:'Data-limite (5 anos)',           valor:fmtData(limite), obs:'Após esse prazo sem movimentação útil' },
    { label:'Penhora de bens',                valor:possui_penhora?'Sim':'Não', obs:possui_penhora?'✅ Movimentação ativa':'Não localizada' },
    { label:'Embargos à execução',            valor:possui_embargos?'Sim':'Não', obs:possui_embargos?'✅ Impulso processual':'Não localizados' },
    { label:'Situação',                       valor:prescritoInt?'⚠️ POSSÍVEL PRESCRIÇÃO INTERCORRENTE':'✅ Sem prescrição intercorrente', obs:'' },
  ]
  if (prescritoInt) return { conclusao:'ha_prescricao_intercorrente', titulo:'⚠️ Possível prescrição intercorrente', cor:'#DC2626', passos, justificativa:`Foi identificada possível prescrição intercorrente porque o processo permaneceu sem movimentação útil por período superior a 5 anos desde ${fmtData(ref)}, sem atos processuais capazes de interromper o prazo (art. 40 da Lei 6.830/80 e Súmula 314 STJ).` }
  return { conclusao:'sem_prescricao_intercorrente', titulo:'✅ Sem prescrição intercorrente', cor:'#16A34A', passos, justificativa:`Não foi identificada prescrição intercorrente porque ${possui_penhora||possui_embargos?'o processo apresenta movimentação processual ativa':'o processo está dentro do prazo legal'}.` }
}

function analisarCDA(cda) {
  const { tipo, teses } = identificarCredito(cda)
  const problemas = []
  if (!cda.numero) problemas.push('Número da CDA não informado')
  if (!cda.tributo) problemas.push('Tributo não identificado')
  if (!cda.valor) problemas.push('Valor não informado — prejudica análise de liquidez')
  if (!cda.data_constituicao) problemas.push('Data de constituição não informada')
  if (!cda.data_inscricao) problemas.push('Data de inscrição não informada')
  if (!cda.data_fato_gerador) problemas.push('Data do fato gerador não informada')
  const passos = [
    { label:'Natureza do crédito',  valor:tipo.label,                    obs:`Legislação: ${tipo.legislacao}` },
    { label:'Exemplos de débitos',  valor:tipo.exemplos,                 obs:'Categoria identificada pelo motor' },
    { label:'Número da CDA',        valor:cda.numero||'Não informado',   obs:cda.numero?'✅ Identificada':'⚠️ Ausente (art. 202, I CTN)' },
    { label:'Tributo',              valor:cda.tributo||'Não informado',  obs:cda.tributo?'✅ Identificado':'⚠️ Ausente — requisito de certeza' },
    { label:'Valor',                valor:cda.valor||'Não informado',    obs:cda.valor?'✅ Informado':'⚠️ Ausente — requisito de liquidez' },
    { label:'Data de constituição', valor:fmtData(cda.data_constituicao),obs:cda.data_constituicao?'✅ Informada':'⚠️ Ausente' },
    { label:'Data de inscrição',    valor:fmtData(cda.data_inscricao),   obs:cda.data_inscricao?'✅ Informada':'⚠️ Ausente' },
    { label:'Teses aplicáveis',     valor:`${teses.length} identificadas`,obs:teses.slice(0,2).join('; ')+'...' },
    { label:'Problemas',            valor:`${problemas.length} item(ns)`, obs:problemas.join('; ')||'Nenhum problema identificado' },
  ]
  if (problemas.length===0) return { conclusao:'cda_ok', titulo:'✅ CDA sem vícios aparentes', cor:'#16A34A', passos, teses, justificativa:'A CDA apresenta todos os requisitos formais verificáveis com base nos dados informados.' }
  return { conclusao:'cda_vicio', titulo:'⚠️ Possíveis vícios na CDA', cor:'#DC2626', passos, teses, justificativa:`Foram identificados ${problemas.length} ponto(s) que merecem verificação: ${problemas.join('; ')}.` }
}

function gerarParecer(resultados) {
  const parecer = []; let urgente = false
  resultados.forEach((a,i) => {
    const num = `CDA ${i+1}${a.cda.numero?` (${a.cda.numero})`:''}`
    if(a.decadencia.conclusao==='ha_decadencia')                            { parecer.push({tipo:'danger',msg:`${num}: Decadência identificada — crédito potencialmente extinto.`}); urgente=true }
    if(a.prescricao.conclusao==='ha_prescricao')                            { parecer.push({tipo:'danger',msg:`${num}: Prescrição identificada — execução potencialmente extinta.`}); urgente=true }
    if(a.prescricaoIntercorrente.conclusao==='ha_prescricao_intercorrente') { parecer.push({tipo:'danger',msg:`${num}: Prescrição intercorrente — verificar imediatamente.`}); urgente=true }
    if(a.validadeCDA.conclusao==='cda_vicio')   parecer.push({tipo:'warning',msg:`${num}: Possíveis vícios formais na CDA.`})
    if(a.decadencia.conclusao==='indefinida')   parecer.push({tipo:'warning',msg:`${num}: Decadência inconclusiva — complementar dados.`})
    if(a.prescricao.conclusao==='indefinida')   parecer.push({tipo:'warning',msg:`${num}: Prescrição inconclusiva — informar citação e ajuizamento.`})
  })
  return { parecer, urgente }
}

function ResultadoAnalise({ resultado }) {
  const [expandido, setExpandido] = useState(false)
  if (!resultado) return null
  const isNeg = resultado.conclusao.includes('ha_')||resultado.conclusao==='cda_vicio'
  const isIndef = resultado.conclusao==='indefinida'
  return (
    <div style={{background:isNeg?'#FEF2F2':isIndef?'#FFFBEB':'#F0FDF4',border:`1px solid ${resultado.cor}33`,borderLeft:`4px solid ${resultado.cor}`,borderRadius:10,padding:'14px 18px',marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}} onClick={()=>setExpandido(!expandido)}>
        <span style={{fontSize:14,fontWeight:700,color:resultado.cor}}>{resultado.titulo}</span>
        <span style={{fontSize:12,color:C.muted}}>{expandido?'▲ Ocultar':'▼ Ver raciocínio'}</span>
      </div>
      {resultado.justificativa&&<div style={{fontSize:13,color:C.text,marginTop:8,lineHeight:1.7}}>{resultado.justificativa}</div>}
      {resultado.teses&&resultado.teses.length>0&&(
        <div style={{marginTop:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Teses aplicáveis</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {resultado.teses.map((t,i)=><span key={i} style={{background:'#EFF6FF',color:'#1E40AF',padding:'3px 8px',borderRadius:12,fontSize:11,fontWeight:500}}>{t}</span>)}
          </div>
        </div>
      )}
      {expandido&&resultado.passos&&(
        <div style={{marginTop:12,background:'rgba(255,255,255,0.7)',borderRadius:8,padding:'12px 16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:10,textTransform:'uppercase',letterSpacing:1}}>Raciocínio jurídico aplicado</div>
          {resultado.passos.map((p,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'180px 1fr 1fr',gap:8,padding:'6px 0',borderBottom:i<resultado.passos.length-1?`1px solid ${C.border}33`:'none',fontSize:12}}>
              <span style={{color:C.muted,fontWeight:500}}>{p.label}</span>
              <span style={{color:C.text,fontWeight:600}}>{p.valor}</span>
              <span style={{color:C.muted,fontStyle:'italic'}}>{p.obs}</span>
            </div>
          ))}
        </div>
      )}
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

function ScoreDividaAtiva({ score }) {
  const cor = score>=70?'#16A34A':score>=40?'#D97706':'#DC2626'
  const label = score>=70?'Alto potencial de regularização':score>=40?'Potencial moderado':'Situação crítica'
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

export default function DiagnosticoDividaAtiva({ active }) {
  const [tela, setTela] = useState('historico')
  const [aba, setAba] = useState(0)
  const [historico, setHistorico] = useState([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [registroId, setRegistroId] = useState(null)
  const [analisesCDA, setAnalisesCDA] = useState([])
  const [diagnostico, setDiagnostico] = useState(null)
  const [analisando, setAnalisando] = useState(false)
  const [dados, setDados] = useState({ cnpj:active?.cnpj||'', valor_total:'', orgao_credor:'PGFN', processo_execucao:'', possui_parcelamento:false, possui_transacao_anterior:false, possui_garantia:false, possui_penhora:false, possui_bloqueio:false, possui_embargos:false, observacoes:'' })
  const [cdas, setCdas] = useState([{...CDA_VAZIA}])
  const [sim, setSim] = useState({ valor:'', modalidade:'transacao_edital', desconto_multa:50, desconto_juros:50, parcelas:60, entrada_pct:5, multa_pct:20, juros_pct:30 })
  const [simResult, setSimResult] = useState(null)

  useEffect(()=>{ carregarHistorico() },[active])

  async function carregarHistorico() {
    setLoadingHist(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      let q = supabase.from('divida_ativa').select('*').eq('usuario_id',user.id).order('created_at',{ascending:false})
      if(active?.id) q = q.eq('cliente_id',active.id)
      const { data } = await q
      if(data) setHistorico(data)
    } catch(e){}
    setLoadingHist(false)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const payload = { usuario_id:user.id, cliente_id:active?.id||null, razao_social:active?.razao_social||'', cnpj:dados.cnpj, valor_total:dados.valor_total, orgao_credor:dados.orgao_credor, processo_execucao:dados.processo_execucao, possui_parcelamento:dados.possui_parcelamento, possui_transacao_anterior:dados.possui_transacao_anterior, possui_garantia:dados.possui_garantia, possui_penhora:dados.possui_penhora, possui_bloqueio:dados.possui_bloqueio, possui_embargos:dados.possui_embargos, observacoes:dados.observacoes, cdas, diagnostico, score:diagnostico?.score||null, updated_at:new Date().toISOString() }
      if(registroId){ await supabase.from('divida_ativa').update(payload).eq('id',registroId) }
      else { const { data } = await supabase.from('divida_ativa').insert([payload]).select(); if(data?.[0]) setRegistroId(data[0].id) }
      await carregarHistorico()
      alert('✅ Diagnóstico salvo!')
    } catch(e){ alert('Erro: '+e.message) }
    setSalvando(false)
  }

  async function excluirRegistro(id) {
    if(!window.confirm('Excluir este diagnóstico?')) return
    await supabase.from('divida_ativa').delete().eq('id',id)
    await carregarHistorico()
  }

  async function duplicarRegistro(reg) {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      await supabase.from('divida_ativa').insert([{...reg,id:undefined,usuario_id:user.id,razao_social:(reg.razao_social||'')+'  (cópia)',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}])
      await carregarHistorico(); alert('✅ Duplicado!')
    } catch(e){ alert('Erro: '+e.message) }
  }

  function abrirRegistro(reg) {
    setDados({ cnpj:reg.cnpj||'', valor_total:reg.valor_total||'', orgao_credor:reg.orgao_credor||'PGFN', processo_execucao:reg.processo_execucao||'', possui_parcelamento:reg.possui_parcelamento||false, possui_transacao_anterior:reg.possui_transacao_anterior||false, possui_garantia:reg.possui_garantia||false, possui_penhora:reg.possui_penhora||false, possui_bloqueio:reg.possui_bloqueio||false, possui_embargos:reg.possui_embargos||false, observacoes:reg.observacoes||'' })
    setCdas(reg.cdas?.length>0?reg.cdas:[{...CDA_VAZIA}])
    setDiagnostico(reg.diagnostico||null); setAnalisesCDA([])
    setRegistroId(reg.id); setAba(0); setTela('form')
  }

  function novoRegistro() {
    setDados({ cnpj:active?.cnpj||'', valor_total:'', orgao_credor:'PGFN', processo_execucao:'', possui_parcelamento:false, possui_transacao_anterior:false, possui_garantia:false, possui_penhora:false, possui_bloqueio:false, possui_embargos:false, observacoes:'' })
    setCdas([{...CDA_VAZIA}]); setDiagnostico(null); setAnalisesCDA([])
    setRegistroId(null); setAba(0); setTela('form')
  }

  function executarDiagnostico() {
    setAnalisando(true)
    const resultados = cdas.map(cda => ({ cda, decadencia:analisarDecadencia(cda), prescricao:analisarPrescricao(cda), prescricaoIntercorrente:analisarPrescricaoIntercorrente(cda), validadeCDA:analisarCDA(cda) }))
    const { parecer, urgente } = gerarParecer(resultados)
    let score = 50
    resultados.forEach(r => {
      if(r.decadencia.conclusao==='ha_decadencia') score+=25
      if(r.prescricao.conclusao==='ha_prescricao') score+=25
      if(r.prescricaoIntercorrente.conclusao==='ha_prescricao_intercorrente') score+=15
      if(r.validadeCDA.conclusao==='cda_vicio') score+=10
    })
    score = Math.min(100, score)
    setTimeout(()=>{ setAnalisesCDA(resultados); setDiagnostico({ parecer, urgente, score, valor:parseFloat((dados.valor_total||'').replace(/\./g,'').replace(',','.'))||0, data:new Date().toISOString() }); setAnalisando(false); setAba(2) },1500)
  }

  function calcularSimulacao() {
    const valor=parseFloat(sim.valor)||0; const multa=valor*(sim.multa_pct/100); const juros=valor*(sim.juros_pct/100)
    const descMulta=multa*(sim.desconto_multa/100); const descJuros=juros*(sim.desconto_juros/100)
    const totalDesconto=descMulta+descJuros; const valorFinal=valor-totalDesconto
    const entrada=valorFinal*(sim.entrada_pct/100); const saldo=valorFinal-entrada
    const parcela=sim.parcelas>1?saldo/(sim.parcelas-1):saldo
    setSimResult({multa,juros,descMulta,descJuros,totalDesconto,valorFinal,entrada,parcela,economia:totalDesconto})
  }

  function gerarRelatorio() {
    if(!diagnostico||analisesCDA.length===0){alert('Execute o diagnóstico antes.');return}
    const linhas=['╔══════════════════════════════════════════════════════════════╗','║      FISCALTRIB — PARECER TÉCNICO — DÍVIDA ATIVA (PGFN)     ║','╚══════════════════════════════════════════════════════════════╝','',`Cliente: ${active?.razao_social||dados.cnpj}`,`CNPJ: ${dados.cnpj}`,`Data: ${new Date().toLocaleDateString('pt-BR')}`,`Score: ${diagnostico.score}/100`,'','═══ PARECER FINAL ════════════════════════════════════════════',...diagnostico.parecer.map(p=>`${p.tipo==='danger'?'⚠️':'ℹ️'} ${p.msg}`),'']
    analisesCDA.forEach((a,i)=>{
      linhas.push(`═══ CDA ${i+1}: ${a.cda.numero||'Sem número'} — ${TIPOS_CREDITO.find(t=>t.key===a.cda.tipo_credito)?.label||''} ═══`)
      linhas.push(`Tributo: ${a.cda.tributo||'—'} | Valor: ${a.cda.valor||'—'}`)
      linhas.push('',`── DECADÊNCIA: ${a.decadencia.titulo}`,a.decadencia.justificativa||'')
      linhas.push('',`── PRESCRIÇÃO: ${a.prescricao.titulo}`,a.prescricao.justificativa||'')
      linhas.push('',`── PRESCRIÇÃO INTERCORRENTE: ${a.prescricaoIntercorrente.titulo}`,a.prescricaoIntercorrente.justificativa||'')
      linhas.push('',`── VALIDADE DA CDA: ${a.validadeCDA.titulo}`,a.validadeCDA.justificativa||'')
      linhas.push('','── TESES APLICÁVEIS:',...(TESES_POR_TIPO[a.cda.tipo_credito]||[]).map(t=>`  • ${t}`))
      linhas.push('','── RACIOCÍNIO — DECADÊNCIA:',...(a.decadencia.passos||[]).map(p=>`  ${p.label}: ${p.valor} — ${p.obs}`))
      linhas.push('','── RACIOCÍNIO — PRESCRIÇÃO:',...(a.prescricao.passos||[]).map(p=>`  ${p.label}: ${p.valor} — ${p.obs}`),'')
    })
    linhas.push('Gerado por FiscalTrib — fiscaltrib.com.br','Parecer preliminar — não substitui análise jurídica profissional.')
    const blob=new Blob([linhas.join('\n')],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a')
    a.href=url;a.download=`Parecer_DividaAtiva_${dados.cnpj||'cliente'}_${hoje}.txt`;a.click();URL.revokeObjectURL(url)
  }

  const btnPrimary={padding:'10px 20px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}
  const btnOutline={padding:'10px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}
  const btnDanger ={padding:'6px 16px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:500}

  const inp = (k,ph,tp='text') => {
    const handleChange = e => {
      let v=e.target.value
      if(k==='cnpj'){ v=v.replace(/\D/g,'').slice(0,14); v=v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3/$4').replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/,'$1.$2.$3/$4-$5') }
      if(k==='processo_execucao'){ v=v.replace(/\D/g,'').slice(0,20); v=v.replace(/^(\d{7})(\d)/,'$1-$2').replace(/^(\d{7})-(\d{2})(\d)/,'$1-$2.$3').replace(/^(\d{7})-(\d{2})\.(\d{4})(\d)/,'$1-$2.$3.$4').replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d{1})(\d)/,'$1-$2.$3.$4.$5') }
      setDados({...dados,[k]:v})
    }
    const handleBlur = e => { if(k==='valor_total'){ const raw=e.target.value.replace(/\./g,'').replace(',','.'); const n=parseFloat(raw)||0; if(n>0) setDados(d=>({...d,valor_total:n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})})) } }
    return <input value={dados[k]} onChange={handleChange} onBlur={handleBlur} placeholder={ph} type={tp} style={{padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}}/>
  }

  const addCDA = () => setCdas([...cdas,{...CDA_VAZIA}])
  const removeCDA = i => setCdas(cdas.filter((_,idx)=>idx!==i))
  const updateCDA = (i,k,v) => { const novo=[...cdas]; novo[i]={...novo[i],[k]:v}; setCdas(novo) }

  const ABAS = ['📋 Visão Geral','🔍 Dados da Dívida','🧠 Diagnóstico Inteligente','⚡ Estratégias','📊 Simulador','📄 Parecer']

  // ── TELA HISTÓRICO ────────────────────────────────────────────────────────
  if(tela==='historico') return (
    <div style={{maxWidth:960,margin:'0 auto'}}>
      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:16,padding:'28px 32px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — DIAGNÓSTICO</div>
        <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,color:'#fff'}}>⚖️ Diagnóstico da Dívida Ativa</h1>
        <p style={{fontSize:14,color:'#cbd5e1',margin:0}}>Motor de inteligência jurídica · Decadência · Prescrição · Validade da CDA</p>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>📂 Diagnósticos salvos{active?` — ${active.razao_social}`:''}</div>
        <button onClick={novoRegistro} style={btnPrimary}>+ Novo diagnóstico</button>
      </div>

      {loadingHist ? (
        <div style={{textAlign:'center',padding:48,color:C.muted}}>Carregando...</div>
      ) : historico.length===0 ? (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>⚖️</div>
          <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:8}}>Nenhum diagnóstico ainda</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Clique em "Novo diagnóstico" para iniciar uma análise.</div>
          <button onClick={novoRegistro} style={btnPrimary}>+ Novo diagnóstico</button>
        </div>
      ) : (
        <div>
          {historico.map(reg => {
            const tipoPrincipal = reg.cdas?.[0]?.tipo_credito
            const tipoLabel = TIPOS_CREDITO.find(t=>t.key===tipoPrincipal)?.label || 'Tributário Federal'
            const scoreCor = reg.score>=70?'#16A34A':reg.score>=40?'#D97706':'#DC2626'
            const scoreBg  = reg.score>=70?'#DCFCE7':reg.score>=40?'#FEF9C3':'#FEE2E2'
            return (
              <div key={reg.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 22px',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>{reg.razao_social||reg.cnpj||'—'}</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:10}}>
                      {reg.cnpj||'—'} · {reg.orgao_credor||'PGFN'}{reg.processo_execucao?` · ${reg.processo_execucao}`:''}
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <span style={{background:'#dbeafe',color:'#1e40af',padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:600}}>• {tipoLabel}</span>
                      {reg.cdas?.length>0&&<span style={{background:'#f1f5f9',color:C.muted,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:600}}>{reg.cdas.length} CDA{reg.cdas.length>1?'s':''}</span>}
                      {reg.score&&<span style={{background:scoreBg,color:scoreCor,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>Score {reg.score}/100</span>}
                      {reg.diagnostico?.urgente&&<span style={{background:'#FEE2E2',color:'#991B1B',padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:600}}>⚠️ Urgente</span>}
                      <span style={{background:'#f1f5f9',color:C.muted,padding:'3px 12px',borderRadius:20,fontSize:11}}>{new Date(reg.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right',marginLeft:24,flexShrink:0}}>
                    <div style={{fontSize:20,fontWeight:700,color:'#16A34A',marginBottom:2}}>{reg.valor_total||'R$ 0,00'}</div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:14}}>valor da dívida</div>
                    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                      <button onClick={()=>abrirRegistro(reg)} style={{padding:'6px 16px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:500}}>Editar</button>
                      <button onClick={()=>{abrirRegistro(reg);setTimeout(()=>setAba(2),100)}} style={{padding:'6px 16px',background:C.navy,color:C.white,border:'none',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:600}}>Analisar</button>
                      <button onClick={()=>excluirRegistro(reg.id)} style={btnDanger}>🗑️ Excluir</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── TELA FORMULÁRIO ───────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:960,margin:'0 auto'}}>
      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:16,padding:'28px 32px',color:'#fff',marginBottom:20}}>
        <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — DIAGNÓSTICO</div>
        <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,color:'#fff'}}>⚖️ Diagnóstico da Dívida Ativa</h1>
        <p style={{fontSize:14,color:'#cbd5e1',margin:0}}>Motor de inteligência jurídica · Análise especializada por tipo de crédito</p>
        {active&&<div style={{marginTop:12,background:'rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 14px',display:'inline-flex',gap:16,fontSize:12,color:'#e2e8f0'}}>
          <span>👤 {active.razao_social}</span><span>·</span><span>{active.cnpj}</span><span>·</span><span>{active.regime}</span>
        </div>}
      </div>

      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <button onClick={()=>setTela('historico')} style={{...btnOutline,padding:'7px 16px',fontSize:13}}>← Voltar</button>
        <button onClick={salvar} disabled={salvando} style={{...btnPrimary,padding:'7px 16px',fontSize:13,opacity:salvando?0.7:1}}>{salvando?'💾 Salvando...':'💾 Salvar'}</button>
        {registroId&&<span style={{fontSize:12,color:'#16A34A',alignSelf:'center'}}>✅ Salvo</span>}
      </div>

      <TabInterna tabs={ABAS} active={aba} onTab={setAba} />

      {/* ABA 0 — VISÃO GERAL */}
      {aba===0&&<>
        {!diagnostico?(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'32px',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>⚖️</div>
            <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:8}}>Nenhum diagnóstico realizado ainda</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Acesse "Dados da Dívida", preencha os dados e execute o diagnóstico.</div>
            <button onClick={()=>setAba(1)} style={btnPrimary}>Inserir dados →</button>
          </div>
        ):<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <ScoreDividaAtiva score={diagnostico.score}/>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px'}}>
              <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:12,textTransform:'uppercase',letterSpacing:1}}>Resumo</div>
              {[['Valor total',dados.valor_total||'—','#DC2626'],['CDAs analisadas',cdas.length,'#0B1F4D'],['Órgão',dados.orgao_credor,'#0B1F4D'],['Data da análise',new Date(diagnostico.data).toLocaleDateString('pt-BR'),'#0B1F4D']].map(([lb,val,cor])=>(
                <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:13,color:C.muted}}>{lb}</span>
                  <span style={{fontSize:14,fontWeight:700,color:cor}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          {diagnostico.parecer.length>0&&<div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:10}}>📋 Parecer Final</div>
            {diagnostico.parecer.map((p,i)=>(
              <div key={i} style={{background:p.tipo==='danger'?'#FEF2F2':'#FFFBEB',border:`1px solid ${p.tipo==='danger'?'#FECACA':'#FCD34D'}`,borderRadius:8,padding:'10px 16px',marginBottom:8,fontSize:13,color:p.tipo==='danger'?'#991B1B':'#92400E'}}>{p.msg}</div>
            ))}
          </div>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setAba(2)} style={btnPrimary}>Ver diagnóstico completo →</button>
            <button onClick={()=>setAba(5)} style={btnOutline}>📄 Gerar parecer</button>
          </div>
        </>}
      </>}

      {/* ABA 1 — DADOS DA DÍVIDA */}
      {aba===1&&<>
        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#1E40AF'}}>
          ℹ️ <strong>Modo manual.</strong> Preencha o máximo de campos possível para que o motor de inteligência realize a análise mais completa e precisa.
        </div>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>📋 Dados Gerais</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>CNPJ</label>{inp('cnpj','00.000.000/0001-00')}</div>
            <div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Valor total da dívida (R$)</label>{inp('valor_total','Ex: 250.000,00')}</div>
            <div>
              <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Órgão credor</label>
              <select value={dados.orgao_credor} onChange={e=>setDados({...dados,orgao_credor:e.target.value})} style={{padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%'}}>
                <option>PGFN</option><option>Receita Federal</option><option>Estado</option><option>Município</option><option>Outro</option>
              </select>
            </div>
            <div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Processo de execução fiscal</label>{inp('processo_execucao','Ex: 0001234-56.2019.4.03.6100')}</div>
          </div>
        </div>

        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy}}>📄 CDAs — Certidões de Dívida Ativa</div>
            <button onClick={addCDA} style={{...btnPrimary,padding:'6px 14px',fontSize:12}}>+ Adicionar CDA</button>
          </div>
          {cdas.map((cda,i)=>(
            <div key={i} style={{background:'#F8FAFC',borderRadius:10,border:`1px solid ${C.border}`,padding:'16px 20px',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:C.navy}}>CDA {i+1}</div>
                {cdas.length>1&&<button onClick={()=>removeCDA(i)} style={{...btnDanger}}>🗑️ Remover</button>}
              </div>
              <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8,padding:'12px 16px',marginBottom:14}}>
                <label style={{fontSize:13,fontWeight:700,display:'block',marginBottom:8,color:C.navy}}>🏷️ Tipo de Crédito *</label>
                <select value={cda.tipo_credito} onChange={e=>updateCDA(i,'tipo_credito',e.target.value)} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',marginBottom:6}}>
                  {TIPOS_CREDITO.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                {TIPOS_CREDITO.find(t=>t.key===cda.tipo_credito)&&(
                  <div style={{fontSize:11,color:'#1E40AF',marginTop:4}}>
                    📖 {TIPOS_CREDITO.find(t=>t.key===cda.tipo_credito)?.legislacao} · Ex: {TIPOS_CREDITO.find(t=>t.key===cda.tipo_credito)?.exemplos}
                  </div>
                )}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Número da CDA</label><input value={cda.numero} onChange={e=>updateCDA(i,'numero',e.target.value)} placeholder="Ex: 80 4 00001234-9" style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Tributo / Descrição</label><input value={cda.tributo} onChange={e=>updateCDA(i,'tributo',e.target.value)} placeholder="IRPJ, CSLL, INSS..." style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Valor da CDA (R$)</label><input value={cda.valor} onChange={e=>updateCDA(i,'valor',e.target.value)} placeholder="Ex: 85.000,00" style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%',boxSizing:'border-box'}}/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Modalidade do lançamento</label>
                  <select value={cda.modalidade_lancamento} onChange={e=>updateCDA(i,'modalidade_lancamento',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}>
                    <option value="oficio">De ofício / Declaração (art. 173 CTN)</option>
                    <option value="homologacao">Por homologação (art. 150 CTN)</option>
                  </select>
                </div>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Data do fato gerador</label><input type="date" value={cda.data_fato_gerador} onChange={e=>updateCDA(i,'data_fato_gerador',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}/></div>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Data da constituição definitiva</label><input type="date" value={cda.data_constituicao} onChange={e=>updateCDA(i,'data_constituicao',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Data de inscrição em DA</label><input type="date" value={cda.data_inscricao} onChange={e=>updateCDA(i,'data_inscricao',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}/></div>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Data do ajuizamento</label><input type="date" value={cda.data_ajuizamento} onChange={e=>updateCDA(i,'data_ajuizamento',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}/></div>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Data da citação válida</label><input type="date" value={cda.data_citacao} onChange={e=>updateCDA(i,'data_citacao',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Data da última movimentação</label><input type="date" value={cda.data_ultima_movimentacao} onChange={e=>updateCDA(i,'data_ultima_movimentacao',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}/></div>
                <div>
                  <label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Situação</label>
                  <select value={cda.situacao} onChange={e=>updateCDA(i,'situacao',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}>
                    <option>Ativa</option><option>Garantida</option><option>Parcelada</option><option>Suspensa</option><option>Extinta</option>
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {[['possui_parcelamento','Parcelamento ativo'],['possui_suspensao','Suspensão da exigibilidade'],['possui_garantia','Garantia prestada'],['possui_penhora','Penhora de bens'],['possui_embargos','Embargos à execução']].map(([k,lb])=>(
                  <label key={k} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.text,cursor:'pointer'}}>
                    <input type="checkbox" checked={cda[k]} onChange={e=>updateCDA(i,k,e.target.checked)} style={{accentColor:C.navy,width:14,height:14}}/>{lb}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:12}}>📝 Observações</div>
          <textarea value={dados.observacoes} onChange={e=>setDados({...dados,observacoes:e.target.value})} placeholder="Informações complementares..." style={{width:'100%',padding:'10px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,minHeight:80,resize:'vertical',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={executarDiagnostico} disabled={analisando} style={{...btnPrimary,opacity:analisando?0.7:1}}>{analisando?'🔄 Analisando...':'🧠 Executar diagnóstico inteligente →'}</button>
          <button onClick={salvar} disabled={salvando} style={btnOutline}>{salvando?'Salvando...':'💾 Salvar'}</button>
        </div>
      </>}

      {/* ABA 2 — DIAGNÓSTICO */}
      {aba===2&&<>
        {analisesCDA.length===0?(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'32px',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>🧠</div>
            <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Diagnóstico não executado</div>
            <button onClick={()=>setAba(1)} style={btnPrimary}>Inserir dados →</button>
          </div>
        ):<>
          {analisesCDA.map((a,i)=>(
            <div key={i} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <div style={{fontSize:15,fontWeight:700,color:C.navy}}>CDA {i+1}{a.cda.numero?` — ${a.cda.numero}`:''}</div>
                <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>{TIPOS_CREDITO.find(t=>t.key===a.cda.tipo_credito)?.label||'—'}</span>
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{a.cda.tributo||'Tributo não informado'} · {a.cda.valor||'Valor não informado'} · {a.cda.situacao}</div>
              <ResultadoAnalise resultado={a.decadencia}/>
              <ResultadoAnalise resultado={a.prescricao}/>
              <ResultadoAnalise resultado={a.prescricaoIntercorrente}/>
              <ResultadoAnalise resultado={{...a.validadeCDA,teses:TESES_POR_TIPO[a.cda.tipo_credito]||[]}}/>
            </div>
          ))}
          <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'14px 18px',fontSize:12,color:'#166534',marginBottom:16}}>
            💡 Clique em "▼ Ver raciocínio" para ver o passo a passo do raciocínio jurídico aplicado.
          </div>
          <button onClick={()=>setAba(5)} style={btnPrimary}>📄 Gerar parecer técnico →</button>
        </>}
      </>}

      {/* ABA 3 — ESTRATÉGIAS */}
      {aba===3&&<>
        <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#166534'}}>
          ✅ Modalidades baseadas nas regras vigentes da PGFN — Portaria 6.757/2022 e editais em vigor.
        </div>
        {MODALIDADES_PGFN.map(m=>(
          <div key={m.key} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,borderLeft:'5px solid #0B1F4D',padding:'18px 22px',marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:8}}>{m.label}</div>
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
        ))}
      </>}

      {/* ABA 4 — SIMULADOR */}
      {aba===4&&<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>⚙️ Parâmetros</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Valor total (R$)</label><input value={sim.valor} onChange={e=>setSim({...sim,valor:e.target.value})} type="number" placeholder="Ex: 500000" style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}}/></div>
              <div>
                <label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Modalidade</label>
                <select value={sim.modalidade} onChange={e=>{const m=MODALIDADES_PGFN.find(x=>x.key===e.target.value);setSim({...sim,modalidade:e.target.value,desconto_multa:m.desconto_multa[1],desconto_juros:m.desconto_juros[1],entrada_pct:m.entrada_min||5,parcelas:m.parcelas_max})}} style={{padding:'8px 12px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%'}}>
                  {MODALIDADES_PGFN.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              {[['% multa','multa_pct',0,80],['% juros','juros_pct',0,80],['Desconto multa (%)','desconto_multa',0,100],['Desconto juros (%)','desconto_juros',0,100],['Entrada (%)','entrada_pct',0,30],['Parcelas','parcelas',1,120]].map(([lb,k,min,max])=>(
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
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>Valor final</span><span style={{fontSize:18,fontWeight:700,color:'#16A34A'}}>{fmtR(simResult.valorFinal)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Economia total</span><span style={{fontSize:14,fontWeight:700,color:'#16A34A'}}>{fmtR(simResult.economia)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted}}>Entrada ({sim.entrada_pct}%)</span><span style={{fontSize:13,fontWeight:600,color:C.navy}}>{fmtR(simResult.entrada)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:13,color:C.muted}}>{sim.parcelas>1?sim.parcelas-1:'1'} parcela(s) de</span><span style={{fontSize:13,fontWeight:600,color:C.navy}}>{fmtR(simResult.parcela)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>}

      {/* ABA 5 — PARECER */}
      {aba===5&&<>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'24px',marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:4}}>📄 Parecer Técnico — Dívida Ativa (PGFN)</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{new Date().toLocaleDateString('pt-BR')} · {active?.razao_social||dados.cnpj}</div>
          {!diagnostico||analisesCDA.length===0?(
            <div style={{textAlign:'center',padding:'32px 0'}}>
              <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
              <div style={{fontSize:14,color:C.muted,marginBottom:16}}>Execute o diagnóstico antes de gerar o parecer.</div>
              <button onClick={()=>setAba(1)} style={btnPrimary}>Inserir dados →</button>
            </div>
          ):<>
            <div style={{background:diagnostico.urgente?'#FEF2F2':'#F0FDF4',border:`1px solid ${diagnostico.urgente?'#FECACA':'#86EFAC'}`,borderRadius:10,padding:'16px 20px',marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:700,color:diagnostico.urgente?'#991B1B':'#166534',marginBottom:10}}>
                {diagnostico.urgente?'⚠️ Irregularidades identificadas — ação urgente recomendada':'✅ Sem irregularidades graves identificadas'}
              </div>
              {diagnostico.parecer.map((p,i)=>(
                <div key={i} style={{fontSize:13,color:p.tipo==='danger'?'#991B1B':'#92400E',marginBottom:4}}>• {p.msg}</div>
              ))}
            </div>
            {analisesCDA.map((a,i)=>(
              <div key={i} style={{borderLeft:`4px solid ${C.navy}`,paddingLeft:16,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:4}}>CDA {i+1}{a.cda.numero?` — ${a.cda.numero}`:''}</div>
                <div style={{fontSize:12,color:'#1E40AF',marginBottom:12}}>{TIPOS_CREDITO.find(t=>t.key===a.cda.tipo_credito)?.label} · {TIPOS_CREDITO.find(t=>t.key===a.cda.tipo_credito)?.legislacao}</div>
                {[['Decadência',a.decadencia],['Prescrição',a.prescricao],['Prescrição Intercorrente',a.prescricaoIntercorrente],['Validade da CDA',a.validadeCDA]].map(([titulo,res])=>(
                  <div key={titulo} style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>{titulo}</div>
                    <div style={{fontSize:13,fontWeight:700,color:res.cor,marginBottom:4}}>{res.titulo}</div>
                    <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>{res.justificativa}</div>
                  </div>
                ))}
                <div style={{marginTop:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Teses aplicáveis</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {(TESES_POR_TIPO[a.cda.tipo_credito]||[]).map((t,j)=><span key={j} style={{background:'#EFF6FF',color:'#1E40AF',padding:'3px 8px',borderRadius:12,fontSize:11,fontWeight:500}}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
            <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'12px 16px',fontSize:12,color:'#92400E',marginBottom:16}}>
              ⚠️ Parecer preliminar — não substitui análise jurídica profissional. Recomenda-se validação por advogado tributarista habilitado.
            </div>
            <button onClick={gerarRelatorio} style={btnPrimary}>⬇️ Baixar parecer (.txt)</button>
          </>}
        </div>
      </>}
    </div>
  )
}