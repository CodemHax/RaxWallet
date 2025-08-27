const API_BASE_URL = 'http://127.0.0.1:8000';
let currentUser = null;
let authToken = null;
const navbar = document.getElementById('navbar');
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const userName = document.getElementById('user-name');
const dashboardUserName = document.getElementById('dashboard-user-name');
const walletBalance = document.getElementById('wallet-balance');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  routeGuards();
  postLoadActions();
  checkAuthStatus();
});

function initializeApp() {
  authToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');
  if (authToken && savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      updateUIForLoggedInUser();
    } catch { logout(false); }
  } else {
    updateUIForLoggedOutUser();
  }
}

function setupEventListeners() {
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled');
    });
  }
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => navMenu.classList.toggle('active'));
  }
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout());
}

function routeGuards() {
  const path = window.location.pathname;
  if (path === '/dashboard' && !authToken) {
    showToast('Please login first', 'error');
    setTimeout(() => { window.location.href = '/login'; }, 600);
  }
}

function postLoadActions() {
  highlightActiveNav();
  if (walletBalance && authToken) loadWalletBalance();
  const txList = document.getElementById('tx-list');
  if (txList && authToken) {
    loadTransactions();
    setupWalletActions();
  }
  const profileFullName = document.getElementById('pf-full_name');
  if (profileFullName) {
    if (!authToken) {
      showToast('Please login first', 'error');
      setTimeout(()=> window.location.href='/login', 800);
    } else {
      loadProfile();
    }
  }
}

function highlightActiveNav() {
  const currentPath = (window.location.pathname.replace(/\/+$/,'') || '/');
  document.querySelectorAll('.nav-link').forEach(a => {
    let href = a.getAttribute('href');
    if (!href) return;
    href = href.replace(/\/+$/,'');
    if (href === '') href = '/';
    if (href === currentPath) a.classList.add('active'); else a.classList.remove('active');
  });
  if (authToken) {
    const dashLink = document.querySelector('.dashboard-link');
    if (dashLink) dashLink.style.display = 'block';
    const profileLink = document.querySelector('.profile-link');
    if (profileLink) profileLink.style.display = 'block';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const credentials = { username: formData.get('username'), password: formData.get('password') };
  showLoading(true);
  try {
    const data = await apiFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    authToken = data.access_token;
    localStorage.setItem('authToken', authToken);
    await getCurrentUser();
    showToast('Login successful', 'success');
    setTimeout(() => { window.location.href = '/dashboard'; }, 700);
  } catch (err) {
    if (err.status === 429) showToast('Too many attempts, wait a minute.', 'error');
    else if (err.status === 401) showToast('Invalid username or password.', 'error');
    else showToast(err.message, 'error');
  } finally { showLoading(false); }
}

async function handleRegister(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const userData = { full_name: fd.get('full_name'), username: fd.get('username'), email: fd.get('email'), phoneNumber: fd.get('phoneNumber'), password: fd.get('password') };
  showLoading(true);
  try {
    await apiFetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    showToast('Account created. Please login.', 'success');
    setTimeout(() => { window.location.href = '/login'; }, 900);
  } catch (err) {
    if (err.status === 429) showToast('Too many registrations, wait a minute.', 'error');
    else if (err.status === 409) showToast(err.message || 'Duplicate field', 'error');
    else if (err.status === 400) showToast(err.message || 'Validation failed', 'error');
    else showToast(err.message, 'error');
  } finally { showLoading(false); }
}

async function getCurrentUser() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) throw new Error('User fetch failed');
    currentUser = await res.json();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUIForLoggedInUser();
  } catch (e) { console.error(e); logout(false); }
}

async function loadWalletBalance() {
  try {
    const res = await fetch(`${API_BASE_URL}/wallet/balance`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) return;
    const data = await res.json();
    if (walletBalance) walletBalance.textContent = Number(data.balance).toFixed(2);
  } catch (e) { console.error(e); }
}

