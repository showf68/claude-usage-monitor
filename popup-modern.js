// Claude Usage Monitor - Popup Script v3.3
// Multi-language support with browser detection

const circumference = 2 * Math.PI * 42; // radius = 42
let lastError = null;
let parsedTokens = null;
let currentLang = 'en';
let translations = {};

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

  const offset = circumference - (used / 100) * circumference;
  circle.style.strokeDashoffset = offset;

  const colorClass = getColorClass(used);
  circle.className = `circle-progress ${colorClass}`;
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

function showError(errorMsg) {
  lastError = errorMsg;
  const errorElem = document.getElementById('errorMessage');
  if (errorElem) {
    errorElem.textContent = errorMsg || 'Unknown error';
  }
  showView('errorView');
}

function updateUI(data) {
  if (!data) {
    showError('No data received from API');
    return;
  }

  if (data.error) {
    showError(data.error);
    return;
  }

  if (!data.five_hour) {
    showError('Invalid API response: missing five_hour data');
    return;
  }

  showView('usageView');

  // 5-hour
  const used5h = data.five_hour.utilization || 0;
  updateCircularProgress('circle5h', 'percent5h', used5h);
  document.getElementById('reset5h').textContent = formatTimeRemaining(data.five_hour.resets_at);

  // 7-day
  const used7d = data.seven_day?.utilization || 0;
  updateCircularProgress('circle7d', 'percent7d', used7d);
  document.getElementById('reset7d').textContent = formatTimeRemaining(data.seven_day?.resets_at);

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

  const result = await chrome.storage.local.get(['refreshToken', 'accessToken', 'token', 'usage', 'lastUpdate', 'lastError']);

  if (!result.refreshToken && !result.accessToken && !result.token) {
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
      showError(response.error);
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refreshBtn')?.addEventListener('click', refresh);
  document.getElementById('settingsBtn')?.addEventListener('click', openModal);
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
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
