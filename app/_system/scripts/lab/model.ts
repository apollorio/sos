/**
 * BETA LAB MODEL — pure data for the lab pages, derived from the registry, the locale and the golden scenarios.
 * Nothing here is hand-written copy about what the engine does: the clinical review sheet lists what the registry
 * and pt-BR.json actually contain, and every tester mission is a golden scenario replayed through the real engine
 * (so `npm test` proves each "você deve ver" line). Only mission titles and stories are editorial.
 */
import { createHash } from "node:crypto";
import { REG } from "../../src/core/registry";
import { REGISTRY_HASH } from "../../src/generated/registry.gen";
import { LOCALES, resolveCard, type LocaleCard } from "../../src/ui/locale";
import { SCENARIOS, runScenario, type Step } from "../../tests/scenarios/scenarios";
import { lintRegistry } from "../registry-lint";

const L = LOCALES["pt-BR"]!;
// The registry JSON is typed loosely on purpose here: the lab only reads and displays it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D = REG.data as any;

type Pred = Record<string, unknown>;
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 10);

/* ───────────────────────────── readable conditions (display only) ───────────────────────────── */

const NAMES: Record<string, string> = {
  "signal.actor": "quem está com o celular", "signal.responsiveness": "responde", "signal.breathing": "respiração",
  "signal.chest": "dor no peito", "signal.seizure": "convulsão", "signal.syncope": "desmaio relatado",
  "signal.selfHarm": "intenção de se ferir", "signal.physicallyUnsafe": "em perigo físico", "signal.anxiety": "ansiedade (0–4)",
  "signal.noise": "barulho", "signal.company": "companhia", "signal.companion": "alguém a caminho",
  "signal.substanceClass": "substância", "signal.reportedTrend": "como está agora (relatado)",
  "risk.medical": "risco médico", "risk.impairment": "comprometimento", "risk.isolation": "isolamento", "risk.emotional": "risco emocional",
  "risk.environmental": "ambiente", "risk.uncertainty": "incerteza", "silence.count": "janelas sem resposta",
  "session.emergencyEngaged": "emergência já acionada", connectivity: "conexão", trend: "tendência",
};
const name = (path: string) => NAMES[path] ?? path;

/** "signal.X=value" → the answer labels that record it, so a clinician reads the words the person tapped. */
function answerIndex(): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const q of D.questions as { variants: Record<string, { card: string; answers: { id: string; set: Record<string, unknown> }[] }> }[]) {
    for (const v of Object.values(q.variants)) {
      const labels = L.cards[v.card]?.actions ?? {};
      for (const a of v.answers) for (const [sig, val] of Object.entries(a.set)) {
        const k = `signal.${sig}=${String(val)}`;
        const label = labels[a.id];
        if (label && !(idx.get(k) ?? []).includes(`«${label}»`)) idx.set(k, [...(idx.get(k) ?? []), `«${label}»`]);
      }
    }
  }
  for (const t of D.textTriggers.rules as { id: string; set: Record<string, unknown> }[])
    for (const [sig, val] of Object.entries(t.set)) { const k = `signal.${sig}=${String(val)}`; idx.set(k, [...(idx.get(k) ?? []), `texto ${t.id}`]); }
  return idx;
}
const ANSWERS = answerIndex();
const VALUES: Record<string, string> = { yes: "sim", no: "não", unknown: "desconhecido", true: "sim", false: "não" };
const withAnswers = (path: string, v: unknown) => {
  const a = ANSWERS.get(`${path}=${String(v)}`);
  const shown = VALUES[String(v)] ?? String(v);
  return a ? `${shown} (${a.join(", ")})` : shown;
};

export function describePredicate(p: Pred): string {
  if ("always" in p) return "sempre";
  if ("all" in p) return (p["all"] as Pred[]).map((c) => ("any" in c ? `(${describePredicate(c)})` : describePredicate(c))).join(" e ");
  if ("any" in p) return (p["any"] as Pred[]).map(describePredicate).join(" ou ");
  if ("not" in p) return `não (${describePredicate(p["not"] as Pred)})`;
  if ("eq" in p) { const [a, b] = p["eq"] as [string, unknown]; return `${name(a)} = ${withAnswers(a, b)}`; }
  if ("neq" in p) { const [a, b] = p["neq"] as [string, unknown]; return `${name(a)} ≠ ${withAnswers(a, b)}`; }
  if ("in" in p) { const [a, b] = p["in"] as [string, unknown[]]; return `${name(a)} ∈ {${b.map((x) => withAnswers(a, x)).join(", ")}}`; }
  if ("gte" in p) { const [a, b] = p["gte"] as [string, number]; return `${name(a)} ≥ ${b}`; }
  if ("lte" in p) { const [a, b] = p["lte"] as [string, number]; return `${name(a)} ≤ ${b}`; }
  if ("known" in p) return `${name(p["known"] as string)} é conhecido`;
  if ("unknown" in p) return `${name(p["unknown"] as string)} é desconhecido`;
  return JSON.stringify(p);
}

