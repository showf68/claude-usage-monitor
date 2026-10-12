// AI Usage Monitor (Claude Code + Codex) - Popup Script v5.0
// Multi-language support with browser detection
// Cookie and Token auth modes

const circumference = 2 * Math.PI * 42; // radius = 42
let lastError = null;
let parsedTokens = null;
let currentLang = 'en';
let translations = {};
let currentAuthMode = 'cookie'; // 'cookie' or 'token'
let codexParsed = null;

// Available languages with display names
const languages = {
  en: { flag: 'EN', name: 'English' },
  fr: { flag: 'FR', name: 'Francais' },
  es: { flag: 'ES', name: 'Espanol' },
  zh: { flag: 'ZH', name: '中文' },
  he: { flag: 'HE', name: 'עברית' }
};

// Load translations from _locales folder
async function loadTranslations(lang) {
  try {
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Not found');
    const messages = await response.json();

    // Convert Chrome i18n format to simple key-value
    translations = {};
    for (const [key, value] of Object.entries(messages)) {
      translations[key] = value.message;
    }
    return true;
  } catch (e) {
    console.warn(`Failed to load ${lang} translations:`, e);
    return false;
  }
}

// Apply translations to the page
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (translations[key]) {
      elem.textContent = translations[key];
    }
  });

  // Update language button
  const langFlag = document.getElementById('currentLangFlag');
  if (langFlag && languages[currentLang]) {
    langFlag.textContent = languages[currentLang].flag;
  }

  // Update active state in dropdown
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.lang === currentLang);
  });

  // Set RTL for Hebrew
  document.body.dir = currentLang === 'he' ? 'rtl' : 'ltr';
}

// Get translation
function t(key) {
  return translations[key] || key;
}

// Change language
async function changeLanguage(lang) {
  if (!languages[lang]) return;

  const loaded = await loadTranslations(lang);
  if (loaded) {
    currentLang = lang;
    await chrome.storage.local.set({ language: lang });
    applyTranslations();
  }
}

// Detect browser language
function detectBrowserLanguage() {
  const browserLang = navigator.language.split('-')[0];
  return languages[browserLang] ? browserLang : 'en';
}

// Initialize language
async function initLanguage() {
  const stored = await chrome.storage.local.get(['language']);
  const lang = stored.language || detectBrowserLanguage();

  const loaded = await loadTranslations(lang);
  if (loaded) {
    currentLang = lang;
  } else {
    // Fallback to English
    await loadTranslations('en');
    currentLang = 'en';
  }
  applyTranslations();
}

function getColorClass(used) {
  if (used < 50) return 'low';
  if (used < 80) return 'medium';
  return 'high';
}

function updateCircularProgress(circleId, percentId, used) {
  const circle = document.getElementById(circleId);
  const percentElem = document.getElementById(percentId);
  if (!circle || !percentElem) return;

  circle.style.strokeDashoffset = circumference - (Math.min(100, used) / 100) * circumference;
  const colorClass = getColorClass(used);
  circle.setAttribute('class', `circle-progress ${colorClass}`);
  percentElem.className = `circle-percent ${colorClass}`;
  percentElem.textContent = `${Math.round(used)}%`;
}

