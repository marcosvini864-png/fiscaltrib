import { useState, useRef, useEffect } from 'react'
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

const FUNDAMENTACAO = {
  MONOFASICO: 'Lei 10.147/2000, Lei 10.485/2002, Lei 9.718/1998 — Tributação concentrada na indústria. Distribuidor/varejista não deve recolher PIS/COFINS sobre a revenda.',
  SEGREGACAO_MONOFASICO: 'LC 123/2006 art. 18 §4º — Receitas com produtos monofásicos devem ser segregadas no PGDAS-D para redução do DAS.',
  EXCLUSAO_ICMS_TEMA69: 'STF RE 574.706 — Tema 69. O ICMS não compõe a base de cálculo do PIS e da COFINS. Recuperação retroativa de 5 anos.',
  ICMS_ST: 'IN RFB 1.911/2019 — ICMS-ST pago nas entradas gera crédito de PIS/COFINS no Lucro Real.',
  RETENCAO_INDEVIDA: 'LC 123/2006 art. 3º §4º — Empresas do Simples Nacional são imunes a retenções de PIS/COFINS/CSLL na fonte.',
  PGDAS_SEGREGACAO: 'LC 123/2006 art. 18 §4º-A — Receitas sujeitas a tributação monofásica, substituição tributária ou imunes devem ser segregadas no PGDAS-D com alíquota reduzida ou zero.',
}

const C = {
  navy: '#0B1F4D', white: '#FFFFFF', border: '#C8D0DC',
  text: '#1E293B', muted: '#64748B', green: '#16a34a',
  red: '#dc2626', bg: '#F4E7EC', orange: '#ea580c',
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtCNPJ = v => v ? v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'

const thStyle = () => ({
  padding: '7px 8px', textAlign: 'left', color: '#64748B', fontWeight: 600,
  borderBottom: '1px solid #C8D0DC', fontSize: 10, textTransform: 'uppercase',
  whiteSpace: 'normal', wordBreak: 'break-word',
})
const tdStyle = (extra = {}) => ({
  padding: '7px 8px', fontSize: 11, whiteSpace: 'normal',
  wordBreak: 'break-word', verticalAlign: 'top', ...extra,
})

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { const base64 = reader.result.split(',')[1]; resolve(base64) }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function promptPGDAS(regime) {
  return `Você é um especialista em Simples Nacional. Analise este documento PGDAS-D e extraia os dados em formato JSON.

Retorne SOMENTE um JSON válido, sem markdown, sem explicações, com esta estrutura exata:

{
  "cnpj": "string",
  "razao_social": "string",
  "periodo_apuracao": "AAAA-MM",
  "receita_bruta_total": number,
  "receita_bruta_tributada": number,
  "receita_bruta_nao_tributada": number,
  "receita_monofasica": number,
  "receita_substituicao_tributaria": number,
  "receita_exportacao": number,
  "das_recolhido": number,
  "das_calculado_sem_segregacao": number,
  "competencias": [
    {
      "periodo": "AAAA-MM",
      "receita_bruta": number,
      "receita_monofasica": number,
      "receita_st": number,
      "das_recolhido": number,
      "das_correto_estimado": number
    }
  ],
  "segregou_monofasicos": boolean,
  "segregou_st": boolean,
  "observacoes": "string com alertas relevantes"
}

Se algum campo não estiver no documento, use null. Valores monetários sempre como número (ex: 1234.56, não "R$ 1.234,56").`
}

function parsePGDASResposta(texto) {
  try {
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON não encontrado na resposta')
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('Erro ao parsear PGDAS:', e)
    return null
  }
}

function montarContextoIA(resultado, cliente, regime) {
  const teses = [
    ...(resultado.monofasicos.length > 0 ? [regime === 'Simples Nacional' ? 'SEGREGACAO_MONOFASICO' : 'MONOFASICO'] : []),
    ...(resultado.exclusaoICMS.length > 0 ? ['EXCLUSAO_ICMS_TEMA69'] : []),
    ...(resultado.icmsST.length > 0 ? ['ICMS_ST'] : []),
    ...(resultado.retencoes.length > 0 ? ['RETENCAO_INDEVIDA'] : []),
    ...(resultado.pgdas && resultado.pgdas.diferenca_total > 0 ? ['PGDAS_SEGREGACAO'] : []),
  ]
  const emitentes = [...new Set(resultado.notasRaw.map(n => n.emitNome).filter(Boolean))].slice(0, 10)
  const ncms = [...new Set(resultado.notasRaw.flatMap(n => n.itens?.map(i => i.ncm) || []).filter(Boolean))].slice(0, 20)
  const competenciasTexto = resultado.resumoCompetencias.map(c =>
    `${c.competencia}: receita ${fmtR(c.receita_bruta)}, PIS/COFINS ${fmtR(c.tributo_pago)}, credito ${fmtR(c.credito)}`
  ).join('\n')
  const anoAtual = new Date().getFullYear()
  const prescricao5anos = anoAtual - 5
  let pgdasTexto = ''
  if (resultado.pgdas) {
    const p = resultado.pgdas
    pgdasTexto = `\nDADOS DO PGDAS-D:\n- Receita bruta total: ${fmtR(p.receita_bruta_total)}\n- Receita monofásica declarada: ${fmtR(p.receita_monofasica)}\n- DAS recolhido: ${fmtR(p.das_recolhido)}\n- Segregou monofásicos: ${p.segregou_monofasicos ? 'Sim' : 'NAO - OPORTUNIDADE IDENTIFICADA'}\n- Diferença estimada: ${fmtR(p.diferenca_total)}`
  }
  return `Você é um especialista em direito tributário brasileiro. Analise o diagnóstico fiscal abaixo e produza um parecer estruturado.

DADOS DO CLIENTE:
- Razão Social: ${cliente?.razao_social || 'Não informado'}
- CNPJ: ${cliente?.cnpj || 'Não informado'}
- Regime Tributário: ${regime}
- Município/UF: ${cliente?.municipio || '—'}/${cliente?.uf || '—'}

RESULTADO DO DIAGNÓSTICO:
- Total de NF-e analisadas: ${resultado.totalNotas}
- Período: ${resultado.resumoCompetencias[resultado.resumoCompetencias.length - 1]?.competencia || '—'} a ${resultado.resumoCompetencias[0]?.competencia || '—'}
- Potencial total de recuperação: ${fmtR(resultado.totalCredito)}
- Teses identificadas: ${teses.join(', ') || 'Nenhuma'}

EMITENTES: ${emitentes.join(', ')}
NCMs: ${ncms.join(', ')}

ANÁLISE POR COMPETÊNCIA:
${competenciasTexto}
${pgdasTexto}

DETALHAMENTO:
${resultado.monofasicos.length > 0 ? `- Monofásicos: ${resultado.monofasicos.length} itens, crédito ${fmtR(resultado.monofasicos.reduce((s, o) => s + o.credito, 0))}` : ''}
${resultado.exclusaoICMS.length > 0 ? `- Exclusão ICMS Tema 69: ${resultado.exclusaoICMS.length} competências, crédito ${fmtR(resultado.exclusaoICMS.reduce((s, o) => s + o.credito, 0))}` : ''}
${resultado.icmsST.length > 0 ? `- ICMS-ST: ${resultado.icmsST.length} itens, crédito ${fmtR(resultado.icmsST.reduce((s, o) => s + o.credito, 0))}` : ''}
${resultado.retencoes.length > 0 ? `- Retenções Indevidas: ${resultado.retencoes.length} ocorrências, crédito ${fmtR(resultado.retencoes.reduce((s, o) => s + o.credito, 0))}` : ''}

ALERTA: Prazo prescricional alcança competências a partir de ${prescricao5anos}.

Produza um parecer com EXATAMENTE estas 4 seções:

## PARECER JURÍDICO
Análise técnica das teses com embasamento legal.

## ESTRATÉGIA RECOMENDADA
Sequência de ações práticas com prazos e responsáveis.

## ALERTAS DE PRAZO
Competências próximas da prescrição e datas críticas.

## PERGUNTAS PARA O CLIENTE
4 a 6 perguntas que o contador deve fazer ao cliente.`
}

function renderMarkdown(texto) {
  if (!texto) return null
  return texto.split('\n').map((linha, i) => {
    if (linha.startsWith('## '))
      return <div key={i} style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginTop: 20, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>{linha.replace('## ', '')}</div>
    if (linha.startsWith('- ') || linha.startsWith('• '))
      return <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: C.text, lineHeight: 1.6, marginBottom: 4 }}><span style={{ color: C.navy, fontWeight: 700, flexShrink: 0 }}>•</span><span>{linha.replace(/^[-•]\s/, '')}</span></div>
    if (linha.trim() === '')
      return <div key={i} style={{ height: 6 }} />
    return <div key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginBottom: 4 }}>{linha}</div>
  })
}

