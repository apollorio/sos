/**
 * REVIEW SUMMARY — turns a clinician's exported review (app/lab/revisao.html → "Baixar retorno") into Markdown for
 * docs/CLINICAL-REVIEW.md and the audit trail. Read-only on purpose: it never changes the registry or the locale.
 * Marking copy as clinically reviewed stays a deliberate, signed human step (CLAUDE.md rule 8).
 *   npm run review:summary -- path/to/revisao-clinica-sos-<hash>.json
 */
import { readFileSync } from "node:fs";
import { REGISTRY_HASH } from "../src/generated/registry.gen";
import { reviewSections } from "./lab/model";

export interface ReviewExport {
  kind: string; version: number; registryHash: string; bundle?: string; exportedAt?: string;
  reviewer?: { name?: string; registration?: string; specialty?: string };
  items: { id: string; hash: string; reviewedHash?: string; stale?: boolean; verdict: string; comment?: string }[];
}

const V: Record<string, string> = { aprovado: "approved", ajustes: "approved with changes", reprovado: "not approved" };
const cell = (s: string | undefined) => (s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim() || "—";

export function summarize(r: ReviewExport): { markdown: string; ready: boolean } {
  if (r.kind !== "sos-apollo-clinical-review" || r.version !== 1 || !Array.isArray(r.items)) throw new Error("not a SOS clinical review export (kind/version)");
  const current = new Map(reviewSections().flatMap((s) => s.items.map((i) => [i.id, { hash: i.hash, required: !s.optional, title: i.title }] as const)));
  const byId = new Map(r.items.map((i) => [i.id, i]));
  const sameRegistry = r.registryHash === REGISTRY_HASH;
  const stale = r.items.filter((i) => current.has(i.id) && (i.stale || (i.reviewedHash ?? i.hash) !== current.get(i.id)!.hash));
  const unknown = r.items.filter((i) => !current.has(i.id));
  const required = [...current.entries()].filter(([, v]) => v.required).map(([id]) => id);
  const missing = required.filter((id) => !byId.get(id)?.verdict);
  const count = (v: string) => r.items.filter((i) => i.verdict === v).length;
  const open = r.items.filter((i) => i.verdict !== "aprovado" || (i.comment ?? "").trim());
  const staleIds = new Set(stale.map((i) => i.id));
  const ready = sameRegistry && missing.length === 0 && stale.length === 0 && required.every((id) => byId.get(id)?.verdict === "aprovado");
  const who = `${cell(r.reviewer?.name)} (${cell(r.reviewer?.registration)}${r.reviewer?.specialty ? `, ${cell(r.reviewer.specialty)}` : ""})`;
  const lines = [
    `## Clinical review — ${who}`,
    "",
    `- Exported: ${cell(r.exportedAt)} · registry ${r.registryHash}${sameRegistry ? " (current)" : ` — **differs from the current registry ${REGISTRY_HASH}**`} · bundle ${cell(r.bundle)}`,
    `- Required items: ${required.length} · approved ${required.filter((id) => byId.get(id)?.verdict === "aprovado").length} · with changes ${count("ajustes")} · not approved ${count("reprovado")} · without a verdict ${missing.length}`,
    ...(stale.length ? [`- **${stale.length} item(s) changed after this review** and must be reviewed again: ${stale.map((i) => i.id).join(", ")}`] : []),
    ...(unknown.length ? [`- Items no longer in the registry (ignored): ${unknown.map((i) => i.id).join(", ")}`] : []),
    "",
  ];
  if (open.length) {
    lines.push("| Item | Verdict | Comment |", "|---|---|---|");
    for (const i of open) lines.push(`| ${i.id}${staleIds.has(i.id) ? " (changed)" : ""} | ${V[i.verdict] ?? "—"} | ${cell(i.comment)} |`);
    lines.push("");
  }
  if (missing.length) lines.push(`Required items without a verdict: ${missing.join(", ")}`, "");
  lines.push(ready
    ? `Ready to record in docs/CLINICAL-REVIEW.md → Record of approvals:\n\n| ${cell(r.exportedAt).slice(0, 10)} | ${who} | all ${required.length} required items | ${r.registryHash} | from app/lab/revisao.html |`
    : "Not ready to record an approval: every required item must be approved, on the current registry, with no item changed since.");
  return { markdown: lines.join("\n"), ready };
}

if (process.argv[1]?.endsWith("review-summary.ts")) {
  const file = process.argv[2];
  if (!file) { console.error("usage: npm run review:summary -- <exported review .json>"); process.exit(1); }
  try {
    console.log(summarize(JSON.parse(readFileSync(file, "utf8")) as ReviewExport).markdown);
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    process.exit(1);
  }
}
