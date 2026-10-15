#!/usr/bin/env python3
"""
Apercu du popup SANS Chrome Web Store ni compte : charge popup-modern.html dans Chrome sans interface,
avec une fausse API `chrome.*` et des donnees de test, puis photographie la fenetre a sa taille reelle.

  python dev/preview.py                 # toutes les scenes -> dev/out/*.png + planche dev/out/sheet.png
  python dev/preview.py ok high         # certaines scenes
Scenes : ok high claude-only extra legacy expired both-error setup he settings
"""
import functools, http.server, io, json, os, re, subprocess, sys, threading, time

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dev", "out")
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
PORT = 8123

SCENES = ["ok", "high", "claude-only", "extra", "legacy", "expired", "both-error", "setup", "he", "settings"]

STUB = r"""
<script>
(function () {
  const q = new URLSearchParams(location.search);
  const scene = q.get('s') || 'ok';
  const now = Date.now();
  const iso = (min) => new Date(now + min * 60000).toISOString();
  const win = (key, used, hours, minutes) => ({ key, utilization: used, window_ms: hours * 3600000, resets_at: iso(minutes) });

  let claude = { five_hour: { utilization: 37, resets_at: iso(179) }, seven_day: { utilization: 24, resets_at: iso(3 * 1440 - 20) },
                 seven_day_sonnet: { utilization: 12, resets_at: iso(3 * 1440 - 20) }, plan: 'Max 20x', _source: 'cookie' };
  let codex = { windows: [win('primary_window', 71, 168, 5 * 1440 - 60), win('code_review', 5, 168, 5 * 1440 - 60)], plan: 'Plus', _source: 'cookie' };
  let codexDisabled = false, lang = 'en', authMode = 'cookie';

  if (scene === 'high') { claude.five_hour.utilization = 88; claude.seven_day.utilization = 97; delete claude.seven_day_sonnet; codex.windows[0].utilization = 100; }
  if (scene === 'claude-only') { codexDisabled = true; codex = undefined; delete claude.seven_day_sonnet; }
  if (scene === 'extra') { claude.seven_day_opus = { utilization: 71, resets_at: iso(2000) }; claude.extra_usage = { is_enabled: true, utilization: 24 };
                           codex.windows.unshift(win('primary_window_5h', 23, 5, 67)); }
  if (scene === 'legacy') { codex.windows = [win('primary_window', 23, 5, 67), win('secondary_window', 41, 168, 4000), win('code_review', 5, 168, 4000)]; delete claude.seven_day_sonnet; }
  if (scene === 'expired') { claude = { error: 'NOT_LOGGED_IN', needsLogin: true }; }
  if (scene === 'both-error') { claude = { error: 'NOT_LOGGED_IN', needsLogin: true }; codex = { error: 'NOT_LOGGED_IN', needsLogin: true }; }
  if (scene === 'setup') { claude = undefined; codex = undefined; authMode = undefined; }
  if (scene === 'he') { lang = 'he'; }

  const store = { usage: claude, codexUsage: codex, codexDisabled, language: lang, authMode, lastUpdate: now - 120000, badgeProvider: 'auto', alertsEnabled: true, resetAlerts: true };
  const pick = (keys) => { const out = {}; (Array.isArray(keys) ? keys : keys ? [keys] : Object.keys(store)).forEach(k => { if (store[k] !== undefined) out[k] = store[k]; }); return out; };

  const msgs = {};
  ['en', lang].forEach(l => { try { const x = new XMLHttpRequest(); x.open('GET', '/_locales/' + l + '/messages.json', false); x.send(); msgs[l] = JSON.parse(x.responseText); } catch (e) { msgs[l] = {}; } });
  window.chrome = {
    storage: { local: {
      get: (keys, cb) => { const r = pick(keys); if (cb) { cb(r); return; } return Promise.resolve(r); },
      set: () => Promise.resolve(), remove: (k, cb) => { if (cb) cb(); return Promise.resolve(); } } },
    runtime: {
      getURL: (p) => '/' + p, lastError: undefined,
      sendMessage: (m, cb) => { const r = m.action === 'refresh' ? { claude, codex } : m.action === 'checkCookies' ? { valid: !!(claude && !claude.error), organizations: [{ name: 'Personal' }] } : {}; if (cb) setTimeout(() => cb(r), 30); }
    },
    i18n: { getMessage: (k) => (msgs[lang] && msgs[lang][k] && msgs[lang][k].message) || (msgs.en[k] && msgs.en[k].message) || '' },
    tabs: { create: () => {} }
  };

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (q.get('settings') === '1') document.getElementById('tabSettings').click();
      setTimeout(() => { document.title = document.body.offsetWidth + 'x' + document.body.offsetHeight; }, 1500);
    }, 400);
  });
})();
</script>
"""


