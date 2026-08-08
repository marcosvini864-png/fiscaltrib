// AbaRecuperacaoMonofasicos.jsx
// Motor do Simples — Recuperação PIS/COFINS Monofásico
// Consome: diagnosticos_monofasicos, itens_fiscais, clientes
// Output: crédito por competência, espelho PGDAS-D, planilha exportável

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import AnalisadorIA from './AnalisadorIA';

const S = {
  navy: '#0B1F4D',
  blue: '#2563EB',
  green: '#16a34a',
  red: '#dc2626',
  orange: '#ea580c',
  bg: '#F8FAFC',
  text: '#0F172A',
  muted: '#334155',
  ghost: '#64748B',
  border: '#E2E8F0',
  tableHeader: '#4B5563',
};

const ALIQUOTAS_MONO_HISTORICO = {
  2019: { pis: 0.0275, cofins: 0.0275 },
  2020: { pis: 0.0275, cofins: 0.0275 },
  2021: { pis: 0.0275, cofins: 0.0275 },
  2022: { pis: 0.0275, cofins: 0.0275 },
  2023: { pis: 0.0275, cofins: 0.0275 },
  2024: { pis: 0.0275, cofins: 0.0275 },
  2025: { pis: 0.0275, cofins: 0.0275 },
};

function formatBRL(v) {
  if (v == null || isNaN(v)) return 'R$ —';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatPct(v) {
  if (v == null || isNaN(v)) return '—';
  return (v * 100).toFixed(4) + '%';
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function AbaRecuperacaoMonofasicos() {
  // ── Seleção ──────────────────────────────────────────────────────────────
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [anoInicio, setAnoInicio] = useState('2022');
  const [mesInicio, setMesInicio] = useState('01');
  const [anoFim, setAnoFim] = useState('2024');
  const [mesFim, setMesFim] = useState('12');

  // ── Dados carregados ──────────────────────────────────────────────────────
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // ── Divergência ───────────────────────────────────────────────────────────
  const [divergencias, setDivergencias] = useState([]); // [{competencia, receitaXML, receitaPGDAS}]
  const [modalDivergencia, setModalDivergencia] = useState(null); // competencia atual
  const [resolucoesDivergencia, setResolucoesDivergencia] = useState({}); // {competencia: 'interromper'|'manter'|'conservador'}

  // ── Resultados ────────────────────────────────────────────────────────────
  const [resultados, setResultados] = useState(null);
  const [abaResultado, setAbaResultado] = useState('credito');
  const [apurando, setApurando] = useState(false);

  // ── Busca clientes ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('clientes').select('id, razao_social, cnpj')
      .order('razao_social')
      .then(({ data }) => setClientes(data || []));
  }, []);

  // ── Busca diagnósticos e itens do cliente ─────────────────────────────────
  const buscarDados = useCallback(async () => {
    if (!clienteSelecionado) return;
    setCarregando(true);
    setErro('');
    setResultados(null);
    setDivergencias([]);
    setResolucoesDivergencia({});

    const compInicio = `${anoInicio}-${mesInicio}`;
    const compFim = `${anoFim}-${mesFim}`;

    const [{ data: diags, error: e1 }, { data: itensData, error: e2 }] = await Promise.all([
      supabase.from('diagnosticos_monofasicos')
        .select('*')
        .eq('cliente_id', clienteSelecionado)
        .gte('competencia', compInicio)
        .lte('competencia', compFim)
        .order('competencia'),
      supabase.from('itens_fiscais')
        .select('*')
        .eq('cliente_id', clienteSelecionado),
    ]);

    if (e1 || e2) {
      setErro('Erro ao buscar dados. Verifique se há diagnósticos importados no Diagnóstico Tributário.');
      setCarregando(false);
      return;
    }

    if (!diags || diags.length === 0) {
      setErro('Nenhum diagnóstico encontrado para este cliente e período. Importe os XMLs no Diagnóstico Tributário primeiro.');
      setCarregando(false);
      return;
    }

    setDiagnosticos(diags);
    setItens(itensData || []);
    setCarregando(false);
  }, [clienteSelecionado, anoInicio, mesInicio, anoFim, mesFim]);

  // ── Apuração principal ────────────────────────────────────────────────────
  const apurar = useCallback(() => {
    if (!diagnosticos.length) return;
    setApurando(true);
    setErro('');

    const itensMono = itens.filter(i =>
      i.classificacao === 'monofasico' || i.classificacao === 'st'
    );
    const ncmsMono = new Set(itensMono.map(i => i.ncm).filter(Boolean));

    const novasDivergencias = [];
    const competenciasProcessadas = [];

    diagnosticos.forEach(diag => {
      const resultado_json = diag.resultado_json || {};
      const receitaXML = resultado_json.receita_bruta_xml || 0;
      const receitaPGDAS = resultado_json.receita_bruta_pgdas || diag.receita_bruta_declarada || 0;
      const diff = Math.abs(receitaXML - receitaPGDAS);
      const tolerancia = 0.01;

      if (diff > tolerancia && receitaPGDAS > 0) {
        novasDivergencias.push({
          competencia: diag.competencia,
          receitaXML,
          receitaPGDAS,
          diff,
        });
      }

      competenciasProcessadas.push({
        competencia: diag.competencia,
        diag,
        receitaXML,
        receitaPGDAS,
        ncmsMono,
        resultado_json,
      });
    });

    setDivergencias(novasDivergencias);

    if (novasDivergencias.length > 0) {
      // Abre modal para a primeira divergência não resolvida
      const primeira = novasDivergencias.find(
        d => !resolucoesDivergencia[d.competencia]
      );
      if (primeira) {
        setModalDivergencia(primeira);
        setApurando(false);
        return;
      }
    }

    // Todas divergências resolvidas — calcula resultados
    calcularResultados(competenciasProcessadas);
  }, [diagnosticos, itens, resolucoesDivergencia]);

  const calcularResultados = useCallback((competenciasProcessadas) => {
    const linhasCredito = [];
    const linhasEspelho = [];
    const linhasDetalhadas = [];

    competenciasProcessadas.forEach(({ competencia, diag, receitaXML, receitaPGDAS, ncmsMono, resultado_json }) => {
      const ano = parseInt(competencia.split('-')[0]);
      const aliq = ALIQUOTAS_MONO_HISTORICO[ano] || ALIQUOTAS_MONO_HISTORICO[2024];
      const resolucao = resolucoesDivergencia[competencia] || 'conservador';

      // Receita monofásica apurada nos XMLs
      const receitaMono = resultado_json.total_monofasico || resultado_json.credito_monofasico || 0;
      const receitaNormal = (receitaXML || receitaPGDAS) - receitaMono;

      // Aplica resolução de divergência
      let receitaMonoFinal = receitaMono;
      let receitaNormalFinal = receitaNormal;

      if (resolucao === 'conservador' && receitaPGDAS > 0) {
        const diff = receitaPGDAS - receitaXML;
        if (diff > 0) receitaNormalFinal += diff;
        else receitaMonoFinal = Math.max(0, receitaMonoFinal + diff);
      } else if (resolucao === 'manter') {
        // Gera só detalhamento, sem crédito
        linhasDetalhadas.push({
          competencia,
          receitaXML,
          receitaPGDAS,
          receitaMono: receitaMonoFinal,
          receitaNormal: receitaNormalFinal,
          pisPago: resultado_json.pis_recolhido || 0,
          cofinsPago: resultado_json.cofins_recolhido || 0,
          pisDevido: 0,
          cofinsDevido: 0,
          creditoPIS: null,
          creditoCOFINS: null,
          creditoTotal: null,
          divergencia: true,
        });
        return;
      }

      // PIS/COFINS que deveria ter sido pago (só sobre receita normal)
      const pisDevido = receitaNormalFinal * aliq.pis;
      const cofinsDevido = receitaNormalFinal * aliq.cofins;

      // PIS/COFINS que foi pago (do PGDAS-D)
      const pisPago = resultado_json.pis_recolhido || 0;
      const cofinsPago = resultado_json.cofins_recolhido || 0;

      const creditoPIS = Math.max(0, pisPago - pisDevido);
      const creditoCOFINS = Math.max(0, cofinsPago - cofinsDevido);
      const creditoTotal = creditoPIS + creditoCOFINS;

      linhasCredito.push({
        competencia,
        receitaTotal: receitaPGDAS || receitaXML,
        receitaMono: receitaMonoFinal,
        receitaNormal: receitaNormalFinal,
        pisDevido,
        cofinsDevido,
        pisPago,
        cofinsPago,
        creditoPIS,
        creditoCOFINS,
        creditoTotal,
        resolucao,
      });

      linhasEspelho.push({
        competencia,
        receitaBrutaDeclarada: receitaPGDAS,
        receitaBrutaNova: receitaNormalFinal,
        receitaMonofasica: receitaMonoFinal,
        pisPago,
        cofinsApurado: cofinsDevido,
        pisApurado: pisDevido,
        cofinsPago,
        creditoPIS,
        creditoCOFINS,
      });

      linhasDetalhadas.push({
        competencia,
        receitaXML,
        receitaPGDAS,
        receitaMono: receitaMonoFinal,
        receitaNormal: receitaNormalFinal,
        pisPago,
        cofinsPago,
        pisDevido,
        cofinsDevido,
        creditoPIS,
        creditoCOFINS,
        creditoTotal,
        divergencia: false,
      });
    });

    const totalCredito = linhasCredito.reduce((a, l) => a + (l.creditoTotal || 0), 0);
    const totalPIS = linhasCredito.reduce((a, l) => a + (l.creditoPIS || 0), 0);
    const totalCOFINS = linhasCredito.reduce((a, l) => a + (l.creditoCOFINS || 0), 0);

    setResultados({ linhasCredito, linhasEspelho, linhasDetalhadas, totalCredito, totalPIS, totalCOFINS });
    setApurando(false);
  }, [resolucoesDivergencia]);

  // Quando todas divergências são resolvidas, continua apuração
  useEffect(() => {
    if (!apurando && divergencias.length > 0 && diagnosticos.length > 0) {
      const todasResolvidas = divergencias.every(d => resolucoesDivergencia[d.competencia]);
      if (todasResolvidas) {
        const itensMono = itens.filter(i => i.classificacao === 'monofasico' || i.classificacao === 'st');
        const ncmsMono = new Set(itensMono.map(i => i.ncm).filter(Boolean));
        const comp = diagnosticos.map(diag => ({
          competencia: diag.competencia,
          diag,
          receitaXML: diag.resultado_json?.receita_bruta_xml || 0,
          receitaPGDAS: diag.resultado_json?.receita_bruta_pgdas || diag.receita_bruta_declarada || 0,
          ncmsMono,
          resultado_json: diag.resultado_json || {},
        }));
        calcularResultados(comp);
      }
    }
  }, [resolucoesDivergencia]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportarCSV = () => {
    if (!resultados) return;
    const headers = ['Competência','Receita Total','Receita Monofásica','Receita Normal',
      'PIS Pago','COFINS Pago','PIS Devido','COFINS Devido','Crédito PIS','Crédito COFINS','Crédito Total'];
    const rows = resultados.linhasDetalhadas.map(l => [
      l.competencia,
      l.receitaPGDAS?.toFixed(2),
      l.receitaMono?.toFixed(2),
      l.receitaNormal?.toFixed(2),
      l.pisPago?.toFixed(2),
      l.cofinsPago?.toFixed(2),
      l.pisDevido?.toFixed(2),
      l.cofinsDevido?.toFixed(2),
      l.creditoPIS != null ? l.creditoPIS.toFixed(2) : 'Divergência mantida',
      l.creditoCOFINS != null ? l.creditoCOFINS.toFixed(2) : 'Divergência mantida',
      l.creditoTotal != null ? l.creditoTotal.toFixed(2) : 'Divergência mantida',
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const cliente = clientes.find(c => c.id === clienteSelecionado);
    a.download = `recuperacao_monofasico_${cliente?.cnpj || 'cliente'}_${anoInicio}-${anoFim}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const clienteObj = clientes.find(c => c.id === clienteSelecionado);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: S.bg, minHeight: '100vh', padding: '24px 28px', fontFamily: 'Inter, sans-serif' }}>

      {/* Banner */}
      <div style={{ background: S.navy, borderRadius: 10, padding: '14px 20px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>💰</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            Recuperação PIS/COFINS Monofásico
          </div>
          <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
            Motor do Simples Nacional · Apuração de créditos por competência
          </div>
        </div>
      </div>

      {/* Seleção */}
      <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10,
        padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: S.navy, marginBottom: 14 }}>
          Selecionar Cliente e Período
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          <div style={{ flex: 2, minWidth: 220 }}>
            <label style={{ fontSize: 12, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Cliente
            </label>
            <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)}
              style={{ width: '100%', border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px',
                fontSize: 13, color: S.text, background: '#fff' }}>
              <option value=''>Selecione um cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.razao_social} — {c.cnpj}</option>
              ))}
            </select>
          </div>

          {/* Range de competência */}
          {[['De', anoInicio, setAnoInicio, mesInicio, setMesInicio],
            ['Até', anoFim, setAnoFim, mesFim, setMesFim]].map(([label, ano, setAno, mes, setMes]) => (
            <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  {label} — Mês
                </label>
                <select value={mes} onChange={e => setMes(e.target.value)}
                  style={{ border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: S.text }}>
                  {MESES.map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Ano
                </label>
                <select value={ano} onChange={e => setAno(e.target.value)}
                  style={{ border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: S.text }}>
                  {[2019,2020,2021,2022,2023,2024,2025].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button onClick={buscarDados} disabled={!clienteSelecionado || carregando}
            style={{ background: S.blue, color: '#fff', border: 'none', borderRadius: 8,
              padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {carregando ? 'Buscando...' : 'Buscar Dados'}
          </button>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: '#FEF2F2', border: `1px solid #FECACA`, borderRadius: 8,
          padding: '12px 16px', color: S.red, fontSize: 13, marginBottom: 20 }}>
          ⚠️ {erro}
        </div>
      )}

      {/* KPIs após busca */}
      {diagnosticos.length > 0 && !resultados && (
        <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10,
          padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: S.text }}>{clienteObj?.razao_social}</div>
              <div style={{ fontSize: 12, color: S.ghost, marginTop: 2 }}>
                {diagnosticos.length} competência(s) encontrada(s) · {itens.filter(i => i.classificacao === 'monofasico' || i.classificacao === 'st').length} itens monofásicos classificados
              </div>
            </div>
            <button onClick={apurar} disabled={apurando}
              style={{ background: S.green, color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {apurando ? 'Apurando...' : '⚡ Apurar Créditos'}
            </button>
          </div>

          {/* Preview das competências */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: S.tableHeader }}>
                {['Competência','Receita XML','Receita PGDAS-D','Itens Mono','Status'].map(h => (
                  <th key={h} style={{ color: '#fff', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diagnosticos.map((d, i) => {
                const rj = d.resultado_json || {};
                const temDiverg = Math.abs((rj.receita_bruta_xml || 0) - (rj.receita_bruta_pgdas || d.receita_bruta_declarada || 0)) > 0.01;
                return (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                    <td style={{ padding: '8px 12px', color: S.text, fontWeight: 600 }}>{d.competencia}</td>
                    <td style={{ padding: '8px 12px', color: S.muted }}>{formatBRL(rj.receita_bruta_xml)}</td>
                    <td style={{ padding: '8px 12px', color: S.muted }}>{formatBRL(rj.receita_bruta_pgdas || d.receita_bruta_declarada)}</td>
                    <td style={{ padding: '8px 12px', color: S.muted }}>{rj.total_itens_mono || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {temDiverg
                        ? <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>⚠️ Divergência</span>
                        : <span style={{ background: '#DCFCE7', color: '#166534', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>✓ OK</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Divergência */}
      {modalDivergencia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 520, width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: S.navy, marginBottom: 6 }}>
              ⚠️ Divergência de Receita Bruta
            </div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>
              Competência <strong>{modalDivergencia.competencia}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                ['Receita apurada (XMLs)', modalDivergencia.receitaXML],
                ['Receita declarada (PGDAS-D)', modalDivergencia.receitaPGDAS],
              ].map(([label, valor]) => (
                <div key={label} style={{ background: S.bg, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: S.ghost, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: S.text }}>{formatBRL(valor)}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: S.muted, marginBottom: 16, lineHeight: 1.5 }}>
              A retificação do PGDAS-D alterando a receita bruta pode impactar a alíquota nominal/efetiva dos 12 meses anteriores e gerar DAS complementar ou exclusão do Simples. Escolha como proceder:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'interromper', label: '❌ Interromper apuração desta competência', desc: 'Remove esta competência do cálculo.', color: S.red },
                { key: 'manter', label: '📄 Manter divergência — gerar só planilha', desc: 'Gera detalhamento das receitas sem apurar crédito.', color: S.orange },
                { key: 'conservador', label: '✅ Usar receita declarada (conservador)', desc: 'Adota a receita do PGDAS-D e ajusta a segregação. Opção mais segura.', color: S.green },
              ].map(op => (
                <button key={op.key}
                  onClick={() => {
                    setResolucoesDivergencia(prev => ({ ...prev, [modalDivergencia.competencia]: op.key }));
                    // Verifica próxima divergência não resolvida
                    const proxima = divergencias.find(
                      d => d.competencia !== modalDivergencia.competencia && !resolucoesDivergencia[d.competencia]
                    );
                    setModalDivergencia(proxima || null);
                    if (!proxima) setApurando(true);
                  }}
                  style={{ background: '#F8FAFC', border: `2px solid ${op.color}`, borderRadius: 8,
                    padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: op.color }}>{op.label}</div>
                  <div style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>{op.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultados && (
        <>
          {/* KPIs totais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Crédito Total', valor: resultados.totalCredito, color: S.green },
              { label: 'Crédito PIS', valor: resultados.totalPIS, color: S.blue },
              { label: 'Crédito COFINS', valor: resultados.totalCOFINS, color: S.navy },
              { label: 'Competências', valor: resultados.linhasCredito.length, format: 'int', color: S.muted },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: S.ghost, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>
                  {k.format === 'int' ? k.valor : formatBRL(k.valor)}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs resultado */}
          <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}` }}>
              {[
                { key: 'credito', label: '📊 Crédito por Competência' },
                { key: 'espelho', label: '📋 Espelho PGDAS-D' },
                { key: 'detalhada', label: '📄 Planilha Detalhada' },
              ].map(t => (
                <button key={t.key} onClick={() => setAbaResultado(t.key)}
                  style={{ padding: '12px 18px', fontSize: 13, fontWeight: abaResultado === t.key ? 700 : 400,
                    color: abaResultado === t.key ? S.blue : S.muted, background: 'none', border: 'none',
                    borderBottom: abaResultado === t.key ? `2px solid ${S.blue}` : '2px solid transparent',
                    cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={exportarCSV}
                style={{ margin: '8px 16px', background: S.green, color: '#fff', border: 'none',
                  borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ⬇ Exportar CSV
              </button>
            </div>

            <div style={{ padding: '0' }}>

              {/* Tab: Crédito por Competência */}
              {abaResultado === 'credito' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['Competência','Receita Total','Receita Monofásica','Receita Tributável',
                        'PIS Pago','PIS Devido','Crédito PIS','COFINS Pago','COFINS Devido','Crédito COFINS','Crédito Total'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '10px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {h === 'Competência' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.linhasCredito.length === 0 ? (
                      Array(5).fill(null).map((_, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#F1F5F9' : '#fff' }}>
                          {Array(11).fill(null).map((_, j) => (
                            <td key={j} style={{ padding: '10px 12px', color: S.ghost }}>—</td>
                          ))}
                        </tr>
                      ))
                    ) : resultados.linhasCredito.map((l, i) => (
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
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: S.green, fontWeight: 700, fontSize: 13 }}>{formatBRL(l.creditoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {resultados.linhasCredito.length > 0 && (
                    <tfoot>
                      <tr style={{ background: S.navy }}>
                        <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                        {Array(5).fill(null).map((_, i) => <td key={i} style={{ padding: '10px 12px' }} />)}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(resultados.totalPIS)}</td>
                        {Array(2).fill(null).map((_, i) => <td key={i} style={{ padding: '10px 12px' }} />)}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(resultados.totalCOFINS)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700, fontSize: 14 }}>{formatBRL(resultados.totalCredito)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}

              {/* Tab: Espelho PGDAS-D */}
              {abaResultado === 'espelho' && (
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, color: S.muted, marginBottom: 16, lineHeight: 1.6,
                    background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '12px 16px' }}>
                    📋 <strong>Guia de retificação:</strong> Use os valores abaixo para retificar o PGDAS-D junto à Receita Federal. 
                    A coluna "Receita Bruta Nova" substitui a receita bruta original de cada competência. 
                    Os campos de PIS/COFINS devem ser ajustados conforme a coluna "Apurado".
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: S.tableHeader }}>
                        {['Competência','RB Declarada','RB Nova','Receita Monofásica',
                          'PIS Pago','PIS Apurado','COFINS Pago','COFINS Apurado','Crédito PIS','Crédito COFINS'].map(h => (
                          <th key={h} style={{ color: '#fff', padding: '10px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {h === 'Competência' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
                          </th>
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
              )}

              {/* Tab: Planilha Detalhada */}
              {abaResultado === 'detalhada' && (
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, color: S.muted, marginBottom: 16, lineHeight: 1.6,
                    background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px' }}>
                    📄 Guarde esta planilha para eventual questionamento da fiscalização. 
                    Competências com divergência mantida aparecem destacadas — para essas, a apuração do crédito não foi realizada.
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: S.tableHeader }}>
                        {['Competência','Receita XML','Receita PGDAS-D','Rec. Monofásica','Rec. Normal',
                          'PIS Pago','COFINS Pago','PIS Devido','COFINS Devido','Crédito PIS','Crédito COFINS','Total'].map(h => (
                          <th key={h} style={{ color: '#fff', padding: '10px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {h === 'Competência' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.linhasDetalhadas.map((l, i) => (
                        <tr key={l.competencia} style={{
                          background: l.divergencia ? '#FFF7ED' : i % 2 === 0 ? '#F8FAFC' : '#fff'
                        }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: S.text }}>
                            {l.competencia}
                            {l.divergencia && <span style={{ marginLeft: 6, fontSize: 10, color: S.orange }}>⚠️ divergência</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaXML)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaPGDAS)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.blue }}>{formatBRL(l.receitaMono)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaNormal)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisPago)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsPago)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisDevido)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsDevido)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: l.creditoPIS != null ? S.green : S.ghost, fontWeight: 600 }}>
                            {l.creditoPIS != null ? formatBRL(l.creditoPIS) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: l.creditoCOFINS != null ? S.green : S.ghost, fontWeight: 600 }}>
                            {l.creditoCOFINS != null ? formatBRL(l.creditoCOFINS) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: l.creditoTotal != null ? S.green : S.ghost, fontWeight: 700 }}>
                            {l.creditoTotal != null ? formatBRL(l.creditoTotal) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Analisador IA */}
          {resultados && clienteObj && (
            <div style={{ marginTop: 24 }}>
              <AnalisadorIA
                modulo="MONOFASICOS"
                dadosContexto={{
                  cliente: clienteObj.razao_social,
                  cnpj: clienteObj.cnpj,
                  periodo: `${mesInicio}/${anoInicio} a ${mesFim}/${anoFim}`,
                  totalCredito: resultados.totalCredito,
                  totalPIS: resultados.totalPIS,
                  totalCOFINS: resultados.totalCOFINS,
                  competencias: resultados.linhasCredito.length,
                  divergencias: divergencias.length,
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}