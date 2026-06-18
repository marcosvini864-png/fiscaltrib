import { useState, useRef } from 'react'
import { supabase } from './supabase'

const fmtR      = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const maskCNPJ  = v => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2')
const maskMoeda = v => { const n=v.replace(/\D/g,''); if(!n) return ''; return (parseFloat(n)/100).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

const NCM_MONO = ['2701','2702','2703','2704','2705','2706','2707','2708','2709','2710','2711','2712','2713','2714','2715','3002','3003','3004','3005','3006','3303','3304','3305','3306','3307','2201','2202','2203','2204','2205','2206','2207','2208']
const CST_ST   = ['10','30','60','70','90']
const CFOP_SRV = ['5301','5302','5303','5304','5305','5306','5307','5308','5309','5310','5311','5312','5313','5314','5315','5316','6301','6302']

function parseNFe(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'application/xml')
  const get = tag => doc.querySelector(tag)?.textContent?.trim() || ''
  const dhEmi = get('dhEmi') || get('dEmi')
  const competencia = dhEmi ? dhEmi.slice(0,7) : ''
  const vNF     = parseFloat(get('vNF')     || 0)
  const vICMS   = parseFloat(get('vICMS')   || 0)
  const vPIS    = parseFloat(get('vPIS')    || 0)
  const vCOFINS = parseFloat(get('vCOFINS') || 0)
  const vST     = parseFloat(get('vST')     || 0)
  const itens   = []
  doc.querySelectorAll('det').forEach(det => {
    const ncm         = det.querySelector('NCM')?.textContent?.trim()   || ''
    const cfop        = det.querySelector('CFOP')?.textContent?.trim()  || ''
    const cst         = det.querySelector('CST')?.textContent?.trim()   || det.querySelector('CSOSN')?.textContent?.trim() || ''
    const xProd       = det.querySelector('xProd')?.textContent?.trim() || ''
    const vProd       = parseFloat(det.querySelector('vProd')?.textContent    || 0)
    const vItemPIS    = parseFloat(det.querySelector('vPIS')?.textContent     || 0)
    const vItemCOFINS = parseFloat(det.querySelector('vCOFINS')?.textContent  || 0)
    const vItemST     = parseFloat(det.querySelector('vICMSST')?.textContent  || det.querySelector('vST')?.textContent || 0)
    if (ncm || cfop) itens.push({ ncm, cfop, cst, xProd, vProd, vItemPIS, vItemCOFINS, vItemST })
  })
  return { competencia, vNF, vICMS, vPIS, vCOFINS, vST, itens, valido: !!competencia && vNF > 0 }
}

function parsePGDAS(xmlStr) {
  const doc          = new DOMParser().parseFromString(xmlStr, 'application/xml')
  const competencia  = doc.querySelector('periodoApuracao')?.textContent || doc.querySelector('competencia')?.textContent || ''
  const receitaBruta = parseFloat(doc.querySelector('receitaBrutaTotal')?.textContent || 0)
  const dasDevido    = parseFloat(doc.querySelector('valorDevido')?.textContent       || 0)
  return { competencia: competencia.slice(0,7), receitaBruta, dasDevido, valido: !!competencia && receitaBruta > 0 }
}

function parseSPED(txtStr) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const r = { competencia:'', totalSaidas:0, totalICMS:0, totalPIS:0, totalCOFINS:0, valido:false }
  linhas.forEach(linha => {
    const c = linha.split('|').filter((_,i) => i > 0)
    const reg = c[0]
    if (reg === '0000') { const dt = c[2]||''; r.competencia = dt ? `${dt.slice(4,8)}-${dt.slice(2,4)}` : ''; r.valido = true }
    if (reg === 'C100' && c[1] === '1') r.totalSaidas  += parseFloat(c[10]||0)
    if (reg === 'E110') r.totalICMS    += parseFloat(c[12]||0)
    if (reg === 'M200') r.totalPIS     += parseFloat(c[1] ||0)
    if (reg === 'M600') r.totalCOFINS  += parseFloat(c[1] ||0)
  })
  return r
}

