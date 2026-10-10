/* Relatório — always light. The A4 report is paper: white sheet, dark ink, whatever the shared Apollo theme preference
   says (the app, index.html, is always dark). core.js applies that preference with `dark-mode` / data-theme="dark";
   this undoes it on <html> and <body> at once and whenever it comes back. The preference itself is never written. */
(function () {
  'use strict';
  var de = document.documentElement;
  function light(el) {
    if (!el) return;
    if (el.classList.contains('dark-mode')) el.classList.remove('dark-mode');
    if (el.hasAttribute('data-theme') && el.getAttribute('data-theme') !== 'light') el.setAttribute('data-theme', 'light');
  }
  function all() {
    light(de);
    if (de.getAttribute('data-theme') !== 'light') de.setAttribute('data-theme', 'light');
    if (de.style.colorScheme !== 'light') de.style.colorScheme = 'light';
    light(document.body);
  }
  all();
  var watch = { attributes: true, attributeFilter: ['class', 'data-theme'] };
  new MutationObserver(all).observe(de, watch);
  function onBody() { all(); if (document.body) new MutationObserver(all).observe(document.body, watch); }
  if (document.body) onBody(); else document.addEventListener('DOMContentLoaded', onBody, { once: true });
})();
