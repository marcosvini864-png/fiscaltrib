import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import ImportarCDA from './ImportarCDA'
import VisualizarCDA from './VisualizarCDA'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#F8FAFC', border:'#E2E8F0',
  text:'#0F172A', muted:'#334155',
  ghost:'#F1F5F9', ghostText:'#64748B',
}

const fmtR = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtData = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'
const diasEntre = (d1,d2) => d1&&d2 ? Math.floor((new Date(d2+'T00:00:00')-new Date(d1+'T00:00:00'))/(1000*60*60*24)) : null
const addAnos = (d,anos) => { if(!d) return null; const dt=new Date(d+'T00:00:00'); dt.setFullYear(dt.getFullYear()+anos); return dt.toISOString().slice(0,10) }
const primeiroDiaExercicioSeguinte = d => {
  if(!d) return null
  const dt = new Date(d+'T00:00:00')
  return `${dt.getFullYear()+1}-01-01`
}
const hoje = new Date().toISOString().slice(0,10)
const fmtDateTime = d => d ? new Date(d).toLocaleString('pt-BR') : '—'
const parseValor = v => {
  const s = String(v||0)
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g,'').replace(',','.')) || 0
  if (s.includes(',')) return parseFloat(s.replace(',','.')) || 0
  return parseFloat(s) || 0
}


