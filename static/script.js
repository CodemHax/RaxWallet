const API_BASE_URL = 'http://localhost:8000';
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

  initializePasswordToggle();
  initializeRememberMe();
  initializeRealTimeValidation();
});

function initializeApp() {
  authToken = localStorage.getItem('access_token');
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

  const qrForm = document.getElementById('qrForm');
  if (qrForm) qrForm.addEventListener('submit', handleQRGeneration);

  const generateNewBtn = document.getElementById('generateNew');
  if (generateNewBtn) generateNewBtn.addEventListener('click', resetQRForm);

  const downloadQRBtn = document.getElementById('downloadQR');
  if (downloadQRBtn) downloadQRBtn.addEventListener('click', downloadQRCode);

  const cancelRequestBtn = document.getElementById('cancelRequest');
  if (cancelRequestBtn) cancelRequestBtn.addEventListener('click', cancelPaymentRequest);

  const qaAddFunds = document.getElementById('qaAddFunds');
  const qaWithdraw = document.getElementById('qaWithdraw');
  const qaSendMoney = document.getElementById('qaSendMoney');
  const qaQRGenerator = document.getElementById('qaQRGenerator');
  const qaViewRequests = document.getElementById('qaViewRequests');
  const qaRefreshTx = document.getElementById('qaRefreshTx');

  if (qaAddFunds) qaAddFunds.addEventListener('click', () => openModal('modalAddFunds'));
  if (qaWithdraw) qaWithdraw.addEventListener('click', () => openModal('modalWithdraw'));
  if (qaSendMoney) qaSendMoney.addEventListener('click', () => openModal('modalSendMoney'));
  if (qaQRGenerator) qaQRGenerator.addEventListener('click', () => openModal('modalQRRequest'));
  if (qaViewRequests) qaViewRequests.addEventListener('click', () => loadMyQRRequests());
  if (qaRefreshTx) qaRefreshTx.addEventListener('click', () => {
    loadTransactions();
    loadPendingRequests();
    loadWalletBalance();
  });

  const formQRRequest = document.getElementById('formQRRequest');
  if (formQRRequest) formQRRequest.addEventListener('submit', handleQRRequest);

  const downloadQR = document.getElementById('downloadQR');
  const shareQR = document.getElementById('shareQR');
  if (downloadQR) downloadQR.addEventListener('click', downloadQRCode);
  if (shareQR) shareQR.addEventListener('click', shareQRCode);

  document.querySelectorAll('[data-close]').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
      const modalId = e.target.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
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
    loadPendingRequests();
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

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');

  clearValidationStates();

  if (!validateLoginForm()) {
    return;
  }

  const formData = new FormData(e.target);
  const credentials = {
    username: formData.get('username'),
    password: formData.get('password')
  };

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Signing in...</span>';
  }

  showLoading(true);

  try {
    const data = await apiFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    authToken = data.access_token;
    localStorage.setItem('access_token', authToken);

    const rememberMe = document.getElementById('remember-me');
    if (rememberMe && rememberMe.checked) {
      localStorage.setItem('remember_user', credentials.username);
    } else {
      localStorage.removeItem('remember_user');
    }

    await getCurrentUser();
    showToast('Login successful! Welcome back.', 'success');

    if (usernameInput) usernameInput.classList.add('success');
    if (passwordInput) passwordInput.classList.add('success');

    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);

  } catch (err) {
    if (usernameInput) usernameInput.classList.add('error');
    if (passwordInput) passwordInput.classList.add('error');

    if (err.status === 429) {
      showToast('Too many login attempts. Please wait a minute.', 'error');
      showInputError('username', 'Too many attempts - please wait');
    } else if (err.status === 401) {
      showToast('Invalid username or password.', 'error');
      showInputError('username', 'Invalid credentials');
      showInputError('password', 'Invalid credentials');
    } else {
      showToast(err.message || 'Login failed. Please try again.', 'error');
      showInputError('username', 'Login failed');
    }
  } finally {
    showLoading(false);

    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign In</span>';
    }
  }
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

