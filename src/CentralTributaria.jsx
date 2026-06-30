import { useState } from 'react'
import { supabase } from './supabase'
import GestaoCoreJuridico from './GestaoCoreJuridico'

const C = {
  navy:'#0B1F4D', navyHov:'#163B8C',
  green:'#22C55E', white:'#FFFFFF',
  bg:'#F5F7FA', border:'#E2E8F0',
  text:'#1E293B', muted:'#64748B',
}

const ABAS = [
  { key:'cnae',    icon:'🏢', label:'CNAE' },
  { key:'cfop',    icon:'📋', label:'CFOP' },
  { key:'cst',     icon:'🔢', label:'CST' },
  { key:'csosn',   icon:'📄', label:'CSOSN' },
  { key:'teses',   icon:'⚖️',  label:'Teses' },
  { key:'reforma', icon:'🏛️', label:'Reforma Tributária' },
  { key:'core',    icon:'🔒', label:'Gestão do Core Jurídico' },
]

const EDGE_URL = 'https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia'

const card = { background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }

export default function CentralTributaria({ onVoltar }) {
  const [aba, setAba]               = useState('cnae')
  const [busca, setBusca]           = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading]       = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [analiseIA, setAnaliseIA]   = useState('')
  const [loadingIA, setLoadingIA]   = useState(false)
  const [filtroCST, setFiltroCST]   = useState('ICMS')
  const [filtroImpacto, setFiltroImpacto] = useState('todos')

  async function buscar() {
    if (!busca.trim() && aba !== 'reforma') return
    setLoading(true)
    setSelecionado(null)
    setAnaliseIA('')
    let q

    if (aba === 'cnae') {
      q = supabase.from('tb_cnae').select('*')
        .or(`codigo.ilike.%${busca}%,descricao.ilike.%${busca}%`)
        .limit(20)
    } else if (aba === 'cfop') {
      q = supabase.from('tb_cfop').select('*')
        .or(`codigo.ilike.%${busca}%,descricao.ilike.%${busca}%,aplicacao.ilike.%${busca}%`)
        .limit(20)
    } else if (aba === 'cst') {
      q = supabase.from('tb_cst').select('*')
        .eq('tipo', filtroCST)
        .or(`codigo.ilike.%${busca}%,descricao.ilike.%${busca}%`)
        .limit(20)
    } else if (aba === 'csosn') {
      q = supabase.from('tb_csosn').select('*')
        .or(`codigo.ilike.%${busca}%,descricao.ilike.%${busca}%`)
        .limit(20)
    } else if (aba === 'teses') {
      q = supabase.from('tb_teses').select('*')
        .or(`nome.ilike.%${busca}%,descricao.ilike.%${busca}%,tributo.ilike.%${busca}%,regime.ilike.%${busca}%`)
        .limit(20)
    } else if (aba === 'reforma') {
      q = supabase.from('tb_reforma_tributaria').select('*')
      if (filtroImpacto !== 'todos') q = q.eq('impacto', filtroImpacto)
      if (busca.trim()) q = q.or(`tema.ilike.%${busca}%,descricao.ilike.%${busca}%,tipo.ilike.%${busca}%`)
      q = q.limit(30)
    }

    const { data, error } = await q
    if (!error) setResultados(data || [])
    setLoading(false)
  }

  async function analisarComIA(item) {
    setSelecionado(item)
    setLoadingIA(true)
    setAnaliseIA('')

    let prompt = ''

    if (aba === 'cnae') {
      prompt = `Você é um especialista tributário brasileiro. Analise o CNAE ${item.codigo} — ${item.descricao}.

Forneça uma análise completa e objetiva sobre:

1. DADOS TRIBUTÁRIOS
- Regime tributário permitido
- Enquadramento no Simples Nacional (Anexo: ${item.anexo_simples || 'verificar'})
- Fator R: ${item.fator_r ? 'Aplicável — explique quando compensa' : 'Não aplicável para este CNAE'}
- Principais obrigações acessórias

2. OPORTUNIDADES DE RECUPERAÇÃO TRIBUTÁRIA
Liste as principais teses e oportunidades aplicáveis a este CNAE com potencial estimado.

3. IMPACTO DA REFORMA TRIBUTÁRIA
Como a EC 132/2023 e a implementação de CBS/IBS afeta este segmento? Quais oportunidades devem ser aproveitadas ANTES da transição completa?

4. ALERTAS FISCAIS
Principais riscos e pontos de atenção para este CNAE.

Observações: ${item.observacoes || 'Nenhuma'}

Seja direto e prático. O usuário é um contador ou tributarista experiente.`

    } else if (aba === 'cfop') {
      prompt = `Você é um especialista tributário brasileiro. Explique o CFOP ${item.codigo} — ${item.descricao}.

1. QUANDO USAR
Descreva as situações específicas em que este CFOP deve ser utilizado.

2. CST/CSOSN RELACIONADOS
Quais CSTs e CSOSNs são mais comuns com este CFOP?

3. ERROS MAIS COMUNS
Quais são os erros mais frequentes no uso deste CFOP?

4. IMPACTO FISCAL
Qual o impacto tributário do uso incorreto deste CFOP?

Tipo da operação: ${item.tipo}
Aplicação: ${item.aplicacao || 'Geral'}

Seja objetivo e prático para uso diário do contador.`

    } else if (aba === 'cst') {
      prompt = `Você é um especialista tributário brasileiro. Explique o CST ${item.codigo} de ${item.tipo} — ${item.descricao}.

1. QUANDO USAR
Situações específicas em que este CST deve ser aplicado.

2. CUIDADOS E ERROS COMUNS
Principais erros no uso deste CST e como evitá-los.

3. IMPACTO NO PIS/COFINS E ICMS
Como este CST afeta a apuração dos tributos?

4. RELAÇÃO COM CFOP
Quais CFOPs são tipicamente usados com este CST?

Aplicação: ${item.aplicacao || 'Geral'}

Resposta direta e prática para contador.`

    } else if (aba === 'csosn') {
      prompt = `Você é um especialista tributário brasileiro. Explique o CSOSN ${item.codigo} — ${item.descricao}.

1. QUANDO USAR
Para quais empresas e operações este CSOSN se aplica?

2. GERAÇÃO DE CRÉDITO
Este CSOSN permite crédito de ICMS para o destinatário? Como funciona?

3. ERROS MAIS COMUNS
Principais erros no uso deste CSOSN.

4. DIFERENÇA PARA OUTROS CSOSN SIMILARES
Como diferenciar este CSOSN de outros parecidos?

Aplicação: ${item.aplicacao || 'Geral'}

Resposta prática e direta.`

    } else if (aba === 'teses') {
      prompt = `Você é um especialista em recuperação tributária brasileiro. Analise a tese: ${item.nome}.

1. RESUMO EXECUTIVO
Explique a tese em linguagem clara para apresentar ao cliente.

2. QUEM PODE SE BENEFICIAR
Perfil das empresas com maior potencial de recuperação.

3. COMO CALCULAR O POTENCIAL
Metodologia simplificada para estimar o valor recuperável.

4. DOCUMENTAÇÃO NECESSÁRIA
${item.documentacao || 'Documentação padrão da tese.'}

5. RISCOS E CONTRA-INDICAÇÕES
Quando NÃO vale a pena buscar esta tese?

6. PRAZO PRESCRICIONAL
${item.prazo_prescricional} anos — competências em risco de prescrição.

Regime: ${item.regime} | Tributo: ${item.tributo} | Complexidade: ${item.complexidade} | Potencial: ${item.potencial}
Fundamentação: ${item.fundamentacao}

Resposta completa e prática para o tributarista.`

    } else if (aba === 'reforma') {
      prompt = `Você é um especialista na Reforma Tributária Brasileira (EC 132/2023). Analise o tema: ${item.tema}.

1. O QUE MUDA
Explique a mudança de forma clara e direta.

2. IMPACTO NAS RECUPERAÇÕES TRIBUTÁRIAS ATUAIS
Como este aspecto da reforma afeta as oportunidades de recuperação tributária que existem hoje?

3. O QUE FAZER ANTES DA TRANSIÇÃO
Ações práticas que o contador deve tomar agora para aproveitar oportunidades antes que sejam extintas.

4. OPORTUNIDADES NO NOVO SISTEMA
Quais novas oportunidades surgem com esta mudança?

5. CRONOGRAMA
Quando esta mudança entra em vigor e como será a transição?

Tipo: ${item.tipo} | Impacto: ${item.impacto}
${item.oportunidade ? 'Oportunidade: ' + item.oportunidade : ''}
${item.risco ? 'Risco: ' + item.risco : ''}

Seja muito prático — o contador precisa saber O QUE FAZER AGORA.`
    }

    try {
      const response = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await response.json()
      const txt = data.resultado || data.error || 'Sem resposta.'
      setAnaliseIA(txt)
    } catch (e) {
      setAnaliseIA('Erro ao consultar IA: ' + e.message)
    }
    setLoadingIA(false)
  }

  const potencialColor = p => p === 'alto' ? '#16A34A' : p === 'medio' ? '#D97706' : '#64748B'
  const impactoColor  = i => i === 'alto' ? '#DC2626' : i === 'medio' ? '#D97706' : '#16A34A'
  const impactoBg     = i => i === 'alto' ? '#FEE2E2' : i === 'medio' ? '#FEF3C7' : '#DCFCE7'

  return (
    <div>
      <button onClick={onVoltar} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'none',border:`1.5px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer',marginBottom:20}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.navy;e.currentTarget.style.color=C.navy}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted}}>
        ← Voltar
      </button>

      <div style={{marginBottom:24}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text}}>🏛️ Central de Inteligência Tributária</div>
        <div style={{fontSize:13,color:C.muted,marginTop:2}}>Consulte CNAE, CFOP, CST, CSOSN, Teses, Reforma Tributária e administre o Core Jurídico com análise por IA</div>
      </div>

      {/* Abas */}
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:`2px solid ${C.border}`,overflowX:'auto'}}>
        {ABAS.map(a => (
          <button key={a.key} onClick={()=>{setAba(a.key);setBusca('');setResultados([]);setSelecionado(null);setAnaliseIA('')}}
            style={{
              padding:'8px 18px',fontSize:13,
              fontWeight:aba===a.key?600:500,
              color:aba===a.key?C.navy:a.key==='core'?'#7C3AED':C.muted,
              cursor:'pointer',
              background:a.key==='core'?'#F5F3FF':'none',
              border:'none',
              borderRadius:a.key==='core'?'8px 8px 0 0':'none',
              borderBottom:`2px solid ${aba===a.key?C.navy:'transparent'}`,
              marginBottom:-2,
              whiteSpace:'nowrap'
            }}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {/* Aba Core Jurídico — painel administrativo */}
      {aba === 'core' ? (
        <GestaoCoreJuridico/>
      ) : <>

      {/* Busca */}
      <div style={{...card, marginBottom:16}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200}}>
            <label style={{fontSize:12,fontWeight:600,color:C.muted,display:'block',marginBottom:6}}>
              {aba==='cnae'?'Código ou descrição do CNAE':
               aba==='cfop'?'Código ou descrição do CFOP':
               aba==='cst'?'Código ou descrição do CST':
               aba==='csosn'?'Código ou descrição do CSOSN':
               aba==='teses'?'Nome da tese, tributo ou regime':
               'Tema da Reforma Tributária'}
            </label>
            <input value={busca} onChange={e=>setBusca(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&buscar()}
              placeholder={aba==='cnae'?'Ex: 5611201 ou Restaurante':
                           aba==='cfop'?'Ex: 5102 ou venda':
                           aba==='cst'?'Ex: 00 ou tributada':
                           aba==='csosn'?'Ex: 102 ou credito':
                           aba==='teses'?'Ex: monofasico ou PIS':
                           'Ex: ICMS ou credito (deixe vazio para ver tudo)'}
              style={{padding:'9px 12px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,width:'100%',boxSizing:'border-box'}} />
          </div>

          {aba === 'cst' && (
            <div>
              <label style={{fontSize:12,fontWeight:600,color:C.muted,display:'block',marginBottom:6}}>Tipo</label>
              <select value={filtroCST} onChange={e=>setFiltroCST(e.target.value)}
                style={{padding:'9px 12px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13}}>
                <option>ICMS</option><option>PIS</option><option>COFINS</option>
              </select>
            </div>
          )}

          {aba === 'reforma' && (
            <div>
              <label style={{fontSize:12,fontWeight:600,color:C.muted,display:'block',marginBottom:6}}>Impacto</label>
              <select value={filtroImpacto} onChange={e=>setFiltroImpacto(e.target.value)}
                style={{padding:'9px 12px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13}}>
                <option value="todos">Todos</option>
                <option value="alto">Alto</option>
                <option value="medio">Médio</option>
                <option value="baixo">Baixo</option>
              </select>
            </div>
          )}

          <button onClick={buscar} disabled={loading}
            style={{padding:'9px 24px',background:C.navy,color:C.white,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
            {loading ? '⏳ Buscando...' : '🔍 Buscar'}
          </button>
        </div>
      </div>

      {/* Resultados + Detalhe */}
      {resultados.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:selecionado?'1fr 1.4fr':'1fr',gap:16}}>

          {/* Lista */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{resultados.length} resultado(s) encontrado(s)</div>
            {resultados.map((r,i) => {
              const ativo = selecionado?.id === r.id
              return (
                <div key={i} onClick={()=>analisarComIA(r)}
                  style={{...card, padding:'14px 16px', cursor:'pointer', borderColor:ativo?C.navy:C.border, borderWidth:ativo?2:1,
                    background:ativo?'#EFF6FF':C.white, transition:'all 0.15s'}}>

                  {aba === 'cnae' && <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{r.codigo}</span>
                        <div style={{fontSize:12,color:C.text,marginTop:2}}>{r.descricao}</div>
                      </div>
                      {r.fator_r && <span style={{background:'#DCFCE7',color:'#166534',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap',marginLeft:8}}>Fator R</span>}
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginTop:6}}>{r.anexo_simples} · {r.secao}</div>
                  </>}

                  {aba === 'cfop' && <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{r.codigo}</span>
                        <div style={{fontSize:12,color:C.text,marginTop:2}}>{r.descricao}</div>
                      </div>
                      <span style={{background:r.tipo==='entrada'?'#DBEAFE':'#DCFCE7',color:r.tipo==='entrada'?'#1E40AF':'#166534',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap',marginLeft:8}}>{r.tipo}</span>
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginTop:6}}>{r.aplicacao}</div>
                  </>}

                  {(aba === 'cst' || aba === 'csosn') && <>
                    <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{r.codigo}</span>
                    {aba==='cst' && <span style={{marginLeft:8,fontSize:10,background:'#F1F5F9',color:C.muted,padding:'2px 8px',borderRadius:20}}>{r.tipo}</span>}
                    <div style={{fontSize:12,color:C.text,marginTop:4}}>{r.descricao}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:4}}>{r.aplicacao}</div>
                  </>}

                  {aba === 'teses' && <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.navy,flex:1}}>{r.nome}</div>
                      <span style={{background:impactoBg(r.potencial),color:potencialColor(r.potencial),fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>{r.potencial}</span>
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginTop:6}}>{r.tributo} · {r.regime} · {r.complexidade} complexidade</div>
                  </>}

                  {aba === 'reforma' && <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.navy,flex:1}}>{r.tema}</div>
                      <span style={{background:impactoBg(r.impacto),color:impactoColor(r.impacto),fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>Impacto {r.impacto}</span>
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginTop:4}}>{r.tipo}</div>
                    <div style={{fontSize:12,color:C.text,marginTop:6,lineHeight:1.5}}>{r.descricao?.slice(0,120)}...</div>
                  </>}

                  <div style={{fontSize:11,color:C.navy,marginTop:8,fontWeight:500}}>🤖 Clique para análise da IA →</div>
                </div>
              )
            })}
          </div>

          {/* Detalhe + IA */}
          {selecionado && (
            <div style={{...card, height:'fit-content', position:'sticky', top:16}}>
              <div style={{fontSize:15,fontWeight:700,color:C.navy,marginBottom:4}}>
                {aba==='cnae'||aba==='cfop'||aba==='cst'||aba==='csosn' ? selecionado.codigo+' — ' : ''}
                {selecionado.descricao || selecionado.nome || selecionado.tema}
              </div>

              {aba==='cnae' && <>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  {selecionado.anexo_simples && <span style={{background:'#DBEAFE',color:'#1E40AF',fontSize:11,padding:'3px 10px',borderRadius:20}}>{selecionado.anexo_simples}</span>}
                  {selecionado.fator_r && <span style={{background:'#DCFCE7',color:'#166534',fontSize:11,padding:'3px 10px',borderRadius:20}}>✓ Fator R</span>}
                  <span style={{background:'#F1F5F9',color:C.muted,fontSize:11,padding:'3px 10px',borderRadius:20}}>Seção {selecionado.secao}</span>
                </div>
                {selecionado.regime_permitido && <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Regime: {selecionado.regime_permitido}</div>}
                {selecionado.observacoes && <div style={{fontSize:12,color:'#D97706',background:'#FFFBEB',padding:'8px 12px',borderRadius:8,marginBottom:12}}>⚠️ {selecionado.observacoes}</div>}
              </>}

              {aba==='teses' && <>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  <span style={{background:impactoBg(selecionado.potencial),color:potencialColor(selecionado.potencial),fontSize:11,padding:'3px 10px',borderRadius:20}}>Potencial {selecionado.potencial}</span>
                  <span style={{background:'#F1F5F9',color:C.muted,fontSize:11,padding:'3px 10px',borderRadius:20}}>{selecionado.complexidade} complexidade</span>
                  <span style={{background:'#F1F5F9',color:C.muted,fontSize:11,padding:'3px 10px',borderRadius:20}}>{selecionado.prazo_prescricional} anos</span>
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tributo: {selecionado.tributo} · Regime: {selecionado.regime}</div>
                <div style={{fontSize:12,color:C.text,marginBottom:12,lineHeight:1.6}}>{selecionado.descricao}</div>
                {selecionado.fundamentacao && <div style={{fontSize:11,color:'#1E40AF',background:'#EFF6FF',padding:'8px 12px',borderRadius:8,marginBottom:12}}>📖 {selecionado.fundamentacao}</div>}
              </>}

              {aba==='reforma' && <>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  <span style={{background:impactoBg(selecionado.impacto),color:impactoColor(selecionado.impacto),fontSize:11,padding:'3px 10px',borderRadius:20}}>Impacto {selecionado.impacto}</span>
                  <span style={{background:'#F1F5F9',color:C.muted,fontSize:11,padding:'3px 10px',borderRadius:20}}>{selecionado.tipo}</span>
                </div>
                {selecionado.oportunidade && <div style={{fontSize:12,color:'#16A34A',background:'#DCFCE7',padding:'8px 12px',borderRadius:8,marginBottom:8}}>✅ {selecionado.oportunidade}</div>}
                {selecionado.risco && <div style={{fontSize:12,color:'#DC2626',background:'#FEE2E2',padding:'8px 12px',borderRadius:8,marginBottom:12}}>⚠️ {selecionado.risco}</div>}
              </>}

              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginTop:8}}>
                <div style={{fontSize:13,fontWeight:600,color:C.navy,marginBottom:12}}>🤖 Análise da Inteligência FiscalTrib</div>
                {loadingIA && (
                  <div style={{textAlign:'center',padding:24,color:C.muted}}>
                    <div style={{fontSize:24,marginBottom:8}}>⏳</div>
                    <div style={{fontSize:13}}>Analisando com IA...</div>
                  </div>
                )}
                {analiseIA && (
                  <div style={{fontSize:12,color:C.text,lineHeight:1.8,whiteSpace:'pre-wrap',background:'#F8FAFC',padding:16,borderRadius:8,maxHeight:400,overflowY:'auto'}}>
                    {analiseIA}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {resultados.length === 0 && !loading && (
        <div style={{...card, textAlign:'center', padding:48, color:C.muted}}>
          <div style={{fontSize:40,marginBottom:12}}>🔍</div>
          <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:8}}>Faça uma consulta</div>
          <div style={{fontSize:13}}>Digite um código ou descrição e clique em Buscar. Para a Reforma Tributária, clique em Buscar sem digitar nada para ver todos os temas.</div>
        </div>
      )}

      </>}
    </div>
  )
}