/** Expands a text-trigger regex into readable examples: groups (a|b), optional groups, [oa] classes, \w* → "…". */
export function expandPattern(re: string, cap = 12): string[] {
  const out = expandRaw(re, cap);
  return out ? out.map((s) => s.replace(/\s+/g, " ").trim()) : [re];
}
function expandRaw(re: string, cap: number): string[] | null {
  const segs: string[][] = [];
  let i = 0;
  const src = re.replace(/\\b/g, "");
  try {
    while (i < src.length) {
      const c = src[i]!;
      let alts: string[];
      if (c === "(") {
        const end = src.indexOf(")", i);
        if (end < 0) throw new Error("unbalanced");
        const inner = src.slice(i + 1, end).split("|").map((a) => (a ? expandRaw(a, cap) : [""]));
        if (inner.some((x) => x === null)) throw new Error("unsupported");
        alts = (inner as string[][]).flat();
        i = end + 1;
      } else if (c === "[") {
        const end = src.indexOf("]", i);
        if (end < 0) throw new Error("unbalanced");
        alts = src.slice(i + 1, end).split("");
        i = end + 1;
      } else if (c === "\\") {
        const n = src[i + 1];
        if (n === "w" && src[i + 2] === "*") { alts = ["…"]; i += 3; }
        else if (n === "s") { alts = [" "]; i += 2; }
        else throw new Error("escape");
        segs.push(alts);
        continue;
      } else if ("|*+{}^$.".includes(c)) {
        throw new Error("unsupported");
      } else { alts = [c]; i += 1; }
      if (src[i] === "?") { alts = [...alts, ""]; i += 1; }
      segs.push(alts);
    }
  } catch {
    return null;
  }
  let out = [""];
  for (const s of segs) out = out.flatMap((pre) => s.map((a) => pre + a)).slice(0, cap);
  return out;
}

/* ───────────────────────────── clinical review sheet ───────────────────────────── */

export interface ReviewField { label: string; text: string }
export interface ReviewItem { id: string; title: string; status: string; fields: ReviewField[]; hash: string }
export interface ReviewSection { id: string; title: string; question: string; optional: boolean; items: ReviewItem[] }

const STATUS: Record<string, string> = {
  draft: "rascunho", clinical: "aprovado por clínico", editorial: "revisão editorial", required: "revisão obrigatória",
  proposed: "proposta: precisa de aprovação", approved: "aprovado",
};
const statusLabel = (s: string | undefined) => (s ? STATUS[s] ?? s : "—");

function textFields(t: LocaleCard["title"] | undefined, label: string): ReviewField[] {
  if (t === undefined) return [];
  if (typeof t === "string") return t ? [{ label, text: t }] : [];
  return Object.entries(t).filter(([, v]) => v).map(([k, v]) => ({ label: k === "default" ? label : `${label} · ${variantLabel(k)}`, text: v }));
}
function variantLabel(k: string): string {
  return k.split(".").map((p) => ({ self: "a própria pessoa", helper: "quem ajuda", stim: "estimulantes", downer: "depressores",
    psychedelic: "psicodélicos", unknown: "desconhecido" } as Record<string, string>)[p] ?? p).join(" · ");
}
function cardFields(cardId: string): ReviewField[] {
  const c = L.cards[cardId];
  if (!c) return [{ label: "⚠", text: `sem texto no locale para ${cardId}` }];
  return [
    ...textFields(c.title, "Título"),
    ...textFields(c.body, "Texto"),
    ...(c.aside ? [{ label: "Nota", text: c.aside }] : []),
    ...(Object.keys(c.actions).length ? [{ label: "Botões", text: Object.values(c.actions).map((a) => `«${a}»`).join("  ") }] : []),
  ];
}
function item(id: string, title: string, status: string | undefined, fields: ReviewField[]): ReviewItem {
  return { id, title, status: statusLabel(status), fields, hash: hash({ id, fields }) };
}