function formatTimeRemaining(resetAt) {
  if (!resetAt) return '--';
  const now = new Date();
  const reset = new Date(resetAt);
  const diff = reset - now;

  if (diff < 0) return 'Now!';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function formatTimeAgo(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  const rtf = new Intl.RelativeTimeFormat(currentLang, { numeric: 'auto' });
  if (minutes >= 60) return rtf.format(-Math.round(minutes / 60), 'hour');
  return rtf.format(-minutes, 'minute');
}

// View management
function showView(viewName) {
  ['setupView', 'usageView', 'errorView'].forEach(v => {
    const elem = document.getElementById(v);
    if (elem) elem.style.display = v === viewName ? 'block' : 'none';
  });
}

function showError(errorMsg, needsLogin = false) {
  lastError = errorMsg;
  const errorElem = document.getElementById('errorMessage');
  const loginBtn = document.getElementById('loginBtn');

  if (errorElem) {
    // Translate NOT_LOGGED_IN error
    if (errorMsg === 'NOT_LOGGED_IN') {
      errorElem.setAttribute('data-i18n', 'notLoggedIn');
      errorElem.textContent = chrome.i18n.getMessage('notLoggedIn') || 'Claude.ai not logged in. Please log in to Claude.ai and retry.';
    } else {
      errorElem.removeAttribute('data-i18n');
      errorElem.textContent = errorMsg || 'Unknown error';
    }
  }

  // Show/hide login button
  if (loginBtn) {
    loginBtn.style.display = (errorMsg === 'NOT_LOGGED_IN' || needsLogin) ? 'block' : 'none';
  }

  showView('errorView');
}

function updateUI(data) {
  if (!data) {
    showError('No data received from API');
    return;
  }

  if (data.error) {
    showError(data.error, data.needsLogin);
    return;
  }

  if (!data.five_hour) {
    showError('Invalid API response: missing five_hour data');
    return;
  }

  showView('usageView');

  // 5-hour window
  const used5h = data.five_hour.utilization || 0;
  const reset5h = data.five_hour.resets_at || data.five_hour.reset_at;
  updateCircularProgress('circle5h', 'percent5h', used5h);
  document.getElementById('reset5h').textContent = formatTimeRemaining(reset5h);

  // 7-day window
  const used7d = data.seven_day?.utilization || 0;
  const reset7d = data.seven_day?.resets_at || data.seven_day?.reset_at;
  updateCircularProgress('circle7d', 'percent7d', used7d);
  document.getElementById('reset7d').textContent = formatTimeRemaining(reset7d);

  // Extras : fenetres par modele, usage supplementaire
  const extras = [];
  if (data.seven_day_sonnet) extras.push(extraRow('Sonnet 7d', data.seven_day_sonnet.utilization, data.seven_day_sonnet.resets_at));
  if (data.seven_day_opus) extras.push(extraRow('Opus 7d', data.seven_day_opus.utilization, data.seven_day_opus.resets_at));
  if (data.extra_usage?.is_enabled && data.extra_usage.utilization != null) {
    extras.push(extraRow('Extra usage', data.extra_usage.utilization, null));
  }
  const extrasElem = document.getElementById('claudeExtras');
  extrasElem.innerHTML = extras.join('');
  extrasElem.style.display = extras.length ? 'block' : 'none';

  const planElem = document.getElementById('plan');
  if (data.plan && planElem) {
    planElem.textContent = data.plan;
    planElem.style.display = 'inline-block';
  }

}

function extraRow(label, used, resetAt) {
  const u = Math.max(0, Math.min(100, used || 0));
  const reset = resetAt ? ` <span style="color:#64748b">${formatTimeRemaining(resetAt)}</span>` : '';
  return `<div class="extra-row"><span>${label}</span><span class="bar"><i class="${getColorClass(u)}" style="width:${u}%"></i></span><span>${Math.round(u)}%${reset}</span></div>`;
}

// ==================== CODEX ====================

function windowLabel(w) {
  const h = Math.round((w.window_ms || 0) / 3600000);
  if (h === 5) return t('hours5');
  if (h === 168) return t('days7');
  if (!h) return 'Window';
  if (h % 24 === 0) return `${h / 24} ${h === 24 ? 'Day' : 'Days'}`;
  return `${h} Hours`;
}

function ringHtml(id, label) {
  return `<div class="gauge-head"><i class="pdot codex"></i>Codex</div>
    <div class="circle-wrapper">
      <svg class="circle-svg" viewBox="0 0 100 100">
        <circle class="circle-bg" cx="50" cy="50" r="42"/>
        <circle class="circle-progress low" id="${id}C" cx="50" cy="50" r="42" stroke-dasharray="263.89" stroke-dashoffset="263.89"/>
      </svg>
      <div class="circle-text"><div class="circle-percent" id="${id}P">--%</div></div>
    </div>
    <div class="gauge-window">${label}</div>
    <div class="reset-time"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span id="${id}R">--</span></div>`;
}

function renderCodex(data) {
  const slot = document.getElementById('codexSlot');
  const info = document.getElementById('codexInfo');
  const err = document.getElementById('codexError');

  if (!data || data.error) {
    slot.style.display = 'none';
    info.style.display = 'none';
    err.style.display = 'block';
    if (!data) {
      err.innerHTML = 'Codex not connected.<br><button class="btn-primary" id="codexInlineConnect">Connect Codex</button>';
      document.getElementById('codexInlineConnect')?.addEventListener('click', openModal);
    } else {
      const msg = data.error === 'NOT_LOGGED_IN' ? 'Codex: not logged in to chatgpt.com.' : data.error;
      err.innerHTML = `${msg}<br>${data.needsLogin ? '<button class="btn-primary" id="codexInlineLogin">Login to chatgpt.com</button>' : ''}`;
      document.getElementById('codexInlineLogin')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://chatgpt.com' });
        chrome.runtime.sendMessage({ action: 'startLoginCheck', provider: 'codex' });
      });
    }
    return;
  }

  err.style.display = 'none';
  const windows = data.windows || [];
  const main = windows.filter(w => w.key !== 'code_review')
    .sort((a, b) => (b.window_ms || 0) - (a.window_ms || 0))[0]; // fenetre la plus longue
  if (main) {
    slot.innerHTML = ringHtml('cx0', windowLabel(main));
    slot.style.display = 'block';
    updateCircularProgress('cx0C', 'cx0P', main.utilization || 0);
    document.getElementById('cx0R').textContent = formatTimeRemaining(main.resets_at);
  }

  const rows = [];
  windows.filter(w => w !== main).forEach(w => {
    rows.push(extraRow(w.key === 'code_review' ? 'Code review' : 'Codex ' + windowLabel(w), w.utilization, w.resets_at));
  });
  if (data.credits && (data.credits.has_credits || data.credits.unlimited)) {
    rows.push(`<div class="info-row"><span class="info-label">Credits</span><span class="info-value">${data.credits.unlimited ? 'Unlimited' : data.credits.balance}</span></div>`);
  }
  if (data.limit_reached) {
    rows.push('<div class="info-row"><span class="info-label" style="color:#ef4444">Codex limit reached</span></div>');
  }
  if (data.plan) rows.push(`<div class="info-row"><span class="info-label">Codex plan</span><span class="info-value">${data.plan}</span></div>`);
  info.innerHTML = rows.join('');
  info.style.display = rows.length ? 'block' : 'none';
}

