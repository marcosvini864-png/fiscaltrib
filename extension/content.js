const SUPABASE_URL = 'https://ikodyhxukvclgzydvztu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2R5aHh1a3ZjbGd6eWR2enR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTU1OTEsImV4cCI6MjA5Njg3MTU5MX0.X_02n8Hy0LaFoZQmLdGwjIA_LixYkMlxeVaMay4rRfg';

let token = null;
let userId = null;
let sequencias = [];
let permissoesExtensao = {};
let painelAtivo = null;
let enviandoAgora = false;
let atualizandoLista = false;

let mensagensContainerEl = null;
let viewMensagens = 'lista'; // 'lista' | 'form'
let form = null;

// ── KANBAN ──
let kanbanContainerEl = null;
let kanbanColunas = [];
let kanbanRegistros = [];
let kanbanBusca = '';
let kanbanEditando = null;
let kanbanSalvando = false;
let dragItemKanban = null;
let kanbanMsgOverlayAberto = false;
let kanbanMsgWhatsapp = '';
let kanbanMsgBusca = '';

const KANBAN_COLS_META = [
  { key: 'col1', cor: '#3B82F6', bg: '#EFF6FF' },
  { key: 'col2', cor: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'col3', cor: '#F59E0B', bg: '#FFFBEB' },
  { key: 'col4', cor: '#06B6D4', bg: '#ECFEFF' },
  { key: 'col5', cor: '#F97316', bg: '#FFF7ED' },
  { key: 'col6', cor: '#EF4444', bg: '#FEF2F2' },
  { key: 'col7', cor: '#16A34A', bg: '#F0FDF4' },
  { key: 'col8', cor: '#6B7280', bg: '#F9FAFB' },
];
const KANBAN_COLS_DEFAULT_LABEL = {
  col1: 'Novo', col2: 'Primeiro Contato', col3: 'Aguardando Retorno', col4: 'Visita Agendada',
  col5: 'Proposta Enviada', col6: 'Negociação', col7: 'Cliente Fechado', col8: 'Perdido',
};

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

const MODULOS_BLOQUEAVEIS = ['dashboard', 'kanban', 'chatbot', 'campanhas', 'importar', 'link_qr', 'lembretes', 'webhooks'];

const MODULOS = [
  { id: 'dashboard',   icone: '📊', label: 'Dashboard',              pronto: false },
  { id: 'kanban',      icone: '🗂️', label: 'Modo CRM (Kanban)',      pronto: true  },
  { id: 'mensagens',   icone: '💬', label: 'Mensagens rápidas',      pronto: true  },
  { id: 'chatbot',     tipo: 'atendente', label: 'Chat Bot',          pronto: false },
  { id: 'campanhas',   icone: '📣', label: 'Campanhas',               pronto: false },
  { id: 'importar',    icone: '🔀', label: 'Importar/Exportar dados', pronto: false },
  { id: 'link_qr',     icone: '🔗', label: 'Gerar link e QR',         pronto: false },
  { id: 'lembretes',   icone: '⏰', label: 'Lembretes e agendamentos',pronto: false },
  { id: 'webhooks',    icone: '⚙️', label: 'Webhooks',                pronto: false },
];

const RODAPE = [
  { id: 'youtube', label: 'YouTube', pronto: false, tipo: 'video'  },
  { id: 'ajuda',   label: 'Ajuda',   pronto: false, tipo: 'ajuda'  },
  { id: 'conta',   label: 'Conta',   pronto: false, tipo: 'conta'  },
  { id: 'idioma',  label: 'Idioma',  pronto: false, tipo: 'idioma' },
];

const LARGURA_BARRA = 70; // px
const LARGURA_PAINEL = 270; // px (padrão para a maioria dos módulos)
const PAINEL_LARGURAS = { kanban: 860 };

function larguraDoPainel(id) { return PAINEL_LARGURAS[id] || LARGURA_PAINEL; }

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'toggle_panel') abrirModulo('mensagens');
});

function gerarId() { return Math.random().toString(36).slice(2, 10); }

async function init() {
  const data = await chrome.storage.local.get(['ft_token']);
  if (!data.ft_token) return;
  token = data.ft_token;
  await carregarUsuario();
  await carregarPermissoes();
  await carregarSequencias();
  injetarBarraLateral();
}

async function carregarUsuario() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    userId = data?.id || null;
  } catch (e) { userId = null; }
}

async function carregarPermissoes() {
  if (!userId) { permissoesExtensao = {}; return; }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/extensao_permissoes?usuario_id=eq.${userId}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    permissoesExtensao = (data && data[0]) ? data[0] : {};
  } catch (e) { permissoesExtensao = {}; }
}

function moduloBloqueado(id) {
  if (!MODULOS_BLOQUEAVEIS.includes(id)) return false;
  return permissoesExtensao[id] === false;
}

function injetarBarraLateral() {
  const interval = setInterval(() => {
    if (document.body) {
      clearInterval(interval);
      criarBarraLateral();
    }
  }, 500);
}

function svgIconeBranco(tipo) {
  if (tipo === 'ajuda') {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/>
        <circle cx="12" cy="17" r="0.5" fill="#fff"/>
      </svg>
    `;
  }
  if (tipo === 'conta') {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
      </svg>
    `;
  }
  if (tipo === 'atendente') {
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>
        <path d="M4.5 8.5a7.5 7.5 0 0 1 15 0"/>
        <path d="M4.5 8.5v2.2a1.3 1.3 0 0 0 1.3 1.3h.2a1 1 0 0 0 1-1v-1.5a1 1 0 0 0-1-1h-1.5z"/>
        <path d="M19.5 8.5v2.2a1.3 1.3 0 0 1-1.3 1.3h-.2a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1h1.5z"/>
        <path d="M15.5 12.2v.6a2 2 0 0 1-2 2h-1"/>
      </svg>
    `;
  }
  return '';
}

function svgCadeado() {
  return `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  `;
}

function criarIcone(m, barra) {
  const bloqueado = moduloBloqueado(m.id);

  const btn = document.createElement('div');
  btn.className = 'ft-icone';
  btn.dataset.modulo = m.id;
  btn.title = bloqueado ? `${m.label} (bloqueado)` : m.label;
  btn.style.cssText = `
    width: 49px;
    height: 49px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
  `;

  if (m.tipo === 'video') {
    btn.innerHTML = `
      <div style="width:34px;height:34px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;">
        <svg width="18" height="13" viewBox="0 0 26 18" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="26" height="18" rx="5" fill="#E63946"/>
          <polygon points="10.5,5.5 10.5,12.5 17,9" fill="#fff"/>
        </svg>
      </div>
    `;
  } else if (m.tipo === 'ajuda' || m.tipo === 'conta' || m.tipo === 'atendente') {
    btn.innerHTML = svgIconeBranco(m.tipo);
    btn.style.opacity = m.tipo === 'atendente' ? (m.pronto ? '1' : '0.55') : '0.7';
  } else if (m.tipo === 'idioma') {
    btn.innerHTML = `
      <div style="width:32px;height:22px;border-radius:4px;background:linear-gradient(135deg, #009C3B 0%, #009C3B 33%, #FFDF00 33%, #FFDF00 66%, #002776 66%);"></div>
    `;
  } else {
    btn.textContent = m.icone;
    btn.style.fontSize = '24px';
    btn.style.opacity = m.pronto ? '1' : '0.55';
  }

  if (bloqueado) {
    btn.style.opacity = '0.35';
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #DC2626;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #0B1F4D;
    `;
    badge.innerHTML = svgCadeado();
    btn.appendChild(badge);
  }

  btn.addEventListener('mouseover', () => btn.style.background = 'rgba(255,255,255,0.15)');
  btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
  btn.addEventListener('click', () => abrirModulo(m.id));
  barra.appendChild(btn);
}

