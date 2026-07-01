import { useState } from 'react';
import { supabase } from './supabase';

const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#94a3b8', textLight: '#f1f5f9', accent: '#6366f1',
  green: '#22c55e', red: '#ef4444', yellow: '#f59e0b'
};

export default function Prospeccao({ onVoltar }) {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const formatarCNPJ = (v) => {
    const n = v.replace(/\D/g, '').slice(0, 14);
    return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const buscar = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) { setErro('Digite um CNPJ válido com 14 dígitos.'); return; }
    setErro(''); setLoading(true); setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke('consulta-cnpj', {
        body: { cnpj: cnpjLimpo }
      });
      if (error) throw error;
      setResultado(data);
    } catch (e) {
      setErro('Erro ao consultar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const razao = resultado?.receita?.razao_social || '';
  const uf = resultado?.receita?.endereco_uf || '';

  const links = razao ? [
    { label: '🔍 Google', url: `https://www.google.com/search?q=${encodeURIComponent(razao)}` },
    { label: '📸 Instagram', url: `https://www.instagram.com/explore/search/?q=${encodeURIComponent(razao)}` },
    { label: '👤 Facebook', url: `https://www.facebook.com/search/top?q=${encodeURIComponent(razao)}` },
    { label: '💼 LinkedIn', url: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(razao)}` },
    { label: '⚖️ PGFN Regularize', url: `https://regularize.pgfn.gov.br` },
    { label: '🏛️ TRF1', url: `https://processual.trf1.jus.br/consultaProcessual/processo.php?secao=TRF1&termo=${encodeURIComponent(razao)}`, ativo: ['AC','AM','AP','BA','DF','GO','MA','MG','MT','PA','PI','RO','RR','TO'].includes(uf) },
    { label: '🏛️ TRF2', url: `https://portal.trf2.jus.br/portal/consulta/cons_procs.asp`, ativo: ['ES','RJ'].includes(uf) },
    { label: '🏛️ TRF3', url: `https://web.trf3.jus.br/base-textual/Home/ListaColecao/9?np=${encodeURIComponent(razao)}`, ativo: ['MS','SP'].includes(uf) },
    { label: '🏛️ TRF4', url: `https://eproc.trf4.jus.br/eproc2trf4/controlador.php?acao=consulta_processual_pesquisa&acao_origem=consulta_processual_pesquisa&txtPalavraGerada=${encodeURIComponent(razao)}`, ativo: ['PR','RS','SC'].includes(uf) },
    { label: '🏛️ TRF5', url: `https://eproc.trf5.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica`, ativo: ['AL','CE','PB','PE','RN','SE'].includes(uf) },
  ] : [];

  const trfAtivo = links.find(l => l.label.includes('TRF') && l.ativo);

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.textLight }}>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>← Voltar</button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🎯 Prospecção de Clientes</h2>
      <p style={{ color: C.text, fontSize: 13, marginBottom: 24 }}>Digite o CNPJ para consultar automaticamente Receita Federal e gerar links de verificação.</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          value={cnpj}
          onChange={e => setCnpj(formatarCNPJ(e.target.value))}
          placeholder="00.000.000/0000-00"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textLight, fontSize: 15 }}
        />
        <button
          onClick={buscar}
          disabled={loading}
          style={{ padding: '10px 24px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {erro && <div style={{ background: '#450a0a', border: `1px solid ${C.red}`, borderRadius: 8, padding: 12, color: C.red, marginBottom: 16 }}>{erro}</div>}

      {resultado?.receita && (
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Dados da Receita */}
          <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.accent }}>📋 Receita Federal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Razão Social', resultado.receita.razao_social],
                ['Nome Fantasia', resultado.receita.nome_fantasia || '—'],
                ['Situação', resultado.receita.situacao_cadastral],
                ['Abertura', resultado.receita.data_abertura],
                ['Porte', resultado.receita.porte],
                ['Natureza Jurídica', resultado.receita.natureza_juridica],
                ['CNAE', resultado.receita.cnae_principal + ' — ' + resultado.receita.cnae_descricao],
                ['Município/UF', (resultado.receita.endereco_municipio || '') + '/' + (resultado.receita.endereco_uf || '')],
                ['Endereço', [resultado.receita.endereco_logradouro, resultado.receita.endereco_numero, resultado.receita.endereco_bairro].filter(Boolean).join(', ')],
                ['CEP', resultado.receita.endereco_cep],
              ].map(([label, valor]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{valor || '—'}</div>
                </div>
              ))}
            </div>

            {resultado.receita.socios?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>QUADRO SOCIETÁRIO</div>
                {resultado.receita.socios.map((s, i) => (
                  <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontWeight: 600 }}>{s.nome}</span>
                    <span style={{ color: C.text, marginLeft: 8 }}>{s.qualificacao}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links de verificação */}
          <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.accent }}>🔗 Verificação Manual</h3>
            <p style={{ fontSize: 12, color: C.text, marginBottom: 16 }}>Clique nos links abaixo para verificar presença digital e situação judicial. O TRF destacado é o da região do cliente.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', cursor: 'pointer',
                    background: l.ativo ? C.accent : C.border,
                    color: '#fff',
                    border: l.ativo ? `2px solid ${C.accent}` : '2px solid transparent'
                  }}>
                  {l.label}{l.ativo ? ' ✓' : ''}
                </a>
              ))}
            </div>
            {trfAtivo && (
              <p style={{ fontSize: 12, color: C.yellow, marginTop: 12 }}>⚡ {trfAtivo.label} é o tribunal da região {uf} — verificação prioritária.</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}