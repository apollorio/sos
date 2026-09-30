/**
 * PROVENANCE — every datum that leaves the acute plane says where it came from (L15, INV-022).
 * A hospital summary must be able to say "the person reported" vs "the app derived". Never a bare value.
 */
import type { Provenance, Source } from "../../generated/registry.gen";

export type ConfidenceClass = "explicit" | "derived" | "unknown";
export type Actor = "self" | "helper" | "unknown";

export interface Datum<T> {
  value: T;
  provenance: Provenance;
  observedAt: number;
  confidenceClass: ConfidenceClass;
}

/** Who said it. A text trigger is still the person's own words (explicit), but the match is an interpretation. */
export function provenanceOf(source: Source, actor: Actor): Provenance {
  switch (source) {
    case "user_explicit":
    case "text_trigger":
      return actor === "helper" ? "helper_explicit" : "user_explicit";
    case "derived_rule":
      return "derived";
    case "system":
      return "runtime_observed";
  }
}

export function confidenceOf(source: Source): ConfidenceClass {
  return source === "user_explicit" || source === "system" ? "explicit" : "derived";
}
