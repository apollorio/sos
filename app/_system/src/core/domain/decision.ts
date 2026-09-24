import type { Band, CardId, SkillId, QuestionId, HardRuleId, PolicyRuleId, BandRuleId, ChipId } from "../../generated/registry.gen";
import type { TraceLeaf } from "../logic/predicate";
import type { Channel, Emphasis, Op } from "../registry/types";

/** What the skill layer produces: ONE foreground card (+ effects to run when it is first shown). */
export interface SkillPick {
  skill: SkillId;
  strategy: string | null;
  cardId: CardId;
  /** Most specific first. The UI picks the first locale key that exists, falling back to "default". */
  variantKeys: string[];
  questionId?: QuestionId;
  commitmentId?: string;
  onShow: Op[];
  interactive?: string;
}

export type VoiClass = "critical" | "decisive" | "irrelevant";

export interface Why {
  band: Band;
  commander?: HardRuleId;
  bandRule?: BandRuleId;
  heldByHysteresis?: boolean;
  policyRule?: PolicyRuleId | "PREREQUISITE" | "VOI_CRITICAL" | "VOI_DECISIVE" | "FORCED_QUESTION" | "TERMINAL";
  voi?: { questionId: QuestionId; class: VoiClass };
  /** Leaves of the hard rule / policy rule that fired. Generated from the SAME predicate that decided. */
  because: TraceLeaf[];
  /** Leaves of the band rule (non-P0). */
  bandBecause?: TraceLeaf[];
  alsoMatchingHardRules?: string[];
}

export interface Decision {
  band: Band;
  pick: SkillPick;
  why: Why;
  nextBand: import("./state").BandState | null;
}

export interface ActionView {
  id: string;
  emphasis: Emphasis;
  handoff?: { channel: Channel; target: string };
  unknown?: boolean;
}

export interface CardView {
  instanceId: string;
  key: string;
  cardId: CardId;
  kind: "question" | "action";
  band: Band;
  skill: SkillId | "terminal";
  strategy: string | null;
  questionId?: QuestionId;
  commitmentId?: string;
  variantKeys: string[];
  actions: ActionView[];
  interactive?: string;
}

export interface ChipView { chipId: ChipId; actionId: string }

export type Effect =
  | { type: "KEEP_AWAKE"; on: boolean }
  | { type: "VIBRATE"; pattern: number[] }
  | { type: "WIPE_STORAGE" };

export interface Output {
  card: CardView;
  chips: ChipView[];
  notice?: "TEXT_UNMATCHED" | "STALE_TAP";
  effects: Effect[];
  /** Earliest instant at which the decision could change without new input. The shell sets ONE timer. */
  nextWakeAt: number | null;
}

export interface LogEntry {
  seq: number;
  at: number;
  input: string;
  events: string[];
  band: Band;
  skill: string;
  strategy: string | null;
  cardId: CardId;
  questionId?: QuestionId;
  why: Why;
  violations: string[];
  registry: string;
  engine: string;
}

export interface StepResult {
  state: import("./state").SessionState;
  output: Output;
  log: LogEntry;
  rejected?: "DUPLICATE" | "STALE_CARD" | "UNKNOWN_ACTION" | "NOT_INITIALIZED";
}
