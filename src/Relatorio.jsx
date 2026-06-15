import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useState } from 'react'

const fmtR = v => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtData = () => new Date().toLocaleDateString('pt-BR')

export default function Relatorio({ active, ents }) {
  const [responsavel, setResponsavel] = useState({
    nome: '', registro: '', telefone: '', email: ''
  })
  const [gerado, setGerado] = useState(false)

  const totalReceita = ents.reduce((s, e) => s + (e.receita_bruta || 0), 0)
  const totalPago    = ents.reduce((s, e) => s + (e.tributo_pago || 0), 0)
  const totalDevido  = ents.reduce((s, e) => s + (e.tributo_devido || 0), 0)
  const totalCredito = ents.reduce((s, e) => s + (e.credito || 0), 0)

  function gerarPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const azul = [30, 58, 95]
    const dourado = [180, 140, 60]
    const cinza = [100, 100, 100]

    // ── CABEÇALHO ──────────────────────────────────────────────
    doc.setFillColor(...azul)
    doc.rect(0, 0, W, 28, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('RELATÓRIO DE DIAGNÓSTICO TRIBUTÁRIO', W / 2, 11, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Análise de Créditos e Oportunidades de Recuperação Fiscal', W / 2, 18, { align: 'center' })

    doc.setFontSize(9)
    doc.text(`Gerado em: ${fmtData()}`, W / 2, 24, { align: 'center' })

    // ── DADOS DO RESPONSÁVEL ────────────────────────────────────
    let y = 35
    doc.setTextColor(...azul)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('RESPONSÁVEL TÉCNICO', 14, y)
    doc.setDrawColor(...dourado)
    doc.setLineWidth(0.5)
    doc.line(14, y + 2, W - 14, y + 2)
    y += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)

    const resp = responsavel
    doc.text(`Nome: ${resp.nome || '—'}`, 14, y)
    doc.text(`Registro (CRC/OAB): ${resp.registro || '—'}`, W / 2, y)
    y += 6
    doc.text(`Telefone: ${resp.telefone || '—'}`, 14, y)
    doc.text(`E-mail: ${resp.email || '—'}`, W / 2, y)
    y += 10

    // ── DADOS DO CLIENTE ────────────────────────────────────────
    doc.setTextColor(...azul)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DO CLIENTE', 14, y)
    doc.setDrawColor(...dourado)
    doc.line(14, y + 2, W - 14, y + 2)
    y += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)

    doc.text(`Razão Social: ${active?.razao_social || '—'}`, 14, y)
    doc.text(`CNPJ: ${active?.cnpj || '—'}`, W / 2, y)
    y += 6
    doc.text(`Regime Tributário: ${active?.regime || '—'}`, 14, y)
    doc.text(`Município/UF: ${active?.municipio || '—'}/${active?.uf || '—'}`, W / 2, y)
    y += 6
    doc.text(`CNAE Principal: ${active?.cnae_principal || '—'}`, 14, y)
    doc.text(`Status: ${active?.status || '—'}`, W / 2, y)
    y += 10

    // ── RESUMO FINANCEIRO ───────────────────────────────────────
    doc.setTextColor(...azul)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMO FINANCEIRO', 14, y)
    doc.setDrawColor(...dourado)
    doc.line(14, y + 2, W - 14, y + 2)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['Receita Bruta Total', 'Tributo Pago Total', 'Tributo Devido Total', 'Crédito Recuperável']],
      body: [[fmtR(totalReceita), fmtR(totalPago), fmtR(totalDevido), fmtR(totalCredito)]],
      styles: { fontSize: 9, halign: 'center' },
      headStyles: { fillColor: azul, textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fillColor: [245, 248, 252] },
      columnStyles: { 3: { textColor: [22, 163, 74], fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 10

    // ── LANÇAMENTOS POR COMPETÊNCIA ─────────────────────────────
    doc.setTextColor(...azul)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('LANÇAMENTOS POR COMPETÊNCIA', 14, y)
    doc.setDrawColor(...dourado)
    doc.line(14, y + 2, W - 14, y + 2)
    y += 4

    const rows = ents.map(e => [
      e.competencia || '—',
      e.tributo || '—',
      fmtR(e.receita_bruta),
      fmtR(e.tributo_pago),
      fmtR(e.tributo_devido),
      fmtR(e.credito),
      e.tipo_oportunidade || '—',
      e.risco || '—',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Competência', 'Tributo', 'Rec. Bruta', 'Trib. Pago', 'Trib. Devido', 'Crédito', 'Oportunidade', 'Risco']],
      body: rows,
      styles: { fontSize: 7.5, halign: 'center' },
      headStyles: { fillColor: azul, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: { 5: { textColor: [22, 163, 74], fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 10

    // ── DISCLAIMER ──────────────────────────────────────────────
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(14, y, W - 28, 18, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...cinza)
    doc.setFont('helvetica', 'italic')
    const disclaimer = 'Este relatório tem caráter informativo e é de uso interno. As informações aqui contidas não constituem parecer jurídico ou contábil. A decisão sobre o aproveitamento de créditos tributários é de responsabilidade exclusiva do profissional habilitado responsável pelo cliente.'
    const lines = doc.splitTextToSize(disclaimer, W - 36)
    doc.text(lines, W / 2, y + 6, { align: 'center' })

    // ── RODAPÉ ──────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      const pH = doc.internal.pageSize.getHeight()
      doc.setFillColor(...azul)
      doc.rect(0, pH - 14, W, 14, 'F')
      doc.setFontSize(7.5)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('FiscalTrib', 14, pH - 7)
      doc.setFont('helvetica', 'normal')
      doc.text('| Sistema de Diagnóstico e Recuperação Tributária', 35, pH - 7)
      doc.text(`WhatsApp: (11) 99957-9822  |  Tel: (11) 5589-2614  |  fiscaltrib.com.br`, W / 2, pH - 3, { align: 'center' })
      doc.text(`Página ${i} de ${totalPages}`, W - 14, pH - 7, { align: 'right' })
    }

    doc.save(`Relatorio_${active?.razao_social?.replace(/\s+/g, '_') || 'cliente'}_${fmtData().replace(/\//g, '-')}.pdf`)
    setGerado(true)
    setTimeout(() => setGerado(false), 3000)
  }

  const inp = 'width:100%;padding:8px 10px;border:1px solid #d1d5db;borderRadius:6px;fontSize:13px;outline:none'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 }}>Relatório — {active?.razao_social || 'Cliente'}</h2>
        <p style={{ fontSize: 13, color: '#64748b' }}>Preencha os dados do responsável e gere o PDF.</p>
      </div>

      {/* Dados do responsável */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 14, borderBottom: '2px solid #b48c3c', paddingBottom: 6 }}>Dados do Responsável Técnico</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Nome completo</label>
            <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
              value={responsavel.nome} onChange={e => setResponsavel({ ...responsavel, nome: e.target.value })}
              placeholder="Ex: João Silva" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>CRC / OAB / Registro</label>
            <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
              value={responsavel.registro} onChange={e => setResponsavel({ ...responsavel, registro: e.target.value })}
              placeholder="Ex: CRC SP-123456/O" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Telefone</label>
            <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
              value={responsavel.telefone} onChange={e => setResponsavel({ ...responsavel, telefone: e.target.value })}
              placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>E-mail</label>
            <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
              value={responsavel.email} onChange={e => setResponsavel({ ...responsavel, email: e.target.value })}
              placeholder="email@exemplo.com.br" />
          </div>
        </div>
      </div>

      {/* Resumo do cliente */}
      <div style={{ background: '#f0f4fa', border: '1px solid #c7d7ed', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>Dados do Cliente</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#374151' }}>
          <span><b>Razão Social:</b> {active?.razao_social || '—'}</span>
          <span><b>CNPJ:</b> {active?.cnpj || '—'}</span>
          <span><b>Regime:</b> {active?.regime || '—'}</span>
          <span><b>Município/UF:</b> {active?.municipio || '—'}/{active?.uf || '—'}</span>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            { label: 'Competências', val: ents.length },
            { label: 'Receita Total', val: fmtR(totalReceita) },
            { label: 'Tributo Pago', val: fmtR(totalPago) },
            { label: 'Crédito Total', val: fmtR(totalCredito), green: true },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.green ? '#16a34a' : '#1e3a5f' }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={gerarPDF}
        style={{ width: '100%', padding: '13px', background: gerado ? '#16a34a' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        {gerado ? '✅ PDF gerado com sucesso!' : '⬇️ Gerar e Baixar Relatório PDF'}
      </button>

      {ents.length === 0 && (
        <p style={{ marginTop: 16, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
          ⚠️ Nenhum lançamento encontrado para este cliente.
        </p>
      )}
    </div>
  )
}