// Claude Usage Monitor - Background Service Worker v3.0
// Supports two authentication methods:
// 1. Refresh Token (from .credentials.json)
// 2. Direct Claude Session (uses browser cookies)

const API_URL = 'https://api.anthropic.com/api/oauth/usage';
const CLIENT_ID = 'claude-code';
const CLAUDE_LOGIN_URL = 'https://claude.ai/login';
const CLAUDE_SETTINGS_URL = 'https://claude.ai/settings';

// Token refresh endpoints
const TOKEN_ENDPOINTS = [
  'https://console.anthropic.com/v1/oauth/token',
  'https://api.anthropic.com/v1/oauth/token',
  'https://api.anthropic.com/oauth/token'
];

// Session-based endpoints (claude.ai)
const SESSION_USAGE_URL = 'https://claude.ai/api/organizations';

// Auth mode: 'token' or 'session'
let currentAuthMode = 'token';

// Initialize auth mode from storage
chrome.storage.local.get(['authMode']).then(result => {
  currentAuthMode = result.authMode || 'token';
});

// ==================== TOKEN-BASED AUTH ====================

async function refreshAccessToken() {
  try {
    const result = await chrome.storage.local.get(['refreshToken']);
    const refreshToken = result.refreshToken;

    if (!refreshToken) {
      console.error('No refresh token available.');
      return null;
    }

    console.log('Refreshing access token...');

    for (const endpoint of TOKEN_ENDPOINTS) {
      // Try JSON format
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: CLIENT_ID
          })
        });

        if (response.ok) {
          const data = await response.json();
          await chrome.storage.local.set({
            token: data.access_token,
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken
          });
          console.log('Access token refreshed successfully');
          return data.access_token;
        }
      } catch (e) {
        console.log(`${endpoint} (JSON) failed:`, e.message);
      }

      // Try form-urlencoded format
      try {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);
        params.append('client_id', CLIENT_ID);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        if (response.ok) {
          const data = await response.json();
          await chrome.storage.local.set({
            token: data.access_token,
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken
          });
          console.log('Access token refreshed successfully');
          return data.access_token;
        }
      } catch (e) {
        console.log(`${endpoint} (form) failed:`, e.message);
      }
    }

    throw new Error('All token refresh endpoints failed');
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

async function fetchUsageWithToken() {
  let result = await chrome.storage.local.get(['token', 'accessToken', 'refreshToken']);
  let token = result.token || result.accessToken;

  if (!token && result.refreshToken) {
    token = await refreshAccessToken();
    if (!token) return null;
  }

  if (!token) {
    updateBadgeError('CFG');
    return null;
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
      if (response.status === 403) {
        console.log('Token expired. Attempting refresh...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          return fetchUsageWithToken();
        }
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching usage with token:', error);
    return null;
  }
}

// ==================== SESSION-BASED AUTH ====================

async function checkClaudeSession() {
  try {
    // Check for session cookie on claude.ai
    const cookies = await chrome.cookies.getAll({ domain: 'claude.ai' });
    const sessionCookie = cookies.find(c =>
      c.name === 'sessionKey' ||
      c.name === '__session' ||
      c.name === '__cf_bm' ||
      c.name.includes('session')
    );

    // Also check for lastActiveOrg which indicates an active session
    const hasOrgCookie = cookies.some(c => c.name === 'lastActiveOrg');

    return sessionCookie || hasOrgCookie || cookies.length > 3;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
}

async function fetchUsageWithSession() {
  try {
    // First check if we have a valid session
    const hasSession = await checkClaudeSession();

    if (!hasSession) {
      console.log('No Claude session found');
      return { needsLogin: true };
    }

    // Try to fetch organizations to get usage
    const response = await fetch(SESSION_USAGE_URL, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      console.log('Session expired or unauthorized');
      return { needsLogin: true };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const orgs = await response.json();

    // Get the first organization's usage
    if (orgs && orgs.length > 0) {
      const orgId = orgs[0].uuid;
      const usageResponse = await fetch(`https://claude.ai/api/organizations/${orgId}/usage`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();

        // Transform to our format
        return transformSessionUsage(usageData, orgs[0]);
      }
    }

    // If direct API doesn't work, try alternative method
    return await fetchUsageAlternative();
  } catch (error) {
    console.error('Error fetching usage with session:', error);
    return { needsLogin: true };
  }
}

async function fetchUsageAlternative() {
  try {
    // Try fetching the settings page which contains usage info
    const response = await fetch('https://claude.ai/api/account', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return { needsLogin: true };
    }

    const account = await response.json();

    // Build usage data from account info
    return {
      five_hour: {
        utilization: account.rate_limit_usage?.five_hour || 0,
        resets_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
      },
      seven_day: {
        utilization: account.rate_limit_usage?.seven_day || 0,
        resets_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      plan: account.plan_type || 'Free'
    };
  } catch (error) {
    console.error('Alternative fetch failed:', error);
    return { needsLogin: true };
  }
}

function transformSessionUsage(usageData, org) {
  // Transform claude.ai API response to our format
  const now = new Date();
  const fiveHourReset = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const sevenDayReset = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    five_hour: {
      utilization: usageData.five_hour_usage_percent || usageData.current_usage_percent || 0,
      resets_at: usageData.five_hour_resets_at || fiveHourReset.toISOString()
    },
    seven_day: {
      utilization: usageData.seven_day_usage_percent || usageData.monthly_usage_percent || 0,
      resets_at: usageData.seven_day_resets_at || sevenDayReset.toISOString()
    },
    plan: org.plan || org.subscription_type || 'Pro'
  };
}

// ==================== MAIN FETCH FUNCTION ====================

async function fetchUsage() {
  const settings = await chrome.storage.local.get(['authMode']);
  currentAuthMode = settings.authMode || 'token';

  let data;

  if (currentAuthMode === 'session') {
    data = await fetchUsageWithSession();

    if (data?.needsLogin) {
      updateBadgeError('LOGIN');
      await chrome.storage.local.set({ needsLogin: true });
      return { needsLogin: true };
    }
  } else {
    data = await fetchUsageWithToken();
  }

  if (!data || data.needsLogin) {
    updateBadgeError('ERR');
    return null;
  }

  // Save data
  await chrome.storage.local.set({
    usage: data,
    lastUpdate: Date.now(),
    needsLogin: false
  });

  // Update badge
  const used = Math.round(data.five_hour?.utilization || 0);
  updateBadge(used);

  return data;
}

// ==================== BADGE UPDATES ====================

function updateBadge(used) {
  const text = used <= 99 ? `${Math.round(used)}` : '99';
  chrome.action.setBadgeText({ text });

  let color;
  if (used >= 80) {
    color = '#dc2626'; // Red
  } else if (used >= 50) {
    color = '#ea580c'; // Orange
  } else {
    color = '#16a34a'; // Green
  }

  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });

  checkAndAlert(used);
}

function updateBadgeError(text) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: text === 'LOGIN' ? '#3b82f6' : '#f59e0b' });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