def harness():
    html = open(os.path.join(ROOT, "popup-modern.html"), encoding="utf-8").read()
    # Le vrai popup est dimensionne sur son contenu ; ici on force la racine en LTR pour que la mise en page RTL du <body> soit fidele
    html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8"><base href="/"><style>html{direction:ltr}</style>')
    html = html.replace('<link rel="stylesheet" href="popup.css">', '<link rel="stylesheet" href="/popup.css">')
    html = html.replace('<script src="popup-modern.js"></script>', STUB + '<script src="/popup-modern.js"></script>')
    path = os.path.join(ROOT, "dev", "harness.html")
    open(path, "w", encoding="utf-8").write(html)
    return path


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a, **k: None
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def chrome(*args):
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion", "--force-device-scale-factor=2", *args],
                       capture_output=True, timeout=60)
    r.out = (r.stdout or b"").decode("utf-8", "replace")
    return r


def measure(url):
    r = chrome("--window-size=1000,800", "--virtual-time-budget=6000", "--dump-dom", url)
    m = re.search(r"<title>(\d+)x(\d+)</title>", r.out)
    return (int(m.group(1)), int(m.group(2))) if m else (440, 140)


def shoot(scene):
    settings = "&settings=1" if scene == "settings" else ""
    s = "ok" if scene == "settings" else scene
    url = "http://127.0.0.1:%d/dev/harness.html?s=%s%s" % (PORT, s, settings)
    w, h = measure(url)
    png = os.path.join(OUT, scene + ".png")
    # Fenetre un peu plus haute que le popup (une fenetre de 64 px sans marge rend parfois une page vide), puis recadrage exact
    if scene == "he":
        # Chrome ancre un <body dir=rtl> a droite de la fenetre : on photographie large puis on recadre sur la largeur du popup
        chrome("--window-size=1000,%d" % (h + 40), "--virtual-time-budget=6000", "--screenshot=" + png, url)
        im = Image.open(png)
        im.crop((im.width - 2 * w, 0, im.width, 2 * h)).save(png)
    else:
        chrome("--window-size=%d,%d" % (w, h + 40), "--virtual-time-budget=6000", "--screenshot=" + png, url)
        im = Image.open(png)
        im.crop((0, 0, im.width, 2 * h)).save(png)
    return png, (w, h)


def font(size):
    for f in (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def sheet(items):
    ims = [(n, Image.open(p).convert("RGB")) for n, p in items]
    W = max(i.width for _, i in ims) + 40
    H = sum(i.height + 46 for _, i in ims) + 50
    img = Image.new("RGB", (W, H), (30, 30, 36))
    d = ImageDraw.Draw(img)
    d.text((20, 14), "AI Usage Monitor - popup sur une ligne", fill=(236, 233, 238), font=font(26))
    y = 56
    for name, im in ims:
        d.text((20, y), name, fill=(255, 200, 120), font=font(18))
        img.paste(im, (20, y + 30))
        y += im.height + 46
    path = os.path.join(OUT, "sheet.png")
    img.save(path)
    return path


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    scenes = sys.argv[1:] or SCENES
    harness()
    srv = serve()
    time.sleep(0.5)
    done = []
    for sc in scenes:
        png, size = shoot(sc)
        print("%-12s %s -> %s" % (sc, size, png))
        done.append((sc, png))
    print("sheet:", sheet(done))
    srv.shutdown()