export function reviewSections(): ReviewSection[] {
  const cards = D.cards as { id: string; kind: string }[];
  const p0Call = L.cards["CARD_P0_CALL"]!;
  const p0Body = typeof p0Call.body === "string" ? { default: p0Call.body } : p0Call.body;

  const hard = (D.hardRules as { id: string; name: string; reason: string; when: Pred; review: string; latch?: boolean }[]).map((h) => item(
    h.id, `${h.id} · ${h.name}`, h.review, [
      { label: "Condição", text: describePredicate(h.when) },
      { label: "Mantida até a pessoa corrigir", text: h.latch ? "sim (não some com o tempo)" : "não" },
      ...Object.entries(p0Body).filter(([k]) => k === h.reason || k.startsWith(`${h.reason}.`))
        .map(([k, v]) => ({ label: `Mensagem${k.includes(".") ? ` · ${variantLabel(k.split(".").slice(1).join("."))}` : ""}`, text: v })),
    ]));

  const p0 = cards.filter((c) => c.id.startsWith("CARD_P0_")).map((c) => item(c.id, c.id, L.cards[c.id]?.review, cardFields(c.id)));

  const questionCards = new Map<string, { id: string; set: Record<string, unknown> }[]>();
  for (const q of D.questions as { variants: Record<string, { card: string; answers: { id: string; set: Record<string, unknown> }[] }> }[])
    for (const v of Object.values(q.variants)) questionCards.set(v.card, v.answers);
  // Wider than the release lint on purpose: every question can move the triage, so every question is asked to be signed.
  const triageIds = cards.filter((c) => c.kind === "question").map((c) => c.id);
  const triage = triageIds.map((id) => {
    const lc = L.cards[id]!;
    const answers = questionCards.get(id) ?? [];
    return item(id, id, lc.review, [
      ...textFields(lc.title, "Pergunta"), ...textFields(lc.body, "Texto"),
      ...answers.map((a) => ({ label: `«${lc.actions[a.id] ?? a.id}»`, text: `registra: ${Object.entries(a.set).map(([k, v]) => `${name(`signal.${k}`)} = ${String(v)}`).join(", ") || "nada"}` })),
    ]);
  });

  const riskRules = D.risk.rules as { dimension: string; level: number; when: Pred }[];
  const risk = (D.risk.dimensions as string[]).filter((d) => riskRules.some((r) => r.dimension === d)).map((d) => item(
    `RISK-${d}`, name(`risk.${d}`), undefined,
    riskRules.filter((r) => r.dimension === d).map((r) => ({ label: `nível ${r.level}`, text: describePredicate(r.when) }))));

  const bandMeaning: Record<string, string> = { P0: "emergência: 192 primeiro", P1: "segurança ou companhia primeiro", P2: "sofrimento importante, ainda interativo", P3: "estável: apoio leve" };
  const bands = (D.bandRules as { id: string; band: string; when: Pred; sticky?: boolean; review?: string; doc?: string }[]).map((b) => item(
    b.id, `${b.id} → ${b.band}`, b.review, [
      { label: "Faixa", text: `${b.band}: ${bandMeaning[b.band] ?? ""}` },
      { label: "Condição", text: describePredicate(b.when) },
      { label: "Só desce com resposta explícita", text: b.sticky ? "sim" : "não" },
    ]));

  const req = D.requirements as Record<string, Pred>;
  const shownBy = new Map<string, string[]>();
  for (const s of D.skills as { id: string; strategies: { id: string; card: string; when: Pred; requires: string[] }[] }[])
    for (const st of s.strategies) {
      // Requirements are flattened and de-duplicated (e.g. "movement" and "safe_location" both exclude physical danger).
      const clauses = st.requires.flatMap((r) => (req[r] ? ("all" in req[r]! ? (req[r]!["all"] as Pred[]) : [req[r]!]) : []));
      const uniq = [...new Map(clauses.map((c) => [JSON.stringify(c), c])).values()];
      shownBy.set(st.card, [...(shownBy.get(st.card) ?? []),
        `estratégia ${s.id}.${st.id}: quando ${describePredicate(st.when)}${uniq.length ? `; só se ${describePredicate({ all: uniq })}` : ""}`]);
    }
  // Every card a strategy can show (grounding included: its contraindications were audit 003's first blocker).
  const guidanceIds = cards.filter((c) => c.kind === "action" && !c.id.startsWith("CARD_P0_") && (shownBy.has(c.id) || L.cards[c.id]?.clinical)).map((c) => c.id);
  const guidance = guidanceIds.map((id) => item(id, id, L.cards[id]?.review, [
    ...(shownBy.get(id) ?? []).map((t) => ({ label: "Aparece", text: t })),
    ...cardFields(id),
  ]));

  const text = (D.textTriggers.rules as { id: string; name: string; patterns: string[]; set: Record<string, unknown>; onNegated?: { ask: string } }[]).map((t) => item(
    t.id, `${t.id} · ${t.name}`, undefined, [
      { label: "Exemplos que acionam", text: t.patterns.flatMap((p) => expandPattern(p)).map((e) => `«${e}»`).join("  ") },
      { label: "O que registra", text: Object.entries(t.set).map(([k, v]) => `${name(`signal.${k}`)} = ${String(v)}`).join(", ") },
      { label: "Com negação", text: `(${(D.textTriggers.negators as string[]).join(", ")}) antes da frase: não age, pergunta ${t.onNegated?.ask ?? "—"}` },
    ]));

  const otherIds = cards.filter((c) => !c.id.startsWith("CARD_P0_") && !triageIds.includes(c.id) && !guidanceIds.includes(c.id)).map((c) => c.id);
  const other = otherIds.map((id) => item(id, id, L.cards[id]?.review, [...(shownBy.get(id) ?? []).map((t) => ({ label: "Aparece", text: t })), ...cardFields(id)]));

  return [
    { id: "hard", title: "Regras de emergência: «Ligue 192» antes de qualquer pergunta", question: "A condição justifica mostrar «Ligue 192» primeiro? A ordem está certa? A regra de número menor comanda quando várias valem ao mesmo tempo.", optional: false, items: hard },
    { id: "p0", title: "Telas de emergência", question: "A orientação é correta e segura para uma pessoa leiga, em até 200 caracteres?", optional: false, items: p0 },
    { id: "triage", title: "Perguntas de triagem", question: "Cada opção significa exatamente o que o app registra?", optional: false, items: triage },
    { id: "guidance", title: "Orientações, exercícios e contraindicações", question: "O texto é correto, não julgador e sem orientação de dose? As condições de quando aparece (e quando nunca aparece) bastam?", optional: false, items: guidance },
    { id: "risk", title: "Como o app estima o risco", question: "Os níveis (0 a 4) fazem sentido clinicamente? O nível de cada dimensão é o maior entre as linhas que valem.", optional: false, items: risk },
    { id: "bands", title: "Faixas de gravidade", question: "Cada regra leva à faixa certa? Faixas marcadas «só desce com resposta explícita» nunca baixam só com o tempo.", optional: false, items: bands },
    { id: "text", title: "Frases que acionam o app (texto livre)", question: "Faltam jeitos comuns de dizer isso no Brasil? Há falsos positivos? Acentos e maiúsculas são ignorados.", optional: false, items: text },
    { id: "other", title: "Outros textos (editorial, opcional)", question: "O tom é acolhedor e claro?", optional: true, items: other },
  ];
}

