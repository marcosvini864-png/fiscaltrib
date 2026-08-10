import { useState, useRef, useCallback } from 'react';

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

function parsearXMLNFe(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const get = (el, tag) => {
      if (!el) return '';
      const ns = el.getElementsByTagNameNS('*', tag);
      return ns[0]?.textContent?.trim() || '';
    };

    const ide   = doc.getElementsByTagNameNS('*', 'ide')[0];
    const emit  = doc.getElementsByTagNameNS('*', 'emit')[0];
    const dest  = doc.getElementsByTagNameNS('*', 'dest')[0];
    const total = doc.getElementsByTagNameNS('*', 'ICMSTot')[0];

    if (!ide || !total) return null;

    const tpNF = get(ide, 'tpNF');
    if (tpNF === '0') return null; // ignora NF de entrada

    const dhEmi = get(ide, 'dhEmi') || get(ide, 'dEmi') || '';
    const dataEmissao = dhEmi.substring(0, 10);
    if (!dataEmissao) return null;
    const competencia = dataEmissao.substring(0, 7);
    const nNF = get(ide, 'nNF');

    const nomeEmit = get(emit, 'xNome');
    const cnpjEmit = get(emit, 'CNPJ');
    const nomeDest = get(dest, 'xNome');
    const cnpjDest = get(dest, 'CNPJ') || get(dest, 'CPF');

    const vNF     = parseFloat(get(total, 'vNF')     || '0');
    const vICMS   = parseFloat(get(total, 'vICMS')   || '0');
    const vPIS    = parseFloat(get(total, 'vPIS')    || '0');
    const vCOFINS = parseFloat(get(total, 'vCOFINS') || '0');
    const vBC     = parseFloat(get(total, 'vBC')     || '0');
    const vProd   = parseFloat(get(total, 'vProd')   || '0');
    const vDesc   = parseFloat(get(total, 'vDesc')   || '0');

    if (vNF <= 0) return null;

    const baseSemICMS  = Math.max(0, vNF - vICMS);
    const aliqPIS      = vNF > 0 ? vPIS    / vNF : 0;
    const aliqCOFINS   = vNF > 0 ? vCOFINS / vNF : 0;
    const pisCorreto   = baseSemICMS * aliqPIS;
    const cofinsCorreto= baseSemICMS * aliqCOFINS;
    const creditoPIS   = Math.max(0, vPIS    - pisCorreto);
    const creditoCOFINS= Math.max(0, vCOFINS - cofinsCorreto);
    const creditoTotal = creditoPIS + creditoCOFINS;

    return {
      nNF, dataEmissao, competencia,
      nomeEmit, cnpjEmit, nomeDest, cnpjDest,
      vNF, vICMS, vPIS, vCOFINS, vBC, vProd, vDesc,
      baseSemICMS, aliqPIS, aliqCOFINS,
      pisCorreto, cofinsCorreto,
      creditoPIS, creditoCOFINS, creditoTotal,
    };
  } catch {
    return null;
  }
}

function agruparPorCompetencia(notas) {
  const map = {};
  notas.forEach(n => {
    if (!map[n.competencia]) {
      map[n.competencia] = {
        competencia: n.competencia, qtdNF: 0,
        vNF: 0, vICMS: 0, vPIS: 0, vCOFINS: 0,
        baseSemICMS: 0, pisCorreto: 0, cofinsCorreto: 0,
        creditoPIS: 0, creditoCOFINS: 0, creditoTotal: 0,
      };
    }
    const c = map[n.competencia];
    c.qtdNF++;
    c.vNF         += n.vNF;
    c.vICMS       += n.vICMS;
    c.vPIS        += n.vPIS;
    c.vCOFINS     += n.vCOFINS;
    c.baseSemICMS += n.baseSemICMS;
    c.pisCorreto  += n.pisCorreto;
    c.cofinsCorreto += n.cofinsCorreto;
    c.creditoPIS    += n.creditoPIS;
    c.creditoCOFINS += n.creditoCOFINS;
    c.creditoTotal  += n.creditoTotal;
  });
  return Object.values(map).sort((a, b) => a.competencia.localeCompare(b.competencia));
}

