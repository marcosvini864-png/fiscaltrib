import { useState, useEffect, useRef } from 'react';
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
const btnTipo = (ativo) => ({
  padding:'6px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
  border: ativo ? '1.5px solid #0B1F4D' : '1px solid #C8D0DC',
  background: ativo ? '#0B1F4D' : '#fff',
  color: ativo ? '#fff' : '#64748B',
});

const TAMANHO_MAX_MB = 10;
const BUCKET = 'midias-mensagens';

function gerarId() { return Math.random().toString(36).slice(2,10); }

function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0');
  const s = (segundos % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function bufferParaWav(abuffer) {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let offset = 0;
  let pos = 0;

  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < numOfChan; i++) channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample | 0, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}

async function converterParaWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const wavBlob = bufferParaWav(audioBuffer);
  audioCtx.close();
  return wavBlob;
}

function PreviewMidia({ tipo, url }) {
  if (!url) return null;
  if (tipo === 'audio') {
    return <audio controls src={url} style={{ width:'100%', height:36, marginTop:6 }} />;
  }
  if (tipo === 'foto') {
    return <img src={url} alt="Preview" style={{ maxWidth:'100%', maxHeight:180, borderRadius:8, marginTop:6, display:'block' }} />;
  }
  if (tipo === 'video') {
    return <video controls src={url} style={{ maxWidth:'100%', maxHeight:200, borderRadius:8, marginTop:6, display:'block' }} />;
  }
  return null;
}

