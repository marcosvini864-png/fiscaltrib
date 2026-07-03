const SUPABASE_URL = 'https://ikodyhxukvclgzydvztu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2R5aHh1a3ZjbGd6eWR2enR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTU1OTEsImV4cCI6MjA5Njg3MTU5MX0.X_02n8Hy0LaFoZQmLdGwjIA_LixYkMlxeVaMay4rRfg';

let token = null;
let sequencias = [];
let painelAtivo = null;
let enviandoAgora = false;
let atualizandoLista = false;

const MODULOS = [
  { id: 'dashboard',   icone: '📊', label: 'Dashboard',              pronto: false },
  { id: 'kanban',      icone: '🗂️', label: 'Modo CRM (Kanban)',      pronto: false },
  { id: 'mensagens',   icone: '💬', label: 'Mensagens rápidas',      pronto: true  },
  { id: 'chatbot',     icone: '🤖', label: 'Chat Bot',                pronto: false },
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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'toggle_panel') abrirModulo('mensagens');
});

async function init() {
  const data = await chrome.storage.local.get(['ft_token']);
  if (!data.ft_token) return;
  token = data.ft_token;
  await carregarSequencias();
  injetarBarraLateral();
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
  return '';
}

function criarIcone(m, barra) {
  const btn = document.createElement('div');
  btn.className = 'ft-icone';
  btn.dataset.modulo = m.id;
  btn.title = m.label;
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
  } else if (m.tipo === 'ajuda' || m.tipo === 'conta') {
    btn.innerHTML = svgIconeBranco(m.tipo);
    btn.style.opacity = '0.7';
  } else if (m.tipo === 'idioma') {
    btn.innerHTML = `
      <div style="width:32px;height:22px;border-radius:4px;background:linear-gradient(135deg, #009C3B 0%, #009C3B 33%, #FFDF00 33%, #FFDF00 66%, #002776 66%);"></div>
    `;
  } else {
    btn.textContent = m.icone;
    btn.style.fontSize = '24px';
    btn.style.opacity = m.pronto ? '1' : '0.55';
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

    const painel = document.createElement('div');
    painel.id = `ft-painel-${m.id}`;
    painel.style.cssText = `
      position: fixed;
      left: -400px;
      top: 0;
      width: 380px;
      height: 100vh;
      background: #fff;
      z-index: 99998;
      box-shadow: 4px 0 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      font-family: Inter, system-ui, sans-serif;
      transition: left 0.25s ease;
    `;

    painel.innerHTML = `
      <div style="background:#0B1F4D;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <span style="font-size:14px;font-weight:700;">${m.icone || ''} ${m.label}</span>
        <button class="ft-fechar" style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:18px;line-height:1;">✕</button>
      </div>
      <div class="ft-corpo" style="flex:1;overflow-y:auto;"></div>
    `;

    document.body.appendChild(painel);
    painel.querySelector('.ft-fechar').addEventListener('click', () => fecharPainelAtivo());

    if (m.id === 'mensagens') {
      montarMensagens(painel.querySelector('.ft-corpo'));
    } else if (m.id === 'idioma') {
      montarIdioma(painel.querySelector('.ft-corpo'));
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

function montarIdioma(container) {
  container.innerHTML = `
    <div style="padding:24px 20px;text-align:center;">
      <div style="width:48px;height:32px;margin:0 auto 12px;border-radius:6px;background:linear-gradient(135deg, #009C3B 0%, #009C3B 33%, #FFDF00 33%, #FFDF00 66%, #002776 66%);"></div>
      <div style="font-size:14px;font-weight:600;color:#1E293B;">Português (Brasil)</div>
      <div style="font-size:12px;color:#64748B;margin-top:4px;">Único idioma disponível no momento.</div>
    </div>
  `;
}

function montarMensagens(container) {
  container.innerHTML = `
    <div style="padding:10px 12px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="ft-busca" placeholder="🔍 Pesquisar mensagens..." style="flex:1;padding:7px 12px;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;background:#fff;color:#1E293B;outline:none;box-sizing:border-box;" />
      </div>
      <button id="ft-atualizar" style="width:100%;padding:8px;border-radius:6px;border:1px solid #0B1F4D;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:600;color:#0B1F4D;">
        <span id="ft-atualizar-icone" style="display:inline-block;">🔄</span> Atualizar mensagens
      </button>
      <div id="ft-status-atualizacao" style="font-size:10px;color:#94A3B8;text-align:center;"></div>
    </div>
    <div id="ft-lista" style="flex:1;overflow-y:auto;"></div>
  `;
  container.querySelector('#ft-busca').addEventListener('input', (e) => renderMensagens(e.target.value));
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

function abrirModulo(id) {
  if (painelAtivo === id) { fecharPainelAtivo(); return; }
  if (painelAtivo) fecharPainelAtivo();

  const painel = document.getElementById(`ft-painel-${id}`);
  if (!painel) return;
  painel.style.left = `${LARGURA_BARRA}px`;
  painelAtivo = id;

  if (id === 'mensagens') carregarSequencias().then(() => renderMensagens(''));

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
  if (painel) painel.style.left = '-400px';
  document.querySelectorAll('.ft-icone').forEach(b => b.style.outline = 'none');
  painelAtivo = null;
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
      if (!grupos[sid]) grupos[sid] = { nome: m.nome_sequencia || m.titulo, msgs: [] };
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

  const msgs = sequencias.flatMap(s =>
    s.msgs.map(m => ({ ...m, nomeSeq: s.nome }))
  ).filter(m => {
    if (!busca) return true;
    const alvo = (m.mensagem || '') + ' ' + m.nomeSeq;
    return alvo.toLowerCase().includes(busca.toLowerCase());
  });

  if (msgs.length === 0) {
    lista.innerHTML = '<div style="padding:20px;text-align:center;color:#64748B;font-size:12px;">Nenhuma mensagem encontrada</div>';
    return;
  }

  lista.innerHTML = '';
  let seqAtual = '';

  msgs.forEach((m) => {
    if (m.nomeSeq !== seqAtual) {
      seqAtual = m.nomeSeq;
      const titulo = document.createElement('div');
      titulo.style.cssText = 'padding:8px 16px 4px;font-size:10px;font-weight:700;color:#64748B;letter-spacing:1px;text-transform:uppercase;';
      titulo.textContent = seqAtual;
      lista.appendChild(titulo);
    }

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
      <div style="font-size:12px;font-weight:600;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nomeSeq} — ${m.sequencia_ordem}</div>
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

function clicarItemMenuPorTexto(texto) {
  const candidatos = document.querySelectorAll('li, div[role="button"], span, div, button');
  for (const el of candidatos) {
    const t = el.textContent ? el.textContent.trim() : '';
    if (t === texto && el.children.length <= 2) {
      let alvo = el;
      for (let i = 0; i < 5 && alvo; i++) {
        if (alvo.tagName === 'LI' || (alvo.getAttribute && alvo.getAttribute('role') === 'button')) {
          alvo.click();
          return true;
        }
        alvo = alvo.parentElement;
      }
      el.click();
      return true;
    }
  }
  return false;
}

function abrirBotaoAnexar() {
  const attachSels = [
    'span[data-icon="plus-rounded"]',
    'span[data-icon="attach-menu-plus"]',
    'span[data-icon="clip"]',
    'button[title="Anexar"]',
    'div[title="Anexar"]',
    'span[data-testid="clip"]',
  ];
  for (const sel of attachSels) {
    const botao = document.querySelector(sel);
    if (botao) { botao.click(); return true; }
  }
  return false;
}

async function tentarViaMenuAudio(file) {
  console.log('[FiscalTrib] Abrindo menu de anexar...');
  const abriu = abrirBotaoAnexar();
  console.log('[FiscalTrib] Botao de anexar clicado:', abriu);
  await new Promise(r => setTimeout(r, 600));

  console.log('[FiscalTrib] Procurando item "Áudio" no menu...');
  const clicouAudio = clicarItemMenuPorTexto('Áudio');
  console.log('[FiscalTrib] Item "Áudio" clicado:', clicouAudio);
  if (!clicouAudio) return false;

  await new Promise(r => setTimeout(r, 600));

  const inputs = document.querySelectorAll('input[type="file"]');
  console.log('[FiscalTrib] Inputs de arquivo apos clicar em Audio:', inputs.length);
  inputs.forEach(inp => console.log('[FiscalTrib]  - input accept:', inp.accept, '| multiple:', inp.multiple));

  let inputAlvo = null;
  inputs.forEach(inp => {
    if (inp.accept && inp.accept.includes('audio')) inputAlvo = inp;
  });
  if (!inputAlvo && inputs.length > 0) inputAlvo = inputs[inputs.length - 1];
  if (!inputAlvo) return false;

  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(inputAlvo, 'files', { value: dt.files, writable: true });
    inputAlvo.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('[FiscalTrib] Arquivo setado no input de audio.');
    await new Promise(r => setTimeout(r, 1200));
    return true;
  } catch (e) {
    console.log('[FiscalTrib] Falha ao setar arquivo no input de audio:', e.message);
    return false;
  }
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
    console.log('[FiscalTrib] Arquivo baixado:', { tipo, tamanho: blob.size, mimeOriginal: blob.type });

    let mime = blob.type;
    let ext = 'bin';
    if (mime) {
      if (mime.includes('webm')) ext = 'webm';
      else if (mime.includes('wav')) ext = 'wav';
      else if (mime.includes('ogg')) ext = 'ogg';
      else if (mime.includes('mp4') || mime.includes('mpeg')) ext = 'mp4';
      else if (mime.includes('mp3')) ext = 'mp3';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('png')) ext = 'png';
    }
    const file = new File([blob], `arquivo-${Date.now()}.${ext}`, { type: mime });
    console.log('[FiscalTrib] Arquivo final que sera enviado:', { nome: file.name, tipo: file.type, tamanho: file.size });

    let sucesso = false;

    if (tipo === 'audio') {
      console.log('[FiscalTrib] Tentando metodo de MENU AUDIO...');
      sucesso = await tentarViaMenuAudio(file);
      console.log('[FiscalTrib] Resultado tentativa via menu audio:', sucesso);
    }

    if (!sucesso) {
      console.log('[FiscalTrib] Tentando metodo de DRAG AND DROP...');
      const dt = new DataTransfer();
      dt.items.add(file);
      dispararEventoDrop(areaDrop, dt, 'dragenter');
      dispararEventoDrop(areaDrop, dt, 'dragover');
      dispararEventoDrop(areaDrop, dt, 'drop');
      await new Promise(r => setTimeout(r, 1000));
    }

    setTimeout(() => {
      const clicou = clicarBotaoEnviar();
      console.log('[FiscalTrib] Tentativa de clicar em enviar. Sucesso:', clicou);
      if (!clicou) {
        const campo = encontrarCampoDigitacao();
        if (campo) campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      }
      enviandoAgora = false;
      if (btnEl && textoOriginalBtn) btnEl.innerHTML = textoOriginalBtn;
    }, 1000);

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