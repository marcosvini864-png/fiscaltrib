/**
 * AbaMonofasicos.jsx — e-FiscalTribe®
 * Módulo autossuficiente de Monofásicos PIS/COFINS.
 * Upload próprio + Motor + Formulário PGDAS-D manual.
 */

import { useState, useRef } from 'react'
import { supabase } from '../../supabase'
import { parseXMLNFe } from '../../utils/parseXMLNFe'
import MotorInteligenciaTributaria from '../../motor/MotorInteligenciaTributaria'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const NCM_MONOFASICOS_PREFIXOS = [
  '2701','2702','2703','2704','2705','2706','2707','2708','2709','2710','2711','2712','2713','2714','2715',
  '3001','3002','3003','3004','3005','3006',
  '3303','3304','3305','3306','3307','3401','9603','9619',
  '2201','2202','2203','2204','2205','2206','2207','2208','2209','2106',
  '8701','8702','8703','8704','8705','8706','8711',
  '4011','4012','4013',
  '8407','8408','8409','8413','8414','8415','8421','8431','8481','8482','8483','8484',
  '8501','8505','8507','8511','8512','8519','8527','8536','8539','8544','8708','8714','9032','9401',
]

function isMonofasico(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  return NCM_MONOFASICOS_PREFIXOS.some(p => n.startsWith(p))
}