async function loadPendingRequests() {
  const pendingContainer = document.getElementById('pendingRequests');
  if (!pendingContainer || !authToken) return;

  try {
    const res = await fetch(`${API_BASE_URL}/payments/my-requests`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) throw new Error('Failed to fetch pending requests');

    const data = await res.json();
    const allRequests = data.requests || [];

    const pendingRequests = allRequests.filter(req =>
      req.status === 'pending' && req.recipient_id === currentUser.wallet_id
    );

    pendingContainer.innerHTML = '';

    if (pendingRequests.length === 0) {
      pendingContainer.innerHTML = '<div class="empty-hint">No pending payment requests</div>';
      return;
    }

    pendingRequests.forEach(req => {
      const amount = parseFloat(req.amount);
      const requestDiv = document.createElement('div');
      requestDiv.className = 'pending-request-item';
      requestDiv.style.cssText = 'padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:0.5rem;background:#f8fafc;';

      requestDiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <span style="font-weight:500;color:#1e293b;">$${amount.toFixed(2)}</span>
          <span style="font-size:0.75rem;color:#64748b;text-transform:uppercase;background:#fef3c7;color:#d97706;padding:0.25rem 0.5rem;border-radius:4px;">pending</span>
        </div>
        <div style="font-size:0.875rem;color:#64748b;margin-bottom:0.5rem;">
          From: ${req.sender_username || 'Unknown'}
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button class="approve-req-btn" data-request-id="${req.request_id}" style="flex:1;padding:0.5rem;background:#059669;color:white;border:none;border-radius:4px;font-size:0.75rem;cursor:pointer;">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="decline-req-btn" data-request-id="${req.request_id}" style="flex:1;padding:0.5rem;background:#dc2626;color:white;border:none;border-radius:4px;font-size:0.75rem;cursor:pointer;">
            <i class="fas fa-times"></i> Decline
          </button>
        </div>
      `;

      pendingContainer.appendChild(requestDiv);
    });

    document.querySelectorAll('.approve-req-btn').forEach(btn => {
      btn.addEventListener('click', () => handlePaymentRequest(btn.dataset.requestId, 'approve'));
    });

    document.querySelectorAll('.decline-req-btn').forEach(btn => {
      btn.addEventListener('click', () => handlePaymentRequest(btn.dataset.requestId, 'decline'));
    });

  } catch (error) {
    console.error('Error loading pending requests:', error);
    pendingContainer.innerHTML = '<div class="empty-hint" style="color:#dc2626;">Failed to load pending requests</div>';
  }
}

async function handlePaymentRequest(requestId, action) {
  if (!requestId || !authToken) return;

  const btn = document.querySelector(`[data-request-id="${requestId}"]`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  }

  try {
    const endpoint = action === 'approve'
      ? `/payments/approve_request/${requestId}`
      : `/payments/decline_request/${requestId}`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || `Failed to ${action} payment`);
    }

    const data = await res.json();
    showToast(data.message || `Payment ${action}d successfully`, 'success');

    await loadPendingRequests();
    await loadWalletBalance();
    await loadTransactions();

  } catch (error) {
    console.error(`Error ${action}ing payment:`, error);
    showToast(error.message || `Failed to ${action} payment`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      const icon = action === 'approve' ? 'fa-check' : 'fa-times';
      const text = action === 'approve' ? 'Approve' : 'Decline';
      btn.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
    }
  }
}

function setupWalletActions() {
  const mapBtn = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  mapBtn('btnAddFunds', () => openModal('modalAddFunds'));
  mapBtn('qaAddFunds', () => openModal('modalAddFunds'));
  mapBtn('btnWithdraw', () => openModal('modalWithdraw'));
  mapBtn('qaWithdraw', () => openModal('modalWithdraw'));
  mapBtn('qaSendMoney', () => openModal('modalSendMoney'));
  mapBtn('qaQRGenerator', () => window.location.href = '/qr-generator');
  mapBtn('qaRefreshTx', () => {
    loadTransactions();
    loadPendingRequests();
    showToast('Refreshed', 'success');
  });
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
  localStorage.removeItem('access_token');
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

// Payment Approval Page Functions
let paymentRequestData = null;
let requestId = null;
let walletId = null;

function initializePaymentApproval() {
  if (!window.location.pathname.includes('payment-approval')) return;

  const urlParams = new URLSearchParams(window.location.search);
  requestId = urlParams.get('request_id');
  walletId = urlParams.get('wallet');

  if (!requestId || !walletId) {
    showPaymentError('Invalid payment link. Missing required parameters.');
    return;
  }

  if (!authToken) {
    showToast('Please login to view this payment request', 'error');
    setTimeout(() => {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 2000);
    return;
  }

  loadPaymentDetails();
}

async function loadPaymentDetails() {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/request/${requestId}?wallet=${walletId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to load payment details');
    }

    paymentRequestData = await response.json();
    displayPaymentDetails();

  } catch (error) {
    console.error('Error loading payment details:', error);
    showPaymentError(error.message || 'Failed to load payment details');
  }
}

function displayPaymentDetails() {
  const loadingState = document.getElementById('loadingState');
  const paymentState = document.getElementById('paymentState');
  const successState = document.getElementById('successState');

  if (loadingState) loadingState.style.display = 'none';

  if (paymentRequestData.status === 'completed') {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) successMessage.textContent = 'This payment has already been completed.';
    if (successState) successState.style.display = 'block';
    return;
  }

  if (paymentRequestData.status === 'declined') {
    showPaymentError('This payment request has been declined.');
    return;
  }

  if (paymentRequestData.status === 'failed') {
    showPaymentError('This payment request has failed.');
    return;
  }

  const paymentAmount = document.getElementById('paymentAmount');
  const senderInfo = document.getElementById('senderInfo');
  const recipientInfo = document.getElementById('recipientInfo');
  const requestIdElement = document.getElementById('requestId');
  const paymentDescription = document.getElementById('paymentDescription');
  const descriptionRow = document.getElementById('descriptionRow');

  if (paymentAmount) paymentAmount.textContent = `$${parseFloat(paymentRequestData.amount).toFixed(2)}`;
  if (senderInfo) senderInfo.textContent = paymentRequestData.sender_username || 'Unknown';
  if (recipientInfo) recipientInfo.textContent = paymentRequestData.recipient_username || 'Unknown';
  if (requestIdElement) requestIdElement.textContent = paymentRequestData.request_id || requestId;

  if (paymentRequestData.description && paymentDescription && descriptionRow) {
    paymentDescription.textContent = paymentRequestData.description;
    descriptionRow.style.display = 'flex';
  }

  const approveBtn = document.getElementById('approveBtn');
  const declineBtn = document.getElementById('declineBtn');

  if (approveBtn) approveBtn.addEventListener('click', () => processPayment('approve'));
  if (declineBtn) declineBtn.addEventListener('click', () => processPayment('decline'));

  if (paymentState) paymentState.style.display = 'block';
}

async function processPayment(action) {
  const approveBtn = document.getElementById('approveBtn');
  const declineBtn = document.getElementById('declineBtn');

  if (approveBtn) approveBtn.disabled = true;
  if (declineBtn) declineBtn.disabled = true;

  if (action === 'approve' && approveBtn) {
    approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  } else if (declineBtn) {
    declineBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Declining...';
  }

  try {
    const endpoint = action === 'approve'
      ? `/payments/process_payment?request_id=${requestId}&wallet=${walletId}`
      : `/payments/decline_request/${requestId}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to ${action} payment`);
    }

    const result = await response.json();
    showToast(result.message || `Payment ${action}d successfully`, 'success');

    if (action === 'approve') {
      const successMessage = document.getElementById('successMessage');
      const successState = document.getElementById('successState');
      const paymentState = document.getElementById('paymentState');

      if (successMessage) successMessage.textContent = 'Payment has been approved and processed successfully.';
      if (successState) successState.style.display = 'block';
      if (paymentState) paymentState.style.display = 'none';
    } else {
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    }

  } catch (error) {
    console.error(`Error ${action}ing payment:`, error);
    showToast(error.message || `Failed to ${action} payment`, 'error');

    if (approveBtn) {
      approveBtn.disabled = false;
      approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve Payment';
    }
    if (declineBtn) {
      declineBtn.disabled = false;
      declineBtn.innerHTML = '<i class="fas fa-times"></i> Decline';
    }
  }
}

function showPaymentError(message) {
  const loadingState = document.getElementById('loadingState');
  const errorMessage = document.getElementById('errorMessage');
  const errorState = document.getElementById('errorState');

  if (loadingState) loadingState.style.display = 'none';
  if (errorMessage) errorMessage.textContent = message;
  if (errorState) errorState.style.display = 'block';
}


document.addEventListener('DOMContentLoaded', () => {
  initializePaymentApproval();
});


async function handleQRGeneration(e) {
  e.preventDefault();

  if (!authToken || !currentUser) {
    showToast('Please login to generate QR codes', 'error');
    setTimeout(() => window.location.href = '/login', 1000);
    return;
  }

  const formData = new FormData(e.target);
  const amount = parseFloat(formData.get('amount'));
  const description = formData.get('description') || '';
  const expires_in_minutes = parseInt(formData.get('expires_in_minutes')) || 60;

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/payments/create_qr_request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        description: description,
        expires_in_minutes: expires_in_minutes
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to generate QR code');
    }

    const qrData = await response.json();

    displayQRResult(qrData, description, expires_in_minutes);

    showToast('QR code generated successfully!', 'success');

  } catch (error) {
    console.error('QR Generation Error:', error);
    showToast('Failed to generate QR code: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

let statusPollingInterval = null;
let paymentTimeoutId = null;

function displayQRResult(qrData, description, expires_in_minutes) {
  const qrResult = document.getElementById('qrResult');
  const qrCodeImage = document.getElementById('qrCodeImage');
  const displayAmount = document.getElementById('displayAmount');
  const displayDescription = document.getElementById('displayDescription');
  const displayExpiry = document.getElementById('displayExpiry');
  const displayRequestId = document.getElementById('displayRequestId');

  if (!qrResult || !qrCodeImage) return;

  qrCodeImage.src = qrData.qr_code_url;

  if (displayAmount) displayAmount.textContent = qrData.amount.toFixed(2);
  if (displayDescription) displayDescription.textContent = description || 'No description';
  if (displayExpiry) {
    const expiryDate = new Date(qrData.expires_at);
    displayExpiry.textContent = expiryDate.toLocaleString();
  }
  if (displayRequestId) displayRequestId.textContent = qrData.request_id;

  updatePaymentStatus('pending', 'Waiting for payment...');

  window.currentQRData = qrData;

  document.getElementById('qrForm').style.display = 'none';
  qrResult.style.display = 'block';

  setupQRActionButtons();

  startStatusPolling(qrData.request_id);
}

function setupQRActionButtons() {
  const downloadBtn = document.getElementById('downloadQR');
  const shareBtn = document.getElementById('shareQR');
  const cancelBtn = document.getElementById('cancelRequest');
  const generateNewBtn = document.getElementById('generateNew');

  console.log('📋 Button elements found:', {
    download: !!downloadBtn,
    share: !!shareBtn,
    cancel: !!cancelBtn,
    generateNew: !!generateNewBtn
  });

  if (downloadBtn) {
    downloadBtn.onclick = function(e) {
      e.preventDefault();
      downloadQRCode();
    };
  }

  if (shareBtn) {
    shareBtn.onclick = function(e) {
      e.preventDefault();
      shareQRCode();
    };

  }

  if (cancelBtn) {
    cancelBtn.onclick = function(e) {
      e.preventDefault();
      cancelPaymentRequest();
    };
  }

  if (generateNewBtn) {
    generateNewBtn.onclick = function(e) {
      e.preventDefault();
      resetQRForm();
    };
  }


  const allButtons = [downloadBtn, shareBtn, cancelBtn, generateNewBtn];
  allButtons.forEach((btn) => {
    if (btn) {
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
  });

}

function updatePaymentStatus(status, message, senderName = null) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusDetails = document.getElementById('statusDetails');

  if (!statusDot || !statusText || !statusDetails) return;

  statusDot.className = 'status-dot';
  statusText.className = 'status-text';
  statusDetails.className = 'status-details';

  statusDot.classList.add(status);
  statusText.classList.add(status);
  statusDetails.classList.add(status);

  statusText.textContent = getStatusDisplayText(status);

  let detailMessage = message;
  if (status === 'completed' && senderName) {
    detailMessage = `Payment received from ${senderName}`;
  }

  statusDetails.innerHTML = `
    <p>${detailMessage}</p>
    <div class="status-timestamp">${new Date().toLocaleString()}</div>
  `;
}

function getStatusDisplayText(status) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
}

function startStatusPolling(requestId) {
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
  }

  if (paymentTimeoutId) {
    clearTimeout(paymentTimeoutId);
  }

  // Set up 3-minute (180 seconds) timeout to automatically expire the transaction
  paymentTimeoutId = setTimeout(async () => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }

    // Automatically expire the transaction after 3 minutes
    try {
      await fetch(`${API_BASE_URL}/payments/expire_request/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    } catch (error) {
      console.error('Error expiring transaction:', error);
    }

    updatePaymentStatus('expired', 'Payment request expired after 3 minutes.');
    showToast('Payment request expired due to timeout', 'warning');
  }, 180000); // 3 minutes = 180,000 milliseconds

  statusPollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/request_status/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const statusData = await response.json();
        const currentStatus = statusData.status;

        if (currentStatus !== 'pending') {
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;

          // Clear the timeout since transaction completed
          if (paymentTimeoutId) {
            clearTimeout(paymentTimeoutId);
            paymentTimeoutId = null;
          }

          if (currentStatus === 'completed') {
            updatePaymentStatus('completed', 'Payment completed successfully!', statusData.sender_name);
            showToast('Payment received successfully!', 'success');

            if (typeof loadWalletBalance === 'function') {
              loadWalletBalance();
            }


            setTimeout(() => {
              const amount = window.currentQRData.amount;
              const sender = encodeURIComponent(statusData.sender_name || 'Unknown');
              const txId = window.currentQRData.request_id;
              const description = encodeURIComponent(window.currentQRData.description || '');

              window.location.href = `/payment-received?amount=${amount}&sender=${sender}&tx_id=${txId}&description=${description}`;
            }, 2000);
          } else if (currentStatus === 'rejected') {
            updatePaymentStatus('rejected', 'Payment was declined by the sender.');
            showToast('Payment request was declined', 'error');
          } else if (currentStatus === 'failed') {
            updatePaymentStatus('failed', 'Payment failed due to an error.');
            showToast('Payment failed', 'error');
          } else if (currentStatus === 'cancelled') {
            updatePaymentStatus('cancelled', 'Payment request was cancelled.');
            showToast('Payment request cancelled', 'warning');
          } else if (currentStatus === 'expired') {
            updatePaymentStatus('expired', 'Payment request has expired.');
            showToast('Payment request expired', 'warning');
          }
        }
      }
    } catch (error) {
      console.error('Status polling error:', error);
    }
  }, 3000);
}

