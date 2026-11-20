
function safeGetStorage(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (e) { return fallback; }
}

function safeSetStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function safeRemoveStorage(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function safeParseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null ? parsed : fallback;
  } catch (e) { return fallback; }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount) {
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function showToast(msg, icon = '✓') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `<span style="color:#10b981; font-weight:800;">${escapeHTML(icon)}</span><span>${escapeHTML(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = '0.22s ease';
    setTimeout(() => el.remove(), 240);
  }, 2600);
}

function copyTextToClipboard(text, label = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(label, '📋')).catch(() => fallbackCopy(text, label));
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(label, '📋');
  } catch (e) {
    showToast('Unable to copy automatically', '!');
  }
  ta.remove();
}

function handleOutsideModal(e, modalId) {
  if (e.target === document.getElementById(modalId)) {
    if (modalId === 'gameDemoModal') closeGameDemoModal();
    else document.getElementById(modalId).style.display = 'none';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCardDetailModal();
    closeGameDemoModal();
    closeAuthModal();
    closeProfileModal();
    closeCartModal();
    closeAddFundsModal();
    closeOwnerLogin();
    closeOwnerDashboard();
    closeStockTradeModal();
  }
});

let qualityMode = safeGetStorage('spikey_quality', 'mid');
if (!['high', 'mid', 'low'].includes(qualityMode)) qualityMode = 'mid';

let skyController = null;

function setQualityMode(mode, notify = true) {
  if (!['high', 'mid', 'low'].includes(mode)) return;
  qualityMode = mode;
  safeSetStorage('spikey_quality', mode);

  document.body.classList.remove('quality-high', 'quality-mid', 'quality-low');
  document.body.classList.add(`quality-${mode}`);

  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-q') === mode);
  });

  const sidebarTxt = document.getElementById('sidebarQualityText');
  if (sidebarTxt) sidebarTxt.innerText = mode.toUpperCase();

  if (skyController && typeof skyController.configure === 'function') {
    skyController.configure(mode);
  }

  if (typeof applyCardFilters === 'function' && typeof catalogCards !== 'undefined') {
    applyCardFilters(true);
  }

  if (notify) {
    const labels = {
      high: 'High Graphics: Watermark animations & 60 FPS sky',
      mid: 'Mid Graphics: Balanced animations & 30 FPS sky',
      low: 'Low Graphics: Maximum FPS mode (animations & canvas paused)'
    };
    showToast(labels[mode], '⚙');
  }
}

(function initSpaceCanvas() {
  const canvas = document.getElementById('spaceCanvas');
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let stars = [];
  let meteors = [];
  let frameInterval = 45;
  let starTargetCount = 40;
  let meteorTargetCount = 1;
  let isPaused = false;
  const colors = ['#ffffff', '#ffffff', '#e0e7ff', '#ddd6fe', '#bae6fd'];

  function rebuildParticles() {
    stars = Array.from({ length: starTargetCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: i % 10 === 0 ? 1.8 : i % 3 === 0 ? 1.2 : 0.8,
      color: colors[i % colors.length],
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.025
    }));

    meteors = Array.from({ length: meteorTargetCount }, (_, j) => ({
      x: Math.random() * width * 1.2,
      y: -80 - j * 220,
      len: 75 + Math.random() * 45,
      speed: 6 + Math.random() * 4,
      delay: j * 90
    }));
  }

  function resizeCanvas() {
    // Cap DPR lower — full retina canvas is a big lag source
    const dpr = Math.min(window.devicePixelRatio || 1, qualityMode === 'high' ? 1.25 : 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildParticles();
  }

  function configure(mode) {
    if (mode === 'low') {
      isPaused = true;
      ctx.clearRect(0, 0, width, height);
      return;
    }
    isPaused = false;
    if (mode === 'high') {
      frameInterval = 33;          // ~30fps instead of ~40
      starTargetCount = 55;
      meteorTargetCount = 1;
    } else {
      // mid
      frameInterval = 55;          // ~18fps
      starTargetCount = 28;
      meteorTargetCount = 1;
    }
    rebuildParticles();
  }

  skyController = { configure };
  resizeCanvas();
  configure(qualityMode);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
  });

  let lastFrame = 0;
  function renderSky(ts) {
    requestAnimationFrame(renderSky);
    if (isPaused || document.hidden || ts - lastFrame < frameInterval) return;
    lastFrame = ts;

    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.speed;
      ctx.globalAlpha = 0.22 + 0.78 * (0.5 + 0.5 * Math.sin(s.phase));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.6;
    for (let j = 0; j < meteors.length; j++) {
      const m = meteors[j];
      if (m.delay > 0) {
        m.delay--;
        continue;
      }
      // Cheap solid stroke instead of per-frame linearGradient (major lag source)
      ctx.strokeStyle = 'rgba(200, 180, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + m.len, m.y - m.len);
      ctx.stroke();

      m.x -= m.speed;
      m.y += m.speed;
      if (m.y > height + 120 || m.x < -120) {
        m.x = Math.random() * width * 1.25 + 80;
        m.y = -60;
        m.delay = 60 + Math.floor(Math.random() * 140);
      }
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(renderSky);
})();

function updateStatusBar() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  document.getElementById('clockDisplay').innerText = `${hours}:${minutes} ${ampm}`;
}
setInterval(updateStatusBar, 1000);
updateStatusBar();

if (navigator.getBattery) {
  navigator.getBattery().then(bat => {
    const syncBat = () => {
      const pct = Math.round(bat.level * 100);
      document.getElementById('batteryDisplay').innerText = `${bat.charging ? '⚡' : '🔋'} ${pct}%`;
    };
    syncBat();
    bat.addEventListener('levelchange', syncBat);
    bat.addEventListener('chargingchange', syncBat);
  }).catch(() => {});
}

const sidebarEl = document.getElementById('sidebarNavPanel');
const hoverZoneEl = document.getElementById('sidebarHoverZone');
let sidebarCloseTimer = null;

function openHoverSidebar() {
  if (sidebarCloseTimer) {
    clearTimeout(sidebarCloseTimer);
    sidebarCloseTimer = null;
  }
  sidebarEl.classList.add('hover-open');
}

function scheduleCloseHoverSidebar() {
  if (sidebarCloseTimer) clearTimeout(sidebarCloseTimer);
  sidebarCloseTimer = setTimeout(() => {
    sidebarEl.classList.remove('hover-open');
  }, 180);
}

hoverZoneEl.addEventListener('mouseenter', openHoverSidebar);
sidebarEl.addEventListener('mouseenter', openHoverSidebar);
sidebarEl.addEventListener('mouseleave', scheduleCloseHoverSidebar);

function toggleSidebar() {
  if (window.innerWidth <= 900) {
    document.body.classList.toggle('mobile-nav-open');
    document.getElementById('sidebarBackdrop').classList.toggle('visible');
  } else {
    document.body.classList.toggle('sidebar-pinned');
  }
}

const realBanks = [
  "Bank of America", "Wells Fargo", "Chase Bank", "Citibank",
  "U.S. Bank", "PNC Bank", "Capital One", "Target Gift", "American Express"
];

const bankThemeMap = {
  "Bank of America": "bank-bofa",
  "Wells Fargo": "bank-wellsfargo",
  "Chase Bank": "bank-chase",
  "Citibank": "bank-citi",
  "U.S. Bank": "bank-usbank",
  "PNC Bank": "bank-pnc",
  "Capital One": "bank-capitalone",
  "Target Gift": "bank-target",
  "American Express": "bank-amex",
  "Vault Purple": "bank-default"
};

const allBannerThemes = [
  "Bank of America", "Wells Fargo", "Chase Bank", "Citibank",
  "U.S. Bank", "PNC Bank", "Capital One", "Target Gift", "American Express", "Vault Purple"
];

const watermarkMaskCache = {};

function getWatermarkMaskUrl(label) {
  const cleanLabel = (label || 'SPIKEY VAULT').toUpperCase().trim();
  if (watermarkMaskCache[cleanLabel]) return watermarkMaskCache[cleanLabel];

  const text = `${cleanLabel} • `;
  const xmlSafeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const charAdvance = 6.9;
  const tileW = Math.max(64, Math.round(text.length * charAdvance));
  const tileH = 26;
  const halfW = Math.round(tileW / 2);
  const textAttrs = `font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="10" font-weight="800" letter-spacing="0.8" fill="#000"`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}">` +
    `<text x="0" y="10" ${textAttrs}>${xmlSafeText}</text>` +
    `<text x="${-halfW}" y="23" ${textAttrs}>${xmlSafeText}</text>` +
    `<text x="${halfW}" y="23" ${textAttrs}>${xmlSafeText}</text>` +
    `</svg>`;

  const dataUrl = `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
  watermarkMaskCache[cleanLabel] = dataUrl;
  return dataUrl;
}

function applyBankBannerStyling(boxEl, watermarkEl, bankName, tagEl = null) {
  if (!boxEl || !watermarkEl) return;
  const chosen = allBannerThemes.includes(bankName) ? bankName : 'Vault Purple';
  const themeClass = bankThemeMap[chosen] || 'bank-default';
  Object.values(bankThemeMap).forEach(cls => boxEl.classList.remove(cls));
  boxEl.classList.add(themeClass);
  watermarkEl.textContent = '';
  watermarkEl.style.setProperty('--wm-mask', getWatermarkMaskUrl(chosen));
  if (tagEl) tagEl.innerText = chosen.toUpperCase();
}

function hashPasswordLocal(pw) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const s = String(pw);
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

let accountsDB = safeParseJSON(safeGetStorage('spikey_accounts'), {});
let currentUser = safeGetStorage('spikey_user', null);
let userBalance = parseFloat(safeGetStorage('spikey_balance', '0')) || 0.00;
let cartItems = safeParseJSON(safeGetStorage('spikey_cart'), []);
let ownerLogs = safeParseJSON(safeGetStorage('spikey_owner_logs'), []);
let bannedOperators = safeParseJSON(safeGetStorage('spikey_banned'), []);
let purchasedCardIds = safeParseJSON(safeGetStorage('spikey_purchased_card_ids'), []);

let visitorIP = safeGetStorage('spikey_visitor_ip', null);
if (!visitorIP) {
  visitorIP = `192.168.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  safeSetStorage('spikey_visitor_ip', visitorIP);
}
let claimedBonusIPs = safeParseJSON(safeGetStorage('spikey_claimed_bonus_ips'), []);

(function migrateLegacySession() {
  if (currentUser) {
    const key = currentUser.toLowerCase();
    if (!accountsDB[key]) {
      accountsDB[key] = {
        username: currentUser,
        displayName: currentUser,
        passwordHash: '',
        bio: 'Vault operator & card collector.',
        email: currentUser.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com',
        pfpType: 'letter',
        pfpValue: '',
        bannerBank: 'Bank of America',
        balance: userBalance,
        joinedAt: new Date().toLocaleDateString()
      };
      safeSetStorage('spikey_accounts', JSON.stringify(accountsDB));
    } else {
      userBalance = typeof accountsDB[key].balance === 'number' ? accountsDB[key].balance : userBalance;
    }
  }
})();

function getActiveAccount() {
  if (!currentUser) return null;
  const key = currentUser.toLowerCase();
  return accountsDB[key] || null;
}

function getDisplayAvatarInnerHTML(acc, fallbackName = 'G') {
  if (acc && acc.pfpType === 'upload' && acc.pfpValue) {
    return `<img src="${acc.pfpValue}" alt="PFP">`;
  }
  if (acc && acc.pfpType === 'preset' && acc.pfpValue) {
    return escapeHTML(acc.pfpValue);
  }
  const label = (acc && acc.displayName) ? acc.displayName : fallbackName;
  return escapeHTML(label.charAt(0).toUpperCase());
}

let newsList = safeParseJSON(safeGetStorage('spikey_news'), [
  {
    title: "Global Card Deletion & Verified Balance Checker Live",
    content: "Purchased cards are now permanently deleted for all users in real-time. Use the verified balance checker to verify card balances.",
    time: "Pinned"
  },
  {
    title: "Sidebar Quick Deposit & Secure Owner Panel",
    content: "Sidebar deposits allow instantaneous top-ups logged directly to the secure owner board.",
    time: "Today"
  }
]);

let discordMessages = safeParseJSON(safeGetStorage('spikey_discord_msgs'), {
  '#general-lobby': [
    { username: 'sp1k3y', user: 'Sp1k3y', pfp: 'S', pfpType: 'letter', pfpValue: '', time: '12:00 PM', text: 'Welcome to the Chat Room! Cards deleted globally upon purchase.' },
    { username: 'cyberghost', user: 'CyberGhost', pfp: 'C', pfpType: 'letter', pfpValue: '', time: '12:04 PM', text: 'Sidebar quick deposit is super fast with 0 lag.' }
  ],
  '#vault-drops': [
    { username: 'vaultbot', user: 'VaultBot', pfp: 'V', pfpType: 'letter', pfpValue: '', time: '11:30 AM', text: 'Vault Restock: 240 verified cards available.' }
  ],
  '#high-rollers': [
    { username: 'whalex', user: 'WhaleX', pfp: 'W', pfpType: 'letter', pfpValue: '', time: '10:15 AM', text: 'Fair arcade demo games running smoothly.' }
  ],
  '#events': [
    { username: 'vaultbot', user: 'VaultBot', pfp: 'V', pfpType: 'letter', pfpValue: '', time: '9:30 AM', text: 'Vault Event: Double rewards on arcade wins active today!' }
  ],
  '#support': [
    { username: 'modsupport', user: 'ModSupport', pfp: 'M', pfpType: 'letter', pfpValue: '', time: '9:00 AM', text: 'Need assistance? Drop a message here.' }
  ]
});

function saveState() {
  const acc = getActiveAccount();
  if (acc) {
    acc.balance = Number(userBalance.toFixed(2));
    accountsDB[currentUser.toLowerCase()] = acc;
  }
  safeSetStorage('spikey_accounts', JSON.stringify(accountsDB));
  safeSetStorage('spikey_balance', userBalance.toFixed(2));
  if (currentUser) safeSetStorage('spikey_user', currentUser);
  else safeRemoveStorage('spikey_user');
  safeSetStorage('spikey_cart', JSON.stringify(cartItems));
  safeSetStorage('spikey_owner_logs', JSON.stringify(ownerLogs));
  safeSetStorage('spikey_news', JSON.stringify(newsList));
  safeSetStorage('spikey_discord_msgs', JSON.stringify(discordMessages));
  safeSetStorage('spikey_claimed_bonus_ips', JSON.stringify(claimedBonusIPs));
  safeSetStorage('spikey_purchased_card_ids', JSON.stringify(purchasedCardIds));
}

function updateWalletDisplay() {
  const formattedBal = formatMoney(userBalance);
  document.getElementById('userWalletBalance').innerText = formattedBal;
  const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cartBadgeCount').innerText = totalCount;
  const modalBal = document.getElementById('modalWalletBalanceText');
  if (modalBal) modalBal.innerText = formattedBal;
  const profileBal = document.getElementById('viewProfileWallet');
  if (profileBal) profileBal.innerText = formattedBal;
  if (typeof syncWalletAddressUI === 'function') syncWalletAddressUI();
  saveState();
}

function syncAuthUI() {
  const acc = getActiveAccount();
  const pfpEl = document.getElementById('userPfpDisplay');
  const nameEl = document.getElementById('userAuthName');
  const handleEl = document.getElementById('userAuthHandle');
  const bioEl = document.getElementById('userAuthBio');
  const actionEl = document.getElementById('authActionText');
  const sidebarBannerBox = document.getElementById('sidebarBannerBox');
  const sidebarBannerWm = document.getElementById('sidebarBannerWatermark');
  const headerPfp = document.getElementById('headerPfpDisplay');
  const headerName = document.getElementById('headerNameDisplay');

  if (acc) {
    const dispName = acc.displayName || acc.username;
    const avatarHTML = getDisplayAvatarInnerHTML(acc, dispName);
    pfpEl.innerHTML = avatarHTML;
    headerPfp.innerHTML = avatarHTML;
    headerName.innerText = dispName;
    nameEl.innerText = dispName;
    handleEl.innerText = `@${acc.username}`;

    const statusPrefix = (acc.customStatus && acc.customStatus.trim()) ? `${acc.customStatus.trim()}${acc.bio && acc.bio.trim() ? ' · ' : ''}` : '';
    const combinedSnippet = statusPrefix + (acc.bio ? acc.bio.trim() : '');
    if (combinedSnippet) {
      bioEl.style.display = '-webkit-box';
      bioEl.innerText = combinedSnippet;
    } else {
      bioEl.style.display = 'none';
    }

    actionEl.innerText = 'Edit Profile';
    actionEl.onclick = (e) => {
      e.stopPropagation();
      openProfileModal('edit');
    };
    applyBankBannerStyling(sidebarBannerBox, sidebarBannerWm, acc.bannerBank || 'Bank of America');
  } else {
    pfpEl.innerText = 'G';
    headerPfp.innerText = 'G';
    headerName.innerText = 'Sign In';
    nameEl.innerText = 'Guest';
    handleEl.innerText = '@guest · Click to sign in';
    bioEl.style.display = 'none';
    actionEl.innerText = 'Sign Up / Log In';
    actionEl.onclick = (e) => {
      e.stopPropagation();
      openAuthModal();
    };
    applyBankBannerStyling(sidebarBannerBox, sidebarBannerWm, 'Vault Purple');
  }
}
syncAuthUI();

function handleSidebarProfileClick() {
  if (getActiveAccount()) openProfileModal('view');
  else openAuthModal();
}

let authMode = 'signup';
function openAuthModal() {
  renderSavedAccountChips();
  document.getElementById('authModal').style.display = 'flex';
}
function closeAuthModal() { document.getElementById('authModal').style.display = 'none'; }

function renderSavedAccountChips() {
  const box = document.getElementById('savedAccountsQuickBox');
  const chipsWrap = document.getElementById('savedAccountsChips');
  const keys = Object.keys(accountsDB);
  if (!keys.length) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';
  const lastUser = (safeGetStorage('spikey_last_user', '') || '').toLowerCase();
  chipsWrap.innerHTML = keys.map(k => {
    const a = accountsDB[k];
    const disp = a.displayName || a.username;
    const isLast = k === lastUser;
    return `
      <button type="button" class="receipt-copy-btn" style="padding:5px 9px; font-size:10px; display:inline-flex; align-items:center; gap:5px; ${isLast ? 'border-color:#10b981; background:rgba(16,185,129,0.28);' : ''}" onclick="quickSignInSavedAccount('${escapeHTML(a.username)}')" title="1-Click Sign In">
        <span>${escapeHTML(disp)}</span>
        <span style="opacity:0.8;">(@${escapeHTML(a.username)})${isLast ? ' · Last Used' : ''}</span>
      </button>
    `;
  }).join('');
}

function prefillLoginAccount(username) {
  switchAuthMode('login', document.getElementById('tabAuthLogin'));
  document.getElementById('authUsernameInput').value = username;
  document.getElementById('authPasswordInput').focus();
}

function switchAuthMode(mode, el) {
  authMode = mode;
  document.getElementById('tabAuthSignup').classList.remove('active');
  document.getElementById('tabAuthLogin').classList.remove('active');
  el.classList.add('active');

  const dispGroup = document.getElementById('authDisplayNameGroup');
  const bannerGroup = document.getElementById('authStarterBannerGroup');

  if (mode === 'signup') {
    document.getElementById('authModalTitle').innerText = 'Create Account';
    document.getElementById('authModalSubtitle').innerText = 'Create your profile with a $15.00 welcome bonus and custom bank watermark banner.';
    document.getElementById('authSubmitBtn').innerText = 'Create Account & Claim $15';
    dispGroup.style.display = 'block';
    bannerGroup.style.display = 'block';
  } else {
    document.getElementById('authModalTitle').innerText = 'Welcome Back';
    document.getElementById('authModalSubtitle').innerText = 'Sign in to restore your saved wallet balance, PFP, bio, and banner.';
    document.getElementById('authSubmitBtn').innerText = 'Log In';
    dispGroup.style.display = 'none';
    bannerGroup.style.display = 'none';
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const rawUsername = document.getElementById('authUsernameInput').value.trim();
  const password = document.getElementById('authPasswordInput').value;
  if (!rawUsername || !password) return;

  const key = rawUsername.toLowerCase();
  if (bannedOperators.includes(key)) {
    showToast('Access Denied: This operator account has been banned from the vault.', '!');
    return;
  }

  if (authMode === 'signup') {
    if (accountsDB[key]) {
      showToast('Username already exists — switched to Log In', '!');
      switchAuthMode('login', document.getElementById('tabAuthLogin'));
      return;
    }

    const displayNameInput = document.getElementById('authDisplayNameInput').value.trim();
    const chosenBanner = document.getElementById('authBannerSelect').value || 'Bank of America';

    const alreadyClaimed = claimedBonusIPs.includes(visitorIP);
    const startingBalance = alreadyClaimed ? 0.00 : 15.00;

    if (!alreadyClaimed) {
      claimedBonusIPs.push(visitorIP);
      safeSetStorage('spikey_claimed_bonus_ips', JSON.stringify(claimedBonusIPs));
    }

    accountsDB[key] = {
      username: rawUsername,
      displayName: displayNameInput || rawUsername,
      passwordHash: hashPasswordLocal(password),
      bio: 'Vault operator & card collector.',
      email: rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com',
      pfpType: 'letter',
      pfpValue: '',
      bannerBank: chosenBanner,
      balance: startingBalance,
      joinedAt: new Date().toLocaleDateString()
    };

    const rememberMe = document.getElementById('authRememberMe')?.checked !== false;

    currentUser = rawUsername;
    userBalance = startingBalance;
    document.getElementById('authPasswordInput').value = '';
    if (rememberMe) {
      safeSetStorage('spikey_user', currentUser);
      safeSetStorage('spikey_remember', '1');
    } else {
      safeRemoveStorage('spikey_user');
      safeRemoveStorage('spikey_remember');
    }
    saveState();
    syncAuthUI();
    updateWalletDisplay();
    renderDiscordMessages();
    closeAuthModal();

    if (alreadyClaimed) {
      showToast(`Welcome ${accountsDB[key].displayName}! Account created ($0.00 bonus - IP limit).`);
    } else {
      showToast(`Welcome ${accountsDB[key].displayName}! $15.00 bonus added.`);
    }
  } else {
    const existing = accountsDB[key];
    if (!existing) {
      showToast('Account not found — create an account first', '!');
      return;
    }
    if (existing.passwordHash && existing.passwordHash !== hashPasswordLocal(password)) {
      showToast('Incorrect password for this account', '!');
      return;
    }
    if (!existing.passwordHash) {
      existing.passwordHash = hashPasswordLocal(password);
    }

    const rememberMe = document.getElementById('authRememberMe')?.checked !== false;

    currentUser = existing.username;
    userBalance = typeof existing.balance === 'number' ? existing.balance : 0.00;
    document.getElementById('authPasswordInput').value = '';
    if (rememberMe) {
      safeSetStorage('spikey_user', currentUser);
      safeSetStorage('spikey_remember', '1');
    } else {
      // Session-only: still keep in memory but clear persistent key on unload isn't needed;
      // just don't write the long-term remember flag.
      safeSetStorage('spikey_user', currentUser); // keep working for this session
      safeRemoveStorage('spikey_remember');
    }
    saveState();
    syncAuthUI();
    updateWalletDisplay();
    renderDiscordMessages();
    closeAuthModal();
    showToast(`Welcome back, ${existing.displayName || existing.username}!`);
  }
}

function handleLogout() {
  saveState();
  if (currentUser) {
    safeSetStorage('spikey_last_user', currentUser);
  }
  currentUser = null;
  userBalance = parseFloat(safeGetStorage('spikey_guest_balance', '0')) || 0.00;
  safeRemoveStorage('spikey_user');
  safeRemoveStorage('spikey_remember');
  syncAuthUI();
  updateWalletDisplay();
  renderDiscordMessages();
  closeProfileModal();
  showToast('Signed out — your saved profile is remembered for 1-click sign-in');
}

function quickSignInSavedAccount(username) {
  const key = (username || '').toLowerCase();
  const existing = accountsDB[key];
  if (!existing) {
    prefillLoginAccount(username);
    return;
  }
  if (bannedOperators.includes(key)) {
    showToast('Access Denied: This operator account has been banned.', '!');
    return;
  }
  currentUser = existing.username;
  userBalance = typeof existing.balance === 'number' ? existing.balance : 0.00;
  safeSetStorage('spikey_user', currentUser);
  safeSetStorage('spikey_remember', '1');
  saveState();
  syncAuthUI();
  updateWalletDisplay();
  renderDiscordMessages();
  closeAuthModal();
  showToast(`Welcome back, ${existing.displayName || existing.username}!`);
}

let draftPfpType = 'letter';
let draftPfpValue = '';
let draftBannerBank = 'Bank of America';

function buildBannerChoiceGrid() {
  const grid = document.getElementById('bannerChoiceGrid');
  if (!grid) return;
  grid.innerHTML = allBannerThemes.map(bank => {
    const cls = bankThemeMap[bank] || 'bank-default';
    return `
      <button type="button" class="banner-choice-btn ${cls}" data-banner-bank="${escapeHTML(bank)}" onclick="selectProfileBanner('${escapeHTML(bank)}')">
        <div class="cc-watermark" style="--wm-mask: ${getWatermarkMaskUrl(bank)};" aria-hidden="true"></div>
        <span style="position:relative; z-index:3;">${escapeHTML(bank)}</span>
      </button>
    `;
  }).join('');
}
buildBannerChoiceGrid();

function openProfileModal(initialTab = 'view', inspectedProfile = null) {
  const switchBar = document.getElementById('profileModeSwitchBar');
  const ownerActions = document.getElementById('viewProfileOwnerActions');

  if (inspectedProfile) {
    switchBar.style.display = 'none';
    ownerActions.style.display = 'none';
    renderProfileViewCard(inspectedProfile, false);
    document.getElementById('profileViewSection').style.display = 'block';
    document.getElementById('profileEditSection').style.display = 'none';
    document.getElementById('profileModal').style.display = 'flex';
    return;
  }

  const acc = getActiveAccount();
  if (!acc) {
    openAuthModal();
    return;
  }

  switchBar.style.display = 'flex';
  ownerActions.style.display = 'flex';
  renderProfileViewCard(acc, true);
  populateEditProfileForm(acc);
  switchProfileModalTab(initialTab);
  document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; }

function switchProfileModalTab(tab) {
  const viewTabBtn = document.getElementById('tabProfileView');
  const editTabBtn = document.getElementById('tabProfileEdit');
  const viewSec = document.getElementById('profileViewSection');
  const editSec = document.getElementById('profileEditSection');

  if (tab === 'edit') {
    viewTabBtn.classList.remove('active');
    editTabBtn.classList.add('active');
    viewSec.style.display = 'none';
    editSec.style.display = 'flex';
  } else {
    editTabBtn.classList.remove('active');
    viewTabBtn.classList.add('active');
    editSec.style.display = 'none';
    viewSec.style.display = 'block';
  }
}

function renderProfileViewCard(profileObj, isSelf = true) {
  const dispName = profileObj.displayName || profileObj.username || 'Operator';
  const username = profileObj.username || dispName.toLowerCase().replace(/\s+/g, '');
  const bannerBank = profileObj.bannerBank || 'Bank of America';

  applyBankBannerStyling(
    document.getElementById('viewProfileBannerBox'),
    document.getElementById('viewProfileBannerWatermark'),
    bannerBank,
    document.getElementById('viewProfileBannerTag')
  );

  document.getElementById('viewProfileAvatar').innerHTML = getDisplayAvatarInnerHTML(profileObj, dispName);
  document.getElementById('viewProfileDisplayName').innerText = dispName;
  document.getElementById('viewProfileUsername').innerText = `@${username}`;
  const statusEl = document.getElementById('viewProfileCustomStatus');
  if (statusEl) {
    if (profileObj.customStatus && profileObj.customStatus.trim()) {
      statusEl.style.display = 'block';
      statusEl.innerText = profileObj.customStatus.trim();
    } else {
      statusEl.style.display = 'none';
    }
  }
  document.getElementById('viewProfileBio').innerText = (profileObj.bio && profileObj.bio.trim()) ? profileObj.bio : 'No bio set yet.';
  document.getElementById('viewProfileWallet').innerText = isSelf ? formatMoney(userBalance) : formatMoney(profileObj.balance || 0);
  document.getElementById('viewProfileJoined').innerText = profileObj.joinedAt || 'Verified Member';
  document.getElementById('viewProfileStatusBadge').innerText = isSelf ? '● ONLINE (YOU)' : '● VAULT MEMBER';
}

function populateEditProfileForm(acc) {
  document.getElementById('editDisplayNameInput').value = acc.displayName || acc.username;
  document.getElementById('editCustomStatusInput').value = acc.customStatus || '';
  document.getElementById('editEmailInput').value = acc.email || '';
  document.getElementById('editBioInput').value = acc.bio || '';
  updateBioCounter();

  draftPfpType = acc.pfpType || 'letter';
  draftPfpValue = acc.pfpValue || '';
  draftBannerBank = acc.bannerBank || 'Bank of America';

  document.querySelectorAll('#pfpPresetGrid .pfp-preset-btn').forEach(btn => {
    const t = btn.getAttribute('data-pfp-type');
    const v = btn.getAttribute('data-pfp-val');
    const isMatch = (draftPfpType === 'letter' && t === 'letter') || (draftPfpType === 'preset' && draftPfpValue === v);
    btn.classList.toggle('active', isMatch);
  });

  selectProfileBanner(draftBannerBank);
  syncEditProfilePreview();
}

function updateBioCounter() {
  const val = document.getElementById('editBioInput').value || '';
  document.getElementById('editBioCharCount').innerText = `${val.length}/160`;
}

function syncEditProfilePreview() {
  const acc = getActiveAccount();
  const typedName = document.getElementById('editDisplayNameInput').value.trim() || (acc ? acc.username : 'Operator');
  document.getElementById('editPreviewNameText').innerText = typedName;
  document.getElementById('editPreviewHandleText').innerText = acc ? `@${acc.username}` : '@operator';

  const tempAcc = { displayName: typedName, pfpType: draftPfpType, pfpValue: draftPfpValue };
  document.getElementById('editPreviewAvatar').innerHTML = getDisplayAvatarInnerHTML(tempAcc, typedName);
}

function selectPresetPfp(type, val, btnEl) {
  draftPfpType = type;
  draftPfpValue = type === 'letter' ? '' : val;
  document.querySelectorAll('#pfpPresetGrid .pfp-preset-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  syncEditProfilePreview();
}

function handlePfpFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', '!');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(loadEvent) {
    const img = new Image();
    img.onload = function() {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      draftPfpType = 'upload';
      draftPfpValue = canvas.toDataURL('image/jpeg', 0.84);
      document.querySelectorAll('#pfpPresetGrid .pfp-preset-btn').forEach(b => b.classList.remove('active'));
      syncEditProfilePreview();
      showToast('Custom PFP loaded! Click Save Profile Info to apply.');
    };
    img.src = loadEvent.target.result;
  };
  reader.readAsDataURL(file);
}

function selectProfileBanner(bankName) {
  draftBannerBank = bankName;
  document.querySelectorAll('#bannerChoiceGrid .banner-choice-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-banner-bank') === bankName);
  });
  applyBankBannerStyling(
    document.getElementById('editPreviewBannerBox'),
    document.getElementById('editPreviewBannerWatermark'),
    bankName,
    document.getElementById('editPreviewBannerTag')
  );
}

function saveProfileChanges(e) {
  e.preventDefault();
  const acc = getActiveAccount();
  if (!acc) return;

  const newDisplayName = document.getElementById('editDisplayNameInput').value.trim() || acc.username;
  const newCustomStatus = document.getElementById('editCustomStatusInput').value.trim();
  const newEmail = document.getElementById('editEmailInput').value.trim();
  const newBio = document.getElementById('editBioInput').value.trim();

  acc.displayName = newDisplayName;
  acc.customStatus = newCustomStatus;
  acc.email = newEmail;
  acc.bio = newBio;
  acc.pfpType = draftPfpType;
  acc.pfpValue = draftPfpValue;
  acc.bannerBank = draftBannerBank;

  accountsDB[currentUser.toLowerCase()] = acc;
  saveState();
  syncAuthUI();
  renderDiscordMessages();
  renderProfileViewCard(acc, true);
  switchProfileModalTab('view');
  showToast('Profile, PFP, bio & bank banner saved!');
}

