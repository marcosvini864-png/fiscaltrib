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
  return { competencia: competencia.slice(0, 7), cnpj, totalDebito, totalCredito, totalRecolher, valido: !!competencia }
}

function parseSPED(txtStr, tipo) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const result = { tipo, registros: {}, competencia: '', cnpj: '', razaoSocial: '', totalReceita: 0, totalPIS: 0, totalCOFINS: 0, totalICMS: 0, totalIPI: 0, totalEntradas: 0, totalSaidas: 0, linhasLidas: linhas.length, valido: false }
  linhas.forEach(linha => {
    const campos = linha.split('|').filter((_, i) => i > 0)
    const reg = campos[0]
    if (!result.registros[reg]) result.registros[reg] = 0
    result.registros[reg]++
    if (reg === '0000') { result.cnpj = campos[5] || ''; result.razaoSocial = campos[6] || ''; const dtIni = campos[2] || ''; result.competencia = dtIni ? `${dtIni.slice(4,8)}-${dtIni.slice(2,4)}` : ''; result.valido = true }
    if (reg === 'C100') { const ind = campos[1] || ''; const vDoc = parseFloat(campos[10] || 0); if (ind === '0') result.totalEntradas += vDoc; if (ind === '1') result.totalSaidas += vDoc }
    if (reg === 'E110') result.totalICMS += parseFloat(campos[12] || 0)
    if (reg === 'E520') result.totalIPI += parseFloat(campos[4] || 0)
    if (reg === 'M200') result.totalPIS += parseFloat(campos[1] || 0)
    if (reg === 'M600') result.totalCOFINS += parseFloat(campos[1] || 0)
  })
  return result
}

function parseECDECF(txtStr, tipo) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const result = { tipo, competencia: '', cnpj: '', razaoSocial: '', totalAtivo: 0, totalPassivo: 0, totalReceita: 0, totalDespesa: 0, lucroLiquido: 0, irpj: 0, csll: 0, linhasLidas: linhas.length, registros: {}, valido: false }
  linhas.forEach(linha => {
    const campos = linha.split('|').filter((_, i) => i > 0)
    const reg = campos[0]
    if (!result.registros[reg]) result.registros[reg] = 0
    result.registros[reg]++
    if (reg === '0000') { result.cnpj = campos[5] || campos[4] || ''; result.razaoSocial = campos[6] || campos[5] || ''; const dtIni = campos[2] || ''; result.competencia = dtIni ? `${dtIni.slice(4,8)}-${dtIni.slice(2,4)}` : ''; result.valido = true }
    if (reg === 'P100') result.lucroLiquido += parseFloat(campos[6] || 0)
    if (reg === 'P150') { result.irpj += parseFloat(campos[3] || 0); result.csll += parseFloat(campos[4] || 0) }
  })
  return result
}

function parseExtratoDébitos(txtStr) {
  const linhas = txtStr.split('\n').map(l => l.trim()).filter(Boolean)
  const debitos = []
  let totalDebito = 0, cnpj = ''
  linhas.forEach(linha => {
    const cnpjMatch = linha.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
    if (cnpjMatch && !cnpj) cnpj = cnpjMatch[0]
    const valorMatch = linha.match(/R?\$?\s*([\d.,]+)/)
    if (valorMatch) {
      const valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) || 0
      if (valor > 0 && valor < 999999999) {
        const tributo = linha.includes('IRPJ') ? 'IRPJ' : linha.includes('CSLL') ? 'CSLL' : linha.includes('PIS') ? 'PIS' : linha.includes('COFINS') ? 'COFINS' : linha.includes('INSS') ? 'INSS' : linha.includes('DAS') ? 'DAS' : 'Tributo'
        const situacao = linha.toLowerCase().includes('parcel') ? 'Parcelado' : linha.toLowerCase().includes('inscrit') ? 'Dívida Ativa' : 'Em aberto'
        debitos.push({ tributo, valor, situacao })
        totalDebito += valor
      }
    }
  })
  return { cnpj, debitos, totalDebito, linhasLidas: linhas.length, valido: debitos.length > 0 }
}

