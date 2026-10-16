// AI Usage Monitor - fournisseurs OPTIONNELS : Gemini et Grok (charge par background.js via importScripts).
//
// GEMINI - lecture PROUVEE sur un vrai compte le 16/10/2026 : la page https://gemini.google.com/usage (« Limites d'utilisation »)
// appelle la RPC `jSf9Qc` (BardFrontendService.GetUsageInfo) avec trois jetons presents dans son HTML (WIZ_global_data :
// SNlM0e = `at`, cfb2h = `bl`, FdrFJe = `f.sid`). Reponse : [formule, [[limite, UTILISE (fraction 0..1), type, [[secondes, nanos]]], ...], false]
// ou type 1 = utilisation actuelle, type 2 = hebdomadaire ; formule 2 PRO, 3 et 6 ULTRA, 4 PLUS (lu dans le JS de la page).
//
// GROK - NON eprouve (aucune session Grok disponible au moment du developpement) : POST /rest/rate-limits, forme lue dans un script tiers.
// Regle d'or : si le compteur manque, on rend une erreur « indisponible », JAMAIS un faux 0 %.

const GEMINI_ORIGIN = 'https://gemini.google.com';
const GROK_ORIGIN = 'https://grok.com';
const GEMINI_TIERS = { 2: 'Pro', 3: 'Ultra', 6: 'Ultra', 4: 'Plus' };
const HOURS_48_MS = 48 * 3600 * 1000;

const EXTRA = {
  gemini: { name: 'Gemini', origin: GEMINI_ORIGIN, storeKey: 'geminiUsage', enabledKey: 'geminiEnabled', timeKey: 'geminiLastUpdate' },
  grok: { name: 'Grok', origin: GROK_ORIGIN, storeKey: 'grokUsage', enabledKey: 'grokEnabled', timeKey: 'grokLastUpdate' }
};

// ---------------------------------------------------------------- analyseurs purs (testables sans reseau)

// Charge utile (chaine JSON) de la RPC `rpc` dans une reponse batchexecute, ou null
function parseBatchPayload(text, rpc) {
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (!t.startsWith('[')) continue;
    let rows;
    try { rows = JSON.parse(t); } catch (e) { continue; }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (Array.isArray(row) && row[0] === 'wrb.fr' && row[1] === rpc && typeof row[2] === 'string' && row[2]) return row[2];
    }
  }
  return null;
}

// L'ordre des entrees change d'un appel a l'autre : on cherche par type, jamais par position
function parseGeminiUsage(text) {
  const payload = parseBatchPayload(text, 'jSf9Qc');
  if (!payload) return null;
  let root;
  try { root = JSON.parse(payload); } catch (e) { return null; }
  if (!Array.isArray(root) || !Array.isArray(root[1])) return null;
  const windows = [];
  for (const e of root[1]) {
    if (!Array.isArray(e)) continue;
    const used = e[1] == null ? 0 : Number(e[1]);
    if (Number.isNaN(used)) continue;
    const sec = Array.isArray(e[3]) && Array.isArray(e[3][0]) ? Number(e[3][0][0]) : NaN;
    const resets_at = Number.isFinite(sec) && sec > 0 ? new Date(sec * 1000).toISOString() : null;
    if (e[2] === 1 && !windows.some(w => w.key === 'gemini_current')) {
      windows.push({ key: 'gemini_current', utilization: used * 100, resets_at, window_ms: 0 });
    } else if (e[2] === 2 && !windows.some(w => w.key === 'gemini_weekly')) {
      windows.push({ key: 'gemini_weekly', utilization: used * 100, resets_at, window_ms: 7 * 24 * 3600 * 1000 });
    }
  }
  if (!windows.length) return null;
  windows.sort((a, b) => (a.key === 'gemini_current' ? 0 : 1) - (b.key === 'gemini_current' ? 0 : 1));
  return { windows, plan: GEMINI_TIERS[root[0]] || null };
}

function parseGrokRateLimits(text, nowMs) {
  let o;
  try { o = JSON.parse(text); } catch (e) { return null; }
  if (!o || typeof o !== 'object') return null;
  const rootWindowMs = (Number(o.windowSizeSeconds) || 0) * 1000;
  const bucket = (key, b, fallbackMs) => {
    if (!b || typeof b !== 'object') return null;
    const total = Number(b.totalQueries), remaining = Number(b.remainingQueries);
    if (b.totalQueries == null || b.remainingQueries == null || !Number.isFinite(total) || !Number.isFinite(remaining) || total <= 0) return null;
    const used = Math.min(100, Math.max(0, (total - remaining) / total * 100));
    const windowMs = (Number(b.windowSizeSeconds) || 0) * 1000 || fallbackMs;
    const wait = Number(b.waitTimeSeconds) || 0;
    const resets_at = remaining <= 0 && wait > 0 ? new Date((nowMs || Date.now()) + wait * 1000).toISOString() : null;
    return { key, utilization: used, resets_at, window_ms: windowMs };
  };
  const windows = [
    bucket('grok_queries', o, rootWindowMs),
    bucket('grok_high', o.highEffortRateLimits, rootWindowMs),
    bucket('grok_low', o.lowEffortRateLimits, rootWindowMs)
  ].filter(Boolean);
  return windows.length ? { windows, plan: null } : null;
}

// ---------------------------------------------------------------- acces reseau

const NOT_LOGGED_IN = { error: 'NOT_LOGGED_IN', needsLogin: true };