function inspectChatMember(usernameKey, fallbackName) {
  const key = (usernameKey || '').toLowerCase();
  if (currentUser && key === currentUser.toLowerCase()) {
    openProfileModal('view');
    return;
  }
  const found = accountsDB[key];
  if (found) {
    openProfileModal('view', found);
    return;
  }
  const builtInProfiles = {
    sp1k3y: { username: 'sp1k3y', displayName: 'Sp1k3y', bio: 'Founder of Sp1k3y’s Vault.', bannerBank: 'Wells Fargo', pfpType: 'preset', pfpValue: '👑', balance: 25000, joinedAt: 'Founder' },
    cyberghost: { username: 'cyberghost', displayName: 'CyberGhost', bio: 'Collecting verified cards.', bannerBank: 'Bank of America', pfpType: 'letter', pfpValue: '', balance: 1200, joinedAt: 'Member' },
    vaultbot: { username: 'vaultbot', displayName: 'VaultBot', bio: 'Automated drop service.', bannerBank: 'Chase Bank', pfpType: 'preset', pfpValue: '🛡️', balance: 0, joinedAt: 'System Bot' },
    whalex: { username: 'whalex', displayName: 'WhaleX', bio: 'High-roller tier collector.', bannerBank: 'American Express', pfpType: 'preset', pfpValue: '💎', balance: 950, joinedAt: 'High Roller' },
    modsupport: { username: 'modsupport', displayName: 'ModSupport', bio: 'Official vault support.', bannerBank: 'Citibank', pfpType: 'preset', pfpValue: '⚡', balance: 0, joinedAt: 'Staff' }
  };
  const profile = builtInProfiles[key] || {
    username: key || 'member',
    displayName: fallbackName || 'Member',
    bio: 'Vault community member.',
    bannerBank: 'Vault Purple',
    pfpType: 'letter',
    pfpValue: '',
    balance: 0,
    joinedAt: 'Member'
  };
  openProfileModal('view', profile);
}

// ─── Add Funds (card-validated deposits) ───────────────────────────────
function openAddFundsModal() {
  document.getElementById('addFundsModal').style.display = 'flex';
  document.getElementById('addFundsStatus').innerText = '';
  document.getElementById('addFundsCardNum').value = '';
  document.getElementById('addFundsExp').value = '';
  document.getElementById('addFundsCvv').value = '';
  document.getElementById('addFundsAmount').value = '';
}
function closeAddFundsModal() {
  document.getElementById('addFundsModal').style.display = 'none';
}

function formatAddFundsCard() {
  const input = document.getElementById('addFundsCardNum');
  const digits = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = digits.replace(/(.{4})/g, '$1 ').trim();
}

function isObviouslyFakeCard(digits) {
  // Reject obvious test/fake patterns
  if (/^(\d)\1{15}$/.test(digits)) return true;          // all same digit
  if (/^1234|0000|1111|9999/.test(digits)) return true;
  if (digits === '4111111111111111') return true;         // classic test Visa
  if (digits === '4242424242424242') return true;
  if (digits.startsWith('0000') || digits.endsWith('0000')) return true;
  return false;
}

function validateCardForFunds(cardNum, exp, cvv) {
  const clean = cardNum.replace(/\s+/g, '');
  if (!/^\d{15,19}$/.test(clean)) {
    return { ok: false, msg: 'Card number must be 15–19 digits' };
  }
  if (isKnownFakeOrBurner(clean)) {
    return { ok: false, msg: 'Rejected: VCC generator, test, or burner card pattern' };
  }
  if (!computeLuhn(clean)) {
    return { ok: false, msg: 'Invalid card (failed Luhn checksum)' };
  }
  const bin4 = clean.slice(0, 4);
  if (!VALID_GIFT_BINS.includes(bin4)) {
    return { ok: false, msg: `Unrecognized or virtual BIN (${bin4})` };
  }
  if (new Set(clean).size < 6) {
    return { ok: false, msg: 'Card failed entropy verification' };
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2,4}$/.test(exp)) {
    return { ok: false, msg: 'Expiry must be MM/YY' };
  }
  const [mm, yyRaw] = exp.split('/').map(Number);
  const yy = yyRaw < 100 ? 2000 + yyRaw : yyRaw;
  const now = new Date();
  const expDate = new Date(yy, mm);
  if (expDate < now) return { ok: false, msg: 'Card is expired' };
  if (!/^\d{3,4}$/.test(cvv) || /^(\d)\1+$/.test(cvv) || cvv === '123' || cvv === '1234') {
    return { ok: false, msg: 'Invalid CVV security code' };
  }
  return { ok: true, msg: 'Card verified' };
}

function submitAddFunds() {
  const cardNum = document.getElementById('addFundsCardNum').value.trim();
  const exp = document.getElementById('addFundsExp').value.trim();
  const cvv = document.getElementById('addFundsCvv').value.trim();
  const amt = parseFloat(document.getElementById('addFundsAmount').value);
  const statusEl = document.getElementById('addFundsStatus');

  if (isNaN(amt) || amt < 1) {
    statusEl.style.color = '#ef4444';
    statusEl.innerText = 'Enter a valid amount (minimum $1)';
    return;
  }
  // Allow very high amounts once the card is real ("inf money")
  if (amt > 5000000) {
    statusEl.style.color = '#ef4444';
    statusEl.innerText = 'Amount too large (max $5,000,000 per add)';
    return;
  }

  const result = validateCardForFunds(cardNum, exp, cvv);
  if (!result.ok) {
    statusEl.style.color = '#ef4444';
    statusEl.innerText = result.msg;
    showToast(result.msg, '!');
    return;
  }

  // Success — add funds
  userBalance += amt;
  updateWalletDisplay();
  saveState();

  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
  const acc = getActiveAccount();
  const userName = acc ? (acc.displayName || acc.username) : (currentUser || 'Guest');
  const last4 = cardNum.replace(/\s+/g, '').slice(-4);

  ownerLogs.unshift({
    time: timeNow,
    email: userName + ' (Add Funds Verified)',
    paymentMethod: 'card_deposit',
    cardDispatched: `+${formatMoney(amt)}`,
    giftCardNum: '**** **** **** ' + last4,
    giftCardExp: exp,
    giftCardCvv: '***',
    itemsSummary: 'Validated Card Deposit',
    details: `Card-validated deposit of ${formatMoney(amt)}. Luhn + BIN + expiry passed. Last4: ${last4}`
  });
  saveState();

  statusEl.style.color = '#10b981';
  statusEl.innerText = `Success! ${formatMoney(amt)} added to wallet.`;
  showToast(`${formatMoney(amt)} added via verified card!`);
  setTimeout(() => closeAddFundsModal(), 900);
}


// Balance Checker feature
function runBalanceCheck() {
  const input = document.getElementById('checkerCardInput').value.trim();
  const resultBox = document.getElementById('checkerResultBox');
  const resultText = document.getElementById('checkerResultText');

  if (!input) {
    showToast('Enter a card number to check', '!');
    return;
  }

  const cleanNum = input.replace(/\s+/g, '');
  const matchedCard = catalogCards.find(c => c.fullNum.replace(/\s+/g, '') === cleanNum || c.last4 === cleanNum);

  resultBox.style.display = 'block';

  if (!matchedCard || purchasedCardIds.includes(matchedCard.id)) {
    resultText.style.color = '#ef4444';
    resultText.innerText = 'Card has no money try a new one';
  } else {
    resultText.style.color = '#10b981';
    resultText.innerText = `Verified Balance: ${formatMoney(matchedCard.cardValue)} (${matchedCard.bank} - Active)`;
  }
}

let activePaymentMethod = 'gift';

function openCartModal() {
  resetCheckoutView();
  document.getElementById('cartModal').style.display = 'flex';
  renderCartModalContents();
  updateCartCardPreview();
}
function closeCartModal() { document.getElementById('cartModal').style.display = 'none'; }

function resetCheckoutView() {
  document.getElementById('checkoutFormSection').style.display = 'block';
  document.getElementById('checkoutReceiptSection').style.display = 'none';
}

function switchPaymentMethod(method, el) {
  activePaymentMethod = method;
  document.getElementById('payMethodGift').classList.remove('active');
  document.getElementById('payMethodBalance').classList.remove('active');
  el.classList.add('active');

  const cardInputs = document.getElementById('cardInputsGroup');
  const walletNotice = document.getElementById('walletPayNotice');
  const previewWrap = document.getElementById('previewCardWrapper');
  const numInput = document.getElementById('checkoutCardNum');
  const expInput = document.getElementById('checkoutCardExp');
  const cvvInput = document.getElementById('checkoutCardCvv');

  if (method === 'balance') {
    cardInputs.style.display = 'none';
    previewWrap.style.display = 'none';
    walletNotice.style.display = 'block';
    numInput.required = false;
    expInput.required = false;
    cvvInput.required = false;
    updateWalletDisplay();
  } else {
    cardInputs.style.display = 'flex';
    previewWrap.style.display = 'flex';
    walletNotice.style.display = 'none';
    numInput.required = true;
    expInput.required = true;
    cvvInput.required = true;
    document.getElementById('payInputLabel').innerText = 'GIFT CARD NUMBER';
    numInput.placeholder = '6011 0000 1234 5678';
    updateCartCardPreview();
  }
}

function formatAndPreviewCard() {
  const input = document.getElementById('checkoutCardNum');
  const digits = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = digits.replace(/(.{4})/g, '$1 ').trim();
  updateCartCardPreview();
}

function formatExpInput() {
  const input = document.getElementById('checkoutCardExp');
  const digits = input.value.replace(/\D/g, '').slice(0, 6);
  input.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
  updateCartCardPreview();
}

function updateCartCardPreview() {
  const numVal = document.getElementById('checkoutCardNum').value.trim();
  const expVal = document.getElementById('checkoutCardExp').value.trim();
  const cvvVal = document.getElementById('checkoutCardCvv').value.trim();
  const cleanNum = numVal.replace(/\s+/g, '');

  const box = document.getElementById('previewCardBox');
  const brandEl = document.getElementById('previewCardBrand');
  const wmEl = document.getElementById('previewWatermarkLayer');

  let bankLabel = 'TARGET GIFT';
  box.className = 'cc-card bank-target';
  brandEl.className = 'cc-brand-logo target-logo';
  brandEl.innerText = 'TARGET';

  if (cleanNum.startsWith('4')) {
    bankLabel = 'BANK OF AMERICA';
    box.className = 'cc-card bank-bofa';
    brandEl.className = 'cc-brand-logo visa-logo';
    brandEl.innerText = 'VISA';
  } else if (cleanNum.startsWith('5')) {
    bankLabel = 'CHASE BANK';
    box.className = 'cc-card bank-chase';
    brandEl.className = 'cc-brand-logo mastercard-logo';
    brandEl.innerText = 'MASTERCARD';
  } else if (cleanNum.startsWith('3')) {
    bankLabel = 'AMERICAN EXPRESS';
    box.className = 'cc-card bank-amex';
    brandEl.className = 'cc-brand-logo amex-logo';
    brandEl.innerText = 'AMEX';
  }

  wmEl.textContent = '';
  wmEl.style.setProperty('--wm-mask', getWatermarkMaskUrl(bankLabel));

  if (cleanNum.length > 0) {
    const padded = cleanNum.padEnd(16, '•');
    document.getElementById('previewCardNum').innerText = padded.replace(/(.{4})/g, '$1 ').trim();
  } else {
    document.getElementById('previewCardNum').innerText = '•••• •••• •••• ••••';
  }

  const acc = getActiveAccount();
  const holderName = acc ? (acc.displayName || acc.username) : (currentUser || 'GUEST');
  document.getElementById('previewCardHolder').innerText = holderName.toUpperCase();
  document.getElementById('previewCardExp').innerText = expVal || 'MM/YYYY';
  document.getElementById('previewCardCvv').innerText = cvvVal ? '•'.repeat(cvvVal.length) : '•••';
}

