(function() {
  const ROOT = document.documentElement;
  const BG_FADE_MS = 2900;
  const TEXT_PRESENT_MS = 1500;
  const TEXT_HIDE_MS = 1400;
  const END_HOLD_MS = 1400;
  const FADE_OUT_MS = 3000;
  const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const APP_THEME = '#000000';

  function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  }

  function forceGlobalWhite() {
    ROOT.classList.remove('pl-dark');
    ROOT.classList.add('preloading');
    setMeta('theme-color', '#000000');
    setMeta('apple-mobile-web-app-status-bar-style', 'default');
    ROOT.style.setProperty('background-color', '#000000', 'important');
    ROOT.style.setProperty('color-scheme', 'dark', 'important');
    if (document.body) {
      document.body.style.setProperty('background-color', '#000000', 'important');
      document.body.style.setProperty('color-scheme', 'dark', 'important');
    }
  }

  function forceGlobalBlack() {
    ROOT.classList.add('pl-dark');
    setMeta('theme-color', '#000000');
    setMeta('apple-mobile-web-app-status-bar-style', 'black');
    ROOT.style.setProperty('background-color', '#000000', 'important');
    ROOT.style.setProperty('color-scheme', 'dark', 'important');
    if (document.body) {
      document.body.style.setProperty('background-color', '#000000', 'important');
      document.body.style.setProperty('color-scheme', 'dark', 'important');
    }
  }

  function releaseGlobalChrome() {
    ROOT.classList.remove('preloading', 'pl-dark');
    ROOT.style.removeProperty('background-color');
    ROOT.style.removeProperty('color-scheme');
    setMeta('theme-color', APP_THEME);
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    if (document.body) {
      document.body.style.removeProperty('background-color');
      document.body.style.removeProperty('color-scheme');
    }
  }

  function injectStyles() {
    if (document.getElementById('pl-styles')) return;
    const css = document.createElement('style');
    css.id = 'pl-styles';
    css.textContent = `
      html.preloading,
      html.preloading body {
        background-color: #000000 !important;
        color-scheme: light !important;
      }
      html.preloading.pl-dark,
      html.preloading.pl-dark body {
        background-color: #000000 !important;
        color-scheme: dark !important;
      }
      html.preloading body > :not(#preloader) { visibility: hidden !important; }
      #preloader {
        position: fixed; inset: 0; z-index: 999999;
        display: flex; align-items: center; justify-content: center;
        background-color: #000000 !important;
        opacity: 1;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition: background-color ${BG_FADE_MS}ms ${EASE}, opacity ${FADE_OUT_MS}ms ${EASE};
      }
      #preloader.pl-dark { background-color: #000000 !important; }
      .pl-tit {
        font-family: "Bricolage Grotesque", "Space Grotesk", system-ui, sans-serif;
        font-size: clamp(1.65rem, 7vw, 4.5rem) ;
        font-weight: 300;
        text-align: center;
        max-width: 88%;
        padding: 0 1rem;
        line-height: 1.45;
        opacity: 0;
        transform: translateY(14px);
        color: rgba(255, 255, 255, 0.65);
        transition: opacity ${TEXT_PRESENT_MS}ms ${EASE}, transform ${TEXT_PRESENT_MS}ms ${EASE};
        pointer-events: none;
-webkit-user-select: none !important;-moz-user-select: none!important; -ms-user-select: none!important; user-select: none!important; }
      .pl-tit b { font-weight: 600; color: rgba(255, 255, 255, 0.75);  }
      .pl-tit em { font-size: 75%; opacity: 0.55; }
    `;
    document.head.appendChild(css);
  }

  function mountPreloader() {
    let pre = document.getElementById('preloader');
    if (pre) return { pre, tit: pre.querySelector('.pl-tit') };
    pre = document.createElement('div');
    pre.id = 'preloader';
    const tit = document.createElement('div');
    tit.className = 'pl-tit';
    pre.appendChild(tit);
    document.body.appendChild(pre);
    return { pre, tit };
  }

  function createSkipController(pre) {
    let wake = null;
    const onPointer = () => { if (wake) wake(); };
    pre.addEventListener('pointerdown', onPointer, { passive: true });
    return {
      wait(ms) {
        return new Promise(resolve => {
          const id = setTimeout(() => {
            wake = null;
            resolve(false);
          }, ms);
          wake = () => {
            clearTimeout(id);
            wake = null;
            resolve(true);
          };
        });
      },
      dispose() {
        pre.removeEventListener('pointerdown', onPointer);
        wake = null;
      }
    };
  }

  function titIsVisible(tit) {
    return parseFloat(getComputedStyle(tit).opacity) > 0.02;
  }

  function preloadAsset(href, as) {
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      if (as) link.as = as;
      if (as === 'fetch') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch (_) {}
  }

  async function phaseWhiteToBlack(pre, skip) {
    forceGlobalWhite();
    pre.classList.remove('pl-dark');
    pre.style.backgroundColor = '#000000';
    pre.style.opacity = '1';
    await skip.wait(50);
    pre.style.transition = `background-color ${BG_FADE_MS}ms ${EASE}, opacity ${FADE_OUT_MS}ms ${EASE}`;
    forceGlobalBlack();
    pre.classList.add('pl-dark');
    pre.style.backgroundColor = '#000000';
    await skip.wait(BG_FADE_MS);
  }

  async function presentText(tit, html, skip) {
    tit.innerHTML = html;
    tit.style.transition = `opacity ${TEXT_PRESENT_MS}ms ${EASE}, transform ${TEXT_PRESENT_MS}ms ${EASE}`;
    tit.style.opacity = '0';
    tit.style.transform = 'translateY(14px)';
    if (await skip.wait(32)) return true;
    tit.style.opacity = '1';
    tit.style.transform = 'translateY(0)';
    if (await skip.wait(TEXT_PRESENT_MS)) return true;
    return false;
  }

  async function hideText(tit, skip) {
    if (!titIsVisible(tit)) {
      tit.style.opacity = '0';
      tit.style.transform = 'translateY(14px)';
      return false;
    }
    tit.style.transition = `opacity ${TEXT_HIDE_MS}ms ${EASE}, transform ${TEXT_HIDE_MS}ms ${EASE}`;
    tit.style.opacity = '0';
    tit.style.transform = 'translateY(14px)';
    return skip.wait(TEXT_HIDE_MS);
  }

  async function phaseFadeOut(pre, skip) {
    pre.style.opacity = '0';
    await skip.wait(FADE_OUT_MS);
  }

  function isLastContentStep(i, seq) {
    return i === seq.length - 1 || (seq[i].t && !seq.slice(i + 1).some(s => s.t));
  }

  async function exitPreloader(pre, tit, skip, withEndHold) {
    tit.innerHTML = '';
    tit.style.opacity = '0';
    if (withEndHold) await skip.wait(END_HOLD_MS);
    skip.dispose();
    releaseGlobalChrome();
    await phaseFadeOut(pre, skip);
    pre.remove();
    window.dispatchEvent(new CustomEvent('preloader:revealed'));
  }

  async function run() {
    forceGlobalWhite();
    const { pre, tit } = mountPreloader();
    const skip = createSkipController(pre);

    preloadAsset('./style.css', 'style');
    preloadAsset('./isos.html', 'fetch');
    preloadAsset('https://assets.apollo.rio.br/audio/clocks.flac', 'fetch');

    tit.style.opacity = '0';

    await phaseWhiteToBlack(pre, skip);

    const seq = [
      { t: '<b>você não está só</b>', hold: 4800 },
      { t: '', hold: 1500 },
      { t: '<b>um momento</b> pontual,<br>não define seu <b>destino final</b>', hold: 4900 },
      { t: '', hold: 1000 },
      { t: 'esse mundo só é melhor <b>com você nele, aqui, e agora</b>..', hold: 6000 },
      { t: '', hold: 2500 },
      { t: '<span style="font-size:2.8em;font-weight:600;line-height:.85;display:block;margin-bottom:.15em">Respire..</span>tem muita vida que ainda não aconteceu', hold: 4500 },
      { t: '', hold: 1500 },
      { t: '<span style="font-size:65%"><i class="ri-lock-fill" style="font-size:3.2rem"></i><br>Espaço protegido e anônimo</span><br><span style="font-size:45%;opacity:.45">Não guardamos suas informações aqui</span>', hold: 5200 },
      { t: '', hold: 1500 }
    ];

    for (let i = 0; i < seq.length; i++) {
      const s = seq[i];
      const finishOnSkip = isLastContentStep(i, seq);

      if (s.t) {
        const skippedPresent = await presentText(tit, s.t, skip);
        const skippedHold = await skip.wait(s.hold);
        const skipped = skippedPresent || skippedHold;

        if (skipped && finishOnSkip) {
          if (titIsVisible(tit)) await hideText(tit, skip);
          await exitPreloader(pre, tit, skip, false);
          return;
        }
        if (skipped) {
          await hideText(tit, skip);
          continue;
        }
        await hideText(tit, skip);
      } else {
        tit.style.opacity = '0';
        const skipped = await skip.wait(s.hold);
        if (skipped && finishOnSkip) {
          await exitPreloader(pre, tit, skip, false);
          return;
        }
      }
    }

    await exitPreloader(pre, tit, skip, true);
  }

  function start() {
    if (!document.body) {
      setTimeout(start, 16);
      return;
    }
    run().catch(() => {
      releaseGlobalChrome();
      window.dispatchEvent(new CustomEvent('preloader:revealed'));
    });
  }

  injectStyles();
  forceGlobalWhite();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
