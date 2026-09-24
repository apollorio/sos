/**
 * STEADY_CHECK — strategies (in registry order): tips (P3, by substance class) → check_later (P3) → hold (ANY band, always eligible). 'hold' is what makes decide() total by construction (INV-018).
 * Behaviour lives in registry.json (skills[id="steady_check"]). Add bespoke logic here only if data cannot express it.
 */
import { strategySkill } from "../strategy-skill";

export const steadyCheck = strategySkill("steady_check");
