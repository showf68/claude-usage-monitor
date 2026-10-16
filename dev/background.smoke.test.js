// Test de fumee du service worker (sans Chrome, sans reseau) :  node dev/background.smoke.test.js
// Charge background.js + extra-providers.js dans un contexte isole avec de fausses API chrome.* et un faux fetch,
// puis verifie que Gemini / Grok s'integrent (activation, lecture, cadence, badge, desactivation) sans casser Claude / Codex.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const GEMINI_RPC = ")]}'\n\n233\n[[\"wrb.fr\",\"jSf9Qc\",\"[4,[[2,0,4,null,null,[[1792141774,265477000],2]],[1200,0.62,1,[[1792141774,265477000]]],[24192,0.2,2,[[1792451374,265616000]]]],false]\",null,null,null,\"generic\"],[\"di\",141]]\n25\n[[\"e\",4,null,null,269]]\n";
const GEMINI_HTML = '<html><script>window.WIZ_global_data={"SNlM0e":"AT-TOKEN","cfb2h":"boq_gemini_x","FdrFJe":"-123"};</script></html>';

function makeEnv(opts = {}) {
  const calls = [];
  const mem = {}, session = {};
  const badge = { text: null, color: null };
  const notifications = [];
  const perms = new Set(opts.perms || []);
  const state = { geminiLoggedIn: opts.geminiLoggedIn !== false, grok: opts.grok || 'ok' };
  let onMessage = null;

  const store = (o) => ({
    get: async (keys) => {
      const ks = Array.isArray(keys) ? keys : keys == null ? Object.keys(o) : [keys];
      const r = {}; ks.forEach(k => { if (k in o) r[k] = JSON.parse(JSON.stringify(o[k])); }); return r;
    },
    set: async (v) => { Object.assign(o, JSON.parse(JSON.stringify(v))); },
    remove: async (keys) => { (Array.isArray(keys) ? keys : [keys]).forEach(k => delete o[k]); }
  });
  const resp = (status, body, url) => ({
    ok: status >= 200 && status < 300, status, url,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
  });

  const fakeFetch = async (url, init = {}) => {
    calls.push(url);
    if (url.startsWith('https://claude.ai/api/organizations') && !url.includes('/usage') && !url.includes('/rate_limit')) return resp(200, [{ uuid: 'u1', billing_type: 'stripe' }], url);
    if (url.includes('/organizations/u1/usage')) return resp(200, { five_hour: { utilization: 37, resets_at: new Date(Date.now() + 3e6).toISOString() }, seven_day: { utilization: 20, resets_at: null } }, url);
    if (url.startsWith('https://chatgpt.com/api/auth/session')) return resp(200, {}, url);
    if (url === 'https://gemini.google.com/usage') {
      return state.geminiLoggedIn ? resp(200, GEMINI_HTML, url) : resp(200, '<html>sign in</html>', 'https://accounts.google.com/signin');
    }
    if (url.startsWith('https://gemini.google.com/_/BardChatUi/data/batchexecute')) {
      assert.ok(String(init.body).includes('at=AT-TOKEN'), 'le jeton at doit etre envoye');
      return resp(200, GEMINI_RPC, url);
    }
    if (url.startsWith('https://grok.com/api/auth/session')) return resp(200, state.grok === 'unauth' ? { status: 'unauthenticated' } : { user: { id: 'u' } }, url);
    if (url.startsWith('https://grok.com/rest/rate-limits')) {
      if (state.grok === 'nodata') return resp(200, { windowSizeSeconds: 7200 }, url);
      return resp(200, { remainingQueries: 30, totalQueries: 40, windowSizeSeconds: 7200 }, url);
    }
    return resp(404, {}, url);
  };

  const chrome = {
    storage: { local: store(mem), session: store(session) },
    permissions: { contains: async ({ origins }) => origins.every(o => perms.has(o)) },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    action: { setBadgeText: ({ text }) => { badge.text = text; }, setBadgeBackgroundColor: ({ color }) => { badge.color = color; }, setBadgeTextColor() {} },
    notifications: { create: (n) => notifications.push(n) },
    cookies: { getAll: async () => [] },
    runtime: { onMessage: { addListener: (fn) => { onMessage = fn; } } }
  };

  const ctx = vm.createContext({
    chrome, fetch: fakeFetch, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Promise, JSON, Math, Number, String, Array, Object, RegExp, Error,
    URLSearchParams, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN, isFinite,
    importScripts: (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f })
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8'), ctx, { filename: 'background.js' });

  const send = (message) => new Promise((resolve) => { const keep = onMessage(message, {}, resolve); if (!keep) resolve(undefined); });
  return { ctx, calls, mem, session, badge, notifications, perms, state, send };
}

const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
let n = 0;
async function test(name, fn) { await fn(); n++; console.log('ok  ' + name); }

(async () => {
  await test('sans autorisation, Gemini et Grok restent absents et ne touchent pas au reseau', async () => {
    const e = makeEnv();
    await tick();
    const r = await e.send({ action: 'refresh' });
    assert.strictEqual(r.gemini, null);
    assert.strictEqual(r.grok, null);
    assert.ok(r.claude && !r.claude.error, 'Claude fonctionne comme avant');
    assert.ok(!e.calls.some(u => u.includes('gemini.google.com') || u.includes('grok.com')));
  });

  await test("activation : jetons lus dans la page, appel batchexecute, resultat memorise, badge", async () => {
    const e = makeEnv({ perms: ['https://gemini.google.com/*'] });
    await tick();
    const r = await e.send({ action: 'enableExtra', provider: 'gemini' });
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.plan, 'Plus');
    assert.strictEqual(Math.round(r.data.windows[0].utilization), 62);
    assert.strictEqual(e.mem.geminiEnabled, true);
    assert.ok(e.mem.geminiUsage && e.mem.geminiLastUpdate);
    assert.ok(e.session.geminiTokens, 'jetons gardes en session');
    assert.strictEqual(e.badge.text, '62', 'badge = maximum (Gemini 62 > Claude 37)');
  });

  await test("le 2e rafraichissement automatique (< 3 min) ne rappelle pas Gemini ; le bouton actualiser si", async () => {
    const e = makeEnv({ perms: ['https://gemini.google.com/*'] });
    await tick();
    await e.send({ action: 'enableExtra', provider: 'gemini' });
    const count = () => e.calls.filter(u => u.includes('batchexecute')).length;
    const before = count();
    await e.ctx.fetchAll(false);
    assert.strictEqual(count(), before, 'pas de nouvel appel');
    await e.send({ action: 'refresh' });
    assert.strictEqual(count(), before + 1, 'appel force par le bouton');
    assert.strictEqual(e.calls.filter(u => u === 'https://gemini.google.com/usage').length, 1, 'la page (800 Ko) n est telechargee qu une fois');
  });

  await test('Gemini deconnecte : NOT_LOGGED_IN (redirection vers accounts.google.com), pas de faux 0 %', async () => {
    const e = makeEnv({ perms: ['https://gemini.google.com/*'], geminiLoggedIn: false });
    await tick();
    const r = await e.send({ action: 'enableExtra', provider: 'gemini' });
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.needsLogin, true);
    assert.ok(!e.mem.geminiUsage);
  });

  await test('Grok : nominal, deconnecte, et compteur absent = erreur « indisponible »', async () => {
    let e = makeEnv({ perms: ['https://grok.com/*'] });
    await tick();
    let r = await e.send({ action: 'enableExtra', provider: 'grok' });
    assert.strictEqual(r.success, true);
    assert.strictEqual(Math.round(r.data.windows[0].utilization), 25);

    e = makeEnv({ perms: ['https://grok.com/*'], grok: 'unauth' });
    await tick();
    r = await e.send({ action: 'enableExtra', provider: 'grok' });
    assert.strictEqual(r.needsLogin, true);

    e = makeEnv({ perms: ['https://grok.com/*'], grok: 'nodata' });
    await tick();
    r = await e.send({ action: 'enableExtra', provider: 'grok' });
    assert.strictEqual(r.success, false);
    assert.ok(!e.mem.grokUsage, 'aucune valeur ecrite quand le compteur manque');
  });

  await test('desactivation : donnees effacees, badge remis en automatique', async () => {
    const e = makeEnv({ perms: ['https://gemini.google.com/*'] });
    await tick();
    await e.send({ action: 'enableExtra', provider: 'gemini' });
    await e.send({ action: 'setBadgeProvider', provider: 'gemini' });
    await e.send({ action: 'disableExtra', provider: 'gemini' });
    assert.strictEqual(e.mem.geminiEnabled, false);
    assert.ok(!e.mem.geminiUsage);
    assert.strictEqual(e.mem.badgeProvider, 'auto');
  });

  await test('activee mais autorisation retiree : Gemini est ignore silencieusement', async () => {
    const e = makeEnv({ perms: ['https://gemini.google.com/*'] });
    await tick();
    await e.send({ action: 'enableExtra', provider: 'gemini' });
    e.perms.clear();
    const r = await e.send({ action: 'refresh' });
    assert.strictEqual(r.gemini, null);
  });

  console.log(`\n${n} tests passes`);
})().catch((err) => { console.error(err); process.exit(1); });
