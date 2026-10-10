/*
  SOS Apollo · CardNav + discreet controls (menu burger, text size, sound, volume).
  Port of the Apollo DS NavCards (GSAP height + staggered cards, CSS fallback).
  Text size and volume are per-device conveniences in localStorage; nothing
  about the person or the crisis is stored here. The elapsed counter lives in memory only.
*/
(() => {
  const W = window, D = document;
  const $ = s => D.querySelector(s);
  const REDUCE = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const G = () => (!REDUCE && W.gsap ? W.gsap : null);
  const store = {
    get(k) { try { return W.localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { W.localStorage.setItem(k, v); } catch (_) {} }
  };
  const openedAt = Date.now();

  /* ── NAV · CardNav — Apollo DS NavCards (GSAP height + stagger, CSS fallback).
     SOS extras: .nav-controls ride the same stagger; menu-overlay / is-menu-open; viewport clamp. ── */
  function NavCards(nav, burger, content) {
    if (!nav || !burger || !content) return null;
    var isOpen = false;
    var cards = Array.from(content.querySelectorAll('.nav-card, .nav-controls'));
    var BAR = 56;
    function target() {
      // DS mobile measure (stacked cards) + SOS clamp so short phones scroll inside #navContent.
      var prev = content.style.cssText;
      content.style.cssText = 'visibility:hidden;position:static;height:auto';
      var hgt = BAR + content.scrollHeight + 4;
      content.style.cssText = prev;
      return Math.min(hgt, W.innerHeight - Math.max(0, nav.getBoundingClientRect().top) - 12);
    }
    function ui(v) {
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      burger.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
      content.setAttribute('aria-hidden', v ? 'false' : 'true');
      content.inert = !v;
      const home = D.getElementById('app-main');
      if (home) home.inert = v;
      if (!v) clearTimeout(elapsedTimer);
      D.body.classList.toggle('is-menu-open', v);
      var scrim = D.getElementById('menu-overlay');
      if (scrim) scrim.setAttribute('aria-hidden', v ? 'false' : 'true');
    }
    function set(v) {
      if (v === isOpen) return;
      if (!v && content.contains(D.activeElement)) burger.focus({ preventScroll: true });
      isOpen = v; ui(v);
      if (v) tickElapsed();
      var g = G();
      if (g) {
        nav.setAttribute('data-engine', 'gsap');
        g.killTweensOf([nav].concat(cards));
        if (v) {
          nav.classList.add('card-nav--open');
          g.to(nav, { height: target(), duration: .5, ease: 'back.out(1.3)' });
          g.fromTo(cards, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, ease: 'back.out(1.3)', stagger: .08, delay: .1 });
        } else {
          g.to(cards, { y: 24, autoAlpha: 0, duration: .2, ease: 'power2.in', stagger: -.04 });
          g.to(nav, { height: BAR, duration: .4, ease: 'power3.inOut', delay: .1, onComplete: function () {
            if (!isOpen) nav.classList.remove('card-nav--open');
          } });
        }
        return;
      }
      nav.removeAttribute('data-engine');
      cards.forEach(function (c, i) {
        c.style.transitionDelay = (v && !REDUCE) ? (.12 + i * .07) + 's' : '0s';
      });
      nav.classList.toggle('card-nav--open', v);
      nav.style.height = (v ? target() : BAR) + 'px';
    }
    burger.addEventListener('click', function () { set(!isOpen); });
    content.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    D.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { set(false); burger.focus(); }
      if (e.key !== 'Tab' || !isOpen) return;
      const controls = Array.from(nav.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled)')).filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    D.addEventListener('pointerdown', function (e) {
      if (isOpen && !nav.contains(e.target)) set(false);
    });
    W.addEventListener('resize', function () { if (isOpen) nav.style.height = target() + 'px'; });
    return { set: set, isOpen: function () { return isOpen; }, refit: function () { if (isOpen) nav.style.height = target() + 'px'; } };
  }

  /* ── Elapsed since the app was opened: [00h00m00s], ticks only while the menu is open ── */
  const elapsedEl = $('#nav-elapsed');
  const pad = n => String(n).padStart(2, '0');
  let elapsedTimer = 0;
  function tickElapsed() {
    if (!elapsedEl) return;
    clearTimeout(elapsedTimer);
    const s = Math.floor((Date.now() - openedAt) / 1000);
    elapsedEl.textContent = '[' + pad(Math.floor(s / 3600)) + 'h' + pad(Math.floor(s / 60) % 60) + 'm' + pad(s % 60) + 's]';
    if (D.body.classList.contains('is-menu-open')) elapsedTimer = setTimeout(tickElapsed, 1000);
  }

  /* ── Text size: core --fs-r. UI 100% = abs 1.2 (old liked 120%). Steps are relative. ── */
  const FS_BASE = 1.2;
  const FS_STEPS = [0.85, 1, 1.1, 1.2, 1.3, 1.4];
  const FS_KEY = 'sos_font_scale';
  const FS_VER_KEY = 'sos_font_scale_v';
  const APOLLO_FS_KEY = 'apollo-fs-pref';

  function nearestFsIndex(rel) {
    var best = 1, bestD = Infinity;
    for (var i = 0; i < FS_STEPS.length; i++) {
      var d = Math.abs(FS_STEPS[i] - rel);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function resolveFsIndex() {
    var ver = store.get(FS_VER_KEY);
    var raw = parseFloat(store.get(FS_KEY));
    if (ver === '2' && isFinite(raw)) {
      var exact = FS_STEPS.indexOf(raw);
      if (exact >= 0) return exact;
      return nearestFsIndex(raw);
    }
    /* v1 → v2: sos_font_scale was absolute (0.9…1.4); keep visual size → relative = abs/BASE */
    if (isFinite(raw) && raw > 0) return nearestFsIndex(raw / FS_BASE);
    try {
      var abs = parseFloat(W.localStorage.getItem(APOLLO_FS_KEY));
      if (isFinite(abs) && abs > 0) return nearestFsIndex(abs / FS_BASE);
    } catch (_) {}
    return FS_STEPS.indexOf(1);
  }

  let fsIndex = resolveFsIndex();

  function applyFont(nav) {
    var rel = FS_STEPS[fsIndex];
    var abs = +(FS_BASE * rel).toFixed(4);
    D.documentElement.style.setProperty('--fs-r', String(abs));
    var read = $('#fs-read');
    if (read) read.textContent = Math.round(rel * 100) + '%';
    var down = $('#fs-down'), up = $('#fs-up');
    if (down) down.disabled = fsIndex === 0;
    if (up) up.disabled = fsIndex === FS_STEPS.length - 1;
    store.set(FS_KEY, String(rel));
    store.set(FS_VER_KEY, '2');
    try { W.localStorage.setItem(APOLLO_FS_KEY, String(abs)); } catch (_) {}
    if (nav) requestAnimationFrame(function () { nav.refit(); });
  }

  /* ── Volume: SOS.userVolume is the fade target in script.js ── */
  const VOL_KEY = 'sos_volume';
  function setupVolume() {
    const range = $('#nav-vol'), audio = $('#relaxAudio');
    if (!range) return;
    const saved = parseFloat(store.get(VOL_KEY));
    const init = isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.95;
    range.value = String(Math.round(init * 100));
    const paint = () => range.style.setProperty('--vol', range.value + '%');
    const apply = () => {
      const v = Math.min(1, Math.max(0, Number(range.value) / 100));
      if (W.SOS) W.SOS.userVolume = v;
      range.setAttribute('aria-valuetext', Math.round(v * 100) + '%');
      paint();
      return v;
    };
    apply();
    range.addEventListener('input', () => {
      const v = apply();
      store.set(VOL_KEY, String(v));
      if (audio) {
        if (W.gsap) W.gsap.killTweensOf(audio, 'volume');
        audio.volume = v;
      }
      if (W.SOS && typeof W.SOS.onVolume === 'function') W.SOS.onVolume(v); // synthesized pad, when the file is unavailable
    });
  }

  function toast(msg) {
    if (W.SOS && typeof W.SOS.showToast === 'function') W.SOS.showToast(msg, 2200);
  }

  function boot() {
    const nav = NavCards($('#cardNav'), $('#burger'), $('#navContent'));
    if (W.SOS) W.SOS.closeMenu = () => { if (nav) nav.set(false); };
    applyFont(nav);
    const down = $('#fs-down'), up = $('#fs-up');
    if (down) down.addEventListener('click', () => { if (fsIndex > 0) { fsIndex--; applyFont(nav); } });
    if (up) up.addEventListener('click', () => { if (fsIndex < FS_STEPS.length - 1) { fsIndex++; applyFont(nav); } });
    setupVolume();
    D.querySelectorAll('.nav-card-link[data-soon]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      toast('em breve — por agora, 188 ou 192 estão a um toque');
    }));
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
