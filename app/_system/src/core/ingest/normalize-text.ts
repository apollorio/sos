/**
 * Normalization pipeline (registry.textTriggers.normalization):
 *   nfd_strip_marks → lowercase → non_alnum_to_space → collapse_spaces
 * "Não CONSIGO   respirar!!" → "nao consigo respirar"
 * Patterns in the registry are written against the normalized form (no accents).
 */
export const MAX_TEXT = 280;

export function normalizeText(input: string): string {
  return input
    .slice(0, MAX_TEXT)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
