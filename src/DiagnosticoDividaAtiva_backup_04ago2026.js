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
const fmtDateTime = d => d ? new Date(d).toLocaleString('pt-BR') : '—'
const parseValor = v => {
  const s = String(v||0)
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g,'').replace(',','.')) || 0
  if (s.includes(',')) return parseFloat(s.replace(',','.')) || 0
  return parseFloat(s) || 0
}

function converterDataBR(d) {
  if (!d) return ''
  const partes = d.split('/')
  if (partes.length === 3) return `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`
  return ''
}

function normalizarData(d) {
  if (!d) return ''
  if (d.includes('-') && d.length === 10) return d
  return converterDataBR(d)
}

function migrarCDA(cda) {
  let migrada = cda
  if (!('numero_cda' in migrada)) migrada = { ...migrada, numero_cda: '' }

  if (migrada.inscricoes && migrada.inscricoes.length>0 && 'tipo_credito' in (migrada.inscricoes[0]||{})) return migrada
  const tipoPadrao = migrada.tipo_credito || 'tributario_federal'
  if (migrada.inscricoes) {
    return { ...migrada, inscricoes: migrada.inscricoes.map(ins=>({...ins, tipo_credito: ins.tipo_credito||tipoPadrao})) }
  }
  if (migrada.numeros) {
    return { ...migrada, inscricoes: migrada.numeros.map(n=>({numero:n,valor:'',tipo_credito:tipoPadrao})) }
  }
  const { numero } = migrada
  return { ...migrada, inscricoes: [{numero: numero||'', valor:'', tipo_credito:tipoPadrao}] }
}
function migrarListaCDAs(lista) {
  if (!lista || lista.length===0) return [{...CDA_VAZIA}]
  return lista.map(migrarCDA)
}

const TIPOS_CREDITO = [
  { key:'tributario_federal',    label:'Tributário Federal',              legislacao:'CTN + Lei 6.830/80',            exemplos:'IRPJ, CSLL, PIS, COFINS, IPI, IOF' },
  { key:'previdenciario',        label:'Previdenciário',                  legislacao:'Lei 8.212/91 + CTN',            exemplos:'INSS empresa, retenções, contribuições sociais' },
  { key:'fgts',                  label:'FGTS',                           legislacao:'Lei 8.036/90 + RE 709.212 STF', exemplos:'Depósitos FGTS não recolhidos' },
  { key:'simples_nacional',      label:'Simples Nacional',                legislacao:'LC 123/2006 + CTN',             exemplos:'DAS não pagos, diferenças apuradas' },
  { key:'multa_tributaria',      label:'Multa Tributária',                legislacao:'CTN + Lei 9.430/96',            exemplos:'Multa de ofício, multa isolada, multa acessória' },
  { key:'multa_trabalhista',     label:'Multa Trabalhista',               legislacao:'CLT + Lei 6.830/80',            exemplos:'Autuações da Inspeção do Trabalho' },
  { key:'multa_ambiental',       label:'Multa Ambiental',                legislacao:'Lei 9.605/98 + Decreto 6.514',  exemplos:'Autuações IBAMA, ICMBio e órgãos ambientais' },
  { key:'nao_tributario',        label:'Crédito Não Tributário',         legislacao:'Decreto 20.910/32 + Lei 6.830', exemplos:'Multas administrativas, ressarcimentos' },
  { key:'agencia_reguladora',    label:'Crédito de Agência Reguladora',  legislacao:'Lei específica da agência',     exemplos:'ANATEL, ANEEL, ANS, ANVISA, ANP' },
  { key:'autarquia',             label:'Crédito de Autarquia/Fundação',  legislacao:'Lei específica + Decreto 20.910',exemplos:'CREA, CRM, OAB, INMETRO' },
  { key:'estados_df',            label:'Estados/Distrito Federal',       legislacao:'Legislação estadual + CTN',     exemplos:'ICMS, IPVA, ITCMD e demais tributos estaduais' },
  { key:'outro',                 label:'Outro',                          legislacao:'Legislação específica',          exemplos:'Outros créditos da União' },
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
  estados_df:         ['Decadência (art. 173 CTN)','Prescrição (art. 174 CTN)','Guerra fiscal — benefícios inconstitucionais (ICMS)','Nulidade da CDA por vício formal'],
  outro:              ['Prescrição aplicável','Nulidade formal','Proporcionalidade','Liquidez e certeza do crédito'],
}

