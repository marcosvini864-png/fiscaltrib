// RelatorioRecuperacaoPGDAS.jsx
// Relatório completo de Recuperação PIS/COFINS Monofásico
// src/pages/abas/RelatorioRecuperacaoPGDAS.jsx

import { useState, useRef } from 'react'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = v => parseFloat(v || 0).toFixed(2).replace('.', ',') + '%'
const hoje = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export default function RelatorioRecuperacaoPGDAS({ historico, cliente, onFechar }) {
  const [logo, setLogo] = useState(null)
  const [escritorio, setEscritorio] = useState({
    nome: '', crc: '', telefone: '', whatsapp: '', email: '', endereco: ''
  })
  const [mostrarConfig, setMostrarConfig] = useState(true)
  const relRef = useRef(null)
  const inputLogoRef = useRef(null)

  const totalCreditoPIS    = historico.reduce((s, d) => s + (parseFloat(d.pis) || 0), 0)
  const totalCreditoCOFINS = historico.reduce((s, d) => s + (parseFloat(d.cofins) || 0), 0)
  const totalCredito       = totalCreditoPIS + totalCreditoCOFINS
  const totalDAS           = historico.reduce((s, d) => s + (parseFloat(d.das_recolhido) || 0), 0)
  const totalMono          = historico.reduce((s, d) => s + (parseFloat(d.receita_monofasica) || 0), 0)
  const totalRPA           = historico.reduce((s, d) => s + (parseFloat(d.receita_bruta_total) || 0), 0)
  const pctMedioMono       = totalRPA > 0 ? (totalMono / totalRPA * 100) : 0
  const competencias       = historico.map(d => d.competencia || d.periodo_apuracao).filter(Boolean)
  const periodoInicio      = competencias.length > 0 ? competencias[competencias.length - 1] : '—'
  const periodoFim         = competencias.length > 0 ? competencias[0] : '—'

  const carregarLogo = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target.result)
    reader.readAsDataURL(file)
  }

  const imprimir = () => {
    const conteudo = relRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório PIS/COFINS — ${cliente?.razao_social || ''}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #0F172A; background: #fff; padding: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            @page { margin: 15mm; size: A4; }
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 7px 10px; border: 1px solid #E2E8F0; font-size: 11px; }
          th { background: #4B5563; color: #fff; font-weight: 600; }
          tr:nth-child(even) td { background: #F8FAFC; }
        </style>
      </head>
      <body>${conteudo}</body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
  }

  const S = {
    navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
    red: '#dc2626', border: '#E2E8F0', bg: '#F8FAFC',
    muted: '#334155', ghost: '#64748B', text: '#0F172A',
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`,
    borderRadius: 6, fontSize: 13, outline: 'none',
    boxSizing: 'border-box', color: S.text, background: '#fff',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 9999, overflowY: 'auto', padding: '20px 16px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Controles */}
        <div style={{ background: S.navy, borderRadius: '10px 10px 0 0', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>📄 Relatório de Recuperação PIS/COFINS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setMostrarConfig(v => !v)}
              style={{ padding: '6px 14px', background: '#334155', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {mostrarConfig ? '👁 Ver Relatório' : '⚙ Configurar'}
            </button>
            <button onClick={imprimir}
              style={{ padding: '6px 14px', background: S.green, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🖨 Imprimir / PDF
            </button>
            <button onClick={onFechar}
              style={{ padding: '6px 14px', background: S.red, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ✕ Fechar
            </button>
          </div>
        </div>

        {/* Config do escritório */}
        {mostrarConfig && (
          <div style={{ background: '#fff', border: `1px solid ${S.border}`, padding: 20, borderTop: 'none' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: S.navy, marginBottom: 14 }}>
              ⚙ Dados do Escritório — aparecem no cabeçalho do relatório
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                ['Nome do Escritório / Contador', 'nome', 'Ex: Amaral Contabilidade'],
                ['CRC', 'crc', 'Ex: CRC-SP 123456/O-7'],
                ['Telefone', 'telefone', 'Ex: (11) 3333-4444'],
                ['WhatsApp', 'whatsapp', 'Ex: (11) 99999-8888'],
                ['E-mail', 'email', 'Ex: contato@escritorio.com.br'],
                ['Endereço', 'endereco', 'Ex: Av. Paulista, 1000 — São Paulo/SP'],
              ].map(([label, key, placeholder]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{label}</div>
                  <input value={escritorio[key]} onChange={e => setEscritorio(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder} style={inputStyle} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 6 }}>Logo do Escritório</div>
              <input ref={inputLogoRef} type="file" accept="image/*" onChange={carregarLogo} style={{ display: 'none' }} />
              <button onClick={() => inputLogoRef.current?.click()}
                style={{ padding: '7px 16px', background: S.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {logo ? '✓ Logo carregada — clique para trocar' : '⬆ Carregar Logo'}
              </button>
              {logo && <img src={logo} alt="logo" style={{ height: 48, marginLeft: 16, verticalAlign: 'middle', borderRadius: 4 }} />}
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setMostrarConfig(false)}
                style={{ padding: '8px 24px', background: S.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ✓ Visualizar Relatório
              </button>
            </div>
          </div>
        )}

        {/* RELATÓRIO */}
        {!mostrarConfig && (
          <div ref={relRef} style={{ background: '#fff', padding: '32px 36px', border: `1px solid ${S.border}`, borderTop: 'none', lineHeight: 1.6 }}>

            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16, borderBottom: `3px solid ${S.navy}`, paddingBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {logo
                  ? <img src={logo} alt="logo" style={{ height: 64, maxWidth: 180, objectFit: 'contain' }} />
                  : <div style={{ width: 80, height: 64, background: S.bg, border: `2px dashed ${S.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: S.ghost, textAlign: 'center', padding: 4 }}>Logo do escritório</div>
                }
                {escritorio.nome && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: S.navy }}>{escritorio.nome}</div>
                    {escritorio.crc && <div style={{ fontSize: 12, color: S.muted }}>{escritorio.crc}</div>}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: S.muted, lineHeight: 1.8 }}>
                {escritorio.telefone && <div>📞 {escritorio.telefone}</div>}
                {escritorio.whatsapp && <div>💬 WhatsApp: {escritorio.whatsapp}</div>}
                {escritorio.email && <div>✉ {escritorio.email}</div>}
                {escritorio.endereco && <div>📍 {escritorio.endereco}</div>}
              </div>
            </div>

            {/* Título */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ background: S.navy, color: '#fff', borderRadius: 8, padding: '12px 24px', display: 'inline-block' }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>PARECER TRIBUTÁRIO</div>
                <div style={{ fontSize: 12, marginTop: 4, color: '#94A3B8' }}>Recuperação de Créditos de PIS e COFINS — Regime Monofásico</div>
              </div>
            </div>

            {/* Dados do cliente */}
            <div style={{ background: S.bg, borderRadius: 8, padding: '14px 18px', marginBottom: 24, border: `1px solid ${S.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: 13 }}>
                <div><span style={{ fontWeight: 600, color: S.muted }}>Cliente: </span><span style={{ color: S.text }}>{cliente?.razao_social || '—'}</span></div>
                <div><span style={{ fontWeight: 600, color: S.muted }}>CNPJ: </span><span style={{ color: S.text }}>{cliente?.cnpj || '—'}</span></div>
                <div><span style={{ fontWeight: 600, color: S.muted }}>Regime: </span><span style={{ color: S.text }}>Simples Nacional</span></div>
                <div><span style={{ fontWeight: 600, color: S.muted }}>Período analisado: </span><span style={{ color: S.text }}>{periodoInicio} a {periodoFim}</span></div>
                <div><span style={{ fontWeight: 600, color: S.muted }}>Competências: </span><span style={{ color: S.text }}>{historico.length}</span></div>
                <div><span style={{ fontWeight: 600, color: S.muted }}>Data do parecer: </span><span style={{ color: S.text }}>{hoje()}</span></div>
              </div>
            </div>

            {/* 1. Resumo executivo */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.navy, borderLeft: `4px solid ${S.navy}`, paddingLeft: 12, marginBottom: 16 }}>
                1. RESUMO EXECUTIVO
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Crédito Total Apurado', valor: fmtR(totalCredito), color: S.green, destaque: true },
                  { label: 'Crédito PIS', valor: fmtR(totalCreditoPIS), color: S.blue },
                  { label: 'Crédito COFINS', valor: fmtR(totalCreditoCOFINS), color: S.blue },
                  { label: 'Total DAS Declarado', valor: fmtR(totalDAS), color: S.red },
                  { label: 'Total Receita Monofásica', valor: fmtR(totalMono), color: S.navy },
                  { label: '% Médio Monofásico', valor: fmtPct(pctMedioMono), color: S.muted },
                ].map((k, i) => (
                  <div key={i} style={{ background: k.destaque ? '#F0FDF4' : S.bg, border: `${k.destaque ? 2 : 1}px solid ${k.destaque ? '#86EFAC' : S.border}`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: k.destaque ? 18 : 15, fontWeight: 700, color: k.color }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.7 }}>
                A análise tributária realizada identificou que a empresa <strong>{cliente?.razao_social || '—'}</strong>, 
                optante pelo Simples Nacional, comercializou produtos sujeitos à tributação monofásica de PIS e COFINS 
                no período de <strong>{periodoInicio}</strong> a <strong>{periodoFim}</strong>. 
                Neste regime, o fabricante recolhe o PIS e COFINS de toda a cadeia, desobrigando o revendedor de recolher 
                novamente estas contribuições. A análise identificou um crédito total de{' '}
                <strong style={{ color: S.green }}>{fmtR(totalCredito)}</strong> passível de restituição junto à Receita Federal.
              </p>
            </div>

            {/* 2. Fundamentação legal */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.navy, borderLeft: `4px solid ${S.navy}`, paddingLeft: 12, marginBottom: 16 }}>
                2. FUNDAMENTAÇÃO LEGAL
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    lei: 'Lei Complementar nº 123/2006 — Art. 18, §4º, IV',
                    texto: 'Determina que as receitas decorrentes de vendas de produtos monofásicos devem ser segregadas da base de cálculo do Simples Nacional, pois o PIS e COFINS já foram recolhidos pelo fabricante ou importador na etapa anterior da cadeia produtiva.',
                  },
                  {
                    lei: 'Lei nº 10.147/2000',
                    texto: 'Estabelece a tributação concentrada (monofásica) de PIS e COFINS para produtos farmacêuticos, de perfumaria, toucador e higiene pessoal. O revendedor fica desobrigado do recolhimento destas contribuições sobre tais produtos.',
                  },
                  {
                    lei: 'Lei nº 9.990/2000 e Lei nº 10.560/2002',
                    texto: 'Instituem a tributação monofásica de PIS e COFINS sobre combustíveis, incluindo gasolina, óleo diesel, GLP e querosene de aviação, com alíquotas diferenciadas aplicadas ao produtor/importador.',
                  },
                  {
                    lei: 'Instrução Normativa RFB nº 2.055/2021',
                    texto: 'Regulamenta os pedidos eletrônicos de restituição, ressarcimento ou compensação de tributos administrados pela Receita Federal, inclusive PIS e COFINS recolhidos indevidamente. O pedido deve ser formalizado via PER/DCOMP.',
                  },
                  {
                    lei: 'Resolução CGSN nº 140/2018 — Art. 26',
                    texto: 'Regulamenta o PGDAS-D e estabelece que as receitas com tributação monofásica ou substituição tributária de PIS e COFINS devem ser informadas separadamente, gerando redução do DAS devido.',
                  },
                ].map((item, i) => (
                  <div key={i} style={{ background: '#EFF6FF', border: `1px solid #BFDBFE`, borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: S.blue, marginBottom: 4 }}>📋 {item.lei}</div>
                    <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6 }}>{item.texto}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Apuração por competência */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.navy, borderLeft: `4px solid ${S.navy}`, paddingLeft: 12, marginBottom: 16 }}>
                3. APURAÇÃO POR COMPETÊNCIA
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#4B5563' }}>
                      {['Competência','Receita Total','Rec. Monofásica','% Mono','DAS Declarado','PIS','COFINS','Crédito PIS+COFINS'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: '#fff', fontWeight: 600, textAlign: h === 'Competência' ? 'left' : 'right', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...historico].reverse().map((d, i) => {
                      const creditoComp = (parseFloat(d.pis) || 0) + (parseFloat(d.cofins) || 0)
                      const pctMono = d.receita_bruta_total > 0 ? (d.receita_monofasica / d.receita_bruta_total * 100) : 0
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff', borderBottom: `1px solid ${S.border}` }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: S.navy }}>{d.competencia || d.periodo_apuracao}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{fmtR(d.receita_bruta_total)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#ea580c' }}>{fmtR(d.receita_monofasica)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{fmtPct(pctMono)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: S.red }}>{fmtR(d.das_recolhido)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{fmtR(d.pis)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{fmtR(d.cofins)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{fmtR(creditoComp)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: S.navy }}>
                      <td style={{ padding: '8px 10px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94A3B8' }}>{fmtR(totalRPA)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94A3B8' }}>{fmtR(totalMono)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94A3B8' }}>{fmtPct(pctMedioMono)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94A3B8' }}>{fmtR(totalDAS)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6EE7B7' }}>{fmtR(totalCreditoPIS)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6EE7B7' }}>{fmtR(totalCreditoCOFINS)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700, fontSize: 13 }}>{fmtR(totalCredito)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 4. Próximos passos */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.navy, borderLeft: `4px solid ${S.navy}`, paddingLeft: 12, marginBottom: 16 }}>
                4. PRÓXIMOS PASSOS — PROCEDIMENTO DE RESTITUIÇÃO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  {
                    num: '01', titulo: 'Retificação do PGDAS-D',
                    desc: 'Para cada competência do período analisado, retificar a declaração do PGDAS-D informando corretamente as receitas monofásicas no campo "Receitas com tributação concentrada de PIS/COFINS". Acesso: Portal do Simples Nacional → PGDAS-D → Retificação.',
                    prazo: 'Prazo: até 5 anos da data de vencimento originalmente declarada',
                    cor: S.blue,
                  },
                  {
                    num: '02', titulo: 'Geração do DAS Retificador',
                    desc: 'Após a retificação, o sistema gerará automaticamente um novo DAS com valor inferior ao original. Caso o DAS original já tenha sido pago, a diferença configurará crédito a ser restituído. Não é necessário pagar o DAS retificador se o original já foi quitado.',
                    prazo: 'Atenção: não efetuar novo pagamento sem verificar a situação do DAS original',
                    cor: S.navy,
                  },
                  {
                    num: '03', titulo: 'Pedido Eletrônico de Restituição (PER/DCOMP)',
                    desc: 'Formalizar o pedido de restituição via PER/DCOMP Web, acessível pelo e-CAC (Centro Virtual de Atendimento da Receita Federal). O pedido deve identificar o tributo (PIS/COFINS — Simples Nacional), o período, e o valor a restituir conforme apurado nas retificações.',
                    prazo: 'Prazo de análise pela RFB: até 360 dias (Lei nº 9.784/1999)',
                    cor: S.green,
                  },
                  {
                    num: '04', titulo: 'Acompanhamento e Documentação',
                    desc: 'Guardar toda a documentação de suporte: XMLs das NF-es, extratos do PGDAS-D original e retificado, comprovantes de pagamento do DAS, e este parecer tributário. Em caso de intimação da Receita Federal, apresentar a fundamentação legal e os cálculos detalhados.',
                    prazo: 'Manter documentação por no mínimo 5 anos',
                    cor: '#ea580c',
                  },
                ].map((passo, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, background: S.bg, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S.border}`, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 40, height: 40, background: passo.cor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {passo.num}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: passo.cor, marginBottom: 4 }}>{passo.titulo}</div>
                      <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6, marginBottom: 6 }}>{passo.desc}</div>
                      <div style={{ fontSize: 11, color: '#92400E', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 4, padding: '3px 8px', display: 'inline-block' }}>
                        ⏱ {passo.prazo}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Aviso legal */}
            <div style={{ background: '#FFF7ED', border: `1px solid #FED7AA`, borderRadius: 8, padding: '14px 16px', marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>⚠️ AVISO LEGAL</div>
              <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
                Este parecer foi elaborado com base nas informações fornecidas pelo cliente e na legislação tributária vigente. 
                Os valores apurados são estimativas baseadas nas declarações do PGDAS-D e nas notas fiscais eletrônicas disponibilizadas. 
                A efetivação da recuperação dos créditos está sujeita à análise e homologação pela Receita Federal do Brasil. 
                Recomenda-se a verificação de todos os documentos originais antes da formalização do pedido de restituição.
              </p>
            </div>

            {/* Assinatura */}
            <div style={{ borderTop: `2px solid ${S.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ fontSize: 12, color: S.muted }}>
                <div>Documento gerado em {hoje()}</div>
                <div style={{ marginTop: 4 }}>e-FiscalTribe® — Sistema de Inteligência Tributária</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 220, borderTop: `1px solid ${S.text}`, paddingTop: 8, fontSize: 12, color: S.text }}>
                  <div style={{ fontWeight: 600 }}>{escritorio.nome || 'Contador Responsável'}</div>
                  {escritorio.crc && <div style={{ color: S.muted }}>{escritorio.crc}</div>}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}