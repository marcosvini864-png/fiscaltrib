import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../supabase';

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', bg: '#F8FAFC',
  text: '#0F172A', muted: '#334155', ghost: '#64748B',
  border: '#E2E8F0', tableHeader: '#4B5563', white: '#FFFFFF',
};

function formatBRL(v) {
  if (v == null || isNaN(v)) return 'R$ —';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatPct(v) {
  if (v == null || isNaN(v)) return '—';
  return (v * 100).toFixed(4) + '%';
}
function hoje() {
  return new Date().toLocaleDateString('pt-BR');
}

function parsearXMLNFe(xmlText) {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const get = (el, tag) => el?.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() || '';
    const ide   = doc.getElementsByTagNameNS('*', 'ide')[0];
    const emit  = doc.getElementsByTagNameNS('*', 'emit')[0];
    const dest  = doc.getElementsByTagNameNS('*', 'dest')[0];
    const total = doc.getElementsByTagNameNS('*', 'ICMSTot')[0];
    if (!ide || !total) return null;
    if (get(ide, 'tpNF') === '0') return null;
    const dhEmi = get(ide, 'dhEmi') || get(ide, 'dEmi') || '';
    const dataEmissao = dhEmi.substring(0, 10);
    if (!dataEmissao) return null;
    const competencia = dataEmissao.substring(0, 7);
    const nNF     = get(ide, 'nNF');
    const nomeEmit= get(emit, 'xNome');
    const cnpjEmit= get(emit, 'CNPJ');
    const nomeDest= get(dest, 'xNome');
    const cnpjDest= get(dest, 'CNPJ') || get(dest, 'CPF');
    const vNF     = parseFloat(get(total, 'vNF')     || '0');
    const vICMS   = parseFloat(get(total, 'vICMS')   || '0');
    const vPIS    = parseFloat(get(total, 'vPIS')    || '0');
    const vCOFINS = parseFloat(get(total, 'vCOFINS') || '0');
    if (vNF <= 0) return null;
    const baseSemICMS   = Math.max(0, vNF - vICMS);
    const aliqPIS       = vNF > 0 ? vPIS    / vNF : 0;
    const aliqCOFINS    = vNF > 0 ? vCOFINS / vNF : 0;
    const pisCorreto    = baseSemICMS * aliqPIS;
    const cofinsCorreto = baseSemICMS * aliqCOFINS;
    const creditoPIS    = Math.max(0, vPIS    - pisCorreto);
    const creditoCOFINS = Math.max(0, vCOFINS - cofinsCorreto);
    const creditoTotal  = creditoPIS + creditoCOFINS;
    return {
      nNF, dataEmissao, competencia, nomeEmit, cnpjEmit, nomeDest, cnpjDest,
      vNF, vICMS, vPIS, vCOFINS, baseSemICMS, aliqPIS, aliqCOFINS,
      pisCorreto, cofinsCorreto, creditoPIS, creditoCOFINS, creditoTotal,
    };
  } catch { return null; }
}

function agruparPorCompetencia(notas) {
  const map = {};
  notas.forEach(n => {
    if (!map[n.competencia]) map[n.competencia] = {
      competencia: n.competencia, qtdNF: 0,
      vNF: 0, vICMS: 0, vPIS: 0, vCOFINS: 0,
      baseSemICMS: 0, pisCorreto: 0, cofinsCorreto: 0,
      creditoPIS: 0, creditoCOFINS: 0, creditoTotal: 0,
    };
    const c = map[n.competencia];
    c.qtdNF++; c.vNF += n.vNF; c.vICMS += n.vICMS;
    c.vPIS += n.vPIS; c.vCOFINS += n.vCOFINS;
    c.baseSemICMS += n.baseSemICMS; c.pisCorreto += n.pisCorreto;
    c.cofinsCorreto += n.cofinsCorreto; c.creditoPIS += n.creditoPIS;
    c.creditoCOFINS += n.creditoCOFINS; c.creditoTotal += n.creditoTotal;
  });
  return Object.values(map).sort((a, b) => a.competencia.localeCompare(b.competencia));
}

