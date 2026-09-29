/**
 * Structural types of registry/registry.json.
 * IDs are `string` here (JSON is untyped); the literal unions in src/generated/registry.gen.ts
 * are applied at the boundaries (skills map, public API). scripts/registry-lint.ts guarantees
 * that every string ID below resolves to a declared entity.
 */
import type { Pred } from "../logic/predicate";
import type { Primitive } from "../domain/signals";

export type Emphasis = "primary" | "secondary" | "low";
export type Channel = "tel" | "sms" | "whatsapp";

export type Op =
  | { op: "SIGNALS_REPORTED"; set: Record<string, Primitive>; source?: string }
  | { op: "SIGNALS_EXPIRED"; signals: string[] }
  | { op: "STRATEGY_OUTCOME"; outcome: "done" | "failed" | "declined"; skill?: string; strategy?: string }
  | { op: "STRATEGY_REQUESTED"; skill: string; strategy: string }
  | { op: "COMMITMENT_CREATED"; kind: string }
  | { op: "COMMITMENT_RESOLVED"; kind: string; outcome: "done" | "snooze" | "cancel" }
  | { op: "HANDOFF_OPENED"; channel: Channel; target: string }
  | { op: "EMERGENCY_CALL_REPORTED" }
  | { op: "HELP_ON_SCENE" }
  | { op: "CORRECTION" }
  | { op: "SESSION_END" }
  | { op: "WIPE" };

export interface SignalDef {
  id: string;
  domain: Primitive[];
  ttlSec: number | null;
  ttlByValue?: Record<string, number>;
  latched: Primitive[];
  critical: boolean;
  explicitOnly?: boolean;
  doc?: string;
}

export interface FactDef { path: string; domain: Primitive[] }

export interface InvalidationDef {
  id: string;
  on: { signal: string; value: Primitive };
  onlyIf?: Pred;
  set?: Record<string, Primitive>;
  expire?: string[];
  doc?: string;
}

export interface AnswerDef { id: string; set: Record<string, Primitive>; unknown?: boolean }
export interface QuestionVariantDef { card: string; answers: AnswerDef[] }
export interface QuestionDef {
  id: string;
  prerequisite?: boolean;
  priority: number;
  cooldownSec: number;
  maxAsks: number;
  /** L24: minimum time between two asks of this question, whatever made it askable again. */
  minIntervalSec?: number;
  bands: string[];
  variants: Record<string, QuestionVariantDef>; // "self" | "helper" | "any"
}

export interface TextTriggerRule {
  id: string;
  name: string;
  patterns: string[];
  set: Record<string, Primitive>;
  onNegated?: { ask: string };
}
export interface TextTriggersDef {
  normalization: string[];
  negators: string[];
  negationWindow: number;
  rules: TextTriggerRule[];
}

export interface HardRuleDef {
  id: string;
  name: string;
  reason: string;
  when: Pred;
  onCorrection: { reset: string[] };
  latch: boolean;
  review: string;
  doc?: string;
}

export interface RiskRuleDef { dimension: string; level: number; when: Pred }
export interface BandRuleDef { id: string; band: string; sticky: boolean; when: Pred; review?: string; doc?: string }

export interface EngagementDef {
  maxActions: number;
  maxLowEmphasis: number;
  maxAnswers: number;
  maxChars: number;
  education: boolean;
  questionBudget: number;
  /** L21: once any help has been shown, at most this many questions stand between two helps. */
  questionsBetweenHelps?: number;
  askBeforeAct: boolean;
}

export interface CommitmentDef {
  id: string;
  defaultDueSec: number;
  snoozeSec: number;
  maxSnoozes: number;
  confirmCard: string;
  onMissed: Op[];
}

export interface StrategyDef {
  id: string;
  when: Pred;
  requires: string[];
  card: string;
  onShow: Op[];
  cooldownSec: number;
  blockSec: number;
  bandsOnly?: string[];
  alwaysEligible?: boolean;
  repeatable?: boolean;
  interactive?: string;
}

export interface SkillDef {
  id: string;
  kind: "assessment" | "intervention";
  bands: string[];
  strategies: StrategyDef[];
  phases?: Record<string, Record<string, string>>;
  doc?: string;
}

export interface PolicyRuleDef { id: string; when: Pred; skill: string; question?: string }

export interface ActionDef {
  id: string;
  emphasis: Emphasis;
  ops: Op[];
  handoff?: { channel: Channel; target: string };
}
export interface CardDef {
  id: string;
  kind: "question" | "action";
  bands?: string[];
  variantKeys?: string[];
  actions?: ActionDef[];
  doc?: string;
}

/**
 * Chips live beside the card. pending: shown while a commitment is pending. tools / talk: a technique or a person the
 * person can pick at any time (L23), shown only while that strategy is eligible. report: "how I am", said when THEY want.
 */
export interface ChipDef {
  id: string;
  bands: string[];
  group: "pending" | "tools" | "talk" | "report";
  whenPending?: string;
  notice?: string;
  action: { id: string; ops: Op[] };
}

export interface ContinuityDef {
  doc?: string;
  journalKinds: { id: string; doc: string }[];
  provenance: string[];
  retention: {
    acuteStateHours: number; journalDays: number; snapshotDays: number; locationPolicy: "episode" | "never";
    securityLogDays: number; shareCapsuleDefaultHours: number; shareCapsuleMaxHours: number; shareCapsuleMaxViews: number; rawTextDays: 0;
  };
  buckets: { RECENT: number; RELEVANT: number; OLD: number; doc?: string };
  evidence: { minAttempted: number; minBetterForHelpful: number; minNegativeForUnhelpful: number; outcomeWindowSec: number; doc?: string };
  share: { audiences: Record<string, string[]>; optionalScopes: string[]; expiryHours: number[]; doc?: string };
  consent: { continuityDefault: false; emergencyPassportDefault: false; locationDefault: "unavailable"; locationOptions: string[]; doc?: string };
  forbiddenInference: { terms: string[]; doc?: string };
}

export interface RegistryData {
  conventions: { idPatterns: Record<string, string>; rules: string[] };
  meta: { registryVersion: string; engineContract: number; defaultLocale: string; region: string; status: string };
  regions: Record<string, { numbers: Record<string, { tel: string; display: string; service: string }> }>;
  bands: { id: string; rank: number; meaning: string }[];
  sources: string[];
  signals: SignalDef[];
  facts: FactDef[];
  invalidation: InvalidationDef[];
  events: { id: string; origin: string; doc: string }[];
  questions: QuestionDef[];
  textTriggers: TextTriggersDef;
  hardRules: HardRuleDef[];
  risk: { dimensions: string[]; rules: RiskRuleDef[] };
  bandRules: BandRuleDef[];
  hysteresis: { minDwellSec: Record<string, number> };
  requirements: Record<string, Pred | string>;
  engagement: Record<string, EngagementDef>;
  silence: { P0: { afterSec: number }; P1: { afterSec: number }; P2: { afterSec: number }; P3: { afterSec: number } | null; maxCount: number; resumeGapSec: number };
  commitments: CommitmentDef[];
  skills: SkillDef[];
  policies: Record<string, PolicyRuleDef[]>;
  cards: CardDef[];
  chips: ChipDef[];
  invariants: { id: string; text: string; enforcedBy: string[] }[];
  storage: { retentionHours: number; logMaxEntries: number };
  continuity: ContinuityDef;
}
