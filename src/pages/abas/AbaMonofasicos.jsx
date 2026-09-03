/**
 * AbaMonofasicos.jsx - e-FiscalTribe®
 * Versao 9.0 - 18/08/2026
 * + Visao Resumida e Visao Auditoria
 * + Detalhamento fiscal completo por item
 * + Persistencia das bases, aliquotas e campos fiscais da NF-e
 * + Historico restaura integralmente os dados fiscais salvos
 */

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { parseXMLNFe } from '../../utils/parseXMLNFe'
import AnalisadorIA from '../../AnalisadorIA'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleString('pt-BR') : '-'
function normalizarCompetencia(valor) {
  if (!valor) return null

  const s = String(valor).trim()

  // 01/05/2026 a 31/05/2026 ou 01/05/2026
  let m = s.match(/\b\d{1,2}\/(\d{1,2})\/(\d{4})\b/)
  if (m) {
    return `${String(m[1]).padStart(2, '0')}/${m[2]}`
  }

  // 05/2026
  m = s.match(/\b(\d{1,2})\/(\d{4})\b/)
  if (m) {
    return `${String(m[1]).padStart(2, '0')}/${m[2]}`
  }

  // 05-2026
  m = s.match(/\b(\d{1,2})-(\d{4})\b/)
  if (m) {
    return `${String(m[1]).padStart(2, '0')}/${m[2]}`
  }

  // 2026-05 ou 2026-05-01
  m = s.match(/\b(\d{4})-(\d{1,2})(?:-\d{1,2})?\b/)
  if (m) {
    return `${String(m[2]).padStart(2, '0')}/${m[1]}`
  }

  // 202605
  m = s.match(/\b(\d{4})(0[1-9]|1[0-2])\b/)
  if (m) {
    return `${m[2]}/${m[1]}`
  }

  return s
}
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

const EFEITO_RECEITA = Object.freeze({
  VENDA: 'VENDA',
  DEVOLUCAO: 'DEVOLUCAO',
  CANCELAMENTO: 'CANCELAMENTO',
  NEUTRO: 'NEUTRO',
  REVISAR: 'REVISAR',
})

const CFOPS_NEUTROS = new Set([
  // Remessa / retorno para conserto ou reparo
  '5915', '6915',
  '5916', '6916',

  // Industrializacao por encomenda — movimentacoes sem receita da mercadoria
  '5901', '6901',
  '5902', '6902',
])

const CFOPS_DEVOLUCAO_VENDA = new Set([
  '1201', '1202',
  '1203', '1204',
  '1410', '1411',
  '1660', '1661', '1662',

  '2201', '2202',
  '2203', '2204',
  '2410', '2411',
  '2660', '2661', '2662',

  '3201', '3202',
  '3211',
])

