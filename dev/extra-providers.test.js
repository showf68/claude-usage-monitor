// Tests des analyseurs Gemini / Grok (sans reseau, sans paquet) :  node dev/extra-providers.test.js
// Les deux reponses Gemini sont des CAPTURES REELLES de la page « Limites d'utilisation » (16/10/2026, compte Plus).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const code = fs.readFileSync(path.join(__dirname, '..', 'extra-providers.js'), 'utf8');
const api = new Function(code + '\nreturn { parseBatchPayload, parseGeminiUsage, parseGrokRateLimits };')();

const captureA = ")]}'\n\n233\n[[\"wrb.fr\",\"jSf9Qc\",\"[4,[[2,0,4,null,null,[[1792141774,265477000],2]],[1200,0,1,[[1792141774,265477000]]],[24192,0,2,[[1792451374,265616000]]]],false]\",null,null,null,\"generic\"],[\"di\",141],[\"af.httprm\",140,\"3912814363658875192\",1]]\n25\n[[\"e\",4,null,null,269]]\n";
const captureB = ")]}'\n\n234\n[[\"wrb.fr\",\"jSf9Qc\",\"[4,[[1200,0,1,[[1792141774,265477000]]],[2,0,4,null,null,[[1792141774,265477000],2]],[24192,0,2,[[1792451374,265616000]]]],false]\",null,null,null,\"generic\"],[\"di\",194],[\"af.httprm\",194,\"-7445975105853626643\",1]]\n25\n[[\"e\",4,null,null,270]]\n";

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

test('capture reelle : actuel + hebdomadaire avec leurs heures de remise a zero', () => {
  const r = api.parseGeminiUsage(captureA);
  assert.strictEqual(r.plan, 'Plus');
  assert.deepStrictEqual(r.windows.map(w => w.key), ['gemini_current', 'gemini_weekly']);
  assert.strictEqual(r.windows[0].utilization, 0);
  assert.strictEqual(r.windows[0].resets_at, new Date(1792141774000).toISOString());
  assert.strictEqual(r.windows[1].resets_at, new Date(1792451374000).toISOString());
  assert.strictEqual(r.windows[1].window_ms, 7 * 24 * 3600 * 1000);
});

test("l'ordre des entrees ne change rien", () => {
  assert.deepStrictEqual(api.parseGeminiUsage(captureA), api.parseGeminiUsage(captureB));
});

test('le champ « utilise » est une fraction convertie en pourcent', () => {
  const r = api.parseGeminiUsage(captureA.replace('[1200,0,1,', '[1200,0.37,1,').replace('[24192,0,2,', '[24192,0.5,2,'));
  assert.ok(Math.abs(r.windows[0].utilization - 37) < 1e-9);
  assert.ok(Math.abs(r.windows[1].utilization - 50) < 1e-9);
});

test('types inconnus ignores ; formules Pro / Ultra ; formule inconnue sans libelle', () => {
  const only4 = '[["wrb.fr","jSf9Qc","[9,[[2,0,4,null,null,[[1792141774,265477000],2]]],false]",null,null,null,"generic"]]';
  assert.strictEqual(api.parseGeminiUsage(only4), null);
  assert.strictEqual(api.parseGeminiUsage(captureA.replace('"[4,[[2,0,4', '"[2,[[2,0,4')).plan, 'Pro');
  assert.strictEqual(api.parseGeminiUsage(captureA.replace('"[4,[[2,0,4', '"[6,[[2,0,4')).plan, 'Ultra');
  assert.strictEqual(api.parseGeminiUsage(captureA.replace('"[4,[[2,0,4', '"[99,[[2,0,4')).plan, null);
});

test('erreurs et bruit : null, jamais un faux 0 %', () => {
  for (const bad of ['', '<html>Sign in</html>', ")]}'\n\n[[\"er\",null,null,null,null,400,[]]]", '[["wrb.fr","jSf9Qc",null,null,null,null,"generic"]]', '[["wrb.fr","AUTRE","[1]",null]]', null, undefined]) {
    assert.strictEqual(api.parseGeminiUsage(bad), null);
  }
});

test('Grok : fenetre de 2 h nominale', () => {
  const r = api.parseGrokRateLimits('{"remainingQueries":30,"totalQueries":40,"windowSizeSeconds":7200}', 1e12);
  assert.strictEqual(r.windows.length, 1);
  assert.strictEqual(r.windows[0].key, 'grok_queries');
  assert.strictEqual(r.windows[0].utilization, 25);
  assert.strictEqual(r.windows[0].window_ms, 7200000);
  assert.strictEqual(r.windows[0].resets_at, null);
});

test("Grok : quota epuise = 100 % + heure d'attente ; modes d'effort en plus", () => {
  const r = api.parseGrokRateLimits('{"remainingQueries":0,"totalQueries":40,"windowSizeSeconds":7200,"waitTimeSeconds":900,"highEffortRateLimits":{"remainingQueries":1,"totalQueries":4},"lowEffortRateLimits":{"remainingQueries":20,"totalQueries":20}}', 1e12);
  assert.deepStrictEqual(r.windows.map(w => w.key), ['grok_queries', 'grok_high', 'grok_low']);
  assert.strictEqual(r.windows[0].utilization, 100);
  assert.strictEqual(r.windows[0].resets_at, new Date(1e12 + 900000).toISOString());
  assert.strictEqual(r.windows[1].utilization, 75);
  assert.strictEqual(r.windows[2].utilization, 0);
});

test('Grok : compteur absent = indisponible (null), pas 0 %', () => {
  for (const bad of ['{"windowSizeSeconds":7200}', '{"totalQueries":40}', '{"remainingQueries":3}', '{"remainingQueries":0,"totalQueries":0}',
    '{"code":16,"message":"No credentials presented. [WKE=unauthenticated:no-credentials]"}', '<html>', '']) {
    assert.strictEqual(api.parseGrokRateLimits(bad, 1e12), null);
  }
});

console.log(`\n${n} tests passes`);
