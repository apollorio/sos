/* debug-boot-probe · session df7be7 · fold-friendly diagnostics for file:// vs http */
// #region agent log
(function () {
  var ENDPOINT = "http://127.0.0.1:7903/ingest/9b31cffe-ed50-43b9-b727-22590054c9a6";
  var SID = "df7be7";
  function send(hypothesisId, location, message, data) {
    var payload = {
      sessionId: SID,
      runId: "file-boot-1",
      hypothesisId: hypothesisId,
      location: location,
      message: message,
      data: data || {},
      timestamp: Date.now(),
    };
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SID },
        body: JSON.stringify(payload),
      }).catch(function () {});
    } catch (_) {}
    try {
      console.info("[sos-debug]", hypothesisId, message, data);
    } catch (_) {}
  }

  var protocol = location.protocol;
  var href = location.href;
  var hasModule = "noModule" in document.createElement("script");
  var scripts = Array.prototype.map.call(document.scripts, function (s) {
    return { src: s.src || "(inline)", type: s.type || "", integrity: s.integrity || "", async: s.async, defer: s.defer };
  });

  send("H1", "debug-boot-probe.js:env", "boot environment", {
    protocol: protocol,
    href: href,
    origin: location.origin,
    hasModule: hasModule,
    sw: "serviceWorker" in navigator,
    idb: typeof indexedDB !== "undefined",
    scripts: scripts,
    htmlJsOk: document.documentElement.classList.contains("js-ok"),
  });

  window.addEventListener(
    "error",
    function (ev) {
      send("H1", "debug-boot-probe.js:error", "window error", {
        message: String(ev.message || ""),
        filename: String(ev.filename || ""),
        lineno: ev.lineno,
        colno: ev.colno,
        tag: ev.target && ev.target.tagName,
        src: ev.target && (ev.target.src || ev.target.href),
      });
    },
    true,
  );

  window.addEventListener("unhandledrejection", function (ev) {
    send("H3", "debug-boot-probe.js:rejection", "unhandledrejection", {
      reason: String((ev.reason && (ev.reason.message || ev.reason)) || ev.reason),
    });
  });

  // Observe the stamped module tag WITHOUT re-importing it (would double-boot).
  var mod = document.querySelector('script[type="module"][src*="assets/app."]');
  var modSrc = mod ? mod.getAttribute("src") : null;
  if (!modSrc) {
    send("H5", "debug-boot-probe.js:nomodule", "no module script tag found in DOM", {});
  } else {
    var abs = new URL(modSrc, location.href).href;
    send("H2", "debug-boot-probe.js:module", "module tag present", {
      modSrc: modSrc,
      abs: abs,
      integrity: mod.getAttribute("integrity"),
      crossOrigin: mod.crossOrigin,
    });
    // fetch() of the bundle: on file:// this often fails (opaque / CORS) even when <script> works — H1/H2.
    fetch(abs, { method: "GET", cache: "no-store" })
      .then(function (r) {
        send("H2", "debug-boot-probe.js:fetch-bundle", "fetch bundle result", {
          ok: r.ok,
          status: r.status,
          type: r.type,
          url: r.url,
        });
      })
      .catch(function (err) {
        send("H1", "debug-boot-probe.js:fetch-bundle-fail", "fetch bundle FAILED (expected on some file://)", {
          name: err && err.name,
          message: String(err && err.message),
        });
      });
    mod.addEventListener("error", function () {
      send("H1", "debug-boot-probe.js:script-error", "module script element error event", { abs: abs });
    });
    mod.addEventListener("load", function () {
      send("H1", "debug-boot-probe.js:script-load", "module script element load event", {
        jsOk: document.documentElement.classList.contains("js-ok"),
      });
    });
  }

  // Watch js-ok race (H4): set briefly then removed.
  var last = document.documentElement.classList.contains("js-ok");
  var ticks = 0;
  var iv = setInterval(function () {
    ticks++;
    var now = document.documentElement.classList.contains("js-ok");
    if (now !== last) {
      send("H4", "debug-boot-probe.js:js-ok-flip", "js-ok class changed", {
        from: last,
        to: now,
        tick: ticks,
        appKids: (document.getElementById("app") || {}).childElementCount || 0,
      });
      last = now;
    }
    if (ticks >= 40) {
      clearInterval(iv);
      send("H4", "debug-boot-probe.js:final", "final boot snapshot", {
        jsOk: now,
        appKids: (document.getElementById("app") || {}).childElementCount || 0,
        staticDisplay: (function () {
          var el = document.getElementById("static-help");
          return el ? getComputedStyle(el).display : null;
        })(),
        bodyClasses: document.body.className,
      });
    }
  }, 250);
})();
// #endregion
