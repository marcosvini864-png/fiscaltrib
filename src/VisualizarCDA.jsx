import { useState } from 'react'

const C = {
  navy:'#0B1F4D', white:'#FFFFFF',
  bg:'#F8FAFC', border:'#E2E8F0',
  text:'#0F172A', muted:'#334155',
}

const fmtR = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtData = d => {
  if (!d) return '—'
  if (d.includes('/')) return d
  if (d.includes('-') && d.length === 10) return new Date(d+'T00:00:00').toLocaleDateString('pt-BR')
  return d
}
const parseValor = v => {
  const s = String(v||0)
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g,'').replace(',','.')) || 0
  if (s.includes(',')) return parseFloat(s.replace(',','.')) || 0
  return parseFloat(s) || 0
}

const TIPOS_CREDITO = [
  { key:'tributario_federal',  label:'Tributário Federal',     legislacao:'CTN + Lei 6.830/80' },
  { key:'previdenciario',      label:'Previdenciário',         legislacao:'Lei 8.212/91 + CTN' },
  { key:'fgts',                label:'FGTS',                  legislacao:'Lei 8.036/90 + RE 709.212 STF' },
  { key:'simples_nacional',    label:'Simples Nacional',       legislacao:'LC 123/2006 + CTN' },
  { key:'multa_tributaria',    label:'Multa Tributária',       legislacao:'CTN + Lei 9.430/96' },
  { key:'multa_trabalhista',   label:'Multa Trabalhista',      legislacao:'CLT + Lei 6.830/80' },
  { key:'nao_tributario',      label:'Não Tributário',         legislacao:'Decreto 20.910/32 + Lei 6.830' },
  { key:'outro',               label:'Outro',                  legislacao:'Legislação específica' },
]

const MODALIDADES = [
  { key:'transacao_excepcional', label:'Transação Excepcional' },
  { key:'transacao_individual',  label:'Transação Individual' },
  { key:'transacao_edital',      label:'Transação por Edital' },
  { key:'prdi',                  label:'PRDI' },
  { key:'parcelamento_ordinario',label:'Parcelamento Ordinário' },
  { key:'njp',                   label:'Negócio Jurídico Processual' },
]

const TRF_REGIOES = [
  { key:'TRF1', label:'TRF 1ª Região' },
  { key:'TRF2', label:'TRF 2ª Região' },
  { key:'TRF3', label:'TRF 3ª Região' },
  { key:'TRF4', label:'TRF 4ª Região' },
  { key:'TRF5', label:'TRF 5ª Região' },
  { key:'TRF6', label:'TRF 6ª Região' },
]

function Campo({ label, valor, destaque, cor }) {
  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{label}</div>
      <div style={{fontSize:destaque?15:13,fontWeight:destaque?700:500,color:cor||C.text}}>{valor||'—'}</div>
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
      <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>{titulo}</div>
      {children}
    </div>
  )
}

function Grid({ cols=2, children }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:16}}>
      {children}
    </div>
  )
}

