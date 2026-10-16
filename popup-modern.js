// AI Usage Monitor (Claude Code + Codex, + Gemini et Grok en option) - Popup Script v6.0 (une ligne)
// Multi-language support with browser detection
// Cookie and Token auth modes

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
  return translations[key] || '';
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

// ==================== AFFICHAGE : UNE LIGNE DE JAUGES ====================

const RING_R = 18;
const RING_C = 2 * Math.PI * RING_R;
const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const PROVIDERS = {
  claude: { name: 'Claude Code', href: 'https://claude.ai/new#settings/usage' },
  codex: { name: 'Codex', href: 'https://chatgpt.com/settings/usage?tab=overview' },
  gemini: { name: 'Gemini', href: 'https://gemini.google.com/usage', login: 'https://gemini.google.com/app', origin: 'https://gemini.google.com' },
  grok: { name: 'Grok', href: 'https://grok.com/', login: 'https://grok.com/sign-in', origin: 'https://grok.com' }
};
const EXTRA_IDS = ['gemini', 'grok'];

function getColorClass(used) {
  if (used < 50) return 'low';
  if (used < 80) return 'medium';
  return 'high';
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

// Les trois vues se partagent la meme ligne : jauges, configuration, erreur
function showView(viewName) {
  ['setupView', 'usageView', 'errorView'].forEach(v => {
    const elem = document.getElementById(v);
    if (elem) elem.style.display = v === viewName ? 'flex' : 'none';
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
    errorElem.title = errorElem.textContent; // message complet au survol (la ligne le tronque)
  }

  // Show/hide login button
  if (loginBtn) {
    loginBtn.style.display = (errorMsg === 'NOT_LOGGED_IN' || needsLogin) ? 'inline-flex' : 'none';
  }

  showView('errorView');
}

// Fenetre -> etiquette courte (5h, 7d)
function shortWindow(ms) {
  const h = Math.round((ms || 0) / 3600000);
  if (!h) return '·';
  return h <= 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

function windowLabel(w) {
  const h = Math.round((w.window_ms || 0) / 3600000);
  if (h === 5) return t('hours5') || '5 hours';
  if (h === 168) return t('days7') || '7 days';
  if (!h) return 'Window';
  if (h % 24 === 0) return `${h / 24} ${h === 24 ? 'Day' : 'Days'}`;
  return `${h} Hours`;
}

function tip(head, win, used, resetAt) {
  return `${head}\n${win} · ${Math.round(used)}%` + (resetAt ? `\n↻ ${formatTimeRemaining(resetAt)}` : '');
}

// Une cellule = anneau (pourcentage au centre) + libelle + temps avant remise a zero
function cellEl(c) {
  const el = document.createElement(c.warn ? 'button' : 'div');
  el.className = `cell ${c.provider}${c.sub ? ' sub' : ''}${c.warn ? ' warn' : ''}${c.first ? ' first' : ''}`;
  el.title = c.tip;
  el.setAttribute('aria-label', c.tip.replace(/\n/g, ', '));
  if (!c.warn) { el.setAttribute('role', 'link'); el.tabIndex = 0; }

  const pctText = c.warn ? '!' : `${Math.round(c.used)}%`;
  const colorClass = c.warn ? '' : getColorClass(c.used);
  el.innerHTML =
    `<span class="ring"><svg class="ring-svg" viewBox="0 0 44 44" aria-hidden="true">` +
    `<circle class="trk" cx="22" cy="22" r="${RING_R}"/>` +
    `<circle class="arc ${colorClass}" cx="22" cy="22" r="${RING_R}" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/>` +
    `</svg><span class="pct${pctText.length > 3 ? ' tight' : ''}"></span></span>` +
    `<span class="txt"><b class="lbl">${c.first ? `<i class="pdot ${c.provider}"></i>` : ''}<span class="l"></span></b><span class="rst"></span></span>`;
  el.querySelector('.pct').textContent = pctText;
  el.querySelector('.l').textContent = c.label;
  const rst = el.querySelector('.rst');
  if (c.resetAt && !c.sub) {
    rst.insertAdjacentHTML('beforeend', CLOCK);
    rst.appendChild(document.createTextNode(formatTimeRemaining(c.resetAt)));
  } else if (c.note) {
    rst.textContent = c.note;
  } else {
    rst.style.display = 'none';
  }

  const go = c.onClick || (() => chrome.tabs.create({ url: c.href }));
  el.addEventListener('click', go);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });

  if (!c.warn) {
    const arc = el.querySelector('.arc');
    const target = RING_C * (1 - Math.min(100, Math.max(0, c.used)) / 100);
    requestAnimationFrame(() => requestAnimationFrame(() => { arc.style.strokeDashoffset = target; }));
  }
  return el;
}

// Beaucoup d'outils : on serre la ligne par paliers (temps des cellules secondaires, anneaux plus petits, repere) jusqu'a ce qu'elle tienne
function fit(host) {
  const line = host.closest('.line');
  for (const level of ['', 'tight', 'tiny', 'micro']) {
    host.classList.toggle('tight', level !== '');
    host.classList.toggle('tiny', level === 'tiny' || level === 'micro');
    line?.classList.toggle('micro', level === 'micro');   // dernier recours : le repere et le point d'etat s'effacent
    const room = host.parentElement.clientWidth;           // a relire a chaque palier : masquer le repere agrandit la place
    if (host.scrollWidth <= room + 1) return;
  }
}

function paint(cells) {
  const host = document.getElementById('usageView');
  host.replaceChildren();
  // Beaucoup de jauges (Opus, extra, plusieurs fenetres Codex) : les secondaires ne gardent que l'anneau, le detail reste au survol
  host.classList.toggle('dense', cells.length > 5);
  let prev = null;
  cells.forEach(c => {
    if (prev && prev !== c.provider) {
      const sep = document.createElement('i');
      sep.className = 'vsep';
      host.appendChild(sep);
    }
    c.first = prev !== c.provider; // la pastille de couleur ne marque que le debut de chaque groupe
    host.appendChild(cellEl(c));
    prev = c.provider;
  });
  showView('usageView');
  fit(host);
  // Les polices se chargent apres le premier calcul : les largeurs changent, on reverifie
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit(host));
}