function JusticeScaleIcon({ size = 34, stroke = '#0B1F4D', accent = '#C99718' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M32 9V52" stroke={stroke} strokeWidth="3.4" strokeLinecap="round"/>
      <path d="M20 14H44" stroke={stroke} strokeWidth="3.4" strokeLinecap="round"/>
      <path d="M32 8L28.5 14H35.5L32 8Z" fill={accent}/>
      <path d="M16 18L8 34H24L16 18Z" stroke={stroke} strokeWidth="2.6" strokeLinejoin="round"/>
      <path d="M48 18L40 34H56L48 18Z" stroke={stroke} strokeWidth="2.6" strokeLinejoin="round"/>
      <path d="M8 34C9.3 39.3 12 42 16 42C20 42 22.7 39.3 24 34" stroke={accent} strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M40 34C41.3 39.3 44 42 48 42C52 42 54.7 39.3 56 34" stroke={accent} strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M16 18L32 14L48 18" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 52H42" stroke={stroke} strokeWidth="3.4" strokeLinecap="round"/>
      <path d="M26 47H38" stroke={stroke} strokeWidth="3.4" strokeLinecap="round"/>
    </svg>
  )
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

// ── Skeleton Components ────────────────────────────────────────────────────
function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array(cols).fill(null).map((_, i) => (
        <td key={i} style={{ padding: '10px 14px' }}>
          <div style={{ height: 13, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonKPI({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 12, marginBottom: 16 }}>
      {Array(count).fill(null).map((_, i) => (
        <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ height: 24, width: 80, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', margin: '0 auto 8px' }} />
          <div style={{ height: 11, width: 100, borderRadius: 4, background: '#E2E8F0', margin: '0 auto' }} />
        </div>
      ))}
    </div>
  )
}

// Ghost rows para histórico
const HISTORICO_GHOST = Array(5).fill(null).map((_, i) => ({
  ghost: true, id: i,
  razao_social: 'Nome do Cliente Exemplo',
  cnpj: '00.000.000/0001-00',
  created_at: null,
}))

// Ghost rows para CDAs salvas
const CDAS_GHOST = Array(5).fill(null).map((_, i) => ({
  ghost: true, id: i,
  numero_cda: '80.6.00.000000-00',
  devedor: 'Nome do Devedor',
  cnpj_devedor: '00.000.000/0001-00',
  periodo_divida_inicio: 'MM/AAAA',
  periodo_divida_fim: 'MM/AAAA',
  valor_total: 0,
  tipo_debito: '—',
  data_inscricao: '—',
}))

// Ghost rows para SISPAR
const SISPAR_GHOST = Array(5).fill(null).map((_, i) => ({
  ghost: true, id: i,
  numero_cda: '80.6.00.000000-00',
  devedor: 'Nome do Devedor',
  cnpj_devedor: '00.000.000/0001-00',
  total_sem_desconto: 0,
  desconto_valor: 0,
  valor_entrada: 0,
  valor_parcela: 0,
}))

function normalizarInscricao(ins={}, cda={}) {
  const tipoPadrao = ins.tipo_credito || cda.tipo_credito || 'tributario_federal'
  return novaInscricao({
    ...ins,
    numero: ins.numero || '',
    valor: ins.valor ?? ins.valor_total ?? '',
    tipo_credito: tipoPadrao,
    periodo_inicio: ins.periodo_inicio || ins.periodo_divida_inicio || '',
    periodo_fim: ins.periodo_fim || ins.periodo_divida_fim || '',
    data_fato_gerador: normalizarData(ins.data_fato_gerador) || '',
    data_vencimento: normalizarData(ins.data_vencimento || ins.data_vencimento_original) || '',
    data_constituicao: normalizarData(ins.data_constituicao || ins.data_constituicao_definitiva) || '',
    data_inscricao: normalizarData(ins.data_inscricao) || '',
    modalidade_lancamento: ins.modalidade_lancamento || '',
  })
}

function migrarCDA(cda) {
  let migrada = { ...(cda || {}) }
  if (!('numero_cda' in migrada)) migrada.numero_cda = ''

  const tipoPadrao = migrada.tipo_credito || 'tributario_federal'
  let origem = []
  if (Array.isArray(migrada.inscricoes_json) && migrada.inscricoes_json.length) origem = migrada.inscricoes_json
  else if (Array.isArray(migrada.inscricoes) && migrada.inscricoes.length) origem = migrada.inscricoes
  else if (Array.isArray(migrada.numeros) && migrada.numeros.length) origem = migrada.numeros.map(n=>({numero:n,tipo_credito:tipoPadrao}))
  else origem = [{ numero:migrada.numero || migrada.numero_cda || '', valor:migrada.valor_total || '', tipo_credito:tipoPadrao }]

  migrada.inscricoes = origem.map(ins=>normalizarInscricao(ins, migrada))
  return migrada
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
  tributario_federal: ['Decadência (art. 173 ou 150 CTN)','Prescrição (art. 174 CTN)','Prescrição intercorrente (art. 40 Lei 6.830)','Nulidade da CDA (arts. 202 e 203 CTN)','Juros SELIC inconstitucionais (RE 1.346.152)','Multa confiscatória (art. 150, IV CF)'],
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

const INSCRICAO_VAZIA = {
  numero:'',
  valor:'',
  tipo_credito:'tributario_federal',
  periodo_inicio:'',
  periodo_fim:'',
  data_fato_gerador:'',
  data_vencimento:'',
  data_constituicao:'',
  data_inscricao:'',
  valor_originario:'',
  principal_atualizado:'',
  juros:'',
  multa:'',
  encargo_legal:'',
  fundamento_legal:'',
  modalidade_lancamento:'',
}

function novaInscricao(base={}) {
  return { ...INSCRICAO_VAZIA, ...base }
}

const CDA_VAZIA = {
  numero_cda:'',
  inscricoes:[novaInscricao()],
  situacao:'Ativa',
  modalidade_lancamento:'oficio',
  data_fato_gerador:'', data_constituicao:'', data_inscricao:'',
  data_ajuizamento:'', data_despacho_citacao:'', data_citacao:'',
  data_ciencia_fazenda_nao_localizacao:'', data_ultima_movimentacao:'',
  possui_parcelamento:false, possui_suspensao:false, possui_garantia:false,
  possui_penhora:false, possui_embargos:false,
  possui_execucao_fiscal:false,
  numero_processo_execucao:'', trf_regiao:'', vara_execucao:'',
}

function chaveProcesso(cda={}) {
  return String(cda.numero_processo_execucao || cda.processo_execucao || '').trim()
}

// Eventos do processo são compartilhados entre as CDAs vinculadas ao mesmo número judicial.
// Não propagamos automaticamente fatos próprios do crédito (parcelamento, garantia, suspensão etc.).
function consolidarDadosProcessuais(lista=[]) {
  const grupos = new Map()
  const camposCompartilhados = ['data_ajuizamento','data_despacho_citacao','data_citacao','data_ciencia_fazenda_nao_localizacao','data_ultima_movimentacao','trf_regiao','vara_execucao']

  ;(lista || []).forEach(cda => {
    const processo = chaveProcesso(cda)
    if (!processo) return
    if (!grupos.has(processo)) grupos.set(processo, {})
    const comum = grupos.get(processo)
    camposCompartilhados.forEach(campo => {
      if (!comum[campo] && cda?.[campo]) comum[campo] = cda[campo]
    })
  })

  return (lista || []).map(cda => {
    const processo = chaveProcesso(cda)
    if (!processo) return cda
    const comum = grupos.get(processo) || {}
    const atualizada = {
      ...cda,
      numero_processo_execucao: processo,
      possui_execucao_fiscal: true,
    }
    camposCompartilhados.forEach(campo => {
      if (!atualizada[campo] && comum[campo]) atualizada[campo] = comum[campo]
    })
    return atualizada
  })
}

function agruparCdasPorProcesso(lista=[]) {
  const consolidadas = consolidarDadosProcessuais(lista)
  const mapa = new Map()
  consolidadas.forEach((cda, indice) => {
    const processo = chaveProcesso(cda)
    const key = processo || `__sem_processo_${indice}`
    if (!mapa.has(key)) {
      mapa.set(key, {
        key, processo, semProcesso:!processo, cdas:[], valor:0, inscricoes:0,
        data_ajuizamento:'', data_citacao:'', data_ultima_movimentacao:'', trf_regiao:'', vara_execucao:''
      })
    }
    const grupo = mapa.get(key)
    grupo.cdas.push(cda)
    grupo.valor += totalInscricoes(cda)
    grupo.inscricoes += (cda.inscricoes || []).length
    ;['data_ajuizamento','data_citacao','data_ultima_movimentacao','trf_regiao','vara_execucao'].forEach(campo => {
      if (!grupo[campo] && cda?.[campo]) grupo[campo] = cda[campo]
    })
  })
  return Array.from(mapa.values())
}

const MODALIDADES_PGFN = [
  { key:'transacao_excepcional', label:'Transação Excepcional',       desconto_multa:[50,100], desconto_juros:[50,100], entrada_min:0,  parcelas_max:60, elegibilidade:'CAPAG D ou insuficiência de recursos comprovada.' },
  { key:'transacao_individual',  label:'Transação Individual',        desconto_multa:[0,50],   desconto_juros:[0,50],   entrada_min:5,  parcelas_max:84, elegibilidade:'Dívida ativa superior a R$ 10 milhões.' },
  { key:'transacao_edital',      label:'Transação por Edital',        desconto_multa:[0,50],   desconto_juros:[0,50],   entrada_min:5,  parcelas_max:60, elegibilidade:'Dívida inscrita há mais de 1 ano, sem garantia integral.' },
  { key:'prdi',                  label:'PRDI',                        desconto_multa:[50,70],  desconto_juros:[50,70],  entrada_min:0,  parcelas_max:84, elegibilidade:'Empresa em recuperação judicial.' },
  { key:'parcelamento_ordinario',label:'Parcelamento Ordinário',      desconto_multa:[0,0],    desconto_juros:[0,0],    entrada_min:0,  parcelas_max:60, elegibilidade:'Qualquer contribuinte com dívida inscrita.' },
  { key:'njp',                   label:'Negócio Jurídico Processual', desconto_multa:[0,40],   desconto_juros:[0,40],   entrada_min:10, parcelas_max:60, elegibilidade:'Execução fiscal em andamento com penhora ou garantia.' },
]


// ── Editais e cenários vigentes — base inicial para o motor de negociação ──
// IMPORTANTE: esta base serve para enquadramento e simulação orientativa.
// A proposta efetiva do contribuinte deve ser confirmada no REGULARIZE/SISPAR.
const EDITAIS_VIGENTES_2026 = [
  {
    key:'pgdau_6_capag',
    edital:'Edital PGDAU nº 6/2026, prorrogado pelo nº 10/2026',
    modalidade:'Capacidade de Pagamento',
    prazo_adesao:'29/01/2027 às 19h',
    publico:'Pessoa física e pessoa jurídica — dívida consolidada de até R$ 45 milhões',
    regra:'Benefícios dependem da classificação A/B/C/D do contribuinte no REGULARIZE.',
    status:'validar_regularize'
  },
  {
    key:'pgdau_6_dificil',
    edital:'Edital PGDAU nº 6/2026, prorrogado pelo nº 10/2026',
    modalidade:'Débitos de difícil recuperação ou irrecuperáveis',
    prazo_adesao:'29/01/2027 às 19h',
    publico:'Contribuintes que atendam às hipóteses objetivas do edital',
    regra:'Exige enquadramento específico de recuperabilidade/situação do contribuinte.',
    status:'validar_regularize'
  },
  {
    key:'pgdau_6_pequeno',
    edital:'Edital PGDAU nº 6/2026, prorrogado pelo nº 10/2026',
    modalidade:'Pequeno Valor',
    prazo_adesao:'29/07/2027 às 19h',
    publico:'Pessoa física, MEI, ME e EPP — inscrições elegíveis até 01/06/2025',
    regra:'Até 60 salários mínimos. Não depende da capacidade de pagamento.',
    status:'simulavel'
  },
  {
    key:'pgdau_6_garantia',
    edital:'Edital PGDAU nº 6/2026, prorrogado pelo nº 10/2026',
    modalidade:'Seguro garantia ou carta fiança',
    prazo_adesao:'29/01/2027 às 19h',
    publico:'Dívidas garantidas e com decisão judicial definitiva, observados os requisitos do edital',
    regra:'Modalidade específica; deve ser validada antes de comparar com outras alternativas.',
    status:'validar_regularize'
  },
]

const CENARIOS_PEQUENO_VALOR_2026 = [
  { key:'vista_50', nome:'À vista', entrada_pct:0, entrada_parcelas:0, saldo_meses:0, desconto_pct:50, vista:true },
  { key:'pv_7',  nome:'Entrada + saldo em até 7 meses',  entrada_pct:5, entrada_parcelas:5, saldo_meses:7,  desconto_pct:50 },
  { key:'pv_12', nome:'Entrada + saldo em até 12 meses', entrada_pct:5, entrada_parcelas:5, saldo_meses:12, desconto_pct:45 },
  { key:'pv_30', nome:'Entrada + saldo em até 30 meses', entrada_pct:5, entrada_parcelas:5, saldo_meses:30, desconto_pct:40 },
  { key:'pv_55', nome:'Entrada + saldo em até 55 meses', entrada_pct:5, entrada_parcelas:5, saldo_meses:55, desconto_pct:30 },
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

  const documentosBase = [
    'Documento que comprove a data do fato gerador / competência do crédito',
    'Documento que comprove a constituição definitiva do crédito (lançamento, notificação ou decisão administrativa definitiva)',
  ]

  if (!data_fato_gerador || !data_constituicao) return {
    conclusao:'indefinida',
    titulo:'Decadência — análise inconclusiva',
    cor:'#D97706',
    passos:[
      {label:'Problema',valor:'Dados insuficientes',obs:'São necessários o fato gerador e a constituição definitiva para calcular o prazo.'}
    ],
    justificativa:'Não é possível concluir decadência apenas com parte dos marcos. A ausência de dado no FiscalTribe não significa que o marco não exista no processo ou na CDA.',
    documentosNecessarios:documentosBase
  }

  const isHomologacao = modalidade_lancamento === 'homologacao'

  const textoArt150 = 'Art. 150, §4º do CTN: se a lei não fixar prazo à homologação, o prazo é de 5 anos contado da ocorrência do fato gerador. Após a LC 236/2026, o §5º determina que, em caso de dolo, fraude ou simulação, aplica-se a contagem do art. 173, I; e o §6º explicita que, havendo pagamento parcial em tributo sujeito a lançamento por homologação, o prazo decadencial é contado da ocorrência do fato gerador.'
  const textoArt173 = 'Art. 173, I do CTN: o direito de a Fazenda Pública constituir o crédito extingue-se após 5 anos, contados do primeiro dia do exercício seguinte àquele em que o lançamento poderia ter sido efetuado.'

  const marcoInicial = isHomologacao
    ? data_fato_gerador
    : primeiroDiaExercicioSeguinte(data_fato_gerador)

  const limite = addAnos(marcoInicial, 5)
  const diasConst = diasEntre(data_fato_gerador, data_constituicao)
  const prazoExcedido = !!(data_constituicao && limite && data_constituicao > limite)

  const documentosNecessarios = [
    ...documentosBase,
    ...(isHomologacao ? [
      'Comprovante de eventual pagamento antecipado ou parcial, para confirmar a sistemática do lançamento por homologação',
      'Auto de infração/lançamento que permita verificar eventual alegação de dolo, fraude ou simulação'
    ] : [
      'Documento que permita confirmar em qual exercício o lançamento já poderia ter sido efetuado'
    ])
  ]

  const artigo = isHomologacao ? 'art. 150, §§4º, 5º e 6º do CTN' : 'art. 173, I do CTN'
  const textoLegal = isHomologacao ? textoArt150 : textoArt173

  let justificativa
  if (prazoExcedido) {
    justificativa = isHomologacao
      ? `Pelos marcos cadastrados, a hipótese preliminar do art. 150, §4º do CTN parte do fato gerador em ${fmtData(data_fato_gerador)} e alcança a data-limite de ${fmtData(limite)}. A constituição informada ocorreu em ${fmtData(data_constituicao)}, após esse marco. Há forte indício de decadência, mas a conclusão depende de confirmar a natureza do lançamento, eventual pagamento antecipado/parcial e a inexistência de dolo, fraude ou simulação. Se confirmada, prescrição e decadência extinguem o crédito tributário nos termos do art. 156, V do CTN.`
      : `Nos termos do art. 173, I do CTN, a contagem não começa simplesmente na data do fato gerador: inicia-se no primeiro dia do exercício seguinte àquele em que o lançamento poderia ter sido efetuado. Para o marco informado, foi adotado ${fmtData(marcoInicial)} como início preliminar e ${fmtData(limite)} como data-limite. A constituição ocorreu em ${fmtData(data_constituicao)}, após esse marco. Há forte indício de decadência, sujeito à confirmação do exercício em que o lançamento já poderia ter sido realizado. Se confirmada, a decadência extingue o crédito tributário (art. 156, V do CTN).`
  } else {
    justificativa = isHomologacao
      ? `Pelos marcos cadastrados, a constituição em ${fmtData(data_constituicao)} ocorreu até a data-limite preliminar de ${fmtData(limite)}, calculada a partir do fato gerador (${fmtData(data_fato_gerador)}) segundo a hipótese do art. 150, §4º do CTN. A conclusão deve ser confirmada à luz de eventual pagamento antecipado/parcial e de possível dolo, fraude ou simulação, conforme §§5º e 6º.`
      : `Pelo art. 173, I do CTN, foi considerado como marco inicial preliminar ${fmtData(marcoInicial)}, primeiro dia do exercício seguinte ao informado para o fato gerador, com data-limite em ${fmtData(limite)}. A constituição em ${fmtData(data_constituicao)} ocorreu dentro desse intervalo. Não há indício de decadência pelos marcos informados, sem prejuízo da conferência documental do exercício correto do lançamento.`
  }

  const passos = [
    { label:'Natureza de referência', valor:tipo.label, obs:`Legislação: ${tipo.legislacao}` },
    { label:'Modalidade informada', valor:isHomologacao?'Lançamento por homologação':'Lançamento sujeito ao art. 173, I', obs:artigo },
    { label:'Fundamento legal', valor:artigo, obs:textoLegal },
    { label:'Fato gerador', valor:fmtData(data_fato_gerador), obs:'Marco documental informado' },
    { label:'Marco inicial da contagem', valor:fmtData(marcoInicial), obs:isHomologacao?'Ocorrência do fato gerador — hipótese do art. 150, §4º':'Primeiro dia do exercício seguinte — art. 173, I' },
    { label:'Prazo legal', valor:'5 anos', obs:artigo },
    { label:'Data-limite preliminar', valor:fmtData(limite), obs:'Depende da confirmação dos marcos e da modalidade de lançamento' },
    { label:'Constituição definitiva', valor:fmtData(data_constituicao), obs:diasConst!==null?`${diasConst} dias após o fato gerador`:'—' },
    { label:'Conclusão', valor:prazoExcedido?'⚠️ FORTE INDÍCIO DE DECADÊNCIA':'✅ Sem indício de decadência pelos marcos informados', obs:prazoExcedido?'Confirmação documental necessária':'Conclusão preliminar' },
  ]

  if (prazoExcedido) return {
    conclusao:'ha_decadencia',
    titulo:'⚠️ Forte indício de decadência — confirmação documental necessária',
    cor:'#DC2626',
    passos,
    justificativa,
    documentosNecessarios
  }

  return {
    conclusao:'sem_decadencia',
    titulo:'✅ Sem indício de decadência pelos marcos informados',
    cor:'#16A34A',
    passos,
    justificativa,
    documentosNecessarios
  }
}

function analisarPrescricao(cda) {
  const tipo = tipoReferenciaCDA(cda)
  const {
    data_constituicao,
    data_ajuizamento,
    data_despacho_citacao,
    data_citacao,
    possui_parcelamento,
    possui_suspensao
  } = cda

  const documentosNecessarios = [
    'Documento que comprove a constituição definitiva do crédito',
    'Despacho judicial que ordenou a citação na execução fiscal, com a respectiva data',
    'Certidão/comprovante de citação, quando aplicável à cronologia do caso',
    'Certidão ou comprovante de protesto extrajudicial da CDA ou protesto judicial, se houver',
    'Termos de parcelamento, confissão, reconhecimento do débito ou outro ato inequívoco do devedor, se houver',
    'Documentos de eventual suspensão da exigibilidade (art. 151 do CTN)',
    'Documentos de mediação, arbitragem, falência/liquidação ou execução fiscal extrajudicial, se existentes'
  ]

  if (!data_constituicao) return {
    conclusao:'indefinida',
    titulo:'Prescrição — análise inconclusiva',
    cor:'#D97706',
    passos:[{label:'Problema',valor:'Constituição definitiva não informada',obs:'Sem esse marco não é possível iniciar a contagem do art. 174 do CTN.'}],
    justificativa:'O art. 174 do CTN conta o prazo prescricional a partir da constituição definitiva. Sem esse documento/marco, não há base segura para conclusão.',
    documentosNecessarios
  }

  const textoLegal = 'Art. 174 do CTN, redação vigente após a LC 236/2026: a ação de cobrança prescreve em 5 anos contados da constituição definitiva. O §1º prevê interrupção pelo despacho que ordena a citação; protesto extrajudicial da CDA ou protesto judicial; ato judicial que constitua em mora; ato inequívoco de reconhecimento do débito; instauração de mediação; arbitragem especial tributária/aduaneira; sentença de extinção da execução nas condições legais; informação do crédito em falência ou liquidação extrajudicial; e ato inicial da execução fiscal extrajudicial. O §3º dispõe que a prescrição interrompida recomeça da data do ato interruptivo ou do último ato do processo apto a interrompê-la.'

  const limiteInicial = addAnos(data_constituicao, 5)
  const hojePassouLimite = !!(limiteInicial && hoje > limiteInicial)

  const despachoAntesLimite = !!(data_despacho_citacao && data_despacho_citacao <= limiteInicial)
  const citacaoAntesLimite = !!(data_citacao && data_citacao <= limiteInicial)

  // O ajuizamento, isoladamente, NÃO é tratado como interruptor do art. 174.
  // Ele é apenas marco processual de contexto.
  const eventoInterruptivoComData = despachoAntesLimite || citacaoAntesLimite
  const haEventoSemDataSuficiente = !!(possui_parcelamento || possui_suspensao)

  const eventos = []
  if (data_despacho_citacao) eventos.push(`despacho que ordenou a citação em ${fmtData(data_despacho_citacao)} (art. 174, §1º, I)`)
  if (data_citacao) eventos.push(`citação válida em ${fmtData(data_citacao)} — ato judicial relevante; conferir o regime temporal e o despacho citatório`)
  if (possui_parcelamento) eventos.push('parcelamento informado — art. 151, VI; a adesão também pode caracterizar reconhecimento do débito para fins do art. 174, §1º, IV, conforme jurisprudência do STJ')
  if (possui_suspensao) eventos.push('causa de suspensão da exigibilidade informada — conferir hipótese e período no art. 151 do CTN')

  let conclusao = 'indefinida'
  let titulo = 'Prescrição — análise inconclusiva'
  let cor = '#D97706'
  let justificativa = ''

  if (!hojePassouLimite) {
    conclusao = 'sem_prescricao'
    titulo = '✅ Sem indício de prescrição ordinária pelos marcos informados'
    cor = '#16A34A'
    justificativa = `A constituição definitiva foi informada em ${fmtData(data_constituicao)}. O prazo quinquenal inicial do art. 174 do CTN alcança, preliminarmente, ${fmtData(limiteInicial)}. Como essa data ainda não foi ultrapassada, não há indício de prescrição ordinária pelos marcos cadastrados.`
  } else if (eventoInterruptivoComData) {
    conclusao = 'sem_prescricao'
    titulo = '✅ Evento interruptivo relevante identificado — revisar a cronologia completa'
    cor = '#16A34A'
    justificativa = `O prazo inicial do art. 174 do CTN, contado da constituição definitiva em ${fmtData(data_constituicao)}, alcançaria ${fmtData(limiteInicial)}. Foi identificado evento judicial anterior a esse marco (${eventos.join('; ')}). O ajuizamento, por si só, não é usado como interruptor. A prescrição ordinária não deve ser declarada com base apenas no primeiro quinquênio; é necessário reconstruir os eventos posteriores e, se houver execução fiscal, analisar separadamente a prescrição intercorrente.`
  } else if (haEventoSemDataSuficiente) {
    conclusao = 'indefinida'
    titulo = 'Prescrição — existem eventos informados, mas faltam datas/documentos'
    cor = '#D97706'
    justificativa = `O prazo inicial do art. 174 do CTN alcançaria ${fmtData(limiteInicial)}, porém há parcelamento e/ou suspensão informados sem documentação e datas suficientes para recalcular a cronologia. Não é seguro afirmar prescrição nem afastá-la até que esses eventos sejam comprovados.`
  } else {
    conclusao = 'ha_prescricao'
    titulo = '⚠️ Forte indício de prescrição — confirmação documental necessária'
    cor = '#DC2626'
    justificativa = `A constituição definitiva foi informada em ${fmtData(data_constituicao)} e o prazo quinquenal inicial do art. 174 do CTN alcançou ${fmtData(limiteInicial)}. Até o momento, os dados cadastrados não demonstram evento interruptivo ou suspensivo anterior a esse marco. Isso NÃO equivale a afirmar que tais eventos não existiram. Há forte indício de prescrição, que somente deve ser confirmado após a conferência do despacho que ordenou a citação, eventual protesto, reconhecimento/parcelamento, atos judiciais de mora e demais hipóteses hoje previstas no art. 174, §1º do CTN. Se confirmada, a prescrição extingue o crédito tributário (art. 156, V do CTN).`
  }

  const passos = [
    { label:'Natureza de referência', valor:tipo.label, obs:`Legislação: ${tipo.legislacao}` },
    { label:'Fundamento legal', valor:'Art. 174, caput, §§1º e 3º do CTN', obs:textoLegal },
    { label:'Constituição definitiva', valor:fmtData(data_constituicao), obs:'Marco inicial da prescrição' },
    { label:'Prazo inicial', valor:'5 anos', obs:`Data-limite preliminar: ${fmtData(limiteInicial)}` },
    { label:'Ajuizamento', valor:fmtData(data_ajuizamento)||'Não informado', obs:'Marco processual de contexto; não é tratado isoladamente como causa interruptiva do art. 174' },
    { label:'Despacho que ordenou a citação', valor:fmtData(data_despacho_citacao)||'Não informado', obs:despachoAntesLimite?'✅ Evento interruptivo identificado (art. 174, §1º, I)':'⚠️ Documento/data necessários para confirmação' },
    { label:'Citação válida', valor:fmtData(data_citacao)||'Não informada', obs:citacaoAntesLimite?'✅ Evento judicial relevante localizado; conferir despacho e regime temporal':'⚠️ Não localizada ou posterior ao marco inicial' },
    { label:'Protesto / outros atos do §1º', valor:'Não verificados nos campos atuais', obs:'Conferir protesto extrajudicial/judicial, atos de mora, reconhecimento, mediação, arbitragem, falência/liquidação e execução extrajudicial' },
    { label:'Parcelamento', valor:possui_parcelamento?'Informado':'Não informado', obs:possui_parcelamento?'Art. 151, VI + possível reconhecimento do débito (art. 174, §1º, IV) — confirmar datas':'—' },
    { label:'Suspensão da exigibilidade', valor:possui_suspensao?'Informada':'Não informada', obs:possui_suspensao?'Conferir hipótese, início e fim da suspensão no art. 151 do CTN':'—' },
    { label:'Conclusão', valor:titulo.replace(/^⚠️ |^✅ /,''), obs:conclusao==='ha_prescricao'?'Não tratar como definitiva sem os documentos listados':'Análise baseada nos marcos atualmente informados' },
  ]

  return { conclusao, titulo, cor, passos, justificativa, documentosNecessarios }
}

function analisarPrescricaoIntercorrente(cda) {
  const {
    data_ajuizamento,
    data_ciencia_fazenda_nao_localizacao,
    data_citacao,
    data_ultima_movimentacao,
    possui_penhora
  } = cda

  const documentosNecessarios = [
    'Certidão/ato que registre a primeira tentativa frustrada de localização do devedor ou de bens',
    'Documento que permita fixar a data em que a Fazenda Pública tomou ciência da não localização do devedor ou da inexistência de bens penhoráveis',
    'Decisão de suspensão e eventual arquivamento da execução, se existentes',
    'Certidões de citação efetiva ocorrida durante o período',
    'Documentos de constrição patrimonial efetiva (penhora, bloqueio efetivado ou outro ato útil), com respectivas datas',
    'Extrato/movimentações completas da execução fiscal no período analisado'
  ]

  if (!data_ajuizamento) return {
    conclusao:'indefinida',
    titulo:'Prescrição intercorrente — análise inconclusiva',
    cor:'#D97706',
    passos:[{label:'Problema',valor:'Ajuizamento não informado',obs:'É necessário identificar a execução fiscal e seus marcos processuais.'}],
    justificativa:'Sem o processo de execução e seus marcos não é possível aplicar com segurança o art. 40 da Lei 6.830/80.',
    documentosNecessarios
  }

  const textoArt40 = 'Art. 40 da Lei 6.830/80: não localizado o devedor ou não encontrados bens penhoráveis, o curso da execução é suspenso; decorrido o prazo máximo de 1 ano, segue-se o arquivamento, e o §4º disciplina o reconhecimento da prescrição intercorrente.'
  const textoTema566 = 'Tema 566/STJ: o prazo de 1 ano de suspensão tem início automaticamente na data da ciência da Fazenda Pública sobre a não localização do devedor ou a inexistência de bens penhoráveis.'
  const textoTema568 = 'Tema 568/STJ: a efetiva constrição patrimonial e a efetiva citação, ainda que por edital, são aptas a interromper a prescrição intercorrente; mero peticionamento requerendo diligências não basta.'
  const textoTema569 = 'Tema 569/STJ: encerrado o período de 1 ano de suspensão, inicia-se automaticamente o prazo prescricional aplicável, independentemente de petição da Fazenda ou de pronunciamento judicial específico nesse sentido.'
  const textoSumula314 = 'Súmula 314/STJ: não localizados bens penhoráveis, suspende-se o processo por um ano e, depois, inicia-se a prescrição quinquenal intercorrente.'

  if (!data_ciencia_fazenda_nao_localizacao) {
    return {
      conclusao:'indefinida',
      titulo:'Prescrição intercorrente — falta o marco inicial do art. 40',
      cor:'#D97706',
      passos:[
        { label:'Fundamento legal', valor:'Art. 40 da LEF + Temas 566, 568 e 569/STJ', obs:`${textoTema566} ${textoTema568} ${textoTema569}` },
        { label:'Ajuizamento', valor:fmtData(data_ajuizamento), obs:'Identifica a execução, mas não fixa sozinho o início da prescrição intercorrente' },
        { label:'Ciência da Fazenda da não localização', valor:'Não informada', obs:'⚠️ Este é o marco indispensável para a contagem automática do Tema 566/STJ' },
        { label:'Última movimentação cadastrada', valor:fmtData(data_ultima_movimentacao)||'Não informada', obs:'Serve como contexto; não substitui o marco do Tema 566' },
      ],
      justificativa:`Não é juridicamente seguro calcular a prescrição intercorrente simplesmente a partir da última movimentação processual. Pelo Tema 566/STJ, o marco relevante é a ciência da Fazenda Pública da não localização do devedor ou da inexistência de bens penhoráveis. Enquanto essa data não for localizada nos autos, a análise deve permanecer inconclusiva.`,
      documentosNecessarios
    }
  }

  const fimSuspensao = addAnos(data_ciencia_fazenda_nao_localizacao, 1)
  const limitePrescricao = addAnos(fimSuspensao, 5)
  const citacaoPosterior = !!(data_citacao && data_citacao >= data_ciencia_fazenda_nao_localizacao)
  const hojePassouLimite = hoje > limitePrescricao

  let conclusao
  let titulo
  let cor
  let justificativa

  if (possui_penhora || citacaoPosterior) {
    conclusao = 'indefinida'
    titulo = 'Prescrição intercorrente — ato útil informado; confirmar data e efeito'
    cor = '#D97706'
    justificativa = `A ciência da Fazenda foi informada em ${fmtData(data_ciencia_fazenda_nao_localizacao)}, o período de 1 ano de suspensão alcança ${fmtData(fimSuspensao)} e o quinquênio subsequente, em cálculo preliminar, alcança ${fmtData(limitePrescricao)}. Entretanto, há ${possui_penhora?'penhora/constrição informada':''}${possui_penhora&&citacaoPosterior?' e ':''}${citacaoPosterior?'citação posterior informada':''}. Pelo Tema 568/STJ, somente a efetiva constrição patrimonial e a efetiva citação são aptas a interromper o prazo. É indispensável confirmar a data e a efetividade desses atos antes de concluir.`
  } else if (hojePassouLimite) {
    conclusao = 'ha_prescricao_intercorrente'
    titulo = '⚠️ Forte indício de prescrição intercorrente — confirmação nos autos necessária'
    cor = '#DC2626'
    justificativa = `A ciência da Fazenda da não localização do devedor/bens foi informada em ${fmtData(data_ciencia_fazenda_nao_localizacao)}. Pelo art. 40 da LEF e pelo Tema 566/STJ, o período de 1 ano de suspensão alcança ${fmtData(fimSuspensao)}; encerrado esse período, inicia-se automaticamente o prazo prescricional aplicável, conforme Tema 569/STJ. O marco preliminar de 5 anos alcança ${fmtData(limitePrescricao)}. Como os dados cadastrados não demonstram citação efetiva ou constrição patrimonial efetiva no período, há forte indício de prescrição intercorrente. A conclusão depende da conferência integral dos autos, especialmente dos atos descritos no Tema 568/STJ.`
  } else {
    conclusao = 'sem_prescricao_intercorrente'
    titulo = '✅ Sem indício de prescrição intercorrente pelo marco informado'
    cor = '#16A34A'
    justificativa = `A ciência da Fazenda foi informada em ${fmtData(data_ciencia_fazenda_nao_localizacao)}. O período de 1 ano de suspensão alcança ${fmtData(fimSuspensao)} e o prazo quinquenal subsequente, em cálculo preliminar, alcança ${fmtData(limitePrescricao)}. Pelos marcos cadastrados, esse prazo ainda não foi ultrapassado.`
  }

  const passos = [
    { label:'Fundamento legal', valor:'Art. 40 da Lei 6.830/80', obs:textoArt40 },
    { label:'Tema 566/STJ', valor:'Marco inicial automático', obs:textoTema566 },
    { label:'Tema 568/STJ', valor:'Atos interruptivos efetivos', obs:textoTema568 },
    { label:'Tema 569/STJ', valor:'Início automático após 1 ano', obs:textoTema569 },
    { label:'Súmula 314/STJ', valor:'1 ano + prescrição quinquenal', obs:textoSumula314 },
    { label:'Ajuizamento', valor:fmtData(data_ajuizamento), obs:'Contexto processual' },
    { label:'Ciência da Fazenda da não localização', valor:fmtData(data_ciencia_fazenda_nao_localizacao), obs:'Marco do Tema 566/STJ' },
    { label:'Fim do período de suspensão', valor:fmtData(fimSuspensao), obs:'1 ano após a ciência da Fazenda' },
    { label:'Data-limite preliminar', valor:fmtData(limitePrescricao), obs:'Quinquênio subsequente, sujeito a atos interruptivos efetivos' },
    { label:'Citação efetiva posterior', valor:citacaoPosterior?fmtData(data_citacao):'Não identificada', obs:citacaoPosterior?'⚠️ Confirmar efetividade e impacto na contagem':'Tema 568/STJ' },
    { label:'Constrição patrimonial efetiva', valor:possui_penhora?'Informada':'Não informada', obs:possui_penhora?'⚠️ Confirmar data e efetividade documentalmente':'Tema 568/STJ' },
    { label:'Última movimentação', valor:fmtData(data_ultima_movimentacao)||'Não informada', obs:'Dado auxiliar; não é usado isoladamente como marco inicial' },
    { label:'Conclusão', valor:titulo.replace(/^⚠️ |^✅ /,''), obs:conclusao==='ha_prescricao_intercorrente'?'Confirmação integral dos autos obrigatória':'Análise preliminar pelos marcos informados' },
  ]

  return { conclusao, titulo, cor, passos, justificativa, documentosNecessarios }
}

function analisarCDA(cda) {
  const tipo = tipoReferenciaCDA(cda)
  const teses = tesesReferenciaCDA(cda)
  const inscricoesValidas = (cda.inscricoes||[]).filter(ins=>ins.numero&&ins.numero.trim())
  const tiposDistintos = [...new Set((cda.inscricoes||[]).map(ins=>ins.tipo_credito).filter(Boolean))].length

  const textoArt202 = 'Art. 202 do CTN, redação vigente após a LC 236/2026: I — nome do devedor e dos corresponsáveis e, sempre que possível, domicílio/residência; II — quantia devida e maneira de calcular os juros de mora acrescidos; III — origem e natureza do crédito, com indicação específica da disposição legal; IV — data da inscrição; V — sendo o caso, número do processo administrativo de origem. O §1º exige ainda, na certidão, a indicação do livro e da folha da inscrição.'
  const textoArt203 = 'Art. 203 do CTN: a omissão de requisito do art. 202 ou erro a ele relativo é causa de nulidade da inscrição e do processo de cobrança, mas a nulidade pode ser sanada até a decisão de primeira instância mediante substituição da certidão, com devolução do prazo de defesa quanto à parte modificada.'

  const nomeDevedor = cda.devedor || cda.razao_social || ''
  const domicilio = cda.domicilio || cda.endereco || [cda.municipio,cda.uf].filter(Boolean).join(' / ')
  const valor = totalInscricoes(cda)
  const processoAdm = cda.processo_administrativo || ''
  const livroFolha = cda.livro_folha || ''
  const fundamento = cda.fundamento_legal || ''
  const formaJuros = cda.forma_calculo_juros || ''

  const pendencias = []
  if (!nomeDevedor) pendencias.push('Art. 202, I — nome do devedor/corresponsáveis não confirmado nos dados carregados')
  if (!domicilio) pendencias.push('Art. 202, I — domicílio/residência não confirmado nos dados carregados')
  if (!(valor > 0)) pendencias.push('Art. 202, II — quantia devida não confirmada')
  if (!formaJuros) pendencias.push('Art. 202, II — maneira de calcular os juros de mora deve ser conferida na CDA/discriminativo')
  if (!fundamento) pendencias.push('Art. 202, III — disposição legal de origem/natureza do crédito deve ser conferida no documento')
  if (!cda.data_inscricao) pendencias.push('Art. 202, IV — data da inscrição não confirmada')
  if (!processoAdm) pendencias.push('Art. 202, V — número do processo administrativo, quando aplicável, não confirmado')
  if (!livroFolha) pendencias.push('Art. 202, §1º — livro e folha da inscrição não confirmados')

  const passos = [
    { label:'Fundamentos legais', valor:'Arts. 202 e 203 do CTN', obs:`${textoArt202} ${textoArt203}` },
    { label:'Natureza cadastrada', valor:tipo.label, obs:`Classificação do FiscalTribe: ${tipo.legislacao}. Confirmar a base legal no documento.` },
    { label:'Tipos distintos na CDA', valor:`${tiposDistintos || 0} tipo(s)`, obs:tiposDistintos>1?'⚠️ Conferir cada natureza individualmente':'—' },
    { label:'Art. 202, I — Devedor/corresponsáveis', valor:nomeDevedor?`✅ ${nomeDevedor}`:'⚠️ Não confirmado', obs:'A falta no sistema não prova ausência na CDA.' },
    { label:'Art. 202, I — Domicílio/residência', valor:domicilio?`✅ ${domicilio}`:'⚠️ Não confirmado', obs:'Sempre que possível, deve constar no termo de inscrição.' },
    { label:'Art. 202, II — Quantia devida', valor:valor>0?`✅ ${fmtR(valor)}`:'⚠️ Não confirmada', obs:'Conferir também os componentes e a data-base documental.' },
    { label:'Art. 202, II — Cálculo dos juros', valor:formaJuros||'⚠️ Não estruturado no sistema', obs:'Conferir a maneira de cálculo dos juros de mora no documento.' },
    { label:'Art. 202, III — Origem/natureza e disposição legal', valor:fundamento||'⚠️ Não confirmado', obs:`Natureza cadastrada: ${tipo.label}` },
    { label:'Art. 202, IV — Data da inscrição', valor:cda.data_inscricao?`✅ ${fmtData(cda.data_inscricao)}`:'⚠️ Não confirmada', obs:'' },
    { label:'Art. 202, V — Processo administrativo', valor:processoAdm||'⚠️ Não confirmado', obs:'Exigido quando for o caso.' },
    { label:'Art. 202, §1º — Livro/folha', valor:livroFolha||'⚠️ Não confirmado', obs:'Requisito adicional da certidão.' },
    { label:'Art. 203 — Consequência jurídica', valor:'Nulidade é possível se a omissão/erro estiver realmente no título', obs:'A ausência de dado importado não equivale, sozinha, a vício da CDA; é necessário confrontar o documento.' },
    { label:'Pendências de conferência', valor:`${pendencias.length} item(ns)`, obs:pendencias.join('; ')||'Nenhuma pendência documental nos campos avaliados' },
  ]

  const documentosNecessarios = pendencias.length ? [
    'Cópia integral e legível da CDA',
    'Discriminativo de crédito / memória de cálculo',
    'Termo ou certidão de inscrição com livro/folha, quando aplicável',
    'Processo administrativo ou auto de infração de origem, quando aplicável',
  ] : []

  if (pendencias.length === 0) {
    return {
      conclusao:'cda_ok',
      titulo:'✅ Requisitos formais verificáveis presentes — arts. 202 e 203 do CTN',
      cor:'#16A34A',
      passos,
      teses,
      justificativa:`Nos campos atualmente disponíveis, os requisitos verificáveis do art. 202 do CTN estão presentes. O art. 203 é a regra que trata da nulidade por omissão/erro e da possibilidade de saneamento mediante substituição da certidão. A conclusão permanece vinculada à conferência do título original.`,
      documentosNecessarios
    }
  }

  return {
    conclusao:'indefinida',
    titulo:`⚠️ Validade formal — ${pendencias.length} ponto(s) exigem conferência documental`,
    cor:'#D97706',
    passos,
    teses,
    justificativa:`Foram encontradas ${pendencias.length} pendência(s) de verificação. Isso não significa que a CDA esteja automaticamente viciada: ausência de informação no FiscalTribe não é prova de omissão no título. Somente se o requisito estiver efetivamente ausente ou incorreto na CDA aplica-se a consequência do art. 203 do CTN, observada a possibilidade legal de saneamento.`,
    documentosNecessarios
  }
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

  if (problemas.length===0) return { conclusao:'elegivel', titulo:'✅ Elegível à Transação por Capacidade de Pagamento', cor:'#16A34A', passos, justificativa:`A CDA atende aos critérios de elegibilidade do Edital PGDAU 6/2026 para a modalidade de capacidade de pagamento.` }
  return { conclusao:'nao_elegivel', titulo:'⚠️ Possível inelegibilidade', cor:'#D97706', passos, justificativa:`Foram identificados ${problemas.length} ponto(s) que podem impedir ou exigir modalidade diferente: ${problemas.join('; ')}.` }
}

function cdaParaInscricao(cda, ins) {
  const normal = normalizarInscricao(ins, cda)
  return {
    ...cda,
    inscricoes:[normal],
    modalidade_lancamento: normal.modalidade_lancamento || cda.modalidade_lancamento || 'oficio',
    data_fato_gerador: normal.data_fato_gerador || cda.data_fato_gerador || '',
    data_constituicao: normal.data_constituicao || cda.data_constituicao || '',
    data_inscricao: normal.data_inscricao || cda.data_inscricao || '',
  }
}

function resumirAnalisesInscricoes(inscricoesAnalise, campo, tipo) {
  const total = inscricoesAnalise.length
  const resultados = inscricoesAnalise.map(x=>x[campo]).filter(Boolean)
  const positivos = resultados.filter(r=>r.conclusao === `ha_${tipo}`)
  const indef = resultados.filter(r=>r.conclusao === 'indefinida')
  const label = tipo === 'decadencia' ? 'decadência' : 'prescrição'
  const cor = positivos.length ? '#DC2626' : indef.length ? '#D97706' : '#16A34A'
  const conclusao = positivos.length ? `ha_${tipo}` : indef.length ? 'indefinida' : `sem_${tipo}`
  const titulo = positivos.length
    ? `⚠️ ${positivos.length} de ${total} inscrição(ões) com indício de ${label}`
    : indef.length
      ? `⚠️ ${indef.length} de ${total} inscrição(ões) com análise de ${label} inconclusiva`
      : `✅ Nenhuma inscrição com ${label} identificada`
  const justificativa = total
    ? `Resultado consolidado da CDA. Cada inscrição/crédito foi analisado separadamente. ${positivos.length} inscrição(ões) apresentou(aram) indício de ${label}; ${indef.length} ficou(aram) inconclusiva(s). Consulte o detalhamento individual abaixo.`
    : 'Nenhuma inscrição foi informada para análise.'
  const passos = inscricoesAnalise.map((x,i)=>({
    label:`Inscrição ${i+1}`,
    valor:x.inscricao?.numero || 'Sem número',
    obs:x[campo]?.titulo || 'Sem resultado'
  }))
  return { conclusao, titulo, cor, justificativa, passos }
}

function analisarCDAComInscricoes(cdaOriginal) {
  const cda = migrarCDA(cdaOriginal)
  const inscricoesValidas = (cda.inscricoes || []).length ? cda.inscricoes : [novaInscricao({numero:cda.numero_cda||'',valor:totalInscricoes(cda)})]
  const inscricoesAnalise = inscricoesValidas.map((inscricao, indice) => {
    const contexto = cdaParaInscricao(cda, inscricao)
    return {
      indice,
      inscricao,
      decadencia: analisarDecadencia(contexto),
      prescricao: analisarPrescricao(contexto),
    }
  })
  return {
    cda,
    inscricoesAnalise,
    decadencia: resumirAnalisesInscricoes(inscricoesAnalise, 'decadencia', 'decadencia'),
    prescricao: resumirAnalisesInscricoes(inscricoesAnalise, 'prescricao', 'prescricao'),
    prescricaoIntercorrente: analisarPrescricaoIntercorrente(cda),
    validadeCDA: analisarCDA(cda),
  }
}

function analisarConjuntoCDAs(lista) {
  return consolidarDadosProcessuais(lista || []).map(analisarCDAComInscricoes)
}

function calcularScoreAnalise(resultados) {
  let score = 50
  resultados.forEach(r => {
    const decadentes = (r.inscricoesAnalise || []).filter(x=>x.decadencia?.conclusao==='ha_decadencia').length
    const prescritas = (r.inscricoesAnalise || []).filter(x=>x.prescricao?.conclusao==='ha_prescricao').length
    if (decadentes) score += Math.min(25, 10 + decadentes * 5)
    if (prescritas) score += Math.min(25, 10 + prescritas * 5)
    if(r.prescricaoIntercorrente?.conclusao==='ha_prescricao_intercorrente') score+=15
    if(r.validadeCDA?.conclusao==='cda_vicio') score+=10
  })
  return Math.min(100, score)
}

function resumoFinanceiroInscricoes(resultados) {
  let total = 0, questionavel = 0, exigivel = 0, inscricoes = 0, questionaveis = 0
  resultados.forEach(r => {
    ;(r.inscricoesAnalise || []).forEach(x => {
      const valor = parseValor(x.inscricao?.valor)
      const temRisco = x.decadencia?.conclusao === 'ha_decadencia' || x.prescricao?.conclusao === 'ha_prescricao'
      total += valor
      inscricoes += 1
      if (temRisco) { questionavel += valor; questionaveis += 1 }
      else exigivel += valor
    })
  })
  return { total, questionavel, exigivel, inscricoes, questionaveis }
}

function gerarParecer(resultados) {
  const parecer = []; let urgente = false
  resultados.forEach((a,i) => {
    const num = rotuloCDA(a.cda, i)
    ;(a.inscricoesAnalise || []).forEach((item, j) => {
      const numeroInscricao = item.inscricao?.numero || `inscrição ${j+1}`
      if(item.decadencia?.conclusao==='ha_decadencia') {
        parecer.push({tipo:'danger',msg:`${num} · ${numeroInscricao}: forte indício de decadência — confirmar os marcos e documentos indicados antes de concluir pela extinção do crédito.`}); urgente=true
      }
      if(item.prescricao?.conclusao==='ha_prescricao') {
        parecer.push({tipo:'danger',msg:`${num} · ${numeroInscricao}: forte indício de prescrição — confirmação documental necessária (despacho citatório, protesto, reconhecimento/parcelamento e demais eventos do art. 174 do CTN).`}); urgente=true
      }
      if(item.decadencia?.conclusao==='indefinida') parecer.push({tipo:'warning',msg:`${num} · ${numeroInscricao}: decadência inconclusiva — complementar os marcos e documentos desta inscrição.`})
      if(item.prescricao?.conclusao==='indefinida') parecer.push({tipo:'warning',msg:`${num} · ${numeroInscricao}: prescrição inconclusiva — reconstruir a cronologia documental dos eventos interruptivos/suspensivos.`})
    })
    if(a.prescricaoIntercorrente?.conclusao==='ha_prescricao_intercorrente') {
      parecer.push({tipo:'danger',msg:`${num}: forte indício de prescrição intercorrente — confirmar nos autos o marco do art. 40 e a existência de citação/constrição efetiva.`}); urgente=true
    }
    if(a.prescricaoIntercorrente?.conclusao==='indefinida') {
      parecer.push({tipo:'warning',msg:`${num}: prescrição intercorrente inconclusiva — localizar a ciência da Fazenda sobre a não localização do devedor/bens e os atos úteis posteriores.`})
    }
    if(a.validadeCDA?.conclusao==='cda_vicio') parecer.push({tipo:'warning',msg:`${num}: vício formal confirmado na CDA — verificar consequência e possibilidade de saneamento pelo art. 203 do CTN.`})
    if(a.validadeCDA?.conclusao==='indefinida') parecer.push({tipo:'warning',msg:`${num}: validade formal da CDA depende de conferência documental dos requisitos dos arts. 202 e 203 do CTN.`})
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
      {resultado.documentosNecessarios&&resultado.documentosNecessarios.length>0&&(
        <div style={{marginTop:10,background:'#FFFFFF',border:'1px solid #E2E8F0',borderRadius:8,padding:'10px 12px'}}>
          <div style={{fontSize:11,fontWeight:800,color:C.navy,marginBottom:6,textTransform:'uppercase',letterSpacing:0.7}}>Documentos necessários para confirmar ou afastar a conclusão</div>
          {resultado.documentosNecessarios.map((doc,i)=>(
            <div key={i} style={{fontSize:11.5,color:C.text,lineHeight:1.55,marginTop:i?4:0}}>• {doc}</div>
          ))}
        </div>
      )}
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
        onCadastrarNovo({ id: data[0].id, razao_social: data[0].razao_social, cnpj: data[0].cnpj })
        setModoNovo(false); setNovoNome(''); setNovoCnpj(''); setAberto(false)
      }
    } catch(e){ alert('Erro ao cadastrar cliente: '+e.message) }
    setSalvandoNovo(false)
  }

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setAberto(!aberto)} style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,
        background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:9,
        padding:'10px 14px',color:'#0F172A',fontSize:13,cursor:'pointer',width:340,
        boxShadow:'0 1px 2px rgba(15,23,42,0.04)'
      }}>
        <span style={{fontWeight:600}}>👤 {clienteAtual ? `${clienteAtual.razao_social}${clienteAtual.cnpj?' · '+clienteAtual.cnpj:''}` : 'Selecionar cliente...'}</span>
        <span style={{color:'#64748B'}}>▼</span>
      </button>

      {aberto&&(
        <div style={{position:'absolute',top:'110%',left:0,width:380,background:C.white,borderRadius:10,border:`1px solid ${C.border}`,boxShadow:'0 8px 24px rgba(0,0,0,0.18)',zIndex:50,padding:14}}>
          {!modoNovo ? (
            <>
              <input autoFocus value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ..."
                style={{width:'100%',padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,marginBottom:10,boxSizing:'border-box'}}/>
              <div style={{maxHeight:220,overflowY:'auto'}}>
                {carregando?(
                  <div style={{textAlign:'center',padding:16,color:C.muted,fontSize:13}}>Carregando...</div>
                ):filtrados.length===0?(
                  <div style={{textAlign:'center',padding:16,color:C.muted,fontSize:13}}>Nenhum cliente encontrado.</div>
                ):filtrados.map(c=>(
                  <div key={c.id}
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
  const [clienteAtual, setClienteAtual] = useState(
    active ? { id: active.id || null, razao_social: active.razao_social, cnpj: active.cnpj } : null
  )
  const [dados, setDados] = useState({ cnpj:active?.cnpj||'', valor_total:'', orgao_credor:'PGFN', processo_execucao:'', possui_parcelamento:false, possui_transacao_anterior:false, possui_garantia:false, possui_penhora:false, possui_bloqueio:false, possui_embargos:false, observacoes:'' })
  const [cdas, setCdas] = useState([{...CDA_VAZIA}])
  const [sim, setSim] = useState({ valor:'', modalidade:'transacao_edital', desconto_multa:50, desconto_juros:50, parcelas:60, entrada_pct:5, multa_pct:20, juros_pct:30 })
  const [simResult, setSimResult] = useState(null)
  const [negociacao, setNegociacao] = useState({
    valor_atualizado:'',
    data_base:hoje,
    origem_valor:'Regularize',
    tipo_contribuinte:'pf',
    capag:'',
    objetivo:'maior_economia'
  })
  const [cenariosNegociacao, setCenariosNegociacao] = useState([])
  const [regraCapag, setRegraCapag] = useState(null)
  const [teseTransacao, setTeseTransacao] = useState(null)
  const [sisparDados, setSisparDados] = useState([])
  const [sisparLoading, setSisparLoading] = useState(false)
  const [cdasSalvas, setCdasSalvas] = useState([])
  const [mostrarCdasSalvas, setMostrarCdasSalvas] = useState(false)
  const [mostrarImportarCDA, setMostrarImportarCDA] = useState(false)
  const [loadingCdas, setLoadingCdas] = useState(false)
  const [cdaVisualizar, setCdaVisualizar] = useState(null)
  const [analisesCdaVisualizar, setAnalisesCdaVisualizar] = useState([])
  const [diagnosticoCdaVisualizar, setDiagnosticoCdaVisualizar] = useState(null)

  // ── Injetar shimmer CSS ────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    const total = (cdas || []).reduce((acc, cda) => acc + totalInscricoes(cda), 0)
    if (total > 0) {
      setDados(d => ({ ...d, valor_total: total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }))
      setNegociacao(n => {
        const origemDocumento = !n.valor_atualizado || String(n.origem_valor || '').includes('CDA/documento')
        return origemDocumento
          ? { ...n, valor_atualizado:String(total), data_base:hoje, origem_valor:'CDA/documento importado — confirmar no Regularize' }
          : n
      })
    }
  }, [cdas])

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
      devedor: campos.devedor || '',
      cnpj_devedor: campos.cnpj_devedor || '',
      municipio: campos.municipio || '',
      uf: campos.uf || '',
      processo_administrativo: campos.processo_administrativo || '',
      livro_folha: campos.livro_folha || '',
      fundamento_legal: campos.fundamento_legal || '',
      forma_calculo_juros: campos.forma_calculo_juros || '',
      inscricoes: (Array.isArray(campos.inscricoes) && campos.inscricoes.length
        ? campos.inscricoes.map(ins=>normalizarInscricao(ins, { tipo_credito: tipoCredito }))
        : [novaInscricao({ numero: campos.numero_cda || '', valor: String(campos.valor_total || '0'), tipo_credito: tipoCredito, data_fato_gerador:normalizarData(campos.data_fato_gerador)||'', data_constituicao:normalizarData(campos.data_constituicao_definitiva)||normalizarData(campos.data_inscricao)||'', data_inscricao:normalizarData(campos.data_inscricao)||'', modalidade_lancamento:campos.modalidade_lancamento||'oficio' })]),
      situacao: 'Ativa',
      modalidade_lancamento: campos.modalidade_lancamento || 'oficio',
      data_fato_gerador:        normalizarData(campos.data_fato_gerador) || '',
      data_constituicao:        normalizarData(campos.data_constituicao_definitiva) || normalizarData(campos.data_inscricao) || '',
      data_inscricao:           normalizarData(campos.data_inscricao) || '',
      data_ajuizamento:         normalizarData(campos.data_ajuizamento) || '',
      data_despacho_citacao:    normalizarData(campos.data_despacho_citacao) || '',
      data_citacao:             normalizarData(campos.data_citacao) || '',
      data_ciencia_fazenda_nao_localizacao: normalizarData(campos.data_ciencia_fazenda_nao_localizacao) || '',
      data_ultima_movimentacao: normalizarData(campos.data_ultima_movimentacao) || '',
      possui_execucao_fiscal:   !!(campos.possui_execucao_fiscal || campos.numero_processo_execucao),
      numero_processo_execucao: campos.numero_processo_execucao || '',
      trf_regiao:               campos.trf_regiao || '',
      vara_execucao:            campos.vara_execucao || '',
    }

    setDados(d => ({
      ...d,
      cnpj: campos.cnpj_devedor || clienteEfetivo?.cnpj || '',
      valor_total: campos.valor_total ? parseValor(campos.valor_total).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '',
      orgao_credor: 'PGFN',
      processo_execucao: d.processo_execucao || campos.numero_processo_execucao || '',
    }))
    setNegociacao(n => ({
      ...n,
      valor_atualizado: n.valor_atualizado || (campos.valor_total ? String(parseValor(campos.valor_total)) : ''),
      data_base: hoje,
      origem_valor: n.valor_atualizado ? n.origem_valor : 'CDA/documento importado — confirmar no Regularize'
    }))
    setCenariosNegociacao([])
    setCdas([cdaDiag])
    setDiagnostico(null)
    setAnalisesCDA([])
    setRegistroId(null)

    if (onCdaConsumed) onCdaConsumed()

    setTimeout(() => {
      const resultados = analisarConjuntoCDAs([cdaDiag])
      const { parecer, urgente } = gerarParecer(resultados)
      const score = calcularScoreAnalise(resultados)
      const diagNovo = { parecer, urgente, score, valor:0, data: new Date().toISOString() }
      setAnalisesCDA(resultados)
      setDiagnostico(diagNovo)
      setAba(1)
    }, 100)
  }, [cdaParaDiagnostico])

  function montarCdaImportada(payload) {
    const campos = payload?.campos || {}
    const tipoCredito = campos.tipo_debito || 'tributario_federal'
    return migrarCDA({
      ...CDA_VAZIA,
      numero_cda: campos.numero_cda || '',
      devedor: campos.devedor || '',
      cnpj_devedor: campos.cnpj_devedor || '',
      municipio: campos.municipio || '',
      uf: campos.uf || '',
      processo_administrativo: campos.processo_administrativo || '',
      livro_folha: campos.livro_folha || '',
      fundamento_legal: campos.fundamento_legal || '',
      forma_calculo_juros: campos.forma_calculo_juros || '',
      inscricoes: (Array.isArray(campos.inscricoes) && campos.inscricoes.length)
        ? campos.inscricoes
        : [novaInscricao({ numero:campos.numero_cda||'', valor:String(campos.valor_total||'0'), tipo_credito:tipoCredito })],
      situacao:'Ativa',
      modalidade_lancamento:campos.modalidade_lancamento || 'oficio',
      data_fato_gerador:normalizarData(campos.data_fato_gerador)||'',
      data_constituicao:normalizarData(campos.data_constituicao_definitiva)||normalizarData(campos.data_inscricao)||'',
      data_inscricao:normalizarData(campos.data_inscricao)||'',
      data_ajuizamento:normalizarData(campos.data_ajuizamento)||'',
      data_despacho_citacao:normalizarData(campos.data_despacho_citacao)||'',
      data_citacao:normalizarData(campos.data_citacao)||'',
      data_ciencia_fazenda_nao_localizacao:normalizarData(campos.data_ciencia_fazenda_nao_localizacao)||'',
      data_ultima_movimentacao:normalizarData(campos.data_ultima_movimentacao)||'',
      possui_execucao_fiscal:!!(campos.possui_execucao_fiscal || campos.numero_processo_execucao),
      numero_processo_execucao:campos.numero_processo_execucao || '',
      trf_regiao:campos.trf_regiao || '',
      vara_execucao:campos.vara_execucao || '',
    })
  }

  function adicionarCdaImportada(payload) {
    if (!payload?.campos) { setMostrarImportarCDA(false); return }
    const nova = montarCdaImportada(payload)
    if (payload.clienteEfetivo?.id) {
      setClienteAtual({ id:payload.clienteEfetivo.id, razao_social:payload.clienteEfetivo.razao_social, cnpj:payload.clienteEfetivo.cnpj || '' })
    }
    setDados(d=>({
      ...d,
      cnpj:payload.campos.cnpj_devedor || payload.clienteEfetivo?.cnpj || d.cnpj,
      orgao_credor:'PGFN',
      processo_execucao:d.processo_execucao || payload.campos.numero_processo_execucao || '',
    }))
    setCdas(prev => {
      const limpas = (prev || []).filter(c => c.numero_cda || (c.inscricoes || []).some(ins=>ins.numero || parseValor(ins.valor)>0))
      const duplicada = limpas.some(c => c.numero_cda && nova.numero_cda && c.numero_cda === nova.numero_cda)
      const proximas = duplicada ? limpas.map(c=>c.numero_cda===nova.numero_cda ? nova : c) : [...limpas, nova]
      return consolidarDadosProcessuais(proximas)
    })
    setDiagnostico(null)
    setAnalisesCDA([])
    setCenariosNegociacao([])
    setRegistroId(null)
    setMostrarImportarCDA(false)
    setAba(1)
  }

  async function carregarSispar() {
    setSisparLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const clienteId = clienteAtual?.id || active?.id || null
      let query = supabase.from('cdas').select('*').eq('usuario_id', user.id)
      if (clienteId) query = query.eq('cliente_id', clienteId)
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
    // Monta cdaDiag para as funções de análise
    const tipoCredito = cda.tipo_debito || cda.tipo_credito || 'tributario_federal'
    const cdaDiag = {
      ...CDA_VAZIA,
      numero_cda:               cda.numero_cda || '',
      inscricoes: (Array.isArray(cda.inscricoes_json) && cda.inscricoes_json.length
        ? cda.inscricoes_json.map(ins=>normalizarInscricao(ins, cda))
        : [novaInscricao({ numero: cda.numero_cda || '', valor: parseValor(cda.valor_total) > 0 ? parseValor(cda.valor_total).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '', tipo_credito: tipoCredito, data_fato_gerador:normalizarData(cda.data_fato_gerador)||'', data_constituicao:normalizarData(cda.data_constituicao_definitiva)||normalizarData(cda.data_constituicao)||normalizarData(cda.data_inscricao)||'', data_inscricao:normalizarData(cda.data_inscricao)||'', modalidade_lancamento:cda.modalidade_lancamento||'oficio' })]),
      situacao:                 cda.situacao || 'Ativa',
      modalidade_lancamento:    cda.modalidade_lancamento || 'oficio',
      data_fato_gerador:        normalizarData(cda.data_fato_gerador) || '',
      data_constituicao:        normalizarData(cda.data_constituicao_definitiva) || normalizarData(cda.data_constituicao) || normalizarData(cda.data_inscricao) || '',
      data_inscricao:           normalizarData(cda.data_inscricao) || '',
      data_ajuizamento:         normalizarData(cda.data_ajuizamento) || '',
      data_citacao:             normalizarData(cda.data_citacao) || '',
      data_ultima_movimentacao: normalizarData(cda.data_ultima_movimentacao) || '',
      possui_parcelamento:      cda.possui_parcelamento || false,
      possui_suspensao:         cda.possui_suspensao || false,
      possui_garantia:          cda.possui_garantia || false,
      possui_penhora:           cda.possui_penhora || false,
      possui_embargos:          cda.possui_embargos || false,
      possui_execucao_fiscal:   !!(cda.possui_execucao_fiscal || cda.numero_processo_execucao),
      numero_processo_execucao: cda.numero_processo_execucao || '',
      trf_regiao:               cda.trf_regiao || '',
      vara_execucao:            cda.vara_execucao || '',
    }

    // Roda diagnóstico
    const resultados = analisarConjuntoCDAs([cdaDiag])
    const { parecer, urgente } = gerarParecer(resultados)
    const score = calcularScoreAnalise(resultados)
    const diagNovo = { parecer, urgente, score, valor: parseFloat(cda.valor_total)||0, data: new Date().toISOString() }

    // Abre VisualizarCDA com CDA completa + diagnóstico
    setMostrarCdasSalvas(false)
    setCdaVisualizar(cda)
    setAnalisesCdaVisualizar(resultados)
    setDiagnosticoCdaVisualizar(diagNovo)
  }

  async function deletarCDA(id) {
    if (!window.confirm('Excluir este registro da CDA?')) return
    try {
      const { error } = await supabase.from('cdas').delete().eq('id', id)
      if (error) throw error
      await carregarSispar()
      await carregarCdasSalvas()
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
      const diagBase = diagOverride ?? diagnostico ?? {}
      const diagFinal = {
        ...diagBase,
        negociacao: {
          configuracao: negociacao,
          cenarios: cenariosNegociacao,
          atualizado_em: new Date().toISOString()
        }
      }
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
    setDados({ cnpj:reg.cnpj||'', valor_total: reg.valor_total ? parseValor(reg.valor_total).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '', orgao_credor:reg.orgao_credor||'PGFN', processo_execucao:reg.processo_execucao||'', possui_parcelamento:reg.possui_parcelamento||false, possui_transacao_anterior:reg.possui_transacao_anterior||false, possui_garantia:reg.possui_garantia||false, possui_penhora:reg.possui_penhora||false, possui_bloqueio:reg.possui_bloqueio||false, possui_embargos:reg.possui_embargos||false, observacoes:reg.observacoes||'' })
    setCdas(migrarListaCDAs(reg.cdas))
    setDiagnostico(reg.diagnostico||null)
    const negSalva = reg.diagnostico?.negociacao
    if (negSalva?.configuracao) setNegociacao(n => ({...n, ...negSalva.configuracao}))
    else setNegociacao({ valor_atualizado:'', data_base:hoje, origem_valor:'Regularize', tipo_contribuinte:'pf', capag:'', objetivo:'maior_economia' })
    setCenariosNegociacao(Array.isArray(negSalva?.cenarios) ? negSalva.cenarios : [])
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
    setNegociacao({ valor_atualizado:'', data_base:hoje, origem_valor:'Regularize', tipo_contribuinte:'pf', capag:'', objetivo:'maior_economia' })
    setCenariosNegociacao([])
    setRegistroId(null)
    setAba(0)
  }

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
    const resultados = analisarConjuntoCDAs(cdas)
    const { parecer, urgente } = gerarParecer(resultados)
    const score = calcularScoreAnalise(resultados)
    const diagNovo = { parecer, urgente, score, valor:parseFloat((dados.valor_total||'').replace(/\./g,'').replace(',','.'))||0, data:new Date().toISOString() }
    setTimeout(()=>{
      setAnalisesCDA(resultados)
      setDiagnostico(diagNovo)
      setAnalisando(false)
      setAba(2)
      salvar(diagNovo, resultados)
    },1500)
  }

  function valorBaseNegociacao() {
    const atual = parseValor(negociacao.valor_atualizado)
    if (atual > 0) return atual
    const geral = parseValor(dados.valor_total)
    if (geral > 0) return geral
    return cdas.reduce((s,c)=>s+totalInscricoes(c),0)
  }

  function gerarCenariosPequenoValor() {
    const valor = valorBaseNegociacao()
    if (valor <= 0) {
      alert('Informe o valor atualizado da dívida antes de gerar os cenários.')
      return
    }

    const gerados = CENARIOS_PEQUENO_VALOR_2026.map(regra => {
      if (regra.vista) {
        const totalPago = valor * (1 - regra.desconto_pct/100)
        return {
          id:regra.key,
          modalidade:'Pequeno Valor — Edital PGDAU 6/2026',
          nome:regra.nome,
          valor_base:valor,
          entrada:0,
          entrada_parcelas:0,
          parcela_entrada:0,
          saldo_meses:0,
          parcela_saldo:0,
          desconto_pct:regra.desconto_pct,
          economia:valor-totalPago,
          total_pago_base:totalPago,
          prazo_total_meses:0,
          observacao:'Pagamento à vista. Confirmar elegibilidade e valor oficial no REGULARIZE.'
        }
      }

      const entrada = valor * (regra.entrada_pct/100)
      const saldoSemDesconto = valor - entrada
      const saldoComDesconto = saldoSemDesconto * (1 - regra.desconto_pct/100)
      const totalPago = entrada + saldoComDesconto
      return {
        id:regra.key,
        modalidade:'Pequeno Valor — Edital PGDAU 6/2026',
        nome:regra.nome,
        valor_base:valor,
        entrada,
        entrada_parcelas:regra.entrada_parcelas,
        parcela_entrada:regra.entrada_parcelas ? entrada/regra.entrada_parcelas : entrada,
        saldo_meses:regra.saldo_meses,
        parcela_saldo:regra.saldo_meses ? saldoComDesconto/regra.saldo_meses : saldoComDesconto,
        desconto_pct:regra.desconto_pct,
        economia:valor-totalPago,
        total_pago_base:totalPago,
        prazo_total_meses:regra.entrada_parcelas + regra.saldo_meses,
        observacao:'Estimativa-base sem projetar Selic. As prestações são corrigidas conforme as regras da PGFN; confirme o cálculo oficial no REGULARIZE.'
      }
    })
    setCenariosNegociacao(gerados)
    setAba(5)
  }

  function adicionarCenarioRegularize() {
    const valor = valorBaseNegociacao()
    const totalTxt = window.prompt('Qual é o valor total final mostrado pelo REGULARIZE para esta opção?')
    if (totalTxt === null) return
    const total = parseValor(totalTxt)
    if (total <= 0) return alert('Informe um valor válido.')
    const nome = window.prompt('Nome da opção (ex.: CPF — 17 meses / CNPJ — 60 meses):', 'Proposta do REGULARIZE') || 'Proposta do REGULARIZE'
    const entradaTxt = window.prompt('Valor total da entrada (se houver):', '0')
    const parcelasTxt = window.prompt('Quantidade total de meses/parcelas:', '1')
    const parcelaTxt = window.prompt('Valor aproximado da parcela principal:', '0')
    const entrada = parseValor(entradaTxt)
    const prazo = parseInt(parcelasTxt||'1',10) || 1
    const parcela = parseValor(parcelaTxt)
    const novo = {
      id:`regularize_${Date.now()}`,
      modalidade:'Proposta real do REGULARIZE',
      nome,
      valor_base:valor,
      entrada,
      entrada_parcelas:entrada>0?1:0,
      parcela_entrada:entrada,
      saldo_meses:prazo,
      parcela_saldo:parcela,
      desconto_pct:valor>0?Math.max(0,((valor-total)/valor)*100):0,
      economia:valor>0?Math.max(0,valor-total):0,
      total_pago_base:total,
      prazo_total_meses:prazo,
      observacao:'Cenário informado a partir da simulação efetiva do REGULARIZE.'
    }
    setCenariosNegociacao(lista => [...lista, novo])
  }

  function removerCenarioNegociacao(id) {
    setCenariosNegociacao(lista => lista.filter(c => c.id !== id))
  }

  function melhoresCenarios() {
    if (!cenariosNegociacao.length) return {}
    const positivosEntrada = cenariosNegociacao.filter(c=>parseValor(c.entrada)>0)
    return {
      maiorEconomia:[...cenariosNegociacao].sort((a,b)=>parseValor(b.economia)-parseValor(a.economia))[0],
      menorEntrada:(positivosEntrada.length?[...positivosEntrada]:[...cenariosNegociacao]).sort((a,b)=>parseValor(a.entrada)-parseValor(b.entrada))[0],
      menorParcela:[...cenariosNegociacao].filter(c=>parseValor(c.parcela_saldo)>0).sort((a,b)=>parseValor(a.parcela_saldo)-parseValor(b.parcela_saldo))[0] || null,
      menorCusto:[...cenariosNegociacao].sort((a,b)=>parseValor(a.total_pago_base)-parseValor(b.total_pago_base))[0],
      maiorPrazo:[...cenariosNegociacao].sort((a,b)=>(b.prazo_total_meses||0)-(a.prazo_total_meses||0))[0],
    }
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

    const recomendacaoAutos = [
      '══════════════════════════════════════════════════════════════════',
      'RECOMENDAÇÃO FINAL — ANÁLISE DOS AUTOS DO PROCESSO DE EXECUÇÃO FISCAL',
      '══════════════════════════════════════════════════════════════════',
      'Recomenda-se a análise detalhada dos autos do processo de execução fiscal,',
      'página por página, a fim de verificar:',
      '',
      '(1) VÍCIOS NA CITAÇÃO/NOTIFICAÇÃO: verificar se o Aviso de Recebimento (AR)',
      '    foi assinado pelo próprio devedor ou por terceiro — caso tenha sido recebido',
      '    por pessoa sem poderes de representação, a citação pode ser nula (art. 248 CPC).',
      '',
      '(2) ENDEREÇO DE CITAÇÃO: verificar se o endereço constante nos autos corresponde',
      '    ao domicílio fiscal do devedor à época — citação em endereço incorreto ou',
      '    desatualizado configura nulidade processual.',
      '',
      '(3) QUALIDADE DE QUEM RECEBEU A NOTIFICAÇÃO: se pessoa estranha ao estabelecimento',
      '    ou sem vínculo com o devedor assinou o AR, a citação não produz efeitos válidos.',
      '',
      '(4) MARCO DO ART. 40 / TEMA 566 STJ: localizar a primeira tentativa frustrada',
      '    de localização do devedor ou de bens e a data em que a Fazenda Pública tomou',
      '    ciência desse fato. O prazo de 1 ano de suspensão inicia-se automaticamente',
      '    a partir dessa ciência; a última movimentação, sozinha, não substitui esse marco.',
      '',
      '(5) ATOS ÚTEIS POSTERIORES — TEMA 568 STJ: verificar citação efetiva e constrição',
      '    patrimonial efetiva, com as respectivas datas. Mero peticionamento requerendo',
      '    diligências não basta para interromper a prescrição intercorrente.',
      '',
      '(6) INÍCIO AUTOMÁTICO APÓS 1 ANO — TEMA 569 STJ: encerrado o período de suspensão,',
      '    o prazo prescricional aplicável inicia-se automaticamente, independentemente',
      '    de petição da Fazenda ou de pronunciamento judicial específico.',
      '',
      'A mera ausência de penhora ou embargos nos dados cadastrados não exclui nenhuma',
      'dessas hipóteses — somente a análise completa dos autos, página por página, poderá',
      'confirmar ou afastar cada uma delas com segurança jurídica.',
      '══════════════════════════════════════════════════════════════════',
    ]

    const linhas = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║    e-FISCALTRIBE® — PARECER TÉCNICO — DÍVIDA ATIVA (PGFN)   ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
      `Cliente : ${clienteAtual?.razao_social||dados.cnpj}`,
      `CNPJ    : ${dados.cnpj}`,
      `Data    : ${new Date().toLocaleDateString('pt-BR')}`,
      `Score   : ${diagnostico.score}/100`,
      `Processo: ${dados.processo_execucao||'Não informado'}`,
      '',
      '═══ PARECER FINAL ══════════════════════════════════════════════',
      ...diagnostico.parecer.map(p=>`${p.tipo==='danger'?'⚠️':'ℹ️'} ${p.msg}`),
      '',
    ]

    analisesCDA.forEach((a,i)=>{
      const inscricoesTxt = (a.cda.inscricoes||[]).filter(ins=>ins.numero&&ins.numero.trim())
        .map(ins=>`${ins.numero} [${TIPOS_CREDITO.find(t=>t.key===ins.tipo_credito)?.label||'—'}] (${fmtR(parseValor(ins.valor))})`).join(' / ')
      const tipo = tipoReferenciaCDA(a.cda)

      linhas.push(`${'═'.repeat(64)}`)
      linhas.push(`${rotuloCDA(a.cda, i).toUpperCase()}`)
      linhas.push(`${'═'.repeat(64)}`)
      linhas.push(`Número da CDA : ${a.cda.numero_cda&&a.cda.numero_cda.trim()?a.cda.numero_cda:'Não informado'}`)
      linhas.push(`Inscrições    : ${inscricoesTxt||'Sem número'}`)
      linhas.push(`Valor total   : ${fmtR(totalInscricoes(a.cda))}`)
      linhas.push(`Tipo de crédito (ref.): ${tipo.label} — ${tipo.legislacao}`)
      linhas.push('')

      linhas.push('── I. DECADÊNCIA ─────────────────────────────────────────────')
      linhas.push(`Conclusão: ${a.decadencia.titulo}`)
      linhas.push('')
      linhas.push(a.decadencia.justificativa||'')
      linhas.push('')
      linhas.push('Raciocínio jurídico aplicado:')
      ;(a.decadencia.passos||[]).forEach(p=>{ linhas.push(`  ${p.label}: ${p.valor}`); if(p.obs) linhas.push(`    └─ ${p.obs}`) })
      linhas.push('')

      linhas.push('── II. PRESCRIÇÃO ────────────────────────────────────────────')
      linhas.push(`Conclusão: ${a.prescricao.titulo}`)
      linhas.push('')
      linhas.push(a.prescricao.justificativa||'')
      linhas.push('')
      linhas.push('Raciocínio jurídico aplicado:')
      ;(a.prescricao.passos||[]).forEach(p=>{ linhas.push(`  ${p.label}: ${p.valor}`); if(p.obs) linhas.push(`    └─ ${p.obs}`) })
      linhas.push('')

      linhas.push('── III. PRESCRIÇÃO INTERCORRENTE ─────────────────────────────')
      linhas.push(`Conclusão: ${a.prescricaoIntercorrente.titulo}`)
      linhas.push('')
      linhas.push(a.prescricaoIntercorrente.justificativa||'')
      linhas.push('')
      linhas.push('Raciocínio jurídico aplicado:')
      ;(a.prescricaoIntercorrente.passos||[]).forEach(p=>{ linhas.push(`  ${p.label}: ${p.valor}`); if(p.obs) linhas.push(`    └─ ${p.obs}`) })
      linhas.push('')

      linhas.push('── IV. VALIDADE DA CDA (art. 202 CTN) ───────────────────────')
      linhas.push(`Conclusão: ${a.validadeCDA.titulo}`)
      linhas.push('')
      linhas.push(a.validadeCDA.justificativa||'')
      linhas.push('')
      linhas.push('Verificação item a item:')
      ;(a.validadeCDA.passos||[]).forEach(p=>{ linhas.push(`  ${p.label}: ${p.valor}`); if(p.obs) linhas.push(`    └─ ${p.obs}`) })
      linhas.push('')

      linhas.push('── V. TESES APLICÁVEIS (referência da 1ª inscrição) ─────────')
      ;(tesesReferenciaCDA(a.cda)||[]).forEach(t=>linhas.push(`  • ${t}`))
      linhas.push('')
    })

    linhas.push(...recomendacaoAutos)
    linhas.push('')
    linhas.push('Gerado por e-FiscalTribe® — fiscaltrib.com.br')
    linhas.push(`Emitido em: ${new Date().toLocaleString('pt-BR')}`)
    linhas.push('⚠️ Parecer preliminar — não substitui análise jurídica profissional.')

    const blob=new Blob([linhas.join('\n')],{type:'text/plain;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a')
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

  // Começa com uma única CDA. O botão "+ Nova CDA" acrescenta quantas forem necessárias.
  // Quando já existe um processo de execução informado, a nova CDA herda apenas os dados
  // processuais comuns para evitar retrabalho; os dados próprios da CDA/inscrições começam vazios.
  const addCDA = () => {
    setCdas(prev => {
      const referencia = prev[prev.length - 1] || CDA_VAZIA
      const nova = {
        ...CDA_VAZIA,
        inscricoes:[novaInscricao()],
        possui_execucao_fiscal: !!referencia.possui_execucao_fiscal,
        numero_processo_execucao: referencia.numero_processo_execucao || '',
        trf_regiao: referencia.trf_regiao || '',
        vara_execucao: referencia.vara_execucao || '',
        data_ajuizamento: referencia.data_ajuizamento || '',
        data_despacho_citacao: referencia.data_despacho_citacao || '',
        data_citacao: referencia.data_citacao || '',
        data_ciencia_fazenda_nao_localizacao: referencia.data_ciencia_fazenda_nao_localizacao || '',
        data_ultima_movimentacao: referencia.data_ultima_movimentacao || '',
      }
      return [...prev, nova]
    })
  }
  const removeCDA = i => setCdas(prev => {
    const proximas = prev.filter((_,idx)=>idx!==i)
    return proximas.length ? proximas : [{...CDA_VAZIA, inscricoes:[novaInscricao()]}]
  })
  const updateCDA = (i,k,v) => {
    const novo=[...cdas]
    novo[i]={...novo[i],[k]:v}
    setCdas(['numero_processo_execucao','data_ajuizamento','data_despacho_citacao','data_citacao','data_ciencia_fazenda_nao_localizacao','data_ultima_movimentacao','trf_regiao','vara_execucao'].includes(k) ? consolidarDadosProcessuais(novo) : novo)
  }

  const addInscricao = (i) => {
    const novo=[...cdas]
    novo[i]={...novo[i],inscricoes:[...(novo[i].inscricoes||[]),novaInscricao()]}
    setCdas(novo)
  }
  const removeInscricao = (i,j) => {
    const novo=[...cdas]
    const lista=[...(novo[i].inscricoes||[])]
    lista.splice(j,1)
    novo[i]={...novo[i],inscricoes:lista.length>0?lista:[novaInscricao()]}
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

  const ABAS = ['📋 Visão Geral','📝 Dados da Dívida','🧠 Diagnóstico Inteligente','📚 Editais & Enquadramento','💰 Cenários de Negociação','📊 Comparativo','📄 Parecer']
  const resumoGlobalInscricoes = resumoFinanceiroInscricoes(analisesCDA)
  const gruposProcessos = agruparCdasPorProcesso(cdas)
  const processosIdentificados = gruposProcessos.filter(g=>!g.semProcesso)

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

  // ── Dados exibidos (ghost quando loading) ─────────────────────────────
  const historicoExibir = loadingHist ? HISTORICO_GHOST : historico
  const cdasExibir = loadingCdas ? CDAS_GHOST : cdasSalvas
  const sisparExibir = sisparLoading ? SISPAR_GHOST : sisparDados

  if (mostrarImportarCDA) {
    return (
      <ImportarCDA
        active={active}
        onSalvo={adicionarCdaImportada}
        onDiagnostico={adicionarCdaImportada}
        onVoltar={() => setMostrarImportarCDA(false)}
      />
    )
  }

  if (cdaVisualizar) {
    return (
      <VisualizarCDA
        cda={cdaVisualizar}
        clienteNome={clienteAtual?.razao_social || cdaVisualizar.devedor || '—'}
        analises={analisesCdaVisualizar}
        diagnostico={diagnosticoCdaVisualizar}
        onVoltar={() => { setCdaVisualizar(null); setMostrarCdasSalvas(true); carregarCdasSalvas() }}
      />
    )
  }

  return (
    <div style={{maxWidth:'100%',margin:'0 auto',position:'relative'}}>

      {/* CABEÇALHO — padrão visual claro do FiscalTribe */}
      <div style={{
        background:'linear-gradient(135deg,#F8FAFC 0%,#EEF2F6 100%)',
        borderRadius:14,padding:'18px 22px',marginBottom:20,boxSizing:'border-box',
        border:'1px solid #D7DEE8',
        boxShadow:'0 3px 12px rgba(15,23,42,0.05)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:13,minWidth:300}}>
            <div style={{
              width:48,height:48,borderRadius:12,background:'#FFFFFF',
              border:'1px solid #D8DEE8',display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 2px 8px rgba(15,23,42,0.06)',flexShrink:0
            }}>
              <JusticeScaleIcon size={35}/>
            </div>
            <div>
              <div style={{fontSize:10,color:'#64748B',fontWeight:800,letterSpacing:1.4,marginBottom:3}}>
                e-FISCALTRIBE — DIAGNÓSTICO
              </div>
              <div style={{fontSize:19,fontWeight:800,marginBottom:3,color:'#0F172A'}}>
                Diagnóstico da Dívida Ativa
              </div>
              <div style={{fontSize:12.5,color:'#64748B'}}>
                Motor de inteligência jurídica · Decadência · Prescrição · Validade da CDA
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <button onClick={()=>setMostrarImportarCDA(true)} style={{
              background:'#0B1F4D',border:'1px solid #0B1F4D',borderRadius:8,
              padding:'8px 14px',color:'#fff',fontSize:12.5,cursor:'pointer',
              fontWeight:700,whiteSpace:'nowrap',boxShadow:'0 2px 5px rgba(11,31,77,0.15)'
            }}>📄 {cdas.some(c=>c.numero_cda || (c.inscricoes||[]).some(ins=>ins.numero)) ? 'Adicionar outra CDA' : 'Importar CDA'}</button>

            <button onClick={novaAnalise} style={{
              background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:8,
              padding:'8px 14px',color:'#334155',fontSize:12.5,cursor:'pointer',
              fontWeight:650,whiteSpace:'nowrap'
            }}>+ Nova análise</button>

            <button onClick={abrirPainelHistorico} style={{
              background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:8,
              padding:'8px 14px',color:'#334155',fontSize:12.5,cursor:'pointer',
              fontWeight:650,whiteSpace:'nowrap'
            }}>📂 Análises salvas</button>

            <button onClick={()=>{ setMostrarCdasSalvas(true); carregarCdasSalvas() }} style={{
              background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:8,
              padding:'8px 14px',color:'#334155',fontSize:12.5,cursor:'pointer',
              fontWeight:650,whiteSpace:'nowrap'
            }}>📋 CDAs Salvas</button>
          </div>
        </div>

        <div style={{
          marginTop:15,paddingTop:14,borderTop:'1px solid #DDE3EA',
          display:'flex',alignItems:'center',gap:10
        }}>
          <SeletorCliente clienteAtual={clienteAtual} onSelecionar={selecionarCliente} onCadastrarNovo={selecionarCliente}/>
        </div>
      </div>

      {/* ── MODAL HISTÓRICO com skeleton ─────────────────────────────────── */}
      {mostrarHistorico&&(
        <div onClick={()=>setMostrarHistorico(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'60px 20px',overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:14,maxWidth:780,width:'100%',padding:24,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700,color:C.navy}}>📂 Análises salvas</div>
              <button onClick={()=>setMostrarHistorico(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.muted}}>✕</button>
            </div>

            {/* ✅ KPIs skeleton */}
            {loadingHist && <SkeletonKPI count={3} />}

            {!loadingHist && historico.length === 0 ? (
              <div style={{textAlign:'center',padding:'32px 0',color:C.muted}}>
                <div style={{fontSize:32,marginBottom:8}}>⚖️</div>
                <div style={{fontSize:14}}>Nenhuma análise salva ainda.</div>
              </div>
            ):(
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'#F1F5F9'}}>
                    {['Razão Social','CNPJ','Data','Ações'].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'10px 14px',color:C.muted,fontWeight:600,borderBottom:`2px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historicoExibir.map((reg,idx)=>(
                    <tr key={reg.id} style={{background:idx%2===0?C.white:'#F8FAFC',borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 14px',color:reg.ghost?C.ghostText:C.text,fontWeight:reg.ghost?400:600}}>
                        {reg.ghost
                          ? <div style={{height:13,width:160,borderRadius:4,background:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
                          : reg.razao_social||'—'}
                      </td>
                      <td style={{padding:'10px 14px',color:reg.ghost?C.ghostText:C.muted}}>
                        {reg.ghost
                          ? <div style={{height:13,width:120,borderRadius:4,background:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
                          : reg.cnpj||'—'}
                      </td>
                      <td style={{padding:'10px 14px',color:reg.ghost?C.ghostText:C.muted}}>
                        {reg.ghost
                          ? <div style={{height:13,width:100,borderRadius:4,background:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
                          : fmtDateTime(reg.created_at)}
                      </td>
                      <td style={{padding:'10px 14px',textAlign:'center'}}>
                        {!reg.ghost && (
                          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                            <button onClick={()=>abrirRegistro(reg)} style={{padding:'5px 16px',background:C.navy,color:C.white,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:600}}>📂 Abrir</button>
                            <button onClick={()=>excluirRegistro(reg.id)} style={btnDanger}>🗑️ Excluir</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL CDAs SALVAS com skeleton ───────────────────────────────── */}
      {mostrarCdasSalvas && (
        <div onClick={()=>setMostrarCdasSalvas(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'60px 20px',overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,maxWidth:900,width:'100%',padding:24,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700,color:'#0B1F4D'}}>📋 CDAs Salvas — {clienteAtual?.razao_social||'Todos os clientes'}</div>
              <button onClick={()=>setMostrarCdasSalvas(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#64748B'}}>✕</button>
            </div>

            {/* ✅ KPIs skeleton */}
            {loadingCdas && <SkeletonKPI count={3} />}

            {!loadingCdas && cdasSalvas.length === 0 ? (
              <div style={{textAlign:'center',padding:'32px 0',color:'#64748B'}}>
                <div style={{fontSize:32,marginBottom:8}}>📋</div>
                <div style={{fontSize:14}}>Nenhuma CDA salva ainda.</div>
              </div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{background:'#0B1F4D'}}>
                      {[
                        {h:'Nº CDA', w:160},
                        {h:'Devedor', w:null},
                        {h:'CNPJ', w:null},
                        {h:'Período', w:null},
                        {h:'Valor Total', w:null},
                        {h:'Tipo', w:null},
                        {h:'Data Inscrição', w:null},
                        {h:'Ações', w:null},
                      ].map(({h,w})=>(
                        <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#fff',fontWeight:600,fontSize:11,whiteSpace:'nowrap',minWidth:w||undefined}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cdasExibir.map((cda,idx)=>(
                      <tr key={cda.id} style={{background:idx%2===0?'#fff':'#F8FAFC',borderBottom:'1px solid #E2E8F0'}}>
                        <td style={{padding:'10px 12px',fontWeight:700,color:cda.ghost?C.ghostText:'#0B1F4D'}}>
                          {cda.ghost ? <div style={{height:12,width:100,borderRadius:4,background:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/> : cda.numero_cda||'—'}
                        </td>
                        <td style={{padding:'10px 12px',color:cda.ghost?C.ghostText:'#1E293B',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {cda.ghost ? <div style={{height:12,width:140,borderRadius:4,background:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/> : cda.devedor||'—'}
                        </td>
                        <td style={{padding:'10px 12px',color:cda.ghost?C.ghostText:'#64748B',fontSize:11,whiteSpace:'nowrap'}}>
                          {cda.ghost ? <div style={{height:12,width:110,borderRadius:4,background:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/> : cda.cnpj_devedor||'—'}
                        </td>
                        <td style={{padding:'10px 12px',color:cda.ghost?C.ghostText:'#64748B',fontSize:11,whiteSpace:'nowrap'}}>
                          {cda.ghost ? '—' : `${cda.periodo_divida_inicio||'—'} a ${cda.periodo_divida_fim||'—'}`}
                        </td>
                        <td style={{padding:'10px 12px',fontWeight:600,color:cda.ghost?C.ghostText:'#DC2626',whiteSpace:'nowrap'}}>
                          {cda.ghost ? 'R$ —,——' : fmtR(parseFloat(cda.valor_total||0))}
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          {!cda.ghost && <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'2px 6px',borderRadius:4,fontSize:10,fontWeight:600}}>{cda.tipo_debito||'—'}</span>}
                        </td>
                        <td style={{padding:'10px 12px',color:cda.ghost?C.ghostText:'#64748B',fontSize:11,whiteSpace:'nowrap'}}>
                          {cda.ghost ? '—' : cda.data_inscricao||'—'}
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          {!cda.ghost && (
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>abrirCdaParaDiagnostico(cda)} style={{padding:'5px 10px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>🧠 Diagnóstico</button>
                              <button onClick={()=>deletarCDA(cda.id)} style={{padding:'5px 8px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️</button>
                            </div>
                          )}
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
          <button onClick={()=>setAba(0)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'none',border:`1.5px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer'}}>← Voltar à Visão Geral</button>
        </div>
      )}

      <div style={{marginBottom:4}}>
        <button onClick={()=>setAba(7)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 18px',fontSize:12,fontWeight:600,cursor:'pointer',background:aba===7?'#0B1F4D':'#fff',color:aba===7?'#fff':'#0B1F4D',border:`2px solid #0B1F4D`,borderRadius:8,marginBottom:10}}>
          📊 Relatório SISPAR
          {aba===7&&<span style={{background:'rgba(255,255,255,0.2)',borderRadius:4,padding:'1px 6px',fontSize:10}}>ATIVO</span>}
        </button>
        <div style={{borderBottom:`2px solid ${C.border}`}}>
          {ABAS.map((t,i)=>(
            <button key={i} onClick={()=>setAba(i)} style={{padding:'8px 14px',fontSize:12,fontWeight:aba===i?700:400,color:aba===i?C.navy:C.muted,background:'none',border:'none',borderBottom:`2px solid ${aba===i?C.navy:'transparent'}`,marginBottom:-2,cursor:'pointer',whiteSpace:'nowrap'}}>{t}</button>
          ))}
        </div>
      </div>

      {aba===0&&<>
        {!diagnostico?(
          <div style={{
            background:C.white,borderRadius:12,border:`1px solid ${C.border}`,
            padding:'34px 32px',textAlign:'center',boxShadow:'0 2px 8px rgba(15,23,42,0.035)'
          }}>
            <div style={{
              width:78,height:78,margin:'0 auto 14px',borderRadius:20,
              background:'linear-gradient(145deg,#FFFFFF 0%,#F1F5F9 100%)',
              border:'1px solid #D8DEE8',display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 6px 18px rgba(15,23,42,0.07)'
            }}>
              <JusticeScaleIcon size={52}/>
            </div>

            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:14}}>
              Nenhum diagnóstico realizado ainda
            </div>

            <div style={{
              maxWidth:650,margin:'0 auto 14px',padding:'16px 18px',
              background:'#F8FAFC',border:'1px solid #D7DEE8',borderRadius:10
            }}>
              <div style={{fontSize:14,fontWeight:800,color:'#0B1F4D',marginBottom:5}}>
                📄 Importe a CDA automaticamente
              </div>
              <div style={{fontSize:12.5,color:'#475569',lineHeight:1.55,marginBottom:14}}>
                Carregue o PDF da CDA e o e-FiscalTribe faz a leitura dos dados para você,
                deixando as informações prontas para conferência e diagnóstico.
              </div>

              <button
                onClick={()=>setMostrarImportarCDA(true)}
                style={{
                  background:'#0B1F4D',color:'#FFFFFF',border:'1px solid #0B1F4D',
                  borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:800,
                  cursor:'pointer',boxShadow:'0 3px 8px rgba(11,31,77,0.16)'
                }}
              >
                📄 Importar CDA automaticamente →
              </button>
            </div>

            <div style={{fontSize:11.5,color:'#64748B',marginBottom:9}}>
              Se preferir, ou se não conseguir importar o documento, você também pode preencher os dados manualmente.
            </div>

            <button
              onClick={()=>setAba(1)}
              style={{
                background:'#FFFFFF',color:'#475569',border:'1px solid #CBD5E1',
                borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:650,
                cursor:'pointer'
              }}
            >
              Inserir dados manualmente
            </button>
          </div>
        ):<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <ScoreDividaAtiva score={diagnostico.score}/>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px'}}>
              <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:12,textTransform:'uppercase',letterSpacing:1}}>Resumo</div>
              {[['Valor total',fmtR(resumoGlobalInscricoes.total || parseValor(dados.valor_total)),'#DC2626'],['Processos de execução',processosIdentificados.length,'#0B1F4D'],['CDAs analisadas',cdas.length,'#0B1F4D'],['Inscrições analisadas',resumoGlobalInscricoes.inscricoes,'#0B1F4D'],['Valor potencialmente questionável',fmtR(resumoGlobalInscricoes.questionavel),'#DC2626'],['Órgão',dados.orgao_credor,'#0B1F4D'],['Data da análise',new Date(diagnostico.data).toLocaleDateString('pt-BR'),'#0B1F4D']].map(([lb,val,cor])=>(
                <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:13,color:C.muted}}>{lb}</span>
                  <span style={{fontSize:14,fontWeight:700,color:cor}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          {processosIdentificados.length>0&&<div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 18px',marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:10}}>🏛️ Processos de execução fiscal vinculados</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10}}>
              {processosIdentificados.map((grupo,idx)=>(
                <div key={grupo.key} style={{background:'#F8FAFC',border:'1px solid #CBD5E1',borderRadius:9,padding:'12px 14px'}}>
                  <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:3}}>PROCESSO {idx+1}</div>
                  <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:7}}>{grupo.processo}</div>
                  <div style={{fontSize:11,color:C.text,lineHeight:1.6}}><strong>{grupo.cdas.length}</strong> CDA(s) · <strong>{grupo.inscricoes}</strong> inscrição(ões) · <strong>{fmtR(grupo.valor)}</strong></div>
                  <div style={{fontSize:10.5,color:C.muted,marginTop:5}}>CDAs: {grupo.cdas.map(c=>c.numero_cda||'sem nº').join(' · ')}</div>
                  {(grupo.data_ajuizamento||grupo.data_citacao)&&<div style={{fontSize:10.5,color:'#1E40AF',marginTop:5}}>Eventos do processo: ajuizamento {grupo.data_ajuizamento?fmtData(grupo.data_ajuizamento):'—'} · citação {grupo.data_citacao?fmtData(grupo.data_citacao):'—'}</div>}
                </div>
              ))}
            </div>
            <div style={{fontSize:10.5,color:C.muted,marginTop:9}}>As datas do processo são compartilhadas entre as CDAs vinculadas, mas decadência e prescrição são calculadas individualmente por inscrição/crédito.</div>
          </div>}

          <div style={{background:'linear-gradient(135deg,#0B1F4D,#163A79)',borderRadius:12,padding:'18px 20px',color:'#fff',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:1.2,color:'#93C5FD',marginBottom:10}}>NEGOCIAÇÃO — RESUMO EXECUTIVO</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              <div><div style={{fontSize:10,color:'#BFDBFE'}}>VALOR DA CDA / BASE</div><div style={{fontSize:18,fontWeight:800}}>{fmtR(parseValor(dados.valor_total)||cdas.reduce((s,c)=>s+totalInscricoes(c),0))}</div></div>
              <div><div style={{fontSize:10,color:'#BFDBFE'}}>VALOR ATUALIZADO</div><div style={{fontSize:18,fontWeight:800}}>{valorBaseNegociacao()>0?fmtR(valorBaseNegociacao()):'A informar'}</div></div>
              <div><div style={{fontSize:10,color:'#BFDBFE'}}>MELHOR ECONOMIA</div><div style={{fontSize:18,fontWeight:800,color:'#86EFAC'}}>{melhoresCenarios().maiorEconomia?fmtR(melhoresCenarios().maiorEconomia.economia):'—'}</div></div>
              <div><div style={{fontSize:10,color:'#BFDBFE'}}>CENÁRIOS COMPARADOS</div><div style={{fontSize:18,fontWeight:800}}>{cenariosNegociacao.length}</div></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
              <button onClick={()=>setAba(4)} style={{background:'#fff',color:'#0B1F4D',border:'none',borderRadius:7,padding:'8px 12px',fontSize:12,fontWeight:800,cursor:'pointer'}}>Ver opções de negociação →</button>
              {cenariosNegociacao.length>0&&<button onClick={()=>setAba(5)} style={{background:'transparent',color:'#fff',border:'1px solid #93C5FD',borderRadius:7,padding:'8px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>Comparar cenários</button>}
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
            <button onClick={()=>{
              const w=window.open('','_blank')
              const recomendacaoHTML = `<div class="recomendacao"><strong>⚠️ RECOMENDAÇÃO FINAL — ANÁLISE DOS AUTOS DO PROCESSO DE EXECUÇÃO FISCAL</strong><p>Recomenda-se a análise detalhada dos autos do processo de execução fiscal, página por página, a fim de verificar:</p><ol><li><strong>Vícios na citação/notificação:</strong> verificar se o Aviso de Recebimento (AR) foi assinado pelo próprio devedor ou por terceiro — caso tenha sido recebido por pessoa sem poderes de representação, a citação pode ser nula (art. 248 CPC).</li><li><strong>Endereço de citação:</strong> verificar se o endereço constante nos autos corresponde ao domicílio fiscal do devedor à época — citação em endereço incorreto ou desatualizado configura nulidade processual.</li><li><strong>Qualidade de quem recebeu a notificação:</strong> se pessoa estranha ao estabelecimento ou sem vínculo com o devedor assinou o AR, a citação não produz efeitos válidos.</li><li><strong>Marco do art. 40 / Tema 566 STJ:</strong> localizar a primeira tentativa frustrada de localização do devedor ou de bens e a data em que a Fazenda Pública tomou ciência desse fato. O prazo de 1 ano de suspensão inicia-se automaticamente a partir dessa ciência; a última movimentação, sozinha, não substitui esse marco.</li><li><strong>Atos úteis posteriores — Tema 568 STJ:</strong> verificar citação efetiva e constrição patrimonial efetiva, com as respectivas datas. Mero peticionamento requerendo diligências não basta para interromper a prescrição intercorrente.</li><li><strong>Início automático após 1 ano — Tema 569 STJ:</strong> encerrado o período de suspensão, o prazo prescricional aplicável inicia-se automaticamente, independentemente de petição da Fazenda ou de pronunciamento judicial específico.</li></ol><p><strong>A mera ausência de penhora ou embargos nos dados cadastrados não exclui nenhuma dessas hipóteses — somente a análise completa dos autos, página por página, poderá confirmar ou afastar cada uma delas com segurança jurídica.</strong></p></div>`
              const scoreCor = diagnostico.score>=70?'#16A34A':diagnostico.score>=40?'#D97706':'#DC2626'
              const scoreLabel = diagnostico.score>=70?'Alto potencial de regularização':diagnostico.score>=40?'Potencial moderado':'Situação crítica'
              const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Parecer — Dívida Ativa</title><style>
                body{font-family:Arial,sans-serif;font-size:12px;margin:28px;color:#1E293B}
                h1{font-size:15px;color:#0B1F4D;border-bottom:2px solid #0B1F4D;padding-bottom:6px;margin-bottom:4px}
                h2{font-size:12px;color:#0B1F4D;border-bottom:1px solid #CBD5E1;padding-bottom:3px;margin-top:20px;margin-bottom:8px}
                h3{font-size:11px;color:#334155;margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.5px}
                .score-box{display:flex;align-items:center;gap:20px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px 18px;margin:12px 0 20px}
                .score-circle{width:64px;height:64px;border-radius:50%;border:6px solid ${scoreCor};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:${scoreCor};flex-shrink:0}
                .score-info{font-size:13px}
                .score-label{font-size:15px;font-weight:700;color:${scoreCor};margin-bottom:4px}
                .score-sub{font-size:11px;color:#64748B}
                .danger{background:#FEF2F2;border-left:4px solid #DC2626;padding:8px 12px;margin:6px 0;font-size:12px}
                .ok{background:#F0FDF4;border-left:4px solid #16A34A;padding:8px 12px;margin:6px 0;font-size:12px}
                .indef{background:#FFFBEB;border-left:4px solid #D97706;padding:8px 12px;margin:6px 0;font-size:12px}
                .tese{display:inline-block;background:#EFF6FF;color:#1E40AF;padding:2px 8px;border-radius:10px;font-size:10px;margin:2px;font-weight:600}
                .aviso{background:#FFFBEB;border:1px solid #FCD34D;border-radius:4px;padding:10px 14px;font-size:11px;color:#92400E;margin-top:20px}
                .recomendacao{background:#FEF3C7;border:2px solid #D97706;border-radius:6px;padding:14px 18px;margin-top:24px;font-size:11px;color:#78350F;line-height:1.7}
                .recomendacao ol{margin:8px 0 8px 18px;padding:0}
                .recomendacao li{margin-bottom:6px}
                .passos{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;padding:10px 14px;margin-top:6px;font-size:10px}
                .passos .linha{display:grid;grid-template-columns:180px 1fr;gap:6px;padding:3px 0;border-bottom:1px solid #F1F5F9}
                .passos .label{color:#64748B;font-weight:600}
                .passos .valor{color:#1E293B}
                .passos .obs{color:#64748B;font-style:italic;grid-column:2;font-size:9px;margin-top:-2px}
                .meta{font-size:11px;color:#64748B;margin-bottom:16px}
                @media print{body{margin:14px}.recomendacao{break-inside:avoid}}
              </style></head><body>
              <h1>⚖️ e-FiscalTribe® — Parecer Técnico — Dívida Ativa (PGFN)</h1>
              <div class="meta"><strong>Cliente:</strong> ${clienteAtual?.razao_social||dados.cnpj} &nbsp;|&nbsp; <strong>CNPJ:</strong> ${dados.cnpj} &nbsp;|&nbsp; <strong>Processo:</strong> ${dados.processo_execucao||'Não informado'} &nbsp;|&nbsp; <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
              <div class="score-box">
                <div class="score-circle">${diagnostico.score}</div>
                <div class="score-info">
                  <div class="score-label">${scoreLabel}</div>
                  <div class="score-sub">Score de risco jurídico · e-FiscalTribe® · ${new Date().toLocaleDateString('pt-BR')}</div>
                  <div class="score-sub" style="margin-top:4px">Baseado em risco jurídico, situação processual e potencial de negociação com a PGFN.</div>
                </div>
              </div>
              <h2>Parecer Final</h2>
              ${diagnostico.parecer.length>0 ? diagnostico.parecer.map(p=>`<div class="${p.tipo==='danger'?'danger':'indef'}">• ${p.msg}</div>`).join('') : '<div class="ok">✅ Sem irregularidades graves identificadas com base nos dados informados.</div>'}
              ${analisesCDA.map((a,i)=>{
                const tipo=tipoReferenciaCDA(a.cda)
                const gc=c=>c.conclusao.includes('ha_')||c.conclusao==='cda_vicio'?'danger':c.conclusao==='indefinida'?'indef':'ok'
                const renderPassos=passos=>`<div class="passos">${(passos||[]).map(p=>`<div class="linha"><span class="label">${p.label}</span><span class="valor">${p.valor}</span>${p.obs?`<span class="obs">${p.obs}</span>`:''}</div>`).join('')}</div>`
                return `
                  <h2>${rotuloCDA(a.cda,i)} — ${tipo.label}</h2>
                  <p style="font-size:11px;color:#64748B;margin:0 0 10px">${tipo.legislacao} &nbsp;|&nbsp; Valor: ${fmtR(totalInscricoes(a.cda))} &nbsp;|&nbsp; Situação: ${a.cda.situacao}</p>
                  <h3>I. Decadência</h3>
                  <div class="${gc(a.decadencia)}"><strong>${a.decadencia.titulo}</strong><br><span style="line-height:1.7">${a.decadencia.justificativa}</span></div>
                  ${renderPassos(a.decadencia.passos)}
                  <h3>II. Prescrição</h3>
                  <div class="${gc(a.prescricao)}"><strong>${a.prescricao.titulo}</strong><br><span style="line-height:1.7">${a.prescricao.justificativa}</span></div>
                  ${renderPassos(a.prescricao.passos)}
                  <h3>III. Prescrição Intercorrente</h3>
                  <div class="${gc(a.prescricaoIntercorrente)}"><strong>${a.prescricaoIntercorrente.titulo}</strong><br><span style="line-height:1.7">${a.prescricaoIntercorrente.justificativa}</span></div>
                  ${renderPassos(a.prescricaoIntercorrente.passos)}
                  <h3>IV. Validade da CDA (art. 202 CTN)</h3>
                  <div class="${gc(a.validadeCDA)}"><strong>${a.validadeCDA.titulo}</strong><br><span style="line-height:1.7">${a.validadeCDA.justificativa}</span></div>
                  ${renderPassos(a.validadeCDA.passos)}
                  <h3>V. Teses aplicáveis</h3>
                  <p>${tesesReferenciaCDA(a.cda).map(t=>`<span class="tese">${t}</span>`).join(' ')}</p>
                `
              }).join('')}
              ${recomendacaoHTML}
              <div class="aviso">⚠️ Parecer preliminar — e-FiscalTribe® &nbsp;·&nbsp; fiscaltrib.com.br &nbsp;·&nbsp; ${new Date().toLocaleString('pt-BR')} — não substitui análise jurídica profissional.</div>
              <script>window.onload=()=>window.print()<\/script></body></html>`
              w.document.write(html);w.document.close()
            }} style={{...btnOutline,borderColor:'#16A34A',color:'#16A34A'}}>🖨️ Imprimir parecer</button>
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
            <div><label style={{fontSize:13,fontWeight:500,display:'block',marginBottom:6,color:C.text}}>Processo de execução fiscal (quando único)</label>{inp('processo_execucao','Ex: 0001234-56.2019.4.03.6100')}</div>
          </div>
        </div>
        {processosIdentificados.length>0&&<div style={{background:'#F8FAFC',border:'1px solid #CBD5E1',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:8}}>🏛️ Estrutura processual identificada</div>
          {processosIdentificados.map(grupo=>(
            <div key={grupo.key} style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',padding:'8px 10px',background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,marginBottom:6,flexWrap:'wrap'}}>
              <div><div style={{fontSize:11,fontWeight:800,color:C.navy}}>{grupo.processo}</div><div style={{fontSize:10.5,color:C.muted}}>{grupo.cdas.map(c=>`CDA ${c.numero_cda||'sem nº'}`).join(' · ')}</div></div>
              <div style={{fontSize:11,color:C.text,fontWeight:700}}>{grupo.cdas.length} CDA(s) · {grupo.inscricoes} inscrição(ões) · {fmtR(grupo.valor)}</div>
            </div>
          ))}
        </div>}

        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:16,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.navy}}>📄 CDAs — Certidões de Dívida Ativa</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>Comece com uma CDA. Se houver outras no mesmo processo ou em outro processo, use <strong>+ Nova CDA</strong>.</div>
            </div>
            <div style={{fontSize:11,fontWeight:800,color:C.navy,background:'#EFF6FF',border:'1px solid #BFDBFE',padding:'5px 10px',borderRadius:999}}>{cdas.length} CDA(s)</div>
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
              <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8,padding:'10px 12px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <input type="checkbox" checked={!!cda.possui_execucao_fiscal} onChange={e=>updateCDA(i,'possui_execucao_fiscal',e.target.checked)} style={{accentColor:C.navy}}/>
                  <span style={{fontSize:11,fontWeight:800,color:'#1E40AF'}}>CDA ajuizada em execução fiscal</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1.5fr',gap:8}}>
                  <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>Nº DO PROCESSO</label><input value={cda.numero_processo_execucao||''} onChange={e=>updateCDA(i,'numero_processo_execucao',e.target.value)} placeholder="0001234-56.2019.4.03.6100" style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>TRF</label><input value={cda.trf_regiao||''} onChange={e=>updateCDA(i,'trf_regiao',e.target.value)} placeholder="TRF3" style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>VARA / JUÍZO</label><input value={cda.vara_execucao||''} onChange={e=>updateCDA(i,'vara_execucao',e.target.value)} placeholder="Ex: 6ª Vara Federal" style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                </div>
                {cda.numero_processo_execucao&&cdas.filter((outra,idx)=>idx!==i&&chaveProcesso(outra)===chaveProcesso(cda)).length>0&&<div style={{fontSize:10.5,color:'#166534',fontWeight:700,marginTop:7}}>✅ Esta CDA está vinculada ao mesmo processo de outra CDA desta análise.</div>}
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
                        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr auto',gap:6,alignItems:'end',marginBottom:8}}>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.4}}>Nº da Inscrição em DA</label>
                            <input value={ins.numero} onChange={e=>updateInscricao(i,j,'numero',e.target.value)} placeholder="Ex: 13.775.238-5" style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%',boxSizing:'border-box'}}/>
                          </div>
                          <div>
                            <label style={{fontSize:10,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.4}}>Valor (R$)</label>
                            <input value={ins.valor} onChange={e=>updateInscricao(i,j,'valor',e.target.value)} onBlur={()=>blurInscricaoValor(i,j)} placeholder="Ex: 29.150,55" style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%',boxSizing:'border-box'}}/>
                          </div>
                          {(cda.inscricoes||[]).length>1 ? (
                            <button onClick={()=>removeInscricao(i,j)} style={{padding:'6px 9px',background:'#fff1f2',color:'#dc2626',border:'1px solid #fecdd3',borderRadius:6,fontSize:12,cursor:'pointer',alignSelf:'flex-end'}}>🗑️</button>
                          ) : <div/>}
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:600,color:C.muted,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.4}}>Tipo de crédito</label>
                          <select value={ins.tipo_credito} onChange={e=>updateInscricao(i,j,'tipo_credito',e.target.value)} style={{padding:'6px 10px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,width:'100%'}}>
                            {TIPOS_CREDITO.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                          </select>
                        </div>
                        {tipoInfo&&<div style={{fontSize:10,color:'#1E40AF',marginTop:4}}>📖 {tipoInfo.legislacao}</div>}
                        <details style={{marginTop:9}}>
                          <summary style={{fontSize:11,fontWeight:700,color:C.navy,cursor:'pointer'}}>Datas e valores próprios desta inscrição</summary>
                          <div style={{marginTop:10,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>PERÍODO INÍCIO</label><input value={ins.periodo_inicio||''} onChange={e=>updateInscricao(i,j,'periodo_inicio',e.target.value)} placeholder="MM/AAAA" style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>PERÍODO FIM</label><input value={ins.periodo_fim||''} onChange={e=>updateInscricao(i,j,'periodo_fim',e.target.value)} placeholder="MM/AAAA" style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>FATO GERADOR</label><input type="date" value={ins.data_fato_gerador||''} onChange={e=>updateInscricao(i,j,'data_fato_gerador',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>VENCIMENTO</label><input type="date" value={ins.data_vencimento||''} onChange={e=>updateInscricao(i,j,'data_vencimento',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>CONSTITUIÇÃO</label><input type="date" value={ins.data_constituicao||''} onChange={e=>updateInscricao(i,j,'data_constituicao',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>INSCRIÇÃO DA</label><input type="date" value={ins.data_inscricao||''} onChange={e=>updateInscricao(i,j,'data_inscricao',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>PRINCIPAL ATUALIZADO</label><input value={ins.principal_atualizado||''} onChange={e=>updateInscricao(i,j,'principal_atualizado',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>JUROS</label><input value={ins.juros||''} onChange={e=>updateInscricao(i,j,'juros',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>MULTA</label><input value={ins.multa||''} onChange={e=>updateInscricao(i,j,'multa',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>ENCARGO LEGAL</label><input value={ins.encargo_legal||''} onChange={e=>updateInscricao(i,j,'encargo_legal',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%',boxSizing:'border-box'}}/></div>
                            <div><label style={{fontSize:9,fontWeight:700,color:C.muted,display:'block',marginBottom:2}}>LANÇAMENTO</label><select value={ins.modalidade_lancamento||cda.modalidade_lancamento||'oficio'} onChange={e=>updateInscricao(i,j,'modalidade_lancamento',e.target.value)} style={{padding:'5px 7px',border:`1px solid ${C.border}`,borderRadius:5,fontSize:11,width:'100%'}}><option value="oficio">De ofício / declaração</option><option value="homologacao">Por homologação</option></select></div>
                          </div>
                        </details>
                      </div>
                    )
                  })}
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
                  <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Despacho que ordenou a citação</label><input type="date" value={cda.data_despacho_citacao||''} onChange={e=>updateCDA(i,'data_despacho_citacao',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
                  <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Data da citação válida</label><input type="date" value={cda.data_citacao} onChange={e=>updateCDA(i,'data_citacao',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
                  <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3,color:'#5B21B6'}}>Ciência da Fazenda — não localização do devedor/bens</label><input type="date" value={cda.data_ciencia_fazenda_nao_localizacao||''} onChange={e=>updateCDA(i,'data_ciencia_fazenda_nao_localizacao',e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #7C3AED',borderRadius:6,fontSize:12,width:'100%'}}/></div>
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
          <div style={{display:'flex',justifyContent:'center',paddingTop:4}}>
            <button onClick={addCDA} style={{...btnPrimary,padding:'9px 22px',fontSize:13,minWidth:170}}>+ Nova CDA</button>
          </div>
          <div style={{fontSize:10.5,color:C.muted,textAlign:'center',marginTop:7}}>Você pode adicionar quantas CDAs forem necessárias. Se o processo for o mesmo, os dados processuais da CDA anterior são reaproveitados automaticamente.</div>
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
            const resumoFin = resumoFinanceiroInscricoes([a])
            return (
              <div key={i} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.navy}}>{rotuloCDA(a.cda, i)}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'3px 8px',borderRadius:12,fontSize:10,fontWeight:700}}>{(a.inscricoesAnalise||[]).length} inscrição(ões)</span>
                    {resumoFin.questionaveis>0&&<span style={{background:'#FEF2F2',color:'#B91C1C',padding:'3px 8px',borderRadius:12,fontSize:10,fontWeight:700}}>{resumoFin.questionaveis} com indício relevante</span>}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
                  <div style={{background:'#F8FAFC',border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 10px'}}><div style={{fontSize:9,color:C.muted,fontWeight:700}}>VALOR TOTAL</div><div style={{fontSize:14,fontWeight:800,color:C.navy}}>{fmtR(resumoFin.total)}</div></div>
                  <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'9px 10px'}}><div style={{fontSize:9,color:'#991B1B',fontWeight:700}}>POTENCIALMENTE QUESTIONÁVEL</div><div style={{fontSize:14,fontWeight:800,color:'#B91C1C'}}>{fmtR(resumoFin.questionavel)}</div></div>
                  <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'9px 10px'}}><div style={{fontSize:9,color:'#166534',fontWeight:700}}>SEM INDÍCIO NESTA TRIAGEM</div><div style={{fontSize:14,fontWeight:800,color:'#15803D'}}>{fmtR(resumoFin.exigivel)}</div></div>
                </div>

                {(a.inscricoesAnalise||[]).map((item,j)=>{
                  const tipo = TIPOS_CREDITO.find(t=>t.key===item.inscricao?.tipo_credito) || TIPOS_CREDITO[0]
                  const valor = parseValor(item.inscricao?.valor)
                  const risco = item.decadencia?.conclusao==='ha_decadencia' || item.prescricao?.conclusao==='ha_prescricao'
                  return (
                    <div key={j} style={{border:`1px solid ${risco?'#FCA5A5':C.border}`,borderLeft:`5px solid ${risco?'#DC2626':'#2563EB'}`,borderRadius:10,padding:'13px 15px',marginBottom:12,background:risco?'#FFF7F7':'#fff'}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',marginBottom:9,flexWrap:'wrap'}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:800,color:C.navy}}>Inscrição {j+1} · {item.inscricao?.numero || 'Sem número'}</div>
                          <div style={{fontSize:10.5,color:C.muted,marginTop:2}}>{tipo.label} · {item.inscricao?.periodo_inicio || 'período não informado'}{item.inscricao?.periodo_fim?` a ${item.inscricao.periodo_fim}`:''}</div>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:risco?'#B91C1C':C.navy}}>{fmtR(valor)}</div>
                      </div>
                      <ResultadoAnalise resultado={item.decadencia}/>
                      <ResultadoAnalise resultado={item.prescricao}/>
                    </div>
                  )
                })}

                <div style={{marginTop:14,paddingTop:12,borderTop:`1px dashed ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.muted,marginBottom:8,textTransform:'uppercase',letterSpacing:.6}}>Análises comuns à CDA / processo</div>
                  <ResultadoAnalise resultado={a.prescricaoIntercorrente}/>
                  <ResultadoAnalise resultado={{...a.validadeCDA,teses:tesesReferenciaCDA(a.cda)}}/>
                </div>
              </div>
            )
          })}
          <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'14px 18px',fontSize:12,color:'#166534',marginBottom:16}}>
            💡 Clique em "▼ Ver raciocínio" para ver o passo a passo do raciocínio jurídico aplicado.
          </div>
          <button onClick={()=>setAba(6)} style={btnPrimary}>📄 Gerar parecer técnico →</button>
        </>}
      </>}

      {aba===3&&<>
        <div style={{background:'#FFF7ED',border:'1px solid #FDBA74',borderRadius:12,padding:'16px 18px',marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:800,color:'#9A3412',marginBottom:7}}>Antes de simular sua dívida, entenda isto</div>
          <div style={{fontSize:12.5,color:'#7C2D12',lineHeight:1.7}}>
            Uma mesma dívida pode ter várias formas de negociação. Valor de entrada, desconto, quantidade de parcelas e custo total mudam conforme o edital, o enquadramento do contribuinte, a condição da dívida e a proposta efetivamente disponibilizada no REGULARIZE. Por isso, não escolha a primeira opção sem comparar os cenários disponíveis.
          </div>
        </div>

        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'18px 20px',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:12}}>📚 Editais e modalidades em análise</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:14}}>Base inicial do motor. A proposta real e a elegibilidade definitiva devem ser confirmadas no REGULARIZE/SISPAR.</div>
          {EDITAIS_VIGENTES_2026.map(e=>(
            <div key={e.key} style={{border:`1px solid ${C.border}`,borderLeft:`5px solid ${e.status==='simulavel'?'#16A34A':'#2563EB'}`,borderRadius:10,padding:'13px 15px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.navy}}>{e.modalidade}</div>
                  <div style={{fontSize:11,color:'#1E40AF',marginTop:2}}>{e.edital}</div>
                </div>
                <span style={{fontSize:10,fontWeight:800,background:e.status==='simulavel'?'#DCFCE7':'#DBEAFE',color:e.status==='simulavel'?'#166534':'#1E40AF',borderRadius:12,padding:'3px 8px',whiteSpace:'nowrap'}}>{e.status==='simulavel'?'SIMULAÇÃO DISPONÍVEL':'VALIDAR NO REGULARIZE'}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
                <div style={{fontSize:11.5,color:C.text}}><strong>Quem pode:</strong> {e.publico}</div>
                <div style={{fontSize:11.5,color:C.text}}><strong>Prazo de adesão:</strong> {e.prazo_adesao}</div>
              </div>
              <div style={{fontSize:11.5,color:C.muted,marginTop:8,lineHeight:1.5}}>{e.regra}</div>
            </div>
          ))}
        </div>

        {cdas.map((cda,i)=>{
          const elegibilidade = analisarElegibilidadeTransacao(cda, regraCapag)
          return (
            <div key={i} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'18px 20px',marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:10}}>{rotuloCDA(cda,i)} — análise existente</div>
              <ResultadoAnalise resultado={elegibilidade}/>
            </div>
          )
        })}
      </>}

      {aba===4&&<>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:4}}>💰 Quanto você deve hoje?</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:16}}>Informe o valor atualizado exibido no REGULARIZE. O valor histórico da CDA continua preservado; este campo representa a data-base da negociação.</div>
          <div style={{display:'grid',gridTemplateColumns:'1.2fr 0.8fr 1fr 0.8fr',gap:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.muted,display:'block',marginBottom:5}}>Valor atualizado (R$)</label>
              <input value={negociacao.valor_atualizado} onChange={e=>setNegociacao({...negociacao,valor_atualizado:e.target.value})} placeholder="Ex.: 103280,42" style={{padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.muted,display:'block',marginBottom:5}}>Data-base</label>
              <input type="date" value={negociacao.data_base} onChange={e=>setNegociacao({...negociacao,data_base:e.target.value})} style={{padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.muted,display:'block',marginBottom:5}}>Origem do valor</label>
              <select value={negociacao.origem_valor} onChange={e=>setNegociacao({...negociacao,origem_valor:e.target.value})} style={{padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,width:'100%'}}>
                <option>Regularize</option>
                <option>CDA/documento importado — confirmar no Regularize</option>
                <option>Informado manualmente</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.muted,display:'block',marginBottom:5}}>Contribuinte</label>
              <select value={negociacao.tipo_contribuinte} onChange={e=>setNegociacao({...negociacao,tipo_contribuinte:e.target.value})} style={{padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,width:'100%'}}>
                <option value="pf">Pessoa física</option>
                <option value="mei">MEI</option>
                <option value="me">Microempresa</option>
                <option value="epp">EPP</option>
                <option value="pj">Outra pessoa jurídica</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:12,padding:'16px 18px',marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:800,color:'#1E40AF',marginBottom:6}}>Pequeno Valor — cenários automáticos</div>
          <div style={{fontSize:12,color:'#1E40AF',lineHeight:1.6,marginBottom:12}}>Para contribuintes elegíveis, o sistema calcula à vista e as faixas com entrada de 5% em até 5 parcelas, seguidas do saldo em 7, 12, 30 ou 55 meses. A elegibilidade e o cálculo final precisam ser confirmados no REGULARIZE.</div>
          <button onClick={gerarCenariosPequenoValor} style={btnPrimary}>⚙️ Gerar todos os cenários de Pequeno Valor</button>
        </div>

        <div style={{background:'#F8FAFC',border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:6}}>Propostas reais do REGULARIZE</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:12}}>Use este botão para registrar opções que o REGULARIZE mostrou para CPF, CNPJ ou outra modalidade. Assim o FiscalTribe compara a proposta oficial com os cenários calculados.</div>
          <button onClick={adicionarCenarioRegularize} style={btnOutline}>＋ Adicionar proposta do REGULARIZE</button>
        </div>

        {cenariosNegociacao.length>0&&(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:20}}>
            <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:12}}>Cenários gerados ({cenariosNegociacao.length})</div>
            {cenariosNegociacao.map(c=>(
              <div key={c.id} style={{display:'grid',gridTemplateColumns:'2fr repeat(5,1fr) auto',gap:10,alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
                <div><div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{c.nome}</div><div style={{fontSize:10.5,color:C.muted}}>{c.modalidade}</div></div>
                <div><div style={{fontSize:10,color:C.muted}}>Entrada</div><strong style={{fontSize:12}}>{fmtR(c.entrada)}</strong></div>
                <div><div style={{fontSize:10,color:C.muted}}>Desconto</div><strong style={{fontSize:12,color:'#16A34A'}}>{Number(c.desconto_pct||0).toFixed(1)}%</strong></div>
                <div><div style={{fontSize:10,color:C.muted}}>Parcela-base</div><strong style={{fontSize:12}}>{c.parcela_saldo?fmtR(c.parcela_saldo):'—'}</strong></div>
                <div><div style={{fontSize:10,color:C.muted}}>Prazo</div><strong style={{fontSize:12}}>{c.prazo_total_meses?`${c.prazo_total_meses} meses`:'À vista'}</strong></div>
                <div><div style={{fontSize:10,color:C.muted}}>Total-base</div><strong style={{fontSize:12,color:C.navy}}>{fmtR(c.total_pago_base)}</strong></div>
                <button onClick={()=>removerCenarioNegociacao(c.id)} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer',fontSize:16}}>×</button>
              </div>
            ))}
            <div style={{fontSize:10.5,color:'#92400E',background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:7,padding:'8px 10px',marginTop:12}}>⚠️ Valores parcelados são estimativas-base e não projetam a Selic futura. Para decisão final, use os valores exibidos no REGULARIZE.</div>
          </div>
        )}
      </>}

      {aba===5&&<>
        {cenariosNegociacao.length===0?(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'36px',textAlign:'center'}}>
            <div style={{fontSize:38,marginBottom:10}}>📊</div>
            <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:6}}>Ainda não há cenários para comparar</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Vá em “Cenários de Negociação”, informe o valor atualizado e gere as opções.</div>
            <button onClick={()=>setAba(4)} style={btnPrimary}>Gerar cenários →</button>
          </div>
        ):(()=>{
          const melhores = melhoresCenarios()
          return <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
              {[
                ['🏆 Maior economia',melhores.maiorEconomia, c=>fmtR(c.economia)],
                ['💵 Menor entrada',melhores.menorEntrada, c=>fmtR(c.entrada)],
                ['📉 Menor parcela',melhores.menorParcela, c=>c?fmtR(c.parcela_saldo):'—'],
                ['🧾 Menor custo total',melhores.menorCusto, c=>fmtR(c.total_pago_base)],
              ].map(([titulo,c,fn])=>(
                <div key={titulo} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:'14px 15px'}}>
                  <div style={{fontSize:10.5,fontWeight:800,color:C.muted,marginBottom:6}}>{titulo}</div>
                  <div style={{fontSize:17,fontWeight:900,color:C.navy}}>{c?fn(c):'—'}</div>
                  <div style={{fontSize:10.5,color:C.muted,marginTop:4}}>{c?.nome||'—'}</div>
                </div>
              ))}
            </div>

            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:20,overflowX:'auto'}}>
              <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:12}}>Suas opções para esta dívida</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11.5}}>
                <thead><tr style={{background:'#0B1F4D',color:'#fff'}}>
                  {['Opção','Entrada','Prazo','Desconto','Parcela-base','Total-base','Economia'].map(h=><th key={h} style={{padding:'8px 9px',textAlign:h==='Opção'?'left':'right'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {cenariosNegociacao.map(c=><tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:'8px 9px',fontWeight:700,color:C.text}}>{c.nome}</td>
                    <td style={{padding:'8px 9px',textAlign:'right'}}>{fmtR(c.entrada)}</td>
                    <td style={{padding:'8px 9px',textAlign:'right'}}>{c.prazo_total_meses?`${c.prazo_total_meses} m`:'À vista'}</td>
                    <td style={{padding:'8px 9px',textAlign:'right',color:'#16A34A',fontWeight:700}}>{Number(c.desconto_pct||0).toFixed(1)}%</td>
                    <td style={{padding:'8px 9px',textAlign:'right'}}>{c.parcela_saldo?fmtR(c.parcela_saldo):'—'}</td>
                    <td style={{padding:'8px 9px',textAlign:'right',fontWeight:700}}>{fmtR(c.total_pago_base)}</td>
                    <td style={{padding:'8px 9px',textAlign:'right',color:'#16A34A',fontWeight:800}}>{fmtR(c.economia)}</td>
                  </tr>)}
                </tbody>
              </table>
              <div style={{marginTop:14,padding:'12px 14px',background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8,fontSize:12,color:'#166534',lineHeight:1.6}}>
                <strong>Leitura rápida:</strong> “melhor” depende do objetivo. Quem tem caixa pode priorizar menor custo total; quem precisa preservar caixa pode preferir menor entrada, menor parcela ou maior prazo. Compare antes de confirmar a adesão no REGULARIZE.
              </div>
            </div>
          </>
        })()}
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
              const resumoFin = resumoFinanceiroInscricoes([a])
              return (
                <div key={i} style={{borderLeft:`4px solid ${C.navy}`,paddingLeft:16,marginBottom:20}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:4}}>{rotuloCDA(a.cda, i)}</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{(a.inscricoesAnalise||[]).length} inscrição(ões) · {fmtR(resumoFin.total)} · potencialmente questionável: {fmtR(resumoFin.questionavel)}</div>
                  {(a.inscricoesAnalise||[]).map((item,j)=>(
                    <div key={j} style={{background:'#F8FAFC',border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:800,color:C.navy,marginBottom:5}}>Inscrição {j+1} · {item.inscricao?.numero || 'Sem número'} · {fmtR(parseValor(item.inscricao?.valor))}</div>
                      <div style={{fontSize:11,color:item.decadencia?.cor,fontWeight:700,marginBottom:3}}>Decadência: {item.decadencia?.titulo}</div>
                      <div style={{fontSize:11,color:item.prescricao?.cor,fontWeight:700}}>Prescrição: {item.prescricao?.titulo}</div>
                    </div>
                  ))}
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:4}}>Prescrição intercorrente / processo</div>
                    <div style={{fontSize:12,fontWeight:700,color:a.prescricaoIntercorrente.cor,marginBottom:3}}>{a.prescricaoIntercorrente.titulo}</div>
                    <div style={{fontSize:11.5,color:C.text,lineHeight:1.6}}>{a.prescricaoIntercorrente.justificativa}</div>
                  </div>
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:4}}>Validade formal da CDA</div>
                    <div style={{fontSize:12,fontWeight:700,color:a.validadeCDA.cor,marginBottom:3}}>{a.validadeCDA.titulo}</div>
                    <div style={{fontSize:11.5,color:C.text,lineHeight:1.6}}>{a.validadeCDA.justificativa}</div>
                  </div>
                </div>
              )
            })}
            <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'12px 16px',fontSize:12,color:'#92400E',marginBottom:16}}>
              ⚠️ Parecer preliminar — não substitui análise jurídica profissional.
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button onClick={gerarRelatorio} style={btnPrimary}>⬇️ Baixar parecer (.txt)</button>
              <button onClick={()=>{
                if(!diagnostico||analisesCDA.length===0){alert('Execute o diagnóstico antes.');return}
                const w=window.open('','_blank')
                const recomendacaoHTML = `<div class="recomendacao"><strong>⚠️ RECOMENDAÇÃO FINAL — ANÁLISE DOS AUTOS DO PROCESSO DE EXECUÇÃO FISCAL</strong><p>Recomenda-se a análise detalhada dos autos do processo de execução fiscal, página por página, a fim de verificar:</p><ol><li><strong>Vícios na citação/notificação:</strong> verificar se o Aviso de Recebimento (AR) foi assinado pelo próprio devedor ou por terceiro — caso tenha sido recebido por pessoa sem poderes de representação, a citação pode ser nula (art. 248 CPC).</li><li><strong>Endereço de citação:</strong> verificar se o endereço constante nos autos corresponde ao domicílio fiscal do devedor à época — citação em endereço incorreto ou desatualizado configura nulidade processual.</li><li><strong>Qualidade de quem recebeu a notificação:</strong> se pessoa estranha ao estabelecimento ou sem vínculo com o devedor assinou o AR, a citação não produz efeitos válidos.</li><li><strong>Marco do art. 40 / Tema 566 STJ:</strong> localizar a primeira tentativa frustrada de localização do devedor ou de bens e a data em que a Fazenda Pública tomou ciência desse fato. O prazo de 1 ano de suspensão inicia-se automaticamente a partir dessa ciência; a última movimentação, sozinha, não substitui esse marco.</li><li><strong>Atos úteis posteriores — Tema 568 STJ:</strong> verificar citação efetiva e constrição patrimonial efetiva, com as respectivas datas. Mero peticionamento requerendo diligências não basta para interromper a prescrição intercorrente.</li><li><strong>Início automático após 1 ano — Tema 569 STJ:</strong> encerrado o período de suspensão, o prazo prescricional aplicável inicia-se automaticamente, independentemente de petição da Fazenda ou de pronunciamento judicial específico.</li></ol><p><strong>A mera ausência de penhora ou embargos nos dados cadastrados não exclui nenhuma dessas hipóteses — somente a análise completa dos autos, página por página, poderá confirmar ou afastar cada uma delas com segurança jurídica.</strong></p></div>`
                const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Parecer — Dívida Ativa</title><style>
                  body{font-family:Arial,sans-serif;font-size:12px;margin:28px;color:#1E293B}
                  h1{font-size:15px;color:#0B1F4D;border-bottom:2px solid #0B1F4D;padding-bottom:6px;margin-bottom:4px}
                  h2{font-size:12px;color:#0B1F4D;border-bottom:1px solid #CBD5E1;padding-bottom:3px;margin-top:20px;margin-bottom:8px}
                  h3{font-size:11px;color:#334155;margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.5px}
                  .danger{background:#FEF2F2;border-left:4px solid #DC2626;padding:8px 12px;margin:6px 0;font-size:12px}
                  .ok{background:#F0FDF4;border-left:4px solid #16A34A;padding:8px 12px;margin:6px 0;font-size:12px}
                  .indef{background:#FFFBEB;border-left:4px solid #D97706;padding:8px 12px;margin:6px 0;font-size:12px}
                  .tese{display:inline-block;background:#EFF6FF;color:#1E40AF;padding:2px 8px;border-radius:10px;font-size:10px;margin:2px;font-weight:600}
                  .aviso{background:#FFFBEB;border:1px solid #FCD34D;border-radius:4px;padding:10px 14px;font-size:11px;color:#92400E;margin-top:20px}
                  .recomendacao{background:#FEF3C7;border:2px solid #D97706;border-radius:6px;padding:14px 18px;margin-top:24px;font-size:11px;color:#78350F;line-height:1.7}
                  .recomendacao ol{margin:8px 0 8px 18px;padding:0}
                  .recomendacao li{margin-bottom:6px}
                  .passos{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;padding:10px 14px;margin-top:6px;font-size:10px}
                  .passos .linha{display:grid;grid-template-columns:180px 1fr;gap:6px;padding:3px 0;border-bottom:1px solid #F1F5F9}
                  .passos .label{color:#64748B;font-weight:600}
                  .passos .valor{color:#1E293B}
                  .passos .obs{color:#64748B;font-style:italic;grid-column:2;font-size:9px;margin-top:-2px}
                  .meta{font-size:11px;color:#64748B;margin-bottom:16px}
                  @media print{body{margin:14px}.recomendacao{break-inside:avoid}}
                </style></head><body>
                <h1>⚖️ e-FiscalTribe® — Parecer Técnico — Dívida Ativa (PGFN)</h1>
                <div class="meta"><strong>Cliente:</strong> ${clienteAtual?.razao_social||dados.cnpj} &nbsp;|&nbsp; <strong>CNPJ:</strong> ${dados.cnpj} &nbsp;|&nbsp; <strong>Processo:</strong> ${dados.processo_execucao||'Não informado'} &nbsp;|&nbsp; <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} &nbsp;|&nbsp; <strong>Score:</strong> ${diagnostico.score}/100</div>
                <h2>Parecer Final</h2>
                ${diagnostico.parecer.map(p=>`<div class="${p.tipo==='danger'?'danger':'indef'}">• ${p.msg}</div>`).join('')}
                ${analisesCDA.map((a,i)=>{
                  const tipo=tipoReferenciaCDA(a.cda)
                  const gc=c=>c.conclusao.includes('ha_')||c.conclusao==='cda_vicio'?'danger':c.conclusao==='indefinida'?'indef':'ok'
                  const renderPassos=passos=>`<div class="passos">${(passos||[]).map(p=>`<div class="linha"><span class="label">${p.label}</span><span class="valor">${p.valor}</span>${p.obs?`<span class="obs">${p.obs}</span>`:''}</div>`).join('')}</div>`
                  return `
                    <h2>${rotuloCDA(a.cda,i)} — ${tipo.label}</h2>
                    <p style="font-size:11px;color:#64748B;margin:0 0 10px">${tipo.legislacao} &nbsp;|&nbsp; Valor: ${fmtR(totalInscricoes(a.cda))} &nbsp;|&nbsp; Situação: ${a.cda.situacao}</p>
                    <h3>I. Decadência</h3>
                    <div class="${gc(a.decadencia)}"><strong>${a.decadencia.titulo}</strong><br><span style="line-height:1.7">${a.decadencia.justificativa}</span></div>
                    ${renderPassos(a.decadencia.passos)}
                    <h3>II. Prescrição</h3>
                    <div class="${gc(a.prescricao)}"><strong>${a.prescricao.titulo}</strong><br><span style="line-height:1.7">${a.prescricao.justificativa}</span></div>
                    ${renderPassos(a.prescricao.passos)}
                    <h3>III. Prescrição Intercorrente</h3>
                    <div class="${gc(a.prescricaoIntercorrente)}"><strong>${a.prescricaoIntercorrente.titulo}</strong><br><span style="line-height:1.7">${a.prescricaoIntercorrente.justificativa}</span></div>
                    ${renderPassos(a.prescricaoIntercorrente.passos)}
                    <h3>IV. Validade da CDA (art. 202 CTN)</h3>
                    <div class="${gc(a.validadeCDA)}"><strong>${a.validadeCDA.titulo}</strong><br><span style="line-height:1.7">${a.validadeCDA.justificativa}</span></div>
                    ${renderPassos(a.validadeCDA.passos)}
                    <h3>V. Teses aplicáveis</h3>
                    <p>${tesesReferenciaCDA(a.cda).map(t=>`<span class="tese">${t}</span>`).join(' ')}</p>
                  `
                }).join('')}
                ${recomendacaoHTML}
                <div class="aviso">⚠️ Parecer preliminar — e-FiscalTribe® &nbsp;·&nbsp; fiscaltrib.com.br &nbsp;·&nbsp; ${new Date().toLocaleString('pt-BR')} — não substitui análise jurídica profissional.</div>
                <script>window.onload=()=>window.print()<\/script></body></html>`
                w.document.write(html);w.document.close()
              }} style={btnOutline}>🖨️ Imprimir parecer</button>
            </div>
          </>}
        </div>
      </>}

      {/* ── ABA SISPAR com skeleton ───────────────────────────────────────── */}
      {aba===7&&<>
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
              <button onClick={()=>{ setMostrarCdasSalvas(true); carregarCdasSalvas() }} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>📋 CDAs</button>
              <button onClick={carregarSispar} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>🔄 Atualizar</button>
              <button onClick={()=>window.print()} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,color:'#fff',fontSize:11,cursor:'pointer'}}>🖨️ Imprimir</button>
            </div>
          </div>
        </div>

        {/* ✅ KPIs skeleton SISPAR */}
        {sisparLoading ? (
          <SkeletonKPI count={4} />
        ) : sisparDados.length === 0 ? (
          <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.border}`,padding:48,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>
              {clienteAtual ? `Nenhuma CDA encontrada para ${clienteAtual.razao_social}` : 'Nenhum registro na tabela CDAs'}
            </div>
            <div style={{fontSize:13,color:C.muted}}>
              {clienteAtual ? 'Importe uma CDA para este cliente via "Importar CDA".' : 'Selecione um cliente ou cadastre CDAs.'}
            </div>
          </div>
        ) : (
          <>
            {/* KPIs reais */}
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

            {/* Tabela SISPAR */}
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
                  {sisparExibir.map((r, idx) => {
                    const isGhost = r.ghost
                    const vTotal   = isGhost ? 0 : parseValor(r.total_sem_desconto || 0)
                    const vDesc    = isGhost ? 0 : parseValor(r.desconto_valor || 0)
                    const vPagar   = vTotal - vDesc
                    const vEntrada = isGhost ? 0 : parseValor(r.valor_entrada || 0)
                    const vParcela = isGhost ? 0 : parseValor(r.valor_parcela || 0)
                    const qtEntrada = vEntrada > 0 ? 1 : 0
                    const qtParcela = r.qt_parcelas || 0
                    const provEcon  = vTotal > 0 ? ((vDesc / vTotal) * 100).toFixed(1) + '%' : '—'
                    const zebra     = isGhost ? C.ghost : idx % 2 === 0 ? '#fff' : '#F8FAFC'

                    const ghostCell = (w=80) => (
                      <div style={{height:11,width:w,borderRadius:3,background:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
                    )

                    return (
                      <tr key={r.id} style={{background:zebra}}>
                        <td style={{...tdSispar(),width:40,fontWeight:700,color:'#0B1F4D',textAlign:'center'}}>{isGhost ? <div style={{height:11,width:20,borderRadius:3,background:'#E2E8F0',margin:'0 auto'}}/> : idx+1}</td>
                        <td style={{...tdSispar('left'),maxWidth:200}}>
                          {isGhost ? <>{ghostCell(100)}<div style={{marginTop:4}}>{ghostCell(120)}</div></> : (
                            <>
                              <div style={{fontWeight:700,color:'#0B1F4D',fontSize:10,lineHeight:1.4}}>{r.numero_cda || '—'}</div>
                              {r.devedor && <div style={{color:'#1E293B',fontSize:9,lineHeight:1.4,marginTop:1}}>{r.devedor}</div>}
                              {r.cnpj_devedor && <div style={{color:'#64748B',fontSize:9,lineHeight:1.4}}>{r.cnpj_devedor}</div>}
                            </>
                          )}
                        </td>
                        <td style={tdSispar()}>{isGhost ? ghostCell(60) : <span style={{background:'#EFF6FF',color:'#1E40AF',padding:'1px 5px',borderRadius:4,fontSize:9,fontWeight:600}}>{TIPOS_CREDITO.find(t=>t.key===r.tipo_credito)?.label || r.tipo_debito || '—'}</span>}</td>
                        <td style={tdSispar()}>{isGhost ? ghostCell(70) : <span style={{background:'#F0FDF4',color:'#166534',padding:'1px 5px',borderRadius:4,fontSize:9,fontWeight:600}}>{MODALIDADES_PGFN.find(m=>m.key===r.modalidade)?.label || r.modalidade_transacao || '—'}</span>}</td>
                        <td style={tdSispar()}>{isGhost ? ghostCell(50) : r.data_calculo ? new Date(r.data_calculo+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={tdSispar()}>{isGhost ? ghostCell(40) : r.ufir_conversao || '—'}</td>
                        <td style={{...tdSisparNum,background:'#fafbff'}}>{isGhost ? ghostCell(60) : fmtR(vTotal)}</td>
                        <td style={{...tdSisparNum,color:'#16A34A',background:'#fafbff'}}>{isGhost ? ghostCell(50) : vDesc > 0 ? fmtR(vDesc) : '—'}</td>
                        <td style={{...tdSispar(),color:'#16A34A',fontWeight:700,background:'#fafbff'}}>{isGhost ? ghostCell(30) : provEcon}</td>
                        <td style={{...tdSisparNum,fontWeight:700,color:'#0B1F4D',background:'#EFF6FF'}}>{isGhost ? ghostCell(60) : fmtR(vPagar)}</td>
                        <td style={tdSispar()}>{isGhost ? '—' : qtEntrada > 0 ? qtEntrada : '—'}</td>
                        <td style={tdSisparNum}>{isGhost ? '—' : vEntrada > 0 ? fmtR(vEntrada) : '—'}</td>
                        <td style={tdSispar()}>{isGhost ? '—' : qtParcela > 0 ? qtParcela : '—'}</td>
                        <td style={tdSisparNum}>{isGhost ? '—' : vParcela > 0 ? fmtR(vParcela) : '—'}</td>
                        <td style={{...tdSispar('left'),maxWidth:150,fontSize:9}}>{isGhost ? ghostCell(80) : r.numero_processo_execucao ? <div style={{fontWeight:600,color:'#0B1F4D'}}>{r.numero_processo_execucao}</div> : '—'}</td>
                        <td style={{...tdSispar('left'),maxWidth:120,color:'#64748B',fontSize:9}}>{isGhost ? ghostCell(80) : [r.socio_1,r.socio_2,r.socio_3].filter(Boolean).join(', ')||r.observacoes||'—'}</td>
                        <td style={{...tdSispar(), width:40}}>
                          {!isGhost && (
                            <button onClick={() => deletarCDA(r.id)} title="Excluir registro" style={{background:'#fff1f2',border:'1px solid #fecdd3',borderRadius:6,padding:'3px 7px',cursor:'pointer',fontSize:12,color:'#dc2626',lineHeight:1}}>🗑️</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {!sisparLoading && sisparDados.length > 0 && (
                  <tfoot>
                    <tr style={{background:'#dce6f7'}}>
                      <td colSpan={5} style={{...tdTotal,textAlign:'left',fontSize:11}}>TOTAIS CONSOLIDADOS</td>
                      <td style={tdTotal}>{fmtR(sisparTotais.totalSemDesconto)}</td>
                      <td style={{...tdTotal,color:'#16A34A'}}>{fmtR(sisparTotais.totalDesconto)}</td>
                      <td style={tdTotal}>{sisparTotais.totalSemDesconto > 0 ? ((sisparTotais.totalDesconto / sisparTotais.totalSemDesconto) * 100).toFixed(1) + '%' : '—'}</td>
                      <td style={{...tdTotal,color:'#0B1F4D'}}>{fmtR(sisparTotais.totalAPagar)}</td>
                      <td colSpan={7} style={tdTotal}></td>
                      <td style={tdTotal}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

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