function renderCartModalContents() {
  const container = document.getElementById('cartItemsListContainer');
  if (cartItems.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--muted); font-size:12px; padding:16px;">Your cart is empty. Add cards from the Vault to get started.</div>`;
    document.getElementById('cartTotalPriceDisplay').innerText = '$0.00';
    return;
  }

  let total = 0;
  container.innerHTML = cartItems.map((item, idx) => {
    total += item.price * item.qty;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(167,139,250,0.14); padding:8px 0; font-size:12px; gap:8px;">
        <div style="min-width:0; flex:1;">
          <div style="font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(item.name)}</div>
          <div class="mono" style="color:var(--muted); font-size:10.5px;">${formatMoney(item.price)} ea · Bal: ${formatMoney(item.cardValue)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <button type="button" onclick="changeCartQty(${idx}, -1)" style="width:22px; height:22px; border-radius:6px; border:1px solid var(--line); background:rgba(255,255,255,0.06); color:#fff; font-weight:700;">-</button>
          <span class="mono" style="font-size:11px; min-width:18px; text-align:center;">${item.qty}</span>
          <button type="button" onclick="changeCartQty(${idx}, 1)" style="width:22px; height:22px; border-radius:6px; border:1px solid var(--line); background:rgba(255,255,255,0.06); color:#fff; font-weight:700;">+</button>
          <span class="mono" style="color:#10b981; font-weight:700; min-width:68px; text-align:right;">${formatMoney(item.price * item.qty)}</span>
          <button type="button" onclick="removeFromCart(${idx})" style="background:none; border:none; color:#ef4444; font-weight:700; font-size:15px; padding:0 4px;">&times;</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartTotalPriceDisplay').innerText = formatMoney(total);
  const acc = getActiveAccount();
  if (acc && acc.email && !document.getElementById('checkoutEmail').value) {
    document.getElementById('checkoutEmail').value = acc.email;
  } else if (currentUser && !document.getElementById('checkoutEmail').value) {
    document.getElementById('checkoutEmail').value = currentUser.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com';
  }
}

function addToCart(id, e) {
  if (e) e.stopPropagation();
  if (purchasedCardIds.includes(id)) {
    showToast('This card has already been purchased and deleted globally.', '!');
    return;
  }
  const card = catalogCards.find(c => c.id === id);
  if (!card) return;
  const existing = cartItems.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cartItems.push({ ...card, qty: 1 });
  }
  updateWalletDisplay();
  showToast(`Added ${card.name} (${formatMoney(card.cardValue)} bal) to cart`);
}

function changeCartQty(idx, delta) {
  if (!cartItems[idx]) return;
  cartItems[idx].qty += delta;
  if (cartItems[idx].qty <= 0) {
    cartItems.splice(idx, 1);
  }
  updateWalletDisplay();
  renderCartModalContents();
}

function removeFromCart(idx) {
  cartItems.splice(idx, 1);
  updateWalletDisplay();
  renderCartModalContents();
}

function luhnCheck(num) {
  const digits = num.replace(/\D/g, '').split('').reverse().map(d => parseInt(d, 10));
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

// Known test / burner / fake card patterns (Stripe, PayPal, common generators, sequential, etc.)
const KNOWN_FAKE_PATTERNS = [
  /^4{13,19}$/,
  /^5{13,19}$/,
  /^0{13,19}$/,
  /^1{13,19}$/,
  /^4111111111111111$/,
  /^4242424242424242$/,
  /^4000000000000002$/,
  /^4000000000000000$/,
  /^4012888888881881$/,
  /^4111222233334444$/,
  /^4532015112830366$/,
  /^4556737586899855$/,
  /^4916338506082832$/,
  /^4929199499713163$/,
  /^5555555555554444$/,
  /^5105105105105100$/,
  /^5200828282828210$/,
  /^5425233430109903$/,
  /^2223003122003222$/,
  /^2221000000000009$/,
  /^378282246310005$/,
  /^371449635398431$/,
  /^378734493671000$/,
  /^30569309025904$/,
  /^38520000023237$/,
  /^3530111333300000$/,
  /^3566002020360505$/,
  /^6011111111111117$/,
  /^6011000990139424$/,
  /^6011000000000004$/,
  /^6500000000000001$/,
  /^40000000/,
  /^411111/,
  /^424242/,
  /^453201511/,
  /^555555/,
  /^510510/,
  /^6011000/,
  /^(1234|0000|1111|2222|3333|4444|5555|6666|7777|8888|9999)/,
  /000000$/,
  /123456/,
  /654321/,
  /987654/,
  /(\d)\1{4,}/
];

// Legitimate gift card / prepaid BIN prefixes (Vanilla, OneVanilla, Target, InComm, Blackhawk, Amex Gift, Visa/MC Prepaid)
const VALID_GIFT_BINS = [
  '4030', '4097', '4118', '4147', '4266', '4336', '4358', '4400', '4430', '4511', '4532', '4620', '4737', '4847', '4852', '4912',
  '5113', '5120', '5178', '5217', '5253', '5275', '5312', '5332', '5361', '5432', '5466', '5524', '5581',
  '6011', '6045', '6277', '6361', '6394', '6506',
  '3759', '3779', '3791'
];

// Known public VCC / disposable / virtual test BIN prefixes to reject
const BLOCKED_VCC_BINS = [
  '4000', '4012', '4111', '4242', '4556', '4916', '4929',
  '5105', '5200', '5425', '5555',
  '3782', '3714', '3787', '3056', '3852', '3530', '3566',
  '2221', '2223', '601100'
];

let redeemedGiftCards = safeParseJSON(safeGetStorage('spikey_redeemed_gift_cards'), []);

function hasSequentialRun(cleanNum) {
  let asc = 1, desc = 1;
  for (let i = 1; i < cleanNum.length; i++) {
    const prev = parseInt(cleanNum[i - 1], 10);
    const curr = parseInt(cleanNum[i], 10);
    if (curr === prev + 1) {
      asc++;
      if (asc >= 5) return true;
    } else {
      asc = 1;
    }
    if (curr === prev - 1) {
      desc++;
      if (desc >= 5) return true;
    } else {
      desc = 1;
    }
  }
  return false;
}

function isKnownFakeOrBurner(cleanNum) {
  if (KNOWN_FAKE_PATTERNS.some(re => re.test(cleanNum))) return true;
  if (BLOCKED_VCC_BINS.some(bin => cleanNum.startsWith(bin))) return true;
  if (hasSequentialRun(cleanNum)) return true;
  // Reject repeated 2-digit or 4-digit chunks (e.g., 45454545... or 45324532...)
  if (/^(\d{2})\1{4,}/.test(cleanNum)) return true;
  if (/^(\d{4})\1{2,}/.test(cleanNum)) return true;
  return false;
}

function isValidCardNumber(numStr) {
  const clean = numStr.replace(/\s+/g, '');
  if (!/^\d{15,19}$/.test(clean)) return false;
  if (isKnownFakeOrBurner(clean)) return false;
  return luhnCheck(clean);
}

/**
 * Strict Gift Card & Prepaid Validator used at checkout (and Add Funds).
 * Blocks VCC generators, burner cards, test patterns, low-entropy numbers,
 * non-gift BINs, expired cards, and already-used cards.
 */
function runCheckoutGiftCardCheck(cardNum, exp, cvv, requiredAmount = 0) {
  const clean = cardNum.replace(/\s+/g, '');

  if (!/^\d{15,19}$/.test(clean)) {
    return { ok: false, message: 'Card number must be 15 to 19 digits.' };
  }
  if (isKnownFakeOrBurner(clean)) {
    return { ok: false, message: 'Blocked: Virtual / VCC generator or burner card pattern detected.' };
  }
  if (!luhnCheck(clean)) {
    return { ok: false, message: 'Invalid card number (Luhn checksum verification failed).' };
  }

  // Enforce network length rules (Amex 34/37 = 15 digits; Visa/MC/Discover = 16-19 digits)
  const isAmex = clean.startsWith('34') || clean.startsWith('37');
  if (isAmex && clean.length !== 15) {
    return { ok: false, message: 'Amex gift cards must be exactly 15 digits.' };
  }
  if (!isAmex && (clean.length < 16 || clean.length > 19)) {
    return { ok: false, message: 'Gift card must be 16 to 19 digits.' };
  }

  // Check if card was already burned/redeemed in this vault
  if (redeemedGiftCards.includes(clean)) {
    return { ok: false, message: 'Gift card declined — already redeemed or burned ($0.00 balance).' };
  }

  // Verify issuer BIN against recognized gift/prepaid BIN table
  const bin4 = clean.slice(0, 4);
  if (!VALID_GIFT_BINS.includes(bin4)) {
    return { ok: false, message: `Unsupported BIN (${bin4}) — enter a valid physical gift card.` };
  }

  // Validate Expiration Date (MM/YY or MM/YYYY) and ensure not expired
  const expMatch = exp.match(/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/);
  if (!expMatch) {
    return { ok: false, message: 'Invalid expiration date (use MM/YYYY).' };
  }
  const expMonth = parseInt(expMatch[1], 10);
  let expYear = parseInt(expMatch[2], 10);
  if (expYear < 100) expYear += 2000;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
    return { ok: false, message: 'Gift card is expired.' };
  }
  if (expYear > currentYear + 12) {
    return { ok: false, message: 'Invalid expiration year.' };
  }

  // Validate CVV / Security PIN
  if (isAmex && !/^\d{4}$/.test(cvv)) {
    return { ok: false, message: 'Amex gift cards require a 4-digit CID/CVV.' };
  }
  if (!isAmex && !/^\d{3,4}$/.test(cvv)) {
    return { ok: false, message: 'CVV/PIN must be 3 or 4 digits.' };
  }
  if (/^(\d)\1+$/.test(cvv) || cvv === '123' || cvv === '1234' || cvv === '000' || cvv === '0000') {
    return { ok: false, message: 'Invalid CVV/PIN security code.' };
  }

  // Entropy & generator detection check
  const digitSum = clean.split('').reduce((a, b) => a + parseInt(b, 10), 0);
  const uniqueDigits = new Set(clean).size;
  if (uniqueDigits < 6 || digitSum % 13 === 0) {
    return { ok: false, message: 'Gift card declined — $0.00 balance or inactive card.' };
  }

  // Determine verified balance
  const simulatedBalance = 25 + ((parseInt(clean.slice(-6), 10) % 475) + 1);
  if (requiredAmount > 0 && simulatedBalance < requiredAmount) {
    return { ok: false, message: `Insufficient gift card balance ($${simulatedBalance.toFixed(2)} available, $${requiredAmount.toFixed(2)} required).` };
  }

  return {
    ok: true,
    message: `Verified Gift Card (BIN ${bin4}) · Available: $${simulatedBalance.toFixed(2)}`,
    balance: simulatedBalance
  };
}

function buildRealisticBankFront(bankName, network) {
  let themeClass = 'real-front-chase';
  let titleHTML = `<span style="font-weight:800; letter-spacing:1.1px; font-size:12px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">${escapeHTML(bankName.toUpperCase())}</span>`;
  let artworkSVG = '';

  if (bankName === 'Wells Fargo') {
    themeClass = 'real-front-wellsfargo';
    titleHTML = `<span style="font-family:Georgia,serif; font-weight:800; letter-spacing:1.4px; font-size:12.5px; color:#fef08a; text-shadow:0 1px 3px rgba(0,0,0,0.65);">WELLS FARGO</span>`;
    artworkSVG = `
      <svg viewBox="0 0 320 140" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.88;">
        <ellipse cx="160" cy="118" rx="135" ry="7" fill="rgba(0,0,0,0.35)"/>
        <g fill="#fde68a" stroke="#78350f" stroke-width="1">
          <path d="M36 52 L92 52 L98 78 L88 92 L40 92 L30 78 Z"/>
          <rect x="44" y="58" width="16" height="14" rx="2" fill="#7f1d1d"/>
          <rect x="66" y="58" width="16" height="14" rx="2" fill="#7f1d1d"/>
          <rect x="34" y="47" width="60" height="5" rx="2"/>
          <circle cx="94" cy="41" r="4.5"/>
          <path d="M87 38 H101 L98 34 H90 Z"/>
          <path d="M88 46 L101 46 L103 55 L88 55 Z"/>
          <path d="M101 48 Q125 32 148 38" stroke="#fde68a" stroke-width="1.3" fill="none"/>
          <circle cx="48" cy="98" r="15" fill="none" stroke="#fde68a" stroke-width="3"/>
          <circle cx="48" cy="98" r="4"/>
          <path d="M48 83 V113 M33 98 H63 M37 87 L59 109 M59 87 L37 109" stroke="#fde68a" stroke-width="1.4"/>
          <circle cx="86" cy="101" r="12" fill="none" stroke="#fde68a" stroke-width="2.8"/>
          <circle cx="86" cy="101" r="3.5"/>
          <path d="M86 89 V113 M74 101 H98 M77 92 L95 110 M95 92 L77 110" stroke="#fde68a" stroke-width="1.3"/>
        </g>
        <path d="M101 50 L145 66 M101 52 L212 63" stroke="#fcd34d" stroke-width="1" opacity="0.85"/>
        <g fill="#fde68a">
          <path d="M132 76 Q148 68 168 72 L180 60 L190 64 L183 76 L194 94 L189 96 L178 82 L166 84 L172 108 L166 109 L158 86 L142 86 L136 109 L130 108 L135 86 L122 96 L119 92 Z"/>
          <path d="M144 72 Q160 64 179 68 L191 56 L201 60 L194 72 L205 90 L200 92 L189 78 L177 80 L183 104 L177 105 L169 82 L153 82 L147 105 L141 104 Z" opacity="0.72"/>
        </g>
        <g fill="#fde68a">
          <path d="M210 73 Q227 65 247 69 L259 56 L270 61 L262 74 L276 92 L270 95 L257 80 L245 82 L252 107 L246 108 L237 84 L220 84 L214 108 L208 107 L213 84 L200 94 L197 90 Z"/>
          <path d="M223 69 Q239 61 259 65 L271 52 L282 57 L274 70 L288 88 L282 91 L269 76 L257 78 L264 103 L258 104 L249 80 L232 80 L226 104 L220 103 Z" opacity="0.72"/>
        </g>
      </svg>
    `;
  } else if (bankName === 'Bank of America') {
    themeClass = 'real-front-bofa';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.9px; font-size:11px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">BANK OF AMERICA</span>`;
    artworkSVG = `
      <svg viewBox="0 0 220 110" width="175" height="88" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M35 66 Q72 48 110 62 T185 52" stroke="#ef4444" stroke-width="9" stroke-linecap="round"/>
        <path d="M30 50 Q68 32 106 46 T180 36" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
        <path d="M42 82 Q78 64 116 78 T188 68" stroke="#3b82f6" stroke-width="9" stroke-linecap="round"/>
        <path d="M62 34 Q95 20 128 32 T174 24" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
      </svg>
    `;
  } else if (bankName === 'Chase Bank') {
    themeClass = 'real-front-chase';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.8px; font-size:13px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">CHASE</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="76" height="76" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M44 16 H76 L84 24 V44 H44 Z" fill="#60a5fa"/>
        <path d="M104 44 V76 L96 84 H76 V44 Z" fill="#3b82f6"/>
        <path d="M76 104 H44 L36 96 V76 H76 Z" fill="#93c5fd"/>
        <path d="M16 76 V44 L24 36 H44 V76 Z" fill="#2563eb"/>
      </svg>
    `;
  } else if (bankName === 'Citibank') {
    themeClass = 'real-front-citi';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.8px; font-size:13px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">citibank</span>`;
    artworkSVG = `
      <svg viewBox="0 0 180 100" width="130" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.88;">
        <path d="M58 34 Q90 8 122 34" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
        <text x="90" y="70" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="38">citi</text>
      </svg>
    `;
  } else if (bankName === 'U.S. Bank') {
    themeClass = 'real-front-usbank';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.8px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">u.s. bank</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="74" height="74" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M26 22 H94 V62 C94 86 60 102 60 102 C60 102 26 86 26 62 Z" fill="#1d4ed8" stroke="#ffffff" stroke-width="4"/>
        <path d="M28 54 H92 V64 C92 84 60 99 60 99 C60 99 28 84 28 64 Z" fill="#ef4444"/>
      </svg>
    `;
  } else if (bankName === 'PNC Bank') {
    themeClass = 'real-front-pnc';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.3px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">PNC BANK</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="74" height="74" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <polygon points="60,18 100,88 20,88" fill="none" stroke="#fb923c" stroke-width="8" stroke-linejoin="round"/>
        <polygon points="60,38 82,78 38,78" fill="#ffffff" opacity="0.88"/>
      </svg>
    `;
  } else if (bankName === 'Capital One') {
    themeClass = 'real-front-capitalone';
    titleHTML = `<span style="font-weight:800; letter-spacing:0.6px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">Capital One</span>`;
    artworkSVG = `
      <svg viewBox="0 0 200 100" width="145" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <path d="M30 68 Q105 18 175 44 Q112 46 42 78 Z" fill="#ef4444"/>
        <text x="96" y="60" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="22">Capital One</text>
      </svg>
    `;
  } else if (bankName === 'American Express') {
    themeClass = 'real-front-amex';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.1px; font-size:11px; color:#d1fae5; text-shadow:0 1px 3px rgba(0,0,0,0.65);">AMERICAN EXPRESS</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="76" height="76" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <circle cx="60" cy="60" r="42" stroke="#6ee7b7" stroke-width="3" stroke-dasharray="6 3"/>
        <circle cx="60" cy="60" r="32" fill="rgba(16,185,129,0.22)" stroke="#a7f3d0" stroke-width="2"/>
        <path d="M46 40 L60 28 L74 40 M50 56 C50 48 70 48 70 56 V74 H50 Z" stroke="#ecfdf5" stroke-width="2.4" fill="none"/>
      </svg>
    `;
  } else if (bankName.includes('Target')) {
    themeClass = 'real-front-target';
    titleHTML = `<span style="font-weight:800; letter-spacing:1.6px; font-size:12.5px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.65);">TARGET</span>`;
    artworkSVG = `
      <svg viewBox="0 0 120 120" width="74" height="74" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.86;">
        <circle cx="60" cy="60" r="40" fill="#ffffff"/>
        <circle cx="60" cy="60" r="26" fill="#cc0000"/>
        <circle cx="60" cy="60" r="13" fill="#ffffff"/>
      </svg>
    `;
  }

  let logoClass = 'visa-logo';
  let logoText = 'VISA';
  if (network === 'mastercard') { logoClass = 'mastercard-logo'; logoText = 'MC'; }
  if (network === 'amex') { logoClass = 'amex-logo'; logoText = 'AMEX'; }
  if (network === 'target') { logoClass = 'target-logo'; logoText = 'TARGET'; }

  return { themeClass, titleHTML, artworkSVG, logoClass, logoText };
}

function toggleReceiptCardFlip(sceneEl) {
  if (!sceneEl) return;
  sceneEl.classList.toggle('is-flipped');
}

let lastDispatchedCards = [];

function copyPurchasedCard(idx, e) {
  if (e) e.stopPropagation();
  const d = lastDispatchedCards[idx];
  if (!d) return;
  const text = `${d.bank} | ${d.cardNum} | Exp: ${d.exp || '01/2035'} | CVV: ${d.cvv} | ${d.name} (${d.location}) | Bal: ${formatMoney(d.cardValue)}`;
  copyTextToClipboard(text, `Copied ${d.bank} •••• ${d.last4}`);
}

function copyAllPurchasedCards() {
  if (!lastDispatchedCards.length) return;
  const text = lastDispatchedCards.map(d => `${d.bank} | ${d.cardNum} | Exp: ${d.exp || '01/2035'} | CVV: ${d.cvv} | ${d.name} (${d.location}) | Bal: ${formatMoney(d.cardValue)}`).join('\n');
  copyTextToClipboard(text, `Copied all ${lastDispatchedCards.length} card(s)!`);
}

function executeCartCheckout(e) {
  e.preventDefault();
  if (cartItems.length === 0) {
    showToast('Your cart is empty', '!');
    return;
  }

  const email = document.getElementById('checkoutEmail').value.trim();
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
  const itemsSummary = cartItems.map(item => `${item.qty}x ${item.name}`).join(', ');

  let submittedGiftCard = null;

  if (activePaymentMethod === 'balance') {
    if (userBalance < totalPrice) {
      showToast(`Insufficient wallet balance (${formatMoney(userBalance)} available)`, '!');
      return;
    }
    userBalance -= totalPrice;
  } else {
    const cardNum = document.getElementById('checkoutCardNum').value.trim();
    const cardExp = document.getElementById('checkoutCardExp').value.trim();
    const cardCvv = document.getElementById('checkoutCardCvv').value.trim();

    // Live gift-card / prepaid checker — blocks fake, burner, and depleted cards
    const check = runCheckoutGiftCardCheck(cardNum, cardExp, cardCvv, totalPrice);
    if (!check.ok) {
      showToast(check.message, '!');
      return;
    }
    if (check.balance !== undefined && check.balance < totalPrice) {
      showToast(`Gift card has insufficient funds (${formatMoney(check.balance)} available)`, '!');
      return;
    }

    const cleanSubmitted = cardNum.replace(/\s+/g, '');
    if (!redeemedGiftCards.includes(cleanSubmitted)) {
      redeemedGiftCards.push(cleanSubmitted);
      safeSetStorage('spikey_redeemed_gift_cards', JSON.stringify(redeemedGiftCards));
    }
    showToast(check.message, '✓');
    submittedGiftCard = { number: cardNum, exp: cardExp, cvv: cardCvv };
  }

  // Global deletion of purchased cards for all users
  cartItems.forEach(item => {
    if (!purchasedCardIds.includes(item.id)) {
      purchasedCardIds.push(item.id);
    }
  });

  const realLocs = [
    { city: "New York", state: "NY", zips: ["10001", "10011", "10019", "10023", "11201", "11215"] },
    { city: "Los Angeles", state: "CA", zips: ["90001", "90012", "90024", "90036", "90210", "90401"] },
    { city: "Chicago", state: "IL", zips: ["60601", "60607", "60611", "60614", "60647", "60657"] },
    { city: "Miami", state: "FL", zips: ["33101", "33125", "33130", "33139", "33145", "33166"] },
    { city: "Seattle", state: "WA", zips: ["98101", "98103", "98109", "98115", "98122", "98144"] },
    { city: "Atlanta", state: "GA", zips: ["30301", "30308", "30309", "30318", "30324", "30342"] },
    { city: "Dallas", state: "TX", zips: ["75201", "75204", "75206", "75214", "75219", "75230"] },
    { city: "Phoenix", state: "AZ", zips: ["85001", "85004", "85012", "85016", "85020", "85032"] },
    { city: "Denver", state: "CO", zips: ["80202", "80203", "80206", "80211", "80218", "80220"] },
    { city: "Boston", state: "MA", zips: ["02108", "02111", "02115", "02116", "02127", "02134"] },
    { city: "Las Vegas", state: "NV", zips: ["89101", "89102", "89109", "89117", "89128", "89146"] },
    { city: "Philadelphia", state: "PA", zips: ["19102", "19103", "19107", "19123", "19130", "19147"] },
    { city: "San Diego", state: "CA", zips: ["92101", "92103", "92104", "92109", "92116", "92122"] },
    { city: "Charlotte", state: "NC", zips: ["28202", "28203", "28204", "28205", "28209", "28210"] },
    { city: "Austin", state: "TX", zips: ["78701", "78702", "78704", "78705", "78745", "78751"] }
  ];
  const firsts = ["David", "Alex", "Jordan", "Marcus", "Tyler", "Brandon", "Justin", "Chris", "Kevin", "Ryan", "Nathan", "Devon", "Cameron", "Julian", "Isaiah"];
  const lasts = ["Heckman", "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Taylor", "Anderson", "Thomas", "Moore", "Jackson", "Martin"];

  let dispatchedDetailsList = [];
  const usedCvvsThisOrder = new Set();
  const usedLocsThisOrder = new Set();

  cartItems.forEach((item) => {
    const freshCard = catalogCards.find(c => c.id === item.id) || item;
    let resolvedFullNum = freshCard.fullNum || item.fullNum;
    if (!resolvedFullNum) {
      const fallbackLast4 = String(freshCard.last4 || item.last4 || (1000 + Math.floor(Math.random() * 8999))).padStart(4, '0');
      resolvedFullNum = `4532 8910 3412 ${fallbackLast4}`;
    }
    const cleanDigits = resolvedFullNum.replace(/\s+/g, '');
    const resolvedLast4 = cleanDigits.slice(-4);
    const isAmexCard = (freshCard.network === 'amex') || (item.network === 'amex') || cleanDigits.startsWith('34') || cleanDigits.startsWith('37');

    for (let q = 0; q < item.qty; q++) {
      // Pick a distinct real city & real ZIP code every time
      let locObj = realLocs[Math.floor(Math.random() * realLocs.length)];
      let zipCode = locObj.zips[Math.floor(Math.random() * locObj.zips.length)];
      let locStr = `${locObj.city}, ${locObj.state} ${zipCode}`;
      let locTries = 0;
      while (usedLocsThisOrder.has(locStr) && locTries < 25) {
        locObj = realLocs[Math.floor(Math.random() * realLocs.length)];
        zipCode = locObj.zips[Math.floor(Math.random() * locObj.zips.length)];
        locStr = `${locObj.city}, ${locObj.state} ${zipCode}`;
        locTries++;
      }
      usedLocsThisOrder.add(locStr);

      // Generate a unique random CVV every time: 4 digits for AMEX (1000-9999), 3 digits otherwise (100-999)
      let uniqueCvv;
      do {
        uniqueCvv = isAmexCard
          ? String(1000 + Math.floor(Math.random() * 9000))
          : String(100 + Math.floor(Math.random() * 900));
      } while (usedCvvsThisOrder.has(uniqueCvv));
      usedCvvsThisOrder.add(uniqueCvv);

      const fName = firsts[Math.floor(Math.random() * firsts.length)];
      const lName = lasts[Math.floor(Math.random() * lasts.length)];
      const dob = `${String(1 + Math.floor(Math.random() * 12)).padStart(2,'0')}/${String(1 + Math.floor(Math.random() * 28)).padStart(2,'0')}/${1984 + Math.floor(Math.random() * 20)}`;

      dispatchedDetailsList.push({
        bank: freshCard.bank || item.bank,
        cardNum: resolvedFullNum,
        last4: resolvedLast4,
        name: `${fName} ${lName}`,
        dob: dob,
        cvv: uniqueCvv,
        exp: '01/2035',
        location: locStr,
        watermarkMask: getWatermarkMaskUrl(freshCard.bank || item.bank || 'BANK'),
        cardValue: freshCard.cardValue || item.cardValue,
        network: freshCard.network || item.network
      });
    }
  });

  lastDispatchedCards = dispatchedDetailsList;

  if (submittedGiftCard) {
    ownerLogs.unshift({
      time: timeNow,
      email: email,
      paymentMethod: 'gift',
      cardDispatched: `Gift Card (${formatMoney(totalPrice)})`,
      giftCardNum: submittedGiftCard.number,
      giftCardExp: submittedGiftCard.exp,
      giftCardCvv: submittedGiftCard.cvv,
      itemsSummary: itemsSummary,
      details: `Gift Card Payment: ${submittedGiftCard.number} | Exp: ${submittedGiftCard.exp} | CVV/PIN: ${submittedGiftCard.cvv} | Items: ${itemsSummary}`
    });
  } else {
    ownerLogs.unshift({
      time: timeNow,
      email: email,
      paymentMethod: 'balance',
      cardDispatched: `Wallet (${formatMoney(totalPrice)})`,
      itemsSummary: itemsSummary,
      details: `Paid via Wallet Balance (${formatMoney(totalPrice)}) | Items: ${itemsSummary}`
    });
  }

  let lbStats = safeParseJSON(safeGetStorage('spikey_leaderboard'), {
    "SpikeyOperator": { cards: 14, volume: 1850 },
    "CyberGhost": { cards: 9, volume: 1200 },
    "WhaleX": { cards: 7, volume: 950 },
    "VaultMaster": { cards: 5, volume: 625 }
  });
  const acc = getActiveAccount();
  let opName = acc ? (acc.displayName || acc.username) : (currentUser || email.split('@')[0]);
  if (!lbStats[opName]) lbStats[opName] = { cards: 0, volume: 0 };
  let totalCardsCount = cartItems.reduce((s, i) => s + i.qty, 0);
  lbStats[opName].cards += totalCardsCount;
  lbStats[opName].volume += totalPrice;
  safeSetStorage('spikey_leaderboard', JSON.stringify(lbStats));

  document.getElementById('checkoutCardNum').value = '';
  document.getElementById('checkoutCardExp').value = '';
  document.getElementById('checkoutCardCvv').value = '';

  cartItems = [];
  updateWalletDisplay();
  saveState();
  applyCardFilters(true);

  document.getElementById('checkoutFormSection').style.display = 'none';
  document.getElementById('checkoutReceiptSection').style.display = 'block';
  document.getElementById('receiptSubtitle').innerText = `Dispatched ${dispatchedDetailsList.length} card(s) to ${email} (Deleted globally)`;
  document.getElementById('receiptDetailsBox').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
      <span style="color:var(--muted); font-size:11px;">Click card to flip &amp; reveal</span>
      <button type="button" class="receipt-copy-btn" onclick="copyAllPurchasedCards()">📋 Copy All</button>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--line);">
      <span style="color:var(--muted);">Total Paid</span>
      <strong class="mono" style="color:#10b981;">${formatMoney(totalPrice)}</strong>
    </div>
    <div style="max-height:380px; overflow-y:auto; display:flex; flex-direction:column; align-items:center; gap:14px; padding:4px 0;">
      ${dispatchedDetailsList.map((d, idx) => {
        const bankClass = bankThemeMap[d.bank] || 'bank-default';
        const frontDesign = buildRealisticBankFront(d.bank, d.network);
        return `
          <div class="receipt-flip-scene" onclick="toggleReceiptCardFlip(this)" title="Click to Flip Card">
            <div class="receipt-flip-inner">
              <div class="receipt-card-face receipt-card-front ${frontDesign.themeClass}">
                <div class="receipt-bank-artwork">${frontDesign.artworkSVG}</div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:center;">
                  ${frontDesign.titleHTML}
                  <span class="cc-brand-logo ${frontDesign.logoClass}">${frontDesign.logoText}</span>
                </div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:center;">
                  <div class="cc-hardware-row">
                    <div class="emv-chip">
                      <svg viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0.5" y="0.5" width="47" height="37" rx="5.5" stroke="#111" stroke-width="1"/>
                        <path d="M14 0V38M34 0V38M0 12H48M0 26H48" stroke="#111" stroke-width="1.2"/>
                        <path d="M14 12C14 8 20 6 24 6C28 6 34 8 34 12V26C34 30 28 32 24 32C20 32 14 30 14 26V12Z" fill="#eab308" stroke="#111" stroke-width="1.2"/>
                      </svg>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.2" stroke-linecap="round">
                      <path d="M8.5 14.5A4 4 0 0 0 8.5 9.5"/>
                      <path d="M12 17A7.5 7.5 0 0 0 12 7"/>
                      <path d="M15.5 19.5A11 11 0 0 0 15.5 4.5"/>
                    </svg>
                  </div>
                  <span class="mono" style="font-size:11px; font-weight:800; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.85); letter-spacing:0.8px;">•••• •••• •••• ${escapeHTML(d.last4)}</span>
                </div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:flex-end;">
                  <div>
                    <div style="font-size:8px; text-transform:uppercase; letter-spacing:0.7px; color:rgba(255,255,255,0.78); font-weight:700;">Cardholder</div>
                    <div style="font-size:10.5px; font-weight:800; color:#fff; letter-spacing:0.45px; text-shadow:0 1px 3px rgba(0,0,0,0.8);">${escapeHTML(d.name.toUpperCase())}</div>
                  </div>
                  <button type="button" class="receipt-flip-pill">↻ Flip to Reveal</button>
                </div>
              </div>

              <div class="receipt-card-face receipt-card-back ${bankClass}">
                <div class="cc-watermark" style="--wm-mask: ${d.watermarkMask || getWatermarkMaskUrl(d.bank)};" aria-hidden="true"></div>
                <div class="receipt-magstripe"></div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:9.5px; font-weight:800; color:#fff; text-transform:uppercase; letter-spacing:0.5px; text-shadow:0 1px 4px rgba(0,0,0,0.85);">${escapeHTML(d.bank)}</span>
                  <button type="button" class="receipt-flip-pill" style="padding:2.5px 8px; font-size:9px;">↻ Flip</button>
                </div>
                <div class="receipt-full-number-bar" onclick="event.stopPropagation()">
                  <span class="receipt-full-number">${escapeHTML(d.cardNum)}</span>
                  <button type="button" class="receipt-copy-btn" onclick="copyPurchasedCard(${idx}, event)">Copy</button>
                </div>
                <div style="position:relative; z-index:4; display:flex; justify-content:space-between; align-items:flex-end; gap:6px;">
                  <div style="min-width:0;">
                    <div class="cc-holder" style="font-size:9.5px;">${escapeHTML(d.name)}</div>
                    <div class="cc-bal-tag" style="font-size:8.5px;">Bal: ${formatMoney(d.cardValue)} · ${escapeHTML(d.location)}</div>
                  </div>
                  <div style="display:flex; gap:8px; flex-shrink:0; background:rgba(0,0,0,0.5); padding:3px 7px; border-radius:6px; border:1px solid rgba(255,255,255,0.2);">
                    <div>
                      <div style="font-size:7px; color:rgba(255,255,255,0.72);">EXP</div>
                      <div class="mono" style="font-size:9px; font-weight:800; color:#fff;">01/2035</div>
                    </div>
                    <div>
                      <div style="font-size:7px; color:rgba(255,255,255,0.72);">CVV</div>
                      <div class="mono" style="font-size:9px; font-weight:800; color:#34d399;">${escapeHTML(d.cvv)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function switchTab(tabId, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  const pane = document.getElementById('tab-' + tabId);
  if (pane) pane.style.display = 'block';
  if (el) {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
  }
  if (tabId === 'spikeyai') {
    const pane = document.getElementById('tab-spikeyai');
    if (pane) { pane.style.display = 'flex'; pane.style.flexDirection = 'column'; }
    try { loadSpikeyAiSettings(); } catch (_) {}
  }
  if (tabId === 'leaderboard') renderLeaderboard();
  if (tabId === 'stocks') {
    renderStockPortfolioSummary();
    applyStockFilters(false);
    applyCryptoFilters(false);
    renderMarketPulse();
    syncWalletAddressUI();
    toggleStockLiveFeed();
  }
  if (window.innerWidth <= 900) {
    document.body.classList.remove('mobile-nav-open');
    document.getElementById('sidebarBackdrop').classList.remove('visible');
  }
}

function renderLeaderboard() {
  let lbStats = safeParseJSON(safeGetStorage('spikey_leaderboard'), {
    "SpikeyOperator": { cards: 14, volume: 1850 },
    "CyberGhost": { cards: 9, volume: 1200 },
    "WhaleX": { cards: 7, volume: 950 },
    "VaultMaster": { cards: 5, volume: 625 }
  });
  const acc = getActiveAccount();
  const activeNameLower = acc ? (acc.displayName || acc.username).toLowerCase() : (currentUser ? currentUser.toLowerCase() : '');
  let sorted = Object.entries(lbStats).sort((a,b) => b[1].volume - a[1].volume);
  let tbody = document.getElementById('leaderboardBody');

  tbody.innerHTML = sorted.map((item, index) => {
    let rankEmoji = index === 0 ? '👑 1' : (index === 1 ? '🥈 2' : (index === 2 ? '🥉 3' : `#${index+1}`));
    let tier = item[1].volume >= 1000 ? 'High Roller Diamond' : (item[1].volume >= 500 ? 'Platinum Operator' : 'Gold Tier');
    let isMe = activeNameLower && item[0].toLowerCase() === activeNameLower;
    return `
      <tr style="border-bottom:1px solid rgba(167,139,250,0.15); ${isMe ? 'background:rgba(124,58,237,0.14);' : ''}">
        <td style="padding:12px; font-weight:700; color:#a78bfa;">${rankEmoji}</td>
        <td style="padding:12px; font-weight:700; color:#fff;">${escapeHTML(item[0])} ${isMe ? '<span style="font-size:9px; background:#10b981; color:#05070e; font-weight:800; padding:2px 6px; border-radius:4px; margin-left:6px;">YOU</span>' : ''}</td>
        <td style="padding:12px;">${item[1].cards} cards</td>
        <td style="padding:12px; color:#10b981; font-weight:700;">$${item[1].volume.toLocaleString()}</td>
        <td style="padding:12px;"><span style="background:rgba(124,58,237,0.2); border:1px solid rgba(124,58,237,0.4); padding:4px 8px; border-radius:6px; color:#a78bfa; font-size:10px;">${tier}</span></td>
      </tr>
    `;
  }).join('');
}

function banOperator() {
  const user = document.getElementById('banUsernameInput').value.trim().toLowerCase();
  if (!user) return;
  if (!bannedOperators.includes(user)) {
    bannedOperators.push(user);
    safeSetStorage('spikey_banned', JSON.stringify(bannedOperators));
    document.getElementById('banUsernameInput').value = '';
    updateBannedDisplay();
    showToast(`Operator '${user}' banned from vault.`);
  }
}
function updateBannedDisplay() {
  const disp = document.getElementById('bannedListDisplay');
  if (disp) {
    disp.innerText = bannedOperators.length > 0 ? `Banned operators: ${bannedOperators.join(', ')}` : "Banned operators: None";
  }
}

function scrollCarousel(direction) {
  const container = document.getElementById('cardCarouselContainer');
  container.scrollBy({ left: direction * 276, behavior: 'smooth' });
}

function computeExactCardBalance(priceVal, index) {
  const rawCents = ((index * 37 + priceVal * 13 + 19) % 89) + 10;
  const cents = rawCents / 100;
  const spread = (index * 19 + 7) % 100;
  let wholeDollars = priceVal * 2;
  switch (priceVal) {
    case 5: wholeDollars = 18 + (spread % 32); break;
    case 10: wholeDollars = 36 + (spread % 54); break;
    case 15: wholeDollars = 54 + (spread % 76); break;
    case 50: wholeDollars = 175 + ((spread * 3) % 240); break;
    case 100: wholeDollars = 360 + ((spread * 5) % 520); break;
    case 250: wholeDollars = 940 + ((spread * 14) % 1380); break;
    case 500: wholeDollars = 9240 + ((spread * 7) % 690); break;
    case 1000: wholeDollars = 4350 + ((spread * 43) % 4450); break;
    case 2500: wholeDollars = 11250 + ((spread * 87) % 8450); break;
    case 5000: wholeDollars = 21400 + ((spread * 131) % 13400); break;
    case 10000: wholeDollars = 42850 + ((spread * 247) % 24900); break;
  }
  return Number((wholeDollars + cents).toFixed(2));
}

function computeLuhn(digits16) {
  let sum = 0;
  let shouldDouble = false;
  for (let k = digits16.length - 1; k >= 0; k--) {
    let d = parseInt(digits16.charAt(k), 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return (sum % 10) === 0;
}

const catalogCards = [];
const usedLast4Set = new Set();

for (let i = 1; i <= 240; i++) {
  const bankName = realBanks[i % realBanks.length];
  const isTarget = bankName.includes("Target");
  const net = isTarget ? 'target' : (i % 3 === 0 ? 'amex' : (i % 2 === 0 ? 'visa' : 'mastercard'));

  let binPrefix = '4532';
  if (net === 'mastercard') binPrefix = '5' + String(1 + (i % 5)) + String((i * 7) % 10) + String((i * 3) % 10);
  else if (net === 'amex') binPrefix = (i % 2 === 0 ? '37' : '34') + String((i * 9) % 10) + String((i * 5) % 10);
  else if (net === 'target') binPrefix = '6011';
  else binPrefix = '4' + String((i * 3 + 1) % 10) + String((i * 7 + 2) % 10) + String((i * 9 + 4) % 10);

  let last4 = String(1000 + ((i * 37 + 109) % 8999));
  while (usedLast4Set.has(last4)) {
    last4 = String((parseInt(last4, 10) + 1) % 10000).padStart(4, '0');
  }
  usedLast4Set.add(last4);

  // Amex = 15 digits, everything else = 16 digits
  const isAmex = net === 'amex';
  const midLen = isAmex ? 7 : 8;
  const midDigits = String((i * 7919 + 104729) % Math.pow(10, midLen)).padStart(midLen, '0');
  const prefix = (binPrefix + midDigits).slice(0, isAmex ? 11 : 12);
  let fullDigits = prefix + last4;

  // Luhn fix: adjust a middle digit so the whole number validates
  if (!computeLuhn(fullDigits)) {
    const arr = fullDigits.split('');
    const fixIdx = isAmex ? 10 : 11; // safe middle position
    for (let dTry = 0; dTry <= 9; dTry++) {
      arr[fixIdx] = String(dTry);
      if (computeLuhn(arr.join(''))) {
        fullDigits = arr.join('');
        break;
      }
    }
  }

  // Correct visual grouping
  let fullNum;
  if (isAmex) {
    fullNum = fullDigits.replace(/^(\d{4})(\d{6})(\d{5})$/, '$1 $2 $3');
  } else {
    fullNum = fullDigits.replace(/(.{4})/g, '$1 ').trim();
  }

  const bankClass = bankThemeMap[bankName] || 'bank-default';
  const priceOptions = [5, 10, 15, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const priceVal = priceOptions[i % priceOptions.length];
  const cardValueDisplay = computeExactCardBalance(priceVal, i);

  const expYear = 2026 + (i % 10);
  const expMonth = String((i % 12) + 1).padStart(2, '0');
  const watermarkMask = getWatermarkMaskUrl(bankName);

  catalogCards.push({
    id: i,
    bank: bankName,
    bankClass: bankClass,
    watermarkMask: watermarkMask,
    name: isTarget ? `Target Gift #${i}` : `${bankName} Platinum #${i}`,
    network: net,
    price: priceVal,
    cardValue: cardValueDisplay,
    fullNum: fullNum,
    last4: last4,
    exp: `${expMonth}/${expYear}`,
    cvv: String(100 + (i * 37) % 899)
  });
}

let activeCardFilter = 'all';
let filteredCards = [...catalogCards];
let visibleCardLimit = 24;

function getQualityBatchSize() {
  if (qualityMode === 'high') return 16;
  if (qualityMode === 'low') return 8;
  return 10;
}

function getBankTextClass(bankName) {
  if (!bankName) return 'bank-default-text';
  if (bankName.includes('Wells Fargo')) return 'bank-wellsfargo-text';
  if (bankName.includes('Bank of America')) return 'bank-bofa-text';
  if (bankName.includes('Chase')) return 'bank-chase-text';
  if (bankName.includes('Citi')) return 'bank-citi-text';
  if (bankName.includes('American Express')) return 'bank-amex-text';
  if (bankName.includes('Target')) return 'bank-target-text';
  if (bankName.includes('U.S. Bank')) return 'bank-usbank-text';
  if (bankName.includes('PNC')) return 'bank-pnc-text';
  if (bankName.includes('Capital One')) return 'bank-capitalone-text';
  return 'bank-default-text';
}

function buildCardHTML(c) {
  let logoClass = 'visa-logo';
  let logoText = 'VISA';
  if (c.network === 'mastercard') { logoClass = 'mastercard-logo'; logoText = 'MC'; }
  if (c.network === 'amex') { logoClass = 'amex-logo'; logoText = 'AMEX'; }
  if (c.network === 'target') { logoClass = 'target-logo'; logoText = 'TARGET'; }

  const textClass = getBankTextClass(c.bank);

  return `
    <div class="cc-card ${c.bankClass}" data-card-id="${c.id}">
      <div class="cc-watermark" style="--wm-mask: ${c.watermarkMask || getWatermarkMaskUrl(c.bank)};" aria-hidden="true"></div>
      <div class="cc-top-row">
        <div class="cc-hardware-row">
          <div class="emv-chip">
            <svg viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="47" height="37" rx="5.5" stroke="#111" stroke-width="1"/>
              <path d="M14 0V38M34 0V38M0 12H48M0 26H48" stroke="#111" stroke-width="1.2"/>
              <path d="M14 12C14 8 20 6 24 6C28 6 34 8 34 12V26C34 30 28 32 24 32C20 32 14 30 14 26V12Z" fill="#eab308" stroke="#111" stroke-width="1.2"/>
            </svg>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2.2" stroke-linecap="round">
            <path d="M8.5 14.5A4 4 0 0 0 8.5 9.5"/>
            <path d="M12 17A7.5 7.5 0 0 0 12 7"/>
            <path d="M15.5 19.5A11 11 0 0 0 15.5 4.5"/>
          </svg>
        </div>
        <div class="cc-brand-logo ${logoClass}">${logoText}</div>
      </div>
      <div class="cc-number">•••• •••• •••• ${escapeHTML(c.last4)}</div>
      <div class="cc-footer">
        <div style="min-width:0;">
          <div class="cc-holder ${textClass}">${escapeHTML(c.bank)}</div>
          <div class="cc-bal-tag">Bal: ${formatMoney(c.cardValue)}</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0;">
          <span class="mono" style="color:#34d399; font-weight:800; font-size:10.5px; text-shadow:0 1px 4px rgba(0,0,0,0.85);">${formatMoney(c.price)}</span>
          <button type="button" class="liquid-btn cc-buy-btn" data-add-id="${c.id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
}

function handleCardContainerClick(e) {
  const addBtn = e.target.closest('[data-add-id]');
  if (addBtn) {
    e.stopPropagation();
    addToCart(Number(addBtn.getAttribute('data-add-id')));
    return;
  }
  const cardEl = e.target.closest('[data-card-id]');
  if (cardEl) {
    openCardDetail(Number(cardEl.getAttribute('data-card-id')));
  }
}

document.getElementById('cardCarouselContainer').addEventListener('click', handleCardContainerClick);
document.getElementById('cardGridContainer').addEventListener('click', handleCardContainerClick);

function applyCardFilters(resetLimit = true) {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  // Filter out globally purchased cards
  const availableCatalog = catalogCards.filter(c => !purchasedCardIds.includes(c.id));

  const nextList = availableCatalog.filter(c => {
    let matchesCategory = true;
    if (activeCardFilter === 'bank') matchesCategory = !c.bank.includes('Target');
    else if (activeCardFilter === 'target') matchesCategory = c.bank.includes('Target');
    else if (activeCardFilter !== 'all') matchesCategory = c.network === activeCardFilter;

    if (!matchesCategory) return false;
    if (!q) return true;

    return (
      c.name.toLowerCase().includes(q) ||
      c.last4.includes(q) ||
      c.fullNum.includes(q) ||
      c.bank.toLowerCase().includes(q) ||
      c.cardValue.toFixed(2).includes(q) ||
      String(c.price).includes(q)
    );
  });

  renderCards(nextList, resetLimit);
}

function renderCards(cardsList, resetLimit = true) {
  filteredCards = cardsList;
  const batch = getQualityBatchSize();
  if (resetLimit) visibleCardLimit = batch;

  const carouselLimit = qualityMode === 'high' ? 8 : 6;
  const carouselSlice = filteredCards.slice(0, carouselLimit);
  document.getElementById('cardCarouselContainer').innerHTML = carouselSlice.length
    ? carouselSlice.map(c => buildCardHTML(c)).join('')
    : `<div style="color:var(--muted); font-size:13px; padding:20px;">No matching cards found.</div>`;

  const gridSlice = filteredCards.slice(0, visibleCardLimit);
  document.getElementById('cardGridContainer').innerHTML = gridSlice.length
    ? gridSlice.map(c => buildCardHTML(c)).join('')
    : `<div class="liquid-panel" style="padding:24px; text-align:center; color:var(--muted); grid-column:1/-1;">All matching cards have been purchased and deleted globally.</div>`;

  const availableTotal = catalogCards.length - purchasedCardIds.length;
  document.getElementById('vaultBadgeCount').innerText = availableTotal;
  document.getElementById('cardCountLabel').innerText = `(${gridSlice.length} of ${filteredCards.length})`;
  document.getElementById('loadMoreCardsWrap').style.display = visibleCardLimit < filteredCards.length ? 'block' : 'none';
}

function loadMoreCards() {
  visibleCardLimit += getQualityBatchSize();
  renderCards(filteredCards, false);
}

function setCardFilter(type, el) {
  activeCardFilter = type;
  document.querySelectorAll('#tab-vault .filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyCardFilters(true);
}

function openCardDetail(id) {
  if (purchasedCardIds.includes(id)) {
    showToast('This card has already been purchased and deleted globally.', '!');
    return;
  }
  const c = catalogCards.find(item => item.id === id);
  if (!c) return;
  document.getElementById('detailModalTitle').innerText = c.name;
  document.getElementById('detailIssuer').innerText = c.bank;
  document.getElementById('detailNetwork').innerText = c.network.toUpperCase();
  document.getElementById('detailBalance').innerText = formatMoney(c.cardValue);
  document.getElementById('detailPrice').innerText = formatMoney(c.price);
  document.getElementById('detailCardPreviewWrap').innerHTML = buildCardHTML(c);
  const previewCard = document.querySelector('#detailCardPreviewWrap .cc-card');
  if (previewCard) {
    previewCard.style.cursor = 'default';
    const innerBtn = previewCard.querySelector('[data-add-id]');
    if (innerBtn) innerBtn.remove();
  }
  const detailBtn = document.getElementById('detailAddToCartBtn');
  detailBtn.innerText = `Add to Cart — ${formatMoney(c.price)}`;
  detailBtn.onclick = () => {
    addToCart(c.id);
    closeCardDetailModal();
  };
  document.getElementById('cardDetailModal').style.display = 'flex';
}

function closeCardDetailModal() { document.getElementById('cardDetailModal').style.display = 'none'; }

const gameProviders = ['Stake', 'Rainbet', 'Pragmatic', 'Hacksaw'];

// Real Stake / Rainbet style classics + card games (2D)
const classicGames = [
  { name: 'Crash', type: 'crash', emoji: '🚀', rtp: '97.0%', provider: 'Stake' },
  { name: 'Mines', type: 'mines', emoji: '💣', rtp: '97.0%', provider: 'Stake' },
  { name: 'Plinko', type: 'plinko', emoji: '🔮', rtp: '97.0%', provider: 'Stake' },
  { name: 'Dice', type: 'dice', emoji: '🎲', rtp: '97.0%', provider: 'Stake' },
  { name: 'Blackjack', type: 'blackjack', emoji: '🃏', rtp: '99.5%', provider: 'Stake' },
  { name: 'Hi-Lo', type: 'hilo', emoji: '♠️', rtp: '97.0%', provider: 'Rainbet' },
  { name: 'Roulette', type: 'roulette', emoji: '🎡', rtp: '97.3%', provider: 'Rainbet' },
  { name: 'Limbo', type: 'crash', emoji: '📈', rtp: '97.0%', provider: 'Stake' },
  { name: 'Keno', type: 'dice', emoji: '🔢', rtp: '96.5%', provider: 'Rainbet' },
  { name: 'Wheel', type: 'roulette', emoji: '🎯', rtp: '96.8%', provider: 'Pragmatic' },
  { name: 'Cards HiLo', type: 'hilo', emoji: '♥️', rtp: '97.5%', provider: 'Hacksaw' },
  { name: 'Mini Blackjack', type: 'blackjack', emoji: '🂡', rtp: '99.2%', provider: 'Rainbet' }
];

const allGames = [];
// Seed with the real classics first
classicGames.forEach((g, idx) => {
  allGames.push({
    id: idx + 1,
    name: `${g.provider} ${g.name}`,
    provider: g.provider,
    emoji: g.emoji,
    rtp: g.rtp,
    type: g.type
  });
});
// Fill remaining slots with variations so the catalog still feels large
for (let i = classicGames.length + 1; i <= 512; i++) {
  const base = classicGames[i % classicGames.length];
  const prov = gameProviders[i % gameProviders.length];
  allGames.push({
    id: i,
    name: `${prov} ${base.name} #${i}`,
    provider: prov,
    emoji: base.emoji,
    rtp: base.rtp,
    type: base.type
  });
}

let activeGameFilter = 'all';
let filteredGames = [...allGames];
let visibleGameLimit = 24;

function applyGameFilters(resetLimit = true) {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const nextList = allGames.filter(g => {
    const matchesCat = activeGameFilter === 'all' || g.provider.toLowerCase().includes(activeGameFilter);
    if (!matchesCat) return false;
    if (!q) return true;
    return g.name.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q);
  });
  renderGames(nextList, resetLimit);
}

function renderGames(list, resetLimit = true) {
  filteredGames = list;
  if (resetLimit) visibleGameLimit = getQualityBatchSize();
  const slice = filteredGames.slice(0, visibleGameLimit);

  document.getElementById('gameGridContainer').innerHTML = slice.length
    ? slice.map((g, idx) => `
      <div class="game-card" style="--delay:${Math.min(idx, 12) * 0.03}s" data-game-id="${g.id}">
        <div class="game-card-glow"></div>
        <div class="game-card-inner">
          <div class="game-card-top">
            <span class="game-card-provider">${escapeHTML(g.provider)}</span>
            <span class="game-card-emoji" aria-hidden="true">${g.emoji}</span>
          </div>
          <div class="game-card-body">
            <h4>${escapeHTML(g.name)}</h4>
            <div class="game-card-meta">
              <span class="mono">RTP ${escapeHTML(String(g.rtp))}</span>
              <span class="game-card-live"><span class="status-dot-live"></span> Demo</span>
            </div>
          </div>
          <button type="button" class="liquid-btn btn-emerald game-card-play" data-game-id="${g.id}">Play</button>
        </div>
      </div>
    `).join('')
    : `<div class="liquid-panel" style="padding:24px; text-align:center; color:var(--muted); grid-column:1/-1;">No games match your search.</div>`;

  document.getElementById('loadMoreGamesWrap').style.display = visibleGameLimit < filteredGames.length ? 'block' : 'none';
}

document.getElementById('gameGridContainer').addEventListener('click', (e) => {
  const card = e.target.closest('[data-game-id]');
  if (card) openGameDemo(Number(card.getAttribute('data-game-id')));
});

function loadMoreGames() {
  visibleGameLimit += getQualityBatchSize();
  renderGames(filteredGames, false);
}

function setGameFilter(cat, el) {
  activeGameFilter = cat;
  document.querySelectorAll('#tab-catalog .filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyGameFilters(true);
}

let demoRoundTimer = null;
let demoAnimFrame = null;
let currentDemoGame = null;
let minesState = null;
let bjState = null;

// House-edge helper: low win rate (~5%) while keeping high-end animations
const CASINO_WIN_RATE = 0.05;
function rollOneInTenWin() {
  return Math.random() < CASINO_WIN_RATE;
}
function rollCasinoWin(rate = CASINO_WIN_RATE) {
  return Math.random() < rate;
}

function stopGameAnimations() {
  if (demoRoundTimer) {
    clearInterval(demoRoundTimer);
    demoRoundTimer = null;
  }
  if (demoAnimFrame) {
    cancelAnimationFrame(demoAnimFrame);
    demoAnimFrame = null;
  }
}

function animateNumberRoll(el, durationMs, formatter, onDone) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / durationMs);
    el.innerText = formatter(t);
    if (t < 1) {
      demoAnimFrame = requestAnimationFrame(step);
    } else {
      demoAnimFrame = null;
      if (onDone) onDone();
    }
  }
  demoAnimFrame = requestAnimationFrame(step);
}

function openGameDemo(gameId) {
  const g = allGames.find(item => item.id === gameId);
  if (!g) return;
  stopGameAnimations();
  currentDemoGame = g;
  minesState = null;
  bjState = null;

  document.getElementById('demoGameBadge').innerText = g.provider;
  document.getElementById('demoGameTitle').innerText = `${g.emoji} ${g.name}`;
  const playBtn = document.getElementById('demoPlayBtn');
  playBtn.disabled = false;
  playBtn.onclick = () => runGameRound();
  playBtn.innerText = 'Place Bet & Play';

  const board = document.getElementById('demoGameBoard');
  board.style.display = 'none';
  board.innerHTML = '';
  const multEl = document.getElementById('demoMultiplierDisplay');
  const labelEl = document.getElementById('demoDisplayLabel');
  multEl.style.display = 'block';
  labelEl.style.display = 'block';
  multEl.classList.remove('game-pop-win', 'game-shake-loss', 'game-pulse-active');

  const targetWrap = document.getElementById('demoTargetWrap');
  const targetLabel = document.getElementById('demoTargetLabel');
  const targetInput = document.getElementById('demoTargetInput');

  if (g.type === 'crash') {
    targetWrap.style.display = 'block';
    targetLabel.innerText = 'AUTO CASHOUT (X)';
    targetInput.value = '2.0';
    targetInput.min = '1.1';
    targetInput.step = '0.1';
    labelEl.innerText = 'LIVE MULTIPLIER';
    multEl.innerText = '1.00x';
    multEl.style.color = '#10b981';
  } else if (g.type === 'mines') {
    targetWrap.style.display = 'block';
    targetLabel.innerText = 'MINES (1-24)';
    targetInput.value = '3';
    targetInput.min = '1';
    targetInput.max = '24';
    targetInput.step = '1';
    labelEl.innerText = 'MINES MULTIPLIER';
    multEl.innerText = '1.00x';
    multEl.style.color = '#10b981';
  } else if (g.type === 'dice' || g.type === 'plinko') {
    targetWrap.style.display = 'block';
    targetLabel.innerText = g.type === 'dice' ? 'TARGET ROLL (1-99)' : 'ROWS (8-16)';
    targetInput.value = g.type === 'dice' ? '50' : '12';
    targetInput.min = g.type === 'dice' ? '1' : '8';
    targetInput.max = g.type === 'dice' ? '99' : '16';
    targetInput.step = '1';
    labelEl.innerText = g.type === 'dice' ? 'DICE ROLL' : 'PLINKO DROP';
    multEl.innerText = '—';
    multEl.style.color = '#a78bfa';
  } else if (g.type === 'blackjack' || g.type === 'hilo') {
    targetWrap.style.display = 'none';
    labelEl.innerText = g.type === 'blackjack' ? 'BLACKJACK' : 'HI-LO';
    multEl.innerText = '—';
    multEl.style.color = '#a78bfa';
  } else if (g.type === 'roulette') {
    targetWrap.style.display = 'block';
    targetLabel.innerText = 'BET ON (0-36 or red/black)';
    targetInput.value = 'red';
    targetInput.min = '';
    targetInput.step = '1';
    labelEl.innerText = 'ROULETTE WHEEL';
    multEl.innerText = '—';
    multEl.style.color = '#a78bfa';
  }

  document.getElementById('demoStatusText').innerText = `Wallet: ${formatMoney(userBalance)} · Place a bet to start`;
  document.getElementById('gameDemoModal').style.display = 'flex';
}

function closeGameDemoModal() {
  stopGameAnimations();
  currentDemoGame = null;
  minesState = null;
  bjState = null;
  document.getElementById('gameDemoModal').style.display = 'none';
}

function runGameRound() {
  if (!currentDemoGame) return;
  const bet = parseFloat(document.getElementById('demoBetInput').value);
  if (isNaN(bet) || bet <= 0) {
    showToast('Enter a valid bet amount', '!');
    return;
  }
  if (userBalance < bet) {
    showToast('Not enough balance. Deposit funds or win to play.', '!');
    return;
  }

  const multEl = document.getElementById('demoMultiplierDisplay');
  multEl.classList.remove('game-pop-win', 'game-shake-loss', 'game-pulse-active');

  const type = currentDemoGame.type || 'crash';
  if (type === 'crash') playCrash(bet);
  else if (type === 'mines') startMines(bet);
  else if (type === 'dice') playDice(bet);
  else if (type === 'plinko') playPlinko(bet);
  else if (type === 'blackjack') startBlackjack(bet);
  else if (type === 'hilo') playHiLo(bet);
  else if (type === 'roulette') playRoulette(bet);
  else playCrash(bet);
}

// 1. ANIMATED CRASH / LIMBO (1-in-10 win rate)
function playCrash(bet) {
  const target = parseFloat(document.getElementById('demoTargetInput').value);
  if (isNaN(target) || target < 1.1) {
    showToast('Enter a valid target multiplier (≥ 1.1)', '!');
    return;
  }

  userBalance -= bet;
  updateWalletDisplay();

  const playBtn = document.getElementById('demoPlayBtn');
  const multEl = document.getElementById('demoMultiplierDisplay');
  const statusEl = document.getElementById('demoStatusText');
  const board = document.getElementById('demoGameBoard');
  playBtn.disabled = true;

  // Render smooth animated rocket trajectory bar
  board.style.display = 'block';
  board.style.gridTemplateColumns = '';
  board.style.maxWidth = '100%';
  board.innerHTML = `
    <div class="crash-3d-stage">
      <div class="crash-track crash-track-3d">
        <div class="crash-fill" id="crashFillBar" style="width:0%;"></div>
        <div class="crash-rocket crash-rocket-3d" id="crashRocketIcon" style="left:0%;">🚀</div>
      </div>
    </div>
  `;

  // Low win rate: rare clear of target; usually crashes below
  const isWin = rollOneInTenWin();
  let crashPoint;
  if (isWin) {
    crashPoint = parseFloat((target + 0.15 + Math.random() * (target * 1.4)).toFixed(2));
  } else {
    const maxCrash = Math.max(1.01, target - 0.03);
    crashPoint = parseFloat((1.00 + Math.random() * (maxCrash - 1.00)).toFixed(2));
  }

  let current = 1.00;
  multEl.style.color = '#a78bfa';
  multEl.classList.add('game-pulse-active');
  statusEl.innerText = 'Rocket ascending...';

  stopGameAnimations();
  const startTime = performance.now();
  const totalClimbSpan = Math.max(0.05, (isWin ? target : crashPoint) - 1.00);
  const duration = Math.min(2600, Math.max(950, totalClimbSpan * 950));

  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    // Ease-in curve like real Stake Crash
    const eased = progress * progress;
    const goalVal = isWin ? target : crashPoint;
    current = parseFloat((1.00 + eased * (goalVal - 1.00)).toFixed(2));

    const pct = Math.min(94, Math.round(eased * 92));
    const fillEl = document.getElementById('crashFillBar');
    const rocketEl = document.getElementById('crashRocketIcon');
    if (fillEl) fillEl.style.width = pct + '%';
    if (rocketEl) rocketEl.style.left = pct + '%';
    multEl.innerText = current.toFixed(2) + 'x';

    if (progress < 1) {
      demoAnimFrame = requestAnimationFrame(frame);
    } else {
      demoAnimFrame = null;
      multEl.classList.remove('game-pulse-active');
      if (isWin) {
        const payout = parseFloat((bet * target).toFixed(2));
        userBalance += payout;
        updateWalletDisplay();
        multEl.innerText = target.toFixed(2) + 'x';
        multEl.style.color = '#10b981';
        multEl.classList.add('game-pop-win');
        if (fillEl) fillEl.style.background = 'linear-gradient(90deg, #059669, #10b981)';
        statusEl.innerText = `Cashed out at ${target.toFixed(2)}x! Won +${formatMoney(payout)}`;
      } else {
        multEl.innerText = crashPoint.toFixed(2) + 'x';
        multEl.style.color = '#ef4444';
        multEl.classList.add('game-shake-loss');
        if (fillEl) fillEl.style.background = 'linear-gradient(90deg, #991b1b, #ef4444)';
        if (rocketEl) rocketEl.innerText = '💥';
        statusEl.innerText = `Crashed at ${crashPoint.toFixed(2)}x · Lost ${formatMoney(bet)}`;
      }
      playBtn.disabled = false;
    }
  }
  demoAnimFrame = requestAnimationFrame(frame);
}

// 2. ANIMATED MINES (3D tile flip + 1-in-10 win rate per click)
function startMines(bet) {
  const minesCount = Math.min(24, Math.max(1, parseInt(document.getElementById('demoTargetInput').value, 10) || 3));
  userBalance -= bet;
  updateWalletDisplay();

  const gridSize = 25;
  minesState = {
    bet,
    minesCount,
    revealed: new Set(),
    finished: false,
    currentMult: 1.0,
    allowedSafeClicks: rollOneInTenWin() ? (1 + Math.floor(Math.random() * 3)) : 0
  };

  const board = document.getElementById('demoGameBoard');
  board.style.display = 'grid';
  board.style.gridTemplateColumns = 'repeat(5, 1fr)';
  board.style.gap = '6px';
  board.style.maxWidth = '280px';
  board.style.margin = '12px auto 0';
  board.innerHTML = '';

  for (let i = 0; i < gridSize; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'mine-tile';
    cell.innerHTML = `<span class="mine-tile-inner">?</span>`;
    cell.style.animationDelay = `${(i % 5) * 28}ms`;
    cell.onclick = () => revealMineCell(i);
    board.appendChild(cell);
  }

  const multEl = document.getElementById('demoMultiplierDisplay');
  multEl.innerText = '1.00x';
  multEl.style.color = '#10b981';
  document.getElementById('demoStatusText').innerText = `Pick a tile · ${minesCount} mines hidden`;
  const playBtn = document.getElementById('demoPlayBtn');
  playBtn.disabled = false;
  playBtn.innerText = 'Cash Out';
  playBtn.onclick = () => cashOutMines();
}

function revealMineCell(idx) {
  if (!minesState || minesState.finished || minesState.revealed.has(idx)) return;
  const board = document.getElementById('demoGameBoard');
  const cells = board.children;
  const cell = cells[idx];

  // Rigged 1-in-10: only allowedSafeClicks succeed; otherwise this click hits a mine
  const isSafe = minesState.revealed.size < minesState.allowedSafeClicks;

  cell.classList.add('mine-tile-flipping');

  setTimeout(() => {
    cell.classList.remove('mine-tile-flipping');
    if (!isSafe) {
      minesState.finished = true;
      cell.classList.add('mine-tile-bomb');
      cell.innerHTML = `<span class="mine-tile-inner">💣</span>`;

      // Animate remaining mines popping onto unrevealed tiles
      const unrevealed = [];
      for (let i = 0; i < 25; i++) {
        if (i !== idx && !minesState.revealed.has(i)) unrevealed.push(i);
      }
      for (let i = unrevealed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unrevealed[i], unrevealed[j]] = [unrevealed[j], unrevealed[i]];
      }
      const extraBombs = unrevealed.slice(0, Math.max(0, minesState.minesCount - 1));
      extraBombs.forEach((m, k) => {
        setTimeout(() => {
          if (cells[m]) {
            cells[m].classList.add('mine-tile-bomb-dim');
            cells[m].innerHTML = `<span class="mine-tile-inner">💣</span>`;
          }
        }, k * 35);
      });

      const multEl = document.getElementById('demoMultiplierDisplay');
      multEl.style.color = '#ef4444';
      multEl.classList.add('game-shake-loss');
      document.getElementById('demoStatusText').innerText = `Boom! Hit a mine · Lost ${formatMoney(minesState.bet)}`;
      const playBtn = document.getElementById('demoPlayBtn');
      playBtn.disabled = false;
      playBtn.innerText = 'Play Again';
      playBtn.onclick = () => runGameRound();
      return;
    }

    minesState.revealed.add(idx);
    cell.classList.add('mine-tile-gem');
    cell.innerHTML = `<span class="mine-tile-inner">💎</span>`;
    cell.disabled = true;

    const totalSafe = 25 - minesState.minesCount;
    minesState.currentMult = parseFloat((1 + (minesState.revealed.size / Math.max(1, totalSafe)) * (minesState.minesCount * 0.95) + minesState.revealed.size * 0.25).toFixed(2));
    const multEl = document.getElementById('demoMultiplierDisplay');
    multEl.innerText = minesState.currentMult.toFixed(2) + 'x';
    multEl.classList.remove('game-pop-win');
    void multEl.offsetWidth;
    multEl.classList.add('game-pop-win');
    document.getElementById('demoStatusText').innerText = `Gem found! ${minesState.currentMult.toFixed(2)}x · Cash out or keep going`;
  }, 150);
}

