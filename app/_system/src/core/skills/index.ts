/**
 * SKILL REGISTRY — `{ [K in SkillId]: Skill }` makes this map EXHAUSTIVE AT COMPILE TIME:
 * adding a skill to registry.json without implementing it here is a type error, and so is
 * implementing a skill that the registry does not declare.
 */
import type { SkillId } from "../../generated/registry.gen";
import type { Skill } from "./skill";
import { assess } from "./assessment/assess";
import { emergencyEscalation } from "./intervention/emergency-escalation";
import { confirmCommitment } from "./intervention/confirm-commitment";
import { reduceStimulation } from "./intervention/reduce-stimulation";
import { contactTrustedPerson } from "./intervention/contact-trusted-person";
import { grounding } from "./intervention/grounding";
import { steadyCheck } from "./intervention/steady-check";

export const SKILLS: { readonly [K in SkillId]: Skill } = {
  assess,
  emergency_escalation: emergencyEscalation,
  reduce_stimulation: reduceStimulation,
  contact_trusted_person: contactTrustedPerson,
  confirm_commitment: confirmCommitment,
  grounding,
  steady_check: steadyCheck,
};
