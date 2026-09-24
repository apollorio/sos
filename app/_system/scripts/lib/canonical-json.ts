/**
 * Canonical JSON printer for registry files.
 * Rule: a node is printed inline when it fits in MAX columns on its line; otherwise it is expanded
 * with 2-space indentation. One canonical shape = clean diffs = reviewable rule changes.
 */
const MAX = 120;

export function canonicalJson(value: unknown): string {
  return print(value, 0, 0) + "\n";
}

/** indent = indentation of the current line; used = columns already consumed before this node. */
function print(v: unknown, indent: number, used: number): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const one = spaced(v);
  if (used + one.length <= MAX) return one;
  const pad = " ".repeat(indent + 2);
  const end = " ".repeat(indent);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return "[\n" + v.map((x) => pad + print(x, indent + 2, indent + 2)).join(",\n") + "\n" + end + "]";
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  return (
    "{\n" +
    entries
      .map(([k, x]) => {
        const head = pad + JSON.stringify(k) + ": ";
        return head + print(x, indent + 2, head.length);
      })
      .join(",\n") +
    "\n" + end + "}"
  );
}

function spaced(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(spaced).join(", ") + "]";
  const e = Object.entries(v as Record<string, unknown>);
  if (e.length === 0) return "{}";
  return "{ " + e.map(([k, x]) => JSON.stringify(k) + ": " + spaced(x)).join(", ") + " }";
}
