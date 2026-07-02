import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const C = {
  bg: '#E4E7EC', card: '#FFFFFF', border: '#C8D0DC',
  text: '#64748B', textLight: '#1E293B', navy: '#0B1F4D',
  green: '#16A34A', red: '#DC2626', yellow: '#D97706', orange: '#EA580C'
};

const maskCPF  = v => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1-$2');
const maskCNPJ = v => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
const maskFone = v => { const n=v.replace(/\D/g,'').slice(0,11); if(n.length<=10) return n.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2'); return n.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2'); };
const hoje = () => new Date().toISOString().split('T')[0];
const daqui = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().split('T')[0]; };

const STATUS_LIST = [
  { key: 'Novo',               cor: '#3B82F6', bg: '#EFF6FF' },
  { key: 'Primeiro Contato',   cor: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'Aguardando Retorno', cor: '#F59E0B', bg: '#FFFBEB' },
  { key: 'Visita Agendada',    cor: '#06B6D4', bg: '#ECFEFF' },
  { key: 'Proposta Enviada',   cor: '#F97316', bg: '#FFF7ED' },
  { key: 'Negociação',         cor: '#EF4444', bg: '#FEF2F2' },
  { key: 'Cliente Fechado',    cor: '#16A34A', bg: '#F0FDF4' },
  { key: 'Perdido',            cor: '#6B7280', bg: '#F9FAFB' },
];

const TEMP_LIST = [
  { key: 'quente', label: '🔴 Quente', cor: '#DC2626' },
  { key: 'morno',  label: '🟠 Morno',  cor: '#EA580C' },
  { key: 'frio',   label: '🟡 Frio',   cor: '#D97706' },
  { key: 'inativo',label: '⚫ Inativo', cor: '#6B7280' },
];

const ACOES_LIST = [
  'Ligar','Enviar WhatsApp','Enviar e-mail','Agendar visita',
  'Realizar visita','Enviar proposta','Cobrar resposta','Reunião','Encerrar negociação'
];

const TRF_LINKS = () => [
  { label: '🏛️ TRF1', url: 'https://pje1g-consultapublica.trf1.jus.br/consultapublica/ConsultaPublica/listView.seam', ufs: ['AC','AM','AP','BA','DF','GO','MA','MG','MT','PA','PI','RO','RR','TO'] },
  { label: '🏛️ TRF2', url: 'https://eproc-consulta.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica', ufs: ['ES','RJ'] },
  { label: '🏛️ TRF3', url: 'https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam', ufs: ['MS','SP'] },
  { label: '🏛️ TRF4', url: 'https://consulta.trf4.jus.br/trf4/controlador.php?acao=consulta_processual_pesquisa&strSecao=RS&selForma=NU', ufs: ['PR','RS','SC'] },
  { label: '🏛️ TRF5', url: 'https://pje.trf5.jus.br/pjeconsulta/ConsultaPublica/listView.seam', ufs: ['AL','CE','PB','PE','RN','SE'] },
  { label: '🏛️ TRF6', url: 'https://eproc1g.trf6.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica&acao_origem=principal&acao_retorno=processo_consulta_publica', ufs: ['MG'] },
];

const inputStyle = { width:'100%', padding:'8px 12px', borderRadius:6, border:'1px solid #C8D0DC', background:'#FFFFFF', color:'#1E293B', fontSize:13, boxSizing:'border-box' };
const labelStyle = { fontSize:12, fontWeight:600, color:'#0B1F4D', display:'block', marginBottom:4 };
const btnPrimary = { padding:'8px 20px', borderRadius:8, background:'#0B1F4D', color:'#fff', border:'none', fontWeight:600, cursor:'pointer', fontSize:13 };
const btnOutline = { padding:'8px 20px', borderRadius:8, background:'#fff', color:'#0B1F4D', border:'1.5px solid #0B1F4D', fontWeight:600, cursor:'pointer', fontSize:13 };
const btnWarning = { padding:'8px 20px', borderRadius:8, background:'#F59E0B', color:'#fff', border:'none', fontWeight:600, cursor:'pointer', fontSize:13 };

function getStatus(key) { return STATUS_LIST.find(s => s.key === key) || STATUS_LIST[0]; }
function getTemp(key) { return TEMP_LIST.find(t => t.key === key) || TEMP_LIST[2]; }