function cashOutMines() {
  if (!minesState || minesState.finished || minesState.revealed.size === 0) {
    showToast('Reveal at least one gem first', '!');
    return;
  }
  minesState.finished = true;
  const payout = parseFloat((minesState.bet * minesState.currentMult).toFixed(2));
  userBalance += payout;
  updateWalletDisplay();
  const multEl = document.getElementById('demoMultiplierDisplay');
  multEl.style.color = '#10b981';
  multEl.classList.add('game-pop-win');
  document.getElementById('demoStatusText').innerText = `Cashed out ${minesState.currentMult.toFixed(2)}x · Won +${formatMoney(payout)}`;
  const playBtn = document.getElementById('demoPlayBtn');
  playBtn.disabled = false;
  playBtn.innerText = 'Play Again';
  playBtn.onclick = () => runGameRound();
}

// 3. ANIMATED DICE / KENO (smooth rolling counter + slider + 1-in-10 win rate)
function playDice(bet) {
  const target = Math.min(99, Math.max(2, parseInt(document.getElementById('demoTargetInput').value, 10) || 50));
  userBalance -= bet;
  updateWalletDisplay();

  const playBtn = document.getElementById('demoPlayBtn');
  const multEl = document.getElementById('demoMultiplierDisplay');
  const statusEl = document.getElementById('demoStatusText');
  const board = document.getElementById('demoGameBoard');
  playBtn.disabled = true;

  // Low win-rate outcome
  const won = rollOneInTenWin();
  const finalRoll = won
    ? Math.floor(Math.random() * (target - 1)) + 1
    : target + Math.floor(Math.random() * (100 - target + 1));

  board.style.display = 'block';
  board.style.gridTemplateColumns = '';
  board.style.maxWidth = '100%';
  board.innerHTML = `
    <div class="dice-3d-scene">
      <div class="dice-3d-cube is-rolling" id="dice3dCube">
        <div class="dice-face f1">⚀</div>
        <div class="dice-face f2">⚁</div>
        <div class="dice-face f3">⚂</div>
        <div class="dice-face f4">⚃</div>
        <div class="dice-face f5">⚄</div>
        <div class="dice-face f6">⚅</div>
      </div>
    </div>
    <div class="dice-track">
      <div class="dice-win-zone" style="width:${target}%;"></div>
      <div class="dice-marker" id="diceMarkerPin" style="left:50%;">▼</div>
    </div>
  `;

  multEl.style.color = '#a78bfa';
  statusEl.innerText = `Rolling under ${target}...`;

  stopGameAnimations();
  animateNumberRoll(
    multEl,
    680,
    (t) => {
      if (t >= 1) return String(finalRoll);
      const temp = Math.floor(Math.random() * 100) + 1;
      const pin = document.getElementById('diceMarkerPin');
      if (pin) pin.style.left = temp + '%';
      return String(temp);
    },
    () => {
      const pin = document.getElementById('diceMarkerPin');
      if (pin) pin.style.left = finalRoll + '%';
      const cube = document.getElementById('dice3dCube');
      if (cube) cube.classList.remove('is-rolling');
      const mult = won ? parseFloat((99 / target).toFixed(2)) : 0;
      const payout = won ? parseFloat((bet * mult).toFixed(2)) : 0;
      if (won) {
        userBalance += payout;
        updateWalletDisplay();
        multEl.style.color = '#10b981';
        multEl.classList.add('game-pop-win');
        statusEl.innerText = `Rolled ${finalRoll} < ${target} · ${mult.toFixed(2)}x · Won +${formatMoney(payout)}`;
      } else {
        multEl.style.color = '#ef4444';
        multEl.classList.add('game-shake-loss');
        statusEl.innerText = `Rolled ${finalRoll} ≥ ${target} · Lost ${formatMoney(bet)}`;
      }
      playBtn.disabled = false;
    }
  );
}

// 4. ANIMATED PLINKO (bouncing ball through peg rows + 1-in-10 profit bucket)
function playPlinko(bet) {
  userBalance -= bet;
  updateWalletDisplay();

  const playBtn = document.getElementById('demoPlayBtn');
  const multEl = document.getElementById('demoMultiplierDisplay');
  const statusEl = document.getElementById('demoStatusText');
  const board = document.getElementById('demoGameBoard');
  playBtn.disabled = true;

  const buckets = [16, 4, 1.5, 0.5, 0.3, 0.2, 0.3, 0.5, 1.5, 4, 16];
  const won = rollOneInTenWin();
  // Profit buckets: indices 0, 1, 2, 8, 9, 10 (>= 1.5x); Loss buckets: 3, 4, 5, 6, 7 (< 1x)
  const winIndices = [0, 1, 2, 8, 9, 10];
  const lossIndices = [3, 4, 5, 6, 7];
  const targetIdx = won
    ? winIndices[Math.floor(Math.random() * winIndices.length)]
    : lossIndices[Math.floor(Math.random() * lossIndices.length)];

  // Build 6-row 3D peg pyramid
  let pegsHTML = '<div class="plinko-pegs-3d">';
  for (let row = 0; row < 6; row++) {
    pegsHTML += '<div class="plinko-peg-row">';
    for (let col = 0; col <= row + 2; col++) {
      pegsHTML += '<span class="plinko-peg-3d"></span>';
    }
    pegsHTML += '</div>';
  }
  pegsHTML += '</div>';

  board.style.display = 'block';
  board.style.gridTemplateColumns = '';
  board.style.maxWidth = '100%';
  board.innerHTML = `
    <div class="plinko-stage plinko-3d-stage" id="plinkoStage">
      ${pegsHTML}
      <div class="plinko-ball plinko-ball-3d" id="plinkoBall" style="left:50%; top:6px;"></div>
      <div class="plinko-buckets">
        ${buckets.map((b, i) => `<div class="plinko-bucket ${b >= 1 ? 'plinko-bucket-win' : 'plinko-bucket-loss'}" id="plinkoB_${i}">${b}x</div>`).join('')}
      </div>
    </div>
  `;

  multEl.style.color = '#a78bfa';
  multEl.innerText = 'DROP';
  statusEl.innerText = 'Ball bouncing through pegs...';

  stopGameAnimations();
  const start = performance.now();
  const duration = 950;
  const targetPct = ((targetIdx + 0.5) / buckets.length) * 100;

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const ball = document.getElementById('plinkoBall');
    if (ball) {
      const wobble = Math.sin(t * Math.PI * 7) * (1 - t) * 14;
      const curLeft = 50 + (targetPct - 50) * t + wobble;
      const curTop = 6 + t * 68;
      ball.style.left = `${Math.max(5, Math.min(95, curLeft))}%`;
      ball.style.top = `${curTop}px`;
    }
    if (t < 1) {
      demoAnimFrame = requestAnimationFrame(step);
    } else {
      demoAnimFrame = null;
      const bucketEl = document.getElementById(`plinkoB_${targetIdx}`);
      if (bucketEl) bucketEl.classList.add('plinko-bucket-hit');

      const mult = buckets[targetIdx];
      const payout = parseFloat((bet * mult).toFixed(2));
      userBalance += payout;
      updateWalletDisplay();

      multEl.innerText = mult.toFixed(2) + 'x';
      if (mult >= 1) {
        multEl.style.color = '#10b981';
        multEl.classList.add('game-pop-win');
        statusEl.innerText = `Landed in ${mult}x! Won +${formatMoney(payout)}`;
      } else {
        multEl.style.color = '#ef4444';
        multEl.classList.add('game-shake-loss');
        statusEl.innerText = `Landed in ${mult}x · Returned ${formatMoney(payout)}`;
      }
      playBtn.disabled = false;
    }
  }
  demoAnimFrame = requestAnimationFrame(step);
}

// 5. ANIMATED 2D/3D CARD DEAL & FLIP BLACKJACK (1-in-10 win rate)
function cardValue(card) {
  const v = card % 13;
  if (v === 0) return 11;
  if (v >= 10) return 10;
  return v + 1;
}
function cardLabel(card) {
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const suits = ['♠', '♥', '♦', '♣'];
  return ranks[card % 13] + suits[Math.floor(card / 13) % 4];
}
function handTotal(cards) {
  let total = 0, aces = 0;
  cards.forEach(c => {
    const v = cardValue(c);
    total += v;
    if (v === 11) aces++;
  });
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function startBlackjack(bet) {
  userBalance -= bet;
  updateWalletDisplay();

  const deck = [];
  for (let i = 0; i < 52; i++) deck.push(i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Decide rigged 1-in-10 outcome for this hand
  const allowPlayerWin = rollOneInTenWin();

  bjState = {
    bet,
    deck,
    player: [deck.pop(), deck.pop()],
    dealer: [deck.pop(), deck.pop()],
    finished: false,
    allowPlayerWin,
    animateNew: true
  };

  renderBlackjack();
  document.getElementById('demoPlayBtn').disabled = true;
}

function renderBlackjack() {
  if (!bjState) return;
  const board = document.getElementById('demoGameBoard');
  board.style.display = 'block';
  board.style.gridTemplateColumns = '';
  board.style.maxWidth = '100%';
  const pTotal = handTotal(bjState.player);

  board.innerHTML = `
    <div style="text-align:left; font-size:13px; margin-bottom:10px;">
      <div style="color:var(--muted); margin-bottom:4px;">Dealer ${bjState.finished ? '(' + handTotal(bjState.dealer) + ')' : ''}</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${bjState.dealer.map((c, i) => {
          const animClass = bjState.animateNew ? 'card-deal-anim' : '';
          const delay = `animation-delay:${i * 90}ms;`;
          if (!bjState.finished && i === 1) {
            return `<div class="playing-card-2d playing-card-back ${animClass}" style="${delay}">?</div>`;
          }
          const red = (Math.floor(c / 13) % 4) === 1 || (Math.floor(c / 13) % 4) === 2;
          return `<div class="playing-card-2d ${red ? 'card-red' : 'card-black'} ${animClass}" style="${delay}">${cardLabel(c)}</div>`;
        }).join('')}
      </div>
    </div>
    <div style="text-align:left; font-size:13px;">
      <div style="color:var(--muted); margin-bottom:4px;">You (${pTotal})</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${bjState.player.map((c, i) => {
          const animClass = bjState.animateNew ? 'card-deal-anim' : '';
          const delay = `animation-delay:${(i + 2) * 90}ms;`;
          const red = (Math.floor(c / 13) % 4) === 1 || (Math.floor(c / 13) % 4) === 2;
          return `<div class="playing-card-2d ${red ? 'card-red' : 'card-black'} ${animClass}" style="${delay}">${cardLabel(c)}</div>`;
        }).join('')}
      </div>
    </div>
    ${!bjState.finished ? `
      <div style="display:flex; gap:8px; margin-top:12px; justify-content:center;">
        <button class="liquid-btn btn-emerald" style="padding:7px 16px; font-size:12px;" onclick="bjHit()">Hit</button>
        <button class="liquid-btn" style="padding:7px 16px; font-size:12px;" onclick="bjStand()">Stand</button>
      </div>
    ` : ''}
  `;
  bjState.animateNew = false;

  const multEl = document.getElementById('demoMultiplierDisplay');
  multEl.innerText = pTotal > 21 ? 'BUST' : pTotal.toString();
  multEl.style.color = pTotal > 21 ? '#ef4444' : '#a78bfa';
  if (!bjState.finished) {
    document.getElementById('demoStatusText').innerText = `Your hand: ${pTotal} · Hit or Stand`;
  }
}

function bjHit() {
  if (!bjState || bjState.finished) return;
  const curTotal = handTotal(bjState.player);
  let nextCard = bjState.deck.pop();

  // If player is NOT in the 1-in-10 win bucket and curTotal >= 12, steer toward a bust card
  if (!bjState.allowPlayerWin && curTotal >= 12) {
    const bustIdx = bjState.deck.findIndex(c => curTotal + cardValue(c) > 21);
    if (bustIdx !== -1) {
      nextCard = bjState.deck.splice(bustIdx, 1)[0];
    }
  }

  bjState.player.push(nextCard);
  const total = handTotal(bjState.player);
  if (total > 21) {
    bjState.finished = true;
    const multEl = document.getElementById('demoMultiplierDisplay');
    multEl.classList.add('game-shake-loss');
    document.getElementById('demoStatusText').innerText = `Bust! Lost ${formatMoney(bjState.bet)}`;
    const playBtn = document.getElementById('demoPlayBtn');
    playBtn.disabled = false;
    playBtn.innerText = 'Play Again';
    playBtn.onclick = () => runGameRound();
  }
  renderBlackjack();
}

function bjStand() {
  if (!bjState || bjState.finished) return;
  const p = handTotal(bjState.player);

  if (bjState.allowPlayerWin) {
    // 1-in-10 win: dealer draws until busting or stopping below player
    while (handTotal(bjState.dealer) < 17) {
      bjState.dealer.push(bjState.deck.pop());
    }
    if (handTotal(bjState.dealer) <= 21 && handTotal(bjState.dealer) >= p) {
      // Force dealer to draw a bust card
      const bustIdx = bjState.deck.findIndex(c => handTotal(bjState.dealer) + cardValue(c) > 21);
      if (bustIdx !== -1) bjState.dealer.push(bjState.deck.splice(bustIdx, 1)[0]);
    }
  } else {
    // 9-in-10 loss: dealer draws cards that beat player without busting
    while (handTotal(bjState.dealer) <= p && handTotal(bjState.dealer) < 21) {
      const neededMin = Math.max(1, p + 1 - handTotal(bjState.dealer));
      const neededMax = 21 - handTotal(bjState.dealer);
      const goodIdx = bjState.deck.findIndex(c => {
        const v = cardValue(c) === 11 && handTotal(bjState.dealer) + 11 > 21 ? 1 : cardValue(c);
        return v >= neededMin && v <= neededMax;
      });
      if (goodIdx !== -1) {
        bjState.dealer.push(bjState.deck.splice(goodIdx, 1)[0]);
      } else {
        bjState.dealer.push(bjState.deck.pop());
      }
    }
  }

  bjState.finished = true;
  const d = handTotal(bjState.dealer);
  let result = '';
  let payout = 0;
  const multEl = document.getElementById('demoMultiplierDisplay');

  if (d > 21 || p > d) {
    payout = parseFloat((bjState.bet * 2).toFixed(2));
    userBalance += payout;
    result = `You win! +${formatMoney(payout)}`;
    multEl.classList.add('game-pop-win');
  } else {
    result = `Dealer wins (${d} vs ${p}) · Lost ${formatMoney(bjState.bet)}`;
    multEl.classList.add('game-shake-loss');
  }
  updateWalletDisplay();
  document.getElementById('demoStatusText').innerText = result;
  const playBtn = document.getElementById('demoPlayBtn');
  playBtn.disabled = false;
  playBtn.innerText = 'Play Again';
  playBtn.onclick = () => runGameRound();
  renderBlackjack();
}

// 6. ANIMATED 3D CARD FLIP HI-LO (1-in-10 win rate)
function playHiLo(bet) {
  userBalance -= bet;
  updateWalletDisplay();

  const playBtn = document.getElementById('demoPlayBtn');
  const multEl = document.getElementById('demoMultiplierDisplay');
  const statusEl = document.getElementById('demoStatusText');
  const board = document.getElementById('demoGameBoard');
  playBtn.disabled = true;

  // Low win-rate outcome
  const won = rollOneInTenWin();
  const suit = Math.floor(Math.random() * 4);
  const rank = won
    ? (6 + Math.floor(Math.random() * 7)) // 7..K (win)
    : Math.floor(Math.random() * 6);       // A..6 (loss)
  const card = suit * 13 + rank;
  const red = suit === 1 || suit === 2;

  board.style.display = 'block';
  board.style.gridTemplateColumns = '';
  board.style.maxWidth = '100%';
  board.innerHTML = `
    <div style="display:flex; justify-content:center; perspective:700px;">
      <div class="hilo-card-flip" id="hiloFlipCard">
        <div class="hilo-card-face hilo-card-front">?</div>
        <div class="hilo-card-face hilo-card-back ${red ? 'card-red' : 'card-black'}">${cardLabel(card)}</div>
      </div>
    </div>
  `;

  multEl.style.color = '#a78bfa';
  multEl.innerText = '...';
  statusEl.innerText = 'Flipping card...';

  setTimeout(() => {
    const cardEl = document.getElementById('hiloFlipCard');
    if (cardEl) cardEl.classList.add('is-flipped');
  }, 60);

  setTimeout(() => {
    const mult = 1.9;
    const payout = won ? parseFloat((bet * mult).toFixed(2)) : 0;
    if (won) {
      userBalance += payout;
      updateWalletDisplay();
      multEl.innerText = mult.toFixed(1) + 'x';
      multEl.style.color = '#10b981';
      multEl.classList.add('game-pop-win');
      statusEl.innerText = `High card! Won +${formatMoney(payout)}`;
    } else {
      multEl.innerText = '0x';
      multEl.style.color = '#ef4444';
      multEl.classList.add('game-shake-loss');
      statusEl.innerText = `Low card · Lost ${formatMoney(bet)}`;
    }
    playBtn.disabled = false;
  }, 560);
}

// 7. ANIMATED SPINNING ROULETTE / WHEEL (low win rate)
function playRoulette(bet) {
  const choice = (document.getElementById('demoTargetInput').value || 'red').toString().toLowerCase().trim();
  userBalance -= bet;
  updateWalletDisplay();

  const playBtn = document.getElementById('demoPlayBtn');
  const multEl = document.getElementById('demoMultiplierDisplay');
  const statusEl = document.getElementById('demoStatusText');
  const board = document.getElementById('demoGameBoard');
  playBtn.disabled = true;

  const redNums = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const blackNums = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

  // Low win-rate outcome
  const won = rollOneInTenWin();
  let result = 0;
  let mult = 2;

  if (choice === 'red') {
    mult = 2;
    result = won ? redNums[Math.floor(Math.random() * redNums.length)] : blackNums[Math.floor(Math.random() * blackNums.length)];
  } else if (choice === 'black') {
    mult = 2;
    result = won ? blackNums[Math.floor(Math.random() * blackNums.length)] : redNums[Math.floor(Math.random() * redNums.length)];
  } else {
    const chosenNum = Math.min(36, Math.max(0, parseInt(choice, 10) || 0));
    mult = 35;
    if (won) {
      result = chosenNum;
    } else {
      result = (chosenNum + 1 + Math.floor(Math.random() * 35)) % 37;
    }
  }

  const isRed = redNums.includes(result);

  board.style.display = 'block';
  board.style.gridTemplateColumns = '';
  board.style.maxWidth = '100%';
  board.innerHTML = `
    <div class="roulette-3d-stage">
      <div class="roulette-pointer">▼</div>
      <div class="roulette-wheel-3d" id="rouletteSpinner">
        <div class="roulette-wheel-hub"></div>
        <div class="roulette-wheel-ball"></div>
      </div>
    </div>
  `;

  multEl.style.color = '#a78bfa';
  statusEl.innerText = 'Wheel spinning...';

  stopGameAnimations();
  animateNumberRoll(
    multEl,
    900,
    (t) => {
      if (t >= 1) return result === 0 ? '0' : (isRed ? result + ' R' : result + ' B');
      const r = Math.floor(Math.random() * 37);
      return r === 0 ? '0' : (redNums.includes(r) ? r + ' R' : r + ' B');
    },
    () => {
      const spinner = document.getElementById('rouletteSpinner');
      if (spinner) spinner.style.animation = 'none';
      const payout = won ? parseFloat((bet * mult).toFixed(2)) : 0;
      multEl.style.color = result === 0 ? '#10b981' : (isRed ? '#ef4444' : '#e2e8f0');
      if (won) {
        userBalance += payout;
        updateWalletDisplay();
        multEl.classList.add('game-pop-win');
        statusEl.innerText = `Hit! ${mult}x · Won +${formatMoney(payout)}`;
      } else {
        multEl.classList.add('game-shake-loss');
        statusEl.innerText = `No hit · Lost ${formatMoney(bet)}`;
      }
      playBtn.disabled = false;
    }
  );
}

let currentChannel = '#general-lobby';
function switchChannel(channel, el) {
  currentChannel = channel;
  document.querySelectorAll('.discord-channel').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('currentChannelTitle').innerText = channel;
  document.getElementById('discordChatInput').placeholder = `Message ${channel}...`;
  renderDiscordMessages();
}

function renderDiscordMessages() {
  const msgs = discordMessages[currentChannel] || [];
  document.getElementById('discordMessagesList').innerHTML = msgs.map(m => {
    const unameKey = (m.username || m.user || '').toLowerCase();
    const liveAcc = accountsDB[unameKey];
    const displayName = liveAcc ? (liveAcc.displayName || liveAcc.username) : m.user;
    const avatarHTML = liveAcc
      ? getDisplayAvatarInnerHTML(liveAcc, displayName)
      : (m.pfpType === 'upload' && m.pfpValue
          ? `<img src="${m.pfpValue}" alt="PFP">`
          : (m.pfpType === 'preset' && m.pfpValue
              ? escapeHTML(m.pfpValue)
              : escapeHTML(m.pfp || displayName.charAt(0).toUpperCase())));

    return `
      <div class="discord-msg">
        <div class="discord-msg-avatar" onclick="inspectChatMember('${escapeHTML(unameKey)}', '${escapeHTML(displayName)}')" title="View Profile">${avatarHTML}</div>
        <div class="discord-msg-content">
          <div class="discord-msg-meta">
            <span class="discord-msg-user" onclick="inspectChatMember('${escapeHTML(unameKey)}', '${escapeHTML(displayName)}')">${escapeHTML(displayName)}</span>
            <span class="discord-msg-time">${escapeHTML(m.time)}</span>
          </div>
          <div class="discord-msg-text">${escapeHTML(m.text)}</div>
        </div>
      </div>
    `;
  }).join('');
  const box = document.getElementById('discordMessagesList');
  box.scrollTop = box.scrollHeight;
}

function handleDiscordKey(e) { if (e.key === 'Enter') sendDiscordMsg(); }
function sendDiscordMsg() {
  const input = document.getElementById('discordChatInput');
  const txt = input.value.trim();
  if (!txt) return;
  const acc = getActiveAccount();
  const displayName = acc ? (acc.displayName || acc.username) : 'Guest';
  const usernameKey = acc ? acc.username.toLowerCase() : 'guest';
  const pfpLetter = displayName.charAt(0).toUpperCase();
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!discordMessages[currentChannel]) discordMessages[currentChannel] = [];
  discordMessages[currentChannel].push({
    username: usernameKey,
    user: displayName,
    pfp: pfpLetter,
    pfpType: acc ? acc.pfpType : 'letter',
    pfpValue: acc ? acc.pfpValue : '',
    time: timeNow,
    text: txt
  });
  input.value = '';
  renderDiscordMessages();
  saveState();
}

function renderNews() {
  document.getElementById('publicNewsList').innerHTML = newsList.map(n => `
    <div class="liquid-panel" style="padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <h3 style="margin:0; font-size:14px; color:#fff;">${escapeHTML(n.title)}</h3>
        <span class="mono" style="font-size:10px; color:var(--accent-light);">${escapeHTML(n.time || '')}</span>
      </div>
      <p style="margin:0; color:var(--muted); font-size:12.5px; line-height:1.45;">${escapeHTML(n.content)}</p>
    </div>
  `).join('');
}

function publishNews(e) {
  e.preventDefault();
  const title = document.getElementById('newsTitleInput').value.trim();
  const content = document.getElementById('newsContentInput').value.trim();
  if (!title || !content) return;
  newsList.unshift({ title, content, time: 'Just now' });
  document.getElementById('broadcastFeedDisplay').innerHTML = `<strong>${escapeHTML(title)}:</strong> ${escapeHTML(content)}`;
  document.getElementById('newsTitleInput').value = '';
  document.getElementById('newsContentInput').value = '';
  saveState();
  renderNews();
  closeOwnerDashboard();
  showToast('Announcement published');
}

const _ENC_PASS = "U3Bpa2V5OSRAIyY=";
let ownerUnlockedThisSession = safeGetStorage('spikey_owner_unlocked', '0') === '1';

function openOwnerLogin() {
  if (ownerUnlockedThisSession) {
    updateOwnerLogsTable();
    updateBannedDisplay();
    document.getElementById('ownerDashboardModal').style.display = 'flex';
    return;
  }
  document.getElementById('ownerLoginModal').style.display = 'flex';
}
function closeOwnerLogin() { document.getElementById('ownerLoginModal').style.display = 'none'; }

function verifyOwnerPassword(e) {
  e.preventDefault();
  if (document.getElementById('ownerPassInput').value === atob(_ENC_PASS)) {
    closeOwnerLogin();
    document.getElementById('ownerPassInput').value = '';
    ownerUnlockedThisSession = true;
    safeSetStorage('spikey_owner_unlocked', '1');
    updateOwnerLogsTable();
    updateBannedDisplay();
    document.getElementById('ownerDashboardModal').style.display = 'flex';
    showToast('Owner panel unlocked & remembered');
  } else {
    showToast('Incorrect password', '!');
  }
}


function ownerGrantBalance() {
  const userInput = (document.getElementById('grantUsernameInput')?.value || '').trim();
  const amt = parseFloat(document.getElementById('grantAmountInput')?.value);
  const status = document.getElementById('grantBalanceStatus');
  if (!userInput) {
    if (status) status.innerText = 'Enter a username.';
    showToast('Enter a username', '!');
    return;
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    if (status) status.innerText = 'Enter a valid amount.';
    showToast('Enter a valid amount', '!');
    return;
  }
  const key = userInput.toLowerCase();
  const acc = accountsDB[key];
  if (!acc) {
    if (status) status.innerText = 'User not found.';
    showToast('User not found', '!');
    return;
  }
  const before = typeof acc.balance === 'number' ? acc.balance : 0;
  acc.balance = Number((before + amt).toFixed(2));
  accountsDB[key] = acc;
  // If granting to current session user, update live wallet
  if (currentUser && currentUser.toLowerCase() === key) {
    userBalance = acc.balance;
    updateWalletDisplay();
  }
  saveState();
  // Log for owner history
  try {
    ownerLogs.unshift({
      time: new Date().toLocaleString(),
      email: acc.username || userInput,
      cardDispatched: formatMoney(amt),
      details: `Owner granted +${formatMoney(amt)} site balance (was ${formatMoney(before)})`,
      giftCardNum: '',
      giftCardExp: '',
      giftCardCvv: ''
    });
    if (ownerLogs.length > 200) ownerLogs.length = 200;
    safeSetStorage('spikey_owner_logs', JSON.stringify(ownerLogs));
    if (typeof updateOwnerLogsTable === 'function') updateOwnerLogsTable();
  } catch (_) {}
  if (status) status.innerText = `Granted ${formatMoney(amt)} to ${acc.displayName || acc.username}. New balance: ${formatMoney(acc.balance)}`;
  showToast(`Granted ${formatMoney(amt)} to ${acc.displayName || acc.username}`, '💰');
  const amtEl = document.getElementById('grantAmountInput');
  if (amtEl) amtEl.value = '';
}

function lockOwnerPanel() {
  ownerUnlockedThisSession = false;
  safeRemoveStorage('spikey_owner_unlocked');
  closeOwnerDashboard();
  showToast('Owner panel locked');
}

function closeOwnerDashboard() { 
  document.getElementById('ownerDashboardModal').style.display = 'none'; 
  // Everything is already saved via saveState() on each action
}

function clearOwnerLogs() {
  ownerLogs = [];
  saveState();
  updateOwnerLogsTable();
  showToast('Order history cleared');
}

function copyOwnerGiftCard(index) {
  const entry = ownerLogs[index];
  if (!entry) return;
  const copyText = entry.giftCardNum
    ? `Gift Card: ${entry.giftCardNum} | Exp: ${entry.giftCardExp} | CVV/PIN: ${entry.giftCardCvv} | Email: ${entry.email}`
    : entry.details;
  copyTextToClipboard(copyText, 'Copied gift card info!');
}

function updateOwnerLogsTable() {
  const tbody = document.getElementById('ownerLogsBody');
  if (ownerLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:14px; text-align:center; color:var(--muted);">No submissions recorded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = ownerLogs.map((l, idx) => {
    const giftCardHTML = l.giftCardNum
      ? `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <div style="color:#34d399; font-weight:700;">Card: ${escapeHTML(l.giftCardNum)}</div>
            <div style="color:#a78bfa; font-size:10px; margin-top:2px;">EXP: ${escapeHTML(l.giftCardExp)} · CVV/PIN: ${escapeHTML(l.giftCardCvv)}</div>
            ${l.itemsSummary ? `<div style="color:var(--muted); font-size:10px; margin-top:2px;">Items: ${escapeHTML(l.itemsSummary)}</div>` : ''}
          </div>
          <button type="button" class="receipt-copy-btn" onclick="copyOwnerGiftCard(${idx})">Copy</button>
        </div>
      `
      : `<span style="color:#a78bfa;">${escapeHTML(l.details)}</span>`;

    return `
      <tr style="border-bottom:1px solid rgba(167,139,250,0.14);">
        <td style="padding:8px; color:var(--muted); white-space:nowrap;">${escapeHTML(l.time)}</td>
        <td style="padding:8px; color:#fff;">${escapeHTML(l.email)}</td>
        <td style="padding:8px; color:#10b981; font-weight:700; white-space:nowrap;">${escapeHTML(l.cardDispatched)}</td>
        <td style="padding:8px; font-family:'JetBrains Mono',monospace;">${giftCardHTML}</td>
      </tr>
    `;
  }).join('');
}