// Affiche les deux fournisseurs ; l'erreur d'un seul ne masque pas l'autre
function renderAll(res) {
  const { claude, codex, codexOff } = res;
  if (claude && !claude.error && claude.five_hour) {
    updateUI(claude);
  } else if (claude && claude.error && (codexOff || !codex || codex.error)) {
    showError(claude.error, claude.needsLogin);
    return;
  } else {
    showView('usageView');
    if (claude && claude.error) {
      const extrasElem = document.getElementById('claudeExtras');
      extrasElem.innerHTML = `<div style="color:#fca5a5;font-size:12px;padding:6px 0">Claude: ${claude.error === 'NOT_LOGGED_IN' ? 'not logged in to claude.ai' : claude.error}</div>`;
      extrasElem.style.display = 'block';
    }
  }
  if (codexOff) {
    ['codexSlot', 'codexInfo', 'codexError'].forEach(i => { document.getElementById(i).style.display = 'none'; });
  } else {
    renderCodex(codex);
  }
}

// Parse JSON input and extract tokens
function parseCredentials(jsonText) {
  if (!jsonText || !jsonText.trim()) {
    return { error: t('pleaseEnter') };
  }

  try {
    const data = JSON.parse(jsonText.trim());

    // Try to find tokens in various structures
    let accessToken = null;
    let refreshToken = null;
    let subscriptionType = null;

    // Check claudeAiOauth structure
    if (data.claudeAiOauth) {
      accessToken = data.claudeAiOauth.accessToken;
      refreshToken = data.claudeAiOauth.refreshToken;
      subscriptionType = data.claudeAiOauth.subscriptionType;
    }

    // Check direct properties
    if (!accessToken && data.accessToken) accessToken = data.accessToken;
    if (!refreshToken && data.refreshToken) refreshToken = data.refreshToken;

    // Check oauth structure
    if (data.oauth) {
      if (!accessToken && data.oauth.accessToken) accessToken = data.oauth.accessToken;
      if (!refreshToken && data.oauth.refreshToken) refreshToken = data.oauth.refreshToken;
    }

    // Validate we found at least one token
    if (!accessToken && !refreshToken) {
      return { error: t('noTokens') };
    }

    // Validate token formats
    if (accessToken && !accessToken.startsWith('sk-ant-oat')) {
      return { error: t('invalidAccessToken') };
    }
    if (refreshToken && !refreshToken.startsWith('sk-ant-ort')) {
      return { error: t('invalidRefreshToken') };
    }

    return {
      accessToken,
      refreshToken,
      subscriptionType,
      success: true
    };
  } catch (e) {
    return { error: t('invalidJson') + ': ' + e.message };
  }
}

