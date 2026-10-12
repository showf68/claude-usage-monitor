// AI Usage Monitor (Claude Code + Codex) - Background Service Worker v5.0

const API_URL = 'https://api.anthropic.com/api/oauth/usage';
const CLAUDE_AI_API = 'https://claude.ai/api';
const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const CODEX_SESSION_URL = 'https://chatgpt.com/api/auth/session';

const PROVIDERS = {
  claude: { name: 'Claude Code', cacheKey: 'usage' },
  codex: { name: 'Codex', cacheKey: 'codexUsage' }
};

let loginCheckInterval = null;

// ==================== CLAUDE : REFRESH TOKEN ====================

async function refreshAccessToken() {
  try {
    const result = await chrome.storage.local.get(['refreshToken']);
    const refreshToken = result.refreshToken;

    if (!refreshToken) {
      return { error: 'No refresh token configured. Please add your token in Settings.' };
    }
    if (!refreshToken.startsWith('sk-ant-o')) {
      return { error: 'Invalid token format. Token must start with sk-ant-oat01- (access) or sk-ant-ort01- (refresh)' };
    }

    if (refreshToken.startsWith('sk-ant-oat01-')) {
      await chrome.storage.local.set({ token: refreshToken, accessToken: refreshToken });
      return { token: refreshToken };
    }

    let lastErrorMsg = '';

    try {
      const response = await fetch('https://claude.ai/api/auth/refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          await chrome.storage.local.set({
            token: data.access_token,
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken
          });
          await chrome.storage.local.remove(['lastError']);
          return { token: data.access_token };
        }
      }
      lastErrorMsg = `claude.ai/api/auth/refresh_token: ${response.status}`;
    } catch (e) {
      lastErrorMsg = `claude.ai refresh: ${e.message}`;
    }

    try {
      const response = await fetch(API_URL, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
          'anthropic-beta': 'oauth-2025-04-20'
        }
      });
      if (response.ok) {
        await chrome.storage.local.set({ token: refreshToken, accessToken: refreshToken });
        await chrome.storage.local.remove(['lastError']);
        return { token: refreshToken };
      }
      lastErrorMsg = `Direct API: ${response.status}`;
    } catch (e) {
      lastErrorMsg = `Direct API: ${e.message}`;
    }

    const errorMsg = `Token refresh failed. ${lastErrorMsg}. Try using your ACCESS token instead (starts with sk-ant-oat01-)`;
    await chrome.storage.local.set({ lastError: errorMsg });
    return { error: errorMsg };
  } catch (error) {
    const errorMsg = `Token refresh exception: ${error.message}`;
    await chrome.storage.local.set({ lastError: errorMsg });
    return { error: errorMsg };
  }
}

// ==================== CLAUDE : COOKIE AUTH ====================

async function checkCookieSession() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: '.claude.ai' });
    const sessionCookie = cookies.find(c =>
      c.name === 'sessionKey' || c.name === '__cf_bm' || c.name === 'lastActiveOrg'
    );
    if (!sessionCookie) {
      return { valid: false, error: 'No claude.ai session found. Please log in to claude.ai first.' };
    }
    const response = await fetch(`${CLAUDE_AI_API}/organizations`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const orgs = await response.json();
      if (orgs && orgs.length > 0) return { valid: true, organizations: orgs };
    }
    return { valid: false, error: 'Session expired. Please log in to claude.ai again.' };
  } catch (error) {
    return { valid: false, error: `Cookie check failed: ${error.message}` };
  }
}

async function fetchUsageWithCookies() {
  try {
    const orgsResponse = await fetch(`${CLAUDE_AI_API}/organizations`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });

    if (!orgsResponse.ok) {
      if (orgsResponse.status === 403 || orgsResponse.status === 401) {
        return { error: 'NOT_LOGGED_IN', needsLogin: true };
      }
      return { error: `API error: ${orgsResponse.status}` };
    }

    const orgs = await orgsResponse.json();
    if (!orgs || orgs.length === 0) {
      return { error: 'No organizations found. Please log in to claude.ai.' };
    }

    // Plusieurs organisations possibles : prendre celle qui rend un five_hour
    let lastStatus = null;
    for (const org of orgs) {
      for (const suffix of ['usage', 'rate_limit']) {
        const r = await fetch(`${CLAUDE_AI_API}/organizations/${org.uuid}/${suffix}`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        lastStatus = r.status;
        if (!r.ok) continue;
        const data = await r.json();
        if (data && data.five_hour) {
          data.plan = data.plan || planLabel(org.billing_type || org.subscription_type || org.rate_limit_tier);
          data._source = 'cookie';
          return data;
        }
      }
    }
    return { error: `Cookie mode: no usage data from claude.ai (HTTP ${lastStatus}). Use token mode.` };
  } catch (error) {
    return { error: `Cookie fetch error: ${error.message}` };
  }
}

