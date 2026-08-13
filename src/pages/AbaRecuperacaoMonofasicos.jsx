/**
 * AbaRecuperacaoMonofasicos.jsx - e-FiscalTribe®
 * Versao 2.1 - 12/08/2026
 * Sprint 3B corrigido — estrutura JSX do Controle de Competencias
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import AnalisadorIA from '../AnalisadorIA';
import ConciliacaoCFOP from './ConciliacaoCFOP'

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

function fmtData(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR');
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array(cols).fill(null).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <div style={{ height: 14, borderRadius: 4, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonKPI() {
  return (
    <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ height: 11, width: 80, borderRadius: 4, background: '#E2E8F0', marginBottom: 10 }} />
      <div style={{ height: 22, width: 120, borderRadius: 4, background: '#E2E8F0' }} />
    </div>
  );
}

function StatusCompBadge({ status }) {
  const map = {
    auditado:    { bg: '#f0fdf4', color: '#16a34a', border: '#86efac', label: 'Auditado' },
    pendente:    { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: 'Pendente' },
    divergencia: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Divergencia' },
    processando: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Processando' },
  }
  const b = map[status] || map.pendente
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
      {b.label}
    </span>
  )
}

export default function AbaRecuperacaoMonofasicos({ clientePre } = {}) {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(clientePre?.id || '');
  const [anoInicio, setAnoInicio] = useState('2022');
  const [mesInicio, setMesInicio] = useState('01');
  const [anoFim, setAnoFim] = useState('2024');
  const [mesFim, setMesFim] = useState('12');
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [divergencias, setDivergencias] = useState([]);
  const [modalDivergencia, setModalDivergencia] = useState(null);
  const [resolucoes, setResolucoes] = useState({});
  const [resultados, setResultados] = useState(null);
  const [aba, setAba] = useState('credito');
  const [apurando, setApurando] = useState(false);
  const [competencias, setCompetencias] = useState([]);
  const [loadingComp, setLoadingComp] = useState(false);
  const [excluindoComp, setExcluindoComp] = useState(null);
  const [paginaComp, setPaginaComp] = useState(1);
  const [porPaginaComp, setPorPaginaComp] = useState(10);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    supabase.from('clientes').select('id, razao_social, cnpj')
      .order('razao_social')
      .then(({ data }) => setClientes(data || []));
  }, []);

  useEffect(() => {
    if (clientePre?.id) setClienteSelecionado(clientePre.id);
  }, [clientePre?.id]);

  useEffect(() => {
    if (clienteSelecionado) carregarCompetencias();
  }, [clienteSelecionado]);

  async function carregarCompetencias() {
    setLoadingComp(true);
    const { data } = await supabase
      .from('empresa_competencias')
      .select('*')
      .eq('cliente_id', clienteSelecionado)
      .order('competencia', { ascending: false });
    setCompetencias(data || []);
    setLoadingComp(false);
  }

  async function excluirCompetencia(id) {
    if (!window.confirm('Excluir esta competencia?')) return;
    setExcluindoComp(id);
    await supabase.from('empresa_competencias').delete().eq('id', id);
    await carregarCompetencias();
    setExcluindoComp(null);
  }

  const buscarDados = useCallback(async () => {
    if (!clienteSelecionado) return;
    setCarregando(true);
    setErro('');
    setResultados(null);
    setDivergencias([]);
    setResolucoes({});
    const compInicio = `${anoInicio}-${mesInicio}`;
    const compFim = `${anoFim}-${mesFim}`;
    const { data: diags, error: e1 } = await supabase
      .from('diagnosticos_monofasicos').select('*')
      .eq('cliente_id', clienteSelecionado)
      .gte('competencia', compInicio)
      .lte('competencia', compFim)
      .order('competencia');
    if (e1) { setErro('Erro ao buscar dados.'); setCarregando(false); return; }
    if (!diags || diags.length === 0) {
      setErro('Nenhum diagnostico encontrado. Importe os XMLs no Diagnostico Tributario primeiro.');
      setCarregando(false); return;
    }
    setDiagnosticos(diags);
    setCarregando(false);
  }, [clienteSelecionado, anoInicio, mesInicio, anoFim, mesFim]);

  const calcular = useCallback((comps, resolsAtual) => {
    const linhasCredito = [], linhasEspelho = [], linhasDetalhadas = [];
    comps.forEach(({ competencia, receitaXML, receitaPGDAS, rj }) => {
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
    const comps = diagnosticos.map(diag => {
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
    calcular(comps, resolucoes);
  }, [diagnosticos, resolucoes, calcular]);

  const resolverDivergencia = (competencia, opcao) => {
    const novas = { ...resolucoes, [competencia]: opcao };
    setResolucoes(novas);
    const proxima = divergencias.find(d => d.competencia !== competencia && !novas[d.competencia]);
    if (proxima) { setModalDivergencia(proxima); return; }
    setModalDivergencia(null);
    const comps = diagnosticos.map(diag => {
      const rj = diag.resultado_json || {};
      return { competencia: diag.competencia, receitaXML: rj.receita_bruta_xml||0,
        receitaPGDAS: rj.receita_bruta_pgdas||diag.receita_bruta_declarada||0, rj };
    });
    calcular(comps, novas);
  };

  const exportarCSV = () => {
    if (!resultados) return;
    const headers = ['Competencia','Rec. Total','Rec. Mono','Rec. Normal','PIS Pago','COFINS Pago','PIS Devido','COFINS Devido','Cred. PIS','Cred. COFINS','Total'];
    const rows = resultados.linhasDetalhadas.map(l => [
      l.competencia, l.receitaPGDAS?.toFixed(2), l.receitaMono?.toFixed(2), l.receitaNormal?.toFixed(2),
      l.pisPago?.toFixed(2), l.cofinsPago?.toFixed(2), l.pisDevido?.toFixed(2), l.cofinsDevido?.toFixed(2),
      l.creditoPIS != null ? l.creditoPIS.toFixed(2) : 'divergencia',
      l.creditoCOFINS != null ? l.creditoCOFINS.toFixed(2) : 'divergencia',
      l.creditoTotal != null ? l.creditoTotal.toFixed(2) : 'divergencia',
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
  const totalPaginasComp = Math.max(1, Math.ceil(competencias.length / porPaginaComp));
  const competenciasPagina = competencias.slice((paginaComp - 1) * porPaginaComp, paginaComp * porPaginaComp);

  return (
    <div style={{ background: S.bg, minHeight: '100vh', padding: '16px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>

      {/* Banner */}
      <div style={{ background: S.navy, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>&#128176;</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Recuperacao PIS/COFINS Monofasico</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Motor do Simples Nacional - Apuracao por competencia</div>
        </div>
      </div>

      {/* Selecao */}
      <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: S.navy, marginBottom: 12 }}>Selecionar Cliente e Periodo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Cliente</label>
            <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)}
              style={{ width: '100%', border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: S.text, background: '#fff', boxSizing: 'border-box' }}>
              <option value=''>Selecione um cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} - {c.cnpj}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[['De', anoInicio, setAnoInicio, mesInicio, setMesInicio], ['Ate', anoFim, setAnoFim, mesFim, setMesFim]].map(([label, ano, setAno, mes, setMes]) => (
              <div key={label} style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flex: 1, minWidth: 180 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>{label} - Mes</label>
                  <select value={mes} onChange={e => setMes(e.target.value)} style={{ width: '100%', border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 8px', fontSize: 12, color: S.text, boxSizing: 'border-box' }}>
                    {MESES.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: S.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Ano</label>
                  <select value={ano} onChange={e => setAno(e.target.value)} style={{ width: '100%', border: `1px solid ${S.border}`, borderRadius: 7, padding: '7px 8px', fontSize: 12, color: S.text, boxSizing: 'border-box' }}>
                    {[2019,2020,2021,2022,2023,2024,2025].map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button onClick={buscarDados} disabled={!clienteSelecionado || carregando}
              style={{ background: S.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !clienteSelecionado ? 0.5 : 1 }}>
              {carregando ? 'Buscando...' : 'Buscar Dados'}
            </button>
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: '#FEF2F2', border: `1px solid #FECACA`, borderRadius: 8, padding: '12px 16px', color: S.red, fontSize: 13, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {/* Skeleton */}
      {carregando && (
        <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {Array(4).fill(null).map((_, i) => <SkeletonKPI key={i} />)}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{Array(5).fill(null).map((_, i) => <SkeletonRow key={i} cols={4} />)}</tbody>
          </table>
        </div>
      )}

      {/* Preview competencias */}
      {diagnosticos.length > 0 && !resultados && !carregando && (
        <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: S.text }}>{clienteObj?.razao_social}</div>
              <div style={{ fontSize: 12, color: S.ghost, marginTop: 2 }}>{diagnosticos.length} competencia(s) encontrada(s)</div>
            </div>
            <button onClick={apurar} disabled={apurando}
              style={{ background: S.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {apurando ? 'Apurando...' : 'Apurar Creditos'}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: S.tableHeader }}>
                  {['Competencia','Receita XML','Receita PGDAS-D','Status'].map(h => (
                    <th key={h} style={{ color: '#fff', padding: '8px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
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
                          ? <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Divergencia</span>
                          : <span style={{ background: '#DCFCE7', color: '#166534', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Divergencia */}
      {modalDivergencia && (
        <ConciliacaoCFOP
          clienteId={clienteSelecionado}
          competencia={modalDivergencia.competencia}
          receitaDeclarada={modalDivergencia.receitaPGDAS}
          receitaApurada={modalDivergencia.receitaXML}
          cfopsXML={modalDivergencia.cfopsXML || []}
          onInterromper={() => resolverDivergencia(modalDivergencia.competencia, 'interromper')}
          onManter={() => resolverDivergencia(modalDivergencia.competencia, 'manter')}
          onProsseguir={(receitaFinal) => resolverDivergencia(modalDivergencia.competencia, 'conservador')}
          onFechar={() => setModalDivergencia(null)}
        />
      )}

      {/* CONTROLE DE COMPETENCIAS */}
      {clienteSelecionado && (
        <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.navy }}>Controle de Competencias</div>
            <button onClick={carregarCompetencias}
              style={{ padding: '5px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
              Atualizar
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
              <thead>
                <tr style={{ background: S.tableHeader }}>
                  {['Competencia','PGDAS-D','XMLs','NF-es','PIS/COFINS Pago','Credito Apurado','Processado em','Status','Acoes'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingComp ? (
                  Array(porPaginaComp).fill(null).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 13, width: 60, borderRadius: 4, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 13, width: 20, borderRadius: 4, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 13, width: 20, borderRadius: 4, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 13, width: 30, borderRadius: 4, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 13, width: 80, borderRadius: 4, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 13, width: 80, borderRadius: 4, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 13, width: 70, borderRadius: 4, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 18, width: 60, borderRadius: 99, background: '#E2E8F0' }} /></td>
                      <td style={{ padding: '10px 12px' }}><div style={{ height: 24, width: 80, borderRadius: 6, background: '#E2E8F0' }} /></td>
                    </tr>
                  ))
                ) : competencias.length === 0 ? (
                  Array(porPaginaComp).fill(null).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#CBD5E1' }}>{`${String((i % 12) + 1).padStart(2,'0')}/2024`}</td>
                      <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>-</td>
                      <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>-</td>
                      <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>-</td>
                      <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>R$ -</td>
                      <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>R$ -</td>
                      <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>-</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: '#F1F5F9', color: '#CBD5E1', border: '1px solid #E2E8F0', borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>Aguardando</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <div style={{ height: 24, width: 40, borderRadius: 4, background: '#F1F5F9' }} />
                          <div style={{ height: 24, width: 24, borderRadius: 4, background: '#F1F5F9' }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  competenciasPagina.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: S.navy }}>{c.competencia}</td>
                      <td style={{ padding: '9px 12px' }}>
                        {c.pgdas_carregado ? <span style={{ color: S.green, fontWeight: 700 }}>V</span> : <span style={{ color: S.ghost }}>-</span>}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {c.xmls_carregados ? <span style={{ color: S.green, fontWeight: 700 }}>V</span> : <span style={{ color: S.ghost }}>-</span>}
                      </td>
                      <td style={{ padding: '9px 12px', color: S.muted }}>{c.total_nfs || '-'}</td>
                      <td style={{ padding: '9px 12px', color: S.muted }}>{c.total_pis_cofins_pago > 0 ? formatBRL(c.total_pis_cofins_pago) : '-'}</td>
                      <td style={{ padding: '9px 12px', color: c.credito_apurado > 0 ? S.green : S.ghost, fontWeight: c.credito_apurado > 0 ? 700 : 400 }}>
                        {c.credito_apurado > 0 ? formatBRL(c.credito_apurado) : '-'}
                      </td>
                      <td style={{ padding: '9px 12px', color: S.ghost, fontSize: 11 }}>{fmtData(c.processado_em)}</td>
                      <td style={{ padding: '9px 12px' }}><StatusCompBadge status={c.status} /></td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={{ padding: '3px 10px', background: '#eff6ff', color: S.blue, border: `1px solid #bfdbfe`, borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                            Ver
                          </button>
                          <button onClick={() => excluirCompetencia(c.id)} disabled={excluindoComp === c.id}
                            style={{ padding: '3px 10px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                            {excluindoComp === c.id ? '...' : 'X'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.ghost, flexWrap: 'wrap', gap: 8 }}>
            <span>
              {loadingComp ? 'Carregando...' : competencias.length === 0 ? 'Importe XMLs e PGDAS-D para registrar competencias' : `${competencias.length} competencia(s) - Pagina ${paginaComp} de ${totalPaginasComp}`}
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {competencias.length > 0 && (
                <>
                  {[['«', () => setPaginaComp(1), paginaComp === 1],
                    ['<', () => setPaginaComp(p => Math.max(1, p - 1)), paginaComp === 1],
                    ['>', () => setPaginaComp(p => Math.min(totalPaginasComp, p + 1)), paginaComp === totalPaginasComp],
                    ['»', () => setPaginaComp(totalPaginasComp), paginaComp === totalPaginasComp]
                  ].map(([l, fn, dis], i) => (
                    <button key={i} onClick={fn} disabled={dis}
                      style={{ padding: '3px 8px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: dis ? 'not-allowed' : 'pointer', color: dis ? '#CBD5E1' : S.text, fontSize: 12 }}>
                      {l}
                    </button>
                  ))}
                </>
              )}
              <select value={porPaginaComp} onChange={e => { setPorPaginaComp(Number(e.target.value)); setPaginaComp(1); }}
                style={{ marginLeft: 4, padding: '3px 8px', border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {[10, 25, 50].map(n => <option key={n} value={n}>{n} por pagina</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultados && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Credito Total', valor: resultados.totalCredito, color: S.green },
              { label: 'Credito PIS', valor: resultados.totalPIS, color: S.blue },
              { label: 'Credito COFINS', valor: resultados.totalCOFINS, color: S.navy },
              { label: 'Competencias', valor: resultados.linhasCredito.length, int: true, color: S.muted },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: S.ghost, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.int ? k.valor : formatBRL(k.valor)}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}`, overflowX: 'auto' }}>
              {[{ key: 'credito', label: 'Credito' }, { key: 'espelho', label: 'Espelho PGDAS-D' }, { key: 'detalhada', label: 'Planilha' }].map(t => (
                <button key={t.key} onClick={() => setAba(t.key)}
                  style={{ padding: '11px 16px', fontSize: 12, fontWeight: aba === t.key ? 700 : 400,
                    color: aba === t.key ? S.blue : S.muted, background: 'none', border: 'none',
                    borderBottom: aba === t.key ? `2px solid ${S.blue}` : '2px solid transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={exportarCSV} style={{ margin: '6px 12px', background: S.green, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                CSV
              </button>
            </div>

            {aba === 'credito' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['Competencia','Rec. Total','Rec. Mono','Rec. Normal','PIS Pago','PIS Devido','Cred. PIS','COFINS Pago','COFINS Devido','Cred. COFINS','Total'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '10px 10px', textAlign: h === 'Competencia' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.linhasCredito.length === 0
                      ? Array(5).fill(null).map((_, i) => <SkeletonRow key={i} cols={11} />)
                      : resultados.linhasCredito.map((l, i) => (
                          <tr key={l.competencia} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                            <td style={{ padding: '9px 10px', fontWeight: 600, color: S.text, whiteSpace: 'nowrap' }}>{l.competencia}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaTotal)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.blue }}>{formatBRL(l.receitaMono)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaNormal)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisPago)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisDevido)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoPIS)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsPago)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsDevido)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoCOFINS)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(l.creditoTotal)}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                  {resultados.linhasCredito.length > 0 && (
                    <tfoot>
                      <tr style={{ background: S.navy }}>
                        <td style={{ padding: '9px 10px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                        {Array(5).fill(null).map((_, i) => <td key={i} />)}
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(resultados.totalPIS)}</td>
                        {Array(2).fill(null).map((_, i) => <td key={i} />)}
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(resultados.totalCOFINS)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(resultados.totalCredito)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {aba === 'espelho' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: S.muted, marginBottom: 14, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', lineHeight: 1.5 }}>
                  Use estes valores para retificar o PGDAS-D. RB Nova substitui a receita bruta declarada de cada competencia.
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: S.tableHeader }}>
                        {['Competencia','RB Declarada','RB Nova','Rec. Mono','PIS Pago','PIS Apurado','COFINS Pago','COFINS Apurado','Cred. PIS','Cred. COFINS'].map(h => (
                          <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: h === 'Competencia' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.linhasEspelho.map((l, i) => (
                        <tr key={l.competencia} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                          <td style={{ padding: '9px 10px', fontWeight: 600, color: S.text, whiteSpace: 'nowrap' }}>{l.competencia}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.ghost, textDecoration: 'line-through' }}>{formatBRL(l.receitaBrutaDeclarada)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.blue, fontWeight: 600 }}>{formatBRL(l.receitaBrutaNova)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaMonofasica)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.ghost, textDecoration: 'line-through' }}>{formatBRL(l.pisPago)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.blue, fontWeight: 600 }}>{formatBRL(l.pisApurado)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.ghost, textDecoration: 'line-through' }}>{formatBRL(l.cofinsPago)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.blue, fontWeight: 600 }}>{formatBRL(l.cofinsApurado)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoPIS)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(l.creditoCOFINS)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {aba === 'detalhada' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: S.muted, marginBottom: 14, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px' }}>
                  Guarde esta planilha para eventual questionamento da fiscalizacao.
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 750 }}>
                    <thead>
                      <tr style={{ background: S.tableHeader }}>
                        {['Competencia','Rec. XML','Rec. PGDAS','Rec. Mono','Rec. Normal','PIS Pago','COFINS Pago','PIS Devido','COFINS Devido','Cred. PIS','Cred. COFINS','Total'].map(h => (
                          <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: h === 'Competencia' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.linhasDetalhadas.map((l, i) => (
                        <tr key={l.competencia} style={{ background: l.divergencia ? '#FFF7ED' : i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                          <td style={{ padding: '9px 10px', fontWeight: 600, color: S.text, whiteSpace: 'nowrap' }}>{l.competencia}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaXML)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaPGDAS)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.blue }}>{formatBRL(l.receitaMono)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.receitaNormal)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisPago)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsPago)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.pisDevido)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(l.cofinsDevido)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: l.creditoPIS != null ? S.green : S.ghost, fontWeight: 600 }}>{l.creditoPIS != null ? formatBRL(l.creditoPIS) : '-'}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: l.creditoCOFINS != null ? S.green : S.ghost, fontWeight: 600 }}>{l.creditoCOFINS != null ? formatBRL(l.creditoCOFINS) : '-'}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: l.creditoTotal != null ? S.green : S.ghost, fontWeight: 700 }}>{l.creditoTotal != null ? formatBRL(l.creditoTotal) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {clienteObj && (
            <div style={{ marginTop: 20 }}>
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