function criarBarraLateral() {
  if (document.getElementById('ft-barra')) return;

  const barra = document.createElement('div');
  barra.id = 'ft-barra';
  barra.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    width: ${LARGURA_BARRA}px;
    background: #0B1F4D;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 0 36px;
    gap: 8px;
    box-shadow: 2px 0 8px rgba(0,0,0,0.2);
    font-family: Inter, system-ui, sans-serif;
    overflow-y: auto;
    box-sizing: border-box;
  `;

  const logo = document.createElement('div');
  logo.textContent = '🎯';
  logo.style.cssText = `font-size:29px;margin-bottom:12px;flex-shrink:0;`;
  barra.appendChild(logo);

  MODULOS.forEach(m => criarIcone(m, barra));

  const espacador = document.createElement('div');
  espacador.style.cssText = `flex: 1;`;
  barra.appendChild(espacador);

  const divisor = document.createElement('div');
  divisor.style.cssText = `width:60%;height:1px;background:rgba(255,255,255,0.2);margin:4px 0;flex-shrink:0;`;
  barra.appendChild(divisor);

  RODAPE.forEach(m => criarIcone(m, barra));

  document.body.appendChild(barra);
  criarPaineis();
}

function criarPaineis() {
  [...MODULOS, ...RODAPE].forEach(m => {
    if (document.getElementById(`ft-painel-${m.id}`)) return;

    const largura = larguraDoPainel(m.id);

    const painel = document.createElement('div');
    painel.id = `ft-painel-${m.id}`;
    painel.style.cssText = `
      position: fixed;
      left: -${largura + 20}px;
      top: 0;
      width: ${largura}px;
      height: 100vh;
      background: #fff;
      z-index: 99998;
      box-shadow: 4px 0 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      font-family: Inter, system-ui, sans-serif;
      transition: left 0.25s ease;
    `;

    const rotuloIcone = m.tipo === 'atendente' ? '🎧' : (m.icone || '');

    painel.innerHTML = `
      <div style="background:#0B1F4D;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <span style="font-size:14px;font-weight:700;">${rotuloIcone} ${m.label}</span>
        <button class="ft-fechar" style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:18px;line-height:1;">✕</button>
      </div>
      <div class="ft-corpo" style="flex:1;overflow-y:auto;position:relative;"></div>
    `;

    document.body.appendChild(painel);
    painel.querySelector('.ft-fechar').addEventListener('click', () => fecharPainelAtivo());

    if (m.id === 'mensagens') {
      montarMensagens(painel.querySelector('.ft-corpo'));
    } else if (m.id === 'kanban') {
      // montado sob demanda em abrirModulo (precisa recarregar sempre)
    } else if (m.id === 'idioma') {
      montarIdioma(painel.querySelector('.ft-corpo'));
    } else if (moduloBloqueado(m.id)) {
      montarBloqueado(painel.querySelector('.ft-corpo'), m.label);
    } else {
      montarEmBreve(painel.querySelector('.ft-corpo'), m.label);
    }
  });
}

function montarEmBreve(container, label) {
  container.innerHTML = `
    <div style="padding:40px 20px;text-align:center;color:#64748B;">
      <div style="font-size:32px;margin-bottom:12px;">🚧</div>
      <div style="font-size:14px;font-weight:600;color:#1E293B;margin-bottom:4px;">${label}</div>
      <div style="font-size:12px;">Módulo em desenvolvimento. Em breve disponível.</div>
    </div>
  `;
}

function montarBloqueado(container, label) {
  container.innerHTML = `
    <div style="padding:40px 20px;text-align:center;color:#64748B;">
      <div style="font-size:32px;margin-bottom:12px;">🔒</div>
      <div style="font-size:14px;font-weight:600;color:#1E293B;margin-bottom:4px;">${label}</div>
      <div style="font-size:12px;">Este módulo não está disponível no seu plano.<br>Fale com o administrador para liberar o acesso.</div>
    </div>
  `;
}

function montarIdioma(container) {
  container.innerHTML = `
    <div style="padding:24px 20px;text-align:center;">
      <div style="width:48px;height:32px;margin:0 auto 12px;border-radius:6px;background:linear-gradient(135deg, #009C3B 0%, #009C3B 33%, #FFDF00 33%, #FFDF00 66%, #002776 66%);"></div>
      <div style="font-size:14px;font-weight:600;color:#1E293B;">Português (Brasil)</div>
      <div style="font-size:12px;color:#64748B;margin-top:4px;">Único idioma disponível no momento.</div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// MENSAGENS RÁPIDAS — LISTA + CRIAÇÃO/EDIÇÃO
// ═══════════════════════════════════════════════════════

function montarMensagens(container) {
  mensagensContainerEl = container;
  viewMensagens = 'lista';
  form = null;
  renderViewMensagens();
}

function renderViewMensagens() {
  if (!mensagensContainerEl) return;
  if (viewMensagens === 'form' && form) {
    renderFormMensagens(mensagensContainerEl);
  } else {
    renderListaMensagens(mensagensContainerEl);
  }
}

function renderListaMensagens(container) {
  container.innerHTML = `
    <div style="padding:10px 12px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="ft-busca" placeholder="🔍 Pesquisar mensagens..." style="flex:1;padding:7px 12px;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;background:#fff;color:#1E293B;outline:none;box-sizing:border-box;" />
      </div>
      <button id="ft-nova-seq" style="width:100%;padding:10px;border-radius:8px;border:none;background:#0B1F4D;color:#fff;cursor:pointer;font-size:13px;font-weight:700;">+ Nova sequência</button>
      <button id="ft-atualizar" style="width:100%;padding:11px;border-radius:8px;border:1.5px solid #0B1F4D;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-size:16px;font-weight:600;color:#0B1F4D;">
        <span id="ft-atualizar-icone" style="display:inline-block;font-size:18px;">🔄</span> Atualizar mensagens
      </button>
      <div id="ft-status-atualizacao" style="font-size:10px;color:#94A3B8;text-align:center;"></div>
    </div>
    <div id="ft-lista" style="flex:1;overflow-y:auto;"></div>
  `;
  container.querySelector('#ft-busca').addEventListener('input', (e) => renderMensagens(e.target.value));
  container.querySelector('#ft-nova-seq').addEventListener('click', () => iniciarNovaSequenciaExt());
  container.querySelector('#ft-atualizar').addEventListener('click', async (e) => {
    if (atualizandoLista) return;
    atualizandoLista = true;
    const iconeEl = container.querySelector('#ft-atualizar-icone');
    const statusEl = container.querySelector('#ft-status-atualizacao');
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.style.opacity = '0.6';
    iconeEl.style.transition = 'transform 0.6s ease';
    iconeEl.style.transform = 'rotate(360deg)';
    await carregarSequencias();
    const busca = container.querySelector('#ft-busca').value;
    renderMensagens(busca);
    const agora = new Date();
    const hh = agora.getHours().toString().padStart(2, '0');
    const mm = agora.getMinutes().toString().padStart(2, '0');
    statusEl.textContent = `Atualizado às ${hh}:${mm}`;
    setTimeout(() => {
      iconeEl.style.transform = 'rotate(0deg)';
      btn.disabled = false;
      btn.style.opacity = '1';
      atualizandoLista = false;
    }, 600);
  });
  renderMensagens('');
}

function iniciarNovaSequenciaExt() {
  form = {
    modo: 'nova',
    seqId: gerarId(),
    nomeSeq: '',
    mensagens: [{ texto: '', tipo_conteudo: 'texto', midia_url: '', ordem: 1 }],
    idsOriginais: [],
    enviandoIdx: null,
    salvando: false,
  };
  viewMensagens = 'form';
  renderViewMensagens();
}

function editarSequenciaExt(seq) {
  form = {
    modo: 'editar',
    seqId: seq.id,
    nomeSeq: seq.nome,
    mensagens: seq.msgs.map((m, i) => ({
      id: m.id,
      texto: m.mensagem || '',
      tipo_conteudo: m.tipo_conteudo || 'texto',
      midia_url: m.midia_url || '',
      ordem: i + 1,
    })),
    idsOriginais: seq.msgs.map(m => m.id),
    enviandoIdx: null,
    salvando: false,
  };
  viewMensagens = 'form';
  renderViewMensagens();
}

async function excluirSequenciaExt(seq) {
  if (!confirm(`Excluir a sequência "${seq.nome}"?`)) return;
  try {
    const ids = seq.msgs.map(m => m.id);
    await fetch(`${SUPABASE_URL}/rest/v1/mensagens_rapidas?id=in.(${ids.join(',')})`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    await carregarSequencias();
    renderMensagens(document.getElementById('ft-busca')?.value || '');
  } catch (e) {
    alert('Erro ao excluir: ' + e.message);
  }
}

async function uploadArquivoExt(idx, file) {
  if (!file) return;
  const tamanhoMB = file.size / (1024 * 1024);
  if (tamanhoMB > 10) { alert(`Arquivo muito grande (${tamanhoMB.toFixed(1)}MB). O limite é 10MB.`); return; }

  form.enviandoIdx = idx;
  renderViewMensagens();

  try {
    const ext = file.name.split('.').pop();
    const caminho = `${gerarId()}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/midias-mensagens/${caminho}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!res.ok) {
      const errText = await res.text();
      alert('Erro ao enviar arquivo: ' + errText);
      return;
    }
    form.mensagens[idx].midia_url = `${SUPABASE_URL}/storage/v1/object/public/midias-mensagens/${caminho}`;
  } catch (e) {
    alert('Erro ao enviar arquivo: ' + e.message);
  } finally {
    form.enviandoIdx = null;
    renderViewMensagens();
  }
}

async function salvarSequenciaExt() {
  const f = form;
  if (!f.nomeSeq.trim()) { alert('Informe o nome da sequência.'); return; }
  const incompleta = f.mensagens.some(m => m.tipo_conteudo === 'texto' ? !m.texto.trim() : !m.midia_url);
  if (incompleta) { alert('Preencha ou anexe todas as mensagens.'); return; }

  f.salvando = true;
  renderViewMensagens();

  try {
    if (f.modo === 'editar' && f.idsOriginais.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/mensagens_rapidas?id=in.(${f.idsOriginais.join(',')})`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
    }

    const inserts = f.mensagens.map((m, i) => ({
      user_id: userId,
      titulo: `${f.nomeSeq} — Msg ${i + 1}`,
      mensagem: m.texto,
      tipo_conteudo: m.tipo_conteudo,
      midia_url: m.midia_url || null,
      categoria: 'Sequência',
      nome_sequencia: f.nomeSeq,
      sequencia_id: f.seqId,
      sequencia_ordem: i + 1,
    }));

    await fetch(`${SUPABASE_URL}/rest/v1/mensagens_rapidas`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(inserts),
    });

    await carregarSequencias();
    viewMensagens = 'lista';
    form = null;
    renderViewMensagens();
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
    f.salvando = false;
    renderViewMensagens();
  }
}