function classificarEfeitoReceita({
  cfop,
  tipoOperacao,
  naturezaOperacao,
  chaveNFeReferenciada,
  cancelada = false,
}) {
  const codigo = String(cfop || '').replace(/\D/g, '')
const natureza = String(naturezaOperacao || '').toUpperCase()
const tipo = String(tipoOperacao || '').toLowerCase()
const temReferencia =
  Boolean(String(chaveNFeReferenciada || '').trim())

  // Cancelamento fiscal tem precedencia sobre qualquer outra classificacao
  if (cancelada) {
    return {
      efeitoReceita: EFEITO_RECEITA.CANCELAMENTO,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita: 'NF-e cancelada',
    }
  }

  // Movimentacoes documentais que nao representam faturamento
  if (CFOPS_NEUTROS.has(codigo)) {
    return {
      efeitoReceita: EFEITO_RECEITA.NEUTRO,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita:
        `CFOP ${codigo} — movimentacao sem composicao de receita`,
    }
  }
  
  if (CFOPS_DEVOLUCAO_VENDA.has(codigo)) {
  if (tipo === 'entrada' && temReferencia) {
    return {
      efeitoReceita: EFEITO_RECEITA.DEVOLUCAO,
      fatorReceita: -1,
      consideraReceita: false,
      motivoEfeitoReceita:
        `CFOP ${codigo} — devolucao de venda vinculada a NF-e original`,
    }
  }

  return {
    efeitoReceita: EFEITO_RECEITA.REVISAR,
    fatorReceita: 0,
    consideraReceita: false,
    motivoEfeitoReceita:
      `CFOP ${codigo} indica devolucao de venda, mas a operacao precisa ser validada`,
  }
}

  // Devolucao sera tratada de forma propria.
  // Nao classificamos apenas pela palavra "devolucao",
  // pois ainda vamos validar CFOP e documento referenciado.
  if (natureza.includes('DEVOLU')) {
    return {
      efeitoReceita: EFEITO_RECEITA.REVISAR,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita:
        'Possivel devolucao — requer validacao do CFOP e da NF-e referenciada',
    }
  }

  // Nesta primeira etapa preservamos o comportamento atual
  // para as demais operacoes ate completar a matriz de CFOPs.
  return {
    efeitoReceita: EFEITO_RECEITA.VENDA,
    fatorReceita: 1,
    consideraReceita: true,
    motivoEfeitoReceita: null,
  }
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

function ModalDetalhesFiscais({ item, onFechar }) {
  if (!item) return null

  const Linha = ({ label, valor, moeda = false }) => (
    <div style={{ padding:'8px 10px', borderBottom:`1px solid ${S.border}`, display:'grid', gridTemplateColumns:'180px 1fr', gap:12, alignItems:'start' }}>
      <div style={{ fontSize:11, fontWeight:700, color:S.muted }}>{label}</div>
      <div style={{ fontSize:12, color:S.text, wordBreak:'break-word' }}>
        {moeda ? fmtR(valor) : (valor === null || valor === undefined || valor === '' ? '—' : String(valor))}
      </div>
    </div>
  )

  const Secao = ({ titulo, children }) => (
    <div style={{ border:`1px solid ${S.border}`, borderRadius:8, overflow:'hidden', marginBottom:14 }}>
      <div style={{ padding:'8px 10px', background:S.bg, fontSize:12, fontWeight:700, color:S.navy, borderBottom:`1px solid ${S.border}` }}>{titulo}</div>
      {children}
    </div>
  )
  
   const secoesDetalhamento = [
    {
      titulo: 'NF-e / Operacao',
      linhas: [
        ['Chave NF-e', item.chaveNFe || '—'],
        ['Numero / Serie / Modelo', `${item.nNF || '—'} / ${item.serieNFe || '—'} / ${item.modeloNFe || '—'}`],
        ['Data de emissao', item.dataEmissao || '—'],
        ['Tipo de operacao', item.tipoOperacao || '—'],
        ['Natureza da operacao', item.naturezaOperacao || '—'],
        ['Finalidade NF-e', item.finalidadeNFe || '—'],
        ['Destino da operacao', item.indicadorDestino || '—'],
        ['Consumidor final', item.consumidorFinal || '—'],
        ['Presenca comprador', item.presencaComprador || '—'],
        ['Emitente', `${item.emitente || '—'} · ${item.emitenteCNPJ || '—'} · ${item.emitenteUF || '—'}`],
        ['Destinatario', `${item.destinatarioCNPJ || '—'} · ${item.destinatarioUF || '—'}`],
      ]
    },
    {
      titulo: 'Produto / Comercial',
      linhas: [
        ['Codigo', item.codigo || '—'],
        ['Descricao', item.descricao || '—'],
        ['NCM', item.ncm || '—'],
        ['CEST', item.cest || '—'],
        ['GTIN/EAN', item.gtin || '—'],
        ['EX TIPI', item.ex || '—'],
        ['CFOP', item.cfop || '—'],
        ['Beneficio fiscal', item.codigoBeneficioFiscal || '—'],
        ['Quantidade comercial', `${item.quantidade || 0} ${item.unidadeComercial || ''}`],
        ['Valor unitario', fmtR(item.valorUnitario)],
        ['Quantidade tributavel', `${item.quantidadeTributavel || 0} ${item.unidadeTributavel || ''}`],
        ['Valor unit. tributavel', fmtR(item.valorUnitarioTributavel)],
        ['Valor produto', fmtR(item.vProd)],
        ['Desconto', fmtR(item.valorDesconto)],
        ['Frete', fmtR(item.valorFrete)],
        ['Seguro', fmtR(item.valorSeguro)],
        ['Outras despesas', fmtR(item.valorOutrasDespesas)],
      ]
    },
    {
      titulo: 'PIS / COFINS',
      linhas: [
        ['CST PIS', item.cstPIS || '—'],
        ['Base PIS', fmtR(item.basePIS)],
        ['Aliquota PIS (%)', String(item.aliquotaPIS || 0)],
        ['Valor PIS', fmtR(item.vItemPIS)],
        ['PIS-ST', fmtR(item.valorPISST)],
        ['CST COFINS', item.cstCOFINS || '—'],
        ['Base COFINS', fmtR(item.baseCOFINS)],
        ['Aliquota COFINS (%)', String(item.aliquotaCOFINS || 0)],
        ['Valor COFINS', fmtR(item.vItemCOFINS)],
        ['COFINS-ST', fmtR(item.valorCOFINSST)],
      ]
    },
    {
      titulo: 'ICMS / ICMS-ST / FCP',
      linhas: [
        ['Origem', item.origemICMS ?? '—'],
        ['CST / CSOSN', `${item.cstICMS || '—'} / ${item.csosn || '—'}`],
        ['Modalidade BC', item.modalidadeBCICMS || '—'],
        ['Base ICMS', fmtR(item.baseICMS)],
        ['Reducao BC ICMS (%)', String(item.reducaoBCICMS || 0)],
        ['Aliquota ICMS (%)', String(item.aliquotaICMS || 0)],
        ['Valor ICMS', fmtR(item.valorICMS)],
        ['ICMS desonerado', fmtR(item.valorICMSDesonerado)],
        ['Motivo desoneracao', item.motivoDesoneracaoICMS || '—'],
        ['Modalidade BC-ST', item.modalidadeBCST || '—'],
        ['MVA-ST (%)', String(item.mvaST || 0)],
        ['Reducao BC-ST (%)', String(item.reducaoBCST || 0)],
        ['Base ICMS-ST', fmtR(item.baseICMSST)],
        ['Aliquota ICMS-ST (%)', String(item.aliquotaICMSST || 0)],
        ['Valor ICMS-ST', fmtR(item.valorICMSST)],
        ['Aliquota FCP (%)', String(item.aliquotaFCP || 0)],
        ['Valor FCP', fmtR(item.valorFCP)],
        ['Aliquota FCP-ST (%)', String(item.aliquotaFCPST || 0)],
        ['Valor FCP-ST', fmtR(item.valorFCPST)],
      ]
    },
    {
      titulo: 'IPI / Auditoria',
      linhas: [
        ['CST IPI', item.cstIPI || '—'],
        ['Enquadramento IPI', item.enquadramentoIPI || '—'],
        ['Base IPI', fmtR(item.baseIPI)],
        ['Aliquota IPI (%)', String(item.aliquotaIPI || 0)],
        ['Valor IPI', fmtR(item.valorIPI)],
        ['Monofasico PIS/COFINS', item.monofasico ? 'Sim' : 'Nao'],
        ['Considera receita', item.consideraReceita ? 'Sim' : 'Nao'],
        ['Classificacao revisada', item.classificacaoRevisada ? 'Sim' : 'Nao'],
        ['Origem classificacao', item.classificacaoOrigem || 'xml'],
        ['Informacao adicional item', item.infoAdicionalProduto || '—'],
      ]
    },
  ]

  function imprimirDetalhamento() {
    const esc = valor =>
      String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }[c]))

    const conteudo = secoesDetalhamento.map(secao => `
      <h2>${esc(secao.titulo)}</h2>
      <table>
        ${secao.linhas.map(([label, valor]) => `
          <tr>
            <th>${esc(label)}</th>
            <td>${esc(valor)}</td>
          </tr>
        `).join('')}
      </table>
    `).join('')

    const janela = window.open('', '_blank', 'width=900,height=700')

    if (!janela) {
      alert('Nao foi possivel abrir a janela de impressao.')
      return
    }

    janela.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Detalhamento Fiscal NF ${item.nNF || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0F172A; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .sub { font-size: 11px; margin-bottom: 20px; color: #64748B; }
          h2 { font-size: 13px; margin: 18px 0 5px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #E2E8F0; padding: 6px 8px; font-size: 10px; text-align: left; }
          th { width: 34%; background: #F8FAFC; }
        </style>
      </head>
      <body>
        <h1>e-FiscalTribe - Detalhamento Fiscal do Item</h1>
        <div class="sub">
          NF ${esc(item.nNF || '—')} · Item ${esc(item.numeroItemNFe || '—')} · ${esc(item.descricao || 'Produto')}
        </div>
        ${conteudo}
      </body>
      </html>
    `)

    janela.document.close()
    janela.focus()

    setTimeout(() => {
      janela.print()
    }, 500)
  }

  function exportarPDFDetalhamento() {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    doc.setFontSize(15)
    doc.text('e-FiscalTribe - Detalhamento Fiscal do Item', 14, 14)

    doc.setFontSize(9)
    doc.text(
      `NF ${item.nNF || '—'} - Item ${item.numeroItemNFe || '—'} - ${item.descricao || 'Produto'}`,
      14,
      20
    )

    let y = 27

    secoesDetalhamento.forEach(secao => {
      if (y > 265) {
        doc.addPage()
        y = 15
      }

      doc.setFontSize(10)
      doc.text(secao.titulo, 14, y)

      autoTable(doc, {
        startY: y + 3,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        body: secao.linhas,
        styles: {
          fontSize: 7.5,
          cellPadding: 2
        },
        columnStyles: {
          0: {
            fontStyle: 'bold',
            cellWidth: 58
          }
        }
      })

      y = (doc.lastAutoTable?.finalY || y) + 7
    })

    doc.save(
      `FiscalTribe_Detalhamento_NF_${item.nNF || 'sem-nf'}_Item_${item.numeroItemNFe || '1'}.pdf`
    )
  } 

  return (
    <div onClick={onFechar} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'min(980px, 96vw)', maxHeight:'92vh', overflowY:'auto', background:S.white, borderRadius:12, boxShadow:'0 24px 70px rgba(0,0,0,.28)' }}>
        <div style={{ position:'sticky', top:0, zIndex:2, background:S.white, padding:'14px 18px', borderBottom:`1px solid ${S.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:S.navy }}>Detalhamento Fiscal do Item</div>
            <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>NF {item.nNF || '—'} · Item {item.numeroItemNFe || '—'} · {item.descricao || 'Produto'}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>

  <button
    onClick={imprimirDetalhamento}
    style={{
      border:'none',
      background:S.navy,
      color:S.white,
      borderRadius:6,
      padding:'6px 12px',
      cursor:'pointer',
      fontSize:12,
      fontWeight:600
    }}
  >
    Imprimir
  </button>

  <button
    onClick={exportarPDFDetalhamento}
    style={{
      border:'none',
      background:S.blue,
      color:S.white,
      borderRadius:6,
      padding:'6px 12px',
      cursor:'pointer',
      fontSize:12,
      fontWeight:600
    }}
  >
    Exportar PDF
  </button>

  <button
    onClick={onFechar}
    style={{
      border:`1px solid ${S.border}`,
      background:'none',
      borderRadius:6,
      padding:'6px 12px',
      cursor:'pointer',
      color:S.muted,
      fontSize:12
    }}
  >
    Fechar
  </button>

</div>
        </div>

        <div style={{ padding:18, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:14 }}>
          <div>
            <Secao titulo="NF-e / Operacao">
              <Linha label="Chave NF-e" valor={item.chaveNFe} />
              <Linha label="Numero / Serie / Modelo" valor={`${item.nNF || '—'} / ${item.serieNFe || '—'} / ${item.modeloNFe || '—'}`} />
              <Linha
  label="Data de emissao"
  valor={
    item.dataEmissao
      ? item.dataEmissao.split('-').reverse().join('/')
      : '—'
  }
/>
              <Linha label="Tipo de operacao" valor={item.tipoOperacao} />
              <Linha label="Natureza da operacao" valor={item.naturezaOperacao} />
              <Linha label="Finalidade NF-e" valor={item.finalidadeNFe} />
              <Linha label="Destino da operacao" valor={item.indicadorDestino} />
              <Linha label="Consumidor final" valor={item.consumidorFinal} />
              <Linha label="Presenca comprador" valor={item.presencaComprador} />
              <Linha label="Emitente" valor={`${item.emitente || '—'} · ${item.emitenteCNPJ || '—'} · ${item.emitenteUF || '—'}`} />
              <Linha label="Destinatario" valor={`${item.destinatarioCNPJ || '—'} · ${item.destinatarioUF || '—'}`} />
            </Secao>

            <Secao titulo="Produto / Comercial">
              <Linha label="Codigo" valor={item.codigo} />
              <Linha label="Descricao" valor={item.descricao} />
              <Linha label="NCM" valor={item.ncm} />
              <Linha label="CEST" valor={item.cest} />
              <Linha label="GTIN/EAN" valor={item.gtin} />
              <Linha label="EX TIPI" valor={item.ex} />
              <Linha label="CFOP" valor={item.cfop} />
              <Linha label="Beneficio fiscal" valor={item.codigoBeneficioFiscal} />
              <Linha label="Quantidade comercial" valor={`${item.quantidade || 0} ${item.unidadeComercial || ''}`} />
              <Linha label="Valor unitario" valor={item.valorUnitario} moeda />
              <Linha label="Quantidade tributavel" valor={`${item.quantidadeTributavel || 0} ${item.unidadeTributavel || ''}`} />
              <Linha label="Valor unit. tributavel" valor={item.valorUnitarioTributavel} moeda />
              <Linha label="Valor produto" valor={item.vProd} moeda />
              <Linha label="Desconto" valor={item.valorDesconto} moeda />
              <Linha label="Frete" valor={item.valorFrete} moeda />
              <Linha label="Seguro" valor={item.valorSeguro} moeda />
              <Linha label="Outras despesas" valor={item.valorOutrasDespesas} moeda />
            </Secao>
          </div>

          <div>
            <Secao titulo="PIS / COFINS">
              <Linha label="CST PIS" valor={item.cstPIS} />
              <Linha label="Base PIS" valor={item.basePIS} moeda />
              <Linha label="Aliquota PIS (%)" valor={item.aliquotaPIS} />
              <Linha label="Valor PIS" valor={item.vItemPIS} moeda />
              <Linha label="PIS-ST" valor={item.valorPISST} moeda />
              <Linha label="CST COFINS" valor={item.cstCOFINS} />
              <Linha label="Base COFINS" valor={item.baseCOFINS} moeda />
              <Linha label="Aliquota COFINS (%)" valor={item.aliquotaCOFINS} />
              <Linha label="Valor COFINS" valor={item.vItemCOFINS} moeda />
              <Linha label="COFINS-ST" valor={item.valorCOFINSST} moeda />
            </Secao>

            <Secao titulo="ICMS / ICMS-ST / FCP">
              <Linha label="Origem" valor={item.origemICMS} />
              <Linha label="CST / CSOSN" valor={`${item.cstICMS || '—'} / ${item.csosn || '—'}`} />
              <Linha label="Modalidade BC" valor={item.modalidadeBCICMS} />
              <Linha label="Base ICMS" valor={item.baseICMS} moeda />
              <Linha label="Reducao BC ICMS (%)" valor={item.reducaoBCICMS} />
              <Linha label="Aliquota ICMS (%)" valor={item.aliquotaICMS} />
              <Linha label="Valor ICMS" valor={item.valorICMS} moeda />
              <Linha label="ICMS desonerado" valor={item.valorICMSDesonerado} moeda />
              <Linha label="Motivo desoneracao" valor={item.motivoDesoneracaoICMS} />
              <Linha label="Modalidade BC-ST" valor={item.modalidadeBCST} />
              <Linha label="MVA-ST (%)" valor={item.mvaST} />
              <Linha label="Reducao BC-ST (%)" valor={item.reducaoBCST} />
              <Linha label="Base ICMS-ST" valor={item.baseICMSST} moeda />
              <Linha label="Aliquota ICMS-ST (%)" valor={item.aliquotaICMSST} />
              <Linha label="Valor ICMS-ST" valor={item.valorICMSST} moeda />
              <Linha label="Aliquota FCP (%)" valor={item.aliquotaFCP} />
              <Linha label="Valor FCP" valor={item.valorFCP} moeda />
              <Linha label="Aliquota FCP-ST (%)" valor={item.aliquotaFCPST} />
              <Linha label="Valor FCP-ST" valor={item.valorFCPST} moeda />
            </Secao>

            <Secao titulo="IPI / Auditoria">
              <Linha label="CST IPI" valor={item.cstIPI} />
              <Linha label="Enquadramento IPI" valor={item.enquadramentoIPI} />
              <Linha label="Base IPI" valor={item.baseIPI} moeda />
              <Linha label="Aliquota IPI (%)" valor={item.aliquotaIPI} />
              <Linha label="Valor IPI" valor={item.valorIPI} moeda />
              <Linha label="Monofasico PIS/COFINS" valor={item.monofasico ? 'Sim' : 'Nao'} />
              <Linha label="Considera receita" valor={item.consideraReceita ? 'Sim' : 'Nao'} />
			  <Linha label="Efeito na receita" valor={item.efeitoReceita || '—'} />
<Linha label="Fator da receita" valor={item.fatorReceita ?? (item.consideraReceita ? 1 : 0)} />
<Linha label="Valor do efeito na receita" valor={Number(item.vProd || 0) * Number(item.fatorReceita ?? (item.consideraReceita ? 1 : 0))} moeda />
<Linha label="Motivo do efeito" valor={item.motivoNaoConsiderarReceita || '—'} />
<Linha label="NF-e referenciada" valor={item.chaveNFeReferenciada || '—'} />
              <Linha label="Classificacao revisada" valor={item.classificacaoRevisada ? 'Sim' : 'Nao'} />
              <Linha label="Origem classificacao" valor={item.classificacaoOrigem} />
              <Linha label="Informacao adicional item" valor={item.infoAdicionalProduto} />
            </Secao>
          </div>
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
  const [visaoTabela, setVisaoTabela] = useState('resumida')
  const [itemDetalhe, setItemDetalhe] = useState(null)
  const [pgdasForm, setPgdasForm] = useState({
    receita_bruta_total: '', receita_monofasica: '', receita_st: '', das_recolhido: '', segregou: false,
  })
  const [pgdasResult, setPgdasResult] = useState(null)
  const [pgdasSupabase, setPgdasSupabase] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [diagnosticosSelecionados, setDiagnosticosSelecionados] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagAberto, setDiagAberto] = useState(null)
  const [porPagina, setPorPagina] = useState(10)
  const [upsertInfo, setUpsertInfo] = useState(null)
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [modalNome, setModalNome] = useState(false)
  const [diagnosticoSalvoId, setDiagnosticoSalvoId] = useState(null)
  const [memorias, setMemorias] = useState([])
  const [loadingMemorias, setLoadingMemorias] = useState(false)
  const [salvandoMemoria, setSalvandoMemoria] = useState(false)
  const inputRef = useRef(null)
  const diagAbertoRef = useRef(null)
  const nfeCanceladasRef = useRef(new Set())
  
  function toggleDiagnosticoSelecionado(id) {
  setDiagnosticosSelecionados(prev =>
    prev.includes(id)
      ? prev.filter(item => item !== id)
      : [...prev, id]
  )
}

function toggleTodosDiagnosticos() {
  const ids = historico
    .filter(diag => !diag.ghost)
    .map(diag => diag.id)

  const todosMarcados =
    ids.length > 0 &&
    ids.every(id => diagnosticosSelecionados.includes(id))

  setDiagnosticosSelecionados(
    todosMarcados ? [] : ids
  )
}

  const competenciasKey = [...new Set(
    itens.map(i => i.competencia).filter(Boolean)
  )].sort().join(',')

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes monoSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes monoProgress {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(320%); }
  }

  .mono-spinner {
    display: inline-block;
    animation: monoSpin 1s linear infinite;
  }

  .mono-progress-track {
    width: 75%;
    height: 4px;
    margin: 8px auto 0;
    background: #E2E8F0;
    border-radius: 999px;
    overflow: hidden;
  }

  .mono-progress-bar {
    width: 35%;
    height: 100%;
    background: #2563EB;
    border-radius: 999px;
    animation: monoProgress 1.2s ease-in-out infinite;
  }
`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    if (cliente?.id) {
    carregarHistorico()
    carregarMemorias()
    }
    }, [cliente?.id])
	
	async function carregarMemorias() {
  if (!cliente?.id) return

  setLoadingMemorias(true)

  try {
    const { data, error } = await supabase
      .from('diagnostico_monofasico_memorias')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('gerado_em', { ascending: false })

    if (error) throw error

    setMemorias(data || [])
  } catch (e) {
    console.error('Erro ao carregar memorias:', e)
  } finally {
    setLoadingMemorias(false)
  }
}

  useEffect(() => {
    if (regime !== 'Simples Nacional' || !cliente?.id || !competenciasKey) {
      setPgdasSupabase(null)
      return
    }
    const competencias = competenciasKey
  .split(',')
  .map(normalizarCompetencia)
  .filter(Boolean)

const competenciasAlvo = new Set(competencias)

supabase
  .from('diagnosticos_pgdas')
  .select('competencia, diferenca_recuperavel, receita_bruta_total, receita_monofasica')
  .eq('cliente_id', cliente.id)
  .then(({ data, error }) => {
    if (error) {
      console.warn('Busca PGDAS falhou:', error.message)
      return
    }

    const encontrados = (data || []).filter(p =>
      competenciasAlvo.has(
        normalizarCompetencia(p.competencia)
      )
    )

    if (encontrados.length > 0) {
      const total = encontrados.reduce(
        (s, p) =>
          s + (parseFloat(p.diferenca_recuperavel) || 0),
        0
      )

      setPgdasSupabase({
        diferenca: total,
        registros: encontrados
      })
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

  async function exportarExcel() {
  if (!itens.length) return

  try {
    const exceljsModule = await import('exceljs')
    const ExcelJS = exceljsModule.default || exceljsModule

    const workbook = new ExcelJS.Workbook()

    workbook.creator = 'e-FiscalTribe'
    workbook.lastModifiedBy = 'e-FiscalTribe'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.title = 'Auditoria NF-e'
    workbook.subject = 'Auditoria fiscal de NF-e'

    // ============================================================
    // HELPERS
    // ============================================================

    const texto = v =>
      v === null || v === undefined
        ? ''
        : String(v)

    const numero = v => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }

    const formatarCNPJ = v => {
      const s = texto(v).replace(/\D/g, '')

      if (s.length !== 14) return texto(v)

      return s.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
      )
    }

    const dataExcel = v => {
      if (!v) return ''

      const s = texto(v).trim()

      // yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [ano, mes, dia] =
          s.slice(0, 10).split('-').map(Number)

        return new Date(ano, mes - 1, dia)
      }

      // dd/mm/yyyy
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [dia, mes, ano] =
          s.split('/').map(Number)

        return new Date(ano, mes - 1, dia)
      }

      // ddmmyyyy
      if (/^\d{8}$/.test(s)) {
        const dia = Number(s.slice(0, 2))
        const mes = Number(s.slice(2, 4))
        const ano = Number(s.slice(4, 8))

        return new Date(ano, mes - 1, dia)
      }

      const d = new Date(v)

      return Number.isNaN(d.getTime())
        ? texto(v)
        : d
    }

    const formatarCompetencia = v => {
      const s = texto(v).trim()

      if (/^\d{4}-\d{2}$/.test(s)) {
        return `${s.slice(5, 7)}/${s.slice(0, 4)}`
      }

      if (/^\d{2}\/\d{4}$/.test(s)) {
        return s
      }

      return s
    }

    const classificacaoItem = item => {
      if (!item.monofasico) return 'Não monofásico'

      if (
        item.pendentePGDAS &&
        !pgdasSupabase &&
        !pgdasResult
      ) {
        return 'Pendente PGDAS'
      }

      return 'Monofásico'
    }

    const periodos = [
      ...new Set(
        itens
          .map(i => formatarCompetencia(i.competencia))
          .filter(Boolean)
      )
    ]

    const periodoTexto =
      periodos.length === 0
        ? '—'
        : periodos.length === 1
          ? periodos[0]
          : `${periodos[0]} a ${periodos[periodos.length - 1]}`

    const empresa =
      cliente?.razao_social ||
      cliente?.nome_fantasia ||
      '—'

    const cnpj =
      formatarCNPJ(cliente?.cnpj)

    const totalItens = itens.length

    const totalMonofasicos =
      itens.filter(i => i.monofasico).length

    const receitaMonofasica =
  itens
    .filter(i => i.monofasico)
    .reduce(
      (s, i) =>
        s +
        numero(i.vProd) *
          Number(
            i.fatorReceita ??
            (i.consideraReceita ? 1 : 0)
          ),
      0
    )

    // ============================================================
    // ESTILOS / FUNÇÕES DAS ABAS
    // ============================================================

    const COR_NAVY = 'FF0B1F4D'
    const COR_HEADER = 'FF334155'
    const COR_BRANCO = 'FFFFFFFF'
    const COR_TEXTO = 'FF0F172A'
    const COR_MUTED = 'FF64748B'
    const COR_BORDA = 'FFE2E8F0'
    const COR_ZEBRA = 'FFF8FAFC'
    const COR_VERDE = 'FF166534'
    const COR_VERDE_BG = 'FFDCFCE7'
    const COR_LARANJA = 'FFEA580C'
    const COR_LARANJA_BG = 'FFFFF7ED'

    function configurarCabecalhoRelatorio(
  ws,
  tituloAba,
  totalColunas
) {
  const ultimaColuna =
    Math.min(totalColunas, 8)

  ws.mergeCells(
    1,
    1,
    1,
    ultimaColuna
  )

  const titulo = ws.getCell(1, 1)

  titulo.value =
    `e-FiscalTribe® — ${tituloAba}`

  titulo.font = {
    bold:true,
    size:16,
    color:{ argb:COR_NAVY }
  }

  titulo.alignment = {
    vertical:'middle',
    horizontal:'left'
  }

  ws.getRow(1).height = 28

  // EMPRESA
  ws.getCell('A2').value = 'Empresa'
  ws.getCell('B2').value = empresa

  if (totalColunas >= 3) {
    ws.mergeCells('B2:C2')
  }

  // PERÍODO
  ws.getCell('D2').value = 'Período'
  ws.getCell('E2').value = periodoTexto

  if (totalColunas >= 6) {
    ws.mergeCells('E2:F2')
  }

  // CNPJ
  ws.getCell('A3').value = 'CNPJ'
  ws.getCell('B3').value = cnpj

  if (totalColunas >= 3) {
    ws.mergeCells('B3:C3')
  }

  // DATA DE GERAÇÃO
  ws.getCell('D3').value = 'Gerado em'
  ws.getCell('E3').value =
    new Date().toLocaleString('pt-BR')

  if (totalColunas >= 6) {
    ws.mergeCells('E3:F3')
  }

  // RÓTULOS
  ;['A2', 'D2', 'A3', 'D3'].forEach(ref => {
    const cell = ws.getCell(ref)

    cell.font = {
      bold:true,
      size:10,
      color:{ argb:'FF334155' }
    }

    cell.alignment = {
      vertical:'middle',
      horizontal:'left'
    }
  })

  // EMPRESA — esquerda
  ws.getCell('B2').font = {
    size:10,
    color:{ argb:COR_TEXTO }
  }

  ws.getCell('B2').alignment = {
    vertical:'middle',
    horizontal:'left'
  }

  // PERÍODO — centralizado
  ws.getCell('E2').font = {
    size:10,
    color:{ argb:COR_TEXTO }
  }

  ws.getCell('E2').alignment = {
    vertical:'middle',
    horizontal:'center'
  }

  // CNPJ — centralizado
  ws.getCell('B3').font = {
    size:10,
    color:{ argb:COR_TEXTO }
  }

  ws.getCell('B3').alignment = {
    vertical:'middle',
    horizontal:'center'
  }

  // DATA DE GERAÇÃO — centralizada
  ws.getCell('E3').font = {
    size:10,
    color:{ argb:COR_TEXTO }
  }

  ws.getCell('E3').alignment = {
    vertical:'middle',
    horizontal:'center'
  }
}


function formatarTabela(
  ws,
  colunas,
  linhaCabecalho,
  dados,
  opcoes = {}
) {

  // ------------------------------------------------------------
  // AJUSTES AUTOMÁTICOS DE LARGURA
  // ------------------------------------------------------------

  const largurasMinimas = {
    'UF Emitente':12,
    'UF Destinatário':13,
    'Tipo Operação':16,
    'Natureza Operação':26,
    'CNPJ Emitente':20,
    'CNPJ Destinatário':20,
    'Descrição':36,
    'Valor Unitário':16,
    'Valor Produto':16,
    'Valor Total':16,
    'Outras Despesas':17,
    'Alíquota PIS':14,
    'Alíquota COFINS':16,
    'Alíquota ICMS':15,
    'Alíquota ICMS ST':17,
    'Alíquota IPI':14,
    'Classificação':19,
    'Considera Receita':18,
    'Classificação Revisada':22,
    'Origem Classificação':22,
    'ICMS Desonerado':17
  }

  ws.columns =
    colunas.map((c, index) => ({
      key:`c${index + 1}`,
      width:Math.max(
        Number(c.width || 10),
        Number(largurasMinimas[c.header] || 0)
      )
    }))

  // ------------------------------------------------------------
  // CABEÇALHO DA TABELA
  // ------------------------------------------------------------

  const headerRow =
    ws.getRow(linhaCabecalho)

  headerRow.values =
    colunas.map(c => c.header)

  headerRow.height = 34

  headerRow.eachCell(
    { includeEmpty:true },
    cell => {

      cell.font = {
        bold:true,
        size:10,
        color:{ argb:COR_BRANCO }
      }

      cell.fill = {
        type:'pattern',
        pattern:'solid',
        fgColor:{ argb:COR_HEADER }
      }

      cell.alignment = {
        vertical:'middle',
        horizontal:'center',
        wrapText:true
      }

      cell.border = {
        top:{
          style:'thin',
          color:{ argb:'FF64748B' }
        },
        left:{
          style:'thin',
          color:{ argb:'FF64748B' }
        },
        bottom:{
          style:'thin',
          color:{ argb:'FF64748B' }
        },
        right:{
          style:'thin',
          color:{ argb:'FF64748B' }
        }
      }
    }
  )

  // ------------------------------------------------------------
  // DEFINE O ALINHAMENTO DE CADA TIPO DE CAMPO
  // ------------------------------------------------------------

  const alinhamentoColuna = config => {
    const h =
      String(config?.header || '')
        .toLowerCase()
		if (h === 'qtd') {
  return 'center'
}

    // Valores, quantidades e percentuais
    if (
      config?.type === 'currency' ||
      config?.type === 'number' ||
      config?.type === 'percent'
    ) {
      return 'right'
    }

    // Datas
    if (config?.type === 'date') {
      return 'center'
    }

    // Campos cadastrais / fiscais / códigos
    const camposCentralizados = [
      'nf',
      'série',
      'serie',
      'competência',
      'competencia',
      'chave nf-e',
      'tipo operação',
      'tipo operacao',
      'cnpj emitente',
      'uf emitente',
      'cnpj destinatário',
      'cnpj destinatario',
      'uf destinatário',
      'uf destinatario',
      'item',
      'código',
      'codigo',
      'ncm',
      'cest',
      'gtin/ean',
      'ex tipi',
      'cfop',
      'unidade',
      'cst pis',
      'cst cofins',
      'origem icms',
      'cst icms',
      'csosn',
      'cst ipi',
      'classificação',
      'classificacao',
      'considera receita',
      'classificação revisada',
      'classificacao revisada',
      'origem classificação',
      'origem classificacao'
    ]

    if (camposCentralizados.includes(h)) {
      return 'center'
    }

    // Emitente, descrição, natureza etc.
    return 'left'
  }

  // ------------------------------------------------------------
  // DADOS
  // ------------------------------------------------------------

  dados.forEach((item, indice) => {

    const row =
      ws.addRow(
        colunas.map(c => c.value(item))
      )

    row.height = 22

    row.eachCell(
      { includeEmpty:true },
      (cell, colNumber) => {

        const config =
          colunas[colNumber - 1]

        cell.font = {
          size:9,
          color:{ argb:COR_TEXTO }
        }

        cell.alignment = {
          vertical:'middle',
          horizontal:
            alinhamentoColuna(config),
          wrapText:
            config?.wrap === true
        }

        // --------------------------------------------------------
        // GRADE SUAVE HORIZONTAL + VERTICAL
        // --------------------------------------------------------

        const bordaSuave = {
          style:'thin',
          color:{ argb:'FFE4EAF0' }
        }

        cell.border = {
          top:bordaSuave,
          left:bordaSuave,
          bottom:bordaSuave,
          right:bordaSuave
        }

        // Zebra muito suave
        if (indice % 2 === 1) {
          cell.fill = {
            type:'pattern',
            pattern:'solid',
            fgColor:{ argb:COR_ZEBRA }
          }
        }

        // --------------------------------------------------------
        // FORMATAÇÃO POR TIPO
        // --------------------------------------------------------

        if (config?.type === 'text') {
          cell.numFmt = '@'
        }

        if (config?.type === 'date') {
          cell.numFmt = 'dd/mm/yyyy'
        }

        // Quantidades:
        // 130      -> 130
        // 117.5    -> 117,5
        // sem aparecer "130,"
        if (config?.type === 'number') {
  const valorNumerico = Number(cell.value)

  cell.numFmt =
    Number.isFinite(valorNumerico) && Number.isInteger(valorNumerico)
      ? '0'
      : '0.####'
}

        // Valores monetários
        if (config?.type === 'currency') {
          cell.numFmt = 'R$ #,##0.00'
        }

        // Alíquotas
        if (config?.type === 'percent') {
          cell.numFmt = '0.00"%"'
        }
      }
    )

    // ------------------------------------------------------------
    // CLASSIFICAÇÃO
    // ------------------------------------------------------------

    if (opcoes.destacarClassificacao) {

      const pos =
        colunas.findIndex(
          c => c.header === 'Classificação'
        ) + 1

      if (pos > 0) {

        const cell =
          row.getCell(pos)

        const classificacao =
          classificacaoItem(item)

        if (classificacao === 'Monofásico') {
          cell.fill = {
            type:'pattern',
            pattern:'solid',
            fgColor:{ argb:COR_VERDE_BG }
          }

          cell.font = {
            bold:true,
            size:9,
            color:{ argb:COR_VERDE }
          }
        }

        if (
          classificacao ===
          'Pendente PGDAS'
        ) {
          cell.fill = {
            type:'pattern',
            pattern:'solid',
            fgColor:{ argb:COR_LARANJA_BG }
          }

          cell.font = {
            bold:true,
            size:9,
            color:{ argb:COR_LARANJA }
          }
        }

        cell.alignment = {
          vertical:'middle',
          horizontal:'center'
        }
      }
    }
  })

  // ------------------------------------------------------------
  // FILTROS
  // ------------------------------------------------------------

  ws.autoFilter = {
    from:{
      row:linhaCabecalho,
      column:1
    },
    to:{
      row:linhaCabecalho,
      column:colunas.length
    }
  }

  // ------------------------------------------------------------
  // CONGELAMENTO
  // ------------------------------------------------------------

  ws.views = [{
    state:'frozen',
    xSplit:opcoes.xSplit || 0,
    ySplit:linhaCabecalho,
    activeCell:
      `${opcoes.activeCell || 'A'}${linhaCabecalho + 1}`
  }]

  // ------------------------------------------------------------
  // IMPRESSÃO
  // ------------------------------------------------------------

  ws.pageSetup = {
    orientation:'landscape',
    fitToPage:true,
    fitToWidth:1,
    fitToHeight:0,
    paperSize:9,
    margins:{
      left:0.25,
      right:0.25,
      top:0.5,
      bottom:0.5,
      header:0.2,
      footer:0.2
    }
  }

  ws.headerFooter.oddFooter =
    `e-FiscalTribe® — ${ws.name}     Página &P de &N`
}
    // ============================================================
    // ABA 1 — RESUMO
    // ============================================================

    const wsResumo =
      workbook.addWorksheet(
        'Resumo',
        {
          properties:{
            defaultRowHeight:18
          }
        }
      )

    const colResumo = [
      {
        header:'NF',
        width:10,
        type:'text',
        value:i=>texto(i.nNF)
      },
      {
        header:'Data',
        width:13,
        type:'date',
        value:i=>dataExcel(i.dataEmissao)
      },
      {
        header:'Emitente',
        width:28,
        type:'text',
        value:i=>texto(i.emitente)
      },
      {
        header:'Descrição',
        width:36,
        type:'text',
        wrap:true,
        value:i=>texto(i.descricao)
      },
      {
        header:'NCM',
        width:12,
        type:'text',
        value:i=>texto(i.ncm)
      },
      {
        header:'CFOP',
        width:10,
        type:'text',
        value:i=>texto(i.cfop)
      },
      {
        header:'QTD',
        width:11,
        type:'number',
        value:i=>numero(i.quantidade)
      },
      {
        header:'Valor Unitário',
        width:15,
        type:'currency',
        value:i=>numero(i.valorUnitario)
      },
      {
        header:'Valor Total',
        width:15,
        type:'currency',
        value:i=>numero(i.vProd)
      },
	  {
  header:'Efeito',
  width:16,
  type:'text',
  value:i=>texto(i.efeitoReceita || '—')
},
{
  header:'Efeito Receita',
  width:16,
  type:'currency',
  value:i =>
    numero(i.vProd) *
    Number(
      i.fatorReceita ??
      (i.consideraReceita ? 1 : 0)
    )
},
      {
        header:'PIS',
        width:13,
        type:'currency',
        value:i=>numero(i.vItemPIS)
      },
      {
        header:'COFINS',
        width:13,
        type:'currency',
        value:i=>numero(i.vItemCOFINS)
      },
      {
        header:'Classificação',
        width:18,
        type:'text',
        value:i=>classificacaoItem(i)
      }
    ]

    configurarCabecalhoRelatorio(
      wsResumo,
      'Resumo da Auditoria NF-e',
      colResumo.length
    )

    wsResumo.mergeCells('A4:B4')
    wsResumo.getCell('A4').value =
      'Total de itens'

    wsResumo.getCell('C4').value =
      totalItens

    wsResumo.mergeCells('D4:E4')
    wsResumo.getCell('D4').value =
      'Itens monofásicos'

    wsResumo.getCell('F4').value =
      totalMonofasicos

    wsResumo.mergeCells('G4:H4')
    wsResumo.getCell('G4').value =
      'Receita monofásica'

    wsResumo.getCell('I4').value =
      receitaMonofasica

    ;['A4','D4','G4'].forEach(ref => {
      const cell = wsResumo.getCell(ref)

      cell.font = {
        bold:true,
        size:10,
        color:{ argb:COR_MUTED }
      }
    })

    wsResumo.getCell('C4').font = {
      bold:true,
      size:11,
      color:{ argb:COR_NAVY }
    }

    wsResumo.getCell('F4').font = {
      bold:true,
      size:11,
      color:{ argb:COR_LARANJA }
    }

    wsResumo.getCell('I4').font = {
      bold:true,
      size:11,
      color:{ argb:COR_VERDE }
    }

    wsResumo.getCell('I4').numFmt =
      'R$ #,##0.00'

    wsResumo.mergeCells('A5:L5')

    wsResumo.getCell('A5').value =
      'Diagnóstico preliminar dos XMLs. A confirmação de eventual crédito depende das etapas seguintes do Motor do Simples.'

    wsResumo.getCell('A5').font = {
      italic:true,
      size:9,
      color:{ argb:COR_MUTED }
    }

    formatarTabela(
      wsResumo,
      colResumo,
      7,
      itens,
      {
        xSplit:2,
        activeCell:'C',
        destacarClassificacao:true
      }
    )

    // ============================================================
    // ABA 2 — NF-e E PRODUTOS
    // ============================================================

    const wsNFe =
      workbook.addWorksheet(
        'NF-e e Produtos',
        {
          properties:{
            defaultRowHeight:18
          }
        }
      )

    const colNFe = [
      { header:'NF', width:9, type:'text', value:i=>texto(i.nNF) },
      { header:'Série', width:8, type:'text', value:i=>texto(i.serieNFe) },
      { header:'Data', width:13, type:'date', value:i=>dataExcel(i.dataEmissao) },
      { header:'Competência', width:12, type:'text', value:i=>formatarCompetencia(i.competencia) },
      { header:'Chave NF-e', width:46, type:'text', value:i=>texto(i.chaveNFe) },

      { header:'Tipo Operação', width:14, type:'text', value:i=>texto(i.tipoOperacao) },
      { header:'Natureza Operação', width:25, type:'text', wrap:true, value:i=>texto(i.naturezaOperacao) },

      { header:'Emitente', width:28, type:'text', value:i=>texto(i.emitente) },
      { header:'CNPJ Emitente', width:20, type:'text', value:i=>formatarCNPJ(i.emitenteCNPJ) },
      { header:'UF Emitente', width:10, type:'text', value:i=>texto(i.emitenteUF) },

      { header:'CNPJ Destinatário', width:20, type:'text', value:i=>formatarCNPJ(i.destinatarioCNPJ) },
      { header:'UF Destinatário', width:10, type:'text', value:i=>texto(i.destinatarioUF) },

      { header:'Item', width:8, type:'text', value:i=>texto(i.numeroItemNFe) },
      { header:'Código', width:13, type:'text', value:i=>texto(i.codigo) },
      { header:'Descrição', width:34, type:'text', wrap:true, value:i=>texto(i.descricao) },

      { header:'NCM', width:12, type:'text', value:i=>texto(i.ncm) },
      { header:'CEST', width:12, type:'text', value:i=>texto(i.cest) },
      { header:'GTIN/EAN', width:17, type:'text', value:i=>texto(i.gtin) },
      { header:'EX TIPI', width:10, type:'text', value:i=>texto(i.ex) },
      { header:'CFOP', width:10, type:'text', value:i=>texto(i.cfop) },

      { header:'Unidade', width:10, type:'text', value:i=>texto(i.unidadeComercial) },
      { header:'Quantidade', width:12, type:'number', value:i=>numero(i.quantidade) },
      { header:'Valor Unitário', width:15, type:'currency', value:i=>numero(i.valorUnitario) },
      { header:'Valor Produto', width:15, type:'currency', value:i=>numero(i.vProd) },

      { header:'Desconto', width:13, type:'currency', value:i=>numero(i.valorDesconto) },
      { header:'Frete', width:13, type:'currency', value:i=>numero(i.valorFrete) },
      { header:'Seguro', width:13, type:'currency', value:i=>numero(i.valorSeguro) },
      { header:'Outras Despesas', width:16, type:'currency', value:i=>numero(i.valorOutrasDespesas) }
    ]

    configurarCabecalhoRelatorio(
      wsNFe,
      'NF-e e Produtos',
      colNFe.length
    )

    formatarTabela(
      wsNFe,
      colNFe,
      5,
      itens,
      {
        xSplit:2,
        activeCell:'C'
      }
    )

    // ============================================================
    // ABA 3 — PIS E COFINS
    // ============================================================

    const wsPisCofins =
      workbook.addWorksheet(
        'PIS e COFINS',
        {
          properties:{
            defaultRowHeight:18
          }
        }
      )

    const colPisCofins = [
      { header:'NF', width:9, type:'text', value:i=>texto(i.nNF) },
      { header:'Item', width:8, type:'text', value:i=>texto(i.numeroItemNFe) },
      { header:'Código', width:13, type:'text', value:i=>texto(i.codigo) },
      { header:'Descrição', width:34, type:'text', wrap:true, value:i=>texto(i.descricao) },
      { header:'NCM', width:12, type:'text', value:i=>texto(i.ncm) },
      { header:'CFOP', width:10, type:'text', value:i=>texto(i.cfop) },

      { header:'CST PIS', width:11, type:'text', value:i=>texto(i.cstPIS) },
      { header:'Base PIS', width:14, type:'currency', value:i=>numero(i.basePIS) },
      { header:'Alíquota PIS', width:14, type:'percent', value:i=>numero(i.aliquotaPIS) },
      { header:'Valor PIS', width:14, type:'currency', value:i=>numero(i.vItemPIS) },
      { header:'PIS ST', width:13, type:'currency', value:i=>numero(i.valorPISST) },

      { header:'CST COFINS', width:13, type:'text', value:i=>texto(i.cstCOFINS) },
      { header:'Base COFINS', width:15, type:'currency', value:i=>numero(i.baseCOFINS) },
      { header:'Alíquota COFINS', width:16, type:'percent', value:i=>numero(i.aliquotaCOFINS) },
      { header:'Valor COFINS', width:15, type:'currency', value:i=>numero(i.vItemCOFINS) },
      { header:'COFINS ST', width:14, type:'currency', value:i=>numero(i.valorCOFINSST) },

      {
        header:'Classificação',
        width:18,
        type:'text',
        value:i=>classificacaoItem(i)
      },
      {
        header:'Considera Receita',
        width:17,
        type:'text',
        value:i=>i.consideraReceita ? 'Sim' : 'Não'
      },
      {
        header:'Classificação Revisada',
        width:20,
        type:'text',
        value:i=>i.classificacaoRevisada ? 'Sim' : 'Não'
      },
      {
        header:'Origem Classificação',
        width:22,
        type:'text',
        value:i=>texto(i.classificacaoOrigem)
      }
    ]

    configurarCabecalhoRelatorio(
      wsPisCofins,
      'Auditoria PIS e COFINS',
      colPisCofins.length
    )

    formatarTabela(
      wsPisCofins,
      colPisCofins,
      5,
      itens,
      {
        xSplit:2,
        activeCell:'C',
        destacarClassificacao:true
      }
    )

    // ============================================================
    // ABA 4 — ICMS E IPI
    // ============================================================

    const wsIcmsIpi =
      workbook.addWorksheet(
        'ICMS e IPI',
        {
          properties:{
            defaultRowHeight:18
          }
        }
      )

    const colIcmsIpi = [
      { header:'NF', width:9, type:'text', value:i=>texto(i.nNF) },
      { header:'Item', width:8, type:'text', value:i=>texto(i.numeroItemNFe) },
      { header:'Código', width:13, type:'text', value:i=>texto(i.codigo) },
      { header:'Descrição', width:34, type:'text', wrap:true, value:i=>texto(i.descricao) },
      { header:'NCM', width:12, type:'text', value:i=>texto(i.ncm) },
      { header:'CFOP', width:10, type:'text', value:i=>texto(i.cfop) },

      { header:'Origem ICMS', width:13, type:'text', value:i=>texto(i.origemICMS) },
      { header:'CST ICMS', width:11, type:'text', value:i=>texto(i.cstICMS) },
      { header:'CSOSN', width:10, type:'text', value:i=>texto(i.csosn) },

      { header:'Base ICMS', width:14, type:'currency', value:i=>numero(i.baseICMS) },
      { header:'Alíquota ICMS', width:15, type:'percent', value:i=>numero(i.aliquotaICMS) },
      { header:'Valor ICMS', width:14, type:'currency', value:i=>numero(i.valorICMS) },

      { header:'Base ICMS ST', width:15, type:'currency', value:i=>numero(i.baseICMSST) },
      { header:'Alíquota ICMS ST', width:17, type:'percent', value:i=>numero(i.aliquotaICMSST) },
      { header:'Valor ICMS ST', width:16, type:'currency', value:i=>numero(i.valorICMSST) },
      { header:'ICMS Desonerado', width:17, type:'currency', value:i=>numero(i.valorICMSDesonerado) },

      { header:'CST IPI', width:10, type:'text', value:i=>texto(i.cstIPI) },
      { header:'Base IPI', width:13, type:'currency', value:i=>numero(i.baseIPI) },
      { header:'Alíquota IPI', width:14, type:'percent', value:i=>numero(i.aliquotaIPI) },
      { header:'Valor IPI', width:13, type:'currency', value:i=>numero(i.valorIPI) }
    ]

    configurarCabecalhoRelatorio(
      wsIcmsIpi,
      'Auditoria ICMS e IPI',
      colIcmsIpi.length
    )

    formatarTabela(
      wsIcmsIpi,
      colIcmsIpi,
      5,
      itens,
      {
        xSplit:2,
        activeCell:'C'
      }
    )

    // ============================================================
    // ARQUIVO FINAL
    // ============================================================

    const limparNomeArquivo = valor =>
      texto(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')

    const empresaArquivo =
      limparNomeArquivo(
        cliente?.razao_social ||
        cliente?.nome_fantasia ||
        cliente?.cnpj ||
        'cliente'
      )

    const periodoArquivo =
      limparNomeArquivo(
        periodoTexto || ''
      )

    const nomeArquivo =
      `Auditoria_NFe_${empresaArquivo}` +
      `${periodoArquivo ? '_' + periodoArquivo : ''}.xlsx`

    const buffer =
      await workbook.xlsx.writeBuffer()

    const blob =
      new Blob(
        [buffer],
        {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      )

    const url =
      URL.createObjectURL(blob)

    const a =
      document.createElement('a')

    a.href = url
    a.download = nomeArquivo

    document.body.appendChild(a)
    a.click()
    a.remove()

    setTimeout(
      () => URL.revokeObjectURL(url),
      1000
    )

  } catch (e) {
    console.error(
      'Erro ao exportar Excel:',
      e
    )

    alert(
      'Erro ao gerar a planilha Excel: ' +
      e.message
    )
  }
}

  function exportarPDFMonofasicos() {
  if (!itens.length) {
    alert('Nao existem itens para exportar.')
    return
  }

  const valorTotalNFe = processados.reduce(
    (s, p) => s + Number(p.valorTotalNF || 0),
    0
  )

  const ajustesExclusoes = itens
    .filter(i => !i.consideraReceita)
    .reduce((s, i) => s + Number(i.vProd || 0), 0)
const receitaConsiderada = itens.reduce(
  (s, i) =>
    s +
    Number(i.vProd || 0) *
    Number(i.fatorReceita ?? (i.consideraReceita ? 1 : 0)),
  0
)

  const receitaMonofasicaPDF = itens
  .filter(i => i.monofasico)
  .reduce(
    (s, i) =>
      s +
      Number(i.vProd || 0) *
      Number(i.fatorReceita ?? (i.consideraReceita ? 1 : 0)),
    0
  )

  const receitaNaoMonofasica = itens
  .filter(i => !i.monofasico)
  .reduce(
    (s, i) =>
      s +
      Number(i.vProd || 0) *
      Number(i.fatorReceita ?? (i.consideraReceita ? 1 : 0)),
    0
  )

  const descontos = processados.reduce(
    (s, p) => s + Number(p.totalDesconto || 0),
    0
  )

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  doc.setFontSize(16)
  doc.text('e-FiscalTribe - Monofasicos PIS/COFINS', 14, 14)

  doc.setFontSize(9)
  doc.text(
    `${cliente?.razao_social || 'Cliente'} - ${cliente?.cnpj || ''}`,
    14,
    20
  )

  autoTable(doc, {
    startY: 26,
    theme: 'grid',
    head: [['Indicador', 'Valor']],
    body: [
      ['Total de itens', String(itens.length)],
      ['Itens monofasicos', String(itens.filter(i => i.monofasico).length)],
      ['Valor total NF-e', fmtR(valorTotalNFe)],
      ['Ajustes / Exclusoes', fmtR(ajustesExclusoes)],
      ['Receita considerada', fmtR(receitaConsiderada)],
      ['Receita monofasica', fmtR(receitaMonofasicaPDF)],
      ['Receita nao monofasica', fmtR(receitaNaoMonofasica)],
      ['Descontos comerciais', fmtR(descontos)],
      ['Potencial de recuperacao', fmtR(creditoTotal)],
    ],
    styles: {
      fontSize: 8
    }
  })

  const inicioTabela =
    (doc.lastAutoTable?.finalY || 26) + 7

  autoTable(doc, {
    startY: inicioTabela,
    theme: 'grid',
    head: [[
      'NF',
      'Data',
      'Produto',
      'NCM',
      'CFOP',
      'Valor',
      'PIS',
      'COFINS',
      'Classificacao',
      'Receita'
    ]],
    body: itens.map(item => [
      item.nNF || '',
      item.dataEmissao || '',
      item.descricao || '',
      item.ncm || '',
      item.cfop || '',
      fmtR(item.vProd),
      fmtR(item.vItemPIS),
      fmtR(item.vItemCOFINS),
      item.monofasico ? 'Monofasico' : 'Nao monofasico',
      item.consideraReceita ? 'Sim' : 'Nao'
    ]),
    styles: {
      fontSize: 7
    }
  })

  const nomeCliente = String(
    cliente?.razao_social || 'cliente'
  )
    .replace(/[^\w-]+/g, '_')

  doc.save(
    `FiscalTribe_Monofasicos_${nomeCliente}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  )
}
  
  function gerarRelatorioPDF() {
    // ── v8.9.4 FIX: usa itens_json do diagAberto quando disponivel
    // evita race condition ao abrir diagnostico do historico
    const diagRef = diagAbertoRef.current
    const itensParaPDF = (diagRef?.itens_json && diagRef.itens_json.length > 0)
    ? diagRef.itens_json
    : itens

    if (!itensParaPDF.length) return

    const totalMono = itensParaPDF.filter(i => i.monofasico).length
   const recMono = itensParaPDF
  .filter(i => i.monofasico)
  .reduce(
    (s, i) =>
      s +
      Number(i.vProd || 0) *
        Number(
          i.fatorReceita ??
          (i.consideraReceita ? 1 : 0)
        ),
    0
  )
    const credito =
  pgdasResult?.diferenca ??
  pgdasSupabase?.diferenca ??
  itensParaPDF
    .filter(i => i.monofasico)
    .reduce((s, i) => s + Number(i.credito || 0), 0)
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
<td>${i.efeitoReceita || '—'}</td>
<td style="text-align:right">${fmtR(
  Number(i.vProd || 0) *
  Number(
    i.fatorReceita ??
    (i.consideraReceita ? 1 : 0)
  )
)}</td>
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
<th>Efeito</th>
<th style="text-align:right">Efeito Receita</th>
<th style="text-align:right">PIS</th>
<th style="text-align:right">COFINS</th>
          </tr>
        </thead>
        <tbody>
          ${linhasTabela}
          <tr style="background:#F0FDF4;font-weight:700">
            <td colspan="6">TOTAL MONOFASICO</td>
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
    if (!itens.length) {
  alert('Não existem itens importados para salvar.')
  return
}

if (!cliente?.id) {
  alert('Selecione um Cliente Ativo antes de salvar o diagnóstico.')
  return
}
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const periodos = [...new Set(itens.map(i => i.competencia))].sort()
      const creditoFinal =
  pgdasResult?.diferenca ??
  pgdasSupabase?.diferenca ??
  itens
    .filter(i => i.monofasico)
    .reduce((s, i) => s + Number(i.credito || 0), 0)
      const { data: diagCriado, error } = await supabase
     .from('diagnosticos_monofasicos')
     .insert([{
        usuario_id: user.id, cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '', cliente_cnpj: cliente.cnpj || '', regime,
        nome_diagnostico: nomeDiagnostico || gerarNomeSugerido(),
        arquivos_importados: processados.map(p => ({
  nome: p.nome,
  tamanho: p.tamanho,
  status: p.status,
  qtd_itens: p.qtdItens || 0,
  valor_total_nf: Number(p.valorTotalNF || 0),
  total_desconto: Number(p.totalDesconto || 0),
})),
        importado_por: user.email || '',
        total_itens: itens.length,
        total_monofasicos: itens.filter(i => i.monofasico).length,
        receita_total: itens.reduce(
  (s, i) =>
    s +
    Number(i.vProd || 0) *
      Number(
        i.fatorReceita ??
        (i.consideraReceita ? 1 : 0)
      ),
  0
),

receita_monofasica: itens
  .filter(i => i.monofasico)
  .reduce(
    (s, i) =>
      s +
      Number(i.vProd || 0) *
        Number(
          i.fatorReceita ??
          (i.consideraReceita ? 1 : 0)
        ),
    0
  ),
        periodo_inicio: periodos[0] || null, periodo_fim: periodos[periodos.length - 1] || null,
        pgdas_json: pgdasResult || null,
        credito_estimado: creditoFinal,
        itens_json: null, // itens completos salvos em diagnostico_monofasico_itens
        status: 'concluido',
       }])
      .select('id')
      .single()

      if (error) throw error
	  const itensBanco = itens.map((item, index) => ({
      diagnostico_id: diagCriado.id,
      usuario_id: user.id,
      cliente_id: cliente.id,
      ordem_item: index + 1,

     nf: item.nNF || null,
     competencia: item.competencia || null,
     emitente: item.emitente || null,
     descricao: item.descricao || null,
     ncm: item.ncm || null,

     valor_produto: item.vProd || 0,
     valor_pis: item.vItemPIS || 0,
     valor_cofins: item.vItemCOFINS || 0,
     credito: item.credito || 0,

     monofasico: !!item.monofasico,
     pendente_pgdas: !!item.pendentePGDAS,

     arquivo: item.arquivo || null,
     codigo: item.codigo || null,
     gtin: item.gtin || null,
     ex_tipi: item.ex || null,
     cest: item.cest || null,
	 cfop: item.cfop || null,

cst_pis: item.cstPIS || null,
cst_cofins: item.cstCOFINS || null,
cst_icms: item.cstICMS || null,
csosn: item.csosn || null,

chave_nfe: item.chaveNFe || null,
data_emissao: item.dataEmissao || null,

emitente_cnpj: item.emitenteCNPJ || null,
destinatario_cnpj: item.destinatarioCNPJ || null,

tipo_operacao: item.tipoOperacao || null,
natureza_operacao: item.naturezaOperacao || null,

quantidade: item.quantidade || 0,
valor_desconto: item.valorDesconto || 0,
valor_frete: item.valorFrete || 0,

valor_icms: item.valorICMS || 0,
valor_icms_st: item.valorICMSST || 0,
valor_ipi: item.valorIPI || 0,

numero_item_nfe: item.numeroItemNFe || null,
serie_nfe: item.serieNFe || null,
modelo_nfe: item.modeloNFe || null,
finalidade_nfe: item.finalidadeNFe || null,
indicador_destino: item.indicadorDestino || null,
consumidor_final: item.consumidorFinal || null,
presenca_comprador: item.presencaComprador || null,
emitente_uf: item.emitenteUF || null,
destinatario_uf: item.destinatarioUF || null,

unidade_comercial: item.unidadeComercial || null,
valor_unitario: item.valorUnitario || 0,
quantidade_tributavel: item.quantidadeTributavel || 0,
unidade_tributavel: item.unidadeTributavel || null,
valor_unitario_tributavel: item.valorUnitarioTributavel || 0,
valor_seguro: item.valorSeguro || 0,
valor_outras_despesas: item.valorOutrasDespesas || 0,
inclui_total_nf: item.incluiTotalNF || null,
codigo_beneficio_fiscal: item.codigoBeneficioFiscal || null,
pedido_compra: item.pedidoCompra || null,
item_pedido_compra: item.itemPedidoCompra || null,
info_adicional_produto: item.infoAdicionalProduto || null,

base_pis: item.basePIS || 0,
aliquota_pis: item.aliquotaPIS || 0,
quantidade_base_pis: item.quantidadeBasePIS || 0,
aliquota_valor_pis: item.aliquotaValorPIS || 0,
valor_pis_st: item.valorPISST || 0,

base_cofins: item.baseCOFINS || 0,
aliquota_cofins: item.aliquotaCOFINS || 0,
quantidade_base_cofins: item.quantidadeBaseCOFINS || 0,
aliquota_valor_cofins: item.aliquotaValorCOFINS || 0,
valor_cofins_st: item.valorCOFINSST || 0,

origem_icms: item.origemICMS || null,
modalidade_bc_icms: item.modalidadeBCICMS || null,
base_icms: item.baseICMS || 0,
reducao_bc_icms: item.reducaoBCICMS || 0,
aliquota_icms: item.aliquotaICMS || 0,
valor_icms_desonerado: item.valorICMSDesonerado || 0,
motivo_desoneracao_icms: item.motivoDesoneracaoICMS || null,
modalidade_bc_st: item.modalidadeBCST || null,
mva_st: item.mvaST || 0,
reducao_bc_st: item.reducaoBCST || 0,
base_icms_st: item.baseICMSST || 0,
aliquota_icms_st: item.aliquotaICMSST || 0,
aliquota_fcp: item.aliquotaFCP || 0,
valor_fcp: item.valorFCP || 0,
aliquota_fcp_st: item.aliquotaFCPST || 0,
valor_fcp_st: item.valorFCPST || 0,

cst_ipi: item.cstIPI || null,
enquadramento_ipi: item.enquadramentoIPI || null,
base_ipi: item.baseIPI || 0,
aliquota_ipi: item.aliquotaIPI || 0,

considera_receita: item.consideraReceita ?? true,
motivo_nao_considerar_receita: item.motivoNaoConsiderarReceita || null,
efeito_receita: item.efeitoReceita || null,
fator_receita: Number(
  item.fatorReceita ??
  (item.consideraReceita ? 1 : 0)
),

classificacao_revisada: item.classificacaoRevisada ?? false,
classificacao_origem: item.classificacaoOrigem || 'xml',
    }))
	const TAMANHO_LOTE = 500

    for (let i = 0; i < itensBanco.length; i += TAMANHO_LOTE) {
    const lote = itensBanco.slice(i, i + TAMANHO_LOTE)

    const { error: erroItens } = await supabase
    .from('diagnostico_monofasico_itens')
    .insert(lote)

    if (erroItens) {
    await supabase
      .from('diagnosticos_monofasicos')
      .delete()
      .eq('id', diagCriado.id)

    throw erroItens
    }
  }
    setDiagnosticoSalvoId(diagCriado.id)

    await carregarHistorico()

    return diagCriado.id
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function excluirDiagnostico(id) {
  if (!window.confirm('Excluir este diagnostico?')) return

  try {
    const { error } = await supabase
      .from('diagnosticos_monofasicos')
      .delete()
      .eq('id', id)

    if (error) throw error

    const eraDiagnosticoAberto =
      diagAbertoRef.current?.id === id ||
      diagAberto?.id === id

    if (eraDiagnosticoAberto) {
      limparDados()
    }

    await carregarHistorico()

    // depois da exclusao, deixa o modulo pronto
    // para uma nova importacao
    setAba('importar')

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }, 0)

  } catch (e) {
    alert('Erro ao excluir diagnostico: ' + e.message)
  }
}