/* ───────────────────────────── tester missions ───────────────────────────── */

export interface MissionDef { scenario: string; title: string; who: "self" | "helper"; story: string; watch: string }
export interface MissionStep { act: string; see: string; p0: boolean; warn?: string }
export interface Mission extends MissionDef { minutes: number; steps: MissionStep[]; doc: string }

/** Editorial layer only: which golden scenarios become missions, and how the situation is told to a tester. */
export const MISSIONS: MissionDef[] = [
  { scenario: "helper-unresponsive", who: "helper", title: "Um amigo não responde",
    story: "Você está numa festa e encontra um amigo caído. Você chama e ele não responde.",
    watch: "Chegou em «Ligue 192» em até 2 toques? Enquanto espera o SAMU, dá pra entender o que fazer?" },
  { scenario: "self-club-panic-loud", who: "self", title: "Pânico na pista, som alto",
    story: "Você está numa festa com amigos por perto. Bateu um pânico forte e o som está muito alto.",
    watch: "As perguntas pareceram necessárias? O exercício e a sugestão de sair do barulho fazem sentido?" },
  { scenario: "cant-move", who: "self", title: "Não dá pra sair do lugar",
    story: "Mesma festa, mesmo pânico. O app sugere ir pra um lugar mais calmo, mas você não consegue sair de onde está.",
    watch: "O app mudou de estratégia sem fazer você se sentir culpado(a)?" },
  { scenario: "self-alone-friend-coming", who: "self", title: "Sozinho(a), chamando alguém",
    story: "Você está sozinho(a), bem ansioso(a), e decide chamar alguém de confiança.",
    watch: "O convite para mandar mensagem é claro? Quando você volta, o app lembra que alguém está vindo?" },
  { scenario: "nobody-to-call", who: "self", title: "Não tenho ninguém pra chamar",
    story: "Você está sozinho(a) e ansioso(a), mas não tem ninguém pra quem mandar mensagem.",
    watch: "O app ofereceu outro caminho sem beco sem saída?" },
  { scenario: "text-trigger-and-correction", who: "self", title: "Escrevendo o que acontece",
    story: "Em vez de tocar nas opções, você escreve o que está sentindo. Depois percebe que se enganou.",
    watch: "A frase levou direto à emergência? O botão «Me enganei» desfez e perguntou de novo?" },
  { scenario: "negated-text-asks", who: "self", title: "Uma frase com «não»",
    story: "Você escreve uma frase dizendo que NÃO tem um sintoma.",
    watch: "O app entendeu a negação e perguntou, em vez de disparar uma emergência?" },
  { scenario: "abnormal-breathing-no-pacer", who: "helper", title: "Respiração estranha (ajudando alguém)",
    story: "Você está com uma pessoa que responde, mas respira de um jeito estranho e está ansiosa.",
    watch: "O app evitou exercício de respiração? Os textos falam com você (quem ajuda) e não com a pessoa em crise?" },
  { scenario: "impaired-no-five-senses", who: "self", title: "Pensamento confuso",
    story: "Você está com dificuldade de pensar com clareza e muito ansioso(a).",
    watch: "Os exercícios propostos foram simples o bastante pra quem está confuso(a)?" },
  { scenario: "shell-192-anytime", who: "self", title: "A barra do 192 a qualquer momento",
    story: "No meio das perguntas, você decide que precisa ligar pro SAMU.",
    watch: "A barra vermelha estava sempre visível? O app respeitou a decisão sem perguntar mais nada?" },
  { scenario: "silence-brings-presence", who: "self", title: "Fazendo um exercício com calma",
    story: "Você está fazendo uma técnica e fica alguns minutos sem tocar em nada.",
    watch: "O app esperou você, sem perguntar «tudo bem?» e sem trocar de tela?" },
  { scenario: "menu-pick-and-blocks", who: "self", title: "Escolhendo pelo menu",
    story: "Você não tem água por perto e prefere escolher a técnica você mesmo(a).",
    watch: "Dava pra escolher outra técnica a qualquer momento? O app respeitou o que você disse?" },
  { scenario: "calm-end-and-wipe", who: "self", title: "Tô bem: encerrar e apagar",
    story: "Você está tranquilo(a) e quer encerrar e apagar tudo do aparelho.",
    watch: "Ficou claro que nada ficou guardado? O app recomeçou do zero?" },
];

