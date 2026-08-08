import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import AnalisadorIA from '../AnalisadorIA';

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', bg: '#F8FAFC',
  text: '#0F172A', muted: '#334155', ghost: '#64748B',
  border: '#E2E8F0', tableHeader: '#4B5563',
};

const ALIQUOTAS = {
  2019: { pis: 0.0275, cofins: 0.0275 },
  2020: { pis: 0.0275, cofins: 0.0275 },
  2021: { pis: 0.0275, cofins: 0.0275 },
  2022: { pis: 0.0275, cofins: 0.0275 },
  2023: { pis: 0.0275, cofins: 0.0275 },
  2024: { pis: 0.0275, cofins: 0.0275 },
  2025: { pis: 0.0275, cofins: 0.0275 },
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatBRL(v) {
  if (v == null || isNaN(v)) return 'R$ —';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AbaRecuperacaoMonofasicos() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [anoInicio, setAnoInicio] = useState('2022');
  const [mesInicio, setMesInicio] = useState('01');
  const [anoFim, setAnoFim] = useState('2024');
  const [mesFim, setMesFim] = useState('12');
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [divergencias, setDivergencias] = useState([]);
  const [modalDivergencia, setModalDivergencia] = useState(null);
  const [resolucoes, setResolucoes] = useState({});
  const [resultados, setResultados] = useState(null);
  const [aba, setAba] = useState('credito');
  const [apurando, setApurando] = useState(false);

  useEffect(() => {
    supabase.from('clientes').select('id, razao_social, cnpj')
      .order('razao_social')
      .then(({ data }) => setClientes(data || []));
  }, []);

  const buscarDados = useCallback(async () => {
    if (!clienteSelecionado) return;
    setCarregando(true);
    setErro('');
    setResultados(null);
    setDivergencias([]);
    setResolucoes({});
    const compInicio = `${anoInicio}-${mesInicio}`;
    const compFim = `${anoFim}-${mesFim}`;
    const [{ data: diags, error: e1 }, { data: itensData, error: e2 }] = await Promise.all([
      supabase.from('diagnosticos_monofasicos').select('*')
        .eq('cliente_id', clienteSelecionado)
        .gte('competencia', compInicio)
        .lte('competencia', compFim)
        .order('competencia'),
      supabase.from('itens_fiscais').select('*').eq('cliente_id', clienteSelecionado),
    ]);
    if (e1 || e2) { setErro('Erro ao buscar dados.'); setCarregando(false); return; }
    if (!diags || diags.length === 0) {
      setErro('Nenhum diagnóstico encontrado. Importe XMLs no Diagnóstico Tributário primeiro.');
      setCarregando(false); return;
    }
    setDiagnosticos(diags);
    setItens(itensData || []);
    setCarregando(false);
  }, [clienteSelecionado, anoInicio, mesInicio, anoFim, mesFim]);

  const calcular = useCallback((competencias, resolsAtual) => {
    const linhasCredito = [], linhasEspelho = [], linhasDetalhadas = [];
    competencias.forEach(({ competencia, receitaXML, receitaPGDAS, rj }) => {
      const ano = parseInt(competencia.split('-')[0]);
      const aliq = ALIQUOTAS[ano] || ALIQUOTAS[2024];
      const resolucao = resolsAtual[competencia] || 'conservador';
      if (resolucao === 'interromper') return;
      const receitaMono = rj.total_monofasico || rj.credito_monofasico || 0;
      let receitaMonoFinal = receitaMono;
      let receitaNormalFinal = (receitaXML || receitaPGDAS) - receitaMono;
      if (resolucao === 'conservador' && receitaPGDAS > 0) {
        const diff = receitaPGDAS - receitaXML;
        if (diff > 0) receitaNormalFinal += diff;
        else receitaMonoFinal = Math.max(0, receitaMonoFinal + diff);
      }
      if (resolucao === 'manter') {
        linhasDetalhadas.push({ competencia, receitaXML, receitaPGDAS, receitaMono: receitaMonoFinal,
          receitaNormal: receitaNormalFinal, pisPago: rj.pis_recolhido||0, cofinsPago: rj.cofins_recolhido||0,
          pisDevido: 0, cofinsDevido: 0, creditoPIS: null, creditoCOFINS: null, creditoTotal: null, divergencia: true });
        return;
      }
      const pisDevido = receitaNormalFinal * aliq.pis;
      const cofinsDevido = receitaNormalFinal * aliq.cofins;
      const pisPago = rj.pis_recolhido || 0;
      const cofinsPago = rj.cofins_recolhido || 0;
      const creditoPIS = Math.max(0, pisPago - pisDevido);
      const creditoCOFINS = Math.max(0, cofinsPago - cofinsDevido);
      const creditoTotal = creditoPIS + creditoCOFINS;
      linhasCredito.push({ competencia, receitaTotal: receitaPGDAS||receitaXML, receitaMono: receitaMonoFinal,
        receitaNormal: receitaNormalFinal, pisDevido, cofinsDevido, pisPago, cofinsPago, creditoPIS, creditoCOFINS, creditoTotal });
      linhasEspelho.push({ competencia, receitaBrutaDeclarada: receitaPGDAS, receitaBrutaNova: receitaNormalFinal,
        receitaMonofasica: receitaMonoFinal, pisPago, pisApurado: pisDevido, cofinsPago, cofinsApurado: cofinsDevido, creditoPIS, creditoCOFINS });
      linhasDetalhadas.push({ competencia, receitaXML, receitaPGDAS, receitaMono: receitaMonoFinal,
        receitaNormal: receitaNormalFinal, pisPago, cofinsPago, pisDevido, cofinsDevido, creditoPIS, creditoCOFINS, creditoTotal, divergencia: false });
    });
    const totalCredito = linhasCredito.reduce((a, l) => a + l.creditoTotal, 0);
    const totalPIS = linhasCredito.reduce((a, l) => a + l.creditoPIS, 0);
    const totalCOFINS = linhasCredito.reduce((a, l) => a + l.creditoCOFINS, 0);
    setResultados({ linhasCredito, linhasEspelho, linhasDetalhadas, totalCredito, totalPIS, totalCOFINS });
    setApurando(false);
  }, []);

  const apurar = useCallback(() => {
    if (!diagnosticos.length) return;
    setApurando(true);
    setErro('');
    const novasDiverg = [];
    const competencias = diagnosticos.map(diag => {
      const rj = diag.resultado_json || {};
      const receitaXML = rj.receita_bruta_xml || 0;
      const receitaPGDAS = rj.receita_bruta_pgdas || diag.receita_bruta_declarada || 0;
      if (Math.abs(receitaXML - receitaPGDAS) > 0.01 && receitaPGDAS > 0)
        novasDiverg.push({ competencia: diag.competencia, receitaXML, receitaPGDAS });
      return { competencia: diag.competencia, receitaXML, receitaPGDAS, rj };
    });
    setDivergencias(novasDiverg);
    const primeira = novasDiverg.find(d => !resolucoes[d.competencia]);
    if (primeira) { setModalDivergencia(primeira); setApurando(false); return; }
    calcular(competencias, resolucoes);
  }, [diagnosticos, resolucoes, calcular]);

  const resolverDivergencia = (competencia, opcao) => {
    const novas = { ...resolucoes, [competencia]: opcao };
    setResolucoes(novas);
    const proxima = divergencias.find(d => d.competencia !== competencia && !novas[d.competencia]);
    if (proxima) { setModalDivergencia(proxima); return; }
    setModalDivergencia(null);
    const competencias = diagnosticos.map(diag => {
      const rj = diag.resultado_json || {};
      return { competencia: diag.competencia, receitaXML: rj.receita_bruta_xml||0,
        receitaPGDAS: rj.receita_bruta_pgdas||diag.receita_bruta_declarada||0, rj };
    });
    calcular(competencias, novas);
  };

  const exportarCSV = () => {
    if (!resultados) return;
    const headers = ['Competência','Rec. Total','Rec. Mono','Rec. Normal','PIS Pago','COFINS Pago','PIS Devido','COFINS Devido','Créd. PIS','Créd. COFINS','Total'];
    const rows = resultados.linhasDetalhadas.map(l => [
      l.competencia, l.receitaPGDAS?.toFixed(2), l.receitaMono?.toFixed(2), l.receitaNormal?.toFixed(2),
      l.pisPago?.toFixed(2), l.cofinsPago?.toFixed(2), l.pisDevido?.toFixed(2), l.cofinsDevido?.toFixed(2),
      l.creditoPIS != null ? l.creditoPIS.toFixed(2) : 'divergência',
      l.creditoCOFINS != null ? l.creditoCOFINS.toFixed(2) : 'divergência',
      l.creditoTotal != null ? l.creditoTotal.toFixed(2) : 'divergência',
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cliente = clientes.find(c => c.id === clienteSelecionado);
    a.href = url; a.download = `monofasico_${cliente?.cnpj||'cliente'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const clienteObj = clientes.find(c => c.id === clienteSelecionado);

  return (
    <div style={{ background: S.bg, minHeight: '100vh', padding: '24px 28px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ background: S.navy, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>💰</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Recuperação PIS/COFINS Monofásico</div>
          <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>Motor do Simples Nacional · Apuração de créditos por competência</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: S.navy, marginBottom: 14 }}>Selecionar Cliente e Período</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label style={{ fontSize: 12, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Cliente</label>
            <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)}
              style={{ width: '100%', border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: S.text, background: '#fff' }}>
              <option value=''>Selecione um cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} — {c.cnpj}</option>)}
            </select>
          </div>
          {[['De', anoInicio, setAnoInicio, mesInicio, setMesInicio], ['Até', anoFim, setAnoFim, mesFim, setMesFim]].map(([label, ano, setAno, mes, setMes]) => (
            <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>{label} — Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)} style={{ border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: S.text }}>
                  {MESES.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Ano</label>
                <select value={ano} onChange={e => setAno(e.target.value)} style={{ border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: S.text }}>
                  {[2019,2020,2021,2022,2023,2024,2025].map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button onClick={buscarDados} disabled={!clienteSelecionado || carregando}
            style={{ background: S.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {carregando ? 'Buscando...' : 'Buscar Dados'}
          </button>
        </div>
      </div>

      {erro && (
        <div style={{ background: '#FEF2F2', border: `1px solid #FECACA`, borderRadius: 8, padding: '12px 16px', color: S.red, fontSize: 13, marginBottom: 20 }}>
          ⚠️ {erro}
        </div>
      )}

      {diagnosticos.length > 0 && !resultados && (
        <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: S.text }}>{clienteObj?.razao_social}</div>
              <div style={{ fontSize: 12, color: S.ghost, marginTop: 2 }}>{diagnosticos.length} competência(s) encontrada(s)</div>
            </div>
            <button onClick={apurar} disabled={apurando}
              style={{ background: S.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {apurando ? 'Apurando...' : '⚡ Apurar Créditos'}
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.tableHeader }}>
                {['Competência','Receita XML','Receita PGDAS-D','Status'].map(h => (
                  <th key={h} style={{ color: '#fff', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diagnosticos.map((d, i) => {
                const rj = d.resultado_json || {};
                const rX = rj.receita_bruta_xml || 0;
                const rP = rj.receita_bruta_pgdas || d.receita_bruta_declarada || 0;
                const diverg = Math.abs(rX - rP) > 0.01 && rP > 0;
                return (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                    <td style={{ padding: '8px 12px', color: S.text, fontWeight: 600 }}>{d.competencia}</td>
                    <td style={{ padding: '8px 12px', color: S.muted }}>{formatBRL(rX)}</td>
                    <td style={{ padding: '8px 12px', color: S.muted }}>{formatBRL(rP)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {diverg
                        ? <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>⚠️ Divergência</span>
                        : <span style={{ background: '#DCFCE7', color: '#166534', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>✓ OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalDivergencia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 520, width: '90%' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: S.navy, marginBottom: 6 }}>⚠️ Divergência de Receita Bruta</div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Competência <strong>{modalDivergencia.competencia}</strong></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[['Receita XMLs', modalDivergencia.receitaXML], ['Receita PGDAS-D', modalDivergencia.receitaPGDAS]].map(([label, valor]) => (
                <div key={label} style={{ background: S.bg, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: S.ghost, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: S.text }}>{formatBRL(valor)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: S.muted, marginBottom: 16, lineHeight: 1.5 }}>
              Retificar o PGDAS-D alterando a receita bruta pode impactar a alíquota dos 12 meses anteriores e gerar DAS complementar ou exclusão do Simples.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'interromper', label: '❌ Interromper esta competência', desc: 'Remove do cálculo.', color: S.red },
                { key: 'manter', label: '📄 Manter divergência — só planilha', desc: 'Gera detalhamento sem apurar crédito.', color: S.orange },
                { key: 'conservador', label: '✅ Usar receita declarada (conservador)', desc: 'Adota receita do PGDAS-D. Opção mais segura.', color: S.green },
              ].map(op => (
                <button key={op.key} onClick={() => resolverDivergencia(modalDivergencia.competencia, op.key)}
                  style={{ background: '#F8FAFC', border: `2px solid ${op.color}`, borderRadius: 8, padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: op.color }}>{op.label}</div>
                  <div style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>{op.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {resultados && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Crédito Total', valor: resultados.totalCredito, color: S.green },
              { label: 'Crédito PIS', valor: resultados.totalPIS, color: S.blue },
              { label: 'Crédito COFINS', valor: resultados.totalCOFINS, color: S.navy },
              { label: 'Competências', valor: resultados.linhasCredito.length, int: true, color: S.muted },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: S.ghost, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.int ? k.valor : formatBRL(k.valor)}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}` }}>
              {[{ key: 'credito', label: '📊 Crédito por Competência' }, { key: 'espelho', label: '📋 Espelho PGDAS-D' }, { key: 'detalhada', label: '📄 Planilha Detalhada' }].map(t => (
                <button key={t.key} onClick={() => setAba(t.key)}
                  style={{ padding: '12px 18px', fontSize: 13, fontWeight: aba === t.key ? 700 : 400,
                    color: aba === t.key ? S.blue : S.muted, background: 'none', border: 'none',
                    borderBottom: aba === t.key ? `2px solid ${S.blue}` : '2px solid transparent', cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={exportarCSV} style={{ margin: '8px 16px', background: S.green, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ⬇ Exportar CSV
              </button>
            </div>

            {aba === 'credito' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['Competência','Rec. Total','Rec. Mono','Rec. Normal','PIS Pago','PIS Devido','Créd. PIS','COFINS Pago','COFINS Devido','Créd. COFINS','Total'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '10px 12px', textAlign: h === 'Competência' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.linhasCredito.length === 0
                      ? Array(5).fill(null).map((_, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#F1F5F9' : '#fff' }}>
                            {Array(11).fill(null).map((_, j) => <td key={j} style={{ padding: '10px 12px', color: S.ghost, textAlign: 'right' }}>—</td>)}
                          </tr>
                        ))
                      : resultados.linhasCredito.map((l, i) => (
                          <tr key={l.competencia} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: S.text }}>{l.competencia}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaTotal)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.blue }}>{formatBRL(l.receitaMono)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaNormal)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisPago)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisDevido)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoPIS)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsPago)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsDevido)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoCOFINS)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(l.creditoTotal)}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                  {resultados.linhasCredito.length > 0 && (
                    <tfoot>
                      <tr style={{ background: S.navy }}>
                        <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                        {Array(5).fill(null).map((_, i) => <td key={i} />)}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(resultados.totalPIS)}</td>
                        {Array(2).fill(null).map((_, i) => <td key={i} />)}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(resultados.totalCOFINS)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700, fontSize: 14 }}>{formatBRL(resultados.totalCredito)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {aba === 'espelho' && (
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: S.muted, marginBottom: 16, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '12px 16px' }}>
                  📋 Use estes valores para retificar o PGDAS-D. A coluna <strong>RB Nova</strong> substitui a receita bruta declarada.
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: S.tableHeader }}>
                        {['Competência','RB Declarada','RB Nova','Rec. Mono','PIS Pago','PIS Apurado','COFINS Pago','COFINS Apurado','Créd. PIS','Créd. COFINS'].map(h => (
                          <th key={h} style={{ color: '#fff', padding: '10px 12px', textAlign: h === 'Competência' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.linhasEspelho.map((l, i) => (
                        <tr key={l.competencia} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: S.text }}>{l.competencia}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.ghost, textDecoration: 'line-through' }}>{formatBRL(l.receitaBrutaDeclarada)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.blue, fontWeight: 600 }}>{formatBRL(l.receitaBrutaNova)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaMonofasica)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.ghost, textDecoration: 'line-through' }}>{formatBRL(l.pisPago)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.blue, fontWeight: 600 }}>{formatBRL(l.pisApurado)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.ghost, textDecoration: 'line-through' }}>{formatBRL(l.cofinsPago)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.blue, fontWeight: 600 }}>{formatBRL(l.cofinsApurado)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoPIS)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoCOFINS)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {aba === 'detalhada' && (
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: S.muted, marginBottom: 16, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px' }}>
                  📄 Guarde esta planilha para eventual questionamento da fiscalização.
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: S.tableHeader }}>
                        {['Competência','Rec. XML','Rec. PGDAS','Rec. Mono','Rec. Normal','PIS Pago','COFINS Pago','PIS Devido','COFINS Devido','Créd. PIS','Créd. COFINS','Total'].map(h => (
                          <th key={h} style={{ color: '#fff', padding: '10px 12px', textAlign: h === 'Competência' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.linhasDetalhadas.map((l, i) => (
                        <tr key={l.competencia} style={{ background: l.divergencia ? '#FFF7ED' : i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: S.text }}>{l.competencia}{l.divergencia && <span style={{ marginLeft: 6, fontSize: 10, color: S.orange }}>⚠️</span>}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaXML)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaPGDAS)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.blue }}>{formatBRL(l.receitaMono)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaNormal)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisPago)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsPago)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisDevido)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsDevido)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: l.creditoPIS != null ? S.green : S.ghost, fontWeight: 600 }}>{l.creditoPIS != null ? formatBRL(l.creditoPIS) : '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: l.creditoCOFINS != null ? S.green : S.ghost, fontWeight: 600 }}>{l.creditoCOFINS != null ? formatBRL(l.creditoCOFINS) : '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: l.creditoTotal != null ? S.green : S.ghost, fontWeight: 700 }}>{l.creditoTotal != null ? formatBRL(l.creditoTotal) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {clienteObj && (
            <div style={{ marginTop: 24 }}>
              <AnalisadorIA modulo="MONOFASICOS" dadosContexto={{
                cliente: clienteObj.razao_social, cnpj: clienteObj.cnpj,
                periodo: `${mesInicio}/${anoInicio} a ${mesFim}/${anoFim}`,
                totalCredito: resultados.totalCredito, totalPIS: resultados.totalPIS,
                totalCOFINS: resultados.totalCOFINS, competencias: resultados.linhasCredito.length,
              }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}