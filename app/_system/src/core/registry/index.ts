/**
 * Registry index: the ONLY place the JSON is read. Everything else receives `Reg`
 * (dependency-injected), which keeps the core pure and lets tests swap registries.
 */
import raw from "../../../registry/registry.json";
import type { RegistryData, SignalDef, QuestionDef, CardDef, SkillDef, CommitmentDef, HardRuleDef, StrategyDef, ChipDef } from "./types";
import type { Pred } from "../logic/predicate";

export interface Reg {
  data: RegistryData;
  signal: Map<string, SignalDef>;
  question: Map<string, QuestionDef>;
  card: Map<string, CardDef>;
  skill: Map<string, SkillDef>;
  strategy: Map<string, StrategyDef>; // key "skill.strategy"
  commitment: Map<string, CommitmentDef>;
  hardRule: Map<string, HardRuleDef>;
  chip: Map<string, ChipDef>;
  requirement: Map<string, Pred>;
  bandRank: Record<string, number>;
  numbers: Record<string, { tel: string; display: string; service: string }>;
  compiledTriggers: { id: string; regexes: RegExp[]; set: Record<string, string | number | boolean>; onNegated?: { ask: string } }[];
}

export function buildReg(data: RegistryData): Reg {
  const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x] as const));
  const strategy = new Map<string, StrategyDef>();
  for (const s of data.skills) for (const st of s.strategies) strategy.set(`${s.id}.${st.id}`, st);
  const requirement = new Map<string, Pred>();
  for (const [k, v] of Object.entries(data.requirements)) if (k !== "doc") requirement.set(k, v as Pred);
  const region = data.regions[data.meta.region];
  if (!region) throw new Error(`registry: unknown region ${data.meta.region}`);
  return {
    data,
    signal: byId(data.signals),
    question: byId(data.questions),
    card: byId(data.cards),
    skill: byId(data.skills),
    strategy,
    commitment: byId(data.commitments),
    hardRule: byId(data.hardRules),
    chip: byId(data.chips),
    requirement,
    bandRank: Object.fromEntries(data.bands.map((b) => [b.id, b.rank])),
    numbers: region.numbers,
    compiledTriggers: data.textTriggers.rules.map((r) => ({
      id: r.id,
      regexes: r.patterns.map((p) => new RegExp(p)),
      set: r.set,
      ...(r.onNegated ? { onNegated: r.onNegated } : {}),
    })),
  };
}

export const REG: Reg = buildReg(raw as unknown as RegistryData);
