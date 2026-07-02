import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const C = {
  bg: '#E4E7EC', card: '#FFFFFF', border: '#C8D0DC',
  text: '#64748B', textLight: '#1E293B', navy: '#0B1F4D',
};

const inputStyle = { width:'100%', padding:'8px 12px', borderRadius:6, border:'1px solid #C8D0DC', background:'#FFFFFF', color:'#1E293B', fontSize:13, boxSizing:'border-box' };
const labelStyle = { fontSize:12, fontWeight:600, color:'#0B1F4D', display:'block', marginBottom:4 };
const btnPrimary = { padding:'8px 20px', borderRadius:8, background:'#0B1F4D', color:'#fff', border:'none', fontWeight:600, cursor:'pointer', fontSize:13 };
const btnOutline = { padding:'8px 20px', borderRadius:8, background:'#fff', color:'#0B1F4D', border:'1.5px solid #0B1F4D', fontWeight:600, cursor:'pointer', fontSize:13 };
const btnWarning = { padding:'8px 20px', borderRadius:8, background:'#F59E0B', color:'#fff', border:'none', fontWeight:600, cursor:'pointer', fontSize:13 };
const btnGreen = { padding:'8px 20px', borderRadius:8, background:'#16A34A', color:'#fff', border:'none', fontWeight:600, cursor:'pointer', fontSize:13 };

const CATEGORIAS = ['Geral', 'Primeiro Contato', 'Follow-up', 'Proposta', 'Negociação', 'Encerramento'];