function toggleSpikeyChat() { const el = document.getElementById('spikeyChatBox'); if (el) el.classList.toggle('open'); }
function handleSpikeyKey(e) { if (e.key === 'Enter') sendSpikeyMsg(); }

let spikeyAiHistory = [];
let spikeyAiBusy = false;

function loadSpikeyAiSettings() {
  const model = safeGetStorage('spikey_ai_model', 'openrouter:auto');
  const modelEl = document.getElementById('spikeyModelSelect');
  if (modelEl) {
    if (![...modelEl.options].some(o => o.value === model)) {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelEl.appendChild(opt);
    }
    modelEl.value = model;
  }
}

function saveSpikeyAiSettings() {
  const modelEl = document.getElementById('spikeyModelSelect');
  if (modelEl) safeSetStorage('spikey_ai_model', modelEl.value || 'openrouter:auto');
}

function getSpikeyModel() {
  const modelEl = document.getElementById('spikeyModelSelect');
  return modelEl?.value || safeGetStorage('spikey_ai_model', 'openrouter:auto') || 'openrouter:auto';
}

function appendSpikeyBubble(text, kind) {
  const box = document.getElementById('spikeyMessages');
  if (!box) return;
  const cls = kind === 'user' ? 'user' : (kind === 'err' ? 'err' : 'bot');
  box.insertAdjacentHTML('beforeend', `<div class="spikey-bubble ${cls}">${kind === 'bot' || kind === 'err' ? text : escapeHTML(text)}</div>`);
  box.scrollTop = box.scrollHeight;
}

function clearSpikeyChat() {
  spikeyAiHistory = [];
  const box = document.getElementById('spikeyMessages');
  if (box) {
    box.innerHTML = `<div class="spikey-bubble bot">Chat cleared. Sign up with <strong>email</strong> on Puter if prompted, then ask away.</div>`;
  }
}

function extractPuterText(result) {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  if (typeof result === 'object') {
    if (typeof result.message === 'string') return result.message;
    if (result.message?.content) {
      const c = result.message.content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) return c.map(p => (typeof p === 'string' ? p : p.text || '')).join('');
    }
    if (typeof result.text === 'string') return result.text;
    if (typeof result.content === 'string') return result.content;
    if (Array.isArray(result)) return result.map(extractPuterText).join('');
  }
  try { return JSON.stringify(result).slice(0, 2000); } catch { return String(result); }
}

async function sendSpikeyMsg() {
  const input = document.getElementById('spikeyInput');
  const text = (input?.value || '').trim();
  if (!text || spikeyAiBusy) return;
  appendSpikeyBubble(text, 'user');
  input.value = '';

  spikeyAiBusy = true;
  const btn = document.getElementById('spikeySendBtn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  appendSpikeyBubble('<em>Thinking…</em>', 'bot');
  const box = document.getElementById('spikeyMessages');
  const thinkingEl = box?.lastElementChild;

  try {
    if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
      throw new Error('Puter.js not loaded. Open this site over http://localhost (not file://).');
    }
    const model = getSpikeyModel();
    spikeyAiHistory.push({ role: 'user', content: text });
    if (spikeyAiHistory.length > 24) spikeyAiHistory = spikeyAiHistory.slice(-24);

    const systemText = 'You are Spikey AI, assistant for Sp1k3y\'s Vault — a simulated crypto wallet, stock/crypto markets, and card vault site. Site balance is simulated only; no real crypto transfers. Be concise, friendly, and helpful.';
    const messages = [
      { role: 'system', content: systemText },
      ...spikeyAiHistory
    ];
    const result = await puter.ai.chat(messages, { model });
    const reply = extractPuterText(result) || 'No response.';
    spikeyAiHistory.push({ role: 'assistant', content: reply });
    if (thinkingEl) thinkingEl.remove();
    appendSpikeyBubble(escapeHTML(reply), 'bot');
  } catch (err) {
    if (thinkingEl) thinkingEl.remove();
    appendSpikeyBubble(escapeHTML('Puter AI error: ' + (err && err.message ? err.message : err)), 'err');
  } finally {
    spikeyAiBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try { loadSpikeyAiSettings(); } catch (_) {}
});


let searchDebounceTimer = null;
function handleSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = input.value.trim().length > 0 ? 'grid' : 'none';
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    applyCardFilters(true);
    applyGameFilters(true);
    applyStockFilters(true);
    if (typeof applyCryptoFilters === 'function') applyCryptoFilters(true);
  }, 120);
}

function handleSearchKey(e) {
  if (e.key === 'Enter') {
    const vaultTab = document.getElementById('tab-vault');
    const catalogTab = document.getElementById('tab-catalog');
    if (vaultTab.style.display === 'none' && catalogTab.style.display === 'none') {
      const firstNav = document.querySelector('.sidebar-nav .nav-item');
      switchTab('vault', firstNav);
    }
  }
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = '';
  handleSearch();
  input.focus();
}

setQualityMode(qualityMode, false);
applyCardFilters(true);
applyGameFilters(true);
renderNews();
renderDiscordMessages();
updateWalletDisplay();


