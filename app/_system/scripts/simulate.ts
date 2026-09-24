/**
 * Scenario simulator — runs the REAL engine and prints what the person would see.
 *   npm run simulate                 → all scenarios
 *   npm run simulate -- club         → scenarios whose name contains "club"
 */
import { SCENARIOS, runScenario } from "../tests/scenarios/scenarios";
import { LOCALES, resolveCard } from "../src/ui/locale";
import { REG } from "../src/core/registry";

const filter = process.argv[2];
const locale = LOCALES["pt-BR"]!;
for (const sc of SCENARIOS.filter((s) => !filter || s.name.includes(filter))) {
  console.log(`\n══ ${sc.name} ══  ${sc.doc}`);
  const steps = runScenario(sc);
  for (const st of steps) {
    const c = resolveCard(st.output.card, locale, REG);
    const why = st.log.why;
    const whyStr = why.commander ? `${why.commander}` : `${why.bandRule ?? ""}${why.heldByHysteresis ? "(held)" : ""} → ${why.policyRule ?? ""}${why.voi ? `:${why.voi.class}` : ""}`;
    console.log(`  t+${String(Math.round((st.log.at - steps[0]!.log.at) / 1000)).padStart(4)}s  ${st.label.padEnd(28)} │ ${st.log.band} ${st.output.card.skill}${st.output.card.strategy ? "." + st.output.card.strategy : ""}  [${whyStr}]`);
    console.log(`  ${" ".repeat(36)}│ «${c.title}» ${c.body ? "— " + c.body : ""}`);
    console.log(`  ${" ".repeat(36)}│ ${c.actions.map((a) => (a.emphasis === "primary" ? `[${a.label}]` : a.emphasis === "low" ? `(${a.label})` : `‹${a.label}›`)).join(" ")}${st.output.chips.length ? "  +chip" : ""}${st.output.notice ? "  !" + st.output.notice : ""}`);
  }
}