function ResultadoAnalise({ resultado }) {
  const [expandido, setExpandido] = useState(false)
  if (!resultado) return null
  const isNeg = resultado.conclusao?.includes('ha_') || resultado.conclusao === 'cda_vicio' || resultado.conclusao === 'nao_elegivel'
  const isIndef = resultado.conclusao === 'indefinida'
  return (
    <div style={{background:isNeg?'#FEF2F2':isIndef?'#FFFBEB':'#F0FDF4',border:`1px solid ${resultado.cor}33`,borderLeft:`4px solid ${resultado.cor}`,borderRadius:10,padding:'14px 18px',marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}} onClick={()=>setExpandido(!expandido)}>
        <span style={{fontSize:14,fontWeight:700,color:resultado.cor}}>{resultado.titulo}</span>
        <span style={{fontSize:12,color:C.muted}}>{expandido?'▲ Ocultar':'▼ Ver raciocínio'}</span>
      </div>
      {resultado.justificativa && <div style={{fontSize:13,color:C.text,marginTop:8,lineHeight:1.7}}>{resultado.justificativa}</div>}
      {resultado.teses && resultado.teses.length > 0 && (
        <div style={{marginTop:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Teses aplicáveis</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {resultado.teses.map((t,i)=><span key={i} style={{background:'#EFF6FF',color:'#1E40AF',padding:'3px 8px',borderRadius:12,fontSize:11,fontWeight:500}}>{t}</span>)}
          </div>
        </div>
      )}
      {expandido && resultado.passos && (
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

function imprimirCDACompleta(cda, clienteNome, analises, diagnostico) {
  const w = window.open('', '_blank')
  const tipoLabel = TIPOS_CREDITO.find(t=>t.key===cda.tipo_debito)?.label || cda.tipo_debito || '—'
  const modalidadeLabel = MODALIDADES.find(m=>m.key===cda.modalidade_transacao)?.label || cda.modalidade_transacao || '—'
  const scoreCor = diagnostico?.score>=70?'#16A34A':diagnostico?.score>=40?'#D97706':'#DC2626'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CDA ${cda.numero_cda}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;color:#1E293B;margin:20px}
    h2{font-size:12px;color:#0B1F4D;margin:16px 0 8px;border-bottom:2px solid #0B1F4D;padding-bottom:4px}
    h3{font-size:11px;color:#334155;margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.5px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:12px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 24px;margin-bottom:12px}
    .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px 24px;margin-bottom:12px}
    .campo{margin-bottom:6px}
    .label{font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}
    .valor{font-size:11px;color:#1E293B;font-weight:500}
    .valor-destaque{font-size:14px;font-weight:700;color:#0B1F4D}
    .header{background:#0B1F4D;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:20px}
    .score-box{display:flex;align-items:center;gap:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin:12px 0}
    .score-circle{width:56px;height:56px;border-radius:50%;border:5px solid ${scoreCor};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:${scoreCor};flex-shrink:0}
    .danger{background:#FEF2F2;border-left:4px solid #DC2626;padding:8px 12px;margin:5px 0;font-size:11px}
    .ok{background:#F0FDF4;border-left:4px solid #16A34A;padding:8px 12px;margin:5px 0;font-size:11px}
    .indef{background:#FFFBEB;border-left:4px solid #D97706;padding:8px 12px;margin:5px 0;font-size:11px}
    .tese{display:inline-block;background:#EFF6FF;color:#1E40AF;padding:2px 7px;border-radius:8px;font-size:9px;margin:2px;font-weight:600}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}
    th{background:#0B1F4D;color:#fff;padding:5px 8px;text-align:left;font-size:10px}
    td{padding:5px 8px;border-bottom:1px solid #E2E8F0}
    .aviso{background:#FFFBEB;border:1px solid #FCD34D;border-radius:4px;padding:8px 10px;font-size:10px;color:#92400E;margin-top:16px}
    .recomendacao{background:#FEF3C7;border:2px solid #D97706;border-radius:6px;padding:12px 16px;margin-top:16px;font-size:10px;color:#78350F;line-height:1.7}
    .recomendacao ol{margin:6px 0 6px 16px;padding:0}
    .recomendacao li{margin-bottom:4px}
    @media print{body{margin:10px}}
  </style></head><body>

  <div class="header">
    <div style="font-size:9px;color:#93c5fd;letter-spacing:2px;margin-bottom:4px">e-FISCALTRIBE® — DÍVIDA ATIVA</div>
    <div style="font-size:18px;font-weight:900">📄 Certidão de Dívida Ativa — Ficha Completa</div>
    <div style="font-size:11px;color:#93c5fd;margin-top:4px">${clienteNome} · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  </div>

  <h2>🔖 Identificação da CDA</h2>
  <div class="grid">
    <div class="campo"><div class="label">Nº Inscrição Dívida Ativa</div><div class="valor-destaque">${cda.numero_cda||'—'}</div></div>
    <div class="campo"><div class="label">PGFN de Origem</div><div class="valor">${cda.pgfn_origem||'—'}</div></div>
    <div class="campo"><div class="label">Órgão de Origem</div><div class="valor">${cda.orgao_origem||'—'}</div></div>
    <div class="campo"><div class="label">Documento de Origem</div><div class="valor">${cda.documento_origem||'—'}</div></div>
    <div class="campo"><div class="label">Livro / Folha</div><div class="valor">${cda.livro_folha||'—'}</div></div>
    <div class="campo"><div class="label">Processo Administrativo</div><div class="valor">${cda.processo_administrativo||'—'}</div></div>
    <div class="campo"><div class="label">Data de Inscrição</div><div class="valor">${fmtData(cda.data_inscricao)}</div></div>
    <div class="campo"><div class="label">Data do Cálculo</div><div class="valor">${fmtData(cda.data_calculo)}</div></div>
    <div class="campo"><div class="label">Referência dos Valores</div><div class="valor">${cda.data_referencia_valores||'—'}</div></div>
    <div class="campo"><div class="label">UFIR de Conversão</div><div class="valor">${cda.ufir_conversao||'—'}</div></div>
  </div>

  <h2>👤 Devedor</h2>
  <div class="grid">
    <div class="campo"><div class="label">Razão Social / Nome</div><div class="valor">${cda.devedor||'—'}</div></div>
    <div class="campo"><div class="label">CNPJ / CPF</div><div class="valor">${cda.cnpj_devedor||'—'}</div></div>
    <div class="campo"><div class="label">Município</div><div class="valor">${cda.municipio||'—'}</div></div>
    <div class="campo"><div class="label">UF</div><div class="valor">${cda.uf||'—'}</div></div>
  </div>

  <h2>📅 Datas Jurídicas</h2>
  <div class="grid3">
    <div class="campo"><div class="label">Fato Gerador (1º período)</div><div class="valor">${fmtData(cda.data_fato_gerador)}</div></div>
    <div class="campo"><div class="label">Constituição Definitiva</div><div class="valor">${fmtData(cda.data_constituicao_definitiva)}</div></div>
    <div class="campo"><div class="label">Inscrição em DA</div><div class="valor">${fmtData(cda.data_inscricao)}</div></div>
    <div class="campo"><div class="label">Ajuizamento</div><div class="valor">${fmtData(cda.data_ajuizamento)}</div></div>
    <div class="campo"><div class="label">Citação Válida</div><div class="valor">${fmtData(cda.data_citacao)}</div></div>
    <div class="campo"><div class="label">Última Movimentação</div><div class="valor">${fmtData(cda.data_ultima_movimentacao)}</div></div>
    <div class="campo"><div class="label">Modalidade do Lançamento</div><div class="valor">${cda.modalidade_lancamento==='homologacao'?'Por homologação (art. 150 CTN)':'De ofício / Declaração (art. 173 CTN)'}</div></div>
  </div>

  <h2>💰 Período e Valores</h2>
  <div class="grid">
    <div class="campo"><div class="label">Período Início</div><div class="valor">${cda.periodo_divida_inicio||'—'}</div></div>
    <div class="campo"><div class="label">Período Fim</div><div class="valor">${cda.periodo_divida_fim||'—'}</div></div>
  </div>
  <table>
    <tr><th>Valor Originário</th><th>Princ. Atualizado</th><th>Juros</th><th>Multa</th><th>VALOR TOTAL</th></tr>
    <tr>
      <td>${fmtR(parseValor(cda.valor_originario))}</td>
      <td>${fmtR(parseValor(cda.principal_atualizado))}</td>
      <td>${fmtR(parseValor(cda.juros))}</td>
      <td>${fmtR(parseValor(cda.multa))}</td>
      <td style="font-weight:700;color:#0B1F4D;font-size:12px">${fmtR(parseValor(cda.valor_total))}</td>
    </tr>
  </table>

  <h2>⚖️ Negociação</h2>
  <div class="grid3">
    <div class="campo"><div class="label">Tipo de Débito</div><div class="valor">${tipoLabel}</div></div>
    <div class="campo"><div class="label">Modalidade de Transação</div><div class="valor">${modalidadeLabel}</div></div>
    <div class="campo"><div class="label">Desconto R$</div><div class="valor">${fmtR(parseValor(cda.desconto_valor))}</div></div>
    <div class="campo"><div class="label">Valor Entrada</div><div class="valor">${fmtR(parseValor(cda.valor_entrada))}</div></div>
    <div class="campo"><div class="label">Qtd. Parcelas</div><div class="valor">${cda.qt_parcelas||'—'}</div></div>
    <div class="campo"><div class="label">Valor Parcela</div><div class="valor">${fmtR(parseValor(cda.valor_parcela))}</div></div>
  </div>

  ${cda.possui_execucao_fiscal || cda.numero_processo_execucao ? `
  <h2>🏛️ Execução Fiscal</h2>
  <div class="grid3">
    <div class="campo"><div class="label">Nº do Processo</div><div class="valor">${cda.numero_processo_execucao||'—'}</div></div>
    <div class="campo"><div class="label">TRF / Região</div><div class="valor">${cda.trf_regiao||'—'}</div></div>
    <div class="campo"><div class="label">Vara / Juízo</div><div class="valor">${cda.vara_execucao||'—'}</div></div>
  </div>` : ''}

  ${(cda.socio_1||cda.socio_2||cda.socio_3) ? `
  <h2>👥 Sócios / Responsáveis Solidários</h2>
  <div class="grid3">
    ${cda.socio_1?`<div class="campo"><div class="label">Sócio 1</div><div class="valor">${cda.socio_1}</div></div>`:''}
    ${cda.socio_2?`<div class="campo"><div class="label">Sócio 2</div><div class="valor">${cda.socio_2}</div></div>`:''}
    ${cda.socio_3?`<div class="campo"><div class="label">Sócio 3</div><div class="valor">${cda.socio_3}</div></div>`:''}
  </div>` : ''}

  ${cda.fundamento_legal ? `<h2>📋 Fundamento Legal</h2><p style="font-size:10px;line-height:1.6">${cda.fundamento_legal}</p>` : ''}

  ${diagnostico ? `
  <h2>🧠 Diagnóstico Jurídico</h2>
  <div class="score-box">
    <div class="score-circle">${diagnostico.score}</div>
    <div>
      <div style="font-size:13px;font-weight:700;color:${scoreCor}">${diagnostico.score>=70?'Alto potencial de regularização':diagnostico.score>=40?'Potencial moderado':'Situação crítica'}</div>
      <div style="font-size:10px;color:#64748B">Score de risco jurídico · e-FiscalTribe®</div>
    </div>
  </div>
  ${diagnostico.parecer?.map(p=>`<div class="${p.tipo==='danger'?'danger':'indef'}">• ${p.msg}</div>`).join('')||''}
  ${analises?.map(a=>{
    const gc = c => c?.conclusao?.includes('ha_')||c?.conclusao==='cda_vicio'?'danger':c?.conclusao==='indefinida'?'indef':'ok'
    return `
      <h3>I. Decadência — ${a.decadencia?.titulo||''}</h3>
      <div class="${gc(a.decadencia)}" style="font-size:10px;line-height:1.6">${a.decadencia?.justificativa||''}</div>
      <h3>II. Prescrição — ${a.prescricao?.titulo||''}</h3>
      <div class="${gc(a.prescricao)}" style="font-size:10px;line-height:1.6">${a.prescricao?.justificativa||''}</div>
      <h3>III. Prescrição Intercorrente — ${a.prescricaoIntercorrente?.titulo||''}</h3>
      <div class="${gc(a.prescricaoIntercorrente)}" style="font-size:10px;line-height:1.6">${a.prescricaoIntercorrente?.justificativa||''}</div>
      <h3>IV. Validade da CDA — ${a.validadeCDA?.titulo||''}</h3>
      <div class="${gc(a.validadeCDA)}" style="font-size:10px;line-height:1.6">${a.validadeCDA?.justificativa||''}</div>
    `
  }).join('')||''}
  ` : ''}

  <div class="recomendacao">
    <strong>⚠️ RECOMENDAÇÃO FINAL — ANÁLISE DOS AUTOS</strong>
    <p>Recomenda-se a análise detalhada dos autos do processo de execução fiscal, página por página, a fim de verificar:</p>
    <ol>
      <li>Vícios na citação/notificação — AR assinado pelo devedor ou por terceiro sem poderes (art. 248 CPC)</li>
      <li>Endereço de citação — correspondência ao domicílio fiscal à época</li>
      <li>Qualidade de quem recebeu a notificação</li>
      <li>Períodos de paralisação processual — art. 40 Lei 6.830/80, Tema 566 STJ, Súmula 314 STJ</li>
      <li>Intimação da Fazenda Pública dos despachos de suspensão/arquivamento</li>
    </ol>
  </div>
  <div class="aviso">⚠️ Parecer preliminar — e-FiscalTribe® · fiscaltrib.com.br · ${new Date().toLocaleString('pt-BR')} — não substitui análise jurídica profissional.</div>
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`
  w.document.write(html)
  w.document.close()
}

export default function VisualizarCDA({ cda, clienteNome, analises, diagnostico, onVoltar }) {
  if (!cda) return null

  const tipoInfo = TIPOS_CREDITO.find(t => t.key === cda.tipo_debito) || TIPOS_CREDITO[0]
  const modalidadeInfo = MODALIDADES.find(m => m.key === cda.modalidade_transacao)
  const trfInfo = TRF_REGIOES.find(t => t.key === cda.trf_regiao)
  const scoreCor = diagnostico?.score>=70?'#16A34A':diagnostico?.score>=40?'#D97706':'#DC2626'
  const scoreLabel = diagnostico?.score>=70?'Alto potencial de regularização':diagnostico?.score>=40?'Potencial moderado':'Situação crítica'

  return (
    <div style={{maxWidth:'100%',margin:'0 auto'}}>

      {/* BANNER */}
      <div style={{background:'#0B1F4D',borderRadius:14,padding:'18px 24px',color:'#fff',marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'#7CC4FF',fontWeight:700,letterSpacing:1.5,marginBottom:4}}>e-FISCALTRIBE® — DÍVIDA ATIVA</div>
            <div style={{fontSize:18,fontWeight:700,color:'#fff',marginBottom:4}}>📄 CDA {cda.numero_cda || 'Sem número'}</div>
            <div style={{fontSize:13,color:'#93c5fd'}}>{clienteNome} · {tipoInfo.label} · {fmtR(parseValor(cda.valor_total))}</div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button onClick={()=>imprimirCDACompleta(cda, clienteNome, analises, diagnostico)}
              style={{background:'rgba(255,255,255,0.18)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,padding:'8px 14px',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:600}}>
              🖨️ Imprimir ficha completa
            </button>
            <button onClick={onVoltar}
              style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,padding:'8px 14px',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:600}}>
              ← Voltar
            </button>
          </div>
        </div>
      </div>

      {/* SCORE */}
      {diagnostico && (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:'20px 24px',marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
          <div style={{position:'relative',width:72,height:72,flexShrink:0}}>
            <svg viewBox="0 0 80 80" style={{width:72,height:72,transform:'rotate(-90deg)'}}>
              <circle cx="40" cy="40" r="32" fill="none" stroke={C.border} strokeWidth="8"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke={scoreCor} strokeWidth="8" strokeDasharray={`${diagnostico.score*2.01} 201`} strokeLinecap="round"/>
            </svg>
            <div style={{position:'absolute',top:0,left:0,width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:scoreCor}}>{diagnostico.score}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:scoreCor,marginBottom:4}}>{scoreLabel}</div>
            <div style={{fontSize:12,color:C.muted}}>Score de risco jurídico · Baseado em decadência, prescrição e validade formal da CDA</div>
          </div>
          {diagnostico.parecer?.length > 0 && (
            <div style={{flex:2}}>
              {diagnostico.parecer.map((p,i)=>(
                <div key={i} style={{background:p.tipo==='danger'?'#FEF2F2':'#FFFBEB',border:`1px solid ${p.tipo==='danger'?'#FECACA':'#FCD34D'}`,borderRadius:6,padding:'6px 12px',marginBottom:4,fontSize:12,color:p.tipo==='danger'?'#991B1B':'#92400E'}}>
                  {p.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IDENTIFICAÇÃO */}
      <Secao titulo="🔖 Identificação da CDA">
        <Grid cols={2}>
          <Campo label="Nº Inscrição Dívida Ativa" valor={cda.numero_cda} destaque cor="#0B1F4D"/>
          <Campo label="PGFN de Origem" valor={cda.pgfn_origem}/>
          <Campo label="Órgão de Origem" valor={cda.orgao_origem}/>
          <Campo label="Documento de Origem" valor={cda.documento_origem}/>
          <Campo label="Livro / Folha" valor={cda.livro_folha}/>
          <Campo label="Processo Administrativo" valor={cda.processo_administrativo}/>
          <Campo label="Data de Inscrição" valor={fmtData(cda.data_inscricao)}/>
          <Campo label="Data do Cálculo" valor={fmtData(cda.data_calculo)}/>
          <Campo label="Referência dos Valores" valor={cda.data_referencia_valores}/>
          <Campo label="UFIR de Conversão" valor={cda.ufir_conversao}/>
        </Grid>
      </Secao>

      {/* DEVEDOR */}
      <Secao titulo="👤 Devedor">
        <Grid cols={2}>
          <Campo label="Razão Social / Nome" valor={cda.devedor}/>
          <Campo label="CNPJ / CPF" valor={cda.cnpj_devedor}/>
          <Campo label="Município" valor={cda.municipio}/>
          <Campo label="UF" valor={cda.uf}/>
        </Grid>
      </Secao>

      {/* DATAS JURÍDICAS */}
      <div style={{background:'#F8F5FF',borderRadius:12,border:'2px solid #7C3AED',padding:24,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:'#7C3AED',marginBottom:16,paddingBottom:10,borderBottom:'1px solid #DDD6FE'}}>📅 Datas Jurídicas</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          <Campo label="Fato Gerador (1º período)" valor={fmtData(cda.data_fato_gerador)}/>
          <Campo label="Constituição Definitiva" valor={fmtData(cda.data_constituicao_definitiva)}/>
          <Campo label="Inscrição em DA" valor={fmtData(cda.data_inscricao)}/>
          <Campo label="Ajuizamento" valor={fmtData(cda.data_ajuizamento)}/>
          <Campo label="Citação Válida" valor={fmtData(cda.data_citacao)}/>
          <Campo label="Última Movimentação" valor={fmtData(cda.data_ultima_movimentacao)}/>
          <Campo label="Modalidade do Lançamento" valor={cda.modalidade_lancamento==='homologacao'?'Por homologação (art. 150 CTN)':'De ofício / Declaração (art. 173 CTN)'}/>
        </div>
      </div>

      {/* VALORES */}
      <Secao titulo="💰 Período e Valores">
        <Grid cols={2}>
          <Campo label="Período Início" valor={cda.periodo_divida_inicio}/>
          <Campo label="Período Fim" valor={cda.periodo_divida_fim}/>
        </Grid>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginTop:16,background:'#F8FAFC',borderRadius:10,padding:'16px'}}>
          {[
            {label:'Valor Originário', valor:fmtR(parseValor(cda.valor_originario)), cor:'#334155'},
            {label:'Princ. Atualizado', valor:fmtR(parseValor(cda.principal_atualizado)), cor:'#334155'},
            {label:'Juros', valor:fmtR(parseValor(cda.juros)), cor:'#D97706'},
            {label:'Multa', valor:fmtR(parseValor(cda.multa)), cor:'#D97706'},
            {label:'VALOR TOTAL', valor:fmtR(parseValor(cda.valor_total)), cor:'#DC2626'},
          ].map((k,i)=>(
            <div key={i} style={{textAlign:'center',padding:'10px',background:i===4?'#FEF2F2':'#fff',borderRadius:8,border:`1px solid ${i===4?'#FECACA':C.border}`}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>{k.label}</div>
              <div style={{fontSize:i===4?16:13,fontWeight:700,color:k.cor}}>{k.valor}</div>
            </div>
          ))}
        </div>
      </Secao>

      {/* NEGOCIAÇÃO */}
      <Secao titulo="⚖️ Negociação">
        <Grid cols={3}>
          <Campo label="Tipo de Débito" valor={tipoInfo.label}/>
          <Campo label="Modalidade de Transação" valor={modalidadeInfo?.label}/>
          <Campo label="Desconto R$" valor={fmtR(parseValor(cda.desconto_valor))}/>
          <Campo label="Valor Entrada" valor={fmtR(parseValor(cda.valor_entrada))}/>
          <Campo label="Qtd. Parcelas" valor={cda.qt_parcelas}/>
          <Campo label="Valor Parcela" valor={fmtR(parseValor(cda.valor_parcela))}/>
        </Grid>
      </Secao>

      {/* EXECUÇÃO FISCAL */}
      {(cda.possui_execucao_fiscal || cda.numero_processo_execucao) && (
        <Secao titulo="🏛️ Execução Fiscal">
          <Grid cols={3}>
            <Campo label="Nº do Processo" valor={cda.numero_processo_execucao}/>
            <Campo label="TRF / Região" valor={trfInfo?.label || cda.trf_regiao}/>
            <Campo label="Vara / Juízo" valor={cda.vara_execucao}/>
          </Grid>
        </Secao>
      )}

      {/* SÓCIOS */}
      {(cda.socio_1 || cda.socio_2 || cda.socio_3) && (
        <Secao titulo="👥 Sócios / Responsáveis Solidários">
          <Grid cols={3}>
            {cda.socio_1 && <Campo label="Sócio 1" valor={cda.socio_1}/>}
            {cda.socio_2 && <Campo label="Sócio 2" valor={cda.socio_2}/>}
            {cda.socio_3 && <Campo label="Sócio 3" valor={cda.socio_3}/>}
          </Grid>
        </Secao>
      )}

      {/* FUNDAMENTO LEGAL */}
      {cda.fundamento_legal && (
        <Secao titulo="📋 Fundamento Legal">
          <div style={{fontSize:12,color:C.text,lineHeight:1.8,background:'#F8FAFC',borderRadius:8,padding:'12px 16px'}}>
            {cda.fundamento_legal}
          </div>
        </Secao>
      )}

      {/* OBSERVAÇÕES */}
      {cda.observacoes && (
        <Secao titulo="📝 Observações">
          <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>{cda.observacoes}</div>
        </Secao>
      )}

      {/* DIAGNÓSTICO JURÍDICO */}
      {analises && analises.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:16,paddingBottom:10,borderBottom:`2px solid ${C.border}`}}>
            🧠 Diagnóstico Jurídico Inteligente
          </div>
          {analises.map((a, i) => (
            <div key={i}>
              <ResultadoAnalise resultado={a.decadencia}/>
              <ResultadoAnalise resultado={a.prescricao}/>
              <ResultadoAnalise resultado={a.prescricaoIntercorrente}/>
              <ResultadoAnalise resultado={{...a.validadeCDA}}/>
            </div>
          ))}
          <div style={{background:'#FEF3C7',border:'2px solid #D97706',borderRadius:10,padding:'14px 18px',marginTop:16,fontSize:12,color:'#78350F',lineHeight:1.7}}>
            <strong>⚠️ RECOMENDAÇÃO FINAL — ANÁLISE DOS AUTOS</strong>
            <p style={{marginTop:8}}>Recomenda-se a análise detalhada dos autos do processo de execução fiscal, página por página, a fim de verificar vícios na citação, endereço de citação, qualidade de quem recebeu a notificação, períodos de paralisação processual (art. 40 Lei 6.830/80, Tema 566 STJ, Súmula 314 STJ) e intimação da Fazenda Pública.</p>
          </div>
        </div>
      )}

      <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'10px 16px',fontSize:11,color:'#92400E',marginBottom:32}}>
        ⚠️ Ficha preliminar — e-FiscalTribe® · fiscaltrib.com.br · {new Date().toLocaleString('pt-BR')} — não substitui análise jurídica profissional.
      </div>

    </div>
  )
}