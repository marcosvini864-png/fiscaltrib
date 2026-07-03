const SUPABASE_URL = 'https://ikodyhxukvclgzydvztu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2R5aHh1a3ZjbGd6eWR2enR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTU1OTEsImV4cCI6MjA5Njg3MTU5MX0.X_02n8Hy0LaFoZQmLdGwjIA_LixYkMlxeVaMay4rRfg';

const loginForm = document.getElementById('login-form');
const statusForm = document.getElementById('status-form');
const errorMsg = document.getElementById('error-msg');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnOpen = document.getElementById('btn-open');

async function checkSession() {
  const session = await chrome.storage.local.get(['ft_token', 'ft_user']);
  if (session.ft_token && session.ft_user) {
    showStatus(session.ft_user);
  } else {
    loginForm.style.display = 'flex';
    loginForm.style.flexDirection = 'column';
  }
}

function showStatus(user) {
  loginForm.style.display = 'none';
  statusForm.style.display = 'block';
  document.getElementById('user-name').textContent = user.email;
}

btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) {
    showError('Preencha e-mail e senha.');
    return;
  }
  btnLogin.textContent = 'Entrando...';
  btnLogin.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      showError('E-mail ou senha incorretos.');
      return;
    }
    await chrome.storage.local.set({
      ft_token: data.access_token,
      ft_user: data.user,
    });
    showStatus(data.user);
  } catch (e) {
    showError('Erro de conexão. Tente novamente.');
  } finally {
    btnLogin.textContent = 'Entrar';
    btnLogin.disabled = false;
  }
});

btnLogout.addEventListener('click', async () => {
  await chrome.storage.local.remove(['ft_token', 'ft_user']);
  statusForm.style.display = 'none';
  loginForm.style.display = 'flex';
  loginForm.style.flexDirection = 'column';
});

btnOpen.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url.includes('web.whatsapp.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle_panel' });
    window.close();
  } else {
    chrome.tabs.create({ url: 'https://web.whatsapp.com' });
    window.close();
  }
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

checkSession();