function renderFormMensagens(container) {
  const f = form;
  const NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:14px 16px;overflow-y:auto;height:100%;box-sizing:border-box;';

  const voltarBtn = document.createElement('button');
  voltarBtn.textContent = '← Voltar';
  voltarBtn.style.cssText = 'background:none;border:none;color:#64748B;cursor:pointer;font-size:12px;margin-bottom:10px;padding:0;';
  voltarBtn.addEventListener('click', () => { viewMensagens = 'lista'; form = null; renderViewMensagens(); });
  wrap.appendChild(voltarBtn);

  const titulo = document.createElement('div');
  titulo.style.cssText = 'font-size:15px;font-weight:700;color:#0B1F4D;margin-bottom:12px;';
  titulo.textContent = f.modo === 'nova' ? '+ Nova sequência' : '✎ Editar sequência';
  wrap.appendChild(titulo);

  const labelNome = document.createElement('label');
  labelNome.textContent = 'Nome da sequência';
  labelNome.style.cssText = 'font-size:11px;font-weight:600;color:#0B1F4D;display:block;margin-bottom:4px;';
  wrap.appendChild(labelNome);

  const inputNome = document.createElement('input');
  inputNome.value = f.nomeSeq;
  inputNome.placeholder = 'Ex: Abordagem Inicial PGFN';
  inputNome.style.cssText = 'width:100%;padding:8px 10px;border-radius:6px;border:1px solid #C8D0DC;font-size:13px;margin-bottom:16px;box-sizing:border-box;';
  inputNome.addEventListener('input', (e) => { f.nomeSeq = e.target.value; });
  wrap.appendChild(inputNome);

  const labelMsgs = document.createElement('div');
  labelMsgs.textContent = 'Mensagens (em ordem de envio)';
  labelMsgs.style.cssText = 'font-size:12px;font-weight:700;color:#0B1F4D;margin-bottom:10px;';
  wrap.appendChild(labelMsgs);

  f.mensagens.forEach((m, i) => {
    const bloco = document.createElement('div');
    bloco.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;align-items:flex-start;border-bottom:1px solid #F1F5F9;padding-bottom:12px;';

    const numero = document.createElement('div');
    numero.style.cssText = 'font-size:16px;flex-shrink:0;margin-top:6px;';
    numero.textContent = NUMS[i] || `${i + 1}.`;
    bloco.appendChild(numero);

    const corpo = document.createElement('div');
    corpo.style.cssText = 'flex:1;min-width:0;';

    const tiposDiv = document.createElement('div');
    tiposDiv.style.cssText = 'display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap;';
    [['texto', '📝 Texto'], ['foto', '📷 Foto'], ['video', '🎬 Vídeo']].forEach(([tipo, label]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      const ativo = m.tipo_conteudo === tipo;
      btn.style.cssText = `padding:5px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:${ativo ? '1.5px solid #0B1F4D' : '1px solid #C8D0DC'};background:${ativo ? '#0B1F4D' : '#fff'};color:${ativo ? '#fff' : '#64748B'};`;
      btn.addEventListener('click', () => {
        m.tipo_conteudo = tipo; m.texto = ''; m.midia_url = '';
        renderViewMensagens();
      });
      tiposDiv.appendChild(btn);
    });
    corpo.appendChild(tiposDiv);

    if (m.tipo_conteudo === 'texto') {
      const textarea = document.createElement('textarea');
      textarea.value = m.texto;
      textarea.rows = 2;
      textarea.placeholder = `Mensagem ${i + 1}...`;
      textarea.style.cssText = 'width:100%;padding:8px 10px;border-radius:6px;border:1px solid #C8D0DC;font-size:12px;resize:vertical;box-sizing:border-box;';
      textarea.addEventListener('input', (e) => { m.texto = e.target.value; });
      corpo.appendChild(textarea);
    } else if (m.tipo_conteudo === 'audio') {
      const info = document.createElement('div');
      info.textContent = '🎤 Mensagem de áudio — edite o arquivo pelo site fiscaltrib.com.br';
      info.style.cssText = 'font-size:11px;color:#64748B;margin-bottom:6px;';
      corpo.appendChild(info);
      if (m.midia_url) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = m.midia_url;
        audio.style.cssText = 'width:100%;height:32px;';
        corpo.appendChild(audio);
      }
    } else {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = m.tipo_conteudo === 'foto' ? 'image/*' : 'video/*';
      fileInput.style.cssText = 'font-size:11px;margin-bottom:6px;display:block;';
      fileInput.disabled = f.enviandoIdx === i;
      fileInput.addEventListener('change', (e) => uploadArquivoExt(i, e.target.files[0]));
      corpo.appendChild(fileInput);

      const linkLabel = document.createElement('div');
      linkLabel.textContent = 'ou cole um link já hospedado:';
      linkLabel.style.cssText = 'font-size:10px;color:#64748B;margin-bottom:4px;';
      corpo.appendChild(linkLabel);

      const linkInput = document.createElement('input');
      linkInput.value = m.midia_url && !m.midia_url.includes('midias-mensagens') ? m.midia_url : '';
      linkInput.placeholder = 'https://...';
      linkInput.style.cssText = 'width:100%;padding:8px 10px;border-radius:6px;border:1px solid #C8D0DC;font-size:12px;box-sizing:border-box;margin-bottom:6px;';
      linkInput.addEventListener('input', (e) => { m.midia_url = e.target.value; });
      corpo.appendChild(linkInput);

      if (f.enviandoIdx === i) {
        const status = document.createElement('div');
        status.textContent = 'Enviando arquivo...';
        status.style.cssText = 'font-size:11px;color:#0B1F4D;';
        corpo.appendChild(status);
      } else if (m.midia_url) {
        const ok = document.createElement('div');
        ok.textContent = '✓ Arquivo anexado';
        ok.style.cssText = 'font-size:11px;color:#16A34A;margin-bottom:4px;';
        corpo.appendChild(ok);
        if (m.tipo_conteudo === 'foto') {
          const img = document.createElement('img');
          img.src = m.midia_url;
          img.style.cssText = 'max-width:100%;max-height:140px;border-radius:8px;display:block;';
          corpo.appendChild(img);
        } else {
          const vid = document.createElement('video');
          vid.src = m.midia_url;
          vid.controls = true;
          vid.style.cssText = 'max-width:100%;max-height:140px;border-radius:8px;display:block;';
          corpo.appendChild(vid);
        }
      }
    }

    const controles = document.createElement('div');
    controles.style.cssText = 'display:flex;gap:4px;margin-top:8px;';

    const btnUp = document.createElement('button');
    btnUp.textContent = '↑';
    btnUp.disabled = i === 0;
    btnUp.style.cssText = `padding:3px 7px;border-radius:4px;border:1px solid #C8D0DC;background:#fff;font-size:10px;cursor:${i === 0 ? 'default' : 'pointer'};opacity:${i === 0 ? 0.4 : 1};`;
    btnUp.addEventListener('click', () => {
      if (i === 0) return;
      [f.mensagens[i - 1], f.mensagens[i]] = [f.mensagens[i], f.mensagens[i - 1]];
      f.mensagens.forEach((mm, idx) => mm.ordem = idx + 1);
      renderViewMensagens();
    });

    const btnDown = document.createElement('button');
    btnDown.textContent = '↓';
    btnDown.disabled = i === f.mensagens.length - 1;
    btnDown.style.cssText = `padding:3px 7px;border-radius:4px;border:1px solid #C8D0DC;background:#fff;font-size:10px;cursor:${i === f.mensagens.length - 1 ? 'default' : 'pointer'};opacity:${i === f.mensagens.length - 1 ? 0.4 : 1};`;
    btnDown.addEventListener('click', () => {
      if (i === f.mensagens.length - 1) return;
      [f.mensagens[i], f.mensagens[i + 1]] = [f.mensagens[i + 1], f.mensagens[i]];
      f.mensagens.forEach((mm, idx) => mm.ordem = idx + 1);
      renderViewMensagens();
    });

    const btnDel = document.createElement('button');
    btnDel.textContent = '✕';
    btnDel.disabled = f.mensagens.length === 1;
    btnDel.style.cssText = `padding:3px 7px;border-radius:4px;border:1px solid #FECACA;background:#FEF2F2;color:#DC2626;font-size:10px;cursor:${f.mensagens.length === 1 ? 'default' : 'pointer'};opacity:${f.mensagens.length === 1 ? 0.4 : 1};`;
    btnDel.addEventListener('click', () => {
      if (f.mensagens.length === 1) return;
      f.mensagens.splice(i, 1);
      f.mensagens.forEach((mm, idx) => mm.ordem = idx + 1);
      renderViewMensagens();
    });

    controles.appendChild(btnUp);
    controles.appendChild(btnDown);
    controles.appendChild(btnDel);
    corpo.appendChild(controles);

    bloco.appendChild(corpo);
    wrap.appendChild(bloco);
  });

  const btnAdd = document.createElement('button');
  btnAdd.textContent = '+ Adicionar mensagem';
  btnAdd.style.cssText = 'padding:6px 14px;border-radius:8px;border:1.5px solid #0B1F4D;background:#fff;color:#0B1F4D;font-weight:600;font-size:11px;cursor:pointer;margin-bottom:16px;';
  btnAdd.addEventListener('click', () => {
    f.mensagens.push({ texto: '', tipo_conteudo: 'texto', midia_url: '', ordem: f.mensagens.length + 1 });
    renderViewMensagens();
  });
  wrap.appendChild(btnAdd);

  const botoes = document.createElement('div');
  botoes.style.cssText = 'display:flex;gap:8px;';

  const btnSalvar = document.createElement('button');
  btnSalvar.textContent = f.salvando ? 'Salvando...' : 'Salvar sequência';
  btnSalvar.disabled = !!f.salvando;
  btnSalvar.style.cssText = `padding:9px 18px;border-radius:8px;background:#0B1F4D;color:#fff;border:none;font-weight:700;font-size:12px;cursor:pointer;opacity:${f.salvando ? 0.6 : 1};`;
  btnSalvar.addEventListener('click', salvarSequenciaExt);

  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.cssText = 'padding:9px 18px;border-radius:8px;background:#fff;color:#0B1F4D;border:1.5px solid #0B1F4D;font-weight:700;font-size:12px;cursor:pointer;';
  btnCancelar.addEventListener('click', () => { viewMensagens = 'lista'; form = null; renderViewMensagens(); });

  botoes.appendChild(btnSalvar);
  botoes.appendChild(btnCancelar);
  wrap.appendChild(botoes);

  container.innerHTML = '';
  container.appendChild(wrap);
}