export default function MensagensRapidas({ onVoltar }) {
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState('lista'); // lista | nova | editar
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busca, setBusca] = useState('');
  const [copiado, setCopiado] = useState(null);

  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [categoria, setCategoria] = useState('Geral');

  useEffect(() => { carregarMensagens(); }, []);

  async function carregarMensagens() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('mensagens_rapidas').select('*').eq('user_id', user.id)
      .order('categoria').order('titulo');
    setMensagens(data || []);
    setLoading(false);
  }

  async function salvar() {
    if (!titulo.trim()) { alert('Informe o título da mensagem.'); return; }
    if (!mensagem.trim()) { alert('Informe o texto da mensagem.'); return; }
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (editando) {
      await supabase.from('mensagens_rapidas').update({ titulo, mensagem, categoria }).eq('id', editando.id);
    } else {
      await supabase.from('mensagens_rapidas').insert([{ user_id: user.id, titulo, mensagem, categoria }]);
    }
    setSalvando(false);
    await carregarMensagens();
    setTela('lista');
    setTitulo(''); setMensagem(''); setCategoria('Geral'); setEditando(null);
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta mensagem?')) return;
    await supabase.from('mensagens_rapidas').delete().eq('id', id);
    await carregarMensagens();
  }

  function copiar(m) {
    navigator.clipboard.writeText(m.mensagem);
    setCopiado(m.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  function abrirEditar(m) {
    setEditando(m);
    setTitulo(m.titulo);
    setMensagem(m.mensagem);
    setCategoria(m.categoria);
    setTela('editar');
  }

  function novaMensagem() {
    setEditando(null);
    setTitulo(''); setMensagem(''); setCategoria('Geral');
    setTela('nova');
  }

  const filtradas = mensagens.filter(m => {
    const matchBusca = (m.titulo||'').toLowerCase().includes(busca.toLowerCase()) ||
      (m.mensagem||'').toLowerCase().includes(busca.toLowerCase());
    const matchCat = !filtroCategoria || m.categoria === filtroCategoria;
    return matchBusca && matchCat;
  });

  const porCategoria = CATEGORIAS.map(cat => ({
    cat,
    itens: filtradas.filter(m => m.categoria === cat)
  })).filter(g => g.itens.length > 0);

  // ── FORMULÁRIO ──
  if (tela === 'nova' || tela === 'editar') return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <button onClick={() => setTela('lista')} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>
      <div style={{ fontSize:20, fontWeight:700, color:C.textLight, marginBottom:20 }}>
        {tela === 'nova' ? '✏️ Nova Mensagem Rápida' : '✏️ Editar Mensagem'}
      </div>

      <div style={{ background:C.card, borderRadius:12, padding:24, border:`1px solid ${C.border}`, maxWidth:700 }}>
        <div style={{ display:'grid', gap:16 }}>
          <div>
            <label style={labelStyle}>Título (nome interno da mensagem)</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Primeiro contato PGFN"
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputStyle}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Texto da mensagem
              <span style={{ fontSize:11, color:C.text, fontWeight:400, marginLeft:8 }}>
                Use [Nome] para inserir o nome da empresa automaticamente
              </span>
            </label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              placeholder="Ex: Olá [Nome], identificamos que sua empresa possui débitos na PGFN. Podemos ajudar a regularizar sua situação fiscal com condições especiais. Podemos conversar?"
              rows={8}
              style={{ ...inputStyle, resize:'vertical', lineHeight:1.6 }}
            />
            <div style={{ fontSize:11, color:C.text, marginTop:4 }}>
              {mensagem.length} caracteres
            </div>
          </div>

          {/* Preview */}
          {mensagem && (
            <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#16A34A', marginBottom:8 }}>👁️ Preview da mensagem</div>
              <div style={{ fontSize:13, color:C.textLight, lineHeight:1.7, whiteSpace:'pre-wrap' }}>
                {mensagem.replace(/\[Nome\]/g, 'Empresa Exemplo Ltda')}
              </div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:12, marginTop:20 }}>
          <button onClick={() => setTela('lista')} style={btnOutline}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrimary, opacity:salvando?0.7:1 }}>
            {salvando ? 'Salvando...' : '💾 Salvar mensagem'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── LISTA ──
  return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <button onClick={onVoltar} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:C.textLight }}>⚡ Mensagens Rápidas</div>
          <div style={{ fontSize:13, color:C.text, marginTop:2 }}>{mensagens.length} mensagens cadastradas</div>
        </div>
        <button onClick={novaMensagem} style={btnPrimary}>+ Nova Mensagem</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar mensagem..."
          style={{ ...inputStyle, flex:1, minWidth:200, padding:'8px 14px' }} />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...inputStyle, width:180 }}>
          <option value=''>Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
        {filtroCategoria && <button onClick={() => setFiltroCategoria('')} style={{ ...btnOutline, padding:'6px 14px', fontSize:12 }}>✕ Limpar</button>}
      </div>

      {loading && <div style={{ color:C.text, textAlign:'center', padding:40 }}>Carregando...</div>}

      {!loading && filtradas.length === 0 && (
        <div style={{ background:C.card, borderRadius:12, padding:48, textAlign:'center', border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
          <div style={{ fontSize:16, fontWeight:600, color:C.textLight, marginBottom:8 }}>Nenhuma mensagem ainda</div>
          <div style={{ fontSize:13, color:C.text, marginBottom:20 }}>Crie templates de mensagem para agilizar seus contatos comerciais.</div>
          <button onClick={novaMensagem} style={btnPrimary}>+ Criar primeira mensagem</button>
        </div>
      )}

      {/* Mensagens agrupadas por categoria */}
      {porCategoria.map(({ cat, itens }) => (
        <div key={cat} style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'#EFF6FF', color:'#1e40af', padding:'3px 10px', borderRadius:20, fontSize:11 }}>{cat}</span>
            <span style={{ color:C.text, fontSize:12, fontWeight:400 }}>{itens.length} mensagem{itens.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display:'grid', gap:10 }}>
            {itens.map(m => (
              <div key={m.id} style={{ background:C.card, borderRadius:12, padding:20, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.textLight, marginBottom:8 }}>{m.titulo}</div>
                    <div style={{ fontSize:13, color:C.text, lineHeight:1.6, whiteSpace:'pre-wrap',
                      display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {m.mensagem}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    <button onClick={() => copiar(m)}
                      style={{ ...btnGreen, padding:'6px 14px', fontSize:12,
                        background: copiado === m.id ? '#14532d' : '#16A34A' }}>
                      {copiado === m.id ? '✅ Copiado!' : '📋 Copiar'}
                    </button>
                    <button onClick={() => abrirEditar(m)} style={{ ...btnOutline, padding:'6px 14px', fontSize:12 }}>✏️</button>
                    <button onClick={() => excluir(m.id)} style={{ ...btnWarning, padding:'6px 10px', fontSize:12 }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}