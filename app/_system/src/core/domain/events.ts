/**
 * Two layers of events:
 *   RawInput    — what the UI / runtime hands to the core (a tap, a text, a visibility change).
 *   DomainEvent — what the reducer understands. Only ingest/ translates Raw → Domain.
 * The UI never fabricates domain events (L01: the app only records what it observed).
 */
import type { Channel, Op } from "../registry/types";
import type { Primitive, Source } from "./signals";

export type RawInput =
  | { kind: "boot"; id: string; at: number; sessionId: string }
  | { kind: "tap"; id: string; at: number; cardInstanceId: string; actionId: string }
  | { kind: "chip"; id: string; at: number; chipId: string }
  | { kind: "text"; id: string; at: number; text: string }
  | { kind: "shell"; id: string; at: number; action: "call_192" }
  | { kind: "runtime"; id: string; at: number; event: "APP_HIDDEN" | "APP_VISIBLE" | "ONLINE" | "OFFLINE" | "TICK" };

export type DomainEvent =
  | { type: "SESSION_STARTED"; sessionId: string }
  | { type: "SIGNALS_REPORTED"; set: Record<string, Primitive>; source: Source; questionId?: string; unknownAnswer?: boolean; triggerId?: string }
  | { type: "SIGNALS_EXPIRED"; signals: string[] }
  | { type: "STRATEGY_OUTCOME"; skill: string; strategy: string; outcome: "done" | "failed" | "declined" }
  | { type: "COMMITMENT_CREATED"; kind: string }
  | { type: "COMMITMENT_RESOLVED"; kind: string; outcome: "done" | "snooze" | "cancel" }
  | { type: "HANDOFF_OPENED"; channel: Channel; target: string }
  | { type: "EMERGENCY_CALL_REPORTED" }
  | { type: "HELP_ON_SCENE" }
  | { type: "CORRECTION" }
  | { type: "QUESTION_FORCED"; questionId: string; triggerId: string }
  | { type: "TEXT_UNMATCHED" }
  | { type: "SESSION_END" }
  | { type: "WIPE" }
  | { type: "APP_HIDDEN" }
  | { type: "APP_VISIBLE" }
  | { type: "CONNECTIVITY"; online: boolean }
  | { type: "TICK" };

export type DomainEventType = DomainEvent["type"];

/** Human events reset silence. Runtime events never do (L06). */
export const HUMAN_INPUT_KINDS: ReadonlySet<RawInput["kind"]> = new Set(["tap", "chip", "text", "shell"]);

export type { Op };