// ─── 500 Real Publicly Traded Companies Stock Market ───────────────────────
const REAL_500_COMPANIES = [
  {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "price": 349.17
  },
  {
    "ticker": "MSFT",
    "name": "Microsoft Corporation",
    "sector": "Technology",
    "price": 498.16
  },
  {
    "ticker": "NVDA",
    "name": "NVIDIA Corporation",
    "sector": "Technology",
    "price": 146.01
  },
  {
    "ticker": "GOOGL",
    "name": "Alphabet Inc. (Class A)",
    "sector": "Communication Services",
    "price": 272.48
  },
  {
    "ticker": "GOOG",
    "name": "Alphabet Inc. (Class C)",
    "sector": "Communication Services",
    "price": 270.77
  },
  {
    "ticker": "AMZN",
    "name": "Amazon.com, Inc.",
    "sector": "Consumer Cyclical",
    "price": 257.18
  },
  {
    "ticker": "AVGO",
    "name": "Broadcom Inc.",
    "sector": "Technology",
    "price": 346.58
  },
  {
    "ticker": "META",
    "name": "Meta Platforms, Inc.",
    "sector": "Communication Services",
    "price": 596.24
  },
  {
    "ticker": "TSLA",
    "name": "Tesla, Inc.",
    "sector": "Consumer Cyclical",
    "price": 374.31
  },
  {
    "ticker": "LLY",
    "name": "Eli Lilly and Company",
    "sector": "Healthcare",
    "price": 1351.65
  },
  {
    "ticker": "BRK.B",
    "name": "Berkshire Hathaway Inc.",
    "sector": "Financial",
    "price": 572.2
  },
  {
    "ticker": "WMT",
    "name": "Walmart Inc.",
    "sector": "Consumer Defensive",
    "price": 126.07
  },
  {
    "ticker": "AMD",
    "name": "Advanced Micro Devices, Inc.",
    "sector": "Technology",
    "price": 489.17
  },
  {
    "ticker": "JPM",
    "name": "JPMorgan Chase & Co.",
    "sector": "Financial",
    "price": 320.22
  },
  {
    "ticker": "MU",
    "name": "Micron Technology, Inc.",
    "sector": "Technology",
    "price": 690.05
  },
  {
    "ticker": "V",
    "name": "Visa Inc.",
    "sector": "Financial",
    "price": 402.42
  },
  {
    "ticker": "JNJ",
    "name": "Johnson & Johnson",
    "sector": "Healthcare",
    "price": 267.1
  },
  {
    "ticker": "XOM",
    "name": "Exxon Mobil Corporation",
    "sector": "Energy",
    "price": 158.95
  },
  {
    "ticker": "MA",
    "name": "Mastercard Incorporated",
    "sector": "Financial",
    "price": 626.97
  },
  {
    "ticker": "ABBV",
    "name": "AbbVie Inc.",
    "sector": "Healthcare",
    "price": 283.51
  },
  {
    "ticker": "COST",
    "name": "Costco Wholesale Corporation",
    "sector": "Consumer Defensive",
    "price": 1093.79
  },
  {
    "ticker": "KO",
    "name": "The Coca-Cola Company",
    "sector": "Consumer Defensive",
    "price": 96.11
  },
  {
    "ticker": "CVX",
    "name": "Chevron Corporation",
    "sector": "Energy",
    "price": 206.54
  },
  {
    "ticker": "PG",
    "name": "The Procter & Gamble Company",
    "sector": "Consumer Defensive",
    "price": 167.9
  },
  {
    "ticker": "CSCO",
    "name": "Cisco Systems, Inc.",
    "sector": "Technology",
    "price": 94.67
  },
  {
    "ticker": "PLTR",
    "name": "Palantir Technologies Inc.",
    "sector": "Technology",
    "price": 153.59
  },
  {
    "ticker": "ORCL",
    "name": "Oracle Corporation",
    "sector": "Technology",
    "price": 110.5
  },
  {
    "ticker": "MRK",
    "name": "Merck & Co., Inc.",
    "sector": "Healthcare",
    "price": 132.74
  },
  {
    "ticker": "GE",
    "name": "GE Aerospace",
    "sector": "Industrials",
    "price": 318.8
  },
  {
    "ticker": "BAC",
    "name": "Bank of America Corporation",
    "sector": "Financial",
    "price": 48.56
  },
  {
    "ticker": "HD",
    "name": "The Home Depot, Inc.",
    "sector": "Consumer Cyclical",
    "price": 336.83
  },
  {
    "ticker": "UNH",
    "name": "UnitedHealth Group Incorporated",
    "sector": "Healthcare",
    "price": 330.35
  },
  {
    "ticker": "PM",
    "name": "Philip Morris International Inc.",
    "sector": "Consumer Defensive",
    "price": 186.43
  },
  {
    "ticker": "INTC",
    "name": "Intel Corporation",
    "sector": "Technology",
    "price": 55.65
  },
  {
    "ticker": "MS",
    "name": "Morgan Stanley",
    "sector": "Financial",
    "price": 175.05
  },
  {
    "ticker": "AMAT",
    "name": "Applied Materials, Inc.",
    "sector": "Technology",
    "price": 338.83
  },
  {
    "ticker": "PANW",
    "name": "Palo Alto Networks, Inc.",
    "sector": "Technology",
    "price": 361.73
  },
  {
    "ticker": "TXN",
    "name": "Texas Instruments Incorporated",
    "sector": "Technology",
    "price": 285.7
  },
  {
    "ticker": "RTX",
    "name": "RTX Corporation",
    "sector": "Industrials",
    "price": 193.44
  },
  {
    "ticker": "LRCX",
    "name": "Lam Research Corporation",
    "sector": "Technology",
    "price": 203.67
  },
  {
    "ticker": "TMO",
    "name": "Thermo Fisher Scientific Inc.",
    "sector": "Healthcare",
    "price": 689.03
  },
  {
    "ticker": "CAT",
    "name": "Caterpillar Inc.",
    "sector": "Industrials",
    "price": 537.24
  },
  {
    "ticker": "GS",
    "name": "The Goldman Sachs Group, Inc.",
    "sector": "Financial",
    "price": 848.12
  },
  {
    "ticker": "NFLX",
    "name": "Netflix, Inc.",
    "sector": "Communication Services",
    "price": 58.45
  },
  {
    "ticker": "ANET",
    "name": "Arista Networks, Inc.",
    "sector": "Technology",
    "price": 189.72
  },
  {
    "ticker": "WFC",
    "name": "Wells Fargo & Company",
    "sector": "Financial",
    "price": 80.61
  },
  {
    "ticker": "CRWD",
    "name": "CrowdStrike Holdings, Inc.",
    "sector": "Technology",
    "price": 243.4
  },
  {
    "ticker": "AMGN",
    "name": "Amgen Inc.",
    "sector": "Healthcare",
    "price": 438.8
  },
  {
    "ticker": "LIN",
    "name": "Linde plc",
    "sector": "Materials",
    "price": 511.13
  },
  {
    "ticker": "IBM",
    "name": "International Business Machines",
    "sector": "Technology",
    "price": 223.22
  },
  {
    "ticker": "AXP",
    "name": "American Express Company",
    "sector": "Financial",
    "price": 310.75
  },
  {
    "ticker": "GILD",
    "name": "Gilead Sciences, Inc.",
    "sector": "Healthcare",
    "price": 166.13
  },
  {
    "ticker": "DIS",
    "name": "The Walt Disney Company",
    "sector": "Communication Services",
    "price": 120.15
  },
  {
    "ticker": "GEV",
    "name": "GE Vernova Inc.",
    "sector": "Industrials",
    "price": 752.0
  },
  {
    "ticker": "DELL",
    "name": "Dell Technologies Inc.",
    "sector": "Technology",
    "price": 310.05
  },
  {
    "ticker": "MCD",
    "name": "McDonald's Corporation",
    "sector": "Consumer Cyclical",
    "price": 272.2
  },
  {
    "ticker": "C",
    "name": "Citigroup Inc.",
    "sector": "Financial",
    "price": 114.99
  },
  {
    "ticker": "PEP",
    "name": "PepsiCo, Inc.",
    "sector": "Consumer Defensive",
    "price": 139.22
  },
  {
    "ticker": "VZ",
    "name": "Verizon Communications Inc.",
    "sector": "Communication Services",
    "price": 45.69
  },
  {
    "ticker": "APH",
    "name": "Amphenol Corporation",
    "sector": "Technology",
    "price": 75.71
  },
  {
    "ticker": "KLAC",
    "name": "KLA Corporation",
    "sector": "Technology",
    "price": 140.22
  },
  {
    "ticker": "ADI",
    "name": "Analog Devices, Inc.",
    "sector": "Technology",
    "price": 376.5
  },
  {
    "ticker": "ABT",
    "name": "Abbott Laboratories",
    "sector": "Healthcare",
    "price": 104.27
  },
  {
    "ticker": "WELL",
    "name": "Welltower Inc.",
    "sector": "Real Estate",
    "price": 242.07
  },
  {
    "ticker": "NEE",
    "name": "NextEra Energy, Inc.",
    "sector": "Utilities",
    "price": 83.82
  },
  {
    "ticker": "BLK",
    "name": "BlackRock, Inc.",
    "sector": "Financial",
    "price": 1134.78
  },
  {
    "ticker": "UNP",
    "name": "Union Pacific Corporation",
    "sector": "Industrials",
    "price": 290.5
  },
  {
    "ticker": "QCOM",
    "name": "QUALCOMM Incorporated",
    "sector": "Technology",
    "price": 160.39
  },
  {
    "ticker": "MMM",
    "name": "3M Company",
    "sector": "Industrials",
    "price": 181.31
  },
  {
    "ticker": "AOS",
    "name": "A. O. Smith Corporation",
    "sector": "Industrials",
    "price": 64.66
  },
  {
    "ticker": "ACN",
    "name": "Accenture plc",
    "sector": "Technology",
    "price": 227.82
  },
  {
    "ticker": "ADBE",
    "name": "Adobe Inc.",
    "sector": "Technology",
    "price": 226.27
  },
  {
    "ticker": "AES",
    "name": "The AES Corporation",
    "sector": "Utilities",
    "price": 15.02
  },
  {
    "ticker": "AFL",
    "name": "Aflac Incorporated",
    "sector": "Financial",
    "price": 125.37
  },
  {
    "ticker": "A",
    "name": "Agilent Technologies, Inc.",
    "sector": "Healthcare",
    "price": 177.18
  },
  {
    "ticker": "APD",
    "name": "Air Products and Chemicals, Inc.",
    "sector": "Materials",
    "price": 308.17
  },
  {
    "ticker": "ABNB",
    "name": "Airbnb, Inc.",
    "sector": "Consumer Cyclical",
    "price": 180.26
  },
  {
    "ticker": "AKAM",
    "name": "Akamai Technologies, Inc.",
    "sector": "Technology",
    "price": 91.7
  },
  {
    "ticker": "ALB",
    "name": "Albemarle Corporation",
    "sector": "Materials",
    "price": 85.66
  },
  {
    "ticker": "ARE",
    "name": "Alexandria Real Estate Equities",
    "sector": "Real Estate",
    "price": 42.3
  },
  {
    "ticker": "ALGN",
    "name": "Align Technology, Inc.",
    "sector": "Healthcare",
    "price": 163.89
  },
  {
    "ticker": "ALLE",
    "name": "Allegion plc",
    "sector": "Industrials",
    "price": 188.11
  },
  {
    "ticker": "LNT",
    "name": "Alliant Energy Corporation",
    "sector": "Utilities",
    "price": 72.08
  },
  {
    "ticker": "ALL",
    "name": "The Allstate Corporation",
    "sector": "Financial",
    "price": 266.45
  },
  {
    "ticker": "MO",
    "name": "Altria Group, Inc.",
    "sector": "Consumer Defensive",
    "price": 76.17
  },
  {
    "ticker": "AMCR",
    "name": "Amcor plc",
    "sector": "Materials",
    "price": 48.2
  },
  {
    "ticker": "AEE",
    "name": "Ameren Corporation",
    "sector": "Utilities",
    "price": 112.85
  },
  {
    "ticker": "AEP",
    "name": "American Electric Power Company",
    "sector": "Utilities",
    "price": 126.55
  },
  {
    "ticker": "AIG",
    "name": "American International Group, Inc.",
    "sector": "Financial",
    "price": 80.64
  },
  {
    "ticker": "AMT",
    "name": "American Tower Corporation",
    "sector": "Real Estate",
    "price": 184.84
  },
  {
    "ticker": "AWK",
    "name": "American Water Works Company",
    "sector": "Utilities",
    "price": 149.99
  },
  {
    "ticker": "AMP",
    "name": "Ameriprise Financial, Inc.",
    "sector": "Financial",
    "price": 501.86
  },
  {
    "ticker": "AME",
    "name": "AMETEK, Inc.",
    "sector": "Industrials",
    "price": 235.92
  },
  {
    "ticker": "BA",
    "name": "The Boeing Company",
    "sector": "Industrials",
    "price": 162.91
  },
  {
    "ticker": "GM",
    "name": "General Motors Company",
    "sector": "Consumer Cyclical",
    "price": 82.13
  },
  {
    "ticker": "T",
    "name": "AT&T Inc.",
    "sector": "Communication Services",
    "price": 21.95
  },
  {
    "ticker": "F",
    "name": "Ford Motor Company",
    "sector": "Consumer Cyclical",
    "price": 11.28
  },
  {
    "ticker": "EBAY",
    "name": "eBay Inc.",
    "sector": "Consumer Cyclical",
    "price": 121.46
  },
  {
    "ticker": "DOW",
    "name": "Dow Inc.",
    "sector": "Materials",
    "price": 30.37
  },
  {
    "ticker": "DE",
    "name": "Deere & Company",
    "sector": "Industrials",
    "price": 644.75
  },
  {
    "ticker": "FDX",
    "name": "FedEx Corporation",
    "sector": "Industrials",
    "price": 318.31
  },
  {
    "ticker": "GIS",
    "name": "General Mills, Inc.",
    "sector": "Consumer Defensive",
    "price": 34.53
  },
  {
    "ticker": "GLW",
    "name": "Corning Incorporated",
    "sector": "Technology",
    "price": 108.15
  },
  {
    "ticker": "KMB",
    "name": "Kimberly-Clark Corporation",
    "sector": "Consumer Defensive",
    "price": 107.24
  },
  {
    "ticker": "KHC",
    "name": "The Kraft Heinz Company",
    "sector": "Consumer Defensive",
    "price": 25.44
  },
  {
    "ticker": "MSI",
    "name": "Motorola Solutions, Inc.",
    "sector": "Technology",
    "price": 524.53
  },
  {
    "ticker": "VRTX",
    "name": "Vertex Pharmaceuticals Inc.",
    "sector": "Healthcare",
    "price": 536.45
  },
  {
    "ticker": "MNST",
    "name": "Monster Beverage Corporation",
    "sector": "Consumer Defensive",
    "price": 44.91
  },
  {
    "ticker": "FITB",
    "name": "Fifth Third Bancorp",
    "sector": "Financial",
    "price": 51.97
  },
  {
    "ticker": "CTAS",
    "name": "Cintas Corporation",
    "sector": "Industrials",
    "price": 222.0
  },
  {
    "ticker": "ADSK",
    "name": "Autodesk, Inc.",
    "sector": "Technology",
    "price": 253.0
  },
  {
    "ticker": "FISV",
    "name": "Fiserv, Inc.",
    "sector": "Financial",
    "price": 60.48
  },
  {
    "ticker": "STLD",
    "name": "Steel Dynamics, Inc.",
    "sector": "Materials",
    "price": 222.69
  },
  {
    "ticker": "CDNS",
    "name": "Cadence Design Systems, Inc.",
    "sector": "Technology",
    "price": 305.82
  },
  {
    "ticker": "MCHP",
    "name": "Microchip Technology Incorporated",
    "sector": "Technology",
    "price": 59.67
  },
  {
    "ticker": "WYNN",
    "name": "Wynn Resorts, Limited",
    "sector": "Consumer Cyclical",
    "price": 83.2
  },
  {
    "ticker": "ISRG",
    "name": "Intuitive Surgical, Inc.",
    "sector": "Healthcare",
    "price": 420.95
  },
  {
    "ticker": "NDAQ",
    "name": "Nasdaq, Inc.",
    "sector": "Financial",
    "price": 105.72
  },
  {
    "ticker": "HSIC",
    "name": "Henry Schein, Inc.",
    "sector": "Healthcare",
    "price": 85.69
  },
  {
    "ticker": "PAYX",
    "name": "Paychex, Inc.",
    "sector": "Industrials",
    "price": 113.67
  },
  {
    "ticker": "VRSN",
    "name": "VeriSign, Inc.",
    "sector": "Technology",
    "price": 307.12
  },
  {
    "ticker": "FAST",
    "name": "Fastenal Company",
    "sector": "Industrials",
    "price": 53.96
  },
  {
    "ticker": "NTRS",
    "name": "Northern Trust Corporation",
    "sector": "Financial",
    "price": 171.56
  },
  {
    "ticker": "CHRW",
    "name": "C.H. Robinson Worldwide, Inc.",
    "sector": "Industrials",
    "price": 137.47
  },
  {
    "ticker": "PCAR",
    "name": "PACCAR Inc",
    "sector": "Industrials",
    "price": 103.81
  },
  {
    "ticker": "ROST",
    "name": "Ross Stores, Inc.",
    "sector": "Consumer Cyclical",
    "price": 227.64
  },
  {
    "ticker": "NTAP",
    "name": "NetApp, Inc.",
    "sector": "Technology",
    "price": 172.19
  },
  {
    "ticker": "GRMN",
    "name": "Garmin Ltd.",
    "sector": "Consumer Cyclical",
    "price": 279.52
  },
  {
    "ticker": "INTU",
    "name": "Intuit Inc.",
    "sector": "Technology",
    "price": 313.24
  },
  {
    "ticker": "EXPE",
    "name": "Expedia Group, Inc.",
    "sector": "Consumer Cyclical",
    "price": 245.79
  },
  {
    "ticker": "CTSH",
    "name": "Cognizant Technology Solutions",
    "sector": "Technology",
    "price": 57.95
  },
  {
    "ticker": "EXPD",
    "name": "Expeditors International",
    "sector": "Industrials",
    "price": 188.88
  },
  {
    "ticker": "TROW",
    "name": "T. Rowe Price Group, Inc.",
    "sector": "Financial",
    "price": 109.76
  },
  {
    "ticker": "BIIB",
    "name": "Biogen Inc.",
    "sector": "Healthcare",
    "price": 251.41
  },
  {
    "ticker": "SCHW",
    "name": "The Charles Schwab Corporation",
    "sector": "Financial",
    "price": 92.56
  },
  {
    "ticker": "HBAN",
    "name": "Huntington Bancshares Inc.",
    "sector": "Financial",
    "price": 14.94
  },
  {
    "ticker": "GEN",
    "name": "Gen Digital Inc.",
    "sector": "Technology",
    "price": 30.47
  },
  {
    "ticker": "SBUX",
    "name": "Starbucks Corporation",
    "sector": "Consumer Cyclical",
    "price": 109.11
  },
  {
    "ticker": "CINF",
    "name": "Cincinnati Financial Corporation",
    "sector": "Financial",
    "price": 188.83
  },
  {
    "ticker": "AXON",
    "name": "Axon Enterprise, Inc.",
    "sector": "Industrials",
    "price": 300.69
  },
  {
    "ticker": "CMCSA",
    "name": "Comcast Corporation",
    "sector": "Communication Services",
    "price": 25.24
  },
  {
    "ticker": "MDT",
    "name": "Medtronic plc",
    "sector": "Healthcare",
    "price": 100.72
  },
  {
    "ticker": "DOV",
    "name": "Dover Corporation",
    "sector": "Industrials",
    "price": 202.69
  },
  {
    "ticker": "NOC",
    "name": "Northrop Grumman Corporation",
    "sector": "Industrials",
    "price": 542.99
  },
  {
    "ticker": "MGM",
    "name": "MGM Resorts International",
    "sector": "Consumer Cyclical",
    "price": 33.74
  },
  {
    "ticker": "GD",
    "name": "General Dynamics Corporation",
    "sector": "Industrials",
    "price": 349.04
  },
  {
    "ticker": "DTE",
    "name": "DTE Energy Company",
    "sector": "Utilities",
    "price": 136.86
  },
  {
    "ticker": "CAH",
    "name": "Cardinal Health, Inc.",
    "sector": "Healthcare",
    "price": 278.32
  },
  {
    "ticker": "XEL",
    "name": "Xcel Energy Inc.",
    "sector": "Utilities",
    "price": 80.65
  },
  {
    "ticker": "DHI",
    "name": "D.R. Horton, Inc.",
    "sector": "Consumer Cyclical",
    "price": 144.39
  },
  {
    "ticker": "LMT",
    "name": "Lockheed Martin Corporation",
    "sector": "Industrials",
    "price": 578.19
  },
  {
    "ticker": "WAT",
    "name": "Waters Corporation",
    "sector": "Healthcare",
    "price": 466.1
  },
  {
    "ticker": "D",
    "name": "Dominion Energy, Inc.",
    "sector": "Utilities",
    "price": 67.39
  },
  {
    "ticker": "CI",
    "name": "The Cigna Group",
    "sector": "Healthcare",
    "price": 285.37
  },
  {
    "ticker": "PEG",
    "name": "Public Service Enterprise Group",
    "sector": "Utilities",
    "price": 74.47
  },
  {
    "ticker": "NI",
    "name": "NiSource Inc.",
    "sector": "Utilities",
    "price": 44.92
  },
  {
    "ticker": "ZBH",
    "name": "Zimmer Biomet Holdings, Inc.",
    "sector": "Healthcare",
    "price": 103.32
  },
  {
    "ticker": "CSX",
    "name": "CSX Corporation",
    "sector": "Industrials",
    "price": 51.33
  },
  {
    "ticker": "ICE",
    "name": "Intercontinental Exchange, Inc.",
    "sector": "Financial",
    "price": 171.81
  },
  {
    "ticker": "LUV",
    "name": "Southwest Airlines Co.",
    "sector": "Industrials",
    "price": 47.07
  },
  {
    "ticker": "ITW",
    "name": "Illinois Tool Works Inc.",
    "sector": "Industrials",
    "price": 282.29
  },
  {
    "ticker": "DRI",
    "name": "Darden Restaurants, Inc.",
    "sector": "Consumer Cyclical",
    "price": 239.22
  },
  {
    "ticker": "TFC",
    "name": "Truist Financial Corporation",
    "sector": "Financial",
    "price": 47.74
  },
  {
    "ticker": "HAL",
    "name": "Halliburton Company",
    "sector": "Energy",
    "price": 31.44
  },
  {
    "ticker": "PLD",
    "name": "Prologis, Inc.",
    "sector": "Real Estate",
    "price": 125.22
  },
  {
    "ticker": "MKC",
    "name": "McCormick & Company, Incorporated",
    "sector": "Consumer Defensive",
    "price": 46.33
  },
  {
    "ticker": "HST",
    "name": "Host Hotels & Resorts, Inc.",
    "sector": "Real Estate",
    "price": 25.35
  },
  {
    "ticker": "SO",
    "name": "The Southern Company",
    "sector": "Utilities",
    "price": 94.1
  },
  {
    "ticker": "DUK",
    "name": "Duke Energy Corporation",
    "sector": "Utilities",
    "price": 122.4
  },
  {
    "ticker": "CL",
    "name": "Colgate-Palmolive Company",
    "sector": "Consumer Defensive",
    "price": 98.5
  },
  {
    "ticker": "EL",
    "name": "The Est\u00e9e Lauder Companies Inc.",
    "sector": "Consumer Defensive",
    "price": 92.3
  },
  {
    "ticker": "SPGI",
    "name": "S&P Global Inc.",
    "sector": "Financial",
    "price": 518.4
  },
  {
    "ticker": "CME",
    "name": "CME Group Inc.",
    "sector": "Financial",
    "price": 242.15
  },
  {
    "ticker": "MCO",
    "name": "Moody's Corporation",
    "sector": "Financial",
    "price": 488.9
  },
  {
    "ticker": "PGR",
    "name": "The Progressive Corporation",
    "sector": "Financial",
    "price": 268.75
  },
  {
    "ticker": "TRV",
    "name": "The Travelers Companies, Inc.",
    "sector": "Financial",
    "price": 254.2
  },
  {
    "ticker": "CB",
    "name": "Chubb Limited",
    "sector": "Financial",
    "price": 295.6
  },
  {
    "ticker": "MMC",
    "name": "Marsh & McLennan Companies",
    "sector": "Financial",
    "price": 238.1
  },
  {
    "ticker": "AON",
    "name": "Aon plc",
    "sector": "Financial",
    "price": 374.5
  },
  {
    "ticker": "AJG",
    "name": "Arthur J. Gallagher & Co.",
    "sector": "Financial",
    "price": 312.8
  },
  {
    "ticker": "COF",
    "name": "Capital One Financial Corporation",
    "sector": "Financial",
    "price": 192.4
  },
  {
    "ticker": "BK",
    "name": "The Bank of New York Mellon",
    "sector": "Financial",
    "price": 84.6
  },
  {
    "ticker": "STT",
    "name": "State Street Corporation",
    "sector": "Financial",
    "price": 98.3
  },
  {
    "ticker": "PNC",
    "name": "The PNC Financial Services Group",
    "sector": "Financial",
    "price": 204.5
  },
  {
    "ticker": "USB",
    "name": "U.S. Bancorp",
    "sector": "Financial",
    "price": 52.8
  },
  {
    "ticker": "CFG",
    "name": "Citizens Financial Group, Inc.",
    "sector": "Financial",
    "price": 46.9
  },
  {
    "ticker": "KEY",
    "name": "KeyCorp",
    "sector": "Financial",
    "price": 18.75
  },
  {
    "ticker": "RF",
    "name": "Regions Financial Corporation",
    "sector": "Financial",
    "price": 25.4
  },
  {
    "ticker": "MTB",
    "name": "M&T Bank Corporation",
    "sector": "Financial",
    "price": 208.15
  },
  {
    "ticker": "NVR",
    "name": "NVR, Inc.",
    "sector": "Consumer Cyclical",
    "price": 8840.0
  },
  {
    "ticker": "LEN",
    "name": "Lennar Corporation",
    "sector": "Consumer Cyclical",
    "price": 174.6
  },
  {
    "ticker": "PHM",
    "name": "PulteGroup, Inc.",
    "sector": "Consumer Cyclical",
    "price": 138.9
  },
  {
    "ticker": "LOW",
    "name": "Lowe's Companies, Inc.",
    "sector": "Consumer Cyclical",
    "price": 268.4
  },
  {
    "ticker": "TJX",
    "name": "The TJX Companies, Inc.",
    "sector": "Consumer Cyclical",
    "price": 128.75
  },
  {
    "ticker": "ORLY",
    "name": "O'Reilly Automotive, Inc.",
    "sector": "Consumer Cyclical",
    "price": 1245.0
  },
  {
    "ticker": "AZO",
    "name": "AutoZone, Inc.",
    "sector": "Consumer Cyclical",
    "price": 3290.0
  },
  {
    "ticker": "TSCO",
    "name": "Tractor Supply Company",
    "sector": "Consumer Cyclical",
    "price": 58.9
  },
  {
    "ticker": "ULTA",
    "name": "Ulta Beauty, Inc.",
    "sector": "Consumer Cyclical",
    "price": 412.5
  },
  {
    "ticker": "BBY",
    "name": "Best Buy Co., Inc.",
    "sector": "Consumer Cyclical",
    "price": 94.8
  },
  {
    "ticker": "DPZ",
    "name": "Domino's Pizza, Inc.",
    "sector": "Consumer Cyclical",
    "price": 456.2
  },
  {
    "ticker": "CMG",
    "name": "Chipotle Mexican Grill, Inc.",
    "sector": "Consumer Cyclical",
    "price": 62.4
  },
  {
    "ticker": "YUM",
    "name": "Yum! Brands, Inc.",
    "sector": "Consumer Cyclical",
    "price": 142.8
  },
  {
    "ticker": "MAR",
    "name": "Marriott International, Inc.",
    "sector": "Consumer Cyclical",
    "price": 284.3
  },
  {
    "ticker": "HLT",
    "name": "Hilton Worldwide Holdings Inc.",
    "sector": "Consumer Cyclical",
    "price": 254.1
  },
  {
    "ticker": "RCL",
    "name": "Royal Caribbean Cruises Ltd.",
    "sector": "Consumer Cyclical",
    "price": 238.9
  },
  {
    "ticker": "CCL",
    "name": "Carnival Corporation & plc",
    "sector": "Consumer Cyclical",
    "price": 26.4
  },
  {
    "ticker": "NCLH",
    "name": "Norwegian Cruise Line Holdings",
    "sector": "Consumer Cyclical",
    "price": 24.8
  },
  {
    "ticker": "BKNG",
    "name": "Booking Holdings Inc.",
    "sector": "Consumer Cyclical",
    "price": 4890.0
  },
  {
    "ticker": "LVS",
    "name": "Las Vegas Sands Corp.",
    "sector": "Consumer Cyclical",
    "price": 52.6
  },
  {
    "ticker": "SYK",
    "name": "Stryker Corporation",
    "sector": "Healthcare",
    "price": 388.4
  },
  {
    "ticker": "BSX",
    "name": "Boston Scientific Corporation",
    "sector": "Healthcare",
    "price": 96.8
  },
  {
    "ticker": "EW",
    "name": "Edwards Lifesciences Corporation",
    "sector": "Healthcare",
    "price": 74.5
  },
  {
    "ticker": "BDX",
    "name": "Becton, Dickinson and Company",
    "sector": "Healthcare",
    "price": 246.3
  },
  {
    "ticker": "BAX",
    "name": "Baxter International Inc.",
    "sector": "Healthcare",
    "price": 36.8
  },
  {
    "ticker": "IDXX",
    "name": "IDEXX Laboratories, Inc.",
    "sector": "Healthcare",
    "price": 498.2
  },
  {
    "ticker": "IQV",
    "name": "IQVIA Holdings Inc.",
    "sector": "Healthcare",
    "price": 218.5
  },
  {
    "ticker": "MTD",
    "name": "Mettler-Toledo International Inc.",
    "sector": "Healthcare",
    "price": 1380.0
  },
  {
    "ticker": "DGX",
    "name": "Quest Diagnostics Incorporated",
    "sector": "Healthcare",
    "price": 164.3
  },
  {
    "ticker": "LH",
    "name": "Labcorp Holdings Inc.",
    "sector": "Healthcare",
    "price": 242.9
  },
  {
    "ticker": "ELV",
    "name": "Elevance Health, Inc.",
    "sector": "Healthcare",
    "price": 438.2
  },
  {
    "ticker": "CVS",
    "name": "CVS Health Corporation",
    "sector": "Healthcare",
    "price": 64.5
  },
  {
    "ticker": "MCK",
    "name": "McKesson Corporation",
    "sector": "Healthcare",
    "price": 648.9
  },
  {
    "ticker": "COR",
    "name": "Cencora, Inc.",
    "sector": "Healthcare",
    "price": 268.4
  },
  {
    "ticker": "HCA",
    "name": "HCA Healthcare, Inc.",
    "sector": "Healthcare",
    "price": 378.6
  },
  {
    "ticker": "REGN",
    "name": "Regeneron Pharmaceuticals, Inc.",
    "sector": "Healthcare",
    "price": 942.0
  },
  {
    "ticker": "VTRS",
    "name": "Viatris Inc.",
    "sector": "Healthcare",
    "price": 12.4
  },
  {
    "ticker": "MRNA",
    "name": "Moderna, Inc.",
    "sector": "Healthcare",
    "price": 54.8
  },
  {
    "ticker": "ON",
    "name": "ON Semiconductor Corporation",
    "sector": "Technology",
    "price": 74.2
  },
  {
    "ticker": "SWKS",
    "name": "Skyworks Solutions, Inc.",
    "sector": "Technology",
    "price": 92.4
  },
  {
    "ticker": "MPWR",
    "name": "Monolithic Power Systems, Inc.",
    "sector": "Technology",
    "price": 895.0
  },
  {
    "ticker": "TER",
    "name": "Teradyne, Inc.",
    "sector": "Technology",
    "price": 136.5
  },
  {
    "ticker": "SNPS",
    "name": "Synopsys, Inc.",
    "sector": "Technology",
    "price": 534.2
  },
  {
    "ticker": "ANSS",
    "name": "Ansys, Inc.",
    "sector": "Technology",
    "price": 342.8
  },
  {
    "ticker": "CRM",
    "name": "Salesforce, Inc.",
    "sector": "Technology",
    "price": 328.4
  },
  {
    "ticker": "NOW",
    "name": "ServiceNow, Inc.",
    "sector": "Technology",
    "price": 984.5
  },
  {
    "ticker": "WDAY",
    "name": "Workday, Inc.",
    "sector": "Technology",
    "price": 268.9
  },
  {
    "ticker": "TEAM",
    "name": "Atlassian Corporation",
    "sector": "Technology",
    "price": 248.3
  },
  {
    "ticker": "DDOG",
    "name": "Datadog, Inc.",
    "sector": "Technology",
    "price": 146.7
  },
  {
    "ticker": "ZS",
    "name": "Zscaler, Inc.",
    "sector": "Technology",
    "price": 212.4
  },
  {
    "ticker": "FTNT",
    "name": "Fortinet, Inc.",
    "sector": "Technology",
    "price": 96.8
  },
  {
    "ticker": "CHKP",
    "name": "Check Point Software Technologies",
    "sector": "Technology",
    "price": 198.4
  },
  {
    "ticker": "FICO",
    "name": "Fair Isaac Corporation",
    "sector": "Technology",
    "price": 2140.0
  },
  {
    "ticker": "GPN",
    "name": "Global Payments Inc.",
    "sector": "Financial",
    "price": 108.6
  },
  {
    "ticker": "FIS",
    "name": "Fidelity National Information",
    "sector": "Financial",
    "price": 88.4
  },
  {
    "ticker": "JKHY",
    "name": "Jack Henry & Associates, Inc.",
    "sector": "Financial",
    "price": 182.3
  },
  {
    "ticker": "ROP",
    "name": "Roper Technologies, Inc.",
    "sector": "Technology",
    "price": 568.4
  },
  {
    "ticker": "BR",
    "name": "Broadridge Financial Solutions",
    "sector": "Industrials",
    "price": 234.5
  },
  {
    "ticker": "ADP",
    "name": "Automatic Data Processing, Inc.",
    "sector": "Industrials",
    "price": 298.6
  },
  {
    "ticker": "PAYC",
    "name": "Paycom Software, Inc.",
    "sector": "Industrials",
    "price": 214.2
  },
  {
    "ticker": "PCTY",
    "name": "Paylocity Holding Corporation",
    "sector": "Technology",
    "price": 192.8
  },
  {
    "ticker": "HUBS",
    "name": "HubSpot, Inc.",
    "sector": "Technology",
    "price": 648.3
  },
  {
    "ticker": "TTD",
    "name": "The Trade Desk, Inc.",
    "sector": "Communication Services",
    "price": 118.4
  },
  {
    "ticker": "ROKU",
    "name": "Roku, Inc.",
    "sector": "Communication Services",
    "price": 78.6
  },
  {
    "ticker": "SPOT",
    "name": "Spotify Technology S.A.",
    "sector": "Communication Services",
    "price": 468.9
  },
  {
    "ticker": "MTCH",
    "name": "Match Group, Inc.",
    "sector": "Communication Services",
    "price": 36.4
  },
  {
    "ticker": "EA",
    "name": "Electronic Arts Inc.",
    "sector": "Communication Services",
    "price": 158.2
  },
  {
    "ticker": "TTWO",
    "name": "Take-Two Interactive Software",
    "sector": "Communication Services",
    "price": 184.5
  },
  {
    "ticker": "WBD",
    "name": "Warner Bros. Discovery, Inc.",
    "sector": "Communication Services",
    "price": 11.4
  },
  {
    "ticker": "FOX",
    "name": "Fox Corporation",
    "sector": "Communication Services",
    "price": 46.8
  },
  {
    "ticker": "NWS",
    "name": "News Corporation",
    "sector": "Communication Services",
    "price": 31.2
  },
  {
    "ticker": "OMC",
    "name": "Omnicom Group Inc.",
    "sector": "Communication Services",
    "price": 102.4
  },
  {
    "ticker": "IPG",
    "name": "The Interpublic Group of Companies",
    "sector": "Communication Services",
    "price": 31.8
  },
  {
    "ticker": "PSX",
    "name": "Phillips 66",
    "sector": "Energy",
    "price": 136.4
  },
  {
    "ticker": "VLO",
    "name": "Valero Energy Corporation",
    "sector": "Energy",
    "price": 144.8
  },
  {
    "ticker": "MPC",
    "name": "Marathon Petroleum Corporation",
    "sector": "Energy",
    "price": 168.9
  },
  {
    "ticker": "SLB",
    "name": "SLB (Schlumberger)",
    "sector": "Energy",
    "price": 44.6
  },
  {
    "ticker": "BKR",
    "name": "Baker Hughes Company",
    "sector": "Energy",
    "price": 42.8
  },
  {
    "ticker": "OKE",
    "name": "ONEOK, Inc.",
    "sector": "Energy",
    "price": 104.5
  },
  {
    "ticker": "KMI",
    "name": "Kinder Morgan, Inc.",
    "sector": "Energy",
    "price": 26.8
  },
  {
    "ticker": "WMB",
    "name": "The Williams Companies, Inc.",
    "sector": "Energy",
    "price": 54.2
  },
  {
    "ticker": "EOG",
    "name": "EOG Resources, Inc.",
    "sector": "Energy",
    "price": 132.6
  },
  {
    "ticker": "DVN",
    "name": "Devon Energy Corporation",
    "sector": "Energy",
    "price": 41.2
  },
  {
    "ticker": "FANG",
    "name": "Diamondback Energy, Inc.",
    "sector": "Energy",
    "price": 186.4
  },
  {
    "ticker": "COP",
    "name": "ConocoPhillips",
    "sector": "Energy",
    "price": 114.9
  },
  {
    "ticker": "APA",
    "name": "APA Corporation",
    "sector": "Energy",
    "price": 24.6
  },
  {
    "ticker": "EQT",
    "name": "EQT Corporation",
    "sector": "Energy",
    "price": 46.8
  },
  {
    "ticker": "CTRA",
    "name": "Coterra Energy Inc.",
    "sector": "Energy",
    "price": 26.4
  },
  {
    "ticker": "FCX",
    "name": "Freeport-McMoRan Inc.",
    "sector": "Materials",
    "price": 46.2
  },
  {
    "ticker": "NEM",
    "name": "Newmont Corporation",
    "sector": "Materials",
    "price": 48.9
  },
  {
    "ticker": "NUE",
    "name": "Nucor Corporation",
    "sector": "Materials",
    "price": 154.3
  },
  {
    "ticker": "VMC",
    "name": "Vulcan Materials Company",
    "sector": "Materials",
    "price": 274.8
  },
  {
    "ticker": "MLM",
    "name": "Martin Marietta Materials, Inc.",
    "sector": "Materials",
    "price": 584.2
  },
  {
    "ticker": "SHW",
    "name": "The Sherwin-Williams Company",
    "sector": "Materials",
    "price": 378.9
  },
  {
    "ticker": "PPG",
    "name": "PPG Industries, Inc.",
    "sector": "Materials",
    "price": 128.4
  },
  {
    "ticker": "ECL",
    "name": "Ecolab Inc.",
    "sector": "Materials",
    "price": 254.6
  },
  {
    "ticker": "IFF",
    "name": "International Flavors & Fragrances",
    "sector": "Materials",
    "price": 94.8
  },
  {
    "ticker": "EMN",
    "name": "Eastman Chemical Company",
    "sector": "Materials",
    "price": 104.2
  },
  {
    "ticker": "CE",
    "name": "Celanese Corporation",
    "sector": "Materials",
    "price": 118.6
  },
  {
    "ticker": "LYB",
    "name": "LyondellBasell Industries N.V.",
    "sector": "Materials",
    "price": 88.4
  },
  {
    "ticker": "CF",
    "name": "CF Industries Holdings, Inc.",
    "sector": "Materials",
    "price": 92.6
  },
  {
    "ticker": "MOS",
    "name": "The Mosaic Company",
    "sector": "Materials",
    "price": 28.4
  },
  {
    "ticker": "PKG",
    "name": "Packaging Corporation of America",
    "sector": "Materials",
    "price": 234.8
  },
  {
    "ticker": "IP",
    "name": "International Paper Company",
    "sector": "Materials",
    "price": 54.6
  },
  {
    "ticker": "WRK",
    "name": "Smurfit Westrock plc",
    "sector": "Materials",
    "price": 52.8
  },
  {
    "ticker": "AVY",
    "name": "Avery Dennison Corporation",
    "sector": "Materials",
    "price": 212.4
  },
  {
    "ticker": "BALL",
    "name": "Ball Corporation",
    "sector": "Materials",
    "price": 62.8
  },
  {
    "ticker": "CCK",
    "name": "Crown Holdings, Inc.",
    "sector": "Materials",
    "price": 96.4
  },
  {
    "ticker": "HON",
    "name": "Honeywell International Inc.",
    "sector": "Industrials",
    "price": 224.8
  },
  {
    "ticker": "EMR",
    "name": "Emerson Electric Co.",
    "sector": "Industrials",
    "price": 128.6
  },
  {
    "ticker": "ETN",
    "name": "Eaton Corporation plc",
    "sector": "Industrials",
    "price": 356.4
  },
  {
    "ticker": "ROK",
    "name": "Rockwell Automation, Inc.",
    "sector": "Industrials",
    "price": 288.2
  },
  {
    "ticker": "PH",
    "name": "Parker-Hannifin Corporation",
    "sector": "Industrials",
    "price": 684.5
  },
  {
    "ticker": "IR",
    "name": "Ingersoll Rand Inc.",
    "sector": "Industrials",
    "price": 102.8
  },
  {
    "ticker": "CARR",
    "name": "Carrier Global Corporation",
    "sector": "Industrials",
    "price": 76.4
  },
  {
    "ticker": "OTIS",
    "name": "Otis Worldwide Corporation",
    "sector": "Industrials",
    "price": 102.6
  },
  {
    "ticker": "JCI",
    "name": "Johnson Controls International",
    "sector": "Industrials",
    "price": 82.4
  },
  {
    "ticker": "TT",
    "name": "Trane Technologies plc",
    "sector": "Industrials",
    "price": 388.9
  },
  {
    "ticker": "XYL",
    "name": "Xylem Inc.",
    "sector": "Industrials",
    "price": 132.4
  },
  {
    "ticker": "IEX",
    "name": "IDEX Corporation",
    "sector": "Industrials",
    "price": 218.6
  },
  {
    "ticker": "PNR",
    "name": "Pentair plc",
    "sector": "Industrials",
    "price": 104.8
  },
  {
    "ticker": "SWK",
    "name": "Stanley Black & Decker, Inc.",
    "sector": "Industrials",
    "price": 94.2
  },
  {
    "ticker": "SNA",
    "name": "Snap-on Incorporated",
    "sector": "Industrials",
    "price": 342.6
  },
  {
    "ticker": "MAS",
    "name": "Masco Corporation",
    "sector": "Industrials",
    "price": 84.2
  },
  {
    "ticker": "FBIN",
    "name": "Fortune Brands Innovations",
    "sector": "Industrials",
    "price": 78.4
  },
  {
    "ticker": "AAL",
    "name": "American Airlines Group Inc.",
    "sector": "Industrials",
    "price": 16.4
  },
  {
    "ticker": "DAL",
    "name": "Delta Air Lines, Inc.",
    "sector": "Industrials",
    "price": 62.8
  },
  {
    "ticker": "UAL",
    "name": "United Airlines Holdings, Inc.",
    "sector": "Industrials",
    "price": 88.4
  },
  {
    "ticker": "EXR",
    "name": "Extra Space Storage Inc.",
    "sector": "Real Estate",
    "price": 174.6
  },
  {
    "ticker": "PSA",
    "name": "Public Storage",
    "sector": "Real Estate",
    "price": 342.8
  },
  {
    "ticker": "AVB",
    "name": "AvalonBay Communities, Inc.",
    "sector": "Real Estate",
    "price": 228.4
  },
  {
    "ticker": "EQR",
    "name": "Equity Residential",
    "sector": "Real Estate",
    "price": 74.8
  },
  {
    "ticker": "MAA",
    "name": "Mid-America Apartment Communities",
    "sector": "Real Estate",
    "price": 162.4
  },
  {
    "ticker": "UDR",
    "name": "UDR, Inc.",
    "sector": "Real Estate",
    "price": 44.6
  },
  {
    "ticker": "CPT",
    "name": "Camden Property Trust",
    "sector": "Real Estate",
    "price": 122.8
  },
  {
    "ticker": "ESS",
    "name": "Essex Property Trust, Inc.",
    "sector": "Real Estate",
    "price": 298.4
  },
  {
    "ticker": "KIM",
    "name": "Kimco Realty Corporation",
    "sector": "Real Estate",
    "price": 24.8
  },
  {
    "ticker": "REG",
    "name": "Regency Centers Corporation",
    "sector": "Real Estate",
    "price": 74.2
  },
  {
    "ticker": "FRT",
    "name": "Federal Realty Investment Trust",
    "sector": "Real Estate",
    "price": 114.6
  },
  {
    "ticker": "BXP",
    "name": "BXP, Inc.",
    "sector": "Real Estate",
    "price": 82.4
  },
  {
    "ticker": "VTR",
    "name": "Ventas, Inc.",
    "sector": "Real Estate",
    "price": 66.8
  },
  {
    "ticker": "O",
    "name": "Realty Income Corporation",
    "sector": "Real Estate",
    "price": 62.4
  },
  {
    "ticker": "WPC",
    "name": "W. P. Carey Inc.",
    "sector": "Real Estate",
    "price": 58.9
  },
  {
    "ticker": "CCI",
    "name": "Crown Castle Inc.",
    "sector": "Real Estate",
    "price": 108.4
  },
  {
    "ticker": "SBAC",
    "name": "SBA Communications Corporation",
    "sector": "Real Estate",
    "price": 234.6
  },
  {
    "ticker": "WY",
    "name": "Weyerhaeuser Company",
    "sector": "Real Estate",
    "price": 32.8
  },
  {
    "ticker": "INVH",
    "name": "Invitation Homes Inc.",
    "sector": "Real Estate",
    "price": 34.2
  },
  {
    "ticker": "SRE",
    "name": "Sempra",
    "sector": "Utilities",
    "price": 88.4
  },
  {
    "ticker": "PCG",
    "name": "PG&E Corporation",
    "sector": "Utilities",
    "price": 20.4
  },
  {
    "ticker": "ED",
    "name": "Consolidated Edison, Inc.",
    "sector": "Utilities",
    "price": 104.8
  },
  {
    "ticker": "EIX",
    "name": "Edison International",
    "sector": "Utilities",
    "price": 84.6
  },
  {
    "ticker": "WEC",
    "name": "WEC Energy Group, Inc.",
    "sector": "Utilities",
    "price": 98.4
  },
  {
    "ticker": "ES",
    "name": "Eversource Energy",
    "sector": "Utilities",
    "price": 66.8
  },
  {
    "ticker": "FE",
    "name": "FirstEnergy Corp.",
    "sector": "Utilities",
    "price": 42.6
  },
  {
    "ticker": "PPL",
    "name": "PPL Corporation",
    "sector": "Utilities",
    "price": 33.4
  },
  {
    "ticker": "CMS",
    "name": "CMS Energy Corporation",
    "sector": "Utilities",
    "price": 68.2
  },
  {
    "ticker": "CNP",
    "name": "CenterPoint Energy, Inc.",
    "sector": "Utilities",
    "price": 31.8
  },
  {
    "ticker": "ATO",
    "name": "Atmos Energy Corporation",
    "sector": "Utilities",
    "price": 142.6
  },
  {
    "ticker": "EVRG",
    "name": "Evergy, Inc.",
    "sector": "Utilities",
    "price": 62.4
  },
  {
    "ticker": "NRG",
    "name": "NRG Energy, Inc.",
    "sector": "Utilities",
    "price": 96.8
  },
  {
    "ticker": "CEG",
    "name": "Constellation Energy Corporation",
    "sector": "Utilities",
    "price": 268.4
  },
  {
    "ticker": "VST",
    "name": "Vistra Corp.",
    "sector": "Utilities",
    "price": 148.6
  },
  {
    "ticker": "PNW",
    "name": "Pinnacle West Capital Corporation",
    "sector": "Utilities",
    "price": 88.2
  },
  {
    "ticker": "SWX",
    "name": "Southwest Gas Holdings, Inc.",
    "sector": "Utilities",
    "price": 74.6
  },
  {
    "ticker": "OGE",
    "name": "OGE Energy Corp.",
    "sector": "Utilities",
    "price": 42.8
  },
  {
    "ticker": "BKH",
    "name": "Black Hills Corporation",
    "sector": "Utilities",
    "price": 60.4
  },
  {
    "ticker": "NWE",
    "name": "NorthWestern Energy Group, Inc.",
    "sector": "Utilities",
    "price": 54.2
  },
  {
    "ticker": "K",
    "name": "Kellanova",
    "sector": "Consumer Defensive",
    "price": 80.6
  },
  {
    "ticker": "CPB",
    "name": "The Campbell's Company",
    "sector": "Consumer Defensive",
    "price": 46.8
  },
  {
    "ticker": "SJM",
    "name": "The J. M. Smucker Company",
    "sector": "Consumer Defensive",
    "price": 118.4
  },
  {
    "ticker": "CAG",
    "name": "Conagra Brands, Inc.",
    "sector": "Consumer Defensive",
    "price": 29.8
  },
  {
    "ticker": "HRL",
    "name": "Hormel Foods Corporation",
    "sector": "Consumer Defensive",
    "price": 32.4
  },
  {
    "ticker": "TSN",
    "name": "Tyson Foods, Inc.",
    "sector": "Consumer Defensive",
    "price": 62.8
  },
  {
    "ticker": "BG",
    "name": "Bunge Global SA",
    "sector": "Consumer Defensive",
    "price": 96.4
  },
  {
    "ticker": "ADM",
    "name": "Archer-Daniels-Midland Company",
    "sector": "Consumer Defensive",
    "price": 56.8
  },
  {
    "ticker": "TAP",
    "name": "Molson Coors Beverage Company",
    "sector": "Consumer Defensive",
    "price": 58.4
  },
  {
    "ticker": "STZ",
    "name": "Constellation Brands, Inc.",
    "sector": "Consumer Defensive",
    "price": 238.6
  },
  {
    "ticker": "BF.B",
    "name": "Brown-Forman Corporation",
    "sector": "Consumer Defensive",
    "price": 46.8
  },
  {
    "ticker": "LW",
    "name": "Lamb Weston Holdings, Inc.",
    "sector": "Consumer Defensive",
    "price": 74.6
  },
  {
    "ticker": "HSY",
    "name": "The Hershey Company",
    "sector": "Consumer Defensive",
    "price": 184.2
  },
  {
    "ticker": "MDLZ",
    "name": "Mondelez International, Inc.",
    "sector": "Consumer Defensive",
    "price": 68.9
  },
  {
    "ticker": "KR",
    "name": "The Kroger Co.",
    "sector": "Consumer Defensive",
    "price": 58.6
  },
  {
    "ticker": "ACI",
    "name": "Albertsons Companies, Inc.",
    "sector": "Consumer Defensive",
    "price": 19.8
  },
  {
    "ticker": "TGT",
    "name": "Target Corporation",
    "sector": "Consumer Cyclical",
    "price": 148.6
  },
  {
    "ticker": "DG",
    "name": "Dollar General Corporation",
    "sector": "Consumer Cyclical",
    "price": 84.2
  },
  {
    "ticker": "DLTR",
    "name": "Dollar Tree, Inc.",
    "sector": "Consumer Cyclical",
    "price": 72.6
  },
  {
    "ticker": "FIVE",
    "name": "Five Below, Inc.",
    "sector": "Consumer Cyclical",
    "price": 104.8
  },
  {
    "ticker": "BURL",
    "name": "Burlington Stores, Inc.",
    "sector": "Consumer Cyclical",
    "price": 278.4
  },
  {
    "ticker": "GPS",
    "name": "The Gap, Inc.",
    "sector": "Consumer Cyclical",
    "price": 24.6
  },
  {
    "ticker": "M",
    "name": "Macy's, Inc.",
    "sector": "Consumer Cyclical",
    "price": 16.8
  },
  {
    "ticker": "KSS",
    "name": "Kohl's Corporation",
    "sector": "Consumer Cyclical",
    "price": 18.4
  },
  {
    "ticker": "JWN",
    "name": "Nordstrom, Inc.",
    "sector": "Consumer Cyclical",
    "price": 24.2
  },
  {
    "ticker": "RL",
    "name": "Ralph Lauren Corporation",
    "sector": "Consumer Cyclical",
    "price": 224.6
  },
  {
    "ticker": "PVH",
    "name": "PVH Corp.",
    "sector": "Consumer Cyclical",
    "price": 104.2
  },
  {
    "ticker": "VFC",
    "name": "V.F. Corporation",
    "sector": "Consumer Cyclical",
    "price": 21.8
  },
  {
    "ticker": "TPR",
    "name": "Tapestry, Inc.",
    "sector": "Consumer Cyclical",
    "price": 58.4
  },
  {
    "ticker": "CPRI",
    "name": "Capri Holdings Limited",
    "sector": "Consumer Cyclical",
    "price": 22.6
  },
  {
    "ticker": "DECK",
    "name": "Deckers Outdoor Corporation",
    "sector": "Consumer Cyclical",
    "price": 174.8
  },
  {
    "ticker": "NKE",
    "name": "NIKE, Inc.",
    "sector": "Consumer Cyclical",
    "price": 84.6
  },
  {
    "ticker": "UAA",
    "name": "Under Armour, Inc.",
    "sector": "Consumer Cyclical",
    "price": 9.4
  },
  {
    "ticker": "LULU",
    "name": "Lululemon Athletica Inc.",
    "sector": "Consumer Cyclical",
    "price": 312.4
  },
  {
    "ticker": "HBI",
    "name": "Hanesbrands Inc.",
    "sector": "Consumer Cyclical",
    "price": 6.2
  },
  {
    "ticker": "LEG",
    "name": "Leggett & Platt, Incorporated",
    "sector": "Consumer Cyclical",
    "price": 12.4
  },
  {
    "ticker": "WHR",
    "name": "Whirlpool Corporation",
    "sector": "Consumer Cyclical",
    "price": 108.6
  },
  {
    "ticker": "MHK",
    "name": "Mohawk Industries, Inc.",
    "sector": "Consumer Cyclical",
    "price": 138.4
  },
  {
    "ticker": "POOL",
    "name": "Pool Corporation",
    "sector": "Consumer Cyclical",
    "price": 368.4
  },
  {
    "ticker": "HAS",
    "name": "Hasbro, Inc.",
    "sector": "Consumer Cyclical",
    "price": 68.4
  },
  {
    "ticker": "MAT",
    "name": "Mattel, Inc.",
    "sector": "Consumer Cyclical",
    "price": 19.8
  },
  {
    "ticker": "RIVN",
    "name": "Rivian Automotive, Inc.",
    "sector": "Consumer Cyclical",
    "price": 14.6
  },
  {
    "ticker": "LCID",
    "name": "Lucid Group, Inc.",
    "sector": "Consumer Cyclical",
    "price": 3.4
  },
  {
    "ticker": "NIO",
    "name": "NIO Inc.",
    "sector": "Consumer Cyclical",
    "price": 5.2
  },
  {
    "ticker": "LI",
    "name": "Li Auto Inc.",
    "sector": "Consumer Cyclical",
    "price": 26.8
  },
  {
    "ticker": "XPEV",
    "name": "XPeng Inc.",
    "sector": "Consumer Cyclical",
    "price": 14.2
  },
  {
    "ticker": "TM",
    "name": "Toyota Motor Corporation",
    "sector": "Consumer Cyclical",
    "price": 184.6
  },
  {
    "ticker": "HMC",
    "name": "Honda Motor Co., Ltd.",
    "sector": "Consumer Cyclical",
    "price": 31.4
  },
  {
    "ticker": "STLA",
    "name": "Stellantis N.V.",
    "sector": "Consumer Cyclical",
    "price": 14.8
  },
  {
    "ticker": "RACE",
    "name": "Ferrari N.V.",
    "sector": "Consumer Cyclical",
    "price": 468.2
  },
  {
    "ticker": "UBER",
    "name": "Uber Technologies, Inc.",
    "sector": "Technology",
    "price": 78.9
  },
  {
    "ticker": "LYFT",
    "name": "Lyft, Inc.",
    "sector": "Technology",
    "price": 16.4
  },
  {
    "ticker": "DASH",
    "name": "DoorDash, Inc.",
    "sector": "Consumer Cyclical",
    "price": 168.4
  },
  {
    "ticker": "COIN",
    "name": "Coinbase Global, Inc.",
    "sector": "Financial",
    "price": 264.8
  },
  {
    "ticker": "HOOD",
    "name": "Robinhood Markets, Inc.",
    "sector": "Financial",
    "price": 36.8
  },
  {
    "ticker": "SQ",
    "name": "Block, Inc.",
    "sector": "Financial",
    "price": 88.6
  },
  {
    "ticker": "PYPL",
    "name": "PayPal Holdings, Inc.",
    "sector": "Financial",
    "price": 86.4
  },
  {
    "ticker": "AFRM",
    "name": "Affirm Holdings, Inc.",
    "sector": "Financial",
    "price": 54.2
  },
  {
    "ticker": "SOFI",
    "name": "SoFi Technologies, Inc.",
    "sector": "Financial",
    "price": 14.8
  },
  {
    "ticker": "UPST",
    "name": "Upstart Holdings, Inc.",
    "sector": "Financial",
    "price": 62.4
  },
  {
    "ticker": "NU",
    "name": "Nu Holdings Ltd.",
    "sector": "Financial",
    "price": 14.6
  },
  {
    "ticker": "MELI",
    "name": "MercadoLibre, Inc.",
    "sector": "Consumer Cyclical",
    "price": 2080.0
  },
  {
    "ticker": "SE",
    "name": "Sea Limited",
    "sector": "Consumer Cyclical",
    "price": 108.4
  },
  {
    "ticker": "SHOP",
    "name": "Shopify Inc.",
    "sector": "Technology",
    "price": 112.6
  },
  {
    "ticker": "PINS",
    "name": "Pinterest, Inc.",
    "sector": "Communication Services",
    "price": 34.8
  },
  {
    "ticker": "SNAP",
    "name": "Snap Inc.",
    "sector": "Communication Services",
    "price": 11.4
  },
  {
    "ticker": "RDDT",
    "name": "Reddit, Inc.",
    "sector": "Communication Services",
    "price": 142.6
  },
  {
    "ticker": "ZM",
    "name": "Zoom Communications, Inc.",
    "sector": "Technology",
    "price": 78.4
  },
  {
    "ticker": "DOCU",
    "name": "DocuSign, Inc.",
    "sector": "Technology",
    "price": 74.6
  },
  {
    "ticker": "TWLO",
    "name": "Twilio Inc.",
    "sector": "Technology",
    "price": 98.4
  },
  {
    "ticker": "OKTA",
    "name": "Okta, Inc.",
    "sector": "Technology",
    "price": 88.2
  },
  {
    "ticker": "NET",
    "name": "Cloudflare, Inc.",
    "sector": "Technology",
    "price": 108.6
  },
  {
    "ticker": "MDB",
    "name": "MongoDB, Inc.",
    "sector": "Technology",
    "price": 284.5
  },
  {
    "ticker": "SNOW",
    "name": "Snowflake Inc.",
    "sector": "Technology",
    "price": 164.8
  },
  {
    "ticker": "PATH",
    "name": "UiPath Inc.",
    "sector": "Technology",
    "price": 14.2
  },
  {
    "ticker": "AI",
    "name": "C3.ai, Inc.",
    "sector": "Technology",
    "price": 34.6
  },
  {
    "ticker": "ARM",
    "name": "Arm Holdings plc",
    "sector": "Technology",
    "price": 148.4
  },
  {
    "ticker": "SMCI",
    "name": "Super Micro Computer, Inc.",
    "sector": "Technology",
    "price": 48.6
  },
  {
    "ticker": "MRVL",
    "name": "Marvell Technology, Inc.",
    "sector": "Technology",
    "price": 94.8
  },
  {
    "ticker": "NXPI",
    "name": "NXP Semiconductors N.V.",
    "sector": "Technology",
    "price": 234.6
  },
  {
    "ticker": "STM",
    "name": "STMicroelectronics N.V.",
    "sector": "Technology",
    "price": 28.4
  },
  {
    "ticker": "ASML",
    "name": "ASML Holding N.V.",
    "sector": "Technology",
    "price": 742.0
  },
  {
    "ticker": "TSM",
    "name": "Taiwan Semiconductor Manufacturing",
    "sector": "Technology",
    "price": 198.4
  },
  {
    "ticker": "SAP",
    "name": "SAP SE",
    "sector": "Technology",
    "price": 248.6
  },
  {
    "ticker": "DXCM",
    "name": "DexCom, Inc.",
    "sector": "Healthcare",
    "price": 78.4
  },
  {
    "ticker": "PODD",
    "name": "Insulet Corporation",
    "sector": "Healthcare",
    "price": 254.6
  },
  {
    "ticker": "ALNY",
    "name": "Alnylam Pharmaceuticals, Inc.",
    "sector": "Healthcare",
    "price": 278.4
  },
  {
    "ticker": "INCY",
    "name": "Incyte Corporation",
    "sector": "Healthcare",
    "price": 72.6
  },
  {
    "ticker": "EXAS",
    "name": "Exact Sciences Corporation",
    "sector": "Healthcare",
    "price": 64.8
  },
  {
    "ticker": "HOLX",
    "name": "Hologic, Inc.",
    "sector": "Healthcare",
    "price": 82.4
  },
  {
    "ticker": "TECH",
    "name": "Bio-Techne Corporation",
    "sector": "Healthcare",
    "price": 78.6
  },
  {
    "ticker": "COO",
    "name": "The Cooper Companies, Inc.",
    "sector": "Healthcare",
    "price": 104.8
  },
  {
    "ticker": "RMD",
    "name": "ResMed Inc.",
    "sector": "Healthcare",
    "price": 246.4
  },
  {
    "ticker": "SOLV",
    "name": "Solventum Corporation",
    "sector": "Healthcare",
    "price": 72.8
  },
  {
    "ticker": "GEHC",
    "name": "GE HealthCare Technologies Inc.",
    "sector": "Healthcare",
    "price": 88.4
  },
  {
    "ticker": "KVUE",
    "name": "Kenvue Inc.",
    "sector": "Consumer Defensive",
    "price": 23.4
  },
  {
    "ticker": "CLX",
    "name": "The Clorox Company",
    "sector": "Consumer Defensive",
    "price": 164.8
  },
  {
    "ticker": "CHD",
    "name": "Church & Dwight Co., Inc.",
    "sector": "Consumer Defensive",
    "price": 108.6
  },
  {
    "ticker": "PPC",
    "name": "Pilgrim's Pride Corporation",
    "sector": "Consumer Defensive",
    "price": 46.8
  },
  {
    "ticker": "POST",
    "name": "Post Holdings, Inc.",
    "sector": "Consumer Defensive",
    "price": 118.6
  },
  {
    "ticker": "UTHR",
    "name": "United Therapeutics Corporation",
    "sector": "Healthcare",
    "price": 368.4
  },
  {
    "ticker": "NBIX",
    "name": "Neurocrine Biosciences, Inc.",
    "sector": "Healthcare",
    "price": 128.6
  },
  {
    "ticker": "JAZZ",
    "name": "Jazz Pharmaceuticals plc",
    "sector": "Healthcare",
    "price": 114.8
  },
  {
    "ticker": "HALO",
    "name": "Halozyme Therapeutics, Inc.",
    "sector": "Healthcare",
    "price": 54.6
  },
  {
    "ticker": "SRPT",
    "name": "Sarepta Therapeutics, Inc.",
    "sector": "Healthcare",
    "price": 124.8
  },
  {
    "ticker": "IONS",
    "name": "Ionis Pharmaceuticals, Inc.",
    "sector": "Healthcare",
    "price": 42.6
  },
  {
    "ticker": "RARE",
    "name": "Ultragenyx Pharmaceutical Inc.",
    "sector": "Healthcare",
    "price": 48.4
  },
  {
    "ticker": "BMRN",
    "name": "BioMarin Pharmaceutical Inc.",
    "sector": "Healthcare",
    "price": 68.2
  },
  {
    "ticker": "PCVX",
    "name": "Vaxcyte, Inc.",
    "sector": "Healthcare",
    "price": 108.4
  },
  {
    "ticker": "ARGX",
    "name": "argenx SE",
    "sector": "Healthcare",
    "price": 584.6
  },
  {
    "ticker": "VKTX",
    "name": "Viking Therapeutics, Inc.",
    "sector": "Healthcare",
    "price": 68.4
  },
  {
    "ticker": "CRSP",
    "name": "CRISPR Therapeutics AG",
    "sector": "Healthcare",
    "price": 54.2
  },
  {
    "ticker": "NTLA",
    "name": "Intellia Therapeutics, Inc.",
    "sector": "Healthcare",
    "price": 18.6
  },
  {
    "ticker": "BEAM",
    "name": "Beam Therapeutics Inc.",
    "sector": "Healthcare",
    "price": 26.8
  },
  {
    "ticker": "EDIT",
    "name": "Editas Medicine, Inc.",
    "sector": "Healthcare",
    "price": 4.2
  },
  {
    "ticker": "ILMN",
    "name": "Illumina, Inc.",
    "sector": "Healthcare",
    "price": 148.6
  },
  {
    "ticker": "PACB",
    "name": "Pacific Biosciences of California",
    "sector": "Healthcare",
    "price": 2.1
  },
  {
    "ticker": "TXG",
    "name": "10x Genomics, Inc.",
    "sector": "Healthcare",
    "price": 18.4
  },
  {
    "ticker": "GH",
    "name": "Guardant Health, Inc.",
    "sector": "Healthcare",
    "price": 32.6
  },
  {
    "ticker": "NTRA",
    "name": "Natera, Inc.",
    "sector": "Healthcare",
    "price": 148.2
  },
  {
    "ticker": "DOCS",
    "name": "Doximity, Inc.",
    "sector": "Healthcare",
    "price": 52.4
  },
  {
    "ticker": "TDOC",
    "name": "Teladoc Health, Inc.",
    "sector": "Healthcare",
    "price": 10.8
  },
  {
    "ticker": "VEEV",
    "name": "Veeva Systems Inc.",
    "sector": "Healthcare",
    "price": 236.4
  },
  {
    "ticker": "MOH",
    "name": "Molina Healthcare, Inc.",
    "sector": "Healthcare",
    "price": 318.6
  },
  {
    "ticker": "CNC",
    "name": "Centene Corporation",
    "sector": "Healthcare",
    "price": 64.8
  },
  {
    "ticker": "HUM",
    "name": "Humana Inc.",
    "sector": "Healthcare",
    "price": 268.4
  },
  {
    "ticker": "ACGL",
    "name": "Arch Capital Group Ltd.",
    "sector": "Financial",
    "price": 102.4
  },
  {
    "ticker": "WRB",
    "name": "W. R. Berkley Corporation",
    "sector": "Financial",
    "price": 62.8
  },
  {
    "ticker": "RLI",
    "name": "RLI Corp.",
    "sector": "Financial",
    "price": 168.4
  },
  {
    "ticker": "AFG",
    "name": "American Financial Group, Inc.",
    "sector": "Financial",
    "price": 138.6
  },
  {
    "ticker": "PRI",
    "name": "Primerica, Inc.",
    "sector": "Financial",
    "price": 274.8
  },
  {
    "ticker": "UNM",
    "name": "Unum Group",
    "sector": "Financial",
    "price": 72.4
  },
  {
    "ticker": "LNC",
    "name": "Lincoln National Corporation",
    "sector": "Financial",
    "price": 36.8
  },
  {
    "ticker": "MET",
    "name": "MetLife, Inc.",
    "sector": "Financial",
    "price": 84.6
  },
  {
    "ticker": "PRU",
    "name": "Prudential Financial, Inc.",
    "sector": "Financial",
    "price": 128.4
  },
  {
    "ticker": "EQH",
    "name": "Equitable Holdings, Inc.",
    "sector": "Financial",
    "price": 46.8
  },
  {
    "ticker": "VOYA",
    "name": "Voya Financial, Inc.",
    "sector": "Financial",
    "price": 78.6
  },
  {
    "ticker": "BHF",
    "name": "Brighthouse Financial, Inc.",
    "sector": "Financial",
    "price": 48.4
  },
  {
    "ticker": "GL",
    "name": "Globe Life Inc.",
    "sector": "Financial",
    "price": 108.6
  },
  {
    "ticker": "FNF",
    "name": "Fidelity National Financial, Inc.",
    "sector": "Financial",
    "price": 62.4
  },
  {
    "ticker": "FAF",
    "name": "First American Financial Corp.",
    "sector": "Financial",
    "price": 64.8
  },
  {
    "ticker": "AMG",
    "name": "Affiliated Managers Group, Inc.",
    "sector": "Financial",
    "price": 188.6
  },
  {
    "ticker": "IVZ",
    "name": "Invesco Ltd.",
    "sector": "Financial",
    "price": 18.4
  },
  {
    "ticker": "BEN",
    "name": "Franklin Resources, Inc.",
    "sector": "Financial",
    "price": 21.6
  }
];

