/*
  SOS Apollo · arrival ritual (001-design)
  ─────────────────────────────────────────
  • Starts BLACK — never a white flash (the old "forceGlobalWhite" painted #000 anyway).
  • A small breathing glow is the first thing on screen. When the person comes from
    the gateway ("Preciso de ajuda agora"), the gateway ends on the very same glow,
    so the two pages feel like one continuous breath (sessionStorage 'sos-arrival').
  • The messages are unchanged (content is clinical territory). Only pacing changed:
    shorter silences, and people who already saw the ritual in this session get
    just the first line.
  • Help is never blocked: "toque para entrar" fades in after a few seconds, and
    188 / 192 are live tel: links for the whole ritual.
  • Contract kept: html.preloading while running, 'preloader:revealed' when done.
*/
(function () {
  var ROOT = document.documentElement;
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var TEXT_IN_MS = REDUCE ? 400 : 1500;
  var TEXT_OUT_MS = REDUCE ? 300 : 1200;
  var FADE_OUT_MS = REDUCE ? 400 : 1800;
  var HINT_AFTER_MS = 2600;
  var APP_THEME = '#060508';

  var fromGateway = false;
  var seenIntro = false;
  try {
    var arrival = JSON.parse(sessionStorage.getItem('sos-arrival') || 'null');
    fromGateway = !!(arrival && arrival.to === 'help' && Date.now() - arrival.at < 15000);
    sessionStorage.removeItem('sos-arrival');
    seenIntro = sessionStorage.getItem('sos-seen-intro') === '1';
  } catch (_) {}

  function setMeta(name, content) {
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
    el.content = content;
  }

  function holdNight() {
    ROOT.classList.add('preloading');
    setMeta('theme-color', '#000000');
    ROOT.style.setProperty('background-color', '#000', 'important');
    ROOT.style.setProperty('color-scheme', 'dark', 'important');
  }

  function releaseNight() {
    ROOT.classList.remove('preloading');
    ROOT.style.removeProperty('background-color');
    ROOT.style.removeProperty('color-scheme');
    setMeta('theme-color', APP_THEME);
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  }

  function injectStyles() {
    if (document.getElementById('pl-styles')) return;
    var css = document.createElement('style');
    css.id = 'pl-styles';
    css.textContent = [
      'html.preloading, html.preloading body { background-color:#000 !important; color-scheme:dark !important; }',
      'html.preloading body > :not(#preloader) { visibility:hidden !important; }',
      '#preloader { position:fixed; inset:0; z-index:999999; display:flex; align-items:center; justify-content:center;',
      '  background:#000; opacity:1; cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation;',
      '  transition:opacity ' + FADE_OUT_MS + 'ms ' + EASE + '; }',
      /* the glow — same size/colour the gateway ends on */
      '#pl-glow { position:absolute; left:50%; top:50%; width:min(46vmin,260px); aspect-ratio:1; translate:-50% -50%;',
      '  border-radius:50%; pointer-events:none;',
      '  background:radial-gradient(circle, rgba(232,195,166,.22) 0%, rgba(179,162,220,.12) 38%, transparent 70%);',
      '  filter:blur(8px); opacity:0; transition:opacity 1.6s ' + EASE + ', scale 2.2s ' + EASE + ';',
      '  animation:pl-breathe 8s ease-in-out infinite; }',
      '#pl-glow.is-on { opacity:1; }',
      '#pl-glow.is-dim { opacity:.45; }',
      '#pl-glow.is-open { scale:3.2; opacity:0; }',
      '@keyframes pl-breathe { 0%,100% { transform:scale(.86); } 50% { transform:scale(1.08); } }',
      '.pl-tit { position:relative; z-index:1; font-family:"Bricolage Grotesque","Space Grotesk",system-ui,sans-serif;',
      '  font-size:clamp(1.55rem,6.4vw,3.6rem); font-weight:300; text-align:center; max-width:88%; padding:0 1rem; line-height:1.4;',
      '  letter-spacing:-.02em; opacity:0; transform:translateY(10px); color:rgba(240,234,244,.66); pointer-events:none;',
      '  -webkit-user-select:none; user-select:none; text-wrap:balance; }',
      '.pl-tit b { font-weight:500; color:rgba(240,234,244,.84); }',
      '.pl-tit em { font-size:75%; opacity:.6; }',
      '.pl-foot { position:absolute; left:0; right:0; bottom:calc(env(safe-area-inset-bottom,0px) + 18px); z-index:2;',
      '  display:grid; justify-items:center; gap:14px; font-family:"Space Grotesk",system-ui,sans-serif; }',
      '.pl-hint { font-size:13px; letter-spacing:.06em; color:rgba(214,210,222,.62); opacity:0;',
      '  transition:opacity 1.4s ' + EASE + '; }',
      '.pl-hint.is-on { opacity:1; }',
      '.pl-sos { display:flex; gap:18px; font-size:12px; }',
      '.pl-sos a { color:rgba(214,210,222,.55); text-decoration:none; min-height:32px; display:inline-flex; align-items:center; gap:6px; padding:0 6px; }',
      '.pl-sos a b { color:rgba(214,210,222,.78); font-weight:500; }',
      '@media (prefers-reduced-motion: reduce) { #pl-glow { animation:none; } .pl-tit { transform:none !important; } }'
    ].join('\n');
    document.head.appendChild(css);
  }

  function mount() {
    var pre = document.getElementById('preloader');
    if (pre) return { pre: pre, tit: pre.querySelector('.pl-tit'), glow: pre.querySelector('#pl-glow'), hint: pre.querySelector('.pl-hint') };
    pre = document.createElement('div');
    pre.id = 'preloader';
    pre.setAttribute('role', 'dialog');
    pre.setAttribute('aria-label', 'Chegando no espaço seguro. Toque para entrar.');
    pre.innerHTML =
      '<div id="pl-glow" aria-hidden="true"></div>' +
      '<div class="pl-tit" aria-live="polite"></div>' +
      '<div class="pl-foot">' +
        '<span class="pl-hint">toque para entrar</span>' +
        '<nav class="pl-sos" aria-label="Ajuda por telefone">' +
          '<a href="tel:188"><b>188</b> falar com alguém</a>' +
          '<a href="tel:192"><b>192</b> SAMU</a>' +
        '</nav>' +
      '</div>';
    document.body.appendChild(pre);
    /* tapping a phone link must dial, not skip the ritual */
    pre.querySelectorAll('.pl-sos a').forEach(function (a) {
      a.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    });
    return { pre: pre, tit: pre.querySelector('.pl-tit'), glow: pre.querySelector('#pl-glow'), hint: pre.querySelector('.pl-hint') };
  }

  function skipController(pre) {
    var wake = null;
    function onPointer() { if (wake) wake(); }
    pre.addEventListener('pointerdown', onPointer, { passive: true });
    document.addEventListener('keydown', onKey);
    function onKey(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onPointer(); }
    return {
      wait: function (ms) {
        return new Promise(function (resolve) {
          var id = setTimeout(function () { wake = null; resolve(false); }, ms);
          wake = function () { clearTimeout(id); wake = null; resolve(true); };
        });
      },
      dispose: function () {
        pre.removeEventListener('pointerdown', onPointer);
        document.removeEventListener('keydown', onKey);
        wake = null;
      }
    };
  }

  function visible(tit) { return parseFloat(getComputedStyle(tit).opacity) > 0.02; }

  function preload(href, as) {
    try {
      var l = document.createElement('link');
      l.rel = 'preload'; l.href = href; if (as) l.as = as;
      if (as === 'fetch') l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    } catch (_) {}
  }

  function present(tit, html, skip) {
    tit.innerHTML = html;
    tit.style.transition = 'opacity ' + TEXT_IN_MS + 'ms ' + EASE + ', transform ' + TEXT_IN_MS + 'ms ' + EASE;
    tit.style.opacity = '0';
    tit.style.transform = 'translateY(10px)';
    return skip.wait(32).then(function (s) {
      if (s) return true;
      tit.style.opacity = '1';
      tit.style.transform = 'translateY(0)';
      return skip.wait(TEXT_IN_MS);
    });
  }

  function hide(tit, skip) {
    if (!visible(tit)) { tit.style.opacity = '0'; return Promise.resolve(false); }
    tit.style.transition = 'opacity ' + TEXT_OUT_MS + 'ms ' + EASE + ', transform ' + TEXT_OUT_MS + 'ms ' + EASE;
    tit.style.opacity = '0';
    tit.style.transform = 'translateY(-6px)';
    return skip.wait(TEXT_OUT_MS);
  }

  function exit(parts, skip) {
    parts.tit.innerHTML = '';
    parts.tit.style.opacity = '0';
    skip.dispose();
    try { sessionStorage.setItem('sos-seen-intro', '1'); } catch (_) {}
    releaseNight();
    /* the glow opens up and becomes the room — the orb takes over from here */
    parts.glow.classList.add('is-open');
    parts.pre.style.opacity = '0';
    return new Promise(function (r) { setTimeout(r, FADE_OUT_MS); }).then(function () {
      parts.pre.remove();
      window.dispatchEvent(new CustomEvent('preloader:revealed'));
    });
  }

  /* Messages are verbatim from the original ritual. Silences are shorter. */
  var FULL = [
    { t: '<b>você não está só</b>', hold: 4800 },
    { t: '', hold: 900 },
    { t: '<b>um momento</b> pontual,<br>não define seu <b>destino final</b>', hold: 4900 },
    { t: '', hold: 700 },
    { t: 'esse mundo só é melhor <b>com você nele, aqui, e agora</b>..', hold: 6000 },
    { t: '', hold: 1200 },
    { t: '<span style="display:block;font-size:2.4em;font-weight:400;line-height:.9;margin-bottom:.2em">Respire..</span>tem muita vida que ainda não aconteceu', hold: 4500 },
    { t: '', hold: 900 },
    { t: '<span style="font-size:62%"><i class="ri-lock-fill" style="font-size:2.6rem;opacity:.7"></i><br>Espaço protegido e anônimo</span><br><span style="font-size:42%;opacity:.5">Não guardamos suas informações aqui</span>', hold: 5200 },
    { t: '', hold: 700 }
  ];
  /* Returning in the same session: one line, then straight in. */
  var SHORT = [
    { t: '<b>você não está só</b>', hold: 2400 },
    { t: '', hold: 300 }
  ];

  async function run() {
    holdNight();
    var parts = mount();
    var skip = skipController(parts.pre);

    preload('./style.css?v=001-abraco', 'style');
    preload('./isos.html?v=001', 'fetch');

    /* Glow first. From the gateway it is already "on" — same breath, new page. */
    if (fromGateway) {
      parts.glow.style.transition = 'none';
      parts.glow.classList.add('is-on');
      void parts.glow.offsetWidth;
      parts.glow.style.transition = '';
    } else {
      requestAnimationFrame(function () { parts.glow.classList.add('is-on'); });
    }
    setTimeout(function () { if (parts.hint) parts.hint.classList.add('is-on'); }, seenIntro ? 600 : HINT_AFTER_MS);

    if (await skip.wait(fromGateway ? 500 : 900)) return exit(parts, skip);
    parts.glow.classList.add('is-dim');

    var seq = seenIntro ? SHORT : FULL;
    for (var i = 0; i < seq.length; i++) {
      var s = seq[i];
      var skipped;
      if (s.t) {
        skipped = (await present(parts.tit, s.t, skip)) || (await skip.wait(s.hold));
        if (skipped) {
          if (visible(parts.tit)) await hide(parts.tit, { wait: function (ms) { return new Promise(function (r) { setTimeout(function () { r(false); }, Math.min(ms, 500)); }); } });
          return exit(parts, skip);
        }
        await hide(parts.tit, skip);
      } else {
        parts.tit.style.opacity = '0';
        if (await skip.wait(s.hold)) return exit(parts, skip);
      }
    }
    return exit(parts, skip);
  }

  function start() {
    if (!document.body) { setTimeout(start, 16); return; }
    run().catch(function () {
      releaseNight();
      var p = document.getElementById('preloader');
      if (p) p.remove();
      window.dispatchEvent(new CustomEvent('preloader:revealed'));
    });
  }

  injectStyles();
  holdNight();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
