/**
 * Runtime → RawInput adapters. Visibility is the signal that separates SILENCE from
 * APP_UNAVAILABLE (brainstorm §3): pagehide/freeze count as hidden, pageshow/resume as visible.
 */
export type RuntimeEvent = "APP_HIDDEN" | "APP_VISIBLE" | "ONLINE" | "OFFLINE" | "TICK";

export function wireBrowserSignals(emit: (e: RuntimeEvent) => void): () => void {
  const vis = () => emit(document.visibilityState === "hidden" ? "APP_HIDDEN" : "APP_VISIBLE");
  const hidden = () => emit("APP_HIDDEN");
  const visible = () => emit("APP_VISIBLE");
  const online = () => emit("ONLINE");
  const offline = () => emit("OFFLINE");
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("pagehide", hidden);
  window.addEventListener("pageshow", visible);
  document.addEventListener("freeze", hidden);
  document.addEventListener("resume", visible);
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  if (!navigator.onLine) offline();
  return () => {
    document.removeEventListener("visibilitychange", vis);
    window.removeEventListener("pagehide", hidden);
    window.removeEventListener("pageshow", visible);
    document.removeEventListener("freeze", hidden);
    document.removeEventListener("resume", visible);
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
  };
}
