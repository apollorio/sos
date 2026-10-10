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

  /* ── NAV · CardNav ── */
  function NavCards(nav, burger, content) {
    if (!nav || !burger || !content) return null;
    let isOpen = false;
    const cards = Array.from(content.querySelectorAll('.nav-card, .nav-controls'));
    const BAR = 56;
    function natural() {
      const prev = content.style.cssText;
      content.style.cssText = 'visibility:hidden;position:static;height:auto;overflow:visible';
      const h = BAR + content.scrollHeight + 4;
      content.style.cssText = prev;
      return h;
    }
    function cap(h) {
      const top = nav.getBoundingClientRect().top;
      return Math.min(h, W.innerHeight - Math.max(0, top) - 12);
    }
    function target() { return cap(natural()); }
    /* a tree folding by `delta` px: the bar glides with it, same duration as the fold */
    function glideBy(delta, dur) {
      if (!isOpen) return;
      const h = cap(natural() + delta), g = G();
      if (g) g.to(nav, { height: h, duration: dur, ease: 'power3.out', overwrite: 'auto' });
      else nav.style.height = h + 'px';
    }
    function ui(v) {
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      burger.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
      content.setAttribute('aria-hidden', v ? 'false' : 'true');
      D.body.classList.toggle('is-menu-open', v);
    }
    function set(v) {
      if (v === isOpen) return;
      isOpen = v; ui(v);
      if (v) tickElapsed();
      const g = G();
      if (g) {
        nav.setAttribute('data-engine', 'gsap');
        g.killTweensOf([nav].concat(cards));
        if (v) {
          nav.classList.add('card-nav--open');
          g.to(nav, { height: target(), duration: 0.5, ease: 'back.out(1.3)' });
          g.fromTo(cards, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.3)', stagger: 0.08, delay: 0.1 });
        } else {
          g.to(cards, { y: 24, autoAlpha: 0, duration: 0.2, ease: 'power2.in', stagger: -0.04 });
          g.to(nav, { height: BAR, duration: 0.4, ease: 'power3.inOut', delay: 0.1, onComplete: () => { if (!isOpen) nav.classList.remove('card-nav--open'); } });
        }
        return;
      }
      nav.removeAttribute('data-engine');
      cards.forEach((c, i) => { c.style.transitionDelay = v ? (0.12 + i * 0.07) + 's' : '0s'; });
      nav.classList.toggle('card-nav--open', v);
      nav.style.height = (v ? target() : BAR) + 'px';
    }
    burger.addEventListener('click', e => { e.stopPropagation(); set(!isOpen); });
    content.addEventListener('click', e => { const a = e.target.closest('a'); if (a && !a.hasAttribute('data-soon')) set(false); });
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) { set(false); burger.focus(); } });
    D.addEventListener('pointerdown', e => { if (isOpen && !nav.contains(e.target)) set(false); });
    W.addEventListener('resize', () => { if (isOpen) nav.style.height = target() + 'px'; });
    return { set, glideBy, isOpen: () => isOpen, refit: () => { if (isOpen) nav.style.height = target() + 'px'; } };
  }

  /* ── Branched tree (Apollo DS BranchedMenu port): the label folds its links;
     links grow from one trunk; the lit path (reach) runs trunk → leaf ── */
  const NS = 'http://www.w3.org/2000/svg';
  const trees = [];
  function Tree(card, navApi) {
    const head = card.querySelector('.nav-tree-head'), tree = card.querySelector('.nav-tree');
    if (!head || !tree) return;
    const items = Array.from(tree.querySelectorAll('.nav-card-link'));
    const active = Math.min(items.length - 1, Math.max(0, parseInt(tree.dataset.active, 10) || 0));
    let lit = active;
    const svg = D.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'nav-tree-lines');
    svg.setAttribute('aria-hidden', 'true');
    tree.insertBefore(svg, tree.firstChild);
    const X = 12, TRUNK = 4, R = 8;                 /* svg sits X px left of the tree; trunk at TRUNK */
    function draw() {
      const tr = tree.getBoundingClientRect();
      const z = parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--fs-scale')) || 1;
      const H = tr.height / z;
      if (!H) return;
      const indent = parseFloat(getComputedStyle(items[0]).paddingLeft) || 22;
      const endX = X + indent - 6;
      const ys = items.map(a => { const r = a.getBoundingClientRect(); return (r.top - tr.top + r.height / 2) / z; });
      svg.setAttribute('width', String(endX + 1));
      svg.setAttribute('height', String(H));
      let out = '<path class="nav-tree-base" d="M ' + TRUNK + ' 0 V ' + (ys[ys.length - 1] - R) + '"/>';
      const elbow = y => 'A ' + R + ' ' + R + ' 0 0 0 ' + (TRUNK + R) + ' ' + y + ' H ' + endX;
      ys.forEach(y => { out += '<path class="nav-tree-base" d="M ' + TRUNK + ' ' + (y - R) + ' ' + elbow(y) + '"/>'; });
      ys.forEach((y, k) => {
        const L = y - R + Math.PI * R / 2 + (endX - TRUNK - R);
        const tone = items[k].dataset.tone ? ' data-tone="' + items[k].dataset.tone + '"' : '';
        out += '<path class="nav-tree-reach"' + tone + ' data-k="' + k + '" d="M ' + TRUNK + ' 0 V ' + (y - R) + ' ' + elbow(y) + '" style="stroke-dasharray:' + L + ';stroke-dashoffset:' + L + '"/>';
      });
      svg.innerHTML = out;
      paint();
    }
    function paint() {
      svg.querySelectorAll('.nav-tree-reach').forEach(p => {
        p.style.strokeDashoffset = +p.getAttribute('data-k') === lit ? '0' : p.style.strokeDasharray;
      });
      items.forEach((a, k) => a.toggleAttribute('data-lit', k === lit));
    }
    function light(k) { if (k === lit) return; lit = k; paint(); }
    items.forEach((a, k) => {
      a.addEventListener('pointerenter', () => light(k));
      a.addEventListener('pointerdown', () => light(k));
      a.addEventListener('focus', () => light(k));
      a.addEventListener('pointerleave', () => light(active));
      a.addEventListener('blur', () => light(active));
    });
    head.addEventListener('click', () => {
      const open = !card.hasAttribute('data-open');
      const delta = tree.getBoundingClientRect().height;
      if (navApi) navApi.glideBy(open ? delta : -delta, 0.32);
      card.toggleAttribute('data-open', open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      items.forEach(a => { a.tabIndex = open ? 0 : -1; });
    });
    if ('ResizeObserver' in W) new ResizeObserver(draw).observe(tree);
    trees.push(draw);
    draw();
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

  /* ── Text size: scales reading surfaces via --fs-scale (see calm-app.css) ── */
  const FS_STEPS = [0.9, 1, 1.1, 1.2, 1.3, 1.4];
  const FS_KEY = 'sos_font_scale';
  let fsIndex = Math.max(0, FS_STEPS.indexOf(parseFloat(store.get(FS_KEY)) || 1));
  function applyFont(nav) {
    const v = FS_STEPS[fsIndex];
    D.documentElement.style.setProperty('--fs-scale', String(v));
    const read = $('#fs-read'); if (read) read.textContent = Math.round(v * 100) + '%';
    const down = $('#fs-down'), up = $('#fs-up');
    if (down) down.disabled = fsIndex === 0;
    if (up) up.disabled = fsIndex === FS_STEPS.length - 1;
    store.set(FS_KEY, String(v));
    if (nav) requestAnimationFrame(() => { nav.refit(); trees.forEach(draw => draw()); });
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
      if (audio && !audio.paused) {
        if (W.gsap) W.gsap.killTweensOf(audio, 'volume');
        audio.volume = v;
      }
    });
  }

  function toast(msg) {
    if (W.SOS && typeof W.SOS.showToast === 'function') W.SOS.showToast(msg, 2200);
  }

  function boot() {
    const nav = NavCards($('#cardNav'), $('#burger'), $('#navContent'));
    D.querySelectorAll('.nav-card--tree').forEach(card => Tree(card, nav));
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