// Show parse result
function showParseResult(resultElemId, parseResult) {
  const resultElem = document.getElementById(resultElemId);
  if (!resultElem) return;

  if (parseResult.error) {
    resultElem.className = 'parse-result error';
    resultElem.innerHTML = `❌ ${parseResult.error}`;
    parsedTokens = null;
  } else {
    resultElem.className = 'parse-result success';
    let html = `✅ ${t('tokensFound')}<br>`;
    if (parseResult.accessToken) {
      html += `<div class="token-info">${t('accessToken')}: ${parseResult.accessToken.substring(0, 20)}...</div>`;
    }
    if (parseResult.refreshToken) {
      html += `<div class="token-info">${t('refreshToken')}: ${parseResult.refreshToken.substring(0, 20)}...</div>`;
    }
    if (parseResult.subscriptionType) {
      html += `<div class="token-info">${t('plan')}: ${parseResult.subscriptionType}</div>`;
    }
    resultElem.innerHTML = html;
    parsedTokens = parseResult;
  }
}

// Codex : extraire access_token / account_id d'un auth.json colle
function parseCodexCredentials(text) {
  try {
    const d = JSON.parse(text.trim());
    const tk = d.tokens || d;
    const accessToken = tk.access_token || tk.accessToken;
    if (!accessToken) return { error: 'No access_token found in the JSON.' };
    return { accessToken, accountId: tk.account_id || tk.accountId || '', success: true };
  } catch (e) {
    return { error: t('invalidJson') + ': ' + e.message };
  }
}

// Initialize
async function init() {
  // Load language first
  await initLanguage();

  // Load saved auth mode
  await loadAuthMode();

  const result = await chrome.storage.local.get(['refreshToken', 'accessToken', 'token', 'usage', 'lastUpdate', 'lastError', 'authMode', 'codexUsage', 'codexDisabled', 'lastProvider', 'badgeProvider']);
  const badgeSel = document.getElementById('badgeProvider');
  if (badgeSel) badgeSel.value = result.badgeProvider || 'auto';

  // Check if configured (either has tokens or using cookie mode)
  const hasTokens = result.refreshToken || result.accessToken || result.token;
  const usingCookies = result.authMode === 'cookie';

  if (!hasTokens && !usingCookies && !result.codexUsage) {
    showView('setupView');
    return;
  }

  if (result.usage || result.codexUsage) {
    renderAll({ claude: result.usage, codex: result.codexUsage, codexOff: !!result.codexDisabled });
    if (result.lastUpdate) {
      setUpdated(result.lastUpdate);
    }
  } else if (result.lastError) {
    showError(result.lastError);
  } else {
    showView('usageView');
  }

  refresh();
}

