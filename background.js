// Claude Usage Monitor - Background Service Worker v3.5

const API_URL = 'https://api.anthropic.com/api/oauth/usage';
const CLAUDE_AI_API = 'https://claude.ai/api';

// Auth modes: 'cookie' or 'token'
let currentAuthMode = 'token';
let loginCheckInterval = null; // Auto-refresh interval after login

// Claude.ai OAuth token refresh endpoints
const TOKEN_ENDPOINTS = [
  'https://claude.ai/api/auth/refresh_token',
  'https://api.claude.ai/v1/auth/token',
  'https://console.anthropic.com/v1/oauth/token'
];

// Refresh access token using Claude.ai OAuth
async function refreshAccessToken() {
  try {
    const result = await chrome.storage.local.get(['refreshToken']);
    const refreshToken = result.refreshToken;

    if (!refreshToken) {
      return { error: 'No refresh token configured. Please add your token in Settings.' };
    }

    // Validate token format
    if (!refreshToken.startsWith('sk-ant-o')) {
      return { error: 'Invalid token format. Token must start with sk-ant-oat01- (access) or sk-ant-ort01- (refresh)' };
    }

    // If it's an access token, try to use it directly first
    if (refreshToken.startsWith('sk-ant-oat01-')) {
      console.log('Token appears to be an access token, using directly');
      await chrome.storage.local.set({
        token: refreshToken,
        accessToken: refreshToken
      });
      return { token: refreshToken };
    }

    console.log('Attempting to refresh token...');
    let lastErrorMsg = '';

    // Try Claude.ai refresh endpoint first (POST with token in body)
    try {
      const response = await fetch('https://claude.ai/api/auth/refresh_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
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
          console.log('Token refreshed via claude.ai');
          return { token: data.access_token };
        }
      }
      lastErrorMsg = `claude.ai/api/auth/refresh_token: ${response.status}`;
    } catch (e) {
      lastErrorMsg = `claude.ai refresh: ${e.message}`;
    }

    // Try with bearer auth header
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
        // The refresh token works as access token directly
        console.log('Refresh token works as access token');
        await chrome.storage.local.set({
          token: refreshToken,
          accessToken: refreshToken
        });
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

// ==================== COOKIE AUTH ====================

// Check if user has valid claude.ai session cookies
async function checkCookieSession() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: '.claude.ai' });
    const sessionCookie = cookies.find(c =>
      c.name === 'sessionKey' ||
      c.name === '__cf_bm' ||
      c.name === 'lastActiveOrg'
    );

    if (!sessionCookie) {
      return { valid: false, error: 'No claude.ai session found. Please log in to claude.ai first.' };
    }

    // Try to fetch organization info to validate session
    const response = await fetch(`${CLAUDE_AI_API}/organizations`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const orgs = await response.json();
      if (orgs && orgs.length > 0) {
        return { valid: true, organizations: orgs };
      }
    }

    return { valid: false, error: 'Session expired. Please log in to claude.ai again.' };
  } catch (error) {
    return { valid: false, error: `Cookie check failed: ${error.message}` };
  }
}

// Fetch usage data using cookies (claude.ai web session)
async function fetchUsageWithCookies() {
  try {
    // First get organization ID
    const orgsResponse = await fetch(`${CLAUDE_AI_API}/organizations`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!orgsResponse.ok) {
      // 403/401 = not logged in to claude.ai
      if (orgsResponse.status === 403 || orgsResponse.status === 401) {
        updateBadge('ERR', '#ef4444');
        return { error: 'NOT_LOGGED_IN', needsLogin: true };
      }
      const errorMsg = `API error: ${orgsResponse.status}`;
      updateBadge('ERR', '#ef4444');
      return { error: errorMsg };
    }

    const orgs = await orgsResponse.json();
    if (!orgs || orgs.length === 0) {
      const errorMsg = 'No organizations found. Please log in to claude.ai.';
      updateBadge('CFG', '#f59e0b');
      return { error: errorMsg };
    }

    const orgId = orgs[0].uuid;

    // Fetch usage/rate limit info
    const usageResponse = await fetch(`${CLAUDE_AI_API}/organizations/${orgId}/rate_limit`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!usageResponse.ok) {
      // Try alternative endpoint
      const altResponse = await fetch(`${CLAUDE_AI_API}/organizations/${orgId}/usage`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!altResponse.ok) {
        const errorMsg = `Failed to get usage: ${usageResponse.status}`;
        updateBadge('ERR', '#ef4444');
        return { error: errorMsg };
      }

      const altData = await altResponse.json();
      return processUsageData(altData, orgs[0]);
    }

    const usageData = await usageResponse.json();
    return processUsageData(usageData, orgs[0]);

  } catch (error) {
    const errorMsg = `Cookie fetch error: ${error.message}`;
    console.error('Cookie fetch error:', error);
    updateBadge('ERR', '#ef4444');
    return { error: errorMsg };
  }
}