function claudeCells(d) {
  const P = PROVIDERS.claude;
  const head = P.name + (d.plan ? ' · ' + d.plan : '');
  const row = (key, label, win, sub) => {
    const w = d[key];
    if (!w) return null;
    const used = w.utilization || 0;
    const resetAt = w.resets_at || w.reset_at || null;
    return { provider: 'claude', href: P.href, label, used, resetAt, sub, tip: tip(head, win, used, resetAt) };
  };
  const cells = [
    row('five_hour', '5h', t('hours5') || '5 hours', false),
    row('seven_day', '7d', t('days7') || '7 days', false),
    row('seven_day_sonnet', 'Sonnet 7d', 'Sonnet 7d', true),
    row('seven_day_opus', 'Opus 7d', 'Opus 7d', true)
  ];
  if (d.extra_usage?.is_enabled && d.extra_usage.utilization != null) {
    const u = d.extra_usage.utilization;
    cells.push({ provider: 'claude', href: P.href, label: 'Extra', used: u, resetAt: null, sub: true, tip: tip(head, 'Extra usage', u, null) });
  }
  return cells.filter(Boolean);
}

function codexCells(d) {
  const P = PROVIDERS.codex;
  const head = P.name + (d.plan ? ' · ' + d.plan : '') + (d.limit_reached ? ' · limit reached' : '');
  const byLength = (a, b) => (b.window_ms || 0) - (a.window_ms || 0);
  const ws = d.windows || [];
  const main = ws.filter(w => w.key !== 'code_review').sort(byLength)[0]; // fenetre la plus longue
  const ordered = [main, ...ws.filter(w => w !== main && w.key !== 'code_review').sort(byLength), ...ws.filter(w => w.key === 'code_review')].filter(Boolean);
  return ordered.map(w => {
    const review = w.key === 'code_review';
    let tp = tip(head, review ? 'Code review' : windowLabel(w), w.utilization || 0, w.resets_at);
    if (w === main && d.credits && (d.credits.has_credits || d.credits.unlimited)) {
      tp += `\n${t('credits') || 'Credits'}: ${d.credits.unlimited ? 'Unlimited' : d.credits.balance}`;
    }
    return {
      provider: 'codex', href: P.href, label: review ? 'Review' : shortWindow(w.window_ms),
      used: w.utilization || 0, resetAt: w.resets_at, sub: w !== main, tip: tp
    };
  });
}