const AVISO_RESPONSABILIDADE = 'O FiscalTrib identifica possíveis créditos com base nos documentos importados. A conferência dos valores e a decisão de protocolar são de inteira responsabilidade do profissional habilitado.'

// ─── Componente de diagnóstico narrativo por tese ────────────────────────────
function DiagnosticoNarrativo({ resultado, regime }) {
  const { monofasicos, exclusaoICMS, icmsST, retencoes, notasRaw, pgdas } = resultado

  const totalNotasEntrada = notasRaw.filter(n => n.tipo === 'entrada').length
  const totalNotas = notasRaw.length
  const ncmsEncontrados = [...new Set(notasRaw.flatMap(n => n.itens?.map(i => i.ncm?.substring(0, 8)) || []).filter(Boolean))]

  const cardStyle = (cor) => ({
    background: C.white,
    borderRadius: 12,
    border: `1.5px solid ${cor}`,
    padding: '20px 24px',
    marginBottom: 16,
  })

  const badgeStyle = (bg, color) => ({
    display: 'inline-block',
    background: bg,
    color: color,
    fontWeight: 800,
    fontSize: 11,
    padding: '3px 12px',
    borderRadius: 99,
    marginLeft: 10,
    verticalAlign: 'middle',
  })

  const tituloStyle = (cor) => ({
    fontSize: 15,
    fontWeight: 800,
    color: cor,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  })

  const textoStyle = { fontSize: 13, color: C.text, lineHeight: 1.8, marginBottom: 12 }

  const comoRecuperarStyle = {
    background: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 12,
    color: '#166534',
    lineHeight: 1.7,
    marginBottom: 10,
  }

  const avisoStyle = {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 11,
    color: C.red,
    lineHeight: 1.6,
    fontWeight: 600,
  }

  const nfesAfetadasStyle = {
    background: '#f8fafc',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 12,
    fontSize: 12,
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 16, paddingBottom: 8, borderBottom: `2px solid ${C.border}` }}>
        Diagnóstico Detalhado por Tese
      </div>

      {/* ── MONOFÁSICOS ── */}
      {(regime === 'Lucro Presumido' || regime === 'Lucro Real') && (
        <div style={cardStyle(monofasicos.length > 0 ? '#86efac' : C.border)}>
          <div style={tituloStyle(monofasicos.length > 0 ? C.green : C.muted)}>
            💊 Monofásicos PIS/COFINS
            <span style={badgeStyle(monofasicos.length > 0 ? '#f0fdf4' : '#f1f5f9', monofasicos.length > 0 ? C.green : C.muted)}>
              {monofasicos.length > 0 ? 'OPORTUNIDADE ENCONTRADA' : 'NÃO ENCONTRADO'}
            </span>
          </div>

          {monofasicos.length > 0 ? (
            <>
              <p style={textoStyle}>
                Foram analisadas <strong>{totalNotasEntrada}</strong> NF-e de entrada. Encontramos <strong>{monofasicos.length} item(ns)</strong> com NCM sujeito à tributação monofásica — produtos cuja tributação de PIS/COFINS já foi recolhida pelo fabricante ou importador. O distribuidor ou varejista que recolhe novamente está pagando em duplicidade e tem direito à recuperação.
              </p>
              <div style={nfesAfetadasStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Itens identificados</div>
                {monofasicos.slice(0, 10).map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                    <span><strong>{m.descricao}</strong> — NCM {m.ncm?.substring(0, 8)}</span>
                    <span style={{ color: C.green, fontWeight: 700 }}>{fmtR(m.credito)}</span>
                  </div>
                ))}
                {monofasicos.length > 10 && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>...e mais {monofasicos.length - 10} item(ns). Veja a tabela completa abaixo.</div>}
              </div>
              <div style={comoRecuperarStyle}>
                <strong>Como recuperar:</strong> Acesse o módulo <strong>Recuperação de Créditos</strong>, clique na aba <strong>Monofásicos PIS/COFINS</strong> e importe os XMLs das NF-e dos últimos 5 anos. O sistema calculará o crédito mês a mês e gerará o arquivo para lançamento no <strong>PER/DCOMP</strong>. Após revisar os valores, protocole o PER/DCOMP na Receita Federal.
              </div>
              <div style={avisoStyle}>
                ⚠️ {AVISO_RESPONSABILIDADE}
              </div>
            </>
          ) : (
            <p style={{ ...textoStyle, color: C.muted }}>
              Foram analisadas <strong>{totalNotasEntrada}</strong> NF-e de entrada com <strong>{ncmsEncontrados.length}</strong> NCMs distintos. Nenhum produto com NCM sujeito à tributação monofásica foi identificado nas notas analisadas. Os produtos presentes não constam na lista de itens com tributação concentrada na indústria (gasolina, medicamentos, cosméticos, autopeças, bebidas, pneus, etc.). Nenhuma ação necessária para esta tese com base nos documentos analisados.
            </p>
          )}
        </div>
      )}

      {/* ── SEGREGAÇÃO MONOFÁSICOS SIMPLES NACIONAL ── */}
      {regime === 'Simples Nacional' && (
        <div style={cardStyle(monofasicos.length > 0 ? '#fed7aa' : C.border)}>
          <div style={tituloStyle(monofasicos.length > 0 ? C.orange : C.muted)}>
            💊 Segregação de Receitas Monofásicas — Simples Nacional
            <span style={badgeStyle(monofasicos.length > 0 ? '#fff7ed' : '#f1f5f9', monofasicos.length > 0 ? C.orange : C.muted)}>
              {monofasicos.length > 0 ? 'VERIFICAR PGDAS-D' : 'NÃO ENCONTRADO'}
            </span>
          </div>

          {monofasicos.length > 0 ? (
            <>
              <p style={textoStyle}>
                Identificamos <strong>{monofasicos.length} item(ns)</strong> nas NF-e de entrada com NCM sujeito à tributação monofásica. No Simples Nacional, receitas provenientes de produtos monofásicos devem ser segregadas no PGDAS-D com alíquota de PIS/COFINS igual a zero — caso contrário, a empresa está pagando DAS a mais sobre esses produtos.
              </p>
              <div style={nfesAfetadasStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Produtos monofásicos identificados</div>
                {monofasicos.slice(0, 10).map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                    <span><strong>{m.descricao}</strong> — NCM {m.ncm?.substring(0, 8)}</span>
                    <span style={{ color: C.orange, fontWeight: 700 }}>{fmtR(m.vProd)}</span>
                  </div>
                ))}
              </div>
              <div style={comoRecuperarStyle}>
                <strong>Como recuperar:</strong> Acesse o módulo <strong>Recuperação de Créditos</strong>, clique na aba <strong>Segregação de Receitas PGDAS-D</strong> e importe os XMLs das NF-e dos últimos 5 anos. O sistema identificará os períodos em que a segregação não foi feita corretamente e calculará o DAS pago a maior. Em seguida, retifique o PGDAS-D dos períodos identificados e solicite a restituição junto à Receita Federal.
              </div>
              <div style={avisoStyle}>
                ⚠️ {AVISO_RESPONSABILIDADE}
              </div>
            </>
          ) : (
            <p style={{ ...textoStyle, color: C.muted }}>
              Foram analisadas <strong>{totalNotasEntrada}</strong> NF-e de entrada. Nenhum produto com NCM sujeito à tributação monofásica foi encontrado. A segregação no PGDAS-D não é necessária para os produtos presentes nas notas analisadas.
            </p>
          )}
        </div>
      )}

      {/* ── EXCLUSÃO ICMS TEMA 69 ── */}
      {(regime === 'Lucro Presumido' || regime === 'Lucro Real') && (
        <div style={cardStyle(exclusaoICMS.length > 0 ? '#86efac' : C.border)}>
          <div style={tituloStyle(exclusaoICMS.length > 0 ? C.green : C.muted)}>
            ⚖️ Exclusão do ICMS da base PIS/COFINS — Tema 69
            <span style={badgeStyle(exclusaoICMS.length > 0 ? '#f0fdf4' : '#f1f5f9', exclusaoICMS.length > 0 ? C.green : C.muted)}>
              {exclusaoICMS.length > 0 ? 'OPORTUNIDADE ENCONTRADA' : 'NÃO ENCONTRADO'}
            </span>
          </div>

          {exclusaoICMS.length > 0 ? (
            <>
              <p style={textoStyle}>
                Em <strong>{exclusaoICMS.length} competência(s)</strong> foram identificados valores de ICMS destacados nas notas fiscais que compuseram indevidamente a base de cálculo do PIS e da COFINS. Por decisão do STF (RE 574.706 — Tema 69), o ICMS não integra a receita bruta para fins de PIS/COFINS, e os valores recolhidos a maior nos últimos 5 anos podem ser recuperados.
              </p>
              <div style={nfesAfetadasStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Competências com ICMS na base</div>
                {exclusaoICMS.map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                    <span><strong>{e.competencia}</strong> — ICMS na base: {fmtR(e.vICMS)}</span>
                    <span style={{ color: C.green, fontWeight: 700 }}>Crédito: {fmtR(e.credito)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.green }}>
                  Total estimado: {fmtR(exclusaoICMS.reduce((s, o) => s + o.credito, 0))}
                </div>
              </div>
              <div style={comoRecuperarStyle}>
                <strong>Como recuperar:</strong> Acesse o módulo <strong>Recuperação de Créditos</strong>, clique na aba <strong>Exclusão do ICMS da base PIS/COFINS Tema 69</strong> e importe os XMLs das NF-e dos últimos 5 anos. O sistema calculará o crédito mês a mês e gerará o arquivo para lançamento no <strong>PER/DCOMP</strong>. Após revisar os valores, protocole o PER/DCOMP na Receita Federal.
              </div>
              <div style={avisoStyle}>
                ⚠️ {AVISO_RESPONSABILIDADE}
              </div>
            </>
          ) : (
            <p style={{ ...textoStyle, color: C.muted }}>
              Foram analisadas <strong>{totalNotas}</strong> NF-e no período. Não foram identificados valores de ICMS destacados nas notas que indiquem recolhimento indevido de PIS/COFINS sobre o ICMS. Pode ser que as notas analisadas não contenham ICMS destacado ou que o período analisado seja insuficiente. Recomenda-se importar um volume maior de documentos para uma análise mais abrangente.
            </p>
          )}
        </div>
      )}

      {/* ── ICMS-ST ── */}
      {regime === 'Lucro Real' && (
        <div style={cardStyle(icmsST.length > 0 ? '#86efac' : C.border)}>
          <div style={tituloStyle(icmsST.length > 0 ? C.green : C.muted)}>
            🔄 Crédito de ICMS-ST
            <span style={badgeStyle(icmsST.length > 0 ? '#f0fdf4' : '#f1f5f9', icmsST.length > 0 ? C.green : C.muted)}>
              {icmsST.length > 0 ? 'OPORTUNIDADE ENCONTRADA' : 'NÃO ENCONTRADO'}
            </span>
          </div>

          {icmsST.length > 0 ? (
            <>
              <p style={textoStyle}>
                Foram identificados <strong>{icmsST.length} item(ns)</strong> com ICMS retido por Substituição Tributária nas entradas. No regime de Lucro Real, o ICMS-ST pago nas compras gera crédito de PIS/COFINS, pois integra o custo de aquisição da mercadoria. Esse crédito é frequentemente ignorado e representa uma oportunidade de recuperação significativa.
              </p>
              <div style={nfesAfetadasStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Itens com ICMS-ST identificados</div>
                {icmsST.slice(0, 10).map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                    <span><strong>{m.produto || m.descricao || 'Produto'}</strong> — ST: {fmtR(m.vST)}</span>
                    <span style={{ color: C.green, fontWeight: 700 }}>Crédito: {fmtR(m.credito)}</span>
                  </div>
                ))}
                {icmsST.length > 10 && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>...e mais {icmsST.length - 10} item(ns).</div>}
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.green }}>
                  Total estimado: {fmtR(icmsST.reduce((s, o) => s + o.credito, 0))}
                </div>
              </div>
              <div style={comoRecuperarStyle}>
                <strong>Como recuperar:</strong> Acesse o módulo <strong>Recuperação de Créditos</strong>, clique na aba <strong>Crédito ICMS-ST</strong> e importe os XMLs das NF-e dos últimos 5 anos. O sistema identificará todos os itens com ICMS-ST, calculará o crédito de PIS/COFINS correspondente mês a mês e gerará o arquivo para lançamento no <strong>PER/DCOMP</strong>. Após revisar os valores, protocole o PER/DCOMP na Receita Federal.
              </div>
              <div style={avisoStyle}>
                ⚠️ {AVISO_RESPONSABILIDADE}
              </div>
            </>
          ) : (
            <p style={{ ...textoStyle, color: C.muted }}>
              Foram analisadas <strong>{totalNotasEntrada}</strong> NF-e de entrada. Nenhum valor de ICMS retido por Substituição Tributária foi identificado nas notas analisadas. Caso a empresa adquira mercadorias sujeitas ao ICMS-ST, recomenda-se revisar se os XMLs importados representam o universo completo de compras do período.
            </p>
          )}
        </div>
      )}

      {/* ── RETENÇÕES INDEVIDAS ── */}
      {regime === 'Simples Nacional' && (
        <div style={cardStyle(retencoes.length > 0 ? '#86efac' : C.border)}>
          <div style={tituloStyle(retencoes.length > 0 ? C.green : C.muted)}>
            🚫 Retenções Indevidas de PIS/COFINS/CSLL
            <span style={badgeStyle(retencoes.length > 0 ? '#f0fdf4' : '#f1f5f9', retencoes.length > 0 ? C.green : C.muted)}>
              {retencoes.length > 0 ? 'OPORTUNIDADE ENCONTRADA' : 'NÃO ENCONTRADO'}
            </span>
          </div>

          {retencoes.length > 0 ? (
            <>
              <p style={textoStyle}>
                Identificamos <strong>{retencoes.length} NF-e</strong> com retenção de PIS/COFINS/CSLL na fonte. Empresas optantes pelo Simples Nacional são expressamente dispensadas dessas retenções por força da LC 123/2006. Quando o tomador do serviço retém esses tributos indevidamente, a empresa tem direito à restituição integral dos valores.
              </p>
              <div style={nfesAfetadasStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>NF-e com retenção indevida</div>
                {retencoes.slice(0, 10).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                    <span>NF <strong>{r.nNF}</strong> — Competência: {r.competencia}</span>
                    <span style={{ color: C.green, fontWeight: 700 }}>Retido indevidamente: {fmtR(r.credito)}</span>
                  </div>
                ))}
                {retencoes.length > 10 && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>...e mais {retencoes.length - 10} nota(s).</div>}
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.green }}>
                  Total retido indevidamente: {fmtR(retencoes.reduce((s, o) => s + o.credito, 0))}
                </div>
              </div>
              <div style={comoRecuperarStyle}>
                <strong>Como recuperar:</strong> Acesse o módulo <strong>Recuperação de Créditos</strong>, clique na aba <strong>Retenções Indevidas Simples Nacional</strong> e importe os XMLs das NF-e dos últimos 5 anos. O sistema identificará todas as notas com retenção indevida, calculará o total por período e gerará o pedido de restituição. Após revisar os valores, protocole o pedido junto à Receita Federal.
              </div>
              <div style={avisoStyle}>
                ⚠️ {AVISO_RESPONSABILIDADE}
              </div>
            </>
          ) : (
            <p style={{ ...textoStyle, color: C.muted }}>
              Foram analisadas <strong>{totalNotas}</strong> NF-e no período. Não foram identificadas retenções de PIS/COFINS/CSLL nas notas analisadas. Isso pode indicar que os tomadores de serviço estão cumprindo corretamente a dispensa prevista na LC 123/2006, ou que as notas de prestação de serviço não foram incluídas nesta importação.
            </p>
          )}
        </div>
      )}

      {/* ── PGDAS-D ── */}
      {pgdas && (
        <div style={cardStyle(pgdas.diferenca_total > 0 ? '#fed7aa' : C.border)}>
          <div style={tituloStyle(pgdas.diferenca_total > 0 ? C.orange : C.muted)}>
            📋 Segregação no PGDAS-D
            <span style={badgeStyle(pgdas.diferenca_total > 0 ? '#fff7ed' : '#f1f5f9', pgdas.diferenca_total > 0 ? C.orange : C.muted)}>
              {pgdas.diferenca_total > 0 ? 'OPORTUNIDADE ENCONTRADA' : 'SEGREGAÇÃO CORRETA'}
            </span>
          </div>

          {pgdas.diferenca_total > 0 ? (
            <>
              <p style={textoStyle}>
                A análise do PGDAS-D identificou que a empresa <strong>não realizou a segregação correta</strong> das receitas monofásicas ou sujeitas à substituição tributária. Isso significa que o DAS foi calculado sobre a receita bruta total, incluindo produtos cujo PIS/COFINS já foi recolhido pelo fabricante. O valor pago a maior estimado é de <strong style={{ color: C.orange }}>{fmtR(pgdas.diferenca_total)}</strong>.
              </p>
              <div style={nfesAfetadasStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Resumo do PGDAS-D analisado</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                  <span>Receita bruta total declarada</span>
                  <span style={{ fontWeight: 600 }}>{fmtR(pgdas.receita_bruta_total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                  <span>Receita monofásica identificada</span>
                  <span style={{ fontWeight: 600, color: C.orange }}>{fmtR(pgdas.receita_monofasica)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                  <span>DAS recolhido</span>
                  <span style={{ fontWeight: 600 }}>{fmtR(pgdas.das_recolhido)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                  <span>DAS correto estimado</span>
                  <span style={{ fontWeight: 600, color: C.green }}>{fmtR(pgdas.das_correto_estimado)}</span>
                </div>
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.orange }}>
                  Diferença recuperável estimada: {fmtR(pgdas.diferenca_total)}
                </div>
              </div>
              <div style={comoRecuperarStyle}>
                <strong>Como recuperar:</strong> Acesse o módulo <strong>Recuperação de Créditos</strong>, clique na aba <strong>Segregação de Receitas PGDAS-D</strong> e importe os XMLs das NF-e dos últimos 5 anos. O sistema identificará os períodos em que a segregação não foi realizada, calculará o DAS pago a maior e orientará a retificação do PGDAS-D. Após a retificação, solicite a restituição dos valores junto à Receita Federal.
              </div>
              <div style={avisoStyle}>
                ⚠️ {AVISO_RESPONSABILIDADE}
              </div>
            </>
          ) : (
            <p style={{ ...textoStyle, color: C.muted }}>
              A análise do PGDAS-D indica que a segregação de receitas foi realizada corretamente. O DAS calculado está de acordo com as receitas tributáveis, sem inclusão indevida de produtos monofásicos ou sujeitos à substituição tributária na base de cálculo. Nenhuma ação necessária para esta tese.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiagnosticoTributario({ clienteId, cliente, onNavegar }) {
  const [etapa, setEtapa] = useState('inicio')
  const [aba, setAba] = useState('novo')
  const [arquivos, setArquivos] = useState([])
  const [resultado, setResultado] = useState(null)
  const [historico, setHistorico] = useState([])
  const [historicoNFes, setHistoricoNFes] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [abaHistorico, setAbaHistorico] = useState('competencias')
  const [parecerIA, setParecerIA] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [erroIA, setErroIA] = useState('')
  const [mostrarChat, setMostrarChat] = useState(false)
  const [mensagensChat, setMensagensChat] = useState([])
  const [inputChat, setInputChat] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const [loadingPGDAS, setLoadingPGDAS] = useState(false)
  const [erroPGDAS, setErroPGDAS] = useState('')
  const inputRef = useRef(null)
  const chatFimRef = useRef(null)

  const regime = cliente?.regime || 'Simples Nacional'

  useEffect(() => { if (clienteId) carregarHistorico() }, [clienteId])
  useEffect(() => { if (chatFimRef.current) chatFimRef.current.scrollIntoView({ behavior: 'smooth' }) }, [mensagensChat])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const [{ data: ents }, { data: nfes }] = await Promise.all([
      supabase.from('entradas').select('*').eq('cliente_id', clienteId).order('competencia', { ascending: false }),
      supabase.from('entradas_nfe').select('*').eq('cliente_id', clienteId).order('data_emissao', { ascending: false }),
    ])
    setHistorico(ents || [])
    setHistoricoNFes(nfes || [])
    setLoadingHistorico(false)
  }

  function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    setArquivos(prev => [...prev, ...files.map(f => ({
      file: f, nome: f.name,
      tipo: f.name.endsWith('.xml') ? 'xml' : f.name.endsWith('.csv') ? 'csv' : f.name.endsWith('.pdf') ? 'pdf' : 'outro',
    }))])
  }

  async function processarPDFsPGDAS(arquivosPDF) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada.')
    const resultados = []
    for (const arq of arquivosPDF) {
      try {
        const base64 = await fileToBase64(arq.file)
        const resp = await fetch(`https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            model: 'gemini-3.5-flash',
            system: 'Você é um especialista em Simples Nacional e PGDAS-D. Extraia dados fiscais com precisão.',
            messages: [{
              role: 'user',
              content: [
                { type: 'inline_data', inline_data: { mime_type: 'application/pdf', data: base64 } },
                { type: 'text', text: promptPGDAS(regime) },
              ],
            }],
          }),
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const json = await resp.json()
        console.log('GEMINI RESPOSTA:', json.resposta)
        const dados = parsePGDASResposta(json.resposta || '')
        console.log('DADOS PARSEADOS:', dados)
        if (dados) resultados.push({ arquivo: arq.nome, dados })
      } catch (e) {
        console.warn(`Erro ao processar ${arq.nome}:`, e.message)
      }
    }
    return resultados
  }

  function consolidarPGDAS(resultadosPGDAS) {
    if (!resultadosPGDAS.length) return null
    const totais = { receita_bruta_total: 0, receita_monofasica: 0, receita_substituicao_tributaria: 0, das_recolhido: 0, das_correto_estimado: 0, competencias: [], segregou_monofasicos: true, segregou_st: true, arquivos: [] }
    for (const r of resultadosPGDAS) {
      const d = r.dados
      totais.receita_bruta_total += d.receita_bruta_total || 0
      totais.receita_monofasica += d.receita_monofasica || 0
      totais.receita_substituicao_tributaria += d.receita_substituicao_tributaria || 0
      totais.das_recolhido += d.das_recolhido || 0
      if (d.segregou_monofasicos === false) totais.segregou_monofasicos = false
      if (d.segregou_st === false) totais.segregou_st = false
      if (d.competencias) totais.competencias.push(...d.competencias)
      totais.arquivos.push(r.arquivo)
      const receitaTributavel = (d.receita_bruta_total || 0) - (d.receita_monofasica || 0) - (d.receita_substituicao_tributaria || 0)
      totais.das_correto_estimado += receitaTributavel * 0.06
    }
    totais.diferenca_total = Math.max(0, totais.das_recolhido - totais.das_correto_estimado)
    return totais
  }

  async function analisar() {
    if (arquivos.length === 0) return
    setEtapa('processando')
    setErro('')
    setErroPGDAS('')
    setParecerIA(null)
    setMensagensChat([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const notasXML = []
      let pgdasConsolidado = null
      for (const arq of arquivos) {
        if (arq.tipo === 'xml') {
          const texto = await arq.file.text()
          const xmls = texto.includes('<nfeProc')
            ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x + '</nfeProc>')
            : [texto]
          for (const xml of xmls) {
            try { const n = parseXMLNFe(xml); if (n.competencia) notasXML.push(n) } catch (e) { console.warn('XML inválido:', e) }
          }
        }
      }
      const arquivosPDF = arquivos.filter(a => a.tipo === 'pdf')
      if (arquivosPDF.length > 0) {
        setLoadingPGDAS(true)
        try {
          const resultadosPGDAS = await processarPDFsPGDAS(arquivosPDF)
          pgdasConsolidado = consolidarPGDAS(resultadosPGDAS)
        } catch (e) {
          setErroPGDAS('Erro ao processar PDF: ' + e.message)
        } finally {
          setLoadingPGDAS(false)
        }
      }
      if (notasXML.length === 0 && !pgdasConsolidado) throw new Error('Nenhum documento válido encontrado.')
      const competencias = notasXML.length > 0 ? agruparPorCompetencia(notasXML) : []
      const entradas = notasXML.filter(n => n.tipo === 'entrada')
      const saidas = notasXML.filter(n => n.tipo === 'saida')
      const itensEntrada = entradas.flatMap(n => n.itens)
      const monofasicos = []
      for (const item of itensEntrada) {
        const ncm8 = item.ncm?.substring(0, 8)
        const desc = NCM_MONOFASICOS[ncm8]
        if (desc) {
          if ((regime === 'Lucro Presumido' || regime === 'Lucro Real') && (item.vPIS > 0 || item.vCOFINS > 0))
            monofasicos.push({ ...item, descricao: desc, credito: item.vPIS + item.vCOFINS, tese: 'MONOFASICO' })
          if (regime === 'Simples Nacional')
            monofasicos.push({ ...item, descricao: desc, credito: 0, tese: 'SEGREGACAO_MONOFASICO' })
        }
      }
      const exclusaoICMS = []
      if (regime === 'Lucro Presumido' || regime === 'Lucro Real') {
        for (const comp of competencias) {
          if (comp.totalICMS > 0) {
            const aliq = regime === 'Lucro Real' ? 0.0925 : 0.0365
            exclusaoICMS.push({ competencia: comp.competencia, vICMS: comp.totalICMS, credito: comp.totalICMS * aliq, tese: 'EXCLUSAO_ICMS_TEMA69' })
          }
        }
      }
      const icmsST = []
      if (regime === 'Lucro Real') {
        for (const item of itensEntrada) {
          if (item.vST > 0) icmsST.push({ ...item, credito: item.vST * 0.0925, tese: 'ICMS_ST' })
        }
      }
      const retencoes = []
      if (regime === 'Simples Nacional') {
        for (const nota of notasXML) {
          if ((nota.totalPIS > 0 || nota.totalCOFINS > 0) && nota.crt === '1')
            retencoes.push({ nNF: nota.nNF, competencia: nota.competencia, credito: nota.totalPIS + nota.totalCOFINS, tese: 'RETENCAO_INDEVIDA' })
        }
      }
      const totalCreditoXML = monofasicos.reduce((s, o) => s + o.credito, 0) + exclusaoICMS.reduce((s, o) => s + o.credito, 0) + icmsST.reduce((s, o) => s + o.credito, 0) + retencoes.reduce((s, o) => s + o.credito, 0)
      const totalCredito = totalCreditoXML + (pgdasConsolidado?.diferenca_total || 0)
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
      setResultado({ totalNotas: notasXML.length, entradas: entradas.length, saidas: saidas.length, competencias, resumoCompetencias, monofasicos, exclusaoICMS, icmsST, retencoes, totalCredito, notasRaw: notasXML, pgdas: pgdasConsolidado })
      setEtapa('resultado')
    } catch (e) {
      setErro(e.message)
      setEtapa('inicio')
    }
  }

  async function analisarComIA() {
    if (!resultado) return
    setLoadingIA(true)
    setErroIA('')
    setParecerIA(null)
    setMostrarChat(false)
    try {
      const prompt = montarContextoIA(resultado, cliente, regime)
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(`https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: 'llama-3.3-70b-versatile' }),
      })
      if (!resp.ok) throw new Error('Erro na chamada à IA')
      const json = await resp.json()
      const resposta = json.resposta || json.content || json.message || ''
      if (!resposta) throw new Error('Resposta vazia da IA')
      setParecerIA(resposta)
      setMensagensChat([{ role: 'assistant', content: resposta }])
    } catch (e) {
      setErroIA('Erro ao consultar IA: ' + e.message)
    } finally {
      setLoadingIA(false)
    }
  }

  async function enviarMensagemChat() {
    if (!inputChat.trim() || loadingChat) return
    const novaMensagem = { role: 'user', content: inputChat.trim() }
    const novasMensagens = [...mensagensChat, novaMensagem]
    setMensagensChat(novasMensagens)
    setInputChat('')
    setLoadingChat(true)
    try {
      const contextoResumido = `Contexto fiscal: Cliente ${cliente?.razao_social}, regime ${regime}, potencial ${fmtR(resultado?.totalCredito || 0)}.`
      const histFormatado = novasMensagens.map(m => `${m.role === 'user' ? 'Contador' : 'Especialista'}: ${m.content}`).join('\n\n')
      const promptChat = `Você é um especialista em direito tributário brasileiro.\n${contextoResumido}\n\n${histFormatado}\n\nResponda à última pergunta do Contador.`
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(`https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: promptChat }], model: 'llama-3.3-70b-versatile' }),
      })
      if (!resp.ok) throw new Error('Erro na chamada à IA')
      const json = await resp.json()
      setMensagensChat(prev => [...prev, { role: 'assistant', content: json.resposta || json.content || '' }])
    } catch (e) {
      setMensagensChat(prev => [...prev, { role: 'assistant', content: 'Erro ao obter resposta. Tente novamente.' }])
    } finally {
      setLoadingChat(false)
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
          cliente_id: clienteId, usuario_id: user.id,
          competencia: comp.competencia, tributo: 'PIS/COFINS',
          receita_bruta: comp.receita_bruta, receita_tributada: comp.receita_tributada,
          receita_monofasica: comp.receita_monofasica, tributo_pago: comp.tributo_pago,
          tributo_devido: comp.tributo_devido, credito: creditoComp,
          nfes_analisadas: comp.nfes_analisadas, periodo_inicio: comp.periodo_inicio,
          periodo_fim: comp.periodo_fim,
          tipo_oportunidade: resultado.monofasicos.length > 0 ? 'MONOFASICO' : resultado.exclusaoICMS.length > 0 ? 'EXCLUSAO_ICMS' : 'SEM_OPORTUNIDADE',
          risco: 'baixo',
          documentos: JSON.stringify({ nfes: resultado.totalNotas, pgdas: resultado.pgdas ? resultado.pgdas.arquivos : [] }),
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }
      for (const nota of resultado.notasRaw) {
        const teses = []
        if (nota.itens.some(i => NCM_MONOFASICOS[i.ncm?.substring(0, 8)])) teses.push(regime === 'Simples Nacional' ? 'SEGREGACAO_MONOFASICO' : 'MONOFASICO')
        if (nota.totalICMS > 0 && (regime === 'Lucro Presumido' || regime === 'Lucro Real')) teses.push('EXCLUSAO_ICMS_TEMA69')
        if (nota.totalST > 0 && regime === 'Lucro Real') teses.push('ICMS_ST')
        if ((nota.totalPIS > 0 || nota.totalCOFINS > 0) && nota.crt === '1' && regime === 'Simples Nacional') teses.push('RETENCAO_INDEVIDA')
        const creditoNota = teses.includes('MONOFASICO') ? nota.totalPIS + nota.totalCOFINS :
          teses.includes('EXCLUSAO_ICMS_TEMA69') ? nota.totalICMS * (regime === 'Lucro Real' ? 0.0925 : 0.0365) :
          teses.includes('RETENCAO_INDEVIDA') ? nota.totalPIS + nota.totalCOFINS : 0
        try {
          await supabase.from('entradas_nfe').upsert({
            cliente_id: clienteId, usuario_id: user.id,
            chave_nfe: nota.chNFe || null, numero_nf: nota.nNF, serie: nota.serie || '1',
            emitente_nome: nota.emitNome, emitente_cnpj: nota.emitCNPJ,
            competencia: nota.competencia, data_emissao: nota.dhEmi || nota.competencia + '-01',
            tipo: nota.tipo, crt: nota.crt,
            valor_produtos: nota.totalProd, valor_pis: nota.totalPIS,
            valor_cofins: nota.totalCOFINS, valor_icms: nota.totalICMS,
            valor_st: nota.totalST, teses_identificadas: teses, credito_identificado: creditoNota,
          }, { onConflict: 'chave_nfe', ignoreDuplicates: true })
        } catch (e) { console.warn('NF-e duplicada:', e) }
      }
      await carregarHistorico()
      setEtapa('inicio'); setResultado(null); setArquivos([]); setAba('historico')
      setParecerIA(null); setMensagensChat([])
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally { setSalvando(false) }
  }

  async function excluirEntrada(id) {
    if (!window.confirm('Excluir este registro?')) return
    await supabase.from('entradas').delete().eq('id', id)
    await carregarHistorico()
  }

  async function excluirNFe(id) {
    if (!window.confirm('Excluir esta NF-e?')) return
    await supabase.from('entradas_nfe').delete().eq('id', id)
    await carregarHistorico()
  }

  function imprimirRelatorio(dados, entradas) {
    const totalCredito = entradas.reduce((s, e) => s + (e.credito || e.credito_identificado || 0), 0)
    const totalReceita = entradas.reduce((s, e) => s + (e.receita_bruta || e.valor_produtos || 0), 0)
    const totalPago = entradas.reduce((s, e) => s + (e.tributo_pago || ((e.valor_pis || 0) + (e.valor_cofins || 0)) || 0), 0)
    const teses = [...new Set(entradas.map(e => e.tipo_oportunidade || (e.teses_identificadas?.[0])).filter(Boolean))]
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatorio Fiscal</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1E293B;background:#fff}.header{background:#0B1F4D;color:#fff;padding:20px 28px;margin-bottom:20px}.header h1{font-size:18px;font-weight:900;margin-bottom:4px}.header p{font-size:11px;color:#93c5fd}.section{margin:0 28px 20px}.section-title{font-size:12px;font-weight:700;color:#0B1F4D;border-bottom:2px solid #0B1F4D;padding-bottom:4px;margin-bottom:10px}.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}.kpi-valor{font-size:16px;font-weight:800;color:#0B1F4D}.kpi-label{font-size:9px;color:#64748B;margin-top:2px}.potencial{background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:16px 20px;text-align:center;margin-bottom:16px}.potencial-valor{font-size:28px;font-weight:900;color:#16a34a}.potencial-label{font-size:10px;color:#64748B;margin-bottom:4px;font-weight:700;letter-spacing:1px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;border-bottom:1px solid #e2e8f0}td{padding:6px 8px;border-bottom:1px solid #f1f5f9}.tese-card{border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-bottom:8px}.tese-nome{font-size:12px;font-weight:700;color:#0B1F4D;margin-bottom:4px}.tese-fund{font-size:10px;color:#64748B;line-height:1.5}.footer{margin:20px 28px 0;border-top:1px solid #e2e8f0;padding-top:10px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}.verde{color:#16a34a;font-weight:700}.aviso{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;font-size:10px;color:#92400e;margin-bottom:16px}.btn-bar{position:fixed;top:12px;right:16px;z-index:999;display:flex;gap:8px}.btn-print{padding:8px 16px;background:#0B1F4D;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer}.btn-close{padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer}@media print{.btn-bar{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:10mm;size:A4}}</style></head><body>
<div class="btn-bar"><button class="btn-print" onclick="window.print()">Imprimir</button><button class="btn-close" onclick="window.close()">Fechar</button></div>
<div class="header"><div style="font-size:9px;color:#7CC4FF;font-weight:700;letter-spacing:2px;margin-bottom:6px">FISCALTRIB - RELATORIO DE DIAGNOSTICO TRIBUTARIO</div><h1>${cliente?.razao_social || '—'}</h1><p>CNPJ: ${cliente?.cnpj || '—'} - Regime: ${regime} - ${cliente?.municipio || '—'}/${cliente?.uf || '—'}</p><p style="margin-top:4px">Data: ${new Date().toLocaleDateString('pt-BR')} - Gerado pelo FiscalTrib</p></div>
<div class="section"><div class="section-title">1. RESUMO EXECUTIVO</div><div class="potencial"><div class="potencial-label">POTENCIAL TOTAL DE RECUPERACAO IDENTIFICADO</div><div class="potencial-valor">${fmtR(totalCredito)}</div><div style="font-size:10px;color:#64748B;margin-top:4px">Estimativa baseada nos documentos analisados - Sujeito a validacao profissional</div></div><div class="grid-4"><div class="kpi"><div class="kpi-valor">${entradas.length}</div><div class="kpi-label">Registros analisados</div></div><div class="kpi"><div class="kpi-valor">${fmtR(totalReceita)}</div><div class="kpi-label">Receita bruta total</div></div><div class="kpi"><div class="kpi-valor">${fmtR(totalPago)}</div><div class="kpi-label">Tributos pagos</div></div><div class="kpi"><div class="kpi-valor">${teses.length}</div><div class="kpi-label">Teses identificadas</div></div></div></div>
<div class="section"><div class="section-title">2. TESES TRIBUTARIAS IDENTIFICADAS</div>${teses.length > 0 ? teses.map(t => `<div class="tese-card"><div class="tese-nome">${t === 'MONOFASICO' ? 'Monofasicos PIS/COFINS' : t === 'SEGREGACAO_MONOFASICO' ? 'Segregacao Monofasicos' : t === 'EXCLUSAO_ICMS_TEMA69' ? 'Exclusao ICMS - STF Tema 69' : t === 'ICMS_ST' ? 'Credito ICMS-ST' : t === 'RETENCAO_INDEVIDA' ? 'Retencoes Indevidas' : t === 'PGDAS_SEGREGACAO' ? 'PGDAS-D - Segregacao Incorreta' : t}</div><div class="tese-fund">${FUNDAMENTACAO[t] || ''}</div></div>`).join('') : '<div style="color:#64748B">Nenhuma tese identificada.</div>'}</div>
<div class="section"><div class="section-title">3. ANALISE POR COMPETENCIA</div><table><thead><tr><th>Competencia</th><th>NF-e</th><th>Receita Bruta</th><th>Tributos Pagos</th><th>Rec. Monofasica</th><th>Credito</th><th>Oportunidade</th></tr></thead><tbody>${entradas.map(e => `<tr><td style="font-weight:600">${e.competencia || '—'}</td><td>${e.nfes_analisadas || '1'}</td><td>${fmtR(e.receita_bruta || e.valor_produtos)}</td><td>${fmtR(e.tributo_pago || ((e.valor_pis || 0) + (e.valor_cofins || 0)))}</td><td class="${(e.receita_monofasica || 0) > 0 ? 'verde' : ''}">${fmtR(e.receita_monofasica || 0)}</td><td class="${(e.credito || e.credito_identificado || 0) > 0 ? 'verde' : ''}">${fmtR(e.credito || e.credito_identificado || 0)}</td><td>${e.tipo_oportunidade || (e.teses_identificadas?.join(', ')) || '—'}</td></tr>`).join('')}<tr style="background:#f0fdf4;font-weight:700"><td>TOTAL</td><td>—</td><td>${fmtR(totalReceita)}</td><td>${fmtR(totalPago)}</td><td>—</td><td class="verde">${fmtR(totalCredito)}</td><td>—</td></tr></tbody></table></div>
<div class="section"><div class="section-title">4. PROXIMOS PASSOS</div><table><thead><tr><th>#</th><th>Acao</th><th>Prazo</th><th>Responsavel</th></tr></thead><tbody><tr><td>1</td><td>Validar NF-e com produtos monofasicos</td><td>15 dias</td><td>Contador</td></tr><tr><td>2</td><td>Levantar recolhimentos dos ultimos 5 anos</td><td>30 dias</td><td>Contador</td></tr><tr><td>3</td><td>Elaborar PER/DCOMP ou pedido de restituicao</td><td>60 dias</td><td>Advogado Tributario</td></tr><tr><td>4</td><td>Protocolar junto a Receita Federal</td><td>90 dias</td><td>Advogado Tributario</td></tr></tbody></table></div>
<div class="section"><div class="aviso">Estimativa preliminar gerada pelo FiscalTrib. Nao substitui analise profissional habilitada.</div></div>
<div class="footer"><span>FiscalTrib - fiscaltrib.com.br</span><span>Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}</span></div>
</body></html>`
    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()
  }

  if (!clienteId) return (
    <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Selecione um cliente para iniciar o diagnóstico</div>
      <div style={{ fontSize: 13 }}>Use o seletor de cliente no menu lateral</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>

      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 16, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>FISCALTRIB — DIAGNÓSTICO TRIBUTÁRIO</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>🔎 {cliente?.razao_social}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{regime}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{cliente?.cnpj}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{cliente?.municipio}/{cliente?.uf}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => onNavegar('painel')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 13, cursor: 'pointer' }}>
          ← Voltar ao Painel
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        {[['novo', '🔍 Novo Diagnóstico'], ['historico', `📋 Histórico (${historico.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba === id ? 700 : 400, color: aba === id ? C.navy : C.muted, background: 'none', border: 'none', borderBottom: `2px solid ${aba === id ? C.navy : 'transparent'}`, marginBottom: -2, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'novo' && <>
        {etapa === 'inicio' && (
          <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>📂 Importar documentos fiscais</div>
            <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
              style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>Arraste ou clique para selecionar</div>
              <div style={{ fontSize: 13, color: C.muted }}>XML de NF-e · CSV · PDF (PGDAS-D, SPED)</div>
              <input ref={inputRef} type="file" multiple accept=".xml,.csv,.pdf" onChange={onDrop} style={{ display: 'none' }} />
            </div>
            {arquivos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {arquivos.map((arq, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{arq.tipo === 'xml' ? '📄' : arq.tipo === 'csv' ? '📊' : '📑'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{arq.nome}</span>
                      <span style={{ background: arq.tipo === 'pdf' ? '#fff7ed' : '#eff6ff', color: arq.tipo === 'pdf' ? C.orange : '#2563eb', border: `1px solid ${arq.tipo === 'pdf' ? '#fed7aa' : '#bfdbfe'}`, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                        {arq.tipo === 'pdf' ? 'PDF — PGDAS-D' : arq.tipo.toUpperCase()}
                      </span>
                    </div>
                    <button onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>⚠️ {erro}</div>}
            <button onClick={analisar} disabled={arquivos.length === 0}
              style={{ width: '100%', padding: 14, background: arquivos.length > 0 ? C.navy : C.border, color: C.white, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: arquivos.length > 0 ? 'pointer' : 'not-allowed', marginBottom: 20 }}>
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
                  { icon: '📋', tese: 'PGDAS-D Segregação', regimes: ['Simples Nacional'] },
                ].map((t, i) => {
                  const aplicavel = t.regimes.includes(regime)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: aplicavel ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: `1px solid ${aplicavel ? '#86efac' : C.border}` }}>
                      <span>{t.icon}</span>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: aplicavel ? C.green : C.muted }}>{t.tese}</div></div>
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
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Cruzando NCMs, competências e teses tributárias</div>
            {loadingPGDAS && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: C.orange, display: 'inline-block' }}>
                Extraindo dados do PGDAS-D via IA...
              </div>
            )}
          </div>
        )}

        {etapa === 'resultado' && resultado && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'NF-e analisadas', valor: resultado.totalNotas, cor: '#2563eb' },
                { label: 'Entradas', valor: resultado.entradas, cor: '#16a34a' },
                { label: 'Saídas', valor: resultado.saidas, cor: '#7c3aed' },
                { label: resultado.pgdas ? 'PDFs PGDAS' : 'Competências', valor: resultado.pgdas ? resultado.pgdas.arquivos.length : resultado.competencias.length, cor: '#0891b2' },
              ].map((k, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Potencial total */}
            <div style={{ background: resultado.totalCredito > 0 ? '#f0fdf4' : '#f8fafc', border: `2px solid ${resultado.totalCredito > 0 ? '#86efac' : C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>POTENCIAL TOTAL DE RECUPERAÇÃO</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: resultado.totalCredito > 0 ? C.green : C.muted }}>{fmtR(resultado.totalCredito)}</div>
              {resultado.totalCredito === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Nenhuma oportunidade identificada</div>}
            </div>

            {/* DIAGNÓSTICO NARRATIVO */}
            <DiagnosticoNarrativo resultado={resultado} regime={regime} />

            {/* PAINEL PGDAS */}
            {resultado.pgdas && (
              <div style={{ background: C.white, borderRadius: 14, border: `2px solid ${resultado.pgdas.diferenca_total > 0 ? '#fed7aa' : C.border}`, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.orange }}>📋 PGDAS-D — Dados Extraídos</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Receita Bruta Total', valor: fmtR(resultado.pgdas.receita_bruta_total), cor: C.text },
                    { label: 'Receita Monofásica', valor: fmtR(resultado.pgdas.receita_monofasica), cor: resultado.pgdas.receita_monofasica > 0 ? C.green : C.muted },
                    { label: 'DAS Recolhido', valor: fmtR(resultado.pgdas.das_recolhido), cor: C.text },
                    { label: 'DAS Correto Estimado', valor: fmtR(resultado.pgdas.das_correto_estimado), cor: C.green },
                    { label: 'Diferença (Recuperável)', valor: fmtR(resultado.pgdas.diferenca_total), cor: resultado.pgdas.diferenca_total > 0 ? C.orange : C.muted },
                    { label: 'Segregou Monofásicos', valor: resultado.pgdas.segregou_monofasicos ? 'Sim' : 'NAO', cor: resultado.pgdas.segregou_monofasicos ? C.green : C.red },
                  ].map((k, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    </div>
                  ))}
                </div>
                {resultado.pgdas.competencias && resultado.pgdas.competencias.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>DETALHAMENTO POR COMPETÊNCIA</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Período', 'Receita Bruta', 'Rec. Monofásica', 'DAS Recolhido', 'DAS Correto', 'Diferença'].map(h => (
                            <th key={h} style={thStyle()}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.pgdas.competencias.map((c, i) => {
                          const dif = Math.max(0, (c.das_recolhido || 0) - (c.das_correto_estimado || 0))
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={tdStyle({ fontWeight: 600 })}>{c.periodo}</td>
                              <td style={tdStyle()}>{fmtR(c.receita_bruta)}</td>
                              <td style={tdStyle({ color: (c.receita_monofasica || 0) > 0 ? C.green : C.muted })}>{fmtR(c.receita_monofasica)}</td>
                              <td style={tdStyle()}>{fmtR(c.das_recolhido)}</td>
                              <td style={tdStyle({ color: C.green })}>{fmtR(c.das_correto_estimado)}</td>
                              <td style={tdStyle({ fontWeight: 700, color: dif > 0 ? C.orange : C.muted })}>{fmtR(dif)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {erroPGDAS && (
                  <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 12 }}>
                    ⚠️ {erroPGDAS}
                  </div>
                )}
              </div>
            )}

            {/* BLOCO IA */}
            <div style={{ background: '#0B1F4D', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>🤖 Inteligência Tributária</div>
                  <div style={{ fontSize: 12, color: '#93c5fd' }}>Parecer jurídico automático · Estratégia · Alertas de prazo · Perguntas ao cliente</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {parecerIA && (
                    <button onClick={() => setMostrarChat(v => !v)}
                      style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {mostrarChat ? '📄 Ver Parecer' : '💬 Chat Tributário'}
                    </button>
                  )}
                  <button onClick={analisarComIA} disabled={loadingIA}
                    style={{ padding: '10px 20px', background: loadingIA ? 'rgba(255,255,255,0.2)' : '#fff', color: loadingIA ? '#93c5fd' : C.navy, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: loadingIA ? 'not-allowed' : 'pointer', opacity: loadingIA ? 0.8 : 1 }}>
                    {loadingIA ? 'Analisando...' : parecerIA ? '🔄 Reanalisar' : '🤖 Analisar com IA'}
                  </button>
                </div>
              </div>
              {erroIA && <div style={{ marginTop: 12, background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 12 }}>⚠️ {erroIA}</div>}
              {loadingIA && (
                <div style={{ marginTop: 16, textAlign: 'center', color: '#93c5fd', fontSize: 13 }}>
                  <div style={{ marginBottom: 8 }}>Consultando especialista tributário...</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {['Analisando teses', 'Verificando prazos', 'Elaborando estratégia'].map((t, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 99, fontSize: 11 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {parecerIA && !loadingIA && (
                <div style={{ marginTop: 16 }}>
                  {!mostrarChat && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ color: '#e2e8f0' }}>{renderMarkdown(parecerIA)}</div>
                    </div>
                  )}
                  {mostrarChat && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: 360, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {mensagensChat.map((msg, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ maxWidth: '80%', background: msg.role === 'user' ? '#2563eb' : 'rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '10px 14px', fontSize: 12, lineHeight: 1.6 }}>
                              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                            </div>
                          </div>
                        ))}
                        {loadingChat && (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', fontSize: 12, color: '#93c5fd' }}>Consultando...</div>
                          </div>
                        )}
                        <div ref={chatFimRef} />
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', display: 'flex', gap: 8 }}>
                        <input value={inputChat} onChange={e => setInputChat(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagemChat()}
                          placeholder="Pergunte sobre o diagnóstico..."
                          style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
                        <button onClick={enviarMensagemChat} disabled={loadingChat || !inputChat.trim()}
                          style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loadingChat || !inputChat.trim() ? 'not-allowed' : 'pointer', opacity: loadingChat || !inputChat.trim() ? 0.6 : 1 }}>
                          Enviar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NF-e analisadas */}
            {resultado.notasRaw.length > 0 && (
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>📄 NF-e Analisadas</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['NF', 'Emitente', 'CNPJ', 'Competência', 'Tipo', 'Valor', 'PIS', 'COFINS', 'ICMS'].map(h => (
                        <th key={h} style={thStyle()}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.notasRaw.map((n, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle({ fontWeight: 600 })}>{n.nNF || '—'}</td>
                        <td style={tdStyle()}>{n.emitNome || '—'}</td>
                        <td style={tdStyle({ color: C.muted })}>{fmtCNPJ(n.emitCNPJ)}</td>
                        <td style={tdStyle()}>{n.competencia}</td>
                        <td style={tdStyle()}>
                          <span style={{ background: n.tipo === 'entrada' ? '#f0fdf4' : '#eff6ff', color: n.tipo === 'entrada' ? C.green : '#2563eb', padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
                            {n.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td style={tdStyle()}>{fmtR(n.totalProd)}</td>
                        <td style={tdStyle()}>{fmtR(n.totalPIS)}</td>
                        <td style={tdStyle()}>{fmtR(n.totalCOFINS)}</td>
                        <td style={tdStyle()}>{fmtR(n.totalICMS)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Teses XML */}
            {[
              { lista: resultado.monofasicos, titulo: '💊 Monofásicos PIS/COFINS', cor: '#7c3aed', campos: ['produto', 'ncm', 'vProd', 'credito'] },
              { lista: resultado.exclusaoICMS, titulo: '⚖️ Exclusão ICMS — STF Tema 69', cor: '#0891b2', campos: ['competencia', 'vICMS', 'credito'] },
              { lista: resultado.icmsST, titulo: '🔄 Crédito ICMS-ST', cor: '#ea580c', campos: ['produto', 'vST', 'credito'] },
              { lista: resultado.retencoes, titulo: '🚫 Retenções Indevidas', cor: '#dc2626', campos: ['nNF', 'competencia', 'credito'] },
            ].map((grupo, gi) => grupo.lista.length > 0 && (
              <div key={gi} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: grupo.cor, marginBottom: 8 }}>{grupo.titulo}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {grupo.campos.map(h => (
                        <th key={h} style={thStyle()}>
                          {h === 'produto' ? 'Produto' : h === 'ncm' ? 'NCM' : h === 'vProd' ? 'Valor' : h === 'credito' ? 'Crédito' : h === 'competencia' ? 'Competência' : h === 'vICMS' ? 'ICMS' : h === 'vST' ? 'ICMS-ST' : h === 'nNF' ? 'NF' : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.lista.slice(0, 10).map((o, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {grupo.campos.map(campo => (
                          <td key={campo} style={tdStyle({ fontWeight: campo === 'credito' ? 700 : 400, color: campo === 'credito' ? C.green : C.text })}>
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

            {/* Por Competência */}
            {resultado.resumoCompetencias.length > 0 && (
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>📅 Por Competência</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Competência', 'NF-e', 'Receita', 'PIS/COFINS Pago', 'Monofásico', 'Crédito'].map(h => (
                        <th key={h} style={thStyle()}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.resumoCompetencias.map((comp, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle({ fontWeight: 600 })}>{comp.competencia}</td>
                        <td style={tdStyle()}>{comp.nfes_analisadas}</td>
                        <td style={tdStyle()}>{fmtR(comp.receita_bruta)}</td>
                        <td style={tdStyle()}>{fmtR(comp.tributo_pago)}</td>
                        <td style={tdStyle({ color: comp.receita_monofasica > 0 ? C.green : C.muted })}>{fmtR(comp.receita_monofasica)}</td>
                        <td style={tdStyle({ color: comp.credito > 0 ? C.green : C.muted, fontWeight: comp.credito > 0 ? 700 : 400 })}>{fmtR(comp.credito)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>⚠️ {erro}</div>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => imprimirRelatorio(resultado, resultado.resumoCompetencias)}
                style={{ flex: 1, padding: 12, background: '#f0fdf4', color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Imprimir
              </button>
              <button onClick={() => { setEtapa('inicio'); setResultado(null); setArquivos([]); setParecerIA(null); setMensagensChat([]) }}
                style={{ flex: 1, padding: 12, background: C.white, color: C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ← Nova análise
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ flex: 2, padding: 12, background: C.navy, color: C.white, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : '✅ Salvar diagnóstico'}
              </button>
            </div>
          </>
        )}
      </>}

      {aba === 'historico' && (
        <div>
          {loadingHistorico ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Carregando...</div>
          ) : historico.length === 0 && historicoNFes.length === 0 ? (
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Nenhum diagnóstico salvo</div>
              <button onClick={() => setAba('novo')} style={{ padding: '10px 20px', background: C.navy, color: C.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Novo Diagnóstico</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Competências salvas', valor: historico.length, cor: '#2563eb' },
                  { label: 'Potencial total', valor: fmtR(historico.reduce((s, e) => s + (e.credito || 0), 0)), cor: C.green },
                  { label: 'NF-e registradas', valor: historicoNFes.length, cor: '#7c3aed' },
                ].map((k, i) => (
                  <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: i === 1 ? 16 : 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => imprimirRelatorio(null, historico)}
                  style={{ padding: '10px 20px', background: '#f0fdf4', color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Imprimir Relatório Completo
                </button>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                {[['competencias', `📅 Por Competência (${historico.length})`], ['nfes', `📄 NF-e Registradas (${historicoNFes.length})`]].map(([id, label]) => (
                  <button key={id} onClick={() => setAbaHistorico(id)}
                    style={{ padding: '8px 16px', fontSize: 12, fontWeight: abaHistorico === id ? 700 : 400, color: abaHistorico === id ? C.navy : C.muted, background: 'none', border: 'none', borderBottom: `2px solid ${abaHistorico === id ? C.navy : 'transparent'}`, marginBottom: -1, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
              {abaHistorico === 'competencias' && (
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Competência', 'Tributo', 'Receita Bruta', 'Pago', 'Monofásico', 'Crédito', 'Oportunidade', 'Risco', ''].map(h => (
                          <th key={h} style={thStyle()}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((e, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={tdStyle({ fontWeight: 600 })}>{e.competencia}</td>
                          <td style={tdStyle()}>{e.tributo}</td>
                          <td style={tdStyle()}>{fmtR(e.receita_bruta)}</td>
                          <td style={tdStyle()}>{fmtR(e.tributo_pago)}</td>
                          <td style={tdStyle({ color: e.receita_monofasica > 0 ? C.green : C.muted })}>{fmtR(e.receita_monofasica)}</td>
                          <td style={tdStyle({ fontWeight: 700, color: e.credito > 0 ? C.green : C.muted })}>{fmtR(e.credito)}</td>
                          <td style={tdStyle()}>
                            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{e.tipo_oportunidade || '—'}</span>
                          </td>
                          <td style={tdStyle()}>
                            <span style={{ background: e.risco === 'baixo' ? '#f0fdf4' : '#fef2f2', color: e.risco === 'baixo' ? C.green : C.red, padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{e.risco}</span>
                          </td>
                          <td style={tdStyle()}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => imprimirRelatorio(null, [e])} style={{ padding: '3px 8px', background: '#f0fdf4', color: C.green, border: `1px solid ${C.green}`, borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>impr.</button>
                              <button onClick={() => excluirEntrada(e.id)} style={{ padding: '3px 8px', background: '#fef2f2', color: C.red, border: '1px solid #fecaca', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>excl.</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {abaHistorico === 'nfes' && (
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['NF', 'Emitente', 'CNPJ Emitente', 'Competência', 'Tipo', 'Valor', 'PIS', 'COFINS', 'Crédito', 'Teses', ''].map(h => (
                          <th key={h} style={thStyle()}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historicoNFes.map((n, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={tdStyle({ fontWeight: 600 })}>{n.numero_nf || '—'}</td>
                          <td style={tdStyle()}>{n.emitente_nome || '—'}</td>
                          <td style={tdStyle({ color: C.muted })}>{fmtCNPJ(n.emitente_cnpj)}</td>
                          <td style={tdStyle()}>{n.competencia}</td>
                          <td style={tdStyle()}>
                            <span style={{ background: n.tipo === 'entrada' ? '#f0fdf4' : '#eff6ff', color: n.tipo === 'entrada' ? C.green : '#2563eb', padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
                              {n.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td style={tdStyle()}>{fmtR(n.valor_produtos)}</td>
                          <td style={tdStyle()}>{fmtR(n.valor_pis)}</td>
                          <td style={tdStyle()}>{fmtR(n.valor_cofins)}</td>
                          <td style={tdStyle({ fontWeight: 700, color: n.credito_identificado > 0 ? C.green : C.muted })}>{fmtR(n.credito_identificado)}</td>
                          <td style={tdStyle()}>
                            {(n.teses_identificadas || []).length > 0
                              ? n.teses_identificadas.map((t, ti) => (
                                <span key={ti} style={{ background: '#f0fdf4', color: C.green, padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 600, marginRight: 2 }}>{t}</span>
                              ))
                              : <span style={{ color: C.muted }}>—</span>
                            }
                          </td>
                          <td style={tdStyle()}>
                            <button onClick={() => excluirNFe(n.id)} style={{ padding: '3px 8px', background: '#fef2f2', color: C.red, border: '1px solid #fecaca', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>excl.</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}