// Process and normalize usage data from different endpoints
function processUsageData(data, org) {
  console.log('Raw usage data:', data);

  // Try to extract usage info - format may vary
  let fiveHourUsage = 0;
  let sevenDayUsage = 0;
  let fiveHourReset = null;
  let sevenDayReset = null;

  // Handle different response formats
  if (data.rate_limit) {
    fiveHourUsage = data.rate_limit.usage_percent || 0;
    fiveHourReset = data.rate_limit.reset_at;
  } else if (data.usage) {
    fiveHourUsage = data.usage.percent || 0;
  } else if (typeof data.percent !== 'undefined') {
    fiveHourUsage = data.percent;
  } else if (data.five_hour) {
    // Already in expected format
    return saveAndReturnUsage(data);
  }

  // Normalize to expected format
  const normalizedData = {
    five_hour: {
      utilization: fiveHourUsage,
      reset_at: fiveHourReset
    },
    daily: {
      utilization: sevenDayUsage,
      reset_at: sevenDayReset
    },
    subscription_type: org?.subscription_type || 'unknown',
    _source: 'cookie'
  };

  return saveAndReturnUsage(normalizedData);
}

async function saveAndReturnUsage(data) {
  await chrome.storage.local.set({
    usage: data,
    lastUpdate: Date.now()
  });
  await chrome.storage.local.remove(['lastError']);

  const used = Math.round(data.five_hour?.utilization || 0);
  updateBadgeUsage(used);

  return data;
}

// ==================== TOKEN AUTH ====================

// Fetch usage data
async function fetchUsage() {
  let result = await chrome.storage.local.get(['token', 'accessToken', 'refreshToken']);
  let token = result.token || result.accessToken;

  // If no access token but have refresh token, try to get one
  if (!token && result.refreshToken) {
    const refreshResult = await refreshAccessToken();
    if (refreshResult.error) {
      updateBadge('ERR', '#ef4444');
      return { error: refreshResult.error };
    }
    token = refreshResult.token;
  }

  if (!token) {
    updateBadge('CFG', '#f59e0b');
    return { error: 'No token available. Please configure your token in Settings.' };
  }

  try {
    console.log('Fetching usage data...');
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
      console.log('Usage API error:', response.status, errorText);

      if (response.status === 403 || response.status === 401) {
        // Token might be expired, try refresh
        console.log('Token might be expired, trying refresh...');

        // Clear current token and try refresh
        await chrome.storage.local.remove(['token', 'accessToken']);

        if (result.refreshToken) {
          const refreshResult = await refreshAccessToken();
          if (!refreshResult.error) {
            return fetchUsage(); // Retry
          }
          return { error: `Auth failed (${response.status}): ${refreshResult.error}` };
        }

        const errorMsg = `Token expired (${response.status}). Please update your token in Settings.`;
        await chrome.storage.local.set({ lastError: errorMsg });
        updateBadge('ERR', '#ef4444');
        return { error: errorMsg };
      }

      const errorMsg = `API Error ${response.status}: ${errorText.substring(0, 150)}`;
      await chrome.storage.local.set({ lastError: errorMsg });
      updateBadge('ERR', '#ef4444');
      return { error: errorMsg };
    }

    const data = await response.json();
    console.log('Usage data received:', data);

    // Validate response
    if (!data.five_hour) {
      const errorMsg = 'Invalid API response: missing five_hour data. Response: ' + JSON.stringify(data).substring(0, 100);
      await chrome.storage.local.set({ lastError: errorMsg });
      updateBadge('ERR', '#ef4444');
      return { error: errorMsg };
    }

    // Save
    await chrome.storage.local.set({
      usage: data,
      lastUpdate: Date.now()
    });
    await chrome.storage.local.remove(['lastError']);

    // Update badge
    const used = Math.round(data.five_hour?.utilization || 0);
    updateBadgeUsage(used);

    return data;
  } catch (error) {
    const errorMsg = `Network error: ${error.message}`;
    console.error('Fetch error:', error);
    await chrome.storage.local.set({ lastError: errorMsg });
    updateBadge('ERR', '#ef4444');
    return { error: errorMsg };
  }
}