async function loadTransactions() {
  const txList = document.getElementById('tx-list');
  const emptyHint = document.getElementById('tx-empty');
  if (!txList) return;
  try {
    const res = await fetch(`${API_BASE_URL}/wallet/transactions`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) throw new Error('tx fetch failed');
    const data = await res.json();
    const txs = data.transactions || [];
    txList.innerHTML = '';
    if (txs.length === 0) {
      if (emptyHint) emptyHint.style.display = 'block';
      txList.innerHTML = '<div class="empty-hint">No transactions yet.</div>';
      return;
    }
    txs.slice(0,50).forEach(tx => {
      const amt = Number(tx.amount);
      const cls = amt >= 0 ? 'text-green' : 'text-red';
      const type = tx.type || (amt >= 0 ? 'credit' : 'debit');
      const created = tx.created_at ? new Date(tx.created_at).toLocaleString() : '';
      const row = document.createElement('div');
      row.className = 'transaction-item';
      row.innerHTML = `
        <div class="transaction-icon"><i class="fas ${amt>=0? 'fa-arrow-down text-green':'fa-arrow-up text-red'}"></i></div>
        <div class="transaction-details">
          <div class="transaction-title">${type.charAt(0).toUpperCase()+type.slice(1)}</div>
          <div class="transaction-date">${created}</div>
        </div>
        <div class="transaction-amount ${cls}">${amt>=0?'+':''}${amt.toFixed(2)}</div>
      `;
      txList.appendChild(row);
    });
  } catch(e){ console.error(e); }
}

function setupWalletActions() {
  const mapBtn = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  mapBtn('btnAddFunds', () => openModal('modalAddFunds'));
  mapBtn('qaAddFunds', () => openModal('modalAddFunds'));
  mapBtn('btnWithdraw', () => openModal('modalWithdraw'));
  mapBtn('qaWithdraw', () => openModal('modalWithdraw'));
  mapBtn('qaSendMoney', () => openModal('modalSendMoney'));
  mapBtn('qaRefreshTx', () => loadTransactions());
  document.querySelectorAll('[data-close]').forEach(x => {
    x.addEventListener('click', () => closeModal(x.getAttribute('data-close')));
  });
  const fAdd = document.getElementById('formAddFunds');
  if (fAdd) fAdd.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const amount = Number(new FormData(fAdd).get('amount'));
    if (!amount || amount<=0) return showToast('Invalid amount','error');
    await walletAction(`/wallet/add_funds/${amount}`,'Funds added');
    closeModal('modalAddFunds');
  });
  const fWith = document.getElementById('formWithdraw');
  if (fWith) fWith.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const amount = Number(new FormData(fWith).get('amount'));
    if (!amount || amount<=0) return showToast('Invalid amount','error');
    await walletAction(`/wallet/withdraw_funds/${amount}`,'Withdrawal successful');
    closeModal('modalWithdraw');
  });
  const fSend = document.getElementById('formSendMoney');
  if (fSend) fSend.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(fSend);
    const walletId = fd.get('wallet_id');
    const amount = Number(fd.get('amount'));
    if (!walletId || !amount || amount<=0) return showToast('Invalid data','error');
    await walletAction(`/wallet/send_money/${walletId}/${amount}`,'Transfer complete');
    closeModal('modalSendMoney');
  });
}

async function walletAction(path, successMsg){
  showLoading(true);
  try {
    await apiFetch(`${API_BASE_URL}${path}`, { method:'POST', headers:{ 'Authorization': `Bearer ${authToken}` }});
    showToast(successMsg,'success');
    await loadWalletBalance();
    await loadTransactions();
  } catch(err){
    if (err.status === 429) showToast('Rate limit reached. Try again later.','error');
    else showToast(err.message,'error');
  } finally { showLoading(false); }
}

function openModal(id){ const el=document.getElementById(id); if(el) el.style.display='block'; }
function closeModal(id){ const el=document.getElementById(id); if(el) el.style.display='none'; }

