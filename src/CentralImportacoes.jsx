import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

// ─── PARSERS ────────────────────────────────────────────────────────────────

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

function parseDCTFWeb(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const get = (tag) => doc.querySelector(tag)?.textContent || ''
  const competencia = get('periodoApuracao') || get('competencia') || get('dtInicio') || ''
  const cnpj = get('cnpj') || get('CNPJ') || ''
  const totalDebito = parseFloat(get('totalDebito') || get('vTotalDebitos') || 0)
  const totalCredito = parseFloat(get('totalCredito') || get('vTotalCreditos') || 0)
  const totalRecolher = parseFloat(get('totalRecolher') || get('vTotalRecolher') || 0)
  return {
    competencia: competencia.slice(0, 7),
    cnpj, totalDebito, totalCredito, totalRecolher,
    valido: !!competencia,
  }
}

function parseSPED(txtStr, tipo) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const result = {
    tipo, registros: {}, competencia: '', cnpj: '', razaoSocial: '',
    totalReceita: 0, totalPIS: 0, totalCOFINS: 0, totalICMS: 0, totalIPI: 0,
    totalEntradas: 0, totalSaidas: 0, linhasLidas: linhas.length, valido: false,
  }

  linhas.forEach(linha => {
    const campos = linha.split('|').filter((_, i) => i > 0)
    const reg = campos[0]
    if (!result.registros[reg]) result.registros[reg] = 0
    result.registros[reg]++

    if (reg === '0000') {
      result.cnpj = campos[5] || ''
      result.razaoSocial = campos[6] || ''
      const dtIni = campos[2] || ''
      result.competencia = dtIni ? `${dtIni.slice(4,8)}-${dtIni.slice(2,4)}` : ''
      result.valido = true
    }
    if (reg === 'C100') {
      const ind = campos[1] || ''
      const vDoc = parseFloat(campos[10] || 0)
      if (ind === '0') result.totalEntradas += vDoc
      if (ind === '1') result.totalSaidas += vDoc
    }
    if (reg === 'E110') result.totalICMS += parseFloat(campos[12] || 0)
    if (reg === 'E520') result.totalIPI += parseFloat(campos[4] || 0)
    if (reg === 'M200') result.totalPIS += parseFloat(campos[1] || 0)
    if (reg === 'M600') result.totalCOFINS += parseFloat(campos[1] || 0)
    if (reg === 'C180') result.totalReceita += parseFloat(campos[3] || 0)
  })

  return result
}

function parseECDECF(txtStr, tipo) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const result = {
    tipo, competencia: '', cnpj: '', razaoSocial: '',
    totalAtivo: 0, totalPassivo: 0, totalReceita: 0, totalDespesa: 0,
    lucroLiquido: 0, irpj: 0, csll: 0,
    linhasLidas: linhas.length, registros: {}, valido: false,
  }

  linhas.forEach(linha => {
    const campos = linha.split('|').filter((_, i) => i > 0)
    const reg = campos[0]
    if (!result.registros[reg]) result.registros[reg] = 0
    result.registros[reg]++

    if (reg === '0000') {
      result.cnpj = campos[5] || campos[4] || ''
      result.razaoSocial = campos[6] || campos[5] || ''
      const dtIni = campos[2] || ''
      result.competencia = dtIni ? `${dtIni.slice(4,8)}-${dtIni.slice(2,4)}` : ''
      result.valido = true
    }
    if (reg === 'I050') {
      const val = parseFloat(campos[3] || 0)
      const conta = campos[1] || ''
      if (conta.startsWith('1')) result.totalAtivo += val
      if (conta.startsWith('2') || conta.startsWith('3')) result.totalPassivo += val
      if (conta.startsWith('3') || conta.startsWith('4')) result.totalReceita += val
      if (conta.startsWith('5') || conta.startsWith('6')) result.totalDespesa += val
    }
    if (reg === 'P100') result.lucroLiquido += parseFloat(campos[6] || 0)
    if (reg === 'P150') {
      result.irpj += parseFloat(campos[3] || 0)
      result.csll += parseFloat(campos[4] || 0)
    }
  })

  return result
}

