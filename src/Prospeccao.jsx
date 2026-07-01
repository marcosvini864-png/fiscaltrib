import { useState } from 'react';
import { supabase } from './supabase';

const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#94a3b8', textLight: '#f1f5f9', accent: '#6366f1',
  green: '#22c55e', red: '#ef4444', yellow: '#f59e0b'
};

const maskCPF  = v => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1-$2');
const maskCNPJ = v => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2');

export default function Prospeccao({ onVoltar }) {
  const [doc, setDoc] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const docLimpo = doc.replace(/\D/g, '');
  const isPF = docLimpo.length <= 11;
  const isPJ = docLimpo.length > 11;

  const formatarDoc = (v) => {
    const n = v.replace(/\D/g, '');
    if (n.length <= 11) return maskCPF(v);
    return maskCNPJ(v);
  };

  const buscar = async () => {
    if (isPF && docLimpo.length !== 11) { setErro('Digite um CPF válido com 11 dígitos.'); return; }
    if (isPJ && docLimpo.length !== 14) { setErro('Digite um CNPJ válido com 14 dígitos.'); return; }
    if (isPF && !nome.trim()) { setErro('Para Pessoa Física, informe o nome completo.'); return; }
    setErro(''); setLoading(true); setResultado(null);

    try {
      if (isPJ) {
        const { data, error } = await supabase.functions.invoke('consulta-cnpj', {
          body: { cnpj: docLimpo }
        });
        if (error) throw error;
        if (!data) throw new Error('Sem retorno da função');
        setResultado({ tipo: 'PJ', ...data });
      } else {
        // PF: sem API pública de CPF — monta resultado com nome informado
        setResultado({
          tipo: 'PF',
          pf: { cpf: docLimpo, nome: nome.trim() }
        });
      }
    } catch (e) {
      setErro('Erro ao consultar: ' + (e.message || JSON.stringify(e)));
    } finally {
      setLoading(false);
    }
  };

  // Para PJ usa razão social e UF da Receita
  // Para PF usa nome informado
  const nomeConsulta = resultado?.tipo === 'PJ'
    ? (resultado?.receita?.razao_social || '')
    : (resultado?.pf?.nome || '');

  const uf = resultado?.receita?.endereco_uf || '';

  const links = nomeConsulta ? [
    { label: '🔍 Google', url: `https://www.google.com/search?q=${encodeURIComponent(nomeConsulta)}` },
    { label: '📸 Instagram', url: `https://www.instagram.com/explore/search/?q=${encodeURIComponent(nomeConsulta)}` },
    { label: '👤 Facebook', url: `https://www.facebook.com/search/top?q=${encodeURIComponent(nomeConsulta)}` },
    { label: '💼 LinkedIn', url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(nomeConsulta)}` },
    { label: '⚖️ PGFN Regularize', url: `https://regularize.pgfn.gov.br` },
    { label: '📋 Lista Devedores PGFN', url: `https://listadevedores.pgfn.gov.br/?cnpjCpf=${docLimpo}` },
    { label: '🏛️ TRF1', url: `https://processual.trf1.jus.br/consultaProcessual/processo.php?secao=TRF1&termo=${encodeURIComponent(nomeConsulta)}`, ativo: ['AC','AM','AP','BA','DF','GO','MA','MG','MT','PA','PI','RO','RR','TO'].includes(uf) },
    { label: '🏛️ TRF2', url: `https://portal.trf2.jus.br/portal/consulta/cons_procs.asp`, ativo: ['ES','RJ'].includes(uf) },
    { label: '🏛️ TRF3', url: `https://web.trf3.jus.br/base-textual/Home/ListaColecao/9?np=${encodeURIComponent(nomeConsulta)}`, ativo: ['MS','SP'].includes(uf) || resultado?.tipo === 'PF' },
    { label: '🏛️ TRF4', url: `https://eproc.trf4.jus.br/eproc2trf4/controlador.php?acao=consulta_processual_pesquisa&txtPalavraGerada=${encodeURIComponent(nomeConsulta)}`, ativo: ['PR','RS','SC'].includes(uf) },
    { label: '🏛️ TRF5', url: `https://eproc.trf5.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica`, ativo: ['AL','CE','PB','PE','RN','SE'].includes(uf) },
  ] : [];

  const trfAtivo = links.find(l => l.label.includes('TRF') && l.ativo);

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>← Voltar</button>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: C.textLight }}>🎯 Prospecção de Clientes</h2>
      <p style={{ color: C.text, fontSize: 13, marginBottom: 24 }}>Digite o CPF ou CNPJ — a máscara se ajusta automaticamente.</p>

      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.text, marginBottom: 4 }}>
              {docLimpo.length <= 11 ? '👤 CPF — Pessoa Física' : '🏢 CNPJ — Pessoa Jurídica'}
            </div>
            <input
              value={doc}
              onChange={e => { setDoc(formatarDoc(e.target.value)); setResultado(null); setErro(''); }}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="CPF ou CNPJ"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textLight, fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={buscar}
            disabled={loading}
            style={{ padding: '10px 24px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontSize: 15, opacity: loading ? 0.7 : 1, alignSelf: 'flex-end' }}
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        {/* Campo nome — aparece só pra PF */}
        {docLimpo.length > 0 && docLimpo.length <= 11 && (
          <div>
            <div style={{ fontSize: 11, color: C.text, marginBottom: 4 }}>Nome completo (obrigatório para CPF)</div>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ex: João Silva Santos"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textLight, fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>
        )}
      </div>

      {erro && <div style={{ background: '#450a0a', border: `1px solid ${C.red}`, borderRadius: 8, padding: 12, color: C.red, marginBottom: 16 }}>{erro}</div>}

      {/* Resultado PJ */}
      {resultado?.tipo === 'PJ' && resultado?.receita && !resultado.receita.erro && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.accent }}>📋 Receita Federal — Pessoa Jurídica</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Razão Social', resultado.receita.razao_social],
                ['Nome Fantasia', resultado.receita.nome_fantasia || '—'],
                ['Situação', resultado.receita.situacao_cadastral],
                ['Abertura', resultado.receita.data_abertura],
                ['Porte', resultado.receita.porte],
                ['Natureza Jurídica', resultado.receita.natureza_juridica],
                ['CNAE', (resultado.receita.cnae_principal || '') + ' — ' + (resultado.receita.cnae_descricao || '')],
                ['Município/UF', (resultado.receita.endereco_municipio || '') + '/' + (resultado.receita.endereco_uf || '')],
                ['Endereço', [resultado.receita.endereco_logradouro, resultado.receita.endereco_numero, resultado.receita.endereco_bairro].filter(Boolean).join(', ')],
                ['CEP', resultado.receita.endereco_cep],
              ].map(([label, valor]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textLight }}>{valor || '—'}</div>
                </div>
              ))}
            </div>
            {resultado.receita.socios?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>QUADRO SOCIETÁRIO</div>
                {resultado.receita.socios.map((s, i) => (
                  <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${C.border}`, color: C.textLight }}>
                    <span style={{ fontWeight: 600 }}>{s.nome}</span>
                    <span style={{ color: C.text, marginLeft: 8 }}>{s.qualificacao}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links PJ */}
          <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.accent }}>🔗 Verificação Manual</h3>
            <p style={{ fontSize: 12, color: C.text, marginBottom: 16 }}>Clique nos links para verificar presença digital e situação judicial. O TRF destacado é o da região do cliente.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: l.ativo ? C.accent : C.border, color: '#fff', border: l.ativo ? `2px solid ${C.accent}` : '2px solid transparent' }}>
                  {l.label}{l.ativo ? ' ✓' : ''}
                </a>
              ))}
            </div>
            {trfAtivo && <p style={{ fontSize: 12, color: C.yellow, marginTop: 12 }}>⚡ {trfAtivo.label} é o tribunal da região {uf} — verificação prioritária.</p>}
          </div>
        </div>
      )}

      {/* Resultado PF */}
      {resultado?.tipo === 'PF' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.accent }}>👤 Pessoa Física</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>Nome</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textLight }}>{resultado.pf.nome}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>CPF</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textLight }}>{maskCPF(resultado.pf.cpf)}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#1c1f2e', borderRadius: 8, fontSize: 12, color: C.yellow }}>
              ℹ️ Dados de Pessoa Física são protegidos pela LGPD — a consulta à Receita Federal de CPF não está disponível via API pública. Use os links abaixo para verificação manual.
            </div>
          </div>

          {/* Links PF */}
          <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.accent }}>🔗 Verificação Manual</h3>
            <p style={{ fontSize: 12, color: C.text, marginBottom: 16 }}>Links gerados com base no nome informado. Verifique PGFN, TRF e presença digital.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: l.ativo ? C.accent : C.border, color: '#fff', border: l.ativo ? `2px solid ${C.accent}` : '2px solid transparent' }}>
                  {l.label}{l.ativo ? ' ✓' : ''}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {resultado?.receita?.erro && (
        <div style={{ background: '#450a0a', border: `1px solid ${C.red}`, borderRadius: 8, padding: 12, color: C.red }}>
          Erro na consulta: {resultado.receita.erro}
        </div>
      )}
    </div>
  );
}