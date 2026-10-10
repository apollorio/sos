/**
 * relatorio.a4.js — força o relatório em folhas A4 empilhadas (tela + print).
 * Filosofia do paginator.v2 (CV): dimensões A4 fixas, margem, contagem de páginas.
 * Sem Paged.js — packer local compatível com CSP 'self'.
 */
(function () {
  'use strict';

  /* A4 @ 96dpi — espelha d:/dev/_cv.rvalle.com.br/v2/config.js */
  var A4 = {
    W: 794,
    H: 1123,
    PAD_T: 48,
    PAD_R: 52,
    PAD_B: 56,
    PAD_L: 52,
    FOOT: 22
  };
  A4.CW = A4.W - A4.PAD_L - A4.PAD_R;
  A4.CH = A4.H - A4.PAD_T - A4.PAD_B - A4.FOOT;

  var source = null;
  var stage = null;
  var pagesEl = null;
  var countEl = null;
  var expandBtn = null;
  var timer = 0;
  var gen = 0;
  /* 0 = fit tela; senão escala absoluta (cap 1.5). Clique: ×1.25 até 150%, depois volta ao fit. */
  var zoomAbs = 0;
  var ZOOM_MAX = 1.5;
  var ZOOM_STEP = 1.25;

  function ready() {
    source = document.getElementById('doc');
    stage = document.querySelector('.a4-stage');
    pagesEl = document.getElementById('a4-pages');
    countEl = document.getElementById('pageCount');
    expandBtn = document.getElementById('btn-a4-expand');
    if (!source || !pagesEl) return;

    var mo = new MutationObserver(schedule);
    mo.observe(source, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', scaleToFit, { passive: true });
    if (expandBtn) {
      expandBtn.addEventListener('click', function (e) {
        e.preventDefault();
        stepZoom();
      });
    }
    schedule();
  }

  function fitScale() {
    if (!stage) return 1;
    var avail = Math.max(240, stage.clientWidth - 8);
    return Math.min(1, avail / A4.W);
  }

  function currentScale() {
    return atFit() ? fitScale() : Math.min(ZOOM_MAX, zoomAbs);
  }

  function atFit() {
    return !(zoomAbs > 0);
  }

  function atMax() {
    return zoomAbs >= ZOOM_MAX - 0.001;
  }

  function syncZoomUi() {
    if (!expandBtn) return;
    var maxed = atMax();
    var fit = atFit();
    expandBtn.setAttribute('aria-pressed', fit ? 'false' : 'true');
    if (maxed) {
      expandBtn.setAttribute('aria-label', 'Ajustar à tela');
      expandBtn.title = 'Ajustar à tela';
    } else {
      expandBtn.setAttribute('aria-label', 'Ampliar 25%');
      expandBtn.title = 'Ampliar 25%';
    }
    var ic = expandBtn.querySelector('i');
    if (ic) {
      ic.className = maxed ? 'ri-merge-cells-horizontal' : 'ri-split-cells-horizontal';
    }
    document.body.classList.toggle('is-a4-expanded', !fit);
  }

  function stepZoom() {
    var fit = fitScale();
    if (atMax()) {
      zoomAbs = 0;
    } else if (atFit()) {
      zoomAbs = Math.min(ZOOM_MAX, +(fit * ZOOM_STEP).toFixed(4));
    } else {
      zoomAbs = Math.min(ZOOM_MAX, +(zoomAbs * ZOOM_STEP).toFixed(4));
    }
    scaleToFit();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(paginate, 80);
  }

  function measureHeight(node, width) {
    var probe = node.cloneNode(true);
    probe.style.cssText =
      'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;' +
      'width:' + width + 'px;box-sizing:border-box;';
    document.body.appendChild(probe);
    var h = Math.ceil(probe.getBoundingClientRect().height);
    probe.remove();
    return h;
  }

  function makePage(index, total) {
    var page = document.createElement('article');
    page.className = 'a4-page';
    page.setAttribute('data-page', String(index + 1));
    page.style.width = A4.W + 'px';
    page.style.height = A4.H + 'px';

    var body = document.createElement('div');
    body.className = 'a4-page__body';
    body.style.cssText =
      'padding:' + A4.PAD_T + 'px ' + A4.PAD_R + 'px ' + (A4.PAD_B + A4.FOOT) + 'px ' + A4.PAD_L + 'px;';

    var foot = document.createElement('footer');
    foot.className = 'a4-page__foot';
    foot.innerHTML =
      '<span>SOS Apollo · Relatório de Emergência</span>' +
      '<span>Pág. ' + (index + 1) + ' / ' + total + '</span>';

    page.appendChild(body);
    page.appendChild(foot);
    return { page: page, body: body };
  }

  function paginate() {
    if (!source || !pagesEl) return;
    var kids = Array.prototype.slice.call(source.children).filter(function (n) {
      return !(n.tagName === 'NOSCRIPT' || n.classList.contains('waiting'));
    });
    if (!kids.length) {
      pagesEl.innerHTML = '';
      if (countEl) countEl.textContent = '0 pg';
      document.body.classList.remove('is-a4');
      return;
    }

    var my = ++gen;
    var widths = A4.CW;
    var measured = kids.map(function (n) {
      return { node: n, h: Math.max(24, measureHeight(n, widths)) };
    });

    var packs = [];
    var cur = [];
    var used = 0;
    measured.forEach(function (item) {
      var gap = cur.length ? 10 : 0;
      var need = item.h + gap;
      if (cur.length && used + need > A4.CH) {
        packs.push(cur);
        cur = [];
        used = 0;
        need = item.h;
      }
      if (!cur.length && item.h > A4.CH) {
        packs.push([item]);
        return;
      }
      cur.push(item);
      used += need;
    });
    if (cur.length) packs.push(cur);
    if (!packs.length) packs = [measured];

    if (my !== gen) return;

    var total = packs.length;
    var frag = document.createDocumentFragment();
    packs.forEach(function (pack, pi) {
      var sheet = makePage(pi, total);
      pack.forEach(function (item) {
        sheet.body.appendChild(item.node.cloneNode(true));
      });
      frag.appendChild(sheet.page);
    });

    pagesEl.innerHTML = '';
    pagesEl.appendChild(frag);
    document.body.classList.add('is-a4');
    if (countEl) countEl.textContent = total + (total === 1 ? ' pg' : ' pgs');
    if (stage) stage.setAttribute('aria-hidden', 'false');
    scaleToFit();
  }

  /* Escala visual sem alterar o tamanho lógico A4 (filosofia CV paginator) */
  function scaleToFit() {
    if (!pagesEl || !stage) return;
    var pages = pagesEl.querySelectorAll('.a4-page');
    if (!pages.length) return;
    var fit = fitScale();
    if (!atFit() && zoomAbs < fit) zoomAbs = 0;
    var s = currentScale();
    var layoutW = Math.ceil(A4.W * s);
    if (s > fit + 0.001) {
      pagesEl.style.width = layoutW + 'px';
      pagesEl.style.minWidth = layoutW + 'px';
    } else {
      pagesEl.style.width = '';
      pagesEl.style.minWidth = '';
    }
    pages.forEach(function (p) {
      p.style.width = A4.W + 'px';
      p.style.height = A4.H + 'px';
      p.style.transformOrigin = 'top center';
      p.style.transform = Math.abs(s - 1) < 0.001 ? '' : 'scale(' + s + ')';
      p.style.marginBottom = (A4.H * s - A4.H) + 14 + 'px';
    });
    stage.style.overflowX = layoutW > stage.clientWidth + 4 ? 'auto' : '';
    syncZoomUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
