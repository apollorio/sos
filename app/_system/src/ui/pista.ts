/**
 * PISTA (operator view) — what the engine has learned about what was used, in plain words, for the lab operator only
 * (simulator panel, Ctrl+H). The person never sees this (L30). Pattern labels follow studies/004: a COMPATIBILITY with a
 * family of effects, never a confirmation of a substance. Pure: state in, rows out.
 */
import type { Reg } from "../core/registry";
import type { SessionState } from "../core/domain/state";
import type { Facts } from "../core/logic/predicate";
import { askable } from "../core/planner/voi";

export interface PistaRow { label: string; value: string; note: string }

const FEEL: Record<string, string> = { stim: "acelerado", downer: "pesado / lento", psychedelic: "o mundo diferente", mixed: "duas coisas juntas", none: "nada disso (mais a cabeça)" };
/** Operator labels (studies/004 families). Compatibility, not confirmation. */
export const PATTERN: Record<string, string> = {
  love_energy: "energia + conexão, música, toque · família C (MDMA-like)",
  short_wired: "acelerado em ondas curtas · família A (cocaína-like)",
  long_engine: "motor longo, sem sono · família D (metanfetamina-like)",
  spike_crash: "pancada curtíssima e vazio · família I-C (crack-like)",
  wired_unplugged: "acelerado + corpo longe · família L (estimulante + dissociativo)",
  wired_sleepy: "acelerado → sono inesperado · reabre segurança (depressor/opioide inesperado?)",
  wired_strange: "acelerado + mundo diferente · misto",
  loose_clumsy: "solto → torto, queda gradual · família B (álcool-like)",
  warm_cliff: "bem → despenca, buraco de memória · família E (GHB-like)",
  heavy_nod: "peso confortável, cabeça caindo · família I-H/J (opioide-like)",
  unplugged: "corpo desligado, espaço estranho · família K (dissociativo)",
  living_world: "coisas vivas, onda de algumas horas · família G (psilocibina-like)",
  long_patterns: "padrões, tempo quebrado, arco longo · família H (LSD-like)",
  soft_hungry: "leve, riso, fome, tempo engraçado · família F (cannabis-like)",
  buzz_brief: "tontura e calor rápidos · inalante / poppers-like",
};
const WORDS: Record<string, Record<string, string>> = {
  alcohol: { yes: "sim", no: "não" },
  meds: { erection: "pra ereção", sedative: "calmante / pra dormir", other: "outro remédio", none: "nenhum" },
  urge: { strong: "muita", some: "um pouco", no: "não" },
  discomfort: { nose: "nariz ardendo", throat: "garganta ardendo", heat: "muito calor", nausea: "enjoo", jaw: "mandíbula travando" },
};
const DISCOVERY = ["Q_FEEL", "Q_RACE_KIND", "Q_RACE_LENGTH", "Q_HEAVY_KIND", "Q_STRANGE_KIND", "Q_MIXED_KIND", "Q_ALCOHOL", "Q_MEDS", "Q_URGE", "Q_BODY"];

export function pistaRows(s: SessionState, facts: Facts, reg: Reg, phrase: (key: string) => string): PistaRow[] {
  const v = (k: string) => String(facts[`signal.${k}`] ?? "unknown");
  const said = (k: string, table: Record<string, string>) => (v(k) === "unknown" ? "ainda não sabido" : table[v(k)] ?? v(k));
  const shown = (skill: string) => (reg.data.skills.find((x) => x.id === skill)?.strategies ?? [])
    .filter((st) => (s.strategies[`${skill}.${st.id}`]?.shows ?? 0) > 0)
    .map((st) => `${phrase(`${skill}.${st.id}`)}${s.strategies[`${skill}.${st.id}`]?.doneAt != null ? " ✔" : ""}`);
  const mixing = Number(facts["risk.mixing"] ?? 0);
  const next = DISCOVERY.find((id) => {
    const q = reg.question.get(id);
    return !!q && !!s.band && !!askable(q, s, facts, s.band.current, s.lastAt, reg);
  });
  return [
    { label: "Como tá o corpo", value: said("substanceClass", FEEL), note: "pergunta de entrada, sem nomes" },
    { label: "Padrão mais compatível", value: said("pattern", PATTERN), note: "hipótese para o cuidado · nunca mostrada à pessoa" },
    { label: "Bebida junto", value: said("alcohol", WORDS.alcohol!), note: "«E bebida, rolou hoje?»" },
    { label: "Remédio hoje", value: said("meds", WORDS.meds!), note: "«Tomou algum remédio hoje?»" },
    { label: "Vontade de mais", value: said("urge", WORDS.urge!), note: "leva à onda da vontade, sem sermão" },
    { label: "No corpo", value: said("discomfort", WORDS.discomfort!), note: "pergunta ou menu «Cuidar do corpo»" },
    { label: "Mistura (0–4)", value: String(mixing), note: ["nenhuma mistura conhecida", "", "pesa (faixa P2 no mínimo)", "perigosa (faixa P1)", ""][mixing] ?? "" },
    { label: "Avisos mostrados", value: shown("combination").join(" · ") || "nenhum", note: "na hora em que a mistura aparece" },
    { label: "Cuidados dados", value: shown("care").join(" · ") || "nenhum", note: "alternam com as técnicas, sem fim" },
    { label: "Próxima pergunta", value: next ?? "nenhuma agora", note: "no máximo uma entre duas ajudas" },
    { label: "Ritmo das respostas", value: String(facts["pace"] ?? "unknown"), note: "derivado; lento = 90 s ou mais, 2 vezes" },
  ];
}