// ═══════════════════════════════════════════════════════
// KANBAN (CRM) — QUADRO + EDIÇÃO RÁPIDA + MENSAGENS
// ═══════════════════════════════════════════════════════

async function abrirKanban() {
  const painel = document.getElementById('ft-painel-kanban');
  if (!painel) return;
  kanbanContainerEl = painel.querySelector('.ft-corpo');
  kanbanEditando = null;
  kanbanContainerEl.innerHTML = '<div style="padding:40px;text-align:center;color:#64748B;">⏳ Carregando quadro...</div>';
  await Promise.all([carregarKanbanColunas(), carregarKanbanRegistros()]);
  renderKanban();
}

async function carregarKanbanColunas() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/kanban_colunas?usuario_id=eq.${userId}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const linha = (data && data[0]) || {};
    kanbanColunas = KANBAN_COLS_META.map(meta => ({
      ...meta,
      label: linha[meta.key] || KANBAN_COLS_DEFAULT_LABEL[meta.key],
    }));
  } catch (e) {
    kanbanColunas = KANBAN_COLS_META.map(meta => ({ ...meta, label: KANBAN_COLS_DEFAULT_LABEL[meta.key] }));
  }
}

async function carregarKanbanRegistros() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/prospeccao_clientes?user_id=eq.${userId}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    kanbanRegistros = (data || []).sort((a, b) => {
      if (!a.data_proxima_acao) return 1;
      if (!b.data_proxima_acao) return -1;
      return a.data_proxima_acao < b.data_proxima_acao ? -1 : 1;
    });
  } catch (e) { kanbanRegistros = []; }
}