// Gemini : « utilisation actuelle » (fenetre sans duree annoncee) puis hebdomadaire
function geminiCells(d) {
  const P = PROVIDERS.gemini;
  const head = P.name + (d.plan ? ' · ' + d.plan : '');
  return (d.windows || []).map((w, i) => {
    const current = w.key === 'gemini_current';
    return {
      provider: 'gemini', href: P.href, label: current ? (t('geminiNow') || 'Now') : '7d',
      used: w.utilization || 0, resetAt: w.resets_at, sub: i > 0,
      tip: tip(head, current ? (t('geminiCurrent') || 'Current usage') : (t('days7') || '7 days'), w.utilization || 0, w.resets_at)
    };
  });
}

// Grok : requetes sur la fenetre renvoyee par le service (+ modes d'effort si presents)
function grokCells(d) {
  const P = PROVIDERS.grok;
  const ws = d.windows || [];
  const main = ws.find(w => w.key === 'grok_queries') || ws[0];
  const ordered = [main, ...ws.filter(w => w !== main)].filter(Boolean);
  return ordered.map(w => {
    const label = w.key === 'grok_high' ? 'High' : w.key === 'grok_low' ? 'Low' : shortWindow(w.window_ms);
    const win = w.key === 'grok_high' ? 'High effort' : w.key === 'grok_low' ? 'Low effort' : windowLabel(w);
    return { provider: 'grok', href: P.href, label, used: w.utilization || 0, resetAt: w.resets_at, sub: w !== main, tip: tip(P.name, win, w.utilization || 0, w.resets_at) };
  });
}

function warnCell(provider, msg, onClick, shortNote) {
  const P = PROVIDERS[provider];
  const note = shortNote || (msg === 'NOT_LOGGED_IN' ? (t('notConnected') || 'Not connected') : (msg.length > 26 ? msg.slice(0, 25) + '…' : msg));
  return { provider, warn: true, label: P.name, note, tip: `${P.name}\n${msg === 'NOT_LOGGED_IN' ? (t('notConnected') || 'Not connected') : msg}`, onClick };
}

// Etat des connexions (pastilles du volet Reglages)
function setConnState(id, kind, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `conn-state ${kind}`;
  el.textContent = text;
}

function updateExtraConnState(id, data) {
  const nc = t('notConnected') || 'Not connected';
  if (data === undefined) return;              // pas de nouvelle info : on laisse l'etat affiche
  if (data === null) {
    setConnState(`${id}ConnState`, 'off', t('disabled') || 'Disabled');
  } else if (!data.error && data.windows) {
    setConnState(`${id}ConnState`, 'ok', `${t('connected') || 'Connected'}${data.plan ? ' · ' + data.plan : ''}`);
  } else {
    setConnState(`${id}ConnState`, 'bad', data.error === 'NOT_LOGGED_IN' ? nc : (data.error || 'Error'));
  }
}

