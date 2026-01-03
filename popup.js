// Popup script

function getColorClass(percent) {
  if (percent < 50) return 'low';
  if (percent < 80) return 'medium';
  return 'high';
}

function formatTimeRemaining(resetAt) {
  const now = new Date();
  const reset = new Date(resetAt);
  const diff = reset - now;

  if (diff < 0) return 'Maintenant!';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}j ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
}

function updateUI(data) {
  if (!data || !data.five_hour) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('usageView').style.display = 'none';
    return;
  }

  document.getElementById('error').style.display = 'none';
  document.getElementById('usageView').style.display = 'block';
  document.getElementById('setup').style.display = 'none';

  // 5-hour
  const used5h = data.five_hour.utilization;
  const remaining5h = 100 - used5h;
  const class5h = getColorClass(used5h);

  document.getElementById('usage5h').textContent = `${remaining5h.toFixed(0)}%`;
  document.getElementById('usage5h').className = `usage-value ${class5h}`;
  document.getElementById('bar5h').style.width = `${used5h}%`;
  document.getElementById('bar5h').className = `progress-fill ${class5h}`;
  document.getElementById('reset5h').textContent = formatTimeRemaining(data.five_hour.resets_at);

  // 7-day
  const used7d = data.seven_day.utilization;
  const remaining7d = 100 - used7d;
  const class7d = getColorClass(used7d);

  document.getElementById('usage7d').textContent = `${remaining7d.toFixed(0)}%`;
  document.getElementById('usage7d').className = `usage-value ${class7d}`;
  document.getElementById('bar7d').style.width = `${used7d}%`;
  document.getElementById('bar7d').className = `progress-fill ${class7d}`;
  document.getElementById('reset7d').textContent = formatTimeRemaining(data.seven_day.resets_at);

  // Plan
  document.getElementById('plan').textContent = 'Plan MAX 5x';
}

function showSetup() {
  document.getElementById('setup').style.display = 'block';
  document.getElementById('usageView').style.display = 'none';
  document.getElementById('error').style.display = 'none';
}

// Load saved data
async function init() {
  const result = await chrome.storage.local.get(['token', 'usage', 'lastUpdate']);

  if (!result.token) {
    showSetup();
    return;
  }

  if (result.usage) {
    updateUI(result.usage);
    if (result.lastUpdate) {
      const date = new Date(result.lastUpdate);
      document.getElementById('lastUpdate').textContent = `MAJ: ${date.toLocaleTimeString()}`;
    }
  }

  // Refresh data
  refresh();
}

async function refresh() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  chrome.runtime.sendMessage({ action: 'refresh' }, (data) => {
    btn.classList.remove('spinning');
    if (data) {
      updateUI(data);
      document.getElementById('lastUpdate').textContent = `MAJ: ${new Date().toLocaleTimeString()}`;
    }
  });
}

// Event listeners
document.getElementById('refreshBtn').addEventListener('click', refresh);

document.getElementById('saveBtn').addEventListener('click', () => {
  const token = document.getElementById('tokenInput').value.trim();
  const refreshToken = document.getElementById('refreshTokenInput').value.trim();

  if (!token) {
    alert('Veuillez entrer au moins l\'Access Token');
    return;
  }

  const message = {
    action: 'setToken',
    token: token
  };

  // Add refresh token if provided (enables auto-refresh)
  if (refreshToken) {
    message.refreshToken = refreshToken;
  }

  chrome.runtime.sendMessage(message, (data) => {
    if (data) {
      updateUI(data);
    } else {
      // Show a success message even if no data yet
      alert(refreshToken ?
        '✅ Configuration sauvegardée!\n\nLe token se rafraîchira automatiquement.' :
        '⚠️ Token sauvegardé, mais sans Refresh Token l\'auto-refresh est désactivé.');
    }
  });
});

// Update token button
document.getElementById('updateTokenBtn').addEventListener('click', () => {
  showSetup();
  document.getElementById('tokenInput').focus();
});

// Retry button (in error view)
document.addEventListener('DOMContentLoaded', () => {
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      refresh();
    });
  }
});

// Initialize
init();
