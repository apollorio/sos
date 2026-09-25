/**
 * BOOT — entry point of the PWA bundle.
 * The emergency bar and the static help panel are plain HTML in index.html and work with zero JS.
 * This script only ADDS the engine; if anything throws, <html> loses .js-ok and the static
 * panel comes back (fail to shell, L11).
 */
import { REG } from "../core/registry";
import { LOCALES } from "../ui/locale";
import { renderStep } from "../ui/render";
import { EngineLoop } from "./engine-loop";
import { openStore } from "./storage/session-store";
import { wireBrowserSignals } from "./signals-browser";
import { now } from "./clock";
import { attachContinuity } from "./continuity/boot-continuity";

const failToShell = () => document.documentElement.classList.remove("js-ok");
window.addEventListener("error", failToShell);
window.addEventListener("unhandledrejection", failToShell);

async function main(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) return;
  const locale = LOCALES[REG.data.meta.defaultLocale]!;
  const store = await openStore(REG.data.storage.retentionHours, REG.data.storage.logMaxEntries, now);
  const loop: EngineLoop = new EngineLoop(store, (r) =>
    renderStep(root, r, locale, REG, {
      tap: (cardInstanceId, actionId) => void loop.dispatch({ kind: "tap", cardInstanceId, actionId }),
      text: (text) => void loop.dispatch({ kind: "text", text }),
      chip: (chipId) => void loop.dispatch({ kind: "chip", chipId }),
    }),
  );
  document.getElementById("sos")?.addEventListener("click", () => void loop.dispatch({ kind: "shell", action: "call_192" }));
  wireBrowserSignals((event) => void loop.dispatch({ kind: "runtime", event }));
  await loop.start();
  document.documentElement.classList.add("js-ok");
  // Continuity plane (v0.2): attached AFTER the first card is on screen; never awaited by the acute path (INV-019).
  void attachContinuity(loop, now).catch(() => undefined);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => undefined);
}

main().catch(failToShell);
