// Reset Alert Script
// Colle ce code dans la console DevTools de l'extension pour réinitialiser les alertes

// Pour ouvrir la console DevTools:
// 1. Va sur chrome://extensions/
// 2. Trouve "Claude Code Usage"
// 3. Clique sur "Service Worker" (en bleu)
// 4. Colle ce code dans la console qui s'ouvre

chrome.storage.local.set({
  alertedThresholds: [],
  lastAlertTime: 0
}, () => {
  console.log('✅ Alertes réinitialisées!');
  console.log('Les notifications vont recommencer aux paliers: 30%, 20%, 10%, 5%');
});
