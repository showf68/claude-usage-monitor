// Claude Usage Monitor - Background Service Worker v3.1

const API_URL = 'https://api.anthropic.com/api/oauth/usage';
const CLIENT_ID = 'claude-code';

const TOKEN_ENDPOINTS = [
  'https://console.anthropic.com/v1/oauth/token',
  'https://api.anthropic.com/v1/oauth/token',
  'https://api.anthropic.com/oauth/token'
];

// Refresh access token
async function refreshAccessToken() {
  try {
    const result = await chrome.storage.local.get(['refreshToken']);
    const refreshToken = result.refreshToken;

    if (!refreshToken) {
      console.log('No refresh token configured');
      return { error: 'No refresh token configured. Please add your token in Settings.' };
    }

    if (!refreshToken.startsWith('sk-ant-ort01-')) {
      return { error: 'Invalid token format. Token must start with sk-ant-ort01-' };
    }

    console.log('Refreshing access token...');
    let lastErrorMsg = '';

    for (const endpoint of TOKEN_ENDPOINTS) {
      // Try JSON format
      try {
        console.log('Trying endpoint:', endpoint);
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
          await chrome.storage.local.remove(['lastError']);
          console.log('Token refreshed via', endpoint);
          return { token: data.access_token };
        } else {
          const errorText = await response.text();
          lastErrorMsg = `${endpoint}: HTTP ${response.status} - ${errorText.substring(0, 100)}`;
          console.log('Endpoint failed:', lastErrorMsg);
        }
      } catch (e) {
        lastErrorMsg = `${endpoint}: ${e.message}`;
        console.log('Endpoint error:', lastErrorMsg);
      }

      // Try form-urlencoded
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
          await chrome.storage.local.remove(['lastError']);
          console.log('Token refreshed via', endpoint, '(form)');
          return { token: data.access_token };
        } else {
          const errorText = await response.text();
          lastErrorMsg = `${endpoint} (form): HTTP ${response.status} - ${errorText.substring(0, 100)}`;
        }
      } catch (e) {
        lastErrorMsg = `${endpoint} (form): ${e.message}`;
      }
    }

    const errorMsg = `Token refresh failed. Last error: ${lastErrorMsg}`;
    await chrome.storage.local.set({ lastError: errorMsg });
    console.error(errorMsg);
    return { error: errorMsg };
  } catch (error) {
    const errorMsg = `Token refresh exception: ${error.message}`;
    await chrome.storage.local.set({ lastError: errorMsg });
    console.error(errorMsg);
    return { error: errorMsg };
  }
}

// Fetch usage data
async function fetchUsage() {
  let result = await chrome.storage.local.get(['token', 'accessToken', 'refreshToken']);
  let token = result.token || result.accessToken;

  // Get new token if needed
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
    return { error: 'No token available. Please configure your refresh token in Settings.' };
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
        console.log('Token expired, refreshing...');
        const refreshResult = await refreshAccessToken();
        if (refreshResult.error) {
          updateBadge('ERR', '#ef4444');
          return { error: `Auth failed: ${refreshResult.error}` };
        }
        // Retry with new token
        return fetchUsage();
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
        iconUrl: 'icon128.png',
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

// Init
fetchUsage();

// Auto-refresh every minute
chrome.alarms.create('refresh', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh') fetchUsage();
});

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refresh') {
    fetchUsage().then(data => sendResponse(data));
    return true;
  }

  if (message.action === 'setTokens') {
    const tokenData = {};
    if (message.token || message.accessToken) {
      tokenData.token = message.token || message.accessToken;
      tokenData.accessToken = message.token || message.accessToken;
    }
    if (message.refreshToken) {
      tokenData.refreshToken = message.refreshToken;
    }

    // Validate token format before saving
    if (tokenData.refreshToken && !tokenData.refreshToken.startsWith('sk-ant-ort01-')) {
      sendResponse({ success: false, error: 'Invalid token format. Must start with sk-ant-ort01-' });
      return true;
    }

    chrome.storage.local.set(tokenData).then(() => {
      // Clear old access tokens to force refresh
      chrome.storage.local.remove(['token', 'accessToken', 'lastError']).then(() => {
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