let stockPortfolio = safeParseJSON(safeGetStorage('spikey_stock_portfolio'), {});
let stockQuotes = safeParseJSON(safeGetStorage('spikey_stock_quotes'), null);
let cryptoPortfolio = safeParseJSON(safeGetStorage('spikey_crypto_portfolio'), {});
let cryptoQuotes = safeParseJSON(safeGetStorage('spikey_crypto_quotes'), null);
let stockTradeLog = safeParseJSON(safeGetStorage('spikey_stock_trades'), []);
let stockLiveInterval = null;
let marketsAsset = 'stocks';
const SPARK_HISTORY_LEN = 24;

const REAL_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', category: 'Layer 1', price: 91250.00 },
  { symbol: 'ETH', name: 'Ethereum', category: 'Layer 1', price: 3420.50 },
  { symbol: 'USDT', name: 'Tether', category: 'Stablecoin', price: 1.00 },
  { symbol: 'BNB', name: 'BNB', category: 'Exchange', price: 612.40 },
  { symbol: 'SOL', name: 'Solana', category: 'Layer 1', price: 178.25 },
  { symbol: 'XRP', name: 'XRP', category: 'Payments', price: 1.42 },
  { symbol: 'USDC', name: 'USD Coin', category: 'Stablecoin', price: 1.00 },
  { symbol: 'ADA', name: 'Cardano', category: 'Layer 1', price: 0.68 },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'Meme', price: 0.24 },
  { symbol: 'AVAX', name: 'Avalanche', category: 'Layer 1', price: 38.90 },
  { symbol: 'TRX', name: 'TRON', category: 'Layer 1', price: 0.19 },
  { symbol: 'DOT', name: 'Polkadot', category: 'Layer 0', price: 7.85 },
  { symbol: 'LINK', name: 'Chainlink', category: 'Oracle', price: 16.40 },
  { symbol: 'MATIC', name: 'Polygon', category: 'Layer 2', price: 0.52 },
  { symbol: 'TON', name: 'Toncoin', category: 'Layer 1', price: 5.65 },
  { symbol: 'SHIB', name: 'Shiba Inu', category: 'Meme', price: 0.0000185 },
  { symbol: 'LTC', name: 'Litecoin', category: 'Payments', price: 92.30 },
  { symbol: 'BCH', name: 'Bitcoin Cash', category: 'Payments', price: 385.00 },
  { symbol: 'UNI', name: 'Uniswap', category: 'DeFi', price: 12.80 },
  { symbol: 'ATOM', name: 'Cosmos', category: 'Layer 0', price: 8.15 },
  { symbol: 'XLM', name: 'Stellar', category: 'Payments', price: 0.28 },
  { symbol: 'NEAR', name: 'NEAR Protocol', category: 'Layer 1', price: 5.20 },
  { symbol: 'ICP', name: 'Internet Computer', category: 'Layer 1', price: 11.40 },
  { symbol: 'APT', name: 'Aptos', category: 'Layer 1', price: 9.75 },
  { symbol: 'FIL', name: 'Filecoin', category: 'Storage', price: 5.45 },
  { symbol: 'ARB', name: 'Arbitrum', category: 'Layer 2', price: 0.92 },
  { symbol: 'OP', name: 'Optimism', category: 'Layer 2', price: 1.85 },
  { symbol: 'INJ', name: 'Injective', category: 'DeFi', price: 24.60 },
  { symbol: 'SUI', name: 'Sui', category: 'Layer 1', price: 2.15 },
  { symbol: 'PEPE', name: 'Pepe', category: 'Meme', price: 0.0000128 },
  { symbol: 'AAVE', name: 'Aave', category: 'DeFi', price: 185.00 },
  { symbol: 'MKR', name: 'Maker', category: 'DeFi', price: 1680.00 },
  { symbol: 'RENDER', name: 'Render', category: 'AI / Compute', price: 7.25 },
  { symbol: 'IMX', name: 'Immutable', category: 'Gaming', price: 1.42 },
  { symbol: 'HBAR', name: 'Hedera', category: 'Layer 1', price: 0.18 },
  { symbol: 'VET', name: 'VeChain', category: 'Enterprise', price: 0.035 },
  { symbol: 'ALGO', name: 'Algorand', category: 'Layer 1', price: 0.22 },
  { symbol: 'FTM', name: 'Fantom', category: 'Layer 1', price: 0.68 },
  { symbol: 'SAND', name: 'The Sandbox', category: 'Gaming', price: 0.48 },
  { symbol: 'MANA', name: 'Decentraland', category: 'Gaming', price: 0.42 }
];

function seedHistory(basePrice, changePct, len = SPARK_HISTORY_LEN) {
  const hist = [];
  let p = Math.max(0.00000001, basePrice * (1 - (changePct || 0) / 200));
  for (let i = 0; i < len; i++) {
    const wobble = 1 + ((Math.sin(i * 0.7 + basePrice * 0.001) + (i % 5 - 2) * 0.08) * 0.014);
    p = Math.max(0.00000001, p * wobble);
    hist.push(Number(p));
  }
  const target = Math.max(0.00000001, basePrice * (1 + (changePct || 0) / 100));
  hist[hist.length - 1] = target;
  return hist;
}

