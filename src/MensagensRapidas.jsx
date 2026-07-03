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

function gerarId() { return Math.random().toString(36).slice(2,10); }

export default function MensagensRapidas({ onVoltar }) {
  const [sequencias, setSequencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState('lista');
  const [salvando, setSalvando] = useState(false);
  const [nomeSeq, setNomeSeq] = useState('');
  const [seqId, setSeqId] = useState('');
  const [mensagens, setMensagens] = useState([{ texto: '', ordem: 1 }]);

  useEffect(() => { carregarSequencias(); }, []);

  async function carregarSequencias() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('mensagens_rapidas').select('*').eq('user_id', user.id)
      .order('sequencia_id').order('sequencia_ordem');
    const grupos = {};
    (data || []).forEach(m => {
      const sid = m.sequencia_id || m.id;
      if (!grupos[sid]) grupos[sid] = { id: sid, nome: m.nome_sequencia || m.titulo, mensagens: [] };
      grupos[sid].mensagens.push(m);
    });
    setSequencias(Object.values(grupos));
    setLoading(false);
  }

  function novaSequencia() {
    setSeqId(gerarId());
    setNomeSeq('');
    setMensagens([{ texto: '', ordem: 1 }]);
    setTela('nova');
  }

  function editarSequencia(seq) {
    setSeqId(seq.id);
    setNomeSeq(seq.nome);
    setMensagens(seq.mensagens.map(m => ({ id: m.id, texto: m.mensagem, ordem: m.sequencia_ordem })));
    setTela('editar');
  }

  function addMensagem() {
    setMensagens(prev => [...prev, { texto: '', ordem: prev.length + 1 }]);
  }

  function removeMensagem(idx) {
    setMensagens(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, ordem: i + 1 })));
  }

  function updateMensagem(idx, texto) {
    setMensagens(prev => prev.map((m, i) => i === idx ? { ...m, texto } : m));
  }

  function moverUp(idx) {
    if (idx === 0) return;
    const novo = [...mensagens];
    [novo[idx-1], novo[idx]] = [novo[idx], novo[idx-1]];
    setMensagens(novo.map((m, i) => ({ ...m, ordem: i + 1 })));
  }

  function moverDown(idx) {
    if (idx === mensagens.length - 1) return;
    const novo = [...mensagens];
    [novo[idx], novo[idx+1]] = [novo[idx+1], novo[idx]];
    setMensagens(novo.map((m, i) => ({ ...m, ordem: i + 1 })));
  }

  async function salvar() {
    if (!nomeSeq.trim()) { alert('Informe o nome da sequência.'); return; }
    if (mensagens.some(m => !m.texto.trim())) { alert('Preencha todas as mensagens.'); return; }
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (tela === 'editar') {
      await supabase.from('mensagens_rapidas').delete().eq('sequencia_id', seqId);
    }
    const inserts = mensagens.map((m, i) => ({
      user_id: user.id,
      titulo: `${nomeSeq} — Msg ${i + 1}`,
      mensagem: m.texto,
      categoria: 'Sequência',
      nome_sequencia: nomeSeq,
      sequencia_id: seqId,
      sequencia_ordem: i + 1,
    }));
    await supabase.from('mensagens_rapidas').insert(inserts);
    setSalvando(false);
    await carregarSequencias();
    setTela('lista');
  }

  async function excluirSequencia(sid) {
    if (!window.confirm('Excluir esta sequência?')) return;
    await supabase.from('mensagens_rapidas').delete().eq('sequencia_id', sid);
    await carregarSequencias();
  }

  const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  function voltarLista() { setTela('lista'); }
  function voltar() { if (typeof onVoltar === 'function') onVoltar(); }

  // ── FORMULÁRIO ──
  if (tela === 'nova' || tela === 'editar') return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <button onClick={voltarLista} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>
      <div style={{ fontSize:20, fontWeight:700, color:C.textLight, marginBottom:20 }}>
        {tela === 'nova' ? '✏️ Nova Sequência' : '✏️ Editar Sequência'}
      </div>
      <div style={{ background:C.card, borderRadius:12, padding:24, border:`1px solid ${C.border}`, maxWidth:700 }}>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Nome da sequência</label>
          <input value={nomeSeq} onChange={e => setNomeSeq(e.target.value)}
            placeholder="Ex: Abordagem Inicial PGFN" style={inputStyle} />
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>Mensagens (em ordem de envio)</div>
        {mensagens.map((m, i) => (
          <div key={i} style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
            <div style={{ fontSize:20, flexShrink:0, marginTop:8 }}>{NUMS[i] || `${i+1}.`}</div>
            <textarea value={m.texto} onChange={e => updateMensagem(i, e.target.value)}
              placeholder={`Mensagem ${i + 1}...`} rows={2}
              style={{ ...inputStyle, resize:'vertical', flex:1 }} />
            <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
              <button onClick={() => moverUp(i)} disabled={i===0}
                style={{ padding:'4px 8px', borderRadius:4, border:`1px solid ${C.border}`, background:'#fff', cursor:i===0?'default':'pointer', fontSize:11, opacity:i===0?0.4:1 }}>↑</button>
              <button onClick={() => moverDown(i)} disabled={i===mensagens.length-1}
                style={{ padding:'4px 8px', borderRadius:4, border:`1px solid ${C.border}`, background:'#fff', cursor:i===mensagens.length-1?'default':'pointer', fontSize:11, opacity:i===mensagens.length-1?0.4:1 }}>↓</button>
              <button onClick={() => removeMensagem(i)} disabled={mensagens.length===1}
                style={{ padding:'4px 8px', borderRadius:4, border:'1px solid #FECACA', background:'#FEF2F2', color:'#DC2626', cursor:mensagens.length===1?'default':'pointer', fontSize:11, opacity:mensagens.length===1?0.4:1 }}>✕</button>
            </div>
          </div>
        ))}
        <button onClick={addMensagem} style={{ ...btnOutline, padding:'6px 16px', fontSize:12, marginBottom:20 }}>
          + Adicionar mensagem
        </button>
        {mensagens.some(m => m.texto) && (
          <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#16A34A', marginBottom:10 }}>👁️ Preview</div>
            {mensagens.map((m, i) => (
              <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{NUMS[i] || `${i+1}.`}</span>
                <div style={{ background:'#DCF8C6', borderRadius:'8px 8px 8px 0', padding:'8px 12px', fontSize:13, color:'#1E293B', lineHeight:1.5, flex:1 }}>
                  {m.texto || <span style={{ color:'#94A3B8', fontStyle:'italic' }}>mensagem vazia</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={voltarLista} style={btnOutline}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrimary, opacity:salvando?0.7:1 }}>
            {salvando ? 'Salvando...' : '💾 Salvar sequência'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── LISTA ──
  return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <button onClick={voltar} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:C.textLight }}>⚡ Sequências de Mensagens</div>
          <div style={{ fontSize:13, color:C.text, marginTop:2 }}>{sequencias.length} sequência{sequencias.length !== 1 ? 's' : ''} cadastrada{sequencias.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={novaSequencia} style={btnPrimary}>+ Nova Sequência</button>
      </div>

      {loading && <div style={{ color:C.text, textAlign:'center', padding:40 }}>Carregando...</div>}

      {!loading && sequencias.length === 0 && (
        <div style={{ background:C.card, borderRadius:12, padding:48, textAlign:'center', border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
          <div style={{ fontSize:16, fontWeight:600, color:C.textLight, marginBottom:8 }}>Nenhuma sequência ainda</div>
          <div style={{ fontSize:13, color:C.text, marginBottom:20 }}>Crie sequências de mensagens para usar na prospecção pelo WhatsApp.</div>
          <button onClick={novaSequencia} style={btnPrimary}>+ Criar primeira sequência</button>
        </div>
      )}

      <div style={{ display:'grid', gap:16 }}>
        {sequencias.map(seq => (
          <div key={seq.id} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.textLight }}>⚡ {seq.nome}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, color:C.text, background:'#F1F5F9', padding:'3px 10px', borderRadius:20 }}>
                  {seq.mensagens.length} mensagem{seq.mensagens.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => editarSequencia(seq)} style={{ ...btnOutline, padding:'4px 14px', fontSize:12 }}>✏️ Editar</button>
                <button onClick={() => excluirSequencia(seq.id)} style={{ ...btnWarning, padding:'4px 12px', fontSize:12 }}>🗑️</button>
              </div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              {seq.mensagens.sort((a,b) => a.sequencia_ordem - b.sequencia_ordem).map((m, i) => (
                <div key={m.id} style={{ display:'flex', gap:12, marginBottom:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{NUMS[i] || `${i+1}.`}</span>
                  <div style={{ background:'#F8FAFC', borderRadius:'8px 8px 8px 0', padding:'10px 14px', fontSize:13, color:C.textLight, lineHeight:1.6, flex:1, border:`1px solid ${C.border}` }}>
                    {m.mensagem}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}