// ==================== CLAUDE : TOKEN AUTH ====================

async function fetchUsageToken() {
  const result = await chrome.storage.local.get(['token', 'accessToken', 'refreshToken']);
  let token = result.token || result.accessToken;

  if (!token && result.refreshToken) {
    const refreshResult = await refreshAccessToken();
    if (refreshResult.error) return { error: refreshResult.error };
    token = refreshResult.token;
  }
  if (!token) {
    return { error: 'No token available. Please configure your token in Settings.', needsConfig: true };
  }

  try {
    const response = await fetch(API_URL, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 403 || response.status === 401) {
        await chrome.storage.local.remove(['token', 'accessToken']);
        if (result.refreshToken) {
          const refreshResult = await refreshAccessToken();
          if (!refreshResult.error) return fetchUsageToken();
          return { error: `Auth failed (${response.status}): ${refreshResult.error}` };
        }
        const errorMsg = `Token expired (${response.status}). Please update your token in Settings.`;
        await chrome.storage.local.set({ lastError: errorMsg });
        return { error: errorMsg };
      }
      const errorMsg = `API Error ${response.status}: ${errorText.substring(0, 150)}`;
      await chrome.storage.local.set({ lastError: errorMsg });
      return { error: errorMsg };
    }

    const data = await response.json();
    if (!data.five_hour) {
      const errorMsg = 'Invalid API response: missing five_hour data. Response: ' + JSON.stringify(data).substring(0, 100);
      await chrome.storage.local.set({ lastError: errorMsg });
      return { error: errorMsg };
    }
    data._source = 'token';
    return data;
  } catch (error) {
    const errorMsg = `Network error: ${error.message}`;
    await chrome.storage.local.set({ lastError: errorMsg });
    return { error: errorMsg };
  }
}

function planLabel(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.includes('max_20') || s.includes('20x')) return 'Max 20x';
  if (s.includes('max_5') || s.includes('5x')) return 'Max 5x';
  if (s.includes('max')) return 'Max';
  if (s.includes('pro')) return 'Pro';
  return null;
}

// Claude : dispatcher + cache + badge
async function fetchClaude() {
  const { authMode } = await chrome.storage.local.get(['authMode']);
  const data = authMode === 'cookie' ? await fetchUsageWithCookies() : await fetchUsageToken();
  if (data.error) return data;
  await chrome.storage.local.set({ usage: data, lastUpdate: Date.now() });
  await chrome.storage.local.remove(['lastError']);
  return data;
}

// ==================== CODEX ====================

// Normalise la reponse wham/usage en fenetres generiques
function normalizeCodex(raw) {
  const windows = [];
  const rl = raw.rate_limit || {};
  for (const key of ['primary_window', 'secondary_window']) {
    const w = rl[key];
    if (!w) continue;
    const seconds = w.limit_window_seconds || 0;
    windows.push({
      key,
      utilization: w.used_percent ?? 0,
      resets_at: w.reset_at ? new Date(w.reset_at * 1000).toISOString()
        : (w.reset_after_seconds != null ? new Date(Date.now() + w.reset_after_seconds * 1000).toISOString() : null),
      window_ms: seconds * 1000
    });
  }
  const review = raw.code_review_rate_limit?.primary_window;
  if (review) {
    windows.push({
      key: 'code_review',
      utilization: review.used_percent ?? 0,
      resets_at: review.reset_at ? new Date(review.reset_at * 1000).toISOString() : null,
      window_ms: (review.limit_window_seconds || 0) * 1000
    });
  }
  return {
    windows,
    plan: raw.plan_type || null,
    email: raw.email || null,
    limit_reached: !!rl.limit_reached,
    credits: raw.credits ? {
      has_credits: !!raw.credits.has_credits,
      unlimited: !!raw.credits.unlimited,
      balance: raw.credits.balance
    } : null
  };
}

// Jeton ChatGPT : colle (auth.json de Codex) sinon session navigateur
async function getCodexCredentials() {
  const stored = await chrome.storage.local.get(['codexAccessToken', 'codexAccountId', 'codexAuthMode']);
  if (stored.codexAuthMode === 'token' && stored.codexAccessToken) {
    return { token: stored.codexAccessToken, accountId: stored.codexAccountId || '', source: 'token' };
  }
  try {
    const r = await fetch(CODEX_SESSION_URL, { credentials: 'include', headers: { 'Accept': 'application/json' } });
    if (r.ok) {
      const s = await r.json();
      if (s && s.accessToken) {
        return { token: s.accessToken, accountId: s.account?.id || '', source: 'cookie' };
      }
    }
  } catch (e) { /* tombe sur le jeton colle */ }
  if (stored.codexAccessToken) {
    return { token: stored.codexAccessToken, accountId: stored.codexAccountId || '', source: 'token' };
  }
  return null;
}