// Refresh
function refresh() {
  const btn = document.getElementById('refreshBtn');
  btn?.classList.add('spinning');

  chrome.runtime.sendMessage({ action: 'refresh' }, (response) => {
    btn?.classList.remove('spinning');

    if (chrome.runtime.lastError) {
      showError('Extension error: ' + chrome.runtime.lastError.message);
      return;
    }

    if (!response) {
      showError('No response from background script');
      return;
    }

    chrome.storage.local.get(['codexDisabled']).then(({ codexDisabled }) => {
      renderAll({ claude: response.claude, codex: response.codex, codexOff: !!codexDisabled });
      setUpdated(Date.now());
    });
  });
}

// Start auto-refresh in background after opening claude.ai login page
function startLoginCheck() {
  chrome.runtime.sendMessage({ action: 'startLoginCheck', provider: 'claude' }, (response) => {
    if (response && response.success) {
      console.log('Background login check started');
    }
  });
}

// Modal
function checkCodexStatus() {
  const el = document.getElementById('codexStatus');
  if (!el) return;
  chrome.runtime.sendMessage({ action: 'checkCodexSession' }, (r) => {
    if (chrome.runtime.lastError) return;
    el.className = r?.valid ? 'cookie-status success' : 'cookie-status error';
    el.innerHTML = `<span>${r?.valid ? 'Codex session found (' + r.source + ')' : 'No chatgpt.com session'}</span>`;
  });
}

// Onglets horizontaux : jauges (defaut) / reglages et infos
function switchTab(name) {
  const settings = name === 'settings';
  document.getElementById('tabGauges').setAttribute('aria-selected', String(!settings));
  document.getElementById('tabSettings').setAttribute('aria-selected', String(settings));
  document.getElementById('paneGauges').hidden = settings;
  document.getElementById('paneSettings').hidden = !settings;
  if (settings) {
    checkCodexStatus();
    if (currentAuthMode === 'cookie') checkCookieStatus();
  }
}

function openModal() {
  document.getElementById('modalParseResult').innerHTML = '';
  document.getElementById('modalJsonInput').value = '';
  switchTab('settings');
}

function closeModal() {
  switchTab('gauges');
}

function setUpdated(ts) {
  const txt = formatTimeAgo(ts);
  document.getElementById('lastUpdate').textContent = txt;
  const info = document.getElementById('infoUpdate');
  if (info) info.textContent = new Date(ts).toLocaleTimeString();
}

// Non-blocking toast (replaces alert)
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;padding:10px 12px;border-radius:10px;background:#1e293b;border:1px solid rgba(245,158,11,0.5);color:#fde68a;font-size:11px;z-index:99;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// Copy credentials path
function copyCredentialsPath() {
  const path = '%USERPROFILE%\\.claude\\.credentials.json';
  navigator.clipboard.writeText(path).then(() => {
    showToast(`${t('pathCopied')} ${path} - ${t('pasteInExplorer')} ${t('openAndCopy')}`);
  });
}

// Save tokens
function saveTokens(jsonInputId, parseResultId) {
  const input = document.getElementById(jsonInputId);
  const jsonText = input?.value.trim();

  if (!jsonText) {
    showParseResult(parseResultId, { error: t('pleaseEnter') });
    return;
  }

  const parseResult = parseCredentials(jsonText);
  showParseResult(parseResultId, parseResult);

  if (!parseResult.success) {
    return;
  }

  // Clear any previous errors
  chrome.storage.local.remove(['lastError']);

  // Prepare token data
  const tokenData = {};
  if (parseResult.accessToken) {
    tokenData.token = parseResult.accessToken;
    tokenData.accessToken = parseResult.accessToken;
  }
  if (parseResult.refreshToken) {
    tokenData.refreshToken = parseResult.refreshToken;
  }

  chrome.runtime.sendMessage({
    action: 'setTokens',
    ...tokenData
  }, (response) => {
    if (chrome.runtime.lastError) {
      showParseResult(parseResultId, { error: 'Extension error: ' + chrome.runtime.lastError.message });
      return;
    }

    if (response?.success) {
      closeModal();
      if (response.data) {
        updateUI(response.data);
        setUpdated(Date.now());
      } else if (response.error) {
        showError(response.error);
      }
    } else if (response?.error) {
      showParseResult(parseResultId, { error: response.error });
    } else {
      showParseResult(parseResultId, { error: 'Unknown error saving tokens' });
    }
  });
}

