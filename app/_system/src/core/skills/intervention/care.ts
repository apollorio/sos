/**
 * CARE — practical care tips, in registry order: combination warnings first (what was mixed), then the substance,
 * then what bothers the body (nose, throat, heat, nausea, jaw), then everyday care anyone can do (water in sips,
 * fresh air, something to eat, brushing teeth, a cool shower when it is safe). Alternates with grounding (help.last),
 * so the loop never ends in a question and never repeats the same tip inside its cooldown.
 * Behaviour lives in registry.json (skills[id="care"]). Add bespoke logic here only if data cannot express it.
 */
import { strategySkill } from "../strategy-skill";

export const care = strategySkill("care");