// Badge updates
function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

function updateBadgeUsage(used) {
  const text = used <= 99 ? `${used}` : '99';
  let color = '#16a34a'; // Green
  if (used >= 80) color = '#dc2626'; // Red
  else if (used >= 50) color = '#ea580c'; // Orange

  updateBadge(text, color);
  checkAlerts(used);
}

// Alerts
let lastAlertThreshold = null;

async function checkAlerts(used) {
  const thresholds = [70, 80, 90, 95];
  const result = await chrome.storage.local.get(['alertedThresholds', 'lastAlertTime']);
  const alerted = result.alertedThresholds || [];
  const lastTime = result.lastAlertTime || 0;
  const now = Date.now();

  // Cooldown 5 min
  if (now - lastTime < 5 * 60 * 1000) return;

  for (const threshold of thresholds) {
    if (used >= threshold && !alerted.includes(threshold) && lastAlertThreshold !== threshold) {
      lastAlertThreshold = threshold;

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Claude Usage Alert',
        message: `You've used ${used}% of your quota!`,
        priority: 2
      });

      alerted.push(threshold);
      await chrome.storage.local.set({ alertedThresholds: alerted, lastAlertTime: now });
      return;
    }
  }

  // Reset when below 50%
  if (used < 50 && alerted.length > 0) {
    await chrome.storage.local.set({ alertedThresholds: [], lastAlertTime: 0 });
    lastAlertThreshold = null;
  }
}

// ==================== MAIN FETCH DISPATCHER ====================

// Unified fetch that uses the configured auth mode
async function fetchUsageAuto() {
  const result = await chrome.storage.local.get(['authMode']);
  const authMode = result.authMode || 'token';

  console.log('Fetching usage with mode:', authMode);

  if (authMode === 'cookie') {
    return fetchUsageWithCookies();
  } else {
    return fetchUsage();
  }
}

// Init - Smart auto-detection
(async () => {
  const result = await chrome.storage.local.get(['authMode', 'refreshToken']);

  // If authMode is already set, use it
  if (result.authMode) {
    currentAuthMode = result.authMode;
    console.log('Init with saved auth mode:', currentAuthMode);
    fetchUsageAuto();
    return;
  }

  // No authMode set - try to auto-detect
  console.log('No auth mode configured, trying auto-detection...');

  // Try cookie mode first (if user is already logged in to claude.ai)
  console.log('Trying cookie mode...');
  const cookieData = await fetchUsageWithCookies();

  if (cookieData && !cookieData.error && cookieData.five_hour) {
    // Cookie mode works! Use it
    console.log('✅ Cookie mode detected - user already logged in to claude.ai');
    currentAuthMode = 'cookie';
    await chrome.storage.local.set({ authMode: 'cookie' });
    updateBadge('OK', '#10b981');

    // Show OK for 3 seconds, then display usage
    setTimeout(async () => {
      const used = Math.round(cookieData.five_hour.utilization || 0);
      updateBadgeUsage(used);
    }, 3000);

    return;
  }

  // Cookie mode failed, check if token is configured
  if (result.refreshToken) {
    console.log('Token configured, using token mode');
    currentAuthMode = 'token';
    await chrome.storage.local.set({ authMode: 'token' });
    fetchUsageAuto();
    return;
  }

  // Nothing configured - show CFG badge
  console.log('⚠️ No authentication configured');
  currentAuthMode = 'token'; // Default
  updateBadge('CFG', '#eab308');
})();