function getTempKanban(key) { return TEMP_LIST.find(t => t.key === key) || TEMP_LIST[2]; }

function renderKanban() {
  if (!kanbanContainerEl) return;
  if (kanbanEditando) {
    renderKanbanForm(kanbanContainerEl);
  } else {
    renderKanbanBoard(kanbanContainerEl);
  }
}

function renderKanbanBoard(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'padding:10px 14px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;gap:8px;align-items:center;flex-shrink:0;';
  header.innerHTML = `
    <input id="ft-kanban-busca" placeholder="🔍 Buscar por nome, telefone, cidade..." value="${kanbanBusca}" style="flex:1;padding:7px 12px;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;background:#fff;color:#1E293B;outline:none;box-sizing:border-box;" />
    <button id="ft-kanban-atualizar" style="padding:7px 12px;border-radius:6px;border:1.5px solid #0B1F4D;background:#fff;color:#0B1F4D;cursor:pointer;font-size:13px;">🔄</button>
  `;
  container.appendChild(header);
  header.querySelector('#ft-kanban-busca').addEventListener('input', (e) => { kanbanBusca = e.target.value; renderKanbanBoardColunas(colunasWrap); });
  header.querySelector('#ft-kanban-atualizar').addEventListener('click', async () => {
    await carregarKanbanRegistros();
    renderKanbanBoardColunas(colunasWrap);
  });

  const colunasWrap = document.createElement('div');
  colunasWrap.style.cssText = 'flex:1;display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;padding:14px;box-sizing:border-box;';
  container.appendChild(colunasWrap);

  renderKanbanBoardColunas(colunasWrap);
}

function registrosFiltradosKanban() {
  const termo = kanbanBusca.toLowerCase();
  return kanbanRegistros.filter(r => {
    if (!termo) return true;
    return (r.razao_social || '').toLowerCase().includes(termo) ||
      (r.telefone || '').includes(termo) ||
      (r.whatsapp || '').includes(termo) ||
      (r.endereco_municipio || '').toLowerCase().includes(termo);
  });
}

