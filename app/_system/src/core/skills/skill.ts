/**
 * SKILL CONTRACT
 * A skill never decides WHETHER it runs (that is the policy table's job).
 * It only answers: "given this state, which ONE card do I show, or can I not help right now?"
 * Returning null lets the policy fall through to the next rule — this is how
 * "Não consigo" re-routes the flow without any hardcoded branching (L09).
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { SkillPick } from "../domain/decision";
import type { Facts } from "../logic/predicate";
import type { Band, SkillId } from "../../generated/registry.gen";
import type { Commander } from "../safety/hard-rules";

export interface SkillCtx {
  state: SessionState;
  facts: Facts;
  band: Band;
  now: number;
  reg: Reg;
  commander?: Commander;
  questionId?: string;
}

export interface Skill {
  id: SkillId;
  select(ctx: SkillCtx): SkillPick | null;
}