function agruparNFePorCompetencia(nfes) {
  const map = {}
  nfes.forEach(nf => {
    if (!map[nf.competencia]) map[nf.competencia] = { competencia: nf.competencia, qtd: 0, vNF: 0, vICMS: 0, vPIS: 0, vCOFINS: 0, vISS: 0 }
    map[nf.competencia].qtd++; map[nf.competencia].vNF += nf.vNF; map[nf.competencia].vICMS += nf.vICMS
    map[nf.competencia].vPIS += nf.vPIS; map[nf.competencia].vCOFINS += nf.vCOFINS; map[nf.competencia].vISS += nf.vISS
  })
  return Object.values(map).sort((a, b) => a.competencia.localeCompare(b.competencia))
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtCNPJ = v => v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')

// ─── TESES POR REGIME ───────────────────────────────────────────────────────

const TESES_REGIME = {
  'Simples Nacional': ['Exclusão ICMS-ST da Base do Simples', 'Receitas Monofásicas Tributadas Indevidamente', 'Segregação de Receitas por Anexo Incorreto', 'Fator R — Migração Anexo V para III', 'ISS Fixo para Profissional Autônomo'],
  'Lucro Presumido': ['Exclusão do ICMS da Base PIS/COFINS (Tema 69)', 'Base de Presunção IRPJ/CSLL Incorreta', 'Retenções na Fonte não Compensadas', 'Distribuição de Lucros sem IR', 'PIS/COFINS sobre Receitas Financeiras'],
  'Lucro Real': ['Créditos PIS/COFINS Não Cumulativos', 'JCP — Juros sobre Capital Próprio', 'Compensação de Prejuízos Fiscais', 'Exclusão do ICMS da Base PIS/COFINS (Tema 69)', 'Depreciação Acelerada de Ativos'],
}

// ─── RAIO-X TRIBUTÁRIO ──────────────────────────────────────────────────────

function RaioXTributario({ clienteId, cliente, entradas, origem, onIniciarRecuperacao, onDiagnostico, onRelatorio }) {
  const [scoreData,    setScoreData]    = useState(null)
  const [obrigacoes,   setObrigacoes]   = useState(null)
  const [criando,      setCriando]      = useState(false)
  const [criado,       setCriado]       = useState(false)
  const hoje = new Date()

  useEffect(() => { calcularDados() }, [entradas])

  async function calcularDados() {
    // Score simples baseado nas entradas
    const score = Math.min(100, Math.max(0, 50 + entradas.length * 5))
    setScoreData(score)

    // Obrigações do monitor
    const { data: obs } = await supabase.from('monitor_obrigacoes').select('*').eq('cliente_id', clienteId).eq('competencia', new Date().toISOString().slice(0, 7))
    setObrigacoes(obs || [])
  }

  // Créditos
  const creditosBaixo   = entradas.filter(e => e.risco === 'baixo' && e.credito > 0)
  const creditosMedio   = entradas.filter(e => e.risco === 'medio' && e.credito > 0)
  const creditosAlto    = entradas.filter(e => e.risco === 'alto'  && e.credito > 0)
  const totalCreditos   = entradas.reduce((s, e) => s + (e.credito || 0), 0)
  const potencial       = creditosBaixo.reduce((s, e) => s + (e.credito || 0), 0) + creditosMedio.reduce((s, e) => s + (e.credito || 0), 0) * 0.7

  // Prazos críticos
  const criticos = entradas.filter(e => {
    if (!e.competencia || e.credito <= 0) return false
    const [a, m] = e.competencia.split('-')
    const lim = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    const dias = Math.round((lim - hoje) / (1000 * 60 * 60 * 24))
    return dias <= 180 && dias > 0
  }).map(e => {
    const [a, m] = e.competencia.split('-')
    const lim = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    const dias = Math.round((lim - hoje) / (1000 * 60 * 60 * 24))
    return { ...e, dias, lim }
  })

  // Teses
  const teses = TESES_REGIME[cliente?.regime] || []

  // Obrigações
  const entregues = (obrigacoes || []).filter(o => o.status === 'entregue').length
  const pendentes = (obrigacoes || []).filter(o => o.status === 'pendente').length
  const atrasadas = (obrigacoes || []).filter(o => o.status === 'atraso').length

  // Score classificação
  const score = scoreData || 0
  const scoreCor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : score >= 40 ? '#f97316' : '#dc2626'
  const scoreLabel = score >= 80 ? 'Excelente' : score >= 60 ? 'Boa Saúde Tributária' : score >= 40 ? 'Atenção Necessária' : 'Situação Crítica'

  async function iniciarRecuperacao() {
    setCriando(true)
    try {
      const maisRelevante = entradas.filter(e => e.credito > 0).sort((a, b) => (b.credito || 0) - (a.credito || 0))[0]
      await supabase.from('recuperacoes').insert({
        cliente_id: clienteId,
        competencia: maisRelevante?.competencia || new Date().toISOString().slice(0, 7),
        tributo: maisRelevante?.tributo || 'A definir',
        valor_credito: totalCreditos,
        potencial_recuperavel: potencial,
        tese_aplicada: teses[0] || 'A definir',
        risco: creditosBaixo.length > 0 ? 'baixo' : 'medio',
        origem: origem || 'Manual',
        status: 'Diagnóstico Concluído',
        score_fiscal: score,
        observacoes: `Raio-X automático. ${entradas.length} competências analisadas.`,
      })
      setCriado(true)
      if (onIniciarRecuperacao) onIniciarRecuperacao()
    } catch (e) {
      alert('Erro ao criar recuperação: ' + e.message)
    } finally {
      setCriando(false)
    }
  }

  return (
    <div style={{ marginTop: 32 }}>

      {/* Header Raio-X */}
      <div style={{ background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — ANÁLISE AUTOMÁTICA</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, color: '#fff' }}>⚡ Raio-X Tributário</h2>
        <div style={{ fontSize: 15, color: '#9db8d8', marginBottom: 16 }}>
          Cliente: <strong style={{ color: '#fff' }}>{cliente?.razao_social}</strong>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#9db8d8' }}>
          <span>📋 Regime: <strong style={{ color: '#4ade80' }}>{cliente?.regime}</strong></span>
          <span>📊 Competências analisadas: <strong style={{ color: '#4ade80' }}>{entradas.length}</strong></span>
          <span>📥 Origem: <strong style={{ color: '#4ade80' }}>{origem}</strong></span>
        </div>
      </div>

      {/* Grid de resultados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>

        {/* Score Fiscal */}
        <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${scoreCor}`, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>📊 SCORE FISCAL</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: scoreCor, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>de 100 pontos</div>
          <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, marginBottom: 8 }}>
            <div style={{ background: scoreCor, borderRadius: 99, height: 8, width: `${score}%` }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: scoreCor }}>{scoreLabel}</div>
        </div>

        {/* Créditos Identificados */}
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #86efac', padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>💰 CRÉDITOS IDENTIFICADOS</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', marginBottom: 12 }}>{fmtR(totalCreditos)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 Baixo risco</span>
              <span style={{ fontWeight: 700 }}>{creditosBaixo.length} ({fmtR(creditosBaixo.reduce((s, e) => s + e.credito, 0))})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#d97706', fontWeight: 600 }}>🟡 Médio risco</span>
              <span style={{ fontWeight: 700 }}>{creditosMedio.length} ({fmtR(creditosMedio.reduce((s, e) => s + e.credito, 0))})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>🔴 Alto risco</span>
              <span style={{ fontWeight: 700 }}>{creditosAlto.length} ({fmtR(creditosAlto.reduce((s, e) => s + e.credito, 0))})</span>
            </div>
          </div>
        </div>

        {/* Potencial Recuperável */}
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #bfdbfe', padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>📈 POTENCIAL RECUPERÁVEL</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1e40af', marginBottom: 12 }}>{fmtR(potencial)}</div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            Estimativa considerando créditos de baixo risco (100%) e médio risco (70%).
          </div>
          <div style={{ marginTop: 12, background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e40af', fontWeight: 700 }}>
            {((potencial / (totalCreditos || 1)) * 100).toFixed(0)}% do total identificado
          </div>
        </div>

        {/* Teses Elegíveis */}
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #ddd6fe', padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>📚 TESES ELEGÍVEIS</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed', marginBottom: 12 }}>{teses.length} teses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {teses.slice(0, 4).map((t, i) => (
              <div key={i} style={{ fontSize: 12, color: '#374151', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>✓</span>{t}
              </div>
            ))}
            {teses.length > 4 && <div style={{ fontSize: 12, color: '#94a3b8' }}>+{teses.length - 4} mais...</div>}
          </div>
        </div>

        {/* Prazos Prescricionais */}
        <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${criticos.length > 0 ? '#fecdd3' : '#e2e8f0'}`, padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>⏳ PRAZOS PRESCRICIONAIS</div>
          {criticos.length === 0 ? (
            <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>✅ Nenhum prazo crítico</div>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626', marginBottom: 12 }}>{criticos.length} crítico(s)</div>
              {criticos.slice(0, 3).map((c, i) => (
                <div key={i} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>{c.competencia} — {c.tributo}</div>
                  <div style={{ color: '#64748b' }}>Vence em {c.dias} dias ({c.lim.toLocaleDateString('pt-BR')})</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Obrigações Fiscais */}
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>📋 OBRIGAÇÕES FISCAIS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>✅ Entregues</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#16a34a' }}>{entregues}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#d97706', fontWeight: 600 }}>⏳ Pendentes</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#d97706' }}>{pendentes}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 600 }}>🔴 Em atraso</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{atrasadas}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Próximas Ações */}
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e3a5f', marginBottom: 20 }}>🎯 Próximas Ações Recomendadas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <button onClick={onDiagnostico} style={{ padding: '14px 20px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#1e40af', cursor: 'pointer', textAlign: 'left' }}>
            🟢 Gerar Diagnóstico Completo
          </button>
          <button onClick={onRelatorio} style={{ padding: '14px 20px', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#166534', cursor: 'pointer', textAlign: 'left' }}>
            🟢 Emitir Relatório Executivo
          </button>
          <button style={{ padding: '14px 20px', background: '#f5f3ff', border: '2px solid #ddd6fe', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#5b21b6', cursor: 'pointer', textAlign: 'left' }}>
            🟢 Ver Teses Tributárias Elegíveis
          </button>
          <button style={{ padding: '14px 20px', background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#92400e', cursor: 'pointer', textAlign: 'left' }}>
            🟢 Verificar Prazos Prescricionais
          </button>
        </div>
      </div>

      {/* Botão Iniciar Recuperação */}
      {!criado ? (
        <button
          onClick={iniciarRecuperacao}
          disabled={criando || totalCreditos === 0}
          style={{ width: '100%', padding: '18px 0', background: totalCreditos > 0 ? 'linear-gradient(135deg, #1e3a5f, #2563eb)' : '#e2e8f0', color: totalCreditos > 0 ? '#fff' : '#94a3b8', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 900, cursor: totalCreditos > 0 ? 'pointer' : 'default', letterSpacing: 0.5 }}
        >
          {criando ? '⏳ Criando processo...' : totalCreditos > 0 ? '🚀 Iniciar Processo de Recuperação' : '⚠️ Nenhum crédito identificado para recuperação'}
        </button>
      ) : (
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>✅ Processo de Recuperação Criado!</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Acesse o módulo <strong>Gestão de Recuperações</strong> para acompanhar o andamento.</div>
        </div>
      )}
    </div>
  )
}

// ─── ABAS ───────────────────────────────────────────────────────────────────

const ABAS = [
  { id: 'nfe',     icon: '🧾', label: 'XML NF-e em lote',    tipo: 'xml'    },
  { id: 'pgdas',   icon: '📋', label: 'PGDAS-D (Simples)',   tipo: 'xml'    },
  { id: 'das',     icon: '💳', label: 'DAS Pagos',           tipo: 'manual' },
  { id: 'dctfweb', icon: '📑', label: 'DCTFWeb',             tipo: 'xml'    },
  { id: 'sped_f',  icon: '📂', label: 'SPED Fiscal',         tipo: 'txt'    },
  { id: 'sped_c',  icon: '📂', label: 'SPED Contribuições',  tipo: 'txt'    },
  { id: 'ecd',     icon: '📊', label: 'ECD',                 tipo: 'txt'    },
  { id: 'ecf',     icon: '📈', label: 'ECF',                 tipo: 'txt'    },
  { id: 'debitos', icon: '⚠️', label: 'Extrato de Débitos',  tipo: 'txt'    },
]

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────

export default function CentralImportacoes({ abaInicial = 'nfe', onDiagnostico, onRelatorio, onRecuperacao }) {
  const [aba,       setAba]       = useState(abaInicial)
  const [clientes,  setClientes]  = useState([])
  const [clienteId, setClienteId] = useState('')
  const [entradas,  setEntradas]  = useState([])
  const [salvo,     setSalvo]     = useState(false)
  const [origem,    setOrigem]    = useState('Manual')

  useEffect(() => { setAba(abaInicial) }, [abaInicial])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('clientes').select('id, razao_social, regime, cnpj').eq('usuario_id', user.id).order('razao_social')
        .then(({ data }) => setClientes(data || []))
    })
  }, [])

  useEffect(() => {
    if (clienteId) carregarEntradas()
  }, [clienteId])

  async function carregarEntradas() {
    const { data } = await supabase.from('entradas').select('*').eq('cliente_id', clienteId)
    setEntradas(data || [])
  }

  function onSalvo(origemImportacao) {
    setSalvo(true)
    setOrigem(origemImportacao)
    carregarEntradas()
  }

  const cliente = clientes.find(c => c.id === clienteId)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 50%, #1a4f7a 100%)', borderRadius: '0 0 24px 24px', padding: '36px 40px 40px', marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, color: '#9db8d8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — AUTOMAÇÃO FISCAL</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, color: '#fff' }}>📥 Central de Importações</h1>
          <p style={{ fontSize: 16, color: '#9db8d8', marginBottom: 28, lineHeight: 1.6, maxWidth: 560 }}>
            Importe arquivos fiscais e receba instantaneamente o <strong style={{ color: '#4ade80' }}>Raio-X Tributário Automático</strong> do seu cliente.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              { valor: 'XML NF-e', label: 'Importação em lote',      cor: '#4ade80' },
              { valor: 'PGDAS-D',  label: 'Simples Nacional',         cor: '#60a5fa' },
              { valor: 'SPED',     label: 'Fiscal e Contribuições',   cor: '#fbbf24' },
              { valor: '⚡ Auto',  label: 'Raio-X Tributário',        cor: '#f472b6' },
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
        <select value={clienteId} onChange={e => { setClienteId(e.target.value); setSalvo(false) }}
          style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc' }}>
          <option value="">— Selecione um cliente —</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} ({c.regime})</option>)}
        </select>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setSalvo(false) }}
            style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `2px solid ${aba === a.id ? '#1e3a5f' : '#e2e8f0'}`, background: aba === a.id ? '#1e3a5f' : '#fff', color: aba === a.id ? '#fff' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
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
          <div style={{ fontSize: 14, marginTop: 8 }}>Após a importação, o Raio-X Tributário será gerado automaticamente</div>
        </div>
      ) : (
        <>
          {aba === 'nfe'     && <AbaXMLNFe    clienteId={clienteId} cliente={cliente} onSalvo={() => onSalvo('XML NF-e')} />}
          {aba === 'pgdas'   && <AbaPGDAS     clienteId={clienteId} cliente={cliente} onSalvo={() => onSalvo('PGDAS-D')} />}
          {aba === 'das'     && <AbaDAS       clienteId={clienteId}                   onSalvo={() => onSalvo('DAS')} />}
          {aba === 'dctfweb' && <AbaDCTFWeb   clienteId={clienteId} cliente={cliente} onSalvo={() => onSalvo('DCTFWeb')} />}
          {aba === 'sped_f'  && <AbaSPED      clienteId={clienteId} cliente={cliente} tipo="SPED Fiscal"        onSalvo={() => onSalvo('SPED Fiscal')} />}
          {aba === 'sped_c'  && <AbaSPED      clienteId={clienteId} cliente={cliente} tipo="SPED Contribuições" onSalvo={() => onSalvo('SPED Contribuições')} />}
          {aba === 'ecd'     && <AbaECDECF    clienteId={clienteId} cliente={cliente} tipo="ECD"               onSalvo={() => onSalvo('ECD')} />}
          {aba === 'ecf'     && <AbaECDECF    clienteId={clienteId} cliente={cliente} tipo="ECF"               onSalvo={() => onSalvo('ECF')} />}
          {aba === 'debitos' && <AbaDebitos   clienteId={clienteId} cliente={cliente}                          onSalvo={() => onSalvo('Extrato Débitos')} />}

          {/* RAIO-X AUTOMÁTICO */}
          {salvo && (
            <RaioXTributario
              clienteId={clienteId}
              cliente={cliente}
              entradas={entradas}
              origem={origem}
              onIniciarRecuperacao={onRecuperacao}
              onDiagnostico={onDiagnostico}
              onRelatorio={onRelatorio}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── ABAS DE IMPORTAÇÃO ─────────────────────────────────────────────────────

function AbaXMLNFe({ clienteId, onSalvo }) {
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
        await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: comp.competencia, tributo: 'NF-e importada', receita_bruta: comp.vNF, tributo_pago: comp.vICMS + comp.vPIS + comp.vCOFINS + comp.vISS, tributo_devido: comp.vICMS + comp.vPIS + comp.vCOFINS + comp.vISS, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true)
      if (onSalvo) onSalvo()
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
      {erros.length > 0 && <ErroBanner erros={erros} />}
      {nfes.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[{ label: 'NF-e lidas', valor: nfes.length, cor: '#1e3a5f' }, { label: 'Faturamento', valor: fmtR(nfes.reduce((s, n) => s + n.vNF, 0)), cor: '#16a34a' }, { label: 'ICMS total', valor: fmtR(nfes.reduce((s, n) => s + n.vICMS, 0)), cor: '#d97706' }, { label: 'PIS+COFINS', valor: fmtR(nfes.reduce((s, n) => s + n.vPIS + n.vCOFINS, 0)), cor: '#7c3aed' }].map((c, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '16px 20px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.cor }}>{c.valor}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
          {salvo ? <SalvoRaioX /> : <BotoesAcao onLimpar={() => { setNfes([]); setErros([]) }} onSalvar={salvarEntradas} salvando={salvando} />}
        </div>
      )}
    </div>
  )
}

function AbaPGDAS({ clienteId, cliente, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => { const r = parsePGDAS(e.target.result); if (r.valido) setDados(r); else setErro('XML não reconhecido como PGDAS-D.') }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo: 'DAS', receita_bruta: dados.receitaBruta, tributo_pago: dados.dasDevido, tributo_devido: dados.dasDevido, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="📋" titulo="Importar PGDAS-D em XML" sub="Selecione o arquivo XML exportado do portal do Simples Nacional" accept=".xml" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <GridCards items={[{ label: 'Competência', valor: dados.competencia }, { label: 'Receita Bruta', valor: fmtR(dados.receitaBruta) }, { label: 'DAS Devido', valor: fmtR(dados.dasDevido) }, { label: 'Alíquota', valor: dados.aliquota ? `${dados.aliquota.toFixed(2)}%` : '—' }]} />
      <div style={{ marginTop: 16 }}>{salvo ? <SalvoRaioX /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div>
    </div>}
  </AbaUpload>
}

function AbaDAS({ clienteId, onSalvo }) {
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
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { alert('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <div>
    <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 }}>💳 Registrar DAS Pagos</div>
      {linhas.map((l, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 10, alignItems: 'center' }}>
        <input type="month" value={l.competencia} onChange={e => updLinha(i, 'competencia', e.target.value)} style={inputStyle} />
        <input value={l.valor} onChange={e => updLinha(i, 'valor', maskMoeda(e.target.value))} placeholder="0,00" style={inputStyle} />
        <select value={l.situacao} onChange={e => updLinha(i, 'situacao', e.target.value)} style={inputStyle}>
          <option value="pago">✅ Pago</option><option value="pendente">⏳ Pendente</option><option value="atraso">🔴 Em atraso</option>
        </select>
        <button onClick={() => remLinha(i)} style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#dc2626', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>✕</button>
      </div>)}
      <button onClick={addLinha} style={{ padding: '10px 20px', background: '#f8fafc', border: '2px dashed #e2e8f0', color: '#64748b', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600, width: '100%', marginTop: 8 }}>+ Adicionar competência</button>
    </div>
    {salvo ? <SalvoRaioX /> : <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, width: '100%' }}>{salvando ? 'Salvando...' : '💾 Salvar DAS no sistema'}</button>}
  </div>
}

function AbaDCTFWeb({ clienteId, cliente, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => { const r = parseDCTFWeb(e.target.result); if (r.valido) setDados(r); else setErro('Arquivo não reconhecido como DCTFWeb.') }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo: 'DCTFWeb', receita_bruta: 0, tributo_pago: dados.totalRecolher, tributo_devido: dados.totalDebito, credito: Math.max(0, dados.totalCredito - dados.totalDebito), tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="📑" titulo="Importar DCTFWeb em XML" sub="Selecione o arquivo XML da DCTFWeb exportado do e-CAC" accept=".xml" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <GridCards items={[{ label: 'Competência', valor: dados.competencia }, { label: 'Total Débitos', valor: fmtR(dados.totalDebito) }, { label: 'Total Créditos', valor: fmtR(dados.totalCredito) }, { label: 'Total a Recolher', valor: fmtR(dados.totalRecolher) }]} />
      <div style={{ marginTop: 16 }}>{salvo ? <SalvoRaioX /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div>
    </div>}
  </AbaUpload>
}

function AbaSPED({ clienteId, cliente, tipo, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => { const r = parseSPED(e.target.result, tipo); if (r.valido) setDados(r); else setErro(`Arquivo não reconhecido como ${tipo}.`) }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      const tributo = tipo === 'SPED Fiscal' ? 'ICMS' : 'PIS/COFINS'
      const pago = tipo === 'SPED Fiscal' ? dados.totalICMS : dados.totalPIS + dados.totalCOFINS
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo, receita_bruta: dados.totalSaidas, tributo_pago: pago, tributo_devido: pago, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="📂" titulo={`Importar ${tipo}`} sub={`Selecione o arquivo TXT do ${tipo}`} accept=".txt" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <GridCards items={[{ label: 'Competência', valor: dados.competencia || '—' }, { label: 'Linhas lidas', valor: dados.linhasLidas.toLocaleString() }, { label: 'Total Entradas', valor: fmtR(dados.totalEntradas) }, { label: 'Total Saídas', valor: fmtR(dados.totalSaidas) }]} />
      <div style={{ marginTop: 16 }}>{salvo ? <SalvoRaioX /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div>
    </div>}
  </AbaUpload>
}

function AbaECDECF({ clienteId, cliente, tipo, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => { const r = parseECDECF(e.target.result, tipo); if (r.valido) setDados(r); else setErro(`Arquivo não reconhecido como ${tipo}.`) }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: dados.competencia, tributo: tipo === 'ECF' ? 'IRPJ/CSLL' : 'ECD', receita_bruta: dados.totalReceita, tributo_pago: dados.irpj + dados.csll, tributo_devido: dados.irpj + dados.csll, credito: 0, tipo_oportunidade: '', risco: 'baixo' }, { onConflict: 'cliente_id,competencia,tributo' })
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon={tipo === 'ECF' ? '📈' : '📊'} titulo={`Importar ${tipo}`} sub={`Selecione o arquivo TXT do ${tipo}`} accept=".txt" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <GridCards items={[{ label: 'Competência', valor: dados.competencia || '—' }, { label: 'Total Receita', valor: fmtR(dados.totalReceita) }, { label: 'IRPJ', valor: fmtR(dados.irpj) }, { label: 'CSLL', valor: fmtR(dados.csll) }]} />
      <div style={{ marginTop: 16 }}>{salvo ? <SalvoRaioX /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}</div>
    </div>}
  </AbaUpload>
}

function AbaDebitos({ clienteId, cliente, onSalvo }) {
  const inputRef = useRef()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function processarArquivo(file) {
    setSalvo(false); setErro('')
    const reader = new FileReader()
    reader.onload = e => { const r = parseExtratoDébitos(e.target.result); if (r.valido) setDados(r); else setErro('Nenhum débito identificado.') }
    reader.readAsText(file, 'UTF-8')
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      for (const d of dados.debitos) {
        await supabase.from('entradas').upsert({ cliente_id: clienteId, competencia: new Date().toISOString().slice(0, 7), tributo: d.tributo, receita_bruta: 0, tributo_pago: 0, tributo_devido: d.valor, credito: 0, tipo_oportunidade: 'Débito em aberto', risco: 'alto' }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      setSalvo(true); if (onSalvo) onSalvo()
    } catch { setErro('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  return <AbaUpload icon="⚠️" titulo="Importar Extrato de Débitos" sub="Selecione o arquivo TXT ou CSV exportado do e-CAC / PGFN" accept=".txt,.csv" onFile={processarArquivo} inputRef={inputRef} erro={erro}>
    {dados && <div>
      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>⚠️ {dados.debitos.length} débito(s) — Total: {fmtR(dados.totalDebito)}</div>
        {dados.debitos.map((d, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fecdd3', fontSize: 13 }}>
          <span style={{ color: '#dc2626', fontWeight: 600 }}>{d.tributo} — {d.situacao}</span>
          <span style={{ fontWeight: 800, color: '#dc2626' }}>{fmtR(d.valor)}</span>
        </div>)}
      </div>
      {salvo ? <SalvoRaioX /> : <BotoesAcao onLimpar={() => setDados(null)} onSalvar={salvarDados} salvando={salvando} />}
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
    {erro && <ErroBanner erros={[erro]} />}
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

function ErroBanner({ erros }) {
  return <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
    {erros.map((e, i) => <div key={i} style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>⚠️ {e}</div>)}
  </div>
}

function BotoesAcao({ onLimpar, onSalvar, salvando }) {
  return <div style={{ display: 'flex', gap: 12 }}>
    <button onClick={onLimpar} style={btnCinza}>🗑️ Limpar</button>
    <button onClick={onSalvar} disabled={salvando} style={{ ...btnPrimario, flex: 1 }}>{salvando ? 'Salvando...' : '💾 Salvar e gerar Raio-X'}</button>
  </div>
}

function SalvoRaioX() {
  return <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '16px 24px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#16a34a' }}>
    ✅ Dados salvos! ⚡ Gerando Raio-X Tributário...
  </div>
}

const btnPrimario = { padding: '13px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' }
const btnCinza   = { padding: '13px 24px', background: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const inputStyle = { padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' }