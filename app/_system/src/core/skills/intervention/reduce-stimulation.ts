/**
 * REDUCE_STIMULATION — strategies (in registry order): relocate → in_place. 'Não consigo' on relocate blocks it (L09) and in_place takes over with no extra code.
 * Behaviour lives in registry.json (skills[id="reduce_stimulation"]). Add bespoke logic here only if data cannot express it.
 */
import { strategySkill } from "../strategy-skill";

export const reduceStimulation = strategySkill("reduce_stimulation");
