import type { Band, NonP0Band, QuestionId } from "../../generated/registry.gen";
import type { SignalTable } from "./signals";
import type { CardView } from "./decision";

export interface Commitment {
  id: string;
  kind: string;
  status: "pending" | "done" | "cancelled" | "missed";
  createdAt: number;
  dueAt: number;
  snoozes: number;
}

export interface StrategyMemory {
  doneAt: number | null;
  blockedUntil: number | null;
  shows: number;
}

export interface QuestionMemory {
  asks: number;
  lastAskedAt: number | null;
  lastUnknownAt: number | null;
}

export interface BandState {
  current: NonP0Band;
  since: number;
  ruleId: string;
  sticky: boolean;
}

export interface SessionState {
  v: 1;
  sessionId: string;
  status: "active" | "ended" | "wiped";
  seq: number;
  startedAt: number;
  lastAt: number;
  lastHumanAt: number;

  signals: SignalTable;
  anxietyHistory: { value: number; at: number }[];

  band: BandState | null;
  /** Band actually shown last (includes P0). Drives silence windows. */
  shownBand: Band | null;
  p0: { ruleId: string; reason: string; since: number; latch: boolean } | null;

  flags: { emergencyEngaged: boolean; helpOnScene: boolean; resumedAfterGap: boolean };
  connectivity: "online" | "offline";
  visibility: { visible: boolean; since: number };
  silence: { count: number; windowStart: number };

  card: (CardView & { shownAt: number }) | null;
  cardHistory: CardView[];

  questions: Partial<Record<QuestionId, QuestionMemory>>;
  questionsInARow: number;
  forcedQuestion: string | null;

  strategies: Record<string, StrategyMemory>;
  repeat: { key: string; count: number };
  commitments: Commitment[];
  commitmentSeq: number;

  seenInputIds: string[];
}

export function initialState(sessionId: string, now: number): SessionState {
  return {
    v: 1,
    sessionId,
    status: "active",
    seq: 0,
    startedAt: now,
    lastAt: now,
    lastHumanAt: now,
    signals: {},
    anxietyHistory: [],
    band: null,
    shownBand: null,
    p0: null,
    flags: { emergencyEngaged: false, helpOnScene: false, resumedAfterGap: false },
    connectivity: "online",
    visibility: { visible: true, since: now },
    silence: { count: 0, windowStart: now },
    card: null,
    cardHistory: [],
    questions: {},
    questionsInARow: 0,
    forcedQuestion: null,
    strategies: {},
    repeat: { key: "", count: 0 },
    commitments: [],
    commitmentSeq: 0,
    seenInputIds: [],
  };
}