export default function MensagensRapidas({ onVoltar }) {
  const [sequencias, setSequencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState('lista');
  const [salvando, setSalvando] = useState(false);
  const [nomeSeq, setNomeSeq] = useState('');
  const [seqId, setSeqId] = useState('');
  const [mensagens, setMensagens] = useState([{ texto: '', tipo_conteudo: 'texto', midia_url: '', ordem: 1 }]);
  const [enviandoIdx, setEnviandoIdx] = useState(null);
  const [gravandoIdx, setGravandoIdx] = useState(null);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [convertendoIdx, setConvertendoIdx] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => { carregarSequencias(); }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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
    setMensagens([{ texto: '', tipo_conteudo: 'texto', midia_url: '', ordem: 1 }]);
    setTela('nova');
  }

  function editarSequencia(seq) {
    setSeqId(seq.id);
    setNomeSeq(seq.nome);
    setMensagens(seq.mensagens.map(m => ({
      id: m.id,
      texto: m.mensagem || '',
      tipo_conteudo: m.tipo_conteudo || 'texto',
      midia_url: m.midia_url || '',
      ordem: m.sequencia_ordem,
    })));
    setTela('editar');
  }

  function addMensagem() {
    setMensagens(prev => [...prev, { texto: '', tipo_conteudo: 'texto', midia_url: '', ordem: prev.length + 1 }]);
  }

  function removeMensagem(idx) {
    setMensagens(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, ordem: i + 1 })));
  }

  function updateCampo(idx, campo, valor) {
    setMensagens(prev => prev.map((m, i) => i === idx ? { ...m, [campo]: valor } : m));
  }

  function trocarTipo(idx, novoTipo) {
    setMensagens(prev => prev.map((m, i) => i === idx ? { ...m, tipo_conteudo: novoTipo, texto: '', midia_url: '' } : m));
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

  async function uploadArquivo(idx, file) {
    if (!file) return;
    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > TAMANHO_MAX_MB) {
      alert(`Arquivo muito grande (${tamanhoMB.toFixed(1)}MB). O limite é ${TAMANHO_MAX_MB}MB.`);
      return;
    }
    setEnviandoIdx(idx);
    try {
      const ext = file.name.split('.').pop();
      const caminho = `${gerarId()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(caminho, file);
      if (error) { alert('Erro ao enviar arquivo: ' + error.message); return; }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
      updateCampo(idx, 'midia_url', data.publicUrl);
    } finally {
      setEnviandoIdx(null);
    }
  }

  async function uploadAudioComConversao(idx, file) {
    setConvertendoIdx(idx);
    try {
      const wavBlob = await converterParaWav(file);
      const wavFile = new File([wavBlob], `audio-${gerarId()}.wav`, { type: 'audio/wav' });
      await uploadArquivo(idx, wavFile);
    } catch (e) {
      alert('Erro ao converter áudio para formato compatível: ' + e.message);
    } finally {
      setConvertendoIdx(null);
    }
  }

  async function iniciarGravacao(idx) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await uploadAudioComConversao(idx, blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setGravandoIdx(idx);
      setTempoGravacao(0);
      timerRef.current = setInterval(() => {
        setTempoGravacao(prev => prev + 1);
      }, 1000);
    } catch (e) {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }

  function pararGravacao() {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setGravandoIdx(null);
    setTempoGravacao(0);
  }

  async function salvar() {
    if (!nomeSeq.trim()) { alert('Informe o nome da sequência.'); return; }
    const incompleta = mensagens.some(m =>
      m.tipo_conteudo === 'texto' ? !m.texto.trim() : !m.midia_url
    );
    if (incompleta) { alert('Preencha ou anexe todas as mensagens.'); return; }

    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (tela === 'editar') {
      await supabase.from('mensagens_rapidas').delete().eq('sequencia_id', seqId);
    }
    const inserts = mensagens.map((m, i) => ({
      user_id: user.id,
      titulo: `${nomeSeq} — Msg ${i + 1}`,
      mensagem: m.texto,
      tipo_conteudo: m.tipo_conteudo,
      midia_url: m.midia_url || null,
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

  const NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

  function voltarLista() { setTela('lista'); }
  function voltar() { if (typeof onVoltar === 'function') onVoltar(); }

  function iconeTipo(tipo) {
    if (tipo === 'audio') return '🎤';
    if (tipo === 'foto') return '📷';
    if (tipo === 'video') return '🎬';
    return '📝';
  }

  // — FORMULÁRIO —
  if (tela === 'nova' || tela === 'editar') return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <style>{`
        @keyframes ft-pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <button onClick={voltarLista} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:700, color:C.textLight, marginBottom:12 }}>
          {tela === 'nova' ? '+ Nova Sequência' : '✎ Editar Sequência'}
        </div>
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

            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                <button type="button" onClick={() => trocarTipo(i, 'texto')} style={btnTipo(m.tipo_conteudo === 'texto')}>📝 Texto</button>
                <button type="button" onClick={() => trocarTipo(i, 'audio')} style={btnTipo(m.tipo_conteudo === 'audio')}>🎤 Voz</button>
                <button type="button" onClick={() => trocarTipo(i, 'foto')} style={btnTipo(m.tipo_conteudo === 'foto')}>📷 Foto</button>
                <button type="button" onClick={() => trocarTipo(i, 'video')} style={btnTipo(m.tipo_conteudo === 'video')}>🎬 Vídeo</button>
              </div>

              {m.tipo_conteudo === 'texto' && (
                <textarea value={m.texto} onChange={e => updateCampo(i, 'texto', e.target.value)}
                  placeholder={`Mensagem ${i+1}...`} rows={2}
                  style={{ ...inputStyle, resize:'vertical' }} />
              )}

              {(m.tipo_conteudo === 'foto' || m.tipo_conteudo === 'video') && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <input type="file" accept={m.tipo_conteudo === 'foto' ? 'image/*' : 'video/*'}
                    onChange={e => uploadArquivo(i, e.target.files[0])}
                    disabled={enviandoIdx === i}
                    style={{ fontSize:12 }} />
                  <div style={{ fontSize:11, color:C.text }}>ou cole um link já hospedado:</div>
                  <input value={m.midia_url && !m.midia_url.includes(BUCKET) ? m.midia_url : (m.midia_url && m.midia_url.includes(BUCKET) ? '' : m.midia_url)}
                    onChange={e => updateCampo(i, 'midia_url', e.target.value)}
                    placeholder="https://..." style={inputStyle} />
                  {enviandoIdx === i && <div style={{ fontSize:11, color:C.navy }}>Enviando arquivo...</div>}
                  {m.midia_url && enviandoIdx !== i && (
                    <>
                      <div style={{ fontSize:11, color:'#16A34A' }}>✓ Arquivo anexado</div>
                      <PreviewMidia tipo={m.tipo_conteudo} url={m.midia_url} />
                    </>
                  )}
                </div>
              )}

              {m.tipo_conteudo === 'audio' && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {gravandoIdx === i ? (
                      <button type="button" onClick={pararGravacao}
                        style={{ ...btnWarning, padding:'6px 14px', fontSize:12 }}>⏹ Parar gravação</button>
                    ) : (
                      <button type="button" onClick={() => iniciarGravacao(i)}
                        disabled={gravandoIdx !== null || convertendoIdx === i}
                        style={{ ...btnOutline, padding:'6px 14px', fontSize:12 }}>🎙 Gravar</button>
                    )}
                    <span style={{ fontSize:11, color:C.text }}>ou envie um áudio pronto:</span>
                    <input type="file" accept="audio/*" onChange={e => uploadAudioComConversao(i, e.target.files[0])}
                      disabled={enviandoIdx === i || convertendoIdx === i} style={{ fontSize:12 }} />
                  </div>

                  {gravandoIdx === i && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'8px 14px' }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:'#DC2626', animation:'ft-pulse 1.2s ease-in-out infinite' }} />
                      <span style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>Gravando... {formatarTempo(tempoGravacao)}</span>
                    </div>
                  )}

                  {convertendoIdx === i && <div style={{ fontSize:11, color:C.navy }}>Convertendo áudio para formato compatível...</div>}
                  {enviandoIdx === i && convertendoIdx !== i && <div style={{ fontSize:11, color:C.navy }}>Enviando áudio...</div>}
                  {m.midia_url && enviandoIdx !== i && gravandoIdx !== i && convertendoIdx !== i && (
                    <>
                      <div style={{ fontSize:11, color:'#16A34A' }}>✓ Áudio anexado</div>
                      <PreviewMidia tipo="audio" url={m.midia_url} />
                    </>
                  )}
                </div>
              )}

              <div style={{ display:'flex', gap:4, marginTop:8 }}>
                <button onClick={() => moverUp(i)} disabled={i === 0}
                  style={{ padding:'4px 8px', borderRadius:4, border:`1px solid ${C.border}`, background:'#fff', cursor:i===0?'default':'pointer', fontSize:11, opacity:i===0?0.4:1 }}>↑</button>
                <button onClick={() => moverDown(i)} disabled={i === mensagens.length-1}
                  style={{ padding:'4px 8px', borderRadius:4, border:`1px solid ${C.border}`, background:'#fff', cursor:i===mensagens.length-1?'default':'pointer', fontSize:11, opacity:i===mensagens.length-1?0.4:1 }}>↓</button>
                <button onClick={() => removeMensagem(i)} disabled={mensagens.length===1}
                  style={{ padding:'4px 8px', borderRadius:4, border:'1px solid #FECACA', background:'#FEF2F2', color:'#DC2626', cursor:mensagens.length===1?'default':'pointer', fontSize:11, opacity:mensagens.length===1?0.4:1 }}>✕</button>
              </div>
            </div>
          </div>
        ))}

        <button onClick={addMensagem} style={{ ...btnOutline, padding:'6px 16px', fontSize:12, marginBottom:20 }}>+ Adicionar mensagem</button>

        {mensagens.some(m => m.tipo_conteudo === 'texto' ? m.texto : m.midia_url) && (
          <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#16A34A', marginBottom:10 }}>◎ Preview</div>
            {mensagens.map((m, i) => (
              (m.tipo_conteudo === 'texto' ? m.texto : m.midia_url) && (
                <div key={i} style={{ display:'flex', gap:12, marginBottom:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{NUMS[i] || `${i+1}.`}</span>
                  <div style={{ background:'#F8FAFC', borderRadius:'8px 8px 8px 0', padding:'10px 14px', fontSize:13, color:C.textLight, lineHeight:1.6, flex:1 }}>
                    <div>{iconeTipo(m.tipo_conteudo)} {m.tipo_conteudo === 'texto' ? m.texto : `Arquivo anexado (${m.tipo_conteudo})`}</div>
                    {m.tipo_conteudo !== 'texto' && <PreviewMidia tipo={m.tipo_conteudo} url={m.midia_url} />}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrimary, opacity: salvando ? 0.6 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar sequência'}
          </button>
          <button onClick={voltarLista} style={btnOutline}>Cancelar</button>
        </div>
      </div>
    </div>
  );

  // — LISTA —
  return (
    <div style={{ padding:24, background:C.bg, minHeight:'100vh' }}>
      <button onClick={voltar} style={{ background:'none', border:'none', color:C.text, cursor:'pointer', marginBottom:16, fontSize:13 }}>← Voltar</button>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:C.textLight }}>Sequências de Mensagens</div>
          <div style={{ fontSize:13, color:C.text, marginTop:2 }}>{sequencias.length} sequência{sequencias.length !== 1 ? 's' : ''} cadastrada{sequencias.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={novaSequencia} style={btnPrimary}>+ Nova Sequência</button>
      </div>

      {loading && <div style={{ color:C.text, textAlign:'center', padding:40 }}>Carregando...</div>}

      {!loading && sequencias.length === 0 && (
        <div style={{ background:C.card, borderRadius:12, padding:48, textAlign:'center', border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>◇</div>
          <div style={{ fontSize:16, fontWeight:600, color:C.textLight, marginBottom:8 }}>Nenhuma sequência ainda</div>
          <div style={{ fontSize:13, color:C.text, marginBottom:20 }}>Crie sequências de mensagens para usar na prospecção pelo WhatsApp.</div>
          <button onClick={novaSequencia} style={btnPrimary}>+ Criar primeira sequência</button>
        </div>
      )}

      <div style={{ display:'grid', gap:16 }}>
        {sequencias.map(seq => (
          <div key={seq.id} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.textLight }}>{seq.nome}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, color:C.text, background:'#F1F5F9', padding:'3px 10px', borderRadius:20 }}>
                  {seq.mensagens.length} mensage{seq.mensagens.length !== 1 ? 'ns' : 'm'}
                </span>
                <button onClick={() => editarSequencia(seq)} style={{ ...btnOutline, padding:'4px 14px', fontSize:12 }}>✎ Editar</button>
                <button onClick={() => excluirSequencia(seq.id)} style={{ ...btnWarning, padding:'4px 12px', fontSize:12 }}>🗑</button>
              </div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              {seq.mensagens.sort((a,b) => a.sequencia_ordem - b.sequencia_ordem).map((m, i) => (
                <div key={m.id} style={{ display:'flex', gap:12, marginBottom:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{NUMS[i] || `${i+1}.`}</span>
                  <div style={{ background:'#F8FAFC', borderRadius:'8px 8px 8px 0', padding:'10px 14px', fontSize:13, color:C.textLight, lineHeight:1.6, flex:1 }}>
                    <div>{iconeTipo(m.tipo_conteudo)} {m.tipo_conteudo === 'texto' ? m.mensagem : `Arquivo (${m.tipo_conteudo})`}</div>
                    {m.tipo_conteudo !== 'texto' && <PreviewMidia tipo={m.tipo_conteudo} url={m.midia_url} />}
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