// Auto-refresh every minute
chrome.alarms.create('refresh', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh') fetchUsageAuto();
});

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refresh') {
    fetchUsageAuto().then(data => sendResponse(data));
    return true;
  }

  if (message.action === 'checkCookies') {
    checkCookieSession().then(result => sendResponse(result));
    return true;
  }

  if (message.action === 'setAuthMode') {
    const mode = message.mode; // 'cookie' or 'token'
    chrome.storage.local.set({ authMode: mode }).then(() => {
      currentAuthMode = mode;
      console.log('Auth mode set to:', mode);
      if (mode === 'cookie') {
        fetchUsageWithCookies().then(data => sendResponse({ success: true, data }));
      } else {
        fetchUsage().then(data => sendResponse({ success: true, data }));
      }
    });
    return true;
  }

  if (message.action === 'connectWithCookies') {
    chrome.storage.local.set({ authMode: 'cookie' }).then(() => {
      currentAuthMode = 'cookie';
      fetchUsageWithCookies().then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      });
    });
    return true;
  }

  if (message.action === 'startLoginCheck') {
    // Clear existing interval
    if (loginCheckInterval) {
      clearInterval(loginCheckInterval);
    }

    // Auto-refresh every 2 seconds, max 30 attempts (1 minute)
    let attempts = 0;
    loginCheckInterval = setInterval(async () => {
      attempts++;
      console.log(`Login check attempt ${attempts}/30`);

      if (attempts > 30) {
        console.log('Login check timeout - stopping');
        clearInterval(loginCheckInterval);
        loginCheckInterval = null;
        return;
      }

      // Try to fetch usage
      const data = await fetchUsageAuto();

      // If successful (no error), stop checking
      if (data && !data.error && data.five_hour) {
        console.log('Login successful - stopping check');
        clearInterval(loginCheckInterval);
        loginCheckInterval = null;

        // Show success for 3 seconds, then display usage
        updateBadge('OK', '#10b981');
        setTimeout(async () => {
          // Fetch again to update badge with real usage
          const newData = await fetchUsageAuto();
          if (newData && newData.five_hour) {
            const used = Math.round(newData.five_hour.utilization || 0);
            updateBadgeUsage(used);
          }
        }, 3000);
      }
    }, 2000);

    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'setTokens') {
    const tokenData = {};

    // Check for access token
    if (message.accessToken || message.token) {
      const accessToken = message.accessToken || message.token;
      if (accessToken.startsWith('sk-ant-oat')) {
        tokenData.token = accessToken;
        tokenData.accessToken = accessToken;
        console.log('Saving access token');
      }
    }

    // Check for refresh token
    if (message.refreshToken) {
      if (message.refreshToken.startsWith('sk-ant-ort')) {
        tokenData.refreshToken = message.refreshToken;
        console.log('Saving refresh token');
      }
    }

    if (Object.keys(tokenData).length === 0) {
      sendResponse({ success: false, error: 'No valid tokens provided. Tokens must start with sk-ant-oat or sk-ant-ort' });
      return true;
    }

    // Clear old tokens and errors
    chrome.storage.local.remove(['token', 'accessToken', 'refreshToken', 'lastError', 'usage']).then(() => {
      chrome.storage.local.set(tokenData).then(() => {
        fetchUsage().then(data => {
          if (data.error) {
            sendResponse({ success: true, error: data.error });
          } else {
            sendResponse({ success: true, data });
          }
        });
      });
    });
    return true;
  }

  if (message.action === 'getStatus') {
    chrome.storage.local.get(['refreshToken', 'token', 'accessToken', 'lastError', 'usage']).then(result => {
      sendResponse({
        hasRefreshToken: !!result.refreshToken,
        hasAccessToken: !!(result.token || result.accessToken),
        lastError: result.lastError,
        hasUsageData: !!result.usage
      });
    });
    return true;
  }
});
