/* Opened straight from the disk (file://)? Browsers refuse ES-module scripts and integrity checks there (no origin,
   no CORS), so the verified module bundle never runs and only the static 192 shell shows. This loader then adds the
   same engine as a classic script (stamped by scripts/build.ts into data-bundle). On http(s) it does nothing: the
   module bundle with Subresource Integrity is the one that runs. A second boot is ignored by the engine itself. */
(function () {
  if (location.protocol !== "file:") return;
  var me = document.currentScript;
  var src = me && me.getAttribute("data-bundle");
  if (!src) return;
  var s = document.createElement("script");
  s.src = src;
  document.body.appendChild(s);
})();
