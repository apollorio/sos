/**
 * CONTACT_TRUSTED_PERSON — strategies (in registry order): stay_close (with someone) → message_whatsapp (online) → message_sms → crisis_line (self only, CVV 188). Handoffs are native links: no server, no number stored, no bot surface.
 * Behaviour lives in registry.json (skills[id="contact_trusted_person"]). Add bespoke logic here only if data cannot express it.
 */
import { strategySkill } from "../strategy-skill";

export const contactTrustedPerson = strategySkill("contact_trusted_person");