function renderKanbanBoardColunas(colunasWrap) {
  colunasWrap.innerHTML = '';
  const filtrados = registrosFiltradosKanban();
  const hojeStr = new Date().toISOString().split('T')[0];

  kanbanColunas.forEach(col => {
    const cards = filtrados.filter(r => r.status_lead === col.label);

    const colDiv = document.createElement('div');
    colDiv.style.cssText = `min-width:200px;max-width:210px;flex-shrink:0;background:#F1F5F9;border-radius:10px;padding:8px;display:flex;flex-direction:column;box-sizing:border-box;`;

    const colHeader = document.createElement('div');
    colHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 2px;';
    colHeader.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#1E293B;">${col.label}</span>
      <span style="background:${col.bg};color:${col.cor};padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;border:1px solid ${col.cor};">${cards.length}</span>
    `;
    colDiv.appendChild(colHeader);

    const cardsWrap = document.createElement('div');
    cardsWrap.style.cssText = 'flex:1;overflow-y:auto;min-height:60px;';

    colDiv.addEventListener('dragover', (e) => { e.preventDefault(); colDiv.style.background = col.bg; });
    colDiv.addEventListener('dragleave', () => { colDiv.style.background = '#F1F5F9'; });
    colDiv.addEventListener('drop', async () => {
      colDiv.style.background = '#F1F5F9';
      if (dragItemKanban && dragItemKanban.status_lead !== col.label) {
        await moverCardKanban(dragItemKanban.id, col.label);
        dragItemKanban = null;
        renderKanbanBoardColunas(colunasWrap);
      }
    });

    if (cards.length === 0) {
      const vazio = document.createElement('div');
      vazio.style.cssText = 'text-align:center;padding:14px 4px;font-size:10px;color:#94A3B8;border:2px dashed #E2E8F0;border-radius:8px;';
      vazio.textContent = 'Arraste um card aqui';
      cardsWrap.appendChild(vazio);
    }

    cards.forEach(r => {
      const temp = getTempKanban(r.temperatura);
      const atrasado = r.data_proxima_acao && r.data_proxima_acao < hojeStr;
      const ehHoje = r.data_proxima_acao === hojeStr;

      const card = document.createElement('div');
      card.draggable = true;
      card.style.cssText = `background:${atrasado ? '#FEF2F2' : '#fff'};border:1px solid ${atrasado ? '#FECACA' : '#E2E8F0'};border-radius:8px;padding:8px 9px;cursor:grab;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.06);`;

      card.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#1E293B;margin-bottom:3px;line-height:1.3;">${r.razao_social || '—'}</div>
        ${r.contato_nome ? `<div style="font-size:10px;color:#64748B;margin-bottom:2px;">👤 ${r.contato_nome}</div>` : ''}
        ${r.endereco_municipio ? `<div style="font-size:10px;color:#64748B;margin-bottom:3px;">📍 ${r.endereco_municipio}/${r.endereco_uf || ''}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="font-size:9px;color:${temp.cor};font-weight:700;">${temp.label}</span>
          ${r.data_proxima_acao ? `<span style="font-size:9px;font-weight:600;color:${atrasado ? '#DC2626' : ehHoje ? '#2563EB' : '#64748B'};">${atrasado ? '⚠️' : ehHoje ? '🔔' : r.data_proxima_acao}</span>` : ''}
        </div>
      `;

      card.addEventListener('dragstart', () => { dragItemKanban = r; });
      card.addEventListener('click', () => {
        kanbanEditando = { ...r };
        renderKanban();
      });
      cardsWrap.appendChild(card);
    });

    colDiv.appendChild(cardsWrap);
    colunasWrap.appendChild(colDiv);
  });
}

async function moverCardKanban(id, novoStatus) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/prospeccao_clientes?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status_lead: novoStatus }),
    });
    kanbanRegistros = kanbanRegistros.map(r => r.id === id ? { ...r, status_lead: novoStatus } : r);
  } catch (e) { alert('Erro ao mover: ' + e.message); }
}

function renderKanbanForm(container) {
  const r = kanbanEditando;
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px 18px;overflow-y:auto;height:100%;box-sizing:border-box;';

  const voltarBtn = document.createElement('button');
  voltarBtn.textContent = '← Voltar ao quadro';
  voltarBtn.style.cssText = 'background:none;border:none;color:#64748B;cursor:pointer;font-size:12px;margin-bottom:10px;padding:0;';
  voltarBtn.addEventListener('click', () => { kanbanEditando = null; renderKanban(); });
  wrap.appendChild(voltarBtn);

  const titulo = document.createElement('div');
  titulo.style.cssText = 'font-size:16px;font-weight:700;color:#1E293B;margin-bottom:2px;';
  titulo.textContent = r.razao_social || 'Sem nome';
  wrap.appendChild(titulo);

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:11px;color:#64748B;margin-bottom:16px;';
  sub.textContent = r.cnpj || '';
  wrap.appendChild(sub);

  function campo(labelTxt, elInput) {
    const box = document.createElement('div');
    box.style.cssText = 'margin-bottom:12px;';
    const lbl = document.createElement('label');
    lbl.textContent = labelTxt;
    lbl.style.cssText = 'font-size:11px;font-weight:600;color:#0B1F4D;display:block;margin-bottom:4px;';
    box.appendChild(lbl);
    box.appendChild(elInput);
    return box;
  }

  function inputTexto(valor, onchange, tipo = 'text') {
    const inp = document.createElement('input');
    inp.type = tipo;
    inp.value = valor || '';
    inp.style.cssText = 'width:100%;padding:8px 10px;border-radius:6px;border:1px solid #C8D0DC;font-size:13px;box-sizing:border-box;';
    inp.addEventListener('input', (e) => onchange(e.target.value));
    return inp;
  }

  function selectOpcoes(valor, opcoes, onchange) {
    const sel = document.createElement('select');
    sel.style.cssText = 'width:100%;padding:8px 10px;border-radius:6px;border:1px solid #C8D0DC;font-size:13px;box-sizing:border-box;';
    opcoes.forEach(([v, l]) => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = l;
      if (v === valor) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', (e) => onchange(e.target.value));
    return sel;
  }

  wrap.appendChild(campo('Status do Lead', selectOpcoes(r.status_lead, kanbanColunas.map(c => [c.label, c.label]), v => r.status_lead = v)));
  wrap.appendChild(campo('Temperatura', selectOpcoes(r.temperatura, TEMP_LIST.map(t => [t.key, t.label]), v => r.temperatura = v)));
  wrap.appendChild(campo('Próxima Ação', selectOpcoes(r.proxima_acao, [['', 'Selecione...'], ...ACOES_LIST.map(a => [a, a])], v => r.proxima_acao = v)));
  wrap.appendChild(campo('Data da Próxima Ação', inputTexto(r.data_proxima_acao, v => r.data_proxima_acao = v, 'date')));
  wrap.appendChild(campo('Hora (opcional)', inputTexto(r.hora_proxima_acao, v => r.hora_proxima_acao = v, 'time')));
  wrap.appendChild(campo('Telefone', inputTexto(r.telefone, v => r.telefone = v)));
  wrap.appendChild(campo('WhatsApp', inputTexto(r.whatsapp, v => r.whatsapp = v)));

  const obsBox = document.createElement('div');
  obsBox.style.cssText = 'margin-bottom:14px;';
  const obsLbl = document.createElement('label');
  obsLbl.textContent = 'Observações';
  obsLbl.style.cssText = 'font-size:11px;font-weight:600;color:#0B1F4D;display:block;margin-bottom:4px;';
  const obsInput = document.createElement('textarea');
  obsInput.value = r.observacoes || '';
  obsInput.rows = 3;
  obsInput.style.cssText = 'width:100%;padding:8px 10px;border-radius:6px;border:1px solid #C8D0DC;font-size:13px;resize:vertical;box-sizing:border-box;';
  obsInput.addEventListener('input', (e) => r.observacoes = e.target.value);
  obsBox.appendChild(obsLbl);
  obsBox.appendChild(obsInput);
  wrap.appendChild(obsBox);

  // Ações de contato
  const acoesLinha = document.createElement('div');
  acoesLinha.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;';

  if (r.telefone) {
    const btnTel = document.createElement('a');
    btnTel.href = `tel:${r.telefone}`;
    btnTel.textContent = '📞 Ligar';
    btnTel.style.cssText = 'padding:6px 12px;border-radius:6px;border:1.5px solid #0B1F4D;color:#0B1F4D;text-decoration:none;font-size:11px;font-weight:600;';
    acoesLinha.appendChild(btnTel);
  }

  const btnMsg = document.createElement('button');
  btnMsg.textContent = '⚡ Mensagens Rápidas';
  btnMsg.style.cssText = 'padding:6px 12px;border-radius:6px;border:none;background:#25D366;color:#fff;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;';
  btnMsg.addEventListener('click', () => abrirOverlayMsgKanban(r.whatsapp));
  acoesLinha.appendChild(btnMsg);

  wrap.appendChild(acoesLinha);

  // Botões salvar/excluir
  const botoes = document.createElement('div');
  botoes.style.cssText = 'display:flex;gap:8px;';

  const btnSalvar = document.createElement('button');
  btnSalvar.textContent = kanbanSalvando ? 'Salvando...' : '💾 Salvar';
  btnSalvar.disabled = kanbanSalvando;
  btnSalvar.style.cssText = `padding:9px 18px;border-radius:8px;background:#0B1F4D;color:#fff;border:none;font-weight:700;font-size:12px;cursor:pointer;opacity:${kanbanSalvando ? 0.6 : 1};`;
  btnSalvar.addEventListener('click', salvarKanbanEdicao);

  const btnExcluir = document.createElement('button');
  btnExcluir.textContent = '🗑️ Excluir';
  btnExcluir.style.cssText = 'padding:9px 16px;border-radius:8px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;font-weight:700;font-size:12px;cursor:pointer;';
  btnExcluir.addEventListener('click', excluirKanbanRegistro);

  botoes.appendChild(btnSalvar);
  botoes.appendChild(btnExcluir);
  wrap.appendChild(botoes);

  container.appendChild(wrap);
}

async function salvarKanbanEdicao() {
  const r = kanbanEditando;
  kanbanSalvando = true;
  renderKanban();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/prospeccao_clientes?id=eq.${r.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status_lead: r.status_lead, temperatura: r.temperatura,
        proxima_acao: r.proxima_acao, data_proxima_acao: r.data_proxima_acao || null,
        hora_proxima_acao: r.hora_proxima_acao || null,
        telefone: r.telefone, whatsapp: r.whatsapp, observacoes: r.observacoes,
      }),
    });
    await carregarKanbanRegistros();
    kanbanSalvando = false;
    kanbanEditando = null;
    renderKanban();
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
    kanbanSalvando = false;
    renderKanban();
  }
}