const CDA_VAZIA = {
  numero_cda:'',
  inscricoes:[{numero:'',valor:'',tipo_credito:'tributario_federal'}],
  situacao:'Ativa',
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

function totalInscricoes(cda) {
  return (cda.inscricoes||[]).reduce((s,ins)=>s+parseValor(ins.valor),0)
}

function tipoReferenciaCDA(cda) {
  const primeira = (cda.inscricoes||[])[0]
  const key = primeira?.tipo_credito || 'tributario_federal'
  return TIPOS_CREDITO.find(t=>t.key===key) || TIPOS_CREDITO[0]
}
function tesesReferenciaCDA(cda) {
  const primeira = (cda.inscricoes||[])[0]
  const key = primeira?.tipo_credito || 'tributario_federal'
  return TESES_POR_TIPO[key] || TESES_POR_TIPO.outro
}

function rotuloCDA(cda, indice) {
  if (cda.numero_cda && cda.numero_cda.trim()) return `CDA ${cda.numero_cda}`
  const inscricoesTxt = (cda.inscricoes||[]).filter(ins=>ins.numero&&ins.numero.trim()).map(ins=>ins.numero).join(' / ')
  return `CDA ${indice+1}${inscricoesTxt?` (${inscricoesTxt})`:''}`
}

function analisarDecadencia(cda) {
  const tipo = tipoReferenciaCDA(cda)
  const { data_fato_gerador, data_constituicao, modalidade_lancamento } = cda
  if (!data_fato_gerador && !data_constituicao) return { conclusao:'indefinida', titulo:'Decadência — Análise inconclusiva', cor:'#D97706', passos:[{label:'Problema',valor:'Dados insuficientes',obs:'Informe a data do fato gerador e da constituição definitiva.'}], justificativa:'Não foi possível concluir porque não foram informadas a data do fato gerador nem a data da constituição definitiva do crédito.' }
  const artigo = modalidade_lancamento==='homologacao' ? 'art. 150, §4º do CTN' : 'art. 173, I do CTN'
  const limite = addAnos(data_fato_gerador, 5)
  const diasConst = diasEntre(data_fato_gerador, data_constituicao)
  const prazoExcedido = data_constituicao && limite && data_constituicao > limite
  const passos = [
    { label:'Natureza de referência (1ª inscrição)', valor:tipo.label,    obs:`Legislação: ${tipo.legislacao}` },
    { label:'Modalidade do lançamento',     valor:modalidade_lancamento==='homologacao'?'Por homologação':'De ofício / Declaração', obs:artigo },
    { label:'Data do fato gerador',         valor:fmtData(data_fato_gerador), obs:'Marco inicial' },
    { label:'Prazo legal',                  valor:'5 anos', obs:artigo },
    { label:'Data-limite para constituição',valor:fmtData(limite), obs:'Após essa data, o crédito é decadente' },
    { label:'Data da constituição',         valor:fmtData(data_constituicao), obs:diasConst!==null?`${diasConst} dias após o fato gerador`:'Não informada' },
    { label:'Situação',                     valor:!data_constituicao?'Não verificável':prazoExcedido?'⚠️ FORA DO PRAZO':'✅ Dentro do prazo', obs:'' },
  ]
  if (!data_constituicao) return { conclusao:'indefinida', titulo:'Decadência — Análise inconclusiva', cor:'#D97706', passos, justificativa:'Não foi possível concluir a existência de decadência porque não foi informada a data da constituição definitiva do crédito.' }
  if (prazoExcedido) return { conclusao:'ha_decadencia', titulo:'⚠️ Há decadência', cor:'#DC2626', passos, justificativa:`O crédito foi constituído em ${fmtData(data_constituicao)}, após o término do prazo decadencial de 5 anos previsto no ${artigo}, cujo limite era ${fmtData(limite)}.` }
  return { conclusao:'sem_decadencia', titulo:'✅ Não há decadência', cor:'#16A34A', passos, justificativa:`O lançamento foi constituído em ${fmtData(data_constituicao)}, dentro do prazo previsto no ${artigo}.` }
}

function analisarPrescricao(cda) {
  const tipo = tipoReferenciaCDA(cda)
  const { data_constituicao, data_ajuizamento, data_citacao, possui_parcelamento, possui_suspensao } = cda
  if (!data_constituicao) return { conclusao:'indefinida', titulo:'Prescrição — Análise inconclusiva', cor:'#D97706', passos:[{label:'Problema',valor:'Dados insuficientes',obs:'Informe a data da constituição definitiva.'}], justificativa:'Não foi possível concluir porque não foi informada a data da constituição definitiva do crédito.' }
  const limite = addAnos(data_constituicao, 5)
  const prescrito = !data_ajuizamento && !data_citacao && !possui_parcelamento && !possui_suspensao && hoje > limite
  const interrompidoCitacao = data_citacao && data_citacao <= limite
  const interrompidoAjuizamento = data_ajuizamento && data_ajuizamento <= limite
  const suspenso = possui_parcelamento || possui_suspensao
  const passos = [
    { label:'Natureza de referência (1ª inscrição)', valor:tipo.label,    obs:`Legislação: ${tipo.legislacao}` },
    { label:'Constituição definitiva',   valor:fmtData(data_constituicao), obs:'Marco inicial (art. 174 CTN)' },
    { label:'Prazo legal',               valor:'5 anos', obs:'Art. 174 CTN' },
    { label:'Data-limite',               valor:fmtData(limite), obs:'Após essa data, sem interrupção, o crédito é prescrito' },
    { label:'Data do ajuizamento',       valor:fmtData(data_ajuizamento)||'Não localizado', obs:interrompidoAjuizamento?'✅ Interrompe a prescrição':'Não localizado dentro do prazo' },
    { label:'Data da citação válida',    valor:fmtData(data_citacao)||'Não localizada', obs:interrompidoCitacao?'✅ Interrompe (art. 174, pú., I)':'Não localizada' },
    { label:'Parcelamento',              valor:possui_parcelamento?'Sim':'Não', obs:possui_parcelamento?'✅ Suspende (art. 151, VI CTN)':'Não localizado' },
    { label:'Suspensão',                 valor:possui_suspensao?'Sim':'Não', obs:possui_suspensao?'✅ Suspende o prazo':'Não localizada' },
    { label:'Situação atual',            valor:prescrito?'⚠️ CRÉDITO PRESCRITO':suspenso||interrompidoCitacao||interrompidoAjuizamento?'✅ Interrompido/Suspenso':'✅ Dentro do prazo', obs:'' },
  ]
  if (prescrito) return { conclusao:'ha_prescricao', titulo:'⚠️ Há prescrição', cor:'#DC2626', passos, justificativa:`Transcorreram mais de 5 anos entre a constituição definitiva (${fmtData(data_constituicao)}) e a data atual, sem citação válida, parcelamento ou suspensão. Data-limite: ${fmtData(limite)}.` }
  if (interrompidoCitacao) return { conclusao:'sem_prescricao', titulo:'✅ Não há prescrição', cor:'#16A34A', passos, justificativa:`O prazo prescricional foi interrompido pela citação válida em ${fmtData(data_citacao)}, nos termos do art. 174, parágrafo único, I do CTN.` }
  if (suspenso) return { conclusao:'sem_prescricao', titulo:'✅ Não há prescrição', cor:'#16A34A', passos, justificativa:`O prazo prescricional encontra-se suspenso em razão de ${possui_parcelamento?'parcelamento ativo (art. 151, VI CTN)':'suspensão da exigibilidade'}.` }
  if (!data_citacao && !data_ajuizamento) return { conclusao:'indefinida', titulo:'Prescrição — Análise inconclusiva', cor:'#D97706', passos, justificativa:'Não foi possível concluir porque não foram informadas a data da citação válida nem do ajuizamento.' }
  return { conclusao:'sem_prescricao', titulo:'✅ Não há prescrição', cor:'#16A34A', passos, justificativa:`O crédito está dentro do prazo prescricional de 5 anos. Data-limite: ${fmtData(limite)}.` }
}

function analisarPrescricaoIntercorrente(cda) {
  const { data_ajuizamento, data_ultima_movimentacao, possui_embargos, possui_penhora } = cda
  if (!data_ajuizamento) return { conclusao:'indefinida', titulo:'Prescrição Intercorrente — Inconclusiva', cor:'#D97706', passos:[{label:'Problema',valor:'Dados insuficientes',obs:'Informe a data do ajuizamento.'}], justificativa:'Não foi possível concluir porque não foi informada a data do ajuizamento da execução fiscal.' }
  const ref = data_ultima_movimentacao || data_ajuizamento
  const limite = addAnos(ref, 5)
  const diasParado = diasEntre(ref, hoje)
  const prescritoInt = !possui_embargos && !possui_penhora && hoje > limite
  const passos = [
    { label:'Data do ajuizamento',        valor:fmtData(data_ajuizamento), obs:'Início da execução fiscal' },
    { label:'Última movimentação',        valor:fmtData(data_ultima_movimentacao)||'Não informada', obs:'Marco da paralisação' },
    { label:'Período de paralisação',     valor:diasParado!==null?`${diasParado} dias`:'Não calculável', obs:'Art. 40 Lei 6.830/80 — Súmula 314 STJ' },
    { label:'Data-limite (5 anos)',       valor:fmtData(limite), obs:'Após esse prazo sem movimentação útil' },
    { label:'Penhora de bens',            valor:possui_penhora?'Sim':'Não', obs:possui_penhora?'✅ Movimentação ativa':'Não localizada' },
    { label:'Embargos à execução',        valor:possui_embargos?'Sim':'Não', obs:possui_embargos?'✅ Impulso processual':'Não localizados' },
    { label:'Situação',                   valor:prescritoInt?'⚠️ POSSÍVEL PRESCRIÇÃO INTERCORRENTE':'✅ Sem prescrição intercorrente', obs:'' },
  ]
  if (prescritoInt) return { conclusao:'ha_prescricao_intercorrente', titulo:'⚠️ Possível prescrição intercorrente', cor:'#DC2626', passos, justificativa:`Processo sem movimentação útil por mais de 5 anos desde ${fmtData(ref)}, sem atos processuais capazes de interromper o prazo (art. 40 da Lei 6.830/80 e Súmula 314 STJ).` }
  return { conclusao:'sem_prescricao_intercorrente', titulo:'✅ Sem prescrição intercorrente', cor:'#16A34A', passos, justificativa:`Não foi identificada prescrição intercorrente porque ${possui_penhora||possui_embargos?'o processo apresenta movimentação ativa':'o processo está dentro do prazo legal'}.` }
}

function analisarCDA(cda) {
  const tipo = tipoReferenciaCDA(cda)
  const teses = tesesReferenciaCDA(cda)
  const problemas = []
  const inscricoesValidas = (cda.inscricoes||[]).filter(ins=>ins.numero&&ins.numero.trim())
  if (!cda.numero_cda || !cda.numero_cda.trim()) problemas.push('Número da CDA não informado')
  if (inscricoesValidas.length===0) problemas.push('Nenhum número de inscrição informado')
  if (totalInscricoes(cda)<=0) problemas.push('Valor não informado')
  if (!cda.data_constituicao) problemas.push('Data de constituição não informada')
  if (!cda.data_inscricao) problemas.push('Data de inscrição não informada')
  if (!cda.data_fato_gerador) problemas.push('Data do fato gerador não informada')
  const tiposDistintos = [...new Set((cda.inscricoes||[]).map(ins=>ins.tipo_credito))].length
  const passos = [
    { label:'Número da CDA',           valor:cda.numero_cda&&cda.numero_cda.trim()?cda.numero_cda:'Não informado', obs:cda.numero_cda&&cda.numero_cda.trim()?'✅ Informado (art. 202, I CTN)':'⚠️ Ausente (art. 202, I CTN)' },
    { label:'Natureza de referência',  valor:tipo.label,                    obs:`Legislação: ${tipo.legislacao}` },
    { label:'Tipos distintos na CDA',  valor:`${tiposDistintos} tipo(s)`,    obs:tiposDistintos>1?'⚠️ CDA com mais de um tipo de crédito — análise usa a 1ª inscrição como referência':'Tipo único nesta CDA' },
    { label:'Números de inscrição', valor:inscricoesValidas.length>0?`${inscricoesValidas.length} informado(s)`:'Nenhum informado',   obs:inscricoesValidas.length>0?inscricoesValidas.map(i=>i.numero).join(', '):'⚠️ Ausente' },
    { label:'Valor total',          valor:totalInscricoes(cda)>0?fmtR(totalInscricoes(cda)):'Não informado', obs:totalInscricoes(cda)>0?'✅ Informado':'⚠️ Ausente' },
    { label:'Data de constituição', valor:fmtData(cda.data_constituicao),obs:cda.data_constituicao?'✅ Informada':'⚠️ Ausente' },
    { label:'Teses aplicáveis',     valor:`${teses.length} identificadas`,obs:teses.slice(0,2).join('; ')+'...' },
    { label:'Problemas',            valor:`${problemas.length} item(ns)`, obs:problemas.join('; ')||'Nenhum problema identificado' },
  ]
  if (problemas.length===0) return { conclusao:'cda_ok', titulo:'✅ CDA sem vícios aparentes', cor:'#16A34A', passos, teses, justificativa:'A CDA apresenta todos os requisitos formais verificáveis com base nos dados informados.' }
  return { conclusao:'cda_vicio', titulo:'⚠️ Possíveis vícios na CDA', cor:'#DC2626', passos, teses, justificativa:`Foram identificados ${problemas.length} ponto(s): ${problemas.join('; ')}.` }
}

function analisarElegibilidadeTransacao(cda, regraCapag) {
  const valor = totalInscricoes(cda)
  const condicao = regraCapag?.condicao || {
    valor_consolidado_maximo: 45000000,
    data_inscricao_limite: '2026-03-03',
  }
  const problemas = []
  if (valor > condicao.valor_consolidado_maximo) problemas.push(`Valor consolidado (${fmtR(valor)}) excede o limite de ${fmtR(condicao.valor_consolidado_maximo)}`)
  if (cda.data_inscricao && cda.data_inscricao > condicao.data_inscricao_limite) problemas.push(`Inscrição em ${fmtData(cda.data_inscricao)} é posterior ao limite de ${fmtData(condicao.data_inscricao_limite)}`)
  if (!cda.data_inscricao) problemas.push('Data de inscrição não informada')
  if (cda.possui_garantia) problemas.push('CDA possui garantia prestada — verificar modalidade específica para débitos garantidos')
  if (cda.possui_parcelamento) problemas.push('CDA já está parcelada — não elegível nesta modalidade')

  const passos = [
    { label:'Valor consolidado da CDA', valor:fmtR(valor), obs:`Limite: ${fmtR(condicao.valor_consolidado_maximo)}` },
    { label:'Data de inscrição', valor:fmtData(cda.data_inscricao), obs:`Limite: ${fmtData(condicao.data_inscricao_limite)}` },
    { label:'Garantia prestada', valor:cda.possui_garantia?'Sim':'Não', obs:cda.possui_garantia?'⚠️ Verificar modalidade de débitos garantidos':'—' },
    { label:'Parcelamento ativo', valor:cda.possui_parcelamento?'Sim':'Não', obs:cda.possui_parcelamento?'⚠️ Impede adesão nesta modalidade':'—' },
    { label:'Situação', valor:problemas.length===0?'✅ ELEGÍVEL':'⚠️ NÃO ELEGÍVEL (verificar pontos)', obs:'' },
  ]

  if (problemas.length===0) return { conclusao:'elegivel', titulo:'✅ Elegível à Transação por Capacidade de Pagamento', cor:'#16A34A', passos, justificativa:`A CDA atende aos critérios de elegibilidade do Edital PGDAU 6/2026 para a modalidade de capacidade de pagamento: valor dentro do limite e inscrição dentro do prazo, sem garantia ou parcelamento que impeçam a adesão.` }
  return { conclusao:'nao_elegivel', titulo:'⚠️ Possível inelegibilidade', cor:'#D97706', passos, justificativa:`Foram identificados ${problemas.length} ponto(s) que podem impedir ou exigir modalidade diferente: ${problemas.join('; ')}.` }
}

function gerarParecer(resultados) {
  const parecer = []; let urgente = false
  resultados.forEach((a,i) => {
    const num = rotuloCDA(a.cda, i)
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
  const isNeg = resultado.conclusao.includes('ha_')||resultado.conclusao==='cda_vicio'||resultado.conclusao==='nao_elegivel'
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

// ─── CORREÇÃO 1: SeletorCliente agora passa o objeto completo incluindo id ───
function SeletorCliente({ clienteAtual, onSelecionar, onCadastrarNovo }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [modoNovo, setModoNovo] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoCnpj, setNovoCnpj] = useState('')
  const [salvandoNovo, setSalvandoNovo] = useState(false)

  useEffect(()=>{ if(aberto) carregarClientes() },[aberto])

  async function carregarClientes() {
    setCarregando(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('clientes').select('id,razao_social,nome_fantasia,cnpj').eq('usuario_id',user.id).order('razao_social')
      if(data) setClientes(data)
    } catch(e){}
    setCarregando(false)
  }

  const filtrados = clientes.filter(c =>
    (c.razao_social||'').toLowerCase().includes(busca.toLowerCase()) ||
    (c.nome_fantasia||'').toLowerCase().includes(busca.toLowerCase()) ||
    (c.cnpj||'').includes(busca)
  )

  function maskCnpj(v) {
    v = v.replace(/\D/g,'').slice(0,14)
    v = v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3/$4').replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/,'$1.$2.$3/$4-$5')
    return v
  }

  async function salvarNovoCliente() {
    if(!novoNome.trim()) { alert('Informe a razão social.'); return }
    setSalvandoNovo(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('clientes').insert([{ usuario_id:user.id, razao_social:novoNome, nome_fantasia:'', cnpj:novoCnpj, regime:'Simples Nacional', municipio:'', uf:'', cnae_principal:'', competencia_inicio:'', competencia_fim:'', responsavel_contabil:'', observacoes:'' }]).select()
      if(error) throw error
      if(data?.[0]) {
        // Passa objeto completo com id
        onCadastrarNovo({ id: data[0].id, razao_social: data[0].razao_social, cnpj: data[0].cnpj })
        setModoNovo(false); setNovoNome(''); setNovoCnpj(''); setAberto(false)
      }
    } catch(e){ alert('Erro ao cadastrar cliente: '+e.message) }
    setSalvandoNovo(false)
  }

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setAberto(!aberto)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,padding:'10px 14px',color:'#fff',fontSize:13,cursor:'pointer',width:340}}>
        <span>👤 {clienteAtual ? `${clienteAtual.razao_social}${clienteAtual.cnpj?' · '+clienteAtual.cnpj:''}` : 'Selecionar cliente...'}</span>
        <span>▼</span>
      </button>

      {aberto&&(
        <div style={{position:'absolute',top:'110%',left:0,width:380,background:C.white,borderRadius:10,border:`1px solid ${C.border}`,boxShadow:'0 8px 24px rgba(0,0,0,0.18)',zIndex:50,padding:14}}>
          {!modoNovo ? (
            <>
              <input
                autoFocus
                value={busca}
                onChange={e=>setBusca(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                style={{width:'100%',padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,marginBottom:10,boxSizing:'border-box'}}
              />
              <div style={{maxHeight:220,overflowY:'auto'}}>
                {carregando?(
                  <div style={{textAlign:'center',padding:16,color:C.muted,fontSize:13}}>Carregando...</div>
                ):filtrados.length===0?(
                  <div style={{textAlign:'center',padding:16,color:C.muted,fontSize:13}}>Nenhum cliente encontrado.</div>
                ):filtrados.map(c=>(
                  <div key={c.id}
                    // ─── CORREÇÃO 2: passa id junto com razao_social e cnpj ───
                    onClick={()=>{ onSelecionar({ id: c.id, razao_social: c.razao_social, cnpj: c.cnpj }); setAberto(false); setBusca('') }}
                    style={{padding:'8px 10px',borderRadius:6,cursor:'pointer',fontSize:13}}
                    onMouseEnter={e=>e.currentTarget.style.background='#F1F5F9'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{fontWeight:600,color:C.text}}>{c.razao_social}</div>
                    <div style={{fontSize:11,color:C.muted}}>{c.cnpj||'CNPJ não informado'}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>setModoNovo(true)} style={{width:'100%',marginTop:10,padding:'8px 10px',background:C.navy,color:C.white,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:600}}>
                + Cadastrar novo cliente
              </button>
            </>
          ):(
            <>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:10}}>Novo cliente</div>
              <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:4}}>Razão Social / Nome</label>
              <input value={novoNome} onChange={e=>setNovoNome(e.target.value)} placeholder="Ex: Empresa XYZ Ltda" style={{width:'100%',padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,marginBottom:10,boxSizing:'border-box'}}/>
              <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:4}}>CNPJ</label>
              <input value={novoCnpj} onChange={e=>setNovoCnpj(maskCnpj(e.target.value))} placeholder="00.000.000/0001-00" style={{width:'100%',padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,marginBottom:12,boxSizing:'border-box'}}/>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setModoNovo(false)} style={{flex:1,padding:'8px 10px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:6,fontSize:12,cursor:'pointer'}}>Cancelar</button>
                <button onClick={salvarNovoCliente} disabled={salvandoNovo} style={{flex:1,padding:'8px 10px',background:C.navy,color:C.white,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:600,opacity:salvandoNovo?0.7:1}}>
                  {salvandoNovo?'Salvando...':'Salvar cliente'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiagnosticoDividaAtiva({ active, cdaParaDiagnostico, onCdaConsumed }) {
  const [mostrarHistorico, setMostrarHistorico] = useState(false)
  const [aba, setAba] = useState(0)
  const [historico, setHistorico] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [registroId, setRegistroId] = useState(null)
  const [analisesCDA, setAnalisesCDA] = useState([])
  const [diagnostico, setDiagnostico] = useState(null)
  const [analisando, setAnalisando] = useState(false)
  // ─── CORREÇÃO 3: clienteAtual agora inclui id quando vem do prop active ───
  const [clienteAtual, setClienteAtual] = useState(
    active ? { id: active.id || null, razao_social: active.razao_social, cnpj: active.cnpj } : null
  )
  const [dados, setDados] = useState({ cnpj:active?.cnpj||'', valor_total:'', orgao_credor:'PGFN', processo_execucao:'', possui_parcelamento:false, possui_transacao_anterior:false, possui_garantia:false, possui_penhora:false, possui_bloqueio:false, possui_embargos:false, observacoes:'' })
  const [cdas, setCdas] = useState([{...CDA_VAZIA}])
  const [sim, setSim] = useState({ valor:'', modalidade:'transacao_edital', desconto_multa:50, desconto_juros:50, parcelas:60, entrada_pct:5, multa_pct:20, juros_pct:30 })
  const [simResult, setSimResult] = useState(null)
  const [regraCapag, setRegraCapag] = useState(null)
  const [teseTransacao, setTeseTransacao] = useState(null)
  const [sisparDados, setSisparDados] = useState([])
  const [sisparLoading, setSisparLoading] = useState(false)
  const [cdasSalvas, setCdasSalvas] = useState([])
  const [mostrarCdasSalvas, setMostrarCdasSalvas] = useState(false)
  const [loadingCdas, setLoadingCdas] = useState(false)

  useEffect(()=>{
    async function carregarCore() {
      try {
        const { data: regra } = await supabase.from('motor_regras').select('*').eq('nome_regra','Elegibilidade para Transação por Capacidade de Pagamento (Edital PGDAU 6/2026)').single()
        if(regra) setRegraCapag(regra)
        const { data: tese } = await supabase.from('base_teses').select('*').eq('nome_tese','Transação Tributária - Estratégia de Adesão').single()
        if(tese) setTeseTransacao(tese)
      } catch(e){}
    }
    carregarCore()
  },[])
  
  useEffect(() => {
    if (!cdaParaDiagnostico) return
    const { campos, clienteEfetivo } = cdaParaDiagnostico

    if (clienteEfetivo?.id) {
      setClienteAtual({ id: clienteEfetivo.id, razao_social: clienteEfetivo.razao_social, cnpj: clienteEfetivo.cnpj || '' })
    }

    const tipoCredito = campos.tipo_debito || 'tributario_federal'
    const cdaDiag = {
    ...CDA_VAZIA,
    numero_cda: campos.numero_cda || '',
    inscricoes: [{ numero: campos.numero_cda || '', valor: String(campos.valor_total || '0'), tipo_credito: tipoCredito }],
    situacao: 'Ativa',
    modalidade_lancamento: campos.modalidade_lancamento || 'oficio',
    data_fato_gerador:        normalizarData(campos.data_fato_gerador) || '',
    data_constituicao:        normalizarData(campos.data_constituicao_definitiva) || normalizarData(campos.data_inscricao) || '',
    data_inscricao:           normalizarData(campos.data_inscricao) || '',
    data_ajuizamento:         normalizarData(campos.data_ajuizamento) || '',
    data_citacao:             normalizarData(campos.data_citacao) || '',
    data_ultima_movimentacao: normalizarData(campos.data_ultima_movimentacao) || '',
    }

    setDados(d => ({
      ...d,
      cnpj: campos.cnpj_devedor || clienteEfetivo?.cnpj || '',
      valor_total: campos.valor_total || '',
      orgao_credor: 'PGFN',
    }))
    setCdas([cdaDiag])
    setDiagnostico(null)
    setAnalisesCDA([])
    setRegistroId(null)

    if (onCdaConsumed) onCdaConsumed()

    setTimeout(() => {
      const resultados = [cdaDiag].map(cda => ({
        cda,
        decadencia: analisarDecadencia(cda),
        prescricao: analisarPrescricao(cda),
        prescricaoIntercorrente: analisarPrescricaoIntercorrente(cda),
        validadeCDA: analisarCDA(cda),
      }))
      const { parecer, urgente } = gerarParecer(resultados)
      let score = 50
      resultados.forEach(r => {
        if(r.decadencia.conclusao==='ha_decadencia') score+=25
        if(r.prescricao.conclusao==='ha_prescricao') score+=25
        if(r.prescricaoIntercorrente.conclusao==='ha_prescricao_intercorrente') score+=15
        if(r.validadeCDA.conclusao==='cda_vicio') score+=10
      })
      score = Math.min(100, score)
      const diagNovo = { parecer, urgente, score, valor:0, data: new Date().toISOString() }
      setAnalisesCDA(resultados)
      setDiagnostico(diagNovo)
      setAba(1)
    }, 100)
  }, [cdaParaDiagnostico])

  // ─── CORREÇÃO 4: carregarSispar usa clienteAtual.id ou active.id de forma confiável ───
  async function carregarSispar() {
    setSisparLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const clienteId = clienteAtual?.id || active?.id || null
      let query = supabase.from('cdas').select('*').eq('usuario_id', user.id)
      if (clienteId) {
        query = query.eq('cliente_id', clienteId)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if(error) throw error
      setSisparDados(data || [])
    } catch(e) { setSisparDados([]) }
    setSisparLoading(false)
  }
  async function carregarCdasSalvas() {
    setLoadingCdas(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const clienteId = clienteAtual?.id || active?.id || null
      let query = supabase.from('cdas').select('*').eq('usuario_id', user.id)
      if (clienteId) query = query.eq('cliente_id', clienteId)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setCdasSalvas(data || [])
    } catch(e) { setCdasSalvas([]) }
    setLoadingCdas(false)
  }

  function abrirCdaParaDiagnostico(cda) {
    const tipoCredito = cda.tipo_debito || 'tributario_federal'
    const cdaDiag = {
      ...CDA_VAZIA,
      numero_cda:               cda.numero_cda || '',
      inscricoes: [{ numero: cda.numero_cda || '', valor: String(cda.valor_total || 0), tipo_credito: tipoCredito }],
      situacao:                 'Ativa',
      modalidade_lancamento:    cda.modalidade_lancamento || 'homologacao',
      data_fato_gerador:        normalizarData(cda.data_fato_gerador) || '',
      data_constituicao:        normalizarData(cda.data_constituicao_definitiva) || normalizarData(cda.data_inscricao) || '',
      data_inscricao:           normalizarData(cda.data_inscricao) || '',
      data_ajuizamento:         normalizarData(cda.data_ajuizamento) || '',
      data_citacao:             normalizarData(cda.data_citacao) || '',
      data_ultima_movimentacao: normalizarData(cda.data_ultima_movimentacao) || '',
      possui_parcelamento: false, possui_suspensao: false, possui_garantia: false,
      possui_penhora: false, possui_embargos: false,
    }
    if (cda.cliente_id) {
      setClienteAtual({ id: cda.cliente_id, razao_social: cda.devedor || '', cnpj: cda.cnpj_devedor || '' })
    }
    setDados(d => ({ ...d, cnpj: cda.cnpj_devedor || '', valor_total: cda.valor_total ? String(cda.valor_total) : '', orgao_credor: 'PGFN', processo_execucao: cda.numero_processo_execucao || '' }))
    setCdas([cdaDiag])
    setDiagnostico(null)
    setAnalisesCDA([])
    setRegistroId(null)
    setMostrarCdasSalvas(false)
    setTimeout(() => {
      const resultados = [cdaDiag].map(c => ({ cda:c, decadencia:analisarDecadencia(c), prescricao:analisarPrescricao(c), prescricaoIntercorrente:analisarPrescricaoIntercorrente(c), validadeCDA:analisarCDA(c) }))
      const { parecer, urgente } = gerarParecer(resultados)
      let score = 50
      resultados.forEach(r => {
        if(r.decadencia.conclusao==='ha_decadencia') score+=25
        if(r.prescricao.conclusao==='ha_prescricao') score+=25
        if(r.prescricaoIntercorrente.conclusao==='ha_prescricao_intercorrente') score+=15
        if(r.validadeCDA.conclusao==='cda_vicio') score+=10
      })
      score = Math.min(100, score)
      setAnalisesCDA(resultados)
      setDiagnostico({ parecer, urgente, score, valor: parseFloat(cda.valor_total)||0, data: new Date().toISOString() })
      setAba(1)
    }, 150)
  }
 async function deletarCDA(id) {
  if (!window.confirm('Excluir este registro da CDA?')) return
  try {
    const { error } = await supabase.from('cdas').delete().eq('id', id)
    if (error) throw error
    await carregarSispar()
  } catch(e) { alert('Erro ao excluir: ' + e.message) }
 }
  useEffect(() => {
    if(aba === 7) carregarSispar()
  }, [aba, clienteAtual])

  async function carregarHistorico() {
    setLoadingHist(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('divida_ativa').select('*').eq('usuario_id',user.id).order('created_at',{ascending:false})
      if(error) throw error
      if(data) setHistorico(data)
    } catch(e){ alert('Erro ao carregar análises: '+e.message) }
    setLoadingHist(false)
  }

  function abrirPainelHistorico() {
    setMostrarHistorico(true)
    carregarHistorico()
  }

  async function salvar(diagOverride, analisesOverride) {
    setSalvando(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const diagFinal = diagOverride ?? diagnostico
      const payload = {
        usuario_id: user.id,
        razao_social: clienteAtual?.razao_social || dados.cnpj,
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
        cdas,
        diagnostico: diagFinal,
        score: diagFinal?.score || null,
        updated_at: new Date().toISOString()
      }
      if(registroId) {
        const { error } = await supabase.from('divida_ativa').update(payload).eq('id',registroId)
        if(error) throw error
      } else {
        const { data, error } = await supabase.from('divida_ativa').insert([payload]).select()
        if(error) throw error
        if(data?.[0]) setRegistroId(data[0].id)
      }
    } catch(e){ alert('Erro ao salvar: '+e.message) }
    setSalvando(false)
  }

  async function excluirRegistro(id) {
    if(!window.confirm('Excluir este diagnóstico?')) return
    try {
      const { error } = await supabase.from('divida_ativa').delete().eq('id',id)
      if(error) throw error
      await carregarHistorico()
    } catch(e){ alert('Erro ao excluir: '+e.message) }
  }

  function abrirRegistro(reg) {
    setClienteAtual({ id: reg.cliente_id || null, razao_social: reg.razao_social, cnpj: reg.cnpj })
    setDados({ cnpj:reg.cnpj||'', valor_total:reg.valor_total||'', orgao_credor:reg.orgao_credor||'PGFN', processo_execucao:reg.processo_execucao||'', possui_parcelamento:reg.possui_parcelamento||false, possui_transacao_anterior:reg.possui_transacao_anterior||false, possui_garantia:reg.possui_garantia||false, possui_penhora:reg.possui_penhora||false, possui_bloqueio:reg.possui_bloqueio||false, possui_embargos:reg.possui_embargos||false, observacoes:reg.observacoes||'' })
    setCdas(migrarListaCDAs(reg.cdas))
    setDiagnostico(reg.diagnostico||null)
    setAnalisesCDA([])
    setRegistroId(reg.id)
    setAba(reg.diagnostico?0:1)
    setMostrarHistorico(false)
  }

  function novaAnalise() {
    setClienteAtual(null)
    setDados({ cnpj:'', valor_total:'', orgao_credor:'PGFN', processo_execucao:'', possui_parcelamento:false, possui_transacao_anterior:false, possui_garantia:false, possui_penhora:false, possui_bloqueio:false, possui_embargos:false, observacoes:'' })
    setCdas([{...CDA_VAZIA}])
    setDiagnostico(null)
    setAnalisesCDA([])
    setRegistroId(null)
    setAba(0)
  }

  // ─── CORREÇÃO 5: selecionarCliente recebe e armazena o id ───
  function selecionarCliente(c) {
    setClienteAtual({ id: c.id || null, razao_social: c.razao_social, cnpj: c.cnpj || '' })
    setDados({ cnpj:c.cnpj||'', valor_total:'', orgao_credor:'PGFN', processo_execucao:'', possui_parcelamento:false, possui_transacao_anterior:false, possui_garantia:false, possui_penhora:false, possui_bloqueio:false, possui_embargos:false, observacoes:'' })
    setCdas([{...CDA_VAZIA}])
    setDiagnostico(null)
    setAnalisesCDA([])
    setRegistroId(null)
    setAba(0)
  }

  function executarDiagnostico() {
    setAnalisando(true)
    const resultados = cdas.map(cda=>({ cda, decadencia:analisarDecadencia(cda), prescricao:analisarPrescricao(cda), prescricaoIntercorrente:analisarPrescricaoIntercorrente(cda), validadeCDA:analisarCDA(cda) }))
    const { parecer, urgente } = gerarParecer(resultados)
    let score = 50
    resultados.forEach(r=>{
      if(r.decadencia.conclusao==='ha_decadencia') score+=25
      if(r.prescricao.conclusao==='ha_prescricao') score+=25
      if(r.prescricaoIntercorrente.conclusao==='ha_prescricao_intercorrente') score+=15
      if(r.validadeCDA.conclusao==='cda_vicio') score+=10
    })
    score = Math.min(100,score)
    const diagNovo = { parecer, urgente, score, valor:parseFloat((dados.valor_total||'').replace(/\./g,'').replace(',','.'))||0, data:new Date().toISOString() }
    setTimeout(()=>{
      setAnalisesCDA(resultados)
      setDiagnostico(diagNovo)
      setAnalisando(false)
      setAba(2)
      salvar(diagNovo, resultados)
    },1500)
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
    const linhas=['╔══════════════════════════════════════════════════════════════╗','║      FISCALTRIB — PARECER TÉCNICO — DÍVIDA ATIVA (PGFN)     ║','╚══════════════════════════════════════════════════════════════╝','',`Cliente: ${clienteAtual?.razao_social||dados.cnpj}`,`CNPJ: ${dados.cnpj}`,`Data: ${new Date().toLocaleDateString('pt-BR')}`,`Score: ${diagnostico.score}/100`,'','═══ PARECER FINAL ══════════════════════════════════════════════',...diagnostico.parecer.map(p=>`${p.tipo==='danger'?'⚠️':'ℹ️'} ${p.msg}`),'']
    analisesCDA.forEach((a,i)=>{
      const inscricoesTxt = (a.cda.inscricoes||[]).filter(ins=>ins.numero&&ins.numero.trim()).map(ins=>`${ins.numero} [${TIPOS_CREDITO.find(t=>t.key===ins.tipo_credito)?.label||'—'}] (${fmtR(parseValor(ins.valor))})`).join(' / ')
      linhas.push(`═══ ${rotuloCDA(a.cda, i)} ═══`)
      linhas.push(`Número da CDA: ${a.cda.numero_cda&&a.cda.numero_cda.trim()?a.cda.numero_cda:'Não informado'}`)
      linhas.push(`Inscrições: ${inscricoesTxt||'Sem número'}`)
      linhas.push(`Valor total: ${fmtR(totalInscricoes(a.cda))}`)
      linhas.push('',`── DECADÊNCIA: ${a.decadencia.titulo}`,a.decadencia.justificativa||'')
      linhas.push('',`── PRESCRIÇÃO: ${a.prescricao.titulo}`,a.prescricao.justificativa||'')
      linhas.push('',`── PRESCRIÇÃO INTERCORRENTE: ${a.prescricaoIntercorrente.titulo}`,a.prescricaoIntercorrente.justificativa||'')
      linhas.push('',`── VALIDADE DA CDA: ${a.validadeCDA.titulo}`,a.validadeCDA.justificativa||'')
      linhas.push('','── TESES APLICÁVEIS (referência da 1ª inscrição):',...(tesesReferenciaCDA(a.cda)||[]).map(t=>`  • ${t}`))
      linhas.push('','── RACIOCÍNIO — DECADÊNCIA:',...(a.decadencia.passos||[]).map(p=>`  ${p.label}: ${p.valor} — ${p.obs}`))
      linhas.push('','── RACIOCÍNIO — PRESCRIÇÃO:',...(a.prescricao.passos||[]).map(p=>`  ${p.label}: ${p.valor} — ${p.obs}`),'')
    })
    linhas.push('Gerado por FiscalTrib — fiscaltrib.com.br','Parecer preliminar — não substitui análise jurídica profissional.')
    const blob=new Blob([linhas.join('\n')],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a')
    a.href=url; a.download=`Parecer_DividaAtiva_${dados.cnpj||'cliente'}_${hoje}.txt`; a.click(); URL.revokeObjectURL(url)
  }

  const btnPrimary={padding:'10px 20px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}
  const btnOutline={padding:'10px 20px',background:C.white,color:C.navy,border:`1.5px solid ${C.navy}`,borderRadius:8,fontSize:13,cursor:'pointer'}
  const btnDanger ={padding:'6px 12px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:8,fontSize:12,cursor:'pointer'}

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

  const addInscricao = (i) => {
    const novo=[...cdas]
    novo[i]={...novo[i],inscricoes:[...(novo[i].inscricoes||[]),{numero:'',valor:'',tipo_credito:'tributario_federal'}]}
    setCdas(novo)
  }
  const removeInscricao = (i,j) => {
    const novo=[...cdas]
    const lista=[...(novo[i].inscricoes||[])]
    lista.splice(j,1)
    novo[i]={...novo[i],inscricoes:lista.length>0?lista:[{numero:'',valor:'',tipo_credito:'tributario_federal'}]}
    setCdas(novo)
  }
  const updateInscricao = (i,j,campo,v) => {
    const novo=[...cdas]
    const lista=[...(novo[i].inscricoes||[])]
    lista[j]={...lista[j],[campo]:v}
    novo[i]={...novo[i],inscricoes:lista}
    setCdas(novo)
  }
  const blurInscricaoValor = (i,j) => {
    const novo=[...cdas]
    const lista=[...(novo[i].inscricoes||[])]
    const n = parseValor(lista[j].valor)
    if(n>0) lista[j]={...lista[j],valor:n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
    novo[i]={...novo[i],inscricoes:lista}
    setCdas(novo)
  }

  const ABAS = ['📋 Visão Geral','📝 Dados da Dívida','🧠 Diagnóstico Inteligente','⚡ Estratégias','💰 Transação Tributária','📊 Simulador','📄 Parecer']

  // Cálculos SISPAR
  const sisparTotais = sisparDados.reduce((acc, r) => {
    const _t = parseValor(r.total_sem_desconto || 0)
    const _d = parseValor(r.desconto_valor || 0)
    acc.totalSemDesconto += _t
    acc.totalDesconto    += _d
    acc.totalAPagar      += (_t - _d)
    acc.totalEntrada     += parseValor(r.valor_entrada || 0)
    acc.count            += 1
    return acc
  }, { totalSemDesconto:0, totalDesconto:0, totalAPagar:0, totalEntrada:0, count:0 })

  const thSispar = {
    background:'#0B1F4D', color:'#fff', fontSize:10, fontWeight:700,
    padding:'5px 7px', textAlign:'center', border:'1px solid #1e3a6e',
    whiteSpace:'nowrap', letterSpacing:0.3
  }
  const tdSispar = (align='center') => ({
    fontSize:10, padding:'4px 7px', border:'1px solid #C8D0DC',
    textAlign:align, color:'#1E293B', whiteSpace:'nowrap'
  })
  const tdSisparNum = {
    fontSize:10, padding:'4px 7px', border:'1px solid #C8D0DC',
    textAlign:'right', color:'#1E293B', fontVariantNumeric:'tabular-nums',
    whiteSpace:'nowrap'
  }
  const tdTotal = {
    fontSize:10, padding:'5px 7px', border:'1px solid #8899bb',
    textAlign:'right', fontWeight:700, color:'#0B1F4D',
    background:'#dce6f7', whiteSpace:'nowrap'
  }

  return (
    <div style={{maxWidth:'100%',margin:'0 auto',position:'relative'}}>

      <div style={{background:'linear-gradient(135deg,#1e293b,#0B1F4D)',borderRadius:16,padding:'28px 32px',color:'#fff',marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,letterSpacing:2,marginBottom:8}}>FISCALTRIB — DIAGNÓSTICO</div>
            <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,color:'#fff'}}>⚖️ Diagnóstico da Dívida Ativa</h1>
            <p style={{fontSize:14,color:'#cbd5e1',margin:0}}>Motor de inteligência jurídica · Decadência · Prescrição · Validade da CDA</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={novaAnalise} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,padding:'10px 16px',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
              + Nova análise
            </button>
            <button onClick={abrirPainelHistorico} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,padding:'10px 16px',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
              📂 Análises salvas
            </button>
			<button onClick={()=>{ setMostrarCdasSalvas(true); carregarCdasSalvas() }}
            style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,padding:'10px 16px',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
           📋 CDAs Salvas
           </button>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <SeletorCliente clienteAtual={clienteAtual} onSelecionar={selecionarCliente} onCadastrarNovo={selecionarCliente}/>
        </div>
      </div>

      {mostrarHistorico&&(
        <div onClick={()=>setMostrarHistorico(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'60px 20px',overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:14,maxWidth:780,width:'100%',padding:24,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700,color:C.navy}}>📂 Análises salvas</div>
              <button onClick={()=>setMostrarHistorico(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.muted}}>✕</button>
            </div>
            {loadingHist?(
              <div style={{textAlign:'center',padding:32,color:C.muted}}>Carregando...</div>
            ):historico.length===0?(
              <div style={{textAlign:'center',padding:'32px 0',color:C.muted}}>
                <div style={{fontSize:32,marginBottom:8}}>⚖️</div>
                <div style={{fontSize:14}}>Nenhuma análise salva ainda.</div>
              </div>
            ):(
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'#F1F5F9'}}>
                    <th style={{textAlign:'left',padding:'10px 14px',color:C.muted,fontWeight:600,borderBottom:`2px solid ${C.border}`}}>Razão Social</th>
                    <th style={{textAlign:'left',padding:'10px 14px',color:C.muted,fontWeight:600,borderBottom:`2px solid ${C.border}`}}>CNPJ</th>
                    <th style={{textAlign:'left',padding:'10px 14px',color:C.muted,fontWeight:600,borderBottom:`2px solid ${C.border}`}}>Data</th>
                    <th style={{textAlign:'center',padding:'10px 14px',color:C.muted,fontWeight:600,borderBottom:`2px solid ${C.border}`}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((reg,idx)=>(
                    <tr key={reg.id} style={{background:idx%2===0?C.white:'#F8FAFC',borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 14px',color:C.text,fontWeight:600}}>{reg.razao_social||'—'}</td>
                      <td style={{padding:'10px 14px',color:C.muted}}>{reg.cnpj||'—'}</td>
                      <td style={{padding:'10px 14px',color:C.muted}}>{fmtDateTime(reg.created_at)}</td>
                      <td style={{padding:'10px 14px',textAlign:'center'}}>
                        <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                          <button onClick={()=>abrirRegistro(reg)} style={{padding:'5px 16px',background:C.navy,color:C.white,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:600}}>📂 Abrir</button>
                          <button onClick={()=>excluirRegistro(reg.id)} style={btnDanger}>🗑️ Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
	  
	  {mostrarCdasSalvas && (
      <div onClick={()=>setMostrarCdasSalvas(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'60px 20px',overflowY:'auto'}}>
        <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,maxWidth:900,width:'100%',padding:24,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:700,color:'#0B1F4D'}}>📋 CDAs Salvas — {clienteAtual?.razao_social||'Todos os clientes'}</div>
            <button onClick={()=>setMostrarCdasSalvas(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#64748B'}}>✕</button>
          </div>
          {loadingCdas?(
            <div style={{textAlign:'center',padding:32,color:'#64748B'}}>Carregando...</div>
          ):cdasSalvas.length===0?(
            <div style={{textAlign:'center',padding:'32px 0',color:'#64748B'}}>
              <div style={{fontSize:32,marginBottom:8}}>📋</div>
              <div style={{fontSize:14}}>Nenhuma CDA salva ainda.</div>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#0B1F4D'}}>
                    {['Nº CDA','Devedor','CNPJ','Período','Valor Total','Tipo','Data Inscrição','Ações'].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#fff',fontWeight:600,fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cdasSalvas.map((cda,idx)=>(
                    <tr key={cda.id} style={{background:idx%2===0?'#fff':'#F8FAFC',borderBottom:'1px solid #E2E8F0'}}>
                      <td style={{padding:'10px 12px',fontWeight:700,color:'#0B1F4D'}}>{cda.numero_cda||'—'}</td>
                      <td style={{padding:'10px 12px',color:'#1E293B'}}>{cda.devedor||'—'}</td>
                      <td style={{padding:'10px 12px',color:'#64748B',fontSize:11}}>{cda.cnpj_devedor||'—'}</td>
                      <td style={{padding:'10px 12px',color:'#64748B',fontSize:11,whiteSpace:'nowrap'}}>{cda.periodo_divida_inicio||'—'} a {cda.periodo_divida_fim||'—'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600,color:'#DC2626',whiteSpace:'nowrap'}}>R$ {parseFloat(cda.valor_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'2px 6px',borderRadius:4,fontSize:10,fontWeight:600}}>{cda.tipo_debito||'—'}</span>
                      </td>
                      <td style={{padding:'10px 12px',color:'#64748B',fontSize:11,whiteSpace:'nowrap'}}>{cda.data_inscricao||'—'}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>abrirCdaParaDiagnostico(cda)}
                            style={{padding:'5px 10px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
                            🧠 Diagnóstico
                          </button>
                          <button onClick={()=>deletarCDA(cda.id)}
                            style={{padding:'5px 8px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:6,fontSize:11,cursor:'pointer'}}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <button onClick={()=>salvar()} disabled={salvando} style={{...btnPrimary,padding:'7px 16px',fontSize:13,opacity:salvando?0.7:1}}>{salvando?'💾 Salvando...':'💾 Salvar'}</button>
        {registroId&&<span style={{fontSize:12,color:'#16A34A',alignSelf:'center'}}>✅ Salvo</span>}
      </div>

      {aba !== 0 && (
      <div style={{marginBottom:12}}>
      <button onClick={()=>setAba(0)}
      style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'none',border:`1.5px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer'}}>
      ← Voltar à Visão Geral
      </button>
      </div>
     )}
	  <div style={{marginBottom:4}}>
        <button onClick={()=>setAba(7)}
          style={{display:'flex',alignItems:'center',gap:8,padding:'7px 18px',fontSize:12,fontWeight:600,cursor:'pointer',
          background:aba===7?'#0B1F4D':'#fff',color:aba===7?'#fff':'#0B1F4D',
          border:`2px solid #0B1F4D`,borderRadius:8,marginBottom:10}}>
          📊 Relatório SISPAR
          {aba===7&&<span style={{background:'rgba(255,255,255,0.2)',borderRadius:4,padding:'1px 6px',fontSize:10}}>ATIVO</span>}
        </button>
        <div style={{borderBottom:`2px solid ${C.border}`}}>
          {ABAS.map((t,i)=>(
            <button key={i} onClick={()=>setAba(i)}
              style={{padding:'8px 14px',fontSize:12,fontWeight:aba===i?700:400,color:aba===i?C.navy:C.muted,background:'none',border:'none',borderBottom:`2px solid ${aba===i?C.navy:'transparent'}`,marginBottom:-2,cursor:'pointer',whiteSpace:'nowrap'}}>
              {t}
            </button>
          ))}
        </div>
      </div>

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
            <button onClick={()=>setAba(6)} style={btnOutline}>📄 Gerar parecer</button>
          </div>
        </>}
      </>}

      {aba===1&&<>
        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#1E40AF'}}>
          ℹ️ <strong>Modo manual.</strong> Preencha o máximo de campos possível para análise mais precisa.
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
                {cdas.length>1&&<button onClick={()=>removeCDA(i)} style={btnDanger}>🗑️ Remover CDA</button>}
              </div>

              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4,color:C.text}}>Número da CDA</label>
                <input value={cda.numero_cda||''} onChange={e=>updateCDA(i,'numero_cda',e.target.value)} placeholder="Ex: 80.6.18.123456-78" style={{padding:'7px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,width:'100%',maxWidth:320,boxSizing:'border-box'}}/>
              </div>

              <div style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <label style={{fontSize:12,fontWeight:500,color:C.text}}>Inscrições desta CDA — número, tipo de crédito e valor</label>
                  <button onClick={()=>addInscricao(i)} style={{padding:'3px 10px',background:C.navy,color:C.white,border:'none',borderRadius:6,fontSize:11,cursor:'pointer',fontWeight:600}}>+ Adicionar inscrição</button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {(cda.inscricoes||[]).map((ins,j)=>{
                    const tipoInfo = TIPOS_CREDITO.find(t=>t.key===ins.tipo_credito)
                    return (
                    <div key={j} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px'}}>
                      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
                        <input value={ins.numero} onChange={e=>updateInscricao(i,j,'numero',e.target.value)} placeholder="Número da inscrição" style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,flex:2,boxSizing:'border-box'}}/>
                        <input value={ins.valor} onChange={e=>updateInscricao(i,j,'valor',e.target.value)} onBlur={()=>blurInscricaoValor(i,j)} placeholder="Valor (R$)" style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,flex:1,boxSizing:'border-box'}}/>
                        {(cda.inscricoes||[]).length>1&&(
                          <button onClick={()=>removeInscricao(i,j)} style={{padding:'5px 9px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:6,fontSize:12,cursor:'pointer'}}>🗑️</button>
                        )}
                      </div>
                      <select value={ins.tipo_credito} onChange={e=>updateInscricao(i,j,'tipo_credito',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}>
                        {TIPOS_CREDITO.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                      {tipoInfo&&<div style={{fontSize:10,color:'#1E40AF',marginTop:4}}>📖 {tipoInfo.legislacao}</div>}
                    </div>
                  )})}
                </div>
                <div style={{marginTop:8,display:'flex',justifyContent:'flex-end',fontSize:12,color:C.navy,fontWeight:700}}>
                  Total das inscrições: {fmtR(totalInscricoes(cda))}
                </div>
              </div>

              <div style={{background:'#F8F5FF',border:'1.5px solid #7C3AED',borderRadius:8,padding:'14px 16px',marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'#7C3AED',marginBottom:10}}>📅 Datas Jurídicas — Essenciais para Diagnóstico Conclusivo</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
         <div>
         <label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Modalidade do lançamento</label>
      <select value={cda.modalidade_lancamento} onChange={e=>updateCDA(i,'modalidade_lancamento',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}>
        <option value="oficio">De ofício / Declaração (art. 173 CTN)</option>
        <option value="homologacao">Por homologação (art. 150 CTN)</option>
        </select>
         </div>
         <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Data do fato gerador (1º período)</label><input type="date" value={cda.data_fato_gerador} onChange={e=>updateCDA(i,'data_fato_gerador',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
         <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Data da constituição definitiva</label><input type="date" value={cda.data_constituicao} onChange={e=>updateCDA(i,'data_constituicao',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
         <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Data de inscrição em DA</label><input type="date" value={cda.data_inscricao} onChange={e=>updateCDA(i,'data_inscricao',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
         <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Data do ajuizamento</label><input type="date" value={cda.data_ajuizamento} onChange={e=>updateCDA(i,'data_ajuizamento',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
          <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Data da citação válida</label><input type="date" value={cda.data_citacao} onChange={e=>updateCDA(i,'data_citacao',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
         </div>
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
          <button onClick={()=>salvar()} disabled={salvando} style={btnOutline}>{salvando?'Salvando...':'💾 Salvar'}</button>
        </div>
      </>}

      {aba===2&&<>
        {analisesCDA.length===0?(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'32px',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>🧠</div>
            <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Diagnóstico não executado</div>
            <button onClick={()=>setAba(1)} style={btnPrimary}>Inserir dados →</button>
          </div>
        ):<>
          {analisesCDA.map((a,i)=>{
            const tipo = tipoReferenciaCDA(a.cda)
            return (
            <div key={i} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <div style={{fontSize:15,fontWeight:700,color:C.navy}}>{rotuloCDA(a.cda, i)}</div>
                <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>{tipo.label} (referência)</span>
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{fmtR(totalInscricoes(a.cda))} · {a.cda.situacao}</div>
              <ResultadoAnalise resultado={a.decadencia}/>
              <ResultadoAnalise resultado={a.prescricao}/>
              <ResultadoAnalise resultado={a.prescricaoIntercorrente}/>
              <ResultadoAnalise resultado={{...a.validadeCDA,teses:tesesReferenciaCDA(a.cda)}}/>
            </div>
          )})}
          <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'14px 18px',fontSize:12,color:'#166534',marginBottom:16}}>
            💡 Clique em "▼ Ver raciocínio" para ver o passo a passo do raciocínio jurídico aplicado.
          </div>
          <button onClick={()=>setAba(6)} style={btnPrimary}>📄 Gerar parecer técnico →</button>
        </>}
      </>}

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

      {aba===4&&<>
        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#1E40AF'}}>
          ℹ️ Análise baseada no Core de Inteligência Fiscal e Tributária — {regraCapag?'regra carregada da base jurídica viva':'carregando regra...'}.
        </div>
        {cdas.map((cda,i)=>{
          const elegibilidade = analisarElegibilidadeTransacao(cda, regraCapag)
          return (
            <div key={i} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700,color:C.navy,marginBottom:12}}>{rotuloCDA(cda,i)}</div>
              <ResultadoAnalise resultado={elegibilidade}/>
            </div>
          )
        })}
        {teseTransacao&&(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginTop:8}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:10}}>📚 Tese aplicável — {teseTransacao.nome_tese}</div>
            <div style={{fontSize:13,color:C.text,marginBottom:8,lineHeight:1.7}}><strong>Requisitos:</strong> {teseTransacao.requisitos}</div>
            <div style={{fontSize:13,color:C.text,marginBottom:8,lineHeight:1.7}}><strong>Exceções:</strong> {teseTransacao.excecoes}</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.7}}><strong>Estratégia recomendada:</strong> {teseTransacao.estrategia_recomendada}</div>
          </div>
        )}
      </>}

      {aba===5&&<>
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

      {aba===6&&<>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'24px',marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:4}}>📄 Parecer Técnico — Dívida Ativa (PGFN)</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{new Date().toLocaleDateString('pt-BR')} · {clienteAtual?.razao_social||dados.cnpj}</div>
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
            {analisesCDA.map((a,i)=>{
              const inscricoesTxt = (a.cda.inscricoes||[]).filter(ins=>ins.numero&&ins.numero.trim()).map(ins=>`${ins.numero} [${TIPOS_CREDITO.find(t=>t.key===ins.tipo_credito)?.label||'—'}]`).join(' / ')
              const tipo = tipoReferenciaCDA(a.cda)
              return (
              <div key={i} style={{borderLeft:`4px solid ${C.navy}`,paddingLeft:16,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:4}}>{rotuloCDA(a.cda, i)}</div>
                <div style={{fontSize:12,color:'#1E40AF',marginBottom:8}}>{tipo.label} (referência) · {tipo.legislacao}</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Inscrições: {inscricoesTxt||'Sem número'}</div>
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
                    {tesesReferenciaCDA(a.cda).map((t,j)=><span key={j} style={{background:'#EFF6FF',color:'#1E40AF',padding:'3px 8px',borderRadius:12,fontSize:11,fontWeight:500}}>{t}</span>)}
                  </div>
                </div>
              </div>
            )})}
            <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'12px 16px',fontSize:12,color:'#92400E',marginBottom:16}}>
              ⚠️ Parecer preliminar — não substitui análise jurídica profissional.
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button onClick={gerarRelatorio} style={btnPrimary}>⬇️ Baixar parecer (.txt)</button>
              <button onClick={()=>{
                if(!diagnostico||analisesCDA.length===0){alert('Execute o diagnóstico antes.');return}
                const w=window.open('','_blank')
                const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Parecer</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px}h1{font-size:15px;color:#0B1F4D}h2{font-size:12px;color:#0B1F4D;border-bottom:1px solid #ccc;padding-bottom:3px;margin-top:16px}.danger{background:#FEF2F2;border-left:4px solid #DC2626;padding:8px 12px;margin:6px 0}.ok{background:#F0FDF4;border-left:4px solid #16A34A;padding:8px 12px;margin:6px 0}.indef{background:#FFFBEB;border-left:4px solid #D97706;padding:8px 12px;margin:6px 0}.tese{display:inline-block;background:#EFF6FF;color:#1E40AF;padding:2px 7px;border-radius:10px;font-size:10px;margin:2px}.aviso{background:#FFFBEB;border:1px solid #FCD34D;border-radius:4px;padding:8px;font-size:11px;color:#92400E;margin-top:16px}</style></head><body>
                <h1>⚖️ FISCALTRIB — Parecer Técnico — Dívida Ativa</h1>
                <p><strong>Cliente:</strong> ${clienteAtual?.razao_social||dados.cnpj} | <strong>CNPJ:</strong> ${dados.cnpj} | <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} | <strong>Score:</strong> ${diagnostico.score}/100</p>
                <h2>Parecer Final</h2>${diagnostico.parecer.map(p=>`<div class="${p.tipo==='danger'?'danger':'indef'}">• ${p.msg}</div>`).join('')}
                ${analisesCDA.map((a,i)=>{const tipo=tipoReferenciaCDA(a.cda);const gc=c=>c.conclusao.includes('ha_')||c.conclusao==='cda_vicio'?'danger':c.conclusao==='indefinida'?'indef':'ok';return`<h2>${rotuloCDA(a.cda,i)} — ${tipo.label}</h2><p>Valor: ${fmtR(totalInscricoes(a.cda))} | Situação: ${a.cda.situacao}</p><div class="${gc(a.decadencia)}"><strong>Decadência:</strong> ${a.decadencia.titulo}<br><small>${a.decadencia.justificativa}</small></div><div class="${gc(a.prescricao)}"><strong>Prescrição:</strong> ${a.prescricao.titulo}<br><small>${a.prescricao.justificativa}</small></div><div class="${gc(a.prescricaoIntercorrente)}"><strong>Prescrição Intercorrente:</strong> ${a.prescricaoIntercorrente.titulo}<br><small>${a.prescricaoIntercorrente.justificativa}</small></div><div class="${gc(a.validadeCDA)}"><strong>Validade CDA:</strong> ${a.validadeCDA.titulo}<br><small>${a.validadeCDA.justificativa}</small></div><p>${tesesReferenciaCDA(a.cda).map(t=>`<span class="tese">${t}</span>`).join(' ')}</p>`}).join('')}
                <div class="aviso">⚠️ Parecer preliminar — FiscalTrib ${new Date().toLocaleString('pt-BR')} — não substitui análise jurídica profissional.</div>
                <script>window.onload=()=>window.print()</script></body></html>`
                w.document.write(html);w.document.close()
              }} style={btnOutline}>🖨️ Imprimir parecer</button>
            </div>
          </>}
        </div>
      </>}

      {aba===7&&<>
        {/* Cabeçalho SISPAR */}
        <div style={{background:'#0B1F4D',borderRadius:10,padding:'14px 20px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:10,color:'#7CC4FF',fontWeight:700,letterSpacing:2,marginBottom:4}}>FISCALTRIB — DÍVIDA ATIVA</div>
            <div style={{fontSize:15,fontWeight:900,color:'#fff'}}>📊 Relatório Executivo — Padrão SISPAR</div>
            <div style={{fontSize:11,color:'#93c5fd',marginTop:2}}>
              Negociação e Regularização de Débitos Inscritos em Dívida Ativa
              {clienteAtual && (
                <span style={{marginLeft:12,background:'rgba(255,255,255,0.15)',borderRadius:4,padding:'2px 8px',fontSize:10,fontWeight:700}}>
                  👤 {clienteAtual.razao_social}{clienteAtual.cnpj ? ' · '+clienteAtual.cnpj : ''}
                </span>
              )}
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:10,color:'#7CC4FF',marginBottom:2}}>Gerado em</div>
            <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{new Date().toLocaleDateString('pt-BR')}</div>
            <div style={{display:'flex',gap:6,marginTop:8,justifyContent:'flex-end'}}>
              <button onClick={()=>{ setMostrarCdasSalvas(true); carregarCdasSalvas() }}
              style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>
              📋 CDAs
            </button>
			  <button onClick={carregarSispar} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>🔄 Atualizar</button>
              <button onClick={()=>window.print()} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>🖨️ Imprimir</button>
            </div>
              
          </div>
        </div>

        {sisparLoading ? (
          <div style={{textAlign:'center',padding:48,color:C.muted}}>
            <div style={{fontSize:32,marginBottom:12}}>⏳</div>
            <div style={{fontSize:14}}>Carregando dados...</div>
          </div>
        ) : sisparDados.length === 0 ? (
          <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.border}`,padding:48,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>
              {clienteAtual ? `Nenhuma CDA encontrada para ${clienteAtual.razao_social}` : 'Nenhum registro na tabela CDAs'}
            </div>
            <div style={{fontSize:13,color:C.muted}}>
              {clienteAtual
                ? 'Importe uma CDA para este cliente via "Importar CDA" para visualizá-la aqui.'
                : 'Selecione um cliente ou cadastre CDAs para populá-las.'}
            </div>
          </div>
        ) : (
          <>
            {/* KPIs consolidados */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
              {[
                {label:'Total de Registros', valor:sisparTotais.count, fmt:'num', cor:'#0B1F4D', bg:'#EFF6FF'},
                {label:'Total s/ Desconto',  valor:sisparTotais.totalSemDesconto, fmt:'brl', cor:'#DC2626', bg:'#FEF2F2'},
                {label:'Total Desconto',     valor:sisparTotais.totalDesconto,    fmt:'brl', cor:'#16A34A', bg:'#F0FDF4'},
                {label:'Total a Pagar',      valor:sisparTotais.totalAPagar,      fmt:'brl', cor:'#0B1F4D', bg:'#EFF6FF'},
              ].map((k,i)=>(
                <div key={i} style={{background:k.bg,borderRadius:8,padding:'12px 14px',border:`1px solid ${k.cor}22`}}>
                  <div style={{fontSize:10,color:k.cor,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>{k.label}</div>
                  <div style={{fontSize:k.fmt==='num'?22:16,fontWeight:900,color:k.cor}}>
                    {k.fmt==='brl' ? fmtR(k.valor) : k.valor}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela SISPAR principal */}
            <div style={{overflowX:'auto',marginBottom:16}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:900}}>
                <thead>
              <tr>
                 <th style={{...thSispar,width:40,textAlign:'center'}}>Item</th>
                 <th style={{...thSispar,textAlign:'left',width:200}}>Nº CDA / Devedor / CNPJ</th>
                 <th style={thSispar}>Tipo</th>
                 <th style={thSispar}>Modalidade</th>
                 <th style={thSispar}>Data Cálculo</th>
                 <th style={thSispar}>UFIR</th>
                 <th style={{...thSispar,background:'#1a3566'}}>Total s/Desc.</th>
                 <th style={{...thSispar,background:'#1a3566'}}>Desconto R$</th>
                 <th style={{...thSispar,background:'#1a3566'}}>Prov. Econ. %</th>
                 <th style={{...thSispar,background:'#163b5c'}}>Total a Pagar</th>
                 <th style={thSispar}>Qt Entrada</th>
                 <th style={thSispar}>Vl Entrada</th>
                 <th style={thSispar}>Qt Parcela</th>
                 <th style={thSispar}>Vl Parcela</th>
                 <th style={{...thSispar,textAlign:'left'}}>Processo / TRF / Vara</th>
                 <th style={{...thSispar,textAlign:'left'}}>Sócios / Obs.</th>
                 <th style={{...thSispar,width:40}}></th>
                 </tr>
                </thead>
                <tbody>
                  {sisparDados.map((r, idx) => {
                    const vTotal    = parseValor(r.total_sem_desconto || 0)
                    const vDesc     = parseValor(r.desconto_valor || 0)
                    const vPagar    = vTotal - vDesc
                    const vEntrada  = parseValor(r.valor_entrada || 0)
                    const vParcela  = parseValor(r.valor_parcela || 0)
                    const qtEntrada = vEntrada > 0 ? 1 : 0
                    const qtParcela = r.qt_parcelas || 0
                    const provEcon  = vTotal > 0 ? ((vDesc / vTotal) * 100).toFixed(1) + '%' : '—'
                    const zebra     = idx % 2 === 0 ? '#fff' : '#F8FAFC'
                    return (
                      <tr key={r.id} style={{background:zebra}}>
					  <td style={{...tdSispar(),width:40,fontWeight:700,color:'#0B1F4D',textAlign:'center'}}>{idx+1}</td>
                        {/* ─── CORREÇÃO 7: célula com numero_cda, devedor e cnpj_devedor empilhados ─── */}
                        <td style={{...tdSispar('left'),maxWidth:200}}>
                          <div style={{fontWeight:700,color:'#0B1F4D',fontSize:10,lineHeight:1.4}}>
                            {r.numero_cda || '—'}
                          </div>
                          {r.devedor && (
                            <div style={{color:'#1E293B',fontSize:9,lineHeight:1.4,marginTop:1}}>
                              {r.devedor}
                            </div>
                          )}
                          {r.cnpj_devedor && (
                            <div style={{color:'#64748B',fontSize:9,lineHeight:1.4}}>
                              {r.cnpj_devedor}
                            </div>
                          )}
                        </td>
                        <td style={tdSispar()}>
                          <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'1px 5px',borderRadius:4,fontSize:9,fontWeight:600}}>
                            {TIPOS_CREDITO.find(t=>t.key===r.tipo_credito)?.label || r.tipo_debito || '—'}
                          </span>
                        </td>
                        <td style={tdSispar()}>
                          <span style={{background:'#F0FDF4',color:'#166534',padding:'1px 5px',borderRadius:4,fontSize:9,fontWeight:600}}>
                            {MODALIDADES_PGFN.find(m=>m.key===r.modalidade)?.label || r.modalidade_transacao || '—'}
                          </span>
                        </td>
                        <td style={tdSispar()}>{r.data_calculo ? new Date(r.data_calculo+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={tdSispar()}>{r.ufir_conversao || '—'}</td>
						<td style={{...tdSisparNum,background:'#fafbff'}}>{fmtR(vTotal)}</td>
                        <td style={{...tdSisparNum,color:'#16A34A',background:'#fafbff'}}>{vDesc > 0 ? fmtR(vDesc) : '—'}</td>
                        <td style={{...tdSispar(),color:'#16A34A',fontWeight:700,background:'#fafbff'}}>{provEcon}</td>
                        <td style={{...tdSisparNum,fontWeight:700,color:'#0B1F4D',background:'#EFF6FF'}}>{fmtR(vPagar)}</td>
                        <td style={tdSispar()}>{qtEntrada > 0 ? qtEntrada : '—'}</td>
                        <td style={tdSisparNum}>{vEntrada > 0 ? fmtR(vEntrada) : '—'}</td>
                        <td style={tdSispar()}>{qtParcela > 0 ? qtParcela : '—'}</td>
                        <td style={tdSisparNum}>{vParcela > 0 ? fmtR(vParcela) : '—'}</td>
                        <td style={{...tdSispar('left'),maxWidth:150,fontSize:9}}>
                        {r.numero_processo_execucao && <div style={{fontWeight:600,color:'#0B1F4D'}}>{r.numero_processo_execucao}</div>}
                        {r.trf_regiao && <div style={{color:'#64748B'}}>{r.trf_regiao}</div>}
                        {r.vara_execucao && <div style={{color:'#64748B'}}>{r.vara_execucao}</div>}
                        {!r.numero_processo_execucao && !r.trf_regiao && '—'}
                         </td>
                         <td style={{...tdSispar('left'),maxWidth:120,color:'#64748B',fontSize:9}}>
                        {[r.socio_1,r.socio_2,r.socio_3].filter(Boolean).join(', ')||r.observacoes||'—'}
                        </td>
						<td style={{...tdSispar(), width:40}}>
                        <button
                        onClick={() => deletarCDA(r.id)}
                          title="Excluir registro"
                          style={{background:'#fff1f2',border:'1px solid #fecdd3',borderRadius:6,padding:'3px 7px',cursor:'pointer',fontSize:12,color:'#dc2626',lineHeight:1}}>
                          🗑️
                        </button>
                      </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'#dce6f7'}}>
                    <td colSpan={5} style={{...tdTotal,textAlign:'left',fontSize:11}}>TOTAIS CONSOLIDADOS</td>
                    <td style={tdTotal}>{fmtR(sisparTotais.totalSemDesconto)}</td>
                    <td style={{...tdTotal,color:'#16A34A'}}>{fmtR(sisparTotais.totalDesconto)}</td>
                    <td style={tdTotal}>
                      {sisparTotais.totalSemDesconto > 0
                        ? ((sisparTotais.totalDesconto / sisparTotais.totalSemDesconto) * 100).toFixed(1) + '%'
                        : '—'}
                    </td>
                    <td style={{...tdTotal,color:'#0B1F4D'}}>{fmtR(sisparTotais.totalAPagar)}</td>
                    <td colSpan={7} style={tdTotal}></td>
                    <td style={tdTotal}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notas de rodapé */}
            <div style={{background:'#F8FAFC',border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 16px',fontSize:10,color:C.muted,lineHeight:1.8}}>
              <div style={{fontWeight:700,color:C.navy,marginBottom:6,fontSize:11}}>📌 Notas</div>
              <div>• Valores apurados com base nos registros cadastrados na tabela CDAs do FiscalTrib.</div>
              <div>• "Prov. Econ. %" = Provimento Econômico: percentual de desconto efetivo sobre o valor sem desconto.</div>
              <div>• Modalidades e descontos sujeitos a alteração conforme editais vigentes da PGFN.</div>
              <div>• Relatório gerado em {new Date().toLocaleString('pt-BR')} · FiscalTrib — fiscaltrib.com.br</div>
              <div style={{marginTop:6,color:'#DC2626',fontWeight:600}}>⚠️ Relatório preliminar — não substitui análise jurídica profissional.</div>
            </div>
          </>
        )}
      </>}

    </div>
  )
}