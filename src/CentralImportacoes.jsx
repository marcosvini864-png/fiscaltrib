import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function parseXMLNFe(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const get = (tag) => doc.querySelector(tag)?.textContent || ''
  const dhEmi = get('dhEmi') || get('dEmi')
  const competencia = dhEmi ? dhEmi.slice(0, 7) : ''
  const vNF = parseFloat(get('vNF') || 0)
  const vICMS = parseFloat(get('vICMS') || 0)
  const vPIS = parseFloat(get('vPIS') || 0)
  const vCOFINS = parseFloat(get('vCOFINS') || 0)
  const vISS = parseFloat(get('vISS') || get('vISSQN') || 0)
  return { competencia, vNF, vICMS, vPIS, vCOFINS, vISS, valido: !!competencia && vNF > 0 }
}

function parsePGDAS(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const competencia = doc.querySelector('periodoApuracao')?.textContent || doc.querySelector('competencia')?.textContent || ''
  const receitaBruta = parseFloat(doc.querySelector('receitaBrutaTotal')?.textContent || doc.querySelector('totalReceita')?.textContent || 0)
  const dasDevido = parseFloat(doc.querySelector('valorDevido')?.textContent || doc.querySelector('dasDevido')?.textContent || 0)
  const cnpj = doc.querySelector('cnpj')?.textContent || ''
  const razaoSocial = doc.querySelector('razaoSocial')?.textContent || ''
  const anexo = doc.querySelector('anexo')?.textContent || ''
  const aliquota = parseFloat(doc.querySelector('aliquotaEfetiva')?.textContent || 0)
  return { competencia: competencia.slice(0, 7), receitaBruta, dasDevido, cnpj, razaoSocial, anexo, aliquota, valido: !!competencia && receitaBruta > 0 }
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtCNPJ = v => v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')

function agruparNFePorCompetencia(nfes) {
  const map = {}
  nfes.forEach(nf => {
    if (!map[nf.competencia]) map[nf.competencia] = { competencia: nf.competencia, qtd: 0, vNF: 0, vICMS: 0, vPIS: 0, vCOFINS: 0, vISS: 0 }
    map[nf.competencia].qtd++
    map[nf.competencia].vNF += nf.vNF
    map[nf.competencia].vICMS += nf.vICMS
    map[nf.competencia].vPIS += nf.vPIS
    map[nf.competencia].vCOFINS += nf.vCOFINS
    map[nf.competencia].vISS += nf.vISS
  })
  return Object.values(map).sort((a, b) => a.competencia.localeCompare(b.competencia))
}

const ABAS = [
  { id: 'nfe',     icon: '🧾', label: 'XML NF-e em lote',         status: 'ativo'  },
  { id: 'pgdas',   icon: '📋', label: 'PGDAS-D (Simples)',         status: 'ativo'  },
  { id: 'das',     icon: '💳', label: 'DAS Pagos',                 status: 'ativo'  },
  { id: 'dctfweb', icon: '📑', label: 'DCTFWeb',                   status: 'breve'  },
  { id: 'sped',    icon: '📂', label: 'SPED Fiscal/Contribuições', status: 'breve'  },
  { id: 'ecf',     icon: '📊', label: 'ECD/ECF',                   status: 'breve'  },
  { id: 'debitos', icon: '⚠️', label: 'Extrato de Débitos',        status: 'breve'  },
]

export default function CentralImportacoes() {
  const [aba, setAba] = useState('nfe')
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('clientes').select('id, razao_social, regime').eq('usuario_id', user.id).order('razao_social')
        .then(({ data }) => setClientes(data || []))
    })
  }, [])

  const cliente = clientes.find(c => c.id === clienteId)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 50%, #1a4f7a 100%)', borderRadius: '0 0 24px 24px', padding: '36px 40px 40px', marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — AUTOMAÇÃO FISCAL</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, color: '#fff' }}>📥 Central de Importações</h1>
          <p style={{ fontSize: 16, color: '#9db8d8', marginBottom: 28, lineHeight: 1.6, maxWidth: 520 }}>
            Importe XMLs e arquivos fiscais e deixe o sistema preencher os dados automaticamente. Economia de horas por semana.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              { valor: 'XML NF-e', label: 'Importação em lote',       cor: '#4ade80' },
              { valor: 'PGDAS-D',  label: 'Simples Nacional',          cor: '#60a5fa' },
              { valor: 'DAS',      label: 'Pagamentos',                cor: '#fbbf24' },
              { valor: 'Auto',     label: 'Preenchimento automático',  cor: '#f472b6' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: c.cor, marginBottom: 4 }}>{c.valor}</div>
                <div style={{ fontSize: 11, color: '#9db8d8', fontWeight: 600 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SELETOR CLIENTE */}
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 24 }}>
        <label style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', display: 'block', marginBottom: 10 }}>👤 Cliente para importação:</label>
        <select value={clienteId} onChange={e => setClienteId(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc' }}>
          <option value="">— Selecione um cliente —</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} ({c.regime})</option>)}
        </select>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => a.status === 'ativo' && setAba(a.id)}
            style={{
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: a.status === 'ativo' ? 'pointer' : 'default',
              border: `2px solid ${aba === a.id ? '#1e3a5f' : '#e2e8f0'}`,
              background: aba === a.id ? '#1e3a5f' : a.status === 'breve' ? '#f8fafc' : '#fff',
              color: aba === a.id ? '#fff' : a.status === 'breve' ? '#94a3b8' : '#374151',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span>{a.icon}</span>
            <span>{a.label}</span>
            {a.status === 'breve' && <span style={{ fontSize: 10, background: '#e2e8f0', color: '#94a3b8', padding: '1px 6px', borderRadius: 99 }}>Em breve</span>}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {!clienteId ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um cliente para começar</div>
        </div>
      ) : aba === 'nfe' ? (
        <AbaXMLNFe clienteId={clienteId} cliente={cliente} />
      ) : aba === 'pgdas' ? (
        <AbaPGDAS clienteId={clienteId} cliente={cliente} />
      ) : aba === 'das' ? (
        <AbaDAS clienteId={clienteId} />
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px dashed #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Em desenvolvimento</div>
          <div style={{ fontSize: 14 }}>Este módulo estará disponível em breve!</div>
        </div>
      )}
    </div>
  )
}