// Reconfigure - clear token and show setup
function reconfigure() {
  chrome.storage.local.remove(['refreshToken', 'accessToken', 'token', 'usage', 'lastError'], () => {
    switchAuthTab('token');
    openModal();
  });
}

// Handle input change to parse JSON on the fly
function handleJsonInput(inputId, resultId) {
  const input = document.getElementById(inputId);
  const value = input?.value.trim();

  if (!value) {
    document.getElementById(resultId).innerHTML = '';
    return;
  }

  const parseResult = parseCredentials(value);
  showParseResult(resultId, parseResult);
}

// Language dropdown toggle
function toggleLangDropdown() {
  const dropdown = document.getElementById('langDropdown');
  dropdown.classList.toggle('show');
}

// ==================== AUTH MODE ====================

// Switch auth mode tab
function switchAuthTab(mode) {
  currentAuthMode = mode;

  // Update tab styles
  document.getElementById('tabCookie')?.classList.toggle('active', mode === 'cookie');
  document.getElementById('tabToken')?.classList.toggle('active', mode === 'token');

  // Update content visibility
  document.getElementById('cookieContent')?.classList.toggle('active', mode === 'cookie');
  document.getElementById('tokenContent')?.classList.toggle('active', mode === 'token');

  // Check cookie status if switching to cookie mode
  if (mode === 'cookie') {
    checkCookieStatus();
  }
}

// Check cookie session status
function checkCookieStatus() {
  const statusElem = document.getElementById('cookieStatus');
  const connectBtn = document.getElementById('cookieConnect');

  if (!statusElem) return;

  // Show checking state
  statusElem.className = 'cookie-status checking';
  statusElem.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
    <span>${t('checkingCookies') || 'Checking claude.ai session...'}</span>
  `;

  chrome.runtime.sendMessage({ action: 'checkCookies' }, (response) => {
    if (chrome.runtime.lastError) {
      statusElem.className = 'cookie-status error';
      statusElem.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>Extension error</span>
      `;
      if (connectBtn) connectBtn.disabled = true;
      return;
    }

    if (response?.valid) {
      statusElem.className = 'cookie-status success';
      const orgName = response.organizations?.[0]?.name || 'Personal';
      statusElem.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>${t('sessionFound') || 'Session found'}: ${orgName}</span>
      `;
      if (connectBtn) connectBtn.disabled = false;
    } else {
      statusElem.className = 'cookie-status error';
      statusElem.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>${response?.error || t('noSession') || 'No session found'}</span>
      `;
      if (connectBtn) connectBtn.disabled = true;
    }
  });
}

// Connect with cookies
function connectWithCookies() {
  const connectBtn = document.getElementById('cookieConnect');
  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.textContent = t('connecting') || 'Connecting...';
  }

  chrome.runtime.sendMessage({ action: 'connectWithCookies' }, (response) => {
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.textContent = t('connectWithCookie') || 'Connect with Claude.ai Session';
    }

    if (chrome.runtime.lastError) {
      showError('Extension error: ' + chrome.runtime.lastError.message);
      return;
    }

    if (response?.success) {
      closeModal();
      if (response.data) {
        updateUI(response.data);
        setUpdated(Date.now());
      }
    } else {
      showError(response?.error || 'Failed to connect with cookies');
    }
  });
}