async function excluirKanbanRegistro() {
  const r = kanbanEditando;
  if (!confirm(`Excluir "${r.razao_social || 'este registro'}"?`)) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/prospeccao_clientes?id=eq.${r.id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    await carregarKanbanRegistros();
    kanbanEditando = null;
    renderKanban();
  } catch (e) {
    alert('Erro ao excluir: ' + e.message);
  }
}

// ── OVERLAY MENSAGENS RÁPIDAS (a partir do card do Kanban) ──
async function abrirOverlayMsgKanban(whatsapp) {
  kanbanMsgWhatsapp = whatsapp || '';
  kanbanMsgBusca = '';
  kanbanMsgOverlayAberto = true;
  await carregarSequencias();
  renderOverlayMsgKanban();
}

function fecharOverlayMsgKanban() {
  kanbanMsgOverlayAberto = false;
  const el = document.getElementById('ft-kanban-msg-overlay');
  if (el) el.remove();
}

function renderOverlayMsgKanban() {
  let overlay = document.getElementById('ft-kanban-msg-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'ft-kanban-msg-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; right: 0; width: 320px; height: 100vh;
    background: #fff; box-shadow: -4px 0 20px rgba(0,0,0,0.2);
    z-index: 100001; display: flex; flex-direction: column;
    font-family: Inter, system-ui, sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'padding:14px 16px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
  header.innerHTML = `<span style="font-size:14px;font-weight:700;color:#1E293B;">Mensagens rápidas</span>`;
  const btnFechar = document.createElement('button');
  btnFechar.textContent = '✕';
  btnFechar.style.cssText = 'background:none;border:none;color:#64748B;cursor:pointer;font-size:18px;line-height:1;';
  btnFechar.addEventListener('click', fecharOverlayMsgKanban);
  header.appendChild(btnFechar);
  overlay.appendChild(header);

  const status = document.createElement('div');
  const temWhats = !!kanbanMsgWhatsapp;
  status.style.cssText = `padding:8px 16px;background:${temWhats ? '#F0FDF4' : '#FEF2F2'};border-bottom:1px solid #E2E8F0;font-size:11px;color:${temWhats ? '#16A34A' : '#DC2626'};font-weight:600;`;
  status.textContent = temWhats ? `📱 Enviando para: ${kanbanMsgWhatsapp}` : '⚠️ Sem WhatsApp cadastrado';
  overlay.appendChild(status);

  const buscaBox = document.createElement('div');
  buscaBox.style.cssText = 'padding:10px 12px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;';
  const buscaInput = document.createElement('input');
  buscaInput.placeholder = 'Pesquisar';
  buscaInput.value = kanbanMsgBusca;
  buscaInput.style.cssText = 'width:100%;padding:7px 12px;border-radius:6px;border:1px solid #E2E8F0;font-size:12px;background:#fff;box-sizing:border-box;color:#1E293B;outline:none;';
  buscaInput.addEventListener('input', (e) => { kanbanMsgBusca = e.target.value; renderListaOverlayMsg(listaDiv); });
  buscaBox.appendChild(buscaInput);
  overlay.appendChild(buscaBox);

  const listaDiv = document.createElement('div');
  listaDiv.style.cssText = 'flex:1;overflow-y:auto;';
  overlay.appendChild(listaDiv);

  document.body.appendChild(overlay);
  renderListaOverlayMsg(listaDiv);
}

function renderListaOverlayMsg(listaDiv) {
  listaDiv.innerHTML = '';
  const termo = kanbanMsgBusca.toLowerCase();
  const todas = sequencias.flatMap(s => s.msgs.map(m => ({ ...m, nomeSeq: s.nome })))
    .filter(m => !termo || (m.mensagem || '').toLowerCase().includes(termo) || m.nomeSeq.toLowerCase().includes(termo));

  if (todas.length === 0) {
    listaDiv.innerHTML = '<div style="padding:24px;text-align:center;color:#64748B;font-size:12px;">Nenhuma mensagem encontrada.<br>Crie sequências no módulo "Mensagens rápidas".</div>';
    return;
  }

  todas.forEach(m => {
    const tipo = m.tipo_conteudo || 'texto';
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid #F1F5F9;gap:10px;';

    const icone = tipo === 'foto' ? '📷' : tipo === 'video' ? '🎬' : tipo === 'audio' ? '🎤' : '📝';
    const desc = tipo === 'texto' ? (m.mensagem || '') : `Arquivo de ${tipo} (abra no app para enviar)`;

    item.innerHTML = `
      <div style="width:34px;height:34px;border-radius:6px;border:2px solid #00A884;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">${icone}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:600;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nomeSeq} — ${m.sequencia_ordem}</div>
        <div style="font-size:10px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${desc}</div>
      </div>
    `;

    const btnEnviar = document.createElement('button');
    btnEnviar.style.cssText = 'background:none;border:none;cursor:pointer;color:#00A884;padding:4px;flex-shrink:0;';
    btnEnviar.title = 'Enviar no WhatsApp';
    btnEnviar.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    btnEnviar.disabled = tipo !== 'texto' || !kanbanMsgWhatsapp;
    if (btnEnviar.disabled) btnEnviar.style.opacity = '0.3';
    btnEnviar.addEventListener('click', () => {
      const num = kanbanMsgWhatsapp.replace(/\D/g, '');
      if (!num) { alert('Este prospect não tem WhatsApp cadastrado.'); return; }
      window.open(`https://wa.me/55${num}?text=${encodeURIComponent(m.mensagem || '')}`, '_blank');
    });
    item.appendChild(btnEnviar);

    listaDiv.appendChild(item);
  });
}

function abrirModulo(id) {
  if (painelAtivo === id) { fecharPainelAtivo(); return; }
  if (painelAtivo) fecharPainelAtivo();

  const painel = document.getElementById(`ft-painel-${id}`);
  if (!painel) return;
  painel.style.left = `${LARGURA_BARRA}px`;
  painelAtivo = id;

  if (id === 'mensagens') {
    viewMensagens = 'lista';
    form = null;
    carregarSequencias().then(() => renderViewMensagens());
  } else if (id === 'kanban') {
    if (moduloBloqueado('kanban')) {
      montarBloqueado(painel.querySelector('.ft-corpo'), 'Modo CRM (Kanban)');
    } else {
      abrirKanban();
    }
  }

  document.querySelectorAll('.ft-icone').forEach(b => {
    if (b.dataset.modulo === id) {
      b.style.outline = '2px solid rgba(255,255,255,0.6)';
    } else {
      b.style.outline = 'none';
    }
  });
}

function fecharPainelAtivo() {
  if (!painelAtivo) return;
  const painel = document.getElementById(`ft-painel-${painelAtivo}`);
  const largura = larguraDoPainel(painelAtivo);
  if (painel) painel.style.left = `-${largura + 20}px`;
  document.querySelectorAll('.ft-icone').forEach(b => b.style.outline = 'none');
  painelAtivo = null;
  fecharOverlayMsgKanban();
}

async function carregarSequencias() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mensagens_rapidas?select=*&order=sequencia_id,sequencia_ordem`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const grupos = {};
    (data || []).forEach(m => {
      const sid = m.sequencia_id || m.id;
      if (!grupos[sid]) grupos[sid] = { id: sid, nome: m.nome_sequencia || m.titulo, msgs: [] };
      grupos[sid].msgs.push(m);
    });
    sequencias = Object.values(grupos);
  } catch(e) {}
}

function iconeTipoMsg(tipo) {
  if (tipo === 'audio') return '🎤';
  if (tipo === 'foto') return '📷';
  if (tipo === 'video') return '🎬';
  return '📝';
}

function renderMensagens(busca) {
  const lista = document.getElementById('ft-lista');
  if (!lista) return;
  lista.innerHTML = '';

  const gruposFiltrados = sequencias.map(s => ({
    ...s,
    msgsFiltradas: s.msgs.filter(m => {
      if (!busca) return true;
      const alvo = (m.mensagem || '') + ' ' + s.nome;
      return alvo.toLowerCase().includes(busca.toLowerCase());
    })
  })).filter(s => s.msgsFiltradas.length > 0);

  if (gruposFiltrados.length === 0) {
    lista.innerHTML = '<div style="padding:20px;text-align:center;color:#64748B;font-size:12px;">Nenhuma mensagem encontrada</div>';
    return;
  }

  gruposFiltrados.forEach(s => {
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 16px 4px;gap:8px;';
    header.innerHTML = `
      <span style="font-size:10px;font-weight:700;color:#64748B;letter-spacing:1px;text-transform:uppercase;">${s.nome}</span>
      <span style="display:flex;gap:4px;">
        <button class="ft-editar-seq" style="background:none;border:none;cursor:pointer;font-size:13px;color:#0B1F4D;" title="Editar sequência">✎</button>
        <button class="ft-excluir-seq" style="background:none;border:none;cursor:pointer;font-size:13px;color:#DC2626;" title="Excluir sequência">🗑</button>
      </span>
    `;
    header.querySelector('.ft-editar-seq').addEventListener('click', () => editarSequenciaExt(s));
    header.querySelector('.ft-excluir-seq').addEventListener('click', () => excluirSequenciaExt(s));
    lista.appendChild(header);

    s.msgsFiltradas.forEach((m) => {
      const tipo = m.tipo_conteudo || 'texto';
      const descricao = tipo === 'texto' ? (m.mensagem || '') : `Arquivo de ${tipo}`;

      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid #F1F5F9;gap:10px;cursor:pointer;';
      item.addEventListener('mouseover', () => item.style.background = '#F8FAFC');
      item.addEventListener('mouseout', () => item.style.background = 'transparent');

      const avatar = document.createElement('div');
      avatar.style.cssText = 'width:36px;height:36px;border:2px solid #00A884;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;';
      avatar.textContent = iconeTipoMsg(tipo);

      const meio = document.createElement('div');
      meio.style.cssText = 'flex:1;min-width:0;';
      meio.innerHTML = `
        <div style="font-size:12px;font-weight:600;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nome} — ${m.sequencia_ordem}</div>
        <div style="font-size:11px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${descricao}</div>
      `;

      const btnEnviar = document.createElement('button');
      btnEnviar.style.cssText = 'background:none;border:none;cursor:pointer;color:#00A884;padding:4px;flex-shrink:0;';
      btnEnviar.title = 'Enviar no WhatsApp';
      btnEnviar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
      btnEnviar.addEventListener('click', (e) => {
        e.stopPropagation();
        enviarMensagem(m, btnEnviar);
      });

      item.appendChild(avatar);
      item.appendChild(meio);
      item.appendChild(btnEnviar);
      lista.appendChild(item);
    });
  });
}

function encontrarCampoDigitacao() {
  const seletores = [
    'div[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"][data-tab="1"]',
    'footer div[contenteditable="true"]',
    'div[contenteditable="true"][title="Digite uma mensagem"]',
    'div[contenteditable="true"][aria-label="Digite uma mensagem"]',
  ];
  for (const sel of seletores) {
    const campo = document.querySelector(sel);
    if (campo) return campo;
  }
  return null;
}

function encontrarAreaDrop() {
  const seletores = [
    '#main',
    'div[data-testid="conversation-panel-wrapper"]',
    'div[data-testid="conversation-panel-messages"]',
  ];
  for (const sel of seletores) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function clicarBotaoEnviar() {
  const btnSels = ['button[data-testid="send"]','button[aria-label="Enviar"]','span[data-testid="send"]'];
  for (const sel of btnSels) {
    const btn = document.querySelector(sel);
    if (btn) { btn.click(); return true; }
  }
  return false;
}

function dispararEventoDrop(alvo, dataTransfer, tipoEvento) {
  const evento = new DragEvent(tipoEvento, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(evento, 'dataTransfer', { value: dataTransfer });
  alvo.dispatchEvent(evento);
}

async function enviarMensagem(m, btnEl) {
  if (enviandoAgora) return;
  const tipo = m.tipo_conteudo || 'texto';

  if (tipo === 'texto') {
    enviarTexto(m.mensagem || '');
    return;
  }

  if (!m.midia_url) { alert('Esta mensagem não tem arquivo anexado.'); return; }

  const areaDrop = encontrarAreaDrop();
  if (!areaDrop) { alert('Abra uma conversa primeiro!'); return; }

  enviandoAgora = true;
  const textoOriginalBtn = btnEl ? btnEl.innerHTML : null;
  if (btnEl) btnEl.innerHTML = '⏳';

  try {
    const res = await fetch(m.midia_url);
    if (!res.ok) throw new Error('Falha ao baixar arquivo: status ' + res.status);
    const blob = await res.blob();

    let mime = blob.type;
    let ext = 'bin';
    if (mime) {
      if (mime.includes('mpeg') || mime.includes('mp3')) ext = 'mp3';
      else if (mime.includes('webm')) ext = 'webm';
      else if (mime.includes('wav')) ext = 'wav';
      else if (mime.includes('ogg')) ext = 'ogg';
      else if (mime.includes('mp4')) ext = 'mp4';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('png')) ext = 'png';
    }
    const file = new File([blob], `arquivo-${Date.now()}.${ext}`, { type: mime });

    const dt = new DataTransfer();
    dt.items.add(file);
    dispararEventoDrop(areaDrop, dt, 'dragenter');
    dispararEventoDrop(areaDrop, dt, 'dragover');
    dispararEventoDrop(areaDrop, dt, 'drop');

    setTimeout(() => {
      const clicou = clicarBotaoEnviar();
      if (!clicou) {
        const campo = encontrarCampoDigitacao();
        if (campo) campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      }
      enviandoAgora = false;
      if (btnEl && textoOriginalBtn) btnEl.innerHTML = textoOriginalBtn;
    }, 1200);

  } catch (e) {
    console.error('[FiscalTrib] Erro ao enviar mídia:', e);
    alert('Erro ao enviar arquivo. Tente novamente.');
    enviandoAgora = false;
    if (btnEl && textoOriginalBtn) btnEl.innerHTML = textoOriginalBtn;
  }
}

function enviarTexto(texto) {
  const campo = encontrarCampoDigitacao();
  if (!campo) { alert('Abra uma conversa primeiro!'); return; }
  campo.focus();
  document.execCommand('insertText', false, texto);
  setTimeout(() => {
    const clicou = clicarBotaoEnviar();
    if (!clicou) {
      campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
  }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 2000);
}