// L'autorisation d'acces au site est OPTIONNELLE : demandee par le popup quand l'utilisateur active l'outil
async function hasHostAccess(id) {
  try { return await chrome.permissions.contains({ origins: [EXTRA[id].origin + '/*'] }); } catch (e) { return false; }
}

async function isExtraEnabled(id) {
  const r = await chrome.storage.local.get([EXTRA[id].enabledKey]);
  return r[EXTRA[id].enabledKey] === true && await hasHostAccess(id);
}

// Les jetons Gemini vivent ~des dizaines de minutes : on ne retelecharge pas la page (800 Ko) a chaque minute
let geminiTokenMemo = null;
async function geminiTokens(force) {
  const fresh = (t) => t && Date.now() - t.t < 25 * 60 * 1000;
  if (!force) {
    if (fresh(geminiTokenMemo)) return geminiTokenMemo;
    try {
      const s = await chrome.storage.session.get(['geminiTokens']);
      if (fresh(s.geminiTokens)) { geminiTokenMemo = s.geminiTokens; return geminiTokenMemo; }
    } catch (e) { /* session indisponible : on retombe sur la memoire */ }
  }
  const r = await fetch(GEMINI_ORIGIN + '/usage', { credentials: 'include', headers: { 'Accept': 'text/html' } });
  if (!r.ok) return { error: `Gemini page HTTP ${r.status}` };
  // Non connecte : Google redirige vers accounts.google.com
  if (!String(r.url || GEMINI_ORIGIN).startsWith(GEMINI_ORIGIN)) return NOT_LOGGED_IN;
  const html = await r.text();
  const pick = (k) => { const m = new RegExp('"' + k + '":"([^"]*)"').exec(html); return m ? m[1] : null; };
  const at = pick('SNlM0e'), bl = pick('cfb2h'), sid = pick('FdrFJe');
  if (!at || !bl) return NOT_LOGGED_IN;
  geminiTokenMemo = { at, bl, sid, t: Date.now() };
  try { await chrome.storage.session.set({ geminiTokens: geminiTokenMemo }); } catch (e) { /* idem */ }
  return geminiTokenMemo;
}

async function geminiRpc(tk) {
  const url = GEMINI_ORIGIN + '/_/BardChatUi/data/batchexecute?rpcids=jSf9Qc&source-path=%2Fusage&bl=' + encodeURIComponent(tk.bl) +
    (tk.sid ? '&f.sid=' + encodeURIComponent(tk.sid) : '') + '&hl=en&_reqid=' + (100000 + Math.floor(Math.random() * 800000)) + '&rt=c';
  const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['jSf9Qc', '[]', null, 'generic']]])) + '&at=' + encodeURIComponent(tk.at) + '&';
  return fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
}

async function fetchGemini() {
  if (!(await hasHostAccess('gemini'))) return { error: 'Gemini: permission not granted', needsPermission: true };
  try {
    for (const force of [false, true]) {
      const tk = await geminiTokens(force);
      if (tk.error) return tk;
      const r = await geminiRpc(tk);
      const data = r.ok ? parseGeminiUsage(await r.text()) : null;
      if (data) {
        data._source = 'cookie';
        return data;
      }
      if (!force) continue;          // jetons perimes ou refuses : on recharge la page une fois, puis on reessaie
      if (r.status === 401 || r.status === 403) return NOT_LOGGED_IN;
      return r.ok ? { error: 'Gemini: no usage data in the response' } : { error: `Gemini API error ${r.status}` };
    }
    return { error: 'Gemini: no usage data' };
  } catch (e) {
    return { error: `Gemini network error: ${e.message}` };
  }
}

async function fetchGrok() {
  if (!(await hasHostAccess('grok'))) return { error: 'Grok: permission not granted', needsPermission: true };
  try {
    const s = await fetch(GROK_ORIGIN + '/api/auth/session', { credentials: 'include', headers: { 'Accept': 'application/json' } })
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (s && s.status === 'unauthenticated') return NOT_LOGGED_IN;
    let last = null;
    for (const modelName of ['grok-4', 'grok-3']) {
      const r = await fetch(GROK_ORIGIN + '/rest/rate-limits', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKind: 'DEFAULT', modelName })
      });
      if (r.status === 401 || r.status === 403) return NOT_LOGGED_IN;
      const text = await r.text();
      last = r.status;
      if (!r.ok) continue;
      const data = parseGrokRateLimits(text, Date.now());
      if (data) { data._source = 'cookie'; return data; }
    }
    return { error: last && last !== 200 ? `Grok API error ${last}` : 'Grok: quota counter unavailable' };
  } catch (e) {
    return { error: `Grok network error: ${e.message}` };
  }
}

const fetchExtra = { gemini: fetchGemini, grok: fetchGrok };

// Resultat memorise (pour ne pas interroger Google/xAI a chaque minute : 3 minutes entre deux lectures, sauf demande explicite)
const extraLastFetch = {};
async function fetchExtraCached(id, force) {
  const store = EXTRA[id];
  const now = Date.now();
  if (!force && extraLastFetch[id] && now - extraLastFetch[id] < 3 * 60 * 1000) {
    const cached = await chrome.storage.local.get([store.storeKey]);
    if (cached[store.storeKey]) return cached[store.storeKey];
  }
  extraLastFetch[id] = now;
  const data = await fetchExtra[id]();
  if (!data.error) await chrome.storage.local.set({ [store.storeKey]: data, [store.timeKey]: now });
  return data;
}
