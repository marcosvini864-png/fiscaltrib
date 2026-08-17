/**
 * AbaMonofasicos.jsx - e-FiscalTribe®
 * Versao 8.9.4 - 17/08/2026
 * + gerarRelatorioPDF usa diagAberto?.itens_json quando disponivel
 *   eliminando race condition ao abrir diagnostico do historico
 * + slice aumentado para 2000 itens (solucao intermediaria)
 */

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { parseXMLNFe } from '../../utils/parseXMLNFe'
import AnalisadorIA from '../../AnalisadorIA'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleString('pt-BR') : '-'
const FORMATOS = '.xml'

const NCM_PREFIXOS = [
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
  return NCM_PREFIXOS.some(p => n.startsWith(p))
}

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#334155',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#0F172A', thBg: '#4B5563', thText: '#FFFFFF',
  ghost: '#F1F5F9', ghostText: '#64748B',
}

function Badge({ tipo }) {
  const map = {
    monofasico:     { label: 'Monofasico',     bg: '#dcfce7', color: '#166534', border: '#86efac' },
    nao_monofasico: { label: 'Nao monofasico', bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
    pendente:       { label: 'Pendente PGDAS', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    concluido:      { label: 'Concluido',      bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    erro:           { label: 'Erro',           bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    ignorado:       { label: 'Ignorado',       bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
    pendente_arq:   { label: 'Aguardando',     bg: '#f1f5f9', color: '#64748B', border: '#cbd5e1' },
  }
  const b = map[tipo] || map.nao_monofasico
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
      {b.label}
    </span>
  )
}

function SkeletonKPI() {
  return (
    <div style={{ background: S.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
      <div style={{ height: 24, width: 80, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', margin: '0 auto 8px' }} />
      <div style={{ height: 11, width: 100, borderRadius: 4, background: '#E2E8F0', margin: '0 auto' }} />
    </div>
  )
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array(cols).fill(null).map((_, i) => (
        <td key={i} style={{ padding: '10px 10px' }}>
          <div style={{ height: 13, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

const LINHAS_GHOST = Array(5).fill(null).map((_, i) => ({
  nNF: `NF-000${i+1}`, competencia: 'MM/AAAA', emitente: 'Nome do Emitente',
  descricao: 'Descricao do Produto', ncm: '0000.00.00',
  vProd: 0, vItemPIS: 0, vItemCOFINS: 0, monofasico: false, credito: 0, ghost: true,
}))

const HISTORICO_GHOST = Array(5).fill(null).map((_, i) => ({
  ghost: true, created_at: null,
  nome_diagnostico: 'Nome do diagnostico',
  periodo_inicio: 'MM/AAAA', periodo_fim: 'MM/AAAA',
  arquivos_importados: [], total_itens: 0, total_monofasicos: 0,
  receita_monofasica: 0, credito_estimado: 0, status: 'concluido',
}))

function ModalConfirmacaoSair({ onSalvar, onContinuar, onCancelar, salvando }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: S.white, borderRadius: 12, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF3C7', border: '2px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 24 }}>⚠️</div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: S.navy, textAlign: 'center', marginBottom: 8 }}>Dados nao salvos</div>
        <div style={{ fontSize: 13, color: S.muted, textAlign: 'center', lineHeight: 1.6, marginBottom: 8 }}>Voce tem dados desta competencia que ainda nao foram salvos.</div>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: S.red, fontWeight: 600, textAlign: 'center', lineHeight: 1.6 }}>
          Se continuar sem salvar, todas as informacoes importadas e processadas desta competencia serao perdidas permanentemente.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onSalvar} disabled={salvando} style={{ padding: '11px 16px', background: S.navy, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar e continuar'}
          </button>
          <button onClick={onContinuar} style={{ padding: '11px 16px', background: '#FEF2F2', color: S.red, border: `1px solid #FECACA`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Continuar sem salvar</button>
          <button onClick={onCancelar} style={{ padding: '11px 16px', background: 'none', color: S.muted, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar — voltar para os dados</button>
        </div>
      </div>
    </div>
  )
}

function ModalNomeDiagnostico({ nomeSugerido, onConfirmar, onCancelar, salvando }) {
  const [nome, setNome] = useState(nomeSugerido || '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: S.white, borderRadius: 12, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: S.navy, marginBottom: 6 }}>Salvar Diagnostico</div>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 16, lineHeight: 1.5 }}>
          De um nome para identificar este diagnostico no historico. Pode deixar em branco para usar o nome automatico.
        </div>
        <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, marginBottom: 6 }}>Nome / Descricao (opcional)</div>
        <input
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirmar(nome) }}
          placeholder={nomeSugerido}
          style={{ width: '100%', padding: '9px 12px', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onConfirmar(nome)} disabled={salvando}
            style={{ flex: 1, padding: '10px 0', background: S.navy, color: S.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onCancelar}
            style={{ padding: '10px 18px', background: 'none', color: S.muted, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AbaMonofasicos({ cliente, regime }) {
  const [aba, setAba] = useState('importar')
  const [arquivos, setArquivos] = useState([])
  const [processando, setProcessando] = useState(false)
  const [itens, setItens] = useState([])
  const [processados, setProcessados] = useState([])
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [selecionados, setSelecionados] = useState([])
  const [menuAberto, setMenuAberto] = useState(null)
  const [pgdasForm, setPgdasForm] = useState({
    receita_bruta_total: '', receita_monofasica: '', receita_st: '', das_recolhido: '', segregou: false,
  })
  const [pgdasResult, setPgdasResult] = useState(null)
  const [pgdasSupabase, setPgdasSupabase] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagAberto, setDiagAberto] = useState(null)
  const [porPagina, setPorPagina] = useState(10)
  const [upsertInfo, setUpsertInfo] = useState(null)
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [modalNome, setModalNome] = useState(false)
  const inputRef = useRef(null)

  const competenciasKey = [...new Set(
    itens.map(i => i.competencia).filter(Boolean)
  )].sort().join(',')

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => { if (cliente?.id) carregarHistorico() }, [cliente?.id])

  useEffect(() => {
    if (regime !== 'Simples Nacional' || !cliente?.id || !competenciasKey) {
      setPgdasSupabase(null)
      return
    }
    const competencias = competenciasKey.split(',').filter(Boolean)
    supabase
      .from('diagnosticos_pgdas')
      .select('competencia, diferenca_recuperavel, receita_bruta_total, receita_monofasica')
      .eq('cliente_id', cliente.id)
      .in('competencia', competencias)
      .then(({ data, error }) => {
        if (error) { console.warn('Busca PGDAS falhou:', error.message); return }
        if (data && data.length > 0) {
          const total = data.reduce((s, p) => s + (parseFloat(p.diferenca_recuperavel) || 0), 0)
          setPgdasSupabase({ diferenca: total, registros: data })
        } else {
          setPgdasSupabase(null)
        }
      })
  }, [competenciasKey, itens.length, cliente?.id, regime])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const { data } = await supabase.from('diagnosticos_monofasicos').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  function gerarNomeSugerido() {
    const periodos = [...new Set(itens.map(i => i.competencia))].sort()
    const inicio = periodos[0] || ''
    const fim = periodos[periodos.length - 1] || ''
    if (inicio && fim && inicio !== fim) return `Monofasicos ${inicio} a ${fim}`
    if (inicio) return `Monofasicos ${inicio}`
    return `Diagnostico ${new Date().toLocaleDateString('pt-BR')}`
  }

  function exportarCSV() {
    if (!itens.length) return
    const headers = ['NF','Competencia','Emitente','Descricao','NCM','Valor Produto','PIS','COFINS','Classificacao']
    const rows = itens.map(i => [
      i.nNF, i.competencia, i.emitente, i.descricao, i.ncm,
      i.vProd.toFixed(2), i.vItemPIS.toFixed(2), i.vItemCOFINS.toFixed(2),
      i.monofasico ? 'Monofasico' : 'Nao monofasico'
    ])
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monofasicos_${cliente?.cnpj || 'cliente'}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function gerarRelatorioPDF() {
    // ── v8.9.4 FIX: usa itens_json do diagAberto quando disponivel
    // evita race condition ao abrir diagnostico do historico
    const itensParaPDF = (diagAberto?.itens_json && diagAberto.itens_json.length > 0)
      ? diagAberto.itens_json
      : itens

    if (!itensParaPDF.length) return

    const totalMono = itensParaPDF.filter(i => i.monofasico).length
    const recMono   = itensParaPDF.filter(i => i.monofasico).reduce((s,i) => s + i.vProd, 0)
    const credito   = pgdasResult?.diferenca || pgdasSupabase?.diferenca || itensParaPDF.filter(i => i.monofasico).reduce((s,i) => s + i.credito, 0)
    const periodos  = [...new Set(itensParaPDF.map(i => i.competencia))].sort()
    const dataHoje  = new Date().toLocaleDateString('pt-BR')

    const rbTotal  = pgdasResult?.rb || parseFloat(pgdasSupabase?.registros?.[0]?.receita_bruta_total || 0)
    const rmTotal  = pgdasResult?.rm || parseFloat(pgdasSupabase?.registros?.[0]?.receita_monofasica || 0)
    const semMono  = rbTotal - rmTotal
    const temPGDAS = !!(pgdasResult || pgdasSupabase)
    const secNum   = temPGDAS ? { base: '4', instrucoes: '5', legal: '6' } : { base: '3', instrucoes: '4', legal: '5' }

    const linhasTabela = itensParaPDF.filter(i => i.monofasico).map(i => `
      <tr>
        <td>${i.nNF}</td><td>${i.competencia}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.descricao}</td>
        <td>${i.ncm}</td>
        <td style="text-align:right">${fmtR(i.vProd)}</td>
        <td style="text-align:right">${fmtR(i.vItemPIS)}</td>
        <td style="text-align:right">${fmtR(i.vItemCOFINS)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Dossie Monofasicos — ${cliente?.razao_social||''}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:11px;color:#0F172A;padding:32px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #0B1F4D;padding-bottom:16px}
      .logo{font-size:18px;font-weight:700;color:#0B1F4D}.logo span{color:#2563EB}
      .secao{margin-bottom:20px}
      .secao-titulo{font-size:11px;font-weight:700;color:#0B1F4D;text-transform:uppercase;border-bottom:1px solid #E2E8F0;padding-bottom:6px;margin-bottom:12px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
      .kpi{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 14px;text-align:center}
      .kpi-valor{font-size:14px;font-weight:700;margin-bottom:4px}.kpi-label{font-size:10px;color:#334155}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#4B5563;color:#fff;padding:6px 8px;text-align:left;font-weight:600}
      td{padding:5px 8px;border-bottom:1px solid #E2E8F0}
      tr:nth-child(even){background:#F8FAFC}
      .base-legal{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 16px;font-size:10px;color:#1E40AF;line-height:1.6}
      .instrucoes{background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:12px 16px;font-size:10px;color:#14532D;line-height:1.6}
      .rodape{margin-top:24px;border-top:1px solid #E2E8F0;padding-top:12px;font-size:10px;color:#64748B;display:flex;justify-content:space-between}
      .destaque{color:#16a34a}.alerta{color:#dc2626}
      .info{margin-bottom:8px}.info span{font-weight:600;color:#0F172A}
      .alerta-box{background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:8px 12px;margin:8px 0;font-weight:700;color:#DC2626}
      @media print{body{padding:16px}}
    </style></head><body>

    <div class="header">
      <div>
        <div class="logo">e-<span>FiscalTribe</span>®</div>
        <div style="font-size:10px;color:#64748B;margin-top:4px">Sistema de Inteligencia Tributaria</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:700;color:#0B1F4D">Dossie de Recuperacao PIS/COFINS Monofasico</div>
        <div style="font-size:11px;color:#334155">Gerado em: ${dataHoje}</div>
      </div>
    </div>

    <div class="secao">
      <div class="secao-titulo">1. Identificacao do Contribuinte</div>
      <div class="info">Razao Social: <span>${cliente?.razao_social||'—'}</span></div>
      <div class="info">CNPJ: <span>${cliente?.cnpj||'—'}</span></div>
      <div class="info">Regime Tributario: <span>${regime||'Simples Nacional'}</span></div>
      <div class="info">Periodo Analisado: <span>${periodos[0]||'—'} a ${periodos[periodos.length-1]||'—'}</span></div>
      <div class="info">Total de NF-es Analisadas: <span>${[...new Set(itensParaPDF.map(i => i.nNF))].length}</span></div>
    </div>

    <div class="secao">
      <div class="secao-titulo">2. Resumo Executivo</div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-valor" style="color:#0B1F4D">${itensParaPDF.length}</div><div class="kpi-label">Total de Itens</div></div>
        <div class="kpi"><div class="kpi-valor" style="color:#ea580c">${totalMono}</div><div class="kpi-label">Itens Monofasicos</div></div>
        <div class="kpi"><div class="kpi-valor" style="color:#ea580c">${fmtR(recMono)}</div><div class="kpi-label">Receita Monofasica</div></div>
        <div class="kpi"><div class="kpi-valor" style="color:#16a34a">${fmtR(credito)}</div><div class="kpi-label">Potencial de Recuperacao</div></div>
      </div>
    </div>

    ${temPGDAS ? `
    <div class="secao">
      <div class="secao-titulo">3. Apuracao PGDAS-D</div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-valor">${fmtR(rbTotal)}</div><div class="kpi-label">Receita Bruta Total</div></div>
        <div class="kpi"><div class="kpi-valor">${fmtR(rmTotal)}</div><div class="kpi-label">Receita Monofasica</div></div>
        <div class="kpi"><div class="kpi-valor alerta">${fmtR(pgdasResult?.das || 0)}</div><div class="kpi-label">DAS Recolhido</div></div>
        <div class="kpi"><div class="kpi-valor destaque">${fmtR(credito)}</div><div class="kpi-label">Diferenca Recuperavel</div></div>
      </div>
    </div>
    ` : ''}

    <div class="secao">
      <div class="secao-titulo">${secNum.base}. Detalhamento — Itens Monofasicos</div>
      <table>
        <thead>
          <tr>
            <th>NF</th><th>Competencia</th><th>Descricao</th><th>NCM</th>
            <th style="text-align:right">Valor Produto</th>
            <th style="text-align:right">PIS</th>
            <th style="text-align:right">COFINS</th>
          </tr>
        </thead>
        <tbody>
          ${linhasTabela}
          <tr style="background:#F0FDF4;font-weight:700">
            <td colspan="4">TOTAL MONOFASICO</td>
            <td style="text-align:right;color:#16a34a">${fmtR(recMono)}</td>
            <td style="text-align:right"></td>
            <td style="text-align:right"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="secao">
      <div class="secao-titulo">${secNum.instrucoes}. Instrucoes para Retificacao do PGDAS-D</div>
      <div class="instrucoes">
        <strong>Como preencher a retificacao no PGDAS-D:</strong><br><br>
        Acesse o PGDAS-D com certificado digital ou codigo de acesso em <strong>Declaracao Mensal → Declarar/Retificar</strong>,
        informe o periodo de apuracao e clique em <strong>Sim</strong> para retificar a declaracao anterior.<br><br>
        <div class="alerta-box">⚠️ NAO altere o valor da Receita Bruta Total. Apenas redistribua as receitas conforme a tabela abaixo.</div>
        <table style="margin-top:10px">
          <thead>
            <tr>
              <th>Campo no PGDAS-D</th>
              <th style="text-align:right">Valor Original</th>
              <th style="text-align:right">Valor Retificado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Receita Bruta Total (nao alterar)</td>
              <td style="text-align:right">${fmtR(rbTotal)}</td>
              <td style="text-align:right"><strong>${fmtR(rbTotal)}</strong></td>
            </tr>
            <tr style="background:#F8FAFC">
              <td>Revenda SEM tributacao monofasica/ST</td>
              <td style="text-align:right">${fmtR(rbTotal)}</td>
              <td style="text-align:right"><strong>${fmtR(semMono)}</strong></td>
            </tr>
            <tr>
              <td style="color:#16a34a"><strong>Revenda COM tributacao monofasica/ST</strong></td>
              <td style="text-align:right">R$ 0,00</td>
              <td style="text-align:right;color:#16a34a"><strong>${fmtR(rmTotal)}</strong></td>
            </tr>
            <tr style="background:#F0FDF4">
              <td><strong>Valor a restituir (PIS + COFINS)</strong></td>
              <td style="text-align:right">—</td>
              <td style="text-align:right;color:#16a34a"><strong>${fmtR(credito)}</strong></td>
            </tr>
          </tbody>
        </table>
        <br>
        Apos transmitir a retificacao, aguarde <strong>24 horas</strong> e acesse:<br>
        <strong>Simples Servicos → Restituicao e Compensacao → Pedido Eletronico de Restituicao</strong><br><br>
        • Um pedido por DAS (por periodo de apuracao)<br>
        • Prazo permitido: entre 4 meses e 5 anos da data atual<br>
        • Conta bancaria obrigatoriamente da pessoa juridica (CNPJ)<br>
        • Prazo medio de pagamento: <strong>60 dias</strong> (creditado todo dia 20 de cada mes)
      </div>
    </div>

    <div class="secao">
      <div class="secao-titulo">${secNum.legal}. Base Legal</div>
      <div class="base-legal">
        <strong>Fundamentacao Juridica:</strong><br><br>
        • <strong>Lei 10.147/2000</strong> — Institui a tributacao monofasica do PIS/COFINS para medicamentos, cosmeticos e produtos de higiene pessoal.<br>
        • <strong>Lei 9.990/2000</strong> — Tributacao monofasica para combustiveis derivados de petroleo.<br>
        • <strong>Lei 10.485/2002</strong> — Tributacao monofasica para veiculos automotores e autopecas.<br>
        • <strong>LC 123/2006 art. 18 §4-A</strong> — Segregacao de receitas com tributacao concentrada no PGDAS-D das empresas do Simples Nacional.<br>
        • <strong>IN RFB 2.055/2021</strong> — Procedimentos para restituicao e compensacao de tributos administrados pela Receita Federal.<br><br>
        A recuperacao se da mediante retificacao do PGDAS-D e pedido eletronico de restituicao via PER/DCOMP junto a Receita Federal,
        respeitando o prazo prescricional de 5 anos (art. 168 do CTN).
      </div>
    </div>

    <div class="rodape">
      <div>e-FiscalTribe® — Sistema de Inteligencia Tributaria</div>
      <div>Documento gerado em ${dataHoje} — Uso exclusivo do profissional tributario</div>
    </div>

    </body></html>`

    const janela = window.open('', '_blank', 'width=900,height=700')
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 800)
  }

  async function salvarDiagnostico(nomeDiagnostico) {
    if (!itens.length || !cliente?.id) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const periodos = [...new Set(itens.map(i => i.competencia))].sort()
      const creditoFinal = pgdasResult?.diferenca || pgdasSupabase?.diferenca || itens.filter(i => i.monofasico).reduce((s, i) => s + i.credito, 0)
      const { error } = await supabase.from('diagnosticos_monofasicos').insert([{
        usuario_id: user.id, cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '', cliente_cnpj: cliente.cnpj || '', regime,
        nome_diagnostico: nomeDiagnostico || gerarNomeSugerido(),
        arquivos_importados: processados.map(p => ({ nome: p.nome, tamanho: p.tamanho, status: p.status, qtd_itens: p.qtdItens || 0 })),
        importado_por: user.email || '',
        total_itens: itens.length,
        total_monofasicos: itens.filter(i => i.monofasico).length,
        receita_total: itens.reduce((s, i) => s + i.vProd, 0),
        receita_monofasica: itens.filter(i => i.monofasico).reduce((s, i) => s + i.vProd, 0),
        periodo_inicio: periodos[0] || null, periodo_fim: periodos[periodos.length - 1] || null,
        pgdas_json: pgdasResult || null,
        credito_estimado: creditoFinal,
        itens_json: itens.slice(0, 2000), // v8.9.4: aumentado de 500 para 2000
        status: 'concluido',
      }])
      if (error) throw error
      await carregarHistorico()
      return true
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function excluirDiagnostico(id) {
    if (!window.confirm('Excluir este diagnostico?')) return
    await supabase.from('diagnosticos_monofasicos').delete().eq('id', id)
    if (diagAberto?.id === id) { setDiagAberto(null); setItens([]); setProcessados([]) }
    await carregarHistorico()
  }

  function abrirDiagnostico(diag) {
    setDiagAberto(diag); setItens(diag.itens_json || [])
    setPgdasResult(diag.pgdas_json || null); setAba('importar'); setPagina(1); setSelecionados([])
  }

  function limparDados() {
    setItens([]); setArquivos([]); setProcessados([]); setPgdasResult(null); setPgdasSupabase(null)
    setDiagAberto(null); setSelecionados([]); setErro(''); setUpsertInfo(null)
    setPagina(1); setBusca(''); setFiltro('todos')
    if (inputRef.current) inputRef.current.value = ''
  }

  function novaAnalise() {
    if (itens.length > 0 && !diagAberto) { setModalConfirmacao(true) } else { limparDados() }
  }

  async function modalSalvarEContinuar() {
    const ok = await salvarDiagnostico(gerarNomeSugerido())
    if (ok) { setModalConfirmacao(false); limparDados() }
  }

  function modalContinuarSemSalvar() { setModalConfirmacao(false); limparDados() }

  async function confirmarSalvarComNome(nome) {
    const ok = await salvarDiagnostico(nome)
    if (ok) setModalNome(false)
  }

  async function upsertItensFiscais(todosItens, userId) {
    if (!cliente?.id || !userId || !todosItens.length) return
    const mapaUnicos = new Map()
    for (const item of todosItens) {
      const codigo = item.codigo || item.nNF
      if (!codigo || mapaUnicos.has(codigo)) continue
      mapaUnicos.set(codigo, item)
    }
    const registros = Array.from(mapaUnicos.values()).map(item => ({
      usuario_id: userId, cliente_id: cliente.id,
      codigo: item.codigo || '', descricao: item.descricao || '',
      gtin: item.gtin || null, ncm: item.ncm || null,
      ex: item.ex || null, cest: item.cest || null,
      class_pis_cofins_econsulta: item.monofasico ? 'monofasico' : 'tributado',
      status_ncm: item.ncm ? 'encontrada' : 'nao_encontrada',
      considerar_receita: true, duplicado: false,
    }))
    if (!registros.length) return
    let novosTotal = 0
    const LOTE = 100
    for (let i = 0; i < registros.length; i += LOTE) {
      const lote = registros.slice(i, i + LOTE)
      const { data, error } = await supabase.from('itens_fiscais').upsert(lote, { onConflict: 'cliente_id,codigo', ignoreDuplicates: true }).select('id')
      if (!error && data) novosTotal += data.length
    }
    setUpsertInfo({ novos: novosTotal, total: registros.length })
  }

  async function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    if (files.length === 0) return
    const novos = files.map(f => ({ file: f, nome: f.name, tamanho: (f.size/1024).toFixed(0)+' KB', status: 'pendente' }))
    setArquivos(prev => [...prev, ...novos])
    await processarArquivos([...arquivos, ...novos])
  }

  async function processarArquivos(listaArquivos) {
    if (!listaArquivos || listaArquivos.length === 0) return
    setProcessando(true); setErro(''); setDiagAberto(null); setSelecionados([])
    const novosProcessados = [], todosItens = []
    for (const arq of listaArquivos) {
      try {
        if (arq.nome.toLowerCase().endsWith('.xml')) {
          const texto = await arq.file.text()
          const xmls = texto.includes('<nfeProc') ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x+'</nfeProc>') : [texto]
          let qtd = 0
          for (const xml of xmls) {
            try {
              const nfe = parseXMLNFe(xml)
              if (!nfe.competencia) continue
              ;(nfe.itens || []).forEach(item => {
                const mono = isMonofasico(item.ncm)
                todosItens.push({
                  nNF: nfe.nNF||'-', competencia: nfe.competencia, emitente: nfe.emitNome||'-',
                  ncm: item.ncm||'-', descricao: item.xProd||'-', vProd: item.vProd||0,
                  vItemPIS: item.vItemPIS||0, vItemCOFINS: item.vItemCOFINS||0,
                  monofasico: mono,
                  credito: mono && regime !== 'Simples Nacional' ? (item.vItemPIS||0)+(item.vItemCOFINS||0) : 0,
                  pendentePGDAS: mono && regime === 'Simples Nacional',
                  arquivo: arq.nome, codigo: item.cProd || '',
                  gtin: item.cEAN || null, ex: item.EXTIPI || null, cest: item.CEST || null,
                })
                qtd++
              })
            } catch {}
          }
          novosProcessados.push({ ...arq, status: 'concluido', qtdItens: qtd })
        } else {
          novosProcessados.push({ ...arq, status: 'ignorado', qtdItens: 0 })
        }
      } catch { novosProcessados.push({ ...arq, status: 'erro', qtdItens: 0 }) }
    }
    if (regime === 'Simples Nacional') {
      const recMono = todosItens.filter(i => i.monofasico).reduce((s,i)=>s+i.vProd, 0)
      const recTotal = todosItens.reduce((s,i)=>s+i.vProd, 0)
      setPgdasForm(prev => ({ ...prev, receita_bruta_total: recTotal.toFixed(2), receita_monofasica: recMono.toFixed(2) }))
    }
    setProcessados(novosProcessados)
    setItens(todosItens)
    setPgdasResult(null)
    setPgdasSupabase(null)
    setProcessando(false)
    setPagina(1)
    if (inputRef.current) inputRef.current.value = ''
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await upsertItensFiscais(todosItens, user?.id)
    } catch (e) {
      console.warn('upsert itens_fiscais falhou silenciosamente:', e.message)
    }
  }

  function calcularPGDAS() {
    const rb = parseFloat(pgdasForm.receita_bruta_total||0), rm = parseFloat(pgdasForm.receita_monofasica||0)
    const rst = parseFloat(pgdasForm.receita_st||0), das = parseFloat(pgdasForm.das_recolhido||0)
    const dasCorreto = (rb-rm-rst)*0.06, diferenca = Math.max(0,das-dasCorreto)
    setPgdasResult({ rb, rm, rst, das, dasCorreto, diferenca, segregou: pgdasForm.segregou })
  }

  const temResultado = itens.length > 0
  const itensFiltrados = itens.filter(i => {
    if (filtro==='monofasico' && !i.monofasico) return false
    if (filtro==='nao_monofasico' && i.monofasico) return false
    if (busca) { const b=busca.toLowerCase(); return i.descricao.toLowerCase().includes(b)||i.ncm.includes(b)||i.emitente.toLowerCase().includes(b)||i.nNF.includes(b) }
    return true
  })
  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length/porPagina))
  const itensPagina  = temResultado ? itensFiltrados.slice((pagina-1)*porPagina, pagina*porPagina) : LINHAS_GHOST
  const totalMono    = itens.filter(i=>i.monofasico).length
  const creditoTotal = regime==='Simples Nacional'
    ? (pgdasResult?.diferenca || pgdasSupabase?.diferenca || diagAberto?.credito_estimado || itens.filter(i=>i.monofasico).reduce((s,i)=>s+i.credito,0))
    : itens.filter(i=>i.monofasico).reduce((s,i)=>s+i.credito,0)
  const receitaMono  = itens.filter(i=>i.monofasico).reduce((s,i)=>s+i.vProd,0)
  const todosSelecionados = itensPagina.length>0 && !itensPagina[0]?.ghost && itensPagina.every((_,i)=>selecionados.includes((pagina-1)*porPagina+i))

  function toggleTodos() {
    if (todosSelecionados) setSelecionados(prev=>prev.filter(idx=>idx<(pagina-1)*porPagina||idx>=pagina*porPagina))
    else { const novos=itensPagina.map((_,i)=>(pagina-1)*porPagina+i); setSelecionados(prev=>[...new Set([...prev,...novos])]) }
  }
  function toggleItem(idx) { setSelecionados(prev=>prev.includes(idx)?prev.filter(i=>i!==idx):[...prev,idx]) }

  const dadosIA = temResultado ? {
    totalItens: itens.length, totalMonofasicos: totalMono,
    receitaMonofasica: receitaMono, creditoEstimado: creditoTotal, regime,
    pgdas: pgdasResult || null,
    top10: itens.filter(i=>i.monofasico).slice(0,10).map(i=>({ ncm: i.ncm, descricao: i.descricao, vProd: i.vProd, competencia: i.competencia }))
  } : null

  const historicoExibir = loadingHistorico ? HISTORICO_GHOST : historico

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

      {modalConfirmacao && (
        <ModalConfirmacaoSair onSalvar={modalSalvarEContinuar} onContinuar={modalContinuarSemSalvar} onCancelar={() => setModalConfirmacao(false)} salvando={salvando} />
      )}
      {modalNome && (
        <ModalNomeDiagnostico nomeSugerido={gerarNomeSugerido()} onConfirmar={confirmarSalvarComNome} onCancelar={() => setModalNome(false)} salvando={salvando} />
      )}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>Motor do Simples / <strong style={{ color: S.text }}>Monofasicos PIS/COFINS</strong></div>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Monofasicos PIS/COFINS</div>
          <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>Identifique produtos sujeitos a tributacao monofasica e calcule o credito recuperavel de PIS/COFINS.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {temResultado && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={gerarRelatorioPDF} style={{ padding: '7px 14px', background: S.navy, color: S.white, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Imprimir PDF</button>
              <button onClick={exportarCSV} style={{ padding: '7px 14px', background: S.green, color: S.white, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Exportar CSV</button>
              <button onClick={novaAnalise} style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.red}`, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.red }}>Limpar</button>
            </div>
          )}
          <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px', minWidth: 260, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.navy, marginBottom: 4 }}>Importar NF-es</div>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>Aceita: <strong style={{ color: S.text }}>.xml (NF-e)</strong></div>
            <input ref={inputRef} type="file" multiple accept={FORMATOS} onChange={onDrop} style={{ display: 'none' }} />
            <button onClick={() => inputRef.current?.click()} disabled={processando}
              style={{ width: '75%', padding: '8px 0', background: processando ? '#CBD5E1' : '#4B5563', color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: processando ? 'not-allowed' : 'pointer' }}>
              {processando ? 'Processando...' : 'Selecionar Arquivos'}
            </button>
            <div style={{ fontSize: 10, color: S.ghostText, marginTop: 6 }}>Se o botao nao responder, pressione F5</div>
          </div>
        </div>
      </div>

      {upsertInfo && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#166534' }}>
            <strong>{upsertInfo.total} produtos</strong> cadastrados no Cadastro de Itens.
            {upsertInfo.novos > 0 && <span> <strong>{upsertInfo.novos} novos</strong> adicionados.</span>}
            {' '}Acesse <strong>Classificacao de Itens</strong> para revisar e confirmar.
          </div>
          <button onClick={() => setUpsertInfo(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13 }}>X</button>
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: `2px solid ${S.border}`, marginBottom: 20 }}>
        {[{ id:'importar', label:'Importar' }, { id:'historico', label:`Historico (${historico.length})` }].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding:'10px 20px', fontSize:13, fontWeight:aba===a.id?700:400, color:aba===a.id?S.navy:S.muted, background:'none', border:'none', borderBottom:`2px solid ${aba===a.id?S.navy:'transparent'}`, marginBottom:-2, cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'importar' && (
        <>
          <AnalisadorIA contexto="Monofasicos PIS/COFINS" dados={dadosIA} cliente={cliente} regime={regime} />

          {diagAberto && (
            <div style={{ background:'#eff6ff', border:`1px solid #bfdbfe`, borderRadius:8, padding:'10px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:13, color:'#2563eb' }}>Visualizando: <strong>{diagAberto.nome_diagnostico || fmtData(diagAberto.created_at)}</strong></div>
              <button onClick={limparDados} style={{ background:'none', border:'none', color:S.muted, cursor:'pointer', fontSize:13 }}>Fechar</button>
            </div>
          )}

          {pgdasSupabase && !pgdasResult && (
            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 16px', marginBottom:12, fontSize:13, color:'#166534' }}>
              ✅ PGDAS-D encontrado para {pgdasSupabase.registros.length} competencia(s) — Diferenca recuperavel: <strong>{fmtR(pgdasSupabase.diferenca)}</strong>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Total de itens',          valor: temResultado ? itens.length       : '—',        cor: temResultado ? S.navy   : S.ghostText },
              { label:'Itens monofasicos',        valor: temResultado ? totalMono          : '—',        cor: temResultado ? S.orange : S.ghostText },
              { label:'Receita monofasica',       valor: temResultado ? fmtR(receitaMono)  : 'R$ —,——', cor: temResultado ? S.orange : S.ghostText },
              { label:'Potencial de recuperacao', valor: temResultado ? fmtR(creditoTotal) : 'R$ —,——', cor: temResultado ? S.green  : S.ghostText },
            ].map((k,i) => (
              <div key={i} style={{ background:S.white, borderRadius:8, padding:'14px 16px', border:`1px solid ${S.border}`, textAlign:'center' }}>
                <div style={{ fontSize:i>=2?14:22, fontWeight:700, color:k.cor }}>{k.valor}</div>
                <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>{k.label}</div>
                {!temResultado && <div style={{ fontSize:10, color:S.ghostText, marginTop:4 }}>Aguardando importacao</div>}
              </div>
            ))}
          </div>

          <div style={{ background:S.white, borderRadius:10, border:`1px solid ${S.border}`, marginBottom:16, overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:`1px solid ${S.border}`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'space-between' }}>
              <input value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1)}} placeholder="Buscar produto, NCM, emitente..."
                style={{ padding:'6px 12px', border:`1px solid ${S.border}`, borderRadius:6, fontSize:13, outline:'none', width:220 }} />
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12, color:S.muted }}>Filtrar:</span>
                {[
                  { id:'todos',          label:`Todos (${itens.length})`                     },
                  { id:'monofasico',     label:`Monofasicos (${totalMono})`                  },
                  { id:'nao_monofasico', label:`Nao monofasicos (${itens.length-totalMono})` },
                ].map(f => (
                  <button key={f.id} onClick={()=>{setFiltro(f.id);setPagina(1)}}
                    style={{ padding:'4px 12px', background:filtro===f.id?S.navy:'none', color:filtro===f.id?S.white:S.muted, border:`1px solid ${filtro===f.id?S.navy:S.border}`, borderRadius:99, fontSize:11, fontWeight:filtro===f.id?700:400, cursor:'pointer' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:S.thBg }}>
                    <th style={{ padding:'8px 10px', color:S.thText }}>
                      <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} disabled={!temResultado} style={{ cursor:temResultado?'pointer':'not-allowed' }} />
                    </th>
                    {['NF','Competencia','Emitente','Descricao do Produto','NCM','Valor Produto','PIS','COFINS','Classificacao','Acoes'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:S.thText, fontWeight:600, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itensPagina.map((item,i) => {
                    const idx=(pagina-1)*porPagina+i
                    const sel=selecionados.includes(idx)
                    const isGhost=item.ghost
                    return (
                      <tr key={i} style={{ borderBottom:`1px solid ${S.border}`, background:isGhost?S.ghost:sel?'#eff6ff':i%2===0?S.white:'#FAFAFA' }}>
                        <td style={{ padding:'7px 10px' }}>{!isGhost && <input type="checkbox" checked={sel} onChange={()=>toggleItem(idx)} style={{ cursor:'pointer' }} />}</td>
                        <td style={{ padding:'7px 10px', fontWeight:600, color:isGhost?S.ghostText:S.navy }}>{item.nNF}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:S.text }}>{item.competencia}</td>
                        <td style={{ padding:'7px 10px', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isGhost?S.ghostText:S.text }}>{item.emitente}</td>
                        <td style={{ padding:'7px 10px', maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isGhost?S.ghostText:S.text }}>{item.descricao}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:S.muted }}>{item.ncm}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:S.text }}>{isGhost?'R$ —,——':fmtR(item.vProd)}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:item.vItemPIS>0?S.red:S.muted }}>{isGhost?'R$ —,——':fmtR(item.vItemPIS)}</td>
                        <td style={{ padding:'7px 10px', color:isGhost?S.ghostText:item.vItemCOFINS>0?S.red:S.muted }}>{isGhost?'R$ —,——':fmtR(item.vItemCOFINS)}</td>
                        <td style={{ padding:'7px 10px' }}>
                          {isGhost
                            ? <span style={{ background:S.ghost, color:S.ghostText, border:`1px solid ${S.border}`, borderRadius:99, padding:'2px 10px', fontSize:10, fontWeight:700 }}>Classificacao</span>
                            : <Badge tipo={item.monofasico ? ((item.pendentePGDAS && !pgdasSupabase && !pgdasResult) ? 'pendente' : 'monofasico') : 'nao_monofasico'} />}
                        </td>
                        <td style={{ padding:'7px 10px', position:'relative' }}>
                          {!isGhost && (
                            <>
                              <button onClick={e=>{e.stopPropagation();setMenuAberto(menuAberto===idx?null:idx)}}
                                style={{ background:'none', border:`1px solid ${S.border}`, borderRadius:4, cursor:'pointer', padding:'2px 8px', fontSize:13, color:S.muted }}>...</button>
                              {menuAberto===idx && (
                                <div style={{ position:'absolute', right:8, top:30, background:S.white, border:`1px solid ${S.border}`, borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:100, minWidth:140 }}>
                                  <button onClick={()=>{alert('NCM: '+item.ncm+'\nDescricao: '+item.descricao+'\nMonofasico: '+(item.monofasico?'Sim':'Nao'));setMenuAberto(null)}}
                                    style={{ display:'block', width:'100%', padding:'8px 14px', background:'none', border:'none', textAlign:'left', fontSize:12, cursor:'pointer', color:S.text }}>Ver detalhes</button>
                                  <button onClick={()=>{toggleItem(idx);setMenuAberto(null)}}
                                    style={{ display:'block', width:'100%', padding:'8px 14px', background:'none', border:'none', textAlign:'left', fontSize:12, cursor:'pointer', color:S.text }}>{sel?'Desselecionar':'Selecionar'}</button>
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!temResultado && (
              <div style={{ padding:'16px 20px', borderTop:`1px solid ${S.border}`, textAlign:'center', fontSize:12, color:S.ghostText }}>
                Importe arquivos XML de NF-e para visualizar os itens e identificar monofasicos
              </div>
            )}
            <div style={{ padding:'10px 16px', borderTop:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12, color:S.muted, flexWrap:'wrap', gap:8 }}>
              <span>{temResultado ? `${itensFiltrados.length} itens — Pagina ${pagina} de ${totalPaginas}` : 'Aguardando importacao de arquivos'}</span>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                {[['«',()=>setPagina(1),pagina===1||!temResultado],['<',()=>setPagina(p=>Math.max(1,p-1)),pagina===1||!temResultado],['>',()=>setPagina(p=>Math.min(totalPaginas,p+1)),pagina===totalPaginas||!temResultado],['»',()=>setPagina(totalPaginas),pagina===totalPaginas||!temResultado]].map(([l,fn,dis],i)=>(
                  <button key={i} onClick={fn} disabled={dis} style={{ padding:'4px 8px', border:`1px solid ${S.border}`, borderRadius:4, background:'none', cursor:dis?'not-allowed':'pointer', color:dis?'#CBD5E1':S.text }}>{l}</button>
                ))}
                <select value={porPagina} onChange={e=>{const n=Number(e.target.value);setPorPagina(n);setPagina(1)}}
                  style={{ marginLeft:8, padding:'3px 8px', border:`1px solid ${S.border}`, borderRadius:4, fontSize:12, outline:'none', cursor:'pointer' }}>
                  {[10,25,50,100].map(n=><option key={n} value={n}>{n} por pagina</option>)}
                </select>
              </div>
            </div>
          </div>

          {regime === 'Simples Nacional' && (
            <div style={{ background:S.white, borderRadius:10, border:`1px solid ${S.border}`, marginBottom:16, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${S.border}`, background:'#fff7ed' }}>
                <div style={{ fontSize:14, fontWeight:700, color:S.orange }}>PGDAS-D — Calcular Credito de Segregacao</div>
                <div style={{ fontSize:12, color:S.muted, marginTop:2 }}>Informe os dados do PGDAS-D para calcular o credito recuperavel de receitas monofasicas.</div>
              </div>
              <div style={{ padding:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:12 }}>
                  {[
                    { label:'* Receita Bruta Total (R$)',        key:'receita_bruta_total' },
                    { label:'* Receita Monofasica (R$)',          key:'receita_monofasica'  },
                    { label:'Receita c/ Subst. Tributaria (R$)', key:'receita_st'          },
                    { label:'* DAS Recolhido (R$)',               key:'das_recolhido'       },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <div style={{ fontSize:11, color:S.muted, marginBottom:4, fontWeight:600 }}>{label}</div>
                      <input type="text"
                        value={pgdasForm[key] ? parseFloat(pgdasForm[key]||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : ''}
                        onChange={e => { const raw=e.target.value.replace(/\D/g,''); const num=(parseInt(raw||'0')/100).toFixed(2); setPgdasForm(prev=>({...prev,[key]:num})) }}
                        placeholder="R$ 0,00"
                        style={{ width:'100%', padding:'7px 10px', border:`1px solid ${S.border}`, borderRadius:6, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  ))}
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginBottom:12 }}>
                  <input type="checkbox" checked={pgdasForm.segregou} onChange={e=>setPgdasForm(prev=>({...prev,segregou:e.target.checked}))} />
                  Segregou receitas monofasicas corretamente no PGDAS-D
                </label>
                <button onClick={calcularPGDAS} style={{ padding:'8px 20px', background:S.navy, color:S.white, border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Calcular Credito
                </button>
                {pgdasResult && (
                  <div style={{ marginTop:16, background:pgdasResult.diferenca>0?'#f0fdf4':S.bg, border:`1px solid ${pgdasResult.diferenca>0?'#86efac':S.border}`, borderRadius:8, padding:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:pgdasResult.diferenca>0?S.green:S.muted, marginBottom:10 }}>
                      {pgdasResult.diferenca>0?'Oportunidade identificada!':'Nenhuma diferenca encontrada'}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
                      {[
                        { label:'Receita Bruta Total',   valor:fmtR(pgdasResult.rb)         },
                        { label:'Receita Monofasica',    valor:fmtR(pgdasResult.rm)         },
                        { label:'DAS Recolhido',         valor:fmtR(pgdasResult.das)        },
                        { label:'DAS Correto Estimado',  valor:fmtR(pgdasResult.dasCorreto) },
                        { label:'Diferenca Recuperavel', valor:fmtR(pgdasResult.diferenca), destaque:true },
                        { label:'Segregou Corretamente', valor:pgdasResult.segregou?'Sim':'Nao' },
                      ].map((k,i) => (
                        <div key={i} style={{ background:S.white, borderRadius:6, padding:'8px 12px', border:`1px solid ${S.border}` }}>
                          <div style={{ fontSize:10, color:S.muted, marginBottom:2 }}>{k.label}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:k.destaque?S.green:S.text }}>{k.valor}</div>
                        </div>
                      ))}
                    </div>
                    {pgdasResult.diferenca>0 && (
                      <div style={{ marginTop:10, background:'#dcfce7', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#166534' }}>
                        <strong>Como recuperar:</strong> Retifique o PGDAS-D e solicite restituicao via PER/DCOMP junto a Receita Federal.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {temResultado && (
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {!diagAberto && (
                <button onClick={() => setModalNome(true)} disabled={salvando}
                  style={{ padding:'9px 20px', background:S.navy, color:S.white, border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:salvando?'not-allowed':'pointer', opacity:salvando?0.7:1 }}>
                  {salvando?'Salvando...':'Salvar Diagnostico'}
                </button>
              )}
              <button onClick={novaAnalise} style={{ padding:'9px 16px', background:'none', border:`1px solid ${S.border}`, borderRadius:6, fontSize:13, cursor:'pointer', color:S.muted }}>Nova analise</button>
            </div>
          )}
        </>
      )}

      {aba === 'historico' && (
        <div style={{ background:S.white, borderRadius:10, border:`1px solid ${S.border}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${S.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Historico de Diagnosticos</div>
            <button onClick={carregarHistorico} style={{ padding:'6px 12px', background:'none', border:`1px solid ${S.border}`, borderRadius:6, fontSize:12, cursor:'pointer', color:S.muted }}>Atualizar</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, padding:16, borderBottom:`1px solid ${S.border}` }}>
            {loadingHistorico ? Array(3).fill(null).map((_, i) => <SkeletonKPI key={i} />) : (
              [
                { label:'Diagnosticos salvos',      valor: historico.length,                                            cor: S.navy   },
                { label:'Potencial total',           valor: fmtR(historico.reduce((s,d)=>s+(d.credito_estimado||0),0)), cor: S.green  },
                { label:'Total de itens analisados', valor: historico.reduce((s,d)=>s+(d.total_itens||0),0),            cor: S.orange },
              ].map((k,i) => (
                <div key={i} style={{ background:S.bg, borderRadius:8, padding:'12px 14px', border:`1px solid ${S.border}`, textAlign:'center' }}>
                  <div style={{ fontSize:i===1?14:20, fontWeight:700, color:k.cor }}>{k.valor}</div>
                  <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>{k.label}</div>
                </div>
              ))
            )}
          </div>
          {!loadingHistorico && historico.length === 0 ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Nenhum diagnostico salvo</div>
              <div style={{ fontSize:13, color:S.muted, marginBottom:16 }}>Importe arquivos, analise e salve o diagnostico para aparecer aqui</div>
              <button onClick={()=>setAba('importar')} style={{ padding:'8px 20px', background:S.navy, color:S.white, border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' }}>Novo Diagnostico</button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:S.thBg }}>
                    {['Nome','Data','Periodo','Arquivos','Itens','Monofasicos','Receita Mono','Potencial','Status','Acoes'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:S.thText, fontWeight:600, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingHistorico ? Array(5).fill(null).map((_, i) => <SkeletonRow key={i} cols={10} />) : (
                    historicoExibir.map((diag, i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${S.border}`, background: diag.ghost ? S.ghost : i%2===0 ? S.white : '#FAFAFA' }}>
                        <td style={{ padding:'7px 10px', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: diag.ghost ? S.ghostText : S.navy, fontWeight: diag.ghost ? 400 : 600 }}>
                          {diag.ghost ? 'Nome do diagnostico' : (diag.nome_diagnostico || '—')}
                        </td>
                        <td style={{ padding:'7px 10px', whiteSpace:'nowrap', color: diag.ghost ? S.ghostText : S.text }}>{diag.ghost ? '—' : fmtData(diag.created_at)}</td>
                        <td style={{ padding:'7px 10px', color: diag.ghost ? S.ghostText : S.text }}>{diag.ghost ? 'MM/AAAA' : `${diag.periodo_inicio}${diag.periodo_fim&&diag.periodo_fim!==diag.periodo_inicio?` -> ${diag.periodo_fim}`:''}`}</td>
                        <td style={{ padding:'7px 10px', color: diag.ghost ? S.ghostText : S.text }}>{diag.ghost ? '—' : `${(diag.arquivos_importados||[]).length} arquivo(s)`}</td>
                        <td style={{ padding:'7px 10px', color: diag.ghost ? S.ghostText : S.text }}>{diag.ghost ? '—' : diag.total_itens}</td>
                        <td style={{ padding:'7px 10px', color: diag.ghost ? S.ghostText : S.orange, fontWeight: diag.ghost ? 400 : 700 }}>{diag.ghost ? '—' : diag.total_monofasicos}</td>
                        <td style={{ padding:'7px 10px', color: diag.ghost ? S.ghostText : S.text }}>{diag.ghost ? 'R$ —,——' : fmtR(diag.receita_monofasica)}</td>
                        <td style={{ padding:'7px 10px', fontWeight: diag.ghost ? 400 : 700, color: diag.ghost ? S.ghostText : (diag.credito_estimado||0)>0 ? S.green : S.muted }}>{diag.ghost ? 'R$ —,——' : fmtR(diag.credito_estimado)}</td>
                        <td style={{ padding:'7px 10px' }}>
                          {diag.ghost
                            ? <span style={{ background:S.ghost, color:S.ghostText, border:`1px solid ${S.border}`, borderRadius:99, padding:'2px 10px', fontSize:10, fontWeight:700 }}>Aguardando</span>
                            : <Badge tipo={diag.status||'concluido'} />}
                        </td>
                        <td style={{ padding:'7px 10px' }}>
                          {!diag.ghost && (
                            <div style={{ display:'flex', gap:4 }}>
                              <button onClick={()=>abrirDiagnostico(diag)} style={{ padding:'4px 10px', background:S.navy, color:S.white, border:'none', borderRadius:4, fontSize:11, fontWeight:600, cursor:'pointer' }}>Abrir</button>
                              <button onClick={()=>excluirDiagnostico(diag.id)} style={{ padding:'4px 10px', background:'#fef2f2', color:S.red, border:`1px solid #fecaca`, borderRadius:4, fontSize:11, cursor:'pointer' }}>Excluir</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}