function AbaXMLNFe({ clienteId }) {
  const inputRef = useRef()
  const [nfes, setNfes] = useState([])
  const [erros, setErros] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function processarArquivos(files) {
    setSalvo(false)
    const novos = [], novosErros = []
    let pendentes = files.length
    Array.from(files).forEach(f => {
      if (!f.name.endsWith('.xml')) {
        novosErros.push(`${f.name}: não é XML`)
        pendentes--
        if (!pendentes) { setNfes(p => [...p, ...novos]); setErros(p => [...p, ...novosErros]) }
        return
      }
      const reader = new FileReader()
      reader.onload = e => {
        const r = parseXMLNFe(e.target.result)
        if (r.valido) novos.push({ ...r, arquivo: f.name })
        else novosErros.push(`${f.name}: NF-e não reconhecida`)
        pendentes--
        if (!pendentes) { setNfes(p => [...p, ...novos]); setErros(p => [...p, ...novosErros]) }
      }
      reader.readAsText(f, 'UTF-8')
    })
  }

  const agrupadas = agruparNFePorCompetencia(nfes)

  async function salvarEntradas() {
    setSalvando(true)
    try {
      for (const comp of agrupadas) {
        await supabase.from('entradas').upsert({
          cliente_id: clienteId,
          competencia: comp.competencia,
          tributo: 'NF-e importada',
          receita_bruta: comp.vNF,
          tributo_pago: comp.vICMS + comp.vPIS + comp.vCOFINS + comp.vISS,
          tributo_devido: comp.vICMS + comp.vPIS + comp.vCOFINS + comp.vISS,
          credito: 0,
          tipo_oportunidade: '',
          risco: 'baixo',
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true)
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); processarArquivos(e.dataTransfer.files) }}
        onClick={() => inputRef.current.click()}
        style={{ background: dragOver ? '#eff6ff' : '#f8fafc', border: `3px dashed ${dragOver ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 16, padding: '48px 32px', textAlign: 'center', cursor: 'pointer', marginBottom: 24 }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>Arraste os XMLs de NF-e aqui</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>ou clique para selecionar — múltiplos arquivos permitidos</div>
        <div style={{ display: 'inline-block', padding: '10px 24px', background: '#1e3a5f', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>📂 Selecionar XMLs</div>
        <input ref={inputRef} type="file" accept=".xml" multiple style={{ display: 'none' }} onChange={e => processarArquivos(e.target.files)} />
      </div>

      {erros.length > 0 && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>⚠️ {erros.length} arquivo(s) com erro:</div>
          {erros.map((e, i) => <div key={i} style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>• {e}</div>)}
        </div>
      )}

      {nfes.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'NF-e lidas',       valor: nfes.length,                                        cor: '#1e3a5f' },
              { label: 'Faturamento',       valor: fmtR(nfes.reduce((s, n) => s + n.vNF, 0)),         cor: '#16a34a' },
              { label: 'ICMS total',        valor: fmtR(nfes.reduce((s, n) => s + n.vICMS, 0)),       cor: '#d97706' },
              { label: 'PIS+COFINS',        valor: fmtR(nfes.reduce((s, n) => s + n.vPIS + n.vCOFINS, 0)), cor: '#7c3aed' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '16px 20px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.cor }}>{c.valor}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>
              📊 Agrupado por competência ({agrupadas.length} meses)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Competência', 'NF-e', 'Faturamento', 'ICMS', 'PIS', 'COFINS', 'ISS'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agrupadas.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1e3a5f' }}>{c.competencia}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{c.qtd}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#16a34a' }}>{fmtR(c.vNF)}</td>
                    <td style={{ padding: '10px 16px' }}>{fmtR(c.vICMS)}</td>
                    <td style={{ padding: '10px 16px' }}>{fmtR(c.vPIS)}</td>
                    <td style={{ padding: '10px 16px' }}>{fmtR(c.vCOFINS)}</td>
                    <td style={{ padding: '10px 16px' }}>{fmtR(c.vISS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {salvo ? (
            <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '16px 24px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#16a34a' }}>
              ✅ Dados salvos com sucesso!
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setNfes([]); setErros([]) }} style={{ padding: '12px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                🗑️ Limpar
              </button>
              <button onClick={salvarEntradas} disabled={salvando} style={{ flex: 1, padding: '12px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : '💾 Salvar entradas no sistema'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AbaPGDAS({ clienteId, cliente }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    if (!file.name.endsWith('.xml')) { setErro('Selecione um arquivo XML do PGDAS-D'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const r = parsePGDAS(e.target.result)
      if (r.valido) setDados(r)
      else setErro('XML não reconhecido como PGDAS-D.')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    if (!dados) return
    setSalvando(true)
    try {
      await supabase.from('entradas').upsert({
        cliente_id: clienteId,
        competencia: dados.competencia,
        tributo: 'DAS',
        receita_bruta: dados.receitaBruta,
        tributo_pago: dados.dasDevido,
        tributo_devido: dados.dasDevido,
        credito: 0,
        tipo_oportunidade: '',
        risco: 'baixo',
      }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true)
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <div onClick={() => inputRef.current.click()}
        style={{ background: '#f8fafc', border: '3px dashed #e2e8f0', borderRadius: 16, padding: '48px 32px', textAlign: 'center', cursor: 'pointer', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>Importar PGDAS-D em XML</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Selecione o arquivo XML exportado do portal do Simples Nacional</div>
        <div style={{ display: 'inline-block', padding: '10px 24px', background: '#1e3a5f', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>📂 Selecionar XML</div>
        <input ref={inputRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={e => processarArquivo(e.target.files[0])} />
      </div>

      {erro && <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '14px 20px', marginBottom: 20, color: '#dc2626', fontSize: 14, fontWeight: 600 }}>⚠️ {erro}</div>}

      {dados && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 }}>✅ PGDAS-D lido com sucesso</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { label: 'Competência',      valor: dados.competencia },
                { label: 'CNPJ',             valor: dados.cnpj ? fmtCNPJ(dados.cnpj) : '—' },
                { label: 'Razão Social',     valor: dados.razaoSocial || cliente?.razao_social || '—' },
                { label: 'Receita Bruta',    valor: fmtR(dados.receitaBruta) },
                { label: 'DAS Devido',       valor: fmtR(dados.dasDevido) },
                { label: 'Alíquota Efetiva', valor: dados.aliquota ? `${dados.aliquota.toFixed(2)}%` : '—' },
                { label: 'Anexo',            valor: dados.anexo || '—' },
              ].map((c, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{c.valor}</div>
                </div>
              ))}
            </div>
          </div>
          {salvo ? (
            <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '16px 24px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#16a34a' }}>✅ Dados salvos!</div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDados(null)} style={{ padding: '12px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🗑️ Limpar</button>
              <button onClick={salvarDados} disabled={salvando} style={{ flex: 1, padding: '12px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : '💾 Salvar no sistema'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AbaDAS({ clienteId }) {
  const [linhas, setLinhas] = useState([{ competencia: '', valor: '', situacao: 'pago' }])
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const addLinha = () => setLinhas(p => [...p, { competencia: '', valor: '', situacao: 'pago' }])
  const updLinha = (i, k, v) => setLinhas(p => p.map((l, j) => j === i ? { ...l, [k]: v } : l))
  const remLinha = (i) => setLinhas(p => p.filter((_, j) => j !== i))
  const maskMoeda = v => { const n = v.replace(/\D/g, ''); if (!n) return ''; return (parseFloat(n) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

  async function salvar() {
    const validas = linhas.filter(l => l.competencia && l.valor)
    if (!validas.length) { alert('Preencha pelo menos uma competência e valor.'); return }
    setSalvando(true)
    try {
      for (const l of validas) {
        await supabase.from('entradas').upsert({
          cliente_id: clienteId,
          competencia: l.competencia,
          tributo: 'DAS',
          receita_bruta: 0,
          tributo_pago: parseFloat(l.valor.replace(/\./g, '').replace(',', '.')) || 0,
          tributo_devido: parseFloat(l.valor.replace(/\./g, '').replace(',', '.')) || 0,
          credito: 0,
          tipo_oportunidade: '',
          risco: 'baixo',
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true)
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 }}>💳 Registrar DAS Pagos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
          <div>COMPETÊNCIA</div><div>VALOR PAGO (R$)</div><div>SITUAÇÃO</div><div></div>
        </div>
        {linhas.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 10, alignItems: 'center' }}>
            <input type="month" value={l.competencia} onChange={e => updLinha(i, 'competencia', e.target.value)}
              style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
            <input value={l.valor} onChange={e => updLinha(i, 'valor', maskMoeda(e.target.value))} placeholder="0,00"
              style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
            <select value={l.situacao} onChange={e => updLinha(i, 'situacao', e.target.value)}
              style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
              <option value="pago">✅ Pago</option>
              <option value="pendente">⏳ Pendente</option>
              <option value="atraso">🔴 Em atraso</option>
            </select>
            <button onClick={() => remLinha(i)} style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        ))}
        <button onClick={addLinha} style={{ padding: '10px 20px', background: '#f8fafc', border: '2px dashed #e2e8f0', color: '#64748b', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600, width: '100%', marginTop: 8 }}>
          + Adicionar competência
        </button>
      </div>
      {salvo ? (
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '16px 24px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#16a34a' }}>✅ DAS pagos salvos!</div>
      ) : (
        <button onClick={salvar} disabled={salvando} style={{ width: '100%', padding: '14px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          {salvando ? 'Salvando...' : '💾 Salvar DAS no sistema'}
        </button>
      )}
    </div>
  )
}