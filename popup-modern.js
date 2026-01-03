// Claude Usage Monitor - Popup Script v3.0

const circumference = 2 * Math.PI * 42; // radius = 42

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

function updateUI(data) {
  if (!data || !data.five_hour) {
    showView('errorView');
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
  const result = await chrome.storage.local.get(['refreshToken', 'usage', 'lastUpdate']);

  if (!result.refreshToken) {
    showView('setupView');
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

  chrome.runtime.sendMessage({ action: 'refresh' }, (data) => {
    btn?.classList.remove('spinning');

    if (data && data.five_hour) {
      updateUI(data);
      document.getElementById('lastUpdate').textContent = formatTimeAgo(Date.now());
    } else if (!data) {
      showView('errorView');
    }
  });
}

// Modal
function openModal() {
  document.getElementById('modalBackdrop').classList.add('show');
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

  chrome.runtime.sendMessage({
    action: 'setTokens',
    refreshToken: token
  }, (response) => {
    if (response?.success) {
      closeModal();
      refresh();
    } else {
      alert('Error saving. Check token format.');
    }
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refreshBtn')?.addEventListener('click', refresh);
  document.getElementById('settingsBtn')?.addEventListener('click', openModal);
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('retryBtn')?.addEventListener('click', refresh);

  document.getElementById('modalBackdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });

  document.getElementById('openCredentials')?.addEventListener('click', copyCredentialsPath);
  document.getElementById('openCredentialsModal')?.addEventListener('click', copyCredentialsPath);

  document.getElementById('saveBtn')?.addEventListener('click', () => saveToken('refreshTokenInput'));
  document.getElementById('modalSave')?.addEventListener('click', () => saveToken('modalRefreshToken'));

  init();
});