function detectarRaioX(nfes, regime) {
  const itens = nfes.flatMap(n => n.itens || [])
  const meses = [...new Set(nfes.map(n => n.competencia))].length || 1
  const ops   = []

  const mono = itens.filter(i => NCM_MONO.some(n => i.ncm.startsWith(n)))
  if (mono.length > 0) {
    const mm = mono.reduce((s,i) => s + i.vItemPIS + i.vItemCOFINS, 0) / meses
              || mono.reduce((s,i) => s + i.vProd, 0) / meses * 0.0365
    ops.push({ label:'Receitas Monofásicas', cor:'#16a34a', bg:'#f0fdf4', icon:'💊', potencial: mm*60, detalhe:`${mono.length} produto(s) com NCM monofásico` })
  }

  const st      = itens.filter(i => CST_ST.includes(i.cst) && i.vItemST > 0)
  const totalST = nfes.reduce((s,n) => s + n.vST, 0)
  if (st.length > 0 || totalST > 0) {
    const mm = (st.reduce((s,i) => s + i.vItemST, 0) || totalST) / meses
    ops.push({ label: regime === 'Simples Nacional' ? 'ICMS-ST no Simples' : 'ICMS-ST PIS/COFINS', cor:'#2563eb', bg:'#eff6ff', icon:'🏷️', potencial: mm*60, detalhe:'Substituição tributária identificada' })
  }

  const srv = itens.filter(i => CFOP_SRV.includes(i.cfop))
  if (srv.length > 0 && regime === 'Simples Nacional') {
    const mm = srv.reduce((s,i) => s + i.vProd, 0) / meses * 0.05
    ops.push({ label:'Fator R — Anexo V → III', cor:'#d97706', bg:'#fffbeb', icon:'🔄', potencial: mm*60, detalhe:'Empresa com serviços elegível ao Fator R' })
  }

  return ops
}

