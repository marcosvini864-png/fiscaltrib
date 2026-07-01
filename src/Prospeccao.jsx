import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#94a3b8', textLight: '#f1f5f9', accent: '#6366f1',
  green: '#22c55e', red: '#ef4444', yellow: '#f59e0b',
  navy: '#0B1F4D'
};

const maskCPF  = v => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1-$2');
const maskCNPJ = v => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
const maskFone = v => { const n=v.replace(/\D/g,'').slice(0,11); if(n.length<=10) return n.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2'); return n.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2'); };

const STATUS_COLORS = {
  'Pendente':    '#334155|#94a3b8',
  'Em contato':  '#1e3a5f|#60a5fa',
  'Convertido':  '#14532d|#4ade80',
  'Descartado':  '#450a0a|#f87171',
};

export default function Prospeccao({ onVoltar }) {
  const [tela, setTela] = useState('lista'); // lista | consulta | editar
  const [registros, setRegistros] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [busca, setBusca] = useState('');

  // Consulta
  const [doc, setDoc] = useState('');
  const [nomeManual, setNomeManual] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  // Edição
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const docLimpo = doc.replace(/\D/g, '');

  useEffect(() => { carregarLista(); }, []);

  async function carregarLista() {
    setLoadingLista(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('prospeccao_clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRegistros(data || []);
    setLoadingLista(false);
  }

  const formatarDoc = (v) => {
    const n = v.replace(/\D/g, '');
    if (n.length <= 11) return maskCPF(v);
    return maskCNPJ(v);
  };

  async function buscar() {
    if (docLimpo.length !== 11 && docLimpo.length !== 14) { setErro('Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.'); return; }
    if (docLimpo.length === 11 && !nomeManual.trim()) { setErro('Para Pessoa Física, informe o nome completo.'); return; }
    setErro(''); setLoading(true); setResultado(null);
    try {
      let dados = null;
      if (docLimpo.length === 14) {
        const { data, error } = await supabase.functions.invoke('consulta-cnpj', { body: { cnpj: docLimpo } });
        if (error) throw error;
        dados = data;
      }
      const rec = dados?.receita;
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        user_id: user.id,
        cnpj: docLimpo,
        razao_social: rec?.razao_social || nomeManual || null,
        situacao_cadastral: rec?.situacao_cadastral || null,
        data_abertura: rec?.data_abertura || null,
        natureza_juridica: rec?.natureza_juridica || null,
        porte: rec?.porte || null,
        cnae_principal: rec?.cnae_principal || null,
        cnae_descricao: rec?.cnae_descricao || null,
        endereco_logradouro: rec?.endereco_logradouro || null,
        endereco_numero: rec?.endereco_numero || null,
        endereco_complemento: rec?.endereco_complemento || null,
        endereco_bairro: rec?.endereco_bairro || null,
        endereco_municipio: rec?.endereco_municipio || null,
        endereco_uf: rec?.endereco_uf || null,
        endereco_cep: rec?.endereco_cep || null,
        socios: rec?.socios || [],
        status_prospeccao: 'PENDENTE',
        status_lead: 'Pendente',
      };
      const { data: saved, error: saveErr } = await supabase.from('prospeccao_clientes').insert([payload]).select().single();
      if (saveErr) throw saveErr;
      setResultado({ ...saved, _receita: rec });
      setTela('editar');
      setEditando({ ...saved });
      carregarLista();
    } catch (e) {
      setErro('Erro: ' + (e.message || JSON.stringify(e)));
    } finally {
      setLoading(false);
    }
  }

  async function salvarEdicao() {
    setSalvando(true);
    const { error } = await supabase.from('prospeccao_clientes').update({
      razao_social: editando.razao_social,
      endereco_logradouro: editando.endereco_logradouro,
      endereco_numero: editando.endereco_numero,
      endereco_complemento: editando.endereco_complemento,
      endereco_bairro: editando.endereco_bairro,
      endereco_municipio: editando.endereco_municipio,
      endereco_uf: editando.endereco_uf,
      endereco_cep: editando.endereco_cep,
      telefone: editando.telefone,
      whatsapp: editando.whatsapp,
      email_contato: editando.email_contato,
      contato_nome: editando.contato_nome,
      site_url: editando.site_url,
      linkedin_url: editando.linkedin_url,
      facebook_url: editando.facebook_url,
      instagram_url: editando.instagram_url,
      socios_manual: editando.socios_manual,
      trf_tem_execucao: editando.trf_tem_execucao,
      trf_tem_advogado: editando.trf_tem_advogado,
      trf_observacao: editando.trf_observacao,
      status_lead: editando.status_lead,
      observacoes: editando.observacoes,
    }).eq('id', editando.id);
    setSalvando(false);
    if (!error) { carregarLista(); alert('Salvo com sucesso!'); }
    else alert('Erro ao salvar: ' + error.message);
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este registro?')) return;
    await supabase.from('prospeccao_clientes').delete().eq('id', id);
    carregarLista();
    if (tela === 'editar') setTela('lista');
  }

  function imprimir() {
    const e = editando;
    const socios = (e.socios && e.socios.length > 0)
      ? e.socios.map(s => `${s.nome} — ${s.qualificacao}`).join('\n')
      : (e.socios_manual || '—');
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Prospecção — ${e.razao_social}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:800px;margin:0 auto}
      h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#64748b;font-weight:normal;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:20px}
      .field label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:2px}
      .field span{font-size:13px;font-weight:600}
      .section{border-top:2px solid #e2e8f0;padding-top:14px;margin-top:14px}
      .section h3{font-size:13px;font-weight:700;color:#0B1F4D;margin-bottom:12px}
      .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:#dbeafe;color:#1e40af}
      @media print{body{padding:16px}}</style></head><body>
      <h1>🎯 Prospecção — ${e.razao_social || '—'}</h1>
      <h2>CNPJ/CPF: ${e.cnpj} · Status: ${e.status_lead || 'Pendente'}</h2>
      <div class="section"><h3>📋 Dados Cadastrais</h3>
      <div class="grid">
        <div class="field"><label>Situação</label><span>${e.situacao_cadastral || '—'}</span></div>
        <div class="field"><label>Abertura</label><span>${e.data_abertura || '—'}</span></div>
        <div class="field"><label>Porte</label><span>${e.porte || '—'}</span></div>
        <div class="field"><label>Natureza Jurídica</label><span>${e.natureza_juridica || '—'}</span></div>
        <div class="field"><label>CNAE</label><span>${e.cnae_principal || '—'} — ${e.cnae_descricao || '—'}</span></div>
      </div></div>
      <div class="section"><h3>📍 Endereço</h3>
      <div class="grid">
        <div class="field"><label>Logradouro</label><span>${e.endereco_logradouro || '—'}, ${e.endereco_numero || ''} ${e.endereco_complemento || ''}</span></div>
        <div class="field"><label>Bairro</label><span>${e.endereco_bairro || '—'}</span></div>
        <div class="field"><label>Município/UF</label><span>${e.endereco_municipio || '—'}/${e.endereco_uf || '—'}</span></div>
        <div class="field"><label>CEP</label><span>${e.endereco_cep || '—'}</span></div>
      </div></div>
      <div class="section"><h3>📞 Contato</h3>
      <div class="grid">
        <div class="field"><label>Responsável</label><span>${e.contato_nome || '—'}</span></div>
        <div class="field"><label>Telefone</label><span>${e.telefone || '—'}</span></div>
        <div class="field"><label>WhatsApp</label><span>${e.whatsapp || '—'}</span></div>
        <div class="field"><label>E-mail</label><span>${e.email_contato || '—'}</span></div>
        <div class="field"><label>Site</label><span>${e.site_url || '—'}</span></div>
        <div class="field"><label>LinkedIn</label><span>${e.linkedin_url || '—'}</span></div>
        <div class="field"><label>Facebook</label><span>${e.facebook_url || '—'}</span></div>
        <div class="field"><label>Instagram</label><span>${e.instagram_url || '—'}</span></div>
      </div></div>
      <div class="section"><h3>👥 Sócios</h3><p style="white-space:pre-line;font-size:13px">${socios}</p></div>
      <div class="section"><h3>⚖️ Situação Judicial</h3>
      <div class="grid">
        <div class="field"><label>Execução Fiscal</label><span>${e.trf_tem_execucao === true ? '✅ Sim' : e.trf_tem_execucao === false ? '❌ Não' : '—'}</span></div>
        <div class="field"><label>Advogado Constituído</label><span>${e.trf_tem_advogado === true ? '✅ Sim' : e.trf_tem_advogado === false ? '❌ Não' : '—'}</span></div>
        <div class="field" style="grid-column:span 2"><label>Observação TRF</label><span>${e.trf_observacao || '—'}</span></div>
      </div></div>
      <div class="section"><h3>📝 Observações</h3><p style="font-size:13px">${e.observacoes || '—'}</p></div>
      <p style="margin-top:32px;font-size:10px;color:#94a3b8">Gerado em ${new Date().toLocaleString('pt-BR')} · FiscalTrib · fiscaltrib.com.br</p>
      <script>window.onload=()=>{window.print()}</script></body></html>
    `);
    win.document.close();
  }

  const inp = (campo, placeholder, tipo='text') => (
    <input
      value={editando?.[campo] || ''}
      onChange={e => setEditando({ ...editando, [campo]: e.target.value })}
      placeholder={placeholder}
      type={tipo}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#0f172a', color: C.textLight, fontSize: 13, boxSizing: 'border-box' }}
    />
  );

  const foneInp = (campo, placeholder) => (
    <input
      value={editando?.[campo] || ''}
      onChange={e => setEditando({ ...editando, [campo]: maskFone(e.target.value) })}
      placeholder={placeholder}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#0f172a', color: C.textLight, fontSize: 13, boxSizing: 'border-box' }}
    />
  );

  const registrosFiltrados = registros.filter(r =>
    (r.razao_social || '').toLowerCase().includes(busca.toLowerCase()) ||
    (r.cnpj || '').includes(busca) ||
    (r.endereco_municipio || '').toLowerCase().includes(busca.toLowerCase())
  );

  // ── TELA LISTA ──
  if (tela === 'lista') return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      <button onClick={onVoltar} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>← Voltar</button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textLight, margin: 0 }}>🎯 Prospecção de Clientes</h2>
          <p style={{ color: C.text, fontSize: 13, margin: '4px 0 0' }}>{registros.length} registros salvos</p>
        </div>
        <button onClick={() => { setDoc(''); setNomeManual(''); setResultado(null); setErro(''); setTela('consulta'); }}
          style={{ padding: '10px 20px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Nova Consulta
        </button>
      </div>

      <input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome, CNPJ ou cidade..."
        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textLight, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
      />

      {loadingLista && <div style={{ color: C.text, textAlign: 'center', padding: 40 }}>Carregando...</div>}

      {!loadingLista && registrosFiltrados.length === 0 && (
        <div style={{ background: C.card, borderRadius: 12, padding: 48, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.textLight, marginBottom: 8 }}>Nenhuma prospecção ainda</div>
          <div style={{ fontSize: 13, color: C.text }}>Clique em "+ Nova Consulta" para começar.</div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {registrosFiltrados.map(r => {
          const [bg, cor] = (STATUS_COLORS[r.status_lead] || STATUS_COLORS['Pendente']).split('|');
          return (
            <div key={r.id} style={{ background: C.card, borderRadius: 12, padding: '14px 18px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.razao_social || '—'}</span>
                  <span style={{ background: bg, color: cor, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{r.status_lead || 'Pendente'}</span>
                </div>
                <div style={{ fontSize: 12, color: C.text }}>
                  {r.cnpj} · {r.endereco_municipio || '—'}/{r.endereco_uf || '—'}
                  {r.telefone && ` · 📞 ${r.telefone}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => { setEditando({ ...r }); setTela('editar'); }}
                  style={{ padding: '6px 14px', borderRadius: 6, background: C.accent, color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Abrir</button>
                <button onClick={() => excluir(r.id)}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#450a0a', color: C.red, border: `1px solid ${C.red}`, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── TELA CONSULTA ──
  if (tela === 'consulta') return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      <button onClick={() => setTela('lista')} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>← Voltar à lista</button>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textLight, marginBottom: 4 }}>🔍 Nova Consulta</h2>
      <p style={{ color: C.text, fontSize: 13, marginBottom: 24 }}>Digite o CPF ou CNPJ — a máscara se ajusta automaticamente. Os dados serão salvos automaticamente.</p>

      <div style={{ display: 'grid', gap: 12, marginBottom: 24, maxWidth: 600 }}>
        <div>
          <div style={{ fontSize: 11, color: C.text, marginBottom: 4 }}>
            {docLimpo.length <= 11 ? '👤 CPF — Pessoa Física' : '🏢 CNPJ — Pessoa Jurídica'}
          </div>
          <input
            value={doc}
            onChange={e => { setDoc(formatarDoc(e.target.value)); setErro(''); }}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="CPF ou CNPJ"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textLight, fontSize: 15, boxSizing: 'border-box' }}
          />
        </div>
        {docLimpo.length > 0 && docLimpo.length <= 11 && (
          <div>
            <div style={{ fontSize: 11, color: C.text, marginBottom: 4 }}>Nome completo (obrigatório para CPF)</div>
            <input
              value={nomeManual}
              onChange={e => setNomeManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ex: João Silva Santos"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.textLight, fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>
        )}
        <button onClick={buscar} disabled={loading}
          style={{ padding: '12px 24px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontSize: 15, opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Consultando e salvando...' : '🔍 Consultar'}
        </button>
      </div>

      {erro && <div style={{ background: '#450a0a', border: `1px solid ${C.red}`, borderRadius: 8, padding: 12, color: C.red }}>{erro}</div>}
    </div>
  );

  // ── TELA EDITAR ──
  if (tela === 'editar' && editando) {
    const uf = editando.endereco_uf || '';
    const nomeConsulta = editando.razao_social || '';
    const links = nomeConsulta ? [
      { label: '🔍 Google', url: `https://www.google.com/search?q=${encodeURIComponent(nomeConsulta)}` },
      { label: '📸 Instagram', url: `https://www.instagram.com/explore/search/?q=${encodeURIComponent(nomeConsulta)}` },
      { label: '👤 Facebook', url: `https://www.facebook.com/search/top?q=${encodeURIComponent(nomeConsulta)}` },
      { label: '💼 LinkedIn', url: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(nomeConsulta)}` },
      { label: '⚖️ PGFN Regularize', url: `https://regularize.pgfn.gov.br` },
      { label: '📋 Lista Devedores', url: `https://listadevedores.pgfn.gov.br/?cnpjCpf=${editando.cnpj}` },
      { label: '🏛️ TRF1', url: `https://processual.trf1.jus.br/consultaProcessual/processo.php?secao=TRF1&termo=${encodeURIComponent(nomeConsulta)}`, ativo: ['AC','AM','AP','BA','DF','GO','MA','MG','MT','PA','PI','RO','RR','TO'].includes(uf) },
      { label: '🏛️ TRF2', url: `https://portal.trf2.jus.br/portal/consulta/cons_procs.asp`, ativo: ['ES','RJ'].includes(uf) },
      { label: '🏛️ TRF3', url: `https://web.trf3.jus.br/base-textual/Home/ListaColecao/9?np=${encodeURIComponent(nomeConsulta)}`, ativo: ['MS','SP'].includes(uf) },
      { label: '🏛️ TRF4', url: `https://eproc.trf4.jus.br/eproc2trf4/controlador.php?acao=consulta_processual_pesquisa&txtPalavraGerada=${encodeURIComponent(nomeConsulta)}`, ativo: ['PR','RS','SC'].includes(uf) },
      { label: '🏛️ TRF5', url: `https://eproc.trf5.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica`, ativo: ['AL','CE','PB','PE','RN','SE'].includes(uf) },
    ] : [];

    const section = (titulo) => (
      <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 12, marginTop: 4 }}>{titulo}</div>
    );

    return (
      <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button onClick={() => setTela('lista')} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', fontSize: 14 }}>← Voltar à lista</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={imprimir}
              style={{ padding: '8px 18px', borderRadius: 8, background: C.card, color: C.textLight, border: `1px solid ${C.border}`, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>🖨️ Imprimir</button>
            <button onClick={() => excluir(editando.id)}
              style={{ padding: '8px 18px', borderRadius: 8, background: '#450a0a', color: C.red, border: `1px solid ${C.red}`, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>🗑️ Excluir</button>
            <button onClick={salvarEdicao} disabled={salvando}
              style={{ padding: '8px 18px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando...' : '💾 Salvar'}
            </button>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 4 }}>{editando.razao_social || 'Sem nome'}</h2>
        <div style={{ fontSize: 13, color: C.text, marginBottom: 20 }}>{editando.cnpj} · Criado em {new Date(editando.created_at).toLocaleDateString('pt-BR')}</div>

        {/* Status */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {section('🏷️ Status do Lead')}
          <select value={editando.status_lead || 'Pendente'} onChange={e => setEditando({ ...editando, status_lead: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#0f172a', color: C.textLight, fontSize: 13, width: 200 }}>
            {['Pendente', 'Em contato', 'Convertido', 'Descartado'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Dados cadastrais */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {section('📋 Dados Cadastrais')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Razão Social / Nome</label>{inp('razao_social', 'Razão social')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Situação Cadastral</label>{inp('situacao_cadastral', 'Ex: ATIVA')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Data de Abertura</label>{inp('data_abertura', 'AAAA-MM-DD')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Porte</label>{inp('porte', 'Ex: MICRO EMPRESA')}</div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Natureza Jurídica</label>{inp('natureza_juridica', 'Ex: Sociedade Empresária Limitada')}</div>
          </div>
        </div>

        {/* Endereço */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {section('📍 Endereço')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Logradouro</label>{inp('endereco_logradouro', 'Rua, Av...')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Número</label>{inp('endereco_numero', 'Nº')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Complemento</label>{inp('endereco_complemento', 'Sala, Andar...')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Bairro</label>{inp('endereco_bairro', 'Bairro')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>CEP</label>{inp('endereco_cep', '00000-000')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Município</label>{inp('endereco_municipio', 'Cidade')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>UF</label>{inp('endereco_uf', 'SP')}</div>
          </div>
        </div>

        {/* Contato */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {section('📞 Contato')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Nome do Contato / Responsável</label>{inp('contato_nome', 'Ex: João Silva — Diretor Financeiro')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Telefone</label>{foneInp('telefone', '(11) 9999-9999')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>WhatsApp</label>{foneInp('whatsapp', '(11) 9999-9999')}</div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>E-mail</label>{inp('email_contato', 'email@empresa.com.br', 'email')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Site</label>{inp('site_url', 'https://www.empresa.com.br')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>LinkedIn</label>{inp('linkedin_url', 'https://linkedin.com/company/...')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Facebook</label>{inp('facebook_url', 'https://facebook.com/...')}</div>
            <div><label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Instagram</label>{inp('instagram_url', 'https://instagram.com/...')}</div>
          </div>
        </div>

        {/* Sócios */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {section('👥 Sócios')}
          {editando.socios && editando.socios.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>DA RECEITA FEDERAL</div>
              {editando.socios.map((s, i) => (
                <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${C.border}`, color: C.textLight }}>
                  <span style={{ fontWeight: 600 }}>{s.nome}</span>
                  <span style={{ color: C.text, marginLeft: 8 }}>{s.qualificacao}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Sócios / Contatos adicionais (manual)</label>
            <textarea
              value={editando.socios_manual || ''}
              onChange={e => setEditando({ ...editando, socios_manual: e.target.value })}
              placeholder="Nome — Cargo&#10;Nome — Cargo"
              rows={4}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#0f172a', color: C.textLight, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* TRF */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {section('⚖️ Situação Judicial (TRF)')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 6 }}>Execução Fiscal Ajuizada?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Sim', true], ['Não', false], ['—', null]].map(([lb, val]) => (
                  <button key={lb} onClick={() => setEditando({ ...editando, trf_tem_execucao: val })}
                    style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: editando.trf_tem_execucao === val ? C.accent : '#0f172a', color: editando.trf_tem_execucao === val ? '#fff' : C.text, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                    {lb}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 6 }}>Advogado Constituído?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Sim', true], ['Não', false], ['—', null]].map(([lb, val]) => (
                  <button key={lb} onClick={() => setEditando({ ...editando, trf_tem_advogado: val })}
                    style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: editando.trf_tem_advogado === val ? C.accent : '#0f172a', color: editando.trf_tem_advogado === val ? '#fff' : C.text, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                    {lb}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, color: C.text, display: 'block', marginBottom: 4 }}>Observação TRF</label>
              <input value={editando.trf_observacao || ''} onChange={e => setEditando({ ...editando, trf_observacao: e.target.value })}
                placeholder="Nº do processo, advogado, situação..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#0f172a', color: C.textLight, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Links */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {section('🔗 Links de Verificação')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: l.ativo ? C.accent : C.border, color: '#fff' }}>
                {l.label}{l.ativo ? ' ✓' : ''}
              </a>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 24 }}>
          {section('📝 Observações')}
          <textarea
            value={editando.observacoes || ''}
            onChange={e => setEditando({ ...editando, observacoes: e.target.value })}
            placeholder="Anotações sobre o lead, histórico de contato..."
            rows={4}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#0f172a', color: C.textLight, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => setTela('lista')} style={{ padding: '10px 20px', borderRadius: 8, background: C.card, color: C.textLight, border: `1px solid ${C.border}`, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={imprimir} style={{ padding: '10px 20px', borderRadius: 8, background: C.card, color: C.textLight, border: `1px solid ${C.border}`, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>🖨️ Imprimir</button>
          <button onClick={salvarEdicao} disabled={salvando}
            style={{ padding: '10px 20px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : '💾 Salvar'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}