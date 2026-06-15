import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const REGIME_DOCS = {
  'Simples Nacional': ['Extratos do PGDAS-D','Recibos de transmissão PGDAS-D','DEFIS','DAS pagos','Relação de receitas segregadas por anexo','Receitas com substituição tributária','Receitas monofásicas','Receitas com retenção','Receitas de exportação','Notas fiscais de entrada','Notas fiscais de saída','XMLs de NF-e/NFS-e/NFC-e','Relatório de faturamento mensal','Extrato do Simples Nacional','Consulta de débitos','Comprovantes de pagamento'],
  'Lucro Presumido': ['DCTF','ECF','ECD','SPED Fiscal','SPED Contribuições','Livro Caixa','NFs de entrada e saída','Comprovantes IRPJ','Comprovantes CSLL','Comprovantes PIS/COFINS','DARF originais','Relatório de faturamento','Contratos de prestação de serviços','Balancetes mensais','Consulta de débitos','Certidões negativas'],
  'Lucro Real': ['ECF','ECD','SPED Fiscal','SPED Contribuições','LALUR','LACS','DCTF','NFs de entrada e saída','Controles de créditos PIS/COFINS','Relatório de estoques','Ativos imobilizados','Contratos relevantes','Comprovantes de pagamentos','Balancetes mensais','Consulta de débitos','Certidões negativas'],
}

const CLIENTE_VAZIO = {razao_social:'',cnpj:'',cnae_principal:'',municipio:'',uf:'',regime:'Simples Nacional',competencia_inicio:'',competencia_fim:'',responsavel_contabil:'',observacoes:''}
const maskCNPJ = v => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2')
const maskIE = v => v.replace(/[^0-9A-Za-z.\-\/]/g,'').slice(0,20)
const maskIM = v => v.replace(/[^0-9.\-\/]/g,'').slice(0,15)
const maskCNAE = v => v.replace(/\D/g,'').slice(0,7).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{2})(\d)/,'$1-$2').replace(/(\d{1})(\d)/,'$1-$2')
const maskCNAES = v => v.split(',').map(c => maskCNAE(c.trim())).join(', ')