export default function AbaMonofasicos({ cliente, regime }) {
  const [etapa, setEtapa] = useState('upload') // upload | processando | resultado
  const [arquivos, setArquivos] = useState([])
  const [itens, setItens] = useState([])
  const [totalReceita, setTotalReceita] = useState(0)
  const [erro, setErro] = useState('')
  const [pgdas, setPgdas] = useState(null)
  const [pgdasForm, setPgdasForm] = useState({
    receita_bruta_total: '',
    receita_monofasica: '',
    receita_st: '',
    das_recolhido: '',
    segregou: false,
  })
  const inputRef = useRef(null)

  function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    setArquivos(prev => [...prev, ...files.map(f => ({ file: f, nome: f.name }))])
  }

  async function processar() {
    if (arquivos.length === 0) return
    setEtapa('processando')
    setErro('')
    try {
      const notasXML = []
      for (const arq of arquivos) {
        const texto = await arq.file.text()
        const xmls = texto.includes('<nfeProc')
          ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x + '</nfeProc>')
          : [texto]
        for (const xml of xmls) {
          try { const n = parseXMLNFe(xml); if (n.competencia) notasXML.push(n) }
          catch (e) { console.warn('XML inválido:', e) }
        }
      }

      if (notasXML.length === 0) throw new Error('Nenhum XML válido encontrado.')

      // Filtra saídas e extrai itens monofásicos
      const saidas = notasXML.filter(n => !n.tpNF || n.tpNF === '1')
      const itensMono = saidas.flatMap(nfe =>
        (nfe.itens || [])
          .filter(i => isMonofasico(i.ncm))
          .map(i => ({
            ncm: i.ncm || '',
            descricao: i.xProd || '',
            vProd: i.vProd || 0,
            vItemPIS: i.vItemPIS || 0,
            vItemCOFINS: i.vItemCOFINS || 0,
            credito: regime !== 'Simples Nacional' ? (i.vItemPIS || 0) + (i.vItemCOFINS || 0) : 0,
            pendentePGDAS: regime === 'Simples Nacional',
            competencia: nfe.competencia,
            nNF: nfe.nNF,
          }))
      )

      const receitaTotal = saidas.reduce((s, n) => s + (n.totalProd || 0), 0)
      const receitaMono = itensMono.reduce((s, i) => s + i.vProd, 0)

      setItens(itensMono)
      setTotalReceita(receitaTotal)

      // Pré-preenche formulário PGDAS com receita monofásica identificada
      if (regime === 'Simples Nacional') {
        setPgdasForm(prev => ({
          ...prev,
          receita_bruta_total: receitaTotal.toFixed(2),
          receita_monofasica: receitaMono.toFixed(2),
        }))
      }

      setEtapa('resultado')
    } catch (e) {
      setErro(e.message)
      setEtapa('upload')
    }
  }

  function calcularPGDAS() {
    const rb  = parseFloat(pgdasForm.receita_bruta_total || 0)
    const rm  = parseFloat(pgdasForm.receita_monofasica || 0)
    const rst = parseFloat(pgdasForm.receita_st || 0)
    const das = parseFloat(pgdasForm.das_recolhido || 0)
    const dasCorreto = (rb - rm - rst) * 0.06
    const diferenca  = Math.max(0, das - dasCorreto)
    setPgdas({
      receita_bruta_total: rb,
      receita_monofasica: rm,
      receita_st: rst,
      das_recolhido: das,
      das_correto_estimado: dasCorreto,
      diferenca_total: diferenca,
      segregou: pgdasForm.segregou,
    })
  }

  const creditoTotal = regime === 'Simples Nacional'
    ? (pgdas?.diferenca_total || 0)
    : itens.reduce((s, i) => s + i.credito, 0)

  // ── UPLOAD ──────────────────────────────────────────────────
  if (etapa === 'upload') return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ background: '#0B1F4D', borderRadius: 12, padding: '16px 20px', marginBottom: 16, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>MONOFÁSICOS PIS/COFINS</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>💊 {cliente?.razao_social}</div>
        <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>{regime} · {cliente?.cnpj}</div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #C8D0DC', padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Importar XMLs de NF-e</div>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
          Importe os XMLs das notas fiscais para identificar produtos sujeitos à tributação monofásica de PIS/COFINS.
        </div>

        <div
          onDrop={onDrop} onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed #C8D0DC', borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC', marginBottom: 16 }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>Arraste ou clique para selecionar</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>XML de NF-e · Aceita múltiplos arquivos</div>
          <input ref={inputRef} type="file" multiple accept=".xml" onChange={onDrop} style={{ display: 'none' }} />
        </div>

        {arquivos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {arquivos.map((arq, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#F1F5F9', borderRadius: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>📄 {arq.nome}</span>
                <button onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {erro}
          </div>
        )}

        <button onClick={processar} disabled={arquivos.length === 0}
          style={{ width: '100%', padding: 12, background: arquivos.length > 0 ? '#0B1F4D' : '#C8D0DC', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: arquivos.length > 0 ? 'pointer' : 'not-allowed' }}>
          🔍 Identificar Monofásicos {arquivos.length > 0 ? `(${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''})` : ''}
        </button>
      </div>

      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', marginTop: 16, fontSize: 12, color: '#0369a1' }}>
        <strong>Base legal:</strong> Lei 10.147/2000 · Lei 10.485/2002 · Lei 9.718/1998 · Lei 13.097/2015 — Tributação concentrada no fabricante. Revendedor tem alíquota zero.
      </div>
    </div>
  )

  // ── PROCESSANDO ──────────────────────────────────────────────
  if (etapa === 'processando') return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>Analisando XMLs...</div>
      <div style={{ fontSize: 13, color: '#64748B' }}>Cruzando NCMs com tabela legislativa monofásica</div>
    </div>
  )

  // ── RESULTADO ────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: '#0B1F4D', borderRadius: 12, padding: '16px 20px', marginBottom: 16, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>MONOFÁSICOS PIS/COFINS</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>💊 {cliente?.razao_social}</div>
        <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>{regime} · {arquivos.length} arquivo(s) · {itens.length} itens monofásicos</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Itens monofásicos', valor: itens.length, cor: '#2563EB' },
          { label: 'Receita monofásica', valor: fmtR(itens.reduce((s, i) => s + i.vProd, 0)), cor: '#ea580c' },
          { label: 'Potencial de recuperação', valor: fmtR(creditoTotal), cor: '#16a34a' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #C8D0DC', textAlign: 'center' }}>
            <div style={{ fontSize: i === 0 ? 24 : 15, fontWeight: 700, color: k.cor }}>{k.valor}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Potencial */}
      <div style={{ background: creditoTotal > 0 ? '#f0fdf4' : '#f8fafc', border: `2px solid ${creditoTotal > 0 ? '#86efac' : '#C8D0DC'}`, borderRadius: 12, padding: '16px 24px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>POTENCIAL DE RECUPERAÇÃO — MONOFÁSICOS PIS/COFINS</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: creditoTotal > 0 ? '#16a34a' : '#64748B' }}>{fmtR(creditoTotal)}</div>
        {regime === 'Simples Nacional' && !pgdas && (
          <div style={{ fontSize: 12, color: '#ea580c', marginTop: 4 }}>⚠️ Preencha os dados do PGDAS-D abaixo para calcular o crédito real</div>
        )}
      </div>

      {/* Lista de itens */}
      {itens.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #C8D0DC', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 12 }}>📋 Produtos Monofásicos Identificados</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['NF', 'Competência', 'Produto', 'NCM', 'Receita', regime === 'Simples Nacional' ? 'Situação' : 'Crédito'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', textAlign: 'left', color: '#64748B', fontWeight: 600, borderBottom: '1px solid #C8D0DC', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 8px', fontSize: 11, fontWeight: 600 }}>{item.nNF || '—'}</td>
                  <td style={{ padding: '7px 8px', fontSize: 11 }}>{item.competencia}</td>
                  <td style={{ padding: '7px 8px', fontSize: 11 }}>{item.descricao}</td>
                  <td style={{ padding: '7px 8px', fontSize: 11, color: '#64748B' }}>{item.ncm}</td>
                  <td style={{ padding: '7px 8px', fontSize: 11 }}>{fmtR(item.vProd)}</td>
                  <td style={{ padding: '7px 8px', fontSize: 11, fontWeight: 700, color: item.pendentePGDAS ? '#ea580c' : '#16a34a' }}>
                    {item.pendentePGDAS ? 'Pendente PGDAS-D' : fmtR(item.credito)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, textAlign: 'right', fontSize: 12, color: '#64748B' }}>
            Receita monofásica total: <strong style={{ color: '#ea580c' }}>{fmtR(itens.reduce((s, i) => s + i.vProd, 0))}</strong>
          </div>
        </div>
      )}

      {/* Formulário PGDAS-D — só Simples Nacional */}
      {regime === 'Simples Nacional' && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ea580c', marginBottom: 4 }}>📋 PGDAS-D — Calcular Crédito de Segregação</div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
            Para Simples Nacional, o crédito é a diferença entre o DAS pago e o DAS correto sem as receitas monofásicas. Preencha os dados do PGDAS-D do período.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Receita Bruta Total (R$)', key: 'receita_bruta_total' },
              { label: 'Receita Monofásica (R$)', key: 'receita_monofasica' },
              { label: 'Receita c/ Subst. Tributária (R$)', key: 'receita_st' },
              { label: 'DAS Recolhido (R$)', key: 'das_recolhido' },
            ].map(({ label, key }) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                <input
                  type="number"
                  value={pgdasForm[key]}
                  onChange={e => setPgdasForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder="0,00"
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #C8D0DC', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={pgdasForm.segregou}
              onChange={e => setPgdasForm(prev => ({ ...prev, segregou: e.target.checked }))} />
            Segregou receitas monofásicas corretamente no PGDAS-D
          </label>
          <button onClick={calcularPGDAS}
            style={{ padding: '10px 24px', background: '#0B1F4D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ✅ Calcular Crédito
          </button>

          {/* Resultado PGDAS */}
          {pgdas && (
            <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 12 }}>Resultado do Cálculo</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { label: 'Receita Bruta Total', valor: fmtR(pgdas.receita_bruta_total) },
                  { label: 'Receita Monofásica', valor: fmtR(pgdas.receita_monofasica) },
                  { label: 'DAS Recolhido', valor: fmtR(pgdas.das_recolhido) },
                  { label: 'DAS Correto Estimado', valor: fmtR(pgdas.das_correto_estimado) },
                  { label: 'Diferença Recuperável', valor: fmtR(pgdas.diferenca_total) },
                  { label: 'Segregou Corretamente', valor: pgdas.segregou ? 'Sim' : 'Não' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #C8D0DC' }}>
                    <div style={{ fontSize: 10, color: '#64748B', marginBottom: 2 }}>{k.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: i === 4 ? '#16a34a' : '#1E293B' }}>{k.valor}</div>
                  </div>
                ))}
              </div>
              {pgdas.diferenca_total > 0 && (
                <div style={{ marginTop: 12, background: '#fff', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
                  <strong>Como recuperar:</strong> Retifique o PGDAS-D dos períodos identificados e solicite restituição junto à Receita Federal via PER/DCOMP.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { setEtapa('upload'); setArquivos([]); setItens([]); setPgdas(null) }}
          style={{ padding: '10px 20px', background: 'none', border: '1.5px solid #C8D0DC', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#64748B' }}>
          ← Nova análise
        </button>
      </div>
    </div>
  )
}