export default function ExclusaoICMS({ cliente }) {
  const [notas, setNotas]               = useState([]);
  const [erros, setErros]               = useState([]);
  const [processando, setProcessando]   = useState(false);
  const [progresso, setProgresso]       = useState({ atual: 0, total: 0, loteAtual: 0, totalLotes: 0 });
  const [tamLote, setTamLote]           = useState(100);
  const [aba, setAba]                   = useState('competencia');
  const [expandida, setExpandida]       = useState(null);
  const [busca, setBusca]               = useState('');
  const [pagina, setPagina]             = useState(1);
  const [porPagina, setPorPagina]       = useState(25);
  const inputRef = useRef();
  const dropRef  = useRef();

  const processarArquivos = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const xmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (xmlFiles.length === 0) return;

    setProcessando(true);
    setNotas([]);
    setErros([]);
    setPagina(1);
    setExpandida(null);

    const totalLotes = Math.ceil(xmlFiles.length / tamLote);
    setProgresso({ atual: 0, total: xmlFiles.length, loteAtual: 0, totalLotes });

    const resultados = [];
    const falhas     = [];

    for (let i = 0; i < xmlFiles.length; i += tamLote) {
      const lote     = xmlFiles.slice(i, i + tamLote);
      const loteNum  = Math.floor(i / tamLote) + 1;

      await Promise.all(lote.map(async (file) => {
        try {
          const text = await file.text();
          const nota = parsearXMLNFe(text);
          if (nota) resultados.push({ ...nota, arquivo: file.name });
          else falhas.push(file.name);
        } catch {
          falhas.push(file.name);
        }
      }));

      setProgresso({
        atual: Math.min(i + tamLote, xmlFiles.length),
        total: xmlFiles.length,
        loteAtual: loteNum,
        totalLotes,
      });

      // respira entre lotes para não travar a UI
      await new Promise(r => setTimeout(r, 30));
    }

    resultados.sort((a, b) => a.dataEmissao.localeCompare(b.dataEmissao));
    setNotas(resultados);
    setErros(falhas);
    setProcessando(false);
  }, [tamLote]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    processarArquivos(e.dataTransfer.files);
  }, [processarArquivos]);

  const exportarCSV = () => {
    if (!notas.length) return;
    const headers = ['NF','Data','Competência','Emitente','CNPJ Emit','Valor NF','ICMS Excluído','Base s/ ICMS','Alíq. PIS','PIS Pago','PIS Correto','Créd. PIS','Alíq. COFINS','COFINS Pago','COFINS Correto','Créd. COFINS','Total Crédito'];
    const rows = notas.map(n => [
      n.nNF, n.dataEmissao, n.competencia, n.nomeEmit, n.cnpjEmit,
      n.vNF.toFixed(2), n.vICMS.toFixed(2), n.baseSemICMS.toFixed(2),
      (n.aliqPIS * 100).toFixed(4), n.vPIS.toFixed(2), n.pisCorreto.toFixed(2), n.creditoPIS.toFixed(2),
      (n.aliqCOFINS * 100).toFixed(4), n.vCOFINS.toFixed(2), n.cofinsCorreto.toFixed(2), n.creditoCOFINS.toFixed(2),
      n.creditoTotal.toFixed(2),
    ]);
    const csv  = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `exclusao_icms_tema69_${cliente?.cnpj || 'cliente'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const competencias   = agruparPorCompetencia(notas);
  const totalCredito   = notas.reduce((s, n) => s + n.creditoTotal,   0);
  const totalPIS       = notas.reduce((s, n) => s + n.creditoPIS,     0);
  const totalCOFINS    = notas.reduce((s, n) => s + n.creditoCOFINS,  0);
  const totalICMS      = notas.reduce((s, n) => s + n.vICMS,          0);
  const totalNF        = notas.reduce((s, n) => s + n.vNF,            0);
  const temDados       = notas.length > 0;
  const pct            = progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0;

  const notasFiltradas = notas.filter(n =>
    !busca ||
    n.nNF?.includes(busca) ||
    n.nomeEmit?.toLowerCase().includes(busca.toLowerCase()) ||
    n.competencia?.includes(busca)
  );
  const totalPaginas = Math.ceil(notasFiltradas.length / porPagina);
  const notasPagina  = notasFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {temDados && (
            <button onClick={() => { setNotas([]); setErros([]); }}
              style={{ padding: '6px 12px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, color: S.ghost, cursor: 'pointer' }}>
              🗑 Limpar
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: S.blue, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📂 Importar XMLs
            <input ref={inputRef} type="file" accept=".xml" multiple style={{ display: 'none' }}
              onChange={e => processarArquivos(e.target.files)} />
          </label>
        </div>
      </div>

      {/* ── Configuração de lote ── */}
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
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: tamLote === op.valor ? 700 : 400,
                cursor: 'pointer', border: `2px solid ${tamLote === op.valor ? S.blue : S.border}`,
                background: tamLote === op.valor ? '#EFF6FF' : S.white,
                color: tamLote === op.valor ? S.blue : S.ghost,
              }}>
              {op.label}
              <span style={{ fontSize: 10, display: 'block', color: tamLote === op.valor ? S.blue : S.ghost, fontWeight: 400 }}>{op.rec}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: S.ghost, lineHeight: 1.7, background: S.bg, borderRadius: 7, padding: '8px 12px' }}>
          <strong style={{ color: S.muted }}>Como escolher:</strong><br />
          🟢 <strong>50 NFs</strong> — PCs com até 4 GB RAM ou máquinas antigas. Mais lento, porém mais seguro.<br />
          🔵 <strong>100 NFs</strong> — Configuração padrão recomendada para a maioria dos computadores (8 GB RAM).<br />
          🟡 <strong>200 NFs</strong> — PCs com 16 GB RAM e processador moderno.<br />
          🔴 <strong>500 NFs</strong> — Apenas para workstations de alta performance. Se travar, reduza o lote.<br />
          <span style={{ color: S.orange, fontWeight: 600 }}>⚠️ Se o sistema travar ou ficar muito lento, clique em Limpar, reduza o tamanho do lote e tente novamente.</span>
        </div>
      </div>

      {/* ── Drop zone ── */}
      {!temDados && !processando && (
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${S.border}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: S.white }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 6 }}>
            Arraste os XMLs aqui ou clique para selecionar
          </div>
          <div style={{ fontSize: 12, color: S.ghost, lineHeight: 1.6 }}>
            Suporta centenas de arquivos em lote · Apenas NF-e de saída são processadas
          </div>
          <div style={{ marginTop: 14, display: 'inline-block', padding: '5px 14px', background: S.bg, border: `1px solid ${S.border}`, borderRadius: 20, fontSize: 11, color: S.ghost }}>
            Fundamento: RE 574.706 / STF Tema 69
          </div>
        </div>
      )}

      {/* ── Barra de progresso ── */}
      {processando && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.navy }}>
              Processando lote {progresso.loteAtual} de {progresso.totalLotes}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: S.blue }}>{pct}%</span>
          </div>
          <div style={{ background: S.border, borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ background: S.blue, height: 10, borderRadius: 99, width: pct + '%', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: S.ghost }}>
            {progresso.atual} de {progresso.total} arquivos processados — lote de {tamLote} NFs
          </div>
        </div>
      )}

      {/* ── Erros ── */}
      {erros.length > 0 && (
        <div style={{ background: '#FFF7ED', border: `1px solid #FED7AA`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: S.orange }}>
          ⚠️ {erros.length} arquivo(s) ignorados — NF-e de entrada, sem ICMS ou formato inválido.
        </div>
      )}

      {/* ── KPIs ── */}
      {temDados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Crédito Total',   value: formatBRL(totalCredito),  color: S.green,  desc: 'PIS + COFINS pagos a maior' },
            { label: 'Crédito PIS',     value: formatBRL(totalPIS),      color: S.blue,   desc: 'PIS pago sobre base inflada' },
            { label: 'Crédito COFINS',  value: formatBRL(totalCOFINS),   color: S.navy,   desc: 'COFINS pago sobre base inflada' },
            { label: 'ICMS Excluído',   value: formatBRL(totalICMS),     color: S.orange, desc: 'Total retirado da base' },
            { label: 'NF-e Analisadas', value: notas.length,             color: S.ghost,  desc: 'Notas processadas' },
            { label: 'Competências',    value: competencias.length,      color: S.ghost,  desc: 'Períodos cobertos' },
          ].map(k => (
            <div key={k.label} style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: S.ghost, marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: typeof k.value === 'number' ? 22 : 16, fontWeight: 700, color: k.color, marginBottom: 3 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: S.ghost }}>{k.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Abas de resultado ── */}
      {temDados && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>

          <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}`, overflowX: 'auto', alignItems: 'center' }}>
            {[
              { key: 'competencia', label: '📅 Por Competência' },
              { key: 'notas',       label: '📄 Por Nota Fiscal' },
              { key: 'relatorio',   label: '📋 Relatório' },
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
            <button onClick={exportarCSV}
              style={{ margin: '6px 12px', background: S.green, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ⬇ CSV
            </button>
          </div>

          {/* ABA — Por Competência */}
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
                    <tr key={c.competencia}
                      onClick={() => { setAba('notas'); setBusca(c.competencia); setPagina(1); }}
                      style={{ background: i % 2 === 0 ? '#F8FAFC' : S.white, cursor: 'pointer' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: S.blue, whiteSpace: 'nowrap' }}>{c.competencia}</td>
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

          {/* ABA — Por Nota Fiscal com memória de cálculo */}
          {aba === 'notas' && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
                  placeholder="Buscar por NF, emitente ou competência..."
                  style={{ flex: 1, minWidth: 200, padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, color: S.text }} />
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
                      {['', 'NF', 'Data', 'Competência', 'Emitente', 'Valor NF', 'ICMS', 'Base s/ ICMS', 'Créd. PIS', 'Créd. COFINS', 'Total'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: ['', 'NF', 'Data', 'Competência', 'Emitente'].includes(h) ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notasPagina.map((n, i) => {
                      const key    = n.nNF + n.dataEmissao + n.cnpjEmit;
                      const aberta = expandida === key;
                      return (
                        <>
                          <tr key={key}
                            onClick={() => setExpandida(aberta ? null : key)}
                            style={{ background: aberta ? '#EFF6FF' : i % 2 === 0 ? '#F8FAFC' : S.white, cursor: 'pointer' }}>
                            <td style={{ padding: '9px 6px', textAlign: 'center', color: S.ghost, fontSize: 10 }}>{aberta ? '▼' : '▶'}</td>
                            <td style={{ padding: '9px 10px', fontWeight: 600, color: S.text }}>{n.nNF}</td>
                            <td style={{ padding: '9px 10px', color: S.muted, whiteSpace: 'nowrap' }}>{n.dataEmissao}</td>
                            <td style={{ padding: '9px 10px', color: S.blue, fontWeight: 600 }}>{n.competencia}</td>
                            <td style={{ padding: '9px 10px', color: S.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nomeEmit}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vNF)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(n.vICMS)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.baseSemICMS)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoPIS)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoCOFINS)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(n.creditoTotal)}</td>
                          </tr>

                          {aberta && (
                            <tr key={key + '_mem'}>
                              <td colSpan={11} style={{ padding: 0 }}>
                                <div style={{ background: '#EFF6FF', borderLeft: `4px solid ${S.blue}`, padding: '16px 20px' }}>
                                  <div style={{ fontWeight: 700, color: S.navy, fontSize: 13, marginBottom: 12 }}>
                                    📐 Memória de Cálculo — NF {n.nNF} · {n.nomeEmit}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                                    {[
                                      { label: '① Valor total da NF',              value: formatBRL(n.vNF),           color: S.text },
                                      { label: '② ICMS destacado (indevido na base)',value: formatBRL(n.vICMS),         color: S.orange },
                                      { label: '③ Base correta PIS/COFINS (①−②)', value: formatBRL(n.baseSemICMS),   color: S.blue },
                                      { label: '④ Alíquota PIS efetiva',            value: formatPct(n.aliqPIS),       color: S.muted },
                                      { label: '⑤ PIS recolhido (sobre ①)',        value: formatBRL(n.vPIS),          color: S.muted },
                                      { label: '⑥ PIS correto (③ × ④)',           value: formatBRL(n.pisCorreto),    color: S.muted },
                                      { label: '⑦ Crédito PIS recuperável (⑤−⑥)',value: formatBRL(n.creditoPIS),    color: S.green },
                                      { label: '⑧ Alíquota COFINS efetiva',         value: formatPct(n.aliqCOFINS),   color: S.muted },
                                      { label: '⑨ COFINS recolhido (sobre ①)',      value: formatBRL(n.vCOFINS),      color: S.muted },
                                      { label: '⑩ COFINS correto (③ × ⑧)',        value: formatBRL(n.cofinsCorreto), color: S.muted },
                                      { label: '⑪ Crédito COFINS recuperável (⑨−⑩)',value: formatBRL(n.creditoCOFINS),color: S.green },
                                      { label: '⑫ TOTAL RECUPERÁVEL (⑦+⑪)',       value: formatBRL(n.creditoTotal),  color: S.green },
                                    ].map(item => (
                                      <div key={item.label} style={{ background: S.white, borderRadius: 7, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: S.ghost, fontSize: 11 }}>{item.label}</span>
                                        <span style={{ fontWeight: 700, color: item.color, whiteSpace: 'nowrap', fontSize: 13 }}>{item.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ marginTop: 10, fontSize: 10, color: S.ghost, lineHeight: 1.6 }}>
                                    Fundamento: RE 574.706 · STF Tema 69 · O ICMS não compõe a base de cálculo do PIS/COFINS (CF/88, art. 195, I, b).
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                    style={{ padding: '5px 12px', border: `1px solid ${S.border}`, borderRadius: 6, background: S.white, fontSize: 12, cursor: pagina === 1 ? 'default' : 'pointer', opacity: pagina === 1 ? 0.4 : 1 }}>‹</button>
                  {Array.from({ length: Math.min(7, totalPaginas) }, (_, i) => {
                    const p = totalPaginas <= 7 ? i + 1 : pagina <= 4 ? i + 1 : pagina >= totalPaginas - 3 ? totalPaginas - 6 + i : pagina - 3 + i;
                    return (
                      <button key={p} onClick={() => setPagina(p)}
                        style={{ padding: '5px 10px', border: `1px solid ${p === pagina ? S.blue : S.border}`, borderRadius: 6, background: p === pagina ? S.blue : S.white, color: p === pagina ? '#fff' : S.text, fontSize: 12, cursor: 'pointer', fontWeight: p === pagina ? 700 : 400 }}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                    style={{ padding: '5px 12px', border: `1px solid ${S.border}`, borderRadius: 6, background: S.white, fontSize: 12, cursor: pagina === totalPaginas ? 'default' : 'pointer', opacity: pagina === totalPaginas ? 0.4 : 1 }}>›</button>
                </div>
              )}
            </div>
          )}

          {/* ABA — Relatório */}
          {aba === 'relatorio' && (
            <div style={{ padding: 20, maxWidth: 800 }}>

              {/* Identificação */}
              <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: S.navy, marginBottom: 12 }}>📋 Identificação</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                  {[
                    ['Cliente',           cliente?.razao_social || '—'],
                    ['CNPJ',              cliente?.cnpj || '—'],
                    ['Regime',            cliente?.regime || '—'],
                    ['NF-es Analisadas',  notas.length],
                    ['Período',           competencias.length > 0 ? `${competencias[0].competencia} a ${competencias[competencias.length - 1].competencia}` : '—'],
                    ['Data do Parecer',   new Date().toLocaleDateString('pt-BR')],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span style={{ color: S.ghost }}>{label}: </span>
                      <span style={{ fontWeight: 600, color: S.text }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo executivo */}
              <div style={{ background: '#F0FDF4', border: '1px solid #86efac', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: S.green, marginBottom: 10 }}>📊 Resumo Executivo</div>
                <div style={{ fontSize: 13, color: S.text, lineHeight: 1.8 }}>
                  A análise de <strong>{notas.length} notas fiscais</strong> identificou que o contribuinte recolheu
                  PIS e COFINS sobre uma base de cálculo inflada pelo ICMS, em desconformidade com o entendimento
                  do STF (RE 574.706, Tema 69). O ICMS de <strong style={{ color: S.orange }}>{formatBRL(totalICMS)}</strong> foi
                  indevidamente incluído na base de cálculo. O total de crédito recuperável é de{' '}
                  <strong style={{ color: S.green, fontSize: 15 }}>{formatBRL(totalCredito)}</strong>, sendo{' '}
                  <strong>{formatBRL(totalPIS)}</strong> de PIS e <strong>{formatBRL(totalCOFINS)}</strong> de COFINS
                  pagos a maior.
                </div>
              </div>

              {/* Fundamentação legal */}
              <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: S.navy, marginBottom: 12 }}>⚖️ Fundamentação Legal</div>
                {[
                  { norma: 'RE 574.706 / STF Tema 69',  desc: 'O ICMS não compõe a base de cálculo do PIS e da COFINS. Decisão de mérito com repercussão geral — vincula todos os contribuintes.' },
                  { norma: 'ADC 49 — Modulação',         desc: 'Créditos válidos a partir de 15/03/2017, salvo contribuintes com ação judicial ou administrativa já ajuizada anteriormente.' },
                  { norma: 'Lei 10.637/2002',             desc: 'Institui o PIS não-cumulativo — base de cálculo é o faturamento/receita bruta, sem inclusão de tributos de terceiros.' },
                  { norma: 'Lei 10.833/2003',             desc: 'Institui a COFINS não-cumulativa — mesma base de cálculo do PIS.' },
                  { norma: 'IN RFB 2.055/2021',           desc: 'Regulamenta restituição e compensação via PER/DCOMP perante a Receita Federal do Brasil.' },
                  { norma: 'CTN art. 168 / LC 118/2005',  desc: 'Prazo prescricional de 5 anos contados do pagamento indevido para pedido de restituição ou compensação.' },
                ].map(item => (
                  <div key={item.norma} style={{ display: 'flex', gap: 14, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${S.border}` }}>
                    <div style={{ minWidth: 210, fontWeight: 600, fontSize: 12, color: S.blue, flexShrink: 0 }}>{item.norma}</div>
                    <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>

              {/* Próximos passos */}
              <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: S.navy, marginBottom: 12 }}>🚀 Próximos Passos</div>
                <div style={{ fontSize: 11, color: S.orange, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 7, padding: '8px 12px', marginBottom: 14 }}>
                  ⚠️ Os procedimentos variam conforme o regime tributário. Confirme com o profissional responsável antes de executar qualquer retificação.
                </div>
                {[
                  { regime: 'Lucro Presumido', color: S.blue, passos: [
                    'Retificar a EFD-Contribuições — excluir o ICMS da base de PIS/COFINS em cada competência',
                    'Apurar o crédito resultante competência a competência com base nesta memória de cálculo',
                    'Gerar o PER/DCOMP via e-CAC (requer certificado digital habilitado)',
                    'Aguardar homologação pela Receita Federal (prazo médio: 30 a 360 dias)',
                    'Manter esta memória de cálculo arquivada para defesa em eventual CARF',
                  ]},
                  { regime: 'Lucro Real', color: S.navy, passos: [
                    'Retificar a EFD-Contribuições — excluir o ICMS da base de PIS/COFINS',
                    'Verificar impacto no LALUR e ajustar IRPJ/CSLL se necessário',
                    'Gerar o PER/DCOMP via e-CAC',
                    'Aguardar homologação pela Receita Federal',
                    'Manter esta memória de cálculo arquivada para defesa em eventual CARF',
                  ]},
                  { regime: 'Simples Nacional', color: S.green, passos: [
                    'O aproveitamento direto no Simples Nacional é mais restrito — avaliar com advogado tributarista',
                    'Verificar se há valores de PIS/COFINS segregados no PGDAS-D que permitam a tese',
                    'Considerar ação judicial (mandado de segurança) para garantir o direito ao crédito',
                    'Manter esta memória de cálculo como fundamento da tese para eventual ação',
                  ]},
                ].map(bloco => (
                  <div key={bloco.regime} style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: bloco.color, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${S.border}` }}>{bloco.regime}</div>
                    {bloco.passos.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: 12, color: S.text, lineHeight: 1.6 }}>
                        <span style={{ color: bloco.color, fontWeight: 700, flexShrink: 0, minWidth: 16 }}>{i + 1}.</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 11, color: S.ghost, lineHeight: 1.7 }}>
                <strong>Aviso legal:</strong> Este parecer tem caráter exclusivamente diagnóstico e informativo.
                Não substitui a análise de profissional habilitado (contador ou advogado tributarista).
                A decisão de aproveitamento de créditos e a eventual retificação de obrigações acessórias
                são de exclusiva responsabilidade do profissional responsável pelo contribuinte.
                e-FiscalTribe® — Zenthor Consultoria &amp; BPO.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}