function resetQRForm() {
  const qrResult = document.getElementById('qrResult');
  const qrForm = document.getElementById('qrForm');

  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
    statusPollingInterval = null;
  }

  if (paymentTimeoutId) {
    clearTimeout(paymentTimeoutId);
    paymentTimeoutId = null;
  }

  if (qrResult) qrResult.style.display = 'none';
  if (qrForm) {
    qrForm.style.display = 'block';
    qrForm.reset();
  }

  window.currentQRData = null;
}

function downloadQRCode() {
  if (!window.currentQRData) {
    showToast('No QR code to download', 'error');
    return;
  }

  const qrCodeImage = document.getElementById('qrCodeImage');
  if (!qrCodeImage || !qrCodeImage.src) {
    showToast('QR code image not available', 'error');
    return;
  }

  const link = document.createElement('a');
  link.href = qrCodeImage.src;
  link.download = `payment-qr-${window.currentQRData.request_id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('QR code downloaded!', 'success');
}

function shareQRCode() {
  if (!window.currentQRData) {
    showToast('No QR code to share', 'error');
    return;
  }

  const shareUrl = window.currentQRData.qr_code_url;

  if (navigator.share) {
    navigator.share({
      title: 'Payment Request',
      text: `Pay $${window.currentQRData.amount} to ${window.currentQRData.receiver_name}`,
      url: shareUrl
    }).catch(err => console.log('Error sharing:', err));
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Payment link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  }
}

function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function resetQRForm() {
  document.getElementById('qrGeneratorForm').reset();
  document.getElementById('qrResultSection').style.display = 'none';
  document.getElementById('qrCodeDisplay').innerHTML = '';
}

async function downloadQRCode() {
  try {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas || !canvas.width) {
      showToast('No QR code available to download', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = 'raxwallet-payment-qr.png';
    link.href = canvas.toDataURL();
    link.click();
    showToast('QR code downloaded!', 'success');
  } catch (error) {
    console.error('Download failed:', error);
    showToast('Failed to download QR code', 'error');
  }
}

function copyQRUrl() {
  const urlElement = document.getElementById('paymentUrl');
  const url = urlElement.textContent;

  if (!url || url === '-') {
    showToast('No payment URL available to copy', 'error');
    return;
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Payment URL copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy URL', 'error');
    });
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Payment URL copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy URL', 'error');
    }
    document.body.removeChild(textArea);
  }
}

function initQRGenerator() {
  if (window.location.pathname.includes('qr-generator')) {
    const copyUrlBtn = document.getElementById('copyUrl');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', copyQRUrl);
    }

    setTimeout(() => {
      const form = document.getElementById('qrGeneratorForm');
      if (form) form.reset();
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initQRGenerator();
});

async function handleQRRequest(e) {
  e.preventDefault();

  if (!authToken || !currentUser) {
    showToast('Please login to create payment requests', 'error');
    return;
  }

  const formData = new FormData(e.target);
  const amount = parseFloat(formData.get('amount'));
  const description = formData.get('description') || '';
  const expiresInMinutes = parseInt(formData.get('expires_in_minutes'));

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/payments/generate_qr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        description: description,
        expires_in_minutes: expiresInMinutes
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to generate QR code');
    }

    const qrData = await response.json();
    displayQRModal(qrData, amount, description);
    closeModal('modalQRRequest');
    showToast('QR payment request created successfully!', 'success');

  } catch (error) {
    console.error('QR Request Error:', error);
    showToast('Failed to create QR request: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

function displayQRModal(qrData, amount, description) {
  document.getElementById('qrCodeImage').src = qrData.qr_url;

  document.getElementById('displayAmount').textContent = amount.toFixed(2);
  document.getElementById('displayDescription').textContent = description || 'No description';
  document.getElementById('displayExpiry').textContent = new Date(qrData.expires_at).toLocaleString();
  document.getElementById('displayRequestId').textContent = qrData.request_id;

  window.currentQRData = qrData;

  openModal('modalQRDisplay');
}

async function shareQRCode() {
  if (!window.currentQRData) {
    showToast('No QR code to share', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(window.currentQRData.payment_url);
    showToast('Payment link copied to clipboard!', 'success');
  } catch (error) {
    const textArea = document.createElement('textarea');
    textArea.value = window.currentQRData.payment_url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('Payment link copied to clipboard!', 'success');
  }
}

async function loadMyQRRequests() {
  if (!authToken) {
    showToast('Please login to view your requests', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/payments/my-requests`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load your payment requests');
    }

    const data = await response.json();
    displayMyRequests(data.requests || []);
    openModal('modalMyRequests');

  } catch (error) {
    console.error('Error loading requests:', error);
    showToast('Failed to load your payment requests', 'error');
  }
}