async function excluirDiagnosticosSelecionados() {
  if (diagnosticosSelecionados.length === 0) return

  const quantidade = diagnosticosSelecionados.length

  if (
    !window.confirm(
      `Excluir ${quantidade} diagnóstico${quantidade > 1 ? 's' : ''} selecionado${quantidade > 1 ? 's' : ''}?`
    )
  ) return

  try {
    const { error } = await supabase
      .from('diagnosticos_monofasicos')
      .delete()
      .in('id', diagnosticosSelecionados)

    if (error) throw error

    const apagouDiagnosticoAberto =
      diagnosticosSelecionados.some(id =>
        diagAbertoRef.current?.id === id ||
        diagAberto?.id === id
      )

    if (apagouDiagnosticoAberto) {
      limparDados()
    }

    setDiagnosticosSelecionados([])

    await carregarHistorico()

  } catch (e) {
    alert('Erro ao excluir diagnósticos: ' + e.message)
  }
}

  async function abrirDiagnostico(diag) {
  try {
    const todosItensBanco = []
    const LOTE = 500
    let inicio = 0
    let terminou = false

    while (!terminou) {
      const { data, error } = await supabase
        .from('diagnostico_monofasico_itens')
        .select('*')
        .eq('diagnostico_id', diag.id)
        .order('ordem_item', { ascending: true })
        .range(inicio, inicio + LOTE - 1)

      if (error) throw error

      if (data && data.length > 0) {
        todosItensBanco.push(...data)
      }

      if (!data || data.length < LOTE) {
        terminou = true
      } else {
        inicio += LOTE
      }
    }

    const itensCompletos = todosItensBanco.length > 0
      ? todosItensBanco.map(item => ({
          nNF: item.nf || '-',
          competencia: item.competencia || '',
          emitente: item.emitente || '-',
          descricao: item.descricao || '-',
          ncm: item.ncm || '-',

          vProd: parseFloat(item.valor_produto || 0),
          vItemPIS: parseFloat(item.valor_pis || 0),
          vItemCOFINS: parseFloat(item.valor_cofins || 0),
          credito: parseFloat(item.credito || 0),

          monofasico: !!item.monofasico,
          pendentePGDAS: !!item.pendente_pgdas,

          arquivo: item.arquivo || '',
          codigo: item.codigo || '',
          gtin: item.gtin || null,
          ex: item.ex_tipi || null,
          cest: item.cest || null,

          cfop: item.cfop || null,
          cstPIS: item.cst_pis || null,
          cstCOFINS: item.cst_cofins || null,
          cstICMS: item.cst_icms || null,
          csosn: item.csosn || null,

          chaveNFe: item.chave_nfe || null,
          dataEmissao: item.data_emissao || null,
          emitenteCNPJ: item.emitente_cnpj || null,
          destinatarioCNPJ: item.destinatario_cnpj || null,
          tipoOperacao: item.tipo_operacao || null,
          naturezaOperacao: item.natureza_operacao || null,

          quantidade: parseFloat(item.quantidade || 0),
          valorDesconto: parseFloat(item.valor_desconto || 0),
          valorFrete: parseFloat(item.valor_frete || 0),
          valorICMS: parseFloat(item.valor_icms || 0),
          valorICMSST: parseFloat(item.valor_icms_st || 0),
          valorIPI: parseFloat(item.valor_ipi || 0),

          numeroItemNFe: item.numero_item_nfe || null,
          serieNFe: item.serie_nfe || null,
          modeloNFe: item.modelo_nfe || null,
          finalidadeNFe: item.finalidade_nfe || null,
          indicadorDestino: item.indicador_destino || null,
          consumidorFinal: item.consumidor_final || null,
          presencaComprador: item.presenca_comprador || null,
          emitenteUF: item.emitente_uf || null,
          destinatarioUF: item.destinatario_uf || null,

          unidadeComercial: item.unidade_comercial || null,
          valorUnitario: parseFloat(item.valor_unitario || 0),
          quantidadeTributavel: parseFloat(item.quantidade_tributavel || 0),
          unidadeTributavel: item.unidade_tributavel || null,
          valorUnitarioTributavel: parseFloat(item.valor_unitario_tributavel || 0),
          valorSeguro: parseFloat(item.valor_seguro || 0),
          valorOutrasDespesas: parseFloat(item.valor_outras_despesas || 0),
          incluiTotalNF: item.inclui_total_nf || null,
          codigoBeneficioFiscal: item.codigo_beneficio_fiscal || null,
          pedidoCompra: item.pedido_compra || null,
          itemPedidoCompra: item.item_pedido_compra || null,
          infoAdicionalProduto: item.info_adicional_produto || null,

          basePIS: parseFloat(item.base_pis || 0),
          aliquotaPIS: parseFloat(item.aliquota_pis || 0),
          quantidadeBasePIS: parseFloat(item.quantidade_base_pis || 0),
          aliquotaValorPIS: parseFloat(item.aliquota_valor_pis || 0),
          valorPISST: parseFloat(item.valor_pis_st || 0),

          baseCOFINS: parseFloat(item.base_cofins || 0),
          aliquotaCOFINS: parseFloat(item.aliquota_cofins || 0),
          quantidadeBaseCOFINS: parseFloat(item.quantidade_base_cofins || 0),
          aliquotaValorCOFINS: parseFloat(item.aliquota_valor_cofins || 0),
          valorCOFINSST: parseFloat(item.valor_cofins_st || 0),

          origemICMS: item.origem_icms || null,
          modalidadeBCICMS: item.modalidade_bc_icms || null,
          baseICMS: parseFloat(item.base_icms || 0),
          reducaoBCICMS: parseFloat(item.reducao_bc_icms || 0),
          aliquotaICMS: parseFloat(item.aliquota_icms || 0),
          valorICMSDesonerado: parseFloat(item.valor_icms_desonerado || 0),
          motivoDesoneracaoICMS: item.motivo_desoneracao_icms || null,
          modalidadeBCST: item.modalidade_bc_st || null,
          mvaST: parseFloat(item.mva_st || 0),
          reducaoBCST: parseFloat(item.reducao_bc_st || 0),
          baseICMSST: parseFloat(item.base_icms_st || 0),
          aliquotaICMSST: parseFloat(item.aliquota_icms_st || 0),
          aliquotaFCP: parseFloat(item.aliquota_fcp || 0),
          valorFCP: parseFloat(item.valor_fcp || 0),
          aliquotaFCPST: parseFloat(item.aliquota_fcp_st || 0),
          valorFCPST: parseFloat(item.valor_fcp_st || 0),

          cstIPI: item.cst_ipi || null,
          enquadramentoIPI: item.enquadramento_ipi || null,
          baseIPI: parseFloat(item.base_ipi || 0),
          aliquotaIPI: parseFloat(item.aliquota_ipi || 0),

          consideraReceita: item.considera_receita ?? true,
motivoNaoConsiderarReceita: item.motivo_nao_considerar_receita || null,

efeitoReceita:
  item.efeito_receita ||
  (item.considera_receita === false
    ? EFEITO_RECEITA.NEUTRO
    : EFEITO_RECEITA.VENDA),

fatorReceita:
  item.fator_receita !== null &&
  item.fator_receita !== undefined
    ? Number(item.fator_receita)
    : (item.considera_receita === false ? 0 : 1),
          classificacaoRevisada: item.classificacao_revisada ?? false,
          classificacaoOrigem: item.classificacao_origem || 'xml',
        }))
      : (diag.itens_json || [])

    const diagCompleto = {
      ...diag,
      itens_json: itensCompletos,
    }

    diagAbertoRef.current = diagCompleto
    setDiagAberto(diagCompleto)
	setDiagnosticoSalvoId(diag.id)
    setItens(itensCompletos)
	
	const processadosSalvos = Array.isArray(diag.arquivos_importados)
  ? diag.arquivos_importados.map(p => ({
      ...p,
      qtdItens: Number(p.qtd_itens || 0),
      valorTotalNF: Number(p.valor_total_nf || 0),
      totalDesconto: Number(p.total_desconto || 0),
    }))
  : []

setProcessados(processadosSalvos)

    setPgdasResult(diag.pgdas_json || null)
    setAba('importar')
    setPagina(1)
    setSelecionados([])

  } catch (e) {
    alert('Erro ao abrir diagnostico: ' + e.message)
  }
}

  	function limparDados() {
  diagAbertoRef.current = null
  nfeCanceladasRef.current.clear()
  setDiagnosticoSalvoId(null)

  setPgdasForm({
    receita_bruta_total: '',
    receita_monofasica: '',
    receita_st: '',
    das_recolhido: '',
    segregou: false,
  })

  setItens([]); setArquivos([]); setProcessados([]); setPgdasResult(null); setPgdasSupabase(null)
    setDiagAberto(null); setSelecionados([]); setErro(''); setUpsertInfo(null); setItemDetalhe(null)
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
      class_pis_cofins_econsulta: null,
      status_ncm: item.ncm ? 'encontrada' : 'nao_encontrada',
      considerar_receita: item.consideraReceita ?? true,
      duplicado: false,
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

  const files = Array.from(
    e.dataTransfer?.files ||
    e.target?.files ||
    []
  )

  if (files.length === 0) return

  const assinaturasExistentes = new Set(
    arquivos.map(a =>
      `${a.nome}|${a.file?.size || 0}|${a.file?.lastModified || 0}`
    )
  )

  const novos = []
  const repetidos = []

  for (const f of files) {
    const assinatura =
      `${f.name}|${f.size}|${f.lastModified}`

    if (assinaturasExistentes.has(assinatura)) {
      repetidos.push(f.name)
      continue
    }

    assinaturasExistentes.add(assinatura)

    novos.push({
      file: f,
      nome: f.name,
      tamanho: (f.size / 1024).toFixed(0) + ' KB',
      status: 'pendente',
    })
  }

  if (repetidos.length > 0 && novos.length === 0) {
  setProcessando(false)

  if (inputRef.current) {
    inputRef.current.value = ''
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.alert(
        `Este arquivo XML já foi importado nesta análise:\n\n` +
        repetidos.join('\n')
      )
    })
  })

  return
}

  if (novos.length === 0) {
    if (inputRef.current) inputRef.current.value = ''
    return
  }

  const atualizados = [...arquivos, ...novos]

  setArquivos(atualizados)
  await processarArquivos(atualizados)
}

  async function processarArquivos(listaArquivos) {
    if (!listaArquivos || listaArquivos.length === 0) return
	diagAbertoRef.current = null
    setProcessando(true); setErro(''); setDiagAberto(null); setSelecionados([])
    const novosProcessados = [], todosItens = []
    const nfeJaImportadas = new Set()
    const itensJaImportados = new Set()
    const xmlDuplicados = []
	const arquivosDuplicadosNaAnalise = new Set()
    const nfeCanceladas = nfeCanceladasRef.current
    for (const arq of listaArquivos) {
      try {
        if (arq.nome.toLowerCase().endsWith('.xml')) {
          const texto = await arq.file.text()
          const xmls = texto.includes('<nfeProc') ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x+'</nfeProc>') : [texto]
          let qtd = 0
let valorTotalNFArquivo = 0
let descontoTotalArquivo = 0
          for (const xml of xmls) {
            try {
              const nfe = parseXMLNFe(xml)

if (nfe.tipoDocumento === 'evento') {
	if (nfe.eventoCancelamento && nfe.chNFe) {
        nfeCanceladas.add(nfe.chNFe)	  
        todosItens.forEach(item => {
        if (item.chaveNFe === nfe.chNFe) {
        item.efeitoReceita = EFEITO_RECEITA.CANCELAMENTO
        item.fatorReceita = 0
        item.consideraReceita = false
        item.motivoNaoConsiderarReceita =
          'NF-e cancelada por evento fiscal'
      }
    })
  }

  continue
}

if (!nfe.competencia) continue
			  const chaveDocumento =
  nfe.chNFe ||
  `${nfe.emitCNPJ || ''}-${nfe.nNF || ''}-${nfe.serie || ''}`

if (!nfeJaImportadas.has(chaveDocumento)) {
  valorTotalNFArquivo += Number(nfe.totalNF || 0)
  descontoTotalArquivo += Number(nfe.totalDesconto || 0)

  nfeJaImportadas.add(chaveDocumento)
} else {
  xmlDuplicados.push({
    arquivo: arq.nome,
    nNF: nfe.nNF || '—',
    chave: nfe.chNFe || chaveDocumento,
  })

  arquivosDuplicadosNaAnalise.add(arq.file)

  continue
}
              ;(nfe.itens || []).forEach((item, itemIndex) => {
  const numeroItem =
    item.numeroItem ||
    item.nItem ||
    (itemIndex + 1)

  const chaveItem =
    `${chaveDocumento}-${numeroItem}`

  if (itensJaImportados.has(chaveItem)) {
    return
  }

  itensJaImportados.add(chaveItem)

  const mono = isMonofasico(item.ncm)

const efeitoReceita = classificarEfeitoReceita({
  cfop: item.cfop,
  tipoOperacao: nfe.tipoOperacao || nfe.tipo,
  naturezaOperacao: nfe.naturezaOperacao,
  chaveNFeReferenciada: nfe.chaveNFeReferenciada,
  cancelada: nfeCanceladas.has(nfe.chNFe),
})

todosItens.push({
  nNF: nfe.nNF || '-',
  competencia: nfe.competencia,
  emitente: nfe.emitNome || '-',

  ncm: item.ncm || '-',
  descricao: item.xProd || '-',
  vProd: item.vProd || 0,

  vItemPIS: item.vItemPIS || 0,
  vItemCOFINS: item.vItemCOFINS || 0,

  monofasico: mono,

  credito:
    mono && regime !== 'Simples Nacional'
      ? (item.vItemPIS || 0) + (item.vItemCOFINS || 0)
      : 0,

  pendentePGDAS:
    mono && regime === 'Simples Nacional',

  arquivo: arq.nome,
  codigo: item.cProd || '',
  gtin: item.cEAN || null,
  ex: item.EXTIPI || null,
  cest: item.CEST || null,

  // Dados fiscais completos da NF-e
  cfop: item.cfop || null,
  cstPIS: item.cstPIS || null,
  cstCOFINS: item.cstCOFINS || null,
  cstICMS: item.cstICMS || null,
  csosn: item.csosn || null,

  chaveNFe: nfe.chNFe || null,
  chaveNFeReferenciada: nfe.chaveNFeReferenciada || null,
  chavesNFeReferenciadas: nfe.chavesNFeReferenciadas || [],
  dataEmissao: nfe.dataEmissao || null,

  emitenteCNPJ: nfe.emitCNPJ || null,
  destinatarioCNPJ: nfe.destCNPJ || null,

  tipoOperacao: nfe.tipoOperacao || nfe.tipo || null,
  naturezaOperacao: nfe.naturezaOperacao || null,

  quantidade: item.qCom || 0,
  valorDesconto: item.vDesc || 0,
  valorFrete: item.vFrete || 0,

  valorICMS: item.vICMS || 0,
  valorICMSST: item.vICMSST || 0,
  valorIPI: item.vIPI || 0,

  numeroItemNFe: item.numeroItem || null,
  serieNFe: nfe.serie || null,
  modeloNFe: nfe.modelo || null,
  finalidadeNFe: nfe.finNFe || null,
  indicadorDestino: nfe.idDest || null,
  consumidorFinal: nfe.indFinal || null,
  presencaComprador: nfe.indPres || null,
  emitenteUF: nfe.emitUF || null,
  destinatarioUF: nfe.destUF || null,

  unidadeComercial: item.uCom || null,
  valorUnitario: item.vUnCom || 0,
  quantidadeTributavel: item.qTrib || 0,
  unidadeTributavel: item.uTrib || null,
  valorUnitarioTributavel: item.vUnTrib || 0,
  valorSeguro: item.vSeg || 0,
  valorOutrasDespesas: item.vOutro || 0,
  incluiTotalNF: item.indTot || null,
  codigoBeneficioFiscal: item.cBenef || null,
  pedidoCompra: item.xPed || null,
  itemPedidoCompra: item.nItemPed || null,
  infoAdicionalProduto: item.infAdProd || null,

  basePIS: item.vBCPIS || 0,
  aliquotaPIS: item.pPIS || 0,
  quantidadeBasePIS: item.qBCProdPIS || 0,
  aliquotaValorPIS: item.vAliqProdPIS || 0,
  valorPISST: item.vPISST || 0,

  baseCOFINS: item.vBCCOFINS || 0,
  aliquotaCOFINS: item.pCOFINS || 0,
  quantidadeBaseCOFINS: item.qBCProdCOFINS || 0,
  aliquotaValorCOFINS: item.vAliqProdCOFINS || 0,
  valorCOFINSST: item.vCOFINSST || 0,

  origemICMS: item.origICMS || null,
  modalidadeBCICMS: item.modBC || null,
  baseICMS: item.vBCICMS || 0,
  reducaoBCICMS: item.pRedBC || 0,
  aliquotaICMS: item.pICMS || 0,
  valorICMSDesonerado: item.vICMSDeson || 0,
  motivoDesoneracaoICMS: item.motDesICMS || null,
  modalidadeBCST: item.modBCST || null,
  mvaST: item.pMVAST || 0,
  reducaoBCST: item.pRedBCST || 0,
  baseICMSST: item.vBCST || 0,
  aliquotaICMSST: item.pICMSST || 0,
  aliquotaFCP: item.pFCP || 0,
  valorFCP: item.vFCP || 0,
  aliquotaFCPST: item.pFCPST || 0,
  valorFCPST: item.vFCPST || 0,

  cstIPI: item.cstIPI || null,
  enquadramentoIPI: item.cEnqIPI || null,
  baseIPI: item.vBCIPI || 0,
  aliquotaIPI: item.pIPI || 0,

  // Sera refinado depois pelas regras de CFOP
  efeitoReceita: efeitoReceita.efeitoReceita,
fatorReceita: efeitoReceita.fatorReceita,
consideraReceita: efeitoReceita.consideraReceita,
motivoNaoConsiderarReceita: efeitoReceita.motivoEfeitoReceita,

  classificacaoRevisada: false,
  classificacaoOrigem: 'xml',
})
                qtd++
              })
            } catch {}
          }
          novosProcessados.push({
  ...arq,
  status: 'concluido',
  qtdItens: qtd,
  valorTotalNF: valorTotalNFArquivo,
  totalDesconto: descontoTotalArquivo,
})
        } else {
          novosProcessados.push({ ...arq, status: 'ignorado', qtdItens: 0 })
        }
      } catch { novosProcessados.push({ ...arq, status: 'erro', qtdItens: 0 }) }
    }
	
	if (xmlDuplicados.length > 0) {
  const duplicadosUnicos = Array.from(
    new Map(
      xmlDuplicados.map(d => [d.chave, d])
    ).values()
  )

  const listaDuplicados = duplicadosUnicos
    .map(d => `NF-e ${d.nNF} — ${d.arquivo}`)
    .join('\n')

  const titulo =
    duplicadosUnicos.length === 1
      ? 'Este arquivo XML já foi importado nesta análise.'
      : `${duplicadosUnicos.length} arquivos XML já foram importados nesta análise.`

  requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.alert(
      `${titulo}\n\n` +
      `${listaDuplicados}\n\n` +
      `Os arquivos duplicados foram ignorados e não alteraram os valores da análise.`
    )
  })
})
}
	
    if (regime === 'Simples Nacional') {
  const recMono = todosItens
    .filter(i => i.monofasico)
    .reduce(
      (s, i) =>
        s +
        Number(i.vProd || 0) *
          Number(
            i.fatorReceita ??
            (i.consideraReceita ? 1 : 0)
          ),
      0
    )

  const recTotal = todosItens
    .reduce(
      (s, i) =>
        s +
        Number(i.vProd || 0) *
          Number(
            i.fatorReceita ??
            (i.consideraReceita ? 1 : 0)
          ),
      0
    )

  setPgdasForm(prev => ({
    ...prev,
    receita_bruta_total: recTotal.toFixed(2),
    receita_monofasica: recMono.toFixed(2)
  }))
}
    setArquivos(
  listaArquivos.filter(
    arq => !arquivosDuplicadosNaAnalise.has(arq.file)
  )
)