// ── Componente Relatório Profissional ──────────────────────────────────────
function RelatorioProfissional({ notas, cliente, perfil }) {
  const competencias  = agruparPorCompetencia(notas);
  const totalCredito  = notas.reduce((s, n) => s + n.creditoTotal,   0);
  const totalPIS      = notas.reduce((s, n) => s + n.creditoPIS,     0);
  const totalCOFINS   = notas.reduce((s, n) => s + n.creditoCOFINS,  0);
  const totalICMS     = notas.reduce((s, n) => s + n.vICMS,          0);
  const totalNF       = notas.reduce((s, n) => s + n.vNF,            0);
  const [expandida, setExpandida] = useState(null);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: S.text, maxWidth: 900, margin: '0 auto' }}>

      {/* ── CAPA ── */}
      <div style={{ background: S.navy, borderRadius: 14, padding: '32px 36px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(37,99,235,0.2)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(22,163,74,0.15)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          {/* Logo do escritório */}
          <div>
            {perfil?.logo_url
              ? <img src={perfil.logo_url} alt="Logo" style={{ height: 56, objectFit: 'contain', borderRadius: 8 }} />
              : <div style={{ height: 56, width: 160, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Logo do Escritório</span>
                </div>
            }
            {perfil?.nome_escritorio && <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 8 }}>{perfil.nome_escritorio}</div>}
            {perfil?.crc && <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2 }}>{perfil.crc}</div>}
          </div>

          {/* Dados do escritório */}
          <div style={{ textAlign: 'right' }}>
            {perfil?.endereco && <div style={{ color: '#93c5fd', fontSize: 11, marginBottom: 3 }}>📍 {perfil.endereco}</div>}
            {perfil?.telefone && <div style={{ color: '#93c5fd', fontSize: 11, marginBottom: 3 }}>📞 {perfil.telefone}</div>}
            {perfil?.whatsapp && <div style={{ color: '#93c5fd', fontSize: 11, marginBottom: 3 }}>💬 {perfil.whatsapp}</div>}
            {perfil?.email    && <div style={{ color: '#93c5fd', fontSize: 11, marginBottom: 3 }}>✉️ {perfil.email}</div>}
            {perfil?.site     && <div style={{ color: '#93c5fd', fontSize: 11 }}>🌐 {perfil.site}</div>}
          </div>
        </div>

        {/* Título */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 20 }}>
          <div style={{ color: '#6EE7B7', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>PARECER TÉCNICO TRIBUTÁRIO</div>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 4, lineHeight: 1.2 }}>
            Exclusão do ICMS da Base de<br />Cálculo do PIS e da COFINS
          </div>
          <div style={{ color: '#93c5fd', fontSize: 13, marginBottom: 20 }}>RE 574.706 · STF Tema 69 · A Tese do Século</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'CONTRIBUINTE', value: cliente?.razao_social || '—' },
              { label: 'CNPJ', value: cliente?.cnpj || '—' },
              { label: 'REGIME', value: cliente?.regime || '—' },
              { label: 'PERÍODO ANALISADO', value: competencias.length > 0 ? `${competencias[0].competencia} a ${competencias[competencias.length-1].competencia}` : '—' },
              { label: 'NF-e ANALISADAS', value: notas.length },
              { label: 'DATA DO PARECER', value: hoje() },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ color: '#93c5fd', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>{item.label}</div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RESUMO EXECUTIVO ── */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 28, background: S.green, borderRadius: 2 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: S.navy }}>Resumo Executivo</div>
        </div>

        {/* KPIs destaque */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'CRÉDITO TOTAL RECUPERÁVEL', value: formatBRL(totalCredito), color: S.green, bg: '#F0FDF4', border: '#86efac', big: true },
            { label: 'CRÉDITO PIS', value: formatBRL(totalPIS), color: S.blue, bg: '#EFF6FF', border: '#bfdbfe' },
            { label: 'CRÉDITO COFINS', value: formatBRL(totalCOFINS), color: S.navy, bg: '#EFF6FF', border: '#bfdbfe' },
            { label: 'ICMS EXCLUÍDO DA BASE', value: formatBRL(totalICMS), color: S.orange, bg: '#FFF7ED', border: '#fed7aa' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: k.color, letterSpacing: 1.5, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: k.big ? 22 : 18, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.9, background: S.bg, borderRadius: 8, padding: '14px 18px' }}>
          A análise de <strong style={{ color: S.text }}>{notas.length} notas fiscais de saída</strong> emitidas pelo contribuinte
          identificou que o ICMS no valor de <strong style={{ color: S.orange }}>{formatBRL(totalICMS)}</strong> foi indevidamente
          incluído na base de cálculo do PIS e da COFINS, em afronta ao entendimento fixado pelo Supremo Tribunal Federal
          no julgamento do RE 574.706 (Tema 69), com repercussão geral reconhecida e efeito vinculante.
          O aproveitamento deste crédito resulta em um montante total de{' '}
          <strong style={{ color: S.green, fontSize: 15 }}>{formatBRL(totalCredito)}</strong> a ser recuperado,
          sendo <strong>{formatBRL(totalPIS)}</strong> referente ao PIS
          e <strong>{formatBRL(totalCOFINS)}</strong> referente à COFINS pagos a maior.
          O valor total das notas fiscais analisadas somou <strong>{formatBRL(totalNF)}</strong>,
          abrangendo <strong>{competencias.length} competências</strong>.
        </div>
      </div>

      {/* ── FUNDAMENTAÇÃO LEGAL ── */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 4, height: 28, background: S.blue, borderRadius: 2 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: S.navy }}>Fundamentação Legal</div>
        </div>
        {[
          {
            norma: 'RE 574.706 / STF Tema 69',
            tipo: 'SUPREMO TRIBUNAL FEDERAL',
            cor: S.green,
            desc: 'O ICMS não compõe a base de cálculo para fins de incidência do PIS e da COFINS. Decisão proferida em sede de repercussão geral, com efeito vinculante para todos os contribuintes e órgãos da Administração Pública.',
          },
          {
            norma: 'ADC 49 — Modulação dos Efeitos',
            tipo: 'SUPREMO TRIBUNAL FEDERAL',
            cor: S.blue,
            desc: 'Os efeitos da decisão foram modulados para alcançar fatos geradores ocorridos a partir de 15/03/2017, ressalvados os contribuintes que já possuíam ação judicial ou administrativa em curso antes dessa data.',
          },
          {
            norma: 'Lei 10.637/2002',
            tipo: 'LEGISLAÇÃO FEDERAL',
            cor: S.navy,
            desc: 'Institui o PIS não-cumulativo. Define que a base de cálculo é o total das receitas auferidas, sem a inclusão de tributos que não integram o faturamento do contribuinte.',
          },
          {
            norma: 'Lei 10.833/2003',
            tipo: 'LEGISLAÇÃO FEDERAL',
            cor: S.navy,
            desc: 'Institui a COFINS não-cumulativa. Aplica-se a mesma base de cálculo do PIS, excluindo do cômputo os valores de tributos de terceiros.',
          },
          {
            norma: 'IN RFB 2.055/2021',
            tipo: 'INSTRUÇÃO NORMATIVA',
            cor: S.muted,
            desc: 'Regulamenta os procedimentos de restituição, ressarcimento, reembolso e compensação de tributos federais, incluindo o PER/DCOMP como instrumento de aproveitamento do crédito reconhecido.',
          },
          {
            norma: 'CTN art. 168 / LC 118/2005',
            tipo: 'PRAZO PRESCRICIONAL',
            cor: S.red,
            desc: 'O direito à restituição ou compensação extingue-se no prazo de 5 (cinco) anos contados da data do pagamento indevido. Atenção ao prazo para não perder o direito ao crédito.',
          },
        ].map((item, i) => (
          <div key={item.norma} style={{ display: 'flex', gap: 0, marginBottom: 12, background: S.bg, borderRadius: 10, overflow: 'hidden', border: `1px solid ${S.border}` }}>
            <div style={{ width: 4, background: item.cor, flexShrink: 0 }} />
            <div style={{ padding: '12px 16px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: item.cor }}>{item.norma}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: item.cor, background: `${item.cor}15`, padding: '2px 8px', borderRadius: 20, letterSpacing: 1 }}>{item.tipo}</span>
              </div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── APURAÇÃO POR COMPETÊNCIA ── */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 4, height: 28, background: S.orange, borderRadius: 2 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: S.navy }}>Apuração por Competência</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.navy }}>
                {['Competência','NF-es','Valor Total','ICMS Excluído','Base s/ ICMS','PIS Pago','PIS Correto','Créd. PIS','COFINS Pago','COFINS Correto','Créd. COFINS','TOTAL'].map(h => (
                  <th key={h} style={{ color: '#fff', padding: '10px 10px', textAlign: h === 'Competência' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competencias.map((c, i) => (
                <tr key={c.competencia} style={{ background: i % 2 === 0 ? S.bg : S.white, borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: '9px 10px', fontWeight: 700, color: S.blue }}>{c.competencia}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{c.qtdNF}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vNF)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(c.vICMS)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.baseSemICMS)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vPIS)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.pisCorreto)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoPIS)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vCOFINS)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.cofinsCorreto)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoCOFINS)}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(c.creditoTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: S.navy }}>
                <td style={{ padding: '10px', color: '#fff', fontWeight: 700 }}>TOTAL GERAL</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>{notas.length}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>{formatBRL(totalNF)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#FED7AA', fontWeight: 700 }}>{formatBRL(totalICMS)}</td>
                <td /><td /><td />
                <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalPIS)}</td>
                <td /><td />
                <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCOFINS)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700, fontSize: 14 }}>{formatBRL(totalCredito)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── MEMÓRIA DE CÁLCULO ── */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 4, height: 28, background: S.navy, borderRadius: 2 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: S.navy }}>Memória de Cálculo — Nota por Nota</div>
          <span style={{ fontSize: 11, color: S.ghost, marginLeft: 8 }}>Clique na NF para expandir</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.tableHeader }}>
                {['','NF','Data','Emitente','Valor NF','ICMS','Base s/ ICMS','Créd. PIS','Créd. COFINS','Total'].map(h => (
                  <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: ['','NF','Data','Emitente'].includes(h) ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notas.map((n, i) => {
                const key    = n.nNF + n.dataEmissao + n.cnpjEmit;
                const aberta = expandida === key;
                return (
                  <>
                    <tr key={key} onClick={() => setExpandida(aberta ? null : key)}
                      style={{ background: aberta ? '#EFF6FF' : i % 2 === 0 ? S.bg : S.white, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: S.ghost, fontSize: 10 }}>{aberta ? '▼' : '▶'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: S.text }}>{n.nNF}</td>
                      <td style={{ padding: '8px 10px', color: S.muted, whiteSpace: 'nowrap' }}>{n.dataEmissao}</td>
                      <td style={{ padding: '8px 10px', color: S.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nomeEmit}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vNF)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(n.vICMS)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.baseSemICMS)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoPIS)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoCOFINS)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(n.creditoTotal)}</td>
                    </tr>
                    {aberta && (
                      <tr key={key + '_mem'}>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <div style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)', borderLeft: `4px solid ${S.blue}`, padding: '20px 24px' }}>
                            <div style={{ fontWeight: 800, color: S.navy, fontSize: 14, marginBottom: 16 }}>
                              📐 Memória de Cálculo Detalhada
                              <span style={{ fontSize: 12, fontWeight: 400, color: S.ghost, marginLeft: 10 }}>NF {n.nNF} · {n.nomeEmit} · {n.dataEmissao}</span>
                            </div>

                            {/* Fluxo visual do cálculo */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 16 }}>

                              {/* Bloco Base */}
                              <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${S.border}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DA BASE</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>① Valor total da NF</span>
                                    <span style={{ fontWeight: 700, color: S.text }}>{formatBRL(n.vNF)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>② ICMS destacado (indevido)</span>
                                    <span style={{ fontWeight: 700, color: S.orange }}>− {formatBRL(n.vICMS)}</span>
                                  </div>
                                  <div style={{ borderTop: `2px solid ${S.border}`, paddingTop: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: S.blue }}>③ Base correta (①−②)</span>
                                    <span style={{ fontWeight: 800, color: S.blue, fontSize: 14 }}>{formatBRL(n.baseSemICMS)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Bloco PIS */}
                              <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: `1px solid #bfdbfe` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: S.blue, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DO PIS</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>④ Alíquota PIS efetiva</span>
                                    <span style={{ fontWeight: 600, color: S.muted }}>{formatPct(n.aliqPIS)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>⑤ PIS recolhido (① × ④)</span>
                                    <span style={{ fontWeight: 600, color: S.muted }}>{formatBRL(n.vPIS)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>⑥ PIS correto (③ × ④)</span>
                                    <span style={{ fontWeight: 600, color: S.muted }}>{formatBRL(n.pisCorreto)}</span>
                                  </div>
                                  <div style={{ borderTop: `2px solid #bfdbfe`, paddingTop: 7, display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: S.blue }}>⑦ Crédito PIS (⑤−⑥)</span>
                                    <span style={{ fontWeight: 800, color: S.green, fontSize: 14 }}>{formatBRL(n.creditoPIS)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Bloco COFINS */}
                              <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: `1px solid #a5b4fc` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DA COFINS</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>⑧ Alíquota COFINS efetiva</span>
                                    <span style={{ fontWeight: 600, color: S.muted }}>{formatPct(n.aliqCOFINS)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>⑨ COFINS recolhido (① × ⑧)</span>
                                    <span style={{ fontWeight: 600, color: S.muted }}>{formatBRL(n.vCOFINS)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: S.muted }}>⑩ COFINS correto (③ × ⑧)</span>
                                    <span style={{ fontWeight: 600, color: S.muted }}>{formatBRL(n.cofinsCorreto)}</span>
                                  </div>
                                  <div style={{ borderTop: `2px solid #a5b4fc`, paddingTop: 7, display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: S.navy }}>⑪ Crédito COFINS (⑨−⑩)</span>
                                    <span style={{ fontWeight: 800, color: S.green, fontSize: 14 }}>{formatBRL(n.creditoCOFINS)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Total destaque */}
                            <div style={{ background: S.navy, borderRadius: 10, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, letterSpacing: 1 }}>⑫ TOTAL RECUPERÁVEL DESTA NF (⑦ + ⑪)</div>
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Fundamento: RE 574.706 · STF Tema 69 · CF/88 art. 195, I, b</div>
                              </div>
                              <div style={{ fontSize: 24, fontWeight: 800, color: '#6EE7B7' }}>{formatBRL(n.creditoTotal)}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PRÓXIMOS PASSOS ── */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 4, height: 28, background: S.green, borderRadius: 2 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: S.navy }}>Próximos Passos</div>
        </div>
        <div style={{ fontSize: 11, color: S.orange, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          ⚠️ Os procedimentos variam conforme o regime tributário. Confirme com o profissional responsável antes de executar qualquer retificação ou compensação.
        </div>
        {[
          { regime: 'Lucro Presumido', color: S.blue, bg: '#EFF6FF', border: '#bfdbfe', passos: [
            { num: '01', titulo: 'Retificar EFD-Contribuições', desc: 'Excluir o ICMS da base de cálculo do PIS e da COFINS em cada competência analisada, conforme os valores apurados neste parecer.' },
            { num: '02', titulo: 'Apurar o Crédito', desc: 'Calcular a diferença entre o PIS/COFINS recolhido e o PIS/COFINS devido sobre a base correta, competência a competência.' },
            { num: '03', titulo: 'Gerar PER/DCOMP', desc: 'Protocolar o Pedido Eletrônico de Restituição ou Declaração de Compensação via e-CAC, com certificado digital habilitado.' },
            { num: '04', titulo: 'Aguardar Homologação', desc: 'Prazo médio de análise pela Receita Federal: 30 a 360 dias. Manter documentação completa para eventual diligência.' },
            { num: '05', titulo: 'Arquivar Memória de Cálculo', desc: 'Guardar este parecer e os XMLs originais por no mínimo 5 anos para defesa em eventual autuação ou CARF.' },
          ]},
          { regime: 'Lucro Real', color: S.navy, bg: '#F5F3FF', border: '#c4b5fd', passos: [
            { num: '01', titulo: 'Retificar EFD-Contribuições', desc: 'Excluir o ICMS da base de PIS/COFINS em cada competência. Verificar impacto no LALUR e LACS.' },
            { num: '02', titulo: 'Ajustar IRPJ/CSLL', desc: 'Avaliar se a retificação do PIS/COFINS impacta a apuração do lucro real e ajustar as declarações se necessário.' },
            { num: '03', titulo: 'Gerar PER/DCOMP', desc: 'Protocolar via e-CAC com certificado digital. Créditos de PIS/COFINS podem ser compensados com outros tributos federais.' },
            { num: '04', titulo: 'Homologação e Arquivamento', desc: 'Acompanhar o despacho decisório e manter toda a documentação arquivada para defesa administrativa.' },
          ]},
          { regime: 'Simples Nacional', color: S.green, bg: '#F0FDF4', border: '#86efac', passos: [
            { num: '01', titulo: 'Avaliar Viabilidade Jurídica', desc: 'O aproveitamento direto no Simples Nacional é mais restrito. Avaliar com advogado tributarista a estratégia mais adequada.' },
            { num: '02', titulo: 'Verificar PGDAS-D', desc: 'Verificar se há valores de PIS/COFINS segregados que permitam o aproveitamento da tese administrativamente.' },
            { num: '03', titulo: 'Considerar Ação Judicial', desc: 'Mandado de segurança é a via mais comum para garantir o direito ao crédito para contribuintes do Simples Nacional.' },
            { num: '04', titulo: 'Arquivar Documentação', desc: 'Manter este parecer e os XMLs como fundamento da tese para eventual ação judicial ou administrativa.' },
          ]},
        ].map(bloco => (
          <div key={bloco.regime} style={{ background: bloco.bg, border: `1px solid ${bloco.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: bloco.color, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${bloco.border}` }}>
              {bloco.regime}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bloco.passos.map(p => (
                <div key={p.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: bloco.color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.num}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: bloco.color, marginBottom: 3 }}>{p.titulo}</div>
                    <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── DISCLAIMER ── */}
      <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>⚖️</div>
        <div style={{ fontSize: 11, color: S.ghost, lineHeight: 1.8 }}>
          <strong style={{ color: S.muted }}>Aviso Legal:</strong> Este parecer tem caráter exclusivamente diagnóstico e informativo,
          elaborado com base nos dados fornecidos e na legislação vigente. Não substitui a análise de profissional
          habilitado (contador registrado no CRC ou advogado tributarista inscrito na OAB). A decisão de aproveitamento
          de créditos, retificação de obrigações acessórias e eventual compensação tributária são de exclusiva
          responsabilidade do profissional responsável pelo contribuinte. {perfil?.nome_escritorio && `${perfil.nome_escritorio} · `}
          e-FiscalTribe® — Zenthor Consultoria &amp; BPO · {hoje()}.
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────
export default function ExclusaoICMS({ cliente }) {
  const [notas, setNotas]             = useState([]);
  const [erros, setErros]             = useState([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso]     = useState({ atual: 0, total: 0, loteAtual: 0, totalLotes: 0 });
  const [tamLote, setTamLote]         = useState(100);
  const [aba, setAba]                 = useState('competencia');
  const [expandida, setExpandida]     = useState(null);
  const [busca, setBusca]             = useState('');
  const [pagina, setPagina]           = useState(1);
  const [porPagina, setPorPagina]     = useState(25);

  // Perfil do escritório
  const [perfil, setPerfil]           = useState(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm]   = useState({});
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // Histórico
  const [historico, setHistorico]     = useState([]);
  const [salvando, setSalvando]       = useState(false);
  const [abaHistorico, setAbaHistorico] = useState(false);

  const inputRef  = useRef();
  const logoRef   = useRef();

  useEffect(() => { carregarPerfil(); carregarHistorico(); }, []);

  async function carregarPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('perfil_escritorio').select('*').eq('usuario_id', user.id).single();
    if (data) { setPerfil(data); setPerfilForm(data); }
  }

  async function carregarHistorico() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('diagnosticos_exclusao_icms')
      .select('*').eq('usuario_id', user.id).order('created_at', { ascending: false });
    setHistorico(data || []);
  }

  async function salvarPerfil() {
    setSalvandoPerfil(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...perfilForm, usuario_id: user.id, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('perfil_escritorio').upsert(payload, { onConflict: 'usuario_id' }).select().single();
    if (!error && data) { setPerfil(data); setEditandoPerfil(false); }
    setSalvandoPerfil(false);
  }

  async function uploadLogo(file) {
    const { data: { user } } = await supabase.auth.getUser();
    const ext  = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('logos-escritorio').upload(path, file, { upsert: true });
    if (error) return;
    const { data: urlData } = supabase.storage.from('logos-escritorio').getPublicUrl(path);
    setPerfilForm(p => ({ ...p, logo_url: urlData.publicUrl }));
  }

  async function salvarDiagnostico() {
    if (!notas.length) return;
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const competencias = agruparPorCompetencia(notas);
    const payload = {
      usuario_id:     user.id,
      cliente_id:     cliente?.id?.toString() || null,
      nome_cliente:   cliente?.razao_social || '',
      cnpj_cliente:   cliente?.cnpj || '',
      regime:         cliente?.regime || '',
      periodo_inicio: competencias[0]?.competencia || '',
      periodo_fim:    competencias[competencias.length - 1]?.competencia || '',
      total_nfs:      notas.length,
      total_icms:     notas.reduce((s, n) => s + n.vICMS, 0),
      total_pis:      notas.reduce((s, n) => s + n.creditoPIS, 0),
      total_cofins:   notas.reduce((s, n) => s + n.creditoCOFINS, 0),
      total_credito:  notas.reduce((s, n) => s + n.creditoTotal, 0),
      resultado_json: { notas, competencias },
    };
    await supabase.from('diagnosticos_exclusao_icms').insert([payload]);
    await carregarHistorico();
    setSalvando(false);
    alert('Diagnóstico salvo com sucesso!');
  }

  async function excluirDiagnostico(id) {
    if (!window.confirm('Excluir este diagnóstico do histórico?')) return;
    await supabase.from('diagnosticos_exclusao_icms').delete().eq('id', id);
    setHistorico(h => h.filter(d => d.id !== id));
  }

  function abrirDiagnostico(diag) {
    const rj = diag.resultado_json || {};
    setNotas(rj.notas || []);
    setAbaHistorico(false);
    setAba('competencia');
  }

  const processarArquivos = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const xmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (xmlFiles.length === 0) return;
    setProcessando(true); setNotas([]); setErros([]); setPagina(1); setExpandida(null);
    const totalLotes = Math.ceil(xmlFiles.length / tamLote);
    setProgresso({ atual: 0, total: xmlFiles.length, loteAtual: 0, totalLotes });
    const resultados = [], falhas = [];
    for (let i = 0; i < xmlFiles.length; i += tamLote) {
      const lote   = xmlFiles.slice(i, i + tamLote);
      const loteNum = Math.floor(i / tamLote) + 1;
      await Promise.all(lote.map(async (file) => {
        try {
          const text = await file.text();
          const nota = parsearXMLNFe(text);
          if (nota) resultados.push({ ...nota, arquivo: file.name });
          else falhas.push(file.name);
        } catch { falhas.push(file.name); }
      }));
      setProgresso({ atual: Math.min(i + tamLote, xmlFiles.length), total: xmlFiles.length, loteAtual: loteNum, totalLotes });
      await new Promise(r => setTimeout(r, 30));
    }
    resultados.sort((a, b) => a.dataEmissao.localeCompare(b.dataEmissao));
    setNotas(resultados); setErros(falhas); setProcessando(false);
  }, [tamLote]);

  const competencias = agruparPorCompetencia(notas);
  const totalCredito = notas.reduce((s, n) => s + n.creditoTotal,  0);
  const totalPIS     = notas.reduce((s, n) => s + n.creditoPIS,    0);
  const totalCOFINS  = notas.reduce((s, n) => s + n.creditoCOFINS, 0);
  const totalICMS    = notas.reduce((s, n) => s + n.vICMS,         0);
  const totalNF      = notas.reduce((s, n) => s + n.vNF,           0);
  const temDados     = notas.length > 0;
  const pct          = progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0;

  const notasFiltradas = notas.filter(n =>
    !busca || n.nNF?.includes(busca) ||
    n.nomeEmit?.toLowerCase().includes(busca.toLowerCase()) ||
    n.competencia?.includes(busca)
  );
  const totalPaginas = Math.ceil(notasFiltradas.length / porPagina);
  const notasPagina  = notasFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // ── Modal Perfil Escritório ──
  if (editandoPerfil) return (
    <div style={{ background: S.bg, minHeight: '100%', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={() => setEditandoPerfil(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 12, color: S.ghost, cursor: 'pointer', marginBottom: 20 }}>
          ← Voltar
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: S.navy, marginBottom: 4 }}>Perfil do Escritório</h2>
        <div style={{ fontSize: 12, color: S.ghost, marginBottom: 20 }}>Estas informações aparecem no cabeçalho do relatório.</div>

        {/* Logo */}
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: S.navy, marginBottom: 14 }}>Logo do Escritório</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {perfilForm.logo_url
              ? <img src={perfilForm.logo_url} alt="Logo" style={{ height: 64, objectFit: 'contain', borderRadius: 8, border: `1px solid ${S.border}` }} />
              : <div style={{ width: 120, height: 64, background: S.bg, borderRadius: 8, border: `2px dashed ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: S.ghost }}>Sem logo</span>
                </div>
            }
            <div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: S.blue, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📁 Selecionar PNG
                <input ref={logoRef} type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files[0]) uploadLogo(e.target.files[0]); }} />
              </label>
              <div style={{ fontSize: 11, color: S.ghost, marginTop: 6 }}>PNG, JPG — recomendado fundo transparente</div>
            </div>
          </div>
        </div>

        {/* Dados */}
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: S.navy, marginBottom: 14 }}>Dados do Escritório</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['nome_escritorio', 'Nome do Escritório / Empresa'],
              ['responsavel',     'Nome do Responsável'],
              ['crc',             'CRC / OAB'],
              ['endereco',        'Endereço Completo'],
              ['telefone',        'Telefone'],
              ['whatsapp',        'WhatsApp'],
              ['email',           'E-mail'],
              ['site',            'Site'],
            ].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: S.muted }}>{label}</label>
                <input value={perfilForm[key] || ''} onChange={e => setPerfilForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ padding: '8px 12px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 13, color: S.text, outline: 'none' }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={salvarPerfil} disabled={salvandoPerfil}
            style={{ padding: '9px 20px', background: S.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {salvandoPerfil ? 'Salvando...' : '💾 Salvar Perfil'}
          </button>
          <button onClick={() => setEditandoPerfil(false)}
            style={{ padding: '9px 16px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, color: S.ghost, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: S.bg, minHeight: '100%', padding: 16, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>

      {/* ── Cabeçalho ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: S.text, margin: 0, marginBottom: 4 }}>
            Exclusão ICMS — Base PIS/COFINS
          </h1>
          <div style={{ fontSize: 12, color: S.ghost }}>
            RE 574.706 · STF Tema 69 · A Tese do Século
            {cliente && <span style={{ marginLeft: 8, color: S.blue, fontWeight: 600 }}>· {cliente.razao_social}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setEditandoPerfil(true)}
            style={{ padding: '7px 12px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, color: S.muted, cursor: 'pointer' }}>
            🏢 Perfil do Escritório
          </button>
          <button onClick={() => setAbaHistorico(h => !h)}
            style={{ padding: '7px 12px', background: abaHistorico ? S.navy : S.white, border: `1px solid ${abaHistorico ? S.navy : S.border}`, borderRadius: 7, fontSize: 12, color: abaHistorico ? '#fff' : S.muted, cursor: 'pointer' }}>
            📂 Histórico ({historico.length})
          </button>
          {temDados && (
            <>
              <button onClick={salvarDiagnostico} disabled={salvando}
                style={{ padding: '7px 12px', background: S.green, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : '💾 Salvar'}
              </button>
              <button onClick={() => { setNotas([]); setErros([]); }}
                style={{ padding: '7px 12px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, color: S.ghost, cursor: 'pointer' }}>
                🗑 Limpar
              </button>
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: S.blue, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📂 Importar XMLs
            <input ref={inputRef} type="file" accept=".xml" multiple style={{ display: 'none' }}
              onChange={e => processarArquivos(e.target.files)} />
          </label>
        </div>
      </div>

      {/* ── Histórico ── */}
      {abaHistorico && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: S.navy, marginBottom: 12 }}>📂 Histórico de Diagnósticos</div>
          {historico.length === 0
            ? <div style={{ fontSize: 13, color: S.ghost, textAlign: 'center', padding: 24 }}>Nenhum diagnóstico salvo ainda.</div>
            : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['Data','Cliente','CNPJ','Período','NF-es','Crédito Total','Ações'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '9px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((d, i) => (
                      <tr key={d.id} style={{ background: i % 2 === 0 ? S.bg : S.white, borderBottom: `1px solid ${S.border}` }}>
                        <td style={{ padding: '9px 12px', color: S.muted, whiteSpace: 'nowrap' }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: S.text }}>{d.nome_cliente || '—'}</td>
                        <td style={{ padding: '9px 12px', color: S.muted }}>{d.cnpj_cliente || '—'}</td>
                        <td style={{ padding: '9px 12px', color: S.muted, whiteSpace: 'nowrap' }}>{d.periodo_inicio} a {d.periodo_fim}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: S.muted }}>{d.total_nfs}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: S.green }}>{formatBRL(d.total_credito)}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => abrirDiagnostico(d)}
                              style={{ padding: '4px 10px', background: S.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              Abrir
                            </button>
                            <button onClick={() => excluirDiagnostico(d.id)}
                              style={{ padding: '4px 10px', background: '#FEF2F2', color: S.red, border: `1px solid #FECACA`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* ── Configuração de lote ── */}
      {!temDados && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: S.navy, marginBottom: 10 }}>⚙️ Configuração de Processamento</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { valor: 50,  label: '50 NFs',  rec: 'até 4 GB RAM' },
              { valor: 100, label: '100 NFs', rec: '8 GB RAM' },
              { valor: 200, label: '200 NFs', rec: '16 GB RAM' },
              { valor: 500, label: '500 NFs', rec: 'Workstation' },
            ].map(op => (
              <button key={op.valor} onClick={() => setTamLote(op.valor)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: tamLote === op.valor ? 700 : 400, cursor: 'pointer',
                  border: `2px solid ${tamLote === op.valor ? S.blue : S.border}`,
                  background: tamLote === op.valor ? '#EFF6FF' : S.white,
                  color: tamLote === op.valor ? S.blue : S.ghost }}>
                {op.label}
                <span style={{ fontSize: 10, display: 'block', fontWeight: 400 }}>{op.rec}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: S.ghost, lineHeight: 1.7, background: S.bg, borderRadius: 7, padding: '8px 12px' }}>
            🟢 <strong>50</strong> — PCs até 4GB · 🔵 <strong>100</strong> — Padrão (8GB) · 🟡 <strong>200</strong> — 16GB · 🔴 <strong>500</strong> — Workstation apenas<br />
            <span style={{ color: S.orange }}>⚠️ Se travar, clique em Limpar, reduza o lote e tente novamente.</span>
          </div>
        </div>
      )}

      {/* ── Drop zone ── */}
      {!temDados && !processando && (
        <div onDrop={e => { e.preventDefault(); processarArquivos(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${S.border}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: S.white }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 6 }}>Arraste os XMLs aqui ou clique para selecionar</div>
          <div style={{ fontSize: 12, color: S.ghost }}>Suporta centenas de arquivos em lote · Apenas NF-e de saída são processadas</div>
        </div>
      )}

      {/* ── Progresso ── */}
      {processando && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.navy }}>Processando lote {progresso.loteAtual} de {progresso.totalLotes}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: S.blue }}>{pct}%</span>
          </div>
          <div style={{ background: S.border, borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ background: S.blue, height: 10, borderRadius: 99, width: pct + '%', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: S.ghost }}>{progresso.atual} de {progresso.total} arquivos — lote de {tamLote} NFs</div>
        </div>
      )}

      {erros.length > 0 && (
        <div style={{ background: '#FFF7ED', border: `1px solid #FED7AA`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: S.orange }}>
          ⚠️ {erros.length} arquivo(s) ignorados — NF-e de entrada, sem ICMS ou formato inválido.
        </div>
      )}

      {/* ── KPIs ── */}
      {temDados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Crédito Total',   value: formatBRL(totalCredito), color: S.green,  desc: 'PIS + COFINS pagos a maior' },
            { label: 'Crédito PIS',     value: formatBRL(totalPIS),     color: S.blue,   desc: 'PIS pago sobre base inflada' },
            { label: 'Crédito COFINS',  value: formatBRL(totalCOFINS),  color: S.navy,   desc: 'COFINS pago sobre base inflada' },
            { label: 'ICMS Excluído',   value: formatBRL(totalICMS),    color: S.orange, desc: 'Retirado da base' },
            { label: 'NF-e Analisadas', value: notas.length,            color: S.ghost,  desc: 'Notas processadas' },
            { label: 'Competências',    value: competencias.length,     color: S.ghost,  desc: 'Períodos cobertos' },
          ].map(k => (
            <div key={k.label} style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: S.ghost, marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: typeof k.value === 'number' ? 22 : 16, fontWeight: 700, color: k.color, marginBottom: 3 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: S.ghost }}>{k.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Abas ── */}
      {temDados && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}`, overflowX: 'auto', alignItems: 'center' }}>
            {[
              { key: 'competencia', label: '📅 Por Competência' },
              { key: 'notas',       label: '📄 Por Nota Fiscal' },
              { key: 'relatorio',   label: '📋 Relatório Profissional' },
            ].map(t => (
              <button key={t.key} onClick={() => setAba(t.key)}
                style={{ padding: '11px 16px', fontSize: 12, fontWeight: aba === t.key ? 700 : 400,
                  color: aba === t.key ? S.blue : S.ghost, background: 'none', border: 'none',
                  borderBottom: aba === t.key ? `2px solid ${S.blue}` : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => {
              const csv  = [
                ['NF','Data','Competência','Emitente','Valor NF','ICMS','Base s/ ICMS','Alíq PIS','PIS Pago','PIS Correto','Créd PIS','Alíq COFINS','COFINS Pago','COFINS Correto','Créd COFINS','Total'],
                ...notas.map(n => [n.nNF, n.dataEmissao, n.competencia, n.nomeEmit, n.vNF.toFixed(2), n.vICMS.toFixed(2), n.baseSemICMS.toFixed(2), (n.aliqPIS*100).toFixed(4), n.vPIS.toFixed(2), n.pisCorreto.toFixed(2), n.creditoPIS.toFixed(2), (n.aliqCOFINS*100).toFixed(4), n.vCOFINS.toFixed(2), n.cofinsCorreto.toFixed(2), n.creditoCOFINS.toFixed(2), n.creditoTotal.toFixed(2)])
              ].map(r => r.join(';')).join('\n');
              const a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
              a.download = `exclusao_icms_${cliente?.cnpj || 'cliente'}.csv`; a.click();
            }}
              style={{ margin: '6px 12px', background: S.green, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ⬇ CSV
            </button>
          </div>

          {/* ABA Competência */}
          {aba === 'competencia' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 800 }}>
                <thead>
                  <tr style={{ background: S.tableHeader }}>
                    {['Competência','NF-es','Valor Total','ICMS Excluído','Base s/ ICMS','PIS Pago','PIS Correto','Créd. PIS','COFINS Pago','COFINS Correto','Créd. COFINS','Total Crédito'].map(h => (
                      <th key={h} style={{ color: '#fff', padding: '10px', textAlign: h === 'Competência' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {competencias.map((c, i) => (
                    <tr key={c.competencia} onClick={() => { setAba('notas'); setBusca(c.competencia); setPagina(1); }}
                      style={{ background: i % 2 === 0 ? S.bg : S.white, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: S.blue }}>{c.competencia}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{c.qtdNF}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vNF)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(c.vICMS)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.baseSemICMS)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vPIS)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.pisCorreto)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoPIS)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vCOFINS)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.cofinsCorreto)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoCOFINS)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(c.creditoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: S.navy }}>
                    <td style={{ padding: '10px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>{notas.length}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>{formatBRL(totalNF)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#FED7AA', fontWeight: 700 }}>{formatBRL(totalICMS)}</td>
                    <td /><td /><td />
                    <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalPIS)}</td>
                    <td /><td />
                    <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCOFINS)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCredito)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ABA Notas */}
          {aba === 'notas' && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
                  placeholder="Buscar por NF, emitente ou competência..."
                  style={{ flex: 1, minWidth: 200, padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12 }} />
                <select value={porPagina} onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                  style={{ padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12 }}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
                </select>
                <span style={{ fontSize: 11, color: S.ghost }}>{notasFiltradas.length} NF-es</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 820 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['','NF','Data','Competência','Emitente','Valor NF','ICMS','Base s/ ICMS','Créd. PIS','Créd. COFINS','Total'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: ['','NF','Data','Competência','Emitente'].includes(h) ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notasPagina.map((n, i) => {
                      const key    = n.nNF + n.dataEmissao + n.cnpjEmit;
                      const aberta = expandida === key;
                      return (
                        <>
                          <tr key={key} onClick={() => setExpandida(aberta ? null : key)}
                            style={{ background: aberta ? '#EFF6FF' : i % 2 === 0 ? S.bg : S.white, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                            <td style={{ padding: '8px 6px', textAlign: 'center', color: S.ghost, fontSize: 10 }}>{aberta ? '▼' : '▶'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: S.text }}>{n.nNF}</td>
                            <td style={{ padding: '8px 10px', color: S.muted, whiteSpace: 'nowrap' }}>{n.dataEmissao}</td>
                            <td style={{ padding: '8px 10px', color: S.blue, fontWeight: 600 }}>{n.competencia}</td>
                            <td style={{ padding: '8px 10px', color: S.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nomeEmit}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vNF)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(n.vICMS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.baseSemICMS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoPIS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoCOFINS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(n.creditoTotal)}</td>
                          </tr>
                          {aberta && (
                            <tr key={key + '_mem'}>
                              <td colSpan={11} style={{ padding: 0 }}>
                                <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F0FDF4)', borderLeft: `4px solid ${S.blue}`, padding: '20px 24px' }}>
                                  <div style={{ fontWeight: 800, color: S.navy, fontSize: 14, marginBottom: 16 }}>
                                    📐 Memória de Cálculo
                                    <span style={{ fontSize: 11, fontWeight: 400, color: S.ghost, marginLeft: 10 }}>NF {n.nNF} · {n.nomeEmit} · {n.dataEmissao}</span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 }}>
                                    <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${S.border}` }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DA BASE</div>
                                      {[
                                        { label: '① Valor total da NF', value: formatBRL(n.vNF), color: S.text },
                                        { label: '② ICMS (indevido na base)', value: `− ${formatBRL(n.vICMS)}`, color: S.orange },
                                      ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                          <span style={{ fontSize: 11, color: S.muted }}>{item.label}</span>
                                          <span style={{ fontWeight: 600, color: item.color }}>{item.value}</span>
                                        </div>
                                      ))}
                                      <div style={{ borderTop: `2px solid ${S.border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: S.blue }}>③ Base correta (①−②)</span>
                                        <span style={{ fontWeight: 800, color: S.blue, fontSize: 15 }}>{formatBRL(n.baseSemICMS)}</span>
                                      </div>
                                    </div>
                                    <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: '1px solid #bfdbfe' }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: S.blue, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DO PIS</div>
                                      {[
                                        { label: '④ Alíquota PIS efetiva', value: formatPct(n.aliqPIS) },
                                        { label: '⑤ PIS recolhido (①×④)', value: formatBRL(n.vPIS) },
                                        { label: '⑥ PIS correto (③×④)', value: formatBRL(n.pisCorreto) },
                                      ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                          <span style={{ fontSize: 11, color: S.muted }}>{item.label}</span>
                                          <span style={{ fontWeight: 600, color: S.muted }}>{item.value}</span>
                                        </div>
                                      ))}
                                      <div style={{ borderTop: '2px solid #bfdbfe', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: S.blue }}>⑦ Crédito PIS (⑤−⑥)</span>
                                        <span style={{ fontWeight: 800, color: S.green, fontSize: 15 }}>{formatBRL(n.creditoPIS)}</span>
                                      </div>
                                    </div>
                                    <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: '1px solid #a5b4fc' }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DA COFINS</div>
                                      {[
                                        { label: '⑧ Alíquota COFINS efetiva', value: formatPct(n.aliqCOFINS) },
                                        { label: '⑨ COFINS recolhido (①×⑧)', value: formatBRL(n.vCOFINS) },
                                        { label: '⑩ COFINS correto (③×⑧)', value: formatBRL(n.cofinsCorreto) },
                                      ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                          <span style={{ fontSize: 11, color: S.muted }}>{item.label}</span>
                                          <span style={{ fontWeight: 600, color: S.muted }}>{item.value}</span>
                                        </div>
                                      ))}
                                      <div style={{ borderTop: '2px solid #a5b4fc', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: S.navy }}>⑪ Crédito COFINS (⑨−⑩)</span>
                                        <span style={{ fontWeight: 800, color: S.green, fontSize: 15 }}>{formatBRL(n.creditoCOFINS)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ background: S.navy, borderRadius: 10, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, letterSpacing: 1 }}>⑫ TOTAL RECUPERÁVEL DESTA NF (⑦+⑪)</div>
                                      <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>RE 574.706 · STF Tema 69 · CF/88 art. 195, I, b</div>
                                    </div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: '#6EE7B7' }}>{formatBRL(n.creditoTotal)}</div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                    style={{ padding: '5px 12px', border: `1px solid ${S.border}`, borderRadius: 6, background: S.white, fontSize: 12, cursor: 'pointer', opacity: pagina === 1 ? 0.4 : 1 }}>‹</button>
                  {Array.from({ length: Math.min(7, totalPaginas) }, (_, i) => {
                    const p = totalPaginas <= 7 ? i + 1 : pagina <= 4 ? i + 1 : pagina >= totalPaginas - 3 ? totalPaginas - 6 + i : pagina - 3 + i;
                    return <button key={p} onClick={() => setPagina(p)}
                      style={{ padding: '5px 10px', border: `1px solid ${p === pagina ? S.blue : S.border}`, borderRadius: 6, background: p === pagina ? S.blue : S.white, color: p === pagina ? '#fff' : S.text, fontSize: 12, cursor: 'pointer', fontWeight: p === pagina ? 700 : 400 }}>{p}</button>;
                  })}
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                    style={{ padding: '5px 12px', border: `1px solid ${S.border}`, borderRadius: 6, background: S.white, fontSize: 12, cursor: 'pointer', opacity: pagina === totalPaginas ? 0.4 : 1 }}>›</button>
                </div>
              )}
            </div>
          )}

          {/* ABA Relatório */}
          {aba === 'relatorio' && (
            <div style={{ padding: 20 }}>
              <RelatorioProfissional notas={notas} cliente={cliente} perfil={perfil} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}