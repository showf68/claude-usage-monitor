// Claude Usage Monitor - Popup Script v3.1

const circumference = 2 * Math.PI * 42; // radius = 42
let lastError = null;

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

// Initialize
async function init() {
  const result = await chrome.storage.local.get(['refreshToken', 'usage', 'lastUpdate', 'lastError']);

  if (!result.refreshToken) {
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
  // Pre-fill with existing token if available
  chrome.storage.local.get(['refreshToken'], (result) => {
    if (result.refreshToken) {
      const input = document.getElementById('modalRefreshToken');
      if (input) input.value = result.refreshToken;
    }
  });
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('show');
}

// Copy credentials path
function copyCredentialsPath() {
  const path = '%USERPROFILE%\\.claude\\.credentials.json';
  navigator.clipboard.writeText(path).then(() => {
    alert('Path copied!\n\n' + path + '\n\nPaste in Windows Explorer (Win+R)');
  });
}

// Save token
function saveToken(inputId) {
  const input = document.getElementById(inputId);
  const token = input?.value.trim();

  if (!token) {
    alert('Please enter your Refresh Token');
    return;
  }

  if (!token.startsWith('sk-ant-ort01-')) {
    alert('Invalid token format!\n\nToken must start with: sk-ant-ort01-\n\nCheck your .credentials.json file.');
    return;
  }

  // Clear any previous errors
  chrome.storage.local.remove(['lastError']);

  chrome.runtime.sendMessage({
    action: 'setTokens',
    refreshToken: token
  }, (response) => {
    if (chrome.runtime.lastError) {
      alert('Error: ' + chrome.runtime.lastError.message);
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
      alert('Error: ' + response.error);
    } else {
      alert('Unknown error saving token');
    }
  });
}

// Reconfigure - clear token and show setup
function reconfigure() {
  chrome.storage.local.remove(['refreshToken', 'accessToken', 'token', 'usage', 'lastError'], () => {
    showView('setupView');
  });
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

  document.getElementById('saveBtn')?.addEventListener('click', () => saveToken('refreshTokenInput'));
  document.getElementById('modalSave')?.addEventListener('click', () => saveToken('modalRefreshToken'));

  init();
});