function parseExtratoDébitos(txtStr) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const debitos = []
  let totalDebito = 0, cnpj = '', razaoSocial = ''

  linhas.forEach(linha => {
    // Tenta extrair CNPJ
    const cnpjMatch = linha.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
    if (cnpjMatch && !cnpj) cnpj = cnpjMatch[0]

    // Tenta extrair valores monetários e tributos
    const valorMatch = linha.match(/R?\$?\s*([\d.,]+)/)
    if (valorMatch) {
      const valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) || 0
      if (valor > 0 && valor < 999999999) {
        const tributo = linha.includes('IRPJ') ? 'IRPJ'
          : linha.includes('CSLL') ? 'CSLL'
          : linha.includes('PIS') ? 'PIS'
          : linha.includes('COFINS') ? 'COFINS'
          : linha.includes('INSS') ? 'INSS'
          : linha.includes('DAS') ? 'DAS'
          : linha.includes('ISS') ? 'ISS'
          : linha.includes('ICMS') ? 'ICMS'
          : 'Tributo não identificado'

        const situacao = linha.toLowerCase().includes('parcel') ? 'Parcelado'
          : linha.toLowerCase().includes('inscrit') ? 'Dívida Ativa'
          : linha.toLowerCase().includes('suspens') ? 'Suspenso'
          : 'Em aberto'

        debitos.push({ tributo, valor, situacao, linha: linha.slice(0, 80) })
        totalDebito += valor
      }
    }
  })

  return { cnpj, razaoSocial, debitos, totalDebito, linhasLidas: linhas.length, valido: debitos.length > 0 }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

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

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtCNPJ = v => v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')

// ─── ABAS ───────────────────────────────────────────────────────────────────

const ABAS = [
  { id: 'nfe',     icon: '🧾', label: 'XML NF-e em lote',          tipo: 'xml' },
  { id: 'pgdas',   icon: '📋', label: 'PGDAS-D (Simples)',          tipo: 'xml' },
  { id: 'das',     icon: '💳', label: 'DAS Pagos',                  tipo: 'manual' },
  { id: 'dctfweb', icon: '📑', label: 'DCTFWeb',                    tipo: 'xml' },
  { id: 'sped_f',  icon: '📂', label: 'SPED Fiscal',                tipo: 'txt' },
  { id: 'sped_c',  icon: '📂', label: 'SPED Contribuições',         tipo: 'txt' },
  { id: 'ecd',     icon: '📊', label: 'ECD',                        tipo: 'txt' },
  { id: 'ecf',     icon: '📈', label: 'ECF',                        tipo: 'txt' },
  { id: 'debitos', icon: '⚠️', label: 'Extrato de Débitos',         tipo: 'txt' },
]

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────

export default function CentralImportacoes({ abaInicial = 'nfe' }) {
  const [aba, setAba] = useState(abaInicial)

  useEffect(() => { setAba(abaInicial) }, [abaInicial])
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
              { valor: 'XML NF-e', label: 'Importação em lote',      cor: '#4ade80' },
              { valor: 'PGDAS-D',  label: 'Simples Nacional',         cor: '#60a5fa' },
              { valor: 'SPED',     label: 'Fiscal e Contribuições',   cor: '#fbbf24' },
              { valor: 'Auto',     label: 'Preenchimento automático', cor: '#f472b6' },
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
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: `2px solid ${aba === a.id ? '#1e3a5f' : '#e2e8f0'}`,
              background: aba === a.id ? '#1e3a5f' : '#fff',
              color: aba === a.id ? '#fff' : '#374151',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span>{a.icon}</span><span>{a.label}</span>
            <span style={{ fontSize: 10, background: a.tipo === 'xml' ? '#dbeafe' : a.tipo === 'txt' ? '#fef3c7' : '#f1f5f9', color: a.tipo === 'xml' ? '#1e40af' : a.tipo === 'txt' ? '#92400e' : '#64748b', padding: '1px 6px', borderRadius: 99 }}>
              {a.tipo === 'manual' ? 'manual' : a.tipo.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {!clienteId ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um cliente para começar</div>
        </div>
      ) : aba === 'nfe'     ? <AbaXMLNFe clienteId={clienteId} cliente={cliente} />
        : aba === 'pgdas'   ? <AbaPGDAS clienteId={clienteId} cliente={cliente} />
        : aba === 'das'     ? <AbaDAS clienteId={clienteId} />
        : aba === 'dctfweb' ? <AbaDCTFWeb clienteId={clienteId} cliente={cliente} />
        : aba === 'sped_f'  ? <AbaSPED clienteId={clienteId} cliente={cliente} tipo="SPED Fiscal" />
        : aba === 'sped_c'  ? <AbaSPED clienteId={clienteId} cliente={cliente} tipo="SPED Contribuições" />
        : aba === 'ecd'     ? <AbaECDECF clienteId={clienteId} cliente={cliente} tipo="ECD" />
        : aba === 'ecf'     ? <AbaECDECF clienteId={clienteId} cliente={cliente} tipo="ECF" />
        : aba === 'debitos' ? <AbaDebitos clienteId={clienteId} cliente={cliente} />
        : null}
    </div>
  )
}