// ==================== ALERTS ====================

let lastAlertedThreshold = null;

async function checkAndAlert(used) {
  const thresholds = [70, 80, 90, 95];
  const result = await chrome.storage.local.get(['alertedThresholds', 'lastAlertTime']);
  const alerted = result.alertedThresholds || [];
  const lastAlertTime = result.lastAlertTime || 0;
  const now = Date.now();

  if (now - lastAlertTime < 5 * 60 * 1000) return;

  for (const threshold of thresholds) {
    if (used >= threshold && !alerted.includes(threshold)) {
      if (lastAlertedThreshold === threshold) return;
      lastAlertedThreshold = threshold;

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Claude Usage Alert',
        message: `Warning: You've used ${used.toFixed(1)}% of your quota!`,
        priority: 2
      });

      alerted.push(threshold);
      await chrome.storage.local.set({
        alertedThresholds: alerted,
        lastAlertTime: now
      });
      return;
    }
  }

  if (used < 50 && alerted.length > 0) {
    await chrome.storage.local.set({
      alertedThresholds: [],
      lastAlertTime: 0
    });
    lastAlertedThreshold = null;
  }
}

// ==================== INITIALIZATION ====================

fetchUsage();

chrome.alarms.create('refreshUsage', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshUsage') {
    fetchUsage();
  }
});

// ==================== MESSAGE HANDLERS ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refresh') {
    fetchUsage().then(data => sendResponse(data));
    return true;
  }

  if (message.action === 'setAuthMode') {
    chrome.storage.local.set({ authMode: message.mode }).then(() => {
      currentAuthMode = message.mode;
      fetchUsage().then(data => sendResponse({ success: true, data }));
    });
    return true;
  }

  if (message.action === 'setTokens' || message.action === 'setToken') {
    const tokenData = { authMode: 'token' };

    if (message.accessToken || message.token) {
      tokenData.token = message.accessToken || message.token;
      tokenData.accessToken = message.accessToken || message.token;
    }

    if (message.refreshToken) {
      tokenData.refreshToken = message.refreshToken;
    }

    chrome.storage.local.set(tokenData).then(() => {
      currentAuthMode = 'token';
      fetchUsage().then(data => {
        sendResponse({ success: true, data });
      });
    });
    return true;
  }

  if (message.action === 'openClaudeLogin') {
    chrome.tabs.create({ url: CLAUDE_LOGIN_URL });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'checkSession') {
    checkClaudeSession().then(hasSession => {
      sendResponse({ hasSession });
    });
    return true;
  }

  if (message.action === 'getAuthMode') {
    chrome.storage.local.get(['authMode']).then(result => {
      sendResponse({ mode: result.authMode || 'token' });
    });
    return true;
  }
});
