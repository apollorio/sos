/*
  SOS Apollo · tiles journal — what the Relatório and the Modo Médico read when the app runs as tiles (no engine).
  Records only what this page observed (L01): the app was opened, a tile was opened, an option was tapped,
  a task was marked done, a phone / WhatsApp / SMS link was tapped, and the flow's own attention level.
  Flow ids and the app's own copy only: this page has no text input, nothing typed is ever stored, no phone
  numbers except the public services (192, 193, 190, 188). Same device, same retention as the engine (12 h),
  never sent anywhere. Read by _system/src/report/tiles.ts (key + channel names must match).
*/
(() => {
  const KEY = 'sos_tiles_journal';
  const CHANNEL = 'sos-apollo-tiles';
  const TTL_MS = 12 * 60 * 60 * 1000;
  const MAX_EVENTS = 400;
  const SERVICES = { '192': 1, '193': 1, '190': 1, '188': 1 };
  const W = window, D = document;
  let ping = null;
  try { ping = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null; } catch (_) {}

  const clean = s => String(s == null ? '' : s).replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);

  function load(now) {
    try {
      const j = JSON.parse(W.localStorage.getItem(KEY) || 'null');
      if (j && j.v === 1 && Array.isArray(j.events) && typeof j.lastAt === 'number' && now - j.lastAt <= TTL_MS) return j;
      W.localStorage.removeItem(KEY);
    } catch (_) {}
    return null;
  }

  function save(j) {
    try { W.localStorage.setItem(KEY, JSON.stringify(j)); } catch (_) { return; }
    try { if (ping) ping.postMessage({ v: 1 }); } catch (_) {}
  }

  function add(k, p) {
    const now = Date.now();
    let j = load(now);
    if (!j) {
      j = { v: 1, id: 'tiles-' + now.toString(36), startedAt: now, lastAt: now, seq: 0, events: [] };
      j.events.push({ s: ++j.seq, at: now, k: 'start' });
      if (k === 'start' || k === 'open') { save(j); return; }
    }
    if (k !== 'start') {
      const e = { s: ++j.seq, at: now, k: k };
      if (p) {
        if (p.f) e.f = String(p.f).slice(0, 32);
        if (p.t) e.t = clean(p.t);
        if (p.ch) e.ch = String(p.ch).slice(0, 16);
        if (p.to) e.to = String(p.to).slice(0, 16);
        if (p.lvl) e.lvl = String(p.lvl).slice(0, 16);
      }
      j.events.push(e);
      if (j.events.length > MAX_EVENTS) j.events.splice(1, j.events.length - MAX_EVENTS);
    }
    j.lastAt = now;
    save(j);
  }

  W.SOSJournal = { add: add };

  /* Taps on real links anywhere on the page (menu, 188/192 strip, flow sheet). A tap is a tap, not a call. */
  D.addEventListener('click', e => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/^tel:/i.test(href)) {
      const n = href.slice(4).replace(/\D/g, '');
      add('tap', { ch: 'tel', to: SERVICES[n] ? n : 'outro' });
    } else if (/^sms:/i.test(href)) add('tap', { ch: 'sms', to: 'contato' });
    else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) add('tap', { ch: 'whatsapp', to: 'contato' });
  }, true);

  /* Entering the app (after «toque para entrar») starts or resumes the episode. */
  const enter = () => add(load(Date.now()) ? 'open' : 'start');
  if (D.documentElement.classList.contains('preloading')) W.addEventListener('preloader:revealed', enter, { once: true });
  else if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', enter, { once: true });
  else enter();
})();