// ─── ABA NF-e ───────────────────────────────────────────────────────────────

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
      if (!f.name.endsWith('.xml')) { novosErros.push(`${f.name}: não é XML`); pendentes--; if (!pendentes) { setNfes(p => [...p, ...novos]); setErros(p => [...p, ...novosErros]) }; return }
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
          cliente_id: clienteId, competencia: comp.competencia, tributo: 'NF-e importada',
          receita_bruta: comp.vNF, tributo_pago: comp.vICMS + comp.vPIS + comp.vCOFINS + comp.vISS,
          tributo_devido: comp.vICMS + comp.vPIS + comp.vCOFINS + comp.vISS, credito: 0, tipo_oportunidade: '', risco: 'baixo',
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true)
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); processarArquivos(e.dataTransfer.files) }}
        onClick={() => inputRef.current.click()}
        style={{ background: dragOver ? '#eff6ff' : '#f8fafc', border: `3px dashed ${dragOver ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 16, padding: '48px 32px', textAlign: 'center', cursor: 'pointer', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>Arraste os XMLs de NF-e aqui</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>ou clique para selecionar — múltiplos arquivos permitidos</div>
        <div style={{ display: 'inline-block', padding: '10px 24px', background: '#1e3a5f', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>📂 Selecionar XMLs</div>
        <input ref={inputRef} type="file" accept=".xml" multiple style={{ display: 'none' }} onChange={e => processarArquivos(e.target.files)} />
      </div>
      {erros.length > 0 && <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>⚠️ {erros.length} arquivo(s) com erro:</div>
        {erros.map((e, i) => <div key={i} style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>• {e}</div>)}
      </div>}
      {nfes.length > 0 && <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'NF-e lidas', valor: nfes.length, cor: '#1e3a5f' },
            { label: 'Faturamento', valor: fmtR(nfes.reduce((s, n) => s + n.vNF, 0)), cor: '#16a34a' },
            { label: 'ICMS total', valor: fmtR(nfes.reduce((s, n) => s + n.vICMS, 0)), cor: '#d97706' },
            { label: 'PIS+COFINS', valor: fmtR(nfes.reduce((s, n) => s + n.vPIS + n.vCOFINS, 0)), cor: '#7c3aed' },
          ].map((c, i) => <div key={i} style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.cor }}>{c.valor}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
          </div>)}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>📊 Agrupado por competência ({agrupadas.length} meses)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f8fafc' }}>{['Competência','NF-e','Faturamento','ICMS','PIS','COFINS','ISS'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
            <tbody>{agrupadas.map((c, i) => <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1e3a5f' }}>{c.competencia}</td>
              <td style={{ padding: '10px 16px', color: '#64748b' }}>{c.qtd}</td>
              <td style={{ padding: '10px 16px', fontWeight: 600, color: '#16a34a' }}>{fmtR(c.vNF)}</td>
              <td style={{ padding: '10px 16px' }}>{fmtR(c.vICMS)}</td>
              <td style={{ padding: '10px 16px' }}>{fmtR(c.vPIS)}</td>
              <td style={{ padding: '10px 16px' }}>{fmtR(c.vCOFINS)}</td>
              <td style={{ padding: '10px 16px' }}>{fmtR(c.vISS)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {salvo ? <Salvo /> : <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { setNfes([]); setErros([]) }} style={btnCinza}>🗑️ Limpar</button>
          <button onClick={salvarEntradas} disabled={salvando} style={{ ...btnPrimario, flex: 1 }}>{salvando ? 'Salvando...' : '💾 Salvar entradas no sistema'}</button>
        </div>}
      </div>}
    </div>
  )
}

// ─── ABA PGDAS ──────────────────────────────────────────────────────────────

function AbaPGDAS({ clienteId, cliente }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => {
      const r = parsePGDAS(e.target.result)
      if (r.valido) setDados(r)
      else setErro('XML não reconhecido como PGDAS-D.')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo: 'DAS', receita_bruta: dados.receitaBruta, tributo_pago: dados.dasDevido, tributo_devido: dados.dasDevido, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true)
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="📋" titulo="Importar PGDAS-D em XML" sub="Selecione o arquivo XML exportado do portal do Simples Nacional" accept=".xml" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 20 }}>✅ PGDAS-D lido com sucesso</div>
        <GridCards items={[
          { label: 'Competência', valor: dados.competencia },
          { label: 'CNPJ', valor: dados.cnpj ? fmtCNPJ(dados.cnpj) : '—' },
          { label: 'Razão Social', valor: dados.razaoSocial || cliente?.razao_social || '—' },
          { label: 'Receita Bruta', valor: fmtR(dados.receitaBruta) },
          { label: 'DAS Devido', valor: fmtR(dados.dasDevido) },
          { label: 'Alíquota Efetiva', valor: dados.aliquota ? `${dados.aliquota.toFixed(2)}%` : '—' },
        ]} />
      </div>
      {salvo ? <Salvo /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
    </div>}
  </AbaUpload>
}

// ─── ABA DAS ────────────────────────────────────────────────────────────────

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
        await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: l.competencia, tributo: 'DAS', receita_bruta: 0, tributo_pago: parseFloat(l.valor.replace(/\./g, '').replace(',', '.')) || 0, tributo_devido: parseFloat(l.valor.replace(/\./g, '').replace(',', '.')) || 0, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true)
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <div>
    <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 }}>💳 Registrar DAS Pagos</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
        <div>COMPETÊNCIA</div><div>VALOR PAGO (R$)</div><div>SITUAÇÃO</div><div></div>
      </div>
      {linhas.map((l, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 10, alignItems: 'center' }}>
        <input type="month" value={l.competencia} onChange={e => updLinha(i, 'competencia', e.target.value)} style={inputStyle} />
        <input value={l.valor} onChange={e => updLinha(i, 'valor', maskMoeda(e.target.value))} placeholder="0,00" style={inputStyle} />
        <select value={l.situacao} onChange={e => updLinha(i, 'situacao', e.target.value)} style={inputStyle}>
          <option value="pago">✅ Pago</option>
          <option value="pendente">⏳ Pendente</option>
          <option value="atraso">🔴 Em atraso</option>
        </select>
        <button onClick={() => remLinha(i)} style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>✕</button>
      </div>)}
      <button onClick={addLinha} style={{ padding: '10px 20px', background: '#f8fafc', border: '2px dashed #e2e8f0', color: '#64748b', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600, width: '100%', marginTop: 8 }}>+ Adicionar competência</button>
    </div>
    {salvo ? <Salvo /> : <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, width: '100%' }}>{salvando ? 'Salvando...' : '💾 Salvar DAS no sistema'}</button>}
  </div>
}

// ─── ABA DCTFWeb ────────────────────────────────────────────────────────────

function AbaDCTFWeb({ clienteId, cliente }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => {
      const r = parseDCTFWeb(e.target.result)
      if (r.valido) setDados(r)
      else setErro('Arquivo não reconhecido como DCTFWeb. Verifique se é o XML correto.')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo: 'DCTFWeb', receita_bruta: 0, tributo_pago: dados.totalRecolher, tributo_devido: dados.totalDebito, credito: Math.max(0, dados.totalCredito - dados.totalDebito), tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true)
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="📑" titulo="Importar DCTFWeb em XML" sub="Selecione o arquivo XML da DCTFWeb exportado do e-CAC" accept=".xml" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 20 }}>✅ DCTFWeb lida com sucesso</div>
        <GridCards items={[
          { label: 'Competência', valor: dados.competencia },
          { label: 'CNPJ', valor: dados.cnpj ? fmtCNPJ(dados.cnpj) : (cliente?.cnpj || '—') },
          { label: 'Total Débitos', valor: fmtR(dados.totalDebito) },
          { label: 'Total Créditos', valor: fmtR(dados.totalCredito) },
          { label: 'Total a Recolher', valor: fmtR(dados.totalRecolher) },
          { label: 'Saldo', valor: fmtR(dados.totalCredito - dados.totalDebito) },
        ]} />
      </div>
      {salvo ? <Salvo /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
    </div>}
  </AbaUpload>
}

// ─── ABA SPED ───────────────────────────────────────────────────────────────

function AbaSPED({ clienteId, cliente, tipo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => {
      const r = parseSPED(e.target.result, tipo)
      if (r.valido) setDados(r)
      else setErro(`Arquivo não reconhecido como ${tipo}. Verifique se é o arquivo TXT correto.`)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      const tributo = tipo === 'SPED Fiscal' ? 'ICMS' : 'PIS/COFINS'
      const pago = tipo === 'SPED Fiscal' ? dados.totalICMS : dados.totalPIS + dados.totalCOFINS
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo, receita_bruta: dados.totalSaidas, tributo_pago: pago, tributo_devido: pago, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true)
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  const isFiscal = tipo === 'SPED Fiscal'

  return <AbaUpload icon="📂" titulo={`Importar ${tipo}`} sub={`Selecione o arquivo TXT do ${tipo} — gerado pelo SPED`} accept=".txt" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>✅ {tipo} lido com sucesso</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{dados.linhasLidas.toLocaleString()} linhas processadas · {Object.keys(dados.registros).length} tipos de registro</div>
        <GridCards items={[
          { label: 'Competência', valor: dados.competencia || '—' },
          { label: 'CNPJ', valor: dados.cnpj ? fmtCNPJ(dados.cnpj) : (cliente?.cnpj || '—') },
          { label: 'Razão Social', valor: dados.razaoSocial || cliente?.razao_social || '—' },
          { label: 'Total Entradas', valor: fmtR(dados.totalEntradas) },
          { label: 'Total Saídas', valor: fmtR(dados.totalSaidas) },
          isFiscal
            ? { label: 'ICMS Total', valor: fmtR(dados.totalICMS) }
            : { label: 'PIS Total', valor: fmtR(dados.totalPIS) },
          isFiscal
            ? { label: 'IPI Total', valor: fmtR(dados.totalIPI) }
            : { label: 'COFINS Total', valor: fmtR(dados.totalCOFINS) },
        ]} />

        {/* Registros encontrados */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>📋 Registros encontrados:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(dados.registros).map(([reg, qtd]) => (
              <span key={reg} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                {reg}: {qtd}
              </span>
            ))}
          </div>
        </div>
      </div>
      {salvo ? <Salvo /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
    </div>}
  </AbaUpload>
}

// ─── ABA ECD/ECF ────────────────────────────────────────────────────────────

function AbaECDECF({ clienteId, cliente, tipo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => {
      const r = parseECDECF(e.target.result, tipo)
      if (r.valido) setDados(r)
      else setErro(`Arquivo não reconhecido como ${tipo}. Verifique se é o arquivo TXT correto.`)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      const tributo = tipo === 'ECF' ? 'IRPJ/CSLL' : 'ECD'
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo, receita_bruta: dados.totalReceita, tributo_pago: dados.irpj + dados.csll, tributo_devido: dados.irpj + dados.csll, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true)
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  const isECF = tipo === 'ECF'

  return <AbaUpload icon={isECF ? '📈' : '📊'} titulo={`Importar ${tipo}`} sub={`Selecione o arquivo TXT do ${tipo} gerado pelo SPED`} accept=".txt" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>✅ {tipo} lido com sucesso</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{dados.linhasLidas.toLocaleString()} linhas processadas</div>
        <GridCards items={[
          { label: 'Competência', valor: dados.competencia || '—' },
          { label: 'CNPJ', valor: dados.cnpj ? fmtCNPJ(dados.cnpj) : (cliente?.cnpj || '—') },
          { label: 'Razão Social', valor: dados.razaoSocial || cliente?.razao_social || '—' },
          { label: 'Total Ativo', valor: fmtR(dados.totalAtivo) },
          { label: 'Total Passivo', valor: fmtR(dados.totalPassivo) },
          { label: 'Total Receita', valor: fmtR(dados.totalReceita) },
          isECF ? { label: 'IRPJ', valor: fmtR(dados.irpj) } : { label: 'Total Despesa', valor: fmtR(dados.totalDespesa) },
          isECF ? { label: 'CSLL', valor: fmtR(dados.csll) } : { label: 'Lucro Líquido', valor: fmtR(dados.lucroLiquido) },
        ]} />
      </div>
      {salvo ? <Salvo /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
    </div>}
  </AbaUpload>
}

// ─── ABA DÉBITOS ────────────────────────────────────────────────────────────

function AbaDebitos({ clienteId, cliente }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => {
      const r = parseExtratoDébitos(e.target.result)
      if (r.valido) setDados(r)
      else setErro('Nenhum débito identificado no arquivo. Verifique se é o extrato correto da Receita Federal.')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      for (const d of dados.debitos) {
        await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: new Date().toISOString().slice(0, 7), tributo: d.tributo, receita_bruta: 0, tributo_pago: 0, tributo_devido: d.valor, credito: 0, tipo_oportunidade: 'Débito em aberto', risco: 'alto' }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true)
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="⚠️" titulo="Importar Extrato de Débitos" sub="Selecione o arquivo TXT ou CSV exportado do e-CAC / PGFN" accept=".txt,.csv" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #fecdd3', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⚠️ {dados.debitos.length} débito(s) identificado(s)</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Total: {fmtR(dados.totalDebito)} · {dados.linhasLidas} linhas lidas</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dados.debitos.map((d, i) => (
            <div key={i} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{d.tributo}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{d.situacao}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{fmtR(d.valor)}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff1f2', border: '2px solid #fecdd3', borderRadius: 10, padding: '14px 18px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#9f1239' }}>TOTAL DE DÉBITOS</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{fmtR(dados.totalDebito)}</span>
        </div>
      </div>
      {salvo ? <Salvo /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
    </div>}
  </AbaUpload>
}

// ─── COMPONENTES AUXILIARES ─────────────────────────────────────────────────

function AbaUpload({ icon, titulo, sub, accept, onFile, inputRef, erro, children }) {
  const [dragOver, setDragOver] = useState(false)
  return <div>
    <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]) }}
      onClick={() => inputRef.current.click()}
      style={{ background: dragOver ? '#eff6ff' : '#f8fafc', border: `3px dashed ${dragOver ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 16, padding: '40px 32px', textAlign: 'center', cursor: 'pointer', marginBottom: 24 }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{sub}</div>
      <div style={{ display: 'inline-block', padding: '10px 24px', background: '#1e3a5f', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>📂 Selecionar arquivo</div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }} />
    </div>
    {erro && <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '14px 20px', marginBottom: 20, color: '#dc2626', fontSize: 14, fontWeight: 600 }}>⚠️ {erro}</div>}
    {children}
  </div>
}

function GridCards({ items }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
    {items.map((c, i) => <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{c.valor}</div>
    </div>)}
  </div>
}

function BotoesAcao({ onLimpar, onSalvar, salvando }) {
  return <div style={{ display: 'flex', gap: 12 }}>
    <button onClick={onLimpar} style={btnCinza}>🗑️ Limpar</button>
    <button onClick={onSalvar} disabled={salvando} style={{ ...btnPrimario, flex: 1 }}>{salvando ? 'Salvando...' : '💾 Salvar no sistema'}</button>
  </div>
}

function Salvo() {
  return <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '16px 24px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#16a34a' }}>✅ Dados salvos com sucesso!</div>
}

const btnPrimario = { padding: '13px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }
const btnCinza = { padding: '13px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const inputStyle = { padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }