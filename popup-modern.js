// Claude Usage Monitor - Popup Script v3.0
// Supports Session & Token Authentication

const circumference = 2 * Math.PI * 52;
let currentAuthMode = 'session';

// ==================== UTILITY FUNCTIONS ====================

function getColorClass(used) {
  if (used < 50) return 'low';
  if (used < 80) return 'medium';
  return 'high';
}

function updateCircularProgress(circleId, percentId, used) {
  const circle = document.getElementById(circleId);
  const percentElem = document.getElementById(percentId);

  const offset = circumference - (used / 100) * circumference;
  circle.style.strokeDashoffset = offset;

  const colorClass = getColorClass(used);
  circle.className = `circle-progress ${colorClass}`;
  percentElem.className = `circle-percent ${colorClass}`;
  percentElem.textContent = `${Math.round(used)}%`;
}

function formatTimeRemaining(resetAt) {
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
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

// ==================== VIEW MANAGEMENT ====================

function showView(viewName) {
  const views = ['setupView', 'usageView', 'errorView', 'loginPromptView'];
  views.forEach(v => {
    const elem = document.getElementById(v);
    if (elem) elem.style.display = v === viewName ? 'block' : 'none';
  });
}

function showSetupView() { showView('setupView'); }
function showUsageView() { showView('usageView'); }
function showError() { showView('errorView'); }
function showLoginPrompt() { showView('loginPromptView'); }

// ==================== UI UPDATE ====================

function updateUI(data) {
  if (!data || data.needsLogin) {
    if (currentAuthMode === 'session') {
      showLoginPrompt();
    } else {
      showError();
    }
    return;
  }

  if (!data.five_hour) {
    showError();
    return;
  }

  showUsageView();

  // 5-hour usage
  const used5h = data.five_hour.utilization || 0;
  updateCircularProgress('circle5h', 'percent5h', used5h);
  document.getElementById('reset5h').textContent = formatTimeRemaining(data.five_hour.resets_at);

  // 7-day usage
  const used7d = data.seven_day?.utilization || 0;
  updateCircularProgress('circle7d', 'percent7d', used7d);
  document.getElementById('reset7d').textContent = formatTimeRemaining(data.seven_day?.resets_at);

  // Plan
  const planElem = document.getElementById('plan');
  if (data.plan) {
    planElem.textContent = data.plan;
    planElem.style.display = 'block';
  } else {
    planElem.style.display = 'none';
  }

  // Auth mode display
  const authDisplay = document.getElementById('authModeDisplay');
  if (authDisplay) {
    authDisplay.textContent = currentAuthMode === 'session' ? 'Claude Session' : 'API Token';
  }
}

// ==================== SESSION STATUS ====================

async function updateSessionStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'checkSession' }, (response) => {
      const hasSession = response?.hasSession || false;

      // Update setup view status
      const statusElem = document.getElementById('sessionStatus');
      if (statusElem) {
        if (hasSession) {
          statusElem.classList.remove('disconnected');
          statusElem.querySelector('span').textContent = 'Connected to Claude';
        } else {
          statusElem.classList.add('disconnected');
          statusElem.querySelector('span').textContent = 'Not connected to Claude';
        }
      }

      // Update modal status
      const modalStatusElem = document.getElementById('modalSessionStatus');
      if (modalStatusElem) {
        if (hasSession) {
          modalStatusElem.classList.remove('disconnected');
          modalStatusElem.querySelector('span').textContent = 'Connected';
        } else {
          modalStatusElem.classList.add('disconnected');
          modalStatusElem.querySelector('span').textContent = 'Not connected';
        }
      }

      resolve(hasSession);
    });
  });
}

// ==================== AUTH MODE SWITCHING ====================

function switchAuthMode(mode) {
  currentAuthMode = mode;

  // Update setup view tabs
  document.getElementById('tabSession')?.classList.toggle('active', mode === 'session');
  document.getElementById('tabToken')?.classList.toggle('active', mode === 'token');

  // Update setup panels
  document.getElementById('sessionPanel').style.display = mode === 'session' ? 'block' : 'none';
  document.getElementById('tokenPanel').style.display = mode === 'token' ? 'block' : 'none';

  // Update modal tabs
  document.getElementById('modalTabSession')?.classList.toggle('active', mode === 'session');
  document.getElementById('modalTabToken')?.classList.toggle('active', mode === 'token');

  // Update modal panels
  document.getElementById('modalSessionSettings').style.display = mode === 'session' ? 'block' : 'none';
  document.getElementById('modalTokenSettings').style.display = mode === 'token' ? 'block' : 'none';
}

// ==================== INITIALIZATION ====================

async function init() {
  // Get current auth mode
  const result = await chrome.storage.local.get(['authMode', 'accessToken', 'token', 'refreshToken', 'usage', 'lastUpdate', 'needsLogin']);

  currentAuthMode = result.authMode || 'session';
  switchAuthMode(currentAuthMode);

  // Check session status if in session mode
  if (currentAuthMode === 'session') {
    await updateSessionStatus();
  }

  // Determine which view to show
  const hasToken = result.accessToken || result.token || result.refreshToken;

  if (currentAuthMode === 'token' && !hasToken) {
    showSetupView();
    return;
  }

  if (currentAuthMode === 'session') {
    const hasSession = await updateSessionStatus();
    if (!hasSession && !result.usage) {
      showSetupView();
      return;
    }
  }

  // Show usage if available
  if (result.usage) {
    updateUI(result.usage);
    if (result.lastUpdate) {
      const date = new Date(result.lastUpdate);
      const timeAgo = formatTimeAgo(result.lastUpdate);
      document.getElementById('lastUpdate').textContent = `${date.toLocaleTimeString()} (${timeAgo})`;
    }
  } else {
    showUsageView();
  }

  // Refresh data
  refresh();
}

