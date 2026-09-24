import type { SignalId, SignalDomain, Source } from "../../generated/registry.gen";

export type Primitive = string | number | boolean;
export type { Source };

/**
 * A signal is a FACT WITH AN AGE. Never a bare boolean.
 * No numeric "confidence": every value comes from a discrete, explainable `source` (L01).
 */
export interface SignalRecord<V extends Primitive = Primitive> {
  value: V;
  source: Source;
  observedAt: number;
  /** null = never expires (latched critical values, or TTL-less signals). */
  expiresAt: number | null;
}

export type SignalTable = { [K in SignalId]?: SignalRecord<SignalDomain[K]> };

export const UNKNOWN = "unknown" as const;