function updateUIForLoggedInUser() {
  if (authButtons) authButtons.style.display = 'none';
  if (userMenu) userMenu.style.display = 'flex';
  const name = currentUser?.full_name || currentUser?.username;
  if (userName && name) userName.textContent = name;
  if (dashboardUserName && name) dashboardUserName.textContent = name;
  const dashLink = document.querySelector('.dashboard-link');
  if (dashLink) dashLink.style.display = 'block';
  const profileLink = document.querySelector('.profile-link');
  if (profileLink) profileLink.style.display = 'block';
}

function updateUIForLoggedOutUser() {
  if (authButtons) authButtons.style.display = 'flex';
  if (userMenu) userMenu.style.display = 'none';
}

function logout(showMsg = true) {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  updateUIForLoggedOutUser();
  if (showMsg) showToast('Logged out', 'info');
  if (['/dashboard','/profile'].includes(window.location.pathname)) {
    setTimeout(()=>{ window.location.href = '/'; }, 400);
  }
}

async function loadProfile(){
  showLoading(true);
  try {
    const res = await fetch(`${API_BASE_URL}/wallet/profile`, { headers:{ 'Authorization':`Bearer ${authToken}` }});
    const data = await res.json();
    if (!res.ok) { showToast(data.detail || 'Failed to load profile','error'); return; }
    const p = data.profile || {};
    setText('pf-full_name', p.full_name);
    setText('pf-email', p.email);
    setText('pf-phone', p.phoneNumber || '-');
    setText('pf-username', p.username);
    setText('pf-wallet', p.wallet_id);
    setText('pf-balance', formatCurrency(p.balance));
    const avatar = document.getElementById('profile-avatar');
    if (avatar) avatar.textContent = (p.full_name||p.username||'?').charAt(0).toUpperCase();
    const pfTitle = document.getElementById('profile-fullname');
    if (pfTitle) pfTitle.textContent = p.full_name || p.username;
    const pfUser = document.getElementById('profile-username');
    if (pfUser) pfUser.textContent = '@'+(p.username||'');
    const copyBtn = document.getElementById('copyWallet');
    if (copyBtn) copyBtn.addEventListener('click', ()=> copyToClipboard(p.wallet_id));
  } catch(e){ console.error(e); showToast('Profile error','error'); }
  finally { showLoading(false); }
}
function setText(id,val){ const el=document.getElementById(id); if(el) el.textContent = val ?? '-'; }
function formatCurrency(num){ if(isNaN(num)) return '$0.00'; return '$'+Number(num).toFixed(2); }
function copyToClipboard(text){ if(!text) return; navigator.clipboard.writeText(text).then(()=>showToast('Wallet ID copied','success')).catch(()=>showToast('Copy failed','error')); }

function showLoading(show) { if (loading) loading.style.display = show ? 'flex' : 'none'; }
function showToast(message, type='info') {
  if (!toast) return; toast.textContent = message; toast.className = `toast ${type} show`; setTimeout(()=>{toast.classList.remove('show');},4000);
}

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    let data = null;
    let raw = '';
    try { data = await res.clone().json(); } catch { try { raw = await res.text(); } catch { raw = ''; } }
    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || raw || `HTTP ${res.status}`;
      throw { status: res.status, message: detail, data };
    }
    return data || {};
  } catch (err) {
    if (err.status) throw err;
    throw { status: 0, message: 'Network error', data: null };
  }
}

function checkAuthStatus() {
  setInterval(async ()=>{
    if (!authToken) return;
    try { const r = await fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${authToken}` }}); if (!r.ok) logout(false);} catch(_){}}
  , 300000);
}

setInterval(()=>{ if (authToken && walletBalance) { loadWalletBalance(); const txList=document.getElementById('tx-list'); if(txList) loadTransactions(); } }, 30000);

window.addEventListener('unhandledrejection', ev => { console.error(ev.reason); showToast('Unexpected error','error'); });