export default function Prospeccao({ onVoltar }) {
  const [tela, setTela] = useState('dashboard');
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'kanban'
  const [registros, setRegistros] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [doc, setDoc] = useState('');
  const [nomeManual, setNomeManual] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const dragItem = useRef(null);
  const dragOverCol = useRef(null);

  const docLimpo = doc.replace(/\D/g, '');

  useEffect(() => { carregarLista(); }, []);

  async function carregarLista() {
    setLoadingLista(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('prospeccao_clientes').select('*').eq('user_id', user.id)
      .order('data_proxima_acao', { ascending: true, nullsFirst: false });
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
    setErro(''); setLoading(true);
    try {
      let rec = null;
      if (docLimpo.length === 14) {
        const { data, error } = await supabase.functions.invoke('consulta-cnpj', { body: { cnpj: docLimpo } });
        if (error) throw error;
        rec = data?.receita || null;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        user_id: user.id, cnpj: docLimpo,
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
        status_lead: 'Novo', status_prospeccao: 'PENDENTE', temperatura: 'frio',
      };
      const { data: saved, error: saveErr } = await supabase.from('prospeccao_clientes').insert([payload]).select().single();
      if (saveErr) throw saveErr;
      setEditando({ ...saved });
      carregarLista();
      setTela('editar');
    } catch (e) {
      setErro('Erro: ' + (e.message || JSON.stringify(e)));
    } finally { setLoading(false); }
  }

  async function salvarEdicao() {
    if (!editando.proxima_acao) { alert('Defina a próxima ação antes de salvar.'); return; }
    if (!editando.data_proxima_acao) { alert('Defina a data da próxima ação antes de salvar.'); return; }
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
      temperatura: editando.temperatura,
      proxima_acao: editando.proxima_acao,
      data_proxima_acao: editando.data_proxima_acao,
      hora_proxima_acao: editando.hora_proxima_acao || null,
      ultimo_contato: editando.ultimo_contato || null,
      responsavel_atendimento: editando.responsavel_atendimento,
      observacoes: editando.observacoes,
    }).eq('id', editando.id);
    setSalvando(false);
    if (!error) { await carregarLista(); alert('Salvo com sucesso!'); }
    else alert('Erro ao salvar: ' + error.message);
  }

  async function moverCard(id, novoStatus) {
    await supabase.from('prospeccao_clientes').update({ status_lead: novoStatus }).eq('id', id);
    setRegistros(prev => prev.map(r => r.id === id ? { ...r, status_lead: novoStatus } : r));
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este registro?')) return;
    await supabase.from('prospeccao_clientes').delete().eq('id', id);
    await carregarLista();
    if (tela === 'editar') setTela('lista');
  }

  function imprimir() {
    const e = editando;
    const socios = (e.socios && e.socios.length > 0)
      ? e.socios.map(s => `${s.nome} — ${s.qualificacao}`).join('\n')
      : (e.socios_manual || '—');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Prospecção — ${e.razao_social}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:800px;margin:0 auto}
    h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#64748b;font-weight:normal;margin-bottom:24px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:20px}
    .field label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:2px}
    .field span{font-size:13px;font-weight:600}
    .section{border-top:2px solid #e2e8f0;padding-top:14px;margin-top:14px}
    .section h3{font-size:13px;font-weight:700;color:#0B1F4D;margin-bottom:12px}
    @media print{body{padding:16px}}</style></head><body>
    <h1>🎯 Prospecção — ${e.razao_social || '—'}</h1>
    <h2>CNPJ/CPF: ${e.cnpj} · Status: ${e.status_lead || '—'} · Temperatura: ${getTemp(e.temperatura).label} · Gerado em ${new Date().toLocaleString('pt-BR')}</h2>
    <div class="section"><h3>📋 Dados Cadastrais</h3><div class="grid">
      <div class="field"><label>Situação</label><span>${e.situacao_cadastral||'—'}</span></div>
      <div class="field"><label>Abertura</label><span>${e.data_abertura||'—'}</span></div>
      <div class="field"><label>Porte</label><span>${e.porte||'—'}</span></div>
      <div class="field"><label>Natureza Jurídica</label><span>${e.natureza_juridica||'—'}</span></div>
    </div></div>
    <div class="section"><h3>📍 Endereço</h3><div class="grid">
      <div class="field"><label>Logradouro</label><span>${[e.endereco_logradouro,e.endereco_numero,e.endereco_complemento].filter(Boolean).join(', ')||'—'}</span></div>
      <div class="field"><label>Bairro</label><span>${e.endereco_bairro||'—'}</span></div>
      <div class="field"><label>Município/UF</label><span>${e.endereco_municipio||'—'}/${e.endereco_uf||'—'}</span></div>
      <div class="field"><label>CEP</label><span>${e.endereco_cep||'—'}</span></div>
    </div></div>
    <div class="section"><h3>📞 Contato</h3><div class="grid">
      <div class="field"><label>Responsável</label><span>${e.contato_nome||'—'}</span></div>
      <div class="field"><label>Telefone</label><span>${e.telefone||'—'}</span></div>
      <div class="field"><label>WhatsApp</label><span>${e.whatsapp||'—'}</span></div>
      <div class="field"><label>E-mail</label><span>${e.email_contato||'—'}</span></div>
    </div></div>
    <div class="section"><h3>🎯 Próxima Ação</h3><div class="grid">
      <div class="field"><label>Ação</label><span>${e.proxima_acao||'—'}</span></div>
      <div class="field"><label>Data/Hora</label><span>${e.data_proxima_acao||'—'} ${e.hora_proxima_acao||''}</span></div>
      <div class="field"><label>Último Contato</label><span>${e.ultimo_contato||'—'}</span></div>
    </div></div>
    <div class="section"><h3>👥 Sócios</h3><p style="white-space:pre-line;font-size:13px">${socios}</p></div>
    <div class="section"><h3>⚖️ Situação Judicial</h3><div class="grid">
      <div class="field"><label>Execução Fiscal</label><span>${e.trf_tem_execucao===true?'✅ Sim':e.trf_tem_execucao===false?'❌ Não':'—'}</span></div>
      <div class="field"><label>Advogado Constituído</label><span>${e.trf_tem_advogado===true?'✅ Sim':e.trf_tem_advogado===false?'❌ Não':'—'}</span></div>
    </div></div>
    <div class="section"><h3>📝 Observações</h3><p style="font-size:13px">${e.observacoes||'—'}</p></div>
    <p style="margin-top:32px;font-size:10px;color:#94a3b8">FiscalTrib · fiscaltrib.com.br</p>
    <script>window.onload=()=>{window.print()}</script></body></html>`);
    win.document.close();
  }

  const inp = (campo, placeholder, tipo = 'text') => (
    <input value={editando?.[campo] || ''} onChange={e => setEditando({ ...editando, [campo]: e.target.value })}
      placeholder={placeholder} type={tipo} style={inputStyle} />
  );
  const foneInp = (campo, placeholder) => (
    <input value={editando?.[campo] || ''} onChange={e => setEditando({ ...editando, [campo]: maskFone(e.target.value) })}
      placeholder={placeholder} style={inputStyle} />
  );
  const section = (titulo) => <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>{titulo}</div>;
  const field = (label, conteudo) => <div><label style={labelStyle}>{label}</label>{conteudo}</div>;

  const hoje_str = hoje();
  const proximos3_str = daqui(3);
  const total = registros.length;
  const porStatus = (s) => registros.filter(r => r.status_lead === s).length;
  const atrasados = registros.filter(r => r.data_proxima_acao && r.data_proxima_acao < hoje_str && r.status_lead !== 'Cliente Fechado' && r.status_lead !== 'Perdido').length;
  const paraHoje = registros.filter(r =>
    r.data_proxima_acao && r.data_proxima_acao >= hoje_str && r.data_proxima_acao <= proximos3_str &&
    r.status_lead !== 'Cliente Fechado' && r.status_lead !== 'Perdido'
  );
  const prioridades = registros.filter(r =>
    r.status_lead !== 'Cliente Fechado' && r.status_lead !== 'Perdido' &&
    ((r.data_proxima_acao && r.data_proxima_acao <= proximos3_str) || r.temperatura === 'quente')
  ).sort((a, b) => (a.data_proxima_acao || '9999') > (b.data_proxima_acao || '9999') ? 1 : -1).slice(0, 6);

  const FUNIL = STATUS_LIST.slice(0, 6);

  const registrosFiltrados = registros.filter(r => {
    const matchBusca = (r.razao_social||'').toLowerCase().includes(busca.toLowerCase()) ||
      (r.cnpj||'').includes(busca) || (r.endereco_municipio||'').toLowerCase().includes(busca.toLowerCase()) ||
      (r.contato_nome||'').toLowerCase().includes(busca.toLowerCase()) ||
      (r.telefone||'').includes(busca) || (r.email_contato||'').toLowerCase().includes(busca.toLowerCase());
    const matchStatus = !filtroStatus || r.status_lead === filtroStatus;
    return matchBusca && matchStatus;
  });

  // ── KANBAN CARD ──
  function KanbanCard({ r }) {
    const temp = getTemp(r.temperatura);
    const atrasado = r.data_proxima_acao && r.data_proxima_acao < hoje_str;
    const ehHoje = r.data_proxima_acao === hoje_str;
    return (
      <div
        draggable
        onDragStart={() => { dragItem.current = r; }}
        onClick={() => { setEditando({...r}); setTela('editar'); }}
        style={{
          background: atrasado ? '#FEF2F2' : '#FFFFFF',
          border: `1px solid ${atrasado ? '#FECACA' : C.border}`,
          borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
          marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
      >
        <div style={{ fontSize:12, fontWeight:700, color:C.textLight, marginBottom:4, lineHeight:1.3 }}>
          {r.razao_social || '—'}
        </div>
        {r.contato_nome && <div style={{ fontSize:11, color:C.text, marginBottom:3 }}>👤 {r.contato_nome}</div>}
        {r.telefone && (
          <div style={{ fontSize:11, color:C.navy, marginBottom:3 }}>
            📞 <a href={`tel:${r.telefone}`} onClick={e => e.stopPropagation()} style={{ color:C.navy, textDecoration:'none' }}>{r.telefone}</a>
            {r.whatsapp && <> · <a href={`https://wa.me/55${r.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color:'#16A34A', textDecoration:'none' }}>📱 {r.whatsapp}</a></>}
          </div>
        )}
        {r.endereco_municipio && <div style={{ fontSize:11, color:C.text, marginBottom:4 }}>📍 {r.endereco_municipio}/{r.endereco_uf}</div>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
          <span style={{ fontSize:10, color:temp.cor, fontWeight:700 }}>{temp.label}</span>
          {r.data_proxima_acao && (
            <span style={{ fontSize:10, fontWeight:600, color: atrasado ? '#DC2626' : ehHoje ? '#2563EB' : C.text }}>
              {atrasado ? '⚠️ Atrasado' : ehHoje ? '🔔 Hoje' : r.data_proxima_acao}
            </span>
          )}
        </div>
        {r.proxima_acao && (
          <div style={{ fontSize:10, color: atrasado ? '#DC2626' : C.text, marginTop:3, fontStyle:'italic' }}>
            → {r.proxima_acao}
          </div>
        )}
      </div>
    );
  }

  // ── KANBAN COLUMN ──
  function KanbanCol({ status }) {
    const st = getStatus(status.key);
    const cards = registrosFiltrados.filter(r => r.status_lead === status.key);
    const [over, setOver] = useState(false);
    return (
      <div
        onDragOver={e => { e.preventDefault(); dragOverCol.current = status.key; setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={async () => {
          setOver(false);
          if (dragItem.current && dragItem.current.status_lead !== status.key) {
            await moverCard(dragItem.current.id, status.key);
            dragItem.current = null;
          }
        }}
        style={{
          minWidth: 220, maxWidth: 240, flexShrink: 0,
          background: over ? st.bg : '#F1F5F9',
          borderRadius: 10, padding: 10,
          border: `2px solid ${over ? st.cor : 'transparent'}`,
          transition: 'all 0.15s',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:12, fontWeight:700, color:st.cor }}>{status.key}</span>
          <span style={{ background:st.bg, color:st.cor, padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700 }}>{cards.length}</span>
        </div>
        <div style={{ flex:1, overflowY:'auto', maxHeight:'calc(100vh - 280px)', paddingRight:2 }}>
          {cards.map(r => <KanbanCard key={r.id} r={r} />)}
          {cards.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px 8px', fontSize:12, color:C.text, opacity:0.6 }}>
              Arraste um card aqui
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── HEADER LISTA/KANBAN COMPARTILHADO ──
  function ListaKanbanHeader() {
    return (
      <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
        <button onClick={() => setTela('dashboard')} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar ao Cockpit</button>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:C.textLight }}>
              {viewMode === 'kanban' ? '🗂️ Kanban de Prospects' : '📋 Lista de Prospects'}
            </div>
            <div style={{ fontSize:13, color:C.text }}>{registrosFiltrados.length} de {registros.length} registros</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {/* Toggle Lista/Kanban */}
            <div style={{ display:'flex', background:'#E2E8F0', borderRadius:8, padding:3 }}>
              <button onClick={() => setViewMode('lista')}
                style={{ padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background: viewMode === 'lista' ? C.navy : 'transparent',
                  color: viewMode === 'lista' ? '#fff' : C.text }}>
                ☰ Lista
              </button>
              <button onClick={() => setViewMode('kanban')}
                style={{ padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background: viewMode === 'kanban' ? C.navy : 'transparent',
                  color: viewMode === 'kanban' ? '#fff' : C.text }}>
                🗂️ Kanban
              </button>
            </div>
            <button onClick={() => { setDoc(''); setNomeManual(''); setErro(''); setTela('consulta'); }} style={btnPrimary}>+ Nova Consulta</button>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, CNPJ, cidade, telefone ou e-mail..."
            style={{ ...inputStyle, flex:1, minWidth:200, padding:'8px 14px' }} />
          {viewMode === 'lista' && (
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, width:200 }}>
              <option value=''>Todos os status</option>
              {STATUS_LIST.map(s => <option key={s.key}>{s.key}</option>)}
            </select>
          )}
          {filtroStatus && <button onClick={() => setFiltroStatus('')} style={{ ...btnOutline, padding:'6px 14px', fontSize:12 }}>✕ Limpar filtro</button>}
        </div>

        {loadingLista && <div style={{ color:C.text, textAlign:'center', padding:40 }}>Carregando...</div>}

        {/* ── KANBAN VIEW ── */}
        {!loadingLista && viewMode === 'kanban' && (
          <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:16, alignItems:'flex-start' }}>
            {STATUS_LIST.map(s => <KanbanCol key={s.key} status={s} />)}
          </div>
        )}

        {/* ── LISTA VIEW ── */}
        {!loadingLista && viewMode === 'lista' && (
          <>
            {registrosFiltrados.length === 0 && (
              <div style={{ background:C.card, borderRadius:12, padding:48, textAlign:'center', border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
                <div style={{ fontSize:16, fontWeight:600, color:C.textLight }}>Nenhum registro encontrado</div>
              </div>
            )}
            <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:'auto' }}>
              {registrosFiltrados.length > 0 && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['Empresa','Responsável','Telefone','WhatsApp','E-mail','Cidade','Status','Temp.','Próxima Ação','Data',''].map(h => (
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text, borderBottom:`1px solid ${C.border}`, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map(r => {
                      const st = getStatus(r.status_lead);
                      const temp = getTemp(r.temperatura);
                      const atrasado = r.data_proxima_acao && r.data_proxima_acao < hoje_str && r.status_lead !== 'Cliente Fechado' && r.status_lead !== 'Perdido';
                      return (
                        <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}`, background: atrasado ? '#FEF2F2' : 'transparent' }}
                          onMouseEnter={e => e.currentTarget.style.background = atrasado ? '#FEE2E2' : '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = atrasado ? '#FEF2F2' : 'transparent'}>
                          <td style={{ padding:'10px 12px', fontWeight:600, color:C.textLight, whiteSpace:'nowrap' }}>{r.razao_social || '—'}</td>
                          <td style={{ padding:'10px 12px', color:C.text, whiteSpace:'nowrap' }}>{r.contato_nome || '—'}</td>
                          <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                            {r.telefone ? <a href={`tel:${r.telefone}`} style={{ color:C.navy, textDecoration:'none', fontWeight:600 }}>📞 {r.telefone}</a> : <span style={{ color:C.text }}>—</span>}
                          </td>
                          <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                            {r.whatsapp ? <a href={`https://wa.me/55${r.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ color:'#16A34A', textDecoration:'none', fontWeight:600 }}>📱 {r.whatsapp}</a> : <span style={{ color:C.text }}>—</span>}
                          </td>
                          <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                            {r.email_contato ? <a href={`mailto:${r.email_contato}`} style={{ color:C.navy, textDecoration:'none' }}>{r.email_contato}</a> : <span style={{ color:C.text }}>—</span>}
                          </td>
                          <td style={{ padding:'10px 12px', color:C.text, whiteSpace:'nowrap' }}>{r.endereco_municipio || '—'}/{r.endereco_uf || '—'}</td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ background:st.bg, color:st.cor, padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:600, whiteSpace:'nowrap' }}>• {r.status_lead}</span>
                          </td>
                          <td style={{ padding:'10px 12px', whiteSpace:'nowrap', color:temp.cor, fontWeight:600, fontSize:11 }}>{temp.label}</td>
                          <td style={{ padding:'10px 12px', color: atrasado ? '#DC2626' : C.textLight, fontWeight: atrasado ? 600 : 400, whiteSpace:'nowrap' }}>
                            {atrasado ? '⚠️ ' : ''}{r.proxima_acao || '—'}
                          </td>
                          <td style={{ padding:'10px 12px', color: atrasado ? '#DC2626' : C.text, whiteSpace:'nowrap', fontWeight: atrasado ? 600 : 400 }}>{r.data_proxima_acao || '—'}</td>
                          <td style={{ padding:'10px 12px' }}>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => { setEditando({...r}); setTela('editar'); }} style={{ ...btnOutline, padding:'4px 12px', fontSize:11 }}>Abrir</button>
                              <button onClick={() => excluir(r.id)} style={{ ...btnWarning, padding:'4px 10px', fontSize:11 }}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── DASHBOARD ──
  if (tela === 'dashboard') return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <button onClick={onVoltar} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:C.textLight }}>🎯 Cockpit Comercial</div>
          <div style={{ fontSize:13, color:C.text, marginTop:2 }}>Visão completa da sua operação de prospecção</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setTela('lista')} style={btnOutline}>📋 Lista / Kanban</button>
          <button onClick={() => { setDoc(''); setNomeManual(''); setErro(''); setTela('consulta'); }} style={btnPrimary}>+ Nova Consulta</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          ['Total de Prospects', total, '👥', '#2563EB'],
          ['Clientes Fechados', porStatus('Cliente Fechado'), '✅', '#16A34A'],
          ['Em Negociação', porStatus('Negociação') + porStatus('Proposta Enviada'), '🔥', '#EA580C'],
          ['Tarefas Atrasadas', atrasados, '⚠️', '#DC2626'],
        ].map(([lb, val, ic, cor]) => (
          <div key={lb} style={{ background:C.card, borderRadius:12, padding:'16px 20px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:28 }}>{ic}</div>
            <div>
              <div style={{ fontSize:24, fontWeight:700, color:cor, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11, color:C.text, marginTop:2 }}>{lb}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          ['Novos', 'Novo', '#3B82F6'],
          ['Primeiro Contato', 'Primeiro Contato', '#8B5CF6'],
          ['Aguard. Retorno', 'Aguardando Retorno', '#F59E0B'],
          ['Visita Agendada', 'Visita Agendada', '#06B6D4'],
        ].map(([lb, statusKey, cor]) => (
          <div key={lb} onClick={() => { setFiltroStatus(statusKey); setTela('lista'); }}
            style={{ background:C.card, borderRadius:10, padding:'12px 16px', border:`1px solid ${C.border}`, cursor:'pointer', textAlign:'center' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = cor}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ fontSize:20, fontWeight:700, color:cor }}>{porStatus(statusKey)}</div>
            <div style={{ fontSize:11, color:C.text, marginTop:2 }}>{lb}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>📅 Painel Operacional — Próximos 3 dias</div>
          <div style={{ fontSize:11, color:C.text, marginBottom:12 }}>Hoje ({hoje_str}) até {proximos3_str}</div>
          {paraHoje.length === 0 ? (
            <div style={{ fontSize:13, color:C.text, textAlign:'center', padding:20 }}>✅ Nenhuma ação programada para os próximos 3 dias</div>
          ) : (
            <div style={{ display:'grid', gap:8 }}>
              {paraHoje.map(r => {
                const st = getStatus(r.status_lead);
                const temp = getTemp(r.temperatura);
                const ehHoje = r.data_proxima_acao === hoje_str;
                return (
                  <div key={r.id} onClick={() => { setEditando({...r}); setTela('editar'); }}
                    style={{ padding:'10px 14px', borderRadius:8, border:`1px solid ${ehHoje ? '#93C5FD' : C.border}`, cursor:'pointer', background: ehHoje ? '#EFF6FF' : '#F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.textLight }}>{r.razao_social || '—'}</span>
                      <span style={{ fontSize:10, color: ehHoje ? '#2563EB' : C.text, fontWeight:600 }}>{ehHoje ? '🔔 HOJE' : r.data_proxima_acao}</span>
                    </div>
                    <div style={{ fontSize:12, color:C.text, marginTop:2 }}>{r.hora_proxima_acao && `${r.hora_proxima_acao} · `}{r.proxima_acao || '—'}</div>
                    {r.telefone && <div style={{ fontSize:11, color:C.navy, marginTop:2 }}>📞 {r.telefone}{r.whatsapp && ` · 📱 ${r.whatsapp}`}</div>}
                    <div style={{ marginTop:4, display:'flex', gap:6 }}>
                      <span style={{ background:st.bg, color:st.cor, padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:600 }}>• {r.status_lead}</span>
                      <span style={{ fontSize:10, color:temp.cor, fontWeight:600 }}>{temp.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>🔥 Prioridades</div>
          <div style={{ fontSize:11, color:C.text, marginBottom:12 }}>Atrasados, próximos 3 dias e leads quentes</div>
          {prioridades.length === 0 ? (
            <div style={{ fontSize:13, color:C.text, textAlign:'center', padding:20 }}>Nenhuma prioridade no momento</div>
          ) : (
            <div style={{ display:'grid', gap:8 }}>
              {prioridades.map(r => {
                const atrasado = r.data_proxima_acao && r.data_proxima_acao < hoje_str;
                const ehHoje = r.data_proxima_acao === hoje_str;
                const temp = getTemp(r.temperatura);
                return (
                  <div key={r.id} onClick={() => { setEditando({...r}); setTela('editar'); }}
                    style={{ padding:'10px 14px', borderRadius:8, border:`1px solid ${atrasado ? '#FECACA' : C.border}`, cursor:'pointer', background: atrasado ? '#FEF2F2' : '#F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.textLight }}>{r.razao_social || '—'}</span>
                      <span style={{ fontSize:10, fontWeight:600, color: atrasado ? '#DC2626' : ehHoje ? '#2563EB' : C.text }}>
                        {atrasado ? '⚠️ ATRASADO' : ehHoje ? '🔔 HOJE' : r.data_proxima_acao}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color: atrasado ? '#DC2626' : C.text, marginTop:2 }}>{r.proxima_acao || '—'}</div>
                    {r.telefone && <div style={{ fontSize:11, color:C.navy, marginTop:2 }}>📞 {r.telefone}{r.whatsapp && ` · 📱 ${r.whatsapp}`}</div>}
                    <div style={{ fontSize:10, color:temp.cor, marginTop:2, fontWeight:600 }}>{temp.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:16 }}>🔻 Funil de Prospecção — clique para filtrar</div>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          {FUNIL.map((s) => {
            const qtd = porStatus(s.key);
            const h = Math.max(24, total > 0 ? (qtd / total) * 80 : 0);
            return (
              <div key={s.key} onClick={() => { setFiltroStatus(s.key); setTela('lista'); }}
                style={{ flex:1, textAlign:'center', cursor:'pointer' }}>
                <div style={{ fontSize:16, fontWeight:700, color:s.cor, marginBottom:4 }}>{qtd}</div>
                <div style={{ background:s.cor, borderRadius:'6px 6px 0 0', height:h, opacity:0.85 }}></div>
                <div style={{ background:s.bg, borderRadius:'0 0 6px 6px', padding:'6px 4px', border:`1px solid ${s.cor}`, borderTop:'none' }}>
                  <div style={{ fontSize:10, color:s.cor, fontWeight:600, lineHeight:1.2 }}>{s.key}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (tela === 'consulta') return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <button onClick={() => setTela('dashboard')} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>
      <div style={{ fontSize:22, fontWeight:700, color:C.textLight, marginBottom:4 }}>🔍 Nova Consulta</div>
      <div style={{ color:C.text, fontSize:13, marginBottom:24 }}>Digite o CPF ou CNPJ. Os dados serão salvos automaticamente.</div>
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:24, maxWidth:600 }}>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>{docLimpo.length > 0 && docLimpo.length <= 11 ? '👤 CPF — Pessoa Física' : '🏢 CPF ou CNPJ'}</label>
          <input value={doc} onChange={e => { setDoc(formatarDoc(e.target.value)); setErro(''); }}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            style={{ ...inputStyle, fontSize:15, padding:'10px 14px' }} />
        </div>
        {docLimpo.length > 0 && docLimpo.length <= 11 && (
          <div style={{ marginBottom:16 }}>
            <label style={labelStyle}>Nome completo (obrigatório para CPF)</label>
            <input value={nomeManual} onChange={e => setNomeManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ex: João Silva Santos"
              style={{ ...inputStyle, fontSize:15, padding:'10px 14px' }} />
          </div>
        )}
        <button onClick={buscar} disabled={loading} style={{ ...btnPrimary, width:'100%', padding:'12px', fontSize:15, opacity:loading?0.7:1 }}>
          {loading ? '⏳ Consultando e salvando...' : '🔍 Consultar'}
        </button>
        {erro && <div style={{ marginTop:12, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:12, color:'#991b1b', fontSize:13 }}>{erro}</div>}
      </div>
    </div>
  );

  if (tela === 'lista') return <ListaKanbanHeader />;

  if (tela === 'editar' && editando) {
    const uf = editando.endereco_uf || '';
    const nomeConsulta = editando.razao_social || '';
    const cnpjDoc = editando.cnpj || '';
    const trfLinks = TRF_LINKS().map(t => ({ ...t, ativo: t.ufs.includes(uf) }));
    const trfAtivo = trfLinks.find(t => t.ativo);
    const outrosLinks = [
      { label:'🔍 Google', url:`https://www.google.com/search?q=${encodeURIComponent(nomeConsulta)}` },
      { label:'📸 Instagram', url:`https://www.instagram.com/explore/search/?q=${encodeURIComponent(nomeConsulta)}` },
      { label:'👤 Facebook', url:`https://www.facebook.com/search/top?q=${encodeURIComponent(nomeConsulta)}` },
      { label:'💼 LinkedIn', url:`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(nomeConsulta)}` },
      { label:'⚖️ PGFN Regularize', url:'https://regularize.pgfn.gov.br' },
      { label:'📋 Lista Devedores', url:`https://listadevedores.pgfn.gov.br/?cnpjCpf=${cnpjDoc}` },
    ];

    return (
      <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <button onClick={() => setTela('lista')} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', fontSize:13 }}>← Voltar à lista</button>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={imprimir} style={btnOutline}>🖨️ Imprimir</button>
            <button onClick={() => excluir(editando.id)} style={btnWarning}>🗑️ Excluir</button>
            <button onClick={salvarEdicao} disabled={salvando} style={{ ...btnPrimary, opacity:salvando?0.7:1 }}>
              {salvando ? 'Salvando...' : '💾 Salvar'}
            </button>
          </div>
        </div>

        <div style={{ fontSize:20, fontWeight:700, color:C.textLight, marginBottom:2 }}>{editando.razao_social || 'Sem nome'}</div>
        <div style={{ fontSize:13, color:C.text, marginBottom:20 }}>
          {cnpjDoc.length === 11 ? maskCPF(cnpjDoc) : maskCNPJ(cnpjDoc)} · Criado em {new Date(editando.created_at).toLocaleDateString('pt-BR')}
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
          {section('🏷️ Classificação')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {field('Status do Lead', (
              <select value={editando.status_lead || 'Novo'} onChange={e => setEditando({ ...editando, status_lead: e.target.value })} style={inputStyle}>
                {STATUS_LIST.map(s => <option key={s.key}>{s.key}</option>)}
              </select>
            ))}
            {field('Temperatura', (
              <select value={editando.temperatura || 'frio'} onChange={e => setEditando({ ...editando, temperatura: e.target.value })} style={inputStyle}>
                {TEMP_LIST.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            ))}
            {field('Responsável pelo Atendimento', inp('responsavel_atendimento', 'Nome do vendedor / consultor'))}
            {field('Último Contato Realizado', inp('ultimo_contato', '', 'date'))}
          </div>
        </div>

        <div style={{ background:'#FFFBEB', borderRadius:12, padding:20, border:'2px solid #FCD34D', marginBottom:16 }}>
          {section('🎯 Próxima Ação (obrigatório)')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            {field('Ação *', (
              <select value={editando.proxima_acao || ''} onChange={e => setEditando({ ...editando, proxima_acao: e.target.value })} style={inputStyle}>
                <option value=''>Selecione...</option>
                {ACOES_LIST.map(a => <option key={a}>{a}</option>)}
              </select>
            ))}
            {field('Data *', inp('data_proxima_acao', '', 'date'))}
            {field('Hora (opcional)', inp('hora_proxima_acao', '', 'time'))}
          </div>
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
          {section('📋 Dados Cadastrais')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ gridColumn:'span 2' }}>{field('Razão Social / Nome', inp('razao_social', 'Razão social ou nome'))}</div>
            {field('Situação Cadastral', inp('situacao_cadastral', 'Ex: ATIVA'))}
            {field('Data de Abertura', inp('data_abertura', 'AAAA-MM-DD'))}
            {field('Porte', inp('porte', 'Ex: MICRO EMPRESA'))}
            {field('Natureza Jurídica', inp('natureza_juridica', 'Ex: Ltda'))}
          </div>
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
          {section('📍 Endereço')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ gridColumn:'span 2' }}>{field('Logradouro', inp('endereco_logradouro', 'Rua, Av...'))}</div>
            {field('Número', inp('endereco_numero', 'Nº'))}
            {field('Complemento', inp('endereco_complemento', 'Sala, Andar...'))}
            {field('Bairro', inp('endereco_bairro', 'Bairro'))}
            {field('CEP', inp('endereco_cep', '00000-000'))}
            {field('Município', inp('endereco_municipio', 'Cidade'))}
            {field('UF', inp('endereco_uf', 'SP'))}
          </div>
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
          {section('📞 Contato')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ gridColumn:'span 2' }}>{field('Nome do Contato / Responsável', inp('contato_nome', 'Ex: João Silva — Diretor Financeiro'))}</div>
            {field('Telefone', foneInp('telefone', '(11) 9999-9999'))}
            {field('WhatsApp', foneInp('whatsapp', '(11) 9999-9999'))}
            <div style={{ gridColumn:'span 2' }}>{field('E-mail', inp('email_contato', 'email@empresa.com.br', 'email'))}</div>
            {field('Site', inp('site_url', 'https://www.empresa.com.br'))}
            {field('LinkedIn', inp('linkedin_url', 'https://linkedin.com/company/...'))}
            {field('Facebook', inp('facebook_url', 'https://facebook.com/...'))}
            {field('Instagram', inp('instagram_url', 'https://instagram.com/...'))}
          </div>
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
          {section('👥 Sócios')}
          {editando.socios && editando.socios.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.text, letterSpacing:1, marginBottom:8 }}>DA RECEITA FEDERAL</div>
              {editando.socios.map((s, i) => (
                <div key={i} style={{ fontSize:13, padding:'8px 0', borderBottom:`1px solid ${C.border}`, color:C.textLight }}>
                  <span style={{ fontWeight:600 }}>{s.nome}</span>
                  <span style={{ color:C.text, marginLeft:8 }}>{s.qualificacao}</span>
                </div>
              ))}
            </div>
          )}
          <label style={labelStyle}>Sócios / Contatos adicionais (manual)</label>
          <textarea value={editando.socios_manual || ''} onChange={e => setEditando({ ...editando, socios_manual: e.target.value })}
            placeholder={'Nome — Cargo\nNome — Cargo'} rows={3}
            style={{ ...inputStyle, resize:'vertical' }} />
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
          {section('⚖️ Situação Judicial (TRF)')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label style={labelStyle}>Execução Fiscal Ajuizada?</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['Sim',true],['Não',false],['—',null]].map(([lb,val]) => (
                  <button key={lb} onClick={() => setEditando({ ...editando, trf_tem_execucao: val })}
                    style={{ padding:'6px 18px', borderRadius:6, border:`1.5px solid ${C.border}`, background: editando.trf_tem_execucao===val ? C.navy : '#fff', color: editando.trf_tem_execucao===val ? '#fff' : C.textLight, fontSize:13, cursor:'pointer', fontWeight:600 }}>
                    {lb}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Advogado Constituído?</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['Sim',true],['Não',false],['—',null]].map(([lb,val]) => (
                  <button key={lb} onClick={() => setEditando({ ...editando, trf_tem_advogado: val })}
                    style={{ padding:'6px 18px', borderRadius:6, border:`1.5px solid ${C.border}`, background: editando.trf_tem_advogado===val ? C.navy : '#fff', color: editando.trf_tem_advogado===val ? '#fff' : C.textLight, fontSize:13, cursor:'pointer', fontWeight:600 }}>
                    {lb}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              {field('Observação TRF', (
                <input value={editando.trf_observacao || ''} onChange={e => setEditando({ ...editando, trf_observacao: e.target.value })}
                  placeholder="Nº do processo, advogado, situação..." style={inputStyle} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
          {section('🔗 Links de Verificação')}
          {trfAtivo && (
            <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#92400E' }}>
              ⚡ Tribunal da região ({uf}): <strong>{trfAtivo.label}</strong>
            </div>
          )}
          <div style={{ fontSize:11, fontWeight:600, color:C.text, letterSpacing:1, marginBottom:8 }}>TRIBUNAIS REGIONAIS FEDERAIS</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
            {trfLinks.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none',
                  background: l.ativo ? C.navy : '#F8FAFC', color: l.ativo ? '#fff' : C.textLight,
                  border: l.ativo ? `2px solid ${C.navy}` : `1px solid ${C.border}` }}>
                {l.label}{l.ativo ? ' ✓' : ''}
              </a>
            ))}
          </div>
          <div style={{ fontSize:11, fontWeight:600, color:C.text, letterSpacing:1, marginBottom:8 }}>PGFN E REDES SOCIAIS</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {outrosLinks.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', background:'#F8FAFC', color:C.textLight, border:`1px solid ${C.border}` }}>
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:24 }}>
          {section('📝 Observações / Histórico')}
          <textarea value={editando.observacoes || ''} onChange={e => setEditando({ ...editando, observacoes: e.target.value })}
            placeholder="Anotações sobre o lead, histórico de contato, resultado das ligações..." rows={5}
            style={{ ...inputStyle, resize:'vertical' }} />
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'flex-end', paddingBottom:40 }}>
          <button onClick={() => setTela('lista')} style={btnOutline}>Cancelar</button>
          <button onClick={imprimir} style={btnOutline}>🖨️ Imprimir</button>
          <button onClick={salvarEdicao} disabled={salvando} style={{ ...btnPrimary, opacity:salvando?0.7:1 }}>
            {salvando ? 'Salvando...' : '💾 Salvar'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}