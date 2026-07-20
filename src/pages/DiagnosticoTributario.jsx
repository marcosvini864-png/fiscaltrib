import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { parseXMLNFe, agruparPorCompetencia } from '../utils/parseXMLNFe'

const NCM_MONOFASICOS = {
  '27101259': 'Gasolina', '27101921': 'Óleo Diesel', '27111290': 'GLP',
  '30039099': 'Medicamento', '30049099': 'Medicamento',
  '33030010': 'Perfume', '33042090': 'Cosmético',
  '87089990': 'Autopeça', '87082990': 'Autopeça',
  '22021000': 'Bebida', '22030000': 'Cerveja',
  '40111000': 'Pneu', '40112000': 'Pneu',
}

const C = {
  navy: '#0B1F4D', white: '#FFFFFF', border: '#C8D0DC',
  text: '#1E293B', muted: '#64748B', green: '#16a34a',
  red: '#dc2626', bg: '#F4E7EC',
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function Badge({ texto, cor }) {
  const cores = {
    verde: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
    amarelo: { bg: '#fefce8', text: '#ca8a04', border: '#fde047' },
    vermelho: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    azul: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  }
  const c = cores[cor] || cores.azul
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {texto}
    </span>
  )
}

export default function DiagnosticoTributario({ clienteId, cliente, onNavegar }) {
  const [etapa, setEtapa] = useState('inicio')
  const [arquivos, setArquivos] = useState([])
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const inputRef = useRef(null)

  const regime = cliente?.regime || 'Simples Nacional'

  function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    setArquivos(prev => [...prev, ...files.map(f => ({
      file: f,
      nome: f.name,
      tipo: f.name.endsWith('.xml') ? 'xml' : f.name.endsWith('.csv') ? 'csv' : f.name.endsWith('.pdf') ? 'pdf' : 'outro',
    }))])
  }

  async function analisar() {
    if (arquivos.length === 0) return
    setEtapa('processando')
    setErro('')
    try {
      const notasXML = []
      for (const arq of arquivos) {
        if (arq.tipo === 'xml') {
          const texto = await arq.file.text()
          const xmls = texto.includes('<nfeProc')
            ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x + '</nfeProc>')
            : [texto]
          for (const xml of xmls) {
            try { const n = parseXMLNFe(xml); if (n.competencia) notasXML.push(n) }
            catch (e) { console.warn('XML inválido:', e) }
          }
        }
      }

      if (notasXML.length === 0) throw new Error('Nenhuma NF-e válida encontrada.')

      const competencias = agruparPorCompetencia(notasXML)
      const entradas = notasXML.filter(n => n.tipo === 'entrada')
      const saidas = notasXML.filter(n => n.tipo === 'saida')
      const itensEntrada = entradas.flatMap(n => n.itens)

      const monofasicos = []
      for (const item of itensEntrada) {
        const ncm8 = item.ncm?.substring(0, 8)
        const desc = NCM_MONOFASICOS[ncm8]
        if (desc) {
          if ((regime === 'Lucro Presumido' || regime === 'Lucro Real') && (item.vPIS > 0 || item.vCOFINS > 0)) {
            monofasicos.push({ ...item, descricao: desc, credito: item.vPIS + item.vCOFINS, tese: 'MONOFASICO' })
          }
          if (regime === 'Simples Nacional') {
            monofasicos.push({ ...item, descricao: desc, credito: 0, tese: 'SEGREGACAO_MONOFASICO' })
          }
        }
      }

      const exclusaoICMS = []
      if (regime === 'Lucro Presumido' || regime === 'Lucro Real') {
        for (const comp of competencias) {
          if (comp.totalICMS > 0) {
            const aliq = regime === 'Lucro Real' ? 0.0925 : 0.0365
            exclusaoICMS.push({
              competencia: comp.competencia,
              vICMS: comp.totalICMS,
              credito: comp.totalICMS * aliq,
              tese: 'EXCLUSAO_ICMS_TEMA69',
            })
          }
        }
      }

      const icmsST = []
      if (regime === 'Lucro Real') {
        for (const item of itensEntrada) {
          if (item.vST > 0) {
            icmsST.push({ ...item, credito: item.vST * 0.0925, tese: 'ICMS_ST' })
          }
        }
      }

      const retencoes = []
      if (regime === 'Simples Nacional') {
        for (const nota of notasXML) {
          if ((nota.totalPIS > 0 || nota.totalCOFINS > 0) && nota.crt === '1') {
            retencoes.push({
              nNF: nota.nNF,
              competencia: nota.competencia,
              credito: nota.totalPIS + nota.totalCOFINS,
              tese: 'RETENCAO_INDEVIDA',
            })
          }
        }
      }

      const totalCredito =
        monofasicos.reduce((s, o) => s + o.credito, 0) +
        exclusaoICMS.reduce((s, o) => s + o.credito, 0) +
        icmsST.reduce((s, o) => s + o.credito, 0) +
        retencoes.reduce((s, o) => s + o.credito, 0)

      const resumoCompetencias = competencias.map(comp => ({
        competencia: comp.competencia,
        receita_bruta: comp.totalProd,
        receita_tributada: comp.totalProd,
        receita_monofasica: comp.itens.filter(i => NCM_MONOFASICOS[i.ncm?.substring(0, 8)]).reduce((s, i) => s + i.vProd, 0),
        tributo_pago: comp.totalPIS + comp.totalCOFINS,
        tributo_devido: 0,
        credito: exclusaoICMS.filter(o => o.competencia === comp.competencia).reduce((s, o) => s + o.credito, 0),
        nfes_analisadas: comp.notas.length,
        periodo_inicio: comp.competencia + '-01',
        periodo_fim: comp.competencia + '-01',
      }))

      setResultado({
        totalNotas: notasXML.length,
        entradas: entradas.length,
        saidas: saidas.length,
        competencias,
        resumoCompetencias,
        monofasicos,
        exclusaoICMS,
        icmsST,
        retencoes,
        totalCredito,
      })
      setEtapa('resultado')
    } catch (e) {
      setErro(e.message)
      setEtapa('inicio')
    }
  }

  async function salvar() {
    if (!resultado || !clienteId) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      for (const comp of resultado.resumoCompetencias) {
        const creditoComp =
          resultado.exclusaoICMS.filter(o => o.competencia === comp.competencia).reduce((s, o) => s + o.credito, 0) +
          (resultado.monofasicos.length > 0 ? comp.receita_monofasica * (regime === 'Lucro Real' ? 0.0925 : 0.0365) : 0)

        await supabase.from('entradas').upsert({
          cliente_id: clienteId,
          usuario_id: user.id,
          competencia: comp.competencia,
          tributo: 'PIS/COFINS',
          receita_bruta: comp.receita_bruta,
          receita_tributada: comp.receita_tributada,
          receita_monofasica: comp.receita_monofasica,
          tributo_pago: comp.tributo_pago,
          tributo_devido: comp.tributo_devido,
          credito: creditoComp,
          nfes_analisadas: comp.nfes_analisadas,
          periodo_inicio: comp.periodo_inicio,
          periodo_fim: comp.periodo_fim,
          tipo_oportunidade: resultado.monofasicos.length > 0 ? 'MONOFASICO' : resultado.exclusaoICMS.length > 0 ? 'EXCLUSAO_ICMS' : 'SEM_OPORTUNIDADE',
          risco: 'baixo',
          documentos: JSON.stringify({ nfes: resultado.totalNotas }),
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      alert('Análise salva com sucesso!')
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  if (!clienteId) return (
    <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Selecione um cliente para iniciar o diagnóstico</div>
      <div style={{ fontSize: 13 }}>Use o seletor de cliente no menu lateral</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>FISCALTRIB — DIAGNÓSTICO TRIBUTÁRIO</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>🔎 {cliente?.razao_social}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{regime}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{cliente?.cnpj}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{cliente?.municipio}/{cliente?.uf}</span>
        </div>
      </div>

      {etapa === 'inicio' && (
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>📂 Importar documentos fiscais</div>
          <div
            onDrop={onDrop} onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', marginBottom: 16 }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>Arraste ou clique para selecionar</div>
            <div style={{ fontSize: 13, color: C.muted }}>XML de NF-e · CSV · PDF (PGDAS, SPED)</div>
            <input ref={inputRef} type="file" multiple accept=".xml,.csv,.pdf" onChange={onDrop} style={{ display: 'none' }} />
          </div>

          {arquivos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {arquivos.map((arq, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{arq.tipo === 'xml' ? '📄' : arq.tipo === 'csv' ? '📊' : '📑'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{arq.nome}</span>
                    <Badge texto={arq.tipo.toUpperCase()} cor="azul" />
                  </div>
                  <button onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>⚠️ {erro}</div>
          )}

          <button
            onClick={analisar} disabled={arquivos.length === 0}
            style={{ width: '100%', padding: 14, background: arquivos.length > 0 ? C.navy : C.border, color: C.white, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: arquivos.length > 0 ? 'pointer' : 'not-allowed', marginBottom: 20 }}
          >
            🔍 Iniciar Diagnóstico {arquivos.length > 0 ? `(${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''})` : ''}
          </button>

          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12, letterSpacing: 1 }}>TESES QUE SERÃO VERIFICADAS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {[
                { icon: '💊', tese: 'Monofásicos PIS/COFINS', regimes: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'] },
                { icon: '⚖️', tese: 'Exclusão ICMS Tema 69', regimes: ['Lucro Presumido', 'Lucro Real'] },
                { icon: '🔄', tese: 'Crédito ICMS-ST', regimes: ['Lucro Real'] },
                { icon: '🚫', tese: 'Retenções Indevidas', regimes: ['Simples Nacional'] },
              ].map((t, i) => {
                const aplicavel = t.regimes.includes(regime)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: aplicavel ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: `1px solid ${aplicavel ? '#86efac' : C.border}` }}>
                    <span>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: aplicavel ? C.green : C.muted }}>{t.tese}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: aplicavel ? C.green : C.muted }}>{aplicavel ? '✓' : '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {etapa === 'processando' && (
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Analisando documentos...</div>
          <div style={{ fontSize: 13, color: C.muted }}>Cruzando NCMs, competências e teses tributárias</div>
        </div>
      )}

      {etapa === 'resultado' && resultado && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'NF-e analisadas', valor: resultado.totalNotas, cor: '#2563eb' },
              { label: 'Entradas', valor: resultado.entradas, cor: '#16a34a' },
              { label: 'Saídas', valor: resultado.saidas, cor: '#7c3aed' },
              { label: 'Competências', valor: resultado.competencias.length, cor: '#0891b2' },
            ].map((k, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: resultado.totalCredito > 0 ? '#f0fdf4' : '#f8fafc', border: `2px solid ${resultado.totalCredito > 0 ? '#86efac' : C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>POTENCIAL TOTAL DE RECUPERAÇÃO</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: resultado.totalCredito > 0 ? C.green : C.muted }}>{fmtR(resultado.totalCredito)}</div>
            {resultado.totalCredito === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Nenhuma oportunidade identificada</div>}
          </div>

          {[
            { lista: resultado.monofasicos, titulo: '💊 Monofásicos PIS/COFINS', cor: '#7c3aed', campos: ['produto', 'ncm', 'vProd', 'credito'] },
            { lista: resultado.exclusaoICMS, titulo: '⚖️ Exclusão ICMS — STF Tema 69', cor: '#0891b2', campos: ['competencia', 'vICMS', 'credito'] },
            { lista: resultado.icmsST, titulo: '🔄 Crédito ICMS-ST', cor: '#ea580c', campos: ['produto', 'vST', 'credito'] },
            { lista: resultado.retencoes, titulo: '🚫 Retenções Indevidas', cor: '#dc2626', campos: ['nNF', 'competencia', 'credito'] },
          ].map((grupo, gi) => grupo.lista.length > 0 && (
            <div key={gi} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: grupo.cor, marginBottom: 12 }}>{grupo.titulo}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {grupo.campos.map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                        {h === 'produto' ? 'Produto' : h === 'ncm' ? 'NCM' : h === 'vProd' ? 'Valor' : h === 'credito' ? 'Crédito' : h === 'competencia' ? 'Competência' : h === 'vICMS' ? 'ICMS' : h === 'vST' ? 'ICMS-ST' : h === 'nNF' ? 'NF' : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupo.lista.slice(0, 10).map((o, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {grupo.campos.map(campo => (
                        <td key={campo} style={{ padding: '6px 10px', fontWeight: campo === 'credito' ? 700 : 400, color: campo === 'credito' ? C.green : C.text }}>
                          {campo === 'credito' || campo === 'vProd' || campo === 'vICMS' || campo === 'vST' ? fmtR(o[campo]) : o[campo] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, fontWeight: 700, color: grupo.cor }}>
                Total: {fmtR(grupo.lista.reduce((s, o) => s + (o.credito || 0), 0))}
              </div>
            </div>
          ))}

          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>📅 Por Competência</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Competência', 'NF-e', 'Receita', 'PIS/COFINS Pago', 'Monofásico', 'Crédito'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.resumoCompetencias.map((comp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{comp.competencia}</td>
                    <td style={{ padding: '6px 10px' }}>{comp.nfes_analisadas}</td>
                    <td style={{ padding: '6px 10px' }}>{fmtR(comp.receita_bruta)}</td>
                    <td style={{ padding: '6px 10px' }}>{fmtR(comp.tributo_pago)}</td>
                    <td style={{ padding: '6px 10px', color: comp.receita_monofasica > 0 ? C.green : C.muted }}>{fmtR(comp.receita_monofasica)}</td>
                    <td style={{ padding: '6px 10px', color: comp.credito > 0 ? C.green : C.muted, fontWeight: comp.credito > 0 ? 700 : 400 }}>{fmtR(comp.credito)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>⚠️ {erro}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { setEtapa('inicio'); setResultado(null); setArquivos([]) }}
              style={{ flex: 1, padding: 12, background: C.white, color: C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Nova análise
            </button>
            <button
              onClick={salvar} disabled={salvando}
              style={{ flex: 2, padding: 12, background: C.navy, color: C.white, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}
            >
              {salvando ? 'Salvando...' : '✅ Salvar diagnóstico'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}