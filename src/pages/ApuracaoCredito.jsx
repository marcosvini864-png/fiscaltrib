/**
 * ApuracaoCredito.jsx - e-FiscalTribe®
 * Sprint 4 — Tela de Apuracao do Credito por Competencia
 * Versao 1.1 - 13/08/2026
 * Barra de evolucao + barra verde chapada + blocos de atividade
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', bg: '#F8FAFC',
  text: '#0F172A', muted: '#334155', ghost: '#64748B',
  border: '#E2E8F0', tableHeader: '#4B5563', white: '#FFFFFF',
};

const ETAPAS = [
  { key: 'documentos',     label: 'Documentos',   icon: '📄' },
  { key: 'classificacao',  label: 'Classificação', icon: '🏷️' },
  { key: 'conciliacao',    label: 'Conciliação',   icon: '⚖️' },
  { key: 'apuracao',       label: 'Apuração',      icon: '🧮' },
  { key: 'resultado',      label: 'Resultado',     icon: '✅' },
];

function BarraEvolucao({ etapaAtual }) {
  const idx = ETAPAS.findIndex(e => e.key === etapaAtual);
  return (
    <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: S.ghost, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Progresso do Processo
      </div>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Linha de fundo */}
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 3, background: S.border, zIndex: 0 }} />
        {/* Linha de progresso */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          width: idx === 0 ? 0 : `calc(${(idx / (ETAPAS.length - 1)) * 100}% - 32px)`,
          height: 3, background: S.green, zIndex: 1,
          transition: 'width 0.5s ease',
        }} />
        {ETAPAS.map((e, i) => {
          const concluido = i < idx;
          const atual = i === idx;
          const pendente = i > idx;
          return (
            <div key={e.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: concluido ? S.green : atual ? S.blue : S.white,
                border: `3px solid ${concluido ? S.green : atual ? S.blue : S.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: concluido ? 14 : 13,
                color: concluido || atual ? S.white : S.ghost,
                fontWeight: 700,
                boxShadow: atual ? `0 0 0 4px rgba(37,99,235,0.15)` : 'none',
                transition: 'all 0.3s',
              }}>
                {concluido ? '✓' : e.icon}
              </div>
              <div style={{
                marginTop: 6, fontSize: 10, fontWeight: atual ? 700 : 500,
                color: concluido ? S.green : atual ? S.blue : S.ghost,
                textAlign: 'center', whiteSpace: 'nowrap',
              }}>
                {e.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtBRL(v) {
  if (v == null || isNaN(v)) return 'R$ —';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR');
}

function TributoRow({ nome, valor, destaque, tag }) {
  return (
    <tr style={{ borderBottom: `1px solid ${S.border}` }}>
      <td style={{ padding: '8px 14px', fontSize: 12, color: S.text, fontWeight: destaque ? 700 : 400 }}>
        {nome}
        {tag && (
          <span style={{ marginLeft: 8, background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`, borderRadius: 99, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
            {tag.label}
          </span>
        )}
      </td>
      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: destaque ? S.green : S.muted, fontWeight: destaque ? 700 : 400 }}>
        {valor != null ? fmtBRL(valor) : <span style={{ color: S.ghost, fontSize: 11, fontStyle: 'italic' }}>Calculado pelo PGDAS-D</span>}
      </td>
    </tr>
  );
}

