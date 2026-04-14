// Claude Usage Monitor - Popup Script v3.5
// Multi-language support with browser detection
// Cookie and Token auth modes

const circumference = 2 * Math.PI * 42; // radius = 42 for outer ring
const circumferenceInner = 2 * Math.PI * 34; // radius = 34 for inner ring
let lastError = null;
let parsedTokens = null;
let currentLang = 'en';
let translations = {};
let currentAuthMode = 'cookie'; // 'cookie' or 'token'

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

function calculateTimeElapsedPercent(resetAt, windowDuration) {
  if (!resetAt) return 0;
  
  const now = new Date();
  const reset = new Date(resetAt);
  const timeRemaining = reset - now;
  
  // If reset time has passed or is invalid, return 100%
  if (timeRemaining < 0) return 100;
  
  // Calculate time elapsed as percentage
  const timeElapsed = windowDuration - timeRemaining;
  const timeElapsedPercent = (timeElapsed / windowDuration) * 100;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, timeElapsedPercent));
}

function updateCircularProgress(circleId, percentId, timeCircleId, used, resetAt, windowDurationMs) {
  const circle = document.getElementById(circleId);
  const percentElem = document.getElementById(percentId);
  const timeCircle = document.getElementById(timeCircleId);
  
  if (!circle || !percentElem) return;

  // Update outer ring (usage)
  const offset = circumference - (used / 100) * circumference;
  circle.style.strokeDashoffset = offset;

  const colorClass = getColorClass(used);
  circle.className = `circle-progress ${colorClass}`;
  percentElem.className = `circle-percent ${colorClass}`;
  percentElem.textContent = `${Math.round(used)}%`;

  // Update inner ring (time elapsed)
  if (timeCircle && resetAt && windowDurationMs) {
    const timeElapsedPercent = calculateTimeElapsedPercent(resetAt, windowDurationMs);
    const timeOffset = circumferenceInner - (timeElapsedPercent / 100) * circumferenceInner;
    timeCircle.style.strokeDashoffset = timeOffset;
  }
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
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
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

  // 5-hour window (5 hours = 5 * 60 * 60 * 1000 ms = 18,000,000 ms)
  const FIVE_HOUR_WINDOW_MS = 5 * 60 * 60 * 1000;
  const used5h = data.five_hour.utilization || 0;
  const reset5h = data.five_hour.resets_at || data.five_hour.reset_at;
  updateCircularProgress('circle5h', 'percent5h', 'circleTime5h', used5h, reset5h, FIVE_HOUR_WINDOW_MS);
  document.getElementById('reset5h').textContent = formatTimeRemaining(reset5h);

  // 7-day window (7 days = 7 * 24 * 60 * 60 * 1000 ms = 604,800,000 ms)
  const SEVEN_DAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const used7d = data.seven_day?.utilization || 0;
  const reset7d = data.seven_day?.resets_at || data.seven_day?.reset_at;
  updateCircularProgress('circle7d', 'percent7d', 'circleTime7d', used7d, reset7d, SEVEN_DAY_WINDOW_MS);
  document.getElementById('reset7d').textContent = formatTimeRemaining(reset7d);

  // Plan
  const planElem = document.getElementById('plan');
  if (data.plan && planElem) {
    planElem.textContent = data.plan;
    planElem.style.display = 'block';
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

// Initialize
async function init() {
  // Load language first
  await initLanguage();

  // Load saved auth mode
  await loadAuthMode();

  const result = await chrome.storage.local.get(['refreshToken', 'accessToken', 'token', 'usage', 'lastUpdate', 'lastError', 'authMode']);

  // Check if configured (either has tokens or using cookie mode)
  const hasTokens = result.refreshToken || result.accessToken || result.token;
  const usingCookies = result.authMode === 'cookie';

  if (!hasTokens && !usingCookies) {
    showView('setupView');
    return;
  }

  if (result.lastError) {
    showError(result.lastError);
    return;
  }

  if (result.usage) {
    updateUI(result.usage);
    if (result.lastUpdate) {
      document.getElementById('lastUpdate').textContent = formatTimeAgo(result.lastUpdate);
    }
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

    if (response.error) {
      showError(response.error, response.needsLogin);
      return;
    }

    if (response.five_hour) {
      updateUI(response);
      document.getElementById('lastUpdate').textContent = formatTimeAgo(Date.now());
    } else {
      showError('Invalid response format');
    }
  });
}

// Start auto-refresh in background after opening claude.ai login page
function startLoginCheck() {
  chrome.runtime.sendMessage({ action: 'startLoginCheck' }, (response) => {
    if (response && response.success) {
      console.log('Background login check started');
    }
  });
}

// Modal
function openModal() {
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById('modalParseResult').innerHTML = '';
  document.getElementById('modalJsonInput').value = '';
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('show');
}

// Copy credentials path
function copyCredentialsPath() {
  const path = '%USERPROFILE%\\.claude\\.credentials.json';
  navigator.clipboard.writeText(path).then(() => {
    alert(`${t('pathCopied')}\n\n${path}\n\n${t('pasteInExplorer')}\n${t('openAndCopy')}`);
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
        document.getElementById('lastUpdate').textContent = formatTimeAgo(Date.now());
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
    document.getElementById('jsonInput').value = '';
    document.getElementById('parseResult').innerHTML = '';
    showView('setupView');
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
        document.getElementById('lastUpdate').textContent = formatTimeAgo(Date.now());
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