function displayMyRequests(requests) {
  const container = document.getElementById('myRequestsList');

  if (requests.length === 0) {
    container.innerHTML = '<div class="empty-hint">You have no payment requests yet.</div>';
    return;
  }

  container.innerHTML = '';

  requests.forEach(req => {
    const amount = parseFloat(req.amount);
    const statusColor = req.status === 'pending' ? '#f59e0b' :
                       req.status === 'completed' ? '#10b981' : '#ef4444';

    const requestDiv = document.createElement('div');
    requestDiv.className = 'request-item';
    requestDiv.style.cssText = 'padding:1rem;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:1rem;background:white;';

    requestDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <span style="font-weight:600;font-size:1.1rem;">$${amount.toFixed(2)}</span>
        <span style="padding:0.25rem 0.75rem;border-radius:12px;font-size:0.75rem;font-weight:500;color:white;background:${statusColor};">
          ${req.status.toUpperCase()}
        </span>
      </div>
      <div style="font-size:0.875rem;color:#64748b;margin-bottom:0.5rem;">
        ${req.description || 'No description'}
      </div>
      <div style="font-size:0.75rem;color:#9ca3af;">
        Request ID: ${req.request_id}
      </div>
      <div style="font-size:0.75rem;color:#9ca3af;">
        Created: ${new Date(req.created_at).toLocaleString()}
      </div>
    `;

    container.appendChild(requestDiv);
  });
}


function initializePasswordToggle() {
  const passwordToggle = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('password');

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      const icon = this.querySelector('i');
      if (icon) {
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
      }
    });
  }
}


function initializeRememberMe() {
  const usernameInput = document.getElementById('username');
  const rememberCheckbox = document.getElementById('remember-me');

  const rememberedUser = localStorage.getItem('remember_user');
  if (rememberedUser && usernameInput) {
    usernameInput.value = rememberedUser;
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }
}


function initializeRealTimeValidation() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  if (usernameInput) {
    usernameInput.addEventListener('input', function() {
      this.classList.remove('error', 'success');
      const feedback = document.getElementById('username-feedback');
      if (feedback) {
        feedback.textContent = '';
        feedback.className = 'input-feedback';
      }
    });

    usernameInput.addEventListener('blur', function() {
      if (this.value.trim()) {
        if (this.value.length < 3) {
          showInputError('username', 'Username must be at least 3 characters');
          this.classList.add('error');
        } else {
          showInputSuccess('username', 'Valid username');
          this.classList.add('success');
        }
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      this.classList.remove('error', 'success');
      const feedback = document.getElementById('password-feedback');
      if (feedback) {
        feedback.textContent = '';
        feedback.className = 'input-feedback';
      }
    });

    passwordInput.addEventListener('blur', function() {
      if (this.value) {
        if (this.value.length < 8) {
          showInputError('password', 'Password must be at least 8 characters');
          this.classList.add('error');
        } else {
          showInputSuccess('password', 'Valid password');
          this.classList.add('success');
        }
      }
    });
  }
}

function validateLoginForm() {
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  let isValid = true;

  if (!username.value.trim()) {
    showInputError('username', 'Username is required');
    username.classList.add('error');
    isValid = false;
  } else if (username.value.length < 3) {
    showInputError('username', 'Username must be at least 3 characters');
    username.classList.add('error');
    isValid = false;
  } else {
    showInputSuccess('username', 'Valid username');
    username.classList.add('success');
  }

  if (!password.value) {
    showInputError('password', 'Password is required');
    password.classList.add('error');
    isValid = false;
  } else if (password.value.length < 8) {
    showInputError('password', 'Password must be at least 8 characters');
    password.classList.add('error');
    isValid = false;
  } else {
    showInputSuccess('password', 'Valid password');
    password.classList.add('success');
  }

  return isValid;
}

function showInputError(inputId, message) {
  const feedback = document.getElementById(`${inputId}-feedback`);
  if (feedback) {
    feedback.textContent = message;
    feedback.className = 'input-feedback error';
  }
}

function showInputSuccess(inputId, message) {
  const feedback = document.getElementById(`${inputId}-feedback`);
  if (feedback) {
    feedback.textContent = message;
    feedback.className = 'input-feedback success';
  }
}

function clearValidationStates() {
  const inputs = ['username', 'password'];
  inputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    const feedback = document.getElementById(`${inputId}-feedback`);

    if (input) {
      input.classList.remove('error', 'success');
    }

    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'input-feedback';
    }
  });
}

async function cancelPaymentRequest() {
  if (!window.currentQRData || !window.currentQRData.request_id) {
    showToast('No active payment request to cancel', 'error');
    return;
  }

  if (!authToken) {
    showToast('Please login to cancel payment requests', 'error');
    return;
  }


  if (!confirm('Are you sure you want to cancel this payment request?')) {
    return;
  }

  const cancelBtn = document.getElementById('cancelRequest');
  if (cancelBtn) {
    cancelBtn.disabled = true;
    cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/payments/cancel_request/${window.currentQRData.request_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to cancel payment request');
    }


    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }

    if (paymentTimeoutId) {
      clearTimeout(paymentTimeoutId);
      paymentTimeoutId = null;
    }

    updatePaymentStatus('cancelled', 'Payment request cancelled by user.');
    showToast('Payment request cancelled successfully', 'success');


    const downloadBtn = document.getElementById('downloadQR');
    const shareBtn = document.getElementById('shareQR');
    const generateNewBtn = document.getElementById('generateNew');

    if (downloadBtn) downloadBtn.disabled = true;
    if (shareBtn) shareBtn.disabled = true;
    if (cancelBtn) cancelBtn.style.display = 'none';

  } catch (error) {
    console.error('Error cancelling payment request:', error);
    showToast('Failed to cancel payment request: ' + error.message, 'error');

    if (cancelBtn) {
      cancelBtn.disabled = false;
      cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Request';
    }
  }
}