export default function Dashboard({ nomeUsuario, onLogout, onAdmin }) {
  const [page, setPage] = useState('painel')
  const [clientes, setClientes] = useState([])
  const [entradas, setEntradas] = useState({})
  const [checklist, setChecklist] = useState({})
  const [activeId, setActiveId] = useState(null)
  const [calcTab, setCalcTab] = useState('fator-r')
  const [calcResult, setCalcResult] = useState('')
  const [novoCliente, setNovoCliente] = useState(null)
  const [novaEntrada, setNovaEntrada] = useState({competencia:'',tributo:'',receita_bruta:'',tributo_pago:'',tributo_devido:'',tipo_oportunidade:'',risco:'baixo'})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Carrega clientes do Supabase ao iniciar
  useEffect(() => {
    carregarClientes()
  }, [])

  async function carregarClientes() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('usuario_id', user.id)
      .order('id', { ascending: false })
    if (!error && data) {
      setClientes(data)
      if (data.length > 0) setActiveId(data[0].id)
      // Carrega entradas de todos os clientes
      const ids = data.map(c => c.id)
      if (ids.length > 0) {
        const { data: ents } = await supabase
          .from('entradas')
          .select('*')
          .in('cliente_id', ids)
        if (ents) {
          const map = {}
          ents.forEach(e => {
            if (!map[e.cliente_id]) map[e.cliente_id] = []
            map[e.cliente_id].push(e)
          })
          setEntradas(map)
        }
      }
    }
    setLoading(false)
  }

  async function salvarCliente() {
    if (!novoCliente) return
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (novoCliente.id) {
      // Editar existente
      const { error } = await supabase
        .from('clientes')
        .update({
          razao_social: novoCliente.razao_social,
          nome_fantasia: novoCliente.nome_fantasia || '',
          cnpj: novoCliente.cnpj,
          cnae_principal: novoCliente.cnae_principal,
          cnaes_secundarios: novoCliente.cnaes_secundarios || '',
          inscricao_estadual: novoCliente.inscricao_estadual || '',
          inscricao_municipal: novoCliente.inscricao_municipal || '',
          municipio: novoCliente.municipio,
          uf: novoCliente.uf,
          regime: novoCliente.regime,
          competencia_inicio: novoCliente.competencia_inicio,
          competencia_fim: novoCliente.competencia_fim,
          responsavel_contabil: novoCliente.responsavel_contabil,
          observacoes: novoCliente.observacoes,
        })
        .eq('id', novoCliente.id)
      if (!error) {
        setClientes(clientes.map(c => c.id === novoCliente.id ? { ...c, ...novoCliente } : c))
      } else {
        alert('Erro ao salvar: ' + error.message)
      }
    } else {
      // Novo cliente
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          usuario_id: user.id,
          razao_social: novoCliente.razao_social,
          nome_fantasia: novoCliente.nome_fantasia || '',
          cnpj: novoCliente.cnpj,
          cnae_principal: novoCliente.cnae_principal,
          cnaes_secundarios: novoCliente.cnaes_secundarios || '',
          inscricao_estadual: novoCliente.inscricao_estadual || '',
          inscricao_municipal: novoCliente.inscricao_municipal || '',
          municipio: novoCliente.municipio,
          uf: novoCliente.uf,
          regime: novoCliente.regime,
          competencia_inicio: novoCliente.competencia_inicio,
          competencia_fim: novoCliente.competencia_fim,
          responsavel_contabil: novoCliente.responsavel_contabil,
          observacoes: novoCliente.observacoes,
          status: 'Em análise',
        }])
        .select()
      if (!error && data) {
        setClientes([data[0], ...clientes])
        setActiveId(data[0].id)
        setEntradas({ ...entradas, [data[0].id]: [] })
      } else {
        alert('Erro ao salvar: ' + error.message)
      }
    }
    setSalvando(false)
    setPage('clientes')
  }

  async function adicionarEntrada() {
    const credito = (parseFloat(novaEntrada.tributo_pago) || 0) - (parseFloat(novaEntrada.tributo_devido) || 0)
    const { data, error } = await supabase
      .from('entradas')
      .insert([{
        cliente_id: activeId,
        competencia: novaEntrada.competencia,
        tributo: novaEntrada.tributo,
        receita_bruta: parseFloat(novaEntrada.receita_bruta) || 0,
        tributo_pago: parseFloat(novaEntrada.tributo_pago) || 0,
        tributo_devido: parseFloat(novaEntrada.tributo_devido) || 0,
        credito: credito < 0 ? 0 : credito,
        tipo_oportunidade: novaEntrada.tipo_oportunidade,
        risco: novaEntrada.risco,
      }])
      .select()
    if (!error && data) {
      setEntradas({ ...entradas, [activeId]: [...(entradas[activeId] || []), data[0]] })
      setNovaEntrada({ competencia: '', tributo: '', receita_bruta: '', tributo_pago: '', tributo_devido: '', tipo_oportunidade: '', risco: 'baixo' })
    } else {
      alert('Erro ao salvar entrada: ' + error.message)
    }
  }

  function toggleCheck(idx) {
    const key = activeId
    const arr = checklist[key] || (REGIME_DOCS[active?.regime] || []).map(() => false)
    const novo = [...arr]; novo[idx] = !novo[idx]
    setChecklist({ ...checklist, [key]: novo })
  }

  const active = clientes.find(c => c.id === activeId) || clientes[0]
  const ents = entradas[activeId] || []
  const totalPot = ents.reduce((s, e) => s + (e.credito || 0), 0)
  const totalGeral = clientes.reduce((s, c) => { const ee = entradas[c.id] || []; return s + ee.reduce((a, e) => a + (e.credito || 0), 0) }, 0)
  const totalOpp = clientes.reduce((s, c) => (entradas[c.id] || []).length + s, 0)
  const hoje = new Date()
  const criticos = clientes.reduce((s, c) => {
    return s + (entradas[c.id] || []).filter(e => {
      const [a, m] = e.competencia.split('-');
      const lim = new Date(parseInt(a) + 5, parseInt(m) - 1, 1);
      return (lim - hoje) / (1000 * 60 * 60 * 24 * 365) <= 1 && e.credito > 0;
    }).length
  }, 0)

  const docs = REGIME_DOCS[active?.regime] || []
  const checks = checklist[activeId] || docs.map(() => false)
  const done = checks.filter(Boolean).length
  const pct = docs.length ? Math.round(done / docs.length * 100) : 0

  const navItem = (id, icon, label) => (
    <div onClick={() => {
      if (id === 'novo-cliente') setNovoCliente({ ...CLIENTE_VAZIO })
      setPage(id)
    }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: page === id ? '#1e3a5f' : '#475569', cursor: 'pointer', borderLeft: `3px solid ${page === id ? '#1e3a5f' : 'transparent'}`, background: page === id ? '#eff6ff' : 'transparent', fontWeight: page === id ? 600 : 400 }}>
      <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>{label}
    </div>
  )

  const badge = (regime) => {
    const colors = { 'Simples Nacional': '#dbeafe|#1e40af', 'Lucro Presumido': '#fef3c7|#92400e', 'Lucro Real': '#dcfce7|#166534' }
    const [bg, color] = (colors[regime] || '#f1f5f9|#475569').split('|')
    return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>• {regime}</span>
  }

  const riskBadge = r => {
    const c = r === 'baixo' ? '#dcfce7|#166534' : r === 'medio' ? '#fef9c3|#854d0e' : '#fee2e2|#991b1b'
    const [bg, color] = c.split('|')
    return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{r}</span>
  }

  // CALCULADORAS
  const [cFolha, setCFolha] = useState(''); const [cRb, setCRb] = useState('')
  const [cRbt12, setCRbt12] = useState(''); const [cRmes, setCRmes] = useState('')
  const [cFat, setCFat] = useState(''); const [cMarg, setCMarg] = useState(''); const [cAtv, setCAtv] = useState('comercio')
  const [cRbt, setCRbt] = useState(''); const [cAtv2, setCAtv2] = useState('8')
  const [cDtpag, setCDtpag] = useState('')

  function calcFatorR() { const f = parseFloat(cFolha) || 0; const r = parseFloat(cRb) || 1; const fr = f / r; setCalcResult(`Fator R: ${(fr * 100).toFixed(2)}% — Anexo ${fr >= 0.28 ? 'III (menor carga)' : 'V (maior carga)'}\n${fr >= 0.28 ? '✅ Enquadrado no Anexo III.' : '⚠️ Anexo V — considere aumentar folha.'}`) }
  function calcDAS() { const rbt = parseFloat(cRbt12) || 0; const rm = parseFloat(cRmes) || 0; let aliq = 4, ded = 0; if (rbt > 180000) { aliq = 7.3; ded = 5940 } if (rbt > 360000) { aliq = 9.5; ded = 13860 } if (rbt > 720000) { aliq = 10.7; ded = 22500 } if (rbt > 1800000) { aliq = 14.3; ded = 87300 } if (rbt > 3600000) { aliq = 19; ded = 378000 } const ef = Math.max(0, ((rbt * (aliq / 100)) - ded) / rbt * 100); setCalcResult(`DAS estimado: ${fmtR(rm * (ef / 100))}\nAlíquota efetiva: ${ef.toFixed(2)}%`) }
  function calcRegime() { const f = parseFloat(cFat) || 0; const m = parseFloat(cMarg) || 0; const l = f * (m / 100); const sn = f * 0.12; const lp = (f * 0.0365) + (f * (cAtv === 'servicos' ? 0.32 : 0.08) * 0.15) + (f * (cAtv === 'servicos' ? 0.32 : 0.12) * 0.09); const lr = (l * 0.34) + (f * 0.0365); setCalcResult(`Simples Nacional: ${fmtR(sn)} (${(sn / f * 100).toFixed(1)}%)\nLucro Presumido: ${fmtR(lp)} (${(lp / f * 100).toFixed(1)}%)\nLucro Real: ${fmtR(lr)} (${(lr / f * 100).toFixed(1)}%)`) }
  function calcIRPJ() { const rb = parseFloat(cRbt) || 0; const p = parseFloat(cAtv2) || 8; const bi = rb * (p / 100); const bc = rb * (p === 32 ? 32 : p === 16 ? 16 : 12) / 100; const irpj = bi * 0.15 + Math.max(0, (bi - 60000) * 0.10); const csll = bc * 0.09; setCalcResult(`IRPJ: ${fmtR(irpj)}\nCSLL: ${fmtR(csll)}\nTotal: ${fmtR(irpj + csll)}`) }
  function calcPrescricao() { if (!cDtpag) { setCalcResult('Informe a data.'); return } const p = new Date(cDtpag); const l = new Date(p); l.setFullYear(l.getFullYear() + 5); const dias = Math.round((l - hoje) / (1000 * 60 * 60 * 24)); if (dias < 0) { setCalcResult(`⚠️ PRAZO PRESCRITO em ${l.toLocaleDateString('pt-BR')}!`) } else { setCalcResult(`Prazo limite: ${l.toLocaleDateString('pt-BR')}\nDias restantes: ${dias}\n${dias <= 365 ? '⚠️ CRÍTICO — menos de 1 ano!' : '✅ Prazo confortável.'}`) } }

  const inp = (val, set, ph, tp = 'text') => (
    <input value={val} onChange={e => set(e.target.value)} placeholder={ph} type={tp}
      style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
  )
  const sel = (val, set, opts) => (
    <select value={val} onChange={e => set(e.target.value)}
      style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: '100%' }}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter,system-ui,sans-serif', fontSize: 16, color: '#1e3a5f' }}>
      Carregando clientes...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', height: 52, flexShrink: 0, gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>🏛 FiscalTrib</span>
        <span style={{ fontSize: 13, color: '#9db8d8', flex: 1 }}>Sistema de diagnóstico e recuperação tributária</span>
        <span style={{ fontSize: 13, color: '#f0c040' }}>👤 {nomeUsuario || 'Usuário'}</span>
        {onAdmin && <button onClick={onAdmin} style={{ background: '#f0b429', border: 'none', color: '#0f172a', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>⚙️ Admin</button>}
        <button onClick={() => onLogout()} style={{ background: 'transparent', border: '1px solid #9db8d8', color: '#9db8d8', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Sair</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
        {/* SIDEBAR */}
        <div style={{ width: 220, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px 6px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Cliente ativo</div>
          <select value={activeId || ''} onChange={e => setActiveId(e.target.value)}
            style={{ margin: '8px 12px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: 'calc(100% - 24px)' }}>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
          </select>
          <nav>
            {navItem('painel', '📊', 'Painel')}
            {navItem('clientes', '👥', 'Clientes')}
            {navItem('novo-cliente', '➕', 'Novo cliente')}
            {navItem('checklist', '✅', 'Checklist')}
            {navItem('entrada', '📥', 'Entrada de dados')}
            {navItem('diagnostico', '🔍', 'Diagnóstico')}
            {navItem('prazos', '⏳', 'Prazos')}
            {navItem('relatorio', '📄', 'Relatório')}
            {navItem('calculadoras', '📊', 'Calculadoras')}
          </nav>
          {clientes.length === 0 && (
            <div style={{ margin: 12, padding: 10, background: '#fef9c3', borderRadius: 8, fontSize: 11, color: '#854d0e', lineHeight: 1.5 }}>
              Nenhum cliente cadastrado. Clique em <strong>Novo cliente</strong> para começar!
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '28px 32px', background: '#f0f2f5', minWidth: 0 }}>

          {/* PAINEL */}
          {page === 'painel' && <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Painel Geral</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Visão consolidada dos casos em andamento.</div>
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              ⚠️ <strong>Aviso profissional obrigatório:</strong> Esta análise é preliminar e não dispensa revisão por contador, advogado tributarista ou consultor fiscal habilitado.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24, minWidth: 0 }}>
              {[['👥', clientes.length, 'Clientes cadastrados', '#e2e8f0', '#1e293b'], ['🎯', totalOpp, 'Oportunidades mapeadas', '#ddd6fe', '#7c3aed'], [`💰`, fmtR(totalGeral), 'Valor potencial recuperável', '#bbf7d0', '#16a34a'], ['⏱️', criticos, 'Competências críticas (≤1 ano)', '#fecaca', '#dc2626']].map(([ic, v, lb, bc, vc], i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 20, border: `1.5px solid ${bc}` }}>
                  <span style={{ fontSize: 28 }}>{ic}</span>
                  <div style={{ fontSize: i === 2 ? 22 : 28, fontWeight: 700, color: vc, margin: '8px 0 4px' }}>{v}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{lb}</div>
                </div>
              ))}
            </div>
            {clientes.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 40, textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum cliente ainda</div>
                <button onClick={() => { setNovoCliente({ ...CLIENTE_VAZIO }); setPage('novo-cliente') }} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>+ Cadastrar primeiro cliente</button>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Clientes — visão rápida</span>
                  <button onClick={() => setPage('clientes')} style={{ padding: '4px 12px', border: '1.5px solid #1e3a5f', borderRadius: 6, background: '#fff', color: '#1e3a5f', fontSize: 12, cursor: 'pointer' }}>Ver todos os clientes</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f8fafc' }}>
                    {['Razão Social', 'CNPJ', 'Regime', 'Oportunidades', 'Potencial', 'Status', ''].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{clientes.map(c => {
                    const ee = entradas[c.id] || []; const tot = ee.reduce((s, e) => s + (e.credito || 0), 0)
                    return <tr key={c.id}>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{c.razao_social}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>{c.cnpj}</td>
                      <td style={{ padding: '10px 16px' }}>{badge(c.regime)}</td>
                      <td style={{ padding: '10px 16px' }}>{ee.filter(e => e.credito > 0).length}</td>
                      <td style={{ padding: '10px 16px', color: '#16a34a', fontWeight: 600 }}>{fmtR(tot)}</td>
                      <td style={{ padding: '10px 16px' }}><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>• {c.status}</span></td>
                      <td style={{ padding: '10px 16px' }}><button onClick={() => { setActiveId(c.id); setPage('diagnostico') }} style={{ padding: '4px 10px', border: '1.5px solid #1e3a5f', borderRadius: 6, background: '#fff', color: '#1e3a5f', fontSize: 12, cursor: 'pointer' }}>Ver diagnóstico</button></td>
                    </tr>
                  })}</tbody>
                </table>
              </div>
            )}
          </div>}

          {/* CLIENTES */}
          {page === 'clientes' && <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Clientes cadastrados</div>
              <button onClick={() => { setNovoCliente({ ...CLIENTE_VAZIO }); setPage('novo-cliente') }} style={{ padding: '8px 16px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Novo cliente</button>
            </div>
            {clientes.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Nenhum cliente cadastrado ainda.</div>}
            {clientes.map(c => {
              const ee = entradas[c.id] || []; const tot = ee.reduce((s, e) => s + (e.credito || 0), 0)
              return <div key={c.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{c.razao_social}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{c.cnpj} · {c.municipio}/{c.uf} · CNAE {c.cnae_principal}</div>
                    <div style={{ display: 'flex', gap: 8 }}>{badge(c.regime)}<span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>• {c.status}</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{fmtR(tot)}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>potencial recuperável</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setNovoCliente({ ...c }); setPage('novo-cliente') }} style={{ padding: '4px 10px', border: '1.5px solid #1e3a5f', borderRadius: 6, background: '#fff', color: '#1e3a5f', fontSize: 12, cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => { setActiveId(c.id); setPage('diagnostico') }} style={{ padding: '4px 10px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Diagnóstico</button>
                    </div>
                  </div>
                </div>
              </div>
            })}
          </div>}

          {/* NOVO CLIENTE */}
          {page === 'novo-cliente' && novoCliente && <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>{novoCliente.id ? 'Editar cliente' : 'Novo cliente'}</div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a5f', marginBottom: 16 }}>📋 Identificação</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[['Razão Social *', 'razao_social'], ['Nome Fantasia', 'nome_fantasia'], ['CNPJ *', 'cnpj'], ['CNAE Principal', 'cnae_principal'], ['CNAEs Secundários', 'cnaes_secundarios'], ['Inscrição Estadual', 'inscricao_estadual'], ['Inscrição Municipal', 'inscricao_municipal'], ['Município', 'municipio'], ['UF', 'uf']].map(([lb, k]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
				  <label style={{fontSize:13,fontWeight:500,color:'#374151'}}>{lb}</label>
                  <input value={novoCliente[k] || ''} onChange={e => setNovoCliente({ ...novoCliente, [k]: k==='cnpj'?maskCNPJ(e.target.value):k==='cnae_principal'?maskCNAE(e.target.value):k==='inscricao_estadual'?maskIE(e.target.value):k==='inscricao_municipal'?maskIM(e.target.value):e.target.value })} style={{padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:6,fontSize:13,width:'100%',boxSizing:'border-box'}} />  
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Regime Tributário *</label>
                  <select value={novoCliente.regime || 'Simples Nacional'} onChange={e => setNovoCliente({ ...novoCliente, regime: e.target.value })}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a5f', marginBottom: 16 }}>📅 Período de análise</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[['Responsável contábil','responsavel_contabil'],['Observações','observacoes']].map(([lb,k])=>(
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{lb}</label>
                    <input value={novoCliente[k] || ''} onChange={e => setNovoCliente({ ...novoCliente, [k]: e.target.value })}
                      style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                  </div>
                ))}
              </div>
			  <div style={{display:'flex',flexDirection:'column',gap:6}}>
  <label style={{fontSize:13,fontWeight:500,color:'#374151'}}>Competência inicial</label>
  <input type="month" value={novoCliente.competencia_inicio||''} onChange={e=>setNovoCliente({...novoCliente,competencia_inicio:e.target.value})}
    style={{padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:6,fontSize:13}} />
</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>
  <label style={{fontSize:13,fontWeight:500,color:'#374151'}}>Competência final</label>
  <input type="month" value={novoCliente.competencia_fim||''} onChange={e=>setNovoCliente({...novoCliente,competencia_fim:e.target.value})}
    style={{padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:6,fontSize:13}} />
</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={salvarCliente} disabled={salvando} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                {salvando ? '💾 Salvando...' : '💾 Salvar cliente'}
              </button>
              <button onClick={() => setPage('clientes')} style={{ padding: '10px 20px', background: '#fff', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>}

          {/* CHECKLIST */}
          {page === 'checklist' && <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Checklist documental — {active?.razao_social}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Regime: {active?.regime} · Marque os documentos já obtidos.</div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden', margin: '10px 0 6px' }}><div style={{ background: '#16a34a', height: 10, borderRadius: 99, width: pct + '%', transition: 'width .3s' }}></div></div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{done} de {docs.length} documentos obtidos — {pct}%</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
              {docs.map((d, i) => (
                <div key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: checks[i] ? '#f0fdf4' : '#fff', border: `1px solid ${checks[i] ? '#86efac' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: checks[i] ? '#166534' : '#374151' }}>
                  <input type="checkbox" checked={checks[i]} onChange={() => toggleCheck(i)} style={{ accentColor: '#16a34a', width: 16, height: 16 }} />
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setPage('entrada')} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Avançar para entrada de dados</button>
              <button onClick={() => setPage('diagnostico')} style={{ padding: '10px 20px', background: '#fff', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Ir para diagnóstico</button>
            </div>
          </div>}

          {/* ENTRADA */}
          {page === 'entrada' && <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Entrada de dados — {active?.razao_social}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Insira os dados por competência.</div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a5f', marginBottom: 16 }}>Nova competência</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {[['Competência *', 'competencia', '2022-03'], ['Receita bruta (R$)', 'receita_bruta', '0'], ['Tributo pago (R$)', 'tributo_pago', '0'], ['Tributo devido (R$)', 'tributo_devido', '0']].map(([lb, k, ph]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{lb}</label>
                    <input value={novaEntrada[k]} onChange={e => setNovaEntrada({ ...novaEntrada, [k]: e.target.value })} placeholder={ph}
                      style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Tributo *</label>
                  <select value={novaEntrada.tributo} onChange={e => setNovaEntrada({ ...novaEntrada, tributo: e.target.value })}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value=''>— Selecione —</option>
                    {['DAS', 'IRPJ', 'CSLL', 'PIS', 'COFINS', 'IRPJ/CSLL LP', 'PIS/COFINS LP', 'INSS', 'ISS', 'ICMS ST'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Tipo de oportunidade</label>
                  <select value={novaEntrada.tipo_oportunidade} onChange={e => setNovaEntrada({ ...novaEntrada, tipo_oportunidade: e.target.value })}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value=''>— Selecione —</option>
                    {['Receita monofásica tributada indevidamente', 'Substituição tributária indevida', 'Base de cálculo reduzida não aplicada', 'Isenção não aproveitada', 'Alíquota incorreta', 'Crédito não aproveitado'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Risco</label>
                  <select value={novaEntrada.risco} onChange={e => setNovaEntrada({ ...novaEntrada, risco: e.target.value })}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    <option value='baixo'>baixo</option><option value='medio'>médio</option><option value='alto'>alto</option>
                  </select>
                </div>
              </div>
              <button onClick={adicionarEntrada} style={{ marginTop: 16, padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>+ Adicionar competência</button>
            </div>
            {ents.map((e, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{e.competencia} — {e.tributo}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{e.tipo_oportunidade || 'Sem oportunidade'} · risco: {e.risco}</div>
                </div>
                <div style={{ color: '#16a34a', fontWeight: 600 }}>crédito: {fmtR(e.credito)}</div>
              </div>
            ))}
          </div>}

          {/* DIAGNÓSTICO */}
          {page === 'diagnostico' && <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Diagnóstico tributário</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{active?.razao_social} · {active?.cnpj} · {active?.regime}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPage('relatorio')} style={{ padding: '6px 14px', border: '1.5px solid #1e3a5f', borderRadius: 6, background: '#fff', color: '#1e3a5f', fontSize: 13, cursor: 'pointer' }}>📄 Ver relatório</button>
                <button onClick={() => setPage('entrada')} style={{ padding: '6px 14px', border: '1.5px solid #1e3a5f', borderRadius: 6, background: '#fff', color: '#1e3a5f', fontSize: 13, cursor: 'pointer' }}>+ Adicionar dados</button>
              </div>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
              ⚠️ <strong>Aviso profissional obrigatório:</strong> Esta análise é preliminar e não dispensa revisão por profissional habilitado.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
              {[[fmtR(totalPot), 'Total potencial recuperável', '#16a34a', '#16a34a'], [ents.filter(e => e.risco === 'baixo' && e.credito > 0).length, 'Créditos confirmados (baixo risco)', '#0d9488', '#0d9488'], [ents.filter(e => e.risco === 'medio' && e.credito > 0).length, 'Possíveis créditos (médio risco)', '#d97706', '#d97706'], [ents.filter(e => e.risco === 'alto' && e.credito > 0).length, 'Hipóteses a validar (alto risco)', '#dc2626', '#dc2626']].map(([v, lb, bc, vc], i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 20, borderTop: `4px solid ${bc}` }}>
                  <div style={{ fontSize: i === 0 ? 20 : 26, fontWeight: 700, color: vc, marginBottom: 4 }}>{v}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{lb}</div>
                </div>
              ))}
            </div>
            {ents.filter(e => e.credito > 0).length > 0 && <>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Oportunidades mapeadas por competência</div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f8fafc' }}>{['Competência', 'Tributo', 'Tipo de oportunidade', 'Pago', 'Devido', 'Crédito', 'Risco'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                  <tbody>{ents.filter(e => e.credito > 0).map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px' }}>{e.competencia}</td>
                      <td style={{ padding: '10px 12px' }}>{e.tributo}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>{e.tipo_oportunidade}</td>
                      <td style={{ padding: '10px 12px' }}>{fmtR(e.tributo_pago)}</td>
                      <td style={{ padding: '10px 12px' }}>{fmtR(e.tributo_devido)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#16a34a' }}>{fmtR(e.credito)}</td>
                      <td style={{ padding: '10px 12px' }}>{riskBadge(e.risco)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}
          </div>}

          {/* PRAZOS */}
          {page === 'prazos' && <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Controle de prazos prescricionais</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{active?.razao_social} — prazo de 5 anos contados do pagamento indevido.</div>
            {ents.filter(e => e.credito > 0).map((e, i) => {
              const [a, m] = e.competencia.split('-'); const l = new Date(parseInt(a) + 5, parseInt(m) - 1, 1); const dias = Math.round((l - hoje) / (1000 * 60 * 60 * 24)); const urg = dias <= 365;
              return <div key={i} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${urg ? '#dc2626' : '#16a34a'}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{e.competencia} — {e.tributo}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{e.tipo_oportunidade}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>{fmtR(e.credito)}</div>
                  <div style={{ fontSize: 12, color: urg ? '#dc2626' : '#64748b', fontWeight: urg ? 600 : 400 }}>{urg ? '⚠️ CRÍTICO — ' : ''}{dias} dias restantes · {l.toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            })}
          </div>}

          {/* RELATÓRIO */}
          {page === 'relatorio' && <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Relatório de diagnóstico tributário</div>
              <button onClick={() => window.print()} style={{ padding: '7px 16px', background: '#fff', border: '1.5px solid #1e3a5f', borderRadius: 6, fontSize: 13, color: '#1e3a5f', cursor: 'pointer' }}>🖨️ Imprimir / PDF</button>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #1e3a5f', padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['Cliente', active?.razao_social], ['CNPJ', active?.cnpj], ['Regime', active?.regime], ['Período', `${active?.competencia_inicio || '—'} a ${active?.competencia_fim || '—'}`], ['Responsável contábil', active?.responsavel_contabil || '—'], ['Data do relatório', new Date().toLocaleDateString('pt-BR')]].map(([k, v]) => (
                  <div key={k} style={{ fontSize: 13, color: '#374151', padding: '4px 0' }}><strong>{k}:</strong> {v}</div>
                ))}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Resumo executivo</div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>O diagnóstico tributário realizado identificou <strong>{ents.length}</strong> competência(s) com dados analisados. O valor total potencialmente recuperável estimado é de <strong style={{ color: '#16a34a' }}>{fmtR(totalPot)}</strong>.</p>
              {active?.observacoes && <p style={{ fontSize: 13, color: '#374151', marginTop: 10 }}><strong>Contexto:</strong> {active.observacoes}</p>}
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>⚠️ Disclaimer profissional</div>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>Este relatório é de natureza preliminar e diagnóstica. As conclusões dependem de validação por profissional habilitado. Nenhuma declaração, retificação, PER/DCOMP ou pedido de restituição deve ser transmitido sem revisão humana completa.</div>
            </div>
          </div>}

          {/* CALCULADORAS */}
          {page === 'calculadoras' && <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>📊 Calculadoras Tributárias</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Resultados estimados para fins de diagnóstico. Sempre valide com profissional habilitado.</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
              {[['fator-r', '🔺 Fator R'], ['das', '📋 DAS Simples'], ['regime', '⚖️ Simulador Regime'], ['irpj', '💰 IRPJ/CSLL LP'], ['prescricao', '⏰ Prescrição']].map(([id, lb]) => (
                <div key={id} onClick={() => { setCalcTab(id); setCalcResult('') }} style={{ padding: '8px 18px', fontSize: 13, fontWeight: calcTab === id ? 600 : 500, color: calcTab === id ? '#1e3a5f' : '#64748b', cursor: 'pointer', borderBottom: `2px solid ${calcTab === id ? '#1e3a5f' : 'transparent'}`, marginBottom: -2 }}>{lb}</div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24, maxWidth: 580, marginBottom: 16 }}>
              {calcTab === 'fator-r' && <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>🔺 Calculadora Fator R</div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.5 }}>O Fator R determina se a empresa é tributada pelo Anexo III ou V do Simples Nacional.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Folha de salários — 12 meses (R$)</label>{inp(cFolha, setCFolha, 'Ex: 120000', 'number')}</div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Receita bruta — 12 meses (R$)</label>{inp(cRb, setCRb, 'Ex: 480000', 'number')}</div>
                </div>
                <button onClick={calcFatorR} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Calcular Fator R →</button>
              </>}
              {calcTab === 'das' && <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>📋 Simulador DAS Simples Nacional</div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.5 }}>Calcula o valor aproximado do DAS com base na receita acumulada dos últimos 12 meses.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>RBT12 (R$)</label>{inp(cRbt12, setCRbt12, 'Ex: 720000', 'number')}</div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Receita do mês (R$)</label>{inp(cRmes, setCRmes, 'Ex: 60000', 'number')}</div>
                </div>
                <button onClick={calcDAS} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Calcular DAS →</button>
              </>}
              {calcTab === 'regime' && <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>⚖️ Simulador de Regime Tributário</div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.5 }}>Compara a carga tributária entre Simples Nacional, Lucro Presumido e Lucro Real.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Faturamento anual (R$)</label>{inp(cFat, setCFat, 'Ex: 1200000', 'number')}</div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Margem de lucro líquido (%)</label>{inp(cMarg, setCMarg, 'Ex: 15', 'number')}</div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Atividade</label>{sel(cAtv, setCAtv, [['comercio', 'Comércio'], ['industria', 'Indústria'], ['servicos', 'Serviços']])}</div>
                </div>
                <button onClick={calcRegime} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Simular regime →</button>
              </>}
              {calcTab === 'irpj' && <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>💰 Calculadora IRPJ/CSLL — Lucro Presumido</div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.5 }}>Estima o IRPJ e CSLL com base na receita bruta trimestral.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Receita bruta trimestral (R$)</label>{inp(cRbt, setCRbt, 'Ex: 300000', 'number')}</div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Atividade</label>{sel(cAtv2, setCAtv2, [['8', 'Comércio/Indústria (8%)'], ['16', 'Transporte (16%)'], ['32', 'Serviços (32%)']])}</div>
                </div>
                <button onClick={calcIRPJ} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Calcular IRPJ/CSLL →</button>
              </>}
              {calcTab === 'prescricao' && <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>⏰ Calculadora de Prescrição</div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.5 }}>Calcula o prazo prescricional de 5 anos para pedido de restituição.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Data de pagamento indevido</label>
                  <input type="date" value={cDtpag} onChange={e => setCDtpag(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                </div>
                <button onClick={calcPrescricao} style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Calcular prazo →</button>
              </>}
              {calcResult && <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '14px 18px', fontSize: 13, color: '#166534', whiteSpace: 'pre-line' }}>{calcResult}</div>}
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#92400e', display: 'flex', gap: 10 }}>
              ⚠️ Todos os cálculos são estimativas para fins de diagnóstico preliminar. Não substituem a análise profissional.
            </div>
          </div>}

        </div>
      </div>
    </div>
  )
}