async function fetchCodex() {
  const creds = await getCodexCredentials();
  if (!creds) return { error: 'NOT_LOGGED_IN', needsLogin: true };
  try {
    const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${creds.token}` };
    if (creds.accountId) headers['ChatGPT-Account-Id'] = creds.accountId;
    const r = await fetch(CODEX_USAGE_URL, { headers, credentials: creds.source === 'cookie' ? 'include' : 'omit' });
    if (r.status === 401 || r.status === 403) {
      if (creds.source === 'token') await chrome.storage.local.remove(['codexAccessToken']);
      return { error: creds.source === 'token' ? 'Codex token expired. Paste auth.json again or log in to chatgpt.com.' : 'NOT_LOGGED_IN', needsLogin: true };
    }
    if (!r.ok) return { error: `Codex API error ${r.status}` };
    const data = normalizeCodex(await r.json());
    if (!data.windows.length) return { error: 'Codex: no rate limit windows in response' };
    data._source = creds.source;
    await chrome.storage.local.set({ codexUsage: data, codexLastUpdate: Date.now(), codexEnabled: true });
    return data;
  } catch (error) {
    return { error: `Codex network error: ${error.message}` };
  }
}

// ==================== BADGE + ALERTES ====================

function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

function colorFor(used) {
  if (used >= 80) return '#dc2626';
  if (used >= 50) return '#ea580c';
  return '#16a34a';
}

// Valeur "principale" par fournisseur : fenetre la plus courte (Claude 5h, Codex fenetre la plus petite)
function mainUsage(provider, data) {
  if (!data || data.error) return null;
  if (provider === 'claude') return Math.round(data.five_hour?.utilization || 0);
  const ws = (data.windows || []).filter(w => w.key !== 'code_review');
  if (!ws.length) return null;
  ws.sort((a, b) => (a.window_ms || 1e12) - (b.window_ms || 1e12));
  return Math.round(ws[0].utilization || 0);
}

async function refreshBadge(results) {
  const { badgeProvider } = await chrome.storage.local.get(['badgeProvider']);
  const mode = badgeProvider || 'auto';
  const values = {
    claude: mainUsage('claude', results.claude),
    codex: mainUsage('codex', results.codex)
  };

  let shown = null;
  if (mode === 'claude' || mode === 'codex') shown = values[mode];
  else shown = Math.max(...Object.values(values).filter(v => v !== null), -1);
  if (shown === -1) shown = null;

  if (shown === null) {
    const errs = [results.claude, results.codex].filter(r => r && r.error);
    if (errs.some(e => e.needsConfig)) updateBadge('CFG', '#eab308');
    else if (errs.length) updateBadge('ERR', '#ef4444');
    else updateBadge('', '#16a34a');
    return;
  }
  updateBadge(shown <= 99 ? `${shown}` : '99', colorFor(shown));
  for (const p of Object.keys(values)) {
    if (values[p] !== null) await checkAlerts(p, values[p]);
  }
}

// Alertes par fournisseur : seuils memorises separement
async function checkAlerts(provider, used) {
  const thresholds = [70, 80, 90, 95];
  const keyAlerted = `alerted_${provider}`;
  const keyTime = `alertTime_${provider}`;
  const result = await chrome.storage.local.get([keyAlerted, keyTime]);
  const alerted = result[keyAlerted] || [];
  const lastTime = result[keyTime] || 0;
  const now = Date.now();

  if (used < 50 && alerted.length > 0) {
    await chrome.storage.local.set({ [keyAlerted]: [], [keyTime]: 0 });
    return;
  }
  if (now - lastTime < 5 * 60 * 1000) return;

  for (const threshold of thresholds) {
    if (used >= threshold && !alerted.includes(threshold)) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${PROVIDERS[provider].name} Usage Alert`,
        message: `You've used ${used}% of your ${PROVIDERS[provider].name} quota!`,
        priority: 2
      });
      alerted.push(threshold);
      await chrome.storage.local.set({ [keyAlerted]: alerted, [keyTime]: now });
      return;
    }
  }
}

// ==================== DISPATCHER ====================

async function isCodexEnabled() {
  const { codexEnabled, codexDisabled } = await chrome.storage.local.get(['codexEnabled', 'codexDisabled']);
  return !codexDisabled && (codexEnabled !== false);
}

// Recupere les deux fournisseurs en parallele
async function fetchAll() {
  const codexOn = await isCodexEnabled();
  const [c, x] = await Promise.all([
    fetchClaude(),
    codexOn ? fetchCodex() : Promise.resolve(null)
  ]);
  const results = { claude: c, codex: x };
  await refreshBadge(results);
  return results;
}