function updateConnStates(res) {
  const { claude, codex, codexOff } = res;
  updateExtraConnState('gemini', res.gemini);
  updateExtraConnState('grok', res.grok);
  const src = (x) => (x && x._source === 'token' ? (t('manualMode') || 'Token') : (t('autoMode') || 'Cookie'));
  const short = (s) => s.replace(/\s*\(.*\)\s*/, '').trim();
  const nc = t('notConnected') || 'Not connected';
  if (claude && !claude.error && claude.five_hour) {
    setConnState('claudeConnState', 'ok', `${t('connected') || 'Connected'} · ${short(src(claude))}${claude.plan ? ' · ' + claude.plan : ''}`);
  } else {
    setConnState('claudeConnState', 'bad', nc);
    document.getElementById('connClaude').open = true;
  }
  if (codexOff) {
    setConnState('codexConnState', 'off', t('disabled') || 'Disabled');
  } else if (codex && !codex.error && codex.windows) {
    setConnState('codexConnState', 'ok', `${t('connected') || 'Connected'} · ${short(src(codex))}${codex.plan ? ' · ' + codex.plan : ''}`);
  } else {
    setConnState('codexConnState', 'bad', nc);
    document.getElementById('connCodex').open = true;
  }
}

// Affiche les deux fournisseurs sur la meme ligne ; l'erreur d'un seul ne masque pas l'autre
function renderAll(res) {
  const { claude, codex, codexOff } = res;
  updateConnStates(res);
  const claudeOk = !!(claude && !claude.error && claude.five_hour);
  const codexOk = !!(codex && !codex.error && codex.windows && codex.windows.length);
  // Outils optionnels : seulement s'ils sont actives (donnee non nulle)
  const extraData = { gemini: res.gemini, grok: res.grok };
  const extraAny = EXTRA_IDS.some(id => extraData[id] && !extraData[id].error);

  // Rien d'exploitable : un message sur la ligne, avec les boutons de connexion
  if (claude && claude.error && (codexOff || !codex || codex.error) && !extraAny) {
    showError(claude.error, claude.needsLogin);
    return;
  }

  const cells = [];
  if (claudeOk) {
    cells.push(...claudeCells(claude));
  } else if (claude && claude.error) {
    cells.push(warnCell('claude', claude.error, () => {
      if (claude.needsLogin || claude.error === 'NOT_LOGGED_IN') {
        chrome.tabs.create({ url: 'https://claude.ai' });
        startLoginCheck();
      } else {
        openModal();
      }
    }));
  }
  if (!codexOff) {
    if (codexOk) {
      cells.push(...codexCells(codex));
    } else if (!codex) {
      cells.push(warnCell('codex', t('codexNotConnected') || 'Not connected', openModal));
    } else {
      cells.push(warnCell('codex', codex.error || 'Error', () => {
        if (codex.needsLogin) {
          chrome.tabs.create({ url: 'https://chatgpt.com' });
          chrome.runtime.sendMessage({ action: 'startLoginCheck', provider: 'codex' });
        } else {
          openModal();
        }
      }));
    }
  }
  const extraBuilders = { gemini: geminiCells, grok: grokCells };
  for (const id of EXTRA_IDS) {
    const d = extraData[id];
    if (!d) continue;
    if (!d.error && d.windows && d.windows.length) {
      cells.push(...extraBuilders[id](d));
    } else {
      const short = d.needsPermission ? (t('noAccess') || 'No access')
        : (d.needsLogin || d.error === 'NOT_LOGGED_IN') ? (t('notConnected') || 'Not connected') : (t('unavailable') || 'Unavailable');
      cells.push(warnCell(id, d.needsPermission ? (t('permissionDenied') || 'Access not granted') : (d.error || 'Error'), () => {
        if (d.needsLogin || d.error === 'NOT_LOGGED_IN') {
          chrome.tabs.create({ url: PROVIDERS[id].login });
          chrome.runtime.sendMessage({ action: 'startLoginCheck', provider: id });
        } else {
          switchTab('settings');
        }
      }, short));
    }
  }
  paint(cells);
}