function fmtWait(sec: number): string {
  if (sec >= 90) return `cerca de ${Math.round(sec / 60)} min`;
  return `cerca de ${sec} s`;
}

export function missions(): Mission[] {
  return MISSIONS.map((m) => {
    const sc = SCENARIOS.find((s) => s.name === m.scenario);
    if (!sc) throw new Error(`mission ${m.scenario}: no such golden scenario`);
    const ran = runScenario(sc);
    const failures = ran.flatMap((r) => r.failures);
    if (failures.length) throw new Error(`mission ${m.scenario}: scenario fails: ${failures.join("; ")}`);
    let hidden = false;
    const steps: MissionStep[] = sc.steps.map((st: Step, i) => {
      const before = resolveCard(ran[i]!.output.card, L, REG);
      const after = ran[i + 1]!;
      const res = resolveCard(after.output.card, L, REG);
      const wait = (st.after ?? 2) >= 30 ? fmtWait(st.after ?? 0) : "";
      let act: string;
      let warn: string | undefined;
      if ("answer" in st || "tap" in st) {
        const id = "answer" in st ? st.answer : st.tap;
        const a = before.actions.find((x) => x.id === id);
        if (!a) throw new Error(`mission ${m.scenario}: step ${i + 1}: no action ${id} on ${ran[i]!.output.card.cardId}`);
        act = `${wait ? `Espere ${wait}. Depois toque` : "Toque"} em «${a.label}»`;
        if (a.href?.startsWith("tel:")) warn = `Abre o discador (${a.href.slice(4)}). Cancele: não complete a ligação em teste.`;
        else if (a.href?.startsWith("https://wa.me") || a.href?.startsWith("sms:")) warn = "Abre o WhatsApp ou o SMS com uma mensagem pronta. Não envie: volte ao app.";
      } else if ("text" in st) act = `Escreva «${st.text}» no campo de texto e envie`;
      else if ("runtime" in st) {
        if (st.runtime === "APP_HIDDEN") { act = "Saia do app (abra outro app ou bloqueie a tela)"; hidden = true; }
        else if (st.runtime === "APP_VISIBLE") { act = `Volte ao app${wait ? ` depois de ${wait}` : ""}`; hidden = false; }
        else if (st.runtime === "TICK") act = hidden ? `Continue fora do app por ${fmtWait(st.after ?? 2)}` : `Espere ${fmtWait(st.after ?? 2)} com o app aberto, sem tocar em nada`;
        else throw new Error(`mission ${m.scenario}: runtime ${st.runtime} is not something a tester can do`);
      } else if ("shell" in st) {
        act = "Toque na barra vermelha «Ligar 192» no topo";
        warn = "Abre o discador (192). Cancele: não complete a ligação em teste.";
      } else if ("chip" in st) {
        const label = L.chips[st.chip]?.label ?? st.chip;
        const where = REG.chip.get(st.chip)?.group === "pending" ? "" : " no menu";
        act = after.rejected ? `Procure «${label}» no menu abaixo do cartão` : `${wait ? `Espere ${wait}. Depois toque` : "Toque"} em «${label}»${where}`;
      }
      else throw new Error(`mission ${m.scenario}: step kind not supported for testers`);
      const notice = after.output.notice ? L.notices[after.output.notice] : "";
      const see = after.state.status === "wiped" ? "Tudo é apagado do aparelho e o app recomeça pela primeira pergunta."
        : hidden ? "Nada: o app está em segundo plano e não conta esse tempo como silêncio."
        : "chip" in st && after.rejected ? "Não está lá: o app tirou essa opção do menu."
        : `${notice ? `«${notice}» ` : ""}«${res.title}»${res.body ? ` · ${res.body}` : ""}`;
      return { act, see, p0: after.log.band === "P0" && !hidden, ...(warn ? { warn } : {}) };
    });
    const minutes = Math.max(1, Math.round(sc.steps.reduce((t, s) => t + (s.after ?? 20), 0) / 60));
    return { ...m, minutes, steps, doc: sc.doc };
  });
}

