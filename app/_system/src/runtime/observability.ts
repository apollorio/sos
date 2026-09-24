/**
 * OBSERVABILITY FIREWALL (INV-025, L17). The ONLY logger the runtime may use.
 * It accepts an allowlist of operational fields and refuses anything that looks like state, journal or summary.
 */
const ALLOWED = new Set(["event", "kind", "durationMs", "queued", "flushed", "duplicate", "status", "code", "engine", "registry", "band"]);
const FORBIDDEN_KEYS = new Set(["signals", "payload", "summary", "reported", "derived", "text", "state", "events", "location", "substanceClass", "selfHarm"]);

export type OpsLevel = "info" | "warn" | "error";

export function opsLog(level: OpsLevel, message: string, fields: Record<string, string | number | boolean> = {}): void {
  const safe: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (FORBIDDEN_KEYS.has(k) || !ALLOWED.has(k)) continue;
    if (typeof v === "string" && v.length > 64) continue;
    safe[k] = v;
  }
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  fn(`[sos] ${message}`, safe);
}