// Load saved auth mode
async function loadAuthMode() {
  const result = await chrome.storage.local.get(['authMode']);
  currentAuthMode = result.authMode || 'cookie';
  switchAuthTab(currentAuthMode);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refreshBtn')?.addEventListener('click', refresh);
  document.getElementById('settingsBtn')?.addEventListener('click', openModal);
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('loginBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://claude.ai' });
    startLoginCheck();
  });
  document.getElementById('setupLoginBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://claude.ai' });
    startLoginCheck();
  });
  document.getElementById('setupSettingsBtn')?.addEventListener('click', openModal);
  document.getElementById('modalLoginBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://claude.ai' });
    startLoginCheck();
  });
  document.getElementById('retryBtn')?.addEventListener('click', refresh);
  document.getElementById('reconfigureBtn')?.addEventListener('click', reconfigure);

  document.getElementById('modalBackdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });

  document.getElementById('openCredentials')?.addEventListener('click', copyCredentialsPath);
  document.getElementById('openCredentialsModal')?.addEventListener('click', copyCredentialsPath);

  // Save buttons
  document.getElementById('saveBtn')?.addEventListener('click', () => saveTokens('jsonInput', 'parseResult'));
  document.getElementById('modalSave')?.addEventListener('click', () => saveTokens('modalJsonInput', 'modalParseResult'));

  // Live parsing on input
  document.getElementById('jsonInput')?.addEventListener('input', () => handleJsonInput('jsonInput', 'parseResult'));
  document.getElementById('modalJsonInput')?.addEventListener('input', () => handleJsonInput('modalJsonInput', 'modalParseResult'));

  // Auth mode tabs
  document.getElementById('tabCookie')?.addEventListener('click', () => switchAuthTab('cookie'));
  document.getElementById('tabToken')?.addEventListener('click', () => switchAuthTab('token'));

  // Codex settings
  document.getElementById('codexLoginBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chatgpt.com' });
    chrome.runtime.sendMessage({ action: 'startLoginCheck', provider: 'codex' });
  });
  document.getElementById('codexConnect')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'connectCodex' }, (r) => {
      closeModal();
      refresh();
      if (r && !r.success) showToast(r.error || 'Codex connection failed');
    });
  });
  document.getElementById('codexJsonInput')?.addEventListener('input', (e) => {
    const out = document.getElementById('codexParseResult');
    const v = e.target.value.trim();
    if (!v) { out.innerHTML = ''; codexParsed = null; return; }
    const r = parseCodexCredentials(v);
    codexParsed = r.success ? r : null;
    out.className = r.success ? 'parse-result success' : 'parse-result error';
    out.innerHTML = r.success ? `✅ access_token ${r.accessToken.substring(0, 12)}...` : `❌ ${r.error}`;
  });
  document.getElementById('codexSave')?.addEventListener('click', () => {
    if (!codexParsed) return;
    chrome.runtime.sendMessage({ action: 'setCodexTokens', ...codexParsed }, (r) => {
      closeModal();
      refresh();
      if (r && !r.success) showToast(r.error || 'Codex token rejected');
    });
  });
  document.getElementById('tabGauges')?.addEventListener('click', () => switchTab('gauges'));
  document.getElementById('tabSettings')?.addEventListener('click', () => switchTab('settings'));

  document.getElementById('codexDisable')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'disableCodex' }, () => { closeModal(); refresh(); });
  });
  document.getElementById('badgeProvider')?.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({ action: 'setBadgeProvider', provider: e.target.value });
  });

  // Cookie connect button
  document.getElementById('cookieConnect')?.addEventListener('click', connectWithCookies);

  // Language selector
  document.getElementById('langBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLangDropdown();
  });

  // Language options
  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = option.dataset.lang;
      changeLanguage(lang);
      document.getElementById('langDropdown').classList.remove('show');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.getElementById('langDropdown')?.classList.remove('show');
  });

  init();
});