// ==================== REFRESH ====================

async function refresh() {
  const btn = document.getElementById('refreshBtn');
  btn?.classList.add('spinning');

  // Update session status first
  if (currentAuthMode === 'session') {
    await updateSessionStatus();
  }

  chrome.runtime.sendMessage({ action: 'refresh' }, (data) => {
    btn?.classList.remove('spinning');

    if (data?.needsLogin && currentAuthMode === 'session') {
      showLoginPrompt();
      return;
    }

    if (data) {
      updateUI(data);
      const now = Date.now();
      const date = new Date(now);
      const timeAgo = formatTimeAgo(now);
      document.getElementById('lastUpdate').textContent = `${date.toLocaleTimeString()} (${timeAgo})`;
    } else {
      showError();
    }
  });
}

// ==================== MODAL ====================

function openModal() {
  document.getElementById('modalBackdrop').classList.add('show');
  switchAuthMode(currentAuthMode);
  updateSessionStatus();
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('show');
}

// ==================== CREDENTIALS PATH ====================

function copyCredentialsPath() {
  const genericPath = '%USERPROFILE%\\.claude\\.credentials.json';
  navigator.clipboard.writeText(genericPath).then(() => {
    alert(`Path copied!\n\n${genericPath}\n\nPaste in Windows Explorer (Win+R or address bar).\n\nOr open directly:\nC:\\Users\\YOUR_NAME\\.claude\\.credentials.json`);
  });
}

// ==================== OPEN CLAUDE LOGIN ====================

function openClaudeLogin() {
  chrome.runtime.sendMessage({ action: 'openClaudeLogin' });
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', () => {
  // Header buttons
  document.getElementById('refreshBtn')?.addEventListener('click', refresh);
  document.getElementById('settingsBtn')?.addEventListener('click', openModal);

  // Modal
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalBackdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });

  // Setup view - Auth tabs
  document.getElementById('tabSession')?.addEventListener('click', () => {
    switchAuthMode('session');
    updateSessionStatus();
  });

  document.getElementById('tabToken')?.addEventListener('click', () => {
    switchAuthMode('token');
  });

  // Modal - Auth tabs
  document.getElementById('modalTabSession')?.addEventListener('click', () => {
    switchAuthMode('session');
    updateSessionStatus();
  });

  document.getElementById('modalTabToken')?.addEventListener('click', () => {
    switchAuthMode('token');
  });

  // Credentials path buttons
  document.getElementById('openCredentials')?.addEventListener('click', copyCredentialsPath);
  document.getElementById('openCredentialsModal')?.addEventListener('click', copyCredentialsPath);

  // Claude login buttons
  document.getElementById('loginClaudeBtn')?.addEventListener('click', openClaudeLogin);
  document.getElementById('loginPromptBtn')?.addEventListener('click', openClaudeLogin);
  document.getElementById('modalLoginBtn')?.addEventListener('click', openClaudeLogin);

  // Switch to token auth from login prompt
  document.getElementById('switchToTokenBtn')?.addEventListener('click', () => {
    switchAuthMode('token');
    chrome.storage.local.set({ authMode: 'token' });
    showSetupView();
  });

  // Save from setup view (token mode)
  document.getElementById('saveBtn')?.addEventListener('click', async () => {
    const refreshToken = document.getElementById('refreshTokenInput').value.trim();

    if (!refreshToken) {
      alert('Please enter your Refresh Token');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'setTokens',
      refreshToken: refreshToken
    }, (response) => {
      if (response?.success) {
        refresh();
      } else {
        alert('Error saving configuration. Check the console for details.');
      }
    });
  });

  // Save from setup view (session mode) - just set auth mode
  document.getElementById('sessionPanel')?.addEventListener('click', async (e) => {
    if (e.target.closest('.btn-claude')) {
      // After login, set auth mode to session
      await chrome.storage.local.set({ authMode: 'session' });
      currentAuthMode = 'session';
    }
  });

  // Modal save
  document.getElementById('modalSave')?.addEventListener('click', async () => {
    if (currentAuthMode === 'token') {
      const refreshToken = document.getElementById('modalRefreshToken').value.trim();

      if (refreshToken) {
        chrome.runtime.sendMessage({
          action: 'setTokens',
          refreshToken: refreshToken
        }, (response) => {
          if (response?.success) {
            closeModal();
            refresh();
          } else {
            alert('Error saving configuration.');
          }
        });
      } else {
        // Just save auth mode
        chrome.runtime.sendMessage({
          action: 'setAuthMode',
          mode: 'token'
        }, () => {
          closeModal();
          refresh();
        });
      }
    } else {
      // Session mode
      chrome.runtime.sendMessage({
        action: 'setAuthMode',
        mode: 'session'
      }, () => {
        closeModal();
        refresh();
      });
    }
  });

  // Retry button
  document.getElementById('retryBtn')?.addEventListener('click', refresh);

  // Initialize
  init();
});