// Appelee apres un enregistrement de jeton / une connexion par cookie : on relit Codex puis on redessine toute la ligne
async function updateUI(data) {
  const st = await chrome.storage.local.get(['codexUsage', 'codexDisabled', 'geminiUsage', 'geminiEnabled', 'grokUsage', 'grokEnabled']);
  renderAll({
    claude: data, codex: st.codexUsage, codexOff: !!st.codexDisabled,
    gemini: st.geminiEnabled ? st.geminiUsage : null, grok: st.grokEnabled ? st.grokUsage : null
  });
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

  const result = await chrome.storage.local.get(['refreshToken', 'accessToken', 'token', 'usage', 'lastUpdate', 'lastError', 'authMode', 'codexUsage', 'codexDisabled', 'lastProvider', 'badgeProvider',
    'geminiUsage', 'geminiEnabled', 'grokUsage', 'grokEnabled']);
  setBadgeChoice(result.badgeProvider || 'auto');
  loadAlertPrefs();
  loadExtras(result);

  // Check if configured (either has tokens or using cookie mode)
  const hasTokens = result.refreshToken || result.accessToken || result.token;
  const usingCookies = result.authMode === 'cookie';

  if (!hasTokens && !usingCookies && !result.codexUsage) {
    showView('setupView');
    return;
  }

  if (result.usage || result.codexUsage) {
    renderAll({
      claude: result.usage, codex: result.codexUsage, codexOff: !!result.codexDisabled,
      gemini: result.geminiEnabled ? result.geminiUsage : null, grok: result.grokEnabled ? result.grokUsage : null
    });
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
      renderAll({ claude: response.claude, codex: response.codex, codexOff: !!codexDisabled, gemini: response.gemini, grok: response.grok });
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
    el.innerHTML = `<span>${r?.valid ? (t('codexSessionFound') || 'Codex session found') : (t('codexNoSession') || 'No chatgpt.com session')}</span>`;
  });
}

