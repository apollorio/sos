/* Modo Médico — Close fecha esta tela. Nunca history.back(), nunca volta ao app. */
(function () {
  'use strict';

  function signalParent() {
    var page = (document.body && document.body.dataset.page) || 'report';
    var msg = { type: 'sos:close', page: page };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    } catch (_) { /* noop */ }
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(msg, '*');
      }
    } catch (_) { /* noop */ }
  }

  function closeThisPage() {
    signalParent();
    try { window.close(); } catch (_) { /* noop */ }
    try {
      var w = window.open('', '_self');
      if (w) w.close();
    } catch (_) { /* noop */ }
    window.setTimeout(function () {
      if (window.closed) return;
      try { location.replace('about:blank'); } catch (_) { /* noop */ }
    }, 60);
  }

  var btn = document.getElementById('btn-close');
  if (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeThisPage();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeThisPage();
    }
  });

  function killChrome() {
    var n = document.getElementById('apollo-suporte-root');
    if (n) n.remove();
    document.querySelectorAll('#apollo-sb-x, #apollo-sb-y, .apollo-suporte, [data-apollo-suporte]').forEach(function (el) {
      el.remove();
    });
  }
  killChrome();
  new MutationObserver(killChrome).observe(document.documentElement, { childList: true, subtree: true });
})();