setProcessados(
  novosProcessados.filter(
    arq => !arquivosDuplicadosNaAnalise.has(arq.file)
  )
)
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

  function escHTML(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}


function ordenarCompetencias(a, b) {
  const ma = String(a || '').match(/^(\d{2})\/(\d{4})$/)
  const mb = String(b || '').match(/^(\d{2})\/(\d{4})$/)

  if (!ma || !mb) {
    return String(a || '').localeCompare(String(b || ''))
  }

  const va = Number(ma[2]) * 100 + Number(ma[1])
  const vb = Number(mb[2]) * 100 + Number(mb[1])

  return va - vb
}


function criarSnapshotItens(lista) {
  return lista.map((item, index) => ({
    ordem: index + 1,

    nNF: item.nNF || '',
    numeroItemNFe: item.numeroItemNFe || null,
    serieNFe: item.serieNFe || '',
    chaveNFe: item.chaveNFe || '',

    competencia: item.competencia || '',
    dataEmissao: item.dataEmissao || '',

    emitente: item.emitente || '',
    emitenteCNPJ: item.emitenteCNPJ || '',
    destinatarioCNPJ: item.destinatarioCNPJ || '',

    codigo: item.codigo || '',
    descricao: item.descricao || '',
    ncm: item.ncm || '',
    cest: item.cest || '',
    cfop: item.cfop || '',

    quantidade: Number(item.quantidade || 0),
    vProd: Number(item.vProd || 0),

    cstPIS: item.cstPIS || '',
    basePIS: Number(item.basePIS || 0),
    aliquotaPIS: Number(item.aliquotaPIS || 0),
    vItemPIS: Number(item.vItemPIS || 0),

    cstCOFINS: item.cstCOFINS || '',
    baseCOFINS: Number(item.baseCOFINS || 0),
    aliquotaCOFINS: Number(item.aliquotaCOFINS || 0),
    vItemCOFINS: Number(item.vItemCOFINS || 0),

    origemICMS: item.origemICMS || '',
    cstICMS: item.cstICMS || '',
    csosn: item.csosn || '',

    baseICMS: Number(item.baseICMS || 0),
    aliquotaICMS: Number(item.aliquotaICMS || 0),
    valorICMS: Number(item.valorICMS || 0),

    baseICMSST: Number(item.baseICMSST || 0),
    aliquotaICMSST: Number(item.aliquotaICMSST || 0),
    valorICMSST: Number(item.valorICMSST || 0),

    cstIPI: item.cstIPI || '',
    baseIPI: Number(item.baseIPI || 0),
    aliquotaIPI: Number(item.aliquotaIPI || 0),
    valorIPI: Number(item.valorIPI || 0),

    monofasico: !!item.monofasico,

    consideraReceita:
      item.consideraReceita ?? true,

    motivoNaoConsiderarReceita:
      item.motivoNaoConsiderarReceita || '',

    classificacaoRevisada:
      item.classificacaoRevisada ?? false,

    classificacaoOrigem:
      item.classificacaoOrigem || 'xml',
  }))
  }


  function imprimirVisaoAuditoria() {
  if (!itensFiltrados.length) return

  const lista = itensFiltrados.filter(i => !i.ghost)

  const linhas = lista.map(item => `
    <tr>
      <td>${escHTML(item.nNF)}</td>
      <td>${escHTML(item.numeroItemNFe || '')}</td>
      <td>${escHTML(item.dataEmissao || '')}</td>
      <td>${escHTML(item.cfop || '')}</td>
      <td>${escHTML(item.ncm || '')}</td>

      <td>${escHTML(item.cstPIS || '')}</td>
      <td class="num">${fmtR(item.basePIS)}</td>
      <td class="num">${Number(item.aliquotaPIS || 0).toLocaleString('pt-BR')}%</td>
      <td class="num">${fmtR(item.vItemPIS)}</td>

      <td>${escHTML(item.cstCOFINS || '')}</td>
      <td class="num">${fmtR(item.baseCOFINS)}</td>
      <td class="num">${Number(item.aliquotaCOFINS || 0).toLocaleString('pt-BR')}%</td>
      <td class="num">${fmtR(item.vItemCOFINS)}</td>

      <td>${escHTML(item.origemICMS || '')}</td>
      <td>${escHTML(item.cstICMS || '')}</td>
      <td>${escHTML(item.csosn || '')}</td>

      <td class="num">${fmtR(item.baseICMS)}</td>
      <td class="num">${Number(item.aliquotaICMS || 0).toLocaleString('pt-BR')}%</td>
      <td class="num">${fmtR(item.valorICMS)}</td>

      <td class="num">${fmtR(item.baseICMSST)}</td>
      <td class="num">${Number(item.aliquotaICMSST || 0).toLocaleString('pt-BR')}%</td>
      <td class="num">${fmtR(item.valorICMSST)}</td>

      <td>${escHTML(item.cstIPI || '')}</td>
      <td class="num">${fmtR(item.valorIPI)}</td>

      <td>${item.monofasico ? 'MONOFASICO' : 'NAO MONOFASICO'}</td>
    </tr>
  `).join('')

  const janela = window.open('', '_blank', 'width=1400,height=800')

  if (!janela) {
    alert('O navegador bloqueou a janela de impressao.')
    return
  }

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">

      <title>Visao Auditoria NF-e</title>

      <style>
        @page {
          size: A2 landscape;
          margin: 8mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          color: #0F172A;
          margin: 0;
          font-size: 8px;
        }

        .cabecalho {
          border-bottom: 3px solid #0B1F4D;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }

        h1 {
          font-size: 16px;
          color: #0B1F4D;
          margin: 0 0 4px;
        }

        .meta {
          font-size: 9px;
          line-height: 1.5;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }

        thead {
          display: table-header-group;
        }

        th {
          background: #4B5563;
          color: white;
          padding: 4px;
          border: 1px solid #64748B;
          white-space: nowrap;
          font-size: 8px;
        }

        td {
          border: 1px solid #CBD5E1;
          padding: 3px 4px;
          white-space: nowrap;
          font-size: 8px;
        }

        tr:nth-child(even) {
          background: #F8FAFC;
        }

        .num {
          text-align: right;
        }

        .rodape {
          margin-top: 10px;
          font-size: 8px;
          color: #64748B;
        }
      </style>
    </head>

    <body>

      <div class="cabecalho">
        <h1>e-FiscalTribe® — Visao Auditoria NF-e</h1>

        <div class="meta">
          <strong>Cliente:</strong>
          ${escHTML(cliente?.razao_social || '')}
          <br>

          <strong>CNPJ:</strong>
          ${escHTML(cliente?.cnpj || '')}

          &nbsp;&nbsp;

          <strong>Regime:</strong>
          ${escHTML(regime || '')}

          <br>

          <strong>Filtro impresso:</strong>
          ${escHTML(filtro)}

          &nbsp;&nbsp;

          <strong>Itens:</strong>
          ${lista.length}

          &nbsp;&nbsp;

          <strong>Gerado em:</strong>
          ${new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>NF</th>
            <th>Item</th>
            <th>Data</th>
            <th>CFOP</th>
            <th>NCM</th>

            <th>CST PIS</th>
            <th>BC PIS</th>
            <th>Aliq. PIS</th>
            <th>PIS</th>

            <th>CST COFINS</th>
            <th>BC COFINS</th>
            <th>Aliq. COFINS</th>
            <th>COFINS</th>

            <th>Orig.</th>
            <th>CST ICMS</th>
            <th>CSOSN</th>

            <th>BC ICMS</th>
            <th>Aliq. ICMS</th>
            <th>ICMS</th>

            <th>BC ST</th>
            <th>Aliq. ST</th>
            <th>ICMS-ST</th>

            <th>CST IPI</th>
            <th>IPI</th>

            <th>Classificacao</th>
          </tr>
        </thead>

        <tbody>
          ${linhas}
        </tbody>
      </table>

      <div class="rodape">
        Documento analitico gerado pelo e-FiscalTribe®.
        A impressao considera todos os registros do filtro atual,
        independentemente da paginacao exibida na tela.
      </div>

    </body>
    </html>
  `)

  janela.document.close()
  janela.focus()

  setTimeout(() => {
    janela.print()
  }, 600)
}


async function gerarMemoriaCalculo() {
  if (!itens.length) {
    alert('Nao ha itens para gerar a memoria.')
    return
  }

  const diagnosticoId =
    diagAberto?.id ||
    diagAbertoRef.current?.id ||
    diagnosticoSalvoId

  if (!diagnosticoId) {
    alert(
      'Primeiro salve o diagnostico. A memoria precisa ficar vinculada a um diagnostico salvo.'
    )
    return
  }

  setSalvandoMemoria(true)

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      throw new Error('Usuario nao autenticado.')
    }

    const periodos = [
  ...new Set(
    itens
      .map(i => i.competencia)
      .filter(Boolean)
  ),
].sort(ordenarCompetencias)


// ============================================================
// CONFERENCIA DAS COMPETENCIAS PGDAS-D
// ============================================================

const competenciasAnalisadas = [
  ...new Set(
    periodos
      .map(normalizarCompetencia)
      .filter(Boolean)
  )
].sort(ordenarCompetencias)

const registrosPGDAS =
  Array.isArray(pgdasSupabase?.registros)
    ? pgdasSupabase.registros
    : []

let competenciasPGDAS = [
  ...new Set(
    registrosPGDAS
      .map(p => normalizarCompetencia(p.competencia))
      .filter(Boolean)
  )
].sort(ordenarCompetencias)

const temPGDASDocumental =
  competenciasPGDAS.length > 0

const temPGDASManual =
  !!pgdasResult &&
  competenciasAnalisadas.length === 1 &&
  !temPGDASDocumental

const competenciaPGDASManual =
  temPGDASManual
    ? competenciasAnalisadas[0]
    : null

const competenciasCobertasPGDAS =
  new Set([
    ...competenciasPGDAS,
    ...(competenciaPGDASManual
      ? [competenciaPGDASManual]
      : [])
  ])

const competenciasPendentes =
  competenciasAnalisadas.filter(
    competencia =>
      !competenciasCobertasPGDAS.has(competencia)
  )

const pgdasConciliacaoCompleta =
  competenciasAnalisadas.length > 0 &&
  competenciasPendentes.length === 0

const pgdasVinculado =
  temPGDASDocumental || temPGDASManual

const fontePGDAS =
  temPGDASDocumental
    ? 'diagnosticos_pgdas'
    : temPGDASManual
      ? 'calculo_tela'
      : 'nao_vinculado'

const tipoVinculoPGDAS =
  temPGDASDocumental
    ? 'documental'
    : temPGDASManual
      ? 'manual'
      : 'pendente'

const valorPGDASVinculado =
  temPGDASDocumental
    ? registrosPGDAS.reduce(
        (total, p) =>
          total +
          Number(p.diferenca_recuperavel || 0),
        0
      )
    : temPGDASManual
      ? Number(pgdasResult?.diferenca || 0)
      : 0


const itensSnapshot =
  criarSnapshotItens(itens)

    const itensMono =
  itens.filter(i => i.monofasico)

const receitaTotal =
  itens.reduce(
    (s, i) =>
      s +
      Number(i.vProd || 0) *
        Number(
          i.fatorReceita ??
          (i.consideraReceita ? 1 : 0)
        ),
    0
  )

const receitaMonofasica =
  itens
    .filter(i => i.monofasico)
    .reduce(
      (s, i) =>
        s +
        numero(i.vProd) *
          Number(
            i.fatorReceita ??
            (i.consideraReceita ? 1 : 0)
          ),
      0
    )

    const pisItensMono =
      itensMono.reduce(
        (s, i) => s + Number(i.vItemPIS || 0),
        0
      )

    const cofinsItensMono =
      itensMono.reduce(
        (s, i) => s + Number(i.vItemCOFINS || 0),
        0
      )

    const qtdNotas =
      new Set(
        itens.map(i =>
          i.chaveNFe ||
          `${i.emitenteCNPJ || ''}-${i.nNF || ''}`
        )
      ).size

    const resumo = {
      qtd_notas: qtdNotas,

      total_itens: itens.length,

      total_monofasicos:
        itensMono.length,

      receita_total:
        receitaTotal,

      receita_monofasica:
        receitaMonofasica,

      pis_documentos_itens_monofasicos:
        pisItensMono,

      cofins_documentos_itens_monofasicos:
        cofinsItensMono,

      potencial_exibido_tela:
        Number(creditoTotal || 0),

      credito_final_consolidado:
        false,

      pgdas_vinculado:
  pgdasVinculado,

fonte_pgdas:
  fontePGDAS,

tipo_vinculo_pgdas:
  tipoVinculoPGDAS,

competencias_pgdas_manuais:
  competenciaPGDASManual
    ? [competenciaPGDASManual]
    : [],

competencias_analisadas:
  competenciasAnalisadas,

competencias_pgdas_encontradas:
  competenciasPGDAS,

competencias_pgdas_pendentes:
  competenciasPendentes,

pgdas_conciliacao_completa:
  pgdasConciliacaoCompleta,

valor_pgdas_vinculado:
  valorPGDASVinculado,

potencial_pgdas_conciliado:
  pgdasConciliacaoCompleta
    ? valorPGDASVinculado
    : null,

credito_consolidado:
  null,

filtro_no_momento_da_geracao:
  filtro,

      observacao:
        'Snapshot tecnico da auditoria. O valor definitivo do credito devera ser consolidado no modulo Apuracao do Simples antes da emissao de memoria final.',
    }

    const payload = {
      diagnostico_id:
        diagnosticoId,

      usuario_id:
        user.id,

      cliente_id:
        cliente.id,

      cliente_nome:
        cliente.razao_social || '',

      cliente_cnpj:
        cliente.cnpj || '',

      titulo:
        'Memoria de Calculo — PIS/COFINS Monofasico',

      periodo_inicio:
        periodos[0] || null,

      periodo_fim:
        periodos[periodos.length - 1] || null,

      versao_motor:
        'monofasicos-v1',

      status:
        'preliminar',

      total_itens:
        itens.length,

      total_monofasicos:
        itensMono.length,

      receita_total:
        receitaTotal,

      receita_monofasica:
        receitaMonofasica,

      /*
       * Importante:
       * preserva o valor que estava exibido na analise,
       * mas a memoria continua marcada como PRELIMINAR.
       */
      credito_estimado:
        Number(creditoTotal || 0),

      pgdas_json:
        pgdasResult ||
        pgdasSupabase ||
        null,

      resumo_json:
        resumo,

      itens_json:
        itensSnapshot,

      gerado_em:
        new Date().toISOString(),
    }

    const {
      data: memoriaCriada,
      error,
    } = await supabase
      .from('diagnostico_monofasico_memorias')
      .insert([payload])
      .select('*')
      .single()

    if (error) throw error

    await carregarMemorias()

    setAba('memorias')

    alert(
      `Memoria salva com sucesso.\n\nID: ${memoriaCriada.id}\nItens registrados: ${itens.length}`
    )
  } catch (e) {
    alert(
      'Erro ao gerar memoria: ' +
      e.message
    )
  } finally {
    setSalvandoMemoria(false)
  }
}


function imprimirMemoria(memoria, imprimirAutomatico = true) {
  if (!memoria) return

  const lista =
    Array.isArray(memoria.itens_json)
      ? memoria.itens_json
      : []

  const resumo =
    memoria.resumo_json || {}
	
  const competenciasAnalisadas =
   resumo.competencias_analisadas || []

  const competenciasPGDAS =
  resumo.competencias_pgdas_encontradas || []

const competenciasPGDASManuais =
  resumo.competencias_pgdas_manuais || []

const competenciasPendentes =
  resumo.competencias_pgdas_pendentes || []

const fontePGDASMemoria =
  resumo.fonte_pgdas || 'nao_vinculado'

const tipoVinculoPGDASMemoria =
  resumo.tipo_vinculo_pgdas ||
  (
    fontePGDASMemoria === 'diagnosticos_pgdas'
      ? 'documental'
      : fontePGDASMemoria === 'calculo_tela'
        ? 'manual'
        : 'pendente'
  )

const conciliacaoCompleta =
  resumo.pgdas_conciliacao_completa === true

  const linhas = lista.map(item => `
    <tr>
      <td>${escHTML(item.nNF)}</td>
      <td>${escHTML(item.dataEmissao)}</td>
      <td>${escHTML(item.numeroItemNFe || '')}</td>

      <td class="desc">
        ${escHTML(item.descricao)}
      </td>

      <td>${escHTML(item.ncm)}</td>
      <td>${escHTML(item.cfop)}</td>

      <td>${escHTML(item.cstPIS)}</td>
      <td class="num">${fmtR(item.basePIS)}</td>
      <td class="num">${Number(item.aliquotaPIS || 0).toLocaleString('pt-BR')}%</td>
      <td class="num">${fmtR(item.vItemPIS)}</td>

      <td>${escHTML(item.cstCOFINS)}</td>
      <td class="num">${fmtR(item.baseCOFINS)}</td>
      <td class="num">${Number(item.aliquotaCOFINS || 0).toLocaleString('pt-BR')}%</td>
      <td class="num">${fmtR(item.vItemCOFINS)}</td>

      <td>
        ${item.monofasico ? 'SIM' : 'NAO'}
      </td>

      <td>
        ${item.consideraReceita ? 'SIM' : 'NAO'}
      </td>
    </tr>
  `).join('')

  const janela =
    window.open(
      '',
      '_blank',
      'width=1300,height=800'
    )

  if (!janela) {
    alert(
      'O navegador bloqueou a janela de impressao.'
    )
    return
  }

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">

    <head>
      <meta charset="UTF-8">

      <title>
        Memoria de Calculo - ${escHTML(memoria.cliente_nome || '')}
      </title>

      <style>
        @page {
          size: A4 landscape;
          margin: 9mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 10px;
          color: #0F172A;
          margin: 0;
        }

        h1 {
          color: #0B1F4D;
          font-size: 17px;
          margin: 0;
        }

        h2 {
          color: #0B1F4D;
          font-size: 11px;
          border-bottom: 1px solid #CBD5E1;
          padding-bottom: 4px;
          margin: 18px 0 8px;
        }

        .header {
          border-bottom: 3px solid #0B1F4D;
          padding-bottom: 10px;
        }

        .sub {
          color: #64748B;
          margin-top: 3px;
        }

        .alerta {
          margin-top: 12px;
          padding: 8px 10px;
          background: #FFF7ED;
          border: 1px solid #FED7AA;
          border-radius: 5px;
          color: #9A3412;
          line-height: 1.4;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 7px;
        }

        .card {
          border: 1px solid #E2E8F0;
          border-radius: 5px;
          padding: 8px;
        }

        .card .label {
          color: #64748B;
          font-size: 10px;
        }

        .card .valor {
          color: #0B1F4D;
          font-size: 12px;
          font-weight: bold;
          margin-top: 3px;
        }

        .info {
          line-height: 1.7;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        thead {
          display: table-header-group;
        }

        th {
          background: #4B5563;
          color: white;
          border: 1px solid #64748B;
          padding: 4px;
          white-space: nowrap;
        }

        td {
          border: 1px solid #CBD5E1;
          padding: 3px 4px;
          white-space: nowrap;
        }

        .desc {
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .num {
          text-align: right;
        }

        .rastreio {
          margin-top: 15px;
          padding: 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          font-family: monospace;
          font-size: 10px;
          line-height: 1.5;
        }

        .rodape {
          margin-top: 14px;
          border-top: 1px solid #E2E8F0;
          padding-top: 7px;
          color: #64748B;
        }
		
		.toolbar {
        position: sticky;
        top: 0;
        z-index: 999;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 0;
        background: #FFFFFF;
        }

      .btn-imprimir {
      background: #0B1F4D;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
     }

    @media print {
    .toolbar {
    display: none !important;
    }
    }

      </style>
    </head>

    <body>
	
	<div class="toolbar">
  <button
    class="btn-imprimir"
    onclick="window.print()"
  >
    Imprimir Memoria
  </button>
</div>

      <div class="header">
        <h1>
          e-FiscalTribe® — Memoria de Calculo
        </h1>

        <div class="sub">
          PIS/COFINS Monofasico —
          Evidencia tecnica da auditoria fiscal
        </div>
      </div>

      <div class="alerta">
        <strong>Status:</strong>
        ${escHTML(memoria.status || 'preliminar').toUpperCase()}.
        Esta memoria preserva o estado da auditoria na data de sua geracao.
        O credito definitivo somente deve ser tratado como consolidado
        apos a conclusao da Apuracao do Simples e da conciliacao com o PGDAS-D.
      </div>

      <h2>1. Identificacao</h2>

      <div class="info">
        <strong>Cliente:</strong>
        ${escHTML(memoria.cliente_nome || '')}
        <br>

        <strong>CNPJ:</strong>
        ${escHTML(memoria.cliente_cnpj || '')}
        <br>

        <strong>Periodo:</strong>
        ${escHTML(memoria.periodo_inicio || '')}
        a
        ${escHTML(memoria.periodo_fim || '')}
        <br>

        <strong>Gerado em:</strong>
        ${fmtData(memoria.gerado_em)}
      </div>

      <h2>2. Resumo da Auditoria</h2>

      <div class="grid">

        <div class="card">
          <div class="label">
            NF-es analisadas
          </div>

          <div class="valor">
            ${Number(resumo.qtd_notas || 0)}
          </div>
        </div>

        <div class="card">
          <div class="label">
            Total de itens
          </div>

          <div class="valor">
            ${Number(memoria.total_itens || 0)}
          </div>
        </div>

        <div class="card">
          <div class="label">
            Itens monofasicos
          </div>

          <div class="valor">
            ${Number(memoria.total_monofasicos || 0)}
          </div>
        </div>

        <div class="card">
          <div class="label">
            Receita total analisada
          </div>

          <div class="valor">
            ${fmtR(memoria.receita_total)}
          </div>
        </div>

        <div class="card">
          <div class="label">
            Receita monofasica
          </div>

          <div class="valor">
            ${fmtR(memoria.receita_monofasica)}
          </div>
        </div>

        <div class="card">
          <div class="label">
            PIS nos itens monofasicos
          </div>

          <div class="valor">
            ${fmtR(
              resumo.pis_documentos_itens_monofasicos
            )}
          </div>
        </div>

        <div class="card">
          <div class="label">
            COFINS nos itens monofasicos
          </div>

          <div class="valor">
            ${fmtR(
              resumo.cofins_documentos_itens_monofasicos
            )}
          </div>
        </div>

        <div class="card">
          <div class="label">
            Potencial preliminar identificado
          </div>

          <div class="valor">
            ${fmtR(memoria.credito_estimado)}
          </div>
        </div>

      </div>

      <h2>
      3. Conciliacao com PGDAS-D
     </h2>

      <div class="info">

    <strong>Competencias analisadas:</strong>
    ${
    competenciasAnalisadas.length
      ? competenciasAnalisadas
          .map(escHTML)
          .join(', ')
      : '—'
    }

   <br>

    <strong>PGDAS-D encontrados no sistema:</strong>
${
competenciasPGDAS.length
  ? competenciasPGDAS
      .map(escHTML)
      .join(', ')
  : 'Nenhum'
}

<br>

${
tipoVinculoPGDASMemoria === 'manual'
  ? `
    <strong>PGDAS-D informado manualmente:</strong>
    ${
      competenciasPGDASManuais.length
        ? competenciasPGDASManuais
            .map(escHTML)
            .join(', ')
        : competenciasAnalisadas.length === 1
          ? escHTML(competenciasAnalisadas[0])
          : 'Sim'
    }
    <br>
  `
  : ''
}

<strong>Competencias pendentes:</strong>
    ${
    competenciasPendentes.length
      ? competenciasPendentes
          .map(escHTML)
          .join(', ')
      : 'Nenhuma'
    }

    <br>

   <strong>Valor identificado nos PGDAS-D vinculados:</strong>
   ${fmtR(resumo.valor_pgdas_vinculado || 0)}

   </div>


   <div
   style="
    margin-top:10px;
    padding:10px 12px;
    border-radius:5px;
    border:1px solid ${
      conciliacaoCompleta
        ? '#86EFAC'
        : '#FED7AA'
    };
    background:${
      conciliacaoCompleta
        ? '#F0FDF4'
        : '#FFF7ED'
    };
    color:${
      conciliacaoCompleta
        ? '#166534'
        : '#9A3412'
    };
    font-size:10px;
    font-weight:bold;
    "
    >

    ${
  conciliacaoCompleta
    ? (
        tipoVinculoPGDASMemoria === 'documental'
          ? `CONCILIACAO DOCUMENTAL PGDAS-D COMPLETA.
             O PGDAS-D foi localizado no sistema e vinculado a competencia analisada.
             Potencial identificado nesta etapa: ${fmtR(
               resumo.valor_pgdas_vinculado || 0
             )}.
             O credito definitivo permanece pendente da Apuracao do Simples.`
          : `CONCILIACAO PGDAS-D REALIZADA COM DADOS INFORMADOS MANUALMENTE.
             Os valores do PGDAS-D utilizados nesta etapa foram informados pelo usuario.
             Potencial identificado nesta etapa: ${fmtR(
               resumo.valor_pgdas_vinculado || 0
             )}.
             O credito definitivo permanece pendente da Apuracao do Simples.`
      )
    : `CONCILIACAO PGDAS-D PENDENTE.
       Existem ${competenciasPendentes.length}
       competencia(s) sem PGDAS-D documental ou manual vinculado.
       O credito definitivo ainda nao esta consolidado.`
}

      </div>
	  
	  <h2>
        4. Demonstrativo Analitico
      </h2>

      <table>

        <thead>
          <tr>
            <th>NF</th>
            <th>Data</th>
            <th>Item</th>
            <th>Produto</th>
            <th>NCM</th>
            <th>CFOP</th>

            <th>CST PIS</th>
            <th>BC PIS</th>
            <th>Aliq. PIS</th>
            <th>PIS</th>

            <th>CST COFINS</th>
            <th>BC COFINS</th>
            <th>Aliq. COFINS</th>
            <th>COFINS</th>

            <th>Mono</th>
            <th>Receita</th>
          </tr>
        </thead>

        <tbody>
          ${linhas}
        </tbody>

      </table>

      <h2>
        5. Rastreabilidade
      </h2>

      <div class="rastreio">
        MEMORIA_ID:
        ${escHTML(memoria.id)}
        <br>

        DIAGNOSTICO_ID:
        ${escHTML(memoria.diagnostico_id)}
        <br>

        VERSAO_MOTOR:
        ${escHTML(memoria.versao_motor)}
        <br>

        PGDAS_VINCULADO:
        ${resumo.pgdas_vinculado ? 'SIM' : 'NAO'}
        <br>

        FONTE_PGDAS:
        ${escHTML(resumo.fonte_pgdas || '')}
        <br>

        TIPO_VINCULO_PGDAS:
        ${escHTML(String(tipoVinculoPGDASMemoria || 'pendente').toUpperCase())}
        <br>

        GERADO_EM:
        ${escHTML(memoria.gerado_em || '')}
      </div>

      <div class="rodape">
        e-FiscalTribe® —
        Documento tecnico de suporte a auditoria tributaria.
      </div>

    </body>
    </html>
  `)

  janela.document.close()
janela.focus()

if (imprimirAutomatico) {
  setTimeout(() => {
    janela.print()
  }, 600)
}
}

async function excluirMemoria(id) {
  if (
    !window.confirm(
      'Excluir esta memoria de calculo?'
    )
  ) {
    return
  }

  try {
    const { error } = await supabase
      .from('diagnostico_monofasico_memorias')
      .delete()
      .eq('id', id)

    if (error) throw error

    await carregarMemorias()
  } catch (e) {
    alert(
      'Erro ao excluir memoria: ' +
      e.message
    )
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
    if (busca) {
      const b = busca.toLowerCase()
      return (i.descricao || '').toLowerCase().includes(b)
        || (i.ncm || '').toLowerCase().includes(b)
        || (i.emitente || '').toLowerCase().includes(b)
        || (i.nNF || '').toLowerCase().includes(b)
        || (i.cfop || '').toLowerCase().includes(b)
        || (i.codigo || '').toLowerCase().includes(b)
        || (i.chaveNFe || '').toLowerCase().includes(b)
    }
    return true
  })
  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length/porPagina))
  const itensPagina  = temResultado ? itensFiltrados.slice((pagina-1)*porPagina, pagina*porPagina) : LINHAS_GHOST
  const totalMono    = itens.filter(i=>i.monofasico).length
  const creditoTotal = regime === 'Simples Nacional'
  ? (
      pgdasResult?.diferenca ??
      pgdasSupabase?.diferenca ??
      diagAberto?.credito_estimado ??
      itens
        .filter(i => i.monofasico)
        .reduce((s, i) => s + Number(i.credito || 0), 0)
    )
  : itens
      .filter(i => i.monofasico)
      .reduce((s, i) => s + Number(i.credito || 0), 0)
  const receitaMono = itens
  .filter(i => i.monofasico)
  .reduce(
    (s, i) =>
      s +
      Number(i.vProd || 0) *
      Number(i.fatorReceita ?? (i.consideraReceita ? 1 : 0)),
    0
  )
  const todosSelecionados = itensPagina.length>0 && !itensPagina[0]?.ghost && itensPagina.every((_,i)=>selecionados.includes((pagina-1)*porPagina+i))

  function toggleTodos() {
    if (todosSelecionados) setSelecionados(prev=>prev.filter(idx=>idx<(pagina-1)*porPagina||idx>=pagina*porPagina))
    else { const novos=itensPagina.map((_,i)=>(pagina-1)*porPagina+i); setSelecionados(prev=>[...new Set([...prev,...novos])]) }
  }
  function toggleItem(idx) { setSelecionados(prev=>prev.includes(idx)?prev.filter(i=>i!==idx):[...prev,idx]) }
  
  async function excluirItemDaAnalise(item) {
  if (!item || item.ghost) return

  if (diagAberto) {
    alert('Este diagnóstico já está salvo. Para preservar o histórico, faça a exclusão pelo Histórico ou inicie uma Nova análise.')
    return
  }

  const identificacao =
    item.descricao ||
    item.codigo ||
    item.nNF ||
    'este item'

  if (!window.confirm(`Excluir "${identificacao}" desta análise?`)) return

  try {
    const novosItens = itens.filter(i => i !== item)

    // Remove da base de itens fiscais somente se não existir
    // outra linha da análise com o mesmo código de produto.
    if (cliente?.id && item.codigo) {
      const mesmoCodigoPermanece =
        novosItens.some(i => i.codigo === item.codigo)

      if (!mesmoCodigoPermanece) {
        const { error } = await supabase
          .from('itens_fiscais')
          .delete()
          .eq('cliente_id', cliente.id)
          .eq('codigo', item.codigo)

        if (error) throw error
      }
    }

    setItens(novosItens)

    // Mantém os totais coerentes após a exclusão
	if (regime === 'Simples Nacional') {
		
    const recTotal =
  novosItens.reduce(
    (s, i) =>
      s +
      Number(i.vProd || 0) *
      Number(i.fatorReceita ?? (i.consideraReceita ? 1 : 0)),
    0
  )

const recMono =
  novosItens
    .filter(i => i.monofasico)
    .reduce(
      (s, i) =>
        s +
        Number(i.vProd || 0) *
        Number(i.fatorReceita ?? (i.consideraReceita ? 1 : 0)),
      0
    )

      setPgdasForm(prev => ({
        ...prev,
        receita_bruta_total: recTotal.toFixed(2),
        receita_monofasica: recMono.toFixed(2),
      }))
    }

    // Atualiza a quantidade de itens do arquivo importado
    if (item.arquivo) {
      setProcessados(prev =>
        prev.map(p =>
          p.nome === item.arquivo
            ? {
                ...p,
                qtdItens: Math.max(
                  0,
                  Number(p.qtdItens || 0) - 1
                )
              }
            : p
        )
      )
    }

    setSelecionados([])
    setMenuAberto(null)

  } catch (e) {
    alert('Erro ao excluir item: ' + e.message)
  }
}

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

      {itemDetalhe && (
        <ModalDetalhesFiscais item={itemDetalhe} onFechar={() => setItemDetalhe(null)} />
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
              {visaoTabela === 'auditoria' && (
              <button
          onClick={imprimirVisaoAuditoria}
          style={{
          padding:'7px 14px',
          background:'#7c3aed',
          color:S.white,
          border:'none',
          borderRadius:7,
          fontSize:12,
          fontWeight:600,
          cursor:'pointer'
           }}
          >
         Imprimir Auditoria
              </button>
           )}
			  <button
  onClick={exportarExcel}
  style={{
    padding:'7px 14px',
    background:S.green,
    color:S.white,
    border:'none',
    borderRadius:7,
    fontSize:12,
    fontWeight:600,
    cursor:'pointer'
  }}
>
  Exportar Excel
</button>
              <button onClick={novaAnalise} style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.red}`, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.red }}>Nova análise</button>
           {!diagAberto && !diagnosticoSalvoId && (
  <button
    onClick={() => setModalNome(true)}
    disabled={salvando}
    style={{
      padding:'7px 14px',
      background:S.navy,
      color:S.white,
      border:'none',
      borderRadius:7,
      fontSize:12,
      fontWeight:600,
      cursor:salvando ? 'not-allowed' : 'pointer',
      opacity:salvando ? 0.7 : 1
    }}
  >
    {salvando ? 'Salvando...' : 'Salvar Diagnóstico'}
  </button>
)} 
        </div>
          )}
          <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px', minWidth: 260, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.navy, marginBottom: 4 }}>Importar NF-es</div>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>Aceita: <strong style={{ color: S.text }}>.xml (NF-e)</strong></div>
            <input ref={inputRef} type="file" multiple accept={FORMATOS} onChange={onDrop} style={{ display: 'none' }} />
            <button
  onClick={() => inputRef.current?.click()}
  disabled={processando}
  style={{
    width: '75%',
    padding: '8px 0',
    background: processando ? '#CBD5E1' : '#4B5563',
    color: processando ? '#0F172A' : S.white,
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: processando ? 'not-allowed' : 'pointer'
    }}
     >
    {processando ? (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7
      }}
    >
      <span className="mono-spinner">⏳</span>
      Processando XML...
    </span>
    ) : (
    'Selecionar Arquivos'
    )}
    </button>

    {processando && (
     <div
    className="mono-progress-track"
    aria-label="Processando arquivos XML"
    >
    <div className="mono-progress-bar" />
    </div>
    )}
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
        {[
        {
        id:'importar',
        label:'Importar'
        },
        {
        id:'historico',
        label:`Historico (${historico.length})`
        },
        ].map(a => (
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

          <div style={{
  display:'grid',
  gridTemplateColumns:'repeat(3, minmax(0, 1fr))',
  gap:12,
  marginBottom:16
}}>
            {[
  {
  label:'Itens / NF-e',
  valor: temResultado
    ? `${itens.length} itens / ${
        new Set(
          itens
            .map(i =>
              i.chaveNFe ||
              `${i.emitenteCNPJ || ''}-${i.nNF || ''}-${i.serieNFe || ''}`
            )
            .filter(Boolean)
        ).size
      } NF-e`
    : '—',
  cor: temResultado ? S.navy : S.ghostText
},
  {
    label:'Itens monofasicos',
    valor: temResultado ? totalMono : '—',
    cor: temResultado ? S.orange : S.ghostText
  },
  {
  label:'Itens não monofásicos',
  valor: temResultado
    ? itens.filter(i => !i.monofasico).length
    : '—',
  cor: temResultado ? S.navy : S.ghostText
},
  {
    label:'Valor total NF-e',
    valor: temResultado
      ? fmtR(processados.reduce((s,p) => s + Number(p.valorTotalNF || 0), 0))
      : 'R$ —,——',
    cor: temResultado ? S.navy : S.ghostText
  },
  {
  label:'Movimentações neutras / canceladas',
  valor: temResultado
    ? fmtR(
        itens.reduce(
          (s, i) => {
            const fator = Number(
              i.fatorReceita ??
              (i.consideraReceita ? 1 : 0)
            )

            return fator === 0
              ? s + Number(i.vProd || 0)
              : s
          },
          0
        )
      )
    : 'R$ —,—',
  cor: temResultado ? S.red : S.ghostText
},
{
  label:'Devoluções',
  valor: temResultado
    ? fmtR(
        itens.reduce(
          (s, i) => {
            const fator = Number(
              i.fatorReceita ??
              (i.consideraReceita ? 1 : 0)
            )

            return fator === -1
              ? s + Number(i.vProd || 0)
              : s
          },
          0
        )
      )
    : 'R$ —,—',
  cor: temResultado ? S.red : S.ghostText
},
{
  label:'Receita bruta antes das devoluções',
  valor: temResultado
    ? fmtR(
        itens.reduce(
          (s, i) => {
            const fator = Number(
              i.fatorReceita ??
              (i.consideraReceita ? 1 : 0)
            )

            return fator === 1
              ? s + Number(i.vProd || 0)
              : s
          },
          0
        )
      )
    : 'R$ —,—',
  cor: temResultado ? S.navy : S.ghostText
},
{
  label:'Receita considerada',
  valor: temResultado
    ? fmtR(
        itens.reduce(
          (s, i) =>
            s +
            Number(i.vProd || 0) *
              Number(
                i.fatorReceita ??
                (i.consideraReceita ? 1 : 0)
              ),
          0
        )
      )
    : 'R$ —,—',
  cor: temResultado ? S.navy : S.ghostText
},
  {
  label:'Receita monofasica',
  valor: temResultado
    ? fmtR(
        itens
          .filter(i => i.monofasico)
          .reduce(
            (s, i) =>
              s +
              Number(i.vProd || 0) *
                Number(
                  i.fatorReceita ??
                  (i.consideraReceita ? 1 : 0)
                ),
            0
          )
      )
    : 'R$ —,—',
    cor: temResultado ? S.orange : S.ghostText
  },
  {
  label:'Receita nao monofasica',
  valor: temResultado
    ? fmtR(
        itens
          .filter(i => !i.monofasico)
          .reduce(
            (s, i) =>
              s +
              Number(i.vProd || 0) *
                Number(
                  i.fatorReceita ??
                  (i.consideraReceita ? 1 : 0)
                ),
            0
          )
      )
    : 'R$ —,—',
    cor: temResultado ? S.text : S.ghostText
  },
  {
    label:'Descontos comerciais',
    valor: temResultado
      ? fmtR(processados.reduce((s,p) => s + Number(p.totalDesconto || 0), 0))
      : 'R$ —,——',
    cor: temResultado ? S.muted : S.ghostText
  },
  {
    label:'Potencial de recuperacao',
    valor: temResultado ? fmtR(creditoTotal) : 'R$ —,——',
    cor: temResultado ? S.green : S.ghostText
  },
].map((k,i) => (
              <div key={i} style={{ background:S.white, borderRadius:8, padding:'10px 14px', border:`1px solid ${S.border}`, textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:700, color:k.cor }}>{k.valor}</div>
                <div style={{ fontSize:12.5, color:S.muted, marginTop:2 }}>{k.label}</div>
                {!temResultado && <div style={{ fontSize:10, color:S.ghostText, marginTop:4 }}>Aguardando importacao</div>}
              </div>
            ))}
          </div>

          <div style={{ background:S.white, borderRadius:10, border:`1px solid ${S.border}`, marginBottom:16, overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:`1px solid ${S.border}`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'space-between' }}>
              <input value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1)}} placeholder="Buscar produto, NCM, CFOP, NF, chave..."
                style={{ padding:'6px 12px', border:`1px solid ${S.border}`, borderRadius:6, fontSize:13, outline:'none', width:270 }} />

              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
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

                <span style={{ width:1, height:22, background:S.border, margin:'0 4px' }} />

                <button onClick={()=>setVisaoTabela('resumida')}
                  style={{ padding:'4px 12px', background:visaoTabela==='resumida'?S.navy:'none', color:visaoTabela==='resumida'?S.white:S.muted, border:`1px solid ${visaoTabela==='resumida'?S.navy:S.border}`, borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  Visao resumida
                </button>
                <button onClick={()=>setVisaoTabela('auditoria')}
                  style={{ padding:'4px 12px', background:visaoTabela==='auditoria'?S.navy:'none', color:visaoTabela==='auditoria'?S.white:S.muted, border:`1px solid ${visaoTabela==='auditoria'?S.navy:S.border}`, borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  Visao auditoria
                </button>
              </div>
            </div>
            <div
  style={{
    display:'flex',
    alignItems:'center',
    gap:6,
    margin:'6px 0 8px',
    padding:'5px 8px',
    background:'#F8FAFC',
    borderRadius:5,
    color:S.muted,
    fontSize:10,
    lineHeight:1.3
  }}
>
  <span style={{ fontSize:11 }}>ⓘ</span>

  <span>
    Para melhor visualização de todas as colunas, recomendamos utilizar
    o zoom do navegador em <strong>80%</strong>. Em 90% ou 100%, utilize
    a barra de rolagem horizontal quando necessário.
  </span>
</div>

<div
  style={{
    width:'100%',
    maxWidth:'100%',
    overflowX:'auto',
    overflowY:'hidden',
    paddingBottom:5
  }}
>
  {visaoTabela === 'resumida' ? (
                <table
  style={{
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    tableLayout: 'fixed',
    fontSize: 11,
    minWidth: 1120
  }}
>
                  <thead>
  <tr style={{ background:S.thBg }}>
    <th
      style={{
        width: 36,
        minWidth: 36,
        maxWidth: 36,
        padding: '8px 4px',
        color: S.thText,
        textAlign: 'center',
        borderRight: '1px solid #64748B',
        position: 'sticky',
        left: 0,
        zIndex: 4,
        background: S.thBg
      }}
    >
      <input
        type="checkbox"
        checked={todosSelecionados}
        onChange={toggleTodos}
        disabled={!temResultado}
        style={{ cursor:temResultado?'pointer':'not-allowed' }}
      />
    </th>

    {[
  ['Nº NF', 52],
  ['Data', 72],
  ['Emitente', 125],
  ['Descrição do Produto', 175],
  ['NCM', 74],
  ['CFOP', 52],
  ['QTD', 52],
  ['Valor Unitário', 82],
  ['Valor Total', 80],
  ['PIS', 54],
  ['COFINS', 62],
  ['Classificação', 125],
  ['Ações', 105]
].map(([h, largura]) => (
      <th
        key={h}
        style={{
          width: largura,
          padding: '8px 6px',
          textAlign: 'left',
          color: S.thText,
          fontWeight: 600,
          fontSize: 11,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          borderRight: '1px solid #64748B',
          
        }}
      >
        {h}
          </th>
          ))}
          </tr>
                  </thead>
                  <tbody>
                    {itensPagina.map((item,i) => {
                      const idx=(pagina-1)*porPagina+i
                      const sel=selecionados.includes(idx)
                      const isGhost=item.ghost
                      const td = {
  padding: '7px 6px',
  borderRight: `1px solid ${S.border}`,
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}
                      return (
                        <tr key={i} style={{ borderBottom:`1px solid ${S.border}`, background:isGhost?S.ghost:sel?'#eff6ff':i%2===0?S.white:'#FAFAFA' }}>
                          <td
  style={{
    ...td,
    width: 36,
    minWidth: 36,
    maxWidth: 36,
    padding: '7px 4px',
    textAlign: 'center',
    position: 'sticky',
    left: 0,
    zIndex: 2,
    background: isGhost ? S.ghost : sel ? '#eff6ff' : i%2===0 ? S.white : '#FAFAFA'
  }}
>
  <input
  type="checkbox"
  checked={isGhost ? false : sel}
  disabled={isGhost}
  onChange={()=>toggleItem(idx)}
  style={{
    cursor: isGhost ? 'not-allowed' : 'pointer',
    opacity: isGhost ? 0.45 : 1
  }}
/>
</td>
                          <td
  style={{
    ...td,
    width: 72,
    whiteSpace: 'nowrap',
    fontWeight: 600,
    color: isGhost ? S.ghostText : S.navy,
    position: 'sticky',
    left: 36,
    zIndex: 2,
    background: isGhost ? S.ghost : sel ? '#eff6ff' : i%2===0 ? S.white : '#FAFAFA'
  }}
>
  {item.nNF}
</td>
                          <td style={{ ...td, color:isGhost?S.ghostText:S.text, whiteSpace:'nowrap' }}>
  {isGhost
    ? '—'
    : item.dataEmissao
      ? item.dataEmissao.split('-').reverse().join('/')
      : '—'}
</td>
                          <td style={{ ...td, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isGhost?S.ghostText:S.text }}>{item.emitente}</td>
                          <td style={{ ...td, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isGhost?S.ghostText:S.text }}>{item.descricao}</td>
                          <td style={{ ...td, color:isGhost?S.ghostText:S.muted }}>{item.ncm}</td>
                          <td style={{ ...td, fontWeight:600, color:isGhost?S.ghostText:S.text }}>
  {isGhost ? '—' : (item.cfop || '—')}
</td>

<td style={{ ...td, color:isGhost?S.ghostText:S.text, whiteSpace:'nowrap' }}>
  {isGhost
    ? '—'
    : `${Number(item.quantidade || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
      })} ${item.unidadeComercial || ''}`}
</td>

<td style={{ ...td, color:isGhost?S.ghostText:S.text, whiteSpace:'nowrap' }}>
  {isGhost ? 'R$ —' : fmtR(item.valorUnitario)}
</td>

<td style={{ ...td, color:isGhost?S.ghostText:S.text, whiteSpace:'nowrap' }}>
  {isGhost ? 'R$ —' : fmtR(item.vProd)}
</td>

<td style={{ ...td, color:isGhost?S.ghostText:item.vItemPIS>0?S.red:S.muted }}>
  {isGhost ? 'R$ —' : fmtR(item.vItemPIS)}
</td>
                          <td style={{ ...td, color:isGhost?S.ghostText:item.vItemCOFINS>0?S.red:S.muted }}>{isGhost?'R$ —,——':fmtR(item.vItemCOFINS)}</td>
                          <td style={td}>
                            {isGhost
                              ? <span style={{ background:S.ghost, color:S.ghostText, border:`1px solid ${S.border}`, borderRadius:99, padding:'2px 10px', fontSize:10, fontWeight:700 }}>Classificacao</span>
                              : <Badge tipo={item.monofasico ? ((item.pendentePGDAS && !pgdasSupabase && !pgdasResult) ? 'pendente' : 'monofasico') : 'nao_monofasico'} />}
                          </td>
                          <td
  style={{
    ...td,
    width: 64,
    textAlign: 'center',
    position: 'sticky',
    right: 0,
    zIndex: 3,
    overflow: 'visible',
    background: isGhost ? S.ghost : sel ? '#eff6ff' : i%2===0 ? S.white : '#FAFAFA'
  }}
>
{isGhost && (
  <div
    style={{
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      gap:5
    }}
  >
    <span
      style={{
        width:28,
        height:20,
        border:`1px solid ${S.border}`,
        borderRadius:4,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        color:S.ghostText,
        fontSize:11,
        opacity:0.55
      }}
    >
      ...
    </span>

    <span
      style={{
        height:20,
        padding:'0 7px',
        border:`1px solid ${S.border}`,
        borderRadius:4,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        color:S.ghostText,
        fontSize:9,
        fontWeight:500,
        opacity:0.55
      }}
    >
      Excluir
    </span>
  </div>
)}
                            {!isGhost && (
                              <>
                                <button onClick={e=>{e.stopPropagation();setMenuAberto(menuAberto===idx?null:idx)}}
                                  style={{ background:'none', border:`1px solid ${S.border}`, borderRadius:4, cursor:'pointer', padding:'2px 8px', fontSize:13, color:S.muted }}>...</button>
								  <button
  onClick={e => {
    e.stopPropagation()
    excluirItemDaAnalise(item)
  }}
  title="Excluir item"
  style={{
    marginLeft: 5,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 4,
    cursor: 'pointer',
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 600,
    color: '#b91c1c',
    whiteSpace: 'nowrap'
  }}
>
  Excluir
</button>
                                {menuAberto===idx && (
  <div
    style={{
      position:'absolute',
      right:8,
      ...(i >= itensPagina.length - 2
        ? { bottom:30 }
        : { top:30 }),
      background:S.white,
      border:`1px solid ${S.border}`,
      borderRadius:8,
      boxShadow:'0 4px 12px rgba(0,0,0,0.1)',
      zIndex:100,
      minWidth:170
    }}
  >
    <button
      onClick={()=>{setItemDetalhe(item);setMenuAberto(null)}}
      style={{
        display:'block',
        width:'100%',
        padding:'8px 14px',
        background:'none',
        border:'none',
        textAlign:'left',
        fontSize:12,
        cursor:'pointer',
        color:S.text
      }}
    >
      Detalhamento fiscal
    </button>

    <button
      onClick={()=>{toggleItem(idx);setMenuAberto(null)}}
      style={{
        display:'block',
        width:'100%',
        padding:'8px 14px',
        background:'none',
        border:'none',
        textAlign:'left',
        fontSize:12,
        cursor:'pointer',
        color:S.text
      }}
    >
      {sel?'Desselecionar':'Selecionar'}
    </button>
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
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:2100 }}>
                  <thead>
                    <tr style={{ background:S.thBg }}>
                      <th style={{ padding:'8px 8px', color:S.thText, borderRight:'1px solid #64748B' }}>NF</th>
                      {['Item','CFOP','NCM','CST PIS','BC PIS','Aliq. PIS','PIS','CST COFINS','BC COFINS','Aliq. COFINS','COFINS','Orig.','CST ICMS','CSOSN','BC ICMS','Aliq. ICMS','ICMS','BC ST','Aliq. ST','ICMS-ST','CST IPI','IPI','Classificacao','Acoes'].map(h=>(
                        <th key={h} style={{ padding:'8px 8px', textAlign:'left', color:S.thText, fontWeight:600, whiteSpace:'nowrap', borderRight:'1px solid #64748B' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itensPagina.map((item,i)=>{
                      const idx=(pagina-1)*porPagina+i
                      const isGhost=item.ghost
                      const td={ padding:'7px 8px', borderRight:`1px solid ${S.border}`, whiteSpace:'nowrap', color:isGhost?S.ghostText:S.text }
                      return (
                        <tr key={i} style={{ borderBottom:`1px solid ${S.border}`, background:isGhost?S.ghost:i%2===0?S.white:'#FAFAFA' }}>
                          <td style={{ ...td, fontWeight:700, color:isGhost?S.ghostText:S.navy }}>{item.nNF}</td>
                          <td style={td}>{isGhost?'—':(item.numeroItemNFe || '—')}</td>
                          <td style={{ ...td, fontWeight:700 }}>{isGhost?'—':(item.cfop || '—')}</td>
                          <td style={td}>{item.ncm}</td>
                          <td style={td}>{isGhost?'—':(item.cstPIS || '—')}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.basePIS)}</td>
                          <td style={td}>{isGhost?'—':`${Number(item.aliquotaPIS||0).toLocaleString('pt-BR')}%`}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.vItemPIS)}</td>
                          <td style={td}>{isGhost?'—':(item.cstCOFINS || '—')}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.baseCOFINS)}</td>
                          <td style={td}>{isGhost?'—':`${Number(item.aliquotaCOFINS||0).toLocaleString('pt-BR')}%`}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.vItemCOFINS)}</td>
                          <td style={td}>{isGhost?'—':(item.origemICMS || '—')}</td>
                          <td style={td}>{isGhost?'—':(item.cstICMS || '—')}</td>
                          <td style={td}>{isGhost?'—':(item.csosn || '—')}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.baseICMS)}</td>
                          <td style={td}>{isGhost?'—':`${Number(item.aliquotaICMS||0).toLocaleString('pt-BR')}%`}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.valorICMS)}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.baseICMSST)}</td>
                          <td style={td}>{isGhost?'—':`${Number(item.aliquotaICMSST||0).toLocaleString('pt-BR')}%`}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.valorICMSST)}</td>
                          <td style={td}>{isGhost?'—':(item.cstIPI || '—')}</td>
                          <td style={td}>{isGhost?'—':fmtR(item.valorIPI)}</td>
                          <td style={td}>{!isGhost && <Badge tipo={item.monofasico ? ((item.pendentePGDAS && !pgdasSupabase && !pgdasResult) ? 'pendente' : 'monofasico') : 'nao_monofasico'} />}</td>
                          <td style={{ ...td, position:'relative' }}>
                            {!isGhost && (
                              <button onClick={()=>setItemDetalhe(item)}
                                style={{ background:'none', border:`1px solid ${S.border}`, borderRadius:4, cursor:'pointer', padding:'3px 8px', fontSize:11, color:S.navy, fontWeight:600 }}>
                                Detalhes
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
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

          {temResultado && (
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {!diagAberto && !diagnosticoSalvoId && (
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
           <div style={{ display:'flex', gap:8, alignItems:'center' }}>
  <button
    onClick={excluirDiagnosticosSelecionados}
    disabled={diagnosticosSelecionados.length === 0}
    style={{
      height:32,
      padding:'0 13px',
      background: diagnosticosSelecionados.length === 0 ? '#f1f5f9' : '#fff',
      border:`1px solid ${diagnosticosSelecionados.length === 0 ? S.border : '#f2b8b5'}`,
      borderRadius:7,
      fontSize:11.5,
      fontWeight:600,
      cursor: diagnosticosSelecionados.length === 0 ? 'not-allowed' : 'pointer',
      color: diagnosticosSelecionados.length === 0 ? S.text : S.red,
      opacity: diagnosticosSelecionados.length === 0 ? 0.72 : 1,
      whiteSpace:'nowrap'
    }}
  >
    {diagnosticosSelecionados.length > 0
      ? `Excluir ${diagnosticosSelecionados.length} selecionado${diagnosticosSelecionados.length > 1 ? 's' : ''}`
      : 'Excluir selecionados'}
  </button>

  <button
    onClick={carregarHistorico}
    style={{
      height:32,
      padding:'0 13px',
      background:S.white,
      border:`1px solid ${S.border}`,
      borderRadius:7,
      fontSize:11.5,
      fontWeight:500,
      cursor:'pointer',
      color:S.text,
      whiteSpace:'nowrap'
    }}
  >
    Atualizar
  </button>
</div>
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
  <th
    key={h}
    style={{
      padding:'8px 10px',
      textAlign:'left',
      color:S.thText,
      fontWeight:600,
      fontSize:11,
      whiteSpace:'nowrap'
    }}
  >
    {h === 'Nome' ? (
      <>
        <input
          type="checkbox"
          checked={
            historico.filter(diag => !diag.ghost).length > 0 &&
            historico
              .filter(diag => !diag.ghost)
              .every(diag => diagnosticosSelecionados.includes(diag.id))
          }
          onChange={toggleTodosDiagnosticos}
          style={{ marginRight:8, cursor:'pointer' }}
        />
        Nome
      </>
    ) : h}
  </th>
))}
                  </tr>
                </thead>
                <tbody>
                  {loadingHistorico ? Array(5).fill(null).map((_, i) => <SkeletonRow key={i} cols={10} />) : (
                    historicoExibir.map((diag, i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${S.border}`, background: diag.ghost ? S.ghost : i%2===0 ? S.white : '#FAFAFA' }}>
                        <td
  title={diag.ghost ? '' : (diag.nome_diagnostico || '')}
  style={{ padding:'7px 10px', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: diag.ghost ? S.ghostText : S.navy, fontWeight: diag.ghost ? 400 : 600 }}
>
  {!diag.ghost && (
  <input
    type="checkbox"
    checked={diagnosticosSelecionados.includes(diag.id)}
    onChange={() => toggleDiagnosticoSelecionado(diag.id)}
    style={{ marginRight:8, cursor:'pointer' }}
  />
)} 
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