// Reglages : le bouton de la ligne deplie / replie le volet situe dessous
function switchTab(name) {
  const settings = name === 'settings';
  document.getElementById('tabSettings').setAttribute('aria-pressed', String(settings));
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

// Outils optionnels (Gemini, Grok) : l'acces au site est demande a l'activation et rendu a la desactivation
function loadExtras(stored) {
  for (const id of EXTRA_IDS) {
    const on = !!stored[`${id}Enabled`];
    const box = document.getElementById(`${id}Enabled`);
    if (box) box.checked = on;
    const opt = document.querySelector(`.badge-opt[data-badge="${id}"]`);
    if (opt) opt.hidden = !on;
    if (!on) setConnState(`${id}ConnState`, 'off', t('disabled') || 'Disabled');
  }
}

function toggleExtra(id, box) {
  const origins = [PROVIDERS[id].origin + '/*'];
  if (box.checked) {
    // Doit rester dans le geste de l'utilisateur : la demande d'acces est le premier appel asynchrone
    chrome.permissions.request({ origins }, (granted) => {
      if (!granted) {
        box.checked = false;
        showToast(t('permissionDenied') || 'Access to the site was not granted.');
        return;
      }
      setConnState(`${id}ConnState`, 'checking', '...');
      chrome.runtime.sendMessage({ action: 'enableExtra', provider: id }, (r) => {
        const opt = document.querySelector(`.badge-opt[data-badge="${id}"]`);
        if (opt) opt.hidden = false;
        if (r && r.success) {
          updateExtraConnState(id, r.data);
        } else {
          updateExtraConnState(id, { error: (r && r.needsLogin) ? 'NOT_LOGGED_IN' : ((r && r.error) || 'Error'), needsLogin: !!(r && r.needsLogin) });
          if (r && r.needsLogin) chrome.tabs.create({ url: PROVIDERS[id].login });
        }
        refresh();
      });
    });
  } else {
    chrome.runtime.sendMessage({ action: 'disableExtra', provider: id }, () => {
      chrome.permissions.remove({ origins }, () => {});
      const opt = document.querySelector(`.badge-opt[data-badge="${id}"]`);
      if (opt) { opt.hidden = true; if (opt.classList.contains('active')) setBadgeChoice('auto'); }
      setConnState(`${id}ConnState`, 'off', t('disabled') || 'Disabled');
      refresh();
    });
  }
}

// Alertes : interrupteur + seuils, lus par background.js a chaque verification
const DEFAULT_THRESHOLDS = [70, 80, 90, 95];

async function loadAlertPrefs() {
  const r = await chrome.storage.local.get(['alertsEnabled', 'alertThresholds', 'resetAlerts']);
  const on = r.alertsEnabled !== false;
  const thr = Array.isArray(r.alertThresholds) && r.alertThresholds.length ? r.alertThresholds : DEFAULT_THRESHOLDS;
  document.getElementById('alertsEnabled').checked = on;
  document.getElementById('resetAlerts').checked = r.resetAlerts !== false;
  document.getElementById('thrRow').classList.toggle('off', !on);
  document.querySelector('.opt-row').classList.toggle('off', !on);
  document.querySelectorAll('.thr-chip').forEach(b => b.classList.toggle('active', thr.includes(Number(b.dataset.thr))));
}

function saveAlertPrefs() {
  const on = document.getElementById('alertsEnabled').checked;
  const thr = [...document.querySelectorAll('.thr-chip.active')].map(b => Number(b.dataset.thr));
  document.getElementById('thrRow').classList.toggle('off', !on);
  document.querySelector('.opt-row').classList.toggle('off', !on);
  chrome.storage.local.set({ alertsEnabled: on, alertThresholds: thr.length ? thr : DEFAULT_THRESHOLDS, resetAlerts: document.getElementById('resetAlerts').checked });
}

function setBadgeChoice(v) {
  document.querySelectorAll('.badge-opt').forEach(b => b.classList.toggle('active', b.dataset.badge === v));
}

function setUpdated(ts) {
  const txt = formatTimeAgo(ts);
  const lu = document.getElementById('lastUpdate');
  if (lu) lu.textContent = txt;
  const st = document.getElementById('status');
  if (st) {
    st.title = `${t('lastUpdated') || 'Last updated'} · ${txt}`;
    st.classList.toggle('stale', Date.now() - ts > 5 * 60000);
  }
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
  // Cartes de jauge : ouvrent la page d'usage du fournisseur dans un nouvel onglet
  document.querySelectorAll('[data-href]').forEach(card => {
    const open = () => chrome.tabs.create({ url: card.dataset.href });
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  EXTRA_IDS.forEach(id => document.getElementById(`${id}Enabled`)?.addEventListener('change', (e) => toggleExtra(id, e.target)));
  document.getElementById('alertsEnabled')?.addEventListener('change', saveAlertPrefs);
  document.getElementById('resetAlerts')?.addEventListener('change', saveAlertPrefs);
  document.querySelectorAll('.thr-chip').forEach(b => b.addEventListener('click', () => {
    const active = document.querySelectorAll('.thr-chip.active');
    if (b.classList.contains('active') && active.length === 1) return; // au moins un seuil
    b.classList.toggle('active');
    saveAlertPrefs();
  }));

  document.getElementById('tabSettings')?.addEventListener('click', () => {
    switchTab(document.getElementById('paneSettings').hidden ? 'settings' : 'gauges');
  });

  document.getElementById('codexDisable')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'disableCodex' }, () => { closeModal(); refresh(); });
  });
  document.querySelectorAll('.badge-opt').forEach(btn => btn.addEventListener('click', () => {
    setBadgeChoice(btn.dataset.badge);
    chrome.runtime.sendMessage({ action: 'setBadgeProvider', provider: btn.dataset.badge });
  }));

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
      changeLanguage(lang).then(() => chrome.storage.local.get(['lastUpdate']).then(r => { if (r.lastUpdate) setUpdated(r.lastUpdate); }));
      document.getElementById('langDropdown')?.classList.remove('show');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.getElementById('langDropdown')?.classList.remove('show');
  });

  init();
});
