/**
 * REGISTRY LINT — the referential-integrity gate of the universal base.
 *
 * Every rule, card, question, skill, trigger and locale string is cross-checked BEFORE any code
 * runs. A registry that passes this lint cannot reference something that does not exist, cannot
 * compare a signal against a value outside its domain, cannot exceed the engagement budget of a
 * band, and cannot leave a band without a total policy table.
 *
 *   npm run registry:lint              errors fail, drafts warn
 *   npm run registry:lint -- --release  unreviewed clinical copy also fails (production gate)
 */
import { REG as DEFAULT_REG, type Reg } from "../src/core/registry";
import { factCatalog } from "../src/core/logic/facts";
import { pathsOf, literalsOf, type Pred } from "../src/core/logic/predicate";
import type { Op } from "../src/core/registry/types";
import { LOCALES as DEFAULT_LOCALES, type Locale, type LocaleCard } from "../src/ui/locale";

export interface LintReport { errors: string[]; warnings: string[] }

export function lintRegistry(opts: { release?: boolean; reg?: Reg; locales?: Record<string, Locale> } = {}): LintReport {
  const release = opts.release ?? false;
  const REG = opts.reg ?? DEFAULT_REG;
  const LOCALES = opts.locales ?? DEFAULT_LOCALES;
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  const warn = (m: string) => warnings.push(m);
  const d = REG.data;
  const catalog = factCatalog(REG);
  const bands = new Set(d.bands.map((b) => b.id));
  const nonP0 = ["P1", "P2", "P3"];
  const conv = d.conventions.idPatterns;
  const re = (k: string) => new RegExp(conv[k]!);

  /* ── IDs: pattern + uniqueness ── */
  const idSets: [string, string[]][] = [
    ["signal", d.signals.map((x) => x.id)],
    ["hardRule", d.hardRules.map((x) => x.id)],
    ["bandRule", d.bandRules.map((x) => x.id)],
    ["policyRule", Object.values(d.policies).flat().map((x) => x.id)],
    ["question", d.questions.map((x) => x.id)],
    ["card", d.cards.map((x) => x.id)],
    ["skill", d.skills.map((x) => x.id)],
    ["commitment", d.commitments.map((x) => x.id)],
    ["textTrigger", d.textTriggers.rules.map((x) => x.id)],
    ["invalidation", d.invalidation.map((x) => x.id)],
    ["invariant", d.invariants.map((x) => x.id)],
    ["chip", d.chips.map((x) => x.id)],
  ];
  for (const [kind, ids] of idSets) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (!re(kind).test(id)) err(`id ${kind} "${id}" violates ${conv[kind]}`);
      if (seen.has(id)) err(`duplicate ${kind} id "${id}"`);
      seen.add(id);
    }
  }
  for (const s of d.skills) for (const st of s.strategies) if (!re("strategy").test(st.id)) err(`strategy id "${s.id}.${st.id}" violates pattern`);

  /* ── Predicates: every path exists, every literal is in its domain, gte/lte only on numbers ── */
  const checkPred = (where: string, p: Pred) => {
    for (const path of pathsOf(p)) if (!catalog.has(path)) err(`${where}: unknown fact path "${path}"`);
    for (const [path, lit] of literalsOf(p)) {
      const dom = catalog.get(path);
      if (dom && !dom.includes(lit)) err(`${where}: ${JSON.stringify(lit)} ∉ domain(${path})`);
    }
    const walk = (q: Pred): void => {
      if ("all" in q) q.all.forEach(walk);
      else if ("any" in q) q.any.forEach(walk);
      else if ("not" in q) walk(q.not);
      else if ("gte" in q || "lte" in q) {
        const path = "gte" in q ? q.gte[0] : q.lte[0];
        if (!(catalog.get(path) ?? []).some((v) => typeof v === "number")) err(`${where}: numeric comparison on non-numeric "${path}"`);
      }
    };
    walk(p);
  };
  d.hardRules.forEach((h) => checkPred(h.id, h.when));
  d.risk.rules.forEach((r, i) => {
    checkPred(`risk[${i}]`, r.when);
    if (!d.risk.dimensions.includes(r.dimension)) err(`risk[${i}]: unknown dimension ${r.dimension}`);
    if (r.level < 0 || r.level > 4) err(`risk[${i}]: level ${r.level} ∉ 0..4`);
  });
  d.bandRules.forEach((b) => { checkPred(b.id, b.when); if (!bands.has(b.band) || b.band === "P0") err(`${b.id}: band must be P1..P3`); });
  for (const rules of Object.values(d.policies)) rules.forEach((r) => checkPred(r.id, r.when));
  d.skills.forEach((s) => s.strategies.forEach((st) => { checkPred(`${s.id}.${st.id}`, st.when); if (st.deferWhen) checkPred(`${s.id}.${st.id}.deferWhen`, st.deferWhen); }));
  d.questions.forEach((q) => q.when && checkPred(`${q.id}.when`, q.when));
  checkPred("ambient.breath.when", d.ambient.breath.when);
  /* L27 / INV-032: the orb paces breathing, so it needs exactly what paced breathing needs (INV-027). */
  for (const need of ["signal.breathing", "signal.responsiveness"]) if (!JSON.stringify(d.ambient.breath.when).includes(`"${need}"`)) err(`ambient.breath.when must gate on ${need} (INV-032)`);
  for (const s of d.skills) for (const st of s.strategies) if (st.retired && !(d.conventions as { retiredIds?: string[] }).retiredIds?.includes(`${s.id}.${st.id}`)) err(`${s.id}.${st.id}: retired but not listed in conventions.retiredIds`);
  for (const id of (d.conventions as { retiredIds?: string[] }).retiredIds ?? []) if (REG.chip.has(id)) err(`${id} is retired and may not be reused`);
  for (const [k, v] of Object.entries(d.requirements)) if (k !== "doc") checkPred(`requirement.${k}`, v as Pred);
  d.invalidation.forEach((i) => i.onlyIf && checkPred(i.id, i.onlyIf));

  /* ── Signals ── */
  for (const s of d.signals) {
    if (!s.domain.includes("unknown")) err(`signal ${s.id}: domain must include "unknown"`);
    for (const l of s.latched) if (!s.domain.includes(l)) err(`signal ${s.id}: latched ${String(l)} ∉ domain`);
    for (const k of Object.keys(s.ttlByValue ?? {})) if (!s.domain.map(String).includes(k)) err(`signal ${s.id}: ttlByValue key ${k} ∉ domain`);
    if (s.critical && s.latched.length === 0 && s.id !== "actor") warn(`signal ${s.id}: critical but nothing latched`);
  }
  const checkSet = (where: string, set: Record<string, unknown>) => {
    for (const [sig, val] of Object.entries(set)) {
      const def = REG.signal.get(sig);
      if (!def) err(`${where}: unknown signal ${sig}`);
      else if (!def.domain.includes(val as never)) err(`${where}: ${JSON.stringify(val)} ∉ domain(${sig})`);
    }
  };
  for (const inv of d.invalidation) {
    checkSet(`${inv.id}.on`, { [inv.on.signal]: inv.on.value });
    if (inv.set) checkSet(`${inv.id}.set`, inv.set);
    for (const e of inv.expire ?? []) if (!REG.signal.has(e)) err(`${inv.id}: expire unknown signal ${e}`);
  }

  /* ── Ops (used by cards, chips, strategies, commitments) ── */
  const checkOps = (where: string, ops: Op[]) => {
    for (const op of ops) {
      switch (op.op) {
        case "SIGNALS_REPORTED": checkSet(where, op.set); if (op.set["substanceClass"] !== undefined) err(`${where}: substanceClass may only come from a question (INV-012)`); break;
        case "SIGNALS_EXPIRED": op.signals.forEach((s) => REG.signal.has(s) || err(`${where}: unknown signal ${s}`)); break;
        case "STRATEGY_OUTCOME": if (op.skill && !REG.strategy.has(`${op.skill}.${op.strategy}`)) err(`${where}: unknown strategy ${op.skill}.${op.strategy}`); break;
        case "STRATEGY_REQUESTED": if (!REG.strategy.has(`${op.skill}.${op.strategy}`)) err(`${where}: requests unknown strategy ${op.skill}.${op.strategy}`); break;
        case "COMMITMENT_CREATED": case "COMMITMENT_RESOLVED": if (!REG.commitment.has(op.kind)) err(`${where}: unknown commitment ${op.kind}`); break;
        case "HANDOFF_OPENED": if (op.target !== "trusted" && !REG.numbers[op.target]) err(`${where}: no number for target ${op.target}`); break;
        default: break;
      }
    }
  };

  /* ── Questions ── */
  for (const q of d.questions) {
    for (const b of q.bands) if (!bands.has(b) || b === "P0") err(`${q.id}: band ${b} invalid for questions (P0 never asks, INV-017)`);
    for (const [who, v] of Object.entries(q.variants)) {
      if (!["self", "helper", "any"].includes(who)) err(`${q.id}: variant "${who}" must be self|helper|any`);
      const card = REG.card.get(v.card);
      if (!card) err(`${q.id}.${who}: unknown card ${v.card}`);
      else if (card.kind !== "question") err(`${q.id}.${who}: card ${v.card} is not a question card`);
      v.answers.forEach((a) => checkSet(`${q.id}.${who}.${a.id}`, a.set));
      const unknowns = v.answers.filter((a) => a.unknown).length;
      if (!q.prerequisite && unknowns !== 1) err(`${q.id}.${who}: needs exactly one "Não sei" answer (uncertainty is data)`);
      const n = v.answers.filter((a) => !a.unknown).length;
      for (const b of q.bands) {
        const max = d.engagement[b]?.maxAnswers ?? 0;
        if (n > max) err(`${q.id}.${who}: ${n} answers > maxAnswers ${max} in ${b} (INV-008)`);
      }
    }
  }

  /* ── Cards ── */
  for (const c of d.cards) {
    if (c.kind === "action" && !(c.actions?.length)) err(`${c.id}: action card without actions`);
    for (const b of c.bands ?? []) if (!bands.has(b)) err(`${c.id}: unknown band ${b}`);
    for (const a of c.actions ?? []) {
      checkOps(`${c.id}.${a.id}`, a.ops);
      if (a.handoff && a.handoff.target !== "trusted" && !REG.numbers[a.handoff.target]) err(`${c.id}.${a.id}: no number for ${a.handoff.target}`);
    }
    for (const b of c.bands ?? []) {
      const e = d.engagement[b]!;
      const low = (c.actions ?? []).filter((a) => a.emphasis === "low").length;
      const main = (c.actions ?? []).length - low;
      if (main > e.maxActions) err(`${c.id}: ${main} actions > maxActions ${e.maxActions} in ${b} (INV-008)`);
      if (low > e.maxLowEmphasis) err(`${c.id}: ${low} low-emphasis actions > ${e.maxLowEmphasis} in ${b}`);
    }
    if ((c.actions ?? []).filter((a) => a.emphasis === "primary").length > 1) err(`${c.id}: more than one primary action (L07)`);
  }

  /* ── Skills & strategies ── */
  for (const s of d.skills) {
    for (const b of s.bands) if (!bands.has(b)) err(`skill ${s.id}: unknown band ${b}`);
    for (const st of s.strategies) {
      const card = REG.card.get(st.card);
      if (!card) err(`${s.id}.${st.id}: unknown card ${st.card}`);
      else if (card.kind !== "action") err(`${s.id}.${st.id}: strategy card must be an action card`);
      for (const r of st.requires) if (!REG.requirement.has(r)) err(`${s.id}.${st.id}: unknown requirement ${r}`);
      checkOps(`${s.id}.${st.id}.onShow`, st.onShow);
      for (const b of st.bandsOnly ?? []) if (!s.bands.includes(b)) err(`${s.id}.${st.id}: bandsOnly ${b} not in skill bands`);
      if (card && card.bands) for (const b of st.bandsOnly ?? s.bands) if (!card.bands.includes(b)) err(`${s.id}.${st.id}: card ${card.id} not allowed in ${b}`);
    }
    for (const [phase, table] of Object.entries(s.phases ?? {})) {
      if (!table["default"]) err(`${s.id}.phases.${phase}: missing default card`);
      for (const [reason, cid] of Object.entries(table)) {
        if (!REG.card.has(cid)) err(`${s.id}.phases.${phase}.${reason}: unknown card ${cid}`);
        if (reason !== "default" && !d.hardRules.some((h) => h.reason === reason)) err(`${s.id}.phases.${phase}: unknown reason ${reason}`);
      }
    }
  }

  /* ── Policies: skills exist, allowed in band, and every table is TOTAL (INV-018) ── */
  for (const b of nonP0) {
    const rules = d.policies[b];
    if (!rules?.length) { err(`policies.${b}: missing`); continue; }
    for (const r of rules) {
      const s = REG.skill.get(r.skill);
      if (!s) { err(`${r.id}: unknown skill ${r.skill}`); continue; }
      if (!s.bands.includes(b)) err(`${r.id}: skill ${r.skill} not allowed in ${b}`);
      if (r.question && !REG.question.has(r.question)) err(`${r.id}: unknown question ${r.question}`);
      if (r.skill === "emergency_escalation") err(`${r.id}: emergency_escalation is reserved for hard rules`);
      if (!r.id.startsWith(`${b}-`)) err(`${r.id}: policy id must start with ${b}-`);
    }
    const last = rules[rules.length - 1]!;
    const lastSkill = REG.skill.get(last.skill);
    const total = "always" in last.when && lastSkill?.strategies.some((st) => st.alwaysEligible && (!st.bandsOnly || st.bandsOnly.includes(b)));
    if (!total) err(`policies.${b}: last rule must be {always:true} → a skill with an alwaysEligible strategy (INV-018)`);
  }
  const lastBand = d.bandRules[d.bandRules.length - 1];
  if (!lastBand || !("always" in lastBand.when)) err("bandRules: last rule must be {always:true} (band totality)");

  /* ── Hard rules ── */
  const hrIds = d.hardRules.map((h) => h.id);
  if (hrIds.join() !== [...hrIds].sort().join()) err("hardRules must be listed in ascending id order (order = precedence)");
  const reasons = new Set<string>();
  for (const h of d.hardRules) {
    if (reasons.has(h.reason)) err(`${h.id}: duplicate reason ${h.reason}`);
    reasons.add(h.reason);
    for (const s of h.onCorrection.reset) if (!REG.signal.has(s)) err(`${h.id}: onCorrection resets unknown signal ${s}`);
    if (h.review !== "required" && h.review !== "proposed") err(`${h.id}: review must be required|proposed`);
    if (h.review === "proposed") warn(`${h.id} (${h.name}) is PROPOSED — needs clinical sign-off before release`);
  }

  /* ── Commitments, chips, triggers ── */
  for (const c of d.commitments) {
    if (!REG.card.has(c.confirmCard)) err(`${c.id}: unknown confirmCard ${c.confirmCard}`);
    checkOps(`${c.id}.onMissed`, c.onMissed);
  }
  /* Chips (L23): pending chips need a commitment; tools/talk chips request exactly one strategy; notices exist. */
  const NOTICE_IDS = ["TEXT_UNMATCHED", "STALE_TAP", "PRESENCE", "PRESENCE_WAVE", "PRESENCE_MINUTE", "THINKING", "RECHECK", "DONE_1", "DONE_2", "DONE_3", "DONE_4", "DONE_5", "ACK_BETTER", "ACK_WORSE", "ACK_BODY"];
  const NOTICES = new Set(NOTICE_IDS);
  for (const c of d.chips) {
    checkOps(`${c.id}.action`, c.action.ops);
    if (c.bands.includes("P0")) err(`${c.id}: chips never appear in P0 (INV-029)`);
    const requests = c.action.ops.filter((o) => o.op === "STRATEGY_REQUESTED");
    if (c.group === "pending" && (!c.whenPending || !REG.commitment.has(c.whenPending))) err(`${c.id}: pending chip needs a known whenPending commitment`);
    if (c.group !== "pending" && c.whenPending) err(`${c.id}: only pending chips may wait on a commitment`);
    if ((c.group === "tools" || c.group === "talk" || c.group === "body") && requests.length !== 1) err(`${c.id}: a ${c.group} chip requests exactly one strategy`);
    if (c.group === "report" && requests.length) err(`${c.id}: a report chip reports, it does not request`);
    if (c.notice && !NOTICES.has(c.notice)) err(`${c.id}: unknown notice ${c.notice}`);
  }
  /* L22 / INV-028: silence never pins a question; it only adds presence. */
  for (const b of nonP0) for (const r of d.policies[b] ?? []) {
    if (r.skill === "assess" && JSON.stringify(r.when).includes("silence.count")) err(`${r.id}: asks a question because of silence (L22, INV-028)`);
  }
  for (const t of d.textTriggers.rules) {
    t.patterns.forEach((p) => { try { new RegExp(p); } catch { err(`${t.id}: invalid regex ${p}`); } if (/[A-ZÀ-ÿ]/.test(p.replace(/\\[a-zA-Z]/g, ""))) err(`${t.id}: pattern must be written in normalized form (lowercase, no accents): ${p}`); });
    checkSet(t.id, t.set);
    for (const k of Object.keys(t.set)) if (REG.signal.get(k)?.explicitOnly) err(`${t.id}: text may never set ${k}, an explicit-only signal (INV-012, L26)`);
    if (t.onNegated && !REG.question.has(t.onNegated.ask)) err(`${t.id}: onNegated asks unknown question ${t.onNegated.ask}`);
  }

  /* ── Locale: coverage, fallbacks, budgets, review status ── */
  for (const [code, loc] of Object.entries(LOCALES)) {
    for (const c of d.cards) {
      const lc: LocaleCard | undefined = loc.cards[c.id];
      if (!lc) { err(`${code}: missing copy for ${c.id}`); continue; }
      const labels = new Set(Object.keys(lc.actions));
      const ids = c.kind === "question"
        ? d.questions.flatMap((q) => Object.values(q.variants).filter((v) => v.card === c.id).flatMap((v) => v.answers.map((a) => a.id)))
        : (c.actions ?? []).map((a) => a.id);
      for (const id of ids) if (!labels.has(id)) err(`${code}: ${c.id} has no label for "${id}"`);
      for (const [field, t] of [["title", lc.title], ["body", lc.body]] as const) if (typeof t === "object" && !("default" in t)) err(`${code}: ${c.id}.${field} map needs a "default" key`);
      if ((c.variantKeys ?? []).includes("reason") || c.id === "CARD_P0_CALL" || c.id === "CARD_P0_WAITING") {
        const body = typeof lc.body === "object" ? lc.body : {};
        for (const r of reasons) {
          if (c.id === "CARD_P0_CALL" && r === "self_harm") continue; // routed to CARD_P0_CALL_CRISIS
          const has = body[r] || (body[`${r}.self`] && body[`${r}.helper`]);
          if (!has) warn(`${code}: ${c.id} has no reason-specific copy for "${r}" (falls back to default)`);
        }
      }
      const cardBands = c.bands ?? (c.kind === "question" ? d.questions.filter((q) => Object.values(q.variants).some((v) => v.card === c.id)).flatMap((q) => q.bands) : []);
      const strictest = Math.min(...cardBands.map((b) => d.engagement[b]?.maxChars ?? Infinity));
      const texts = (t: string | Record<string, string>) => (typeof t === "string" ? [t] : Object.values(t));
      for (const title of texts(lc.title)) for (const body of texts(lc.body)) {
        if (title.length + body.length > strictest) err(`${code}: ${c.id} copy is ${title.length + body.length} chars > ${strictest} (INV-008)`);
      }
      if (lc.education && cardBands.some((b) => !d.engagement[b]?.education)) err(`${code}: ${c.id} is education but can appear in a band without education (INV-014)`);
      if (lc.clinical && lc.review !== "clinical") (release ? err : warn)(`${code}: ${c.id} clinical copy is "${lc.review}" (needs clinical review)`);
    }
    for (const c of d.chips) if (!loc.chips[c.id]) err(`${code}: missing chip label ${c.id}`);
    for (const n of NOTICE_IDS) if (!loc.notices[n]) err(`${code}: missing notice ${n}`);
    for (const k of ["menuBody", "menuTools", "menuTalk", "menuReport"]) if (!loc.shell[k]) err(`${code}: missing shell.${k} (menu heading, L23)`);
    for (const k of Object.keys(loc.cards)) if (!REG.card.has(k)) warn(`${code}: orphan copy ${k}`);
    /* INV-030 (L26): no dose, no volume, no second substance to "come down", no "antidote", no "neutralizes". */
    const allText = (lc: LocaleCard) => [lc.title, lc.body, lc.actions].flatMap((t) => (typeof t === "string" ? [t] : Object.values(t ?? {})));
    const FORBIDDEN: [RegExp, string][] = [
      [/\d+\s*(ml|mg|l\b|litros?|copos?|comprimidos?|gotas|doses?)\b/i, "a dose or a volume"],
      [/ant[íi]doto|neutraliz/i, "an 'antidote' or 'neutralizes' claim"],
      [/pra (descer|baixar)\b.*\b(toma|usa|fuma|bebe)|\b(toma|usa|fuma|bebe) (um|uma|outro|outra) .*pra (descer|baixar)/i, "a second substance to come down"],
    ];
    for (const [id, lc] of Object.entries(loc.cards)) for (const t of allText(lc)) for (const [rx, what] of FORBIDDEN) if (rx.test(t)) err(`${code}: ${id} gives ${what}: "${t.slice(0, 60)}…" (INV-030)`);
  }

  /* ── Grounding physiology (INV-027): the paced-breathing exercise must be gated by breathing=normal ── */
  for (const s of d.skills) for (const st of s.strategies) {
    if (st.interactive === "breath_pacer" && !st.requires.includes("breathing_normal")) err(`${s.id}.${st.id}: breath pacer without the breathing_normal requirement (INV-027)`);
    if (st.id === "five_senses" && !st.requires.includes("responsive")) err(`${s.id}.${st.id}: five_senses without the responsive requirement (INV-027)`);
    // Anything that changes breathing, and the cold-water shock, needs normal breathing and a responsive person.
    if (["double_sigh", "humming"].includes(st.id) && !(st.requires.includes("breathing_normal") && st.requires.includes("responsive"))) err(`${s.id}.${st.id}: breathing exercise without breathing_normal + responsive (INV-027)`);
    if (st.id === "cold_water" && !(st.requires.includes("breathing_normal") && st.requires.includes("responsive"))) err(`${s.id}.${st.id}: cold water without breathing_normal + responsive (INV-027)`);
  }

  /* ── Continuity (v0.2): journal kinds documented, scopes consistent, retention within law, lexicon present ── */
  {
    const c = d.continuity;
    const seenK = new Set<string>();
    for (const k of c.journalKinds) {
      if (!re("journalKind").test(k.id)) err(`journalKind "${k.id}" violates ${conv["journalKind"]}`);
      if (seenK.has(k.id)) err(`duplicate journalKind ${k.id}`);
      seenK.add(k.id);
      if (!k.doc) err(`journalKind ${k.id} has no doc`);
    }
    const scopes = new Set([...Object.values(c.share.audiences).flat(), ...c.share.optionalScopes]);
    for (const sc of scopes) if (!re("accessScope").test(sc)) err(`accessScope "${sc}" violates ${conv["accessScope"]}`);
    for (const [aud, list] of Object.entries(c.share.audiences)) for (const sc of list) if (c.share.optionalScopes.includes(sc)) err(`audience ${aud} lists optional scope ${sc} as default (must be chosen explicitly, D16)`);
    if (!c.share.expiryHours.includes(c.retention.shareCapsuleDefaultHours)) err(`continuity.retention.shareCapsuleDefaultHours not in share.expiryHours`);
    if (Math.max(...c.share.expiryHours) > c.retention.shareCapsuleMaxHours) err(`share.expiryHours exceeds shareCapsuleMaxHours`);
    if (c.retention.journalDays > 180 || c.retention.snapshotDays > 180) err(`continuity retention beyond 180 days`);
    if (c.buckets.RECENT >= c.buckets.RELEVANT || c.buckets.RELEVANT >= c.buckets.OLD || c.buckets.OLD > c.retention.journalDays) err(`continuity.buckets must be RECENT < RELEVANT < OLD ≤ journalDays`);
    if (c.evidence.minBetterForHelpful > c.evidence.minAttempted) err(`evidence.minBetterForHelpful > minAttempted (never satisfiable)`);
    if (c.forbiddenInference.terms.length < 5) err(`continuity.forbiddenInference needs a real lexicon`);
    for (const [code, loc] of Object.entries(LOCALES)) {
      const ct = loc.continuity;
      if (!ct) { err(`${code}: missing continuity templates`); continue; }
      for (const k of REG.strategy.keys()) if (!ct.strategyPhrases[k]) err(`${code}: continuity.strategyPhrases missing ${k}`);
      for (const h of d.hardRules) if (!ct.reasonPhrases[h.reason]) err(`${code}: continuity.reasonPhrases missing ${h.reason}`);
      const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const dump = norm(JSON.stringify(ct));
      for (const term of c.forbiddenInference.terms) if (dump.includes(norm(term))) err(`${code}: continuity templates contain forbidden term "${term}" (INV-023)`);
    }
  }

  if (d.meta.status !== "approved" && release) err(`meta.status is "${d.meta.status}" — release requires "approved"`);
  return { errors, warnings };
}

if (process.argv[1]?.endsWith("registry-lint.ts")) {
  const release = process.argv.includes("--release");
  const { errors, warnings } = lintRegistry({ release });
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  for (const e of errors) console.log(`  ✖ ${e}`);
  const summary = `registry lint: ${errors.length} error(s), ${warnings.length} warning(s)${release ? " [release mode]" : ""}`;
  if (errors.length) { console.error(`✖ ${summary}`); process.exit(1); }
  console.log(`✔ ${summary}`);
}