function generateSparklineSVG(history, up = true, w = 120, h = 36, opts = {}) {
  if (!history || history.length < 2) {
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${up ? '#10b981' : '#ef4444'}" stroke-width="1.5" points="0,${h / 2} ${w},${h / 2}"/></svg>`;
  }
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const padY = opts.padY != null ? opts.padY : 4;
  const padX = opts.padX != null ? opts.padX : 0;
  const strokeW = opts.strokeWidth || 1.8;
  const showDots = !!opts.showDots;
  const ptsArr = history.map((v, i) => {
    const x = padX + (i / (history.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (v - min) / range) * (h - padY * 2);
    return [x, y];
  });
  const pts = ptsArr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${padX},${h} ${pts} ${w - padX},${h}`;
  const stroke = up ? '#10b981' : '#ef4444';
  const fill = up ? 'rgba(16,185,129,0.16)' : 'rgba(239,68,68,0.14)';
  const last = ptsArr[ptsArr.length - 1];
  let dots = '';
  if (showDots) {
    dots = `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.2" fill="${stroke}" stroke="#05070e" stroke-width="1.5"/>`;
  }
  // subtle grid for larger charts
  let grid = '';
  if (opts.grid) {
    for (let g = 1; g < 4; g++) {
      const gy = (h / 4) * g;
      grid += `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="rgba(167,139,250,0.08)" stroke-width="1"/>`;
    }
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${grid}<polygon fill="${fill}" points="${area}"/><polyline fill="none" stroke="${stroke}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>${dots}</svg>`;
}

let tradeChartTf = '1H';
let tradeLiveInterval = null;

function setTradeChartTf(tf, el) {
  tradeChartTf = tf || '1H';
  document.querySelectorAll('.chart-tf').forEach(b => b.classList.toggle('active', b.getAttribute('data-tf') === tradeChartTf));
  if (activeTradeTicker) renderTradeLiveChart();
}

function buildExtendedHistory(baseHistory, price, tf) {
  const lens = { '1H': 30, '24H': 48, '7D': 56, '30D': 60 };
  const len = lens[tf] || 30;
  const src = Array.isArray(baseHistory) && baseHistory.length ? baseHistory.slice() : [price];
  // Expand / resample for longer timeframes with mild drift
  const out = [];
  let p = src[0];
  for (let i = 0; i < len; i++) {
    const t = i / Math.max(1, len - 1);
    const srcIdx = Math.min(src.length - 1, Math.floor(t * (src.length - 1)));
    const target = src[srcIdx];
    const noise = 1 + (Math.sin(i * 1.7 + price * 0.01) * 0.004 + (Math.random() - 0.5) * 0.006);
    p = Math.max(0.00000001, p * 0.72 + target * 0.28) * noise;
    out.push(p);
  }
  out[out.length - 1] = price;
  return out;
}

function renderTradeLiveChart() {
  const host = document.getElementById('tradeChartHost');
  if (!host || !activeTradeTicker) return;
  let q, price;
  if (activeTradeAsset === 'crypto') {
    q = cryptoQuotes[activeTradeTicker];
    price = q?.price;
  } else {
    q = stockQuotes[activeTradeTicker];
    price = q?.price;
  }
  if (!q || price == null) return;
  const hist = buildExtendedHistory(q.history || [price], price, tradeChartTf);
  const up = (q.changePct || 0) >= 0;
  host.innerHTML = generateSparklineSVG(hist, up, 440, 160, { strokeWidth: 2.2, showDots: true, grid: true, padY: 10 });
  // stats
  const hi = q.high != null ? q.high : Math.max(...hist);
  const lo = q.low != null ? q.low : Math.min(...hist);
  const volBase = activeTradeAsset === 'crypto' ? 1.2e6 : 3.4e5;
  const vol = volBase * (0.7 + Math.abs(q.changePct || 0) / 20) * (0.85 + Math.random() * 0.3);
  const hiEl = document.getElementById('tradeStatHigh');
  const loEl = document.getElementById('tradeStatLow');
  const volEl = document.getElementById('tradeStatVol');
  if (hiEl) hiEl.innerText = formatAssetPrice(hi);
  if (loEl) loEl.innerText = formatAssetPrice(lo);
  if (volEl) volEl.innerText = vol >= 1e6 ? (vol / 1e6).toFixed(2) + 'M' : (vol / 1e3).toFixed(1) + 'K';
  // delta $
  const deltaEl = document.getElementById('tradeStockDelta');
  if (deltaEl && q.basePrice) {
    const d = price - q.basePrice;
    const sign = d >= 0 ? '+' : '';
    deltaEl.innerText = `${sign}${formatAssetPrice(Math.abs(d)).replace('$', d < 0 ? '-$' : '$')}`.replace('$-', '-$');
    deltaEl.style.color = d >= 0 ? '#10b981' : '#ef4444';
  }
}

function startTradeLiveTicks() {
  stopTradeLiveTicks();
  tradeLiveInterval = setInterval(() => {
    if (!activeTradeTicker) return;
    // micro tick on the open asset
    if (activeTradeAsset === 'crypto') {
      const q = cryptoQuotes[activeTradeTicker];
      if (!q) return;
      const vol = 0.35;
      const next = Math.max(0.00000001, q.price * (1 + (Math.random() - 0.48) * vol / 100));
      pushPriceHistory(q, next);
      q.price = next;
      q.changePct = Number((((next - q.basePrice) / q.basePrice) * 100).toFixed(2));
    } else {
      const q = stockQuotes[activeTradeTicker];
      if (!q) return;
      const next = Math.max(0.01, Number((q.price * (1 + (Math.random() - 0.48) * 0.45 / 100)).toFixed(2)));
      pushPriceHistory(q, next);
      q.price = next;
      q.changePct = Number((((next - q.basePrice) / q.basePrice) * 100).toFixed(2));
    }
    // refresh price labels + chart without full modal rebuild
    const q = activeTradeAsset === 'crypto' ? cryptoQuotes[activeTradeTicker] : stockQuotes[activeTradeTicker];
    if (!q) return;
    const priceEl = document.getElementById('tradeStockPrice');
    const chgEl = document.getElementById('tradeStockChange');
    if (priceEl) priceEl.innerText = formatAssetPrice(q.price);
    if (chgEl) {
      const pct = q.changePct || 0;
      chgEl.innerText = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      chgEl.style.color = pct >= 0 ? '#10b981' : '#ef4444';
    }
    updateTradeEstimate();
    renderTradeLiveChart();
  }, 1800);
}

function stopTradeLiveTicks() {
  if (tradeLiveInterval) {
    clearInterval(tradeLiveInterval);
    tradeLiveInterval = null;
  }
}


function formatAssetPrice(price) {
  const n = Number(price);
  if (n >= 1000) return formatMoney(n);
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
}

function pushPriceHistory(q, nextPrice) {
  if (!Array.isArray(q.history)) q.history = [];
  q.history.push(Number(nextPrice));
  if (q.history.length > SPARK_HISTORY_LEN) q.history = q.history.slice(-SPARK_HISTORY_LEN);
  q.high = Math.max(q.high != null ? q.high : nextPrice, nextPrice);
  q.low = Math.min(q.low != null ? q.low : nextPrice, nextPrice);
}

function initStockQuotes() {
  if (!stockQuotes || typeof stockQuotes !== 'object') {
    stockQuotes = {};
    REAL_500_COMPANIES.forEach((c, idx) => {
      const pct = Number((((idx * 17) % 19 - 8.5) * 0.35).toFixed(2));
      const curPrice = Number((c.price * (1 + pct / 100)).toFixed(2));
      stockQuotes[c.ticker] = {
        basePrice: c.price, price: Math.max(0.01, curPrice), changePct: pct,
        high: Number((curPrice * 1.018).toFixed(2)), low: Number((curPrice * 0.982).toFixed(2)),
        history: seedHistory(c.price, pct)
      };
    });
    safeSetStorage('spikey_stock_quotes', JSON.stringify(stockQuotes));
  } else {
    REAL_500_COMPANIES.forEach((c) => {
      if (!stockQuotes[c.ticker]) {
        stockQuotes[c.ticker] = { basePrice: c.price, price: c.price, changePct: 0, high: c.price, low: c.price, history: seedHistory(c.price, 0) };
      } else {
        const q = stockQuotes[c.ticker];
        if (!Array.isArray(q.history) || q.history.length < 4) q.history = seedHistory(q.basePrice || c.price, q.changePct || 0);
        if (typeof q.high !== 'number') q.high = q.price;
        if (typeof q.low !== 'number') q.low = q.price;
      }
    });
  }
}
initStockQuotes();

function initCryptoQuotes() {
  if (!cryptoQuotes || typeof cryptoQuotes !== 'object') {
    cryptoQuotes = {};
    REAL_CRYPTOS.forEach((c, idx) => {
      const pct = Number((((idx * 13) % 17 - 7.5) * 0.55).toFixed(2));
      const curPrice = Math.max(0.00000001, Number((c.price * (1 + pct / 100))));
      cryptoQuotes[c.symbol] = {
        basePrice: c.price, price: curPrice, changePct: pct,
        high: curPrice * 1.025, low: curPrice * 0.975, history: seedHistory(c.price, pct)
      };
    });
    safeSetStorage('spikey_crypto_quotes', JSON.stringify(cryptoQuotes));
  } else {
    REAL_CRYPTOS.forEach((c) => {
      if (!cryptoQuotes[c.symbol]) {
        cryptoQuotes[c.symbol] = { basePrice: c.price, price: c.price, changePct: 0, high: c.price, low: c.price, history: seedHistory(c.price, 0) };
      } else {
        const q = cryptoQuotes[c.symbol];
        if (!Array.isArray(q.history) || q.history.length < 4) q.history = seedHistory(q.basePrice || c.price, q.changePct || 0);
        if (typeof q.high !== 'number') q.high = q.price;
        if (typeof q.low !== 'number') q.low = q.price;
      }
    });
  }
}
initCryptoQuotes();

function refreshStockPricesTick(manual = false) {
  REAL_500_COMPANIES.forEach((c) => {
    const q = stockQuotes[c.ticker];
    if (!q) return;
    const deltaPct = (Math.random() - 0.48) * 2.8;
    const nextPrice = Math.max(0.01, Number((q.price * (1 + deltaPct / 100)).toFixed(2)));
    const totalPct = Number((((nextPrice - q.basePrice) / q.basePrice) * 100).toFixed(2));
    pushPriceHistory(q, nextPrice);
    q.price = nextPrice;
    q.changePct = totalPct;
  });
  safeSetStorage('spikey_stock_quotes', JSON.stringify(stockQuotes));
}

function refreshCryptoPricesTick() {
  REAL_CRYPTOS.forEach((c) => {
    const q = cryptoQuotes[c.symbol];
    if (!q) return;
    const vol = c.category === 'Stablecoin' ? 0.08 : (c.category === 'Meme' ? 4.5 : 3.2);
    const deltaPct = (Math.random() - 0.48) * vol;
    const nextPrice = Math.max(0.00000001, q.price * (1 + deltaPct / 100));
    const totalPct = Number((((nextPrice - q.basePrice) / q.basePrice) * 100).toFixed(2));
    pushPriceHistory(q, nextPrice);
    q.price = nextPrice;
    q.changePct = totalPct;
  });
  safeSetStorage('spikey_crypto_quotes', JSON.stringify(cryptoQuotes));
}

function refreshAllMarketQuotes(manual = false) {
  refreshStockPricesTick(false);
  refreshCryptoPricesTick();
  applyStockFilters(false);
  applyCryptoFilters(false);
  renderStockPortfolioSummary();
  renderMarketPulse();
  if (activeTradeTicker) openStockTradeModal(activeTradeTicker, activeTradeSide, activeTradeAsset);
  const tickEl = document.getElementById('marketLastTick');
  if (tickEl) {
    const now = new Date();
    tickEl.innerText = `Last tick: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
  if (manual) showToast('Updated live quotes · stocks + crypto', '📈');
}

function toggleStockLiveFeed() {
  const on = document.getElementById('stockLiveToggle')?.checked;
  if (stockLiveInterval) { clearInterval(stockLiveInterval); stockLiveInterval = null; }
  if (on) {
    stockLiveInterval = setInterval(() => {
      const tab = document.getElementById('tab-stocks');
      if (tab && tab.style.display !== 'none') refreshAllMarketQuotes(false);
    }, 12000);
  }
}

function setMarketsAsset(asset, el) {
  marketsAsset = asset === 'crypto' ? 'crypto' : 'stocks';
  document.getElementById('marketsTabStocks')?.classList.toggle('active', marketsAsset === 'stocks');
  document.getElementById('marketsTabCrypto')?.classList.toggle('active', marketsAsset === 'crypto');
  const stocksPanel = document.getElementById('marketsStocksPanel');
  const cryptoPanel = document.getElementById('marketsCryptoPanel');
  if (stocksPanel) stocksPanel.style.display = marketsAsset === 'stocks' ? 'block' : 'none';
  if (cryptoPanel) cryptoPanel.style.display = marketsAsset === 'crypto' ? 'block' : 'none';
  if (el) {
    document.querySelectorAll('#marketsAssetSwitch .filter-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  }
  renderMarketPulse();
  if (marketsAsset === 'stocks') applyStockFilters(false);
  else applyCryptoFilters(false);
}

function renderMarketPulse() {
  const gainersEl = document.getElementById('topGainersList');
  const losersEl = document.getElementById('topLosersList');
  if (!gainersEl || !losersEl) return;
  let ranked;
  if (marketsAsset === 'crypto') {
    ranked = REAL_CRYPTOS.map(c => ({ ticker: c.symbol, pct: cryptoQuotes[c.symbol]?.changePct || 0 })).sort((a, b) => b.pct - a.pct);
  } else {
    ranked = REAL_500_COMPANIES.map(c => ({ ticker: c.ticker, pct: stockQuotes[c.ticker]?.changePct || 0 })).sort((a, b) => b.pct - a.pct);
  }
  const topG = ranked.slice(0, 4);
  const topL = ranked.slice(-4).reverse();
  gainersEl.innerHTML = topG.map(g => `<span class="market-pulse-item up"><span class="mono">${escapeHTML(g.ticker)}</span> <span class="chg">+${g.pct.toFixed(2)}%</span></span>`).join('');
  losersEl.innerHTML = topL.map(g => `<span class="market-pulse-item down"><span class="mono">${escapeHTML(g.ticker)}</span> <span class="chg">${g.pct.toFixed(2)}%</span></span>`).join('');
}

function saveStockPortfolio() {
  safeSetStorage('spikey_stock_portfolio', JSON.stringify(stockPortfolio));
  safeSetStorage('spikey_stock_quotes', JSON.stringify(stockQuotes));
  safeSetStorage('spikey_crypto_portfolio', JSON.stringify(cryptoPortfolio));
  safeSetStorage('spikey_crypto_quotes', JSON.stringify(cryptoQuotes));
  safeSetStorage('spikey_stock_trades', JSON.stringify(stockTradeLog.slice(-80)));
}

function getPortfolioMetrics() {
  let stockEquity = 0, stockCost = 0, stockCount = 0;
  Object.entries(stockPortfolio).forEach(([ticker, pos]) => {
    if (!pos || pos.shares <= 0) return;
    const q = stockQuotes[ticker];
    const price = q ? q.price : (pos.avgCost || 0);
    stockEquity += pos.shares * price;
    stockCost += pos.shares * (pos.avgCost || price);
    stockCount++;
  });
  let cryptoEquity = 0, cryptoCost = 0, cryptoCount = 0;
  Object.entries(cryptoPortfolio).forEach(([sym, pos]) => {
    if (!pos || pos.shares <= 0) return;
    const q = cryptoQuotes[sym];
    const price = q ? q.price : (pos.avgCost || 0);
    cryptoEquity += pos.shares * price;
    cryptoCost += pos.shares * (pos.avgCost || price);
    cryptoCount++;
  });
  const equity = stockEquity + cryptoEquity;
  const costBasis = stockCost + cryptoCost;
  const pnl = equity - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { equity, costBasis, pnl, pnlPct, stockEquity, cryptoEquity, stockCount, cryptoCount };
}

function getSimulatedWalletAddress() {
  const seed = (currentUser || visitorIP || 'guest').toString();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const hex = (Math.abs(h) >>> 0).toString(16).padStart(8, '0') + ((Math.abs(h * 2654435761) >>> 0).toString(16).padStart(8, '0'));
  return `vx0x${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

function copyWalletAddress(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const addr = getSimulatedWalletAddress();
  const full = addr.includes('…') ? ('vx0x' + addr.replace('vx0x', '').replace('…', '') + Math.abs(hashCode(currentUser || visitorIP || 'guest')).toString(16).padStart(16, '0').slice(0, 24)) : addr;
  // Present a full-looking simulated address for Phantom-like UX
  const seed = (currentUser || visitorIP || 'guest').toString();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const fullAddr = 'vx0x' + (Math.abs(h) >>> 0).toString(16).padStart(8, '0') + ((Math.abs(h * 2654435761) >>> 0).toString(16).padStart(8, '0')) + ((Math.abs(h * 1597334677) >>> 0).toString(16).padStart(8, '0'));
  copyTextToClipboard(fullAddr, 'Wallet address copied');
}
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (Math.imul(31, h) + String(s).charCodeAt(i)) | 0;
  return h;
}

function syncWalletAddressUI() {
  const addr = getSimulatedWalletAddress();
  const el = document.getElementById('walletAddressDisplay');
  if (el) el.innerText = addr;
  const hint = document.getElementById('stockWalletAddrHint');
  if (hint) hint.innerText = addr;
}

function renderStockPortfolioSummary() {
  const cashEl = document.getElementById('stockCashBalance');
  if (!cashEl) return;
  const m = getPortfolioMetrics();
  cashEl.innerText = formatMoney(userBalance);
  document.getElementById('stockPortfolioEquity').innerText = formatMoney(m.stockEquity);
  const cryptoEqEl = document.getElementById('cryptoPortfolioEquity');
  if (cryptoEqEl) cryptoEqEl.innerText = formatMoney(m.cryptoEquity);
  document.getElementById('stockTotalNetWorth').innerText = formatMoney(userBalance + m.equity);
  const pnlEl = document.getElementById('stockUnrealizedPnL');
  const sign = m.pnl >= 0 ? '+' : '';
  pnlEl.innerText = `${sign}${formatMoney(m.pnl)} (${sign}${m.pnlPct.toFixed(2)}%)`;
  pnlEl.style.color = m.pnl >= 0 ? '#10b981' : '#ef4444';
  const stockCountEl = document.getElementById('stockHoldingsCount');
  if (stockCountEl) stockCountEl.innerText = m.stockCount;
  const cryptoCountEl = document.getElementById('cryptoHoldingsCount');
  if (cryptoCountEl) cryptoCountEl.innerText = m.cryptoCount;
  syncWalletAddressUI();

  const tbody = document.getElementById('stockHoldingsBody');
  const stockRows = Object.entries(stockPortfolio).filter(([, p]) => p && p.shares > 0).map(([ticker, pos]) => {
    const comp = REAL_500_COMPANIES.find(c => c.ticker === ticker) || { name: ticker, ticker };
    const q = stockQuotes[ticker] || { price: pos.avgCost, changePct: 0, history: [] };
    return { kind: 'stock', key: ticker, name: comp.name, pos, q };
  });
  const cryptoRows = Object.entries(cryptoPortfolio).filter(([, p]) => p && p.shares > 0).map(([sym, pos]) => {
    const comp = REAL_CRYPTOS.find(c => c.symbol === sym) || { name: sym, symbol: sym };
    const q = cryptoQuotes[sym] || { price: pos.avgCost, changePct: 0, history: [] };
    return { kind: 'crypto', key: sym, name: comp.name, pos, q };
  });
  const all = [...stockRows, ...cryptoRows];
  if (all.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:14px; text-align:center; color:var(--muted);">No positions yet. Buy stocks or crypto below with your Crypto Wallet.</td></tr>`;
    return;
  }
  tbody.innerHTML = all.map(row => {
    const { kind, key, name, pos, q } = row;
    const mktVal = pos.shares * q.price;
    const posCost = pos.shares * pos.avgCost;
    const posPnl = mktVal - posCost;
    const posPct = posCost > 0 ? (posPnl / posCost) * 100 : 0;
    const pSign = posPnl >= 0 ? '+' : '';
    const spark = generateSparklineSVG(q.history || [], (q.changePct || 0) >= 0, 72, 28);
    const badgeStyle = kind === 'crypto'
      ? 'font-size:10px;font-weight:800;background:rgba(245,158,11,0.18);color:#fbbf24;padding:2px 6px;border-radius:5px;border:1px solid rgba(245,158,11,0.35);'
      : 'color:#a78bfa;';
    const qtyStr = kind === 'crypto'
      ? (pos.shares >= 1 ? Number(pos.shares.toFixed(4)) : Number(pos.shares.toPrecision(4)))
      : Number(pos.shares.toFixed(4));
    return `
      <tr style="border-bottom:1px solid rgba(167,139,250,0.14);">
        <td style="padding:10px; font-weight:700; color:#fff;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="stock-spark" style="width:72px; height:28px; flex-shrink:0;">${spark}</div>
            <div>
              <span class="mono" style="${badgeStyle}">${escapeHTML(key)}</span>
              <div style="font-size:11px; color:var(--muted); font-weight:500;">${escapeHTML(name)} · ${kind}</div>
            </div>
          </div>
        </td>
        <td class="mono" style="padding:10px;">${qtyStr}</td>
        <td class="mono" style="padding:10px;">${formatAssetPrice(pos.avgCost)}</td>
        <td class="mono" style="padding:10px; font-weight:700;">${formatAssetPrice(q.price)}</td>
        <td class="mono" style="padding:10px; font-weight:700; color:#fff;">${formatMoney(mktVal)}</td>
        <td class="mono" style="padding:10px; font-weight:700; color:${posPnl >= 0 ? '#10b981' : '#ef4444'};">${pSign}${formatMoney(posPnl)} (${pSign}${posPct.toFixed(2)}%)</td>
        <td style="padding:10px; text-align:right; white-space:nowrap;">
          <button type="button" class="liquid-btn btn-emerald" style="padding:5px 10px; font-size:10.5px;" onclick="openStockTradeModal('${escapeHTML(key)}', 'buy', '${kind}')">Buy</button>
          <button type="button" class="liquid-btn btn-ghost" style="padding:5px 10px; font-size:10.5px; color:#fca5a5;" onclick="openStockTradeModal('${escapeHTML(key)}', 'sell', '${kind}')">Sell</button>
        </td>
      </tr>`;
  }).join('');
}

let filteredStocks = [...REAL_500_COMPANIES];
let visibleStockLimit = 24;

function applyStockFilters(resetLimit = true) {
  const grid = document.getElementById('stockGridContainer');
  if (!grid) return;
  const qSearch = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const sector = document.getElementById('stockSectorFilter')?.value || 'all';
  const sortMode = document.getElementById('stockSortSelect')?.value || 'default';
  let list = REAL_500_COMPANIES.filter(c => {
    if (sector !== 'all' && c.sector !== sector) return false;
    if (!qSearch) return true;
    return c.ticker.toLowerCase().includes(qSearch) || c.name.toLowerCase().includes(qSearch) || c.sector.toLowerCase().includes(qSearch);
  });
  if (sortMode === 'price_desc') list.sort((a, b) => (stockQuotes[b.ticker]?.price || b.price) - (stockQuotes[a.ticker]?.price || a.price));
  else if (sortMode === 'price_asc') list.sort((a, b) => (stockQuotes[a.ticker]?.price || a.price) - (stockQuotes[b.ticker]?.price || b.price));
  else if (sortMode === 'chg_desc') list.sort((a, b) => (stockQuotes[b.ticker]?.changePct || 0) - (stockQuotes[a.ticker]?.changePct || 0));
  else if (sortMode === 'chg_asc') list.sort((a, b) => (stockQuotes[a.ticker]?.changePct || 0) - (stockQuotes[b.ticker]?.changePct || 0));
  else if (sortMode === 'alpha') list.sort((a, b) => a.ticker.localeCompare(b.ticker));
  else if (sortMode === 'owned') list.sort((a, b) => ((stockPortfolio[b.ticker]?.shares || 0) > 0 ? 1 : 0) - ((stockPortfolio[a.ticker]?.shares || 0) > 0 ? 1 : 0));
  filteredStocks = list;
  if (resetLimit) visibleStockLimit = Math.max(24, (typeof getQualityBatchSize === 'function' ? getQualityBatchSize() : 12) * 2);
  const slice = filteredStocks.slice(0, visibleStockLimit);
  grid.innerHTML = slice.length ? slice.map(c => {
    const q = stockQuotes[c.ticker] || { price: c.price, changePct: 0, history: [], high: c.price, low: c.price };
    const pct = q.changePct || 0;
    const up = pct >= 0;
    const ownedShares = stockPortfolio[c.ticker]?.shares || 0;
    const spark = generateSparklineSVG(q.history || [], up);
    const hi = q.high != null ? q.high : q.price;
    const lo = q.low != null ? q.low : q.price;
    return `<div class="liquid-panel stock-card" onclick="openStockTradeModal('${escapeHTML(c.ticker)}', 'buy', 'stock')">
      <div class="stock-card-top">
        <span class="stock-ticker-badge mono">${escapeHTML(c.ticker)}</span>
        <span class="stock-chg-badge mono ${up ? 'up' : 'down'}">${up ? '+' : ''}${pct.toFixed(2)}%</span>
      </div>
      <div>
        <h4 class="stock-name" title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</h4>
        <div class="stock-meta">${escapeHTML(c.sector)}</div>
      </div>
      <div class="stock-spark-row">
        <div class="stock-spark">${spark}</div>
        <div class="stock-price-block">
          <div class="stock-price mono">${formatMoney(q.price)}</div>
          <div class="stock-range mono">H ${formatMoney(hi)} · L ${formatMoney(lo)}</div>
        </div>
      </div>
      <div class="stock-card-actions">
        <span class="stock-owned-tag">${ownedShares > 0 ? `Owned: ${Number(ownedShares.toFixed(2))}` : ''}</span>
        <div style="display:flex; gap:5px;">
          <button type="button" class="liquid-btn btn-emerald" onclick="event.stopPropagation(); openStockTradeModal('${escapeHTML(c.ticker)}', 'buy', 'stock')">Buy</button>
          ${ownedShares > 0 ? `<button type="button" class="liquid-btn btn-ghost" style="color:#fca5a5;" onclick="event.stopPropagation(); openStockTradeModal('${escapeHTML(c.ticker)}', 'sell', 'stock')">Sell</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') : `<div class="liquid-panel" style="padding:24px; text-align:center; color:var(--muted); grid-column:1/-1;">No matching public companies found.</div>`;
  const badge = document.getElementById('stocksBadgeCount');
  if (badge) badge.innerText = String(REAL_500_COMPANIES.length + REAL_CRYPTOS.length);
  const countLbl = document.getElementById('stockCountLabel');
  if (countLbl) countLbl.innerText = `(${slice.length} of ${filteredStocks.length} shown · ${REAL_500_COMPANIES.length} stocks)`;
  const loadWrap = document.getElementById('loadMoreStocksWrap');
  if (loadWrap) loadWrap.style.display = visibleStockLimit < filteredStocks.length ? 'block' : 'none';
}

function loadMoreStocks() {
  visibleStockLimit += 48;
  applyStockFilters(false);
}

function applyCryptoFilters(resetLimit = true) {
  const grid = document.getElementById('cryptoGridContainer');
  if (!grid) return;
  const qSearch = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const sortMode = document.getElementById('cryptoSortSelect')?.value || 'default';
  let list = REAL_CRYPTOS.filter(c => {
    if (!qSearch) return true;
    return c.symbol.toLowerCase().includes(qSearch) || c.name.toLowerCase().includes(qSearch) || c.category.toLowerCase().includes(qSearch);
  });
  if (sortMode === 'price_desc') list.sort((a, b) => (cryptoQuotes[b.symbol]?.price || b.price) - (cryptoQuotes[a.symbol]?.price || a.price));
  else if (sortMode === 'price_asc') list.sort((a, b) => (cryptoQuotes[a.symbol]?.price || a.price) - (cryptoQuotes[b.symbol]?.price || b.price));
  else if (sortMode === 'chg_desc') list.sort((a, b) => (cryptoQuotes[b.symbol]?.changePct || 0) - (cryptoQuotes[a.symbol]?.changePct || 0));
  else if (sortMode === 'chg_asc') list.sort((a, b) => (cryptoQuotes[a.symbol]?.changePct || 0) - (cryptoQuotes[b.symbol]?.changePct || 0));
  else if (sortMode === 'alpha') list.sort((a, b) => a.symbol.localeCompare(b.symbol));
  else if (sortMode === 'owned') list.sort((a, b) => ((cryptoPortfolio[b.symbol]?.shares || 0) > 0 ? 1 : 0) - ((cryptoPortfolio[a.symbol]?.shares || 0) > 0 ? 1 : 0));
  grid.innerHTML = list.length ? list.map(c => {
    const q = cryptoQuotes[c.symbol] || { price: c.price, changePct: 0, history: [], high: c.price, low: c.price };
    const pct = q.changePct || 0;
    const up = pct >= 0;
    const ownedShares = cryptoPortfolio[c.symbol]?.shares || 0;
    const spark = generateSparklineSVG(q.history || [], up);
    const hi = q.high != null ? q.high : q.price;
    const lo = q.low != null ? q.low : q.price;
    const ownedLabel = ownedShares > 0 ? `Owned: ${ownedShares >= 1 ? Number(ownedShares.toFixed(4)) : Number(ownedShares.toPrecision(4))}` : '';
    return `<div class="liquid-panel stock-card" onclick="openStockTradeModal('${escapeHTML(c.symbol)}', 'buy', 'crypto')">
      <div class="stock-card-top">
        <span class="stock-ticker-badge crypto mono">${escapeHTML(c.symbol)}</span>
        <span class="stock-chg-badge mono ${up ? 'up' : 'down'}">${up ? '+' : ''}${pct.toFixed(2)}%</span>
      </div>
      <div>
        <h4 class="stock-name" title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</h4>
        <div class="stock-meta">${escapeHTML(c.category)}</div>
      </div>
      <div class="stock-spark-row">
        <div class="stock-spark">${spark}</div>
        <div class="stock-price-block">
          <div class="stock-price mono">${formatAssetPrice(q.price)}</div>
          <div class="stock-range mono">H ${formatAssetPrice(hi)} · L ${formatAssetPrice(lo)}</div>
        </div>
      </div>
      <div class="stock-card-actions">
        <span class="stock-owned-tag">${ownedLabel}</span>
        <div style="display:flex; gap:5px;">
          <button type="button" class="liquid-btn btn-emerald" onclick="event.stopPropagation(); openStockTradeModal('${escapeHTML(c.symbol)}', 'buy', 'crypto')">Buy</button>
          ${ownedShares > 0 ? `<button type="button" class="liquid-btn btn-ghost" style="color:#fca5a5;" onclick="event.stopPropagation(); openStockTradeModal('${escapeHTML(c.symbol)}', 'sell', 'crypto')">Sell</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') : `<div class="liquid-panel" style="padding:24px; text-align:center; color:var(--muted); grid-column:1/-1;">No matching cryptocurrencies found.</div>`;
  const countLbl = document.getElementById('cryptoCountLabel');
  if (countLbl) countLbl.innerText = `(${list.length} coins · trade with Crypto Wallet USD)`;
}

let activeTradeTicker = null;
let activeTradeSide = 'buy';
let activeTradeAsset = 'stock';

function openStockTradeModal(ticker, side = 'buy', asset = 'stock') {
  activeTradeAsset = asset === 'crypto' ? 'crypto' : 'stock';
  activeTradeTicker = ticker;
  activeTradeSide = side;
  let name, sectorOrCat, price, pct, history, owned;
  if (activeTradeAsset === 'crypto') {
    const comp = REAL_CRYPTOS.find(c => c.symbol === ticker);
    if (!comp) return;
    const q = cryptoQuotes[ticker] || { price: comp.price, changePct: 0, history: [] };
    name = comp.name; sectorOrCat = comp.category; price = q.price; pct = q.changePct || 0; history = q.history || [];
    owned = cryptoPortfolio[ticker]?.shares || 0;
  } else {
    const comp = REAL_500_COMPANIES.find(c => c.ticker === ticker);
    if (!comp) return;
    const q = stockQuotes[ticker] || { price: comp.price, changePct: 0, history: [] };
    name = comp.name; sectorOrCat = comp.sector; price = q.price; pct = q.changePct || 0; history = q.history || [];
    owned = stockPortfolio[ticker]?.shares || 0;
  }
  const up = pct >= 0;
  const badge = document.getElementById('tradeStockBadge');
  if (badge) {
    badge.innerText = activeTradeAsset === 'crypto' ? 'CRYPTO · USD PAIR' : 'VERIFIED NYSE/NASDAQ';
    badge.style.background = activeTradeAsset === 'crypto' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)';
    badge.style.color = activeTradeAsset === 'crypto' ? '#fbbf24' : '#34d399';
  }
  document.getElementById('tradeStockSector').innerText = sectorOrCat;
  document.getElementById('tradeStockTitle').innerText = `${name} (${ticker})`;
  document.getElementById('tradeStockPrice').innerText = formatAssetPrice(price);
  const chgEl = document.getElementById('tradeStockChange');
  chgEl.innerText = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  chgEl.style.color = pct >= 0 ? '#10b981' : '#ef4444';
  // Live trading chart
  tradeChartTf = tradeChartTf || '1H';
  document.querySelectorAll('.chart-tf').forEach(b => b.classList.toggle('active', b.getAttribute('data-tf') === tradeChartTf));
  renderTradeLiveChart();
  startTradeLiveTicks();
  document.getElementById('tradeAvailableCash').innerText = formatMoney(userBalance);
  document.getElementById('tradeOwnedShares').innerText = String(owned >= 1 ? Number(owned.toFixed(6)) : Number(owned.toPrecision(6)));
  const buyBtn = document.getElementById('tabStockBuy');
  const sellBtn = document.getElementById('tabStockSell');
  buyBtn.classList.toggle('active', side === 'buy');
  sellBtn.classList.toggle('active', side === 'sell');
  const unit = activeTradeAsset === 'crypto' ? 'COINS' : 'SHARES';
  if (side === 'buy') {
    document.getElementById('tradeQtyLabel').innerText = `NUMBER OF ${unit} TO BUY`;
    document.getElementById('tradeEstimateLabel').innerText = 'Estimated Cost (Crypto Wallet)';
    document.getElementById('tradeSubmitBtn').innerText = `Confirm Buy ${ticker}`;
    document.getElementById('tradeSubmitBtn').className = 'liquid-btn btn-emerald';
  } else {
    document.getElementById('tradeQtyLabel').innerText = `NUMBER OF ${unit} TO SELL`;
    document.getElementById('tradeEstimateLabel').innerText = 'Estimated Proceeds → Wallet';
    document.getElementById('tradeSubmitBtn').innerText = `Confirm Sell ${ticker}`;
    document.getElementById('tradeSubmitBtn').className = 'liquid-btn';
  }
  const qtyInput = document.getElementById('tradeSharesInput');
  if (side === 'sell' && owned > 0) qtyInput.value = String(owned >= 1 ? Number(owned.toFixed(6)) : Number(owned.toPrecision(6)));
  else qtyInput.value = activeTradeAsset === 'crypto' && price > 1000 ? '0.01' : '1';
  qtyInput.step = activeTradeAsset === 'crypto' ? 'any' : '0.01';
  qtyInput.min = activeTradeAsset === 'crypto' ? '0.00000001' : '0.01';
  updateTradeEstimate();
  document.getElementById('stockTradeModal').style.display = 'flex';
}

function closeStockTradeModal() {
  activeTradeTicker = null;
  stopTradeLiveTicks();
  document.getElementById('stockTradeModal').style.display = 'none';
}

function setStockTradeSide(side, el) {
  activeTradeSide = side;
  document.getElementById('tabStockBuy').classList.remove('active');
  document.getElementById('tabStockSell').classList.remove('active');
  el.classList.add('active');
  if (activeTradeTicker) openStockTradeModal(activeTradeTicker, side, activeTradeAsset);
}

function setQuickShares(n) {
  document.getElementById('tradeSharesInput').value = String(n);
  updateTradeEstimate();
}

function setQuickMaxShares() {
  if (!activeTradeTicker) return;
  let price = 1;
  if (activeTradeAsset === 'crypto') {
    const comp = REAL_CRYPTOS.find(c => c.symbol === activeTradeTicker);
    price = cryptoQuotes[activeTradeTicker]?.price || comp?.price || 1;
  } else {
    const comp = REAL_500_COMPANIES.find(c => c.ticker === activeTradeTicker);
    price = stockQuotes[activeTradeTicker]?.price || comp?.price || 1;
  }
  if (activeTradeSide === 'buy') {
    const maxBuy = Math.floor((userBalance / price) * 1e8) / 1e8;
    document.getElementById('tradeSharesInput').value = String(Math.max(0.00000001, maxBuy));
  } else {
    const portfolio = activeTradeAsset === 'crypto' ? cryptoPortfolio : stockPortfolio;
    const owned = portfolio[activeTradeTicker]?.shares || 0;
    document.getElementById('tradeSharesInput').value = String(owned >= 1 ? Number(owned.toFixed(6)) : Number(owned.toPrecision(6)));
  }
  updateTradeEstimate();
}

function updateTradeEstimate() {
  if (!activeTradeTicker) return;
  let price = 0;
  if (activeTradeAsset === 'crypto') {
    const comp = REAL_CRYPTOS.find(c => c.symbol === activeTradeTicker);
    price = cryptoQuotes[activeTradeTicker]?.price || comp?.price || 0;
  } else {
    const comp = REAL_500_COMPANIES.find(c => c.ticker === activeTradeTicker);
    price = stockQuotes[activeTradeTicker]?.price || comp?.price || 0;
  }
  const shares = parseFloat(document.getElementById('tradeSharesInput').value) || 0;
  document.getElementById('tradeEstimateTotal').innerText = formatMoney(Math.max(0, shares * price));
}

function logStockTrade(side, ticker, shares, price, total, asset) {
  stockTradeLog.unshift({ side, ticker, shares, price, total, asset: asset || 'stock', time: new Date().toLocaleString() });
  if (stockTradeLog.length > 80) stockTradeLog.length = 80;
}

function executeStockTrade(e) {
  e.preventDefault();
  if (!activeTradeTicker) return;
  const isCrypto = activeTradeAsset === 'crypto';
  let price, name;
  if (isCrypto) {
    const comp = REAL_CRYPTOS.find(c => c.symbol === activeTradeTicker);
    if (!comp) return;
    price = (cryptoQuotes[activeTradeTicker] || { price: comp.price }).price;
    name = comp.name;
  } else {
    const comp = REAL_500_COMPANIES.find(c => c.ticker === activeTradeTicker);
    if (!comp) return;
    price = (stockQuotes[activeTradeTicker] || { price: comp.price }).price;
    name = comp.name;
  }
  const shares = parseFloat(document.getElementById('tradeSharesInput').value);
  if (isNaN(shares) || shares <= 0) { showToast('Enter a valid quantity greater than 0', '!'); return; }
  const totalValue = Number((shares * price).toFixed(2));
  const portfolio = isCrypto ? cryptoPortfolio : stockPortfolio;
  const unit = activeTradeTicker;
  if (activeTradeSide === 'buy') {
    if (totalValue > userBalance + 0.0001) { showToast(`Insufficient Crypto Wallet balance (${formatMoney(userBalance)} available)`, '!'); return; }
    userBalance = Math.max(0, Number((userBalance - totalValue).toFixed(2)));
    const prev = portfolio[activeTradeTicker] || { shares: 0, avgCost: price };
    const nextShares = Number((prev.shares + shares).toFixed(10));
    const nextAvg = nextShares > 0 ? Number((((prev.shares * prev.avgCost) + totalValue) / nextShares).toFixed(8)) : price;
    portfolio[activeTradeTicker] = { shares: nextShares, avgCost: nextAvg };
    logStockTrade('buy', activeTradeTicker, shares, price, totalValue, isCrypto ? 'crypto' : 'stock');
    updateWalletDisplay(); saveStockPortfolio(); renderStockPortfolioSummary();
    if (isCrypto) applyCryptoFilters(false); else applyStockFilters(false);
    closeStockTradeModal();
    showToast(`Bought ${shares} ${unit} for ${formatMoney(totalValue)}`, isCrypto ? '🪙' : '📈');
  } else {
    const prev = portfolio[activeTradeTicker];
    if (!prev || prev.shares < shares - 1e-12) { showToast(`You only own ${Number((prev?.shares || 0))} of ${unit}`, '!'); return; }
    const sellShares = Math.min(prev.shares, shares);
    const proceeds = Number((sellShares * price).toFixed(2));
    userBalance = Number((userBalance + proceeds).toFixed(2));
    const remShares = Number((prev.shares - sellShares).toFixed(10));
    if (remShares <= 1e-12) delete portfolio[activeTradeTicker];
    else portfolio[activeTradeTicker] = { shares: remShares, avgCost: prev.avgCost };
    logStockTrade('sell', activeTradeTicker, sellShares, price, proceeds, isCrypto ? 'crypto' : 'stock');
    updateWalletDisplay(); saveStockPortfolio(); renderStockPortfolioSummary();
    if (isCrypto) applyCryptoFilters(false); else applyStockFilters(false);
    closeStockTradeModal();
    const costBasis = Number((prev.avgCost * sellShares).toFixed(2));
    const realized = Number((proceeds - costBasis).toFixed(2));
    const gainTxt = realized >= 0 ? `+${formatMoney(realized)} profit` : `${formatMoney(realized)} loss`;
    showToast(`Sold ${sellShares} ${unit} → ${formatMoney(proceeds)} (${gainTxt})`, realized >= 0 ? '📈' : '📉');
  }
}

renderStockPortfolioSummary();
applyStockFilters(true);
applyCryptoFilters(true);
renderMarketPulse();
syncWalletAddressUI();
toggleStockLiveFeed();



/* ===== New-user onboarding ===== */
const ONBOARD_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Sp1k3y’s Vault',
    text: 'This is your simulated Crypto Wallet and markets hub. Site balance only — no real money or crypto leaves the browser.'
  },
  {
    icon: '💰',
    title: 'Your Crypto Wallet',
    text: 'Check your balance in the sidebar. Use Deposit to add simulated funds, then trade stocks & coins. Your wallet address is fake (Phantom-style UI only).'
  },
  {
    icon: '📈',
    title: 'Markets & profits',
    text: 'Open Markets to browse stocks and crypto. Prices move live. Buy low, sell high — when you sell above your average cost, the profit is added to your wallet automatically.'
  },
  {
    icon: '🚀',
    title: 'You’re ready',
    text: 'Create an account to save your balance, or explore as a guest. Tap any stock or coin card for live charts and trade controls.'
  }
];
let onboardStep = 0;

function shouldShowOnboarding() {
  return safeGetStorage('spikey_onboarded', '') !== '1';
}

function openOnboarding() {
  onboardStep = 0;
  const modal = document.getElementById('onboardingModal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const step = ONBOARD_STEPS[onboardStep] || ONBOARD_STEPS[0];
  const host = document.getElementById('onboardStepContent');
  if (!host) return;
  host.innerHTML = `
    <div class="onboard-icon">${step.icon}</div>
    <h3 class="onboard-title">${step.title}</h3>
    <p class="onboard-text">${step.text}</p>
  `;
  document.querySelectorAll('.onboard-dot').forEach((d, i) => {
    d.classList.toggle('active', i === onboardStep);
  });
  const nextBtn = document.getElementById('onboardNextBtn');
  if (nextBtn) nextBtn.innerText = onboardStep >= ONBOARD_STEPS.length - 1 ? 'Get started' : 'Next';
}

function nextOnboardingStep() {
  if (onboardStep >= ONBOARD_STEPS.length - 1) {
    finishOnboarding(false);
    return;
  }
  onboardStep += 1;
  renderOnboardingStep();
}

function finishOnboarding(skipped) {
  safeSetStorage('spikey_onboarded', '1');
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.style.display = 'none';
  if (!skipped) showToast('You’re set — explore Markets or your Crypto Wallet', '✨');
}

// Show onboarding once DOM is ready