// Init : au premier lancement, detection automatique des sessions
(async () => {
  const st = await chrome.storage.local.get(['authMode', 'refreshToken']);
  if (!st.authMode) {
    const cookieData = await fetchUsageWithCookies();
    if (cookieData && !cookieData.error && cookieData.five_hour) {
      await chrome.storage.local.set({ authMode: 'cookie' });
    } else if (st.refreshToken) {
      await chrome.storage.local.set({ authMode: 'token' });
    }
  }
  fetchAll();
})();

chrome.alarms.create('refresh', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh') fetchAll();
});

// ==================== MESSAGES ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'refresh':
      fetchAll().then(sendResponse);
      return true;

    case 'checkCookies':
      checkCookieSession().then(sendResponse);
      return true;

    case 'checkCodexSession':
      getCodexCredentials().then(c => sendResponse(c ? { valid: true, source: c.source } : { valid: false }));
      return true;

    case 'setAuthMode':
    case 'connectWithCookies': {
      const mode = message.action === 'connectWithCookies' ? 'cookie' : message.mode;
      chrome.storage.local.set({ authMode: mode }).then(() => fetchClaude().then(data => {
        if (data.error) sendResponse({ success: false, error: data.error });
        else sendResponse({ success: true, data });
      }));
      return true;
    }

    case 'connectCodex':
      chrome.storage.local.set({ codexDisabled: false, codexEnabled: true, codexAuthMode: 'cookie' })
        .then(() => fetchCodex())
        .then(data => sendResponse(data.error ? { success: false, error: data.error } : { success: true, data }));
      return true;

    case 'setCodexTokens': {
      if (!message.accessToken) {
        sendResponse({ success: false, error: 'No Codex access token provided.' });
        return true;
      }
      chrome.storage.local.set({
        codexAccessToken: message.accessToken,
        codexAccountId: message.accountId || '',
        codexAuthMode: 'token',
        codexDisabled: false,
        codexEnabled: true
      }).then(() => fetchCodex())
        .then(data => sendResponse(data.error ? { success: false, error: data.error } : { success: true, data }));
      return true;
    }

    case 'disableCodex':
      chrome.storage.local.set({ codexDisabled: true })
        .then(() => chrome.storage.local.remove(['codexUsage', 'codexAccessToken', 'codexAccountId', 'codexLastUpdate']))
        .then(() => fetchAll())
        .then(() => sendResponse({ success: true }));
      return true;

    case 'setBadgeProvider':
      chrome.storage.local.set({ badgeProvider: message.provider }).then(async () => {
        const st = await chrome.storage.local.get(['usage', 'codexUsage']);
        await refreshBadge({ claude: st.usage, codex: st.codexUsage });
        sendResponse({ success: true });
      });
      return true;

    case 'startLoginCheck': {
      if (loginCheckInterval) clearInterval(loginCheckInterval);
      let attempts = 0;
      loginCheckInterval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(loginCheckInterval);
          loginCheckInterval = null;
          return;
        }
        const results = await fetchAll();
        const ok = message.provider === 'codex'
          ? results.codex && !results.codex.error
          : results.claude && !results.claude.error;
        if (ok) {
          clearInterval(loginCheckInterval);
          loginCheckInterval = null;
          updateBadge('OK', '#10b981');
          setTimeout(fetchAll, 3000);
        }
      }, 2000);
      sendResponse({ success: true });
      return true;
    }

    case 'setTokens': {
      const tokenData = {};
      const accessToken = message.accessToken || message.token;
      if (accessToken && accessToken.startsWith('sk-ant-oat')) {
        tokenData.token = accessToken;
        tokenData.accessToken = accessToken;
      }
      if (message.refreshToken && message.refreshToken.startsWith('sk-ant-ort')) {
        tokenData.refreshToken = message.refreshToken;
      }
      if (Object.keys(tokenData).length === 0) {
        sendResponse({ success: false, error: 'No valid tokens provided. Tokens must start with sk-ant-oat or sk-ant-ort' });
        return true;
      }
      chrome.storage.local.remove(['token', 'accessToken', 'refreshToken', 'lastError', 'usage'])
        .then(() => chrome.storage.local.set({ ...tokenData, authMode: 'token' }))
        .then(() => fetchClaude())
        .then(data => sendResponse(data.error ? { success: true, error: data.error } : { success: true, data }));
      return true;
    }

    case 'getStatus':
      chrome.storage.local.get(['refreshToken', 'token', 'accessToken', 'lastError', 'usage', 'codexUsage']).then(result => {
        sendResponse({
          hasRefreshToken: !!result.refreshToken,
          hasAccessToken: !!(result.token || result.accessToken),
          lastError: result.lastError,
          hasUsageData: !!result.usage,
          hasCodexData: !!result.codexUsage
        });
      });
      return true;
  }
});