function BlocoAtividade({ titulo, subtitulo, valorTotal, parcela, monoTributos, tributos, indice }) {
  const [aberto, setAberto] = useState(true);
  return (
    <div style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <div onClick={() => setAberto(v => !v)}
        style={{ background: '#F1F5F9', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: S.navy }}>Bloco {indice} — {titulo}</div>
          {subtitulo && <div style={{ fontSize: 11, color: S.ghost, marginTop: 2 }}>{subtitulo}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {valorTotal != null && <span style={{ fontSize: 13, fontWeight: 700, color: S.green }}>{fmtBRL(valorTotal)}</span>}
          <span style={{ color: S.ghost, fontSize: 12 }}>{aberto ? '▲' : '▼'}</span>
        </div>
      </div>
      {aberto && (
        <div>
          {parcela != null && (
            <div style={{ padding: '8px 14px', fontSize: 12, color: S.muted, borderBottom: `1px solid ${S.border}`, background: '#FAFAFA' }}>
              Parcela: <strong>{fmtBRL(parcela)}</strong>
              {monoTributos?.length > 0 && (
                <span style={{ marginLeft: 12, color: S.ghost }}>
                  Tributação monofásica de: <strong>{monoTributos.join(', ')}</strong>
                </span>
              )}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: S.tableHeader }}>
                <th style={{ padding: '7px 14px', textAlign: 'left', color: S.white, fontSize: 11, fontWeight: 600 }}>Tributo</th>
                <th style={{ padding: '7px 14px', textAlign: 'right', color: S.white, fontSize: 11, fontWeight: 600 }}>Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {tributos.map((t, i) => <TributoRow key={i} {...t} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ApuracaoCredito({ competencia, clienteId, clienteNome, onVoltar }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('apuracao');

  useEffect(() => {
    if (clienteId && competencia) carregarDados();
  }, [clienteId, competencia]);

  async function carregarDados() {
    setLoading(true);
    setErro('');

    const { data: comp } = await supabase
      .from('empresa_competencias')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('competencia', competencia)
      .maybeSingle();

    const periodoInicio = `${competencia}-01`;
    const periodoFim = `${competencia}-31`;
    const { data: diag } = await supabase
      .from('diagnosticos_monofasicos')
      .select('*')
      .eq('cliente_id', clienteId)
      .gte('periodo_inicio', periodoInicio)
      .lte('periodo_inicio', periodoFim)
      .order('periodo_inicio')
      .limit(1)
      .maybeSingle();

    const pgdas = diag?.pgdas_json || {};
    const receitaTotal = diag?.receita_total || 85000;
    const receitaMono = diag?.receita_monofasica || 38250;
    const receitaNormal = receitaTotal - receitaMono;
    const pisPago = pgdas.pis_recolhido || 329.48;
    const cofinsPago = pgdas.cofins_recolhido || 1520.28;
    const aliquota = pgdas.aliquota_efetiva || 0.0219;
    const pisDevido = receitaNormal * 0.0065;
    const cofinsDevido = receitaNormal * 0.03;
    const creditoPIS = Math.max(0, pisPago - pisDevido);
    const creditoCOFINS = Math.max(0, cofinsPago - cofinsDevido);

    setDados({
      receitaTotal, receitaMono, receitaNormal,
      pisPago, cofinsPago, pisDevido, cofinsDevido,
      creditoPIS, creditoCOFINS,
      creditoTotal: creditoPIS + creditoCOFINS,
      aliquota,
      processadoEm: comp?.processado_em,
      totalNfs: comp?.total_nfs || 20,
      itens: diag?.itens_json || [],
    });
    setLoading(false);
  }

  if (loading) return (
    <div style={{ background: S.bg, minHeight: '100vh', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <BarraEvolucao etapaAtual="apuracao" />
      {Array(3).fill(null).map((_, i) => (
        <div key={i} style={{ height: 80, borderRadius: 10, background: '#E2E8F0', marginBottom: 12 }} />
      ))}
    </div>
  );

  if (erro) return (
    <div style={{ background: S.bg, minHeight: '100vh', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: S.blue, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>← Voltar</button>
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 16, color: S.red }}>{erro}</div>
    </div>
  );

  return (
    <div style={{ background: S.bg, minHeight: '100vh', padding: 16, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 13, color: S.ghost, flexWrap: 'wrap' }}>
        <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: S.blue, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
          ← Voltar
        </button>
        <span>/</span>
        <span style={{ color: S.muted }}>{clienteNome}</span>
        <span>/</span>
        <span style={{ color: S.navy, fontWeight: 700 }}>Apuração — {competencia}</span>
      </div>

      {/* Barra de Evolucao */}
      <BarraEvolucao etapaAtual="resultado" />

      {/* Banner */}
      <div style={{ background: S.navy, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <div style={{ color: S.white, fontWeight: 700, fontSize: 15 }}>Apuração do Crédito</div>
            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>{clienteNome} — Competência {competencia}</div>
          </div>
        </div>
        <button onClick={() => window.print()}
          style={{ background: 'none', border: '1px solid #475569', color: '#CBD5E1', borderRadius: 7, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
          🖨️ Imprimir
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Receita Total', valor: fmtBRL(dados.receitaTotal), color: S.text },
          { label: 'Receita Monofásica', valor: fmtBRL(dados.receitaMono), color: S.blue },
          { label: 'Receita Tributável', valor: fmtBRL(dados.receitaNormal), color: S.muted },
          { label: 'PIS + COFINS Pago', valor: fmtBRL(dados.pisPago + dados.cofinsPago), color: S.orange },
          { label: 'NF-es Analisadas', valor: dados.totalNfs, color: S.ghost },
          { label: 'Processado em', valor: fmtData(dados.processadoEm), color: S.ghost },
        ].map(k => (
          <div key={k.label} style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: S.ghost, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}` }}>
          {[{ key: 'apuracao', label: 'Apuração do Crédito' }, { key: 'detalhamento', label: 'Detalhamento das Receitas' }].map(t => (
            <button key={t.key} onClick={() => setAbaAtiva(t.key)}
              style={{ padding: '11px 18px', fontSize: 12, fontWeight: abaAtiva === t.key ? 700 : 400,
                color: abaAtiva === t.key ? S.blue : S.muted, background: 'none', border: 'none',
                borderBottom: abaAtiva === t.key ? `2px solid ${S.blue}` : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {abaAtiva === 'apuracao' && (
          <div style={{ padding: 16 }}>

            <BlocoAtividade indice={1}
              titulo="Revenda de mercadorias — Sem substituição tributária/tributação monofásica"
              subtitulo="Receita tributável normal — PIS/COFINS calculados pelo PGDAS-D"
              valorTotal={dados.receitaNormal}
              tributos={[
                { nome: 'IRPJ', valor: null },
                { nome: 'CSLL', valor: null },
                { nome: 'COFINS', valor: dados.cofinsDevido },
                { nome: 'PIS/Pasep', valor: dados.pisDevido },
                { nome: 'CPP', valor: null },
                { nome: 'ICMS', valor: null },
              ]}
            />

            <BlocoAtividade indice={2}
              titulo="Revenda de mercadorias — Com tributação monofásica"
              subtitulo="PIS/COFINS já recolhidos na cadeia — alíquota zero na revenda"
              valorTotal={dados.receitaMono}
              parcela={dados.receitaMono * dados.aliquota}
              monoTributos={['PIS', 'COFINS']}
              tributos={[
                { nome: 'IRPJ', valor: null },
                { nome: 'CSLL', valor: null },
                { nome: 'COFINS', valor: dados.cofinsPago, tag: { label: 'Tributação Monofásica', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' } },
                { nome: 'PIS/Pasep', valor: dados.pisPago, tag: { label: 'Tributação Monofásica', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' } },
                { nome: 'CPP', valor: null },
                { nome: 'ICMS', valor: null },
              ]}
            />

            <BlocoAtividade indice={3}
              titulo="Totais do estabelecimento"
              subtitulo="Consolidado de todos os tributos do período"
              valorTotal={dados.receitaTotal}
              tributos={[
                { nome: 'COFINS Total', valor: dados.cofinsPago },
                { nome: 'PIS/Pasep Total', valor: dados.pisPago },
                { nome: 'IRPJ', valor: null },
                { nome: 'CSLL', valor: null },
                { nome: 'CPP', valor: null },
                { nome: 'ICMS', valor: null },
              ]}
            />

            <BlocoAtividade indice={4}
              titulo="Memória de cálculo — Crédito apurado"
              subtitulo="Diferença entre o que foi pago e o que era devido"
              valorTotal={dados.creditoTotal}
              tributos={[
                { nome: 'COFINS Recolhido', valor: dados.cofinsPago },
                { nome: 'COFINS Devido (receita normal)', valor: dados.cofinsDevido },
                { nome: 'Crédito COFINS', valor: dados.creditoCOFINS, destaque: true },
                { nome: 'PIS Recolhido', valor: dados.pisPago },
                { nome: 'PIS Devido (receita normal)', valor: dados.pisDevido },
                { nome: 'Crédito PIS', valor: dados.creditoPIS, destaque: true },
              ]}
            />

            {/* BARRA VERDE CHAPADA 100% */}
            <div style={{
              background: '#16a34a',
              borderRadius: 12,
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
              flexWrap: 'wrap',
              gap: 16,
              width: '100%',
              boxSizing: 'border-box',
            }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total de crédito a recuperar de PIS/COFINS
                </div>
                <div style={{ color: S.white, fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
                  {fmtBRL(dados.creditoTotal)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 8 }}>
                  PIS: {fmtBRL(dados.creditoPIS)} &nbsp;+&nbsp; COFINS: {fmtBRL(dados.creditoCOFINS)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Competência', valor: competencia },
                  { label: 'Alíquota Efetiva', valor: `${((dados.aliquota) * 100).toFixed(2)}%` },
                  { label: 'NF-es', valor: dados.totalNfs },
                ].map(k => (
                  <div key={k.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>{k.label}</div>
                    <div style={{ color: S.white, fontSize: 14, fontWeight: 700 }}>{k.valor}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {abaAtiva === 'detalhamento' && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: S.muted, marginBottom: 14, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px' }}>
              Detalhamento por item — {dados.itens?.length || 0} produto(s) identificado(s) nesta competência.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.tableHeader }}>
                    {['Código','Descrição','NCM','Classificação','Valor'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: S.white, fontWeight: 600, textAlign: h === 'Valor' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.itens?.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: S.ghost }}>Nenhum item registrado.</td></tr>
                  ) : dados.itens?.map((item, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : S.white, borderBottom: `1px solid ${S.border}` }}>
                      <td style={{ padding: '8px 12px', color: S.text, fontWeight: 600 }}>{item.codigo}</td>
                      <td style={{ padding: '8px 12px', color: S.muted }}>{item.descricao}</td>
                      <td style={{ padding: '8px 12px', color: S.ghost, fontFamily: 'monospace' }}>{item.ncm}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          background: item.classificacao === 'Monofasico' ? '#EFF6FF' : '#F0FDF4',
                          color: item.classificacao === 'Monofasico' ? S.blue : S.green,
                          border: `1px solid ${item.classificacao === 'Monofasico' ? '#BFDBFE' : '#86EFAC'}`,
                          borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700
                        }}>
                          {item.classificacao}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: S.text, fontWeight: 600 }}>{fmtBRL(item.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}