/* ───────────────────────────── build facts shown on every lab page ───────────────────────────── */

export interface LabFacts { registryHash: string; registryVersion: string; bundle: string; pending: number; pendingItems: string[] }
export function labFacts(bundle: string): LabFacts {
  const errs = lintRegistry({ release: true }).errors;
  return { registryHash: REGISTRY_HASH, registryVersion: D.meta.registryVersion as string, bundle, pending: errs.length, pendingItems: errs };
}

/** Not a golden scenario (it needs a real browser going offline): verified by `npm run e2e` instead. */
export function offlineMission(): Mission {
  const first = resolveCard(runScenario({ name: "boot", doc: "", steps: [] })[0]!.output.card, L, REG).title;
  return {
    scenario: "e2e:offline", who: "self", title: "Sem internet", minutes: 3, doc: "Verified by npm run e2e (offline reload served by the service worker).",
    story: "Você abriu o app uma vez com internet. Depois a internet cai (por exemplo, no meio de uma festa).",
    watch: "O app abriu mesmo sem internet? A barra do 192 estava lá?",
    steps: [
      { act: "Com internet, abra o app e espere a primeira pergunta aparecer", see: `«${first}»`, p0: false },
      { act: "Feche o app e ative o modo avião", see: "Nada ainda.", p0: false },
      { act: "Abra o app de novo pelo mesmo endereço", see: `A barra vermelha «Ligar 192» e «${first}», mesmo sem internet.`, p0: false },
    ],
  };
}
