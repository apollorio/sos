/**
 * GROUNDING — strategies (in registry order): breath_pacer (interactive 'human step' micro-game) → feet_floor → five_senses. 'done' expires anxiety on purpose so the VOI engine re-asks it.
 * Behaviour lives in registry.json (skills[id="grounding"]). Add bespoke logic here only if data cannot express it.
 */
import { strategySkill } from "../strategy-skill";

export const grounding = strategySkill("grounding");
