/**
 * CONVERSE — read a session the way the person lives it: every card, in pt-BR, with the time and the "why".
 *   npx tsx scripts/converse.ts [persona] [minutes]
 * Personas answer questions like a person would and do each exercise for a minute. Read-only; no I/O but stdout.
 */
import { processEvent, startSession } from "../src/core/process-event";
import { REG } from "../src/core/registry";
import { LOCALES } from "../src/ui/locale";
import { resolveCard } from "../src/ui/locale";
import type { StepResult } from "../src/core/domain/decision";

export const PERSONAS: Record<string, { story: string; answers: Record<string, string>; answerSec?: number }> = {
  bala: { story: "Pânico numa festa: energia de abraço e música, bebeu, tomou remédio de ereção, nariz ardendo.", answers: { Q_ACTOR: "self", Q_RED_FLAGS: "none", Q_CLARITY: "yes", Q_ANXIETY: "panic", Q_COMPANY: "with", Q_NOISE: "loud", Q_FEEL: "racing", Q_RACE_KIND: "people", Q_ALCOHOL: "yes", Q_MEDS: "erection", Q_URGE: "some", Q_BODY: "nose" } },
  po: { story: "Sozinho, acelerado em ondas curtas, bebeu, garganta ardendo, vontade de mais.", answers: { Q_ACTOR: "self", Q_RED_FLAGS: "none", Q_CLARITY: "yes", Q_ANXIETY: "high", Q_COMPANY: "alone", Q_NOISE: "quiet", Q_FEEL: "racing", Q_RACE_KIND: "doing", Q_RACE_LENGTH: "short", Q_ALCOHOL: "yes", Q_MEDS: "none", Q_URGE: "strong", Q_BODY: "throat" } },
  g: { story: "Amigo(a) que estava bem e despencou, bebeu também; acordado(a) e respirando normal.", answers: { Q_ACTOR: "helper", Q_RESPONDS: "normal", Q_BREATHING: "normal", Q_RED_FLAGS: "none", Q_ANXIETY: "anxious", Q_NOISE: "moderate", Q_FEEL: "heavy", Q_HEAVY_KIND: "cliff", Q_ALCOHOL: "yes", Q_MEDS: "none", Q_BODY: "nausea" } },
  panico: { story: "Pânico, nada usado, lento pra responder.", answerSec: 95, answers: { Q_ACTOR: "self", Q_RED_FLAGS: "none", Q_CLARITY: "yes", Q_ANXIETY: "panic", Q_COMPANY: "with", Q_NOISE: "quiet", Q_FEEL: "none" } },
};

export function converse(name: string, minutes: number): { steps: StepResult[]; lines: string[] } {
  const p = PERSONAS[name]!;
  const loc = LOCALES["pt-BR"]!;
  const T0 = 1_800_000_000_000;
  let t = T0;
  let r = startSession(name, t);
  const steps = [r];
  const lines: string[] = [`# ${name}: ${p.story}`];
  const show = (x: StepResult) => {
    const c = resolveCard(x.output.card, loc, REG);
    const mm = String(Math.floor((t - T0) / 60000)).padStart(2, "0");
    const ss = String(Math.floor(((t - T0) % 60000) / 1000)).padStart(2, "0");
    const note = x.output.notice ? ` «${loc.notices[x.output.notice]}»` : "";
    const orb = x.output.breath ? " ◯" : "";
    lines.push(`${mm}:${ss} [${x.output.card.band}${orb}] ${c.title} — ${c.body.replace(/\*\*/g, "")}${note}  {${x.log.why.policyRule ?? x.log.why.commander ?? ""}}`);
    lines.push(`         → ${c.actions.map((a) => a.label).join(" | ")}`);
  };
  show(r);
  let n = 0;
  while (t - T0 < minutes * 60_000 && r.state.status === "active") {
    const c = r.output.card;
    let id: string;
    if (c.questionId) {
      t += (p.answerSec ?? 8) * 1000;
      id = p.answers[c.questionId] ?? c.actions[0]!.id;
    } else {
      t += 60_000;
      const tick = processEvent(r.state, { kind: "runtime", id: `t${++n}`, at: t, event: "TICK" });
      if (tick.output.card.instanceId !== c.instanceId || tick.output.notice) { r = tick; steps.push(r); show(r); }
      t += 5_000;
      const q = r.output.card.questionId;
      const ids = r.output.card.actions.map((a) => a.id);
      id = q ? (p.answers[q] ?? ids[0]!) : (["done", "ok", "did_it", "nobody", "not_now", "check_later"].find((x) => ids.includes(x)) ?? ids[0]!);
    }
    lines.push(`         ✓ ${resolveCard(r.output.card, loc, REG).actions.find((a) => a.id === id)?.label ?? id}`);
    r = processEvent(r.state, { kind: "tap", id: `a${++n}`, at: t, cardInstanceId: r.output.card.instanceId, actionId: id });
    steps.push(r);
    show(r);
  }
  return { steps, lines };
}

if (process.argv[1]?.endsWith("converse.ts")) {
  const name = process.argv[2] ?? "bala";
  const min = Number(process.argv[3] ?? 25);
  for (const nm of name === "all" ? Object.keys(PERSONAS) : [name]) console.log(converse(nm, min).lines.join("\n") + "\n");
}