export default function EntradaDados({ clienteId, cliente, onSalvo, setPage }) {
  const [etapa,        setEtapa]        = useState('inicio')
  const [dadosImport,  setDadosImport]  = useState(null)
  const [nfesLidas,    setNfesLidas]    = useState([])
  const [raioX,        setRaioX]        = useState([])
  const [salvando,     setSalvando]     = useState(false)
  const [cnpjBusca,    setCnpjBusca]    = useState('')
  const [buscando,     setBuscando]     = useState(false)
  const [empresaBusca, setEmpresaBusca] = useState(null)
  const [manual,       setManual]       = useState({ competencia:'', tributo:'', receita_bruta:'', tributo_pago:'', tributo_devido:'', tipo_oportunidade:'', risco:'baixo' })

  const nfeRef   = useRef()
  const pgdasRef = useRef()
  const spedRef  = useRef()

  async function buscarCNPJ() {
    const cnpj = cnpjBusca.replace(/\D/g,'')
    if (cnpj.length !== 14) { alert('CNPJ inválido'); return }
    setBuscando(true)
    try {
      const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      const data = await res.json()
      if (data.cnpj) setEmpresaBusca({ razao_social:data.razao_social, cnpj:maskCNPJ(data.cnpj), cnae:data.cnae_fiscal, municipio:data.municipio, uf:data.uf, situacao:data.descricao_situacao_cadastral })
      else alert('CNPJ não encontrado.')
    } catch { alert('Erro ao consultar.') }
    setBuscando(false)
  }

  function processarNFe(files) {
    const novos = []
    let pend = files.length
    Array.from(files).forEach(f => {
      if (!f.name.endsWith('.xml')) { pend--; return }
      const r = new FileReader()
      r.onload = e => {
        const parsed = parseNFe(e.target.result)
        if (parsed.valido) novos.push({ ...parsed, arquivo: f.name })
        pend--
        if (!pend) {
          setNfesLidas(p => {
            const todas = [...p, ...novos]
            const rx    = detectarRaioX(todas, cliente?.regime || 'Simples Nacional')
            setRaioX(rx)
            const comps = [...new Set(todas.map(n => n.competencia))].sort()
            setDadosImport({
              tipo:'XML NF-e', nfes:todas.length,
              receita:  todas.reduce((s,n) => s+n.vNF, 0),
              impostos: todas.reduce((s,n) => s+n.vICMS+n.vPIS+n.vCOFINS, 0),
              periodo: `${comps[0]||'—'} até ${comps[comps.length-1]||'—'}`,
            })
            setEtapa('concluido')
            return todas
          })
        }
      }
      r.readAsText(f, 'UTF-8')
    })
  }

  function processarPGDAS(file) {
    const r = new FileReader()
    r.onload = e => {
      const d = parsePGDAS(e.target.result)
      if (!d.valido) { alert('Arquivo não reconhecido como PGDAS-D'); return }
      setDadosImport({ tipo:'PGDAS-D', nfes:0, receita:d.receitaBruta, impostos:d.dasDevido, periodo:d.competencia, pgdas:d })
      setEtapa('concluido')
    }
    r.readAsText(file, 'UTF-8')
  }

  function processarSPED(file) {
    const r = new FileReader()
    r.onload = e => {
      const d = parseSPED(e.target.result)
      if (!d.valido) { alert('Arquivo não reconhecido como SPED'); return }
      setDadosImport({ tipo:'SPED', nfes:0, receita:d.totalSaidas, impostos:d.totalICMS+d.totalPIS+d.totalCOFINS, periodo:d.competencia, sped:d })
      setEtapa('concluido')
    }
    r.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    if (!clienteId) { alert('Selecione um cliente primeiro.'); return }
    setSalvando(true)
    try {
      if (nfesLidas.length > 0) {
        const map = {}
        nfesLidas.forEach(n => {
          if (!map[n.competencia]) map[n.competencia] = { vNF:0, vICMS:0, vPIS:0, vCOFINS:0, vST:0 }
          map[n.competencia].vNF     += n.vNF
          map[n.competencia].vICMS   += n.vICMS
          map[n.competencia].vPIS    += n.vPIS
          map[n.competencia].vCOFINS += n.vCOFINS
          map[n.competencia].vST     += n.vST
        })
        for (const [comp, v] of Object.entries(map)) {
          await supabase.from('entradas').upsert({
            cliente_id:clienteId, competencia:comp, tributo:'NF-e importada',
            receita_bruta:v.vNF, tributo_pago:v.vICMS+v.vPIS+v.vCOFINS+v.vST,
            tributo_devido:v.vICMS+v.vPIS+v.vCOFINS, credito:Math.max(0,v.vST),
            tipo_oportunidade:raioX.length>0?raioX[0].label:'', risco:'baixo',
          }, { onConflict:'cliente_id,competencia,tributo' })
        }
      } else if (dadosImport?.pgdas) {
        const d = dadosImport.pgdas
        await supabase.from('entradas').upsert({
          cliente_id:clienteId, competencia:d.competencia, tributo:'DAS',
          receita_bruta:d.receitaBruta, tributo_pago:d.dasDevido, tributo_devido:d.dasDevido, credito:0,
          tipo_oportunidade:'', risco:'baixo',
        }, { onConflict:'cliente_id,competencia,tributo' })
      } else if (dadosImport?.sped) {
        const d = dadosImport.sped
        await supabase.from('entradas').upsert({
          cliente_id:clienteId, competencia:d.competencia, tributo:'ICMS/PIS/COFINS',
          receita_bruta:d.totalSaidas, tributo_pago:d.totalICMS+d.totalPIS+d.totalCOFINS,
          tributo_devido:d.totalICMS+d.totalPIS+d.totalCOFINS, credito:0,
          tipo_oportunidade:'', risco:'baixo',
        }, { onConflict:'cliente_id,competencia,tributo' })
      }
      if (onSalvo) onSalvo()
    } catch (e) { alert('Erro ao salvar: '+e.message) }
    finally { setSalvando(false) }
  }

  async function salvarManual() {
    if (!clienteId || !manual.competencia || !manual.tributo) { alert('Preencha competência e tributo.'); return }
    setSalvando(true)
    const pago   = parseFloat((manual.tributo_pago  ||'0').replace(/\./g,'').replace(',','.')) || 0
    const devido = parseFloat((manual.tributo_devido||'0').replace(/\./g,'').replace(',','.')) || 0
    await supabase.from('entradas').insert([{
      cliente_id:clienteId, competencia:manual.competencia, tributo:manual.tributo,
      receita_bruta:parseFloat((manual.receita_bruta||'0').replace(/\./g,'').replace(',','.')) || 0,
      tributo_pago:pago, tributo_devido:devido, credito:Math.max(0,pago-devido),
      tipo_oportunidade:manual.tipo_oportunidade, risco:manual.risco,
    }])
    setSalvando(false)
    setManual({ competencia:'', tributo:'', receita_bruta:'', tributo_pago:'', tributo_devido:'', tipo_oportunidade:'', risco:'baixo' })
    if (onSalvo) onSalvo()
    alert('Entrada salva!')
  }

  const CardImport = ({ icon, label, desc, onClick, cor }) => (
    <div onClick={onClick}
      style={{ background:'#fff', border:'2px solid #e2e8f0', borderRadius:14, padding:20, cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=cor; e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.transform='none' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:13, fontWeight:800, color:'#0B1F4D', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:11, color:'#94a3b8' }}>{desc}</div>
    </div>
  )

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>

      <div style={{ background:'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius:16, padding:'24px 32px', marginBottom:24, color:'#fff' }}>
        <div style={{ fontSize:11, color:'#7CC4FF', fontWeight:700, letterSpacing:2, marginBottom:6 }}>FISCALTRIB — COLETA INTELIGENTE</div>
        <h2 style={{ fontSize:22, fontWeight:900, margin:'0 0 6px', color:'#fff' }}>📥 Centro de Coleta de Dados</h2>
        <p style={{ fontSize:13, color:'#93c5fd', margin:0 }}>Importe os arquivos fiscais — o sistema preenche tudo automaticamente.</p>
      </div>

      {!clienteId ? (
        <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:48, textAlign:'center', color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👆</div>
          <div style={{ fontSize:16, fontWeight:600, color:'#374151' }}>Selecione um cliente no menu para começar</div>
        </div>
      ) : (
        <>
          {/* BLOCO 1 */}
          <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:'20px 24px', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#0B1F4D', marginBottom:4 }}>🏢 Bloco 1 — Identificação da empresa</div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:14 }}>Cliente selecionado ou busque outro CNPJ</div>
            <div style={{ background:'#f0f9ff', border:'1.5px solid #bae6fd', borderRadius:10, padding:'14px 18px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#0B1F4D' }}>{cliente?.razao_social}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{cliente?.cnpj} · {cliente?.regime} · CNAE {cliente?.cnae_principal||'—'}</div>
              </div>
              <span style={{ background:'#0B1F4D', color:'#fff', fontSize:11, padding:'4px 12px', borderRadius:99, fontWeight:700 }}>✓ Ativo</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <input value={cnpjBusca} onChange={e => setCnpjBusca(maskCNPJ(e.target.value))} placeholder="Buscar outro CNPJ..."
                style={{ flex:1, padding:'10px 14px', border:'2px solid #e2e8f0', borderRadius:8, fontSize:13 }} />
              <button onClick={buscarCNPJ} disabled={buscando}
                style={{ padding:'10px 20px', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {buscando ? '⏳' : '🔍 Buscar'}
              </button>
            </div>
            {empresaBusca && (
              <div style={{ marginTop:12, background:'#f8fafc', borderRadius:10, padding:'14px 16px', fontSize:13 }}>
                <div style={{ fontWeight:700, color:'#0B1F4D', marginBottom:6 }}>{empresaBusca.razao_social}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, color:'#64748b' }}>
                  <div>CNPJ: <strong>{empresaBusca.cnpj}</strong></div>
                  <div>CNAE: <strong>{empresaBusca.cnae}</strong></div>
                  <div>Município: <strong>{empresaBusca.municipio}/{empresaBusca.uf}</strong></div>
                  <div>Situação: <strong style={{ color:empresaBusca.situacao==='ATIVA'?'#16a34a':'#dc2626' }}>{empresaBusca.situacao}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* BLOCO 2 */}
          <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:'20px 24px', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#0B1F4D', marginBottom:4 }}>📂 Bloco 2 — Fontes de dados</div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Clique para importar — o sistema lê e preenche tudo automaticamente</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
              <CardImport icon="🧾" label="XML NF-e em lote"            desc="Múltiplos arquivos XML"      onClick={() => nfeRef.current?.click()}           cor="#16a34a" />
              <CardImport icon="📋" label="PGDAS-D"                     desc="XML do Simples Nacional"    onClick={() => pgdasRef.current?.click()}         cor="#2563eb" />
              <CardImport icon="📂" label="SPED Fiscal / Contribuições" desc="Arquivo TXT do SPED"        onClick={() => spedRef.current?.click()}          cor="#7c3aed" />
              <CardImport icon="📑" label="DCTFWeb / Outros"            desc="Demais arquivos fiscais"    onClick={() => setPage && setPage('importacoes')} cor="#d97706" />
            </div>
            <input ref={nfeRef}   type="file" accept=".xml" multiple style={{ display:'none' }} onChange={e => processarNFe(e.target.files)} />
            <input ref={pgdasRef} type="file" accept=".xml"          style={{ display:'none' }} onChange={e => e.target.files[0] && processarPGDAS(e.target.files[0])} />
            <input ref={spedRef}  type="file" accept=".txt"          style={{ display:'none' }} onChange={e => e.target.files[0] && processarSPED(e.target.files[0])} />
            {etapa !== 'manual' && (
              <div style={{ textAlign:'center' }}>
                <button onClick={() => setEtapa('manual')} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                  Não possuo arquivos — entrada manual
                </button>
              </div>
            )}
          </div>

          {/* BLOCO 3 */}
          {dadosImport && (
            <div style={{ background:'#fff', borderRadius:14, border:'2px solid #22C55E', padding:'20px 24px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ fontSize:22 }}>✅</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#0B1F4D' }}>Bloco 3 — Dados encontrados</div>
                  <div style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>{dadosImport.tipo} processado com sucesso</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                {[
                  { label:'NF-e analisadas',   valor: dadosImport.nfes || '—'    },
                  { label:'Receita encontrada', valor: fmtR(dadosImport.receita)  },
                  { label:'Impostos totais',    valor: fmtR(dadosImport.impostos) },
                  { label:'Período',            valor: dadosImport.periodo        },
                ].map((k,i) => (
                  <div key={i} style={{ background:'#f0fdf4', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{k.label}</div>
                    <div style={{ fontSize:14, fontWeight:800, color:'#0B1F4D' }}>{k.valor}</div>
                  </div>
                ))}
              </div>
              <button onClick={salvarDados} disabled={salvando}
                style={{ width:'100%', padding:'13px 0', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor:'pointer' }}>
                {salvando ? '⏳ Salvando...' : '💾 Salvar dados no sistema'}
              </button>
            </div>
          )}

          {/* BLOCO 4 */}
          {raioX.length > 0 && (
            <div style={{ background:'#fff', borderRadius:14, border:'2px solid #e2e8f0', padding:'20px 24px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0B1F4D', marginBottom:4 }}>⚡ Bloco 4 — Raio-X Tributário</div>
              <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Oportunidades detectadas automaticamente</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {raioX.map((op,i) => (
                  <div key={i} style={{ background:op.bg, borderRadius:10, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', border:`1.5px solid ${op.cor}33` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:22 }}>{op.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:op.cor }}>{op.label}</div>
                        <div style={{ fontSize:12, color:'#64748b' }}>{op.detalhe}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>Potencial 60m</div>
                      <div style={{ fontSize:18, fontWeight:900, color:op.cor }}>{fmtR(op.potencial)}</div>
                    </div>
                  </div>
                ))}
                <div style={{ background:'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius:10, padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#7CC4FF' }}>POTENCIAL TOTAL (60 MESES)</div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#4ade80' }}>{fmtR(raioX.reduce((s,o) => s+o.potencial, 0))}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <button onClick={() => setPage && setPage('diagnostico')} style={{ flex:1, padding:'12px 0', background:'#eff6ff', border:'2px solid #bfdbfe', color:'#1e40af', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  📋 Ver diagnóstico completo
                </button>
                <button onClick={() => setPage && setPage('relatorio')} style={{ flex:1, padding:'12px 0', background:'#f0fdf4', border:'2px solid #86efac', color:'#166534', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  📄 Gerar relatório matador
                </button>
              </div>
            </div>
          )}

          {/* ENTRADA MANUAL */}
          {etapa === 'manual' && (
            <div style={{ background:'#fff', borderRadius:14, border:'2px solid #fde68a', padding:'20px 24px', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#92400e' }}>⚠️ Entrada manual — somente emergência</div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>Prefira sempre importar arquivos fiscais</div>
                </div>
                <button onClick={() => setEtapa('inicio')} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:18 }}>✕</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                {[['Competência','competencia',null],['Receita Bruta (R$)','receita_bruta','moeda'],['Tributo Pago (R$)','tributo_pago','moeda'],['Tributo Devido (R$)','tributo_devido','moeda']].map(([lb,k,tp]) => (
                  <div key={k}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>{lb}</label>
                    <input value={manual[k]} type={k==='competencia'?'month':'text'}
                      onChange={e => setManual(p => ({ ...p, [k]: tp==='moeda' ? maskMoeda(e.target.value) : e.target.value }))}
                      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:7, fontSize:13, boxSizing:'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Tributo</label>
                  <select value={manual.tributo} onChange={e => setManual(p => ({ ...p, tributo:e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:7, fontSize:13 }}>
                    <option value=''>— Selecione —</option>
                    {['DAS','IRPJ','CSLL','PIS','COFINS','INSS','ISS','ICMS ST'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Risco</label>
                  <select value={manual.risco} onChange={e => setManual(p => ({ ...p, risco:e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:7, fontSize:13 }}>
                    <option value='baixo'>Baixo</option>
                    <option value='medio'>Médio</option>
                    <option value='alto'>Alto</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Tipo de oportunidade</label>
                <select value={manual.tipo_oportunidade} onChange={e => setManual(p => ({ ...p, tipo_oportunidade:e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:7, fontSize:13 }}>
                  <option value=''>— Selecione —</option>
                  {['Receita monofásica tributada indevidamente','Substituição tributária indevida','Base de cálculo reduzida não aplicada','Isenção não aproveitada','Alíquota incorreta','Crédito não aproveitado'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={salvarManual} disabled={salvando}
                style={{ marginTop:16, width:'100%', padding:'12px 0', background:'#92400e', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {salvando ? 'Salvando...' : '💾 Salvar entrada manual'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}